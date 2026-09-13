"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const NON_GEOMETRY=new Set(["material","filamentPriceKg","ledCost","powerCost","miscCost"]);
 const NAV_SELECTOR='[data-id],[data-plan],#btnNewProject,#btnImportProject,#btnReloadPlans';
 let pending=false,retryTimer=0,verifyTimer=0;
 function geometryTarget(target){return!!target&&!NON_GEOMETRY.has(target.id)&&!!(target.id==="partType"||target.closest?.(".part-fields"))&&!!target.matches?.("input,select,textarea")}
 function validationOk(){const root=$("validation");return!!root?.querySelector?.(".check.ok")&&!root.querySelector?.(".check.fail")}
 function setWarning(){const box=$("planSyncStatus");if(!box)return;box.textContent="⚠ Muokattu CAD-malli odottaa onnistunutta uudelleenluontia ja projektitallennusta ennen projektin vaihtamista.";box.className="plan-sync-status warn"}
 function markPending(e){if(!geometryTarget(e?.target))return;pending=true;clearTimeout(retryTimer);clearTimeout(verifyTimer)}
 function verifySaved(){if(!pending)return true;const guard=window.AI3DStorageCommitGuard;if(typeof guard?.verify!=="function")return false;const ok=guard.verify(true)===true;if(ok)pending=false;return ok}
 function requestAutosave(){
  if(!pending||!validationOk())return false;
  const material=$("material");
  if(!material?.dispatchEvent)return false;
  material.dispatchEvent(new Event("input",{bubbles:true}));
  clearTimeout(verifyTimer);
  verifyTimer=setTimeout(()=>{if(!verifySaved())setWarning()},400);
  return true
 }
 function validationChanged(){if(!pending||!validationOk())return;clearTimeout(retryTimer);retryTimer=setTimeout(requestAutosave,0)}
 function blockNavigation(e){
  if(!pending)return;
  const target=e?.target?.closest?.(NAV_SELECTOR);if(!target)return;
  if(verifySaved())return;
  e.preventDefault?.();e.stopImmediatePropagation?.();setWarning()
 }
 function init(){
  document.addEventListener("input",markPending,true);
  document.addEventListener("change",markPending,true);
  document.addEventListener("click",blockNavigation,true);
  const validation=$("validation");
  if(validation)new MutationObserver(validationChanged).observe(validation,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]})
 }
 window.AI3DValidatedAutosaveGuard={retry:requestAutosave,verify:verifySaved,get pending(){return pending}};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
