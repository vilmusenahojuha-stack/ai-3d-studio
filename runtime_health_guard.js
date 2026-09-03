"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const checks=[
  ["CAD-moottori",()=>typeof window.AI3D?.setPart==="function"],
  ["projektit",()=>!!window.AI3DProjects],
  ["ChatGPT-ennakkotarkistus",()=>!!window.AI3DPlanPreflight],
  ["ChatGPT-operaatiotarkistus",()=>!!window.AI3DPlanOperationGuard],
  ["projektitallennuksen varmennus",()=>!!window.AI3DStorageCommitGuard],
  ["3D-esikatselun suojaus",()=>!!window.AI3DPreviewGuard],
  ["Centauri-profiili",()=>!!window.CentauriProfile],
  ["tulostusasennon arvio",()=>!!window.CentauriOrientation],
  ["tulostettavuusarvio",()=>!!window.AI3DPrintability],
  ["sovituskalibrointi",()=>!!window.AI3DFitCalibration],
  ["Earcut-geometriakirjasto",()=>typeof window.earcut==="function"]
 ];
 let timer=0,attempts=0,last="";
 function box(){
  let e=$("runtimeHealthWarning");if(e)return e;
  const anchor=$("projectPrintInfo")||$("projectDescription")||document.querySelector(".project-summary");if(!anchor)return null;
  e=document.createElement("div");e.id="runtimeHealthWarning";e.className="plan-sync-status warn";e.hidden=true;anchor.after(e);return e
 }
 function missing(){const out=[];for(const [name,test] of checks){try{if(!test())out.push(name)}catch{out.push(name)}}return out}
 function render(final=false){
  const e=box();if(!e)return false;const miss=missing();
  if(!miss.length){e.hidden=true;e.textContent="";last="";return true}
  if(!final)return false;
  const text="⚠ Sovelluksen osa jäi latautumatta: "+miss.join(", ")+". Päivitä sivu. Jos ongelma jatkuu, tarkista verkkoyhteys ennen mallin vientiä.";
  if(text!==last){e.textContent=text;last=text}e.hidden=false;return false
 }
 function start(){clearTimeout(timer);attempts=0;const tick=()=>{attempts++;if(render(false))return;if(attempts>=20){render(true);return}timer=setTimeout(tick,250)};timer=setTimeout(tick,150)}
 function init(){start();document.addEventListener("visibilitychange",()=>{if(!document.hidden)start()});window.addEventListener("online",start)}
 window.AI3DRuntimeHealth={check:()=>render(true),missing};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
