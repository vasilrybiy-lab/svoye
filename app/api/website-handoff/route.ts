import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { svoyeTelegramBotUsername } from "@/lib/telegram-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_BODY_BYTES = 9_000;
const TOKEN_TTL_MS = 10 * 60 * 1000;

const isReady = () =>
  process.env.SVOYE_HANDOFF_BOT_READY === "true" &&
  Boolean(process.env.SVOYE_HANDOFF_WEBHOOK_URL) &&
  Boolean(process.env.SVOYE_HANDOFF_WEBHOOK_SECRET);

const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  return NextResponse.json({ enabled: isReady() }, { headers: noStore });
}

/**
 * Issues a short-lived opaque Telegram deep-link only AFTER a trusted server-side
 * webhook confirms persistence of the text + SHA-256 token hash in website_requests.
 *
 * Does not accept an arbitrary URL from the client. Raw token never reaches DB or
 * the webhook. Bot must verify the one-time hash before revealing the text.
 *
 * Deliberately disabled until BOTH the secured persistence webhook and bot-side
 * redemption are ready; do not enable during live booking/reminder testing.
 */
export async function POST(request: NextRequest) {
  if (!isReady()) {
    return NextResponse.json(
      { error: "Підключення Telegram ще готується. Скопіюй підсумок вручну." },
      { status: 503, headers: noStore },
    );
  }

  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Запит із цього джерела не дозволено." }, { status: 403, headers: noStore });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Непідтримуваний формат запиту." }, { status: 415, headers: noStore });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Повідомлення завелике." }, { status: 413, headers: noStore });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new Error("too large");
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Не вдалося прочитати дані." }, { status: 400, headers: noStore });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Некоректні дані." }, { status: 400, headers: noStore });
  }
  const body = payload as Record<string, unknown>;
  const text = body.messageText;
  if (body.consent !== true || body.contextVersion !== 1 ||
      typeof text !== "string" || text.trim().length < 1 ||
      text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Потрібна згода та короткий підсумок проби." }, { status: 400, headers: noStore });
  }

  const endpoint = process.env.SVOYE_HANDOFF_WEBHOOK_URL!;
  const secret = process.env.SVOYE_HANDOFF_WEBHOOK_SECRET!;
  let target: URL;
  try {
    target = new URL(endpoint);
    if (target.protocol !== "https:" || !target.hostname.endsWith(".n8n.cloud")) {
      throw new Error("unexpected destination");
    }
  } catch {
    return NextResponse.json({ error: "Сервіс передачі ще не налаштований." }, { status: 503, headers: noStore });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`,
      },
      body: JSON.stringify({
        source: "svoye_website",
        context_version: 1,
        message_text: text.trim(),
        token_hash: tokenHash,
        expires_at: expiresAt,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("handoff persistence failed");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" ||
        (result as Record<string, unknown>).stored !== true) {
      throw new Error("missing persistence acknowledgement");
    }
  } catch {
    return NextResponse.json(
      { error: "Не вдалося підготувати передачу. Спробуй ще раз або скопіюй текст." },
      { status: 502, headers: noStore },
    );
  }

  return NextResponse.json({
    telegramUrl: `https://t.me/${svoyeTelegramBotUsername}?start=sv_${token}`,
    expiresInSeconds: TOKEN_TTL_MS / 1000,
  }, { headers: noStore });
}
