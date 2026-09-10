"use strict";
(()=>{
 const KEY="ai3d:projects:v3",BACKUP=KEY+":backup",CORRUPT=KEY+":corrupt";
 const ALLOWED=new Set(["lightSign","spike","plug","sleeve","plate","adapter","enclosure"]);
 const BLOCKED_KEYS=new Set(["__proto__","prototype","constructor"]),PRINT_KEYS=new Set(["printer","nozzle","layer","walls","infill","notes"]),MAX_PROJECT_NAME=120,MAX_PROJECT_DESCRIPTION=1000;
 const state={checked:false,recovered:false,repairedActive:false,reason:"",error:""};
 function validValues(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;const e=Object.entries(v);if(e.length>100)return false;return e.every(([k,x])=>k.length<=160&&!BLOCKED_KEYS.has(k)&&(x===null||["string","number","boolean"].includes(typeof x))&&(typeof x!=="number"||Number.isFinite(x))&&(typeof x!=="string"||x.length<=50000))}
 function validPrint(pr){if(pr==null)return true;if(typeof pr!=="object"||Array.isArray(pr))return false;const entries=Object.entries(pr);if(entries.length>PRINT_KEYS.size)return false;return entries.every(([k,v])=>PRINT_KEYS.has(k)&&["string","number"].includes(typeof v)&&(typeof v!=="number"||Number.isFinite(v))&&String(v).length<=(k==="notes"?1000:160))}
 function validMetadata(p){return validPrint(p.print)&&(p.sourcePlan==null||(typeof p.sourcePlan==="string"&&p.sourcePlan.length<=160))&&(p.sourceSchema==null||p.sourceSchema===1||p.sourceSchema===2)&&(p.created==null||(typeof p.created==="number"&&Number.isFinite(p.created)))&&(p.updated==null||(typeof p.updated==="number"&&Number.isFinite(p.updated)))}
 function validLegacyProject(p){return!!(p&&typeof p==="object"&&!Array.isArray(p)&&typeof p.id==="string"&&p.id.trim()&&p.id.length<=160&&ALLOWED.has(p.type)&&validValues(p.values)&&validMetadata(p)&&(p.name==null||typeof p.name==="string")&&(p.description==null||typeof p.description==="string"))}
 function validProject(p){return!!(validLegacyProject(p)&&(p.name==null||p.name.length<=MAX_PROJECT_NAME)&&(p.description==null||p.description.length<=MAX_PROJECT_DESCRIPTION))}
 function parseArray(raw){try{const v=JSON.parse(raw);return Array.isArray(v)?v:null}catch{return null}}
 function uniqueValidItems(items){const ids=new Set(),out=[];for(const p of items||[]){if(!validProject(p)||ids.has(p.id))continue;ids.add(p.id);out.push(p)}return out}
 function parse(raw){const v=parseArray(raw);if(!v)return null;return uniqueValidItems(v).length===v.length?v:null}
 function validIdSet(items){return new Set((items||[]).map(p=>p.id))}
 function writeVerified(key,value){localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error("Palautetun projektitallennuksen varmennus epäonnistui.")}
 function restoreStorage(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}}
 function repairActive(items){
  const ids=validIdSet(items),fallback=items[0]?.id||"";
  try{
   const active=localStorage.getItem(KEY+":active")||"";
   if((active&&!ids.has(active))||(!active&&fallback)){
    writeVerified(KEY+":active",fallback);
    state.repairedActive=true;
    if(!state.reason)state.reason=fallback?"Aktiivisen projektin vanhentunut tunnus korjattiin ensimmäiseen kelvolliseen projektiin.":"Aktiivisen projektin vanhentunut tunnus tyhjennettiin."
   }else if(!fallback&&active){
    writeVerified(KEY+":active","");
    state.repairedActive=true;
    if(!state.reason)state.reason="Aktiivisen projektin tunnus tyhjennettiin, koska projekteja ei ole."
   }
  }catch(e){state.error=e?.message||String(e)}
 }
 function preserveCorrupt(raw){try{if(typeof raw==="string"&&raw.length<=2_000_000)localStorage.setItem(CORRUPT,raw)}catch{}}
 function repairLegacyText(raw){
  const all=parseArray(raw||"");if(!all?.length)return false;
  const ids=new Set();for(const p of all){if(!validLegacyProject(p)||ids.has(p.id))return false;ids.add(p.id)}
  if(!all.some(p=>(p.name?.length||0)>MAX_PROJECT_NAME||(p.description?.length||0)>MAX_PROJECT_DESCRIPTION))return false;
  const repaired=all.map(p=>({...p,name:typeof p.name==="string"?p.name.slice(0,MAX_PROJECT_NAME):p.name,description:typeof p.description==="string"?p.description.slice(0,MAX_PROJECT_DESCRIPTION):p.description}));
  try{
   preserveCorrupt(raw);
   writeVerified(KEY,JSON.stringify(repaired));
   state.recovered=true;
   state.reason="Vanhan projektitallennuksen liian pitkä nimi tai kuvaus lyhennettiin turvalliseen rajaan. Projektien CAD-arvoja ei muutettu.";
   repairActive(repaired);
   return true
  }catch(e){state.error=e?.message||String(e);state.reason="Vanhan projektitekstin automaattinen migraatio epäonnistui.";return false}
 }
 function restoreBackup(backup,reason){
  let prevMain=null,prevActive=null,captured=false;
  try{
   const restored=JSON.stringify(backup);
   prevMain=localStorage.getItem(KEY);prevActive=localStorage.getItem(KEY+":active");captured=true;
   writeVerified(KEY,restored);
   const ids=validIdSet(backup),active=prevActive||"";
   if(!ids.has(active))writeVerified(KEY+":active",backup[0]?.id||"");
   state.recovered=true;
   state.reason=reason||`Projektitallennus palautettiin rakenteellisesti tarkistetusta paikallisesta varmuuskopiosta (${backup.length} projektia).`;
   return true
  }catch(e){if(captured){restoreStorage(KEY,prevMain);restoreStorage(KEY+":active",prevActive)}state.error=e?.message||String(e);state.reason="Projektivarmuuskopion automaattinen palautus epäonnistui eikä keskeneräistä palautusta jätetty käyttöön.";return false}
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
  if(repairLegacyText(mainRaw))return;
  const backup=parse(backupRaw||"");
  if(backup?.length){preserveCorrupt(mainRaw);restoreBackup(backup,`Vioittunut projektitallennus palautettiin rakenteellisesti tarkistetusta paikallisesta varmuuskopiosta (${backup.length} projektia).`);return}
  if(salvageValid(mainRaw))return;
  if(backup){preserveCorrupt(mainRaw);restoreBackup(backup,"Vioittunut projektitallennus palautettiin tyhjästä mutta rakenteellisesti kelvollisesta paikallisesta varmuuskopiosta.");return}
  preserveCorrupt(mainRaw);
  state.reason="Projektitallennus on vioittunut eikä rakenteellisesti kelvollista paikallista varmuuskopiota tai pelastettavaa projektia löytynyt."
 }
 recover();
 window.AI3DStorageRecovery=state;
})();
