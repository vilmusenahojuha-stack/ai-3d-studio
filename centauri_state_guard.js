"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const nonGeometryIds=new Set(["material","filamentPriceKg","ledCost","powerCost","miscCost"]);
 let timer=0,dirty=false;
 function failCheck(){
  clearTimeout(timer);timer=0;dirty=true;
  const root=$("centauriStatus"),button=$("btnCentauriStl");
  if(button)button.disabled=true;
  if(root){root.className="printer-status fail";root.innerHTML='<b>Centauri-tarkistus epäonnistui.</b><span>Centauri-STL-vienti on estetty, kunnes malli tarkistetaan onnistuneesti uudelleen.</span>'}
 }
 function installSafeCheck(){
  const profile=window.CentauriProfile,check=profile?.check;
  if(typeof check!=="function")return false;
  if(check.__ai3dSafeCheck)return true;
  const raw=check.bind(profile);
  function safeCheck(){
   try{
    const result=raw(),button=$("btnCentauriStl");
    const accepted=!!button&&button.disabled===false;
    enforceDirtyExportLock();
    return accepted
   }catch{failCheck();return false}
  }
  safeCheck.__ai3dSafeCheck=true;
  profile.check=safeCheck;
  return true
 }
 function refresh(clearDirty=false){clearTimeout(timer);timer=setTimeout(()=>{timer=0;if(!installSafeCheck())return;const check=window.CentauriProfile?.check;if(typeof check!=="function")return;const ok=check.call(window.CentauriProfile);if(ok===true&&clearDirty){dirty=false;const button=$("btnCentauriStl");if(button)button.disabled=false}},0)}
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
  installSafeCheck();
  if(download)new MutationObserver(()=>{if(!download.disabled)refresh(true);else if(!dirty)refresh(false)}).observe(download,{attributes:true,attributeFilter:["disabled"]});
  if(centauriButton)new MutationObserver(enforceDirtyExportLock).observe(centauriButton,{attributes:true,attributeFilter:["disabled"]});
  controls?.addEventListener("input",onControlEvent,true);
  controls?.addEventListener("change",onControlEvent,true);
  $("btnGenerate")?.addEventListener("click",()=>setTimeout(()=>{if(!$("btnDownload")?.disabled)refresh(true);else if(dirty)markGeometryDirty();else refresh(false)},80));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){if(dirty)markGeometryDirty();else refresh(false)}});
  refresh(false)
 }
 window.AI3DCentauriStateGuard={refresh,markDirty:markGeometryDirty,isDirty:()=>dirty,enforceExportLock:enforceDirtyExportLock,installSafeCheck};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
