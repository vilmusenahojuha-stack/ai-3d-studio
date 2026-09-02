"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 let clearing=false,lastError="";
 function clearPreview(reason=""){
  if(clearing)return;
  clearing=true;
  try{currentMesh=null}catch{}
  try{currentFitMesh=null}catch{}
  const download=$("btnDownload"),fit=$("btnFitTest"),dims=$("dimensions"),overlay=$("measureOverlay");
  if(download)download.disabled=true;
  if(fit)fit.disabled=true;
  if(dims)dims.textContent="–";
  if(overlay){overlay.innerHTML="";overlay.hidden=true}
  try{draw()}catch{
   const canvas=$("preview");
   const ctx=canvas?.getContext?.("2d");
   if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height)
  }
  setTimeout(()=>window.CentauriProfile?.check?.(),0);
  setTimeout(()=>window.CentauriOrientation?.render&&$("orientationResult")?window.CentauriOrientation.render():null,0);
  lastError=reason||lastError;
  clearing=false
 }
 function inspect(){
  const status=$("status")?.textContent?.trim()||"";
  if(status.startsWith("Virhe:")){
   if(status!==lastError)clearPreview(status);
   else if(!clearing){
    try{if(currentMesh||currentFitMesh)clearPreview(status)}catch{}
   }
  }
 }
 function init(){
  const status=$("status");
  if(!status)return;
  const obs=new MutationObserver(inspect);
  obs.observe(status,{childList:true,subtree:true,characterData:true});
  inspect()
 }
 window.AI3DPreviewGuard={clear:clearPreview,check:inspect};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
