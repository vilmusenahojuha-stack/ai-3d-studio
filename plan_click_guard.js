"use strict";
(()=>{
 let state="pending",last=null;
 const $=id=>document.getElementById(id);
 function status(text){const box=$("planPreflight");if(box)box.textContent=text}
 async function verify(){
  state="pending";last=null;
  try{
   const r=await fetch("chatgpt_plan.json?guard="+Date.now(),{cache:"no-store"});
   if(!r.ok)throw Error("HTTP "+r.status);
   const raw=await r.json(),api=window.AI3DPlanPreflight;
   if(!api?.validate)throw Error("ennakkotarkistusmoduuli ei ole valmis");
   last=api.validate(raw);state=last.ok?"ok":"blocked";
  }catch(e){last={ok:false,errors:[String(e?.message||e)]};state="blocked"}
  return last
 }
 function guard(e){
  const b=e.target?.closest?.('[data-plan="chatgpt-current"]');
  if(!b)return;
  if(state==="ok")return;
  e.preventDefault();e.stopImmediatePropagation();
  if(state==="pending")status("⏳ ChatGPT-suunnitelman tarkistus on vielä kesken. Suunnitelmaa ei avata ennen hyväksyttyä tarkistusta.");
  else status("⚠ ChatGPT-suunnitelmaa ei avattu: "+(last?.errors||["ennakkotarkistus epäonnistui"]).join(" "));
 }
 function init(){
  document.addEventListener("click",guard,true);
  verify();
  document.addEventListener("click",e=>{if(e.target?.id==="btnReloadPlans")setTimeout(verify,380)});
 }
 window.AI3DPlanGuard={verify,getState:()=>state,getLastResult:()=>last};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
