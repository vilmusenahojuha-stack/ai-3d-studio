"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const earcut = require("earcut");

const ROOT = path.resolve(__dirname, "..");

function makeElement(initial = {}) {
  return { value: "PETG", innerHTML: "", textContent: "", disabled: false, hidden: false, style: {}, ...initial };
}

function makeRuntime() {
  const elements = new Map();
  const canvas = { width: 900, height: 700, getContext() { return {}; } };
  const document = {
    getElementById(id) {
      if (id === "preview") return canvas;
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
  };

  const context = vm.createContext({
    console, Math, Number, Array, Object, String, Boolean, Error, Map, Set, JSON,
    document, window: {}, earcut,
  });

  const appSource = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const marker = appSource.indexOf("function stl(");
  assert.ok(marker > 0, "app.js:n geometry-ydintä ei löytynyt odotetusta kohdasta");
  vm.runInContext(
    `${appSource.slice(0, marker)}\nupdateMaterial=()=>{}; draw=()=>{}; globalThis.__getCurrentMesh=()=>currentMesh; globalThis.__validateMesh=validate;`,
    context,
    { filename: "app.js" },
  );

  vm.runInContext(fs.readFileSync(path.join(ROOT, "cad_plan_v2.js"), "utf8"), context, { filename: "cad_plan_v2.js" });
  assert.ok(context.window.AI3DPlanV2CAD?.apply, "CAD Plan v2 -rajapinta ei latautunut");
  return context;
}

function generate(runtime, plan) {
  runtime.window.AI3DPlanV2CAD.apply(plan);
  const mesh = runtime.__getCurrentMesh();
  assert.ok(mesh, "CAD Plan ei tuottanut meshiä");
  return mesh;
}

function pointInTriangle2D(p, a, b, c) {
  const area = (u, v, w) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  const d1 = area(p, a, b), d2 = area(p, b, c), d3 = area(p, c, a);
  const eps = 1e-8;
  const hasNeg = d1 < -eps || d2 < -eps || d3 < -eps;
  const hasPos = d1 > eps || d2 > eps || d3 > eps;
  return !(hasNeg && hasPos);
}

function assertHoleOpen(mesh, x, y, z) {
  const capTriangles = mesh.triangles.filter(t => t.every(p => Math.abs(p.z - z) < 1e-8));
  assert.ok(capTriangles.length > 0, `Tasopinnan z=${z} kolmioita ei löytynyt`);
  assert.equal(
    capTriangles.some(t => pointInTriangle2D({ x, y }, t[0], t[1], t[2])),
    false,
    `Reiän keskipiste ${x},${y} peittyi tasopinnalla z=${z}`,
  );
}

function assertHoleWall(mesh, x, y, radius, thickness) {
  const matches = new Set();
  for (const triangle of mesh.triangles) for (const p of triangle) {
    const r = Math.hypot(p.x - x, p.y - y);
    if (Math.abs(r - radius) < 1e-6 && (Math.abs(p.z) < 1e-8 || Math.abs(p.z - thickness) < 1e-8)) {
      matches.add(`${p.x.toFixed(6)}|${p.y.toFixed(6)}|${p.z.toFixed(6)}`);
    }
  }
  assert.ok(matches.size >= 32, `Reiän ${x},${y} sivuseinämän pisteitä löytyi liian vähän`);
}

function testFourOperationHoles(runtime) {
  const holes = [
    { type: "hole", x: -35, y: -15, diameter: 8 },
    { type: "hole", x: 35, y: -15, diameter: 8 },
    { type: "hole", x: -35, y: 15, diameter: 8 },
    { type: "hole", x: 35, y: 15, diameter: 8 },
  ];
  const mesh = generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 100, width: 60, thickness: 5, cornerRadius: 4 },
    operations: holes,
  });

  assert.equal(mesh.name, "kiinnikelevy");
  assert.equal(mesh.width, 100);
  assert.equal(mesh.depth, 60);
  assert.equal(mesh.height, 5);
  assert.equal(runtime.__validateMesh(mesh).ok, true, "Nelireikäisen levyn pitää olla suljettu manifold-mesh");

  for (const h of holes) {
    assertHoleOpen(mesh, h.x, h.y, 0);
    assertHoleOpen(mesh, h.x, h.y, 5);
    assertHoleWall(mesh, h.x, h.y, h.diameter / 2, 5);
  }
}

function testCenterHoleAndChamfer(runtime) {
  const mesh = generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 80, width: 50, thickness: 4, chamfer: 5, centerHole: 10 },
  });
  assert.equal(runtime.__validateMesh(mesh).ok, true, "Keskireikäisen viistelevyn pitää olla manifold-mesh");
  assertHoleOpen(mesh, 0, 0, 0);
  assertHoleOpen(mesh, 0, 0, 4);
  assertHoleWall(mesh, 0, 0, 5, 4);
}

function testSchemaV2HoleBounds(runtime) {
  const minHole = generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 20, width: 20, thickness: 2, centerHole: 0.2 },
  });
  assert.equal(runtime.__validateMesh(minHole).ok, true, "Schema v2:n 0,2 mm minimireiän pitää olla sallittu");

  const maxHole = generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 600, width: 600, thickness: 2, centerHole: 500 },
  });
  assert.equal(runtime.__validateMesh(maxHole).ok, true, "Schema v2:n 500 mm maksimireiän pitää olla sallittu");

  assert.throws(() => generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 20, width: 20, thickness: 2, centerHole: 0.19 },
  }), /0\.2…500 mm/,
  "CAD-ytimen pitää käyttää samaa 0,2 mm minimihalkaisijaa kuin Schema v2");

  assert.throws(() => generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 600, width: 600, thickness: 2, centerHole: 500.01 },
  }), /0\.2…500 mm/,
  "CAD-ytimen pitää käyttää samaa 500 mm maksimihalkaisijaa kuin Schema v2");

  assert.throws(() => generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 4500, width: 100, thickness: 2, holes: [{ x: 2000.01, y: 0, diameter: 2 }] },
  }), /-2000…2000 mm/,
  "CAD-ytimen pitää käyttää samaa ±2000 mm reikäkoordinaattirajaa kuin Schema v2");
}

function testInvalidHoleGeometry(runtime) {
  assert.throws(() => generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: {
      length: 60, width: 40, thickness: 4,
      holes: [{ x: 0, y: 0, diameter: 10 }, { x: 7, y: 0, diameter: 10 }],
    },
  }), /päällekkäin|liian lähellä/);

  assert.throws(() => generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 60, width: 40, thickness: 4, holes: [{ x: 27, y: 0, diameter: 8 }] },
  }), /liian lähellä levyn todellista reunaa/);

  assert.throws(() => generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 60, width: 40, thickness: 4, centerHole: 0 },
  }), /Keskireiän halkaisijan pitää olla/,
  "CAD Plan v2 -ydin ei saa ohittaa eksplisiittistä centerHole: 0 -arvoa");

  assert.throws(() => generate(runtime, {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: {
      length: 600, width: 600, thickness: 4, centerHole: 4,
      holes: Array.from({ length: 200 }, (_, i) => ({ x: -245 + (i % 20) * 25, y: -245 + Math.floor(i / 20) * 25, diameter: 2 })),
    },
  }), /enintään 200 reikää/,
  "eksplisiittinen keskireikä pitää laskea mukaan CAD-ytimen 200 reiän työmäärärajaan");
}

const runtime = makeRuntime();
testFourOperationHoles(runtime);
testCenterHoleAndChamfer(runtime);
testSchemaV2HoleBounds(runtime);
testInvalidHoleGeometry(runtime);

console.log("mounting plate regression: OK");
