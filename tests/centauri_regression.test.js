"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function makeElement(initial = {}) {
  return {
    value: "",
    valueAsNumber: NaN,
    innerHTML: "",
    textContent: "",
    disabled: false,
    hidden: false,
    className: "",
    style: {},
    addEventListener() {},
    click() {},
    ...initial,
  };
}

function makeRuntime() {
  const elements = new Map([
    ["centauriStatus", makeElement()],
    ["btnCentauriStl", makeElement({ disabled: true })],
    ["btnDownload", makeElement({ disabled: false })],
    ["material", makeElement({ value: "PETG" })],
    ["partType", makeElement({ value: "plate" })],
    ["plateT", makeElement({ value: "4", valueAsNumber: 4, type: "number" })],
  ]);

  const document = {
    readyState: "loading",
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return null;
    },
    createElement() {
      return makeElement();
    },
    addEventListener() {},
  };

  const context = vm.createContext({
    console,
    Math,
    Number,
    Array,
    Object,
    String,
    Boolean,
    Error,
    Map,
    Set,
    JSON,
    Blob: function Blob() {},
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    document,
    window: {},
    setTimeout() {},
    currentMesh: null,
  });

  let source = fs.readFileSync(path.join(ROOT, "centauri.js"), "utf8");
  const end = source.lastIndexOf("})();");
  assert.ok(end > 0, "centauri.js:n moduulin loppua ei löytynyt");
  source = `${source.slice(0, end)}window.__CentauriRegression={PROFILE,bounds,status};${source.slice(end)}`;
  vm.runInContext(source, context, { filename: "centauri.js" });

  assert.ok(context.window.__CentauriRegression, "Centauri-testirajapintaa ei saatu ladattua");
  return { context, elements, api: context.window.__CentauriRegression };
}

function boxMesh(x, y, z) {
  const p = [
    { x: 0, y: 0, z: 0 }, { x, y: 0, z: 0 }, { x, y, z: 0 }, { x: 0, y, z: 0 },
    { x: 0, y: 0, z }, { x, y: 0, z }, { x, y, z }, { x: 0, y, z },
  ];
  const f = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ];
  return { triangles: f.map(ids => ids.map(i => p[i])), width: x, depth: y, height: z, name: "testikappale" };
}

function testOfficialProfile(api) {
  const p = api.PROFILE;
  assert.equal(p.name, "Elegoo Centauri Carbon 2 Combo");
  assert.deepEqual(Array.from(p.build), [256, 256, 256]);
  assert.deepEqual(Array.from(p.buildPlate), [260, 260]);
  assert.equal(p.nozzle, 0.4);
  assert.equal(p.nozzleMax, 350);
  assert.equal(p.filament, 1.75);
  assert.equal(p.recommendedLayer, 0.2);
}

function testMeshBounds(api) {
  const b = api.bounds(boxMesh(120, 80, 35));
  assert.ok(b, "Centauri-rajauslaatikon pitää muodostua kelvollisesta meshistä");
  assert.deepEqual(Array.from(b.dims), [120, 80, 35]);
  assert.equal(b.triangles, 12);
  assert.equal(api.bounds({ triangles: [] }), null);
  assert.equal(api.bounds({ triangles: [[{ x: 0, y: 0, z: 0 }, { x: NaN, y: 1, z: 0 }, { x: 1, y: 0, z: 1 }]] }), null);
}

function testBuildVolumeBoundary(runtime) {
  const { context, elements, api } = runtime;

  context.currentMesh = boxMesh(256, 200, 100);
  api.status();
  assert.equal(elements.get("btnCentauriStl").disabled, false, "Täsmälleen 256 mm leveä kelvollinen mesh pitää hyväksyä rakennustilaan");
  assert.match(elements.get("centauriStatus").innerHTML, /Mahtuu tulostusalueelle|Sopii Centauri/);

  context.currentMesh = boxMesh(256.01, 200, 100);
  api.status();
  assert.equal(elements.get("btnCentauriStl").disabled, true, "256 mm rajan ylittävä mesh pitää estää Centauri-viennistä");
  assert.match(elements.get("centauriStatus").innerHTML, /ylittää Centaurin 256 mm tulostusalueen/);
}

const runtime = makeRuntime();
testOfficialProfile(runtime.api);
testMeshBounds(runtime.api);
testBuildVolumeBoundary(runtime);

console.log("centauri regression: OK");
