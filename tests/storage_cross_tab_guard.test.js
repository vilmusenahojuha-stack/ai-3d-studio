"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("storage_commit_guard.js","utf8");
const KEY="ai3d:projects:v3";

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function makeRuntime(seed={}){
  const listeners={document:{},window:{}};
  const box={
    textContent:"",
    className:"plan-sync-status",
    dataset:{},
    classList:{contains(){return false;}}
  };
  const localStorage=new MemoryStorage({[KEY]:"[]",[KEY+":active"]:"",...seed});
  const document={
    readyState:"loading",
    visibilityState:"visible",
    getElementById(id){return id==="planSyncStatus"?box:null;},
    addEventListener(name,fn){listeners.document[name]=fn;}
  };
  const window={
    AI3DProjects:{active(){return null;}},
    addEventListener(name,fn){listeners.window[name]=fn;}
  };
  class MutationObserver{constructor(fn){this.fn=fn;}observe(){}}
  const context={window,document,localStorage,MutationObserver,console,setTimeout(fn){fn();return 1;},clearTimeout(){},JSON,Number,Object,String,Math,Set,Array,Error};
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"storage_commit_guard.js"});
  assert.ok(listeners.document.DOMContentLoaded,"guard must initialize on DOMContentLoaded");
  listeners.document.DOMContentLoaded();
  assert.ok(listeners.window.storage,"guard must listen for cross-tab storage changes");
  return{listeners,box,localStorage,context};
}

{
  const {listeners,box,localStorage,context}=makeRuntime();
  listeners.window.storage({key:"unrelated",storageArea:localStorage});
  assert.strictEqual(box.textContent,"","unrelated storage keys must not create a warning");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.hasConflict,false,"unrelated storage changes must not latch a conflict");

  listeners.window.storage({key:KEY,storageArea:{}});
  assert.strictEqual(box.textContent,"","storage events from another storage area must be ignored");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.hasConflict,false,"another storage area must not latch a conflict");

  listeners.window.storage({key:KEY,storageArea:localStorage});
  assert.match(box.textContent,/toisessa välilehdessä tai ikkunassa/i,"project JSON changed in another tab must warn the user");
  assert.match(box.textContent,/Päivitä tämä sivu ennen jatkamista/i,"warning must tell the user how to avoid overwriting newer data");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.lastIssue,box.textContent.replace(/^⚠\s*/,""),"guard state must retain the cross-tab warning");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.hasConflict,true,"cross-tab project changes must latch a conflict until reload");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.verify(),false,"verification must stay blocked after a cross-tab conflict even when no active project exists");
  assert.match(box.textContent,/toisessa välilehdessä tai ikkunassa/i,"verification must restore the conflict warning instead of clearing it");

  box.textContent="✓ jokin muu onnistumisviesti";
  box.className="plan-sync-status ok";
  box.dataset={};
  assert.strictEqual(context.window.AI3DStorageCommitGuard.verify(),false,"success-looking UI state must not clear a latched cross-tab conflict");
  assert.match(box.textContent,/Päivitä tämä sivu ennen jatkamista/i,"latched conflict must remain visible after later status changes");

  listeners.window.storage({key:KEY+":active",storageArea:localStorage});
  assert.match(box.textContent,/toisessa välilehdessä/i,"active-project changes in another tab must also warn");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.hasConflict,true,"active-project changes must keep the conflict latched");
}

{
  const {listeners,box,localStorage,context}=makeRuntime();
  listeners.window.storage({key:null,storageArea:localStorage});
  assert.match(box.textContent,/toisessa välilehdessä tai ikkunassa/i,"localStorage.clear() in another tab must warn because it can remove project storage");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.hasConflict,true,"cross-tab localStorage.clear() must latch a conflict until reload");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.verify(),false,"verification must remain blocked after cross-tab localStorage.clear()");
}

