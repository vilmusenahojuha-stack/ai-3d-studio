"use strict";
const fs=require("fs");
const assert=require("assert");
const vm=require("vm");
const src=fs.readFileSync(require("path").join(__dirname,"..","preview_guard.js"),"utf8");

function boot({statusText="",withGeometryListener=false}={}){
  const listeners={};
  const download={disabled:false},fit={disabled:false},centauri={disabled:false};
  const validation={innerHTML:"",querySelector(){return null;},appendChild(){}};
  const elements={btnDownload:download,btnFitTest:fit,btnCentauriStl:centauri,validation,status:{textContent:statusText},dimensions:{textContent:"old"}};
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
  if(withGeometryListener)assert.equal(typeof listeners.input,"function");
  return{context,listeners,download,fit,centauri,elements};
}

{
  const app=boot({withGeometryListener:true});
  app.listeners.input({target:{id:"plateL",closest(s){return s===".part-fields"?{}:null;},matches(s){return s==="input,select,textarea";}}});
  assert.strictEqual(app.download.disabled,true,"geometry edit must lock primary STL export");
  assert.strictEqual(app.fit.disabled,true,"geometry edit must lock fit-test export even after mesh references are lost");
  assert.strictEqual(app.centauri.disabled,true,"geometry edit must lock Centauri export");
}

{
  const app=boot({statusText:"Virhe: mallin generointi epäonnistui."});
  assert.strictEqual(app.fit.disabled,true,"initial CAD failure must lock fit-test export");
  app.download.disabled=true;
  app.centauri.disabled=true;
  app.fit.disabled=false;
  assert.doesNotThrow(()=>app.context.window.AI3DPreviewGuard.check());
  assert.strictEqual(app.fit.disabled,true,"repeated failure inspection must relock a stale fit-test export without mesh references");
}

console.log("preview fit export stale regression OK");
