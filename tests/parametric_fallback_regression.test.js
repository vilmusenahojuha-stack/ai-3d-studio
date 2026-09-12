"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const parametricSource=fs.readFileSync("parametric_parts.js","utf8");
const indexSource=fs.readFileSync("index.html","utf8");
const fallbackProjectTools=parametricSource.match(/project_tools\.js\?v=([0-9.]+)/)?.[1];
const productionProjectTools=indexSource.match(/project_tools\.js\?v=([0-9.]+)/)?.[1];
assert.ok(fallbackProjectTools,"parametric project tools fallback version should be declared");
assert.ok(productionProjectTools,"production project tools version should be declared");
assert.strictEqual(fallbackProjectTools,productionProjectTools,"parametric fallback must use the same project_tools.js version as production");

function makeElement(value=""){
 return {value:String(value),valueAsNumber:Number(value),hidden:false,disabled:false,style:{},textContent:"",innerHTML:"",id:"",querySelector(){return null},addEventListener(){},appendChild(){},insertBefore(){}};
}

const elements={
 partType:makeElement("adapter"),
 "fields-adapter":makeElement(),
 "fields-enclosure":makeElement(),
 partTitle:makeElement(),btnFitTest:makeElement(),btnDownload:makeElement(),status:makeElement(),dimensions:makeElement(),validation:makeElement(),
 adapterLength:makeElement(40),adapterID1:makeElement(20),adapterID2:makeElement(30),adapterOD1:makeElement(26),adapterOD2:makeElement(36),
 enclosureW:makeElement(80),enclosureD:makeElement(120),enclosureH:makeElement(40),enclosureWall:makeElement(2.4),enclosureFloor:makeElement(2.4),material:makeElement("PETG")
};
Object.entries(elements).forEach(([id,e])=>e.id=id);
let bridgeImpl=()=>{};
let centauriChecks=0;
const context={
 console,
 currentMesh:null,currentFitMesh:null,
 v:(x,y,z)=>({x,y,z}),
 bridge:(...a)=>bridgeImpl(...a),annulus:()=>{},cap:()=>{},
 validate:()=>({ok:true,message:"OK"}),updateMaterial:()=>{},draw:()=>{},
 setTimeout:fn=>{fn();return 1},clearTimeout:()=>{},
 document:{
  readyState:"loading",body:{appendChild(){}},head:{appendChild(){}},
  getElementById:id=>elements[id]||null,
  querySelector:()=>null,querySelectorAll:sel=>sel===".part-fields"?[elements["fields-adapter"],elements["fields-enclosure"]]:[],
  createElement:()=>makeElement(),addEventListener(){}
 },
 window:{CentauriProfile:{check(){centauriChecks++}}}
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(parametricSource,context,{filename:"parametric_parts.js"});
assert.strictEqual(typeof context.window.AI3DParametric?.generate,"function");

// Valid fallback model still generates without touching the normal UI path.
context.window.AI3DParametric.generate();
assert.ok(context.currentMesh,"valid adapter should produce a mesh");
assert.strictEqual(elements.btnDownload.disabled,false);
assert.ok(centauriChecks>0,"Centauri check should refresh after generation");

// Blank and non-numeric required dimensions must fail closed instead of silently becoming zero.
elements.adapterLength.value="";
context.window.AI3DParametric.generate();
assert.strictEqual(context.currentMesh,null);
assert.strictEqual(elements.btnDownload.disabled,true);
assert.match(elements.status.textContent,/anna kelvolliset numerot/i);
elements.adapterLength.value="abc";
context.window.AI3DParametric.generate();
assert.strictEqual(context.currentMesh,null);
assert.match(elements.status.textContent,/anna kelvolliset numerot/i);

// Extreme dimensions are rejected even when the newer v2 editor failed to load.
elements.adapterLength.value="5001";
context.window.AI3DParametric.generate();
assert.strictEqual(context.currentMesh,null);
assert.strictEqual(elements.btnDownload.disabled,true);
assert.match(elements.status.textContent,/enintään 5000 mm/i);

// Fallback errors must never be inserted into validation HTML unescaped.
elements.adapterLength.value="40";
bridgeImpl=()=>{throw Error("<img src=x onerror=alert(1)>")};
context.window.AI3DParametric.generate();
assert.ok(!elements.validation.innerHTML.includes("<img src=x"));
assert.ok(elements.validation.innerHTML.includes("&lt;img src=x onerror=alert(1)&gt;"));

console.log("parametric fallback regression: OK");
