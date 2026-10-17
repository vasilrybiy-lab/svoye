"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { svoyeTelegramBotUsername, svoyeTelegramLink } from "@/lib/telegram-links";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardCopy,
  Compass, FlaskConical, Hammer, HeartHandshake, LifeBuoy,
  Lightbulb, Moon, Puzzle, RotateCcw, Search, Users
} from "lucide-react";
import {
  microTrials, type MicroTrial, type TrialCategory, ratingLabels,
} from "@/lib/micro-trials";

type Audience = "teen" | "parent";
type Stage = "choose" | "task" | "interest" | "difficulty" | "continue" | "summary";
type ScaleKey = "reason" | "idea" | "make" | "test" | "people" | "persist" | "help" | "bored" | "repeat" | "different";
type Answer = number | null | undefined;
type Answers = Partial<Record<ScaleKey, Answer>>;
type IconType = typeof Search;
type Criterion = { id: ScaleKey; label: string; icon: IconType };
const directions: { id: TrialCategory; label: string; subtitle: string; icon: IconType; tint: string }[] = [
  { id: "investigate", label: "Досліджувати", subtitle: "Шукати причини й відповіді", icon: Search, tint: "blue" },
  { id: "build", label: "Створювати", subtitle: "Придумувати й робити своє", icon: Lightbulb, tint: "lime" },
  { id: "explain", label: "Допомагати", subtitle: "Пояснювати й підтримувати інших", icon: HeartHandshake, tint: "orange" },
];
const interestByCategory: Record<TrialCategory, Criterion[]> = {
  investigate: [
    { id: "reason", label: "Знаходити причини", icon: Search },
    { id: "test", label: "Перевіряти й покращувати", icon: FlaskConical },
    { id: "idea", label: "Придумувати рішення", icon: Lightbulb },
  ],
  build: [
    { id: "idea", label: "Придумувати рішення", icon: Lightbulb },
    { id: "make", label: "Робити своїми руками", icon: Hammer },
    { id: "test", label: "Перевіряти й покращувати", icon: FlaskConical },
  ],
  explain: [
    { id: "people", label: "Розуміти іншу людину", icon: Users },
    { id: "idea", label: "Шукати зрозумілі слова", icon: Lightbulb },
    { id: "test", label: "Перевіряти, чи зрозуміло", icon: FlaskConical },
  ],
};
const difficultyCriteria: Criterion[] = [
  { id: "persist", label: "Хотілося розібратися", icon: Puzzle },
  { id: "help", label: "Хотілося підказки", icon: LifeBuoy },
  { id: "bored", label: "Було нудно", icon: Moon },
];
const continuationCriteria: Criterion[] = [
  { id: "repeat", label: "Хочеться повторити подібну пробу", icon: RotateCcw },
  { id: "different", label: "Цікаво спробувати інший напрям", icon: Compass },
];
const stages: Stage[] = ["choose", "task", "interest", "difficulty", "continue", "summary"];
const palette = [
  { bg: "#8b99a6", fg: "#fff" },
  { bg: "#7b92e0", fg: "#fff" },
  { bg: "#173deb", fg: "#fff" },
  { bg: "#ff8e36", fg: "#111b28" },
  { bg: "#d7f26c", fg: "#111b28" },
];
function isAnswered(value: Answer) { return value === null || (typeof value === "number" && value >= 0 && value <= 4); }
function rating(value: Answer) {
  return value === null ? "Не було у пробі" : typeof value === "number" ? ratingLabels[value] : "Не оцінено";
}
function RatingScale({ item, value, onChange, allowSkip = true }: {
  item: Criterion; value: Answer; onChange: (value: Answer) => void; allowSkip?: boolean;
}) {
  const Icon = item.icon;
  const skipped = value === null;
  const rated = typeof value === "number";
  const level = rated ? value : 2;
  const color = rated ? palette[level] : palette[0];
  const pct = level * 25;
  return <div className={`v2-scale ${skipped ? "v2-scale-skipped" : ""}`}>
    <div className="v2-scale-label"><label htmlFor={`v2-${item.id}`}>{item.label}</label><output htmlFor={`v2-${item.id}`}>{rating(value)}</output></div>
    {!skipped && <>
      <div className="v2-scale-rail" style={{ "--v2-tone": color.bg, "--v2-fg": color.fg, "--v2-pct": `${pct}%` } as CSSProperties}>
        <div className="v2-scale-track"><div className="v2-scale-filled" /></div>
        <span className="v2-scale-knob" aria-hidden="true"><Icon size={19} strokeWidth={2} /></span>
        <input id={`v2-${item.id}`} type="range" min="0" max="4" step="1"
          value={level} aria-label={item.label} aria-valuetext={rated ? rating(value) : "Ще не оцінено"}
          onChange={event => onChange(Number(event.target.value))}
          onPointerUp={event => onChange(Number(event.currentTarget.value))}
          onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !rated) { event.preventDefault(); onChange(level); } }}/>
      </div>
      <div className="v2-scale-end"><span>Зовсім ні</span><span>Дуже сильно</span></div>
    </>}
    {allowSkip && <button type="button" className="v2-skip" aria-pressed={skipped} onClick={() => onChange(skipped ? undefined : null)}>
      {skipped ? "Повернути оцінювання" : "Цього не було у пробі"}
    </button>}
  </div>;
}
export default function MobileJourneyHome() {
  const [audience, setAudience] = useState<Audience>("teen");
  const [stage, setStage] = useState<Stage>("choose");
  const [category, setCategory] = useState<TrialCategory>("build");
  const [taskId, setTaskId] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [noDifficulty, setNoDifficulty] = useState(false);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<"idle" | "done" | "manual">("idle");
  const [handoffAvailable, setHandoffAvailable] = useState(false);
  const [handoffConsent, setHandoffConsent] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffUrl, setHandoffUrl] = useState("");
  const [handoffError, setHandoffError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/website-handoff", { cache: "no-store" })
      .then(async response => response.ok ? (await response.json() as { enabled?: boolean }) : { enabled: false })
      .then(data => { if (live) setHandoffAvailable(data?.enabled === true); })
      .catch(() => { if (live) setHandoffAvailable(false); });
    return () => { live = false; };
  }, []);

  function resetHandoff() {
    setHandoffUrl("");
    setHandoffConsent(false);
    setHandoffError("");
  }
  const groupTasks = useMemo(() => microTrials.filter(t => t.category === category), [category]);
  const task: MicroTrial = groupTasks.find(t => t.id === taskId) ?? groupTasks[0];
  const group = directions.find(d => d.id === category)!;
  const stageIndex = stages.indexOf(stage);
  const interest = interestByCategory[category];
  const activeCriteria = stage === "interest" ? interest : stage === "difficulty" ? difficultyCriteria : continuationCriteria;
  const complete = activeCriteria.every(q => isAnswered(answers[q.id]));
  function begin(selected: TrialCategory) {
    setCategory(selected); setTaskId(""); setAnswers({}); setNotes(""); setNoDifficulty(false); setCopied("idle"); resetHandoff(); setStage("task");
  }
  function selectTask(id: string) {
    setTaskId(id); setAnswers({}); setNotes(""); setNoDifficulty(false); setCopied("idle"); resetHandoff();
  }
  function next() {
    setCopied("idle");
    setStage(stages[Math.min(stageIndex + 1, stages.length - 1)]);
  }
  function back() { setStage(stages[Math.max(0, stageIndex - 1)]); }
  function setAnswer(id: ScaleKey, value: Answer) { setAnswers(a => ({ ...a, [id]: value })); resetHandoff(); }
  const observations = interest.filter(q => typeof answers[q.id] === "number")
    .sort((a,b) => (answers[b.id] as number) - (answers[a.id] as number));
  const top = observations.filter(q => answers[q.id] === answers[observations[0]?.id]);
  const title = top.length ? top.map(t => t.label.toLowerCase()).join(", ") : "поки недостатньо спостережень";
  const summary = [
    `Моя мала проба у «Своє»: ${task.title}`,
    `Напрям: ${group.label}`,
    ...interest.map(q => `${q.label}: ${rating(answers[q.id])}`),
    "Коли було складно:",
    ...(noDifficulty ? ["Складнощів не було"] : difficultyCriteria.map(q => `${q.label}: ${rating(answers[q.id])}`)),
    ...continuationCriteria.map(q => `${q.label}: ${rating(answers[q.id])}`),
    ...(notes.trim() ? [`Мої нотатки: ${notes.trim()}`] : []),
    "Одна проба не визначає професію чи здібності; це спостереження для наступного кроку.",
  ].join("\n");
  async function prepareTelegramHandoff() {
    if (!handoffAvailable || !handoffConsent || handoffBusy) return;
    setHandoffBusy(true);
    setHandoffError("");
    setHandoffUrl("");
    try {
      const response = await fetch("/api/website-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, contextVersion: 1, messageText: summary }),
      });
      const data: { telegramUrl?: string; error?: string } = await response.json();
      if (!response.ok || typeof data.telegramUrl !== "string" ||
          !new RegExp('^https://t[.]me/' + svoyeTelegramBotUsername + '[?]start=sv_[A-Za-z0-9_-]{43}$').test(data.telegramUrl)) {
        throw new Error(data.error || "Неможливо підготувати посилання.");
      }
      setHandoffUrl(data.telegramUrl);
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "Спробуй ще раз або скопіюй підсумок.");
    } finally {
      setHandoffBusy(false);
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied("done");
    } catch { setCopied("manual"); }
  }
  return <main className="v2-site" id="top">
    <header className="v2-header">
      <a className="v2-logo" href="/" aria-label="Своє — на початок">своє<span>.</span></a>
      <details className="v2-menu"><summary>Меню <span aria-hidden="true">☰</span></summary>
        <nav aria-label="Розділи сайту">
          <a href="/approach">Підхід</a><a href="/parents">Батькам</a><a href="/about">Про мене</a>
          <a href="/korysne">Корисне</a><a href="/reviews">Відгуки</a>
        </nav>
      </details>
    </header>
    <div className="v2-content">
      {stage === "choose" ? <>
        <div className="v2-audience" role="group" aria-label="Для кого сайт">
          <button type="button" className={audience === "teen" ? "selected" : ""} onClick={() => setAudience("teen")}>Я школяр/-ка</button>
          <button type="button" className={audience === "parent" ? "selected" : ""} onClick={() => setAudience("parent")}>Я з батьків</button>
        </div>
        {audience === "teen" ? <div className="v2-first">
          <div className="v2-intro" id="contact">
            <p className="v2-eyebrow">КИМ СТАТИ? КУДИ ВСТУПАТИ?</p>
            <h1>Знайди свій напрям.<br/><em>Перевір у дії.</em></h1>
            <p className="v2-lead">Не знаєш, що обрати після школи? Почни з того, що тобі цікаво.</p>
            <a className="v2-button dark v2-telegram-entry" href={svoyeTelegramLink("site_teen")} target="_blank" rel="noopener noreferrer">Поставити запитання в Telegram <ArrowRight size={18}/></a>
            <div className="v2-ribbons" aria-hidden="true"><span/><span/></div>
          </div>
          <section className="v2-directions" id="trials" aria-labelledby="v2-directions-title">
            <h2 id="v2-directions-title">Що тобі ближче?</h2>
            <div className="v2-direction-list">{directions.map(dir => {
              const Icon = dir.icon;
              return <button type="button" key={dir.id} className={`v2-direction v2-${dir.tint}`} onClick={() => begin(dir.id)}>
                <span className="v2-dir-icon"><Icon size={24}/></span>
                <span className="v2-dir-text"><strong>{dir.label}</strong><small>{dir.subtitle}</small></span><ChevronRight size={23}/>
              </button>;
            })}</div>
          </section>
        </div> : <div className="v2-parent-first">
          <div><p className="v2-eyebrow">ПІСЛЯ ШКОЛИ · ПРОФЕСІЯ ТА НАВЧАННЯ</p>
            <h1>Допоможіть дитині <em>знайти своє.</em></h1>
            <p className="v2-lead">Спокійніше дослідити інтереси, навчання та перспективи розвитку. Без ярликів і тиску.</p>
            <a className="v2-button dark v2-telegram-entry" href={svoyeTelegramLink("site_parent")} target="_blank" rel="noopener noreferrer">Поспілкуватися з ботом у Telegram <ArrowRight size={18}/></a>
          </div>
          <div className="v2-card"><h2>З чого почати?</h2>
            <p>З розмови та невеликої практичної проби. Підліток залишається головним учасником рішення.</p>
            <a className="v2-button dark" href="/parents">Перейти до розділу «Батькам» <ArrowRight size={19}/></a>
            <button type="button" className="v2-textbtn" onClick={() => setAudience("teen")}>Подивитися малі проби</button>
          </div>
        </div>}
      </> : <>
        <div className="v2-progress">
          <button type="button" className="v2-back" onClick={back}><ArrowLeft size={18}/> Назад</button>
          <div className="v2-progress-dots" role="progressbar" aria-label="Проходження проби" aria-valuemin={1} aria-valuemax={stages.length} aria-valuenow={stageIndex+1}>{stages.map((s,i) => <span key={s} className={stageIndex===i ? "current" : ""}/>)}</div>
          <span>{stageIndex+1}/{stages.length}</span>
        </div>
        {stage === "task" && <>
          <div className="v2-stage-head"><p className="v2-eyebrow">{group.label.toUpperCase()} · МАЛА ПРОБА</p>
            <h1>Спробуй <em>у дії.</em></h1>
            <p>Мета, матеріали, всі кроки й результат — разом, без пошуку на інших екранах.</p></div>
          <label className="v2-task-label" htmlFor="v2-task">Обери задачу цього напряму:</label>
          <select id="v2-task" className="v2-task-select" value={task.id} onChange={event => selectTask(event.target.value)}>
            {groupTasks.map(t => <option value={t.id} key={t.id}>{t.title}</option>)}
          </select>
          <div className="v2-task-grid">
            <div className="v2-card v2-task-purpose"><p className="v2-mini-tag">{task.minutes}</p>
              <h2>{task.title}</h2><p>{task.intro}</p>
              <h3>Що потрібно</h3><p>{task.materials}</p>
            </div>
            <div className="v2-card"><h2>Спробуй по кроках</h2>
              {task.evidence?.map(e => <div className="v2-evidence" key={e.label}><strong>{e.label}</strong><p>{e.text}</p></div>)}
              <ol className="v2-steps">{task.steps.map(s => <li key={s}>{s}</li>)}</ol>
              <div className="v2-outcome"><strong>Що має залишитися:</strong> {task.done}</div>
            </div>
          </div>
          <label className="v2-task-label" htmlFor="v2-notes">Що ти помітив/-ла? <span>(за бажанням)</span></label>
          <textarea id="v2-notes" rows={2} maxLength={1500} value={notes}
            onChange={e => { setNotes(e.target.value); resetHandoff(); }} placeholder="Що вдалося, що хочеться змінити?"/>
          <div className="v2-actions"><button className="v2-button" type="button" onClick={next}>Перейти до рефлексії <ArrowRight size={19}/></button>
            <button className="v2-textbtn" type="button" onClick={() => setStage("choose")}>Обрати інший напрям</button></div>
        </>}
        {(stage === "interest" || stage === "difficulty" || stage === "continue") && <>
          <div className="v2-context">Твоя проба: <strong>{task.title}</strong><span> · {task.intro}</span></div>
          <div className="v2-stage-head">
            <p className="v2-eyebrow">РЕФЛЕКСІЯ · {stage === "interest" ? "1" : stage === "difficulty" ? "2" : "3"} З 3</p>
            <h1>{stage === "interest" ? <>Що тебе <em>зачепило?</em></> : stage === "difficulty" ? <>Як було зі <em>складнощами?</em></> : <>Що хочеться <em>далі?</em></>}</h1>
            <p>{stage === "interest" ? "Які дії викликали цікавість у цій конкретній пробі?" : stage === "difficulty" ? "Оціни власну реакцію, а не правильність виконання." : "Що ти хочеш дослідити після цього досвіду?"}</p>
          </div>
          {stage === "difficulty" && <label className="v2-nodiff"><input type="checkbox" checked={noDifficulty} onChange={e => setNoDifficulty(e.target.checked)}/> Складнощів не було</label>}
          <div className="v2-reflection">
            {stage === "difficulty" && noDifficulty ? <div className="v2-card"><p>Тоді цей блок можна пропустити. Це теж важливе спостереження.</p></div> :
              activeCriteria.map(c => <RatingScale key={c.id} item={c} value={answers[c.id]} onChange={value => setAnswer(c.id, value)} />)}
            <p className="v2-helpnote">Колір відображає силу відчуття, а не «добре» чи «погано».</p>
            <div className="v2-actions"><button className="v2-button" type="button"
              disabled={!(stage === "difficulty" && noDifficulty) && !complete}
              onClick={next}>{stage === "continue" ? "Побачити підсумок" : "Далі"} <ArrowRight size={19}/></button></div>
            {!(stage === "difficulty" && noDifficulty) && !complete && <p className="v2-helpnote" role="status">Оціни або пропусти кожен критерій, щоб продовжити.</p>}
          </div>
        </>}
        {stage === "summary" && <>
          <div className="v2-context">Твоя проба: <strong>{task.title}</strong></div>
          <div className="v2-stage-head"><p className="v2-eyebrow">ТВОЇ СПОСТЕРЕЖЕННЯ</p><h1>Що ти <em>помітив/-ла?</em></h1>
            <p>Одна проба не визначає професію чи здібності. Це підказка для наступного кроку.</p></div>
          <div className="v2-summary-grid">
            <div className="v2-card"><h2>Короткий підсумок</h2>
              <p>Найбільше зацікавило: <strong>{title}</strong>.</p>
              <p>Повторити подібну пробу: <strong>{rating(answers.repeat).toLowerCase()}</strong>.</p>
              <p>Спробувати інше: <strong>{rating(answers.different).toLowerCase()}</strong>.</p>
            </div>
            <div className="v2-card v2-next"><h2>А куди вступати?</h2>
              <p>Твої спостереження можуть стати початком розмови про професії, програми навчання й нові проби.</p>
            </div>
          </div>
          <div className="v2-handoff"><h2>Продовжити в Telegram</h2>
            <p>Підсумок твоєї проби може стати початком розмови з асистентом «Своє». Спочатку перевір, що саме передаватиметься.</p>
            <details className="v2-handoff-preview">
              <summary>Переглянути повний текст підсумку</summary>
              <div className="v2-handoff-preview-text">{summary}</div>
            </details>
            {handoffAvailable ? <>
              <label className="v2-consent">
                <input type="checkbox" checked={handoffConsent} onChange={event => { setHandoffConsent(event.target.checked); setHandoffError(""); }} />
                <span>Я погоджуюся передати цей підсумок, зокрема мої нотатки, боту «Своє» для продовження розмови. Код передачі діятиме 10 хвилин і спрацює один раз.</span>
              </label>
              {!handoffUrl ? <button className="v2-button dark" type="button"
                disabled={!handoffConsent || handoffBusy} onClick={prepareTelegramHandoff}>
                {handoffBusy ? "Готуємо перехід…" : "Підготувати перехід у Telegram"} <ArrowRight size={18}/>
              </button> : <div className="v2-handoff-success" role="status">
                <p>Твій одноразовий перехід підготовлено. Він не містить відповідей у посиланні й діє 10 хвилин.</p>
                <a className="v2-button dark" href={handoffUrl} rel="noopener noreferrer">Відкрити Telegram <ArrowRight size={18}/></a>
              </div>}
              {handoffError && <p className="v2-handoff-error" role="alert">{handoffError}</p>}
            </> : <div className="v2-handoff-simple"><p className="v2-helpnote">Автоматичну передачу підсумку ще налаштовуємо. Ти можеш відкрити бот і самостійно надіслати скопійований результат, якщо хочеш.</p><a className="v2-button dark" href={svoyeTelegramLink("site_trial")} target="_blank" rel="noopener noreferrer">Відкрити Telegram <ArrowRight size={18}/></a></div>}
            <div className="v2-handoff-copy">
              <button className="v2-button v2-copy-button" type="button" onClick={copySummary}>
                {copied === "done" ? <><Check size={19}/> Підсумок скопійовано</> : <><ClipboardCopy size={19}/> Скопіювати підсумок</>}
              </button>
              {copied === "manual" && <><label className="v2-task-label" htmlFor="v2-copy-fallback">Скопіюй цей текст:</label>
                <textarea id="v2-copy-fallback" rows={8} readOnly value={summary} onFocus={e => e.target.select()} /></>}
            </div>
          </div>
          <button className="v2-textbtn" type="button" onClick={() => setStage("choose")}>Спробувати інший напрям</button>
        </>}
      </>}
    </div>
    <footer className="v2-footer"><a href="/about">Про «Своє»</a><span>Почни з дії. Рішення залишається за тобою.</span><a href="#top">Нагору ↑</a></footer>
  </main>;
}
