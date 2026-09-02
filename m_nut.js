"use strict";
(()=>{
 const oldSetPart=window.AI3D?.setPart,oldGenerate=window.AI3D?.generate;if(!oldSetPart||!oldGenerate)return;
 const el=id=>document.getElementById(id),num=(x,d)=>Number.isFinite(+x)?+x:d;
 let mActive=false,mBase=null;
 function area(p){let a=0;for(let i=0;i<p.length;i++){const j=(i+1)%p.length;a+=p[i][0]*p[j][1]-p[j][0]*p[i][1]}return a/2}
 function sample(poly,n){let p=poly.slice();if(area(p)<0)p=p.reverse();const L=[],C=[0];let total=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);L.push(l);total+=l;C.push(total)}const out=[];for(let k=0;k<n;k++){const s=total*k/n;let i=0;while(i<L.length-1&&C[i+1]<s)i++;const t=L[i]?(s-C[i])/L[i]:0,a=p[i],b=p[(i+1)%p.length];out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}return out}
 function rotateTo(points,target){let best=0,score=1e99;for(let i=0;i<points.length;i++){const dx=points[i][0]-target[0],dy=points[i][1]-target[1],s=dx*dx+dy*dy;if(s<score){score=s;best=i}}return points.slice(best).concat(points.slice(0,best))}
 function ring2(points,z){return points.map(p=>v(p[0],p[1],z))}
 function capPoly(T,pts,z){const flat=[];for(const p of pts)flat.push(p[0],p[1]);const ids=earcut(flat,null,2),vv=ring2(pts,z);for(let i=0;i<ids.length;i+=3)T.push(tri(vv[ids[i]],vv[ids[i+1]],vv[ids[i+2]]))}
 function scalePoly(poly,s){return poly.map(([x,y])=>[x*s,y*s])}
 function buildM(values){
  const p={nutAf:num(values.nutAf,33),clearance:num(values.clearance,.25),lockAmount:num(values.lockAmount,.2),lockZ:num(values.lockZ,7),wall:num(values.wall,2.5),baseHeight:num(values.baseHeight,24),totalHeight:num(values.totalHeight,60),monogramWidth:num(values.monogramWidth,22),monogramDepth:num(values.monogramDepth,18),monogramHeight:num(values.monogramHeight,18)};
  const required=[p.nutAf,p.wall,p.baseHeight,p.totalHeight,p.monogramWidth,p.monogramDepth,p.monogramHeight];
  if(!required.every(x=>Number.isFinite(x)&&x>0)||p.wall<1||p.clearance<0||p.lockAmount<0||p.lockZ<0||p.totalHeight<=p.baseHeight+18||p.monogramHeight>p.totalHeight-p.baseHeight)throw Error("M-piikkimutterisuojuksen mitat eivät ole mahdollisia.");
  const innerAF=p.nutAf+2*p.clearance,lockAF=Math.max(p.nutAf-.1,innerAF-2*p.lockAmount),outerAF=innerAF+2*p.wall,T=[];
  if(innerAF<=0||outerAF<=0||p.lockZ>=p.baseHeight||p.baseHeight<=p.wall)throw Error("M-piikkimutterisuojuksen sovitusmitat eivät ole mahdollisia.");
  const innerTop=p.baseHeight-p.wall,outer0=hexRing(outerAF,0),outer1=hexRing(outerAF,p.baseHeight),inner0=hexRing(innerAF,0),innerLock=hexRing(lockAF,p.lockZ),inner1=hexRing(innerAF,innerTop);
  bridge(T,outer0,outer1);bridge(T,inner0,innerLock,true);bridge(T,innerLock,inner1,true);annulus(T,outer0,inner0,false);cap(T,inner1,innerTop,true);cap(T,outer1,p.baseHeight,true);

  const N=120,mStart=p.totalHeight-p.monogramHeight;
  const W=p.monogramWidth/2,D=p.monogramDepth/2;
  const M=[[-W,-D],[-W,D],[-W*.64,D],[-W*.38,D*.28],[0,-D*.05],[W*.38,D*.28],[W*.64,D],[W,D],[W,-D],[W*.62,-D],[W*.28,-D*.42],[0,-D*.70],[-W*.28,-D*.42],[-W*.62,-D]];
  let top2=rotateTo(sample(M,N),[-W,-D]);

  // Alempi piikkikartio päättyy suoraan siihen kohtaan, johon käyttäjä halusi M-kirjaimen.
  // Yläpuolelle EI rakenneta enää toista kartiota.
  const mBottom=scalePoly(top2,.72);
  const bottomR=Math.max(W*.72,D*.72);
  const cone0=circleRing(outerAF/2*1.02,p.baseHeight-1.2,N);
  let cone1=circleRing(bottomR,mStart,N);
  let cone2=rotateTo(cone1.map(q=>[q.x,q.y]),mBottom[0]);
  bridge(T,cone0,ring2(cone2,mStart));

  // Lyhyt, lähes huomaamaton siirtymä pyöreästä kartion kärjestä M-poikkileikkaukseen.
  const zJoin=mStart+2.0;
  bridge(T,ring2(cone2,mStart),ring2(mBottom,zJoin));

  // Tästä ylöspäin kappale on M-muotoinen kruunu, ei kartio.
  // M levenee vain hieman ylöspäin, jotta liittymä näyttää pehmeältä eikä synny tiimalasia.
  const m82=scalePoly(top2,.82),m92=scalePoly(top2,.92);
  bridge(T,ring2(mBottom,zJoin),ring2(m82,mStart+p.monogramHeight*.42));
  bridge(T,ring2(m82,mStart+p.monogramHeight*.42),ring2(m92,mStart+p.monogramHeight*.72));
  bridge(T,ring2(m92,mStart+p.monogramHeight*.72),ring2(top2,p.totalHeight));
  capPoly(T,top2,p.totalHeight);

  return{triangles:T,name:"M-piikkimutterisuojus",width:Math.max(outerAF,p.monogramWidth),depth:Math.max(outerAF,p.monogramDepth),height:p.totalHeight,measure:[["Kokonaiskorkeus",p.totalHeight],["M alkaa",mStart],["M leveys",p.monogramWidth],["M syvyys",p.monogramDepth],["Ulko-AF",outerAF],["Sisä-AF",innerAF],["Mutteriosa",p.baseHeight]]};
 }
 function finish(mesh){currentFitMesh=null;currentMesh=mesh;const a=validate(mesh),ok=a.ok;el("validation").innerHTML=`<div class="check ${ok?"ok":"fail"}"><strong>${ok?"✓ Automaattitarkistus OK":"✕ Tarkistus epäonnistui"}</strong><br>${a.message}<br>Ylempi kartio on poistettu. Alempi kartio päättyy suoraan M-muotoiseen kruunuun.</div>`;el("btnDownload").disabled=!ok;el("btnFitTest").disabled=true;el("status").textContent=ok?"M-piikkimutterisuojus luotu ja tarkistettu.":"STL-lataus estetty virheen vuoksi.";el("dimensions").textContent=mesh.measure.map(([k,x])=>`${k} ${typeof x==="number"?x.toFixed(2)+" mm":x}`).join(" • ");updateMaterial();draw();setTimeout(()=>window.CentauriProfile?.check?.(),0)}
 function currentValues(){const out={...(mBase||{})};for(const id of["nutAf","clearance","lockAmount","lockZ","wall","baseHeight","totalHeight","tipRadius","material"]){const e=el(id);if(e)out[id]=e.type==="number"?+e.value:e.value}out.monogram="M";return out}
 function fail(e){currentMesh=null;currentFitMesh=null;el("btnDownload").disabled=true;el("btnFitTest").disabled=true;el("dimensions").textContent="–";el("validation").innerHTML=`<div class="check fail"><strong>✕ M-mallin generointi epäonnistui</strong><br>${String(e?.message||e).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</div>`;el("status").textContent="Virhe: "+(e?.message||e);try{draw()}catch{}setTimeout(()=>window.CentauriProfile?.check?.(),0)}
 function generateM(){try{finish(buildM(currentValues()))}catch(e){fail(e)}}
 window.AI3D.setPart=(type,values={})=>{const isM=type==="spike"&&String(values.monogram||"").trim().toUpperCase()==="M";if(!isM){mActive=false;mBase=null;return oldSetPart(type,values)}mActive=true;mBase={...values,monogram:"M"};el("partType").value="spike";updateFields();for(const[k,x]of Object.entries(values))if(el(k))el(k).value=x;generateM()};
 window.AI3D.generate=()=>mActive&&el("partType")?.value==="spike"?generateM():oldGenerate();
 const generateButton=el("btnGenerate");if(generateButton)generateButton.onclick=()=>window.AI3D.generate();
 el("partType")?.addEventListener("change",()=>{if(el("partType").value!=="spike"){mActive=false;mBase=null}});
 el("btnReset")?.addEventListener("click",()=>{mActive=false;mBase=null},true);
})();