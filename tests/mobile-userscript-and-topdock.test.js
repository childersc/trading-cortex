const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
const isolatedSrc = fs.readFileSync(path.join(rootDir, 'content', 'content-isolated.js'), 'utf8');
const mainSrc = fs.readFileSync(path.join(rootDir, 'content', 'content-main.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(rootDir, 'content', 'template-bar.css'), 'utf8');
const userscriptPath = path.join(rootDir, 'userscript', 'trading-cortex.user.js');
const metaPath = path.join(rootDir, 'userscript', 'trading-cortex.meta.js');
const distUserscriptPath = path.join(rootDir, 'dist', 'trading-cortex.user.js');

function extractBlock(source, startMarker, endMarker) {
  const startIdx = source.indexOf(startMarker);
  assert.notStrictEqual(startIdx, -1, `Could not find start marker: ${startMarker}`);
  const endIdx = source.indexOf(endMarker, startIdx + startMarker.length);
  assert.notStrictEqual(endIdx, -1, `Could not find end marker: ${endMarker}`);
  return source.slice(startIdx, endIdx);
}

// ---------------------------------------------------------------------------
// Minimal Mock DOM helpers for testing mobile docked top bar & push-down
// ---------------------------------------------------------------------------
function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add: (...cls) => cls.forEach((c) => set.add(c)),
    remove: (...cls) => cls.forEach((c) => set.delete(c)),
    toggle: (c, force) => {
      if (force === undefined) {
        if (set.has(c)) { set.delete(c); return false; }
        set.add(c); return true;
      }
      if (force) set.add(c); else set.delete(c);
      return Boolean(force);
    },
    contains: (c) => set.has(c),
    toArray: () => Array.from(set)
  };
}

function makeStyle() {
  const map = new Map();
  const proxy = new Proxy({
    setProperty(k, v) { map.set(k, String(v)); },
    removeProperty(k) { map.delete(k); },
    getPropertyValue(k) { return map.get(k) || ''; }
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return map.get(String(prop)) || '';
    },
    set(target, prop, value) {
      if (value === '' || value === null || value === undefined) map.delete(String(prop));
      else map.set(String(prop), String(value));
      return true;
    }
  });
  return proxy;
}

