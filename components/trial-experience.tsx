"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Compass, Copy } from "lucide-react";
import ReflectionSlider from "@/components/reflection-slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getTrialInsight, microTrials, interestCriteria, difficultyCriteria, reflectionCompletion, trialSummary, type MicroTrial, type ReflectionAnswers, type TrialCategory } from "@/lib/micro-trials";

const categories: {id: TrialCategory; name: string; label: string; brief: string; learn: string}[] = [
  { id: "investigate", name: "Зрозуміти причину", label: "Якщо цікаво розслідувати", brief: "З’ясуй, чому команда запізнилася, перевір підозріле повідомлення або порівняй два списки.", learn: "Що було цікавіше: знайти причину, помітити підозрілу деталь чи перевірити свою здогадку?" },
  { id: "build", name: "Створити своє", label: "Якщо хочеться майструвати", brief: "Зроби підставку для телефона, планер для друга або правило «Що взяти завтра?».", learn: "Що сподобалося більше: придумувати, робити, виправляти чи показувати результат іншій людині?" },
  { id: "explain", name: "Допомогти іншому", label: "Якщо цікаво допомагати людям", brief: "Поясни тему, перепиши незрозуміле запрошення або допоможи новачку обрати перший крок.", learn: "Чи було цікаво слухати, шукати зрозумілі слова й бачити, що людині стало легше?" },
];
type Stage = "task" | "reflect" | "result";
const emptyAnswers: ReflectionAnswers = { interest: {}, difficulty: {}, noDifficulty: false };

