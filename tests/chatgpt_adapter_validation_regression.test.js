"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "plan_sync.js"), "utf8");
const window = {};
const document = {
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  createElement() { return {}; },
  head: { appendChild() {} }
};

vm.runInNewContext(source, {
  window,
  document,
  console,
  fetch: async () => { throw new Error("not used"); },
  Date,
  Error,
  Promise,
  Set,
  JSON,
  Math,
  Number,
  String,
  Array,
  Object
});

const validate = window.AI3DPlanSchema?.validate;
assert.strictEqual(typeof validate, "function", "plan validator must be available");

const base = {
  schemaVersion: 2,
  status: "ready",
  projectName: "adapter",
  partType: "adapter",
  material: "PETG",
  parameters: {
    length: 30,
    insideDiameter1: 20,
    insideDiameter2: 24,
    outsideDiameter1: 26,
    outsideDiameter2: 30
  }
};

assert.deepStrictEqual(Array.from(validate(base)), [], "normal adapter must remain valid");

const tooShort = {
  ...base,
  parameters: { ...base.parameters, length: 1.99 }
};
assert(
  Array.from(validate(tooShort)).some(x => x.includes("vähintään 2 mm pituuden")),
  "Schema v2 adapter length must match buildAdapter 2 mm minimum"
);

const boundaryOk = {
  ...base,
  parameters: { ...base.parameters, length: 2 }
};
assert.deepStrictEqual(
  Array.from(validate(boundaryOk)),
  [],
  "adapter exactly at the CAD 2 mm minimum must remain valid"
);

console.log("ChatGPT adapter validation regression: OK");
