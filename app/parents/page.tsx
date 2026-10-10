import type { Metadata } from "next";
import MobileMenu from "@/components/mobile-menu";
import ParentConversation from "@/components/parent-conversation";
import Link from "next/link";
import { GraduationCap, Search, Wallet, Wrench } from "lucide-react";
import CaseExamples from "@/components/case-examples";

export const metadata: Metadata = {
  title: "Профорієнтація для підлітків: як батькам підтримати вибір дитини",
  description: "Що отримує родина, як перевіряються напрями, навчання й перспектива доходу та як підтримати власний вибір підлітка після школи.",
  alternates: { canonical: "/parents" },
  openGraph: { url: "/parents", title: "Профорієнтація для підлітків: як батькам підтримати вибір дитини | Своє" },
};

const outcomes = [
  { title: "Зрозуміти, від чого відштовхуватися", text: "Картина інтересів, сильних сторін і умов, важливих для вибору: що захоплює дитину, що вже виходить і що може заважати рухатися." },
  { title: "Мати кілька напрямів для перевірки", text: "Обґрунтовані робочі гіпотези з поясненням, чому вони виникли. Для кожної — практична проба й запитання, які допоможуть оцінити досвід." },
  { title: "Побачити можливий наступний крок", text: "Орієнтири щодо навчання, вимог на старті й перспектив доходу. Ви можете обговорити варіанти з дитиною та вирішити, що досліджувати далі." },
];

const criteria = [
  { icon: Search, title: "Попит", text: "Які вакансії та задачі є зараз у відповідній сфері й країні. Щоб говорити про зростання попиту, потрібні дані за певний період." },
  { icon: Wrench, title: "Вимоги на старті", text: "Які навички, освіта, знання мов і приклади роботи потрібні початківцю. Що можна почати розвивати вже зараз." },
  { icon: Wallet, title: "Діапазони оплати", text: "Оплата залежить від країни, міста, досвіду, спеціалізації та компанії. Дивимося на діапазони й окремо розрізняємо стартові та досвідчені ролі." },
  { icon: GraduationCap, title: "Шлях і вартість навчання", text: "Які програми існують, що потрібно для вступу, скільки коштують навчання й проживання та які варіанти доступні вашій родині." },
];

