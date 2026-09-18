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
    schemaVersion: 2,
    status: "ready",
    projectName,
    partType: "sleeve",
    material: "PETG",
    parameters: { insideDiameter: 30, wall: 2, length: 40 },
    operations: []
  };
}

assert.deepEqual(Array.from(schema.validate(plan("Holkki 30 mm"))), [], "valid projectName must remain accepted");
assert.ok(schema.validate(plan(undefined)).some(e => /projectName/i.test(e)), "missing projectName must be rejected before import");
assert.ok(schema.validate(plan("")).some(e => /projectName/i.test(e)), "empty projectName must be rejected before import");
assert.ok(schema.validate(plan("   ")).some(e => /projectName/i.test(e)), "whitespace-only projectName must be rejected before import");
assert.ok(schema.validate(plan("x".repeat(121))).some(e => /projectName/i.test(e)), "projectName over schema maxLength 120 must be rejected before import");
assert.ok(schema.validate(plan(42)).some(e => /projectName/i.test(e)), "non-string projectName must be rejected before import");

console.log("ChatGPT project name validation regression tests passed");
