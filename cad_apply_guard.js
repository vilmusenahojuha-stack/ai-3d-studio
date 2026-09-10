"use strict";
(()=>{
 const $=id=>document.getElementById(id),api=window.AI3D,HOLE_XY_MAX=2000,HOLE_D_MIN=.2,HOLE_D_MAX=500;
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
 function validatePlanHoleBounds(plan){
  if(!plan||plan.schemaVersion!==2||!["mountingPlate","plate"].includes(plan.partType))return true;
  const holes=[],add=(h,label,allowNumeric=false)=>{if(h==null)return;if(typeof h==="number"){if(!allowNumeric)throw Error(`${label}: reiän tiedot pitää antaa objektina, jossa ovat x, y ja diameter.`);holes.push({x:0,y:0,d:h,label});return}if(!h||typeof h!=="object"||Array.isArray(h))throw Error(`${label}: reiän tiedot eivät ole kelvollinen objekti.`);holes.push({x:h.x??0,y:h.y??0,d:h.diameter??h.d,label})};
  const p=plan.parameters||{};
  if(p.holes!=null&&!Array.isArray(p.holes))throw Error("parameters.holes: reikien pitää olla taulukko.");
  if(plan.operations!=null&&!Array.isArray(plan.operations))throw Error("operations: CAD-operaatioiden pitää olla taulukko.");
  if(Array.isArray(p.holes))p.holes.forEach((h,i)=>add(h,`parameters.holes ${i+1}`));
  if(p.centerHole!=null)add(p.centerHole,"parameters.centerHole",true);
  for(const [i,op] of (Array.isArray(plan.operations)?plan.operations:[]).entries()){
   if(op?.type==="hole")add(op,`operations ${i+1}`);
   if(op?.type==="holes"){
    if(!Array.isArray(op.holes))throw Error(`operations ${i+1}: holes-operaation reikien pitää olla taulukko.`);
    op.holes.forEach((h,j)=>add(h,`operations ${i+1}, reikä ${j+1}`));
   }
  }
  for(const h of holes){
   const x=Number(h.x),y=Number(h.y),d=Number(h.d);
   if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(d)||Math.abs(x)>HOLE_XY_MAX||Math.abs(y)>HOLE_XY_MAX||d<HOLE_D_MIN||d>HOLE_D_MAX)throw Error(`${h.label}: x/y pitää olla välillä -${HOLE_XY_MAX}…${HOLE_XY_MAX} mm ja diameter välillä ${HOLE_D_MIN}…${HOLE_D_MAX} mm.`);
  }
  return true
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
    validatePlanHoleBounds(plan);
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
 window.AI3DCADApplyGuard={check:failureMessage,wrapV2,validatePlanHoleBounds};
})();
