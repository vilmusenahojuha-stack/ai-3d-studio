"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","projects.js"),"utf8");

// Issue #205: a failed open may start an async rollback. If a newer open claims
// ownership while that rollback awaits setPart(), the old rollback must not render
// stale project info/status after it completes.
const staleRe=/(?:operation|request)Token\s*!==\s*open(?:Operation|Request)Seq/i;

function checkRollback(body,label,restorePattern){
 const catchPos=body.indexOf("catch(e)");
 assert(catchPos>=0,`${label} catch path not found`);
 const catchBody=body.slice(catchPos);
 const restorePos=catchBody.search(restorePattern);
 assert(restorePos>=0,`${label} rollback restore not found`);
 const afterRestore=catchBody.slice(restorePos);
 const stalePos=afterRestore.search(staleRe);
 assert(stalePos>=0,
  `${label} must re-check operation ownership after async rollback restore`);
 const renderPos=afterRestore.search(/renderProjects\(\)|showInfo\(/);
 assert(renderPos<0||stalePos<renderPos,
  `${label} must reject stale rollback before rendering project UI`);
}

const openProject=source.match(/async function openProject\(id\)\{([\s\S]*?)\n function snapshotValues/);
assert(openProject,"openProject source not found");
checkRollback(openProject[1],"openProject",/await restoreProject\(previous\)/);

const openPlan=source.match(/async function openPlan\(id\)\{([\s\S]*?)\n function newProject/);
assert(openPlan,"openPlan source not found");
checkRollback(openPlan[1],"openPlan",/await restoreProject\(previous\)/);

console.log("project rollback ownership regression: ok");
