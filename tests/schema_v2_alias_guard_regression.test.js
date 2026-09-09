"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadApi(file, apiName) {
  const source = fs.readFileSync(file, "utf8");
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
    fetch: async () => { throw new Error("fetch must not run in pure alias validation tests"); },
    setTimeout,
    clearTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: file });
  return window[apiName];
}

const preflight = loadApi("plan_preflight.js", "AI3DPlanPreflight");
const operationGuard = loadApi("plan_operation_guard.js", "AI3DPlanOperationGuard");
assert.equal(typeof preflight?.validate, "function");
assert.equal(typeof operationGuard?.validate, "function");

function v2(partType, parameters, operations = []) {
  return {
    schemaVersion: 2,
    status: "ready",
    projectName: "Schema v2 alias regression",
    summary: "Alias must behave like its canonical CAD type",
    material: "PETG",
    partType,
    parameters,
    operations
  };
}

const plug = v2("plug", {
  width: 50,
  height: 30,
  wall: 2.5,
  clearance: 0.25,
  insertDepth: 18,
  capThickness: 3,
  overhang: 1
});
assert.equal(preflight.validate(plug).ok, true, "plug alias must pass the same preflight checks as endPlug");
assert.equal(operationGuard.validate(plug).ok, true, "plug alias must pass the same operation guard checks as endPlug");

const plate = v2("plate", {
  length: 120,
  width: 60,
  thickness: 5,
  cornerRadius: 5
}, [{ type: "hole", x: 0, y: 0, diameter: 8 }]);
assert.equal(preflight.validate(plate).ok, true, "plate alias must pass mountingPlate preflight checks");
assert.equal(operationGuard.validate(plate).ok, true, "plate alias must allow mountingPlate hole operations");

const badPlate = structuredClone(plate);
badPlate.parameters.cornerRadius = 30;
assert.equal(preflight.validate(badPlate).ok, false, "plate alias must retain mountingPlate geometry rejection");
assert.equal(operationGuard.validate(badPlate).ok, false, "plate alias must retain mountingPlate operation-guard geometry rejection");

const enclosure = v2("case", {
  width: 80,
  depth: 50,
  height: 30,
  wall: 2,
  floorThickness: 2
});
assert.equal(preflight.validate(enclosure).ok, true, "case alias must pass enclosure preflight checks");
assert.equal(operationGuard.validate(enclosure).ok, true, "case alias must pass enclosure operation guard checks");

const badEnclosure = structuredClone(enclosure);
badEnclosure.parameters.wall = 0.5;
assert.equal(preflight.validate(badEnclosure).ok, false, "case alias must retain enclosure wall validation");
assert.equal(operationGuard.validate(badEnclosure).ok, false, "case alias must retain enclosure wall validation in operation guard");

const spike = v2("spikeNut", {
  nutAcrossFlats: 33,
  wall: 2.5,
  height: 75,
  baseHeight: 24
});
assert.equal(preflight.validate(spike).ok, true, "spikeNut alias must pass spike preflight checks");
assert.equal(operationGuard.validate(spike).ok, true, "spikeNut alias must remain operation-safe without unsupported operations");

console.log("Schema v2 alias guard regression tests passed");
