"use strict";
(()=>{
 const KEY="ai3d:projects:v3",ACTIVE=KEY+":active",$=id=>document.getElementById(id);
 const ALLOWED=new Set(["lightSign","spike","plug","sleeve","plate","adapter","enclosure"]),BLOCKED=new Set(["__proto__","prototype","constructor"]);
 function validValues(v){if(!v||typeof v!=="object"||Array.isArray(v))return false;const e=Object.entries(v);if(e.length>100)return false;return e.every(([k,x])=>!BLOCKED.has(k)&&(x===null||["string","number","boolean"].includes(typeof x))&&(typeof x!=="number"||Number.isFinite(x)))}
 function validProject(p){return!!(p&&typeof p==="object"&&!Array.isArray(p)&&typeof p.id==="string"&&p.id&&ALLOWED.has(p.type)&&validValues(p.values))}
 function read(){try{const a=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(a)&&a.every(validProject)?a:[]}catch{return[]}}
 function failed(){const v=$("validation"),s=$("status")?.textContent||"";return!!v?.querySelector(".check.fail")||/^\s*Virhe\s*:/i.test(s)||/generointi epäonnistui|STL-lataus estetty/i.test(s)}
 function apply(p){if(!validProject(p))throw Error("Projektidata ei läpäissyt rakennetarkistusta.");if(typeof window.AI3D?.setPart!=="function")throw Error("CAD-moottori ei ole vielä valmis.");window.AI3D.setPart(p.type,p.values||{});if(failed())throw Error($("status")?.textContent||"CAD-malli ei läpäissyt tarkistusta.")}
 function restore(p){if(!p)return;try{window.AI3D?.setPart?.(p.type,p.values||{})}catch{}}
 function message(text){const e=$("planSyncStatus");if(e){e.textContent=text;e.className="plan-sync-status warn"}}
 function guard(e){const b=e.target?.closest?.("#projectList [data-id]");if(!b)return;const items=read(),target=items.find(p=>p.id===b.dataset.id);if(!target)return;const previous=items.find(p=>p.id===(localStorage.getItem(ACTIVE)||""));try{apply(target)}catch(err){e.preventDefault();e.stopImmediatePropagation();restore(previous);message("⚠ Projektia ei avattu: "+(err?.message||err));setTimeout(()=>window.CentauriProfile?.check?.(),0)}}
 document.addEventListener("click",guard,true);
 window.AI3DProjectOpenGuard={check:apply};
})();
