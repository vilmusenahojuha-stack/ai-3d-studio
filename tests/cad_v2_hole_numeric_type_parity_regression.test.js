"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("cad_apply_guard.js","utf8");
const window={AI3D:{setPart(){return{}}},AI3DPreviewGuard:{clear(){}}};
const document={readyState:"complete",getElementById(){return null},addEventListener(){}};
vm.runInNewContext(source,{window,document,Error,Object,String,Number,Array,Math});

const validate=window.AI3DCADApplyGuard.validatePlanHoleBounds;
const plan=hole=>({schemaVersion:2,partType:"mountingPlate",parameters:{holes:[hole]}});

assert.equal(validate(plan({x:0,y:0,diameter:6})),true,
  "real finite JSON numbers must remain valid for schema v2 holes");
for(const hole of [
  {x:"0",y:0,diameter:6},
  {x:0,y:"0",diameter:6},
  {x:0,y:0,diameter:"6"},
  {x:null,y:0,diameter:6},
  {x:0,y:0,diameter:null}
]){
  assert.throws(()=>validate(plan(hole)),/-2000…2000 mm/,
    "schema v2 CAD apply guard must reject coerced or missing hole coordinates/diameters");
}

assert.equal(validate({schemaVersion:2,partType:"mountingPlate",parameters:{centerHole:6}}),true,
  "numeric centerHole shorthand must remain supported");
assert.throws(()=>validate({schemaVersion:2,partType:"mountingPlate",parameters:{centerHole:{diameter:"6"}}}),/0\.2…500 mm/,
  "centerHole object diameter must be a real JSON number, matching ChatGPT preflight");

console.log("CAD v2 hole numeric type parity regression: OK");
