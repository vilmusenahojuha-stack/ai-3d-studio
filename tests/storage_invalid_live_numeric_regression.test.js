"use strict";

const assert=require("assert");
const fs=require("fs");

const source=fs.readFileSync("storage_commit_guard.js","utf8");

assert.match(source,/const INVALID_LIVE_WARNING=/,
  "storage guard must expose a dedicated warning for invalid live numeric CAD edits");
assert.match(source,/function hasInvalidLiveNumber\(\)\{[^\n]*e\?\.type==="number"&&!Number\.isFinite\(e\.valueAsNumber\)/,
  "storage guard must reject blank or invalid numeric controls before autosave can preserve stale values");
assert.match(source,/function blockingIssue\(\)\{[^\n]*if\(invalidLiveEdit\)return INVALID_LIVE_WARNING/,
  "a latched invalid numeric edit must block project storage commits and navigation saves");
assert.match(source,/function handleLiveEdit\(e\)\{[^\n]*invalidLiveEdit=hasInvalidLiveNumber\(\);if\(invalidLiveEdit\)\{clearTimeout\(editTimer\);warn\(INVALID_LIVE_WARNING\);return\}scheduleLiveVerify\(\)\}/,
  "invalid numeric input must latch synchronously instead of waiting for the delayed verification timer");
assert.match(source,/document\.addEventListener\("input",handleLiveEdit,true\);\s*document\.addEventListener\("change",handleLiveEdit,true\);/,
  "both live typing and committed control changes must use the synchronous invalid-value guard");
assert.match(source,/if\(requireLive\)\{invalidLiveEdit=hasInvalidLiveNumber\(\);if\(invalidLiveEdit\)\{warn\(INVALID_LIVE_WARNING\);return false\}\}/,
  "full live verification must keep invalid numeric edits fail-closed until corrected");

console.log("Storage invalid live numeric regression: OK");
