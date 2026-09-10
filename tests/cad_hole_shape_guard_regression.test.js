"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("cad_apply_guard.js", "utf8");
const previewClears = [];
const window = {
  AI3D: { setPart(type, values) { return { type, values }; } },
  AI3DPreviewGuard: { clear(message) { previewClears.push(message); } }
};
const document = {
  readyState: "complete",
  getElementById() { return null; },
  addEventListener() {}
};
vm.runInNewContext(source, { window, document, Error, Object, String, Number, Array, Math });

let calls = 0;
window.AI3DPlanV2CAD = {
  apply(plan) { calls++; return plan; }
};

const centerHoleNumber = {
  schemaVersion: 2,
  partType: "mountingPlate",
  parameters: { centerHole: 6 }
};
assert.strictEqual(window.AI3DPlanV2CAD.apply(centerHoleNumber), centerHoleNumber,
  "numeric centerHole remains valid because Schema v2 explicitly allows it");

const validHoleObject = {
  schemaVersion: 2,
  partType: "mountingPlate",
  parameters: { holes: [{ x: 10, y: -5, diameter: 6 }] }
};
assert.strictEqual(window.AI3DPlanV2CAD.apply(validHoleObject), validHoleObject,
  "Schema v2 hole objects with explicit x/y/diameter remain valid");
assert.strictEqual(calls, 2);

assert.throws(
  () => window.AI3DPlanV2CAD.apply({
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { holes: [6] }
  }),
  /pitää antaa objektina/,
  "numeric parameters.holes entries must be rejected instead of being reinterpreted as centered holes"
);

assert.throws(
  () => window.AI3DPlanV2CAD.apply({
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { holes: [{ y: 5, diameter: 6 }] }
  }),
  /pitää antaa x ja y/,
  "hole-list entries missing x or y must be rejected instead of defaulting the missing coordinate to zero"
);

assert.throws(
  () => window.AI3DPlanV2CAD.apply({
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { holes: [{ x: 0, y: 0, d: 6 }] }
  }),
  /puuttuu diameter/,
  "legacy d aliases must not silently bypass the Schema v2 diameter requirement"
);

assert.throws(
  () => window.AI3DPlanV2CAD.apply({
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: {},
    operations: [{ type: "holes", holes: [6] }]
  }),
  /pitää antaa objektina/,
  "numeric holes-operation entries must be rejected instead of being silently normalized"
);

assert.throws(
  () => window.AI3DPlanV2CAD.apply({
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: {},
    operations: [{ type: "hole", x: 4, y: 5 }]
  }),
  /puuttuu diameter/,
  "single hole operations must require the Schema v2 diameter field"
);

assert.strictEqual(calls, 2, "malformed hole definitions must never reach CAD geometry generation");
assert.ok(previewClears.length >= 5, "each rejected malformed plan must clear stale preview/export state");

console.log("CAD hole shape guard regression: OK");
