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

// 1. Defaults, per-timeframe bars-back map, record normalization, badge & summary formatting in content-isolated.js
{
  const cfgBlock = extractBlock(
    isolatedSrc,
    'const AUTO_TRAIL_TF_KEYS =',
    'const DEFAULT_ORDER_BLOCKS ='
  );
  const ctx = { Date };
  vm.runInNewContext(
    `${cfgBlock}
     this.DEFAULT_AUTO_TRAIL = DEFAULT_AUTO_TRAIL;
     this.normalizeAutoTrailConfig = normalizeAutoTrailConfig;
     this.normalizeAutoTrailRecords = normalizeAutoTrailRecords;
     this.formatAutoTrailBadge = formatAutoTrailBadge;
     this.formatAutoTrailSummary = formatAutoTrailSummary;`,
    ctx
  );

  // Safe defaults: AT button visible by default, auto-arm OFF by default, tighten-only ON
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.enabled, false);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.showAtButton, true);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.autoArmOnNewTrade, false);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.onlyTighten, true);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.barUseClosedOnly, true);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.barLookbackByTf['1m'], 3);
  assert.strictEqual(ctx.DEFAULT_AUTO_TRAIL.barLookbackByTf['5m'], 1);

  // Clamping, invalid input recovery & per-TF bars-back preservation
  const norm = ctx.normalizeAutoTrailConfig({
    enabled: true,
    mode: 'bar_hl',
    ticksDistance: -5,
    barTimeframe: '15m',
    barLookbackByTf: { '1m': 5, '5m': 2, '15m': 4, '1h': 999, '4h': 0 },
    barBufferTicks: -3,
    activationMode: 'in_profit_price',
    activationValue: 2.5,
    stepMinTicks: 0,
    minUpdateIntervalSec: 999
  });
  assert.strictEqual(norm.enabled, true);
  assert.strictEqual(norm.ticksDistance, 1);
  assert.strictEqual(norm.barTimeframe, '15m');
  assert.strictEqual(norm.barLookbackByTf['1m'], 5, '1m bars-back must persist independently');
  assert.strictEqual(norm.barLookbackByTf['5m'], 2, '5m bars-back must persist independently');
  assert.strictEqual(norm.barLookbackByTf['15m'], 4, '15m bars-back must persist independently');
  assert.strictEqual(norm.barLookbackByTf['1h'], 50, 'Per-TF bars-back must clamp to max 50');
  assert.strictEqual(norm.barLookbackByTf['4h'], 1, 'Per-TF bars-back must clamp to min 1');
  assert.strictEqual(norm.barLookback, 4, 'Active barLookback must mirror active timeframe');
  assert.strictEqual(norm.activationMode, 'in_profit_price');
  assert.strictEqual(norm.stepMinTicks, 1);
  assert.strictEqual(norm.minUpdateIntervalSec, 60);

  // Record normalization preserves valid records & drops corrupt/expired entries
  const normalizedRecs = ctx.normalizeAutoTrailRecords({
    'hypernova::acc-A10::GOLD': {
      firmId: 'hypernova',
      accountId: 'acc-A10',
      accountLabel: 'A10 · Active Assessment',
      symbol: 'gold',
      side: 'long',
      entryPrice: 3560.5,
      armed: true,
      activated: true,
      peakPrice: 3572.0,
      lastSubmittedSl: 3568.0,
      updatedAt: Date.now()
    },
    'bad::entry': { firmId: '', symbol: 'BTC', entryPrice: -1 }
  });
  assert.strictEqual(Object.keys(normalizedRecs).length, 1);
  assert.strictEqual(normalizedRecs['hypernova::acc-A10::GOLD'].symbol, 'GOLD');
  assert.strictEqual(normalizedRecs['hypernova::acc-A10::GOLD'].peakPrice, 3572);

  // Badge formatting across all 5 modes
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: false, showAtButton: false }), 'OFF');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'price', priceOffset: 12, priceOffsetType: 'absolute' }), '±12');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'price', priceOffset: 0.5, priceOffsetType: 'percent' }), '0.5%');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'ticks', ticksDistance: 15 }), '15t');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'points', pointsDistance: 4 }), '4pt');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'dollars', dollarsDistance: 75 }), '$75');
  assert.strictEqual(ctx.formatAutoTrailBadge({ enabled: true, mode: 'bar_hl', barTimeframe: '15m', barLookbackByTf: { '15m': 3 } }), '15m 3b');

  const summary = ctx.formatAutoTrailSummary({ enabled: true, mode: 'bar_hl', barTimeframe: '5m', barLookbackByTf: { '5m': 2 }, barBufferTicks: 3, activationMode: 'in_profit_dollars', activationValue: 25, moveToBreakevenOnActivate: true });
  assert.ok(summary.includes('5m'), 'Summary must describe selected timeframe');
  assert.ok(summary.includes('+$25'), 'Summary must describe activation threshold');
  assert.ok(summary.includes('snaps SL to BE'), 'Summary must note BE activation');
  console.log('✓ Auto-Trail defaults, per-TF bars-back map, record normalization, badges & summary verified');
}

