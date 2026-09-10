"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("project_tools.js","utf8");
const KEY="ai3d:projects:v3";
const ACTIVE=KEY+":active";
const BACKUP=KEY+":backup";

class MemoryStorage{
  constructor(seed={},failActiveOnce=false){this.map=new Map(Object.entries(seed));this.failActiveOnce=failActiveOnce;}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){
    const text=String(value);
    if(this.failActiveOnce&&key===ACTIVE&&text==="p-backup"){this.failActiveOnce=false;throw new Error("simulated active write failure");}
    this.map.set(key,text);
  }
  removeItem(key){this.map.delete(key);}
}

function makeElement(id,registry){
  const el={id,textContent:"",title:"",disabled:false,onclick:null,onchange:null,className:"",after(){},click(){}};
  let html="";
  Object.defineProperty(el,"innerHTML",{
    get(){return html;},
    set(value){
      html=String(value);
      for(const match of html.matchAll(/id=\"([^\"]+)\"/g))if(!registry[match[1]])makeElement(match[1],registry);
    }
  });
  registry[id]=el;
  return el;
}

function boot(storage){
  const elements={};
  makeElement("planSyncStatus",elements);
  const document={
    readyState:"complete",
    getElementById(id){return elements[id]||null;},
    createElement(tag){return makeElement(tag+"-"+Math.random(),elements);},
    addEventListener(){}
  };
  const context={
    window:{},document,localStorage:storage,console,JSON,Date,Math,Blob,
    setTimeout(fn){fn();return 1;},clearTimeout(){},
    alert(){},confirm(){return false;},location:{reload(){}},URL:{createObjectURL(){return"blob:test";},revokeObjectURL(){}},FileReader:function(){},
    crypto:{randomUUID(){return"uuid";}},globalThis:null
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"project_tools.js"});
  return elements;
}

const backupProject={
  id:"p-backup",
  name:"Palautettava projekti",
  description:"testi",
  type:"sleeve",
  values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},
  created:1,
  updated:1
};
const backupRaw=JSON.stringify([backupProject]);

{
  const storage=new MemoryStorage({[KEY]:"{broken",[ACTIVE]:"p-stale",[BACKUP]:backupRaw});
  const elements=boot(storage);
  assert.strictEqual(storage.getItem(KEY),backupRaw,"valid non-empty backup must replace corrupt main project data");
  assert.strictEqual(storage.getItem(ACTIVE),"p-backup","fallback recovery must also repair the active project id");
  assert.strictEqual(storage.getItem(BACKUP),backupRaw,"fallback recovery must preserve the backup itself");
  assert.match(elements.projectStorageInfo.textContent,/Paikalliset projektit: 1\b/,"successful recovery should expose the recovered project count");
}

{
  const storage=new MemoryStorage({[KEY]:"",[ACTIVE]:"p-stale",[BACKUP]:backupRaw});
  const elements=boot(storage);
  assert.strictEqual(storage.getItem(KEY),backupRaw,"empty-string main storage must be treated as corrupt and recover from a valid backup");
  assert.strictEqual(storage.getItem(ACTIVE),"p-backup","empty-string recovery must repair the active project id");
  assert.strictEqual(storage.getItem(BACKUP),backupRaw,"empty-string recovery must preserve the backup itself");
  assert.match(elements.projectStorageInfo.textContent,/Paikalliset projektit: 1\b/,"empty-string recovery should expose the recovered project count");
}

{
  const salvageable={...backupProject,id:"p-salvage",name:"Pelastettava projekti"};
  const invalid={...backupProject,id:"p-invalid",type:"unknown"};
  const corruptMain=JSON.stringify([salvageable,invalid]);
  const storage=new MemoryStorage({[KEY]:corruptMain,[ACTIVE]:"p-invalid",[BACKUP]:"[]"});
  const elements=boot(storage);
  const recovered=JSON.parse(storage.getItem(KEY));
  assert.deepStrictEqual(recovered.map(p=>p.id),["p-salvage"],"salvageable main projects must win over an empty valid backup");
  assert.strictEqual(storage.getItem(ACTIVE),"p-salvage","salvage recovery must repair the active project id");
  assert.strictEqual(storage.getItem(BACKUP),"[]","salvage recovery must preserve the empty backup");
  assert.match(elements.projectStorageInfo.textContent,/Paikalliset projektit: 1\b/,"salvage recovery should expose the recovered project count");
}

{
  const storage=new MemoryStorage({[KEY]:"{broken",[ACTIVE]:"p-stale",[BACKUP]:backupRaw},true);
  const elements=boot(storage);
  assert.strictEqual(storage.getItem(KEY),"{broken","failed fallback recovery must roll back the main project data");
  assert.strictEqual(storage.getItem(ACTIVE),"p-stale","failed fallback recovery must roll back the active project id");
  assert.strictEqual(storage.getItem(BACKUP),backupRaw,"failed fallback recovery must not alter the backup");
  assert.match(elements.projectStorageInfo.textContent,/Paikalliset projektit: 0\b/,"failed recovery must not expose the rolled-back backup as active project data");
}

console.log("project tools read recovery regression: ok");
