"use strict";

const assert=require("assert");
const fs=require("fs");

const editor=fs.readFileSync("cad_v2_editor.js","utf8");
const core=fs.readFileSync("cad_plan_v2.js","utf8");

const field=(id,min,max)=>{
  const re=new RegExp(`id="${id}"[^>]*min="${String(min).replace(".","\\.")}"[^>]*max="${String(max).replace(".","\\.")}"`);
  assert.match(editor,re,`${id} editor bounds must match CAD v2 core limits`);
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

assert.match(core,/length[^\n]*2[^\n]*2000|number\([^\n]*length[^\n]*2[^\n]*2000/i,
  "CAD v2 core must retain the adapter length boundary used by the editor");
assert.match(core,/insideDiameter[^\n]*1000|insideDiameter1[^\n]*1000/i,
  "CAD v2 core must retain the adapter inside-diameter ceiling used by the editor");
assert.match(core,/outsideDiameter[^\n]*1500/i,
  "CAD v2 core must retain the adapter outside-diameter ceiling used by the editor");
assert.match(core,/width[^\n]*2000|enclosure[^\n]*2000/i,
  "CAD v2 core must retain the enclosure dimension ceiling used by the editor");

console.log("CAD v2 editor bounds parity regression: OK");
