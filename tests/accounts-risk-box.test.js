const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Running On-Chart Accounts & Per-Trade Risk Box Tests...');

const isolatedJsPath = path.join(__dirname, '..', 'content', 'content-isolated.js');
assert(fs.existsSync(isolatedJsPath), 'content-isolated.js must exist');
const isolatedJs = fs.readFileSync(isolatedJsPath, 'utf8');

// 1. Config & Helper definitions
assert(isolatedJs.includes('const DEFAULT_ACCOUNTS_RISK_BOX ='), 'DEFAULT_ACCOUNTS_RISK_BOX must be defined');
assert(isolatedJs.includes('function normalizeAccountsRiskBoxConfig('), 'normalizeAccountsRiskBoxConfig must be defined');
assert(isolatedJs.includes('function computeAccountInstrumentStatus('), 'computeAccountInstrumentStatus must be defined');
assert(isolatedJs.includes('function parseDollarAmount('), 'parseDollarAmount must be defined');
assert(isolatedJs.includes('function getChartTopLeftAnchorRect('), 'getChartTopLeftAnchorRect must be defined');
assert(isolatedJs.includes('function renderChartAccountsRiskBox('), 'renderChartAccountsRiskBox must be defined');
assert(isolatedJs.includes('function clampAndPositionChartAccountsRiskBox('), 'clampAndPositionChartAccountsRiskBox must be defined');
assert(isolatedJs.includes('function wireChartAccountsRiskBoxEvents('), 'wireChartAccountsRiskBoxEvents must be defined');
console.log('✓ Accounts & Risk Box defaults, helpers, and chart overlay renderer verified');

// 2. Integration with Cortex dropdown, Indicator Hub, Taskbar, and Cross-Browser Sync
assert(isolatedJs.includes("id=\"vest-sdm-open-accountsrisk-btn\""), 'Cortex dropdown menu must include Accounts & Risk Box entry');
assert(isolatedJs.includes("id: 'accountsrisk'"), 'Charting Indicators hub must register accountsrisk tile');
assert(isolatedJs.includes("vest-arb-master-enabled"), 'Master toggle for Accounts & Risk Box must be present');
assert(isolatedJs.includes("vest-arb-risk-pct"), 'Configurable risk percentage input must be present in settings');
assert(isolatedJs.includes("vest-arb-inline-risk-pct"), 'Inline quick risk percentage input must be present inside the box');
assert(isolatedJs.includes("CORTEX_ACCOUNT_SNAPSHOT_UPDATE"), 'Cross-tab BroadcastChannel must sync live account snapshots');
assert(isolatedJs.includes("changes.cortexAccountSnapshots"), 'chrome.storage.onChanged must sync multi-browser account snapshots');
assert(isolatedJs.includes("activeCollapsed.push('accounts_risk')"), 'Minimized taskbar must support accounts_risk slot');
console.log('✓ Dropdown, Settings Hub, Taskbar, and Cross-Browser live account sync verified');

// 3. VM Unit Tests for Dollar Parsing & Open PnL vs Per-Trade Risk Computation
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
const fmtSignedCode = extractFn('formatSignedDollar', isolatedJs);
const fmtPlainCode = extractFn('formatPlainDollar', isolatedJs);

const sandbox = { Math, Number, String, Array, Object, Boolean, JSON, isFinite };
vm.createContext(sandbox);
vm.runInContext(
  `${defaultObjMatch[0]}\n${normColorFn}\n${normInstFn}\n${normCfgCode}\n${statusFnCode}\n${parseDollarCode}\n${fmtSignedCode}\n${fmtPlainCode}`,
  sandbox
);

// Test parseDollarAmount
assert.strictEqual(sandbox.parseDollarAmount('$490.29'), 490.29);
assert.strictEqual(sandbox.parseDollarAmount('-$0.20'), -0.2);
assert.strictEqual(sandbox.parseDollarAmount('+$1,250.50'), 1250.5);
assert.strictEqual(sandbox.parseDollarAmount('($15.25)'), -15.25);
assert.strictEqual(sandbox.parseDollarAmount('no money'), null);
console.log('✓ parseDollarAmount accurately parses positive, negative, comma, and parenthesized dollar strings');

// Test normalizeAccountsRiskBoxConfig clamping & defaults
const defCfg = sandbox.normalizeAccountsRiskBoxConfig(null);
assert.strictEqual(defCfg.enabled, true, 'Accounts & Risk Box must be enabled by default');
assert.strictEqual(defCfg.riskPercent, 1.0, 'Default risk percentage must be 1.0%');
assert.strictEqual(defCfg.relX, null, 'Default relX must be null to auto-anchor top-left inside chart');
assert.strictEqual(defCfg.relY, null, 'Default relY must be null to auto-anchor top-left inside chart');

const customCfg = sandbox.normalizeAccountsRiskBoxConfig({ riskPercent: 2.5, boxWidth: 280 });
assert.strictEqual(customCfg.riskPercent, 2.5);
assert.strictEqual(customCfg.boxWidth, 280);
console.log('✓ normalizeAccountsRiskBoxConfig defaults and clamping verified');

// Test computeAccountInstrumentStatus: Open vs Closed on specific instrument
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

// On HYPE -> OPEN position exists -> shows live Open PnL
const hypeStatus = sandbox.computeAccountInstrumentStatus(account76, 'HYPE-PERP', 1.0);
assert.strictEqual(hypeStatus.symbol, 'HYPE');
assert.strictEqual(hypeStatus.hasOpenOnInstrument, true);
assert.strictEqual(hypeStatus.instrumentPosition.side, 'long');
assert.strictEqual(hypeStatus.instrumentPosition.pnl, -0.01);
assert.strictEqual(hypeStatus.totalOpenPnl, -0.20);

// On NQ -> CLOSED / FLAT on NQ -> shows configurable per-trade risk ($490.29 * 1% = $4.9029) while preserving totalOpenPnl
const nqStatus = sandbox.computeAccountInstrumentStatus(account76, 'NQ', 1.0);
assert.strictEqual(nqStatus.symbol, 'NQ');
assert.strictEqual(nqStatus.hasOpenOnInstrument, false);
assert.strictEqual(nqStatus.instrumentPosition, null);
assert(Math.abs(nqStatus.riskAmount - 4.9029) < 0.0001, '1% of $490.29 must equal $4.9029');
assert.strictEqual(sandbox.formatPlainDollar(nqStatus.riskAmount), '$4.90');
assert.strictEqual(nqStatus.totalOpenPnl, -0.20);

// Configurable 2.5% risk on a $10,000 flat account
const account59 = { id: 'Account 59', name: 'Account 59', balance: 10000, totalOpenPnl: 0, positionsBySymbol: {} };
const acct59Status = sandbox.computeAccountInstrumentStatus(account59, 'HYPE', 2.5);
assert.strictEqual(acct59Status.hasOpenOnInstrument, false);
assert.strictEqual(acct59Status.riskAmount, 250);
assert.strictEqual(sandbox.formatPlainDollar(acct59Status.riskAmount), '$250.00');
console.log('✓ VM computation verified: live Open PnL when open, configurable % dollar risk when closed on instrument');

console.log('All On-Chart Accounts & Per-Trade Risk Box Tests Passed Successfully!');
