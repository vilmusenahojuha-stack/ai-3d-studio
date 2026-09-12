"use strict";

const assert=require("assert");
const fs=require("fs");

const source=fs.readFileSync("projects.js","utf8");

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

console.log("Project autosave switch regression: OK");