// Helper to boot an isolated main-world Auto-Trail Engine VM (used to test live flow AND page refresh / account switches!)
function createMainEngineHarness(initialSettings, initialAccount = { firmId: 'hypernova', accountId: 'acc-A10', accountLabel: 'A10 · Active Assessment' }) {
  const engineBlock = extractBlock(
    mainSrc,
    '// === CORTEX AUTO-TRAIL STOP ENGINE ===',
    '// === END CORTEX AUTO-TRAIL STOP ENGINE ==='
  );
  const postedMessages = [];
  const datafeedRequests = [];
  const cacheMap = new Map();
  let mockNow = 1000000;

  const ctx = {
    currentSettings: JSON.parse(JSON.stringify(initialSettings)),
    mtfOrderBlockBarsCache: cacheMap,
    hypernovaManualTpSlBySymbol: {},
    activeHypernovaDrag: null,
    getChartVisualsMainWorldFirmId: () => 'hypernova',
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
     activeTradingAccount = ${JSON.stringify(initialAccount)};
     this.AUTO_TRAIL_TF_SPECS = AUTO_TRAIL_TF_SPECS;
     this.autoTrailStateBySymbol = autoTrailStateBySymbol;
     this.setActiveAccount = (acc, switched) => {
       activeTradingAccount = acc;
       if (switched) {
         lastTradingAccountSwitchAt = Date.now();
         Object.keys(autoTrailStateBySymbol).forEach(k => {
           if (k.includes('::' + acc.accountId + '::')) {
             autoTrailStateBySymbol[k].lastSubmitAt = 0;
             autoTrailStateBySymbol[k].inFlight = false;
           }
         });
       }
     };
     this.setPositionsAuthoritative = (v) => { lastPositionsDomAuthoritativeMain = Boolean(v); };
     this.makeAutoTrailRecordKey = makeAutoTrailRecordKey;
     this.getAutoTrailBarLookback = getAutoTrailBarLookback;
     this.getAutoTrailConfig = getAutoTrailConfig;
     this.resolveAutoTrailTickSize = resolveAutoTrailTickSize;
     this.snapPriceToAutoTrailTick = snapPriceToAutoTrailTick;
     this.resolveAutoTrailTimeframeBars = resolveAutoTrailTimeframeBars;
     this.evaluateAutoTrailTarget = evaluateAutoTrailTarget;
     this.handleAtButtonClick = handleAtButtonClick;
     this.toggleAutoTrailArmedForPosition = toggleAutoTrailArmedForPosition;
     this.runAutoTrailForActivePosition = runAutoTrailForActivePosition;
     this.clearAutoTrailStateForSymbol = clearAutoTrailStateForSymbol;
     this.catchUpPeakFromRecentBars = catchUpPeakFromRecentBars;`,
    ctx
  );

  return {
    ctx,
    postedMessages,
    datafeedRequests,
    advanceTime: (ms) => { mockNow += ms; },
    getNow: () => mockNow,
    getSlPosts: () => postedMessages.filter(m => m.type === 'VEST_TV_HYPERNOVA_SET_TP_SL'),
    getUpserts: () => postedMessages.filter(m => m.type === 'VEST_TV_AUTO_TRAIL_RECORD_UPSERT'),
    getRemoves: () => postedMessages.filter(m => m.type === 'VEST_TV_AUTO_TRAIL_RECORD_REMOVE')
  };
}

// 2. All 5 Trail Modes, Per-TF Bars-Back, Activation Triggers & Safety Guards
{
  const h = createMainEngineHarness({
    autoTrail: { enabled: true, autoArmOnNewTrade: false, mode: 'ticks', ticksDistance: 20, stepMinTicks: 1, minUpdateIntervalSec: 3, onlyTighten: true },
    autoTrailRecords: {}
  });
  const { ctx } = h;

  // Tick size detection & snapping
  assert.strictEqual(ctx.resolveAutoTrailTickSize({ _info: { minmov: 1, pricescale: 10 } }, {}, 0, 3570), 0.1);
  assert.strictEqual(ctx.resolveAutoTrailTickSize({ _info: { minmov: 25, pricescale: 100 } }, {}, 0, 20000), 0.25);
  assert.strictEqual(ctx.resolveAutoTrailTickSize({ _info: { minmov: 1, pricescale: 10 } }, {}, 0.5, 3570), 0.5);
  assert.strictEqual(ctx.snapPriceToAutoTrailTick(3568.43, 0.1), 3568.4);

  // Mode 1: Price (Absolute & Percent)
  const longPos = { symbol: 'GOLD', side: 'long', entryPrice: 3550, sizeQty: 10, slPrice: 3540 };
  const rAbs = ctx.evaluateAutoTrailTarget({ cfg: { mode: 'price', priceOffset: 10, priceOffsetType: 'absolute', activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true }, pos: longPos, state: { peakPrice: 3570 }, livePrice: 3565, tickSize: 0.1 });
  assert.strictEqual(rAbs.targetSl, 3560);
  assert.strictEqual(rAbs.shouldSubmit, true);

  const shortPos = { symbol: 'BTC', side: 'short', entryPrice: 100000, sizeQty: 1, slPrice: 101500 };
  const rPct = ctx.evaluateAutoTrailTarget({ cfg: { mode: 'price', priceOffset: 1, priceOffsetType: 'percent', activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true }, pos: shortPos, state: { peakPrice: 99000 }, livePrice: 98000, tickSize: 1 });
  assert.strictEqual(rPct.targetSl, 98980);

  // Mode 2: Ticks
  const rTicks = ctx.evaluateAutoTrailTarget({ cfg: { mode: 'ticks', ticksDistance: 15, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true }, pos: { ...longPos, slPrice: 3558 }, state: { peakPrice: 3562 }, livePrice: 3564.5, tickSize: 0.1 });
  assert.strictEqual(rTicks.targetSl, 3563);

  // Mode 3: Points
  const rPts = ctx.evaluateAutoTrailTarget({ cfg: { mode: 'points', pointsDistance: 8, pointValue: 1, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true }, pos: { symbol: 'NQ', side: 'short', entryPrice: 21000, sizeQty: 2, slPrice: 21020 }, state: { peakPrice: 20990 }, livePrice: 20980, tickSize: 0.25 });
  assert.strictEqual(rPts.targetSl, 20988);

  // Mode 4: Dollars ($)
  const rUsd = ctx.evaluateAutoTrailTarget({ cfg: { mode: 'dollars', dollarsDistance: 50, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true }, pos: { symbol: 'GOLD', side: 'short', entryPrice: 3570, sizeQty: 25, slPrice: 3575 }, state: { peakPrice: 3565 }, livePrice: 3565, tickSize: 0.1 });
  assert.strictEqual(rUsd.targetSl, 3567);

  // Mode 5: Specific Timeframe Bar Trailing — Candle Close (`0` ticks = exact close, `N` ticks behind), Wick (High/Low) & Body + PER-TIMEFRAME bars-back!
  const tfBars = [
    { timeSec: 1000, open: 3550, high: 3560, low: 3548.0, close: 3556.0 },
    { timeSec: 1300, open: 3556, high: 3563, low: 3552.0, close: 3560.0 },
    { timeSec: 1600, open: 3560, high: 3568, low: 3558.5, close: 3566.0 }, // last closed bar
    { timeSec: 1900, open: 3566, high: 3572, low: 3565.0, close: 3570.0 }  // live forming bar
  ];
  const perTfCfg = {
    mode: 'bar_hl',
    barTimeframe: '5m',
    barAnchor: 'wick',
    barLookbackByTf: { '1m': 3, '5m': 1, '15m': 2 },
    barUseClosedOnly: true,
    barBufferTicks: 2,
    activationMode: 'immediate',
    stepMinTicks: 1,
    onlyTighten: true
  };
  // Wick anchor: 5m (1 bar back) -> 3558.5 - 0.2 = 3558.3
  const r5m = ctx.evaluateAutoTrailTarget({ cfg: perTfCfg, pos: longPos, state: {}, livePrice: 3570, tickSize: 0.1, tfBars });
  assert.strictEqual(r5m.targetSl, 3558.3, '5m wick (1 bar back) must use last closed bar low 3558.5 - 0.2');
  // Wick anchor: 15m (2 bars back) -> min(3552.0, 3558.5) - 0.2 = 3551.8
  const r15m = ctx.evaluateAutoTrailTarget({ cfg: { ...perTfCfg, barTimeframe: '15m' }, pos: longPos, state: {}, livePrice: 3570, tickSize: 0.1, tfBars });
  assert.strictEqual(r15m.targetSl, 3551.8, '15m wick (2 bars back) must use lowest low of last 2 closed bars');
  // Wick anchor: 1m (3 bars back) -> min(3548.0, 3552.0, 3558.5) - 0.2 = 3547.8
  const r1m = ctx.evaluateAutoTrailTarget({ cfg: { ...perTfCfg, barTimeframe: '1m' }, pos: longPos, state: {}, livePrice: 3570, tickSize: 0.1, tfBars });
  assert.strictEqual(r1m.targetSl, 3547.8, '1m wick (3 bars back) must use lowest low of last 3 closed bars');

  // Close anchor with 0 ticks behind -> RIGHT AT THE CLOSE of that candle (3566.0)!
  const rClose0 = ctx.evaluateAutoTrailTarget({
    cfg: { ...perTfCfg, barAnchor: 'close', barBufferTicks: 0 },
    pos: longPos,
    state: {},
    livePrice: 3570,
    tickSize: 0.1,
    tfBars
  });
  assert.strictEqual(rClose0.targetSl, 3566.0, 'Close anchor with 0 ticks behind must place SL right at candle close (3566.0)');
  assert.strictEqual(rClose0.shouldSubmit, true);

  // Close anchor with 5 ticks behind -> 3566.0 - 0.5 = 3565.5 (Long), and 3566.0 + 0.5 = 3566.5 (Short)!
  const rClose5Long = ctx.evaluateAutoTrailTarget({
    cfg: { ...perTfCfg, barAnchor: 'close', barBufferTicks: 5 },
    pos: longPos,
    state: {},
    livePrice: 3570,
    tickSize: 0.1,
    tfBars
  });
  assert.strictEqual(rClose5Long.targetSl, 3565.5, 'Close anchor with 5 ticks behind (Long) = 3566.0 - 0.5 = 3565.5');

  const rClose5Short = ctx.evaluateAutoTrailTarget({
    cfg: { ...perTfCfg, barAnchor: 'close', barBufferTicks: 5 },
    pos: { symbol: 'GOLD', side: 'short', entryPrice: 3575, sizeQty: 10, slPrice: 3580 },
    state: {},
    livePrice: 3562,
    tickSize: 0.1,
    tfBars
  });
  assert.strictEqual(rClose5Short.targetSl, 3566.5, 'Close anchor with 5 ticks behind (Short) = 3566.0 + 0.5 = 3566.5');

  // Body anchor with 0 ticks behind -> lower edge min(3560, 3566) = 3560.0 (Long)
  const rBody0 = ctx.evaluateAutoTrailTarget({
    cfg: { ...perTfCfg, barAnchor: 'body', barBufferTicks: 0 },
    pos: longPos,
    state: {},
    livePrice: 3570,
    tickSize: 0.1,
    tfBars
  });
  assert.strictEqual(rBody0.targetSl, 3560.0, 'Body anchor with 0 ticks behind (Long) = lower body edge 3560.0');

  // Activation Trigger `in_profit_price`: does NOT start trailing if price never went into profit!
  const actCfg = { mode: 'ticks', ticksDistance: 10, activationMode: 'in_profit_price', activationValue: 5.0, moveToBreakevenOnActivate: false, stepMinTicks: 1, onlyTighten: true };
  const notInProfit = ctx.evaluateAutoTrailTarget({ cfg: actCfg, pos: { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3550 }, state: {}, livePrice: 3559, tickSize: 0.1 });
  assert.strictEqual(notInProfit.activated, false);
  assert.strictEqual(notInProfit.shouldSubmit, false);
  assert.strictEqual(notInProfit.skipReason, 'waiting_activation', 'Must NOT start trailing when price never went into profit');

  const hitProfit = ctx.evaluateAutoTrailTarget({ cfg: actCfg, pos: { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3550 }, state: {}, livePrice: 3565.5, tickSize: 0.1 });
  assert.strictEqual(hitProfit.activated, true);
  assert.strictEqual(hitProfit.targetSl, 3564.5);
  assert.strictEqual(hitProfit.shouldSubmit, true);

  // Safety guards: never cross market & never loosen tighter SL
  const crossMkt = ctx.evaluateAutoTrailTarget({ cfg: { mode: 'ticks', ticksDistance: 5, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true }, pos: { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3550 }, state: { peakPrice: 3570 }, livePrice: 3569.0, tickSize: 0.1 });
  assert.strictEqual(crossMkt.skipReason, 'crosses_market');

  const noLoosen = ctx.evaluateAutoTrailTarget({ cfg: { mode: 'ticks', ticksDistance: 20, activationMode: 'immediate', stepMinTicks: 1, onlyTighten: true }, pos: { symbol: 'GOLD', side: 'long', entryPrice: 3560, sizeQty: 10, slPrice: 3564.0 }, state: { peakPrice: 3565.0 }, livePrice: 3565.0, tickSize: 0.1 });
  assert.strictEqual(noLoosen.skipReason, 'no_tighten');

  console.log('✓ All 5 trail modes, per-TF bars-back, profit activation triggers & safety guards verified');
}

// 3. AT Button Immediate SL Placement + Account/Instrument Persistence across Page Refresh & Account Switch-Back!
{
  const baseSettings = {
    autoTrail: { enabled: false, showAtButton: true, autoArmOnNewTrade: false, mode: 'ticks', ticksDistance: 15, activationMode: 'immediate', stepMinTicks: 1, minUpdateIntervalSec: 10, onlyTighten: true },
    autoTrailRecords: {}
  };
  const h = createMainEngineHarness(baseSettings, { firmId: 'hypernova', accountId: 'acc-A10', accountLabel: 'A10 · Active Assessment' });
  const posA10 = { symbol: 'GOLD', side: 'long', entryPrice: 3560.0, sizeQty: 10, slPrice: null };
  const mainSeries = { _info: { minmov: 1, pricescale: 10 } };

  // 3a. Clicking "AT" on Account A10 immediately sets the Stop Loss to pre-defined trail (3565.0 - 1.5 = 3563.5) & persists record!
  const clickRes = h.ctx.handleAtButtonClick({ pos: posA10, symbolKey: 'GOLD', mainSeries, bars: [], barIntervalSec: 300, livePrice: 3565.0 });
  assert.strictEqual(clickRes.armed, true);
  assert.strictEqual(h.getSlPosts().length, 1, 'Clicking AT must immediately submit pre-defined Auto-Trail SL');
  assert.strictEqual(h.getSlPosts()[0].payload.price, 3563.5);
  assert.strictEqual(h.getSlPosts()[0].payload.isAutoTrail, true);

  const upserts = h.getUpserts();
  assert.ok(upserts.length >= 1, 'Clicking AT must persist account+instrument trail record');
  const savedRecord = upserts[upserts.length - 1].payload;
  assert.strictEqual(savedRecord.accountId, 'acc-A10');
  assert.strictEqual(savedRecord.symbol, 'GOLD');
  assert.strictEqual(savedRecord.activated, true);
  assert.strictEqual(upserts.some(u => u.payload.ensureEnabled === true), true, 'Arming via AT button must request ensureEnabled: true');
  savedRecord.lastSubmittedSl = 3563.5;

  // 3b. Switch to a DIFFERENT account (acc-A8) where GOLD is flat -> MUST NOT delete acc-A10's persisted trail!
  h.ctx.setActiveAccount({ firmId: 'hypernova', accountId: 'acc-A8', accountLabel: 'A8 · Active Assessment' }, true);
  h.ctx.setPositionsAuthoritative(true);
  h.advanceTime(5000);
  h.ctx.clearAutoTrailStateForSymbol('GOLD');
  assert.strictEqual(h.getRemoves().length, 0, 'Being flat on Account A8 must NEVER delete Account A10s persisted trail!');
  assert.ok(h.ctx.currentSettings.autoTrailRecords['hypernova::acc-A10::GOLD'], 'Account A10 trail record must stay intact in storage');

  // 3c. Switch BACK to Account A10 after GOLD rallied to 3574.0 (and pulled back to 3572.0) in recent bars -> IMMEDIATELY adjusts SL!
  const barsWhileAway = [
    { timeSec: Math.floor(savedRecord.updatedAt / 1000) - 600, open: 3560, high: 3565, low: 3559, close: 3565 },
    { timeSec: Math.floor(savedRecord.updatedAt / 1000) + 300, open: 3565, high: 3574.0, low: 3564, close: 3572.0 }
  ];
  h.ctx.setActiveAccount({ firmId: 'hypernova', accountId: 'acc-A10', accountLabel: 'A10 · Active Assessment' }, true);
  // Simulate brand-new page refresh (clean JS memory!) hydrated ONLY from persisted autoTrailRecords!
  const refreshed = createMainEngineHarness(
    {
      autoTrail: { ...baseSettings.autoTrail, enabled: true },
      autoTrailRecords: { 'hypernova::acc-A10::GOLD': savedRecord }
    },
    { firmId: 'hypernova', accountId: 'acc-A10', accountLabel: 'A10 · Active Assessment' }
  );
  refreshed.advanceTime(60000);
  const restoredRes = refreshed.ctx.runAutoTrailForActivePosition({
    pos: { ...posA10, slPrice: 3563.5 },
    symbolKey: 'GOLD',
    mainSeries,
    bars: barsWhileAway,
    barIntervalSec: 300,
    livePrice: 3572.0
  });
  assert.strictEqual(restoredRes.armed, true, 'Persisted trail must restore armed state after page refresh / account switch-back');
  assert.strictEqual(restoredRes.peakPrice, 3574.0, 'Peak must catch up from bars that printed while away (3574.0)');
  assert.strictEqual(restoredRes.skipReason, 'crosses_market', 'When caught-up target SL (3572.5) is above live price (3572.0), market-side safety guard must block crossing');
  assert.strictEqual(refreshed.getSlPosts().length, 0);
}

// Re-verify exact market-safe catch-up after refresh / account switch-back (livePrice = 3573.5, peak = 3574.0 -> SL 3572.5 < 3573.5)
{
  const savedRecord = {
    firmId: 'hypernova',
    accountId: 'acc-A10',
    accountLabel: 'A10 · Active Assessment',
    symbol: 'GOLD',
    side: 'long',
    entryPrice: 3560.0,
    positionKey: 'GOLD|long|3560.0000',
    armed: true,
    activated: true,
    peakPrice: 3565.0,
    lastSubmittedSl: 3563.5,
    updatedAt: 1000000
  };
  const refreshed = createMainEngineHarness(
    {
      autoTrail: { enabled: true, showAtButton: true, autoArmOnNewTrade: false, mode: 'ticks', ticksDistance: 15, activationMode: 'immediate', stepMinTicks: 1, minUpdateIntervalSec: 15, onlyTighten: true },
      autoTrailRecords: { 'hypernova::acc-A10::GOLD': savedRecord }
    },
    { firmId: 'hypernova', accountId: 'acc-A10', accountLabel: 'A10 · Active Assessment' }
  );
  refreshed.advanceTime(60000);
  const barsWhileAway = [
    { timeSec: 999, open: 3560, high: 3565, low: 3559, close: 3565 },
    { timeSec: 1030, open: 3565, high: 3574.0, low: 3564, close: 3573.5 }
  ];
  const res = refreshed.ctx.runAutoTrailForActivePosition({
    pos: { symbol: 'GOLD', side: 'long', entryPrice: 3560.0, sizeQty: 10, slPrice: 3563.5 },
    symbolKey: 'GOLD',
    mainSeries: { _info: { minmov: 1, pricescale: 10 } },
    bars: barsWhileAway,
    barIntervalSec: 300,
    livePrice: 3573.5
  });
  assert.strictEqual(res.armed, true);
  assert.strictEqual(res.peakPrice, 3574.0);
  assert.strictEqual(refreshed.getSlPosts().length, 1, 'Restored trail must immediately adjust SL on refresh/account switch-back');
  assert.strictEqual(refreshed.getSlPosts()[0].payload.price, 3572.5, 'Adjusted SL must equal caught-up peak 3574.0 - 15 ticks (1.5) = 3572.5');
  console.log('✓ AT button immediate SL submission, multi-account isolation & refresh/switch-back catch-up verified');
}

// 4. Verify Active Account Detection (Hypernova `hypernova:selected-account-id` + switcher badge) & UI Wiring
{
  const accBlock = extractBlock(
    isolatedSrc,
    'function getActiveTradingAccountIdentity()',
    'function syncHypernovaPositionsToMainWorld('
  );
  const accCtx = {
    getChartVisualsHostFirmId: () => 'hypernova',
    getActivePerpFirm: () => ({ id: 'hypernova' }),
    readCurrentSelectedAccount: () => null,
    window: { localStorage: { getItem: (k) => (k === 'hypernova:selected-account-id' ? '019a-uuid-a10' : null) } },
    document: {
      querySelector: (sel) => {
        if (sel.includes('account-switcher-trigger')) return { innerText: 'A10' };
        if (sel.includes('account-status-banner-label')) return { innerText: 'Active Assessment' };
        return null;
      }
    }
  };
  vm.runInNewContext(`${accBlock}\nthis.getActiveTradingAccountIdentity = getActiveTradingAccountIdentity;`, accCtx);
  const acc = accCtx.getActiveTradingAccountIdentity();
  assert.strictEqual(acc.firmId, 'hypernova');
  assert.strictEqual(acc.accountId, '019a-uuid-a10');
  assert.strictEqual(acc.accountLabel, 'A10 · Active Assessment');

  for (const token of [
    "id: 'autotrail'",
    'id="vest-sdm-open-autotrail-btn"',
    'id="vest-at-show-at-btn"',
    'id="vest-at-enabled"',
    'id="vest-at-auto-arm"',
    'id="vest-at-mode"',
    'id="vest-at-act-mode"',
    'id="vest-at-bar-anchor"',
    'Ticks Behind Candle (0 = exact)',
    'in_profit_price',
    'data-at-tf=',
    'vest-at-remove-record-btn',
    'VEST_TV_AUTO_TRAIL_RECORD_UPSERT',
    'VEST_TV_AUTO_TRAIL_RECORD_REMOVE',
    'hypernova:selected-account-id',
    "reason: 'busy_modal'"
  ]) {
    assert.strictEqual(isolatedSrc.includes(token), true, `content-isolated.js missing Auto-Trail token: ${token}`);
  }
  for (const token of [
    'vest-hn-ctrl-btn trail-btn',
    '>AT</button>',
    'handleAtButtonClick(',
    'runAutoTrailForActivePosition(',
    'makeAutoTrailRecordKey(',
    'catchUpPeakFromRecentBars(',
    'isAutoTrail: true'
  ]) {
    assert.strictEqual(mainSrc.includes(token), true, `content-main.js missing Auto-Trail token: ${token}`);
  }
  console.log('✓ Hypernova active account identity, AT button, per-TF bars-back UI & persistence wiring verified');
}

console.log('ALL CORTEX AUTO-TRAIL STOP LOSS ENGINE TESTS PASSED!');
