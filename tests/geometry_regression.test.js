"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function makeElement(initial = {}) {
  return {
    value: "PETG",
    innerHTML: "",
    textContent: "",
    disabled: false,
    hidden: false,
    style: {},
    ...initial,
  };
}

function makeRuntime() {
  const elements = new Map();
  const canvas = {
    width: 900,
    height: 700,
    getContext() {
      return {};
    },
  };

  const document = {
    getElementById(id) {
      if (id === "preview") return canvas;
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
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
    document,
    window: {},
  });

  const appSource = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const marker = appSource.indexOf("function stl(");
  assert.ok(marker > 0, "app.js:n geometry-ydintä ei löytynyt odotetusta kohdasta");

  const geometryCore = `${appSource.slice(0, marker)}\n` +
    "updateMaterial=()=>{}; draw=()=>{}; " +
    "globalThis.__getCurrentMesh=()=>currentMesh; " +
    "globalThis.__validateMesh=validate;";

  vm.runInContext(geometryCore, context, { filename: "app.js" });

  const cadPlanSource = fs.readFileSync(path.join(ROOT, "cad_plan_v2.js"), "utf8");
  vm.runInContext(cadPlanSource, context, { filename: "cad_plan_v2.js" });

  assert.ok(context.window.AI3DPlanV2CAD?.apply, "CAD Plan v2 -rajapinta ei latautunut");
  return context;
}

function generate(runtime, plan) {
  runtime.window.AI3DPlanV2CAD.apply(plan);
  const mesh = runtime.__getCurrentMesh();
  assert.ok(mesh, "CAD Plan ei tuottanut meshiä");
  return mesh;
}

function assertFiniteMesh(mesh) {
  assert.ok(Array.isArray(mesh.triangles) && mesh.triangles.length > 0, "Meshissä ei ole kolmioita");
  for (const triangle of mesh.triangles) {
    assert.equal(triangle.length, 3, "Kolmiossa pitää olla kolme pistettä");
    for (const point of triangle) {
      assert.ok(Number.isFinite(point.x), "Meshissä on virheellinen X-koordinaatti");
      assert.ok(Number.isFinite(point.y), "Meshissä on virheellinen Y-koordinaatti");
      assert.ok(Number.isFinite(point.z), "Meshissä on virheellinen Z-koordinaatti");
    }
  }
}

function testAdapter(runtime) {
  const mesh = generate(runtime, {
    schemaVersion: 2,
    partType: "adapter",
    parameters: {
      length: 40,
      insideDiameter1: 20,
      insideDiameter2: 24,
      outsideDiameter1: 26,
      outsideDiameter2: 30,
    },
  });

  assert.equal(mesh.name, "adapteri");
  assert.equal(mesh.width, 30);
  assert.equal(mesh.depth, 30);
  assert.equal(mesh.height, 40);
  assert.equal(mesh.triangles.length, 512);
  assertFiniteMesh(mesh);
  assert.equal(runtime.__validateMesh(mesh).ok, true, "Adapterin pitää olla suljettu manifold-mesh");
}

function testEnclosure(runtime) {
  const mesh = generate(runtime, {
    schemaVersion: 2,
    partType: "enclosure",
    parameters: {
      width: 80,
      length: 60,
      height: 35,
      wall: 2.4,
      floorThickness: 3,
    },
  });

  assert.equal(mesh.name, "kotelo");
  assert.equal(mesh.width, 80);
  assert.equal(mesh.depth, 60);
  assert.equal(mesh.height, 35);
  assert.equal(mesh.triangles.length, 32);
  assertFiniteMesh(mesh);
  assert.equal(runtime.__validateMesh(mesh).ok, true, "Kotelon pitää olla suljettu manifold-mesh");
}

function testWallDerivedAdapter(runtime) {
  const mesh = generate(runtime, {
    schemaVersion: 2,
    partType: "adapter",
    parameters: {
      length: 30,
      insideDiameter: 18,
      wall: 2,
    },
  });

  assert.equal(mesh.width, 22);
  assert.equal(mesh.depth, 22);
  assert.equal(mesh.height, 30);
  assert.equal(runtime.__validateMesh(mesh).ok, true);
}

function testInvalidPlans(runtime) {
  assert.throws(
    () => runtime.window.AI3DPlanV2CAD.apply({
      schemaVersion: 1,
      partType: "adapter",
      parameters: { length: 20, insideDiameter: 10, wall: 2 },
    }),
    /Schema v2/,
  );

  assert.throws(
    () => runtime.window.AI3DPlanV2CAD.apply({
      schemaVersion: 2,
      partType: "adapter",
      parameters: { length: "", insideDiameter: 10, wall: 2 },
    }),
    /kelvollinen numero/,
  );

  assert.throws(
    () => runtime.window.AI3DPlanV2CAD.apply({
      schemaVersion: 2,
      partType: "enclosure",
      parameters: { width: 20, length: 20, height: 10, wall: 10, floorThickness: 2 },
    }),
    /mitat eivät ole mahdollisia/,
  );

  assert.throws(
    () => runtime.window.AI3DPlanV2CAD.apply({
      schemaVersion: 2,
      partType: "adapter",
      parameters: { length: 6000, insideDiameter: 10, wall: 2 },
    }),
    /enintään 5000 mm/,
  );
}

function testFinishFailureClearsPreview(runtime) {
  const download = runtime.document.getElementById("btnDownload");
  const fit = runtime.document.getElementById("btnFitTest");
  const dimensions = runtime.document.getElementById("dimensions");
  download.disabled = false;
  fit.disabled = false;
  dimensions.textContent = "vanha mitta";

  vm.runInContext("validate=()=>{throw Error('forced validation failure')}", runtime);
  assert.throws(
    () => runtime.window.AI3DPlanV2CAD.apply({
      schemaVersion: 2,
      partType: "adapter",
      parameters: { length: 30, insideDiameter: 18, wall: 2 },
    }),
    /forced validation failure/,
  );
  assert.equal(runtime.__getCurrentMesh(), null, "epäonnistunut CAD v2 -viimeistely ei saa jättää meshiä aktiiviseksi");
  assert.equal(download.disabled, true, "epäonnistunut CAD v2 -viimeistely estää stale-STL-latauksen");
  assert.equal(fit.disabled, true, "epäonnistunut CAD v2 -viimeistely estää stale-sovitustestin");
  assert.equal(dimensions.textContent, "–", "epäonnistunut CAD v2 -viimeistely tyhjentää stale-mitat");
}

const runtime = makeRuntime();
testAdapter(runtime);
testEnclosure(runtime);
testWallDerivedAdapter(runtime);
testInvalidPlans(runtime);
testFinishFailureClearsPreview(runtime);

console.log("geometry regression: OK");