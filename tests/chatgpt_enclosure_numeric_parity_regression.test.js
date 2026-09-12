"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("plan_operation_guard.js","utf8");
const window={};
const document={readyState:"loading",getElementById(){return null},querySelector(){return null},addEventListener(){}};
const context={window,document,MutationObserver:class{observe(){}},fetch:async()=>{throw Error("fetch must not run")},setTimeout,clearTimeout,console};
vm.createContext(context);
vm.runInContext(source,context,{filename:"plan_operation_guard.js"});
const validate=window.AI3DPlanOperationGuard.validate;

const valid={
 schemaVersion:2,status:"ready",material:"ASA",partType:"enclosure",
 parameters:{width:80,depth:50,height:30,wall:2,floorThickness:2},operations:[]
};
assert.equal(validate(valid).ok,true,"valid enclosure must remain accepted");

for(const [field,value] of [["width","abc"],["depth",""],["height",null],["wall","abc"],["floorThickness","abc"],["floorThickness",null]]){
 const plan=structuredClone(valid);
 plan.parameters[field]=value;
 const result=validate(plan);
 assert.equal(result.ok,false,`non-numeric enclosure ${field} must be rejected before CAD apply`);
 assert(result.errors.some(x=>/kelvollis/i.test(x)),`${field} rejection should explain that a valid numeric value is required`);
}

const thicknessAlias=structuredClone(valid);
delete thicknessAlias.parameters.wall;
delete thicknessAlias.parameters.floorThickness;
thicknessAlias.parameters.thickness=2;
assert.equal(validate(thicknessAlias).ok,true,"shared thickness alias used by CAD must remain valid");

const invalidThicknessAlias=structuredClone(thicknessAlias);
invalidThicknessAlias.parameters.thickness="abc";
assert.equal(validate(invalidThicknessAlias).ok,false,"non-numeric shared thickness alias must be rejected consistently with CAD reqNum");

console.log("ChatGPT enclosure numeric parity regression: OK");
