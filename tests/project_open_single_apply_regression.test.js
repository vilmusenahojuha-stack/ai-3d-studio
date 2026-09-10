"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const html=fs.readFileSync("index.html","utf8");
const storageGuardPos=html.indexOf('storage_commit_guard.js?v=1.8');
const openGuardPos=html.indexOf('project_open_guard.js?v=1.1');
assert(storageGuardPos>=0&&openGuardPos>storageGuardPos,"project open guard must load after storage commit guard in production");

const KEY="ai3d:projects:v3";
const project={id:"p1",name:"Adapteri",type:"adapter",values:{adapterLength:30,adapterID1:20,adapterID2:20,adapterOD1:26,adapterOD2:26,material:"PETG"},print:{printer:"Elegoo Centauri Carbon 2 Combo",nozzle:0.4,notes:"PETG"},sourcePlan:"chatgpt-1",sourceSchema:2,created:1,updated:2};
const store=new Map([[KEY,JSON.stringify([project])],[KEY+":active","p1"]]);
let captureHandler=null,setPartCalls=0,prevented=0,stopped=0;
const elements={
  validation:{querySelector:()=>null},
  status:{textContent:"Malli luotu ja tarkistettu."},
  planSyncStatus:{textContent:"",className:""}
};
const target={closest:selector=>selector==="#projectList [data-id]"?{dataset:{id:"p1"}}:null};
const context={
  console,
  localStorage:{getItem:key=>store.has(key)?store.get(key):null},
  document:{
    getElementById:id=>elements[id]||null,
    addEventListener:(name,fn,capture)=>{if(name==="click"&&capture===true)captureHandler=fn}
  },
  window:{AI3D:{setPart:()=>{setPartCalls++}}}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("project_open_guard.js","utf8"),context,{filename:"project_open_guard.js"});
assert.equal(typeof captureHandler,"function");

// Capture guard must no longer generate the project before projects.js opens it.
captureHandler({target,preventDefault:()=>{prevented++},stopImmediatePropagation:()=>{stopped++}});
assert.equal(setPartCalls,0,"successful click preflight must not generate CAD twice");
assert.equal(prevented,0);
assert.equal(stopped,0);

// The explicit guard API still performs the structural/CAD check when called directly.
context.window.AI3DProjectOpenGuard.check(project);
assert.equal(setPartCalls,1,"explicit check API must still validate through CAD");

// Project-open validation must match projects.js metadata rules.
for(const bad of [
  {...project,print:{...project.print,unknown:"x"}},
  {...project,print:{...project.print,notes:"x".repeat(1001)}},
  {...project,sourcePlan:"x".repeat(161)},
  {...project,sourceSchema:3},
  {...project,created:"1"},
  {...project,updated:Infinity}
]){
  assert.throws(()=>context.window.AI3DProjectOpenGuard.check(bad),/rakennetarkistusta/);
}
assert.equal(setPartCalls,1,"invalid metadata must be rejected before CAD generation");

// Cross-tab conflict remains fail-closed before the normal click handler can run.
context.window.AI3DStorageCommitGuard={hasConflict:true,lastIssue:"Uudempi projektiversio toisessa välilehdessä."};
captureHandler({target,preventDefault:()=>{prevented++},stopImmediatePropagation:()=>{stopped++}});
assert.equal(setPartCalls,1);
assert.equal(prevented,1);
assert.equal(stopped,1);
assert.match(elements.planSyncStatus.textContent,/Uudempi projektiversio/);

console.log("Project open single-apply regression: OK");
