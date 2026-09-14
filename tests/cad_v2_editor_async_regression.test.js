"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ROOT=path.resolve(__dirname,"..");
function el(extra={}){return{value:"",valueAsNumber:NaN,min:"",max:"",defaultValue:"",hidden:false,disabled:false,textContent:"",innerHTML:"",style:{},querySelector(){return null},querySelectorAll(){return[]},insertAdjacentHTML(){},appendChild(){},...extra}}
function fixture(rawApply){
 const elements={
  partType:el({value:"adapter",onchange:null}),"fields-plate":el(),"fields-adapter":el(),"fields-enclosure":el(),btnGenerate:el({onclick:null}),material:el({value:"PETG"}),status:el(),validation:el(),btnDownload:el(),btnFitTest:el(),btnCentauriStl:el(),dimensions:el({textContent:"26 × 26 × 30 mm"}),partTitle:el(),
  adapterLength:el({valueAsNumber:30,min:"2",max:"5000"}),adapterID1:el({valueAsNumber:20,min:"0.1",max:"5000"}),adapterID2:el({valueAsNumber:20,min:"0.1",max:"5000"}),adapterOD1:el({valueAsNumber:26,min:"0.1",max:"5000"}),adapterOD2:el({valueAsNumber:26,min:"0.1",max:"5000"}),
  enclosureW:el({valueAsNumber:80,min:"3",max:"5000"}),enclosureD:el({valueAsNumber:60,min:"3",max:"5000"}),enclosureH:el({valueAsNumber:30,min:"3",max:"5000"}),enclosureWall:el({valueAsNumber:2.4,min:"0.8",max:"5000"}),enclosureFloor:el({valueAsNumber:2.4,min:"0.8",max:"5000"})
 };
 const partFields=[elements["fields-plate"],elements["fields-adapter"],elements["fields-enclosure"]];
 const document={getElementById:id=>elements[id]||null,querySelectorAll:sel=>sel===".part-fields"?partFields:[],createElement:()=>el()};
 const window={AI3D:{setPart(){return true}},AI3DPlanV2CAD:{apply:rawApply}};
 const context={window,document,console,Number,Math,Set,Error,Promise,Object,String,Array,currentMesh:{old:true},currentFitMesh:{old:true},draw(){}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,"cad_v2_editor.js"),"utf8"),context,{filename:"cad_v2_editor.js"});
 return{window,elements,context};
}
async function main(){
 let resolveSuccess;
 const success=fixture(()=>new Promise(resolve=>{resolveSuccess=resolve}));
 const pending=success.window.AI3DV2Editor.apply("adapter");
 assert.ok(pending&&typeof pending.then==="function","asynchronous editor CAD apply must remain awaitable");
 resolveSuccess({ok:true});
 assert.equal(await pending,true,"successful asynchronous CAD generation must resolve true");

 let resolveFalse;
 const rejected=fixture(()=>new Promise(resolve=>{resolveFalse=resolve}));
 rejected.elements.btnDownload.disabled=false;rejected.elements.btnCentauriStl.disabled=false;
 const falseResult=rejected.window.AI3DV2Editor.apply("adapter");
 resolveFalse(false);
 assert.equal(await falseResult,false,"an asynchronous false CAD result must fail closed");
 assert.match(rejected.elements.status.textContent,/CAD-moottori hylkäsi mallin/);
 assert.equal(rejected.context.currentMesh,null,"asynchronous false CAD result must clear stale main mesh");
 assert.equal(rejected.context.currentFitMesh,null,"asynchronous false CAD result must clear stale fit mesh");
 assert.equal(rejected.elements.btnDownload.disabled,true,"asynchronous false CAD result must disable stale STL download");
 assert.equal(rejected.elements.btnCentauriStl.disabled,true,"asynchronous false CAD result must disable stale Centauri export");

 const failed=fixture(()=>Promise.reject(Error("myöhäinen CAD-virhe")));
 assert.equal(await failed.window.AI3DV2Editor.apply("adapter"),false,"rejected asynchronous CAD apply must resolve to the editor's false failure contract");
 assert.match(failed.elements.status.textContent,/myöhäinen CAD-virhe/);
 assert.equal(failed.context.currentMesh,null,"rejected asynchronous CAD apply must clear stale preview state");

 let resolveSetPart;
 const imported=fixture(()=>new Promise(resolve=>{resolveSetPart=resolve}));
 const setPartResult=imported.window.AI3D.setPart("adapter",{material:"PETG",adapterLength:30,adapterID1:20,adapterID2:20,adapterOD1:26,adapterOD2:26});
 assert.ok(setPartResult&&typeof setPartResult.then==="function","programmatic setPart must propagate an asynchronous CAD result to import/project callers");
 resolveSetPart(false);
 await assert.rejects(setPartResult,/CAD-moottori hylkäsi mallin|^Virhe:/,"programmatic setPart must reject instead of reporting success when asynchronous CAD generation fails");

 console.log("CAD v2 editor async regression: ok");
}
main().catch(error=>{console.error(error);process.exitCode=1});
