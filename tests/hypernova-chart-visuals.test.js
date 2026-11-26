const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Running Hypernova Chart Visuals & Interactive Trade Controls Tests...');

const isolatedSrc = fs.readFileSync(path.join(__dirname, '../content/content-isolated.js'), 'utf8');
const mainSrc = fs.readFileSync(path.join(__dirname, '../content/content-main.js'), 'utf8');

function extractBlock(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  assert.notStrictEqual(start, -1, `Could not find start marker: ${startMarker}`);
  const end = src.indexOf(endMarker, start);
  assert.notStrictEqual(end, -1, `Could not find end marker: ${endMarker}`);
  return src.slice(start, end);
}

// 1. Test DEFAULT_HYPERNOVA_VISUALS & normalizeHypernovaVisualsConfig from content-isolated.js
{
  const block = extractBlock(
    isolatedSrc,
    'const DEFAULT_HYPERNOVA_VISUALS =',
    'const DEFAULT_PERP_FIRMS ='
  );
  const ctx = {};
  vm.runInNewContext(
    `${block}\nthis.DEFAULT_HYPERNOVA_VISUALS = DEFAULT_HYPERNOVA_VISUALS;\nthis.normalizeHypernovaVisualsConfig = normalizeHypernovaVisualsConfig;`,
    ctx
  );

  // Defaults must all be ON by default with "Current Price" label text and 11px font sizes
  const def = ctx.normalizeHypernovaVisualsConfig();
  assert.strictEqual(def.enabled, true, 'Hypernova visuals master toggle must default to ON');
  assert.strictEqual(def.positionOverlayEnabled, true, 'Position Entry box toggle must default to ON');
  assert.strictEqual(def.tpSlBoxesEnabled, true, 'Green TP / Red SL boxes toggle must default to ON');
  assert.strictEqual(def.tradeBoxesFontSize, 11, 'Default Trade & TP/SL box font size must be 11');
  assert.strictEqual(def.currentPriceLineEnabled, true, 'Custom Current Price line toggle must default to ON');
  assert.strictEqual(def.currentPriceText, 'Current Price', 'Default Current Price label text must be "Current Price"');
  assert.strictEqual(def.currentPriceFontSize, 11, 'Default Current Price label font size must be 11');
  assert.strictEqual(def.currentPriceShowLabel, true);
  assert.strictEqual(def.currentPriceShowPrice, true);

  // Explicit false opt-outs and sanitization/clamping
  const custom = ctx.normalizeHypernovaVisualsConfig({
    enabled: false,
    positionOverlayEnabled: false,
    tpSlBoxesEnabled: true,
    tradeBoxesFontSize: 30,
    currentPriceLineEnabled: false,
    currentPriceColor: '#ff00aa',
    currentPriceStyle: 'dotted',
    currentPriceWidth: 99,
    currentPriceOpacity: 5,
    currentPriceText: 'Live Mark',
    currentPriceFontSize: 4,
    currentPriceShowLabel: false,
    currentPriceShowPrice: false,
    currentPriceLabelAlign: 'left'
  });
  assert.strictEqual(custom.enabled, false);
  assert.strictEqual(custom.positionOverlayEnabled, false);
  assert.strictEqual(custom.tpSlBoxesEnabled, true);
  assert.strictEqual(custom.tradeBoxesFontSize, 18, 'Trade boxes font size should clamp to max 18');
  assert.strictEqual(custom.currentPriceLineEnabled, false);
  assert.strictEqual(custom.currentPriceColor, '#ff00aa');
  assert.strictEqual(custom.currentPriceStyle, 'dotted');
  assert.strictEqual(custom.currentPriceWidth, 4, 'Line width should clamp to max 4');
  assert.strictEqual(custom.currentPriceOpacity, 15, 'Line opacity should clamp to min 15');
  assert.strictEqual(custom.currentPriceText, 'Live Mark');
  assert.strictEqual(custom.currentPriceFontSize, 8, 'Current Price label font size should clamp to min 8');
  assert.strictEqual(custom.currentPriceShowLabel, false);
  assert.strictEqual(custom.currentPriceShowPrice, false);
  assert.strictEqual(custom.currentPriceLabelAlign, 'left');

  // Invalid inputs fall back safely
  const sanitized = ctx.normalizeHypernovaVisualsConfig({
    currentPriceColor: 'not-a-color',
    currentPriceStyle: 'zigzag',
    currentPriceLabelAlign: 'diagonal'
  });
  assert.strictEqual(sanitized.currentPriceColor, ctx.DEFAULT_HYPERNOVA_VISUALS.currentPriceColor);
  assert.strictEqual(sanitized.currentPriceStyle, 'dashed');
  assert.strictEqual(sanitized.currentPriceLabelAlign, 'right');
  console.log('✓ DEFAULT_HYPERNOVA_VISUALS defaults (all ON) & normalization/clamping verified');
}

// 2. Test Hypernova TP/SL dollar PnL calculations & formatting from content-main.js
{
  const fnBlock = extractBlock(
    mainSrc,
    'function normalizeHypernovaMainSymbol(raw)',
    'const EMPTY_NATIVE_LINE_RENDERER ='
  );
  const ctx = { latestChartMarketPrice: 60000 };
  vm.runInNewContext(
    `${fnBlock}
     this.normalizeHypernovaMainSymbol = normalizeHypernovaMainSymbol;
     this.formatHypernovaDisplayPrice = formatHypernovaDisplayPrice;
     this.formatHypernovaDollarAmount = formatHypernovaDollarAmount;
     this.formatHypernovaQty = formatHypernovaQty;
     this.computeHypernovaTargetPnlUsd = computeHypernovaTargetPnlUsd;`,
    ctx
  );

  // Symbol normalization (Hypernova, My Funded Perps, and Kalshi Pro KX*PERP tickers)
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('HYPERNOVA:BTC-USD'), 'BTC');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('ETH-PERP'), 'ETH');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('SOLUSDT'), 'SOL');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('KXTSMPERP'), 'TSM');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('KXHYPEPERP'), 'HYPE');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('KXUSTECH100PERP'), 'USTECH100');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('BTC-USD perpetual'), 'BTC');

  // Long TP & SL dollar amounts + Breakeven
  const longPos = { side: 'long', entryPrice: 60000, sizeQty: 0.5 };
  assert.strictEqual(ctx.computeHypernovaTargetPnlUsd(longPos, 61000), 500);
  assert.strictEqual(ctx.formatHypernovaDollarAmount(ctx.computeHypernovaTargetPnlUsd(longPos, 61000)), '+$500.00');
  assert.strictEqual(ctx.computeHypernovaTargetPnlUsd(longPos, 59500), -250);
  assert.strictEqual(ctx.formatHypernovaDollarAmount(ctx.computeHypernovaTargetPnlUsd(longPos, 59500)), '-$250.00');
  assert.strictEqual(ctx.formatHypernovaDollarAmount(ctx.computeHypernovaTargetPnlUsd(longPos, 60000)), '$0.00');

  // Short TP & SL dollar amounts
  const shortPos = { side: 'short', entryPrice: 60000, sizeQty: 0.25 };
  assert.strictEqual(ctx.computeHypernovaTargetPnlUsd(shortPos, 59000), 250);
  assert.strictEqual(ctx.formatHypernovaDollarAmount(ctx.computeHypernovaTargetPnlUsd(shortPos, 59000)), '+$250.00');
  assert.strictEqual(ctx.computeHypernovaTargetPnlUsd(shortPos, 60800), -200);
  assert.strictEqual(ctx.formatHypernovaDollarAmount(ctx.computeHypernovaTargetPnlUsd(shortPos, 60800)), '-$200.00');

  // Fallback qty inference from notionalUsd when sizeQty is missing
  const notionalPos = { side: 'long', entryPrice: 100, notionalUsd: 500 };
  assert.strictEqual(ctx.computeHypernovaTargetPnlUsd(notionalPos, 110), 50);

  // Qty formatting
  assert.strictEqual(ctx.formatHypernovaQty(0.1471), '0.1471');
  assert.strictEqual(ctx.formatHypernovaQty(2.5000), '2.5');
  console.log('✓ Long/Short TP/SL dollar PnL math, Breakeven ($0.00), symbol normalization & qty formatting verified');
}

