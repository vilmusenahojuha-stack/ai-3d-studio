"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("plan_sync.js", "utf8");
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
  TextEncoder,
  Blob,
  AbortController,
  fetch: async () => { throw new Error("fetch must not run in validation regression"); },
  setTimeout,
  clearTimeout,
  console
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "plan_sync.js" });

const schema = window.AI3DPlanSchema;
assert.equal(typeof schema?.validate, "function", "plan_sync must expose plan validation");

function plan(projectName) {
  return {
    schemaVersion: 1,
    status: "ready",
    projectName,
    partType: "sleeve",
    material: "PETG",
    values: { sleeveID: 30, sleeveWall: 2, sleeveLength: 40 }
  };
}

assert.deepEqual(Array.from(schema.validate(plan("Vanha holkki"))), [], "valid v1 projectName must remain accepted");
assert.ok(schema.validate(plan(undefined)).some(e => /projectName/i.test(e)), "missing v1 projectName must be rejected before import");
assert.ok(schema.validate(plan("")).some(e => /projectName/i.test(e)), "empty v1 projectName must be rejected before import");
assert.ok(schema.validate(plan("   ")).some(e => /projectName/i.test(e)), "whitespace-only v1 projectName must be rejected before import");
assert.ok(schema.validate(plan("x".repeat(121))).some(e => /projectName/i.test(e)), "v1 projectName over 120 characters must be rejected before import");
assert.ok(schema.validate(plan(42)).some(e => /projectName/i.test(e)), "non-string v1 projectName must be rejected before import");

console.log("ChatGPT v1 project name validation regression tests passed");
