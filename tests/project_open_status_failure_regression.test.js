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
  material:{value:"PLA",defaultValue:"PLA"}
};
const context={console,Promise,localStorage:{getItem:()=>"[]"},document:{getElementById:id=>elements[id]||null,addEventListener:()=>{}},window:{AI3D:{setPart:()=>{elements.partType.value="adapter";elements.adapterLength.value="30";elements.material.value="PETG";elements.status.textContent="CAD-malli ei läpäissyt tarkistusta.";return true}}}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("project_open_guard.js","utf8"),context,{filename:"project_open_guard.js"});

assert.throws(()=>context.window.AI3DProjectOpenGuard.check(project),/ei läpäissyt tarkistusta/i,"status-only CAD validation failure must fail closed even when validation markup is unavailable");
assert.equal(elements.partType.value,"sleeve","failed status must restore previous part type");
assert.equal(elements.adapterLength.value,"12","failed status must restore previous parameter value");
assert.equal(elements.material.value,"PLA","failed status must restore previous material");

console.log("Project open status failure regression: OK");
