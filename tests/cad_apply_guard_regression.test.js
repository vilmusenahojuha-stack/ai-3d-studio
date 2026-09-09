"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "cad_apply_guard.js"), "utf8");

function runCase({ statusText = "Malli luotu ja tarkistettu.", failClass = false, loading = false, throwSetPart = false } = {}) {
  const status = { textContent: statusText };
  const validation = { querySelector: selector => selector === ".check.fail" && failClass ? {} : null };
  let calls = 0;
  let domReady = null;
  const previewClears = [];
  const window = {
    AI3D: {
      setPart(type, values) {
        calls++;
        if (throwSetPart) throw Error("Alkuperäinen CAD-generointi kaatui.");
        return { type, values };
      }
    },
    AI3DPreviewGuard: {
      clear(message) { previewClears.push(message); }
    }
  };
  const document = {
    readyState: loading ? "loading" : "complete",
    getElementById(id) {
      if (id === "status") return status;
      if (id === "validation") return validation;
      return null;
    },
    addEventListener(type, fn) {
      if (type === "DOMContentLoaded") domReady = fn;
    }
  };

  vm.runInNewContext(source, { window, document, Error, Object, String, Number, Array, Math });
  return { window, calls: () => calls, status, validation, previewClears, fireReady: () => domReady?.() };
}

{
  const { window, calls } = runCase({});
  const result = window.AI3D.setPart("sleeve", { sleeveID: 20 });
  assert.strictEqual(calls(), 1, "valid programmatic CAD apply must call the original setPart once");
  assert.strictEqual(result.type, "sleeve", "valid apply must preserve the original return value");
}

{
  const { window, calls, previewClears } = runCase({ throwSetPart: true });
  assert.throws(
    () => window.AI3D.setPart("adapter", {}),
    /Alkuperäinen CAD-generointi kaatui/,
    "an exception thrown before CAD status updates must still reach the caller"
  );
  assert.strictEqual(calls(), 1, "throwing apply must call the original setPart exactly once");
  assert.deepStrictEqual(previewClears, ["Alkuperäinen CAD-generointi kaatui."], "throwing programmatic apply must clear stale preview state");
}

{
  const { window, calls } = runCase({ statusText: "Virhe: Tarkista piikkimutterin mitat." });
  assert.throws(
    () => window.AI3D.setPart("spike", { wall: 0.8, totalHeight: 10 }),
    /Tarkista piikkimutterin mitat/,
    "programmatic apply must surface a CAD generation failure to ChatGPT/project callers"
  );
  assert.strictEqual(calls(), 1, "failing apply must still call the original setPart exactly once");
}

{
  const { window } = runCase({ statusText: "STL-lataus estetty virheen vuoksi.", failClass: true });
  assert.throws(
    () => window.AI3D.setPart("plug", {}),
    /STL-lataus estetty/,
    "failed mesh validation must not be reported as a successful programmatic apply"
  );
}

{
  const ctx = runCase({ loading: true });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = {
    apply(plan) {
      v2Calls++;
      return { plan };
    }
  };
  ctx.fireReady();
  const result = ctx.window.AI3DPlanV2CAD.apply({ partType: "adapter" });
  assert.strictEqual(v2Calls, 1, "valid CAD v2 apply must call the original apply once");
  assert.strictEqual(result.plan.partType, "adapter", "valid CAD v2 apply must preserve its return value");
  assert.strictEqual(ctx.window.AI3DPlanV2CAD.__applyGuard, true, "CAD v2 API must be guarded after it has loaded");
}

{
  const ctx = runCase({ loading: true });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = {
    apply() {
      v2Calls++;
      throw Error("CAD v2 -generaattori kaatui ennen validointitilaa.");
    }
  };
  ctx.fireReady();
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ partType: "enclosure" }),
    /CAD v2 -generaattori kaatui/,
    "a thrown CAD v2 exception must still reach the caller"
  );
  assert.strictEqual(v2Calls, 1, "throwing CAD v2 apply must call the original implementation exactly once");
  assert.deepStrictEqual(ctx.previewClears, ["CAD v2 -generaattori kaatui ennen validointitilaa."], "throwing CAD v2 apply must clear stale preview state");
}

