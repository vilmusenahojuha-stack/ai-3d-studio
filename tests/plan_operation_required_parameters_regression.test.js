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

function plan(partType, parameters) {
  return {
    schemaVersion: 2,
    status: "ready",
    projectName: "required parameter parity",
    material: "PETG",
    partType,
    parameters,
    operations: []
  };
}

assert.equal(validate(plan("mountingPlate", { length: 100, width: 60, thickness: 4, holes: [] })).ok, true,
  "valid mounting plate must remain accepted");
assert.equal(validate(plan("mountingPlate", { length: 100, width: 60, holes: [] })).ok, false,
  "missing mounting plate thickness must fail in the operation guard before CAD generation");
assert.equal(validate(plan("mountingPlate", { length: 100, width: 60, thickness: 0, holes: [] })).ok, false,
  "zero mounting plate thickness must fail in the operation guard");

const validAdapter = { length: 30, insideDiameter1: 20, insideDiameter2: 24, outsideDiameter1: 26, outsideDiameter2: 30 };
assert.equal(validate(plan("adapter", validAdapter)).ok, true,
  "valid adapter must remain accepted");
assert.equal(validate(plan("adapter", { ...validAdapter, length: undefined })).ok, false,
  "missing adapter length must fail in the operation guard before CAD generation");
assert.equal(validate(plan("adapter", { ...validAdapter, insideDiameter1: undefined })).ok, false,
  "missing adapter start inside diameter must fail in the operation guard");
assert.equal(validate(plan("adapter", { ...validAdapter, insideDiameter1: 0 })).ok, false,
  "zero adapter start inside diameter must fail in the operation guard");
assert.equal(validate(plan("adapter", { ...validAdapter, insideDiameter2: 0 })).ok, false,
  "explicit zero adapter end inside diameter must fail in the operation guard");

console.log("CAD Plan required parameter parity regression: OK");
