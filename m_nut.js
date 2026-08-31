"use strict";
(()=>{
 const oldSetPart=window.AI3D?.setPart;
 if(!oldSetPart)return;
 const el=id=>document.getElementById(id);
 const num=(x,d)=>Number.isFinite(+x)?+x:d;
 function prismXZ(points,depth){
  if(typeof earcut!=="function")throw Error("CAD-triangulointikirjasto ei latautunut.");
  const y0=-depth/2,y1=depth/2,T=[],flat=[];
  for(const p of points)flat.push(p[0],p[1]);
  const ids=earcut(flat,null,2),a=points.map(p=>v(p[0],y0,p[1])),b=points.map(p=>v(p[0],y1,p[1]));
  for(let i=0;i<ids.length;i+=3){const i0=ids[i],i1=ids[i+1],i2=ids[i+2];T.push(tri(a[i0],a[i2],a[i1]),tri(b[i0],b[i1],b[i2]))}
  for(let i=0;i<points.length;i++){const j=(i+1)%points.length;T.push(tri(a[i],a[j],b[j]),tri(a[i],b[j],b[i]))}
  return T;
 }
 function closedFrustum(r0,r1,z0,z1,n=32){const a=circleRing(r0,z0,n),b=circleRing(r1,z1,n),T=[];bridge(T,a,b);cap(T,a,z0,false);cap(T,b,z1,true);return T}
 function buildM(values){
  const p={nutAf:num(values.nutAf,33),clearance:num(values.clearance,.25),lockAmount:num(values.lockAmount,.2),lockZ:num(values.lockZ,7),wall:num(values.wall,2.5),baseHeight:num(values.baseHeight,24),totalHeight:num(values.totalHeight,60),monogramWidth:num(values.monogramWidth,18),monogramDepth:num(values.monogramDepth,6),monogramHeight:num(values.monogramHeight,10),neckRadius:num(values.neckRadius,5.5)};
  if(p.wall<1||p.baseHeight<12||p.totalHeight<=p.baseHeight+22)throw Error("M-piikkimutterisuojuksen mitat eivät ole mahdollisia.");
  const innerAF=p.nutAf+2*p.clearance,lockAF=Math.max(p.nutAf-.1,innerAF-2*p.lockAmount),outerAF=innerAF+2*p.wall;
  const innerTop=p.baseHeight-p.wall,outer0=hexRing(outerAF,0),outer1=hexRing(outerAF,p.baseHeight),inner0=hexRing(innerAF,0),innerLock=hexRing(lockAF,p.lockZ),inner1=hexRing(innerAF,innerTop),T=[];
  bridge(T,outer0,outer1);bridge(T,inner0,innerLock,true);bridge(T,innerLock,inner1,true);annulus(T,outer0,inner0,false);cap(T,inner1,innerTop,true);cap(T,outer1,p.baseHeight,true);
  const letterTop=p.totalHeight,letterBottom=letterTop-p.monogramHeight,neckTop=letterBottom+1.0,neckBottom=p.baseHeight-1.2;
  T.push(...closedFrustum(outerAF/2*1.02,p.neckRadius,neckBottom,neckTop,40));
  // Selkeä oikeinpäin oleva iso M. Alareuna limittää piikin kaulaan, jolloin siluetti jatkuu yhtenäisenä.
  const w=p.monogramWidth,h=p.monogramHeight,z0=letterBottom;
  const raw=[[-.50,0],[-.50,1],[-.28,1],[0,.48],[.28,1],[.50,1],[.50,0],[.30,0],[.30,.62],[.08,.20],[-.08,.20],[-.30,.62],[-.30,0]];
  const pts=raw.map(([x,y])=>[x*w,z0+y*h]);
  T.push(...prismXZ(pts,p.monogramDepth));
  return{triangles:T,name:"M-piikkimutterisuojus",width:Math.max(outerAF,p.monogramWidth),depth:Math.max(outerAF,p.monogramDepth),height:p.totalHeight,measure:[["Kokonaiskorkeus",p.totalHeight],["Piikkiosa",letterBottom-p.baseHeight],["M korkeus",p.monogramHeight],["M leveys",p.monogramWidth],["M paksuus",p.monogramDepth],["Ulko-AF",outerAF],["Sisä-AF",innerAF],["Lukitus-AF",lockAF],["Mutteriosa",p.baseHeight]]};
 }
 function finish(mesh){currentFitMesh=null;currentMesh=mesh;const a=validate(mesh),ok=a.ok;el("validation").innerHTML=`<div class="check ${ok?"ok":"fail"}"><strong>${ok?"✓ Automaattitarkistus OK":"✕ Tarkistus epäonnistui"}</strong><br>${a.message}<br>Piikin kärjessä on nyt selkeä oikeinpäin oleva M-kirjain.</div>`;el("btnDownload").disabled=!ok;el("btnFitTest").disabled=true;el("status").textContent=ok?"60 mm M-piikkimutterisuojus luotu. Tarkista M edestä ja sivulta ennen STL-vientiä.":"STL-lataus estetty virheen vuoksi.";el("dimensions").textContent=mesh.measure.map(([k,x])=>`${k} ${typeof x==="number"?x.toFixed(2)+" mm":x}`).join(" • ");updateMaterial();draw()}
 window.AI3D.setPart=(type,values={})=>{if(type!=="spike"||String(values.monogram||"").toUpperCase()!=="M")return oldSetPart(type,values);el("partType").value="spike";updateFields();for(const[k,x]of Object.entries(values))if(el(k))el(k).value=x;finish(buildM(values))};
})();