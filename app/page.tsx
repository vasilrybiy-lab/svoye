"use client";
import { faqItems } from "@/lib/faq";
import MobileMenu from "@/components/mobile-menu";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Check, Copy, MoveUpRight } from "lucide-react";
import TrialExperience from "@/components/trial-experience";
import CaseExamples from "@/components/case-examples";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const teenContactText = "Вітаю! Хочу дізнатися про роботу у «Своє» й спробувати кілька напрямів перед вибором навчання. Розкажіть, будь ласка, як проходить перша розмова, що я отримаю та яка вартість.";
const parentContactText = "Вітаю! Хочу дізнатися про індивідуальну роботу у «Своє» для моєї дитини. Розкажіть, будь ласка, як проходить перша розмова, яка роль батьків, що отримає родина та яка вартість.";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [contactMessage, setContactMessage] = useState(teenContactText);
  const [contactAudience, setContactAudience] = useState<"teen" | "parent">("teen");
  const [hasTrialResult, setHasTrialResult] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("audience") === "parent") {
      setContactAudience("parent");
      setContactMessage(parentContactText);
    }
  }, []);
  function discussResult(summary: string) {
    setContactAudience("teen");
    setHasTrialResult(true);
    setContactMessage("Вітаю! Хочу розібрати результат малої проби та дізнатися про індивідуальну роботу у «Своє».\n\n" + summary);
    setCopied(false); setCopyFailed(false);
    document.getElementById("contact")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    document.getElementById("contact-copy")?.focus({ preventScroll: true });
  }
  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(contactMessage);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false); setCopyFailed(true);
    }
  }
  const isParentContact = contactAudience === "parent";

  return <main>
    <header className="site-header">
      <a className="logo" href="#top" aria-label="Своє — на початок">своє<span>.</span></a>
      <nav aria-label="Основна навігація"><a href="/approach">Підхід</a><a href="/parents">Батькам</a><a href="/about">Про мене</a><a href="#results">Результат</a><a href="/reviews">Відгуки</a></nav><MobileMenu/>
      <a className="header-cta" href="#contact">Поговорімо <MoveUpRight size={17}/></a>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-line"/> НАПРЯМ ПОЧИНАЄТЬСЯ З ТЕБЕ</p>
        <h1>Знайди свій напрям<span className="period">.</span><br/><em>Перевір</em> його в дії<span className="period">.</span></h1>
        <p className="hero-lead">Ще не знаєш, ким бути й що далі після школи? Це нормально. Ми допоможемо знайти кілька напрямів і перевірити їх маленькими пробами. Без ярликів і тиску.</p>
        <div className="hero-actions"><a className="button button-dark" href="#trials">Обрати пробу <ArrowRight size={20}/></a><a className="text-link" href="#results">Побачити приклад результату <ArrowDown size={17}/></a></div>
        <a className="hero-parent-link" href="/parents">Я з батьків — як підтримати вибір дитини?</a>
        <div className="hero-note"><span className="note-star">✳</span><span>Для тих, хто вже має мрію,<br/>і для тих, хто ще шукає.</span></div>
      </div>
      <div className="hero-art" role="img" aria-label="Кольорові шляхи розходяться від однієї точки">
        <div className="hero-art-label"><span>НЕ ГОТОВА ВІДПОВІДЬ</span><strong>Твій шлях можна<br/>відкрити крок за кроком.</strong></div>
      </div>
      <div className="hero-index">СВОЄ МАЙБУТНЄ</div>
    </section>

    <section className="intro section-pad" id="approach">
      <div className="section-heading"><p className="eyebrow">КОМУ ЦЕ ПОТРІБНО</p><h2>Майбутнє — спільна розмова.<br/><em>Вибір — за тобою.</em></h2></div>
      <Tabs defaultValue="teen" className="audience-tabs">
        <TabsList className="tab-list" aria-label="Для кого шукаєш інформацію?"><TabsTrigger className="tab-trigger" value="teen">Я школяр / школярка <span>↗</span></TabsTrigger><TabsTrigger className="tab-trigger" value="parent">Я з батьків <span>↗</span></TabsTrigger></TabsList>
        <TabsContent value="teen" className="audience-panel"><div className="panel-number">ТВОЯ ТЕРИТОРІЯ</div><div><h3>Тобі не потрібно знати відповідь прямо зараз.</h3><p>Можна почати з того, що тобі цікаво й що хочеться спробувати. «Своє» допоможе обрати кілька напрямів і перевірити їх у дії. Після проби ти можеш змінити думку.</p><a href="#trials">Обрати невелику задачу</a></div><div className="panel-symbol">↗</div></TabsContent>
        <TabsContent value="parent" className="audience-panel"><div className="panel-number">ВАША ОПОРА</div><div><h3>Спокійніше підтримати вибір дитини.</h3><p>Що отримає родина, як перевіряються напрями й перспектива доходу та якою може бути ваша підтримка — у розділі для батьків.</p><a href="/parents">Перейти до розділу для батьків</a></div><div className="panel-symbol">✳</div></TabsContent>
      </Tabs>
      <a className="text-link approach-link" href="/approach">Детальніше про підхід <ArrowRight size={17}/></a>
    </section>



    <section className="trial-section section-pad" id="trials"><div className="trial-head"><div><p className="eyebrow">СПРОБУЙ І ПОМІТЬ</p><h2>Спробуй невелику задачу.<br/><em>Поміть, що тебе зачепило.</em></h2></div><p>Обери задачу на 10–20 хвилин. Спробуй і подивись, чи хочеться ще. Одна проба не визначає професію. Особистий план у «Своє» з’являється після розмови.</p></div><TrialExperience onContact={discussResult}/></section>

    <section className="results section-pad" id="results"><div className="results-title"><p className="eyebrow">ЩО ТИ ОТРИМАЄШ</p><h2>Твій план.<br/><em>Твої наступні кроки.</em></h2></div><div className="result-grid"><article className="result-card lime"><span className="result-top">РОЗУМІННЯ</span><div className="result-glyph">✳</div><h3>Твої інтереси й сильні сторони</h3><p>Карта з твоїх слів: що тебе заряджає, що виходить (з прикладами), за що тебе цінують інші й що ти хочеш дати людям. Без оцінок і балів.</p></article><article className="result-card blue"><span className="result-top">ДІЯ</span><div className="result-glyph">↗</div><h3>План проб</h3><p>Напрями, які варто спробувати. Для кожного — конкретна дія, запитання до фахівця й підказки, на що звернути увагу після.</p></article><article className="result-card peach"><span className="result-top">НАВЧАННЯ</span><div className="result-glyph">◎</div><h3>Де можна навчатися</h3><p>Варіанти програм і закладів: чому вони можуть тобі підійти, що потрібно для вступу й що ще варто уточнити.</p></article></div><p className="results-footnote">Що саме буде у твоєму плані, залежить від запиту й обсягу роботи. Це узгоджується з тобою та родиною до початку.</p></section>

    <CaseExamples audience="teen"/>



    <section className="useful section-pad" id="useful"><p className="eyebrow">КОРИСНЕ ДЛЯ ВИБОРУ</p><h2>Читай, <em>поки думаєш.</em></h2><div className="useful-grid"><a className="useful-card" href="/kudy-vstupaty">Не знаєш, куди вступати після школи? З чого почати<span>Стаття →</span></a><a className="useful-card" href="/yak-obraty-spetsialnist">Як обрати спеціальність після 11 класу: 5 кроків<span>Стаття →</span></a><a className="useful-card" href="/yak-dopomohty-dytyni">Як допомогти дитині обрати професію: поради батькам<span>Для батьків →</span></a><a className="useful-card" href="/ikigai-dlya-pidlitkiv">Ікігай для підлітків простими словами: що це і як допомагає<span>Стаття →</span></a><a className="useful-card" href="/pytannya-dlya-rozmovy">12 запитань, які допомагають зрозуміти себе<span>Стаття →</span></a></div></section><section className="faq section-pad"><div className="faq-head"><p className="eyebrow">ПЕРЕД ПОЧАТКОМ</p><h2>Коротко про <em>важливе.</em></h2></div><div className="faq-list">{faqItems.map((f)=><details key={f.q}><summary>{f.q}<span>+</span></summary><p>{f.a}{f.href&&<> <a href={f.href}>{f.link}</a></>}</p></details>)}</div></section>

    <section className="contact section-pad" id="contact">
      <div className="contact-top"><p className="eyebrow">ПОЧАТИ МОЖНА З РОЗМОВИ</p><div className="contact-orbit">✳</div></div>
      <h2>Почати можна<br/><em>з {isParentContact ? "вашого" : "твого"} запитання.</em></h2>
      <div className="contact-bottom">
        <p>{isParentContact ? "Підготуйте коротке повідомлення про те, що хвилює вас і дитину. До початку роботи у «Своє» узгоджуються формат, склад матеріалів і вартість." : "Підготуй коротке повідомлення про те, що хочеш спробувати або з чим потрібна допомога. До початку роботи у «Своє» узгоджуються формат, склад матеріалів і вартість."}</p>
        <button id="contact-copy" className="button button-lime" onClick={copyMessage} type="button">{copied ? <><Check size={20}/> Скопійовано</> : <><Copy size={20}/> Скопіювати текст запиту</>}</button>
      </div>
      {hasTrialResult && <div className="contact-result"><label htmlFor="contact-draft">Запит із твоїм результатом — переглянь перед надсиланням</label><textarea id="contact-draft" value={contactMessage} onChange={event => {setContactMessage(event.target.value); setCopied(false);}} rows={8}/><p>Натискання кнопки копіює текст. Ти сам вирішуєш, кому його надіслати.</p></div>}
      {copyFailed && <div className="contact-result"><label htmlFor="contact-manual">{isParentContact ? "Не вдалося скопіювати автоматично. Виділіть та скопіюйте текст:" : "Не вдалося скопіювати автоматично. Виділи та скопіюй текст:"}</label><textarea id="contact-manual" readOnly value={contactMessage} rows={6} onFocus={event => event.target.select()}/></div>}
      <div className="contact-pending"><strong>Прямий контакт ще не вказаний</strong><span>Поки можна підготувати текст запиту. Надіслати його через цей сайт зараз неможливо.</span></div>
      <p className="contact-helper" aria-live="polite">{copied ? "Повідомлення скопійовано. Воно ще нікому не надіслане." : "Копіювання не надсилає повідомлення."}</p>
    </section>
    <footer><a className="logo" href="#top">своє<span>.</span></a><p>Простір для вибору, який починається з людини.</p><a href="#top">Нагору ↑</a><small>© {new Date().getFullYear()} своє.</small></footer>
  </main>;
}
