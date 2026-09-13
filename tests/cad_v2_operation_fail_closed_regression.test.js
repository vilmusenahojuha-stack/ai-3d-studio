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
const adapter={schemaVersion:2,partType:"adapter",parameters:{length:30,insideDiameter:20,outsideDiameter:24}};
assert.doesNotThrow(()=>apply(adapter),"adapter without operations must remain valid");
assert.throws(()=>apply({...adapter,operations:{type:"hole"}}),/operations pitää olla taulukko/i,"non-array operations must fail closed in CAD core");
assert.throws(()=>apply({...adapter,operations:[{type:"hole",x:0,y:0,diameter:4}]}),/ei toteuta operations-operaatioita/i,"adapter operations must not be silently ignored");
const enclosure={schemaVersion:2,partType:"case",parameters:{width:80,depth:50,height:30,wall:2,floorThickness:2}};
assert.throws(()=>apply({...enclosure,operations:[{type:"hole",x:0,y:0,diameter:4}]}),/ei toteuta operations-operaatioita/i,"enclosure alias operations must not be silently ignored");
const plate={schemaVersion:2,partType:"plate",parameters:{length:120,width:60,thickness:5}};
assert.doesNotThrow(()=>apply({...plate,operations:[{type:"hole",x:0,y:0,diameter:4}]}),"supported plate hole operation must remain valid");
assert.doesNotThrow(()=>apply({...plate,operations:[{type:"holes",holes:[{x:-20,y:0,diameter:4},{x:20,y:0,diameter:4}]}]}),"supported plate holes operation must remain valid");
assert.throws(()=>apply({...plate,operations:[{type:"cutout"}]}),/ei toteuta operaatiota cutout/i,"unsupported plate operation must fail closed");
assert.throws(()=>apply({...plate,operations:[{type:"holes"}]}),/holes-taulukko puuttuu/i,"malformed holes operation must fail closed");
console.log("CAD v2 operation fail-closed regression: ok");
