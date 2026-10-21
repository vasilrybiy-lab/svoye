'use strict';
// TEST-only admission policy, used by the server route adapter.
// query is a trusted SERVER Postgres adapter; NEVER accept SQL/results from HTTP.
// Caller runs existing readiness/body/origin checks before reaching this guard.
const RESERVE_SQL = "SELECT current_user::text AS connected_role,current_database()::text AS database,current_setting('neon.project_id',true) AS project_id,current_setting('neon.branch_id',true) AS branch_id,CASE WHEN current_user='svoe_website_test_runtime' AND current_database()='neondb' AND current_setting('neon.project_id',true)='morning-cake-04594300' AND current_setting('neon.branch_id',true)='br-delicate-heart-b7h6nwzw' THEN public.svoe_test_reserve_website_admission() ELSE NULL::jsonb END AS receipt;";
const closed = reason => ({ allowed: false, httpStatus: 503, reason });
const iso = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x) &&
  Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
const kyiv = x => Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
  timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',
}).formatToParts(new Date(x)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const dateKey = p => p.year+'-'+p.month+'-'+p.day;
const midnight15 = p => p.day==='15' && p.hour==='00' && p.minute==='00' && p.second==='00';
function checkReceipt(result, now) {
  if (!Number.isSafeInteger(now) || !Array.isArray(result?.rows) || result.rows.length !== 1)
    return closed('unverified_reservation');
  const row = result.rows[0], r = row?.receipt;
  if (row?.connected_role !== 'svoe_website_test_runtime' || row.database !== 'neondb' ||
      row.project_id !== 'morning-cake-04594300' || row.branch_id !== 'br-delicate-heart-b7h6nwzw')
    return closed('wrong_database_binding');
  if (r?.allowed === false && ['daily_limit','cycle_limit'].includes(r.reason))
    return { allowed: false, httpStatus: 429, reason: r.reason };
  if (r?.allowed !== true || r.policy_version !== 'website_admission_v2_carryover' ||
      r.test_environment_verified !== true || r.project_id !== row.project_id || r.branch_id !== row.branch_id ||
      r.cycle_limit !== 30 || r.daily_base !== 3 ||
      !Number.isSafeInteger(r.used_cycle) || r.used_cycle < 1 || r.used_cycle > 30 ||
      !Number.isSafeInteger(r.used_today) || r.used_today < 1 || r.used_today > r.used_cycle ||
      !iso(r.cycle_start) || !iso(r.cycle_end) || Date.parse(r.cycle_start) > now ||
      Date.parse(r.cycle_end) <= now || Date.parse(r.cycle_end)-Date.parse(r.cycle_start) > 34*86400000)
    return closed('unverified_reservation');
  const current=kyiv(now), start=kyiv(r.cycle_start), end=kyiv(r.cycle_end);
  if (r.day_key !== dateKey(current)) return closed('reservation_day_changed');
  const startMonth=Number(start.year)*12+Number(start.month);
  const endMonth=Number(end.year)*12+Number(end.month);
  if (!midnight15(start) || !midnight15(end) || endMonth!==startMonth+1 ||
      !r.cycle_start.endsWith('.000Z') || !r.cycle_end.endsWith('.000Z'))
    return closed('unverified_cycle_boundary');
  const days=(Date.parse(dateKey(current)+'T00:00:00Z')-Date.parse(dateKey(start)+'T00:00:00Z'))/86400000+1;
  let unlocked=Math.min(30,3*days);
  // Fixed TEST-cycle allowance expires without a scheduler; ordinary policy stays3/day.
  if (r.test_allowance != null) {
    const allowance=r.test_allowance;
    if (!allowance || typeof allowance!=='object' || Array.isArray(allowance) ||
        allowance.until!=='2026-10-25T09:00:00.000Z' || allowance.cycle_floor!==22 ||
        now>=Date.parse(allowance.until) || r.cycle_start!=='2026-10-14T21:00:00.000Z' ||
        r.cycle_end!=='2026-11-14T22:00:00.000Z') return closed('unverified_test_allowance');
    unlocked=Math.max(unlocked,22);
  }
  if (r.unlocked_cycle!==unlocked || r.used_cycle>unlocked ||
      !Number.isSafeInteger(r.available_after) || r.available_after!==unlocked-r.used_cycle)
    return closed('unverified_carryover');
  return { allowed: true, httpStatus: 200 };
}
async function reserveAdmission(query, now = () => Date.now()) {
  if (typeof query !== 'function') return closed('database_not_configured');
  try {
    // Exactly one call. Unknown/timeout spends a possible reservation; no retry.
    const result = await query(RESERVE_SQL);
    return checkReceipt(result, now());
  } catch { return closed('reservation_unknown'); }
}
module.exports = { RESERVE_SQL, checkReceipt, reserveAdmission };

