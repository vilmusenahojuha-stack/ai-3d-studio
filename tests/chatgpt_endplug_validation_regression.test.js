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
  projectName: "end plug",
  partType: "endPlug",
  material: "PETG",
  parameters: {
    width: 50,
    height: 30,
    wall: 2.5,
    clearance: 0.25,
    insertDepth: 18,
    capThickness: 3,
    overhang: 1
  }
};

assert.deepStrictEqual(Array.from(validate(base)), [], "normal Schema v2 end plug must remain valid");

const depthBoundary = {
  ...base,
  parameters: { ...base.parameters, insertDepth: 2 }
};
assert(
  Array.from(validate(depthBoundary)).some(x => x.includes("yli 2 mm")),
  "Schema v2 end-plug insertDepth must match buildPlug requirement of more than 2 mm"
);

const capBoundary = {
  ...base,
  parameters: { ...base.parameters, capThickness: 1 }
};
assert(
  Array.from(validate(capBoundary)).some(x => x.includes("yli 1 mm")),
  "Schema v2 cap thickness must match buildPlug requirement of more than 1 mm"
);

const impossibleStem = {
  ...base,
  parameters: { ...base.parameters, width: 10, wall: 3, clearance: 1 }
};
assert(
  Array.from(validate(impossibleStem)).some(x => x.includes("varsi ei mahdu")),
  "Schema v2 must reject a stem whose calculated inner width is 2 mm or less"
);

const negativeClearance = {
  ...base,
  parameters: { ...base.parameters, clearance: -0.1 }
};
assert(
  Array.from(validate(negativeClearance)).some(x => x.includes("clearance")),
  "Schema v2 must reject negative clearance before applying the plan"
);

const negativeOverhang = {
  ...base,
  parameters: { ...base.parameters, overhang: -0.1 }
};
assert(
  Array.from(validate(negativeOverhang)).some(x => x.includes("overhang")),
  "Schema v2 must reject negative cap overhang before applying the plan"
);

const boundaryOk = {
  ...base,
  parameters: { ...base.parameters, insertDepth: 2.01, capThickness: 1.01 }
};
assert.deepStrictEqual(
  Array.from(validate(boundaryOk)),
  [],
  "Schema v2 end plug just above both CAD boundaries must remain valid"
);

const legacyBase = {
  schemaVersion: 1,
  status: "ready",
  projectName: "legacy plug",
  partType: "plug",
  material: "PETG",
  values: {
    tubeW: 50,
    tubeH: 30,
    tubeWall: 2.5,
    plugClear: 0.25,
    insertDepth: 18,
    capThickness: 3
  }
};
assert.deepStrictEqual(Array.from(validate(legacyBase)), [], "normal Schema v1 plug must remain valid");

const legacyDepthBoundary = {
  ...legacyBase,
  values: { ...legacyBase.values, insertDepth: 2 }
};
assert(
  Array.from(validate(legacyDepthBoundary)).some(x => x.includes("yli 2 mm")),
  "Schema v1 insertDepth must match buildPlug requirement of more than 2 mm"
);

const legacyCapBoundary = {
  ...legacyBase,
  values: { ...legacyBase.values, capThickness: 1 }
};
assert(
  Array.from(validate(legacyCapBoundary)).some(x => x.includes("yli 1 mm")),
  "Schema v1 capThickness must match buildPlug requirement of more than 1 mm"
);

const legacyImpossibleStem = {
  ...legacyBase,
  values: { ...legacyBase.values, tubeW: 10, tubeWall: 3, plugClear: 1 }
};
assert(
  Array.from(validate(legacyImpossibleStem)).some(x => x.includes("varsi ei mahdu")),
  "Schema v1 must reject impossible plug stem geometry before CAD generation"
);

console.log("ChatGPT end-plug validation regression: OK");
