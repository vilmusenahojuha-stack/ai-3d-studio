"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");

const schema=JSON.parse(fs.readFileSync(path.join(__dirname,"..","chatgpt_plan.schema.v2.json"),"utf8"));
const op=schema.properties.operations.items.properties;
const plate=schema.allOf.find(rule=>rule.if?.properties?.partType?.const==="mountingPlate")?.then?.properties?.parameters?.properties;
const hole=schema.$defs.hole.properties;
const diameter=schema.$defs.holeDiameter;

assert.deepStrictEqual([op.x.minimum,op.x.maximum],[-2000,2000],"operation hole x bounds must match runtime");
assert.deepStrictEqual([op.y.minimum,op.y.maximum],[-2000,2000],"operation hole y bounds must match runtime");
assert.strictEqual(op.diameter.$ref,"#/$defs/holeDiameter","operation hole diameter must use runtime-sized definition");
assert.deepStrictEqual([hole.x.minimum,hole.x.maximum],[-2000,2000],"parameter hole x bounds must match runtime");
assert.deepStrictEqual([hole.y.minimum,hole.y.maximum],[-2000,2000],"parameter hole y bounds must match runtime");
assert.strictEqual(hole.diameter.$ref,"#/$defs/holeDiameter","parameter hole diameter must use runtime-sized definition");
assert.deepStrictEqual([diameter.minimum,diameter.maximum],[0.2,500],"hole diameter bounds must match runtime");
assert.strictEqual(plate.centerHole.oneOf[0].$ref,"#/$defs/holeDiameter","numeric center hole must use runtime-sized definition");
assert.strictEqual(plate.centerHole.oneOf[1].properties.diameter.$ref,"#/$defs/holeDiameter","object center hole must use runtime-sized definition");

console.log("ChatGPT schema hole bounds regression: OK");
