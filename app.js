"use strict";

const $ = id => document.getElementById(id);
const canvas = $("preview");
const ctx = canvas.getContext("2d");
let currentMesh = null;
let currentFitMesh = null;
let drag = false, lastX = 0, lastY = 0, yaw = -0.55, pitch = 0.32;

const defaults = {
  nutAf:33,
  clearance:.25,
  lockAmount:.20,
  lockZ:7,
  wall:2.5,
  baseHeight:24,
  totalHeight:75,
  tipRadius:.8,
  material:"ASA"
};

const materialProfiles = {
  PLA:{label:"PLA",use:"Koekappaleet ja sisäkäyttö",nozzle:"210–220 °C",bed:"55–60 °C",note:"Helpoin materiaalivalinta ensimmäisiin sovitustesteihin."},
  PETG:{label:"PETG",use:"Käyttöosat ja kohtalainen ulkokäyttö",nozzle:"235–250 °C",bed:"70–85 °C",note:"Sitkeä ja helppo vaihtoehto ennen ASA:aa."},
  ASA:{label:"ASA",use:"Ulkokäyttö, UV ja sää",nozzle:"250–270 °C",bed:"90–105 °C",note:"Suositus lopulliseen rekkaosaan suljetulla tulostimella."}
};

function params(){
  const p={};
  for(const k of ["nutAf","clearance","lockAmount","lockZ","wall","baseHeight","totalHeight","tipRadius"]) p[k]=Number($(k).value);
  p.material=$("material").value;
  if(!Object.values(p).filter(v=>typeof v==="number").every(Number.isFinite)) throw new Error("Tarkista mitat.");
  if(p.nutAf<=0) throw new Error("Mutterin avainkoon pitää olla positiivinen.");
  if(p.clearance<0) throw new Error("Välys ei voi olla negatiivinen.");
  if(p.lockAmount<0 || p.lockAmount>p.clearance*2+1) throw new Error("Puristuslukituksen arvo on liian suuri.");
  if(p.wall<1) throw new Error("Seinämän pitää olla vähintään 1 mm.");
  if(p.baseHeight<8) throw new Error("Mutteriosan korkeus on liian pieni.");
  if(p.lockZ<2 || p.lockZ>p.baseHeight-4) throw new Error("Lukituksen korkeus pitää olla mutteriosan sisällä.");
  if(p.totalHeight<=p.baseHeight+8) throw new Error("Kokonaiskorkeuden pitää olla selvästi mutteriosaa suurempi.");
  if(p.tipRadius<=0 || p.tipRadius>4) throw new Error("Kärjen pyöristys ei ole järkevä.");
  return p;
}

const v=(x,y,z)=>({x,y,z});
const tri=(a,b,c)=>[a,b,c];
function normal(t){
  const [a,b,c]=t,u=v(b.x-a.x,b.y-a.y,b.z-a.z),w=v(c.x-a.x,c.y-a.y,c.z-a.z);
  const n=v(u.y*w.z-u.z*w.y,u.z*w.x-u.x*w.z,u.x*w.y-u.y*w.x),l=Math.hypot(n.x,n.y,n.z)||1;
  return v(n.x/l,n.y/l,n.z/l);
}

function hexVerticesFromAF(af,z){
  const r=af/Math.sqrt(3), phase=Math.PI/6;
  return Array.from({length:6},(_,i)=>v(r*Math.cos(phase+i*Math.PI/3),r*Math.sin(phase+i*Math.PI/3),z));
}

function sampledHexRing(af,z,segmentsPerSide=4){
  const verts=hexVerticesFromAF(af,z),out=[];
  for(let s=0;s<6;s++){
    const a=verts[s],b=verts[(s+1)%6];
    for(let j=0;j<segmentsPerSide;j++){
      const t=j/segmentsPerSide;
      out.push(v(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,z));
    }
  }
  return out;
}

function circleRing(radius,z,n=24,phase=Math.PI/24){
  return Array.from({length:n},(_,i)=>v(radius*Math.cos(phase+i*2*Math.PI/n),radius*Math.sin(phase+i*2*Math.PI/n),z));
}

