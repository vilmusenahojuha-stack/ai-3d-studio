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
  projectName: "sleeve",
  partType: "sleeve",
  material: "PETG",
  parameters: { insideDiameter: 20, length: 30, wall: 2 }
};

assert.deepStrictEqual(Array.from(validate(base)), [], "normal sleeve must remain valid");

const tooThinWall = {
  ...base,
  parameters: { insideDiameter: 20, length: 30, wall: 0.8 }
};
assert(
  Array.from(validate(tooThinWall)).some(x => x.includes("vähintään 1 mm seinämän")),
  "Schema v2 sleeve wall must match buildSleeve minimum of 1 mm"
);

const tooThinOutsideDiameter = {
  ...base,
  parameters: { insideDiameter: 20, length: 30, outsideDiameter: 21.5 }
};
assert(
  Array.from(validate(tooThinOutsideDiameter)).some(x => x.includes("vähintään 1 mm seinämä")),
  "outsideDiameter-derived sleeve wall must match buildSleeve minimum of 1 mm"
);

const tooShort = {
  ...base,
  parameters: { insideDiameter: 20, length: 2, wall: 2 }
};
assert(
  Array.from(validate(tooShort)).some(x => x.includes("yli 2 mm")),
  "Schema v2 sleeve length must match buildSleeve requirement of more than 2 mm"
);

const boundaryOk = {
  ...base,
  parameters: { insideDiameter: 20, length: 2.01, outsideDiameter: 22 }
};
assert.deepStrictEqual(
  Array.from(validate(boundaryOk)),
  [],
  "sleeve just above the CAD length minimum with exactly 1 mm radial wall must remain valid"
);

console.log("ChatGPT sleeve validation regression: OK");
