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

function plate(length, width, thickness) {
  return {
    schemaVersion: 2,
    status: "ready",
    projectName: "plate CAD parity",
    material: "PETG",
    partType: "mountingPlate",
    parameters: { length, width, thickness, holes: [] },
    operations: []
  };
}

assert.equal(validate(plate(2.01, 2.01, 0.5)).ok, true,
  "plate just above CAD length/width minimum and at thickness minimum must remain accepted");
assert.equal(validate(plate(2, 20, 4)).ok, false,
  "plate length at the CAD-invalid 2 mm boundary must be rejected before generation");
assert.equal(validate(plate(20, 2, 4)).ok, false,
  "plate width at the CAD-invalid 2 mm boundary must be rejected before generation");
assert.equal(validate(plate(20, 20, 0.49)).ok, false,
  "plate thickness below the CAD minimum must be rejected before generation");
assert.equal(validate(plate(20, 20, 0.5)).ok, true,
  "plate thickness at the CAD minimum must remain accepted");

console.log("ChatGPT mounting plate CAD dimension parity regression: OK");
