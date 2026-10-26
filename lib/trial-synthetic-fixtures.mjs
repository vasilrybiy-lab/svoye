import {trialCatalog} from './trial-catalog-v1.mjs';
import {buildTrialReflection} from './trial-reflection.mjs';
// Immutable fictional allow-list for the CLOSED native/backend stage only.
// A mode flag or an arbitrary note labelled synthetic is never sufficient.
export const syntheticTrialFixtures=['phone-stand','message-check'].map((trialId,n)=>{
 const t=trialCatalog.tasks[trialId],qs=[...trialCatalog.questions.interest[t.category],...trialCatalog.questions.difficulty,...trialCatalog.questions.continuation];
 return buildTrialReflection({trialId,answers:Object.fromEntries(qs.map((q,i)=>[q.id,i===1?null:i%2?4:0])),noDifficulty:n===1,notes:n===0?'  Синтетична проба TRIAL16\nбез персональних даних  ':''},'2026-10-26T12:00:00.000Z');
});
export function isSyntheticTrial(p){
 // Reflection validation has already normalized the exact field shapes. Compare
 // objects recursively, independent of JSON key order but never array order.
 const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
 return syntheticTrialFixtures.some(f=>JSON.stringify(ordered(f))===JSON.stringify(ordered(p)));
}
