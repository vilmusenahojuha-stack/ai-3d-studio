"use strict";
(()=>{
 const KEY="ai3d:projects:v3",$=id=>document.getElementById(id),ALLOWED=new Set(["lightSign","spike","plug","sleeve","plate","adapter","enclosure"]),BLOCKED_KEYS=new Set(["__proto__","prototype","constructor"]);
 const MAP={lightSign:["signDiameter","signRingWidth","signDepth","signWall","diffuserThickness","starWidth","starThickness","ledWidth","filamentPriceKg","ledCost","powerCost","miscCost","material"],spike:["nutAf","clearance","lockAmount","lockZ","wall","baseHeight","totalHeight","tipRadius","monogram","monogramWidth","monogramDepth","monogramHeight","material"],plug:["tubeW","tubeH","tubeWall","plugClear","insertDepth","capThickness","capOverhang","material"],sleeve:["sleeveID","sleeveWall","sleeveLength","material"],plate:["plateL","plateW","plateT","plateHolePattern","plateHoleD","plateHoleEdge","plateCornerStyle","plateCornerSize","plateCustomHoles","material"],adapter:["adapterLength","adapterID1","adapterID2","adapterOD1","adapterOD2","material"],enclosure:["enclosureW","enclosureD","enclosureH","enclosureWall","enclosureFloor","material"]};
 let checking=false,lastIssue="",editTimer=0;
 function validValues(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;const entries=Object.entries(v);if(entries.length>100)return false;return entries.every(([k,x])=>!BLOCKED_KEYS.has(k)&&(x===null||["string","number","boolean"].includes(typeof x))&&(typeof x!=="number"||Number.isFinite(x)))}
 function validProject(p){return!!(p&&typeof p==="object"&&!Array.isArray(p)&&typeof p.id==="string"&&p.id&&ALLOWED.has(p.type)&&validValues(p.values))}
 function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)&&v.every(validProject)?v:null}catch{return null}}
 function warn(text){lastIssue=text;const box=$("planSyncStatus");if(box){const message="⚠ "+text;box.dataset.storageGuardWarning="1";box.dataset.storageGuardWarningText=message;box.textContent=message;box.className="plan-sync-status warn"}}
 function clearOwnWarning(){const box=$("planSyncStatus");if(box?.dataset.storageGuardWarning==="1"){const ownMessage=box.dataset.storageGuardWarningText||"";delete box.dataset.storageGuardWarning;delete box.dataset.storageGuardWarningText;if(!ownMessage||box.textContent===ownMessage){box.textContent="✓ Projektin paikallinen tallennus varmistettu.";box.className="plan-sync-status ok"}}}
 function same(a,b){if(typeof a==="number"||typeof b==="number"){const x=Number(a),y=Number(b);return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<1e-9}return String(a??"")===String(b??"")}
 function liveValues(type){const out={};for(const id of MAP[type]||[]){const e=$(id);if(!e)continue;if(e.type==="number"){if(Number.isFinite(e.valueAsNumber))out[id]=e.valueAsNumber}else out[id]=e.value}return out}
 function verify(requireLive=false){
  if(checking)return !lastIssue;
  checking=true;
  try{
   const active=window.AI3DProjects?.active?.();
   if(!active?.id){lastIssue="";clearOwnWarning();return true}
   const items=read();
   if(!items){warn("Paikallinen projektitallennus ei läpäissyt rakennetarkistusta. Vie tärkeä työ JSON-varmuuskopioksi ennen sivun sulkemista.");return false}
   const storedProject=items.find(p=>p.id===active.id),activeId=localStorage.getItem(KEY+":active")||"";
   if(!storedProject||activeId!==active.id){warn("Projekti on auki, mutta paikallinen tallennus ei varmistunut. Vie tärkeä työ JSON-varmuuskopioksi ennen sivun sulkemista.");return false}
   if(requireLive){
    const type=$("partType")?.value||active.type;
    if(type!==storedProject.type){warn("Muokattu osatyyppi ei vielä vastaa paikalliseen tallennettua projektia.");return false}
    const live=liveValues(type),mismatch=Object.entries(live).find(([k,v])=>!Object.prototype.hasOwnProperty.call(storedProject.values||{},k)||!same(v,storedProject.values[k]));
    if(mismatch){warn(`Viimeisin muutos (${mismatch[0]}) ei vielä varmistunut paikalliseen tallennukseen. Älä sulje sivua ennen kuin tallennus onnistuu.`);return false}
   }
   lastIssue="";clearOwnWarning();return true
  }catch(e){warn("Paikallisen projektitallennuksen varmennus epäonnistui: "+(e?.message||String(e)));return false}
  finally{checking=false}
 }
 function scheduleLiveVerify(){clearTimeout(editTimer);editTimer=setTimeout(()=>verify(true),650)}
 function init(){
  const box=$("planSyncStatus");if(!box)return;
  new MutationObserver(()=>{if(checking)return;const ok=box.classList.contains("ok")||/^\s*✓/.test(box.textContent||"");if(ok)setTimeout(()=>verify(false),0)}).observe(box,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("input",e=>{if(e.target?.closest?.(".controls")&&e.target.matches?.("input,select,textarea"))scheduleLiveVerify()},true);
  document.addEventListener("change",e=>{if(e.target?.closest?.(".controls")&&e.target.matches?.("input,select,textarea"))scheduleLiveVerify()},true);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(()=>verify(true),0)});
  setTimeout(()=>verify(false),300)
 }
 window.AI3DStorageCommitGuard={verify,get lastIssue(){return lastIssue}};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
