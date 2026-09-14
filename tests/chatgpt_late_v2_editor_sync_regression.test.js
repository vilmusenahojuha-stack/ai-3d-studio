"use strict";
const assert=require("assert");
const fs=require("fs");

const source=fs.readFileSync("plan_sync.js","utf8");
const load=source.indexOf("await loadV2Cad()");
const hook=source.indexOf("window.AI3DV2Editor?.ensurePlanSyncHook?.()",load);
const apply=source.indexOf("window.AI3DPlanV2CAD.apply(plan)",load);

assert.ok(load>=0,"ChatGPT v2 direct CAD path must still lazy-load the CAD v2 core");
assert.ok(hook>load,"late-loaded CAD v2 core must install the editor synchronization hook before direct ChatGPT apply");
assert.ok(apply>hook,"ChatGPT plan must reach CAD only after the editor synchronization hook has been restored");

console.log("ChatGPT late CAD v2 editor sync regression: OK");
