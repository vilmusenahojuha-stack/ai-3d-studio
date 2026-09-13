"use strict";

const assert=require("assert");
const fs=require("fs");

const editor=fs.readFileSync("cad_v2_editor.js","utf8");
const plans=fs.readFileSync("plan_sync.js","utf8");

const field=(id,min,max)=>{
  const re=new RegExp(`id="${id}"[^>]*min="${String(min).replace(".","\\.")}"[^>]*max="${String(max).replace(".","\\.")}"`);
  assert.match(editor,re,`${id} editor bounds must match ChatGPT plan validation limits`);
};

field("adapterLength",2,2000);
field("adapterID1",1,1000);
field("adapterID2",1,1000);
field("adapterOD1",1,1500);
field("adapterOD2",1,1500);
field("enclosureW",5,2000);
field("enclosureD",5,2000);
field("enclosureH",5,2000);
field("enclosureWall",0.8,200);
field("enclosureFloor",0.8,200);

assert.match(plans,/if\(!n\(p\.length,2,2000\)\)/,
  "ChatGPT plan validation must retain the adapter length range used by the editor");
assert.match(plans,/if\(!n\(i1,1,1000\)\|\|!n\(i2,1,1000\)\)/,
  "ChatGPT plan validation must retain the adapter inside-diameter range used by the editor");
assert.match(plans,/!n\(value,1,1500\)/,
  "ChatGPT plan validation must retain the adapter outside-diameter range used by the editor");
assert.match(plans,/if\(!n\(W,5,2000\)\|\|!n\(D,5,2000\)\|\|!n\(H,5,2000\)\)/,
  "ChatGPT plan validation must retain the enclosure dimension range used by the editor");
assert.match(plans,/if\(!n\(wall,\.8,200\)\)/,
  "ChatGPT plan validation must retain the enclosure wall range used by the editor");
assert.match(plans,/if\(!n\(floor,\.8,200\)\)/,
  "ChatGPT plan validation must retain the enclosure floor range used by the editor");

console.log("CAD v2 editor / ChatGPT plan bounds parity regression: OK");
