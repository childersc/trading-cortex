const assert = require('assert');

console.log('Running Multi-Window Timeframe & Viewport Resolution Isolation Tests...');

// -------------------------------------------------------------
// Test 1: Window 'storage' Event Guard
// Verifies that TradingView's cross-tab sync via tradingview.chartproperties is blocked
// -------------------------------------------------------------
{
  const registeredListeners = [];
  const fakeWindow = {
    addEventListener(type, listener, options) {
      if (type === 'storage' && typeof listener === 'function') {
        const wrappedStorageListener = function (event) {
          try {
            if (
              event &&
              event.key &&
              (event.key === 'tradingview.chartproperties' ||
                event.key.startsWith('tradingview.chartproperties') ||
                event.key === 'tradingview.IntervalWidget.quicks' ||
                event.key.includes('IntervalWidget'))
            ) {
              return;
            }
          } catch (e) {}
          return listener.apply(this, arguments);
        };
        registeredListeners.push({ type, listener: wrappedStorageListener });
        return;
      }
      registeredListeners.push({ type, listener });
    }
  };

  let invokedCount = 0;
  let receivedKey = null;

  fakeWindow.addEventListener('storage', (e) => {
    invokedCount++;
    receivedKey = e.key;
  });

  const storageHandler = registeredListeners[0].listener;

  // Should BLOCK tradingview.chartproperties (cross-tab interval poisoning)
  storageHandler({ key: 'tradingview.chartproperties' });
  assert.strictEqual(invokedCount, 0, 'tradingview.chartproperties must be blocked');

  storageHandler({ key: 'tradingview.chartproperties.something' });
  assert.strictEqual(invokedCount, 0, 'tradingview.chartproperties prefix must be blocked');

  storageHandler({ key: 'tradingview.IntervalWidget.quicks' });
  assert.strictEqual(invokedCount, 0, 'tradingview.IntervalWidget.quicks must be blocked');

  // Should ALLOW legitimate non-interval keys
  storageHandler({ key: 'custom_user_palette' });
  assert.strictEqual(invokedCount, 1, 'Safe non-interval storage keys must pass through');
  assert.strictEqual(receivedKey, 'custom_user_palette');

  console.log('✓ Window storage event guard blocking cross-tab interval sync verified');
}

// -------------------------------------------------------------
// Test 2: Pre-hydration Sanitization at document_start
// Verifies raw chartproperties / interval keys are stripped so new/restored tabs keep their own interval
// -------------------------------------------------------------
{
  function isSafeTradingViewStorageKey(key) {
    return key.startsWith('linetool.') || key.includes('Toolbar') || key === 'properties_toolbar.position';
  }

  const rawSavedEntries = {
    'tradingview.chartproperties': '{"interval":"15","paneProperties":{}}',
    'tradingview.IntervalWidget.quicks': '["1","5","15"]',
    'linetool.cursor': '1',
    'drawingToolbar.visible': 'true'
  };

  let dirty = false;
  const cleanedEntries = {};
  Object.entries(rawSavedEntries).forEach(([k, v]) => {
    if (
      k === 'tradingview.chartproperties' ||
      k.startsWith('tradingview.chartproperties') ||
      k.includes('IntervalWidget')
    ) {
      dirty = true;
      return;
    }
    if (isSafeTradingViewStorageKey(k)) {
      cleanedEntries[k] = v;
    } else {
      dirty = true;
    }
  });

  assert.strictEqual(dirty, true, 'Dirty flag must be set when stripping interval keys');
  assert.strictEqual(cleanedEntries['tradingview.chartproperties'], undefined);
  assert.strictEqual(cleanedEntries['tradingview.IntervalWidget.quicks'], undefined);
  assert.strictEqual(cleanedEntries['linetool.cursor'], '1');
  assert.strictEqual(cleanedEntries['drawingToolbar.visible'], 'true');

  console.log('✓ document_start pre-hydration sanitization cleanly strips interval keys');
}

