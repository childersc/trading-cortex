const assert = require('assert');

console.log('Running Taskbar Minimized Windows Slot Tests...');

// Mock the environment and taskbar logic
let settings = {
  newsBox: { enabled: true, collapsed: false },
  tradesBox: { enabled: true, collapsed: false },
  diagnosticsBox: { enabled: true, collapsed: false },
  minimizedWindowOrder: []
};

let minimizedWindowOrder = [];

// Mock DOM elements
const mockPill = {
  offsetWidth: 95,
  getBoundingClientRect: () => ({ left: 16, right: 111, top: 48, bottom: 92 })
};

const mockPositionsPill = {
  isConnected: false,
  style: { display: 'none' },
  offsetWidth: 140,
  getBoundingClientRect: () => ({ left: 119, right: 259, top: 48, bottom: 92 })
};

const mockElements = {
  news: { offsetWidth: 215, offsetHeight: 30, isConnected: true, style: { left: '', top: '', display: 'block' } },
  trades: { offsetWidth: 240, offsetHeight: 30, isConnected: true, style: { left: '', top: '', display: 'block' } },
  diagnostics: { offsetWidth: 245, offsetHeight: 30, isConnected: true, style: { left: '', top: '', display: 'block' } }
};

function getTaskbarStartLeft() {
  let startX = 16;
  if (mockPill) {
    const r = mockPill.getBoundingClientRect();
    if (r.right > startX) startX = r.right;
  }
  if (mockPositionsPill.isConnected && mockPositionsPill.style.display !== 'none') {
    const r = mockPositionsPill.getBoundingClientRect();
    if (r.right > startX) startX = r.right;
  }
  return Math.round(startX + 8);
}

function getActiveMinimizedWindowOrder() {
  const current = Array.isArray(settings.minimizedWindowOrder)
    ? [...settings.minimizedWindowOrder]
    : (Array.isArray(minimizedWindowOrder) ? [...minimizedWindowOrder] : []);

  const activeCollapsed = [];
  if (settings.newsBox && settings.newsBox.enabled && settings.newsBox.collapsed) {
    activeCollapsed.push('news');
  }
  if (settings.tradesBox && settings.tradesBox.enabled && settings.tradesBox.collapsed) {
    activeCollapsed.push('trades');
  }
  if (settings.diagnosticsBox && settings.diagnosticsBox.enabled && settings.diagnosticsBox.collapsed) {
    activeCollapsed.push('diagnostics');
  }

  const order = current.filter(id => activeCollapsed.includes(id));
  activeCollapsed.forEach(id => {
    if (!order.includes(id)) {
      order.push(id);
    }
  });

  minimizedWindowOrder = order;
  return order;
}

function markWindowAsMinimized(boxType) {
  const order = getActiveMinimizedWindowOrder();
  if (!order.includes(boxType)) {
    order.push(boxType);
  }
  minimizedWindowOrder = order;
  settings.minimizedWindowOrder = order;
  repositionAllMinimizedBoxes();
}

function markWindowAsRestored(boxType) {
  minimizedWindowOrder = (minimizedWindowOrder || []).filter(id => id !== boxType);
  settings.minimizedWindowOrder = minimizedWindowOrder;
  repositionAllMinimizedBoxes();
}

function getMinimizedCortexBarCoords(boxType, boxEl) {
  const order = getActiveMinimizedWindowOrder();
  let currentLeft = getTaskbarStartLeft();
  const barH = 44;

  for (const type of order) {
    const el = mockElements[type];
    const boxW = (el && el.offsetWidth) || 215;
    const boxH = (el && el.offsetHeight) || 30;

    if (type === boxType) {
      const targetTop = Math.round(48 + (barH - boxH) / 2);
      return {
        left: Math.round(currentLeft),
        top: targetTop
      };
    }
    currentLeft += boxW + 8;
  }

  const boxW = (boxEl && boxEl.offsetWidth) || 215;
  const boxH = (boxEl && boxEl.offsetHeight) || 30;
  return {
    left: Math.round(currentLeft),
    top: Math.round(48 + (barH - boxH) / 2)
  };
}

