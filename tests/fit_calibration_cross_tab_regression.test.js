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

console.log("fit calibration cross-tab regression: ok");