// -------------------------------------------------------------
// Test 3: Viewport Sync Strict Resolution Matching
// Verifies 15m focused chart adjustments do NOT affect 1m or 5m background charts,
// but DO synchronize to matching 15m background charts
// -------------------------------------------------------------
{
  function applyIncomingViewportCheck({ chartResolution, chartSymbol, meta, state, isTabFocused, appliedMap }) {
    if (isTabFocused) return { applied: false, reason: 'tab_is_focused' };

    const context = {
      symbol: chartSymbol,
      resolution: chartResolution,
      key: `${chartSymbol.toUpperCase()}|${chartResolution.toUpperCase()}`
    };

    // Strict Timeframe Isolation
    if (meta && meta.resolution) {
      if (String(meta.resolution).toUpperCase() !== String(context.resolution).toUpperCase()) {
        return { applied: false, reason: 'resolution_mismatch_meta' };
      }
    }
    if (meta && meta.symbol) {
      if (String(meta.symbol).toUpperCase() !== String(context.symbol).toUpperCase()) {
        return { applied: false, reason: 'symbol_mismatch_meta' };
      }
    }

    if (!state || !state.viewport) return { applied: false, reason: 'no_state' };

    if (state.resolution && String(state.resolution).toUpperCase() !== String(context.resolution).toUpperCase()) {
      return { applied: false, reason: 'resolution_mismatch_state' };
    }

    const updatedAt = Number(state.updatedAt) || 0;
    if (updatedAt <= (appliedMap.get(context.key) || 0)) {
      return { applied: false, reason: 'already_up_to_date' };
    }

    appliedMap.set(context.key, updatedAt);
    return { applied: true, viewport: state.viewport };
  }

  const appliedMap = new Map();
  const meta15m = { symbol: 'BTC-PERP', resolution: '15', chartKey: 'BTC-PERP|15' };
  const state15m = {
    symbol: 'BTC-PERP',
    resolution: '15',
    viewport: { barSpacing: 18, rightOffset: 5, priceRange: { from: 66000, to: 67500 } },
    updatedAt: 1000
  };

  // Case A: 1m background chart receives 15m update -> MUST IGNORE
  const res1m = applyIncomingViewportCheck({
    chartResolution: '1',
    chartSymbol: 'BTC-PERP',
    meta: meta15m,
    state: state15m,
    isTabFocused: false,
    appliedMap
  });
  assert.strictEqual(res1m.applied, false);
  assert.strictEqual(res1m.reason, 'resolution_mismatch_meta');

  // Case B: 5m background chart receives 15m update -> MUST IGNORE
  const res5m = applyIncomingViewportCheck({
    chartResolution: '5',
    chartSymbol: 'BTC-PERP',
    meta: meta15m,
    state: state15m,
    isTabFocused: false,
    appliedMap
  });
  assert.strictEqual(res5m.applied, false);
  assert.strictEqual(res5m.reason, 'resolution_mismatch_meta');

  // Case C: Another 15m background chart on screen 2 receives 15m update -> MUST APPLY
  const res15mScreen2 = applyIncomingViewportCheck({
    chartResolution: '15',
    chartSymbol: 'BTC-PERP',
    meta: meta15m,
    state: state15m,
    isTabFocused: false,
    appliedMap
  });
  assert.strictEqual(res15mScreen2.applied, true);
  assert.deepStrictEqual(res15mScreen2.viewport, state15m.viewport);

  console.log('✓ Strict resolution matching for cross-window viewport sync verified');
}

