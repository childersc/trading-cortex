const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Running Bottom Positions Panel Docking & Height Restoration Tests...');

const isolatedPath = path.join(__dirname, '..', 'content', 'content-isolated.js');
const cssPath = path.join(__dirname, '..', 'content', 'template-bar.css');

const isolatedContent = fs.readFileSync(isolatedPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Verify bottom_positions is removed from legacy PANEL_DEFINITIONS
const panelDefMatch = isolatedContent.match(/const PANEL_DEFINITIONS = \[([\s\S]*?)\];/);
assert.ok(panelDefMatch, 'PANEL_DEFINITIONS array must exist');
assert.strictEqual(
  panelDefMatch[1].includes("'bottom_positions'"),
  false,
  'bottom_positions must be removed from legacy PANEL_DEFINITIONS to prevent legacy collapses or header collisions'
);
console.log('✓ bottom_positions cleanly removed from legacy PANEL_DEFINITIONS');

// 2. Verify getPositionRow safely uses findBottomPositionsPanel
assert.strictEqual(
  isolatedContent.includes('function getPositionRow(symbol) {') &&
  isolatedContent.includes('const bottomInfo = typeof findBottomPositionsPanel === \'function\' ? findBottomPositionsPanel() : null;'),
  true,
  'getPositionRow must resolve positions panel via findBottomPositionsPanel'
);
console.log('✓ getPositionRow using findBottomPositionsPanel verified');

// 3. Verify docked height capture logic
assert.strictEqual(
  isolatedContent.includes("panel.dataset.vestDockedHeight = String(Math.round(r.height));"),
  true,
  'panel.dataset.vestDockedHeight must be captured when panel is healthy and docked'
);
console.log('✓ Docked height capture logic verified');

// 4. Verify chart container original height capture flag
assert.strictEqual(
  isolatedContent.includes("if (chartEl.dataset.vestOrigCaptured !== 'true') {") &&
  isolatedContent.includes("chartEl.dataset.vestOrigCaptured = 'true';"),
  true,
  'chartEl must use vestOrigCaptured flag to prevent overwriting original height with 100%'
);
console.log('✓ chartEl vestOrigCaptured safety check verified');

// 5. Verify restoreDetachedToDocked restores explicit height, minHeight, flex, and flex-direction
assert.strictEqual(
  isolatedContent.includes("panel.style.setProperty('height', `${targetH}px`);") &&
  isolatedContent.includes("panel.style.setProperty('min-height', '180px');") &&
  isolatedContent.includes("panel.style.setProperty('flex', '0 0 auto');") &&
  isolatedContent.includes("panel.style.setProperty('display', 'flex');") &&
  isolatedContent.includes("panel.style.setProperty('flex-direction', 'column');"),
  true,
  'restoreDetachedToDocked must set explicit height, min-height: 180px, flex: 0 0 auto, and flex-col layout'
);
console.log('✓ restoreDetachedToDocked explicit height and flexbox restoration verified');

// 6. Verify restoreBottomPanelDocked cleans up chartEl overrides and legacy classes
assert.strictEqual(
  isolatedContent.includes("panel.classList.remove('vest-panel-collapsed', 'vest-panel-floating', 'vest-panel-hidden');") &&
  isolatedContent.includes("chartEl.style.removeProperty('height');") &&
  isolatedContent.includes("chartEl.style.setProperty('flex', '1 1 0%');"),
  true,
  'restoreBottomPanelDocked must strip chartEl 100% height and remove legacy panel collapse classes'
);
console.log('✓ restoreBottomPanelDocked chart cleanup and legacy class removal verified');

// 7. Verify wakeUpPositionsPanel reflow and tab synchronization
assert.strictEqual(
  isolatedContent.includes("function wakeUpPositionsPanel(panel, info)") &&
  isolatedContent.includes("el.dispatchEvent(new Event('scroll', { bubbles: true }));") &&
  isolatedContent.includes("el.dispatchEvent(new Event('resize', { bubbles: true }));") &&
  isolatedContent.includes("activeTab.click();"),
  true,
  'wakeUpPositionsPanel must dispatch reflow events to inner virtualizers and synchronize active tab'
);
console.log('✓ wakeUpPositionsPanel virtualizer wake-up and tab synchronization verified');

// 8. Verify CSS hides redundant docked controls when detached
assert.strictEqual(
  cssContent.includes('.vest-bottom-panel-detached .vest-bottom-panel-controls {') &&
  cssContent.includes('display: none !important;'),
  true,
  'Redundant docked controls must be hidden when bottom panel is in detached mode'
);
console.log('✓ Detached mode controls hiding CSS verified');

console.log('All Bottom Positions Panel Docking & Height Restoration Tests Passed Successfully!');
