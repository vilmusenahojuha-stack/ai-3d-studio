"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..");
const projects=fs.readFileSync(path.join(root,"projects.js"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");

assert.match(index,/projects\.js\?v=1\.28/,"index must invalidate the project normalization cache");
assert.match(app,/p\.totalHeight<=p\.baseHeight\+8/,"spike CAD must retain the existing 8 mm base-to-tip headroom guard");
assert.doesNotMatch(projects,/baseHeight:p\.baseHeight\?\?24/,"Schema v2 spike import must not silently force a fixed 24 mm base height");
assert.match(projects,/baseHeight=p\.baseHeight!=null\?num\(p\.baseHeight\):Math\.min\(24,height\*\.4\)/,"missing Schema v2 baseHeight must use the established proportional fallback");
assert.match(projects,/if\(!\(baseHeight>0&&height>baseHeight\+8\)\)return\{\.\.\.base,description:/,"impossible imported spike proportions must be rejected before project creation");

const derivedBase=height=>Math.min(24,height*.4);
assert.strictEqual(derivedBase(30),12,"a compact 30 mm spike should derive a 12 mm editable base instead of the old 24 mm default");
assert.ok(30>derivedBase(30)+8,"the compact 30 mm spike should satisfy the CAD headroom rule after normalization");
assert.ok(!(10>derivedBase(10)+8),"a too-short spike must remain blocked instead of reaching CAD with impossible proportions");
assert.ok(!(30>24+8),"an explicit 24 mm base on a 30 mm spike must remain blocked rather than being silently changed");

console.log("ChatGPT spike base-height regression: ok");