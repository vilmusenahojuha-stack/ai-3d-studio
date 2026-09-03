"use strict";
(()=>{
 const KEY="ai3d:projects:v3",$=id=>document.getElementById(id);
 let checking=false,lastIssue="";
 function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:null}catch{return null}}
 function verify(){
  if(checking)return !lastIssue;
  checking=true;
  try{
   const active=window.AI3DProjects?.active?.();
   if(!active?.id){lastIssue="";return true}
   const items=read(),stored=items?.some(p=>p&&p.id===active.id),activeId=localStorage.getItem(KEY+":active")||"";
   if(!stored||activeId!==active.id){
    lastIssue="Aktiivista projektia ei voitu vahvistaa paikallisesta tallennuksesta.";
    const box=$("planSyncStatus");
    if(box){box.textContent="⚠ Projekti on auki, mutta paikallinen tallennus ei varmistunut. Vie tärkeä työ JSON-varmuuskopioksi ennen sivun sulkemista.";box.className="plan-sync-status warn"}
    return false
   }
   lastIssue="";return true
  }catch(e){
   lastIssue=e?.message||String(e);
   const box=$("planSyncStatus");
   if(box){box.textContent="⚠ Paikallisen projektitallennuksen varmennus epäonnistui: "+lastIssue;box.className="plan-sync-status warn"}
   return false
  }finally{checking=false}
 }
 function init(){
  const box=$("planSyncStatus");if(!box)return;
  new MutationObserver(()=>{if(checking)return;const ok=box.classList.contains("ok")||/^\s*✓/.test(box.textContent||"");if(ok)setTimeout(verify,0)}).observe(box,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
  setTimeout(verify,300)
 }
 window.AI3DStorageCommitGuard={verify,get lastIssue(){return lastIssue}};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
