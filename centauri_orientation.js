"use strict";
(()=>{
 const $=id=>document.getElementById(id),BUILD=[256,256,256];
 const views=[
  {id:"current",name:"Nykyinen asento",rot:p=>({x:p.x,y:p.y,z:p.z})},
  {id:"x90",name:"Kyljelleen X +90°",rot:p=>({x:p.x,y:-p.z,z:p.y})},
  {id:"x-90",name:"Kyljelleen X −90°",rot:p=>({x:p.x,y:p.z,z:-p.y})},
  {id:"y90",name:"Kyljelleen Y +90°",rot:p=>({x:p.z,y:p.y,z:-p.x})},
  {id:"y-90",name:"Kyljelleen Y −90°",rot:p=>({x:-p.z,y:p.y,z:p.x})},
  {id:"flip",name:"Ylösalaisin 180°",rot:p=>({x:p.x,y:-p.y,z:-p.z})}
 ];
 function mesh(){try{return currentMesh||null}catch{return null}}
 function transformed(m,rot){const tris=(m?.triangles||[]).map(t=>t.map(q=>rot(q)));if(!tris.length)return null;let minZ=Infinity;for(const t of tris)for(const q of t)minZ=Math.min(minZ,q.z);for(const t of tris)for(const q of t)q.z-=minZ;return{...m,triangles:tris}}
 function scoreResult(r){if(!r?.fits)return 1e9;const pa=r.printability||{};const over=Number.isFinite(pa.overhangPct)?pa.overhangPct:50,bed=Number.isFinite(pa.bedArea)?pa.bedArea:0,height=r.dims?.[2]||0,foot=(r.dims?.[0]||0)*(r.dims?.[1]||0),bedRatio=foot>0?Math.min(1,bed/foot):0;return over*2.2+(1-bedRatio)*24+Math.max(0,height-180)*.06}
 function analyse(){const m=mesh(),api=window.CentauriProfile;if(!m||!api?.bounds||!api?.printability)return[];return views.map(v=>{const tm=transformed(m,v.rot),b=api.bounds(tm),dims=b?.dims||[0,0,0],fits=dims.every((x,i)=>Number.isFinite(x)&&x>0&&x<=BUILD[i]+1e-6),pa=b?api.printability(tm,b):null,r={...v,dims,fits,printability:pa};r.score=scoreResult(r);return r}).sort((a,b)=>a.score-b.score)}
 function inject(){if($("centauriOrientation"))return;const panel=$("centauriPanel");if(!panel)return;const box=document.createElement("div");box.id="centauriOrientation";box.style.marginTop="10px";box.innerHTML='<button id="btnCompareOrientation" class="tool" type="button">VERTAA TULOSTUSASENTOJA</button><div id="orientationResult" class="printer-status" style="margin-top:8px"><span>Asentojen vertailu ei muuta STL-tiedostoa. Se antaa vain suosituksen sliceriin.</span></div>';panel.appendChild(box);$("btnCompareOrientation").onclick=render}
 function render(){inject();const root=$("orientationResult");if(!root)return;const rows=analyse();if(!rows.length){root.innerHTML="<span>Luo ja hyväksy 3D-malli ensin.</span>";return}const best=rows[0],current=rows.find(x=>x.id==="current"),improvement=current&&best.id!=="current"?current.score-best.score:0;let title;if(!best.fits)title="✕ Yksikään tarkastettu asento ei mahdu 256 mm tulostusalueelle";else if(best.id==="current"||improvement<3)title="✓ Nykyinen asento on vertailussa hyvä lähtökohta";else title=`ℹ Slicerissa kannattaa kokeilla: ${best.name}`;const detail=rows.slice(0,3).map((r,i)=>{const pa=r.printability;return `<span>${i+1}. ${r.name} • ${r.fits?"mahtuu":"ei mahdu"} • ${r.dims.map(x=>x.toFixed(1)).join(" × ")} mm${pa?` • jyrkät pinnat ${pa.overhangPct.toFixed(1)} % • pohja ${pa.bedArea.toFixed(1)} mm²`:""}</span>`}).join("");root.className="printer-status "+(best.fits?"ok":"fail");root.innerHTML=`<b>${title}</b>${detail}<span>Tämä on geometrinen vertailu. 3D Studio ei kierrä ladattavaa STL:ää automaattisesti; tee mahdollinen kääntö ElegooSlicerissa, Orcassa tai Curassa ja tarkista tuet.</span>`}
 function refresh(){inject();const root=$("orientationResult");if(root)root.innerHTML="<span>Asentojen vertailu ei muuta STL-tiedostoa. Paina VERTAA TULOSTUSASENTOJA uuden mallin luonnin jälkeen.</span>"}
 function init(){let tries=0;const t=setInterval(()=>{tries++;inject();if($("centauriPanel")||tries>40)clearInterval(t)},100);$("btnGenerate")?.addEventListener("click",()=>setTimeout(refresh,120));document.addEventListener("change",e=>{if(e.target?.id==="material")refresh()})}
 window.CentauriOrientation={analyse,render};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