// 3. Structural checks: Hypernova settings UI toggles & trade action handlers in content-isolated.js
{
  const requiredIsolatedTokens = [
    'id="vest-pf-hn-enabled"',
    'id="vest-pf-hn-pos-overlay"',
    'id="vest-pf-hn-tpsl-boxes"',
    'id="vest-pf-hn-boxes-font-size"',
    'id="vest-pf-hn-price-line"',
    'id="vest-pf-hn-price-color"',
    'id="vest-pf-hn-price-style"',
    'id="vest-pf-hn-price-width"',
    'id="vest-pf-hn-price-opacity"',
    'id="vest-pf-hn-price-text"',
    'id="vest-pf-hn-price-font-size"',
    'id="vest-pf-hn-price-align"',
    'id="vest-pf-hn-price-show-label"',
    'id="vest-pf-hn-price-show-price"',
    'Hypernova Chart Visuals',
    'VEST_TV_HYPERNOVA_POSITIONS_UPDATE',
    'VEST_TV_HYPERNOVA_SET_TP_SL',
    'VEST_TV_HYPERNOVA_CLEAR_TP_SL',
    'VEST_TV_HYPERNOVA_CLOSE_POSITION',
    'VEST_TV_HYPERNOVA_TP_SL_RESULT',
    'positions-row-',
    'position-tpsl',
    'tpsl-tp-price-input',
    'tpsl-sl-price-input',
    'tpsl-confirm',
    'tpsl-cancel',
    'close-position-menu-trigger',
    'row-short',
    '_valueTracker'
  ];
  for (const token of requiredIsolatedTokens) {
    assert.strictEqual(isolatedSrc.includes(token), true, `content-isolated.js missing required Hypernova token: ${token}`);
  }

  // Test Hypernova 5-significant-figure order price formatter
  const fmtBlock = extractBlock(
    isolatedSrc,
    'function getHypernovaDecimalPlaces(text)',
    'function setReactNativeInputValue('
  );
  const fmtCtx = {};
  vm.runInNewContext(
    `${fmtBlock}
     this.getHypernovaDecimalPlaces = getHypernovaDecimalPlaces;
     this.formatHypernovaOrderPrice = formatHypernovaOrderPrice;`,
    fmtCtx
  );
  assert.strictEqual(fmtCtx.getHypernovaDecimalPlaces('$62.632'), 3);
  assert.strictEqual(fmtCtx.getHypernovaDecimalPlaces('$60,648'), 0);
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(60648.37, 0, 'hypernova'), '60648');
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(60648.37, null, 'hypernova'), '60648');
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(62.6324, 3, 'hypernova'), '62.632');
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(3124.56, 1, 'hypernova'), '3124.6');
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(184.256, 2, 'hypernova'), '184.26');
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(0.084216, 5, 'hypernova'), '0.08422');
  // My Funded Perps & Kalshi Pro respect exact displayed row precision
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(60648.37, 2, 'myfundedperpetuals'), '60648.37');
  assert.strictEqual(fmtCtx.formatHypernovaOrderPrice(0.642, 2, 'kalshipro'), '0.64');

  // Verify rollout to Hypernova, My Funded Perpetuals, and Kalshi Pro (with Vest Markets excluded)
  assert.strictEqual(isolatedSrc.includes("const CHART_VISUALS_SUPPORTED_FIRM_IDS = ['hypernova', 'myfundedperpetuals', 'kalshipro'];"), true);
  assert.strictEqual(isolatedSrc.includes('#take-profit-price'), true);
  assert.strictEqual(isolatedSrc.includes('#stop-loss-price'), true);
  assert.strictEqual(isolatedSrc.includes('isChartVisualsHost()'), true);
  assert.strictEqual(isolatedSrc.includes('data-perps-blotter="true"'), true);
  assert.strictEqual(isolatedSrc.includes('perps-blotter__market-name'), true);
  assert.strictEqual(isolatedSrc.includes('data-tpsl-focus="take_profit"'), true);
  assert.strictEqual(isolatedSrc.includes('data-tpsl-focus="stop_loss"'), true);
  assert.strictEqual(isolatedSrc.includes('#perps-tpsl-tp-price'), true);
  assert.strictEqual(isolatedSrc.includes('#perps-tpsl-sl-price'), true);
  assert.strictEqual(isolatedSrc.includes('VEST_TV_API_POSITIONS_CAPTURED'), true);
  assert.strictEqual(isolatedSrc.includes('function isPositionsEmptyStateVisibleInDom()'), true);
  assert.strictEqual(isolatedSrc.includes('function isCurrentChartOrderTicketFlat()'), true);
  assert.strictEqual(isolatedSrc.includes('lastApiCapturedPositions = [];'), true);
  assert.strictEqual(mainSrc.includes('if (incoming.length === 0) {') && mainSrc.includes('delete hypernovaManualTpSlBySymbol[sym];'), true);

  // Test extractSymbolFromCellText (ignores leverage badges like 5x / 10x and Long/Short labels)
  const symCellBlock = extractBlock(
    isolatedSrc,
    'function normalizeHypernovaBaseSymbol(raw)',
    'function parseHypernovaNumber('
  );
  const symCellCtx = {};
  vm.runInNewContext(
    `${symCellBlock}
     this.normalizeHypernovaBaseSymbol = normalizeHypernovaBaseSymbol;
     this.extractSymbolFromCellText = extractSymbolFromCellText;`,
    symCellCtx
  );
  assert.strictEqual(symCellCtx.normalizeHypernovaBaseSymbol('KXTSMPERP'), 'TSM');
  assert.strictEqual(symCellCtx.normalizeHypernovaBaseSymbol('KXHYPEPERP'), 'HYPE');
  assert.strictEqual(symCellCtx.normalizeHypernovaBaseSymbol('KXUSTECH100PERP'), 'USTECH100');
  assert.strictEqual(symCellCtx.extractSymbolFromCellText('5x BTC-USD'), 'BTC');
  assert.strictEqual(symCellCtx.extractSymbolFromCellText('HYPE 2x'), 'HYPE');
  assert.strictEqual(symCellCtx.extractSymbolFromCellText('USTECH100 Short'), 'USTECH100');
  assert.strictEqual(symCellCtx.extractSymbolFromCellText('10x 1000PEPE-USD'), '1000PEPE');

  // Test passive API open-position extraction in content-main.js (supports MFP Accounts tab & Kalshi Pro)
  const apiPosBlock = extractBlock(
    mainSrc,
    'function extractOpenPositionsFromApiPayload(',
    'function scanReactFiberForOpenPositions()'
  );
  const normSymBlock = extractBlock(
    mainSrc,
    'function normalizeHypernovaMainSymbol(raw)',
    'function formatHypernovaDisplayPrice('
  );
  const apiPosCtx = {};
  vm.runInNewContext(
    `${normSymBlock}\n${apiPosBlock}\nthis.extractOpenPositionsFromApiPayload = extractOpenPositionsFromApiPayload;`,
    apiPosCtx
  );
  const mockApiRes = {
    data: {
      openPositions: [
        { symbol: 'NVDA-USD', side: 'LONG', entryPrice: 130.59, size: 10, unrealizedPnl: 12.5, stopLossPrice: 128.0, takeProfitPrice: 138.0 },
        { symbol: 'KXHYPEPERP', szi: -0.7, avgEntryPrice: 62.42, markPrice: 62.10, stopLoss: 65.5 },
        { symbol: 'ETH-USD', side: 'LONG', entryPrice: 2500, exitPrice: 2550, size: 1, status: 'closed' }
      ]
    }
  };
  const extractedApiPos = apiPosCtx.extractOpenPositionsFromApiPayload(mockApiRes, '/api/v1/account/positions');
  assert.strictEqual(extractedApiPos.length, 2, 'Should extract 2 live open positions and skip the closed trade');
  assert.strictEqual(extractedApiPos[0].symbol, 'NVDA');
  assert.strictEqual(extractedApiPos[0].side, 'long');
  assert.strictEqual(extractedApiPos[0].slPrice, 128);
  assert.strictEqual(extractedApiPos[0].tpPrice, 138);
  assert.strictEqual(extractedApiPos[1].symbol, 'HYPE');
  assert.strictEqual(extractedApiPos[1].side, 'short');
  assert.strictEqual(extractedApiPos[1].sizeQty, 0.7);
  assert.strictEqual(extractedApiPos[1].slPrice, 65.5);
  assert.strictEqual(apiPosCtx.extractOpenPositionsFromApiPayload(mockApiRes, '/api/v1/trade/history').length, 0, 'Should ignore history endpoints');

  // Test getChartVisualsMainWorldFirmId across all 4 venues
  const hostFnBlock = extractBlock(
    mainSrc,
    'function getChartVisualsMainWorldFirmId()',
    'function isHypernovaMainWorldHost()'
  );
  const runHostCheck = (hostname) => {
    const c = { window: { top: { location: { hostname } }, location: { hostname, href: `https://${hostname}/trade` } } };
    vm.runInNewContext(`${hostFnBlock}\nthis.res = getChartVisualsMainWorldFirmId();`, c);
    return c.res;
  };
  assert.strictEqual(runHostCheck('app.hypernova.xyz'), 'hypernova');
  assert.strictEqual(runHostCheck('myfundedperpetuals.com'), 'myfundedperpetuals');
  assert.strictEqual(runHostCheck('pro.kalshi.com'), 'kalshipro');
  assert.strictEqual(runHostCheck('next.vestmarkets.com'), null, 'Vest Markets should remain excluded');
  console.log('✓ Multi-venue Chart Visuals rollout (Hypernova, My Funded Perps, Kalshi Pro), Kalshi blotter & KX symbol mapping, passive API position capture & tick formatting verified');
}

