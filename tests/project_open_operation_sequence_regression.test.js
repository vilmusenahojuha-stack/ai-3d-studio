"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","projects.js"),"utf8");

// Issues #191/#196/#205: overlapping async project/plan/import opens must be owned by the latest request.
assert(/open(?:Operation|Request)Seq/.test(source),"projects.js must keep a monotonic open-operation sequence");
const claims=source.match(/\+\+open(?:Operation|Request)Seq/g)||[];
assert(claims.length>=3,"openProject, openPlan and importProject must each claim a new operation token");
const staleRe=/(?:operation|request)Token\s*!==\s*open(?:Operation|Request)Seq/i;

function checkOpen(body,label){
 assert(/await applyProject\(p\)/.test(body),`${label} must still await CAD validation`);
 const awaitPos=body.indexOf("await applyProject(p)");
 const afterAwait=body.slice(awaitPos+"await applyProject(p)".length);
 assert(staleRe.test(afterAwait),`${label} must reject stale completion after CAD validation and before state commit`);
 const catchPos=body.indexOf("catch(e)");
 assert(catchPos>=0,`${label} catch path not found`);
 assert(staleRe.test(body.slice(catchPos)),`${label} catch path must reject stale rollback/error UI`);
}
function checkRollback(body,label){
 const catchPos=body.indexOf("catch(e)");
 const catchBody=body.slice(catchPos);
 const restorePos=catchBody.indexOf("await restoreProject(previous)");
 assert(restorePos>=0,`${label} rollback restore not found`);
 const afterRestore=catchBody.slice(restorePos+"await restoreProject(previous)".length);
 const stalePos=afterRestore.search(staleRe);
 assert(stalePos>=0,`${label} must re-check ownership after async rollback restore`);
 const renderPos=afterRestore.search(/renderProjects\(\)|showInfo\(/);
 assert(renderPos<0||stalePos<renderPos,`${label} must reject stale rollback before rendering project UI`);
}

const openProject=source.match(/async function openProject\(id\)\{([\s\S]*?)\n function snapshotValues/);
assert(openProject,"openProject source not found");
checkOpen(openProject[1],"openProject");
checkRollback(openProject[1],"openProject");

const openPlan=source.match(/async function openPlan\(id\)\{([\s\S]*?)\n function newProject/);
assert(openPlan,"openPlan source not found");
checkOpen(openPlan[1],"openPlan");
checkRollback(openPlan[1],"openPlan");

const importProject=source.match(/function importProject\(file\)\{([\s\S]*?)\n function injectTools/);
assert(importProject,"importProject source not found");
const importBody=importProject[1];
const claimPos=importBody.search(/(?:operation|request)Token\s*=\s*\+\+open(?:Operation|Request)Seq/i);
const readerPos=importBody.indexOf("new FileReader()");
assert(claimPos>=0,"importProject must claim an operation token");
assert(readerPos>=0,"importProject FileReader setup not found");
assert(claimPos<readerPos,"importProject must claim ownership before asynchronous FileReader work starts");
const onloadStart=importBody.match(/r\.onload\s*=\s*async\(\)\s*=>\s*\{([\s\S]*?)await applyProject\(p\)/);
assert(onloadStart,"importProject FileReader onload handler not found");
const onloadPrefix=onloadStart[1];
const stalePos=onloadPrefix.search(staleRe);
const autosavePos=onloadPrefix.search(/autosaveTimer|flushAutosave\(/);
assert(stalePos>=0,"importProject must reject a stale FileReader completion before CAD validation/state mutation");
assert(autosavePos<0||stalePos<autosavePos,"importProject must reject stale FileReader completion before autosave flushing can mutate the current project");
checkOpen(importBody,"importProject");
const readerError=importBody.match(/r\.onerror\s*=\s*\(\)\s*=>\s*([^;]+);/);
assert(readerError,"importProject FileReader error handler not found");
assert(staleRe.test(readerError[1]),"importProject FileReader error handler must ignore stale read failures");

console.log("project open operation-sequence regression: ok");
