"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadValidate() {
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
    fetch: async () => { throw new Error("fetch must not run during validation tests"); },
    setTimeout,
    clearTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "plan_preflight.js" });
  assert.equal(typeof window.AI3DPlanPreflight?.validate, "function");
  return window.AI3DPlanPreflight.validate;
}

const validate = loadValidate();

function validV1() {
  return {
    schemaVersion: 1,
    status: "ready",
    projectName: "Preflight project name",
    material: "PETG",
    partType: "sleeve",
    values: { sleeveID: 20, sleeveWall: 2, sleeveLength: 30 }
  };
}

function validV2() {
  return {
    schemaVersion: 2,
    status: "ready",
    projectName: "Preflight project name",
    material: "PETG",
    partType: "sleeve",
    parameters: { insideDiameter: 20, wall: 2, length: 30 },
    operations: []
  };
}

for (const makePlan of [validV1, validV2]) {
  assert.equal(validate(makePlan()).ok, true, "valid projectName must remain accepted");

  const missing = makePlan();
  delete missing.projectName;
  assert.equal(validate(missing).ok, false, "preflight must reject missing projectName like final import");

  const empty = makePlan();
  empty.projectName = "";
  assert.equal(validate(empty).ok, false, "preflight must reject empty projectName like final import");

  const whitespace = makePlan();
  whitespace.projectName = "   \t  ";
  assert.equal(validate(whitespace).ok, false, "preflight must reject whitespace-only projectName like final import");

  const tooLong = makePlan();
  tooLong.projectName = "x".repeat(121);
  assert.equal(validate(tooLong).ok, false, "preflight must reject projectName longer than 120 characters");

  const wrongType = makePlan();
  wrongType.projectName = 123;
  assert.equal(validate(wrongType).ok, false, "preflight must reject non-string projectName like final import");
}

console.log("ChatGPT preflight projectName parity regression tests passed");
