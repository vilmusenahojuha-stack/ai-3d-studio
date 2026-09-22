const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('project_tools.js', 'utf8');
const start = src.indexOf('function importAll(file)');
const end = src.indexOf('\n function storage()', start);
assert(start >= 0 && end > start, 'importAll() must exist');
const fn = src.slice(start, end);

const readerAt = fn.indexOf('new FileReader()');
const readAt = fn.indexOf('r.readAsText(file)');
const confirmAt = fn.indexOf('confirm(');
assert(readerAt >= 0 && readAt > readerAt && confirmAt > readerAt, 'importAll() async flow changed unexpectedly');

// Import must snapshot both pieces of local project ownership before FileReader starts.
const beforeReader = fn.slice(0, readerAt);
assert(/localStorage\.getItem\(KEY\)/.test(beforeReader), 'backup import must snapshot project storage before FileReader starts');
assert(/localStorage\.getItem\(KEY\+":active"\)/.test(beforeReader), 'backup import must snapshot active project before FileReader starts');

// The async callback must compare current ownership with the snapshots before asking
// for confirmation or writing imported projects. This prevents a late FileReader
// callback from replacing newer same-tab/autosave state.
const callbackBeforeConfirm = fn.slice(readerAt, confirmAt);
assert(/localStorage\.getItem\(KEY\)/.test(callbackBeforeConfirm), 'backup import must re-check project storage before confirmation');
assert(/localStorage\.getItem\(KEY\+":active"\)/.test(callbackBeforeConfirm), 'backup import must re-check active project before confirmation');
assert(/muuttu/i.test(callbackBeforeConfirm), 'stale backup import must fail closed with a user-visible changed-state error');

console.log('project backup import stale-state regression OK');
