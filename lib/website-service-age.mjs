/** @returns {{allowed:false,status:number,code:string}|{allowed:true,synthetic:true,ageAssurance:string,band:string}} */
export function websiteAgeGate(body, context) {
  const deny = (status, code) => ({ allowed: false, status, code });
  if (!body || Array.isArray(body) || typeof body !== 'object') return deny(400, 'AGE_INPUT_INVALID');
  if (Object.keys(body).some(k => !['consent', 'contextVersion', 'messageText', 'ageDeclaration'].includes(k))) {
    return deny(400, 'AGE_INPUT_INVALID');
  }
  const age = body.ageDeclaration;
  if (!age || typeof age !== 'object' || Array.isArray(age)) return deny(428, 'AGE_REQUIRED');
  if (Object.keys(age).some(k => !['band', 'version'].includes(k))) return deny(400, 'AGE_INPUT_INVALID');
  if (age.version !== 'age-declaration/v1') return deny(428, 'AGE_VERSION_REQUIRED');
  if (age.band === 'under14') return deny(403, 'SERVICE_MINIMUM_14');
  if (age.band === 'unknown' || age.band === undefined) return deny(428, 'AGE_REQUIRED');
  if (!['14to17', 'adult'].includes(age.band)) return deny(400, 'AGE_INPUT_INVALID');
  if (age.band === '14to17') return deny(503, 'MINOR_SERVICE_POLICY_PENDING');
  // Only the pre-existing server-verified diagnostic window and its exact fixed
  // synthetic text can proceed. A browser cannot set context.canary.
  if (context?.canary !== true || body.messageText !== context.canarySummary) {
    return deny(503, 'REAL_SERVICE_POLICY_PENDING');
  }
  return { allowed: true, synthetic: true, ageAssurance: 'self_declared', band: 'adult' };
}
export function validateWebsiteAgeDeclaration(age) {
  return !!(age && typeof age==='object' && !Array.isArray(age) &&
    Object.keys(age).length===2 && Object.keys(age).every(k=>['band','version'].includes(k)) &&
    age.band==='adult' && age.version==='age-declaration/v1');
}
export function websiteAgeMessage(band) {
  if(band==='under14')return 'Сервіс «Своє» доступний із 14 років.';
  if(band==='14to17')return 'Сценарій для 14–17 років ще готується. Персональна проба й передавання даних поки закриті.';
  if(band!=='adult')return 'Обери вікову групу перед початком власної проби.';
  return 'Вік указано зі слів користувача. Це не документальна перевірка віку.';
}