{
  const ctx = runCase({ loading: true });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = {
    apply() {
      v2Calls++;
      ctx.status.textContent = "STL-lataus estetty virheen vuoksi.";
      ctx.validation.querySelector = selector => selector === ".check.fail" ? {} : null;
      return undefined;
    }
  };
  ctx.fireReady();
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ partType: "mountingPlate" }),
    /STL-lataus estetty/,
    "failed CAD v2 mesh validation must be surfaced instead of reported as a successful ChatGPT apply"
  );
  assert.strictEqual(v2Calls, 1, "failing CAD v2 apply must still call the original apply exactly once");
}

{
  const ctx = runCase({ loading: false });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = {
    apply() {
      v2Calls++;
      ctx.status.textContent = "STL-lataus estetty virheen vuoksi.";
      ctx.validation.querySelector = selector => selector === ".check.fail" ? {} : null;
      return undefined;
    }
  };
  assert.strictEqual(ctx.window.AI3DPlanV2CAD.__applyGuard, true, "CAD v2 API assigned after DOMContentLoaded must be guarded immediately");
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ partType: "adapter" }),
    /STL-lataus estetty/,
    "late runtime CAD v2 recovery must retain programmatic failure propagation"
  );
  assert.strictEqual(v2Calls, 1, "late-loaded failing CAD v2 apply must call the recovered implementation exactly once");
}

{
  const ctx = runCase({ loading: false });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = { apply(plan) { v2Calls++; return { plan }; } };
  const atBoundary = {
    schemaVersion: 2,
    partType: "mountingPlate",
    parameters: { length: 5000, width: 5000, thickness: 4, holes: [{ x: 2000, y: -2000, diameter: 500 }] },
    operations: [{ type: "hole", x: 0, y: 0, diameter: 0.2 }]
  };
  const result = ctx.window.AI3DPlanV2CAD.apply(atBoundary);
  assert.strictEqual(v2Calls, 1, "schema boundary-sized holes must still reach CAD v2");
  assert.strictEqual(result.plan, atBoundary, "valid boundary plan must preserve the original plan reference");
}

{
  const ctx = runCase({ loading: false });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = { apply() { v2Calls++; return {}; } };
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "mountingPlate", parameters: { holes: [{ x: 2000.01, y: 0, diameter: 6 }] } }),
    /-2000…2000 mm/,
    "CAD apply guard must reject a hole coordinate outside the ChatGPT schema before geometry generation"
  );
  assert.strictEqual(v2Calls, 0, "out-of-schema hole coordinates must not reach CAD v2");
  assert.ok(ctx.previewClears.length >= 1, "rejected hole coordinates must clear stale preview/export state");
}

{
  const ctx = runCase({ loading: false });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = { apply() { v2Calls++; return {}; } };
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "mountingPlate", parameters: { centerHole: { diameter: 500.01 } } }),
    /0\.2…500 mm/,
    "CAD apply guard must reject an oversized center hole before geometry generation"
  );
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "mountingPlate", parameters: {}, operations: [{ type: "holes", holes: [{ x: 0, y: 0, diameter: 0.19 }] }] }),
    /0\.2…500 mm/,
    "CAD apply guard must reject an undersized operation hole before geometry generation"
  );
  assert.strictEqual(v2Calls, 0, "out-of-schema hole diameters must not reach CAD v2");
}

{
  const ctx = runCase({ loading: false });
  let v2Calls = 0;
  ctx.window.AI3DPlanV2CAD = { apply() { v2Calls++; return {}; } };
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "mountingPlate", parameters: { holes: { x: 0, y: 0, diameter: 6 } } }),
    /parameters\.holes: reikien pitää olla taulukko/,
    "malformed parameter hole containers must fail closed instead of being silently ignored"
  );
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "mountingPlate", parameters: {}, operations: { type: "hole", x: 0, y: 0, diameter: 6 } }),
    /operations: CAD-operaatioiden pitää olla taulukko/,
    "malformed operation containers must fail closed instead of being silently ignored"
  );
  assert.throws(
    () => ctx.window.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "mountingPlate", parameters: {}, operations: [{ type: "holes", holes: { x: 0, y: 0, diameter: 6 } }] }),
    /holes-operaation reikien pitää olla taulukko/,
    "malformed holes operations must fail closed instead of being silently ignored"
  );
  assert.strictEqual(v2Calls, 0, "malformed hole containers must never reach CAD v2 geometry generation");
  assert.ok(ctx.previewClears.length >= 3, "each malformed plan rejection must clear stale preview/export state");
}

console.log("CAD apply guard regression: OK");
