import {trialCatalog as catalog} from './trial-catalog-v1.mjs';
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const bytes=s=>new TextEncoder().encode(s).length;
const level=v=>Number.isInteger(v)&&v>=0&&v<=4;
const cleanUnicode=s=>!Array.from(s).some(c=>c.length===1&&c.charCodeAt(0)>=0xd800&&c.charCodeAt(0)<=0xdfff);
const stamp=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const task=id=>typeof id==='string'&&Object.hasOwn(catalog.tasks,id)?catalog.tasks[id]:null;
const questions=t=>[...catalog.questions.interest[t.category],...catalog.questions.difficulty,...catalog.questions.continuation];
const difficulty=new Set(catalog.questions.difficulty.map(q=>q.id));
export const trialLimits=Object.freeze({notes_utf16:1500,payload_bytes:8000,summary_utf16:4000,summary_bytes:8000});
export function validTrialReflection(p){
 if(!exact(p,['schema_version','question_version','trial_id','task_version','submitted_at_client','no_difficulty','answers','notes']))return false;
 const t=task(p.trial_id);
 if(!t||p.schema_version!==catalog.schema_version||p.question_version!==catalog.question_version||p.task_version!==t.task_version||!stamp(p.submitted_at_client)||typeof p.no_difficulty!=='boolean')return false;
 if(p.notes!==null&&(typeof p.notes!=='string'||!p.notes.trim()||p.notes.length>trialLimits.notes_utf16||!cleanUnicode(p.notes)))return false;
 const qs=questions(t);
 if(!Array.isArray(p.answers)||p.answers.length!==qs.length)return false;
 for(let i=0;i<qs.length;i++){
  const a=p.answers[i];if(!exact(a,['id','state','value'])||a.id!==qs[i].id)return false;
  if(p.no_difficulty&&difficulty.has(a.id)){if(a.state!=='not_applicable'||a.value!==null)return false;}
  else if(!(a.state==='rated'&&level(a.value))&&!(a.state==='not_observed'&&a.value===null))return false;
 }
 return bytes(JSON.stringify(p))<=trialLimits.payload_bytes;
}
export function buildTrialReflection(form,submittedAt){
 if(!exact(form,['trialId','answers','noDifficulty','notes'])||!task(form.trialId)||typeof form.noDifficulty!=='boolean'||typeof form.notes!=='string'||!form.answers||typeof form.answers!=='object'||Array.isArray(form.answers))throw Error('INVALID_TRIAL_FORM');
 const t=task(form.trialId),qs=questions(t),ids=new Set(qs.map(q=>q.id));
 if(Object.keys(form.answers).some(id=>!ids.has(id)))throw Error('FOREIGN_TRIAL_QUESTION');
 const answers=qs.map(q=>{
  // Hidden values from an earlier difficulty answer are not submitted when
  // the person explicitly selects no difficulties; do not turn them into zero.
  if(form.noDifficulty&&difficulty.has(q.id))return {id:q.id,state:'not_applicable',value:null};
  if(!Object.hasOwn(form.answers,q.id)||!(form.answers[q.id]===null||level(form.answers[q.id])))throw Error('INCOMPLETE_TRIAL_REFLECTION');
  return {id:q.id,state:form.answers[q.id]===null?'not_observed':'rated',value:form.answers[q.id]};
 });
 const p={schema_version:catalog.schema_version,question_version:catalog.question_version,trial_id:t.id,task_version:t.task_version,submitted_at_client:submittedAt,no_difficulty:form.noDifficulty,answers,notes:form.notes.trim()?form.notes:null};
 if(!validTrialReflection(p))throw Error('INVALID_TRIAL_REFLECTION');return p;
}
export function renderTrialSummary(p){
 if(!validTrialReflection(p))throw Error('INVALID_TRIAL_REFLECTION');
 const t=task(p.trial_id),by=Object.fromEntries(p.answers.map(a=>[a.id,a]));
 const line=q=>`${q.label}: ${by[q.id].state==='not_observed'?'Не було у пробі':catalog.rating_labels[by[q.id].value]}`;
 const summary=[`Моя мала проба у «Своє»: ${t.title}`,`Напрям: ${catalog.category_labels[t.category]}`,...catalog.questions.interest[t.category].map(line),'Коли було складно:',...(p.no_difficulty?['Складнощів не було']:catalog.questions.difficulty.map(line)),...catalog.questions.continuation.map(line),...(p.notes?[`Мої нотатки: ${p.notes.trim()}`]:[]),'Одна проба не визначає професію чи здібності; це спостереження для наступного кроку.'].join('\n');
 if(summary.length>trialLimits.summary_utf16||bytes(summary)>trialLimits.summary_bytes)throw Error('TRIAL_SUMMARY_LIMIT');return summary;
}
export function validTrialEnvelope(body){
 return exact(body,['consent','contextVersion','trialReflection','ageDeclaration'])&&body.consent===true&&body.contextVersion===2&&validTrialReflection(body.trialReflection)&&exact(body.ageDeclaration,['band','version'])&&body.ageDeclaration.band==='adult'&&body.ageDeclaration.version==='age-declaration/v1';
}
