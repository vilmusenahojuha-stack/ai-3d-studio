"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","projects.js"),"utf8");

// Issue #191: overlapping async project/plan opens must be owned by the latest request.
// This contract deliberately fails until projects.js has an operation sequence/token guard.
assert(/open(?:Operation|Request)Seq/.test(source),"projects.js must keep a monotonic open-operation sequence");
assert(/\+\+open(?:Operation|Request)Seq/.test(source),"each project/plan open must claim a new operation token");
assert(/(?:operation|request)Token\s*!==\s*open(?:Operation|Request)Seq/i.test(source),"stale opens must be detected before commit/rollback");

const openProject=source.match(/async function openProject\(id\)\{([\s\S]*?)\n function snapshotValues/);
assert(openProject,"openProject source not found");
assert(/await applyProject\(p\)/.test(openProject[1]),"openProject must still await CAD validation");
assert(/(?:operation|request)Token\s*!==\s*open(?:Operation|Request)Seq/i.test(openProject[1]),"openProject must reject stale completion before state commit/rollback");

const openPlan=source.match(/async function openPlan\(id\)\{([\s\S]*?)\n function newProject/);
assert(openPlan,"openPlan source not found");
assert(/await applyProject\(p\)/.test(openPlan[1]),"openPlan must still await CAD validation");
assert(/(?:operation|request)Token\s*!==\s*open(?:Operation|Request)Seq/i.test(openPlan[1]),"openPlan must reject stale completion before state commit/rollback");

console.log("project open operation-sequence regression: ok");
