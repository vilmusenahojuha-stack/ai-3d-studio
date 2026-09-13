"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("cad_plan_v2.js","utf8");
const elements=new Map();
for(const id of ["validation","btnDownload","btnFitTest","status","dimensions"]){
  elements.set(id,{innerHTML:"",disabled:false,textContent:""});
}
const context={
  window:{},
  document:{getElementById:id=>elements.get(id)||null},
  console,
  Error,Object,String,Number,Array,Math,
  v:(x,y,z)=>({x,y,z}),
  tri:(a,b,c)=>({a,b,c}),
  bridge(){},cap(){},annulus(){},
  earcut(){return[]},
  currentFitMesh:null,currentMesh:null,
  validate(){return{ok:true,message:"OK"}},
  updateMaterial(){},draw(){}
};
vm.runInNewContext(source,context);
const apply=context.window.AI3DPlanV2CAD.apply;
const plate=parameters=>({schemaVersion:2,partType:"mountingPlate",parameters:{length:50,width:40,thickness:3,...parameters}});

assert.doesNotThrow(()=>apply(plate({holes:[{x:0,y:0,diameter:6}]})),
  "real finite JSON numbers must remain valid in the core CAD v2 plate builder");
assert.doesNotThrow(()=>apply(plate({centerHole:6})),
  "numeric centerHole shorthand must remain supported in the core CAD v2 builder");

for(const hole of [
  {x:"0",y:0,diameter:6},
  {x:0,y:"0",diameter:6},
  {x:0,y:0,diameter:"6"},
  {x:null,y:0,diameter:6},
  {x:0,y:0,diameter:null}
]){
  assert.throws(()=>apply(plate({holes:[hole]})),/-2000…2000 mm/,
    "core CAD v2 must reject coerced or missing hole coordinates/diameters even without the outer apply guard");
}

assert.throws(()=>apply(plate({centerHole:{diameter:"6"}})),/0\.2…500 mm/,
  "core CAD v2 must reject a string center-hole diameter instead of coercing it");
assert.throws(()=>apply(plate({centerHole:{diameter:null}})),/0\.2…500 mm/,
  "core CAD v2 must reject a missing/null center-hole diameter instead of coercing it");

console.log("CAD v2 core hole numeric type regression: OK");
