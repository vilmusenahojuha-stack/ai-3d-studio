"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadPreflightValidate() {
  const source = fs.readFileSync("plan_preflight.js", "utf8");
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
    fetch: async () => { throw new Error("fetch must not run during pure preflight validation tests"); },
    setTimeout,
    clearTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "plan_preflight.js" });
  assert.equal(typeof window.AI3DPlanPreflight?.validate, "function");
  return window.AI3DPlanPreflight.validate;
}

const validate = loadPreflightValidate();

function v1(partType, values) {
  return {
    schemaVersion: 1,
    status: "ready",
    projectName: "Preflight parity test",
    material: "PETG",
    partType,
    values
  };
}

function v2(partType, parameters) {
  return {
    schemaVersion: 2,
    status: "ready",
    projectName: "Preflight parity test",
    material: "PETG",
    partType,
    parameters,
    operations: []
  };
}

assert.equal(validate(v1("sleeve", { sleeveID: 20, sleeveWall: 1, sleeveLength: 2.01 })).ok, true,
  "Schema v1 sleeve at CAD-valid wall/length boundary should pass");
assert.equal(validate(v1("sleeve", { sleeveID: 20, sleeveWall: 0.99, sleeveLength: 20 })).ok, false,
  "Schema v1 sleeve wall below CAD minimum must fail preflight");
assert.equal(validate(v1("sleeve", { sleeveID: 20, sleeveWall: 1, sleeveLength: 2 })).ok, false,
  "Schema v1 sleeve length at CAD-invalid 2 mm boundary must fail preflight");
assert.equal(validate(v1("sleeve", { sleeveID: "20", sleeveWall: 1, sleeveLength: 20 })).ok, false,
  "Schema v1 preflight must reject numeric strings because final import requires actual JSON numbers");

const validV2Sleeve = v2("sleeve", { insideDiameter: 20, wall: 1, length: 2.01 });
assert.equal(validate(validV2Sleeve).ok, true,
  "Schema v2 sleeve at CAD-valid wall/length boundary should pass");
assert.equal(validate(v2("sleeve", { insideDiameter: 20, wall: 0.99, length: 20 })).ok, false,
  "Schema v2 sleeve wall below CAD minimum must fail preflight");
assert.equal(validate(v2("sleeve", { insideDiameter: 20, outsideDiameter: 21.99, length: 20 })).ok, false,
  "Schema v2 outsideDiameter must leave at least 1 mm radial wall");
assert.equal(validate(v2("sleeve", { insideDiameter: 20, outsideDiameter: 22, length: 2.01 })).ok, true,
  "Schema v2 outsideDiameter with exactly 1 mm radial wall should pass");
assert.equal(validate(v2("sleeve", { insideDiameter: "20", wall: 1, length: 20 })).ok, false,
  "Schema v2 preflight must reject numeric-string dimensions before final import");
assert.equal(validate(v2("sleeve", { insideDiameter: 20, wall: "1", length: 20 })).ok, false,
  "Schema v2 preflight must reject numeric-string wall values before final import");

assert.equal(validate(v1("plug", {
  tubeW: 30, tubeH: 30, tubeWall: 2, plugClear: 0.25, insertDepth: 2.01, capThickness: 1.01
})).ok, true, "Schema v1 plug just above CAD depth/cap limits should pass");
assert.equal(validate(v1("plug", {
  tubeW: 30, tubeH: 30, tubeWall: 2, plugClear: 0.25, insertDepth: 2, capThickness: 3
})).ok, false, "Schema v1 plug depth at 2 mm must fail preflight");
assert.equal(validate(v1("plug", {
  tubeW: 30, tubeH: 30, tubeWall: 2, plugClear: 0.25, insertDepth: 10, capThickness: 1
})).ok, false, "Schema v1 plug cap thickness at 1 mm must fail preflight");

assert.equal(validate(v2("endPlug", {
  width: 30, height: 30, wall: 2, clearance: 0.25, insertDepth: 2.01, capThickness: 1.01, overhang: 0
})).ok, true, "Schema v2 endPlug just above CAD depth/cap limits should pass");
assert.equal(validate(v2("endPlug", {
  width: 30, height: 30, wall: 2, clearance: 0.25, insertDepth: 2, capThickness: 3, overhang: 1
})).ok, false, "Schema v2 endPlug depth at 2 mm must fail preflight");
assert.equal(validate(v2("endPlug", {
  width: 30, height: 30, wall: 2, clearance: 0.25, insertDepth: 10, capThickness: 1, overhang: 1
})).ok, false, "Schema v2 endPlug cap thickness at 1 mm must fail preflight");
assert.equal(validate(v2("endPlug", {
  width: 30, height: 30, wall: 2, clearance: 0.25, insertDepth: 10, capThickness: 3, overhang: -0.1
})).ok, false, "Schema v2 negative overhang must fail preflight like final import validation");
assert.equal(validate(v2("endPlug", {
  width: 30, height: 30, wall: 2, clearance: "0.25", insertDepth: 10, capThickness: 3, overhang: 1
})).ok, false, "Schema v2 preflight must reject numeric-string non-negative values like final import validation");

const validPlate = v2("mountingPlate", {
  length: 100, width: 60, thickness: 4, holes: [{ x: 0, y: 0, diameter: 6 }]
});
assert.equal(validate(validPlate).ok, true,
  "Schema v2 mounting plate with explicit numeric zero coordinates must remain valid");
assert.equal(validate(v2("mountingPlate", {
  length: 100, width: 60, thickness: 4, holes: [{ x: null, y: 0, diameter: 6 }]
})).ok, false, "Preflight must reject null hole coordinates instead of coercing them to zero");
assert.equal(validate(v2("mountingPlate", {
  length: 100, width: 60, thickness: 4, holes: [{ x: " ", y: 0, diameter: 6 }]
})).ok, false, "Preflight must reject blank hole coordinates instead of coercing them to zero");
assert.equal(validate(v2("mountingPlate", {
  length: 100, width: 60, thickness: 4, holes: [{ x: "0", y: 0, diameter: 6 }]
})).ok, false, "Preflight must reject numeric-string hole coordinates like final import validation");
assert.equal(validate(v2("mountingPlate", {
  length: 100, width: 60, thickness: 4, holes: [{ y: 0, diameter: 6 }]
})).ok, false, "Preflight must reject missing hole coordinates instead of defaulting them to zero");
assert.equal(validate(v2("mountingPlate", {
  length: 100, width: 60, thickness: 4, centerHole: { diameter: 6 }
})).ok, true, "centerHole object without x/y must still mean a centered hole");

console.log("ChatGPT plan preflight CAD parity regression tests passed");
