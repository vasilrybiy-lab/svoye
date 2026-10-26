import {validTrialEnvelope} from './trial-reflection.mjs';
import {isSyntheticTrial} from './trial-synthetic-fixtures.mjs';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
export function prepareSyntheticTrialStore(body,tokenHash){
 if(!validTrialEnvelope(body)||!isSyntheticTrial(body.trialReflection)||typeof tokenHash!=='string'||!/^[a-f0-9]{64}$/.test(tokenHash))throw Error('INVALID_SYNTHETIC_TRIAL_STORE');
 return {op:'store',mode:'synthetic',token_hash:tokenHash,consent:true,age_declaration:{...body.ageDeclaration},trial_reflection:structuredClone(body.trialReflection)};
}
export function readTrialStoreAck(r,now=Date.now()){
 if(!r||r.stored!==true||r.transfer_version!==2||r.context_version!==2||r.trial_schema_version!=='svoe-trial-reflection/v1'||!uuid(r.website_request_id)
 ||typeof r.expires_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.expires_at)
 ||!Number.isFinite(Date.parse(r.expires_at))||new Date(r.expires_at).toISOString()!==r.expires_at||!Number.isFinite(now)
 ||Date.parse(r.expires_at)<=now||Date.parse(r.expires_at)>now+600000
 ||r.website_age?.band!=='adult'||r.website_age.version!=='age-declaration/v1'||r.website_age.assurance!=='self_declared'
 ||typeof r.website_age.declared_at!=='string'||!Number.isFinite(Date.parse(r.website_age.declared_at))||Date.parse(r.website_age.declared_at)>now
 ||Date.parse(r.website_age.declared_at)>=Date.parse(r.expires_at))throw Error('UNCONFIRMED_TRIAL_STORE');
 // This does not acknowledge queue arming, claim, CRM persistence or Send.
 // No provider-supplied URL is ever accepted as a client link.
 return {website_request_id:r.website_request_id,expires_at:r.expires_at,website_age:{band:'adult',version:'age-declaration/v1',assurance:'self_declared',declared_at:r.website_age.declared_at}};
}
