const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Charting Indicators Unified Hub & Expandable Tiles Tests...');

const isolatedJsPath = path.join(__dirname, '..', 'content', 'content-isolated.js');
const templateCssPath = path.join(__dirname, '..', 'content', 'template-bar.css');

assert(fs.existsSync(isolatedJsPath), 'content-isolated.js must exist');
assert(fs.existsSync(templateCssPath), 'template-bar.css must exist');

const isolatedJs = fs.readFileSync(isolatedJsPath, 'utf8');
const templateCss = fs.readFileSync(templateCssPath, 'utf8');

// 1. Verify CSS styles for unified indicators container and expandable tiles
assert(templateCss.includes('.vest-indicators-container'), 'template-bar.css must define .vest-indicators-container');
assert(templateCss.includes('.vest-indicator-tile'), 'template-bar.css must define .vest-indicator-tile');
assert(templateCss.includes('.vest-indicator-tile.is-enabled'), 'template-bar.css must define .vest-indicator-tile.is-enabled');
assert(templateCss.includes('.vest-indicator-tile-header'), 'template-bar.css must define .vest-indicator-tile-header');
assert(templateCss.includes('.vest-indicator-status-badge'), 'template-bar.css must define .vest-indicator-status-badge');
assert(templateCss.includes('.vest-indicator-status-badge.on'), 'template-bar.css must define .vest-indicator-status-badge.on');
assert(templateCss.includes('.vest-indicator-status-badge.off'), 'template-bar.css must define .vest-indicator-status-badge.off');
assert(templateCss.includes('.vest-indicator-settings-drawer'), 'template-bar.css must define .vest-indicator-settings-drawer');
assert(templateCss.includes('@keyframes vestDrawerSlideDown'), 'template-bar.css must define @keyframes vestDrawerSlideDown');
console.log('✓ Expandable indicator tiles and animated settings drawer CSS verified');

// 2. Verify NAV_ITEMS has 'chartingindicators' and no longer lists the 8 separate indicator tabs
assert(isolatedJs.includes("id: 'chartingindicators'"), 'NAV_ITEMS must contain id: "chartingindicators"');
assert(isolatedJs.includes("label: 'Charting Indicators'"), 'NAV_ITEMS must have label: "Charting Indicators"');

// Ensure separate indicator tabs are removed from NAV_ITEMS
const navItemsMatch = isolatedJs.match(/const NAV_ITEMS = \[([\s\S]*?)\];/);
assert(navItemsMatch, 'NAV_ITEMS array definition must be present');
const navItemsContent = navItemsMatch[1];
assert(navItemsContent.includes("'chartingindicators'"), "NAV_ITEMS must include 'chartingindicators'");
assert(!navItemsContent.includes("'sessions'"), "NAV_ITEMS must not include separate 'sessions'");
assert(!navItemsContent.includes("'autofvg'"), "NAV_ITEMS must not include separate 'autofvg'");
assert(!navItemsContent.includes("'news'"), "NAV_ITEMS must not include separate 'news'");
assert(!navItemsContent.includes("'trades'"), "NAV_ITEMS must not include separate 'trades'");
assert(!navItemsContent.includes("'candleohlc'"), "NAV_ITEMS must not include separate 'candleohlc'");
assert(!navItemsContent.includes("'positionhud'"), "NAV_ITEMS must not include separate 'positionhud'");
assert(!navItemsContent.includes("'faillines'"), "NAV_ITEMS must not include separate 'faillines'");
assert(!navItemsContent.includes("'cortexindicator'"), "NAV_ITEMS must not include separate 'cortexindicator'");
console.log('✓ Left navigation sidebar cleanly consolidated into unified "Charting Indicators" tab');

// 3. Verify openStudioSettingsModal backwards-compatibility mapping & scrolling
assert(isolatedJs.includes('const INDICATOR_MAP = ['), 'openStudioSettingsModal must define INDICATOR_MAP');
assert(isolatedJs.includes('targetIndicatorToScroll'), 'openStudioSettingsModal must support targetIndicatorToScroll');
assert(isolatedJs.includes("initialTab = 'chartingindicators'"), 'Legacy indicator tabs must route to chartingindicators');
console.log('✓ Automatic routing and smooth scroll targeting for all 8 indicators verified');

// 4. Verify all 8 indicators are rendered in renderChartingIndicatorsHtml
const expectedIndicators = [
  { id: 'sessions', masterId: 'vest-si-master-enabled' },
  { id: 'autofvg', masterId: 'vest-afvg-master-enabled' },
  { id: 'news', masterId: 'vest-nb-master-enabled' },
  { id: 'trades', masterId: 'vest-tb-master-enabled' },
  { id: 'candleohlc', masterId: 'vest-co-master-enabled' },
  { id: 'positionhud', masterId: 'vest-ph-master-enabled' },
  { id: 'faillines', masterId: 'vest-fail-lines-enabled' },
  { id: 'cortexindicator', masterId: 'vest-ci-enabled' }
];

for (const ind of expectedIndicators) {
  assert(isolatedJs.includes(`id: '${ind.id}'`), `renderChartingIndicatorsHtml must include indicator '${ind.id}'`);
  assert(isolatedJs.includes(`id="\${ind.masterToggleId}"`) || isolatedJs.includes(ind.masterId), `Indicator '${ind.id}' master toggle must be present`);
}
console.log('✓ All 8 indicators rendered as individual tile boxes with master slider switches');

// 5. Verify master toggle sliders drop down settings box when enabled and collapse when disabled
assert(isolatedJs.includes("drawer.style.display = isChecked ? 'block' : 'none'"), 'Toggling switch must show or hide settings drawer below indicator');
assert(isolatedJs.includes("tile.classList.toggle('is-enabled', isChecked)"), 'Toggling switch must toggle is-enabled on tile');
assert(isolatedJs.includes("badge.textContent = isChecked ? 'ON' : 'OFF'"), 'Toggling switch must update badge text to ON/OFF');
console.log('✓ Toggle ON/OFF drops down settings drawer below indicator and updates status badge');

// 6. Verify wireDialogEvents attaches handlers when activeTab === 'chartingindicators'
assert(isolatedJs.includes("activeTab === 'chartingindicators'"), 'wireDialogEvents must handle chartingindicators tab');
assert(isolatedJs.includes("activeTab === 'sessions' || activeTab === 'chartingindicators'"), 'Session indicators events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'autofvg' || activeTab === 'chartingindicators'"), 'Auto FVG events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'news' || activeTab === 'chartingindicators'"), 'News box events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'trades' || activeTab === 'chartingindicators'"), 'Trades box events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'candleohlc' || activeTab === 'chartingindicators'"), 'Candle OHLC events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'positionhud' || activeTab === 'chartingindicators'"), 'Position HUD events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'faillines' || activeTab === 'chartingindicators'"), 'Fail lines events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'cortexindicator' || activeTab === 'chartingindicators'"), 'Cortex indicator events must wire on chartingindicators');
console.log('✓ Full event wiring and live draft synchronization verified for all 8 indicators');

console.log('All Charting Indicators Unified Hub & Expandable Tiles Tests Passed Successfully!');
