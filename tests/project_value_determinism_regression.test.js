"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.resolve(__dirname,"..","project_open_guard.js"),"utf8");
const elements={};
const addInput=(id,value)=>elements[id]={id,tagName:"INPUT",defaultValue:String(value),value:String(value)};
const addSelect=(id,selected,values)=>elements[id]={id,tagName:"SELECT",value:selected,options:values.map(value=>({value,defaultSelected:value===selected}))};
addInput("sleeveID",20);addInput("sleeveWall",3);addInput("sleeveLength",30);
addInput("adapterLength",40);addInput("adapterID1",20);addInput("adapterID2",30);addInput("adapterOD1",26);addInput("adapterOD2",36);
addSelect("material","PETG",["PLA","PETG","ASA"]);
elements.validation={querySelector(){return null}};elements.status={textContent:"Malli luotu"};
const applied=[];
function rawSetPart(type,values={}){for(const[k,v]of Object.entries(values))if(elements[k])elements[k].value=String(v);applied.push({type,values:{...values},state:Object.fromEntries(Object.entries(elements).filter(([,e])=>"value"in e).map(([k,e])=>[k,e.value]))})}
const listeners=[];
const document={getElementById:id=>elements[id]||null,addEventListener:(name,fn,capture)=>listeners.push({name,fn,capture})};
const window={AI3D:{setPart:rawSetPart}};
const localStorage={getItem(){return"[]"}};
const context={window,document,localStorage,console,Array,Object,Set,Number,String,JSON,Error};
vm.createContext(context);vm.runInContext(source,context,{filename:"project_open_guard.js"});
const guard=window.AI3DProjectOpenGuard;
assert.equal(typeof guard?.resetValues,"function","project guard must expose deterministic field reset");
assert.equal(typeof guard?.install,"function","project guard must expose wrapper re-installation for runtime recovery");
assert.equal(window.AI3D.setPart.__ai3dProjectDefaults,true,"project guard must wrap the active CAD setPart implementation");

// Simulate values left behind by a different project. A partial sleeve must not inherit them.
elements.sleeveID.value="91";elements.sleeveWall.value="9";elements.sleeveLength.value="99";elements.material.value="ASA";
window.AI3D.setPart("sleeve",{sleeveID:42});
assert.equal(elements.sleeveID.value,"42","an explicit project value must win over the default");
assert.equal(elements.sleeveWall.value,"3","a missing sleeve wall must resolve to its declared editor default, not stale UI state");
assert.equal(elements.sleeveLength.value,"30","a missing sleeve length must resolve to its declared editor default");
assert.equal(elements.material.value,"PETG","a missing material must resolve to the declared material default");

// Dynamically injected parametric controls use the same deterministic rule.
for(const id of["adapterLength","adapterID1","adapterID2","adapterOD1","adapterOD2"])elements[id].value="777";
elements.material.value="ASA";
window.AI3D.setPart("adapter",{adapterID1:25,material:"ASA"});
assert.equal(elements.adapterLength.value,"40");
assert.equal(elements.adapterID1.value,"25");
assert.equal(elements.adapterID2.value,"30");
assert.equal(elements.adapterOD1.value,"26");
assert.equal(elements.adapterOD2.value,"36");
assert.equal(elements.material.value,"ASA","explicit material must still override the reset default");

// If a late-loaded CAD add-on replaces setPart, runtime recovery must be able to re-wrap it.
let lateCalls=0;
window.AI3D.setPart=(type,values={})=>{lateCalls++;for(const[k,v]of Object.entries(values))if(elements[k])elements[k].value=String(v)};
elements.sleeveWall.value="88";
assert.equal(guard.install(),true,"deterministic wrapper must be reinstallable after a late CAD wrapper");
assert.equal(window.AI3D.setPart.__ai3dProjectDefaults,true);
window.AI3D.setPart("sleeve",{sleeveID:24});
assert.equal(lateCalls,1,"reinstalled project guard must call the late CAD implementation exactly once");
assert.equal(elements.sleeveWall.value,"3","reinstalled wrapper must retain deterministic missing-field behavior");

assert.ok(applied.length>=2,"primary wrapped CAD implementation must have been exercised");
console.log("project value determinism regression: ok");
