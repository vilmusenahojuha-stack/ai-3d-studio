"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const KEY="ai3d:projects:v3",BACKUP=KEY+":backup",ACTIVE=KEY+":active";
const originalMain='[{"id":"broken","type":"unknown","values":{}}]';
const backup=JSON.stringify([{id:"p-backup",name:"Backup",type:"plate",values:{plateL:100,plateW:60,plateT:3}}]);
const store=new Map([[KEY,originalMain],[BACKUP,backup],[ACTIVE,"p-missing"]]);
let failActiveOnce=true;
const localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem(k,v){
    if(k===ACTIVE&&failActiveOnce){failActiveOnce=false;throw Error("simuloitu active-kirjoitusvirhe")}
    store.set(k,String(v));
  },
  removeItem:k=>store.delete(k)
};
const context={console,localStorage,window:{}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("storage_recovery.js","utf8"),context,{filename:"storage_recovery.js"});

assert.equal(context.window.AI3DStorageRecovery.checked,true);
assert.equal(context.window.AI3DStorageRecovery.recovered,false,"epäonnistunutta palautusta ei saa merkitä onnistuneeksi");
assert.match(context.window.AI3DStorageRecovery.error,/simuloitu active-kirjoitusvirhe/);
assert.match(context.window.AI3DStorageRecovery.reason,/keskeneräistä palautusta jätetty käyttöön/);
assert.equal(store.get(KEY),originalMain,"projektien päädata pitää palauttaa alkuperäiseksi jos active-kirjoitus epäonnistuu");
assert.equal(store.get(ACTIVE),"p-missing","aktiivisen projektin tunnus pitää palauttaa alkuperäiseksi");
assert.equal(store.get(BACKUP),backup,"kelvollinen varmuuskopio pitää säilyttää");

console.log("Storage recovery atomic regression: OK");
