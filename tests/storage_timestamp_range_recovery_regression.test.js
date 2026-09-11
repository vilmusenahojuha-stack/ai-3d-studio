"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const SOURCE=fs.readFileSync("storage_recovery.js","utf8"),KEY="ai3d:projects:v3",BACKUP=KEY+":backup",ACTIVE=KEY+":active,CORRUPT=KEY+":corrupt",MAX_DATE_MS=8.64e15;
class MemoryStorage{constructor(seed={}){this.map=new Map(Object.entries(seed))}getItem(k){return this.map.has(k)?this.map.get(k):null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
function run(project){const raw=JSON.stringify([project]),localStorage=new MemoryStorage({[KEY]:raw,[BACKUP]:"[]",[ACTIVE]:project.id}),window={};const context={window,localStorage,console,JSON,Set,Object,String,Number,Array,Error,Date,Math};vm.createContext(context);vm.runInContext(SOURCE,context,{filename:"storage_recovery.js"});return{raw,localStorage,state:window.AI3DStorageRecovery}}
function project(extra={}){return{id:"p-time",name:"Aikaleimatesti",type:"sleeve",values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},created:1,updated:2,...extra}}
{
 const {raw,localStorage,state}=run(project({created:-100,updated:2500})),saved=JSON.parse(localStorage.getItem(KEY))[0];
 assert.equal(saved.created,2500,"negative created timestamp should reuse the valid updated timestamp");
 assert.equal(saved.updated,2500,"valid updated timestamp must remain unchanged");
 assert.equal(localStorage.getItem(ACTIVE),"p-time","timestamp repair must not change an otherwise valid active project");
 assert.equal(localStorage.getItem(CORRUPT),raw,"original timestamp-corrupt data must be preserved before repair");
 assert.equal(state.recovered,true,"timestamp range repair must be reported as recovery");
 assert.match(state.reason,/aikaleimat korjattiin/i);
}
{
 const {localStorage,state}=run(project({created:1234,updated:MAX_DATE_MS+1})),saved=JSON.parse(localStorage.getItem(KEY))[0];
 assert.equal(saved.created,1234,"valid created timestamp must remain unchanged");
 assert.equal(saved.updated,1234,"out-of-range updated timestamp should fall back to the valid created timestamp");
 assert.equal(state.recovered,true);
}
{
 const {raw,localStorage,state}=run(project({created:MAX_DATE_MS,updated:MAX_DATE_MS}));
 assert.equal(localStorage.getItem(KEY),raw,"timestamps at the JavaScript Date boundary must remain untouched");
 assert.equal(state.recovered,false,"valid Date-range timestamps must not trigger recovery");
}
console.log("storage timestamp range recovery regression: ok");
