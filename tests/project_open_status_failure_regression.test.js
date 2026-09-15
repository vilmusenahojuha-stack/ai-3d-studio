"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const project={id:"p1",name:"Adapteri",type:"adapter",values:{adapterLength:30,adapterID1:20,adapterID2:20,adapterOD1:26,adapterOD2:26,material:"PETG"},created:1,updated:2};
const elements={
  validation:{querySelector:()=>null},
  status:{textContent:"Malli luotu ja tarkistettu."},
  partType:{value:"sleeve",defaultValue:"spike"},
  adapterLength:{value:"12",defaultValue:"10"},
  material:{value:"PLA",defaultValue:"PLA"},
  btnDownload:{disabled:false},
  btnFitTest:{disabled:false},
  btnCentauriStl:{disabled:false}
};
const rawSetPart=()=>{elements.partType.value="adapter";elements.adapterLength.value="30";elements.material.value="PETG";elements.status.textContent="CAD-malli ei läpäissyt tarkistusta.";return true};
const context={console,Promise,localStorage:{getItem:()=>"[]"},document:{getElementById:id=>elements[id]||null,addEventListener:()=>{}},window:{AI3D:{setPart:rawSetPart}}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("project_open_guard.js","utf8"),context,{filename:"project_open_guard.js"});

assert.throws(()=>context.window.AI3DProjectOpenGuard.check(project),/ei läpäissyt tarkistusta/i,"status-only CAD validation failure must fail closed even when validation markup is unavailable");
assert.equal(elements.partType.value,"sleeve","failed status must restore previous part type");
assert.equal(elements.adapterLength.value,"12","failed status must restore previous parameter value");
assert.equal(elements.material.value,"PLA","failed status must restore previous material");
assert.equal(elements.btnDownload.disabled,true,"failed project CAD must disable generic STL export");
assert.equal(elements.btnFitTest.disabled,true,"failed project CAD must disable fit-test export");
assert.equal(elements.btnCentauriStl.disabled,true,"failed project CAD must disable Centauri STL export");

elements.status.textContent="Malli luotu ja tarkistettu.";
elements.btnDownload.disabled=false;elements.btnFitTest.disabled=false;elements.btnCentauriStl.disabled=false;
assert.throws(()=>context.window.AI3D.setPart("adapter",project.values),/ei läpäissyt tarkistusta/i,"wrapped setPart must fail closed before projects.js can accept a status-only CAD failure");
assert.equal(elements.partType.value,"sleeve","wrapped setPart status failure must restore previous part type");
assert.equal(elements.adapterLength.value,"12","wrapped setPart status failure must restore previous parameter value");
assert.equal(elements.material.value,"PLA","wrapped setPart status failure must restore previous material");
assert.equal(elements.btnDownload.disabled,true,"wrapped status failure must disable generic STL export");
assert.equal(elements.btnFitTest.disabled,true,"wrapped status failure must disable fit-test export");
assert.equal(elements.btnCentauriStl.disabled,true,"wrapped status failure must disable Centauri STL export");

(async()=>{
  let resolveFirst,resolveSecond;
  const raceElements={
    validation:{querySelector:()=>null},status:{textContent:"Malli luotu ja tarkistettu."},partType:{value:"sleeve",defaultValue:"spike"},adapterLength:{value:"12",defaultValue:"10"},material:{value:"PLA",defaultValue:"PLA"},btnDownload:{disabled:false},btnFitTest:{disabled:false},btnCentauriStl:{disabled:false}
  };
  let calls=0;
  const raceContext={console,Promise,localStorage:{getItem:()=>"[]"},document:{getElementById:id=>raceElements[id]||null,addEventListener:()=>{}},window:{AI3D:{setPart:()=>new Promise(resolve=>{calls++;if(calls===1)resolveFirst=resolve;else resolveSecond=resolve})}}};
  raceContext.globalThis=raceContext;vm.createContext(raceContext);vm.runInContext(fs.readFileSync("project_open_guard.js","utf8"),raceContext,{filename:"project_open_guard.js"});
  const first=raceContext.window.AI3D.setPart("adapter",project.values);
  const second=raceContext.window.AI3D.setPart("adapter",project.values);
  resolveSecond(true);assert.equal(await second,true,"newest async CAD result must remain usable");
  raceElements.btnDownload.disabled=false;raceElements.btnFitTest.disabled=false;raceElements.btnCentauriStl.disabled=false;
  resolveFirst(true);assert.equal(await first,false,"older async CAD completion must be rejected as stale");
  assert.equal(raceElements.btnDownload.disabled,true,"stale CAD completion must disable generic STL export");
  assert.equal(raceElements.btnFitTest.disabled,true,"stale CAD completion must disable fit-test export");
  assert.equal(raceElements.btnCentauriStl.disabled,true,"stale CAD completion must disable Centauri STL export");
  console.log("Project open status failure regression: OK");
})().catch(error=>{console.error(error);process.exitCode=1});