// 4. Test native TradingView Current Price line styling helpers (modifies existing native line, no duplicate)
{
  const nativeBlock = extractBlock(
    mainSrc,
    'function hypernovaHexToRgba(hex, opacityPct)',
    'function findNativeSeriesPriceLinePaneViews('
  );
  const ctx = {};
  vm.runInNewContext(
    `${nativeBlock}
     this.hypernovaHexToRgba = hypernovaHexToRgba;
     this.hypernovaStyleToTvLineStyle = hypernovaStyleToTvLineStyle;
     this.applyHypernovaStyleToPriceLineRenderer = applyHypernovaStyleToPriceLineRenderer;`,
    ctx
  );

  assert.strictEqual(ctx.hypernovaHexToRgba('#38bdf8', 100), '#38bdf8');
  assert.strictEqual(ctx.hypernovaHexToRgba('#38bdf8', 50), 'rgba(56, 189, 248, 0.50)');
  assert.strictEqual(ctx.hypernovaStyleToTvLineStyle('solid'), 0);
  assert.strictEqual(ctx.hypernovaStyleToTvLineStyle('dotted'), 1);
  assert.strictEqual(ctx.hypernovaStyleToTvLineStyle('dashed'), 2);

  const mockRenderer = { _data: { y: 240, color: '#22c55e', linewidth: 1, linestyle: 1 } };
  const ok = ctx.applyHypernovaStyleToPriceLineRenderer(mockRenderer, 'rgba(56, 189, 248, 0.85)', 2.5, 0);
  assert.strictEqual(ok, true);
  assert.strictEqual(mockRenderer._data.color, 'rgba(56, 189, 248, 0.85)');
  assert.strictEqual(mockRenderer._data.linewidth, 2.5);
  assert.strictEqual(mockRenderer._data.linestyle, 0);
  console.log('✓ Native TradingView Current Price line styling helpers verified');
}

// 5. Structural checks: 2-row Long/Short entry box (BE/TP/SL/X), Green TP / Red SL boxes, native price line styling & font scaling in content-main.js
{
  const requiredMainTokens = [
    'vest-hn-position-box',
    'vest-hn-entry-top',
    'vest-hn-entry-bottom',
    'vest-hn-side-badge',
    'vest-hn-qty-val',
    'vest-hn-pnl-val',
    'vest-hn-entry-price',
    'vest-hn-ctrl-btn be-btn',
    'vest-hn-ctrl-btn tp-btn',
    'vest-hn-ctrl-btn sl-btn',
    'vest-hn-ctrl-btn close-btn',
    'vest-hn-tp-box',
    'vest-hn-sl-box',
    'syncHypernovaNativeCurrentPriceLine(model, mainSeries, hnCfg, liveCurY)',
    'restoreHypernovaNativeCurrentPriceLine',
    '--hn-fs',
    '--hn-scale',
    'startHypernovaTpSlDrag',
    'renderHypernovaChartVisuals(ctx, targetCanvas, symbolKey, extracted.model, mainSeries, priceToY, hypernovaYToPrice, cssWidth, cssHeight)',
    'removeHypernovaOverlayWidgets();',
    "case 'VEST_TV_HYPERNOVA_POSITIONS_UPDATE':",
    "case 'VEST_TV_HYPERNOVA_TP_SL_RESULT':"
  ];
  for (const token of requiredMainTokens) {
    assert.strictEqual(mainSrc.includes(token), true, `content-main.js missing required Hypernova token: ${token}`);
  }
  // Ensure Current Price section does NOT draw a duplicate horizontal line over TradingView's native current price line
  const currentPriceBlock = extractBlock(
    mainSrc,
    'function renderHypernovaChartVisuals(',
    '// 1b. Hypernova Live "Breach Price"'
  );
  assert.strictEqual(currentPriceBlock.includes('ctx.lineTo(cssWidth'), false, 'Current Price section must modify the existing native price line instead of drawing a duplicate canvas line over it');
  console.log('✓ 2-row Long/Short BE/TP/SL/X box, Green TP / Red SL boxes, native price line modifier & font scaling verified in content-main.js');
}

