// Centralized public Telegram deep links for Svoye website entry.
// Only non-sensitive route labels go into Telegram's start parameter.
export type TelegramEntry = "teen" | "parent" | "trial";
const BOT_USERNAME = "jerryforvasylbot";

export function telegramChatLink(entry: TelegramEntry): string {
  return `https://t.me/${BOT_USERNAME}?start=site_${entry}`;
}
