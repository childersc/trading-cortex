const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Running Institutional Order Blocks (Smart Risk) Indicator Tests...');

const isolatedJsPath = path.join(__dirname, '..', 'content', 'content-isolated.js');
const mainJsPath = path.join(__dirname, '..', 'content', 'content-main.js');
const templateCssPath = path.join(__dirname, '..', 'content', 'template-bar.css');

assert(fs.existsSync(isolatedJsPath), 'content-isolated.js must exist');
assert(fs.existsSync(mainJsPath), 'content-main.js must exist');
assert(fs.existsSync(templateCssPath), 'template-bar.css must exist');

const isolatedJs = fs.readFileSync(isolatedJsPath, 'utf8');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');
const templateCss = fs.readFileSync(templateCssPath, 'utf8');

// 1. Verify Configuration & Defaults in both contexts
assert(isolatedJs.includes('DEFAULT_ORDER_BLOCKS = {'), 'content-isolated.js must define DEFAULT_ORDER_BLOCKS');
assert(mainJs.includes('DEFAULT_ORDER_BLOCKS = {'), 'content-main.js must define DEFAULT_ORDER_BLOCKS');
assert(isolatedJs.includes('normalizeOrderBlocksConfig('), 'content-isolated.js must define normalizeOrderBlocksConfig');
assert(mainJs.includes('normalizeOrderBlocksConfig('), 'content-main.js must define normalizeOrderBlocksConfig');
assert(isolatedJs.includes('orderBlocks: JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS))'), 'settings defaults must include orderBlocks');

console.log('✓ DEFAULT_ORDER_BLOCKS and normalization helpers verified in both isolated & main scripts');

// 2. Verify Indicator Hub registration & UI
assert(isolatedJs.includes("id: 'orderblocks'"), 'INDICATORS array must include orderblocks');
assert(isolatedJs.includes("title: 'Order Blocks (Smart Risk)'"), 'Indicator title must be "Order Blocks (Smart Risk)"');
assert(isolatedJs.includes('masterToggleId: \'vest-ob-master-enabled\''), 'Indicator master toggle id must be vest-ob-master-enabled');
assert(isolatedJs.includes('renderOrderBlocksSettingsHtml(ob)'), 'Must call renderOrderBlocksSettingsHtml');
assert(isolatedJs.includes("const INDICATOR_MAP = [") && isolatedJs.includes("'orderblocks'"), 'INDICATOR_MAP must include orderblocks');
assert(isolatedJs.includes('id="vest-sdm-open-orderblocks-btn"'), 'Cortex dropdown menu must contain Order Blocks button');

console.log('✓ Indicator Hub registration and Cortex dropdown menu verified');

// 3. Verify Settings Drawer HTML Controls & Event Wiring
const expectedControls = [
  '#vest-ob-swing-lookback',
  '#vest-ob-max-blocks',
  '#vest-ob-extend-mode',
  '#vest-ob-min-fvg-ticks',
  '#vest-ob-bull-color',
  '#vest-ob-bull-opacity',
  '#vest-ob-bear-color',
  '#vest-ob-bear-opacity',
  '#vest-ob-show-entry-icon',
  '#vest-ob-show-target-lines',
  '#vest-ob-icon-size',
  '#vest-ob-rr-ratio',
  '#vest-ob-voice-alert',
  '#vest-ob-chime-alert',
  '#vest-ob-voice-uri',
  '#vest-ob-test-voice-btn',
  '#vest-ob-reset-defaults-btn'
];

for (const ctrl of expectedControls) {
  assert(isolatedJs.includes(ctrl), `Settings drawer & events must include control '${ctrl}'`);
}

console.log('✓ All 17 Order Blocks settings drawer inputs, sliders, and buttons verified');

// 4. Verify Audible Voice & Web Audio Chime Alerts
assert(isolatedJs.includes('function playOrderBlockChime('), 'Must define playOrderBlockChime for synthesized audio feedback');
assert(isolatedJs.includes('function handleOrderBlockMitigatedAlert('), 'Must define handleOrderBlockMitigatedAlert handler');
assert(isolatedJs.includes("Bullish Order Block Mitigated. Enter Long."), 'Voice alert phrase for long entry must be defined');
assert(isolatedJs.includes("Bearish Order Block Mitigated. Enter Short."), 'Voice alert phrase for short entry must be defined');
assert(isolatedJs.includes("type === 'VEST_TV_OB_MITIGATED'"), 'Window message listener must handle VEST_TV_OB_MITIGATED');

console.log('✓ Audible alerts (Speech voice synthesis + Web Audio chimes) verified');

