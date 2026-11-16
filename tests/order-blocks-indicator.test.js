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
  '#vest-ob-reset-defaults-btn',
  '#vest-ob-show-stats-box',
  '#vest-ob-stats-rr-ratio',
  '#vest-ob-reset-stats-pos-btn'
];

for (const ctrl of expectedControls) {
  assert(isolatedJs.includes(ctrl), `Settings drawer & events must include control '${ctrl}'`);
}

console.log('✓ All 20 Order Blocks settings drawer inputs, sliders, and buttons verified');

// 3b. Verify On-Chart Order Block Performance Stats Screen (1:3 RR)
assert(isolatedJs.includes('function renderChartOrderBlockStatsBox('), 'Must define renderChartOrderBlockStatsBox');
assert(isolatedJs.includes('function clampAndPositionChartOrderBlockStatsBox('), 'Must define clampAndPositionChartOrderBlockStatsBox');
assert(isolatedJs.includes('function wireChartOrderBlockStatsBoxEvents('), 'Must define wireChartOrderBlockStatsBoxEvents');
assert(isolatedJs.includes('vest-chart-ob-stats-box'), 'Must render container #vest-chart-ob-stats-box');
assert(isolatedJs.includes('vest-cosb-pin-btn'), 'Must include sticky/pin button #vest-cosb-pin-btn');
assert(isolatedJs.includes('vest-cosb-btn-collapse'), 'Must include minimize button #vest-cosb-btn-collapse');
assert(isolatedJs.includes('vest-cosb-btn-settings'), 'Must include settings gear button #vest-cosb-btn-settings');
assert(isolatedJs.includes('vest-cosb-btn-close'), 'Must include close button #vest-cosb-btn-close');
assert(isolatedJs.includes('vest-cosb-restore-btn'), 'Must include minimized pill restore button #vest-cosb-restore-btn');
assert(isolatedJs.includes('openStudioSettingsModal(\'chartingindicators\', \'orderblocks\')'), 'Settings button must deep-link directly to Order Blocks settings drawer');

console.log('✓ On-chart 1:3 RR Order Block Performance Stats screen (sticky, drag, minimize, deep-link settings) verified');

// 4. Verify Audible Voice & Web Audio Chime Alerts with Autoplay Policy Protection
assert(isolatedJs.includes('function playOrderBlockChime('), 'Must define playOrderBlockChime for synthesized audio feedback');
assert(isolatedJs.includes('function handleOrderBlockMitigatedAlert('), 'Must define handleOrderBlockMitigatedAlert handler');
assert(isolatedJs.includes('function canPlayWebAudio('), 'Must define canPlayWebAudio to respect Chrome autoplay policy');
assert(isolatedJs.includes('function getCortexAudioContext('), 'Must define getCortexAudioContext singleton helper');
assert(isolatedJs.includes("Bullish Order Block Mitigated. Enter Long."), 'Voice alert phrase for long entry must be defined');
assert(isolatedJs.includes("Bearish Order Block Mitigated. Enter Short."), 'Voice alert phrase for short entry must be defined');
assert(isolatedJs.includes("type === 'VEST_TV_OB_MITIGATED'"), 'Window message listener must handle VEST_TV_OB_MITIGATED');

// Autoplay policy unit test in isolated VM
{
  const sandbox = {
    window: { addEventListener: () => {} },
    navigator: { userActivation: { hasBeenActive: false } }
  };
  vm.createContext(sandbox);
  const audioExtract = isolatedJs.match(/let sharedCortexAudioContext[\s\S]*?function playWithAudioContext\([\s\S]*?\n  \}/);
  assert(audioExtract, 'Must extract audio policy functions');
  vm.runInContext(audioExtract[0], sandbox);

  assert.strictEqual(sandbox.canPlayWebAudio(), false, 'canPlayWebAudio must return false before user activation');
  assert.strictEqual(sandbox.getCortexAudioContext(), null, 'getCortexAudioContext must return null when inactive to prevent Chrome autoplay error');

  sandbox.markUserInteractionForAudio();
  assert.strictEqual(sandbox.canPlayWebAudio(), true, 'canPlayWebAudio must return true after user interaction');
  console.log('✓ Chrome autoplay policy protection verified: avoids premature AudioContext instantiation');
}

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
const statsFnCode = extractFn('computeOrderBlockPerformanceStats', mainJs);

const sandbox = {
  console,
  Math,
  isFinite,
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
    riskRewardRatio: 3.0,
    showStatsBox: true,
    statsRrRatio: 3.0
  }
};

vm.createContext(sandbox);
vm.runInContext(`${normFnCode}\n${computeFnCode}\n${statsFnCode}`, sandbox);

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

// 7. Verify computeOrderBlockPerformanceStats 1:3 RR Logic
console.log('Testing computeOrderBlockPerformanceStats 1:3 RR performance evaluation...');
const stats1 = sandbox.computeOrderBlockPerformanceStats(computed, syntheticBars, 3.0);
assert.strictEqual(stats1.totalBlocks, computed.length);
assert.strictEqual(stats1.mitigatedCount, 1);
assert.strictEqual(stats1.wins, 1, 'Mitigated bullish OB must hit 1:3 RR take profit at bar 11');
assert.strictEqual(stats1.losses, 0);
assert.strictEqual(stats1.winRate, 100);
assert.strictEqual(stats1.netR, 3.0, 'Net R for 1 win at 1:3 RR must equal +3.0R');
assert.strictEqual(stats1.rrRatio, 3.0);
assert.strictEqual(stats1.long.wins, 1);
assert.strictEqual(stats1.long.winRate, 100);

// Add a simulated losing Bearish OB:
// Entry 100, SL 105, Risk 5, 1:3 TP 85. Price moves up to 106, stopping out!
const mockBearishOb = {
  side: 'short',
  top: 105,
  bottom: 100,
  isMitigated: true,
  mitigatedArrayIndex: 10
};
const mixedBlocks = [...computed, mockBearishOb];
const stats2 = sandbox.computeOrderBlockPerformanceStats(mixedBlocks, syntheticBars, 3.0);
assert.strictEqual(stats2.mitigatedCount, 2);
assert.strictEqual(stats2.wins, 1, 'Long OB was winner');
assert.strictEqual(stats2.losses, 1, 'Bearish OB was stopped out (loss)');
assert.strictEqual(stats2.closedTrades, 2);
assert.strictEqual(stats2.winRate, 50, '1 win out of 2 closed trades must equal 50% win rate');
assert.strictEqual(stats2.netR, 2.0, '1 win at 3R minus 1 loss at 1R = +2.0R net return');
assert.strictEqual(stats2.profitFactor, 3.0, 'Profit factor (3R / 1R) must equal 3.0');
assert.strictEqual(stats2.expectancy, '+1.00R', 'Expectancy (+2R / 2) must equal +1.00R');
assert.strictEqual(stats2.short.losses, 1);
assert.strictEqual(stats2.short.winRate, 0);

console.log('✓ computeOrderBlockPerformanceStats accurately evaluates 1:3 RR win/loss/netR/expectancy for Long and Short OBs');

console.log('All Institutional Order Blocks Indicator Tests Passed Successfully!');
