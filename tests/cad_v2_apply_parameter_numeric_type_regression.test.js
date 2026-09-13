"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("cad_apply_guard.js","utf8");
let applyCount=0;
const elements=new Map([
  ["status",{textContent:""}],
  ["validation",{querySelector:()=>null}],
  ["btnDownload",{disabled:false}],
  ["btnFitTest",{disabled:false}],
  ["btnCentauriStl",{disabled:false}],
  ["dimensions",{textContent:""}]
]);
const context={
  window:{
    AI3D:{setPart(){return true}},
    AI3DPlanV2CAD:{apply(){applyCount++;return true}}
  },
  document:{readyState:"complete",getElementById:id=>elements.get(id)||null},
  console,Error,Object,String,Number,Array,Math,
  draw(){},currentMesh:{},currentFitMesh:{}
};
vm.runInNewContext(source,context);
const apply=context.window.AI3DPlanV2CAD.apply;

const valid=[
  {schemaVersion:2,partType:"adapter",parameters:{length:30,insideDiameter1:20,insideDiameter2:22,outsideDiameter1:26,outsideDiameter2:28}},
  {schemaVersion:2,partType:"enclosure",parameters:{width:80,length:60,height:30,wall:2.4,floorThickness:2.4}},
  {schemaVersion:2,partType:"mountingPlate",parameters:{length:50,width:40,thickness:3,cornerRadius:2}}
];
for(const plan of valid)assert.doesNotThrow(()=>apply(plan),"real finite numeric CAD v2 parameters must remain valid");
assert.strictEqual(applyCount,3,"valid plans must reach the existing CAD v2 apply implementation");

const invalid=[
  {schemaVersion:2,partType:"adapter",parameters:{length:"30",insideDiameter1:20,insideDiameter2:22,outsideDiameter1:26,outsideDiameter2:28}},
  {schemaVersion:2,partType:"adapter",parameters:{length:30,insideDiameter1:null,insideDiameter2:22,outsideDiameter1:26,outsideDiameter2:28}},
  {schemaVersion:2,partType:"enclosure",parameters:{width:"80",length:60,height:30,wall:2.4,floorThickness:2.4}},
  {schemaVersion:2,partType:"enclosure",parameters:{width:80,length:60,height:30,wall:"2.4",floorThickness:2.4}},
  {schemaVersion:2,partType:"mountingPlate",parameters:{length:"50",width:40,thickness:3}},
  {schemaVersion:2,partType:"mountingPlate",parameters:{length:50,width:40,thickness:3,cornerRadius:"2"}}
];
for(const plan of invalid)assert.throws(()=>apply(plan),/parameters\..*: anna kelvollinen numero\./,
  "coerced numeric strings and null CAD v2 parameters must fail closed before geometry generation");
assert.strictEqual(applyCount,3,"invalid plans must not reach the underlying CAD v2 apply implementation");

console.log("CAD v2 apply parameter numeric type regression: OK");
