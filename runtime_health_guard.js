"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const fn=x=>typeof x==="function";
 const EAR_FALLBACK="https://unpkg.com/earcut@2.2.4/dist/earcut.min.js";
 let earcutFallbackState="idle",earcutFallbackAttempts=0;
 const parametricReady=()=>fn(window.AI3DParametric?.generate)&&!!$("fields-adapter")&&!!$("fields-enclosure")&&!!$("partType")?.querySelector?.('option[value="adapter"]')&&!!$("partType")?.querySelector?.('option[value="enclosure"]');
 const customPlateReady=()=>!!$("plateCustomHoles")&&!!$("plateHolePattern")?.querySelector?.('option[value="custom"]');
 const checks=[
  ["CAD-moottori",()=>fn(window.AI3D?.setPart)],
  ["projektit",()=>fn(window.AI3DProjects?.active)],
  ["ChatGPT-ennakkotarkistus",()=>fn(window.AI3DPlanPreflight?.validate)&&fn(window.AI3DPlanPreflight?.run)&&fn(window.AI3DPlanPreflight?.getLastResult)],
  ["ChatGPT-operaatiotarkistus",()=>fn(window.AI3DPlanOperationGuard?.validate)&&fn(window.AI3DPlanOperationGuard?.run)&&fn(window.AI3DPlanOperationGuard?.getLastResult)&&fn(window.AI3DPlanOperationGuard?.isAllowed)],
  ["parametriset CAD-osat",parametricReady],
  ["mukautetut levyreiät",customPlateReady],
  ["projektitallennuksen varmennus",()=>fn(window.AI3DStorageCommitGuard?.verify)],
  ["3D-esikatselun suojaus",()=>fn(window.AI3DPreviewGuard?.clear)],
  ["mesh-eheystarkistus",()=>fn(window.AI3DMeshIntegrity?.check)],
  ["ohjattu käyttöliittymä",()=>fn(window.AI3DGuidedUI?.refreshValidation)],
  ["mittakentän ohjaus",()=>fn(window.AI3DMeasureFocus?.highlight)],
  ["Centauri-profiili",()=>fn(window.CentauriProfile?.check)&&fn(window.CentauriProfile?.bounds)&&fn(window.CentauriProfile?.printability)],
  ["tulostusasennon arvio",()=>fn(window.CentauriOrientation?.analyse)],
  ["tulostettavuusarvio",()=>fn(window.AI3DPrintability?.render)],
  ["sovituskalibrointi",()=>fn(window.AI3DFitCalibration?.getSuggestionFor)],
  ["Earcut-geometriakirjasto",()=>fn(window.earcut)]
 ];
 let timer=0,attempts=0,last="";
 function loadEarcutFallback(){
  if(fn(window.earcut)){earcutFallbackState="ready";return true}
  if(earcutFallbackState==="loading"||earcutFallbackAttempts>=2)return false;
  earcutFallbackAttempts++;earcutFallbackState="loading";
  const s=document.createElement("script");s.src=EAR_FALLBACK;s.async=true;s.dataset.ai3dEarcutFallback="1";
  s.onload=()=>{earcutFallbackState=fn(window.earcut)?"ready":"failed";start()};
  s.onerror=()=>{earcutFallbackState="failed";start()};
  document.head.appendChild(s);return true
 }
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
  const text="⚠ Sovelluksen osa jäi latautumatta tai on vanhentunut: "+miss.join(", ")+". Päivitä sivu. Jos ongelma jatkuu, tarkista verkkoyhteys ennen mallin vientiä.";
  if(text!==last){e.textContent=text;last=text}e.hidden=false;return false
 }
 function start(){
  clearTimeout(timer);attempts=0;
  if(!fn(window.earcut))loadEarcutFallback();
  const tick=()=>{attempts++;if(render(false))return;if(attempts>=20){render(true);return}timer=setTimeout(tick,250)};timer=setTimeout(tick,150)
 }
 function init(){start();document.addEventListener("visibilitychange",()=>{if(!document.hidden)start()});window.addEventListener("online",()=>{if(!fn(window.earcut)&&earcutFallbackState==="failed")earcutFallbackState="idle";start()})}
 window.AI3DRuntimeHealth={check:()=>render(true),missing,retryDependencies:()=>{if(!fn(window.earcut)&&earcutFallbackState!=="loading")earcutFallbackState="idle";loadEarcutFallback();start()},dependencyState:()=>({earcut:fn(window.earcut)?"ready":earcutFallbackState,earcutFallbackAttempts,parametric:parametricReady()?"ready":"missing",customPlate:customPlateReady()?"ready":"missing"})};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
