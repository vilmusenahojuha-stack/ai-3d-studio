"use strict";
const fs=require("fs");
const assert=require("assert");

const orientation=fs.readFileSync("centauri_orientation.js","utf8");
const index=fs.readFileSync("index.html","utf8");

function versionFrom(text,file){
  const m=text.match(new RegExp(file.replace(".","\\.")+"\\?v=([0-9.]+)"));
  assert(m,`Puuttuva ${file} versionumero`);
  return m[1];
}

for(const file of ["plan_preflight.js","plan_operation_guard.js","preview_guard.js"]){
  assert.strictEqual(
    versionFrom(orientation,file),
    versionFrom(index,file),
    `${file} fallback-version pitää olla sama kuin tuotantolatauksessa`
  );
}

assert.strictEqual(versionFrom(index,"centauri_orientation.js"),"1.10","Centauri orientation cache-version pitää nostaa muutoksen mukana");
console.log("centauri orientation dependency sync regression: ok");