import { NextRequest, NextResponse } from "next/server";
import { directWebsiteReady, prepareDirectWebsite } from "@/lib/website-direct-neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
export async function GET() {
  return NextResponse.json({ enabled: await directWebsiteReady(), mode: "bot-only-delivery" }, { headers });
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Запит із цього джерела не дозволено." }, { status: 403, headers });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return NextResponse.json({ error: "Потрібен формат JSON." }, { status: 415, headers });
  const length = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(length) || length < 0 || length > 10000) return NextResponse.json({ error: "Повідомлення завелике." }, { status: 413, headers });
  let body;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 10000) throw Error("body size");
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Не вдалося прочитати дані." }, { status: 400, headers }); }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(k => !["consent", "noticeVersion", "ageDeclaration", "transferResults", "messageText"].includes(k)) ||
      body.consent !== true || body.noticeVersion !== "website-consultation/v2" ||
      !body.ageDeclaration || Object.keys(body.ageDeclaration).sort().join(",") !== "band,version" ||
      body.ageDeclaration.band !== "adult" || body.ageDeclaration.version !== "age-declaration/v1" ||
      typeof body.transferResults !== "boolean" ||
      (body.transferResults ? typeof body.messageText !== "string" || !body.messageText.trim() || body.messageText.length > 4000 || Buffer.byteLength(body.messageText, "utf8") > 8000 : body.messageText !== undefined)) {
    return NextResponse.json({ error: "Потрібні підтверджений вибір 18+, згода та коректний вибір передачі результатів." }, { status: 400, headers });
  }
  const result = await prepareDirectWebsite({ messageText: body.transferResults ? body.messageText.trim() : undefined, transferResults: body.transferResults });
  return NextResponse.json(result.body, { status: result.status, headers });
}
