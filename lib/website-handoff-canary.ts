// Temporary synthetic-only diagnostic mode. It never enables the normal site UI.
export const CANARY_QUERY_VALUE = "svoe-handoff-canary-v1";
export const CANARY_SUMMARY = "SVOE SYNTHETIC CANARY v1. Тестовий підсумок: хочу дослідити свої інтереси. Без персональних даних.";
export const CANARY_BRANCH = "feature/v2-svoe-live-telegram-2026-10-16";
const MAX_WINDOW_MS = 5 * 60 * 1000;

// Synthetic-only hints about the returned error envelope, never a root-cause claim.
export const CANARY_FAILURE_CODES = [
  "WORKFLOW_START_FAILED", "WORKFLOW_CONFIGURATION", "WORKFLOW_ISSUES",
  "WORKFLOW_EXECUTION_FAILED", "WORKFLOW_RESPONSE_TIMEOUT", "WORKFLOW_CANCELLED",
  "UNKNOWN_UPSTREAM_ERROR", "DIAGNOSTIC_UNAVAILABLE", "DIAGNOSTIC_TOO_LARGE",
  "DIAGNOSTIC_NOT_JSON", "DIAGNOSTIC_TIMEOUT",
] as const;
export const CANARY_FAILURE_NODES = ["VALIDATE", "STORE", "DISPATCH", "ACK"] as const;
type CanaryFailure = { code: typeof CANARY_FAILURE_CODES[number]; node?: typeof CANARY_FAILURE_NODES[number] };
const NODE_ALIASES: Record<string, typeof CANARY_FAILURE_NODES[number]> = {
  "SVOE LIVE — Validate website handoff payload": "VALIDATE",
  "SVOE LIVE — Store one-time website context (Neon TEST)": "STORE",
  "SVOE LIVE — Dispatch metadata-only expiry (DRAFT / TEST)": "DISPATCH",
  "SVOE LIVE — Website respond 200 stored": "ACK",
};
const ERROR_MESSAGES: Record<string, CanaryFailure["code"]> = {
  "Workflow Webhook Error: Workflow could not be started!": "WORKFLOW_START_FAILED",
  "The workflow has issues and cannot be executed for that reason. Please fix them first.": "WORKFLOW_ISSUES",
  "There was a problem executing the workflow": "WORKFLOW_EXECUTION_FAILED",
  "The workflow did not answer in time": "WORKFLOW_RESPONSE_TIMEOUT",
  "The execution was cancelled": "WORKFLOW_CANCELLED",
};
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const ownValue = <T>(map: Record<string, T>, key: unknown): T | undefined =>
  typeof key === "string" && Object.hasOwn(map, key) ? map[key] : undefined;

export function classifyCanaryUpstreamFailure(value: unknown): CanaryFailure {
  const root = record(value), error = record(root.error), candidates = [root, error];
  let code: CanaryFailure["code"] = "UNKNOWN_UPSTREAM_ERROR";
  for (const candidate of candidates) {
    if (candidate.name === "WorkflowConfigurationError") { code = "WORKFLOW_CONFIGURATION"; break; }
    if (candidate.name === "WorkflowHasIssuesError") { code = "WORKFLOW_ISSUES"; break; }
    const known = ownValue(ERROR_MESSAGES, candidate.message);
    if (known) { code = known; break; }
  }
  // No arbitrary error messages, fields, SQL, stack, IDs or headers leave this function.
  for (const candidate of candidates) {
    const name = typeof candidate.node === "string" ? candidate.node : record(candidate.node).name;
    const node = ownValue(NODE_ALIASES, name) ?? ownValue(NODE_ALIASES, candidate.nodeName);
    if (node) return { code, node };
  }
  return { code };
}

export async function readCanaryUpstreamFailure(response: Response, budgetMs = 250): Promise<CanaryFailure> {
  const maximum = 4096;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (response.headers?.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      return { code: "DIAGNOSTIC_NOT_JSON" };
    reader = response.body?.getReader();
    if (!reader) return { code: "DIAGNOSTIC_UNAVAILABLE" };
    const size = Number(response.headers.get("content-length"));
    if (Number.isFinite(size) && size > maximum) return { code: "DIAGNOSTIC_TOO_LARGE" };
    const deadline = new Promise<CanaryFailure>(resolve => {
      const budget = Number.isFinite(budgetMs) ? Math.min(250, Math.max(1, budgetMs)) : 250;
      timer = setTimeout(() => resolve({ code: "DIAGNOSTIC_TIMEOUT" }), budget);
    });
    const read = async (): Promise<CanaryFailure> => {
      const chunks: Uint8Array[] = []; let total = 0;
      for (let reads = 0; reads < 32; reads++) {
        const part = await reader!.read();
        if (part.done) {
          const bytes = new Uint8Array(total); let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
          try { return classifyCanaryUpstreamFailure(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))); }
          catch { return { code: "DIAGNOSTIC_NOT_JSON" }; }
        }
        if (!(part.value instanceof Uint8Array)) return { code: "DIAGNOSTIC_UNAVAILABLE" };
        total += part.value.byteLength;
        if (total > maximum) return { code: "DIAGNOSTIC_TOO_LARGE" };
        chunks.push(part.value.slice());
      }
      return { code: "DIAGNOSTIC_UNAVAILABLE" };
    };
    return await Promise.race([read(), deadline]);
  } catch { return { code: "DIAGNOSTIC_UNAVAILABLE" }; }
  finally {
    if (timer !== undefined) clearTimeout(timer);
    try { void reader?.cancel().catch(() => {}); } catch {}
    if (!reader) { try { void response.body?.cancel().catch(() => {}); } catch {} }
    try { reader?.releaseLock(); } catch {}
  }
}

