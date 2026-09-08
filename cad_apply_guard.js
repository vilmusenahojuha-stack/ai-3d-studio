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
 api.setPart=(type,values={})=>{
  const result=original(type,values);
  const error=failureMessage();
  if(error)throw Error(error);
  return result
 };
 Object.defineProperty(api,"__applyGuard",{value:true,configurable:false,enumerable:false,writable:false});
 function wrapV2(){
  const v2=window.AI3DPlanV2CAD;
  if(!v2||typeof v2.apply!=="function"||v2.__applyGuard)return false;
  const originalApply=v2.apply.bind(v2);
  v2.apply=plan=>{
   const result=originalApply(plan);
   const error=failureMessage();
   if(error)throw Error(error);
   return result
  };
  Object.defineProperty(v2,"__applyGuard",{value:true,configurable:false,enumerable:false,writable:false});
  return true
 }
 if(!wrapV2()&&document.readyState==="loading")document.addEventListener?.("DOMContentLoaded",wrapV2,{once:true});
 window.AI3DCADApplyGuard={check:failureMessage,wrapV2};
})();
