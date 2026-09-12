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
const base={schemaVersion:2,partType:"adapter",parameters:{length:30,insideDiameter1:20,insideDiameter2:24,outsideDiameter1:26,outsideDiameter2:30}};
assert.doesNotThrow(()=>apply({...base,parameters:{...base.parameters,wall:.4}}),"explicit adapter wall at the shared 0.4 mm minimum must remain CAD-valid when diameters are valid");
for(const wall of [.39,0,-1,200.01])assert.throws(
 ()=>apply({...base,parameters:{...base.parameters,wall}}),
 /wall.*0,4…200 mm/i,
 `CAD v2 core must reject explicit adapter wall ${wall} even when explicit outside diameters would otherwise hide it`
);
assert.doesNotThrow(()=>apply(base),"omitting wall must remain valid when both explicit outside diameters define valid radial walls");
console.log("CAD v2 adapter wall parity regression: ok");
