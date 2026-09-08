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
  projectName: "mounting plate",
  partType: "mountingPlate",
  material: "PETG",
  parameters: {
    length: 100,
    width: 60,
    thickness: 4,
    centerHole: { diameter: 10 },
    holes: []
  },
  operations: []
};

assert.deepStrictEqual(Array.from(validate(base)), [], "valid center hole must remain accepted");

const invalidObject = {
  ...base,
  parameters: { ...base.parameters, centerHole: {} }
};
assert(
  Array.from(validate(invalidObject)).some(x => x.includes("centerHole")),
  "centerHole object without a valid diameter must be rejected before CAD"
);

const invalidNumber = {
  ...base,
  parameters: { ...base.parameters, centerHole: -1 }
};
assert(
  Array.from(validate(invalidNumber)).some(x => x.includes("centerHole")),
  "negative numeric centerHole must be rejected before CAD"
);

const twoHundredOtherHoles = [];
for (let y = -24; y <= 24 && twoHundredOtherHoles.length < 200; y += 4) {
  for (let x = -44; x <= 44 && twoHundredOtherHoles.length < 200; x += 4) {
    if (Math.hypot(x, y) <= 6) continue;
    twoHundredOtherHoles.push({ x, y, diameter: 0.2 });
  }
}
assert.strictEqual(twoHundredOtherHoles.length, 200, "test fixture must contain 200 geometrically separated holes");

const overLimit = {
  ...base,
  parameters: { ...base.parameters, holes: twoHundredOtherHoles }
};
assert(
  Array.from(validate(overLimit)).some(x => x.includes("yhteensä yli 200 reikää")),
  "centerHole must count toward the same 200-hole CAD limit"
);

const boundaryOk = {
  ...base,
  parameters: { ...base.parameters, holes: twoHundredOtherHoles.slice(0, 199) }
};
assert.deepStrictEqual(
  Array.from(validate(boundaryOk)),
  [],
  "199 geometrically valid listed holes plus centerHole must remain within the CAD limit"
);

console.log("ChatGPT center hole validation regression: OK");
