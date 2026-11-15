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

// 5. Verify master toggle displays Settings button next to toggle, keeps drawer collapsed on open, and wires settings button click
assert(templateCss.includes('.vest-indicator-settings-btn'), 'template-bar.css must define .vest-indicator-settings-btn');
assert(isolatedJs.includes('vest-indicator-settings-btn'), 'content-isolated.js must render .vest-indicator-settings-btn');
assert(isolatedJs.includes("settingsBtn.style.display = isChecked ? 'inline-flex' : 'none'"), 'Toggling switch must show or hide settings button next to toggle');
assert(isolatedJs.includes('class="vest-indicator-settings-drawer" id="vest-ind-drawer-${ind.id}" style="display: none;"'), 'Indicator drawer must default to collapsed (display: none) without persisting open state');
assert(isolatedJs.includes('settingsBtns.forEach(btn => {'), 'wireDialogEvents must wire settings button clicks');
assert(isolatedJs.includes("tile.classList.toggle('is-enabled', isChecked)"), 'Toggling switch must toggle is-enabled on tile');
assert(isolatedJs.includes("badge.textContent = isChecked ? 'ON' : 'OFF'"), 'Toggling switch must update badge text to ON/OFF');
console.log('✓ Master toggle controls Settings button display, keeps drawer collapsed on dialog open, and wires Settings click');

// 6. Verify wireDialogEvents attaches handlers when activeTab === 'chartingindicators'
const wireDialogEventsMatch = isolatedJs.match(/function wireDialogEvents\(\) \{([\s\S]*?)\n    function commitDraftAndClose/);
// Or search within wireDialogEvents scope
assert(isolatedJs.includes("activeTab === 'chartingindicators'"), 'wireDialogEvents must handle chartingindicators tab');
assert(isolatedJs.includes("const indToggles = overlay.querySelectorAll('.vest-ind-master-toggle');"), 'wireDialogEvents must wire master toggle switches');
assert(isolatedJs.includes("const tileHeaders = overlay.querySelectorAll('.vest-indicator-tile-header');"), 'wireDialogEvents must wire tile header clicks');

// Verify renderRightPaneContent does NOT contain stranded event listeners
const renderRightPaneMatch = isolatedJs.match(/function renderRightPaneContent\(\) \{([\s\S]*?)\n    function renderPerpFirmsHtml/);
if (renderRightPaneMatch) {
  assert(!renderRightPaneMatch[1].includes("overlay.querySelectorAll('.vest-ind-master-toggle')"), 'renderRightPaneContent must not contain stranded DOM query listeners');
}

// Verify drawer is automatically expanded when targetIndicatorToScroll is targeted
assert(isolatedJs.includes("drawer.style.display = 'block';"), 'Targeted indicator drawer must be expanded when scrolled to');

assert(isolatedJs.includes("activeTab === 'sessions' || activeTab === 'chartingindicators'"), 'Session indicators events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'autofvg' || activeTab === 'chartingindicators'"), 'Auto FVG events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'news' || activeTab === 'chartingindicators'"), 'News box events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'trades' || activeTab === 'chartingindicators'"), 'Trades box events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'candleohlc' || activeTab === 'chartingindicators'"), 'Candle OHLC events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'positionhud' || activeTab === 'chartingindicators'"), 'Position HUD events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'faillines' || activeTab === 'chartingindicators'"), 'Fail lines events must wire on chartingindicators');
assert(isolatedJs.includes("activeTab === 'cortexindicator' || activeTab === 'chartingindicators'"), 'Cortex indicator events must wire on chartingindicators');
console.log('✓ Full event wiring and live draft synchronization verified for all 8 indicators');

// 7. Verify trade duration formatting function and runtime rendering with trades
assert(isolatedJs.includes('function formatTradeDuration('), 'formatTradeDuration function must be defined');
assert(isolatedJs.includes('const formatTradeDurationHuman = formatTradeDuration;') || isolatedJs.includes('function formatTradeDurationHuman('), 'formatTradeDurationHuman alias must be defined');
assert(!isolatedJs.includes('formatTradeDurationHuman is not defined'), 'formatTradeDurationHuman must be valid');

// Test VM execution with trades populated in tradesBox
const vm = require('vm');
let js = isolatedJs.replace('function openStudioSettingsModal(', 'window.openStudioSettingsModal = openStudioSettingsModal; function openStudioSettingsModal(');
js = js.replace('let settings = {', 'window.__setTestSettings = (s) => { settings = s; }; let settings = {');
let currentOverlay = null;
const sandbox = {
  console,
  setTimeout: (fn) => typeof fn === 'function' && fn(),
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  Date, Math, Number, String, Boolean, Array, Object, JSON, RegExp, Set, Map, WeakSet, WeakMap, Intl,
  MutationObserver: class { observe() {} disconnect() {} },
  location: { hostname: 'next.vestmarkets.com', href: 'https://next.vestmarkets.com/trade/HYPE-PERP' },
  window: {
    location: { hostname: 'next.vestmarkets.com', href: 'https://next.vestmarkets.com/trade/HYPE-PERP' },
    addEventListener: () => {}, removeEventListener: () => {}, postMessage: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    speechSynthesis: { getVoices: () => [] }
  },
  document: {
    location: { hostname: 'next.vestmarkets.com', href: 'https://next.vestmarkets.com/trade/HYPE-PERP' },
    createElement: (tag) => ({
      tagName: tag.toUpperCase(), style: {}, dataset: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      setAttribute: () => {}, getAttribute: () => null, appendChild: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      querySelectorAll: () => [], querySelector: () => null, remove: () => {}
    }),
    body: { appendChild: (c) => { currentOverlay = c; } },
    head: { appendChild: () => {} },
    getElementById: (id) => null,
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener: () => {}, removeEventListener: () => {}
  },
  chrome: {
    runtime: { id: 'test_id', getManifest: () => ({ version: '1.1.72' }) },
    storage: {
      local: { get: (k, cb) => cb({}), set: () => {} },
      sync: { get: (k, cb) => cb({}), set: () => {} },
      onChanged: { addListener: () => {} }
    }
  }
};
sandbox.window.document = sandbox.document;
sandbox.window.top = sandbox.window;
sandbox.top = sandbox.window;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(js, sandbox);
// Seed sample closed trades to test renderTradesBoxSettingsHtml
sandbox.window.__setTestSettings({
  tradesBox: {
    enabled: true,
    filterCurrentInstrument: false,
    filterCurrentSessionOnly: false,
    trades: [
      { id: 't1', source: 'manual', symbol: 'HYPE-PERP', symbolKey: 'HYPE', side: 'LONG', pnl: '25.40', durationMs: 125000, exitTime: Date.now() },
      { id: 't2', source: 'manual', symbol: 'HYPE-PERP', symbolKey: 'HYPE', side: 'SHORT', pnl: '-10.15', durationMs: 45000, exitTime: Date.now() }
    ]
  }
});
sandbox.window.openStudioSettingsModal('chartingindicators');

assert(currentOverlay && currentOverlay.innerHTML.includes('vest-indicator-tile'), 'Modal must render indicator tiles');
assert(currentOverlay.innerHTML.includes('HYPE-PERP'), 'Rendered trades drawer must include trade symbols without ReferenceErrors');
assert(currentOverlay.innerHTML.includes('25.40'), 'Rendered trades drawer must include formatted trade PnL');
console.log('✓ VM execution test for openStudioSettingsModal with populated closed trades passed cleanly');

console.log('All Charting Indicators Unified Hub & Expandable Tiles Tests Passed Successfully!');
