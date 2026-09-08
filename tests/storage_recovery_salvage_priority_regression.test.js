"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("storage_recovery.js","utf8");
const KEY="ai3d:projects:v3";
const BACKUP=KEY+":backup";
const ACTIVE=KEY+":active";
const CORRUPT=KEY+":corrupt";

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function run(seed){
  const localStorage=new MemoryStorage(seed);
  const window={};
  const context={window,localStorage,console,JSON,Set,Object,String,Number,Array,Error};
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"storage_recovery.js"});
  return {localStorage,state:window.AI3DStorageRecovery};
}

const valid={
  id:"p-good",
  name:"Pelastettava projekti",
  description:"Kelvollinen projekti",
  type:"sleeve",
  values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"}
};
const invalid={
  id:"p-bad",
  name:"Virheellinen",
  description:"Tuntematon osatyyppi",
  type:"unknown",
  values:{x:1}
};
const backupProject={
  id:"p-backup",
  name:"Varmuuskopio",
  description:"Kelvollinen varmuuskopio",
  type:"plug",
  values:{tubeW:50,tubeH:30,tubeWall:2.5,plugClear:.25,insertDepth:18,capThickness:3,capOverhang:1,material:"PETG"}
};

{
  const mainRaw=JSON.stringify([valid,invalid]);
  const {localStorage,state}=run({[KEY]:mainRaw,[BACKUP]:"[]",[ACTIVE]:invalid.id});
  const restored=JSON.parse(localStorage.getItem(KEY));
  assert.deepStrictEqual(restored,[valid],"salvageable projects must win over an empty backup");
  assert.strictEqual(localStorage.getItem(ACTIVE),valid.id,"active id must be repaired to the salvaged project");
  assert.strictEqual(localStorage.getItem(CORRUPT),mainRaw,"original corrupt data must remain preserved");
  assert.strictEqual(state.recovered,true,"salvage must be reported as a recovery");
  assert.match(state.reason,/pelastettiin 1\/2/i,"recovery status must describe the salvaged project count");
}

{
  const mainRaw=JSON.stringify([valid,invalid]);
  const {localStorage,state}=run({[KEY]:mainRaw,[BACKUP]:JSON.stringify([backupProject]),[ACTIVE]:valid.id});
  assert.deepStrictEqual(JSON.parse(localStorage.getItem(KEY)),[backupProject],"a non-empty valid backup must still take priority over partial salvage");
  assert.strictEqual(localStorage.getItem(ACTIVE),backupProject.id,"active id must follow the restored non-empty backup");
  assert.strictEqual(state.recovered,true);
  assert.match(state.reason,/varmuuskopiosta \(1 projektia\)/i);
}

{
  const mainRaw=JSON.stringify([invalid]);
  const {localStorage,state}=run({[KEY]:mainRaw,[BACKUP]:"[]",[ACTIVE]:invalid.id});
  assert.deepStrictEqual(JSON.parse(localStorage.getItem(KEY)),[],"empty valid backup remains a safe fallback when nothing can be salvaged");
  assert.strictEqual(localStorage.getItem(ACTIVE),"","active id must be cleared when the empty backup is restored");
  assert.strictEqual(localStorage.getItem(CORRUPT),mainRaw);
  assert.strictEqual(state.recovered,true);
}

console.log("storage recovery salvage priority regression: ok");