function repositionAllMinimizedBoxes() {
  const order = getActiveMinimizedWindowOrder();
  let currentLeft = getTaskbarStartLeft();
  const barH = 44;

  for (const boxType of order) {
    const el = mockElements[boxType];
    if (!el || !el.isConnected || el.style.display === 'none') continue;

    const boxW = el.offsetWidth || 215;
    const boxH = el.offsetHeight || 30;
    const targetTop = Math.round(48 + (barH - boxH) / 2);

    el.style.left = `${Math.round(currentLeft)}px`;
    el.style.top = `${targetTop}px`;

    currentLeft += boxW + 8;
  }
}

// -------------------------------------------------------------
// Tests
// -------------------------------------------------------------

// Test 1: Base Start Left
const baseStart = getTaskbarStartLeft();
assert.strictEqual(baseStart, 111 + 8, 'Taskbar start should be 8px after CORTEX pill');

// Test 2: Minimize Diagnostics first
settings.diagnosticsBox.collapsed = true;
markWindowAsMinimized('diagnostics');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['diagnostics']);
const diagCoords = getMinimizedCortexBarCoords('diagnostics', mockElements.diagnostics);
assert.strictEqual(diagCoords.left, 119, 'Diagnostics should take first available slot (119px)');
assert.strictEqual(mockElements.diagnostics.style.left, '119px', 'Element should be positioned at 119px');

// Test 3: Minimize News second (out of legacy alphabetical/hardcoded order)
settings.newsBox.collapsed = true;
markWindowAsMinimized('news');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['diagnostics', 'news'], 'Order must follow minimization sequence');
assert.strictEqual(mockElements.diagnostics.style.left, '119px', 'Diagnostics stays in slot 0');

// Next slot is 119 + 245 (diag width) + 8 = 372px
const expectedNewsLeft = 119 + 245 + 8;
assert.strictEqual(mockElements.news.style.left, `${expectedNewsLeft}px`, 'News must take NEXT available slot, never below diagnostics');
assert.notStrictEqual(mockElements.news.style.left, mockElements.diagnostics.style.left, 'Pills must NEVER overlap or sit below each other');

// Test 4: Minimize Trades third
settings.tradesBox.collapsed = true;
markWindowAsMinimized('trades');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['diagnostics', 'news', 'trades']);
const expectedTradesLeft = expectedNewsLeft + 215 + 8; // 372 + 215 + 8 = 595px
assert.strictEqual(mockElements.trades.style.left, `${expectedTradesLeft}px`, 'Trades takes 3rd available slot');

// Test 5: Restore Diagnostics (first window)
settings.diagnosticsBox.collapsed = false;
markWindowAsRestored('diagnostics');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['news', 'trades'], 'Diagnostics removed from taskbar');
// News should now shift into slot 0 (119px)
assert.strictEqual(mockElements.news.style.left, '119px', 'News shifts to slot 0 when earlier window is restored');
// Trades should now shift into slot 1 (119 + 215 + 8 = 342px)
assert.strictEqual(mockElements.trades.style.left, `${119 + 215 + 8}px`, 'Trades shifts to slot 1');

// Test 6: Bottom positions pill appears in bar
mockPositionsPill.isConnected = true;
mockPositionsPill.style.display = 'block';
repositionAllMinimizedBoxes();

const newStart = 259 + 8; // 267px
assert.strictEqual(mockElements.news.style.left, `${newStart}px`, 'Minimized pills shift when positions pill is present');
assert.strictEqual(mockElements.trades.style.left, `${newStart + 215 + 8}px`, 'Subsequent pills shift proportionally');

console.log('✓ All Taskbar Minimized Windows Slot Tests Passed!');
