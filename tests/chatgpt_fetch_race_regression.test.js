"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "plan_sync.js"), "utf8");

assert(source.includes("fetchSeq=0,fetchAbort=null"), "ChatGPT fetch path must track the newest request");
assert(source.includes("const seq=++fetchSeq"), "each plan fetch must receive a monotonic request token");
assert(source.includes("fetchAbort?.abort?.()"), "a newer plan fetch must cancel the previous in-flight request when supported");
assert(source.includes("if(seq!==fetchSeq)return"), "stale plan responses must be ignored before they can replace pending plan state");
assert(source.includes('e?.name==="AbortError"'), "intentional request cancellation must not surface as a user-facing fetch error");
assert(source.includes("PLAN_MAX_BYTES=262144"), "ChatGPT plan responses must have a bounded size");
assert(source.includes('res.headers?.get?.("content-length")'), "declared oversized responses must be rejected before parsing");
assert(source.includes("text.length>PLAN_MAX_BYTES"), "responses without a usable content-length must still be size checked");
assert(source.includes("JSON.parse(text)"), "plan JSON parsing must be explicit so malformed JSON gets a controlled error");
assert(source.includes("Suunnitelmatiedosto ei ole kelvollista JSON-dataa."), "malformed ChatGPT plan JSON must produce a clear Finnish error");

console.log("ChatGPT fetch race regression: OK");
