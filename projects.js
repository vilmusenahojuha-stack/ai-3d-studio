"use strict";
(()=>{
 const KEY="ai3d:projects:v2", $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 let projects=[],plans=[],activeId="";
 const save=()=>{localStorage.setItem(KEY,JSON.stringify(projects));localStorage.setItem(KEY+":active",activeId||"")};
 const current=()=>projects.find(p=>p.id===activeId);
 function renderPlans(){const root=$("planList");if(!root)return;root.innerHTML=plans.map(p=>`<button class="project-item plan-item" data-plan="${esc(p.id)}"><b>${esc(p.name)}</b><small>${esc(p.description||"")}</small></button>`).join("");root.querySelectorAll("[data-plan]").forEach(b=>b.onclick=()=>openPlan(b.dataset.plan))}
 function renderProjects(){const root=$("projectList");if(!root)return;root.innerHTML=projects.map(p=>`<button class="project-item ${p.id===activeId?"active":""}" data-id="${esc(p.id)}"><b>${esc(p.name)}</b><small>${new Date(p.updated||p.created||Date.now()).toLocaleDateString("fi-FI")}</small></button>`).join("");root.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>openProject(b.dataset.id))}
 function showInfo(p){$("projectName").textContent=p?.name||"–";$("projectDescription").textContent=p?.description||"Muuta mittoja CAD-työtilassa ja lataa STL-tiedostot.";const pr=p?.print;$("projectPrintInfo").innerHTML=pr?`<b>Tulostus:</b> ${esc(pr.printer||"")} • suutin ${esc(pr.nozzle||"")} • kerros ${esc(pr.layer||"")} • seinät ${esc(pr.walls||"")} • täyttö ${esc(pr.infill||"")}<br><span>${esc(pr.notes||"")}</span>`:""}
 function openProject(id){const p=projects.find(x=>x.id===id);if(!p)return;activeId=id;save();renderProjects();showInfo(p);window.AI3D?.setPart(p.type||"spike",p.values||{})}
 function snapshotValues(type){const ids=type==="lightSign"?["signDiameter","signRingWidth","signDepth","signWall","diffuserThickness","starWidth","starThickness","ledWidth","filamentPriceKg","ledCost","powerCost","miscCost","material"]:["nutAf","clearance","lockAmount","lockZ","wall","baseHeight","totalHeight","tipRadius","tubeW","tubeH","tubeWall","plugClear","insertDepth","capThickness","capOverhang","sleeveID","sleeveWall","sleeveLength","plateL","plateW","plateT","material"];const out={};ids.forEach(id=>{const e=$(id);if(e)out[id]=e.type==="number"?+e.value:e.value});return out}
 function openPlan(id){const plan=plans.find(x=>x.id===id);if(!plan)return;const p={id:"p"+Date.now(),name:plan.name,description:plan.description||"",type:plan.type,values:{...(plan.values||{})},print:plan.print||null,created:Date.now(),updated:Date.now(),sourcePlan:id};projects.unshift(p);activeId=p.id;save();renderProjects();showInfo(p);window.AI3D?.setPart(p.type,p.values)}
 function newProject(){const name=prompt("Projektin nimi","Uusi 3D-projekti");if(!name)return;const type=$("partType")?.value||"spike",p={id:"p"+Date.now(),name:name.trim()||"Uusi 3D-projekti",description:"Oma muokattava projekti",type,values:snapshotValues(type),created:Date.now(),updated:Date.now()};projects.unshift(p);activeId=p.id;save();renderProjects();showInfo(p)}
 function autosave(){const p=current();if(!p)return;p.type=$("partType")?.value||p.type;p.values=snapshotValues(p.type);p.updated=Date.now();save()}
 async function loadPlans(){try{const r=await fetch(`plans.json?v=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const data=await r.json();plans=Array.isArray(data.plans)?data.plans:[]}catch(e){plans=[{id:"light-sign-400",name:"Valokyltti 400 mm",description:"400 mm LED-valokyltti",type:"lightSign",values:{signDiameter:400,signRingWidth:28,signDepth:24,signWall:2.4,diffuserThickness:1.2,starWidth:28,starThickness:4,ledWidth:10,material:"PETG"}}]}renderPlans();if(!projects.length&&plans.length)openPlan(plans[0].id);else if(projects.length)openProject(activeId||projects[0].id)}
 document.addEventListener("DOMContentLoaded",()=>{
   try{projects=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{projects=[]}
   activeId=localStorage.getItem(KEY+":active")||projects[0]?.id||"";
   $("btnNewProject").onclick=newProject;
   ["partType","material"].forEach(id=>$(id)?.addEventListener("change",()=>setTimeout(autosave,0)));
   document.querySelector(".controls")?.addEventListener("input",e=>{if(e.target.matches("input,select"))setTimeout(autosave,0)});
   loadPlans();
 });
 window.AI3DProjects={openPlan,newProject,active:current};
})();
