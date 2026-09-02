"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const PROFILE={name:"Elegoo Centauri Carbon 2 Combo",build:[256,256,256],formats:["STL","OBJ","3MF","STEP"],slicers:["ElegooSlicer","Orca","Cura"]};
 const materialTips={PLA:{layer:"0.20 mm",walls:"3",infill:"15–20 %",note:"Hyvä prototyyppeihin ja ensimmäisiin mittatesteihin."},PETG:{layer:"0.20 mm",walls:"4",infill:"25–35 %",note:"Hyvä mekaanisiin osiin ja Emek-projekteihin."},ASA:{layer:"0.20 mm",walls:"4–5",infill:"30–40 %",note:"Suljettu tulostin. Esilämmitä kammio ja vältä vetoa."}};
 function mesh(){try{return currentMesh||null}catch{return null}}
 function status(){
  const root=$("centauriStatus");if(!root)return;
  const m=mesh();if(!m){root.innerHTML='<b>Ei vielä mallia.</b><span>Luo 3D-malli ensin.</span>';return}
  const dims=[+m.width||0,+m.depth||0,+m.height||0],ok=dims.every((x,i)=>x>0&&x<=PROFILE.build[i]),mat=$("material")?.value||"PETG",tip=materialTips[mat]||materialTips.PETG;
  root.className="printer-status "+(ok?"ok":"fail");
  root.innerHTML=`<b>${ok?"✓ Sopii Centauri Carbon 2 -tulostusalueelle":"✕ Malli ylittää tulostusalueen"}</b><span>Malli ${dims.map(x=>x.toFixed(1)).join(" × ")} mm • alue ${PROFILE.build.join(" × ")} mm</span><span>${mat}: kerros ${tip.layer}, seinät ${tip.walls}, täyttö ${tip.infill}. ${tip.note}</span><span>Vie STL ja avaa ElegooSlicerissa, Orcassa tai Curassa.</span>`;
  if($("btnCentauriStl"))$("btnCentauriStl").disabled=!ok||$("btnDownload")?.disabled;
 }
 function downloadGuide(){
  const m=mesh(),mat=$("material")?.value||"PETG",tip=materialTips[mat]||materialTips.PETG;
  const p=window.AI3DProjects?.active?.();
  const text=["3D Studio – Centauri Carbon 2 Combo",`Projekti: ${p?.name||m?.name||"3D-malli"}`,`Tulostusalue: ${PROFILE.build.join(" x ")} mm`,`Yhteensopiva vienti tästä sovelluksesta: STL`,`Slicer: ElegooSlicer (suositeltu), Orca tai Cura`,`Materiaali: ${mat}`,`Kerros: ${tip.layer}`,`Seinät: ${tip.walls}`,`Täyttö: ${tip.infill}`,tip.note,"","Tarkista slicerissa aina orientaatio, tuet ja ensimmäisen kerroksen esikatselu ennen tulostusta."].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));a.download="centauri-carbon-2-tulostusohje.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
 }
 document.addEventListener("DOMContentLoaded",()=>{
  $("btnCentauriStl")?.addEventListener("click",()=>$("btnDownload")?.click());
  $("btnCentauriGuide")?.addEventListener("click",downloadGuide);
  $("btnGenerate")?.addEventListener("click",()=>setTimeout(status,50));
  $("material")?.addEventListener("change",status);
  const obs=new MutationObserver(status);if($("dimensions"))obs.observe($("dimensions"),{childList:true,subtree:true,characterData:true});
  setTimeout(status,250)
 });
 window.CentauriProfile={...PROFILE,check:status};
})();