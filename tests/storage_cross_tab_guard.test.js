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

const listeners={document:{},window:{}};
const box={
  textContent:"",
  className:"plan-sync-status",
  dataset:{},
  classList:{contains(){return false;}}
};
const localStorage=new MemoryStorage({[KEY]:"[]",[KEY+":active"]:""});
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

console.log("storage cross-tab guard: ok");
