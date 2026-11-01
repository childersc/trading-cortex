/**
 * Vest Markets Chart Templates - Main World Content Script
 * Runs in MAIN world (page context and chart iframes)
 * Interacts directly with TradingView Charting Library API
 */

(function () {
  'use strict';

  if (window.location && window.location.hostname === 'trade.vestmarkets.com') return;
  if (window.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__) return;
  window.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__ = true;

  const DEFAULT_TEMPLATES = [];

  const DRAWING_TYPE_LABELS = {
    rectangle: 'Rectangle',
    rotated_rectangle: 'Rotated Rectangle',
    horiz_line: 'Horizontal Line',
    horiz_ray: 'Horizontal Ray',
    vert_line: 'Vertical Line',
    cross_line: 'Cross Line',
    trend_line: 'Trend Line',
    ray: 'Ray',
    extended: 'Extended Line',
    info_line: 'Info Line',
    trend_angle: 'Trend Angle',
    parallel_channel: 'Parallel Channel',
    regression_trend: 'Regression Trend',
    flat_bottom: 'Flat Top/Bottom',
    disjoint_angle: 'Disjoint Channel',
    pitchfork: 'Pitchfork',
    fib_retracement: 'Fib Retracement',
    fib_trend_ext: 'Trend-Based Fib Ext',
    fib_channel: 'Fib Channel',
    fib_time_zone: 'Fib Time Zone',
    fib_fan: 'Fib Speed Fan',
    gann_box: 'Gann Box',
    long_position: 'Long Position',
    short_position: 'Short Position',
    price_range: 'Price Range',
    date_range: 'Date Range',
    date_and_price_range: 'Date & Price Range',
    anchored_vwap: 'Anchored VWAP',
    volume_profile: 'Fixed Range Volume Profile',
    text: 'Text',
    anchored_text: 'Anchored Text',
    note: 'Note',
    callout: 'Callout',
    price_label: 'Price Label',
    arrow_marker: 'Arrow Marker',
    arrow: 'Arrow Line',
    brush: 'Brush',
    highlighter: 'Highlighter',
    path: 'Path',
    circle: 'Circle',
    ellipse: 'Ellipse',
    triangle: 'Triangle',
    arc: 'Arc',
    polyline: 'Polyline'
  };

  function canonicalizeDrawingType(rawName) {
    if (!rawName) return 'rectangle';
    const s = String(rawName).trim().toLowerCase();
    if (!s) return 'rectangle';
    if (s === 'rectangle' || s === 'linetoolrectangle') return 'rectangle';
    if (s === 'rotated_rectangle' || s === 'linetoolrotatedrectangle') return 'rotated_rectangle';
    if (s === 'horiz_line' || s === 'linetoolhorzline' || s === 'horizontal_line') return 'horiz_line';
    if (s === 'horiz_ray' || s === 'linetoolhorzray' || s === 'horizontal_ray') return 'horiz_ray';
    if (s === 'vert_line' || s === 'linetoolvertline' || s === 'vertical_line') return 'vert_line';
    if (s === 'cross_line' || s === 'linetoolcrossline') return 'cross_line';
    if (s === 'trend_line' || s === 'linetooltrendline') return 'trend_line';
    if (s === 'ray' || s === 'linetoolray') return 'ray';
    if (s === 'extended' || s === 'linetoolextended' || s === 'extended_line') return 'extended';
    if (s === 'info_line' || s === 'linetoolinfoline') return 'info_line';
    if (s === 'trend_angle' || s === 'linetooltrendangle') return 'trend_angle';
    if (s === 'parallel_channel' || s === 'linetoolparallelchannel') return 'parallel_channel';
    if (s === 'regression_trend' || s === 'linetoolregressiontrend') return 'regression_trend';
    if (s === 'flat_bottom' || s === 'linetoolflatbottom') return 'flat_bottom';
    if (s === 'disjoint_angle' || s === 'linetooldisjointangle') return 'disjoint_angle';
    if (s.includes('pitchfork')) return 'pitchfork';
    if (s === 'fib_retracement' || s === 'linetoolfibretracement') return 'fib_retracement';
    if (s === 'fib_trend_ext' || s === 'linetooltrendbasedfibextension') return 'fib_trend_ext';
    if (s === 'fib_channel' || s === 'linetoolfibchannel') return 'fib_channel';
    if (s === 'fib_time_zone' || s === 'linetoolfibtimezone') return 'fib_time_zone';
    if (s.includes('fib') && s.includes('fan')) return 'fib_fan';
    if (s.includes('gann')) return 'gann_box';
    if (s === 'long_position' || s === 'linetoolriskrewardlong') return 'long_position';
    if (s === 'short_position' || s === 'linetoolriskrewardshort') return 'short_position';
    if (s === 'date_and_price_range' || s === 'linetooldateandpricerange') return 'date_and_price_range';
    if (s === 'price_range' || s === 'linetoolpricerange') return 'price_range';
    if (s === 'date_range' || s === 'linetooldaterange') return 'date_range';
    if (s.includes('vwap')) return 'anchored_vwap';
    if (s.includes('volumeprofile') || s.includes('volume_profile')) return 'volume_profile';
    if (s === 'anchored_text' || s === 'linetooltextabsolute') return 'anchored_text';
    if (s === 'text' || s === 'linetooltext') return 'text';
    if (s.includes('note')) return 'note';
    if (s === 'callout' || s === 'linetoolcallout') return 'callout';
    if (s === 'price_label' || s === 'linetoolpricelabel') return 'price_label';
    if (s === 'arrow_marker' || s === 'linetoolarrowmarker') return 'arrow_marker';
    if (s.includes('arrow')) return 'arrow';
    if (s === 'brush' || s === 'linetoolbrush') return 'brush';
    if (s === 'highlighter' || s === 'linetoolhighlighter') return 'highlighter';
    if (s === 'path' || s === 'linetoolpath') return 'path';
    if (s === 'circle' || s === 'linetoolcircle') return 'circle';
    if (s === 'ellipse' || s === 'linetoolellipse') return 'ellipse';
    if (s === 'triangle' || s === 'linetooltriangle') return 'triangle';
    if (s === 'arc' || s === 'linetoolarc') return 'arc';
    if (s === 'polyline' || s === 'linetoolpolygonalline') return 'polyline';
    return s.replace(/^linetool/, '');
  }

  function getDrawingTypeLabel(drawingType) {
    const canon = canonicalizeDrawingType(drawingType);
    if (DRAWING_TYPE_LABELS[canon]) return DRAWING_TYPE_LABELS[canon];
    return canon.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Active state
  let currentTemplates = [...DEFAULT_TEMPLATES];
  let currentSettings = {
    activeTemplateId: null,
    defaultTemplateId: null,
    autoApplyToNew: false,
    hotkeysEnabled: true,
    rememberSidebarTools: true,
    rememberLastChartSettings: true,
    lastChartSettings: {},
    favoriteTimeframes: [],
    cortexIndicator: { enabled: false }
  };
  let currentGlobalDrawings = [];
  const globalDrawingEntityMap = new Map(); // chart entity id -> persistent global drawing id
  const globalDrawingRestoreSuppression = new Set();
  const globalDrawingUpdateTimers = new Map();
  const removedGlobalDrawingIds = new Set();
  const nativeAutoFvgRemovalSuppression = new Set();
  const globalDrawingRestoreStartTimes = new WeakMap();
  let hasReceivedConfigUpdate = false;
  let liveFailPrices = { long: null, short: null };
  let liveEstimatedStopLoss = { side: null, price: null };
  let liveEstimatedPnl = null;
  let lastCortexAutomationClosedBarKey = '';
  let lastCortexAutomationContextKey = '';
  let lastCortexAlertClosedBarKey = '';
  let lastCortexAlertContextKey = '';
  let lastCortexFormingAlertKey = '';
  let lastStopLossEstimateMessage = '';
  let failPriceLineButtons = { long: null, short: null };
  let latestChartMarketPrice = null;

  const TIMEFRAME_OPTIONS = [
    { resolution: '1', label: '1 minute', short: '1m' },
    { resolution: '3', label: '3 minutes', short: '3m' },
    { resolution: '5', label: '5 minutes', short: '5m' },
    { resolution: '15', label: '15 minutes', short: '15m' },
    { resolution: '30', label: '30 minutes', short: '30m' },
    { resolution: '60', label: '1 hour', short: '1h' },
    { resolution: '120', label: '2 hours', short: '2h' },
    { resolution: '240', label: '4 hours', short: '4h' },
    { resolution: '360', label: '6 hours', short: '6h' },
    { resolution: '480', label: '8 hours', short: '8h' },
    { resolution: '720', label: '12 hours', short: '12h' },
    { resolution: '1D', label: '1 day', short: '1D' },
    { resolution: '3D', label: '3 days', short: '3D' },
    { resolution: '1W', label: '1 week', short: '1W' },
    { resolution: '1M', label: '1 month', short: '1M' }
  ];
  const TIMEFRAME_BY_RESOLUTION = new Map(TIMEFRAME_OPTIONS.map(item => [item.resolution.toLowerCase(), item]));
  const TIMEFRAME_BY_LABEL = new Map(TIMEFRAME_OPTIONS.map(item => [item.label.toLowerCase(), item]));
  const timeframeStarCaptureDocs = new WeakSet();
  const timeframeFavoriteCaptureDocs = new WeakSet();

  function getTimeframeFavorites() {
    const seen = new Set();
    return (Array.isArray(currentSettings.favoriteTimeframes) ? currentSettings.favoriteTimeframes : [])
      .map(item => {
        const resolution = String(item && typeof item === 'object' ? item.resolution : item || '').trim();
        const option = TIMEFRAME_BY_RESOLUTION.get(resolution.toLowerCase());
        return option ? { ...option, savedLabel: item && item.label } : null;
      })
      .filter(item => {
        if (!item || seen.has(item.resolution)) return false;
        seen.add(item.resolution);
        return true;
      });
  }

  function selectFavoriteTimeframe(resolution) {
    try {
      const chart = activeChart || (activeChartApi && typeof activeChartApi.activeChart === 'function' ? activeChartApi.activeChart() : null);
      if (chart && typeof chart.setResolution === 'function') {
        chart.setResolution(String(resolution), () => scheduleSaveCurrentChartSettings(200));
      }
    } catch (e) {}
  }

  function installTimeframeFavoriteCapture(doc) {
    if (!doc || timeframeFavoriteCaptureDocs.has(doc)) return;
    timeframeFavoriteCaptureDocs.add(doc);
    const view = doc.defaultView;
    if (!view) return;
    const captureFavoriteAction = event => {
      const target = event.target;
      const button = target && typeof target.closest === 'function'
        ? target.closest('#vest-timeframe-favorites [data-tc-timeframe-resolution]')
        : null;
      if (!button) return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.type !== 'click') return;
      event.preventDefault();
      selectFavoriteTimeframe(button.getAttribute('data-tc-timeframe-resolution'));
    };
    // Keep Vest/TradingView's interval control from treating a chip click as a native toolbar action.
    view.addEventListener('pointerdown', captureFavoriteAction, true);
    view.addEventListener('mousedown', captureFavoriteAction, true);
    view.addEventListener('click', captureFavoriteAction, true);
  }

  function findTimeframeMenuRow(target, option) {
    let node = target;
    while (node && node !== document.body && node.parentElement) {
      const text = String(node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (text === option.label.toLowerCase() || text === option.short.toLowerCase()) {
        const rect = node.getBoundingClientRect();
        if (rect.width >= 70 && rect.height >= 18 && rect.height <= 64) return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function enhanceTimeframeMenu() {
    const docs = typeof getSidebarDocuments === 'function' ? getSidebarDocuments() : [document];
    const favoriteSet = new Set(getTimeframeFavorites().map(item => item.resolution));
    docs.forEach(doc => {
      try {
        installTimeframeStarCapture(doc);
        const candidates = doc.querySelectorAll('[role="menuitem"], [data-role="menuitem"], [class*="item"], [class*="Item"]');
        candidates.forEach(candidate => {
          const text = String(candidate.innerText || candidate.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const option = TIMEFRAME_BY_LABEL.get(text) || TIMEFRAME_OPTIONS.find(item => item.short.toLowerCase() === text);
          if (!option) return;
          const row = findTimeframeMenuRow(candidate, option);
          if (!row) return;
          const existingStar = row.querySelector('[data-tc-timeframe-star]');
          if (existingStar) {
            const isFavorite = favoriteSet.has(option.resolution);
            existingStar.textContent = isFavorite ? '★' : '☆';
            existingStar.style.color = isFavorite ? '#f5c542' : '#a1a1aa';
            existingStar.setAttribute('aria-label', `${isFavorite ? 'Remove' : 'Add'} ${option.label} ${isFavorite ? 'from' : 'to'} favorite timeframes`);
            existingStar.title = existingStar.getAttribute('aria-label');
            return;
          }
          const computed = doc.defaultView.getComputedStyle(row);
          if (computed.position === 'static') row.style.position = 'relative';
          row.style.paddingRight = '38px';
          const star = doc.createElement('button');
          star.type = 'button';
          star.setAttribute('data-tc-timeframe-star', option.resolution);
          star.setAttribute('aria-label', `${favoriteSet.has(option.resolution) ? 'Remove' : 'Add'} ${option.label} ${favoriteSet.has(option.resolution) ? 'from' : 'to'} favorite timeframes`);
          star.title = star.getAttribute('aria-label');
          star.textContent = favoriteSet.has(option.resolution) ? '★' : '☆';
          Object.assign(star.style, {
            position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)',
            border: '0', background: 'transparent', color: favoriteSet.has(option.resolution) ? '#f5c542' : '#a1a1aa',
            fontSize: '23px', lineHeight: '26px', width: '30px', height: '30px', cursor: 'pointer', padding: '0', zIndex: '2'
          });
          row.appendChild(star);
        });
      } catch (e) {}
    });
  }

  function installTimeframeStarCapture(doc) {
    if (!doc || timeframeStarCaptureDocs.has(doc)) return;
    timeframeStarCaptureDocs.add(doc);
    const view = doc.defaultView;
    if (!view) return;
    const stopNativeTimeframeAction = event => {
      const target = event.target;
      const star = target && typeof target.closest === 'function' ? target.closest('[data-tc-timeframe-star]') : null;
      if (!star) return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.type !== 'click') return;
      event.preventDefault();
      const resolution = star.getAttribute('data-tc-timeframe-star');
      const option = TIMEFRAME_BY_RESOLUTION.get(String(resolution || '').toLowerCase());
      if (option) {
        postToIsolated({ type: 'VEST_TV_TOGGLE_TIMEFRAME_FAVORITE', payload: { resolution: option.resolution, label: option.label } });
      }
    };
    // Intercept at window capture, before Vest/TradingView's delegated menu handlers can select the row.
    view.addEventListener('pointerdown', stopNativeTimeframeAction, true);
    view.addEventListener('mousedown', stopNativeTimeframeAction, true);
    view.addEventListener('click', stopNativeTimeframeAction, true);
  }

  function enhanceTimeframeFavoritesBar() {
    const docs = typeof getSidebarDocuments === 'function' ? getSidebarDocuments() : [document];
    const favorites = getTimeframeFavorites();
    docs.forEach(doc => {
      try {
        const existing = doc.getElementById('vest-timeframe-favorites');
        installTimeframeFavoriteCapture(doc);
        // Anchor only to the actual TradingView header interval group. Broad "interval" matches
        // can select a chart-title or menu element, placing favorites on the wrong toolbar row.
        // The selector lives in TradingView's top-toolbar wrapper, whose identifier is
        // an id in current Vest charts (not data-name). Prefer it over the separate,
        // narrower chart-title interval button to avoid anchoring favorites in a clipped group.
        let intervalControl = Array.from(doc.querySelectorAll('#header-toolbar-intervals, [data-name="header-toolbar-intervals"]')).find(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 180;
        });
        if (!intervalControl) intervalControl = findVisibleTimeframeButton(doc);
        if (!favorites.length || !intervalControl || !intervalControl.parentElement) {
          if (existing) existing.remove();
          return;
        }
        const intervalWrapper = intervalControl.closest('#header-toolbar-intervals, [data-name="header-toolbar-intervals"]') || intervalControl;
        // The interval selector sits inside a fixed-width, overflow-hidden toolbar group.
        // Put favorites after that group (as a sibling in the full-width toolbar), otherwise
        // the buttons exist in the DOM but are clipped and never appear on screen.
        const toolbarGroup = intervalWrapper.parentElement || intervalControl.parentElement;
        if (!toolbarGroup || !toolbarGroup.parentElement) {
          if (existing) existing.remove();
          return;
        }
        const bar = existing || doc.createElement('div');
        bar.id = 'vest-timeframe-favorites';
        bar.setAttribute('data-tc-favorites-placement', 'toolbar-row');
        bar.setAttribute('aria-label', 'Favorite timeframes');
        Object.assign(bar.style, { display: 'inline-flex', visibility: 'visible', opacity: '1', alignItems: 'center', gap: '3px', marginLeft: '5px', whiteSpace: 'nowrap', verticalAlign: 'middle', flex: '0 0 auto', position: 'relative', zIndex: '20' });
        bar.replaceChildren();
        let activeResolution = '';
        try { activeResolution = String((activeChart && activeChart.resolution && activeChart.resolution()) || '').toLowerCase(); } catch (e) {}
        favorites.forEach(option => {
          const button = doc.createElement('button');
          button.type = 'button';
          button.textContent = option.short;
          button.title = `${option.label} — click to switch`;
          button.setAttribute('data-tc-timeframe-resolution', option.resolution);
          const isActive = activeResolution === option.resolution.toLowerCase();
          Object.assign(button.style, {
            border: '1px solid ' + (isActive ? 'rgba(56,189,248,.65)' : 'rgba(148,163,184,.24)'),
            borderRadius: '4px', background: isActive ? 'rgba(14,116,144,.25)' : 'rgba(15,23,42,.55)',
            color: isActive ? '#7dd3fc' : '#d1d5db', font: '600 11px/20px Arial,sans-serif',
            minWidth: '27px', padding: '0 5px', cursor: 'pointer'
          });
          bar.appendChild(button);
        });
        const toolbarRow = toolbarGroup.parentElement;
        if (bar.parentElement !== toolbarRow || bar.previousElementSibling !== toolbarGroup) {
          toolbarRow.insertBefore(bar, toolbarGroup.nextSibling);
        }
      } catch (e) {}
    });
  }

  function findVisibleTimeframeButton(doc) {
    let resolution = '';
    try { resolution = String((activeChart && activeChart.resolution && activeChart.resolution()) || '').toLowerCase(); } catch (e) {}
    const activeOption = TIMEFRAME_BY_RESOLUTION.get(resolution);
    if (!activeOption) return null;
    const matches = Array.from(doc.querySelectorAll('button, [role="button"]')).filter(el => {
      if (el.closest('#vest-timeframe-favorites') || el.closest('[role="menu"], [data-name*="menu"]')) return false;
      const rect = el.getBoundingClientRect();
      const text = String(el.innerText || el.textContent || '').replace(/\s+/g, '').trim().toLowerCase();
      return rect.width > 15 && rect.width < 100 && rect.height >= 18 && rect.height < 60 && rect.top >= 0 && rect.top < 180 && text === activeOption.short.toLowerCase();
    });
    return matches.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0] || null;
  }

  function enhanceTimeframeControls() {
    enhanceTimeframeMenu();
    enhanceTimeframeFavoritesBar();
  }

  // Read isolated settings mirror (if present on same origin) so we know immediately at document_start if rememberSidebarTools is enabled
  try {
    const rawIso =
      window.localStorage.getItem('__trading_cortex_isolated_settings__') ||
      (window.top && window.top !== window ? window.top.localStorage.getItem('__trading_cortex_isolated_settings__') : null);
    if (rawIso) {
      const parsedIso = JSON.parse(rawIso);
      if (parsedIso && typeof parsedIso === 'object') {
        currentSettings = { ...currentSettings, ...parsedIso };
      }
    }
  } catch (e) {}

  // Immediately hydrate sidebarState and lastChartSettings from localStorage mirror (checking both current window and window.top for blob: chart iframes!)
  try {
    const rawSavedSidebar =
      window.localStorage.getItem('__trading_cortex_sidebar_state__') ||
      (window.top && window.top !== window ? window.top.localStorage.getItem('__trading_cortex_sidebar_state__') : null);
    if (rawSavedSidebar) {
      const parsedSidebar = JSON.parse(rawSavedSidebar);
      if (parsedSidebar && typeof parsedSidebar === 'object') {
        currentSettings.sidebarState = parsedSidebar;
        // Pre-populate TradingView's native toolbar localStorage keys at document_start BEFORE TradingView's scripts run!
        if (currentSettings.rememberSidebarTools !== false && parsedSidebar.toolbarStorage) {
          Object.entries(parsedSidebar.toolbarStorage).forEach(([k, v]) => {
            if (typeof v === 'string' && !k.startsWith('__trading_cortex_')) {
              try {
                window.localStorage.setItem(k, v);
              } catch (e) {}
            }
          });
        }
      }
    }
    const rawSavedChart =
      window.localStorage.getItem('__trading_cortex_chart_settings__') ||
      (window.top && window.top !== window ? window.top.localStorage.getItem('__trading_cortex_chart_settings__') : null);
    if (rawSavedChart) {
      const parsedChart = JSON.parse(rawSavedChart);
      if (parsedChart && typeof parsedChart === 'object') {
        currentSettings.lastChartSettings = parsedChart;
        if (currentSettings.rememberLastChartSettings !== false && parsedChart.localStorageEntries) {
          Object.entries(parsedChart.localStorageEntries).forEach(([k, v]) => {
            if (typeof v === 'string' && !k.startsWith('__trading_cortex_')) {
              try {
                window.localStorage.setItem(k, v);
              } catch (e) {}
            }
          });
        }
      }
    }
  } catch (e) {}

  let storageHookPostTimer = null;

  // Hook window.localStorage.setItem in this frame so any key TradingView writes when changing drawing tools or magnet mode is immediately captured
  try {
    const origSetItem = Storage.prototype.setItem;
    if (origSetItem && !Storage.prototype.__tradingCortexHooked__) {
      Storage.prototype.__tradingCortexHooked__ = true;
      Storage.prototype.setItem = function (key, value) {
        const res = origSetItem.apply(this, arguments);
        try {
          if (
            this === window.localStorage &&
            typeof key === 'string' &&
            !key.startsWith('__trading_cortex_') &&
            !key.startsWith('tv-chart-drawings-') &&
            !key.startsWith('vest') &&
            typeof value === 'string' &&
            value.length < 16000
          ) {
            // Capture ANY TradingView key (tradingview.*, TVLocalStorage.*, combobox.*, linetool.*, etc.)
            if (
              currentSettings.rememberSidebarTools !== false &&
              (/tradingview|tvlocalstorage|linetool|drawing|toolbar|magnet|combobox|group|active|tool|favorite/i.test(key) || /LineTool/i.test(value))
            ) {
              const prev = currentSettings.sidebarState || {};
              const prevToolbar = prev.toolbarStorage || {};
              if (prevToolbar[key] !== value) {
                const nextToolbarStorage = {
                  ...prevToolbar,
                  [key]: value
                };
                currentSettings.sidebarState = {
                  ...prev,
                  toolbarStorage: nextToolbarStorage
                };
                const serialized = JSON.stringify(currentSettings.sidebarState);
                origSetItem.call(window.localStorage, '__trading_cortex_sidebar_state__', serialized);
                try {
                  if (window.top && window.top !== window && window.top.localStorage) {
                    origSetItem.call(window.top.localStorage, '__trading_cortex_sidebar_state__', serialized);
                  }
                } catch (e) {}
                if (storageHookPostTimer) clearTimeout(storageHookPostTimer);
                storageHookPostTimer = setTimeout(() => {
                  storageHookPostTimer = null;
                  postToIsolated({
                    type: 'VEST_TV_SIDEBAR_STATE_CHANGED',
                    sidebarState: currentSettings.sidebarState
                  });
                }, 400);
              }
            }
          }
        } catch (e) {}
        return res;
      };
    }
  } catch (e) {}

  let activeWidget = null;
  let activeChart = null;
  let activeChartApi = null;
  let lastInteractedShapeId = null;
  let lastRectangleId = null;
  let rightClickedShapeId = null;
  let rightClickedDrawingType = null;

  function log(...args) {
    console.log('[VestTemplates:Main]', ...args);
  }

  function postToIsolated(msg) {
    try {
      if (window.top && window.top !== window) {
        window.top.postMessage(msg, '*');
      } else {
        window.postMessage(msg, '*');
      }
    } catch (e) {
      try {
        window.postMessage(msg, '*');
      } catch (e2) {}
    }
  }

  function getActiveTemplate() {
    if (!currentTemplates.length) return null;
    return (
      currentTemplates.find(t => t.id === currentSettings.activeTemplateId) ||
      currentTemplates.find(t => t.id === currentSettings.defaultTemplateId) ||
      currentTemplates[0]
    );
  }

  const FORBIDDEN_SHAPE_PROP_KEYS = new Set([
    'symbol',
    'symbolStateVersion',
    'zOrderVersion',
    'currencyId',
    'unitId',
    'interval',
    'points',
    'intervalsVisibilities',
    'ownerSource',
    'linkKey',
    'id',
    'type',
    'zorder',
    'isSelectionEnabled',
    'userEditEnabled',
    // TradingView Order/Position Line keys that must never be passed to drawing shapes
    'bodyBackgroundColor',
    'bodyBackgroundTransparency',
    'bodyBorderActiveBuyColor',
    'bodyBorderActiveSellColor',
    'bodyBorderInactiveBuyColor',
    'bodyBorderInactiveSellColor',
    'bodyFontBold',
    'bodyFontFamily',
    'bodyFontItalic',
    'bodyFontSize',
    'bodyTextActiveBuyColor',
    'bodyTextActiveLimitColor',
    'bodyTextActiveSellColor',
    'bodyTextActiveStopColor',
    'bodyTextInactiveBuyColor',
    'bodyTextInactiveLimitColor',
    'bodyTextInactiveSellColor',
    'bodyTextInactiveStopColor',
    'cancelButtonBackgroundColor',
    'cancelButtonBackgroundTransparency',
    'cancelButtonBorderActiveBuyColor',
    'cancelButtonBorderActiveSellColor',
    'cancelButtonBorderInactiveBuyColor',
    'cancelButtonBorderInactiveSellColor',
    'cancelButtonIconActiveBuyColor',
    'cancelButtonIconActiveSellColor',
    'cancelButtonIconInactiveBuyColor',
    'cancelButtonIconInactiveSellColor',
    'cancelTooltip',
    'lineActiveBuyColor',
    'lineActiveSellColor',
    'lineInactiveBuyColor',
    'lineInactiveSellColor',
    'lineLength',
    'lineLengthUnit',
    'modifyTooltip',
    'quantityBackgroundActiveBuyColor',
    'quantityBackgroundActiveSellColor',
    'quantityBackgroundInactiveBuyColor',
    'quantityBackgroundInactiveSellColor',
    'quantityBorderActiveBuyColor',
    'quantityBorderActiveSellColor',
    'quantityBorderInactiveBuyColor',
    'quantityBorderInactiveSellColor',
    'quantityFontBold',
    'quantityFontFamily',
    'quantityFontItalic',
    'quantityFontSize',
    'quantityTextColor',
    'quantityTextTransparency',
    'tooltip'
  ]);

  function sanitizeRawShapeProperties(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const cleaned = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.includes('.')) continue;
      if (FORBIDDEN_SHAPE_PROP_KEYS.has(k)) continue;
      if (v === 'inherit') continue;
      cleaned[k] = v;
    }
    if ('bodyBorderActiveBuyColor' in raw || 'cancelButtonBorderActiveBuyColor' in raw) {
      delete cleaned.lineColor;
      delete cleaned.lineStyle;
      delete cleaned.lineWidth;
    }
    return cleaned;
  }

  /**
   * Convert template object into TradingView shape properties for ANY drawing type
   */
  function buildShapePropertiesForTemplate(tpl, shape, drawingTypeOverride) {
    if (!tpl) return {};
    const drawingType = canonicalizeDrawingType(drawingTypeOverride || tpl.drawingType || 'rectangle');
    const existingProps = (shape && typeof shape.getProperties === 'function') ? (shape.getProperties() || {}) : {};

    // Start from sanitized rawProperties if available so tool-specific fields (fib levels, channel styles, etc.) are preserved
    const baseRaw = sanitizeRawShapeProperties(tpl.rawProperties);

    const opacityPct = typeof tpl.opacity === 'number' ? tpl.opacity : 20;
    const transparency = Math.max(0, Math.min(100, 100 - opacityPct));
    const mainColorHex = parseColorAndAlpha(tpl.color, '#22c55e').hex;
    const borderOpacityPct = typeof tpl.borderOpacity === 'number' ? Math.max(0, Math.min(100, tpl.borderOpacity)) : 100;
    const mainColor = borderOpacityPct < 100 ? hexToRgbaString(mainColorHex, borderOpacityPct) : mainColorHex;
    const bgColor = parseColorAndAlpha(tpl.backgroundColor || mainColorHex, mainColorHex).hex;
    const lineW = Number(tpl.linewidth) || 1;
    const lineS = Number(tpl.linestyle ?? 0);
    const showMiddleLine = Boolean(tpl.showMiddleLine);
    const middleLineColorHex = parseColorAndAlpha(tpl.middleLineColor || mainColorHex, mainColorHex).hex;
    const middleLineOpacityPct = typeof tpl.middleLineOpacity === 'number' ? Math.max(0, Math.min(100, tpl.middleLineOpacity)) : 100;
    const middleLineColor = middleLineOpacityPct < 100 ? hexToRgbaString(middleLineColorHex, middleLineOpacityPct) : middleLineColorHex;
    const middleLineWidth = Number(tpl.middleLineWidth) || 1;
    const middleLineStyle = tpl.middleLineStyle !== undefined ? Number(tpl.middleLineStyle) : 2;
    const horzAlign = tpl.horzLabelsAlign || 'right';
    const vertAlign = tpl.vertLabelsAlign || 'middle';
    const txtColorHex = parseColorAndAlpha(tpl.textColor || mainColorHex, mainColorHex).hex;
    const txtColor = borderOpacityPct < 100 ? hexToRgbaString(txtColorHex, Math.max(borderOpacityPct, 65)) : txtColorHex;
    const fontSz = Number(tpl.fontSize) || 12;

    const props = {
      ...baseRaw
    };

    // Map primary stroke/line color across all TradingView tool property naming conventions
    if ('color' in existingProps || 'color' in baseRaw || drawingType === 'rectangle' || drawingType === 'rotated_rectangle') {
      props.color = mainColor;
    }
    if ('linecolor' in existingProps || 'linecolor' in baseRaw || ['horiz_line', 'horiz_ray', 'vert_line', 'cross_line', 'trend_line', 'ray', 'extended', 'info_line', 'parallel_channel', 'arrow'].includes(drawingType)) {
      props.linecolor = mainColor;
    }
    if ('borderColor' in existingProps || 'borderColor' in baseRaw) {
      props.borderColor = mainColor;
    }

    // Line width & style
    props.linewidth = lineW;
    props.linestyle = lineS;

    // Background / fill properties (for rectangles, channels, circles, callouts, etc.)
    // IMPORTANT: TradingView's LineToolRectangle / LineToolParallelChannel render fill alpha directly from
    // an rgba(r, g, b, alpha) backgroundColor string AND transparency (0..100). Passing a solid #rrggbb
    // string makes the fill 100% opaque in TradingView's canvas renderer!
    const bgRgba = hexToRgbaString(bgColor, opacityPct);
    if (
      'backgroundColor' in existingProps ||
      'backgroundColor' in baseRaw ||
      ['rectangle', 'rotated_rectangle', 'parallel_channel', 'flat_bottom', 'disjoint_angle', 'circle', 'ellipse', 'triangle', 'callout', 'price_label'].includes(drawingType)
    ) {
      props.backgroundColor = bgRgba;
      props.transparency = transparency;
      if ('backgroundTransparency' in existingProps || 'backgroundTransparency' in baseRaw) {
        props.backgroundTransparency = transparency;
      }
      if ('fillBackground' in existingProps || 'fillBackground' in baseRaw || drawingType === 'rectangle' || drawingType === 'parallel_channel') {
        props.fillBackground = opacityPct > 0;
      }
    }

    // Extend left / right
    if ('extendRight' in existingProps || 'extendRight' in baseRaw || ['rectangle', 'trend_line', 'parallel_channel', 'horiz_ray', 'ray', 'extended'].includes(drawingType)) {
      props.extendRight = Boolean(tpl.extendRight);
    }
    if ('extendLeft' in existingProps || 'extendLeft' in baseRaw || ['rectangle', 'trend_line', 'parallel_channel', 'extended'].includes(drawingType)) {
      props.extendLeft = Boolean(tpl.extendLeft);
    }
    if ('extendLines' in existingProps || 'extendLines' in baseRaw) {
      props.extendLines = Boolean(tpl.extendRight);
    }

    // Middle / Center line (for rectangles, parallel channels, etc.)
    if (
      'middleLine' in existingProps ||
      'showMiddleLine' in existingProps ||
      'showMidline' in existingProps ||
      drawingType === 'rectangle' ||
      drawingType === 'parallel_channel'
    ) {
      props.middleLine = {
        ...(props.middleLine && typeof props.middleLine === 'object' ? props.middleLine : {}),
        showLine: showMiddleLine,
        lineColor: middleLineColor,
        lineWidth: middleLineWidth,
        lineStyle: middleLineStyle
      };
      props.showMiddleLine = showMiddleLine;
      props.middleLineColor = middleLineColor;
      props.middleLineWidth = middleLineWidth;
      props.middleLineStyle = middleLineStyle;
      if ('showMidline' in existingProps || 'showMidline' in baseRaw || drawingType === 'parallel_channel') {
        props.showMidline = showMiddleLine;
        props.midlinecolor = middleLineColor;
        props.midlinewidth = middleLineWidth;
        props.midlinestyle = middleLineStyle;
      }
    }

    // Text & label properties
    props.textColor = txtColor;
    if ('textcolor' in existingProps || 'textcolor' in baseRaw) {
      props.textcolor = txtColor;
    }
    props.fontSize = fontSz;
    if ('fontsize' in existingProps || 'fontsize' in baseRaw) {
      props.fontsize = fontSz;
    }
    props.horzLabelsAlign = horzAlign;
    props.vertLabelsAlign = vertAlign;
    if (tpl.bold !== undefined) props.bold = Boolean(tpl.bold);
    if (tpl.italic !== undefined) props.italic = Boolean(tpl.italic);

    const hasTemplateText = typeof tpl.text === 'string' && tpl.text.trim().length > 0;
    if (tpl.showLabel || hasTemplateText) {
      props.showLabel = true;
      if ('showText' in existingProps || 'showText' in baseRaw) {
        props.showText = true;
      }
      props.text = tpl.text || '';
    } else {
      props.showLabel = false;
      props.text = '';
    }

    return props;
  }

  /**
   * Convert template into TradingView overrides map (NOTE: never override .text globally so new drawings don't copy old text labels!)
   */
  function buildRectangleOverrides(tpl) {
    if (!tpl || canonicalizeDrawingType(tpl.drawingType) !== 'rectangle') return {};
    const opacityPct = typeof tpl.opacity === 'number' ? tpl.opacity : 20;
    const transparency = Math.max(0, Math.min(100, 100 - opacityPct));
    const mainColor = parseColorAndAlpha(tpl.color, '#22c55e').hex;
    const bgHex = parseColorAndAlpha(tpl.backgroundColor || mainColor, mainColor).hex;
    const bgRgba = hexToRgbaString(bgHex, opacityPct);
    const showMiddleLine = Boolean(tpl.showMiddleLine);
    const middleLineColor = parseColorAndAlpha(tpl.middleLineColor || mainColor, mainColor).hex;
    const middleLineWidth = Number(tpl.middleLineWidth) || 1;
    const middleLineStyle = tpl.middleLineStyle !== undefined ? Number(tpl.middleLineStyle) : 2;
    const horzAlign = tpl.horzLabelsAlign || 'right';
    const vertAlign = tpl.vertLabelsAlign || 'middle';

    return {
      'linetoolrectangle.color': mainColor,
      'linetoolrectangle.backgroundColor': bgRgba,
      'linetoolrectangle.fillBackground': opacityPct > 0,
      'linetoolrectangle.transparency': transparency,
      'linetoolrectangle.linewidth': Number(tpl.linewidth) || 1,
      'linetoolrectangle.linestyle': Number(tpl.linestyle) || 0,
      'linetoolrectangle.extendRight': Boolean(tpl.extendRight),
      'linetoolrectangle.extendLeft': Boolean(tpl.extendLeft),
      'linetoolrectangle.horzLabelsAlign': horzAlign,
      'linetoolrectangle.vertLabelsAlign': vertAlign,
      'linetoolrectangle.middleLine.showLine': showMiddleLine,
      'linetoolrectangle.middleLine.lineColor': middleLineColor,
      'linetoolrectangle.middleLine.lineWidth': middleLineWidth,
      'linetoolrectangle.middleLine.lineStyle': middleLineStyle
    };
  }

  // -------------------------------------------------------------
  // Extended Rectangle Far-Right Text Positioning Fix
  // (Ensures text set to go right in an extended rectangle goes to
  //  the far right of the extended box, not the box's drawline)
  // -------------------------------------------------------------
  const hookedPaneViewProtos = new WeakSet();
  const hookedPaneViewInstances = new WeakSet();
  const hookedCanvasWins = new WeakSet();
  let extendedRightRectTexts = new Set();

  function unwrapPropVal(v) {
    if (v && typeof v === 'object' && typeof v.value === 'function') {
      try { return v.value(); } catch (e) {}
    }
    return v;
  }

  function getRectSourceConfig(source, fallbackData) {
    if (!source) return { extendRight: false, extendLeft: false, horzAlign: '' };
    let extendRight = false;
    let extendLeft = false;
    let horzAlign = '';

    try {
      const p = typeof source.properties === 'function' ? source.properties() : (source._properties || (typeof source.getProperties === 'function' ? source.getProperties() : null));
      if (p) {
        const childs = typeof p.childs === 'function' ? p.childs() : p;
        extendRight = Boolean(unwrapPropVal(childs.extendRight) ?? unwrapPropVal(p.extendRight));
        extendLeft = Boolean(unwrapPropVal(childs.extendLeft) ?? unwrapPropVal(p.extendLeft));
        horzAlign = String(
          unwrapPropVal(childs.horzLabelsAlign) ||
          unwrapPropVal(p.horzLabelsAlign) ||
          unwrapPropVal(childs.horzTextAlign) ||
          unwrapPropVal(p.horzTextAlign) ||
          fallbackData?.horzAlign ||
          ''
        ).toLowerCase();
      }
    } catch (e) {}

    if (!horzAlign && fallbackData && fallbackData.horzAlign) {
      horzAlign = String(fallbackData.horzAlign).toLowerCase();
    }

    return { extendRight, extendLeft, horzAlign };
  }

  function getPaneWidthForPaneView(paneView, args) {
    // 1. Check model.timeScale().width()
    try {
      const model = paneView._model || paneView._source?._model;
      if (model && typeof model.timeScale === 'function') {
        const ts = model.timeScale();
        if (ts && typeof ts.width === 'function') {
          const w = ts.width();
          if (typeof w === 'number' && w > 100) return w;
        }
      }
    } catch (e) {}

    // 2. Check arguments passed to renderer(height, width) or _updateImpl(height, width)
    if (args && args.length > 0) {
      if (typeof args[1] === 'number' && args[1] > 100) return args[1];
      if (args[0] && typeof args[0] === 'object') {
        if (args[0].mediaSize && typeof args[0].mediaSize.width === 'number') return args[0].mediaSize.width;
        if (typeof args[0].width === 'number' && args[0].width > 100) return args[0].width;
      }
    }

    if (typeof paneView.__vestLastPaneWidth === 'number' && paneView.__vestLastPaneWidth > 100) {
      return paneView.__vestLastPaneWidth;
    }

    // 3. Fallback: Find main chart pane canvas width in DOM
    try {
      const docs = [document];
      document.querySelectorAll('iframe').forEach(ifr => {
        try { if (ifr.contentDocument) docs.push(ifr.contentDocument); } catch (e) {}
      });
      for (const d of docs) {
        const canvases = d.querySelectorAll('canvas');
        for (const c of canvases) {
          if (c.clientWidth > 250 && c.clientHeight > 120) {
            return c.clientWidth;
          }
        }
      }
    } catch (e) {}

    return 0;
  }

  function clonePointWithX(pt, newX) {
    if (!pt || typeof pt !== 'object') return { x: newX, y: 0 };
    try {
      const proto = Object.getPrototypeOf(pt);
      const clone = Object.create(proto);
      Object.assign(clone, pt);
      clone.x = newX;
      return clone;
    } catch (e) {
      return { ...pt, x: newX };
    }
  }

  function adjustRectanglePaneViewLabel(paneView, args) {
    if (!paneView || paneView.__vestAdjustingLabel) return;
    paneView.__vestAdjustingLabel = true;
    try {
      const source = paneView._source || paneView.m_source;
      const { extendRight, extendLeft, horzAlign } = getRectSourceConfig(source, null);
      if (!extendRight && !extendLeft) return;

      const paneWidth = getPaneWidthForPaneView(paneView, args);
      if (!paneWidth || paneWidth < 100) return;

      // Locate any TextRenderer on paneView or inside its composite renderer
      const candidateRenderers = new Set();
      const pvKeys = Object.getOwnPropertyNames(paneView);
      for (const k of pvKeys) {
        try {
          const v = paneView[k];
          if (v && typeof v === 'object') {
            candidateRenderers.add(v);
            // Also check composite renderer's array of sub-renderers
            const subKeys = Object.getOwnPropertyNames(v);
            for (const sk of subKeys) {
              const sv = v[sk];
              if (Array.isArray(sv)) {
                sv.forEach(item => { if (item && typeof item === 'object') candidateRenderers.add(item); });
              }
            }
          }
        } catch (e) {}
      }

      for (const r of candidateRenderers) {
        // Find the data object on r that has .text and .points
        const rKeys = Object.getOwnPropertyNames(r);
        for (const rk of rKeys) {
          let d = null;
          try { d = r[rk]; } catch (e) {}
          if (d && typeof d === 'object' && typeof d.text === 'string' && d.text.trim() && Array.isArray(d.points) && d.points.length > 0) {
            const effectiveHorzAlign = String(horzAlign || d.horzAlign || d.horzTextAlign || '').toLowerCase();

            if (extendRight && effectiveHorzAlign === 'right') {
              const pad = typeof d.offsetX === 'number' && d.offsetX > 0 ? 0 : 8;
              const targetRightX = paneWidth - pad;

              if (d.points.length === 1) {
                d.points = [clonePointWithX(d.points[0], targetRightX)];
              } else if (d.points.length >= 2) {
                const p0 = d.points[0];
                const p1 = d.points[1];
                if (p0.x <= p1.x) {
                  d.points = [p0, clonePointWithX(p1, targetRightX)];
                } else {
                  d.points = [clonePointWithX(p0, targetRightX), p1];
                }
              }

              // Expand wordWrapWidth / maxWidth so narrow drawn boxes don't wrap or clip text at the far right
              let leftX = 0;
              if (Array.isArray(paneView._points) && paneView._points.length >= 2) {
                leftX = extendLeft ? 0 : Math.max(0, Math.min(paneView._points[0].x, paneView._points[1].x));
              }
              const expandedWidth = Math.max(220, paneWidth - leftX - 16);
              if (typeof d.wordWrapWidth === 'number') d.wordWrapWidth = Math.max(d.wordWrapWidth, expandedWidth);
              if (typeof d.maxWidth === 'number') d.maxWidth = Math.max(d.maxWidth, expandedWidth);
              if (typeof d.boxWidth === 'number') d.boxWidth = Math.max(d.boxWidth, expandedWidth);

              // Clear cached layout on TextRenderer so it recalculates with new far-right point
              if (typeof r.setData === 'function') {
                try { r.setData(d); } catch (e) {}
              }
              for (const ck of rKeys) {
                if (ck === rk) continue;
                try {
                  const cv = r[ck];
                  if (cv && typeof cv === 'object' && ('boxLeft' in cv || 'boxWidth' in cv || 'lines' in cv || 'totalWidth' in cv)) {
                    r[ck] = null;
                  }
                } catch (e) {}
              }
            }
          }
        }
      }
    } catch (e) {} finally {
      paneView.__vestAdjustingLabel = false;
    }
  }

  function hookSinglePaneView(pv) {
    if (!pv || typeof pv !== 'object') return;
    const proto = Object.getPrototypeOf(pv);
    if (proto && proto !== Object.prototype && !hookedPaneViewProtos.has(proto)) {
      hookedPaneViewProtos.add(proto);

      if (typeof proto._updateImpl === 'function') {
        const origUpdate = proto._updateImpl;
        proto._updateImpl = function (...args) {
          if (typeof args[1] === 'number' && args[1] > 100) {
            this.__vestLastPaneWidth = args[1];
          }
          const res = origUpdate.apply(this, args);
          adjustRectanglePaneViewLabel(this, args);
          return res;
        };
      }

      if (typeof proto.renderer === 'function') {
        const origRenderer = proto.renderer;
        proto.renderer = function (...args) {
          if (typeof args[1] === 'number' && args[1] > 100) {
            this.__vestLastPaneWidth = args[1];
          } else if (args[0] && typeof args[0] === 'object' && typeof args[0].width === 'number') {
            this.__vestLastPaneWidth = args[0].width;
          }
          const res = origRenderer.apply(this, args);
          adjustRectanglePaneViewLabel(this, args);
          return res;
        };
      }
      log('Hooked RectanglePaneView prototype for extended far-right text alignment');
    }

    if (!hookedPaneViewInstances.has(pv)) {
      hookedPaneViewInstances.add(pv);
      try {
        if (typeof pv.invalidate === 'function') pv.invalidate();
        pv._invalidated = true;
        adjustRectanglePaneViewLabel(pv, []);
      } catch (e) {}
    }
  }

  function extractInternalSourceFromShape(shape, entityId) {
    if (!shape || typeof shape !== 'object') return null;
    if (typeof shape.paneViews === 'function' || Array.isArray(shape._paneViews)) {
      if (!entityId || typeof shape.id !== 'function' || shape.id() === entityId) {
        return shape;
      }
    }

    const keys = [...Object.keys(shape), ...Object.getOwnPropertyNames(shape), ...Object.getOwnPropertySymbols(shape)];
    // First pass: strictly match entityId if available so we NEVER return a sibling source (like an Order Line)
    if (entityId) {
      for (const k of keys) {
        try {
          const val = shape[k];
          if (val && typeof val === 'object' && typeof val.id === 'function' && val.id() === entityId) {
            return val;
          }
        } catch (e) {}
      }
    }
    // Second pass: look for _source or paneViews excluding _model
    for (const k of keys) {
      if (k === '_model' || k === 'model') continue;
      try {
        const val = shape[k];
        if (val && typeof val === 'object') {
          if (typeof val.paneViews === 'function' || Array.isArray(val._paneViews)) {
            if (!entityId || typeof val.id !== 'function' || val.id() === entityId) {
              return val;
            }
          }
        }
      } catch (e) {}
    }
    return null;
  }

  /**
   * Obtains TradingView's internal ChartModel instance so we can query model.selection() and model.hoveredSource()
   * directly (since public IChartWidgetApi does not always expose .selection()).
   */
  function getChartModel() {
    if (!activeChart) {
      if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
        try { activeChart = activeChartApi.activeChart(); } catch (e) {}
      }
    }
    if (!activeChart) return null;

    try {
      // 1. Check direct references on activeChart or activeChart._chartWidget
      const cw = activeChart._chartWidget || activeChart._widget;
      if (cw) {
        const m = typeof cw.model === 'function' ? cw.model() : cw._model;
        if (m) {
          const innerModel = typeof m.model === 'function' ? m.model() : m;
          if (innerModel && (typeof innerModel.selection === 'function' || typeof innerModel.hoveredSource === 'function')) {
            return innerModel;
          }
        }
      }
      const directKeys = [...Object.keys(activeChart), ...Object.getOwnPropertyNames(activeChart)];
      for (const k of directKeys) {
        try {
          const v = activeChart[k];
          if (v && typeof v === 'object') {
            if (typeof v.selection === 'function' || typeof v.hoveredSource === 'function') return v;
            if (typeof v.model === 'function') {
              const m = v.model();
              if (m && (typeof m.selection === 'function' || typeof m.hoveredSource === 'function')) return m;
              if (m && typeof m.model === 'function') {
                const mm = m.model();
                if (mm && (typeof mm.selection === 'function' || typeof mm.hoveredSource === 'function')) return mm;
              }
            }
          }
        } catch (e) {}
      }
      // 2. Fallback: grab _model from any shape on the chart
      if (typeof activeChart.getAllShapes === 'function') {
        const all = activeChart.getAllShapes() || [];
        for (const s of all) {
          if (!s || !s.id) continue;
          const sh = activeChart.getShapeById(s.id);
          const src = extractInternalSourceFromShape(sh, s.id);
          if (src && src._model) return src._model;
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Queries TradingView's internal ChartModel for the currently hovered or selected drawing shape ID.
   */
  function getHoveredOrSelectedIdFromModel(preferHovered = false) {
    try {
      const model = getChartModel();
      if (!model || !activeChart) return null;

      const isValidDrawingId = (id) => {
        if (!id || typeof id !== 'string') return false;
        try {
          const meta = getShapeMetadataById(id);
          if (meta && meta.isOrderLine) return false;
          const sh = activeChart.getShapeById(id);
          return Boolean(sh);
        } catch (e) {
          return false;
        }
      };

      const checkHovered = () => {
        if (typeof model.hoveredSource === 'function') {
          const hov = model.hoveredSource();
          if (hov && typeof hov.id === 'function') {
            const hid = hov.id();
            if (isValidDrawingId(hid)) return hid;
          }
        }
        return null;
      };

      const checkSelected = () => {
        if (typeof model.selection === 'function') {
          const sel = model.selection();
          if (sel) {
            if (typeof sel.lineDataSources === 'function') {
              const lds = sel.lineDataSources() || [];
              for (const src of lds) {
                const sid = src && typeof src.id === 'function' ? src.id() : null;
                if (isValidDrawingId(sid)) return sid;
              }
            }
            if (typeof sel.dataSources === 'function') {
              const ds = sel.dataSources() || [];
              for (const src of ds) {
                const sid = src && typeof src.id === 'function' ? src.id() : null;
                if (isValidDrawingId(sid)) return sid;
              }
            }
            if (typeof sel.isSelected === 'function' && typeof activeChart.getAllShapes === 'function') {
              const all = activeChart.getAllShapes() || [];
              for (const s of all) {
                if (!s || !s.id) continue;
                const sh = activeChart.getShapeById(s.id);
                const src = extractInternalSourceFromShape(sh, s.id);
                if (src && sel.isSelected(src) && isValidDrawingId(s.id)) {
                  return s.id;
                }
              }
            }
          }
        }
        return null;
      };

      if (preferHovered) {
        return checkHovered() || checkSelected();
      }
      return checkSelected() || checkHovered();
    } catch (e) {}
    return null;
  }

  function hookCanvasFillTextInWindow(win) {
    if (!win || !win.CanvasRenderingContext2D || hookedCanvasWins.has(win)) return;
    hookedCanvasWins.add(win);

    const proto = win.CanvasRenderingContext2D.prototype;
    const origFillText = proto.fillText;

    proto.fillText = function (text, x, y, maxWidth) {
      try {
        if (
          extendedRightRectTexts.size > 0 &&
          typeof text === 'string' &&
          this.canvas &&
          this.canvas.clientWidth > 250 &&
          this.canvas.clientHeight > 120
        ) {
          const trimmed = text.trim();
          if (trimmed && extendedRightRectTexts.has(trimmed)) {
            const dpr = win.devicePixelRatio || 1;
            const targetRightBitmapX = this.canvas.width - Math.round(10 * dpr);
            const transform = typeof this.getTransform === 'function' ? this.getTransform() : { a: dpr, e: 0 };
            const scaleX = transform.a || 1;
            const translateX = transform.e || 0;

            const textW = this.measureText(text).width;
            const align = this.textAlign || 'left';

            let currentRightLocalX = x;
            if (align === 'left' || align === 'start') currentRightLocalX = x + textW;
            else if (align === 'center') currentRightLocalX = x + textW / 2;

            const currentRightBitmapX = currentRightLocalX * scaleX + translateX;

            // If TradingView drew the text at the box drawline instead of the far right of the extended box:
            if (currentRightBitmapX < targetRightBitmapX - 15 * dpr) {
              const desiredRightLocalX = (targetRightBitmapX - translateX) / scaleX;
              let newX = desiredRightLocalX;
              if (align === 'left' || align === 'start') newX = desiredRightLocalX - textW;
              else if (align === 'center') newX = desiredRightLocalX - textW / 2;
              return origFillText.call(this, text, newX, y);
            }
          }
        }
      } catch (e) {}
      return origFillText.apply(this, arguments);
    };
  }

  function syncExtendedRectangleTextHooks() {
    try {
      hookCanvasFillTextInWindow(window);
      document.querySelectorAll('iframe').forEach(ifr => {
        try { if (ifr.contentWindow) hookCanvasFillTextInWindow(ifr.contentWindow); } catch (e) {}
      });

      if (!activeChart) {
        if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
          activeChart = activeChartApi.activeChart();
        }
      }
      if (!activeChart || typeof activeChart.getAllShapes !== 'function') return;

      const allShapes = activeChart.getAllShapes() || [];
      const newRightTexts = new Set();

      for (const s of allShapes) {
        if (!s || (s.name && !/rect/i.test(s.name))) continue;
        try {
          const shape = activeChart.getShapeById(s.id);
          if (!shape) continue;

          // Hook internal PaneView prototype if accessible
          const src = extractInternalSourceFromShape(shape, s.id);
          if (src) {
            const pvs = typeof src.paneViews === 'function' ? src.paneViews() : src._paneViews;
            if (Array.isArray(pvs)) {
              pvs.forEach(pv => hookSinglePaneView(pv));
            }
          }

          // Check public properties for extended right + right-aligned text
          if (typeof shape.getProperties === 'function') {
            const p = shape.getProperties();
            if (p && p.extendRight && p.text && String(p.text).trim()) {
              const hAlign = String(p.horzLabelsAlign || p.horzTextAlign || p.horzAlign || 'right').toLowerCase();
              if (hAlign === 'right') {
                const rawText = String(p.text).trim();
                newRightTexts.add(rawText);
                rawText.split(/\r?\n/).forEach(line => {
                  if (line.trim()) newRightTexts.add(line.trim());
                });
              }
            }
          }
        } catch (e) {}
      }

      extendedRightRectTexts = newRightTexts;
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Chart Widget Hooking
  // -------------------------------------------------------------
  function findTradingViewApi() {
    if (window.tradingViewApi) {
      return { api: window.tradingViewApi, widget: null };
    }

    const targetWin = window;
    for (const key of Object.keys(targetWin)) {
      if (key.startsWith('tradingview_') && targetWin[key]) {
        const obj = targetWin[key];
        if (obj._innerAPI && typeof obj._innerAPI === 'function') {
          try {
            const api = obj._innerAPI();
            if (api) return { api, widget: obj };
          } catch (e) {}
        }
      }
    }

    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        if (iframe.contentWindow) {
          if (iframe.contentWindow.tradingViewApi) {
            return { api: iframe.contentWindow.tradingViewApi, widget: null, iframe };
          }
          for (const k of Object.keys(iframe.contentWindow)) {
            if (k.startsWith('tradingview_') || k === 'tvWidget' || k === 'widget') {
              const w = iframe.contentWindow[k];
              if (w && typeof w._innerAPI === 'function') {
                return { api: w._innerAPI(), widget: w, iframe };
              }
            }
          }
        }
      } catch (e) {}
    }

    return null;
  }

  let lastAppliedOverridesJson = null;

  function applyTemplateOverrides(tpl) {
    if (!tpl) return;
    const overrides = buildRectangleOverrides(tpl);
    lastAppliedOverridesJson = JSON.stringify(overrides);

    if (activeWidget && typeof activeWidget.applyOverrides === 'function') {
      try {
        activeWidget.applyOverrides(overrides);
        log('Applied overrides to widget:', overrides);
      } catch (e) {
        log('Error applying overrides to widget:', e);
      }
    }

    if (activeChartApi && typeof activeChartApi.applyOverrides === 'function') {
      try {
        activeChartApi.applyOverrides(overrides);
        log('Applied overrides to activeChartApi:', overrides);
      } catch (e) {
        log('Error applying overrides to activeChartApi:', e);
      }
    }
  }

  function applyTemplateOverridesIfChanged(tpl) {
    if (!tpl) return;
    const overrides = buildRectangleOverrides(tpl);
    const nextJson = JSON.stringify(overrides);
    if (nextJson === lastAppliedOverridesJson) return;
    applyTemplateOverrides(tpl);
  }

  let rectTextPollTimer = null;

  function hookChart() {
    const found = findTradingViewApi();
    if (!found || !found.api) return false;

    activeChartApi = found.api;
    activeWidget = found.widget;

    try {
      if (typeof activeChartApi.activeChart === 'function') {
        activeChart = activeChartApi.activeChart();
      } else if (typeof activeChartApi.chart === 'function') {
        activeChart = activeChartApi.chart();
      }
    } catch (e) {
      log('Could not get activeChart yet:', e);
    }

    const tpl = getActiveTemplate();
    if (tpl) {
      applyTemplateOverrides(tpl);
    }

    try {
      activeChartApi.subscribe('drawing_event', onDrawingEvent);
      log('Subscribed to drawing_event on TradingView API');
    } catch (e) {
      log('Could not subscribe to drawing_event:', e);
    }

    setupFloatingToolbarObserver();
    setupSidebarObserver();
    setupChartSettingsObserver();
    setupContextMenuHandler();
    enhanceTimeframeControls();
    if (!hasCompletedInitialSidebarRestore) {
      restoreSidebarSelections();
    }
    if (!hasCompletedInitialChartSettingsRestore) {
      restoreLastChartSettings();
    }
    syncExtendedRectangleTextHooks();
    setupIctSessionIndicators();
    restoreGlobalDrawings();

    if (!rectTextPollTimer) {
      rectTextPollTimer = setInterval(() => {
        syncExtendedRectangleTextHooks();
        setupContextMenuHandler();
        scheduleIctSessionsRender();
      }, 400);
    }
    return true;
  }

  /**
   * Detects if a shape or properties object belongs to a TradingView Order Line / Position Line
   * (which also appears in activeChart.selection().all() and getAllShapes() when an order/position is on the chart!)
   */
  function isOrderOrPositionLineProps(p, rawName) {
    const nameStr = String(rawName || '').toLowerCase();
    if (nameStr.includes('order') || nameStr.includes('execution')) return true;
    if (!p || typeof p !== 'object') return false;
    if (
      'bodyBorderActiveBuyColor' in p ||
      'cancelButtonBorderActiveBuyColor' in p ||
      'quantityBackgroundActiveBuyColor' in p ||
      'lineActiveBuyColor' in p
    ) {
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // Drawing Event Handling
  // -------------------------------------------------------------
  function onDrawingEvent(entityId, eventType) {
    try {
      if (String(eventType || '').toLowerCase() === 'remove' && entityId) {
        if (globalDrawingUpdateTimers.has(entityId)) {
          clearTimeout(globalDrawingUpdateTimers.get(entityId));
          globalDrawingUpdateTimers.delete(entityId);
        }
        const removedGlobalId = globalDrawingEntityMap.get(entityId);
        if (removedGlobalId) {
          globalDrawingEntityMap.delete(entityId);
          // Background charts can remove/recreate local entities while following a
          // focused tab. Only the focused tab is allowed to change the shared record.
          if (chartMemoryTabFocused && !globalDrawingRestoreSuppression.has(entityId)) {
            removedGlobalDrawingIds.add(removedGlobalId);
            postToIsolated({ type: 'VEST_TV_GLOBAL_DRAWING_REMOVE', drawingId: removedGlobalId });
          }
        }
        for (const [fvgKey, entry] of nativeAutoFvgShapesMap.entries()) {
          if (entry && entry.entityId === entityId) {
            nativeAutoFvgShapesMap.delete(fvgKey);
            if (!nativeAutoFvgRemovalSuppression.has(entityId)) dismissCreatedFvg(fvgKey);
          }
        }
        nativeAutoFvgRemovalSuppression.delete(entityId);
        scheduleIctSessionsRender(true);
        return;
      }

      if (!activeChart) {
        if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
          activeChart = activeChartApi.activeChart();
        }
      }
      if (!activeChart) return;

      const shape = activeChart.getShapeById(entityId);
      if (!shape) return;

      const allShapes = typeof activeChart.getAllShapes === 'function' ? activeChart.getAllShapes() : [];
      const shapeMeta = allShapes.find(s => s.id === entityId);
      const rawProps = typeof shape.getProperties === 'function' ? (shape.getProperties() || {}) : {};
      if (isOrderOrPositionLineProps(rawProps, shapeMeta && shapeMeta.name)) {
        return;
      }

      const globalId = globalDrawingEntityMap.get(entityId);
      if (globalId && chartMemoryTabFocused && !globalDrawingRestoreSuppression.has(entityId)) {
        queueGlobalDrawingUpdate(entityId, globalId);
      }

      lastInteractedShapeId = entityId;
      const drawingType = shapeMeta ? canonicalizeDrawingType(shapeMeta.name) : 'rectangle';
      const isRectangle = drawingType === 'rectangle' || drawingType === 'rotated_rectangle';

      if (isRectangle) {
        lastRectangleId = entityId;
      }

      log(`Drawing event: ${eventType} on ${entityId} (type: ${drawingType})`);

      syncExtendedRectangleTextHooks();

      postToIsolated({
        type: 'VEST_TV_DRAWING_EVENT',
        entityId,
        eventType,
        drawingType,
        isRectangle
      });

      dispatchActionLog({
        type: 'tv_drawing',
        source: 'TradingView API',
        tag: 'drawing',
        elementId: entityId,
        text: `Shape "${shapeMeta ? shapeMeta.name : 'shape'}" (${eventType})`,
        selector: `TradingView: ${shapeMeta ? shapeMeta.name : 'shape'}#${entityId}`,
        attributes: {
          entityId,
          eventType,
          shapeName: shapeMeta ? shapeMeta.name : 'unknown',
          drawingType,
          isRectangle: String(isRectangle)
        }
      });

    } catch (err) {
      log('Error in onDrawingEvent:', err);
    }
  }

  function getShapeMetadataById(entityId) {
    if (!activeChart || !entityId) return { id: entityId, drawingType: 'rectangle', rawName: 'rectangle', isOrderLine: false };
    try {
      const shape = activeChart.getShapeById(entityId);
      const p = (shape && typeof shape.getProperties === 'function') ? (shape.getProperties() || {}) : {};

      if (typeof activeChart.getAllShapes === 'function') {
        const all = activeChart.getAllShapes() || [];
        const found = all.find(s => s.id === entityId);
        if (found && found.name) {
          if (isOrderOrPositionLineProps(p, found.name)) {
            return { id: entityId, drawingType: 'order_line', rawName: found.name, isOrderLine: true };
          }
          return {
            id: entityId,
            drawingType: canonicalizeDrawingType(found.name),
            rawName: found.name,
            isOrderLine: false
          };
        }
      }
      if (isOrderOrPositionLineProps(p, '')) {
        return { id: entityId, drawingType: 'order_line', rawName: 'order_line', isOrderLine: true };
      }
      if (p.fillBackground !== undefined && p.middleLine !== undefined) {
        return { id: entityId, drawingType: 'rectangle', rawName: 'rectangle', isOrderLine: false };
      }
      if (p.showMidline !== undefined) {
        return { id: entityId, drawingType: 'parallel_channel', rawName: 'parallel_channel', isOrderLine: false };
      }
      if (p.linecolor !== undefined && p.extendRight === undefined && p.extendLeft === undefined) {
        return { id: entityId, drawingType: 'horiz_line', rawName: 'horiz_line', isOrderLine: false };
      }
    } catch (e) {}
    return { id: entityId, drawingType: 'rectangle', rawName: 'rectangle', isOrderLine: false };
  }

  function serializeGlobalDrawing(entityId, globalId = null) {
    try {
      if (!activeChart || !entityId) return null;
      const shape = activeChart.getShapeById(entityId);
      if (!shape) return null;
      const meta = getShapeMetadataById(entityId);
      if (!meta || meta.isOrderLine) return null;
      const rawPoints = typeof shape.getPoints === 'function' ? shape.getPoints() : [];
      const points = Array.isArray(rawPoints) ? rawPoints.map(point => ({
        time: normalizeEpochSec(getDrawingPointTime(point)),
        price: Number(point && (point.price ?? point.value))
      })).filter(point => Number.isFinite(point.time) && Number.isFinite(point.price)) : [];
      if (!points.length) return null;
      let properties = {};
      try {
        const raw = typeof shape.getProperties === 'function' ? shape.getProperties() : {};
        properties = JSON.parse(JSON.stringify(raw || {}));
      } catch (e) {}
      const all = typeof activeChart.getAllShapes === 'function' ? activeChart.getAllShapes() || [] : [];
      const metadata = all.find(item => item && item.id === entityId);
      const rawShapeName = String(metadata && metadata.name || meta.rawName || meta.drawingType || 'rectangle');
      let timeframe = '5m';
      try { timeframe = formatCurrentResolutionLabel(); } catch (e) {}
      return {
        id: globalId || `gd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
        symbol: getCurrentChartSymbolKey(),
        timeframe,
        shape: canonicalizeDrawingType(rawShapeName),
        rawShapeName,
        drawingType: meta.drawingType,
        points,
        properties,
        updatedAt: Date.now(),
        sourceEntityId: String(entityId)
      };
    } catch (e) {
      return null;
    }
  }

  function toggleGlobalSyncForShape(entityId) {
    if (!chartMemoryTabFocused) {
      postToIsolated({ type: 'VEST_TV_SHOW_TOAST', message: 'Focus this chart tab to change global drawing sync' });
      return;
    }
    const existingId = globalDrawingEntityMap.get(entityId);
    if (existingId) {
      globalDrawingEntityMap.delete(entityId);
      removedGlobalDrawingIds.add(existingId);
      postToIsolated({ type: 'VEST_TV_GLOBAL_DRAWING_REMOVE', drawingId: existingId });
      return;
    }
    const drawing = serializeGlobalDrawing(entityId);
    if (!drawing) {
      postToIsolated({ type: 'VEST_TV_SHOW_TOAST', message: 'Unable to sync this drawing globally' });
      return;
    }
    globalDrawingEntityMap.set(entityId, drawing.id);
    postToIsolated({ type: 'VEST_TV_GLOBAL_DRAWING_UPSERT', drawing });
    postToIsolated({ type: 'VEST_TV_SHOW_TOAST', message: `Syncing ${drawing.timeframe} drawing globally across ${drawing.symbol} charts` });
  }

  function queueGlobalDrawingUpdate(entityId, globalId) {
    if (!chartMemoryTabFocused) return;
    const previous = globalDrawingUpdateTimers.get(entityId);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      globalDrawingUpdateTimers.delete(entityId);
      if (!chartMemoryTabFocused || globalDrawingEntityMap.get(entityId) !== globalId) return;
      const drawing = serializeGlobalDrawing(entityId, globalId);
      if (drawing) postToIsolated({ type: 'VEST_TV_GLOBAL_DRAWING_UPSERT', drawing });
    }, 300);
    globalDrawingUpdateTimers.set(entityId, timer);
  }

  function globalDrawingPointArraysMatch(record, rawPoints) {
    try {
      if (!Array.isArray(rawPoints) || rawPoints.length !== record.points.length) return false;
      return rawPoints.every((point, idx) => {
        const saved = record.points[idx];
        const time = normalizeEpochSec(getDrawingPointTime(point));
        const price = Number(point && (point.price ?? point.value));
        return Math.abs(time - Number(saved.time)) <= 1 && Math.abs(price - Number(saved.price)) <= Math.max(1e-6, Math.abs(price) * 1e-8);
      });
    } catch (e) {
      return false;
    }
  }

  function globalDrawingPointsMatch(record, shape) {
    try {
      const points = typeof shape.getPoints === 'function' ? shape.getPoints() : [];
      return globalDrawingPointArraysMatch(record, points);
    } catch (e) {
      return false;
    }
  }

  function getPersistedChartDrawingCandidates() {
    const candidates = [];
    const storages = [];
    try { storages.push(window.localStorage); } catch (e) {}
    try {
      if (window.top && window.top !== window && window.top.localStorage) storages.push(window.top.localStorage);
    } catch (e) {}
    const seen = new Set();
    for (const storage of storages) {
      try {
        for (let idx = 0; idx < storage.length; idx++) {
          const key = storage.key(idx);
          if (!key || (!key.startsWith('tv-chart-drawings-') && !key.startsWith('tv-drawings-flush:')) || seen.has(key)) continue;
          seen.add(key);
          const raw = storage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const sources = parsed && Array.isArray(parsed.sources) ? parsed.sources : [];
          for (const entry of sources) {
            const source = Array.isArray(entry) ? entry[1] : entry;
            if (!source || typeof source !== 'object') continue;
            const name = source.toolName || source.type || (source.state && source.state.type) || '';
            const points = source.state && Array.isArray(source.state.points)
              ? source.state.points
              : (Array.isArray(source.points) ? source.points : []);
            const normalized = points.map(point => ({
              time: normalizeEpochSec(getDrawingPointTime(point)),
              price: Number(point && (point.price ?? point.value))
            }));
            if (!name || !normalized.length || normalized.some(point => !Number.isFinite(point.time) || !Number.isFinite(point.price))) continue;
            candidates.push({ name: canonicalizeDrawingType(name), points: normalized });
          }
        }
      } catch (e) {}
    }
    return candidates;
  }

  function applyGlobalDrawingRecord(record, entityId, shape) {
    if (!record || !shape) return;
    const pointsMatch = globalDrawingPointsMatch(record, shape);
    let propertiesMatch = false;
    try {
      const current = typeof shape.getProperties === 'function' ? shape.getProperties() || {} : {};
      propertiesMatch = JSON.stringify(current) === JSON.stringify(record.properties || {});
    } catch (e) {}
    if (pointsMatch && propertiesMatch) return;
    globalDrawingRestoreSuppression.add(entityId);
    if (!pointsMatch && typeof shape.setPoints === 'function') {
      try { shape.setPoints(record.points.map(point => ({ time: Number(point.time), price: Number(point.price) }))); } catch (e) {}
    }
    if (!propertiesMatch && record.properties && typeof shape.setProperties === 'function') {
      try { shape.setProperties(record.properties); } catch (e) {}
    }
    setTimeout(() => globalDrawingRestoreSuppression.delete(entityId), 1200);
  }

  function getDrawingPointTime(point) {
    if (!point || typeof point !== 'object') return point;
    if (point.time && typeof point.time === 'object') {
      return point.time.value ?? point.time.timestamp ?? point.time.time ?? point.time_t;
    }
    return point.time ?? point.time_t;
  }

  function restoreGlobalDrawings() {
    if (!activeChart || typeof activeChart.getAllShapes !== 'function' || !Array.isArray(currentGlobalDrawings)) return;
    let symbol = '';
    try { symbol = getCurrentChartSymbolKey(); } catch (e) {}
    if (!symbol) return;
    const normalizedSymbol = String(symbol).toUpperCase();
    let restoreState = globalDrawingRestoreStartTimes.get(activeChart);
    if (!restoreState || restoreState.symbol !== normalizedSymbol) {
      restoreState = { symbol: normalizedSymbol, startedAt: Date.now() };
      globalDrawingRestoreStartTimes.set(activeChart, restoreState);
    }
    const withinInitialHydrationWindow = Date.now() - restoreState.startedAt < 6000;
    const records = currentGlobalDrawings.filter(record => record && String(record.symbol).toUpperCase() === normalizedSymbol);
    let chartShapes = [];
    try { chartShapes = activeChart.getAllShapes() || []; } catch (e) { return; }
    const persistedShapes = getPersistedChartDrawingCandidates();
    const liveIds = new Set(chartShapes.map(item => item && item.id).filter(Boolean));
    const registeredIds = new Set(currentGlobalDrawings.map(record => record && record.id).filter(Boolean));
    for (const [entityId, globalId] of globalDrawingEntityMap.entries()) {
      if (!liveIds.has(entityId)) globalDrawingEntityMap.delete(entityId);
      else if (!registeredIds.has(globalId)) {
        globalDrawingEntityMap.delete(entityId);
      }
    }
    if (!records.length) return;

    records.forEach(record => {
      try {
        if (removedGlobalDrawingIds.has(record.id)) return;
        const mapped = Array.from(globalDrawingEntityMap.entries()).find(([, id]) => id === record.id);
        if (mapped) {
          const mappedShape = activeChart.getShapeById(mapped[0]);
          if (mappedShape) {
            applyGlobalDrawingRecord(record, mapped[0], mappedShape);
            return;
          }
        }
        const matchingOnChart = chartShapes.filter(item => {
          if (!item || !item.id || canonicalizeDrawingType(item.name) !== canonicalizeDrawingType(record.shape)) return false;
          const candidate = activeChart.getShapeById(item.id);
          return candidate && globalDrawingPointsMatch(record, candidate);
        });
        const alreadyOnChart = matchingOnChart[0];
        if (alreadyOnChart) {
          globalDrawingEntityMap.set(alreadyOnChart.id, record.id);
          applyGlobalDrawingRecord(record, alreadyOnChart.id, activeChart.getShapeById(alreadyOnChart.id));
          // Clean up identical copies left by earlier restores, while preserving same-geometry drawings with different properties.
          const canonicalProperties = JSON.stringify(record.properties || {});
          matchingOnChart.slice(1).forEach(duplicate => {
            const duplicateShape = activeChart.getShapeById(duplicate.id);
            let sameProperties = false;
            try { sameProperties = JSON.stringify(duplicateShape.getProperties() || {}) === canonicalProperties; } catch (e) {}
            if (sameProperties) {
              globalDrawingEntityMap.delete(duplicate.id);
              try { activeChart.removeEntity(duplicate.id); } catch (e) {}
            }
          });
          return;
        }
        // Vest may not have hydrated its saved shapes into the chart API yet. Wait for that persisted
        // geometry to appear before creating a replacement, or the saved drawing and restore will overlap.
        const existsInPersistedChart = persistedShapes.some(candidate =>
          candidate.name === canonicalizeDrawingType(record.shape) &&
          globalDrawingPointArraysMatch(record, candidate.points)
        );
        if (withinInitialHydrationWindow && existsInPersistedChart) return;
        if (!record.points.length) return;
        let entityId = null;
        const points = record.points.map(point => ({ time: Number(point.time), price: Number(point.price) }));
        if (points.length === 1 && typeof activeChart.createShape === 'function') {
          entityId = activeChart.createShape(points[0], { shape: record.shape, disableSave: false });
        } else if (typeof activeChart.createMultipointShape === 'function') {
          entityId = activeChart.createMultipointShape(points, { shape: record.shape, lock: false, disableSelection: false, disableSave: false });
        }
        if (!entityId) return;
        globalDrawingEntityMap.set(entityId, record.id);
        globalDrawingRestoreSuppression.add(entityId);
        setTimeout(() => globalDrawingRestoreSuppression.delete(entityId), 1200);
        const shape = activeChart.getShapeById(entityId);
        if (shape) applyGlobalDrawingRecord(record, entityId, shape);
      } catch (e) {}
    });
  }

  function updateGlobalDrawingsSnapshot(drawings) {
    currentGlobalDrawings = Array.isArray(drawings) ? drawings : [];
    const activeIds = new Set(currentGlobalDrawings.map(record => record && record.id).filter(Boolean));
    for (const id of removedGlobalDrawingIds) {
      if (!activeIds.has(id)) removedGlobalDrawingIds.delete(id);
    }
  }

  function applyPropertiesToInternalSource(shape, entityId, props) {
    try {
      const src = extractInternalSourceFromShape(shape, entityId);
      if (!src) return;
      const propTree = typeof src.properties === 'function' ? src.properties() : src._properties;
      if (propTree) {
        const childs = typeof propTree.childs === 'function' ? propTree.childs() : propTree;
        if (childs && typeof childs === 'object') {
          Object.entries(props).forEach(([k, val]) => {
            if (k.includes('.')) return;
            const child = childs[k];
            if (child && typeof child === 'object') {
              if (typeof child.setValue === 'function' && (typeof val !== 'object' || val === null)) {
                try { child.setValue(val); } catch (e) {}
              } else if (val && typeof val === 'object' && !Array.isArray(val)) {
                const subChilds = typeof child.childs === 'function' ? child.childs() : child;
                if (subChilds && typeof subChilds === 'object') {
                  Object.entries(val).forEach(([sk, sval]) => {
                    const sc = subChilds[sk];
                    if (sc && typeof sc.setValue === 'function') {
                      try { sc.setValue(sval); } catch (e) {}
                    }
                  });
                }
              }
            }
          });
        }
      }
      const pvs = typeof src.paneViews === 'function' ? src.paneViews() : src._paneViews;
      if (Array.isArray(pvs)) {
        pvs.forEach(pv => {
          try {
            if (typeof pv.invalidate === 'function') pv.invalidate();
            pv._invalidated = true;
          } catch (e) {}
        });
      }
      if (src._model && typeof src._model.lightUpdate === 'function') {
        try { src._model.lightUpdate(); } catch (e) {}
      }
    } catch (e) {}
  }

  function applyTemplateToShape(shape, tpl, entityId, drawingTypeOverride) {
    if (!shape || !tpl) return false;
    try {
      const meta = entityId ? getShapeMetadataById(entityId) : null;
      const drawingType = drawingTypeOverride || (meta && meta.drawingType) || tpl.drawingType || 'rectangle';
      const props = buildShapePropertiesForTemplate(tpl, shape, drawingType);

      if (typeof shape.setProperties === 'function') {
        const existingProps = (typeof shape.getProperties === 'function' ? shape.getProperties() : null) || {};
        const validKeys = Object.keys(existingProps);

        // 1. Build a safe subset containing only keys that exist in shape.getProperties()
        const safeProps = {};
        if (validKeys.length > 0) {
          for (const k of Object.keys(props)) {
            if (k in existingProps) {
              safeProps[k] = props[k];
            }
          }
        } else {
          Object.assign(safeProps, props);
        }

        try {
          shape.setProperties(safeProps);
        } catch (batchErr) {
          log('Batch shape.setProperties threw, falling back to per-property setProperties:', batchErr);
        }

        // 2. Also apply each property individually inside its own try/catch so if one nested key (e.g. middleLine)
        // or custom key throws in TradingView's LineDataSourceApi.setProperties, it NEVER blocks color/text/etc.!
        for (const [k, v] of Object.entries(props)) {
          if (validKeys.length > 0 && !(k in existingProps)) continue;
          try {
            shape.setProperties({ [k]: v });
          } catch (singleErr) {}
        }
      }

      // 3. Also set values directly on the internal TradingView Property tree & trigger lightUpdate()
      applyPropertiesToInternalSource(shape, entityId, props);
      log(`Applied template "${tpl.name}" (${drawingType}) to shape ${entityId || ''}:`, props);

      syncToVestLocalStorage(entityId, props);
      syncExtendedRectangleTextHooks();
      return true;
    } catch (e) {
      log('Error in applyTemplateToShape:', e);
      return false;
    }
  }

  /**
   * Applies a template to the targeted, right-clicked, or currently selected/last-interacted shape matching the template's drawingType.
   */
  function applyTemplateToSelectedOrLast(tpl, explicitTargetId = null) {
    if (!tpl) return false;

    applyTemplateOverrides(tpl);

    if (!activeChart) {
      if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
        activeChart = activeChartApi.activeChart();
      }
    }
    if (!activeChart) return false;

    const tplType = canonicalizeDrawingType(tpl.drawingType || 'rectangle');
    let targetShape = null;
    let targetId = explicitTargetId || null;

    if (targetId) {
      try {
        const meta = getShapeMetadataById(targetId);
        if (!meta.isOrderLine) {
          targetShape = activeChart.getShapeById(targetId);
        }
      } catch (e) {}
    }

    // 1. Check TradingView's internal ChartModel selection / hovered source first!
    if (!targetShape) {
      try {
        const modelSelId = getHoveredOrSelectedIdFromModel(false);
        if (modelSelId) {
          const meta = getShapeMetadataById(modelSelId);
          if (!meta.isOrderLine && meta.drawingType === tplType) {
            const shape = activeChart.getShapeById(modelSelId);
            if (shape) {
              targetId = modelSelId;
              targetShape = shape;
            }
          }
        }
      } catch (e) {}
    }

    // 2. Check activeChart.selection() if exposed
    if (!targetShape) {
      try {
        if (typeof activeChart.selection === 'function') {
          const sel = activeChart.selection();
          if (sel && typeof sel.all === 'function') {
            const all = sel.all();
            if (all && all.length > 0) {
              for (const id of all) {
                const meta = getShapeMetadataById(id);
                if (meta.isOrderLine) continue;
                const shape = activeChart.getShapeById(id);
                if (shape && meta.drawingType === tplType) {
                  targetId = id;
                  targetShape = shape;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to rightClickedShapeId, lastInteractedShapeId, or lastRectangleId if its drawingType matches tplType
    if (!targetShape) {
      const candidates = [rightClickedShapeId, lastInteractedShapeId, lastRectangleId].filter(Boolean);
      for (const cid of candidates) {
        try {
          const meta = getShapeMetadataById(cid);
          if (!meta.isOrderLine && meta.drawingType === tplType) {
            const shape = activeChart.getShapeById(cid);
            if (shape) {
              targetId = cid;
              targetShape = shape;
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (targetShape && targetId) {
      const meta = getShapeMetadataById(targetId);
      return applyTemplateToShape(targetShape, tpl, targetId, meta.drawingType);
    }

    return false;
  }

  function syncToVestLocalStorage(entityId, newProps) {
    try {
      if (!entityId) return;
      for (let kIdx = 0; kIdx < localStorage.length; kIdx++) {
        const key = localStorage.key(kIdx);
        if (!key || (!key.startsWith('tv-chart-drawings-') && !key.startsWith('tv-drawings-flush:'))) continue;
        const saved = localStorage.getItem(key);
        if (!saved || !saved.includes(entityId)) continue;

        const data = JSON.parse(saved);
        if (!data || !Array.isArray(data.sources)) continue;

        let found = false;
        for (let i = 0; i < data.sources.length; i++) {
          const entry = data.sources[i];
          if (Array.isArray(entry) && entry[0] === entityId && entry[1]) {
            const outer = entry[1];
            const innerState = (outer.state && outer.state.state && typeof outer.state.state === 'object')
              ? outer.state.state
              : (outer.state && typeof outer.state === 'object' ? outer.state : null);
            if (innerState) {
              Object.assign(innerState, newProps);
              found = true;
              break;
            }
          }
        }

        if (found) {
          localStorage.setItem(key, JSON.stringify(data));
          log(`Synced updated properties for ${entityId} to localStorage [${key}]`);
        }
      }
    } catch (e) {
      log('Could not sync to localStorage:', e);
    }
  }

  // -------------------------------------------------------------
  // Floating Toolbar Native Dropdown Injection
  // -------------------------------------------------------------
  let toolbarObserver = null;
  let toolbarCheckTimeout = null;

  function scheduleFloatingToolbarCheck(doc) {
    if (toolbarCheckTimeout) return;
    toolbarCheckTimeout = setTimeout(() => {
      toolbarCheckTimeout = null;
      checkForFloatingToolbar(doc || document);
    }, 250);
  }

  function setupFloatingToolbarObserver() {
    if (toolbarObserver) return;

    const observer = new MutationObserver((mutations) => {
      let hasAdded = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          hasAdded = true;
          break;
        }
      }
      if (hasAdded) {
        scheduleFloatingToolbarCheck(document);
      }
    });

    try {
      observer.observe(document.body, { childList: true, subtree: true });
      toolbarObserver = observer;
    } catch (e) {}

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          const iframeObserver = new MutationObserver((mutations) => {
            let hasAdded = false;
            for (let i = 0; i < mutations.length; i++) {
              if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
                hasAdded = true;
                break;
              }
            }
            if (hasAdded) {
              scheduleFloatingToolbarCheck(iframe.contentDocument);
            }
          });
          iframeObserver.observe(iframe.contentDocument.body, { childList: true, subtree: true });
        }
      } catch (e) {}
    });
  }

  function checkForFloatingToolbar(doc = document) {
    try {
      const toolbar = doc.querySelector(
        'div[data-name="drawing-toolbar"], div[class*="floatingToolbar"], div[class*="floating-toolbar"]'
      );

      if (!toolbar) return;
      if (toolbar.querySelector('.vest-template-dropdown-btn')) return;

      const colorBtn = toolbar.querySelector('button[data-name="line-color"], button[data-name="background-color"]') ||
        toolbar.querySelector('div[class*="colorButton"], div[class*="colorPicker"]');

      const dropdownContainer = doc.createElement('div');
      dropdownContainer.className = 'vest-template-dropdown-btn';
      dropdownContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        padding: 2px 8px;
        margin: 0 2px;
        height: 26px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        font-family: inherit;
        font-size: 11px;
        font-weight: 500;
        color: #e2e8f0;
        user-select: none;
        transition: background 0.15s ease;
      `;
      dropdownContainer.innerHTML = `
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${getActiveTemplate()?.color || '#22c55e'}; margin-right:5px;"></span>
        <span>Template</span>
        <svg style="margin-left:4px; width:10px; height:10px; opacity:0.7;" viewBox="0 0 10 6" fill="currentColor">
          <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `;

      dropdownContainer.addEventListener('mouseenter', () => {
        dropdownContainer.style.background = 'rgba(255, 255, 255, 0.15)';
      });
      dropdownContainer.addEventListener('mouseleave', () => {
        dropdownContainer.style.background = 'rgba(255, 255, 255, 0.08)';
      });

      const menu = doc.createElement('div');
      menu.className = 'vest-template-dropdown-menu';
      menu.style.cssText = `
        display: none;
        position: absolute;
        bottom: 100%;
        left: 0;
        margin-bottom: 6px;
        min-width: 210px;
        background: #181d28;
        border: 1px solid #2d3748;
        border-radius: 6px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7);
        padding: 4px;
        z-index: 100000;
      `;

      function renderMenu() {
        menu.innerHTML = '';
        const selectedInfo = getRightClickedOrSelectedShapeInfo();
        const activeDrawingType = selectedInfo ? selectedInfo.drawingType : 'rectangle';
        const activeTypeLabel = getDrawingTypeLabel(activeDrawingType);
        const matchingTemplates = currentTemplates.filter(
          t => canonicalizeDrawingType(t.drawingType || 'rectangle') === activeDrawingType
        );

        if (matchingTemplates.length === 0) {
          const emptyEl = doc.createElement('div');
          emptyEl.style.cssText = 'padding: 6px 8px; font-size: 11px; color: #64748b; font-style: italic;';
          emptyEl.textContent = `No saved ${activeTypeLabel} templates yet`;
          menu.appendChild(emptyEl);
        }

        matchingTemplates.forEach(t => {
          const item = doc.createElement('div');
          item.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 5px 8px;
            font-size: 12px;
            color: #cbd5e1;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.12s ease;
          `;

          const hasMid = t.showMiddleLine ? '<span style="font-size:10px; opacity:0.7; margin-left:3px;" title="Center Line">╍</span>' : '';
          const hasExt = t.extendRight ? '<span style="font-size:10px; opacity:0.7; margin-left:2px;" title="Extend Right">➜</span>' : '';
          const hasExtL = t.extendLeft ? '<span style="font-size:10px; opacity:0.7; margin-left:2px;" title="Extend Left">⬅</span>' : '';

          item.innerHTML = `
            <div style="display:flex; align-items:center; flex:1; overflow:hidden; margin-right:6px;">
              <span style="width:10px; height:10px; border-radius:2px; background:${t.color}; margin-right:8px; border:1px solid rgba(255,255,255,0.2); flex-shrink:0;"></span>
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(t.name)}</span>
              ${hasMid}${hasExtL}${hasExt}
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <button class="vest-override-btn" title="Overwrite '${escapeHtml(t.name)}' with selected ${activeTypeLabel}" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:2px; font-size:11px;">⟳</button>
              <button class="vest-delete-btn" title="Delete '${escapeHtml(t.name)}'" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:2px; font-size:13px; line-height:1;">×</button>
            </div>
          `;

          item.addEventListener('mouseenter', () => {
            item.style.background = 'rgba(255, 255, 255, 0.1)';
          });
          item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
          });

          // Click item to apply template to selected shape
          item.addEventListener('click', (e) => {
            if (e.target.closest('.vest-override-btn') || e.target.closest('.vest-delete-btn')) return;
            e.stopPropagation();
            menu.style.display = 'none';
            currentSettings.activeTemplateId = t.id;
            applyTemplateToSelectedOrLast(t, selectedInfo ? selectedInfo.id : null);

            const dot = dropdownContainer.querySelector('span:first-child');
            if (dot) dot.style.background = t.color;

            postToIsolated({
              type: 'VEST_TV_ACTIVE_TEMPLATE_CHANGED',
              templateId: t.id
            });
          });

          // Override button
          const overrideBtn = item.querySelector('.vest-override-btn');
          if (overrideBtn) {
            overrideBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              menu.style.display = 'none';
              overrideTemplateById(t.id, selectedInfo ? selectedInfo.id : null);
            });
          }

          // Delete button
          const deleteBtn = item.querySelector('.vest-delete-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              menu.style.display = 'none';
              postToIsolated({
                type: 'VEST_TV_DELETE_TEMPLATE_REQUEST',
                templateId: t.id,
                templateName: t.name
              });
            });
          }

          menu.appendChild(item);
        });

        // Bottom actions
        const divider = doc.createElement('div');
        divider.style.cssText = 'height:1px; background:rgba(255,255,255,0.1); margin:4px 0;';
        menu.appendChild(divider);

        // Save Drawing as New Template
        const saveItem = doc.createElement('div');
        saveItem.style.cssText = `
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          font-size: 11px;
          color: #94a3b8;
          border-radius: 4px;
          cursor: pointer;
        `;
        saveItem.innerHTML = `
          <svg style="width:12px; height:12px; color:#10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Save ${escapeHtml(activeTypeLabel)} as Template...</span>
        `;
        saveItem.addEventListener('mouseenter', () => {
          saveItem.style.background = 'rgba(255, 255, 255, 0.08)';
          saveItem.style.color = '#f8fafc';
        });
        saveItem.addEventListener('mouseleave', () => {
          saveItem.style.background = 'transparent';
          saveItem.style.color = '#94a3b8';
        });
        saveItem.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.style.display = 'none';
          const name = prompt(`Template name (${activeTypeLabel}):`, `Custom ${activeTypeLabel}`);
          if (name && name.trim()) {
            saveCurrentSelectionAsTemplate(name.trim(), selectedInfo ? selectedInfo.id : null);
          }
        });
        menu.appendChild(saveItem);

        // Open Template Manager
        const mgrItem = doc.createElement('div');
        mgrItem.style.cssText = `
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          font-size: 11px;
          color: #38bdf8;
          border-radius: 4px;
          cursor: pointer;
        `;
        mgrItem.innerHTML = `
          <svg style="width:12px; height:12px; color:#38bdf8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Template Manager...</span>
        `;
        mgrItem.addEventListener('mouseenter', () => {
          mgrItem.style.background = 'rgba(56, 189, 248, 0.12)';
        });
        mgrItem.addEventListener('mouseleave', () => {
          mgrItem.style.background = 'transparent';
        });
        mgrItem.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.style.display = 'none';
          postToIsolated({
            type: 'VEST_TV_OPEN_TEMPLATE_MANAGER',
            drawingType: activeDrawingType
          });
        });
        menu.appendChild(mgrItem);
      }

      dropdownContainer.appendChild(menu);

      dropdownContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        renderMenu();
        const isOpen = menu.style.display === 'block';
        menu.style.display = isOpen ? 'none' : 'block';
      });

      doc.addEventListener('click', () => {
        menu.style.display = 'none';
      });

      if (colorBtn && colorBtn.parentNode) {
        colorBtn.parentNode.insertBefore(dropdownContainer, colorBtn.nextSibling);
      } else {
        toolbar.appendChild(dropdownContainer);
      }
    } catch (e) {
      log('Error creating floating toolbar dropdown:', e);
    }
  }

  // -------------------------------------------------------------
  // Right-Click Context Menu: Native TradingView "Template >" Submenu
  // -------------------------------------------------------------
  const contextHookedDocs = new WeakSet();
  let activeSubmenuEl = null;
  let activeTemplateRowEl = null;
  let submenuHideTimer = null;
  let menuLifecycleTimer = null;
  let lastRightClickTime = 0;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function closeAllContextMenus() {
    if (submenuHideTimer) {
      clearTimeout(submenuHideTimer);
      submenuHideTimer = null;
    }
    if (activeSubmenuEl) {
      try { activeSubmenuEl.remove(); } catch (e) {}
      activeSubmenuEl = null;
    }
    if (activeTemplateRowEl) {
      try { activeTemplateRowEl.classList.remove('vest-tv-row-active'); } catch (e) {}
      activeTemplateRowEl = null;
    }

    const docs = [document];
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument && !docs.includes(iframe.contentDocument)) {
          docs.push(iframe.contentDocument);
        }
      } catch (e) {}
    });

    docs.forEach(d => {
      try {
        d.querySelectorAll('.vest-tv-floating-submenu, .vest-custom-context-menu').forEach(el => el.remove());
      } catch (e) {}
    });
  }

  function closeTradingViewPopupMenu(refEl) {
    closeAllContextMenus();
    if (!refEl) return;
    try {
      const doc = refEl.ownerDocument || document;
      const popupRoot = refEl.closest(
        'div[data-name="menu-inner"], div[data-name="popup-menu-container"], div[class*="menuWrap-"], div[class*="popupMenu-"], div[class*="menu-"]'
      );
      if (popupRoot && popupRoot !== doc.body) {
        popupRoot.style.setProperty('display', 'none', 'important');
      }
      const view = doc.defaultView || window;
      const escapeEvent = new view.KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true });
      doc.dispatchEvent(escapeEvent);
      view.dispatchEvent(new view.KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  /**
   * Detects the exact selected/right-clicked drawing on the chart and returns its { id, shape, drawingType, rawName }.
   */
  function getRightClickedOrSelectedShapeInfo(preferHovered = false) {
    if (!activeChart) {
      if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
        try { activeChart = activeChartApi.activeChart(); } catch (e) {}
      }
    }
    if (!activeChart) return null;

    // 1. Check TradingView's internal ChartModel hoveredSource / selection first!
    try {
      const modelId = getHoveredOrSelectedIdFromModel(preferHovered);
      if (modelId) {
        const shape = activeChart.getShapeById(modelId);
        if (shape) {
          const meta = getShapeMetadataById(modelId);
          if (!meta.isOrderLine) {
            rightClickedShapeId = modelId;
            rightClickedDrawingType = meta.drawingType;
            lastInteractedShapeId = modelId;
            if (meta.drawingType === 'rectangle' || meta.drawingType === 'rotated_rectangle') {
              lastRectangleId = modelId;
            }
            return { id: modelId, shape, drawingType: meta.drawingType, rawName: meta.rawName };
          }
        }
      }
    } catch (e) {}

    // 2. Check activeChart.selection() if exposed (iterating through all selected IDs and skipping Order/Position lines!)
    try {
      if (typeof activeChart.selection === 'function') {
        const sel = activeChart.selection();
        if (sel && typeof sel.all === 'function') {
          const all = sel.all();
          if (all && all.length > 0) {
            for (const id of all) {
              const shape = activeChart.getShapeById(id);
              if (!shape) continue;
              const meta = getShapeMetadataById(id);
              if (meta.isOrderLine) continue;
              rightClickedShapeId = id;
              rightClickedDrawingType = meta.drawingType;
              lastInteractedShapeId = id;
              if (meta.drawingType === 'rectangle' || meta.drawingType === 'rotated_rectangle') {
                lastRectangleId = id;
              }
              return { id, shape, drawingType: meta.drawingType, rawName: meta.rawName };
            }
          }
        }
      }
    } catch (e) {}

    // 3. Fallback to rightClickedShapeId, lastInteractedShapeId, or lastRectangleId if still valid on chart
    const fallbackIds = [rightClickedShapeId, lastInteractedShapeId, lastRectangleId].filter(Boolean);
    for (const fallbackId of fallbackIds) {
      try {
        const shape = activeChart.getShapeById(fallbackId);
        if (shape) {
          const meta = getShapeMetadataById(fallbackId);
          if (!meta.isOrderLine) {
            return { id: fallbackId, shape, drawingType: meta.drawingType, rawName: meta.rawName };
          }
        }
      } catch (e) {}
    }

    return null;
  }

  function ensureContextStylesInjected(doc) {
    if (!doc || doc.getElementById('vest-context-injected-styles')) return;
    const style = doc.createElement('style');
    style.id = 'vest-context-injected-styles';
    style.textContent = `
      [data-vest-cmi="true"].vest-tv-row-active,
      [data-vest-cmi="true"]:hover {
        background-color: rgba(255, 255, 255, 0.08) !important;
      }
      .vest-tv-floating-submenu {
        position: fixed !important;
        z-index: 2147483647 !important;
        min-width: 220px !important;
        max-width: 300px !important;
        max-height: 75vh !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        background: #1c1d22 !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 6px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65) !important;
        padding: 6px 0 !important;
        box-sizing: border-box !important;
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif !important;
        font-size: 13px !important;
        color: #d1d4dc !important;
        user-select: none !important;
      }
      .vest-tv-floating-submenu::-webkit-scrollbar {
        width: 4px !important;
      }
      .vest-tv-floating-submenu::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2) !important;
        border-radius: 2px !important;
      }
      .vest-tv-sub-header {
        padding: 4px 16px 6px 16px !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        letter-spacing: 0.6px !important;
        text-transform: uppercase !important;
        color: #38bdf8 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      .vest-tv-sub-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        min-height: 32px !important;
        padding: 4px 12px 4px 16px !important;
        cursor: pointer !important;
        color: #e2e4e9 !important;
        font-size: 13px !important;
        line-height: 20px !important;
        transition: background-color 0.08s ease !important;
        box-sizing: border-box !important;
        gap: 10px !important;
      }
      .vest-tv-sub-row:hover {
        background-color: rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
      }
      .vest-tv-sub-divider {
        height: 1px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        margin: 6px 0 !important;
      }
      .vest-tv-sub-label {
        flex: 1 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        font-weight: 400 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .vest-tv-sub-swatch {
        width: 10px !important;
        height: 10px !important;
        border-radius: 2px !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        flex-shrink: 0 !important;
      }
      .vest-tv-sub-actions {
        display: flex !important;
        align-items: center !important;
        gap: 2px !important;
        opacity: 0 !important;
        transition: opacity 0.1s ease !important;
        flex-shrink: 0 !important;
      }
      .vest-tv-sub-row:hover .vest-tv-sub-actions {
        opacity: 1 !important;
      }
      .vest-tv-sub-icon-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 22px !important;
        height: 22px !important;
        border: none !important;
        border-radius: 4px !important;
        background: transparent !important;
        color: #8c909c !important;
        font-size: 13px !important;
        line-height: 1 !important;
        cursor: pointer !important;
        padding: 0 !important;
      }
      .vest-tv-sub-icon-btn.edit-btn:hover {
        background: rgba(255, 255, 255, 0.12) !important;
        color: #38bdf8 !important;
      }
      .vest-tv-sub-icon-btn.delete-btn:hover {
        background: rgba(239, 68, 68, 0.18) !important;
        color: #ef4444 !important;
      }
    `;
    (doc.head || doc.body).appendChild(style);
  }

  /**
   * Finds the exact "Visual order" row inside an open TradingView drawing context menu for ANY drawing type.
   * Returns null if this is the general chart background menu ("Reset chart view", etc.).
   */
  function findVisualOrderRowInMenu(rootDoc = document) {
    const docs = [rootDoc];
    if (rootDoc !== document && !docs.includes(document)) {
      docs.push(document);
    }
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument && !docs.includes(iframe.contentDocument)) {
          docs.push(iframe.contentDocument);
        }
      } catch (e) {}
    });

    for (const doc of docs) {
      if (!doc || !doc.body) continue;

      // Find all table rows or menuitem divs in the document
      const rows = doc.querySelectorAll('tr, div[data-role="menuitem"], div[role="menuitem"], div[class*="item-"]');
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.offsetParent === null) continue;
        if (row.getAttribute('data-vest-cmi') === 'true') continue;

        // Check if this row's text is "Visual order"
        const rawText = (row.innerText || row.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
        if (rawText !== 'visual order') continue;

        // Make sure we have the outermost row element (e.g. <tr> or the direct child of the menu list)
        let targetRow = row;
        if (row.tagName !== 'TR') {
          const parentTr = row.closest('tr');
          if (parentTr) {
            targetRow = parentTr;
          } else {
            const parentItem = row.parentElement;
            if (parentItem && ((parentItem.innerText || '').trim().toLowerCase() === 'visual order')) {
              targetRow = parentItem;
            }
          }
        }

        const rowParent = targetRow.parentElement;
        if (!rowParent) continue;

        // Verify the parent menu is a drawing context menu (contains Clone/Remove/Settings and NOT Reset chart view)
        const menuText = (rowParent.innerText || rowParent.textContent || '').toLowerCase();
        if (
          menuText.includes('reset chart view') ||
          menuText.includes('lock vertical cursor line') ||
          menuText.includes('remove indicators')
        ) {
          continue;
        }

        // Capture the right-clicked drawing shape & type immediately when the context menu is detected
        getRightClickedOrSelectedShapeInfo();

        return { visualOrderRow: targetRow, rowParent, doc };
      }
    }

    return null;
  }

  /**
   * Opens the native-looking flyout submenu right next to the "Template >" row.
   */
  function openTemplatesFlyoutSubmenu(templateRow, doc) {
    if (submenuHideTimer) {
      clearTimeout(submenuHideTimer);
      submenuHideTimer = null;
    }

    if (activeSubmenuEl && activeTemplateRowEl === templateRow && activeSubmenuEl.isConnected) {
      return;
    }

    closeAllContextMenus();
    activeTemplateRowEl = templateRow;
    templateRow.classList.add('vest-tv-row-active');

    // Lock in the exact shape that was right-clicked
    const shapeInfo = getRightClickedOrSelectedShapeInfo();
    const targetShapeId = shapeInfo ? shapeInfo.id : rightClickedShapeId;
    const targetDrawingType = shapeInfo ? shapeInfo.drawingType : (rightClickedDrawingType || 'rectangle');
    const drawingTypeLabel = getDrawingTypeLabel(targetDrawingType);

    const submenu = doc.createElement('div');
    submenu.className = 'vest-tv-floating-submenu';

    // Match background & font from TradingView's own menu container if available
    try {
      const menuPopup = templateRow.closest('div[class*="menuWrap-"], div[data-name="menu-inner"], div[class*="menu-"], table') || templateRow.parentElement;
      if (menuPopup && doc.defaultView) {
        const cs = doc.defaultView.getComputedStyle(menuPopup);
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
          submenu.style.setProperty('background', cs.backgroundColor, 'important');
        }
        if (cs.fontFamily) {
          submenu.style.setProperty('font-family', cs.fontFamily, 'important');
        }
      }
    } catch (e) {}

    // Prevent clicks inside submenu from bubbling to TradingView's outside-click closer
    ['mousedown', 'pointerdown', 'mouseup', 'click', 'contextmenu'].forEach(evt => {
      submenu.addEventListener(evt, (e) => e.stopPropagation());
    });

    submenu.addEventListener('mouseenter', () => {
      if (submenuHideTimer) {
        clearTimeout(submenuHideTimer);
        submenuHideTimer = null;
      }
    });

    submenu.addEventListener('mouseleave', () => {
      submenuHideTimer = setTimeout(() => {
        closeAllContextMenus();
      }, 200);
    });

    const renderSubmenuContents = () => {
      submenu.innerHTML = '';

      // 0. Header showing detected Drawing Type
      const headerEl = doc.createElement('div');
      headerEl.className = 'vest-tv-sub-header';
      headerEl.innerHTML = `<span>${escapeHtml(drawingTypeLabel)}</span>`;
      submenu.appendChild(headerEl);

      // 1. "Save Drawing Template As..."
      const saveAsRow = doc.createElement('div');
      saveAsRow.className = 'vest-tv-sub-row';
      saveAsRow.innerHTML = `<span class="vest-tv-sub-label">Save as...</span>`;
      saveAsRow.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closeTradingViewPopupMenu(templateRow);
        const defaultName = `Custom ${drawingTypeLabel}`;
        const name = prompt(`Save ${drawingTypeLabel} Template As:`, defaultName);
        if (name && name.trim()) {
          saveCurrentSelectionAsTemplate(name.trim(), targetShapeId);
        }
      });
      submenu.appendChild(saveAsRow);

      // 2. "Template Manager..."
      const mgrRow = doc.createElement('div');
      mgrRow.className = 'vest-tv-sub-row';
      mgrRow.innerHTML = `<span class="vest-tv-sub-label" style="color:#38bdf8;">Template Manager...</span>`;
      mgrRow.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closeTradingViewPopupMenu(templateRow);
        postToIsolated({
          type: 'VEST_TV_OPEN_TEMPLATE_MANAGER',
          drawingType: targetDrawingType
        });
      });
      submenu.appendChild(mgrRow);

      // Filter templates matching this drawing's type
      const matchingTemplates = currentTemplates.filter(
        t => canonicalizeDrawingType(t.drawingType || 'rectangle') === targetDrawingType
      );

      // 3. Divider
      const divider = doc.createElement('div');
      divider.className = 'vest-tv-sub-divider';
      submenu.appendChild(divider);

      if (matchingTemplates.length === 0) {
        const emptyRow = doc.createElement('div');
        emptyRow.style.cssText = 'padding: 6px 16px; font-size: 12px; color: #787b86; font-style: italic;';
        emptyRow.textContent = `No saved ${drawingTypeLabel} templates`;
        submenu.appendChild(emptyRow);
      }

      // 4. Template items for this drawing type
      matchingTemplates.forEach(t => {
        const row = doc.createElement('div');
        row.className = 'vest-tv-sub-row';
        const swatchColor = t.color || '#22c55e';
        row.innerHTML = `
          <span class="vest-tv-sub-label">
            <span class="vest-tv-sub-swatch" style="background:${escapeHtml(swatchColor)};"></span>
            <span>${escapeHtml(t.name)}</span>
          </span>
          <div class="vest-tv-sub-actions">
            <button type="button" class="vest-tv-sub-icon-btn edit-btn" title="Edit '${escapeHtml(t.name)}' in Template Manager">✎</button>
            <button type="button" class="vest-tv-sub-icon-btn delete-btn" title="Remove '${escapeHtml(t.name)}'">×</button>
          </div>
        `;

        // Click row to apply template ONLY to the right-clicked shape
        row.addEventListener('click', (e) => {
          if (e.target.closest('.vest-tv-sub-icon-btn')) return;
          e.stopPropagation();
          e.preventDefault();

          applyTemplateToSelectedOrLast(t, targetShapeId);
          currentSettings.activeTemplateId = t.id;
          postToIsolated({
            type: 'VEST_TV_ACTIVE_TEMPLATE_CHANGED',
            templateId: t.id
          });
          postToIsolated({
            type: 'VEST_TV_SHOW_TOAST',
            message: `Applied "${t.name}" to ${drawingTypeLabel}`
          });
          closeTradingViewPopupMenu(templateRow);
        });

        // Pencil (Edit) button -> opens Template Manager directly on this template
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            closeTradingViewPopupMenu(templateRow);
            postToIsolated({
              type: 'VEST_TV_EDIT_TEMPLATE_REQUEST',
              templateId: t.id,
              drawingType: targetDrawingType
            });
          });
        }

        // X (Delete) button
        const deleteBtn = row.querySelector('.delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            currentTemplates = currentTemplates.filter(item => item.id !== t.id);
            if (currentSettings.activeTemplateId === t.id) {
              currentSettings.activeTemplateId = currentTemplates[0]?.id || null;
            }
            renderSubmenuContents();
            postToIsolated({
              type: 'VEST_TV_DELETE_TEMPLATE_REQUEST',
              templateId: t.id,
              templateName: t.name
            });
          });
        }

        submenu.appendChild(row);
      });
    };

    renderSubmenuContents();
    doc.body.appendChild(submenu);
    activeSubmenuEl = submenu;

    // Position the flyout submenu right next to the Template row (like TradingView's native submenu)
    const rowRect = templateRow.getBoundingClientRect();
    const menuPopup = templateRow.closest('div[class*="menuWrap-"], div[data-name="menu-inner"], div[class*="menu-"], table') || templateRow;
    const menuRect = menuPopup.getBoundingClientRect();
    const subRect = submenu.getBoundingClientRect();
    const winW = doc.defaultView ? doc.defaultView.innerWidth : window.innerWidth;
    const winH = doc.defaultView ? doc.defaultView.innerHeight : window.innerHeight;

    let left = menuRect.right + 2;
    if (left + subRect.width > winW - 8) {
      left = Math.max(8, menuRect.left - subRect.width - 2);
    }

    let top = rowRect.top - 6;
    if (top + subRect.height > winH - 8) {
      top = Math.max(8, winH - subRect.height - 8);
    }

    submenu.style.left = `${Math.round(left)}px`;
    submenu.style.top = `${Math.round(top)}px`;

    // Watch for TradingView's main menu closing so our submenu never lingers
    if (menuLifecycleTimer) clearInterval(menuLifecycleTimer);
    menuLifecycleTimer = setInterval(() => {
      if (!templateRow.isConnected || templateRow.offsetParent === null) {
        clearInterval(menuLifecycleTimer);
        menuLifecycleTimer = null;
        closeAllContextMenus();
      }
    }, 100);
  }

  function injectTemplatesIntoTradingViewMenu(visualOrderRow, rowParent, doc) {
    if (!visualOrderRow || !rowParent) return false;
    if (rowParent.querySelector('[data-vest-cmi="true"]')) {
      injectSyncGloballyMenuItem(rowParent, doc);
      return true;
    }

    ensureContextStylesInjected(doc);

    // Clone the "Visual order" row so our "Template" row has 100% identical TradingView DOM & CSS classes
    const templateRow = visualOrderRow.cloneNode(true);
    templateRow.setAttribute('data-vest-cmi', 'true');

    // 1. Blank out the left-side icon SVG (so the icon column stays aligned with "Visual order", just like TradingView.com)
    const svgs = templateRow.querySelectorAll('svg');
    if (svgs.length >= 2) {
      // First SVG is the left "Visual order" layers icon; last SVG is the right ">" chevron
      svgs[0].style.visibility = 'hidden';
    } else if (svgs.length === 1) {
      // Check if the single SVG is on the left or right; if it's inside the first cell/child, hide it
      const firstCell = templateRow.firstElementChild;
      if (firstCell && firstCell.contains(svgs[0]) && templateRow.children.length > 2) {
        svgs[0].style.visibility = 'hidden';
      }
    }

    // 2. Replace the text "Visual order" with "Template" inside the cloned text node
    const walker = doc.createTreeWalker(templateRow, NodeFilter.SHOW_TEXT, null);
    let node;
    let replaced = false;
    while ((node = walker.nextNode())) {
      if (/visual\s*order/i.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/visual\s*order/i, 'Template');
        replaced = true;
      }
    }
    if (!replaced) {
      const labelEl = templateRow.querySelector('[class*="label-"], [class*="title-"]') || templateRow.children[1] || templateRow;
      labelEl.textContent = 'Template';
    }

    // 3. Hovering "Template" opens the flyout submenu
    templateRow.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      openTemplatesFlyoutSubmenu(templateRow, doc);
    });

    templateRow.addEventListener('mouseleave', () => {
      submenuHideTimer = setTimeout(() => {
        if (activeSubmenuEl && !activeSubmenuEl.matches(':hover')) {
          closeAllContextMenus();
        }
      }, 200);
    });

    templateRow.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openTemplatesFlyoutSubmenu(templateRow, doc);
    });

    // Hide our submenu immediately when the user hovers any other row in TradingView's main menu
    Array.from(rowParent.children).forEach(sibling => {
      if (sibling === templateRow) return;
      sibling.addEventListener('mouseenter', () => {
        closeAllContextMenus();
      });
    });

    // Insert "Template" directly above "Visual order" (matching TradingView.com)
    rowParent.insertBefore(templateRow, visualOrderRow);
    injectSyncGloballyMenuItem(rowParent, doc);

    log('Successfully injected native "Template >" row above "Visual order"!');
    return true;
  }

  function injectSyncGloballyMenuItem(rowParent, doc) {
    if (!rowParent || !doc) return;
    const shapeInfo = getRightClickedOrSelectedShapeInfo();
    const targetShapeId = shapeInfo && shapeInfo.id ? shapeInfo.id : rightClickedShapeId;
    const lockRow = Array.from(rowParent.children).find(row =>
      String(row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'lock'
    );
    if (!lockRow) return;
    let syncRow = rowParent.querySelector('[data-vest-sync-global="true"]');
    const isSynced = Boolean(shapeInfo && globalDrawingEntityMap.has(shapeInfo.id));
    if (!syncRow) {
      syncRow = lockRow.cloneNode(true);
      syncRow.setAttribute('data-vest-sync-global', 'true');
      syncRow.setAttribute('data-vest-cmi', 'true');
      syncRow.removeAttribute('data-name');
      syncRow.removeAttribute('data-role');
      syncRow.removeAttribute('aria-label');
      syncRow.querySelectorAll('[data-name], [data-role], [data-tooltip]').forEach(el => {
        el.removeAttribute('data-name');
        el.removeAttribute('data-role');
        el.removeAttribute('data-tooltip');
      });
      const walker = doc.createTreeWalker(syncRow, NodeFilter.SHOW_TEXT, null);
      let textNode;
      while ((textNode = walker.nextNode())) {
        if (/^\s*lock\s*$/i.test(textNode.nodeValue || '')) {
          textNode.nodeValue = textNode.nodeValue.replace(/lock/i, 'Sync globally');
          break;
        }
      }
      const svgs = syncRow.querySelectorAll('svg');
      if (svgs.length) {
        svgs[0].innerHTML = '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>';
        svgs[0].setAttribute('viewBox', '0 0 24 24');
        svgs[0].setAttribute('fill', 'none');
        svgs[0].setAttribute('stroke', 'currentColor');
        svgs[0].setAttribute('stroke-width', '1.8');
      }
      let lastActivationAt = 0;
      const activateSyncItem = event => {
        if (event.type === 'pointerdown' && event.button !== 0) return;
        if (Date.now() - lastActivationAt < 450) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
          return;
        }
        lastActivationAt = Date.now();
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        const current = getRightClickedOrSelectedShapeInfo();
        const resolvedShapeId = targetShapeId || (current && current.id);
        if (resolvedShapeId) {
          toggleGlobalSyncForShape(resolvedShapeId);
          injectSyncGloballyMenuItem(rowParent, doc);
        }
        closeTradingViewPopupMenu(syncRow);
      };
      // Some TradingView menu builds tear down the popup during pointerdown, before
      // a click event can reach a custom row. Activate at pointerdown and retain a
      // click fallback for keyboard and older pointer implementations.
      syncRow.addEventListener('pointerdown', activateSyncItem);
      syncRow.addEventListener('click', activateSyncItem);
    }
    syncRow.setAttribute('aria-checked', isSynced ? 'true' : 'false');
    syncRow.title = isSynced ? 'This drawing is synced globally. Click to stop syncing.' : 'Show this drawing on every chart for this instrument.';
    const firstSvg = syncRow.querySelector('svg');
    if (firstSvg) firstSvg.style.color = isSynced ? '#22c55e' : '';
    if (syncRow.parentElement !== rowParent || syncRow.nextElementSibling !== lockRow) {
      rowParent.insertBefore(syncRow, lockRow);
    }
  }

  function tryInjectTemplatesMenu(targetDoc = document) {
    const found = findVisualOrderRowInMenu(targetDoc);
    if (found && found.visualOrderRow) {
      return injectTemplatesIntoTradingViewMenu(found.visualOrderRow, found.rowParent, found.doc);
    }
    return false;
  }

  function hookContextMenuOnDoc(doc) {
    if (!doc || contextHookedDocs.has(doc)) return;
    contextHookedDocs.add(doc);

    const handleContextMenuEvent = () => {
      lastRightClickTime = Date.now();
      closeAllContextMenus();
      // Immediately record which drawing is hovered/selected when right-click happens
      getRightClickedOrSelectedShapeInfo(true);

      if (tryInjectTemplatesMenu(doc)) return;

      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (tryInjectTemplatesMenu(doc) || attempts >= 25) {
          clearInterval(checkInterval);
        }
      }, 25);
    };

    // Track hovered/selected shape on any pointerdown or mousedown on the chart canvas
    // so clicking or right-clicking an existing drawing always locks in its exact ID!
    const captureHoveredOrSelectedOnPointer = (e) => {
      try {
        const t = e.target;
        if (t && t.tagName === 'CANVAS') {
          getRightClickedOrSelectedShapeInfo(true);
          setTimeout(() => getRightClickedOrSelectedShapeInfo(false), 30);
        }
      } catch (err) {}
    };

    doc.addEventListener('pointerdown', captureHoveredOrSelectedOnPointer, true);
    doc.addEventListener('contextmenu', handleContextMenuEvent, true);
    doc.addEventListener('mousedown', (e) => {
      captureHoveredOrSelectedOnPointer(e);
      if (activeSubmenuEl && !activeSubmenuEl.contains(e.target) && (!activeTemplateRowEl || !activeTemplateRowEl.contains(e.target))) {
        closeAllContextMenus();
      }
    }, true);
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllContextMenus();
    }, true);

    const attachMenuObserver = () => {
      if (!doc.body) return;
      try {
        const obs = new MutationObserver((mutations) => {
          const recentlyRightClicked = (Date.now() - lastRightClickTime) < 2500;
          if (!recentlyRightClicked) return;
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length > 0) {
              for (const node of m.addedNodes) {
                if (node && node.nodeType === 1) {
                  if (node.getAttribute && node.getAttribute('data-vest-cmi') === 'true') continue;
                  if (node.classList && node.classList.contains('vest-tv-floating-submenu')) continue;
                  tryInjectTemplatesMenu(doc);
                  return;
                }
              }
            }
          }
        });
        obs.observe(doc.body, { childList: true, subtree: true });
      } catch (e) {}
    };

    if (doc.body) {
      attachMenuObserver();
    } else {
      doc.addEventListener('DOMContentLoaded', attachMenuObserver, { once: true });
    }
  }

  function setupContextMenuHandler() {
    hookContextMenuOnDoc(document);

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument) {
          hookContextMenuOnDoc(iframe.contentDocument);
        }
      } catch (e) {}
    });
  }

  // -------------------------------------------------------------
  // Message Handling with Isolated World
  // -------------------------------------------------------------
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    const { type, payload } = event.data;

    switch (type) {
      case 'VEST_TV_FAIL_PRICES_UPDATE': {
        const next = payload || {};
        const longPrice = Number(next.long);
        const shortPrice = Number(next.short);
        liveFailPrices = {
          long: Number.isFinite(longPrice) && longPrice > 0 ? longPrice : null,
          short: Number.isFinite(shortPrice) && shortPrice > 0 ? shortPrice : null
        };
        scheduleIctSessionsRender(false);
        break;
      }
      case 'VEST_TV_STOP_LOSS_UPDATE': {
        const next = payload || {};
        const side = ['long', 'short'].includes(next.side) ? next.side : null;
        const price = Number(next.price);
        liveEstimatedStopLoss = {
          side,
          price: side && Number.isFinite(price) && price > 0 ? price : null
        };
        scheduleIctSessionsRender(false);
        break;
      }
      case 'VEST_TV_STOP_LOSS_PRICE_UPDATE': {
        const next = payload || {};
        if (next.side === liveEstimatedStopLoss.side && Number.isFinite(Number(next.price)) && Number(next.price) > 0) {
          liveEstimatedStopLoss.price = Number(next.price);
          scheduleIctSessionsRender(false);
        }
        break;
      }
      case 'VEST_TV_ESTIMATED_PNL_UPDATE': {
        const value = Number(payload && payload.value);
        liveEstimatedPnl = Number.isFinite(value) ? value : null;
        scheduleIctSessionsRender(false);
        break;
      }
      case 'VEST_TV_GLOBAL_DRAWINGS_UPDATE': {
        updateGlobalDrawingsSnapshot(payload && payload.drawings);
        restoreGlobalDrawings();
        break;
      }
      case 'VEST_TV_CHART_MEMORY_FOCUS': {
        const wasFocused = chartMemoryTabFocused;
        chartMemoryTabFocused = Boolean(payload && payload.focused);
        if (wasFocused && !chartMemoryTabFocused) {
          // Flush the final viewport before this tab stops being the publisher.
          saveCurrentChartSettings(true);
        } else if (!wasFocused && chartMemoryTabFocused) {
          // A newly focused tab becomes the single publisher for this chart key.
          scheduleSaveCurrentChartSettings(80);
        }
        break;
      }

      case 'VEST_TV_CONFIG_UPDATE': {
        const wasRemembering = currentSettings.rememberSidebarTools !== false;
        const wasRememberingChart = currentSettings.rememberLastChartSettings !== false;
        if (payload.templates && Array.isArray(payload.templates)) {
          currentTemplates = payload.templates;
        }
        if (payload.settings) {
          const incomingSidebar = payload.settings.sidebarState || {};
          const prevSidebar = currentSettings.sidebarState || {};
          currentSettings = {
            ...currentSettings,
            ...payload.settings,
            lastChartSettings: mergeChartMemoryState(currentSettings.lastChartSettings, payload.settings.lastChartSettings),
            sidebarState: {
              ...prevSidebar,
              ...incomingSidebar,
              groupTools: {
                ...(prevSidebar.groupTools || {}),
                ...(incomingSidebar.groupTools || {})
              }
            }
          };
          if (!currentSettings.cortexIndicator || currentSettings.cortexIndicator.enabled !== true) {
            lastCortexAutomationClosedBarKey = '';
            lastCortexAutomationContextKey = '';
          }
          try {
            window.localStorage.setItem(
              '__trading_cortex_isolated_settings__',
              JSON.stringify(currentSettings)
            );
            window.localStorage.setItem(
              '__trading_cortex_sidebar_state__',
              JSON.stringify(currentSettings.sidebarState)
            );
            if (currentSettings.lastChartSettings && Object.keys(currentSettings.lastChartSettings).length > 0) {
              window.localStorage.setItem(
                '__trading_cortex_chart_settings__',
                JSON.stringify(currentSettings.lastChartSettings)
              );
            }
          } catch (e) {}
        }
        if (Array.isArray(payload.globalDrawings)) {
          updateGlobalDrawingsSnapshot(payload.globalDrawings);
        }
        hasReceivedConfigUpdate = true;
        enhanceTimeframeFavoritesBar();
        restoreGlobalDrawings();

        const activeTpl = getActiveTemplate();
        if (activeTpl) {
          applyTemplateOverridesIfChanged(activeTpl);
        }
        const isRemembering = currentSettings.rememberSidebarTools !== false;
        if (
          isRemembering &&
          (!hasCompletedInitialSidebarRestore || !wasRemembering)
        ) {
          restoreAttempts = 0;
          restoreSidebarSelections();
        }
        const isRememberingChart = currentSettings.rememberLastChartSettings !== false;
        if (isRememberingChart && (!hasCompletedInitialChartSettingsRestore || !wasRememberingChart)) {
          chartSettingsRestoreAttempts = 0;
          restoreLastChartSettings();
        } else if (isRememberingChart && hasCompletedInitialChartSettingsRestore) {
          applyIncomingChartViewportIfNewer();
        }
        if (currentSettings.candleOhlc && currentSettings.candleOhlc.customCandleWidthEnabled) {
          applyCustomCandleWidthToChart(currentSettings.candleOhlc.candleWidthPx, false);
        }
        syncExtendedRectangleTextHooks();
        scheduleIctSessionsRender(true);
        break;
      }

      case 'VEST_TV_CAPTURE_AND_RESTORE_SIDEBAR': {
        if (currentSettings.rememberSidebarTools !== false) {
          saveCurrentSidebarState();
        }
        break;
      }

      case 'VEST_TV_CAPTURE_CHART_SETTINGS': {
        if (currentSettings.rememberLastChartSettings !== false) {
          saveCurrentChartSettings();
        }
        break;
      }

      case 'VEST_TV_APPLY_TEMPLATE': {
        const tpl = currentTemplates.find(t => t.id === payload.templateId);
        if (tpl) {
          currentSettings.activeTemplateId = tpl.id;
          if (payload.applyToSelectedOnly) {
            applyTemplateToSelectedOrLast(tpl, payload.targetShapeId || null);
          } else {
            applyTemplateOverrides(tpl);
          }
          if (payload.activateTool) {
            activateRectangleDrawingTool();
          }
        }
        break;
      }

      case 'VEST_TV_ACTIVATE_TOOL': {
        if (payload && payload.tool === 'magnet') {
          toggleMagnetTool(payload.desiredState);
        } else {
          activateRectangleDrawingTool();
        }
        break;
      }

      case 'VEST_TV_SAVE_SELECTION_AS_TEMPLATE': {
        saveCurrentSelectionAsTemplate(payload.name, payload.targetShapeId || null);
        break;
      }

      case 'VEST_TV_UPDATE_ACTIVE_FROM_SELECTION': {
        updateActiveTemplateFromSelection();
        break;
      }

      case 'VEST_TV_OVERRIDE_TEMPLATE': {
        overrideTemplateById(payload.templateId, payload.targetShapeId || null);
        break;
      }

      case 'VEST_TV_REQUEST_SHAPE_PROPERTIES_FOR_EDITOR': {
        const targetInfo = getTargetShapeInfo();
        if (!targetInfo || !targetInfo.shape) {
          if (window === window.top || activeChart) {
            postToIsolated({
              type: 'VEST_TV_SHOW_TOAST',
              message: 'Select a drawing on the chart first to copy its properties'
            });
          }
          break;
        }
        const extracted = extractPropertiesFromShape(targetInfo.shape, targetInfo.drawingType, targetInfo.id);
        if (extracted) {
          postToIsolated({
            type: 'VEST_TV_SHAPE_PROPERTIES_FOR_EDITOR',
            properties: extracted
          });
        }
        break;
      }

      case 'VEST_TV_CLEAR_CREATED_FVG_LOG': {
        clearCreatedFvgsLog();
        if (window === window.top || activeChart) {
          postToIsolated({
            type: 'VEST_TV_SHOW_TOAST',
            message: 'Cleared created FVG log — FVGs will be re-evaluated'
          });
        }
        scheduleIctSessionsRender(true);
        break;
      }

      case 'VEST_TV_SCAN_PLATFORM_TRADES': {
        if (window === window.top) {
          scanPlatformTradesInMainWorld(true);
        }
        break;
      }

      case 'VEST_TV_CLEAR_CLICKED_CANDLE_OHLC': {
        clearAllClickedCandleOhlcState();
        scheduleIctSessionsRender(false);
        break;
      }

      case 'VEST_TV_SET_CANDLE_WIDTH': {
        if (typeof event.data.candleWidthPx === 'number') {
          applyCustomCandleWidthToChart(event.data.candleWidthPx, true);
        }
        break;
      }
    }
  });

  /**
   * Parses any CSS color string (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba()) into { hex: '#rrggbb', alpha: 0..1 | null }
   */
  function parseColorAndAlpha(rawColor, fallbackHex = '#22c55e') {
    if (!rawColor || typeof rawColor !== 'string') {
      return { hex: fallbackHex, alpha: null };
    }
    const s = rawColor.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) {
      return { hex: s.toLowerCase(), alpha: null };
    }
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      const hex = '#' + s.slice(1).split('').map(c => c + c).join('').toLowerCase();
      return { hex, alpha: null };
    }
    if (/^#[0-9a-fA-F]{8}$/.test(s)) {
      const hex = s.slice(0, 7).toLowerCase();
      const a = parseInt(s.slice(7, 9), 16) / 255;
      return { hex, alpha: Math.round(a * 100) / 100 };
    }
    const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (rgbMatch) {
      const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10)));
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      const alpha = rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4]))) : null;
      return { hex, alpha };
    }
    return { hex: fallbackHex, alpha: null };
  }

  function hexToRgbaString(hex, opacityPct) {
    const parsed = parseColorAndAlpha(hex, '#22c55e');
    const c = parsed.hex.replace('#', '');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const a = Math.max(0, Math.min(1, (typeof opacityPct === 'number' ? opacityPct : 20) / 100));
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  }

  /**
   * Unwraps a TradingView internal Property object tree into a plain JS object
   */
  function unwrapPropertyTree(propObj, depth = 0) {
    if (!propObj || typeof propObj !== 'object' || depth > 4) return {};
    const out = {};
    try {
      if (typeof propObj.state === 'function') {
        const st = propObj.state();
        if (st && typeof st === 'object') {
          Object.assign(out, st);
        }
      }
    } catch (e) {}
    try {
      const childs = typeof propObj.childs === 'function' ? propObj.childs() : propObj;
      if (childs && typeof childs === 'object') {
        for (const k of Object.keys(childs)) {
          if (k.startsWith('_')) continue;
          const child = childs[k];
          if (child && typeof child === 'object') {
            if (typeof child.value === 'function') {
              try { out[k] = child.value(); } catch (e) {}
            } else if (typeof child.childs === 'function' || typeof child.state === 'function') {
              out[k] = unwrapPropertyTree(child, depth + 1);
            }
          } else if (child !== undefined && typeof child !== 'function') {
            out[k] = child;
          }
        }
      }
    } catch (e) {}
    return out;
  }

  /**
   * Reads ALL properties from a drawing shape (any TradingView drawing type) and extracts both normalized fields and rawProperties
   */
  function extractPropertiesFromShape(shape, drawingTypeHint = null, entityId = null) {
    if (!shape) return null;
    let p = {};
    try {
      if (typeof shape.getProperties === 'function') {
        p = { ...(shape.getProperties() || {}) };
      }
    } catch (e) {}

    // Also inspect internal source properties in case shape.getProperties() omits nested fields
    try {
      const internalSrc = extractInternalSourceFromShape(shape, entityId);
      if (internalSrc) {
        const internalPropsObj = typeof internalSrc.properties === 'function'
          ? internalSrc.properties()
          : internalSrc._properties;
        if (internalPropsObj) {
          const unwrapped = unwrapPropertyTree(internalPropsObj);
          p = { ...unwrapped, ...p };
        }
      }
    } catch (e) {}

    const drawingType = canonicalizeDrawingType(drawingTypeHint || 'rectangle');

    // Deep clone and sanitize rawProperties so tool-specific settings (Fib levels, channel lines, etc.) are preserved without read-only metadata
    let rawProperties = {};
    try {
      rawProperties = sanitizeRawShapeProperties(JSON.parse(JSON.stringify(p)));
    } catch (e) {}

    // Primary color across different TradingView tools (color, linecolor, borderColor, textcolor)
    const rawPrimaryColor = p.color || p.linecolor || p.borderColor || p.textcolor || p.textColor || '#22c55e';
    const parsedPrimary = parseColorAndAlpha(rawPrimaryColor, '#22c55e');
    const primaryColor = parsedPrimary.hex;

    const rawBgColor = p.backgroundColor || p.fillColor || rawPrimaryColor;
    const parsedBg = parseColorAndAlpha(rawBgColor, primaryColor);
    const bgColor = parsedBg.hex;

    // Determine fill opacity (0..100):
    // 1. If fillBackground is explicitly false, opacity is 0
    // 2. If p.transparency is a number (TradingView 0=opaque, 100=transparent), opacity = 100 - transparency
    // 3. Otherwise if backgroundColor was an rgba(..., a) string, use alpha * 100
    let opacity = 20;
    if (p.fillBackground === false) {
      opacity = 0;
    } else if (typeof p.transparency === 'number') {
      opacity = Math.max(0, Math.min(100, Math.round(100 - p.transparency)));
    } else if (typeof p.backgroundTransparency === 'number') {
      opacity = Math.max(0, Math.min(100, Math.round(100 - p.backgroundTransparency)));
    } else if (parsedBg.alpha !== null) {
      opacity = Math.max(0, Math.min(100, Math.round(parsedBg.alpha * 100)));
    }

    // Detect center / middle line (Rectangles use middleLine / showMiddleLine; Parallel Channels use showMidline / midlinecolor)
    const showMiddleLine = Boolean(
      (p.middleLine && (p.middleLine.showLine || p.middleLine.visible)) ||
      p.showMiddleLine ||
      p['middleLine.showLine'] ||
      p.showMidline
    );

    const rawMiddleColor = (p.middleLine && (p.middleLine.lineColor || p.middleLine.color)) ||
      p.middleLineColor ||
      p['middleLine.lineColor'] ||
      p.midlinecolor ||
      primaryColor;
    const middleLineColor = parseColorAndAlpha(rawMiddleColor, primaryColor).hex;

    const middleLineWidth = Number(
      (p.middleLine && (p.middleLine.lineWidth || p.middleLine.width)) ||
      p.middleLineWidth ||
      p['middleLine.lineWidth'] ||
      p.midlinewidth || 1
    );

    const middleLineStyle = (p.middleLine && p.middleLine.lineStyle !== undefined)
      ? Number(p.middleLine.lineStyle)
      : (p.middleLineStyle !== undefined
          ? Number(p.middleLineStyle)
          : (p.midlinestyle !== undefined ? Number(p.midlinestyle) : 2));

    const textStr = p.text !== undefined ? String(p.text || '') : (p.title !== undefined ? String(p.title || '') : '');
    const hasLabel = Boolean(p.showLabel || p.showText || textStr.trim().length > 0);
    const rawTextColor = p.textColor || p.textcolor || primaryColor;
    const textColor = parseColorAndAlpha(rawTextColor, primaryColor).hex;

    return {
      drawingType,
      color: primaryColor,
      backgroundColor: bgColor,
      opacity: opacity,
      linewidth: Number(p.linewidth || p.borderWidth) || 1,
      linestyle: Number(p.linestyle ?? p.borderStyle ?? 0),
      extendRight: Boolean(p.extendRight || p.extendLines),
      extendLeft: Boolean(p.extendLeft),
      showMiddleLine: showMiddleLine,
      middleLineColor: middleLineColor,
      middleLineWidth: middleLineWidth,
      middleLineStyle: middleLineStyle,
      showLabel: hasLabel,
      text: textStr,
      textColor: textColor,
      fontSize: Number(p.fontSize || p.fontsize) || 12,
      horzLabelsAlign: p.horzLabelsAlign || p.horzTextAlign || 'right',
      vertLabelsAlign: p.vertLabelsAlign || p.vertTextAlign || 'middle',
      rawProperties
    };
  }

  function getTargetShapeInfo(explicitTargetId = null) {
    if (!activeChart) {
      if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
        try { activeChart = activeChartApi.activeChart(); } catch (e) {}
      }
    }
    if (!activeChart) return null;

    if (explicitTargetId) {
      try {
        const shape = activeChart.getShapeById(explicitTargetId);
        if (shape) {
          const meta = getShapeMetadataById(explicitTargetId);
          return { id: explicitTargetId, shape, drawingType: meta.drawingType, rawName: meta.rawName };
        }
      } catch (e) {}
    }

    return getRightClickedOrSelectedShapeInfo();
  }

  function getTargetShape(explicitTargetId = null) {
    const info = getTargetShapeInfo(explicitTargetId);
    return info ? info.shape : null;
  }

  function saveCurrentSelectionAsTemplate(name, explicitTargetId = null) {
    const targetInfo = getTargetShapeInfo(explicitTargetId);
    if (!targetInfo || !targetInfo.shape) return;

    try {
      const extracted = extractPropertiesFromShape(targetInfo.shape, targetInfo.drawingType, targetInfo.id);
      if (!extracted) return;

      const typeLabel = getDrawingTypeLabel(targetInfo.drawingType);
      const newTemplate = {
        id: `custom_${Date.now()}`,
        name: name || `Custom ${typeLabel}`,
        ...extracted
      };

      postToIsolated({
        type: 'VEST_TV_TEMPLATE_CREATED_FROM_SHAPE',
        template: newTemplate
      });
    } catch (e) {
      log('Error reading shape properties for save:', e);
    }
  }

  function updateActiveTemplateFromSelection(explicitTargetId = null) {
    const targetInfo = getTargetShapeInfo(explicitTargetId);
    if (!targetInfo || !targetInfo.shape) return;

    try {
      const extracted = extractPropertiesFromShape(targetInfo.shape, targetInfo.drawingType, targetInfo.id);
      if (!extracted) return;

      postToIsolated({
        type: 'VEST_TV_ACTIVE_TEMPLATE_UPDATED_FROM_SHAPE',
        updates: extracted
      });
    } catch (e) {
      log('Error updating active template from shape:', e);
    }
  }

  function overrideTemplateById(templateId, explicitTargetId = null) {
    const targetInfo = getTargetShapeInfo(explicitTargetId);
    if (!targetInfo || !targetInfo.shape) {
      if (activeChart) {
        postToIsolated({
          type: 'VEST_TV_SHOW_TOAST',
          message: 'Please select a drawing on the chart first to copy its settings.'
        });
      }
      return;
    }

    try {
      const extracted = extractPropertiesFromShape(targetInfo.shape, targetInfo.drawingType, targetInfo.id);
      if (!extracted) return;

      postToIsolated({
        type: 'VEST_TV_TEMPLATE_OVERRIDDEN',
        templateId: templateId,
        updates: extracted
      });
    } catch (e) {
      log('Error overriding template from shape:', e);
    }
  }

  // -------------------------------------------------------------
  // Sidebar Drawing Tool & Magnet Persistence & Restoration
  // -------------------------------------------------------------
  let sidebarObserver = null;
  let isRestoringSidebar = false;
  let hasCompletedInitialSidebarRestore = false;

  // Map TradingView drawing tool IDs to their left-hand sidebar group slot
  // Note: On TradingView's left drawing toolbar, Arrows (Arrow Marker, Arrow, Arrow Mark Up/Down/Left/Right)
  // live inside the Brushes/Shapes group slot!
  const SIDEBAR_TOOL_GROUPS = {
    cursors: [
      'cursor', 'dot', 'arrow', 'eraser'
    ],
    trendline: [
      'LineToolTrendLine', 'LineToolRay', 'LineToolInfoLine',
      'LineToolExtended', 'LineToolTrendAngle', 'LineToolHorzLine', 'LineToolHorzRay',
      'LineToolVertLine', 'LineToolCrossLine', 'LineToolParallelChannel',
      'LineToolRegressionTrend', 'LineToolFlatBottom', 'LineToolDisjointAngle',
      'LineToolPitchfork', 'LineToolSchiffPitchfork2', 'LineToolSchiffPitchfork',
      'LineToolInsidePitchfork'
    ],
    fib: [
      'LineToolFibRetracement', 'LineToolTrendBasedFibExtension', 'LineToolFibChannel',
      'LineToolFibTimeZone', 'LineToolFibSpeedResistanceFan', 'LineToolTrendBasedFibTime',
      'LineToolFibCircles', 'LineToolFibSpiral', 'LineToolFibSpeedResistanceArcs',
      'LineToolFibWedge', 'LineToolPitchfan', 'LineToolGannBox', 'LineToolGannFixed',
      'LineToolGannComplex', 'LineToolGannFan'
    ],
    shapes: [
      'LineToolBrush', 'LineToolHighlighter',
      'LineToolArrowMarker', 'LineToolArrow', 'LineToolArrowMarkUp', 'LineToolArrowMarkDown',
      'LineToolArrowMarkLeft', 'LineToolArrowMarkRight',
      'LineToolRectangle', 'LineToolRotatedRectangle', 'LineToolPath',
      'LineToolCircle', 'LineToolEllipse', 'LineToolPolygonalLine',
      'LineToolTriangle', 'LineToolArc', 'LineToolBezierQuadro', 'LineToolBezierCubic'
    ],
    annotation: [
      'LineToolText', 'LineToolTextAbsolute', 'LineToolNote', 'LineToolNoteAbsolute',
      'LineToolSignpost', 'LineToolCallout', 'LineToolComment', 'LineToolPriceLabel',
      'LineToolPriceNote', 'LineToolFlagMark', 'LineToolTable', 'LineToolBalloon', 'LineToolImage'
    ],
    patterns: [
      'LineTool5PointsPattern', 'LineToolCypherPattern', 'LineToolABCD',
      'LineToolTrianglePattern', 'LineToolThreeDrivers', 'LineToolHeadAndShoulders',
      'LineToolElliottImpulse', 'LineToolElliottTriangle', 'LineToolElliottTripleCombo',
      'LineToolElliottCorrection', 'LineToolElliottDoubleCombo', 'LineToolCircleLines',
      'LineToolTimeCycles', 'LineToolSineLine'
    ],
    prediction: [
      'LineToolRiskRewardLong', 'LineToolRiskRewardShort', 'LineToolPrediction',
      'LineToolBarsPattern', 'LineToolGhostFeed', 'LineToolProjection',
      'LineToolDateRange', 'LineToolPriceRange', 'LineToolDateAndPriceRange',
      'LineToolVolumeProfileFixed', 'LineToolAnchoredVWAP'
    ],
    icons: [
      'LineToolIcon', 'LineToolEmoji', 'LineToolSticker'
    ]
  };

  // Build lowercase lookup map for canonical tool IDs and group keys
  const CANONICAL_TOOL_MAP = {};
  const TOOL_TO_GROUP_MAP = {};
  Object.entries(SIDEBAR_TOOL_GROUPS).forEach(([groupKey, toolList]) => {
    toolList.forEach(toolId => {
      const lower = toolId.toLowerCase();
      CANONICAL_TOOL_MAP[lower] = toolId;
      TOOL_TO_GROUP_MAP[toolId] = groupKey;
      TOOL_TO_GROUP_MAP[lower] = groupKey;
    });
  });

  // Human-readable label -> canonical TradingView tool ID map (for submenu items that use aria-label/text instead of data-name)
  const LABEL_TO_TOOL_MAP = {
    'cross': 'cursor',
    'crosshair': 'cursor',
    'dot': 'dot',
    'arrow cursor': 'arrow',
    'demonstration': 'eraser',
    'eraser': 'eraser',
    'trend line': 'LineToolTrendLine',
    'ray': 'LineToolRay',
    'info line': 'LineToolInfoLine',
    'extended line': 'LineToolExtended',
    'trend angle': 'LineToolTrendAngle',
    'horizontal line': 'LineToolHorzLine',
    'horizontal ray': 'LineToolHorzRay',
    'vertical line': 'LineToolVertLine',
    'cross line': 'LineToolCrossLine',
    'parallel channel': 'LineToolParallelChannel',
    'regression trend': 'LineToolRegressionTrend',
    'flat top/bottom': 'LineToolFlatBottom',
    'disjoint channel': 'LineToolDisjointAngle',
    'pitchfork': 'LineToolPitchfork',
    'schiff pitchfork': 'LineToolSchiffPitchfork2',
    'modified schiff pitchfork': 'LineToolSchiffPitchfork',
    'inside pitchfork': 'LineToolInsidePitchfork',
    'fib retracement': 'LineToolFibRetracement',
    'trend-based fib extension': 'LineToolTrendBasedFibExtension',
    'fib channel': 'LineToolFibChannel',
    'fib time zone': 'LineToolFibTimeZone',
    'fib speed resistance fan': 'LineToolFibSpeedResistanceFan',
    'trend-based fib time': 'LineToolTrendBasedFibTime',
    'fib circles': 'LineToolFibCircles',
    'fib spiral': 'LineToolFibSpiral',
    'fib speed resistance arcs': 'LineToolFibSpeedResistanceArcs',
    'fib wedge': 'LineToolFibWedge',
    'pitchfan': 'LineToolPitchfan',
    'gann box': 'LineToolGannBox',
    'gann square fixed': 'LineToolGannFixed',
    'gann square': 'LineToolGannComplex',
    'gann fan': 'LineToolGannFan',
    'brush': 'LineToolBrush',
    'highlighter': 'LineToolHighlighter',
    'arrow marker': 'LineToolArrowMarker',
    'arrow': 'LineToolArrow',
    'arrow mark up': 'LineToolArrowMarkUp',
    'arrow mark down': 'LineToolArrowMarkDown',
    'arrow mark left': 'LineToolArrowMarkLeft',
    'arrow mark right': 'LineToolArrowMarkRight',
    'rectangle': 'LineToolRectangle',
    'rotated rectangle': 'LineToolRotatedRectangle',
    'path': 'LineToolPath',
    'circle': 'LineToolCircle',
    'ellipse': 'LineToolEllipse',
    'polyline': 'LineToolPolygonalLine',
    'triangle': 'LineToolTriangle',
    'arc': 'LineToolArc',
    'curve': 'LineToolBezierQuadro',
    'double curve': 'LineToolBezierCubic',
    'text': 'LineToolText',
    'anchored text': 'LineToolTextAbsolute',
    'note': 'LineToolNote',
    'anchored note': 'LineToolNoteAbsolute',
    'pin': 'LineToolSignpost',
    'signpost': 'LineToolSignpost',
    'callout': 'LineToolCallout',
    'balloon': 'LineToolBalloon',
    'comment': 'LineToolComment',
    'price label': 'LineToolPriceLabel',
    'price note': 'LineToolPriceNote',
    'flag mark': 'LineToolFlagMark',
    'table': 'LineToolTable',
    'image': 'LineToolImage',
    'xabcd pattern': 'LineTool5PointsPattern',
    'cypher pattern': 'LineToolCypherPattern',
    'abcd pattern': 'LineToolABCD',
    'triangle pattern': 'LineToolTrianglePattern',
    'three drives pattern': 'LineToolThreeDrivers',
    'head and shoulders': 'LineToolHeadAndShoulders',
    'elliott impulse wave (12345)': 'LineToolElliottImpulse',
    'elliott triangle wave (abcde)': 'LineToolElliottTriangle',
    'elliott triple combo wave (wxyxz)': 'LineToolElliottTripleCombo',
    'elliott correction wave (abc)': 'LineToolElliottCorrection',
    'elliott double combo wave (wxy)': 'LineToolElliottDoubleCombo',
    'cyclic lines': 'LineToolCircleLines',
    'time cycles': 'LineToolTimeCycles',
    'sine line': 'LineToolSineLine',
    'long position': 'LineToolRiskRewardLong',
    'short position': 'LineToolRiskRewardShort',
    'forecast': 'LineToolPrediction',
    'bars pattern': 'LineToolBarsPattern',
    'ghost feed': 'LineToolGhostFeed',
    'projection': 'LineToolProjection',
    'date range': 'LineToolDateRange',
    'price range': 'LineToolPriceRange',
    'date and price range': 'LineToolDateAndPriceRange',
    'fixed range volume profile': 'LineToolVolumeProfileFixed',
    'anchored vwap': 'LineToolAnchoredVWAP'
  };

  function normalizeToolId(rawName) {
    if (!rawName || typeof rawName !== 'string') return null;
    let trimmed = rawName.trim();
    if (!trimmed) return null;

    // Strip hotkey suffixes often appended in tooltips/labels like "Trend Line (Alt + T)" or "Rectangle Alt + Shift + R"
    trimmed = trimmed
      .replace(/\s*\((?:alt|ctrl|shift|cmd|meta|opt)[^)]*\)\s*$/i, '')
      .replace(/\s+(?:alt|ctrl|shift|cmd|meta)\s*\+.*$/i, '')
      .trim();

    // Strip common TradingView DOM prefixes/suffixes on data-name attributes
    trimmed = trimmed
      .replace(/^linetool-group-/i, '')
      .replace(/^drawing-toolbar-/i, '')
      .replace(/^tool-/i, '');

    const lower = trimmed.toLowerCase();
    if (CANONICAL_TOOL_MAP[lower]) return CANONICAL_TOOL_MAP[lower];
    if (LABEL_TO_TOOL_MAP[lower]) return LABEL_TO_TOOL_MAP[lower];

    // Check if it's a short name like "Rectangle" or "Brush" where "LineTool" was omitted
    const withPrefixLower = ('linetool' + lower.replace(/[\s_-]+/g, ''));
    if (CANONICAL_TOOL_MAP[withPrefixLower]) return CANONICAL_TOOL_MAP[withPrefixLower];

    if (/^linetool/i.test(trimmed)) {
      return CANONICAL_TOOL_MAP[lower] || trimmed;
    }
    return null;
  }

  function extractToolIdFromDomElement(el) {
    if (!el || el.nodeType !== 1) return null;

    // 1. Check data-name / data-tool / data-value on element or closest ancestor (up to 7 levels)
    const attrNames = ['data-name', 'data-tool', 'data-value', 'name'];
    let curr = el;
    let depth = 0;
    while (curr && curr.nodeType === 1 && depth < 7) {
      for (const attr of attrNames) {
        const val = curr.getAttribute(attr);
        if (val) {
          const norm = normalizeToolId(val);
          if (norm) return norm;
        }
      }
      // 2. Check aria-label / data-tooltip / title
      for (const labelAttr of ['aria-label', 'data-tooltip', 'title']) {
        const rawLabel = curr.getAttribute(labelAttr);
        if (rawLabel) {
          const norm = normalizeToolId(rawLabel);
          if (norm) return norm;
        }
      }
      curr = curr.parentElement;
      depth++;
    }

    // 3. Check menu item label text if clicked inside a popup/flyout submenu
    const rowEl =
      el.closest('[data-role="menuitem"], [role="menuitem"], [role="option"], [class*="item-"], [class*="row-"], [class*="tool-"]') ||
      (el.closest('[data-name="menu-inner"], [role="menu"], [class*="menuWrap"], [class*="drawer"]') ? el.parentElement : null);

    if (rowEl) {
      // Check dedicated label/title child first so hotkey spans ("Alt + Shift + R") don't pollute textContent
      const labelCandidates = rowEl.querySelectorAll('[class*="label"], [class*="title"], span, div');
      for (const cand of labelCandidates) {
        if (cand.children.length === 0) {
          const txt = (cand.textContent || '').trim();
          if (txt && txt.length < 48) {
            const norm = normalizeToolId(txt);
            if (norm) return norm;
          }
        }
      }
      const rawText = (rowEl.textContent || '').trim();
      if (rawText && rawText.length < 52) {
        const norm = normalizeToolId(rawText);
        if (norm) return norm;
      }
    }

    // 4. Fallback: check direct leaf text of clicked element or its children
    const leafNodes = el.children.length === 0 ? [el] : Array.from(el.querySelectorAll('span, div'));
    for (const node of leafNodes) {
      if (node.children && node.children.length === 0) {
        const txt = (node.textContent || '').trim();
        if (txt && txt.length < 48) {
          const norm = normalizeToolId(txt);
          if (norm) return norm;
        }
      }
    }

    return null;
  }

  function getToolGroupKey(toolId) {
    const norm = normalizeToolId(toolId);
    if (!norm) return null;
    return TOOL_TO_GROUP_MAP[norm] || null;
  }

  function getSidebarDocuments() {
    const docs = [document];
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument) {
          docs.push(iframe.contentDocument);
        }
      } catch (e) {}
    });
    return docs;
  }

  function findSidebarElement(selectorList) {
    const docs = getSidebarDocuments();
    for (const doc of docs) {
      try {
        for (const sel of selectorList) {
          const el = doc.querySelector(sel);
          if (el) return el;
        }
      } catch (e) {}
    }
    return null;
  }

  function getMagnetButton() {
    const direct = findSidebarElement([
      'button[data-name="magnet-button"]',
      'div[data-name="magnet-button"]',
      'button[data-name="magnet"]',
      'div[data-name="magnet"]',
      '[data-role="button"][data-name="magnet"]',
      '[data-name="magnet-mode"]',
      'button[aria-label*="Magnet" i]',
      'div[aria-label*="Magnet" i]',
      'button[data-tooltip*="Magnet" i]',
      'div[data-tooltip*="Magnet" i]',
      'button[title*="Magnet" i]',
      'div[title*="Magnet" i]',
      '[class*="magnet-"]'
    ]);
    if (direct) return direct;

    const docs = getSidebarDocuments();
    for (const doc of docs) {
      try {
        const btns = doc.querySelectorAll('button, div[role="button"], div[class*="button"]');
        for (const btn of btns) {
          const aria = btn.getAttribute('aria-label') || '';
          const title = btn.getAttribute('title') || '';
          const tooltip = btn.getAttribute('data-tooltip') || '';
          if (/magnet/i.test(aria) || /magnet/i.test(title) || /magnet/i.test(tooltip)) {
            return btn;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function getRectangleButton() {
    const direct = findSidebarElement([
      'button[data-name="LineToolRectangle"]',
      'div[data-name="LineToolRectangle"]',
      '[data-role="button"][data-name="LineToolRectangle"]',
      'button[data-name="linetoolrectangle"]',
      'div[data-name="linetoolrectangle"]',
      '[data-name="rectangle"]',
      'button[aria-label*="Rectangle" i]',
      'div[aria-label*="Rectangle" i]',
      'button[data-tooltip*="Rectangle" i]',
      'div[data-tooltip*="Rectangle" i]',
      'button[title*="Rectangle" i]',
      'div[title*="Rectangle" i]'
    ]);
    if (direct) return direct;

    const docs = getSidebarDocuments();
    for (const doc of docs) {
      try {
        const btns = doc.querySelectorAll('button, div[role="button"], div[class*="button"]');
        for (const btn of btns) {
          const aria = btn.getAttribute('aria-label') || '';
          const title = btn.getAttribute('title') || '';
          const tooltip = btn.getAttribute('data-tooltip') || '';
          if (/rectangle/i.test(aria) || /rectangle/i.test(title) || /rectangle/i.test(tooltip)) {
            return btn;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function getStayInDrawingModeButton() {
    return findSidebarElement([
      'button[data-name="stay-in-drawing-mode"]',
      'div[data-name="stay-in-drawing-mode"]',
      '[data-name="keep-tool-active"]',
      'button[aria-label*="Stay in Drawing" i]',
      'div[aria-label*="Stay in Drawing" i]',
      'button[data-tooltip*="Stay in Drawing" i]',
      'div[data-tooltip*="Stay in Drawing" i]'
    ]);
  }

  function getLockDrawingsButton() {
    return findSidebarElement([
      'button[data-name="lock-all-drawings"]',
      'div[data-name="lock-all-drawings"]',
      'button[aria-label*="Lock All" i]',
      'div[aria-label*="Lock All" i]',
      'button[data-tooltip*="Lock All" i]',
      'div[data-tooltip*="Lock All" i]'
    ]);
  }

  function getHideDrawingsButton() {
    return findSidebarElement([
      'button[data-name="hide-all-drawings"]',
      'div[data-name="hide-all-drawings"]',
      '[data-name="hide-all"]',
      'button[aria-label*="Hide All" i]',
      'div[aria-label*="Hide All" i]',
      'button[data-tooltip*="Hide" i]',
      'div[data-tooltip*="Hide" i]'
    ]);
  }

  function isElementActive(el) {
    if (!el) return false;
    const ariaPressed = el.getAttribute('aria-pressed');
    if (ariaPressed === 'true') return true;
    if (ariaPressed === 'false') return false;

    const dataActive = el.getAttribute('data-active');
    if (dataActive === 'true') return true;
    if (dataActive === 'false') return false;

    const checkString = (str) => {
      if (typeof str !== 'string') return false;
      return /isactive|is-active|selected|checked|active/i.test(str);
    };

    if (checkString(el.className)) return true;

    const activeChild = el.querySelector('[class*="active"], [class*="selected"], [class*="checked"], [aria-pressed="true"], [data-active="true"]');
    if (activeChild) return true;

    return false;
  }

  // Scan the left-hand drawing toolbar DOM for all currently displayed group slot tools
  function scanDomSidebarGroupSlots() {
    const detectedGroups = {};
    let detectedActiveTool = null;

    const docs = getSidebarDocuments();
    for (const doc of docs) {
      try {
        const candidates = doc.querySelectorAll('[data-name], [aria-label], [data-tooltip], [title]');
        candidates.forEach(el => {
          // Skip items inside floating dropdown menus or settings modals
          if (el.closest('[data-name="menu-inner"], [role="menu"], [class*="menuWrap"], [class*="popup"], [class*="drawer"], #vest-studio-settings-dialog, #vest-studio-dropdown-menu')) {
            return;
          }
          // Only consider buttons on the left-hand drawing sidebar (x < 120px)
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.left > 140) {
            return;
          }

          let toolId = normalizeToolId(el.getAttribute('data-name'));
          if (!toolId) {
            toolId =
              normalizeToolId(el.getAttribute('aria-label')) ||
              normalizeToolId(el.getAttribute('data-tooltip')) ||
              normalizeToolId(el.getAttribute('title'));
          }
          if (!toolId) return;

          const groupKey = getToolGroupKey(toolId);
          if (groupKey) {
            detectedGroups[groupKey] = toolId;
          }
          if (isElementActive(el)) {
            detectedActiveTool = toolId;
          }
        });
      } catch (e) {}
    }

    return { detectedGroups, detectedActiveTool };
  }

  // Collect and restore TradingView's own drawing toolbar localStorage keys (which control group slot icons)
  function collectTvDrawingToolbarLocalStorage() {
    const entries = {};
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (
          /drawing|linetool|toolbar|favorite|magnet|chartcontrols|combobox/i.test(key) &&
          !key.startsWith('tv-chart-drawings-') &&
          !key.startsWith('vest') &&
          !key.startsWith('__trading_cortex_')
        ) {
          const val = window.localStorage.getItem(key);
          if (typeof val === 'string' && val.length < 16000) {
            entries[key] = val;
          }
        }
      }
    } catch (e) {}
    return entries;
  }

  // Reverse map from canonical tool ID to human-readable label (e.g. LineToolRectangle -> "rectangle")
  const TOOL_TO_LABEL_MAP = {};
  Object.entries(LABEL_TO_TOOL_MAP).forEach(([labelLower, canonicalId]) => {
    if (!TOOL_TO_LABEL_MAP[canonicalId]) {
      TOOL_TO_LABEL_MAP[canonicalId] = labelLower;
    }
  });

  function dispatchFullPointerClick(el) {
    if (!el) return;
    try {
      const win = el.ownerDocument ? el.ownerDocument.defaultView : window;
      const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : { left: 10, top: 10, width: 10, height: 10 };
      const clientX = Math.round(rect.left + (rect.width || 10) / 2);
      const clientY = Math.round(rect.top + (rect.height || 10) / 2);
      const opts = { bubbles: true, cancelable: true, view: win, button: 0, buttons: 1, clientX, clientY };
      if (typeof PointerEvent === 'function') {
        el.dispatchEvent(new PointerEvent('pointerdown', opts));
      }
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      if (typeof PointerEvent === 'function') {
        el.dispatchEvent(new PointerEvent('pointerup', opts));
      }
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.click();
    } catch (e) {
      try { el.click(); } catch (err) {}
    }
  }

  // Walk a DOM element's React Fiber (`__reactFiber$...` / `__reactProps$...`) or internal controller
  // to update the group slot's selected tool in-memory WITHOUT ever clicking/opening the DOM dropdown menu!
  function tryUpdateGroupSlotViaReactFiber(slotEl, targetToolId) {
    if (!slotEl || !targetToolId) return false;
    let updated = false;

    const visitedNodes = new Set();
    let currDom = slotEl;
    let domDepth = 0;

    while (currDom && domDepth < 5) {
      const ownKeys = Object.keys(currDom);
      const fiberKey = ownKeys.find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      const propsKey = ownKeys.find(k => k.startsWith('__reactProps$'));

      if (propsKey && currDom[propsKey]) {
        const p = currDom[propsKey];
        for (const fnName of ['onSelect', 'onToolSelect', 'onChange', 'setActiveTool', 'selectTool']) {
          if (typeof p[fnName] === 'function') {
            try {
              p[fnName](targetToolId);
              updated = true;
            } catch (e) {}
          }
        }
      }

      if (fiberKey && currDom[fiberKey]) {
        let fiber = currDom[fiberKey];
        let fiberDepth = 0;
        while (fiber && fiberDepth < 18 && !visitedNodes.has(fiber)) {
          visitedNodes.add(fiber);

          // 1. Check class component stateNode (TradingView ComboTool / ToolGroupWidget)
          const inst = fiber.stateNode;
          if (inst && typeof inst === 'object' && !(inst instanceof Element)) {
            // Check methods on the component instance
            for (const mName of ['_onSelectTool', '_selectTool', 'selectTool', 'setActiveTool', '_setCurrentTool', 'setCurrentTool']) {
              if (typeof inst[mName] === 'function') {
                try {
                  inst[mName](targetToolId);
                  updated = true;
                } catch (e) {}
              }
            }
            // Check if component state holds current tool name
            if (inst.state && typeof inst.state === 'object' && typeof inst.setState === 'function') {
              const statePatch = {};
              for (const [sk, sv] of Object.entries(inst.state)) {
                if (typeof sv === 'string' && /^LineTool/i.test(sv)) {
                  statePatch[sk] = targetToolId;
                } else if (sv && typeof sv === 'object' && typeof sv.name === 'string' && /^LineTool/i.test(sv.name)) {
                  // Find matching tool descriptor in props/instance
                  const list = inst.props?.tools || inst.props?.items || inst._tools || inst._items;
                  if (Array.isArray(list)) {
                    const foundDesc = list.find(item => item && (item.name === targetToolId || item.id === targetToolId || item.toolName === targetToolId));
                    if (foundDesc) statePatch[sk] = foundDesc;
                  }
                }
              }
              if (Object.keys(statePatch).length > 0) {
                try {
                  inst.setState(statePatch);
                  updated = true;
                } catch (e) {}
              }
            }
          }

          // 2. Check memoizedProps on the Fiber node
          const mp = fiber.memoizedProps;
          if (mp && typeof mp === 'object') {
            for (const fnName of ['onSelect', 'onToolSelect', 'onItemSelect', 'setActiveTool', 'selectTool']) {
              if (typeof mp[fnName] === 'function') {
                try {
                  mp[fnName](targetToolId);
                  updated = true;
                } catch (e) {}
              }
            }
            // Check if tools/items array has individual item onClick/onSelect handlers
            const itemList = mp.tools || mp.items || mp.children;
            if (Array.isArray(itemList)) {
              for (const item of itemList) {
                if (!item || typeof item !== 'object') continue;
                const itemName = item.name || item.id || item.toolName || item.props?.name || item.props?.toolName || item.props?.['data-name'];
                if (itemName && normalizeToolId(String(itemName)) === targetToolId) {
                  const fn = item.onClick || item.onSelect || item.execute || item.props?.onClick || item.props?.onSelect;
                  if (typeof fn === 'function') {
                    try {
                      fn(item);
                      updated = true;
                    } catch (e) {}
                  }
                }
              }
            }
          }

          // 3. Check hooks linked list (memoizedState) & WatchedValue objects on fiber/stateNode
          let hook = fiber.memoizedState;
          let hookGuard = 0;
          while (hook && hookGuard < 20) {
            if (hook.queue && typeof hook.queue.dispatch === 'function') {
              if (typeof hook.memoizedState === 'string' && /^LineTool/i.test(hook.memoizedState)) {
                try {
                  hook.queue.dispatch(targetToolId);
                  updated = true;
                } catch (e) {}
              } else if (hook.memoizedState && typeof hook.memoizedState === 'object' && typeof hook.memoizedState.name === 'string' && /^LineTool/i.test(hook.memoizedState.name)) {
                const list = fiber.memoizedProps?.tools || fiber.memoizedProps?.items;
                if (Array.isArray(list)) {
                  const foundDesc = list.find(item => item && (item.name === targetToolId || item.id === targetToolId || item.toolName === targetToolId));
                  if (foundDesc) {
                    try {
                      hook.queue.dispatch(foundDesc);
                      updated = true;
                    } catch (e) {}
                  }
                }
              }
            }
            // Also check if a ref/memoizedState holds a TradingView WatchedValue (`setValue` / `value`)
            const ms = hook.memoizedState?.current || hook.memoizedState;
            if (ms && typeof ms === 'object' && typeof ms.setValue === 'function' && typeof ms.value === 'function') {
              try {
                const curVal = ms.value();
                if (typeof curVal === 'string' && /^LineTool/i.test(curVal)) {
                  ms.setValue(targetToolId);
                  updated = true;
                }
              } catch (e) {}
            }
            hook = hook.next;
            hookGuard++;
          }

          fiber = fiber.return;
          fiberDepth++;
        }
      }

      currDom = currDom.parentElement;
      domDepth++;
    }

    return updated;
  }

  // Ensure a left-sidebar group slot displays `norm` as its selected tool using TradingView's API +
  // WatchedValue / React Fiber state WITHOUT opening any DOM flyout menus.
  function ensureSidebarGroupSlotDisplaysTool(norm) {
    if (!norm || norm === 'cursor' || norm === 'dot' || norm === 'arrow' || norm === 'eraser') return;

    const { detectedGroups } = scanDomSidebarGroupSlots();
    const groupKey = getToolGroupKey(norm);
    if (!groupKey || detectedGroups[groupKey] === norm) {
      return; // Already displaying the right tool in this group slot!
    }

    const currentSlotTool = detectedGroups[groupKey];
    const siblingList = SIDEBAR_TOOL_GROUPS[groupKey] || [];
    const siblingSet = new Set(siblingList.map(s => s.toLowerCase()));
    if (currentSlotTool) siblingSet.add(currentSlotTool.toLowerCase());

    const docs = getSidebarDocuments();
    let currentSlotBtn = null;

    for (const doc of docs) {
      try {
        const candidates = doc.querySelectorAll('[data-name], [aria-label], [data-tooltip], [title]');
        for (const el of candidates) {
          if (el.closest('[data-name="menu-inner"], [role="menu"], [class*="menuWrap"], [class*="popup"], [class*="drawer"], #vest-studio-settings-dialog, #vest-studio-dropdown-menu')) {
            continue;
          }
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.left > 140) continue;

          const tId =
            normalizeToolId(el.getAttribute('data-name')) ||
            normalizeToolId(el.getAttribute('aria-label')) ||
            normalizeToolId(el.getAttribute('data-tooltip')) ||
            normalizeToolId(el.getAttribute('title'));

          if (tId && siblingSet.has(tId.toLowerCase())) {
            currentSlotBtn = el;
            break;
          }
        }
        if (currentSlotBtn) break;
      } catch (e) {}
    }

    if (currentSlotBtn) {
      tryUpdateGroupSlotViaReactFiber(currentSlotBtn, norm);
    }
  }

  // Select a single drawing tool via TradingView API, internal Widget, or DOM flyout so its left-sidebar group slot updates
  function selectSingleLineTool(toolId, updateSlotViaSubmenu = true) {
    const norm = normalizeToolId(toolId);
    if (!norm) return false;

    let selected = false;

    // 1. Try activeWidget.selectLineTool (Outer Widget API)
    if (activeWidget && typeof activeWidget.selectLineTool === 'function') {
      try {
        activeWidget.selectLineTool(norm);
        selected = true;
      } catch (e) {}
    }

    // 2. Try activeChartApi.selectLineTool (Inner ChartWidgetCollection / API)
    if (activeChartApi && typeof activeChartApi.selectLineTool === 'function') {
      try {
        activeChartApi.selectLineTool(norm);
        selected = true;
      } catch (e) {}
    }

    // 3. Try activeChart.selectLineTool / executeActionById
    if (activeChart) {
      try {
        if (typeof activeChart.selectLineTool === 'function') {
          activeChart.selectLineTool(norm);
          selected = true;
        }
        if (typeof activeChart.executeActionById === 'function') {
          activeChart.executeActionById(norm);
          selected = true;
        }
      } catch (e) {}
    }

    // 4. Click direct button if already visible on the left sidebar
    const directBtn = findSidebarElement([
      `[data-name="${norm}"]`,
      `[data-name="${norm.toLowerCase()}"]`
    ]);

    if (directBtn && !directBtn.closest('[data-name="menu-inner"], [role="menu"], [class*="menuWrap"]')) {
      try {
        dispatchFullPointerClick(directBtn);
        selected = true;
      } catch (e) {}
    } else if (updateSlotViaSubmenu) {
      // Ensure the sidebar group slot icon updates to `norm` (e.g. changing Brush slot icon to Rectangle)
      ensureSidebarGroupSlotDisplaysTool(norm);
      selected = true;
    }

    return selected;
  }

  function activateRectangleDrawingTool() {
    log('Activating Rectangle drawing tool...');
    let activated = selectSingleLineTool('LineToolRectangle', true);

    if (!activated) {
      const rectBtn = getRectangleButton();
      if (rectBtn) {
        rectBtn.click();
        activated = true;
      }
    }

    if (activated && currentSettings.rememberSidebarTools !== false) {
      saveCurrentSidebarState('LineToolRectangle');
    }

    return activated;
  }

  function toggleMagnetTool(desiredState) {
    const magnetBtn = getMagnetButton();
    let currentState = false;

    if (magnetBtn) {
      currentState = isElementActive(magnetBtn);
    } else if (activeChart && typeof activeChart.magnetEnabled === 'function') {
      try { currentState = Boolean(activeChart.magnetEnabled()); } catch (e) {}
    }

    if (desiredState === undefined) {
      desiredState = !currentState;
    }

    if (magnetBtn) {
      if ((desiredState && !currentState) || (!desiredState && currentState)) {
        magnetBtn.click();
        log('Toggled magnet DOM button to:', desiredState);
      }
    } else {
      try {
        if (activeChart && typeof activeChart.executeActionById === 'function') {
          activeChart.executeActionById('magnet');
        } else if (activeChartApi && typeof activeChartApi.executeActionById === 'function') {
          activeChartApi.executeActionById('magnet');
        }
      } catch (e) {}
    }

    if (currentSettings.rememberSidebarTools !== false) {
      setTimeout(() => saveCurrentSidebarState(), 120);
    }
  }

  const sidebarHookedDocs = new WeakSet();
  let lastExplicitUserToolId = null;

  function attachSidebarListenersToAllDocs() {
    const docs = getSidebarDocuments();
    docs.forEach(doc => {
      if (!doc || sidebarHookedDocs.has(doc)) return;
      sidebarHookedDocs.add(doc);

      const handleSidebarInteraction = (e) => {
        if (isRestoringSidebar) return;
        if (currentSettings.rememberSidebarTools === false) return;

        const target = e.target;
        if (!target || target.nodeType !== 1) return;

        // Detect if user clicked a specific drawing tool button or flyout submenu item
        const clickedToolId = extractToolIdFromDomElement(target);
        if (clickedToolId) {
          lastExplicitUserToolId = clickedToolId;
        }

        // Capture after TradingView updates its DOM slot & activeLineTool state
        setTimeout(() => {
          saveCurrentSidebarState(clickedToolId);
        }, 120);
        setTimeout(() => {
          saveCurrentSidebarState(clickedToolId);
        }, 380);
      };

      try {
        doc.addEventListener('pointerdown', handleSidebarInteraction, true);
        doc.addEventListener('click', handleSidebarInteraction, true);
      } catch (e) {}
    });
  }

  function setupSidebarObserver() {
    // Ensure any newly mounted chart iframes have our pointerdown/click listeners attached
    attachSidebarListenersToAllDocs();

    if (sidebarObserver) return;

    // Subscribe to TradingView's native drawing & drawing_tool_changed events
    try {
      if (activeChartApi && typeof activeChartApi.subscribe === 'function') {
        activeChartApi.subscribe('drawing', () => {
          setTimeout(() => saveCurrentSidebarState(), 120);
        });
        activeChartApi.subscribe('drawing_tool_changed', (toolName) => {
          if (isRestoringSidebar) return;
          const norm = normalizeToolId(toolName);
          if (norm && norm !== 'cursor') {
            lastExplicitUserToolId = norm;
            setTimeout(() => saveCurrentSidebarState(norm), 80);
          }
        });
      }
    } catch (e) {}

    sidebarObserver = true;
  }

  function saveCurrentSidebarState(explicitToolId = null) {
    if (isRestoringSidebar) return;
    if (currentSettings.rememberSidebarTools === false) return;

    // Only capture from the frame that actually owns the chart or the left drawing sidebar
    const magnetBtn = getMagnetButton();
    const { detectedGroups, detectedActiveTool } = scanDomSidebarGroupSlots();
    const hasSidebarOrChart = Boolean(
      magnetBtn ||
      Object.keys(detectedGroups).length > 0 ||
      activeChartApi ||
      activeChart ||
      explicitToolId
    );
    if (!hasSidebarOrChart) return;

    const stayBtn = getStayInDrawingModeButton();
    const lockBtn = getLockDrawingsButton();
    const hideBtn = getHideDrawingsButton();

    const prev = currentSettings.sidebarState || {};

    let magnetActive = Boolean(prev.magnet);
    if (magnetBtn) {
      magnetActive = isElementActive(magnetBtn);
    } else if (activeChart && typeof activeChart.magnetEnabled === 'function') {
      try {
        magnetActive = Boolean(activeChart.magnetEnabled());
      } catch (e) {}
    }

    let stayActive = Boolean(prev.stayInDrawingMode);
    if (stayBtn) {
      stayActive = isElementActive(stayBtn);
    }

    let lockActive = Boolean(prev.lockDrawings);
    if (lockBtn) {
      lockActive = isElementActive(lockBtn);
    }

    let hideActive = Boolean(prev.hideDrawings);
    if (hideBtn) {
      hideActive = isElementActive(hideBtn);
    }

    // 2. Check TradingView API for currently selected tool
    let apiTool = null;
    if (activeChartApi && typeof activeChartApi.selectedLineTool === 'function') {
      try {
        apiTool = normalizeToolId(activeChartApi.selectedLineTool());
      } catch (e) {}
    }
    if (!apiTool && activeWidget && typeof activeWidget.selectedLineTool === 'function') {
      try {
        apiTool = normalizeToolId(activeWidget.selectedLineTool());
      } catch (e) {}
    }

    const explicitNorm = normalizeToolId(explicitToolId);
    // Avoid letting a passive chart click overwrite a remembered drawing tool with 'cursor' unless the user actually clicked the cursor tool
    let activeTool = explicitNorm || detectedActiveTool || apiTool || lastExplicitUserToolId || prev.activeTool || 'cursor';
    if (activeTool === 'cursor' && !explicitNorm && prev.activeTool && prev.activeTool !== 'cursor' && !stayActive) {
      // Keep the user's last selected drawing tool remembered as active if they didn't explicitly switch to cursor
      activeTool = detectedActiveTool || prev.activeTool;
    }

    // 3. Merge group slot selections:
    // Start with previously remembered `prev.groupTools`, then update any group slot where the user selected a tool
    // (including when the user changes a group slot back to its default tool after initial restore has completed).
    const DEFAULT_GROUP_SLOTS = {
      cursors: 'cursor',
      trendline: 'LineToolTrendLine',
      fib: 'LineToolFibRetracement',
      shapes: 'LineToolBrush',
      annotation: 'LineToolText',
      patterns: 'LineTool5PointsPattern',
      prediction: 'LineToolRiskRewardLong'
    };

    const mergedGroupTools = {
      ...(prev.groupTools || {})
    };

    Object.entries(detectedGroups).forEach(([gKey, tId]) => {
      if (!tId) return;
      // After initial sidebar restore is complete, trust the live DOM group slots directly;
      // before initial restore completes, only overwrite if it's non-default so we don't clobber saved state on boot
      if (hasCompletedInitialSidebarRestore || !mergedGroupTools[gKey] || DEFAULT_GROUP_SLOTS[gKey] !== tId) {
        mergedGroupTools[gKey] = tId;
      }
    });

    if (explicitNorm) {
      const explicitGrp = getToolGroupKey(explicitNorm);
      if (explicitGrp) {
        mergedGroupTools[explicitGrp] = explicitNorm;
      }
    }
    if (activeTool && activeTool !== 'cursor') {
      const grp = getToolGroupKey(activeTool);
      if (grp) {
        mergedGroupTools[grp] = activeTool;
      }
    }

    const toolbarStorage = {
      ...(prev.toolbarStorage || {}),
      ...collectTvDrawingToolbarLocalStorage()
    };

    const sidebarState = {
      magnet: magnetActive,
      stayInDrawingMode: stayActive,
      lockDrawings: lockActive,
      hideDrawings: hideActive,
      activeTool: activeTool,
      groupTools: mergedGroupTools,
      toolbarStorage
    };

    // Compare with previous state to avoid redundant storage writes
    const prevJson = JSON.stringify(prev);
    const nextJson = JSON.stringify(sidebarState);
    if (prevJson === nextJson) {
      return;
    }

    currentSettings.sidebarState = sidebarState;
    try {
      window.localStorage.setItem('__trading_cortex_sidebar_state__', nextJson);
      if (window.top && window.top !== window && window.top.localStorage) {
        window.top.localStorage.setItem('__trading_cortex_sidebar_state__', nextJson);
      }
    } catch (e) {}
    log('Captured current sidebar drawing state:', sidebarState);

    // Send to top window (content-isolated.js) so it persists in chrome.storage
    postToIsolated({
      type: 'VEST_TV_SIDEBAR_STATE_CHANGED',
      sidebarState: sidebarState
    });
  }

  let restoreAttempts = 0;
  function restoreSidebarSelections() {
    if (currentSettings.rememberSidebarTools === false) return;
    const targetState = currentSettings.sidebarState;
    if (!targetState) return;

    const hasSavedGroups = Boolean(targetState.groupTools && Object.keys(targetState.groupTools).length > 0);
    // If neither chrome.storage config nor localStorage mirror has loaded any state yet, wait for VEST_TV_CONFIG_UPDATE
    if (!hasReceivedConfigUpdate && !hasSavedGroups && !targetState.activeTool && !targetState.magnet) {
      return;
    }

    // Wait until the left-hand drawing toolbar DOM buttons are actually rendered in the document (up to 14 attempts)
    const magnetBtn = getMagnetButton();
    const { detectedGroups } = scanDomSidebarGroupSlots();
    const hasSidebarDom = Boolean(magnetBtn || Object.keys(detectedGroups).length > 0);

    if (!hasSidebarDom) {
      if (restoreAttempts < 14) {
        restoreAttempts++;
        setTimeout(restoreSidebarSelections, 500);
      }
      return;
    }

    isRestoringSidebar = true;

    try {
      // 0. Restore TradingView's own drawing toolbar localStorage entries if present
      if (targetState.toolbarStorage && typeof targetState.toolbarStorage === 'object') {
        try {
          Object.entries(targetState.toolbarStorage).forEach(([k, v]) => {
            if (typeof v === 'string') {
              window.localStorage.setItem(k, v);
            }
          });
        } catch (e) {}
      }

      // 1. Update each remembered drawing tool group slot via TradingView's API + React Fiber
      const groupTools = targetState.groupTools || {};
      const toolsToRestore = Object.values(groupTools)
        .map(t => normalizeToolId(t))
        .filter(Boolean);

      const finalActiveTool = normalizeToolId(targetState.activeTool) || 'cursor';

      let stepIdx = 0;
      toolsToRestore.forEach((toolId) => {
        if (toolId === finalActiveTool) return;
        setTimeout(() => {
          selectSingleLineTool(toolId, true);
        }, stepIdx * 45);
        stepIdx++;
      });

      // 2. Select the user's last active drawing tool (or cursor) right after the group slots update
      setTimeout(() => {
        if (finalActiveTool) {
          selectSingleLineTool(finalActiveTool, true);
        }
      }, stepIdx * 45 + 30);

      // 3. Restore Magnet Mode (included inside "Remember selected drawing tools")
      if (targetState.magnet !== undefined) {
        const mBtn = getMagnetButton();
        if (mBtn) {
          const currentlyOn = isElementActive(mBtn);
          if (Boolean(targetState.magnet) !== currentlyOn) {
            log('Restoring Magnet to', targetState.magnet);
            mBtn.click();
          }
        } else if (targetState.magnet && activeChart && typeof activeChart.executeActionById === 'function') {
          try { activeChart.executeActionById('magnet'); } catch (e) {}
        }
      }

      // 4. Restore Stay in Drawing Mode
      if (targetState.stayInDrawingMode !== undefined) {
        const stayBtn = getStayInDrawingModeButton();
        if (stayBtn) {
          const currentlyOn = isElementActive(stayBtn);
          if (Boolean(targetState.stayInDrawingMode) !== currentlyOn) {
            log('Restoring Stay in Drawing Mode to', targetState.stayInDrawingMode);
            stayBtn.click();
          }
        }
      }

      // 5. Restore Lock All Drawings
      if (targetState.lockDrawings !== undefined) {
        const lockBtn = getLockDrawingsButton();
        if (lockBtn) {
          const currentlyOn = isElementActive(lockBtn);
          if (Boolean(targetState.lockDrawings) !== currentlyOn) {
            log('Restoring Lock All Drawings to', targetState.lockDrawings);
            lockBtn.click();
          }
        }
      }

      // 6. Restore Hide All Drawings
      if (targetState.hideDrawings !== undefined) {
        const hideBtn = getHideDrawingsButton();
        if (hideBtn) {
          const currentlyOn = isElementActive(hideBtn);
          if (Boolean(targetState.hideDrawings) !== currentlyOn) {
            log('Restoring Hide All Drawings to', targetState.hideDrawings);
            hideBtn.click();
          }
        }
      }

      setTimeout(() => {
        isRestoringSidebar = false;
        hasCompletedInitialSidebarRestore = true;
      }, stepIdx * 45 + 220);
    } catch (err) {
      log('Error restoring sidebar selections:', err);
      isRestoringSidebar = false;
      hasCompletedInitialSidebarRestore = true;
    }
  }

  // -------------------------------------------------------------
  // Chart Settings & Viewport Position Memory
  // (Timeframe, Candle Style, Left/Right Pan, Up/Down Price Scale, Zoom)
  // -------------------------------------------------------------
  let chartSettingsObserverInitialized = false;
  let isRestoringChartSettings = false;
  let hasCompletedInitialChartSettingsRestore = false;
  let chartSettingsRestoreAttempts = 0;
  let chartSettingsCaptureDebounceTimer = null;
  const chartViewportAppliedAt = new Map();
  let chartMemoryTabId = '';
  let chartMemoryTabFocused = false;
  try {
    chartMemoryTabId = window.__TRADING_CORTEX_CHART_MEMORY_TAB_ID__ ||
      `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    window.__TRADING_CORTEX_CHART_MEMORY_TAB_ID__ = chartMemoryTabId;
  } catch (e) {
    chartMemoryTabId = `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function getActiveChartMemoryContext() {
    if (!activeChart) return null;
    let symbol = '';
    let resolution = '';
    try { symbol = typeof activeChart.symbol === 'function' ? String(activeChart.symbol() || '') : ''; } catch (e) {}
    try { resolution = typeof activeChart.resolution === 'function' ? String(activeChart.resolution() || '') : ''; } catch (e) {}
    if (!symbol || !resolution) return null;
    return {
      symbol,
      resolution,
      key: `${symbol.toUpperCase()}|${resolution.toUpperCase()}`
    };
  }

  function mergeChartMemoryState(previous, incoming) {
    const prev = previous && typeof previous === 'object' ? previous : {};
    const next = incoming && typeof incoming === 'object' ? incoming : {};
    const viewportsByChart = { ...(prev.viewportsByChart || {}) };
    Object.entries(next.viewportsByChart || {}).forEach(([key, state]) => {
      const current = viewportsByChart[key];
      if (!current || (Number(state && state.updatedAt) || 0) >= (Number(current.updatedAt) || 0)) {
        viewportsByChart[key] = state;
      }
    });
    return {
      ...prev,
      ...next,
      localStorageEntries: { ...(prev.localStorageEntries || {}), ...(next.localStorageEntries || {}) },
      viewportsBySymbol: { ...(prev.viewportsBySymbol || {}), ...(next.viewportsBySymbol || {}) },
      viewportsByChart
    };
  }

  function getSavedViewportForActiveChart(saved) {
    const context = getActiveChartMemoryContext();
    if (!saved || !context) return null;
    const chartState = saved.viewportsByChart && saved.viewportsByChart[context.key];
    if (chartState && chartState.viewport) return chartState;
    const symbolState = saved.viewportsBySymbol && saved.viewportsBySymbol[context.symbol];
    if (symbolState && String(symbolState.resolution || '').toUpperCase() === context.resolution.toUpperCase()) {
      return symbolState.viewport ? symbolState : { ...symbolState, viewport: symbolState };
    }
    if (
      saved.symbol && String(saved.symbol).toUpperCase() === context.symbol.toUpperCase() &&
      String(saved.resolution || '').toUpperCase() === context.resolution.toUpperCase() && saved.viewport
    ) {
      return { viewport: saved.viewport, resolution: context.resolution, symbol: context.symbol, updatedAt: 0 };
    }
    return null;
  }

  function applyIncomingChartViewportIfNewer() {
    if (currentSettings.rememberLastChartSettings === false || !activeChart) return;
    // The focused tab is authoritative. Background tabs follow its updates but never
    // push their own viewport back into the shared chart-memory record.
    if (chartMemoryTabFocused) return;
    const context = getActiveChartMemoryContext();
    const state = getSavedViewportForActiveChart(currentSettings.lastChartSettings || {});
    if (!context || !state || !state.viewport || state.sourceTabId === chartMemoryTabId) return;
    const updatedAt = Number(state.updatedAt) || 0;
    if (updatedAt <= (chartViewportAppliedAt.get(context.key) || 0)) return;
    chartViewportAppliedAt.set(context.key, updatedAt);
    isRestoringChartSettings = true;
    applyViewportStateToChart(state.viewport);
    setTimeout(() => { isRestoringChartSettings = false; }, 450);
  }

  function scheduleSaveCurrentChartSettings(delayMs = 280) {
    if (isRestoringChartSettings) return;
    if (currentSettings.rememberLastChartSettings === false) return;
    if (!chartMemoryTabFocused) return;
    if (chartSettingsCaptureDebounceTimer) {
      clearTimeout(chartSettingsCaptureDebounceTimer);
    }
    chartSettingsCaptureDebounceTimer = setTimeout(() => {
      chartSettingsCaptureDebounceTimer = null;
      saveCurrentChartSettings();
    }, delayMs);
  }

  function getInternalChartModel() {
    const candidates = [activeChart, activeChartApi, activeWidget];
    for (const c of candidates) {
      if (!c || typeof c !== 'object') continue;
      try {
        if (typeof c._chartWidget === 'function') {
          const cw = c._chartWidget();
          if (cw && typeof cw.model === 'function') {
            const m = cw.model();
            if (m) return m.model ? (typeof m.model === 'function' ? m.model() : m.model) : m;
          }
        }
        if (c._chartWidget && typeof c._chartWidget.model === 'function') {
          const m = c._chartWidget.model();
          if (m) return m.model ? (typeof m.model === 'function' ? m.model() : m.model) : m;
        }
        if (typeof c.model === 'function') {
          const m = c.model();
          if (m) return m.model ? (typeof m.model === 'function' ? m.model() : m.model) : m;
        }
      } catch (e) {}
    }

    // Fallback: inspect own keys on activeChart for a _chartWidget or _model reference
    if (activeChart && typeof activeChart === 'object') {
      try {
        for (const k of Object.keys(activeChart)) {
          const v = activeChart[k];
          if (v && typeof v === 'object') {
            if (typeof v.timeScale === 'function' && typeof v.mainSeries === 'function') {
              return v;
            }
            if (typeof v.model === 'function') {
              const m = v.model();
              if (m && typeof m.timeScale === 'function') return m;
            }
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function getPrimaryPriceScaleApi() {
    if (!activeChart) return null;
    try {
      if (typeof activeChart.getPanes === 'function') {
        const panes = activeChart.getPanes();
        if (Array.isArray(panes) && panes.length > 0) {
          const mainPane = panes[0];
          if (mainPane) {
            if (typeof mainPane.getMainSourcePriceScale === 'function') {
              const ps = mainPane.getMainSourcePriceScale();
              if (ps) return ps;
            }
            if (typeof mainPane.getRightPriceScales === 'function') {
              const rightScales = mainPane.getRightPriceScales();
              if (Array.isArray(rightScales) && rightScales.length > 0) return rightScales[0];
            }
            if (typeof mainPane.getLeftPriceScales === 'function') {
              const leftScales = mainPane.getLeftPriceScales();
              if (Array.isArray(leftScales) && leftScales.length > 0) return leftScales[0];
            }
          }
        }
      }
    } catch (e) {}

    try {
      if (typeof activeChart.priceScale === 'function') {
        return activeChart.priceScale('right');
      }
    } catch (e) {}
    return null;
  }

  function captureCurrentViewportState() {
    if (!activeChart) return null;
    const viewport = {};

    // 1. Horizontal visible time range (From / To UNIX timestamps)
    try {
      if (typeof activeChart.getVisibleRange === 'function') {
        const vr = activeChart.getVisibleRange();
        if (vr && typeof vr.from === 'number' && typeof vr.to === 'number' && vr.to > vr.from) {
          viewport.visibleRange = {
            from: Number(vr.from),
            to: Number(vr.to)
          };
        }
      }
    } catch (e) {}

    // 2. TimeScale barSpacing (horizontal zoom) & rightOffset (horizontal pan/scroll position)
    try {
      if (typeof activeChart.getTimeScale === 'function') {
        const ts = activeChart.getTimeScale();
        if (ts) {
          if (typeof ts.barSpacing === 'function') {
            const bs = ts.barSpacing();
            if (typeof bs === 'number' && isFinite(bs) && bs > 0) {
              viewport.barSpacing = bs;
            }
          }
          if (typeof ts.rightOffset === 'function') {
            const ro = ts.rightOffset();
            if (typeof ro === 'number' && isFinite(ro)) {
              viewport.rightOffset = ro;
            }
          }
        }
      }
    } catch (e) {}

    // Also check internal chart model timeScale for barSpacing / rightOffset if public API omitted either
    const model = getInternalChartModel();
    if (model && typeof model.timeScale === 'function') {
      try {
        const internalTs = model.timeScale();
        if (internalTs) {
          if (viewport.barSpacing === undefined && typeof internalTs.barSpacing === 'function') {
            const bs = internalTs.barSpacing();
            if (typeof bs === 'number' && isFinite(bs) && bs > 0) {
              viewport.barSpacing = bs;
            }
          }
          if (viewport.rightOffset === undefined && typeof internalTs.rightOffset === 'function') {
            const ro = internalTs.rightOffset();
            if (typeof ro === 'number' && isFinite(ro)) {
              viewport.rightOffset = ro;
            }
          }
        }
      } catch (e) {}
    }

    // 3. Vertical Price Scale (Up/Down position, vertical zoom, autoScale state)
    const psApi = getPrimaryPriceScaleApi();
    if (psApi) {
      try {
        if (typeof psApi.isAutoScale === 'function') {
          viewport.isAutoScale = Boolean(psApi.isAutoScale());
        }
        if (typeof psApi.getVisiblePriceRange === 'function') {
          const pr = psApi.getVisiblePriceRange();
          if (pr && typeof pr.from === 'number' && typeof pr.to === 'number' && isFinite(pr.from) && isFinite(pr.to)) {
            viewport.priceRange = {
              from: Number(pr.from),
              to: Number(pr.to)
            };
          }
        }
        if (typeof psApi.getMode === 'function') {
          const mode = psApi.getMode();
          if (typeof mode === 'number') {
            viewport.priceScaleMode = mode;
          }
        }
        if (typeof psApi.isInverted === 'function') {
          viewport.isInverted = Boolean(psApi.isInverted());
        }
      } catch (e) {}
    }

    // Fallback to internal model mainPriceScale if getPrimaryPriceScaleApi didn't yield priceRange
    if (model && (!viewport.priceRange || viewport.isAutoScale === undefined)) {
      try {
        const mainSeries = typeof model.mainSeries === 'function' ? model.mainSeries() : null;
        const internalPs = mainSeries && typeof mainSeries.priceScale === 'function' ? mainSeries.priceScale() : null;
        if (internalPs) {
          if (viewport.isAutoScale === undefined && typeof internalPs.isAutoScale === 'function') {
            viewport.isAutoScale = Boolean(internalPs.isAutoScale());
          }
          if (!viewport.priceRange && typeof internalPs.priceRange === 'function') {
            const prObj = internalPs.priceRange();
            if (prObj) {
              const fromVal = typeof prObj.minValue === 'function' ? prObj.minValue() : prObj.from;
              const toVal = typeof prObj.maxValue === 'function' ? prObj.maxValue() : prObj.to;
              if (typeof fromVal === 'number' && typeof toVal === 'number' && isFinite(fromVal) && isFinite(toVal)) {
                viewport.priceRange = { from: fromVal, to: toVal };
              }
            }
          }
        }
      } catch (e) {}
    }

    return Object.keys(viewport).length > 0 ? viewport : null;
  }

  function applyViewportStateToChart(viewport) {
    if (!viewport || !activeChart) return;

    const model = getInternalChartModel();
    const tsApi = typeof activeChart.getTimeScale === 'function' ? activeChart.getTimeScale() : null;
    const internalTs = model && typeof model.timeScale === 'function' ? model.timeScale() : null;

    // 1. Restore Horizontal Position & Zoom (Visible Range + Bar Spacing + Right Offset)
    const applyHorizontal = () => {
      try {
        if (
          viewport.visibleRange &&
          typeof viewport.visibleRange.from === 'number' &&
          typeof viewport.visibleRange.to === 'number' &&
          typeof activeChart.setVisibleRange === 'function'
        ) {
          Promise.resolve(
            activeChart.setVisibleRange({
              from: viewport.visibleRange.from,
              to: viewport.visibleRange.to
            })
          ).catch(() => {});
        }
      } catch (e) {}

      // Fine-tune exact barSpacing (zoom level) and rightOffset (left/right pan offset from latest bar)
      setTimeout(() => {
        try {
          if (typeof viewport.barSpacing === 'number' && viewport.barSpacing > 0) {
            if (tsApi && typeof tsApi.setBarSpacing === 'function') {
              tsApi.setBarSpacing(viewport.barSpacing);
            } else if (internalTs && typeof internalTs.setBarSpacing === 'function') {
              internalTs.setBarSpacing(viewport.barSpacing);
            }
          }
        } catch (e) {}

        try {
          if (typeof viewport.rightOffset === 'number' && isFinite(viewport.rightOffset)) {
            if (tsApi && typeof tsApi.setRightOffset === 'function') {
              tsApi.setRightOffset(viewport.rightOffset);
            } else if (internalTs && typeof internalTs.setRightOffset === 'function') {
              internalTs.setRightOffset(viewport.rightOffset);
            }
          }
        } catch (e) {}
      }, 80);
    };

    // 2. Restore Vertical Price Scale Position & Zoom (Up/Down pan & vertical zoom)
    const applyVertical = () => {
      const psApi = getPrimaryPriceScaleApi();
      if (psApi) {
        try {
          if (typeof viewport.priceScaleMode === 'number' && typeof psApi.setMode === 'function') {
            psApi.setMode(viewport.priceScaleMode);
          }
        } catch (e) {}

        try {
          if (typeof viewport.isInverted === 'boolean' && typeof psApi.setInverted === 'function') {
            psApi.setInverted(viewport.isInverted);
          }
        } catch (e) {}

        try {
          if (viewport.isAutoScale === false && viewport.priceRange) {
            if (typeof psApi.setAutoScale === 'function') {
              psApi.setAutoScale(false);
            }
            if (typeof psApi.setVisiblePriceRange === 'function') {
              psApi.setVisiblePriceRange({
                from: viewport.priceRange.from,
                to: viewport.priceRange.to
              });
            }
          } else if (viewport.isAutoScale === true && typeof psApi.setAutoScale === 'function') {
            psApi.setAutoScale(true);
          }
        } catch (e) {}
      }
    };

    applyHorizontal();
    setTimeout(applyVertical, 120);
  }

  function collectTvChartLocalStorage() {
    const entries = {};
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith('tradingview.chartproperties') ||
          key === 'tradingview.IntervalWidget.quicks' ||
          key === 'tradingview.StyleWidget.quicks'
        ) {
          const val = window.localStorage.getItem(key);
          if (typeof val === 'string') {
            entries[key] = val;
          }
        }
      }
    } catch (e) {}
    return entries;
  }

  function setupChartSettingsObserver() {
    if (chartSettingsObserverInitialized) return;

    try {
      if (activeChart) {
        if (typeof activeChart.onIntervalChanged === 'function') {
          const sub = activeChart.onIntervalChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => {
              scheduleSaveCurrentChartSettings(200);
            });
          }
        }
        if (typeof activeChart.onChartTypeChanged === 'function') {
          const sub = activeChart.onChartTypeChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => {
              scheduleSaveCurrentChartSettings(200);
            });
          }
        }
        if (typeof activeChart.onVisibleRangeChanged === 'function') {
          const sub = activeChart.onVisibleRangeChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => {
              scheduleSaveCurrentChartSettings(300);
            });
          }
        }
        if (typeof activeChart.getTimeScale === 'function') {
          const ts = activeChart.getTimeScale();
          if (ts) {
            if (typeof ts.barSpacingChanged === 'function') {
              const sub = ts.barSpacingChanged();
              if (sub && typeof sub.subscribe === 'function') {
                sub.subscribe(null, () => scheduleSaveCurrentChartSettings(300));
              }
            }
            if (typeof ts.rightOffsetChanged === 'function') {
              const sub = ts.rightOffsetChanged();
              if (sub && typeof sub.subscribe === 'function') {
                sub.subscribe(null, () => scheduleSaveCurrentChartSettings(300));
              }
            }
          }
        }
      }
    } catch (e) {}

    // Listen for canvas drag/pan (mouseup), mousewheel zoom (wheel), and toolbar/dialog clicks
    const docs = getSidebarDocuments();
    docs.forEach(doc => {
      try {
        doc.addEventListener('mouseup', () => {
          scheduleSaveCurrentChartSettings(250);
        }, true);

        doc.addEventListener('wheel', () => {
          scheduleSaveCurrentChartSettings(350);
        }, { capture: true, passive: true });

        doc.addEventListener('touchend', () => {
          scheduleSaveCurrentChartSettings(300);
        }, { capture: true, passive: true });

        doc.addEventListener('click', (e) => {
          const target = e.target;
          if (!target || typeof target.closest !== 'function') return;
          if (
            target.closest('[id*="header-toolbar"]') ||
            target.closest('[data-name*="intervals"]') ||
            target.closest('[data-name*="style"]') ||
            target.closest('[data-name="legend-settings-action"]') ||
            target.closest('[data-name="save-load-menu"]') ||
            target.closest('[data-name="submit-button"]') ||
            target.closest('[role="dialog"]')
          ) {
            scheduleSaveCurrentChartSettings(250);
          }
        }, true);
      } catch (e) {}
    });

    chartSettingsObserverInitialized = true;
  }

  function saveCurrentChartSettings(allowBlurred = false) {
    if (isRestoringChartSettings) return;
    if (currentSettings.rememberLastChartSettings === false) return;
    if (!allowBlurred && !chartMemoryTabFocused) return;

    const prev = currentSettings.lastChartSettings || {};
    let resolution = prev.resolution || null;
    let chartType = typeof prev.chartType === 'number' ? prev.chartType : null;
    let symbol = prev.symbol || null;

    if (activeChart) {
      try {
        if (typeof activeChart.resolution === 'function') {
          const r = activeChart.resolution();
          if (r) resolution = String(r);
        }
      } catch (e) {}
      try {
        if (typeof activeChart.chartType === 'function') {
          const ct = activeChart.chartType();
          if (typeof ct === 'number') chartType = ct;
        }
      } catch (e) {}
      try {
        if (typeof activeChart.symbol === 'function') {
          const sym = activeChart.symbol();
          if (sym) symbol = String(sym);
        }
      } catch (e) {}
    }

    const viewport = captureCurrentViewportState();
    const viewportsBySymbol = { ...(prev.viewportsBySymbol || {}) };
    const viewportsByChart = { ...(prev.viewportsByChart || {}) };
    const savedAt = Date.now();
    const symKey = symbol || '__default__';
    const chartKey = symbol && resolution
      ? `${String(symbol).toUpperCase()}|${String(resolution).toUpperCase()}`
      : null;
    if (viewport) {
      const chartState = {
        ...viewport,
        viewport,
        symbol,
        resolution,
        sourceTabId: chartMemoryTabId,
        updatedAt: savedAt
      };
      viewportsBySymbol[symKey] = chartState;
      if (chartKey) viewportsByChart[chartKey] = chartState;
    }

    const localEntries = collectTvChartLocalStorage();
    const mergedEntries = {
      ...(prev.localStorageEntries || {}),
      ...localEntries
    };

    const nextSettings = {
      symbol,
      resolution,
      chartType,
      viewport: viewport || prev.viewport || null,
      viewportsBySymbol,
      viewportsByChart,
      localStorageEntries: mergedEntries
    };

    const comparableViewportMap = viewportMap => Object.fromEntries(
      Object.entries(viewportMap || {}).map(([key, state]) => {
        const { updatedAt, sourceTabId, ...stableState } = state || {};
        return [key, stableState];
      })
    );

    // Compare without metadata timestamps so unchanged viewports do not create cross-tab update loops.
    const prevComparable = JSON.stringify({
      symbol: prev.symbol,
      resolution: prev.resolution,
      chartType: prev.chartType,
      viewport: prev.viewport,
      viewportsByChart: comparableViewportMap(prev.viewportsByChart),
      localStorageEntries: prev.localStorageEntries
    });
    const nextComparable = JSON.stringify({
      symbol: nextSettings.symbol,
      resolution: nextSettings.resolution,
      chartType: nextSettings.chartType,
      viewport: nextSettings.viewport,
      viewportsByChart: comparableViewportMap(nextSettings.viewportsByChart),
      localStorageEntries: nextSettings.localStorageEntries
    });

    if (prevComparable === nextComparable) {
      return;
    }

    currentSettings.lastChartSettings = nextSettings;
    try {
      window.localStorage.setItem('__trading_cortex_chart_settings__', JSON.stringify(nextSettings));
    } catch (e) {}
    log('Captured current chart settings & viewport:', {
      symbol,
      resolution,
      chartType,
      viewport: nextSettings.viewport
    });

    postToIsolated({
      type: 'VEST_TV_CHART_SETTINGS_CHANGED',
      lastChartSettings: nextSettings
    });
  }

  function restoreLastChartSettings() {
    if (currentSettings.rememberLastChartSettings === false) return;
    const saved = currentSettings.lastChartSettings;
    if (
      !saved ||
      (saved.resolution == null &&
        saved.chartType == null &&
        !saved.viewport &&
        !saved.viewportsBySymbol &&
        !saved.viewportsByChart &&
        !saved.localStorageEntries)
    ) {
      if (hasReceivedConfigUpdate) {
        hasCompletedInitialChartSettingsRestore = true;
      }
      return;
    }

    if (!activeChart) {
      if (chartSettingsRestoreAttempts < 8) {
        chartSettingsRestoreAttempts++;
        setTimeout(restoreLastChartSettings, 850);
      }
      return;
    }

    isRestoringChartSettings = true;
    hasCompletedInitialChartSettingsRestore = true;

    try {
      // 1. Restore saved TradingView chartproperties localStorage entries
      if (saved.localStorageEntries && typeof saved.localStorageEntries === 'object') {
        try {
          Object.entries(saved.localStorageEntries).forEach(([k, v]) => {
            if (typeof v === 'string') {
              window.localStorage.setItem(k, v);
              if (k === 'tradingview.chartproperties' && typeof activeChart.applyOverrides === 'function') {
                try {
                  const parsed = JSON.parse(v);
                  if (parsed && parsed.paneProperties) {
                    const flat = {};
                    Object.entries(parsed.paneProperties).forEach(([pk, pv]) => {
                      if (pv !== null && typeof pv !== 'object') {
                        flat[`paneProperties.${pk}`] = pv;
                      }
                    });
                    if (Object.keys(flat).length > 0) {
                      activeChart.applyOverrides(flat);
                    }
                  }
                } catch (e) {}
              }
            }
          });
        } catch (e) {}
      }

      // 2. Restore saved chartType (candle/bar style)
      if (typeof saved.chartType === 'number' && typeof activeChart.setChartType === 'function') {
        try {
          const currentType = typeof activeChart.chartType === 'function' ? activeChart.chartType() : null;
          if (currentType !== saved.chartType) {
            log('Restoring chartType to', saved.chartType);
            activeChart.setChartType(saved.chartType);
          }
        } catch (e) {}
      }

      // Determine target viewport for current symbol (ONLY apply a saved priceRange if it was saved for THIS exact symbol!)
      const savedChartState = getSavedViewportForActiveChart(saved);
      const targetViewport = savedChartState && savedChartState.viewport;

      // 3. Restore only the viewport saved for this exact instrument and selected interval.
      // The chart's current interval is authoritative; another tab's last interval must not change it.
      if (targetViewport) {
        const context = getActiveChartMemoryContext();
        if (context) chartViewportAppliedAt.set(context.key, Number(savedChartState.updatedAt) || 0);
        setTimeout(() => {
          log('Restoring chart viewport position & zoom for', context && context.key, targetViewport);
          applyViewportStateToChart(targetViewport);
        }, 180);
        setTimeout(() => {
          applyViewportStateToChart(targetViewport);
        }, 750);
      }
    } catch (err) {
      log('Error restoring last chart settings:', err);
    } finally {
      setTimeout(() => {
        isRestoringChartSettings = false;
      }, 1450);
    }
  }

  // -------------------------------------------------------------
  // ICT Session Indicators ("Killzones") Canvas Overlay Engine
  // -------------------------------------------------------------
  let ictSessionsCanvas = null;
  let ictSessionsRafId = null;
  let ictSessionsNeedsFullRecompute = true;
  let ictSessionsObserverInitialized = false;
  let cachedIctComputedSessions = [];
  let cachedIctBarsSignature = '';
  let cachedIctConfigSignature = '';

  function removeFailPriceLineButtons() {
    for (const side of ['long', 'short']) {
      if (failPriceLineButtons[side] && failPriceLineButtons[side].isConnected) {
        try { failPriceLineButtons[side].remove(); } catch (e) {}
      }
      failPriceLineButtons[side] = null;
    }
  }

  function syncCortexManualBuyButton(enabled, symbol, price) {
    // Manual execution controls now live in Vest's order ticket. Remove the
    // earlier chart-overlay button from pages that still have it mounted.
    try { document.querySelectorAll('#vest-ci-manual-buy-button').forEach(button => button.remove()); } catch (e) {}
  }

  function removeFailPriceLineButton(side) {
    const button = failPriceLineButtons[side];
    if (button && button.isConnected) {
      try { button.remove(); } catch (e) {}
    }
    failPriceLineButtons[side] = null;
  }

  function positionFailPriceLineButton(side, x, y, width, height, fontSize) {
    if (!ictSessionsCanvas || !ictSessionsCanvas.parentElement) return;
    const ownerDoc = ictSessionsCanvas.ownerDocument || document;
    let button = failPriceLineButtons[side];
    if (!button || !button.isConnected || button.parentElement !== ictSessionsCanvas.parentElement) {
      if (button && button.isConnected) button.remove();
      button = ownerDoc.createElement('button');
      button.type = 'button';
      button.className = `vest-fail-price-add-stop-loss vest-fail-price-add-stop-loss-${side}`;
      button.textContent = 'Add Stop Loss';
      button.title = `Set the Stop Loss to the midpoint between the market and ${side} fail price`;
      button.setAttribute('aria-label', `Add stop loss from ${side} fail price`);
      button.style.cssText = 'position:absolute;z-index:6;display:flex;align-items:center;justify-content:center;padding:0 5px;border:1px solid rgba(56,189,248,.72);border-radius:5px;background:rgba(7,22,34,.96);color:#7dd3fc;font-family:Arial,sans-serif;font-weight:700;white-space:nowrap;cursor:pointer;pointer-events:auto;box-shadow:0 1px 4px rgba(0,0,0,.55);';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const failPrice = liveFailPrices[side];
        if (!Number.isFinite(latestChartMarketPrice) || !Number.isFinite(failPrice)) return;
        try {
          window.top.postMessage({
            type: 'VEST_TV_ADD_STOP_LOSS',
            payload: { side, marketPrice: latestChartMarketPrice, failPrice }
          }, '*');
        } catch (e) {}
      });
      ictSessionsCanvas.parentElement.appendChild(button);
      failPriceLineButtons[side] = button;
    }
    button.style.left = `${Math.max(2, x)}px`;
    button.style.top = `${Math.max(1, y)}px`;
    button.style.width = `${Math.max(55, width)}px`;
    button.style.height = `${Math.max(14, height)}px`;
    button.style.fontSize = `${Math.max(8, fontSize)}px`;
  }

  const nyDateFormatter = (() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return null;
    }
  })();

  function getNyDateParts(unixSec) {
    const ms = unixSec > 1e11 ? unixSec : unixSec * 1000;
    const d = new Date(ms);
    if (!nyDateFormatter) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return {
        dateKey: `${y}-${m}-${day}`,
        minutesOfDay: d.getUTCHours() * 60 + d.getUTCMinutes()
      };
    }
    const parts = nyDateFormatter.formatToParts(d);
    let year = '1970';
    let month = '01';
    let day = '01';
    let hour = 0;
    let minute = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type === 'year') year = p.value;
      else if (p.type === 'month') month = p.value;
      else if (p.type === 'day') day = p.value;
      else if (p.type === 'hour') {
        hour = parseInt(p.value, 10);
        if (hour === 24) hour = 0;
      } else if (p.type === 'minute') {
        minute = parseInt(p.value, 10);
      }
    }
    return {
      dateKey: `${year}-${month}-${day}`,
      minutesOfDay: hour * 60 + minute
    };
  }

  function getPreviousDateKey(dateKey) {
    try {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      dt.setUTCDate(dt.getUTCDate() - 1);
      const py = dt.getUTCFullYear();
      const pm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const pd = String(dt.getUTCDate()).padStart(2, '0');
      return `${py}-${pm}-${pd}`;
    } catch (e) {
      return dateKey;
    }
  }

  function parseHhMmToMinutes(str) {
    if (!str || typeof str !== 'string') return 0;
    const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return Math.min(23, Math.max(0, parseInt(m[1], 10))) * 60 + Math.min(59, Math.max(0, parseInt(m[2], 10)));
  }

  function isIntradayChartResolution() {
    try {
      if (activeChart && typeof activeChart.resolution === 'function') {
        const res = String(activeChart.resolution() || '').trim().toUpperCase();
        if (!res) return true;
        if (res.includes('D') || res.includes('W') || res.includes('M') || res.includes('Y')) {
          return false;
        }
        const mins = parseInt(res, 10);
        if (isFinite(mins) && mins >= 240) return false;
      }
    } catch (e) {}
    return true;
  }

  let cachedTargetChartCanvas = null;

  function findMainChartPaneCanvas() {
    // If we are inside a child iframe and window.top also initialized content-main.js,
    // only yield to window.top if window.top can actually read our document (same-origin/blob) AND we do not exclusively own the chart model.
    try {
      if (window.top && window.top !== window && window.top.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__) {
        // Check if window.top can access our document without throwing a cross-origin SecurityError
        const topDoc = window.top.document;
        if (topDoc) {
          // If window.top already mounted a .vest-ict-sessions-canvas inside our document, let window.top drive it
          const existingTopCanvas = document.querySelector('.vest-ict-sessions-canvas[data-vest-owner="top"]');
          if (existingTopCanvas) {
            return null;
          }
        }
      }
    } catch (e) {
      // Cross-origin iframe: window.top CANNOT access our DOM, so this child frame MUST render the overlay canvas!
    }

    // Fast path: reuse cached target canvas if it is still connected and sized!
    if (cachedTargetChartCanvas && cachedTargetChartCanvas.isConnected) {
      const cw = cachedTargetChartCanvas.clientWidth;
      const ch = cachedTargetChartCanvas.clientHeight;
      if (cw >= 240 && ch >= 140) {
        return cachedTargetChartCanvas;
      }
    }

    const docs = [document];
    document.querySelectorAll('iframe').forEach(ifr => {
      try {
        if (ifr.contentDocument && !docs.includes(ifr.contentDocument)) {
          docs.push(ifr.contentDocument);
        }
      } catch (e) {}
    });

    let bestCanvas = null;
    let bestArea = 0;

    for (const doc of docs) {
      try {
        const canvases = doc.querySelectorAll('canvas:not(.vest-ict-sessions-canvas)');
        for (const c of canvases) {
          const rect = c.getBoundingClientRect();
          if (rect.width < 240 || rect.height < 140) continue;
          const area = rect.width * rect.height;
          if (area > bestArea + 1000) {
            bestArea = area;
            bestCanvas = c;
          }
        }
      } catch (e) {}
    }

    // If bestCanvas is inside a pane that has multiple stacked canvases (base chart canvas + top crosshair canvas),
    // always pick the first non-vest canvas in that parent container for deterministic stability.
    if (bestCanvas && bestCanvas.parentElement) {
      const siblingCanvases = bestCanvas.parentElement.querySelectorAll('canvas:not(.vest-ict-sessions-canvas)');
      if (siblingCanvases.length > 0) {
        bestCanvas = siblingCanvases[0];
      }
    }

    cachedTargetChartCanvas = bestCanvas;
    return bestCanvas;
  }

  function ensureIctSessionsOverlayCanvas(targetChartCanvas) {
    if (!targetChartCanvas || !targetChartCanvas.parentElement) return null;
    const parent = targetChartCanvas.parentElement;
    const ownerDoc = targetChartCanvas.ownerDocument || document;
    const ownerTag = (window.top === window) ? 'top' : 'frame';

    if (!ictSessionsCanvas || !ictSessionsCanvas.isConnected || ictSessionsCanvas.parentElement !== parent) {
      // Reuse an existing .vest-ict-sessions-canvas in this parent if already mounted, or clean up stale ones
      const existingInParent = parent.querySelector('.vest-ict-sessions-canvas');
      if (existingInParent) {
        ictSessionsCanvas = existingInParent;
        ictSessionsCanvas.setAttribute('data-vest-owner', ownerTag);
      } else {
        const docs = [document];
        document.querySelectorAll('iframe').forEach(ifr => {
          try {
            if (ifr.contentDocument && !docs.includes(ifr.contentDocument)) docs.push(ifr.contentDocument);
          } catch (e) {}
        });
        docs.forEach(d => {
          try {
            d.querySelectorAll('.vest-ict-sessions-canvas').forEach(el => {
              if (el !== ictSessionsCanvas) {
                try { el.remove(); } catch (e) {}
              }
            });
          } catch (e) {}
        });

        if (ictSessionsCanvas && ictSessionsCanvas.parentElement) {
          try { ictSessionsCanvas.remove(); } catch (e) {}
        }
        ictSessionsCanvas = ownerDoc.createElement('canvas');
        ictSessionsCanvas.className = 'vest-ict-sessions-canvas';
        ictSessionsCanvas.setAttribute('data-vest-owner', ownerTag);
        const parentCs = ownerDoc.defaultView ? ownerDoc.defaultView.getComputedStyle(parent) : null;
        if (parentCs && parentCs.isolation !== 'isolate') {
          parent.style.isolation = 'isolate';
        }
        parent.appendChild(ictSessionsCanvas);
      }
      ictSessionsCanvas.style.cssText =
        'position:absolute;top:0;left:0;pointer-events:none;z-index:4;mix-blend-mode:normal;user-select:none;will-change:contents;transform:translateZ(0);backface-visibility:hidden;';
    }

    const cssW = targetChartCanvas.clientWidth || Math.round(targetChartCanvas.getBoundingClientRect().width);
    const cssH = targetChartCanvas.clientHeight || Math.round(targetChartCanvas.getBoundingClientRect().height);
    const bmpW = targetChartCanvas.width || cssW;
    const bmpH = targetChartCanvas.height || cssH;

    if (ictSessionsCanvas.width !== bmpW) ictSessionsCanvas.width = bmpW;
    if (ictSessionsCanvas.height !== bmpH) ictSessionsCanvas.height = bmpH;
    const targetStyleW = `${cssW}px`;
    const targetStyleH = `${cssH}px`;
    if (ictSessionsCanvas.style.width !== targetStyleW) ictSessionsCanvas.style.width = targetStyleW;
    if (ictSessionsCanvas.style.height !== targetStyleH) ictSessionsCanvas.style.height = targetStyleH;

    return ictSessionsCanvas;
  }

  let lastIctDiagMsg = '';
  function logIctDiag(msg, extra) {
    if (msg === lastIctDiagMsg) return;
    lastIctDiagMsg = msg;
    console.log('[TradingCortex:Sessions]', msg, extra !== undefined ? extra : '');
  }

  let cachedSessionsChartModel = null;

  function isLiveChartModelInstance(model) {
    if (!model || typeof model !== 'object') return false;
    try {
      if (typeof model.isDestroyed === 'function' && model.isDestroyed()) return false;
      if (model._destroyed || model.m_destroyed) return false;
      const ms = typeof model.mainSeries === 'function' ? model.mainSeries() : model._mainSeries;
      if (ms && (typeof ms.isDestroyed === 'function' && ms.isDestroyed())) return false;
      return Boolean(typeof model.mainSeries === 'function' || model._mainSeries || typeof model.timeScale === 'function');
    } catch (e) {
      return false;
    }
  }

  function findChartModelForSessions() {
    // 0. Always check direct internal chart model from the live activeChart first so if the chart widget/model
    // was replaced on an instrument switch, we immediately switch to the live model!
    const direct = getInternalChartModel() || getChartModel();
    if (direct && isLiveChartModelInstance(direct)) {
      cachedSessionsChartModel = direct;
      return direct;
    }

    if (cachedSessionsChartModel && isLiveChartModelInstance(cachedSessionsChartModel)) {
      return cachedSessionsChartModel;
    }

    // 2. If there is any drawing shape on the chart, its internal source._model is ALWAYS the exact ChartModel!
    try {
      if (activeChart && typeof activeChart.getAllShapes === 'function') {
        const all = activeChart.getAllShapes() || [];
        for (const s of all) {
          if (!s || !s.id) continue;
          const sh = activeChart.getShapeById(s.id);
          const src = extractInternalSourceFromShape(sh, s.id);
          if (src && src._model && (typeof src._model.mainSeries === 'function' || src._model._mainSeries)) {
            cachedSessionsChartModel = src._model;
            return src._model;
          }
        }
      }
    } catch (e) {}

    // 3. Deep search activeChart, activeChartApi, activeWidget, window.tradingview_*, and iframe windows!
    const roots = [activeChart, activeChartApi, activeWidget];
    try {
      for (const k of Object.keys(window)) {
        if (k.startsWith('tradingview_') || k === 'tvWidget' || k === 'widget' || k === 'tradingViewApi') {
          roots.push(window[k]);
        }
      }
      document.querySelectorAll('iframe').forEach(ifr => {
        try {
          if (ifr.contentWindow) {
            for (const k of Object.keys(ifr.contentWindow)) {
              if (k.startsWith('tradingview_') || k === 'tvWidget' || k === 'widget' || k === 'tradingViewApi') {
                roots.push(ifr.contentWindow[k]);
              }
            }
          }
        } catch (e) {}
      });
    } catch (e) {}

    // Also inspect React Fiber / DOM props on the chart container elements (in both document and iframes)
    try {
      const docs = [document];
      document.querySelectorAll('iframe').forEach(ifr => {
        try { if (ifr.contentDocument) docs.push(ifr.contentDocument); } catch (e) {}
      });
      docs.forEach(d => {
        const els = d.querySelectorAll('[class*="chart-markup-table"], [class*="chart-gui-wrapper"], [class*="chart-container"]');
        els.forEach(el => {
          for (const k of Object.keys(el)) {
            if (k.startsWith('__react') || k.startsWith('_')) {
              roots.push(el[k]);
            }
          }
        });
      });
    } catch (e) {}

    const visited = new Set();
    const queue = [];
    roots.forEach(r => {
      if (r && typeof r === 'object') queue.push({ obj: r, depth: 0 });
    });

    const isChartModelLike = (o) => {
      if (!o || typeof o !== 'object') return false;
      try {
        if (typeof o.mainSeries === 'function' || o._mainSeries) return true;
        if (typeof o.timeScale === 'function' && (typeof o.panes === 'function' || Array.isArray(o._panes))) return true;
      } catch (e) {}
      return false;
    };

    while (queue.length > 0) {
      const { obj, depth } = queue.shift();
      if (!obj || typeof obj !== 'object' || visited.has(obj) || depth > 5) continue;
      visited.add(obj);

      try {
        if (isChartModelLike(obj)) {
          cachedSessionsChartModel = obj;
          return obj;
        }
        if (typeof obj.model === 'function') {
          try {
            const m = obj.model();
            if (m && typeof m === 'object') {
              if (isChartModelLike(m)) {
                cachedSessionsChartModel = m;
                return m;
              }
              if (typeof m.model === 'function') {
                const mm = m.model();
                if (isChartModelLike(mm)) {
                  cachedSessionsChartModel = mm;
                  return mm;
                }
              }
              queue.push({ obj: m, depth: depth + 1 });
            }
          } catch (e) {}
        }
        if (typeof obj._chartWidget === 'function') {
          try {
            const cw = obj._chartWidget();
            if (cw) queue.push({ obj: cw, depth: depth + 1 });
          } catch (e) {}
        }
        if (typeof obj.activeChart === 'function' && depth <= 1) {
          try {
            const ac = obj.activeChart();
            if (ac) queue.push({ obj: ac, depth: depth + 1 });
          } catch (e) {}
        }
        if (typeof obj.chartWidget === 'function') {
          try {
            const cw = obj.chartWidget();
            if (cw) queue.push({ obj: cw, depth: depth + 1 });
          } catch (e) {}
        }

        const keys = [
          ...Object.keys(obj),
          ...Object.getOwnPropertyNames(obj),
          ...(typeof Object.getOwnPropertySymbols === 'function' ? Object.getOwnPropertySymbols(obj) : [])
        ];
        for (const k of keys) {
          const kStr = String(k);
          if (kStr === 'parent' || kStr === 'window' || kStr === 'document' || kStr === 'ownerDocument' || kStr.startsWith('__vest')) continue;
          try {
            const val = obj[k];
            if (val && typeof val === 'object') {
              if (isChartModelLike(val)) {
                cachedSessionsChartModel = val;
                return val;
              }
              if (depth < 4) {
                queue.push({ obj: val, depth: depth + 1 });
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    return direct || null;
  }

  function findMainSeriesFromModel(model) {
    if (!model) return null;
    try {
      if (typeof model.mainSeries === 'function') {
        const ms = model.mainSeries();
        if (ms) return ms;
      }
      if (model._mainSeries) return model._mainSeries;

      // Scan panes()[0].mainDataSource() or dataSources()
      const panes = typeof model.panes === 'function' ? model.panes() : model._panes;
      if (Array.isArray(panes) && panes.length > 0) {
        const p0 = panes[0];
        if (p0) {
          if (typeof p0.mainDataSource === 'function') {
            const mds = p0.mainDataSource();
            if (mds) return mds;
          }
          const dss = typeof p0.dataSources === 'function' ? p0.dataSources() : p0._dataSources;
          if (Array.isArray(dss)) {
            for (const ds of dss) {
              if (ds && (typeof ds.bars === 'function' || ds._bars || ds._data)) return ds;
            }
          }
        }
      }

      // Scan own keys on model for an object with .bars() or .priceScale() + .symbol()
      for (const k of Object.getOwnPropertyNames(model)) {
        try {
          const v = model[k];
          if (v && typeof v === 'object' && (typeof v.bars === 'function' || v._bars)) {
            return v;
          }
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  let cachedExtractedBarsObj = null;
  let cachedQuickPlotSig = '';
  let lastExtractedSeriesSymbol = '';

  function getSeriesSymbolIdentifier(mainSeries, model) {
    try {
      if (mainSeries) {
        if (typeof mainSeries.symbol === 'function') {
          const s = mainSeries.symbol();
          if (s && typeof s === 'string') return s.trim();
        }
        if (typeof mainSeries.symbolInfo === 'function') {
          const si = mainSeries.symbolInfo();
          if (si && (si.name || si.ticker || si.full_name)) {
            return String(si.name || si.ticker || si.full_name).trim();
          }
        }
        if (mainSeries._symbol) return String(mainSeries._symbol).trim();
      }
      if (activeChart && typeof activeChart.symbol === 'function') {
        const s = activeChart.symbol();
        if (s && typeof s === 'string') return s.trim();
      }
    } catch (e) {}
    return lastTrackedInstrument || '';
  }

  function extractSeriesBarsFromModel(forceFullExtract = false) {
    const model = findChartModelForSessions();
    if (!model) return null;

    const mainSeries = findMainSeriesFromModel(model);
    if (!mainSeries) return null;

    const timeScale = typeof model.timeScale === 'function' ? model.timeScale() : model._timeScale;
    const seriesSym = getSeriesSymbolIdentifier(mainSeries, model);
    if (seriesSym && lastExtractedSeriesSymbol && seriesSym !== lastExtractedSeriesSymbol) {
      lastExtractedSeriesSymbol = seriesSym;
      forceFullExtract = true;
      cachedExtractedBarsObj = null;
      cachedQuickPlotSig = '';
      cachedIctBarsSignature = '';
      cachedAutoFvgSignature = '';
    } else if (seriesSym) {
      lastExtractedSeriesSymbol = seriesSym;
    }

    let plotList = null;
    try {
      if (typeof mainSeries.bars === 'function') {
        plotList = mainSeries.bars();
      } else if (typeof mainSeries.data === 'function' && mainSeries.data() && typeof mainSeries.data().bars === 'function') {
        plotList = mainSeries.data().bars();
      } else if (mainSeries._data && typeof mainSeries._data.bars === 'function') {
        plotList = mainSeries._data.bars();
      } else if (mainSeries._bars) {
        plotList = mainSeries._bars;
      } else {
        for (const k of Object.getOwnPropertyNames(mainSeries)) {
          try {
            const candidate = mainSeries[k];
            if (candidate && typeof candidate === 'object') {
              if (typeof candidate.firstIndex === 'function' || typeof candidate.lastIndex === 'function' || Array.isArray(candidate._items)) {
                plotList = candidate;
                break;
              }
              if (typeof candidate.bars === 'function') {
                const b = candidate.bars();
                if (b && typeof b === 'object') {
                  plotList = b;
                  break;
                }
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    if (!plotList) return null;

    // Fast path during pan/zoom: check if symbol, firstIndex, lastIndex, first bar, and the last 2 bars are identical to our cached extraction!
    if (!forceFullExtract && !ictSessionsNeedsFullRecompute && cachedExtractedBarsObj && cachedExtractedBarsObj.bars.length > 0) {
      try {
        if (typeof plotList.firstIndex === 'function' && typeof plotList.lastIndex === 'function' && typeof plotList.valueAt === 'function') {
          const fIdx = plotList.firstIndex();
          const lIdx = plotList.lastIndex();
          const fVal = typeof fIdx === 'number' ? plotList.valueAt(fIdx) : null;
          const lVal = typeof lIdx === 'number' ? plotList.valueAt(lIdx) : null;
          const pVal = typeof lIdx === 'number' ? plotList.valueAt(lIdx - 1) : null;
          const quickSig = `${seriesSym}_${fIdx}_${lIdx}_${fVal ? JSON.stringify(fVal) : ''}_${lVal ? JSON.stringify(lVal) : ''}_${pVal ? JSON.stringify(pVal) : ''}`;
          if (quickSig === cachedQuickPlotSig) {
            cachedExtractedBarsObj.model = model;
            cachedExtractedBarsObj.mainSeries = mainSeries;
            cachedExtractedBarsObj.timeScale = timeScale;
            return cachedExtractedBarsObj;
          }
          cachedQuickPlotSig = quickSig;
        } else if (Array.isArray(plotList._items) && plotList._items.length > 0) {
          const len = plotList._items.length;
          const fItem = plotList._items[0];
          const lItem = plotList._items[len - 1];
          const pItem = len > 1 ? plotList._items[len - 2] : lItem;
          const quickSig = `${seriesSym}_${len}_${JSON.stringify(fItem)}_${JSON.stringify(lItem)}_${JSON.stringify(pItem)}`;
          if (quickSig === cachedQuickPlotSig) {
            cachedExtractedBarsObj.model = model;
            cachedExtractedBarsObj.mainSeries = mainSeries;
            cachedExtractedBarsObj.timeScale = timeScale;
            return cachedExtractedBarsObj;
          }
          cachedQuickPlotSig = quickSig;
        }
      } catch (e) {}
    }

    const rawItems = [];
    try {
      if (typeof plotList.firstIndex === 'function' && typeof plotList.lastIndex === 'function' && typeof plotList.valueAt === 'function') {
        const firstIdx = plotList.firstIndex();
        const lastIdx = plotList.lastIndex();
        if (typeof firstIdx === 'number' && typeof lastIdx === 'number' && lastIdx >= firstIdx) {
          const startIdx = Math.max(firstIdx, lastIdx - 4500);
          for (let idx = startIdx; idx <= lastIdx; idx++) {
            const val = plotList.valueAt(idx);
            if (val) rawItems.push({ index: idx, value: val });
          }
        }
      }
      if (rawItems.length === 0 && typeof plotList.each === 'function') {
        plotList.each((index, value) => {
          rawItems.push({ index, value });
          return false;
        });
      }
      if (rawItems.length === 0 && Array.isArray(plotList._items) && plotList._items.length > 0) {
        for (let i = 0; i < plotList._items.length; i++) {
          rawItems.push(plotList._items[i]);
        }
      }
      if (rawItems.length === 0 && typeof plotList.items === 'function') {
        const items = plotList.items();
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) rawItems.push(items[i]);
        }
      }
      if (rawItems.length === 0) {
        for (const pk of Object.getOwnPropertyNames(plotList)) {
          try {
            const arr = plotList[pk];
            if (Array.isArray(arr) && arr.length > 0) {
              for (let i = 0; i < arr.length; i++) rawItems.push(arr[i]);
              if (rawItems.length > 0) break;
            } else if (arr && typeof arr === 'object') {
              for (const sk of Object.getOwnPropertyNames(arr)) {
                const subArr = arr[sk];
                if (Array.isArray(subArr) && subArr.length > 0) {
                  for (let i = 0; i < subArr.length; i++) rawItems.push(subArr[i]);
                  if (rawItems.length > 0) break;
                }
              }
              if (rawItems.length > 0) break;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    if (rawItems.length === 0) return null;

    // Also locate timeScale's internal _points / m_points array (which maps barIndex -> unixSeconds in TradingView)
    let tsPointsArray = null;
    if (timeScale) {
      try {
        for (const tk of Object.getOwnPropertyNames(timeScale)) {
          const tv = timeScale[tk];
          if (tv && typeof tv === 'object') {
            if (typeof tv.indexToTimePoint === 'function') {
              timeScale.__vestTimePointsObj = tv;
            }
            for (const sk of Object.getOwnPropertyNames(tv)) {
              const sv = tv[sk];
              if (Array.isArray(sv) && sv.length > 0 && typeof sv[sv.length - 1] === 'number' && sv[sv.length - 1] > 1e8) {
                tsPointsArray = sv;
                break;
              }
            }
          }
          if (Array.isArray(tv) && tv.length > 0 && typeof tv[tv.length - 1] === 'number' && tv[tv.length - 1] > 1e8) {
            tsPointsArray = tv;
          }
        }
      } catch (e) {}
    }

    const normalizedBars = [];
    const sliceStart = Math.max(0, rawItems.length - 4500);

    for (let i = sliceStart; i < rawItems.length; i++) {
      const item = rawItems[i];
      if (!item) continue;

      let barIndex = typeof item.index === 'number'
        ? item.index
        : (typeof item.timePointIndex === 'number' ? item.timePointIndex : i);
      const v = item.value !== undefined ? item.value : item;

      let timeSec = null;
      let open = null;
      let high = null;
      let low = null;
      let close = null;

      if (Array.isArray(v)) {
        const v0 = Number(v[0]);
        if (v0 > 1e8) {
          timeSec = v0 > 1e11 ? Math.floor(v0 / 1000) : v0;
        } else if (typeof item.index !== 'number' && Number.isInteger(v0) && v0 >= 0 && v0 < 1e7) {
          // In some TradingView PlotList versions, v[0] is the timePointIndex!
          barIndex = v0;
        }
        open = Number(v[1]);
        high = Number(v[2]);
        low = Number(v[3]);
        close = Number(v[4]);
      } else if (v && typeof v === 'object') {
        const rawT = v.time ?? v.timestamp ?? v.t ?? v.timePoint ?? v[0];
        if (typeof rawT === 'number' && rawT > 1e8) {
          timeSec = rawT > 1e11 ? Math.floor(rawT / 1000) : rawT;
        }
        open = Number(v.open ?? v.o ?? v[1]);
        high = Number(v.high ?? v.h ?? v[2]);
        low = Number(v.low ?? v.l ?? v[3]);
        close = Number(v.close ?? v.c ?? v[4]);
      }

      // Guard against any non-standard ordering by taking the true geometric envelope of O/H/L/C
      if (isFinite(open) && isFinite(high) && isFinite(low) && isFinite(close)) {
        const trueHigh = Math.max(open, high, low, close);
        const trueLow = Math.min(open, high, low, close);
        high = trueHigh;
        low = trueLow;
      }

      if (!timeSec && typeof item.time === 'number' && item.time > 1e8) {
        timeSec = item.time > 1e11 ? Math.floor(item.time / 1000) : item.time;
      }
      if (!timeSec && typeof item.timePoint === 'number' && item.timePoint > 1e8) {
        timeSec = item.timePoint > 1e11 ? Math.floor(item.timePoint / 1000) : item.timePoint;
      }

      // Always prefer timeScale.indexToTimePoint(barIndex) or tsPointsArray[barIndex] when timeSec wasn't embedded in v[0]
      if (!timeSec && timeScale && typeof barIndex === 'number') {
        try {
          if (typeof timeScale.indexToTimePoint === 'function') {
            const tp = timeScale.indexToTimePoint(barIndex);
            if (typeof tp === 'number' && tp > 1e8) {
              timeSec = tp > 1e11 ? Math.floor(tp / 1000) : tp;
            }
          }
          if (!timeSec && timeScale.__vestTimePointsObj && typeof timeScale.__vestTimePointsObj.indexToTimePoint === 'function') {
            const tp = timeScale.__vestTimePointsObj.indexToTimePoint(barIndex);
            if (typeof tp === 'number' && tp > 1e8) {
              timeSec = tp > 1e11 ? Math.floor(tp / 1000) : tp;
            }
          }
          if (!timeSec && typeof timeScale.indexToUserTime === 'function') {
            const ut = timeScale.indexToUserTime(barIndex);
            if (ut) {
              const ms = ut instanceof Date ? ut.getTime() : Number(ut);
              if (ms > 1e8) timeSec = ms > 1e11 ? Math.floor(ms / 1000) : ms;
            }
          }
          if (!timeSec && typeof timeScale.timePointFromIndex === 'function') {
            const tp = timeScale.timePointFromIndex(barIndex);
            if (typeof tp === 'number' && tp > 1e8) {
              timeSec = tp > 1e11 ? Math.floor(tp / 1000) : tp;
            }
          }
          if (!timeSec && tsPointsArray && tsPointsArray[barIndex] > 1e8) {
            const tp = tsPointsArray[barIndex];
            timeSec = tp > 1e11 ? Math.floor(tp / 1000) : tp;
          }
        } catch (e) {}
      }

      if (
        isFinite(high) &&
        isFinite(low) &&
        high >= low &&
        isFinite(open) &&
        isFinite(close)
      ) {
        const effectiveTimeSec = (typeof timeSec === 'number' && isFinite(timeSec) && timeSec > 1e8)
          ? timeSec
          : (typeof barIndex === 'number' && isFinite(barIndex) ? barIndex : i);
        normalizedBars.push({
          barIndex,
          timeSec: effectiveTimeSec,
          hasRealTimeSec: Boolean(typeof timeSec === 'number' && isFinite(timeSec) && timeSec > 1e8),
          open,
          high,
          low,
          close
        });
      }
    }

    cachedExtractedBarsObj = {
      model,
      mainSeries,
      timeScale,
      bars: normalizedBars
    };
    return cachedExtractedBarsObj;
  }

  function computeIctSessionsFromBars(bars, config) {
    if (!bars || bars.length === 0 || !config || !config.enabled || !Array.isArray(config.sessions)) {
      return [];
    }

    const enabledDefs = config.sessions
      .filter(s => s && s.enabled)
      .map(s => {
        const rawStart = s.startTime || s.start || '09:30';
        const rawEnd = s.endTime || s.end || '11:00';
        const sMins = parseHhMmToMinutes(rawStart);
        const eMins = parseHhMmToMinutes(rawEnd);
        return {
          ...s,
          startMins: sMins,
          endMins: eMins,
          isOvernight: sMins > eMins
        };
      });

    if (enabledDefs.length === 0) return [];

    // Pre-compute NY dateKey & minutesOfDay for each bar (ICT sessions always use New York time EST/EDT)
    const annotated = new Array(bars.length);
    const uniqueDateKeys = [];
    let lastSeenDate = null;

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const ny = getNyDateParts(b.timeSec);
      annotated[i] = {
        ...b,
        barIdxInArray: i,
        dateKey: ny.dateKey,
        minutesOfDay: ny.minutesOfDay
      };
      if (ny.dateKey !== lastSeenDate) {
        if (!uniqueDateKeys.includes(ny.dateKey)) {
          uniqueDateKeys.push(ny.dateKey);
        }
        lastSeenDate = ny.dateKey;
      }
    }

    const maxDaysBack = Math.max(1, Math.min(30, Number(config.maxDaysBack) || 7));
    const permDaysBack = config.showPermanentDottedHighLow !== false ? Math.max(maxDaysBack, Number(config.permanentLinesDays) || 7) : maxDaysBack;
    const boxAllowedDates = new Set(uniqueDateKeys.slice(-maxDaysBack));
    const permAllowedDates = new Set(uniqueDateKeys.slice(-permDaysBack));

    // Also compute 7-calendar-day cutoff from the latest bar's timestamp so lines never disappear unless > 7 days old
    const latestBarOverall = annotated[annotated.length - 1];
    const sevenDaysCutoffSec = latestBarOverall ? (latestBarOverall.timeSec - 7 * 86400) : 0;

    // Group bars into session instances keyed by `${sessionDef.id}__${sessionAnchorDateKey}`
    const sessionInstancesMap = new Map();

    for (let i = 0; i < annotated.length; i++) {
      const b = annotated[i];
      const mins = b.minutesOfDay;

      for (let sIdx = 0; sIdx < enabledDefs.length; sIdx++) {
        const def = enabledDefs[sIdx];
        let inWindow = false;
        let anchorDate = b.dateKey;

        if (!def.isOvernight) {
          if (mins >= def.startMins && mins < def.endMins) {
            inWindow = true;
            anchorDate = b.dateKey;
          }
        } else {
          if (mins >= def.startMins) {
            inWindow = true;
            anchorDate = b.dateKey;
          } else if (mins < def.endMins) {
            inWindow = true;
            anchorDate = getPreviousDateKey(b.dateKey);
          }
        }

        const withinSevenDays = b.timeSec >= sevenDaysCutoffSec || permAllowedDates.has(anchorDate);
        if (!inWindow || !withinSevenDays) continue;

        const instanceKey = `${def.id}__${anchorDate}`;
        let inst = sessionInstancesMap.get(instanceKey);
        if (!inst) {
          inst = {
            key: instanceKey,
            def,
            anchorDate,
            withinBoxLookback: boxAllowedDates.has(anchorDate),
            withinSevenDays: b.timeSec >= sevenDaysCutoffSec || permAllowedDates.has(anchorDate),
            firstArrayIdx: i,
            lastArrayIdx: i,
            startBarIndex: b.barIndex,
            endBarIndex: b.barIndex,
            startTimeSec: b.timeSec,
            endTimeSec: b.timeSec,
            high: b.high,
            low: b.low,
            highBarIndex: b.barIndex,
            lowBarIndex: b.barIndex,
            highTimeSec: b.timeSec,
            lowTimeSec: b.timeSec
          };
          sessionInstancesMap.set(instanceKey, inst);
        } else {
          inst.lastArrayIdx = i;
          inst.endBarIndex = b.barIndex;
          inst.endTimeSec = b.timeSec;
          if (b.high > inst.high) {
            inst.high = b.high;
            inst.highBarIndex = b.barIndex;
            inst.highTimeSec = b.timeSec;
          }
          if (b.low < inst.low) {
            inst.low = b.low;
            inst.lowBarIndex = b.barIndex;
            inst.lowTimeSec = b.timeSec;
          }
        }
      }
    }

    // For each session instance, scan bars AFTER the session ends to find the exact bar that sweeps/mitigates High, Low, or Mid
    const latestBar = annotated[annotated.length - 1];
    const results = [];

    sessionInstancesMap.forEach((inst) => {
      let highSweptBarIndex = null;
      let highSweptTimeSec = null;
      let lowSweptBarIndex = null;
      let lowSweptTimeSec = null;
      let highCloseThroughBarIndex = null;
      let highCloseThroughTimeSec = null;
      let lowCloseThroughBarIndex = null;
      let lowCloseThroughTimeSec = null;
      let midSweptBarIndex = null;
      let midSweptTimeSec = null;

      const midPrice = (inst.high + inst.low) / 2;
      const isStillInSession = inst.lastArrayIdx === annotated.length - 1;

      if (!isStillInSession) {
        for (let j = inst.lastArrayIdx + 1; j < annotated.length; j++) {
          const postBar = annotated[j];
          if (highSweptBarIndex === null && postBar.high > inst.high) {
            highSweptBarIndex = postBar.barIndex;
            highSweptTimeSec = postBar.timeSec;
          }
          if (lowSweptBarIndex === null && postBar.low < inst.low) {
            lowSweptBarIndex = postBar.barIndex;
            lowSweptTimeSec = postBar.timeSec;
          }
          // Only completed candles qualify for the close-through endpoint; the last bar is live.
          if (j < annotated.length - 1) {
            if (highCloseThroughBarIndex === null && postBar.close > inst.high) {
              highCloseThroughBarIndex = postBar.barIndex;
              highCloseThroughTimeSec = postBar.timeSec;
            }
            if (lowCloseThroughBarIndex === null && postBar.close < inst.low) {
              lowCloseThroughBarIndex = postBar.barIndex;
              lowCloseThroughTimeSec = postBar.timeSec;
            }
          }
          if (midSweptBarIndex === null && postBar.low <= midPrice && postBar.high >= midPrice) {
            midSweptBarIndex = postBar.barIndex;
            midSweptTimeSec = postBar.timeSec;
          }
          // Continue through all post-session bars. A sweep and midpoint touch can happen
          // well before the first completed close-through, which is what ends the line in
          // close mode and determines whether its right-side label should be removed.
        }
      }

      results.push({
        ...inst,
        mid: midPrice,
        isStillInSession,
        highSweptBarIndex,
        highSweptTimeSec,
        lowSweptBarIndex,
        lowSweptTimeSec,
        highCloseThroughBarIndex,
        highCloseThroughTimeSec,
        lowCloseThroughBarIndex,
        lowCloseThroughTimeSec,
        midSweptBarIndex,
        midSweptTimeSec,
        latestBarIndex: latestBar.barIndex,
        latestTimeSec: latestBar.timeSec
      });
    });

    return results;
  }

  // -------------------------------------------------------------
  // Auto FVG (Fair Value Gap) Detection, Template Matching & Rendering
  // + Persistent Created-FVG Log (Prevents Doubling Up on Refresh)
  // -------------------------------------------------------------
  let cachedComputedAutoFvgs = [];
  let cachedAutoFvgSignature = '';
  const nativeAutoFvgShapesMap = new Map(); // fvgKey -> { entityId, lastEndTimeSec, top, bottom }
  const CREATED_FVGS_LOG_STORAGE_KEY = '__trading_cortex_created_fvgs_log__';
  const DISMISSED_FVGS_STORAGE_KEY = '__trading_cortex_dismissed_fvgs__';
  let createdFvgsLogCache = null;

  function readDismissedFvgs() {
    const merged = {};
    const storages = [];
    try { storages.push(window.localStorage); } catch (e) {}
    try {
      if (window.top && window.top !== window && window.top.localStorage) storages.push(window.top.localStorage);
    } catch (e) {}
    for (const storage of storages) {
      try {
        const parsed = JSON.parse(storage.getItem(DISMISSED_FVGS_STORAGE_KEY) || '{}');
        if (parsed && typeof parsed === 'object') Object.assign(merged, parsed);
      } catch (e) {}
    }
    return merged;
  }

  function saveDismissedFvgs(dismissed) {
    const serialized = JSON.stringify(dismissed || {});
    try { window.localStorage.setItem(DISMISSED_FVGS_STORAGE_KEY, serialized); } catch (e) {}
    try {
      if (window.top && window.top !== window && window.top.localStorage) {
        window.top.localStorage.setItem(DISMISSED_FVGS_STORAGE_KEY, serialized);
      }
    } catch (e) {}
  }

  function dismissCreatedFvg(fvgKey) {
    if (!fvgKey) return;
    const dismissed = readDismissedFvgs();
    dismissed[fvgKey] = Date.now();
    const logMap = loadCreatedFvgsLog();
    const savedEntry = logMap[fvgKey];
    if (savedEntry && savedEntry.legacyKey) dismissed[savedEntry.legacyKey] = dismissed[fvgKey];
    const dismissalKeys = Object.keys(dismissed);
    if (dismissalKeys.length > 2500) {
      dismissalKeys
        .sort((a, b) => (Number(dismissed[a]) || 0) - (Number(dismissed[b]) || 0))
        .slice(0, dismissalKeys.length - 2000)
        .forEach(key => delete dismissed[key]);
    }
    saveDismissedFvgs(dismissed);
    delete logMap[fvgKey];
    saveCreatedFvgsLog(logMap);
  }

  function isCreatedFvgDismissed(fvg) {
    if (!fvg) return false;
    const dismissed = readDismissedFvgs();
    return Boolean(dismissed[fvg.key] || (fvg.legacyKey && dismissed[fvg.legacyKey]));
  }

  function getCurrentChartSymbolKey() {
    try {
      if (activeChart && typeof activeChart.symbol === 'function') {
        const s = activeChart.symbol();
        if (s && typeof s === 'string' && s.trim()) return s.trim().toUpperCase();
      }
      if (activeChart && typeof activeChart.symbolExt === 'function') {
        const ext = activeChart.symbolExt();
        if (ext && ext.symbol && String(ext.symbol).trim()) return String(ext.symbol).trim().toUpperCase();
      }
      const model = cachedSessionsChartModel || getInternalChartModel();
      const ms = model ? findMainSeriesFromModel(model) : null;
      const msSym = getSeriesSymbolIdentifier(ms, model);
      if (msSym) return String(msSym).trim().toUpperCase();
    } catch (e) {}
    return String(lastTrackedInstrument || 'DEFAULT').trim().toUpperCase();
  }

  function loadCreatedFvgsLog() {
    const merged = { ...(createdFvgsLogCache || {}) };
    try {
      const rawLocal = window.localStorage.getItem(CREATED_FVGS_LOG_STORAGE_KEY);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        mergeCreatedFvgsLogs(merged, parsed);
      }
    } catch (e) {}
    try {
      if (window.top && window.top !== window && window.top.localStorage) {
        const rawTop = window.top.localStorage.getItem(CREATED_FVGS_LOG_STORAGE_KEY);
        if (rawTop) {
          const parsedTop = JSON.parse(rawTop);
          mergeCreatedFvgsLogs(merged, parsedTop);
        }
      }
    } catch (e) {}
    createdFvgsLogCache = merged;
    return createdFvgsLogCache;
  }

  function mergeCreatedFvgsLogs(target, source) {
    if (!source || typeof source !== 'object') return target;
    Object.entries(source).forEach(([key, incoming]) => {
      if (!incoming || typeof incoming !== 'object') return;
      const existing = target[key];
      if (!existing || (Number(incoming.updatedAt) || 0) >= (Number(existing.updatedAt) || 0)) {
        target[key] = incoming;
      }
    });
    return target;
  }

  function saveCreatedFvgsLog(logMap) {
    if (!logMap || typeof logMap !== 'object') return;
    // Merge the latest storage snapshot before writing so concurrent tabs do not replace each other's FVG records.
    const latest = {};
    try {
      const rawLocal = window.localStorage.getItem(CREATED_FVGS_LOG_STORAGE_KEY);
      if (rawLocal) mergeCreatedFvgsLogs(latest, JSON.parse(rawLocal));
    } catch (e) {}
    try {
      if (window.top && window.top !== window && window.top.localStorage) {
        const rawTop = window.top.localStorage.getItem(CREATED_FVGS_LOG_STORAGE_KEY);
        if (rawTop) mergeCreatedFvgsLogs(latest, JSON.parse(rawTop));
      }
    } catch (e) {}
    mergeCreatedFvgsLogs(latest, logMap);
    Object.keys(logMap).forEach(key => delete logMap[key]);
    Object.assign(logMap, latest);
    // A dismissal wins over an older copy still present in another tab's localStorage snapshot.
    const dismissed = readDismissedFvgs();
    Object.keys(dismissed).forEach(key => delete logMap[key]);
    // Prune oldest entries if log exceeds 2500 entries so localStorage stays lightweight
    const keys = Object.keys(logMap);
    if (keys.length > 2500) {
      keys
        .sort((a, b) => (Number(logMap[a]?.createdAt) || 0) - (Number(logMap[b]?.createdAt) || 0))
        .slice(0, keys.length - 2000)
        .forEach(k => delete logMap[k]);
    }
    createdFvgsLogCache = logMap;
    try {
      const serialized = JSON.stringify(logMap);
      window.localStorage.setItem(CREATED_FVGS_LOG_STORAGE_KEY, serialized);
      if (window.top && window.top !== window && window.top.localStorage) {
        window.top.localStorage.setItem(CREATED_FVGS_LOG_STORAGE_KEY, serialized);
      }
    } catch (e) {}
  }

  function clearCreatedFvgsLog() {
    createdFvgsLogCache = {};
    try {
      window.localStorage.removeItem(CREATED_FVGS_LOG_STORAGE_KEY);
      window.localStorage.removeItem(DISMISSED_FVGS_STORAGE_KEY);
      if (window.top && window.top !== window && window.top.localStorage) {
        window.top.localStorage.removeItem(CREATED_FVGS_LOG_STORAGE_KEY);
        window.top.localStorage.removeItem(DISMISSED_FVGS_STORAGE_KEY);
      }
    } catch (e) {}
    log('Cleared persistent created FVG log');
  }

  function findLoggedFvgEntry(fvg, logMap, barIntervalSec = 300) {
    if (!fvg || !logMap || typeof logMap !== 'object') return null;
    if (logMap[fvg.key]) return logMap[fvg.key];
    if (fvg.legacyKey && logMap[fvg.legacyKey]) return logMap[fvg.legacyKey];

    // Also check by symbol + timeframe + direction + matching startTimeSec & price bounds
    const interval = Math.max(60, barIntervalSec || 300);
    const gapHeight = Math.max(1e-9, Math.abs(fvg.top - fvg.bottom));
    const priceTol = Math.max(gapHeight * 0.25, Math.abs(fvg.top) * 0.0001, 1e-6);
    for (const k of Object.keys(logMap)) {
      const entry = logMap[k];
      if (!entry || typeof entry !== 'object') continue;
      if (entry.symbol && fvg.symbol && entry.symbol !== fvg.symbol) continue;
      if (entry.tfLabel && fvg.tfLabel && entry.tfLabel !== fvg.tfLabel) continue;
      if (entry.direction && fvg.direction && entry.direction !== fvg.direction) continue;
      if (
        Math.abs((Number(entry.startTimeSec) || 0) - fvg.startTimeSec) <= interval &&
        Math.abs((Number(entry.top) || 0) - fvg.top) <= priceTol &&
        Math.abs((Number(entry.bottom) || 0) - fvg.bottom) <= priceTol
      ) {
        return entry;
      }
    }
    return null;
  }

  function recordFvgInCreatedLog(fvg, entityId, logMap) {
    if (!fvg) return;
    const targetLog = logMap || loadCreatedFvgsLog();
    targetLog[fvg.key] = {
      key: fvg.key,
      legacyKey: fvg.legacyKey || null,
      symbol: fvg.symbol || getCurrentChartSymbolKey(),
      tfLabel: fvg.tfLabel,
      timeframe: fvg.tfLabel || formatCurrentResolutionLabel(),
      resolution: activeChart && typeof activeChart.resolution === 'function' ? String(activeChart.resolution()) : null,
      direction: fvg.direction,
      startTimeSec: fvg.startTimeSec,
      top: fvg.top,
      bottom: fvg.bottom,
      entityId: entityId || null,
      createdAt: targetLog[fvg.key]?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    saveCreatedFvgsLog(targetLog);
  }

  function formatCurrentResolutionLabel() {
    let rawRes = '5';
    try {
      if (activeChart && typeof activeChart.resolution === 'function') {
        rawRes = String(activeChart.resolution() || '5').trim();
      } else if (currentSettings && currentSettings.lastChartSettings && currentSettings.lastChartSettings.resolution) {
        rawRes = String(currentSettings.lastChartSettings.resolution).trim();
      }
    } catch (e) {}

    const upper = rawRes.toUpperCase();
    if (/^\d+$/.test(upper)) {
      const mins = parseInt(upper, 10);
      if (mins >= 60 && mins % 60 === 0) {
        return `${mins / 60}h`;
      }
      return `${mins}m`;
    }
    if (upper === '1D' || upper === 'D') return '1D';
    if (upper === '1W' || upper === 'W') return '1W';
    if (upper === '1M' || upper === 'M') return '1M';
    if (/^\d+[SMHDWM]$/.test(upper)) {
      return upper.toLowerCase().replace('d', 'D').replace('w', 'W');
    }
    return rawRes;
  }

  function buildTimeframeAliases(tfLabel) {
    const clean = String(tfLabel || '').trim().toLowerCase();
    const aliases = new Set([clean]);
    const mMatch = clean.match(/^(\d+)m$/);
    if (mMatch) {
      const n = parseInt(mMatch[1], 10);
      aliases.add(`${n}m`);
      aliases.add(`${n}min`);
      aliases.add(`${n} min`);
      aliases.add(`${n} m`);
      if (n === 60) {
        aliases.add('1h');
        aliases.add('1hr');
        aliases.add('1 hour');
      } else if (n === 240) {
        aliases.add('4h');
        aliases.add('4hr');
      }
    }
    const hMatch = clean.match(/^(\d+)h$/);
    if (hMatch) {
      const h = parseInt(hMatch[1], 10);
      aliases.add(`${h}h`);
      aliases.add(`${h}hr`);
      aliases.add(`${h} hour`);
      aliases.add(`${h * 60}m`);
      aliases.add(`${h * 60}min`);
    }
    if (clean === '1d' || clean === 'd') {
      aliases.add('1d');
      aliases.add('d');
      aliases.add('daily');
      aliases.add('day');
    }
    if (clean === '1w' || clean === 'w') {
      aliases.add('1w');
      aliases.add('w');
      aliases.add('weekly');
      aliases.add('week');
    }
    return Array.from(aliases);
  }

  function resolveAutoFvgTemplate(direction, tfLabel, fvgConfig) {
    const isBull = direction === 'bullish';
    const explicitId = isBull ? (fvgConfig.bullishTemplateId || 'auto') : (fvgConfig.bearishTemplateId || 'auto');
    const rectTemplates = Array.isArray(currentTemplates)
      ? currentTemplates.filter(t => t && canonicalizeDrawingType(t.drawingType || 'rectangle') === 'rectangle')
      : [];

    // 1. If user explicitly picked a specific saved template in Settings -> Auto FVG's
    if (explicitId && explicitId !== 'auto' && explicitId !== 'default') {
      const explicitFound = rectTemplates.find(t => t.id === explicitId);
      if (explicitFound) return explicitFound;
    }

    // 2. If set to Auto-Match, search user's saved rectangle templates for a matching timeframe FVG template (e.g. "5m FVG")
    if (explicitId === 'auto' && rectTemplates.length > 0) {
      const tfAliases = buildTimeframeAliases(tfLabel);
      const dirKeywords = isBull ? ['bull', 'bullish', 'bisi', 'long', '+'] : ['bear', 'bearish', 'sibi', 'short', '-'];
      const oppositeKeywords = isBull ? ['bear', 'bearish', 'sibi', 'short'] : ['bull', 'bullish', 'bisi', 'long'];

      const hasToken = (str, token) => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(str);
      };

      let bestMatch = null;
      let bestScore = 0;

      for (const t of rectTemplates) {
        const nameLower = String(t.name || '').trim().toLowerCase();
        const textLower = String(t.text || '').trim().toLowerCase();
        const combined = `${nameLower} ${textLower}`;

        const hasFvgWord = /\bfvg\b|fair\s*value\s*gap|\bimbalance\b|\bbisi\b|\bsibi\b/i.test(combined);
        const matchesTf = tfAliases.some(alias => hasToken(nameLower, alias) || hasToken(textLower, alias));
        const matchesDir = dirKeywords.some(k => hasToken(combined, k));
        const matchesOppositeDir = oppositeKeywords.some(k => hasToken(combined, k));

        // Never use a Bearish-labeled template for a Bullish FVG or vice versa
        if (matchesOppositeDir && !matchesDir) continue;

        let score = 0;
        if (matchesTf && hasFvgWord && matchesDir) {
          score = 100; // e.g. "5m Bullish FVG"
        } else if (matchesTf && hasFvgWord) {
          score = 85; // e.g. "5m FVG"
        } else if (nameLower === `${tfLabel.toLowerCase()} fvg`) {
          score = 95;
        } else if (hasFvgWord && matchesDir && !/\b\d+[mhdw]\b/i.test(combined)) {
          score = 60; // Generic "Bullish FVG" / "Bearish FVG" without another timeframe's prefix
        } else if ((nameLower === 'fvg' || textLower === 'fvg') && !/\b\d+[mhdw]\b/i.test(combined)) {
          score = 45; // Generic "FVG" template
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = t;
        }
      }

      if (bestMatch) {
        return bestMatch;
      }
    }

    // 3. Fallback: Build Default FVG Template for current timeframe
    const defaultColor = isBull
      ? (fvgConfig.defaultBullishColor || '#26a69a')
      : (fvgConfig.defaultBearishColor || '#ef4444');
    const defaultOpacity = typeof fvgConfig.defaultOpacity === 'number' ? fvgConfig.defaultOpacity : 22;
    const rawFormat = typeof fvgConfig.labelFormat === 'string' && fvgConfig.labelFormat.trim()
      ? fvgConfig.labelFormat.trim()
      : '{tf} FVG';
    const formattedLabel = rawFormat
      .replace(/\{tf\}/gi, tfLabel)
      .replace(/\{dir\}/gi, isBull ? 'Bull' : 'Bear');

    return {
      id: `__default_fvg_${direction}__`,
      isDefaultFallback: true,
      name: `${tfLabel} FVG`,
      drawingType: 'rectangle',
      color: defaultColor,
      backgroundColor: defaultColor,
      opacity: defaultOpacity,
      linewidth: 1,
      linestyle: 0,
      extendRight: true,
      extendLeft: false,
      showMiddleLine: fvgConfig.defaultShowMidline !== false,
      middleLineColor: defaultColor,
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: fvgConfig.defaultShowLabel !== false,
      text: formattedLabel,
      textColor: defaultColor,
      fontSize: 11,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    };
  }

  function computeAutoFvgsFromBars(bars, fvgConfig) {
    if (!bars || bars.length < 3 || !fvgConfig || !fvgConfig.enabled) return [];

    const lookback = Math.max(50, Math.min(bars.length, Number(fvgConfig.maxBarsLookback) || 600));
    const startIdx = Math.max(2, bars.length - lookback);
    const reclaimByWick = fvgConfig.reclaimMode === 'wick';
    const hideReclaimed = fvgConfig.showReclaimed !== undefined
      ? !Boolean(fvgConfig.showReclaimed)
      : Boolean(fvgConfig.hideReclaimed);
    const minGapPct = Math.max(0, Number(fvgConfig.minGapPercent) || 0);
    const maxActive = Math.max(1, Number(fvgConfig.maxActiveFvgs) || 25);
    const maxReclaimedHist = Math.max(0, Number(fvgConfig.showReclaimedHistoryCount ?? 15));

    const tfLabel = formatCurrentResolutionLabel();
    const symbolKey = getCurrentChartSymbolKey();
    const bullTpl = resolveAutoFvgTemplate('bullish', tfLabel, fvgConfig);
    const bearTpl = resolveAutoFvgTemplate('bearish', tfLabel, fvgConfig);

    const detected = [];
    const latestBar = bars[bars.length - 1];
    const prevBar = bars.length > 1 ? bars[bars.length - 2] : latestBar;
    const barIntervalSec = (bars.length > 1 && latestBar.timeSec > prevBar.timeSec)
      ? (latestBar.timeSec - prevBar.timeSec)
      : 300;
    const rawFutureBars = Number(fvgConfig.extendFutureBars);
    const futureBarsOffset = isFinite(rawFutureBars) ? Math.max(0, Math.min(200, Math.round(rawFutureBars))) : 0;
    const unreclaimedEndBarIndex = latestBar.barIndex + futureBarsOffset;
    const unreclaimedEndTimeSec = latestBar.timeSec + futureBarsOffset * barIntervalSec;

    // Only confirm 3-candle FVGs where candle 3 (i) has closed (i <= bars.length - 2)
    // so live wicks on the current forming candle don't falsely flash unclosed gaps.
    const maxFormationIdx = Math.max(2, bars.length - 2);

    for (let i = startIdx; i <= maxFormationIdx; i++) {
      const c1 = bars[i - 2];
      const c2 = bars[i - 1];
      const c3 = bars[i];

      // 1. Bullish FVG (BISI): c3.low > c1.high
      // Full gap height is ALWAYS preserved from c3.low (top) down to c1.high (bottom) — never shrinks when touched!
      if (c3.low > c1.high) {
        const initialTop = c3.low;
        const initialBottom = c1.high;
        const gapSize = initialTop - initialBottom;
        const gapPct = c1.high > 0 ? (gapSize / c1.high) * 100 : 0;

        if (gapSize > 0 && gapPct >= minGapPct) {
          let reclaimed = false;
          let reclaimedBarIndex = null;
          let reclaimedTimeSec = null;

          for (let j = i + 1; j < bars.length; j++) {
            const post = bars[j];
            // If reclaimMode === 'close', only a CLOSED candle (j < bars.length - 1) closing below c1.high reclaims it,
            // so the currently forming live bar never prematurely cuts off or shrinks the FVG before the candle closes!
            if (!reclaimByWick && j === bars.length - 1) {
              continue;
            }
            const testPrice = reclaimByWick ? post.low : post.close;
            if (testPrice < initialBottom) {
              reclaimed = true;
              reclaimedBarIndex = post.barIndex;
              reclaimedTimeSec = post.timeSec;
              break;
            }
          }

          if (!reclaimed || !hideReclaimed) {
            detected.push({
              key: `fvg_bull_${symbolKey}_${tfLabel}_${c1.timeSec}`,
              legacyKey: `fvg_bull_${tfLabel}_${c1.timeSec}`,
              symbol: symbolKey,
              direction: 'bullish',
              tfLabel,
              template: bullTpl,
              startBarIndex: c1.barIndex,
              startTimeSec: c1.timeSec,
              candle2BarIndex: c2.barIndex,
              candle3BarIndex: c3.barIndex,
              endBarIndex: reclaimed ? reclaimedBarIndex : unreclaimedEndBarIndex,
              endTimeSec: reclaimed ? reclaimedTimeSec : unreclaimedEndTimeSec,
              top: initialTop,
              bottom: initialBottom,
              mid: (initialTop + initialBottom) / 2,
              initialTop,
              initialBottom,
              reclaimed,
              reclaimedBarIndex,
              reclaimedTimeSec
            });
          }
        }
      }

      // 2. Bearish FVG (SIBI): c3.high < c1.low
      // Full gap height is ALWAYS preserved from c1.low (top) down to c3.high (bottom) — never shrinks when touched!
      if (c3.high < c1.low) {
        const initialTop = c1.low;
        const initialBottom = c3.high;
        const gapSize = initialTop - initialBottom;
        const gapPct = c1.low > 0 ? (gapSize / c1.low) * 100 : 0;

        if (gapSize > 0 && gapPct >= minGapPct) {
          let reclaimed = false;
          let reclaimedBarIndex = null;
          let reclaimedTimeSec = null;

          for (let j = i + 1; j < bars.length; j++) {
            const post = bars[j];
            // If reclaimMode === 'close', only a CLOSED candle (j < bars.length - 1) closing above c1.low reclaims it!
            if (!reclaimByWick && j === bars.length - 1) {
              continue;
            }
            const testPrice = reclaimByWick ? post.high : post.close;
            if (testPrice > initialTop) {
              reclaimed = true;
              reclaimedBarIndex = post.barIndex;
              reclaimedTimeSec = post.timeSec;
              break;
            }
          }

          if (!reclaimed || !hideReclaimed) {
            detected.push({
              key: `fvg_bear_${symbolKey}_${tfLabel}_${c1.timeSec}`,
              legacyKey: `fvg_bear_${tfLabel}_${c1.timeSec}`,
              symbol: symbolKey,
              direction: 'bearish',
              tfLabel,
              template: bearTpl,
              startBarIndex: c1.barIndex,
              startTimeSec: c1.timeSec,
              candle2BarIndex: c2.barIndex,
              candle3BarIndex: c3.barIndex,
              endBarIndex: reclaimed ? reclaimedBarIndex : unreclaimedEndBarIndex,
              endTimeSec: reclaimed ? reclaimedTimeSec : unreclaimedEndTimeSec,
              top: initialTop,
              bottom: initialBottom,
              mid: (initialTop + initialBottom) / 2,
              initialTop,
              initialBottom,
              reclaimed,
              reclaimedBarIndex,
              reclaimedTimeSec
            });
          }
        }
      }
    }

    // Filter to most recent N active (unreclaimed) FVGs and most recent M reclaimed FVGs so the chart stays clean
    const activeList = detected.filter(f => !f.reclaimed).slice(-maxActive);
    const reclaimedList = hideReclaimed ? [] : detected.filter(f => f.reclaimed).slice(-maxReclaimedHist);
    return [...reclaimedList, ...activeList];
  }

  function normalizeEpochSec(rawTime) {
    const n = Number(rawTime);
    if (!isFinite(n) || n <= 0) return NaN;
    return n > 1e11 ? Math.round(n / 1000) : n;
  }

  function extractPointsFromInternalLineSource(src) {
    if (!src || typeof src !== 'object') return null;
    try {
      const pts = typeof src.points === 'function' ? src.points() : (src._points || src.m_points);
      if (Array.isArray(pts) && pts.length >= 2) {
        return pts.map(p => ({
          time: p.time_t ?? (p.time && typeof p.time === 'object' ? p.time.value : p.time),
          price: p.price ?? (p.value !== undefined ? p.value : undefined),
          index: p.index
        }));
      }
      if (typeof src.timeAxisPoints === 'function') {
        const tap = src.timeAxisPoints();
        if (Array.isArray(tap) && tap.length >= 2) {
          return tap.map(p => ({
            time: p.time_t ?? p.time,
            price: p.price,
            index: p.index
          }));
        }
      }
    } catch (e) {}
    return null;
  }

  function getExistingChartRectangleBoundsList(bars = null) {
    const results = [];
    const seenIds = new Set();

    const addRectEntry = (entityId, t0Raw, t1Raw, pr0Raw, pr1Raw, shapeRef = null) => {
      const t0 = normalizeEpochSec(t0Raw);
      const t1 = normalizeEpochSec(t1Raw);
      const pr0 = Number(pr0Raw);
      const pr1 = Number(pr1Raw);
      if (!isFinite(t0) || !isFinite(t1) || !isFinite(pr0) || !isFinite(pr1)) return;
      const key = entityId || `${Math.round(Math.min(t0, t1))}_${pr0.toFixed(4)}_${pr1.toFixed(4)}`;
      if (seenIds.has(key)) return;
      seenIds.add(key);
      results.push({
        entityId: entityId || key,
        startTimeSec: Math.min(t0, t1),
        endTimeSec: Math.max(t0, t1),
        top: Math.max(pr0, pr1),
        bottom: Math.min(pr0, pr1),
        mid: (pr0 + pr1) / 2,
        shape: shapeRef
      });
    };

    // 1. Query activeChart.getAllShapes()
    if (activeChart && typeof activeChart.getAllShapes === 'function') {
      try {
        const allShapes = activeChart.getAllShapes() || [];
        for (const s of allShapes) {
          if (!s || !s.id) continue;
          const nameLower = String(s.name || '').toLowerCase();
          if (nameLower && !nameLower.includes('rect')) continue;
          const sh = activeChart.getShapeById(s.id);
          if (!sh) continue;
          let pts = null;
          try {
            if (typeof sh.getPoints === 'function') pts = sh.getPoints();
          } catch (e) {}
          if (!Array.isArray(pts) || pts.length < 2) {
            const internalSrc = extractInternalSourceFromShape(sh, s.id);
            pts = extractPointsFromInternalLineSource(internalSrc);
          }
          if (!Array.isArray(pts) || pts.length < 2) continue;
          const p0 = pts[0] || {};
          const p1 = pts[1] || {};
          let t0 = p0.time ?? p0.time_t;
          let t1 = p1.time ?? p1.time_t;
          if ((!t0 || !t1) && Array.isArray(bars) && bars.length > 0) {
            if (!t0 && typeof p0.index === 'number') {
              const b0 = bars.find(b => b.barIndex === p0.index);
              if (b0) t0 = b0.timeSec;
            }
            if (!t1 && typeof p1.index === 'number') {
              const b1 = bars.find(b => b.barIndex === p1.index);
              if (b1) t1 = b1.timeSec;
            }
          }
          addRectEntry(s.id, t0, t1, p0.price, p1.price, sh);
        }
      } catch (e) {}
    }

    // 2. Also query internal ChartModel dataSources() directly (catches any rectangle source even if getAllShapes() lags on page load)
    try {
      const model = findChartModelForSessions() || getChartModel();
      if (model) {
        const dsList = typeof model.dataSources === 'function'
          ? model.dataSources()
          : (Array.isArray(model._dataSources) ? model._dataSources : []);
        if (Array.isArray(dsList)) {
          for (const src of dsList) {
            if (!src || typeof src !== 'object') continue;
            const toolName = String(
              (typeof src.toolname === 'function' ? src.toolname() : src._toolname) ||
              (typeof src.name === 'function' ? src.name() : src._name) ||
              ''
            ).toLowerCase();
            if (!toolName.includes('rect')) continue;
            const sid = typeof src.id === 'function' ? src.id() : src._id;
            const pts = extractPointsFromInternalLineSource(src);
            if (Array.isArray(pts) && pts.length >= 2) {
              addRectEntry(sid, pts[0].time, pts[1].time, pts[0].price, pts[1].price, null);
            }
          }
        }
      }
    } catch (e) {}

    // 3. Also inspect Vest's persisted localStorage drawing keys (`tv-chart-drawings-*` / `tv-drawings-flush:*`)
    // so even during the first 1-2 seconds after a page refresh BEFORE Vest hydrates saved drawings into TradingView,
    // we already know every rectangle that exists on the chart and NEVER create a duplicate!
    try {
      const storages = [window.localStorage];
      try {
        if (window.top && window.top !== window && window.top.localStorage) {
          storages.push(window.top.localStorage);
        }
      } catch (e) {}

      for (const stor of storages) {
        for (let kIdx = 0; kIdx < stor.length; kIdx++) {
          const key = stor.key(kIdx);
          if (!key || (!key.startsWith('tv-chart-drawings-') && !key.startsWith('tv-drawings-flush:'))) continue;
          const raw = stor.getItem(key);
          if (!raw || !raw.includes('LineToolRectangle')) continue;
          const parsed = JSON.parse(raw);
          const sources = parsed && Array.isArray(parsed.sources) ? parsed.sources : null;
          if (!sources) continue;
          for (const entry of sources) {
            const srcObj = Array.isArray(entry) ? entry[1] : entry;
            if (!srcObj || typeof srcObj !== 'object') continue;
            const tool = String(srcObj.toolName || srcObj.type || (srcObj.state && srcObj.state.type) || '').toLowerCase();
            if (!tool.includes('rect')) continue;
            const id = (Array.isArray(entry) ? entry[0] : srcObj.id) || null;
            const pts = (srcObj.state && Array.isArray(srcObj.state.points))
              ? srcObj.state.points
              : (Array.isArray(srcObj.points) ? srcObj.points : null);
            if (Array.isArray(pts) && pts.length >= 2) {
              addRectEntry(
                id,
                pts[0].time_t ?? pts[0].time,
                pts[1].time_t ?? pts[1].time,
                pts[0].price,
                pts[1].price,
                null
              );
            }
          }
        }
      }
    } catch (e) {}

    return results;
  }

  function findAllMatchingExistingRectanglesOnChart(fvg, existingRects, barIntervalSec) {
    if (!fvg || !Array.isArray(existingRects) || existingRects.length === 0) return [];
    const matches = [];
    const gapHeight = Math.max(1e-9, Math.abs(fvg.top - fvg.bottom));
    // Generous price & time overlap matching so whether a box was drawn from candle 1, candle 2, or candle 3,
    // or slightly off with magnet/freehand, we recognize that a box already exists for this FVG!
    const priceTol = Math.max(gapHeight * 0.45, Math.abs(fvg.top) * 0.0003, 1e-6);
    const interval = Math.max(60, barIntervalSec || 300);
    const startTol = interval * 5; // Up to 5 bars difference in start anchor (covers candle 1, 2, 3, or adjacent bar)

    for (const r of existingRects) {
      const rHeight = Math.max(1e-9, Math.abs(r.top - r.bottom));
      // Check vertical overlap between existing box [r.bottom, r.top] and FVG [fvg.bottom, fvg.top]
      const overlapTop = Math.min(r.top, fvg.top);
      const overlapBottom = Math.max(r.bottom, fvg.bottom);
      const verticalOverlap = Math.max(0, overlapTop - overlapBottom);
      const minHeight = Math.min(gapHeight, rHeight);

      const topDiff = Math.abs(r.top - fvg.top);
      const botDiff = Math.abs(r.bottom - fvg.bottom);
      const midDiff = Math.abs((r.top + r.bottom) / 2 - fvg.mid);

      // Price matches if either top & bottom are within tolerance OR vertical overlap is >= 55% of the box height (and similar size)
      const priceMatches =
        (topDiff <= priceTol && botDiff <= priceTol) ||
        (verticalOverlap >= minHeight * 0.55 && rHeight <= gapHeight * 2.5 && midDiff <= gapHeight * 0.65);

      if (!priceMatches) continue;

      // Time matches if the existing box starts within 5 bars of the FVG start, OR horizontally spans across the FVG's formation candles
      const startDiff = Math.abs(r.startTimeSec - fvg.startTimeSec);
      const spansAcrossFvgStart =
        r.startTimeSec <= fvg.startTimeSec + interval * 3 &&
        r.endTimeSec >= fvg.startTimeSec - interval;

      if (startDiff <= startTol || spansAcrossFvgStart) {
        matches.push(r);
      }
    }
    return matches;
  }

  function findMatchingExistingRectangleOnChart(fvg, existingRects, barIntervalSec) {
    const matches = findAllMatchingExistingRectanglesOnChart(fvg, existingRects, barIntervalSec);
    return matches.length > 0 ? matches[0] : null;
  }

  function cleanupNativeAutoFvgShapes(keepKeysSet = null) {
    if (!activeChart) return;
    for (const [key, entry] of nativeAutoFvgShapesMap.entries()) {
      if (keepKeysSet && keepKeysSet.has(key)) continue;
      try {
        if (entry && entry.entityId && typeof activeChart.removeEntity === 'function') {
          removeNativeAutoFvgShape(entry.entityId);
        }
      } catch (e) {}
      nativeAutoFvgShapesMap.delete(key);
    }
  }

  function removeNativeAutoFvgShape(entityId) {
    if (!entityId || !activeChart || typeof activeChart.removeEntity !== 'function') return;
    nativeAutoFvgRemovalSuppression.add(entityId);
    try {
      activeChart.removeEntity(entityId);
    } catch (e) {
      nativeAutoFvgRemovalSuppression.delete(entityId);
      return;
    }
    setTimeout(() => nativeAutoFvgRemovalSuppression.delete(entityId), 1500);
  }

  function shouldExtendAutoFvgToFarRight(fvg, fvgConfig) {
    if (!fvg || fvg.reclaimed) return false;
    const mode = String((fvgConfig && fvgConfig.extendMode) || 'right').toLowerCase();
    if (mode === 'current') return false;
    if (mode === 'template') return Boolean(fvg.template && fvg.template.extendRight);
    return true; // 'right' (default)
  }

  function syncNativeTradingViewAutoFvgShapes(fvgs, fvgConfig, barIntervalSec = 300, bars = null) {
    if (!fvgConfig || !fvgConfig.enabled || !fvgConfig.syncNativeDrawings || !activeChart || typeof activeChart.createMultipointShape !== 'function') {
      if (nativeAutoFvgShapesMap.size > 0) {
        cleanupNativeAutoFvgShapes(null);
      }
      return;
    }

    const keepKeys = new Set(fvgs.map(f => f.key));
    cleanupNativeAutoFvgShapes(keepKeys);

    // 1. Load the persistent Created-FVG Log from localStorage so we know every FVG that has ALREADY been created across page refreshes!
    const createdFvgsLog = loadCreatedFvgsLog();

    // 2. Scan all existing rectangles on the chart (API + ChartModel + localStorage)
    const existingChartRects = getExistingChartRectangleBoundsList(bars);
    const claimedEntityIds = new Set();
    for (const entry of nativeAutoFvgShapesMap.values()) {
      if (entry && entry.entityId) claimedEntityIds.add(entry.entityId);
    }

    for (const fvg of fvgs) {
      try {
        if (isCreatedFvgDismissed(fvg)) continue;
        let existing = nativeAutoFvgShapesMap.get(fvg.key);
        const loggedEntry = findLoggedFvgEntry(fvg, createdFvgsLog, barIntervalSec);
        const tpl = fvg.template;
        const labelText = resolveAutoFvgDisplayText(fvg, fvgConfig);
        const extendFarRight = shouldExtendAutoFvgToFarRight(fvg, fvgConfig);
        const useCustomReclaimedColor = Boolean(fvg.reclaimed && (fvgConfig.reclaimedColorMode || 'custom') !== 'dim');
        const fallbackRecHex = parseColorAndAlpha(fvgConfig.reclaimedColor || '#787b86', '#787b86').hex;
        const customRecBoxHex = useCustomReclaimedColor
          ? parseColorAndAlpha(fvgConfig.reclaimedBoxColor || fallbackRecHex, fallbackRecHex).hex
          : null;
        const customRecBoxOp = useCustomReclaimedColor
          ? Math.max(0, Math.min(100, Number(fvgConfig.reclaimedBoxOpacity ?? fvgConfig.reclaimedOpacity ?? 18)))
          : null;
        const customRecBorderHex = useCustomReclaimedColor
          ? parseColorAndAlpha(fvgConfig.reclaimedBorderColor || customRecBoxHex, customRecBoxHex).hex
          : null;
        const customRecBorderOp = useCustomReclaimedColor
          ? Math.max(0, Math.min(100, Number(fvgConfig.reclaimedBorderOpacity ?? 65)))
          : null;
        const customRecMidHex = useCustomReclaimedColor
          ? parseColorAndAlpha(fvgConfig.reclaimedMidlineColor || customRecBorderHex, customRecBorderHex).hex
          : null;
        const customRecMidOp = useCustomReclaimedColor
          ? Math.max(0, Math.min(100, Number(fvgConfig.reclaimedMidlineOpacity ?? 60)))
          : null;
        // Extend right or to current time while unreclaimed according to user's setting; stop extending and anchor at the reclaim candle once reclaimed!
        const effectiveTpl = {
          ...tpl,
          ...(useCustomReclaimedColor ? {
            color: customRecBorderHex,
            borderOpacity: customRecBorderOp,
            backgroundColor: customRecBoxHex,
            opacity: customRecBoxOp,
            middleLineColor: customRecMidHex,
            middleLineOpacity: customRecMidOp,
            textColor: customRecBorderHex
          } : {}),
          extendRight: extendFarRight,
          extendLeft: false,
          showLabel: Boolean(labelText),
          text: labelText
        };

        // Check if ANY existing rectangle(s) on the chart already cover this FVG
        const candidates = existingChartRects.filter(r => !claimedEntityIds.has(r.entityId));
        const allMatchesOnChart = findAllMatchingExistingRectanglesOnChart(fvg, candidates, barIntervalSec);
        const matchedOnChart = allMatchesOnChart.length > 0 ? allMatchesOnChart[0] : null;

        // If multiple identical duplicate rectangles exist on the chart for this same FVG (from earlier refreshes),
        // clean up the extra duplicates automatically so only ONE rectangle remains!
        if (allMatchesOnChart.length > 1 && typeof activeChart.removeEntity === 'function') {
          for (let dIdx = 1; dIdx < allMatchesOnChart.length; dIdx++) {
            const dup = allMatchesOnChart[dIdx];
            if (dup && dup.entityId && Math.abs(dup.top - fvg.top) < 1e-4 && Math.abs(dup.bottom - fvg.bottom) < 1e-4) {
              try {
                removeNativeAutoFvgShape(dup.entityId);
                claimedEntityIds.add(dup.entityId);
              } catch (e) {}
            }
          }
        }

        // Case 1: Reuse a logged FVG only when its actual drawing is present on this chart.
        // Vest may not have hydrated the saved drawing yet, or the old entity ID may be stale after refresh.
        if (loggedEntry) {
          const loggedShapeMatchesFvg = Boolean(
            loggedEntry.entityId &&
            findAllMatchingExistingRectanglesOnChart(
              fvg,
              existingChartRects.filter(rect => rect.entityId === loggedEntry.entityId),
              barIntervalSec
            ).length
          );
          const targetEntityId =
            (existing && existing.entityId) ||
            (matchedOnChart && matchedOnChart.entityId) ||
            (loggedShapeMatchesFvg ? loggedEntry.entityId : null) ||
            null;
          let restoredFromLog = false;
          if (targetEntityId) {
            claimedEntityIds.add(targetEntityId);
            const liveSh = activeChart.getShapeById(targetEntityId);
            if (liveSh) {
              restoredFromLog = true;
              if (!existing) {
                existing = {
                  entityId: targetEntityId,
                  lastEndTimeSec: fvg.endTimeSec,
                  top: fvg.top,
                  bottom: fvg.bottom,
                  tplSig: JSON.stringify(effectiveTpl)
                };
                nativeAutoFvgShapesMap.set(fvg.key, existing);
              }
              if (loggedEntry.entityId !== targetEntityId) {
                recordFvgInCreatedLog(fvg, targetEntityId, createdFvgsLog);
              }
              if (existing.lastEndTimeSec !== fvg.endTimeSec || existing.top !== fvg.top || existing.bottom !== fvg.bottom) {
                if (typeof liveSh.setPoints === 'function') {
                  liveSh.setPoints([
                    { time: fvg.startTimeSec, price: fvg.top },
                    { time: fvg.endTimeSec, price: fvg.bottom }
                  ]);
                }
                existing.lastEndTimeSec = fvg.endTimeSec;
                existing.top = fvg.top;
                existing.bottom = fvg.bottom;
              }
              if (existing.tplSig !== JSON.stringify(effectiveTpl)) {
                applyTemplateToShape(liveSh, effectiveTpl, targetEntityId, 'rectangle');
                existing.tplSig = JSON.stringify(effectiveTpl);
              }
            }
          }
          if (restoredFromLog) continue;
          if (existing && existing.entityId && !activeChart.getShapeById(existing.entityId)) {
            nativeAutoFvgShapesMap.delete(fvg.key);
            existing = null;
          }
          if (loggedEntry.entityId && !activeChart.getShapeById(loggedEntry.entityId)) {
            loggedEntry.entityId = null;
          }
        }

        // Case 2: Not in log yet, but a matching rectangle already exists on the chart — log it and do NOT create a duplicate!
        if (!existing && matchedOnChart) {
          if (matchedOnChart.entityId) {
            claimedEntityIds.add(matchedOnChart.entityId);
          }
          recordFvgInCreatedLog(fvg, matchedOnChart.entityId || null, createdFvgsLog);
          const liveSh = matchedOnChart.entityId && activeChart.getShapeById(matchedOnChart.entityId);
          if (liveSh) {
            existing = {
              entityId: matchedOnChart.entityId,
              lastEndTimeSec: fvg.endTimeSec,
              top: fvg.top,
              bottom: fvg.bottom,
              tplSig: JSON.stringify(effectiveTpl)
            };
            nativeAutoFvgShapesMap.set(fvg.key, existing);
          }
          continue;
        }

        // Case 3: In-memory existing shape check
        if (existing && existing.entityId) {
          const sh = activeChart.getShapeById(existing.entityId);
          if (sh) {
            recordFvgInCreatedLog(fvg, existing.entityId, createdFvgsLog);
            if (existing.lastEndTimeSec !== fvg.endTimeSec || existing.top !== fvg.top || existing.bottom !== fvg.bottom) {
              if (typeof sh.setPoints === 'function') {
                sh.setPoints([
                  { time: fvg.startTimeSec, price: fvg.top },
                  { time: fvg.endTimeSec, price: fvg.bottom }
                ]);
              }
              existing.lastEndTimeSec = fvg.endTimeSec;
              existing.top = fvg.top;
              existing.bottom = fvg.bottom;
            }
            if (existing.tplSig !== JSON.stringify(effectiveTpl)) {
              applyTemplateToShape(sh, effectiveTpl, existing.entityId, 'rectangle');
              existing.tplSig = JSON.stringify(effectiveTpl);
            }
            continue;
          }
        }

        // Case 4: FVG has NOT been created yet and does not exist on the chart — create it and log it in the persistent log!
        const entityId = activeChart.createMultipointShape(
          [
            { time: fvg.startTimeSec, price: fvg.top },
            { time: fvg.endTimeSec, price: fvg.bottom }
          ],
          {
            shape: 'rectangle',
            lock: false,
            disableSelection: false,
            disableSave: false
          }
        );

        if (entityId) {
          claimedEntityIds.add(entityId);
          recordFvgInCreatedLog(fvg, entityId, createdFvgsLog);
          const sh = activeChart.getShapeById(entityId);
          if (sh) {
            applyTemplateToShape(sh, effectiveTpl, entityId, 'rectangle');
          }
          nativeAutoFvgShapesMap.set(fvg.key, {
            entityId,
            lastEndTimeSec: fvg.endTimeSec,
            top: fvg.top,
            bottom: fvg.bottom,
            tplSig: JSON.stringify(effectiveTpl)
          });
        }
      } catch (e) {}
    }
  }

  function resolveAutoFvgDisplayText(fvg, fvgConfig) {
    const tpl = fvg.template || {};
    if (tpl && !tpl.isDefaultFallback) {
      // If user's matched template has explicit text, use it; otherwise if showLabel is enabled or template has a name like "5m FVG", use its text or name!
      if (typeof tpl.text === 'string' && tpl.text.trim()) {
        return tpl.text.trim();
      }
      if (tpl.showLabel === false && !tpl.text) {
        // Still fall back to the template name (e.g. "5m FVG") if defaultShowLabel is on
        if (fvgConfig.defaultShowLabel !== false && tpl.name) {
          return String(tpl.name).trim();
        }
        return '';
      }
      if (tpl.name) {
        return String(tpl.name).trim();
      }
    }

    if (fvgConfig.defaultShowLabel === false) return '';
    const rawFormat = (typeof fvgConfig.labelFormat === 'string' && fvgConfig.labelFormat.trim())
      ? fvgConfig.labelFormat.trim()
      : '{tf} FVG';
    return rawFormat
      .replace(/\{tf\}/gi, fvg.tfLabel || '')
      .replace(/\{dir\}/gi, fvg.direction === 'bullish' ? 'Bull' : 'Bear')
      .replace(/\{template\}/gi, tpl.name || `${fvg.tfLabel} FVG`)
      .trim();
  }

  function renderAutoFvgsOnCanvas(ctx, fvgs, fvgConfig, barToX, priceToY, halfBarW, cssWidth, cssHeight, barIntervalSec = 300, bars = null) {
    if (!ctx || !fvgs || fvgs.length === 0) return;

    // Check existing native rectangle shapes on the chart (from API, internal ChartModel, and localStorage)
    // so we NEVER draw an Auto FVG when a box already exists at those coordinates!
    const existingChartRects = getExistingChartRectangleBoundsList(bars);

    for (let i = 0; i < fvgs.length; i++) {
      const fvg = fvgs[i];
      if (existingChartRects.length > 0 && findMatchingExistingRectangleOnChart(fvg, existingChartRects, barIntervalSec)) {
        continue;
      }
      const tpl = fvg.template || {};

      const rawStartX = barToX(fvg.startBarIndex, fvg.startTimeSec);
      const rawEndX = barToX(fvg.endBarIndex, fvg.endTimeSec);
      const topY = priceToY(fvg.top);
      const bottomY = priceToY(fvg.bottom);
      const midY = priceToY(fvg.mid);

      if (rawStartX === null || rawEndX === null || topY === null || bottomY === null) continue;

      const boxLeft = Math.min(rawStartX, rawEndX) - halfBarW;
      // While unreclaimed, extend either to the far right edge of the chart ('right') or to the current candle ('current')
      // based on the user's "Unreclaimed Extension Mode" setting; once reclaimed, cut it off at the candle that reclaimed it!
      const extendToFarRight = shouldExtendAutoFvgToFarRight(fvg, fvgConfig);
      const boxRight = extendToFarRight ? cssWidth : (Math.max(rawStartX, rawEndX) + halfBarW);

      if (boxRight < -20 || boxLeft > cssWidth + 20) continue;

      const boxTop = Math.min(topY, bottomY);
      const boxBottom = Math.max(topY, bottomY);
      if (boxBottom < -20 || boxTop > cssHeight + 20) continue;

      const clampedLeft = Math.max(-4, boxLeft);
      const clampedRight = Math.min(cssWidth + 4, boxRight);
      const boxW = Math.max(2, clampedRight - clampedLeft);
      const boxH = Math.max(2, boxBottom - boxTop);

      const useCustomReclaimedColor = Boolean(fvg.reclaimed && (fvgConfig.reclaimedColorMode || 'custom') !== 'dim');
      const fallbackReclaimedHex = parseColorAndAlpha(fvgConfig.reclaimedColor || '#787b86', '#787b86').hex;
      const customReclaimedBoxHex = useCustomReclaimedColor
        ? parseColorAndAlpha(fvgConfig.reclaimedBoxColor || fallbackReclaimedHex, fallbackReclaimedHex).hex
        : null;
      const customReclaimedBorderHex = useCustomReclaimedColor
        ? parseColorAndAlpha(fvgConfig.reclaimedBorderColor || customReclaimedBoxHex, customReclaimedBoxHex).hex
        : null;
      const customReclaimedMidHex = useCustomReclaimedColor
        ? parseColorAndAlpha(fvgConfig.reclaimedMidlineColor || customReclaimedBorderHex, customReclaimedBorderHex).hex
        : null;

      const borderHex = useCustomReclaimedColor
        ? customReclaimedBorderHex
        : parseColorAndAlpha(tpl.color, fvg.direction === 'bullish' ? '#26a69a' : '#ef4444').hex;
      const bgHex = useCustomReclaimedColor
        ? customReclaimedBoxHex
        : parseColorAndAlpha(tpl.backgroundColor || borderHex, borderHex).hex;
      const baseOpacity = typeof tpl.opacity === 'number' ? tpl.opacity : (Number(fvgConfig.defaultOpacity) || 22);
      const effectiveOpacity = fvg.reclaimed
        ? (useCustomReclaimedColor
          ? Math.max(0, Math.min(100, Number(fvgConfig.reclaimedBoxOpacity ?? fvgConfig.reclaimedOpacity ?? 18)))
          : Math.max(5, Math.round(baseOpacity * 0.55)))
        : baseOpacity;
      const effectiveBorderOpacity = fvg.reclaimed
        ? (useCustomReclaimedColor
          ? Math.max(0, Math.min(100, Number(fvgConfig.reclaimedBorderOpacity ?? 65)))
          : 45)
        : 82;
      const effectiveMidlineOpacity = fvg.reclaimed
        ? (useCustomReclaimedColor
          ? Math.max(0, Math.min(100, Number(fvgConfig.reclaimedMidlineOpacity ?? 60)))
          : 42)
        : 78;

      ctx.save();

      // 1. Shaded FVG Rectangle Fill
      if (effectiveOpacity > 0) {
        ctx.fillStyle = hexToRgbaString(bgHex, effectiveOpacity);
        ctx.fillRect(clampedLeft, boxTop, boxW, boxH);
      }

      // 2. FVG Border
      const lineW = Number(tpl.linewidth) || 1;
      const lineS = Number(tpl.linestyle ?? 0);
      if (lineW > 0 && effectiveBorderOpacity > 0) {
        ctx.strokeStyle = hexToRgbaString(borderHex, effectiveBorderOpacity);
        ctx.lineWidth = lineW;
        if (lineS === 1) ctx.setLineDash([2, 3]);
        else if (lineS === 2) ctx.setLineDash([6, 4]);
        else ctx.setLineDash([]);
        ctx.strokeRect(clampedLeft + 0.5, boxTop + 0.5, Math.max(1, boxW - 1), Math.max(1, boxH - 1));
      }

      // 3. 50% Consequent Encroachment (Middle Line) if enabled in template or default settings
      const showMid = tpl.showMiddleLine !== undefined ? Boolean(tpl.showMiddleLine) : (fvgConfig.defaultShowMidline !== false);
      if (showMid && midY !== null && boxH >= 4 && effectiveMidlineOpacity > 0) {
        const midHex = useCustomReclaimedColor
          ? customReclaimedMidHex
          : parseColorAndAlpha(tpl.middleLineColor || borderHex, borderHex).hex;
        const midW = Number(tpl.middleLineWidth) || 1;
        const midS = tpl.middleLineStyle !== undefined ? Number(tpl.middleLineStyle) : 2;
        ctx.strokeStyle = hexToRgbaString(midHex, effectiveMidlineOpacity);
        ctx.lineWidth = midW;
        if (midS === 1) ctx.setLineDash([2, 3]);
        else if (midS === 2) ctx.setLineDash([5, 4]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(clampedLeft, Math.round(midY) + 0.5);
        ctx.lineTo(clampedRight, Math.round(midY) + 0.5);
        ctx.stroke();
      }

      // 4. Template Label Text (e.g. "5m FVG")
      const labelText = resolveAutoFvgDisplayText(fvg, fvgConfig);
      if (labelText && boxW >= 22) {
        const txtHex = useCustomReclaimedColor
          ? customReclaimedBorderHex
          : parseColorAndAlpha(tpl.textColor || borderHex, borderHex).hex;
        const fontSz = Math.max(9, Math.min(20, Number(tpl.fontSize) || 11));
        const fontBold = tpl.bold !== false ? '600' : '400';
        const fontItalic = tpl.italic ? 'italic ' : '';
        const hAlign = String(tpl.horzLabelsAlign || 'right').toLowerCase();
        const vAlign = String(tpl.vertLabelsAlign || 'middle').toLowerCase();

        ctx.font = `${fontItalic}${fontBold} ${fontSz}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif`;
        ctx.fillStyle = hexToRgbaString(txtHex, fvg.reclaimed ? (useCustomReclaimedColor ? Math.max(45, effectiveBorderOpacity) : 58) : 95);

        let textX = clampedRight - 5;
        if (hAlign === 'left') {
          ctx.textAlign = 'left';
          textX = clampedLeft + 5;
        } else if (hAlign === 'center') {
          ctx.textAlign = 'center';
          textX = clampedLeft + boxW / 2;
        } else {
          ctx.textAlign = 'right';
          textX = clampedRight - 5;
        }

        let textY = (boxTop + boxBottom) / 2;
        if (vAlign === 'top') {
          ctx.textBaseline = 'top';
          textY = boxTop + 2;
        } else if (vAlign === 'bottom') {
          ctx.textBaseline = 'bottom';
          textY = boxBottom - 2;
        } else {
          ctx.textBaseline = 'middle';
          textY = (boxTop + boxBottom) / 2;
        }

        ctx.fillText(labelText, textX, textY);
      }

      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // Candle OHLC (Open, High, Low, Close) Values Overlay & Click-to-Toggle Engine
  // -------------------------------------------------------------
  const CANDLE_OHLC_STORAGE_KEY = '__trading_cortex_candle_ohlc_toggled_v1__';
  let toggledCandleOhlcSet = new Set(); // Individually toggled ON when global "Show All Candles" is OFF
  let mutedCandleOhlcSet = new Set();   // Individually toggled OFF when global "Show All Candles" is ON
  let lastRenderedCandleOhlcHitBoxes = []; // [{ key, timeSec, left, top, right, bottom, barX }]

  function loadClickedCandleOhlcState() {
    try {
      const raw =
        window.localStorage.getItem(CANDLE_OHLC_STORAGE_KEY) ||
        (window.top && window.top !== window ? window.top.localStorage.getItem(CANDLE_OHLC_STORAGE_KEY) : null);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.toggled)) {
            toggledCandleOhlcSet = new Set(parsed.toggled.slice(-500));
          }
          if (Array.isArray(parsed.muted)) {
            mutedCandleOhlcSet = new Set(parsed.muted.slice(-500));
          }
        }
      }
    } catch (e) {}
  }

  function saveClickedCandleOhlcState() {
    try {
      const payload = JSON.stringify({
        toggled: Array.from(toggledCandleOhlcSet).slice(-500),
        muted: Array.from(mutedCandleOhlcSet).slice(-500)
      });
      window.localStorage.setItem(CANDLE_OHLC_STORAGE_KEY, payload);
      if (window.top && window.top !== window && window.top.localStorage) {
        window.top.localStorage.setItem(CANDLE_OHLC_STORAGE_KEY, payload);
      }
    } catch (e) {}
  }

  function clearAllClickedCandleOhlcState() {
    toggledCandleOhlcSet.clear();
    mutedCandleOhlcSet.clear();
    lastRenderedCandleOhlcHitBoxes = [];
    saveClickedCandleOhlcState();
  }

  loadClickedCandleOhlcState();

  function buildCandleOhlcKey(symbolKey, tfLabel, timeSec) {
    return `${symbolKey || 'SYM'}::${tfLabel || 'TF'}::${Math.round(Number(timeSec) || 0)}`;
  }

  function isCandleOhlcVisibleForBar(candleKey, allCandlesEnabled) {
    if (allCandlesEnabled) {
      return !mutedCandleOhlcSet.has(candleKey);
    }
    return toggledCandleOhlcSet.has(candleKey);
  }

  function toggleSingleCandleOhlcByKey(candleKey, allCandlesEnabled) {
    let nowVisible = false;
    if (allCandlesEnabled) {
      if (mutedCandleOhlcSet.has(candleKey)) {
        mutedCandleOhlcSet.delete(candleKey);
        nowVisible = true;
      } else {
        mutedCandleOhlcSet.add(candleKey);
        nowVisible = false;
      }
    } else {
      if (toggledCandleOhlcSet.has(candleKey)) {
        toggledCandleOhlcSet.delete(candleKey);
        nowVisible = false;
      } else {
        toggledCandleOhlcSet.add(candleKey);
        nowVisible = true;
      }
    }
    saveClickedCandleOhlcState();
    return nowVisible;
  }

  function formatCandleOhlcPrice(price, decimalsSetting, refLastPriceStr) {
    if (typeof price !== 'number' || !isFinite(price)) return '';
    if (decimalsSetting && decimalsSetting !== 'auto' && isFinite(Number(decimalsSetting))) {
      const d = Math.max(0, Math.min(6, Math.round(Number(decimalsSetting))));
      return price.toLocaleString('en-US', {
        minimumFractionDigits: d,
        maximumFractionDigits: d
      });
    }
    return formatChartPriceValue(price, refLastPriceStr);
  }

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function renderCandleOhlcOnCanvas(ctx, bars, coCfg, barToX, priceToY, barSpacing, cssWidth, cssHeight, symbolKey, tfLabel) {
    lastRenderedCandleOhlcHitBoxes = [];
    if (!bars || bars.length === 0) return;

    const cfg = coCfg || {};
    const allEnabled = Boolean(cfg.enabled);
    if (!allEnabled && toggledCandleOhlcSet.size === 0) return;

    const showO = cfg.showOpen !== false;
    const showH = cfg.showHigh !== false;
    const showL = cfg.showLow !== false;
    const showC = cfg.showClose !== false;
    if (!showO && !showH && !showL && !showC) return;

    const displayMode = cfg.displayMode === 'levels' ? 'levels' : 'badge';
    const fontSize = Math.max(8, Math.min(15, Number(cfg.fontSize) || 10));
    const decimalsSetting = cfg.decimals || 'auto';
    const bgHex = cfg.bgColor || '#0f172a';
    const bgOpacity = Math.max(20, Math.min(100, Number(cfg.bgOpacity ?? 88)));
    const textHex = cfg.textColor || '#f8fafc';
    const bullHex = cfg.bullColor || '#10b981';
    const bearHex = cfg.bearColor || '#f23645';
    const fontSpec = `600 ${fontSize}px "JetBrains Mono", Consolas, "SFMono-Regular", monospace`;

    // Determine visible bars that should display OHLC
    const activeBars = [];
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const key = buildCandleOhlcKey(symbolKey, tfLabel, b.timeSec);
      const isIndividuallyToggled = !allEnabled && toggledCandleOhlcSet.has(key);
      if (!isCandleOhlcVisibleForBar(key, allEnabled)) continue;

      const x = barToX(b.barIndex, b.timeSec);
      if (x === null || x < -40 || x > cssWidth + 40) continue;

      const highY = priceToY(b.high);
      const lowY = priceToY(b.low);
      const openY = priceToY(b.open);
      const closeY = priceToY(b.close);
      if (highY === null || lowY === null || openY === null || closeY === null) continue;

      activeBars.push({
        bar: b,
        key,
        isIndividuallyToggled,
        x,
        highY,
        lowY,
        openY,
        closeY,
        topY: Math.min(highY, lowY),
        bottomY: Math.max(highY, lowY),
        isBull: b.close >= b.open
      });
    }

    if (activeBars.length === 0) return;

    // When "Show All Candles" is ON and the user is zoomed out, stride auto-candles so cards don't overlap unreadable,
    // while ALWAYS rendering any candle the user explicitly clicked or the latest candle!
    let stride = 1;
    if (allEnabled && barSpacing < 56) {
      stride = Math.max(1, Math.ceil((displayMode === 'levels' ? 48 : 66) / Math.max(2, barSpacing)));
    }

    ctx.save();
    ctx.font = fontSpec;

    for (let idx = 0; idx < activeBars.length; idx++) {
      const item = activeBars[idx];
      const isLatestBar = item.bar.barIndex === bars[bars.length - 1].barIndex;
      const ExplicitlyClicked = toggledCandleOhlcSet.has(item.key);
      if (allEnabled && stride > 1 && !ExplicitlyClicked && !isLatestBar && (item.bar.barIndex % stride !== 0)) {
        continue;
      }

      const b = item.bar;
      const accentHex = item.isBull ? bullHex : bearHex;
      const lines = [];
      if (showO) lines.push({ tag: 'O', val: formatCandleOhlcPrice(b.open, decimalsSetting, lastTrackedPrice), y: item.openY, color: '#94a3b8' });
      if (showH) lines.push({ tag: 'H', val: formatCandleOhlcPrice(b.high, decimalsSetting, lastTrackedPrice), y: item.highY, color: bullHex });
      if (showL) lines.push({ tag: 'L', val: formatCandleOhlcPrice(b.low, decimalsSetting, lastTrackedPrice), y: item.lowY, color: bearHex });
      if (showC) lines.push({ tag: 'C', val: formatCandleOhlcPrice(b.close, decimalsSetting, lastTrackedPrice), y: item.closeY, color: accentHex });

      if (displayMode === 'levels') {
        // Price Tags at Exact O/H/L/C Levels on the Candle
        const tagH = fontSize + 5;
        const padX = 4;
        const placedYs = [];

        for (let lIdx = 0; lIdx < lines.length; lIdx++) {
          const ln = lines[lIdx];
          const labelStr = `${ln.tag} ${ln.val}`;
          const tw = Math.ceil(ctx.measureText(labelStr).width);
          const boxW = tw + padX * 2;
          let drawY = ln.y;
          // Slight vertical collision nudge if two levels (e.g. O and L) are identical
          for (const py of placedYs) {
            if (Math.abs(drawY - py) < tagH - 1) {
              drawY = drawY >= py ? py + tagH : py - tagH;
            }
          }
          placedYs.push(drawY);

          const isRightSide = (ln.tag === 'C' || ln.tag === 'H');
          const offsetX = Math.max(5, barSpacing * 0.42);
          let boxLeft = isRightSide ? (item.x + offsetX) : (item.x - offsetX - boxW);
          boxLeft = Math.max(4, Math.min(cssWidth - boxW - 4, boxLeft));
          const boxTop = Math.max(2, Math.min(cssHeight - tagH - 2, drawY - tagH / 2));

          // Connector tick from candle to level tag
          ctx.strokeStyle = hexToRgbaString(ln.color, 72);
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(item.x, Math.round(ln.y) + 0.5);
          ctx.lineTo(isRightSide ? boxLeft : (boxLeft + boxW), Math.round(boxTop + tagH / 2) + 0.5);
          ctx.stroke();
          ctx.setLineDash([]);

          drawRoundedRectPath(ctx, boxLeft, boxTop, boxW, tagH, 3);
          ctx.fillStyle = hexToRgbaString(bgHex, bgOpacity);
          ctx.fill();
          ctx.strokeStyle = hexToRgbaString(ln.color, 85);
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillStyle = ln.color;
          ctx.fillText(ln.tag, boxLeft + padX, boxTop + tagH / 2 + 0.5);
          const tagCharW = ctx.measureText(`${ln.tag} `).width;
          ctx.fillStyle = textHex;
          ctx.fillText(ln.val, boxLeft + padX + tagCharW, boxTop + tagH / 2 + 0.5);

          lastRenderedCandleOhlcHitBoxes.push({
            key: item.key,
            timeSec: b.timeSec,
            left: boxLeft - 2,
            top: boxTop - 2,
            right: boxLeft + boxW + 2,
            bottom: boxTop + tagH + 2,
            barX: item.x
          });
        }
      } else {
        // Stacked OHLC Callout Card above (or below) the candle with a crisp connector line
        const lineH = fontSize + 4;
        const padX = 6;
        const padY = 4;
        let maxLineW = 0;
        const tagPrefixW = Math.ceil(ctx.measureText('O ').width);
        for (let lIdx = 0; lIdx < lines.length; lIdx++) {
          const w = tagPrefixW + Math.ceil(ctx.measureText(lines[lIdx].val).width);
          if (w > maxLineW) maxLineW = w;
        }

        const cardW = maxLineW + padX * 2 + 3;
        const cardH = lines.length * lineH + padY * 2;
        const gapFromWick = 12;

        // Place above high wick by default; flip below low wick if near the top edge of the chart
        let placeAbove = (item.topY - gapFromWick - cardH >= 6);
        if (!placeAbove && (item.bottomY + gapFromWick + cardH > cssHeight - 6)) {
          placeAbove = item.topY > (cssHeight - item.bottomY);
        }

        // If placed below the candle and Candle Numbering is active on this bar, offset below the number glow box
        const isNumberedBar = Boolean(
          cfg.showCandleNumbers &&
          (bars.length - 1 - item.bar.barIndex) >= 0 &&
          (bars.length - item.bar.barIndex) <= Math.max(10, Math.min(300, Math.round(Number(cfg.candleNumbersMax) || 100)))
        );
        const belowOffset = isNumberedBar ? (gapFromWick + Math.round((Number(cfg.candleNumberFontSize) || 9.5) + 12)) : gapFromWick;

        let cardTop = placeAbove
          ? Math.max(4, item.topY - gapFromWick - cardH)
          : Math.min(cssHeight - cardH - 4, item.bottomY + belowOffset);
        let cardLeft = Math.round(item.x - cardW / 2);
        cardLeft = Math.max(4, Math.min(cssWidth - cardW - 4, cardLeft));

        // Subtle highlight ring on the candle wick tip + dashed stem connecting candle to the OHLC card
        const anchorY = placeAbove ? item.topY : item.bottomY;
        const stemEndY = placeAbove ? (cardTop + cardH) : cardTop;
        ctx.strokeStyle = hexToRgbaString(accentHex, 82);
        ctx.lineWidth = 1.15;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(Math.round(item.x) + 0.5, Math.round(anchorY));
        ctx.lineTo(Math.round(item.x) + 0.5, Math.round(stemEndY));
        ctx.stroke();
        ctx.setLineDash([]);

        // Small dot at the candle wick anchor
        ctx.fillStyle = accentHex;
        ctx.beginPath();
        ctx.arc(Math.round(item.x) + 0.5, Math.round(anchorY), 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Card background & border
        drawRoundedRectPath(ctx, cardLeft, cardTop, cardW, cardH, 5);
        ctx.fillStyle = hexToRgbaString(bgHex, bgOpacity);
        ctx.fill();
        ctx.strokeStyle = hexToRgbaString(accentHex, 78);
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Left vertical accent bar inside the card
        ctx.fillStyle = accentHex;
        ctx.fillRect(cardLeft + 1, cardTop + 3, 2.5, Math.max(2, cardH - 6));

        // Render O, H, L, C rows
        ctx.textBaseline = 'middle';
        for (let lIdx = 0; lIdx < lines.length; lIdx++) {
          const ln = lines[lIdx];
          const rowCenterY = cardTop + padY + lIdx * lineH + lineH / 2;
          ctx.textAlign = 'left';
          ctx.fillStyle = ln.color;
          ctx.fillText(ln.tag, cardLeft + padX + 2, rowCenterY);

          ctx.textAlign = 'right';
          ctx.fillStyle = textHex;
          ctx.fillText(ln.val, cardLeft + cardW - padX, rowCenterY);
        }

        lastRenderedCandleOhlcHitBoxes.push({
          key: item.key,
          timeSec: b.timeSec,
          left: cardLeft - 2,
          top: cardTop - 2,
          right: cardLeft + cardW + 2,
          bottom: cardTop + cardH + 2,
          barX: item.x
        });
      }
    }

    ctx.restore();
  }

  let cachedDetectedCandlePalette = null;
  let lastDetectedPaletteAt = 0;

  function detectChartCandleColors(mainSeries) {
    const now = Date.now();
    if (cachedDetectedCandlePalette && (now - lastDetectedPaletteAt < 1500)) {
      return cachedDetectedCandlePalette;
    }

    let upColor = '#eab308';
    let downColor = '#f23645';
    let borderUpColor = null;
    let borderDownColor = null;
    let wickUpColor = null;
    let wickDownColor = null;

    // 1. Inspect mainSeries.properties().childs().candleStyle
    try {
      if (mainSeries) {
        const propsObj = typeof mainSeries.properties === 'function' ? mainSeries.properties() : mainSeries._properties;
        const unwrapped = propsObj ? unwrapPropertyTree(propsObj) : null;
        const cs = (unwrapped && (unwrapped.candleStyle || unwrapped.hollowCandleStyle || unwrapped.barStyle)) || null;
        if (cs && typeof cs === 'object') {
          if (typeof cs.upColor === 'string' && cs.upColor) upColor = cs.upColor;
          if (typeof cs.downColor === 'string' && cs.downColor) downColor = cs.downColor;
          if (typeof cs.borderUpColor === 'string' && cs.borderUpColor) borderUpColor = cs.borderUpColor;
          if (typeof cs.borderDownColor === 'string' && cs.borderDownColor) borderDownColor = cs.borderDownColor;
          if (typeof cs.wickUpColor === 'string' && cs.wickUpColor) wickUpColor = cs.wickUpColor;
          if (typeof cs.wickDownColor === 'string' && cs.wickDownColor) wickDownColor = cs.wickDownColor;
        }
      }
    } catch (e) {}

    // 2. Fallback: check localStorage tradingview.chartproperties
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith('tradingview.chartproperties')) {
          const raw = window.localStorage.getItem(k);
          if (raw && raw.includes('candleStyle')) {
            const parsed = JSON.parse(raw);
            const cs = parsed?.mainSeriesProperties?.candleStyle || parsed?.candleStyle;
            if (cs && typeof cs === 'object') {
              if (typeof cs.upColor === 'string' && cs.upColor) upColor = cs.upColor;
              if (typeof cs.downColor === 'string' && cs.downColor) downColor = cs.downColor;
              if (typeof cs.borderUpColor === 'string' && cs.borderUpColor) borderUpColor = cs.borderUpColor;
              if (typeof cs.borderDownColor === 'string' && cs.borderDownColor) borderDownColor = cs.borderDownColor;
              if (typeof cs.wickUpColor === 'string' && cs.wickUpColor) wickUpColor = cs.wickUpColor;
              if (typeof cs.wickDownColor === 'string' && cs.wickDownColor) wickDownColor = cs.wickDownColor;
              break;
            }
          }
        }
      }
    } catch (e) {}

    cachedDetectedCandlePalette = {
      upColor,
      downColor,
      borderUpColor: borderUpColor || upColor,
      borderDownColor: borderDownColor || downColor,
      wickUpColor: wickUpColor || upColor,
      wickDownColor: wickDownColor || downColor
    };
    lastDetectedPaletteAt = now;
    return cachedDetectedCandlePalette;
  }

  let lastAppliedCustomCandleWidthScale = null;

  function applyCustomCandleWidthToChart(rawWidthPx, forceApply = false) {
    try {
      const cfg = (currentSettings && currentSettings.candleOhlc) || {};
      const isEnabled = forceApply ? Boolean(cfg.customCandleWidthEnabled !== false) : Boolean(cfg.customCandleWidthEnabled);
      if (!isEnabled) {
        lastAppliedCustomCandleWidthScale = null;
        scheduleIctSessionsRender(false);
        return;
      }

      const widthScalePct = Math.max(40, Math.min(260, Number(rawWidthPx ?? cfg.candleWidthPx) || 140));
      if (!forceApply && lastAppliedCustomCandleWidthScale === widthScalePct) {
        scheduleIctSessionsRender(false);
        return;
      }
      lastAppliedCustomCandleWidthScale = widthScalePct;

      // Map 40%..260% candle width scale to proportional horizontal barSpacing (px between candle centers)
      // so increasing or decreasing candle width forces adjacent candles on the left & right to space out proportionally without overlapping!
      const targetBarSpacing = Math.max(3.5, Math.round((8.5 * (widthScalePct / 100)) * 2) / 2);

      const model = findChartModelForSessions() || getInternalChartModel();
      const internalTs = model && typeof model.timeScale === 'function' ? model.timeScale() : (model ? model._timeScale : null);
      const tsApi = (activeChart && typeof activeChart.getTimeScale === 'function') ? activeChart.getTimeScale() : null;

      let preservedRightOffset = null;
      try {
        if (internalTs && typeof internalTs.rightOffset === 'function') {
          const ro = internalTs.rightOffset();
          if (typeof ro === 'number' && isFinite(ro)) preservedRightOffset = ro;
        } else if (tsApi && typeof tsApi.rightOffset === 'function') {
          const ro = tsApi.rightOffset();
          if (typeof ro === 'number' && isFinite(ro)) preservedRightOffset = ro;
        }
      } catch (e) {}

      let applied = false;
      try {
        if (tsApi && typeof tsApi.setBarSpacing === 'function') {
          tsApi.setBarSpacing(targetBarSpacing);
          applied = true;
        }
      } catch (e) {}
      try {
        if (internalTs && typeof internalTs.setBarSpacing === 'function') {
          internalTs.setBarSpacing(targetBarSpacing);
          applied = true;
        }
      } catch (e) {}

      // Keep the rightmost forming candle (#1) anchored at the same right offset so spacing out candles expands cleanly leftward
      if (applied && preservedRightOffset !== null) {
        try {
          if (tsApi && typeof tsApi.setRightOffset === 'function') {
            tsApi.setRightOffset(preservedRightOffset);
          } else if (internalTs && typeof internalTs.setRightOffset === 'function') {
            internalTs.setRightOffset(preservedRightOffset);
          }
        } catch (e) {}
      }
    } catch (e) {}

    scheduleIctSessionsRender(false);
  }

  function renderCustomWidthCandlesOnCanvas(ctx, bars, coCfg, barToX, priceToY, barSpacing, cssWidth, cssHeight, mainSeries) {
    if (!bars || bars.length === 0) return;
    const cfg = coCfg || {};
    if (!cfg.customCandleWidthEnabled) return;

    const widthScalePct = Math.max(40, Math.min(260, Number(cfg.candleWidthPx) || 140));
    const palette = detectChartCandleColors(mainSeries);

    // Ensure candle bodies NEVER overlap adjacent candles on the left or right by always reserving a clean inter-candle gap!
    const defaultBodyW = Math.max(1, barSpacing * 0.78);
    const minGapPx = barSpacing >= 10 ? 2.5 : (barSpacing >= 6 ? 1.5 : 1);
    const maxNonOverlappingBodyW = Math.max(1.5, barSpacing - minGapPx);
    const desiredBodyW = Math.max(1.5, barSpacing * 0.78 * Math.min(1.05, Math.max(0.55, widthScalePct / 100)));
    const targetBodyW = Math.min(maxNonOverlappingBodyW, desiredBodyW);
    const halfBodyW = targetBodyW / 2;
    const wickW = Math.max(1, Math.min(3.5, Math.round(targetBodyW * 0.14 * 2) / 2));

    ctx.save();

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const x = barToX(b.barIndex, b.timeSec);
      if (x === null || x < -40 || x > cssWidth + 40) continue;

      const openY = priceToY(b.open);
      const highY = priceToY(b.high);
      const lowY = priceToY(b.low);
      const closeY = priceToY(b.close);
      if (openY === null || highY === null || lowY === null || closeY === null) continue;

      const isBull = b.close >= b.open;
      const bodyFill = isBull ? palette.upColor : palette.downColor;
      const borderStroke = isBull ? palette.borderUpColor : palette.borderDownColor;
      const wickStroke = isBull ? palette.wickUpColor : palette.wickDownColor;

      const topWickY = Math.min(highY, lowY);
      const bottomWickY = Math.max(highY, lowY);
      const bodyTop = Math.min(openY, closeY);
      const bodyBottom = Math.max(openY, closeY);
      const bodyH = Math.max(1.5, bodyBottom - bodyTop);
      const crispX = Math.round(x) + 0.5;

      // If user made candles narrower than TradingView's native candle (< 98%), mask out the sides of the native candle body with the pane background
      if (widthScalePct < 98 && defaultBodyW > targetBodyW + 0.5) {
        const eraseHalf = (defaultBodyW / 2) + 1;
        ctx.fillStyle = '#0b0e14';
        ctx.fillRect(Math.round(x - eraseHalf), Math.round(bodyTop) - 0.5, Math.max(0, (eraseHalf - halfBodyW)), bodyH + 1);
        ctx.fillRect(Math.round(x + halfBodyW), Math.round(bodyTop) - 0.5, Math.max(0, (eraseHalf - halfBodyW)), bodyH + 1);
      }

      // 1. High-Low Wick
      ctx.strokeStyle = wickStroke;
      ctx.lineWidth = wickW;
      ctx.beginPath();
      ctx.moveTo(crispX, Math.round(topWickY));
      ctx.lineTo(crispX, Math.round(bottomWickY));
      ctx.stroke();

      // 2. Resized Candle Body centered on the bar's X coordinate
      const bodyLeft = Math.round((x - halfBodyW) * 2) / 2;
      ctx.fillStyle = bodyFill;
      ctx.fillRect(bodyLeft, Math.round(bodyTop), targetBodyW, bodyH);

      if (targetBodyW >= 4 && borderStroke && borderStroke !== bodyFill) {
        ctx.strokeStyle = borderStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(bodyLeft + 0.5, Math.round(bodyTop) + 0.5, Math.max(1, targetBodyW - 1), Math.max(1, bodyH - 1));
      }
    }

    ctx.restore();
  }

  function renderCandleNumbersOnCanvas(ctx, bars, coCfg, barToX, priceToY, barSpacing, cssWidth, cssHeight) {
    if (!bars || bars.length === 0) return;
    const cfg = coCfg || {};
    if (!cfg.showCandleNumbers) return;

    const maxCount = Math.max(10, Math.min(300, Math.round(Number(cfg.candleNumbersMax) || 100)));
    const glowColorHex = cfg.candleNumberGlowColor || '#38bdf8';
    const textColorHex = cfg.candleNumberTextColor || '#f8fafc';
    const bgColorHex = cfg.candleNumberBgColor || '#0f172a';
    const bgOpacity = Math.max(20, Math.min(100, Number(cfg.candleNumberBgOpacity ?? 90)));
    const baseFontSize = Math.max(7, Math.min(14, Number(cfg.candleNumberFontSize) || 9.5));
    // Auto-adapt font size slightly when candles are packed tightly so badges stay compact
    const fontSize = barSpacing < 14
      ? Math.max(7, Math.min(baseFontSize, Math.max(7.5, barSpacing * 0.72)))
      : baseFontSize;
    const fontSpec = `700 ${fontSize}px "JetBrains Mono", Consolas, "SFMono-Regular", monospace`;

    ctx.save();
    ctx.font = fontSpec;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxH = Math.round(fontSize + 5);
    const padX = barSpacing < 14 ? 2.5 : 4;
    const gapBelowWick = 5;

    // Track left-most occupied X (since we iterate right-to-left from #1 to #maxCount) per vertical stagger lane
    // so EVERY SINGLE CANDLE #1..#maxCount is labeled right below its low wick without ever skipping a candle!
    const laneLeftEdges = [Infinity, Infinity, Infinity];
    const minIdx = Math.max(0, bars.length - maxCount);

    for (let i = bars.length - 1; i >= minIdx; i--) {
      const b = bars[i];
      const candleNum = bars.length - i; // #1 is current forming candle, #2 is previous, ..., up to #maxCount
      const x = barToX(b.barIndex, b.timeSec);
      if (x === null || x < -30 || x > cssWidth + 30) continue;

      const lowY = priceToY(b.low);
      const highY = priceToY(b.high);
      const closeY = priceToY(b.close);
      const anchorY = (lowY !== null && highY !== null)
        ? Math.max(lowY, highY)
        : (lowY !== null ? lowY : (closeY !== null ? closeY : cssHeight * 0.65));

      const bottomWickY = Math.min(cssHeight - boxH - 6, Math.max(4, anchorY));
      const labelText = String(candleNum);
      const textW = Math.ceil(ctx.measureText(labelText).width);
      const boxW = Math.max(boxH - 1, textW + padX * 2);
      const boxLeft = Math.round(x - boxW / 2);
      const boxRight = boxLeft + boxW;

      // Pick the highest lane (0, 1, or 2) right below the candle where this glow box does not horizontally collide
      let chosenLane = 0;
      if (candleNum > 1 && boxRight + 1 > laneLeftEdges[0]) {
        if (boxRight + 1 <= laneLeftEdges[1]) {
          chosenLane = 1;
        } else if (boxRight + 1 <= laneLeftEdges[2]) {
          chosenLane = 2;
        } else {
          chosenLane = (candleNum - 1) % 2;
        }
      }
      laneLeftEdges[chosenLane] = boxLeft;

      const rawBoxTop = Math.round(bottomWickY + gapBelowWick + chosenLane * (boxH + 2));
      const boxTop = Math.max(2, Math.min(Math.max(2, cssHeight - boxH - 3), rawBoxTop));

      // Subtle connector tick if placed on lane 1 or 2
      if (chosenLane > 0 && boxTop > bottomWickY + 2) {
        ctx.save();
        ctx.strokeStyle = hexToRgbaString(glowColorHex, 45);
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, Math.round(bottomWickY + 2));
        ctx.lineTo(Math.round(x) + 0.5, boxTop);
        ctx.stroke();
        ctx.restore();
      }

      // Crisp outlined box right below the candle's low wick (no glow/shadowBlur)
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      drawRoundedRectPath(ctx, boxLeft, boxTop, boxW, boxH, 3.5);
      ctx.fillStyle = hexToRgbaString(bgColorHex, bgOpacity);
      ctx.fill();

      ctx.lineWidth = candleNum === 1 ? 1.4 : 1.05;
      ctx.strokeStyle = hexToRgbaString(glowColorHex, candleNum === 1 ? 100 : 85);
      ctx.stroke();
      ctx.restore();

      // Number label inside the glow box
      ctx.fillStyle = textColorHex;
      ctx.fillText(labelText, boxLeft + boxW / 2, boxTop + boxH / 2 + 0.5);
    }

    ctx.restore();
  }

  let lastChartPointerDownInfo = null;
  let lastCandleClickToggleTimestamp = 0;

  function isDrawingToolActivelySelectedOnChart() {
    try {
      const { detectedActiveTool } = scanDomSidebarGroupSlots();
      if (detectedActiveTool && !['cursor', 'dot', 'arrow', 'eraser'].includes(detectedActiveTool)) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function handlePotentialCandleClickOnCanvas(e) {
    if (!e || !lastChartPointerDownInfo) return;
    if (typeof e.button === 'number' && e.button !== 0) return;

    const now = Date.now();
    // Prevent duplicate fire when both pointerup and mouseup trigger on the same click
    if (now - lastCandleClickToggleTimestamp < 120) {
      lastChartPointerDownInfo = null;
      return;
    }

    const downInfo = lastChartPointerDownInfo;
    lastChartPointerDownInfo = null;

    const moveDist = Math.hypot((e.clientX || 0) - downInfo.clientX, (e.clientY || 0) - downInfo.clientY);
    const elapsedMs = now - downInfo.time;
    if (moveDist > 5 || elapsedMs > 500) return;

    const coCfg = (currentSettings && currentSettings.candleOhlc) || {};
    if (coCfg.clickCandleToToggle === false) return;

    // Do not toggle a candle if the user is actively drawing with a line/shape tool or clicked a drawing shape
    if (isDrawingToolActivelySelectedOnChart()) return;
    if (getHoveredOrSelectedIdFromModel(true)) return;

    const targetCanvas = findMainChartPaneCanvas();
    if (!targetCanvas) return;

    // Verify the click occurred inside the main chart pane canvas
    const targetDoc = targetCanvas.ownerDocument || document;
    const eventDoc = (e.target && e.target.ownerDocument) || document;
    if (targetDoc !== eventDoc) return;

    const rect = targetCanvas.getBoundingClientRect();
    const localX = (e.clientX || 0) - rect.left;
    const localY = (e.clientY || 0) - rect.top;
    if (localX < 0 || localX > rect.width || localY < 0 || localY > rect.height) return;

    const allEnabled = Boolean(coCfg.enabled);

    // 1. First check if the user clicked directly on an already-rendered OHLC card/tag on the canvas
    for (let i = lastRenderedCandleOhlcHitBoxes.length - 1; i >= 0; i--) {
      const box = lastRenderedCandleOhlcHitBoxes[i];
      if (localX >= box.left && localX <= box.right && localY >= box.top && localY <= box.bottom) {
        lastCandleClickToggleTimestamp = now;
        toggleSingleCandleOhlcByKey(box.key, allEnabled);
        scheduleIctSessionsRender(false);
        return;
      }
    }

    // 2. Otherwise hit-test the candle bodies and wicks on the chart
    const extracted = extractSeriesBarsFromModel();
    if (!extracted || !extracted.bars || extracted.bars.length === 0) return;

    const { mainSeries, timeScale, bars } = extracted;
    const tsApi = (activeChart && typeof activeChart.getTimeScale === 'function') ? activeChart.getTimeScale() : null;
    let barSpacing = 6;
    let rightOffset = null;
    try {
      if (timeScale && typeof timeScale.barSpacing === 'function') {
        barSpacing = Number(timeScale.barSpacing()) || 6;
      } else if (tsApi && typeof tsApi.barSpacing === 'function') {
        barSpacing = Number(tsApi.barSpacing()) || 6;
      }
      if (timeScale && typeof timeScale.rightOffset === 'function') {
        const ro = timeScale.rightOffset();
        if (typeof ro === 'number' && isFinite(ro)) rightOffset = ro;
      } else if (tsApi && typeof tsApi.rightOffset === 'function') {
        const ro = tsApi.rightOffset();
        if (typeof ro === 'number' && isFinite(ro)) rightOffset = ro;
      }
    } catch (err) {}

    let visibleRange = null;
    try {
      if (activeChart && typeof activeChart.getVisibleRange === 'function') {
        visibleRange = activeChart.getVisibleRange();
      }
    } catch (err) {}

    const cssWidth = targetCanvas.clientWidth || Math.round(rect.width);
    const cssHeight = targetCanvas.clientHeight || Math.round(rect.height);
    const lastBar = bars[bars.length - 1];
    const baseIndex = lastBar.barIndex;
    const hasIndexToCoord = Boolean(timeScale && typeof timeScale.indexToCoordinate === 'function');
    const hasTimeToCoord = Boolean(tsApi && typeof tsApi.timeToCoordinate === 'function');

    const barToX = (barIndex, timeSec) => {
      if (hasIndexToCoord && typeof barIndex === 'number') {
        try {
          const x = timeScale.indexToCoordinate(barIndex);
          if (typeof x === 'number' && isFinite(x)) return x;
        } catch (err) {}
      }
      if (hasTimeToCoord && typeof timeSec === 'number') {
        try {
          const x = tsApi.timeToCoordinate(timeSec);
          if (typeof x === 'number' && isFinite(x)) return x;
        } catch (err) {}
      }
      if (rightOffset !== null && typeof barIndex === 'number' && typeof baseIndex === 'number') {
        const deltaFromRight = baseIndex + rightOffset - barIndex;
        return cssWidth - (deltaFromRight + 0.5) * barSpacing - 1;
      }
      if (visibleRange && visibleRange.to > visibleRange.from && typeof timeSec === 'number') {
        return ((timeSec - visibleRange.from) / (visibleRange.to - visibleRange.from)) * cssWidth;
      }
      return null;
    };

    const internalPs = (mainSeries && typeof mainSeries.priceScale === 'function') ? mainSeries.priceScale() : null;
    const psApi = getPrimaryPriceScaleApi();
    let firstValue = null;
    try {
      if (mainSeries && typeof mainSeries.firstValue === 'function') {
        const fv = mainSeries.firstValue();
        firstValue = (fv && typeof fv === 'object' && 'value' in fv) ? fv.value : fv;
      }
      if ((firstValue === null || firstValue === undefined) && internalPs && typeof internalPs.firstValue === 'function') {
        const fv = internalPs.firstValue();
        firstValue = (fv && typeof fv === 'object' && 'value' in fv) ? fv.value : fv;
      }
      if ((firstValue === null || firstValue === undefined) && bars.length > 0) {
        firstValue = bars[0].close;
      }
    } catch (err) {}

    let visiblePriceRange = null;
    try {
      if (internalPs && typeof internalPs.priceRange === 'function') {
        const pr = internalPs.priceRange();
        if (pr) {
          const minV = typeof pr.minValue === 'function' ? pr.minValue() : pr.from;
          const maxV = typeof pr.maxValue === 'function' ? pr.maxValue() : pr.to;
          if (typeof minV === 'number' && typeof maxV === 'number' && maxV > minV) {
            visiblePriceRange = { from: minV, to: maxV };
          }
        }
      }
      if (!visiblePriceRange && psApi && typeof psApi.getVisiblePriceRange === 'function') {
        visiblePriceRange = psApi.getVisiblePriceRange();
      }
    } catch (err) {}

    let psTopMargin = 0;
    let psBottomMargin = 0;
    try {
      if (internalPs) {
        if (typeof internalPs.topMarginPx === 'function') psTopMargin = Number(internalPs.topMarginPx()) || 0;
        if (typeof internalPs.bottomMarginPx === 'function') psBottomMargin = Number(internalPs.bottomMarginPx()) || 0;
      }
    } catch (err) {}

    const priceToY = (price) => {
      try {
        if (internalPs && typeof internalPs.priceToCoordinate === 'function') {
          const y = internalPs.priceToCoordinate(price, firstValue);
          if (typeof y === 'number' && isFinite(y)) return y;
        }
      } catch (err) {}
      try {
        if (psApi && typeof psApi.priceToCoordinate === 'function') {
          const y = psApi.priceToCoordinate(price);
          if (typeof y === 'number' && isFinite(y)) return y;
        }
      } catch (err) {}
      if (visiblePriceRange && visiblePriceRange.to !== visiblePriceRange.from) {
        const usableH = Math.max(1, cssHeight - psTopMargin - psBottomMargin);
        return psTopMargin + usableH - ((price - visiblePriceRange.from) / (visiblePriceRange.to - visiblePriceRange.from)) * usableH;
      }
      return null;
    };

    const maxHorzTolerance = Math.max(6, barSpacing * 0.62);
    let bestBar = null;
    let bestDx = Infinity;

    for (let i = bars.length - 1; i >= 0; i--) {
      const b = bars[i];
      const bx = barToX(b.barIndex, b.timeSec);
      if (bx === null) continue;
      const dx = Math.abs(localX - bx);
      if (dx <= maxHorzTolerance && dx < bestDx) {
        const highY = priceToY(b.high);
        const lowY = priceToY(b.low);
        if (highY === null || lowY === null) continue;
        const minY = Math.min(highY, lowY) - 14;
        const maxY = Math.max(highY, lowY) + 14;
        if (localY >= minY && localY <= maxY) {
          bestDx = dx;
          bestBar = b;
        }
      }
    }

    if (!bestBar) return;

    lastCandleClickToggleTimestamp = now;
    const symbolKey = getCurrentChartSymbolKey();
    const tfLabel = formatCurrentResolutionLabel();
    const candleKey = buildCandleOhlcKey(symbolKey, tfLabel, bestBar.timeSec);
    toggleSingleCandleOhlcByKey(candleKey, allEnabled);
    scheduleIctSessionsRender(false);
  }

  let ictPriceScaleBadgeContainer = null;

  function formatSessionShortDate(anchorDateKey, patternStr) {
    if (!anchorDateKey || typeof anchorDateKey !== 'string') return '';
    const parts = anchorDateKey.split('-');
    if (parts.length !== 3) return anchorDateKey;
    const yyyy = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isFinite(yyyy) || !isFinite(m) || !isFinite(d)) return anchorDateKey;

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const fmt = (typeof patternStr === 'string' && patternStr.trim()) ? patternStr.trim() : 'M-d-y';
    const tokenMap = {
      MMMM: monthsFull[m - 1] || String(m),
      MMM: monthsShort[m - 1] || String(m),
      MM: String(m).padStart(2, '0'),
      M: String(m),
      dd: String(d).padStart(2, '0'),
      DD: String(d).padStart(2, '0'),
      d: String(d),
      D: String(d),
      yyyy: String(yyyy),
      YYYY: String(yyyy),
      yy: String(yyyy).slice(-2),
      YY: String(yyyy).slice(-2),
      y: String(yyyy).slice(-2),
      Y: String(yyyy).slice(-2)
    };

    return fmt.replace(/MMMM|MMM|MM|M|dd|DD|d|D|yyyy|YYYY|yy|YY|y|Y/g, (match) => {
      return tokenMap[match] !== undefined ? tokenMap[match] : match;
    });
  }

  function formatSessionDisplayTitle(def) {
    if (!def) return 'Session';
    const wm = String(def.watermarkText || '').trim();
    if (wm) {
      // e.g. "NY AM" -> "AM" or keep "NY AM", "London", "Asia", "NY Lunch", "NY PM"
      return wm;
    }
    return String(def.name || 'Session').replace(/\s*Killzone/i, '').trim();
  }

  function formatChartPriceValue(price, refLastPriceStr) {
    if (typeof price !== 'number' || !isFinite(price)) return '';
    let decimals = 2;
    if (refLastPriceStr && typeof refLastPriceStr === 'string') {
      const cleaned = refLastPriceStr.replace(/,/g, '').trim();
      const dotIdx = cleaned.indexOf('.');
      if (dotIdx !== -1) {
        decimals = Math.max(2, Math.min(6, cleaned.length - dotIdx - 1));
      }
    } else if (Math.abs(price) < 1) {
      decimals = 4;
    } else if (Math.abs(price) < 10) {
      decimals = 3;
    }
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function getContrastTextColorForHex(hex) {
    const parsed = parseColorAndAlpha(hex, '#26a69a');
    const c = parsed.hex.replace('#', '');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 155 ? '#0f172a' : '#ffffff';
  }

  function clearIctPriceScaleBadges() {
    try {
      if (ictPriceScaleBadgeContainer) {
        ictPriceScaleBadgeContainer.innerHTML = '';
        ictPriceScaleBadgeContainer.style.display = 'none';
      }
      const docs = [document];
      document.querySelectorAll('iframe').forEach(ifr => {
        try { if (ifr.contentDocument && !docs.includes(ifr.contentDocument)) docs.push(ifr.contentDocument); } catch (e) {}
      });
      docs.forEach(d => {
        try {
          d.querySelectorAll('.vest-ict-price-axis-badges').forEach(el => {
            if (el !== ictPriceScaleBadgeContainer) el.remove();
          });
        } catch (e) {}
      });
    } catch (e) {}
  }

  let cachedPriceAxisHost = null;
  let cachedPriceAxisTargetCanvas = null;
  let lastPriceAxisBadgesHtml = '';

  function renderIctPriceScaleBadges(targetChartCanvas, badgeItems, cssHeight) {
    if (!targetChartCanvas || !badgeItems || badgeItems.length === 0) {
      clearIctPriceScaleBadges();
      lastPriceAxisBadgesHtml = '';
      return;
    }

    const ownerDoc = targetChartCanvas.ownerDocument || document;

    // Locate and cache the right-hand price axis container
    let axisHost = (cachedPriceAxisTargetCanvas === targetChartCanvas && cachedPriceAxisHost && cachedPriceAxisHost.isConnected)
      ? cachedPriceAxisHost
      : null;

    if (!axisHost) {
      try {
        const chartRect = targetChartCanvas.getBoundingClientRect();
        const parentTd = targetChartCanvas.closest('td');
        if (parentTd && parentTd.nextElementSibling) {
          axisHost = parentTd.nextElementSibling.querySelector('div') || parentTd.nextElementSibling;
        }
        if (!axisHost) {
          const allCanvases = ownerDoc.querySelectorAll('canvas:not(.vest-ict-sessions-canvas)');
          for (const c of allCanvases) {
            if (c === targetChartCanvas) continue;
            const r = c.getBoundingClientRect();
            if (
              Math.abs(r.top - chartRect.top) < 20 &&
              Math.abs(r.height - chartRect.height) < 30 &&
              r.left >= chartRect.right - 8 &&
              r.width >= 35 &&
              r.width <= 140
            ) {
              axisHost = c.parentElement;
              break;
            }
          }
        }
      } catch (e) {}
      cachedPriceAxisHost = axisHost;
      cachedPriceAxisTargetCanvas = targetChartCanvas;
    }

    const mountParent = axisHost || targetChartCanvas.parentElement;
    if (!mountParent) return;

    const isInsideAxis = Boolean(axisHost);
    if (
      !ictPriceScaleBadgeContainer ||
      !ictPriceScaleBadgeContainer.isConnected ||
      ictPriceScaleBadgeContainer.parentElement !== mountParent
    ) {
      if (ictPriceScaleBadgeContainer) {
        try { ictPriceScaleBadgeContainer.remove(); } catch (e) {}
      }
      ictPriceScaleBadgeContainer = ownerDoc.createElement('div');
      ictPriceScaleBadgeContainer.className = 'vest-ict-price-axis-badges';
      const cs = ownerDoc.defaultView ? ownerDoc.defaultView.getComputedStyle(mountParent) : null;
      if (cs && cs.position === 'static') {
        mountParent.style.position = 'relative';
      }
      ictPriceScaleBadgeContainer.style.cssText = isInsideAxis
        ? 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:6;overflow:hidden;user-select:none;'
        : 'position:absolute;top:0;right:0;width:68px;bottom:0;pointer-events:none;z-index:6;overflow:visible;user-select:none;';
      mountParent.appendChild(ictPriceScaleBadgeContainer);
      lastPriceAxisBadgesHtml = '';
    }

    if (ictPriceScaleBadgeContainer.style.display !== 'block') {
      ictPriceScaleBadgeContainer.style.display = 'block';
    }

    let html = '';
    for (let i = 0; i < badgeItems.length; i++) {
      const b = badgeItems[i];
      if (b.y < 8 || b.y > cssHeight - 8) continue;
      const priceText = formatChartPriceValue(b.price, lastTrackedPrice);
      const fg = getContrastTextColorForHex(b.color);
      html += `<div style="position:absolute;left:${isInsideAxis ? '1px' : 'auto'};right:${isInsideAxis ? '2px' : '0px'};top:${Math.round(b.y)}px;transform:translateY(-50%);background:${b.color};color:${fg};font-family:-apple-system,BlinkMacSystemFont,'Trebuchet MS',Roboto,sans-serif;font-size:10.5px;font-weight:700;line-height:15px;height:16px;padding:0 5px;border-radius:2px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:flex-start;letter-spacing:0.1px;">${priceText}</div>`;
    }
    if (html !== lastPriceAxisBadgesHtml) {
      ictPriceScaleBadgeContainer.innerHTML = html;
      lastPriceAxisBadgesHtml = html;
    }
  }

  function renderIctSessionIndicators() {
    ictSessionsRafId = null;

    const config = currentSettings && currentSettings.sessionIndicators;
    const cortexConfig = currentSettings && currentSettings.cortexIndicator;
    const fvgConfig = currentSettings && currentSettings.autoFvg;
    const candleOhlcConfig = currentSettings && currentSettings.candleOhlc;
    const failLinesEnabled = Boolean(currentSettings && currentSettings.failLines && currentSettings.failLines.enabled);
    const cortexIndicatorEnabled = Boolean(cortexConfig && cortexConfig.enabled);
    if (!failLinesEnabled) removeFailPriceLineButtons();
    if (!cortexIndicatorEnabled) syncCortexManualBuyButton(false, '', null);
    const sessionsEnabled = Boolean(config && config.enabled && isIntradayChartResolution());
    const autoFvgEnabled = Boolean(fvgConfig && fvgConfig.enabled);
    const candleNumbersEnabled = Boolean(candleOhlcConfig && candleOhlcConfig.showCandleNumbers);
    const customCandleWidthEnabled = Boolean(candleOhlcConfig && candleOhlcConfig.customCandleWidthEnabled);
    const candleOhlcEnabled = Boolean((candleOhlcConfig && candleOhlcConfig.enabled) || toggledCandleOhlcSet.size > 0);

    if (!autoFvgEnabled && nativeAutoFvgShapesMap.size > 0) {
      cleanupNativeAutoFvgShapes(null);
    }

    if (!sessionsEnabled && !autoFvgEnabled && !candleOhlcEnabled && !candleNumbersEnabled && !customCandleWidthEnabled && !failLinesEnabled && !cortexIndicatorEnabled) {
      lastRenderedCandleOhlcHitBoxes = [];
      if (ictSessionsCanvas) {
        const ctx = ictSessionsCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, ictSessionsCanvas.width, ictSessionsCanvas.height);
        ictSessionsCanvas.style.display = 'none';
      }
      clearIctPriceScaleBadges();
      return;
    }

    const targetCanvas = findMainChartPaneCanvas();
    if (!targetCanvas) return;

    const extracted = extractSeriesBarsFromModel();
    if (!extracted || !extracted.bars || extracted.bars.length === 0) {
      return;
    }

    if (extracted.model) {
      attachDirectScaleListeners(extracted.model);
    }

    const { mainSeries, timeScale, bars } = extracted;

    const lastBar = bars[bars.length - 1];
    latestChartMarketPrice = Number(lastBar && lastBar.close);
    const prevBar = bars.length > 1 ? bars[bars.length - 2] : lastBar;
    const barIntervalSec = (bars.length > 1 && lastBar.timeSec > prevBar.timeSec)
      ? (lastBar.timeSec - prevBar.timeSec)
      : 300;
    const symbolKey = getCurrentChartSymbolKey();
    syncCortexManualBuyButton(cortexIndicatorEnabled, symbolKey, latestChartMarketPrice);
    const barsSig = `${symbolKey}_${bars.length}_${bars[0].timeSec}_${bars[0].close}_${prevBar.high}_${prevBar.low}_${lastBar.timeSec}_${lastBar.high}_${lastBar.low}_${lastBar.close}`;

    if (sessionsEnabled) {
      const configSig = JSON.stringify(config);
      if (
        ictSessionsNeedsFullRecompute ||
        barsSig !== cachedIctBarsSignature ||
        configSig !== cachedIctConfigSignature
      ) {
        cachedIctComputedSessions = computeIctSessionsFromBars(bars, config);
        cachedIctBarsSignature = barsSig;
        cachedIctConfigSignature = configSig;
      }
    } else {
      cachedIctComputedSessions = [];
    }

    if (autoFvgEnabled) {
      const existingRectsSnap = getExistingChartRectangleBoundsList(bars);
      const existingRectsSig = existingRectsSnap
        .map(r => `${r.entityId}:${Math.round(r.startTimeSec)}:${r.top.toFixed(2)}:${r.bottom.toFixed(2)}`)
        .join('|');
      const autoFvgSig = `${barsSig}_${existingRectsSig}_${formatCurrentResolutionLabel()}_${JSON.stringify(fvgConfig)}_${JSON.stringify(currentTemplates)}`;
      if (
        ictSessionsNeedsFullRecompute ||
        autoFvgSig !== cachedAutoFvgSignature
      ) {
        cachedComputedAutoFvgs = computeAutoFvgsFromBars(bars, fvgConfig);
        cachedAutoFvgSignature = autoFvgSig;
        syncNativeTradingViewAutoFvgShapes(cachedComputedAutoFvgs, fvgConfig, barIntervalSec, bars);
      }
    } else {
      cachedComputedAutoFvgs = [];
    }

    ictSessionsNeedsFullRecompute = false;

    const overlay = ensureIctSessionsOverlayCanvas(targetCanvas);
    if (!overlay) return;
    if (overlay.style.display !== 'block') {
      overlay.style.display = 'block';
    }

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const cssWidth = targetCanvas.clientWidth || Math.round(targetCanvas.getBoundingClientRect().width) || overlay.width;
    const cssHeight = targetCanvas.clientHeight || Math.round(targetCanvas.getBoundingClientRect().height) || overlay.height;
    const dpr = cssWidth > 0 ? overlay.width / cssWidth : (window.devicePixelRatio || 1);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.scale(dpr, dpr);

    const hasCanvasFvgs = autoFvgEnabled && !fvgConfig.syncNativeDrawings && cachedComputedAutoFvgs.length > 0;
    if ((!sessionsEnabled || cachedIctComputedSessions.length === 0) && !hasCanvasFvgs && !candleOhlcEnabled && !candleNumbersEnabled && !customCandleWidthEnabled && !cortexIndicatorEnabled) {
      lastRenderedCandleOhlcHitBoxes = [];
      clearIctPriceScaleBadges();
      ctx.restore();
      return;
    }

    const tsApi = (activeChart && typeof activeChart.getTimeScale === 'function') ? activeChart.getTimeScale() : null;
    let barSpacing = 6;
    let rightOffset = null;
    try {
      if (timeScale && typeof timeScale.barSpacing === 'function') {
        barSpacing = Number(timeScale.barSpacing()) || 6;
      } else if (tsApi && typeof tsApi.barSpacing === 'function') {
        barSpacing = Number(tsApi.barSpacing()) || 6;
      }
      if (timeScale && typeof timeScale.rightOffset === 'function') {
        const ro = timeScale.rightOffset();
        if (typeof ro === 'number' && isFinite(ro)) rightOffset = ro;
      } else if (tsApi && typeof tsApi.rightOffset === 'function') {
        const ro = tsApi.rightOffset();
        if (typeof ro === 'number' && isFinite(ro)) rightOffset = ro;
      }
    } catch (e) {}

    let visibleRange = null;
    try {
      if (activeChart && typeof activeChart.getVisibleRange === 'function') {
        visibleRange = activeChart.getVisibleRange();
      }
    } catch (e) {}

    const baseIndex = lastBar.barIndex;
    const hasIndexToCoord = Boolean(timeScale && typeof timeScale.indexToCoordinate === 'function');
    const hasTimeToCoord = Boolean(tsApi && typeof tsApi.timeToCoordinate === 'function');

    // Note: During an active mouse drag, activeChart.getVisibleRange() in TradingView only updates on mouseup,
    // WHEREAS timeScale.indexToCoordinate(), timeScale.rightOffset(), and timeScale.barSpacing() update on every single pixel of drag!
    const barToX = (barIndex, timeSec) => {
      if (hasIndexToCoord && typeof barIndex === 'number') {
        try {
          const x = timeScale.indexToCoordinate(barIndex);
          if (typeof x === 'number' && isFinite(x)) return x;
        } catch (e) {}
      }
      if (hasTimeToCoord && typeof timeSec === 'number') {
        try {
          const x = tsApi.timeToCoordinate(timeSec);
          if (typeof x === 'number' && isFinite(x)) return x;
        } catch (e) {}
      }
      if (rightOffset !== null && typeof barIndex === 'number' && typeof baseIndex === 'number') {
        // TradingView exact formula: coordinate of barIndex given baseIndex, rightOffset, and barSpacing
        const deltaFromRight = baseIndex + rightOffset - barIndex;
        return cssWidth - (deltaFromRight + 0.5) * barSpacing - 1;
      }
      if (visibleRange && visibleRange.to > visibleRange.from && typeof timeSec === 'number') {
        return ((timeSec - visibleRange.from) / (visibleRange.to - visibleRange.from)) * cssWidth;
      }
      return null;
    };

    const internalPs = (mainSeries && typeof mainSeries.priceScale === 'function') ? mainSeries.priceScale() : null;
    const psApi = getPrimaryPriceScaleApi();
    let firstValue = null;
    try {
      if (mainSeries && typeof mainSeries.firstValue === 'function') {
        const fv = mainSeries.firstValue();
        firstValue = (fv && typeof fv === 'object' && 'value' in fv) ? fv.value : fv;
      }
      if ((firstValue === null || firstValue === undefined) && internalPs && typeof internalPs.firstValue === 'function') {
        const fv = internalPs.firstValue();
        firstValue = (fv && typeof fv === 'object' && 'value' in fv) ? fv.value : fv;
      }
      if ((firstValue === null || firstValue === undefined) && bars.length > 0) {
        firstValue = bars[0].close;
      }
    } catch (e) {}

    let visiblePriceRange = null;
    try {
      // Prefer internalPs.priceRange() first because psApi.getVisiblePriceRange() is unpadded while internalPs.priceRange() or priceToCoordinate includes top/bottom margins!
      if (internalPs && typeof internalPs.priceRange === 'function') {
        const pr = internalPs.priceRange();
        if (pr) {
          const minV = typeof pr.minValue === 'function' ? pr.minValue() : pr.from;
          const maxV = typeof pr.maxValue === 'function' ? pr.maxValue() : pr.to;
          if (typeof minV === 'number' && typeof maxV === 'number' && maxV > minV) {
            visiblePriceRange = { from: minV, to: maxV };
          }
        }
      }
      if (!visiblePriceRange && psApi && typeof psApi.getVisiblePriceRange === 'function') {
        visiblePriceRange = psApi.getVisiblePriceRange();
      }
    } catch (e) {}

    let psTopMargin = 0;
    let psBottomMargin = 0;
    try {
      if (internalPs) {
        if (typeof internalPs.topMarginPx === 'function') psTopMargin = Number(internalPs.topMarginPx()) || 0;
        if (typeof internalPs.bottomMarginPx === 'function') psBottomMargin = Number(internalPs.bottomMarginPx()) || 0;
      }
    } catch (e) {}

    const priceToY = (price) => {
      try {
        if (internalPs && typeof internalPs.priceToCoordinate === 'function') {
          const y = internalPs.priceToCoordinate(price, firstValue);
          if (typeof y === 'number' && isFinite(y)) return y;
        }
      } catch (e) {}
      try {
        if (psApi && typeof psApi.priceToCoordinate === 'function') {
          const y = psApi.priceToCoordinate(price);
          if (typeof y === 'number' && isFinite(y)) return y;
        }
      } catch (e) {}
      if (visiblePriceRange && visiblePriceRange.to !== visiblePriceRange.from) {
        const usableH = Math.max(1, cssHeight - psTopMargin - psBottomMargin);
        return psTopMargin + usableH - ((price - visiblePriceRange.from) / (visiblePriceRange.to - visiblePriceRange.from)) * usableH;
      }
      return null;
    };

    if (cortexIndicatorEnabled) {
      const ci = cortexConfig;
      const emaLen = Math.max(5, Math.min(200, Number(ci.emaLength) || 34));
      const atrLen = Math.max(3, Math.min(100, Number(ci.atrLength) || 14));
      const multiplier = Math.max(1, Math.min(6, Number(ci.trendMultiplier) || 2.6));
      const points = [];
      let ema = Number(bars[0].close);
      let atr = 0;
      let trSeed = 0;
      let trCount = 0;
      let priorClose = Number(bars[0].close);
      let finalUpper = null;
      let finalLower = null;
      let direction = 1;
      let priorDirection = 1;
      const emaAlpha = 2 / (emaLen + 1);
      const trueRanges = [];
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const high = Number(bar.high), low = Number(bar.low), close = Number(bar.close);
        if (![high, low, close].every(Number.isFinite)) continue;
        ema = i === 0 ? close : close * emaAlpha + ema * (1 - emaAlpha);
        const tr = i === 0 ? high - low : Math.max(high - low, Math.abs(high - priorClose), Math.abs(low - priorClose));
        trueRanges.push(tr);
        if (trCount < atrLen) {
          trSeed += tr;
          trCount++;
          atr = trSeed / trCount;
        } else {
          atr = ((atr * (atrLen - 1)) + tr) / atrLen;
        }
        priorClose = close;
        const mid = (high + low) / 2;
        const basicUpper = mid + multiplier * atr;
        const basicLower = mid - multiplier * atr;
        const prev = points.length ? points[points.length - 1] : null;
        const nextUpper = finalUpper === null || basicUpper < finalUpper || (prev && prev.close > finalUpper) ? basicUpper : finalUpper;
        const nextLower = finalLower === null || basicLower > finalLower || (prev && prev.close < finalLower) ? basicLower : finalLower;
        priorDirection = direction;
        if (prev) {
          if (direction < 0 && close > finalUpper) direction = 1;
          else if (direction > 0 && close < finalLower) direction = -1;
        }
        finalUpper = nextUpper;
        finalLower = nextLower;
        const stop = direction > 0 ? finalLower : finalUpper;
        points.push({
          index: bar.barIndex,
          timeSec: bar.timeSec,
          high, low, close, ema, atr,
          stop,
          direction,
          flip: prev && direction !== priorDirection ? direction : 0
        });
      }

      const automationConfig = currentSettings && currentSettings.cortexIndicator;
      const resolution = formatCurrentResolutionLabel();
      if (automationConfig && automationConfig.enabled === true && points.length > 1 &&
          (automationConfig.formingSignalVoiceAlert !== false || automationConfig.confirmedSignalVoiceAlert !== false)) {
        const alertContextKey = `${symbolKey}:${resolution}`;
        const currentPoint = points[points.length - 1];
        if (automationConfig.formingSignalVoiceAlert !== false && currentPoint.flip) {
          const side = currentPoint.flip > 0 ? 'long' : 'short';
          const formingKey = `${symbolKey}:${resolution}:${currentPoint.timeSec}`;
          if (formingKey !== lastCortexFormingAlertKey) {
            lastCortexFormingAlertKey = formingKey;
            postToIsolated({
              type: 'VEST_TV_CI_SIGNAL_FORMING',
              payload: { symbol: symbolKey, resolution, timeSec: currentPoint.timeSec, side }
            });
          }
        }
        const closedPoint = points[points.length - 2];
        const closedBarKey = `${symbolKey}:${resolution}:${closedPoint.timeSec}`;
        if (automationConfig.confirmedSignalVoiceAlert !== false && alertContextKey === lastCortexAlertContextKey &&
            lastCortexAlertClosedBarKey && closedBarKey !== lastCortexAlertClosedBarKey && closedPoint.flip) {
          postToIsolated({
            type: 'VEST_TV_CI_SIGNAL_CONFIRMED',
            payload: { symbol: symbolKey, resolution, timeSec: closedPoint.timeSec, side: closedPoint.flip > 0 ? 'long' : 'short' }
          });
        }
        lastCortexAlertContextKey = alertContextKey;
        lastCortexAlertClosedBarKey = closedBarKey;
      } else {
        lastCortexAlertClosedBarKey = '';
        lastCortexAlertContextKey = '';
        lastCortexFormingAlertKey = '';
      }
      if (automationConfig && automationConfig.enabled === true && automationConfig.executionEnabled === true && points.length > 1) {
        const closedPoint = points[points.length - 2];
        const contextKey = `${symbolKey}:${resolution}`;
        const closedBarKey = `${symbolKey}:${resolution}:${closedPoint.timeSec}`;
        const contextChanged = contextKey !== lastCortexAutomationContextKey;
        if (!contextChanged && lastCortexAutomationClosedBarKey && closedBarKey !== lastCortexAutomationClosedBarKey) {
          const side = closedPoint.flip > 0 ? 'long' : closedPoint.flip < 0 ? 'short' : null;
          const signalId = side ? `${symbolKey}:${resolution}:${closedPoint.timeSec}:${side}` : '';
          const sideSign = side === 'long' ? 1 : -1;
          const fixedPointMode = automationConfig.levelDistanceMode !== 'atr';
          const entryPrice = Number(closedPoint.close);
          const stopDistance = Math.max(1, Math.min(20, Number(automationConfig.stopLossPoints) || 8));
          const targetSpacing = Math.max(0.25, Math.min(20, Number(automationConfig.targetSpacingPoints) || 4));
          const stopPrice = fixedPointMode ? entryPrice - sideSign * stopDistance : Number(closedPoint.stop);
          const risk = Math.abs(entryPrice - stopPrice) || Number(closedPoint.atr) * (Number(automationConfig.trendMultiplier) || 2.6);
          const targetMultipliers = Array.isArray(automationConfig.targetRiskMultipliers) ? automationConfig.targetRiskMultipliers : [1, 2, 3];
          const targetPrices = [0, 1, 2].map(i => entryPrice + sideSign * (fixedPointMode ? targetSpacing * (i + 1) : risk * (Number(targetMultipliers[i]) || i + 1)));
          postToIsolated({
            type: 'VEST_TV_CI_BAR_CLOSED',
            payload: {
              symbol: symbolKey,
              resolution,
              bar: {
                barIndex: points.length - 2,
                timeSec: closedPoint.timeSec,
                high: closedPoint.high,
                low: closedPoint.low,
                close: closedPoint.close
              },
              signal: side ? {
                signalId,
                side,
                symbol: symbolKey,
                resolution,
                barIndex: points.length - 2,
                timeSec: closedPoint.timeSec,
                entryPrice,
                stopPrice,
                targetPrices
              } : null
            }
          });
        }
        lastCortexAutomationContextKey = contextKey;
        lastCortexAutomationClosedBarKey = closedBarKey;
      } else {
        lastCortexAutomationClosedBarKey = '';
        lastCortexAutomationContextKey = '';
      }

      ctx.save();

      // EMA centerline and ATR-trailing trend stop.
      ctx.lineWidth = Math.max(1, barSpacing * 0.22);
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.85)';
      ctx.beginPath();
      let started = false;
      points.forEach(point => {
        const x = barToX(point.index, point.timeSec), y = priceToY(point.ema);
        if (x === null || y === null || x < -barSpacing || x > cssWidth + barSpacing) return;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.lineWidth = Math.max(1.3, barSpacing * 0.28);
      ctx.strokeStyle = '#f04452';
      ctx.beginPath();
      started = false;
      points.forEach((point, i) => {
        const x = barToX(point.index, point.timeSec), y = priceToY(point.stop);
        if (x === null || y === null || x < -barSpacing || x > cssWidth + barSpacing) return;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else {
          const previousY = priceToY(points[i - 1]?.stop);
          if (previousY !== null) ctx.lineTo(x, previousY);
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      if (ci.showSignals !== false) {
        points.forEach(point => {
          if (!point.flip) return;
          const x = barToX(point.index, point.timeSec);
          const y = priceToY(point.flip > 0 ? point.low - point.atr * 0.2 : point.high + point.atr * 0.2);
          if (x === null || y === null || x < -20 || x > cssWidth + 20) return;
          const color = point.flip > 0 ? '#00d6a2' : '#ec3d72';
          const text = point.flip > 0 ? 'Buy' : 'Sell';
          ctx.font = '700 11px -apple-system, BlinkMacSystemFont, sans-serif';
          const w = ctx.measureText(text).width + 16;
          const h = 22;
          const boxY = point.flip > 0 ? y + 8 : y - h - 8;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x - w / 2, boxY, w, h, 3);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, x, boxY + h / 2);
        });
      }

      const latestPoint = points[points.length - 1];
      const latestX = latestPoint && barToX(latestPoint.index, latestPoint.timeSec);
      if (latestPoint && ci.showTargets !== false && latestX !== null) {
        const latestSignal = [...points].reverse().find(point => point.flip);
        if (latestSignal) {
          const longSide = latestSignal.flip > 0;
          const entry = latestSignal.close;
          const sideSign = longSide ? 1 : -1;
          const fixedPointMode = ci.levelDistanceMode !== 'atr';
          const stopDistance = Math.max(1, Math.min(20, Number(ci.stopLossPoints) || 8));
          const targetSpacing = Math.max(0.25, Math.min(20, Number(ci.targetSpacingPoints) || 4));
          const stop = fixedPointMode ? entry - sideSign * stopDistance : latestSignal.stop;
          const risk = Math.abs(entry - stop) || latestSignal.atr * multiplier;
          const labelFontSize = Math.max(8, Math.min(24, Number(ci.levelFontSize) || 11));
          const boxScale = Math.max(75, Math.min(200, Number(ci.levelBoxScale) || 100)) / 100;
          const endX = Math.min(cssWidth - 6, Math.max(latestX + 5 * barSpacing, latestX + 24));
          const levels = [
            { name: 'Entry', price: entry, color: '#f5aa00' },
            { name: 'Stop loss', price: stop, color: '#ed3f65' },
            ...((Array.isArray(ci.targetRiskMultipliers) ? ci.targetRiskMultipliers : [1, 2, 3]).slice(0, 3).map((multiple, i) => ({
              name: `TP ${i + 1}`,
              price: entry + sideSign * (fixedPointMode ? targetSpacing * (i + 1) : risk * Number(multiple)),
              color: '#00c99a'
            })))
          ];
          levels.forEach(level => {
            const y = priceToY(level.price);
            if (y === null || y < -15 || y > cssHeight + 15) return;
            // Draw the guide leftward from the current label edge. Its left endpoint is
            // the first later candle whose range reaches this price; untouched levels
            // begin at the signal candle instead.
            let leftEndpointX = barToX(latestSignal.index, latestSignal.timeSec);
            const signalPointIndex = points.indexOf(latestSignal);
            for (let i = signalPointIndex + 1; i < points.length; i++) {
              const bar = points[i];
              if (bar.low <= level.price && bar.high >= level.price) {
                const hitX = barToX(bar.index, bar.timeSec);
                if (hitX !== null) leftEndpointX = hitX;
                break;
              }
            }
            if (leftEndpointX === null) leftEndpointX = latestX;
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = `${level.color}bb`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(leftEndpointX, y); ctx.lineTo(endX, y); ctx.stroke();
            ctx.setLineDash([]);
            const label = `${level.name}: ${formatChartPriceValue(level.price, lastTrackedPrice)}`;
            ctx.font = `700 ${labelFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
            const padX = 7 * boxScale;
            const boxHeight = 18 * boxScale;
            const width = ctx.measureText(label).width + padX * 2;
            const left = Math.max(2, Math.min(cssWidth - width - 2, endX + 5));
            ctx.fillStyle = level.color;
            ctx.beginPath(); ctx.roundRect(left, y - boxHeight / 2, width, boxHeight, 3 * boxScale); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(label, left + padX, y);
          });
        }
      }

      if (ci.showTrendTable !== false) {
        const timeframeRows = [
          { label: '1m', sec: 60 }, { label: '5m', sec: 300 }, { label: '15m', sec: 900 },
          { label: '30m', sec: 1800 }, { label: '1H', sec: 3600 }, { label: '1D', sec: 86400 }
        ];
        const available = timeframeRows.filter(row => row.sec >= barIntervalSec * 0.9);
        const tableX = Math.max(4, cssWidth - 72), tableY = 10, rowH = 20;
        ctx.font = '700 10px -apple-system, BlinkMacSystemFont, sans-serif';
        const tableH = (available.length + 1) * rowH;
        ctx.fillStyle = 'rgba(10, 16, 30, 0.86)';
        ctx.beginPath(); ctx.roundRect(tableX, tableY, 68, tableH, 4); ctx.fill();
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#dbe4f0'; ctx.textAlign = 'center';
        ctx.fillText('Trend  TF', tableX + 34, tableY + rowH / 2);
        available.forEach((row, idx) => {
          const buckets = new Map();
          bars.forEach(bar => {
            const bucket = Math.floor(bar.timeSec / row.sec);
            const item = buckets.get(bucket);
            if (!item) buckets.set(bucket, { open: Number(bar.open), high: Number(bar.high), low: Number(bar.low), close: Number(bar.close) });
            else { item.high = Math.max(item.high, Number(bar.high)); item.low = Math.min(item.low, Number(bar.low)); item.close = Number(bar.close); }
          });
          const grouped = Array.from(buckets.values());
          let trend = null;
          if (grouped.length >= 2) {
            const windowBars = grouped.slice(-Math.min(grouped.length, emaLen));
            const avg = windowBars.reduce((sum, bar) => sum + bar.close, 0) / windowBars.length;
            trend = grouped[grouped.length - 1].close >= avg;
          }
          const y = tableY + (idx + 1) * rowH;
          ctx.fillStyle = trend === null ? '#475569' : trend ? '#07976f' : '#c72f58';
          ctx.fillRect(tableX + 2, y + 2, 42, rowH - 4);
          ctx.fillStyle = '#fff'; ctx.fillText(trend === null ? '—' : trend ? 'Up' : 'Dn', tableX + 23, y + rowH / 2);
          ctx.fillStyle = '#e2e8f0'; ctx.fillText(row.label, tableX + 55, y + rowH / 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(tableX + 46, y); ctx.lineTo(tableX + 46, y + rowH); ctx.stroke();
        });
      }
      ctx.restore();
    }

    const halfBarW = Math.max(1, barSpacing * 0.5);
    const sCfg = config || {};
    const boxAlpha = Math.max(0.02, Math.min(0.65, (Number(sCfg.boxOpacity) || 18) / 100));
    const watermarkAlpha = Math.max(0.05, Math.min(1, (Number(sCfg.watermarkOpacity) || 32) / 100));
    const fontFamily = sCfg.fontFamily || '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    const baseFontSize = Math.max(12, Math.min(76, Number(sCfg.fontSize) || 40));
    const fontWeight = sCfg.fontBold ? '700' : '500';
    const showWatermark = sCfg.showWatermark !== false;
    const showBorder = Boolean(sCfg.showBoxBorder || sCfg.showSessionBorder);
    const extendHighLow = (sCfg.extendHighLowLines ?? sCfg.extendHighLow) !== false;
    const showPermDotted = sCfg.showPermanentDottedHighLow !== false;
    const showHighLowLabels = sCfg.showHighLowLabels !== false;
    const showMidPoint = Boolean(sCfg.showMidPoint);
    const extendMidPoint = Boolean(sCfg.extendMidPoint);
    const sessionLineExtensionMode = sCfg.highLowLineExtensionMode === 'all' || sCfg.highLowLineExtensionMode === 'right'
      ? 'all'
      : 'uncleared';

    // 7-day cutoff in seconds relative to latest bar on chart
    const latestBarTimeSec = bars[bars.length - 1].timeSec;
    const sevenDaysSecCutoff = latestBarTimeSec - 7 * 86400;

    const priceScaleBadges = [];

    for (let i = 0; i < cachedIctComputedSessions.length; i++) {
      const sess = cachedIctComputedSessions[i];
      const def = sess.def;

      const rawStartX = barToX(sess.startBarIndex, sess.startTimeSec);
      const rawEndX = barToX(sess.endBarIndex, sess.endTimeSec);
      const highY = priceToY(sess.high);
      const lowY = priceToY(sess.low);
      const midY = priceToY(sess.mid ?? (sess.high + sess.low) / 2);

      if (rawStartX === null || rawEndX === null || highY === null || lowY === null) continue;

      const boxLeft = Math.min(rawStartX, rawEndX) - halfBarW;
      const boxRight = Math.max(rawStartX, rawEndX) + halfBarW;
      const boxTop = Math.min(highY, lowY);
      const boxBottom = Math.max(highY, lowY);
      const boxW = Math.max(2, boxRight - boxLeft);
      const boxH = Math.max(2, boxBottom - boxTop);

      const getFirstClearPoint = (sweptBarIndex, sweptTimeSec, closeBarIndex, closeTimeSec) => {
        const candidates = [
          sweptBarIndex !== null ? { barIndex: sweptBarIndex, timeSec: sweptTimeSec } : null,
          closeBarIndex !== null ? { barIndex: closeBarIndex, timeSec: closeTimeSec } : null
        ].filter(Boolean).sort((a, b) => Number(a.barIndex) - Number(b.barIndex));
        return candidates[0] || null;
      };
      const highClearPoint = getFirstClearPoint(
        sess.highSweptBarIndex, sess.highSweptTimeSec,
        sess.highCloseThroughBarIndex, sess.highCloseThroughTimeSec
      );
      const lowClearPoint = getFirstClearPoint(
        sess.lowSweptBarIndex, sess.lowSweptTimeSec,
        sess.lowCloseThroughBarIndex, sess.lowCloseThroughTimeSec
      );
      const highCleared = Boolean(highClearPoint);
      const lowCleared = Boolean(lowClearPoint);

      let highEndX = boxRight;
      let lowEndX = boxRight;
      let midEndX = boxRight;
      if (!sess.isStillInSession) {
        if (extendHighLow) {
          const hTargetBar = highClearPoint ? highClearPoint.barIndex : sess.latestBarIndex;
          const hTargetTime = highClearPoint ? highClearPoint.timeSec : sess.latestTimeSec;
          const hx = barToX(hTargetBar, hTargetTime);
          if (hx !== null) highEndX = Math.max(boxRight, hx);

          const lTargetBar = lowClearPoint ? lowClearPoint.barIndex : sess.latestBarIndex;
          const lTargetTime = lowClearPoint ? lowClearPoint.timeSec : sess.latestTimeSec;
          const lx = barToX(lTargetBar, lTargetTime);
          if (lx !== null) lowEndX = Math.max(boxRight, lx);
        }
        if (showMidPoint && extendMidPoint) {
          const mTargetBar = sess.midSweptBarIndex !== null ? sess.midSweptBarIndex : sess.latestBarIndex;
          const mTargetTime = sess.midSweptTimeSec !== null ? sess.midSweptTimeSec : sess.latestTimeSec;
          const mx = barToX(mTargetBar, mTargetTime);
          if (mx !== null) midEndX = Math.max(boxRight, mx);
        }
      }

      const highRightEndX = sessionLineExtensionMode === 'all' || !highCleared ? cssWidth : highEndX;
      const lowRightEndX = sessionLineExtensionMode === 'all' || !lowCleared ? cssWidth : lowEndX;

      const isWithin7Days = sess.endTimeSec >= sevenDaysSecCutoff;
      const hasRightExtendedLevel = sessionLineExtensionMode === 'all' || !highCleared || !lowCleared;
      const maxRightReach = (showPermDotted && isWithin7Days && hasRightExtendedLevel)
        ? cssWidth
        : Math.max(boxRight, highEndX, lowEndX, midEndX);
      if (maxRightReach < -50 || boxLeft > cssWidth + 50) continue;

      const colorHex = def.color || '#3b82f6';
      const sessionDisplayName = formatSessionDisplayTitle(def);
      const dateStr = formatSessionShortDate(sess.anchorDate, config.permDateFormat || 'M-d-y');

      // 1. Draw shaded Session Box (if within configured box lookback days)
      if (sess.withinBoxLookback !== false && boxRight >= 0 && boxLeft <= cssWidth) {
        ctx.fillStyle = hexToRgbaString(colorHex, boxAlpha * 100);
        ctx.fillRect(boxLeft, boxTop, boxW, boxH);

        if (showBorder) {
          ctx.strokeStyle = hexToRgbaString(colorHex, Math.min(90, boxAlpha * 100 + 28));
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.strokeRect(boxLeft + 0.5, boxTop + 0.5, Math.max(1, boxW - 1), Math.max(1, boxH - 1));
        }
      }

      // 2A. LINE 1: Solid Session High & Low Lines (Cut Off at Sweep Bar)
      if (sess.withinBoxLookback !== false) {
        ctx.save();
        ctx.strokeStyle = hexToRgbaString(colorHex, 92);
        ctx.lineWidth = 1.4;
        ctx.setLineDash([]); // Always solid for the swept line!

        const hLineStart = Math.max(-10, boxLeft);
        const hLineEnd = Math.min(cssWidth + 10, extendHighLow ? highRightEndX : boxRight);
        if (hLineEnd > hLineStart && highY >= -20 && highY <= cssHeight + 20) {
          ctx.beginPath();
          ctx.moveTo(hLineStart, Math.round(highY) + 0.5);
          ctx.lineTo(hLineEnd, Math.round(highY) + 0.5);
          ctx.stroke();
        }

        const lLineStart = Math.max(-10, boxLeft);
        const lLineEnd = Math.min(cssWidth + 10, extendHighLow ? lowRightEndX : boxRight);
        if (lLineEnd > lLineStart && lowY >= -20 && lowY <= cssHeight + 20) {
          ctx.beginPath();
          ctx.moveTo(lLineStart, Math.round(lowY) + 0.5);
          ctx.lineTo(lLineEnd, Math.round(lowY) + 0.5);
          ctx.stroke();
        }

        // Session Mid-Point (50% Equilibrium) line if enabled
        if (showMidPoint && midY !== null && midY >= -20 && midY <= cssHeight + 20) {
          const mLineStart = Math.max(-10, boxLeft);
          const mLineEnd = Math.min(cssWidth + 10, extendMidPoint ? midEndX : boxRight);
          if (mLineEnd > mLineStart) {
            ctx.strokeStyle = hexToRgbaString(colorHex, 75);
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(mLineStart, Math.round(midY) + 0.5);
            ctx.lineTo(mLineEnd, Math.round(midY) + 0.5);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 2B. LINE 2: 7-Day Permanent Dotted/Dashed High & Low Lines Extending All the Way to the Far Right (Price Scale)
      // + Configurable Date & Session High/Low Label (Top, Bottom, Inline, Auto Outside; Font Size, Color, Style) + Price Bar on the Price List!
      if (showPermDotted && isWithin7Days) {
        ctx.save();
        ctx.strokeStyle = hexToRgbaString(colorHex, 80);
        ctx.lineWidth = 1.15;

        const permLineStyle = Number(config.permanentLineStyle ?? 1);
        if (permLineStyle === 0) {
          ctx.setLineDash([]);
        } else if (permLineStyle === 2) {
          ctx.setLineDash([6, 4]);
        } else {
          ctx.setLineDash([2, 4]); // Default dotted
        }

        const permVertAlign = config.permLabelVertAlign || 'outside'; // 'outside' | 'top' | 'inline' | 'bottom'
        const permHorzAlign = config.permLabelHorzAlign || 'right';   // 'right' | 'center' | 'left'
        const permFontSize = Math.max(8, Math.min(28, Number(config.permLabelFontSize) || 11));
        const permStyleKey = config.permLabelFontStyle || 'bold';
        const permFontItalic = (permStyleKey === 'italic' || permStyleKey === 'bold_italic') ? 'italic ' : '';
        const permFontWeight = (permStyleKey === 'bold' || permStyleKey === 'bold_italic') ? '700' : '400';
        const permFontSpec = `${permFontItalic}${permFontWeight} ${permFontSize}px ${fontFamily}`;
        const permTextColorHex = (config.permLabelColorMode === 'custom' && config.permLabelCustomColor)
          ? config.permLabelCustomColor
          : colorHex;

        const drawPermLineWithLabel = (lineY, lineStartX, lineEndX, labelText, isHighLine) => {
          if (lineY < 0 || lineY > cssHeight || lineEndX < lineStartX) return;
          const yCoord = Math.round(lineY) + 0.5;
          const boundedEndX = Math.min(cssWidth, lineEndX);

          ctx.font = permFontSpec;
          const textW = ctx.measureText(labelText).width;
          const padX = 6;

          // Determine vertical mode for this specific line ('top', 'bottom', or 'inline')
          let vMode = permVertAlign;
          if (vMode === 'outside') {
            vMode = isHighLine ? 'top' : 'bottom';
          }

          // Determine label X anchor and gap bounds [gapStart, gapEnd] when inline
          let textX = boundedEndX - 6;
          let textAlign = 'right';
          let gapStart = boundedEndX;
          let gapEnd = boundedEndX;

          if (permHorzAlign === 'left') {
            textAlign = 'left';
            textX = Math.min(boundedEndX - textW - 6, lineStartX + 6);
            gapStart = Math.max(lineStartX, textX - padX);
            gapEnd = Math.min(boundedEndX, textX + textW + padX);
          } else if (permHorzAlign === 'center') {
            textAlign = 'center';
            textX = (lineStartX + boundedEndX) / 2;
            gapStart = Math.max(lineStartX, textX - textW / 2 - padX);
            gapEnd = Math.min(boundedEndX, textX + textW / 2 + padX);
          } else {
            textAlign = 'right';
            textX = boundedEndX - 6;
            gapStart = Math.max(lineStartX, boundedEndX - 6 - textW - padX);
            gapEnd = boundedEndX;
          }

          // Draw line (breaking around the label if vMode === 'inline' so the line never strikes through the text!)
          ctx.beginPath();
          if (vMode === 'inline' && boundedEndX - lineStartX > textW + 16) {
            if (gapStart > lineStartX) {
              ctx.moveTo(lineStartX, yCoord);
              ctx.lineTo(gapStart, yCoord);
            }
            if (boundedEndX > gapEnd) {
              ctx.moveTo(gapEnd, yCoord);
              ctx.lineTo(boundedEndX, yCoord);
            }
          } else {
            ctx.moveTo(lineStartX, yCoord);
            ctx.lineTo(boundedEndX, yCoord);
          }
          ctx.stroke();

          // Draw Date & Session High/Low text
          ctx.fillStyle = hexToRgbaString(permTextColorHex, 96);
          ctx.textAlign = textAlign;
          if (vMode === 'inline') {
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, textX, Math.round(lineY));
          } else if (vMode === 'bottom') {
            ctx.textBaseline = 'top';
            ctx.fillText(labelText, textX, Math.round(lineY) + 3);
          } else {
            // 'top'
            ctx.textBaseline = 'bottom';
            ctx.fillText(labelText, textX, Math.round(lineY) - 3);
          }
        };

        const hPermStart = Math.max(0, extendHighLow ? Math.min(highEndX, cssWidth) : Math.max(0, boxLeft));
        const hPermEnd = Math.min(cssWidth, highRightEndX);
        const highStoppedByBar = sessionLineExtensionMode === 'uncleared' && highCleared;
        if (highY >= 0 && highY <= cssHeight && hPermEnd >= hPermStart) {
          const highLabelText = `${dateStr} ${sessionDisplayName} High`;
          if (!highStoppedByBar) {
            drawPermLineWithLabel(highY, hPermStart, hPermEnd, highLabelText, true);
            priceScaleBadges.push({
              y: highY,
              price: sess.high,
              color: colorHex,
              label: highLabelText
            });
          }
        }

        const lPermStart = Math.max(0, extendHighLow ? Math.min(lowEndX, cssWidth) : Math.max(0, boxLeft));
        const lPermEnd = Math.min(cssWidth, lowRightEndX);
        const lowStoppedByBar = sessionLineExtensionMode === 'uncleared' && lowCleared;
        if (lowY >= 0 && lowY <= cssHeight && lPermEnd >= lPermStart) {
          const lowLabelText = `${dateStr} ${sessionDisplayName} Low`;
          if (!lowStoppedByBar) {
            drawPermLineWithLabel(lowY, lPermStart, lPermEnd, lowLabelText, false);
            priceScaleBadges.push({
              y: lowY,
              price: sess.low,
              color: colorHex,
              label: lowLabelText
            });
          }
        }

        ctx.restore();
      }

      // 3. Draw Centered Watermark Text inside Session Box
      const watermarkLabel = def.watermarkText !== undefined ? def.watermarkText : def.name;
      if (sess.withinBoxLookback !== false && showWatermark && watermarkLabel && boxW > 24 && boxH > 16 && boxRight > 0 && boxLeft < cssWidth) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(boxLeft + 2, boxTop + 2, Math.max(1, boxW - 4), Math.max(1, boxH - 4));
        ctx.clip();

        ctx.fillStyle = hexToRgbaString(colorHex, watermarkAlpha * 100);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let fittedSize = baseFontSize;
        ctx.font = `${fontWeight} ${fittedSize}px ${fontFamily}`;
        const measuredW = ctx.measureText(watermarkLabel).width;
        if (measuredW > boxW * 0.88 && measuredW > 0) {
          fittedSize = Math.max(11, Math.floor(fittedSize * ((boxW * 0.88) / measuredW)));
        }
        if (fittedSize > boxH * 0.75) {
          fittedSize = Math.max(11, Math.floor(boxH * 0.75));
        }

        ctx.font = `${fontWeight} ${fittedSize}px ${fontFamily}`;
        ctx.fillText(watermarkLabel, boxLeft + boxW / 2, boxTop + boxH / 2);
        ctx.restore();
      }

      // 4. Draw High / Low Labels above & below the session box (e.g. "NYAM.H" / "NYAM.L")
      if (sess.withinBoxLookback !== false && showHighLowLabels && boxW > 18 && boxRight > 0 && boxLeft < cssWidth) {
        const shortTag = def.shortTag || def.shortLabel || String(watermarkLabel || def.name || '').replace(/\s+/g, '').toUpperCase().slice(0, 5);
        if (shortTag) {
          ctx.save();
          ctx.fillStyle = hexToRgbaString(colorHex, 88);
          ctx.font = `600 10px ${fontFamily}`;
          ctx.textAlign = 'center';
          const centerX = boxLeft + boxW / 2;

          if (boxTop > 12 && boxTop < cssHeight) {
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${shortTag}.H`, centerX, boxTop - 3);
          }
          if (boxBottom > 0 && boxBottom < cssHeight - 12) {
            ctx.textBaseline = 'top';
            ctx.fillText(`${shortTag}.L`, centerX, boxBottom + 3);
          }
          ctx.restore();
        }
      }
    }

    // 5. Render Auto Fair Value Gaps (FVGs) on canvas when enabled and not using native TradingView shapes
    if (hasCanvasFvgs) {
      renderAutoFvgsOnCanvas(ctx, cachedComputedAutoFvgs, fvgConfig, barToX, priceToY, halfBarW, cssWidth, cssHeight, barIntervalSec, bars);
    }

    // 5B. Render Custom-Sized Candles in-place without zooming or resizing the chart time axis!
    if (customCandleWidthEnabled) {
      renderCustomWidthCandlesOnCanvas(ctx, bars, candleOhlcConfig, barToX, priceToY, barSpacing, cssWidth, cssHeight, mainSeries);
    }

    // 6. Render Candle Numbers (#1 = current forming candle backward up to N candles) in a small glow box below each candle
    if (candleNumbersEnabled) {
      renderCandleNumbersOnCanvas(ctx, bars, candleOhlcConfig, barToX, priceToY, barSpacing, cssWidth, cssHeight);
    }

    // 7. Render Candle OHLC (Open, High, Low, Close) values on canvas for all visible candles or individually clicked candles
    if (candleOhlcEnabled) {
      const tfLabel = formatCurrentResolutionLabel();
      renderCandleOhlcOnCanvas(ctx, bars, candleOhlcConfig, barToX, priceToY, barSpacing, cssWidth, cssHeight, symbolKey, tfLabel);
    } else {
      lastRenderedCandleOhlcHitBoxes = [];
    }

    if (failLinesEnabled) {
      const failLineConfig = currentSettings && currentSettings.failLines || {};
      const labelScale = Math.max(0.75, Math.min(1.5, (Number(failLineConfig.labelSize) || 100) / 100));
      const fontSize = Math.max(8, Math.min(18, Number(failLineConfig.fontSize) || 11));
      const drawFailLine = (price, label, color, side) => {
        if (!Number.isFinite(price)) {
          removeFailPriceLineButton(side);
          return;
        }
        const y = priceToY(price);
        if (y === null || !Number.isFinite(y)) return;
        const isOffscreen = y < 0 || y > cssHeight;
        const displayY = Math.max(13, Math.min(cssHeight - 4, y));
        const formattedPrice = price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;
        ctx.font = `600 ${fontSize}px Arial, sans-serif`;
        if (isOffscreen) {
          const direction = y < 0 ? '↑ Above chart' : '↓ Below chart';
          const text = `${direction} · ${label} Fail Price $${formattedPrice}`;
          const textWidth = ctx.measureText(text).width;
          const labelHeight = 19 * labelScale;
          const labelPadX = 9 * labelScale;
          const labelY = y < 0 ? 2 : cssHeight - labelHeight - 3;
          const labelWidth = textWidth + labelPadX * 2;
          const buttonWidth = 88 * labelScale;
          const labelX = Math.max(buttonWidth + 12, cssWidth - labelWidth - 10);
          ctx.globalAlpha = 0.94;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 5 * labelScale);
          ctx.fill();
          ctx.fillStyle = '#0b0e11';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, labelX + labelPadX, labelY + labelHeight / 2);
          positionFailPriceLineButton(side, labelX - buttonWidth - 4, labelY, buttonWidth, labelHeight, fontSize - 1);
        } else {
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(0, displayY);
          ctx.lineTo(cssWidth, displayY);
          ctx.stroke();
          const text = `${label} Fail Price $${formattedPrice}`;
          const tagHeight = 19 * labelScale;
          const tagPadX = 7 * labelScale;
          const tagWidth = ctx.measureText(text).width + tagPadX * 2;
          const buttonWidth = 88 * labelScale;
          const tagX = Math.max(buttonWidth + 12, cssWidth - tagWidth - 10);
          const tagY = Math.max(2, Math.min(cssHeight - tagHeight - 2, displayY - tagHeight / 2));
          ctx.globalAlpha = 0.96;
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 5 * labelScale);
          ctx.fillStyle = '#0b0e11';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.textBaseline = 'middle';
          ctx.fillText(text, tagX + tagPadX, tagY + tagHeight / 2);
          positionFailPriceLineButton(side, tagX - buttonWidth - 4, tagY, buttonWidth, tagHeight, fontSize - 1);
        }
        ctx.restore();
      };
      drawFailLine(liveFailPrices.long, 'Long', '#10d69a', 'long');
      drawFailLine(liveFailPrices.short, 'Short', '#f2365b', 'short');

      if (liveEstimatedStopLoss.side && Number.isFinite(latestChartMarketPrice)) {
        const failPrice = liveFailPrices[liveEstimatedStopLoss.side];
        if (Number.isFinite(failPrice)) {
          const midpoint = (latestChartMarketPrice + failPrice) / 2;
          const tickMap = { ES: 0.25, MES: 0.25, NQ: 0.25, MNQ: 0.25, RTY: 0.1, M2K: 0.1, YM: 1, MYM: 1, CL: 0.01, MCL: 0.01, GC: 0.1, MGC: 0.1 };
          const symbolText = String(symbolKey || '').toUpperCase();
          const tickSymbol = Object.keys(tickMap).sort((a, b) => b.length - a.length).find(symbol => symbolText === symbol || symbolText.startsWith(`${symbol}!`) || symbolText.startsWith(`${symbol}1`) || symbolText.includes(`:${symbol}`));
          const tick = tickSymbol ? tickMap[tickSymbol] : null;
          const estimate = tick ? Number((Math.round(midpoint / tick) * tick).toFixed(8)) : Number(midpoint.toFixed(8));
          liveEstimatedStopLoss.price = estimate;
          const signature = JSON.stringify({ side: liveEstimatedStopLoss.side, price: estimate, marketPrice: latestChartMarketPrice, failPrice });
          if (signature !== lastStopLossEstimateMessage) {
            lastStopLossEstimateMessage = signature;
            try {
              window.top.postMessage({
                type: 'VEST_TV_STOP_LOSS_PRICE_UPDATE',
                payload: { side: liveEstimatedStopLoss.side, price: estimate, marketPrice: latestChartMarketPrice, failPrice }
              }, '*');
            } catch (e) {}
          }
        }
      }

      const stopEstimate = liveEstimatedStopLoss;
      if (stopEstimate.side && Number.isFinite(stopEstimate.price)) {
        const stopColor = stopEstimate.side === 'long' ? '#10d69a' : '#f2365b';
        const y = priceToY(stopEstimate.price);
        if (y !== null && Number.isFinite(y)) {
          const isOffscreen = y < 0 || y > cssHeight;
          const displayY = Math.max(13, Math.min(cssHeight - 4, y));
          const formattedPrice = stopEstimate.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
          const sideLabel = stopEstimate.side === 'long' ? 'Long' : 'Short';
          const text = `${sideLabel} Stop Loss $${formattedPrice}`;
          ctx.save();
          ctx.strokeStyle = stopColor;
          ctx.fillStyle = stopColor;
          ctx.font = `700 ${fontSize}px Arial, sans-serif`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(0, displayY);
          ctx.lineTo(cssWidth, displayY);
          ctx.stroke();
          const tagHeight = 19 * labelScale;
          const tagPadX = 7 * labelScale;
          const direction = y < 0 ? '↑ Above chart · ' : y > cssHeight ? '↓ Below chart · ' : '';
          const tagText = `${direction}${text}`;
          const tagWidth = ctx.measureText(tagText).width + tagPadX * 2;
          const tagX = Math.max(8, cssWidth - tagWidth - 10);
          const tagY = isOffscreen
            ? (y < 0 ? 2 : cssHeight - tagHeight - 3)
            : Math.max(2, Math.min(cssHeight - tagHeight - 2, displayY - tagHeight / 2));
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.97;
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 5 * labelScale);
          ctx.fillStyle = '#0b0e11';
          ctx.fill();
          ctx.strokeStyle = stopColor;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = stopColor;
          ctx.textBaseline = 'middle';
          ctx.fillText(tagText, tagX + tagPadX, tagY + tagHeight / 2);
          if (Number.isFinite(liveEstimatedPnl)) {
            const pnlColor = liveEstimatedPnl > 0 ? '#10d69a' : liveEstimatedPnl < 0 ? '#f2365b' : '#cbd5e1';
            const pnlSign = liveEstimatedPnl > 0 ? '+' : liveEstimatedPnl < 0 ? '−' : '';
            const pnlAmount = Math.abs(liveEstimatedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const pnlText = `Est. PnL ${pnlSign}$${pnlAmount}`;
            const pnlWidth = ctx.measureText(pnlText).width + tagPadX * 2;
            const pnlX = Math.max(4, tagX - pnlWidth - 4);
            ctx.beginPath();
            ctx.roundRect(pnlX, tagY, pnlWidth, tagHeight, 5 * labelScale);
            ctx.fillStyle = '#0b0e11';
            ctx.fill();
            ctx.strokeStyle = pnlColor;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = pnlColor;
            ctx.fillText(pnlText, pnlX + tagPadX, tagY + tagHeight / 2);
          }
          ctx.restore();
        }
      }
    }

    ctx.restore();

    // Render the price tags on the right-hand price scale axis!
    if (sessionsEnabled && showPermDotted && priceScaleBadges.length > 0) {
      renderIctPriceScaleBadges(targetCanvas, priceScaleBadges, cssHeight);
    } else {
      clearIctPriceScaleBadges();
    }
  }

  function scheduleIctSessionsRender(forceRecompute = false) {
    if (forceRecompute) {
      ictSessionsNeedsFullRecompute = true;
    }
    if (ictSessionsRafId !== null) return;
    ictSessionsRafId = window.requestAnimationFrame(renderIctSessionIndicators);
  }

  let isChartPointerDragging = false;
  let chartDragSyncRafId = null;

  function runChartDragSyncLoop() {
    if (!isChartPointerDragging) {
      chartDragSyncRafId = null;
      return;
    }
    // If a scheduled RAF is already queued for this frame, cancel it so we only clear & draw the canvas ONCE per vsync!
    if (ictSessionsRafId !== null) {
      window.cancelAnimationFrame(ictSessionsRafId);
      ictSessionsRafId = null;
    }
    renderIctSessionIndicators();
    chartDragSyncRafId = window.requestAnimationFrame(runChartDragSyncLoop);
  }

  function startChartDragSyncLoop() {
    isChartPointerDragging = true;
    if (chartDragSyncRafId === null) {
      chartDragSyncRafId = window.requestAnimationFrame(runChartDragSyncLoop);
    }
  }

  function stopChartDragSyncLoop() {
    if (!isChartPointerDragging) return;
    isChartPointerDragging = false;
    if (chartDragSyncRafId !== null) {
      window.cancelAnimationFrame(chartDragSyncRafId);
      chartDragSyncRafId = null;
    }
    scheduleIctSessionsRender(false);
    setTimeout(() => scheduleIctSessionsRender(false), 32);
  }

  const hookedTimeScaleInstances = new WeakSet();
  const hookedPriceScaleInstances = new WeakSet();
  const hookedMainSeriesInstances = new WeakSet();
  const hookedChartApiInstances = new WeakSet();
  const hookedDragDocs = new WeakSet();
  let windowResizeHookedForSessions = false;
  let instrumentSwitchTimers = [];

  function handleInstrumentOrChartSwitch(reason = 'symbol_change') {
    log(`Resetting chart & session state on instrument/chart switch (${reason})`);

    // 1. Re-acquire live activeChart / activeChartApi / activeWidget in case the widget or chart instance was recreated
    try {
      const found = findTradingViewApi();
      if (found && found.api) {
        activeChartApi = found.api;
        if (found.widget) activeWidget = found.widget;
        if (typeof activeChartApi.activeChart === 'function') {
          activeChart = activeChartApi.activeChart();
        } else if (typeof activeChartApi.chart === 'function') {
          activeChart = activeChartApi.chart();
        }
      }
    } catch (e) {}

    // 2. Clear all cached model, series, bar, signature, and canvas references
    // Note: Clear nativeAutoFvgShapesMap in-memory without calling removeEntity on the previous symbol's saved drawings
    nativeAutoFvgShapesMap.clear();
    cachedSessionsChartModel = null;
    cachedExtractedBarsObj = null;
    cachedQuickPlotSig = '';
    cachedIctBarsSignature = '';
    cachedIctConfigSignature = '';
    cachedIctComputedSessions = [];
    cachedAutoFvgSignature = '';
    cachedComputedAutoFvgs = [];
    cachedTargetChartCanvas = null;
    cachedPriceAxisHost = null;
    cachedPriceAxisTargetCanvas = null;
    lastPriceAxisBadgesHtml = '';
    ictSessionsNeedsFullRecompute = true;

    // 3. Ensure the new symbol's price scale is in autoScale mode if the user hasn't explicitly locked this symbol's price range
    try {
      const currentSym = getCurrentChartSymbolKey();
      const saved = currentSettings && currentSettings.lastChartSettings;
      const hasExplicitLockedRangeForSymbol = Boolean(
        currentSym &&
        saved &&
        saved.viewportsBySymbol &&
        saved.viewportsBySymbol[currentSym] &&
        saved.viewportsBySymbol[currentSym].isAutoScale === false
      );
      if (!hasExplicitLockedRangeForSymbol) {
        const psApi = getPrimaryPriceScaleApi();
        if (psApi && typeof psApi.setAutoScale === 'function') {
          psApi.setAutoScale(true);
        }
        const model = findChartModelForSessions();
        const ms = model ? findMainSeriesFromModel(model) : null;
        const internalPs = ms && typeof ms.priceScale === 'function' ? ms.priceScale() : null;
        if (internalPs && typeof internalPs.setAutoScale === 'function') {
          internalPs.setAutoScale(true);
        }
      }
    } catch (e) {}

    // 4. Re-bind listeners on any newly mounted iframe, activeChart, model, series, or priceScale
    setupContextMenuHandler();
    setupSidebarObserver();
    setupIctSessionIndicators();

    // 5. Schedule immediate + staggered full recomputations as the new instrument's historical bars finish streaming in
    instrumentSwitchTimers.forEach(t => clearTimeout(t));
    instrumentSwitchTimers = [];
    [0, 120, 300, 650, 1200, 2200, 3500].forEach(delay => {
      const tid = setTimeout(() => {
        cachedSessionsChartModel = null;
        cachedExtractedBarsObj = null;
        cachedQuickPlotSig = '';
        scheduleIctSessionsRender(true);
      }, delay);
      instrumentSwitchTimers.push(tid);
    });
  }

  function attachDirectScaleListeners(model) {
    if (!model) return;
    try {
      const ts = typeof model.timeScale === 'function' ? model.timeScale() : model._timeScale;
      if (ts && !hookedTimeScaleInstances.has(ts)) {
        hookedTimeScaleInstances.add(ts);
        const tsEvents = ['barSpacingChanged', 'rightOffsetChanged', 'visibleBarsStrictRangeChanged', 'scrollCoordsChanged'];
        tsEvents.forEach(evName => {
          try {
            if (typeof ts[evName] === 'function') {
              const sub = ts[evName]();
              if (sub && typeof sub.subscribe === 'function') {
                sub.subscribe(null, () => scheduleIctSessionsRender(false));
              }
            }
          } catch (e) {}
        });
      }
      const ms = findMainSeriesFromModel(model);
      if (ms && !hookedMainSeriesInstances.has(ms)) {
        hookedMainSeriesInstances.add(ms);
        const msEvents = ['dataUpdated', 'barsReceived', 'symbolResolved', 'onSymbolIntervalChanged', 'timeframeChanged'];
        msEvents.forEach(evName => {
          try {
            if (typeof ms[evName] === 'function') {
              const sub = ms[evName]();
              if (sub && typeof sub.subscribe === 'function') {
                sub.subscribe(null, () => {
                  cachedExtractedBarsObj = null;
                  cachedQuickPlotSig = '';
                  scheduleIctSessionsRender(true);
                });
              }
            }
          } catch (e) {}
        });
      }
      const ps = ms && typeof ms.priceScale === 'function' ? ms.priceScale() : null;
      if (ps && !hookedPriceScaleInstances.has(ps)) {
        hookedPriceScaleInstances.add(ps);
        const psEvents = ['marksChanged', 'priceRangeChanged', 'modeChanged'];
        psEvents.forEach(evName => {
          try {
            if (typeof ps[evName] === 'function') {
              const sub = ps[evName]();
              if (sub && typeof sub.subscribe === 'function') {
                sub.subscribe(null, () => scheduleIctSessionsRender(false));
              }
            }
          } catch (e) {}
        });
      }
    } catch (e) {}
  }

  function setupIctSessionIndicators() {
    const model = findChartModelForSessions();
    if (model) {
      attachDirectScaleListeners(model);
    }

    try {
      if (activeChart && !hookedChartApiInstances.has(activeChart)) {
        hookedChartApiInstances.add(activeChart);
        if (typeof activeChart.onVisibleRangeChanged === 'function') {
          const sub = activeChart.onVisibleRangeChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => scheduleIctSessionsRender(false));
          }
        }
        if (typeof activeChart.onIntervalChanged === 'function') {
          const sub = activeChart.onIntervalChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => {
              handleInstrumentOrChartSwitch('interval_changed');
            });
          }
        }
        if (typeof activeChart.onSymbolChanged === 'function') {
          const sub = activeChart.onSymbolChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => {
              handleInstrumentOrChartSwitch('onSymbolChanged');
            });
          }
        }
        if (typeof activeChart.onDataLoaded === 'function') {
          const sub = activeChart.onDataLoaded();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => {
              cachedSessionsChartModel = null;
              cachedExtractedBarsObj = null;
              cachedQuickPlotSig = '';
              scheduleIctSessionsRender(true);
            });
          }
        }
      }
    } catch (e) {}

    const docs = [document];
    document.querySelectorAll('iframe').forEach(ifr => {
      try {
        if (ifr.contentDocument && !docs.includes(ifr.contentDocument)) docs.push(ifr.contentDocument);
      } catch (e) {}
    });

    docs.forEach(doc => {
      if (!doc || hookedDragDocs.has(doc)) return;
      hookedDragDocs.add(doc);
      try {
        // Use capture phase (true) because TradingView calls e.stopPropagation() on canvas mousedown/pointerdown/mousemove during chart panning!
        doc.addEventListener('pointerdown', (e) => {
          if (e.target && e.target.tagName === 'CANVAS') {
            if (e.button === 0 || e.button === undefined) {
              lastChartPointerDownInfo = {
                clientX: e.clientX || 0,
                clientY: e.clientY || 0,
                time: Date.now()
              };
            }
            startChartDragSyncLoop();
          }
        }, { capture: true, passive: true });
        doc.addEventListener('mousedown', (e) => {
          if (e.target && e.target.tagName === 'CANVAS') {
            if ((e.button === 0 || e.button === undefined) && !lastChartPointerDownInfo) {
              lastChartPointerDownInfo = {
                clientX: e.clientX || 0,
                clientY: e.clientY || 0,
                time: Date.now()
              };
            }
            startChartDragSyncLoop();
          }
        }, { capture: true, passive: true });
        doc.addEventListener('pointermove', (e) => {
          if (isChartPointerDragging || e.buttons > 0) {
            if (!isChartPointerDragging) startChartDragSyncLoop();
            else scheduleIctSessionsRender(false);
          }
        }, { capture: true, passive: true });
        doc.addEventListener('mousemove', (e) => {
          if (isChartPointerDragging || e.buttons > 0) {
            if (!isChartPointerDragging) startChartDragSyncLoop();
            else scheduleIctSessionsRender(false);
          }
        }, { capture: true, passive: true });
        doc.addEventListener('pointerup', (e) => {
          stopChartDragSyncLoop();
          handlePotentialCandleClickOnCanvas(e);
        }, { capture: true, passive: true });
        doc.addEventListener('mouseup', (e) => {
          stopChartDragSyncLoop();
          handlePotentialCandleClickOnCanvas(e);
        }, { capture: true, passive: true });
        doc.addEventListener('wheel', () => {
          scheduleIctSessionsRender(false);
        }, { capture: true, passive: true });
        doc.addEventListener('touchstart', () => startChartDragSyncLoop(), { capture: true, passive: true });
        doc.addEventListener('touchmove', () => scheduleIctSessionsRender(false), { capture: true, passive: true });
        doc.addEventListener('touchend', () => stopChartDragSyncLoop(), { capture: true, passive: true });
      } catch (e) {}
    });

    if (!windowResizeHookedForSessions) {
      windowResizeHookedForSessions = true;
      window.addEventListener('resize', () => scheduleIctSessionsRender(false), { passive: true });
    }
    ictSessionsObserverInitialized = true;
    scheduleIctSessionsRender(false);
  }

  // -------------------------------------------------------------
  // Comprehensive Action & Event Logger
  // -------------------------------------------------------------
  let isActionLoggingEnabled = true;
  let lastTrackedInstrument = null;
  let lastTrackedPrice = null;
  let tickerPollInterval = null;

  function generateSelectorPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el === document.body) return 'body';
    if (el === document.documentElement) return 'html';

    const parts = [];
    let curr = el;
    let depth = 0;

    while (curr && curr.nodeType === 1 && curr !== document.body && depth < 5) {
      let part = curr.tagName.toLowerCase();
      if (curr.id) {
        part += '#' + curr.id;
        parts.unshift(part);
        break;
      } else {
        const dataName = curr.getAttribute('data-name');
        const dataTestId = curr.getAttribute('data-testid');
        if (dataName) {
          part += `[data-name="${dataName}"]`;
        } else if (dataTestId) {
          part += `[data-testid="${dataTestId}"]`;
        } else if (curr.className && typeof curr.className === 'string') {
          const firstClass = curr.className.trim().split(/\s+/).filter(c => !c.startsWith('vest-'))[0];
          if (firstClass) part += '.' + firstClass;
        }
      }
      parts.unshift(part);
      curr = curr.parentElement;
      depth++;
    }

    return parts.join(' > ');
  }

  function extractElementAttributes(el) {
    if (!el || el.nodeType !== 1) return {};
    const attrs = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  function buildEventLogData(e, type) {
    const target = e.target;
    if (!target || target.nodeType !== 1) return null;

    // Ignore events originating inside the extension's own UI
    if (
      target.id === 'vest-action-log-box' ||
      target.closest('#vest-action-log-box') ||
      target.id === 'vest-template-bar-root' ||
      target.closest('#vest-template-bar-root') ||
      target.id === 'vest-panel-toggle-pill' ||
      target.closest('#vest-panel-toggle-pill') ||
      target.id === 'vest-minimized-dock' ||
      target.closest('#vest-minimized-dock') ||
      target.classList.contains('vest-toast')
    ) {
      return null;
    }

    const interactive = target.closest('button, a, input, select, textarea, [role="button"], [role="tab"], [role="slider"], [role="switch"], [role="checkbox"], div[class*="button"], div[class*="tab"], div[class*="row"], tr') || target;

    const data = {
      timestamp: new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0'),
      type: type || e.type,
      source: window.top === window ? 'Top Window' : 'Chart Frame',
      tag: target.tagName.toLowerCase(),
      elementId: target.id || '',
      classes: typeof target.className === 'string' ? target.className.trim().split(/\s+/).filter(Boolean) : [],
      text: (target.innerText || target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
      selector: generateSelectorPath(target),
      attributes: extractElementAttributes(target),
      coordinates: e.clientX !== undefined ? { x: Math.round(e.clientX), y: Math.round(e.clientY) } : undefined
    };

    if (interactive && interactive !== target) {
      data.interactive = {
        tag: interactive.tagName.toLowerCase(),
        elementId: interactive.id || '',
        classes: typeof interactive.className === 'string' ? interactive.className.trim().split(/\s+/).filter(Boolean) : [],
        dataName: interactive.getAttribute('data-name') || undefined,
        dataTestId: interactive.getAttribute('data-testid') || undefined,
        role: interactive.getAttribute('role') || undefined,
        text: (interactive.innerText || interactive.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
      };
    }

    if (type === 'input' || type === 'change') {
      data.name = target.name || undefined;
      data.inputType = target.type || undefined;
      if (target.type !== 'password') {
        data.value = target.value;
      }
    }

    if (type === 'keydown') {
      data.key = e.key;
      data.code = e.code;
      data.modifiers = (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.metaKey ? 'Cmd+' : '');
    }

    return data;
  }

  function dispatchActionLog(logData) {
    if (!logData) return;
    try {
      window.postMessage({
        type: 'VEST_ACTION_LOG',
        event: logData
      }, '*');
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Live Instrument & Price Tracking
  // -------------------------------------------------------------
  function getLiveInstrument() {
    // 1. Check TradingView Chart API
    try {
      if (activeChart) {
        if (typeof activeChart.symbol === 'function') {
          const s = activeChart.symbol();
          if (s && typeof s === 'string' && s.trim()) return s.trim();
        }
        if (typeof activeChart.symbolExt === 'function') {
          const ext = activeChart.symbolExt();
          if (ext && ext.symbol) return ext.symbol.trim();
        }
      }
      if (activeChartApi && typeof activeChartApi.symbol === 'function') {
        const s = activeChartApi.symbol();
        if (s && typeof s === 'string' && s.trim()) return s.trim();
      }
    } catch (e) {}

    // 2. Query top-level DOM or market selector header
    try {
      const doc = window.top === window ? document : (window.top ? window.top.document : document);
      // Look for market header button / dropdown text
      const marketSelector = doc.querySelector(
        '[data-testid*="market"], [class*="market-select"], [class*="marketSelect"], [class*="symbol-select"], [class*="MarketSelect"], button[class*="market"]'
      );
      if (marketSelector) {
        const txt = (marketSelector.innerText || marketSelector.textContent || '').trim().split('\n')[0].trim();
        if (txt && txt.length < 25 && !txt.includes('Order')) return txt;
      }

      // Look for ticker elements or standard heading
      const tickerEl = doc.querySelector('h1, h2, [class*="ticker"], [class*="Ticker"]');
      if (tickerEl) {
        const tText = (tickerEl.innerText || tickerEl.textContent || '').trim().split('\n')[0].trim();
        if (tText && (tText.includes('-USD') || tText.includes('-PERP') || tText.includes('BTC') || tText.includes('ETH') || tText.includes('NQ') || tText.includes('ES'))) {
          return tText;
        }
      }

      // Fallback: Check document.title e.g. "BTC-USD | Vest Markets"
      if (doc.title && doc.title.includes('|')) {
        const titlePart = doc.title.split('|')[0].trim();
        if (titlePart && titlePart.length < 20) return titlePart;
      }
    } catch (e) {}

    return null;
  }

  function getLivePrice() {
    // 1. Query top bar DOM elements (Mid Price / Last Price / Mark Price)
    try {
      const doc = window.top === window ? document : (window.top ? window.top.document : document);

      // Search all elements containing "Mid Price" or "Last Price" or "Mark Price"
      const labelEls = Array.from(doc.querySelectorAll('span, div, p')).filter(el => {
        if (!el.childNodes.length) return false;
        const text = (el.innerText || el.textContent || '').trim();
        return text === 'Mid Price' || text === 'Last Price' || text === 'Mark Price' || text === 'Index Price';
      });

      for (const labelEl of labelEls) {
        // Check immediate nextElementSibling first so we don't accidentally match "1h Funding" or "24h Change" in a shared ancestor container
        const sib = labelEl.nextElementSibling;
        if (sib) {
          const sibText = (sib.innerText || sib.textContent || '').trim();
          const sibMatch = sibText.match(/^\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)$/);
          if (sibMatch && sibMatch[1] && sibMatch[1] !== '0') {
            return sibMatch[1].trim();
          }
        }
        const parent = labelEl.parentElement;
        if (parent && parent.children.length <= 3) {
          const parentText = (parent.innerText || parent.textContent || '').replace(/Mid Price|Last Price|Mark Price|Index Price/gi, '').trim();
          const match = parentText.match(/^\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)$/);
          if (match && match[1] && match[1] !== '0') {
            return match[1].trim();
          }
        }
      }

      // Look for large header price display or font-mono price elements
      const priceCandidates = doc.querySelectorAll('[class*="price"], [class*="Price"], [data-testid*="price"]');
      for (const el of priceCandidates) {
        // Filter out tiny labels or form inputs
        if (el.tagName === 'INPUT') continue;
        const text = (el.innerText || el.textContent || '').trim();
        if (/^\$?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?$/.test(text)) {
          return text.replace('$', '').trim();
        }
      }
    } catch (e) {}

    return null;
  }

  function pollInstrumentAndPrice() {
    const currentInst = getLiveInstrument();
    const currentPrc = getLivePrice();

    const timestamp = new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');

    // Detect Instrument Change
    if (currentInst && currentInst !== lastTrackedInstrument) {
      const prevInst = lastTrackedInstrument;
      lastTrackedInstrument = currentInst;

      log(`[INSTRUMENT CHANGED] from "${prevInst}" to "${currentInst}"`);
      if (prevInst) {
        handleInstrumentOrChartSwitch(`instrument_poll:${prevInst}->${currentInst}`);
      } else {
        scheduleIctSessionsRender(true);
      }

      dispatchActionLog({
        timestamp,
        type: 'instrument',
        source: 'Market Monitor',
        tag: 'chart',
        elementId: 'market-instrument',
        classes: ['vest-market-ticker'],
        text: `Instrument switched: ${currentInst}` + (prevInst ? ` (was ${prevInst})` : ''),
        selector: 'Market > Instrument',
        value: currentInst,
        instrument: currentInst,
        price: currentPrc || lastTrackedPrice
      });

      // Broadcast ticker update to UI
      window.postMessage({
        type: 'VEST_TICKER_UPDATE',
        instrument: currentInst,
        price: currentPrc || lastTrackedPrice
      }, '*');
    }

    // Detect Price Change
    if (currentPrc && currentPrc !== lastTrackedPrice) {
      const prevPrice = lastTrackedPrice;
      lastTrackedPrice = currentPrc;

      dispatchActionLog({
        timestamp,
        type: 'price',
        source: 'Market Monitor',
        tag: 'price',
        elementId: 'market-price-tick',
        classes: ['vest-live-price'],
        text: `${lastTrackedInstrument || 'Price'}: $${currentPrc}` + (prevPrice ? ` (prev $${prevPrice})` : ''),
        selector: 'Market > Mid Price',
        value: currentPrc,
        instrument: lastTrackedInstrument,
        price: currentPrc
      });

      // Broadcast ticker update to UI
      window.postMessage({
        type: 'VEST_TICKER_UPDATE',
        instrument: lastTrackedInstrument,
        price: currentPrc
      }, '*');
    }
  }

  function setupActionLogging() {
    function onDocClick(e) {
      if (!isActionLoggingEnabled) return;
      const data = buildEventLogData(e, 'click');
      if (data) dispatchActionLog(data);
    }

    function onDocContextMenu(e) {
      if (!isActionLoggingEnabled) return;
      const data = buildEventLogData(e, 'contextmenu');
      if (data) dispatchActionLog(data);
    }

    function onDocInput(e) {
      if (!isActionLoggingEnabled) return;
      const data = buildEventLogData(e, 'input');
      if (data) dispatchActionLog(data);
    }

    function onDocKeydown(e) {
      if (!isActionLoggingEnabled) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if ((tag === 'input' || tag === 'textarea') && e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
        return;
      }
      const data = buildEventLogData(e, 'keydown');
      if (data) dispatchActionLog(data);
    }

    function onDocPointerDown() {
      postToIsolated({ type: 'VEST_OUTSIDE_INTERACTION' });
    }

    if (window.top !== window) {
      document.addEventListener('pointerdown', onDocPointerDown, true);
    }
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('contextmenu', onDocContextMenu, true);
    document.addEventListener('input', onDocInput, true);
    document.addEventListener('change', onDocInput, true);
    document.addEventListener('keydown', onDocKeydown, true);

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument) {
          iframe.contentDocument.addEventListener('pointerdown', onDocPointerDown, true);
          iframe.contentDocument.addEventListener('click', onDocClick, true);
          iframe.contentDocument.addEventListener('contextmenu', onDocContextMenu, true);
          iframe.contentDocument.addEventListener('input', onDocInput, true);
          iframe.contentDocument.addEventListener('change', onDocInput, true);
          iframe.contentDocument.addEventListener('keydown', onDocKeydown, true);
        }
      } catch (e) {}
    });

    // Start live instrument and price polling
    if (!tickerPollInterval) {
      tickerPollInterval = setInterval(pollInstrumentAndPrice, 250);
      // Run immediate initial check
      setTimeout(pollInstrumentAndPrice, 1000);
    }
  }

  // -------------------------------------------------------------
  // Passive Trade History & Closed Position Interceptor (Main World)
  // -------------------------------------------------------------
  function extractTradesFromApiPayload(payload, urlHint = '') {
    if (!payload || typeof payload !== 'object') return [];
    const results = [];
    const isExplicitHistoryUrl = /history|closed|realized/i.test(String(urlHint || ''));

    const visitArray = (arr, parentKeyHint = '') => {
      if (!Array.isArray(arr)) return;
      const isExplicitHistoryKey = isExplicitHistoryUrl || /history|closed/i.test(String(parentKeyHint || ''));

      for (const item of arr) {
        if (!item || typeof item !== 'object') continue;

        // Ignore active/open positions that have unrealized PnL and no closed timestamp
        const statusStr = String(item.status || item.state || '').toUpperCase();
        if (statusStr === 'OPEN' || statusStr === 'ACTIVE' || statusStr === 'WORKING') continue;

        const hasExplicitCloseTime = Boolean(
          item.exitTime ??
          item.closeTime ??
          item.closedAt ??
          item.closed_at ??
          item.settledAt ??
          item.settled_at
        );
        const hasRealizedPnlField = Boolean(
          item.realizedPnl !== undefined ||
          item.realized_pnl !== undefined ||
          item.closedPnl !== undefined ||
          item.closed_pnl !== undefined
        );

        // Must be from a closed/history collection OR have an explicit close timestamp / realizedPnl on a closed position
        if (!isExplicitHistoryKey && !hasExplicitCloseTime && !(hasRealizedPnlField && statusStr === 'CLOSED')) {
          continue;
        }
        // If item has non-zero open size and no close time, it is an open position — skip!
        if (!hasExplicitCloseTime && item.unrealizedPnl !== undefined && item.closedAt === undefined && item.closeTime === undefined) {
          continue;
        }

        const rawPnl =
          item.realizedPnl ??
          item.realized_pnl ??
          item.closedPnl ??
          item.closed_pnl ??
          item.pnl ??
          item.profit ??
          null;
        if (rawPnl === null || rawPnl === undefined || rawPnl === '') continue;
        const pnlNum = Number(String(rawPnl).replace(/[^0-9.-]/g, ''));
        if (!isFinite(pnlNum)) continue;

        const sym =
          item.symbol ||
          item.market ||
          item.instrument ||
          item.ticker ||
          item.pair ||
          lastTrackedInstrument ||
          null;
        if (!sym) continue;

        const entryT =
          item.entryTime ??
          item.openTime ??
          item.openedAt ??
          item.opened_at ??
          item.createdAt ??
          item.created_at ??
          null;
        const exitT =
          item.exitTime ??
          item.closeTime ??
          item.closedAt ??
          item.closed_at ??
          item.settledAt ??
          item.settled_at ??
          item.updatedAt ??
          item.updated_at ??
          item.timestamp ??
          item.time ??
          null;

        // Strictly require BOTH an open/entry timestamp AND a closed/exit timestamp so open positions or single-timestamp fills are never misclassified as Position History trades!
        if (!entryT || !exitT) continue;

        const sideRaw = String(item.side || item.direction || item.positionSide || 'LONG').toUpperCase();
        const side = sideRaw.includes('SHORT') || sideRaw.includes('SELL') ? 'SHORT' : 'LONG';

        results.push({
          id: item.id ? `api_${item.id}` : undefined,
          symbol: String(sym),
          side,
          pnl: pnlNum,
          entryTime: entryT,
          exitTime: exitT,
          durationMs: item.durationMs ?? item.duration ?? undefined,
          entryPrice: item.entryPrice ?? item.avgEntryPrice ?? item.openPrice,
          exitPrice: item.exitPrice ?? item.avgExitPrice ?? item.closePrice ?? item.price,
          source: 'positions_history',
          verifiedHistory: true,
          verifiedBothTimes: true
        });
      }
    };

    if (Array.isArray(payload)) {
      visitArray(payload, urlHint);
    } else {
      const candidateKeys = ['closedPositions', 'positionHistory', 'positionsHistory', 'history', 'trades', 'fills', 'positions', 'data', 'items', 'results', 'rows'];
      for (const k of candidateKeys) {
        if (Array.isArray(payload[k])) {
          visitArray(payload[k], k);
        } else if (payload[k] && typeof payload[k] === 'object') {
          for (const subK of candidateKeys) {
            if (Array.isArray(payload[k][subK])) {
              visitArray(payload[k][subK], `${k}.${subK}`);
            }
          }
        }
      }
    }

    return results;
  }

  function scanReactFiberForPositionHistory() {
    const found = [];
    try {
      const candidates = Array.from(document.querySelectorAll('button, [role="tab"], table, [role="table"], [role="grid"]'));
      const visitedFibers = new Set();

      for (const el of candidates) {
        const txt = (el.innerText || el.textContent || '').trim();
        if (el.tagName === 'BUTTON' && !/positions?\s+history|active\s+positions/i.test(txt)) continue;

        const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        if (!fiberKey) continue;

        let curr = el[fiberKey];
        let depth = 0;
        while (curr && depth < 25) {
          if (visitedFibers.has(curr)) break;
          visitedFibers.add(curr);

          // Check memoizedProps
          if (curr.memoizedProps && typeof curr.memoizedProps === 'object') {
            const extracted = extractTradesFromApiPayload(curr.memoizedProps, 'fiber_props');
            if (extracted.length > 0) found.push(...extracted);
          }

          // Check memoizedState chain (hooks)
          let st = curr.memoizedState;
          let hookDepth = 0;
          while (st && hookDepth < 20) {
            const val = st.memoizedState;
            if (val && typeof val === 'object') {
              const extracted = extractTradesFromApiPayload(val, 'fiber_state');
              if (extracted.length > 0) found.push(...extracted);
            }
            st = st.next;
            hookDepth++;
          }

          curr = curr.return;
          depth++;
        }
      }
    } catch (e) {}
    return found;
  }

  function scanPlatformTradesInMainWorld(notifyToast = false) {
    try {
      const found = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k || k.startsWith('__trading_cortex_') || k.startsWith('tv-chart-drawings-')) continue;
        if (/trade|position|fill|history|pnl/i.test(k)) {
          try {
            const parsed = JSON.parse(window.localStorage.getItem(k));
            const extracted = extractTradesFromApiPayload(parsed, k);
            if (extracted.length > 0) {
              found.push(...extracted);
            }
          } catch (e) {}
        }
      }

      const fiberTrades = scanReactFiberForPositionHistory();
      if (fiberTrades.length > 0) {
        found.push(...fiberTrades);
      }

      if (found.length > 0) {
        postToIsolated({
          type: 'VEST_TRADES_CAPTURED',
          trades: found,
          notifyToast
        });
      }
    } catch (e) {}
  }

  function setupPassiveTradeNetworkListener() {
    if (window.top !== window) return;
    if (window.__TRADING_CORTEX_TRADE_NET_HOOKED__) return;
    window.__TRADING_CORTEX_TRADE_NET_HOOKED__ = true;

    try {
      const origFetch = window.fetch;
      if (typeof origFetch === 'function') {
        window.fetch = async function (...args) {
          const response = await origFetch.apply(this, args);
          try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            if (/trade|fill|position|history|pnl|closed/i.test(url)) {
              const clone = response.clone();
              clone.json().then(data => {
                const trades = extractTradesFromApiPayload(data, url);
                if (trades.length > 0) {
                  postToIsolated({
                    type: 'VEST_TRADES_CAPTURED',
                    trades
                  });
                }
              }).catch(() => {});
            }
          } catch (e) {}
          return response;
        };
      }
    } catch (e) {}

    try {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      if (typeof origOpen === 'function' && typeof origSend === 'function') {
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
          this.__tcUrl = typeof url === 'string' ? url : '';
          return origOpen.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.send = function (...args) {
          this.addEventListener('load', function () {
            try {
              const url = this.__tcUrl || '';
              if (/trade|fill|position|history|pnl|closed/i.test(url) && this.responseText) {
                const data = JSON.parse(this.responseText);
                const trades = extractTradesFromApiPayload(data, url);
                if (trades.length > 0) {
                  postToIsolated({
                    type: 'VEST_TRADES_CAPTURED',
                    trades
                  });
                }
              }
            } catch (e) {}
          });
          return origSend.apply(this, args);
        };
      }
    } catch (e) {}
  }

  // Initialize context menu listener immediately
  setupContextMenuHandler();
  setupActionLogging();
  setupPassiveTradeNetworkListener();

  let pollCount = 0;
  const pollTimer = setInterval(() => {
    pollCount++;
    setupContextMenuHandler();
    const hooked = hookChart();
    if (hooked) {
      syncExtendedRectangleTextHooks();
    }
    if (hooked || pollCount > 100) {
      clearInterval(pollTimer);
      if (hooked) {
        log('TradingView chart successfully hooked on attempt #' + pollCount);
      }
    }
  }, 300);

  // Keep a lightweight maintenance interval to hook or re-hook the chart if Vest replaces the widget/iframe
  setInterval(() => {
    setupContextMenuHandler();
    enhanceTimeframeControls();
    restoreGlobalDrawings();
    if (!activeChart) {
      hookChart();
    } else {
      try {
        const found = findTradingViewApi();
        if (found && found.api && found.api !== activeChartApi) {
          hookChart();
          handleInstrumentOrChartSwitch('chart_api_replaced');
        } else if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
          const liveAc = activeChartApi.activeChart();
          if (liveAc && liveAc !== activeChart) {
            activeChart = liveAc;
            handleInstrumentOrChartSwitch('active_chart_replaced');
          }
        }
      } catch (e) {}
    }
    if (
      currentSettings &&
      ((currentSettings.sessionIndicators && currentSettings.sessionIndicators.enabled) ||
        (currentSettings.autoFvg && currentSettings.autoFvg.enabled) ||
        !currentSettings.candleOhlc ||
        currentSettings.candleOhlc.enabled ||
        currentSettings.candleOhlc.showCandleNumbers ||
        currentSettings.candleOhlc.customCandleWidthEnabled ||
        currentSettings.candleOhlc.clickCandleToToggle !== false ||
        toggledCandleOhlcSet.size > 0 ||
        (currentSettings.cortexIndicator && currentSettings.cortexIndicator.enabled))
    ) {
      setupIctSessionIndicators();
    }
  }, 1500);

  // Announce ready to isolated world
  postToIsolated({ type: 'VEST_TV_MAIN_READY' });
})();

