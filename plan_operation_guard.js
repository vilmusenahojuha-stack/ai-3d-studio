"use strict";
(()=>{
 const $=id=>document.getElementById(id),MAX_OPS=200,MAX_HOLES=200;
 const support={mountingPlate:new Set(["hole","holes"]),sleeve:new Set(),spike:new Set(),endPlug:new Set(),adapter:new Set(),enclosure:new Set()};
 let running=true,last={ok:false,errors:["Tarkistus ei ole vielä valmis."],fingerprint:null};
 const finite=v=>Number.isFinite(Number(v));
 const positive=v=>finite(v)&&Number(v)>0;
 function fingerprint(raw){try{return JSON.stringify(raw)}catch{return null}}
 function plateHoles(raw){
  const out=[],seen=new Set(),add=(h,label)=>{if(out.length>MAX_HOLES)return;if(!h||typeof h!=="object"||Array.isArray(h)){out.push({invalid:true,label});return}const x=Number(h.x??0),y=Number(h.y??0),d=Number(h.diameter??h.d),key=[x,y,d].map(v=>Number.isFinite(v)?v.toFixed(6):String(v)).join("|");if(seen.has(key))return;seen.add(key);out.push({x,y,d,label})};
  const p=raw.parameters||{},ph=p.holes;if(ph!=null&&!Array.isArray(ph))out.push({invalid:true,label:"parameters.holes"});else for(const [i,h] of (ph||[]).slice(0,MAX_HOLES+1).entries())add(h,`parameters.holes ${i+1}`);if(p.centerHole)add(typeof p.centerHole==="number"?{x:0,y:0,diameter:p.centerHole}:p.centerHole,"parameters.centerHole");
  for(const op of (raw.operations||[]).slice(0,MAX_OPS+1)){if(op?.type==="hole")add(op,"hole");if(op?.type==="holes"&&Array.isArray(op.holes))for(const [i,h] of op.holes.slice(0,MAX_HOLES+1).entries())add(h,`holes ${i+1}`)}return out
 }
 function insidePlate(x,y,L,W,style,size){
  const ax=Math.abs(x),ay=Math.abs(y);if(ax>L/2||ay>W/2)return false;
  if(style==="chamfer")return ax+ay<=L/2+W/2-size+1e-7;
  if(style==="round"){const r=Math.max(0,Math.min(size,L/2,W/2));if(ax<=L/2-r||ay<=W/2-r)return true;return Math.hypot(ax-(L/2-r),ay-(W/2-r))<=r+1e-7}
  return true
 }
 function validatePlateGeometry(raw,errors,warnings){
  const p=raw.parameters||{},L=Number(p.length),W=Number(p.width),holes=plateHoles(raw),cornerRaw=p.cornerRadius,chamferRaw=p.chamfer,cornerRadius=Math.max(0,Number(cornerRaw)||0),chamfer=Math.max(0,Number(chamferRaw)||0),style=cornerRadius>0?"round":chamfer>0?"chamfer":"square",size=cornerRadius||chamfer||0;
  if(!positive(L)||!positive(W))return;
  if(cornerRaw!=null&&(!finite(cornerRaw)||Number(cornerRaw)<0))errors.push("cornerRadius pitää olla nolla tai positiivinen luku.");
  if(chamferRaw!=null&&(!finite(chamferRaw)||Number(chamferRaw)<0))errors.push("chamfer pitää olla nolla tai positiivinen luku.");
  if(positive(cornerRaw)&&positive(chamferRaw))errors.push("Levylle ei voi määrittää yhtä aikaa sekä cornerRadius- että chamfer-arvoa; valitse yksi kulmatyyli.");
  if(Array.isArray(p.holes)&&p.holes.length>MAX_HOLES)errors.push(`parameters.holes sisältää yli ${MAX_HOLES} reikää.`);
  let holeBudget=(Array.isArray(p.holes)?p.holes.length:0)+(p.centerHole?1:0);for(const op of (raw.operations||[]).slice(0,MAX_OPS+1)){if(op?.type==="hole")holeBudget++;if(op?.type==="holes"&&Array.isArray(op.holes)){holeBudget+=op.holes.length;if(op.holes.length>MAX_HOLES)errors.push(`Yksi holes-operaatio sisältää yli ${MAX_HOLES} reikää.`)}}if(holeBudget>MAX_HOLES)errors.push(`Suunnitelmassa on yhteensä yli ${MAX_HOLES} reikää; jaa työ pienempiin osiin.`);
  if(size>Math.min(L,W)/2-.2)errors.push("Levyn pyöristys/viiste on liian suuri levyn mitoille.");
  for(let i=0;i<holes.length&&i<=MAX_HOLES;i++){
   const h=holes[i];if(h.invalid||!finite(h.x)||!finite(h.y)||!positive(h.d)){errors.push(`Reikä ${i+1}: x, y ja positiivinen diameter vaaditaan.`);continue}
   const rr=h.d/2+.6,tests=[[h.x+rr,h.y],[h.x-rr,h.y],[h.x,h.y+rr],[h.x,h.y-rr]];
   if(!tests.every(([x,y])=>insidePlate(x,y,L,W,style,size)))errors.push(`Reikä ${i+1} on liian lähellä levyn reunaa tai kulmaa; CAD tarvitsee vähintään 0,6 mm reunamarginaalin.`)
  }
  const limit=Math.min(holes.length,MAX_HOLES);for(let i=0;i<limit;i++)for(let j=i+1;j<limit;j++){
   const a=holes[i],b=holes[j];if(a.invalid||b.invalid||![a.x,a.y,a.d,b.x,b.y,b.d].every(Number.isFinite)||a.d<=0||b.d<=0)continue;
   const gap=Math.hypot(a.x-b.x,a.y-b.y)-(a.d+b.d)/2;
   if(gap<1)errors.push(`Reikien ${i+1} ja ${j+1} väli on alle 1 mm; CAD estää näin lähellä olevat reiät.`);else if(gap<2)warnings.push(`Reikien ${i+1} ja ${j+1} väli on alle 2 mm; tarkista mekaaninen kestävyys.`)
  }
 }
 function validate(raw){const errors=[],warnings=[];if(!raw||raw.schemaVersion!==2)return{ok:true,errors,warnings};const ops=raw.operations;if(ops!=null&&!Array.isArray(ops))return{ok:false,errors:["operations pitää olla taulukko."],warnings};if(Array.isArray(ops)&&ops.length>MAX_OPS)errors.push(`operations sisältää yli ${MAX_OPS} operaatiota.`);const allowed=support[raw.partType]||new Set();for(const [i,op] of (ops||[]).slice(0,MAX_OPS+1).entries()){if(!op||typeof op!=="object"||Array.isArray(op)){errors.push(`Operaatio ${i+1} ei ole kelvollinen objekti.`);continue}const type=String(op.type||"").trim();if(!type){errors.push(`Operaatio ${i+1}: type puuttuu.`);continue}if(!allowed.has(type))errors.push(`Operaatiota ”${type}” ei toteuteta ${raw.partType||"tämän"}-editorissa.`);if(type==="holes"){if(!Array.isArray(op.holes))errors.push(`Operaatio ${i+1}: holes-taulukko puuttuu.`);else if(op.holes.length>MAX_HOLES)errors.push(`Operaatio ${i+1}: holes sisältää yli ${MAX_HOLES} reikää.`)}}if(raw.partType==="mountingPlate")validatePlateGeometry(raw,errors,warnings);return{ok:errors.length===0,errors:[...new Set(errors)],warnings:[...new Set(warnings)]}}
 function sameRevision(){const base=window.AI3DPlanPreflight?.getLastResult?.();return!!(base?.fingerprint&&last.fingerprint&&base.fingerprint===last.fingerprint)}
 function allowed(){const base=window.AI3DPlanPreflight?.getLastResult?.();return !running&&last.ok&&base?.ok===true&&sameRevision()}
 function gate(){const b=document.querySelector('[data-plan="chatgpt-current"]');if(!b)return;const ok=allowed();b.disabled=!ok;b.classList.toggle("unsupported",!ok);if(ok)b.removeAttribute("title");else if(running)b.title="CAD-operaatioiden tarkistus on kesken.";else if(last.ok&&!sameRevision())b.title="ChatGPT-suunnitelman tarkistukset koskevat eri tiedostoversioita. Päivitä suunnitelma uudelleen.";else b.title=last.errors[0]||"Suunnitelma on estetty."}
 function blockUnsafeClick(e){const b=e.target?.closest?.('[data-plan="chatgpt-current"]');if(!b||allowed())return;e.preventDefault();e.stopImmediatePropagation();gate();const box=$("planPreflight");if(box&&running)box.textContent="⏳ Tarkistetaan ChatGPT-suunnitelman CAD-operaatioita…";else if(box&&last.ok&&!sameRevision())box.textContent="⚠ ChatGPT-suunnitelma estetty: tarkistukset koskevat eri suunnitelmaversioita. Päivitä suunnitelma uudelleen."}
 async function run(){running=true;last={ok:false,errors:["Tarkistus kesken."],warnings:[],fingerprint:null};gate();try{const r=await fetch("chatgpt_plan.json?operations="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const raw=await r.json(),checked=validate(raw);last={...checked,fingerprint:fingerprint(raw)}}catch(e){last={ok:false,errors:["CAD-operaatioiden tarkistus epäonnistui: "+(e?.message||e)],warnings:[],fingerprint:null}}running=false;gate();const box=$("planPreflight");if(box&&!last.ok)box.textContent="⚠ ChatGPT-suunnitelma estetty: "+last.errors.join(" ");else if(box&&last.ok&&!sameRevision())box.textContent="⚠ ChatGPT-suunnitelma estetty: tarkistukset koskevat eri suunnitelmaversioita. Päivitä suunnitelma uudelleen."}
 function init(){const list=$("planList");if(list)new MutationObserver(()=>{const b=document.querySelector('[data-plan="chatgpt-current"]');if(b&&!allowed()&&!b.disabled)gate()}).observe(list,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","class"]});document.addEventListener("click",blockUnsafeClick,true);run();document.addEventListener("click",e=>{if(e.target?.id==="btnReloadPlans")setTimeout(run,420)})}
 window.AI3DPlanOperationGuard={validate,run,getLastResult:()=>last,isAllowed:allowed};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
