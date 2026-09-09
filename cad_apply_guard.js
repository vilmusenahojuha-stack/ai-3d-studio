"use strict";
(()=>{
 const $=id=>document.getElementById(id),api=window.AI3D;
 if(!api||typeof api.setPart!=="function"||api.__applyGuard)return;
 const original=api.setPart.bind(api);
 function failureMessage(){
  const status=$("status")?.textContent?.trim()||"";
  const validation=$("validation");
  const failed=!!validation?.querySelector?.(".check.fail")||/^Virhe\s*:/i.test(status)||/generointi epäonnistui|STL-lataus estetty/i.test(status);
  if(!failed)return"";
  return status.replace(/^Virhe\s*:\s*/i,"")||"CAD-malli ei läpäissyt tarkistusta.";
 }
 function failClosed(error){
  const message=error?.message||String(error||"CAD-mallin generointi epäonnistui.");
  try{if(typeof window.AI3DPreviewGuard?.clear==="function"){window.AI3DPreviewGuard.clear(message);return}}catch{}
  try{currentMesh=null}catch{}
  try{currentFitMesh=null}catch{}
  const download=$("btnDownload"),fit=$("btnFitTest"),dims=$("dimensions"),status=$("status");
  if(download)download.disabled=true;
  if(fit)fit.disabled=true;
  if(dims)dims.textContent="–";
  if(status&&!/^Virhe\s*:/i.test(status.textContent||""))status.textContent="Virhe: "+message;
  try{draw()}catch{}
 }
 api.setPart=(type,values={})=>{
  try{
   const result=original(type,values);
   const error=failureMessage();
   if(error)throw Error(error);
   return result
  }catch(error){failClosed(error);throw error}
 };
 Object.defineProperty(api,"__applyGuard",{value:true,configurable:false,enumerable:false,writable:false});
 let v2Value=window.AI3DPlanV2CAD;
 function wrapV2(value=v2Value){
  const v2=value;
  if(!v2||typeof v2.apply!=="function"||v2.__applyGuard)return false;
  const originalApply=v2.apply.bind(v2);
  v2.apply=plan=>{
   try{
    const result=originalApply(plan);
    const error=failureMessage();
    if(error)throw Error(error);
    return result
   }catch(error){failClosed(error);throw error}
  };
  Object.defineProperty(v2,"__applyGuard",{value:true,configurable:false,enumerable:false,writable:false});
  return true
 }
 function watchV2Assignment(){
  if(v2Value)return wrapV2(v2Value);
  let desc;
  try{desc=Object.getOwnPropertyDescriptor(window,"AI3DPlanV2CAD")}catch{return false}
  if(desc&&!desc.configurable)return false;
  try{
   Object.defineProperty(window,"AI3DPlanV2CAD",{
    configurable:true,
    enumerable:desc?.enumerable??true,
    get(){return v2Value},
    set(value){v2Value=value;wrapV2(value)}
   });
   return true
  }catch{return false}
 }
 const watching=watchV2Assignment();
 if(!watching&&!wrapV2()&&document.readyState==="loading")document.addEventListener?.("DOMContentLoaded",wrapV2,{once:true});
 window.AI3DCADApplyGuard={check:failureMessage,wrapV2};
})();
