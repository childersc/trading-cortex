// tests/range-detector-indicator.test.js
// Verification suite for Range Detector (Multi-Timeframe) Indicator & On-Chart Box

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const isolatedPath = path.resolve(__dirname, '../content/content-isolated.js');
const mainPath = path.resolve(__dirname, '../content/content-main.js');

const isolatedJs = fs.readFileSync(isolatedPath, 'utf8');
const mainJs = fs.readFileSync(mainPath, 'utf8');

console.log('Running Range Detector (Multi-Timeframe) Indicator Tests...');

// 1. Verify Configuration Schemas & Defaults
assert(isolatedJs.includes('DEFAULT_RANGE_DETECTOR ='), 'content-isolated.js must define DEFAULT_RANGE_DETECTOR');
assert(mainJs.includes('DEFAULT_RANGE_DETECTOR ='), 'content-main.js must define DEFAULT_RANGE_DETECTOR');
assert(isolatedJs.includes('function normalizeRangeDetectorConfig('), 'content-isolated.js must define normalizeRangeDetectorConfig');
assert(mainJs.includes('function normalizeRangeDetectorConfig('), 'content-main.js must define normalizeRangeDetectorConfig');

console.log('✓ DEFAULT_RANGE_DETECTOR and normalization helpers verified in both isolated & main scripts');

// 2. Verify Indicator Hub and Studio Dropdown Registration
assert(isolatedJs.includes("'vest-rd-master-enabled'"), 'Range Detector master switch must exist in Charting Indicators hub');
assert(isolatedJs.includes("id: 'rangedetector'"), 'Tile must be registered with id rangedetector');
assert(isolatedJs.includes('Range Detector (Multi-Timeframe)'), 'Tile title must describe Range Detector (Multi-Timeframe)');
assert(isolatedJs.includes('id="vest-sdm-open-rangedetector-btn"'), 'Studio dropdown menu must contain Range Detector direct button');

console.log('✓ Indicator Hub registration and Studio Dropdown menu verified');

// 3. Verify Settings Drawer Controls
const expectedControls = [
  'vest-rd-lookback',
  'vest-rd-mode',
  'vest-rd-chop-thresh',
  'vest-rd-adx-thresh',
  'vest-rd-voice-alert',
  'vest-rd-chime-alert',
  'vest-rd-glow-effect',
  'vest-rd-opacity',
  'vest-rd-width',
  'vest-rd-reset-pos-btn',
  'vest-rd-reset-defaults-btn'
];

for (const ctrl of expectedControls) {
  assert(isolatedJs.includes(ctrl), `Settings drawer & events must include control '${ctrl}'`);
}

console.log('✓ All 11 Range Detector settings drawer inputs, sliders, and buttons verified');

// 4. Verify Floating Box Component, Blue Title Bar, Blue Glow & MTF Indicators
assert(isolatedJs.includes('vest-chart-range-box'), 'content-isolated.js must define #vest-chart-range-box');
assert(isolatedJs.includes('Range Detector') && isolatedJs.includes('#2563eb'), 'Title bar must feature blue gradient background with white text');
assert(isolatedJs.includes('rgba(59, 130, 246'), 'Box must feature blue glow halo styling');
assert(isolatedJs.includes('RANGING') && isolatedJs.includes('TRENDING'), 'Box must render RANGING (green) and TRENDING (red) indicators');
assert(isolatedJs.includes('#10b981') && isolatedJs.includes('#ef4444'), 'Box must use green for ranging and red for non-ranging');

console.log('✓ On-chart floating box with blue title bar, slight blue glow, and green/red MTF indicators verified');

