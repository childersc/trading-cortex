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
    'function extractNativeHypernovaChartLines(model)'
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

console.log('All Hypernova Chart Visuals tests passed!');
