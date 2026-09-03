"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 let timer=0;
 function refresh(){clearTimeout(timer);timer=setTimeout(()=>window.CentauriProfile?.check?.(),0)}
 function init(){
  const download=$("btnDownload"),controls=document.querySelector(".controls");
  if(download)new MutationObserver(refresh).observe(download,{attributes:true,attributeFilter:["disabled"]});
  controls?.addEventListener("input",refresh,true);
  controls?.addEventListener("change",refresh,true);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh()});
  refresh()
 }
 window.AI3DCentauriStateGuard={refresh};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();