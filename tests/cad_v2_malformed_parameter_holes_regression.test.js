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
const plate={schemaVersion:2,partType:"plate",parameters:{length:120,width:60,thickness:5}};
assert.doesNotThrow(()=>apply({...plate,parameters:{...plate.parameters,holes:[]}}),"an explicit holes array must remain valid");
for(const malformed of [null,{},"",4]){
 assert.throws(
  ()=>apply({...plate,parameters:{...plate.parameters,holes:malformed}}),
  /holes.*taulukko|reik.*taulukko/i,
  `malformed parameters.holes (${JSON.stringify(malformed)}) must fail closed instead of being silently ignored`
 );
}
console.log("CAD v2 malformed parameter holes regression: ok");
