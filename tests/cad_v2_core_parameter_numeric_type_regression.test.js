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

const valid=[
  {schemaVersion:2,partType:"adapter",parameters:{length:30,insideDiameter1:20,insideDiameter2:22,outsideDiameter1:26,outsideDiameter2:28}},
  {schemaVersion:2,partType:"enclosure",parameters:{width:80,length:60,height:30,wall:2.4,floorThickness:2.4}},
  {schemaVersion:2,partType:"mountingPlate",parameters:{length:50,width:40,thickness:3,cornerRadius:2}}
];
for(const plan of valid)assert.doesNotThrow(()=>apply(plan),"real finite numeric CAD v2 parameters must remain valid in the core geometry engine");

const invalid=[
  {schemaVersion:2,partType:"adapter",parameters:{length:"30",insideDiameter1:20,insideDiameter2:22,outsideDiameter1:26,outsideDiameter2:28}},
  {schemaVersion:2,partType:"adapter",parameters:{length:30,insideDiameter1:null,insideDiameter2:22,outsideDiameter1:26,outsideDiameter2:28}},
  {schemaVersion:2,partType:"adapter",parameters:{length:30,insideDiameter1:20,insideDiameter2:22,wall:"3"}},
  {schemaVersion:2,partType:"enclosure",parameters:{width:"80",length:60,height:30,wall:2.4,floorThickness:2.4}},
  {schemaVersion:2,partType:"enclosure",parameters:{width:80,length:60,height:30,wall:"2.4",floorThickness:2.4}},
  {schemaVersion:2,partType:"enclosure",parameters:{width:80,length:60,height:30,wall:2.4,floorThickness:null}},
  {schemaVersion:2,partType:"mountingPlate",parameters:{length:"50",width:40,thickness:3}},
  {schemaVersion:2,partType:"mountingPlate",parameters:{length:50,width:40,thickness:3,cornerRadius:"2"}}
];
for(const plan of invalid)assert.throws(()=>apply(plan),/anna kelvollinen numero\./,
  "core CAD v2 must reject coerced numeric strings and null dimension values without relying on the outer apply guard");

console.log("CAD v2 core parameter numeric type regression: OK");
