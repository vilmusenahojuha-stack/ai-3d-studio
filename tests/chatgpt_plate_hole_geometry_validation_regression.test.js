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
  projectName: "mounting plate hole preflight",
  partType: "mountingPlate",
  material: "PETG",
  parameters: {
    length: 100,
    width: 60,
    thickness: 4,
    holes: []
  },
  operations: []
};

const valid = {
  ...base,
  parameters: {
    ...base.parameters,
    holes: [
      { x: -25, y: 0, diameter: 6 },
      { x: 25, y: 0, diameter: 6 }
    ]
  }
};
assert.deepStrictEqual(Array.from(validate(valid)), [], "well-separated holes inside the plate must remain accepted");

const edge = {
  ...base,
  parameters: {
    ...base.parameters,
    holes: [{ x: 47, y: 0, diameter: 6 }]
  }
};
assert(
  Array.from(validate(edge)).some(x => /liian lähellä levyn todellista reunaa tai kulmaa/i.test(x)),
  "a hole violating the CAD edge margin must be rejected during ChatGPT import"
);

const overlap = {
  ...base,
  parameters: {
    ...base.parameters,
    holes: [
      { x: 0, y: 0, diameter: 10 },
      { x: 9.9, y: 0, diameter: 10 }
    ]
  }
};
assert(
  Array.from(validate(overlap)).some(x => /menevät päällekkäin tai ovat liian lähellä/i.test(x)),
  "holes violating the CAD 0.4 mm separation margin must be rejected during ChatGPT import"
);

const roundedCorner = {
  ...base,
  parameters: {
    ...base.parameters,
    cornerRadius: 12,
    holes: [{ x: 43, y: 23, diameter: 4 }]
  }
};
assert(
  Array.from(validate(roundedCorner)).some(x => /liian lähellä levyn todellista reunaa tai kulmaa/i.test(x)),
  "rounded plate corners must be considered by ChatGPT hole preflight"
);

const operationEdge = {
  ...base,
  operations: [{ type: "hole", x: 48, y: 0, diameter: 4 }]
};
assert(
  Array.from(validate(operationEdge)).some(x => /liian lähellä levyn todellista reunaa tai kulmaa/i.test(x)),
  "hole operations must use the same geometry preflight as parameter holes"
);

const duplicateOperation = {
  ...base,
  operations: [
    { type: "hole", x: 20, y: 0, diameter: 5 },
    { type: "hole", x: 20, y: 0, diameter: 5 }
  ]
};
assert.deepStrictEqual(
  Array.from(validate(duplicateOperation)),
  [],
  "exact duplicate operation holes are deduplicated by CAD and must not become a false overlap error"
);

console.log("ChatGPT mounting plate hole geometry validation regression: OK");
