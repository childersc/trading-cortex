const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');
const isolatedSrc = fs.readFileSync(path.join(rootDir, 'content', 'content-isolated.js'), 'utf8');
const mainSrc = fs.readFileSync(path.join(rootDir, 'content', 'content-main.js'), 'utf8');

function extractBlock(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  assert.notStrictEqual(start, -1, `Could not find start marker: ${startMarker}`);
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.notStrictEqual(end, -1, `Could not find end marker: ${endMarker}`);
  return src.slice(start, end);
}

console.log('Running Cortex Configurable Auto-Trail Stop Loss Engine Tests...');

// 1. Defaults, normalization, clamping, badge & summary formatting in content-isolated.js
{
  const cfgBlock = extractBlock(
    isolatedSrc,
    'const DEFAULT_AUTO_TRAIL =',
    'const DEFAULT_ORDER_BLOCKS ='
  );
  const ctx = {};
  vm.runInNewContext(
    `${cfgBlock}
     this.DEFAULT_AUTO_TRAIL = DEFAULT_AUTO_TRAIL;
     this.normalizeAutoTrailConfig = normalizeAutoTrailConfig;
     this.formatAutoTrailBadge = formatAutoTrailBadge;
     this.formatAutoTrailSummary = formatAutoTrailSummary;`,
    ctx
  );

  // Safe defaults: disabled and manual-arm by default, tighten-only ON
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.enabled, false);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.autoArmOnNewTrade, false);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.onlyTighten, true);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.barUseClosedOnly, true);

  // Clamping & invalid input recovery
  const norm = ctx.normalizeAutoTrailConfig({
    enabled: true,
    mode: 'bogus_mode',
    ticksDistance: -5,
    barTimeframe: '99m',
    barLookback: 100,
    barBufferTicks: -3,
    activationMode: 'nope',
    stepMinTicks: 0,
    minUpdateIntervalSec: 999
  });
  assert.strictEqual(norm.enabled, true);
  assert.strictEqual(norm.mode, 'ticks');
  assert.strictEqual(norm.ticksDistance, 1);
  assert.strictEqual(norm.barTimeframe, '5m');
  assert.strictEqual(norm.barLookback, 20);
  assert.strictEqual(norm.barBufferTicks, 0);
  assert.strictEqual(norm.activationMode, 'immediate');
  assert.strictEqual(norm.stepMinTicks, 1);
  assert.strictEqual(norm.minUpdateIntervalSec, 60);

  // Badge formatting across all 5 modes
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: false }), 'OFF');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'price', priceOffset: 12, priceOffsetType: 'absolute' }), '±12');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'price', priceOffset: 0.5, priceOffsetType: 'percent' }), '0.5%');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'ticks', ticksDistance: 15 }), '15t');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'points', pointsDistance: 4 }), '4pt');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'dollars', dollarsDistance: 75 }), '$75');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'bar_hl', barTimeframe: '15m' }), '15m H/L');

  const summary = ctx.formatAutoTrailSummary({ enabled: true, mode: 'bar_hl', barTimeframe: '5m', barLookback: 2, barBufferTicks: 3, activationMode: 'in_profit_dollars', activationValue: 25, moveToBreakevenOnActivate: true });
  assert.ok(summary.includes('5m'), 'Summary must describe selected timeframe');
  assert.ok(summary.includes('+$25'), 'Summary must describe activation threshold');
  assert.ok(summary.includes('snaps SL to BE'), 'Summary must note BE activation');
  console.log('✓ Auto-Trail defaults, clamping, badges & plain-English summary verified');
}

