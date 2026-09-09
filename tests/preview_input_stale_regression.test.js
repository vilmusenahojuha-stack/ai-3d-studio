"use strict";
const fs=require("fs");
const assert=require("assert");
const vm=require("vm");
const src=fs.readFileSync(require("path").join(__dirname,"..","preview_guard.js"),"utf8");

assert(src.includes('document.addEventListener?.("input",geometryInputChanged,true)'),"geometry input edits must invalidate an approved preview immediately");
assert(src.includes('document.addEventListener?.("change",geometryInputChanged,true)'),"select/change edits must invalidate an approved preview");
assert(src.includes('target?.id==="partType"||target?.closest?.(".part-fields")'),"part type changes and part parameter fields must both invalidate stale geometry");
assert(src.includes('new Set(["material","filamentPriceKg","ledCost","powerCost","miscCost"])'),"material and cost-only fields must not invalidate unchanged geometry");
assert(src.includes('NON_GEOMETRY_PART_FIELDS.has(target.id)'),"non-geometry part fields must bypass stale geometry invalidation");
assert(src.includes('currentMesh||currentFitMesh'),"parameter edits should only clear an existing generated mesh");
assert(src.includes("Mallin mittoja tai osatyyppiä muutettiin"),"stale preview must explain that geometry or part type changed");
assert(src.includes("Luo ja tarkista 3D-malli uudelleen ennen STL-vientiä"),"stale preview must explain why STL export was disabled");
assert(/try\s*\{[\s\S]*lastError=reason\|\|lastError[\s\S]*\}\s*finally\s*\{\s*clearing=false/.test(src),"preview invalidation must always release its re-entrancy lock even if an unexpected UI operation throws");

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

console.log("preview input stale regression OK");
