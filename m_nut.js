"use strict";
(()=>{
 const oldSetPart=window.AI3D?.setPart;if(!oldSetPart)return;
 const el=id=>document.getElementById(id),num=(x,d)=>Number.isFinite(+x)?+x:d;
 function area(p){let a=0;for(let i=0;i<p.length;i++){const j=(i+1)%p.length;a+=p[i][0]*p[j][1]-p[j][0]*p[i][1]}return a/2}
 function sample(poly,n){let p=poly.slice();if(area(p)<0)p=p.reverse();const lens=[],cum=[0];let total=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length],l=Math.hypot(r[0]-q[0],r[1]-q[1]);lens.push(l);total+=l;cum.push(total)}const out=[];for(let k=0;k<n;k++){const s=total*k/n;let i=0;while(i<lens.length-1&&cum[i+1]<s)i++;const t=lens[i]?(s-cum[i])/lens[i]:0,q=p[i],r=p[(i+1)%p.length];out.push([q[0]+(r[0]-q[0])*t,q[1]+(r[1]-q[1])*t])}return out}
 function align(points){let best=0,score=-1e9;for(let i=0;i<points.length;i++){const [x,y]=points[i],s=x-y*.04;if(s>score){score=s;best=i}}return points.slice(best).concat(points.slice(0,best))}
 function capPoly(T,pts,z){const flat=[];for(const p of pts)flat.push(p[0],p[1]);const ids=earcut(flat,null,2),vv=pts.map(p=>v(p[0],p[1],z));for(let i=0;i<ids.length;i+=3)T.push(tri(vv[ids[i]],vv[ids[i+1]],vv[ids[i+2]]))}
 function ringFrom(points,z){return points.map(p=>v(p[0],p[1],z))}
 function mix(a,b,t,z){return a.map((q,i)=>v(q.x+(b[i].x-q.x)*t,q.y+(b[i].y-q.y)*t,z))}
 function buildM(values){
  const p={nutAf:num(values.nutAf,33),clearance:num(values.clearance,.25),lockAmount:num(values.lockAmount,.2),lockZ:num(values.lockZ,7),wall:num(values.wall,2.5),baseHeight:num(values.baseHeight,24),totalHeight:num(values.totalHeight,60),monogramWidth:num(values.monogramWidth,20),monogramDepth:num(values.monogramDepth,18),monogramHeight:num(values.monogramHeight,18)};
  if(p.wall<1||p.totalHeight<=p.baseHeight+20)throw Error("M-piikkimutterisuojuksen mitat eivät ole mahdollisia.");
  const innerAF=p.nutAf+2*p.clearance,lockAF=Math.max(p.nutAf-.1,innerAF-2*p.lockAmount),outerAF=innerAF+2*p.wall,T=[];
  const innerTop=p.baseHeight-p.wall,outer0=hexRing(outerAF,0),outer1=hexRing(outerAF,p.baseHeight),inner0=hexRing(innerAF,0),innerLock=hexRing(lockAF,p.lockZ),inner1=hexRing(innerAF,innerTop);
  bridge(T,outer0,outer1);bridge(T,inner0,innerLock,true);bridge(T,innerLock,inner1,true);annulus(T,outer0,inner0,false);cap(T,inner1,innerTop,true);cap(T,outer1,p.baseHeight,true);

  const N=96,morphStart=p.totalHeight-p.monogramHeight;
  // Kartio kapenee ensin normaalisti. Sen viimeinen osa ei pääty pisteeseen, vaan alkaa muuttua M:ksi.
  const base=circleRing(outerAF/2*1.02,p.baseHeight-1.2,N);
  const round=circleRing(Math.max(7.0,p.monogramWidth*.36),morphStart,N);
  bridge(T,base,round);

  // Ylhäältä luettava M: leveät ulkosakarat, selvä keskimmäinen V-lovi ja paksu yhtenäinen runko.
  const W=p.monogramWidth/2,D=p.monogramDepth/2;
  const m=[[-W,-D],[-W,D],[ -W*.58,D],[0,D*.12],[W*.58,D],[W,D],[W,-D],[W*.55,-D],[0,-D*.38],[-W*.55,-D]];
  const top2=align(sample(m,N)),top=ringFrom(top2,p.totalHeight);
  let r2=align(round.map(q=>[q.x,q.y]));const r0=ringFrom(r2,morphStart);
  // Useampi loft-vaihe tekee siirtymästä kaarevamman ja estää vaikutelman, että M olisi liimattu kartion päälle.
  const h=p.monogramHeight;
  const a=mix(r0,top,.18,morphStart+h*.22);
  const b=mix(r0,top,.42,morphStart+h*.45);
  const c=mix(r0,top,.68,morphStart+h*.68);
  const d=mix(r0,top,.88,morphStart+h*.86);
  bridge(T,r0,a);bridge(T,a,b);bridge(T,b,c);bridge(T,c,d);bridge(T,d,top);capPoly(T,top2,p.totalHeight);

  return{triangles:T,name:"M-piikkimutterisuojus",width:Math.max(outerAF,p.monogramWidth),depth:Math.max(outerAF,p.monogramDepth),height:p.totalHeight,measure:[["Kokonaiskorkeus",p.totalHeight],["M-muoto alkaa",morphStart],["M leveys",p.monogramWidth],["M syvyys",p.monogramDepth],["Ulko-AF",outerAF],["Sisä-AF",innerAF],["Mutteriosa",p.baseHeight]]};
 }
 function finish(mesh){currentFitMesh=null;currentMesh=mesh;const a=validate(mesh),ok=a.ok;el("validation").innerHTML=`<div class="check ${ok?"ok":"fail"}"><strong>${ok?"✓ Automaattitarkistus OK":"✕ Tarkistus epäonnistui"}</strong><br>${a.message}<br>Piikin kartio muotoutuu nyt viimeisellä osuudella yhtenäisesti ylhäältä luettavaksi M-kirjaimeksi.</div>`;el("btnDownload").disabled=!ok;el("btnFitTest").disabled=true;el("status").textContent=ok?"60 mm M-piikkimutterisuojus luotu. Tarkista YLÄ ja 3D -näkymät.":"STL-lataus estetty virheen vuoksi.";el("dimensions").textContent=mesh.measure.map(([k,x])=>`${k} ${typeof x==="number"?x.toFixed(2)+" mm":x}`).join(" • ");updateMaterial();draw()}
 window.AI3D.setPart=(type,values={})=>{if(type!=="spike"||String(values.monogram||"").toUpperCase()!=="M")return oldSetPart(type,values);el("partType").value="spike";updateFields();for(const[k,x]of Object.entries(values))if(el(k))el(k).value=x;finish(buildM(values))};
})();