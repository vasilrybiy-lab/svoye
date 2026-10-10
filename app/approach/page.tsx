import type { Metadata } from "next";
import { ArrowRight, Play } from "lucide-react";
import ConversationBlocks from "@/components/conversation-blocks";
import MobileMenu from "@/components/mobile-menu";

export const metadata: Metadata = {
  title: "Підхід: як працює Своє",
  description: "Чотири кроки роботи у Своє: розмова, вибір напрямів, практичні проби й наступні рішення. Як досліджуємо вміння та використовуємо п’ять складових ікігай.",
  alternates: { canonical: "/approach" },
  openGraph: { url: "/approach", title: "Підхід: як працює Своє | Своє" },
};

const steps = [
  { number: "01", title: "Поговорити", text: "Розмова до двох годин, з перервою. Питаємо про приклади з твого життя: що тебе заряджає, що вже виходить, що тобі важливо. Можна сказати «не знаю» й пропустити тему." },
  { number: "02", title: "Обрати напрями", text: "З твоїх інтересів і сильних сторін з’являються кілька напрямів. Для кожного важливо з’ясувати, кому потрібна така робота й чи можна нею заробляти." },
  { number: "03", title: "Спробувати", text: "Для кожного напряму — невелика задача або розмова з фахівцем. Так ти можеш відчути, як це — займатися такою справою." },
  { number: "04", title: "Вирішити, що далі", text: "Обговорюєш, що сподобалося, що було складно й чи хочеться продовжувати. Далі — наступна проба або пошук місця, де можна навчатися." },
];

export default function ApproachPage() {
  return <main className="approach-page">
    <header className="site-header">
      <a className="logo" href="/" aria-label="Своє — головна сторінка">своє<span>.</span></a>
      <nav aria-label="Навігація розділу «Підхід»"><a href="#experience">4 кроки</a><a href="#conversation">Розмова</a><a href="#skills">Вміння</a><a href="#map">Ікігай</a></nav>
      <MobileMenu/>
      <a className="header-cta" href="/#contact">Поговорімо</a>
    </header>

    <section className="method section-pad" id="experience"><div className="method-head"><p className="eyebrow">ЯК ПРАЦЮЄ «СВОЄ» / 4 КРОКИ</p><h1>Знайти напрям<br/><em>крок за кроком.</em></h1><p>Поговоримо про те, що тобі цікаво. Оберемо кілька напрямів і перевіримо їх невеликими задачами.</p><div className="video-placeholder"><span className="video-play" aria-hidden="true"><Play size={24} fill="currentColor"/></span><div><strong>Як розмова стає планом дій</strong><p>Відео засновника ще не додано. Тут буде коротке пояснення із субтитрами та текстовою версією.</p></div><span className="video-time">ЗГОДОМ</span></div></div><div className="steps">{steps.map((step)=><article className="step" key={step.number}><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><ArrowRight className="step-arrow" size={22}/></article>)}</div></section>

    <ConversationBlocks/>

    <footer><a className="logo" href="/">своє<span>.</span></a><p>Простір для вибору, який починається з людини.</p><a href="/#trials">Спробувати пробу →</a><small>© {new Date().getFullYear()} своє.</small></footer>
  </main>;
}
