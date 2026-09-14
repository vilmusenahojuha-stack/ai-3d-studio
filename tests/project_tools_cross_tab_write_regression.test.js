"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("project_tools.js","utf8");
const KEY="ai3d:projects:v3";
const ACTIVE=KEY+":active";
const BACKUP=KEY+":backup";

class MemoryStorage{
  constructor(seed={},failKeys=[]){this.map=new Map(Object.entries(seed));this.failKeys=new Set(failKeys);}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){if(this.failKeys.has(key))throw Error("storage write failed");this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function makeElement(id,registry){
  const el={id,textContent:"",className:"",dataset:{},disabled:false,onclick:null,onchange:null,value:"",files:[],click(){this.clicked=true;},after(){}};
  Object.defineProperty(el,"innerHTML",{
    get(){return this._html||"";},
    set(value){
      this._html=String(value);
      for(const match of this._html.matchAll(/id="([^"]+)"/g))if(!registry[match[1]])makeElement(match[1],registry);
    }
  });
  registry[id]=el;
  return el;
}

function boot(hasConflict,failBackup=false){
  const project={id:"p1",name:"Testi",description:"",type:"sleeve",values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},created:1,updated:1};
  const localStorage=new MemoryStorage({[KEY]:JSON.stringify([project]),[ACTIVE]:project.id},failBackup?[BACKUP]:[]);
  const elements={};
  makeElement("planSyncStatus",elements);
  const alerts=[];
  let reloads=0;
  const document={
    readyState:"complete",
    getElementById(id){return elements[id]||null;},
    createElement(tag){return makeElement(tag+Math.random(),elements);},
    addEventListener(){}
  };
  const window={
    AI3DProjects:{active(){return project;}},
    AI3DStorageCommitGuard:{hasConflict,lastIssue:"Projektitallennus muuttui toisessa välilehdessä. Päivitä tämä sivu ennen jatkamista."}
  };
  class TestBlob{constructor(parts){this.size=parts.map(x=>String(x)).join("").length;}}
  const context={window,document,localStorage,console,Blob:TestBlob,URL:{createObjectURL(){return"blob:test";},revokeObjectURL(){}},FileReader:function(){},Date,Math,JSON,Set,Object,String,Number,Error,globalThis:null,alert(message){alerts.push(String(message));},confirm(){return true;},location:{reload(){reloads++;}},setTimeout(fn){fn();return 1;}};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"project_tools.js"});
  return{localStorage,elements,alerts,getReloads:()=>reloads};
}

const blocked=boot(true);
const before=blocked.localStorage.getItem(KEY);
blocked.elements.btnDuplicateProject.onclick();
assert.strictEqual(blocked.localStorage.getItem(KEY),before,"cross-tab conflict must block project-tools writes");
assert.strictEqual(blocked.getReloads(),0,"blocked write must not reload the page");
assert.ok(blocked.alerts.some(x=>/tallennus estettiin/i.test(x)&&/Päivitä tämä sivu/i.test(x)),"blocked write must explain how to recover safely");

const normal=boot(false);
normal.elements.btnDuplicateProject.onclick();
const projects=JSON.parse(normal.localStorage.getItem(KEY));
assert.strictEqual(projects.length,2,"normal duplicate must keep working when no conflict exists");
assert.strictEqual(normal.getReloads(),1,"successful duplicate must retain the existing reload behavior");
assert.ok(normal.localStorage.getItem(BACKUP),"successful project-tools write must preserve the previous project set as a backup");

const backupFailure=boot(false,true);
const beforeMain=backupFailure.localStorage.getItem(KEY);
const beforeActive=backupFailure.localStorage.getItem(ACTIVE);
backupFailure.elements.btnDuplicateProject.onclick();
assert.strictEqual(backupFailure.localStorage.getItem(KEY),beforeMain,"failed backup write must roll the main project set back atomically");
assert.strictEqual(backupFailure.localStorage.getItem(ACTIVE),beforeActive,"failed backup write must roll the active project id back atomically");
assert.strictEqual(backupFailure.getReloads(),0,"failed backup verification must not reload into a partially committed state");
assert.ok(backupFailure.alerts.some(x=>/tallennus epäonnistui/i.test(x)),"failed backup write must surface an explicit storage error");

console.log("project tools cross-tab write regression: ok");