// 5. Verify Main World Algorithm: computeOrderBlocksFromBars & renderOrderBlocksOnCanvas
assert(mainJs.includes('function computeOrderBlocksFromBars('), 'content-main.js must define computeOrderBlocksFromBars');
assert(mainJs.includes('function renderOrderBlocksOnCanvas('), 'content-main.js must define renderOrderBlocksOnCanvas');
assert(mainJs.includes('▲ BUY OB') && mainJs.includes('▼ SELL OB'), 'Canvas renderer must draw order entry badges (▲ BUY OB / ▼ SELL OB)');
assert(mainJs.includes('MITIGATED'), 'Canvas renderer must display MITIGATED tag upon retest');
assert(mainJs.includes('SL ') && mainJs.includes('TP ('), 'Canvas renderer must draw Stop Loss and Take Profit target lines');

console.log('✓ Canvas renderer and on-chart Order Entry badges verified');

// 6. Algorithm Unit Testing in isolated VM
console.log('Testing computeOrderBlocksFromBars algorithm execution...');

// Extract computeOrderBlocksFromBars and normalizeOrderBlocksConfig from mainJs
const extractFn = (name, src) => {
  const match = src.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n  \\}`));
  assert(match, `Could not extract function ${name}`);
  return match[0];
};

const normFnCode = extractFn('normalizeOrderBlocksConfig', mainJs);
const computeFnCode = extractFn('computeOrderBlocksFromBars', mainJs);

const sandbox = {
  console,
  Math,
  DEFAULT_ORDER_BLOCKS: {
    enabled: true,
    swingLookback: 3,
    minFvgTicks: 1,
    maxBlocks: 10,
    extendMode: 'mitigation',
    bullishColor: '#10b981',
    bullishOpacity: 20,
    bearishColor: '#ef4444',
    bearishOpacity: 20,
    showOrderEntryIcon: true,
    orderIconSize: 13,
    voiceAlertEnabled: true,
    chimeAlertEnabled: true,
    voiceURI: '',
    showTargetLines: true,
    riskRewardRatio: 2.0
  }
};

vm.createContext(sandbox);
vm.runInContext(`${normFnCode}\n${computeFnCode}`, sandbox);

// Synthetic bars generating a swing high followed by a bullish breakout with an FVG
// Bars 0-5: consolidation around 100
// Bar 3: Swing High at 105
// Bar 6: Pullback low / down candle at 98 (Candidate Bullish Order Block)
// Bar 7: Strong displacement up to 104
// Bar 8: Strong displacement up to 110 (Breaking above 105, leaving FVG between Bar 6 High 100 and Bar 8 Low 102)
// Bar 9-11: Price pulls back to 99, mitigating Bar 6 OB!
const syntheticBars = [];
const baseTime = 1700000000;
const interval = 300;

for (let i = 0; i < 20; i++) {
  let o = 100, h = 101, l = 99, c = 100;
  if (i === 3) { o = 101; h = 106; l = 100; c = 105; } // Swing High
  else if (i === 6) { o = 101; h = 101.5; l = 97.5; c = 98.0; } // Down candle / Bullish OB
  else if (i === 7) { o = 98.0; h = 104.0; l = 98.0; c = 103.5; } // Displacement
  else if (i === 8) { o = 103.5; h = 111.0; l = 103.0; c = 110.0; } // Break of Structure (110 > 106) with FVG (103.0 > 101.5)
  else if (i === 9) { o = 110.0; h = 110.5; l = 105.0; c = 106.0; }
  else if (i === 10) { o = 106.0; h = 106.5; l = 99.5; c = 100.5; } // Mitigation: low 99.5 touches OB [97.5, 101.5]!
  else if (i > 10) { o = 102.0; h = 115.0; l = 101.0; c = 114.0; } // Bounce away from OB

  syntheticBars.push({
    barIndex: i,
    timeSec: baseTime + i * interval,
    open: o,
    high: h,
    low: l,
    close: c
  });
}

const computed = sandbox.computeOrderBlocksFromBars(syntheticBars, {
  enabled: true,
  swingLookback: 2,
  maxBlocks: 5
});

assert(computed.length > 0, 'Must detect at least 1 Order Block from synthetic setup');
const bullOb = computed.find(x => x.side === 'long');
assert(bullOb, 'Must detect Bullish Order Block');
assert.strictEqual(bullOb.top, 101.5, 'Bullish OB top must match candle high/open');
assert.strictEqual(bullOb.bottom, 97.5, 'Bullish OB bottom must match candle low');
assert.strictEqual(bullOb.isMitigated, true, 'Bullish OB must be marked as mitigated on pullback');
assert.strictEqual(bullOb.mitigatedBarIndex, 10, 'Mitigation must occur at bar 10');
assert.strictEqual(bullOb.mitigatedPrice, 101.5, 'Mitigated price must be top of OB');

console.log('✓ VM algorithm test passed: detected Bullish OB with FVG, BOS break, and Bar 10 mitigation');

console.log('All Institutional Order Blocks Indicator Tests Passed Successfully!');
