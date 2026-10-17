import { svoyeTelegramLink } from "@/lib/telegram-links";

export default function MobileMenu({ audience = "teen" }: { audience?: "teen" | "parent" }) {
  return <details className="mobile-menu"><summary aria-label="Відкрити меню">Меню</summary>
    <div className="mobile-menu-panel">
      <a href="/approach">Підхід</a><a href="/#trials">Малі проби</a><a href="/korysne">Корисне</a>
      <a href="/parents">Батькам</a><a href="/about">Про мене</a><a href={svoyeTelegramLink(audience === "parent" ? "site_parent" : "site_teen")} target="_blank" rel="noopener noreferrer">Поговорімо в Telegram</a>
    </div></details>;
}
