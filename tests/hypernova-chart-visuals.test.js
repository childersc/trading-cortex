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

  // Defaults must all be ON by default with "Current Price" label text
  const def = ctx.normalizeHypernovaVisualsConfig();
  assert.strictEqual(def.enabled, true, 'Hypernova visuals master toggle must default to ON');
  assert.strictEqual(def.positionOverlayEnabled, true, 'Position Entry box toggle must default to ON');
  assert.strictEqual(def.tpSlBoxesEnabled, true, 'Green TP / Red SL boxes toggle must default to ON');
  assert.strictEqual(def.currentPriceLineEnabled, true, 'Custom Current Price line toggle must default to ON');
  assert.strictEqual(def.currentPriceText, 'Current Price', 'Default Current Price label text must be "Current Price"');
  assert.strictEqual(def.currentPriceShowLabel, true);
  assert.strictEqual(def.currentPriceShowPrice, true);

  // Explicit false opt-outs and sanitization/clamping
  const custom = ctx.normalizeHypernovaVisualsConfig({
    enabled: false,
    positionOverlayEnabled: false,
    tpSlBoxesEnabled: true,
    currentPriceLineEnabled: false,
    currentPriceColor: '#ff00aa',
    currentPriceStyle: 'dotted',
    currentPriceWidth: 99,
    currentPriceOpacity: 5,
    currentPriceText: 'Live Mark',
    currentPriceShowLabel: false,
    currentPriceShowPrice: false,
    currentPriceLabelAlign: 'left'
  });
  assert.strictEqual(custom.enabled, false);
  assert.strictEqual(custom.positionOverlayEnabled, false);
  assert.strictEqual(custom.tpSlBoxesEnabled, true);
  assert.strictEqual(custom.currentPriceLineEnabled, false);
  assert.strictEqual(custom.currentPriceColor, '#ff00aa');
  assert.strictEqual(custom.currentPriceStyle, 'dotted');
  assert.strictEqual(custom.currentPriceWidth, 4, 'Line width should clamp to max 4');
  assert.strictEqual(custom.currentPriceOpacity, 15, 'Line opacity should clamp to min 15');
  assert.strictEqual(custom.currentPriceText, 'Live Mark');
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

  // Symbol normalization
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('HYPERNOVA:BTC-USD'), 'BTC');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('ETH-PERP'), 'ETH');
  assert.strictEqual(ctx.normalizeHypernovaMainSymbol('SOLUSDT'), 'SOL');

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
    'id="vest-pf-hn-price-line"',
    'id="vest-pf-hn-price-color"',
    'id="vest-pf-hn-price-style"',
    'id="vest-pf-hn-price-width"',
    'id="vest-pf-hn-price-opacity"',
    'id="vest-pf-hn-price-text"',
    'id="vest-pf-hn-price-align"',
    'id="vest-pf-hn-price-show-label"',
    'id="vest-pf-hn-price-show-price"',
    'Hypernova Chart Visuals',
    'VEST_TV_HYPERNOVA_POSITIONS_UPDATE',
    'VEST_TV_HYPERNOVA_SET_TP_SL',
    'VEST_TV_HYPERNOVA_CLEAR_TP_SL',
    'VEST_TV_HYPERNOVA_CLOSE_POSITION'
  ];
  for (const token of requiredIsolatedTokens) {
    assert.strictEqual(isolatedSrc.includes(token), true, `content-isolated.js missing required Hypernova token: ${token}`);
  }
  console.log('✓ Hypernova settings toggles, Current Price styling controls & DOM bridge verified in content-isolated.js');
}

// 4. Structural checks: 2-row Long/Short entry box (BE/TP/SL/X), Green TP / Red SL boxes & render hookup in content-main.js
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
    'startHypernovaTpSlDrag',
    'renderHypernovaChartVisuals(ctx, targetCanvas, symbolKey, extracted.model, priceToY, hypernovaYToPrice, cssWidth, cssHeight)',
    'removeHypernovaOverlayWidgets();',
    "case 'VEST_TV_HYPERNOVA_POSITIONS_UPDATE':"
  ];
  for (const token of requiredMainTokens) {
    assert.strictEqual(mainSrc.includes(token), true, `content-main.js missing required Hypernova token: ${token}`);
  }
  console.log('✓ 2-row Long/Short BE/TP/SL/X box, Green TP / Red SL boxes & render loop hookup verified in content-main.js');
}

console.log('All Hypernova Chart Visuals tests passed!');
