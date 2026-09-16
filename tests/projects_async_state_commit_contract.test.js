"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","projects.js"),"utf8");

// Contract for issue #188: every path that commits project state after CAD apply
// must be able to await the shared project-open guard. This test is intentionally
// source-level so it cannot accidentally execute browser storage/UI side effects.
assert(source.includes("AI3DProjectOpenGuard"),"projects.js must consume the shared project-open guard before async state commit");
assert(/async\s+function\s+applyProject\s*\(/.test(source),"applyProject must be async so Promise CAD can settle before state commit");
assert(/await\s+window\.AI3DProjectOpenGuard\.check\s*\(/.test(source),"applyProject must await AI3DProjectOpenGuard.check()");
for(const name of ["openProject","openPlan","loadPlans"]){
  assert(new RegExp(`async\\s+function\\s+${name}\\s*\\(`).test(source),`${name} must propagate the awaited CAD transaction`);
}
assert(/await\s+applyProject\s*\(p\)/.test(source),"project open/copy paths must await CAD before committing project state");
console.log("projects async state-commit contract: ok");
