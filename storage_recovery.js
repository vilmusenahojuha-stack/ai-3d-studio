"use strict";
(()=>{
 const KEY="ai3d:projects:v3",BACKUP=KEY+":backup",CORRUPT=KEY+":corrupt";
 const ALLOWED=new Set(["lightSign","spike","plug","sleeve","plate","adapter","enclosure"]);
 const BLOCKED_KEYS=new Set(["__proto__","prototype","constructor"]);
 const state={checked:false,recovered:false,reason:"",error:""};
 function validValues(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;const e=Object.entries(v);if(e.length>100)return false;return e.every(([k,x])=>!BLOCKED_KEYS.has(k)&&(x===null||["string","number","boolean"].includes(typeof x))&&(typeof x!=="number"||Number.isFinite(x)))}
 function validProject(p){return!!(p&&typeof p==="object"&&!Array.isArray(p)&&typeof p.id==="string"&&p.id&&ALLOWED.has(p.type)&&validValues(p.values))}
 function parse(raw){try{const v=JSON.parse(raw);return Array.isArray(v)&&v.every(validProject)?v:null}catch{return null}}
 function validIdSet(items){return new Set((items||[]).map(p=>p.id))}
 function recover(){
  state.checked=true;
  let mainRaw=null,backupRaw=null;
  try{mainRaw=localStorage.getItem(KEY);backupRaw=localStorage.getItem(BACKUP)}catch(e){state.error=e?.message||String(e);return}
  if(mainRaw==null)return;
  const main=parse(mainRaw);
  if(main)return;
  const backup=parse(backupRaw||"");
  if(!backup){state.reason="Projektitallennus on vioittunut eikä rakenteellisesti kelvollista paikallista varmuuskopiota löytynyt.";return}
  try{
   try{if(mainRaw.length<=2_000_000)localStorage.setItem(CORRUPT,mainRaw)}catch{}
   localStorage.setItem(KEY,JSON.stringify(backup));
   const ids=validIdSet(backup),active=localStorage.getItem(KEY+":active")||"";
   if(!ids.has(active))localStorage.setItem(KEY+":active",backup[0]?.id||"");
   state.recovered=true;
   state.reason=`Vioittunut projektitallennus palautettiin rakenteellisesti tarkistetusta paikallisesta varmuuskopiosta (${backup.length} projektia).`;
  }catch(e){state.error=e?.message||String(e);state.reason="Projektivarmuuskopion automaattinen palautus epäonnistui."}
 }
 recover();
 window.AI3DStorageRecovery=state;
})();
