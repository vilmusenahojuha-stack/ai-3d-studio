"use strict";
(() => {
  const OUTER_N=64, HOLE_N=32, el=id=>document.getElementById(id);

  function resamplePolygon(points,n=OUTER_N){
    const seg=[];let total=0;
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],len=Math.hypot(b.x-a.x,b.y-a.y);seg.push({a,b,len,start:total});total+=len}
    const out=[];
    for(let k=0;k<n;k++){const target=total*k/n;let s=seg[seg.length-1];for(const q of seg){if(target>=q.start&&target<=q.start+q.len){s=q;break}}const t=s.len?(target-s.start)/s.len:0;out.push(v(s.a.x+(s.b.x-s.a.x)*t,s.a.y+(s.b.y-s.a.y)*t,s.a.z))}
    return out;
  }

  function roundedRectRing(L,W,z,r,n=OUTER_N){
    r=Math.max(0,Math.min(r,L/2-.2,W/2-.2));
    if(r<=.001)return resamplePolygon([v(-L/2,-W/2,z),v(L/2,-W/2,z),v(L/2,W/2,z),v(-L/2,W/2,z)],n);
    const per=Math.max(4,Math.floor(n/4)),out=[],corners=[[L/2-r,-W/2+r,-Math.PI/2,0],[L/2-r,W/2-r,0,Math.PI/2],[-L/2+r,W/2-r,Math.PI/2,Math.PI],[-L/2+r,-W/2+r,Math.PI,Math.PI*1.5]];
    for(const[cx,cy,a0,a1]of corners)for(let i=0;i<per;i++){const a=a0+(a1-a0)*i/per;out.push(v(cx+r*Math.cos(a),cy+r*Math.sin(a),z))}
    return out.length===n?out:resamplePolygon(out,n);
  }

  function chamferRectRing(L,W,z,c,n=OUTER_N){
    c=Math.max(0,Math.min(c,L/2-.2,W/2-.2));
    if(c<=.001)return roundedRectRing(L,W,z,0,n);
    return resamplePolygon([v(-L/2+c,-W/2,z),v(L/2-c,-W/2,z),v(L/2,-W/2+c,z),v(L/2,W/2-c,z),v(L/2-c,W/2,z),v(-L/2+c,W/2,z),v(-L/2,W/2-c,z),v(-L/2,-W/2+c,z)],n);
  }

  function outerRing(L,W,z,style,size){return style==="round"?roundedRectRing(L,W,z,size):style==="chamfer"?chamferRectRing(L,W,z,size):roundedRectRing(L,W,z,0)}
  function holeRing(cx,cy,r,z){return Array.from({length:HOLE_N},(_,i)=>{const a=2*Math.PI*i/HOLE_N;return v(cx+r*Math.cos(a),cy+r*Math.sin(a),z)})}

  function insideOuter(x,y,L,W,style,size){
    if(style==="square")return Math.abs(x)<=L/2+1e-7&&Math.abs(y)<=W/2+1e-7;
    if(style==="chamfer"){const ax=Math.abs(x),ay=Math.abs(y);return ax<=L/2&&ay<=W/2&&(ax+ay<=L/2+W/2-size+1e-7)}
    const r=Math.min(size,L/2,W/2),ax=Math.abs(x),ay=Math.abs(y);if(ax<=L/2-r||ay<=W/2-r)return ax<=L/2&&ay<=W/2;return Math.hypot(ax-(L/2-r),ay-(W/2-r))<=r+1e-7;
  }

  function triangulateFaces(tris,outer0,holes0,T){
    if(typeof earcut!=="function")throw Error("CAD-triangulointikirjasto ei latautunut. Päivitä sivu verkkoyhteydellä.");
    const rings=[outer0,...holes0],flat=[],holeIndices=[];let count=0;
    rings.forEach((ring,ri)=>{if(ri>0)holeIndices.push(count);for(const p of ring){flat.push(p.x,p.y);count++}});
    const ids=earcut(flat,holeIndices,2),all0=rings.flat(),all1=all0.map(p=>v(p.x,p.y,T));
    for(let i=0;i<ids.length;i+=3){const a=ids[i],b=ids[i+1],c=ids[i+2];tris.push(tri(all0[a],all0[c],all0[b]));tris.push(tri(all1[a],all1[b],all1[c]))}
  }

  function ensureCustomHoleUI(){
    const pattern=el("plateHolePattern");if(!pattern)return;
    if(![...pattern.options].some(o=>o.value==="custom")){const o=document.createElement("option");o.value="custom";o.textContent="Mukautetut reiät";pattern.appendChild(o)}
    if(!el("plateCustomHoles")){
      const label=document.createElement("label");label.id="plateCustomHolesLabel";label.style.gridColumn="1 / -1";label.innerHTML='Mukautetut reiät — yksi per rivi: X;Y;Ø (mm)<textarea id="plateCustomHoles" rows="4" placeholder="0;0;8\n20;0;5"></textarea>';
      pattern.closest(".grid")?.appendChild(label)
    }
    const sync=()=>{const lab=el("plateCustomHolesLabel");if(lab)lab.hidden=pattern.value!=="custom"};pattern.addEventListener("change",sync);sync()
  }

  function parseCustomHoles(raw){
    const holes=[];for(const [i,line] of String(raw||"").split(/\r?\n/).entries()){
      const s=line.trim();if(!s)continue;const parts=s.replace(/,/g,".").split(/[;\s]+/).filter(Boolean);if(parts.length!==3)throw Error(`Mukautettu reikä rivillä ${i+1}: käytä muotoa X;Y;Ø.`);const [x,y,d]=parts.map(Number);if(![x,y,d].every(Number.isFinite)||d<=0)throw Error(`Mukautettu reikä rivillä ${i+1}: tarkista numerot ja halkaisija.`);holes.push({x,y,d})
    }return holes
  }

  function enhancedBuildPlate(){
    const L=+el("plateL").value,W=+el("plateW").value,T=+el("plateT").value;
    const pattern=el("plateHolePattern")?.value||"none",holeD=Math.max(0,+el("plateHoleD").value||0),edge=Math.max(0,+el("plateHoleEdge")?.value||0),style=el("plateCornerStyle").value,size=Math.max(0,+el("plateCornerSize").value||0);
    if(L<=2||W<=2||T<1)throw Error("Levyn mitat eivät ole mahdollisia.");
    if(size>Math.min(L,W)/2-.2)throw Error("Pyöristys/viiste on liian suuri levylle.");
    if(pattern!=="none"&&pattern!=="custom"&&holeD<=0)throw Error("Anna reiän halkaisija.");

    let holes=[];
    if(pattern==="center")holes=[{x:0,y:0,d:holeD}];
    if(pattern==="four"){
      if(edge<=holeD/2+.5)throw Error("Reiän keskipisteen reunaetäisyys on liian pieni.");
      const x=L/2-edge,y=W/2-edge;if(x<=0||y<=0)throw Error("Reunaetäisyys on liian suuri levylle.");
      holes=[{x:-x,y:-y,d:holeD},{x,y:-y,d:holeD},{x,y,d:holeD},{x:-x,y,d:holeD}]
    }
    if(pattern==="custom")holes=parseCustomHoles(el("plateCustomHoles")?.value);

    for(const h of holes){const rr=h.d/2+.6;for(const[tx,ty]of[[h.x+rr,h.y],[h.x-rr,h.y],[h.x,h.y+rr],[h.x,h.y-rr]])if(!insideOuter(tx,ty,L,W,style,size))throw Error("Reikä on liian lähellä levyn reunaa tai kulmaa.")}
    for(let i=0;i<holes.length;i++)for(let j=i+1;j<holes.length;j++)if(Math.hypot(holes[i].x-holes[j].x,holes[i].y-holes[j].y)<=(holes[i].d+holes[j].d)/2+1)throw Error("Reiät ovat liian lähellä toisiaan.");

    const o0=outerRing(L,W,0,style,size),o1=o0.map(p=>v(p.x,p.y,T));
    const holes0=holes.map(h=>holeRing(h.x,h.y,h.d/2,0));
    const holes1=holes0.map(r=>r.map(p=>v(p.x,p.y,T)));
    const tris=[];
    triangulateFaces(tris,o0,holes0,T);
    bridge(tris,o0,o1,false);
    for(let i=0;i<holes0.length;i++)bridge(tris,holes0[i],holes1[i],true);

    currentFitMesh=null;
    const measure=[["Pituus",L],["Leveys",W],["Paksuus",T]];
    if(holes.length){const same=holes.every(h=>Math.abs(h.d-holes[0].d)<1e-6);measure.push([same?`${holes.length} × reikä Ø`:`${holes.length} reikää`,same?holes[0].d:holes.map(h=>`Ø${h.d} @ ${h.x},${h.y}`).join("; ")])}
    if(pattern==="four")measure.push(["Reuna → keskipiste",edge]);
    if(style!=="square")measure.push([style==="round"?"Pyöristys":"Viiste",size]);
    return{triangles:tris,name:"kiinnikelevy",width:L,depth:W,height:T,measure};
  }

  ensureCustomHoleUI();
  buildPlate=enhancedBuildPlate;
  const oldReset=el("btnReset").onclick;
  el("btnReset").onclick=()=>{if(el("plateHolePattern"))el("plateHolePattern").value="none";if(el("plateHoleD"))el("plateHoleD").value=0;if(el("plateHoleEdge"))el("plateHoleEdge").value=10;if(el("plateCornerStyle"))el("plateCornerStyle").value="round";if(el("plateCornerSize"))el("plateCornerSize").value=5;if(el("plateCustomHoles"))el("plateCustomHoles").value="";el("plateHolePattern")?.dispatchEvent(new Event("change"));oldReset?.()};
  el("btnDownload").onclick=()=>currentMesh&&saveMesh(currentMesh,`${currentMesh.name}_v0.9.2.stl`);
  el("btnFitTest").onclick=()=>currentFitMesh&&saveMesh(currentFitMesh,"piikkimutteri_sovitustesti_v0.9.2.stl");
})();