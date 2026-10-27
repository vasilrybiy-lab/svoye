"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export default function WebsiteTelegramConsent({ age, messageText }: { age: string; messageText?: string }) {
  const [general, setGeneral] = useState(false);
  const [results, setResults] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/website-handoff", { cache: "no-store", signal: controller.signal })
      .then(r => r.ok ? r.json() : null).then(v => setReady(v?.enabled === true))
      .catch(() => { if (!controller.signal.aborted) setReady(false); });
    return () => controller.abort();
  }, []);
  async function continueToTelegram() {
    if (!general || age !== "adult" || !ready || busy || error) return;
    setBusy(true);
    try {
      const response = await fetch("/api/website-handoff", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ consent: true, noticeVersion: "website-consultation/v2", ageDeclaration: { band: age, version: "age-declaration/v1" }, transferResults: !!messageText && results, ...(messageText && results ? { messageText } : {}) }),
      });
      const value = await response.json();
      if (!response.ok || typeof value.telegramUrl !== "string" || !/^https:\/\/t\.me\/svoe_live_bot\?start=sv_[A-Za-z0-9_-]{43}$/.test(value.telegramUrl)) {
        throw Error(typeof value.error === "string" ? value.error : "Передачу не підтверджено. Залишайся на сторінці: твої результати доступні нижче.");
      }
      window.location.assign(value.telegramUrl);
    } catch (e) {
      setError(e instanceof Error && !/timeout|abort|fetch/i.test(e.message) ? e.message : "Підтвердження не отримано. Автоматично не повторюємо запит. Результати залишаються на цій сторінці; щодо допомоги напиши hello@svoe.live.");
      setBusy(false);
    }
  }
  return <section className="v2-handoff" aria-labelledby="website-telegram-title">
    <h2 id="website-telegram-title">Продовжимо в Telegram?</h2>
    <p>{messageText ? "Твої результати вже готові. Можеш взяти їх у розмову з ботом." : "Постав запитання й домовся про консультацію у зручному темпі."}</p>
    {messageText && <details className="v2-handoff-preview"><summary>Переглянути, що отримає бот</summary><div className="v2-handoff-preview-text">{messageText}</div></details>}
    <div className="v2-consent-card">
      <h3>Спочатку — про твої дані</h3>
      <p>Бот використовує повідомлення для розмови й організації консультації. Результати проби не додаємо до CRM.</p>
      <p>Звернення та резюме — 180 днів після останнього контакту.</p>
      <details className="v2-privacy-details"><summary>Докладніше про обробку даних</summary>
        <p>Оператор: Логаза Віталій Васильович. Контакт: <a href="mailto:hello@svoe.live">hello@svoe.live</a>.</p>
        <p>Для AI-відповіді та консультації використовуємо Telegram, n8n, OpenAI, Neon і Vercel. У CRM консультант бачить первісний запит, актуальне резюме й дані запису та може додати робочу нотатку. Повний архів розмови в CRM не ведемо.</p>
        <p>Якщо окремо обереш передачу результатів, бот отримає лише показаний вище текст. Він використає його для відповіді в Telegram; у CRM ці результати й резюме проби не записуємо. Для доставки використовуємо тимчасовий буфер у базі: очищуємо після підтвердженої доставки або закінчення 10 хвилин від підготовки. Посилання одноразове. Без передачі результатів буфер містить лише доказ вибору та службове повідомлення.</p>
        <p>Звернення й резюме зберігаємо 180 днів після останнього контакту. Перегляди та фонові завдання строк не подовжують. Історія в Telegram і зберігання у провайдерів регулюються їхніми правилами.</p>
        <p>Відкликати згоду можна командою /stop у боті. Для запиту щодо даних напиши hello@svoe.live. До переходу дані з цієї форми не надсилаємо; самі чекбокси ще нічого не передають.</p>
      </details>
      <label className="v2-consent-choice"><input type="checkbox" checked={general} disabled={busy} onChange={e => setGeneral(e.target.checked)} /><span>Погоджуюсь на обробку мого звернення для розмови й консультації.</span></label>
      {messageText && <label className="v2-consent-choice"><input type="checkbox" checked={results} disabled={busy} onChange={e => setResults(e.target.checked)} /><span>Хочу передати результати цієї проби боту.<small>Необов’язково — можна продовжити без результатів.</small></span></label>}
    </div>
    <button type="button" className="v2-button dark" disabled={!general || age !== "adult" || ready !== true || busy || !!error} onClick={continueToTelegram}>
      {busy ? "Готуємо перехід…" : messageText && results ? "Передати результати в Telegram" : "Продовжити в Telegram"}<ArrowRight size={18}/>
    </button>
    {ready === false && <p role="status">Передача тимчасово недоступна. Результати можна переглядати й копіювати на цій сторінці.</p>}
    {error && <p role="alert">{error}</p>}
    <p className="v2-helpnote">Після підготовки посилання діє 10 хвилин. Вибір віку й згоду повторювати в боті не потрібно.</p>
    <p className="v2-privacy-contact">Логаза Віталій Васильович · <a href="mailto:hello@svoe.live">hello@svoe.live</a></p>
  </section>;
}