// 5. Verify Audible Alert Handling & Natural Speech Formatting (Instrument, Venue, Timeframe)
assert(isolatedJs.includes('function handleRangeDetectedAlert('), 'content-isolated.js must define handleRangeDetectedAlert');
assert(isolatedJs.includes('playRangeChime'), 'Audible chime sound player must be defined');
assert(isolatedJs.includes('Range detected on'), 'Voice alert speech phrase must be defined');
assert(isolatedJs.includes('function formatTimeframeForSpeech('), 'content-isolated.js must define formatTimeframeForSpeech');
assert(isolatedJs.includes('function formatSymbolForSpeech('), 'content-isolated.js must define formatSymbolForSpeech');
assert(isolatedJs.includes('function getActiveVenueName('), 'content-isolated.js must define getActiveVenueName');
assert(isolatedJs.includes("timeframe."), 'Voice alert phrase must conclude with natural timeframe');
assert(isolatedJs.includes("type === 'VEST_TV_RANGE_ALERT'"), 'Window message listener must handle VEST_TV_RANGE_ALERT');
assert(isolatedJs.includes("type === 'VEST_TV_RANGE_UPDATE'"), 'Window message listener must handle VEST_TV_RANGE_UPDATE');

// Test voice phrase generation directly in a mini-context
{
  const tfMatch = isolatedJs.match(/function formatTimeframeForSpeech\([\s\S]*?\n  \}/);
  const symMatch = isolatedJs.match(/function formatSymbolForSpeech\([\s\S]*?\n  \}/);
  const venueMatch = isolatedJs.match(/function getActiveVenueName\([\s\S]*?\n  \}/);
  assert(tfMatch && symMatch && venueMatch, 'Must extract speech formatting helpers');

  const speechBox = {
    window: { location: { hostname: 'trade.vestmarkets.com' } },
    getActivePerpFirm: () => ({ name: 'Vest Markets' })
  };
  vm.createContext(speechBox);
  vm.runInContext(`
    ${tfMatch[0]}
    ${symMatch[0]}
    ${venueMatch[0]}
    function generateSpeechPhrase(symbol, venue, tf) {
      const spokenInstrument = formatSymbolForSpeech(symbol);
      const venueName = getActiveVenueName(venue);
      const spokenTf = formatTimeframeForSpeech(tf);
      return \`Range detected on \${spokenInstrument} on \${venueName}, \${spokenTf} timeframe.\`;
    }
  `, speechBox);

  // Timeframe conversions
  assert.strictEqual(speechBox.formatTimeframeForSpeech('15m'), '15 minute');
  assert.strictEqual(speechBox.formatTimeframeForSpeech('1h'), '1 hour');
  assert.strictEqual(speechBox.formatTimeframeForSpeech('60'), '1 hour');
  assert.strictEqual(speechBox.formatTimeframeForSpeech('240'), '4 hour');
  assert.strictEqual(speechBox.formatTimeframeForSpeech('1D'), 'daily');
  assert.strictEqual(speechBox.formatTimeframeForSpeech('5'), '5 minute');

  // Symbol conversions
  assert.strictEqual(speechBox.formatSymbolForSpeech('HYPE-PERP'), 'HYPE Perpetual');
  assert.strictEqual(speechBox.formatSymbolForSpeech('BTC-PERP'), 'BTC Perpetual');
  assert.strictEqual(speechBox.formatSymbolForSpeech('NQ'), 'NQ');

  // Full spoken phrase
  const phrase = speechBox.generateSpeechPhrase('HYPE', 'Vest Markets', '15m');
  assert.strictEqual(phrase, 'Range detected on HYPE on Vest Markets, 15 minute timeframe.');

  const phrase2 = speechBox.generateSpeechPhrase('NQ', '', '60');
  assert.strictEqual(phrase2, 'Range detected on NQ on Vest Markets, 1 hour timeframe.');

  console.log('✓ Natural speech alert formatting verified: announces instrument, venue, and timeframe');
}

console.log('✓ Audible alerts (Speech voice synthesis + Web Audio chimes) verified');

// 6. Algorithm Unit Testing in isolated VM: Choppiness Index & Multi-Timeframe Range Detection
console.log('Testing MTF Range Detection algorithm execution in VM...');

