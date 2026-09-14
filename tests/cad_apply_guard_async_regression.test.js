"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "cad_apply_guard.js"), "utf8");

async function main() {
  const status = { textContent: "Malli luotu ja tarkistettu." };
  const validation = { querySelector: () => null };
  const previewClears = [];
  let resolveApply;
  const window = {
    AI3D: { setPart() { return true; } },
    AI3DPlanV2CAD: {
      apply() {
        return new Promise(resolve => {
          resolveApply = () => {
            status.textContent = "STL-lataus estetty virheen vuoksi.";
            validation.querySelector = selector => selector === ".check.fail" ? {} : null;
            resolve({ ok: true });
          };
        });
      }
    },
    AI3DPreviewGuard: { clear(message) { previewClears.push(message); } }
  };
  const document = {
    readyState: "complete",
    getElementById(id) {
      if (id === "status") return status;
      if (id === "validation") return validation;
      return null;
    }
  };

  vm.runInNewContext(source, { window, document, Error, Object, String, Number, Array, Math, Promise });
  const applyPromise = window.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "adapter", parameters: {} });
  assert.ok(applyPromise && typeof applyPromise.then === "function", "guarded asynchronous CAD v2 apply must remain awaitable");
  resolveApply();
  await assert.rejects(applyPromise, /STL-lataus estetty/, "late CAD validation failure must reject the asynchronous apply");
  assert.deepStrictEqual(previewClears, ["STL-lataus estetty virheen vuoksi."], "late asynchronous CAD failure must clear stale preview/export state");

  const rejectionClears = [];
  const windowReject = {
    AI3D: { setPart() { return true; } },
    AI3DPlanV2CAD: { apply() { return Promise.reject(Error("Asynkroninen CAD v2 -virhe.")); } },
    AI3DPreviewGuard: { clear(message) { rejectionClears.push(message); } }
  };
  vm.runInNewContext(source, { window: windowReject, document, Error, Object, String, Number, Array, Math, Promise });
  await assert.rejects(windowReject.AI3DPlanV2CAD.apply({ schemaVersion: 2, partType: "adapter", parameters: {} }), /Asynkroninen CAD v2 -virhe/, "rejected CAD v2 promise must propagate to caller");
  assert.deepStrictEqual(rejectionClears, ["Asynkroninen CAD v2 -virhe."], "rejected CAD v2 promise must fail closed and clear stale preview state");

  console.log("CAD apply guard async regression: OK");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
