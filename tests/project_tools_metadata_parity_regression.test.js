"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("project_tools.js","utf8");
const KEY="ai3d:projects:v3";
const ACTIVE=KEY+":active";
const BACKUP=KEY+":backup";

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function makeElement(id,registry){
  const el={id,textContent:"",title:"",disabled:false,onclick:null,onchange:null,className:"",after(){},click(){}};
  let html="";
  Object.defineProperty(el,"innerHTML",{get(){return html;},set(value){html=String(value);for(const m of html.matchAll(/id=\"([^\"]+)\"/g))if(!registry[m[1]])makeElement(m[1],registry);}});
  registry[id]=el;
  return el;
}

function boot(storage){
  const elements={};
  makeElement("planSyncStatus",elements);
  const document={readyState:"complete",getElementById(id){return elements[id]||null;},createElement(tag){return makeElement(tag+Math.random(),elements);},addEventListener(){}};
  const context={window:{},document,localStorage:storage,console,JSON,Date,Math,Blob,setTimeout(fn){fn();return 1;},clearTimeout(){},alert(){},confirm(){return false;},location:{reload(){}},URL:{createObjectURL(){return"blob:test";},revokeObjectURL(){}},FileReader:function(){},crypto:{randomUUID(){return"uuid";}},globalThis:null};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"project_tools.js"});
  return elements;
}

const valid={id:"p-valid",name:"Validi",description:"testi",type:"sleeve",values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},print:{printer:"Elegoo Centauri Carbon 2 Combo",nozzle:0.4,layer:0.2,walls:4,infill:20,notes:"ok"},sourcePlan:"chatgpt_plan",sourceSchema:2,created:1,updated:2};

for(const [label,invalid] of [
  ["unknown print key",{...valid,id:"p-bad-1",print:{...valid.print,secret:"x"}}],
  ["boolean print value",{...valid,id:"p-bad-2",print:{...valid.print,walls:true}}],
  ["unknown source schema",{...valid,id:"p-bad-3",sourceSchema:3}],
  ["oversized source plan",{...valid,id:"p-bad-4",sourcePlan:"x".repeat(161)}],
  ["non-finite timestamp",{...valid,id:"p-bad-5",updated:Infinity}]
]){
  const backupRaw=JSON.stringify([valid]);
  const storage=new MemoryStorage({[KEY]:JSON.stringify([invalid]),[ACTIVE]:invalid.id,[BACKUP]:backupRaw});
  boot(storage);
  assert.strictEqual(storage.getItem(KEY),backupRaw,`${label}: project tools must recover from metadata that project core rejects`);
  assert.strictEqual(storage.getItem(ACTIVE),valid.id,`${label}: recovery must also repair active project id`);
}

{
  const raw=JSON.stringify([valid]);
  const storage=new MemoryStorage({[KEY]:raw,[ACTIVE]:valid.id,[BACKUP]:"[]"});
  boot(storage);
  assert.strictEqual(storage.getItem(KEY),raw,"valid Centauri/ChatGPT metadata must remain untouched");
  assert.strictEqual(storage.getItem(ACTIVE),valid.id,"valid project must remain active");
}

console.log("project tools metadata parity regression: ok");
