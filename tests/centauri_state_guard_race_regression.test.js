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
assert.equal(typeof guard.installSafeCheck,"function","state guard must expose safe-check installation for late profile loads");

function runTimers(){
 const pending=[...timers.entries()];
 timers.clear();
 for(const [,fn] of pending)fn();
}

runTimers();
const centauriButton=elements.get("btnCentauriStl");
const status=elements.get("centauriStatus");
const buttonObserver=observers.find(x=>x.target===centauriButton);
assert.ok(buttonObserver,"Centauri export button must be observed for stale re-enables");
assert.equal(buttonObserver.options?.attributes,true,"Centauri export observer must watch attributes");
assert.equal(Array.from(buttonObserver.options?.attributeFilter||[]).join(","),"disabled","Centauri export observer must only watch disabled state");

// Direct callers outside the state guard (for example project open/restore) must also be contained.
context.window.CentauriProfile={check(){throw new Error("direct checker failed")}};
assert.equal(guard.installSafeCheck(),true,"direct Centauri checker must be wrapped when available");
centauriButton.disabled=false;
assert.doesNotThrow(()=>context.window.CentauriProfile.check(),"wrapped direct Centauri check must not escape to the global error handler");
assert.equal(centauriButton.disabled,true,"failed direct Centauri check must disable stale Centauri export");
assert.equal(guard.isDirty(),true,"failed direct Centauri check must mark compatibility state dirty");
assert.match(status.innerHTML,/Centauri-tarkistus epäonnistui/,"failed direct check must surface a clear fail-closed state");

context.window.CentauriProfile={check(){checks++}};
assert.equal(guard.installSafeCheck(),true);
assert.equal(context.window.CentauriProfile.check(),true,"successful wrapped direct check should report success");
assert.equal(checks,2,"successful direct wrapped check must execute the underlying checker once in addition to initial refresh");

guard.refresh(true);
assert.equal(timers.size,1,"refresh must schedule a compatibility check");
guard.markDirty();
assert.equal(guard.isDirty(),true,"geometry change must mark Centauri state dirty");
assert.equal(centauriButton.disabled,true,"geometry change must disable Centauri STL export immediately");
assert.equal(timers.size,0,"geometry change must cancel a queued stale compatibility refresh");
runTimers();
assert.equal(checks,2,"cancelled stale refresh must not add another compatibility check");
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
assert.match(status.innerHTML,/Centauri-tarkistus epäonnistui/,"failed compatibility check must explain why Centauri export is locked");

// A background/non-clearing refresh can also fail (visibility/material/status refresh). It must never leave a previously enabled Centauri export stale.
centauriButton.disabled=false;
context.window.CentauriProfile={check(){throw new Error("background checker failed")}};
guard.refresh(false);
runTimers();
assert.equal(guard.isDirty(),true,"failed background Centauri refresh must mark compatibility state dirty");
assert.equal(centauriButton.disabled,true,"failed background Centauri refresh must disable stale Centauri export");
assert.equal(status.className,"printer-status fail","failed background Centauri refresh must show a fail status");

context.window.CentauriProfile={check(){checks++}};
guard.refresh(true);
runTimers();
assert.equal(guard.isDirty(),false,"successful Centauri checker may clear dirty state");
assert.equal(checks,3,"successful refresh must execute one additional compatibility check");

centauriButton.disabled=false;
buttonObserver.callback();
assert.equal(centauriButton.disabled,false,"clean Centauri state must not fight a legitimate export enable");

console.log("centauri state guard race regression: OK");
