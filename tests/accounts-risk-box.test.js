const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Running On-Chart Accounts & Per-Trade Risk Drawing Tests...');

const isolatedJsPath = path.join(__dirname, '..', 'content', 'content-isolated.js');
const mainJsPath = path.join(__dirname, '..', 'content', 'content-main.js');
assert(fs.existsSync(isolatedJsPath), 'content-isolated.js must exist');
assert(fs.existsSync(mainJsPath), 'content-main.js must exist');
const isolatedJs = fs.readFileSync(isolatedJsPath, 'utf8');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');

// 1. Verify non-draggable canvas drawing in content-main.js
assert(mainJs.includes('function renderAccountsRiskOnCanvas('), 'content-main.js must define renderAccountsRiskOnCanvas');
assert(mainJs.includes('function ensureAccountsRiskTopOverlayCanvas(') && mainJs.includes('z-index:2147483640'), 'Accounts & Risk canvas must render on a dedicated front-most overlay canvas above all chart elements');
assert(mainJs.includes("case 'VEST_TV_ACCOUNTS_RISK_DATA':"), 'content-main.js must handle VEST_TV_ACCOUNTS_RISK_DATA');
assert(mainJs.includes("case 'VEST_SCAN_ACCOUNTS_NOW':"), 'content-main.js must handle VEST_SCAN_ACCOUNTS_NOW');
assert(mainJs.includes('renderAccountsRiskOnCanvas(topCtx, latestAccountsRiskOverlayData, accountsRiskConfig'), 'renderIctSessionIndicators must draw accounts & risk on the front-most canvas');
assert(!isolatedJs.includes('wireChartAccountsRiskBoxEvents'), 'Must NOT render a draggable floating DOM window for Accounts & Risk');
console.log('✓ Non-draggable native chart canvas drawing verified');

// 2. Verify all-accounts firm discovery (Fetch/XHR + React Fiber + localStorage)
assert(mainJs.includes('function extractAccountsFromApiPayload('), 'content-main.js must define extractAccountsFromApiPayload');
assert(mainJs.includes('function scanReactFiberForAccounts('), 'content-main.js must define scanReactFiberForAccounts');
assert(mainJs.includes('function scanPlatformAccountsInMainWorld('), 'content-main.js must define scanPlatformAccountsInMainWorld');
assert(mainJs.includes("type: 'VEST_ACCOUNTS_CAPTURED'"), 'content-main.js must emit VEST_ACCOUNTS_CAPTURED');
assert(isolatedJs.includes("type === 'VEST_ACCOUNTS_CAPTURED'"), 'content-isolated.js must handle VEST_ACCOUNTS_CAPTURED');
assert(isolatedJs.includes('function mergeCapturedFirmAccounts('), 'content-isolated.js must define mergeCapturedFirmAccounts');
assert(isolatedJs.includes('function pushAccountsRiskDataToChartCanvas('), 'content-isolated.js must define pushAccountsRiskDataToChartCanvas');
console.log('✓ All-accounts firm discovery pipeline (API + React Fiber + storage + live DOM) verified');

// 3. Integration with Cortex dropdown, Indicator Hub, and Cross-Browser Sync
assert(isolatedJs.includes('const DEFAULT_ACCOUNTS_RISK_BOX ='), 'DEFAULT_ACCOUNTS_RISK_BOX must be defined');
assert(isolatedJs.includes('function normalizeAccountsRiskBoxConfig('), 'normalizeAccountsRiskBoxConfig must be defined');
assert(isolatedJs.includes('function computeAccountInstrumentStatus('), 'computeAccountInstrumentStatus must be defined');
assert(isolatedJs.includes('id="vest-sdm-open-accountsrisk-btn"'), 'Cortex dropdown menu must include Accounts & Risk entry');
assert(isolatedJs.includes("id: 'accountsrisk'"), 'Charting Indicators hub must register accountsrisk tile');
assert(isolatedJs.includes('vest-arb-master-enabled'), 'Master toggle must be present');
assert(isolatedJs.includes('vest-arb-risk-pct'), 'Configurable risk percentage input must be present');
assert(isolatedJs.includes('vest-arb-offset-x') && isolatedJs.includes('vest-arb-offset-y'), 'Canvas top-left offset controls must be present');
assert(isolatedJs.includes('vest-arb-scan-accounts-btn'), 'Scan Firm Accounts button must be present');
assert(isolatedJs.includes('CORTEX_ACCOUNT_SNAPSHOT_UPDATE'), 'Cross-tab BroadcastChannel must sync live account snapshots');
assert(isolatedJs.includes('changes.cortexAccountSnapshots'), 'chrome.storage.onChanged must sync multi-browser account snapshots');
assert(isolatedJs.includes("indId === 'accountsrisk' && draftSettings.accountsRiskBox"), 'Master toggle change listener must update draftSettings.accountsRiskBox.enabled');
assert(isolatedJs.includes('function syncOpenModalControlsInPlace(') && isolatedJs.includes('syncOpenModalControlsInPlace(draftSettings)'), 'Live settings sync in modal must patch controls in-place without calling renderDialog() or breaking scroll');
console.log('✓ Dropdown, Settings Hub, In-Place Scroll-Safe Sync, and Cross-Browser live account sync verified');

