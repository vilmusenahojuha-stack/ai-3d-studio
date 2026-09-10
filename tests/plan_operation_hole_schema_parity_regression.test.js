"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("plan_operation_guard.js", "utf8");
const window = {};
const document = {
  readyState: "loading",
  getElementById() { return null; },
  querySelector() { return null; },
  addEventListener() {}
};
const context = {
  window,
  document,
  MutationObserver: class { observe() {} },
  fetch: async () => { throw new Error("not used"); },
  setTimeout,
  clearTimeout,
  console
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "plan_operation_guard.js" });

const validate = window.AI3DPlanOperationGuard?.validate;
assert.equal(typeof validate, "function", "operation guard validator must be available");

function plan(parameters, operations = []) {
  return {
    schemaVersion: 2,
    status: "ready",
    projectName: "hole schema parity",
    material: "PETG",
    partType: "mountingPlate",
    parameters: {
      length: 5000,
      width: 5000,
      thickness: 4,
      holes: [],
      ...parameters
    },
    operations
  };
}

assert.equal(validate(plan({ holes: [{ x: 2000, y: -2000, diameter: 500 }] })).ok, true,
  "Schema v2 hole boundary values must remain accepted by the operation guard");
assert.equal(validate(plan({ holes: [{ x: 2000.01, y: 0, diameter: 10 }] })).ok, false,
  "hole x beyond Schema v2 ±2000 mm limit must be rejected before CAD");
assert.equal(validate(plan({ holes: [{ x: 0, y: 0, diameter: 500.01 }] })).ok, false,
  "hole diameter beyond Schema v2 500 mm limit must be rejected before CAD");
assert.equal(validate(plan({ holes: [{ x: 0, y: 0, diameter: 0.19 }] })).ok, false,
  "hole diameter below Schema v2 0.2 mm limit must be rejected before CAD");
assert.equal(validate(plan({ holes: [{ x: 0, y: 0, d: 10 }] })).ok, false,
  "legacy d alias must not be accepted for Schema v2 listed holes");

assert.equal(validate(plan({ centerHole: { diameter: 10, x: 2400, y: 2400 } })).ok, true,
  "centerHole must be validated at the center, matching CAD semantics even if extra x/y fields are present");
assert.equal(validate(plan({ centerHole: { d: 10 } })).ok, false,
  "legacy d alias must not be accepted for Schema v2 centerHole objects");

assert.equal(validate(plan({}, [{ type: "hole", x: -2000, y: 2000, diameter: 500 }])).ok, true,
  "hole operation boundary values must remain accepted");
assert.equal(validate(plan({}, [{ type: "hole", x: -2000.01, y: 0, diameter: 10 }])).ok, false,
  "hole operation coordinates beyond Schema v2 limit must be rejected");
assert.equal(validate(plan({}, [{ type: "holes", holes: [{ x: 0, y: 0, diameter: 500.01 }] }])).ok, false,
  "holes operation diameters beyond Schema v2 limit must be rejected");

console.log("Plan operation hole Schema v2 parity regression: OK");