function bridge(T,a,b,reverse=false){
  if(a.length!==b.length) throw new Error("Sisäinen rengasvirhe.");
  const n=a.length;
  for(let i=0;i<n;i++){
    const j=(i+1)%n;
    if(!reverse) T.push(tri(a[i],a[j],b[j]),tri(a[i],b[j],b[i]));
    else T.push(tri(a[i],b[j],a[j]),tri(a[i],b[i],b[j]));
  }
}

function annulus(T,outer,inner,up=true){
  if(outer.length!==inner.length) throw new Error("Sisäinen rengasvirhe.");
  const n=outer.length;
  for(let i=0;i<n;i++){
    const j=(i+1)%n;
    if(up) T.push(tri(outer[i],outer[j],inner[j]),tri(outer[i],inner[j],inner[i]));
    else T.push(tri(outer[i],inner[j],outer[j]),tri(outer[i],inner[i],inner[j]));
  }
}

function buildMesh(p){
  const n=24;
  const innerAF=p.nutAf+2*p.clearance;
  const lockAF=Math.max(p.nutAf-.1,innerAF-2*p.lockAmount);
  const outerAF=innerAF+2*p.wall;
  const innerTop=p.baseHeight-p.wall-1;
  const hexShoulderZ=Math.max(innerTop+1,p.baseHeight-3);
  const circleShoulderZ=p.baseHeight;
  const outerRadius=(outerAF/2)*1.02;
  const tipBaseZ=p.totalHeight-p.tipRadius;
  const tipR=Math.max(.18,p.tipRadius*.72);

  const outer0=sampledHexRing(outerAF,0,4);
  const outerRoof=sampledHexRing(outerAF,innerTop,4);
  const outerHexTop=sampledHexRing(outerAF,hexShoulderZ,4);
  const shoulder=circleRing(outerRadius,circleShoulderZ,n);
  const inner0=sampledHexRing(innerAF,0,4);
  const innerLock=sampledHexRing(lockAF,p.lockZ,4);
  const innerTopRing=sampledHexRing(innerAF,innerTop,4);
  const tipRing=circleRing(tipR,tipBaseZ,n);
  const apex=v(0,0,p.totalHeight);
  const T=[];

  bridge(T,outer0,outerRoof,false);
  if(hexShoulderZ>innerTop+.001) bridge(T,outerRoof,outerHexTop,false);
  bridge(T,outerHexTop,shoulder,false);
  bridge(T,inner0,innerLock,true);
  bridge(T,innerLock,innerTopRing,true);
  annulus(T,outer0,inner0,false);
  annulus(T,outerRoof,innerTopRing,true);
  bridge(T,shoulder,tipRing,false);
  for(let i=0;i<n;i++){
    const j=(i+1)%n;
    T.push(tri(tipRing[i],tipRing[j],apex));
  }

  return {triangles:T,innerAF,lockAF,outerAF,height:p.totalHeight,kind:"full"};
}

function buildFitMesh(p){
  const innerAF=p.nutAf+2*p.clearance;
  const lockAF=Math.max(p.nutAf-.1,innerAF-2*p.lockAmount);
  const outerAF=innerAF+2*p.wall;
  const h=Math.max(10,p.lockZ+4);
  const outer0=sampledHexRing(outerAF,0,4),outer1=sampledHexRing(outerAF,h,4);
  const inner0=sampledHexRing(innerAF,0,4),innerLock=sampledHexRing(lockAF,p.lockZ,4),inner1=sampledHexRing(innerAF,h,4);
  const T=[];
  bridge(T,outer0,outer1,false);
  bridge(T,inner0,innerLock,true);
  bridge(T,innerLock,inner1,true);
  annulus(T,outer0,inner0,false);
  annulus(T,outer1,inner1,true);
  return {triangles:T,innerAF,lockAF,outerAF,height:h,kind:"fit"};
}

function keyPoint(q){return `${q.x.toFixed(6)},${q.y.toFixed(6)},${q.z.toFixed(6)}`}
function edgeKey(a,b){const A=keyPoint(a),B=keyPoint(b);return A<B?`${A}|${B}`:`${B}|${A}`}

