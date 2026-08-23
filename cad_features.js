"use strict";
(() => {
  const N = 64;
  const el = id => document.getElementById(id);

  function resamplePolygon(points, n=N){
    const seg=[]; let total=0;
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const len=Math.hypot(b.x-a.x,b.y-a.y); seg.push({a,b,len,start:total}); total+=len;
    }
    const out=[];
    for(let k=0;k<n;k++){
      const target=total*k/n;
      let s=seg[seg.length-1];
      for(const q of seg){if(target>=q.start && target<=q.start+q.len){s=q;break}}
      const t=s.len?((target-s.start)/s.len):0;
      out.push(v(s.a.x+(s.b.x-s.a.x)*t,s.a.y+(s.b.y-s.a.y)*t,s.a.z));
    }
    return out;
  }

  function roundedRectRing(L,W,z,r,n=N){
    r=Math.max(0,Math.min(r,L/2-.2,W/2-.2));
    if(r<=.001) return resamplePolygon([v(-L/2,-W/2,z),v(L/2,-W/2,z),v(L/2,W/2,z),v(-L/2,W/2,z)],n);
    const per=Math.max(4,Math.floor(n/4)),out=[];
    const corners=[
      [L/2-r,-W/2+r,-Math.PI/2,0],
      [L/2-r,W/2-r,0,Math.PI/2],
      [-L/2+r,W/2-r,Math.PI/2,Math.PI],
      [-L/2+r,-W/2+r,Math.PI,Math.PI*1.5]
    ];
    for(const [cx,cy,a0,a1] of corners){
      for(let i=0;i<per;i++){
        const a=a0+(a1-a0)*i/per;
        out.push(v(cx+r*Math.cos(a),cy+r*Math.sin(a),z));
      }
    }
    return out.length===n?out:resamplePolygon(out,n);
  }

  function chamferRectRing(L,W,z,c,n=N){
    c=Math.max(0,Math.min(c,L/2-.2,W/2-.2));
    if(c<=.001) return roundedRectRing(L,W,z,0,n);
    const p=[
      v(-L/2+c,-W/2,z),v(L/2-c,-W/2,z),v(L/2,-W/2+c,z),v(L/2,W/2-c,z),
      v(L/2-c,W/2,z),v(-L/2+c,W/2,z),v(-L/2,W/2-c,z),v(-L/2,-W/2+c,z)
    ];
    return resamplePolygon(p,n);
  }

  function outerRing(L,W,z,style,size){
    if(style==="round") return roundedRectRing(L,W,z,size,N);
    if(style==="chamfer") return chamferRectRing(L,W,z,size,N);
    return roundedRectRing(L,W,z,0,N);
  }

  function enhancedBuildPlate(){
    const L=+el("plateL").value,W=+el("plateW").value,T=+el("plateT").value;
    const holeD=Math.max(0,+el("plateHoleD").value||0),style=el("plateCornerStyle").value,size=Math.max(0,+el("plateCornerSize").value||0);
    if(L<=2||W<=2||T<1) throw Error("Levyn mitat eivät ole mahdollisia.");
    const maxCorner=Math.min(L,W)/2-.2;
    if(size>maxCorner) throw Error("Pyöristys/viiste on liian suuri levyn kokoon nähden.");
    if(holeD>=Math.min(L,W)-2*Math.max(2,size*.35)) throw Error("Keskireikä on liian suuri levyn kokoon nähden.");

    const o0=outerRing(L,W,0,style,size),o1=outerRing(L,W,T,style,size),tris=[];
    bridge(tris,o0,o1,false);
    if(holeD>0){
      const i0=circleRing(holeD/2,0,N),i1=circleRing(holeD/2,T,N);
      bridge(tris,i0,i1,true);
      annulus(tris,o0,i0,false);
      annulus(tris,o1,i1,true);
    }else{
      cap(tris,o0,0,false); cap(tris,o1,T,true);
    }
    currentFitMesh=null;
    const styleName=style==="round"?"Pyöristys":style==="chamfer"?"Viiste":"Kulmat";
    const measure=[["Pituus",L],["Leveys",W],["Paksuus",T]];
    if(holeD>0) measure.push(["Reikä Ø",holeD]);
    if(style!=="square") measure.push([styleName,size]);
    return {triangles:tris,name:"kiinnikelevy",width:L,depth:W,height:T,measure};
  }

  // app.js:n buildPlate on tarkoituksella korvattavissa seuraavilla CAD-ominaisuuksilla.
  buildPlate = enhancedBuildPlate;

  const oldReset=el("btnReset").onclick;
  el("btnReset").onclick=()=>{
    if(el("plateHoleD")) el("plateHoleD").value=0;
    if(el("plateCornerStyle")) el("plateCornerStyle").value="round";
    if(el("plateCornerSize")) el("plateCornerSize").value=5;
    oldReset?.();
  };

  // Päivitä tiedostonimet v0.8:aan ilman että aiemman sovelluksen toimiva geometria rikkoutuu.
  el("btnDownload").onclick=()=>currentMesh&&saveMesh(currentMesh,`${currentMesh.name}_v0.8.stl`);
  el("btnFitTest").onclick=()=>currentFitMesh&&saveMesh(currentFitMesh,"piikkimutteri_sovitustesti_v0.8.stl");
})();