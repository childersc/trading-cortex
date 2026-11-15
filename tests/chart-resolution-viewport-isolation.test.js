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

console.log('All Multi-Window Timeframe & Viewport Resolution Isolation Tests Passed Successfully!');
