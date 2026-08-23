"use strict";

const $ = id => document.getElementById(id);
const canvas = $("preview");
const ctx = canvas.getContext("2d");
let currentMesh = null;
let currentFitMesh = null;
let drag = false, lastX = 0, lastY = 0, yaw = -0.55, pitch = 0.32;

const defaults = {nutAf:33,clearance:.25,wall:2.5,baseHeight:24,totalHeight:75,tipRadius:.7};

function params(){
  const p={};
  for(const k of Object.keys(defaults)) p[k]=Number($(k).value);
  if(!Object.values(p).every(Number.isFinite)) throw new Error("Tarkista mitat.");
  if(p.nutAf<=0) throw new Error("Mutterin avainkoon pitää olla positiivinen.");
  if(p.clearance<0) throw new Error("Välys ei voi olla negatiivinen.");
  if(p.wall<1) throw new Error("Seinämän pitää olla vähintään 1 mm.");
  if(p.baseHeight<5) throw new Error("Mutteriosan korkeus on liian pieni.");
  if(p.totalHeight<=p.baseHeight+5) throw new Error("Kokonaiskorkeuden pitää olla selvästi mutteriosaa suurempi.");
  if(p.tipRadius<=0 || p.tipRadius>p.wall*2) throw new Error("Kärjen pyöristyksen arvo ei ole järkevä suhteessa seinämään.");
  return p;
}

const v=(x,y,z)=>({x,y,z});
const tri=(a,b,c)=>[a,b,c];
function normal(t){
  const [a,b,c]=t,u=v(b.x-a.x,b.y-a.y,b.z-a.z),w=v(c.x-a.x,c.y-a.y,c.z-a.z);
  const n=v(u.y*w.z-u.z*w.y,u.z*w.x-u.x*w.z,u.x*w.y-u.y*w.x),l=Math.hypot(n.x,n.y,n.z)||1;
  return v(n.x/l,n.y/l,n.z/l);
}

function hexRadiusFromAF(af){return af/Math.sqrt(3)}
function ring(radius,z,n=6,phase=Math.PI/6){
  return Array.from({length:n},(_,i)=>v(radius*Math.cos(phase+i*2*Math.PI/n),radius*Math.sin(phase+i*2*Math.PI/n),z));
}

function buildMesh(p){
  const innerAF=p.nutAf+2*p.clearance;
  const outerAF=innerAF+2*p.wall;
  const ri=hexRadiusFromAF(innerAF), ro=hexRadiusFromAF(outerAF);
  const innerTop=Math.max(p.wall+1,p.baseHeight-p.wall);
  const tipBaseZ=Math.max(p.baseHeight+1,p.totalHeight-p.tipRadius);
  const tipR=Math.max(.15,Math.min(p.tipRadius,ro*.25));

  const outer0=ring(ro,0,6);
  const outerB=ring(ro,p.baseHeight,6);
  const inner0=ring(ri,0,6);
  const innerB=ring(ri,innerTop,6);
  const tipRing=ring(tipR,tipBaseZ,6);
  const apex=v(0,0,p.totalHeight);
  const T=[];

  for(let i=0;i<6;i++){
    const j=(i+1)%6;
    T.push(tri(outer0[i],outer0[j],outerB[j]),tri(outer0[i],outerB[j],outerB[i]));
  }
  for(let i=0;i<6;i++){
    const j=(i+1)%6;
    T.push(tri(inner0[i],innerB[j],inner0[j]),tri(inner0[i],innerB[i],innerB[j]));
  }
  for(let i=0;i<6;i++){
    const j=(i+1)%6;
    T.push(tri(outer0[i],inner0[j],outer0[j]),tri(outer0[i],inner0[i],inner0[j]));
  }
  for(let i=0;i<6;i++){
    const j=(i+1)%6;
    T.push(tri(innerB[i],outerB[j],innerB[j]),tri(innerB[i],outerB[i],outerB[j]));
  }
  for(let i=0;i<6;i++){
    const j=(i+1)%6;
    T.push(tri(outerB[i],outerB[j],tipRing[j]),tri(outerB[i],tipRing[j],tipRing[i]));
  }
  for(let i=0;i<6;i++){
    const j=(i+1)%6;
    T.push(tri(tipRing[i],tipRing[j],apex));
  }

  return {triangles:T,innerAF,outerAF,height:p.totalHeight,kind:"full"};
}

