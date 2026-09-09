"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("centauri_state_guard.js","utf8");
const elements=new Map([
 ["centauriStatus",{className:"",innerHTML:""}],
 ["btnCentauriStl",{disabled:false}]
]);
let nextTimer=1;
const timers=new Map();
const observers=[];
let checks=0;

const context=vm.createContext({
 console,
 document:{
  readyState:"complete",
  visibilityState:"visible",
  getElementById:id=>elements.get(id)||null,
  querySelector:()=>null,
  addEventListener(){}
 },
 window:{CentauriProfile:{check(){checks++}}},
 MutationObserver:function(callback){this.observe=(target,options)=>observers.push({callback,target,options})},
 setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id},
 clearTimeout(id){timers.delete(id)}
});

vm.runInContext(source,context,{filename:"centauri_state_guard.js"});
const guard=context.window.AI3DCentauriStateGuard;
assert.ok(guard,"Centauri state guard must initialize");

function runTimers(){
 const pending=[...timers.entries()];
 timers.clear();
 for(const [,fn] of pending)fn();
}

runTimers();
const centauriButton=elements.get("btnCentauriStl");
const buttonObserver=observers.find(x=>x.target===centauriButton);
assert.ok(buttonObserver,"Centauri export button must be observed for stale re-enables");
assert.equal(buttonObserver.options?.attributes,true,"Centauri export observer must watch attributes");
assert.equal(Array.from(buttonObserver.options?.attributeFilter||[]).join(","),"disabled","Centauri export observer must only watch disabled state");

guard.refresh(true);
assert.equal(timers.size,1,"refresh must schedule a compatibility check");
guard.markDirty();
assert.equal(guard.isDirty(),true,"geometry change must mark Centauri state dirty");
assert.equal(centauriButton.disabled,true,"geometry change must disable Centauri STL export immediately");
assert.equal(timers.size,0,"geometry change must cancel a queued stale compatibility refresh");
runTimers();
assert.equal(checks,1,"cancelled stale refresh must not add another compatibility check");
assert.equal(guard.isDirty(),true,"cancelled stale refresh must not clear the dirty state");

centauriButton.disabled=false;
buttonObserver.callback();
assert.equal(centauriButton.disabled,true,"external Centauri status refresh must not re-enable export while geometry is dirty");

context.window.CentauriProfile=null;
guard.refresh(true);
runTimers();
assert.equal(guard.isDirty(),true,"missing Centauri checker must not clear dirty state");

context.window.CentauriProfile={check(){throw new Error("checker failed")}};
guard.refresh(true);
runTimers();
assert.equal(guard.isDirty(),true,"failed Centauri checker must keep dirty state fail-closed");
assert.equal(centauriButton.disabled,true,"failed Centauri checker must keep Centauri STL export disabled");

context.window.CentauriProfile={check(){checks++}};
guard.refresh(true);
runTimers();
assert.equal(guard.isDirty(),false,"successful Centauri checker may clear dirty state");
assert.equal(checks,2,"successful refresh must execute one additional compatibility check");

centauriButton.disabled=false;
buttonObserver.callback();
assert.equal(centauriButton.disabled,false,"clean Centauri state must not fight a legitimate export enable");

console.log("centauri state guard race regression: OK");
