"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const PROFILE={name:"Elegoo Centauri Carbon 2 Combo",build:[256,256,256],buildPlate:[260,260],comfortable:[250,250,250],nozzle:0.4,nozzleMax:350,filament:1.75,recommendedLayer:0.2,formats:["STL","OBJ","3MF","STEP"],slicers:["ElegooSlicer","Orca","Cura"]};
 const materialTips={PLA:{layer:"0.20 mm",walls:"3",infill:"15–20 %",note:"Hyvä prototyyppeihin ja ensimmäisiin mittatesteihin."},PETG:{layer:"0.20 mm",walls:"4",infill:"25–35 %",note:"Hyvä mekaanisiin käyttöosiin. Tarkista sillat ja jäähdytys slicerin esikatselusta."},ASA:{layer:"0.20 mm",walls:"4–5",infill:"30–40 %",note:"Centauri Carbon 2 Combo tukee ASA:aa. Käytä valmistajan tai slicerin materiaaliprofiilia ja pidä kotelo suljettuna tulostuksen aikana."}};
 function inject(){if($("centauriPanel"))return;const actions=document.querySelector(".actions");if(!actions)return;const box=document.createElement("div");box.id="centauriPanel";box.className="centauri-panel";box.innerHTML=`<div class="section-title">Centauri Carbon 2 Combo</div><div id="centauriStatus" class="printer-status"><b>Ei vielä mallia.</b><span>Luo 3D-malli ensin.</span></div><div class="centauri-actions"><button id="btnCentauriStl" class="primary" disabled>LATAA STL CENTAURIIN</button><button id="btnCentauriGuide" class="tool">LATAA ASETUSOHJE</button></div><small class="centauri-note">3D Studio tarkistaa oikean mesh-rajauslaatikon, koon ja nykyisen mesh-validoinnin. Avaa STL slicerissa ja tarkista vielä orientaatio, tuet sekä ensimmäinen kerros ennen tulostusta.</small>`;actions.after(box)}
 function mesh(){try{return currentMesh||null}catch{return null}}
 function meshOk(){return !$("btnDownload")?.disabled}
 function bounds(m){
  const tris=m?.triangles;if(!Array.isArray(tris)||!tris.length)return null;
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity,vertices=0;
  for(const t of tris){if(!Array.isArray(t)||t.length!==3)continue;for(const q of t){const x=+q?.x,y=+q?.y,z=+q?.z;if(![x,y,z].every(Number.isFinite))return null;minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z);vertices++}}
  if(!vertices)return null;return{min:[minX,minY,minZ],max:[maxX,maxY,maxZ],dims:[maxX-minX,maxY-minY,maxZ-minZ],triangles:tris.length}
 }
 function activeValues(){return window.AI3DProjects?.active?.()?.values||{}}
 function thinFeature(){
  const type=$("partType")?.value||"",v=activeValues(),c=[];
  const add=(name,x)=>{x=+x;if(Number.isFinite(x)&&x>0)c.push([name,x])};
  if(type==="adapter"){add("seinämä alussa",(+v.adapterOD1-+v.adapterID1)/2);add("seinämä lopussa",(+v.adapterOD2-+v.adapterID2)/2)}
  else if(type==="enclosure"){add("seinämä",v.enclosureWall);add("pohja",v.enclosureFloor)}
  else if(type==="sleeve")add("seinämä",v.sleeveWall);
  else if(type==="plate")add("levyn paksuus",v.plateT);
  else if(type==="spike")add("seinämä",v.wall);
  else if(type==="plug")add("päätylevy",v.capThickness);
  if(!c.length)return null;c.sort((a,b)=>a[1]-b[1]);return c[0]
 }
 function status(){
  const root=$("centauriStatus");if(!root)return;const m=mesh();if(!m){root.className="printer-status";root.innerHTML='<b>Ei vielä mallia.</b><span>Luo 3D-malli ensin.</span>';if($("btnCentauriStl"))$("btnCentauriStl").disabled=true;return}
  const b=bounds(m),declared=[+m.width||0,+m.depth||0,+m.height||0],dims=b?.dims||declared,finite=dims.every(Number.isFinite),positive=dims.every(x=>x>0),fits=finite&&positive&&dims.every((x,i)=>x<=PROFILE.build[i]+1e-6),comfortable=fits&&dims.every((x,i)=>x<=PROFILE.comfortable[i]),mat=$("material")?.value||"PETG",tip=materialTips[mat]||materialTips.PETG,valid=meshOk(),thin=thinFeature();
  root.className="printer-status "+(fits&&valid?"ok":"fail");let title,notes=[];
  if(!b)notes.push("⚠ Meshin pisteistä ei saatu luotettavaa rajausta; käytetään mallin ilmoittamia mittoja.");
  if(b&&declared.every(x=>x>0)){const delta=Math.max(...dims.map((x,i)=>Math.abs(x-declared[i])));if(delta>.6)notes.push(`⚠ Meshin todellinen koko poikkeaa ilmoitetuista mitoista enimmillään ${delta.toFixed(1)} mm. Centauri-tarkistus käyttää todellista mesh-kokoa.`)}
  if(b&&b.min[2]<-.05)notes.push(`⚠ Malli ulottuu ${Math.abs(b.min[2]).toFixed(2)} mm Z=0-tason alapuolelle. Sijoita malli slicerissa alustalle.`);
  if(thin&&thin[1]<PROFILE.nozzle*2)notes.push(`⚠ Ohut kohta: ${thin[0]} ${thin[1].toFixed(2)} mm (< ${ (PROFILE.nozzle*2).toFixed(2)} mm / kaksi suutinlineveyttä). Tarkista slicerin seinägenerointi.`);
  if(!finite||!positive)title="✕ Mallin mittoja ei voitu tarkistaa";else if(!fits)title="✕ Malli ylittää Centaurin 256 mm tulostusalueen";else if(!valid)title="✕ Mesh-tarkistus ei ole vielä hyväksytty";else if(!comfortable){title="✓ Mahtuu tulostusalueelle";notes.push("⚠ Malli on lähellä 256 mm rajaa. Tarkista slicerissa brim/skirt ja todellinen sijoittelu erityisen huolellisesti.")}else title="✓ Sopii Centauri Carbon 2 -tulostusalueelle";
  root.innerHTML=`<b>${title}</b><span>Todellinen mesh ${dims.map(x=>x.toFixed(1)).join(" × ")} mm • alue ${PROFILE.build.join(" × ")} mm</span>${b?`<span>Mesh: ${b.triangles} kolmiota • Z ${b.min[2].toFixed(2)}…${b.max[2].toFixed(2)} mm</span>`:""}${notes.map(n=>`<span>${n}</span>`).join("")}<span>${mat}: kerros ${tip.layer}, seinät ${tip.walls}, täyttö ${tip.infill}. ${tip.note}</span><span>0,4 mm suutin • 1,75 mm filamentti • suosituskerros 0,20 mm • suuttimen enimmäislämpö ${PROFILE.nozzleMax} °C.</span>`;
  if($("btnCentauriStl"))$("btnCentauriStl").disabled=!(fits&&valid)
 }
 function downloadGuide(){const m=mesh(),b=bounds(m),mat=$("material")?.value||"PETG",tip=materialTips[mat]||materialTips.PETG,p=window.AI3DProjects?.active?.(),dims=(b?.dims||[+m?.width||0,+m?.depth||0,+m?.height||0]).map(x=>x.toFixed(1)).join(" x "),thin=thinFeature();const text=["3D Studio – Elegoo Centauri Carbon 2 Combo",`Projekti: ${p?.name||m?.name||"3D-malli"}`,`Meshin todelliset mitat: ${dims} mm`,`Tulostusalue: ${PROFILE.build.join(" x ")} mm`,`Tulostusalustan fyysinen koko: ${PROFILE.buildPlate.join(" x ")} mm`,`Suutin: ${PROFILE.nozzle} mm (enintään ${PROFILE.nozzleMax} °C)`,`Filamentti: ${PROFILE.filament} mm`,`Yhteensopiva vienti tästä sovelluksesta: STL`,`Slicer: ElegooSlicer, Orca tai Cura`,`Materiaali: ${mat}`,`Kerros: ${tip.layer}`,`Seinät: ${tip.walls}`,`Täyttö: ${tip.infill}`,tip.note,b?`Mesh: ${b.triangles} kolmiota; Z ${b.min[2].toFixed(2)}...${b.max[2].toFixed(2)} mm`:"Mesh-rajausta ei voitu laskea.",thin?`Ohuin tunnettu parametrinen kohta: ${thin[0]} ${thin[1].toFixed(2)} mm`:"","","TARKISTUS ENNEN TULOSTUSTA","1. Avaa STL slicerissa.","2. Tarkista orientaatio ja mahdolliset tuet.","3. Tarkista ensimmäisen kerroksen esikatselu.","4. Tarkista että brim/skirt ja koko kappale ovat tulostusalueella.","5. Tarkista ohuet seinät ja pienet yksityiskohdat slicerin viivanäkymästä.","6. Käytä materiaalille sopivaa Centauri Carbon 2 -profiilia."].filter(Boolean).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));a.download="centauri-carbon-2-tulostusohje.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
 function init(){inject();$("btnCentauriStl")?.addEventListener("click",()=>$("btnDownload")?.click());$("btnCentauriGuide")?.addEventListener("click",downloadGuide);$("btnGenerate")?.addEventListener("click",()=>setTimeout(status,50));$("material")?.addEventListener("change",status);const obs=new MutationObserver(status);if($("dimensions"))obs.observe($("dimensions"),{childList:true,subtree:true,characterData:true});if($("validation"))obs.observe($("validation"),{childList:true,subtree:true,characterData:true});setTimeout(status,250)}
 window.CentauriProfile={...PROFILE,check:status,bounds};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();