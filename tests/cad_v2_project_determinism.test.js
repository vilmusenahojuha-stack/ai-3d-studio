"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

function input(id,def,min="",max=""){
  return {id,value:String(def),defaultValue:String(def),min:String(min),max:String(max),type:"number",hidden:false,get valueAsNumber(){return Number(this.value)}};
}
function group(id,children){
  return {id,hidden:false,querySelectorAll(sel){return sel==="input[id],select[id]"?children:[]}};
}

const elements={
  partType:{id:"partType",value:"plate",onchange:null,querySelector:()=>null,appendChild:()=>{}},
  "fields-plate":{id:"fields-plate",hidden:false,insertAdjacentHTML:()=>{}},
  btnGenerate:{id:"btnGenerate",onclick:null},
  btnFitTest:{id:"btnFitTest",disabled:false,style:{}},
  btnDownload:{id:"btnDownload",disabled:false},
  status:{id:"status",textContent:""},
  validation:{id:"validation",innerHTML:""},
  dimensions:{id:"dimensions",textContent:""},
  material:{id:"material",value:"PETG"}
};
const adapter=[
  input("adapterLength",30,2,5000),input("adapterID1",20,.1,5000),input("adapterID2",20,.1,5000),input("adapterOD1",26,.1,5000),input("adapterOD2",26,.1,5000)
];
const enclosure=[
  input("enclosureW",80,3,5000),input("enclosureD",60,3,5000),input("enclosureH",30,3,5000),input("enclosureWall",2.4,.8,5000),input("enclosureFloor",2.4,.8,5000)
];
for(const e of [...adapter,...enclosure])elements[e.id]=e;
elements["fields-adapter"]=group("fields-adapter",adapter);
elements["fields-enclosure"]=group("fields-enclosure",enclosure);

let lastPlan=null;
const context={
  console,
  setTimeout,
  clearTimeout,
  currentMesh:null,
  currentFitMesh:null,
  draw:()=>{},
  window:{
    AI3D:{setPart:()=>{}},
    AI3DPlanV2CAD:{apply:p=>{lastPlan=p}}
  },
  document:{
    getElementById:id=>elements[id]||null,
    querySelectorAll:sel=>sel===".part-fields"?[elements["fields-plate"],elements["fields-adapter"],elements["fields-enclosure"]]:[],
    createElement:()=>({value:"",textContent:""})
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("cad_v2_editor.js","utf8"),context,{filename:"cad_v2_editor.js"});

// A previous project must not leak stale dimensions into a partial saved/imported v2 project.
elements.adapterID2.value="777";
elements.adapterOD2.value="888";
context.window.AI3D.setPart("adapter",{adapterLength:45,adapterID1:22,adapterOD1:30});
assert.equal(elements.adapterLength.value,"45");
assert.equal(elements.adapterID1.value,"22");
assert.equal(elements.adapterID2.value,"20");
assert.equal(elements.adapterOD1.value,"30");
assert.equal(elements.adapterOD2.value,"26");
assert.deepEqual(JSON.parse(JSON.stringify(lastPlan.parameters)),{length:45,insideDiameter1:22,insideDiameter2:20,outsideDiameter1:30,outsideDiameter2:26});

// The same deterministic reset is required for enclosure projects.
elements.enclosureD.value="999";
elements.enclosureFloor.value="99";
context.window.AI3D.setPart("enclosure",{enclosureW:100,enclosureH:40,enclosureWall:3});
assert.equal(elements.enclosureW.value,"100");
assert.equal(elements.enclosureD.value,"60");
assert.equal(elements.enclosureH.value,"40");
assert.equal(elements.enclosureWall.value,"3");
assert.equal(elements.enclosureFloor.value,"2.4");
assert.deepEqual(JSON.parse(JSON.stringify(lastPlan.parameters)),{width:100,length:60,height:40,wall:3,floorThickness:2.4});

console.log("CAD v2 project determinism regression: OK");