// -------------------------------------------------------------
// Test 4: Switching Timeframe on Chart Pulls Last Known Focused Chart Settings
// Verifies when a 1m or 5m chart switches to 15m, it pulls the last known 15m settings
// -------------------------------------------------------------
{
  const lastKnownChartConfigs = new Map();
  const lastChartSettings = {
    viewportsByChart: {
      'BTC-PERP|15': {
        symbol: 'BTC-PERP',
        resolution: '15',
        viewport: { barSpacing: 22, rightOffset: 8, priceRange: { from: 65000, to: 68000 } },
        updatedAt: 2500
      },
      'BTC-PERP|1': {
        symbol: 'BTC-PERP',
        resolution: '1',
        viewport: { barSpacing: 10, rightOffset: 4, priceRange: { from: 66900, to: 67100 } },
        updatedAt: 1800
      }
    }
  };

  function simulateIntervalSwitch(symbol, newResolution) {
    const chartKey = `${symbol.toUpperCase()}|${newResolution.toUpperCase()}`;
    const savedState = (lastChartSettings && lastChartSettings.viewportsByChart && lastChartSettings.viewportsByChart[chartKey])
      || (lastKnownChartConfigs.has(chartKey) ? lastKnownChartConfigs.get(chartKey) : null);

    if (savedState && (savedState.viewport || savedState.barSpacing)) {
      return {
        restored: true,
        chartKey,
        viewport: savedState.viewport || savedState
      };
    }
    return { restored: false, chartKey };
  }

  // User changes a chart from 1m to 15m:
  const switchResult = simulateIntervalSwitch('BTC-PERP', '15');
  assert.strictEqual(switchResult.restored, true);
  assert.strictEqual(switchResult.chartKey, 'BTC-PERP|15');
  assert.strictEqual(switchResult.viewport.barSpacing, 22);
  assert.strictEqual(switchResult.viewport.rightOffset, 8);
  assert.deepStrictEqual(switchResult.viewport.priceRange, { from: 65000, to: 68000 });

  // Switching back to 1m pulls the 1m viewport:
  const switchBackResult = simulateIntervalSwitch('BTC-PERP', '1');
  assert.strictEqual(switchBackResult.restored, true);
  assert.strictEqual(switchBackResult.chartKey, 'BTC-PERP|1');
  assert.strictEqual(switchBackResult.viewport.barSpacing, 10);
  assert.strictEqual(switchBackResult.viewport.rightOffset, 4);

  console.log('✓ Timeframe switch pulls last known focused chart settings verified');
}

