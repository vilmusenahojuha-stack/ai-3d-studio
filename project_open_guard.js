"use strict";
(()=>{
 const KEY="ai3d:projects:v3",ACTIVE=KEY+":active",$=id=>document.getElementById(id),CROSS_TAB_WARNING="Projektitallennus muuttui toisessa välilehdessä tai ikkunassa. Päivitä tämä sivu ennen jatkamista, jotta uudempi projektiversio ei ylikirjoitu.";
 const ALLOWED=new Set(["lightSign","spike","plug","sleeve","plate","adapter","enclosure"]),BLOCKED=new Set(["__proto__","prototype","constructor"]),MAX_PROJECT_NAME=120,MAX_PROJECT_DESCRIPTION=1000;
 function validValues(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;const e=Object.entries(v);if(e.length>100)return false;return e.every(([k,x])=>k.length<=160&&!BLOCKED.has(k)&&(x===null||["string","number","boolean"].includes(typeof x))&&(typeof x!=="number"||Number.isFinite(x))&&(typeof x!=="string"||x.length<=50000))}
 function validProject(p){return!!(p&&typeof p==="object"&&!Array.isArray(p)&&typeof p.id==="string"&&p.id.trim()&&p.id.length<=160&&ALLOWED.has(p.type)&&validValues(p.values)&&(p.name==null||(typeof p.name==="string"&&p.name.length<=MAX_PROJECT_NAME))&&(p.description==null||(typeof p.description==="string"&&p.description.length<=MAX_PROJECT_DESCRIPTION)))}
 function read(){try{const a=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(a)||!a.every(validProject))return[];const ids=new Set();for(const p of a){if(ids.has(p.id))return[];ids.add(p.id)}return a}catch{return[]}}
 function failed(){const v=$("validation"),s=$("status")?.textContent||"";return!!v?.querySelector(".check.fail")||/^\s*Virhe\s*:/i.test(s)||/generointi epäonnistui|STL-lataus estetty/i.test(s)}
 function apply(p){if(!validProject(p))throw Error("Projektidata ei läpäissyt rakennetarkistusta.");if(typeof window.AI3D?.setPart!=="function")throw Error("CAD-moottori ei ole vielä valmis.");window.AI3D.setPart(p.type,p.values||{});if(failed())throw Error($("status")?.textContent||"CAD-malli ei läpäissyt tarkistusta.")}
 function restore(p){if(!p)return;try{window.AI3D?.setPart?.(p.type,p.values||{})}catch{}}
 function message(text){const e=$("planSyncStatus");if(e){e.textContent=text;e.className="plan-sync-status warn"}}
 function conflictReason(){const g=window.AI3DStorageCommitGuard;return g?.hasConflict?(g.lastIssue||CROSS_TAB_WARNING):""}
 function guard(e){const b=e.target?.closest?.("#projectList [data-id]");if(!b)return;const conflict=conflictReason();if(conflict){e.preventDefault();e.stopImmediatePropagation();message("⚠ "+conflict);return}const items=read(),target=items.find(p=>p.id===b.dataset.id);if(!target)return;const previous=items.find(p=>p.id===(localStorage.getItem(ACTIVE)||""));try{apply(target)}catch(err){e.preventDefault();e.stopImmediatePropagation();restore(previous);message("⚠ Projektia ei avattu: "+(err?.message||err));setTimeout(()=>window.CentauriProfile?.check?.(),0)}}
 document.addEventListener("click",guard,true);
 window.AI3DProjectOpenGuard={check:apply};
})();
