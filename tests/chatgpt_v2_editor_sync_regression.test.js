"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("cad_v2_editor.js","utf8");
const input=(id,value="")=>({id,value:String(value),defaultValue:String(value),min:"",max:"",style:{},get valueAsNumber(){return Number(this.value)}});
function fixture(withCore=true){
 const adapter=[input("adapterLength",30),input("adapterID1",20),input("adapterID2",20),input("adapterOD1",26),input("adapterOD2",26)];
 const enclosure=[input("enclosureW",80),input("enclosureD",60),input("enclosureH",30),input("enclosureWall",2.4),input("enclosureFloor",2.4)];
 const roots={
  "fields-plate":{hidden:false,insertAdjacentHTML(){}},
  "fields-adapter":{hidden:true,querySelectorAll:()=>adapter},
  "fields-enclosure":{hidden:true,querySelectorAll:()=>enclosure}
 };
 const partType={value:"plate",onchange:null,querySelector:()=>({}),appendChild(){}};
 const material={value:"PETG"};
 const elements=new Map(Object.entries({...roots,partType,material,btnGenerate:{onclick:null},btnFitTest:{style:{}},partTitle:{textContent:""},status:{textContent:""},validation:{innerHTML:""},dimensions:{textContent:""}}));
 const document={
  getElementById:id=>elements.get(id)||null,
  querySelectorAll:selector=>selector===".part-fields"?Object.values(roots):[],
  createElement:()=>({style:{}})
 };
 let rawCalls=0;
 const window={AI3D:{setPart(){return true}}};
 if(withCore)window.AI3DPlanV2CAD={apply(plan){rawCalls++;if(plan.fail)throw Error("invalid plan");return true}};
 const context={window,document,console,Error,Object,String,Number,Array,Math,currentMesh:null,currentFitMesh:null,draw(){}};
 vm.runInNewContext(source,context);
 return{window,partType,material,adapter,enclosure,get rawCalls(){return rawCalls},installCore(){window.AI3DPlanV2CAD={apply(plan){rawCalls++;if(plan.fail)throw Error("invalid plan");return true}}}};
}

const live=fixture(true);
const apply=live.window.AI3DPlanV2CAD.apply;
apply({schemaVersion:2,partType:"adapter",material:"ASA",parameters:{length:42,insideDiameter1:18,insideDiameter2:24,wall:3}});
assert.equal(live.partType.value,"adapter","ChatGPT adapter import must select the editable adapter UI");
assert.equal(live.material.value,"ASA","ChatGPT adapter material must stay synchronized with the editor");
assert.deepEqual(live.adapter.map(x=>Number(x.value)),[42,18,24,24,30],"adapter fields must mirror imported parameters and derive outer diameters from wall exactly like CAD");

apply({schemaVersion:2,partType:"case",material:"PLA",parameters:{width:90,depth:70,height:35,thickness:2.5}});
assert.equal(live.partType.value,"enclosure","box/case aliases must select the editable enclosure UI");
assert.equal(live.material.value,"PLA","ChatGPT enclosure material must stay synchronized with the editor");
assert.deepEqual(live.enclosure.map(x=>Number(x.value)),[90,70,35,2.5,2.5],"enclosure fields must mirror canonical dimensions and thickness aliases");

const before=live.adapter.map(x=>x.value);
assert.throws(()=>apply({schemaVersion:2,partType:"adapter",fail:true,parameters:{length:99}}),/invalid plan/,
 "a rejected CAD plan must still fail closed");
assert.deepEqual(live.adapter.map(x=>x.value),before,"a rejected CAD plan must not overwrite the last valid editable values");
assert.equal(live.rawCalls,3,"all calls must continue through the existing guarded CAD apply implementation");

const recovered=fixture(false);
assert.equal(recovered.window.AI3DV2Editor.ensurePlanSyncHook(),false,
 "editor sync hook must report unavailable while the CAD v2 core is missing");
recovered.installCore();
assert.equal(recovered.window.AI3DV2Editor.apply("adapter"),true,
 "editor must recover when the CAD v2 core appears after the editor has already loaded");
assert.equal(recovered.rawCalls,1,"late-loaded CAD v2 core must receive the recovered editor apply exactly once");
assert.equal(recovered.window.AI3DPlanV2CAD.apply.__ai3dEditorSync,true,
 "late-loaded CAD v2 core must be wrapped with the ChatGPT-to-editor synchronization hook");
recovered.window.AI3DPlanV2CAD.apply({schemaVersion:2,partType:"adapter",material:"ASA",parameters:{length:55,insideDiameter1:21,insideDiameter2:23,wall:2}});
assert.deepEqual(recovered.adapter.map(x=>Number(x.value)),[55,21,23,25,27],
 "a direct ChatGPT CAD apply after runtime recovery must synchronize editable adapter fields");
assert.equal(recovered.material.value,"ASA","runtime-recovered direct apply must synchronize the material too");
assert.equal(recovered.rawCalls,2,"runtime recovery wrapper must not duplicate the underlying CAD apply");

console.log("ChatGPT v2 editable-field synchronization regression: OK");
