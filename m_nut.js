"use strict";
(()=>{
 const oldSetPart=window.AI3D?.setPart;if(!oldSetPart)return;
 const el=id=>document.getElementById(id),num=(x,d)=>Number.isFinite(+x)?+x:d;
 function polygonArea2D(p){let a=0;for(let i=0;i<p.length;i++){const j=(i+1)%p.length;a+=p[i][0]*p[j][1]-p[j][0]*p[i][1]}return a/2}
 function resampleClosed(points,n){let p=points.slice();if(polygonArea2D(p)<0)p=p.reverse();const seg=[],cum=[0];let total=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);seg.push(l);total+=l;cum.push(total)}const out=[];for(let k=0;k<n;k++){const s=total*k/n;let i=0;while(i<seg.length-1&&cum[i+1]<s)i++;const t=seg[i]?((s-cum[i])/seg[i]):0,a=p[i],b=p[(i+1)%p.length];out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}return out}
 function rotateStart(points){let best=0,score=-Infinity;for(let i=0;i<points.length;i++){const [x,y]=points[i],s=x-Math.abs(y)*.15;if(s>score){score=s;best=i}}return points.slice(best).concat(points.slice(0,best))}
 function capPolygon(T,pts,z,up=true){if(typeof earcut!=="function")throw Error("CAD-triangulointikirjasto ei latautunut.");const flat=[];for(const p of pts)flat.push(p[0],p[1]);const ids=earcut(flat,null,2),vtx=pts.map(p=>v(p[0],p[1],z));for(let i=0;i<ids.length;i+=3){const a=vtx[ids[i]],b=vtx[ids[i+1]],c=vtx[ids[i+2]];T.push(up?tri(a,b,c):tri(a,c,b))}}
 function lerpRing(a,b,t,z){return a.map((q,i)=>v(q.x+(b[i].x-q.x)*t,q.y+(b[i].y-q.y)*t,z))}
 function buildM(values){
  const p={nutAf:num(values.nutAf,33),clearance:num(values.clearance,.25),lockAmount:num(values.lockAmount,.2),lockZ:num(values.lockZ,7),wall:num(values.wall,2.5),baseHeight:num(values.baseHeight,24),totalHeight:num(values.totalHeight,60),monogramWidth:num(values.monogramWidth,22),monogramDepth:num(values.monogramDepth,20),monogramHeight:num(values.monogramHeight,14)};
  if(p.wall<1||p.totalHeight<=p.baseHeight+20)throw Error("M-piikkimutterisuojuksen mitat eivät ole mahdollisia.");
  const innerAF=p.nutAf+2*p.clearance,lockAF=Math.max(p.nutAf-.1,innerAF-2*p.lockAmount),outerAF=innerAF+2*p.wall,T=[];
  const innerTop=p.baseHeight-p.wall,outer0=hexRing(outerAF,0),outer1=hexRing(outerAF,p.baseHeight),inner0=hexRing(innerAF,0),innerLock=hexRing(lockAF,p.lockZ),inner1=hexRing(innerAF,innerTop);
  bridge(T,outer0,outer1);bridge(T,inner0,innerLock,true);bridge(T,innerLock,inner1,true);annulus(T,outer0,inner0,false);cap(T,inner1,innerTop,true);cap(T,outer1,p.baseHeight,true);

  const N=80,morphStart=p.totalHeight-p.monogramHeight;
  const coneBase=circleRing(outerAF/2*1.02,p.baseHeight-1.2,N);
  const coneTip=circleRing(Math.max(4.8,p.monogramWidth*.23),morphStart,N);
  bridge(T,coneBase,coneTip);

  // Selkeä M-siluetti ylhäältä: kaksi pystysakaraa ja syvä V-lovi keskellä.
  const W=p.monogramWidth/2,D=p.monogramDepth/2;
  const outline=[[-W,-D],[-W,D],[-W*.52,D],[0,D*.10],[W*.52,D],[W,D],[W,-D],[W*.52,-D],[0,-D*.25],[-W*.52,-D]];
  const sampled=rotateStart(resampleClosed(outline,N));
  const target=sampled.map(([x,y])=>v(x,y,p.totalHeight));
  // Kierrä myös ympyrärengas samaan aloituskohtaan, jotta pinta ei ristiinny.
  let circlePts=coneTip.map(q=>[q.x,q.y]);circlePts=rotateStart(circlePts);const c0=circlePts.map(([x,y])=>v(x,y,morphStart));
  const z1=morphStart+p.monogramHeight*.35,z2=morphStart+p.monogramHeight*.72;
  const r1=lerpRing(c0,target,.35,z1),r2=lerpRing(c0,target,.72,z2);
  bridge(T,c0,r1);bridge(T,r1,r2);bridge(T,r2,target);
  capPolygon(T,sampled,p.totalHeight,true);

  return{triangles:T,name:"M-piikkimutterisuojus",width:Math.max(outerAF,p.monogramWidth),depth:Math.max(outerAF,p.monogramDepth),height:p.totalHeight,measure:[["Kokonaiskorkeus",p.totalHeight],["M-muoto alkaa",morphStart],["M leveys",p.monogramWidth],["M syvyys",p.monogramDepth],["Ulko-AF",outerAF],["Sisä-AF",innerAF],["Mutteriosa",p.baseHeight]]};
 }
 function finish(mesh){currentFitMesh=null;currentMesh=mesh;const a=validate(mesh),ok=a.ok;el("validation").innerHTML=`<div class="check ${ok?"ok":"fail"}"><strong>${ok?"✓ Automaattitarkistus OK":"✕ Tarkistus epäonnistui"}</strong><br>${a.message}<br>Kartio muuttuu asteittain selkeäksi M-siluetiksi. Tarkista YLÄ-näkymä.</div>`;el("btnDownload").disabled=!ok;el("btnFitTest").disabled=true;el("status").textContent=ok?"60 mm M-piikkimutterisuojus luotu. YLÄ-näkymässä kärjen pitää muodostaa selkeä M.":"STL-lataus estetty virheen vuoksi.";el("dimensions").textContent=mesh.measure.map(([k,x])=>`${k} ${typeof x==="number"?x.toFixed(2)+" mm":x}`).join(" • ");updateMaterial();draw()}
 window.AI3D.setPart=(type,values={})=>{if(type!=="spike"||String(values.monogram||"").toUpperCase()!=="M")return oldSetPart(type,values);el("partType").value="spike";updateFields();for(const[k,x]of Object.entries(values))if(el(k))el(k).value=x;finish(buildM(values))};
})();