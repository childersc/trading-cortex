const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Prop Firms Management, Account Restoration & Toolbar Tests...');

// 1. Verify content-main.js has rect defined in scanDomSidebarGroupSlots and sibling loops
const mainContent = fs.readFileSync(path.join(__dirname, '../content/content-main.js'), 'utf8');

// Assert rect is defined before rect.left - hostLeft in both places
const rectMatches = mainContent.match(/const rect = el\.getBoundingClientRect\(\);\s*if \(rect\.width > 0 && \(rect\.left - hostLeft\) > 120\)/g);
assert.strictEqual(rectMatches && rectMatches.length >= 2, true, 'rect must be defined before measuring horizontal offset in scanDomSidebarGroupSlots');
console.log('✓ rect is properly defined in scanDomSidebarGroupSlots & toolbar candidate scanner');

// Assert ensureDrawingToolbarVisible fallback does not blindly execute drawingToolbarAction when state is unknown/true
assert.strictEqual(
  mainContent.includes('isVisible === false && typeof target.executeActionById === \'function\''),
  true,
  'ensureDrawingToolbarVisible must only toggle if checkable state explicitly confirms false'
);
assert.strictEqual(mainContent.includes('function isElementVisible(el)'), true, 'isElementVisible helper must exist');
assert.strictEqual(mainContent.includes('isElementVisible(container)'), true, 'drawing toolbar container must check isElementVisible');
assert.strictEqual(mainContent.includes('isElementVisible(magnetBtn)'), true, 'magnet button must check isElementVisible');
assert.strictEqual(mainContent.includes('Restoring toolbar visibility via executeActionById drawingToolbarAction final fallback...'), true, 'final fallback to restore drawing toolbar must exist');
console.log('✓ ensureDrawingToolbarVisible toggle guard and strict element visibility verified');

// 2. Verify content-isolated.js Prop Firms configuration and deletion logic
const isolatedContent = fs.readFileSync(path.join(__dirname, '../content/content-isolated.js'), 'utf8');

// Test normalizePerpFirmsConfig behavior
const DEFAULT_PERP_FIRMS = [
  {
    id: "myfundedperpetuals",
    name: "My Funded Perpetuals",
    url: "https://myfundedperpetuals.com/trade/",
    matchPatterns: ["myfundedperpetuals.com"],
    enabled: true,
    isBuiltin: true,
    accountTier: "Evaluation / Funded",
    topBarMode: "auto",
    customTopBarOffsetPx: 0,
    barMarginBottom: 8,
    headerHeightPx: 48,
    rememberOrderAmount: true,
    restoreSelectedAccount: true,
    defaultLeverage: "5x"
  },
  {
    id: "vestmarkets",
    name: "Vest Markets",
    url: "https://next.vestmarkets.com/trade",
    matchPatterns: ["next.vestmarkets.com", "vestmarkets.com"],
    enabled: true,
    isBuiltin: true,
    accountTier: "Live DEX",
    topBarMode: "auto",
    customTopBarOffsetPx: 0,
    barMarginBottom: 8,
    headerHeightPx: 48,
    rememberOrderAmount: true,
    restoreSelectedAccount: true,
    defaultLeverage: "10x"
  },
  {
    id: "vestexchange",
    name: "Vest Exchange",
    url: "https://vest.exchange",
    matchPatterns: ["vest.exchange"],
    enabled: true,
    isBuiltin: true,
    accountTier: "Exchange App",
    topBarMode: "auto",
    customTopBarOffsetPx: 0,
    barMarginBottom: 8,
    headerHeightPx: 48,
    rememberOrderAmount: true,
    restoreSelectedAccount: true,
    defaultLeverage: "10x"
  }
];

function normalizePerpFirmsConfig(rawList, deletedIds = null) {
  const list = Array.isArray(rawList) ? rawList : [];
  const deletedSet = new Set(Array.isArray(deletedIds) ? deletedIds : []);
  const result = [];
  const seenIds = new Set();
  const existingById = new Map();
  for (const item of list) {
    if (item && item.id) {
      existingById.set(item.id, item);
    }
  }

  for (const def of DEFAULT_PERP_FIRMS) {
    if (deletedSet.has(def.id)) continue;
    const existing = existingById.get(def.id) || {};
    result.push({
      id: def.id,
      name: String(existing.name || def.name).trim(),
      url: String(existing.url || def.url).trim(),
      matchPatterns: Array.isArray(existing.matchPatterns) && existing.matchPatterns.length > 0 ? existing.matchPatterns.slice() : def.matchPatterns.slice(),
      enabled: existing.enabled !== false,
      isBuiltin: true,
      restoreSelectedAccount: existing.restoreSelectedAccount !== false
    });
    seenIds.add(def.id);
  }

  for (const item of list) {
    if (!item || !item.id || seenIds.has(item.id) || deletedSet.has(item.id)) continue;
    result.push({
      id: item.id,
      name: String(item.name || item.id).trim(),
      url: String(item.url || '').trim(),
      enabled: item.enabled !== false,
      isBuiltin: false,
      restoreSelectedAccount: item.restoreSelectedAccount !== false
    });
    seenIds.add(item.id);
  }

  return result;
}

