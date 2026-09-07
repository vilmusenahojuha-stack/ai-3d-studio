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

const malicious = {
  schemaVersion: 2,
  status: "ready",
  projectName: "safe",
  partType: "adapter",
  material: "PETG",
  parameters: { length: 50, insideDiameter1: 20, insideDiameter2: 25, wall: 2 }
};
assert.deepStrictEqual(Array.from(api.validate(malicious)), [], "valid v2 adapter should remain accepted after preview hardening");
const canonical = api.canonical(malicious);
assert.strictEqual(canonical.partType, "adapter");
assert.strictEqual(canonical.parameters.length, 50);

console.log("ChatGPT plan preview regression: OK");
