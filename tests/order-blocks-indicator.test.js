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
  let audioCtxConstructed = 0;
  const sandbox = {
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
      AudioContext: function () { audioCtxConstructed++; this.state = 'running'; this.resume = () => Promise.resolve(); }
    },
    navigator: { userActivation: { isActive: false, hasBeenActive: false } }
  };
  vm.createContext(sandbox);
  const audioExtract = isolatedJs.match(/let sharedCortexAudioContext[\s\S]*?function playWithAudioContext\([\s\S]*?\n  \}/);
  assert(audioExtract, 'Must extract audio policy functions');
  vm.runInContext(audioExtract[0], sandbox);

  assert.strictEqual(sandbox.canPlayWebAudio(), false, 'canPlayWebAudio must return false before user activation');
  assert.strictEqual(sandbox.getCortexAudioContext(), null, 'getCortexAudioContext must return null when inactive to prevent Chrome autoplay error');

  // Synthetic (untrusted) event must NOT unlock or instantiate AudioContext
  sandbox.markUserInteractionForAudio({ isTrusted: false });
  assert.strictEqual(audioCtxConstructed, 0, 'Synthetic untrusted events must never construct AudioContext');

  // Event before Chrome grants userActivation must NOT instantiate AudioContext
  sandbox.markUserInteractionForAudio({ isTrusted: true });
  assert.strictEqual(audioCtxConstructed, 0, 'Must not construct AudioContext while navigator.userActivation is inactive');
  assert.strictEqual(sandbox.canPlayWebAudio(), true, 'canPlayWebAudio must return true after user interaction');

  // Genuine trusted gesture with active userActivation unlocks AudioContext cleanly
  sandbox.navigator.userActivation.isActive = true;
  sandbox.markUserInteractionForAudio({ isTrusted: true });
  assert.strictEqual(audioCtxConstructed, 1, 'Genuine trusted gesture with userActivation must construct AudioContext once');
  console.log('✓ Chrome autoplay policy protection verified: avoids premature/untrusted AudioContext instantiation');
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

// 8. Verify rejection of invalid continuation candles during rallies (1h NQ false positive fix)
console.log('Testing rejection of invalid continuation pauses mid-rally...');
const pureRallyBars = [];
for (let i = 0; i < 15; i++) {
  // Pure uptrend making higher highs and higher lows with minor down pauses
  const isPause = (i === 5 || i === 9);
  pureRallyBars.push({
    barIndex: i,
    timeSec: baseTime + i * interval,
    open: isPause ? 100 + i * 2 + 1 : 100 + i * 2,
    high: 100 + i * 2 + 2,
    low: 100 + i * 2 - 0.5,
    close: isPause ? 100 + i * 2 : 100 + i * 2 + 1.5
  });
}
const rallyObs = sandbox.computeOrderBlocksFromBars(pureRallyBars, {
  enabled: true,
  swingLookback: 3,
  maxBlocks: 5
});
assert.strictEqual(rallyObs.length, 0, 'Pure continuation rally without prior swing high break must produce 0 false-positive Order Blocks');
console.log('✓ Rejection of invalid rally continuation pauses verified (0 false positives on NQ rally)');

// 9. Verify continuous invalidation tracking
console.log('Testing continuous invalidation tracking past mitigation...');
const invalidationBars = syntheticBars.map(b => ({ ...b }));
// At bar 15, price crashes below OB bottom (97.5) to 95.0
invalidationBars[15] = {
  barIndex: 15,
  timeSec: baseTime + 15 * interval,
  open: 98.0,
  high: 98.0,
  low: 94.0,
  close: 95.0
};
const invalidatedComputed = sandbox.computeOrderBlocksFromBars(invalidationBars, {
  enabled: true,
  swingLookback: 2,
  maxBlocks: 5
});
const violatedOb = invalidatedComputed.find(x => x.side === 'long');
assert(violatedOb, 'Must detect long OB');
assert.strictEqual(violatedOb.isMitigated, true, 'OB was mitigated at bar 10');
assert.strictEqual(violatedOb.isInvalidated, true, 'OB must be marked as invalidated when price closes below bottom');
console.log('✓ Continuous invalidation tracking verified (violated OBs cleanly marked invalidated)');

