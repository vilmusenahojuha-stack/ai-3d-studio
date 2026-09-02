"use strict";
(()=>{
 const KEY="ai3d:projects:v3",BACKUP=KEY+":backup",CORRUPT=KEY+":corrupt";
 const state={checked:false,recovered:false,reason:"",error:""};
 function parse(raw){try{const v=JSON.parse(raw);return Array.isArray(v)?v:null}catch{return null}}
 function validIdSet(items){return new Set((items||[]).map(p=>p&&typeof p.id==="string"?p.id:"").filter(Boolean))}
 function recover(){
  state.checked=true;
  let mainRaw=null,backupRaw=null;
  try{mainRaw=localStorage.getItem(KEY);backupRaw=localStorage.getItem(BACKUP)}catch(e){state.error=e?.message||String(e);return}
  if(mainRaw==null)return;
  const main=parse(mainRaw);
  if(main)return;
  const backup=parse(backupRaw||"");
  if(!backup){state.reason="Projektitallennus on vioittunut eikä kelvollista paikallista varmuuskopiota löytynyt.";return}
  try{
   try{if(mainRaw.length<=2_000_000)localStorage.setItem(CORRUPT,mainRaw)}catch{}
   localStorage.setItem(KEY,JSON.stringify(backup));
   const ids=validIdSet(backup),active=localStorage.getItem(KEY+":active")||"";
   if(!ids.has(active))localStorage.setItem(KEY+":active",backup[0]?.id||"");
   state.recovered=true;
   state.reason=`Vioittunut projektitallennus palautettiin paikallisesta varmuuskopiosta (${backup.length} projektia).`;
  }catch(e){state.error=e?.message||String(e);state.reason="Projektivarmuuskopion automaattinen palautus epäonnistui."}
 }
 recover();
 window.AI3DStorageRecovery=state;
})();