// 6. Hypernova Live Breach Price Line & Box (settings defaults, clamping, DOM scraping, priority & canvas rendering)
{
  const block = extractBlock(
    isolatedSrc,
    'const DEFAULT_HYPERNOVA_VISUALS =',
    'const DEFAULT_PERP_FIRMS ='
  );
  const ctx = {};
  vm.runInNewContext(
    `${block}\nthis.DEFAULT_HYPERNOVA_VISUALS = DEFAULT_HYPERNOVA_VISUALS;\nthis.normalizeHypernovaVisualsConfig = normalizeHypernovaVisualsConfig;`,
    ctx
  );

  const def = ctx.normalizeHypernovaVisualsConfig();
  assert.strictEqual(def.breachPriceLineEnabled, true, 'Breach Price line must default to ON');
  assert.strictEqual(def.breachPriceColor, '#ef4444', 'Breach Price line must default to red (#ef4444)');
  assert.strictEqual(def.breachPriceStyle, 'dashed');
  assert.strictEqual(def.breachPriceWidth, 1.5);
  assert.strictEqual(def.breachPriceOpacity, 90);
  assert.strictEqual(def.breachPriceText, 'Breach Price');
  assert.strictEqual(def.breachPriceFontSize, 11);
  assert.strictEqual(def.breachPriceShowLabel, true);
  assert.strictEqual(def.breachPriceShowPrice, true);
  assert.strictEqual(def.breachPriceLabelAlign, 'right');

  const clamped = ctx.normalizeHypernovaVisualsConfig({
    breachPriceLineEnabled: false,
    breachPriceColor: 'not-a-color',
    breachPriceStyle: 'dotted',
    breachPriceWidth: 99,
    breachPriceOpacity: 5,
    breachPriceText: 'Account Breach',
    breachPriceFontSize: 40,
    breachPriceShowLabel: false,
    breachPriceShowPrice: false,
    breachPriceLabelAlign: 'left'
  });
  assert.strictEqual(clamped.breachPriceLineEnabled, false);
  assert.strictEqual(clamped.breachPriceColor, '#ef4444');
  assert.strictEqual(clamped.breachPriceStyle, 'dotted');
  assert.strictEqual(clamped.breachPriceWidth, 4);
  assert.strictEqual(clamped.breachPriceOpacity, 15);
  assert.strictEqual(clamped.breachPriceText, 'Account Breach');
  assert.strictEqual(clamped.breachPriceFontSize, 22);
  assert.strictEqual(clamped.breachPriceShowLabel, false);
  assert.strictEqual(clamped.breachPriceShowPrice, false);
  assert.strictEqual(clamped.breachPriceLabelAlign, 'left');

  // Verify Hypernova DOM selectors & Settings UI IDs in content-isolated.js
  const requiredIsoBreachTokens = [
    '[data-testid="order-details-breach-price"]',
    'td[data-testid$="-breach"]',
    'function ensureHypernovaBreachObserver()',
    'function scrapeHypernovaOrderTicketBreachPrice()',
    'id="vest-pf-hn-breach-line"',
    'id="vest-pf-hn-breach-color"',
    'id="vest-pf-hn-breach-style"',
    'id="vest-pf-hn-breach-width"',
    'id="vest-pf-hn-breach-opacity"',
    'id="vest-pf-hn-breach-text"',
    'id="vest-pf-hn-breach-font-size"',
    'id="vest-pf-hn-breach-align"',
    'id="vest-pf-hn-breach-show-label"',
    'id="vest-pf-hn-breach-show-price"'
  ];
  for (const token of requiredIsoBreachTokens) {
    assert.strictEqual(isolatedSrc.includes(token), true, `content-isolated.js missing required Breach Price token: ${token}`);
  }

  // Verify resolveActiveHypernovaBreachPrice priority logic in VM
  const resolveBlock = extractBlock(
    mainSrc,
    'function resolveActiveHypernovaBreachPrice(',
    'function ensureHypernovaVisualStyles('
  );
  const normSymBlock = extractBlock(
    mainSrc,
    'function normalizeHypernovaMainSymbol(',
    'function extractNativeHypernovaChartLines('
  );
  const breachCtx = {
    firmId: 'hypernova',
    liveHypernovaOrderTicketBreach: null
  };
  vm.runInNewContext(
    `
      function getChartVisualsMainWorldFirmId() { return firmId; }
      ${normSymBlock}
      ${resolveBlock}
      this.resolveActiveHypernovaBreachPrice = resolveActiveHypernovaBreachPrice;
    `,
    breachCtx
  );

  // Shows Order Ticket live breach price ONLY when NO position is open yet
  breachCtx.liveHypernovaOrderTicketBreach = { price: 32.279, decimals: 3, symbol: 'HYPE', source: 'order-ticket' };
  const fromTicketWhenFlat = breachCtx.resolveActiveHypernovaBreachPrice('HYPE/USDC', null);
  assert.strictEqual(fromTicketWhenFlat.price, 32.279);
  assert.strictEqual(fromTicketWhenFlat.source, 'order-ticket');

  // MUST NOT show Breach Price when a position IS open (even if order ticket or position row has a breach price!)
  assert.strictEqual(
    breachCtx.resolveActiveHypernovaBreachPrice('HYPE/USDC', { symbol: 'HYPE', side: 'long', entryPrice: 58, breachPrice: 64.478, priceDecimals: 3 }),
    null,
    'Breach Price must be hidden whenever a position is already open'
  );

  // Returns null when flat and order ticket is N/A
  breachCtx.liveHypernovaOrderTicketBreach = null;
  assert.strictEqual(breachCtx.resolveActiveHypernovaBreachPrice('HYPE/USDC', null), null);

  // Returns null on non-Hypernova venues
  breachCtx.firmId = 'kalshipro';
  breachCtx.liveHypernovaOrderTicketBreach = { price: 32.279, decimals: 3, symbol: 'HYPE', source: 'order-ticket' };
  assert.strictEqual(breachCtx.resolveActiveHypernovaBreachPrice('HYPE/USDC', null), null);

  // Verify canvas rendering block draws red Breach Price line, box, and off-screen Above/Below chart badges
  const breachRenderBlock = extractBlock(
    mainSrc,
    '// 1b. Hypernova Live "Breach Price"',
    '// 2. Active Position Overlay'
  );
  assert.strictEqual(breachRenderBlock.includes('ctx.lineTo(cssWidth, clampedBreachY)'), true, 'Must draw horizontal Breach Price line across chart');
  assert.strictEqual(breachRenderBlock.includes('▲ Above chart ·'), true, 'Must render clamped Above chart badge when breach price is above viewport');
  assert.strictEqual(breachRenderBlock.includes('▼ Below chart ·'), true, 'Must render clamped Below chart badge when breach price is below viewport');
  console.log('✓ Hypernova live Breach Price red line, badge box, off-screen clamp, settings controls & priority verified');
}

