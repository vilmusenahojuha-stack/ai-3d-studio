"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadGuard() {
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
    fetch: async () => { throw new Error("fetch must not run in regression validation"); },
    setTimeout,
    clearTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "plan_operation_guard.js" });
  assert.equal(typeof window.AI3DPlanOperationGuard?.validate, "function");
  return window.AI3DPlanOperationGuard.validate;
}

const validate = loadGuard();

const validPlate = {
  schemaVersion: 2,
  status: "ready",
  material: "PETG",
  partType: "mountingPlate",
  parameters: {
    length: 120,
    width: 60,
    thickness: 5,
    cornerRadius: 5,
    holes: [
      { x: -40, y: -15, diameter: 8 },
      { x: 40, y: -15, diameter: 8 },
      { x: -40, y: 15, diameter: 8 },
      { x: 40, y: 15, diameter: 8 }
    ]
  },
  operations: []
};

assert.equal(validate(validPlate).ok, true, "valid mounting plate should pass operation guard");

const validHoleOperation = structuredClone(validPlate);
validHoleOperation.parameters.holes = [];
validHoleOperation.operations = [{ type: "hole", x: 0, y: 0, diameter: 10 }];
assert.equal(validate(validHoleOperation).ok, true, "implemented mountingPlate hole operation should pass");

const missingCoordinates = structuredClone(validHoleOperation);
missingCoordinates.operations = [{ type: "hole", diameter: 10 }];
assert.equal(validate(missingCoordinates).ok, false, "hole without x/y must be rejected");

const unsupportedAdapterOperation = {
  schemaVersion: 2,
  status: "ready",
  material: "PETG",
  partType: "adapter",
  parameters: {
    length: 40,
    insideDiameter1: 20,
    insideDiameter2: 24,
    outsideDiameter1: 26,
    outsideDiameter2: 30
  },
  operations: [{ type: "hole", x: 0, y: 0, diameter: 4 }]
};
assert.equal(validate(unsupportedAdapterOperation).ok, false, "adapter must not accept unimplemented hole operations");

const thinAdapter = structuredClone(unsupportedAdapterOperation);
thinAdapter.operations = [];
thinAdapter.parameters.outsideDiameter1 = 20.6;
assert.equal(validate(thinAdapter).ok, false, "adapter wall thinner than guard limit must be rejected");

const invalidEnclosure = {
  schemaVersion: 2,
  status: "ready",
  material: "ASA",
  partType: "enclosure",
  parameters: {
    width: 60,
    depth: 40,
    height: 20,
    wall: 0.5,
    floorThickness: 2
  },
  operations: []
};
assert.equal(validate(invalidEnclosure).ok, false, "too-thin enclosure wall must be rejected");

const tooManyOperations = structuredClone(validPlate);
tooManyOperations.operations = Array.from({ length: 201 }, (_, i) => ({ type: "hole", x: i, y: 0, diameter: 1 }));
assert.equal(validate(tooManyOperations).ok, false, "more than 200 operations must be rejected");

const edgeHole = structuredClone(validPlate);
edgeHole.parameters.holes = [{ x: 57, y: 0, diameter: 8 }];
assert.equal(validate(edgeHole).ok, false, "hole too close to real plate edge must be rejected");

console.log("CAD Plan operation guard regression tests passed");