function validateMesh(mesh){
  if(!mesh || !mesh.triangles.length) return {ok:false,message:"Mesh puuttuu."};
  const edges=new Map();
  let degenerate=0;
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(const t of mesh.triangles){
    if(t.some(q=>![q.x,q.y,q.z].every(Number.isFinite))) return {ok:false,message:"Mesh sisältää virheellisen koordinaatin."};
    const [a,b,c]=t;
    const area2=Math.hypot(
      (b.y-a.y)*(c.z-a.z)-(b.z-a.z)*(c.y-a.y),
      (b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z),
      (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
    );
    if(area2<1e-8) degenerate++;
    for(const q of t){minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);minZ=Math.min(minZ,q.z);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);maxZ=Math.max(maxZ,q.z)}
    [[a,b],[b,c],[c,a]].forEach(([p1,p2])=>{const k=edgeKey(p1,p2);edges.set(k,(edges.get(k)||0)+1)});
  }
  const badEdges=[...edges.values()].filter(n=>n!==2).length;
  if(degenerate) return {ok:false,message:`Meshissä on ${degenerate} nollapinta-alaista kolmiota.`};
  if(badEdges) return {ok:false,message:`Mesh ei ole suljettu: ${badEdges} reunaa ei jakaudu täsmälleen kahdelle pinnalle.`};
  const bounds={x:maxX-minX,y:maxY-minY,z:maxZ-minZ};
  return {ok:true,message:`Suljettu manifold-mesh: ${mesh.triangles.length} kolmiota, ${edges.size} reunaa.`,bounds};
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
    ctx.fillStyle="rgba(20,184,166,.74)";ctx.fill();ctx.strokeStyle="rgba(153,246,228,.22)";ctx.lineWidth=.65;ctx.stroke();
  }
}

function updateMaterialCard(){
  const m=materialProfiles[$("material").value];
  $("materialCard").innerHTML=`<strong>${m.label}: ${m.use}</strong><span>Suutin ${m.nozzle} • Alusta ${m.bed}</span><span>${m.note}</span>`;
  $("legend").innerHTML=`<span>Valittu materiaali: <strong>${m.label}</strong></span><span>${m.note}</span>`;
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
    $("status").textContent=valid?`Malli luotu ja tarkistettu. Perusaukko ${currentMesh.innerAF.toFixed(2)} mm, lukituskohdassa ${currentMesh.lockAF.toFixed(2)} mm. Tulosta ensin sovitustesti.`:"Mallia ei anneta ladattavaksi ennen kuin mesh-tarkistus menee läpi.";
    $("dimensions").textContent=`Sisä-AF ${currentMesh.innerAF.toFixed(2)} mm • Lukitus-AF ${currentMesh.lockAF.toFixed(2)} mm • Ulko-AF ${currentMesh.outerAF.toFixed(2)} mm • Korkeus ${currentMesh.height.toFixed(1)} mm`;
    updateMaterialCard();
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
function download(){if(currentMesh)saveMesh(currentMesh,"piikkimutterinsuojus_33mm_v0.3.stl","piikkimutterinsuojus_33mm_v03")}
function downloadFit(){if(currentFitMesh)saveMesh(currentFitMesh,"piikkimutteri_33mm_sovitustesti_v0.3.stl","piikkimutteri_33mm_sovitustesti_v03")}
function reset(){for(const [k,val] of Object.entries(defaults)){if($(k))$(k).value=val}generate();}

$("btnGenerate").addEventListener("click",generate);
$("btnDownload").addEventListener("click",download);
$("btnFitTest").addEventListener("click",downloadFit);
$("btnReset").addEventListener("click",reset);
$("material").addEventListener("change",()=>{updateMaterialCard();generate()});
canvas.addEventListener("pointerdown",e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{if(!drag)return;yaw+=(e.clientX-lastX)*.008;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;draw()});
canvas.addEventListener("pointerup",()=>drag=false);
canvas.addEventListener("pointercancel",()=>drag=false);

generate();
