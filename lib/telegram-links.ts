// Website-to-Telegram links: only non-sensitive source markers belong in deep links.
// Change NEXT_PUBLIC_SVOYE_BOT_USERNAME when the branded username is confirmed.
export type SvoyeEntry = "site_teen" | "site_parent" | "site_trial";
const legacyUsername = "jerryforvasylbot";
const candidate = (process.env.NEXT_PUBLIC_SVOYE_BOT_USERNAME ?? "").trim().replace(/^@/, "");
export const svoyeTelegramBotUsername =
  /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(candidate) ? candidate : legacyUsername;

export function svoyeTelegramLink(entry: SvoyeEntry): string {
  return `https://t.me/${svoyeTelegramBotUsername}?start=${entry}`;
}