{
  const {box,context}=makeRuntime({[KEY]:"{broken-json"});
  assert.strictEqual(context.window.AI3DProjects.active(),null,"regression setup must have no active project");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.hasConflict,true,"invalid project storage must synchronously block a core save before it can overwrite corrupted data");
  assert.match(box.textContent,/ei läpäissyt rakennetarkistusta/i,"synchronous save blocking must surface the invalid-storage reason");
  assert.match(context.window.AI3DStorageCommitGuard.lastIssue,/ei läpäissyt rakennetarkistusta/i,"synchronous save blocking must retain the invalid-storage warning");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.verify(),false,"invalid project storage must fail closed even when no project is active");
  assert.match(box.textContent,/ei läpäissyt rakennetarkistusta/i,"invalid project storage must remain visible instead of being reported healthy");
  assert.match(context.window.AI3DStorageCommitGuard.lastIssue,/ei läpäissyt rakennetarkistusta/i,"guard state must retain the invalid-storage warning");
}

{
  const {box,context}=makeRuntime({[KEY]:""});
  assert.strictEqual(context.window.AI3DStorageCommitGuard.hasConflict,true,"an empty-string project storage value is corrupted data, not a missing storage key, and must fail closed");
  assert.strictEqual(context.window.AI3DStorageCommitGuard.verify(),false,"empty-string project storage must stay blocked until recovery or reload repairs it");
  assert.match(box.textContent,/ei läpäissyt rakennetarkistusta/i,"empty-string corruption must surface the same safe storage warning");
}

{
  const valid={id:"p-meta",name:"Meta",description:"ok",type:"sleeve",values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},print:{printer:"Elegoo Centauri Carbon 2 Combo",nozzle:"0.4 mm",notes:"ok"},sourcePlan:"chatgpt-current",sourceSchema:2,created:1,updated:2};
  const ok=makeRuntime({[KEY]:JSON.stringify([valid])});
  assert.strictEqual(ok.context.window.AI3DStorageCommitGuard.hasConflict,false,"supported bounded project metadata must remain valid");

  const badPrint={...valid,print:{...valid.print,unexpected:"x"}};
  const badPrintRuntime=makeRuntime({[KEY]:JSON.stringify([badPrint])});
  assert.strictEqual(badPrintRuntime.context.window.AI3DStorageCommitGuard.hasConflict,true,"unknown persisted print metadata must fail closed instead of bypassing the storage boundary");

  const hugeNotes={...valid,print:{...valid.print,notes:"x".repeat(1001)}};
  const hugeNotesRuntime=makeRuntime({[KEY]:JSON.stringify([hugeNotes])});
  assert.strictEqual(hugeNotesRuntime.context.window.AI3DStorageCommitGuard.hasConflict,true,"oversized print notes must fail closed");

  const badSource={...valid,sourceSchema:99};
  const badSourceRuntime=makeRuntime({[KEY]:JSON.stringify([badSource])});
  assert.strictEqual(badSourceRuntime.context.window.AI3DStorageCommitGuard.hasConflict,true,"unknown source schema metadata must fail closed");

  const maxDate={...valid,created:8.64e15,updated:8.64e15};
  const maxDateRuntime=makeRuntime({[KEY]:JSON.stringify([maxDate])});
  assert.strictEqual(maxDateRuntime.context.window.AI3DStorageCommitGuard.hasConflict,false,"the exact JavaScript Date boundary must remain valid");

  const negativeDate={...valid,created:-1};
  const negativeDateRuntime=makeRuntime({[KEY]:JSON.stringify([negativeDate])});
  assert.strictEqual(negativeDateRuntime.context.window.AI3DStorageCommitGuard.hasConflict,true,"negative persisted project timestamps must fail closed until storage recovery repairs them");

  const oversizedDate={...valid,updated:8.64e15+1};
  const oversizedDateRuntime=makeRuntime({[KEY]:JSON.stringify([oversizedDate])});
  assert.strictEqual(oversizedDateRuntime.context.window.AI3DStorageCommitGuard.hasConflict,true,"timestamps outside JavaScript Date range must fail closed until storage recovery repairs them");
}

console.log("storage cross-tab guard: ok");
