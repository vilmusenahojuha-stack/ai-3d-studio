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
 window.AI3DCADApplyGuard={check:failureMessage};
})();
