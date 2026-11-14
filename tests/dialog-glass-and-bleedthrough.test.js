const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Running Dialog Glass Effect & Viewport Bleed-Through Prevention Tests...');

const isolatedPath = path.join(__dirname, '..', 'content', 'content-isolated.js');
const cssPath = path.join(__dirname, '..', 'content', 'template-bar.css');

const isolatedContent = fs.readFileSync(isolatedPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Verify CSS rules for detached floating window preventing viewport bleed-through
assert.strictEqual(
  cssContent.includes('.vest-bottom-panel-detached {') &&
  cssContent.includes('background: #0b0f19 !important;') &&
  cssContent.includes('backdrop-filter: none !important;') &&
  cssContent.includes('z-index: 2147483640 !important;') &&
  cssContent.includes('isolation: isolate !important;'),
  true,
  'Detached positions panel must be 100% solid, fully opaque with backdrop-filter: none, high z-index and isolated stacking context'
);
console.log('✓ Detached floating window solid opaque CSS rules verified');

// 2. Verify inner table and tab elements are styled with solid opaque backgrounds
assert.strictEqual(
  cssContent.includes('.vest-bottom-panel-detached [role="tablist"]') &&
  cssContent.includes('.vest-bottom-panel-detached [role="tabpanel"]') &&
  cssContent.includes('background-color: #0b0f19'),
  true,
  'Inner tab lists and panels must have solid opaque backgrounds to prevent chart candles bleeding through'
);
console.log('✓ Inner panel containers & tables solid background verified');

// 3. Verify Dialog Glass Mode styles in template-bar.css
assert.strictEqual(
  cssContent.includes('body.vest-dialog-glass-mode .vest-bottom-panel-detached {') &&
  cssContent.includes('body.vest-dialog-glass-mode .vest-tvs-card {') &&
  cssContent.includes('body.vest-dialog-glass-mode .vest-stm-dialog {') &&
  cssContent.includes('backdrop-filter: blur(20px)'),
  true,
  'Glass effect mode styles must be defined with modern frosted blur for dialogs and detached windows'
);
console.log('✓ Dialog Glass Mode frosted glass rules verified');

// 4. Verify settings.dialogGlassEffect is defined and defaults to false (solid opaque)
assert.strictEqual(
  isolatedContent.includes('dialogGlassEffect: false'),
  true,
  'settings.dialogGlassEffect must default to false (solid opaque backdrop)'
);
console.log('✓ settings.dialogGlassEffect default (false) verified');

// 5. Verify applyDialogGlassEffect helper
assert.strictEqual(
  isolatedContent.includes('function applyDialogGlassEffect(enabled)'),
  true,
  'applyDialogGlassEffect helper must be implemented'
);
console.log('✓ applyDialogGlassEffect helper verified');

// 6. Verify Cortex dropdown menu item and toggle handler
assert.strictEqual(
  isolatedContent.includes('id="vest-sdm-toggle-glass-btn"') &&
  isolatedContent.includes('Dialog Glass Effect') &&
  isolatedContent.includes("menuEl.querySelector('#vest-sdm-toggle-glass-btn')"),
  true,
  'Cortex dropdown menu must contain Dialog Glass Effect toggle button with click listener'
);
console.log('✓ Cortex dropdown menu Dialog Glass Effect toggle verified');

// 7. Verify Cortex Settings dialog About tab setting
assert.strictEqual(
  isolatedContent.includes('DISPLAY &amp; DIALOG APPEARANCE') &&
  isolatedContent.includes('id="vest-tvs-dialog-glass-toggle"') &&
  isolatedContent.includes("overlay.querySelector('#vest-tvs-dialog-glass-toggle')"),
  true,
  'Cortex Settings About tab must contain DISPLAY & DIALOG APPEARANCE section with switch'
);
console.log('✓ Cortex Settings About tab Dialog Glass Effect control verified');

// 8. Verify z-index lifting on drag & interaction
assert.strictEqual(
  isolatedContent.includes("panel.style.setProperty('z-index', '2147483640', 'important')") &&
  isolatedContent.includes("panel.style.setProperty('z-index', '2147483645', 'important')"),
  true,
  'Detached panel must set initial z-index 2147483640 and lift to 2147483645 on interaction'
);
console.log('✓ Detached panel high z-index and active raise verified');

console.log('All Dialog Glass Effect & Viewport Bleed-Through Prevention Tests Passed Successfully!');