type CanaryUrl = {
  protocol?: string;
  hostname?: string;
  port?: string;
  searchParams?: { get(name: string): string | null };
};

export function isCanaryRequest(
  url: CanaryUrl | undefined,
  env: Record<string, string | undefined>,
  now = Date.now(),
): boolean {
  const until = env.SVOYE_HANDOFF_CANARY_UNTIL;
  if (!until || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(until)) return false;
  const deadline = Date.parse(until);
  if (!Number.isFinite(now) || !Number.isFinite(deadline) || new Date(deadline).toISOString() !== until ||
      deadline <= now || deadline - now > MAX_WINDOW_MS) return false;
  const host = env.VERCEL_URL;
  return Boolean(
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_GIT_COMMIT_REF === CANARY_BRANCH &&
    env.SVOYE_HANDOFF_BOT_READY !== "true" &&
    env.SVOYE_HANDOFF_WEBHOOK_URL && env.SVOYE_HANDOFF_WEBHOOK_SECRET &&
    host && /^[a-z0-9-]+\.vercel\.app$/.test(host) &&
    url?.protocol === "https:" && url.hostname === host && !url.port &&
    url.searchParams?.get("canary") === CANARY_QUERY_VALUE
  );
}

export function renderCanaryPage(nonce: string): string {
  // All interpolated content is fixed synthetic text or a server-generated base64 nonce.
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Своє — перевірка передачі</title>
<style>body{font:18px system-ui;max-width:42rem;margin:3rem auto;padding:1rem;line-height:1.6}button,a{font:inherit;padding:.7rem}label{display:block;margin:1.5rem 0}</style></head>
<body><h1>Перевірка передачі до Telegram</h1>
<p>Буде передано лише цей вигаданий підсумок:</p><p>${CANARY_SUMMARY}</p>
<form id="check"><label for="age">Вікова група для синтетичного тесту</label><select id="age" required><option value="">Обери групу</option><option value="under14">До 14</option><option value="14to17">14–17</option><option value="adult">18+</option></select><label><input id="consent" type="checkbox" required> Погоджуюся передати цей тестовий текст</label>
<button id="send" type="submit">Передати тестовий підсумок</button></form>
<p id="status" role="status" aria-live="polite"></p><a id="telegram" hidden rel="noreferrer noopener">Відкрити Telegram</a>
<script nonce="${nonce}">
const form=document.getElementById('check'),button=document.getElementById('send'),status=document.getElementById('status'),link=document.getElementById('telegram');
let attempted=false,generation=0,active;
const age=document.getElementById('age');
age.addEventListener('change',()=>{generation++;active?.abort();link.hidden=true;link.removeAttribute('href');status.textContent=age.value==='under14'?'Сервіс «Своє» доступний із 14 років.':age.value==='14to17'?'Сценарій для 14–17 років ще готується.':'';});
form.addEventListener('submit',async event=>{
 event.preventDefault(); if(attempted||!document.getElementById('consent').checked)return;
 if(age.value!=='adult'){status.textContent=age.value==='under14'?'Сервіс «Своє» доступний із 14 років.':'Потрібна дозволена вікова група.';return;}
 const current=generation;active=new AbortController();
 attempted=true;button.disabled=true;status.textContent='Передаємо тестовий підсумок…';
 try{
  const response=await fetch(location.pathname+location.search,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,contextVersion:1,ageDeclaration:{band:age.value,version:"age-declaration/v1"},messageText:${JSON.stringify(CANARY_SUMMARY)}}),cache:'no-store',redirect:'error',signal:active.signal});
  const result=await response.json();if(current!==generation)return;
  if(!response.ok){
   const code=typeof result.diagnostic==='string'&&(/^UPSTREAM_HTTP_[1-5][0-9]{2}$/.test(result.diagnostic)||['CANARY_WRONG_WEBHOOK_ENDPOINT','UPSTREAM_TRANSPORT','UPSTREAM_INVALID_JSON','UPSTREAM_STORAGE_NOT_CONFIRMED'].includes(result.diagnostic))?result.diagnostic:'UNKNOWN';
   const failure=result.upstreamFailure;
   const hint=failure&&${JSON.stringify(CANARY_FAILURE_CODES)}.includes(failure.code)?failure.code:'';
   const node=hint&&${JSON.stringify(CANARY_FAILURE_NODES)}.includes(failure.node)?failure.node:'';
   status.textContent='Передачу не підтверджено. Код перевірки: '+code+(hint?' / '+hint:'')+(node?' / '+node:'')+'. Зупини тест; не повторюй запит.';return;
  }
  if(typeof result.telegramUrl!=='string')throw Error('handoff');
  const target=new URL(result.telegramUrl);
  if(target.origin!=='https://t.me'||target.username||target.password||target.pathname!=='/svoe_live_bot'||target.hash||target.searchParams.size!==1||!/^sv_[A-Za-z0-9_-]{43}$/.test(target.searchParams.get('start')||''))throw Error('handoff');
  link.href=result.telegramUrl;link.hidden=false;status.textContent='Тестовий підсумок збережено. Відкрий Telegram та натисни Start.';
 }catch{if(current!==generation)return;status.textContent='Передачу не підтверджено. Зупини тест і перевір результат; не повторюй запит.';}
});</script></body></html>`;
}

