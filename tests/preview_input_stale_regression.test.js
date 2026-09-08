"use strict";
const fs=require("fs");
const assert=require("assert");
const src=fs.readFileSync(require("path").join(__dirname,"..","preview_guard.js"),"utf8");

assert(src.includes('document.addEventListener?.("input",geometryInputChanged,true)'),"geometry input edits must invalidate an approved preview immediately");
assert(src.includes('document.addEventListener?.("change",geometryInputChanged,true)'),"select/change edits must invalidate an approved preview");
assert(src.includes('target?.closest?.(".part-fields")'),"invalidation must stay scoped to part parameter fields");
assert(src.includes('NON_GEOMETRY_PART_FIELDS.has(target.id)'),"cost-only light-sign fields must not invalidate geometry");
assert(src.includes('currentMesh||currentFitMesh'),"parameter edits should only clear an existing generated mesh");
assert(src.includes("Luo ja tarkista 3D-malli uudelleen ennen STL-vientiä"),"stale preview must explain why STL export was disabled");
console.log("preview input stale regression OK");
