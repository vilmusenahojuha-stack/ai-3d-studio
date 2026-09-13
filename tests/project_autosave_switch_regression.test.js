"use strict";

const assert=require("assert");
const fs=require("fs");

const source=fs.readFileSync("projects.js","utf8");
const guard=fs.readFileSync("validated_autosave_guard.js","utf8");
const index=fs.readFileSync("index.html","utf8");

assert.match(source,/function flushAutosave\(\)\{if\(!autosaveTimer\)return true;clearTimeout\(autosaveTimer\);autosaveTimer=0;return autosave\(\)\}/,
  "pending autosave must be synchronously flushed and cleared before navigation");
assert.match(source,/function scheduleAutosave\(\)\{clearTimeout\(autosaveTimer\);autosaveTimer=setTimeout\(\(\)=>\{autosaveTimer=0;autosave\(\)\},250\)\}/,
  "completed autosave timer must not remain latched as pending");
assert.match(source,/function openProject\([^\n]+autosaveTimer&&!flushAutosave\(\)/,
  "project switching must flush pending edits first");
assert.match(source,/function openPlan\([^\n]+autosaveTimer&&!flushAutosave\(\)/,
  "plan-to-project switching must flush pending edits first");
assert.match(source,/function newProject\([^\n]+autosaveTimer&&!flushAutosave\(\)/,
  "new project creation must flush pending edits first");
assert.match(source,/function importProject\([^\n]+r\.onload=\(\)=>\{if\(autosaveTimer&&!flushAutosave\(\)\)/,
  "project import must flush pending edits before replacing the active project");
assert.match(source,/function downloadProject\([^\n]+autosaveTimer\?flushAutosave\(\):autosave\(\)/,
  "project export must not leave a stale delayed autosave behind");
assert.match(source,/window\.addEventListener\("pagehide",\(\)=>\{clearTimeout\(autosaveTimer\);autosaveTimer=0;autosave\(\)\}\)/,
  "pagehide must cancel the delayed timer and perform one final synchronous autosave");
assert.match(source,/const snapshot=snapshotValues\(type\),values=type===p\.type\?\{\.\.\.p\.values,\.\.\.snapshot\}:snapshot/,
  "changing the project part type must replace old-type values instead of carrying stale parameters into the new type");

assert.match(index,/validated_autosave_guard\.js\?v=1\.0/,
  "validated autosave retry guard must be loaded by the production UI");
assert.match(guard,/const NON_GEOMETRY=new Set\(\["material","filamentPriceKg","ledCost","powerCost","miscCost"\]\)/,
  "autosave retry guard must only latch geometry-affecting edits");
assert.match(guard,/function validationOk\(\)\{[^\n]*\.check\.ok[^\n]*\.check\.fail/,
  "retry must require a successful CAD validation and reject any remaining failure marker");
assert.match(guard,/material\.dispatchEvent\(new Event\("input",\{bubbles:true\}\)\)/,
  "successful regeneration must reuse the existing project autosave input path instead of writing project storage directly");
assert.match(guard,/verifyTimer=setTimeout\(\(\)=>\{if\(!verifySaved\(\)\)setWarning\(\)\},400\)/,
  "retry guard must verify that the existing autosave finished before releasing the pending edit");
assert.match(guard,/const NAV_SELECTOR='\[data-id\],\[data-plan\],#btnNewProject,#btnImportProject,#btnReloadPlans'/,
  "project/plan navigation and plan reload must stay blocked while a validated edit is still unsaved");
assert.match(guard,/document\.addEventListener\("click",blockNavigation,true\)/,
  "navigation protection must run in capture phase before existing project handlers can replace live CAD values");

console.log("Project autosave switch regression: OK");