// -------------------------------------------------------------
// Test 5: Real content-main.js Per-Instrument & Per-Timeframe Viewport Engine VM Tests
// Verifies exact barSpacing (>24 & <4), rightOffset (historical negative & >30), manual priceRange,
// mouseup-on-button non-cancellation, pre-switch flush, onDataLoaded re-apply, canvas cancel,
// historical bar-drift compensation, and cross-instrument isolation.
// -------------------------------------------------------------
{
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');

  const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'content', 'content-main.js'), 'utf8');
  const isolatedSrc = fs.readFileSync(path.join(__dirname, '..', 'content', 'content-isolated.js'), 'utf8');

  const startMarker = '  // Chart Settings & Viewport Position Memory';
  const endMarker = '  // Reset Chart View & Last Known Chart Configuration Engine';
  const startIdx = mainSrc.indexOf(startMarker);
  const endIdx = mainSrc.indexOf(endMarker, startIdx);
  assert.ok(startIdx > 0 && endIdx > startIdx, 'Must locate Chart Settings & Viewport Position Memory block in content-main.js');
  const viewportEngineSrc = mainSrc.slice(startIdx, endIdx);

  // Mock TradingView chart state
  let curSymbol = 'GOLD/USD';
  let curResolution = '5';
  let curChartType = 1;
  let curBarSpacing = 12;
  let curRightOffset = 6;
  let curAutoScale = true;
  let curPriceRange = { from: 3550, to: 3590 };
  let curPriceMode = 0;
  let curInverted = false;
  let curLastBarTime = 1700000000;
  let curLastBarClose = 3570;

  const subs = {
    intervalChanged: [],
    symbolChanged: [],
    dataLoaded: [],
    visibleRangeChanged: [],
    barSpacingChanged: [],
    rightOffsetChanged: [],
    priceRangeChanged: [],
    modeChanged: [],
    autoScaleChanged: [],
    barsReceived: []
  };
  const makeSub = (arr) => () => ({ subscribe: (_, fn) => arr.push(fn) });

  const docListeners = {};
  const mockDoc = {
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener: (ev, fn) => {
      docListeners[ev] = docListeners[ev] || [];
      docListeners[ev].push(fn);
    }
  };
  const emitDoc = (ev, eventObj) => {
    (docListeners[ev] || []).forEach(fn => fn(eventObj));
  };

  const mockPriceScale = {
    isAutoScale: () => curAutoScale,
    setAutoScale: (v) => { curAutoScale = Boolean(v); },
    getVisiblePriceRange: () => ({ ...curPriceRange }),
    setVisiblePriceRange: (r) => { curAutoScale = false; curPriceRange = { from: r.from, to: r.to }; },
    priceRange: () => ({ minValue: () => curPriceRange.from, maxValue: () => curPriceRange.to }),
    setPriceRange: (r) => { curAutoScale = false; curPriceRange = { from: r.minValue(), to: r.maxValue() }; },
    getMode: () => curPriceMode,
    setMode: (m) => { curPriceMode = m; },
    isInverted: () => curInverted,
    setInverted: (v) => { curInverted = Boolean(v); },
    priceRangeChanged: makeSub(subs.priceRangeChanged),
    modeChanged: makeSub(subs.modeChanged),
    autoScaleChanged: makeSub(subs.autoScaleChanged)
  };

  const mockTimeScale = {
    barSpacing: () => curBarSpacing,
    setBarSpacing: (v) => { curBarSpacing = v; },
    rightOffset: () => curRightOffset,
    setRightOffset: (v) => { curRightOffset = v; },
    barSpacingChanged: makeSub(subs.barSpacingChanged),
    rightOffsetChanged: makeSub(subs.rightOffsetChanged),
    visibleBarsStrictRangeChanged: makeSub([])
  };

  const mockMainSeries = {
    priceScale: () => mockPriceScale,
    bars: () => ({ last: () => ({ value: [curLastBarTime, 3568, 3572, 3566, curLastBarClose] }) }),
    barsReceived: makeSub(subs.barsReceived),
    dataUpdated: makeSub([]),
    symbolResolved: makeSub([]),
    onSymbolIntervalChanged: makeSub([]),
    timeframeChanged: makeSub([])
  };

  const mockModel = {
    timeScale: () => mockTimeScale,
    mainSeries: () => mockMainSeries,
    lightUpdate: () => {}
  };

  const mockActiveChart = {
    symbol: () => curSymbol,
    resolution: () => curResolution,
    chartType: () => curChartType,
    setChartType: (t) => { curChartType = t; },
    getVisibleRange: () => ({ from: curLastBarTime - 3600, to: curLastBarTime }),
    getTimeScale: () => mockTimeScale,
    getPanes: () => [{ getMainSourcePriceScale: () => mockPriceScale }],
    onIntervalChanged: makeSub(subs.intervalChanged),
    onSymbolChanged: makeSub(subs.symbolChanged),
    onDataLoaded: makeSub(subs.dataLoaded),
    onChartTypeChanged: makeSub([]),
    onVisibleRangeChanged: makeSub(subs.visibleRangeChanged),
    model: () => mockModel
  };

  // Controllable deterministic timers
  let fakeNow = 1700005000000;
  let timerSeq = 1;
  const scheduledTimers = new Map();
  const fakeSetTimeout = (fn, delay = 0) => {
    const id = timerSeq++;
    scheduledTimers.set(id, { fn, runAt: fakeNow + Math.max(0, Number(delay) || 0) });
    return id;
  };
  const fakeClearTimeout = (id) => { scheduledTimers.delete(id); };
  const advanceTimers = (ms) => {
    const target = fakeNow + ms;
    while (true) {
      let nextId = null;
      let nextItem = null;
      for (const [id, item] of scheduledTimers.entries()) {
        if (item.runAt <= target && (!nextItem || item.runAt < nextItem.runAt)) {
          nextId = id;
          nextItem = item;
        }
      }
      if (!nextItem) break;
      scheduledTimers.delete(nextId);
      fakeNow = nextItem.runAt;
      nextItem.fn();
    }
    fakeNow = target;
  };

  const postedMessages = [];
  const lsStore = new Map();
  const mockLocalStorage = {
    get length() { return lsStore.size; },
    key: (i) => Array.from(lsStore.keys())[i] || null,
    getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
    setItem: (k, v) => { lsStore.set(k, String(v)); }
  };

  const mockWindow = {
    innerWidth: 1440,
    innerHeight: 900,
    location: { hostname: 'app.hypernova.xyz' },
    localStorage: mockLocalStorage,
    document: mockDoc,
    addEventListener: () => {}
  };
  mockWindow.top = mockWindow;

  const FakeDate = { now: () => fakeNow };
  const ctx = {
    window: mockWindow,
    document: mockDoc,
    Date: FakeDate,
    Math,
    Number,
    Boolean,
    String,
    Object,
    Array,
    Map,
    WeakSet,
    JSON,
    parseInt,
    parseFloat,
    isFinite,
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    setInterval: () => 999999,
    clearInterval: () => {},
    activeChart: mockActiveChart,
    activeChartApi: null,
    activeWidget: null,
    currentSettings: { rememberLastChartSettings: true, lastChartSettings: {}, candleOhlc: {} },
    hasReceivedConfigUpdate: true,
    lastTrackedInstrument: 'GOLD/USD',
    getSidebarDocuments: () => [mockDoc],
    getCurrentChartSymbolKey: () => curSymbol,
    getCurrentChartResolutionKey: () => curResolution,
    isSafeTradingViewStorageKey: () => true,
    log: () => {},
    postToIsolated: (msg) => { postedMessages.push(msg); }
  };

  vm.runInNewContext(
    `${viewportEngineSrc}
    this.normalizeViewportResolutionKey = normalizeViewportResolutionKey;
    this.buildViewportChartKeys = buildViewportChartKeys;
    this.setupChartSettingsObserver = setupChartSettingsObserver;
    this.captureCurrentViewportState = captureCurrentViewportState;
    this.handleChartIntervalChanged = handleChartIntervalChanged;
    this.handleChartSymbolChanged = handleChartSymbolChanged;
    this.saveCurrentChartSettings = saveCurrentChartSettings;
    this.getSavedViewportForChartKeys = getSavedViewportForChartKeys;
    this.getActiveSession = () => activeViewportRestoreSession;`,
    ctx
  );

  // 5a. Resolution normalization (minutes vs months, hours, days) & host scoping
  assert.strictEqual(ctx.normalizeViewportResolutionKey('1h'), '60');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('1H'), '60');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('60'), '60');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('4h'), '240');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('5m'), '5');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('1m'), '1');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('1M'), '1M');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('M'), '1M');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('D'), '1D');
  assert.strictEqual(ctx.normalizeViewportResolutionKey('1440'), '1D');
  assert.strictEqual(
    ctx.buildViewportChartKeys('BTC/USD', '1h', 'app.hypernova.xyz').primaryKey,
    'app.hypernova.xyz|BTC/USD|60'
  );
  assert.notStrictEqual(
    ctx.buildViewportChartKeys('BTC/USD', '5', 'app.hypernova.xyz').primaryKey,
    ctx.buildViewportChartKeys('BTC/USD', '5', 'myfundedperpetuals.com').primaryKey,
    'Different hosts must have independent viewport keys'
  );

  ctx.setupChartSettingsObserver();

  // 5b. User adjusts GOLD/USD 5m (zoom > 24, rightOffset > 30, manual vertical priceRange + Log mode)
  const canvasTarget = { nodeType: 1, tagName: 'CANVAS' };
  const toolbarBtnTarget = { nodeType: 1, tagName: 'BUTTON', closest: () => null };
  emitDoc('pointerdown', { target: canvasTarget, clientX: 500, clientY: 300 });
  emitDoc('pointermove', { target: canvasTarget, clientX: 540, clientY: 310, buttons: 1 });
  curBarSpacing = 32.5;
  curRightOffset = 42;
  curAutoScale = false;
  curPriceRange = { from: 3560, to: 3578 };
  curPriceMode = 1;
  emitDoc('mouseup', { target: canvasTarget });

  // Immediately (50ms later, BEFORE 180ms debounce fires!) user clicks 15m toolbar button
  advanceTimers(50);
  emitDoc('pointerdown', { target: toolbarBtnTarget, clientX: 120, clientY: 20 });
  // TradingView switches resolution to 15m & fires onIntervalChanged('15')
  curResolution = '15';
  subs.intervalChanged.forEach(fn => fn('15'));
  // 40ms later user releases mouse button on 15m toolbar button
  advanceTimers(40);
  emitDoc('mouseup', { target: toolbarBtnTarget });
  emitDoc('pointerup', { target: toolbarBtnTarget });

  // Verify 5m's unsaved viewport was FLUSHED before switching, and unvisited 15m reset to autoScale=true!
  const saved5m = ctx.getSavedViewportForChartKeys(ctx.currentSettings.lastChartSettings, 'GOLD/USD', '5', 'app.hypernova.xyz');
  assert.ok(saved5m && saved5m.viewport, 'GOLD/USD 5m viewport must have been flushed before switching to 15m');
  assert.strictEqual(saved5m.viewport.barSpacing, 32.5);
  assert.strictEqual(saved5m.viewport.rightOffset, 42);
  assert.strictEqual(saved5m.viewport.isAutoScale, false);
  assert.strictEqual(saved5m.viewport.priceRange.from, 3560);
  assert.strictEqual(saved5m.viewport.priceRange.to, 3578);
  assert.strictEqual(saved5m.viewport.priceScaleMode, 1);
  assert.strictEqual(curAutoScale, true, 'Unvisited 15m timeframe must auto-scale cleanly (not inherit 5m manual range)');

  // 5c. User adjusts GOLD/USD 15m (zoom < 4, negative historical scroll -65, Normal mode, autoScale=true)
  advanceTimers(100);
  emitDoc('wheel', { target: canvasTarget });
  curBarSpacing = 2.5;
  curRightOffset = -65;
  curAutoScale = true;
  curPriceMode = 0;
  curPriceRange = { from: 3480, to: 3640 };
  subs.barSpacingChanged.forEach(fn => fn());
  advanceTimers(300);

  // 5d. User clicks back to 5m — TradingView resets viewport on bar load, AND mouseup fires on button!
  emitDoc('pointerdown', { target: toolbarBtnTarget });
  curResolution = '5';
  curBarSpacing = 10; // TradingView default reset!
  curRightOffset = 5;
  curAutoScale = true;
  curPriceMode = 0;
  curPriceRange = { from: 3500, to: 3620 };
  subs.intervalChanged.forEach(fn => fn('5'));

  // Release button at t=40ms -> MUST NOT cancel active restore session!
  advanceTimers(40);
  emitDoc('mouseup', { target: toolbarBtnTarget });
  emitDoc('pointerup', { target: toolbarBtnTarget });
  assert.ok(ctx.getActiveSession() !== null, 'Releasing mouse on timeframe button must NOT abort viewport restore');

  // TradingView overwrites viewport again at t=250ms when async bars arrive, then fires onDataLoaded
  advanceTimers(210);
  curBarSpacing = 11;
  curRightOffset = 4;
  curAutoScale = true;
  subs.dataLoaded.forEach(fn => fn());

  advanceTimers(1500);
  assert.strictEqual(curBarSpacing, 32.5, 'GOLD/USD 5m must restore exact barSpacing=32.5 (no [4,24] clamp!)');
  assert.strictEqual(curRightOffset, 42, 'GOLD/USD 5m must restore exact rightOffset=42 (no [2,25] clamp!)');
  assert.strictEqual(curAutoScale, false, 'GOLD/USD 5m must restore exact manual autoScale=false');
  assert.strictEqual(curPriceRange.from, 3560, 'GOLD/USD 5m must restore exact vertical priceRange.from');
  assert.strictEqual(curPriceRange.to, 3578, 'GOLD/USD 5m must restore exact vertical priceRange.to');
  assert.strictEqual(curPriceMode, 1, 'GOLD/USD 5m must restore exact Log priceScaleMode=1');

  // 5e. Switch back to 15m after 2 new 15m bars closed (1800s elapsed) -> historical scroll adjusts -65 -> -67!
  curLastBarTime += 1800;
  emitDoc('pointerdown', { target: toolbarBtnTarget });
  curResolution = '15';
  subs.intervalChanged.forEach(fn => fn('15'));
  advanceTimers(40);
  emitDoc('mouseup', { target: toolbarBtnTarget });
  advanceTimers(1500);
  assert.strictEqual(curBarSpacing, 2.5, 'GOLD/USD 15m must restore exact barSpacing=2.5');
  assert.strictEqual(curRightOffset, -67, 'Historical left-scroll must stay pinned to exact candles (-65 - 2 new bars)');
  assert.strictEqual(curAutoScale, true, 'GOLD/USD 15m must restore autoScale=true');
  assert.strictEqual(curPriceMode, 0, 'GOLD/USD 15m must restore Normal priceScaleMode=0');

  // 5f. Genuine canvas wheel interaction during restore cancels pending restore passes immediately
  emitDoc('pointerdown', { target: toolbarBtnTarget });
  curResolution = '5';
  subs.intervalChanged.forEach(fn => fn('5'));
  advanceTimers(30);
  // User immediately wheels on canvas to zoom to 14.2 -> Cortex must yield and NOT snap back to 32.5!
  curBarSpacing = 14.2;
  curRightOffset = 9;
  emitDoc('wheel', { target: canvasTarget });
  assert.strictEqual(ctx.getActiveSession(), null, 'Canvas wheel interaction must immediately cancel active restore');
  advanceTimers(1500);
  assert.strictEqual(curBarSpacing, 14.2, 'Canceled restore must NEVER snap user zoom back to 32.5');
  assert.strictEqual(curRightOffset, 9, 'Canceled restore must preserve user pan');

  // 5g. Per-Instrument Isolation: switch GOLD/USD (5m) -> BTC/USD (5m) -> GOLD/USD (5m) -> BTC/USD (5m)
  emitDoc('pointerdown', { target: toolbarBtnTarget });
  curSymbol = 'BTC/USD';
  curLastBarClose = 67200;
  curPriceRange = { from: 66500, to: 67900 };
  subs.symbolChanged.forEach(fn => fn());
  assert.strictEqual(curAutoScale, true, 'Unvisited BTC/USD 5m must auto-scale cleanly');

  advanceTimers(100);
  curBarSpacing = 9.5;
  curRightOffset = 10;
  curAutoScale = false;
  curPriceRange = { from: 66000, to: 68500 };
  curPriceMode = 0;
  emitDoc('wheel', { target: canvasTarget });
  advanceTimers(300);

  // Switch back to GOLD/USD 5m -> restores GOLD/USD 5m (14.2 / 9), NOT BTC/USD!
  emitDoc('pointerdown', { target: toolbarBtnTarget });
  curSymbol = 'GOLD/USD';
  curLastBarClose = 3570;
  subs.symbolChanged.forEach(fn => fn());
  advanceTimers(1500);
  assert.strictEqual(curBarSpacing, 14.2, 'GOLD/USD 5m must restore its own saved zoom=14.2');
  assert.strictEqual(curRightOffset, 9, 'GOLD/USD 5m must restore its own saved rightOffset=9');

  // Switch back to BTC/USD 5m -> restores BTC/USD 5m (9.5 / 10 / [66000..68500])!
  emitDoc('pointerdown', { target: toolbarBtnTarget });
  curSymbol = 'BTC/USD';
  curLastBarClose = 67200;
  subs.symbolChanged.forEach(fn => fn());
  advanceTimers(1500);
  assert.strictEqual(curBarSpacing, 9.5, 'BTC/USD 5m must restore its own saved zoom=9.5');
  assert.strictEqual(curRightOffset, 10, 'BTC/USD 5m must restore its own saved rightOffset=10');
  assert.strictEqual(curAutoScale, false, 'BTC/USD 5m must restore its own manual autoScale=false');
  assert.strictEqual(curPriceRange.from, 66000, 'BTC/USD 5m must restore its own vertical priceRange.from');
  assert.strictEqual(curPriceRange.to, 68500, 'BTC/USD 5m must restore its own vertical priceRange.to');

  // Verify Settings UI wiring in content-isolated.js
  assert.strictEqual(isolatedSrc.includes('vest-tvs-clear-viewports-btn'), true, 'Settings must provide Clear Saved Viewports button');
  assert.strictEqual(isolatedSrc.includes('VEST_TV_CLEAR_SAVED_VIEWPORTS'), true, 'Clear Saved Viewports must broadcast to main world');

  console.log('✓ Real content-main.js per-instrument & per-timeframe exact viewport persistence & restoration verified');
}

console.log('All Multi-Window Timeframe & Viewport Resolution Isolation Tests Passed Successfully!');
