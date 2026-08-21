"use strict";

const $ = id => document.getElementById(id);
const canvas = $("preview");
const ctx = canvas.getContext("2d");
let currentMesh = null;
let drag = false, lastX = 0, lastY = 0, yaw = -0.55, pitch = 0.32;

const defaults = {nutAf:33,clearance:.25,wall:2.5,baseHeight:24,totalHeight:75,tipRadius:.7};

function params(){
  const p={}; for(const k of Object.keys(defaults)) p[k]=Number($(k).value);
  if(!Object.values(p).every(Number.isFinite)) throw new Error("Tarkista mitat.");
  if(p.totalHeight<=p.baseHeight+5) throw new Error("Kokonaiskorkeuden pitää olla selvästi mutteriosaa suurempi.");
  if(p.wall<1) throw new Error("Seinämän pitää olla vähintään 1 mm.");
  return p;
}

const v=(x,y,z)=>({x,y,z});
function tri(a,b,c){return [a,b,c]}
function normal(t){
  const [a,b,c]=t,u=v(b.x-a.x,b.y-a.y,b.z-a.z),w=v(c.x-a.x,c.y-a.y,c.z-a.z);
  const n=v(u.y*w.z-u.z*w.y,u.z*w.x-u.x*w.z,u.x*w.y-u.y*w.x),l=Math.hypot(n.x,n.y,n.z)||1;
  return v(n.x/l,n.y/l,n.z/l);
}

function hexRadiusFromAF(af){return af/Math.sqrt(3)}
function ring(radius,z,n=6,phase=Math.PI/6){return Array.from({length:n},(_,i)=>v(radius*Math.cos(phase+i*2*Math.PI/n),radius*Math.sin(phase+i*2*Math.PI/n),z))}

function buildMesh(p){
  // Hexagonal press-on cap with closed pointed top and open bottom.
  // Inner across-flats = nominal nut AF + 2*clearance.
  const innerAF=p.nutAf+2*p.clearance;
  const outerAF=innerAF+2*p.wall;
  const ri=hexRadiusFromAF(innerAF), ro=hexRadiusFromAF(outerAF);
  const innerTop=Math.max(4,p.baseHeight-p.wall);
  const outer0=ring(ro,0), outerB=ring(ro,p.baseHeight);
  const inner0=ring(ri,0), innerB=ring(ri,innerTop);
  const tipZ=p.totalHeight;
  const tipR=Math.min(p.tipRadius,ro*.3);
  const tipRing=ring(tipR,tipZ-p.tipRadius,12,0);
  const shoulder=ring(ro,p.baseHeight,12,0);
  const T=[];

  // Outer hex base walls.
  for(let i=0;i<6;i++){let j=(i+1)%6;T.push(tri(outer0[i],outer0[j],outerB[j]),tri(outer0[i],outerB[j],outerB[i]));}
  // Inner cavity walls, reversed winding.
  for(let i=0;i<6;i++){let j=(i+1)%6;T.push(tri(inner0[i],innerB[j],inner0[j]),tri(inner0[i],innerB[i],innerB[j]));}
  // Bottom rim joins inner and outer but leaves center open.
  for(let i=0;i<6;i++){let j=(i+1)%6;T.push(tri(outer0[i],inner0[j],outer0[j]),tri(outer0[i],inner0[i],inner0[j]));}
  // Roof over nut cavity, joining inner top to outer shoulder.
  for(let i=0;i<6;i++){let j=(i+1)%6;T.push(tri(innerB[i],outerB[j],innerB[j]),tri(innerB[i],outerB[i],outerB[j]));}
  // Cone from 12-sided shoulder to small tip ring.
  for(let i=0;i<12;i++){let j=(i+1)%12;T.push(tri(shoulder[i],shoulder[j],tipRing[j]),tri(shoulder[i],tipRing[j],tipRing[i]));}
  // Rounded-ish tiny tip closure.
  const apex=v(0,0,tipZ);
  for(let i=0;i<12;i++){let j=(i+1)%12;T.push(tri(tipRing[i],tipRing[j],apex));}
  return {triangles:T,innerAF,outerAF,height:p.totalHeight};
}

function stl(mesh){
  let s="solid piikkimutterinsuojus_33mm\n";
  for(const t of mesh.triangles){const n=normal(t);s+=` facet normal ${n.x} ${n.y} ${n.z}\n  outer loop\n`;for(const q of t)s+=`   vertex ${q.x} ${q.y} ${q.z}\n`;s+="  endloop\n endfacet\n";}
  return s+"endsolid piikkimutterinsuojus_33mm\n";
}

function project(q,scale,cx,cy){
  let x=q.x*Math.cos(yaw)-q.y*Math.sin(yaw), y=q.x*Math.sin(yaw)+q.y*Math.cos(yaw), z=q.z;
  let yy=y*Math.cos(pitch)-z*Math.sin(pitch), zz=y*Math.sin(pitch)+z*Math.cos(pitch);
  return {x:cx+x*scale,y:cy-zz*scale,d:yy};
}
function draw(){
  const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
  if(!currentMesh){ctx.fillStyle="#94a3b8";ctx.font="22px system-ui";ctx.textAlign="center";ctx.fillText("Paina LUO MALLI",W/2,H/2);return;}
  const scale=Math.min(W/(currentMesh.outerAF*3.1),H/(currentMesh.height*1.45));
  const faces=currentMesh.triangles.map(t=>{const p=t.map(q=>project(q,scale,W/2,H*.82));return {p,d:p.reduce((a,b)=>a+b.d,0)/3};}).sort((a,b)=>a.d-b.d);
  for(const f of faces){ctx.beginPath();ctx.moveTo(f.p[0].x,f.p[0].y);ctx.lineTo(f.p[1].x,f.p[1].y);ctx.lineTo(f.p[2].x,f.p[2].y);ctx.closePath();ctx.fillStyle="rgba(20,184,166,.72)";ctx.fill();ctx.strokeStyle="rgba(153,246,228,.34)";ctx.lineWidth=.8;ctx.stroke();}
}

function generate(){
  try{const p=params();currentMesh=buildMesh(p);$("btnDownload").disabled=false;$("status").textContent=`Malli luotu: ${currentMesh.triangles.length} kolmiota. Tulosta ensin 1 koekappale.`;$("dimensions").textContent=`Sisä-AF ${currentMesh.innerAF.toFixed(2)} mm • Ulko-AF ${currentMesh.outerAF.toFixed(2)} mm • Korkeus ${currentMesh.height.toFixed(1)} mm`;draw();}
  catch(e){$("status").textContent="Virhe: "+e.message;currentMesh=null;$("btnDownload").disabled=true;draw();}
}
function download(){if(!currentMesh)return;const blob=new Blob([stl(currentMesh)],{type:"model/stl"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="piikkimutterinsuojus_33mm_v1.stl";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function reset(){for(const [k,val] of Object.entries(defaults))$(k).value=val;generate();}

$("btnGenerate").addEventListener("click",generate);$("btnDownload").addEventListener("click",download);$("btnReset").addEventListener("click",reset);
canvas.addEventListener("pointerdown",e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{if(!drag)return;yaw+=(e.clientX-lastX)*.008;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;draw()});
canvas.addEventListener("pointerup",()=>drag=false);canvas.addEventListener("pointercancel",()=>drag=false);
generate();
