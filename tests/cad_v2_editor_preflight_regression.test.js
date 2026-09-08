"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ROOT=path.resolve(__dirname,"..");
function el(extra={}){return{value:"",valueAsNumber:NaN,min:"",max:"",defaultValue:"",hidden:false,disabled:false,textContent:"",innerHTML:"",style:{},querySelector(){return null},querySelectorAll(){return[]},insertAdjacentHTML(){},...extra}}
const elements={
 partType:el({value:"adapter",onchange:null}),"fields-plate":el(),"fields-adapter":el(),"fields-enclosure":el(),btnGenerate:el({onclick:null}),material:el({value:"PETG"}),status:el(),validation:el(),btnDownload:el(),btnFitTest:el(),dimensions:el(),partTitle:el(),
 adapterLength:el({valueAsNumber:30,min:"2",max:"5000"}),adapterID1:el({valueAsNumber:20,min:"0.1",max:"5000"}),adapterID2:el({valueAsNumber:20,min:"0.1",max:"5000"}),adapterOD1:el({valueAsNumber:26,min:"0.1",max:"5000"}),adapterOD2:el({valueAsNumber:26,min:"0.1",max:"5000"}),
 enclosureW:el({valueAsNumber:80,min:"3",max:"5000"}),enclosureD:el({valueAsNumber:60,min:"3",max:"5000"}),enclosureH:el({valueAsNumber:30,min:"3",max:"5000"}),enclosureWall:el({valueAsNumber:2.4,min:"0.8",max:"5000"}),enclosureFloor:el({valueAsNumber:2.4,min:"0.8",max:"5000"})
};
const partFields=[elements["fields-plate"],elements["fields-adapter"],elements["fields-enclosure"]];
const document={getElementById:id=>elements[id]||null,querySelectorAll:sel=>sel===".part-fields"?partFields:[],createElement:()=>el()};
let applied=[];
const window={AI3D:{setPart(){}},AI3DPlanV2CAD:{apply:plan=>applied.push(plan)}};
const context={window,document,console,Number,Math,Set,Error,currentMesh:{old:true},currentFitMesh:{old:true},draw(){}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,"cad_v2_editor.js"),"utf8"),context,{filename:"cad_v2_editor.js"});
assert.ok(window.AI3DV2Editor,"CAD v2 editor test API must initialize");
assert.equal(window.AI3DV2Editor.apply("adapter"),true,"valid adapter must still reach CAD generator");
assert.equal(applied.length,1);
elements.adapterOD1.valueAsNumber=20.7;
assert.equal(window.AI3DV2Editor.apply("adapter"),false,"adapter below 0.4 mm radial wall must be rejected before CAD generation");
assert.equal(applied.length,1,"invalid adapter must not reach CAD generator");
assert.match(elements.status.textContent,/vähintään 0,4 mm seinämä/);
assert.equal(elements.btnDownload.disabled,true,"failed preflight must disable stale STL download");
elements.adapterOD1.valueAsNumber=26;
elements.partType.value="enclosure";
elements.enclosureW.valueAsNumber=6;
elements.enclosureWall.valueAsNumber=2;
assert.equal(window.AI3DV2Editor.apply("enclosure"),false,"enclosure without usable inner width must be rejected before CAD generation");
assert.equal(applied.length,1,"invalid enclosure must not reach CAD generator");
assert.match(elements.status.textContent,/sisätila ei mahdu/);
elements.enclosureW.valueAsNumber=80;
assert.equal(window.AI3DV2Editor.apply("enclosure"),true,"valid enclosure must still reach CAD generator");
assert.equal(applied.length,2);
console.log("CAD v2 editor preflight regression: ok");
