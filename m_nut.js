"use strict";
(()=>{
 const oldSetPart=window.AI3D?.setPart;if(!oldSetPart)return;
 const el=id=>document.getElementById(id),num=(x,d)=>Number.isFinite(+x)?+x:d;
 function area(p){let a=0;for(let i=0;i<p.length;i++){const j=(i+1)%p.length;a+=p[i][0]*p[j][1]-p[j][0]*p[i][1]}return a/2}
 function sample(poly,n){let p=poly.slice();if(area(p)<0)p=p.reverse();const L=[],C=[0];let total=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);L.push(l);total+=l;C.push(total)}const out=[];for(let k=0;k<n;k++){const s=total*k/n;let i=0;while(i<L.length-1&&C[i+1]<s)i++;const t=L[i]?(s-C[i])/L[i]:0,a=p[i],b=p[(i+1)%p.length];out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}return out}
 function rotateTo(points,target){let best=0,score=1e99;for(let i=0;i<points.length;i++){const dx=points[i][0]-target[0],dy=points[i][1]-target[1],s=dx*dx+dy*dy;if(s<score){score=s;best=i}}return points.slice(best).concat(points.slice(0,best))}
 function ring2(points,z){return points.map(p=>v(p[0],p[1],z))}
 function capPoly(T,pts,z){const flat=[];for(const p of pts)flat.push(p[0],p[1]);const ids=earcut(flat,null,2),vv=ring2(pts,z);for(let i=0;i<ids.length;i+=3)T.push(tri(vv[ids[i]],vv[ids[i+1]],vv[ids[i+2]]))}
 function scalePoly(poly,s){return poly.map(([x,y])=>[x*s,y*s])}
 function buildM(values){
  const p={nutAf:num(values.nutAf,33),clearance:num(values.clearance,.25),lockAmount:num(values.lockAmount,.2),lockZ:num(values.lockZ,7),wall:num(values.wall,2.5),baseHeight:num(values.baseHeight,24),totalHeight:num(values.totalHeight,60),monogramWidth:num(values.monogramWidth,22),monogramDepth:num(values.monogramDepth,18),monogramHeight:num(values.monogramHeight,18)};
  if(p.wall<1||p.totalHeight<=p.baseHeight+18)throw Error("M-piikkimutterisuojuksen mitat eivät ole mahdollisia.");
  const innerAF=p.nutAf+2*p.clearance,lockAF=Math.max(p.nutAf-.1,innerAF-2*p.lockAmount),outerAF=innerAF+2*p.wall,T=[];
  const innerTop=p.baseHeight-p.wall,outer0=hexRing(outerAF,0),outer1=hexRing(outerAF,p.baseHeight),inner0=hexRing(innerAF,0),innerLock=hexRing(lockAF,p.lockZ),inner1=hexRing(innerAF,innerTop);
  bridge(T,outer0,outer1);bridge(T,inner0,innerLock,true);bridge(T,innerLock,inner1,true);annulus(T,outer0,inner0,false);cap(T,inner1,innerTop,true);cap(T,outer1,p.baseHeight,true);

  const N=120,morphStart=p.totalHeight-p.monogramHeight;
  // Kartio kapenee vain siihen kokoon, josta M voi jatkua ylöspäin ilman uudelleen levenevää tiimalasikaulaa.
  const cone0=circleRing(outerAF/2*1.02,p.baseHeight-1.2,N);
  const joinRadius=Math.max(p.monogramWidth*.47,p.monogramDepth*.52);
  const cone1=circleRing(joinRadius,morphStart,N);
  bridge(T,cone0,cone1);

  const W=p.monogramWidth/2,D=p.monogramDepth/2;
  const M=[[-W,-D],[-W,D],[-W*.64,D],[-W*.38,D*.28],[0,-D*.05],[W*.38,D*.28],[W*.64,D],[W,D],[W,-D],[W*.62,-D],[W*.28,-D*.42],[0,-D*.70],[-W*.28,-D*.42],[-W*.62,-D]];
  let top2=rotateTo(sample(M,N),[-W,-D]);
  let round2=rotateTo(cone1.map(q=>[q.x,q.y]),top2[0]);
  const h=p.monogramHeight;
  // Muoto vaihtuu ympyrästä M:ksi, mutta kokonaisleveys ei enää kasva ylöspäin.
  // Ensimmäinen M-poikkileikkaus on lähes lopullisen kokoinen, jolloin sivusiluetti jatkaa kartion kapenemista suoraviivaisesti.
  const m92=scalePoly(top2,.92),m95=scalePoly(top2,.95),m98=scalePoly(top2,.98);
  const levels=[
   {z:morphStart,poly:round2},
   {z:morphStart+h*.24,poly:m92},
   {z:morphStart+h*.50,poly:m95},
   {z:morphStart+h*.75,poly:m98},
   {z:p.totalHeight,poly:top2}
  ];
  for(let i=0;i<levels.length-1;i++)bridge(T,ring2(levels[i].poly,levels[i].z),ring2(levels[i+1].poly,levels[i+1].z));
  capPoly(T,top2,p.totalHeight);

  return{triangles:T,name:"M-piikkimutterisuojus",width:Math.max(outerAF,p.monogramWidth),depth:Math.max(outerAF,p.monogramDepth),height:p.totalHeight,measure:[["Kokonaiskorkeus",p.totalHeight],["M-muoto alkaa",morphStart],["M leveys",p.monogramWidth],["M syvyys",p.monogramDepth],["Ulko-AF",outerAF],["Sisä-AF",innerAF],["Mutteriosa",p.baseHeight]]};
 }
 function finish(mesh){currentFitMesh=null;currentMesh=mesh;const a=validate(mesh),ok=a.ok;el("validation").innerHTML=`<div class="check ${ok?"ok":"fail"}"><strong>${ok?"✓ Automaattitarkistus OK":"✕ Tarkistus epäonnistui"}</strong><br>${a.message}<br>Tiimalasikaula poistettu: kartio jatkuu nyt yhtenäisesti M-kärkeen.</div>`;el("btnDownload").disabled=!ok;el("btnFitTest").disabled=true;el("status").textContent=ok?"60 mm M-piikkimutterisuojus luotu ilman tiimalasikaulaa.":"STL-lataus estetty virheen vuoksi.";el("dimensions").textContent=mesh.measure.map(([k,x])=>`${k} ${typeof x==="number"?x.toFixed(2)+" mm":x}`).join(" • ");updateMaterial();draw()}
 window.AI3D.setPart=(type,values={})=>{if(type!=="spike"||String(values.monogram||"").toUpperCase()!=="M")return oldSetPart(type,values);el("partType").value="spike";updateFields();for(const[k,x]of Object.entries(values))if(el(k))el(k).value=x;finish(buildM(values))};
})();