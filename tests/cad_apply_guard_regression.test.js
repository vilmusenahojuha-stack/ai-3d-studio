"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "cad_apply_guard.js"), "utf8");

function runCase({ statusText = "Malli luotu ja tarkistettu.", failClass = false, loading = false } = {}) {
  const status = { textContent: statusText };
  const validation = { querySelector: selector => selector === ".check.fail" && failClass ? {} : null };
  let calls = 0;
  let domReady = null;
  const window = {
    AI3D: {
      setPart(type, values) {
        calls++;
        return { type, values };
      }
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

  vm.runInNewContext(source, { window, document, Error, Object });
  return { window, calls: () => calls, status, validation, fireReady: () => domReady?.() };
}

{
  const { window, calls } = runCase({});
  const result = window.AI3D.setPart("sleeve", { sleeveID: 20 });
  assert.strictEqual(calls(), 1, "valid programmatic CAD apply must call the original setPart once");
  assert.strictEqual(result.type, "sleeve", "valid apply must preserve the original return value");
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

console.log("CAD apply guard regression: OK");
