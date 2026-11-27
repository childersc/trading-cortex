const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Running Dialog Glass Effect & Viewport Bleed-Through Prevention Tests...');

const isolatedPath = path.join(__dirname, '..', 'content', 'content-isolated.js');
const cssPath = path.join(__dirname, '..', 'content', 'template-bar.css');

const isolatedContent = fs.readFileSync(isolatedPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Verify CSS rules for detached floating window preventing viewport bleed-through (below native site modals)
assert.strictEqual(
  cssContent.includes('.vest-bottom-panel-detached {') &&
  cssContent.includes('background: #0b0f19 !important;') &&
  cssContent.includes('backdrop-filter: none !important;') &&
  cssContent.includes('z-index: 35 !important;') &&
  cssContent.includes('isolation: isolate !important;'),
  true,
  'Detached positions panel must be 100% solid, fully opaque with backdrop-filter: none, modal-safe z-index 35 and isolated stacking context'
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
assert.strictEqual(
  isolatedContent.includes('dialogGlassOpacity: 78'),
  true,
  'settings.dialogGlassOpacity must default to 78% opacity'
);
console.log('✓ settings.dialogGlassEffect and opacity defaults verified');

// 5. Verify applyDialogGlassEffect helper
assert.strictEqual(
  isolatedContent.includes('function applyDialogGlassEffect(enabled, opacity)'),
  true,
  'applyDialogGlassEffect helper must be implemented with opacity support'
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

// 7. Verify Cortex Settings dialog About tab setting & Opacity slider
assert.strictEqual(
  isolatedContent.includes('DISPLAY &amp; DIALOG APPEARANCE') &&
  isolatedContent.includes('id="vest-tvs-dialog-glass-toggle"') &&
  isolatedContent.includes("overlay.querySelector('#vest-tvs-dialog-glass-toggle')") &&
  isolatedContent.includes('id="vest-tvs-dialog-glass-op-range"') &&
  isolatedContent.includes("overlay.querySelector('#vest-tvs-dialog-glass-op-range')"),
  true,
  'Cortex Settings About tab must contain DISPLAY & DIALOG APPEARANCE section with switch and opacity slider'
);
console.log('✓ Cortex Settings About tab Dialog Glass Effect and opacity slider verified');

// 8. Verify dialog drag resizing and handle
assert.strictEqual(
  cssContent.includes('.vest-tvs-resize-handle') &&
  cssContent.includes('min-width: 440px') &&
  cssContent.includes('min-height: 320px') &&
  isolatedContent.includes('vest-tvs-resize-handle') &&
  isolatedContent.includes('isResizingModal'),
  true,
  'Settings dialog must support drag resizing, min dimensions 440x320, and custom resize handle'
);
console.log('✓ Settings dialog drag-resizable footprint and corner handle verified');

// 8b. Verify 80% initial open size and multi-directional edge & corner resize handles
assert.strictEqual(
  isolatedContent.includes("cardW = modalSize.width ? `${modalSize.width}px` : '80vw'") &&
  isolatedContent.includes("cardH = modalSize.height ? `${modalSize.height}px` : '80vh'") &&
  isolatedContent.includes('class="vest-tvs-resize-edge top"') &&
  isolatedContent.includes('class="vest-tvs-resize-edge bottom"') &&
  isolatedContent.includes('class="vest-tvs-resize-edge left"') &&
  isolatedContent.includes('class="vest-tvs-resize-edge right"') &&
  cssContent.includes('.vest-tvs-resize-edge.top') &&
  cssContent.includes('.vest-tvs-resize-edge.bottom') &&
  cssContent.includes('.vest-tvs-resize-edge.left') &&
  cssContent.includes('.vest-tvs-resize-edge.right') &&
  cssContent.includes('.vest-tvs-resize-corner.top-left'),
  true,
  'Settings dialog must open at 80% (80vw x 80vh) and provide multi-directional resize edge handles for all sides'
);
console.log('✓ Settings dialog 80% open size and multi-directional edge/corner resize handles verified');

// 9. Verify unload event listener interception in content-main.js to avoid permissions policy violation
const mainContent = fs.readFileSync(path.join(__dirname, '..', 'content', 'content-main.js'), 'utf8');
assert.strictEqual(
  mainContent.includes("if (type === 'unload')") &&
  mainContent.includes("Permissions policy violation: unload is not allowed in this document"),
  true,
  'content-main.js must drop window unload event listeners to prevent Chrome Permissions Policy violation'
);
console.log('✓ window.addEventListener unload interception verified');

// 10. Verify modal-safe z-index lifting on drag & interaction (stays behind native exchange modals z-50+)
assert.strictEqual(
  isolatedContent.includes("panel.style.setProperty('z-index', '35', 'important')") &&
  isolatedContent.includes("panel.style.setProperty('z-index', '38', 'important')"),
  true,
  'Detached panel must set modal-safe initial z-index 35 and lift to 38 on interaction'
);
console.log('✓ Detached panel modal-safe z-index and active raise verified');

// 11. Verify persistent Cortex bars, pill & docks stay strictly behind site modals/backdrops
//     AND float dynamically above z-50 exchange navbars (e.g. My Funded Perpetuals sticky z-50 header)
assert.strictEqual(
  cssContent.includes('body.vest-site-modal-open #vest-studio-header-pill') &&
  cssContent.includes('body.vest-site-modal-open #vest-studio-header-pill.vest-studio-pill-floating') &&
  cssContent.includes('body.vest-site-modal-open #vest-chart-trades-box') &&
  cssContent.includes('z-index: 1 !important;') &&
  cssContent.includes('z-index: var(--vest-studio-pill-z, 55) !important;') &&
  cssContent.includes('z-index: var(--vest-mobile-dock-z, 55) !important;') &&
  isolatedContent.includes('function detectOpenSiteModalOverlay()') &&
  isolatedContent.includes('function computeHeaderSafePillZIndex()') &&
  isolatedContent.includes('function syncHeaderAwarePillZIndex()') &&
  isolatedContent.includes("document.body.classList.toggle('vest-site-modal-open', hasSiteModal)") &&
  !cssContent.includes('#vest-studio-header-pill.vest-studio-pill-floating {\n  position: fixed !important;\n  margin: 0 !important;\n  z-index: 2147483640') &&
  !isolatedContent.includes("header.style.setProperty('z-index', '1005', 'important')"),
  true,
  'Persistent Cortex pill & mobile dock must clear sticky z-50 headers via header-aware CSS vars while dropping to z-index 1 when any site modal opens'
);
console.log('✓ Site modal stacking guard & header-aware pill z-index verified');

console.log('All Dialog Glass Effect & Viewport Bleed-Through Prevention Tests Passed Successfully!');