// 7. Right-click / Escape / pointercancel cancellation during TP/SL drag
{
  const dragBlock = extractBlock(
    mainSrc,
    'function startHypernovaTpSlDrag(',
    'function renderHypernovaChartVisuals('
  );

  function createDragHarness() {
    const viewListeners = {};
    const docListeners = {};
    const posted = [];
    let renderCalls = 0;

    const makeEmitter = (map) => ({
      addEventListener(type, fn) {
        if (!map[type]) map[type] = [];
        map[type].push(fn);
      },
      removeEventListener(type, fn) {
        if (!map[type]) return;
        const idx = map[type].indexOf(fn);
        if (idx >= 0) map[type].splice(idx, 1);
      },
      emit(type, evt) {
        const list = [...(map[type] || [])];
        list.forEach(fn => fn(evt));
      }
    });

    const view = makeEmitter(viewListeners);
    const ownerDoc = makeEmitter(docListeners);
    ownerDoc.defaultView = view;

    const ctx = {
      window: {
        top: { postMessage(msg) { posted.push(msg); } }
      },
      activeHypernovaDrag: null,
      latestHypernovaYToPriceFn: (y) => 100 - y * 0.1,
      latestHypernovaPaneRect: { top: 0, height: 500 },
      hypernovaManualTpSlBySymbol: {},
      computeHypernovaTargetPnlUsd: () => -50,
      formatHypernovaDollarAmount: (v) => `-$${Math.abs(v).toFixed(2)}`,
      scheduleIctSessionsRender: () => { renderCalls++; },
      setTimeout,
      Date
    };
    vm.runInNewContext(`${dragBlock}\nthis.startHypernovaTpSlDrag = startHypernovaTpSlDrag;`, ctx);
    return { ctx, view, ownerDoc, posted, getRenderCalls: () => renderCalls };
  }

  const pos = { symbol: 'HYPE', side: 'long', entryPrice: 60, sizeQty: 10, notionalUsd: 600, unrealizedPnl: 0 };
  const makeEvt = (overrides = {}) => {
    let prevented = false;
    let stopped = false;
    return {
      button: 0,
      buttons: 1,
      pointerId: 1,
      clientY: 200,
      currentTarget: { setPointerCapture() {}, releasePointerCapture() {} },
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; },
      stopImmediatePropagation() { stopped = true; },
      get prevented() { return prevented; },
      get stopped() { return stopped; },
      ...overrides
    };
  };

  // 7a. Chorded right-click during drag (W3C Pointer Events: pointermove with buttons===3 / button===2) cancels without submitting AND swallows trailing contextmenu
  {
    const h = createDragHarness();
    h.ctx.startHypernovaTpSlDrag(makeEvt({ button: 0, clientY: 200 }), 'sl', pos, h.ownerDoc);
    assert.ok(h.ctx.activeHypernovaDrag, 'Drag must start on left pointerdown');
    h.view.emit('pointermove', makeEvt({ button: -1, buttons: 1, clientY: 250 }));
    assert.strictEqual(h.ctx.activeHypernovaDrag.previewPrice, 75);

    const rightChordMove = makeEvt({ button: 2, buttons: 3, clientY: 250 });
    h.view.emit('pointermove', rightChordMove);
    assert.strictEqual(h.ctx.activeHypernovaDrag, null, 'Chorded right-click must immediately cancel drag');
    assert.strictEqual(rightChordMove.prevented, true);

    const trailingCm = makeEvt({ button: 2 });
    h.view.emit('contextmenu', trailingCm);
    assert.strictEqual(trailingCm.prevented, true, 'Trailing contextmenu after right-click cancel must be suppressed');

    // Releasing left button after cancel must NOT submit SL
    h.view.emit('pointerup', makeEvt({ button: 0, buttons: 0, clientY: 250 }));
    assert.strictEqual(h.posted.length, 0, 'Right-click cancelled drag must NEVER post VEST_TV_HYPERNOVA_SET_TP_SL');
    assert.strictEqual(h.ctx.hypernovaManualTpSlBySymbol.HYPE, undefined, 'Right-click cancelled drag must NOT mutate manual TP/SL cache');
  }

  // 7b. Right-button mousedown cancels TP drag without submitting
  {
    const h = createDragHarness();
    h.ctx.startHypernovaTpSlDrag(makeEvt({ button: 0, clientY: 150 }), 'tp', pos, h.ownerDoc);
    h.ownerDoc.emit('mousedown', makeEvt({ button: 2, buttons: 2 }));
    assert.strictEqual(h.ctx.activeHypernovaDrag, null, 'Right mousedown must cancel TP drag');
    h.view.emit('pointerup', makeEvt({ button: 0, buttons: 0, clientY: 120 }));
    assert.strictEqual(h.posted.length, 0, 'Cancelled TP drag must NEVER submit');
  }

  // 7c. Escape key and pointercancel both cancel without submitting
  {
    const h = createDragHarness();
    h.ctx.startHypernovaTpSlDrag(makeEvt({ button: 0, clientY: 200 }), 'sl', pos, h.ownerDoc);
    h.view.emit('keydown', makeEvt({ key: 'Escape' }));
    assert.strictEqual(h.ctx.activeHypernovaDrag, null, 'Escape must cancel drag');
    assert.strictEqual(h.posted.length, 0);

    h.ctx.startHypernovaTpSlDrag(makeEvt({ button: 0, clientY: 200 }), 'tp', pos, h.ownerDoc);
    h.view.emit('pointercancel', makeEvt());
    assert.strictEqual(h.ctx.activeHypernovaDrag, null, 'pointercancel must cancel drag without submitting');
    assert.strictEqual(h.posted.length, 0);
  }

  // 7d. Normal left-button drag + release still submits TP/SL properly
  {
    const h = createDragHarness();
    h.ctx.startHypernovaTpSlDrag(makeEvt({ button: 0, clientY: 200 }), 'sl', pos, h.ownerDoc);
    h.view.emit('pointermove', makeEvt({ button: -1, buttons: 1, clientY: 260 }));
    h.view.emit('pointerup', makeEvt({ button: 0, buttons: 0, clientY: 260 }));
    assert.strictEqual(h.ctx.activeHypernovaDrag, null);
    assert.strictEqual(h.posted.length, 1, 'Normal left-button release must submit VEST_TV_HYPERNOVA_SET_TP_SL');
    assert.strictEqual(h.posted[0].type, 'VEST_TV_HYPERNOVA_SET_TP_SL');
    assert.strictEqual(h.posted[0].payload.type, 'sl');
    assert.strictEqual(h.posted[0].payload.price, 74);
  }
  console.log('✓ Right-click, Escape, and pointercancel TP/SL drag cancellation verified');
}

// 8. Real-time Entry Indicator PnL synchronization with live Positions table
{
  const pnlBlock = extractBlock(
    mainSrc,
    'function computeLiveHypernovaUnrealizedPnl(',
    'function resolveActiveHypernovaPosition('
  );
  const parseBlock = extractBlock(
    isolatedSrc,
    'function parseHypernovaNumber(',
    'function getHypernovaDecimalPlaces('
  );
  const ctx = {};
  vm.runInNewContext(
    `${pnlBlock}\n${parseBlock}\nthis.computeLiveHypernovaUnrealizedPnl = computeLiveHypernovaUnrealizedPnl;\nthis.parseHypernovaNumber = parseHypernovaNumber;`,
    ctx
  );

  // Exact GOLD screenshot case: Positions table shows $124.07 at Mark $3,568.7 while chart last candle is $3,568.9
  const liveDomMatch = { symbol: 'GOLD', side: 'short', entryPrice: 3573.1, markPrice: 3568.7, unrealizedPnl: 124.07, source: 'dom' };
  const pnlFromLiveDom = ctx.computeLiveHypernovaUnrealizedPnl(liveDomMatch, null, 'short', 3573.1, 27.9158, 3568.9);
  assert.strictEqual(pnlFromLiveDom, 124.07, 'Entry box PnL must match live Positions table PnL ($124.07) to the cent');

  // Negative PnL & Unicode minus parsing
  assert.strictEqual(ctx.parseHypernovaNumber('$124.07 (1.24%)'), 124.07);
  assert.strictEqual(ctx.parseHypernovaNumber('-$42.50 (-0.42%)'), -42.5);
  assert.strictEqual(ctx.parseHypernovaNumber('\u2212$18.25 (-0.18%)'), -18.25);

  // When Positions tab is hidden (source: 'cached'), project live chart price delta from cached Mark Price
  const cachedMatch = { symbol: 'GOLD', side: 'short', entryPrice: 3573.1, markPrice: 3568.7, unrealizedPnl: 124.07, source: 'cached' };
  const projectedPnl = ctx.computeLiveHypernovaUnrealizedPnl(cachedMatch, null, 'short', 3573.1, 27.9158, 3567.7);
  assert.ok(Math.abs(projectedPnl - (124.07 + 27.9158)) < 0.001, 'Cached PnL must project live price delta when Positions tab is hidden');

  // Fallback when no Positions PnL is present yet
  const fallbackPnl = ctx.computeLiveHypernovaUnrealizedPnl(null, null, 'long', 100, 5, 104);
  assert.strictEqual(fallbackPnl, 20);

  // Verify live MutationObserver is wired on Positions tbody in content-isolated.js
  assert.strictEqual(isolatedSrc.includes('function ensureHypernovaPositionsTableObserver()'), true);
  assert.strictEqual(isolatedSrc.includes("source: 'dom'"), true);
  assert.strictEqual(isolatedSrc.includes("source: 'cached'"), true);
  console.log('✓ Real-time Positions table PnL priority, live MutationObserver & cached delta projection verified');
}

