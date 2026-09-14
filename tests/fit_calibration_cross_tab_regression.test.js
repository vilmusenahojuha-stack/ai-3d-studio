"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("fit_calibration.js","utf8");
const KEY="ai3d:centauri-fit:v1";

class MemoryStorage{
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function boot(storage,material="PLA"){
  const listeners={document:{},window:{}};
  const elements={
    previewPanel:el(),
    partType:el({value:"spike"}),
    material:el({value:material}),
    clearance:el({type:"number",value:"0.25",valueAsNumber:0.25})
  };
  function registerInjected(){
    elements.fitCalibrationState=el();
    elements.fitCorrection=el({type:"number",value:"",valueAsNumber:NaN});
    elements.btnSaveFitCalibration=el();
    elements.btnClearFitCalibration=el();
  }
  function el(overrides={}){
    const handlers={};
    const node={
      id:"",value:"",valueAsNumber:NaN,type:"text",className:"",hidden:false,textContent:"",
      _html:"",handlers,
      addEventListener(name,fn){handlers[name]=fn;},
      appendChild(){},
      set innerHTML(v){this._html=String(v);if(this.id==="fitCalibrationPanel")registerInjected();},
      get innerHTML(){return this._html;},
      ...overrides
    };
    return node;
  }
  const document={
    readyState:"loading",hidden:false,activeElement:null,
    getElementById(id){return elements[id]||null;},
    querySelector(selector){return selector===".preview-panel"?elements.previewPanel:null;},
    createElement(){return el();},
    addEventListener(name,fn){listeners.document[name]=fn;},
    dispatchEvent(){},
  };
  elements.previewPanel.appendChild=node=>{if(node?.id)elements[node.id]=node;};
  const window={addEventListener(name,fn){listeners.window[name]=fn;}};
  const context={window,document,localStorage:storage,console,Date,Number,JSON,Set,Object,CustomEvent:function(type){this.type=type;}};
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"fit_calibration.js"});
  listeners.document.DOMContentLoaded();
  return {context,elements,listeners};
}

function setCorrection(tab,value){
  const input=tab.elements.fitCorrection;
  input.value=String(value);
  input.valueAsNumber=value;
  tab.elements.btnSaveFitCalibration.handlers.click();
}

const storage=new MemoryStorage();
const tabA=boot(storage,"PLA");
const tabB=boot(storage,"PETG");

setCorrection(tabA,0.1);
assert.strictEqual(tabA.context.window.AI3DFitCalibration.getCorrection("PLA"),0.1,"first tab must save PLA calibration");

setCorrection(tabB,0.2);
const merged=JSON.parse(storage.getItem(KEY));
assert.strictEqual(merged.corrections.PLA.correction,0.1,"stale PETG tab must preserve newer PLA calibration from storage");
assert.strictEqual(merged.corrections.PETG.correction,0.2,"PETG calibration must be saved alongside PLA");

const tabC=boot(storage,"ASA");
setCorrection(tabA,0.15);
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("PLA"),0.1,"other tab remains stale until a storage event is received");
tabC.listeners.window.storage({key:KEY,storageArea:storage});
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("PLA"),0.15,"storage event must refresh calibration state from the other tab");
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("PETG"),0.2,"storage refresh must retain other material calibrations");

const tabD=boot(storage,"ASA");
tabC.elements.fitCorrection.value="0.35";
tabC.elements.fitCorrection.valueAsNumber=0.35;
tabC.context.document.activeElement=tabC.elements.fitCorrection;
setCorrection(tabD,0.3);
tabC.listeners.window.storage({key:KEY,storageArea:storage});
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("ASA"),0.3,"focused tab must still refresh the newly saved ASA calibration state");
assert.strictEqual(tabC.elements.fitCorrection.value,"0.35","cross-tab refresh must not overwrite an in-progress focused calibration draft");
tabC.context.document.activeElement=null;
tabC.listeners.window.storage({key:KEY,storageArea:storage});
assert.strictEqual(tabC.elements.fitCorrection.value,"0.3","once the draft is no longer focused, storage refresh may render the latest saved calibration into the field");

storage.removeItem(KEY);
tabC.listeners.window.storage({key:KEY,storageArea:storage});
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("PLA"),undefined,"removing the calibration record in another tab must clear stale PLA calibration state");
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("PETG"),undefined,"removing the calibration record must clear all stale material calibrations");
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("ASA"),undefined,"removed storage must not leave the last ASA correction active in memory");
assert.strictEqual(tabC.elements.fitCorrection.value,"","the calibration field must reflect that no saved calibration remains");

const futureRaw=JSON.stringify({version:2,printer:"Elegoo Centauri Carbon 2 Combo",nozzle:0.4,corrections:{ASA:{correction:0.45,updatedAt:Date.now()}}});
storage.setItem(KEY,futureRaw);
tabC.listeners.window.storage({key:KEY,storageArea:storage});
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("ASA"),undefined,"unsupported future calibration data must not be used as if it were current v1 data");
assert.strictEqual(tabC.elements.fitCalibrationState.className,"printer-status fail","unsupported calibration storage must be shown as an explicit failure instead of silently appearing empty");
assert.match(tabC.elements.fitCalibrationState.innerHTML,/ei ylikirjoiteta automaattisesti/i,"invalid storage warning must explain that the original record is preserved");
setCorrection(tabC,0.4);
assert.strictEqual(storage.getItem(KEY),futureRaw,"saving a new correction must not overwrite an unsupported future calibration record");
assert.strictEqual(tabC.elements.fitCorrection.value,"0.4","blocked save should preserve the user's in-progress correction draft");

tabC.elements.btnClearFitCalibration.handlers.click();
assert.strictEqual(storage.getItem(KEY),futureRaw,"clearing the current material must also fail closed instead of overwriting unsupported storage");

const unknownMaterialRaw=JSON.stringify({version:1,printer:"Elegoo Centauri Carbon 2 Combo",nozzle:0.4,corrections:{PLA:{correction:0.1,updatedAt:Date.now()},TPU:{correction:0.25,updatedAt:Date.now()}}});
storage.setItem(KEY,unknownMaterialRaw);
tabC.listeners.window.storage({key:KEY,storageArea:storage});
assert.strictEqual(tabC.context.window.AI3DFitCalibration.getCorrection("PLA"),undefined,"a v1 record containing an unknown material must fail closed instead of partially loading known entries");
assert.strictEqual(tabC.elements.fitCalibrationState.className,"printer-status fail","unknown material entries must surface the same explicit storage failure state");
setCorrection(tabC,0.4);
assert.strictEqual(storage.getItem(KEY),unknownMaterialRaw,"saving a supported material must not silently delete an unknown calibration entry");
tabC.elements.btnClearFitCalibration.handlers.click();
assert.strictEqual(storage.getItem(KEY),unknownMaterialRaw,"clearing a supported material must also preserve an unknown calibration entry");

storage.removeItem(KEY);
tabC.listeners.window.storage({key:KEY,storageArea:storage});
setCorrection(tabC,0.4);
assert.strictEqual(JSON.parse(storage.getItem(KEY)).corrections.ASA.correction,0.4,"normal calibration saving must recover after the invalid external record is explicitly removed");

console.log("fit calibration cross-tab regression: ok");
