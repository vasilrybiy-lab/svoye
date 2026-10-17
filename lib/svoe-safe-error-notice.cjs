'use strict';
// Reviewed reference for FUTURE n8n alerts; not wired to any published workflow.
// This pure helper never sends messages, reads secrets or touches live data.
const KYIV_ZONE = 'Europe/Kyiv';
const MAX_DAILY = 3;
const MIN_SPACING_MS = 30 * 60 * 1000;

function formatKyivDay(instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KYIV_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const part = name => parts.find(p => p.type === name)?.value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

function formatSafeErrorNotice(event, { now = Date.now(), throttleState = Object.create(null) } = {}) {
  const timestamp = Number(now);
  if (!Number.isFinite(timestamp) || timestamp < 0) return null;
  const time = new Date(timestamp);
  const rawWorkflowId = String(event?.workflow?.id ?? '');
  const workflowId = /^[A-Za-z0-9_-]{8,40}$/.test(rawWorkflowId)
    ? rawWorkflowId : 'unknown';
  const rawExecutionId = String(event?.execution?.id ?? '');
  const executionId = /^[0-9]{1,12}$/.test(rawExecutionId) ? rawExecutionId : null;

  // Deliberately NEVER interpolate workflow.name, error.message, stack,
  // headers, body, phone or AI output, even when they seem harmless.
  const key = workflowId + ':' + formatKyivDay(time);
  const record = throttleState[key] ?? { count: 0, last: -Infinity };
  if (record.count >= MAX_DAILY || timestamp - record.last < MIN_SPACING_MS) return null;
  throttleState[key] = { count: record.count + 1, last: timestamp };

  const clock = new Intl.DateTimeFormat('uk-UA', {
    timeZone: KYIV_ZONE, dateStyle: 'short', timeStyle: 'short',
  }).format(time);
  const executionLink = workflowId !== 'unknown' && executionId
    ? 'https://svoyechat.app.n8n.cloud/workflow/' + workflowId + '/executions/' + executionId
    : null;
  const message = [
    '🚨 Своє · збій автоматизації',
    'Сценарій: ' + (workflowId === 'unknown' ? 'невідомий' : 'ID ' + workflowId),
    'Час: ' + clock + ' (Київ)',
    ...(executionLink ? ['Деталі виконання: ' + executionLink] : []),
    'Повторні бронювання та створення подій перевіряйте перед дією.',
    'Текст помилки, повідомлення користувача та секрети не надсилаються.',
  ].join('\n');
  return { message, workflowId, executionId };
}
module.exports = { formatSafeErrorNotice };
