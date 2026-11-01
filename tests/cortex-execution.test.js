const assert = require('node:assert/strict');
const execution = require('../content/cortex-execution.js');

const config = execution.normalizeConfig({
  stopLossPoints: 8,
  targetSpacingPoints: 4,
  reversalIgnoreBars: 5
});
assert.deepEqual(execution.calculateManualLevels('long', 4000, config), { stopPrice: 3992, targetPrices: [4004, 4008, 4012] });
assert.deepEqual(execution.calculateManualLevels('short', 4000, config), { stopPrice: 4008, targetPrices: [3996, 3992, 3988] });
const long = {
  signalId: 'GC:5m:100:long', side: 'long', symbol: 'GC', resolution: '5m',
  barIndex: 10, timeSec: 100, entryPrice: 4000
};
const size = { amount: 10000, unit: 'USD' };

let state = execution.createState('GC');
let result = execution.processSignal(state, long, config, size);
state = result.state;
assert.deepEqual(result.actions.map(action => action.type), ['enter']);
assert.equal(state.position.stopPrice, 3992);
assert.deepEqual(state.position.targets.map(target => target.price), [4004, 4008, 4012]);
assert.equal(state.position.remainingPercent, 100);

const duplicate = execution.processSignal(state, long, config, size);
assert.deepEqual(duplicate.actions, [], 'same confirmed signal must not re-enter');

let opposing = {
  signalId: 'GC:5m:110:short', side: 'short', symbol: 'GC', resolution: '5m',
  barIndex: 12, timeSec: 110, entryPrice: 4001
};
for (let i = 0; i < 5; i++) {
  const advanced = execution.processBar(state, { timeSec: 101 + i, high: 4002, low: 3998, close: 4000 });
  state = advanced.state;
}
result = execution.processSignal(state, opposing, config, size);
assert.deepEqual(result.actions.map(action => action.type), ['ignore-reversal']);
assert.equal(result.state.position.side, 'long');

const sixthBar = execution.processBar(result.state, { timeSec: 106, high: 4002, low: 3998, close: 4000 });
state = sixthBar.state;
opposing = { ...opposing, signalId: 'GC:5m:107:short', barIndex: 17, timeSec: 107 };
result = execution.processSignal(state, opposing, config, size);
assert.deepEqual(result.actions.map(action => action.type), ['flatten']);
assert.equal(result.state.position, null, 'opposite entry must wait until flat is confirmed');
assert.equal(result.state.pendingReverse.signal.side, 'short');
const completed = execution.completeReversalAfterFlat(result.state, config);
assert.deepEqual(completed.actions.map(action => action.type), ['enter-after-flat']);
assert.equal(completed.state.position.side, 'short');
assert.equal(completed.state.position.entryPrice, 4001);

let paper = execution.createState('GC');
paper = execution.processSignal(paper, long, config, size).state;
let bar = execution.processBar(paper, { timeSec: 101, high: 4004, low: 3999, close: 4003 });
paper = bar.state;
assert.equal(bar.actions[0].type, 'paper-target');
assert.equal(bar.actions[0].closePercent, 25);
assert.equal(paper.position.remainingPercent, 75);
assert.equal(paper.position.stopPrice, 4000, 'TP1 moves stop to entry');
assert.equal(paper.stats.tp1, 1);
assert.equal(paper.stats.entries, 1);
bar = execution.processBar(paper, { timeSec: 102, high: 4008, low: 4001, close: 4007 });
paper = bar.state;
assert.equal(bar.actions[0].closePercent, 25);
assert.equal(paper.position.remainingPercent, 50);
assert.equal(paper.position.stopPrice, 4004, 'TP2 moves stop to TP1');
assert.equal(paper.stats.tp2, 1);
bar = execution.processBar(paper, { timeSec: 103, high: 4005, low: 4003, close: 4004 });
assert.equal(bar.actions[0].type, 'paper-stop');
assert.equal(bar.actions[0].closePercent, 50);
assert.equal(bar.state.position, null);
assert.equal(bar.state.stats.stopsBeforeProfit, 0, 'stop after a target does not count as stop-first');

paper = execution.createState('GC');
paper = execution.processSignal(paper, long, config, size).state;
bar = execution.processBar(paper, { timeSec: 101, high: 4004, low: 3991, close: 4000 });
assert.equal(bar.actions[0].type, 'paper-stop', 'stop wins when candle touches stop and target');
assert.equal(bar.state.stats.stopsBeforeProfit, 1, 'stop before any target increments stop-first');

paper = execution.createState('GC');
paper = execution.processSignal(paper, long, config, size).state;
paper = execution.processBar(paper, { timeSec: 101, high: 4001, low: 3991, close: 3992 }).state;
assert.equal(paper.position, null, 'initial stop can close the position before an opposing signal');
const stoppedReversal = execution.processSignal(paper, {
  signalId: 'GC:5m:102:short', side: 'short', symbol: 'GC', resolution: '5m',
  barIndex: 11, timeSec: 102, entryPrice: 3992
}, config, size);
assert.equal(stoppedReversal.actions[0].type, 'ignore-reversal', 'five-bar guard remains active after stop-out');
assert.equal(stoppedReversal.state.position, null);
paper = stoppedReversal.state;
for (let timeSec = 103; timeSec <= 107; timeSec++) {
  paper = execution.processBar(paper, { timeSec, symbol: 'GC', resolution: '5m', high: 3995, low: 3993, close: 3994 }).state;
}
const reversalAfterWindow = execution.processSignal(paper, {
  signalId: 'GC:5m:108:short', side: 'short', symbol: 'GC', resolution: '5m',
  barIndex: 17, timeSec: 108, entryPrice: 3994
}, config, size);
assert.equal(reversalAfterWindow.actions[0].type, 'enter', 'opposing signal is allowed after the five-bar window expires');

console.log('Cortex execution strategy tests passed.');
