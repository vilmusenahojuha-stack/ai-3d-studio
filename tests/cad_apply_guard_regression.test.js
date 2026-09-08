"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "cad_apply_guard.js"), "utf8");

function runCase({ statusText = "Malli luotu ja tarkistettu.", failClass = false }) {
  const status = { textContent: statusText };
  const validation = { querySelector: selector => selector === ".check.fail" && failClass ? {} : null };
  let calls = 0;
  const window = {
    AI3D: {
      setPart(type, values) {
        calls++;
        return { type, values };
      }
    }
  };
  const document = {
    getElementById(id) {
      if (id === "status") return status;
      if (id === "validation") return validation;
      return null;
    }
  };

  vm.runInNewContext(source, { window, document, Error, Object });
  return { window, calls: () => calls };
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

console.log("CAD apply guard regression: OK");
