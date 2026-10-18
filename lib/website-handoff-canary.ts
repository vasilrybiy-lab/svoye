// Temporary synthetic-only diagnostic mode. It never enables the normal site UI.
export const CANARY_QUERY_VALUE = "svoe-handoff-canary-v1";
export const CANARY_SUMMARY = "SVOE SYNTHETIC CANARY v1. Тестовий підсумок: хочу дослідити свої інтереси. Без персональних даних.";
export const CANARY_BRANCH = "feature/v2-svoe-live-telegram-2026-10-16";
const MAX_WINDOW_MS = 5 * 60 * 1000;

type CanaryUrl = {
  protocol?: string;
  hostname?: string;
  port?: string;
  searchParams?: { get(name: string): string | null };
};

export function isCanaryRequest(
  url: CanaryUrl | undefined,
  env: Record<string, string | undefined>,
  now = Date.now(),
): boolean {
  const until = env.SVOYE_HANDOFF_CANARY_UNTIL;
  if (!until || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(until)) return false;
  const deadline = Date.parse(until);
  if (!Number.isFinite(now) || !Number.isFinite(deadline) || new Date(deadline).toISOString() !== until ||
      deadline <= now || deadline - now > MAX_WINDOW_MS) return false;
  const host = env.VERCEL_URL;
  return Boolean(
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_GIT_COMMIT_REF === CANARY_BRANCH &&
    env.SVOYE_HANDOFF_BOT_READY !== "true" &&
    env.SVOYE_HANDOFF_WEBHOOK_URL && env.SVOYE_HANDOFF_WEBHOOK_SECRET &&
    host && /^[a-z0-9-]+\.vercel\.app$/.test(host) &&
    url?.protocol === "https:" && url.hostname === host && !url.port &&
    url.searchParams?.get("canary") === CANARY_QUERY_VALUE
  );
}

export function renderCanaryPage(nonce: string): string {
  // All interpolated content is fixed synthetic text or a server-generated base64 nonce.
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Своє — перевірка передачі</title>
<style>body{font:18px system-ui;max-width:42rem;margin:3rem auto;padding:1rem;line-height:1.6}button,a{font:inherit;padding:.7rem}label{display:block;margin:1.5rem 0}</style></head>
<body><h1>Перевірка передачі до Telegram</h1>
<p>Буде передано лише цей вигаданий підсумок:</p><p>${CANARY_SUMMARY}</p>
<form id="check"><label><input id="consent" type="checkbox" required> Погоджуюся передати цей тестовий текст</label>
<button id="send" type="submit">Передати тестовий підсумок</button></form>
<p id="status" role="status" aria-live="polite"></p><a id="telegram" hidden rel="noreferrer noopener">Відкрити Telegram</a>
<script nonce="${nonce}">
const form=document.getElementById('check'),button=document.getElementById('send'),status=document.getElementById('status'),link=document.getElementById('telegram');
let attempted=false;
form.addEventListener('submit',async event=>{
 event.preventDefault(); if(attempted||!document.getElementById('consent').checked)return;
 attempted=true;button.disabled=true;status.textContent='Передаємо тестовий підсумок…';
 try{
  const response=await fetch(location.pathname+location.search,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,contextVersion:1,messageText:${JSON.stringify(CANARY_SUMMARY)}}),cache:'no-store',redirect:'error'});
  const result=await response.json();
  if(!response.ok||typeof result.telegramUrl!=='string')throw Error('handoff');
  const target=new URL(result.telegramUrl);
  if(target.origin!=='https://t.me'||target.username||target.password||target.pathname!=='/svoe_live_bot'||target.hash||target.searchParams.size!==1||!/^sv_[A-Za-z0-9_-]{43}$/.test(target.searchParams.get('start')||''))throw Error('handoff');
  link.href=result.telegramUrl;link.hidden=false;status.textContent='Тестовий підсумок збережено. Відкрий Telegram та натисни Start.';
 }catch{status.textContent='Передачу не підтверджено. Зупини тест і перевір результат; не повторюй запит.';}
});</script></body></html>`;
}
