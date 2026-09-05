"use strict";
(()=>{
 const KEY="ai3d:projects:v3",BACKUP=KEY+":backup",CORRUPT=KEY+":corrupt";
 const ALLOWED=new Set(["lightSign","spike","plug","sleeve","plate","adapter","enclosure"]);
 const BLOCKED_KEYS=new Set(["__proto__","prototype","constructor"]);
 const state={checked:false,recovered:false,repairedActive:false,reason:"",error:""};
 function validValues(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;const e=Object.entries(v);if(e.length>100)return false;return e.every(([k,x])=>!BLOCKED_KEYS.has(k)&&(x===null||["string","number","boolean"].includes(typeof x))&&(typeof x!=="number"||Number.isFinite(x)))}
 function validProject(p){return!!(p&&typeof p==="object"&&!Array.isArray(p)&&typeof p.id==="string"&&p.id&&ALLOWED.has(p.type)&&validValues(p.values))}
 function parseArray(raw){try{const v=JSON.parse(raw);return Array.isArray(v)?v:null}catch{return null}}
 function uniqueValidItems(items){const ids=new Set(),out=[];for(const p of items||[]){if(!validProject(p)||ids.has(p.id))continue;ids.add(p.id);out.push(p)}return out}
 function parse(raw){const v=parseArray(raw);if(!v)return null;return uniqueValidItems(v).length===v.length?v:null}
 function validIdSet(items){return new Set((items||[]).map(p=>p.id))}
 function writeVerified(key,value){localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error("Palautetun projektitallennuksen varmennus epäonnistui.")}
 function repairActive(items){
  const ids=validIdSet(items),fallback=items[0]?.id||"";
  try{
   const active=localStorage.getItem(KEY+":active")||"";
   if((active&&!ids.has(active))||(!active&&fallback)){
    localStorage.setItem(KEY+":active",fallback);
    state.repairedActive=true;
    if(!state.reason)state.reason=fallback?"Aktiivisen projektin vanhentunut tunnus korjattiin ensimmäiseen kelvolliseen projektiin.":"Aktiivisen projektin vanhentunut tunnus tyhjennettiin."
   }else if(!fallback&&active){
    localStorage.setItem(KEY+":active","");
    state.repairedActive=true;
    if(!state.reason)state.reason="Aktiivisen projektin tunnus tyhjennettiin, koska projekteja ei ole."
   }
  }catch(e){state.error=e?.message||String(e)}
 }
 function preserveCorrupt(raw){try{if(typeof raw==="string"&&raw.length<=2_000_000)localStorage.setItem(CORRUPT,raw)}catch{}}
 function restoreBackup(backup,reason){
  try{
   const restored=JSON.stringify(backup);
   writeVerified(KEY,restored);
   const ids=validIdSet(backup),active=localStorage.getItem(KEY+":active")||"";
   if(!ids.has(active))localStorage.setItem(KEY+":active",backup[0]?.id||"");
   state.recovered=true;
   state.reason=reason||`Projektitallennus palautettiin rakenteellisesti tarkistetusta paikallisesta varmuuskopiosta (${backup.length} projektia).`;
   return true
  }catch(e){state.error=e?.message||String(e);state.reason="Projektivarmuuskopion automaattinen palautus epäonnistui.";return false}
 }
 function salvageValid(raw){
  const all=parseArray(raw||"");if(!all)return false;
  const valid=uniqueValidItems(all);if(!valid.length||valid.length===all.length)return false;
  try{
   preserveCorrupt(raw);
   writeVerified(KEY,JSON.stringify(valid));
   state.recovered=true;
   state.reason=`Projektitallennuksesta pelastettiin ${valid.length}/${all.length} rakenteellisesti kelvollista ja yksilöllistä projektia. Alkuperäinen vioittunut data säilytettiin palautusta varten.`;
   repairActive(valid);
   return true
  }catch(e){state.error=e?.message||String(e);state.reason="Kelvollisten projektien automaattinen pelastus epäonnistui.";return false}
 }
 function recover(){
  state.checked=true;
  let mainRaw=null,backupRaw=null;
  try{mainRaw=localStorage.getItem(KEY);backupRaw=localStorage.getItem(BACKUP)}catch(e){state.error=e?.message||String(e);return}
  if(mainRaw==null){
   const backup=parse(backupRaw||"");
   if(backup)restoreBackup(backup,`Puuttuva projektitallennus palautettiin rakenteellisesti tarkistetusta paikallisesta varmuuskopiosta (${backup.length} projektia).`);
   return
  }
  const main=parse(mainRaw);
  if(main){repairActive(main);return}
  const backup=parse(backupRaw||"");
  if(backup){preserveCorrupt(mainRaw);restoreBackup(backup,`Vioittunut projektitallennus palautettiin rakenteellisesti tarkistetusta paikallisesta varmuuskopiosta (${backup.length} projektia).`);return}
  if(salvageValid(mainRaw))return;
  preserveCorrupt(mainRaw);
  state.reason="Projektitallennus on vioittunut eikä rakenteellisesti kelvollista paikallista varmuuskopiota tai pelastettavaa projektia löytynyt."
 }
 recover();
 window.AI3DStorageRecovery=state;
})();
