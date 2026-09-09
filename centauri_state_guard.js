"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const nonGeometryIds=new Set(["material","filamentPriceKg","ledCost","powerCost","miscCost"]);
 let timer=0,dirty=false;
 function refresh(clearDirty=false){clearTimeout(timer);timer=setTimeout(()=>{timer=0;const check=window.CentauriProfile?.check;if(typeof check!=="function")return;try{check.call(window.CentauriProfile);if(clearDirty)dirty=false}catch{if(clearDirty)markGeometryDirty()}},0)}
 function geometryInput(target){return!!target&&!nonGeometryIds.has(target.id)&&!!(target.closest?.(".part-fields")||target.id==="partType")}
 function enforceDirtyExportLock(){const button=$("btnCentauriStl");if(dirty&&button&&!button.disabled)button.disabled=true}
 function markGeometryDirty(){
  clearTimeout(timer);timer=0;
  dirty=true;
  const root=$("centauriStatus"),button=$("btnCentauriStl");
  if(button)button.disabled=true;
  if(root){root.className="printer-status";root.innerHTML='<b>Mitat muuttuivat – tarkista malli uudelleen.</b><span>Centauri-yhteensopivuus lasketaan uudesta meshistä vasta TARKISTA MALLI -toiminnon jälkeen.</span>'}
 }
 function onControlEvent(e){if(geometryInput(e.target))markGeometryDirty();else if(dirty)markGeometryDirty();else refresh(false)}
 function init(){
  const download=$("btnDownload"),centauriButton=$("btnCentauriStl"),controls=document.querySelector(".controls");
  if(download)new MutationObserver(()=>{if(!download.disabled)refresh(true);else if(!dirty)refresh(false)}).observe(download,{attributes:true,attributeFilter:["disabled"]});
  if(centauriButton)new MutationObserver(enforceDirtyExportLock).observe(centauriButton,{attributes:true,attributeFilter:["disabled"]});
  controls?.addEventListener("input",onControlEvent,true);
  controls?.addEventListener("change",onControlEvent,true);
  $("btnGenerate")?.addEventListener("click",()=>setTimeout(()=>{if(!$("btnDownload")?.disabled)refresh(true);else if(dirty)markGeometryDirty();else refresh(false)},80));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){if(dirty)markGeometryDirty();else refresh(false)}});
  refresh(false)
 }
 window.AI3DCentauriStateGuard={refresh,markDirty:markGeometryDirty,isDirty:()=>dirty,enforceExportLock:enforceDirtyExportLock};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
