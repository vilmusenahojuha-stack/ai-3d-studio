"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const SOURCE=fs.readFileSync("projects.js","utf8");
const KEY="ai3d:projects:v3";
const ACTIVE=KEY+":active";

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function makeElement(id,registry,overrides={}){
  const state={html:""};
  const el={
    id,
    value:"",
    valueAsNumber:NaN,
    type:"text",
    textContent:"",
    className:"",
    hidden:false,
    style:{},
    dataset:{},
    onclick:null,
    onchange:null,
    files:[],
    children:[],
    addEventListener(){},
    querySelector(){return null;},
    querySelectorAll(){return[];},
    appendChild(child){this.children.push(child);return child;},
    insertBefore(child){this.children.push(child);return child;},
    matches(){return false;},
    click(){this.clicked=true;},
    ...overrides
  };
  Object.defineProperty(el,"innerHTML",{
    get(){return state.html;},
    set(html){
      state.html=String(html);
      for(const match of state.html.matchAll(/id=\"([^\"]+)\"/g)){
        if(!registry[match[1]])registry[match[1]]=makeElement(match[1],registry);
      }
    }
  });
  registry[id]=el;
  return el;
}

function flush(){return new Promise(resolve=>setImmediate(resolve));}

async function boot(storage,chatgptPlan){
  const listeners={document:{},window:{}};
  const elements={};
  const sidebar=makeElement("sidebar",elements,{querySelector(){return null;}});
  const controls=makeElement("controls",elements,{addEventListener(){}});
  makeElement("btnNewProject",elements);
  makeElement("planList",elements);
  makeElement("projectList",elements);
  makeElement("projectName",elements);
  makeElement("projectDescription",elements);
  makeElement("projectPrintInfo",elements);
  makeElement("status",elements,{textContent:"Valmis suunnitteluun."});
  makeElement("validation",elements,{querySelector(){return null;}});
  makeElement("partType",elements,{value:"sleeve"});
  makeElement("material",elements,{value:"PETG"});
  makeElement("sleeveID",elements,{type:"number",valueAsNumber:20});
  makeElement("sleeveWall",elements,{type:"number",valueAsNumber:3});
  makeElement("sleeveLength",elements,{type:"number",valueAsNumber:30});

  let lastDownload=null;
  const blobs=new Map();
  let blobSeq=0;
  class TestBlob{
    constructor(parts,options={}){this.parts=parts;this.type=options.type||"";}
    text(){return Promise.resolve(this.parts.map(String).join(""));}
  }
  class TestFileReader{
    readAsText(file){
      if(file.failRead){this.onerror?.(new Error("read failed"));return;}
      this.result=file.content;
      this.onload?.();
    }
  }

  const document={
    head:{appendChild(node){node.onload?.();return node;}},
    body:{appendChild(node){node.onload?.();return node;}},
    createElement(tag){
      if(tag==="a")return makeElement("anchor-"+Math.random(),elements,{click(){lastDownload={href:this.href,download:this.download};}});
      return makeElement(tag+"-"+Math.random(),elements);
    },
    getElementById(id){return elements[id]||null;},
    querySelector(selector){
      if(selector===".project-sidebar")return sidebar;
      if(selector===".controls")return controls;
      if(selector.includes("data-ai3d-centauri")||selector.includes("centauri.js"))return makeElement("centauri-script",elements);
      return null;
    },
    addEventListener(name,fn){listeners.document[name]=fn;}
  };

  const fingerprint=JSON.stringify(chatgptPlan);
  const setPartCalls=[];
  const window={
    CentauriProfile:{check(){}},
    AI3D:{setPart(type,values){setPartCalls.push({type,values:JSON.parse(JSON.stringify(values))});}},
    AI3DPlanPreflight:{getLastResult(){return{ok:true,fingerprint};}},
    AI3DPlanOperationGuard:{getLastResult(){return{ok:true,fingerprint};},isAllowed(){return true;}},
    addEventListener(name,fn){listeners.window[name]=fn;},
    setTimeout(fn){fn();return 1;},
    clearTimeout(){}
  };

  const alerts=[];
  const context={
    window,
    document,
    localStorage:storage,
    console,
    setTimeout:window.setTimeout,
    clearTimeout:window.clearTimeout,
    setImmediate,
    Date,
    Math,
    JSON,
    Blob:TestBlob,
    URL:{
      createObjectURL(blob){const url="blob:test-"+(++blobSeq);blobs.set(url,blob);return url;},
      revokeObjectURL(){}
    },
    FileReader:TestFileReader,
    fetch:async url=>({
      ok:true,
      async json(){return String(url).startsWith("plans.json")?{plans:[]}:chatgptPlan;}
    }),
    alert(message){alerts.push(String(message));},
    prompt(){return null;},
    crypto:{randomUUID(){return"test-"+Math.random().toString(36).slice(2,10);}},
    globalThis:null
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(SOURCE,context,{filename:"projects.js"});
  assert.ok(listeners.document.DOMContentLoaded,"projects.js must register DOMContentLoaded initialization");
  listeners.document.DOMContentLoaded();
  await flush();
  await flush();

  return{
    context,elements,alerts,setPartCalls,
    getLastDownload(){return lastDownload;},
    getBlob(url){return blobs.get(url);}
  };
}

(async()=>{
  const originalProject={
    id:"p-original",
    name:"Alkuperäinen holkki",
    description:"Säilytettävä projekti",
    type:"sleeve",
    values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"},
    created:100,
    updated:100
  };
  const chatgptPlan={
    schemaVersion:2,
    projectName:"ChatGPT kiinnikelevy",
    summary:"Muokattava kiinnikelevy",
    partType:"mountingPlate",
    material:"PETG",
    parameters:{length:120,width:60,thickness:5,cornerRadius:5},
    operations:[
      {type:"hole",x:-45,y:-15,diameter:6},
      {type:"hole",x:45,y:-15,diameter:6},
      {type:"hole",x:45,y:15,diameter:6},
      {type:"hole",x:-45,y:15,diameter:6}
    ]
  };
  const storage=new MemoryStorage({[KEY]:JSON.stringify([originalProject]),[ACTIVE]:originalProject.id});
  const app=await boot(storage,chatgptPlan);

  app.context.window.AI3DProjects.openPlan("chatgpt-current");
  let projects=JSON.parse(storage.getItem(KEY));
  assert.strictEqual(projects.length,2,"opening a ChatGPT plan must create one editable project copy");
  const copied=projects.find(p=>p.id!==originalProject.id);
  assert.ok(copied,"ChatGPT project copy must be stored");
  assert.strictEqual(copied.type,"plate","mountingPlate must normalize to the editable plate type");
  assert.strictEqual(copied.sourcePlan,"chatgpt-current","project copy must retain its source plan id");
  assert.strictEqual(copied.sourceSchema,2,"project copy must retain the source schema version");
  assert.strictEqual(copied.values.plateL,120);
  assert.strictEqual(copied.values.plateW,60);
  assert.strictEqual(copied.values.plateT,5);
  assert.strictEqual(copied.values.plateHolePattern,"custom");
  assert.strictEqual(copied.values.plateCustomHoles.split("\n").length,4,"all four imported holes must remain editable");
  assert.strictEqual(storage.getItem(ACTIVE),copied.id,"the editable ChatGPT copy must become the active project");

  app.elements.partType.value="plate";
  app.context.window.AI3DProjects.exportProject();
  const download=app.getLastDownload();
  assert.ok(download?.href,"project export must create a downloadable blob URL");
  assert.ok(/\.ai3d\.json$/.test(download.download),"project export must use the .ai3d.json suffix");
  const exported=JSON.parse(await app.getBlob(download.href).text());
  assert.strictEqual(exported.format,"AI3D-project");
  assert.strictEqual(exported.version,1);
  assert.ok(!("id" in exported.project),"export must not leak the local project id");
  assert.strictEqual(exported.project.sourcePlan,"chatgpt-current");
  assert.strictEqual(exported.project.sourceSchema,2);
  assert.deepStrictEqual(exported.project.values,copied.values,"exported parameters must match the stored editable project");

  const importInput=app.elements.projectImportFile;
  assert.ok(importInput?.onchange,"project import control must be wired");
  const importTarget={files:[{size:JSON.stringify(exported).length,content:JSON.stringify(exported)}],value:"selected"};
  importInput.onchange({target:importTarget});
  projects=JSON.parse(storage.getItem(KEY));
  assert.strictEqual(projects.length,3,"importing an exported project must add exactly one project");
  const imported=projects[0];
  assert.notStrictEqual(imported.id,copied.id,"import must allocate a fresh local project id");
  assert.strictEqual(imported.type,copied.type);
  assert.deepStrictEqual(imported.values,copied.values,"export/import round trip must preserve all editable parameters");
  assert.strictEqual(imported.sourcePlan,"chatgpt-current");
  assert.strictEqual(imported.sourceSchema,2);
  assert.strictEqual(storage.getItem(ACTIVE),imported.id,"successfully imported project must become active");

  const hardened={
    ...exported,
    project:{
      ...exported.project,
      unexpectedPayload:"x".repeat(10000),
      print:{printer:"Elegoo Centauri Carbon 2 Combo",nozzle:"0.4 mm",notes:"Säilytä nämä tulostusohjeet",unexpectedNested:"drop-me"}
    }
  };
  importInput.onchange({target:{files:[{size:JSON.stringify(hardened).length,content:JSON.stringify(hardened)}],value:"hardened"}});
  projects=JSON.parse(storage.getItem(KEY));
  assert.strictEqual(projects.length,4,"sanitized import must still add one valid project");
  const sanitized=projects[0];
  assert.ok(!Object.prototype.hasOwnProperty.call(sanitized,"unexpectedPayload"),"import must not persist unknown top-level fields");
  assert.strictEqual(sanitized.print.printer,"Elegoo Centauri Carbon 2 Combo","known print metadata must survive import");
  assert.strictEqual(sanitized.print.nozzle,"0.4 mm");
  assert.strictEqual(sanitized.print.notes,"Säilytä nämä tulostusohjeet");
  assert.ok(!Object.prototype.hasOwnProperty.call(sanitized.print,"unexpectedNested"),"unknown print metadata must be dropped");
  assert.strictEqual(sanitized.sourcePlan,"chatgpt-current","sanitizing must preserve supported source metadata");
  assert.strictEqual(sanitized.sourceSchema,2);

  const beforeUnknownVersion=storage.getItem(KEY);
  const beforeUnknownVersionActive=storage.getItem(ACTIVE);
  const futureVersion={...exported,version:99};
  importInput.onchange({target:{files:[{size:JSON.stringify(futureVersion).length,content:JSON.stringify(futureVersion)}],value:"future"}});
  assert.strictEqual(storage.getItem(KEY),beforeUnknownVersion,"unknown project format version must not modify storage");
  assert.strictEqual(storage.getItem(ACTIVE),beforeUnknownVersionActive,"unknown project format version must preserve the active project");
  assert.ok(app.alerts.some(x=>x.includes("versiota ei tueta")),"unknown project format version must report a clear failure");

  const beforeInvalid=storage.getItem(KEY);
  const beforeInvalidActive=storage.getItem(ACTIVE);
  importInput.onchange({target:{files:[{size:80,content:JSON.stringify({format:"AI3D-project",version:1,project:{type:"unknown",values:{}}})}],value:"bad"}});
  assert.strictEqual(storage.getItem(KEY),beforeInvalid,"invalid import must leave project storage unchanged");
  assert.strictEqual(storage.getItem(ACTIVE),beforeInvalidActive,"invalid import must preserve the active project");
  assert.ok(app.alerts.some(x=>x.includes("tuonti epäonnistui")),"invalid import must report a clear failure");

  const aliasPlan={
    schemaVersion:2,
    projectName:"Alias-päätytulppa",
    summary:"Schema v2 alias pitää voida muokata projektina",
    partType:"plug",
    material:"PETG",
    parameters:{width:40,height:30,wall:2,clearance:.25,insertDepth:12,capThickness:3,overhang:1}
  };
  const aliasStorage=new MemoryStorage({[KEY]:JSON.stringify([originalProject]),[ACTIVE]:originalProject.id});
  const aliasApp=await boot(aliasStorage,aliasPlan);
  aliasApp.context.window.AI3DProjects.openPlan("chatgpt-current");
  const aliasProjects=JSON.parse(aliasStorage.getItem(KEY));
  assert.strictEqual(aliasProjects.length,2,"a validated Schema v2 alias must be importable as an editable project");
  const aliasCopy=aliasProjects.find(p=>p.id!==originalProject.id);
  assert.ok(aliasCopy,"Schema v2 alias must create an editable project copy");
  assert.strictEqual(aliasCopy.type,"plug","Schema v2 plug alias must normalize to the editable plug type");
  assert.strictEqual(aliasCopy.values.tubeW,40);
  assert.strictEqual(aliasCopy.values.tubeH,30);
  assert.strictEqual(aliasCopy.values.tubeWall,2);
  assert.strictEqual(aliasCopy.values.insertDepth,12);
  assert.ok(aliasApp.setPartCalls.some(x=>x.type==="plug"),"alias import must reach CAD using the editable canonical type");

  console.log("project transfer regression: ok");
})().catch(err=>{console.error(err);process.exitCode=1;});