export default function TrialExperience({ onContact }: {onContact: (summary: string) => void}) {
  const [category, setCategory] = useState<TrialCategory>("investigate");
  const [stage, setStage] = useState<Stage>("task");
  const [task, setTask] = useState<MicroTrial | null>(null);
  const [answers, setAnswers] = useState<ReflectionAnswers>(emptyAnswers);
  const [notes, setNotes] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const heading = useRef<HTMLHeadingElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const selector = useRef<HTMLDivElement>(null);
  const topicFocusPending = useRef(false);
  const [navigation, setNavigation] = useState(0);
  function scrollTo(element: HTMLElement | null) {
    element?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  useEffect(() => {
    if (topicFocusPending.current) {
      topicFocusPending.current = false;
      scrollTo(selector.current);
      selector.current?.querySelector<HTMLButtonElement>(`[data-topic-id="${task?.id}"]`)?.focus({ preventScroll: true });
    } else if (task) {
      scrollTo(workspace.current);
      heading.current?.focus({ preventScroll: true });
    }
  }, [stage, task, navigation]);

  function startTask(selected: MicroTrial) {
    setTask(selected); setStage("task"); setCopyState("idle");
    if (selected.id !== task?.id) { setAnswers(emptyAnswers); setNotes(""); }
    setNavigation(previous => previous + 1);
  }
  function returnToTopics() {
    if (task) setCategory(task.category);
    topicFocusPending.current = true;
    setNavigation(previous => previous + 1);
  }
  const completion = reflectionCompletion(answers);
  const complete = completion.complete;
  const insight = task ? getTrialInsight(task, answers) : null;
  const summary = task ? trialSummary(task, answers, notes) : "";
  async function copyResult() {
    try { await navigator.clipboard.writeText(summary); setCopyState("copied"); }
    catch { setCopyState("manual"); }
  }

  return <>
    <div ref={selector} className="trial-selector" id="mini-trials">
      <Tabs value={category} onValueChange={value => setCategory(value as TrialCategory)} className="trial-tabs">
        <TabsList className="trial-list" aria-label="Види діяльності">{categories.map(item => <TabsTrigger className="trial-trigger" value={item.id} key={item.id}>{item.name}</TabsTrigger>)}</TabsList>
        {categories.map(item => <TabsContent className="trial-card" value={item.id} key={item.id}>
          <div className="trial-stamp"><Compass size={25} aria-hidden="true"/><span>НЕВЕЛИКА ЗАДАЧА<br/>10–20 ХВИЛИН</span></div>
          <div className="trial-main"><p className="trial-label">{item.label}</p><h3>{item.brief}</h3>
            <div className="trial-question"><span>ЩО ПОМІТИТИ ПІСЛЯ?</span><p>{item.learn}</p></div>
            <p className="trial-topic-hint" id={`topic-hint-${item.id}`}>Натисни на тему — відкриється задача на 10–20 хвилин.</p>
            <div className="trial-topics" role="group" aria-label={`Теми задач: ${item.name}`} aria-describedby={`topic-hint-${item.id}`}>
              {microTrials.filter(trial => trial.category === item.id).map(trial => <button type="button" key={trial.id} data-topic-id={trial.id} aria-pressed={task?.id === trial.id} aria-controls={task ? "trial-workspace" : undefined} onClick={() => startTask(trial)}>{trial.area}<ArrowRight size={17} aria-hidden="true"/></button>)}
            </div>
          </div><div className="trial-doodle" aria-hidden="true">↗</div>
        </TabsContent>)}
      </Tabs>
    </div>

    {task && <div ref={workspace} className="micro-workspace" id="trial-workspace" role="region" aria-labelledby="trial-workspace-heading">
      <div className="micro-progress" aria-label="Етапи проби">{["Спробуй", "Поміть реакцію", "Наступний крок"].map((label, i) => <span key={label} aria-current={i === ["task", "reflect", "result"].indexOf(stage) ? "step" : undefined}><b>0{i+1}</b> {label}</span>)}</div>
      <p className="micro-privacy-note"><strong>Відповіді залишаються лише в цій вкладці.</strong> Після оновлення сторінки вони зникнуть. Результат не надсилається автоматично.</p>
      {stage === "task" && task && <>
        <div className="micro-heading"><span className="reflection-kicker">{task.area} / {task.minutes}</span><h3 id="trial-workspace-heading" ref={heading} tabIndex={-1}>{task.title}</h3><p>{task.intro}</p><p>Без попередньої підготовки. Тут важливо помітити сам процес, а не зробити все ідеально.</p></div>
        <div className="micro-task-layout"><div><h4>Що знадобиться</h4><p>{task.materials}</p>{task.evidence && <div className="micro-evidence"><h4>Дані для проби</h4>{task.evidence.map(item => <article key={item.label}><h5>{item.label}</h5><p>{item.text}</p></article>)}</div>}<h4>Спробуй по кроках</h4><ol className="micro-steps">{task.steps.map(step => <li key={step}>{step}</li>)}</ol></div><aside className="micro-deliverable"><span className="reflection-kicker">ЩО ЗАЛИШИТЬСЯ ПІСЛЯ</span><p>{task.done}</p><p className="micro-muted">Якщо не вийшло завершити, теж переходь до рефлексії. Поміть, що завадило і чи хочеться повернутися.</p></aside></div>
        <label className="micro-note" htmlFor="trial-notes">Що вийшло або що завадило? <span>За бажанням</span></label><textarea id="trial-notes" value={notes} maxLength={1500} onChange={event => setNotes(event.target.value)} placeholder="Що ти помітив під час проби? Що захотілося перевірити або змінити?" rows={3}/>
        <div className="micro-actions"><button type="button" className="button button-dark" onClick={() => setStage("reflect")}>Перейти до рефлексії</button><button type="button" className="micro-link" onClick={returnToTopics}>Обрати іншу задачу</button></div>
      </>}
      {stage === "reflect" && task && <>
        <div className="micro-heading"><span className="reflection-kicker">ПІСЛЯ ПРОБИ / {task.title}</span><h3 id="trial-workspace-heading" ref={heading} tabIndex={-1}>Як це було для тебе?</h3><p>Пересувай іконки зліва направо: від слабкого відчуття до сильного. Можеш торкнутися шкали або скористатися стрілками на клавіатурі. Критерій, якого не було, можна пропустити.</p></div>
        <form onSubmit={event => {event.preventDefault(); if (complete) setStage("result");}}>
          <fieldset className="micro-question"><legend><span>01</span> Що було цікавим і наскільки?</legend><div className="reflection-scales">{interestCriteria.map(item => <ReflectionSlider key={item.id} id={`interest-${item.id}`} label={item.label} icon={item.icon} value={answers.interest[item.id]} onChange={value => {setAnswers(previous => ({...previous, interest: {...previous.interest, [item.id]: value}})); setCopyState("idle");}}/>)}</div></fieldset>
          <fieldset className="micro-question"><legend><span>02</span> Коли стало складно, що ти відчував?</legend><label className="scale-no-difficulty"><input type="checkbox" checked={answers.noDifficulty} onChange={event => {setAnswers(previous => ({...previous, noDifficulty: event.target.checked})); setCopyState("idle");}}/> Складнощів не було</label>{answers.noDifficulty ? <p className="micro-muted">Тоді ці реакції поки не оцінюємо. Перевірити їх можна в наступній пробі.</p> : <div className="reflection-scales">{difficultyCriteria.map(item => <ReflectionSlider key={item.id} id={`difficulty-${item.id}`} label={item.label} icon={item.icon} value={answers.difficulty[item.id]} onChange={value => {setAnswers(previous => ({...previous, difficulty: {...previous.difficulty, [item.id]: value}})); setCopyState("idle");}}/>)}</div>}</fieldset>
          <fieldset className="micro-question"><legend><span>03</span> Після завершення хочеться ще?</legend><ReflectionSlider id="repeat-level" label="Бажання спробувати ще" icon="repeat" repeat value={answers.repeat} onChange={value => {setAnswers(previous => ({...previous, repeat: typeof value === "number" ? value : undefined})); setCopyState("idle");}}/></fieldset>
          <p className="micro-muted" aria-live="polite">{complete ? "Усі шкали оцінено або позначено як такі, яких не було. Можна подивитися підсумок." : `Оцінено або пропущено: ${completion.answered} з ${completion.total}. Решту шкал пересунь або познач «Не було в цій пробі».`}</p>
          <div className="micro-actions"><button type="submit" disabled={!complete} className="button button-dark">Побачити підсумок</button><button type="button" className="micro-link" onClick={() => setStage("task")}>Повернутися до задачі</button></div>
        </form>
      </>}
      {stage === "result" && task && insight && <>
        <div className="micro-heading"><span className="reflection-kicker">ТВОЇ СПОСТЕРЕЖЕННЯ / {task.title}</span><h3 id="trial-workspace-heading" ref={heading} tabIndex={-1}>Ось що ти помітив у цій пробі.</h3></div>
        <div className="micro-insight">{insight.paragraphs.map(text => <p key={text}>{text}</p>)}<p className="micro-boundary">Одна проба не визначає професію чи здібності. Це невеликий сигнал, який варто перевірити іншим досвідом.</p></div>
        <div className="micro-next"><span className="reflection-kicker">ЩО МОЖНА ПЕРЕВІРИТИ ДАЛІ</span><p>{insight.next}</p></div>
        <div className="micro-actions"><button type="button" className="button button-dark" onClick={() => onContact(summary)}>Розібрати мій результат</button><button type="button" className="button micro-button-outline" onClick={returnToTopics}>Спробувати іншу задачу</button></div>
        <div className="micro-share"><button type="button" className="micro-link" onClick={copyResult}>{copyState === "copied" ? <Check size={17}/> : <Copy size={17}/>} {copyState === "copied" ? "Результат скопійовано" : "Скопіювати результат для батьків"}</button><button type="button" className="micro-link" onClick={() => {setStage("reflect"); setCopyState("idle");}}>Змінити відповіді</button></div>
        <p className="micro-muted" role="status">{copyState === "copied" ? "Ти сам вирішуєш, кому показати результат. Він не надсилається автоматично." : "Підсумок доступний без реєстрації. Можеш спробувати й іншу діяльність у блоці вище."}</p>
        {copyState === "manual" && <><label className="micro-note" htmlFor="trial-share">Не вдалося скопіювати автоматично. Виділи та скопіюй текст:</label><textarea id="trial-share" readOnly value={summary} rows={8} onFocus={event => event.target.select()}/></>}
      </>}
    </div>}
  </>;
}
