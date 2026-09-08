"use strict";

const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

function makeElement(overrides={}){
  return {
    textContent:"",
    innerHTML:"",
    className:"",
    dataset:{},
    disabled:false,
    hidden:false,
    width:100,
    height:100,
    querySelector(){return null;},
    appendChild(){},
    append(){},
    getContext(){return{clearRect(){}};},
    ...overrides
  };
}

// Preview must become unusable when project storage changes in another tab.
{
  const elements={
    planSyncStatus:makeElement({textContent:"⚠ Projektitallennus muuttui toisessa välilehdessä."}),
    status:makeElement(),
    validation:makeElement(),
    btnDownload:makeElement(),
    btnFitTest:makeElement(),
    dimensions:makeElement({textContent:"20 × 20 × 20 mm"}),
    measureOverlay:makeElement({hidden:false}),
    preview:makeElement()
  };
  const document={
    readyState:"complete",
    getElementById(id){return elements[id]||null;},
    createElement(){return makeElement();},
    createTextNode(text){return{textContent:String(text)};}
  };
  class MutationObserver{constructor(fn){this.fn=fn;}observe(){}}
  const context={
    window:{
      AI3DStorageCommitGuard:{hasConflict:true,lastIssue:"Projektitallennus muuttui toisessa välilehdessä tai ikkunassa."},
      AI3DProjects:{active(){return{id:"p1"};}}
    },
    document,
    MutationObserver,
    currentMesh:{stale:true},
    currentFitMesh:{stale:true},
    draw(){},
    setTimeout(fn){fn();return 1;},
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("preview_guard.js","utf8"),context,{filename:"preview_guard.js"});
  context.window.AI3DPreviewGuard.check();
  assert.strictEqual(context.currentMesh,null,"cross-tab conflict must clear the stale preview mesh");
  assert.strictEqual(context.currentFitMesh,null,"cross-tab conflict must clear the stale fit-test mesh");
  assert.strictEqual(elements.btnDownload.disabled,true,"STL download must be disabled while project storage is stale");
  assert.strictEqual(elements.btnFitTest.disabled,true,"fit-test export must be disabled while project storage is stale");
  assert.match(context.window.AI3DPreviewGuard.failureReason(),/toisessa välilehdessä/i,"preview failure reason must retain the storage-conflict cause");
}

// Project list clicks must not switch CAD state after a cross-tab conflict.
{
  const KEY="ai3d:projects:v3",ACTIVE=KEY+":active";
  const project={id:"p1",name:"Testi",description:"",type:"sleeve",values:{sleeveID:20,sleeveWall:3,sleeveLength:30,material:"PETG"}};
  const map=new Map([[KEY,JSON.stringify([project])],[ACTIVE,"p1"]]);
  const localStorage={getItem(k){return map.has(k)?map.get(k):null;}};
  let clickHandler=null,setPartCalls=0,prevented=false,stopped=false;
  const sync=makeElement();
  const document={
    getElementById(id){return id==="planSyncStatus"?sync:null;},
    addEventListener(name,fn,capture){if(name==="click"&&capture)clickHandler=fn;}
  };
  const window={
    AI3DStorageCommitGuard:{hasConflict:true,lastIssue:"Projektitallennus muuttui toisessa välilehdessä tai ikkunassa."},
    AI3D:{setPart(){setPartCalls++;}}
  };
  const context={window,document,localStorage,setTimeout(fn){fn();return 1;},console,JSON,Number,Object,String,Set,Array,Error};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("project_open_guard.js","utf8"),context,{filename:"project_open_guard.js"});
  assert.ok(clickHandler,"project open guard must install a capturing click guard");
  const button={dataset:{id:"p1"}};
  const event={
    target:{closest(){return button;}},
    preventDefault(){prevented=true;},
    stopImmediatePropagation(){stopped=true;}
  };
  clickHandler(event);
  assert.strictEqual(prevented,true,"stale project click must be prevented");
  assert.strictEqual(stopped,true,"stale project click must not reach the normal opener");
  assert.strictEqual(setPartCalls,0,"stale project click must not change CAD state");
  assert.match(sync.textContent,/Päivit|toisessa välilehdessä/i,"user must receive a recovery instruction");

  assert.throws(
    ()=>context.window.AI3DProjectOpenGuard.check({...project,name:"x".repeat(121)}),
    /rakennetarkistusta/i,
    "project-open validation must enforce the same project-name limit as storage validation"
  );

  window.AI3DStorageCommitGuard.hasConflict=false;
  prevented=false;stopped=false;
  clickHandler(event);
  assert.strictEqual(setPartCalls,0,"normal project click preflight must leave CAD generation to projects.js so the model is generated only once");
  assert.strictEqual(prevented,false,"normal project click must not be blocked");
}

console.log("cross-tab stale-state regression: ok");
