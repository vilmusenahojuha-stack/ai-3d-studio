"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("storage_recovery.js","utf8");
const KEY="ai3d:projects:v3",BACKUP=KEY+":backup",ACTIVE=KEY+":active",CORRUPT=KEY+":corrupt";

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function run(seed){
  const localStorage=new MemoryStorage(seed),window={};
  const context={window,localStorage,console,JSON,Set,Object,String,Number,Array,Error};
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"storage_recovery.js"});
  return {localStorage,state:window.AI3DStorageRecovery};
}

const valid={
  id:"p-valid",
  name:"Centauri-projekti",
  description:"Kelvollinen ChatGPT-projekti",
  type:"sleeve",
  values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},
  print:{printer:"Elegoo Centauri Carbon 2 Combo",nozzle:0.4,layer:0.2,walls:4,infill:20,notes:"ok"},
  sourcePlan:"chatgpt_plan",
  sourceSchema:2,
  created:1,
  updated:2
};
const backup={...valid,id:"p-backup",name:"Varmuuskopio"};

for(const [label,invalid] of [
  ["unknown print key",{...valid,id:"p-bad-print",print:{...valid.print,temperature:250}}],
  ["boolean print value",{...valid,id:"p-bad-bool",print:{...valid.print,walls:true}}],
  ["unknown source schema",{...valid,id:"p-bad-schema",sourceSchema:3}],
  ["oversized source plan",{...valid,id:"p-bad-source",sourcePlan:"x".repeat(161)}],
  ["invalid timestamp",{...valid,id:"p-bad-time",updated:"2"}]
]){
  const mainRaw=JSON.stringify([invalid]),backupRaw=JSON.stringify([backup]);
  const {localStorage,state}=run({[KEY]:mainRaw,[BACKUP]:backupRaw,[ACTIVE]:invalid.id});
  assert.deepStrictEqual(JSON.parse(localStorage.getItem(KEY)),[backup],`${label}: recovery must restore metadata-valid backup`);
  assert.strictEqual(localStorage.getItem(ACTIVE),backup.id,`${label}: active id must follow restored backup`);
  assert.strictEqual(localStorage.getItem(CORRUPT),mainRaw,`${label}: rejected main data must be preserved for manual recovery`);
  assert.strictEqual(state.recovered,true,`${label}: recovery must be reported`);
}

{
  const raw=JSON.stringify([valid]);
  const {localStorage,state}=run({[KEY]:raw,[BACKUP]:"[]",[ACTIVE]:valid.id});
  assert.strictEqual(localStorage.getItem(KEY),raw,"valid Centauri/ChatGPT metadata must remain untouched");
  assert.strictEqual(localStorage.getItem(ACTIVE),valid.id,"valid project must remain active");
  assert.strictEqual(state.recovered,false,"already-valid metadata must not trigger recovery");
}

{
  const invalid={...valid,id:"p-invalid",print:{...valid.print,notes:"x".repeat(1001)}};
  const mainRaw=JSON.stringify([valid,invalid]);
  const {localStorage}=run({[KEY]:mainRaw,[BACKUP]:"[]",[ACTIVE]:invalid.id});
  assert.deepStrictEqual(JSON.parse(localStorage.getItem(KEY)),[valid],"salvage must exclude projects whose metadata project core would reject");
  assert.strictEqual(localStorage.getItem(ACTIVE),valid.id,"salvage must repair active id to a metadata-valid project");
}

console.log("storage recovery metadata parity regression: ok");
