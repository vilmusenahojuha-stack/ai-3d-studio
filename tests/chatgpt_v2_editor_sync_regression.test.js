"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("cad_v2_editor.js","utf8");
const input=(id,value="")=>({id,value:String(value),defaultValue:String(value),min:"",max:"",style:{},get valueAsNumber(){return Number(this.value)}});
function fixture(withCore=true){
 const plate=[input("plateL",80),input("plateW",50),input("plateT",4),input("plateHolePattern","none"),input("plateHoleD",6),input("plateHoleEdge",10),input("plateCornerStyle","square"),input("plateCornerSize",5),input("plateCustomHoles","")];
 const adapter=[input("adapterLength",30),input("adapterID1",20),input("adapterID2",20),input("adapterOD1",26),input("adapterOD2",26)];
 const enclosure=[input("enclosureW",80),input("enclosureD",60),input("enclosureH",30),input("enclosureWall",2.4),input("enclosureFloor",2.4)];
 const roots={
  "fields-plate":{hidden:false,insertAdjacentHTML(){},querySelectorAll:()=>plate},
  "fields-adapter":{hidden:true,querySelectorAll:()=>adapter},
  "fields-enclosure":{hidden:true,querySelectorAll:()=>enclosure}
 };
 const partType={value:"plate",onchange:null,querySelector:()=>({}),appendChild(){}};
 const material={value:"PETG"};
 const fieldEntries=Object.fromEntries([...plate,...adapter,...enclosure].map(e=>[e.id,e]));
 const elements=new Map(Object.entries({...roots,...fieldEntries,partType,material,btnGenerate:{onclick:null},btnFitTest:{style:{}},partTitle:{textContent:""},status:{textContent:""},validation:{innerHTML:""},dimensions:{textContent:""}}));
 const document={
  getElementById:id=>elements.get(id)||null,
  querySelectorAll:selector=>selector===".part-fields"?Object.values(roots):[],
  createElement:()=>({style:{}})
 };
 let rawCalls=0;
 const rawApply=plan=>{rawCalls++;if(plan.fail)throw Error("invalid plan");if(plan.softFail)return false;return true};
 const window={AI3D:{setPart(){return true}}};
 if(withCore)window.AI3DPlanV2CAD={apply:rawApply};
 const context={window,document,console,Error,Object,String,Number,Array,Math,currentMesh:null,currentFitMesh:null,draw(){}};
 vm.runInNewContext(source,context);
 return{window,partType,material,plate,adapter,enclosure,roots,get rawCalls(){return rawCalls},installCore(){window.AI3DPlanV2CAD={apply:rawApply}}};
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

apply({schemaVersion:2,partType:"mountingPlate",material:"PETG",parameters:{length:100,width:60,thickness:4,cornerRadius:6,holes:[{x:-20,y:0,diameter:5}],centerHole:8},operations:[{type:"hole",x:20,y:0,diameter:6}]});
assert.equal(live.partType.value,"plate","ChatGPT mountingPlate import must select the existing editable plate UI");
assert.equal(live.roots["fields-plate"].hidden,false,"mountingPlate import must show the standard plate fields without rebuilding the UI");
assert.equal(live.plate.find(x=>x.id==="plateL").value,"100");
assert.equal(live.plate.find(x=>x.id==="plateW").value,"60");
assert.equal(live.plate.find(x=>x.id==="plateT").value,"4");
assert.equal(live.plate.find(x=>x.id==="plateCornerStyle").value,"round");
assert.equal(live.plate.find(x=>x.id==="plateCornerSize").value,"6");
assert.equal(live.plate.find(x=>x.id==="plateHolePattern").value,"custom");
assert.equal(live.plate.find(x=>x.id==="plateCustomHoles").value,"-20;0;5\n0;0;8\n20;0;6","base holes, center hole and hole operations must remain editable after direct ChatGPT CAD apply");

const before=live.adapter.map(x=>x.value);
assert.throws(()=>apply({schemaVersion:2,partType:"adapter",fail:true,parameters:{length:99}}),/invalid plan/,
 "a rejected CAD plan must still fail closed");
assert.deepEqual(live.adapter.map(x=>x.value),before,"a rejected CAD plan must not overwrite the last valid editable values");
const beforeSoftFail={partType:live.partType.value,material:live.material.value,adapter:live.adapter.map(x=>x.value)};
assert.equal(apply({schemaVersion:2,partType:"adapter",material:"ASA",softFail:true,parameters:{length:99,insideDiameter1:30,insideDiameter2:30,wall:4}}),false,
 "an explicitly rejected CAD apply must preserve its false result");
assert.equal(live.partType.value,beforeSoftFail.partType,"a false CAD result must not switch the editable part type");
assert.equal(live.material.value,beforeSoftFail.material,"a false CAD result must not overwrite the editable material");
assert.deepEqual(live.adapter.map(x=>x.value),beforeSoftFail.adapter,"a false CAD result must not overwrite editable parameter fields");
assert.equal(live.rawCalls,5,"all calls must continue through the existing guarded CAD apply implementation");

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
