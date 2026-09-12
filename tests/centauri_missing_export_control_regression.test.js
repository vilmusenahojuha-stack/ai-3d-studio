"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("centauri_state_guard.js","utf8");
const centauriButton={disabled:false};
const downloadButton={disabled:false};
const elements=new Map([
 ["centauriStatus",{className:"printer-status ok",innerHTML:""}],
 ["btnCentauriStl",centauriButton],
 ["btnDownload",downloadButton]
]);
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
assert.equal(guard.isDirty(),false,"clean approved STL state should remain clean");

// Centauri export must never stay enabled when the primary validated STL export is unavailable,
// even if an underlying or stale Centauri checker leaves its own export control enabled.
downloadButton.disabled=true;
centauriButton.disabled=false;
assert.equal(context.window.CentauriProfile.check(),false,"disabled primary STL export must make Centauri compatibility fail closed");
assert.equal(checks,2,"primary STL prerequisite check must execute the underlying checker exactly once");
assert.equal(centauriButton.disabled,true,"Centauri export must be disabled when primary STL export is disabled");
assert.equal(guard.isDirty(),false,"an unavailable primary STL export alone must not fabricate a geometry-dirty state");

// A valid primary STL state may still pass normally.
downloadButton.disabled=false;
centauriButton.disabled=false;
assert.equal(context.window.CentauriProfile.check(),true,"approved primary STL state must keep normal Centauri success behavior");
assert.equal(checks,3,"successful compatibility recheck should execute exactly once");

// If the Centauri export control is absent because the panel failed or has not loaded yet,
// a checker returning true must not be treated as an export-capable success.
elements.delete("btnCentauriStl");
guard.markDirty();
assert.equal(guard.isDirty(),true,"test setup must mark compatibility state dirty");
guard.refresh(true);
runTimers();
assert.equal(checks,4,"missing-control recheck should execute exactly once");
assert.equal(guard.isDirty(),true,"missing export control must keep Centauri state fail-closed");
assert.equal(context.window.CentauriProfile.check(),false,"direct wrapped check must report failure without a Centauri export control");
assert.equal(checks,5,"direct wrapped missing-control check should still execute the underlying checker once");

console.log("centauri missing export control regression: OK");
