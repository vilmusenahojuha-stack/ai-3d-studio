"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const fn=x=>typeof x==="function";
 const EAR_FALLBACK="https://unpkg.com/earcut@2.2.4/dist/earcut.min.js";
 const CAD_FALLBACKS=[
  ["cadV2Core",()=>!cadV2CoreReady(),"cad_plan_v2.js?v=1.5"],
  ["cadV2",()=>!cadV2EditorReady(),"cad_v2_editor.js?v=1.5"],
  ["cadApplyGuard",()=>!cadApplyGuardReady(),"cad_apply_guard.js?v=1.4"],
  ["planPreflight",()=>!(fn(window.AI3DPlanPreflight?.validate)&&fn(window.AI3DPlanPreflight?.run)&&fn(window.AI3DPlanPreflight?.getLastResult)),"plan_preflight.js?v=1.13"],
  ["planOperations",()=>!(fn(window.AI3DPlanOperationGuard?.validate)&&fn(window.AI3DPlanOperationGuard?.run)&&fn(window.AI3DPlanOperationGuard?.getLastResult)&&fn(window.AI3DPlanOperationGuard?.isAllowed)),"plan_operation_guard.js?v=1.11"],
  ["parametric",()=>!parametricReady(),"parametric_parts.js?v=1.9"],
  ["customPlate",()=>!customPlateReady(),"plate_custom.js?v=1.8"],
  ["projectTools",()=>!projectToolsReady(),"project_tools.js?v=1.14"],
  ["projectOpenGuard",()=>!projectOpenGuardReady(),"project_open_guard.js?v=1.4"],
  ["storageRecovery",()=>!storageRecoveryReady(),"storage_recovery.js?v=1.12"],
  ["storageCommitGuard",()=>!storageCommitGuardReady(),"storage_commit_guard.js?v=1.9"],
  ["previewGuard",()=>!previewGuardReady(),"preview_guard.js?v=1.7"],
  ["guidedUI",()=>!guidedUIReady(),"ui_simplify.js?v=1.4"],
  ["measureFocus",()=>!measureFocusReady(),"measure_focus_guard.js?v=1.0"],
  ["meshIntegrity",()=>!meshIntegrityReady(),"mesh_integrity_guard.js?v=1.6"],
  ["centauri",()=>!centauriReady(),"centauri.js?v=1.9"],
  ["centauriState",()=>!centauriStateReady(),"centauri_state_guard.js?v=1.7"],
  ["centauriOrientation",()=>!centauriOrientationReady(),"centauri_orientation.js?v=1.7"],
  ["printability",()=>!printabilityReady(),"printability_summary.js?v=1.3"],
  ["fitCalibration",()=>!fitCalibrationReady(),"fit_calibration.js?v=1.1"]
 ];
 let earcutFallbackState="idle",earcutFallbackAttempts=0,cadFallbackAttempts={cadV2Core:0,cadV2:0,cadApplyGuard:0,planPreflight:0,planOperations:0,parametric:0,customPlate:0,projectTools:0,projectOpenGuard:0,storageRecovery:0,storageCommitGuard:0,previewGuard:0,guidedUI:0,measureFocus:0,meshIntegrity:0,centauri:0,centauriState:0,centauriOrientation:0,printability:0,fitCalibration:0};
 const cadV2CoreReady=()=>fn(window.AI3DPlanV2CAD?.apply);
 const cadV2EditorReady=()=>fn(window.AI3DV2Editor?.apply);
 const cadV2Ready=()=>cadV2CoreReady()&&cadV2EditorReady();
 const cadApplyGuardReady=()=>fn(window.AI3DCADApplyGuard?.check)&&fn(window.AI3DCADApplyGuard?.wrapV2)&&fn(window.AI3DCADApplyGuard?.validatePlanHoleBounds)&&window.AI3D?.__applyGuard===true;
 const parametricReady=()=>fn(window.AI3DParametric?.generate)&&!!$("fields-adapter")&&!!$("fields-enclosure")&&!!$("partType")?.querySelector?.('option[value="adapter"]')&&!!$("partType")?.querySelector?.('option[value="enclosure"]');
 const customPlateReady=()=>window.AI3DPlateCustom?.ready===true&&!!$("plateCustomHoles")&&!!$("plateHolePattern")?.querySelector?.('option[value="custom"]');
 const projectToolsReady=()=>!!$("btnDuplicateProject")&&!!$("btnExportAllProjects")&&!!$("btnImportAllProjects")&&!!$("btnRestoreProjects");
 const projectOpenGuardReady=()=>fn(window.AI3DProjectOpenGuard?.check)&&fn(window.AI3DProjectOpenGuard?.resetValues)&&fn(window.AI3DProjectOpenGuard?.install)&&window.AI3D?.setPart?.__ai3dProjectDefaults===true;
 const storageRecoveryReady=()=>window.AI3DStorageRecovery?.checked===true&&!window.AI3DStorageRecovery?.error;
 const storageCommitGuardReady=()=>fn(window.AI3DStorageCommitGuard?.verify);
 const previewGuardReady=()=>fn(window.AI3DPreviewGuard?.clear)&&fn(window.AI3DPreviewGuard?.check)&&fn(window.AI3DPreviewGuard?.failureReason);
 const guidedUIReady=()=>fn(window.AI3DGuidedUI?.refreshValidation)&&!!$("workflowSteps")&&!!$("validationSummary")&&!!$("secondaryActions");
 const measureFocusReady=()=>fn(window.AI3DMeasureFocus?.highlight)&&fn(window.AI3DMeasureFocus?.clear);
 const meshIntegrityReady=()=>fn(window.AI3DMeshIntegrity?.check)&&fn(window.AI3DMeshIntegrity?.checkFit)&&fn(window.AI3DMeshIntegrity?.inspect);
 const centauriReady=()=>fn(window.CentauriProfile?.check)&&fn(window.CentauriProfile?.bounds)&&fn(window.CentauriProfile?.printability);
 const centauriStateReady=()=>fn(window.AI3DCentauriStateGuard?.refresh)&&fn(window.AI3DCentauriStateGuard?.isDirty);
 const centauriOrientationReady=()=>fn(window.CentauriOrientation?.analyse)&&fn(window.CentauriOrientation?.render)&&fn(window.CentauriOrientation?.stability);
 const printabilityReady=()=>fn(window.AI3DPrintability?.render)&&fn(window.AI3DPrintability?.componentInfo);
 const fitCalibrationReady=()=>fn(window.AI3DFitCalibration?.render)&&fn(window.AI3DFitCalibration?.getCorrection)&&fn(window.AI3DFitCalibration?.getSuggestionFor);
 const checks=[
  ["CAD-moottori",()=>fn(window.AI3D?.setPart)],
  ["CAD v2 -ydin",cadV2CoreReady],
  ["CAD v2 -editori",cadV2EditorReady],
  ["CAD-sovellussuoja",cadApplyGuardReady],
  ["projektit",()=>fn(window.AI3DProjects?.active)],
  ["projektityökalut",projectToolsReady],
  ["projektin avaussuoja",projectOpenGuardReady],
  ["projektitallennuksen palautus",storageRecoveryReady],
  ["ChatGPT-ennakkotarkistus",()=>fn(window.AI3DPlanPreflight?.validate)&&fn(window.AI3DPlanPreflight?.run)&&fn(window.AI3DPlanPreflight?.getLastResult)],
  ["ChatGPT-operaatiotarkistus",()=>fn(window.AI3DPlanOperationGuard?.validate)&&fn(window.AI3DPlanOperationGuard?.run)&&fn(window.AI3DPlanOperationGuard?.getLastResult)&&fn(window.AI3DPlanOperationGuard?.isAllowed)],
  ["parametriset CAD-osat",parametricReady],
  ["mukautetut levyreiät",customPlateReady],
  ["projektitallennuksen varmennus",storageCommitGuardReady],
  ["3D-esikatselun suojaus",previewGuardReady],
  ["mesh-eheystarkistus",meshIntegrityReady],
  ["ohjattu käyttöliittymä",guidedUIReady],
  ["mittakentän ohjaus",measureFocusReady],
  ["Centauri-profiili",centauriReady],
  ["Centauri-tilavahti",centauriStateReady],
  ["tulostusasennon arvio",centauriOrientationReady],
  ["tulostettavuusarvio",printabilityReady],
  ["sovituskalibrointi",fitCalibrationReady],
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
 function resetMissingCadRetries(){for(const [key,needed] of CAD_FALLBACKS){let missing=false;try{missing=needed()}catch{missing=true}if(missing)cadFallbackAttempts[key]=0}}
 function recoverCentauriState(){try{window.AI3DCentauriStateGuard?.installSafeCheck?.();window.AI3DCentauriStateGuard?.refresh?.(true)}catch{}}
 function refreshCentauriPanels(key){try{if(key==="printability")window.AI3DPrintability?.render?.();if(key==="fitCalibration")window.AI3DFitCalibration?.render?.()}catch{}}
 function loadCadFallbacks(){let started=false;for(const [key,needed,src] of CAD_FALLBACKS){let missing=false;try{missing=needed()}catch{missing=true}if(!missing||cadFallbackAttempts[key]>=1)continue;cadFallbackAttempts[key]++;started=true;const s=document.createElement("script");s.src=src+"&healthRetry="+Date.now();s.async=true;s.dataset.ai3dCadFallback=key;if(key==="centauri")s.dataset.ai3dCentauri="1";s.onload=()=>{if(key==="centauri"||key==="centauriState")recoverCentauriState();refreshCentauriPanels(key);start()};s.onerror=()=>start();document.body.appendChild(s)}return started}
 function box(){let e=$("runtimeHealthWarning");if(e)return e;const anchor=$("projectPrintInfo")||$("projectDescription")||document.querySelector(".project-summary");if(!anchor)return null;e=document.createElement("div");e.id="runtimeHealthWarning";e.className="plan-sync-status warn";e.hidden=true;anchor.after(e);return e}
 function missing(){const out=[];for(const [name,test] of checks){try{if(!test())out.push(name)}catch{out.push(name)}}return out}
 function render(final=false){const e=box();if(!e)return false;const miss=missing();if(!miss.length){e.hidden=true;e.textContent="";last="";return true}if(!final)return false;const text="⚠ Sovelluksen osa jäi latautumatta tai on vanhentunut: "+miss.join(", ")+". Päivitä sivu. Jos ongelma jatkuu, tarkista verkkoyhteys ennen mallin vientiä.";if(text!==last){e.textContent=text;last=text}e.hidden=false;return false}
 function start(){clearTimeout(timer);attempts=0;if(!fn(window.earcut))loadEarcutFallback();const tick=()=>{attempts++;if(render(false))return;if(attempts>=20){if(loadCadFallbacks())return;render(true);return}timer=setTimeout(tick,250)};timer=setTimeout(tick,150)}
 function init(){start();document.addEventListener("visibilitychange",()=>{if(!document.hidden)start()});window.addEventListener("online",()=>{if(!fn(window.earcut)&&earcutFallbackState==="failed")earcutFallbackState="idle";resetMissingCadRetries();start()})}
 window.AI3DRuntimeHealth={check:()=>render(true),missing,retryDependencies:()=>{if(!fn(window.earcut)&&earcutFallbackState!=="loading")earcutFallbackState="idle";resetMissingCadRetries();loadEarcutFallback();loadCadFallbacks();start()},dependencyState:()=>({earcut:fn(window.earcut)?"ready":earcutFallbackState,earcutFallbackAttempts,cadV2:cadV2Ready()?"ready":"missing",cadV2Core:cadV2CoreReady()?"ready":"missing",cadV2Editor:cadV2EditorReady()?"ready":"missing",cadApplyGuard:cadApplyGuardReady()?"ready":"missing",planPreflight:fn(window.AI3DPlanPreflight?.validate)&&fn(window.AI3DPlanPreflight?.run)&&fn(window.AI3DPlanPreflight?.getLastResult)?"ready":"missing",planOperations:fn(window.AI3DPlanOperationGuard?.validate)&&fn(window.AI3DPlanOperationGuard?.run)&&fn(window.AI3DPlanOperationGuard?.getLastResult)&&fn(window.AI3DPlanOperationGuard?.isAllowed)?"ready":"missing",parametric:parametricReady()?"ready":"missing",customPlate:customPlateReady()?"ready":"missing",previewGuard:previewGuardReady()?"ready":"missing",guidedUI:guidedUIReady()?"ready":"missing",measureFocus:measureFocusReady()?"ready":"missing",meshIntegrity:meshIntegrityReady()?"ready":"missing",projectTools:projectToolsReady()?"ready":"missing",projectOpenGuard:projectOpenGuardReady()?"ready":"missing",storageRecovery:storageRecoveryReady()?"ready":"missing",storageCommitGuard:storageCommitGuardReady()?"ready":"missing",centauriProfile:centauriReady()?"ready":"missing",centauriState:centauriStateReady()?"ready":"missing",centauriOrientation:centauriOrientationReady()?"ready":"missing",printability:printabilityReady()?"ready":"missing",fitCalibration:fitCalibrationReady()?"ready":"missing",cadFallbackAttempts:{...cadFallbackAttempts}})};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
