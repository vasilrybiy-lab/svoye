import { NextResponse } from "next/server";
import { svoyeTelegramLink } from "@/lib/telegram-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  return NextResponse.json({ enabled: false, mode: "source-only", telegramUrl: svoyeTelegramLink("site_trial") }, { headers });
}

// Legacy clients cannot upload trial text, answers, notes or tokens.
export async function POST() {
  return NextResponse.json(
    { code: "TRIAL_TRANSFER_REMOVED", error: "Відповіді проби залишаються на сайті. У Telegram можна окремо описати свій запит." },
    { status: 410, headers },
  );
}