// 9. Replacing (suppressing duplicate) native TradingView SL, TP & Position boxes in-place without touching Breach or Limit orders
{
  const nativeBlock = extractBlock(
    mainSrc,
    'const EMPTY_NATIVE_LINE_RENDERER =',
    'function computeLiveHypernovaUnrealizedPnl('
  );
  const ctx = {
    isHypernovaMainWorldHost: () => true,
    latestHypernovaYToPriceFn: null,
    cfg: { enabled: true, tpSlBoxesEnabled: true, positionOverlayEnabled: true }
  };
  vm.runInNewContext(
    `
      function getHypernovaVisualsConfig() { return cfg; }
      ${nativeBlock}
      this.extractNativeHypernovaChartLines = extractNativeHypernovaChartLines;
      this.syncHypernovaNativeTradeLineSuppression = syncHypernovaNativeTradeLineSuppression;
      this.EMPTY_NATIVE_LINE_RENDERER = EMPTY_NATIVE_LINE_RENDERER;
    `,
    ctx
  );

  const origSlRenderer = { _data: { text: 'SL', quantityText: '11.9226 +$12.39', bodyBackgroundColor: '#ef4444', cancelButtonBackgroundColor: '#ef4444', lineColor: '#ef4444' }, draw() {} };
  const origTpRenderer = { _data: { text: 'TP', quantityText: '11.9226 +$48.50', bodyBackgroundColor: '#10b981', cancelButtonBackgroundColor: '#10b981', lineColor: '#10b981' }, draw() {} };
  const origPosRenderer = { _data: { text: 'LONG +$30.09', quantityText: '11.9226', bodyBackgroundColor: '#10b981', closeButtonBackgroundColor: '#10b981', lineColor: '#10b981' }, draw() {} };
  const origBreachRenderer = { _data: { text: 'Breach', bodyBackgroundColor: '#ef4444', lineColor: '#ef4444' }, draw() {} };
  const origLimitRenderer = { _data: { text: 'Buy Limit', quantityText: '5.0', bodyBackgroundColor: '#3b82f6', cancelButtonBackgroundColor: '#3b82f6', lineColor: '#3b82f6' }, draw() {} };

  const slPv = { renderer() { return { _renderers: [origSlRenderer] }; } };
  const tpPv = { renderer() { return { _renderers: [origTpRenderer] }; } };
  const posPv = { renderer() { return { _renderers: [origPosRenderer] }; } };
  const breachPv = { renderer() { return { _renderers: [origBreachRenderer] }; } };
  const limitPv = { renderer() { return { _renderers: [origLimitRenderer] }; } };

  // Minified sources with mangled constructors, rendering via topPaneViews(pane)
  const slSrc = { _price: 3575.2, topPaneViews() { return [slPv]; } };
  const tpSrc = { _price: 3590.0, topPaneViews() { return [tpPv]; } };
  const posSrc = { _price: 3574.2, topPaneViews() { return [posPv]; } };
  const breachSrc = { _price: 3571.43, topPaneViews() { return [breachPv]; } };
  const limitSrc = { _price: 3560.0, topPaneViews() { return [limitPv]; } };
  const rectDrawingSrc = { toolname: 'LineToolRectangle', _price: 3575.2, paneViews() { return [slPv]; } };

  let updateViewsCalls = 0;
  let lightUpdateCalls = 0;
  const pane = { orderedSources: () => [slSrc, tpSrc, posSrc, breachSrc, limitSrc, rectDrawingSrc] };
  const model = {
    mainSeries: () => ({}),
    panes: () => [pane],
    updateAllViews: () => { updateViewsCalls++; },
    lightUpdate: () => { lightUpdateCalls++; }
  };

  const domHint = { entryPrice: 3574.2, slPrice: 3575.2, tpPrice: 3590.0 };
  const extracted = ctx.extractNativeHypernovaChartLines(model, domHint);
  assert.strictEqual(extracted.slLines.length, 1, 'Must detect minified native SL OrderLine');
  assert.strictEqual(extracted.tpLines.length, 1, 'Must detect minified native TP OrderLine');
  assert.strictEqual(extracted.positionLines.length, 1, 'Must detect minified native PositionLine');
  assert.strictEqual(extracted.slLine.pnlUsd, 12.39, 'Must parse exact native SL dollar PnL (+$12.39)');
  assert.strictEqual(extracted.tpLine.pnlUsd, 48.5, 'Must parse exact native TP dollar PnL (+$48.50)');

  // Suppress duplicates when our visuals are ON
  ctx.syncHypernovaNativeTradeLineSuppression(model, extracted, ctx.cfg);
  assert.strictEqual(slPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native SL box renderer must be suppressed when tpSlBoxesEnabled is ON');
  assert.strictEqual(tpPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native TP box renderer must be suppressed when tpSlBoxesEnabled is ON');
  assert.strictEqual(posPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native Position box renderer must be suppressed when positionOverlayEnabled is ON');
  assert.notStrictEqual(breachPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native Breach line must NEVER be suppressed');
  assert.notStrictEqual(limitPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native Buy Limit order must NEVER be suppressed');
  assert.ok(updateViewsCalls >= 1 && lightUpdateCalls >= 1, 'Suppressing native views must trigger TradingView repaint');

  // Re-extraction on subsequent frame after suppression MUST still recognize suppressed sources cleanly!
  const extractedFrame2 = ctx.extractNativeHypernovaChartLines(model, domHint);
  assert.strictEqual(extractedFrame2.slLines.length, 1, 'Frame 2 extraction must still recognize wrapped SL OrderLine');
  assert.strictEqual(extractedFrame2.tpLines.length, 1, 'Frame 2 extraction must still recognize wrapped TP OrderLine');
  assert.strictEqual(extractedFrame2.positionLines.length, 1, 'Frame 2 extraction must still recognize wrapped PositionLine');

  // Turning tpSlBoxesEnabled OFF immediately restores native SL & TP boxes without touching Position suppression!
  ctx.cfg = { enabled: true, tpSlBoxesEnabled: false, positionOverlayEnabled: true, tradeLineStyle: 'solid', tradeLineWidth: 1.5 };
  ctx.syncHypernovaNativeTradeLineSuppression(model, extractedFrame2, ctx.cfg);
  assert.notStrictEqual(slPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native SL renderer must restore when tpSlBoxesEnabled is OFF');
  assert.notStrictEqual(tpPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native TP renderer must restore when tpSlBoxesEnabled is OFF');
  assert.strictEqual(posPv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Native Position renderer stays suppressed while positionOverlayEnabled is ON');

  // 9b. Exact Hypernova TradingView LineToolOrder / LineToolPosition + _adapter overwrite (solid default, configurable style, lazy _setPaneViews)
  {
    ctx.cfg = { enabled: true, tpSlBoxesEnabled: true, positionOverlayEnabled: true, tradeLineStyle: 'solid', tradeLineWidth: 2 };
    const makeTvProp = (initial) => {
      let val = initial;
      return { value: () => val, setValue: (v) => { val = v; } };
    };
    const makeTvLineTool = ({ toolname, price, bodyText, tooltip, initialStyle = 2, lazyPaneView = false }) => {
      const props = { lineStyle: makeTvProp(initialStyle), lineWidth: makeTvProp(1) };
      let cancelCalled = false;
      const pv = { renderer: () => ({ draw() {} }) };
      const src = {
        toolname,
        _paneViews: lazyPaneView ? [] : [pv],
        points: () => [{ price }],
        properties: () => props,
        paneViews: () => src._paneViews,
        _setPaneViews(views) { src._paneViews = views; },
        adapter: () => src._adapter
      };
      src._adapter = {
        _line: src,
        _data: { bodyText, quantityText: '' },
        getPrice: () => price,
        getText: () => bodyText,
        getQuantity: () => '',
        getLineColor: () => '#ef4444',
        getLineStyle: () => props.lineStyle.value(),
        setLineStyle: (v) => { props.lineStyle.setValue(v); return src._adapter; },
        getLineWidth: () => props.lineWidth.value(),
        setLineWidth: (v) => { props.lineWidth.setValue(v); return src._adapter; },
        getCancelTooltip: () => tooltip,
        callCancelCallback: () => { cancelCalled = true; },
        setCancelButtonBackgroundColor: () => src._adapter
      };
      return { src, pv, props, wasCancelled: () => cancelCalled };
    };

    const hnSl = makeTvLineTool({ toolname: 'LineToolOrder', price: 3569.0, bodyText: 'SL 27.7440  +$29.41', tooltip: 'Cancel SL', initialStyle: 2, lazyPaneView: true });
    const hnTp = makeTvLineTool({ toolname: 'LineToolOrder', price: 3550.0, bodyText: 'TP 27.7440  +$557.65', tooltip: 'Cancel TP', initialStyle: 2 });
    const hnPos = makeTvLineTool({ toolname: 'LineToolOrder', price: 3570.1, bodyText: '27.7440  +$100.97', tooltip: 'Close position', initialStyle: 0 });
    const hnBreach = makeTvLineTool({ toolname: 'LineToolPosition', price: 3571.3, bodyText: 'Breach', tooltip: '', initialStyle: 2 });
    const hnPass = makeTvLineTool({ toolname: 'LineToolPosition', price: 3530.0, bodyText: 'Pass', tooltip: '', initialStyle: 2 });
    const hnLimit = makeTvLineTool({ toolname: 'LineToolOrder', price: 3560.0, bodyText: 'Buy Limit', tooltip: 'Cancel order', initialStyle: 2 });

    const hnModel = {
      mainSeries: () => ({}),
      panes: () => [{ dataSources: () => [hnSl.src, hnTp.src, hnPos.src, hnBreach.src, hnPass.src, hnLimit.src] }],
      updateAllViews: () => {},
      lightUpdate: () => {}
    };

    const hint = { side: 'short', entryPrice: 3570.1, slPrice: 3569.0, tpPrice: 3550.0 };
    const hnExtracted = ctx.extractNativeHypernovaChartLines(hnModel, hint);
    assert.strictEqual(hnExtracted.slLines.length, 1, 'Must match Hypernova LineToolOrder SL box ("SL 27.7440  +$29.41")');
    assert.strictEqual(hnExtracted.slLine.pnlUsd, 29.41, 'Must parse Hypernova SL dollar PnL (+$29.41)');
    assert.strictEqual(hnExtracted.tpLines.length, 1, 'Must match Hypernova LineToolOrder TP box');
    assert.strictEqual(hnExtracted.positionLines.length, 1, 'Must match Hypernova Position Entry LineToolOrder ("Close position")');

    ctx.syncHypernovaNativeTradeLineSuppression(hnModel, hnExtracted, ctx.cfg);

    // Overwritten native line code enforces solid (0) even if Hypernova calls setLineStyle(2) (dashed) again!
    assert.strictEqual(hnSl.props.lineStyle.value(), 0, 'SL native LineToolOrder must be overwritten to solid (0)');
    assert.strictEqual(hnSl.props.lineWidth.value(), 2, 'SL native LineToolOrder width must match tradeLineWidth');
    hnSl.src._adapter.setLineStyle(2);
    assert.strictEqual(hnSl.props.lineStyle.value(), 0, 'Hypernova re-applying dashed (2) must stay overwritten to solid (0)');
    assert.strictEqual(hnSl.src._adapter.getLineStyle(), 0);

    // Lazy async OrderPaneView mounted via _setPaneViews gets immediately suppressed!
    hnSl.src._setPaneViews([hnSl.pv]);
    assert.strictEqual(hnSl.pv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Lazily mounted OrderPaneView for SL must be immediately suppressed');
    assert.strictEqual(hnTp.pv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'TP OrderPaneView must be suppressed');
    assert.strictEqual(hnPos.pv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Position Entry OrderPaneView must be suppressed');

    // Breach, Pass, and Limit orders stay completely untouched!
    assert.strictEqual(hnBreach.props.lineStyle.value(), 2, 'Breach line must remain untouched');
    assert.strictEqual(hnPass.props.lineStyle.value(), 2, 'Pass line must remain untouched');
    assert.strictEqual(hnLimit.props.lineStyle.value(), 2, 'Buy Limit order must remain untouched');
    assert.notStrictEqual(hnBreach.pv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER);
    assert.notStrictEqual(hnPass.pv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER);
    assert.notStrictEqual(hnLimit.pv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER);

    // Switching configured tradeLineStyle to 'dotted' (1) updates the overwritten line style immediately!
    ctx.cfg = { enabled: true, tpSlBoxesEnabled: true, positionOverlayEnabled: true, tradeLineStyle: 'dotted', tradeLineWidth: 2.5 };
    ctx.syncHypernovaNativeTradeLineSuppression(hnModel, hnExtracted, ctx.cfg);
    assert.strictEqual(hnSl.props.lineStyle.value(), 1, 'Configured dotted style must overwrite native LineToolOrder to 1');
    assert.strictEqual(hnSl.props.lineWidth.value(), 2.5);

    // Disabling restores original dashed (2) style and native box renderer!
    ctx.cfg = { enabled: false, tpSlBoxesEnabled: true, positionOverlayEnabled: true, tradeLineStyle: 'solid', tradeLineWidth: 1.5 };
    ctx.syncHypernovaNativeTradeLineSuppression(hnModel, hnExtracted, ctx.cfg);
    assert.strictEqual(hnSl.props.lineStyle.value(), 2, 'Disabling visuals must restore original dashed style (2)');
    assert.notStrictEqual(hnSl.pv.renderer(), ctx.EMPTY_NATIVE_LINE_RENDERER, 'Disabling visuals must restore native SL box');

    // Verify 3-line high TP/SL box markup and Settings dropdown in source
    assert.strictEqual(mainSrc.includes('vest-hn-tpsl-row-top'), true, '3-line high TP/SL box must include row-top');
    assert.strictEqual(mainSrc.includes('vest-hn-tpsl-row-mid'), true, '3-line high TP/SL box must include row-mid');
    assert.strictEqual(mainSrc.includes('vest-hn-tpsl-row-bot'), true, '3-line high TP/SL box must include row-bot');
    assert.strictEqual(isolatedSrc.includes('id="vest-pf-hn-trade-line-style"'), true, 'Settings must expose configurable tradeLineStyle dropdown');
    assert.strictEqual(isolatedSrc.includes('id="vest-pf-hn-trade-line-width"'), true, 'Settings must expose configurable tradeLineWidth slider');
  }
  console.log('✓ In-place native LineToolOrder/LineToolPosition overwrite, 3-line box, configurable solid line style & clean toggle restore verified');
}

// 10. Mobile Hypernova Positions Card Scraping (`positions-mobile-list`) & Native Position Line Live PnL Sync (`PnL: $XX.XX` / `PnL: -$XX.XX`)
{
  // 10a. VM test for `scrapeHypernovaMobilePositions()` on both collapsed & expanded mobile cards
  const helpersBlock = extractBlock(
    isolatedSrc,
    'function normalizeHypernovaBaseSymbol(',
    'function formatHypernovaOrderPrice('
  );
  const mobileScrapeBlock = extractBlock(
    isolatedSrc,
    'function scrapeHypernovaMobilePositions(',
    'function scrapeVenueOpenPositionsWithMeta('
  );

  const makeMockNode = (text, attrs = {}, childrenBySel = {}) => ({
    innerText: text,
    textContent: text,
    className: attrs.className || '',
    getBoundingClientRect: () => ({ width: 360, height: 56 }),
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    querySelector: (sel) => childrenBySel[sel] || null
  });

  // Collapsed mobile card (no -entry row mounted yet!): GOLD LONG, Size 13.9842, PnL -$18.18 (-0.36%)
  const collapsedCard = makeMockNode('', { 'data-side': 'long', 'data-testid': 'positions-mobile-row-abc' }, {
    '[data-testid="symbol-text"]': makeMockNode('GOLD'),
    '[data-testid$="-size"]': makeMockNode('Size\n13.9842'),
    '[data-testid$="-pnl"]': makeMockNode('PnL (RoE%)\n-$18.18 (-0.36%)')
  });
  // Expanded mobile card with positive unsigned PnL ($24.50), Entry, Mark, Breach, TP/SL
  const expandedCard = makeMockNode('', { 'data-side': 'short', 'data-testid': 'positions-mobile-row-def' }, {
    '[data-testid="symbol-text"]': makeMockNode('ETH'),
    '[data-testid$="-size"]': makeMockNode('Size\n2.5'),
    '[data-testid$="-pnl"]': makeMockNode('PnL (RoE%)\n$24.50 (1.12%)'),
    '[data-testid$="-entry"]': makeMockNode('Entry Price\n$3,100.50', {}, { '.trade-positions-mobile-detail-value': makeMockNode('$3,100.50') }),
    '[data-testid$="-mark"]': makeMockNode('Mark Price\n$3,090.70', {}, { '.trade-positions-mobile-detail-value': makeMockNode('$3,090.70') }),
    '[data-testid$="-breach"]': makeMockNode('Breach Price\n$3,155.00', {}, { '.trade-positions-mobile-detail-value': makeMockNode('$3,155.00') }),
    '[data-testid="position-tpsl"]': makeMockNode('$3,050.00 / $3,120.00')
  });

  const mobileListEl = makeMockNode('', { 'data-testid': 'positions-mobile-list' });
  const scrapeCtx = {
    document: {
      querySelector: (sel) => (sel.includes('positions-mobile-list') ? mobileListEl : null),
      querySelectorAll: (sel) => (sel.includes('positions-mobile-row-') ? [collapsedCard, expandedCard] : [])
    }
  };
  vm.runInNewContext(
    `${helpersBlock}\n${mobileScrapeBlock}\nthis.scrapeHypernovaMobilePositions = scrapeHypernovaMobilePositions;`,
    scrapeCtx
  );

  const mobileRes = scrapeCtx.scrapeHypernovaMobilePositions();
  assert.strictEqual(mobileRes.foundTable, true, 'Mobile positions list must set foundTable: true');
  assert.strictEqual(mobileRes.positions.length, 2, 'Must scrape both collapsed and expanded mobile cards');

  assert.strictEqual(mobileRes.positions[0].symbol, 'GOLD');
  assert.strictEqual(mobileRes.positions[0].side, 'long');
  assert.strictEqual(mobileRes.positions[0].sizeQty, 13.9842);
  assert.strictEqual(mobileRes.positions[0].unrealizedPnl, -18.18, 'Collapsed mobile card must capture exact live negative PnL');
  assert.strictEqual(mobileRes.positions[0].entryPrice, null, 'Collapsed card preserves entryPrice: null for native-line fallback');

  assert.strictEqual(mobileRes.positions[1].symbol, 'ETH');
  assert.strictEqual(mobileRes.positions[1].side, 'short');
  assert.strictEqual(mobileRes.positions[1].sizeQty, 2.5);
  assert.strictEqual(mobileRes.positions[1].unrealizedPnl, 24.5, 'Expanded mobile card must capture exact unsigned positive PnL ($24.50)');
  assert.strictEqual(mobileRes.positions[1].entryPrice, 3100.5);
  assert.strictEqual(mobileRes.positions[1].markPrice, 3090.7);
  assert.strictEqual(mobileRes.positions[1].breachPrice, 3155);
  assert.strictEqual(mobileRes.positions[1].tpPrice, 3050);
  assert.strictEqual(mobileRes.positions[1].slPrice, 3120);

  // 10b. VM test for Hypernova native Position Line (`PnL: -$18.18`, unsigned `PnL: $24.50`, privacy `PnL: ••••`, & live `setText` repaint trigger)
  const nativeAndPnlBlock = extractBlock(
    mainSrc,
    'const EMPTY_NATIVE_LINE_RENDERER =',
    'function resolveActiveHypernovaPosition('
  );
  let repaintCalls = 0;
  const pnlSyncCtx = {
    isHypernovaMainWorldHost: () => true,
    latestHypernovaYToPriceFn: null,
    scheduleIctSessionsRender: () => { repaintCalls++; },
    getHypernovaVisualsConfig: () => ({ enabled: true, tpSlBoxesEnabled: true, positionOverlayEnabled: true, tradeLineStyle: 'solid', tradeLineWidth: 1.5 })
  };
  vm.runInNewContext(
    `${nativeAndPnlBlock}
     this.extractNativeHypernovaChartLines = extractNativeHypernovaChartLines;
     this.syncHypernovaNativeTradeLineSuppression = syncHypernovaNativeTradeLineSuppression;
     this.computeLiveHypernovaUnrealizedPnl = computeLiveHypernovaUnrealizedPnl;`,
    pnlSyncCtx
  );

  const makeNativePosLine = (bodyText, lineColor = '#10b981') => {
    let curText = bodyText;
    const pv = { renderer: () => ({ draw() {} }) };
    const src = {
      toolname: 'LineToolOrder',
      _paneViews: [pv],
      points: () => [{ price: 3570.1 }],
      properties: () => ({ lineStyle: { value: () => 0, setValue() {} }, lineWidth: { value: () => 1, setValue() {} } }),
      paneViews: () => src._paneViews,
      _setPaneViews(v) { src._paneViews = v; },
      adapter: () => src._adapter
    };
    src._adapter = {
      _line: src,
      _data: { bodyText: curText, quantityText: '' },
      getPrice: () => 3570.1,
      getText: () => curText,
      setText: (next) => { curText = next; src._adapter._data.bodyText = next; return src._adapter; },
      getQuantity: () => '',
      getLineColor: () => lineColor,
      getLineStyle: () => 0,
      setLineStyle: () => src._adapter,
      getLineWidth: () => 1,
      setLineWidth: () => src._adapter,
      getCancelTooltip: () => 'Close position',
      setCancelButtonBackgroundColor: () => src._adapter
    };
    return src;
  };

  // Negative PnL on a GREEN LONG position must NOT misread -$18.18 as sizeQty=18.18 or side='short'!
  const negLongSrc = makeNativePosLine('PnL: -$18.18', '#10b981');
  const mockModel = { mainSeries: () => ({}), panes: () => [{ dataSources: () => [negLongSrc] }], updateAllViews: () => {}, lightUpdate: () => {} };
  const extNeg = pnlSyncCtx.extractNativeHypernovaChartLines(mockModel, null);
  assert.strictEqual(extNeg.positionLines.length, 1);
  assert.strictEqual(extNeg.position.side, 'long', 'Negative PnL text must NEVER flip a green LONG position to short');
  assert.strictEqual(extNeg.position.sizeQty, null, 'PnL dollar amount must NEVER be misread as sizeQty');
  assert.strictEqual(extNeg.position.unrealizedPnl, -18.18);
  assert.strictEqual(extNeg.position.isExplicitPnlText, true);

  // Live computeLiveHypernovaUnrealizedPnl uses exact -$18.18 from native Position Line even if candle last price differs!
  assert.strictEqual(
    pnlSyncCtx.computeLiveHypernovaUnrealizedPnl(null, extNeg.position, 'long', 3570.1, 13.9842, 3571.5),
    -18.18,
    'Explicit native Position Line PnL must beat stale/candle math on mobile'
  );

  // Hook adapter.setText -> updating to unsigned positive "PnL: $24.50" triggers immediate repaint and parses +24.50!
  pnlSyncCtx.syncHypernovaNativeTradeLineSuppression(mockModel, extNeg, pnlSyncCtx.getHypernovaVisualsConfig());
  const beforeRepaints = repaintCalls;
  negLongSrc._adapter.setText('PnL: $24.50');
  assert.ok(repaintCalls > beforeRepaints, 'adapter.setText PnL tick must schedule immediate overlay repaint');
  const extPos = pnlSyncCtx.extractNativeHypernovaChartLines(mockModel, null);
  assert.strictEqual(extPos.position.unrealizedPnl, 24.5, 'Unsigned Hypernova positive "PnL: $24.50" must parse as +24.50');
  assert.strictEqual(extPos.position.isExplicitPnlText, true);
  assert.strictEqual(extPos.position.sizeQty, null);

  // Privacy-masked "PnL: ••••" parses as null and falls back cleanly to live mobile DOM card PnL!
  negLongSrc._adapter.setText('PnL: ••••');
  const extMasked = pnlSyncCtx.extractNativeHypernovaChartLines(mockModel, null);
  assert.strictEqual(extMasked.position.unrealizedPnl, null);
  assert.strictEqual(extMasked.position.isExplicitPnlText, false);
  assert.strictEqual(
    pnlSyncCtx.computeLiveHypernovaUnrealizedPnl({ symbol: 'GOLD', side: 'long', unrealizedPnl: -18.18, source: 'dom' }, extMasked.position, 'long', 3570.1, 13.9842, 3571.5),
    -18.18,
    'Privacy-masked native line must fall back cleanly to live mobile Positions DOM PnL'
  );

  // Verify mobile observer target is wired in content-isolated.js
  assert.strictEqual(isolatedSrc.includes('[data-testid="positions-mobile-list"]'), true);
  console.log('✓ Mobile positions-mobile-list card scraping, unsigned PnL: $XX.XX parsing, 0ms setText repaint & side/qty isolation verified');
}

console.log('All Hypernova Chart Visuals tests passed!');
