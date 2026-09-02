"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const supportedV2=new Set(["sleeve","spike","endPlug","mountingPlate","adapter","enclosure"]);
 const supportedV1=new Set(["sleeve","spike","plug","plate"]);
 const positive=v=>Number.isFinite(Number(v))&&Number(v)>0;
 function validateV1(raw){
  const errors=[],warnings=[],v=raw.values;
  if(!supportedV1.has(raw.partType))errors.push("Schema v1 -osatyyppiä ei tueta.");
  if(!v||typeof v!=="object"||Array.isArray(v))errors.push("values-objekti puuttuu.");
  if(v&&raw.partType==="spike"){
   if(!positive(v.nutAf))errors.push("nutAf puuttuu tai ei ole positiivinen luku.");
   if(!positive(v.wall))errors.push("wall puuttuu tai ei ole positiivinen luku.");
   if(!positive(v.totalHeight))errors.push("totalHeight puuttuu tai ei ole positiivinen luku.");
   if(positive(v.baseHeight)&&positive(v.totalHeight)&&Number(v.baseHeight)>=Number(v.totalHeight))errors.push("baseHeight pitää olla kokonaiskorkeutta pienempi.");
  }
  for(const[k,x]of Object.entries(v||{}))if(typeof x==="number"&&Math.abs(x)>1000)warnings.push(k+" on poikkeuksellisen suuri.");
  return{ok:errors.length===0,errors,warnings,schema:1}
 }
 function validateV2(raw){
  const errors=[],warnings=[];
  if(!["ready","approved"].includes(raw.status))errors.push("status pitää olla ready tai approved.");
  if(!supportedV2.has(raw.partType))errors.push("Osatyyppiä ei tueta Schema v2:ssa.");
  if(!["PLA","PETG","ASA"].includes(raw.material))errors.push("Materiaali pitää olla PLA, PETG tai ASA.");
  const p=raw.parameters;
  if(!p||typeof p!=="object"||Array.isArray(p))errors.push("parameters-objekti puuttuu.");
  if(p&&typeof p==="object"){
   const need=k=>{if(!positive(p[k]))errors.push(k+" puuttuu tai ei ole positiivinen luku.")};
   if(raw.partType==="mountingPlate"){need("length");need("width");need("thickness")}
   if(raw.partType==="sleeve"){need("insideDiameter");need("length");if(!positive(p.wall)&&!positive(p.outsideDiameter))errors.push("Holkki tarvitsee wall- tai outsideDiameter-arvon.")}
   if(raw.partType==="spike"){if(!positive(p.nutAcrossFlats)&&!positive(p.nutAf))errors.push("Piikkimutterin avainkoko puuttuu.");if(!positive(p.wall))errors.push("wall puuttuu.");if(!positive(p.height)&&!positive(p.totalHeight))errors.push("Kokonaiskorkeus puuttuu.")}
   if(raw.partType==="endPlug"){need("width");need("height");need("wall");need("insertDepth")}
   if(raw.partType==="adapter"){need("length");if(!positive(p.insideDiameter1)&&!positive(p.insideDiameter))errors.push("Adapterin sisähalkaisija puuttuu.")}
   if(raw.partType==="enclosure"){need("width");need("height");if(!positive(p.length)&&!positive(p.depth))errors.push("Kotelon length/depth puuttuu.")}
   for(const[k,x]of Object.entries(p))if(typeof x==="number"&&Math.abs(x)>1000)warnings.push(k+" on poikkeuksellisen suuri.");
  }
  return{ok:errors.length===0,errors,warnings,schema:2}
 }
 function validate(raw){
  if(!raw||typeof raw!=="object")return{ok:false,errors:["Suunnitelma ei ole JSON-objekti."],warnings:[],schema:null};
  if(typeof raw.projectName!=="string"||!raw.projectName.trim())return{ok:false,errors:["Projektin nimi puuttuu."],warnings:[],schema:raw.schemaVersion};
  if(raw.schemaVersion===1)return validateV1(raw);
  if(raw.schemaVersion===2)return validateV2(raw);
  return{ok:false,errors:["Tuntematon schemaVersion."],warnings:[],schema:raw.schemaVersion}
 }
 async function run(){
  let box=$("planPreflight");
  if(!box){const side=document.querySelector(".project-sidebar");if(!side)return;box=document.createElement("div");box.id="planPreflight";box.style.margin="8px 0";box.style.padding="9px";box.style.border="1px solid #334155";box.style.borderRadius="10px";side.appendChild(box)}
  try{const r=await fetch("chatgpt_plan.json?preflight="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const v=validate(await r.json());box.textContent=v.ok?(v.warnings.length?`✓ Schema v${v.schema} -suunnitelman rakenne OK. `+v.warnings.join(" "):`✓ ChatGPT-suunnitelman rakenne OK (Schema v${v.schema}).`):"⚠ ChatGPT-suunnitelma: "+v.errors.join(" ")}
  catch(e){box.textContent="⚠ Suunnitelman ennakkotarkistus ei onnistunut: "+e.message}
 }
 function init(){run();document.addEventListener("click",e=>{if(e.target&&e.target.id==="btnReloadPlans")setTimeout(run,300)})}
 window.AI3DPlanPreflight={validate,run};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