export default function ParentsPage() {
  return <main className="parents-page">
    <header className="site-header">
      <Link className="logo" href="/" aria-label="Своє — головна сторінка">своє<span>.</span></Link>
      <nav aria-label="Навігація для батьків"><a href="#parent-results">Результат</a><a href="#case">Приклади</a><a href="#perspectives">Перспективи</a></nav><MobileMenu/>
      <div className="parent-header-actions">
        <a className="parent-home-link" href="/">На головну</a>
        <a className="header-cta" href="#parent-start">З чого почати</a>
      </div>
    </header>

    <section className="parent-hero section-pad" aria-labelledby="parent-title">
      <div className="parent-hero-copy">
        <p className="eyebrow">СВОЄ / ДЛЯ БАТЬКІВ</p>
        <h1 id="parent-title">Спокійніше підтримати<br/><em>вибір дитини.</em></h1>
        <p className="parent-lead">«Своє» допомагає вашій дитині знайти напрям, у якому цікаво діяти, розкривати свої сильні сторони, робити потрібне людям і мати перспективу добре заробляти.</p>
        <p className="parent-support">А вам — підтримати цей пошук спокійніше й упевненіше: через зрозумілий процес, малі проби на практиці та відкриту розмову про можливості.</p>
        <div className="hero-actions"><a className="button button-dark" href="#parent-results">Що отримає родина</a><a className="text-link" href="#case">Побачити приклад</a></div>
      </div>
      <aside className="parent-principle">
        <span className="eyebrow">ВАША ПІДТРИМКА МАЄ ЗНАЧЕННЯ</span>
        <h2>Голос підлітка<br/>залишається головним.</h2>
        <p>Дитина може пробувати, помилятися й змінювати думку. Ваш досвід і знання сімейних обставин допомагають зробити наступний крок реалістичним.</p>
      </aside>
    </section>

    <section className="parent-results section-pad" id="parent-results" aria-labelledby="parent-results-title">
      <div className="parent-section-head"><p className="eyebrow">ЩО ВИ ОТРИМАЄТЕ</p><h2 id="parent-results-title">Матеріали, які допоможуть<br/><em>обговорити вибір.</em></h2><p>Ви бачите логіку висновків і перевіряєте її разом з дитиною на практиці.</p></div>
      <div className="parent-outcomes">{outcomes.map((item, index) => <article key={item.title}><span className="parent-outcome-label">{["ІНТЕРЕСИ Й УМОВИ", "НАПРЯМИ Й ПРОБИ", "НАВЧАННЯ Й ПЕРСПЕКТИВИ"][index]}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      <p className="parent-note">Склад і глибина матеріалів узгоджуються з вашим запитом та обсягом роботи до початку послуги.</p>
      <div className="parent-process"><h3>Як з’являється план</h3><ol><li><strong>Розмова.</strong> Інтереси, досвід і обставини підлітка та родини.</li><li><strong>Кілька гіпотез.</strong> Напрями з поясненням, чому варто їх дослідити.</li><li><strong>Практичні проби.</strong> Невеликі задачі та обговорення того, що вдалося помітити.</li><li><strong>Наступне рішення.</strong> Що продовжувати, змінити або перевірити іншим способом.</li></ol></div>
    </section>

    <CaseExamples/>

    <ParentConversation />

    <section className="parent-perspectives section-pad" id="perspectives" aria-labelledby="perspectives-title">
      <div className="parent-section-head"><p className="eyebrow">ЯК ОЦІНЮЄМО ПЕРСПЕКТИВИ</p><h2 id="perspectives-title">Інтерес, розвиток<br/><em>і можливість заробляти.</em></h2><p>Гідний дохід дає ресурс для самостійності та бажаного життя. Для кожного напряму важливо дослідити економічні можливості разом з інтересом дитини, її сильними сторонами й користю для інших.</p></div>
      <div className="parent-criteria">{criteria.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={26} aria-hidden="true"/><h3>{title}</h3><p>{text}</p></article>)}</div>
      <div className="parent-market-note"><p>Ринок змінюється, тому висновки залишаються робочими гіпотезами. Поточні вакансії та діапазони оплати дають орієнтири для перевірки, а не гарантію майбутнього доходу.</p></div>
    </section>

    <section className="parent-role section-pad" aria-labelledby="parent-role-title">
      <div><p className="eyebrow">ВАША РОЛЬ</p><h2 id="parent-role-title">Бути поруч,<br/><em>поки дитина шукає.</em></h2></div>
      <div className="parent-role-copy"><p>Створити простір для пошуку, підтримати практичні кроки й обговорити результати. Важливо почути, що дитині справді сподобалося, що виснажило та чи хочеться спробувати ще.</p><p>Ваші запитання, ресурси й знання сімейних обставин допомагають оцінити доступність навчання та можливі бар’єри. Голос підлітка залишається головним, а ваша підтримка робить його вибір стійкішим.</p><p className="parent-role-prompt">Запитання для розмови після проби: «Що тобі хотілося б спробувати далі — і як я можу допомогти?»</p></div>
    </section>

    <section className="parent-start section-pad" id="parent-start" aria-labelledby="parent-start-title">
      <div className="parent-section-head"><p className="eyebrow">ФОРМАТ І ПЕРША РОЗМОВА</p><h2 id="parent-start-title">Почнімо з вашого<br/><em>запитання.</em></h2><p>Коротко опишіть, що зараз хвилює вас і дитину: вибір напряму, навчання чи перевірка вже наявної ідеї.</p></div>
      <div className="parent-start-details"><article><h3>Що узгоджується до початку</h3><p>Формат і кількість зустрічей, участь батьків, склад матеріалів, тривалість і вартість. Обсяг подальших проб та дослідження навчальних програм залежить від індивідуального запиту.</p></article><article><h3>Межі послуги</h3><p>«Своє» допомагає досліджувати професійні й освітні напрями. Послуга не є психотерапією та не гарантує вступу або майбутньої зарплати.</p></article></div>
      <div className="parent-start-actions"><a className="button button-dark" href="/?audience=parent#contact">Підготувати запит на першу розмову</a><p>На головній сторінці можна скопіювати текст запиту. Прямий канал зв’язку ще не вказаний.</p></div>
    </section>

    <footer><Link className="logo" href="/">своє<span>.</span></Link><p>Підтримка родини. Власний вибір підлітка.</p><Link href="/">На головну</Link><small>© {new Date().getFullYear()} своє.</small></footer>
  </main>;
}
