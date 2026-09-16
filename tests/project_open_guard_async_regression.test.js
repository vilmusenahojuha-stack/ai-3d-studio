"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "project_open_guard.js"), "utf8");

function makeControl(value, defaultValue = value) {
  return { value: String(value), defaultValue: String(defaultValue), tagName: "INPUT" };
}

function makeHarness(setPart) {
  const controls = {
    partType: makeControl("spike"), nutAf: makeControl("17"), clearance: makeControl("0.2"),
    lockAmount: makeControl("0"), lockZ: makeControl("0"), wall: makeControl("2"),
    baseHeight: makeControl("10"), totalHeight: makeControl("60"), tipRadius: makeControl("1"),
    monogram: makeControl("M"), monogramWidth: makeControl("10"), monogramDepth: makeControl("1"),
    monogramHeight: makeControl("1"), material: makeControl("PLA"),
    status: { textContent: "Malli luotu ja tarkistettu." }, validation: { querySelector: () => null },
    btnDownload: { disabled: false }, btnFitTest: { disabled: false }, btnCentauriStl: { disabled: false },
    planSyncStatus: { textContent: "", className: "" }, centauriStatus: { className: "", innerHTML: "" }
  };
  const document = { getElementById(id) { return controls[id] || null; }, addEventListener() {} };
  const window = { AI3D: { setPart } };
  const localStorage = { getItem() { return null; } };
  vm.runInNewContext(source, { window, document, localStorage, Error, Object, String, Number, Array, Set, Promise });
  return { window, controls };
}

const project = { id: "p-async", name: "Async project", type: "spike", values: { nutAf: 19, material: "PLA" }, created: 1, updated: 1 };

async function main() {
  let resolveCad;
  const success = makeHarness(() => new Promise(resolve => { resolveCad = resolve; }));
  const pending = success.window.AI3DProjectOpenGuard.check(project);
  assert.ok(pending && typeof pending.then === "function", "async project CAD check must remain awaitable");
  resolveCad(true);
  assert.strictEqual(await pending, true, "resolved async project CAD must pass the guard");

  const rejected = makeHarness(() => Promise.reject(Error("CAD async reject")));
  await assert.rejects(rejected.window.AI3DProjectOpenGuard.check(project), /CAD async reject/, "rejected async project CAD must propagate");
  assert.strictEqual(rejected.controls.btnDownload.disabled, true, "rejected async CAD must lock normal STL export");
  assert.strictEqual(rejected.controls.btnFitTest.disabled, true, "rejected async CAD must lock fit-test export");
  assert.strictEqual(rejected.controls.btnCentauriStl.disabled, true, "rejected async CAD must lock Centauri export");

  const resolvers = [];
  const stale = makeHarness(() => new Promise(resolve => { resolvers.push(resolve); }));
  const oldRun = stale.window.AI3DProjectOpenGuard.check(project);
  const newer = stale.window.AI3DProjectOpenGuard.check({ ...project, id: "p-new", values: { nutAf: 20, material: "PLA" } });
  assert.strictEqual(resolvers.length, 2, "overlapping project checks must start two CAD operations");
  resolvers[1](true);
  assert.strictEqual(await newer, true, "newer project CAD check must succeed");
  resolvers[0](true);
  assert.strictEqual(await oldRun, false, "older async CAD completion must be rejected as stale");
  assert.strictEqual(stale.controls.btnCentauriStl.disabled, true, "stale CAD completion must keep Centauri export locked");

  console.log("Project open guard async regression: OK");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
