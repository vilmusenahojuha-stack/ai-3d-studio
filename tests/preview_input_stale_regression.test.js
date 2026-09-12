"use strict";
const fs=require("fs");
const assert=require("assert");
const vm=require("vm");
const src=fs.readFileSync(require("path").join(__dirname,"..","preview_guard.js"),"utf8");

assert(src.includes('document.addEventListener?.("input",geometryInputChanged,true)'),"geometry input edits must invalidate an approved preview immediately");
assert(src.includes('document.addEventListener?.("change",geometryInputChanged,true)'),"select/change edits must invalidate stale geometry");
assert(src.includes('target?.id==="partType"||target?.closest?.(".part-fields")'),"part type changes and part parameter fields must both invalidate stale geometry");
assert(src.includes('new Set(["material","filamentPriceKg","ledCost","powerCost","miscCost"])'),"material and cost-only fields must not invalidate unchanged geometry");
assert(src.includes('NON_GEOMETRY_PART_FIELDS.has(target.id)'),"non-geometry part fields must bypass stale geometry invalidation");
assert(src.includes('currentMesh||currentFitMesh'),"parameter edits should clear an existing generated mesh");
assert(src.includes('hasStaleExport=download?.disabled===false||centauri?.disabled===false'),"preview guard must fail closed when an export control is stale-enabled after mesh state is lost");
assert(src.includes('centauri=$("btnCentauriStl")'),"preview invalidation must include the Centauri export control in the immediate fail-safe lock");
assert(src.includes('if(centauri)centauri.disabled=true'),"preview invalidation must disable Centauri STL export before deferred printer checks run");
assert(src.includes("Mallin mittoja tai osatyyppiä muutettiin"),"stale preview must explain that geometry or part type changed");
assert(src.includes("Luo ja tarkista 3D-malli uudelleen ennen STL-vientiä"),"stale preview must explain why STL export was disabled");
assert(/try\s*\{[\s\S]*lastError=reason\|\|lastError[\s\S]*\}\s*finally\s*\{\s*clearing=false/.test(src),"preview invalidation must always release its re-entrancy lock even if an unexpected UI operation throws");
assert(src.includes("result?.catch?.(()=>{})"),"deferred preview checks must consume rejected promises instead of creating unhandled rejections");

function projectFailureReason(activeProject){
  const elements={
    planSyncStatus:{textContent:"⚠ Projektia ei voitu avata: Projektin aktivointia ei voitu tallentaa."},
    status:{textContent:"Valmis suunnitteluun."},
    validation:{querySelector(){return null;}}
  };
  const document={
    readyState:"loading",
    getElementById(id){return elements[id]||null;},
    addEventListener(){},
    createElement(){return{append(){},className:"",textContent:""};},
    createTextNode(text){return{textContent:text};}
  };
  const window={AI3DProjects:{active(){return activeProject;}}};
  const context={window,document,setTimeout(){},MutationObserver:function(){},console};
  vm.createContext(context);
  vm.runInContext(src,context,{filename:"preview_guard.js"});
  return context.window.AI3DPreviewGuard.failureReason();
}

function deferredFailuresAreContained(){
  const jobs=[];
  let caught=0;
  const centauriButton={disabled:false};
  const rejected={catch(fn){assert.equal(typeof fn,"function");caught++;return this;}};
  const window={
    CentauriProfile:{check(){return rejected;}},
    CentauriOrientation:{render(){throw new Error("orientation failed");}},
    AI3DPrintability:{render(){return rejected;}}
  };
  const document={
    readyState:"loading",
    getElementById(id){if(id==="orientationResult")return{};if(id==="btnCentauriStl")return centauriButton;return null;},
    addEventListener(){},
    createElement(){return{append(){},className:"",textContent:""};},
    createTextNode(text){return{textContent:text};}
  };
  const context={window,document,setTimeout(fn){jobs.push(fn);},MutationObserver:function(){},console};
  vm.createContext(context);
  vm.runInContext(src,context,{filename:"preview_guard.js"});
  assert.doesNotThrow(()=>context.window.AI3DPreviewGuard.clear("test failure"));
  assert.strictEqual(centauriButton.disabled,true,"Centauri export must lock synchronously even when its deferred profile check later fails");
  assert.equal(jobs.length,3,"preview clear must still schedule all three background refreshes");
  for(const job of jobs)assert.doesNotThrow(job,"a deferred background refresh must not escape into the global error handler");
  assert.equal(caught,2,"promise-returning background refreshes must attach rejection handlers");
}

function geometryEditLocksStaleExportsWithoutMesh(){
  const listeners={};
  const download={disabled:false};
  const centauri={disabled:false};
  const dimensions={textContent:"old"};
  const validation={innerHTML:"",querySelector(){return null;},appendChild(){}};
  const elements={btnDownload:download,btnCentauriStl:centauri,dimensions,validation};
  const document={
    readyState:"complete",
    getElementById(id){return elements[id]||null;},
    addEventListener(type,fn){listeners[type]=fn;},
    createElement(){return{append(){},className:"",textContent:""};},
    createTextNode(text){return{textContent:text};}
  };
  const context={window:{},document,setTimeout(){},MutationObserver:function(){this.observe=()=>{};},console};
  vm.createContext(context);
  vm.runInContext(src,context,{filename:"preview_guard.js"});
  assert.equal(typeof listeners.input,"function","preview guard must register the geometry input listener");
  const target={
    id:"plateL",
    closest(selector){return selector===".part-fields"?{}:null;},
    matches(selector){return selector==="input,select,textarea";}
  };
  listeners.input({target});
  assert.strictEqual(download.disabled,true,"stale primary STL export must lock even when mesh state was already lost");
  assert.strictEqual(centauri.disabled,true,"stale Centauri export must lock even when mesh state was already lost");
  assert.strictEqual(dimensions.textContent,"–","stale dimensions must be cleared together with stale export state");
}

function repeatedFailureLocksReenabledExportsWithoutMesh(){
  const download={disabled:false};
  const centauri={disabled:false};
  const status={textContent:"Virhe: mallin generointi epäonnistui."};
  const validation={innerHTML:"",querySelector(){return null;},appendChild(){}};
  const elements={btnDownload:download,btnCentauriStl:centauri,status,validation};
  const document={
    readyState:"complete",
    getElementById(id){return elements[id]||null;},
    addEventListener(){},
    createElement(){return{append(){},className:"",textContent:""};},
    createTextNode(text){return{textContent:text};}
  };
  const context={window:{},document,setTimeout(){},MutationObserver:function(){this.observe=()=>{};},console};
  vm.createContext(context);
  vm.runInContext(src,context,{filename:"preview_guard.js"});
  assert.strictEqual(download.disabled,true,"initial failure must disable primary STL export");
  assert.strictEqual(centauri.disabled,true,"initial failure must disable Centauri export");
  download.disabled=false;
  centauri.disabled=false;
  assert.doesNotThrow(()=>context.window.AI3DPreviewGuard.check(),"repeated failure inspection must remain safe after mesh state is already absent");
  assert.strictEqual(download.disabled,true,"same repeated failure must relock a stale primary STL export even without a mesh reference");
  assert.strictEqual(centauri.disabled,true,"same repeated failure must relock a stale Centauri export even without a mesh reference");
}

assert.match(
  projectFailureReason(null),
  /Projektia ei voitu avata/,
  "a failed project activation with no active project must invalidate the stale preview/export state"
);
assert.strictEqual(
  projectFailureReason({id:"p-still-active"}),
  "",
  "a project-open warning must not invalidate preview state when a valid active project still exists"
);
deferredFailuresAreContained();
geometryEditLocksStaleExportsWithoutMesh();
repeatedFailureLocksReenabledExportsWithoutMesh();

console.log("preview input stale regression OK");
