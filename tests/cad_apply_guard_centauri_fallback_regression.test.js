"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("cad_apply_guard.js","utf8");

function run(previewMode){
 const elements={
  btnDownload:{disabled:false},
  btnFitTest:{disabled:false},
  btnCentauriStl:{disabled:false},
  dimensions:{textContent:"120 × 80 × 40 mm"},
  status:{textContent:"Malli luotu ja tarkistettu."},
  validation:{querySelector(){return null}}
 };
 const window={AI3D:{setPart(){throw Error("CAD fallback failure")}}};
 if(previewMode==="throw")window.AI3DPreviewGuard={clear(){throw Error("preview guard unavailable")}};
 const document={
  readyState:"complete",
  getElementById:id=>elements[id]||null,
  addEventListener(){}
 };
 const context={window,document,console,Error,Object,String,Number,Array,Math};
 vm.createContext(context);
 vm.runInContext(source,context,{filename:"cad_apply_guard.js"});
 assert.throws(()=>window.AI3D.setPart("adapter",{}),/CAD fallback failure/);
 return elements;
}

for(const mode of ["missing","throw"]){
 const elements=run(mode);
 assert.equal(elements.btnDownload.disabled,true,`${mode}: normal STL export must fail closed`);
 assert.equal(elements.btnFitTest.disabled,true,`${mode}: fit-test export must fail closed`);
 assert.equal(elements.btnCentauriStl.disabled,true,`${mode}: Centauri STL export must fail closed even without a working preview guard`);
 assert.equal(elements.dimensions.textContent,"–",`${mode}: stale dimensions must be cleared`);
 assert.match(elements.status.textContent,/^Virhe: CAD fallback failure$/,`${mode}: fallback path must surface the CAD failure`);
}

console.log("CAD apply guard Centauri fallback regression: OK");