// 2. Main-world Auto-Trail Engine VM execution across ALL 5 modes + safety invariants
{
  const engineBlock = extractBlock(
    mainSrc,
    '// === CORTEX AUTO-TRAIL STOP ENGINE ===',
    '// === END CORTEX AUTO-TRAIL STOP ENGINE ==='
  );
  const postedMessages = [];
  const datafeedRequests = [];
  const cacheMap = new Map();
  let mockNow = 100000;

  const ctx = {
    currentSettings: { autoTrail: { enabled: true, autoArmOnNewTrade: true, mode: 'ticks', ticksDistance: 20, stepMinTicks: 1, minUpdateIntervalSec: 3, onlyTighten: true } },
    mtfOrderBlockBarsCache: cacheMap,
    hypernovaManualTpSlBySymbol: {},
    activeHypernovaDrag: null,
    normalizeHypernovaMainSymbol: (s) => String(s || '').toUpperCase().replace(/[-/_].*$/, ''),
    resolveCurrentSymbolInfoForDatafeed: (ms) => (ms && ms._info) || null,
    stitchLiveChartBarsIntoTfBars: (base, live) => [...base, ...live.slice(-1)],
    aggregateBarsToInterval: (bars, targetSec) => {
      if (!bars || bars.length < 4) return [];
      return [
        { timeSec: 0, open: bars[0].open, high: Math.max(bars[0].high, bars[1].high), low: Math.min(bars[0].low, bars[1].low), close: bars[1].close },
        { timeSec: targetSec, open: bars[2].open, high: Math.max(bars[2].high, bars[3].high), low: Math.min(bars[2].low, bars[3].low), close: bars[3].close }
      ];
    },
    requestMtfBarsFromDatafeed: (sym, spec) => { datafeedRequests.push({ sym, key: spec.key }); },
    computeHypernovaTargetPnlUsd: (pos, p) => (p - pos.entryPrice) * pos.sizeQty * (pos.side === 'short' ? -1 : 1),
    formatHypernovaDollarAmount: (v) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`,
    window: { top: { postMessage: (msg) => postedMessages.push(msg) } },
    Date: { now: () => mockNow },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    isFinite
  };

  vm.runInNewContext(
    `${engineBlock}
     this.AUTO_TRAIL_TF_SPECS = AUTO_TRAIL_TF_SPECS;
     this.autoTrailStateBySymbol = autoTrailStateBySymbol;
     this.getAutoTrailConfig = getAutoTrailConfig;
     this.resolveAutoTrailTickSize = resolveAutoTrailTickSize;
     this.snapPriceToAutoTrailTick = snapPriceToAutoTrailTick;
     this.resolveAutoTrailTimeframeBars = resolveAutoTrailTimeframeBars;
     this.evaluateAutoTrailTarget = evaluateAutoTrailTarget;
     this.toggleAutoTrailArmedForPosition = toggleAutoTrailArmedForPosition;
     this.runAutoTrailForActivePosition = runAutoTrailForActivePosition;
     this.clearAutoTrailStateForSymbol = clearAutoTrailStateForSymbol;`,
    ctx
  );

  // 2a. Tick size detection & exact snapping
  assert.strictEqual(ctx.resolveAutoTrailTickSize({ _info: { minmov: 1, pricescale: 10 } }, {}, 0, 3570), 0.1);
  assert.strictEqual(ctx.resolveAutoTrailTickSize({ _info: { minmov: 25, pricescale: 100 } }, {}, 0, 20000), 0.25);
  assert.strictEqual(ctx.resolveAutoTrailTickSize(null, { priceDecimals: 3 }, 0, 32.1), 0.001);
  assert.strictEqual(ctx.resolveAutoTrailTickSize({ _info: { minmov: 1, pricescale: 10 } }, {}, 0.5, 3570), 0.5, 'Manual tick override must take precedence');
  assert.strictEqual(ctx.snapPriceToAutoTrailTick(3568.43, 0.1), 3568.4);
  assert.strictEqual(ctx.snapPriceToAutoTrailTick(20000.38, 0.25), 20000.5);

  // 2b. MODE 1: Trail by Price (Absolute & Percent, Long & Short, ratchet preserves peak)
  {
    const longPos = { symbol: 'GOLD', side: 'long', entryPrice: 3550, sizeQty: 10, slPrice: 3540 };
    const cfgAbs = { mode: 'price', priceOffset: 10, priceOffsetType: 'absolute', activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true };
    const r1 = ctx.evaluateAutoTrailTarget({ cfg: cfgAbs, pos: longPos, state: { peakPrice: 3570 }, livePrice: 3565, tickSize: 0.1 });
    assert.strictEqual(r1.peakPrice, 3570, 'Peak must stay at 3570 during pullback to 3565');
    assert.strictEqual(r1.targetSl, 3560, 'Long price trail: 3570 - 10 = 3560');
    assert.strictEqual(r1.shouldSubmit, true);

    // Percent mode on Short
    const shortPos = { symbol: 'BTC', side: 'short', entryPrice: 100000, sizeQty: 1, slPrice: 101500 };
    const cfgPct = { mode: 'price', priceOffset: 1, priceOffsetType: 'percent', activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true };
    const r2 = ctx.evaluateAutoTrailTarget({ cfg: cfgPct, pos: shortPos, state: { peakPrice: 99000 }, livePrice: 98000, tickSize: 1 });
    assert.strictEqual(r2.peakPrice, 98000);
    assert.strictEqual(r2.targetSl, 98980, 'Short 1% trail from peak 98000 = 98980');
    assert.strictEqual(r2.shouldSubmit, true);
  }

  // 2c. MODE 2: Trail by Ticks
  {
    const longPos = { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3558 };
    const cfgTicks = { mode: 'ticks', ticksDistance: 15, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true };
    const r = ctx.evaluateAutoTrailTarget({ cfg: cfgTicks, pos: longPos, state: { peakPrice: 3562 }, livePrice: 3564.5, tickSize: 0.1 });
    assert.strictEqual(r.peakPrice, 3564.5);
    assert.strictEqual(r.targetSl, 3563, 'Long 15 ticks (0.1) behind 3564.5 = 3563.0');
    assert.strictEqual(r.shouldSubmit, true);
  }

  // 2d. MODE 3: Trail by Points (with custom pointValue)
  {
    const shortPos = { symbol: 'NQ', side: 'short', entryPrice: 21000, sizeQty: 2, slPrice: 21020 };
    const cfgPts = { mode: 'points', pointsDistance: 8, pointValue: 1, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true };
    const r = ctx.evaluateAutoTrailTarget({ cfg: cfgPts, pos: shortPos, state: { peakPrice: 20990 }, livePrice: 20980, tickSize: 0.25 });
    assert.strictEqual(r.targetSl, 20988, 'Short 8 points behind 20980 = 20988');
    assert.strictEqual(r.shouldSubmit, true);
  }

  // 2e. MODE 4: Trail by Dollars ($)
  {
    const shortPos = { symbol: 'GOLD', side: 'short', entryPrice: 3570, sizeQty: 25, slPrice: 3575 };
    const cfgUsd = { mode: 'dollars', dollarsDistance: 50, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true };
    // Peak drops to 3565 (+$125 PnL). $50 / 25 qty = 2.0 price distance -> target SL = 3567.0 (locks in +$75 profit!)
    const r = ctx.evaluateAutoTrailTarget({ cfg: cfgUsd, pos: shortPos, state: { peakPrice: 3565 }, livePrice: 3565, tickSize: 0.1 });
    assert.strictEqual(r.targetSl, 3567, 'Short $50 trail on 25 qty from 3565 -> SL 3567.0');
    assert.strictEqual(r.shouldSubmit, true);

    // Missing sizeQty must safely skip instead of dividing by 0/NaN
    const noQty = ctx.evaluateAutoTrailTarget({ cfg: cfgUsd, pos: { ...shortPos, sizeQty: null }, state: {}, livePrice: 3565, tickSize: 0.1 });
    assert.strictEqual(noQty.shouldSubmit, false);
    assert.strictEqual(noQty.skipReason, 'missing_qty');
  }

  // 2f. MODE 5: Trail by Specific Timeframe Bar Highs & Lows (`bar_hl`)
  {
    const tfBars = [
      { timeSec: 1000, open: 3555, high: 3562, low: 3552, close: 3560 },
      { timeSec: 1300, open: 3560, high: 3568, low: 3558.5, close: 3566 }, // last COMPLETED bar
      { timeSec: 1600, open: 3566, high: 3572, low: 3565.0, close: 3570 }  // live FORMING bar
    ];
    const longPos = { symbol: 'GOLD', side: 'long', entryPrice: 3554, sizeQty: 10, slPrice: 3550 };
    const cfgClosed1 = { mode: 'bar_hl', barTimeframe: '5m', barLookback: 1, barUseClosedOnly: true, barBufferTicks: 2, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true };
    const rClosed1 = ctx.evaluateAutoTrailTarget({ cfg: cfgClosed1, pos: longPos, state: {}, livePrice: 3570, tickSize: 0.1, tfBars });
    assert.strictEqual(rClosed1.targetSl, 3558.3, 'Long 1-bar closed 5m low (3558.5) - 2 ticks (0.2) = 3558.3 (ignoring forming bar 3565.0)');
    assert.strictEqual(rClosed1.shouldSubmit, true);

    // 2-bar lookback closed -> min(3552, 3558.5) = 3552 - 0.2 = 3551.8
    const cfgClosed2 = { ...cfgClosed1, barLookback: 2 };
    const rClosed2 = ctx.evaluateAutoTrailTarget({ cfg: cfgClosed2, pos: longPos, state: {}, livePrice: 3570, tickSize: 0.1, tfBars });
    assert.strictEqual(rClosed2.targetSl, 3551.8, 'Long 2-bar closed lookback must take lowest low across both completed bars');

    // barUseClosedOnly: false -> uses forming bar low 3565.0 - 0.2 = 3564.8
    const cfgLive = { ...cfgClosed1, barUseClosedOnly: false };
    const rLive = ctx.evaluateAutoTrailTarget({ cfg: cfgLive, pos: longPos, state: {}, livePrice: 3570, tickSize: 0.1, tfBars });
    assert.strictEqual(rLive.targetSl, 3564.8, 'Live-bar mode must include forming bar low');

    // Short trails HIGHEST HIGH + bufferTicks
    const shortPos = { symbol: 'GOLD', side: 'short', entryPrice: 3575, sizeQty: 10, slPrice: 3580 };
    const rShortBar = ctx.evaluateAutoTrailTarget({ cfg: cfgClosed1, pos: shortPos, state: {}, livePrice: 3560, tickSize: 0.1, tfBars });
    assert.strictEqual(rShortBar.targetSl, 3568.2, 'Short 1-bar closed 5m high (3568) + 2 ticks (0.2) = 3568.2');
    assert.strictEqual(rShortBar.shouldSubmit, true);

    // MTF Bar Resolver: requesting 15m from 5m chart resamples immediately & triggers datafeed fetch
    const chart5m = [
      { timeSec: 300, open: 100, high: 105, low: 98, close: 103 },
      { timeSec: 600, open: 103, high: 108, low: 101, close: 106 },
      { timeSec: 900, open: 106, high: 110, low: 104, close: 109 },
      { timeSec: 1200, open: 109, high: 112, low: 107, close: 111 }
    ];
    const mtf15 = ctx.resolveAutoTrailTimeframeBars('15m', chart5m, 300, 'GOLD', null);
    assert.strictEqual(Array.isArray(mtf15) && mtf15.length === 2, true, 'Higher-TF bar trail must resample immediately while datafeed loads');
    assert.ok(datafeedRequests.some(r => r.key === '15m'), 'Must request full 15m datafeed history in background');
  }

  // 2g. Activation Triggers + Breakeven Snap on Activate + Safety Guards
  {
    const longPos = { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, unrealizedPnl: 15, slPrice: 3550 };
    const cfgAct = { mode: 'ticks', ticksDistance: 80, activationMode: 'in_profit_dollars', activationValue: 25, moveToBreakevenOnActivate: true, stepMinTicks: 1, onlyTighten: true };

    // Before +$25 profit -> waits cleanly (never submits)
    const waiting = ctx.evaluateAutoTrailTarget({ cfg: cfgAct, pos: longPos, state: {}, livePrice: 3561.5, tickSize: 0.1 });
    assert.strictEqual(waiting.activated, false);
    assert.strictEqual(waiting.shouldSubmit, false);
    assert.strictEqual(waiting.skipReason, 'waiting_activation');

    // Hits +$30 profit -> activates AND snaps SL to Breakeven (3560) because 3563 - 8.0 = 3555 is looser than BE!
    const triggered = ctx.evaluateAutoTrailTarget({ cfg: cfgAct, pos: { ...longPos, unrealizedPnl: 30 }, state: {}, livePrice: 3563, tickSize: 0.1 });
    assert.strictEqual(triggered.activated, true);
    assert.strictEqual(triggered.targetSl, 3560, 'moveToBreakevenOnActivate must snap SL to entry price when trail offset is still below entry');
    assert.strictEqual(triggered.shouldSubmit, true);

    // Safety Guard #1: Never cross live market price (Long target >= livePrice)
    const crossMkt = ctx.evaluateAutoTrailTarget({
      cfg: { mode: 'ticks', ticksDistance: 5, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true },
      pos: { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3550 },
      state: { peakPrice: 3570 }, // target = 3569.5, but market dropped to 3569.0!
      livePrice: 3569.0,
      tickSize: 0.1
    });
    assert.strictEqual(crossMkt.shouldSubmit, false);
    assert.strictEqual(crossMkt.skipReason, 'crosses_market', 'Must NEVER submit SL on the wrong side of live market price');

    // Safety Guard #2: Strict ratchet (`onlyTighten: true`) NEVER loosens an existing tighter manual SL!
    const noLoosen = ctx.evaluateAutoTrailTarget({
      cfg: { mode: 'ticks', ticksDistance: 20, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true },
      pos: { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3564.0 },
      state: { peakPrice: 3565.0 }, // target = 3563.0 < existing SL 3564.0
      livePrice: 3565.0,
      tickSize: 0.1
    });
    assert.strictEqual(noLoosen.shouldSubmit, false);
    assert.strictEqual(noLoosen.skipReason, 'no_tighten', 'onlyTighten must NEVER loosen a tighter SL');
  }

  // 2h. Runtime execution throttle, drag pause, inFlight lock & manual TRL arm/disarm
  {
    ctx.currentSettings.autoTrail = { enabled: true, autoArmOnNewTrade: false, mode: 'ticks', ticksDistance: 10, stepMinTicks: 1, minUpdateIntervalSec: 5, onlyTighten: true };
    const pos = { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3555 };

    // Disarmed by default when autoArmOnNewTrade is false -> must NOT submit
    const disarmedRes = ctx.runAutoTrailForActivePosition({ pos, symbolKey: 'GOLD', mainSeries: { _info: { minmov: 1, pricescale: 10 } }, bars: [], barIntervalSec: 300, livePrice: 3565 });
    assert.strictEqual(disarmedRes.armed, false);
    assert.strictEqual(postedMessages.length, 0);

    // Click TRL button -> arms trade and submits tightened SL 3564.0 immediately!
    assert.strictEqual(ctx.toggleAutoTrailArmedForPosition(pos, 3565), true);
    const armedRes = ctx.runAutoTrailForActivePosition({ pos, symbolKey: 'GOLD', mainSeries: { _info: { minmov: 1, pricescale: 10 } }, bars: [], barIntervalSec: 300, livePrice: 3565 });
    assert.strictEqual(armedRes.armed, true);
    assert.strictEqual(postedMessages.length, 1, 'Armed Auto-Trail must post VEST_TV_HYPERNOVA_SET_TP_SL');
    assert.strictEqual(postedMessages[0].payload.isAutoTrail, true);
    assert.strictEqual(postedMessages[0].payload.price, 3564);

    // In-flight + cooldown guard prevents rapid duplicate submissions!
    ctx.runAutoTrailForActivePosition({ pos, symbolKey: 'GOLD', mainSeries: { _info: { minmov: 1, pricescale: 10 } }, bars: [], barIntervalSec: 300, livePrice: 3567 });
    assert.strictEqual(postedMessages.length, 1, 'In-flight / cooldown guard must prevent modal spam');

    // Clear inFlight + advance past 5s cooldown, but simulate active user drag -> must stay paused!
    ctx.autoTrailStateBySymbol.GOLD.inFlight = false;
    mockNow += 6000;
    ctx.activeHypernovaDrag = { kind: 'sl' };
    ctx.runAutoTrailForActivePosition({ pos: { ...pos, slPrice: 3564 }, symbolKey: 'GOLD', mainSeries: { _info: { minmov: 1, pricescale: 10 } }, bars: [], barIntervalSec: 300, livePrice: 3568 });
    assert.strictEqual(postedMessages.length, 1, 'Auto-Trail must pause while user is manually dragging SL/TP');

    // Release drag -> submits new tightened SL 3567.0!
    ctx.activeHypernovaDrag = null;
    ctx.runAutoTrailForActivePosition({ pos: { ...pos, slPrice: 3564 }, symbolKey: 'GOLD', mainSeries: { _info: { minmov: 1, pricescale: 10 } }, bars: [], barIntervalSec: 300, livePrice: 3568 });
    assert.strictEqual(postedMessages.length, 2);
    assert.strictEqual(postedMessages[1].payload.price, 3567);
  }
  console.log('✓ All 5 Auto-Trail modes (Price, Ticks, Points, Dollars, Timeframe Bar H/L), activation triggers, safety guards & throttle verified');
}

// 3. Verify Settings Tab, Dropdown Menu, Entry Box TRL Button & Busy-Modal Guard Wiring
{
  for (const token of [
    "id: 'autotrail'",
    'id="vest-sdm-open-autotrail-btn"',
    'id="vest-at-enabled"',
    'id="vest-at-auto-arm"',
    'id="vest-at-mode"',
    'id="vest-at-act-mode"',
    'id="vest-at-step-ticks"',
    'id="vest-at-cooldown"',
    'id="vest-at-only-tighten"',
    'id="vest-at-show-preview"',
    'id="vest-at-reset-btn"',
    "reason: 'busy_modal'"
  ]) {
    assert.strictEqual(isolatedSrc.includes(token), true, `content-isolated.js missing Auto-Trail UI/guard token: ${token}`);
  }
  for (const token of [
    'vest-hn-ctrl-btn trail-btn',
    'toggleAutoTrailArmedForPosition(',
    'runAutoTrailForActivePosition(',
    'isAutoTrail: true'
  ]) {
    assert.strictEqual(mainSrc.includes(token), true, `content-main.js missing Auto-Trail chart integration token: ${token}`);
  }
  console.log('✓ Settings tab, Cortex dropdown shortcut, on-chart TRL button & busy-modal safety guard verified');
}

console.log('ALL CORTEX AUTO-TRAIL STOP LOSS ENGINE TESTS PASSED!');
