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

vm.runInNewContext(source, { window, document, console, fetch: async () => { throw new Error("not used"); }, Date, Error, Promise, Set, JSON, Math, Number, String, Array, Object });

const api = window.AI3DPlanSchema;
assert(api && typeof api.escapeHTML === "function", "plan schema API must expose the shared HTML escaping helper");
assert.strictEqual(
  api.escapeHTML(`<img src=x onerror="alert('x')"> & test`),
  "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; test",
  "ChatGPT supplied preview text must be HTML escaped"
);

assert(source.includes("${esc(plan?.projectName||\"ChatGPT-suunnitelma\")}"), "projectName must be escaped before innerHTML rendering");
assert(source.includes("${esc(plan?.summary||\"\")}"), "summary must be escaped before innerHTML rendering");
assert(source.includes("errors.map(esc).join"), "validation errors must be escaped before innerHTML rendering");
assert(source.includes("`${esc(k)}: <b>${esc(v)}</b>`"), "parameter names and scalar values must be escaped in preview formatting");
assert(source.includes('V2_CAD_URL="cad_plan_v2.js?v=1.4"'), "ChatGPT CAD loader must use the same CAD Plan v2 cache version as index.html");
assert(source.includes("s.onload=()=>{v2Load=null;if(window.AI3DPlanV2CAD)resolve()"), "successful CAD loader completion must clear the in-flight promise and verify the API");
assert(source.includes("s.onerror=()=>{v2Load=null;s.remove?.();reject"), "failed CAD loader attempts must clear the in-flight promise so a transient network failure can be retried");
assert(source.includes("if(!pending||applying)return;const plan=pending"), "apply must snapshot the accepted plan and block duplicate concurrent applies");
assert(source.includes("if(!applied&&material&&previousMaterial!=null)material.value=previousMaterial"), "a failed CAD transfer must restore the material selection instead of leaving partial UI state");
assert(source.includes("finally{applying=false;if(ap)ap.disabled=false}"), "apply lock and button state must always recover after success or failure");
assert(!source.includes("value=pending.material"), "async CAD transfer must not keep reading mutable pending plan state after apply starts");

const validAdapter = {
  schemaVersion: 2,
  status: "ready",
  projectName: "safe",
  partType: "adapter",
  material: "PETG",
  parameters: { length: 50, insideDiameter1: 20, insideDiameter2: 25, wall: 2 }
};
assert.deepStrictEqual(Array.from(api.validate(validAdapter)), [], "valid v2 adapter should remain accepted after preview hardening");
const canonical = api.canonical(validAdapter);
assert.strictEqual(canonical.partType, "adapter");
assert.strictEqual(canonical.parameters.length, 50);

const thinAdapter = {
  ...validAdapter,
  parameters: { length: 50, insideDiameter1: 20, insideDiameter2: 25, outsideDiameter1: 20.6, outsideDiameter2: 25.6 }
};
assert(
  Array.from(api.validate(thinAdapter)).some(x => x.includes("vähintään 0,4 mm seinämä")),
  "ChatGPT validation must reject adapter dimensions that CAD buildAdapter would reject for insufficient wall thickness"
);

const incompleteAdapter = {
  ...validAdapter,
  parameters: { length: 50, insideDiameter1: 20, insideDiameter2: 25, outsideDiameter1: 28 }
};
assert(
  Array.from(api.validate(incompleteAdapter)).some(x => x.includes("ulko")),
  "ChatGPT validation must reject an adapter when the second outside diameter cannot be derived"
);

const impossibleEnclosure = {
  schemaVersion: 2,
  status: "ready",
  projectName: "bad enclosure",
  partType: "enclosure",
  material: "PETG",
  parameters: { width: 20, length: 20, height: 10, wall: 9, floorThickness: 9 }
};
assert(
  Array.from(api.validate(impossibleEnclosure)).some(x => x.includes("sisätila")),
  "ChatGPT validation must reject enclosure dimensions that CAD buildEnclosure would reject"
);

const badFloor = {
  ...impossibleEnclosure,
  parameters: { width: 80, length: 60, height: 30, wall: 2.4, floorThickness: 0.4 }
};
assert(
  Array.from(api.validate(badFloor)).some(x => x.includes("floorThickness")),
  "ChatGPT validation must reject enclosure floor thickness below the CAD minimum"
);

const unsupportedOperation = {
  schemaVersion: 2,
  status: "ready",
  projectName: "unsupported op",
  partType: "mountingPlate",
  material: "PETG",
  parameters: { length: 100, width: 60, thickness: 4 },
  operations: [{ type: "subtract" }]
};
assert(
  Array.from(api.validate(unsupportedOperation)).some(x => x.includes("tukematon CAD-operaatio")),
  "direct ChatGPT import must reject operations that Schema v2 and the CAD operation guard do not execute"
);

const operationOnAdapter = {
  ...validAdapter,
  operations: [{ type: "hole", x: 0, y: 0, diameter: 4 }]
};
assert(
  Array.from(api.validate(operationOnAdapter)).some(x => x.includes("vain mountingPlate")),
  "CAD operations must not be silently accepted for part types that do not execute them"
);

const validPlateOperation = {
  schemaVersion: 2,
  status: "ready",
  projectName: "plate op",
  partType: "mountingPlate",
  material: "PETG",
  parameters: { length: 100, width: 60, thickness: 4 },
  operations: [{ type: "hole", x: 0, y: 0, diameter: 6 }]
};
assert.deepStrictEqual(
  Array.from(api.validate(validPlateOperation)),
  [],
  "a supported mountingPlate hole operation must remain valid"
);

const tooManyHoles = {
  ...validPlateOperation,
  operations: [{ type: "holes", holes: Array.from({ length: 201 }, (_, i) => ({ x: i, y: 0, diameter: 1 })) }]
};
assert(
  Array.from(api.validate(tooManyHoles)).some(x => x.includes("yli 200 reikää")),
  "direct ChatGPT import must enforce the same 200-hole complexity bound as Schema v2"
);

console.log("ChatGPT plan preview regression: OK");