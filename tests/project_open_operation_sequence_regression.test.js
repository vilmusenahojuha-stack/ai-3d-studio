"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","projects.js"),"utf8");

// Issues #191/#196: overlapping async project/plan/import opens must be owned by the latest request.
// Keep this as a structural regression lock: production behavior is implemented separately.
assert(/open(?:Operation|Request)Seq/.test(source),"projects.js must keep a monotonic open-operation sequence");
const claims=source.match(/\+\+open(?:Operation|Request)Seq/g)||[];
assert(claims.length>=3,"openProject, openPlan and importProject must each claim a new operation token");

function checkOpen(body,label){
 assert(/await applyProject\(p\)/.test(body),`${label} must still await CAD validation`);
 const awaitPos=body.indexOf("await applyProject(p)");
 const staleRe=/(?:operation|request)Token\s*!==\s*open(?:Operation|Request)Seq/i;
 const afterAwait=body.slice(awaitPos+"await applyProject(p)".length);
 assert(staleRe.test(afterAwait),`${label} must reject stale completion after CAD validation and before state commit`);
 const catchPos=body.indexOf("catch(e)");
 assert(catchPos>=0,`${label} catch path not found`);
 assert(staleRe.test(body.slice(catchPos)),`${label} catch path must reject stale rollback/error UI`);
}

const openProject=source.match(/async function openProject\(id\)\{([\s\S]*?)\n function snapshotValues/);
assert(openProject,"openProject source not found");
checkOpen(openProject[1],"openProject");

const openPlan=source.match(/async function openPlan\(id\)\{([\s\S]*?)\n function newProject/);
assert(openPlan,"openPlan source not found");
checkOpen(openPlan[1],"openPlan");

const importProject=source.match(/function importProject\(file\)\{([\s\S]*?)\n function injectTools/);
assert(importProject,"importProject source not found");
checkOpen(importProject[1],"importProject");

console.log("project open operation-sequence regression: ok");
