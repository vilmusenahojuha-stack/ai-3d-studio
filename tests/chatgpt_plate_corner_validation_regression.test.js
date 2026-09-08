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
  projectName: "rounded mounting plate",
  partType: "mountingPlate",
  material: "PETG",
  parameters: {
    length: 100,
    width: 60,
    thickness: 4,
    cornerRadius: 8,
    holes: []
  },
  operations: []
};

assert.deepStrictEqual(Array.from(validate(base)), [], "valid rounded plate must remain accepted");

const bothStyles = {
  ...base,
  parameters: { ...base.parameters, cornerRadius: 8, chamfer: 4 }
};
assert(
  Array.from(validate(bothStyles)).some(x => /kulmapyöristystä ja viistettä yhtä aikaa/i.test(x)),
  "cornerRadius and chamfer must not be accepted together when CAD rejects the combination"
);

const radiusAtLimit = {
  ...base,
  parameters: { ...base.parameters, cornerRadius: 30 }
};
assert(
  Array.from(validate(radiusAtLimit)).some(x => /liian suuri levyn mittoihin/i.test(x)),
  "cornerRadius at half of the shorter plate side must be rejected before CAD"
);

const chamferOverLimit = {
  ...base,
  parameters: { ...base.parameters, cornerRadius: 0, chamfer: 31 }
};
assert(
  Array.from(validate(chamferOverLimit)).some(x => /liian suuri levyn mittoihin/i.test(x)),
  "chamfer larger than half of the shorter plate side must be rejected before CAD"
);

const boundaryOk = {
  ...base,
  parameters: { ...base.parameters, cornerRadius: 29.99 }
};
assert.deepStrictEqual(
  Array.from(validate(boundaryOk)),
  [],
  "cornerRadius just below the CAD limit must remain accepted"
);

console.log("ChatGPT mounting plate corner validation regression: OK");
