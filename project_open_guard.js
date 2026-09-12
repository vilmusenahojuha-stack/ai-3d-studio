"use strict";
(()=>{
 const KEY="ai3d:projects:v3",$=id=>document.getElementById(id),CROSS_TAB_WARNING="Projektitallennus muuttui toisessa välilehdessä tai ikkunassa. Päivitä tämä sivu ennen jatkamista, jotta uudempi projektiversio ei ylikirjoitu.",INVALID_STORAGE_WARNING="Projektitallennus ei läpäissyt rakennetarkistusta. Projektia ei avattu, jotta vioittunutta tai uudempaa dataa ei käsitellä vahingossa.",MISSING_PROJECT_WARNING="Projektia ei enää löydy nykyisestä projektitallennuksesta. Päivitä sivu ennen jatkamista, jotta vanhentunutta projektiversiota ei avata vahingossa.";
 const ALLOWED=new Set(["lightSign","spike","plug","sleeve","plate","adapter","enclosure"]),BLOCKED=new Set(["__proto__","prototype","constructor"]),PRINT_KEYS=new Set(["printer","nozzle","layer","walls","infill","notes"]),MAX_PROJECT_NAME=120,MAX_PROJECT_DESCRIPTION=1000;
 const FIELD_IDS={
  lightSign:["signDiameter","signRingWidth","signDepth","signWall","diffuserThickness","starWidth","starThickness","ledWidth","filamentPriceKg","ledCost","powerCost","miscCost","material"],
  spike:["nutAf","clearance","lockAmount","lockZ","wall","baseHeight","totalHeight","tipRadius","monogram","monogramWidth","monogramDepth","monogramHeight","material"],
  plug:["tubeW","tubeH","tubeWall","plugClear","insertDepth","capThickness","capOverhang","material"],
  sleeve:["sleeveID","sleeveWall","sleeveLength","material"],
  plate:["plateL","plateW","plateT","plateHolePattern","plateHoleD","plateHoleEdge","plateCornerStyle","plateCornerSize","plateCustomHoles","material"],
  adapter:["adapterLength","adapterID1","adapterID2","adapterOD1","adapterOD2","material"],
  enclosure:["enclosureW","enclosureD","enclosureH","enclosureWall","enclosureFloor","material"]
 };
 function validValues(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;const e=Object.entries(v);if(e.length>100)return false;return e.every(([k,x])=>k.length<=160&&!BLOCKED.has(k)&&(x===null||["string","number","boolean"].includes(typeof x))&&(typeof x!=="number"||Number.isFinite(x))&&(typeof x!=="string"||x.length<=50000))}
 function validPrint(pr){if(pr==null)return true;if(typeof pr!=="object"||Array.isArray(pr))return false;const entries=Object.entries(pr);if(entries.length>PRINT_KEYS.size)return false;return entries.every(([k,v])=>PRINT_KEYS.has(k)&&["string","number"].includes(typeof v)&&(typeof v!=="number"||Number.isFinite(v))&&String(v).length<=(k==="notes"?1000:160))}
 function validProject(p){return!!(p&&typeof p==="object"&&!Array.isArray(p)&&typeof p.id==="string"&&p.id.trim()&&p.id.length<=160&&ALLOWED.has(p.type)&&validValues(p.values)&&validPrint(p.print)&&(p.name==null||(typeof p.name==="string"&&p.name.length<=MAX_PROJECT_NAME))&&(p.description==null||(typeof p.description==="string"&&p.description.length<=MAX_PROJECT_DESCRIPTION))&&(p.sourcePlan==null||(typeof p.sourcePlan==="string"&&p.sourcePlan.length<=160))&&(p.sourceSchema==null||p.sourceSchema===1||p.sourceSchema===2)&&(p.created==null||(typeof p.created==="number"&&Number.isFinite(p.created)))&&(p.updated==null||(typeof p.updated==="number"&&Number.isFinite(p.updated))))}
 function defaultOption(e){const options=Array.from(e?.options||[]);return options.find(o=>o.defaultSelected)||options[0]||null}
 function resetControl(id){const e=$(id);if(!e)return;if(e.tagName==="SELECT"||e.options){const option=defaultOption(e);if(option)e.value=option.value;return}if("defaultValue"in e)e.value=e.defaultValue}
 function resetValues(type){for(const id of FIELD_IDS[type]||[])resetControl(id)}
 function install(){
  const api=window.AI3D,fn=api?.setPart;if(typeof fn!=="function")return false;if(fn.__ai3dProjectDefaults===true)return true;
  const raw=fn.bind(api);function deterministicSetPart(type,values={}){if(ALLOWED.has(type))resetValues(type);return raw(type,values)}
  deterministicSetPart.__ai3dProjectDefaults=true;api.setPart=deterministicSetPart;return true
 }
 function read(){try{const raw=localStorage.getItem(KEY),a=JSON.parse(raw===null?"[]":raw);if(!Array.isArray(a)||!a.every(validProject))return null;const ids=new Set();for(const p of a){if(ids.has(p.id))return null;ids.add(p.id)}return a}catch{return null}}
 function failed(){const v=$("validation"),s=$("status")?.textContent||"";return!!v?.querySelector(".check.fail")||/^\s*Virhe\s*:/i.test(s)||/generointi epäonnistui|STL-lataus estetty/i.test(s)}
 function apply(p){if(!validProject(p))throw Error("Projektidata ei läpäissyt rakennetarkistusta.");if(!install())throw Error("CAD-moottori ei ole vielä valmis.");window.AI3D.setPart(p.type,p.values||{});if(failed())throw Error($("status")?.textContent||"CAD-malli ei läpäissyt tarkistusta.")}
 function message(text){const e=$("planSyncStatus");if(e){e.textContent=text;e.className="plan-sync-status warn"}}
 function conflictReason(){const g=window.AI3DStorageCommitGuard;return g?.hasConflict?(g.lastIssue||CROSS_TAB_WARNING):""}
 function guard(e){const b=e.target?.closest?.("#projectList [data-id]");if(!b)return;const conflict=conflictReason();if(conflict){e.preventDefault();e.stopImmediatePropagation();message("⚠ "+conflict);return}const items=read();if(items===null){e.preventDefault();e.stopImmediatePropagation();message("⚠ "+INVALID_STORAGE_WARNING);return}const target=items.find(p=>p.id===b.dataset.id);if(!target){e.preventDefault();e.stopImmediatePropagation();message("⚠ "+MISSING_PROJECT_WARNING);return}/* Varsinainen projects.js openProject() tekee CAD-tarkistuksen, palautuksen ja tallennuksen. Älä generoi samaa mallia capture-vaiheessa kahdesti. */}
 install();document.addEventListener("click",guard,true);
 window.AI3DProjectOpenGuard={check:apply,resetValues,install};
})();
