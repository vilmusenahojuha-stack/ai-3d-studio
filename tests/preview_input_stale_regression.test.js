"use strict";
const fs=require("fs");
const assert=require("assert");
const src=fs.readFileSync(require("path").join(__dirname,"..","preview_guard.js"),"utf8");

assert(src.includes('document.addEventListener?.("input",geometryInputChanged,true)'),"geometry input edits must invalidate an approved preview immediately");
assert(src.includes('document.addEventListener?.("change",geometryInputChanged,true)'),"select/change edits must invalidate an approved preview");
assert(src.includes('target?.id==="partType"||target?.closest?.(".part-fields")'),"part type changes and part parameter fields must both invalidate stale geometry");
assert(src.includes('new Set(["material","filamentPriceKg","ledCost","powerCost","miscCost"])'),"material and cost-only fields must not invalidate unchanged geometry");
assert(src.includes('NON_GEOMETRY_PART_FIELDS.has(target.id)'),"non-geometry part fields must bypass stale geometry invalidation");
assert(src.includes('currentMesh||currentFitMesh'),"parameter edits should only clear an existing generated mesh");
assert(src.includes("Mallin mittoja tai osatyyppiä muutettiin"),"stale preview must explain that geometry or part type changed");
assert(src.includes("Luo ja tarkista 3D-malli uudelleen ennen STL-vientiä"),"stale preview must explain why STL export was disabled");
console.log("preview input stale regression OK");
