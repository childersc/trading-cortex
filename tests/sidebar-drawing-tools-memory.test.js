const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Running Sidebar Drawing Tool Memory & Restore Tests...');

const mainSrc = fs.readFileSync(path.join(__dirname, '../content/content-main.js'), 'utf8');
const isolatedSrc = fs.readFileSync(path.join(__dirname, '../content/content-isolated.js'), 'utf8');
const swSrc = fs.readFileSync(path.join(__dirname, '../background/service-worker.js'), 'utf8');

function extractBlock(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  assert.notStrictEqual(start, -1, `Could not find start marker: ${startMarker}`);
  const end = src.indexOf(endMarker, start);
  assert.notStrictEqual(end, -1, `Could not find end marker: ${endMarker}`);
  return src.slice(start, end);
}

// Minimal DOM implementation tailored to TradingView's real left drawing toolbar structure
function createMockElement(tagName, attrs = {}, doc = null) {
  const el = {
    nodeType: 1,
    tagName: String(tagName || 'DIV').toUpperCase(),
    attributes: { ...attrs },
    className: attrs.class || '',
    id: attrs.id || '',
    children: [],
    parentElement: null,
    ownerDocument: doc,
    offsetParent: {},
    style: {},
    textContent: attrs.textContent || '',
    _listeners: {},
    getAttribute(name) {
      if (name === 'class') return this.className || null;
      if (name === 'id') return this.id || null;
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, val) {
      if (name === 'class') this.className = String(val);
      else if (name === 'id') this.id = String(val);
      else this.attributes[name] = String(val);
    },
    appendChild(child) {
      child.parentElement = this;
      child.ownerDocument = this.ownerDocument;
      this.children.push(child);
      return child;
    },
    remove() {
      if (this.parentElement) {
        const idx = this.parentElement.children.indexOf(this);
        if (idx >= 0) this.parentElement.children.splice(idx, 1);
        this.parentElement = null;
      }
    },
    getBoundingClientRect() {
      return this._rect || { left: 8, top: 40, width: 42, height: 38 };
    },
    matches(selector) {
      return selector.split(',').some(part => matchSingleSelector(this, part.trim()));
    },
    closest(selector) {
      let cur = this;
      while (cur && cur.nodeType === 1) {
        if (cur.matches(selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    querySelectorAll(selector) {
      const out = [];
      const walk = (node) => {
        for (const ch of node.children) {
          if (ch.matches(selector)) out.push(ch);
          walk(ch);
        }
      };
      walk(this);
      return out;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    addEventListener(type, fn) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(fn);
    },
    dispatchEvent(evt) {
      const list = this._listeners[evt.type] || [];
      list.forEach(fn => fn(evt));
      if (evt.bubbles && this.parentElement) {
        this.parentElement.dispatchEvent(evt);
      } else if (evt.bubbles && this.ownerDocument) {
        this.ownerDocument.dispatchEvent(evt);
      }
      return true;
    },
    click() {
      this._clickCount = (this._clickCount || 0) + 1;
      if (typeof this._onClick === 'function') this._onClick();
    }
  };
  return el;
}

function matchSingleSelector(el, sel) {
  if (!sel || !el || el.nodeType !== 1) return false;

  // Handle simple descendant selector: "A B"
  if (sel.includes(' ')) {
    const parts = sel.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      if (!matchSingleSelector(el, last)) return false;
      let cur = el.parentElement;
      let idx = parts.length - 2;
      while (cur && idx >= 0) {
        if (matchSingleSelector(cur, parts[idx])) idx--;
        cur = cur.parentElement;
      }
      return idx < 0;
    }
  }

  // Handle :not(...)
  let working = sel;
  const notRegex = /:not\(([^)]+)\)/g;
  let m;
  while ((m = notRegex.exec(sel)) !== null) {
    if (matchSingleSelector(el, m[1].trim())) return false;
  }
  working = working.replace(/:not\([^)]+\)/g, '');

  // ID selector
  const idMatch = working.match(/#([A-Za-z0-9_-]+)/);
  if (idMatch && el.id !== idMatch[1]) return false;
  working = working.replace(/#[A-Za-z0-9_-]+/g, '');

  // Attribute selectors
  const attrRegex = /\[([a-zA-Z0-9_-]+)(?:(\*?=)"([^"]*)"(\s*i)?)?\]/g;
  while ((m = attrRegex.exec(working)) !== null) {
    const attrName = m[1];
    const op = m[2];
    const expected = m[3];
    const caseInsensitive = Boolean(m[4]);
    const actual = el.getAttribute(attrName);
    if (!op) {
      if (actual === null || actual === undefined) return false;
    } else if (op === '=') {
      if (actual === null || actual === undefined) return false;
      const a = caseInsensitive ? actual.toLowerCase() : actual;
      const b = caseInsensitive ? expected.toLowerCase() : expected;
      if (a !== b) return false;
    } else if (op === '*=') {
      if (actual === null || actual === undefined) return false;
      const a = caseInsensitive ? actual.toLowerCase() : actual;
      const b = caseInsensitive ? expected.toLowerCase() : expected;
      if (!a.includes(b)) return false;
    }
  }
  working = working.replace(/\[[^\]]+\]/g, '');

  // Class selectors
  const classMatches = working.match(/\.[A-Za-z0-9_-]+/g) || [];
  const elClasses = String(el.className || '').split(/\s+/).filter(Boolean);
  for (const cm of classMatches) {
    if (!elClasses.includes(cm.slice(1))) return false;
  }
  working = working.replace(/\.[A-Za-z0-9_-]+/g, '');

  // Tag selector
  const tag = working.trim();
  if (tag && tag !== '*' && el.tagName !== tag.toUpperCase()) return false;

  return true;
}

function createMockTradingViewEnvironment() {
  const docListeners = {};
  const doc = {
    nodeType: 9,
    head: null,
    body: null,
    defaultView: null,
    activeElement: null,
    createElement(tag) {
      return createMockElement(tag, {}, doc);
    },
    getElementById(id) {
      return doc.head.querySelector(`#${id}`) || doc.body.querySelector(`#${id}`) || null;
    },
    querySelectorAll(sel) {
      return [...doc.head.querySelectorAll(sel), ...doc.body.querySelectorAll(sel)];
    },
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    addEventListener(type, fn) {
      if (!docListeners[type]) docListeners[type] = [];
      docListeners[type].push(fn);
    },
    dispatchEvent(evt) {
      (docListeners[evt.type] || []).forEach(fn => fn(evt));
      return true;
    }
  };
  doc.head = createMockElement('head', {}, doc);
  doc.body = createMockElement('body', {}, doc);

  // Build exact live Hypernova TradingView left drawing toolbar DOM
  const toolbar = createMockElement('div', {
    id: 'drawing-toolbar',
    class: 'drawingToolbar-BfVZxb4b',
    role: 'toolbar'
  }, doc);
  toolbar._rect = { left: 0, top: 40, width: 52, height: 600 };
  doc.body.appendChild(toolbar);

  let selectedApiTool = 'cursor';
  const apiListeners = {};
  const selectLineToolCalls = [];

  const groups = {};
  const INACTIVE_CLASS = 'button-KTgbfaP5 button-GwQQdU8S apply-common-tooltip common-tooltip-vertical isInteractive-GwQQdU8S accessible-GwQQdU8S';
  const ACTIVE_CLASS = 'button-KTgbfaP5 button-GwQQdU8S apply-common-tooltip common-tooltip-vertical isActive-GwQQdU8S isInteractive-GwQQdU8S accessible-GwQQdU8S';

  function setActiveToolbarButton(targetGroupKey) {
    Object.entries(groups).forEach(([k, g]) => {
      g.primaryBtn.className = (k === targetGroupKey) ? ACTIVE_CLASS : INACTIVE_CLASS;
      g.arrowBtn.setAttribute('aria-pressed', k === targetGroupKey ? 'true' : 'false');
    });
  }

  function addGroup(groupKey, dataName, initialLabel, arrowLabel, flyoutItems) {
    const wrap = createMockElement('div', { 'data-name': dataName, class: 'dropdown-pbhJWNrt' }, doc);
    const primaryBtn = createMockElement('button', {
      'aria-label': initialLabel,
      'data-tooltip': initialLabel,
      class: groupKey === 'cursors' ? ACTIVE_CLASS : INACTIVE_CLASS
    }, doc);
    const arrowBtn = createMockElement('button', {
      'aria-label': arrowLabel,
      'aria-pressed': groupKey === 'cursors' ? 'true' : 'false',
      class: 'arrow-pbhJWNrt apply-common-tooltip accessible-pbhJWNrt'
    }, doc);

    primaryBtn._onClick = () => {
      setActiveToolbarButton(groupKey);
      const labelMap = {
        'Cross': 'cursor',
        'Dot': 'dot',
        'Trend Line': 'LineToolTrendLine',
        'Horizontal Ray': 'LineToolHorzRay',
        'Fib Retracement': 'LineToolFibRetracement',
        'Brush': 'LineToolBrush',
        'Rectangle': 'LineToolRectangle'
      };
      selectedApiTool = labelMap[primaryBtn.getAttribute('aria-label')] || 'cursor';
    };

    arrowBtn._onClick = () => {
      // Remove any existing menu
      const existing = doc.querySelector('[data-name="menu-inner"]');
      if (existing) existing.remove();
      const menu = createMockElement('div', { 'data-name': 'menu-inner', role: 'menu' }, doc);
      flyoutItems.forEach(([toolId, label]) => {
        const item = createMockElement('div', {
          'data-role': 'menuitem',
          'data-name': toolId,
          class: 'accessible-NQERJsv9 item-jFqVJoPk',
          textContent: label
        }, doc);
        item._onClick = () => {
          primaryBtn.setAttribute('aria-label', label);
          primaryBtn.setAttribute('data-tooltip', label);
          setActiveToolbarButton(groupKey);
          selectedApiTool = toolId;
          menu.remove();
        };
        menu.appendChild(item);
      });
      doc.body.appendChild(menu);
    };

    wrap.appendChild(primaryBtn);
    wrap.appendChild(arrowBtn);
    toolbar.appendChild(wrap);
    groups[groupKey] = { wrap, primaryBtn, arrowBtn };
  }

  addGroup('cursors', 'linetool-group-cursors', 'Cross', 'Cursors', [
    ['cursor', 'Cross'],
    ['dot', 'Dot'],
    ['arrow', 'Arrow Cursor']
  ]);
  addGroup('trendline', 'linetool-group-trend-line', 'Trend Line', 'Trend line tools', [
    ['LineToolTrendLine', 'Trend Line'],
    ['LineToolHorzRay', 'Horizontal Ray'],
    ['LineToolHorzLine', 'Horizontal Line']
  ]);
  addGroup('fib', 'linetool-group-gann-and-fibonacci', 'Fib Retracement', 'Gann and Fibonacci tools', [
    ['LineToolFibRetracement', 'Fib Retracement']
  ]);
  addGroup('shapes', 'linetool-group-geometric-shapes', 'Brush', 'Geometric shapes', [
    ['LineToolBrush', 'Brush'],
    ['LineToolRectangle', 'Rectangle']
  ]);

  // Magnet wrapper div + inner primary button (mirrors exact TradingView DOM)
  const magnetWrap = createMockElement('div', { 'data-name': 'magnet-button', class: 'dropdown-pbhJWNrt' }, doc);
  const magnetPrimary = createMockElement('button', {
    'aria-label': 'Magnet Mode snaps drawings placed near price bars to the closest OHLC value',
    'aria-pressed': 'false',
    class: INACTIVE_CLASS
  }, doc);
  magnetPrimary._onClick = () => {
    const next = magnetPrimary.getAttribute('aria-pressed') !== 'true';
    magnetPrimary.setAttribute('aria-pressed', next ? 'true' : 'false');
    magnetPrimary.className = next ? ACTIVE_CLASS : INACTIVE_CLASS;
  };
  const magnetArrow = createMockElement('button', { 'aria-label': 'Magnets', 'aria-pressed': 'false', class: 'arrow-pbhJWNrt' }, doc);
  magnetWrap.appendChild(magnetPrimary);
  magnetWrap.appendChild(magnetArrow);
  toolbar.appendChild(magnetWrap);

  // Keep drawing (TradingView real typo: data-name="drawginmode", aria-label="Keep drawing")
  const keepDrawingBtn = createMockElement('button', {
    'data-name': 'drawginmode',
    'aria-label': 'Keep drawing',
    'data-tooltip': 'Keep drawing',
    'aria-pressed': 'false',
    class: INACTIVE_CLASS
  }, doc);
  keepDrawingBtn._onClick = () => {
    const next = keepDrawingBtn.getAttribute('aria-pressed') !== 'true';
    keepDrawingBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
    keepDrawingBtn.className = next ? ACTIVE_CLASS : INACTIVE_CLASS;
  };
  toolbar.appendChild(keepDrawingBtn);

  // Lock all drawings
  const lockBtn = createMockElement('button', {
    'data-name': 'lockAllDrawings',
    'aria-label': 'Lock all drawings',
    'aria-pressed': 'false',
    class: INACTIVE_CLASS
  }, doc);
  lockBtn._onClick = () => {
    const next = lockBtn.getAttribute('aria-pressed') !== 'true';
    lockBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
    lockBtn.className = next ? ACTIVE_CLASS : INACTIVE_CLASS;
  };
  toolbar.appendChild(lockBtn);

  // Hide all drawings wrapper + toolbar collapse button (safety guard test)
  const hideWrap = createMockElement('div', { 'data-name': 'hide-all' }, doc);
  const hidePrimary = createMockElement('button', {
    'aria-label': 'Hide all drawings',
    'aria-pressed': 'false',
    class: INACTIVE_CLASS
  }, doc);
  hideWrap.appendChild(hidePrimary);
  toolbar.appendChild(hideWrap);

  const collapseToolbarBtn = createMockElement('button', {
    'data-name': 'toolbar-drawing-toggle-button',
    'aria-label': 'Hide Drawings Toolbar',
    class: 'toggleButton-OhcB9eH7'
  }, doc);
  toolbar.appendChild(collapseToolbarBtn);

  // External non-sidebar buttons on the trading page (e.g. Hypernova "Cross" margin button & "Short Position")
  const pageCrossMarginBtn = createMockElement('button', {
    'aria-label': 'Cross',
    textContent: 'Cross'
  }, doc);
  pageCrossMarginBtn._rect = { left: 950, top: 20, width: 60, height: 28 };
  doc.body.appendChild(pageCrossMarginBtn);

  const chartCanvas = createMockElement('canvas', { class: 'chart-canvas' }, doc);
  chartCanvas._rect = { left: 100, top: 60, width: 800, height: 500 };
  doc.body.appendChild(chartCanvas);

  const storageMap = new Map();
  const localStorage = {
    get length() { return storageMap.size; },
    key(i) { return Array.from(storageMap.keys())[i] || null; },
    getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
    setItem(k, v) { storageMap.set(String(k), String(v)); },
    removeItem(k) { storageMap.delete(String(k)); }
  };

  const postedMessages = [];

  // Mock TradingView API where selectLineTool() arms the tool WITHOUT updating the DOM group slot icon
  // (the exact real-world TradingView behavior that broke v1.1.146!)
  const activeChartApi = {
    selectedLineTool() { return selectedApiTool; },
    selectLineTool(toolId) {
      selectLineToolCalls.push(toolId);
      selectedApiTool = toolId;
      if (toolId === 'cursor') {
        // Simulate TradingView build where selectLineTool('cursor') sets API or is ignored unless DOM button clicked
      } else {
        // Arm drawing tool, removing active highlight from Crosshair
        groups.cursors.primaryBtn.className = INACTIVE_CLASS;
        groups.cursors.arrowBtn.setAttribute('aria-pressed', 'false');
      }
    },
    subscribe(ev, fn) {
      if (!apiListeners[ev]) apiListeners[ev] = [];
      apiListeners[ev].push(fn);
    },
    emit(ev, payload) {
      (apiListeners[ev] || []).forEach(fn => fn(payload));
    }
  };

  const win = {
    localStorage,
    getComputedStyle() {
      return { display: 'flex', visibility: 'visible', opacity: '1' };
    },
    __VEST_CHART_TEMPLATES_MAIN_INITIALIZED__: true
  };
  win.top = win;
  doc.defaultView = win;

  const storageKeysBlock = extractBlock(
    mainSrc,
    'function isSafeTradingViewStorageKey(key)',
    '// Active cleanup of legacy leaked/corrupted snapshot keys'
  );
  const sidebarBlock = extractBlock(
    mainSrc,
    '// -------------------------------------------------------------\n  // Sidebar Drawing Tool & Magnet Persistence & Restoration',
    '// -------------------------------------------------------------\n  // Chart Settings & Viewport Position Memory'
  );

  const harnessCode = `
    let currentSettings = { rememberSidebarTools: true, sidebarState: {} };
    let activeWidget = null;
    let activeChartApi = __api;
    let activeChart = null;
    let hasReceivedConfigUpdate = true;
    const Element = function() {};
    const PointerEvent = function(type, opts) { return { type, ...(opts || {}), isTrusted: false }; };
    const MouseEvent = function(type, opts) { return { type, ...(opts || {}), isTrusted: false }; };
    const KeyboardEvent = function(type, opts) { return { type, ...(opts || {}), isTrusted: false }; };
    function log() {}
    function postToIsolated(msg) { __posted.push(msg); }
    ${storageKeysBlock}
    ${sidebarBlock}
    this.exports = {
      isSafeTradingViewStorageKey,
      isDrawingToolbarOnlyStorageKey,
      mergeSidebarState,
      isCursorTool,
      hasActiveClassToken,
      isElementActive,
      getCrosshairButton,
      getMagnetButton,
      getStayInDrawingModeButton,
      getLockDrawingsButton,
      getHideDrawingsButton,
      scanDomSidebarGroupSlots,
      setupSidebarObserver,
      saveCurrentSidebarState,
      restoreSidebarSelections,
      hasSidebarMismatchWithTarget,
      setSettings(next) { currentSettings = next; },
      getSettings() { return currentSettings; },
      setRestoreCompleted(v) { hasCompletedInitialSidebarRestore = v; },
      setUserInteracted(v) { userInteractedWithSidebar = v; },
      getStateFlags() {
        return {
          isRestoringSidebar,
          hasCompletedInitialSidebarRestore,
          initialSidebarRestoreVerified,
          userInteractedWithSidebar
        };
      }
    };
  `;

  const ctx = {
    window: win,
    document: doc,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Promise,
    RegExp,
    WeakSet,
    __api: activeChartApi,
    __posted: postedMessages
  };
  vm.runInNewContext(harnessCode, ctx);

  return {
    api: ctx.exports,
    doc,
    groups,
    magnetWrap,
    magnetPrimary,
    keepDrawingBtn,
    lockBtn,
    hidePrimary,
    collapseToolbarBtn,
    pageCrossMarginBtn,
    chartCanvas,
    activeChartApi,
    postedMessages,
    selectLineToolCalls,
    localStorage,
    getSelectedApiTool: () => selectedApiTool,
    setSelectedApiTool: (v) => { selectedApiTool = v; },
    setActiveToolbarButton
  };
}

(async () => {
  // 1. Test isElementActive & hasActiveClassToken — MUST NEVER match "isInteractive-GwQQdU8S"!
  {
    const env = createMockTradingViewEnvironment();
    assert.strictEqual(env.api.hasActiveClassToken('button-KTgbfaP5 isInteractive-GwQQdU8S accessible-GwQQdU8S'), false, 'isInteractive must NOT match as active');
    assert.strictEqual(env.api.hasActiveClassToken('button-KTgbfaP5 isActive-GwQQdU8S isInteractive-GwQQdU8S'), true, 'isActive-GwQQdU8S must match as active');
    assert.strictEqual(env.api.isElementActive(env.groups.trendline.primaryBtn), false, 'Inactive Trend Line button with isInteractive must be false');
    assert.strictEqual(env.api.isElementActive(env.groups.shapes.primaryBtn), false, 'Inactive Brush button with isInteractive must be false');
    assert.strictEqual(env.api.isElementActive(env.groups.cursors.primaryBtn), true, 'Active Cross button with isActive-GwQQdU8S must be true');
    assert.strictEqual(env.api.isElementActive(env.magnetWrap), false, 'Magnet wrapper with aria-pressed="false" inner button must be false');
    assert.strictEqual(env.api.isElementActive(env.magnetPrimary), false, 'Magnet primary button with aria-pressed="false" must be false');

    // Verify DOM getters unwrap to actual clickable buttons and recognize TradingView's drawginmode & lockAllDrawings
    assert.strictEqual(env.api.getCrosshairButton(), env.groups.cursors.primaryBtn, 'getCrosshairButton must return Cross primary button');
    assert.strictEqual(env.api.getMagnetButton(), env.magnetPrimary, 'getMagnetButton must unwrap div[data-name="magnet-button"] to inner button');
    assert.strictEqual(env.api.getStayInDrawingModeButton(), env.keepDrawingBtn, 'getStayInDrawingModeButton must match TradingView data-name="drawginmode" / "Keep drawing"');
    assert.strictEqual(env.api.getLockDrawingsButton(), env.lockBtn, 'getLockDrawingsButton must match data-name="lockAllDrawings"');
    assert.strictEqual(env.api.getHideDrawingsButton(), env.hidePrimary, 'getHideDrawingsButton must unwrap hide-all and never match toolbar-drawing-toggle-button');

    const scan = env.api.scanDomSidebarGroupSlots();
    assert.strictEqual(scan.detectedActiveTool, 'cursor', 'Only Crosshair should be detected as active on initial load');
    assert.strictEqual(scan.detectedGroups.trendline, 'LineToolTrendLine');
    assert.strictEqual(scan.detectedGroups.shapes, 'LineToolBrush');
  }

  // 2. Test finishing a drawing / switching back to cursor saves activeTool: 'cursor' while preserving groupTools!
  {
    const env = createMockTradingViewEnvironment();
    env.api.setupSidebarObserver();
    env.api.setRestoreCompleted(true);

    // User picks Horizontal Ray and Rectangle via flyout
    env.groups.trendline.arrowBtn.click();
    env.doc.querySelector('[data-name="LineToolHorzRay"]').click();
    env.api.saveCurrentSidebarState('LineToolHorzRay');

    env.groups.shapes.arrowBtn.click();
    env.doc.querySelector('[data-name="LineToolRectangle"]').click();
    env.api.saveCurrentSidebarState('LineToolRectangle');

    let st = env.api.getSettings().sidebarState;
    assert.strictEqual(st.groupTools.trendline, 'LineToolHorzRay');
    assert.strictEqual(st.groupTools.shapes, 'LineToolRectangle');
    assert.strictEqual(st.activeTool, 'LineToolRectangle');
    assert.ok(st.updatedAt > 0, 'sidebarState must stamp updatedAt');

    // User finishes drawing rectangle -> TradingView switches back to Crosshair ('cursor')
    env.setActiveToolbarButton('cursors');
    env.setSelectedApiTool('cursor');
    env.activeChartApi.emit('drawing_tool_changed', 'cursor');
    await new Promise(r => setTimeout(r, 120));

    st = env.api.getSettings().sidebarState;
    assert.strictEqual(st.activeTool, 'cursor', 'Returning to Crosshair must save activeTool as cursor (not stay stuck on Rectangle!)');
    assert.strictEqual(st.groupTools.trendline, 'LineToolHorzRay', 'Trendline group memory must remain Horizontal Ray');
    assert.strictEqual(st.groupTools.shapes, 'LineToolRectangle', 'Shapes group memory must remain Rectangle');
  }

  // 3. Test refresh restore: updates mismatched slots via silent flyout AND NEVER leaves Line or Rectangle pre-selected!
  {
    const env = createMockTradingViewEnvironment();
    env.api.setupSidebarObserver();

    // Simulate legacy stuck state from v1.1.146 where activeTool was stuck on 'LineToolRectangle' while stayInDrawingMode was false!
    env.api.setSettings({
      rememberSidebarTools: true,
      sidebarState: {
        magnet: true,
        stayInDrawingMode: false,
        lockDrawings: true,
        hideDrawings: false,
        activeTool: 'LineToolRectangle',
        groupTools: {
          cursors: 'cursor',
          trendline: 'LineToolHorzRay',
          shapes: 'LineToolRectangle'
        },
        updatedAt: Date.now() - 5000
      }
    });

    env.api.restoreSidebarSelections();
    await new Promise(r => setTimeout(r, 750));

    // Both group slots MUST now display the user's saved tools!
    assert.strictEqual(env.groups.trendline.primaryBtn.getAttribute('aria-label'), 'Horizontal Ray', 'Trendline slot must restore to Horizontal Ray');
    assert.strictEqual(env.groups.shapes.primaryBtn.getAttribute('aria-label'), 'Rectangle', 'Shapes slot must restore to Rectangle');
    assert.strictEqual(env.magnetPrimary.getAttribute('aria-pressed'), 'true', 'Magnet must restore to ON');
    assert.strictEqual(env.lockBtn.getAttribute('aria-pressed'), 'true', 'Lock all drawings must restore to ON');
    assert.strictEqual(env.keepDrawingBtn.getAttribute('aria-pressed'), 'false', 'Keep drawing must stay OFF');

    // CRITICAL: Crosshair MUST be active, NOT Rectangle or Horizontal Ray!
    assert.strictEqual(env.api.isElementActive(env.groups.cursors.primaryBtn), true, 'Crosshair button MUST be active after refresh');
    assert.strictEqual(env.api.isElementActive(env.groups.shapes.primaryBtn), false, 'Rectangle MUST NOT remain pre-selected after refresh');
    assert.strictEqual(env.api.isElementActive(env.groups.trendline.primaryBtn), false, 'Horizontal Ray MUST NOT remain pre-selected after refresh');
    assert.strictEqual(env.getSelectedApiTool(), 'cursor', 'TradingView selectedLineTool() MUST be cursor after refresh');

    // Silent flyout style and menu must both be cleanly removed
    assert.strictEqual(env.doc.getElementById('vest-cortex-silent-sidebar-restore'), null, 'Silent restore style must be removed');
    assert.strictEqual(env.doc.querySelector('[data-name="menu-inner"]'), null, 'Flyout menu must be closed after restore');

    // Legacy stuck activeTool must have self-healed to 'cursor'
    assert.strictEqual(env.api.getSettings().sidebarState.activeTool, 'cursor', 'Legacy stuck activeTool must self-heal to cursor');
    assert.strictEqual(env.api.getStateFlags().hasCompletedInitialSidebarRestore, true);
    assert.strictEqual(env.api.getStateFlags().initialSidebarRestoreVerified, true);
  }

  // 4. Test stayInDrawingMode: true preserves armed drawing tool on refresh
  {
    const env = createMockTradingViewEnvironment();
    env.api.setSettings({
      rememberSidebarTools: true,
      sidebarState: {
        magnet: false,
        stayInDrawingMode: true,
        lockDrawings: false,
        hideDrawings: false,
        activeTool: 'LineToolRectangle',
        groupTools: {
          cursors: 'cursor',
          shapes: 'LineToolRectangle'
        },
        updatedAt: Date.now()
      }
    });

    env.api.restoreSidebarSelections();
    await new Promise(r => setTimeout(r, 650));

    assert.strictEqual(env.keepDrawingBtn.getAttribute('aria-pressed'), 'true', 'Keep drawing must restore to ON');
    assert.strictEqual(env.groups.shapes.primaryBtn.getAttribute('aria-label'), 'Rectangle', 'Shapes slot must restore to Rectangle');
    assert.strictEqual(env.getSelectedApiTool(), 'LineToolRectangle', 'When stayInDrawingMode is true, active drawing tool stays armed');
  }

  // 5. Test boot-default protection & non-sidebar click isolation
  {
    const env = createMockTradingViewEnvironment();
    env.api.setupSidebarObserver();
    env.api.setSettings({
      rememberSidebarTools: true,
      sidebarState: {
        magnet: false,
        stayInDrawingMode: false,
        activeTool: 'cursor',
        groupTools: {
          trendline: 'LineToolHorzRay',
          shapes: 'LineToolRectangle'
        },
        updatedAt: Date.now()
      }
    });

    // Click chart canvas BEFORE restore finishes -> must NOT overwrite saved non-defaults with boot defaults!
    env.api.saveCurrentSidebarState(null);
    let st = env.api.getSettings().sidebarState;
    assert.strictEqual(st.groupTools.trendline, 'LineToolHorzRay', 'Boot default Trend Line must NOT overwrite saved Horizontal Ray');
    assert.strictEqual(st.groupTools.shapes, 'LineToolRectangle', 'Boot default Brush must NOT overwrite saved Rectangle');

    // Click external page "Cross" margin button (outside drawing toolbar) -> must NOT trigger tool capture
    const postedBefore = env.postedMessages.length;
    env.doc.dispatchEvent({ type: 'click', target: env.pageCrossMarginBtn, isTrusted: true });
    await new Promise(r => setTimeout(r, 160));
    assert.strictEqual(env.postedMessages.length, postedBefore, 'Clicking external page "Cross" button must NOT pollute sidebar state');
  }

  // 6. Test mergeSidebarState timestamp protection & expanded safe TradingView storage keys
  {
    const env = createMockTradingViewEnvironment();
    const newer = {
      magnet: true,
      activeTool: 'cursor',
      groupTools: { trendline: 'LineToolHorzRay', shapes: 'LineToolRectangle' },
      toolbarStorage: { 'tradingview.linetool-group-trend-line': 'LineToolHorzRay' },
      updatedAt: 2000
    };
    const stale = {
      magnet: false,
      activeTool: 'LineToolTrendLine',
      groupTools: { trendline: 'LineToolTrendLine', fib: 'LineToolFibChannel' },
      toolbarStorage: {},
      updatedAt: 1000
    };
    const merged = env.api.mergeSidebarState(newer, stale);
    assert.strictEqual(merged.magnet, true, 'Newer sidebarState must not be clobbered by stale incoming state');
    assert.strictEqual(merged.activeTool, 'cursor', 'Newer activeTool must win over stale activeTool');
    assert.strictEqual(merged.groupTools.trendline, 'LineToolHorzRay', 'Newer groupTools entry must win');
    assert.strictEqual(merged.groupTools.fib, 'LineToolFibChannel', 'Non-conflicting groupTools entries must be preserved');

    // Safe vs unsafe TradingView toolbar keys
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('tradingview.linetool-group-trend-line'), true);
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('tvlocalstorage.combobox.linetool-group-geometric-shapes'), true);
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('tradingview.FavoriteDrawings'), true);
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('tradingview.magnetMode'), true);
    assert.strictEqual(env.api.isDrawingToolbarOnlyStorageKey('tradingview.chartproperties'), false, 'chartproperties must not bleed into sidebar toolbarStorage');
    assert.strictEqual(env.api.isDrawingToolbarOnlyStorageKey('tradingview.IntervalWidget.quicks'), false, 'IntervalWidget must not bleed into sidebar toolbarStorage');
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('privy:token'), false);
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('wagmi.wallet'), false);
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('tv-drawings-flush:BTC-PERP'), false);
    assert.strictEqual(env.api.isSafeTradingViewStorageKey('user-state-layout-base:abc'), false);
  }

  // 7. Contract checks across content-main.js, content-isolated.js, and service-worker.js
  {
    assert.ok(mainSrc.includes('function shouldOwnSidebarInThisFrame()'), 'content-main.js must enforce single-frame sidebar ownership');
    assert.ok(mainSrc.includes('function isSidebarRestoreActive('), 'content-main.js must use shared doc-level restore lock');
    assert.ok(mainSrc.includes('function hasActiveClassToken('), 'content-main.js must use token-exact active class matching');
    assert.ok(mainSrc.includes('button[data-name="drawginmode"]'), 'content-main.js must recognize TradingView drawginmode button');
    assert.ok(isolatedSrc.includes('function mergeSidebarState('), 'content-isolated.js must define mergeSidebarState');
    assert.ok(isolatedSrc.includes('sidebarState: mergeSidebarState(draftSettings.sidebarState, settings.sidebarState)'), 'Settings modal save must preserve live sidebarState');
    assert.ok(isolatedSrc.includes("key.includes('linetool-group')"), 'content-isolated.js must preserve TradingView linetool-group keys');
    assert.ok(swSrc.includes('key.includes("linetool-group")'), 'service-worker.js must preserve TradingView linetool-group keys');
  }

  console.log('ALL SIDEBAR DRAWING TOOL MEMORY TESTS PASSED!');
})().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
