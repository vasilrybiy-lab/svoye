// Pure transport helpers. No storage/network. Never proof of consent or an active link.
const code=/^[A-Za-z0-9_-]{8,24}$/;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const bytes=s=>new TextEncoder().encode(s).byteLength;
export const publicCampaignCode=v=>typeof v==='string'&&code.test(v)?v:null;
export function sourceContext(value){
 if(!plain(value)||Object.keys(value).length!==2||value.version!==1||!Object.hasOwn(value,'publicCode')||!publicCampaignCode(value.publicCode))return null;
 return {version:1,publicCode:value.publicCode};
}
export function campaignCodeFromSiteUrl(href){
 if(typeof href!=='string'||href.length>2048)return null;
 try{const u=new URL(href);if(u.protocol!=='https:'||u.hostname!=='svoe.live'||u.port||u.username||u.password)return null;
  const values=u.searchParams.getAll('mc');return values.length===1?publicCampaignCode(values[0]):null;
 }catch{return null;}
}
export function campaignCodeFromBotStart(text){
 if(typeof text!=='string'||text.length>100)return null;
 const m=/^\/start(?:@svoe_live_bot)? mc_([A-Za-z0-9_-]{8,24})$/.exec(text.trim());return m?m[1]:null;
}
export function optionalSourceBody(base,value,{authorized=false}={}){
 // Existing handoff validation remains mandatory at the caller/server.
 // Caller must supply a consent decision covered by the actual notice version.
 if(!plain(base)||Object.hasOwn(base,'sourceContext'))return {ok:false,error:'INVALID_BASE'};
 let original;try{original=JSON.stringify(base);}catch{return {ok:false,error:'INVALID_BASE'};}
 if(bytes(original)>10000)return {ok:false,error:'BASE_TOO_LARGE'};
 const context=sourceContext(value);
 if(authorized!==true||!context||bytes(JSON.stringify(context))>512)return {ok:true,body:original,sourceAttached:false};
 const candidate=JSON.stringify({...base,sourceContext:context});
 return bytes(candidate)<=10000?{ok:true,body:candidate,sourceAttached:true}:{ok:true,body:original,sourceAttached:false};
}
