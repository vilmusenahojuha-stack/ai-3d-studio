"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const supported=new Set(["sleeve","spike","endPlug","mountingPlate","adapter","enclosure"]);
 const positive=v=>Number.isFinite(Number(v))&&Number(v)>0;
 function validate(raw){
  const errors=[],warnings=[];
  if(!raw||typeof raw!=="object")return{ok:false,errors:["Suunnitelma ei ole JSON-objekti."],warnings};
  if(raw.schemaVersion!==2)errors.push("schemaVersion pitää olla 2.");
  if(!["ready","approved"].includes(raw.status))errors.push("status pitää olla ready tai approved.");
  if(!supported.has(raw.partType))errors.push("Osatyyppiä ei tueta Schema v2:ssa.");
  if(!["PLA","PETG","ASA"].includes(raw.material))errors.push("Materiaali pitää olla PLA, PETG tai ASA.");
  const p=raw.parameters;
  if(!p||typeof p!=="object"||Array.isArray(p))errors.push("parameters-objekti puuttuu.");
  if(p&&typeof p==="object"){
   const need=(k)=>{if(!positive(p[k]))errors.push(k+" puuttuu tai ei ole positiivinen luku.")};
   if(raw.partType==="mountingPlate"){need("length");need("width");need("thickness")}
   if(raw.partType==="sleeve"){need("insideDiameter");need("length");if(!positive(p.wall)&&!positive(p.outsideDiameter))errors.push("Holkki tarvitsee wall- tai outsideDiameter-arvon.")}
   if(raw.partType==="adapter"){need("length");if(!positive(p.insideDiameter1)&&!positive(p.insideDiameter))errors.push("Adapterin sisähalkaisija puuttuu.")}
   for(const [k,v] of Object.entries(p)){if(typeof v==="number"&&Math.abs(v)>1000)warnings.push(k+" on poikkeuksellisen suuri.")}
  }
  return{ok:errors.length===0,errors,warnings}
 }
 async function run(){
  let box=$("planPreflight");
  if(!box){const side=document.querySelector(".project-sidebar");if(!side)return;box=document.createElement("div");box.id="planPreflight";box.style.margin="8px 0";box.style.padding="9px";box.style.border="1px solid #334155";box.style.borderRadius="10px";side.appendChild(box)}
  try{const r=await fetch("chatgpt_plan.json?preflight="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const v=validate(await r.json());box.textContent=v.ok?(v.warnings.length?"✓ Suunnitelman rakenne OK. "+v.warnings.join(" "):"✓ ChatGPT-suunnitelman rakenne OK."):"⚠ ChatGPT-suunnitelma: "+v.errors.join(" ")}
  catch(e){box.textContent="⚠ Suunnitelman ennakkotarkistus ei onnistunut: "+e.message}
 }
 function init(){run();document.addEventListener("click",e=>{if(e.target&&e.target.id==="btnReloadPlans")setTimeout(run,300)})}
 window.AI3DPlanPreflight={validate,run};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
