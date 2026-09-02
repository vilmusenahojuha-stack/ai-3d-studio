"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 let checking=false,lastIssue="";
 function getMesh(){try{return currentMesh||null}catch{return null}}
 function inspectMesh(m){
  const tris=m?.triangles;
  if(!Array.isArray(tris)||!tris.length)return"Meshistä puuttuvat kolmiot.";
  if(tris.length>1_000_000)return"Mesh on poikkeuksellisen suuri (yli 1 000 000 kolmiota).";
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let i=0;i<tris.length;i++){
   const t=tris[i];
   if(!Array.isArray(t)||t.length!==3)return`Kolmio ${i+1} ei sisällä kolmea pistettä.`;
   for(const q of t){
    const x=Number(q?.x),y=Number(q?.y),z=Number(q?.z);
    if(![x,y,z].every(Number.isFinite))return`Meshissä on virheellinen koordinaatti kolmiossa ${i+1}.`;
    if(Math.max(Math.abs(x),Math.abs(y),Math.abs(z))>100000)return"Meshissä on epärealistisen suuri koordinaatti.";
    minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z)
   }
  }
  const dims=[maxX-minX,maxY-minY,maxZ-minZ];
  if(!dims.every(Number.isFinite)||dims.some(x=>x<=0))return"Meshin todellisia ulkomittoja ei voitu vahvistaa.";
  return""
 }
 function block(issue){
  if(!issue||checking)return;
  checking=true;lastIssue=issue;
  try{window.AI3DPreviewGuard?.clear?.("Virhe: "+issue)}catch{}
  const status=$("status"),validation=$("validation"),download=$("btnDownload"),fit=$("btnFitTest");
  if(download)download.disabled=true;if(fit)fit.disabled=true;
  if(validation)validation.innerHTML=`<div class="check fail"><strong>✕ Meshin eheystarkistus epäonnistui</strong><br>${String(issue).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</div>`;
  if(status)status.textContent="Virhe: "+issue;
  setTimeout(()=>{checking=false;window.CentauriProfile?.check?.()},0)
 }
 function check(){
  if(checking)return false;
  const download=$("btnDownload");
  if(download?.disabled)return true;
  const issue=inspectMesh(getMesh());
  if(issue){block(issue);return false}
  lastIssue="";return true
 }
 function loadMultipart(){if(document.querySelector('script[data-ai3d-multipart]'))return;const s=document.createElement("script");s.src="multipart_projects.js?v=1.2";s.dataset.ai3dMultipart="1";document.body.appendChild(s)}
 function init(){
  const status=$("status"),validation=$("validation");
  const obs=new MutationObserver(()=>setTimeout(check,0));
  if(status)obs.observe(status,{childList:true,subtree:true,characterData:true});
  if(validation)obs.observe(validation,{childList:true,subtree:true,characterData:true});
  $("btnDownload")?.addEventListener("click",e=>{if(!check()){e.preventDefault();e.stopImmediatePropagation()}},true);
  setTimeout(check,50);loadMultipart()
 }
 window.AI3DMeshIntegrity={check,inspect:inspectMesh,get lastIssue(){return lastIssue}};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
