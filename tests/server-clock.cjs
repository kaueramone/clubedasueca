const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const ctx = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/game/server-clock.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,ctx);
const { anchorServerClock, serverSecondsLeft } = ctx.exports;
const start='2026-10-10T12:00:00Z', end='2026-10-10T12:00:30Z';
const clock=anchorServerClock(end,start,1000,200);
assert.equal(serverSecondsLeft(clock,1000),30);
assert.equal(serverSecondsLeft(clock,6000),25);
assert.equal(serverSecondsLeft(clock,31000),0);
// A device hours behind/ahead, or a mid-turn wall-clock edit, has no influence.
const saved=Date.now;
try { for (const skew of [-86400000,86400000,0]) {
 Date.now=()=>Date.parse(start)+skew;
 assert.equal(serverSecondsLeft(clock,16000),15);
}} finally { Date.now=saved; }
assert.equal(serverSecondsLeft(clock,1000+600000),0,'background pause expires');
assert.equal(serverSecondsLeft(anchorServerClock(end,'2026-10-10T12:00:20Z',9000),9000),10,'reconnect recalibrates');
assert.equal(serverSecondsLeft(anchorServerClock(end,start,1000,31000),1000),0,'slow response grants no extra time');
assert.equal(anchorServerClock('invalid',start,1000),null);
assert.equal(anchorServerClock(end,'invalid',1000),null);
assert.equal(serverSecondsLeft(anchorServerClock('2026-10-10T12:05:00Z',start,0),0),30,'never shows more than turn limit');
assert.equal(serverSecondsLeft(anchorServerClock(start,end,0),0),0,'expired server deadline');
console.log('PASS server clock: skew, clock edits, reconnect, background, latency and invalid samples');
