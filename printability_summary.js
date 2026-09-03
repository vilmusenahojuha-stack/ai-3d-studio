"use strict";
(()=>{
 const $=id=>document.getElementById(id),NOZZLE=.4,BUILD=[256,256,256];
 const nonGeometryIds=new Set(["material","filamentPriceKg","ledCost","powerCost","miscCost"]);
 const materialNotes={
  PLA:"PLA sopii hyvin koekappaleisiin ja sisäkäyttöön. Tarkista käyttökohteen lämpötila slicerin materiaaliohjeista.",
  PETG:"PETG sopii hyvin käyttöosiin. Sovitus voi vaatia tulostinkohtaisen välyksen, joten tarkista kriittiset sovitteet testikappaleella.",
  ASA:"ASA sopii ulkokäyttöön ja UV-altistukseen. Lopulliset materiaali- ja tulostusasetukset valitaan slicerissa."
 };
 function mesh(){try{return currentMesh||null}catch{return null}}
 function finite(x){return Number.isFinite(Number(x))}
 function live(id){const e=$(id);if(!e)return NaN;const n=e.type==="number"?e.valueAsNumber:Number(e.value);return Number.isFinite(n)?n:NaN}
 function bounds(m){
  const api=window.CentauriProfile;if(api?.bounds){try{return api.bounds(m)}catch{}}
  const tris=m?.triangles;if(!Array.isArray(tris)||!tris.length)return null;let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const t of tris){if(!Array.isArray(t)||t.length!==3)return null;for(const q of t){const a=[Number(q?.x),Number(q?.y),Number(q?.z)];if(!a.every(Number.isFinite))return null;for(let i=0;i<3;i++){min[i]=Math.min(min[i],a[i]);max[i]=Math.max(max[i],a[i])}}}
  const dims=max.map((x,i)=>x-min[i]);return dims.every(x=>Number.isFinite(x)&&x>0)?{min,max,dims,triangles:tris.length}:null
 }
 function printability(m,b){const api=window.CentauriProfile;if(api?.printability){try{return api.printability(m,b)}catch{}}return null}
 function thinnestKnown(){
  const type=$("partType")?.value||"",out=[],add=(name,x)=>{if(finite(x)&&Number(x)>0)out.push([name,Number(x)])};
  if(type==="spike")add("seinämä",live("wall"));
  else if(type==="sleeve")add("seinämä",live("sleeveWall"));
  else if(type==="plug")add("päätylevy",live("capThickness"));
  else if(type==="plate")add("levyn paksuus",live("plateT"));
  else if(type==="adapter"){const a=[live("adapterOD1"),live("adapterID1"),live("adapterOD2"),live("adapterID2")];if(a.every(Number.isFinite)){add("seinämä alussa",(a[0]-a[1])/2);add("seinämä lopussa",(a[2]-a[3])/2)}}
  else if(type==="enclosure"){add("seinämä",live("enclosureWall"));add("pohja",live("enclosureFloor"))}
  else if(type==="lightSign"){add("rungon seinämä",live("signWall"));add("diffuusori",live("diffuserThickness"));add("tähden paksuus",live("starThickness"))}
  return out.sort((a,b)=>a[1]-b[1])[0]||null
 }
 function componentInfo(m){
  const tris=m?.triangles;if(!Array.isArray(tris)||!tris.length||tris.length>120000)return null;
  const parent=new Int32Array(tris.length);for(let i=0;i<parent.length;i++)parent[i]=i;
  const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  const seen=new Map(),key=q=>`${Number(q.x).toFixed(5)},${Number(q.y).toFixed(5)},${Number(q.z).toFixed(5)}`;
  for(let i=0;i<tris.length;i++)for(const q of tris[i]){const k=key(q),j=seen.get(k);if(j==null)seen.set(k,i);else join(i,j)}
  const counts=new Map();for(let i=0;i<tris.length;i++){const r=find(i);counts.set(r,(counts.get(r)||0)+1)}const sizes=[...counts.values()].sort((a,b)=>b-a);return{count:sizes.length,sizes,small:sizes.filter(x=>x<Math.max(8,tris.length*.002)).length}
 }
 function orientation(){
  try{const rows=window.CentauriOrientation?.analyse?.();if(!Array.isArray(rows)||!rows.length)return null;const best=rows[0],current=rows.find(x=>x.id==="current");if(!best?.fits)return{kind:"warn",text:"Yksikään Studion vertaama perusasento ei mahdu Centaurin tulostusalueelle."};if(best.id==="current"||!current||current.score-best.score<3)return{kind:"ok",text:"Pohja alustaa vasten / nykyinen asento on hyvä lähtökohta."};return{kind:"info",text:`Slicerissa kannattaa kokeilla asentoa: ${best.name}.`}}
  catch{return null}
 }
 function inject(){
  if($("printabilitySummary"))return;const anchor=$("validationDetails")||$("validation")||$("status");if(!anchor)return;const box=document.createElement("div");box.id="printabilitySummary";box.className="centauri-panel";box.innerHTML='<div class="section-title">Tulostettavuusarvio</div><div id="printabilityState" class="printer-status"><b>Tarkista malli ensin.</b><span>Arvio muodostetaan hyväksytystä 3D-mallista.</span></div><small class="centauri-note">Arvio on geometrinen ennakkotarkistus. Lopullinen orientaatio, tukirakenteet ja tulostusasetukset tarkistetaan slicerissa.</small>';anchor.after(box)
 }
 function render(){
  inject();const root=$("printabilityState");if(!root)return;const m=mesh(),approved=!$("btnDownload")?.disabled;
  if(!m||!approved){root.className="printer-status";root.innerHTML='<b>Tarkista malli ensin.</b><span>Mitan muuttamisen jälkeen vanhaa tulostettavuusarviota ei käytetä.</span>';return}
  const b=bounds(m);if(!b){root.className="printer-status fail";root.innerHTML='<b>TULOSTETTAVUUS: EI VOITU ARVIOIDA</b><span>Meshin todellisia mittoja ei saatu vahvistettua. STL-tarkistus ratkaisee viennin.</span>';return}
  const type=$("partType")?.value||"",build=Array.isArray(window.CentauriProfile?.build)?window.CentauriProfile.build:BUILD,fits=b.dims.every((x,i)=>x<=build[i]+1e-6),pa=printability(m,b),thin=thinnestKnown(),comp=type==="lightSign"?null:componentInfo(m),ori=orientation(),mat=$("material")?.value||"PETG",items=[],warnings=[];
  items.push(fits?`✓ Mahtuu Centauriin (${b.dims.map(x=>x.toFixed(1)).join(" × ")} mm)`:`✕ Ylittää Centaurin ${build.join(" × ")} mm tulostusalueen`);if(!fits)warnings.push("size");
  if(thin){if(thin[1]<NOZZLE*2){items.push(`⚠ ${thin[0]} on hyvin ohut (${thin[1].toFixed(2)} mm)`);warnings.push("thin")}else items.push(`✓ Tunnettu minimipaksuus on järkevä 0,4 mm suuttimelle (${thin[0]} ${thin[1].toFixed(2)} mm)`)}else items.push("ℹ Kaikkien paikallisten seinämäpaksuuksien automaattinen mittaus ei ole vielä mahdollinen.");
  if(pa){if(pa.overhangPct>=18){items.push(`⚠ Vaikeita alaspäin suuntautuvia pintoja on arviolta ${pa.overhangPct.toFixed(1)} % – tukia tai toinen asento voi olla tarpeen`);warnings.push("overhang")}else if(pa.overhangPct>=6){items.push(`⚠ Ylityksiä on jonkin verran (${pa.overhangPct.toFixed(1)} %) – tarkista slicerissa`);warnings.push("overhang")}else items.push(`✓ Ei havaittu paljon vaikeita ylityksiä (${pa.overhangPct.toFixed(1)} %)`);if(pa.bedArea<1){items.push("⚠ Selvää vaakasuoraa pohjakosketusta ei tunnistettu");warnings.push("bed")}else items.push(`✓ Alustakosketusta tunnistettiin noin ${pa.bedArea.toFixed(1)} mm²`)}else items.push("ℹ Ylitysarviota ei saatu muodostettua.");
  if(comp){if(comp.count>1){items.push(`⚠ Meshissä havaittiin ${comp.count} erillistä geometriaryhmää${comp.small?`, joista ${comp.small} on hyvin pieni`:""}`);warnings.push("components")}else items.push("✓ Mesh muodostaa yhden yhtenäisen geometriaryhmän")}
  if(ori)items.push(`${ori.kind==="ok"?"✓":ori.kind==="warn"?"⚠":"ℹ"} Suositeltu tulostusasento: ${ori.text}`);
  items.push(`ℹ ${materialNotes[mat]||materialNotes.PETG}`);
  const good=fits&&warnings.length===0;root.className="printer-status "+(good?"ok":"");root.innerHTML=`<b>${good?"TULOSTETTAVUUS: HYVÄ ✓":"TULOSTETTAVUUS: HUOMIO"}</b>${items.map(x=>`<span>${x}</span>`).join("")}<span>Studio ei tee slicerin lopullista tukianalyysiä eikä muuta STL:n orientaatiota automaattisesti.</span>`
 }
 function dirty(){const root=$("printabilityState");if(root){root.className="printer-status";root.innerHTML='<b>Tarkista malli uudelleen.</b><span>Mitat muuttuivat, joten edellinen tulostettavuusarvio vanheni.</span>'}}
 function isGeometryControl(target){return!!target?.matches?.("input,select,textarea")&&!!target.closest?.(".controls")&&!nonGeometryIds.has(target.id)}
 function init(){inject();$("btnGenerate")?.addEventListener("click",()=>setTimeout(render,180));document.addEventListener("input",e=>{if(isGeometryControl(e.target))dirty()},true);$("material")?.addEventListener("change",()=>setTimeout(render,50));document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(()=>{if(!$("btnDownload")?.disabled)render()},80)});const v=$("validation");if(v)new MutationObserver(()=>setTimeout(render,40)).observe(v,{childList:true,subtree:true});setTimeout(()=>{if(!$("btnDownload")?.disabled)render()},300)}
 window.AI3DPrintability={render,componentInfo};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();