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
let checks=0;

const context=vm.createContext({
 console,
 document:{
  readyState:"loading",
  getElementById:id=>elements.get(id)||null,
  querySelector:()=>null,
  addEventListener(){}
 },
 window:{CentauriProfile:{check(){checks++}}},
 MutationObserver:function(){this.observe=()=>{}},
 setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id},
 clearTimeout(id){timers.delete(id)}
});

vm.runInContext(source,context,{filename:"centauri_state_guard.js"});
const guard=context.window.AI3DCentauriStateGuard;
assert.ok(guard,"Centauri state guard must initialize");

guard.refresh(true);
assert.equal(timers.size,1,"refresh must schedule a compatibility check");
guard.markDirty();
assert.equal(guard.isDirty(),true,"geometry change must mark Centauri state dirty");
assert.equal(elements.get("btnCentauriStl").disabled,true,"geometry change must disable Centauri STL export immediately");
assert.equal(timers.size,0,"geometry change must cancel a queued stale compatibility refresh");

for(const fn of [...timers.values()])fn();
assert.equal(checks,0,"cancelled stale refresh must not re-check the previous mesh");
assert.equal(guard.isDirty(),true,"cancelled stale refresh must not clear the dirty state");

console.log("centauri state guard race regression: OK");