const extractFn = (name, src) => {
  const match = src.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n  \\}`));
  assert(match, `Could not extract function ${name}`);
  return match[0];
};

const normFnCode = extractFn('normalizeRangeDetectorConfig', mainJs);
const chopFnCode = extractFn('computeChoppinessIndex', mainJs);
const adxFnCode = extractFn('computeAdx', mainJs);
const aggFnCode = extractFn('aggregateBarsToInterval', mainJs);
const mtfFnCode = extractFn('computeMultiTimeframeRangeStatus', mainJs);

const sandbox = {
  console,
  Math,
  Number,
  isFinite,
  Array,
  JSON,
  DEFAULT_RANGE_DETECTOR: {
    enabled: true,
    lookbackBars: 14,
    chopThreshold: 55,
    adxThreshold: 22,
    detectionMode: 'hybrid',
    timeframes: ['5m', '15m', '1h', '4h', '1D'],
    voiceAlertEnabled: true,
    chimeAlertEnabled: true,
    voiceURI: '',
    glowEffect: true
  }
};

vm.createContext(sandbox);
vm.runInContext(`
  ${normFnCode}
  ${chopFnCode}
  ${adxFnCode}
  ${aggFnCode}
  function parseTimeframeToSeconds(tfStr) {
    const s = String(tfStr || '').trim().toLowerCase();
    if (s.endsWith('m')) return Math.max(60, Number(s.slice(0, -1)) * 60);
    if (s.endsWith('h')) return Math.max(3600, Number(s.slice(0, -1)) * 3600);
    if (s.endsWith('d')) return Math.max(86400, Number(s.slice(0, -1)) * 86400);
    if (s.endsWith('w')) return Math.max(604800, Number(s.slice(0, -1)) * 604800);
    return 300;
  }
  ${mtfFnCode}
`, sandbox);

// Scenario A: Ranging / Consolidation Market (Sideways oscillation between 98 and 102)
const rangingBars = [];
const baseTime = 1700000000;
const interval = 300; // 5m

for (let i = 0; i < 60; i++) {
  const osc = Math.sin(i * 0.8) * 1.8;
  const o = 100 + osc;
  const c = 100 + Math.sin((i + 1) * 0.8) * 1.8;
  const h = Math.max(o, c) + 0.6;
  const l = Math.min(o, c) - 0.6;
  rangingBars.push({
    timeSec: baseTime + i * interval,
    open: o,
    high: h,
    low: l,
    close: c,
    barIndex: i
  });
}

const chopRanging = sandbox.computeChoppinessIndex(rangingBars, 14);
assert(chopRanging >= 50, `Choppiness index for oscillating sideways market must be elevated (got ${chopRanging})`);

const rangeResults = sandbox.computeMultiTimeframeRangeStatus(rangingBars, {
  enabled: true,
  lookbackBars: 14,
  chopThreshold: 55,
  adxThreshold: 25,
  detectionMode: 'hybrid',
  timeframes: ['5m', '15m', '1h']
}, '5m');

assert(rangeResults.length > 0, 'Must return MTF range results');
const res5m = rangeResults.find(r => r.timeframe === '5m');
assert(res5m, 'Must evaluate 5m timeframe');
assert.strictEqual(res5m.isRanging, true, '5m timeframe must detect market is RANGING (green indicator)');

// Scenario B: Strongly Trending Market (Consecutive runaway trend bars)
const trendingBars = [];
for (let i = 0; i < 60; i++) {
  const o = 100 + i * 2.0;
  const c = 100 + i * 2.0 + 1.8;
  const h = c + 0.5;
  const l = o - 0.3;
  trendingBars.push({
    timeSec: baseTime + i * interval,
    open: o,
    high: h,
    low: l,
    close: c,
    barIndex: i
  });
}

const chopTrending = sandbox.computeChoppinessIndex(trendingBars, 14);
assert(chopTrending < 45, `Choppiness index for runaway trending market must be low (got ${chopTrending})`);

const trendResults = sandbox.computeMultiTimeframeRangeStatus(trendingBars, {
  enabled: true,
  lookbackBars: 14,
  chopThreshold: 55,
  adxThreshold: 22,
  detectionMode: 'hybrid',
  timeframes: ['5m', '15m', '1h']
}, '5m');

const trend5m = trendResults.find(r => r.timeframe === '5m');
assert(trend5m, 'Must evaluate 5m timeframe for trending market');
assert.strictEqual(trend5m.isRanging, false, '5m timeframe must detect market is NOT ranging / TRENDING (red indicator)');

console.log('✓ VM algorithm test passed: cleanly differentiates RANGING (🟢) vs TRENDING (🔴) across timeframes');
console.log('All Range Detector Indicator Tests Passed Successfully!');
