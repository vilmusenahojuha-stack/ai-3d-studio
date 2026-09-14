"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("cad_v2_editor.js","utf8");
const input=(id,value="")=>({id,value:String(value),defaultValue:String(value),min:"",max:"",get valueAsNumber(){return Number(this.value)}});
const adapter=[input("adapterLength",30),input("adapterID1",20),input("adapterID2",20),input("adapterOD1",26),input("adapterOD2",26)];
const plate=[];
const roots={
  "fields-plate":{hidden:false,insertAdjacentHTML(){},querySelectorAll:()=>plate},
  "fields-adapter":{hidden:true,querySelectorAll:()=>adapter},
  "fields-enclosure":{hidden:true,querySelectorAll:()=>[]}
};
const partType={value:"plate",onchange:null,querySelector:()=>({}),appendChild(){}};
const material={value:"PETG"};
const elements=new Map(Object.entries({...roots,...Object.fromEntries(adapter.map(e=>[e.id,e])),partType,material,btnGenerate:{onclick:null},btnFitTest:{style:{}},partTitle:{textContent:""}}));
const document={
  getElementById:id=>elements.get(id)||null,
  querySelectorAll:selector=>selector===".part-fields"?Object.values(roots):[],
  createElement:()=>({})
};
const window={AI3D:{setPart(){return true}}};
const context={window,document,console,Error,Object,String,Number,Array,Math,currentMesh:null,currentFitMesh:null,draw(){}};
vm.runInNewContext(source,context,{filename:"cad_v2_editor.js"});

const before={partType:partType.value,material:material.value,adapter:adapter.map(e=>e.value)};
assert.throws(()=>window.AI3DV2Editor.syncPlanToEditor({
  schemaVersion:2,
  partType:"adapter",
  material:"NYLON",
  parameters:{length:60,insideDiameter1:25,insideDiameter2:25,wall:3}
}),/tulostusmateriaalia ei tueta/i,"unsupported ChatGPT material must fail closed before editor synchronization");
assert.equal(partType.value,before.partType,"unsupported material must not switch the editable part type");
assert.equal(material.value,before.material,"unsupported material must not overwrite the current material");
assert.deepEqual(adapter.map(e=>e.value),before.adapter,"unsupported material must not partially overwrite editable CAD parameters");

window.AI3DV2Editor.syncPlanToEditor({
  schemaVersion:2,
  partType:"adapter",
  material:"ASA",
  parameters:{length:60,insideDiameter1:25,insideDiameter2:25,wall:3}
});
assert.equal(partType.value,"adapter","supported ChatGPT material must still allow normal editor synchronization");
assert.equal(material.value,"ASA","supported ChatGPT material must stay synchronized");
assert.deepEqual(adapter.map(e=>Number(e.value)),[60,25,25,31,31],"supported plan dimensions must remain editable and derive outer diameters as before");

console.log("ChatGPT v2 material synchronization regression: OK");