// 10. Verify Multi-Timeframe (5m / 15m / 1h / 4h) Order Blocks, Custom Colors, Text Sizing & Cross-TF Projection
console.log('Testing Multi-Timeframe (5m/15m/1h/4h) Order Blocks, colors, text size & projection...');

// UI controls presence
const mtfUiControls = [
  '#vest-ob-label-font-size',
  '#vest-ob-mtf-label-font-size',
  '#vest-ob-mtf-max-blocks',
  'vest-ob-mtf-${tf}-enabled',
  'vest-ob-mtf-${tf}-bull',
  'vest-ob-mtf-${tf}-bear',
  'vest-ob-mtf-${tf}-opacity'
];
for (const ctrl of mtfUiControls) {
  assert(isolatedJs.includes(ctrl), `Order Blocks settings UI must include '${ctrl}'`);
}

// Config normalization & clamping
const normDefault = sandbox.normalizeOrderBlocksConfig({ enabled: true });
assert.strictEqual(normDefault.labelFontSize, 18, 'Default labelFontSize must be 18');
assert.strictEqual(normDefault.mtfLabelFontSize, 22, 'Default mtfLabelFontSize must be 22');
assert.strictEqual(normDefault.mtfMaxBlocksPerTf, 4, 'Default mtfMaxBlocksPerTf must be 4');
['5m', '15m', '1h', '4h'].forEach(tf => {
  assert(normDefault.mtfTimeframes && normDefault.mtfTimeframes[tf], `mtfTimeframes must include ${tf}`);
  assert.strictEqual(normDefault.mtfTimeframes[tf].enabled, true, `${tf} MTF OB should default to enabled`);
  assert(/^#[0-9a-f]{6}$/i.test(normDefault.mtfTimeframes[tf].bullishColor), `${tf} bullishColor must be hex`);
  assert(/^#[0-9a-f]{6}$/i.test(normDefault.mtfTimeframes[tf].bearishColor), `${tf} bearishColor must be hex`);
});

const normCustom = sandbox.normalizeOrderBlocksConfig({
  enabled: true,
  labelFontSize: 16,
  mtfLabelFontSize: 18,
  mtfMaxBlocksPerTf: 6,
  mtfTimeframes: {
    '5m': { enabled: true, bullishColor: '#00ffaa', bearishColor: '#ff0055', opacity: 35 },
    '4h': { enabled: false, bullishColor: '#112233', bearishColor: '#445566', opacity: 99 }
  }
});
assert.strictEqual(normCustom.labelFontSize, 16);
assert.strictEqual(normCustom.mtfLabelFontSize, 18);
assert.strictEqual(normCustom.mtfMaxBlocksPerTf, 6);
assert.strictEqual(normCustom.mtfTimeframes['5m'].bullishColor, '#00ffaa');
assert.strictEqual(normCustom.mtfTimeframes['5m'].bearishColor, '#ff0055');
assert.strictEqual(normCustom.mtfTimeframes['5m'].opacity, 35);
assert.strictEqual(normCustom.mtfTimeframes['4h'].enabled, false);
assert.strictEqual(normCustom.mtfTimeframes['4h'].opacity, 80, 'MTF opacity must clamp at 80');

// VM test for stitchLiveChartBarsIntoTfBars, resolveObTimeToX, and computeMultiTimeframeOrderBlocks
const stitchFnCode = extractFn('stitchLiveChartBarsIntoTfBars', mainJs);
const resolveXFnCode = extractFn('resolveObTimeToX', mainJs);
const aggFnCode = extractFn('aggregateBarsToInterval', mainJs);
const mtfComputeFnCode = extractFn('computeMultiTimeframeOrderBlocks', mainJs);
const mtfSpecsMatch = mainJs.match(/const MTF_OB_SPECS = \[[\s\S]*?\];/);
assert(mtfSpecsMatch, 'Must extract MTF_OB_SPECS');

const mtfSandbox = {
  console,
  Math,
  isFinite,
  Date,
  Map,
  DEFAULT_ORDER_BLOCKS: normDefault,
  mtfOrderBlockBarsCache: new Map(),
  requestMtfBarsFromDatafeed: () => {}
};
vm.createContext(mtfSandbox);
vm.runInContext(`
  ${mtfSpecsMatch[0]}
  ${normFnCode}
  ${computeFnCode}
  ${aggFnCode}
  ${stitchFnCode}
  ${resolveXFnCode}
  ${mtfComputeFnCode}
`, mtfSandbox);

// Seed a 4h dataset in cache that contains our valid Bullish OB setup from earlier (using 4h intervals)
const base4h = 1700000000;
const bars4h = syntheticBars.map((b, idx) => ({ ...b, timeSec: base4h + idx * 14400 }));
mtfSandbox.mtfOrderBlockBarsCache.set('GC-PERP|4h', {
  bars: bars4h,
  fetchedAt: Date.now(),
  source: 'datafeed',
  inFlight: false,
  lastErrorAt: 0
});

// Active chart is 1m bars near the tail of the 4h dataset
const active1mStart = base4h + 18 * 14400;
const active1mBars = [];
for (let i = 0; i < 60; i++) {
  active1mBars.push({
    barIndex: i,
    timeSec: active1mStart + i * 60,
    open: 112, high: 116, low: 111, close: 115
  });
}

const mtfResult = mtfSandbox.computeMultiTimeframeOrderBlocks(active1mBars, {
  enabled: true,
  swingLookback: 2,
  mtfMaxBlocksPerTf: 4,
  mtfTimeframes: {
    '5m': { enabled: true, bullishColor: '#06b6d4', bearishColor: '#f97316', opacity: 18 },
    '15m': { enabled: true, bullishColor: '#3b82f6', bearishColor: '#ec4899', opacity: 18 },
    '1h': { enabled: true, bullishColor: '#8b5cf6', bearishColor: '#eab308', opacity: 20 },
    '4h': { enabled: true, bullishColor: '#14b8a6', bearishColor: '#f43f5e', opacity: 25 }
  }
}, 'GC-PERP', 60, null);

assert.strictEqual(mtfResult.activeTfCoveredByMtf, false, '1m chart should not be flagged as covered by 5m/15m/1h/4h');
const ob4h = mtfResult.blocks.find(b => b.timeframe === '4h' && b.side === 'long');
assert(ob4h, 'Must project 4h Bullish OB onto 1m chart');
assert.strictEqual(ob4h.isMtf, true, '4h OB on 1m chart must be marked isMtf=true');
assert.strictEqual(ob4h.customBullishColor, '#14b8a6', '4h OB must carry custom bullish color');
assert.strictEqual(ob4h.customOpacity, 25, '4h OB must carry custom opacity');

// Verify left-edge clamping when 4h OB formed before the leftmost loaded 1m bar
const clampedX = mtfSandbox.resolveObTimeToX(ob4h, true, ob4h.barIndex, ob4h.timeSec, active1mBars, () => null, 1200);
assert.strictEqual(clampedX, 0, '4h OB formed before visible 1m window must clamp startX to 0 so zone stays visible');

console.log('✓ Multi-Timeframe (5m/15m/1h/4h) Order Blocks, custom colors, font size & left-edge clamping verified');

// 11. Verify Persistent Order Block Dismissal (× Button & Restore All)
console.log('Testing persistent Order Block dismissal (× remove button & cross-TF key matching)...');
assert(isolatedJs.includes("type === 'VEST_TV_OB_DISMISS'"), 'Isolated world must handle VEST_TV_OB_DISMISS');
assert(isolatedJs.includes('vest-ob-restore-dismissed-btn'), 'Order Blocks settings must include Restore All Removed OBs button');
assert(mainJs.includes('lastRenderedOrderBlockCloseHitBoxes'), 'Main world must track OB close button hitboxes');
assert(mainJs.includes("type: 'VEST_TV_OB_DISMISS'"), 'Main world must post VEST_TV_OB_DISMISS on × click');

const normTfFnCode = extractFn('normalizeObTimeframeKey', mainJs);
const buildKeyFnCode = extractFn('buildOrderBlockDismissKey', mainJs);
const filterDismissedFnCode = extractFn('filterDismissedOrderBlocks', mainJs);
vm.runInContext(`${normTfFnCode}\n${buildKeyFnCode}\n${filterDismissedFnCode}`, mtfSandbox);

const keyFrom5mChart = mtfSandbox.buildOrderBlockDismissKey('gc-perp', { side: 'long', timeSec: 1700000300 }, '5');
const keyFrom1mMtf = mtfSandbox.buildOrderBlockDismissKey('GC-PERP', { side: 'long', timeSec: 1700000300, timeframe: '5m' }, '1m');
assert.strictEqual(keyFrom5mChart, keyFrom1mMtf, 'Dismiss key must match identically whether dismissed on 5m chart or as 5m MTF OB on 1m chart');
assert.strictEqual(keyFrom5mChart, 'GC-PERP|5m|long|1700000300');

const filteredBlocks = mtfSandbox.filterDismissedOrderBlocks(
  [
    { side: 'long', timeSec: 1700000300, timeframe: '5m' },
    { side: 'short', timeSec: 1700000900, timeframe: '5m' }
  ],
  'GC-PERP',
  '1m',
  { enabled: true, dismissedOrderBlocks: [keyFrom5mChart] }
);
assert.strictEqual(filteredBlocks.length, 1, 'Dismissed OB must be filtered out');
assert.strictEqual(filteredBlocks[0].side, 'short', 'Non-dismissed OB must remain visible');

console.log('✓ Persistent Order Block dismissal & cross-timeframe suppression verified');

// 12. Verify Box-Fitted Dynamic Text Sizing (Session-Box Style)
console.log('Testing box-fitted dynamic Order Block text sizing...');
const fittedFnCode = extractFn('computeFittedObLabelFontSize', mainJs);
vm.runInContext(fittedFnCode, mtfSandbox);
const mockCtx = {
  font: '',
  measureText: (txt) => {
    const m = / (\d+)px /.exec(mockCtx.font);
    const sz = m ? Number(m[1]) : 12;
    return { width: txt.length * sz * 0.6 };
  }
};
const largeBoxPx = mtfSandbox.computeFittedObLabelFontSize(mockCtx, '4h Bullish OB', 320, 90, 28, false);
const mediumBoxPx = mtfSandbox.computeFittedObLabelFontSize(mockCtx, '4h Bullish OB', 120, 26, 28, false);
const smallBoxPx = mtfSandbox.computeFittedObLabelFontSize(mockCtx, '4h Bullish OB', 60, 14, 28, false);
assert.strictEqual(largeBoxPx, 28, 'Large box should scale up to maxFontPx');
assert(mediumBoxPx < largeBoxPx && mediumBoxPx >= 8, 'Medium box should scale proportionally smaller than large box');
assert(smallBoxPx <= mediumBoxPx && smallBoxPx >= 8, 'Small/thin box should scale down cleanly to stay inside bounds');
console.log('✓ Box-fitted dynamic Order Block text sizing verified');

// 13. Verify Interactive OB Move/Resize Persistence & Adaptive OB Learning Engine
console.log('Testing interactive OB move/resize persistence & adaptive learning engine...');
assert(isolatedJs.includes("type === 'VEST_TV_OB_OVERRIDE'"), 'Isolated world must handle VEST_TV_OB_OVERRIDE');
assert(isolatedJs.includes('vest-ob-learning-enabled'), 'Order Blocks settings must include Adaptive Learning toggle');
assert(isolatedJs.includes('vest-ob-reset-learning-btn'), 'Order Blocks settings must include Reset Learned Data button');
assert(isolatedJs.includes('vest-ob-clear-overrides-btn'), 'Order Blocks settings must include Reset Moved/Resized button');
assert(mainJs.includes('function attachOrderBlockDragListeners('), 'Main world must define attachOrderBlockDragListeners');
assert(mainJs.includes('function hitTestOrderBlockDragTarget('), 'Main world must define hitTestOrderBlockDragTarget');

const learnProfileFnCode = extractFn('deriveOrderBlockLearningProfile', mainJs);
const classifyZoneFnCode = extractFn('classifyObZoneStyle', mainJs);
vm.runInContext(`${learnProfileFnCode}\n${classifyZoneFnCode}`, mtfSandbox);

// Verify learning from × dismissals (wick-only BOS + small FVG)
const learnedFromDismissals = mtfSandbox.deriveOrderBlockLearningProfile({
  dismissedSamples: [
    { closeBreak: false, fvgRatio: 0.12, dispRatio: 0.45 },
    { closeBreak: false, fvgRatio: 0.18, dispRatio: 0.50 },
    { closeBreak: false, fvgRatio: 0.15, dispRatio: 0.40 },
    { closeBreak: true, fvgRatio: 0.20, dispRatio: 0.55 }
  ],
  correctionSamples: [
    { deltaBars: -1, zoneStyle: 'body' },
    { deltaBars: -1, zoneStyle: 'body' },
    { deltaBars: -1, zoneStyle: 'body' }
  ]
});
assert.strictEqual(learnedFromDismissals.requireCloseBos, true, 'Must learn requireCloseBos when >=60% of dismissals are wick-only BOS');
assert(learnedFromDismissals.minFvgRatio > 0.15, 'Must raise minFvgRatio after repeated small-FVG dismissals');
assert(learnedFromDismissals.minDispRatio > 0.45, 'Must raise minDispRatio after repeated weak-displacement dismissals');
assert.strictEqual(learnedFromDismissals.preferredZoneMode, 'body', 'Must learn body-only zone style from repeated body resizes');
assert.strictEqual(learnedFromDismissals.preferredOriginShift, -1, 'Must learn -1 candle shift from repeated leftward OB moves');

// Verify classifyObZoneStyle detects body vs wick resizes accurately
const sampleCandle = { open: 100, close: 104, high: 108, low: 96 };
assert.strictEqual(mtfSandbox.classifyObZoneStyle(104.2, 99.8, sampleCandle), 'body', 'Resize near open/close must classify as body');
assert.strictEqual(mtfSandbox.classifyObZoneStyle(108.0, 96.0, sampleCandle), 'wick', 'Resize near high/low must classify as wick');

// Verify computeOrderBlocksFromBars applies learned body-only zone mode
const learnedBodyBlocks = mtfSandbox.computeOrderBlocksFromBars(syntheticBars, {
  enabled: true,
  swingLookback: 2,
  maxBlocks: 5,
  learningEnabled: true,
  learningData: {
    dismissedSamples: [],
    correctionSamples: [
      { deltaBars: 0, zoneStyle: 'body' },
      { deltaBars: 0, zoneStyle: 'body' },
      { deltaBars: 0, zoneStyle: 'body' }
    ]
  }
});
const learnedBull = learnedBodyBlocks.find(x => x.side === 'long');
assert(learnedBull, 'Must still detect valid Bullish OB with learned body profile');
assert.strictEqual(learnedBull.top, 101.0, 'Learned body mode must snap Bullish OB top to candle open (101.0)');
assert.strictEqual(learnedBull.bottom, 98.0, 'Learned body mode must snap Bullish OB bottom to candle close (98.0)');
console.log('✓ Interactive OB move/resize & adaptive learning engine verified');

console.log('All Institutional Order Blocks Indicator Tests Passed Successfully!');
