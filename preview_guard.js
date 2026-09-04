"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 let clearing=false,lastError="";
 function clearPreview(reason=""){
  if(clearing)return;
  clearing=true;
  try{currentMesh=null}catch{}
  try{currentFitMesh=null}catch{}
  const download=$("btnDownload"),fit=$("btnFitTest"),dims=$("dimensions"),overlay=$("measureOverlay"),validation=$("validation");
  if(download)download.disabled=true;
  if(fit)fit.disabled=true;
  if(dims)dims.textContent="–";
  if(overlay){overlay.innerHTML="";overlay.hidden=true}
  if(validation&&reason&&!validation.querySelector?.(".check.fail")){
   validation.innerHTML="";
   const box=document.createElement("div"),title=document.createElement("strong");
   box.className="check fail";title.textContent="✕ Tarkistus epäonnistui";box.append(title,document.createElement("br"),document.createTextNode(reason));validation.appendChild(box)
  }
  try{draw()}catch{
   const canvas=$("preview");
   const ctx=canvas?.getContext?.("2d");
   if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height)
  }
  setTimeout(()=>window.CentauriProfile?.check?.(),0);
  setTimeout(()=>window.CentauriOrientation?.render&&$("orientationResult")?window.CentauriOrientation.render():null,0);
  setTimeout(()=>window.AI3DPrintability?.render?.(),0);
  lastError=reason||lastError;
  clearing=false
 }
 function projectFailureReason(){
  const sync=$("planSyncStatus")?.textContent?.trim()||"";
  if(!sync||typeof window.AI3DProjects?.active!=="function"||window.AI3DProjects.active())return"";
  if(/projektien paikallinen tallennus epäonnistui|eikä projektia tallennettu|ei löytynyt avattavaa CAD-mallia/i.test(sync))return sync;
  return""
 }
 function failureReason(){
  const projectFailure=projectFailureReason();if(projectFailure)return projectFailure;
  const status=$("status")?.textContent?.trim()||"",validation=$("validation");
  if(/^Virhe\s*:/i.test(status))return status;
  if(/generointi epäonnistui|STL-lataus estetty/i.test(status))return status;
  const fail=validation?.querySelector?.(".check.fail");
  if(fail)return fail.textContent?.trim()||"Mallin tarkistus epäonnistui.";
  return""
 }
 function inspect(){
  const reason=failureReason();
  if(!reason){lastError="";return}
  if(reason!==lastError)clearPreview(reason);
  else if(!clearing){
   try{if(currentMesh||currentFitMesh)clearPreview(reason)}catch{}
  }
 }
 function init(){
  const status=$("status"),validation=$("validation"),sync=$("planSyncStatus");
  if(status)new MutationObserver(inspect).observe(status,{childList:true,subtree:true,characterData:true});
  if(validation)new MutationObserver(inspect).observe(validation,{childList:true,subtree:true,characterData:true});
  if(sync)new MutationObserver(inspect).observe(sync,{childList:true,subtree:true,characterData:true});
  inspect()
 }
 window.AI3DPreviewGuard={clear:clearPreview,check:inspect,failureReason};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
