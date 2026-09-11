"use strict";
const assert=require("assert");
const fs=require("fs");

const html=fs.readFileSync("index.html","utf8");
const projectsSource=fs.readFileSync("projects.js","utf8");
const plateCustom=fs.readFileSync("plate_custom.js","utf8");
const runtime=fs.readFileSync("runtime_health_guard.js","utf8");
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const indexOf=prefix=>scripts.findIndex(src=>src.startsWith(prefix));

const app=indexOf("app.js?");
const earcut=scripts.findIndex(src=>src.includes("earcut@2.2.4"));
const parametric=indexOf("parametric_parts.js?v=1.9");
const customPlate=indexOf("plate_custom.js?v=1.8");
const projects=indexOf("projects.js?");
const health=indexOf("runtime_health_guard.js?");

assert.ok(app>=0,"app.js must be present");
assert.ok(earcut>=0,"earcut must be present");
assert.ok(parametric>=0,"parametric_parts.js must be part of the primary startup path");
assert.ok(customPlate>=0,"plate_custom.js must be part of the primary startup path");
assert.ok(projects>=0&&health>=0,"projects and runtime health guard must be present");
assert.ok(app<parametric,"parametric parts need the base CAD globals from app.js first");
assert.ok(earcut<customPlate,"custom plate support needs earcut loaded first");
assert.ok(parametric<projects&&customPlate<projects,"parametric CAD UI must exist before projects are restored or ChatGPT plans are opened");
assert.ok(parametric<health&&customPlate<health,"runtime recovery must remain a fallback, not the normal loader");
assert.ok(plateCustom.includes("window.AI3DPlateCustom={ready:true}"),"custom plate module must expose an explicit runtime-ready marker");
assert.ok(runtime.includes('window.AI3DPlateCustom?.ready===true'),"runtime health must require the custom plate module itself, not only its UI fields");
assert.ok(runtime.includes('"plate_custom.js?v=1.8"'),"runtime fallback must stay pinned to the primary custom plate version");
assert.ok(projectsSource.includes('loadAddon("parametric_parts.js?v=1.9"'),"project startup fallback must use the primary parametric version");
assert.ok(projectsSource.includes('loadAddon("plate_custom.js?v=1.8"'),"project startup fallback must use the primary custom plate version");
assert.ok(projectsSource.includes('()=>typeof window.AI3DParametric?.generate==="function"'),"project startup must skip duplicate parametric loading when the primary module is already ready");
assert.ok(projectsSource.includes('()=>window.AI3DPlateCustom?.ready===true'),"project startup must skip duplicate custom plate loading when the primary module is already ready");
assert.ok(!projectsSource.includes('plate_custom.js?v=1.7'),"project startup must not retain the stale custom plate cache key");

console.log("primary parametric load regression: OK");