// 4. VM Unit Tests for Dollar Parsing, Config Normalization & Risk Computation
const extractFn = (name, src) => {
  const match = src.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n  \\}`));
  assert(match, `Could not extract function ${name}`);
  return match[0];
};

const defaultObjMatch = isolatedJs.match(/const DEFAULT_ACCOUNTS_RISK_BOX = \{[\s\S]*?\n  \};/);
assert(defaultObjMatch, 'Could not extract DEFAULT_ACCOUNTS_RISK_BOX');

const normColorFn = 'function normalizeHexColor(c, f) { return /^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : f; }';
const normInstFn = 'function normalizeInstrumentKey(s) { return String(s || "").toUpperCase().replace(/-PERP$/i, "").replace(/[^A-Z0-9]/g, ""); }';
const normCfgCode = extractFn('normalizeAccountsRiskBoxConfig', isolatedJs);
const statusFnCode = extractFn('computeAccountInstrumentStatus', isolatedJs);
const parseDollarCode = extractFn('parseDollarAmount', isolatedJs);
const fmtPlainCode = extractFn('formatPlainDollar', isolatedJs);

const sandbox = { Math, Number, String, Array, Object, Boolean, JSON, isFinite };
vm.createContext(sandbox);
vm.runInContext(
  `${defaultObjMatch[0]}\n${normColorFn}\n${normInstFn}\n${normCfgCode}\n${statusFnCode}\n${parseDollarCode}\n${fmtPlainCode}`,
  sandbox
);

assert.strictEqual(sandbox.parseDollarAmount('$490.29'), 490.29);
assert.strictEqual(sandbox.parseDollarAmount('-$0.20'), -0.2);
assert.strictEqual(sandbox.parseDollarAmount('+$1,250.50'), 1250.5);
assert.strictEqual(sandbox.parseDollarAmount('($15.25)'), -15.25);

const defCfg = sandbox.normalizeAccountsRiskBoxConfig(null);
assert.strictEqual(defCfg.enabled, true, 'Accounts & Risk drawing must be enabled by default');
assert.strictEqual(defCfg.riskPercent, 1.0, 'Default risk percentage must be 1.0%');
assert.strictEqual(defCfg.offsetX, 12, 'Default offsetX must anchor top-left inside chart pane');
assert.strictEqual(defCfg.offsetY, 108, 'Default offsetY must sit cleanly below OHLC legend and indicator config controls');
assert.strictEqual(sandbox.normalizeAccountsRiskBoxConfig({ offsetY: 52 }).offsetY, 108, 'Old default offsetY 52 must migrate to 108');
assert.strictEqual(sandbox.normalizeAccountsRiskBoxConfig({ offsetY: 76 }).offsetY, 108, 'Old default offsetY 76 must migrate to 108');
assert.strictEqual(sandbox.formatPlainDollar(-0.20), '-$0.20', 'Negative dollar values must format as -$0.20');

// Test Open vs Closed per-instrument logic
const account76 = {
  id: 'Account 76',
  name: 'Account 76',
  balance: 490.29,
  totalOpenPnl: -0.20,
  positionsBySymbol: {
    HYPE: { symbol: 'HYPE', side: 'long', pnl: -0.01, pnlPct: '-0.02%', value: 37.87 },
    CL: { symbol: 'CL', side: 'short', pnl: -0.19, pnlPct: '-0.10%', value: 198.33 }
  }
};
const hypeStatus = sandbox.computeAccountInstrumentStatus(account76, 'HYPE-PERP', 1.0);
assert.strictEqual(hypeStatus.hasOpenOnInstrument, true);
assert.strictEqual(hypeStatus.instrumentPosition.side, 'long');

const nqStatus = sandbox.computeAccountInstrumentStatus(account76, 'NQ', 1.0);
assert.strictEqual(nqStatus.hasOpenOnInstrument, false);
assert.strictEqual(sandbox.formatPlainDollar(nqStatus.riskAmount), '$4.90');
assert.strictEqual(nqStatus.totalOpenPnl, -0.20);
console.log('✓ VM computation verified: live Open PnL when open, configurable % dollar risk when closed');

// 5. VM Unit Test for extractAccountsFromApiPayload (All Firm Accounts Discovery)
const normCanvasInstCode = extractFn('normalizeCanvasInstrumentKey', mainJs);
const normCanonAccCode = extractFn('normalizeCanonicalAccountName', mainJs);
const parseNumCode = extractFn('parseFiniteAccountNum', mainJs);
const extractPosCode = extractFn('extractPositionsMapFromAccountObj', mainJs);
const extractAccCode = extractFn('extractAccountsFromApiPayload', mainJs);

const mainSandbox = { Math, Number, String, Array, Object, Boolean, JSON, WeakSet, Set, Map, isFinite };
vm.createContext(mainSandbox);
vm.runInContext(
  `${normCanvasInstCode}\n${normCanonAccCode}\n${parseNumCode}\n${extractPosCode}\n${extractAccCode}`,
  mainSandbox
);

// Verify canonical name cleaning & noise filtering (matches Vest screenshot cases)
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('76Account 76Instant'), 'Account 76');
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('71Account 71Evaluati'), 'Account 71');
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('75Account 75Evaluati'), 'Account 75');
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('73'), 'Account 73');
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('Active Positions'), null);
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('Add Funded Account'), null);
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('PA'), null);
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('6e6f946a-5a6e-4246-a123-456789abcdef'), null);
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('06674ff0-6d04-502b-b'), null);
assert.strictEqual(mainSandbox.normalizeCanonicalAccountName('0x7a250d5630b4cf539739df2c5dacb4c659f2488d'), null);
console.log('✓ Canonical account name normalization, UUID/hex rejection & UI noise filtering verified');

const mockFirmApiPayload = {
  data: {
    accounts: [
      {
        accountId: 'acc_76',
        accountName: 'Account 76',
        accountValue: '490.29',
        unrealizedPnl: '-0.20',
        positions: [
          { symbol: 'HYPE-PERP', side: 'long', size: 0.56, unrealizedPnl: '-0.01' },
          { symbol: 'CL-PERP', side: 'short', size: 2.41, unrealizedPnl: '-0.19' }
        ]
      },
      {
        accountId: 'acc_59',
        accountName: 'Account 59',
        equity: 12500.00,
        unrealizedPnl: 0,
        positions: []
      },
      {
        accountNumber: 88,
        balance: 25000.50,
        openPnl: 145.75,
        openPositions: [
          { market: 'NQ-PERP', direction: 'LONG', qty: 1, openPnl: 145.75 }
        ]
      }
    ],
    // Noise that must be ignored (candle + market ticker + currency balance)
    latestCandle: { name: 'HYPE', open: 67.5, high: 67.9, low: 67.1, close: 67.6 },
    ticker: { name: 'HYPE-PERP', markPrice: 67.6, indexPrice: 67.6, fundingRate: 0.001, balance: 999 },
    tokenRow: { name: 'USDC', balance: 500 }
  }
};

const discovered = mainSandbox.extractAccountsFromApiPayload(mockFirmApiPayload, '/api/v1/accounts');
assert.strictEqual(discovered.length, 3, 'Must extract all 3 firm accounts and ignore candle/ticker/currency noise');
const d76 = discovered.find(a => a.name === 'Account 76');
const d59 = discovered.find(a => a.name === 'Account 59');
const d88 = discovered.find(a => a.name === 'Account 88');
assert(d76 && d76.balance === 490.29 && d76.positionsBySymbol.HYPE && d76.positionsBySymbol.CL, 'Account 76 with HYPE & CL positions must be extracted');
assert(d59 && d59.balance === 12500 && Object.keys(d59.positionsBySymbol).length === 0, 'Account 59 flat balance must be extracted');
assert(d88 && d88.balance === 25000.5 && d88.positionsBySymbol.NQ && d88.positionsBySymbol.NQ.pnl === 145.75, 'Account 88 with NQ open PnL must be extracted');
console.log('✓ VM multi-account API extraction verified: discovered all 3 firm accounts & filtered out market/candle noise');

console.log('All On-Chart Accounts & Per-Trade Risk Drawing Tests Passed Successfully!');
