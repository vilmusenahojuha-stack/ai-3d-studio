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
assert.strictEqual(calls, 1);

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
    parameters: {},
    operations: [{ type: "holes", holes: [6] }]
  }),
  /pitää antaa objektina/,
  "numeric holes-operation entries must be rejected instead of being silently normalized"
);

assert.strictEqual(calls, 1, "malformed numeric hole-list entries must never reach CAD geometry generation");
assert.ok(previewClears.length >= 2, "each rejected malformed plan must clear stale preview/export state");

console.log("CAD hole shape guard regression: OK");
