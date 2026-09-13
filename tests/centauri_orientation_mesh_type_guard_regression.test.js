"use strict";

const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"..");
let source=fs.readFileSync(path.join(root,"centauri_orientation.js"),"utf8");
source=source.replace(
  "window.CentauriOrientation={analyse,render,stability};",
  "window.CentauriOrientation={analyse,render,stability,transformed,finitePoint};"
);

const document={
  readyState:"complete",
  querySelector(){return{}},
  getElementById(){return null},
  createElement(){return{dataset:{},style:{},appendChild(){}}},
  head:{appendChild(){}},
  addEventListener(){}
};
const window={};
const context={window,document,setInterval(){return 1},clearInterval(){},setTimeout(){return 1},Math,Number};
vm.createContext(context);
vm.runInContext(source,context,{filename:"centauri_orientation.js"});
const api=window.CentauriOrientation;
assert.equal(typeof api.transformed,"function","orientation regression must expose transformed mesh helper");

const valid={triangles:[[
  {x:0,y:0,z:2},
  {x:10,y:0,z:2},
  {x:0,y:10,z:5}
]]};
const identity=p=>({x:p.x,y:p.y,z:p.z});
const transformed=api.transformed(valid,identity);
assert.ok(transformed,"finite numeric mesh must remain valid for orientation comparison");
assert.deepEqual(Array.from(transformed.triangles[0],p=>p.z),[0,0,3],"valid mesh must still be translated onto the build plate");

for(const bad of [
  {x:null,y:0,z:2},
  {x:"0",y:0,z:2},
  {x:"",y:0,z:2},
  {x:0,y:0,z:null},
  {x:0,y:0,z:"2"}
]){
  const mesh={triangles:[[bad,{x:10,y:0,z:2},{x:0,y:10,z:5}]]};
  assert.equal(api.transformed(mesh,identity),null,"orientation transform must reject malformed source coordinates before arithmetic can coerce them");
}

assert.equal(api.transformed({triangles:[[{x:0,y:0,z:0},{x:1,y:0,z:0}]]},identity),null,"orientation transform must reject malformed triangles");
assert.equal(api.transformed(valid,p=>({x:p.x,y:p.y,z:String(p.z)})),null,"orientation transform must reject a rotation result that is not finite numeric mesh data");

console.log("Centauri orientation mesh type guard regression: OK");
