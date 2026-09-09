"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const runtime=fs.readFileSync(path.join(root,"runtime_health_guard.js"),"utf8");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
assert.match(index,/cad_v2_editor\.js\?v=1\.5/,"index.html must load the current CAD v2 editor cache version");
assert.match(runtime,/\["cadV2",\(\)=>!cadV2Ready\(\),"cad_v2_editor\.js\?v=1\.5"\]/,"runtime fallback must use the same CAD v2 editor version");
assert.match(runtime,/\["centauri",\(\)=>!centauriReady\(\),"centauri\.js\?v=1\.9"\]/,"runtime fallback must use the same Centauri profile version");
assert.match(runtime,/\["CAD v2 -editori",cadV2Ready\]/,"runtime health must report a missing CAD v2 editor");
assert.match(runtime,/\["Centauri-profiili",centauriReady\]/,"runtime health must report a missing Centauri profile");
const appended=[];
const warning={hidden:true,textContent:""};
const elements={projectPrintInfo:{after(){}},runtimeHealthWarning:warning};
const document={
 readyState:"complete",hidden:false,
 getElementById:id=>elements[id]||null,
 querySelector:()=>null,
 createElement:tag=>tag==="script"?{dataset:{},async:false,onload:null,onerror:null,src:""}:{id:"",className:"",hidden:false,textContent:""},
 head:{appendChild(){}},body:{appendChild:s=>appended.push(s)},
 addEventListener(){}
};
const window={AI3D:{setPart(){}},addEventListener(){}};
const context={window,document,setTimeout:fn=>{context._timer=fn;return 1},clearTimeout(){},Date};
vm.createContext(context);vm.runInContext(runtime,context,{filename:"runtime_health_guard.js"});
assert.ok(window.AI3DRuntimeHealth,"runtime health API must initialize");
assert.ok(window.AI3DRuntimeHealth.missing().includes("CAD v2 -editori"),"missing CAD v2 editor must be visible in health status");
assert.ok(window.AI3DRuntimeHealth.missing().includes("Centauri-profiili"),"missing Centauri profile must be visible in health status");
window.AI3DRuntimeHealth.retryDependencies();
const v2=appended.find(s=>s.dataset.ai3dCadFallback==="cadV2");
assert.ok(v2,"manual dependency retry must append a CAD v2 recovery script");
assert.match(v2.src,/^cad_v2_editor\.js\?v=1\.5&healthRetry=\d+$/,"recovery script must be cache-busted without changing its pinned version");
const centauri=appended.find(s=>s.dataset.ai3dCadFallback==="centauri");
assert.ok(centauri,"manual dependency retry must append a Centauri recovery script");
assert.strictEqual(centauri.dataset.ai3dCentauri,"1","Centauri recovery must keep the shared loader marker");
assert.match(centauri.src,/^centauri\.js\?v=1\.9&healthRetry=\d+$/,"Centauri recovery script must be cache-busted without changing its pinned profile version");
assert.strictEqual(window.AI3DRuntimeHealth.dependencyState().centauriProfile,"missing","dependency state must expose a missing Centauri profile");
console.log("CAD v2 and Centauri runtime recovery regression: ok");
