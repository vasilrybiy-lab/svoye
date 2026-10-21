// Server only: DB URL and webhook credential never enter browser responses.
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";
import { isAdmissionConfigured } from "./website-admission";
import { checkReceipt } from "./website-admission-policy.cjs";

type Environment = Record<string, string | undefined>;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const STORE_SQL = "SELECT current_user::text AS connected_role,current_database()::text AS database,current_setting('neon.project_id',true) AS project_id,current_setting('neon.branch_id',true) AS branch_id,CASE WHEN current_user='svoe_website_test_runtime' AND current_database()='neondb' AND current_setting('neon.project_id',true)='morning-cake-04594300' AND current_setting('neon.branch_id',true)='br-delicate-heart-b7h6nwzw' THEN public.svoe_test_website_store($1::jsonb) ELSE NULL::jsonb END AS receipt;";
function expiryEndpoint(env: Environment): string | undefined {
  try {
    const u = new URL(env.SVOYE_HANDOFF_EXPIRY_WEBHOOK_URL || "");
    if (u.origin !== "https://svoyechat.app.n8n.cloud" || u.pathname !== "/webhook/svoe-website-expiry-v2" ||
        u.search || u.hash || u.username || u.password || u.port) return;
    return u.href;
  } catch { return; }
}
export function isDirectNeonConfigured(env: Environment = process.env): boolean {
  return env.SVOYE_HANDOFF_DIRECT_NEON_ENABLED === "true" && isAdmissionConfigured(env) &&
    Boolean(expiryEndpoint(env) && env.SVOYE_HANDOFF_WEBHOOK_SECRET);
}
async function queueAck(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "application/json") throw Error("EXPIRY_QUEUE_UNCONFIRMED");
  const reader = response.body?.getReader(); if (!reader) throw Error("EXPIRY_QUEUE_UNCONFIRMED");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    for (let i = 0; i < 8; i++) {
      const part = await reader.read();
      if (part.done) {
        const result: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!result || typeof result !== "object" || Array.isArray(result)) throw Error("EXPIRY_QUEUE_UNCONFIRMED");
        return result as Record<string, unknown>;
      }
      size += part.value.byteLength; if (size > 2048) throw Error("EXPIRY_QUEUE_UNCONFIRMED");
      chunks.push(part.value);
    }
    throw Error("EXPIRY_QUEUE_UNCONFIRMED");
  } finally { await reader.cancel().catch(() => {}); }
}
export async function prepareDirectWebsite(messageText: string, mode: "synthetic" | "normal" | "pilot") {
  const fail = (status = 502) => ({status, body:{error:"Передачу не підтверджено. Не повторюй запит; скопіюй підсумок для ручного продовження."}});
  if (!isDirectNeonConfigured() || !messageText.trim() || messageText.length > 4000 || Buffer.byteLength(messageText,"utf8") > 8000) return fail(503);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token,"utf8").digest("hex");
  const query = (payload: Record<string, unknown>) => neon(process.env.SVOYE_HANDOFF_ADMISSION_DATABASE_URL!, {
    fullResults:true,arrayMode:false,fetchOptions:{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(5000)},
  }).query(STORE_SQL,[JSON.stringify(payload)]);
  let requestId: string | undefined;
  try {
    const result = await query({op:"store",mode,message_text:messageText.trim(),token_hash:tokenHash});
    const row = result.rows?.length === 1 ? result.rows[0] : undefined;
    if (row?.connected_role !== "svoe_website_test_runtime" || row.database !== "neondb" ||
        row.project_id !== "morning-cake-04594300" || row.branch_id !== "br-delicate-heart-b7h6nwzw") return fail();
    const stored = row.receipt;
    if (stored?.stored === false) return fail(["daily_limit","cycle_limit"].includes(stored.reason) ? 429 : 503);
    if (stored?.stored !== true || stored.transfer_version !== 2 || !UUID.test(stored.website_request_id || "")) return fail();
    requestId = stored.website_request_id;
    const expiry = stored.expires_at;
    const now = Date.now();
    if (typeof expiry !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiry) ||
        !Number.isFinite(Date.parse(expiry)) || new Date(expiry).toISOString() !== expiry ||
        Date.parse(expiry) <= now || Date.parse(expiry) > now + 601000 ||
        !checkReceipt({rows:[{...row,receipt:stored.admission}]},now).allowed) throw Error("STORE_RECEIPT_UNVERIFIED");
    // Only metadata reaches n8n. Text/hash stay in the same Neon transaction.
    const response = await fetch(expiryEndpoint(process.env)!,{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.SVOYE_HANDOFF_WEBHOOK_SECRET}`},
      body:JSON.stringify({source:"svoye_website",website_request_id:requestId,expires_at:expiry}),
      cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000),
    });
    const ack = await queueAck(response);
    if (ack.queued !== true || ack.website_request_id !== requestId || ack.expires_at !== expiry) throw Error("EXPIRY_QUEUE_UNCONFIRMED");
    return {status:200,body:{telegramUrl:`https://t.me/svoe_live_bot?start=sv_${token}`,expiresInSeconds:Math.max(0,Math.floor((Date.parse(expiry)-Date.now())/1000))}};
  } catch {
    if (requestId) {
      // Exact own unclaimed row only; quota is consumed, never refunded/retried.
      await query({op:"abort",website_request_id:requestId,token_hash:tokenHash}).catch(() => {});
    }
    return fail();
  }
}
