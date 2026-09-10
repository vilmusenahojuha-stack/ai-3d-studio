"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "plan_sync.js"), "utf8");
const projectsSource = fs.readFileSync(path.join(__dirname, "..", "projects.js"), "utf8");

assert(source.includes("fetchSeq=0,fetchAbort=null"), "ChatGPT fetch path must track the newest request");
assert(source.includes("const seq=++fetchSeq"), "each plan fetch must receive a monotonic request token");
assert(source.includes("fetchAbort?.abort?.()"), "a newer plan fetch must cancel the previous in-flight request when supported");
assert(source.includes("if(seq!==fetchSeq)return"), "stale plan responses must be ignored before they can replace pending plan state");
assert(source.includes('e?.name==="AbortError"'), "intentional request cancellation must not surface as a user-facing fetch error");
assert(source.includes("PLAN_MAX_BYTES=262144"), "ChatGPT plan responses must have a bounded size");
assert(source.includes('res.headers?.get?.("content-length")'), "declared oversized responses must be rejected before parsing");
assert(source.includes("function byteLength(v)"), "plan size fallback must measure encoded bytes, not JavaScript character count");
assert(source.includes("new TextEncoder().encode(String(v)).byteLength"), "UTF-8 byte measurement must use TextEncoder when available");
assert(source.includes("new Blob([String(v)]).size"), "UTF-8 byte measurement must retain a browser fallback");
assert(source.includes("byteLength(text)>PLAN_MAX_BYTES"), "responses without a usable content-length must still be byte-size checked");
assert(!source.includes("text.length>PLAN_MAX_BYTES"), "multibyte plan content must not be checked by UTF-16 character count");
assert(source.includes("JSON.parse(text)"), "plan JSON parsing must be explicit so malformed JSON gets a controlled error");
assert(source.includes("Suunnitelmatiedosto ei ole kelvollista JSON-dataa."), "malformed ChatGPT plan JSON must produce a clear Finnish error");
assert(source.includes("async function fetchPlan(){if(applying)return;"), "a new ChatGPT fetch must not start while an approved plan is still being applied");
assert(source.includes('fp=$("btnFetchChatGPTPlan")'), "the apply path must track the fetch button during asynchronous CAD loading");
assert(source.includes("if(fp)fp.disabled=true"), "ChatGPT fetch button must be visibly disabled while a plan is being applied");
assert(source.includes("if(fp)fp.disabled=false"), "ChatGPT fetch button must be restored after apply success or failure");

assert(projectsSource.includes("PLAN_MAX_BYTES=262144"), "production project plan loader must enforce the same ChatGPT plan size limit");
assert(projectsSource.includes('r.headers?.get?.("content-length")'), "production loader must reject declared oversized ChatGPT plans before reading the body");
assert(projectsSource.includes("const text=await r.text()"), "production loader must read ChatGPT plan text explicitly before parsing");
assert(projectsSource.includes("byteLength(text)>PLAN_MAX_BYTES"), "production loader must byte-check responses even without a usable content-length");
assert(projectsSource.includes("JSON.parse(text)"), "production loader must parse ChatGPT plan JSON inside its controlled error path");
assert(projectsSource.includes("suunnitelmatiedosto ei ole kelvollista JSON-dataa"), "production loader must surface malformed ChatGPT plan JSON as a controlled Finnish status error");
assert(!projectsSource.includes("normalizeChatGPT(await r.json())"), "production ChatGPT plan loader must not bypass the size guard with response.json()");

const sample = "ä".repeat(140000);
assert(sample.length < 262144, "test fixture should stay below the old character limit");
assert(Buffer.byteLength(sample, "utf8") > 262144, "test fixture must exceed the intended byte limit in UTF-8");

console.log("ChatGPT fetch race regression: OK");
