"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("projects.js","utf8");
const KEY="ai3d:projects:v3";
const ACTIVE=KEY+":active";

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));this.failOnceKey=null;}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){if(this.failOnceKey===key){this.failOnceKey=null;throw new Error("simulated storage failure");}this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
  snapshot(){return Object.fromEntries(this.map.entries());}
}

function element(overrides={}){
  return {
    value:"",
    valueAsNumber:NaN,
    type:"text",
    textContent:"",
    innerHTML:"",
    className:"",
    hidden:false,
    onclick:null,
    onchange:null,
    addEventListener(){},
    querySelector(){return null;},
    querySelectorAll(){return[];},
    appendChild(){},
    insertBefore(){},
    matches(){return false;},
    click(){},
    ...overrides
  };
}

function boot(storage,{fieldValues,conflict=false}={}){
  const listeners={document:{},window:{}};
  const elements={
    btnNewProject:element(),
    partType:element({value:"sleeve"}),
    material:element({value:"PETG"}),
    sleeveID:element({type:"number",valueAsNumber:fieldValues?.sleeveID??20}),
    sleeveWall:element({type:"number",valueAsNumber:fieldValues?.sleeveWall??3}),
    sleeveLength:element({type:"number",valueAsNumber:fieldValues?.sleeveLength??30})
  };
  const document={
    head:{appendChild(){}},
    body:{appendChild(){}},
    createElement(){return element({dataset:{}});},
    getElementById(id){return elements[id]||null;},
    querySelector(selector){if(selector===".controls")return element();return null;},
    addEventListener(name,fn){listeners.document[name]=fn;}
  };
  const window={
    AI3D:{setPart(){}},
    AI3DStorageCommitGuard:conflict?{hasConflict:true,lastIssue:"Projektitallennus muuttui toisessa välilehdessä tai ikkunassa."}:null,
    addEventListener(name,fn){listeners.window[name]=fn;},
    setTimeout,
    clearTimeout
  };
  const context={
    window,
    document,
    localStorage:storage,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Blob,
    URL:{createObjectURL(){return"blob:test";},revokeObjectURL(){}},
    FileReader:function(){},
    alert(){},
    prompt(){return null;},
    globalThis:null
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"projects.js"});
  assert.ok(listeners.document.DOMContentLoaded,"projects.js must register DOMContentLoaded initialization");
  listeners.document.DOMContentLoaded();
  return {context,elements,listeners};
}

const originalProject={
  id:"p-save-load",
  name:"Tallennustesti",
  description:"Projektin parametrien pitää säilyä",
  type:"sleeve",
  values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},
  created:100,
  updated:100
};

const storage=new MemoryStorage({
  [KEY]:JSON.stringify([originalProject]),
  [ACTIVE]:originalProject.id
});

const first=boot(storage,{fieldValues:{sleeveID:21.4,sleeveWall:3.2,sleeveLength:42}});
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(first.context.window.AI3DProjects.active().values)),
  originalProject.values,
  "initial load must restore the stored parameter values"
);
assert.ok(first.listeners.window.pagehide,"projects.js must register pagehide autosave");
first.listeners.window.pagehide();

const saved=JSON.parse(storage.getItem(KEY));
assert.strictEqual(saved.length,1,"autosave must keep exactly one project");
assert.deepStrictEqual(
  saved[0].values,
  {sleeveID:21.4,sleeveWall:3.2,sleeveLength:42,material:"PETG"},
  "autosave must persist the current parametric values"
);
assert.strictEqual(storage.getItem(ACTIVE),originalProject.id,"active project id must survive save");

const second=boot(new MemoryStorage(storage.snapshot()),{fieldValues:{sleeveID:1,sleeveWall:1,sleeveLength:1}});
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(second.context.window.AI3DProjects.active().values)),
  saved[0].values,
  "reload must reproduce the same stored parametric project"
);

const rollbackStorage=new MemoryStorage(storage.snapshot());
const beforeRollback=rollbackStorage.getItem(KEY);
const rollback=boot(rollbackStorage,{fieldValues:{sleeveID:25,sleeveWall:4,sleeveLength:50}});
rollbackStorage.failOnceKey=ACTIVE;
rollback.listeners.window.pagehide();
assert.strictEqual(rollbackStorage.getItem(KEY),beforeRollback,"failed save must restore the previous project JSON");
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(rollback.context.window.AI3DProjects.active().values)),
  saved[0].values,
  "failed autosave must restore the in-memory project parameters"
);

const conflictStorage=new MemoryStorage(storage.snapshot());
const beforeConflict=conflictStorage.snapshot();
const conflict=boot(conflictStorage,{fieldValues:{sleeveID:30,sleeveWall:5,sleeveLength:60},conflict:true});
conflict.listeners.window.pagehide();
assert.deepStrictEqual(
  conflictStorage.snapshot(),
  beforeConflict,
  "latched cross-tab conflict must block core project autosave from overwriting newer storage"
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(conflict.context.window.AI3DProjects.active().values)),
  saved[0].values,
  "blocked cross-tab autosave must restore the in-memory project values"
);

console.log("project storage regression: ok");
