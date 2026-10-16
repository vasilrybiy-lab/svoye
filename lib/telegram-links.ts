// Website-to-Telegram links: only non-sensitive source markers belong in deep links.
// Verified public bot username for the new branded Svoye Telegram bot.
// NEXT_PUBLIC_SVOYE_BOT_USERNAME can override this for a verified test environment.
export type SvoyeEntry = "site_teen" | "site_parent" | "site_trial";
const brandedUsername = "svoe_live_bot";
const candidate = (process.env.NEXT_PUBLIC_SVOYE_BOT_USERNAME ?? "").trim().replace(/^@/, "");
export const svoyeTelegramBotUsername =
  /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(candidate) ? candidate : brandedUsername;

export function svoyeTelegramLink(entry: SvoyeEntry): string {
  return `https://t.me/${svoyeTelegramBotUsername}?start=${entry}`;
}
