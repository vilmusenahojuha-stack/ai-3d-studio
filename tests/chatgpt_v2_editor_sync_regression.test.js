"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("cad_v2_editor.js","utf8");
const input=(id,value="")=>({id,value:String(value),defaultValue:String(value),min:"",max:"",style:{}});
const adapter=[input("adapterLength",30),input("adapterID1",20),input("adapterID2",20),input("adapterOD1",26),input("adapterOD2",26)];
const enclosure=[input("enclosureW",80),input("enclosureD",60),input("enclosureH",30),input("enclosureWall",2.4),input("enclosureFloor",2.4)];
const roots={
 "fields-plate":{hidden:false,insertAdjacentHTML(){}},
 "fields-adapter":{hidden:true,querySelectorAll:()=>adapter},
 "fields-enclosure":{hidden:true,querySelectorAll:()=>enclosure}
};
const partType={value:"plate",onchange:null,querySelector:()=>({}),appendChild(){}};
const material={value:"PETG"};
const elements=new Map(Object.entries({...roots,partType,material,btnGenerate:{onclick:null},btnFitTest:{style:{}},partTitle:{textContent:""}}));
const document={
 getElementById:id=>elements.get(id)||null,
 querySelectorAll:selector=>selector===".part-fields"?Object.values(roots):[],
 createElement:()=>({style:{}})
};
let rawCalls=0;
const window={
 AI3D:{setPart(){return true}},
 AI3DPlanV2CAD:{apply(plan){rawCalls++;if(plan.fail)throw Error("invalid plan");return true}}
};
vm.runInNewContext(source,{window,document,console,Error,Object,String,Number,Array,Math,currentMesh:null,currentFitMesh:null,draw(){}});

const apply=window.AI3DPlanV2CAD.apply;
apply({schemaVersion:2,partType:"adapter",material:"ASA",parameters:{length:42,insideDiameter1:18,insideDiameter2:24,wall:3}});
assert.equal(partType.value,"adapter","ChatGPT adapter import must select the editable adapter UI");
assert.equal(material.value,"ASA","ChatGPT adapter material must stay synchronized with the editor");
assert.deepEqual(adapter.map(x=>Number(x.value)),[42,18,24,24,30],"adapter fields must mirror imported parameters and derive outer diameters from wall exactly like CAD");

apply({schemaVersion:2,partType:"case",material:"PLA",parameters:{width:90,depth:70,height:35,thickness:2.5}});
assert.equal(partType.value,"enclosure","box/case aliases must select the editable enclosure UI");
assert.equal(material.value,"PLA","ChatGPT enclosure material must stay synchronized with the editor");
assert.deepEqual(enclosure.map(x=>Number(x.value)),[90,70,35,2.5,2.5],"enclosure fields must mirror canonical dimensions and thickness aliases");

const before=adapter.map(x=>x.value);
assert.throws(()=>apply({schemaVersion:2,partType:"adapter",fail:true,parameters:{length:99}}),/invalid plan/,
 "a rejected CAD plan must still fail closed");
assert.deepEqual(adapter.map(x=>x.value),before,"a rejected CAD plan must not overwrite the last valid editable values");
assert.equal(rawCalls,3,"all calls must continue through the existing guarded CAD apply implementation");

console.log("ChatGPT v2 editable-field synchronization regression: OK");
