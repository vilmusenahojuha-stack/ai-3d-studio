"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "chatgpt_plan.schema.v2.json"), "utf8")
);

const adapterRule = (schema.allOf || []).find(
  rule => rule?.if?.properties?.partType?.const === "adapter"
);
assert(adapterRule, "Schema v2 must contain an adapter-specific rule");

const parameterRules = adapterRule.then?.properties?.parameters?.allOf;
assert(Array.isArray(parameterRules), "adapter parameters must contain allOf rules");

const outerRule = parameterRules.find(rule =>
  Array.isArray(rule?.anyOf) &&
  rule.anyOf.some(option => Array.isArray(option?.required) && option.required.includes("outsideDiameter"))
);
assert(outerRule, "adapter schema must define outer-diameter alternatives");

const alternatives = outerRule.anyOf.map(option => option.required || []);
const has = (...fields) => alternatives.some(required =>
  required.length === fields.length && fields.every(field => required.includes(field))
);

assert(has("wall"), "adapter may derive both outer diameters from wall");
assert(has("outsideDiameter"), "adapter may use one shared outsideDiameter");
assert(
  has("outsideDiameter1", "outsideDiameter2"),
  "adapter must require both end diameters when wall/shared outsideDiameter is absent"
);
assert(
  !has("outsideDiameter1") && !has("outsideDiameter2"),
  "schema must not accept a single end diameter because CAD cannot derive the other end without wall/shared diameter"
);

console.log("ChatGPT adapter schema outer pair regression: OK");