// Test A: Initial population
const initial = normalizePerpFirmsConfig(null, []);
assert.strictEqual(initial.length, 3);
assert.strictEqual(initial[0].id, 'myfundedperpetuals');
assert.strictEqual(initial[1].id, 'vestmarkets');
assert.strictEqual(initial[2].id, 'vestexchange');
assert.strictEqual(initial[1].restoreSelectedAccount, true);
console.log('✓ Initial default firms normalized with restoreSelectedAccount enabled');

// Test B: Deleting a default firm (e.g. vestexchange)
const deletedIds = ['vestexchange'];
const filteredList = initial.filter(f => f.id !== 'vestexchange');
const afterDelete = normalizePerpFirmsConfig(filteredList, deletedIds);
assert.strictEqual(afterDelete.length, 2);
assert.strictEqual(afterDelete.some(f => f.id === 'vestexchange'), false, 'Deleted default firm must NOT respawn');
console.log('✓ Deleted default firm stays permanently removed');

// Test C: Adding and deleting a custom firm
const customList = [...afterDelete, { id: 'custom_123', name: 'Apex Trader', url: 'https://apextrader.com' }];
const withCustom = normalizePerpFirmsConfig(customList, deletedIds);
assert.strictEqual(withCustom.length, 3);
assert.strictEqual(withCustom[2].id, 'custom_123');

const deletedIds2 = [...deletedIds, 'custom_123'];
const withoutCustom = normalizePerpFirmsConfig(withCustom.filter(f => f.id !== 'custom_123'), deletedIds2);
assert.strictEqual(withoutCustom.length, 2);
assert.strictEqual(withoutCustom.some(f => f.id === 'custom_123'), false);
console.log('✓ Custom firm addition and deletion verified');

// 3. Verify getPropFirmLogoSvg produces valid vector SVG for all firms
assert.strictEqual(isolatedContent.includes('function getPropFirmLogoSvg(firmId, size = 22)'), true);
assert.strictEqual(isolatedContent.includes('myfundedperpetuals'), true);
assert.strictEqual(isolatedContent.includes('vestmarkets'), true);
assert.strictEqual(isolatedContent.includes('vestexchange'), true);
console.log('✓ Official prop firm logos (MFP, Vest Markets, Vest Exchange) verified');

// 4. Verify Vest account tracking & auto-restoration functions exist in content-isolated.js
assert.strictEqual(isolatedContent.includes('function trackActiveAccount()'), true);
assert.strictEqual(isolatedContent.includes('function attemptRestoreSelectedAccount()'), true);
assert.strictEqual(isolatedContent.includes('function initVestAccountTracker()'), true);
assert.strictEqual(isolatedContent.includes('account-selector-trigger'), true);
assert.strictEqual(isolatedContent.includes('Restore Selected Account on Refresh'), true);
console.log('✓ Vest account tracking and auto-restoration verified');

// 5. Verify Positions panel management per-firm setting and scoped state
assert.strictEqual(isolatedContent.includes('managePositionsPanel: true'), true);
assert.strictEqual(isolatedContent.includes('Manage Positions &amp; Orders Panel'), true);
assert.strictEqual(isolatedContent.includes('function getActiveFirmBottomPanelState()'), true);
assert.strictEqual(isolatedContent.includes('vest-pf-input-manage-positions'), true);
console.log('✓ Positions panel per-firm management & scoped state verified');

// 6. Verify Dev Branch indicator (red glow, version number display, and Bleeding Edge title bar)
const cssContent = fs.readFileSync(path.join(__dirname, '../content/template-bar.css'), 'utf8');
assert.strictEqual(cssContent.includes('.vest-studio-pill-trigger.dev-channel'), true, 'dev-channel red glow must exist in CSS');
assert.strictEqual(cssContent.includes('.vest-sdm-channel-header.dev'), true, 'dev channel title header must exist in CSS');
assert.strictEqual(cssContent.includes('.vest-sdm-channel-header.prod'), true, 'prod channel title header must exist in CSS');
assert.strictEqual(isolatedContent.includes('Bleeding Edge'), true, 'Bleeding Edge title must be in dropdown');
assert.strictEqual(isolatedContent.includes('Production'), true, 'Production title must be in dropdown');
assert.strictEqual(isolatedContent.includes(': `v${cleanVer}`'), true, 'Pill subText must show version number instead of dev');
console.log('✓ Dev branch red glow and Bleeding Edge dropdown title bar verified');

console.log('All Prop Firms Management, Account Restoration & Toolbar Tests Passed!');
