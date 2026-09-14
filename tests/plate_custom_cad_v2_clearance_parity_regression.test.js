"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("plate_custom.js","utf8");
const elements=new Map();
const set=(id,value)=>elements.set(id,{value:String(value)});
set("plateL",60);
set("plateW",40);
set("plateT",4);
set("plateHolePattern","custom");
set("plateCornerStyle","square");
set("plateCornerSize",0);
set("plateCustomHoles","");

const context=vm.createContext({
  console,Math,Number,Array,Object,String,Boolean,Error,Set,
  window:{},
  document:{getElementById:id=>elements.get(id)||null},
  buildPlate(){return{legacy:true}},
  v:(x,y,z)=>({x,y,z}),
  tri:(a,b,c)=>[a,b,c],
  bridge(){},
  earcut(){return[]},
  currentFitMesh:null
});
vm.runInContext(source,context,{filename:"plate_custom.js"});

function build(lines){
  elements.get("plateCustomHoles").value=lines;
  return context.buildPlate();
}

assert.doesNotThrow(()=>build("25.5;0;8"),
  "editable mounting plate must keep the CAD v2 0.4 mm edge clearance after ChatGPT import");
assert.throws(()=>build("25.7;0;8"),/liian lähellä levyn todellista reunaa/,
  "editable mounting plate must still reject a hole inside the CAD v2 0.4 mm edge clearance");

assert.doesNotThrow(()=>build("-5.25;0;10\n5.25;0;10"),
  "editable mounting plate must accept CAD v2-valid holes with more than 0.4 mm gap");
assert.throws(()=>build("-5.15;0;10\n5.15;0;10"),/liian lähellä toisiaan/,
  "editable mounting plate must still reject holes with less than the CAD v2 0.4 mm gap");

console.log("editable plate CAD v2 clearance parity regression: OK");