function makeElement(tagName, opts = {}) {
  const attrs = new Map(Object.entries(opts.attrs || {}));
  const listeners = new Map();
  const el = {
    nodeType: 1,
    tagName: String(tagName || 'DIV').toUpperCase(),
    id: opts.id || '',
    classList: makeClassList(opts.classes || []),
    style: makeStyle(),
    children: [],
    parentElement: null,
    parentNode: null,
    isConnected: opts.isConnected !== undefined ? opts.isConnected : false,
    ownerDocument: opts.ownerDocument || null,
    textContent: opts.textContent || '',
    offsetHeight: opts.offsetHeight || 36,
    offsetWidth: opts.offsetWidth || 140,
    _computedStyle: opts.computedStyle || { position: 'static', display: 'block', visibility: 'visible', top: 'auto' },
    _rect: opts.rect || { top: 0, left: 0, bottom: 36, right: 390, width: 390, height: 36 },
    _matchesSelectors: new Set(opts.matches || []),
    setAttribute(k, v) {
      attrs.set(k, String(v));
      if (k === 'id') el.id = String(v);
    },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    removeAttribute(k) { attrs.delete(k); },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    click() {
      const fns = listeners.get('click') || [];
      fns.forEach((fn) => fn({ stopPropagation() {}, preventDefault() {} }));
    },
    getBoundingClientRect() { return { ...el._rect }; },
    matches(sel) {
      const parts = String(sel).split(',').map((s) => s.trim());
      for (const p of parts) {
        if (el._matchesSelectors.has(p)) return true;
        if (p === '[data-vest-mobile-pushed="1"]' && attrs.get('data-vest-mobile-pushed') === '1') return true;
        if (p.startsWith('#') && el.id === p.slice(1)) return true;
        if (p.startsWith('.') && el.classList.contains(p.slice(1))) return true;
        if (p.toUpperCase() === el.tagName) return true;
      }
      return false;
    },
    closest(sel) {
      let cur = el;
      while (cur) {
        if (typeof cur.matches === 'function' && cur.matches(sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    appendChild(child) {
      if (child.parentElement && child.parentElement !== el) {
        child.parentElement.removeChild(child);
      }
      if (!el.children.includes(child)) el.children.push(child);
      child.parentElement = el;
      child.parentNode = el;
      const syncConn = (n, val) => { n.isConnected = val; (n.children || []).forEach((c) => syncConn(c, val)); };
      syncConn(child, el.isConnected);
      return child;
    },
    insertBefore(child, refNode) {
      if (child.parentElement && child.parentElement !== el) {
        child.parentElement.removeChild(child);
      }
      const existingIdx = el.children.indexOf(child);
      if (existingIdx !== -1) el.children.splice(existingIdx, 1);
      const refIdx = refNode ? el.children.indexOf(refNode) : -1;
      if (refIdx === -1) el.children.push(child);
      else el.children.splice(refIdx, 0, child);
      child.parentElement = el;
      child.parentNode = el;
      const syncConn = (n, val) => { n.isConnected = val; (n.children || []).forEach((c) => syncConn(c, val)); };
      syncConn(child, el.isConnected);
      return child;
    },
    removeChild(child) {
      const idx = el.children.indexOf(child);
      if (idx !== -1) el.children.splice(idx, 1);
      child.parentElement = null;
      child.parentNode = null;
      const syncConn = (n, val) => { n.isConnected = val; (n.children || []).forEach((c) => syncConn(c, val)); };
      syncConn(child, false);
      return child;
    },
    remove() {
      if (el.parentElement) el.parentElement.removeChild(el);
    },
    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === el) return true;
        cur = cur.parentElement;
      }
      return false;
    },
    querySelector(sel) {
      const walk = (node) => {
        for (const c of node.children || []) {
          if (c.matches(sel)) return c;
          const found = walk(c);
          if (found) return found;
        }
        return null;
      };
      return walk(el);
    },
    get firstChild() { return el.children[0] || null; },
    set innerHTML(html) {
      // Build structural children for #vest-cortex-mobile-dock template
      el.children = [];
      if (String(html).includes('vest-mobile-dock-left')) {
        const inner = makeElement('div', { classes: ['vest-mobile-dock-inner'], ownerDocument: el.ownerDocument });
        const left = makeElement('div', { classes: ['vest-mobile-dock-left'], ownerDocument: el.ownerDocument });
        const right = makeElement('div', { classes: ['vest-mobile-dock-right'], ownerDocument: el.ownerDocument });
        const venue = makeElement('span', { id: 'vest-mobile-dock-venue', classes: ['vest-mobile-dock-venue'], ownerDocument: el.ownerDocument });
        const btn = makeElement('button', { id: 'vest-mobile-dock-settings-btn', classes: ['vest-mobile-dock-icon-btn'], ownerDocument: el.ownerDocument });
        right.appendChild(venue);
        right.appendChild(btn);
        inner.appendChild(left);
        inner.appendChild(right);
        el.appendChild(inner);
      }
    }
  };
  return el;
}

// ===========================================================================
// 1. Test Mobile Detection, Docked Top Bar Mount, Site Push-Down & Teardown
// ===========================================================================
{
  const dockBlock = extractBlock(
    isolatedSrc,
    "const CORTEX_MOBILE_DOCK_ID = 'vest-cortex-mobile-dock';",
    'let studioMenuOpen = false;'
  );

  function createMobileDockHarness({ width = 390, height = 844, coarse = true, ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1', platform = 'iPhone', maxTouchPoints = 5, firmEnabled = true, userscript = true } = {}) {
    const docEl = makeElement('html', { isConnected: true });
    const body = makeElement('body', { isConnected: true });
    docEl.appendChild(body);

    const fixedHeader = makeElement('header', {
      id: 'site-fixed-header',
      computedStyle: { position: 'fixed', display: 'flex', visibility: 'visible', top: '0px' },
      rect: { top: 0, left: 0, bottom: 48, right: width, width, height: 48 }
    });
    const innerStickyNav = makeElement('nav', {
      id: 'nested-nav-inside-fixed-header',
      computedStyle: { position: 'sticky', display: 'flex', visibility: 'visible', top: '0px' },
      rect: { top: 0, left: 0, bottom: 32, right: width, width, height: 32 }
    });
    fixedHeader.appendChild(innerStickyNav);

    const stickySubHeader = makeElement('nav', {
      id: 'site-sticky-bar',
      computedStyle: { position: 'sticky', display: 'flex', visibility: 'visible', top: '2px' },
      rect: { top: 2, left: 0, bottom: 40, right: width, width, height: 38 }
    });

    const lowerFixedWidget = makeElement('div', {
      id: 'lower-fixed-toast',
      computedStyle: { position: 'fixed', display: 'block', visibility: 'visible', top: '220px' },
      rect: { top: 220, left: 10, bottom: 260, right: width - 10, width: width - 20, height: 40 }
    });

    const siteDialog = makeElement('div', {
      id: 'exchange-modal',
      matches: ['[role="dialog"]'],
      computedStyle: { position: 'fixed', display: 'block', visibility: 'visible', top: '0px' },
      rect: { top: 0, left: 0, bottom: height, right: width, width, height }
    });

    const pill = makeElement('div', {
      id: 'vest-studio-header-pill',
      classes: ['vest-studio-pill-floating'],
      offsetWidth: 130,
      offsetHeight: 28
    });
    pill.style.left = '120px';
    pill.style.top = '10px';

    body.appendChild(fixedHeader);
    body.appendChild(stickySubHeader);
    body.appendChild(lowerFixedWidget);
    body.appendChild(siteDialog);
    body.appendChild(pill);

    const allNodes = () => {
      const list = [];
      const walk = (n) => {
        list.push(n);
        (n.children || []).forEach(walk);
      };
      walk(docEl);
      return list;
    };

    const mockDocument = {
      documentElement: docEl,
      body,
      createElement(tag) { return makeElement(tag, { ownerDocument: mockDocument }); },
      getElementById(id) {
        return allNodes().find((n) => n.id === id) || null;
      },
      querySelectorAll(sel) {
        if (sel === 'iframe') return [];
        if (sel === '[data-vest-mobile-pushed="1"]') {
          return allNodes().filter((n) => n.getAttribute('data-vest-mobile-pushed') === '1');
        }
        return allNodes().filter((n) => n.matches(sel) && n !== docEl && n !== body);
      }
    };
    docEl.ownerDocument = mockDocument;
    body.ownerDocument = mockDocument;
    pill.ownerDocument = mockDocument;

    const resizeHandlers = [];
    let openedSettingsTab = null;
    const mockWindow = {
      innerWidth: width,
      innerHeight: height,
      location: { hostname: 'app.hypernova.xyz' },
      __TRADING_CORTEX_USERSCRIPT__: userscript,
      matchMedia: (q) => ({ matches: q.includes('coarse') ? coarse : false }),
      getComputedStyle: (el) => el._computedStyle || { position: 'static', display: 'block', visibility: 'visible', top: 'auto' },
      addEventListener: (ev, fn) => { resizeHandlers.push({ ev, fn }); }
    };

    const ctx = {
      window: mockWindow,
      document: mockDocument,
      navigator: { userAgent: ua, platform, maxTouchPoints },
      settings: { studioPillPosByHost: {} },
      studioPillEl: pill,
      studioPillHostIframe: null,
      studioMenuOpen: false,
      latestUpdateChannel: 'dev',
      getSafeExtVersion: () => manifest.version,
      getActivePerpFirm: () => ({ id: 'hypernova', name: 'Hypernova', enabled: firmEnabled }),
      isCortexOwnedElement: (el) => Boolean(el && ((el.id && el.id.startsWith('vest-')) || el.closest('#vest-cortex-mobile-dock') || el.closest('#vest-studio-header-pill'))),
      closeStudioDropdown: () => {},
      openStudioSettingsModal: (tab) => { openedSettingsTab = tab; },
      updateStudioDropdownPosition: () => {},
      ensureCortexTopBar: () => {},
      repositionAllMinimizedBoxes: () => {},
      Date,
      Math,
      Number,
      Boolean,
      String,
      parseFloat,
      isFinite
    };

    vm.runInNewContext(
      `${dockBlock}
      this.isMobileCortexLayout = isMobileCortexLayout;
      this.isActiveFirmEnabledForTopDock = isActiveFirmEnabledForTopDock;
      this.isMobileTopDockActive = isMobileTopDockActive;
      this.ensureMobileTopDock = ensureMobileTopDock;
      this.clearMobileTopDock = clearMobileTopDock;
      this.computeHeaderSafePillZIndex = computeHeaderSafePillZIndex;
      this.syncHeaderAwarePillZIndex = syncHeaderAwarePillZIndex;
      this.dockStudioPillNextToMarketSelector = dockStudioPillNextToMarketSelector;`,
      ctx
    );

    return {
      ctx,
      mockWindow,
      mockDocument,
      docEl,
      body,
      pill,
      fixedHeader,
      innerStickyNav,
      stickySubHeader,
      lowerFixedWidget,
      siteDialog,
      resizeHandlers,
      getOpenedSettingsTab: () => openedSettingsTab
    };
  }

  // 1a. iPhone Safari viewport on enabled firm -> mounts top dock & pushes site + top-pinned headers down
  {
    const h = createMobileDockHarness({ width: 390, height: 844, coarse: true, firmEnabled: true });
    assert.strictEqual(h.ctx.isMobileCortexLayout(), true, 'iPhone 390px must be detected as mobile layout');
    assert.strictEqual(h.ctx.isActiveFirmEnabledForTopDock(), true);

    h.ctx.dockStudioPillNextToMarketSelector(h.pill);

    const dock = h.mockDocument.getElementById('vest-cortex-mobile-dock');
    assert.ok(dock && dock.isConnected, 'Mobile docked top bar must be mounted');
    assert.strictEqual(h.body.firstChild, dock, 'Mobile top dock must sit at very top of body');
    assert.strictEqual(h.pill.classList.contains('vest-studio-pill-mobile-docked'), true, 'Pill must switch to mobile-docked mode');
    assert.strictEqual(h.pill.classList.contains('vest-studio-pill-floating'), false, 'Floating class must be removed when mobile-docked');
    assert.strictEqual(h.pill.style.left, '', 'Floating left style must be cleared');
    assert.strictEqual(dock.contains(h.pill), true, 'Pill must be docked inside #vest-cortex-mobile-dock');
    assert.strictEqual(h.docEl.classList.contains('vest-mobile-top-dock-active'), true);
    assert.strictEqual(h.body.classList.contains('vest-mobile-top-dock-active'), true);
    assert.strictEqual(h.docEl.style.getPropertyValue('--vest-mobile-dock-height'), '36px');

    // Top-pinned fixed & sticky headers pushed down cleanly
    assert.strictEqual(h.fixedHeader.style.top, '36px', 'Fixed header at top:0 must be pushed down by dock height');
    assert.strictEqual(h.fixedHeader.getAttribute('data-vest-mobile-pushed'), '1');
    assert.strictEqual(h.innerStickyNav.getAttribute('data-vest-mobile-pushed'), null, 'Child inside already-pushed fixed header must NOT be double-pushed');
    assert.strictEqual(h.stickySubHeader.style.top, '38px', 'Sticky bar at top:2px must be pushed down to 38px');
    assert.strictEqual(h.lowerFixedWidget.getAttribute('data-vest-mobile-pushed'), null, 'Lower fixed element (top:220px) must remain untouched');
    assert.strictEqual(h.siteDialog.getAttribute('data-vest-mobile-pushed'), null, 'Site dialog modal must remain untouched');

    // Quick settings button in mobile dock opens Settings modal directly
    const settingsBtn = dock.querySelector('#vest-mobile-dock-settings-btn');
    assert.ok(settingsBtn, 'Mobile dock must include quick settings button');
    settingsBtn.click();
    assert.strictEqual(h.getOpenedSettingsTab(), 'about');

    // Venue badge shows firm name + Mobile tag in userscript mode
    const venueEl = dock.querySelector('#vest-mobile-dock-venue');
    assert.strictEqual(venueEl.textContent, 'Hypernova · Mobile');

    // Resizing back to desktop (1440px, non-touch) cleanly tears down dock & restores every header
    h.mockWindow.innerWidth = 1440;
    h.mockWindow.matchMedia = () => ({ matches: false });
    h.ctx.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0';
    h.ctx.navigator.platform = 'Win32';
    h.ctx.navigator.maxTouchPoints = 0;
    const resizeEvt = h.resizeHandlers.find((r) => r.ev === 'resize');
    assert.ok(resizeEvt, 'Resize handler must be registered');
    resizeEvt.fn();

    assert.strictEqual(h.mockDocument.getElementById('vest-cortex-mobile-dock'), null, 'Mobile dock must be removed on desktop resize');
    assert.strictEqual(h.body.classList.contains('vest-mobile-top-dock-active'), false);
    assert.strictEqual(h.docEl.style.getPropertyValue('--vest-mobile-dock-height'), '');
    assert.strictEqual(h.fixedHeader.style.top, '', 'Fixed header original top must be cleanly restored');
    assert.strictEqual(h.fixedHeader.getAttribute('data-vest-mobile-pushed'), null);
    assert.strictEqual(h.stickySubHeader.style.top, '', 'Sticky bar original top must be cleanly restored');
    assert.strictEqual(h.pill.classList.contains('vest-studio-pill-floating'), true, 'Desktop floating pill must be restored');
    assert.strictEqual(h.pill.parentElement, h.body);
  }

  // 1b. Disabled firm on mobile must NOT mount top dock or push the site down
  {
    const h = createMobileDockHarness({ width: 390, height: 844, coarse: true, firmEnabled: false });
    h.ctx.dockStudioPillNextToMarketSelector(h.pill);
    assert.strictEqual(h.mockDocument.getElementById('vest-cortex-mobile-dock'), null, 'Disabled site must NOT mount mobile top dock');
    assert.strictEqual(h.body.classList.contains('vest-mobile-top-dock-active'), false, 'Disabled site must NOT push body down');
    assert.strictEqual(h.fixedHeader.getAttribute('data-vest-mobile-pushed'), null, 'Disabled site must NOT shift site headers');
  }

  // 1c. iPadOS Safari (MacIntel + maxTouchPoints > 1, 1024px) activates mobile top dock; Desktop 1440px does NOT
  {
    const ipad = createMobileDockHarness({ width: 1024, height: 1366, coarse: true, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 });
    assert.strictEqual(ipad.ctx.isMobileCortexLayout(), true, 'iPadOS Safari (1024px touch) must enable mobile dock');

    const desktop = createMobileDockHarness({ width: 1440, height: 900, coarse: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0', platform: 'Win32', maxTouchPoints: 0 });
    assert.strictEqual(desktop.ctx.isMobileCortexLayout(), false, 'Desktop 1440px mouse viewport must keep hovering pill');
    desktop.ctx.dockStudioPillNextToMarketSelector(desktop.pill);
    assert.strictEqual(desktop.mockDocument.getElementById('vest-cortex-mobile-dock'), null);
    assert.strictEqual(desktop.pill.classList.contains('vest-studio-pill-floating'), true);
  }

  // 1d. Header-aware pill & mobile dock z-index: My Funded Perpetuals sticky z-50 header must NOT bury Cortex pill
  {
    const mfpDesktop = createMobileDockHarness({ width: 1440, height: 900, coarse: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0', platform: 'Win32', maxTouchPoints: 0 });
    mfpDesktop.fixedHeader._computedStyle = { position: 'sticky', display: 'flex', visibility: 'visible', top: '0px', zIndex: '50' };
    mfpDesktop.siteDialog._computedStyle = { position: 'fixed', display: 'block', visibility: 'visible', top: '0px', zIndex: '90' };
    mfpDesktop.ctx.dockStudioPillNextToMarketSelector(mfpDesktop.pill);
    const mfpRes = mfpDesktop.ctx.computeHeaderSafePillZIndex();
    assert.strictEqual(mfpRes.foundTopHeader, true, 'MFP sticky z-50 header must be detected');
    assert.strictEqual(mfpRes.maxHeaderZ, 50, 'MFP header z-index must read as 50 (ignoring z-90 dialog)');
    assert.strictEqual(mfpRes.pillZ, 52, 'Floating Cortex pill z-index must sit just above z-50 header (52)');
    assert.strictEqual(mfpRes.dockZ, 52, 'Mobile dock z-index must sit just above z-50 header (52)');
    assert.strictEqual(mfpDesktop.docEl.style.getPropertyValue('--vest-studio-pill-z'), '52');
    assert.strictEqual(mfpDesktop.docEl.style.getPropertyValue('--vest-mobile-dock-z'), '52');

    // Low-z header (e.g. Hypernova / Kalshi z-20) stays in low modal-safe band (25 / 38)
    const kalshiDesktop = createMobileDockHarness({ width: 1440, height: 900, coarse: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0', platform: 'Win32', maxTouchPoints: 0 });
    kalshiDesktop.fixedHeader._computedStyle = { position: 'relative', display: 'flex', visibility: 'visible', top: '0px', zIndex: '20' };
    kalshiDesktop.siteDialog._computedStyle = { position: 'fixed', display: 'block', visibility: 'visible', top: '0px', zIndex: '120' };
    kalshiDesktop.ctx.dockStudioPillNextToMarketSelector(kalshiDesktop.pill);
    assert.strictEqual(kalshiDesktop.docEl.style.getPropertyValue('--vest-studio-pill-z'), '25', 'Low-z header keeps pill in modal-safe z-25 band');
    assert.strictEqual(kalshiDesktop.docEl.style.getPropertyValue('--vest-mobile-dock-z'), '38', 'Low-z header keeps mobile dock in z-38 band');

    // Before top header mounts (initial SPA hydration), keeps safe fallback 55
    const hydrating = createMobileDockHarness({ width: 1440, height: 900, coarse: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0', platform: 'Win32', maxTouchPoints: 0 });
    hydrating.fixedHeader.remove();
    hydrating.stickySubHeader.remove();
    hydrating.ctx.dockStudioPillNextToMarketSelector(hydrating.pill);
    assert.strictEqual(hydrating.docEl.style.getPropertyValue('--vest-studio-pill-z'), '55', 'Hydrating page without header yet must use safe fallback z-55');
  }
  console.log('✓ Mobile docked top bar mount, site/header push-down, header-aware z-index, disabled-site guard, and desktop restore verified');
}

// ===========================================================================
// 2. Test Touch TP/SL Drag & Two-Finger Cancel + CSS Rules
// ===========================================================================
{
  const dragBlock = extractBlock(
    mainSrc,
    'function startHypernovaTpSlDrag(',
    'function renderHypernovaChartVisuals('
  );

  const viewListeners = {};
  const makeEmitter = (map) => ({
    addEventListener: (ev, fn) => { (map[ev] = map[ev] || []).push(fn); },
    removeEventListener: (ev, fn) => { if (map[ev]) map[ev] = map[ev].filter((f) => f !== fn); },
    emit: (ev, arg) => { (map[ev] || []).slice().forEach((fn) => fn(arg)); }
  });
  const view = makeEmitter(viewListeners);
  const ownerDoc = { ...makeEmitter({}), defaultView: view };
  const posted = [];
  const ctx = {
    window: { top: { postMessage: (msg) => posted.push(msg) } },
    activeHypernovaDrag: null,
    latestHypernovaYToPriceFn: (y) => 100 - y * 0.1,
    latestHypernovaPaneRect: { top: 0, height: 400 },
    hypernovaManualTpSlBySymbol: {},
    scheduleIctSessionsRender: () => {},
    computeHypernovaTargetPnlUsd: () => 25,
    formatHypernovaDollarAmount: () => '+$25.00',
    setTimeout: () => 1,
    Math,
    Number,
    Date
  };
  vm.runInNewContext(`${dragBlock}\nthis.startHypernovaTpSlDrag = startHypernovaTpSlDrag;`, ctx);

  const pos = { symbol: 'ETH', side: 'long', entryPrice: 3000, sizeQty: 1, notionalUsd: 3000, unrealizedPnl: 0 };
  const makeTouchEvt = (overrides = {}) => ({
    pointerType: 'touch',
    pointerId: 11,
    button: -1,
    buttons: 1,
    clientY: 150,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
    currentTarget: { setPointerCapture() {}, releasePointerCapture() {} },
    ...overrides
  });

  // Safari touch pointerdown with button:-1 starts drag; second finger pointerId:12 cancels without submitting
  ctx.startHypernovaTpSlDrag(makeTouchEvt({ pointerId: 11, button: -1 }), 'sl', pos, ownerDoc);
  assert.ok(ctx.activeHypernovaDrag, 'Touch pointerdown must start TP/SL drag');
  view.emit('pointerdown', makeTouchEvt({ pointerId: 12, button: 0 }));
  assert.strictEqual(ctx.activeHypernovaDrag, null, 'Second finger tap must cancel touch TP/SL drag cleanly');
  view.emit('pointerup', makeTouchEvt({ pointerId: 11, button: 0, clientY: 220 }));
  assert.strictEqual(posted.length, 0, 'Two-finger cancelled touch drag must never submit order');

  // Verify CSS mobile & touch tokens + high-specificity dark theme armor (prevents white settings menu on iOS Safari)
  for (const token of [
    'html.vest-mobile-top-dock-active',
    'body.vest-mobile-top-dock-active',
    '#vest-cortex-mobile-dock',
    'env(safe-area-inset-top, 0px)',
    'body.vest-site-modal-open #vest-cortex-mobile-dock',
    'color-scheme: dark !important;',
    '#vest-studio-settings-dialog .vest-tvs-card',
    '#vest-studio-settings-dialog .vest-tvs-content',
    '#vest-studio-settings-dialog .vest-indicator-tile',
    '#vest-studio-settings-dialog .vest-indicator-settings-btn',
    '#vest-studio-settings-dialog .vest-tvs-toggle-box',
    '#vest-studio-settings-dialog button',
    'body.vest-mobile-top-dock-active #vest-studio-settings-dialog .vest-tvs-card',
    '-webkit-appearance: none !important;',
    '@media (max-width: 900px)',
    'min-width: 0 !important'
  ]) {
    assert.strictEqual(cssSrc.includes(token), true, `template-bar.css missing required mobile token: ${token}`);
  }
  assert.strictEqual(mainSrc.includes('touch-action: none !important;'), true, 'content-main.js must enforce touch-action: none on chart boxes/handles');
  assert.strictEqual(mainSrc.includes('@media (pointer: coarse)'), true, 'content-main.js must include coarse-pointer chart sizing');
  for (const token of [
    '.vest-hn-chart-box.is-mobile-compact',
    '.vest-hn-entry-box.is-mobile-compact',
    '.vest-hn-entry-box.is-mobile-ultra',
    '.vest-hn-tpsl-box.is-mobile-compact',
    '.vest-hn-tpsl-box.is-mobile-ultra',
    'const isCompactMobileChart =',
    'const isUltraNarrowChart =',
    'const mobileFontFactor =',
    'const mobileFontMax ='
  ]) {
    assert.strictEqual(mainSrc.includes(token), true, `content-main.js missing mobile-compact chart box token: ${token}`);
  }
  console.log('✓ Touch TP/SL drag start/cancel, mobile-compact chart overlays, and responsive CSS verified');
}

// ===========================================================================
// 3. Verify Generated Safari Mobile / Universal Userscript Bundle
// ===========================================================================
{
  assert.strictEqual(fs.existsSync(userscriptPath), true, `Expected published userscript at ${userscriptPath} (run scripts/build-userscript.ps1)`);
  assert.strictEqual(fs.existsSync(metaPath), true, `Expected published meta file at ${metaPath}`);
  assert.strictEqual(fs.existsSync(distUserscriptPath), true, `Expected dist userscript at ${distUserscriptPath}`);
  const usSrc = fs.readFileSync(userscriptPath, 'utf8');
  const metaSrc = fs.readFileSync(metaPath, 'utf8');

  // Syntax-check entire generated userscript via vm.Script
  new vm.Script(usSrc, { filename: 'trading-cortex.user.js' });

  // Validate Userscript header metadata for Safari Mobile (Userscripts / Stay / Tampermonkey)
  const requiredHeaderTokens = [
    '// ==UserScript==',
    '// ==/UserScript==',
    `// @version      ${manifest.version}`,
    '// @updateURL    https://raw.githubusercontent.com/childersc/trading-cortex/dev/userscript/trading-cortex.meta.js',
    '// @downloadURL  https://raw.githubusercontent.com/childersc/trading-cortex/dev/userscript/trading-cortex.user.js',
    '// @match        https://*.hypernova.xyz/*',
    '// @match        https://*.vestmarkets.com/*',
    '// @match        https://*.myfundedperpetuals.com/*',
    '// @match        https://*.kalshi.com/*',
    '// @exclude      https://trade.vestmarkets.com/*',
    '// @run-at       document-start',
    '// @inject-into  content',
    '// @grant        GM.getValue',
    '// @grant        GM.setValue',
    '// @grant        GM.xmlHttpRequest',
    '// @grant        GM.addStyle',
    '// @grant        GM_getValue',
    '// @grant        GM_setValue',
    '// @grant        GM_xmlhttpRequest',
    '// @grant        GM_addStyle',
    '// @grant        unsafeWindow'
  ];
  for (const tok of requiredHeaderTokens) {
    assert.strictEqual(usSrc.includes(tok), true, `userscript/trading-cortex.user.js missing header directive: ${tok}`);
    assert.strictEqual(metaSrc.includes(tok), true, `userscript/trading-cortex.meta.js missing header directive: ${tok}`);
  }

  // Test the embedded chrome.* compatibility shim with GM4 async API (Quoid Userscripts on Safari iOS)
  const shimBlock = extractBlock(
    usSrc,
    'function createUserscriptChromeShim() {',
    'let isolatedBooted = false;'
  );
  const gmStore = new Map();
  const lsStore = new Map();
  const ssStore = new Map();
  let xhrCalledUrl = null;

  const shimCtx = {
    EXT_VERSION: manifest.version,
    EXT_NAME: manifest.name,
    GM: {
      getValue: async (k, def) => (gmStore.has(k) ? gmStore.get(k) : def),
      setValue: async (k, v) => { gmStore.set(k, v); },
      xmlHttpRequest: (opts) => {
        xhrCalledUrl = opts.url;
        return Promise.resolve({
          status: 200,
          responseText: JSON.stringify([{ title: 'FOMC Rate Decision', country: 'USD', impact: 'High', date: '2026-11-26T14:00:00-05:00' }])
        });
      }
    },
    window: {
      localStorage: {
        getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
        setItem: (k, v) => { lsStore.set(k, String(v)); }
      },
      sessionStorage: {
        getItem: (k) => (ssStore.has(k) ? ssStore.get(k) : null),
        setItem: (k, v) => { ssStore.set(k, String(v)); }
      }
    },
    setTimeout: (fn) => { fn(); return 1; },
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    Set,
    Promise
  };

  vm.runInNewContext(`${shimBlock}\nthis.chrome = createUserscriptChromeShim();`, shimCtx);
  const chromeShim = shimCtx.chrome;

  // Validate isExtensionValid() contract
  assert.strictEqual(Boolean(chromeShim.runtime.id), true);
  assert.strictEqual(chromeShim.runtime.getManifest().version, manifest.version);
  assert.ok(chromeShim.runtime.getURL('').length > 0, 'chrome.runtime.getURL("") must return non-empty string for isExtensionValid()');

  // Test storage set/get/onChanged deduplication & GM4 async GM.setValue + concurrent write serialization
  let onChangedCalls = 0;
  let lastChange = null;
  chromeShim.storage.onChanged.addListener((changes, area) => {
    onChangedCalls++;
    lastChange = { changes, area };
  });

  (async () => {
    await Promise.all([
      chromeShim.storage.local.set({ settings: { theme: 'dark', scale: 1.2 } }),
      chromeShim.storage.local.set({ templates: [{ id: 't1', name: 'OB' }] })
    ]);
    assert.strictEqual(onChangedCalls, 2, 'Concurrent writes must both serialize cleanly and fire onChanged');
    assert.strictEqual(lastChange.area, 'local');
    assert.strictEqual(gmStore.size, 1, 'Storage must persist via async GM.setValue');
    assert.strictEqual(lsStore.size, 1, 'Storage must also mirror to localStorage');

    // Identical write must NOT trigger redundant onChanged (prevents feedback loops!)
    await chromeShim.storage.local.set({ settings: { theme: 'dark', scale: 1.2 } });
    assert.strictEqual(onChangedCalls, 2, 'Identical write must NOT fire duplicate onChanged');

    const loaded = await chromeShim.storage.local.get(['settings', 'templates']);
    assert.deepStrictEqual(loaded.settings, { theme: 'dark', scale: 1.2 });
    assert.deepStrictEqual(loaded.templates, [{ id: 't1', name: 'OB' }]);

    // Tab info message returns stable numeric tabId
    const tab1 = await chromeShim.runtime.sendMessage({ action: 'getCurrentTabInfo' });
    const tab2 = await chromeShim.runtime.sendMessage({ action: 'getCurrentTabInfo' });
    assert.strictEqual(tab1.ok, true);
    assert.strictEqual(typeof tab1.tabId, 'number');
    assert.strictEqual(tab1.tabId, tab2.tabId, 'Session tab ID must remain stable within tab');

    // Economic calendar message uses async GM.xmlHttpRequest and caches feed
    const cal = await chromeShim.runtime.sendMessage({ action: 'fetchEconomicCalendar', forceRefresh: true });
    assert.strictEqual(cal.ok, true);
    assert.strictEqual(cal.feed.source, 'ForexFactory');
    assert.strictEqual(cal.feed.events.length, 1);
    assert.strictEqual(xhrCalledUrl, 'https://nfs.faireconomy.media/ff_calendar_thisweek.json');

    // Verify same-origin blob: iframe injector + CSP fallback logic
    const injectBlock = extractBlock(
      usSrc,
      'const injectedDocs =',
      '// Inject content-main.js into the current frame'
    );
    const appendedScripts = [];
    const iframeDocEl = {
      _attrs: new Map(),
      getAttribute(k) { return this._attrs.get(k) || null; },
      setAttribute(k, v) { this._attrs.set(k, String(v)); },
      appendChild(node) {
        appendedScripts.push(node);
        node.parentNode = iframeDocEl;
        // Simulate inline script succeeding on normal doc
        if (!node.src) {
          iframeDocEl.setAttribute('data-vest-cortex-main-ran', '1');
        }
      },
      removeChild(node) { node.parentNode = null; }
    };
    const mockIframeDoc = {
      documentElement: iframeDocEl,
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        _attrs: new Map(),
        setAttribute(k, v) { this._attrs.set(k, String(v)); },
        addEventListener() {}
      })
    };
    const injCtx = {
      MAIN_WORLD_PAYLOAD: 'window.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__ = true;',
      WeakSet,
      Blob: function () {},
      URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} }
    };
    vm.runInNewContext(`${injectBlock}\nthis.injectMainWorldIntoDocument = injectMainWorldIntoDocument;`, injCtx);

    assert.strictEqual(injCtx.injectMainWorldIntoDocument(mockIframeDoc, {}), true);
    assert.strictEqual(appendedScripts.length, 1, 'Main world script must be injected once into same-origin iframe');
    // Calling a second time must be a strict no-op
    assert.strictEqual(injCtx.injectMainWorldIntoDocument(mockIframeDoc, {}), true);
    assert.strictEqual(appendedScripts.length, 1, 'Duplicate iframe injection must be prevented');

    // Simulate CSP blocking inline script -> verify automatic blob: fallback triggers
    const cspScripts = [];
    const cspDocEl = {
      getAttribute: () => null,
      appendChild(node) { cspScripts.push(node); node.parentNode = cspDocEl; },
      removeChild(node) { node.parentNode = null; }
    };
    const cspDoc = {
      documentElement: cspDocEl,
      createElement: (tag) => ({ tagName: tag.toUpperCase(), setAttribute() {}, addEventListener() {} })
    };
    assert.strictEqual(injCtx.injectMainWorldIntoDocument(cspDoc, {}), true);
    assert.strictEqual(cspScripts.length, 2, 'Strict CSP blocking inline script must fall back to blob: script');
    assert.strictEqual(cspScripts[1].src, 'blob:mock');

    console.log('✓ Safari Mobile userscript bundle, chrome.* shim, storage dedupe, news proxy & blob: iframe injector verified');
    console.log('ALL MOBILE USERSCRIPT & TOP DOCK TESTS PASSED');
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
