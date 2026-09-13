"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("cad_plan_v2.js","utf8");
const elements={validation:{innerHTML:""},btnDownload:{disabled:true},btnFitTest:{disabled:true},status:{textContent:""},dimensions:{textContent:""}};
const context={
 window:{},document:{getElementById:id=>elements[id]||null},console,Math,Number,Array,Object,String,Error,
 v:(x,y,z)=>({x,y,z}),tri:(a,b,c)=>({a,b,c}),bridge(){},annulus(){},cap(){},earcut:()=>[],
 validate:()=>({ok:true,message:"ok"}),updateMaterial(){},draw(){},currentMesh:null,currentFitMesh:null
};
vm.createContext(context);vm.runInContext(source,context,{filename:"cad_plan_v2.js"});
const apply=context.window.AI3DPlanV2CAD?.apply;
assert.equal(typeof apply,"function","CAD v2 apply API must initialize");
const plate={schemaVersion:2,partType:"plate",parameters:{length:120,width:60,thickness:5},operations:[]};
assert.doesNotThrow(()=>apply(plate),"plate alias must reach the same CAD core as mountingPlate");
for(const alias of ["box","case"])assert.doesNotThrow(()=>apply({schemaVersion:2,partType:alias,parameters:{width:80,depth:50,height:30,wall:2,floorThickness:2}}),`${alias} alias must reach the same CAD core as enclosure`);
assert.doesNotThrow(()=>apply({...plate,partType:"mountingPlate"}),"canonical mountingPlate must remain valid");
assert.doesNotThrow(()=>apply({schemaVersion:2,partType:"enclosure",parameters:{width:80,length:50,height:30,wall:2,floorThickness:2}}),"canonical enclosure must remain valid");
assert.throws(()=>apply({...plate,partType:"unknownPlate"}),/osatyyppiä ei tunnistettu/i,"unknown part types must still fail closed");
console.log("CAD v2 alias parity regression: ok");
