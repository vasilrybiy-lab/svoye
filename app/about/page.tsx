import type { Metadata } from "next";
import MobileMenu from "@/components/mobile-menu";
import { MoveUpRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Про мене: людина за підходом «Своє»",
  description: "Історія засновника, шлях до «Своє» та філософія вибору напряму через дію.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: "Про мене: людина за підходом «Своє» | Своє" },
};

export default function AboutPage() {
  return <main className="about-page">
    <header className="site-header">
      <a className="logo" href="/" aria-label="Своє — головна сторінка">своє<span>.</span></a>
      <nav aria-label="Навігація сторінки «Про мене»"><a href="#founder">Людина</a><a href="#founder-story">Людина за підходом</a><a href="#philosophy">Філософія</a></nav><MobileMenu/>
      <div className="parent-header-actions">
        <a className="parent-home-link" href="/">На головну</a>
        <a className="header-cta" href="/#contact">Поговорімо <MoveUpRight size={17}/></a>
      </div>
    </header>

    <section className="founder section-pad" id="founder">
      <div className="founder-intro">
        <p className="eyebrow">ЛЮДИНА ЗА ПІДХОДОМ</p>
        <h1>Від стратегії бізнесу —<br/><em>до життєвого вибору.</em></h1>
        <p className="founder-lead">Я прийшов у стратегічний маркетинг через різні ролі: роботу в податковій службі, банківській сфері, продажах і сервісі. Цей досвід навчив мене дивитися на рішення з кількох боків — людини, можливостей і реальних потреб.</p>
      </div>
      <div className="founder-photo-placeholder"><span>ФОТО ЗАСНОВНИКА</span><strong>Людина, з якою ти будеш говорити</strong><p>Портрет засновника ще не додано.</p></div>
      <div className="founder-story" id="founder-story">
        <div className="founder-route" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div>
        <div className="founder-points">
          <article><span>ЗАПИТАННЯ</span><h3>Як поєднати прагнення й реальність?</h3><p>У стратегічному маркетингу мене зацікавило, як сильні сторони людини можуть зустрітися з потребами інших. Так я поєднав аналіз ринку з ікігай та ідеєю сродної праці.</p></article>
          <article><span>ПЕРШІ КРОКИ</span><h3>Почалося з близьких.</h3><p>Я спробував цей підхід у профорієнтації свого похресника й дітей друзів. Їхній теплий зворотний зв’язок і радість від цієї роботи спонукали мене розвивати «Своє» далі.</p></article>
          <article><span>ЩО ДАЄ «СВОЄ»</span><h3>Зрозуміти, що хочеться спробувати.</h3><p>«Своє» допомагає почути твої інтереси, обрати кілька напрямів, дослідити їхні можливості й перевірити цікавість конкретними діями.</p><p className="founder-boundary">Послуга допомагає з вибором професійного й освітнього напряму. Вона не є психотерапією та не гарантує вступу чи майбутньої зарплати.</p></article>
        </div>
      </div>
      <div className="founder-aside"><span>ДЛЯ ШКОЛЯРА</span><p>Твої інтереси — відправна точка. Навіть якщо зараз вони здаються не пов’язаними з професією.</p><span>ДЛЯ БАТЬКІВ</span><p>Ви бачите логіку висновків і перевіряєте її разом з дитиною на практиці.</p></div>
    </section>

    <section className="manifesto section-pad" id="philosophy"><div className="manifesto-mark"><Sparkles size={31}/><span>ФІЛОСОФІЯ</span></div><blockquote>«Своє» — це коли здібності, цікавість і користь іншим поступово знаходять <em>спільний напрям.</em></blockquote><div className="manifesto-bottom"><p>Моя місія — допомогти знайти своє: те, від чого загоряються очі, де твої сильні сторони розкриваються на повну і що справді потрібне людям. І що дає змогу заробляти на життя, яке ти хочеш. Без ярликів і тиску. Пробуй, помиляйся, змінюй думку. Рішення завжди твоє.</p><span>ТВІЙ ВИБІР</span></div></section>

    <footer><a className="logo" href="/">своє<span>.</span></a><p>Простір для вибору, який починається з людини.</p><a href="/">На головну</a><small>© {new Date().getFullYear()} своє.</small></footer>
  </main>;
}
