"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("centauri_state_guard.js","utf8");
const elements=new Map([["centauriStatus",{className:"",innerHTML:""}]]);
let nextTimer=1;
const timers=new Map();
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
 window:{CentauriProfile:{check(){checks++;return true}}},
 MutationObserver:function(){this.observe=()=>{}},
 setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id},
 clearTimeout(id){timers.delete(id)}
});

vm.runInContext(source,context,{filename:"centauri_state_guard.js"});
const guard=context.window.AI3DCentauriStateGuard;
assert.ok(guard,"Centauri state guard must initialize");

function runTimers(){const pending=[...timers.values()];timers.clear();for(const fn of pending)fn()}
runTimers();
assert.equal(checks,1,"initial compatibility refresh should still run the checker");

// If the Centauri export control is absent because the panel failed or has not loaded yet,
// a checker returning true must not be treated as an export-capable success.
guard.markDirty();
assert.equal(guard.isDirty(),true,"test setup must mark compatibility state dirty");
guard.refresh(true);
runTimers();
assert.equal(checks,2,"recheck should execute exactly once");
assert.equal(guard.isDirty(),true,"missing export control must keep Centauri state fail-closed");
assert.equal(context.window.CentauriProfile.check(),false,"direct wrapped check must report failure without an export control");
assert.equal(checks,3,"direct wrapped check should still execute the underlying checker once");

console.log("centauri missing export control regression: OK");