function buildFitMesh(p){
  const innerAF=p.nutAf+2*p.clearance;
  const outerAF=innerAF+2*p.wall;
  const ri=hexRadiusFromAF(innerAF), ro=hexRadiusFromAF(outerAF), h=8;
  const outer0=ring(ro,0,6), outer1=ring(ro,h,6), inner0=ring(ri,0,6), inner1=ring(ri,h,6);
  const T=[];
  for(let i=0;i<6;i++){
    const j=(i+1)%6;
    T.push(tri(outer0[i],outer0[j],outer1[j]),tri(outer0[i],outer1[j],outer1[i]));
    T.push(tri(inner0[i],inner1[j],inner0[j]),tri(inner0[i],inner1[i],inner1[j]));
    T.push(tri(outer0[i],inner0[j],outer0[j]),tri(outer0[i],inner0[i],inner0[j]));
    T.push(tri(outer1[i],outer1[j],inner1[j]),tri(outer1[i],inner1[j],inner1[i]));
  }
  return {triangles:T,innerAF,outerAF,height:h,kind:"fit"};
}

function keyPoint(q){return `${q.x.toFixed(6)},${q.y.toFixed(6)},${q.z.toFixed(6)}`}
function edgeKey(a,b){const A=keyPoint(a),B=keyPoint(b);return A<B?`${A}|${B}`:`${B}|${A}`}

