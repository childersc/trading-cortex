const assert = require('assert');

console.log('Running Taskbar Minimized Windows Slot Tests...');

// Mock the environment and taskbar logic
let settings = {
  newsBox: { enabled: true, collapsed: false },
  tradesBox: { enabled: true, collapsed: false },
  diagnosticsBox: { enabled: true, collapsed: false },
  bottomPanelStates: {},
  bottomPanelState: { isMinimized: false, isDetached: false },
  minimizedWindowOrder: []
};

let activeFirm = {
  id: 'myfundedperpetuals',
  managePositionsPanel: true
};

let minimizedWindowOrder = [];

// Mock DOM elements
const mockPill = {
  offsetWidth: 95,
  getBoundingClientRect: () => ({ left: 16, right: 111, top: 48, bottom: 92 })
};

const mockElements = {
  positions: { offsetWidth: 195, offsetHeight: 30, isConnected: true, style: { left: '', top: '', display: 'none' } },
  news: { offsetWidth: 215, offsetHeight: 30, isConnected: true, style: { left: '', top: '', display: 'block' } },
  trades: { offsetWidth: 240, offsetHeight: 30, isConnected: true, style: { left: '', top: '', display: 'block' } },
  diagnostics: { offsetWidth: 245, offsetHeight: 30, isConnected: true, style: { left: '', top: '', display: 'block' } }
};

function getActiveFirmBottomPanelState() {
  const firmId = activeFirm?.id || 'default';
  if (settings.bottomPanelStates[firmId]) return settings.bottomPanelStates[firmId];
  return settings.bottomPanelState || { isMinimized: false, isDetached: false };
}

function getTaskbarStartLeft() {
  let startX = 16;
  if (mockPill) {
    const r = mockPill.getBoundingClientRect();
    if (r.right > startX) startX = r.right;
  }
  return Math.round(startX + 8);
}

function getActiveMinimizedWindowOrder() {
  const current = Array.isArray(settings.minimizedWindowOrder)
    ? [...settings.minimizedWindowOrder]
    : (Array.isArray(minimizedWindowOrder) ? [...minimizedWindowOrder] : []);

  const isPositionsManaged = !activeFirm || activeFirm.managePositionsPanel !== false;
  const st = getActiveFirmBottomPanelState();

  const activeCollapsed = [];
  if (isPositionsManaged && (st.isMinimized || st.isDetached)) {
    activeCollapsed.push('positions');
  }
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

// Test 2: Docked State - Positions pill is hidden and NOT in activeCollapsed order
assert.strictEqual(mockElements.positions.style.display, 'none', 'Docked positions panel must be hidden from top bar');
assert.deepStrictEqual(getActiveMinimizedWindowOrder(), [], 'Docked positions must NOT occupy taskbar slot');

// Test 3: Minimize Positions first
settings.bottomPanelStates['myfundedperpetuals'] = { isMinimized: true, isDetached: false };
mockElements.positions.style.display = 'block';
markWindowAsMinimized('positions');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['positions'], 'Positions pill enters taskbar order');
assert.strictEqual(mockElements.positions.style.left, '119px', 'Positions pill takes first available slot (119px)');

// Test 4: Minimize News second (must take next slot after Positions)
settings.newsBox.collapsed = true;
markWindowAsMinimized('news');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['positions', 'news'], 'Order follows minimization sequence');
assert.strictEqual(mockElements.positions.style.left, '119px', 'Positions stays in slot 0');
const expectedNewsLeft = 119 + 195 + 8; // 322px
assert.strictEqual(mockElements.news.style.left, `${expectedNewsLeft}px`, 'News must take NEXT available slot after positions');
assert.notStrictEqual(mockElements.news.style.left, mockElements.positions.style.left, 'Pills must NEVER overlap or cover positions');

// Test 5: Minimize Trades third
settings.tradesBox.collapsed = true;
markWindowAsMinimized('trades');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['positions', 'news', 'trades']);
const expectedTradesLeft = expectedNewsLeft + 215 + 8; // 322 + 215 + 8 = 545px
assert.strictEqual(mockElements.trades.style.left, `${expectedTradesLeft}px`, 'Trades takes 3rd available slot');

// Test 6: Restore Positions (Docked back to bottom)
settings.bottomPanelStates['myfundedperpetuals'] = { isMinimized: false, isDetached: false };
mockElements.positions.style.display = 'none';
markWindowAsRestored('positions');

assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['news', 'trades'], 'Positions cleanly removed from taskbar');
// News should now shift into slot 0 (119px)
assert.strictEqual(mockElements.news.style.left, '119px', 'News shifts to slot 0 when positions is docked');
// Trades should now shift into slot 1 (119 + 215 + 8 = 342px)
assert.strictEqual(mockElements.trades.style.left, `${119 + 215 + 8}px`, 'Trades shifts to slot 1');

// Test 7: Per-firm isolation check
// On Vest Markets, positions is docked; on My Funded Perpetuals, it was minimized
activeFirm = { id: 'vestmarkets', managePositionsPanel: true };
assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['news', 'trades'], 'Vest maintains its own docked bottom panel state');

// Disable positions manager for a firm
activeFirm = { id: 'customfirm', managePositionsPanel: false };
settings.bottomPanelStates['customfirm'] = { isMinimized: true, isDetached: false };
assert.deepStrictEqual(getActiveMinimizedWindowOrder(), ['news', 'trades'], 'Disabled firm suppresses positions from taskbar');

console.log('✓ All Taskbar Minimized Windows Slot Tests Passed!');

