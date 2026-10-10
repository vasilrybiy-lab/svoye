import type { Metadata } from "next";
import MobileMenu from "@/components/mobile-menu";

export const metadata: Metadata = {
  title: "Відгуки та історії після проби",
  description: "Історії школярів після практичних проб у Своє: що спробували, що відкрили й що хочуть досліджувати далі. Поки опублікованих історій немає.",
  alternates: { canonical: "/reviews" },
  openGraph: { url: "/reviews", title: "Відгуки та історії після проби | Своє" },
};

export default function ReviewsPage() {
  return <main className="reviews-page">
    <header className="site-header">
      <a className="logo" href="/" aria-label="Своє — головна сторінка">своє<span>.</span></a>
      <nav aria-label="Основна навігація"><a href="/approach">Підхід</a><a href="/parents">Батькам</a><a href="/about">Про мене</a><a href="/reviews" aria-current="page">Відгуки</a></nav>
      <MobileMenu/>
      <a className="header-cta" href="/#contact">Поговорімо</a>
    </header>

    <section className="voices section-pad" id="voices">
      <div className="voices-head"><p className="eyebrow">ІСТОРІЇ ПІСЛЯ ПРОБИ</p><h1>Що спробували.<br/><em>Що відкрили.</em></h1><p>Тут з’являтимуться історії школярів про власні проби: що вдалося, що здивувало й що захотілося спробувати далі. Поки опублікованих історій немає.</p></div>
      <div className="voices-reserved"><div className="reserved-label"><span>МІСЦЕ ДЛЯ МАЙБУТНІХ ІСТОРІЙ</span><span>↘</span></div><div className="reserved-content"><p>Що я спробував чи спробувала?<br/>Що мене здивувало?<br/>Що хочу спробувати далі?</p><span>Три запитання для короткого відео із субтитрами та текстовою версією. Реальні історії публікуються лише за згодою учасників.</span></div><div className="reserved-mark" aria-hidden="true">“</div></div>
    </section>

    <footer><a className="logo" href="/">своє<span>.</span></a><p>Простір для вибору, який починається з людини.</p><a href="/">На головну</a><small>© {new Date().getFullYear()} своє.</small></footer>
  </main>;
}
