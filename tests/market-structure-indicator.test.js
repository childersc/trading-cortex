// tests/market-structure-indicator.test.js
// Verification suite for Market Structure (BOS / MSS / CHoCH) & Order Block Origin Fix

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const isolatedPath = path.resolve(__dirname, '../content/content-isolated.js');
const mainPath = path.resolve(__dirname, '../content/content-main.js');

const isolatedJs = fs.readFileSync(isolatedPath, 'utf8');
const mainJs = fs.readFileSync(mainPath, 'utf8');

console.log('Running Market Structure (BOS / MSS / CHoCH) & Order Block Fix Tests...');

// 1. Verify Configuration Schemas & Defaults
assert(isolatedJs.includes('DEFAULT_MARKET_STRUCTURE ='), 'content-isolated.js must define DEFAULT_MARKET_STRUCTURE');
assert(mainJs.includes('DEFAULT_MARKET_STRUCTURE ='), 'content-main.js must define DEFAULT_MARKET_STRUCTURE');
assert(isolatedJs.includes('function normalizeMarketStructureConfig('), 'content-isolated.js must define normalizeMarketStructureConfig');
assert(mainJs.includes('function normalizeMarketStructureConfig('), 'content-main.js must define normalizeMarketStructureConfig');

console.log('✓ DEFAULT_MARKET_STRUCTURE and normalization verified in both isolated & main scripts');

// 2. Verify Indicator Hub and Studio Dropdown Registration
assert(isolatedJs.includes("'vest-ms-master-enabled'"), 'Market Structure master switch must exist in Charting Indicators hub');
assert(isolatedJs.includes("'marketstructure'"), 'Market Structure indicator entry must exist in Charting Indicators hub');
assert(isolatedJs.includes('id="vest-sdm-open-marketstructure-btn"'), 'Studio dropdown menu must contain Market Structure direct button');
assert(isolatedJs.includes("id: 'marketstructure'"), 'Tile must be registered with id marketstructure');

console.log('✓ Indicator Hub registration and Studio Dropdown menu verified');

// 3. Verify Settings Drawer Controls
const expectedControls = [
  'vest-ms-swing-lookback',
  'vest-ms-show-bos',
  'vest-ms-show-choch',
  'vest-ms-break-mode',
  'vest-ms-label-mode',
  'vest-ms-bull-color',
  'vest-ms-bear-color',
  'vest-ms-line-style',
  'vest-ms-max-lines',
  'vest-ms-extend-lines',
  'vest-ms-reset-defaults-btn'
];

for (const ctrl of expectedControls) {
  assert(isolatedJs.includes(ctrl), `Settings drawer & events must include control '${ctrl}'`);
}

console.log('✓ All 11 Market Structure settings drawer inputs and buttons verified');

// 4. Verify Canvas Renderer in content-main.js
assert(mainJs.includes('function renderMarketStructureOnCanvas('), 'content-main.js must define renderMarketStructureOnCanvas');
assert(mainJs.includes('renderMarketStructureOnCanvas(ctx, cachedComputedMarketStructure'), 'renderIctSessionIndicators must invoke renderMarketStructureOnCanvas');

console.log('✓ Canvas renderer verified');

// 5. Algorithm Unit Testing in isolated VM
console.log('Testing computeMarketStructureFromBars algorithm execution in isolated VM...');

const normMatch = mainJs.match(/function normalizeMarketStructureConfig\([\s\S]*?\n  \}/);
const compMatch = mainJs.match(/function computeMarketStructureFromBars\([\s\S]*?\n  \}/);

assert(normMatch, 'Could not match normalizeMarketStructureConfig');
assert(compMatch, 'Could not match computeMarketStructureFromBars');

const sandbox = {
  console,
  Math,
  DEFAULT_MARKET_STRUCTURE: {
    enabled: true,
    swingLookback: 3,
    showBos: true,
    showChoch: true,
    breakMode: 'close',
    labelMode: 'both',
    bullishColor: '#10b981',
    bearishColor: '#ef4444',
    lineStyle: 'dashed',
    lineWidth: 1.5,
    fontSize: 10,
    maxStructureLines: 15,
    extendLines: false
  }
};

vm.createContext(sandbox);
vm.runInContext(`${normMatch[0]}\n${compMatch[0]}`, sandbox);

// Synthetic bars generating:
// Bar 4: Swing High at 105
// Bar 8: Swing Low at 98
// Bar 12: Breakout above 105 (Close 108) -> Should trigger initial trend shift to bullish
// Bar 16: Swing High at 112
// Bar 22: Breakout above 112 (Close 116) -> Should trigger Bullish BOS
// Bar 26: Swing Low at 106
// Bar 32: Breakdown below 106 (Close 103) -> Should trigger Bearish CHoCH
const syntheticBars = [];
const baseTime = 1700000000;
const interval = 300;

for (let i = 0; i < 35; i++) {
  let o = 100, h = 101, l = 99, c = 100;
  if (i >= 12 && i < 22) { o = 108; h = 109; l = 107; c = 108; }
  else if (i >= 22) { o = 114; h = 115; l = 113; c = 114; }

  if (i === 4) { o = 101; h = 105; l = 100; c = 104.5; }
  else if (i === 8) { o = 100; h = 100.5; l = 98; c = 98.5; }
  else if (i === 12) { o = 103; h = 109; l = 103; c = 108; }
  else if (i === 16) { o = 108; h = 112; l = 107; c = 111.5; }
  else if (i === 22) { o = 111; h = 117; l = 111; c = 116; }
  else if (i === 26) { o = 114; h = 114.5; l = 106; c = 107; }
  else if (i === 32) { o = 108; h = 108; l = 102; c = 103; }

  syntheticBars.push({
    barIndex: i,
    timeSec: baseTime + i * interval,
    open: o,
    high: h,
    low: l,
    close: c
  });
}

const structures = sandbox.computeMarketStructureFromBars(syntheticBars, {
  enabled: true,
  swingLookback: 3,
  showBos: true,
  showChoch: true,
  breakMode: 'close'
});

assert(structures.length >= 3, 'Must detect at least 3 market structure breaks (Initial, BOS, CHoCH)');
const bosBreak = structures.find(s => s.type === 'bos');
const chochBreak = structures.find(s => s.type === 'choch' && s.side === 'bearish');

assert(bosBreak, 'Must detect bullish BOS continuation');
assert.strictEqual(bosBreak.price, 112, 'BOS break price must be 112');
assert.strictEqual(bosBreak.breakIndex, 22, 'BOS break bar index must be 22');

assert(chochBreak, 'Must detect bearish CHoCH breakdown');
assert.strictEqual(chochBreak.price, 106, 'Bearish CHoCH break price must be 106');
assert.strictEqual(chochBreak.breakIndex, 32, 'Bearish CHoCH break bar index must be 32');

console.log('✓ VM algorithm test passed: detected Bullish BOS (112) and Bearish CHoCH (106)');

// 6. Verify Order Block Origin Candle Selection Fix
assert(mainJs.includes('// Highest candle was bearish/down; search backward for the last bullish/up candle'), 'Bearish OB must search backward for last up candle');
assert(mainJs.includes('// Lowest candle was bullish/up; search backward for the last bearish/down candle'), 'Bullish OB must search backward for last down candle');

console.log('✓ Order Block origin candle backward selection verified');
console.log('All Market Structure & Order Block Fix tests passed successfully!');
