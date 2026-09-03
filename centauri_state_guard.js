"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 let timer=0,dirty=false;
 function refresh(){clearTimeout(timer);timer=setTimeout(()=>{window.CentauriProfile?.check?.();dirty=false},0)}
 function geometryInput(target){return!!(target?.closest?.(".part-fields")||target?.id==="partType")}
 function markGeometryDirty(){
  dirty=true;
  const root=$("centauriStatus"),button=$("btnCentauriStl");
  if(button)button.disabled=true;
  if(root){root.className="printer-status";root.innerHTML='<b>Mitat muuttuivat – tarkista malli uudelleen.</b><span>Centauri-yhteensopivuus lasketaan uudesta meshistä vasta TARKISTA MALLI -toiminnon jälkeen.</span>'}
 }
 function onControlEvent(e){if(geometryInput(e.target))markGeometryDirty();else refresh()}
 function init(){
  const download=$("btnDownload"),controls=document.querySelector(".controls");
  if(download)new MutationObserver(()=>{if(!download.disabled||!dirty)refresh()}).observe(download,{attributes:true,attributeFilter:["disabled"]});
  controls?.addEventListener("input",onControlEvent,true);
  controls?.addEventListener("change",onControlEvent,true);
  $("btnGenerate")?.addEventListener("click",()=>setTimeout(refresh,80));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){if(dirty)markGeometryDirty();else refresh()}});
  refresh()
 }
 window.AI3DCentauriStateGuard={refresh,markDirty:markGeometryDirty,isDirty:()=>dirty};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