function validateMesh(mesh){
  if(!mesh || !mesh.triangles.length) return {ok:false,message:"Mesh puuttuu."};
  const edges=new Map();
  let degenerate=0;
  for(const t of mesh.triangles){
    if(t.some(q=>![q.x,q.y,q.z].every(Number.isFinite))) return {ok:false,message:"Mesh sisältää virheellisen koordinaatin."};
    const n=normal(t);
    const [a,b,c]=t;
    const area2=Math.hypot(
      (b.y-a.y)*(c.z-a.z)-(b.z-a.z)*(c.y-a.y),
      (b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z),
      (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
    );
    if(area2<1e-8 || ![n.x,n.y,n.z].every(Number.isFinite)) degenerate++;
    [[a,b],[b,c],[c,a]].forEach(([p1,p2])=>{const k=edgeKey(p1,p2);edges.set(k,(edges.get(k)||0)+1)});
  }
  const badEdges=[...edges.values()].filter(n=>n!==2).length;
  if(degenerate) return {ok:false,message:`Meshissä on ${degenerate} nollapinta-alaista kolmiota.`};
  if(badEdges) return {ok:false,message:`Mesh ei ole suljettu: ${badEdges} reunaa ei jakaudu täsmälleen kahdelle pinnalle.`};
  return {ok:true,message:`Suljettu manifold-mesh: ${mesh.triangles.length} kolmiota, ${edges.size} tarkistettua reunaa.`};
}

function stl(mesh,name){
  let s=`solid ${name}\n`;
  for(const t of mesh.triangles){
    const n=normal(t);
    s+=` facet normal ${n.x} ${n.y} ${n.z}\n  outer loop\n`;
    for(const q of t)s+=`   vertex ${q.x} ${q.y} ${q.z}\n`;
    s+="  endloop\n endfacet\n";
  }
  return s+`endsolid ${name}\n`;
}

function project(q,scale,cx,cy){
  const x=q.x*Math.cos(yaw)-q.y*Math.sin(yaw), y=q.x*Math.sin(yaw)+q.y*Math.cos(yaw), z=q.z;
  const yy=y*Math.cos(pitch)-z*Math.sin(pitch), zz=y*Math.sin(pitch)+z*Math.cos(pitch);
  return {x:cx+x*scale,y:cy-zz*scale,d:yy};
}

function draw(){
  const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
  if(!currentMesh){ctx.fillStyle="#94a3b8";ctx.font="22px system-ui";ctx.textAlign="center";ctx.fillText("Paina LUO JA TARKISTA MALLI",W/2,H/2);return;}
  const scale=Math.min(W/(currentMesh.outerAF*3.1),H/(currentMesh.height*1.45));
  const faces=currentMesh.triangles.map(t=>{const p=t.map(q=>project(q,scale,W/2,H*.82));return {p,d:p.reduce((a,b)=>a+b.d,0)/3};}).sort((a,b)=>a.d-b.d);
  for(const f of faces){
    ctx.beginPath();ctx.moveTo(f.p[0].x,f.p[0].y);ctx.lineTo(f.p[1].x,f.p[1].y);ctx.lineTo(f.p[2].x,f.p[2].y);ctx.closePath();
    ctx.fillStyle="rgba(20,184,166,.72)";ctx.fill();ctx.strokeStyle="rgba(153,246,228,.34)";ctx.lineWidth=.8;ctx.stroke();
  }
}

function setValidation(fullCheck,fitCheck){
  const ok=fullCheck.ok&&fitCheck.ok;
  $("validation").innerHTML=`<div class="check ${ok?"ok":"fail"}"><strong>${ok?"✓ Automaattitarkistus OK":"✕ Automaattitarkistus epäonnistui"}</strong><br>${fullCheck.message}<br>Sovitustesti: ${fitCheck.message}</div>`;
  return ok;
}

function generate(){
  try{
    const p=params();
    currentMesh=buildMesh(p);
    currentFitMesh=buildFitMesh(p);
    const fullCheck=validateMesh(currentMesh),fitCheck=validateMesh(currentFitMesh);
    const valid=setValidation(fullCheck,fitCheck);
    $("btnDownload").disabled=!valid;
    $("btnFitTest").disabled=!valid;
    $("status").textContent=valid?`Malli luotu ja tarkistettu. Sisä-AF = ${currentMesh.innerAF.toFixed(2)} mm. Tulosta ensin sovitustesti.`:"Mallia ei anneta ladattavaksi ennen kuin mesh-tarkistus menee läpi.";
    $("dimensions").textContent=`Sisä-AF ${currentMesh.innerAF.toFixed(2)} mm • Ulko-AF ${currentMesh.outerAF.toFixed(2)} mm • Korkeus ${currentMesh.height.toFixed(1)} mm`;
    draw();
  }catch(e){
    $("status").textContent="Virhe: "+e.message;
    $("validation").innerHTML="";
    currentMesh=null;currentFitMesh=null;
    $("btnDownload").disabled=true;$("btnFitTest").disabled=true;draw();
  }
}

function saveMesh(mesh,filename,name){
  const blob=new Blob([stl(mesh,name)],{type:"model/stl"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function download(){if(currentMesh)saveMesh(currentMesh,"piikkimutterinsuojus_33mm_v0.2.stl","piikkimutterinsuojus_33mm_v02")}
function downloadFit(){if(currentFitMesh)saveMesh(currentFitMesh,"piikkimutteri_33mm_sovitustesti_v0.2.stl","piikkimutteri_33mm_sovitustesti_v02")}
function reset(){for(const [k,val] of Object.entries(defaults))$(k).value=val;generate();}

$("btnGenerate").addEventListener("click",generate);
$("btnDownload").addEventListener("click",download);
$("btnFitTest").addEventListener("click",downloadFit);
$("btnReset").addEventListener("click",reset);
canvas.addEventListener("pointerdown",e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{if(!drag)return;yaw+=(e.clientX-lastX)*.008;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;draw()});
canvas.addEventListener("pointerup",()=>drag=false);
canvas.addEventListener("pointercancel",()=>drag=false);

generate();
