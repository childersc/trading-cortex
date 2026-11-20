/**
 * Vest Markets Chart Templates - Isolated World Content Script
 * Manages floating UI, chrome.storage syncing, and user shortcuts.
 */

(function () {
  'use strict';

  // Only run isolated world manager in the top window (it communicates with all frames via postToMainWorlds)
  const isTopWindow = window.top === window;
  if (!isTopWindow) return;
  if (window.location && window.location.hostname === 'trade.vestmarkets.com') return;

  const DEFAULT_TEMPLATES = [];

  const LEGACY_PRESET_IDS = new Set([
    'bullish_ob',
    'bearish_ob',
    'fvg',
    'fvg_imbalance',
    'liquidity',
    'liquidity_sweep',
    'breaker_block',
    'consolidation',
    'range_consolidation',
    'volume_imbalance'
  ]);

  const DRAWING_TYPE_CATALOG = [
    { id: 'rectangle', label: 'Rectangle', group: 'Shapes' },
    { id: 'rotated_rectangle', label: 'Rotated Rectangle', group: 'Shapes' },
    { id: 'horiz_line', label: 'Horizontal Line', group: 'Lines & Channels' },
    { id: 'horiz_ray', label: 'Horizontal Ray', group: 'Lines & Channels' },
    { id: 'vert_line', label: 'Vertical Line', group: 'Lines & Channels' },
    { id: 'cross_line', label: 'Cross Line', group: 'Lines & Channels' },
    { id: 'trend_line', label: 'Trend Line', group: 'Lines & Channels' },
    { id: 'ray', label: 'Ray', group: 'Lines & Channels' },
    { id: 'extended', label: 'Extended Line', group: 'Lines & Channels' },
    { id: 'info_line', label: 'Info Line', group: 'Lines & Channels' },
    { id: 'trend_angle', label: 'Trend Angle', group: 'Lines & Channels' },
    { id: 'parallel_channel', label: 'Parallel Channel', group: 'Lines & Channels' },
    { id: 'regression_trend', label: 'Regression Trend', group: 'Lines & Channels' },
    { id: 'flat_bottom', label: 'Flat Top/Bottom', group: 'Lines & Channels' },
    { id: 'disjoint_angle', label: 'Disjoint Channel', group: 'Lines & Channels' },
    { id: 'pitchfork', label: 'Pitchfork', group: 'Pitchforks & Fibs' },
    { id: 'fib_retracement', label: 'Fib Retracement', group: 'Pitchforks & Fibs' },
    { id: 'fib_trend_ext', label: 'Trend-Based Fib Ext', group: 'Pitchforks & Fibs' },
    { id: 'fib_channel', label: 'Fib Channel', group: 'Pitchforks & Fibs' },
    { id: 'fib_time_zone', label: 'Fib Time Zone', group: 'Pitchforks & Fibs' },
    { id: 'fib_fan', label: 'Fib Speed Fan', group: 'Pitchforks & Fibs' },
    { id: 'gann_box', label: 'Gann Box', group: 'Pitchforks & Fibs' },
    { id: 'long_position', label: 'Long Position', group: 'Positions & Ranges' },
    { id: 'short_position', label: 'Short Position', group: 'Positions & Ranges' },
    { id: 'price_range', label: 'Price Range', group: 'Positions & Ranges' },
    { id: 'date_range', label: 'Date Range', group: 'Positions & Ranges' },
    { id: 'date_and_price_range', label: 'Date & Price Range', group: 'Positions & Ranges' },
    { id: 'anchored_vwap', label: 'Anchored VWAP', group: 'Positions & Ranges' },
    { id: 'volume_profile', label: 'Fixed Range Volume Profile', group: 'Positions & Ranges' },
    { id: 'text', label: 'Text', group: 'Annotation & Shapes' },
    { id: 'anchored_text', label: 'Anchored Text', group: 'Annotation & Shapes' },
    { id: 'note', label: 'Note', group: 'Annotation & Shapes' },
    { id: 'callout', label: 'Callout', group: 'Annotation & Shapes' },
    { id: 'price_label', label: 'Price Label', group: 'Annotation & Shapes' },
    { id: 'arrow_marker', label: 'Arrow Marker', group: 'Annotation & Shapes' },
    { id: 'arrow', label: 'Arrow Line', group: 'Annotation & Shapes' },
    { id: 'brush', label: 'Brush', group: 'Annotation & Shapes' },
    { id: 'highlighter', label: 'Highlighter', group: 'Annotation & Shapes' },
    { id: 'path', label: 'Path', group: 'Annotation & Shapes' },
    { id: 'circle', label: 'Circle', group: 'Annotation & Shapes' },
    { id: 'ellipse', label: 'Ellipse', group: 'Annotation & Shapes' },
    { id: 'triangle', label: 'Triangle', group: 'Annotation & Shapes' },
    { id: 'arc', label: 'Arc', group: 'Annotation & Shapes' },
    { id: 'polyline', label: 'Polyline', group: 'Annotation & Shapes' }
  ];

  function getDrawingTypeLabel(typeId) {
    if (!typeId) return 'Rectangle';
    const found = DRAWING_TYPE_CATALOG.find(d => d.id === typeId);
    if (found) return found.label;
    return String(typeId).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function sanitizeUserTemplates(rawList) {
    if (!Array.isArray(rawList)) return [];
    const seenKeys = new Set();
    const cleaned = [];
    for (const t of rawList) {
      if (!t || typeof t !== 'object') continue;
      if (t.id && LEGACY_PRESET_IDS.has(String(t.id))) continue;
      const hydrated = hydrateTemplateForEditor(t);
      const drawingType = hydrated.drawingType || 'rectangle';
      const nameKey = `${drawingType}::${String(hydrated.name || '').trim().toLowerCase()}`;
      if (seenKeys.has(nameKey)) continue;
      seenKeys.add(nameKey);
      cleaned.push(hydrated);
    }
    return cleaned;
  }

  // Safe TradingView Drawing Toolbar Storage Key Validator
  // Prevents capturing or restoring platform auth tokens, user IDs, wallet connectors, or session keys!
  function isSafeTradingViewStorageKey(key) {
    if (typeof key !== 'string' || !key) return false;
    if (key.startsWith('__trading_cortex_')) return false;
    if (
      key.startsWith('tv-chart-drawings-') ||
      key.startsWith('tv-drawings-flush') ||
      key.startsWith('tv-layout-flush') ||
      key.startsWith('user-state-') ||
      key.startsWith('vest') ||
      key.startsWith('mfp') ||
      key.startsWith('privy:') ||
      key.startsWith('wagmi.') ||
      key.startsWith('rk-') ||
      key.startsWith('turnkey_') ||
      key.startsWith('web3') ||
      /auth|token|session|jwt|refresh|bearer|user|account|wallet|privy|wagmi|rainbow|web3|turnkey|dynamic|metamask|coinbase|phantom|keplr|solana|ethereum|address|signature|credential|login|identity|cookie|flush|layout-base/i.test(key)
    ) {
      return false;
    }
    return (
      key === 'properties_toolbar.position' ||
      key.includes('ChartDrawingToolbarWidget') ||
      key.includes('drawingToolbar') ||
      key.includes('drawingTools') ||
      key.includes('side_toolbar') ||
      key.includes('sideToolbar') ||
      key === 'tradingview.IntervalWidget.quicks' ||
      key === 'tradingview.StyleWidget.quicks' ||
      key.startsWith('tradingview.chartproperties') ||
      key.startsWith('linetool.') ||
      key.startsWith('combobox.') ||
      key.startsWith('drawingFavorites')
    );
  }

  function sanitizeSidebarToolbarStorage(rawStorage) {
    if (!rawStorage || typeof rawStorage !== 'object') return {};
    const clean = {};
    for (const [k, v] of Object.entries(rawStorage)) {
      if (typeof v === 'string' && isSafeTradingViewStorageKey(k)) {
        if (k.toLowerCase().includes('toolbar') && (k.endsWith('.visible') || k.includes('visibility')) && v === 'false') {
          clean[k] = 'true';
        } else {
          clean[k] = v;
        }
      }
    }
    return clean;
  }

  let templates = [];
  let globalDrawings = [];

  const SESSION_FONT_FAMILIES = [
    { id: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif', label: 'Trebuchet MS / Default' },
    { id: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'Inter / Modern Sans' },
    { id: '"JetBrains Mono", Consolas, "Liberation Mono", monospace', label: 'JetBrains Mono' },
    { id: 'Roboto, "Helvetica Neue", Arial, sans-serif', label: 'Roboto' },
    { id: 'Impact, "Arial Black", sans-serif', label: 'Impact / Heavy' },
    { id: 'Georgia, "Times New Roman", serif', label: 'Georgia / Serif' }
  ];

  const DEFAULT_SESSION_INDICATORS = {
    enabled: false,
    timezone: 'America/New_York',
    maxDaysBack: 7,
    maxIntradayMinutes: 30,
    boxOpacity: 18,
    showBoxBorder: false,
    showWatermark: true,
    watermarkOpacity: 32,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
    fontSize: 40,
    fontBold: false,
    extendHighLowLines: true,
    highLowLineExtensionMode: 'uncleared', // 'uncleared' | 'all'
    showPermanentDottedHighLow: true,
    permanentLinesDays: 7,
    permanentLineStyle: 1, // 0=solid, 1=dotted, 2=dashed
    permDateFormat: 'M-d-y', // Customizable date stamp format (default: M-d-y -> 10-19-26)
    permLabelVertAlign: 'outside', // 'outside' (High=top, Low=bottom), 'top' (above line), 'inline' (centered on line), 'bottom' (below line)
    permLabelHorzAlign: 'right', // 'right' (far right), 'center' (mid-line), 'left' (start of line)
    permLabelFontSize: 11,
    permLabelFontStyle: 'bold', // 'normal', 'bold', 'italic', 'bold_italic'
    permLabelColorMode: 'session', // 'session' (match session color) or 'custom'
    permLabelCustomColor: '#e2e8f0',
    stopAtMitigation: true,
    showHighLowLabels: true,
    highLowLineWidth: 1,
    highLowLineStyle: 0,
    showMidPoint: false,
    extendMidPoint: false,
    midPointLineStyle: 2,
    sessions: [
      {
        id: 'asia',
        name: 'Asian Killzone',
        watermarkText: 'Asia',
        shortTag: 'AS',
        enabled: true,
        startTime: '20:00',
        endTime: '00:00',
        color: '#3b82f6'
      },
      {
        id: 'london',
        name: 'London Killzone',
        watermarkText: 'London',
        shortTag: 'LOKZ',
        enabled: true,
        startTime: '02:00',
        endTime: '05:00',
        color: '#ef4444'
      },
      {
        id: 'ny_am',
        name: 'NY AM Killzone',
        watermarkText: 'NY AM',
        shortTag: 'NYAM',
        enabled: true,
        startTime: '09:30',
        endTime: '11:00',
        color: '#26a69a'
      },
      {
        id: 'ny_lunch',
        name: 'NY Lunch',
        watermarkText: 'NY Lunch',
        shortTag: 'NYL',
        enabled: true,
        startTime: '12:00',
        endTime: '13:00',
        color: '#eab308'
      },
      {
        id: 'ny_pm',
        name: 'NY PM Killzone',
        watermarkText: 'NY PM',
        shortTag: 'NYPM',
        enabled: true,
        startTime: '13:30',
        endTime: '16:00',
        color: '#a855f7'
      },
      {
        id: 'sb_london',
        name: 'London Silver Bullet',
        watermarkText: 'LDN SB',
        shortTag: 'LSB',
        enabled: false,
        startTime: '03:00',
        endTime: '04:00',
        color: '#38bdf8'
      },
      {
        id: 'sb_ny_am',
        name: 'NY AM Silver Bullet',
        watermarkText: 'AM SB',
        shortTag: 'AMSB',
        enabled: false,
        startTime: '10:00',
        endTime: '11:00',
        color: '#10b981'
      },
      {
        id: 'sb_ny_pm',
        name: 'NY PM Silver Bullet',
        watermarkText: 'PM SB',
        shortTag: 'PMSB',
        enabled: false,
        startTime: '14:00',
        endTime: '15:00',
        color: '#f97316'
      }
    ]
  };

  function normalizeSessionIndicatorsConfig(rawCfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_SESSION_INDICATORS));
    if (!rawCfg || typeof rawCfg !== 'object') return base;

    const merged = {
      ...base,
      ...rawCfg
    };
    const rawLineExtensionMode = String(rawCfg.highLowLineExtensionMode || 'uncleared').toLowerCase();
    merged.highLowLineExtensionMode = rawLineExtensionMode === 'all' || rawLineExtensionMode === 'right' ? 'all' : 'uncleared';

    const incomingSessions = Array.isArray(rawCfg.sessions) ? rawCfg.sessions : [];
    const byId = new Map();
    incomingSessions.forEach(s => {
      if (s && s.id) byId.set(s.id, s);
    });

    merged.sessions = base.sessions.map(defSess => {
      const saved = byId.get(defSess.id);
      if (!saved) return defSess;
      return {
        ...defSess,
        ...saved,
        enabled: typeof saved.enabled === 'boolean' ? saved.enabled : defSess.enabled,
        color: normalizeHexColor(saved.color || defSess.color, defSess.color),
        startTime: saved.startTime || defSess.startTime,
        endTime: saved.endTime || defSess.endTime,
        watermarkText: saved.watermarkText !== undefined ? saved.watermarkText : defSess.watermarkText,
        shortTag: saved.shortTag !== undefined ? saved.shortTag : defSess.shortTag
      };
    });

    return merged;
  }

  const DEFAULT_AUTO_FVG = {
    enabled: false,
    reclaimMode: 'close', // 'close' (Candle Body Close through FVG) | 'wick' (Full Wick Mitigation through FVG)
    extendMode: 'right', // 'right' (Extend Far Right until Reclaimed) | 'current' (Extend to Current Bar + Extra Bars until Reclaimed) | 'template' (Follow Matched Template's Extend Right setting)
    extendFutureBars: 0, // Number of bars to extend past the current time bar when not extending to the far right (e.g. 0 = current bar, 5 = 5 bars past current bar)
    hideReclaimed: false, // If true, hides FVGs once they are reclaimed; if false, freezes them at the reclaim candle
    showReclaimed: true, // Inverse of hideReclaimed — toggled via the dedicated Reclaimed FVG's settings box
    reclaimedColorMode: 'custom', // 'custom' (Automatically recolor reclaimed FVGs to custom colors) | 'dim' (Keep original template color dimmed)
    reclaimedColor: '#787b86', // Legacy/fallback base reclaimed color
    reclaimedOpacity: 18, // Legacy/fallback base reclaimed fill opacity %
    reclaimedBoxColor: '#787b86', // Reclaimed Box Fill Color
    reclaimedBoxOpacity: 18, // Reclaimed Box Fill Opacity (0–100%)
    reclaimedBorderColor: '#787b86', // Reclaimed Border Color
    reclaimedBorderOpacity: 65, // Reclaimed Border Opacity (0–100%)
    reclaimedMidlineColor: '#787b86', // Reclaimed 50% Middle Line Color
    reclaimedMidlineOpacity: 60, // Reclaimed 50% Middle Line Opacity (0–100%)
    maxBarsLookback: 600,
    maxActiveFvgs: 25,
    showReclaimedHistoryCount: 15,
    minGapPercent: 0, // Minimum gap size % (0 = all valid 3-candle FVGs)
    bullishTemplateId: 'auto', // 'auto' (match "<TF> Bullish FVG" / "<TF> FVG" / "FVG") or explicit template ID
    bearishTemplateId: 'auto', // 'auto' (match "<TF> Bearish FVG" / "<TF> FVG" / "FVG") or explicit template ID
    defaultBullishColor: '#26a69a',
    defaultBearishColor: '#ef4444',
    defaultOpacity: 22,
    defaultShowMidline: true,
    defaultShowLabel: true,
    labelFormat: '{tf} FVG', // Supports {tf}, {dir}, {template}
    syncNativeDrawings: false // Optional: also create/update real TradingView rectangle shapes on chart
  };

  function normalizeAutoFvgConfig(rawCfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_AUTO_FVG));
    if (!rawCfg || typeof rawCfg !== 'object') return base;
    const rawExtend = String(rawCfg.extendMode || 'right').toLowerCase();
    const extendMode = (rawExtend === 'current' || rawExtend === 'template') ? rawExtend : 'right';
    const rawFutureBars = Number(rawCfg.extendFutureBars);
    const extendFutureBars = isFinite(rawFutureBars) ? Math.max(0, Math.min(200, Math.round(rawFutureBars))) : 0;
    const showReclaimed = rawCfg.showReclaimed !== undefined
      ? Boolean(rawCfg.showReclaimed)
      : !Boolean(rawCfg.hideReclaimed);
    const hideReclaimed = !showReclaimed;
    const reclaimedColorMode = rawCfg.reclaimedColorMode === 'dim' ? 'dim' : 'custom';
    const reclaimedColor = normalizeHexColor(rawCfg.reclaimedColor || base.reclaimedColor, base.reclaimedColor);
    const reclaimedOpacity = Math.max(0, Math.min(100, Number(rawCfg.reclaimedOpacity ?? 18)));
    const reclaimedBoxColor = normalizeHexColor(rawCfg.reclaimedBoxColor || reclaimedColor, base.reclaimedBoxColor);
    const reclaimedBoxOpacity = Math.max(0, Math.min(100, Number(rawCfg.reclaimedBoxOpacity ?? reclaimedOpacity)));
    const reclaimedBorderColor = normalizeHexColor(rawCfg.reclaimedBorderColor || reclaimedColor, base.reclaimedBorderColor);
    const reclaimedBorderOpacity = Math.max(0, Math.min(100, Number(rawCfg.reclaimedBorderOpacity ?? 65)));
    const reclaimedMidlineColor = normalizeHexColor(rawCfg.reclaimedMidlineColor || reclaimedBorderColor || reclaimedColor, base.reclaimedMidlineColor);
    const reclaimedMidlineOpacity = Math.max(0, Math.min(100, Number(rawCfg.reclaimedMidlineOpacity ?? 60)));
    return {
      ...base,
      ...rawCfg,
      enabled: Boolean(rawCfg.enabled),
      reclaimMode: rawCfg.reclaimMode === 'wick' ? 'wick' : 'close',
      extendMode,
      extendFutureBars,
      shrinkOnPartialFill: false,
      showReclaimed,
      hideReclaimed,
      reclaimedColorMode,
      reclaimedColor: reclaimedBoxColor,
      reclaimedOpacity: reclaimedBoxOpacity,
      reclaimedBoxColor,
      reclaimedBoxOpacity,
      reclaimedBorderColor,
      reclaimedBorderOpacity,
      reclaimedMidlineColor,
      reclaimedMidlineOpacity,
      maxBarsLookback: Math.max(50, Math.min(3000, Number(rawCfg.maxBarsLookback) || 600)),
      maxActiveFvgs: Math.max(1, Math.min(100, Number(rawCfg.maxActiveFvgs) || 25)),
      showReclaimedHistoryCount: Math.max(0, Math.min(100, Number(rawCfg.showReclaimedHistoryCount ?? 15))),
      minGapPercent: Math.max(0, Number(rawCfg.minGapPercent) || 0),
      bullishTemplateId: rawCfg.bullishTemplateId || 'auto',
      bearishTemplateId: rawCfg.bearishTemplateId || 'auto',
      defaultBullishColor: normalizeHexColor(rawCfg.defaultBullishColor || base.defaultBullishColor, base.defaultBullishColor),
      defaultBearishColor: normalizeHexColor(rawCfg.defaultBearishColor || base.defaultBearishColor, base.defaultBearishColor),
      defaultOpacity: Math.max(5, Math.min(85, Number(rawCfg.defaultOpacity ?? 22))),
      defaultShowMidline: rawCfg.defaultShowMidline !== false,
      defaultShowLabel: rawCfg.defaultShowLabel !== false,
      labelFormat: typeof rawCfg.labelFormat === 'string' ? rawCfg.labelFormat : '{tf} FVG',
      syncNativeDrawings: Boolean(rawCfg.syncNativeDrawings)
    };
  }

  const NEWS_ALL_COUNTRIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD', 'CNY'];

  const DEFAULT_NEWS_BOX = {
    enabled: false,
    collapsed: false,
    pinned: false,
    pinnedLeft: null,
    pinnedTop: null,
    // Relative anchor in the usable screen area (0.0 to 1.0), above the Cortex bottom bar.
    relX: 0.02,
    relY: 0.08,
    boxTitle: 'Upcoming News',
    boxWidth: 325,
    maxEvents: 6,
    bgColor: '#131722',
    bgOpacity: 88,
    borderColor: '#38bdf8',
    fontSize: 11,
    showRedFolder: true, // High Impact (Red Folder)
    showYellowFolder: true, // Medium Impact (Yellow/Orange Folder)
    showGreenFolder: true, // Low Impact (Green Folder)
    redFolderColor: '#f23645',
    yellowFolderColor: '#ff9800',
    greenFolderColor: '#26a69a',
    countries: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD', 'CNY'],
    timeZoneMode: 'ny', // 'ny' (America/New_York EST/EDT) | 'local' (Browser Local Time) | 'utc' (UTC)
    timeFormat: '12h', // '12h' (8:30am) | '24h' (08:30)
    showCountdown: true,
    showCountryFlag: true,
    showPastTodayMinutes: 15, // Keep just-released events visible for N minutes
    customEvents: [] // Optional user-added custom news events: [{ id, time: '08:30', country: 'USD', folder: 'red'|'yellow'|'green', title: 'CPI m/m' }]
  };

  function normalizeNewsBoxConfig(rawCfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_NEWS_BOX));
    if (!rawCfg || typeof rawCfg !== 'object') return base;
    const relX = isFinite(Number(rawCfg.relX)) ? Math.max(0, Math.min(1, Number(rawCfg.relX))) : base.relX;
    const relY = isFinite(Number(rawCfg.relY)) ? Math.max(0, Math.min(1, Number(rawCfg.relY))) : base.relY;
    const pinnedLeft = rawCfg.pinnedLeft !== null && rawCfg.pinnedLeft !== undefined && isFinite(Number(rawCfg.pinnedLeft)) ? Math.round(Number(rawCfg.pinnedLeft)) : null;
    const pinnedTop = rawCfg.pinnedTop !== null && rawCfg.pinnedTop !== undefined && isFinite(Number(rawCfg.pinnedTop)) ? Math.round(Number(rawCfg.pinnedTop)) : null;
    const countries = Array.isArray(rawCfg.countries) && rawCfg.countries.length > 0
      ? rawCfg.countries.filter(c => NEWS_ALL_COUNTRIES.includes(String(c).toUpperCase())).map(c => String(c).toUpperCase())
      : base.countries;
    const customEvents = Array.isArray(rawCfg.customEvents)
      ? rawCfg.customEvents.filter(ev => ev && typeof ev === 'object' && ev.title).map(ev => ({
          id: String(ev.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
          time: String(ev.time || '08:30'),
          country: String(ev.country || 'USD').toUpperCase(),
          folder: ['red', 'yellow', 'green'].includes(ev.folder) ? ev.folder : 'red',
          title: String(ev.title || 'Custom Event').trim()
        }))
      : [];
    return {
      ...base,
      ...rawCfg,
      enabled: Boolean(rawCfg.enabled),
      collapsed: Boolean(rawCfg.collapsed),
      pinned: Boolean(rawCfg.pinned),
      pinnedLeft,
      pinnedTop,
      relX,
      relY,
      boxTitle: typeof rawCfg.boxTitle === 'string' && rawCfg.boxTitle.trim() ? rawCfg.boxTitle.trim() : base.boxTitle,
      boxWidth: Math.max(240, Math.min(520, Number(rawCfg.boxWidth) || 325)),
      maxEvents: Math.max(1, Math.min(25, Number(rawCfg.maxEvents) || 6)),
      bgColor: normalizeHexColor(rawCfg.bgColor || base.bgColor, base.bgColor),
      bgOpacity: Math.max(20, Math.min(100, Number(rawCfg.bgOpacity ?? 88))),
      borderColor: normalizeHexColor(rawCfg.borderColor || base.borderColor, base.borderColor),
      fontSize: Math.max(9, Math.min(16, Number(rawCfg.fontSize) || 11)),
      showRedFolder: rawCfg.showRedFolder !== false,
      showYellowFolder: rawCfg.showYellowFolder !== false,
      showGreenFolder: rawCfg.showGreenFolder !== false,
      redFolderColor: normalizeHexColor(rawCfg.redFolderColor || base.redFolderColor, base.redFolderColor),
      yellowFolderColor: normalizeHexColor(rawCfg.yellowFolderColor || base.yellowFolderColor, base.yellowFolderColor),
      greenFolderColor: normalizeHexColor(rawCfg.greenFolderColor || base.greenFolderColor, base.greenFolderColor),
      countries: countries.length > 0 ? countries : base.countries,
      timeZoneMode: ['ny', 'local', 'utc'].includes(rawCfg.timeZoneMode) ? rawCfg.timeZoneMode : 'ny',
      timeFormat: rawCfg.timeFormat === '24h' ? '24h' : '12h',
      showCountdown: rawCfg.showCountdown !== false,
      showCountryFlag: rawCfg.showCountryFlag !== false,
      showPastTodayMinutes: Math.max(0, Math.min(240, Number(rawCfg.showPastTodayMinutes ?? 15))),
      customEvents
    };
  }

  const DEFAULT_TRADES_BOX = {
    enabled: false,
    collapsed: false,
    pinned: false,
    pinnedLeft: null,
    pinnedTop: null,
    // Relative anchor in the usable screen area (0.0 to 1.0), above the Cortex bottom bar.
    relX: 0.02,
    relY: 0.42,
    boxTitle: 'Instrument Trades',
    boxWidth: 465,
    maxTrades: 15,
    bgColor: '#131722',
    bgOpacity: 88,
    borderColor: '#38bdf8',
    winRowColor: '#10b981',
    winRowOpacity: 24,
    lossRowColor: '#f23645',
    lossRowOpacity: 24,
    longBadgeTextColor: '#38bdf8',
    longBadgeBgColor: '#0f172a',
    longBadgeBgOpacity: 85,
    longBadgeBorderColor: '#38bdf8',
    shortBadgeTextColor: '#fbbf24',
    shortBadgeBgColor: '#0f172a',
    shortBadgeBgOpacity: 85,
    shortBadgeBorderColor: '#fbbf24',
    sideBadgeFontFamily: '"JetBrains Mono", Consolas, "Liberation Mono", monospace',
    sideBadgeFontSize: 9.5,
    sideBadgeFontStyle: 'bold', // 'normal' | 'bold' | 'italic' | 'bold_italic'
    filterCurrentInstrument: true,
    filterCurrentSessionOnly: true, // 6:00 PM ET previous night to 4:59 PM ET current day
    showSideBadge: true,
    showSummaryFooter: true,
    autoCaptureTrades: true,
    timeZoneMode: 'ny', // 'ny' | 'local' | 'utc'
    timeFormat: '12h', // '12h' | '24h'
    trades: [] // [{ id, symbol, side, pnl, entryTime, exitTime, durationMs, entryPrice, exitPrice, size, source }]
  };

  const DEFAULT_CANDLE_OHLC = {
    enabled: false, // When true, shows O/H/L/C values on EVERY visible candle on the chart
    clickCandleToToggle: true, // When true, clicking any individual candle toggles that candle's O/H/L/C values ON or OFF
    showCandleNumbers: false, // When true, labels candles #1 (current forming candle) backward up to candleNumbersMax (default 100) in a small glow box below each candle
    candleNumbersMax: 100, // Number of candles backward from #1 to label (default 100)
    candleNumberGlowColor: '#38bdf8',
    candleNumberTextColor: '#f8fafc',
    candleNumberBgColor: '#0f172a',
    candleNumberBgOpacity: 90,
    candleNumberFontSize: 9.5,
    customCandleWidthEnabled: false, // When true, scales individual candle body/wick width in place without zooming the chart
    candleWidthPx: 140, // Candle body width scale % (40%..260%, where 100% = normal candle width, 140% = 1.4x wider candles)
    displayMode: 'badge', // 'badge' (compact OHLC card above/below candle) | 'levels' (price tags at O, H, L, C levels on the candle)
    showOpen: true,
    showHigh: true,
    showLow: true,
    showClose: true,
    fontSize: 10,
    decimals: 'auto', // 'auto' | '0' | '1' | '2' | '3' | '4' | '5'
    bgColor: '#0f172a',
    bgOpacity: 88,
    textColor: '#f8fafc',
    bullColor: '#10b981',
    bearColor: '#f23645'
  };

  function normalizeCandleOhlcConfig(rawCfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_CANDLE_OHLC));
    if (!rawCfg || typeof rawCfg !== 'object') return base;
    let rawWidthScale = Number(rawCfg.candleWidthPx);
    // Migrate legacy 3..55 barSpacing value to percentage scale (140% default)
    if (!isFinite(rawWidthScale) || rawWidthScale <= 55) {
      rawWidthScale = 140;
    }
    return {
      ...base,
      ...rawCfg,
      enabled: Boolean(rawCfg.enabled),
      clickCandleToToggle: rawCfg.clickCandleToToggle !== false,
      showCandleNumbers: Boolean(rawCfg.showCandleNumbers),
      candleNumbersMax: Math.max(10, Math.min(300, Math.round(Number(rawCfg.candleNumbersMax) || 100))),
      candleNumberGlowColor: normalizeHexColor(rawCfg.candleNumberGlowColor || base.candleNumberGlowColor, base.candleNumberGlowColor),
      candleNumberTextColor: normalizeHexColor(rawCfg.candleNumberTextColor || base.candleNumberTextColor, base.candleNumberTextColor),
      candleNumberBgColor: normalizeHexColor(rawCfg.candleNumberBgColor || base.candleNumberBgColor, base.candleNumberBgColor),
      candleNumberBgOpacity: Math.max(20, Math.min(100, Number(rawCfg.candleNumberBgOpacity ?? 90))),
      candleNumberFontSize: Math.max(7.5, Math.min(14, Number(rawCfg.candleNumberFontSize) || 9.5)),
      customCandleWidthEnabled: Boolean(rawCfg.customCandleWidthEnabled),
      candleWidthPx: Math.max(40, Math.min(260, Math.round(rawWidthScale / 5) * 5)),
      displayMode: rawCfg.displayMode === 'levels' ? 'levels' : 'badge',
      showOpen: rawCfg.showOpen !== false,
      showHigh: rawCfg.showHigh !== false,
      showLow: rawCfg.showLow !== false,
      showClose: rawCfg.showClose !== false,
      fontSize: Math.max(8, Math.min(16, Number(rawCfg.fontSize) || 10)),
      decimals: ['auto', '0', '1', '2', '3', '4', '5'].includes(String(rawCfg.decimals)) ? String(rawCfg.decimals) : 'auto',
      bgColor: normalizeHexColor(rawCfg.bgColor || base.bgColor, base.bgColor),
      bgOpacity: Math.max(20, Math.min(100, Number(rawCfg.bgOpacity ?? 88))),
      textColor: normalizeHexColor(rawCfg.textColor || base.textColor, base.textColor),
      bullColor: normalizeHexColor(rawCfg.bullColor || base.bullColor, base.bullColor),
      bearColor: normalizeHexColor(rawCfg.bearColor || base.bearColor, base.bearColor)
    };
  }

  const DEFAULT_DIAGNOSTICS_BOX = { enabled: false, collapsed: false, pinned: false, pinnedLeft: null, pinnedTop: null, relX: 0.72, relY: 0.12, boxWidth: 360, bgColor: '#0f172a', bgOpacity: 94, borderColor: '#38bdf8' };

  const DEFAULT_ACCOUNTS_RISK_BOX = {
    enabled: true,
    collapsed: false,
    boxWidth: 248,
    fontSize: 10.5,
    offsetX: 12,
    offsetY: 108,
    riskPercent: 1.0,
    showOtherPnl: true,
    bgColor: '#0b101b',
    bgOpacity: 82,
    borderColor: '#38bdf8'
  };

  const DEFAULT_POSITION_HUD = {
    enabled: true,           // Master toggle: enable active position overlay HUD
    showPriceLineHud: true,  // Rectangle box on current yellow price line displaying live PnL
    showFlattenBtn: true,    // Interactive [ ✕ ] button next to price line PnL to flatten position
    showEntryBadge: true,    // PnL badge immediately to left of chart's entry box
    showPnlPercent: true,    // Show percentage alongside dollar PnL (e.g. +$0.14 (+0.05%))
    autoConfirmFlatten: true // Auto-confirm modal if Vest platform requires a confirmation step
  };

  const DEFAULT_FAIL_LINES = { enabled: false, labelSize: 100, fontSize: 11 };

  const DEFAULT_CORTEX_INDICATOR = {
    enabled: false,
    emaLength: 34,
    atrLength: 14,
    trendMultiplier: 2.6,
    showSignals: true,
    showTargets: true,
    levelDistanceMode: 'points',
    stopLossPoints: 8,
    targetSpacingPoints: 4,
    levelFontSize: 11,
    levelBoxScale: 100,
    targetRiskMultipliers: [1, 2, 3],
    showTrendTable: true,
    formingSignalVoiceAlert: true,
    confirmedSignalVoiceAlert: true,
    signalAlertVoiceURI: '',
    executionEnabled: false,
    executionMode: 'paper',
    liveArmed: false,
    reversalIgnoreBars: 5
  };

  function normalizeCortexIndicatorConfig(rawCfg) {
    const cfg = { ...DEFAULT_CORTEX_INDICATOR, ...(rawCfg && typeof rawCfg === 'object' ? rawCfg : {}) };
    const targetMultipliers = Array.isArray(cfg.targetRiskMultipliers) ? cfg.targetRiskMultipliers : DEFAULT_CORTEX_INDICATOR.targetRiskMultipliers;
    return {
      enabled: Boolean(cfg.enabled),
      emaLength: Math.max(5, Math.min(200, Math.round(Number(cfg.emaLength) || DEFAULT_CORTEX_INDICATOR.emaLength))),
      atrLength: Math.max(3, Math.min(100, Math.round(Number(cfg.atrLength) || DEFAULT_CORTEX_INDICATOR.atrLength))),
      trendMultiplier: Math.max(1, Math.min(6, Number(cfg.trendMultiplier) || DEFAULT_CORTEX_INDICATOR.trendMultiplier)),
      showSignals: cfg.showSignals !== false,
      showTargets: cfg.showTargets !== false,
      levelDistanceMode: cfg.levelDistanceMode === 'atr' ? 'atr' : 'points',
      stopLossPoints: Math.max(1, Math.min(20, Number(cfg.stopLossPoints) || DEFAULT_CORTEX_INDICATOR.stopLossPoints)),
      targetSpacingPoints: Math.max(0.25, Math.min(20, Number(cfg.targetSpacingPoints) || DEFAULT_CORTEX_INDICATOR.targetSpacingPoints)),
      levelFontSize: Math.max(8, Math.min(24, Number(cfg.levelFontSize) || DEFAULT_CORTEX_INDICATOR.levelFontSize)),
      levelBoxScale: Math.max(75, Math.min(200, Number(cfg.levelBoxScale) || DEFAULT_CORTEX_INDICATOR.levelBoxScale)),
      targetRiskMultipliers: [0, 1, 2].map(i => Math.max(0.5, Math.min(10, Number(targetMultipliers[i]) || i + 1))),
      showTrendTable: cfg.showTrendTable !== false,
      formingSignalVoiceAlert: cfg.formingSignalVoiceAlert !== false,
      confirmedSignalVoiceAlert: cfg.confirmedSignalVoiceAlert !== false,
      signalAlertVoiceURI: String(cfg.signalAlertVoiceURI || '').slice(0, 300),
      executionEnabled: cfg.executionEnabled === true,
      executionMode: cfg.executionMode === 'live' ? 'live' : 'paper',
      liveArmed: cfg.liveArmed === true,
      reversalIgnoreBars: Math.max(0, Math.min(100, Math.round(Number.isFinite(Number(cfg.reversalIgnoreBars)) ? Number(cfg.reversalIgnoreBars) : 5)))
    };
  }

  function normalizeFailLinesConfig(rawCfg) {
    const cfg = { ...DEFAULT_FAIL_LINES, ...(rawCfg && typeof rawCfg === 'object' ? rawCfg : {}) };
    return {
      enabled: Boolean(cfg.enabled),
      labelSize: Math.max(75, Math.min(150, Number(cfg.labelSize) || DEFAULT_FAIL_LINES.labelSize)),
      fontSize: Math.max(8, Math.min(18, Number(cfg.fontSize) || DEFAULT_FAIL_LINES.fontSize))
    };
  }

  // -------------------------------------------------------------
  // Range Detector (Multi-Timeframe) Configuration & Defaults
  // -------------------------------------------------------------
  const DEFAULT_RANGE_DETECTOR = {
    enabled: false,
    lookbackBars: 20,
    chopThreshold: 55, // Choppiness Index >= 55 indicates ranging/consolidation
    adxThreshold: 22, // ADX <= 22 indicates weak trend / ranging
    detectionMode: 'hybrid', // 'hybrid' | 'chop' | 'adx' | 'channel'
    timeframes: ['1m', '5m', '15m', '1h', '4h', '1D'],
    voiceAlertEnabled: true,
    chimeAlertEnabled: true,
    voiceURI: '',
    glowEffect: true,
    boxWidth: 290,
    bgOpacity: 90,
    relX: 0.04,
    relY: 0.18,
    pinned: false,
    pinnedLeft: null,
    pinnedTop: null,
    collapsed: false
  };

  function normalizeRangeDetectorConfig(rawCfg) {
    const cfg = { ...DEFAULT_RANGE_DETECTOR, ...(rawCfg && typeof rawCfg === 'object' ? rawCfg : {}) };
    const validTfs = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1D', '1W'];
    let timeframes = Array.isArray(cfg.timeframes) && cfg.timeframes.length > 0
      ? cfg.timeframes.filter(tf => validTfs.includes(tf))
      : ['1m', '5m', '15m', '1h', '4h', '1D'];
    if (!timeframes.includes('1m') && (timeframes.includes('5m') || timeframes.includes('15m'))) {
      timeframes = ['1m', ...timeframes];
    }
    return {
      enabled: Boolean(cfg.enabled),
      lookbackBars: Math.max(10, Math.min(50, Math.round(Number(cfg.lookbackBars) || 20))),
      chopThreshold: Math.max(35, Math.min(80, Math.round(Number(cfg.chopThreshold) || 55))),
      adxThreshold: Math.max(10, Math.min(40, Math.round(Number(cfg.adxThreshold) || 22))),
      detectionMode: ['hybrid', 'chop', 'adx', 'channel'].includes(cfg.detectionMode) ? cfg.detectionMode : 'hybrid',
      timeframes: timeframes.length > 0 ? timeframes : ['1m', '5m', '15m', '1h', '4h', '1D'],
      voiceAlertEnabled: cfg.voiceAlertEnabled !== false,
      chimeAlertEnabled: cfg.chimeAlertEnabled !== false,
      voiceURI: typeof cfg.voiceURI === 'string' ? cfg.voiceURI : '',
      glowEffect: cfg.glowEffect !== false,
      boxWidth: Math.max(240, Math.min(450, Math.round(Number(cfg.boxWidth) || 290))),
      bgOpacity: Math.max(30, Math.min(100, Math.round(Number(cfg.bgOpacity) || 90))),
      relX: typeof cfg.relX === 'number' && Number.isFinite(cfg.relX) ? Math.max(0, Math.min(1, cfg.relX)) : 0.04,
      relY: typeof cfg.relY === 'number' && Number.isFinite(cfg.relY) ? Math.max(0, Math.min(1, cfg.relY)) : 0.18,
      pinned: Boolean(cfg.pinned),
      pinnedLeft: typeof cfg.pinnedLeft === 'number' && Number.isFinite(cfg.pinnedLeft) ? cfg.pinnedLeft : null,
      pinnedTop: typeof cfg.pinnedTop === 'number' && Number.isFinite(cfg.pinnedTop) ? cfg.pinnedTop : null,
      collapsed: Boolean(cfg.collapsed)
    };
  }

  const DEFAULT_MARKET_STRUCTURE = {
    enabled: false,
    swingLookback: 5,
    showBos: true,
    showChoch: true,
    breakMode: 'close', // 'close' | 'wick'
    labelMode: 'both', // 'both' | 'mss' | 'bos' | 'choch'
    bullishColor: '#10b981',
    bearishColor: '#ef4444',
    lineStyle: 'dashed', // 'dashed' | 'solid'
    lineWidth: 1.5,
    fontSize: 10,
    maxStructureLines: 15,
    extendLines: false
  };

  function normalizeMarketStructureConfig(rawCfg) {
    const cfg = { ...DEFAULT_MARKET_STRUCTURE, ...(rawCfg && typeof rawCfg === 'object' ? rawCfg : {}) };
    return {
      enabled: Boolean(cfg.enabled),
      swingLookback: Math.max(3, Math.min(20, Math.round(Number(cfg.swingLookback) || 5))),
      showBos: cfg.showBos !== false,
      showChoch: cfg.showChoch !== false,
      breakMode: cfg.breakMode === 'wick' ? 'wick' : 'close',
      labelMode: ['both', 'mss', 'bos', 'choch'].includes(cfg.labelMode) ? cfg.labelMode : 'both',
      bullishColor: typeof cfg.bullishColor === 'string' && /^#[0-9a-f]{6}$/i.test(cfg.bullishColor) ? cfg.bullishColor : '#10b981',
      bearishColor: typeof cfg.bearishColor === 'string' && /^#[0-9a-f]{6}$/i.test(cfg.bearishColor) ? cfg.bearishColor : '#ef4444',
      lineStyle: cfg.lineStyle === 'solid' ? 'solid' : 'dashed',
      lineWidth: Math.max(1, Math.min(3, Number(cfg.lineWidth) || 1.5)),
      fontSize: Math.max(8, Math.min(16, Math.round(Number(cfg.fontSize) || 10))),
      maxStructureLines: Math.max(5, Math.min(30, Math.round(Number(cfg.maxStructureLines) || 15))),
      extendLines: Boolean(cfg.extendLines)
    };
  }

  const DEFAULT_ORDER_BLOCKS = {
    enabled: false,
    swingLookback: 5,
    minFvgTicks: 1,
    maxBlocks: 10,
    extendMode: 'mitigation', // 'mitigation' | 'right'
    bullishColor: '#10b981',
    bullishOpacity: 20,
    bearishColor: '#ef4444',
    bearishOpacity: 20,
    labelFontSize: 18,
    mtfLabelFontSize: 22,
    mtfMaxBlocksPerTf: 4,
    mtfTimeframes: {
      '5m': { enabled: true, bullishColor: '#06b6d4', bearishColor: '#f97316', opacity: 18 },
      '15m': { enabled: true, bullishColor: '#3b82f6', bearishColor: '#ec4899', opacity: 18 },
      '1h': { enabled: true, bullishColor: '#8b5cf6', bearishColor: '#eab308', opacity: 20 },
      '4h': { enabled: true, bullishColor: '#14b8a6', bearishColor: '#f43f5e', opacity: 22 }
    },
    dismissedOrderBlocks: [],
    showOrderEntryIcon: true,
    orderIconSize: 13,
    voiceAlertEnabled: true,
    chimeAlertEnabled: true,
    voiceURI: '',
    showTargetLines: true,
    riskRewardRatio: 3.0,
    showStatsBox: true,
    statsRrRatio: 3.0,
    statsBoxWidth: 290,
    statsBoxPinned: false,
    statsBoxPinnedLeft: null,
    statsBoxPinnedTop: null,
    statsBoxCollapsed: false,
    statsBoxRelX: 0.04,
    statsBoxRelY: 0.54
  };

  function normalizeOrderBlocksConfig(rawCfg) {
    const cfg = { ...DEFAULT_ORDER_BLOCKS, ...(rawCfg && typeof rawCfg === 'object' ? rawCfg : {}) };
    const defaultMtf = {
      '5m': { enabled: true, bullishColor: '#06b6d4', bearishColor: '#f97316', opacity: 18 },
      '15m': { enabled: true, bullishColor: '#3b82f6', bearishColor: '#ec4899', opacity: 18 },
      '1h': { enabled: true, bullishColor: '#8b5cf6', bearishColor: '#eab308', opacity: 20 },
      '4h': { enabled: true, bullishColor: '#14b8a6', bearishColor: '#f43f5e', opacity: 22 }
    };
    const rawMtf = (cfg.mtfTimeframes && typeof cfg.mtfTimeframes === 'object') ? cfg.mtfTimeframes : {};
    const mtfTimeframes = {};
    ['5m', '15m', '1h', '4h'].forEach(tf => {
      const def = defaultMtf[tf];
      const src = (rawMtf[tf] && typeof rawMtf[tf] === 'object') ? rawMtf[tf] : {};
      mtfTimeframes[tf] = {
        enabled: src.enabled !== undefined ? Boolean(src.enabled) : def.enabled,
        bullishColor: typeof src.bullishColor === 'string' && /^#[0-9a-f]{6}$/i.test(src.bullishColor) ? src.bullishColor : def.bullishColor,
        bearishColor: typeof src.bearishColor === 'string' && /^#[0-9a-f]{6}$/i.test(src.bearishColor) ? src.bearishColor : def.bearishColor,
        opacity: Math.max(5, Math.min(80, Math.round(Number(src.opacity) || def.opacity)))
      };
    });
    return {
      enabled: Boolean(cfg.enabled),
      swingLookback: Math.max(3, Math.min(15, Math.round(Number(cfg.swingLookback) || 5))),
      minFvgTicks: Math.max(0, Math.min(20, Math.round(Number(cfg.minFvgTicks) || 1))),
      maxBlocks: Math.max(3, Math.min(30, Math.round(Number(cfg.maxBlocks) || 10))),
      extendMode: (cfg.extendMode === 'right' || cfg.extendMode === 'candle') ? cfg.extendMode : 'mitigation',
      bullishColor: typeof cfg.bullishColor === 'string' && /^#[0-9a-f]{6}$/i.test(cfg.bullishColor) ? cfg.bullishColor : '#10b981',
      bullishOpacity: Math.max(5, Math.min(80, Math.round(Number(cfg.bullishOpacity) || 20))),
      bearishColor: typeof cfg.bearishColor === 'string' && /^#[0-9a-f]{6}$/i.test(cfg.bearishColor) ? cfg.bearishColor : '#ef4444',
      bearishOpacity: Math.max(5, Math.min(80, Math.round(Number(cfg.bearishOpacity) || 20))),
      labelFontSize: Math.max(8, Math.min(48, Math.round(Number(cfg.labelFontSize) || 18))),
      mtfLabelFontSize: Math.max(8, Math.min(48, Math.round(Number(cfg.mtfLabelFontSize) || 22))),
      mtfMaxBlocksPerTf: Math.max(1, Math.min(10, Math.round(Number(cfg.mtfMaxBlocksPerTf) || 4))),
      mtfTimeframes,
      dismissedOrderBlocks: Array.isArray(cfg.dismissedOrderBlocks)
        ? Array.from(new Set(cfg.dismissedOrderBlocks.filter(k => typeof k === 'string' && k.trim().length > 0).map(k => k.trim()))).slice(-300)
        : [],
      showOrderEntryIcon: cfg.showOrderEntryIcon !== false,
      orderIconSize: Math.max(10, Math.min(24, Math.round(Number(cfg.orderIconSize) || 13))),
      voiceAlertEnabled: cfg.voiceAlertEnabled !== false,
      chimeAlertEnabled: cfg.chimeAlertEnabled !== false,
      voiceURI: typeof cfg.voiceURI === 'string' ? cfg.voiceURI : '',
      showTargetLines: cfg.showTargetLines !== false,
      riskRewardRatio: Math.max(1.0, Math.min(10.0, Number(cfg.riskRewardRatio) || 3.0)),
      showStatsBox: cfg.showStatsBox !== false,
      statsRrRatio: Math.max(1.0, Math.min(10.0, Number(cfg.statsRrRatio) || 3.0)),
      statsBoxWidth: Math.max(240, Math.min(450, Math.round(Number(cfg.statsBoxWidth) || 290))),
      statsBoxPinned: Boolean(cfg.statsBoxPinned),
      statsBoxPinnedLeft: typeof cfg.statsBoxPinnedLeft === 'number' && Number.isFinite(cfg.statsBoxPinnedLeft) ? cfg.statsBoxPinnedLeft : null,
      statsBoxPinnedTop: typeof cfg.statsBoxPinnedTop === 'number' && Number.isFinite(cfg.statsBoxPinnedTop) ? cfg.statsBoxPinnedTop : null,
      statsBoxCollapsed: Boolean(cfg.statsBoxCollapsed),
      statsBoxRelX: typeof cfg.statsBoxRelX === 'number' && Number.isFinite(cfg.statsBoxRelX) ? Math.max(0, Math.min(1, cfg.statsBoxRelX)) : 0.04,
      statsBoxRelY: typeof cfg.statsBoxRelY === 'number' && Number.isFinite(cfg.statsBoxRelY) ? Math.max(0, Math.min(1, cfg.statsBoxRelY)) : 0.54
    };
  }

  let lastSentFailPrices = '';
  const ORDER_AMOUNT_MEMORY_PREFIX = '__trading_cortex_order_amount__:';
  function getOrderTicketPanel() {
    return findPanelElement(PANEL_DEFINITIONS.find(def => def.key === 'order_ticket'));
  }

  function getOrderAmountMemoryKey() {
    let market = 'default';
    const marketSelector = typeof findMarketSelectorElement === 'function' ? findMarketSelectorElement() : null;
    if (marketSelector && marketSelector.marketPillEl) {
      const text = (marketSelector.marketPillEl.innerText || marketSelector.marketPillEl.textContent || '').trim();
      const match = text.match(/\b([A-Z0-9]{1,8})\b/);
      if (match) market = match[1];
    }
    return `${ORDER_AMOUNT_MEMORY_PREFIX}${location.hostname}:${market}`;
  }

  function findOrderAmountControls(panel) {
    if (!panel) return null;
    const inputs = Array.from(panel.querySelectorAll('input')).filter(input => {
      const rect = input.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !['checkbox', 'radio', 'range', 'hidden'].includes(input.type);
    });
    const amountInput = inputs.find(input => {
      let node = input;
      for (let depth = 0; node && node !== panel && depth < 5; depth++, node = node.parentElement) {
        const text = (node.innerText || node.textContent || '').toLowerCase();
        if (text.includes('amount') && !text.includes('take profit') && !text.includes('stop loss')) return true;
      }
      return /amount/i.test(`${input.getAttribute('aria-label') || ''} ${input.placeholder || ''}`);
    });
    if (!amountInput) return null;

    let unitControl = null;
    let node = amountInput.parentElement;
    for (let depth = 0; node && node !== panel && depth < 5 && !unitControl; depth++, node = node.parentElement) {
      const candidates = node.querySelectorAll('button, [role="button"], select');
      for (const candidate of candidates) {
        if (candidate === amountInput || candidate.contains(amountInput)) continue;
        const text = (candidate.innerText || candidate.textContent || candidate.value || '').replace(/[↕▼⌄▾]/g, '').trim();
        if (/^(USD|[A-Z]{2,8})$/i.test(text)) {
          unitControl = candidate;
          break;
        }
      }
    }
    return { amountInput, unitControl };
  }

  function dispatchOrderInputEvents(input) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const restoredAmountInputs = new WeakSet();
  const watchedAmountInputs = new WeakSet();
  function rememberOrderAmount() {
    const panel = getOrderTicketPanel();
    const controls = findOrderAmountControls(panel);
    if (!controls) return;
    const key = getOrderAmountMemoryKey();
    const readUnit = control => control ? (control.tagName === 'SELECT' ? control.selectedOptions[0]?.textContent : control.innerText || control.textContent || '').replace(/[↕▼⌄▾]/g, '').trim() : '';
    const save = () => {
      const value = controls.amountInput.value;
      if (!value) return;
      const record = { amount: value, unit: readUnit(controls.unitControl) };
      try { localStorage.setItem(key, JSON.stringify(record)); } catch (e) {}
    };
    if (!restoredAmountInputs.has(controls.amountInput)) {
      restoredAmountInputs.add(controls.amountInput);
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved && typeof saved.amount === 'string' && saved.amount) {
          const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(controls.amountInput), 'value')?.set;
          if (setter) setter.call(controls.amountInput, saved.amount);
          else controls.amountInput.value = saved.amount;
          dispatchOrderInputEvents(controls.amountInput);
        }
        if (saved && saved.unit && controls.unitControl) {
          if (controls.unitControl.tagName === 'SELECT') {
            const option = Array.from(controls.unitControl.options).find(item => item.textContent.trim() === saved.unit || item.value === saved.unit);
            if (option) {
              controls.unitControl.value = option.value;
              controls.unitControl.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if (readUnit(controls.unitControl) !== saved.unit) {
            controls.unitControl.click();
            setTimeout(() => {
              const options = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], button'));
              const option = options.find(item => item.isConnected && (item.innerText || item.textContent || '').trim() === saved.unit);
              if (option) option.click();
            }, 100);
          }
        }
      } catch (e) {}
    }
    if (!watchedAmountInputs.has(controls.amountInput)) {
      watchedAmountInputs.add(controls.amountInput);
      controls.amountInput.addEventListener('input', save);
      controls.amountInput.addEventListener('change', save);
      controls.unitControl?.addEventListener('click', () => setTimeout(save, 200));
    }
  }

  const orderAmountInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(orderAmountInterval);
      return;
    }
    rememberOrderAmount();
  }, 700);

  let latestFailPrices = { long: null, short: null };
  let lastSentEstimatedPnl = '';
  let pendingStopLoss = null;
  let lastBroadcastStopLoss = '';

  function broadcastStopLossEstimate(side, price) {
    const payload = { side: ['long', 'short'].includes(side) ? side : null, price: Number.isFinite(price) && price > 0 ? price : null };
    const signature = JSON.stringify(payload);
    if (signature === lastBroadcastStopLoss) return;
    lastBroadcastStopLoss = signature;
    postToMainWorlds({ type: 'VEST_TV_STOP_LOSS_UPDATE', payload });
  }

  function getCurrentMarketPrice() {
    const labels = Array.from(document.querySelectorAll('span, div, p')).filter(el => (el.textContent || '').trim() === 'Mid Price');
    for (const label of labels) {
      let node = label.parentElement;
      for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
        const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ');
        const match = text.match(/Mid Price\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
        if (match) {
          const price = Number(match[1].replace(/,/g, ''));
          if (Number.isFinite(price) && price > 0) return price;
        }
      }
    }
    return null;
  }

  function findStopLossInput(panel) {
    if (!panel) return null;
    const inputs = Array.from(panel.querySelectorAll('input')).filter(input => {
      const rect = input.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !['checkbox', 'radio', 'range', 'hidden'].includes(input.type);
    });
    return inputs.find(input => /stop\s*loss/i.test(`${input.getAttribute('aria-label') || ''} ${input.placeholder || ''} ${input.name || ''}`)) ||
      inputs.find(input => {
        let node = input.parentElement;
        for (let depth = 0; node && node !== panel && depth < 4; depth++, node = node.parentElement) {
          const text = (node.innerText || node.textContent || '').toLowerCase();
          if (text.includes('stop loss') && !text.includes('take profit')) return true;
        }
        return false;
      }) || null;
  }

  function roundStopPrice(price, panel) {
    const symbol = getOrderAmountMemoryKey().split(':').pop();
    const knownTicks = { ES: 0.25, MES: 0.25, NQ: 0.25, MNQ: 0.25, RTY: 0.1, M2K: 0.1, YM: 1, MYM: 1, CL: 0.01, MCL: 0.01, GC: 0.1, MGC: 0.1 };
    let tick = knownTicks[symbol] || null;
    if (!tick && panel) {
      const stopInput = findStopLossInput(panel);
      const inputStep = Number(stopInput && stopInput.step);
      if (Number.isFinite(inputStep) && inputStep > 0 && inputStep !== 1) tick = inputStep;
    }
    if (tick) return Number((Math.round(price / tick) * tick).toFixed(8));
    return Number(price.toFixed(8));
  }

  function setStopLossValue(price) {
    const panel = getOrderTicketPanel();
    const input = findStopLossInput(panel);
    if (!input || !Number.isFinite(price)) return false;
    const formatted = String(roundStopPrice(price, panel));
    if (input.value !== formatted) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
      if (setter) setter.call(input, formatted);
      else input.value = formatted;
      dispatchOrderInputEvents(input);
    }
    return true;
  }

  function syncPendingStopLoss() {
    const panel = getOrderTicketPanel();
    if (!panel) return;
    const stopInput = findStopLossInput(panel);
    if (stopInput && !watchedStopLossInputs.has(stopInput)) {
      watchedStopLossInputs.add(stopInput);
      const clearEstimateIfInputCleared = () => {
        if (stopInput.value.trim() !== '') return;
        pendingStopLoss = null;
        broadcastStopLossEstimate(null, null);
      };
      stopInput.addEventListener('input', clearEstimateIfInputCleared);
      stopInput.addEventListener('change', clearEstimateIfInputCleared);
    }
    if (pendingStopLoss) {
      if (pendingStopLoss.orderClickedAt && Date.now() - pendingStopLoss.orderClickedAt > 1200) {
        const notices = Array.from(document.querySelectorAll('[role="alert"], [role="status"], [class*="toast"], [class*="Toast"], [class*="notification"]'));
        const hasOrderError = notices.some(el => /order|position|margin|balance/i.test(el.textContent || '') && /failed|reject|error|insufficient|unable/i.test(el.textContent || ''));
        if (hasOrderError) pendingStopLoss.orderClickedAt = 0;
        else {
          if (stopInput) {
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(stopInput), 'value')?.set;
            if (setter) setter.call(stopInput, '');
            else stopInput.value = '';
            dispatchOrderInputEvents(stopInput);
          }
          pendingStopLoss = null;
          broadcastStopLossEstimate(null, null);
        }
      }
    }
  }

  const watchedStopLossInputs = new WeakSet();
  document.addEventListener('click', event => {
    if (!pendingStopLoss) return;
    const panel = getOrderTicketPanel();
    const button = event.target && event.target.closest && event.target.closest('button, [role="button"]');
    if (!panel || !button || !panel.contains(button)) return;
    if (/^(buy\/long|sell\/short|long|short)(\b|\s)/i.test((button.innerText || button.textContent || '').trim())) {
      pendingStopLoss.orderClickedAt = Date.now();
    }
  }, true);

  const stopLossInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(stopLossInterval);
      return;
    }
    syncPendingStopLoss();
  }, 500);

  function readAndBroadcastFailPrices() {
    const pageText = (document.body && document.body.innerText) || '';
    const lowerText = pageText.toLowerCase();
    let searchFrom = 0;
    let bestPrices = null;
    while (searchFrom < lowerText.length) {
      const failIndex = lowerText.indexOf('fail price', searchFrom);
      if (failIndex < 0) break;
      searchFrom = failIndex + 'fail price'.length;
      const nextFailIndex = lowerText.indexOf('fail price', searchFrom);
      const block = pageText.slice(searchFrom, nextFailIndex < 0 ? searchFrom + 260 : Math.min(nextFailIndex, searchFrom + 260));
      const parse = side => {
        const match = block.match(new RegExp(`${side}\\s*\\$\\s*([\\d,]+(?:\\.\\d+)?)`, 'i'));
        if (!match) return null;
        const value = Number(match[1].replace(/,/g, ''));
        return Number.isFinite(value) && value > 0 ? value : null;
      };
      const prices = { long: parse('Long'), short: parse('Short') };
      if (prices.long !== null || prices.short !== null) {
        bestPrices = prices;
        if (prices.long !== null && prices.short !== null) break;
      }
    }
    if (!bestPrices) return;
    latestFailPrices = bestPrices;
    if (!settings || !normalizeFailLinesConfig(settings.failLines).enabled) return;
    const signature = JSON.stringify(bestPrices);
    if (signature === lastSentFailPrices) return;
    lastSentFailPrices = signature;
    postToMainWorlds({ type: 'VEST_TV_FAIL_PRICES_UPDATE', payload: bestPrices });
  }
  const failPricesInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(failPricesInterval);
      return;
    }
    readAndBroadcastFailPrices();
  }, 500);

  function readAndBroadcastEstimatedPnl() {
    if (!isTopWindow) return;
    const pageText = (document.body && document.body.innerText) || '';
    const matches = Array.from(pageText.matchAll(/Est\.?\s*P(?:n|&)\s*L\s*[:\s]*([+-]?\s*\$?\s*[\d,]+(?:\.\d+)?)/gi));
    if (!matches.length) return;
    const rawValue = matches[matches.length - 1][1].replace(/[,$\s]/g, '');
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    if (String(value) === lastSentEstimatedPnl) return;
    lastSentEstimatedPnl = String(value);
    postToMainWorlds({ type: 'VEST_TV_ESTIMATED_PNL_UPDATE', payload: { value } });
  }
  const estimatedPnlInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(estimatedPnlInterval);
      return;
    }
    readAndBroadcastEstimatedPnl();
  }, 500);

  function normalizePositionHudConfig(rawCfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_POSITION_HUD));
    if (!rawCfg || typeof rawCfg !== 'object') return base;
    return {
      ...base,
      ...rawCfg,
      enabled: rawCfg.enabled !== false,
      showPriceLineHud: rawCfg.showPriceLineHud !== false,
      showFlattenBtn: rawCfg.showFlattenBtn !== false,
      showEntryBadge: rawCfg.showEntryBadge !== false,
      showPnlPercent: rawCfg.showPnlPercent !== false,
      autoConfirmFlatten: rawCfg.autoConfirmFlatten !== false
    };
  }

  function normalizeDiagnosticsBoxConfig(rawCfg) {
    { const base = JSON.parse(JSON.stringify(DEFAULT_DIAGNOSTICS_BOX));
    if (!rawCfg || typeof rawCfg !== 'object') return base;
    const relX = isFinite(Number(rawCfg.relX)) ? Math.max(0, Math.min(1, Number(rawCfg.relX))) : base.relX;
    const relY = isFinite(Number(rawCfg.relY)) ? Math.max(0, Math.min(1, Number(rawCfg.relY))) : base.relY;
    const pinnedLeft = rawCfg.pinnedLeft !== null && rawCfg.pinnedLeft !== undefined && isFinite(Number(rawCfg.pinnedLeft)) ? Math.round(Number(rawCfg.pinnedLeft)) : null;
    const pinnedTop = rawCfg.pinnedTop !== null && rawCfg.pinnedTop !== undefined && isFinite(Number(rawCfg.pinnedTop)) ? Math.round(Number(rawCfg.pinnedTop)) : null;
    return {
      ...base,
      ...rawCfg,
      enabled: Boolean(rawCfg.enabled),
      collapsed: Boolean(rawCfg.collapsed),
      pinned: Boolean(rawCfg.pinned),
      pinnedLeft,
      pinnedTop,
      relX,
      relY,
      boxWidth: Math.max(280, Math.min(560, Number(rawCfg.boxWidth) || base.boxWidth)),
      bgColor: normalizeHexColor(rawCfg.bgColor || base.bgColor, base.bgColor),
      bgOpacity: Math.max(20, Math.min(100, Number(rawCfg.bgOpacity ?? 94))),
      borderColor: normalizeHexColor(rawCfg.borderColor || base.borderColor, base.borderColor)
    };
    };
  }

  function normalizeAccountsRiskBoxConfig(rawCfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS_RISK_BOX));
    if (!rawCfg || typeof rawCfg !== 'object') return base;
    const riskPctRaw = Number(rawCfg.riskPercent);
    const riskPercent = Number.isFinite(riskPctRaw)
      ? Math.max(0.05, Math.min(50, Math.round(riskPctRaw * 100) / 100))
      : base.riskPercent;
    const offsetXRaw = Number(rawCfg.offsetX);
    let offsetYRaw = Number(rawCfg.offsetY);
    if (offsetYRaw === 52 || offsetYRaw === 76) {
      offsetYRaw = base.offsetY;
    }
    const fontSizeRaw = Number(rawCfg.fontSize);
    const fontSize = Number.isFinite(fontSizeRaw)
      ? Math.max(8, Math.min(18, Math.round(fontSizeRaw * 2) / 2))
      : base.fontSize;
    return {
      ...base,
      ...rawCfg,
      enabled: rawCfg.enabled !== false,
      collapsed: Boolean(rawCfg.collapsed),
      boxWidth: Math.max(200, Math.min(480, Math.round(Number(rawCfg.boxWidth) || base.boxWidth))),
      fontSize,
      offsetX: Number.isFinite(offsetXRaw) ? Math.max(4, Math.min(400, Math.round(offsetXRaw))) : base.offsetX,
      offsetY: Number.isFinite(offsetYRaw) ? Math.max(4, Math.min(400, Math.round(offsetYRaw))) : base.offsetY,
      riskPercent,
      showOtherPnl: rawCfg.showOtherPnl !== false,
      bgColor: normalizeHexColor(rawCfg.bgColor || base.bgColor, base.bgColor),
      bgOpacity: Math.max(20, Math.min(100, Number(rawCfg.bgOpacity ?? base.bgOpacity))),
      borderColor: normalizeHexColor(rawCfg.borderColor || base.borderColor, base.borderColor)
    };
  }

  function computeAccountInstrumentStatus(account, currentSymbol, riskPercent) {
    const sym = typeof normalizeInstrumentKey === 'function'
      ? normalizeInstrumentKey(currentSymbol)
      : String(currentSymbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const balance = (account && typeof account.balance === 'number' && Number.isFinite(account.balance))
      ? account.balance
      : null;
    const pct = Math.max(0.05, Math.min(50, Number(riskPercent) || 1.0));
    const riskAmount = balance !== null ? Math.max(0, balance * (pct / 100)) : null;

    const positionsMap = (account && account.positionsBySymbol && typeof account.positionsBySymbol === 'object')
      ? account.positionsBySymbol
      : {};
    let instPos = sym ? (positionsMap[sym] || null) : null;
    if (!instPos && sym) {
      for (const k of Object.keys(positionsMap)) {
        const nk = typeof normalizeInstrumentKey === 'function' ? normalizeInstrumentKey(k) : String(k || '').toUpperCase();
        if (nk === sym || nk.startsWith(sym) || sym.startsWith(nk)) {
          instPos = positionsMap[k];
          break;
        }
      }
    }
    const hasOpenOnInstrument = Boolean(instPos);
    const totalOpenPnl = (account && typeof account.totalOpenPnl === 'number' && Number.isFinite(account.totalOpenPnl))
      ? account.totalOpenPnl
      : null;

    return {
      symbol: sym || '',
      balance,
      riskPercent: pct,
      riskAmount,
      hasOpenOnInstrument,
      instrumentPosition: instPos,
      totalOpenPnl
    };
  }

  /**
   * Computes the current Trading Session window in America/New_York (ET):
   * Starts at 6:00 PM ET (18:00:00) the previous night and runs to 4:59:59 PM ET (16:59:59) of the session day.
   */
  function getCurrentEtTradingSessionBounds(nowEpochMs = Date.now()) {
    try {
      const d = new Date(nowEpochMs);
      const nyFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = nyFmt.formatToParts(d);
      const map = {};
      for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
      }
      const nyHour = map.hour === 24 ? 0 : (map.hour || 0);
      const nyMin = map.minute || 0;
      const nySec = map.second || 0;

      // Determine ET offset by comparing UTC representation of these components with d.getTime()
      const asUtcMs = Date.UTC(map.year, (map.month || 1) - 1, map.day || 1, nyHour, nyMin, nySec);
      const etOffsetMs = asUtcMs - Math.floor(nowEpochMs / 1000) * 1000;

      // Midnight (00:00:00 ET) of the current NY calendar date in real epoch ms:
      const todayMidnightEtMs = Date.UTC(map.year, (map.month || 1) - 1, map.day || 1, 0, 0, 0) - etOffsetMs;

      // If current NY time is >= 18:00 ET (6:00 PM ET), the new session started today at 6:00 PM ET
      // and ends tomorrow at 4:59:59 PM ET.
      // Otherwise (before 6:00 PM ET), the active session started yesterday at 6:00 PM ET (18:00)
      // and ends today at 4:59:59 PM ET (16:59:59.999).
      let startMs;
      let endMs;
      if (nyHour >= 18) {
        startMs = todayMidnightEtMs + 18 * 3600 * 1000;
        endMs = todayMidnightEtMs + (24 + 16) * 3600 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999;
      } else {
        startMs = todayMidnightEtMs - 6 * 3600 * 1000; // Yesterday 18:00 ET (24 - 18 = 6h before midnight)
        endMs = todayMidnightEtMs + 16 * 3600 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999; // Today 16:59:59.999 ET
      }
      return { startMs, endMs, etOffsetMs, todayMidnightEtMs, nyYear: map.year, nyMonth: map.month, nyDay: map.day };
    } catch (e) {
      const fallbackStart = nowEpochMs - 24 * 3600 * 1000;
      return { startMs: fallbackStart, endMs: nowEpochMs + 12 * 3600 * 1000, etOffsetMs: -14400000 };
    }
  }

  function isTradeWithinCurrentEtSession(trade, sessionBounds = null) {
    if (!trade) return false;
    const bounds = sessionBounds || getCurrentEtTradingSessionBounds();
    const exitMs = Number(trade.exitTime || trade.entryTime || 0);
    const entryMs = Number(trade.entryTime || exitMs || 0);
    // Include trade if its exit time (or entry time) falls within [6:00 PM ET prev night .. 4:59:59 PM ET current day]
    return (exitMs >= bounds.startMs && exitMs <= bounds.endMs) || (entryMs >= bounds.startMs && entryMs <= bounds.endMs);
  }

  function parseDurationStringMs(rawStr) {
    if (!rawStr || typeof rawStr !== 'string') return null;
    const s = rawStr.trim().toLowerCase();
    let totalMs = 0;
    let matched = false;
    const dMatch = s.match(/(\d+(?:\.\d+)?)\s*d/);
    if (dMatch) { totalMs += parseFloat(dMatch[1]) * 86400000; matched = true; }
    const hMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
    if (hMatch) { totalMs += parseFloat(hMatch[1]) * 3600000; matched = true; }
    const mMatch = s.match(/(\d+(?:\.\d+)?)\s*m(?!s)/);
    if (mMatch) { totalMs += parseFloat(mMatch[1]) * 60000; matched = true; }
    const sMatch = s.match(/(\d+(?:\.\d+)?)\s*s/);
    if (sMatch) { totalMs += parseFloat(sMatch[1]) * 1000; matched = true; }
    if (!matched && /^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
      const parts = s.split(':').map(Number);
      if (parts.length === 3) {
        totalMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        matched = true;
      } else if (parts.length === 2) {
        totalMs = (parts[0] * 60 + parts[1]) * 1000;
        matched = true;
      }
    }
    return matched ? Math.round(totalMs) : null;
  }

  function parseFlexibleTimestampMs(val, fallbackMs = Date.now()) {
    if (typeof val === 'number' && isFinite(val) && val > 0) {
      return val < 1e11 ? Math.round(val * 1000) : Math.round(val);
    }
    if (typeof val !== 'string' || !val.trim()) return fallbackMs;
    const s = val.trim().replace(/\s+/g, ' ');

    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      return n < 1e11 ? Math.round(n * 1000) : Math.round(n);
    }

    // Check relative time strings like "12m ago", "2h ago", "45s ago"
    const agoMatch = s.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)\s*ago$/i);
    if (agoMatch) {
      const num = parseFloat(agoMatch[1]);
      const unit = agoMatch[2].toLowerCase();
      if (unit.startsWith('s')) return Date.now() - Math.round(num * 1000);
      if (unit.startsWith('m')) return Date.now() - Math.round(num * 60000);
      if (unit.startsWith('h')) return Date.now() - Math.round(num * 3600000);
      if (unit.startsWith('d')) return Date.now() - Math.round(num * 86400000);
    }

    // Check MM/DD HH:mm(:ss) or MM-DD HH:mm(:ss) without year (assume current year)
    const mdTimeMatch = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (mdTimeMatch) {
      const now = new Date();
      const mon = parseInt(mdTimeMatch[1], 10) - 1;
      const day = parseInt(mdTimeMatch[2], 10);
      let yr = mdTimeMatch[3] ? parseInt(mdTimeMatch[3], 10) : now.getFullYear();
      if (yr < 100) yr += 2000;
      let hh = parseInt(mdTimeMatch[4], 10);
      const mm = parseInt(mdTimeMatch[5], 10) || 0;
      const ss = parseInt(mdTimeMatch[6], 10) || 0;
      const ampm = (mdTimeMatch[7] || '').toLowerCase();
      if (ampm === 'pm' && hh < 12) hh += 12;
      if (ampm === 'am' && hh === 12) hh = 0;
      const dt = new Date(yr, mon, day, hh, mm, ss);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }

    // Check time-only string HH:mm or HH:mm:ss (with optional am/pm)
    // Place it inside the active 6pm ET -> 4:59pm ET trading session!
    const hmMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (hmMatch) {
      const now = new Date();
      let hh = parseInt(hmMatch[1], 10);
      const mm = parseInt(hmMatch[2], 10) || 0;
      const ss = parseInt(hmMatch[3], 10) || 0;
      const ampm = (hmMatch[4] || '').toLowerCase();
      if (ampm === 'pm' && hh < 12) hh += 12;
      if (ampm === 'am' && hh === 12) hh = 0;
      let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss).getTime();
      // If candidate is in the future by > 10 minutes (e.g., 20:15 from last night's 6pm+ session), shift back 1 day
      if (candidate > Date.now() + 10 * 60 * 1000) {
        candidate -= 24 * 3600 * 1000;
      }
      return candidate;
    }

    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return parsed;
    return fallbackMs;
  }

  function normalizeInstrumentKey(rawSymbol) {
    if (!rawSymbol) return '';
    let s = String(rawSymbol).trim().toUpperCase();
    // Strip TradingView exchange prefix e.g. "VEST:BTC-PERP" -> "BTC-PERP"
    if (s.includes(':')) s = s.split(':').pop().trim();
    // Strip leverage badges or extra tokens from header e.g. "★ SOL Solana 5x" -> "SOL"
    s = s.replace(/^[★☆\s]+/, '').trim();
    const firstToken = s.split(/\s+/)[0] || s;
    // Normalize common suffixes (-PERP, -USD, -USDT, -USDC, /USD, PERP) to canonical base ticker for matching
    const base = firstToken
      .replace(/[-_/](PERP|USD|USDT|USDC|SPOT|SWAP|FUT)$/i, '')
      .replace(/(PERP|USDT|USDC|USD)$/i, '');
    return base || firstToken;
  }

  function formatInstrumentDisplayLabel(rawSymbol) {
    if (!rawSymbol) return 'ACTIVE';
    let s = String(rawSymbol).trim().toUpperCase();
    if (s.includes(':')) s = s.split(':').pop().trim();
    s = s.replace(/^[★☆\s]+/, '').trim();
    const firstToken = s.split(/\s+/)[0] || s;
    return firstToken.slice(0, 14);
  }

  function normalizeTradeEntry(rawTrade) {
    if (!rawTrade || typeof rawTrade !== 'object') return null;
    const rawSym = String(rawTrade.symbol || rawTrade.instrument || rawTrade.market || currentInstrument || 'BTC-PERP').trim();
    const rawPnl = Number(String(rawTrade.pnl ?? rawTrade.realizedPnl ?? 0).replace(/[^0-9.-]/g, ''));
    const pnl = isFinite(rawPnl) ? Math.round(rawPnl * 100) / 100 : 0;

    const nowMs = Date.now();
    const rawEntryVal = rawTrade.entryTime ?? rawTrade.openedAt ?? rawTrade.openTime ?? rawTrade.createdAt ?? null;
    const rawExitVal = rawTrade.exitTime ?? rawTrade.closedAt ?? rawTrade.closeTime ?? rawTrade.updatedAt ?? null;
    const rawDurVal = rawTrade.durationMs !== undefined && rawTrade.durationMs !== null
      ? (typeof rawTrade.durationMs === 'string' ? parseDurationStringMs(rawTrade.durationMs) ?? Number(rawTrade.durationMs) : Number(rawTrade.durationMs))
      : (typeof rawTrade.duration === 'string' ? parseDurationStringMs(rawTrade.duration) : null);

    let exitTimeMs = rawExitVal !== null && rawExitVal !== undefined && rawExitVal !== ''
      ? parseFlexibleTimestampMs(rawExitVal, nowMs)
      : null;
    let entryTimeMs = rawEntryVal !== null && rawEntryVal !== undefined && rawEntryVal !== ''
      ? parseFlexibleTimestampMs(rawEntryVal, exitTimeMs ? exitTimeMs - 15 * 60 * 1000 : nowMs - 15 * 60 * 1000)
      : null;

    if (exitTimeMs !== null && entryTimeMs === null) {
      entryTimeMs = (rawDurVal !== null && isFinite(rawDurVal) && rawDurVal > 0)
        ? exitTimeMs - rawDurVal
        : exitTimeMs;
    } else if (entryTimeMs !== null && exitTimeMs === null) {
      exitTimeMs = (rawDurVal !== null && isFinite(rawDurVal) && rawDurVal > 0)
        ? entryTimeMs + rawDurVal
        : entryTimeMs;
    } else if (entryTimeMs === null && exitTimeMs === null) {
      exitTimeMs = nowMs;
      entryTimeMs = (rawDurVal !== null && isFinite(rawDurVal) && rawDurVal > 0) ? nowMs - rawDurVal : nowMs;
    }

    if (entryTimeMs > exitTimeMs) {
      // If entry time was a time-only string from yesterday evening (e.g. 21:30) and exit was today morning (e.g. 09:15)
      if (entryTimeMs - exitTimeMs > 4 * 3600 * 1000 && typeof rawEntryVal === 'string' && /^\d{1,2}:\d{2}/.test(rawEntryVal.trim())) {
        entryTimeMs -= 24 * 3600 * 1000;
      } else {
        const tmp = entryTimeMs;
        entryTimeMs = exitTimeMs;
        exitTimeMs = tmp;
      }
    }

    const durationMs = (rawDurVal !== null && isFinite(rawDurVal) && rawDurVal >= 0)
      ? Math.round(rawDurVal)
      : Math.max(0, exitTimeMs - entryTimeMs);

    if (exitTimeMs === entryTimeMs && durationMs > 0) {
      entryTimeMs = exitTimeMs - durationMs;
    }

    const sideRaw = String(rawTrade.side || rawTrade.direction || 'LONG').toUpperCase();
    const side = sideRaw.includes('SHORT') || sideRaw.includes('SELL') ? 'SHORT' : 'LONG';
    const symKey = normalizeInstrumentKey(rawSym);
    const deterministicId = `trd_${symKey}_${side}_${Math.round(entryTimeMs / 1000)}_${Math.round(exitTimeMs / 1000)}_${Math.round(pnl * 100)}`;

    return {
      id: String(rawTrade.id || deterministicId),
      symbol: formatInstrumentDisplayLabel(rawSym),
      symbolKey: symKey,
      side,
      pnl,
      entryTime: entryTimeMs,
      exitTime: exitTimeMs,
      durationMs,
      entryPrice: rawTrade.entryPrice !== undefined && rawTrade.entryPrice !== null && rawTrade.entryPrice !== '' ? Number(rawTrade.entryPrice) : null,
      exitPrice: rawTrade.exitPrice !== undefined && rawTrade.exitPrice !== null && rawTrade.exitPrice !== '' ? Number(rawTrade.exitPrice) : null,
      source: String(rawTrade.source || 'manual'),
      verifiedHistory: Boolean(rawTrade.verifiedHistory || rawTrade.source === 'manual' || rawTrade.source === 'positions_history'),
      verifiedBothTimes: Boolean(rawTrade.verifiedBothTimes || rawTrade.source === 'manual')
    };
  }

  function normalizeTradesBoxConfig(rawCfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_TRADES_BOX));
    if (!rawCfg || typeof rawCfg !== 'object') return base;
    const relX = isFinite(Number(rawCfg.relX)) ? Math.max(0, Math.min(1, Number(rawCfg.relX))) : base.relX;
    const relY = isFinite(Number(rawCfg.relY)) ? Math.max(0, Math.min(1, Number(rawCfg.relY))) : base.relY;
    const pinnedLeft = rawCfg.pinnedLeft !== null && rawCfg.pinnedLeft !== undefined && isFinite(Number(rawCfg.pinnedLeft)) ? Math.round(Number(rawCfg.pinnedLeft)) : null;
    const pinnedTop = rawCfg.pinnedTop !== null && rawCfg.pinnedTop !== undefined && isFinite(Number(rawCfg.pinnedTop)) ? Math.round(Number(rawCfg.pinnedTop)) : null;
    const seenIds = new Set();
    const seenSigs = new Set();
    const trades = Array.isArray(rawCfg.trades)
      ? rawCfg.trades
          // Filter out any legacy unverified 'dom_table' rows or corrupted Active Positions rows (where entryTime was swapped with a single timestamp)
          .filter(raw => {
            if (!raw || raw.source === 'dom_table') return false;
            // Only keep manual trades or Position History rows that have verified both entry & exit timestamps
            if (raw.source !== 'manual' && raw.verifiedBothTimes !== true) return false;
            return true;
          })
          .map(normalizeTradeEntry)
          .filter(t => {
            if (!t) return false;
            const sig = `${t.symbolKey}::${t.side}::${Math.round((t.exitTime || 0) / 5000)}::${Math.round((t.pnl || 0) * 100)}`;
            if (seenIds.has(t.id) || seenSigs.has(sig)) return false;
            seenIds.add(t.id);
            seenSigs.add(sig);
            return true;
          })
      : [];
    // Sort newest exitTime first
    trades.sort((a, b) => (b.exitTime || 0) - (a.exitTime || 0));

    return {
      ...base,
      ...rawCfg,
      enabled: Boolean(rawCfg.enabled),
      collapsed: Boolean(rawCfg.collapsed),
      pinned: Boolean(rawCfg.pinned),
      pinnedLeft,
      pinnedTop,
      relX,
      relY,
      boxTitle: typeof rawCfg.boxTitle === 'string' && rawCfg.boxTitle.trim() ? rawCfg.boxTitle.trim() : base.boxTitle,
      // Auto-migrate legacy 385px / 420px / 450px widths to 465px so all 5 columns fit cleanly without overflowing
      boxWidth: Math.max(430, Math.min(680, ([385, 420, 450].includes(Number(rawCfg.boxWidth)) ? 465 : Number(rawCfg.boxWidth)) || 465)),
      maxTrades: Math.max(1, Math.min(50, Number(rawCfg.maxTrades) || 15)),
      bgColor: normalizeHexColor(rawCfg.bgColor || base.bgColor, base.bgColor),
      bgOpacity: Math.max(20, Math.min(100, Number(rawCfg.bgOpacity ?? 88))),
      borderColor: normalizeHexColor(rawCfg.borderColor || base.borderColor, base.borderColor),
      winRowColor: normalizeHexColor(rawCfg.winRowColor || base.winRowColor, base.winRowColor),
      winRowOpacity: Math.max(8, Math.min(85, Number(rawCfg.winRowOpacity ?? 24))),
      lossRowColor: normalizeHexColor(rawCfg.lossRowColor || base.lossRowColor, base.lossRowColor),
      lossRowOpacity: Math.max(8, Math.min(85, Number(rawCfg.lossRowOpacity ?? 24))),
      longBadgeTextColor: normalizeHexColor(rawCfg.longBadgeTextColor || base.longBadgeTextColor, base.longBadgeTextColor),
      longBadgeBgColor: normalizeHexColor(rawCfg.longBadgeBgColor || base.longBadgeBgColor, base.longBadgeBgColor),
      longBadgeBgOpacity: Math.max(0, Math.min(100, Number(rawCfg.longBadgeBgOpacity ?? 85))),
      longBadgeBorderColor: normalizeHexColor(rawCfg.longBadgeBorderColor || base.longBadgeBorderColor, base.longBadgeBorderColor),
      shortBadgeTextColor: normalizeHexColor(rawCfg.shortBadgeTextColor || base.shortBadgeTextColor, base.shortBadgeTextColor),
      shortBadgeBgColor: normalizeHexColor(rawCfg.shortBadgeBgColor || base.shortBadgeBgColor, base.shortBadgeBgColor),
      shortBadgeBgOpacity: Math.max(0, Math.min(100, Number(rawCfg.shortBadgeBgOpacity ?? 85))),
      shortBadgeBorderColor: normalizeHexColor(rawCfg.shortBadgeBorderColor || base.shortBadgeBorderColor, base.shortBadgeBorderColor),
      sideBadgeFontFamily: typeof rawCfg.sideBadgeFontFamily === 'string' && rawCfg.sideBadgeFontFamily.trim()
        ? rawCfg.sideBadgeFontFamily
        : base.sideBadgeFontFamily,
      sideBadgeFontSize: Math.max(7, Math.min(15, Number(rawCfg.sideBadgeFontSize) || 9.5)),
      sideBadgeFontStyle: ['normal', 'bold', 'italic', 'bold_italic'].includes(rawCfg.sideBadgeFontStyle)
        ? rawCfg.sideBadgeFontStyle
        : 'bold',
      filterCurrentInstrument: rawCfg.filterCurrentInstrument !== false,
      filterCurrentSessionOnly: rawCfg.filterCurrentSessionOnly !== false,
      showSideBadge: rawCfg.showSideBadge !== false,
      showSummaryFooter: rawCfg.showSummaryFooter !== false,
      autoCaptureTrades: rawCfg.autoCaptureTrades !== false,
      timeZoneMode: ['ny', 'local', 'utc'].includes(rawCfg.timeZoneMode) ? rawCfg.timeZoneMode : 'ny',
      timeFormat: rawCfg.timeFormat === '24h' ? '24h' : '12h',
      trades: trades.slice(0, 250)
    };
  }

  const DEFAULT_PERP_FIRMS = [
    {
      id: "myfundedperpetuals",
      name: "My Funded Perpetuals",
      url: "https://myfundedperpetuals.com/trade/",
      matchPatterns: ["myfundedperpetuals.com"],
      enabled: true,
      isBuiltin: true,
      enableTimeframeFavorites: false,
      accountTier: "Evaluation / Funded",
      topBarMode: "auto",
      customTopBarOffsetPx: 0,
      barMarginBottom: 8,
      headerHeightPx: 48,
      rememberOrderAmount: true,
      restoreSelectedAccount: false,
      managePositionsPanel: true,
      defaultLeverage: "5x",
      notes: "Top-bar anchored below primary navbar and above ticker row"
    },
    {
      id: "vestmarkets",
      name: "Vest Markets",
      url: "https://next.vestmarkets.com/trade",
      matchPatterns: ["next.vestmarkets.com", "vestmarkets.com"],
      enabled: true,
      isBuiltin: true,
      enableTimeframeFavorites: true,
      accountTier: "Live DEX",
      topBarMode: "auto",
      customTopBarOffsetPx: 0,
      barMarginBottom: 8,
      headerHeightPx: 48,
      rememberOrderAmount: true,
      restoreSelectedAccount: false,
      managePositionsPanel: true,
      defaultLeverage: "10x",
      notes: "Arbitrum perpetual DEX on Vest"
    },
    {
      id: "kalshipro",
      name: "Kalshi Pro",
      url: "https://pro.kalshi.com",
      matchPatterns: ["pro.kalshi.com", "kalshi.com"],
      enabled: true,
      isBuiltin: true,
      enableTimeframeFavorites: false,
      accountTier: "Perpetuals",
      topBarMode: "auto",
      customTopBarOffsetPx: 0,
      barMarginBottom: 8,
      headerHeightPx: 48,
      rememberOrderAmount: true,
      restoreSelectedAccount: false,
      managePositionsPanel: true,
      defaultLeverage: "24x",
      notes: "Kalshi Pro prediction markets & perpetuals terminal"
    }
  ];

  function normalizePerpFirmsConfig(rawList) {
    const list = Array.isArray(rawList) ? rawList : [];
    const result = [];
    const seenIds = new Set();
    const existingById = new Map();
    for (const item of list) {
      if (item && item.id) {
        existingById.set(item.id, item);
      }
    }

    for (const def of DEFAULT_PERP_FIRMS) {
      const existing = existingById.get(def.id) || {};
      result.push({
        id: def.id,
        name: String(existing.name || def.name).trim(),
        url: String(existing.url || def.url).trim(),
        matchPatterns: Array.isArray(existing.matchPatterns) && existing.matchPatterns.length > 0 ? existing.matchPatterns.slice() : def.matchPatterns.slice(),
        enabled: existing.enabled !== false,
        isBuiltin: true,
        enableTimeframeFavorites: typeof existing.enableTimeframeFavorites === 'boolean'
          ? existing.enableTimeframeFavorites
          : (typeof def.enableTimeframeFavorites === 'boolean' ? def.enableTimeframeFavorites : true),
        accountTier: String(existing.accountTier || def.accountTier || ''),
        topBarMode: existing.topBarMode === 'custom' ? 'custom' : 'auto',
        customTopBarOffsetPx: Number.isFinite(existing.customTopBarOffsetPx) ? Math.max(0, Math.min(300, existing.customTopBarOffsetPx)) : def.customTopBarOffsetPx,
        barMarginBottom: Number.isFinite(existing.barMarginBottom) ? Math.max(0, Math.min(100, existing.barMarginBottom)) : def.barMarginBottom,
        headerHeightPx: Number.isFinite(existing.headerHeightPx) ? Math.max(0, Math.min(200, existing.headerHeightPx)) : def.headerHeightPx,
        rememberOrderAmount: existing.rememberOrderAmount !== false,
        restoreSelectedAccount: typeof existing.restoreSelectedAccount === 'boolean' ? existing.restoreSelectedAccount : Boolean(def.restoreSelectedAccount),
        managePositionsPanel: existing.managePositionsPanel !== false,
        defaultLeverage: String(existing.defaultLeverage || def.defaultLeverage || '10x'),
        notes: String(existing.notes || def.notes || '')
      });
      seenIds.add(def.id);
    }

    for (const item of list) {
      if (!item || !item.id || seenIds.has(item.id) || item.id === 'vestexchange' || item.id === 'vest_exchange') continue;
      const cleanUrl = String(item.url || '').trim();
      let matchPatterns = Array.isArray(item.matchPatterns) ? item.matchPatterns.slice() : [];
      if (matchPatterns.length === 0 && cleanUrl) {
        const domain = cleanUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
        if (domain) matchPatterns = [domain];
      }
      result.push({
        id: String(item.id).trim(),
        name: String(item.name || 'Custom Perp Firm').trim(),
        url: cleanUrl,
        matchPatterns,
        enabled: item.enabled !== false,
        isBuiltin: false,
        enableTimeframeFavorites: typeof item.enableTimeframeFavorites === 'boolean' ? item.enableTimeframeFavorites : true,
        accountTier: String(item.accountTier || 'Perp Account'),
        topBarMode: item.topBarMode === 'custom' ? 'custom' : 'auto',
        customTopBarOffsetPx: Number.isFinite(item.customTopBarOffsetPx) ? Math.max(0, Math.min(300, item.customTopBarOffsetPx)) : 0,
        barMarginBottom: Number.isFinite(item.barMarginBottom) ? Math.max(0, Math.min(100, item.barMarginBottom)) : 8,
        headerHeightPx: Number.isFinite(item.headerHeightPx) ? Math.max(0, Math.min(200, item.headerHeightPx)) : 48,
        rememberOrderAmount: item.rememberOrderAmount !== false,
        restoreSelectedAccount: typeof item.restoreSelectedAccount === 'boolean' ? item.restoreSelectedAccount : false,
        managePositionsPanel: item.managePositionsPanel !== false,
        defaultLeverage: String(item.defaultLeverage || '10x'),
        notes: String(item.notes || '')
      });
      seenIds.add(item.id);
    }
    return result;
  }

  function getActivePerpFirm() {
    const list = normalizePerpFirmsConfig(settings.perpFirms);
    const host = window.location.hostname.toLowerCase();
    for (const firm of list) {
      if (Array.isArray(firm.matchPatterns)) {
        for (const pattern of firm.matchPatterns) {
          const cleanPattern = String(pattern || '').toLowerCase().trim();
          if (cleanPattern && (host === cleanPattern || host.endsWith('.' + cleanPattern))) {
            return firm;
          }
        }
      }
      if (firm.url) {
        try {
          const parsed = new URL(firm.url);
          if (host === parsed.hostname.toLowerCase() || host.endsWith('.' + parsed.hostname.toLowerCase())) {
            return firm;
          }
        } catch (e) {}
      }
    }
    return list.find(f => f.enabled) || list[0] || null;
  }

  function getPropFirmLogoSvg(firmId, size = 22) {
    const id = String(firmId || '').toLowerCase();
    if (id.includes('myfundedperpetuals') || id.includes('myfundedperps') || id.includes('mfp')) {
      return `
        <svg width="${size}" height="${size}" viewBox="30 44 88 108" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; flex-shrink:0;">
          <defs>
            <linearGradient id="mfp_g_${size}" x1="117.5" y1="61.5" x2="30.5" y2="148" gradientUnits="userSpaceOnUse">
              <stop stop-color="#EAB308"/>
              <stop offset="1" stop-color="#FDE047"/>
            </linearGradient>
            <radialGradient id="mfp_r_${size}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(82.5 94.3) rotate(112) scale(46.8 18.8)">
              <stop stop-color="#D97706"/>
              <stop offset="1" stop-color="#FCD34D"/>
            </radialGradient>
          </defs>
          <path d="M51.2 56.3476V44H58.7276V49.199H70.0189V44H77.5465V49.199H88.8378V44H96.3653V56.3476H51.2Z" fill="#3B82F6"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M30.099 63.2073C30.099 63.2073 29.8762 74.045 30.099 88.1987C30.1186 89.4424 30.1337 90.7064 30.149 91.9864C30.4666 118.543 30.8658 151.927 72.8883 151.927C116.936 151.927 117.565 128.81 117.565 85.0748L117.565 63.2073H30.099ZM110.265 70.5244H37.3154C37.2883 74.9567 37.289 81.1158 37.3987 88.0833C37.4176 89.2874 37.4334 90.4915 37.4492 91.6937C37.6193 104.663 37.7864 117.406 41.8895 127.429C44.0082 132.604 47.0759 136.71 51.6043 139.603C56.1834 142.529 62.8753 144.61 72.8883 144.61C83.3627 144.61 90.497 143.219 95.4292 140.971C100.13 138.828 103.125 135.779 105.227 131.605C107.451 127.19 108.793 121.268 109.508 113.315C110.22 105.384 110.265 96.0779 110.265 85.0748L110.265 70.5244Z" fill="url(#mfp_g_${size})"/>
          <path d="M58.1131 106.652H44.287C44.287 106.652 44.3734 115.772 47.0522 122.659C49.731 129.545 58.1131 135.921 58.1131 135.921V106.652Z" fill="#FDE047"/>
          <path d="M82.5392 94.3049H65.0262V137.75H82.5392V94.3049Z" fill="url(#mfp_r_${size})"/>
          <path d="M103.739 82.4146H89.4523V135.921C89.4523 135.921 103.739 132.469 103.739 114.346V82.4146Z" fill="#D97706"/>
        </svg>
      `;
    }
    if (id.includes('vestmarkets') || id.includes('vest_markets')) {
      return `
        <svg width="${size}" height="${Math.round(size * 0.72)}" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; flex-shrink:0;">
          <defs>
            <linearGradient id="vest_g_${size}" x1="0" y1="0" x2="32" y2="20" gradientUnits="userSpaceOnUse">
              <stop stop-color="#34D399"/>
              <stop offset="1" stop-color="#06B6D4"/>
            </linearGradient>
          </defs>
          <path d="M7.58838 0.0535078L0.0805368 6.06693C-0.0268456 6.15643 -0.0268456 6.31749 0.0805368 6.40697L15.8658 19.0513C15.9463 19.1139 16.0537 19.1139 16.1342 19.0513L31.9196 6.40697C32.0268 6.31749 32.0268 6.15643 31.9196 6.06693L24.4206 0.0535078C24.2774 -0.0628224 24.0717 0.0445599 24.0717 0.223532V19.5793C24.0717 19.6956 23.9732 19.794 23.8568 19.794H8.23267C8.11633 19.794 8.0179 19.6956 8.0179 19.5793L7.93737 0.214582C7.93737 0.035612 7.73154 -0.0628224 7.58838 0.0445599V0.0535078Z" fill="url(#vest_g_${size})"/>
        </svg>
      `;
    }
    if (id.includes('kalshi')) {
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; flex-shrink:0;">
          <defs>
            <linearGradient id="kalshi_g_${size}" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#00D26A"/>
              <stop offset="1" stop-color="#05F27C"/>
            </linearGradient>
            <linearGradient id="kalshi_bg_${size}" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#042618"/>
              <stop offset="1" stop-color="#02140D"/>
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="url(#kalshi_bg_${size})" stroke="#00D26A" stroke-width="1.2" stroke-opacity="0.5"/>
          <path d="M10 7.5V24.5M10 16L19 7.5M21 24.5L13.5 17.5" stroke="url(#kalshi_g_${size})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
    // Generic custom prop firm fallback icon: Candlestick chart terminal mark
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#38bdf8; display:block; flex-shrink:0;">
        <line x1="9" y1="2" x2="9" y2="22"></line>
        <line x1="17" y1="4" x2="17" y2="18"></line>
        <rect x="7" y="6" width="4" height="9" rx="1" fill="rgba(56,189,248,0.35)"></rect>
        <rect x="15" y="8" width="4" height="6" rx="1" fill="rgba(56,189,248,0.35)"></rect>
      </svg>
    `;
  }

  let settings = {
    activeTemplateId: null,
    defaultTemplateId: null,
    perpFirms: JSON.parse(JSON.stringify(DEFAULT_PERP_FIRMS)),
    deletedFirmIds: [],
    vestLastActiveAccount: null,
    showFloatingBar: false,
    floatingBarPosition: { top: 80, left: 16 },
    autoApplyToNew: false,
    hotkeysEnabled: true,
    rememberSidebarTools: true,
    rememberLastChartSettings: true,
    lastChartSettings: {},
    favoriteTimeframes: [],
    sessionIndicators: JSON.parse(JSON.stringify(DEFAULT_SESSION_INDICATORS)),
    autoFvg: JSON.parse(JSON.stringify(DEFAULT_AUTO_FVG)),
    newsBox: JSON.parse(JSON.stringify(DEFAULT_NEWS_BOX)),
    tradesBox: JSON.parse(JSON.stringify(DEFAULT_TRADES_BOX)),
    candleOhlc: JSON.parse(JSON.stringify(DEFAULT_CANDLE_OHLC)),
    positionHud: JSON.parse(JSON.stringify(DEFAULT_POSITION_HUD)),
    failLines: JSON.parse(JSON.stringify(DEFAULT_FAIL_LINES)),
    cortexIndicator: JSON.parse(JSON.stringify(DEFAULT_CORTEX_INDICATOR)),
    orderBlocks: JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS)),
    marketStructure: JSON.parse(JSON.stringify(DEFAULT_MARKET_STRUCTURE)),
    rangeDetector: JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR)),
    debugMode: false,
    dialogGlassEffect: false,
    dialogGlassOpacity: 78,
    minimizedWindowOrder: [],
    diagnosticsBox: JSON.parse(JSON.stringify(DEFAULT_DIAGNOSTICS_BOX)),
    accountsRiskBox: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS_RISK_BOX)),
    bottomPanelStates: {},
    bottomPanelState: {
      isMinimized: false,
      isDetached: false,
      pos: null
    },
    enablePanelManagement: true,
    panelLayout: {},
    sidebarState: {
      magnet: false,
      magnetMode: "weak",
      stayInDrawingMode: false,
      lockDrawings: false,
      hideDrawings: false,
      activeTool: null,
      groupTools: {}
    }
  };

  let barRoot = null;
  let editorModalEl = null;
  let currentEditingTemplateId = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let isCollapsed = false;
  let latestDrawingToolbarVisible = true;

  function applyDialogGlassEffect(enabled, opacity) {
    try {
      if (typeof document === 'undefined' || !document.body) return;
      document.body.classList.toggle('vest-dialog-glass-mode', Boolean(enabled));
      const op = typeof opacity === 'number'
        ? Math.max(15, Math.min(95, Math.round(opacity)))
        : (typeof settings.dialogGlassOpacity === 'number' ? settings.dialogGlassOpacity : 78);
      document.documentElement.style.setProperty('--vest-dialog-glass-op', (op / 100).toFixed(2));
      document.documentElement.style.setProperty('--vest-dialog-glass-op-pct', `${op}%`);
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Safe Chrome Extension Context & Storage Helper
  // -------------------------------------------------------------
  function isExtensionValid() {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        return false;
      }
      const url = chrome.runtime.getURL('');
      return Boolean(url && chrome.storage && chrome.storage.local);
    } catch (e) {
      return false;
    }
  }

  let installedVersionOverride = null;

  function getSafeExtVersion() {
    let manifestVer = '1.1.0';
    try {
      if (isExtensionValid() && chrome.runtime.getManifest) {
        const m = chrome.runtime.getManifest();
        manifestVer = m.version || m.version_name || '1.1.0';
      }
    } catch (e) {}
    if (installedVersionOverride && compareSemver(installedVersionOverride, manifestVer) > 0) {
      return installedVersionOverride;
    }
    return manifestVer;
  }

  function getUpcomingDevVersion(baseVer) {
    const raw = String(baseVer || '1.1.44').trim();
    if (/alpha/i.test(raw)) {
      return raw.startsWith('v') ? raw : `v${raw}`;
    }
    const clean = raw.replace(/^v/i, '');
    const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
    const major = parts[0] || 1;
    const minor = parts[1] || 1;
    const patch = (parts[2] || 0) + 1;
    return `v${major}.${minor}.${patch} Alpha`;
  }

  const DOMAIN_VAULT_KEY = '__trading_cortex_vault_db_v1__';
  const CURRENT_DB_SCHEMA_VERSION = 2;

  function readDomainVault() {
    try {
      const raw = window.localStorage.getItem(DOMAIN_VAULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.settings && typeof parsed.settings === 'object') {
            if (parsed.settings.sidebarState && parsed.settings.sidebarState.toolbarStorage) {
              parsed.settings.sidebarState.toolbarStorage = sanitizeSidebarToolbarStorage(parsed.settings.sidebarState.toolbarStorage);
            }
            if (parsed.settings.lastChartSettings && parsed.settings.lastChartSettings.localStorageEntries) {
              parsed.settings.lastChartSettings.localStorageEntries = sanitizeSidebarToolbarStorage(parsed.settings.lastChartSettings.localStorageEntries);
            }
          }
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  function writeDomainVault(nextTemplates, nextSettings) {
    try {
      const prev = readDomainVault() || {};
      let cleanSettings = nextSettings ? { ...(prev.settings || {}), ...nextSettings } : (prev.settings || settings);
      if (cleanSettings && typeof cleanSettings === 'object') {
        if (cleanSettings.sidebarState && cleanSettings.sidebarState.toolbarStorage) {
          cleanSettings.sidebarState.toolbarStorage = sanitizeSidebarToolbarStorage(cleanSettings.sidebarState.toolbarStorage);
        }
        if (cleanSettings.lastChartSettings && cleanSettings.lastChartSettings.localStorageEntries) {
          cleanSettings.lastChartSettings.localStorageEntries = sanitizeSidebarToolbarStorage(cleanSettings.lastChartSettings.localStorageEntries);
        }
      }
      const payload = {
        schemaVersion: CURRENT_DB_SCHEMA_VERSION,
        updatedAt: Date.now(),
        templates: Array.isArray(nextTemplates) ? sanitizeUserTemplates(nextTemplates) : sanitizeUserTemplates(prev.templates || templates),
        settings: cleanSettings
      };
      window.localStorage.setItem(DOMAIN_VAULT_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  async function safeStorageGet(keys) {
    let result = {};
    if (isExtensionValid()) {
      try {
        const localData = await chrome.storage.local.get(keys).catch(() => ({}));
        if (localData && (localData.templates !== undefined || localData.settings !== undefined)) {
          result = localData;
        } else if (chrome.storage.sync) {
          const syncData = await chrome.storage.sync.get(keys).catch(() => ({}));
          if (syncData && (syncData.templates !== undefined || syncData.settings !== undefined)) {
            await chrome.storage.local.set(syncData).catch(() => {});
            result = syncData;
          }
        }
      } catch (e) {}
    }

    // Check Domain Vault (__trading_cortex_vault_db_v1__) so custom templates and settings survive even if the extension was unloaded/removed and reloaded!
    const vault = readDomainVault();
    if (vault) {
      const vaultTemplates = sanitizeUserTemplates(vault.templates);
      const storageTemplates = sanitizeUserTemplates(result.templates);

      if (
        vaultTemplates.length > 0 &&
        (storageTemplates.length === 0 || (vault.updatedAt && (!result.settings?._savedAt || vault.updatedAt >= result.settings._savedAt)))
      ) {
        result.templates = vaultTemplates;
        if (isExtensionValid()) {
          chrome.storage.local.set({ templates: vaultTemplates }).catch(() => {});
        }
      } else if (result.templates !== undefined) {
        result.templates = storageTemplates;
      }

      if (vault.settings && typeof vault.settings === 'object') {
        if (!result.settings || (vault.updatedAt && (!result.settings._savedAt || vault.updatedAt >= result.settings._savedAt))) {
          result.settings = { ...(result.settings || {}), ...vault.settings };
          if (isExtensionValid()) {
            chrome.storage.local.set({ settings: result.settings }).catch(() => {});
          }
        }
      }
    } else if (result.templates !== undefined) {
      result.templates = sanitizeUserTemplates(result.templates);
    }

    // Also merge/fallback with __trading_cortex_isolated_settings__ mirror
    try {
      const rawLocalSettings = window.localStorage.getItem('__trading_cortex_isolated_settings__');
      if (rawLocalSettings) {
        const parsedLocalSettings = JSON.parse(rawLocalSettings);
        if (parsedLocalSettings && typeof parsedLocalSettings === 'object') {
          if (!result.settings || (parsedLocalSettings._savedAt && (!result.settings._savedAt || parsedLocalSettings._savedAt >= result.settings._savedAt))) {
            result.settings = { ...(result.settings || {}), ...parsedLocalSettings };
          }
        }
      }
    } catch (e) {}

    if (result.settings && typeof result.settings === 'object') {
      if (result.settings.sidebarState && result.settings.sidebarState.toolbarStorage) {
        result.settings.sidebarState.toolbarStorage = sanitizeSidebarToolbarStorage(result.settings.sidebarState.toolbarStorage);
      }
      if (result.settings.lastChartSettings && result.settings.lastChartSettings.localStorageEntries) {
        result.settings.lastChartSettings.localStorageEntries = sanitizeSidebarToolbarStorage(result.settings.lastChartSettings.localStorageEntries);
      }
    }

    return result;
  }

  let saveSettingsTimeout = null;
  let pendingSettingsUpdate = null;
  let syncMirrorTimeout = null;
  let pendingSyncData = {};

  function mergeChartViewportMap(previous, incoming) {
    const merged = { ...(previous || {}) };
    Object.entries(incoming || {}).forEach(([key, state]) => {
      const existing = merged[key];
      if (!existing || (Number(state && state.updatedAt) || 0) >= (Number(existing.updatedAt) || 0)) {
        merged[key] = state;
      }
    });
    return merged;
  }

  function mergeLastChartSettings(previous, incoming) {
    const prev = previous && typeof previous === 'object' ? previous : {};
    const next = incoming && typeof incoming === 'object' ? incoming : {};
    return {
      ...prev,
      ...next,
      localStorageEntries: {
        ...sanitizeSidebarToolbarStorage(prev.localStorageEntries),
        ...sanitizeSidebarToolbarStorage(next.localStorageEntries)
      },
      viewportsBySymbol: { ...(prev.viewportsBySymbol || {}), ...(next.viewportsBySymbol || {}) },
      viewportsByChart: mergeChartViewportMap(prev.viewportsByChart, next.viewportsByChart)
    };
  }

  function safeStorageSet(data) {
    // Always mirror both templates and settings synchronously to the Domain Vault and window.localStorage
    // so they are never lost even if the extension is unloaded/removed and re-loaded
    try {
      if (data && data.templates) {
        data.templates = sanitizeUserTemplates(data.templates);
      }
      if (data && data.settings) {
        if (data.settings.sidebarState && data.settings.sidebarState.toolbarStorage) {
          data.settings.sidebarState.toolbarStorage = sanitizeSidebarToolbarStorage(data.settings.sidebarState.toolbarStorage);
        }
        if (data.settings.lastChartSettings && data.settings.lastChartSettings.localStorageEntries) {
          data.settings.lastChartSettings.localStorageEntries = sanitizeSidebarToolbarStorage(data.settings.lastChartSettings.localStorageEntries);
        }
        data.settings._savedAt = Date.now();
        window.localStorage.setItem('__trading_cortex_isolated_settings__', JSON.stringify(data.settings));
      }
      writeDomainVault(
        data && data.templates !== undefined ? data.templates : templates,
        data && data.settings ? data.settings : settings
      );
    } catch (e) {}

    // Broadcast live across open tabs/windows immediately
    if (typeof broadcastLiveSettingsCrossTab === 'function' && data && (data.settings || data.templates)) {
      broadcastLiveSettingsCrossTab(data.settings || settings, data.templates || templates);
    }

    if (!isExtensionValid()) return Promise.resolve();
    try {
      // Write immediately to chrome.storage.local (which also triggers service-worker to write user-data/cortex-db.json on disk)
      const p = chrome.storage.local.set(data).catch(() => {});

      // Debounce mirroring to chrome.storage.sync (4s) to never exceed MAX_WRITE_OPERATIONS_PER_MINUTE
      pendingSyncData = { ...pendingSyncData, ...data };
      if (syncMirrorTimeout) clearTimeout(syncMirrorTimeout);
      syncMirrorTimeout = setTimeout(() => {
        if (isExtensionValid() && chrome.storage.sync) {
          const toSync = pendingSyncData;
          pendingSyncData = {};
          chrome.storage.sync.set(toSync).catch(() => {});
        }
      }, 4000);

      return p;
    } catch (e) {
      return Promise.resolve();
    }
  }

  // Debounced settings sync to prevent storage hammering and context crashes
  function queueSettingsSave(newSettings) {
    pendingSettingsUpdate = { ...(pendingSettingsUpdate || {}), ...newSettings };
    if (dataSettingsMirrorAvailable()) {
      try {
        const merged = { ...settings, ...pendingSettingsUpdate, _savedAt: Date.now() };
        if (merged.sidebarState && merged.sidebarState.toolbarStorage) {
          merged.sidebarState.toolbarStorage = sanitizeSidebarToolbarStorage(merged.sidebarState.toolbarStorage);
        }
        if (merged.lastChartSettings && merged.lastChartSettings.localStorageEntries) {
          merged.lastChartSettings.localStorageEntries = sanitizeSidebarToolbarStorage(merged.lastChartSettings.localStorageEntries);
        }
        window.localStorage.setItem('__trading_cortex_isolated_settings__', JSON.stringify(merged));
        writeDomainVault(templates, merged);
      } catch (e) {}
    }

    // Broadcast live across all open tabs/windows immediately without waiting for debounce
    if (typeof broadcastLiveSettingsCrossTab === 'function') {
      broadcastLiveSettingsCrossTab({ ...settings, ...pendingSettingsUpdate }, templates);
    }

    if (saveSettingsTimeout) clearTimeout(saveSettingsTimeout);
    saveSettingsTimeout = setTimeout(() => {
      if (pendingSettingsUpdate) {
        safeStorageSet({ settings: { ...settings, ...pendingSettingsUpdate } });
        pendingSettingsUpdate = null;
      }
    }, 350);
  }

  function dataSettingsMirrorAvailable() {
    try {
      return Boolean(window.localStorage);
    } catch (e) {
      return false;
    }
  }

  function postToMainWorlds(msg) {
    try {
      window.postMessage(msg, '*');
    } catch (e) {}
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(msg, '*');
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  function syncChartMemoryFocusState() {
    let focused = false;
    try {
      focused = document.visibilityState === 'visible' && document.hasFocus();
    } catch (e) {}
    postToMainWorlds({
      type: 'VEST_TV_CHART_MEMORY_FOCUS',
      payload: { focused }
    });
  }

  window.addEventListener('focus', syncChartMemoryFocusState, true);
  window.addEventListener('blur', syncChartMemoryFocusState, true);
  document.addEventListener('visibilitychange', syncChartMemoryFocusState, true);
  window.addEventListener('pageshow', syncChartMemoryFocusState, true);
  setTimeout(syncChartMemoryFocusState, 0);

  let settingsLoaded = false;
  let lastChartSettingsMeta = null;

  function notifyMainWorldConfig() {
    if (!settingsLoaded) return;
    postToMainWorlds({
      type: 'VEST_TV_CONFIG_UPDATE',
      payload: {
        templates,
        settings,
        globalDrawings,
        settingsMeta: lastChartSettingsMeta
      }
    });
    refreshCortexPaperStatsOnChart();
  }

  function normalizeFavoriteTimeframes(raw) {
    const supported = new Set(['1', '3', '5', '15', '30', '60', '120', '240', '360', '480', '720', '1D', '3D', '1W', '1M']);
    const seen = new Set();
    return (Array.isArray(raw) ? raw : []).reduce((out, item) => {
      const resolution = String(item && typeof item === 'object' ? item.resolution : item || '').trim();
      if (!supported.has(resolution) || seen.has(resolution)) return out;
      seen.add(resolution);
      out.push({ resolution, label: String(item && item.label || '').trim() });
      return out;
    }, []);
  }

  function normalizeGlobalDrawings(raw) {
    if (!Array.isArray(raw)) return [];
    const normalized = [];
    raw.slice(-1000).forEach(item => {
      if (!item || typeof item !== 'object') return;
      const id = String(item.id || '').slice(0, 120);
      const symbol = String(item.symbol || '').slice(0, 200);
      const shape = String(item.shape || '').slice(0, 80);
      const points = Array.isArray(item.points) ? item.points.slice(0, 12).map(point => ({
        time: Number(point && point.time),
        price: Number(point && point.price)
      })).filter(point => Number.isFinite(point.time) && Number.isFinite(point.price)) : [];
      if (!id || !symbol || !shape || !points.length) return;
      let properties = {};
      try {
        const serialized = JSON.stringify(item.properties || {});
        if (serialized.length <= 100000) properties = JSON.parse(serialized);
      } catch (e) {}
      normalized.push({
        ...item,
        id,
        symbol,
        shape,
        rawShapeName: String(item.rawShapeName || shape).slice(0, 80),
        timeframe: String(item.timeframe || '').slice(0, 40),
        points,
        properties
      });
    });
    return normalized;
  }

  function saveGlobalDrawings(next) {
    globalDrawings = normalizeGlobalDrawings(next);
    if (!isTopWindow || !isExtensionValid()) return;
    chrome.storage.local.set({ globalDrawings }).catch(() => {});
    postToMainWorlds({ type: 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', payload: { drawings: globalDrawings } });
  }

  const CORTEX_CROSS_TAB_CHANNEL_NAME = '__trading_cortex_cross_tab_sync__';
  let cortexCrossTabChannel = null;
  const tabInstanceId = `cortex_tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  function initCrossTabSyncChannel() {
    if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') return;
    try {
      if (!cortexCrossTabChannel) {
        cortexCrossTabChannel = new BroadcastChannel(CORTEX_CROSS_TAB_CHANNEL_NAME);
        cortexCrossTabChannel.onmessage = (event) => {
          if (!event || !event.data || typeof event.data !== 'object') return;
          const { type, senderId, payload } = event.data;
          if (senderId === tabInstanceId) return; // Do not process self broadcast
          if (type === 'CORTEX_LIVE_SETTINGS_BROADCAST' && payload) {
            handleIncomingLiveSettings(payload.settings, payload.templates);
          } else if (type === 'CORTEX_ACCOUNT_SNAPSHOT_UPDATE' && payload && typeof handleIncomingAccountSnapshots === 'function') {
            handleIncomingAccountSnapshots(payload.snapshots);
          }
        };
      }
    } catch (e) {}
  }

  function broadcastLiveSettingsCrossTab(targetSettings, targetTemplates = null) {
    if (!cortexCrossTabChannel) {
      initCrossTabSyncChannel();
    }
    if (cortexCrossTabChannel) {
      try {
        cortexCrossTabChannel.postMessage({
          type: 'CORTEX_LIVE_SETTINGS_BROADCAST',
          senderId: tabInstanceId,
          payload: {
            settings: targetSettings || settings,
            templates: targetTemplates || templates,
            timestamp: Date.now()
          }
        });
      } catch (e) {}
    }
  }

  function handleIncomingLiveSettings(incomingSettings, incomingTemplates) {
    if (!isExtensionValid()) return;
    let hasChanged = false;

    if (incomingTemplates && Array.isArray(incomingTemplates)) {
      templates = sanitizeUserTemplates(incomingTemplates);
      hasChanged = true;
    }

    if (incomingSettings && typeof incomingSettings === 'object') {
      settings = {
        ...settings,
        ...incomingSettings,
        lastChartSettings: mergeLastChartSettings(settings.lastChartSettings, incomingSettings.lastChartSettings)
      };
      hasChanged = true;
    }

    if (hasChanged) {
      applyLiveSettingsToAllComponents();
    }
  }

  function applyLiveSettingsToAllComponents() {
    // 1. Notify Main World (canvas indicators: OB, FVG, MS, Sessions, VWAP, Candle OHLC, Fail lines)
    notifyMainWorldConfig();

    if (!isTopWindow) return;

    // 2. Re-render / hide / show on-chart widgets in real-time
    try {
      if (typeof renderChartRangeBox === 'function') {
        renderChartRangeBox();
      }
      if (typeof renderChartOrderBlockStatsBox === 'function') {
        renderChartOrderBlockStatsBox();
      }
      if (typeof renderChartTradesBox === 'function') {
        renderChartTradesBox();
      }
      if (typeof renderChartNewsBox === 'function') {
        renderChartNewsBox();
      }
      if (typeof renderChartDiagnosticsBox === 'function') {
        renderChartDiagnosticsBox();
      }
      if (typeof renderChartAccountsRiskBox === 'function') {
        renderChartAccountsRiskBox();
      }
      if (typeof renderFloatingBar === 'function') {
        renderFloatingBar();
      }
      if (typeof ensureCortexTopBar === 'function') {
        ensureCortexTopBar();
      }
      if (typeof renderStudioHeaderPill === 'function') {
        renderStudioHeaderPill();
      }
      if (typeof repositionAllMinimizedBoxes === 'function') {
        repositionAllMinimizedBoxes();
      }
      if (typeof applyDialogGlassEffect === 'function') {
        applyDialogGlassEffect(settings.dialogGlassEffect, settings.dialogGlassOpacity);
      }
      if (typeof syncActiveDrawingBarVisibility === 'function') {
        syncActiveDrawingBarVisibility();
      }
    } catch (e) {}

    // 3. Dispatch live event so any currently open Settings modal in this window reflects updated toggles in real time
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('cortex-live-settings-updated', {
          detail: { settings, templates }
        }));
      } catch (e) {}
    }
  }

  // Hook up window storage event for instant multi-window local storage sync
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (!e || !e.key) return;
      if (e.key === '__trading_cortex_isolated_settings__' && e.newValue) {
        try {
          const incoming = JSON.parse(e.newValue);
          if (incoming && typeof incoming === 'object') {
            handleIncomingLiveSettings(incoming, null);
          }
        } catch (err) {}
      } else if (e.key === '__trading_cortex_vault_db_v1__' && e.newValue) {
        try {
          const vault = JSON.parse(e.newValue);
          if (vault && vault.settings) {
            handleIncomingLiveSettings(vault.settings, Array.isArray(vault.templates) ? vault.templates : null);
          }
        } catch (err) {}
      } else if (e.key === '__trading_cortex_account_snapshots__' && e.newValue) {
        try {
          const snaps = JSON.parse(e.newValue);
          if (snaps && typeof snaps === 'object' && typeof handleIncomingAccountSnapshots === 'function') {
            handleIncomingAccountSnapshots(snaps);
          }
        } catch (err) {}
      }
    }, { passive: true });
  }

  initCrossTabSyncChannel();

  // Listen for storage changes from popup & other browser windows
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!isExtensionValid()) return;
        if (area !== 'local' && area !== 'sync') return;

        let settingsChanged = false;
        let templatesChanged = false;

        if (changes.templates && Array.isArray(changes.templates.newValue)) {
          templates = sanitizeUserTemplates(changes.templates.newValue);
          templatesChanged = true;
        }
        if (changes.settings && changes.settings.newValue) {
          const incomingSettings = changes.settings.newValue;
          settings = {
            ...settings,
            ...incomingSettings,
            lastChartSettings: mergeLastChartSettings(settings.lastChartSettings, incomingSettings.lastChartSettings)
          };
          settingsChanged = true;
        }
        if (changes.lastChartSettingsMeta && changes.lastChartSettingsMeta.newValue) {
          lastChartSettingsMeta = changes.lastChartSettingsMeta.newValue;
        }
        if (changes.globalDrawings && Array.isArray(changes.globalDrawings.newValue)) {
          globalDrawings = normalizeGlobalDrawings(changes.globalDrawings.newValue);
          postToMainWorlds({ type: 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', payload: { drawings: globalDrawings } });
        }
        if (changes.cortexAccountSnapshots && changes.cortexAccountSnapshots.newValue && typeof handleIncomingAccountSnapshots === 'function') {
          handleIncomingAccountSnapshots(changes.cortexAccountSnapshots.newValue);
        }
        if (changes.installedVersionOverride && changes.installedVersionOverride.newValue) {
          installedVersionOverride = changes.installedVersionOverride.newValue;
          if (isTopWindow) {
            ensureCortexTopBar();
            renderStudioHeaderPill();
          }
        }
        if (changes.updateChannel && isTopWindow) {
          latestUpdateChannel = changes.updateChannel.newValue || 'stable';
          triggerQuickUpdateCheck();
        }
        if (changes.updaterState && changes.updaterState.newValue && isTopWindow) {
          const newState = changes.updaterState.newValue;
          const wasAvailable = isUpdateAvailable;
          const currentVer = getSafeExtVersion();
          const isDev = newState.channel === 'dev';
          latestUpdateChannel = newState.channel || 'stable';
          isUpdateAvailable = Boolean(
            newState.updateAvailable &&
            (isDev || !newState.latestVersion || compareSemver(newState.latestVersion, currentVer) > 0)
          );
          latestAvailableVersion = newState.latestVersion || null;
          if (wasAvailable !== isUpdateAvailable) {
            renderStudioHeaderPill();
          }
          if (isUpdateAvailable && !updateNotificationToastShown) {
            updateNotificationToastShown = true;
            const verLabel = isDev
              ? (latestAvailableVersion || 'New build')
              : `v${cleanSemver(latestAvailableVersion || 'latest')}`;
            showToast(
              `⚡ Trading Cortex ${isDev ? 'Dev build' : 'update'} ready (${verLabel})! Click CORTEX in top bar to deploy.`,
              4500,
              isDev
            );
          }
        }

        if (settingsChanged || templatesChanged) {
          applyLiveSettingsToAllComponents();
        } else {
          notifyMainWorldConfig();
        }
      });
    }
  } catch (e) {}

  let lastCreatedTemplateSig = '';
  let lastCreatedTemplateTime = 0;
  let liveExecutionGuardNoticeShown = false;
  let cortexPaperStatsOverlay = null;

  function getCortexExecutionStorageKey(symbol) {
    const clean = String(symbol || 'DEFAULT').toUpperCase().replace(/[^A-Z0-9._-]/g, '_').slice(0, 100);
    return `__trading_cortex_ci_execution__:${location.hostname}:${clean}`;
  }

  function readCortexExecutionState(symbol) {
    const key = getCortexExecutionStorageKey(symbol);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const state = JSON.parse(raw);
        if (window.TradingCortexExecution?.ensureStats) window.TradingCortexExecution.ensureStats(state);
        return { key, state };
      }
    } catch (e) {}
    return { key, state: window.TradingCortexExecution?.createState(key) || { key, lastSignalId: '', position: null, trades: [], status: 'waiting' } };
  }

  function renderCortexPaperStatsOnChart(symbol, stats) {
    if (!isTopWindow) return;
    const ci = normalizeCortexIndicatorConfig(settings.cortexIndicator);
    const shouldShow = ci.enabled && String(symbol || '').trim();
    if (!shouldShow) {
      if (cortexPaperStatsOverlay?.isConnected) cortexPaperStatsOverlay.remove();
      cortexPaperStatsOverlay = null;
      return true;
    }

    const docs = [document];
    document.querySelectorAll('iframe').forEach(frame => {
      try {
        if (frame.contentDocument && !docs.includes(frame.contentDocument)) docs.push(frame.contentDocument);
      } catch (e) {}
    });

    let chartCanvas = null;
    let largestArea = 0;
    for (const doc of docs) {
      try {
        doc.querySelectorAll('canvas:not(.vest-ict-sessions-canvas)').forEach(canvas => {
          const rect = canvas.getBoundingClientRect();
          const area = rect.width * rect.height;
          if (rect.width >= 240 && rect.height >= 140 && area > largestArea + 1000) {
            chartCanvas = canvas;
            largestArea = area;
          }
        });
      } catch (e) {}
    }
    const parent = chartCanvas?.parentElement;
    if (!parent) return false;

    const ownerDoc = chartCanvas.ownerDocument || document;
    if (!cortexPaperStatsOverlay || !cortexPaperStatsOverlay.isConnected || cortexPaperStatsOverlay.ownerDocument !== ownerDoc) {
      if (cortexPaperStatsOverlay?.isConnected) cortexPaperStatsOverlay.remove();
      cortexPaperStatsOverlay = ownerDoc.createElement('div');
      cortexPaperStatsOverlay.className = 'vest-ci-paper-stats-chart-overlay';
      cortexPaperStatsOverlay.setAttribute('role', 'status');
      cortexPaperStatsOverlay.setAttribute('aria-live', 'polite');
      cortexPaperStatsOverlay.style.cssText = 'position:absolute;top:10px;left:10px;z-index:12;pointer-events:none;box-sizing:border-box;width:min(480px,calc(100% - 20px));padding:8px 10px;border:1px solid #303744;border-radius:6px;background:rgba(11,14,20,.94);box-shadow:0 2px 8px rgba(0,0,0,.35);color:#34d399;font:12px -apple-system,BlinkMacSystemFont,"Trebuchet MS",Roboto,sans-serif;';
    }
    if (cortexPaperStatsOverlay.parentElement !== parent) {
      const parentView = ownerDoc.defaultView;
      if (parentView && parentView.getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      parent.appendChild(cortexPaperStatsOverlay);
    }

    const cleanSymbol = escapeHtml(String(symbol).trim());
    const values = ['tp1', 'tp2', 'tp3', 'entries', 'stopsBeforeProfit'].map(key => Math.max(0, Math.floor(Number(stats?.[key]) || 0)));
    const content = `<div style="font-weight:600;color:#e4e4e7;margin-bottom:6px;">Paper stats · ${cleanSymbol}</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;text-align:center;line-height:1.25;">${values.map((value, index) => `<div><b style="color:#34d399;">${value}</b><small style="display:block;color:#94a3b8;">${['TP1', 'TP2', 'TP3', 'Entries', 'Stop first'][index]}</small></div>`).join('')}</div><small style="display:block;margin-top:6px;color:#94a3b8;">Paper simulations only · saved per instrument</small>`;
    if (cortexPaperStatsOverlay.innerHTML !== content) cortexPaperStatsOverlay.innerHTML = content;
    return true;
  }

  function refreshCortexPaperStatsOnChart(symbol = currentInstrument, attempt = 0) {
    if (!isTopWindow || !symbol) return;
    const { state } = readCortexExecutionState(symbol);
    const stats = window.TradingCortexExecution?.ensureStats(state) || state.stats || {};
    const rendered = renderCortexPaperStatsOnChart(symbol, stats);
    if (!rendered && attempt < 6) {
      setTimeout(() => {
        if (currentInstrument === symbol) refreshCortexPaperStatsOnChart(symbol, attempt + 1);
      }, 350);
    }
  }

  function saveCortexExecutionState(key, state) {
    if (Array.isArray(state.trades) && state.trades.length > 500) state.trades = state.trades.slice(-500);
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
  }

  function acquireCortexExecutionLock(symbol, ttlMs = 1500) {
    const lockKey = `${getCortexExecutionStorageKey(symbol)}:lock`;
    const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
    try {
      const current = JSON.parse(localStorage.getItem(lockKey) || 'null');
      if (current && current.expiresAt > Date.now()) return null;
      localStorage.setItem(lockKey, JSON.stringify({ token, expiresAt: Date.now() + Math.max(1500, ttlMs) }));
      const verify = JSON.parse(localStorage.getItem(lockKey) || 'null');
      if (!verify || verify.token !== token) return null;
      return () => {
        try {
          const latest = JSON.parse(localStorage.getItem(lockKey) || 'null');
          if (latest && latest.token === token) localStorage.removeItem(lockKey);
        } catch (e) {}
      };
    } catch (e) { return null; }
  }

  function setVisibleInputValue(input, value) {
    if (!input) return false;
    const next = String(value);
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
    if (setter) setter.call(input, next);
    else input.value = next;
    dispatchOrderInputEvents(input);
    return String(input.value) === next;
  }

  function findLabeledOrderInput(panel, label, excluded = []) {
    const pattern = new RegExp(label, 'i');
    return Array.from(panel?.querySelectorAll('input') || []).find(input => {
      if (excluded.includes(input)) return false;
      const rect = input.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || ['checkbox', 'radio', 'range', 'hidden'].includes(input.type)) return false;
      let node = input.parentElement;
      for (let depth = 0; node && node !== panel && depth < 5; depth++, node = node.parentElement) {
        const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        if (pattern.test(text) && text.length < 130) return true;
      }
      return pattern.test(`${input.getAttribute('aria-label') || ''} ${input.placeholder || ''} ${input.name || ''}`);
    }) || null;
  }

  function findLimitPriceInput(panel, excluded = []) {
    return Array.from(panel?.querySelectorAll('input') || []).find(input => {
      if (excluded.includes(input)) return false;
      const rect = input.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || ['checkbox', 'radio', 'range', 'hidden'].includes(input.type)) return false;
      let node = input.parentElement;
      for (let depth = 0; node && node !== panel && depth < 5; depth++, node = node.parentElement) {
        const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^price(?:\s|$)/i.test(text) && text.length < 100 && !/take profit|stop loss/i.test(text)) return true;
      }
      return /^price$/i.test(`${input.getAttribute('aria-label') || ''} ${input.placeholder || ''} ${input.name || ''}`.trim());
    }) || null;
  }

  function findVisibleOrderButton(panel, pattern) {
    return Array.from(panel?.querySelectorAll('button, [role="button"]') || []).find(button => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && pattern.test((button.innerText || button.textContent || '').replace(/\s+/g, ' ').trim());
    }) || null;
  }

  function findTicketCheckbox(panel, id, labelText) {
    const byId = panel?.querySelector(`#${id}`);
    if (byId && byId.type === 'checkbox') return byId;
    const label = Array.from(panel?.querySelectorAll('label') || []).find(el => (el.innerText || el.textContent || '').toLowerCase().includes(labelText.toLowerCase()));
    return label?.querySelector('input[type="checkbox"]') || null;
  }

  function setTicketCheckbox(panel, id, labelText, checked) {
    const input = findTicketCheckbox(panel, id, labelText);
    if (!input) return false;
    if (Boolean(input.checked) !== checked) input.click();
    return Boolean(input.checked) === checked;
  }

  function getPositionRow(symbol) {
    const bottomInfo = typeof findBottomPositionsPanel === 'function' ? findBottomPositionsPanel() : null;
    const panel = bottomInfo?.panel || (typeof findPanelElement === 'function' && Array.isArray(PANEL_DEFINITIONS) ? findPanelElement(PANEL_DEFINITIONS.find(def => def && def.key === 'bottom_positions')) : null) || document.querySelector('[data-vest-bottom-panel="true"]');
    if (!panel) return null;
    const ticker = normalizeInstrumentKey(symbol);
    const candidates = Array.from(panel.querySelectorAll('tr, [role="row"]')).filter(row => {
      const text = (row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim();
      return text && normalizeInstrumentKey(text).includes(ticker) && /\b(long|short)\b/i.test(text) && !/\bmarket\b/i.test(text);
    });
    for (const row of candidates) {
      const text = (row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim();
      const table = row.closest('table');
      let headers = Array.from(table?.querySelectorAll('thead th, thead [role="columnheader"]') || []).map(cell => (cell.innerText || cell.textContent || '').trim().toLowerCase());
      if (!headers.length) headers = Array.from(table?.querySelectorAll('tr:first-child th, tr:first-child td, [role="row"]:first-child [role="columnheader"]') || []).map(cell => (cell.innerText || cell.textContent || '').trim().toLowerCase());
      const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
      const openPriceIndex = headers.findIndex(header => header.includes('open price'));
      const openPriceText = openPriceIndex >= 0 ? (cells[openPriceIndex]?.innerText || cells[openPriceIndex]?.textContent || '') : '';
      const openPrice = Number(String(openPriceText).replace(/[^\d.\-]/g, ''));
      const quantityMatch = text.match(new RegExp(`(?:^|\\s)([0-9]+(?:\\.[0-9]+)?)\\s+${ticker}(?:\\s|$)`, 'i'));
      const quantityText = quantityMatch?.[1] || '';
      const quantityDecimals = quantityText.includes('.') ? quantityText.split('.')[1].length : 0;
      return { row, text, side: /\blong\b/i.test(text) ? 'long' : 'short', entryPrice: Number.isFinite(openPrice) && openPrice > 0 ? openPrice : null, quantity: quantityMatch ? Number(quantityText) : null, quantityDecimals };
    }
    return null;
  }

  function isSelectedOrdersTab(tab) {
    return tab?.getAttribute('aria-selected') === 'true' || tab?.getAttribute('data-state') === 'active' || tab?.getAttribute('data-selected') === 'true';
  }

  function getVisibleOpenOrdersTable(root = document) {
    return Array.from(root.querySelectorAll('table, [role="table"]')).find(table => {
      const rect = table.getBoundingClientRect();
      const text = (table.innerText || table.textContent || '').replace(/\s+/g, ' ').toLowerCase();
      return rect.width > 0 && rect.height > 0 && text.includes('trigger price') && text.includes('limit price');
    }) || null;
  }

  function isOpenOrdersViewVisible(root = document) {
    const text = (root.body?.innerText || root.innerText || root.textContent || '').replace(/\s+/g, ' ').trim();
    return /no open orders(?: yet)?/i.test(text) || Boolean(getVisibleOpenOrdersTable(root));
  }

  function findOpenOrdersPanelContext() {
    const isOpenOrdersLabel = item => /^open\s+orders(?:\s*\(\s*\d+\s*\))?$/i.test(
      (item?.innerText || item?.textContent || '').replace(/\s+/g, ' ').trim()
    );
    const candidates = Array.from(document.querySelectorAll('[role="tab"], button, [role="button"]'))
      .filter(item => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && isOpenOrdersLabel(item);
      });
    const tab = candidates.find(item => item.getAttribute('role') === 'tab') || candidates[0] || null;
    if (!tab) return null;
    const tabList = tab.closest('[role="tablist"]') || tab.parentElement;
    return { panel: document, tab, tabList };
  }

  function readOpenOrdersPanelCount(panel, tab) {
    const tabLabel = (tab?.innerText || tab?.textContent || '').replace(/\s+/g, ' ').trim();
    const badgeMatch = tabLabel.match(/\(\s*(\d+)\s*\)/);
    if (badgeMatch) return Number(badgeMatch[1]);
    if (!isSelectedOrdersTab(tab) && !isOpenOrdersViewVisible(panel)) return null;

    const table = getVisibleOpenOrdersTable(panel || document);
    const rows = Array.from(table?.querySelectorAll('tbody tr, [role="row"]') || []).filter(row => {
      const rect = row.getBoundingClientRect();
      const text = (row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim();
      return rect.width > 0 && rect.height > 0 && text &&
        !row.querySelector('th, [role="columnheader"]') &&
        !/^(market|type|value|trigger price|limit price|mid price|created at|id)(\s|$)/i.test(text);
    });
    if (rows.length) return rows.length;
    const panelText = (panel?.body?.innerText || panel?.innerText || panel?.textContent || '').replace(/\s+/g, ' ').trim();
    if (/no open orders(?: yet)?/i.test(panelText)) return 0;
    return null;
  }

  async function openOrdersPanelMonitor() {
    const context = findOpenOrdersPanelContext();
    if (!context) return { error: 'not-found' };
    const { panel, tab, tabList } = context;
    const previousTab = Array.from(tabList?.querySelectorAll('[role="tab"]') || []).find(isSelectedOrdersTab) || null;
    if (previousTab !== tab) {
      tab.click();
      const selected = await waitForOrderState(() => tab.isConnected && (isSelectedOrdersTab(tab) || isOpenOrdersViewVisible(panel)), 1800);
      if (!selected) return { error: 'not-active' };
    }
    return {
      count: () => readOpenOrdersPanelCount(panel, tab),
      restore: async () => {
        if (previousTab && previousTab !== tab && previousTab.isConnected) {
          previousTab.click();
          await waitForOrderState(() => isSelectedOrdersTab(previousTab), 1200);
        }
      }
    };
  }

  function waitForOrderState(check, timeoutMs = 12000) {
    return new Promise(resolve => {
      const started = Date.now();
      const poll = () => {
        let result = null;
        try { result = check(); } catch (e) {}
        if (result) return resolve(result);
        if (Date.now() - started >= timeoutMs) return resolve(null);
        setTimeout(poll, 200);
      };
      poll();
    });
  }

  async function selectTicketUnit(panel, ticker) {
    const read = () => {
      const unitControl = findOrderAmountControls(panel)?.unitControl;
      return unitControl ? (unitControl.innerText || unitControl.textContent || unitControl.value || '').replace(/[↕▼⌄▾]/g, '').trim().toUpperCase() : '';
    };
    const controls = findOrderAmountControls(panel);
    if (!controls?.unitControl) return false;
    if (read() === ticker.toUpperCase()) return true;
    controls.unitControl.click();
    const option = await waitForOrderState(() => Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], button')).find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (el.innerText || el.textContent || '').replace(/[↕▼⌄▾]/g, '').trim().toUpperCase() === ticker.toUpperCase();
    }), 2000);
    if (!option) return false;
    option.click();
    return await waitForOrderState(() => read() === ticker.toUpperCase(), 2000) === true;
  }

  function syncManualTicketButtons() {
    const panel = getOrderTicketPanel();
    if (!panel || !isTopWindow || !isExtensionValid()) return;
    const ci = normalizeCortexIndicatorConfig(settings.cortexIndicator);
    const nativeBuy = findVisibleOrderButton(panel, /^buy\s*\/\s*long$/i);
    const nativeSell = findVisibleOrderButton(panel, /^sell\s*\/\s*short$/i);
    if (!nativeBuy || !nativeSell) return;
    let host = panel.querySelector('#vest-ci-manual-order-controls');
    if (!ci.enabled) {
      host?.remove();
      return;
    }
    if (!host || !host.isConnected) {
      host = document.createElement('div');
      host.id = 'vest-ci-manual-order-controls';
      host.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 8px;padding:8px;border:1px solid rgba(59,130,246,.35);border-radius:8px;background:rgba(15,23,42,.72);';
      const makeButton = (side, text, background, border) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.cortexManualSide = side;
        button.textContent = text;
        button.title = `Confirm and submit a live market ${side} using the current ticket size, then stage the stop and three reduce-only target limits`;
        button.style.cssText = `height:34px;border:1px solid ${border};border-radius:6px;background:${background};color:#fff;font:700 11px Arial,sans-serif;letter-spacing:.15px;cursor:pointer;`;
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const ticker = normalizeInstrumentKey(getOrderAmountMemoryKey().split(':').pop());
          const marketPrice = getCurrentMarketPrice();
          startManualChartOrder(side, { symbol: ticker, marketPrice });
        });
        return button;
      };
      host.append(makeButton('long', 'LIVE BUY + TARGETS', '#047857', '#10b981'));
      host.append(makeButton('short', 'LIVE SELL + TARGETS', '#be123c', '#fb7185'));
      const nativeActions = nativeBuy.parentElement === nativeSell.parentElement ? nativeBuy.parentElement : nativeBuy.parentElement?.parentElement;
      if (nativeActions?.parentElement) nativeActions.parentElement.insertBefore(host, nativeActions);
      else panel.append(host);
    }
  }

  const manualTicketInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(manualTicketInterval);
      return;
    }
    syncManualTicketButtons();
  }, 800);
  let manualChartOrderInProgress = false;
  async function startManualChartOrder(side, payload) {
    if (!isTopWindow || !isExtensionValid() || manualChartOrderInProgress || !['long', 'short'].includes(side)) return;
    const actionName = side === 'long' ? 'Buy' : 'Sell';
    const exitButtonPattern = side === 'long' ? /^sell\s*\/\s*short$/i : /^buy\s*\/\s*long$/i;
    const entryButtonPattern = side === 'long' ? /^buy\s*\/\s*long$/i : /^sell\s*\/\s*short$/i;
    const ticketPanel = getOrderTicketPanel();
    const ci = normalizeCortexIndicatorConfig(settings.cortexIndicator);
    const ticker = normalizeInstrumentKey(getOrderAmountMemoryKey().split(':').pop());
    const chartTicker = normalizeInstrumentKey(payload?.symbol);
    const controls = findOrderAmountControls(ticketPanel);
    const amount = Number(String(controls?.amountInput?.value || '').replace(/,/g, ''));
    const unit = (controls?.unitControl?.innerText || controls?.unitControl?.textContent || controls?.unitControl?.value || '').replace(/[↕▼⌄▾]/g, '').trim();
    const currentPosition = getPositionRow(ticker);
    if (!ticketPanel || !controls || !Number.isFinite(amount) || amount <= 0) return showToast(`${actionName} stopped: Vest ticket amount or order panel is unavailable.`);
    if (!ticker || !chartTicker || ticker !== chartTicker) return showToast(`${actionName} stopped: chart (${chartTicker || 'unknown'}) and Vest ticket (${ticker || 'unknown'}) do not match.`);
    if (currentPosition) return showToast(`${actionName} stopped: an open ${currentPosition.side} position already exists for ${ticker}.`);
    if (!ci.enabled) return showToast('Turn on the Cortex Indicator before using its ticket entry buttons.');
    const preflightOrders = await openOrdersPanelMonitor();
    if (preflightOrders?.error === 'not-found') return showToast(`${actionName} stopped: Vest's Open Orders tab was not found in the account panel.`);
    if (preflightOrders?.error === 'not-active') return showToast(`${actionName} stopped: Vest's Open Orders tab did not activate. Select it manually and retry.`);
    if (!preflightOrders) return showToast(`${actionName} stopped: Vest's Open Orders panel could not be read.`);
    const openOrders = preflightOrders.count();
    await preflightOrders.restore();
    if (openOrders === null) return showToast(`${actionName} stopped: Vest's Open Orders panel did not show a count, rows, or an empty-state message.`);
    if (openOrders > 0) return showToast(`${actionName} stopped: clear existing open orders before using the chart entry button.`);
    const referencePrice = Number(payload.marketPrice);
    const levels = window.TradingCortexExecution?.calculateManualLevels(side, referencePrice, ci);
    if (!levels) return showToast(`${actionName} stopped: current market price is unavailable.`);

    const marketTab = Array.from(ticketPanel.querySelectorAll('[role="tab"]')).find(tab => /^market$/i.test((tab.innerText || tab.textContent || '').trim()));
    const takeProfitInput = findLabeledOrderInput(ticketPanel, 'take profit', [controls.amountInput]);
    const stopLossInput = findStopLossInput(ticketPanel);
    const tpslCheckbox = findTicketCheckbox(ticketPanel, 'tpsl', 'TP/SL');
    const reduceOnlyCheckbox = findTicketCheckbox(ticketPanel, 'reduceOnly', 'Reduce Only');
    if (!marketTab || !tpslCheckbox || !reduceOnlyCheckbox || !findVisibleOrderButton(ticketPanel, entryButtonPattern)) {
      return showToast(`${actionName} stopped: Vest entry/stop controls did not match the verified ticket layout.`);
    }
    const accept = window.confirm(`${actionName.toUpperCase()} MARKET ${ticker}\nTicket size: ${amount} ${unit || 'units'}\nStop: ${roundStopPrice(levels.stopPrice, ticketPanel)}\nTargets (25% each): ${levels.targetPrices.map(price => roundStopPrice(price, ticketPanel)).join(' / ')}\n\nAfter the market position appears, Cortex will submit three reduce-only limit orders. Continue?`);
    if (!accept) return;

    const releaseLock = acquireCortexExecutionLock(ticker, 120000);
    if (!releaseLock) return showToast('Another Cortex order workflow is already running for this instrument.');
    manualChartOrderInProgress = true;
    let original = null;
    let restoreOpenOrdersPanel = null;
    try {
      original = {
        amount: controls.amountInput.value,
        unit,
        tp: takeProfitInput?.value || '',
        sl: stopLossInput?.value || '',
        tpsl: Boolean(tpslCheckbox.checked),
        reduceOnly: Boolean(reduceOnlyCheckbox.checked),
        orderMode: (Array.from(ticketPanel.querySelectorAll('[role="tab"]')).find(tab => tab.getAttribute('aria-selected') === 'true' && /^(market|limit|scale)$/i.test((tab.innerText || tab.textContent || '').trim()))?.innerText || 'Market').trim(),
        priceMode: (Array.from(ticketPanel.querySelectorAll('[role="tab"]')).find(tab => tab.getAttribute('aria-selected') === 'true' && /^(at price|in \$|in %)$/i.test((tab.innerText || tab.textContent || '').trim()))?.innerText || 'At Price').trim()
      };
      Array.from(ticketPanel.querySelectorAll('[role="tab"]')).find(tab => /^market$/i.test((tab.innerText || tab.textContent || '').trim()))?.click();
      if (!setTicketCheckbox(ticketPanel, 'reduceOnly', 'Reduce Only', false) || !setTicketCheckbox(ticketPanel, 'tpsl', 'TP/SL', true)) {
        throw new Error('Could not set the market ticket protections.');
      }
      const livePriceModeTab = await waitForOrderState(() => Array.from(ticketPanel.querySelectorAll('[role="tab"]')).find(tab => /^at price$/i.test((tab.innerText || tab.textContent || '').trim())), 1500);
      if (!livePriceModeTab) throw new Error('Could not set the stop to an absolute price. No market entry was sent.');
      livePriceModeTab.click();
      const liveTakeProfitInput = await waitForOrderState(() => findLabeledOrderInput(ticketPanel, 'take profit', [findOrderAmountControls(ticketPanel)?.amountInput]), 1500);
      const liveStopLossInput = await waitForOrderState(() => findStopLossInput(ticketPanel), 1500);
      if (!liveTakeProfitInput || !liveStopLossInput) throw new Error('Could not expose the market ticket stop-loss fields. No market entry was sent.');
      setVisibleInputValue(liveTakeProfitInput, '');
      setVisibleInputValue(liveStopLossInput, String(roundStopPrice(levels.stopPrice, ticketPanel)));
      showToast(`Submitting confirmed ${ticker} market ${side}; waiting for Vest to show the filled position.`);
      const liveEntryButton = findVisibleOrderButton(ticketPanel, entryButtonPattern);
      if (!liveEntryButton) throw new Error(`Vest’s ${side === 'long' ? 'Buy/Long' : 'Sell/Short'} button disappeared before submission. No market entry was sent.`);
      liveEntryButton.click();
      const position = await waitForOrderState(() => getPositionRow(ticker), 15000);
      if (!position) throw new Error('Vest did not show a confirmed position within 15 seconds. No target orders were sent. Check the Vest ticket before retrying.');
      if (position.side !== side) throw new Error('Vest showed a position on the wrong side. Target orders were not sent.');
      if (!position.entryPrice || !position.quantity || position.quantity <= 0) throw new Error('Vest showed the position, but Cortex could not read its fill price and size. The initial stop was submitted; target limits were not sent.');

      const filledLevels = window.TradingCortexExecution.calculateManualLevels(side, position.entryPrice, ci);
      const targetOrders = filledLevels.targetPrices.map(price => roundStopPrice(price, ticketPanel));
      const targetQty = Number((position.quantity * 0.25).toFixed(Math.min(8, position.quantityDecimals)));
      if (!Number.isFinite(targetQty) || targetQty <= 0) throw new Error('Position size was too small to split into three targets. The initial stop remains in place.');
      const orderMonitor = await openOrdersPanelMonitor();
      if (!orderMonitor || orderMonitor.error) throw new Error(`Position is open, but Cortex could not read Vest’s Open Orders panel (${orderMonitor?.error || 'unknown'}). No target limits were sent.`);
      restoreOpenOrdersPanel = orderMonitor.restore;
      const beforeTargets = orderMonitor.count();
      if (beforeTargets === null) throw new Error('Position is open, but Vest’s Open Orders panel did not show a count, rows, or an empty-state message. No target limits were sent.');

      const limitTab = Array.from(ticketPanel.querySelectorAll('[role="tab"]')).find(tab => /^limit$/i.test((tab.innerText || tab.textContent || '').trim()));
      if (!limitTab) throw new Error('Position is open, but Vest’s Limit tab was not found. No target limits were sent.');
      limitTab.click();
      const limitPriceInput = await waitForOrderState(() => findLimitPriceInput(ticketPanel, [findOrderAmountControls(ticketPanel)?.amountInput]), 2500);
      if (!limitPriceInput) throw new Error('Position is open, but the Vest limit-price field could not be found. No target limits were sent.');
      if (!await selectTicketUnit(ticketPanel, ticker)) throw new Error(`Position is open, but Vest could not switch the order size unit to ${ticker}. No target limits were sent.`);
      if (!setTicketCheckbox(ticketPanel, 'reduceOnly', 'Reduce Only', true) || !setTicketCheckbox(ticketPanel, 'tpsl', 'TP/SL', false)) {
        throw new Error('Position is open, but Cortex could not enable reduce-only target orders. No target limits were sent.');
      }

      let placed = 0;
      for (let i = 0; i < targetOrders.length; i++) {
        const amountInput = findOrderAmountControls(ticketPanel)?.amountInput;
        const sideButton = findVisibleOrderButton(ticketPanel, exitButtonPattern);
        const liveLimitPriceInput = findLimitPriceInput(ticketPanel, [amountInput]);
        if (!amountInput || !sideButton || !liveLimitPriceInput || !setVisibleInputValue(amountInput, String(targetQty)) || !setVisibleInputValue(liveLimitPriceInput, String(targetOrders[i]))) {
          throw new Error(`Position is open; only ${placed} of 3 targets were staged because Vest’s limit fields changed.`);
        }
        const liveReduceOnly = findTicketCheckbox(ticketPanel, 'reduceOnly', 'Reduce Only');
        if (!liveReduceOnly?.checked) throw new Error('Position is open; reduce-only was turned off, so no further targets were sent.');
        sideButton.click();
        const expectedCount = beforeTargets + placed + 1;
        const accepted = await waitForOrderState(() => {
          const count = orderMonitor.count();
          return count !== null && count >= expectedCount ? count : null;
        }, 12000);
        if (accepted === null) throw new Error(`Position is open; Vest did not confirm target ${i + 1}. ${placed} target(s) were confirmed.`);
        placed += 1;
      }

      showToast(`Confirmed ${side} entry for ${ticker}; three reduce-only targets staged at ${targetOrders.join(', ')}.`);
    } catch (error) {
      showToast(error?.message || `${actionName} workflow stopped. Check the open position and orders in Vest.`);
    } finally {
      try { if (restoreOpenOrdersPanel) await restoreOpenOrdersPanel(); } catch (e) {}
      try {
        const currentPanel = getOrderTicketPanel();
        if (currentPanel) {
          const currentControls = findOrderAmountControls(currentPanel);
          const restoreOrderMode = Array.from(currentPanel.querySelectorAll('[role="tab"]')).find(tab => (tab.innerText || tab.textContent || '').trim().toLowerCase() === (original?.orderMode || 'Market').toLowerCase());
          restoreOrderMode?.click();
          const restorePriceMode = Array.from(currentPanel.querySelectorAll('[role="tab"]')).find(tab => (tab.innerText || tab.textContent || '').trim().toLowerCase() === (original?.priceMode || 'At Price').toLowerCase());
          restorePriceMode?.click();
          if (currentControls?.amountInput && original) setVisibleInputValue(currentControls.amountInput, original.amount);
          if (original?.unit) await selectTicketUnit(currentPanel, original.unit);
          if (original) setVisibleInputValue(findLabeledOrderInput(currentPanel, 'take profit', [currentControls?.amountInput]), original.tp);
          if (original) setVisibleInputValue(findStopLossInput(currentPanel), original.sl);
          if (original) setTicketCheckbox(currentPanel, 'tpsl', 'TP/SL', original.tpsl);
          if (original) setTicketCheckbox(currentPanel, 'reduceOnly', 'Reduce Only', original.reduceOnly);
        }
      } catch (e) {}
      manualChartOrderInProgress = false;
      releaseLock();
    }
  }

  function handleCortexIndicatorBar(message, lockRetry = 0) {
    if (!isTopWindow) return;
    const engine = window.TradingCortexExecution;
    if (!engine || !message || !message.bar || !message.symbol) return;
    const ci = normalizeCortexIndicatorConfig(settings.cortexIndicator);
    if (!ci.enabled || !ci.executionEnabled) return;
    if (ci.executionMode === 'live') {
      if (!liveExecutionGuardNoticeShown) {
        liveExecutionGuardNoticeShown = true;
        showToast('Live execution is fail-closed: no orders were sent. The complete Vest order flow still needs verification.');
      }
      return;
    }

    const releaseLock = acquireCortexExecutionLock(message.symbol);
    if (!releaseLock) {
      if (lockRetry < 3) setTimeout(() => handleCortexIndicatorBar(message, lockRetry + 1), 60 * (lockRetry + 1));
      return;
    }
    try {
    const { key, state: storedState } = readCortexExecutionState(message.symbol);
    const barKey = `${message.symbol}:${message.resolution}:${message.bar.timeSec}`;
    if (storedState.lastBarKey === barKey) return;

    const ticket = findOrderAmountControls(getOrderTicketPanel());
    const rawAmount = Number(String(ticket?.amountInput?.value || '').replace(/,/g, ''));
    const unit = ticket?.unitControl ? (ticket.unitControl.innerText || ticket.unitControl.textContent || '').replace(/[↕▼⌄▾]/g, '').trim() : '';
    const size = Number.isFinite(rawAmount) && rawAmount > 0 ? { amount: rawAmount, unit } : null;
    let state = storedState;
    let actions = [];

    const open = state.position;
    if (!open || (open.symbol === message.symbol && open.resolution === message.resolution)) {
      const advanced = engine.processBar(state, { ...message.bar, symbol: message.symbol, resolution: message.resolution });
      state = advanced.state;
      actions.push(...advanced.actions);
    }
    if (message.signal) {
      const result = engine.processSignal(state, message.signal, engine.normalizeConfig(ci), size);
      state = result.state;
      actions.push(...result.actions);
      if (result.actions.some(action => action.type === 'flatten')) {
        // The paper ledger confirms the flatten synchronously. Live mode must
        // instead wait for Vest's position row to report flat before this step.
        const completed = engine.completeReversalAfterFlat(state, engine.normalizeConfig(ci));
        state = completed.state;
        actions.push(...completed.actions);
      }
    }
    state.lastBarKey = barKey;
    state.lastBarAt = Date.now();
    saveCortexExecutionState(key, state);
    const statusEl = document.querySelector('#vest-ci-execution-status');
    const stats = window.TradingCortexExecution?.ensureStats(state) || state.stats || {};
    renderCortexPaperStatsOnChart(message.symbol, stats);
    if (statusEl) {
      statusEl.textContent = state.position
        ? `Paper ${state.position.side.toUpperCase()} open · ${state.position.remainingPercent}% remaining · stop ${state.position.stopPrice}`
        : `Paper state: ${state.status || 'flat'} · ${state.trades.length} completed exits logged.`;
      statusEl.style.color = state.position ? '#34d399' : '#94a3b8';
    }

    if (actions.some(action => action.type === 'enter')) {
      showToast(`Paper ${message.signal?.side || 'signal'} entry logged for ${message.symbol} (${message.resolution}). No order was sent.`);
    } else if (actions.some(action => action.type === 'ignore-reversal')) {
      if (state.lastIgnoredNoticeId !== message.signal?.signalId) {
        state.lastIgnoredNoticeId = message.signal?.signalId || '';
        saveCortexExecutionState(key, state);
        showToast(`Opposing signal ignored within the first ${ci.reversalIgnoreBars} bars after entry.`);
      }
    } else if (actions.some(action => action.type === 'enter-after-flat')) {
      showToast(`Paper reversal logged for ${message.symbol}. No order was sent.`);
    }
    } finally {
      releaseLock();
    }
  }

  const CORTEX_IRISH_VOICE_PRESET = '__cortex_female_irish__';

  function findCortexIrishVoice(voices) {
    const irishVoices = (voices || []).filter(voice => /^en-ie(?:$|-)/i.test(String(voice.lang || '')));
    if (!irishVoices.length) return null;
    // SpeechSynthesisVoice has no gender field. Prefer a voice whose browser-provided
    // name explicitly identifies it as female; otherwise use an Irish English voice
    // and let the user verify its sound with the test button.
    return irishVoices.find(voice => /female|woman/i.test(String(voice.name || ''))) || irishVoices[0];
  }

  function cortexVoiceOptionsMarkup(voices, selectedURI) {
    const irishVoice = findCortexIrishVoice(voices);
    return [
      `<option value="" ${!selectedURI ? 'selected' : ''}>System default voice</option>`,
      `<option value="${CORTEX_IRISH_VOICE_PRESET}" ${selectedURI === CORTEX_IRISH_VOICE_PRESET ? 'selected' : ''} ${irishVoice ? '' : 'disabled'}>${irishVoice ? `Irish English voice · feminine pitch (${escapeHtml(irishVoice.name)})` : 'Irish English voice (not available in browser)'}</option>`,
      ...(voices || []).map(voice => {
        const label = `${voice.name}${voice.lang ? ` (${voice.lang})` : ''}${voice.default ? ' — default' : ''}`;
        return `<option value="${escapeHtml(voice.voiceURI)}" ${selectedURI === voice.voiceURI ? 'selected' : ''}>${escapeHtml(label)}</option>`;
      })
    ].join('');
  }

  function speakCortexVoicePhrase(text, voiceURI) {
    try {
      if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return false;
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const isIrishPreset = voiceURI === CORTEX_IRISH_VOICE_PRESET;
      const voice = isIrishPreset
        ? findCortexIrishVoice(voices)
        : voices.find(item => item.voiceURI === voiceURI) || voices.find(item => item.default) || voices[0];
      if (isIrishPreset && !voice) return false;
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.pitch = isIrishPreset ? 1.1 : 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      return false;
    }
  }

  function speakCortexSignalAlert(message, confirmed) {
    if (!isTopWindow || !message || !['long', 'short'].includes(message.side)) return;
    const ci = normalizeCortexIndicatorConfig(settings.cortexIndicator);
    if (!ci.enabled || (confirmed ? !ci.confirmedSignalVoiceAlert : !ci.formingSignalVoiceAlert)) return;
    const barKey = `${message.symbol}:${message.resolution}:${message.timeSec}${confirmed ? `:${message.side}` : ''}`;
    const dedupeKey = `__trading_cortex_voice_alert__:${confirmed ? 'confirmed' : 'forming'}:${message.symbol}:${message.resolution}`;
    try {
      const recentKeys = JSON.parse(window.localStorage.getItem(dedupeKey) || '[]');
      if (Array.isArray(recentKeys) && recentKeys.includes(barKey)) return;
      const nextKeys = (Array.isArray(recentKeys) ? recentKeys : []).concat(barKey).slice(-24);
      window.localStorage.setItem(dedupeKey, JSON.stringify(nextKeys));
    } catch (e) {}

    speakCortexVoicePhrase(confirmed
      ? (message.side === 'long' ? 'Buy Now' : 'Sell Now')
      : `${message.side === 'long' ? 'Buy' : 'Sell'} signal forming`, ci.signalAlertVoiceURI);
  }

  let sharedCortexAudioContext = null;
  let userHasInteractedWithPage = false;

  function markUserInteractionForAudio() {
    userHasInteractedWithPage = true;
    try {
      const AudioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
      if (!AudioCtx) return;
      if (!sharedCortexAudioContext || sharedCortexAudioContext.state === 'closed') {
        sharedCortexAudioContext = new AudioCtx();
      }
      if (sharedCortexAudioContext && sharedCortexAudioContext.state === 'suspended') {
        sharedCortexAudioContext.resume().catch(() => {});
      }
    } catch (e) {}
  }

  // Register passive interaction listeners on window to unlock Web Audio on first gesture
  if (typeof window !== 'undefined') {
    ['pointerdown', 'mousedown', 'keydown', 'touchstart'].forEach(type => {
      window.addEventListener(type, markUserInteractionForAudio, { capture: true, passive: true });
    });
  }

  function canPlayWebAudio() {
    if (userHasInteractedWithPage) return true;
    if (typeof navigator !== 'undefined' && navigator.userActivation) {
      return Boolean(navigator.userActivation.isActive || navigator.userActivation.hasBeenActive);
    }
    return false;
  }

  function getCortexAudioContext() {
    if (!sharedCortexAudioContext) return null;
    return sharedCortexAudioContext;
  }

  function playWithAudioContext(playFn) {
    try {
      // Chrome's autoplay policy strictly forbids calling new AudioContext() or ctx.resume()
      // in background callbacks outside an active user gesture, which logs an extension error in chrome://extensions.
      // AudioContext is safely instantiated & resumed inside markUserInteractionForAudio() on genuine user gestures.
      if (!sharedCortexAudioContext || sharedCortexAudioContext.state !== 'running') {
        return;
      }
      playFn(sharedCortexAudioContext);
    } catch (e) {}
  }

  function playOrderBlockChime(side) {
    try {
      playWithAudioContext((ctx) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (side === 'long') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
        } else {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(659.25, now);
          osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.14);
        }
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      });
    } catch (e) {}
  }

  function handleOrderBlockMitigatedAlert(payload) {
    if (!isTopWindow || !payload || !['long', 'short'].includes(payload.side)) return;
    const obConfig = normalizeOrderBlocksConfig(settings.orderBlocks);
    if (!obConfig.enabled) return;
    const alertKey = `${payload.symbol || ''}:${payload.resolution || ''}:${payload.id || ''}:${payload.timeSec || ''}`;
    const dedupeKey = `__trading_cortex_ob_alert__:${payload.symbol || ''}:${payload.resolution || ''}`;
    try {
      const recentKeys = JSON.parse(window.localStorage.getItem(dedupeKey) || '[]');
      if (Array.isArray(recentKeys) && recentKeys.includes(alertKey)) return;
      const nextKeys = (Array.isArray(recentKeys) ? recentKeys : []).concat(alertKey).slice(-24);
      window.localStorage.setItem(dedupeKey, JSON.stringify(nextKeys));
    } catch (e) {}
    if (obConfig.chimeAlertEnabled !== false) {
      playOrderBlockChime(payload.side);
    }
    if (obConfig.voiceAlertEnabled !== false) {
      const phrase = payload.side === 'long'
        ? 'Bullish Order Block Mitigated. Enter Long.'
        : 'Bearish Order Block Mitigated. Enter Short.';
      speakCortexVoicePhrase(phrase, obConfig.voiceURI);
    }
  }

  // Listen for messages from MAIN world
  window.addEventListener('message', async (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    const { type, templateId, template, updates } = event.data;

    if (type === 'VEST_TV_RANGE_UPDATE') {
      latestRangeDetectorTelemetry = event.data.payload || {};
      renderChartRangeBox();
    } else if (type === 'VEST_TV_ORDER_BLOCKS_UPDATE') {
      latestOrderBlocksTelemetry = event.data.payload || {};
      renderChartOrderBlockStatsBox();
    } else if (type === 'VEST_TV_RANGE_ALERT') {
      handleRangeDetectedAlert(event.data.payload || {});
    } else     if (type === 'VEST_TV_OB_MITIGATED') {
      handleOrderBlockMitigatedAlert(event.data.payload || {});
    } else if (type === 'VEST_TV_OB_DISMISS') {
      const dismissKey = typeof event.data.key === 'string' ? event.data.key.trim() : '';
      const label = typeof event.data.label === 'string' ? event.data.label.trim() : 'Order Block';
      if (dismissKey) {
        const ob = normalizeOrderBlocksConfig(settings.orderBlocks);
        if (!ob.dismissedOrderBlocks.includes(dismissKey)) {
          ob.dismissedOrderBlocks = [...ob.dismissedOrderBlocks, dismissKey].slice(-300);
          settings.orderBlocks = normalizeOrderBlocksConfig(ob);
          safeStorageSet({ templates, settings });
          notifyMainWorldConfig();
          showToast(`Removed ${label} (saved)`);
        }
      }
    } else if (type === 'VEST_TV_CI_SIGNAL_FORMING') {
      speakCortexSignalAlert(event.data.payload || {}, false);
    } else if (type === 'VEST_TV_CI_SIGNAL_CONFIRMED') {
      speakCortexSignalAlert(event.data.payload || {}, true);
    } else if (type === 'VEST_TV_CI_BAR_CLOSED') {
      handleCortexIndicatorBar(event.data.payload || {});
    } else if (type === 'VEST_TV_MAIN_READY') {
      if (settingsLoaded) {
        notifyMainWorldConfig();
      }
      postToMainWorlds({ type: 'VEST_TV_QUERY_DRAWING_TOOLBAR_STATE' });
    } else if (type === 'VEST_TV_DRAWING_TOOLBAR_STATE') {
      latestDrawingToolbarVisible = Boolean(event.data.visible);
      const badge = document.getElementById('vest-sdm-drawing-toolbar-badge');
      if (badge) {
        badge.className = `vest-sdm-badge-pill ${latestDrawingToolbarVisible ? 'on' : ''}`;
        badge.textContent = latestDrawingToolbarVisible ? 'VISIBLE' : 'HIDDEN';
      }
    } else if (type === 'VEST_TV_GLOBAL_DRAWING_UPSERT') {
      if (!isTopWindow || !isExtensionValid() || !event.data.drawing) return;
      const drawing = event.data.drawing;
      globalDrawings = (globalDrawings || []).filter(item => item && item.id !== drawing.id);
      globalDrawings.push(drawing);
      postToMainWorlds({ type: 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', payload: { drawings: globalDrawings } });
      const stored = await chrome.storage.local.get(['globalDrawings']).catch(() => ({}));
      const latest = normalizeGlobalDrawings(stored.globalDrawings || globalDrawings);
      const next = latest.filter(item => item && item.id !== drawing.id);
      next.push(drawing);
      saveGlobalDrawings(next);
    } else if (type === 'VEST_TV_GLOBAL_DRAWING_REMOVE') {
      if (!isTopWindow || !isExtensionValid() || !event.data.drawingId) return;
      const targetId = event.data.drawingId;
      globalDrawings = (globalDrawings || []).filter(item => item && item.id !== targetId);
      postToMainWorlds({ type: 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', payload: { drawings: globalDrawings } });
      const stored = await chrome.storage.local.get(['globalDrawings']).catch(() => ({}));
      const latest = normalizeGlobalDrawings(stored.globalDrawings || globalDrawings);
      saveGlobalDrawings(latest.filter(item => item && item.id !== targetId));
    } else if (type === 'VEST_TV_TOGGLE_TIMEFRAME_FAVORITE') {
      if (!isTopWindow) return;
      const payload = event.data.payload || {};
      const resolution = String(payload.resolution || '').trim();
      const favorites = normalizeFavoriteTimeframes(settings.favoriteTimeframes);
      const existingIndex = favorites.findIndex(item => item.resolution === resolution);
      if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
      } else {
        favorites.push({ resolution, label: String(payload.label || '').trim() });
      }
      settings.favoriteTimeframes = normalizeFavoriteTimeframes(favorites);
      queueSettingsSave({ favoriteTimeframes: settings.favoriteTimeframes });
      notifyMainWorldConfig();
    } else if (type === 'VEST_TV_ACTIVE_TEMPLATE_CHANGED') {
      settings.activeTemplateId = templateId;
      safeStorageSet({ settings });
      if (isTopWindow) renderFloatingBar();
    } else if (type === 'VEST_TV_ADD_STOP_LOSS') {
      const payload = event.data.payload || {};
      if (!isTopWindow || !['long', 'short'].includes(payload.side)) return;
      const side = payload.side;
      const reportedMarket = Number(payload.marketPrice);
      const reportedFail = Number(payload.failPrice);
      const current = Number.isFinite(reportedMarket) && reportedMarket > 0 ? reportedMarket : getCurrentMarketPrice();
      const fail = Number.isFinite(reportedFail) && reportedFail > 0 ? reportedFail : latestFailPrices[side];
      if (!Number.isFinite(current) || !Number.isFinite(fail)) {
        showToast(`Unable to read the current ${side} fail price or market price`);
        return;
      }
      pendingStopLoss = { side, orderClickedAt: 0 };
      const estimate = roundStopPrice((current + fail) / 2, getOrderTicketPanel());
      setStopLossValue(estimate);
      broadcastStopLossEstimate(side, estimate);
    } else if (type === 'VEST_TV_STOP_LOSS_PRICE_UPDATE') {
      const payload = event.data.payload || {};
      if (!isTopWindow || !pendingStopLoss || payload.side !== pendingStopLoss.side) return;
      const estimate = Number(payload.price);
      if (Number.isFinite(estimate) && estimate > 0) {
        const roundedEstimate = roundStopPrice(estimate, getOrderTicketPanel());
        setStopLossValue(roundedEstimate);
        broadcastStopLossEstimate(pendingStopLoss.side, roundedEstimate);
      }
    } else if (type === 'VEST_TV_FAIL_PRICES_UPDATE') {
      // Price stream is consumed by the MAIN-world chart canvas renderer.
    } else if (type === 'VEST_TV_TEMPLATE_CREATED_FROM_SHAPE') {
      if (template) {
        const hydrated = hydrateTemplateForEditor(template);
        const dt = hydrated.drawingType || 'rectangle';
        const sig = `${dt}::${String(hydrated.name || '').trim().toLowerCase()}`;
        const now = Date.now();
        // Prevent duplicate creation if message arrived twice within 1.5s
        if (sig === lastCreatedTemplateSig && (now - lastCreatedTemplateTime) < 1500) {
          return;
        }
        lastCreatedTemplateSig = sig;
        lastCreatedTemplateTime = now;

        // If a template with the exact same name & drawingType already exists, update it in-place instead of creating a duplicate
        const existingIdx = templates.findIndex(
          t => (t.drawingType || 'rectangle') === dt && String(t.name || '').trim().toLowerCase() === String(hydrated.name || '').trim().toLowerCase()
        );
        if (existingIdx !== -1) {
          templates[existingIdx] = hydrateTemplateForEditor({
            ...templates[existingIdx],
            ...hydrated,
            id: templates[existingIdx].id
          });
          settings.activeTemplateId = templates[existingIdx].id;
          safeStorageSet({ templates, settings });
          notifyMainWorldConfig();
          showToast(`Updated "${hydrated.name}" (${getDrawingTypeLabel(dt)})!`);
        } else {
          templates.push(hydrated);
          settings.activeTemplateId = hydrated.id;
          safeStorageSet({ templates, settings });
          notifyMainWorldConfig();
          showToast(`Saved "${hydrated.name}" (${getDrawingTypeLabel(dt)})!`);
        }
        if (isTopWindow) renderFloatingBar();
      }
    } else if (type === 'VEST_TV_ACTIVE_TEMPLATE_UPDATED_FROM_SHAPE') {
      const activeIdx = templates.findIndex(t => t.id === settings.activeTemplateId);
      if (activeIdx !== -1 && updates) {
        templates[activeIdx] = hydrateTemplateForEditor({
          ...templates[activeIdx],
          ...updates
        });
        safeStorageSet({ templates });
        notifyMainWorldConfig();
        showToast(`Saved current drawing settings to "${templates[activeIdx].name}"!`);
        if (isTopWindow) renderFloatingBar();
      }
    } else if (type === 'VEST_TV_TEMPLATE_OVERRIDDEN') {
      const targetIdx = templates.findIndex(t => t.id === templateId);
      if (targetIdx !== -1 && updates) {
        templates[targetIdx] = hydrateTemplateForEditor({
          ...templates[targetIdx],
          ...updates
        });
        settings.activeTemplateId = templates[targetIdx].id;
        safeStorageSet({ templates, settings });
        notifyMainWorldConfig();
        showToast(`Template "${templates[targetIdx].name}" updated from drawing!`);
        if (isTopWindow) renderFloatingBar();
      }
    } else if (type === 'VEST_TV_OPEN_TEMPLATE_MANAGER') {
      if (isTopWindow) {
        openTemplateManagerModal(event.data.drawingType || 'all', event.data.templateId || null);
      }
    } else if (type === 'VEST_TV_EDIT_TEMPLATE_REQUEST') {
      if (isTopWindow && templateId) {
        const targetTpl = templates.find(t => t.id === templateId);
        openTemplateManagerModal(targetTpl ? (targetTpl.drawingType || 'rectangle') : 'all', templateId);
      }
    } else if (type === 'VEST_TV_SHAPE_PROPERTIES_FOR_EDITOR') {
      if (isTopWindow && event.data.properties) {
        populateEditorModalFromProperties(event.data.properties);
      }
    } else if (type === 'VEST_TV_DELETE_TEMPLATE_REQUEST') {
      const tplToDelete = templates.find(t => t.id === templateId);
      const name = tplToDelete ? tplToDelete.name : (event.data.templateName || 'Template');
      templates = templates.filter(t => t.id !== templateId);
      if (settings.activeTemplateId === templateId) {
        settings.activeTemplateId = templates[0]?.id || null;
      }
      if (settings.defaultTemplateId === templateId) {
        settings.defaultTemplateId = templates[0]?.id || null;
      }
      safeStorageSet({ templates, settings });
      notifyMainWorldConfig();
      showToast(`Deleted "${name}"`);
      if (isTopWindow) renderFloatingBar();
    } else if (type === 'VEST_TV_SIDEBAR_STATE_CHANGED') {
      if (event.data.sidebarState) {
        const incoming = event.data.sidebarState;
        const prev = settings.sidebarState || {};
        settings.sidebarState = {
          ...prev,
          ...incoming,
          groupTools: {
            ...(prev.groupTools || {}),
            ...(incoming.groupTools || {})
          },
          toolbarStorage: {
            ...sanitizeSidebarToolbarStorage(prev.toolbarStorage),
            ...sanitizeSidebarToolbarStorage(incoming.toolbarStorage)
          }
        };
        // Debounce storage write to avoid hammering Chrome API and invalidating context
        queueSettingsSave({ sidebarState: settings.sidebarState });
      }
    } else if (type === 'VEST_TV_CHART_SETTINGS_CHANGED') {
      if (event.data.lastChartSettings) {
        const incoming = event.data.lastChartSettings;
        const prev = settings.lastChartSettings || {};
        settings.lastChartSettings = mergeLastChartSettings(prev, incoming);
        if (event.data.meta) {
          lastChartSettingsMeta = event.data.meta;
        }
        queueSettingsSave({
          lastChartSettings: settings.lastChartSettings,
          lastChartSettingsMeta
        });
      }
    } else if (type === 'VEST_TV_SHOW_TOAST') {
      if (event.data.message) {
        showToast(event.data.message);
      }
    } else if (type === 'VEST_TICKER_UPDATE') {
      const prevInst = currentInstrument;
      if (event.data.instrument) currentInstrument = event.data.instrument;
      if (event.data.price) currentPrice = event.data.price;
      updateHeaderTickerDisplay();
      if (isTopWindow && prevInst !== currentInstrument && settings.tradesBox && settings.tradesBox.enabled && typeof renderChartTradesBox === 'function') {
        renderChartTradesBox();
      }
      if (isTopWindow && prevInst !== currentInstrument && settings.accountsRiskBox && settings.accountsRiskBox.enabled && typeof renderChartAccountsRiskBox === 'function') {
        renderChartAccountsRiskBox();
      }
      if (isTopWindow && prevInst !== currentInstrument) refreshCortexPaperStatsOnChart(currentInstrument);
    } else if (type === 'VEST_TRADES_CAPTURED') {
      if (isTopWindow && Array.isArray(event.data.trades) && event.data.trades.length > 0 && typeof mergeCapturedTrades === 'function') {
        mergeCapturedTrades(event.data.trades, Boolean(event.data.notifyToast));
      }
    } else if (type === 'VEST_ACCOUNTS_CAPTURED') {
      if (isTopWindow && Array.isArray(event.data.accounts) && event.data.accounts.length > 0 && typeof mergeCapturedFirmAccounts === 'function') {
        mergeCapturedFirmAccounts(event.data.accounts);
      }
    } else if (type === 'VEST_TV_ACCOUNTS_RISK_TOGGLE_COLLAPSE') {
      if (isTopWindow) {
        const arb = normalizeAccountsRiskBoxConfig(settings.accountsRiskBox);
        arb.collapsed = typeof event.data.collapsed === 'boolean' ? event.data.collapsed : !arb.collapsed;
        settings.accountsRiskBox = arb;
        queueSettingsSave({ accountsRiskBox: arb });
        pushAccountsRiskDataToChartCanvas();
      }
    } else if (type === 'VEST_OUTSIDE_INTERACTION') {
      if (studioMenuOpen && typeof closeStudioDropdown === 'function') {
        closeStudioDropdown();
      }
    } else if (type === 'VEST_ACTION_LOG') {
      if (event.data.event) {
        if (studioMenuOpen && event.data.event.frame === 'chart-iframe' && typeof closeStudioDropdown === 'function') {
          closeStudioDropdown();
        }
        handleIncomingActionLog(event.data.event);
      }
    } else if (type === 'VEST_TV_DIAGNOSTICS_TELEMETRY') {
      if (isTopWindow && event.data.telemetry) {
        handleIncomingDiagnosticsTelemetry(event.data.telemetry);
      }
    } else if (type === 'VEST_TV_CORTEX_DEBUG_LOG') {
      if (settings.debugMode && event.data.logPayload) {
        handleIncomingCortexDebugLog(event.data.logPayload);
      }
    } else if (type === 'VEST_EXECUTE_FLATTEN_POSITION') {
      if (isTopWindow && typeof executeTopWindowFlatten === 'function') {
        executeTopWindowFlatten(event.data.payload || {});
      }
    } else if (type === 'VEST_TV_CHART_VIEW_RESET_COMPLETED') {
      const cfg = event.data.config || {};
      showToast(`Chart View Reset: Restored ${cfg.resolution ? cfg.resolution + ' ' : ''}${cfg.symbol || 'chart'} view`);
      cortexDebugLog('Chart View Reset completed with configuration:', cfg);
      if (chartDiagnosticsBoxEl && chartDiagnosticsBoxEl.style.display !== 'none') {
        updateChartDiagnosticsBoxTelemetryOnly();
      }
    }
  });

  // Listen for messages from popup (e.g. override template button in popup list)
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!isExtensionValid()) return;
        if (message && message.type === 'VEST_OVERRIDE_FROM_POPUP' && message.templateId) {
          postToMainWorlds({
            type: 'VEST_TV_OVERRIDE_TEMPLATE',
            payload: { templateId: message.templateId }
          });
          sendResponse({ status: 'ok' });
        }
      });
    }
  } catch (e) {}

  // -------------------------------------------------------------
  // Floating Template Bar Rendering (Disabled per user preference)
  // -------------------------------------------------------------
  function renderFloatingBar() {
    if (barRoot) {
      barRoot.remove();
      barRoot = null;
    }
    const existing = document.getElementById('vest-template-bar-root');
    if (existing) existing.remove();
    if (isTopWindow && typeof renderStudioHeaderPill === 'function') {
      renderStudioHeaderPill();
    }
    return;

    barRoot.innerHTML = `
      <div class="vest-bar-container ${isCollapsed ? 'collapsed' : ''}" id="vest-bar-container">
        <div class="vest-bar-header" id="vest-bar-drag-handle">
          <div class="vest-bar-title" title="Vest Markets Drawing Templates">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <span>${isCollapsed ? '' : 'Box Templates'}</span>
          </div>
          <div class="vest-bar-controls">
            <button class="vest-btn-icon" id="vest-bar-logger-btn" title="Action & Event Logger (Alt+L)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px; height:11px; color:#f59e0b;">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </button>
            <button class="vest-btn-icon" id="vest-collapse-btn" title="${isCollapsed ? 'Expand' : 'Collapse'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${isCollapsed
                  ? '<polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>'
                  : '<line x1="5" y1="12" x2="19" y2="12"></line>'
                }
              </svg>
            </button>
          </div>
        </div>

        <div class="vest-bar-body" id="vest-template-list">
          ${templates.map((tpl, index) => {
            const isActive = tpl.id === settings.activeTemplateId;
            const isDefault = tpl.id === settings.defaultTemplateId;
            const hotkeyNum = index < 9 ? `${index + 1}` : '';
            const fillRgba = hexToRgba(tpl.backgroundColor || tpl.color, (tpl.opacity || 20) / 100);

            // Tags for center line & extend
            const flags = [];
            if (tpl.showMiddleLine) flags.push('<span title="Center / 50% Line">╍</span>');
            if (tpl.extendLeft) flags.push('<span title="Extend Left">⬅</span>');
            if (tpl.extendRight) flags.push('<span title="Extend Right">➜</span>');
            const flagsHtml = flags.length > 0 ? `<span class="vest-template-flags">${flags.join('')}</span>` : '';

            return `
              <div class="vest-template-item ${isActive ? 'active' : ''}" data-id="${tpl.id}" title="${tpl.name} (Alt+${hotkeyNum})">
                <div class="vest-template-swatch" style="border: 2px solid ${tpl.color}; background: ${fillRgba};">
                  ${tpl.showMiddleLine ? `<div style="position:absolute; top:50%; left:0; right:0; height:1px; background:${tpl.middleLineColor || tpl.color}; transform:translateY(-50%);"></div>` : ''}
                </div>
                <div class="vest-template-name">${escapeHtml(tpl.name)}</div>
                ${flagsHtml}
                ${isDefault ? '<span class="vest-template-badge" title="Default Template">★</span>' : ''}
                ${hotkeyNum ? `<span class="vest-template-badge">${hotkeyNum}</span>` : ''}
                <button class="vest-tpl-edit-btn" data-id="${tpl.id}" title="Edit template">✎</button>
                <button class="vest-tpl-delete-btn" data-id="${tpl.id}" title="Delete template">×</button>
              </div>
            `;
          }).join('')}
        </div>

        <div class="vest-bar-footer">
          <div style="display:flex; align-items:center; gap:4px; width:100%; margin-bottom:4px;">
            <button class="vest-btn-action" id="vest-tool-box-btn" title="Select Rectangle / Box Tool directly" style="flex:1; justify-content:center; background:rgba(34,197,94,0.12); border-color:rgba(34,197,94,0.3); color:#4ade80;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px;">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
              <span>Draw Box</span>
            </button>
            <button class="vest-btn-action ${settings.sidebarState && settings.sidebarState.magnet ? 'active' : ''}" id="vest-tool-magnet-btn" title="Toggle Magnet Mode" style="justify-content:center;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;">
                <path d="M4 4v7a8 8 0 0 0 16 0V4"></path>
                <line x1="4" y1="8" x2="8" y2="8"></line>
                <line x1="16" y1="8" x2="20" y2="8"></line>
              </svg>
              <span>🧲</span>
            </button>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:4px;">
            <div class="vest-override-wrapper" style="position:relative; flex:1;">
              <button class="vest-btn-action" id="vest-override-btn" title="Override an existing template by selecting its name" style="width:100%; justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>Override...</span>
              </button>
              <div class="vest-override-menu" id="vest-override-menu" style="display:none;">
                <div class="vest-override-header">Select template to override:</div>
                ${templates.map(t => `
                  <div class="vest-override-item" data-id="${t.id}">
                    <span class="vest-override-swatch" style="background:${t.color};"></span>
                    <span class="vest-override-name">${escapeHtml(t.name)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            <button class="vest-btn-action" id="vest-save-box-btn" title="Save current box as a new template" style="flex:1; justify-content:center;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>+ New</span>
            </button>
          </div>
        </div>
      </div>
    `;

    attachBarEvents();
  }

  function attachBarEvents() {
    if (!barRoot) return;

    // Drag handle
    const handle = barRoot.querySelector('#vest-bar-drag-handle');
    if (handle) {
      handle.addEventListener('mousedown', onDragStart);
    }

    // Logger toggle
    const barLoggerBtn = barRoot.querySelector('#vest-bar-logger-btn');
    if (barLoggerBtn) {
      barLoggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleActionLogBox();
      });
    }

    // Collapse toggle
    const collapseBtn = barRoot.querySelector('#vest-collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        renderFloatingBar();
      });
    }

    // Draw Box button
    const drawBoxBtn = barRoot.querySelector('#vest-tool-box-btn');
    if (drawBoxBtn) {
      drawBoxBtn.addEventListener('click', () => {
        postToMainWorlds({
          type: 'VEST_TV_ACTIVATE_TOOL',
          payload: { tool: 'rectangle' }
        });
        showToast('Rectangle tool activated');
      });
    }

    // Magnet Toggle button
    const magnetBtn = barRoot.querySelector('#vest-tool-magnet-btn');
    if (magnetBtn) {
      magnetBtn.addEventListener('click', () => {
        const nextState = !Boolean(settings.sidebarState && settings.sidebarState.magnet);
        postToMainWorlds({
          type: 'VEST_TV_ACTIVATE_TOOL',
          payload: { tool: 'magnet', desiredState: nextState }
        });
        if (!settings.sidebarState) settings.sidebarState = {};
        settings.sidebarState.magnet = nextState;
        safeStorageSet({ settings });
        showToast(`Magnet: ${nextState ? 'ON' : 'OFF'}`);
        renderFloatingBar();
      });
    }

    // Template clicks (apply + activate rectangle tool ready to draw)
    const items = barRoot.querySelectorAll('.vest-template-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.vest-tpl-delete-btn') || e.target.closest('.vest-tpl-edit-btn')) return;
        const id = item.dataset.id;
        applyTemplateById(id, true);
      });
    });

    // Edit template buttons (Pencil)
    const editBtns = barRoot.querySelectorAll('.vest-tpl-edit-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openTemplateEditorModal(id);
      });
    });

    // Delete template buttons (X)
    const delBtns = barRoot.querySelectorAll('.vest-tpl-delete-btn');
    delBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const tpl = templates.find(t => t.id === id);
        if (templates.length <= 1) {
          showToast('Cannot delete last template');
          return;
        }
        if (confirm(`Delete template "${tpl?.name || ''}"?`)) {
          deleteTemplateById(id);
        }
      });
    });

    // Save as new template button
    const saveBtn = barRoot.querySelector('#vest-save-box-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = prompt('Enter a name for this box template:', 'Custom Box');
        if (name && name.trim()) {
          postToMainWorlds({
            type: 'VEST_TV_SAVE_SELECTION_AS_TEMPLATE',
            payload: { name: name.trim() }
          });
        }
      });
    }

    // Override button and popover menu
    const overrideBtn = barRoot.querySelector('#vest-override-btn');
    const overrideMenu = barRoot.querySelector('#vest-override-menu');
    if (overrideBtn && overrideMenu) {
      overrideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShown = overrideMenu.style.display === 'block';
        overrideMenu.style.display = isShown ? 'none' : 'block';
      });

      document.addEventListener('click', () => {
        if (overrideMenu) overrideMenu.style.display = 'none';
      });

      const overrideItems = overrideMenu.querySelectorAll('.vest-override-item');
      overrideItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = item.dataset.id;
          overrideMenu.style.display = 'none';
          const tpl = templates.find(t => t.id === targetId);
          if (confirm(`Override template "${tpl?.name}" with current box settings (colors, center line, rays)?`)) {
            postToMainWorlds({
              type: 'VEST_TV_OVERRIDE_TEMPLATE',
              payload: { templateId: targetId }
            });
          }
        });
      });
    }
  }

  async function deleteTemplateById(id) {
    if (templates.length <= 1) return;
    const tpl = templates.find(t => t.id === id);
    const name = tpl ? tpl.name : 'Template';
    templates = templates.filter(t => t.id !== id);
    if (settings.activeTemplateId === id) {
      settings.activeTemplateId = templates[0].id;
    }
    if (settings.defaultTemplateId === id) {
      settings.defaultTemplateId = templates[0].id;
    }
    safeStorageSet({ templates, settings });
    notifyMainWorldConfig();
    showToast(`Deleted "${name}"`);
    renderFloatingBar();
  }

  function applyTemplateById(templateId, activateTool = false) {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;

    settings.activeTemplateId = tpl.id;
    queueSettingsSave({ activeTemplateId: tpl.id });

    postToMainWorlds({
      type: 'VEST_TV_APPLY_TEMPLATE',
      payload: { templateId: tpl.id, activateTool }
    });

    showToast(`Template: ${tpl.name}`);
    renderFloatingBar();
  }

  // -------------------------------------------------------------
  // Drag and Drop Logic
  // -------------------------------------------------------------
  function onDragStart(e) {
    if (e.target.closest('button')) return;
    isDragging = true;
    const rect = barRoot.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging || !barRoot) return;
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    const maxX = window.innerWidth - barRoot.offsetWidth - 10;
    const maxY = window.innerHeight - barRoot.offsetHeight - 10;

    newX = Math.max(10, Math.min(maxX, newX));
    newY = Math.max(10, Math.min(maxY, newY));

    barRoot.style.left = `${newX}px`;
    barRoot.style.top = `${newY}px`;
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);

    if (barRoot) {
      const rect = barRoot.getBoundingClientRect();
      settings.floatingBarPosition = {
        top: Math.round(rect.top),
        left: Math.round(rect.left)
      };
      safeStorageSet({ settings });
    }
  }

  // -------------------------------------------------------------
  // Vest Trading Window Panel Manager (Collapse, Float & Move)
  // -------------------------------------------------------------
  let panelObserver = null;
  let activePanelDrag = null;
  let minimizedDockEl = null;

  const PANEL_DEFINITIONS = [
    {
      key: 'order_ticket',
      title: 'Order Ticket',
      match: (el) => {
        if (!el || el.nodeType !== 1) return false;
        // Right side order entry panel (Market / Limit / Scale, Buy/Long, Sell/Short)
        const text = el.textContent || '';
        return (
          el.querySelector('button[class*="buy"], button[class*="Buy"]') ||
          (text.includes('Trading Power') && text.includes('Leverage') && text.includes('Market'))
        );
      }
    },
    {
      key: 'account_health',
      title: 'Account Health',
      match: (el) => {
        if (!el || el.nodeType !== 1) return false;
        const text = el.textContent || '';
        return text.includes('Account Health') && text.includes('Account Value');
      }
    },
    {
      key: 'order_book',
      title: 'Order Book',
      match: (el) => {
        if (!el || el.nodeType !== 1) return false;
        const text = el.textContent || '';
        return (
          (text.includes('Book') || text.includes('Order Book') || text.includes('Spread')) &&
          text.includes('Size') &&
          text.includes('Total')
        );
      }
    },
    {
      key: 'trades',
      title: 'Recent Trades',
      match: (el) => {
        if (!el || el.nodeType !== 1) return false;
        const text = el.textContent || '';
        return (
          text.includes('Trades') &&
          text.includes('Price') &&
          text.includes('Time') &&
          !text.includes('Order Book')
        );
      }
    }
  ];

  let scanDebounceTimer = null;
  let isScanningPanels = false;

  function scheduleScanPanels(immediate = false) {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    if (immediate) {
      scanAndEnhancePanels();
    } else {
      scanDebounceTimer = setTimeout(() => {
        scanDebounceTimer = null;
        scanAndEnhancePanels();
      }, 500);
    }
  }

  let studioPillHeartbeat = null;
  let studioPillEl = null;
  const CORTEX_TOP_BAR_ID = 'vest-cortex-top-bar';
  const CORTEX_BAR_HEIGHT = 44;
  const CORTEX_BAR_MARGIN_BOTTOM = 8;
  let lastAdjustedContentEl = null;

  function getMainHeaderElement() {
    // 1. Direct semantic header or nav elements
    const semanticHeaders = Array.from(document.querySelectorAll('header, nav, [role="banner"], [role="navigation"]')).filter(el => {
      if (el.id === CORTEX_TOP_BAR_ID || el.id.startsWith('vest-') || el.closest('#' + CORTEX_TOP_BAR_ID)) return false;
      const r = el.getBoundingClientRect();
      return r.top >= -5 && r.top <= 5 && r.width >= window.innerWidth * 0.5 && r.height >= 26 && r.height <= 95;
    });
    if (semanticHeaders.length > 0) return semanticHeaders[0];

    // 2. High-level elements at top containing primary navigation keywords
    const topDivs = Array.from(document.querySelectorAll('body > div, body > div > div, body > div > header, body > header, #__next > header, #__next > div > header, #root > header')).filter(el => {
      if (el.id === CORTEX_TOP_BAR_ID || el.id.startsWith('vest-') || el.closest('#' + CORTEX_TOP_BAR_ID)) return false;
      const r = el.getBoundingClientRect();
      if (r.top > 5 || r.top < -5 || r.width < window.innerWidth * 0.5 || r.height < 26 || r.height > 95) return false;
      const txt = el.textContent || '';
      return (txt.includes('Trade') && (txt.includes('Markets') || txt.includes('Dashboard') || txt.includes('Competitions') || txt.includes('Portfolio'))) || txt.includes('My Funded') || txt.includes('Kalshi') || (txt.includes('MARKETS') && (txt.includes('PERPETUALS') || txt.includes('PORTFOLIO')));
    });
    if (topDivs.length > 0) return topDivs[0];

    return null;
  }

  function getMainHeaderBottom() {
    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    if (activeFirm && activeFirm.topBarMode === 'custom' && activeFirm.customTopBarOffsetPx > 0) {
      return Math.round(activeFirm.customTopBarOffsetPx);
    }
    const header = getMainHeaderElement();
    if (header) {
      const r = header.getBoundingClientRect();
      if (r.bottom >= 26 && r.bottom <= 100) {
        return Math.round(r.bottom);
      }
    }
    const market = typeof findMarketSelectorElement === 'function' ? findMarketSelectorElement() : null;
    if (market && market.rowEl) {
      const mr = market.rowEl.getBoundingClientRect();
      if (mr.top >= 26 && mr.top <= 100) {
        return Math.round(mr.top);
      }
    }
    return 48;
  }

  function adjustLayoutForTopBar(headerBottom, barHeight, barMarginBottom = CORTEX_BAR_MARGIN_BOTTOM) {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) return;

    if (root.classList.contains('vest-cortex-bottom-bar-active')) {
      root.classList.remove('vest-cortex-bottom-bar-active');
    }
    if (body.classList.contains('vest-cortex-bottom-bar-active')) {
      body.classList.remove('vest-cortex-bottom-bar-active');
    }
    root.classList.add('vest-cortex-top-bar-active');
    body.classList.add('vest-cortex-top-bar-active');

    const candidates = Array.from(body.children).filter(el => {
      if (el.id === CORTEX_TOP_BAR_ID || el.id.startsWith('vest-')) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.position !== 'fixed' && style.position !== 'absolute' &&
        rect.top <= 5 && rect.width >= window.innerWidth * 0.7;
    });
    const appRoot = candidates.sort((a, b) =>
      (b.getBoundingClientRect().width * b.getBoundingClientRect().height) -
      (a.getBoundingClientRect().width * a.getBoundingClientRect().height)
    )[0];

    if (appRoot && appRoot.style.maxHeight && appRoot.style.maxHeight.includes('calc(100vh - 50px)')) {
      appRoot.style.removeProperty('max-height');
      appRoot.style.removeProperty('overflow-y');
    }

    const header = getMainHeaderElement();
    if (header) {
      const hStyle = window.getComputedStyle(header);
      if (hStyle.position === 'static') {
        header.style.setProperty('position', 'relative', 'important');
      }
      if (hStyle.zIndex === 'auto' || Number(hStyle.zIndex) < 1001) {
        header.style.setProperty('z-index', '1005', 'important');
      }
    }

    let contentEl = null;
    if (header && header.nextElementSibling && header.nextElementSibling.id !== CORTEX_TOP_BAR_ID) {
      contentEl = header.nextElementSibling;
    } else {
      const market = typeof findMarketSelectorElement === 'function' ? findMarketSelectorElement() : null;
      if (market && market.rowEl) {
        let curr = market.rowEl;
        while (
          curr &&
          curr.parentElement &&
          curr.parentElement !== document.body &&
          curr.parentElement.id !== '__next' &&
          curr.parentElement.id !== 'root'
        ) {
          if (header && curr.parentElement.contains(header) && curr.parentElement.children.length > 1) {
            break;
          }
          curr = curr.parentElement;
        }
        contentEl = curr;
      }
    }

    const totalTopOffset = (barHeight || CORTEX_BAR_HEIGHT) + (typeof barMarginBottom === 'number' ? barMarginBottom : CORTEX_BAR_MARGIN_BOTTOM);

    if (contentEl && contentEl !== header) {
      if (lastAdjustedContentEl && lastAdjustedContentEl !== contentEl) {
        lastAdjustedContentEl.style.removeProperty('margin-top');
        lastAdjustedContentEl.style.removeProperty('max-height');
      }
      lastAdjustedContentEl = contentEl;
      contentEl.style.setProperty('margin-top', `${totalTopOffset}px`, 'important');
      contentEl.style.setProperty('box-sizing', 'border-box', 'important');
      if (contentEl.offsetHeight > 200 || (header && contentEl === header.nextElementSibling)) {
        contentEl.style.setProperty('max-height', `calc(100vh - ${headerBottom + totalTopOffset}px)`, 'important');
      }
    }
  }

  function ensureCortexTopBar() {
    if (!document.body) return null;
    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    if (activeFirm && !activeFirm.enabled) {
      const existingBar = document.getElementById(CORTEX_TOP_BAR_ID);
      if (existingBar) existingBar.remove();
      document.body.classList.remove('vest-cortex-top-bar-active');
      return null;
    }
    const headerBottom = getMainHeaderBottom();
    const barMargin = (activeFirm && typeof activeFirm.barMarginBottom === 'number') ? activeFirm.barMarginBottom : CORTEX_BAR_MARGIN_BOTTOM;
    adjustLayoutForTopBar(headerBottom, CORTEX_BAR_HEIGHT, barMargin);

    let bar = document.getElementById(CORTEX_TOP_BAR_ID);
    if (!bar) {
      bar = document.createElement('div');
      bar.id = CORTEX_TOP_BAR_ID;
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Trading Cortex toolbar');
    }
    if (bar.parentElement !== document.body) {
      document.body.appendChild(bar);
    }
    bar.style.top = `${headerBottom}px`;
    bar.style.height = `${CORTEX_BAR_HEIGHT}px`;
    return bar;
  }

  function initPanelManager() {
    if (!isTopWindow) return;

    ensureCortexTopBar();
    renderStudioHeaderPill();
    if (settings.enablePanelManagement !== false) {
      scheduleScanPanels(true);
    }

    if (!studioPillHeartbeat) {
      studioPillHeartbeat = setInterval(() => {
        if (!isExtensionValid()) {
          clearInterval(studioPillHeartbeat);
          studioPillHeartbeat = null;
          return;
        }
        ensureCortexTopBar();
        ensureBottomPositionsPanelManager();
        if (!studioPillEl || !studioPillEl.isConnected) {
          renderStudioHeaderPill();
        } else {
          dockStudioPillNextToMarketSelector(studioPillEl);
        }
        if (settings.newsBox && settings.newsBox.enabled) {
          if (!chartNewsBoxEl || !chartNewsBoxEl.isConnected) {
            renderChartNewsBox();
          } else {
            clampAndPositionChartNewsBox();
          }
        }
        if (settings.tradesBox && settings.tradesBox.enabled) {
          if (!chartTradesBoxEl || !chartTradesBoxEl.isConnected) {
            renderChartTradesBox();
          } else {
            clampAndPositionChartTradesBox();
          }
        }
        if (settings.diagnosticsBox && settings.diagnosticsBox.enabled) {
          if (!chartDiagnosticsBoxEl || !chartDiagnosticsBoxEl.isConnected) {
            renderChartDiagnosticsBox();
          } else {
            clampAndPositionChartDiagnosticsBox();
          }
        }
        /* [HEARTBEAT_CLEANUP_BLOCK]
        if (!studioPillEl || !studioPillEl.isConnected) {
          renderStudioHeaderPill();
        } else {
          dockStudioPillNextToMarketSelector(studioPillEl);
        }
        if (settings.newsBox && settings.newsBox.enabled) {
          if (!chartNewsBoxEl || !chartNewsBoxEl.isConnected) {
            renderChartNewsBox();
          } else {
            clampAndPositionChartNewsBox();
          }
        }
        if (settings.tradesBox && settings.tradesBox.enabled) { // resize-trades
          if (!chartTradesBoxEl || !chartTradesBoxEl.isConnected) {
            renderChartTradesBox();
          } else {
            clampAndPositionChartTradesBox();
      }
      if (settings.diagnosticsBox && settings.diagnosticsBox.enabled) {
        clampAndPositionChartDiagnosticsBox();
          }
        }
        if (settings.diagnosticsBox && settings.diagnosticsBox.enabled) {
          if (!chartDiagnosticsBoxEl || !chartDiagnosticsBoxEl.isConnected) {
            renderChartDiagnosticsBox();
          } else {
            clampAndPositionChartDiagnosticsBox();
          }
          }
        }
        */
      }, 900);
    }

    if (!panelObserver) {
      panelObserver = new MutationObserver((mutations) => {
        let isRelevant = false;
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (m.target && m.target.nodeType === 1) {
            const targetEl = m.target;
            if (
              targetEl.id === 'vest-minimized-dock' ||
              targetEl.id === 'vest-studio-header-pill' ||
              targetEl.id === 'vest-panel-toggle-pill' ||
              targetEl.id === 'vest-template-bar-root' ||
              targetEl.id === 'vest-action-log-box' ||
              targetEl.id === 'vest-chart-news-box' ||
              targetEl.id === 'vest-chart-trades-box' ||
              targetEl.id === 'vest-chart-diagnostics-box' ||
              targetEl.classList.contains('vest-panel-header-bar') ||
              targetEl.classList.contains('vest-minimized-chip') ||
              targetEl.closest('#vest-minimized-dock') ||
              targetEl.closest('#vest-studio-header-pill') ||
              targetEl.closest('#vest-panel-toggle-pill') ||
              targetEl.closest('#vest-template-bar-root') ||
              targetEl.closest('#vest-action-log-box') ||
              targetEl.closest('#vest-chart-news-box') ||
              targetEl.closest('#vest-chart-trades-box') ||
              targetEl.closest('#vest-chart-diagnostics-box') ||
              targetEl.closest('.vest-panel-header-bar')
            ) {
              continue;
            }
          }
          if (m.addedNodes && m.addedNodes.length > 0) {
            isRelevant = true;
            break;
          }
        }

        if (isRelevant) {
          dockStudioPillNextToMarketSelector(studioPillEl);
          if (settings.enablePanelManagement !== false) {
            scheduleScanPanels();
          }
        }
      });

      try {
        panelObserver.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    }

    document.addEventListener('mousemove', onPanelDragMove);
    document.addEventListener('mouseup', onPanelDragEnd);
  }

  /**
   * Finds the market selector dropdown pill (e.g. "★ SOL Solana 5x ⌄") in the top market bar
   * so we can place our Vest Studio dropdown pill directly to its left.
   */
  function findMarketSelectorElement() {
    // 1. Direct detection of the instrument selector pill in the top-left market bar
    //    (e.g., contains leverage badge like "5x", "10x", "20x", "50x", pair format like "HYPE-USD", or star/chevron SVGs at top: 36..135, left: 10..260)
    const allInteractive = document.querySelectorAll('button, div[role="button"], a, div');
    for (let i = 0; i < allInteractive.length; i++) {
      const el = allInteractive[i];
      if (el.id === 'vest-studio-header-pill' || el.closest('#vest-studio-header-pill')) continue;
      const r = el.getBoundingClientRect();
      if (r.top >= 36 && r.top <= 135 && r.left >= 10 && r.left <= 260 && r.width >= 60 && r.width <= 320 && r.height >= 24 && r.height <= 56) {
        const txt = (el.textContent || '').trim();
        const hasLeverage = /\b\d+(\.\d+)?x\b/i.test(txt);
        const hasPairFormat = /\b[A-Z0-9]{2,10}(?:-[A-Z0-9]{2,10}|_PERP|\/USD|\s*PERP)\b/i.test(txt);
        const hasSvg = el.querySelectorAll('svg').length >= 1;
        if ((hasLeverage || hasPairFormat) && el.parentElement && el.parentElement !== document.body) {
          // Walk up if parent is just a tight single-child wrapper around the button
          let targetPill = el;
          while (
            targetPill.parentElement &&
            targetPill.parentElement !== document.body &&
            targetPill.parentElement.children.length === 1
          ) {
            const pr = targetPill.parentElement.getBoundingClientRect();
            if (pr.width <= 340 && pr.height <= 64) {
              targetPill = targetPill.parentElement;
            } else {
              break;
            }
          }
          if (targetPill.parentElement && targetPill.parentElement !== document.body) {
            return { marketPillEl: targetPill, rowEl: targetPill.parentElement };
          }
        }
      }
    }

    // 2. Locate the "Mid Price", "Index Price", "Mark / Mid", "Open Interest", or "24h Change" stat label in the top market header
    const allEls = document.querySelectorAll('span, div, p, button');
    let midPriceEl = null;
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      if (el.children.length > 2) continue;
      const txt = (el.textContent || '').trim();
      if (
        txt === 'Mid Price' ||
        txt === 'Index Price' ||
        txt === '24h Change' ||
        txt === 'Mark / Mid' ||
        txt.includes('Mark / Mid') ||
        txt === 'Open Interest' ||
        txt === '24h Volume'
      ) {
        const r = el.getBoundingClientRect();
        if (r.top >= 25 && r.top <= 145) {
          midPriceEl = el;
          break;
        }
      }
    }

    if (midPriceEl) {
      const midRect = midPriceEl.getBoundingClientRect();
      let curr = midPriceEl.parentElement;
      while (curr && curr !== document.body) {
        const r = curr.getBoundingClientRect();
        if (r.width > 260 && r.height >= 26 && r.height <= 95 && r.top < 140) {
          for (let c = 0; c < curr.children.length; c++) {
            const child = curr.children[c];
            if (child.id === 'vest-studio-header-pill') continue;
            if (child.contains(midPriceEl)) break;
            const cr = child.getBoundingClientRect();
            if (cr.left < midRect.left && cr.width >= 60 && cr.width <= 350 && cr.height >= 24) {
              return { marketPillEl: child, rowEl: curr };
            }
          }
        }
        curr = curr.parentElement;
      }
    }

    return null;
  }

  let cachedMarketRowEl = null;
  let cachedMarketPillEl = null;

  function dockStudioPillNextToMarketSelector(pillArg) {
    const pill = pillArg || studioPillEl || document.getElementById('vest-studio-header-pill');
    if (!pill) return false;
    const bar = ensureCortexTopBar();
    if (!bar) return false;
    pill.classList.remove('vest-studio-pill-floating-fallback');
    if (pill.parentElement !== bar) bar.appendChild(pill);
    return true;
  }

  let studioMenuOpen = false;
  let studioDropdownEl = null;
  let isUpdateAvailable = false;
  let latestAvailableVersion = null;
  let latestUpdateChannel = 'stable';
  let isCheckingForUpdate = false;
  let updateNotificationToastShown = false;

  function cleanSemver(v) {
    return String(v || '').trim().replace(/^v/i, '');
  }

  function compareSemver(a, b) {
    const pa = cleanSemver(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = cleanSemver(b).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  async function triggerQuickUpdateCheck() {
    if (isCheckingForUpdate) return;
    isCheckingForUpdate = true;

    try {
      const installedVer = getSafeExtVersion();
      let state = null;

      // 1. Try background service worker check first
      if (isExtensionValid() && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        try {
          const resp = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'checkForUpdatesNow' }, (res) => {
              if (chrome.runtime.lastError) {
                resolve(null);
              } else {
                resolve(res);
              }
            });
          });
          if (resp && resp.updaterState) {
            state = resp.updaterState;
          }
        } catch (e) {}
      }

      // 2. Direct fallback fetch to GitHub in case service worker was asleep or unreachable
      if (!state) {
        let channelPref = 'stable';
        let installedDevSha = null;
        if (isExtensionValid() && chrome.storage && chrome.storage.local) {
          try {
            const stored = await chrome.storage.local.get(['updateChannel', 'installedDevSha', 'settings']);
            channelPref = stored.updateChannel || (stored.settings && stored.settings.updateChannel) || (/alpha/i.test(installedVer) ? 'dev' : 'stable');
            if (stored.installedDevSha) installedDevSha = stored.installedDevSha;
          } catch (e) {}
        }

        if (channelPref === 'dev') {
          const res = await fetch('https://api.github.com/repos/childersc/trading-cortex/commits?sha=dev&per_page=1', {
            headers: { Accept: 'application/vnd.github+json' },
            cache: 'no-store'
          });
          if (res.ok) {
            const commits = await res.json();
            const latestCommit = Array.isArray(commits) && commits.length > 0 ? commits[0] : null;
            if (latestCommit && latestCommit.sha) {
              const latestSha = latestCommit.sha;
              const shortSha = latestSha.slice(0, 7);
              const isDifferent = installedDevSha ? (latestSha.toLowerCase() !== installedDevSha.toLowerCase() && shortSha.toLowerCase() !== installedDevSha.toLowerCase()) : true;
              const upcomingDevVer = getUpcomingDevVersion(installedVer);
              state = {
                channel: 'dev',
                latestVersion: upcomingDevVer,
                latestSha: shortSha,
                latestCommitSha: latestSha,
                updateAvailable: isDifferent
              };
              if (isExtensionValid() && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ updaterState: state, updateChannel: 'dev' }).catch(() => {});
              }
            }
          }
        } else {
          const res = await fetch('https://api.github.com/repos/childersc/trading-cortex/releases/latest', {
            headers: { Accept: 'application/vnd.github+json' },
            cache: 'no-store'
          });
          if (res.ok) {
            const release = await res.json();
            const latestVer = cleanSemver(release.tag_name || release.name || installedVer);
            state = {
              channel: 'stable',
              latestVersion: latestVer,
              updateAvailable: compareSemver(latestVer, installedVer) > 0
            };
            if (isExtensionValid() && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ updaterState: state, updateChannel: 'stable' }).catch(() => {});
            }
          }
        }
      }

      if (state) {
        const wasAvailable = isUpdateAvailable;
        const prevVer = latestAvailableVersion;
        const prevChan = latestUpdateChannel;
        const isDev = state.channel === 'dev';
        isUpdateAvailable = Boolean(state.updateAvailable);
        latestAvailableVersion = state.latestVersion || null;
        latestUpdateChannel = state.channel || 'stable';
        if (wasAvailable !== isUpdateAvailable || prevVer !== latestAvailableVersion || prevChan !== latestUpdateChannel) {
          renderStudioHeaderPill();
        }
        if (isUpdateAvailable && !updateNotificationToastShown) {
          updateNotificationToastShown = true;
          const verLabel = isDev
            ? (latestAvailableVersion || 'New build')
            : `v${cleanSemver(latestAvailableVersion || 'latest')}`;
          showToast(
            `⚡ Trading Cortex ${isDev ? 'Dev build' : 'update'} ready (${verLabel})! Click CORTEX in top bar to deploy.`,
            4500,
            isDev
          );
        }
      }
    } catch (e) {
      // Ignore network errors silently
    } finally {
      isCheckingForUpdate = false;
    }
  }

  function updateStudioDropdownPosition(pill) {
    const targetPill = pill || studioPillEl || document.getElementById('vest-studio-header-pill');
    const menuEl = studioDropdownEl || document.getElementById('vest-studio-dropdown-menu');
    if (!targetPill || !menuEl) return;
    const triggerBtn = targetPill.querySelector('#vest-studio-pill-btn');
    if (!triggerBtn) return;
    const rect = triggerBtn.getBoundingClientRect();
    menuEl.style.position = 'fixed';
    const menuHeight = menuEl.offsetHeight || 440;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const opensAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const top = opensAbove
      ? Math.max(8, rect.top - menuHeight - 6)
      : rect.bottom + 6;
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - menuEl.offsetWidth - 8));
    menuEl.style.top = `${Math.round(top)}px`;
    menuEl.style.left = `${Math.round(left)}px`;
    menuEl.style.zIndex = '2147483647';
  }

  function renderStudioHeaderPill() {
    if (!isExtensionValid()) return;
    try {
      // Remove old bottom-left pill if present
      const oldBottomPill = document.getElementById('vest-panel-toggle-pill');
      if (oldBottomPill) oldBottomPill.remove();

    let pill = document.getElementById('vest-studio-header-pill') || studioPillEl;
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'vest-studio-header-pill';
    }
    studioPillEl = pill;

    const extVersion = getSafeExtVersion();
    const isDev = latestUpdateChannel === 'dev' || /alpha/i.test(extVersion);
    const cleanVer = cleanSemver(extVersion);
    const subText = isUpdateAvailable
      ? (isDev ? 'Dev ready' : 'Update ready')
      : `v${cleanVer}`;
    const pillTitle = isUpdateAvailable
      ? `Trading Cortex · ${isDev ? 'Dev build' : 'Update'} ready (${latestAvailableVersion || 'new'})`
      : `Trading Cortex v${cleanVer} · ${isDev ? 'Bleeding Edge (Dev)' : 'Production'}`;

    const updateClass = isUpdateAvailable ? (isDev ? 'dev-update-ready' : 'update-ready') : '';
    const updateTextClass = isUpdateAvailable ? (isDev ? 'dev-update-ready-text' : 'update-ready-text') : '';
    const channelClass = isDev ? 'dev-channel' : 'prod-channel';

    pill.innerHTML = `
      <button type="button" class="vest-studio-pill-trigger ${channelClass} ${studioMenuOpen ? 'open' : ''} ${updateClass}" id="vest-studio-pill-btn" title="${pillTitle}">
        <div class="vest-studio-pill-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <div class="vest-studio-pill-text">
          <div class="vest-studio-pill-title-row">
            <span class="vest-studio-pill-title">CORTEX</span>
          </div>
          <span class="vest-studio-pill-sub ${updateTextClass}">${subText}</span>
        </div>
        <svg class="vest-studio-pill-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    `;

    // Mount the dropdown menu directly on document.body so it is NEVER trapped in the header bar's stacking context
    let menuEl = document.getElementById('vest-studio-dropdown-menu') || studioDropdownEl;
    if (!menuEl) {
      menuEl = document.createElement('div');
      menuEl.id = 'vest-studio-dropdown-menu';
      menuEl.className = 'vest-studio-dropdown-menu';
    }
    if (menuEl.parentElement !== document.body) {
      document.body.appendChild(menuEl);
    }
    studioDropdownEl = menuEl;

    const channelHeaderHtml = `
      <div class="vest-sdm-channel-header ${isDev ? 'dev' : 'prod'}">
        <div class="vest-sdm-channel-top">
          <div class="vest-sdm-channel-left">
            <span class="vest-sdm-channel-dot"></span>
            <span class="vest-sdm-channel-name">${isDev ? 'Bleeding Edge' : 'Production'}</span>
          </div>
          <span class="vest-sdm-channel-badge">${isDev ? 'DEV' : 'RELEASE'}</span>
        </div>
        <div class="vest-sdm-channel-version">v${cleanVer}</div>
      </div>
    `;

    const updateItemHtml = isUpdateAvailable
      ? (isDev
        ? `
        <div class="vest-sdm-menu-item" id="vest-sdm-open-updater-btn" style="padding: 8px 10px; margin-bottom: 6px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.14)); border: 1px solid rgba(251, 191, 36, 0.55); box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:#fbbf24;">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
            <span style="font-weight:700; color:#fde68a;">Dev Update Ready (${latestAvailableVersion ? escapeHtml(latestAvailableVersion) : 'Open Updater'})</span>
          </div>
          <span class="vest-sdm-hotkey" style="color:#fbbf24; border-color:rgba(251,191,36,0.4);">↗</span>
        </div>
      `
        : `
        <div class="vest-sdm-menu-item" id="vest-sdm-open-updater-btn" style="padding: 8px 10px; margin-bottom: 6px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.14)); border: 1px solid rgba(52, 211, 153, 0.55); box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:#34d399;">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
            <span style="font-weight:700; color:#6ee7b7;">Update Ready (${latestAvailableVersion ? `v${escapeHtml(latestAvailableVersion)}` : 'Open Updater'})</span>
          </div>
          <span class="vest-sdm-hotkey" style="color:#34d399; border-color:rgba(52,211,153,0.4);">↗</span>
        </div>
      `)
      : '';

    menuEl.style.display = studioMenuOpen ? 'flex' : 'none';
    menuEl.innerHTML = `
      <!-- Channel & Version Title Bar -->
      ${channelHeaderHtml}

      <!-- Settings & Update Entry -->
      <div class="vest-sdm-section" style="gap: 6px;">
        ${updateItemHtml}
        <div class="vest-sdm-menu-item" id="vest-sdm-open-templates-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#38bdf8;">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Template Manager...</span>
          </div>
          <span class="vest-sdm-hotkey">${templates.length}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-sessions-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#26a69a;">
              <rect x="3" y="4" width="18" height="16" rx="2"></rect>
              <line x1="8" y1="4" x2="8" y2="20"></line>
              <line x1="16" y1="4" x2="16" y2="20"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Session Indicators...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.sessionIndicators && settings.sessionIndicators.enabled ? 'on' : ''}">${settings.sessionIndicators && settings.sessionIndicators.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-rangedetector-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#3b82f6;">
              <rect x="3" y="6" width="18" height="12" rx="2"></rect>
              <line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"></line>
              <polyline points="7 10 9 8 11 10"></polyline>
              <polyline points="13 14 15 16 17 14"></polyline>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Range Detector...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.rangeDetector && settings.rangeDetector.enabled ? 'on' : ''}">${settings.rangeDetector && settings.rangeDetector.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-autofvg-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#a855f7;">
              <rect x="3" y="7" width="18" height="10" rx="2"></rect>
              <line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="3 2"></line>
              <line x1="6" y1="3" x2="6" y2="7"></line>
              <line x1="18" y1="17" x2="18" y2="21"></line>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Auto FVG's...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.autoFvg && settings.autoFvg.enabled ? 'on' : ''}">${settings.autoFvg && settings.autoFvg.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-news-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f23645;">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Economic News Box...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.newsBox && settings.newsBox.enabled ? 'on' : ''}">${settings.newsBox && settings.newsBox.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-trades-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#10b981;">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Instrument Trades Box...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.tradesBox && settings.tradesBox.enabled ? 'on' : ''}">${settings.tradesBox && settings.tradesBox.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-accountsrisk-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#38bdf8;">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Accounts &amp; Risk Box...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.accountsRiskBox && settings.accountsRiskBox.enabled ? 'on' : ''}">${settings.accountsRiskBox && settings.accountsRiskBox.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-marketstructure-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#06b6d4;">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Market Structure (BOS/CHoCH)...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.marketStructure && settings.marketStructure.enabled ? 'on' : ''}">${settings.marketStructure && settings.marketStructure.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-orderblocks-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#10b981;">
              <rect x="3" y="5" width="8" height="6" rx="1"></rect>
              <rect x="13" y="13" width="8" height="6" rx="1"></rect>
              <polyline points="7 14 11 10 17 10"></polyline>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Order Blocks (Smart Risk)...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.orderBlocks && settings.orderBlocks.enabled ? 'on' : ''}">${settings.orderBlocks && settings.orderBlocks.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-candleohlc-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f59e0b;">
              <line x1="9" y1="2" x2="9" y2="6"></line>
              <rect x="6" y="6" width="6" height="11" rx="1"></rect>
              <line x1="9" y1="17" x2="9" y2="22"></line>
              <line x1="17" y1="4" x2="17" y2="9"></line>
              <rect x="14" y="9" width="6" height="8" rx="1"></rect>
              <line x1="17" y1="17" x2="17" y2="21"></line>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Candle OHLC Values...</span>
          </div>
          <span class="vest-sdm-badge-pill ${(settings.candleOhlc && (settings.candleOhlc.enabled || settings.candleOhlc.showCandleNumbers || settings.candleOhlc.clickCandleToToggle !== false)) ? 'on' : ''}">${settings.candleOhlc && settings.candleOhlc.enabled ? 'ALL ON' : (settings.candleOhlc && settings.candleOhlc.showCandleNumbers ? 'BAR #s' : (settings.candleOhlc && settings.candleOhlc.clickCandleToToggle !== false ? 'CLICK' : 'OFF'))}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-diagnostics-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#06b6d4;">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Diagnostics &amp; Debug...</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.debugMode ? 'on' : (settings.diagnosticsBox && settings.diagnosticsBox.enabled ? 'on' : '')}">${settings.debugMode ? 'DEBUG ON' : (settings.diagnosticsBox && settings.diagnosticsBox.enabled ? 'ON' : 'OFF')}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-toggle-drawing-toolbar-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#38bdf8;">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Left Drawing Toolbar</span>
          </div>
          <span class="vest-sdm-badge-pill ${latestDrawingToolbarVisible !== false ? 'on' : ''}" id="vest-sdm-drawing-toolbar-badge">${latestDrawingToolbarVisible !== false ? 'VISIBLE' : 'HIDDEN'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-perpfirms-btn">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#06b6d4;">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Perp Firm Settings...</span>
          </div>
          <span class="vest-sdm-badge-pill on">FIRMS</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-toggle-glass-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#38bdf8;">
              <rect x="3" y="3" width="18" height="18" rx="3"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Dialog Glass Effect</span>
          </div>
          <span class="vest-sdm-badge-pill ${settings.dialogGlassEffect ? 'on' : ''}">${settings.dialogGlassEffect ? 'ON' : 'OFF'}</span>
        </div>
        <div class="vest-sdm-menu-item" id="vest-sdm-open-settings-btn" style="padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f8fafc;">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span style="font-weight:600; color:#f8fafc;">Cortex Settings...</span>
          </div>
          <span class="vest-sdm-hotkey">⚙</span>
        </div>
      </div>
    `;

    dockStudioPillNextToMarketSelector(pill);
    if (studioMenuOpen) {
      updateStudioDropdownPosition(pill);
    }
    attachStudioPillEvents(pill, menuEl);
  } catch (e) {}
}

  function attachStudioPillEvents(pill, menuEl) {
    const triggerBtn = pill.querySelector('#vest-studio-pill-btn');

    if (triggerBtn && menuEl) {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        studioMenuOpen = !studioMenuOpen;
        triggerBtn.classList.toggle('open', studioMenuOpen);
        if (studioMenuOpen) {
          if (menuEl.parentElement !== document.body) {
            document.body.appendChild(menuEl);
          }
          updateStudioDropdownPosition(pill);
          menuEl.style.display = 'flex';
          postToMainWorlds({ type: 'VEST_TV_QUERY_DRAWING_TOOLBAR_STATE' });
        } else {
          menuEl.style.display = 'none';
        }
        // Run a quick background update check anytime the Cortex menu is clicked
        triggerQuickUpdateCheck();
      });
    }

    // Prevent clicks inside menu from closing it unless an action explicitly closes it
    if (menuEl) {
      menuEl.onclick = (e) => e.stopPropagation();
    }

    // Update Ready Button -> opens Update Center directly
    menuEl.querySelector('#vest-sdm-open-updater-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      try {
        chrome.runtime.sendMessage({ action: 'openUpdaterPage' });
      } catch (e) {
        window.open(chrome.runtime.getURL('update/update.html'), '_blank');
      }
    });

    // Template Manager Button -> opens Settings-style Template Manager Dialog
    menuEl.querySelector('#vest-sdm-open-templates-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openTemplateManagerModal('all');
    });

    // Session Indicators Button -> opens Settings Dialog directly on Session Indicators tab
    menuEl.querySelector('#vest-sdm-open-sessions-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'sessions');
    });

    // Auto FVG's Button -> opens Settings Dialog directly on Auto FVG's tab
    menuEl.querySelector('#vest-sdm-open-autofvg-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'autofvg');
    });

    // Economic News Box Button -> opens Settings Dialog directly on Economic News Box tab
    menuEl.querySelector('#vest-sdm-open-news-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'news');
    });

    // Instrument Trades Box Button -> opens Settings Dialog directly on Instrument Trades Box tab
    menuEl.querySelector('#vest-sdm-open-trades-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'trades');
    });

    // Order Blocks Button -> opens Settings Dialog directly on Order Blocks
    menuEl.querySelector('#vest-sdm-open-marketstructure-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'marketstructure');
    });

    // Order Blocks Button -> opens Settings Dialog directly on Order Blocks
    menuEl.querySelector('#vest-sdm-open-orderblocks-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'orderblocks');
    });

    // Candle OHLC Values Button -> opens Settings Dialog directly on Candle OHLC tab
    menuEl.querySelector('#vest-sdm-open-candleohlc-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'candleohlc');
    });

    // Diagnostics & Debug Button -> opens Settings Dialog directly on Diagnostics tab
    menuEl.querySelector('#vest-sdm-open-diagnostics-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('diagnostics');
    });

    menuEl.querySelector('#vest-sdm-open-accountsrisk-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('chartingindicators', 'accountsrisk');
    });

    // Left Drawing Toolbar Toggle Button -> sends toggle command to TradingView chart
    menuEl.querySelector('#vest-sdm-toggle-drawing-toolbar-btn')?.addEventListener('click', () => {
      const nextVisible = !latestDrawingToolbarVisible;
      postToMainWorlds({
        type: 'VEST_TV_TOGGLE_DRAWING_TOOLBAR',
        payload: { force: nextVisible }
      });
      showToast(nextVisible ? 'Opening left drawing toolbar...' : 'Hiding left drawing toolbar...');
    });

    // Perp Firm Settings Button -> opens Settings Dialog on Perp Firms tab
    menuEl.querySelector('#vest-sdm-open-perpfirms-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('perpfirms');
    });

    // Dialog Glass Effect Toggle Button -> toggles solid vs frosted glass backdrop on all dialogs
    menuEl.querySelector('#vest-sdm-toggle-glass-btn')?.addEventListener('click', () => {
      settings.dialogGlassEffect = !settings.dialogGlassEffect;
      applyDialogGlassEffect(settings.dialogGlassEffect, settings.dialogGlassOpacity);
      queueSettingsSave({ dialogGlassEffect: settings.dialogGlassEffect });
      safeStorageSet({ settings });
      showToast(
        settings.dialogGlassEffect
          ? 'Dialog Glass Effect enabled (Frosted glass)'
          : 'Dialog Glass Effect disabled (Solid opaque backdrop)',
        2500
      );
      renderStudioHeaderMenu();
    });

    // Top Settings Button -> opens Settings Dialog on About tab
    menuEl.querySelector('#vest-sdm-open-settings-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('about');
    });
  }

  function closeStudioDropdown() {
    if (!studioMenuOpen) return;
    studioMenuOpen = false;
    const pill = studioPillEl || document.getElementById('vest-studio-header-pill');
    const menu = studioDropdownEl || document.getElementById('vest-studio-dropdown-menu');
    if (pill) {
      const trigger = pill.querySelector('#vest-studio-pill-btn');
      if (trigger) trigger.classList.remove('open');
    }
    if (menu) {
      menu.style.display = 'none';
    }
  }

  // Close Studio dropdown when clicking/pressing anywhere outside (including capture phase & chart iframe blur)
  function handleOutsideStudioPointer(e) {
    if (!studioMenuOpen) return;
    const pill = studioPillEl || document.getElementById('vest-studio-header-pill');
    const menu = studioDropdownEl || document.getElementById('vest-studio-dropdown-menu');
    const target = e.target;
    if (!target) return;
    if ((pill && pill.contains(target)) || (menu && menu.contains(target))) {
      return;
    }
    closeStudioDropdown();
  }

  window.addEventListener('pointerdown', handleOutsideStudioPointer, true);
  window.addEventListener('mousedown', handleOutsideStudioPointer, true);
  window.addEventListener('click', handleOutsideStudioPointer, true);
  window.addEventListener('contextmenu', handleOutsideStudioPointer, true);
  window.addEventListener('blur', () => {
    if (studioMenuOpen) closeStudioDropdown();
  });
  window.addEventListener('keydown', (e) => {
    if (studioMenuOpen && e.key === 'Escape') {
      closeStudioDropdown();
    }
  }, true);

  // Friendly labels for TradingView LineTool IDs
  function formatToolDisplayName(toolId) {
    if (!toolId) return 'Default';
    const CLEAN_NAMES = {
      cursor: 'Crosshair',
      dot: 'Dot',
      arrow: 'Arrow',
      eraser: 'Eraser',
      LineToolTrendLine: 'Trend Line',
      LineToolArrow: 'Arrow Line',
      LineToolRay: 'Ray',
      LineToolInfoLine: 'Info Line',
      LineToolExtended: 'Extended Line',
      LineToolTrendAngle: 'Trend Angle',
      LineToolHorzLine: 'Horizontal Line',
      LineToolHorzRay: 'Horizontal Ray',
      LineToolVertLine: 'Vertical Line',
      LineToolCrossLine: 'Cross Line',
      LineToolParallelChannel: 'Parallel Channel',
      LineToolRegressionTrend: 'Regression Trend',
      LineToolFlatBottom: 'Flat Top/Bottom',
      LineToolDisjointAngle: 'Disjoint Channel',
      LineToolPitchfork: 'Pitchfork',
      LineToolSchiffPitchfork2: 'Schiff Pitchfork',
      LineToolSchiffPitchfork: 'Modified Schiff',
      LineToolInsidePitchfork: 'Inside Pitchfork',
      LineToolFibRetracement: 'Fib Retracement',
      LineToolTrendBasedFibExtension: 'Trend-Based Fib Ext',
      LineToolFibChannel: 'Fib Channel',
      LineToolFibTimeZone: 'Fib Time Zone',
      LineToolFibSpeedResistanceFan: 'Fib Speed Fan',
      LineToolTrendBasedFibTime: 'Trend-Based Fib Time',
      LineToolFibCircles: 'Fib Circles',
      LineToolFibSpiral: 'Fib Spiral',
      LineToolFibSpeedResistanceArcs: 'Fib Speed Arcs',
      LineToolFibWedge: 'Fib Wedge',
      LineToolPitchfan: 'Pitchfan',
      LineToolGannBox: 'Gann Box',
      LineToolGannFixed: 'Gann Square Fixed',
      LineToolGannComplex: 'Gann Square',
      LineToolGannFan: 'Gann Fan',
      LineTool5PointsPattern: 'XABCD Pattern',
      LineToolCypherPattern: 'Cypher Pattern',
      LineToolABCD: 'ABCD Pattern',
      LineToolTrianglePattern: 'Triangle Pattern',
      LineToolThreeDrivers: 'Three Drives',
      LineToolHeadAndShoulders: 'Head & Shoulders',
      LineToolElliottImpulse: 'Elliott Impulse (12345)',
      LineToolElliottTriangle: 'Elliott Triangle (ABCDE)',
      LineToolElliottTripleCombo: 'Elliott Triple Combo',
      LineToolElliottCorrection: 'Elliott Correction (ABC)',
      LineToolElliottDoubleCombo: 'Elliott Double Combo',
      LineToolCircleLines: 'Cyclic Lines',
      LineToolTimeCycles: 'Time Cycles',
      LineToolSineLine: 'Sine Line',
      LineToolRiskRewardLong: 'Long Position',
      LineToolRiskRewardShort: 'Short Position',
      LineToolPrediction: 'Forecast',
      LineToolBarsPattern: 'Bars Pattern',
      LineToolGhostFeed: 'Ghost Feed',
      LineToolProjection: 'Projection',
      LineToolDateRange: 'Date Range',
      LineToolPriceRange: 'Price Range',
      LineToolDateAndPriceRange: 'Date & Price Range',
      LineToolBrush: 'Brush',
      LineToolHighlighter: 'Highlighter',
      LineToolRectangle: 'Rectangle',
      LineToolCircle: 'Circle',
      LineToolEllipse: 'Ellipse',
      LineToolPath: 'Path',
      LineToolBezierQuadro: 'Curve',
      LineToolBezierCubic: 'Double Curve',
      LineToolPolygonalLine: 'Polyline',
      LineToolTriangle: 'Triangle',
      LineToolRotatedRectangle: 'Rotated Rectangle',
      LineToolArc: 'Arc',
      LineToolText: 'Text',
      LineToolTextAbsolute: 'Anchored Text',
      LineToolNote: 'Note',
      LineToolNoteAbsolute: 'Anchored Note',
      LineToolSignpost: 'Signpost',
      LineToolCallout: 'Callout',
      LineToolComment: 'Comment',
      LineToolPriceLabel: 'Price Label',
      LineToolPriceNote: 'Price Note',
      LineToolArrowMarker: 'Arrow Marker',
      LineToolArrowMarkLeft: 'Arrow Left',
      LineToolArrowMarkRight: 'Arrow Right',
      LineToolArrowMarkUp: 'Arrow Up',
      LineToolArrowMarkDown: 'Arrow Down',
      LineToolFlagMark: 'Flag Mark'
    };
    if (CLEAN_NAMES[toolId]) return CLEAN_NAMES[toolId];
    return String(toolId).replace(/^LineTool/, '').replace(/([A-Z])/g, ' $1').trim();
  }

  // -------------------------------------------------------------
  // TradingView-Style Multi-Tab "Settings" Dialog Box
  // -------------------------------------------------------------
  function openStudioSettingsModal(initialTab = 'about', targetIndicatorId = null) {
    const existing = document.getElementById('vest-studio-settings-dialog');
    if (existing) existing.remove();

    const INDICATOR_MAP = ['sessions', 'autofvg', 'news', 'trades', 'candleohlc', 'positionhud', 'faillines', 'cortexindicator', 'orderblocks', 'marketstructure', 'rangedetector', 'accountsrisk'];
    let targetIndicatorToScroll = targetIndicatorId;
    if (INDICATOR_MAP.includes(initialTab)) {
      targetIndicatorToScroll = initialTab;
      initialTab = 'chartingindicators';
    }

    let activeTab = ['about', 'chartingindicators', 'memory', 'alertsvoice', 'perpfirms', 'diagnostics'].includes(initialTab) ? initialTab : 'about';
    let voicesChangedHandler = null;

    // Working draft so "Cancel" discards or "Save Settings" commits
    const draftSettings = JSON.parse(JSON.stringify(settings || {}));
    if (typeof draftSettings.rememberSidebarTools !== 'boolean') {
      draftSettings.rememberSidebarTools = true;
    }
    if (typeof draftSettings.rememberLastChartSettings !== 'boolean') {
      draftSettings.rememberLastChartSettings = true;
    }
    if (typeof draftSettings.dialogGlassOpacity !== 'number') {
      draftSettings.dialogGlassOpacity = 78;
    }
    draftSettings.sessionIndicators = normalizeSessionIndicatorsConfig(draftSettings.sessionIndicators);
    draftSettings.autoFvg = normalizeAutoFvgConfig(draftSettings.autoFvg);
    draftSettings.newsBox = normalizeNewsBoxConfig(draftSettings.newsBox);
    draftSettings.tradesBox = normalizeTradesBoxConfig(draftSettings.tradesBox);
    draftSettings.candleOhlc = normalizeCandleOhlcConfig(draftSettings.candleOhlc);
    draftSettings.positionHud = normalizePositionHudConfig(draftSettings.positionHud);
    draftSettings.failLines = normalizeFailLinesConfig(draftSettings.failLines);
    draftSettings.cortexIndicator = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
    draftSettings.diagnosticsBox = normalizeDiagnosticsBoxConfig(draftSettings.diagnosticsBox);
    draftSettings.accountsRiskBox = normalizeAccountsRiskBoxConfig(draftSettings.accountsRiskBox);
    draftSettings.perpFirms = normalizePerpFirmsConfig(draftSettings.perpFirms);
    const activeFirmInitial = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    let selectedFirmId = activeFirmInitial ? activeFirmInitial.id : (draftSettings.perpFirms[0]?.id || 'myfundedperpetuals');
    if (!draftSettings.sidebarState) {
      draftSettings.sidebarState = {
        magnet: false,
        stayInDrawingMode: false,
        lockDrawings: false,
        hideDrawings: false,
        activeTool: null,
        groupTools: {}
      };
    }

    const extVersion = getSafeExtVersion();

    const overlay = document.createElement('div');
    overlay.id = 'vest-studio-settings-dialog';
    overlay.className = 'vest-tvs-overlay';

    function syncOpenModalControlsInPlace(incoming) {
      if (!overlay || !overlay.isConnected || !incoming || typeof incoming !== 'object') return;
      const toggleMap = [
        { id: 'sessions', enabled: Boolean(incoming.sessionIndicators && incoming.sessionIndicators.enabled) },
        { id: 'autofvg', enabled: Boolean(incoming.autoFvg && incoming.autoFvg.enabled) },
        { id: 'news', enabled: Boolean(incoming.newsBox && incoming.newsBox.enabled) },
        { id: 'trades', enabled: Boolean(incoming.tradesBox && incoming.tradesBox.enabled) },
        { id: 'candleohlc', enabled: Boolean(incoming.candleOhlc && incoming.candleOhlc.enabled) },
        { id: 'positionhud', enabled: Boolean(incoming.positionHud && incoming.positionHud.enabled !== false) },
        { id: 'faillines', enabled: Boolean(incoming.failLines && incoming.failLines.enabled) },
        { id: 'cortexindicator', enabled: Boolean(incoming.cortexIndicator && incoming.cortexIndicator.enabled) },
        { id: 'orderblocks', enabled: Boolean(incoming.orderBlocks && incoming.orderBlocks.enabled) },
        { id: 'marketstructure', enabled: Boolean(incoming.marketStructure && incoming.marketStructure.enabled) },
        { id: 'rangedetector', enabled: Boolean(incoming.rangeDetector && incoming.rangeDetector.enabled) },
        { id: 'accountsrisk', enabled: Boolean(incoming.accountsRiskBox && incoming.accountsRiskBox.enabled !== false) }
      ];

      for (const item of toggleMap) {
        const tile = overlay.querySelector(`#vest-ind-tile-${item.id}`);
        if (!tile) continue;
        const toggle = tile.querySelector('.vest-ind-master-toggle');
        if (toggle && toggle.checked !== item.enabled) {
          toggle.checked = item.enabled;
        }
        tile.classList.toggle('is-enabled', item.enabled);
        const badge = tile.querySelector('.vest-indicator-status-badge');
        if (badge) {
          badge.textContent = item.enabled ? 'ON' : 'OFF';
          badge.className = `vest-indicator-status-badge ${item.enabled ? 'on' : 'off'}`;
        }
        const settingsBtn = overlay.querySelector(`#vest-ind-settings-btn-${item.id}`);
        if (settingsBtn) {
          settingsBtn.style.display = item.enabled ? 'inline-flex' : 'none';
          if (!item.enabled) settingsBtn.classList.remove('is-active');
        }
        if (!item.enabled) {
          const drawer = overlay.querySelector(`#vest-ind-drawer-${item.id}`);
          if (drawer) drawer.style.display = 'none';
        }
      }

      // Sync Accounts & Risk numeric inputs in place (skip whichever input currently has focus)
      if (incoming.accountsRiskBox) {
        const riskEl = overlay.querySelector('#vest-arb-risk-pct');
        if (riskEl && document.activeElement !== riskEl && incoming.accountsRiskBox.riskPercent !== undefined) {
          riskEl.value = String(incoming.accountsRiskBox.riskPercent);
        }
      }
    }

    function onLiveSettingsUpdated(e) {
      if (!overlay || !overlay.isConnected) {
        window.removeEventListener('cortex-live-settings-updated', onLiveSettingsUpdated);
        return;
      }
      if (!e || !e.detail || !e.detail.settings) return;
      // Never call renderDialog() here — wiping overlay.innerHTML resets scrollTop and cancels active scrollbar drags!
      // Instead, merge draftSettings and patch toggle/badge DOM states in place.
      Object.assign(draftSettings, JSON.parse(JSON.stringify(e.detail.settings)));
      syncOpenModalControlsInPlace(draftSettings);
    }
    window.addEventListener('cortex-live-settings-updated', onLiveSettingsUpdated);

    const NAV_ITEMS = [
      {
        id: 'about',
        label: 'About',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
      },
      {
        id: 'chartingindicators',
        label: 'Charting Indicators',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="6" y2="12"/></svg>`
      },
      {
        id: 'memory',
        label: 'Chart Memory Features',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`
      },
      {
        id: 'alertsvoice',
        label: 'Alerts & Voice Settings',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`
      },
      {
        id: 'perpfirms',
        label: 'Perp Firm Settings',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
      },
      {
        id: 'diagnostics',
        label: 'Diagnostics & Debug',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
      }
    ];

    function broadcastLiveSessionDraft() {
      if (draftSettings.sessionIndicators) {
        settings.sessionIndicators = JSON.parse(JSON.stringify(draftSettings.sessionIndicators));
      }
      if (draftSettings.autoFvg) {
        settings.autoFvg = JSON.parse(JSON.stringify(draftSettings.autoFvg));
      }
      if (draftSettings.newsBox) {
        settings.newsBox = JSON.parse(JSON.stringify(draftSettings.newsBox));
      }
      if (draftSettings.tradesBox) {
        settings.tradesBox = JSON.parse(JSON.stringify(draftSettings.tradesBox));
      }
      if (draftSettings.candleOhlc) {
        settings.candleOhlc = JSON.parse(JSON.stringify(draftSettings.candleOhlc));
      }
      if (draftSettings.positionHud) {
        settings.positionHud = JSON.parse(JSON.stringify(draftSettings.positionHud));
      }
      if (draftSettings.failLines) {
        settings.failLines = normalizeFailLinesConfig(draftSettings.failLines);
      }
      if (draftSettings.cortexIndicator) {
        settings.cortexIndicator = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
      }
      if (draftSettings.orderBlocks) {
        settings.orderBlocks = normalizeOrderBlocksConfig(draftSettings.orderBlocks);
      }
      if (draftSettings.marketStructure) {
        settings.marketStructure = normalizeMarketStructureConfig(draftSettings.marketStructure);
      }
      if (draftSettings.diagnosticsBox) {
        settings.diagnosticsBox = normalizeDiagnosticsBoxConfig(draftSettings.diagnosticsBox);
      }
      if (draftSettings.accountsRiskBox) {
        settings.accountsRiskBox = normalizeAccountsRiskBoxConfig(draftSettings.accountsRiskBox);
      }
      if (typeof draftSettings.debugMode === 'boolean') {
        settings.debugMode = draftSettings.debugMode;
      }
      if (typeof draftSettings.dialogGlassEffect === 'boolean') {
        settings.dialogGlassEffect = draftSettings.dialogGlassEffect;
        applyDialogGlassEffect(draftSettings.dialogGlassEffect);
      }
      if (draftSettings.perpFirms) {
        settings.perpFirms = normalizePerpFirmsConfig(draftSettings.perpFirms);
      }
      queueSettingsSave({
        sessionIndicators: settings.sessionIndicators,
        autoFvg: settings.autoFvg,
        newsBox: settings.newsBox,
        tradesBox: settings.tradesBox,
        candleOhlc: settings.candleOhlc,
        positionHud: settings.positionHud,
        failLines: settings.failLines,
        cortexIndicator: settings.cortexIndicator,
        orderBlocks: settings.orderBlocks,
        marketStructure: settings.marketStructure,
        rangeDetector: settings.rangeDetector,
        diagnosticsBox: settings.diagnosticsBox,
        accountsRiskBox: settings.accountsRiskBox,
        debugMode: settings.debugMode,
        dialogGlassEffect: settings.dialogGlassEffect,
        perpFirms: settings.perpFirms
      });
      renderStudioHeaderPill();
      if (typeof renderChartNewsBox === 'function') {
        renderChartNewsBox();
      }
      if (typeof renderChartTradesBox === 'function') {
        renderChartTradesBox();
      }
      if (typeof renderChartDiagnosticsBox === 'function') {
        renderChartDiagnosticsBox();
      }
      if (typeof renderChartAccountsRiskBox === 'function') {
        renderChartAccountsRiskBox();
      }
      postToMainWorlds({
        type: 'VEST_TV_CONFIG_UPDATE',
        payload: {
          templates,
          settings: {
            ...settings,
            ...draftSettings
          }
        }
      });
    }

      function renderPerpFirmsHtml() {
        const firms = normalizePerpFirmsConfig(draftSettings.perpFirms);
        const currentFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
        const activeId = currentFirm ? currentFirm.id : null;

        if (!firms.some(f => f.id === selectedFirmId)) {
          selectedFirmId = activeId || (firms[0] ? firms[0].id : 'myfundedperpetuals');
        }

        const selectedFirm = firms.find(f => f.id === selectedFirmId) || firms[0];

        function cleanDomain(url) {
          if (!url) return '';
          return url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
        }

        return `
          <div class="vest-tvs-section-title">PERP FIRM SETTINGS &amp; BROKER ROUTING</div>
          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 16px;">
            Configure Trading Cortex across multiple perpetual trading firms and prop brokers. Click any tile to customize its top-bar placement, layout offsets, default leverage, and account settings below.
          </p>

          <!-- Side-by-side Tiles Grid -->
          <div class="vest-pf-grid">
            ${firms.map(firm => {
              const isSelected = firm.id === selectedFirmId;
              const isCurrent = activeId === firm.id;
              const domain = cleanDomain(firm.url) || (firm.matchPatterns && firm.matchPatterns[0]) || '';
              const topBarLabel = firm.topBarMode === 'custom' ? `+${firm.customTopBarOffsetPx}px` : 'Auto';
              const marginLabel = `${firm.barMarginBottom ?? 8}px`;

              return `
                <div class="vest-pf-tile ${isSelected ? 'selected' : ''} ${!firm.enabled ? 'disabled' : ''}" data-firm-id="${firm.id}">
                  <div class="vest-pf-tile-top">
                    <div class="vest-pf-tile-title-row" style="width:100%;">
                      <div class="vest-pf-avatar" title="${firm.name}">${getPropFirmLogoSvg(firm.id, 24)}</div>
                      <div class="vest-pf-name" title="${firm.name}">${firm.name}</div>
                    </div>
                  </div>

                  <div class="vest-pf-url-badge" title="${firm.url || domain}">
                    ${domain || 'No URL'}
                  </div>

                  <div class="vest-pf-tags-row">
                    ${isCurrent ? `<span class="vest-pf-badge current">Current Site</span>` : ''}
                    <span class="vest-pf-badge builtin">${firm.accountTier || 'Perp Firm'}</span>
                    ${!firm.enabled ? `<span class="vest-pf-badge off">Disabled</span>` : ''}
                  </div>

                  <div style="font-size:10.5px; color:#64748b; margin-top:2px; display:flex; justify-content:space-between;">
                    <span>Top-bar: <strong style="color:#94a3b8;">${topBarLabel}</strong></span>
                    <span>Margin: <strong style="color:#94a3b8;">${marginLabel}</strong></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Detail Settings Card Below Grid -->
          <div id="vest-pf-detail-container">
            ${selectedFirm ? renderFirmDetailCard(selectedFirm, activeId === selectedFirm.id) : ''}
          </div>
        `;
      }

      function renderFirmDetailCard(firm, isCurrent) {
        const topMode = firm.topBarMode === 'custom' ? 'custom' : 'auto';
        const offsetPx = firm.customTopBarOffsetPx ?? 0;
        const marginPx = firm.barMarginBottom ?? 8;
        const headerPx = firm.headerHeightPx ?? 48;
        const lev = firm.defaultLeverage || '10x';

        return `
          <div class="vest-pf-detail-card" id="vest-pf-detail-card">
            <input type="hidden" id="vest-pf-current-id" value="${firm.id}" />

            <div class="vest-pf-detail-header">
              <div class="vest-pf-detail-title-group">
                <div class="vest-pf-avatar" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
                  ${getPropFirmLogoSvg(firm.id, 26)}
                </div>
                <div>
                  <div class="vest-pf-detail-title">${firm.name}</div>
                  <div class="vest-pf-detail-subtitle">${firm.url || 'No URL specified'}</div>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:11.5px; font-weight:600; color:${firm.enabled ? '#34d399' : '#94a3b8'};">
                    ${firm.enabled ? 'Cortex Active' : 'Cortex Disabled'}
                  </span>
                  <label class="vest-tvs-switch" title="Enable or disable Trading Cortex on this firm">
                    <input type="checkbox" id="vest-pf-input-enabled" ${firm.enabled ? 'checked' : ''} />
                    <span class="vest-tvs-switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Section 1: Firm Identification & URL Routing -->
            <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-bottom:12px;">
              <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
                Firm Identification &amp; Routing
              </div>
              <div class="vest-ed-grid-2" style="margin-bottom:10px;">
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Firm Display Name</label>
                  <input type="text" class="vest-ed-input" id="vest-pf-input-name" value="${firm.name}" />
                </div>
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Account Tier / Type</label>
                  <input type="text" class="vest-ed-input" id="vest-pf-input-tier" value="${firm.accountTier || ''}" placeholder="e.g. Evaluation / Funded / DEX / Perpetuals" />
                </div>
              </div>
              <div class="vest-ed-grid-2">
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Web Trading URL</label>
                  <input type="text" class="vest-ed-input" id="vest-pf-input-url" value="${firm.url || ''}" placeholder="https://example.com/trade" />
                </div>
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Domain Match Patterns (comma-separated)</label>
                  <input type="text" class="vest-ed-input" id="vest-pf-input-patterns" value="${Array.isArray(firm.matchPatterns) ? firm.matchPatterns.join(', ') : ''}" placeholder="example.com, trade.example.com" />
                </div>
              </div>
            </div>

            <!-- Section 2: Layout & Top-Bar Spacing -->
            <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-bottom:12px;">
              <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
                Top-Bar Placement &amp; Spacing
              </div>
              <div class="vest-ed-grid-2" style="margin-bottom:10px;">
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Cortex Bar Placement Mode</label>
                  <select class="vest-ed-select" id="vest-pf-input-topbarmode">
                    <option value="auto" ${topMode === 'auto' ? 'selected' : ''}>Auto Detect (Navbar / Ticker Row)</option>
                    <option value="custom" ${topMode === 'custom' ? 'selected' : ''}>Custom Fixed Offset (px)</option>
                  </select>
                </div>
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Custom Top-Bar Offset: <span id="vest-pf-val-offset" style="color:#38bdf8; font-weight:700;">${offsetPx}px</span></label>
                  <input type="range" class="vest-ed-range" id="vest-pf-input-offset" min="0" max="140" step="2" value="${offsetPx}" ${topMode === 'auto' ? 'disabled style="opacity:0.45;"' : ''} />
                </div>
              </div>
              <div class="vest-ed-grid-2">
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Bottom Margin Spacing: <span id="vest-pf-val-margin" style="color:#38bdf8; font-weight:700;">${marginPx}px</span></label>
                  <input type="range" class="vest-ed-range" id="vest-pf-input-margin" min="0" max="32" step="1" value="${marginPx}" />
                  <div style="font-size:10.5px; color:#64748b; margin-top:3px;">Pushes the chart and tickers down so they aren't squished against the Cortex bar.</div>
                </div>
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Firm Header Height: <span id="vest-pf-val-header" style="color:#38bdf8; font-weight:700;">${headerPx}px</span></label>
                  <input type="range" class="vest-ed-range" id="vest-pf-input-header" min="32" max="100" step="2" value="${headerPx}" />
                  <div style="font-size:10.5px; color:#64748b; margin-top:3px;">Standard height of this firm's primary navigation header.</div>
                </div>
              </div>
            </div>

            <!-- Section 3: Trading Defaults & Trader Notes -->
            <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px;">
              <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
                Trading Defaults &amp; Notes
              </div>
              <div class="vest-ed-grid-2" style="margin-bottom:10px;">
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Default Order Leverage</label>
                  <select class="vest-ed-select" id="vest-pf-input-leverage">
                    ${['1x', '2x', '3x', '5x', '10x', '15x', '20x', '24x', '25x', '50x', '100x'].map(v => `<option value="${v}" ${lev === v ? 'selected' : ''}>${v}</option>`).join('')}
                  </select>
                </div>
                <div class="vest-ed-field" style="display:flex; align-items:center; justify-content:space-between; padding-top:16px;">
                  <label class="vest-ed-label" style="margin:0;">Remember Order Amount / Size</label>
                  <label class="vest-tvs-switch">
                    <input type="checkbox" id="vest-pf-input-remember-size" ${firm.rememberOrderAmount !== false ? 'checked' : ''} />
                    <span class="vest-tvs-switch-slider"></span>
                  </label>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Trader Notes / Firm Rules</label>
                <input type="text" class="vest-ed-input" id="vest-pf-input-notes" value="${firm.notes || ''}" placeholder="e.g. Max drawdown 4%, trade only during NY Killzone" />
              </div>
            </div>

            <!-- Section 4: Account Persistence & Subaccount Routing -->
            <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-top:12px;">
              <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
                Account Persistence &amp; Subaccount Routing
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="max-width:80%;">
                  <div style="font-size:12px; font-weight:600; color:#f8fafc;">Restore Selected Account on Refresh</div>
                  <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Keeps track of which account is selected on this exchange (e.g. Vest subaccounts or evaluation accounts) and restores your tab to that account on refresh.</div>
                </div>
                <label class="vest-tvs-switch" title="Restore selected account on refresh">
                  <input type="checkbox" id="vest-pf-input-restore-account" ${firm.restoreSelectedAccount !== false ? 'checked' : ''} />
                  <span class="vest-tvs-switch-slider"></span>
                </label>
              </div>
            </div>

            <!-- Section 5: Positions & Orders Panel Management -->
            <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-top:12px;">
              <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
                Positions &amp; Orders Panel Management
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="max-width:80%;">
                  <div style="font-size:12px; font-weight:600; color:#f8fafc;">Manage Positions &amp; Orders Panel (Dock / Minimize / Detach)</div>
                  <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Allows detaching or minimizing the Positions &amp; Orders bottom panel into full screen chart mode on this firm. When minimized or detached, a sleek POSITIONS item docks into the Cortex taskbar.</div>
                </div>
                <label class="vest-tvs-switch" title="Toggle Positions & Orders Panel Management">
                  <input type="checkbox" id="vest-pf-input-manage-positions" ${firm.managePositionsPanel !== false ? 'checked' : ''} />
                  <span class="vest-tvs-switch-slider"></span>
                </label>
              </div>
            </div>

            <!-- Section 6: Chart Timeframe Favoriting -->
            <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-top:12px;">
              <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
                Chart Timeframe Favoriting
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="max-width:80%;">
                  <div style="font-size:12px; font-weight:600; color:#f8fafc;">Custom Timeframe Favorites Bar</div>
                  <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Injects Cortex timeframe quick-action chips into the chart toolbar. Keep disabled for platforms with native timeframe favoriting (like My Funded Perpetuals and Kalshi Pro) so native stars and chips are used instead.</div>
                </div>
                <label class="vest-tvs-switch" title="Toggle custom timeframe favorites bar for this firm">
                  <input type="checkbox" id="vest-pf-input-enable-timeframes" ${firm.enableTimeframeFavorites !== false ? 'checked' : ''} />
                  <span class="vest-tvs-switch-slider"></span>
                </label>
              </div>
            </div>
          </div>
        `;
      }

    function renderRightPaneContent() {
      if (activeTab === 'alertsvoice') {
        const cfg = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
        draftSettings.cortexIndicator = cfg;
        const voices = typeof window.speechSynthesis !== 'undefined' ? window.speechSynthesis.getVoices() : [];
        const voiceOptions = cortexVoiceOptionsMarkup(voices, cfg.signalAlertVoiceURI);
        return `
          <div class="vest-tvs-section-title">ALERTS &amp; VOICE SETTINGS</div>
          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 14px;">Voice alerts follow the Cortex Indicator. A forming alert speaks at most once per candle, even if the signal appears late or changes during that candle. A confirmed signal speaks “Buy Now” or “Sell Now” after the candle closes.</p>
          <div class="vest-tvs-toggle-box">
            <div class="vest-tvs-toggle-info"><div class="vest-tvs-toggle-title">Alert when a signal first forms</div><div class="vest-tvs-toggle-desc">Speaks “Buy signal forming” or “Sell signal forming” once per bar.</div></div>
            <label class="vest-tvs-switch"><input type="checkbox" id="vest-ci-forming-voice-alert" ${cfg.formingSignalVoiceAlert ? 'checked' : ''} /><span class="vest-tvs-switch-slider"></span></label>
          </div>
          <div class="vest-tvs-toggle-box" style="margin-top:10px;">
            <div class="vest-tvs-toggle-info"><div class="vest-tvs-toggle-title">Speak when a signal is confirmed</div><div class="vest-tvs-toggle-desc">Speaks “Buy Now” or “Sell Now” only after the signal bar closes.</div></div>
            <label class="vest-tvs-switch"><input type="checkbox" id="vest-ci-confirmed-voice-alert" ${cfg.confirmedSignalVoiceAlert ? 'checked' : ''} /><span class="vest-tvs-switch-slider"></span></label>
          </div>
          <div style="margin-top:16px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <label for="vest-ci-alert-voice" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:8px;">Spoken alert voice</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <select id="vest-ci-alert-voice" style="flex:1;min-width:0;padding:9px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">${voiceOptions}</select>
              <button type="button" class="vest-tvs-action-btn" id="vest-ci-test-alert-voice">Test voice</button>
            </div>
            <div id="vest-ci-alert-voice-status" role="status" style="margin-top:9px;font-size:11px;color:#94a3b8;">Choose Irish English to use an en-IE voice supplied by your browser. Browser voices do not expose gender, so use Test voice to check how it sounds.</div>
          </div>
        `;
      }

      if (activeTab === 'about') {
        return `
          <div class="vest-tvs-section-title">ABOUT THIS TOOL</div>
          <div class="vest-tvs-discord-banner">
            <a href="https://discord.gg/ztXmwMBQ2Y" target="_blank" rel="noopener noreferrer" class="vest-tvs-discord-btn" id="vest-tvs-discord-btn" title="Join the Trading Cortex Community on Discord">
              <div class="vest-tvs-discord-left">
                <div class="vest-tvs-discord-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="vest-tvs-discord-icon">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                <div class="vest-tvs-discord-text-group">
                  <span class="vest-tvs-discord-title">Join Our Discord</span>
                  <span class="vest-tvs-discord-subtitle">Community, feature requests, strategies &amp; live support</span>
                </div>
              </div>
              <div class="vest-tvs-discord-action">
                <span>Join Discord</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px;">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
            </a>
          </div>
          <div class="vest-tvs-about-card">
            <div class="vest-tvs-about-header">
              <div class="vest-tvs-about-brand">
                <span class="vest-tvs-about-dot"></span>
                <span class="vest-tvs-about-name">Trading Cortex</span>
              </div>
              <span class="vest-tvs-about-version">v${extVersion}</span>
            </div>
            <p class="vest-tvs-about-desc">
              A smart chart memory and workspace enhancement suite engineered for web trading terminals powered by the TradingView Charting Library.
            </p>
            <p class="vest-tvs-about-desc" style="color:#94a3b8;">
              Provides persistent left-sidebar drawing tool memory, one-click ICT/SMC rectangle templates, ICT Killzone session overlays with unmitigated High/Low rays, extended box far-right canvas text alignment, dockable workspace controls, and real-time market telemetry.
            </p>
            <div class="vest-tvs-about-meta">
              <div class="vest-tvs-about-meta-row">
                <span>GitHub Repository</span>
                <span style="color:#e2e8f0; font-family:'JetBrains Mono', monospace; font-size:12px;">childersc/trading-cortex</span>
              </div>
              <div class="vest-tvs-about-meta-row">
                <span>Target Engine</span>
                <span style="color:#e2e8f0;">TradingView Charting Library Platforms</span>
              </div>
              <div class="vest-tvs-about-meta-row" style="margin-top:6px;">
                <span>Update Channel</span>
                <select class="vest-ed-select" id="vest-tvs-update-channel-select" style="width:175px; padding:3px 6px; font-size:11.5px; background:rgba(15,23,42,0.85); color:#f8fafc; border:1px solid rgba(148,163,184,0.3); border-radius:6px; cursor:pointer;" title="Choose whether to receive Official Releases or Bleeding-Edge Dev updates">
                  <option value="stable" ${latestUpdateChannel === 'stable' ? 'selected' : ''}>Stable (Official Releases)</option>
                  <option value="dev" ${latestUpdateChannel === 'dev' ? 'selected' : ''}>Dev Branch (Bleeding Edge)</option>
                </select>
              </div>
              <div class="vest-tvs-about-meta-row" style="margin-top:6px;">
                <span>Update Center</span>
                <button type="button" class="vest-tvs-action-btn" id="vest-tvs-open-ota-btn" style="border-color:#10b981; color:#10b981;">
                  Open Update Center ↗
                </button>
              </div>
            </div>

            <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(148,163,184,0.14);">
              <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">
                DISPLAY &amp; DIALOG APPEARANCE
              </div>
              <div class="vest-tvs-toggle-box">
                <div class="vest-tvs-toggle-info">
                  <div class="vest-tvs-toggle-title">Dialog Glass Effect</div>
                  <div class="vest-tvs-toggle-desc">
                    Enable modern translucent frosted-glass styling with background blur for detached windows and dialogs. When disabled (recommended), dialogs use 100% solid, fully opaque backdrops to completely prevent candles, order lines, and chart elements from bleeding through.
                  </div>
                </div>
                <label class="vest-tvs-switch" title="Toggle Dialog Glass Effect">
                  <input type="checkbox" id="vest-tvs-dialog-glass-toggle" ${draftSettings.dialogGlassEffect ? 'checked' : ''} />
                  <span class="vest-tvs-switch-slider"></span>
                </label>
              </div>

              <div id="vest-tvs-dialog-glass-opacity-box" style="margin-top:10px; padding:10px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; display: ${draftSettings.dialogGlassEffect ? 'block' : 'none'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:12px; font-weight:600; color:#e2e8f0;">Glass Backdrop Opacity</span>
                  <span id="vest-tvs-dialog-glass-op-val" style="font-size:11.5px; font-weight:700; color:#38bdf8; font-family:'JetBrains Mono', monospace;">${draftSettings.dialogGlassOpacity || 78}%</span>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                  <input type="range" id="vest-tvs-dialog-glass-op-range" min="15" max="95" step="1" value="${draftSettings.dialogGlassOpacity || 78}" style="flex:1; accent-color:#38bdf8; cursor:pointer;" />
                  <span style="font-size:11px; color:#94a3b8;">15% (Translucent) – 95% (Near Opaque)</span>
                </div>
              </div>
            </div>

            <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(148,163,184,0.14);">
              <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">
                Version Log — Changes Since v${extVersion}
              </div>
              <ul style="margin:0; padding-left:18px; font-size:12px; color:#cbd5e1; line-height:1.65;">
                <li><strong style="color:#f8fafc;">Moveable Economic News Box:</strong> Draggable across the screen, showing event time, country of origin, Red/Yellow/Green impact folder icons, and live countdowns. Minimized boxes dock into the Cortex bottom bar.</li>
                <li><strong style="color:#f8fafc;">Auto FVG's Engine &amp; Settings Tab:</strong> Automatically detects 3-candle Bullish &amp; Bearish FVGs, auto-matches saved timeframe templates (e.g. <code>"5m FVG"</code>) or falls back to a default FVG template, and deduplicates against existing chart rectangles on refresh.</li>
                <li><strong style="color:#f8fafc;">Dedicated Reclaimed FVG's Box &amp; TradingView Color Picker:</strong> Added a toggleable <em>Show Reclaimed FVG's</em> section with automatic custom reclaimed FVG coloring &amp; opacity, plus the native TradingView 8&times;10 swatch &amp; opacity color picker across all settings.</li>
                <li><strong style="color:#f8fafc;">Configurable FVG Extension &amp; Reclaim:</strong> Choose whether unreclaimed FVGs extend far right or to the current candle (+ extra future bars) until reclaimed (by body close or full wick fill).</li>
                <li><strong style="color:#f8fafc;">ICT Killzones &amp; Session Indicators:</strong> Shaded Asia, London, NY AM, NY Lunch, and NY PM boxes rendered behind chart drawings with centered watermarks.</li>
                <li><strong style="color:#f8fafc;">Dual Session High/Low Lines &amp; Price Badges:</strong> Solid swept H/L lines plus 7-day extended dotted/dashed lines with right-axis price tags and customizable date stamps (default <code>M-d-y</code>) and label alignment.</li>
                <li><strong style="color:#f8fafc;">Real-Time Drag &amp; Flicker-Free Rendering:</strong> Capture-phase drag tracking and single-RAF vsync coalescing so overlays move smoothly with the chart without color flicker.</li>
              </ul>
            </div>
          </div>
        `;
      }

      if (activeTab === 'memory') {
        const isRememberOn = draftSettings.rememberSidebarTools !== false;
        const isRememberChartSettingsOn = draftSettings.rememberLastChartSettings !== false;
        const favoriteTimeframes = normalizeFavoriteTimeframes(draftSettings.favoriteTimeframes);
        const favoriteTimeframeSet = new Set(favoriteTimeframes.map(item => item.resolution));
        const timeframeOptions = [
          ['1', '1m'], ['3', '3m'], ['5', '5m'], ['15', '15m'], ['30', '30m'],
          ['60', '1h'], ['120', '2h'], ['240', '4h'], ['360', '6h'], ['480', '8h'], ['720', '12h'],
          ['1D', '1D'], ['3D', '3D'], ['1W', '1W'], ['1M', '1M']
        ];

        return `
          <div class="vest-tvs-section-title">CHART MEMORY FEATURES</div>

          <div class="vest-tvs-toggle-box">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Remember selected drawing tools</div>
              <div class="vest-tvs-toggle-desc">
                Automatically remembers and restores the last selected state of every tool on the left-hand sidebar (including Magnet) whenever the chart loads.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Remember selected drawing tools">
              <input type="checkbox" id="vest-tvs-remember-tools-toggle" ${isRememberOn ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-tvs-toggle-box" style="margin-top: 12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Remember last chart settings</div>
              <div class="vest-tvs-toggle-desc">
                Automatically remembers and restores your exact chart position (left/right pan, up/down price range, zoom level), timeframe, and candle style across page refreshes.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Remember last chart settings">
              <input type="checkbox" id="vest-tvs-remember-chart-settings-toggle" ${isRememberChartSettingsOn ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-tvs-toggle-box" style="display:block; margin-top:12px;">
            <div class="vest-tvs-toggle-info" style="margin-bottom:10px;">
              <div class="vest-tvs-toggle-title">Favorite timeframes</div>
              <div class="vest-tvs-toggle-desc">
                Choose the intervals shown beside the chart timeframe selector. You can also star or unstar intervals in the chart's timeframe dropdown. Favorites are saved across reloads.
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:7px 12px;">
              ${timeframeOptions.map(([resolution, label]) => `
                <label style="display:inline-flex; align-items:center; gap:5px; color:#cbd5e1; font-size:12px; cursor:pointer;">
                  <input class="vest-tvs-favorite-timeframe" type="checkbox" value="${resolution}" ${favoriteTimeframeSet.has(resolution) ? 'checked' : ''} />
                  <span>${label}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;
      }

      function renderSessionIndicatorsSettingsHtml(sc) {
        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-si-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Session Box &amp; Watermark Font Styling
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Watermark Font Family</label>
                <select class="vest-ed-select" id="vest-si-font-family">
                  ${SESSION_FONT_FAMILIES.map(f => `
                    <option value="${escapeHtml(f.id)}" ${f.id === sc.fontFamily ? 'selected' : ''}>${escapeHtml(f.label)}</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Watermark Font Size: <span id="vest-si-fontsize-val">${sc.fontSize}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-si-font-size" min="14" max="76" value="${sc.fontSize}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Watermark Opacity: <span id="vest-si-wm-opacity-val">${sc.watermarkOpacity}%</span></label>
                <input type="range" class="vest-ed-range" id="vest-si-wm-opacity" min="5" max="90" value="${sc.watermarkOpacity}" />
              </div>
            </div>

            <div class="vest-ed-grid-3" style="margin-bottom:8px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Fill Opacity: <span id="vest-si-box-opacity-val">${sc.boxOpacity}%</span></label>
                <input type="range" class="vest-ed-range" id="vest-si-box-opacity" min="5" max="65" value="${sc.boxOpacity}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Days Lookback</label>
                <select class="vest-ed-select" id="vest-si-days-back">
                  ${[1, 2, 3, 5, 7, 10, 14, 21].map(d => `
                    <option value="${d}" ${Number(sc.maxDaysBack) === d ? 'selected' : ''}>${d} ${d === 1 ? 'Day' : 'Days'}</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">H/L Line Style</label>
                <select class="vest-ed-select" id="vest-si-hl-style">
                  <option value="0" ${Number(sc.highLowLineStyle) === 0 ? 'selected' : ''}>Solid (───)</option>
                  <option value="1" ${Number(sc.highLowLineStyle) === 1 ? 'selected' : ''}>Dotted (···)</option>
                  <option value="2" ${Number(sc.highLowLineStyle) === 2 ? 'selected' : ''}>Dashed (---)</option>
                </select>
              </div>
            </div>

            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">H/L Line Width: <span id="vest-si-hl-width-val">${sc.highLowLineWidth}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-si-hl-width" min="1" max="5" value="${sc.highLowLineWidth}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">H/L Text Alignment</label>
                <select class="vest-ed-select" id="vest-si-hl-align">
                  <option value="right" ${sc.highLowLabelAlign === 'right' ? 'selected' : ''}>Right (At line end)</option>
                  <option value="left" ${sc.highLowLabelAlign === 'left' ? 'selected' : ''}>Left (At line origin)</option>
                </select>
              </div>
              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-si-show-boxes" ${sc.showBoxes ? 'checked' : ''} />
                  <span>Show Shaded Boxes</span>
                </label>
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-si-show-labels" ${sc.showLabels ? 'checked' : ''} />
                  <span>Show Watermarks</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Permanent High / Low Lines Card -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              High / Low Session Lines &amp; Sweeps
            </div>

            <div class="vest-tvs-toggle-box" style="padding:10px 12px; margin-bottom:10px; background:rgba(255,255,255,0.03);">
              <div class="vest-tvs-toggle-info">
                <div class="vest-tvs-toggle-title">Keep High/Low Lines On Chart Until Swept</div>
                <div class="vest-tvs-toggle-desc">
                  Extends each session's High and Low liquidity lines to the right across multiple days until price touches or wicks through the level (unmitigated).
                </div>
              </div>
              <label class="vest-tvs-switch" title="Keep uncleared H/L lines until swept">
                <input type="checkbox" id="vest-si-perm-hl" ${sc.permanentHighLowLines ? 'checked' : ''} />
                <span class="vest-tvs-switch-slider"></span>
              </label>
            </div>

            <div class="vest-tvs-toggle-box" style="padding:10px 12px; margin-bottom:10px; background:rgba(255,255,255,0.03);">
              <div class="vest-tvs-toggle-info">
                <div class="vest-tvs-toggle-title">Extend All Past Session High/Low Lines Across Chart</div>
                <div class="vest-tvs-toggle-desc">
                  Draws permanent dotted/dashed reference lines for ALL historical session highs and lows across your lookback window, even after the level has been swept.
                </div>
              </div>
              <label class="vest-tvs-switch" title="Show all historical session High/Low lines">
                <input type="checkbox" id="vest-si-extend-all-perm" ${sc.extendAllPermanentLines ? 'checked' : ''} />
                <span class="vest-tvs-switch-slider"></span>
              </label>
            </div>

            <div class="vest-ed-grid-3" style="margin-bottom:8px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Past Lines Style</label>
                <select class="vest-ed-select" id="vest-si-perm-style">
                  <option value="2" ${Number(sc.permanentLineStyle) === 2 ? 'selected' : ''}>Dashed (---)</option>
                  <option value="1" ${Number(sc.permanentLineStyle) === 1 ? 'selected' : ''}>Dotted (···)</option>
                  <option value="0" ${Number(sc.permanentLineStyle) === 0 ? 'selected' : ''}>Solid (───)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Past Lines Width: <span id="vest-si-perm-width-val">${sc.permanentLineWidth || 1}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-si-perm-width" min="1" max="4" value="${sc.permanentLineWidth || 1}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Line Color Mode</label>
                <select class="vest-ed-select" id="vest-si-perm-color-mode">
                  <option value="session" ${(sc.permanentLineColorMode || 'session') === 'session' ? 'selected' : ''}>Match Session Color</option>
                  <option value="custom" ${sc.permanentLineColorMode === 'custom' ? 'selected' : ''}>Custom Fixed Color</option>
                </select>
              </div>
            </div>

            <div class="vest-ed-grid-3" style="margin-bottom:8px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Custom Line Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-si-perm-custom-color" value="${normalizeHexColor(sc.permanentLineCustomColor, '#94a3b8')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(sc.permanentLineCustomColor, '#94a3b8')}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Price Tag Font Size: <span id="vest-si-perm-fontsize-val">${sc.permanentLabelFontSize || 10}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-si-perm-font-size" min="8" max="18" value="${sc.permanentLabelFontSize || 10}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Label Date Stamp Format</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="text" class="vest-ed-input" id="vest-si-perm-date-format" value="${escapeHtml(sc.permanentDateFormat || 'M-d-y')}" placeholder="M-d-y" style="height:28px; padding:2px 7px; font-size:11.5px; font-family:'JetBrains Mono', monospace; flex:1;" title="Format for the date in H/L labels (e.g. M-d-y, M-d, yyyy-MM-dd)" />
                  <select class="vest-ed-select" id="vest-si-perm-date-preset" style="width:84px; height:28px; padding:2px 4px; font-size:11px;" title="Choose preset date format">
                    <option value="">Presets...</option>
                    <option value="M-d-y" ${(sc.permanentDateFormat || 'M-d-y') === 'M-d-y' ? 'selected' : ''}>M-d-y</option>
                    <option value="M/d/y" ${sc.permanentDateFormat === 'M/d/y' ? 'selected' : ''}>M/d/y</option>
                    <option value="M-d" ${sc.permanentDateFormat === 'M-d' ? 'selected' : ''}>M-d</option>
                    <option value="yyyy-MM-dd" ${sc.permanentDateFormat === 'yyyy-MM-dd' ? 'selected' : ''}>yyyy-MM-dd</option>
                    <option value="MM-dd" ${sc.permanentDateFormat === 'MM-dd' ? 'selected' : ''}>MM-dd</option>
                    <option value="d MMM" ${sc.permanentDateFormat === 'd MMM' ? 'selected' : ''}>d MMM</option>
                  </select>
                </div>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:16px; margin-top:10px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-perm-show-labels" ${sc.permanentShowLabels !== false ? 'checked' : ''} />
                <span>Show Right-Axis Price &amp; Session Name Tags</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-perm-show-date" ${sc.permanentShowDateInLabel !== false ? 'checked' : ''} />
                <span>Include Date Stamp In Labels</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-perm-show-swept" ${sc.permanentShowSweptTag !== false ? 'checked' : ''} />
                <span>Show "[SWEPT]" Marker On Cleared Levels</span>
              </label>
            </div>
          </div>

          <!-- Individual ICT Sessions Table -->
          <div style="font-size:11px; font-weight:700; color:#93c5fd; text-transform:uppercase; letter-spacing:0.6px; margin:4px 0 8px 0;">
            Individual ICT Sessions (New York Time · EST/EDT)
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${sc.sessions.map((sess, idx) => `
              <div class="vest-tvs-toggle-box" data-sess-id="${escapeHtml(sess.id)}" style="padding:10px 14px; margin-bottom:0; gap:12px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:165px;">
                  <input type="color" class="vest-ed-color vest-si-sess-color" data-idx="${idx}" data-opacity-input="#vest-si-box-opacity" value="${normalizeHexColor(sess.color, '#26a69a')}" style="width:28px; height:28px; padding:0; border-radius:6px; cursor:pointer; flex-shrink:0;" title="Session Box &amp; High/Low Line Color" />
                  <div style="display:flex; flex-direction:column; min-width:0;">
                    <span style="font-size:13px; font-weight:600; color:#f8fafc; white-space:nowrap;">${escapeHtml(sess.name)}</span>
                    <span style="font-size:10.5px; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${escapeHtml(sess.shortTag)}.H / ${escapeHtml(sess.shortTag)}.L</span>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:6px; flex:1; justify-content:flex-end; flex-wrap:wrap;">
                  <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:11px; color:#94a3b8;">Label:</span>
                    <input type="text" class="vest-ed-input vest-si-sess-watermark" data-idx="${idx}" value="${escapeHtml(sess.watermarkText)}" style="width:82px; height:26px; padding:2px 6px; font-size:11.5px;" title="Watermark label inside session box" />
                  </div>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <input type="time" class="vest-ed-input vest-si-sess-start" data-idx="${idx}" value="${escapeHtml(sess.startTime)}" style="width:88px; height:26px; padding:2px 5px; font-size:11.5px; font-family:'JetBrains Mono', monospace;" title="Session Start (NY Time)" />
                    <span style="color:#64748b; font-size:11px;">–</span>
                    <input type="time" class="vest-ed-input vest-si-sess-end" data-idx="${idx}" value="${escapeHtml(sess.endTime)}" style="width:88px; height:26px; padding:2px 5px; font-size:11.5px; font-family:'JetBrains Mono', monospace;" title="Session End (NY Time)" />
                  </div>
                </div>

                <label class="vest-tvs-switch" title="Enable ${escapeHtml(sess.name)}">
                  <input type="checkbox" class="vest-si-sess-enabled" data-idx="${idx}" ${sess.enabled ? 'checked' : ''} />
                  <span class="vest-tvs-switch-slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        `;
      }

      function renderAutoFvgSettingsHtml(fc, rectTemplates) {
        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-afvg-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Template Matching &amp; Label Rules
            </div>
            <div style="font-size:11.5px; color:#94a3b8; line-height:1.45; margin-bottom:10px;">
              When set to <strong>Auto-Match by Timeframe</strong>, Trading Cortex automatically looks for a saved Rectangle template matching your current chart timeframe (for example, on the <strong>5m</strong> chart it looks for <code>5m Bullish FVG</code> / <code>5m Bearish FVG</code> &rarr; <code>5m FVG</code> &rarr; <code>FVG</code>). If none exists, it uses the Default FVG Template styling below.
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:8px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Bullish FVG Template</label>
                <select class="vest-ed-select" id="vest-afvg-bull-tpl">
                  <option value="auto" ${fc.bullishTemplateId === 'auto' ? 'selected' : ''}>✨ Auto-Match (e.g. "5m FVG")</option>
                  <option value="default" ${fc.bullishTemplateId === 'default' ? 'selected' : ''}>🎨 Built-In Default Bullish FVG</option>
                  ${rectTemplates.map(t => `
                    <option value="${escapeHtml(t.id)}" ${fc.bullishTemplateId === t.id ? 'selected' : ''}>📦 ${escapeHtml(t.name)}</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Bearish FVG Template</label>
                <select class="vest-ed-select" id="vest-afvg-bear-tpl">
                  <option value="auto" ${fc.bearishTemplateId === 'auto' ? 'selected' : ''}>✨ Auto-Match (e.g. "5m FVG")</option>
                  <option value="default" ${fc.bearishTemplateId === 'default' ? 'selected' : ''}>🎨 Built-In Default Bearish FVG</option>
                  ${rectTemplates.map(t => `
                    <option value="${escapeHtml(t.id)}" ${fc.bearishTemplateId === t.id ? 'selected' : ''}>📦 ${escapeHtml(t.name)}</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Auto-Match Scope</label>
                <select class="vest-ed-select" id="vest-afvg-match-scope">
                  <option value="timeframe-strict" ${fc.autoMatchScope === 'timeframe-strict' ? 'selected' : ''}>Strict Timeframe (e.g. "5m FVG")</option>
                  <option value="timeframe-fallback" ${fc.autoMatchScope === 'timeframe-fallback' ? 'selected' : ''}>Timeframe &rarr; Generic "FVG"</option>
                  <option value="always-default" ${fc.autoMatchScope === 'always-default' ? 'selected' : ''}>Always Use Built-In Default</option>
                </select>
              </div>
            </div>
            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Custom Label Prefix</label>
                <input type="text" class="vest-ed-input" id="vest-afvg-label-prefix" value="${escapeHtml(fc.labelPrefix || '')}" placeholder="e.g. ICT or empty" />
              </div>
              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-afvg-include-tf" ${fc.includeTimeframeInLabel !== false ? 'checked' : ''} />
                  <span>Include Timeframe In Label</span>
                </label>
              </div>
              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-afvg-remove-reclaimed" ${fc.removeOnReclaim ? 'checked' : ''} />
                  <span>Auto-Remove Fully Reclaimed FVG's</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 2: Dedicated Reclaimed FVG's Box -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Reclaimed FVG's Box &amp; Custom Colors
            </div>

            <div class="vest-tvs-toggle-box" style="padding:10px 12px; margin-bottom:10px; background:rgba(255,255,255,0.03);">
              <div class="vest-tvs-toggle-info">
                <div class="vest-tvs-toggle-title">Show Reclaimed FVG's On Chart</div>
                <div class="vest-tvs-toggle-desc">
                  When enabled, Fair Value Gaps that have been mitigated/reclaimed remain visible on the chart using dedicated reclaimed styling and colors.
                </div>
              </div>
              <label class="vest-tvs-switch" title="Toggle Show Reclaimed FVG's on Chart">
                <input type="checkbox" id="vest-afvg-show-reclaimed" ${fc.showReclaimed !== false ? 'checked' : ''} />
                <span class="vest-tvs-switch-slider"></span>
              </label>
            </div>

            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Reclaimed Bullish FVG Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-afvg-rec-bull-color" data-opacity-input="#vest-afvg-rec-opacity" value="${normalizeHexColor(fc.reclaimedBullishColor, '#0d9488')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(fc.reclaimedBullishColor, '#0d9488')}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Reclaimed Bearish FVG Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-afvg-rec-bear-color" data-opacity-input="#vest-afvg-rec-opacity" value="${normalizeHexColor(fc.reclaimedBearishColor, '#991b1b')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(fc.reclaimedBearishColor, '#991b1b')}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Reclaimed Fill Opacity: <span id="vest-afvg-rec-opacity-val">${fc.reclaimedOpacity ?? 10}%</span></label>
                <input type="range" class="vest-ed-range" id="vest-afvg-rec-opacity" min="0" max="85" value="${fc.reclaimedOpacity ?? 10}" />
              </div>
            </div>

            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Reclaimed Border Style</label>
                <select class="vest-ed-select" id="vest-afvg-rec-border-style">
                  <option value="solid" ${fc.reclaimedBorderStyle === 'solid' ? 'selected' : ''}>Solid Line</option>
                  <option value="dashed" ${fc.reclaimedBorderStyle === 'dashed' ? 'selected' : ''}>Dashed Line (---)</option>
                  <option value="dotted" ${fc.reclaimedBorderStyle === 'dotted' ? 'selected' : ''}>Dotted Line (···)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Reclaimed Border Width</label>
                <select class="vest-ed-select" id="vest-afvg-rec-border-width">
                  <option value="1" ${Number(fc.reclaimedBorderWidth) === 1 ? 'selected' : ''}>1px Thin</option>
                  <option value="2" ${Number(fc.reclaimedBorderWidth) === 2 ? 'selected' : ''}>2px Medium</option>
                  <option value="3" ${Number(fc.reclaimedBorderWidth) === 3 ? 'selected' : ''}>3px Thick</option>
                </select>
              </div>
              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-afvg-rec-show-label" ${fc.reclaimedShowLabel !== false ? 'checked' : ''} />
                  <span>Show "[RECLAIMED]" Tag</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 3: Dynamic FVG Extension & Reclaim Mode -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Dynamic FVG Extension &amp; Reclaim Mode
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Unreclaimed Extension Mode</label>
                <select class="vest-ed-select" id="vest-afvg-ext-mode">
                  <option value="far-right" ${(fc.unreclaimedExtensionMode || 'far-right') === 'far-right' ? 'selected' : ''}>Far Right Canvas Edge (Open-Ended)</option>
                  <option value="current-candle" ${fc.unreclaimedExtensionMode === 'current-candle' ? 'selected' : ''}>To Current Forming Candle (+ Extra Bars)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Extra Future Bars Ahead: <span id="vest-afvg-extra-bars-val">${fc.extraBarsAhead ?? 5}</span></label>
                <input type="range" class="vest-ed-range" id="vest-afvg-extra-bars" min="0" max="50" step="1" value="${fc.extraBarsAhead ?? 5}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">FVG Reclaim Fill Threshold</label>
                <select class="vest-ed-select" id="vest-afvg-reclaim-mode">
                  <option value="body-close" ${(fc.reclaimMode || 'body-close') === 'body-close' ? 'selected' : ''}>Candle Body Close (50% CE or Full)</option>
                  <option value="wick-touch" ${fc.reclaimMode === 'wick-touch' ? 'selected' : ''}>Any Wick Touch (First Mitigation)</option>
                  <option value="full-wick-fill" ${fc.reclaimMode === 'full-wick-fill' ? 'selected' : ''}>100% Full Wick Fill Through Box</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 4: Auto FVG Scan Frequency & Candle History -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Scan Engine &amp; History Lookback
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:8px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Max Historical Candles to Scan</label>
                <select class="vest-ed-select" id="vest-afvg-max-candles">
                  ${[100, 200, 300, 500, 800, 1000].map(c => `
                    <option value="${c}" ${Number(fc.maxCandlesToScan) === c ? 'selected' : ''}>${c} Candles</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Min FVG Gap Size (Ticks)</label>
                <input type="number" class="vest-ed-input" id="vest-afvg-min-ticks" min="0" max="100" value="${fc.minGapTicks || 0}" placeholder="0 (All Gaps)" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Scan Frequency</label>
                <select class="vest-ed-select" id="vest-afvg-scan-freq">
                  <option value="on-new-candle" ${fc.scanFrequency === 'on-new-candle' ? 'selected' : ''}>On Every New Candle Close</option>
                  <option value="interval-5s" ${fc.scanFrequency === 'interval-5s' ? 'selected' : ''}>Every 5 Seconds (Real-Time)</option>
                  <option value="interval-15s" ${fc.scanFrequency === 'interval-15s' ? 'selected' : ''}>Every 15 Seconds</option>
                </select>
              </div>
            </div>

            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px; padding-top:8px; border-top:1px solid rgba(148,163,184,0.12);">
              <span style="font-size:11px; color:#94a3b8;">Trading Cortex tracks generated FVG IDs in local storage to prevent duplicate boxes on reload.</span>
              <button type="button" class="vest-tvs-action-btn" id="vest-afvg-clear-log-btn" style="height:24px; padding:0 8px; font-size:10.5px; color:#f87171; border-color:rgba(239,68,68,0.3);">
                Clear FVG History Cache
              </button>
            </div>
          </div>

          <!-- Section 5: Default Fallback FVG Template Styling -->
          <div class="vest-ed-section" style="padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px;">
              Default FVG Fallback Styling
            </div>
            <div style="font-size:11.5px; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
              Used when no matching named Rectangle template is found on the current timeframe.
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Default Bullish FVG Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-afvg-bull-color" data-opacity-input="#vest-afvg-opacity" value="${normalizeHexColor(fc.defaultBullishColor, '#26a69a')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(fc.defaultBullishColor, '#26a69a')}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Default Bearish FVG Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-afvg-bear-color" data-opacity-input="#vest-afvg-opacity" value="${normalizeHexColor(fc.defaultBearishColor, '#ef4444')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(fc.defaultBearishColor, '#ef4444')}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Default Fill Opacity: <span id="vest-afvg-opacity-val">${fc.defaultOpacity}%</span></label>
                <input type="range" class="vest-ed-range" id="vest-afvg-opacity" min="5" max="85" value="${fc.defaultOpacity}" />
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:16px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-afvg-show-midline" ${fc.defaultShowMidline !== false ? 'checked' : ''} />
                <span>Show 50% Consequent Encroachment (CE) Midline</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-afvg-show-label" ${fc.defaultShowLabel !== false ? 'checked' : ''} />
                <span>Show FVG Label (e.g. "5m FVG")</span>
              </label>
            </div>
          </div>
        `;
      }

      function renderNewsBoxSettingsHtml(nc) {
        const renderMiniFolderSvg = (colorHex) => `
          <svg viewBox="0 0 24 24" width="16" height="15" style="flex-shrink:0; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="${colorHex}" stroke="rgba(255,255,255,0.28)" stroke-width="1.3"/>
          </svg>
        `;

        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-nb-refresh-feed-btn" style="height:26px; padding:0 10px; font-size:11px; color:#38bdf8; border-color:rgba(56,189,248,0.4);">
              ↻ Refresh Live Feed
            </button>
            <button type="button" class="vest-tvs-action-btn" id="vest-nb-reset-pos-btn" style="height:26px; padding:0 10px; font-size:11px; color:#cbd5e1;" title="Snap News Box back to the top-left of the screen">
              Center / Reset Position
            </button>
            <button type="button" class="vest-tvs-action-btn" id="vest-nb-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <!-- Section 1: Impact Filter & Event Count -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Economic Impact Filters &amp; Display Limits
            </div>
            <div style="font-size:11.5px; color:#94a3b8; line-height:1.45; margin-bottom:10px;">
              Filter which news tiers appear in the on-chart widget. High-impact Red Folder events (e.g. CPI, FOMC, NFP) provide maximum volatility.
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:16px; margin-bottom:12px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px; display:flex; align-items:center; gap:6px;">
                <input type="checkbox" id="vest-nb-show-red" ${nc.showRedFolders !== false ? 'checked' : ''} />
                ${renderMiniFolderSvg(nc.redFolderColor)}
                <span style="font-weight:600; color:#f87171;">Red Folder (High Impact)</span>
              </label>

              <label class="vest-ed-checkbox-label" style="font-size:12px; display:flex; align-items:center; gap:6px;">
                <input type="checkbox" id="vest-nb-show-yellow" ${nc.showYellowFolders ? 'checked' : ''} />
                ${renderMiniFolderSvg(nc.yellowFolderColor)}
                <span style="font-weight:600; color:#fbbf24;">Yellow Folder (Medium Impact)</span>
              </label>

              <label class="vest-ed-checkbox-label" style="font-size:12px; display:flex; align-items:center; gap:6px;">
                <input type="checkbox" id="vest-nb-show-green" ${nc.showGreenFolders ? 'checked' : ''} />
                ${renderMiniFolderSvg(nc.greenFolderColor)}
                <span style="font-weight:600; color:#34d399;">Green Folder (Low Impact)</span>
              </label>
            </div>

            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Max Events Shown</label>
                <select class="vest-ed-select" id="vest-nb-max-events">
                  ${[3, 4, 5, 6, 8, 10, 12, 15].map(n => `
                    <option value="${n}" ${Number(nc.maxEvents) === n ? 'selected' : ''}>${n} Events</option>
                  `).join('')}
                </select>
              </div>

              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-nb-show-countdown" ${nc.showCountdown !== false ? 'checked' : ''} />
                  <span>Show Live Countdown (e.g. <code>2h 15m</code>)</span>
                </label>
              </div>

              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-nb-show-flag" ${nc.showCountryFlag !== false ? 'checked' : ''} />
                  <span>Show Country Flag &amp; Currency</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 2: Timezone, Time Format & Live Countdowns -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Timezone &amp; Clock Formatting
            </div>
            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Timezone Mode</label>
                <select class="vest-ed-select" id="vest-nb-tz">
                  <option value="ny" ${nc.timeZoneMode === 'ny' ? 'selected' : ''}>New York (EST/EDT)</option>
                  <option value="local" ${nc.timeZoneMode === 'local' ? 'selected' : ''}>Browser Local Time</option>
                  <option value="utc" ${nc.timeZoneMode === 'utc' ? 'selected' : ''}>UTC / GMT</option>
                </select>
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Time Format</label>
                <select class="vest-ed-select" id="vest-nb-time-fmt">
                  <option value="12h" ${nc.timeFormat === '12h' ? 'selected' : ''}>12-Hour (8:30 AM)</option>
                  <option value="24h" ${nc.timeFormat === '24h' ? 'selected' : ''}>24-Hour (08:30)</option>
                </select>
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Title</label>
                <input type="text" class="vest-ed-input" id="vest-nb-title" value="${escapeHtml(nc.boxTitle || 'Upcoming Economic News')}" />
              </div>
            </div>
          </div>

          <!-- Section 3: Widget Width, Colors & Opacity -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Widget Dimensions &amp; Styling
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Width (px): <span id="vest-nb-width-val">${nc.boxWidth || 325}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-nb-width" min="260" max="500" step="5" value="${nc.boxWidth || 325}" />
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Card Background &amp; Opacity (<span id="vest-nb-bg-op-badge">${nc.bgOpacity}%</span>)</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-bg-color" data-opacity-input="#vest-nb-bg-opacity" value="${normalizeHexColor(nc.bgColor, '#131722')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <input type="range" class="vest-ed-range" id="vest-nb-bg-opacity" min="25" max="100" step="1" value="${nc.bgOpacity}" style="flex:1;" />
                </div>
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Border Accent Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-border-color" value="${normalizeHexColor(nc.borderColor, '#38bdf8')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.borderColor, '#38bdf8')}</span>
                </div>
              </div>
            </div>

            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Red Folder Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-red-color" value="${normalizeHexColor(nc.redFolderColor, '#ef4444')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.redFolderColor, '#ef4444')}</span>
                </div>
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Yellow Folder Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-yellow-color" value="${normalizeHexColor(nc.yellowFolderColor, '#eab308')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.yellowFolderColor, '#eab308')}</span>
                </div>
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Green Folder Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-green-color" value="${normalizeHexColor(nc.greenFolderColor, '#22c55e')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.greenFolderColor, '#22c55e')}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4: Add Custom Economic News Event -->
          <div class="vest-ed-section" style="padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">
              Add Custom Economic News Event
            </div>
            <div style="font-size:11.5px; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
              Need to track an unlisted market catalyst, custom speech, or earnings release? Add your own timestamped event below.
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:8px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Event Time (NY Time)</label>
                <input type="time" class="vest-ed-input" id="vest-nb-new-time" value="08:30" style="height:28px; font-family:'JetBrains Mono', monospace;" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Country / Currency</label>
                <select class="vest-ed-select" id="vest-nb-new-country">
                  <option value="USD">🇺🇸 USD (United States)</option>
                  <option value="EUR">🇪🇺 EUR (Euro Area)</option>
                  <option value="GBP">🇬🇧 GBP (United Kingdom)</option>
                  <option value="JPY">🇯🇵 JPY (Japan)</option>
                  <option value="CAD">🇨🇦 CAD (Canada)</option>
                  <option value="AUD">🇦🇺 AUD (Australia)</option>
                  <option value="NZD">🇳🇿 NZD (New Zealand)</option>
                  <option value="CHF">🇨🇭 CHF (Switzerland)</option>
                  <option value="CNY">🇨🇳 CNY (China)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Impact Tier</label>
                <select class="vest-ed-select" id="vest-nb-new-folder">
                  <option value="red">🔴 Red Folder (High)</option>
                  <option value="yellow">🟡 Yellow Folder (Medium)</option>
                  <option value="green">🟢 Green Folder (Low)</option>
                </select>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="text" class="vest-ed-input" id="vest-nb-new-title" placeholder="Event title (e.g. CPI m/m, Unemployment Rate)" style="flex:1;" />
              <button type="button" class="vest-tvs-action-btn" id="vest-nb-add-event-btn" style="height:28px; padding:0 12px; font-size:11.5px; border-color:rgba(56,189,248,0.4); color:#38bdf8;">
                + Add Event
              </button>
            </div>

            ${Array.isArray(nc.customEvents) && nc.customEvents.length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">
                ${nc.customEvents.map((ev, idx) => `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 8px; background:rgba(255,255,255,0.04); border-radius:6px; font-size:11.5px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-family:'JetBrains Mono', monospace; color:#cbd5e1;">${escapeHtml(ev.time)}</span>
                      <span style="font-family:'JetBrains Mono', monospace; font-weight:700; color:#f8fafc;">${getCountryFlagEmoji(ev.country)} ${escapeHtml(ev.country)}</span>
                      ${renderMiniFolderSvg(ev.folder === 'red' ? nc.redFolderColor : (ev.folder === 'yellow' ? nc.yellowFolderColor : nc.greenFolderColor))}
                      <span style="color:#e2e8f0;">${escapeHtml(ev.title)}</span>
                    </div>
                    <button type="button" class="vest-cnb-icon-btn vest-nb-cust-del" data-idx="${idx}" title="Remove custom event" style="color:#f87171;">×</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }

      function renderTradesBoxSettingsHtml(tc, activeSymLabel, matchingTrades) {
        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-tb-scan-now-btn" style="height:26px; padding:0 10px; font-size:11px; color:#34d399; border-color:rgba(16,185,129,0.4);">
              ↻ Sync Positions History
            </button>
            <button type="button" class="vest-tvs-action-btn" id="vest-tb-reset-pos-btn" style="height:26px; padding:0 10px; font-size:11px; color:#38bdf8; border-color:rgba(56,189,248,0.35);">
              Reset Box Position
            </button>
            <button type="button" class="vest-tvs-action-btn" id="vest-tb-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <!-- Section 1: Instrument & Session Filtering -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Session &amp; Instrument Filtering
            </div>
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:16px; margin-bottom:10px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-filter-inst" ${tc.filterCurrentInstrument !== false ? 'checked' : ''} />
                <span>Filter to current instrument only (<strong>${escapeHtml(activeSymLabel)}</strong>)</span>
              </label>

              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-filter-session" ${tc.filterCurrentSessionOnly !== false ? 'checked' : ''} />
                <span>Current ET Trading Session only (<strong>6 PM ET &rarr; 4:59 PM ET</strong>)</span>
              </label>

              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-auto-capture" ${tc.autoCaptureTrades !== false ? 'checked' : ''} />
                <span>Auto-capture newly closed positions in background</span>
              </label>
            </div>
            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Timezone</label>
                <select class="vest-ed-select" id="vest-tb-tz">
                  <option value="ny" ${tc.timeZoneMode === 'ny' ? 'selected' : ''}>New York (EST/EDT)</option>
                  <option value="local" ${tc.timeZoneMode === 'local' ? 'selected' : ''}>Browser Local Time</option>
                  <option value="utc" ${tc.timeZoneMode === 'utc' ? 'selected' : ''}>UTC / GMT</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Time Format</label>
                <select class="vest-ed-select" id="vest-tb-time-fmt">
                  <option value="12h" ${tc.timeFormat === '12h' ? 'selected' : ''}>12-Hour (8:30 AM)</option>
                  <option value="24h" ${tc.timeFormat === '24h' ? 'selected' : ''}>24-Hour (08:30)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Max Trades Listed</label>
                <select class="vest-ed-select" id="vest-tb-max-trades">
                  ${[4, 6, 8, 10, 12, 15, 20, 30].map(n => `
                    <option value="${n}" ${Number(tc.maxTrades) === n ? 'selected' : ''}>${n} Trades</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Section 2: Trades Box Title & Dimensions -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Trades Box Title &amp; Dimensions
            </div>
            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Custom Box Title</label>
                <input type="text" class="vest-ed-input" id="vest-tb-title" value="${escapeHtml(tc.boxTitle || 'Instrument Trades')}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Width (px): <span id="vest-tb-width-val">${tc.boxWidth || 505}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-tb-width" min="360" max="680" step="5" value="${tc.boxWidth || 505}" />
              </div>
              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-tb-show-summary" ${tc.showSummaryFooter !== false ? 'checked' : ''} />
                  <span>Show Total PnL &amp; Win Rate Summary Footer</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 3: Background & Row Highlight Colors -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Background &amp; Row Highlight Colors
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Card Background &amp; Opacity (<span id="vest-tb-bg-op-badge">${tc.bgOpacity}%</span>)</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-bg-color" data-opacity-input="#vest-tb-bg-opacity" value="${normalizeHexColor(tc.bgColor, '#131722')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <input type="range" class="vest-ed-range" id="vest-tb-bg-opacity" min="25" max="100" step="1" value="${tc.bgOpacity}" style="flex:1;" />
                </div>
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Border Accent Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-border-color" value="${normalizeHexColor(tc.borderColor, '#38bdf8')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <span style="font-size:11.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(tc.borderColor, '#38bdf8')}</span>
                </div>
              </div>

              <div class="vest-ed-field" style="display:flex; align-items:center; gap:8px; padding-top:14px;">
                <label class="vest-ed-checkbox-label" style="font-size:12px;">
                  <input type="checkbox" id="vest-tb-show-side" ${tc.showSideBadge !== false ? 'checked' : ''} />
                  <span>Show Long / Short Side Badges</span>
                </label>
              </div>
            </div>

            <div class="vest-ed-grid-2">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Winning Trade Row Tint &amp; Opacity (<span id="vest-tb-win-op-badge">${tc.winRowOpacity}%</span>)</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-win-color" data-opacity-input="#vest-tb-win-opacity" value="${normalizeHexColor(tc.winRowColor, '#10b981')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <input type="range" class="vest-ed-range" id="vest-tb-win-opacity" min="8" max="85" step="1" value="${tc.winRowOpacity}" style="flex:1;" />
                </div>
              </div>

              <div class="vest-ed-field">
                <label class="vest-ed-label">Losing Trade Row Tint &amp; Opacity (<span id="vest-tb-loss-op-badge">${tc.lossRowOpacity}%</span>)</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-loss-color" data-opacity-input="#vest-tb-loss-opacity" value="${normalizeHexColor(tc.lossRowColor, '#f23645')}" style="width:34px; height:28px; padding:0; border-radius:6px; cursor:pointer;" />
                  <input type="range" class="vest-ed-range" id="vest-tb-loss-opacity" min="8" max="85" step="1" value="${tc.lossRowOpacity}" style="flex:1;" />
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4: Long/Short Pill Badges Styling -->
          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Long / Short Pill Badges Styling
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Side Badge Font Family</label>
                <select class="vest-ed-select" id="vest-tb-side-font-family">
                  ${SESSION_FONT_FAMILIES.map(f => `
                    <option value="${escapeHtml(f.id)}" ${f.id === (tc.sideBadgeFontFamily || 'Inter') ? 'selected' : ''}>${escapeHtml(f.label)}</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Badge Font Size: <span id="vest-tb-side-fontsize-val">${tc.sideBadgeFontSize ?? 9.5}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-tb-side-font-size" min="7" max="15" step="0.5" value="${tc.sideBadgeFontSize ?? 9.5}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Font Weight / Style</label>
                <select class="vest-ed-select" id="vest-tb-side-font-style">
                  <option value="bold" ${(tc.sideBadgeFontStyle || 'bold') === 'bold' ? 'selected' : ''}>Bold (700)</option>
                  <option value="600" ${tc.sideBadgeFontStyle === '600' ? 'selected' : ''}>Semi-Bold (600)</option>
                  <option value="normal" ${tc.sideBadgeFontStyle === 'normal' ? 'selected' : ''}>Normal (400)</option>
                </select>
              </div>
            </div>

            <!-- Long Badge Controls -->
            <div class="vest-ed-grid-3" style="margin-bottom:8px; padding:8px 10px; background:rgba(56,189,248,0.06); border-radius:8px; align-items:center;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">LONG Text Color</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-long-text-color" value="${normalizeHexColor(tc.longBadgeTextColor, '#38bdf8')}" style="width:28px; height:24px; padding:0; border-radius:5px;" />
                  <span style="font-size:11px; color:#cbd5e1; font-family:monospace;">${normalizeHexColor(tc.longBadgeTextColor, '#38bdf8')}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">LONG Background &amp; Opacity (<span id="vest-tb-long-bg-op-badge">${tc.longBadgeBgOpacity ?? 85}%</span>)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-long-bg-color" data-opacity-input="#vest-tb-long-bg-opacity" value="${normalizeHexColor(tc.longBadgeBgColor, '#0f172a')}" style="width:28px; height:24px; padding:0; border-radius:5px;" />
                  <input type="range" class="vest-ed-range" id="vest-tb-long-bg-opacity" min="0" max="100" step="5" value="${tc.longBadgeBgOpacity ?? 85}" style="flex:1;" />
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">LONG Border &amp; Preview</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-long-border-color" value="${normalizeHexColor(tc.longBadgeBorderColor, '#38bdf8')}" style="width:28px; height:24px; padding:0; border-radius:5px;" />
                  <span id="vest-tb-long-badge-preview" style="${buildSideBadgeInlineStyle('LONG', tc)}">LONG</span>
                </div>
              </div>
            </div>

            <!-- Short Badge Controls -->
            <div class="vest-ed-grid-3" style="padding:8px 10px; background:rgba(251,191,36,0.06); border-radius:8px; align-items:center;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">SHORT Text Color</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-short-text-color" value="${normalizeHexColor(tc.shortBadgeTextColor, '#fbbf24')}" style="width:28px; height:24px; padding:0; border-radius:5px;" />
                  <span style="font-size:11px; color:#cbd5e1; font-family:monospace;">${normalizeHexColor(tc.shortBadgeTextColor, '#fbbf24')}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">SHORT Background &amp; Opacity (<span id="vest-tb-short-bg-op-badge">${tc.shortBadgeBgOpacity ?? 85}%</span>)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-short-bg-color" data-opacity-input="#vest-tb-short-bg-opacity" value="${normalizeHexColor(tc.shortBadgeBgColor, '#0f172a')}" style="width:28px; height:24px; padding:0; border-radius:5px;" />
                  <input type="range" class="vest-ed-range" id="vest-tb-short-bg-opacity" min="0" max="100" step="5" value="${tc.shortBadgeBgOpacity ?? 85}" style="flex:1;" />
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">SHORT Border &amp; Preview</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-short-border-color" value="${normalizeHexColor(tc.shortBadgeBorderColor, '#fbbf24')}" style="width:28px; height:24px; padding:0; border-radius:5px;" />
                  <span id="vest-tb-short-badge-preview" style="${buildSideBadgeInlineStyle('SHORT', tc)}">SHORT</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 5: Current ET Session Closed Trades -->
          <div class="vest-ed-section" style="padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px;">
                Captured Closed Positions (${matchingTrades.length} in Active Session)
              </div>
              <button type="button" class="vest-tvs-action-btn" id="vest-tb-clear-history-btn" style="height:24px; padding:0 8px; font-size:10.5px; color:#f87171; border-color:rgba(239,68,68,0.3);">
                Clear Trades History
              </button>
            </div>

            ${matchingTrades.length === 0 ? `
              <div style="padding:16px; text-align:center; font-size:12px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:8px;">
                No closed positions recorded for <strong>${escapeHtml(activeSymLabel)}</strong> in the active session yet. Newly closed trades are captured automatically, or click <strong>Sync Positions History</strong> above.
              </div>
            ` : `
              <div style="max-height:160px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
                ${matchingTrades.slice(0, 15).map(t => {
                  const isWin = Number(t.pnl) >= 0;
                  const durStr = formatTradeDuration(t.durationMs);
                  return `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:5px 8px; background:rgba(255,255,255,0.03); border-radius:6px; font-size:11px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="${buildSideBadgeInlineStyle(t.side, tc)}">${escapeHtml(t.side)}</span>
                        <span style="font-family:'JetBrains Mono', monospace; font-weight:600; color:#f8fafc;">${escapeHtml(t.symbol || activeSymLabel)}</span>
                        <span style="color:#94a3b8; font-size:10px;">${durStr}</span>
                      </div>
                      <div style="font-family:'JetBrains Mono', monospace; font-weight:700; color:${isWin ? '#34d399' : '#f87171'};">
                        ${Number(t.pnl) >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        `;
      }

      function renderCandleOhlcSettingsHtml(co) {
        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-co-clear-clicked-btn" style="height:28px; padding:0 10px; font-size:11.5px;" title="Turn off all individually clicked candle OHLC labels">
              Clear Clicked Candles
            </button>
            <button type="button" class="vest-tvs-action-btn" id="vest-co-reset-defaults-btn" style="height:28px; padding:0 10px; font-size:11.5px; border-color:rgba(248,113,113,0.35); color:#f87171;" title="Reset Candle settings to factory defaults">
              Reset Defaults
            </button>
          </div>

          <div class="vest-tvs-toggle-box" style="margin-bottom:10px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Number Candles Backward (#1 = Current Forming Candle → #${co.candleNumbersMax})</div>
              <div class="vest-tvs-toggle-desc">
                Labels each candle with its bar number in a small outlined box right below the candle's low wick, starting at <strong>#1</strong> on the current forming candle and counting backward up to ${co.candleNumbersMax} candles.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Bar #1–#${co.candleNumbersMax} Outlined Boxes on Chart">
              <input type="checkbox" id="vest-co-show-numbers" ${co.showCandleNumbers ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(56,189,248,0.04); border:1px solid rgba(56,189,248,0.18); border-radius:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px;">
                Candle Numbering Box &amp; Candle Body Size / Spacing
              </div>
              <label class="vest-ed-checkbox-label" style="font-size:11.5px; color:#e2e8f0;" title="Resize candle bodies &amp; proportionally space out adjacent candles left and right so they never overlap">
                <input type="checkbox" id="vest-co-custom-width-enabled" ${co.customCandleWidthEnabled ? 'checked' : ''} />
                <span>Scale Width &amp; Space Out Candles</span>
              </label>
            </div>

            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Candle Numbers Range (<span id="vest-co-num-max-val">#1–#${co.candleNumbersMax}</span>)</label>
                <input type="range" class="vest-ed-range" id="vest-co-num-max" min="10" max="300" step="5" value="${co.candleNumbersMax}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Number Font Size (<span id="vest-co-num-fontsize-val">${co.candleNumberFontSize}px</span>)</label>
                <input type="range" class="vest-ed-range" id="vest-co-num-font-size" min="7.5" max="14" step="0.5" value="${co.candleNumberFontSize}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Candle Width Scale (<span id="vest-co-width-val">${co.candleWidthPx || 140}%</span>)</label>
                <input type="range" class="vest-ed-range" id="vest-co-candle-width" min="40" max="260" step="5" value="${co.candleWidthPx || 140}" />
              </div>
            </div>

            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Number Box Glow Border</label>
                <div class="vest-ed-color-wrap" style="height:28px; padding:0 8px;">
                  <input type="color" id="vest-co-num-glow-color" value="${co.candleNumberGlowColor}" />
                  <span style="font-size:11px; font-family:monospace; color:#d1d4dc;">${co.candleNumberGlowColor}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Number Text Color</label>
                <div class="vest-ed-color-wrap" style="height:28px; padding:0 8px;">
                  <input type="color" id="vest-co-num-text-color" value="${co.candleNumberTextColor}" />
                  <span style="font-size:11px; font-family:monospace; color:#d1d4dc;">${co.candleNumberTextColor}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Background &amp; Opacity (<span id="vest-co-num-bg-op-val">${co.candleNumberBgOpacity ?? 90}%</span>)</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" id="vest-co-num-bg-color" value="${co.candleNumberBgColor}" style="width:28px; height:26px; border:none; background:transparent; cursor:pointer; padding:0;" />
                  <input type="range" class="vest-ed-range" id="vest-co-num-bg-opacity" min="20" max="100" step="5" value="${co.candleNumberBgOpacity ?? 90}" style="flex:1;" />
                </div>
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Values Displayed &amp; Click Behavior
            </div>
            <div class="vest-ed-grid-2" style="margin-bottom:10px;">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-co-click-toggle" ${co.clickCandleToToggle ? 'checked' : ''} />
                <span>Click individual candles to toggle their OHLC label ON / OFF</span>
              </label>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:10px;">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-co-show-open" ${co.showOpen ? 'checked' : ''} />
                <span>Show Open (O)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-co-show-high" ${co.showHigh ? 'checked' : ''} />
                <span>Show High (H)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-co-show-low" ${co.showLow ? 'checked' : ''} />
                <span>Show Low (L)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-co-show-close" ${co.showClose ? 'checked' : ''} />
                <span>Show Close (C)</span>
              </label>
            </div>
            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Display Style</label>
                <select class="vest-ed-select" id="vest-co-display-mode">
                  <option value="badge" ${co.displayMode === 'badge' ? 'selected' : ''}>Compact Card (Above / Below Candle)</option>
                  <option value="levels" ${co.displayMode === 'levels' ? 'selected' : ''}>Level Tags (On O/H/L/C)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Price Decimals</label>
                <select class="vest-ed-select" id="vest-co-decimals">
                  <option value="auto" ${co.decimals === 'auto' ? 'selected' : ''}>Auto (Instrument Precision)</option>
                  <option value="0" ${co.decimals === '0' ? 'selected' : ''}>0 (e.g. 68000)</option>
                  <option value="1" ${co.decimals === '1' ? 'selected' : ''}>1 (e.g. 68000.5)</option>
                  <option value="2" ${co.decimals === '2' ? 'selected' : ''}>2 (e.g. 68000.50)</option>
                  <option value="3" ${co.decimals === '3' ? 'selected' : ''}>3 (e.g. 68000.500)</option>
                  <option value="4" ${co.decimals === '4' ? 'selected' : ''}>4 (e.g. 68000.5000)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Font Size (<span id="vest-co-fontsize-val">${co.fontSize}px</span>)</label>
                <input type="range" class="vest-ed-range" id="vest-co-font-size" min="8" max="15" step="0.5" value="${co.fontSize}" />
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:8px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Badge &amp; Accent Colors
            </div>
            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Card Background &amp; Opacity (<span id="vest-co-bg-op-badge">${co.bgOpacity}%</span>)</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" id="vest-co-bg-color" value="${co.bgColor}" style="width:28px; height:26px; border:none; background:transparent; cursor:pointer; padding:0;" />
                  <input type="range" class="vest-ed-range" id="vest-co-bg-opacity" min="25" max="100" step="1" value="${co.bgOpacity}" style="flex:1;" />
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Value Text Color</label>
                <div class="vest-ed-color-wrap" style="height:28px; padding:0 8px;">
                  <input type="color" id="vest-co-text-color" value="${co.textColor}" />
                  <span style="font-size:11px; font-family:monospace; color:#d1d4dc;">${co.textColor}</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Bullish / Bearish Border Accent</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="vest-ed-color-wrap" style="height:28px; padding:0 6px; flex:1;" title="Bullish Candle Accent">
                    <input type="color" id="vest-co-bull-color" value="${co.bullColor}" />
                    <span style="font-size:10.5px; font-family:monospace; color:#d1d4dc;">Bull</span>
                  </div>
                  <div class="vest-ed-color-wrap" style="height:28px; padding:0 6px; flex:1;" title="Bearish Candle Accent">
                    <input type="color" id="vest-co-bear-color" value="${co.bearColor}" />
                    <span style="font-size:10.5px; font-family:monospace; color:#d1d4dc;">Bear</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      function renderPositionHudSettingsHtml(ph) {
        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-ph-reset-defaults-btn" style="height:28px; padding:0 10px; font-size:11.5px; border-color:rgba(248,113,113,0.35); color:#f87171;" title="Reset Position HUD to factory defaults">
              Reset Defaults
            </button>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(234,179,8,0.04); border:1px solid rgba(234,179,8,0.2); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#eab308; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">
              Yellow Current Price Line Overlay
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div class="vest-tvs-toggle-box" style="margin-bottom:0; background:transparent; border:none; padding:0;">
                <div class="vest-tvs-toggle-info">
                  <div class="vest-tvs-toggle-title">Show Live PnL Box on Yellow Price Line</div>
                  <div class="vest-tvs-toggle-desc">
                    Rectangle box that dynamically moves vertically with the yellow current price line, showing the estimated dollar amount you will make/lose if you close 100% of your position right at that price tick.
                  </div>
                </div>
                <label class="vest-tvs-switch" title="Toggle Live PnL Box on Yellow Price Line">
                  <input type="checkbox" id="vest-ph-price-line" ${ph.showPriceLineHud ? 'checked' : ''} />
                  <span class="vest-tvs-switch-slider"></span>
                </label>
              </div>

              <div class="vest-tvs-toggle-box" style="margin-bottom:0; background:transparent; border:none; padding:0;">
                <div class="vest-tvs-toggle-info">
                  <div class="vest-tvs-toggle-title">Show Quick Flatten [ ✕ ] Button next to Price Line PnL</div>
                  <div class="vest-tvs-toggle-desc">
                    Adds a tactile red <strong>[ ✕ ]</strong> button right beside the price line PnL box to completely flatten (market close 100% of) your open position in a single click.
                  </div>
                </div>
                <label class="vest-tvs-switch" title="Toggle Quick Flatten Button on Price Line">
                  <input type="checkbox" id="vest-ph-flatten-btn" ${ph.showFlattenBtn ? 'checked' : ''} />
                  <span class="vest-tvs-switch-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(56,189,248,0.04); border:1px solid rgba(56,189,248,0.2); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">
              Chart Entry Box PnL Badge
            </div>
            <div class="vest-tvs-toggle-box" style="margin-bottom:0; background:transparent; border:none; padding:0;">
              <div class="vest-tvs-toggle-info">
                <div class="vest-tvs-toggle-title">Show Unclipped PnL Badge Immediately to Left of Entry Box</div>
                <div class="vest-tvs-toggle-desc">
                  Places a clean, full-width badge (e.g. <strong>[ PNL +$0.14 ]</strong>) directly to the left of TradingView's native entry box so the dollar return is never truncated with ellipses.
                </div>
              </div>
              <label class="vest-tvs-switch" title="Toggle Entry Box Left PnL Badge">
                <input type="checkbox" id="vest-ph-entry-badge" ${ph.showEntryBadge ? 'checked' : ''} />
                <span class="vest-tvs-switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Display Formatting &amp; Execution
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-ph-pnl-percent" ${ph.showPnlPercent ? 'checked' : ''} />
                <span>Show Return Percentage Alongside Dollar PnL (e.g. <strong>+$0.14 (+0.05%)</strong>)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-ph-auto-confirm" ${ph.autoConfirmFlatten ? 'checked' : ''} />
                <span>Auto-Confirm Platform Close Confirmation Dialog when Clicking Flatten [ ✕ ]</span>
              </label>
            </div>
          </div>
        `;
      }

      function renderFailLinesSettingsHtml(cfg) {
        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-fail-lines-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <p style="font-size:12px;color:#a1a1aa;line-height:1.5;margin:0 0 14px;">Shows Vest's current Long and Short fail prices as horizontal chart lines. The lines update as the prices in the order panel change.</p>
          <div style="margin-top:16px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <label for="vest-fail-lines-label-size" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin-bottom:8px;">Label size <span id="vest-fail-lines-label-size-value" style="color:#38bdf8;">${cfg.labelSize}%</span></label>
            <input id="vest-fail-lines-label-size" type="range" min="75" max="150" step="5" value="${cfg.labelSize}" style="width:100%;accent-color:#0ea5e9;" />
            <label for="vest-fail-lines-font-size" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin:14px 0 8px;">Font size <span id="vest-fail-lines-font-size-value" style="color:#38bdf8;">${cfg.fontSize}px</span></label>
            <input id="vest-fail-lines-font-size" type="range" min="8" max="18" step="1" value="${cfg.fontSize}" style="width:100%;accent-color:#0ea5e9;" />
          </div>
        `;
      }

      function renderCortexIndicatorSettingsHtml(cfg) {
        const range = (id, label, min, max, step, value, unit = '') => `
          <label for="${id}" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin:14px 0 7px;">${label}<span id="${id}-value" style="color:#38bdf8;">${value}${unit}</span></label>
          <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" style="width:100%;accent-color:#0ea5e9;" />`;

        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-ci-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 14px;">A configurable trend-following prototype inspired by the supplied chart: ATR trend bands, a shaded EMA channel, trend-flip markers, projected risk/targets, and multi-timeframe direction.</p>
          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            ${range('vest-ci-ema-length', 'EMA channel length', 5, 100, 1, cfg.emaLength)}
            ${range('vest-ci-atr-length', 'ATR length', 3, 50, 1, cfg.atrLength)}
            ${range('vest-ci-trend-multiplier', 'Trend stop multiplier', 1, 6, 0.1, cfg.trendMultiplier, '×')}
          </div>
          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <label for="vest-ci-distance-mode" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:8px;">Entry, stop &amp; target distance</label>
            <select id="vest-ci-distance-mode" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
              <option value="points" ${cfg.levelDistanceMode === 'points' ? 'selected' : ''}>Fixed chart points</option>
              <option value="atr" ${cfg.levelDistanceMode === 'atr' ? 'selected' : ''}>ATR-based (current trend stop)</option>
            </select>
            ${range('vest-ci-stop-points', 'Stop loss distance', 1, 20, 0.25, cfg.stopLossPoints, ' pts')}
            ${range('vest-ci-target-spacing', 'Distance between target levels', 0.25, 20, 0.25, cfg.targetSpacingPoints, ' pts')}
            ${range('vest-ci-level-font-size', 'Level label font size', 8, 24, 1, cfg.levelFontSize, ' px')}
            ${range('vest-ci-level-box-scale', 'Level label box size', 75, 200, 5, cfg.levelBoxScale, '%')}
          </div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px;">
            <label class="vest-ed-checkbox-label"><input type="checkbox" id="vest-ci-show-signals" ${cfg.showSignals ? 'checked' : ''} /><span>Show Buy/Sell trend-flip markers</span></label>
            <label class="vest-ed-checkbox-label"><input type="checkbox" id="vest-ci-show-targets" ${cfg.showTargets ? 'checked' : ''} /><span>Show latest entry, stop loss, and three targets</span></label>
            <label class="vest-ed-checkbox-label"><input type="checkbox" id="vest-ci-show-table" ${cfg.showTrendTable ? 'checked' : ''} /><span>Show multi-timeframe trend table</span></label>
          </div>
          <div style="margin-top:16px;padding:14px;border:1px solid #334155;border-radius:8px;background:#11151d;">
            <div class="vest-tvs-section-title">SIGNAL AUTOMATION</div>
            <p style="font-size:11px;color:#a1a1aa;line-height:1.5;margin:0 0 12px;">Uses the last closed Cortex Indicator bar. Paper mode simulates 25% exits at each target and moves the stop to entry, then the prior target. Opposing signals are ignored for the first five bars after entry.</p>
            <label class="vest-ed-checkbox-label"><input type="checkbox" id="vest-ci-execution-enabled" ${cfg.executionEnabled ? 'checked' : ''} /><span>Enable signal automation</span></label>
            <label for="vest-ci-execution-mode" style="display:block;font-size:12px;color:#e4e4e7;margin:13px 0 7px;">Execution mode</label>
            <select id="vest-ci-execution-mode" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
              <option value="paper" ${cfg.executionMode !== 'live' ? 'selected' : ''}>Paper testing (no orders sent)</option>
              <option value="live" ${cfg.executionMode === 'live' ? 'selected' : ''}>Live Vest orders</option>
            </select>
            <label class="vest-ed-checkbox-label" style="margin-top:12px;"><input type="checkbox" id="vest-ci-live-armed" disabled ${cfg.liveArmed ? 'checked' : ''} /><span>Live arm switch (locked until order workflow is verified)</span></label>
            <div style="margin-top:9px;padding:9px;border-radius:6px;background:#2a1717;color:#fca5a5;font-size:11px;line-height:1.45;">Signal-driven Live automation remains locked and will not submit orders. The chart’s LIVE BUY button is a separate manual flow: it submits a market buy after its confirmation, attaches the configured stop, waits for the position, then submits three reduce-only limit targets at approximately 25% of the filled size each (rounded to the instrument size precision). It can place real orders regardless of the Paper/Live selector above. The manual flow does not yet move the stop after target fills.</div>
            ${range('vest-ci-reversal-ignore-bars', 'Ignore opposing signals for', 0, 20, 1, cfg.reversalIgnoreBars, ' bars')}
            <div id="vest-ci-execution-status" role="status" style="margin-top:8px;color:${!cfg.executionEnabled ? '#94a3b8' : !cfg.enabled ? '#fca5a5' : cfg.executionMode === 'paper' ? '#34d399' : '#fca5a5'};font-size:11px;">${!cfg.executionEnabled ? 'Automation is off.' : !cfg.enabled ? 'Turn on Show Cortex Indicator to generate signals.' : cfg.executionMode === 'paper' ? 'Paper simulation is active; no orders will be sent.' : 'Live mode is locked until the Vest order adapter is verified.'}</div>
          </div>
          <div style="margin-top:12px;font-size:11px;color:#94a3b8;line-height:1.5;">Signals are generated when the ATR trend direction flips. Fixed-point mode defaults to an 8-point stop and targets 4, 8, and 12 points from entry.</div>
        `;
      }


      

      function renderAccountsRiskSettingsHtml(arb) {
        const currentSnaps = typeof getMergedAccountSnapshotsList === 'function' ? getMergedAccountSnapshotsList() : [];
        const savedRowsHtml = currentSnaps.length > 0
          ? currentSnaps.map(acc => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:5px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);font-size:11px;">
                <span style="color:#f8fafc;font-weight:600;">${escapeHtml(acc.name || acc.id)}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="color:#38bdf8;font-family:monospace;">${acc.balance !== null && Number.isFinite(acc.balance) ? `$${acc.balance.toFixed(2)}` : '--'}</span>
                  <button type="button" class="vest-arb-remove-acc-btn" data-acc-key="${escapeHtml(acc.key || '')}" style="background:rgba(239,68,68,0.16);border:1px solid rgba(239,68,68,0.35);color:#fca5a5;border-radius:4px;padding:1px 6px;font-size:10px;cursor:pointer;" title="Remove from list">✕</button>
                </div>
              </div>
            `).join('')
          : `<div style="font-size:11px;color:#64748b;padding:4px 0;">Accounts are automatically discovered as you view or open them across browser tabs.</div>`;

        return `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;padding:14px;border-radius:8px;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.22);">
            <div>
              <label for="vest-arb-risk-pct" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Risk Per Trade (% of Balance)</label>
              <div style="display:flex;align-items:center;gap:6px;">
                <input type="number" id="vest-arb-risk-pct" min="0.05" max="50" step="0.1" value="${arb.riskPercent}" style="width:100%;padding:7px 8px;border-radius:6px;background:#0b0e14;color:#f8fafc;border:1px solid #343a46;font-family:monospace;font-weight:700;">
                <span style="color:#94a3b8;font-size:12px;font-weight:700;">%</span>
              </div>
              <div style="display:flex;gap:4px;margin-top:6px;">
                ${[0.5, 1, 2, 3, 5].map(p => `<button type="button" class="vest-arb-preset-pct" data-pct="${p}" style="flex:1;padding:3px 0;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;background:${Number(arb.riskPercent) === p ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.06)'};border:1px solid ${Number(arb.riskPercent) === p ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.12)'};color:#f8fafc;">${p}%</button>`).join('')}
              </div>
            </div>
            <div>
              <label for="vest-arb-width" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Box Width (<span id="vest-arb-width-val">${arb.boxWidth}px</span>)</label>
              <input type="range" id="vest-arb-width" min="200" max="480" step="4" value="${arb.boxWidth}" style="width:100%;margin-top:2px;">
              <label for="vest-arb-font-size" style="display:block;font-size:12px;color:#e4e4e7;margin:8px 0 4px;">Font Size (<span id="vest-arb-fontsize-val">${arb.fontSize}px</span>)</label>
              <input type="range" id="vest-arb-font-size" min="8" max="18" step="0.5" value="${arb.fontSize}" style="width:100%;">
              <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11.5px;color:#cbd5e1;cursor:pointer;">
                <input type="checkbox" id="vest-arb-show-other-pnl" ${arb.showOtherPnl !== false ? 'checked' : ''} />
                Show other-instrument Open PnL when flat
              </label>
            </div>
            <div>
              <label for="vest-arb-bg-opacity" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Background Opacity (<span id="vest-arb-opacity-val">${arb.bgOpacity}%</span>)</label>
              <input type="range" id="vest-arb-bg-opacity" min="20" max="100" step="2" value="${arb.bgOpacity}" style="width:100%;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">
                <div>
                  <label for="vest-arb-offset-x" style="display:block;font-size:10.5px;color:#94a3b8;margin-bottom:3px;">Left Offset (px)</label>
                  <input type="number" id="vest-arb-offset-x" min="4" max="400" step="2" value="${arb.offsetX}" style="width:100%;padding:4px 6px;border-radius:5px;background:#0b0e14;color:#f8fafc;border:1px solid #343a46;font-family:monospace;font-size:11px;">
                </div>
                <div>
                  <label for="vest-arb-offset-y" style="display:block;font-size:10.5px;color:#94a3b8;margin-bottom:3px;">Top Offset (px)</label>
                  <input type="number" id="vest-arb-offset-y" min="4" max="400" step="2" value="${arb.offsetY}" style="width:100%;padding:4px 6px;border-radius:5px;background:#0b0e14;color:#f8fafc;border:1px solid #343a46;font-family:monospace;font-size:11px;">
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-end;gap:8px;">
              <div style="flex:1;">
                <label for="vest-arb-border-color" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Accent Border</label>
                <input type="color" id="vest-arb-border-color" value="${arb.borderColor || '#38bdf8'}" style="width:100%;height:32px;border:none;border-radius:6px;background:transparent;cursor:pointer;">
              </div>
              <button type="button" class="vest-tvs-action-btn" id="vest-arb-reset-pos-btn" style="height:32px;padding:0 10px;font-size:11px;white-space:nowrap;">Reset Top-Left</button>
            </div>
          </div>

          <div style="margin-top:12px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:12px;font-weight:700;color:#f8fafc;">Firm Accounts (${currentSnaps.length})</span>
              <div style="display:flex;gap:6px;">
                <button type="button" id="vest-arb-scan-accounts-btn" style="background:rgba(56,189,248,0.16);border:1px solid rgba(56,189,248,0.4);color:#7dd3fc;border-radius:5px;padding:3px 8px;font-size:10.5px;cursor:pointer;">Scan Firm Accounts</button>
                <button type="button" id="vest-arb-clear-accounts-btn" style="background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;border-radius:5px;padding:3px 8px;font-size:10.5px;cursor:pointer;">Clear Cached</button>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;max-height:140px;overflow-y:auto;">
              ${savedRowsHtml}
            </div>
          </div>
        `;
      }

      function renderRangeDetectorSettingsHtml(rd) {
        return `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;padding:14px;border-radius:8px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.22);">
            <div>
              <label for="vest-rd-lookback" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Lookback Period (Bars)</label>
              <input type="number" id="vest-rd-lookback" min="10" max="50" value="${rd.lookbackBars}" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
            </div>
            <div>
              <label for="vest-rd-mode" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Detection Engine</label>
              <select id="vest-rd-mode" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
                <option value="hybrid" ${rd.detectionMode === 'hybrid' ? 'selected' : ''}>Hybrid (Choppiness + ADX)</option>
                <option value="chop" ${rd.detectionMode === 'chop' ? 'selected' : ''}>Choppiness Index Only</option>
                <option value="adx" ${rd.detectionMode === 'adx' ? 'selected' : ''}>ADX Threshold Only</option>
                <option value="channel" ${rd.detectionMode === 'channel' ? 'selected' : ''}>High/Low Range Channel</option>
              </select>
            </div>
            <div>
              <label for="vest-rd-chop-thresh" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Choppiness Threshold (≥ Ranging)</label>
              <input type="number" id="vest-rd-chop-thresh" min="35" max="80" value="${rd.chopThreshold}" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
            </div>
            <div>
              <label for="vest-rd-adx-thresh" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">ADX Threshold (≤ Ranging)</label>
              <input type="number" id="vest-rd-adx-thresh" min="10" max="40" value="${rd.adxThreshold}" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
            </div>
            <div>
              <label for="vest-rd-opacity" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Box Opacity (%)</label>
              <input type="range" id="vest-rd-opacity" min="30" max="100" value="${rd.bgOpacity}" style="width:100%;">
            </div>
            <div>
              <label for="vest-rd-width" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Box Width (px)</label>
              <input type="number" id="vest-rd-width" min="240" max="450" value="${rd.boxWidth}" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
            </div>
            <div style="grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:16px;margin-top:6px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#e4e4e7;cursor:pointer;">
                <input type="checkbox" id="vest-rd-voice-alert" ${rd.voiceAlertEnabled ? 'checked' : ''}>
                <span>Voice Speech Alert ("Range detected on...")</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#e4e4e7;cursor:pointer;">
                <input type="checkbox" id="vest-rd-chime-alert" ${rd.chimeAlertEnabled ? 'checked' : ''}>
                <span>Chime Sound Alert</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#e4e4e7;cursor:pointer;">
                <input type="checkbox" id="vest-rd-glow-effect" ${rd.glowEffect ? 'checked' : ''}>
                <span>Blue Glowing Halo Effect</span>
              </label>
            </div>
            <div style="grid-column:1 / -1;display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
              <button type="button" class="vest-tvs-action-btn" id="vest-rd-reset-pos-btn" style="padding:6px 12px;font-size:11px;">Reset Box Position</button>
              <button type="button" class="vest-tvs-action-btn" id="vest-rd-reset-defaults-btn" style="padding:6px 12px;font-size:11px;">Reset Defaults</button>
            </div>
          </div>
        `;
      }

      function renderMarketStructureSettingsHtml(ms) {
        const range = (id, label, min, max, step, value, unit = '') => `
          <label for="${id}" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin:12px 0 6px;">${label}<span id="${id}-value" style="color:#06b6d4;">${value}${unit}</span></label>
          <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" style="width:100%;accent-color:#06b6d4;" />`;

        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-ms-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 14px;">
            Identifies trend continuation and reversal pivots using Smart Money Concepts (SMC): Break of Structure (BOS) confirms continuation, while Change of Character (CHoCH / MSS) signals institutional market structure shifts.
          </p>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">STRUCTURE DETECTION &amp; SENSITIVITY</div>
            ${range('vest-ms-swing-lookback', 'Swing High/Low Lookback', 3, 20, 1, ms.swingLookback, ' bars')}
            ${range('vest-ms-max-lines', 'Maximum Active Structure Lines', 5, 30, 1, ms.maxStructureLines, ' lines')}
            <label for="vest-ms-break-mode" style="display:block;font-size:12px;color:#e4e4e7;margin:12px 0 6px;">Break Confirmation Trigger</label>
            <select id="vest-ms-break-mode" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
              <option value="close" ${ms.breakMode === 'close' ? 'selected' : ''}>Candle Close beyond swing (Standard SMC)</option>
              <option value="wick" ${ms.breakMode === 'wick' ? 'selected' : ''}>Candle Wick beyond swing (Aggressive)</option>
            </select>
          </div>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">DISPLAY &amp; LABELS</div>
            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:12px;">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ms-show-bos" ${ms.showBos ? 'checked' : ''} />
                <span>Show Break of Structure (BOS) continuation lines</span>
              </label>
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ms-show-choch" ${ms.showChoch ? 'checked' : ''} />
                <span>Show Change of Character (CHoCH / MSS) reversal lines</span>
              </label>
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ms-extend-lines" ${ms.extendLines ? 'checked' : ''} />
                <span>Extend structure lines across chart until broken</span>
              </label>
            </div>
            <label for="vest-ms-label-mode" style="display:block;font-size:12px;color:#e4e4e7;margin:10px 0 6px;">Reversal Label Style</label>
            <select id="vest-ms-label-mode" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
              <option value="both" ${ms.labelMode === 'both' ? 'selected' : ''}>BOS &amp; CHoCH (Classic SMC)</option>
              <option value="mss" ${ms.labelMode === 'mss' ? 'selected' : ''}>BOS &amp; MSS (Market Structure Shift)</option>
              <option value="bos" ${ms.labelMode === 'bos' ? 'selected' : ''}>BOS Only</option>
              <option value="choch" ${ms.labelMode === 'choch' ? 'selected' : ''}>CHoCH Only</option>
            </select>
            <label for="vest-ms-line-style" style="display:block;font-size:12px;color:#e4e4e7;margin:12px 0 6px;">Line Style</label>
            <select id="vest-ms-line-style" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
              <option value="dashed" ${ms.lineStyle === 'dashed' ? 'selected' : ''}>Dashed Line</option>
              <option value="solid" ${ms.lineStyle === 'solid' ? 'selected' : ''}>Solid Line</option>
            </select>
          </div>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">COLORS</div>
            <div style="display:flex;gap:12px;">
              <div style="flex:1;">
                <label for="vest-ms-bull-color" style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Bullish Break Color</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input type="color" id="vest-ms-bull-color" value="${ms.bullishColor}" style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;background:none;" />
                  <span style="font-size:11px;color:#cbd5e1;">${ms.bullishColor}</span>
                </div>
              </div>
              <div style="flex:1;">
                <label for="vest-ms-bear-color" style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Bearish Break Color</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input type="color" id="vest-ms-bear-color" value="${ms.bearishColor}" style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;background:none;" />
                  <span style="font-size:11px;color:#cbd5e1;">${ms.bearishColor}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      function renderOrderBlocksSettingsHtml(ob) {
        const range = (id, label, min, max, step, value, unit = '') => `
          <label for="${id}" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin:12px 0 6px;">${label}<span id="${id}-value" style="color:#10b981;">${value}${unit}</span></label>
          <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" style="width:100%;accent-color:#10b981;" />`;

        const voices = (typeof window.speechSynthesis !== 'undefined') ? window.speechSynthesis.getVoices() : [];

        return `
          <div class="vest-ind-drawer-actions">
            <button type="button" class="vest-tvs-action-btn" id="vest-ob-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 14px;">
            Identifies high-probability institutional supply &amp; demand origin candles that generate aggressive displacement, leave Fair Value Gaps (FVG), and cause Market Structure Breakouts (BOS / ChoCH) based on Smart Risk methodology. Features real-time on-chart order entry badges and voice/chime alerts upon first mitigation / retest.
          </p>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">STRUCTURE &amp; DETECTION</div>
            ${range('vest-ob-swing-lookback', 'Swing High/Low Lookback', 3, 15, 1, ob.swingLookback, ' bars')}
            ${range('vest-ob-max-blocks', 'Maximum Active Order Blocks', 3, 30, 1, ob.maxBlocks, ' blocks')}
            ${range('vest-ob-min-fvg-ticks', 'Minimum FVG Imbalance Size', 0, 20, 1, ob.minFvgTicks, ' ticks')}
            <label for="vest-ob-extend-mode" style="display:block;font-size:12px;color:#e4e4e7;margin:12px 0 6px;">Zone Extension Mode</label>
            <select id="vest-ob-extend-mode" style="width:100%;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
              <option value="candle" ${ob.extendMode === 'candle' ? 'selected' : ''}>On Candle Only (No extension to left or right)</option>
              <option value="mitigation" ${ob.extendMode === 'mitigation' || (!ob.extendMode || (ob.extendMode !== 'candle' && ob.extendMode !== 'right')) ? 'selected' : ''}>Extend forward until initial mitigation / retest</option>
              <option value="right" ${ob.extendMode === 'right' ? 'selected' : ''}>Extend indefinitely to right edge</option>
            </select>
          </div>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">ZONE COLORS, OPACITY &amp; TEXT SIZE</div>
            <div style="display:flex;gap:12px;margin-bottom:8px;">
              <div style="flex:1;">
                <label for="vest-ob-bull-color" style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Bullish OB Color</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input type="color" id="vest-ob-bull-color" value="${ob.bullishColor}" style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;background:none;" />
                  <span id="vest-ob-bull-color-hex" style="font-size:11px;color:#cbd5e1;">${ob.bullishColor}</span>
                </div>
              </div>
              <div style="flex:1;">
                <label for="vest-ob-bear-color" style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Bearish OB Color</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input type="color" id="vest-ob-bear-color" value="${ob.bearishColor}" style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;background:none;" />
                  <span id="vest-ob-bear-color-hex" style="font-size:11px;color:#cbd5e1;">${ob.bearishColor}</span>
                </div>
              </div>
            </div>
            ${range('vest-ob-bull-opacity', 'Bullish Zone Fill Opacity', 5, 80, 5, ob.bullishOpacity, '%')}
            ${range('vest-ob-bear-opacity', 'Bearish Zone Fill Opacity', 5, 80, 5, ob.bearishOpacity, '%')}
            ${range('vest-ob-label-font-size', 'Max Chart OB Text Size (Auto-Fits Box)', 8, 48, 1, ob.labelFontSize || 18, ' px')}
          </div>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:4px;">MULTI-TIMEFRAME ORDER BLOCKS (5m / 15m / 1h / 4h)</div>
            <p style="font-size:11px;color:#94a3b8;line-height:1.45;margin:0 0 10px;">
              Project 5m, 15m, 1h, and 4h Order Blocks onto any active chart timeframe with custom bullish/bearish colors, fill opacity, and box-fitted text sizing.
            </p>
            ${range('vest-ob-mtf-label-font-size', 'Max MTF Text Size (Auto-Fits Box)', 8, 48, 1, ob.mtfLabelFontSize || 22, ' px')}
            ${range('vest-ob-mtf-max-blocks', 'Max Order Blocks per Timeframe', 1, 10, 1, ob.mtfMaxBlocksPerTf || 4, ' blocks')}
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
              ${['5m', '15m', '1h', '4h'].map(tf => {
                const tfCfg = (ob.mtfTimeframes && ob.mtfTimeframes[tf]) || { enabled: true, bullishColor: '#06b6d4', bearishColor: '#f97316', opacity: 18 };
                return `
                  <div style="padding:8px 10px;border:1px solid #1e293b;border-radius:6px;background:#0b0e14;display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                      <label class="vest-ed-checkbox-label" style="margin:0;min-width:74px;">
                        <input type="checkbox" id="vest-ob-mtf-${tf}-enabled" ${tfCfg.enabled ? 'checked' : ''} />
                        <span style="font-weight:700;color:#f8fafc;font-size:12px;">${tf} OB</span>
                      </label>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#94a3b8;cursor:pointer;">
                          <span>Bull</span>
                          <input type="color" id="vest-ob-mtf-${tf}-bull" value="${tfCfg.bullishColor}" style="width:28px;height:22px;border:none;border-radius:4px;cursor:pointer;background:none;" />
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#94a3b8;cursor:pointer;">
                          <span>Bear</span>
                          <input type="color" id="vest-ob-mtf-${tf}-bear" value="${tfCfg.bearishColor}" style="width:28px;height:22px;border:none;border-radius:4px;cursor:pointer;background:none;" />
                        </label>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-size:10.5px;color:#94a3b8;min-width:52px;">Opacity</span>
                      <input id="vest-ob-mtf-${tf}-opacity" type="range" min="5" max="80" step="5" value="${tfCfg.opacity}" style="flex:1;accent-color:${tfCfg.bullishColor};" />
                      <span id="vest-ob-mtf-${tf}-opacity-value" style="font-size:11px;color:#cbd5e1;min-width:30px;text-align:right;">${tfCfg.opacity}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
              <span style="font-size:11px;color:#94a3b8;">
                Click <strong style="color:#f87171;">×</strong> on any Order Block label to permanently hide it.
                <strong id="vest-ob-dismissed-count" style="color:#cbd5e1;">${(Array.isArray(ob.dismissedOrderBlocks) ? ob.dismissedOrderBlocks.length : 0)}</strong> hidden.
              </span>
              <button type="button" class="vest-tvs-action-btn" id="vest-ob-restore-dismissed-btn" style="height:26px;padding:0 10px;font-size:11px;color:#cbd5e1;" ${(Array.isArray(ob.dismissedOrderBlocks) && ob.dismissedOrderBlocks.length > 0) ? '' : 'disabled'}>
                Restore All Removed OBs
              </button>
            </div>
          </div>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">ORDER ENTRY &amp; TARGETS</div>
            <div style="display:flex;flex-direction:column;gap:9px;">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ob-show-entry-icon" ${ob.showOrderEntryIcon ? 'checked' : ''} />
                <span>Show on-chart Order Entry badges (▲ BUY OB / ▼ SELL OB) upon mitigation</span>
              </label>
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ob-show-target-lines" ${ob.showTargetLines ? 'checked' : ''} />
                <span>Project Stop Loss (opposite wick) and Take Profit target lines</span>
              </label>
            </div>
            ${range('vest-ob-icon-size', 'Entry Badge Font / Icon Size', 10, 24, 1, ob.orderIconSize, ' px')}
            ${range('vest-ob-rr-ratio', 'Take Profit Risk:Reward Ratio', 1.0, 5.0, 0.25, ob.riskRewardRatio, ' R:R')}
          </div>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">PERFORMANCE STATS BOX (1:3 RR)</div>
            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:10px;">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ob-show-stats-box" ${ob.showStatsBox !== false ? 'checked' : ''} />
                <span>Show on-chart Order Block Performance Stats Screen</span>
              </label>
            </div>
            ${range('vest-ob-stats-rr-ratio', 'Stats Target Risk:Reward Ratio', 1.0, 10.0, 0.5, ob.statsRrRatio || 3.0, ' RR')}
            <div style="margin-top:10px;">
              <button type="button" class="vest-tvs-action-btn" id="vest-ob-reset-stats-pos-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
                Reset Stats Box Position
              </button>
            </div>
          </div>

          <div style="margin-top:12px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <div style="font-size:12px;font-weight:600;color:#f8fafc;margin-bottom:8px;">AUDIBLE ALERTS (VOICE &amp; CHIME)</div>
            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:12px;">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ob-voice-alert" ${ob.voiceAlertEnabled ? 'checked' : ''} />
                <span>Spoken voice alert ("Bullish Order Block Mitigated. Enter Long." / "Bearish Order Block Mitigated. Enter Short.")</span>
              </label>
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ob-chime-alert" ${ob.chimeAlertEnabled ? 'checked' : ''} />
                <span>Synthesized Web Audio ascending/descending chime</span>
              </label>
            </div>
            <label for="vest-ob-voice-uri" style="display:block;font-size:12px;color:#e4e4e7;margin-bottom:6px;">Alert Voice</label>
            <div style="display:flex;gap:8px;">
              <select id="vest-ob-voice-uri" style="flex:1;padding:8px;border-radius:6px;background:#0b0e14;color:#e4e4e7;border:1px solid #343a46;">
                <option value="">Browser Default Voice</option>
                ${voices.map(v => `<option value="${escapeHtml(v.voiceURI)}" ${ob.voiceURI === v.voiceURI ? 'selected' : ''}>${escapeHtml(v.name)}${v.lang ? ` (${v.lang})` : ''}</option>`).join('')}
              </select>
              <button type="button" class="vest-tvs-action-btn" id="vest-ob-test-voice-btn" style="height:35px;padding:0 12px;font-size:11px;">
                Test Alert
              </button>
            </div>
          </div>
        `;
      }

      function renderChartingIndicatorsHtml() {
        const sc = normalizeSessionIndicatorsConfig(draftSettings.sessionIndicators);
        draftSettings.sessionIndicators = sc;

        const fc = normalizeAutoFvgConfig(draftSettings.autoFvg);
        draftSettings.autoFvg = fc;
        const rectTemplates = templates.filter(t => (t.drawingType || 'rectangle') === 'rectangle');

        const nc = normalizeNewsBoxConfig(draftSettings.newsBox);
        draftSettings.newsBox = nc;

        const tc = normalizeTradesBoxConfig(draftSettings.tradesBox);
        draftSettings.tradesBox = tc;
        const activeSymLabel = formatInstrumentDisplayLabel(currentInstrument || 'BTC-PERP');
        const activeSymKey = normalizeInstrumentKey(currentInstrument || 'BTC-PERP');
        const sessionBounds = getCurrentEtTradingSessionBounds();
        const matchingTrades = tc.trades.filter(t => {
          if (!t) return false;
          if (tc.filterCurrentInstrument && activeSymKey && t.symbolKey && t.symbolKey !== activeSymKey) return false;
          if (tc.filterCurrentSessionOnly !== false && !isTradeWithinCurrentEtSession(t, sessionBounds)) return false;
          return true;
        });

        const co = normalizeCandleOhlcConfig(draftSettings.candleOhlc);
        draftSettings.candleOhlc = co;

        const ph = normalizePositionHudConfig(draftSettings.positionHud);
        draftSettings.positionHud = ph;

        const fl = normalizeFailLinesConfig(draftSettings.failLines);
        draftSettings.failLines = fl;

        const ci = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
        draftSettings.cortexIndicator = ci;

        const ob = normalizeOrderBlocksConfig(draftSettings.orderBlocks);
        draftSettings.orderBlocks = ob;

        const rd = normalizeRangeDetectorConfig(draftSettings.rangeDetector);
        draftSettings.rangeDetector = rd;
        const ms = normalizeMarketStructureConfig(draftSettings.marketStructure);
        draftSettings.marketStructure = ms;
        const arb = normalizeAccountsRiskBoxConfig(draftSettings.accountsRiskBox);
        draftSettings.accountsRiskBox = arb;

        const INDICATORS = [
          {
            id: 'sessions',
            title: 'ICT Killzones &amp; Session Indicators',
            desc: 'Shaded session boxes (Asia, London, NY AM/Lunch/PM) with centered watermarks &amp; liquidity rays',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="4" x2="8" y2="20"/><line x1="16" y1="4" x2="16" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
            accentColor: '#38bdf8',
            bgTint: 'rgba(56, 189, 248, 0.12)',
            masterToggleId: 'vest-si-master-enabled',
            isEnabled: Boolean(sc.enabled),
            renderSettings: () => renderSessionIndicatorsSettingsHtml(sc)
          },
          {
            id: 'autofvg',
            title: "Auto FVG's Engine",
            desc: 'Automatically identifies 3-candle Fair Value Gaps with timeframe templates &amp; reclaim tracking',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="2"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="3 2"/><line x1="6" y1="3" x2="6" y2="7"/><line x1="18" y1="17" x2="18" y2="21"/></svg>`,
            accentColor: '#c084fc',
            bgTint: 'rgba(192, 132, 252, 0.12)',
            masterToggleId: 'vest-afvg-master-enabled',
            isEnabled: Boolean(fc.enabled),
            renderSettings: () => renderAutoFvgSettingsHtml(fc, rectTemplates)
          },
          {
            id: 'news',
            title: 'Economic News Box',
            desc: 'Draggable news calendar overlay with live event countdowns and impact tier filtering',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
            accentColor: '#f87171',
            bgTint: 'rgba(248, 113, 113, 0.12)',
            masterToggleId: 'vest-nb-master-enabled',
            isEnabled: Boolean(nc.enabled),
            renderSettings: () => renderNewsBoxSettingsHtml(nc)
          },
          {
            id: 'trades',
            title: 'Instrument Trades Box',
            desc: 'Draggable recent fills and order flow tape showing executed buy/sell size and liquidity',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
            accentColor: '#34d399',
            bgTint: 'rgba(52, 211, 153, 0.12)',
            masterToggleId: 'vest-tb-master-enabled',
            isEnabled: Boolean(tc.enabled),
            renderSettings: () => renderTradesBoxSettingsHtml(tc, activeSymLabel, matchingTrades)
          },
          {
            id: 'candleohlc',
            title: 'Candle OHLC Values',
            desc: 'Interactive on-chart OHLC click inspection badges, backwards numbering, and width scaling',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="9" y1="2" x2="9" y2="6"/><rect x="6" y="6" width="6" height="11" rx="1"/><line x1="9" y1="17" x2="9" y2="22"/><line x1="17" y1="4" x2="17" y2="9"/><rect x="14" y="9" width="6" height="8" rx="1"/><line x1="17" y1="17" x2="17" y2="21"/></svg>`,
            accentColor: '#fbbf24',
            bgTint: 'rgba(251, 191, 36, 0.12)',
            masterToggleId: 'vest-co-master-enabled',
            isEnabled: Boolean(co.enabled),
            renderSettings: () => renderCandleOhlcSettingsHtml(co)
          },
          {
            id: 'positionhud',
            title: 'Active Position HUD',
            desc: 'Floating on-chart HUD displaying live position size, entry price, liquidation, and PnL',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="3 3"/><rect x="13" y="8" width="8" height="8" rx="1.5"/><line x1="15" y1="10" x2="19" y2="14"/><line x1="19" y1="10" x2="15" y2="14"/></svg>`,
            accentColor: '#38bdf8',
            bgTint: 'rgba(56, 189, 248, 0.12)',
            masterToggleId: 'vest-ph-master-enabled',
            isEnabled: Boolean(ph.enabled),
            renderSettings: () => renderPositionHudSettingsHtml(ph)
          },
          {
            id: 'faillines',
            title: 'Chart Trader Panel &amp; Fail Lines',
            desc: 'Fail price liquidity lines and embedded quick trading execution buttons directly on the chart',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18M3 17h18"/><path d="M6 5v4M18 15v4"/></svg>`,
            accentColor: '#f43f5e',
            bgTint: 'rgba(244, 63, 94, 0.12)',
            masterToggleId: 'vest-fail-lines-enabled',
            isEnabled: Boolean(fl.enabled),
            renderSettings: () => renderFailLinesSettingsHtml(fl)
          },
          {
            id: 'cortexindicator',
            title: 'Cortex Indicator',
            desc: 'Proprietary momentum, divergence, and trend indicator signals with real-time chart overlays',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l5-6 4 3 7-9"/><path d="M3 21h18"/><path d="M5 7h4M15 17h4"/></svg>`,
            accentColor: '#a855f7',
            bgTint: 'rgba(168, 85, 247, 0.12)',
            masterToggleId: 'vest-ci-enabled',
            isEnabled: Boolean(ci.enabled),
            renderSettings: () => renderCortexIndicatorSettingsHtml(ci)
          },
          {
            id: 'orderblocks',
            title: 'Order Blocks (Smart Risk)',
            desc: 'High-probability institutional order blocks with displacement, FVG, BOS, order entry icons &amp; audible alerts',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="8" height="6" rx="1"/><rect x="13" y="13" width="8" height="6" rx="1"/><polyline points="7 14 11 10 17 10"/></svg>`,
            accentColor: '#10b981',
            bgTint: 'rgba(16, 185, 129, 0.12)',
            masterToggleId: 'vest-ob-master-enabled',
            isEnabled: Boolean(ob.enabled),
            renderSettings: () => renderOrderBlocksSettingsHtml(ob)
          },
          {
            id: 'rangedetector',
            title: 'Range Detector (Multi-Timeframe)',
            desc: 'Multi-timeframe market consolidation & range detection widget with glowing on-chart box and audible alerts',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"/><polyline points="7 10 9 8 11 10"/><polyline points="13 14 15 16 17 14"/></svg>`,
            accentColor: '#3b82f6',
            bgTint: 'rgba(59, 130, 246, 0.12)',
            masterToggleId: 'vest-rd-master-enabled',
            isEnabled: Boolean(rd.enabled),
            renderSettings: () => renderRangeDetectorSettingsHtml(rd)
          },
          {
            id: 'marketstructure',
            title: 'Market Structure (BOS / CHoCH / MSS)',
            desc: 'Real-time Break of Structure (BOS) and Change of Character (CHoCH / MSS) lines with break confirmation',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
            accentColor: '#06b6d4',
            bgTint: 'rgba(6, 182, 212, 0.12)',
            masterToggleId: 'vest-ms-master-enabled',
            isEnabled: Boolean(ms.enabled),
            renderSettings: () => renderMarketStructureSettingsHtml(ms)
          },
          {
            id: 'accountsrisk',
            title: 'Accounts &amp; Risk Box',
            desc: 'Top-left on-chart widget showing all accounts, current balances, live Open PnL, and per-trade dollar risk when flat on the active instrument',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
            accentColor: '#38bdf8',
            bgTint: 'rgba(56, 189, 248, 0.12)',
            masterToggleId: 'vest-arb-master-enabled',
            isEnabled: Boolean(arb.enabled),
            renderSettings: () => renderAccountsRiskSettingsHtml(arb)
          }
        ];

        return `
          <div class="vest-tvs-section-title">CHARTING INDICATORS</div>
          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 16px;">
            Enable and configure all on-chart indicators, liquidity tools, and overlays in one unified workspace. Toggle any indicator ON to reveal its full settings drawer right below.
          </p>

          <div class="vest-indicators-container">
            ${INDICATORS.map(ind => `
              <div class="vest-indicator-tile ${ind.isEnabled ? 'is-enabled' : ''}" id="vest-ind-tile-${ind.id}" data-indicator-id="${ind.id}">
                <div class="vest-indicator-tile-header" data-indicator-id="${ind.id}">
                  <div class="vest-indicator-tile-left">
                    <div class="vest-indicator-tile-icon" style="color: ${ind.accentColor}; background: ${ind.bgTint};">
                      ${ind.icon}
                    </div>
                    <div class="vest-indicator-tile-info">
                      <div class="vest-indicator-tile-title">${ind.title}</div>
                      <div class="vest-indicator-tile-desc">${ind.desc}</div>
                    </div>
                  </div>
                  <div class="vest-indicator-tile-right">
                    <span class="vest-indicator-status-badge ${ind.isEnabled ? 'on' : 'off'}">${ind.isEnabled ? 'ON' : 'OFF'}</span>
                    <button type="button" class="vest-indicator-settings-btn" id="vest-ind-settings-btn-${ind.id}" data-indicator-id="${ind.id}" title="View and configure ${ind.title} settings" style="display: ${ind.isEnabled ? 'inline-flex' : 'none'};">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                      <span>Settings</span>
                    </button>
                    <label class="vest-tvs-switch" title="Toggle ${ind.title}">
                      <input type="checkbox" class="vest-ind-master-toggle" id="${ind.masterToggleId}" data-indicator-id="${ind.id}" ${ind.isEnabled ? 'checked' : ''} />
                      <span class="vest-tvs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div class="vest-indicator-settings-drawer" id="vest-ind-drawer-${ind.id}" style="display: none;">
                  ${ind.renderSettings()}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      if (activeTab === 'chartingindicators' || ['sessions', 'autofvg', 'news', 'trades', 'candleohlc', 'positionhud', 'faillines', 'cortexindicator', 'orderblocks', 'marketstructure', 'rangedetector', 'accountsrisk'].includes(activeTab)) {
        return renderChartingIndicatorsHtml();
      }
      if (activeTab === 'perpfirms') {
        return renderPerpFirmsHtml();
      }
      if (activeTab === 'perpfirms') {
        syncCurrentFirmToDraft();
      }
      if (activeTab === 'diagnostics') {
        const db = normalizeDiagnosticsBoxConfig(draftSettings.diagnosticsBox);
        draftSettings.diagnosticsBox = db;
        const isDebug = Boolean(draftSettings.debugMode);
        return `
          <div class="vest-tvs-section-title">DIAGNOSTICS &amp; DEBUG MODE</div>
          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 14px;">
            Configure the on-chart diagnostics window and developer debug mode. When Debug Mode is enabled, all chart engine events, modules, actions, and logs are echoed out to the browser console with <code>[CORTEX DEBUG MODE] -</code>.
          </p>

          <div class="vest-tvs-toggle-box" style="margin-bottom:12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Debug Mode (Console Echo)</div>
              <div class="vest-tvs-toggle-desc">Logs all chart hooks, session events, FVG computations, trades, and position events with <code>[CORTEX DEBUG MODE] -</code>.</div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Developer Debug Mode">
              <input type="checkbox" id="vest-dbg-master-toggle" ${isDebug ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-tvs-toggle-box" style="margin-bottom:14px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Show On-Chart Diagnostics Window</div>
              <div class="vest-tvs-toggle-desc">Displays a floating, moveable HUD showing chart API hook status, canvas resolution, visible bar count, render latency, active killzones, and auto FVGs.</div>
            </div>
            <label class="vest-tvs-switch" title="Toggle On-Chart Diagnostics Window">
              <input type="checkbox" id="vest-dbg-box-enabled" ${db.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-bottom:14px;">
            <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Diagnostics Window Appearance &amp; Position
            </div>
            <div class="vest-ed-grid-2" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Window Width: <span id="vest-dbg-box-width-val" style="color:#38bdf8; font-weight:700;">${db.boxWidth}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-dbg-box-width" min="280" max="520" step="10" value="${db.boxWidth}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Background Opacity: <span id="vest-dbg-bg-op-val" style="color:#38bdf8; font-weight:700;">${db.bgOpacity}%</span></label>
                <input type="range" class="vest-ed-range" id="vest-dbg-bg-op" min="30" max="100" step="5" value="${db.bgOpacity}" />
              </div>
            </div>
            <div class="vest-ed-grid-2" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Background Color</label>
                <input type="color" class="vest-ed-color" id="vest-dbg-bg-color" value="${db.bgColor || '#0f172a'}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Border Accent Color</label>
                <input type="color" class="vest-ed-color" id="vest-dbg-border-color" value="${db.borderColor || '#38bdf8'}" />
              </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:8px;">
              <button type="button" class="vest-ed-btn" id="vest-dbg-reset-pos-btn" style="flex:1; padding:6px 10px; font-size:11px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; border-radius:6px; cursor:pointer;">
                Reset Window Position
              </button>
              <button type="button" class="vest-ed-btn" id="vest-dbg-reset-defaults-btn" style="flex:1; padding:6px 10px; font-size:11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); color:#cbd5e1; border-radius:6px; cursor:pointer;">
                Reset to Defaults
              </button>
            </div>
          </div>

          <div class="vest-ed-section" style="padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Developer Tools &amp; Actions
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="vest-ed-btn" id="vest-dbg-test-echo-btn" style="flex:1; padding:7px 10px; font-size:11px; font-weight:600; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.35); color:#34d399; border-radius:6px; cursor:pointer;">
                Send Test Echo Log
              </button>
              <button type="button" class="vest-ed-btn" id="vest-dbg-copy-state-btn" style="flex:1; padding:7px 10px; font-size:11px; font-weight:600; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.35); color:#7dd3fc; border-radius:6px; cursor:pointer;">
                Copy Diagnostics JSON
              </button>
              <button type="button" class="vest-ed-btn" id="vest-dbg-clear-console-btn" style="flex:1; padding:7px 10px; font-size:11px; font-weight:600; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.35); color:#fca5a5; border-radius:6px; cursor:pointer;">
                Clear Console
              </button>
            </div>
          </div>
        `;
      }

      return '';
    }

    let modalOffset = { x: 0, y: 0 };
    let modalSize = { width: null, height: null };
    let isDraggingModal = false;
    let isResizingModal = false;
    let resizeDirection = 'bottom-right';
    let dragStartMouse = { x: 0, y: 0 };
    let dragStartOffset = { x: 0, y: 0 };
    let resizeStartMouse = { x: 0, y: 0 };
    let resizeStartSize = { width: 0, height: 0 };
    let resizeStartOffset = { x: 0, y: 0 };
    let justFinishedDragging = false;

    function closeSettingsOverlay() {
      if (typeof closeTvColorPickerPopover === 'function') closeTvColorPickerPopover();
      if (voicesChangedHandler && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        voicesChangedHandler = null;
      }
      window.removeEventListener('mousemove', onModalMouseMove, true);
      window.removeEventListener('mouseup', onModalMouseUp, true);
      window.removeEventListener('cortex-live-settings-updated', onLiveSettingsUpdated);
      overlay.remove();
      // Restore committed settings to main world in case user cancelled after previewing
      if (typeof renderChartRangeBox === 'function') renderChartRangeBox();
      if (typeof renderChartOrderBlockStatsBox === 'function') renderChartOrderBlockStatsBox();
      if (typeof renderChartDiagnosticsBox === 'function') renderChartDiagnosticsBox();
      if (typeof renderChartAccountsRiskBox === 'function') renderChartAccountsRiskBox();
      notifyMainWorldConfig();
      if (typeof renderChartNewsBox === 'function') renderChartNewsBox();
      if (typeof renderChartTradesBox === 'function') renderChartTradesBox();
      applyDialogGlassEffect(settings.dialogGlassEffect, settings.dialogGlassOpacity);
    }

    function onModalMouseMove(e) {
      if (isDraggingModal) {
        const dx = e.clientX - dragStartMouse.x;
        const dy = e.clientY - dragStartMouse.y;
        modalOffset.x = dragStartOffset.x + dx;
        modalOffset.y = dragStartOffset.y + dy;
        const cardEl = overlay.querySelector('.vest-tvs-card');
        if (cardEl) {
          cardEl.style.transform = `translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0)`;
        }
      } else if (isResizingModal) {
        const dx = e.clientX - resizeStartMouse.x;
        const dy = e.clientY - resizeStartMouse.y;
        const cardEl = overlay.querySelector('.vest-tvs-card');
        if (!cardEl) return;

        const minW = 440;
        const maxW = Math.round(window.innerWidth * 0.96);
        const minH = 320;
        const maxH = Math.round(window.innerHeight * 0.94);

        let newW = resizeStartSize.width;
        let newH = resizeStartSize.height;
        let newOffsetX = resizeStartOffset.x;
        let newOffsetY = resizeStartOffset.y;

        // Multi-directional Horizontal Resizing (Anchors opposing edge)
        if (resizeDirection.includes('right')) {
          newW = Math.max(minW, Math.min(maxW, resizeStartSize.width + dx));
          const actualDeltaW = newW - resizeStartSize.width;
          newOffsetX = resizeStartOffset.x + (actualDeltaW / 2);
        } else if (resizeDirection.includes('left')) {
          newW = Math.max(minW, Math.min(maxW, resizeStartSize.width - dx));
          const actualDeltaW = newW - resizeStartSize.width;
          newOffsetX = resizeStartOffset.x - (actualDeltaW / 2);
        }

        // Multi-directional Vertical Resizing (Anchors opposing edge)
        if (resizeDirection.includes('bottom')) {
          newH = Math.max(minH, Math.min(maxH, resizeStartSize.height + dy));
          const actualDeltaH = newH - resizeStartSize.height;
          newOffsetY = resizeStartOffset.y + (actualDeltaH / 2);
        } else if (resizeDirection.includes('top')) {
          newH = Math.max(minH, Math.min(maxH, resizeStartSize.height - dy));
          const actualDeltaH = newH - resizeStartSize.height;
          newOffsetY = resizeStartOffset.y - (actualDeltaH / 2);
        }

        modalSize.width = Math.round(newW);
        modalSize.height = Math.round(newH);
        modalOffset.x = Math.round(newOffsetX);
        modalOffset.y = Math.round(newOffsetY);

        cardEl.style.width = `${modalSize.width}px`;
        cardEl.style.height = `${modalSize.height}px`;
        cardEl.style.transform = `translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0)`;
      }
    }

    function onModalMouseUp() {
      if (isDraggingModal) {
        isDraggingModal = false;
        justFinishedDragging = true;
        setTimeout(() => {
          justFinishedDragging = false;
        }, 60);
      }
      if (isResizingModal) {
        isResizingModal = false;
        const cardEl = overlay.querySelector('.vest-tvs-card');
        if (cardEl) {
          modalSize.width = Math.round(cardEl.offsetWidth);
          modalSize.height = Math.round(cardEl.offsetHeight);
        }
      }
    }

    window.addEventListener('mousemove', onModalMouseMove, true);
    window.addEventListener('mouseup', onModalMouseUp, true);

    function renderDialog() {
      if (voicesChangedHandler && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        voicesChangedHandler = null;
      }
      const cardW = modalSize.width ? `${modalSize.width}px` : '80vw';
      const cardH = modalSize.height ? `${modalSize.height}px` : '80vh';
      overlay.innerHTML = `
        <div class="vest-tvs-card" role="dialog" aria-label="Trading Cortex Settings" style="width: ${cardW}; height: ${cardH}; max-width: 96vw; max-height: 94vh; min-width: 440px; min-height: 320px; transform: translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0);">
          <div class="vest-tvs-header" id="vest-tvs-drag-handle" title="Drag to move">
            <div class="vest-tvs-title">Settings</div>
            <button type="button" class="vest-tvs-close-btn" id="vest-tvs-close" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="vest-tvs-body">
            <div class="vest-tvs-sidebar">
              ${NAV_ITEMS.map(item => `
                <button type="button" class="vest-tvs-nav-item ${item.id === activeTab ? 'active' : ''}" data-tab="${item.id}">
                  <span class="vest-tvs-nav-icon">${item.icon}</span>
                  <span class="vest-tvs-nav-label">${item.label}</span>
                </button>
              `).join('')}
            </div>

            <div class="vest-tvs-content" id="vest-tvs-right-pane">
              ${renderRightPaneContent()}
            </div>
          </div>

          <div class="vest-tvs-footer">
            <div class="vest-tvs-footer-right">
              <button type="button" class="vest-tvs-btn-cancel" id="vest-tvs-cancel">Cancel</button>
              <button type="button" class="vest-tvs-btn-ok" id="vest-tvs-ok">Save Settings</button>
            </div>
          </div>
          <!-- Multi-Directional Edge & Corner Resize Handles -->
          <div class="vest-tvs-resize-edge top" data-direction="top" title="Drag to resize top"></div>
          <div class="vest-tvs-resize-edge right" data-direction="right" title="Drag to resize right"></div>
          <div class="vest-tvs-resize-edge bottom" data-direction="bottom" title="Drag to resize bottom"></div>
          <div class="vest-tvs-resize-edge left" data-direction="left" title="Drag to resize left"></div>
          <div class="vest-tvs-resize-corner top-left" data-direction="top-left" title="Drag to resize"></div>
          <div class="vest-tvs-resize-corner top-right" data-direction="top-right" title="Drag to resize"></div>
          <div class="vest-tvs-resize-corner bottom-left" data-direction="bottom-left" title="Drag to resize"></div>
          <div class="vest-tvs-resize-corner bottom-right vest-tvs-resize-handle" data-direction="bottom-right" id="vest-tvs-resize-handle" title="Drag to resize dialog">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14ZM14 6H12V4H14V6ZM10 10H8V8H10V10ZM6 14H4V12H6V14Z"/>
            </svg>
          </div>
        </div>
      `;

      wireDialogEvents();
      if (activeTab === 'chartingindicators' && targetIndicatorToScroll) {
        setTimeout(() => {
          const tile = overlay.querySelector(`#vest-ind-tile-${targetIndicatorToScroll}`);
          if (tile) {
            const drawer = overlay.querySelector(`#vest-ind-drawer-${targetIndicatorToScroll}`);
            if (drawer && drawer.style.display === 'none') {
              drawer.style.display = 'block';
            }
            const settingsBtn = overlay.querySelector(`#vest-ind-settings-btn-${targetIndicatorToScroll}`);
            if (settingsBtn) {
              settingsBtn.style.display = 'inline-flex';
              settingsBtn.classList.add('is-active');
            }
            tile.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            tile.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
            tile.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.6), 0 4px 20px rgba(56, 189, 248, 0.2)';
            tile.style.borderColor = 'rgba(56, 189, 248, 0.8)';
            setTimeout(() => {
              if (tile) {
                tile.style.boxShadow = '';
                tile.style.borderColor = '';
              }
            }, 1800);
          }
          targetIndicatorToScroll = null;
        }, 120);
      }
      if (activeTab === 'alertsvoice' && typeof window.speechSynthesis !== 'undefined') {
        voicesChangedHandler = () => {
          const select = overlay.querySelector('#vest-ci-alert-voice');
          if (!select || !overlay.isConnected) return;
          const preferred = select.value || normalizeCortexIndicatorConfig(draftSettings.cortexIndicator).signalAlertVoiceURI;
          const voices = window.speechSynthesis.getVoices();
          select.innerHTML = cortexVoiceOptionsMarkup(voices, preferred);
          select.value = preferred === CORTEX_IRISH_VOICE_PRESET || voices.some(voice => voice.voiceURI === preferred) ? preferred : '';
          const status = overlay.querySelector('#vest-ci-alert-voice-status');
          if (status && !findCortexIrishVoice(voices)) {
            status.textContent = 'This browser has not supplied an en-IE voice. Choose another browser voice or check again after browser voices finish loading.';
          }
        };
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
      }
    }

    function syncCurrentFirmToDraft() {
      const currentIdInput = overlay.querySelector('#vest-pf-current-id');
      if (!currentIdInput) return;
      const firmId = currentIdInput.value;
      const firm = draftSettings.perpFirms.find(f => f.id === firmId);
      if (!firm) return;

      const nameEl = overlay.querySelector('#vest-pf-input-name');
      const tierEl = overlay.querySelector('#vest-pf-input-tier');
      const urlEl = overlay.querySelector('#vest-pf-input-url');
      const patternsEl = overlay.querySelector('#vest-pf-input-patterns');
      const enabledEl = overlay.querySelector('#vest-pf-input-enabled');
      const topBarModeEl = overlay.querySelector('#vest-pf-input-topbarmode');
      const offsetEl = overlay.querySelector('#vest-pf-input-offset');
      const marginEl = overlay.querySelector('#vest-pf-input-margin');
      const headerEl = overlay.querySelector('#vest-pf-input-header');
      const levEl = overlay.querySelector('#vest-pf-input-leverage');
      const rememberSizeEl = overlay.querySelector('#vest-pf-input-remember-size');
      const restoreAccountEl = overlay.querySelector('#vest-pf-input-restore-account');
      const notesEl = overlay.querySelector('#vest-pf-input-notes');

      if (nameEl) firm.name = nameEl.value.trim() || firm.name;
      if (tierEl) firm.accountTier = tierEl.value.trim();
      if (urlEl) firm.url = urlEl.value.trim();
      if (patternsEl) {
        firm.matchPatterns = patternsEl.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      }
      if (enabledEl) firm.enabled = Boolean(enabledEl.checked);
      if (topBarModeEl) firm.topBarMode = topBarModeEl.value;
      if (offsetEl) firm.customTopBarOffsetPx = Number(offsetEl.value) || 0;
      if (marginEl) firm.barMarginBottom = Number(marginEl.value) || 8;
      if (headerEl) firm.headerHeightPx = Number(headerEl.value) || 48;
      if (levEl) firm.defaultLeverage = levEl.value;
      if (rememberSizeEl) firm.rememberOrderAmount = Boolean(rememberSizeEl.checked);
      if (restoreAccountEl) firm.restoreSelectedAccount = Boolean(restoreAccountEl.checked);
      const managePositionsEl = overlay.querySelector('#vest-pf-input-manage-positions');
      if (managePositionsEl) firm.managePositionsPanel = Boolean(managePositionsEl.checked);
      const enableTimeframesEl = overlay.querySelector('#vest-pf-input-enable-timeframes');
      if (enableTimeframesEl) firm.enableTimeframeFavorites = Boolean(enableTimeframesEl.checked);
      if (notesEl) firm.notes = notesEl.value.trim();
    }
    function syncCurrentPaneToDraft() {
      if (activeTab === 'perpfirms') {
        syncCurrentFirmToDraft();
      }
      const remToggle = overlay.querySelector('#vest-tvs-remember-tools-toggle');
      if (remToggle) {
        draftSettings.rememberSidebarTools = Boolean(remToggle.checked);
      }
      const remChartToggle = overlay.querySelector('#vest-tvs-remember-chart-settings-toggle');
      if (remChartToggle) {
        draftSettings.rememberLastChartSettings = Boolean(remChartToggle.checked);
      }
      const glassToggle = overlay.querySelector('#vest-tvs-dialog-glass-toggle');
      if (glassToggle) {
        draftSettings.dialogGlassEffect = Boolean(glassToggle.checked);
      }
      const glassOpRange = overlay.querySelector('#vest-tvs-dialog-glass-op-range');
      if (glassOpRange) {
        draftSettings.dialogGlassOpacity = Math.max(15, Math.min(95, parseInt(glassOpRange.value, 10) || 78));
      }
      const favoriteTimeframeInputs = overlay.querySelectorAll('.vest-tvs-favorite-timeframe');
      if (favoriteTimeframeInputs.length) {
        const labels = new Map([
          ['1', '1 minute'], ['3', '3 minutes'], ['5', '5 minutes'], ['15', '15 minutes'], ['30', '30 minutes'],
          ['60', '1 hour'], ['120', '2 hours'], ['240', '4 hours'], ['360', '6 hours'], ['480', '8 hours'], ['720', '12 hours'],
          ['1D', '1 day'], ['3D', '3 days'], ['1W', '1 week'], ['1M', '1 month']
        ]);
        draftSettings.favoriteTimeframes = Array.from(favoriteTimeframeInputs)
          .filter(input => input.checked)
          .map(input => ({ resolution: input.value, label: labels.get(input.value) || input.value }));
      }

      // Sync Session Indicators tab if mounted
      const masterSi = overlay.querySelector('#vest-si-master-enabled');
      if (masterSi && draftSettings.sessionIndicators) {
        const sc = draftSettings.sessionIndicators;
        sc.enabled = Boolean(masterSi.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-si-font-family')) sc.fontFamily = q('#vest-si-font-family').value;
        if (q('#vest-si-font-size')) sc.fontSize = Number(q('#vest-si-font-size').value) || 40;
        if (q('#vest-si-wm-opacity')) sc.watermarkOpacity = Number(q('#vest-si-wm-opacity').value) || 32;
        if (q('#vest-si-box-opacity')) sc.boxOpacity = Number(q('#vest-si-box-opacity').value) || 18;
        if (q('#vest-si-days-back')) sc.maxDaysBack = Number(q('#vest-si-days-back').value) || 5;
        if (q('#vest-si-hl-style')) sc.highLowLineStyle = Number(q('#vest-si-hl-style').value ?? 0);
        if (q('#vest-si-extend-hl-right')) sc.highLowLineExtensionMode = q('#vest-si-extend-hl-right').value === 'all' ? 'all' : 'uncleared';
        if (q('#vest-si-show-watermark')) sc.showWatermark = Boolean(q('#vest-si-show-watermark').checked);
        if (q('#vest-si-font-bold')) sc.fontBold = Boolean(q('#vest-si-font-bold').checked);
        if (q('#vest-si-extend-hl')) sc.extendHighLowLines = Boolean(q('#vest-si-extend-hl').checked);
        if (q('#vest-si-show-perm-dotted')) sc.showPermanentDottedHighLow = Boolean(q('#vest-si-show-perm-dotted').checked);
        if (q('#vest-si-show-hl-labels')) sc.showHighLowLabels = Boolean(q('#vest-si-show-hl-labels').checked);
        if (q('#vest-si-show-midpoint')) sc.showMidPoint = Boolean(q('#vest-si-show-midpoint').checked);
        if (q('#vest-si-extend-midpoint')) sc.extendMidPoint = Boolean(q('#vest-si-extend-midpoint').checked);
        if (q('#vest-si-perm-date-format')) sc.permDateFormat = q('#vest-si-perm-date-format').value || 'M-d-y';
        if (q('#vest-si-perm-vert-align')) sc.permLabelVertAlign = q('#vest-si-perm-vert-align').value || 'outside';
        if (q('#vest-si-perm-horz-align')) sc.permLabelHorzAlign = q('#vest-si-perm-horz-align').value || 'right';
        if (q('#vest-si-perm-line-style')) sc.permanentLineStyle = Number(q('#vest-si-perm-line-style').value ?? 1);
        if (q('#vest-si-perm-font-size')) sc.permLabelFontSize = Number(q('#vest-si-perm-font-size').value) || 11;
        if (q('#vest-si-perm-font-style')) sc.permLabelFontStyle = q('#vest-si-perm-font-style').value || 'bold';
        if (q('#vest-si-perm-color-mode')) sc.permLabelColorMode = q('#vest-si-perm-color-mode').value || 'session';
        if (q('#vest-si-perm-custom-color')) {
          sc.permLabelCustomColor = normalizeHexColor(q('#vest-si-perm-custom-color').value, sc.permLabelCustomColor || '#e2e8f0');
          q('#vest-si-perm-custom-color').style.opacity = sc.permLabelColorMode === 'custom' ? '1' : '0.45';
        }

        overlay.querySelectorAll('.vest-si-sess-enabled').forEach(el => {
          const idx = Number(el.dataset.idx);
          if (sc.sessions[idx]) sc.sessions[idx].enabled = Boolean(el.checked);
        });
        overlay.querySelectorAll('.vest-si-sess-color').forEach(el => {
          const idx = Number(el.dataset.idx);
          if (sc.sessions[idx]) sc.sessions[idx].color = normalizeHexColor(el.value, sc.sessions[idx].color);
        });
        overlay.querySelectorAll('.vest-si-sess-watermark').forEach(el => {
          const idx = Number(el.dataset.idx);
          if (sc.sessions[idx]) sc.sessions[idx].watermarkText = el.value;
        });
        overlay.querySelectorAll('.vest-si-sess-start').forEach(el => {
          const idx = Number(el.dataset.idx);
          if (sc.sessions[idx] && el.value) sc.sessions[idx].startTime = el.value;
        });
        overlay.querySelectorAll('.vest-si-sess-end').forEach(el => {
          const idx = Number(el.dataset.idx);
          if (sc.sessions[idx] && el.value) sc.sessions[idx].endTime = el.value;
        });
      }

      // Sync Auto FVG's tab if mounted
      const masterAfvg = overlay.querySelector('#vest-afvg-master-enabled');
      if (masterAfvg && draftSettings.autoFvg) {
        const fc = draftSettings.autoFvg;
        fc.enabled = Boolean(masterAfvg.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-afvg-bull-tpl')) fc.bullishTemplateId = q('#vest-afvg-bull-tpl').value || 'auto';
        if (q('#vest-afvg-bear-tpl')) fc.bearishTemplateId = q('#vest-afvg-bear-tpl').value || 'auto';
        if (q('#vest-afvg-label-format')) fc.labelFormat = q('#vest-afvg-label-format').value || '{tf} FVG';
        if (q('#vest-afvg-extend-mode')) fc.extendMode = q('#vest-afvg-extend-mode').value || 'right';
        if (q('#vest-afvg-future-bars')) {
          const rawFb = Number(q('#vest-afvg-future-bars').value);
          fc.extendFutureBars = isFinite(rawFb) ? Math.max(0, Math.min(200, Math.round(rawFb))) : 0;
          q('#vest-afvg-future-bars').style.opacity = fc.extendMode === 'right' ? '0.55' : '1';
          const badgeSpan = q('#vest-afvg-future-bars').nextElementSibling;
          if (badgeSpan) badgeSpan.textContent = `bars (+${fc.extendFutureBars})`;
        }
        if (q('#vest-afvg-reclaim-mode')) fc.reclaimMode = q('#vest-afvg-reclaim-mode').value === 'wick' ? 'wick' : 'close';
        if (q('#vest-afvg-max-active')) fc.maxActiveFvgs = Number(q('#vest-afvg-max-active').value) || 25;
        if (q('#vest-afvg-lookback')) fc.maxBarsLookback = Number(q('#vest-afvg-lookback').value) || 600;
        if (q('#vest-afvg-show-reclaimed')) {
          fc.showReclaimed = Boolean(q('#vest-afvg-show-reclaimed').checked);
          fc.hideReclaimed = !fc.showReclaimed;
        }
        if (q('#vest-afvg-reclaimed-color-mode')) {
          fc.reclaimedColorMode = q('#vest-afvg-reclaimed-color-mode').value === 'dim' ? 'dim' : 'custom';
          const recGrid = q('#vest-afvg-reclaimed-color-grid');
          if (recGrid) {
            recGrid.style.opacity = fc.reclaimedColorMode === 'dim' ? '0.45' : '1';
            recGrid.style.pointerEvents = fc.reclaimedColorMode === 'dim' ? 'none' : 'auto';
          }
        }
        if (q('#vest-afvg-rec-box-color')) {
          fc.reclaimedBoxColor = normalizeHexColor(q('#vest-afvg-rec-box-color').value, fc.reclaimedBoxColor || '#787b86');
          fc.reclaimedColor = fc.reclaimedBoxColor;
          const hexSpan = q('#vest-afvg-rec-box-hex');
          if (hexSpan) hexSpan.textContent = fc.reclaimedBoxColor;
        }
        if (q('#vest-afvg-rec-box-opacity')) {
          fc.reclaimedBoxOpacity = Math.max(0, Math.min(100, Number(q('#vest-afvg-rec-box-opacity').value ?? 18)));
          fc.reclaimedOpacity = fc.reclaimedBoxOpacity;
          const opBadge = q('#vest-afvg-rec-box-op-val');
          if (opBadge) opBadge.textContent = `${fc.reclaimedBoxOpacity}%`;
        }
        if (q('#vest-afvg-rec-border-color')) {
          fc.reclaimedBorderColor = normalizeHexColor(q('#vest-afvg-rec-border-color').value, fc.reclaimedBorderColor || '#787b86');
          const hexSpan = q('#vest-afvg-rec-border-hex');
          if (hexSpan) hexSpan.textContent = fc.reclaimedBorderColor;
        }
        if (q('#vest-afvg-rec-border-opacity')) {
          fc.reclaimedBorderOpacity = Math.max(0, Math.min(100, Number(q('#vest-afvg-rec-border-opacity').value ?? 65)));
          const opBadge = q('#vest-afvg-rec-border-op-val');
          if (opBadge) opBadge.textContent = `${fc.reclaimedBorderOpacity}%`;
        }
        if (q('#vest-afvg-rec-mid-color')) {
          fc.reclaimedMidlineColor = normalizeHexColor(q('#vest-afvg-rec-mid-color').value, fc.reclaimedMidlineColor || '#787b86');
          const hexSpan = q('#vest-afvg-rec-mid-hex');
          if (hexSpan) hexSpan.textContent = fc.reclaimedMidlineColor;
        }
        if (q('#vest-afvg-rec-mid-opacity')) {
          fc.reclaimedMidlineOpacity = Math.max(0, Math.min(100, Number(q('#vest-afvg-rec-mid-opacity').value ?? 60)));
          const opBadge = q('#vest-afvg-rec-mid-op-val');
          if (opBadge) opBadge.textContent = `${fc.reclaimedMidlineOpacity}%`;
        }
        if (q('#vest-afvg-reclaimed-count')) {
          fc.showReclaimedHistoryCount = Math.max(0, Math.min(100, Number(q('#vest-afvg-reclaimed-count').value ?? 15)));
        }
        fc.shrinkOnPartialFill = false;
        if (q('#vest-afvg-sync-native')) fc.syncNativeDrawings = Boolean(q('#vest-afvg-sync-native').checked);
        if (q('#vest-afvg-bull-color')) {
          fc.defaultBullishColor = normalizeHexColor(q('#vest-afvg-bull-color').value, fc.defaultBullishColor || '#26a69a');
          const s = q('#vest-afvg-bull-color').nextElementSibling;
          if (s) s.textContent = fc.defaultBullishColor;
        }
        if (q('#vest-afvg-bear-color')) {
          fc.defaultBearishColor = normalizeHexColor(q('#vest-afvg-bear-color').value, fc.defaultBearishColor || '#ef4444');
          const s = q('#vest-afvg-bear-color').nextElementSibling;
          if (s) s.textContent = fc.defaultBearishColor;
        }
        if (q('#vest-afvg-opacity')) fc.defaultOpacity = Number(q('#vest-afvg-opacity').value) || 22;
        if (q('#vest-afvg-show-midline')) fc.defaultShowMidline = Boolean(q('#vest-afvg-show-midline').checked);
        if (q('#vest-afvg-show-label')) fc.defaultShowLabel = Boolean(q('#vest-afvg-show-label').checked);
      }

      // Sync Economic News Box tab if mounted
      const masterNb = overlay.querySelector('#vest-nb-master-enabled');
      if (masterNb && draftSettings.newsBox) {
        const nc = draftSettings.newsBox;
        nc.enabled = Boolean(masterNb.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-nb-show-red')) nc.showRedFolder = Boolean(q('#vest-nb-show-red').checked);
        if (q('#vest-nb-show-yellow')) nc.showYellowFolder = Boolean(q('#vest-nb-show-yellow').checked);
        if (q('#vest-nb-show-green')) nc.showGreenFolder = Boolean(q('#vest-nb-show-green').checked);
        if (q('#vest-nb-red-color')) {
          nc.redFolderColor = normalizeHexColor(q('#vest-nb-red-color').value, nc.redFolderColor || '#f23645');
          const s = q('#vest-nb-red-color').nextElementSibling;
          if (s) s.textContent = nc.redFolderColor;
        }
        if (q('#vest-nb-yellow-color')) {
          nc.yellowFolderColor = normalizeHexColor(q('#vest-nb-yellow-color').value, nc.yellowFolderColor || '#ff9800');
          const s = q('#vest-nb-yellow-color').nextElementSibling;
          if (s) s.textContent = nc.yellowFolderColor;
        }
        if (q('#vest-nb-green-color')) {
          nc.greenFolderColor = normalizeHexColor(q('#vest-nb-green-color').value, nc.greenFolderColor || '#26a69a');
          const s = q('#vest-nb-green-color').nextElementSibling;
          if (s) s.textContent = nc.greenFolderColor;
        }
        const checkedCountries = Array.from(overlay.querySelectorAll('.vest-nb-country-chk:checked')).map(el => el.value);
        if (checkedCountries.length > 0) {
          nc.countries = checkedCountries;
        }
        if (q('#vest-nb-title')) nc.boxTitle = q('#vest-nb-title').value.trim() || 'Upcoming News';
        if (q('#vest-nb-tz')) {
          nc.timeZoneMode = q('#vest-nb-tz').value || 'ny';
          if (draftSettings.tradesBox) draftSettings.tradesBox.timeZoneMode = nc.timeZoneMode;
        }
        if (q('#vest-nb-time-fmt')) {
          nc.timeFormat = q('#vest-nb-time-fmt').value === '24h' ? '24h' : '12h';
          if (draftSettings.tradesBox) draftSettings.tradesBox.timeFormat = nc.timeFormat;
        }
        if (q('#vest-nb-max-events')) nc.maxEvents = Number(q('#vest-nb-max-events').value) || 6;
        if (q('#vest-nb-width')) nc.boxWidth = Number(q('#vest-nb-width').value) || 325;
        if (q('#vest-nb-bg-color')) nc.bgColor = normalizeHexColor(q('#vest-nb-bg-color').value, nc.bgColor || '#131722');
        if (q('#vest-nb-bg-opacity')) {
          nc.bgOpacity = Math.max(25, Math.min(100, Number(q('#vest-nb-bg-opacity').value) || 88));
          const opBadge = q('#vest-nb-bg-op-badge');
          if (opBadge) opBadge.textContent = `${nc.bgOpacity}%`;
        }
        if (q('#vest-nb-border-color')) {
          nc.borderColor = normalizeHexColor(q('#vest-nb-border-color').value, nc.borderColor || '#38bdf8');
          const s = q('#vest-nb-border-color').nextElementSibling;
          if (s) s.textContent = nc.borderColor;
        }
        if (q('#vest-nb-show-countdown')) nc.showCountdown = Boolean(q('#vest-nb-show-countdown').checked);
        if (q('#vest-nb-show-flag')) nc.showCountryFlag = Boolean(q('#vest-nb-show-flag').checked);
      }

      // Sync Instrument Trades Box tab if mounted
      const masterTb = overlay.querySelector('#vest-tb-master-enabled');
      if (masterTb && draftSettings.tradesBox) {
        const tc = draftSettings.tradesBox;
        tc.enabled = Boolean(masterTb.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-tb-win-color')) {
          tc.winRowColor = normalizeHexColor(q('#vest-tb-win-color').value, tc.winRowColor || '#10b981');
        }
        if (q('#vest-tb-win-opacity')) {
          tc.winRowOpacity = Math.max(8, Math.min(85, Number(q('#vest-tb-win-opacity').value) || 24));
          const opBadge = q('#vest-tb-win-op-badge');
          if (opBadge) opBadge.textContent = `${tc.winRowOpacity}%`;
        }
        if (q('#vest-tb-loss-color')) {
          tc.lossRowColor = normalizeHexColor(q('#vest-tb-loss-color').value, tc.lossRowColor || '#f23645');
        }
        if (q('#vest-tb-loss-opacity')) {
          tc.lossRowOpacity = Math.max(8, Math.min(85, Number(q('#vest-tb-loss-opacity').value) || 24));
          const opBadge = q('#vest-tb-loss-op-badge');
          if (opBadge) opBadge.textContent = `${tc.lossRowOpacity}%`;
        }
        if (q('#vest-tb-long-text-color')) {
          tc.longBadgeTextColor = normalizeHexColor(q('#vest-tb-long-text-color').value, tc.longBadgeTextColor || '#38bdf8');
          const s = q('#vest-tb-long-text-color').nextElementSibling;
          if (s) s.textContent = tc.longBadgeTextColor;
        }
        if (q('#vest-tb-long-bg-color')) {
          tc.longBadgeBgColor = normalizeHexColor(q('#vest-tb-long-bg-color').value, tc.longBadgeBgColor || '#0f172a');
        }
        if (q('#vest-tb-long-bg-opacity')) {
          tc.longBadgeBgOpacity = Math.max(0, Math.min(100, Number(q('#vest-tb-long-bg-opacity').value ?? 85)));
          const opBadge = q('#vest-tb-long-bg-op-badge');
          if (opBadge) opBadge.textContent = `${tc.longBadgeBgOpacity}%`;
        }
        if (q('#vest-tb-long-border-color')) {
          tc.longBadgeBorderColor = normalizeHexColor(q('#vest-tb-long-border-color').value, tc.longBadgeBorderColor || '#38bdf8');
          const s = q('#vest-tb-long-border-color').nextElementSibling;
          if (s) s.textContent = tc.longBadgeBorderColor;
        }
        if (q('#vest-tb-short-text-color')) {
          tc.shortBadgeTextColor = normalizeHexColor(q('#vest-tb-short-text-color').value, tc.shortBadgeTextColor || '#fbbf24');
          const s = q('#vest-tb-short-text-color').nextElementSibling;
          if (s) s.textContent = tc.shortBadgeTextColor;
        }
        if (q('#vest-tb-short-bg-color')) {
          tc.shortBadgeBgColor = normalizeHexColor(q('#vest-tb-short-bg-color').value, tc.shortBadgeBgColor || '#0f172a');
        }
        if (q('#vest-tb-short-bg-opacity')) {
          tc.shortBadgeBgOpacity = Math.max(0, Math.min(100, Number(q('#vest-tb-short-bg-opacity').value ?? 85)));
          const opBadge = q('#vest-tb-short-bg-op-badge');
          if (opBadge) opBadge.textContent = `${tc.shortBadgeBgOpacity}%`;
        }
        if (q('#vest-tb-short-border-color')) {
          tc.shortBadgeBorderColor = normalizeHexColor(q('#vest-tb-short-border-color').value, tc.shortBadgeBorderColor || '#fbbf24');
          const s = q('#vest-tb-short-border-color').nextElementSibling;
          if (s) s.textContent = tc.shortBadgeBorderColor;
        }
        if (q('#vest-tb-side-font-family')) {
          tc.sideBadgeFontFamily = q('#vest-tb-side-font-family').value || tc.sideBadgeFontFamily;
        }
        if (q('#vest-tb-side-font-size')) {
          tc.sideBadgeFontSize = Math.max(7, Math.min(15, Number(q('#vest-tb-side-font-size').value) || 9.5));
          const szVal = q('#vest-tb-side-fontsize-val');
          if (szVal) szVal.textContent = `${tc.sideBadgeFontSize}px`;
        }
        if (q('#vest-tb-side-font-style')) {
          tc.sideBadgeFontStyle = q('#vest-tb-side-font-style').value || 'bold';
        }
        const longPrev = q('#vest-tb-long-badge-preview');
        if (longPrev) longPrev.setAttribute('style', buildSideBadgeInlineStyle('LONG', tc));
        const shortPrev = q('#vest-tb-short-badge-preview');
        if (shortPrev) shortPrev.setAttribute('style', buildSideBadgeInlineStyle('SHORT', tc));
        if (q('#vest-tb-title')) tc.boxTitle = q('#vest-tb-title').value.trim() || 'Instrument Trades';
        if (q('#vest-tb-tz')) {
          tc.timeZoneMode = q('#vest-tb-tz').value || 'ny';
          if (draftSettings.newsBox) draftSettings.newsBox.timeZoneMode = tc.timeZoneMode;
        }
        if (q('#vest-tb-time-fmt')) {
          tc.timeFormat = q('#vest-tb-time-fmt').value === '24h' ? '24h' : '12h';
          if (draftSettings.newsBox) draftSettings.newsBox.timeFormat = tc.timeFormat;
        }
        if (q('#vest-tb-max-trades')) tc.maxTrades = Number(q('#vest-tb-max-trades').value) || 8;
        if (q('#vest-tb-width')) tc.boxWidth = Number(q('#vest-tb-width').value) || 505;
        if (q('#vest-tb-bg-color')) tc.bgColor = normalizeHexColor(q('#vest-tb-bg-color').value, tc.bgColor || '#131722');
        if (q('#vest-tb-bg-opacity')) {
          tc.bgOpacity = Math.max(25, Math.min(100, Number(q('#vest-tb-bg-opacity').value) || 88));
          const opBadge = q('#vest-tb-bg-op-badge');
          if (opBadge) opBadge.textContent = `${tc.bgOpacity}%`;
        }
        if (q('#vest-tb-border-color')) {
          tc.borderColor = normalizeHexColor(q('#vest-tb-border-color').value, tc.borderColor || '#38bdf8');
          const s = q('#vest-tb-border-color').nextElementSibling;
          if (s) s.textContent = tc.borderColor;
        }
        if (q('#vest-tb-filter-inst')) tc.filterCurrentInstrument = Boolean(q('#vest-tb-filter-inst').checked);
        if (q('#vest-tb-filter-session')) tc.filterCurrentSessionOnly = Boolean(q('#vest-tb-filter-session').checked);
        if (q('#vest-tb-show-side')) tc.showSideBadge = Boolean(q('#vest-tb-show-side').checked);
        if (q('#vest-tb-show-summary')) tc.showSummaryFooter = Boolean(q('#vest-tb-show-summary').checked);
        if (q('#vest-tb-auto-capture')) tc.autoCaptureTrades = Boolean(q('#vest-tb-auto-capture').checked);
      }

      // Sync Candle OHLC tab if mounted
      const masterCo = overlay.querySelector('#vest-co-master-enabled');
      if (masterCo && draftSettings.candleOhlc) {
        const co = draftSettings.candleOhlc;
        co.enabled = Boolean(masterCo.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-co-show-numbers')) co.showCandleNumbers = Boolean(q('#vest-co-show-numbers').checked);
        if (q('#vest-co-num-max')) {
          co.candleNumbersMax = Math.max(10, Math.min(300, Math.round(Number(q('#vest-co-num-max').value) || 100)));
          const maxSpan = q('#vest-co-num-max-val');
          if (maxSpan) maxSpan.textContent = `#1–#${co.candleNumbersMax}`;
        }
        if (q('#vest-co-num-font-size')) {
          co.candleNumberFontSize = Math.max(7.5, Math.min(14, Number(q('#vest-co-num-font-size').value) || 9.5));
          const nfSpan = q('#vest-co-num-fontsize-val');
          if (nfSpan) nfSpan.textContent = `${co.candleNumberFontSize}px`;
        }
        if (q('#vest-co-num-glow-color')) {
          co.candleNumberGlowColor = normalizeHexColor(q('#vest-co-num-glow-color').value, co.candleNumberGlowColor || '#38bdf8');
          const s = q('#vest-co-num-glow-color').nextElementSibling;
          if (s) s.textContent = co.candleNumberGlowColor;
        }
        if (q('#vest-co-num-text-color')) {
          co.candleNumberTextColor = normalizeHexColor(q('#vest-co-num-text-color').value, co.candleNumberTextColor || '#f8fafc');
          const s = q('#vest-co-num-text-color').nextElementSibling;
          if (s) s.textContent = co.candleNumberTextColor;
        }
        if (q('#vest-co-num-bg-color')) {
          co.candleNumberBgColor = normalizeHexColor(q('#vest-co-num-bg-color').value, co.candleNumberBgColor || '#0f172a');
        }
        if (q('#vest-co-num-bg-opacity')) {
          co.candleNumberBgOpacity = Math.max(20, Math.min(100, Number(q('#vest-co-num-bg-opacity').value ?? 90)));
          const opVal = q('#vest-co-num-bg-op-val');
          if (opVal) opVal.textContent = `${co.candleNumberBgOpacity}%`;
        }
        if (q('#vest-co-custom-width-enabled')) {
          co.customCandleWidthEnabled = Boolean(q('#vest-co-custom-width-enabled').checked);
        }
        if (q('#vest-co-candle-width')) {
          co.candleWidthPx = Math.max(40, Math.min(260, Number(q('#vest-co-candle-width').value) || 140));
          const wVal = q('#vest-co-width-val');
          if (wVal) wVal.textContent = `${co.candleWidthPx}%`;
        }
        if (q('#vest-co-click-toggle')) co.clickCandleToToggle = Boolean(q('#vest-co-click-toggle').checked);
        if (q('#vest-co-show-open')) co.showOpen = Boolean(q('#vest-co-show-open').checked);
        if (q('#vest-co-show-high')) co.showHigh = Boolean(q('#vest-co-show-high').checked);
        if (q('#vest-co-show-low')) co.showLow = Boolean(q('#vest-co-show-low').checked);
        if (q('#vest-co-show-close')) co.showClose = Boolean(q('#vest-co-show-close').checked);
        if (q('#vest-co-display-mode')) co.displayMode = q('#vest-co-display-mode').value === 'levels' ? 'levels' : 'badge';
        if (q('#vest-co-decimals')) co.decimals = q('#vest-co-decimals').value || 'auto';
        if (q('#vest-co-font-size')) {
          co.fontSize = Math.max(8, Math.min(15, Number(q('#vest-co-font-size').value) || 10));
          const szVal = q('#vest-co-fontsize-val');
          if (szVal) szVal.textContent = `${co.fontSize}px`;
        }
        if (q('#vest-co-bg-color')) co.bgColor = normalizeHexColor(q('#vest-co-bg-color').value, co.bgColor || '#0f172a');
        if (q('#vest-co-bg-opacity')) {
          co.bgOpacity = Math.max(25, Math.min(100, Number(q('#vest-co-bg-opacity').value) || 88));
          const opBadge = q('#vest-co-bg-op-badge');
          if (opBadge) opBadge.textContent = `${co.bgOpacity}%`;
        }
        if (q('#vest-co-text-color')) {
          co.textColor = normalizeHexColor(q('#vest-co-text-color').value, co.textColor || '#f8fafc');
          const s = q('#vest-co-text-color').nextElementSibling;
          if (s) s.textContent = co.textColor;
        }
        if (q('#vest-co-bull-color')) {
          co.bullColor = normalizeHexColor(q('#vest-co-bull-color').value, co.bullColor || '#10b981');
        }
        if (q('#vest-co-bear-color')) {
          co.bearColor = normalizeHexColor(q('#vest-co-bear-color').value, co.bearColor || '#f23645');
        }
      }

      // Sync Active Position HUD tab if mounted
      const masterPh = overlay.querySelector('#vest-ph-master-enabled');
      if (masterPh && draftSettings.positionHud) {
        const ph = draftSettings.positionHud;
        ph.enabled = Boolean(masterPh.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-ph-price-line')) ph.showPriceLineHud = Boolean(q('#vest-ph-price-line').checked);
        if (q('#vest-ph-flatten-btn')) ph.showFlattenBtn = Boolean(q('#vest-ph-flatten-btn').checked);
        if (q('#vest-ph-entry-badge')) ph.showEntryBadge = Boolean(q('#vest-ph-entry-badge').checked);
        if (q('#vest-ph-pnl-percent')) ph.showPnlPercent = Boolean(q('#vest-ph-pnl-percent').checked);
        if (q('#vest-ph-auto-confirm')) ph.autoConfirmFlatten = Boolean(q('#vest-ph-auto-confirm').checked);
      }
      const failLinesToggle = overlay.querySelector('#vest-fail-lines-enabled');
      if (failLinesToggle) {
        draftSettings.failLines = { ...normalizeFailLinesConfig(draftSettings.failLines), enabled: Boolean(failLinesToggle.checked) };
      }
      const failLinesCfg = normalizeFailLinesConfig(draftSettings.failLines);
      const labelSize = overlay.querySelector('#vest-fail-lines-label-size');
      const fontSize = overlay.querySelector('#vest-fail-lines-font-size');
      if (labelSize) failLinesCfg.labelSize = Number(labelSize.value);
      if (fontSize) failLinesCfg.fontSize = Number(fontSize.value);
      draftSettings.failLines = normalizeFailLinesConfig(failLinesCfg);
      const labelSizeValue = overlay.querySelector('#vest-fail-lines-label-size-value');
      const fontSizeValue = overlay.querySelector('#vest-fail-lines-font-size-value');
      if (labelSizeValue) labelSizeValue.textContent = `${draftSettings.failLines.labelSize}%`;
      if (fontSizeValue) fontSizeValue.textContent = `${draftSettings.failLines.fontSize}px`;

      const ciEnabled = overlay.querySelector('#vest-ci-enabled');
      if (ciEnabled) {
        const ci = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
        const q = (id) => overlay.querySelector(`#${id}`);
        ci.enabled = Boolean(ciEnabled.checked);
        if (q('vest-ci-ema-length')) ci.emaLength = Number(q('vest-ci-ema-length').value);
        if (q('vest-ci-atr-length')) ci.atrLength = Number(q('vest-ci-atr-length').value);
        if (q('vest-ci-trend-multiplier')) ci.trendMultiplier = Number(q('vest-ci-trend-multiplier').value);
        if (q('vest-ci-distance-mode')) ci.levelDistanceMode = q('vest-ci-distance-mode').value;
        if (q('vest-ci-stop-points')) ci.stopLossPoints = Number(q('vest-ci-stop-points').value);
        if (q('vest-ci-target-spacing')) ci.targetSpacingPoints = Number(q('vest-ci-target-spacing').value);
        if (q('vest-ci-level-font-size')) ci.levelFontSize = Number(q('vest-ci-level-font-size').value);
        if (q('vest-ci-level-box-scale')) ci.levelBoxScale = Number(q('vest-ci-level-box-scale').value);
        if (q('vest-ci-show-signals')) ci.showSignals = Boolean(q('vest-ci-show-signals').checked);
        if (q('vest-ci-show-targets')) ci.showTargets = Boolean(q('vest-ci-show-targets').checked);
        if (q('vest-ci-show-table')) ci.showTrendTable = Boolean(q('vest-ci-show-table').checked);
        if (q('vest-ci-execution-enabled')) ci.executionEnabled = Boolean(q('vest-ci-execution-enabled').checked);
        if (q('vest-ci-execution-mode')) ci.executionMode = q('vest-ci-execution-mode').value === 'live' ? 'live' : 'paper';
        if (q('vest-ci-live-armed')) ci.liveArmed = Boolean(q('vest-ci-live-armed').checked);
        if (q('vest-ci-reversal-ignore-bars')) ci.reversalIgnoreBars = Number(q('vest-ci-reversal-ignore-bars').value);
        draftSettings.cortexIndicator = normalizeCortexIndicatorConfig(ci);
        [['vest-ci-ema-length', '', 0], ['vest-ci-atr-length', '', 0], ['vest-ci-trend-multiplier', '×', 1], ['vest-ci-stop-points', ' pts', 2], ['vest-ci-target-spacing', ' pts', 2], ['vest-ci-level-font-size', ' px', 0], ['vest-ci-level-box-scale', '%', 0], ['vest-ci-reversal-ignore-bars', ' bars', 0]].forEach(([id, unit, digits]) => {
          const input = q(id);
          const value = q(`${id}-value`);
          if (input && value) value.textContent = `${Number(input.value).toFixed(digits)}${unit}`;
        });
        const status = q('vest-ci-execution-status');
        if (status) {
          status.textContent = !ci.executionEnabled ? 'Automation is off.' : !ci.enabled ? 'Turn on Show Cortex Indicator to generate signals.' : ci.executionMode === 'paper' ? 'Paper simulation is active; no orders will be sent.' : 'Live mode is locked until the Vest order adapter is verified.';
          status.style.color = !ci.executionEnabled ? '#94a3b8' : ci.executionMode === 'paper' ? '#34d399' : '#fca5a5';
        }
      }
      const formingAlert = overlay.querySelector('#vest-ci-forming-voice-alert');
      const confirmedAlert = overlay.querySelector('#vest-ci-confirmed-voice-alert');
      const alertVoice = overlay.querySelector('#vest-ci-alert-voice');
      if (formingAlert || confirmedAlert || alertVoice) {
        const ci = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
        if (formingAlert) ci.formingSignalVoiceAlert = Boolean(formingAlert.checked);
        if (confirmedAlert) ci.confirmedSignalVoiceAlert = Boolean(confirmedAlert.checked);
        if (alertVoice) ci.signalAlertVoiceURI = alertVoice.value;
        draftSettings.cortexIndicator = normalizeCortexIndicatorConfig(ci);
      }
      if (activeTab === 'diagnostics') {
        const dbMaster = overlay.querySelector('#vest-dbg-master-toggle');
        if (dbMaster) draftSettings.debugMode = Boolean(dbMaster.checked);
        const dbBox = overlay.querySelector('#vest-dbg-box-enabled');
        if (dbBox) {
          if (!draftSettings.diagnosticsBox) draftSettings.diagnosticsBox = normalizeDiagnosticsBoxConfig(null);
          draftSettings.diagnosticsBox.enabled = Boolean(dbBox.checked);
        }
        const w = overlay.querySelector('#vest-dbg-box-width');
        if (w && draftSettings.diagnosticsBox) draftSettings.diagnosticsBox.boxWidth = Number(w.value) || 360;
        const op = overlay.querySelector('#vest-dbg-bg-op');
        if (op && draftSettings.diagnosticsBox) draftSettings.diagnosticsBox.bgOpacity = Number(op.value) || 94;
        const bg = overlay.querySelector('#vest-dbg-bg-color');
        if (bg && draftSettings.diagnosticsBox) draftSettings.diagnosticsBox.bgColor = bg.value;
        const bc = overlay.querySelector('#vest-dbg-border-color');
        if (bc && draftSettings.diagnosticsBox) draftSettings.diagnosticsBox.borderColor = bc.value;
      }
      // Sync Order Blocks
      const masterOb = overlay.querySelector('#vest-ob-master-enabled');
      if (masterOb || overlay.querySelector('#vest-ob-extend-mode')) {
        const ob = normalizeOrderBlocksConfig(draftSettings.orderBlocks);
        if (masterOb) ob.enabled = Boolean(masterOb.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-ob-swing-lookback')) ob.swingLookback = Number(q('#vest-ob-swing-lookback').value) || 5;
        if (q('#vest-ob-max-blocks')) ob.maxBlocks = Number(q('#vest-ob-max-blocks').value) || 10;
        if (q('#vest-ob-min-fvg-ticks')) ob.minFvgTicks = Number(q('#vest-ob-min-fvg-ticks').value) || 1;
        if (q('#vest-ob-extend-mode')) ob.extendMode = q('#vest-ob-extend-mode').value || 'mitigation';
        if (q('#vest-ob-bull-color')) ob.bullishColor = q('#vest-ob-bull-color').value || '#10b981';
        if (q('#vest-ob-bull-color-hex')) q('#vest-ob-bull-color-hex').textContent = ob.bullishColor;
        if (q('#vest-ob-bull-opacity')) ob.bullishOpacity = Number(q('#vest-ob-bull-opacity').value) || 20;
        if (q('#vest-ob-bear-color')) ob.bearishColor = q('#vest-ob-bear-color').value || '#ef4444';
        if (q('#vest-ob-bear-color-hex')) q('#vest-ob-bear-color-hex').textContent = ob.bearishColor;
        if (q('#vest-ob-bear-opacity')) ob.bearishOpacity = Number(q('#vest-ob-bear-opacity').value) || 20;
        if (q('#vest-ob-label-font-size')) ob.labelFontSize = Number(q('#vest-ob-label-font-size').value) || 18;
        if (q('#vest-ob-mtf-label-font-size')) ob.mtfLabelFontSize = Number(q('#vest-ob-mtf-label-font-size').value) || 22;
        if (q('#vest-ob-mtf-max-blocks')) ob.mtfMaxBlocksPerTf = Number(q('#vest-ob-mtf-max-blocks').value) || 4;
        if (!ob.mtfTimeframes || typeof ob.mtfTimeframes !== 'object') ob.mtfTimeframes = {};
        ['5m', '15m', '1h', '4h'].forEach(tf => {
          const cur = ob.mtfTimeframes[tf] || {};
          const enEl = q(`#vest-ob-mtf-${tf}-enabled`);
          const bullEl = q(`#vest-ob-mtf-${tf}-bull`);
          const bearEl = q(`#vest-ob-mtf-${tf}-bear`);
          const opEl = q(`#vest-ob-mtf-${tf}-opacity`);
          if (enEl || bullEl || bearEl || opEl) {
            ob.mtfTimeframes[tf] = {
              enabled: enEl ? Boolean(enEl.checked) : cur.enabled,
              bullishColor: bullEl ? (bullEl.value || cur.bullishColor) : cur.bullishColor,
              bearishColor: bearEl ? (bearEl.value || cur.bearishColor) : cur.bearishColor,
              opacity: opEl ? (Number(opEl.value) || cur.opacity) : cur.opacity
            };
          }
          const opVal = q(`#vest-ob-mtf-${tf}-opacity-value`);
          if (opEl && opVal) opVal.textContent = `${opEl.value}%`;
        });
        [
          ['#vest-ob-swing-lookback', ' bars'],
          ['#vest-ob-max-blocks', ' blocks'],
          ['#vest-ob-min-fvg-ticks', ' ticks'],
          ['#vest-ob-bull-opacity', '%'],
          ['#vest-ob-bear-opacity', '%'],
          ['#vest-ob-label-font-size', ' px'],
          ['#vest-ob-mtf-label-font-size', ' px'],
          ['#vest-ob-mtf-max-blocks', ' blocks'],
          ['#vest-ob-icon-size', ' px'],
          ['#vest-ob-rr-ratio', ' R:R'],
          ['#vest-ob-stats-rr-ratio', ' RR']
        ].forEach(([sel, unit]) => {
          const el = q(sel);
          const valEl = q(`${sel}-value`);
          if (el && valEl) valEl.textContent = `${el.value}${unit}`;
        });
        if (q('#vest-ob-show-entry-icon')) ob.showOrderEntryIcon = Boolean(q('#vest-ob-show-entry-icon').checked);
        if (q('#vest-ob-icon-size')) ob.orderIconSize = Number(q('#vest-ob-icon-size').value) || 13;
        if (q('#vest-ob-voice-alert')) ob.voiceAlertEnabled = Boolean(q('#vest-ob-voice-alert').checked);
        if (q('#vest-ob-chime-alert')) ob.chimeAlertEnabled = Boolean(q('#vest-ob-chime-alert').checked);
        if (q('#vest-ob-voice-uri')) ob.voiceURI = q('#vest-ob-voice-uri').value || '';
        if (q('#vest-ob-show-target-lines')) ob.showTargetLines = Boolean(q('#vest-ob-show-target-lines').checked);
        if (q('#vest-ob-rr-ratio')) ob.riskRewardRatio = Number(q('#vest-ob-rr-ratio').value) || 2.0;
        if (q('#vest-ob-show-stats-box')) ob.showStatsBox = Boolean(q('#vest-ob-show-stats-box').checked);
        if (q('#vest-ob-stats-rr-ratio')) ob.statsRrRatio = Number(q('#vest-ob-stats-rr-ratio').value) || 3.0;
        draftSettings.orderBlocks = normalizeOrderBlocksConfig(ob);
      }

      // Sync Range Detector
      const masterRd = overlay.querySelector('#vest-rd-master-enabled');
      if (masterRd || overlay.querySelector('#vest-rd-lookback')) {
        const rd = normalizeRangeDetectorConfig(draftSettings.rangeDetector);
        if (masterRd) rd.enabled = Boolean(masterRd.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-rd-lookback')) rd.lookbackBars = Number(q('#vest-rd-lookback').value) || 20;
        if (q('#vest-rd-mode')) rd.detectionMode = q('#vest-rd-mode').value || 'hybrid';
        if (q('#vest-rd-chop-thresh')) rd.chopThreshold = Number(q('#vest-rd-chop-thresh').value) || 55;
        if (q('#vest-rd-adx-thresh')) rd.adxThreshold = Number(q('#vest-rd-adx-thresh').value) || 22;
        if (q('#vest-rd-opacity')) rd.bgOpacity = Number(q('#vest-rd-opacity').value) || 90;
        if (q('#vest-rd-width')) rd.boxWidth = Number(q('#vest-rd-width').value) || 290;
        if (q('#vest-rd-voice-alert')) rd.voiceAlertEnabled = Boolean(q('#vest-rd-voice-alert').checked);
        if (q('#vest-rd-chime-alert')) rd.chimeAlertEnabled = Boolean(q('#vest-rd-chime-alert').checked);
        if (q('#vest-rd-glow-effect')) rd.glowEffect = Boolean(q('#vest-rd-glow-effect').checked);
        draftSettings.rangeDetector = normalizeRangeDetectorConfig(rd);
      }

      // Sync Accounts & Risk Box
      const masterArb = overlay.querySelector('#vest-arb-master-enabled');
      if (masterArb || overlay.querySelector('#vest-arb-risk-pct')) {
        const arb = normalizeAccountsRiskBoxConfig(draftSettings.accountsRiskBox);
        if (masterArb) arb.enabled = Boolean(masterArb.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-arb-risk-pct')) arb.riskPercent = Number(q('#vest-arb-risk-pct').value) || 1.0;
        if (q('#vest-arb-width')) arb.boxWidth = Number(q('#vest-arb-width').value) || 248;
        if (q('#vest-arb-font-size')) arb.fontSize = Number(q('#vest-arb-font-size').value) || 10.5;
        if (q('#vest-arb-offset-x')) arb.offsetX = Number(q('#vest-arb-offset-x').value) || 12;
        if (q('#vest-arb-offset-y')) arb.offsetY = Number(q('#vest-arb-offset-y').value) || 52;
        if (q('#vest-arb-bg-opacity')) arb.bgOpacity = Number(q('#vest-arb-bg-opacity').value) || 82;
        if (q('#vest-arb-border-color')) arb.borderColor = q('#vest-arb-border-color').value || '#38bdf8';
        if (q('#vest-arb-show-other-pnl')) arb.showOtherPnl = Boolean(q('#vest-arb-show-other-pnl').checked);
        draftSettings.accountsRiskBox = normalizeAccountsRiskBoxConfig(arb);
      }

            // Sync Market Structure
      const masterMs = overlay.querySelector('#vest-ms-master-enabled');
      if (masterMs || overlay.querySelector('#vest-ms-swing-lookback')) {
        const ms = normalizeMarketStructureConfig(draftSettings.marketStructure);
        if (masterMs) ms.enabled = Boolean(masterMs.checked);
        const q = (sel) => overlay.querySelector(sel);
        if (q('#vest-ms-swing-lookback')) ms.swingLookback = Number(q('#vest-ms-swing-lookback').value) || 5;
        if (q('#vest-ms-max-lines')) ms.maxStructureLines = Number(q('#vest-ms-max-lines').value) || 15;
        if (q('#vest-ms-break-mode')) ms.breakMode = q('#vest-ms-break-mode').value === 'wick' ? 'wick' : 'close';
        if (q('#vest-ms-show-bos')) ms.showBos = Boolean(q('#vest-ms-show-bos').checked);
        if (q('#vest-ms-show-choch')) ms.showChoch = Boolean(q('#vest-ms-show-choch').checked);
        if (q('#vest-ms-extend-lines')) ms.extendLines = Boolean(q('#vest-ms-extend-lines').checked);
        if (q('#vest-ms-label-mode')) ms.labelMode = q('#vest-ms-label-mode').value || 'both';
        if (q('#vest-ms-line-style')) ms.lineStyle = q('#vest-ms-line-style').value === 'solid' ? 'solid' : 'dashed';
        if (q('#vest-ms-bull-color')) ms.bullishColor = q('#vest-ms-bull-color').value || '#10b981';
        if (q('#vest-ms-bear-color')) ms.bearishColor = q('#vest-ms-bear-color').value || '#ef4444';
        draftSettings.marketStructure = normalizeMarketStructureConfig(ms);
      }

      if (false && 'vest_dummy_ci_close') {
        draftSettings.cortexIndicator = normalizeCortexIndicatorConfig(ci);
      }
    }

    function commitDraftAndClose() {
      syncCurrentPaneToDraft();
      if (saveSettingsTimeout) {
        clearTimeout(saveSettingsTimeout);
        saveSettingsTimeout = null;
      }
      pendingSettingsUpdate = null;
      settings = {
        ...settings,
        ...draftSettings
      };
      applyDialogGlassEffect(settings.dialogGlassEffect, settings.dialogGlassOpacity);
      safeStorageSet({ templates, settings });
      notifyMainWorldConfig();
      if (settings.rememberSidebarTools !== false) {
        postToMainWorlds({
          type: 'VEST_TV_CAPTURE_AND_RESTORE_SIDEBAR'
        });
      }
      if (settings.rememberLastChartSettings !== false) {
        postToMainWorlds({
          type: 'VEST_TV_CAPTURE_CHART_SETTINGS'
        });
      }
      renderStudioHeaderPill();
      if (typeof renderChartNewsBox === 'function') renderChartNewsBox();
      if (typeof renderChartTradesBox === 'function') renderChartTradesBox();
      if (typeof renderChartRangeBox === 'function') renderChartRangeBox();
      if (typeof renderChartOrderBlockStatsBox === 'function') renderChartOrderBlockStatsBox();
      if (typeof renderChartDiagnosticsBox === 'function') renderChartDiagnosticsBox();
      if (typeof renderChartAccountsRiskBox === 'function') renderChartAccountsRiskBox();
      showToast('Settings saved');
      if (typeof closeTvColorPickerPopover === 'function') closeTvColorPickerPopover();
      window.removeEventListener('cortex-live-settings-updated', onLiveSettingsUpdated);
      overlay.remove();
      window.removeEventListener('mousemove', onModalMouseMove, true);
      window.removeEventListener('mouseup', onModalMouseUp, true);
    }

    function wireDialogEvents() {
      // Header drag-to-move handler
      const dragHandle = overlay.querySelector('#vest-tvs-drag-handle');
      if (dragHandle) {
        dragHandle.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          if (e.target.closest('#vest-tvs-close')) return;
          isDraggingModal = true;
          dragStartMouse = { x: e.clientX, y: e.clientY };
          dragStartOffset = { x: modalOffset.x, y: modalOffset.y };
          e.preventDefault();
        });
      }

      // Multi-directional Dialog resize handles (top, bottom, left, right, and corners)
      const resizeHandles = overlay.querySelectorAll('.vest-tvs-resize-edge, .vest-tvs-resize-corner, #vest-tvs-resize-handle');
      resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          const cardEl = overlay.querySelector('.vest-tvs-card');
          if (!cardEl) return;
          isResizingModal = true;
          resizeDirection = handle.getAttribute('data-direction') || 'bottom-right';
          resizeStartMouse = { x: e.clientX, y: e.clientY };
          resizeStartSize = { width: cardEl.offsetWidth, height: cardEl.offsetHeight };
          resizeStartOffset = { x: modalOffset.x, y: modalOffset.y };
          e.preventDefault();
          e.stopPropagation();
        });
      });

      // Live ResizeObserver sync for native browser resize grip
      const cardEl = overlay.querySelector('.vest-tvs-card');
      if (cardEl && typeof ResizeObserver !== 'undefined') {
        try {
          const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
              if (!isResizingModal && entry.contentRect && entry.contentRect.width && entry.contentRect.height) {
                modalSize.width = Math.round(cardEl.offsetWidth);
                modalSize.height = Math.round(cardEl.offsetHeight);
              }
            }
          });
          ro.observe(cardEl);
        } catch (e) {}
      }

      // Glass effect toggle & opacity slider on About tab
      const glassToggle = overlay.querySelector('#vest-tvs-dialog-glass-toggle');
      const glassOpBox = overlay.querySelector('#vest-tvs-dialog-glass-opacity-box');
      if (glassToggle) {
        glassToggle.addEventListener('change', () => {
          draftSettings.dialogGlassEffect = Boolean(glassToggle.checked);
          if (glassOpBox) {
            glassOpBox.style.display = draftSettings.dialogGlassEffect ? 'block' : 'none';
          }
          applyDialogGlassEffect(draftSettings.dialogGlassEffect, draftSettings.dialogGlassOpacity);
        });
      }

      const glassOpRange = overlay.querySelector('#vest-tvs-dialog-glass-op-range');
      const glassOpVal = overlay.querySelector('#vest-tvs-dialog-glass-op-val');
      if (glassOpRange) {
        glassOpRange.addEventListener('input', () => {
          const val = Math.max(15, Math.min(95, parseInt(glassOpRange.value, 10) || 78));
          draftSettings.dialogGlassOpacity = val;
          if (glassOpVal) {
            glassOpVal.textContent = `${val}%`;
          }
          applyDialogGlassEffect(draftSettings.dialogGlassEffect, val);
        });
      }

      // Left navigation switching
      overlay.querySelectorAll('.vest-tvs-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          syncCurrentPaneToDraft();
          activeTab = btn.dataset.tab;
          renderDialog();
        });
      });

      // Live toggle state sync on Chart Memory Features tab
      const remToggle = overlay.querySelector('#vest-tvs-remember-tools-toggle');
      if (remToggle) {
        remToggle.addEventListener('change', () => {
          draftSettings.rememberSidebarTools = Boolean(remToggle.checked);
        });
      }

      const remChartToggle = overlay.querySelector('#vest-tvs-remember-chart-settings-toggle');
      if (remChartToggle) {
        remChartToggle.addEventListener('change', () => {
          draftSettings.rememberLastChartSettings = Boolean(remChartToggle.checked);
        });
      }

      overlay.querySelectorAll('.vest-tvs-favorite-timeframe').forEach(input => {
        input.addEventListener('change', () => {
          const labels = new Map([
            ['1', '1 minute'], ['3', '3 minutes'], ['5', '5 minutes'], ['15', '15 minutes'], ['30', '30 minutes'],
            ['60', '1 hour'], ['120', '2 hours'], ['240', '4 hours'], ['360', '6 hours'], ['480', '8 hours'], ['720', '12 hours'],
            ['1D', '1 day'], ['3D', '3 days'], ['1W', '1 week'], ['1M', '1 month']
          ]);
          draftSettings.favoriteTimeframes = Array.from(overlay.querySelectorAll('.vest-tvs-favorite-timeframe'))
            .filter(item => item.checked)
            .map(item => ({ resolution: item.value, label: labels.get(item.value) || item.value }));
        });
      });

      // Master toggle & tile header click handling on Charting Indicators hub
      if (activeTab === 'chartingindicators') {
        const indToggles = overlay.querySelectorAll('.vest-ind-master-toggle');
        indToggles.forEach(toggle => {
          toggle.addEventListener('change', (e) => {
            e.stopPropagation();
            const indId = toggle.getAttribute('data-indicator-id');
            const isChecked = toggle.checked;

            const tile = overlay.querySelector(`#vest-ind-tile-${indId}`);
            if (tile) {
              tile.classList.toggle('is-enabled', isChecked);
              const badge = tile.querySelector('.vest-indicator-status-badge');
              if (badge) {
                badge.textContent = isChecked ? 'ON' : 'OFF';
                badge.className = `vest-indicator-status-badge ${isChecked ? 'on' : 'off'}`;
              }
            }

            const settingsBtn = overlay.querySelector(`#vest-ind-settings-btn-${indId}`);
            if (settingsBtn) {
              settingsBtn.style.display = isChecked ? 'inline-flex' : 'none';
              if (!isChecked) {
                settingsBtn.classList.remove('is-active');
              }
            }

            const drawer = overlay.querySelector(`#vest-ind-drawer-${indId}`);
            if (drawer) {
              // Toggling OFF collapses drawer. Toggling ON reveals Settings button while keeping drawer collapsed until clicked.
              if (!isChecked) {
                drawer.style.display = 'none';
              }
            }

            if (indId === 'sessions' && draftSettings.sessionIndicators) draftSettings.sessionIndicators.enabled = isChecked;
            else if (indId === 'autofvg' && draftSettings.autoFvg) draftSettings.autoFvg.enabled = isChecked;
            else if (indId === 'news' && draftSettings.newsBox) draftSettings.newsBox.enabled = isChecked;
            else if (indId === 'trades' && draftSettings.tradesBox) draftSettings.tradesBox.enabled = isChecked;
            else if (indId === 'candleohlc' && draftSettings.candleOhlc) draftSettings.candleOhlc.enabled = isChecked;
            else if (indId === 'positionhud' && draftSettings.positionHud) draftSettings.positionHud.enabled = isChecked;
            else if (indId === 'faillines' && draftSettings.failLines) draftSettings.failLines.enabled = isChecked;
            else if (indId === 'cortexindicator' && draftSettings.cortexIndicator) draftSettings.cortexIndicator.enabled = isChecked;
            else if (indId === 'orderblocks' && draftSettings.orderBlocks) draftSettings.orderBlocks.enabled = isChecked;
            else if (indId === 'marketstructure' && draftSettings.marketStructure) draftSettings.marketStructure.enabled = isChecked;
            else if (indId === 'rangedetector' && draftSettings.rangeDetector) draftSettings.rangeDetector.enabled = isChecked;
            else if (indId === 'accountsrisk' && draftSettings.accountsRiskBox) draftSettings.accountsRiskBox.enabled = isChecked;

            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
            renderStudioHeaderPill();
          });
        });

        // Settings button click: toggles settings drawer for that specific indicator
        const settingsBtns = overlay.querySelectorAll('.vest-indicator-settings-btn');
        settingsBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const indId = btn.getAttribute('data-indicator-id');
            const drawer = overlay.querySelector(`#vest-ind-drawer-${indId}`);
            if (!drawer) return;

            const isCurrentlyOpen = drawer.style.display !== 'none';
            if (isCurrentlyOpen) {
              drawer.style.display = 'none';
              btn.classList.remove('is-active');
            } else {
              drawer.style.display = 'block';
              btn.classList.add('is-active');
            }
          });
        });

        const tileHeaders = overlay.querySelectorAll('.vest-indicator-tile-header');
        tileHeaders.forEach(header => {
          header.addEventListener('click', (e) => {
            if (
              e.target.closest('.vest-tvs-switch') ||
              e.target.closest('.vest-indicator-settings-btn') ||
              e.target.tagName === 'INPUT' ||
              e.target.tagName === 'LABEL' ||
              e.target.tagName === 'BUTTON'
            ) {
              return;
            }
            const indId = header.getAttribute('data-indicator-id');
            const toggle = header.querySelector('.vest-ind-master-toggle');
            if (!toggle) return;

            if (toggle.checked) {
              // Indicator is already ON -> toggle settings drawer
              const drawer = overlay.querySelector(`#vest-ind-drawer-${indId}`);
              const settingsBtn = overlay.querySelector(`#vest-ind-settings-btn-${indId}`);
              if (drawer) {
                const isOpen = drawer.style.display !== 'none';
                drawer.style.display = isOpen ? 'none' : 'block';
                if (settingsBtn) {
                  settingsBtn.classList.toggle('is-active', !isOpen);
                }
              }
            } else {
              // Indicator is not on -> toggle indicator ON
              toggle.checked = true;
              toggle.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        });
      }

      // Live preview & range label updates on Session Indicators tab
      if (activeTab === 'sessions' || activeTab === 'chartingindicators') {
        const dateFmtInput = overlay.querySelector('#vest-si-perm-date-format');
        const datePresetSelect = overlay.querySelector('#vest-si-perm-date-preset');
        if (datePresetSelect && dateFmtInput) {
          datePresetSelect.addEventListener('change', () => {
            if (datePresetSelect.value) {
              dateFmtInput.value = datePresetSelect.value;
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            }
          });
        }

        const fontSizeRange = overlay.querySelector('#vest-si-font-size');
        const fontSizeVal = overlay.querySelector('#vest-si-fontsize-val');
        if (fontSizeRange && fontSizeVal) {
          fontSizeRange.addEventListener('input', () => {
            fontSizeVal.textContent = `${fontSizeRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const permFontSizeRange = overlay.querySelector('#vest-si-perm-font-size');
        const permFontSizeVal = overlay.querySelector('#vest-si-perm-fontsize-val');
        if (permFontSizeRange && permFontSizeVal) {
          permFontSizeRange.addEventListener('input', () => {
            permFontSizeVal.textContent = `${permFontSizeRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const permCustomColorInput = overlay.querySelector('#vest-si-perm-custom-color');
        const permColorModeSelect = overlay.querySelector('#vest-si-perm-color-mode');
        if (permCustomColorInput && permColorModeSelect) {
          permCustomColorInput.addEventListener('input', () => {
            permColorModeSelect.value = 'custom';
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const wmOpRange = overlay.querySelector('#vest-si-wm-opacity');
        const wmOpVal = overlay.querySelector('#vest-si-wm-opacity-val');
        if (wmOpRange && wmOpVal) {
          wmOpRange.addEventListener('input', () => {
            wmOpVal.textContent = `${wmOpRange.value}%`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const boxOpRange = overlay.querySelector('#vest-si-box-opacity');
        const boxOpVal = overlay.querySelector('#vest-si-box-opacity-val');
        if (boxOpRange && boxOpVal) {
          boxOpRange.addEventListener('input', () => {
            boxOpVal.textContent = `${boxOpRange.value}%`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        if (rightPane) {
          rightPane.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
          rightPane.addEventListener('input', (e) => {
            if (e.target && (e.target.type === 'color' || e.target.type === 'text' || e.target.type === 'time')) {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            }
          });
        }

        overlay.querySelector('#vest-si-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.sessionIndicators = JSON.parse(JSON.stringify(DEFAULT_SESSION_INDICATORS));
          draftSettings.sessionIndicators.enabled = true;
          targetIndicatorToScroll = 'sessions';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Session Indicators to ICT defaults');
        });
      }

      if (activeTab === 'autofvg' || activeTab === 'chartingindicators') {
        const opRange = overlay.querySelector('#vest-afvg-opacity');
        const opVal = overlay.querySelector('#vest-afvg-opacity-val');
        if (opRange && opVal) {
          opRange.addEventListener('input', () => {
            opVal.textContent = `${opRange.value}%`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const showReclaimedToggle = overlay.querySelector('#vest-afvg-show-reclaimed');
        if (showReclaimedToggle) {
          showReclaimedToggle.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            renderDialog();
            broadcastLiveSessionDraft();
          });
        }

        ['#vest-afvg-rec-box-opacity', '#vest-afvg-rec-border-opacity', '#vest-afvg-rec-mid-opacity'].forEach(sel => {
          const rng = overlay.querySelector(sel);
          if (rng) {
            rng.addEventListener('input', () => {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            });
          }
        });

        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        if (rightPane) {
          rightPane.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
          rightPane.addEventListener('input', (e) => {
            if (e.target && (e.target.type === 'color' || e.target.type === 'text' || e.target.type === 'number')) {
              if (e.target.id === 'vest-afvg-future-bars' && draftSettings.autoFvg && draftSettings.autoFvg.extendMode === 'right') {
                const modeSel = overlay.querySelector('#vest-afvg-extend-mode');
                if (modeSel && Number(e.target.value) > 0) {
                  modeSel.value = 'current';
                }
              }
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            }
          });
        }

        overlay.querySelector('#vest-afvg-clear-log-btn')?.addEventListener('click', () => {
          try {
            window.localStorage.removeItem('__trading_cortex_created_fvgs_log__');
          } catch (e) {}
          postToMainWorlds({
            type: 'VEST_TV_CLEAR_CREATED_FVG_LOG'
          });
          showToast('Cleared created FVG log');
        });

        overlay.querySelector('#vest-afvg-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.autoFvg = JSON.parse(JSON.stringify(DEFAULT_AUTO_FVG));
          draftSettings.autoFvg.enabled = true;
          targetIndicatorToScroll = 'autofvg';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast("Reset Auto FVG's to defaults");
        });
      }

      if (activeTab === 'news' || activeTab === 'chartingindicators') {
        const widthRange = overlay.querySelector('#vest-nb-width');
        const widthVal = overlay.querySelector('#vest-nb-width-val');
        if (widthRange && widthVal) {
          widthRange.addEventListener('input', () => {
            widthVal.textContent = `${widthRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const bgOpRange = overlay.querySelector('#vest-nb-bg-opacity');
        if (bgOpRange) {
          bgOpRange.addEventListener('input', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        overlay.querySelector('#vest-nb-countries-all')?.addEventListener('click', () => {
          draftSettings.newsBox.countries = [...NEWS_ALL_COUNTRIES];
          renderDialog();
          broadcastLiveSessionDraft();
        });

        overlay.querySelector('#vest-nb-countries-usd')?.addEventListener('click', () => {
          draftSettings.newsBox.countries = ['USD'];
          renderDialog();
          broadcastLiveSessionDraft();
        });

        overlay.querySelector('#vest-nb-refresh-feed-btn')?.addEventListener('click', () => {
          fetchLiveEconomicNewsEvents(true).then(() => {
            renderChartNewsBox();
            showToast('Economic news calendar refreshed');
          });
        });

        overlay.querySelector('#vest-nb-reset-pos-btn')?.addEventListener('click', () => {
          draftSettings.newsBox.relX = 0.02;
          draftSettings.newsBox.relY = 0.08;
          draftSettings.newsBox.pinned = false;
          draftSettings.newsBox.pinnedLeft = null;
          draftSettings.newsBox.pinnedTop = null;
          draftSettings.newsBox.collapsed = false;
          broadcastLiveSessionDraft();
          showToast('News Box position reset to the top-left of the screen');
        });

        overlay.querySelector('#vest-nb-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.newsBox = JSON.parse(JSON.stringify(DEFAULT_NEWS_BOX));
          draftSettings.newsBox.enabled = true;
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Economic News Box to defaults');
        });

        overlay.querySelector('#vest-nb-cust-add-btn')?.addEventListener('click', () => {
          const tEl = overlay.querySelector('#vest-nb-cust-time');
          const cEl = overlay.querySelector('#vest-nb-cust-country');
          const fEl = overlay.querySelector('#vest-nb-cust-folder');
          const titleEl = overlay.querySelector('#vest-nb-cust-title');
          const title = (titleEl?.value || '').trim();
          if (!title) {
            showToast('Enter an event title first (e.g. CPI m/m)');
            return;
          }
          if (!Array.isArray(draftSettings.newsBox.customEvents)) {
            draftSettings.newsBox.customEvents = [];
          }
          draftSettings.newsBox.customEvents.push({
            id: `cust_${Date.now()}`,
            time: tEl?.value || '08:30',
            country: (cEl?.value || 'USD').toUpperCase(),
            folder: fEl?.value || 'red',
            title
          });
          renderDialog();
          broadcastLiveSessionDraft();
          showToast(`Added "${title}" to News Box`);
        });

        overlay.querySelectorAll('.vest-nb-cust-del').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            if (Array.isArray(draftSettings.newsBox.customEvents)) {
              draftSettings.newsBox.customEvents.splice(idx, 1);
              renderDialog();
              broadcastLiveSessionDraft();
            }
          });
        });

        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        if (rightPane) {
          rightPane.addEventListener('change', (e) => {
            syncCurrentPaneToDraft();
            if (e.target && e.target.classList.contains('vest-nb-country-chk')) {
              renderDialog();
            }
            broadcastLiveSessionDraft();
          });
          rightPane.addEventListener('input', (e) => {
            if (e.target && (e.target.type === 'color' || e.target.type === 'text')) {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            }
          });
        }
      }

      if (activeTab === 'trades' || activeTab === 'chartingindicators') {
        const widthRange = overlay.querySelector('#vest-tb-width');
        const widthVal = overlay.querySelector('#vest-tb-width-val');
        if (widthRange && widthVal) {
          widthRange.addEventListener('input', () => {
            widthVal.textContent = `${widthRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const sideFontSizeRange = overlay.querySelector('#vest-tb-side-font-size');
        const sideFontSizeVal = overlay.querySelector('#vest-tb-side-fontsize-val');
        if (sideFontSizeRange && sideFontSizeVal) {
          sideFontSizeRange.addEventListener('input', () => {
            sideFontSizeVal.textContent = `${sideFontSizeRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        ['#vest-tb-bg-opacity', '#vest-tb-win-opacity', '#vest-tb-loss-opacity', '#vest-tb-long-bg-opacity', '#vest-tb-short-bg-opacity'].forEach(sel => {
          const rng = overlay.querySelector(sel);
          if (rng) {
            rng.addEventListener('input', () => {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            });
          }
        });

        overlay.querySelector('#vest-tb-scan-now-btn')?.addEventListener('click', async () => {
          const addedCount = await ensurePositionsHistoryPrepopulatedOnce(true);
          draftSettings.tradesBox = normalizeTradesBoxConfig(settings.tradesBox);
          renderDialog();
          broadcastLiveSessionDraft();
          showToast(addedCount > 0 ? `Synced ${addedCount} trade(s) from Positions History` : 'Synced with Positions History (6pm–4:59pm ET session)');
        });

        overlay.querySelector('#vest-tb-reset-pos-btn')?.addEventListener('click', () => {
          draftSettings.tradesBox.relX = 0.02;
          draftSettings.tradesBox.relY = 0.42;
          draftSettings.tradesBox.pinned = false;
          draftSettings.tradesBox.pinnedLeft = null;
          draftSettings.tradesBox.pinnedTop = null;
          draftSettings.tradesBox.collapsed = false;
          broadcastLiveSessionDraft();
          showToast('Trades Box position reset to the top-left of the screen');
        });

        overlay.querySelector('#vest-tb-reset-defaults-btn')?.addEventListener('click', () => {
          const existingTrades = Array.isArray(draftSettings.tradesBox?.trades) ? draftSettings.tradesBox.trades : [];
          draftSettings.tradesBox = JSON.parse(JSON.stringify(DEFAULT_TRADES_BOX));
          draftSettings.tradesBox.enabled = true;
          draftSettings.tradesBox.trades = existingTrades;
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Instrument Trades Box styling to defaults');
        });

        overlay.querySelector('#vest-tb-clear-all-btn')?.addEventListener('click', () => {
          draftSettings.tradesBox.trades = [];
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Cleared recorded trade history');
        });

        overlay.querySelector('#vest-tb-add-btn')?.addEventListener('click', () => {
          const symEl = overlay.querySelector('#vest-tb-add-symbol');
          const sideEl = overlay.querySelector('#vest-tb-add-side');
          const entryEl = overlay.querySelector('#vest-tb-add-entry');
          const exitEl = overlay.querySelector('#vest-tb-add-exit');
          const pnlEl = overlay.querySelector('#vest-tb-add-pnl');

          const rawPnlStr = (pnlEl?.value || '').trim();
          if (rawPnlStr === '' || isNaN(Number(rawPnlStr))) {
            showToast('Enter a valid PnL amount (e.g. 245.50 or -110)');
            return;
          }

          const newTrade = normalizeTradeEntry({
            id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            symbol: (symEl?.value || currentInstrument || 'BTC-PERP').trim(),
            side: sideEl?.value || 'LONG',
            entryTime: entryEl?.value || '09:35',
            exitTime: exitEl?.value || '09:52',
            pnl: Number(rawPnlStr),
            source: 'manual'
          });

          if (newTrade) {
            if (!Array.isArray(draftSettings.tradesBox.trades)) {
              draftSettings.tradesBox.trades = [];
            }
            draftSettings.tradesBox.trades.unshift(newTrade);
            draftSettings.tradesBox = normalizeTradesBoxConfig(draftSettings.tradesBox);
            renderDialog();
            broadcastLiveSessionDraft();
            showToast(`Added ${newTrade.symbol} trade (${newTrade.pnl >= 0 ? '+' : '-'}$${Math.abs(newTrade.pnl).toFixed(2)})`);
          }
        });

        overlay.querySelectorAll('.vest-tb-del-trade').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (Array.isArray(draftSettings.tradesBox.trades)) {
              draftSettings.tradesBox.trades = draftSettings.tradesBox.trades.filter(t => t.id !== id);
              renderDialog();
              broadcastLiveSessionDraft();
            }
          });
        });

        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        if (rightPane) {
          rightPane.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
          rightPane.addEventListener('input', (e) => {
            if (e.target && (e.target.type === 'color' || e.target.type === 'text')) {
              syncCurrentPaneToDraft();
              if (e.target.id === 'vest-tb-win-color' || e.target.id === 'vest-tb-loss-color') {
                renderDialog();
              }
              broadcastLiveSessionDraft();
            }
          });
        }
      }

      if (activeTab === 'candleohlc' || activeTab === 'chartingindicators') {
        const fontSizeRange = overlay.querySelector('#vest-co-font-size');
        const fontSizeVal = overlay.querySelector('#vest-co-fontsize-val');
        if (fontSizeRange && fontSizeVal) {
          fontSizeRange.addEventListener('input', () => {
            fontSizeVal.textContent = `${fontSizeRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const numFontSizeRange = overlay.querySelector('#vest-co-num-font-size');
        const numFontSizeVal = overlay.querySelector('#vest-co-num-fontsize-val');
        if (numFontSizeRange && numFontSizeVal) {
          numFontSizeRange.addEventListener('input', () => {
            numFontSizeVal.textContent = `${numFontSizeRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }

        const candleWidthRange = overlay.querySelector('#vest-co-candle-width');
        const candleWidthVal = overlay.querySelector('#vest-co-width-val');
        const customWidthChk = overlay.querySelector('#vest-co-custom-width-enabled');
        const applyLiveCandleWidth = (newVal) => {
          const clamped = Math.max(40, Math.min(260, Math.round(Number(newVal) / 5) * 5));
          if (candleWidthRange) candleWidthRange.value = String(clamped);
          if (candleWidthVal) candleWidthVal.textContent = `${clamped}%`;
          if (customWidthChk && !customWidthChk.checked) {
            customWidthChk.checked = true;
          }
          syncCurrentPaneToDraft();
          broadcastLiveSessionDraft();
          postToMainWorlds({
            type: 'VEST_TV_SET_CANDLE_WIDTH',
            candleWidthPx: clamped
          });
        };

        if (candleWidthRange) {
          candleWidthRange.addEventListener('input', () => {
            applyLiveCandleWidth(Number(candleWidthRange.value) || 140);
          });
        }
        overlay.querySelector('#vest-co-width-dec-btn')?.addEventListener('click', () => {
          const cur = Number(candleWidthRange?.value) || 140;
          applyLiveCandleWidth(Math.max(40, cur - 10));
        });
        overlay.querySelector('#vest-co-width-inc-btn')?.addEventListener('click', () => {
          const cur = Number(candleWidthRange?.value) || 140;
          applyLiveCandleWidth(Math.min(260, cur + 10));
        });
        if (customWidthChk) {
          customWidthChk.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
            postToMainWorlds({
              type: 'VEST_TV_SET_CANDLE_WIDTH',
              candleWidthPx: Number(candleWidthRange?.value) || 140
            });
          });
        }

        ['#vest-co-show-numbers', '#vest-co-master-enabled', '#vest-co-click-toggle'].forEach(sel => {
          const chk = overlay.querySelector(sel);
          if (chk) {
            chk.addEventListener('change', () => {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
              renderStudioHeaderPill();
            });
          }
        });

        ['#vest-co-bg-opacity', '#vest-co-num-bg-opacity'].forEach(sel => {
          const rng = overlay.querySelector(sel);
          if (rng) {
            rng.addEventListener('input', () => {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            });
          }
        });

        overlay.querySelector('#vest-co-clear-clicked-btn')?.addEventListener('click', () => {
          postToMainWorlds({
            type: 'VEST_TV_CLEAR_CLICKED_CANDLE_OHLC'
          });
          showToast('Cleared all individually clicked candle OHLC labels');
        });

        overlay.querySelector('#vest-co-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.candleOhlc = JSON.parse(JSON.stringify(DEFAULT_CANDLE_OHLC));
          draftSettings.candleOhlc.enabled = true;
          targetIndicatorToScroll = 'candleohlc';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Candle settings to defaults');
        });

        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        if (rightPane) {
          rightPane.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
          rightPane.addEventListener('input', (e) => {
            if (e.target && (e.target.type === 'color' || e.target.type === 'text' || e.target.type === 'number')) {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            }
          });
        }
      }

      if (activeTab === 'positionhud' || activeTab === 'chartingindicators') {
        ['#vest-ph-master-enabled', '#vest-ph-price-line', '#vest-ph-flatten-btn', '#vest-ph-entry-badge', '#vest-ph-pnl-percent', '#vest-ph-auto-confirm'].forEach(sel => {
          const chk = overlay.querySelector(sel);
          if (chk) {
            chk.addEventListener('change', () => {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            });
          }
        });

        overlay.querySelector('#vest-ph-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.positionHud = JSON.parse(JSON.stringify(DEFAULT_POSITION_HUD));
          draftSettings.positionHud.enabled = true;
          targetIndicatorToScroll = 'positionhud';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Active Position HUD settings to defaults');
        });

        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        if (rightPane) {
          rightPane.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }
      }

      if (activeTab === 'faillines' || activeTab === 'chartingindicators') {
        
        overlay.querySelector('#vest-fail-lines-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.failLines = JSON.parse(JSON.stringify(DEFAULT_FAIL_LINES));
          draftSettings.failLines.enabled = true;
          targetIndicatorToScroll = 'faillines';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Fail Lines settings to defaults');
        });
        overlay.querySelector('#vest-fail-lines-enabled')?.addEventListener('change', () => {
          syncCurrentPaneToDraft();
          broadcastLiveSessionDraft();
        });
        ['#vest-fail-lines-label-size', '#vest-fail-lines-font-size'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('input', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
      }

      if (activeTab === 'cortexindicator' || activeTab === 'chartingindicators') {
        
        overlay.querySelector('#vest-ci-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.cortexIndicator = JSON.parse(JSON.stringify(DEFAULT_CORTEX_INDICATOR));
          draftSettings.cortexIndicator.enabled = true;
          targetIndicatorToScroll = 'cortexindicator';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Cortex Indicator settings to defaults');
        });
        ['#vest-ci-enabled', '#vest-ci-show-signals', '#vest-ci-show-targets', '#vest-ci-show-table', '#vest-ci-execution-enabled', '#vest-ci-live-armed'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
        ['#vest-ci-ema-length', '#vest-ci-atr-length', '#vest-ci-trend-multiplier'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('input', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
        overlay.querySelector('#vest-ci-distance-mode')?.addEventListener('change', () => {
          syncCurrentPaneToDraft();
          broadcastLiveSessionDraft();
        });
        overlay.querySelector('#vest-ci-execution-mode')?.addEventListener('change', () => {
          syncCurrentPaneToDraft();
          broadcastLiveSessionDraft();
        });
        ['#vest-ci-stop-points', '#vest-ci-target-spacing', '#vest-ci-level-font-size', '#vest-ci-level-box-scale', '#vest-ci-reversal-ignore-bars'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('input', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
      }

      if (activeTab === 'rangedetector' || activeTab === 'chartingindicators') {
        overlay.querySelector('#vest-rd-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.rangeDetector = JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR));
          draftSettings.rangeDetector.enabled = true;
          targetIndicatorToScroll = 'rangedetector';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Range Detector settings to defaults');
        });

        overlay.querySelector('#vest-rd-reset-pos-btn')?.addEventListener('click', () => {
          if (!draftSettings.rangeDetector) draftSettings.rangeDetector = JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR));
          draftSettings.rangeDetector.relX = 0.04;
          draftSettings.rangeDetector.relY = 0.18;
          draftSettings.rangeDetector.pinned = false;
          draftSettings.rangeDetector.pinnedLeft = null;
          draftSettings.rangeDetector.pinnedTop = null;
          if (chartRangeBoxEl) {
            chartRangeBoxEl.style.left = '40px';
            chartRangeBoxEl.style.top = '120px';
          }
          broadcastLiveSessionDraft();
          showToast('Reset Range Detector box position');
        });

        ['#vest-rd-master-enabled', '#vest-rd-mode', '#vest-rd-voice-alert', '#vest-rd-chime-alert', '#vest-rd-glow-effect'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });

        ['#vest-rd-lookback', '#vest-rd-chop-thresh', '#vest-rd-adx-thresh', '#vest-rd-opacity', '#vest-rd-width'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('input', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
      }

      if (activeTab === 'accountsrisk' || activeTab === 'chartingindicators') {
        overlay.querySelector('#vest-arb-reset-pos-btn')?.addEventListener('click', () => {
          const arb = normalizeAccountsRiskBoxConfig(draftSettings.accountsRiskBox);
          arb.offsetX = DEFAULT_ACCOUNTS_RISK_BOX.offsetX;
          arb.offsetY = DEFAULT_ACCOUNTS_RISK_BOX.offsetY;
          draftSettings.accountsRiskBox = arb;
          const ox = overlay.querySelector('#vest-arb-offset-x');
          const oy = overlay.querySelector('#vest-arb-offset-y');
          if (ox) ox.value = String(arb.offsetX);
          if (oy) oy.value = String(arb.offsetY);
          broadcastLiveSessionDraft();
          showToast('Accounts & Risk drawing reset to top-left of chart');
        });

        overlay.querySelector('#vest-arb-scan-accounts-btn')?.addEventListener('click', () => {
          postToMainWorlds({ type: 'VEST_SCAN_ACCOUNTS_NOW' });
          if (typeof scrapeAndSyncCurrentAccountSnapshot === 'function') {
            scrapeAndSyncCurrentAccountSnapshot(true);
          }
          setTimeout(() => {
            targetIndicatorToScroll = 'accountsrisk';
            renderDialog();
          }, 350);
          showToast('Scanning firm accounts...');
        });

        overlay.querySelectorAll('.vest-arb-preset-pct').forEach(btn => {
          btn.addEventListener('click', () => {
            const pct = Number(btn.getAttribute('data-pct')) || 1.0;
            const input = overlay.querySelector('#vest-arb-risk-pct');
            if (input) input.value = String(pct);
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });

        overlay.querySelector('#vest-arb-clear-accounts-btn')?.addEventListener('click', () => {
          if (typeof clearCachedAccountSnapshots === 'function') {
            clearCachedAccountSnapshots();
          }
          targetIndicatorToScroll = 'accountsrisk';
          renderDialog();
          showToast('Cleared cached accounts — active firm accounts will re-sync');
        });

        overlay.querySelectorAll('.vest-arb-remove-acc-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const accKey = btn.getAttribute('data-acc-key');
            if (accKey && typeof removeAccountSnapshotByKey === 'function') {
              removeAccountSnapshotByKey(accKey);
            }
            targetIndicatorToScroll = 'accountsrisk';
            renderDialog();
          });
        });

        ['#vest-arb-master-enabled', '#vest-arb-show-other-pnl', '#vest-arb-border-color'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });

        ['#vest-arb-risk-pct', '#vest-arb-width', '#vest-arb-font-size', '#vest-arb-bg-opacity', '#vest-arb-offset-x', '#vest-arb-offset-y'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('input', () => {
            const wEl = overlay.querySelector('#vest-arb-width');
            const wVal = overlay.querySelector('#vest-arb-width-val');
            if (wEl && wVal) wVal.textContent = `${wEl.value}px`;
            const fsEl = overlay.querySelector('#vest-arb-font-size');
            const fsVal = overlay.querySelector('#vest-arb-fontsize-val');
            if (fsEl && fsVal) fsVal.textContent = `${fsEl.value}px`;
            const opEl = overlay.querySelector('#vest-arb-bg-opacity');
            const opVal = overlay.querySelector('#vest-arb-opacity-val');
            if (opEl && opVal) opVal.textContent = `${opEl.value}%`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
      }

      if (activeTab === 'marketstructure' || activeTab === 'chartingindicators') {
        overlay.querySelector('#vest-ms-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.marketStructure = JSON.parse(JSON.stringify(DEFAULT_MARKET_STRUCTURE));
          draftSettings.marketStructure.enabled = true;
          targetIndicatorToScroll = 'marketstructure';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Market Structure settings to defaults');
        });

        ['#vest-ms-master-enabled', '#vest-ms-show-bos', '#vest-ms-show-choch', '#vest-ms-extend-lines', '#vest-ms-break-mode', '#vest-ms-label-mode', '#vest-ms-line-style', '#vest-ms-bull-color', '#vest-ms-bear-color'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });

        ['#vest-ms-swing-lookback', '#vest-ms-max-lines'].forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('input', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
      }

      if (activeTab === 'orderblocks' || activeTab === 'chartingindicators') {
        overlay.querySelector('#vest-ob-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.orderBlocks = JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS));
          draftSettings.orderBlocks.enabled = true;
          targetIndicatorToScroll = 'orderblocks';
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Order Blocks settings to defaults');
        });

        overlay.querySelector('#vest-ob-restore-dismissed-btn')?.addEventListener('click', () => {
          const ob = normalizeOrderBlocksConfig(draftSettings.orderBlocks);
          ob.dismissedOrderBlocks = [];
          draftSettings.orderBlocks = ob;
          settings.orderBlocks = JSON.parse(JSON.stringify(ob));
          safeStorageSet({ templates, settings });
          notifyMainWorldConfig();
          targetIndicatorToScroll = 'orderblocks';
          renderDialog();
          showToast('Restored all removed Order Blocks');
        });

        overlay.querySelector('#vest-ob-reset-stats-pos-btn')?.addEventListener('click', () => {
          if (!draftSettings.orderBlocks) draftSettings.orderBlocks = JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS));
          draftSettings.orderBlocks.statsBoxRelX = 0.04;
          draftSettings.orderBlocks.statsBoxRelY = 0.54;
          draftSettings.orderBlocks.statsBoxPinned = false;
          draftSettings.orderBlocks.statsBoxPinnedLeft = null;
          draftSettings.orderBlocks.statsBoxPinnedTop = null;
          settings.orderBlocks = JSON.parse(JSON.stringify(draftSettings.orderBlocks));
          saveSettingsDebounced();
          renderChartOrderBlockStatsBox();
          showToast('Order Block Stats Box position reset');
        });

        overlay.querySelector('#vest-ob-test-voice-btn')?.addEventListener('click', () => {
          markUserInteractionForAudio();
          if (sharedCortexAudioContext && sharedCortexAudioContext.state === 'suspended') {
            sharedCortexAudioContext.resume().then(() => playOrderBlockChime('long')).catch(() => {});
          } else {
            playOrderBlockChime('long');
          }
          const ob = normalizeOrderBlocksConfig(draftSettings.orderBlocks);
          const voiceUri = overlay.querySelector('#vest-ob-voice-uri')?.value || ob.voiceURI;
          speakCortexVoicePhrase('Bullish Order Block Mitigated. Enter Long.', voiceUri);
        });

        const obChangeSelectors = [
          '#vest-ob-master-enabled', '#vest-ob-show-entry-icon', '#vest-ob-show-target-lines', '#vest-ob-show-stats-box',
          '#vest-ob-voice-alert', '#vest-ob-chime-alert', '#vest-ob-extend-mode', '#vest-ob-voice-uri',
          '#vest-ob-bull-color', '#vest-ob-bear-color'
        ];
        const obInputSelectors = [
          '#vest-ob-swing-lookback', '#vest-ob-max-blocks', '#vest-ob-min-fvg-ticks',
          '#vest-ob-bull-opacity', '#vest-ob-bear-opacity', '#vest-ob-label-font-size',
          '#vest-ob-mtf-label-font-size', '#vest-ob-mtf-max-blocks',
          '#vest-ob-icon-size', '#vest-ob-rr-ratio', '#vest-ob-stats-rr-ratio',
          '#vest-ob-bull-color', '#vest-ob-bear-color'
        ];
        ['5m', '15m', '1h', '4h'].forEach(tf => {
          obChangeSelectors.push(`#vest-ob-mtf-${tf}-enabled`, `#vest-ob-mtf-${tf}-bull`, `#vest-ob-mtf-${tf}-bear`);
          obInputSelectors.push(`#vest-ob-mtf-${tf}-bull`, `#vest-ob-mtf-${tf}-bear`, `#vest-ob-mtf-${tf}-opacity`);
        });
        obChangeSelectors.forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });

        obInputSelectors.forEach(sel => {
          overlay.querySelector(sel)?.addEventListener('input', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        });
      }

      if (activeTab === 'alertsvoice') {
        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        rightPane?.addEventListener('change', () => {
          syncCurrentPaneToDraft();
          broadcastLiveSessionDraft();
        });
        overlay.querySelector('#vest-ci-test-alert-voice')?.addEventListener('click', () => {
          syncCurrentPaneToDraft();
          const status = overlay.querySelector('#vest-ci-alert-voice-status');
          const voiceURI = overlay.querySelector('#vest-ci-alert-voice')?.value || '';
          const played = speakCortexVoicePhrase('Cortex voice test', voiceURI);
          if (status) status.textContent = played
            ? 'Voice test sent to your selected browser voice.'
            : voiceURI === CORTEX_IRISH_VOICE_PRESET
              ? 'This browser has not supplied an en-IE voice.'
              : 'Speech voices are not available in this browser.';
        });
      }

            function bindPerpFirmsListeners() {
        overlay.querySelectorAll('.vest-pf-tile[data-firm-id]').forEach(tile => {
          tile.addEventListener('click', () => {
            syncCurrentFirmToDraft();
            selectedFirmId = tile.dataset.firmId;
            const rightPane = overlay.querySelector('#vest-tvs-right-pane');
            if (rightPane) {
              rightPane.innerHTML = renderPerpFirmsHtml();
              bindPerpFirmsListeners();
            }
          });
        });

        const detailCard = overlay.querySelector('#vest-pf-detail-card');
        if (detailCard) {
          const offsetRange = detailCard.querySelector('#vest-pf-input-offset');
          const offsetVal = detailCard.querySelector('#vest-pf-val-offset');
          if (offsetRange && offsetVal) {
            offsetRange.addEventListener('input', () => {
              offsetVal.textContent = `${offsetRange.value}px`;
              syncCurrentFirmToDraft();
            });
          }

          const marginRange = detailCard.querySelector('#vest-pf-input-margin');
          const marginVal = detailCard.querySelector('#vest-pf-val-margin');
          if (marginRange && marginVal) {
            marginRange.addEventListener('input', () => {
              marginVal.textContent = `${marginRange.value}px`;
              syncCurrentFirmToDraft();
            });
          }

          const headerRange = detailCard.querySelector('#vest-pf-input-header');
          const headerVal = detailCard.querySelector('#vest-pf-val-header');
          if (headerRange && headerVal) {
            headerRange.addEventListener('input', () => {
              headerVal.textContent = `${headerRange.value}px`;
              syncCurrentFirmToDraft();
            });
          }

          const topBarModeSelect = detailCard.querySelector('#vest-pf-input-topbarmode');
          if (topBarModeSelect && offsetRange) {
            topBarModeSelect.addEventListener('change', () => {
              const isCustom = topBarModeSelect.value === 'custom';
              offsetRange.disabled = !isCustom;
              offsetRange.style.opacity = isCustom ? '1' : '0.45';
              syncCurrentFirmToDraft();
            });
          }

          detailCard.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('change', () => {
              syncCurrentFirmToDraft();
            });
            el.addEventListener('input', () => {
              syncCurrentFirmToDraft();
            });
          });
        }
      }

      if (activeTab === 'perpfirms') {
        bindPerpFirmsListeners();
      }
if (activeTab === 'diagnostics') {
        const wRange = overlay.querySelector('#vest-dbg-box-width');
        const wVal = overlay.querySelector('#vest-dbg-box-width-val');
        if (wRange && wVal) {
          wRange.addEventListener('input', () => {
            wVal.textContent = `${wRange.value}px`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }
        const bgOpRange = overlay.querySelector('#vest-dbg-bg-op');
        const bgOpVal = overlay.querySelector('#vest-dbg-bg-op-val');
        if (bgOpRange && bgOpVal) {
          bgOpRange.addEventListener('input', () => {
            bgOpVal.textContent = `${bgOpRange.value}%`;
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
        }
        overlay.querySelector('#vest-dbg-master-toggle')?.addEventListener('change', (e) => {
          draftSettings.debugMode = Boolean(e.target.checked);
          setCortexDebugMode(draftSettings.debugMode, 'Settings Modal');
          broadcastLiveSessionDraft();
        });
        overlay.querySelector('#vest-dbg-box-enabled')?.addEventListener('change', () => {
          syncCurrentPaneToDraft();
          broadcastLiveSessionDraft();
        });
        overlay.querySelector('#vest-dbg-reset-pos-btn')?.addEventListener('click', () => {
          draftSettings.diagnosticsBox.relX = 0.72;
          draftSettings.diagnosticsBox.relY = 0.12;
          draftSettings.diagnosticsBox.pinned = false;
          draftSettings.diagnosticsBox.pinnedLeft = null;
          draftSettings.diagnosticsBox.pinnedTop = null;
          draftSettings.diagnosticsBox.collapsed = false;
          broadcastLiveSessionDraft();
          showToast('Diagnostics window position reset to top right');
        });
        overlay.querySelector('#vest-dbg-reset-defaults-btn')?.addEventListener('click', () => {
          draftSettings.diagnosticsBox = JSON.parse(JSON.stringify(DEFAULT_DIAGNOSTICS_BOX));
          draftSettings.diagnosticsBox.enabled = true;
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Diagnostics Window styling to defaults');
        });
        overlay.querySelector('#vest-dbg-test-echo-btn')?.addEventListener('click', () => {
          cortexDebugLog('Manual Test Echo triggered from settings dialog', {
            timestamp: new Date().toISOString(),
            debugMode: settings.debugMode
          });
          showToast(settings.debugMode ? 'Echoed test to console [CORTEX DEBUG MODE]' : 'Turn Debug Mode ON to see console echo');
        });
        overlay.querySelector('#vest-dbg-copy-state-btn')?.addEventListener('click', () => {
          copyDiagnosticsStateToClipboard();
        });
        overlay.querySelector('#vest-dbg-clear-console-btn')?.addEventListener('click', () => {
          console.clear();
          showToast('Browser console cleared');
        });

        const rightPane = overlay.querySelector('#vest-tvs-right-pane');
        if (rightPane) {
          rightPane.addEventListener('change', () => {
            syncCurrentPaneToDraft();
            broadcastLiveSessionDraft();
          });
          rightPane.addEventListener('input', (e) => {
            if (e.target && (e.target.type === 'color' || e.target.type === 'text')) {
              syncCurrentPaneToDraft();
              broadcastLiveSessionDraft();
            }
          });
        }
      }

      // Close / Cancel / Save Settings
      overlay.querySelector('#vest-tvs-close')?.addEventListener('click', closeSettingsOverlay);
      overlay.querySelector('#vest-tvs-cancel')?.addEventListener('click', closeSettingsOverlay);
      overlay.querySelector('#vest-tvs-ok')?.addEventListener('click', commitDraftAndClose);

      // About tab Discord button
      overlay.querySelector('#vest-tvs-discord-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://discord.gg/ztXmwMBQ2Y', '_blank', 'noopener,noreferrer');
      });

      // About tab OTA button
      overlay.querySelector('#vest-tvs-open-ota-btn')?.addEventListener('click', () => {
        closeSettingsOverlay();
        if (isExtensionValid() && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'openUpdaterPage' });
        }
      });

      overlay.querySelector('#vest-tvs-update-channel-select')?.addEventListener('change', async (e) => {
        const val = e.target.value === 'dev' ? 'dev' : 'stable';
        latestUpdateChannel = val;
        draftSettings.updateChannel = val;
        settings.updateChannel = val;
        await safeStorageSet({ updateChannel: val, settings });
        triggerQuickUpdateCheck();
        showToast(
          `Update channel set to ${val === 'dev' ? 'Dev Branch (Bleeding Edge)' : 'Stable Releases'}`,
          2500,
          val === 'dev'
        );
      });
    }

    renderDialog();
    overlay.addEventListener('click', (e) => {
      if (justFinishedDragging) return;
      if (e.target === overlay) closeSettingsOverlay();
    });
    document.body.appendChild(overlay);
  }

  // -------------------------------------------------------------
  // Moveable Economic News Box on Chart (Pinned to Chart Viewport)
  // -------------------------------------------------------------
  let chartNewsBoxEl = null;
  let liveEconomicNewsEvents = [];
  let isFetchingEconomicNews = false;
  let newsBoxTickerInterval = null;
  let activeNewsBoxDrag = null;

  function getCountryFlagEmoji(countryCode) {
    const code = String(countryCode || '').toUpperCase().trim();
    const FLAGS = {
      USD: '🇺🇸',
      EUR: '🇪🇺',
      GBP: '🇬🇧',
      JPY: '🇯🇵',
      CAD: '🇨🇦',
      AUD: '🇦🇺',
      CHF: '🇨🇭',
      NZD: '🇳🇿',
      CNY: '🇨🇳',
      ALL: '🌐'
    };
    return FLAGS[code] || '🌐';
  }

  function mapImpactToFolderKey(rawImpact) {
    const imp = String(rawImpact || '').toLowerCase().trim();
    if (imp.includes('high') || imp === 'red' || imp === '3') return 'red';
    if (imp.includes('med') || imp === 'yellow' || imp === 'orange' || imp === '2') return 'yellow';
    if (imp.includes('low') || imp === 'green' || imp === '1') return 'green';
    return 'green';
  }

  /**
   * Generates fallback upcoming recurring macro news releases if the external calendar feed is unreachable
   */
  function buildFallbackMacroSchedule() {
    const now = new Date();
    const baseMs = now.getTime();
    const todayStr = now.toISOString().slice(0, 10);
    const makeTodayIso = (hh, mm, dayOffset = 0) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hh, mm, 0);
      return d.toISOString();
    };
    return [
      { title: 'Core Retail Sales / Macro Data', country: 'USD', date: makeTodayIso(8, 30, 0), impact: 'High' },
      { title: 'Unemployment Claims / Philly Fed', country: 'USD', date: makeTodayIso(8, 30, 0), impact: 'High' },
      { title: 'Prelim Consumer Sentiment / PMI', country: 'USD', date: makeTodayIso(10, 0, 0), impact: 'Medium' },
      { title: 'ECB Monetary Policy / Eurozone CPI', country: 'EUR', date: makeTodayIso(8, 15, 0), impact: 'High' },
      { title: 'FOMC Member Speaks / Treasury Auction', country: 'USD', date: makeTodayIso(13, 0, 0), impact: 'Medium' },
      { title: 'Tokyo Core CPI y/y / BOJ Outlook', country: 'JPY', date: makeTodayIso(19, 30, 0), impact: 'Medium' },
      { title: 'UK Retail Sales / BOE Gov Speaks', country: 'GBP', date: makeTodayIso(7, 0, 1), impact: 'High' },
      { title: 'US Core PCE / Non-Farm Payrolls', country: 'USD', date: makeTodayIso(8, 30, 1), impact: 'High' },
      { title: 'ISM Manufacturing / Services PMI', country: 'USD', date: makeTodayIso(10, 0, 1), impact: 'High' },
      { title: 'CAD Employment Change / BOC', country: 'CAD', date: makeTodayIso(8, 30, 1), impact: 'Medium' }
    ];
  }

  async function fetchLiveEconomicNewsEvents(forceRefresh = false) {
    if (isFetchingEconomicNews && !forceRefresh) return liveEconomicNewsEvents;
    isFetchingEconomicNews = true;

    try {
      let events = [];

      // 1. Request via background service worker (bypasses page CORS)
      if (isExtensionValid() && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        try {
          const resp = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'fetchEconomicCalendar', forceRefresh }, (res) => {
              if (chrome.runtime.lastError) resolve(null);
              else resolve(res);
            });
          });
          if (resp && resp.feed && Array.isArray(resp.feed.events) && resp.feed.events.length > 0) {
            events = resp.feed.events;
          }
        } catch (e) {}
      }

      // 2. Fallback to cached econCalendarCache in chrome.storage.local
      if (events.length === 0 && isExtensionValid()) {
        try {
          const data = await chrome.storage.local.get(['econCalendarCache']);
          if (data && data.econCalendarCache && Array.isArray(data.econCalendarCache.events)) {
            events = data.econCalendarCache.events;
          }
        } catch (e) {}
      }

      // 3. Fallback schedule if offline
      if (!Array.isArray(events) || events.length === 0) {
        events = buildFallbackMacroSchedule();
      }

      liveEconomicNewsEvents = events;
    } catch (e) {
      if (liveEconomicNewsEvents.length === 0) {
        liveEconomicNewsEvents = buildFallbackMacroSchedule();
      }
    } finally {
      isFetchingEconomicNews = false;
    }

    return liveEconomicNewsEvents;
  }

  /** Available full-screen area, reserving space for the top header & Cortex bar. */
  function getScreenBoundsRect() {
    const left = 0;
    const headerBottom = typeof getMainHeaderBottom === 'function' ? getMainHeaderBottom() : 48;
    const barEl = document.getElementById(CORTEX_TOP_BAR_ID);
    const barH = barEl ? barEl.offsetHeight : CORTEX_BAR_HEIGHT;
    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const barMargin = (activeFirm && typeof activeFirm.barMarginBottom === 'number') ? activeFirm.barMarginBottom : CORTEX_BAR_MARGIN_BOTTOM;
    const top = Math.round(headerBottom + barH + barMargin);
    const right = Math.max(1, window.innerWidth);
    const bottom = Math.max(top + 50, window.innerHeight);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  let minimizedWindowOrder = [];

  function getTaskbarStartLeft() {
    const bar = document.getElementById(CORTEX_TOP_BAR_ID);
    const barRect = bar ? bar.getBoundingClientRect() : { left: 0, top: 48, right: window.innerWidth };
    let startX = barRect.left + 16;

    const studioPill = document.getElementById('vest-studio-header-pill') || document.getElementById('vest-studio-pill-btn');
    if (studioPill && studioPill.isConnected) {
      const r = studioPill.getBoundingClientRect();
      if (r.right > startX) startX = r.right;
    }

    return Math.round(startX + 8);
  }

  function getActiveMinimizedWindowOrder() {
    const current = Array.isArray(settings.minimizedWindowOrder)
      ? [...settings.minimizedWindowOrder]
      : (Array.isArray(minimizedWindowOrder) ? [...minimizedWindowOrder] : []);

    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const isPositionsManaged = !activeFirm || activeFirm.managePositionsPanel !== false;
    const st = typeof getActiveFirmBottomPanelState === 'function' ? getActiveFirmBottomPanelState() : (settings.bottomPanelState || {});

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
    if (settings.rangeDetector && settings.rangeDetector.enabled && settings.rangeDetector.collapsed) {
      activeCollapsed.push('range_detector');
    }
    if (settings.orderBlocks && settings.orderBlocks.enabled && settings.orderBlocks.showStatsBox !== false && settings.orderBlocks.statsBoxCollapsed) {
      activeCollapsed.push('order_blocks_stats');
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
    queueSettingsSave({ minimizedWindowOrder: order });
    repositionAllMinimizedBoxes();
  }

  function markWindowAsRestored(boxType) {
    minimizedWindowOrder = (minimizedWindowOrder || []).filter(id => id !== boxType);
    settings.minimizedWindowOrder = minimizedWindowOrder;
    queueSettingsSave({ minimizedWindowOrder: minimizedWindowOrder });
    repositionAllMinimizedBoxes();
  }

  /**
   * Places minimized News, Trades, and Diagnostics pills inside the Cortex top bar,
   * dynamically allocating each minimized window to the next available taskbar slot.
   */
  function getMinimizedCortexBarCoords(boxType, boxEl) {
    const order = getActiveMinimizedWindowOrder();
    let currentLeft = getTaskbarStartLeft();

    const headerBottom = typeof getMainHeaderBottom === 'function' ? getMainHeaderBottom() : 48;
    const bar = document.getElementById(CORTEX_TOP_BAR_ID);
    const barRect = bar ? bar.getBoundingClientRect() : { top: headerBottom, height: CORTEX_BAR_HEIGHT };
    const barH = barRect.height || CORTEX_BAR_HEIGHT;

    for (const type of order) {
      let el = null;
      let defaultW = 215;
      if (type === 'news') {
        el = chartNewsBoxEl;
        defaultW = 215;
      } else if (type === 'trades') {
        el = chartTradesBoxEl;
        defaultW = 240;
      } else if (type === 'diagnostics') {
        el = chartDiagnosticsBoxEl;
        defaultW = 245;
      } else if (type === 'range_detector') {
        el = chartRangeBoxEl;
        defaultW = 220;
      } else if (type === 'order_blocks_stats') {
        el = chartOrderBlockStatsBoxEl;
        defaultW = 230;
      }

      const boxW = (el && el.offsetWidth) || (type === boxType && boxEl && boxEl.offsetWidth) || defaultW;
      const boxH = (el && el.offsetHeight) || (type === boxType && boxEl && boxEl.offsetHeight) || 30;

      if (type === boxType) {
        const targetTop = Math.round(barRect.top + (barH - boxH) / 2);
        const maxLeft = Math.max(8, window.innerWidth - boxW - 8);
        return {
          left: Math.round(Math.min(currentLeft, maxLeft)),
          top: targetTop
        };
      }

      currentLeft += boxW + 8;
    }

    const defaultBoxWidth = boxType === 'trades' ? 240 : (boxType === 'diagnostics' ? 245 : 215);
    const boxW = (boxEl && boxEl.offsetWidth) || defaultBoxWidth;
    const boxH = (boxEl && boxEl.offsetHeight) || 30;
    const targetTop = Math.round(barRect.top + (barH - boxH) / 2);
    const maxLeft = Math.max(8, window.innerWidth - boxW - 8);
    return {
      left: Math.round(Math.min(currentLeft, maxLeft)),
      top: targetTop
    };
  }

  function repositionAllMinimizedBoxes() {
    const order = getActiveMinimizedWindowOrder();
    let currentLeft = getTaskbarStartLeft();

    const headerBottom = typeof getMainHeaderBottom === 'function' ? getMainHeaderBottom() : 48;
    const bar = document.getElementById(CORTEX_TOP_BAR_ID);
    const barRect = bar ? bar.getBoundingClientRect() : { top: headerBottom, height: CORTEX_BAR_HEIGHT };
    const barH = barRect.height || CORTEX_BAR_HEIGHT;

    for (const boxType of order) {
      let el = null;
      let defaultW = 215;
      if (boxType === 'news') {
        el = chartNewsBoxEl;
        defaultW = 215;
      } else if (boxType === 'trades') {
        el = chartTradesBoxEl;
        defaultW = 240;
      } else if (boxType === 'diagnostics') {
        el = chartDiagnosticsBoxEl;
        defaultW = 245;
      } else if (boxType === 'range_detector') {
        el = chartRangeBoxEl;
        defaultW = 220;
      } else if (boxType === 'order_blocks_stats') {
        el = chartOrderBlockStatsBoxEl;
        defaultW = 230;
      } else if (boxType === 'positions') {
        el = bottomPanelTopBarPillEl || document.getElementById('vest-bottom-panel-topbar-pill');
        defaultW = 195;
      }

      if (!el || !el.isConnected || el.style.display === 'none') continue;

      const boxW = el.offsetWidth || defaultW;
      const boxH = el.offsetHeight || 30;
      const targetTop = Math.round(barRect.top + (barH - boxH) / 2);
      const maxLeft = Math.max(8, window.innerWidth - boxW - 8);

      el.style.left = `${Math.round(Math.min(currentLeft, maxLeft))}px`;
      el.style.top = `${targetTop}px`;

      currentLeft += boxW + 8;
    }
  }

  /**
   * Performs a smooth FLIP (First, Last, Invert, Play) window minimize/restore animation
   * between the box's last saved position and its place in the Cortex top bar.
   */
  function animateChartBoxMinimizeOrRestore(boxEl, prevRect, isMinimizing) {
    if (!boxEl || !prevRect || typeof boxEl.animate !== 'function') return;
    try {
      const nextRect = boxEl.getBoundingClientRect();
      if (!nextRect.width || !nextRect.height) return;

      const dx = prevRect.left - nextRect.left;
      const dy = prevRect.top - nextRect.top;
      const sx = Math.max(0.25, Math.min(3.5, prevRect.width / nextRect.width));
      const sy = Math.max(0.15, Math.min(4.5, prevRect.height / nextRect.height));

      if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(sx - 1) < 0.05 && Math.abs(sy - 1) < 0.05) {
        return;
      }

      boxEl.style.transformOrigin = 'top left';
      const anim = boxEl.animate(
        [
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
            opacity: isMinimizing ? 0.92 : 0.78
          },
          {
            transform: 'translate3d(0, 0, 0) scale(1, 1)',
            opacity: 1
          }
        ],
        {
          duration: 280,
          easing: isMinimizing ? 'cubic-bezier(0.32, 0.72, 0, 1)' : 'cubic-bezier(0.22, 1, 0.36, 1)'
        }
      );
      anim.onfinish = () => {
        if (boxEl) boxEl.style.transformOrigin = '';
      };
    } catch (e) {}
  }

  /**
   * Positions and clamps the News Box across the available screen area, or docks it into the Cortex bar when minimized.
   */
  function clampAndPositionChartNewsBox() {
    if (!chartNewsBoxEl || chartNewsBoxEl.style.display === 'none' || activeNewsBoxDrag) return;
    const nc = normalizeNewsBoxConfig(settings.newsBox);
    const vp = getScreenBoundsRect();

    if (nc.collapsed) {
      const minPos = getMinimizedCortexBarCoords('news', chartNewsBoxEl);
      chartNewsBoxEl.style.left = `${minPos.left}px`;
      chartNewsBoxEl.style.top = `${minPos.top}px`;
      return;
    }

    const boxW = chartNewsBoxEl.offsetWidth || nc.boxWidth || 325;
    const boxH = chartNewsBoxEl.offsetHeight || 160;

    let targetLeft;
    let targetTop;
    if (nc.pinned && nc.pinnedLeft !== null && nc.pinnedTop !== null) {
      targetLeft = nc.pinnedLeft;
      targetTop = nc.pinnedTop;
    } else {
      const maxOffsetX = Math.max(0, vp.width - boxW);
      const maxOffsetY = Math.max(0, vp.height - boxH);
      targetLeft = Math.round(vp.left + nc.relX * maxOffsetX);
      targetTop = Math.round(vp.top + nc.relY * maxOffsetY);
    }

    const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, targetLeft));
    const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, targetTop));

    chartNewsBoxEl.style.left = `${clampedLeft}px`;
    chartNewsBoxEl.style.top = `${clampedTop}px`;
  }

  function formatNewsEventTime(dateObj, nc) {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '--:--';
    const is24h = nc.timeFormat === '24h';
    const opts = {
      hour: is24h ? '2-digit' : 'numeric',
      minute: '2-digit',
      hour12: !is24h
    };
    if (nc.timeZoneMode === 'ny') {
      opts.timeZone = 'America/New_York';
    } else if (nc.timeZoneMode === 'utc') {
      opts.timeZone = 'UTC';
    }

    try {
      const now = new Date();
      const sameDayOpts = { year: 'numeric', month: '2-digit', day: '2-digit' };
      if (opts.timeZone) sameDayOpts.timeZone = opts.timeZone;
      const evDayStr = new Intl.DateTimeFormat('en-US', sameDayOpts).format(dateObj);
      const nowDayStr = new Intl.DateTimeFormat('en-US', sameDayOpts).format(now);

      let timeStr = new Intl.DateTimeFormat('en-US', opts).format(dateObj);
      if (!is24h) {
        timeStr = timeStr.replace(/\s+/g, '').toLowerCase();
      }
      if (evDayStr !== nowDayStr) {
        const wkOpts = { weekday: 'short' };
        if (opts.timeZone) wkOpts.timeZone = opts.timeZone;
        const wk = new Intl.DateTimeFormat('en-US', wkOpts).format(dateObj);
        return `${wk} ${timeStr}`;
      }
      return timeStr;
    } catch (e) {
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  function formatNewsCountdown(diffMs) {
    if (diffMs < 0) {
      const minsAgo = Math.round(Math.abs(diffMs) / 60000);
      return minsAgo <= 1 ? 'NOW' : `${minsAgo}m ago`;
    }
    const totalMins = Math.max(1, Math.floor(diffMs / 60000));
    if (totalMins < 60) {
      return `in ${totalMins}m`;
    }
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs < 24) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
  }

  function renderFolderIconSvg(folderKey, nc) {
    const colorHex = folderKey === 'red'
      ? (nc.redFolderColor || '#f23645')
      : folderKey === 'yellow'
        ? (nc.yellowFolderColor || '#ff9800')
        : (nc.greenFolderColor || '#26a69a');
    const label = folderKey === 'red' ? 'High Impact (Red Folder)' : folderKey === 'yellow' ? 'Medium Impact (Yellow Folder)' : 'Low Impact (Green Folder)';
    return `
      <span class="vest-cnb-folder" title="${label}">
        <svg viewBox="0 0 24 24">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="${colorHex}" stroke="rgba(255,255,255,0.32)" stroke-width="1.3"></path>
          <line x1="2" y1="9" x2="22" y2="9" stroke="rgba(0,0,0,0.28)" stroke-width="1"></line>
        </svg>
      </span>
    `;
  }

  function getFilteredUpcomingNewsList(nc) {
    const nowMs = Date.now();
    const pastCutoffMs = nowMs - (Number(nc.showPastTodayMinutes ?? 15) * 60 * 1000);
    const allowedCountries = new Set((nc.countries || NEWS_ALL_COUNTRIES).map(c => String(c).toUpperCase()));

    const combined = [];

    // 1. Live feed events
    for (let i = 0; i < liveEconomicNewsEvents.length; i++) {
      const raw = liveEconomicNewsEvents[i];
      if (!raw || !raw.title) continue;
      const country = String(raw.country || 'USD').toUpperCase().trim();
      const folder = mapImpactToFolderKey(raw.impact);
      const dt = new Date(raw.date);
      if (isNaN(dt.getTime())) continue;
      combined.push({
        title: String(raw.title).trim(),
        country,
        folder,
        dateObj: dt,
        epochMs: dt.getTime()
      });
    }

    // 2. User custom scheduled events (for today)
    if (Array.isArray(nc.customEvents)) {
      const now = new Date();
      for (const ce of nc.customEvents) {
        if (!ce || !ce.title) continue;
        const [hh, mm] = String(ce.time || '08:30').split(':').map(n => parseInt(n, 10) || 0);
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
        if (dt.getTime() < pastCutoffMs) {
          dt.setDate(dt.getDate() + 1);
        }
        combined.push({
          title: String(ce.title).trim(),
          country: String(ce.country || 'USD').toUpperCase(),
          folder: ['red', 'yellow', 'green'].includes(ce.folder) ? ce.folder : 'red',
          dateObj: dt,
          epochMs: dt.getTime()
        });
      }
    }

    const filtered = combined.filter(ev => {
      if (ev.epochMs < pastCutoffMs) return false;
      if (!allowedCountries.has(ev.country) && ev.country !== 'ALL') return false;
      if (ev.folder === 'red' && nc.showRedFolder === false) return false;
      if (ev.folder === 'yellow' && nc.showYellowFolder === false) return false;
      if (ev.folder === 'green' && nc.showGreenFolder === false) return false;
      return true;
    });

    filtered.sort((a, b) => a.epochMs - b.epochMs);
    return filtered.slice(0, Math.max(1, Number(nc.maxEvents) || 6));
  }

  function renderChartNewsBox(animateFromRect = null) {
    if (!isTopWindow) return;

    const nc = normalizeNewsBoxConfig(settings.newsBox);
    settings.newsBox = nc;

    if (!nc.enabled) {
      if (chartNewsBoxEl) {
        chartNewsBoxEl.style.display = 'none';
      }
      if (newsBoxTickerInterval) {
        clearInterval(newsBoxTickerInterval);
        newsBoxTickerInterval = null;
      }
      return;
    }

    if (liveEconomicNewsEvents.length === 0 && !isFetchingEconomicNews) {
      fetchLiveEconomicNewsEvents(false).then(() => {
        if (settings.newsBox && settings.newsBox.enabled) {
          renderChartNewsBox();
        }
      });
    }

    if (!chartNewsBoxEl || !chartNewsBoxEl.isConnected) {
      chartNewsBoxEl = document.getElementById('vest-chart-news-box');
      if (!chartNewsBoxEl) {
        chartNewsBoxEl = document.createElement('div');
        chartNewsBoxEl.id = 'vest-chart-news-box';
        document.body.appendChild(chartNewsBoxEl);
      }
    }

    chartNewsBoxEl.style.display = 'block';
    chartNewsBoxEl.classList.toggle('is-pinned', Boolean(nc.pinned && !nc.collapsed));
    chartNewsBoxEl.classList.toggle('is-minimized-pill', Boolean(nc.collapsed));
    chartNewsBoxEl.style.width = nc.collapsed ? 'auto' : `${nc.boxWidth}px`;
    chartNewsBoxEl.style.background = hexToRgba(nc.bgColor || '#131722', (Number(nc.bgOpacity ?? 88)) / 100);
    chartNewsBoxEl.style.borderColor = hexToRgba(nc.borderColor || '#38bdf8', nc.pinned ? 0.72 : 0.48);

    const eventsToShow = getFilteredUpcomingNewsList(nc);
    const nowMs = Date.now();
    const tzBadge = nc.timeZoneMode === 'ny' ? 'NY' : nc.timeZoneMode === 'utc' ? 'UTC' : 'LOC';

    if (nc.collapsed) {
      chartNewsBoxEl.innerHTML = `
        <div class="vest-cnb-min-pill-bar" id="vest-cnb-restore-bar" title="Click to restore ${escapeHtml(nc.boxTitle || 'Upcoming News')} to its last position">
          <div class="vest-cnb-title-group">
            <span class="vest-cnb-title-dot" style="background:${nc.redFolderColor}; box-shadow:0 0 8px ${nc.redFolderColor};"></span>
            <span class="vest-cnb-title">${escapeHtml(nc.boxTitle || 'Upcoming News')}</span>
            <span style="font-size:9.5px; font-family:'JetBrains Mono', monospace; color:#94a3b8; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px;">${eventsToShow.length}</span>
          </div>
          <span class="vest-cnb-restore-hint" title="Restore Window">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </span>
        </div>
      `;
    } else {
      chartNewsBoxEl.innerHTML = `
        <div class="vest-cnb-header" id="vest-cnb-drag-handle" title="${nc.pinned ? 'Window is pinned to screen position (click pin to unlock)' : 'Drag to move anywhere on screen'}">
          <div class="vest-cnb-title-group">
            <span class="vest-cnb-title-dot" style="background:${nc.redFolderColor}; box-shadow:0 0 8px ${nc.redFolderColor};"></span>
            <span class="vest-cnb-title">${escapeHtml(nc.boxTitle || 'Upcoming News')}</span>
            <span style="font-size:9.5px; font-family:'JetBrains Mono', monospace; color:#94a3b8; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px;">${tzBadge}</span>
          </div>
          <div class="vest-cnb-actions">
            <button type="button" class="vest-cnb-icon-btn" id="vest-cnb-refresh-btn" title="Refresh Economic News">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </button>
            <button type="button" class="vest-cnb-icon-btn" id="vest-cnb-settings-btn" title="Customize News Box Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button type="button" class="vest-cnb-icon-btn ${nc.pinned ? 'is-pinned' : ''}" id="vest-cnb-pin-btn" title="${nc.pinned ? 'Pinned to screen position (click to unpin and allow moving)' : 'Pin window to exact screen position (remembers on refresh)'}">
              <svg viewBox="0 0 24 24" fill="${nc.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button type="button" class="vest-cnb-icon-btn" id="vest-cnb-collapse-btn" title="Minimize to the Cortex bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="vest-cnb-body">
          ${eventsToShow.length === 0 ? `
            <div class="vest-cnb-empty">No upcoming news matching current folder/country filters.</div>
          ` : eventsToShow.map(ev => {
            const diffMs = ev.epochMs - nowMs;
            const isPast = diffMs < 0;
            const isImminent = diffMs >= 0 && diffMs <= 30 * 60 * 1000;
            const timeText = formatNewsEventTime(ev.dateObj, nc);
            const flagStr = nc.showCountryFlag !== false ? `${getCountryFlagEmoji(ev.country)} ` : '';
            const countdownHtml = nc.showCountdown !== false
              ? `<span class="vest-cnb-countdown ${isImminent ? 'imminent' : ''}">${escapeHtml(formatNewsCountdown(diffMs))}</span>`
              : '';
            return `
              <div class="vest-cnb-row ${isImminent ? 'is-imminent' : ''} ${isPast ? 'is-past' : ''}" style="${nc.showCountdown === false ? 'grid-template-columns: 58px 46px 22px minmax(0, 1fr);' : ''}">
                <span class="vest-cnb-time">${escapeHtml(timeText)}</span>
                <span class="vest-cnb-country">${flagStr}${escapeHtml(ev.country)}</span>
                ${renderFolderIconSvg(ev.folder, nc)}
                <span class="vest-cnb-event-title" title="${escapeHtml(ev.title)}">${escapeHtml(ev.title)}</span>
                ${countdownHtml}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    wireChartNewsBoxEvents();
    clampAndPositionChartNewsBox();

    if (animateFromRect) {
      animateChartBoxMinimizeOrRestore(chartNewsBoxEl, animateFromRect, Boolean(nc.collapsed));
    }

    repositionAllMinimizedBoxes();

    if (!newsBoxTickerInterval) {
      // Refresh countdowns & viewport clamping every 15 seconds, plus periodic feed check
      newsBoxTickerInterval = setInterval(() => {
        if (!isExtensionValid()) {
          clearInterval(newsBoxTickerInterval);
          newsBoxTickerInterval = null;
          return;
        }
        if (!settings.newsBox || !settings.newsBox.enabled) return;
        if (!activeNewsBoxDrag) {
          renderChartNewsBox();
        }
      }, 15000);
    }
  }

  function wireChartNewsBoxEvents() {
    if (!chartNewsBoxEl) return;

    const restoreBar = chartNewsBoxEl.querySelector('#vest-cnb-restore-bar');
    if (restoreBar) {
      restoreBar.addEventListener('click', (e) => {
        e.stopPropagation();
        const prevRect = chartNewsBoxEl.getBoundingClientRect();
        if (!settings.newsBox) settings.newsBox = JSON.parse(JSON.stringify(DEFAULT_NEWS_BOX));
        settings.newsBox.collapsed = false;
        markWindowAsRestored('news');
        queueSettingsSave({ newsBox: settings.newsBox });
        renderChartNewsBox(prevRect);
      });
      return;
    }

    const dragHandle = chartNewsBoxEl.querySelector('#vest-cnb-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button')) return;
        if (settings.newsBox && settings.newsBox.pinned) {
          showToast('News Box is pinned — click the pin icon to move it');
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const rect = chartNewsBoxEl.getBoundingClientRect();
        activeNewsBoxDrag = {
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top
        };
        chartNewsBoxEl.classList.add('dragging');
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
          if (!activeNewsBoxDrag || !chartNewsBoxEl) return;
          const vp = getScreenBoundsRect();
          const boxW = chartNewsBoxEl.offsetWidth || 325;
          const boxH = chartNewsBoxEl.offsetHeight || 160;

          const rawLeft = ev.clientX - activeNewsBoxDrag.offsetX;
          const rawTop = ev.clientY - activeNewsBoxDrag.offsetY;

          // Keep the whole box inside the usable screen area below the Cortex top bar.
          const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, rawLeft));
          const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, rawTop));

          chartNewsBoxEl.style.left = `${Math.round(clampedLeft)}px`;
          chartNewsBoxEl.style.top = `${Math.round(clampedTop)}px`;

          const maxOffsetX = Math.max(1, vp.width - boxW);
          const maxOffsetY = Math.max(1, vp.height - boxH);
          const relX = Math.max(0, Math.min(1, (clampedLeft - vp.left) / maxOffsetX));
          const relY = Math.max(0, Math.min(1, (clampedTop - vp.top) / maxOffsetY));

          if (!settings.newsBox) settings.newsBox = JSON.parse(JSON.stringify(DEFAULT_NEWS_BOX));
          settings.newsBox.relX = Math.round(relX * 10000) / 10000;
          settings.newsBox.relY = Math.round(relY * 10000) / 10000;
          settings.newsBox.pinnedLeft = Math.round(clampedLeft);
          settings.newsBox.pinnedTop = Math.round(clampedTop);
        };

        const onUp = () => {
          if (!activeNewsBoxDrag) return;
          activeNewsBoxDrag = null;
          if (chartNewsBoxEl) chartNewsBoxEl.classList.remove('dragging');
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMove, true);
          window.removeEventListener('mouseup', onUp, true);
          queueSettingsSave({ newsBox: settings.newsBox });
        };

        window.addEventListener('mousemove', onMove, true);
        window.addEventListener('mouseup', onUp, true);
      });
    }

    chartNewsBoxEl.querySelector('#vest-cnb-refresh-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fetchLiveEconomicNewsEvents(true).then(() => {
        renderChartNewsBox();
        showToast('Upcoming news updated');
      });
    });

    chartNewsBoxEl.querySelector('#vest-cnb-settings-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openStudioSettingsModal('news');
    });

    chartNewsBoxEl.querySelector('#vest-cnb-pin-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!settings.newsBox) settings.newsBox = JSON.parse(JSON.stringify(DEFAULT_NEWS_BOX));
      const nextPinned = !settings.newsBox.pinned;
      settings.newsBox.pinned = nextPinned;
      if (nextPinned && chartNewsBoxEl) {
        const rect = chartNewsBoxEl.getBoundingClientRect();
        const vp = getScreenBoundsRect();
        const boxW = chartNewsBoxEl.offsetWidth || settings.newsBox.boxWidth || 325;
        const boxH = chartNewsBoxEl.offsetHeight || 160;
        settings.newsBox.pinnedLeft = Math.round(rect.left);
        settings.newsBox.pinnedTop = Math.round(rect.top);
        settings.newsBox.relX = Math.round(Math.max(0, Math.min(1, (rect.left - vp.left) / Math.max(1, vp.width - boxW))) * 10000) / 10000;
        settings.newsBox.relY = Math.round(Math.max(0, Math.min(1, (rect.top - vp.top) / Math.max(1, vp.height - boxH))) * 10000) / 10000;
      }
      queueSettingsSave({ newsBox: settings.newsBox });
      renderChartNewsBox();
          showToast(nextPinned ? 'News Box pinned to screen position' : 'News Box unpinned');
    });

    chartNewsBoxEl.querySelector('#vest-cnb-collapse-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const prevRect = chartNewsBoxEl.getBoundingClientRect();
      if (!settings.newsBox) settings.newsBox = JSON.parse(JSON.stringify(DEFAULT_NEWS_BOX));
      // Save exact current position before minimizing so restoring returns to the exact spot it was left in
      const vp = getScreenBoundsRect();
      const boxW = prevRect.width || settings.newsBox.boxWidth || 325;
      const boxH = prevRect.height || 160;
      settings.newsBox.relX = Math.round(Math.max(0, Math.min(1, (prevRect.left - vp.left) / Math.max(1, vp.width - boxW))) * 10000) / 10000;
      settings.newsBox.relY = Math.round(Math.max(0, Math.min(1, (prevRect.top - vp.top) / Math.max(1, vp.height - boxH))) * 10000) / 10000;
      if (settings.newsBox.pinned) {
        settings.newsBox.pinnedLeft = Math.round(prevRect.left);
        settings.newsBox.pinnedTop = Math.round(prevRect.top);
      }
      settings.newsBox.collapsed = true;
      markWindowAsMinimized('news');
      queueSettingsSave({ newsBox: settings.newsBox });
      renderChartNewsBox(prevRect);
    });
  }

  if (isTopWindow) {
    window.addEventListener('resize', () => { // tv-chart-resize
      ensureCortexTopBar();
      if (settings.newsBox && settings.newsBox.enabled && !settings.newsBox.collapsed) {
        clampAndPositionChartNewsBox();
      }
      if (settings.tradesBox && settings.tradesBox.enabled && !settings.tradesBox.collapsed) {
        clampAndPositionChartTradesBox();
      }
      if (settings.diagnosticsBox && settings.diagnosticsBox.enabled && !settings.diagnosticsBox.collapsed) {
        clampAndPositionChartDiagnosticsBox();
      }
      if (settings.rangeDetector && settings.rangeDetector.enabled && !settings.rangeDetector.collapsed) {
        clampAndPositionChartRangeBox();
      }
      if (settings.orderBlocks && settings.orderBlocks.enabled && settings.orderBlocks.showStatsBox !== false && !settings.orderBlocks.statsBoxCollapsed) {
        clampAndPositionChartOrderBlockStatsBox();
      }
      repositionAllMinimizedBoxes();
    });
  }

  // -------------------------------------------------------------
  // Moveable Instrument Trades Box on Chart (Pinned to Chart Viewport)
  // -------------------------------------------------------------
  let chartTradesBoxEl = null;
  let activeTradesBoxDrag = null;
  let tradesDomScanInterval = null;
  let hasPrepopulatedPositionsHistoryOnce = false;
  let isPrepopulatingPositionsHistory = false;

  function formatDateWithCortexPattern(d, patternStr, timeZone) {
    let yyyy = d.getFullYear();
    let m = d.getMonth() + 1;
    let day = d.getDate();

    try {
      const fmtOpts = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      };
      if (timeZone) fmtOpts.timeZone = timeZone;
      const parts = new Intl.DateTimeFormat('en-US', fmtOpts).formatToParts(d);
      for (const p of parts) {
        if (p.type === 'year') yyyy = parseInt(p.value, 10);
        else if (p.type === 'month') m = parseInt(p.value, 10);
        else if (p.type === 'day') day = parseInt(p.value, 10);
      }
    } catch (e) {}

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let fmt = (typeof patternStr === 'string' && patternStr.trim()) ? patternStr.trim() : 'M-d-y';
    // Ensure year is always included in the date pattern if the user's pattern omitted it
    if (!/[yY]/.test(fmt)) {
      const sep = fmt.includes('/') ? '/' : '-';
      fmt = `${fmt}${sep}y`;
    }

    const tokenMap = {
      MMMM: monthsFull[m - 1] || String(m),
      MMM: monthsShort[m - 1] || String(m),
      MM: String(m).padStart(2, '0'),
      M: String(m),
      dd: String(day).padStart(2, '0'),
      DD: String(day).padStart(2, '0'),
      d: String(day),
      D: String(day),
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

  function resolveCortexTimeZone(tc) {
    const mode = (tc && tc.timeZoneMode) || (settings.newsBox && settings.newsBox.timeZoneMode) || 'ny';
    if (mode === 'ny') return 'America/New_York';
    if (mode === 'utc') return 'UTC';
    return undefined;
  }

  function formatTradeDateShort(epochMs, tc) {
    const ms = Number(epochMs);
    if (!isFinite(ms) || ms <= 0) return '--/--/--';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '--/--/--';

    const cortexDatePattern =
      (tc && tc.dateFormat) ||
      (settings.sessionIndicators && settings.sessionIndicators.permDateFormat) ||
      'M-d-y';
    const tz = resolveCortexTimeZone(tc);
    return formatDateWithCortexPattern(d, cortexDatePattern, tz);
  }

  function formatTradeTimeShort(epochMs, tc) {
    const ms = Number(epochMs);
    if (!isFinite(ms) || ms <= 0) return '--:--';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '--:--';

    const effectiveTimeFmt = (tc && tc.timeFormat) || (settings.newsBox && settings.newsBox.timeFormat) || '12h';
    const is24h = effectiveTimeFmt === '24h';
    const opts = {
      hour: is24h ? '2-digit' : 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: !is24h
    };
    const tz = resolveCortexTimeZone(tc);
    if (tz) {
      opts.timeZone = tz;
    }

    try {
      // If seconds are 00, omit seconds for cleaner display
      if (d.getSeconds() === 0) {
        delete opts.second;
      }
      let timeStr = new Intl.DateTimeFormat('en-US', opts).format(d);
      if (!is24h) {
        timeStr = timeStr.replace(/\s+/g, '').toLowerCase();
      }
      return timeStr;
    } catch (e) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  function formatTradeDuration(durationMs) {
    const ms = Math.max(0, Number(durationMs) || 0);
    const totalSecs = Math.round(ms / 1000);
    if (totalSecs < 60) {
      return `${totalSecs}s`;
    }
    const totalMins = Math.floor(totalSecs / 60);
    const remSecs = totalSecs % 60;
    if (totalMins < 60) {
      return remSecs > 0 ? `${totalMins}m ${remSecs}s` : `${totalMins}m`;
    }
    const totalHours = Math.floor(totalMins / 60);
    const remMins = totalMins % 60;
    if (totalHours < 24) {
      return remMins > 0 ? `${totalHours}h ${remMins}m` : `${totalHours}h`;
    }
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  }
  const formatTradeDurationHuman = formatTradeDuration;

  function buildSideBadgeInlineStyle(side, tc) {
    const isShort = side === 'SHORT';
    const textColor = isShort
      ? (tc?.shortBadgeTextColor || '#fbbf24')
      : (tc?.longBadgeTextColor || '#38bdf8');
    const bgHex = isShort
      ? (tc?.shortBadgeBgColor || '#0f172a')
      : (tc?.longBadgeBgColor || '#0f172a');
    const bgOp = isShort
      ? Number(tc?.shortBadgeBgOpacity ?? 85)
      : Number(tc?.longBadgeBgOpacity ?? 85);
    const borderHex = isShort
      ? (tc?.shortBadgeBorderColor || textColor)
      : (tc?.longBadgeBorderColor || textColor);
    const fontFamily = tc?.sideBadgeFontFamily || '"JetBrains Mono", Consolas, "Liberation Mono", monospace';
    const fontSize = Math.max(7, Math.min(15, Number(tc?.sideBadgeFontSize) || 9.5));
    const styleMode = tc?.sideBadgeFontStyle || 'bold';
    const fontWeight = (styleMode === 'bold' || styleMode === 'bold_italic') ? '700' : '500';
    const fontStyle = (styleMode === 'italic' || styleMode === 'bold_italic') ? 'italic' : 'normal';

    const bgRgba = hexToRgba(bgHex, Math.max(0, Math.min(100, bgOp)) / 100);
    const borderRgba = hexToRgba(borderHex, 0.52);
    const glowRgba = hexToRgba(borderHex, 0.14);

    return `color:${textColor}; background:${bgRgba}; border:1px solid ${borderRgba}; box-shadow:inset 0 0 8px ${glowRgba}; font-family:${escapeHtml(fontFamily)}; font-size:${fontSize}px; font-weight:${fontWeight}; font-style:${fontStyle};`;
  }

  function mergeCapturedTrades(rawTradesList, showNotification = false) {
    if (!Array.isArray(rawTradesList) || rawTradesList.length === 0) return 0;
    const tc = normalizeTradesBoxConfig(settings.tradesBox);
    if (tc.autoCaptureTrades === false && !showNotification) return 0;

    const existingIds = new Set(tc.trades.map(t => t.id));
    const existingSigs = new Set(
      tc.trades.map(t => `${t.symbolKey}::${t.side}::${Math.round((t.exitTime || 0) / 5000)}::${Math.round((t.pnl || 0) * 100)}`)
    );

    let addedCount = 0;
    for (const raw of rawTradesList) {
      const norm = normalizeTradeEntry(raw);
      if (!norm) continue;
      const sig = `${norm.symbolKey}::${norm.side}::${Math.round((norm.exitTime || 0) / 5000)}::${Math.round((norm.pnl || 0) * 100)}`;
      if (existingIds.has(norm.id) || existingSigs.has(sig)) continue;
      existingIds.add(norm.id);
      existingSigs.add(sig);
      tc.trades.unshift(norm);
      addedCount++;
    }

    if (addedCount > 0) {
      hasPrepopulatedPositionsHistoryOnce = true;
      settings.tradesBox = normalizeTradesBoxConfig(tc);
      queueSettingsSave({ tradesBox: settings.tradesBox });
      if (settings.tradesBox.enabled) {
        renderChartTradesBox();
      }
      if (showNotification) {
        showToast(`Captured ${addedCount} trade${addedCount === 1 ? '' : 's'} from Positions History`);
      }
    }
    return addedCount;
  }

  /**
   * Locates the bottom Positions panel and inspects its tab buttons:
   * Returns { panelEl, activeTabText, positionsHistoryTabBtn, activeTabBtn, isPositionsHistoryActive }
   */
  function inspectBottomPositionsPanelTabs() {
    const candidates = Array.from(document.querySelectorAll('button, [role="tab"], div[class*="tab"], span[class*="tab"], a[role="tab"]'));
    let positionsHistoryTabBtn = null;
    for (const el of candidates) {
      if (el.closest('#vest-studio-settings-dialog') || el.closest('#vest-chart-trades-box') || el.closest('#vest-action-log-box')) continue;
      const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
      if (/^positions?\s+history(\s*\(\d+\))?$/i.test(txt) || /^closed\s+positions?(\s*\(\d+\))?$/i.test(txt)) {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 12 && r.top > 180) {
          positionsHistoryTabBtn = el;
          break;
        }
      }
    }

    if (!positionsHistoryTabBtn) {
      return { panelEl: null, activeTabText: '', positionsHistoryTabBtn: null, activeTabBtn: null, isPositionsHistoryActive: false };
    }

    // Find the tablist / tab bar row containing Positions History and sibling tabs (Active Positions, Open Orders, etc.)
    let tabBarEl = positionsHistoryTabBtn.parentElement;
    while (tabBarEl && tabBarEl !== document.body) {
      const t = (tabBarEl.innerText || tabBarEl.textContent || '');
      if (/active\s+positions|open\s+orders/i.test(t)) {
        break;
      }
      tabBarEl = tabBarEl.parentElement;
    }

    let panelEl = tabBarEl || positionsHistoryTabBtn.parentElement;
    while (panelEl && panelEl !== document.body) {
      if (panelEl.querySelector('table, [role="table"], [role="grid"]') || panelEl.getBoundingClientRect().height >= 120) {
        break;
      }
      panelEl = panelEl.parentElement;
    }

    // Check which tab button in tabBarEl is currently active/selected
    let activeTabBtn = null;
    let activeTabText = '';
    const isBtnActive = (btn) => {
      if (!btn) return false;
      const aria = btn.getAttribute('aria-selected');
      const state = btn.getAttribute('data-state') || btn.getAttribute('data-active') || '';
      const cls = typeof btn.className === 'string' ? btn.className : '';
      if (aria === 'true' || state === 'active' || state === 'true') return true;
      if (/\b(active|selected|current)\b/i.test(cls)) return true;
      const cs = window.getComputedStyle(btn);
      if (cs.borderBottomWidth && parseFloat(cs.borderBottomWidth) >= 1.5 && cs.borderBottomColor !== 'rgba(0, 0, 0, 0)' && cs.borderBottomColor !== 'transparent') {
        return true;
      }
      // Also check if a child underline indicator element exists inside the tab button
      const childDivs = btn.querySelectorAll('div, span');
      for (const cd of childDivs) {
        const r = cd.getBoundingClientRect();
        if (r.height >= 1 && r.height <= 4 && r.width >= 16) {
          const cdCs = window.getComputedStyle(cd);
          if (cdCs.backgroundColor && cdCs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cdCs.backgroundColor !== 'transparent') {
            return true;
          }
        }
      }
      return false;
    };

    //Also check if the visible table headers inside panelEl explicitly show Positions History columns ("Opened At" + "Closed At" / "Close Price" / "Close Reason")
    let hasPositionsHistoryColumnsVisible = false;
    if (panelEl) {
      const panelText = (panelEl.innerText || panelEl.textContent || '');
      if (/\b(Opened\s+At|Open\s+Price)\b/i.test(panelText) && /\b(Closed\s+At|Close\s+Price|Close\s+Reason)\b/i.test(panelText)) {
        hasPositionsHistoryColumnsVisible = true;
      }
    }

    if (tabBarEl) {
      const tabBtns = Array.from(tabBarEl.querySelectorAll('button, [role="tab"], a, div')).filter(b => {
        const tx = (b.innerText || b.textContent || '').trim().replace(/\s+/g, ' ');
        return /^(active\s+positions|positions(\s*\(\d+\))?|open\s+orders|positions?\s+history|order\s+history|trade\s+history|funding\s+history|balances)/i.test(tx) && b.children.length <= 3;
      });
      for (const b of tabBtns) {
        if (isBtnActive(b) || (b.parentElement && b.parentElement !== tabBarEl && isBtnActive(b.parentElement))) {
          activeTabBtn = b;
          activeTabText = (b.innerText || b.textContent || '').trim().replace(/\s+/g, ' ');
          break;
        }
      }
    }

    const isPositionsHistoryActive = Boolean(
      hasPositionsHistoryColumnsVisible ||
      isBtnActive(positionsHistoryTabBtn) ||
      (positionsHistoryTabBtn.parentElement && positionsHistoryTabBtn.parentElement !== tabBarEl && isBtnActive(positionsHistoryTabBtn.parentElement)) ||
      /positions?\s+history|closed\s+positions/i.test(activeTabText)
    );

    return {
      panelEl,
      tabBarEl,
      activeTabText,
      positionsHistoryTabBtn,
      activeTabBtn,
      isPositionsHistoryActive
    };
  }

  /**
   * Scans ONLY the "Positions History" table in Vest's bottom panel.
   * Strictly ignores "Active Positions", "Open Orders", and any table with open-position columns (Liq. Price, Margin, Mark Price, TP/SL, Unrealized PnL).
   */
  function scanDomTradeTablesForTrades(manualTrigger = false) {
    if (!isTopWindow) return 0;
    const tc = normalizeTradesBoxConfig(settings.tradesBox);
    if (!manualTrigger && tc.autoCaptureTrades === false) return 0;

    const tabInfo = inspectBottomPositionsPanelTabs();
    // If the bottom panel exists and its active tab is NOT Positions History (e.g. user is on Active Positions or Open Orders), DO NOT scrape!
    if (tabInfo.positionsHistoryTabBtn && !tabInfo.isPositionsHistoryActive) {
      return 0;
    }

    const extracted = [];
    try {
      const scopeRoot = (tabInfo.panelEl && tabInfo.isPositionsHistoryActive) ? tabInfo.panelEl : document;

      // 1. Standard <table> / [role="table"] / [role="grid"] scan + Flex/Grid div-based table scan (used by Vest Markets Positions History)
      const tableContainers = Array.from(scopeRoot.querySelectorAll('table, [role="table"], [role="grid"]'));
      if (tabInfo.panelEl && !tableContainers.includes(tabInfo.panelEl)) {
        tableContainers.push(tabInfo.panelEl);
      }

      const seenRowSignatures = new Set();

      tableContainers.forEach(table => {
        if (table.closest('#vest-studio-settings-dialog') || table.closest('#vest-chart-trades-box') || table.closest('#vest-action-log-box')) return;

        // Inspect column headers: check both standard <th> / [role="columnheader"] and Vest's div-based header row ("Market", "Size", "Open Price", "Close Price", "PnL", "Opened At", "Closed At")
        let headerCells = Array.from(table.querySelectorAll('th, [role="columnheader"], thead td'));
        if (headerCells.length === 0) {
          // Find the header row div that contains "Opened At" and "Closed At"
          const candidateDivs = Array.from(table.querySelectorAll('div, tr'));
          for (const d of candidateDivs) {
            if (d.children.length >= 5 && d.children.length <= 15) {
              const childTexts = Array.from(d.children).map(c => (c.innerText || c.textContent || '').trim().toLowerCase().replace(/\s+/g, ' '));
              if (
                childTexts.some(t => t.startsWith('market') || t.startsWith('symbol')) &&
                childTexts.some(t => t.startsWith('pnl') || t.includes('realized')) &&
                childTexts.some(t => t.includes('closed at') || t.includes('close price') || t.includes('close time'))
              ) {
                headerCells = Array.from(d.children);
                break;
              }
            }
          }
        }

        const headers = headerCells.map(h => (h.innerText || h.textContent || '').trim().toLowerCase().replace(/\s+/g, ' '));
        if (headers.length === 0) return;

        // Strictly require closed/history column headers ("closed at", "close price", "close reason", "exit time")
        // and reject Active Positions / Open Orders tables!
        const hasOpenPositionHeaders = headers.some(h =>
          h.includes('liq') ||
          h.includes('liquidation') ||
          h.includes('unrealized') ||
          h.includes('upnl') ||
          h.includes('mark price') ||
          h.includes('tp/sl') ||
          h.includes('tp / sl') ||
          h.includes('margin') ||
          h.includes('est. liq')
        );
        if (hasOpenPositionHeaders) return;

        const hasPnlCol = headers.some(h => h.startsWith('pnl') || h.includes('pnl') || h.includes('profit') || h.includes('realized') || h.includes('p&l'));
        const hasClosedAtCol = headers.some(h =>
          h.includes('closed at') ||
          h.includes('close time') ||
          h.includes('exit time') ||
          h.includes('close price') ||
          h.includes('close reason')
        );

        if (!hasPnlCol || !hasClosedAtCol) return;

        const colIdx = {
          symbol: headers.findIndex(h => h.includes('market') || h.includes('symbol') || h.includes('instrument') || h.includes('pair') || h.includes('asset') || h.includes('contract')),
          side: headers.findIndex(h => h.includes('side') || h.includes('direction') || h.includes('type')),
          openPrice: headers.findIndex(h => h.includes('open price') || h.includes('entry price')),
          closePrice: headers.findIndex(h => h.includes('close price') || h.includes('exit price')),
          pnl: headers.findIndex(h => h.startsWith('pnl') || h.includes('realized') || h.includes('closed pnl') || h.includes('pnl') || h.includes('p&l') || h.includes('profit')),
          entryTime: headers.findIndex(h => (h.includes('opened') || h.includes('open') || h.includes('entry') || h.includes('created')) && (h.includes('at') || h.includes('time') || h.includes('date'))),
          exitTime: headers.findIndex(h => (h.includes('closed') || h.includes('close') || h.includes('exit') || h.includes('settled')) && (h.includes('at') || h.includes('time') || h.includes('date'))),
          duration: headers.findIndex(h => h.includes('duration') || h.includes('hold') || h.includes('held')),
          tradeId: headers.findIndex(h => h === 'id' || h.startsWith('id '))
        };

        // Gather rows: either standard <tr> / [role="row"] or sibling row divs under the table body
        let rows = Array.from(table.querySelectorAll('tbody tr, [role="row"]'));
        if (rows.length === 0 && headerCells.length > 0 && headerCells[0].parentElement) {
          const headerRowEl = headerCells[0].parentElement;
          const rowContainer = headerRowEl.nextElementSibling || headerRowEl.parentElement;
          if (rowContainer) {
            const candidateRowDivs = Array.from(rowContainer.querySelectorAll('div, tr')).filter(el => {
              if (el === headerRowEl || el.contains(headerRowEl)) return false;
              if (el.children.length < 5 || el.children.length > 15) return false;
              const txt = (el.innerText || el.textContent || '');
              return /\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}/.test(txt) && /\$[0-9]/.test(txt);
            });
            rows = candidateRowDivs;
          }
        }

        rows.forEach(row => {
          if (row.querySelector('th, [role="columnheader"]')) return;
          let rawCellEls = Array.from(row.querySelectorAll('td, [role="cell"], [role="gridcell"]'));
          if (rawCellEls.length === 0) {
            rawCellEls = Array.from(row.children);
          }
          const cells = rawCellEls.map(c => (c.innerText || c.textContent || '').trim());
          if (cells.length < 5) return;

          const joinedRow = cells.join(' ');
          if (/no\s+(positions?|trades?|history|data|records)/i.test(joinedRow)) return;

          // Extract Realized PnL
          let pnlVal = null;
          if (colIdx.pnl >= 0 && cells[colIdx.pnl]) {
            const cellStr = cells[colIdx.pnl].replace(/,/g, '');
            const m = cellStr.match(/([+-]?\s*\$\s*[0-9]+(?:\.[0-9]+)?|\$\s*[+-]?[0-9]+(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?\s*(?:USD|USDC|USDT|\$))/i) ||
                      cellStr.match(/([+-]?[0-9]+\.[0-9]+)/);
            if (m) {
              const sign = /-\s*\$|\$-\s*[0-9]|^-\s*[0-9]|\([$\d.,]+\)/.test(cellStr) ? -1 : 1;
              const absVal = Math.abs(Number(m[1].replace(/[^0-9.]/g, '')));
              if (isFinite(absVal)) {
                pnlVal = sign < 0 ? -absVal : (cellStr.includes('-') ? -absVal : absVal);
              }
            }
          }
          if (pnlVal === null || !isFinite(pnlVal)) return;

          // Extract Symbol & Side (in Vest Positions History, cell 0 has "NQ\nShort 50x" or "NQ\nLong 50x")
          let sym = currentInstrument || 'BTC-PERP';
          let side = 'LONG';
          const rowTextUpper = joinedRow.toUpperCase();

          if (colIdx.symbol >= 0 && cells[colIdx.symbol]) {
            const rawSymCell = cells[colIdx.symbol].replace(/\s+/g, ' ').trim();
            const tok = rawSymCell.split(' ')[0];
            if (tok) sym = tok;
            if (/\b(SHORT|SELL)\b/i.test(rawSymCell)) {
              side = 'SHORT';
            } else if (/\b(LONG|BUY)\b/i.test(rawSymCell)) {
              side = 'LONG';
            }
          } else {
            const symCell = cells.find(c => /\b([A-Z0-9]{2,10}[-/](?:PERP|USD|USDT|USDC)|BTC|ETH|SOL|NQ|ES|SPCX|TSLA)\b/i.test(c));
            if (symCell) sym = symCell.split(/\s+/)[0];
          }

          if (colIdx.side >= 0 && cells[colIdx.side]) {
            side = /SHORT|SELL/i.test(cells[colIdx.side]) ? 'SHORT' : 'LONG';
          } else if (/\b(SHORT|SELL)\b/.test(rowTextUpper) && !/\b(LONG|BUY)\b/.test(rowTextUpper)) {
            side = 'SHORT';
          }

          // Extract Duration if column exists
          const durationRaw = (colIdx.duration >= 0 && cells[colIdx.duration]) ? cells[colIdx.duration] : null;
          const durationMs = durationRaw ? parseDurationStringMs(durationRaw) : null;

          // Extract Opened At and Closed At timestamps from row
          const timeCells = cells.filter((c, idx) => {
            if (idx === colIdx.pnl || idx === colIdx.duration || idx === colIdx.symbol || idx === colIdx.side) return false;
            return (
              /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{2}(:\d{2})?\b/.test(c) ||
              /\b202\d[-/]\d{1,2}[-/]\d{1,2}\b/.test(c) ||
              /\b\d{1,2}:\d{2}(:\d{2})?\b/.test(c)
            );
          });

          let entryRaw = (colIdx.entryTime >= 0 && cells[colIdx.entryTime]) ? cells[colIdx.entryTime] : null;
          let exitRaw = (colIdx.exitTime >= 0 && cells[colIdx.exitTime]) ? cells[colIdx.exitTime] : null;

          if ((!entryRaw || !exitRaw) && timeCells.length >= 2) {
            entryRaw = entryRaw || timeCells[0];
            exitRaw = exitRaw || timeCells[1];
          }

          // Strictly require BOTH entryTime ("Opened At") and exitTime ("Closed At") so we never fabricate an exit time from Date.now()!
          if (!entryRaw || !exitRaw) return;

          const rowIdCell = (colIdx.tradeId >= 0 && cells[colIdx.tradeId]) ? cells[colIdx.tradeId].trim() : '';
          const rowSig = `${sym}::${side}::${entryRaw}::${exitRaw}::${pnlVal}`;
          if (seenRowSignatures.has(rowSig)) return;
          seenRowSignatures.add(rowSig);

          extracted.push({
            id: rowIdCell ? `vh_${rowIdCell.replace(/\s+/g, '')}` : undefined,
            symbol: sym,
            side,
            pnl: pnlVal,
            entryTime: entryRaw,
            exitTime: exitRaw,
            durationMs,
            source: 'positions_history',
            verifiedHistory: true,
            verifiedBothTimes: true
          });
        });
      });
    } catch (e) {}

    if (extracted.length > 0) {
      hasPrepopulatedPositionsHistoryOnce = true;
      return mergeCapturedTrades(extracted, false);
    }
    if (tabInfo.isPositionsHistoryActive) {
      // We read the Positions History panel while it was active
      hasPrepopulatedPositionsHistoryOnce = true;
    }
    return 0;
  }

  /**
   * Prepopulates the Trades Box once by reading the Positions History panel:
   * 1. First asks main world to inspect React Fiber state / API cache for Positions History.
   * 2. If the bottom panel is currently on another tab (e.g. "Active Positions") and we haven't read Positions History yet,
   *    briefly switches to "Positions History", scrapes the rows once, and immediately restores the user's previous tab.
   */
  async function ensurePositionsHistoryPrepopulatedOnce(forceRescan = false) {
    if (!isTopWindow) return 0;
    if (isPrepopulatingPositionsHistory) return 0;
    if (hasPrepopulatedPositionsHistoryOnce && !forceRescan) return 0;

    isPrepopulatingPositionsHistory = true;
    try {
      // First request main-world React state / network cache scan
      postToMainWorlds({ type: 'VEST_TV_SCAN_PLATFORM_TRADES' });

      const tabInfo = inspectBottomPositionsPanelTabs();
      if (!tabInfo.positionsHistoryTabBtn) {
        return 0;
      }

      // If Positions History is already the active tab, just read it directly
      if (tabInfo.isPositionsHistoryActive) {
        const count = scanDomTradeTablesForTrades(true);
        hasPrepopulatedPositionsHistoryOnce = true;
        return count;
      }

      // Otherwise, briefly activate Positions History once, read its rows, and switch back to the original tab
      const previousActiveTabBtn = tabInfo.activeTabBtn;
      tabInfo.positionsHistoryTabBtn.click();

      // Wait briefly for React to render Positions History rows (or fetch them)
      let captured = 0;
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise(r => setTimeout(r, 150));
        postToMainWorlds({ type: 'VEST_TV_SCAN_PLATFORM_TRADES' });
        const c = scanDomTradeTablesForTrades(true);
        captured += c;
        const currentCheck = inspectBottomPositionsPanelTabs();
        if (captured > 0) break;
        // Check if table shows "No positions" / empty message so we can stop waiting early
        if (currentCheck.panelEl && /no\s+(positions?|history|trades|data)/i.test(currentCheck.panelEl.innerText || '')) {
          break;
        }
      }

      hasPrepopulatedPositionsHistoryOnce = true;

      // Restore the user's previous tab (e.g., Active Positions)
      if (previousActiveTabBtn && previousActiveTabBtn !== tabInfo.positionsHistoryTabBtn && previousActiveTabBtn.isConnected) {
        previousActiveTabBtn.click();
      }
      return captured;
    } catch (e) {
      return 0;
    } finally {
      isPrepopulatingPositionsHistory = false;
    }
  }

  /**
   * One-Click Quick Flatten Execution:
   * 1. Finds the Active Positions tab in the bottom panel. If not active, clicks it.
   * 2. Finds the position row matching the open symbol (or first open position).
   * 3. Finds and clicks the native "Market" or "Close" button.
   * 4. If an auto-confirm dialog appears, confirms it immediately.
   */
  function executeTopWindowFlatten(payload = {}) {
    try {
      const symFilter = String(payload.symbol || currentInstrument || '').trim().toUpperCase();
      const tabInfo = inspectBottomPositionsPanelTabs();

      const clickMarketCloseInActiveTable = () => {
        let closed = false;
        const candidateRows = Array.from(document.querySelectorAll('tbody tr, [role="row"], div[class*="row"]'));
        for (const row of candidateRows) {
          if (row.closest('#vest-studio-settings-dialog') || row.closest('#vest-chart-trades-box') || row.closest('#vest-action-log-box')) continue;
          const text = (row.innerText || row.textContent || '').trim().toUpperCase();
          if (symFilter && !text.includes(symFilter.replace('-PERP', '')) && !text.includes('BTC') && candidateRows.length > 1) {
            continue;
          }
          const buttons = Array.from(row.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
          const closeBtn = buttons.find(b => {
            const bt = (b.innerText || b.textContent || '').trim().toLowerCase();
            return bt === 'market' || bt === 'close' || bt.includes('market') || bt.includes('close position') || bt === 'flatten';
          });
          if (closeBtn) {
            closeBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
            closeBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            closeBtn.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }));
            closeBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            closeBtn.click();
            closed = true;
            break;
          }
        }

        const autoConfirm = (settings.positionHud && settings.positionHud.autoConfirmFlatten !== false);
        if (autoConfirm) {
          setTimeout(() => {
            const modals = Array.from(document.querySelectorAll('[role="dialog"], div[class*="modal"], div[class*="dialog"], div[class*="popup"]'));
            for (const m of modals) {
              if (m.id.startsWith('vest-')) continue;
              const modalBtns = Array.from(m.querySelectorAll('button, [role="button"]'));
              const confirmBtn = modalBtns.find(b => {
                const bt = (b.innerText || b.textContent || '').trim().toLowerCase();
                return bt === 'confirm' || bt.includes('confirm') || bt === 'close' || bt.includes('close position') || bt === 'market';
              });
              if (confirmBtn) {
                confirmBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
                confirmBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                confirmBtn.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }));
                confirmBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                confirmBtn.click();
                break;
              }
            }
          }, 100);
        }

        showToast(closed ? `Flattened position for ${symFilter || 'active trade'}!` : 'Market close triggered (check Active Positions)');
      };

      if (tabInfo.tabBarEl) {
        const candidateActiveTabs = Array.from(tabInfo.tabBarEl.querySelectorAll('button, [role="tab"], div, a')).filter(b => {
          const t = (b.innerText || b.textContent || '').trim().toLowerCase();
          return t.startsWith('active pos') || t === 'positions' || /^positions\s*\(\d+\)$/i.test(t);
        });
        if (candidateActiveTabs.length > 0) {
          candidateActiveTabs[0].click();
          setTimeout(clickMarketCloseInActiveTable, 120);
          return;
        }
      }

      clickMarketCloseInActiveTable();
    } catch (e) {
      console.warn('[TradingCortex:Flatten]', e);
    }
  }

  function clampAndPositionChartTradesBox() {
    if (!chartTradesBoxEl || chartTradesBoxEl.style.display === 'none' || activeTradesBoxDrag) return;
    const tc = normalizeTradesBoxConfig(settings.tradesBox);
    const vp = getScreenBoundsRect();

    if (tc.collapsed) {
      const minPos = getMinimizedCortexBarCoords('trades', chartTradesBoxEl);
      chartTradesBoxEl.style.left = `${minPos.left}px`;
      chartTradesBoxEl.style.top = `${minPos.top}px`;
      return;
    }

    const boxW = chartTradesBoxEl.offsetWidth || tc.boxWidth || 420;
    const boxH = chartTradesBoxEl.offsetHeight || 180;

    let targetLeft;
    let targetTop;
    if (tc.pinned && tc.pinnedLeft !== null && tc.pinnedTop !== null) {
      targetLeft = tc.pinnedLeft;
      targetTop = tc.pinnedTop;
    } else {
      const maxOffsetX = Math.max(0, vp.width - boxW);
      const maxOffsetY = Math.max(0, vp.height - boxH);
      targetLeft = Math.round(vp.left + tc.relX * maxOffsetX);
      targetTop = Math.round(vp.top + tc.relY * maxOffsetY);
    }

    const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, targetLeft));
    const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, targetTop));

    chartTradesBoxEl.style.left = `${clampedLeft}px`;
    chartTradesBoxEl.style.top = `${clampedTop}px`;
  }

  function getFilteredTradesForActiveInstrument(tc) {
    const activeSymKey = normalizeInstrumentKey(currentInstrument || '');
    const allTrades = Array.isArray(tc.trades) ? tc.trades : [];
    const sessionBounds = getCurrentEtTradingSessionBounds();
    const filtered = allTrades.filter(t => {
      if (!t) return false;
      if (tc.filterCurrentInstrument && activeSymKey && t.symbolKey && t.symbolKey !== activeSymKey) {
        return false;
      }
      if (tc.filterCurrentSessionOnly !== false && !isTradeWithinCurrentEtSession(t, sessionBounds)) {
        return false;
      }
      return true;
    });
    return filtered.slice(0, Math.max(1, Number(tc.maxTrades) || 15));
  }

  function renderChartTradesBox(animateFromRect = null) {
    if (!isTopWindow) return;

    const tc = normalizeTradesBoxConfig(settings.tradesBox);
    settings.tradesBox = tc;

    if (!tc.enabled) {
      if (chartTradesBoxEl) {
        chartTradesBoxEl.style.display = 'none';
      }
      if (tradesDomScanInterval) {
        clearInterval(tradesDomScanInterval);
        tradesDomScanInterval = null;
      }
      return;
    }

    if (!tradesDomScanInterval) {
      setTimeout(() => {
        if (!hasPrepopulatedPositionsHistoryOnce) {
          ensurePositionsHistoryPrepopulatedOnce(false);
        } else {
          postToMainWorlds({ type: 'VEST_TV_SCAN_PLATFORM_TRADES' });
          scanDomTradeTablesForTrades(false);
        }
      }, 600);
      tradesDomScanInterval = setInterval(() => {
        if (!isExtensionValid()) {
          clearInterval(tradesDomScanInterval);
          tradesDomScanInterval = null;
          return;
        }
        if (settings.tradesBox && settings.tradesBox.enabled) {
          if (!hasPrepopulatedPositionsHistoryOnce) {
            ensurePositionsHistoryPrepopulatedOnce(false);
          } else {
            postToMainWorlds({ type: 'VEST_TV_SCAN_PLATFORM_TRADES' });
            scanDomTradeTablesForTrades(false);
          }
        }
      }, 2500);
    }

    if (!chartTradesBoxEl || !chartTradesBoxEl.isConnected) {
      chartTradesBoxEl = document.getElementById('vest-chart-trades-box');
      if (!chartTradesBoxEl) {
        chartTradesBoxEl = document.createElement('div');
        chartTradesBoxEl.id = 'vest-chart-trades-box';
        document.body.appendChild(chartTradesBoxEl);
      }
    }

    chartTradesBoxEl.style.display = 'block';
    chartTradesBoxEl.classList.toggle('is-pinned', Boolean(tc.pinned && !tc.collapsed));
    chartTradesBoxEl.classList.toggle('is-minimized-pill', Boolean(tc.collapsed));
    chartTradesBoxEl.style.width = tc.collapsed ? 'auto' : `${tc.boxWidth}px`;
    chartTradesBoxEl.style.background = hexToRgba(tc.bgColor || '#131722', (Number(tc.bgOpacity ?? 88)) / 100);
    chartTradesBoxEl.style.borderColor = hexToRgba(tc.borderColor || '#38bdf8', tc.pinned ? 0.72 : 0.48);

    const activeSymLabel = formatInstrumentDisplayLabel(currentInstrument || 'ALL');
    const tradesToShow = getFilteredTradesForActiveInstrument(tc);

    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    for (const tr of tradesToShow) {
      const p = Number(tr.pnl) || 0;
      totalPnl += p;
      if (p > 0) wins++;
      else if (p < 0) losses++;
    }
    const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const netColor = totalPnl > 0 ? '#4ade80' : totalPnl < 0 ? '#fca5a5' : '#cbd5e1';
    const netText = `${totalPnl >= 0 ? '+' : '-'}$${Math.abs(totalPnl).toFixed(2)}`;
    const dotColor = totalPnl > 0 ? tc.winRowColor : totalPnl < 0 ? tc.lossRowColor : '#38bdf8';
    const showSide = tc.showSideBadge !== false;
    const noSideClass = showSide ? '' : 'no-side';

    if (tc.collapsed) {
      chartTradesBoxEl.innerHTML = `
        <div class="vest-cnb-min-pill-bar" id="vest-ctb-restore-bar" title="Click to restore ${escapeHtml(tc.boxTitle || 'Instrument Trades')} to its last position">
          <div class="vest-cnb-title-group">
            <span class="vest-cnb-title-dot" style="background:${dotColor}; box-shadow:0 0 8px ${dotColor};"></span>
            <span class="vest-cnb-title">${escapeHtml(tc.boxTitle || 'Instrument Trades')}</span>
            <span style="font-size:9.5px; font-family:'JetBrains Mono', monospace; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.32); padding:1px 5px; border-radius:4px;">
              ${escapeHtml(tc.filterCurrentInstrument ? activeSymLabel : 'ALL')}
            </span>
            <span style="font-size:10px; font-family:'JetBrains Mono', monospace; font-weight:700; color:${netColor};">
              ${escapeHtml(netText)}
            </span>
          </div>
          <span class="vest-cnb-restore-hint" title="Restore Window">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </span>
        </div>
      `;
    } else {
      chartTradesBoxEl.innerHTML = `
        <div class="vest-cnb-header" id="vest-ctb-drag-handle" title="${tc.pinned ? 'Window is pinned to screen position (click pin to unlock)' : 'Drag to move anywhere on screen'}">
          <div class="vest-cnb-title-group">
            <span class="vest-cnb-title-dot" style="background:${dotColor}; box-shadow:0 0 8px ${dotColor};"></span>
            <span class="vest-cnb-title">${escapeHtml(tc.boxTitle || 'Instrument Trades')}</span>
            <span style="font-size:10px; font-family:'JetBrains Mono', monospace; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.32); padding:1px 6px; border-radius:4px;">
              ${escapeHtml(tc.filterCurrentInstrument ? activeSymLabel : 'ALL')}
            </span>
            ${tc.filterCurrentSessionOnly !== false ? `
              <span style="font-size:9px; font-family:'JetBrains Mono', monospace; color:#94a3b8; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px;" title="Trading Session: 6:00 PM ET Previous Night – 4:59 PM ET Today">
                6PM–5PM ET
              </span>
            ` : ''}
          </div>
          <div class="vest-cnb-actions">
            <button type="button" class="vest-cnb-icon-btn" id="vest-ctb-add-quick-btn" title="Log a Trade for ${escapeHtml(activeSymLabel)}" style="color:#34d399; font-weight:700; font-size:14px;">
              +
            </button>
            <button type="button" class="vest-cnb-icon-btn" id="vest-ctb-sync-btn" title="Sync Trades from Positions History">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </button>
            <button type="button" class="vest-cnb-icon-btn" id="vest-ctb-settings-btn" title="Customize Instrument Trades Box Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button type="button" class="vest-cnb-icon-btn ${tc.pinned ? 'is-pinned' : ''}" id="vest-ctb-pin-btn" title="${tc.pinned ? 'Pinned to screen position (click to unpin and allow moving)' : 'Pin window to exact screen position (remembers on refresh)'}">
              <svg viewBox="0 0 24 24" fill="${tc.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button type="button" class="vest-cnb-icon-btn" id="vest-ctb-collapse-btn" title="Minimize to the Cortex bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="vest-ctb-col-header ${noSideClass}">
          ${showSide ? '<span style="text-align:center;">Side</span>' : ''}
          <div class="vest-ctb-col-header-inner">
            <span>Date</span>
            <span>Entry</span>
            <span>Exit</span>
            <span style="text-align:center;">Dur</span>
            <span style="text-align:right;">PnL</span>
          </div>
        </div>

        <div class="vest-ctb-body">
          ${tradesToShow.length === 0 ? `
            <div class="vest-cnb-empty">
              No closed trades for <strong>${escapeHtml(activeSymLabel)}</strong> in current session (6:00pm – 4:59pm ET).<br/>
              <span style="font-size:10.5px; color:#64748b;">Reads once from <strong>Positions History</strong>, or click <strong>↻</strong> / <strong>+</strong>.</span>
            </div>
          ` : tradesToShow.map(tr => {
            const pnlVal = Number(tr.pnl) || 0;
            const isWin = pnlVal > 0;
            const isLoss = pnlVal < 0;
            const rowBg = isWin
              ? hexToRgba(tc.winRowColor || '#10b981', (Number(tc.winRowOpacity ?? 24)) / 100)
              : isLoss
                ? hexToRgba(tc.lossRowColor || '#f23645', (Number(tc.lossRowOpacity ?? 24)) / 100)
                : 'rgba(255,255,255,0.03)';
            const rowBorder = isWin
              ? hexToRgba(tc.winRowColor || '#10b981', 0.48)
              : isLoss
                ? hexToRgba(tc.lossRowColor || '#f23645', 0.48)
                : 'rgba(255,255,255,0.08)';
            const leftAccent = isWin
              ? (tc.winRowColor || '#10b981')
              : isLoss
                ? (tc.lossRowColor || '#f23645')
                : '#64748b';
            const dateStr = formatTradeDateShort(tr.exitTime || tr.entryTime, tc);
            const entryStr = formatTradeTimeShort(tr.entryTime, tc);
            const exitStr = formatTradeTimeShort(tr.exitTime, tc);
            const durStr = formatTradeDuration(tr.durationMs || Math.max(0, (tr.exitTime || 0) - (tr.entryTime || 0)));
            const pnlStr = `${pnlVal >= 0 ? '+' : '-'}$${Math.abs(pnlVal).toFixed(2)}`;
            const sideBadgeStyle = buildSideBadgeInlineStyle(tr.side, tc);
            const sideBadgeHtml = showSide
              ? `<span class="vest-ctb-side-badge ${tr.side === 'SHORT' ? 'short' : 'long'}" style="${sideBadgeStyle}">${escapeHtml(tr.side)}</span>`
              : '';
            const symPrefix = !tc.filterCurrentInstrument ? `<span style="color:#93c5fd; font-weight:700;">${escapeHtml(tr.symbol)}</span> ` : '';

            return `
              <div class="vest-ctb-row-outer ${noSideClass}" title="${escapeHtml(tr.symbol)} ${escapeHtml(tr.side)} | Date: ${escapeHtml(dateStr)} | Entry: ${escapeHtml(entryStr)} → Exit: ${escapeHtml(exitStr)} | Duration: ${escapeHtml(durStr)} | PnL: ${escapeHtml(pnlStr)}">
                ${sideBadgeHtml}
                <div class="vest-ctb-row ${isWin ? 'is-win' : ''} ${isLoss ? 'is-loss' : ''}" style="background:${rowBg}; border-color:${rowBorder}; border-left:3px solid ${leftAccent};">
                  <span class="vest-ctb-date-cell">${escapeHtml(dateStr)}</span>
                  <span class="vest-ctb-time-cell">${symPrefix}${escapeHtml(entryStr)}</span>
                  <span class="vest-ctb-time-cell">${escapeHtml(exitStr)}</span>
                  <span class="vest-ctb-duration">${escapeHtml(durStr)}</span>
                  <span class="vest-ctb-pnl ${isWin ? 'win' : isLoss ? 'loss' : 'flat'}">${escapeHtml(pnlStr)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${tc.showSummaryFooter !== false && tradesToShow.length > 0 ? `
          <div class="vest-ctb-footer">
            <span><strong>${tradesToShow.length}</strong> Trade${tradesToShow.length === 1 ? '' : 's'} (${wins}W / ${losses}L · ${winRate}%)</span>
            <span>Net: <strong style="color:${netColor};">${escapeHtml(netText)}</strong></span>
          </div>
        ` : ''}
      `;
    }

    wireChartTradesBoxEvents();
    clampAndPositionChartTradesBox();

    if (animateFromRect) {
      animateChartBoxMinimizeOrRestore(chartTradesBoxEl, animateFromRect, Boolean(tc.collapsed));
    }
    repositionAllMinimizedBoxes();
  }

  function wireChartTradesBoxEvents() {
    if (!chartTradesBoxEl) return;

    const restoreBar = chartTradesBoxEl.querySelector('#vest-ctb-restore-bar');
    if (restoreBar) {
      restoreBar.addEventListener('click', (e) => {
        e.stopPropagation();
        const prevRect = chartTradesBoxEl.getBoundingClientRect();
        if (!settings.tradesBox) settings.tradesBox = JSON.parse(JSON.stringify(DEFAULT_TRADES_BOX));
        settings.tradesBox.collapsed = false;
        markWindowAsRestored('trades');
        queueSettingsSave({ tradesBox: settings.tradesBox });
        renderChartTradesBox(prevRect);
      });
      return;
    }

    const dragHandle = chartTradesBoxEl.querySelector('#vest-ctb-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button')) return;
        if (settings.tradesBox && settings.tradesBox.pinned) {
          showToast('Trades Box is pinned — click the pin icon to move it');
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const rect = chartTradesBoxEl.getBoundingClientRect();
        activeTradesBoxDrag = {
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top
        };
        chartTradesBoxEl.classList.add('dragging');
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
          if (!activeTradesBoxDrag || !chartTradesBoxEl) return;
          const vp = getScreenBoundsRect();
          const boxW = chartTradesBoxEl.offsetWidth || 420;
          const boxH = chartTradesBoxEl.offsetHeight || 180;

          const rawLeft = ev.clientX - activeTradesBoxDrag.offsetX;
          const rawTop = ev.clientY - activeTradesBoxDrag.offsetY;

          // Keep the whole box inside the usable screen area below the Cortex top bar.
          const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, rawLeft));
          const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, rawTop));

          chartTradesBoxEl.style.left = `${Math.round(clampedLeft)}px`;
          chartTradesBoxEl.style.top = `${Math.round(clampedTop)}px`;

          const maxOffsetX = Math.max(1, vp.width - boxW);
          const maxOffsetY = Math.max(1, vp.height - boxH);
          const relX = Math.max(0, Math.min(1, (clampedLeft - vp.left) / maxOffsetX));
          const relY = Math.max(0, Math.min(1, (clampedTop - vp.top) / maxOffsetY));

          if (!settings.tradesBox) settings.tradesBox = JSON.parse(JSON.stringify(DEFAULT_TRADES_BOX));
          settings.tradesBox.relX = Math.round(relX * 10000) / 10000;
          settings.tradesBox.relY = Math.round(relY * 10000) / 10000;
          settings.tradesBox.pinnedLeft = Math.round(clampedLeft);
          settings.tradesBox.pinnedTop = Math.round(clampedTop);
        };

        const onUp = () => {
          if (!activeTradesBoxDrag) return;
          activeTradesBoxDrag = null;
          if (chartTradesBoxEl) chartTradesBoxEl.classList.remove('dragging');
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMove, true);
          window.removeEventListener('mouseup', onUp, true);
          queueSettingsSave({ tradesBox: settings.tradesBox });
        };

        window.addEventListener('mousemove', onMove, true);
        window.addEventListener('mouseup', onUp, true);
      });
    }

    chartTradesBoxEl.querySelector('#vest-ctb-add-quick-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openStudioSettingsModal('trades');
    });

    chartTradesBoxEl.querySelector('#vest-ctb-sync-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const added = await ensurePositionsHistoryPrepopulatedOnce(true);
      renderChartTradesBox();
      showToast(added > 0 ? `Synced ${added} trade(s) from Positions History` : 'Synced with Positions History (6pm–4:59pm ET session)');
    });

    chartTradesBoxEl.querySelector('#vest-ctb-settings-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openStudioSettingsModal('trades');
    });

    chartTradesBoxEl.querySelector('#vest-ctb-pin-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!settings.tradesBox) settings.tradesBox = JSON.parse(JSON.stringify(DEFAULT_TRADES_BOX));
      const nextPinned = !settings.tradesBox.pinned;
      settings.tradesBox.pinned = nextPinned;
      if (nextPinned && chartTradesBoxEl) {
        const rect = chartTradesBoxEl.getBoundingClientRect();
        const vp = getScreenBoundsRect();
        const boxW = chartTradesBoxEl.offsetWidth || settings.tradesBox.boxWidth || 420;
        const boxH = chartTradesBoxEl.offsetHeight || 180;
        settings.tradesBox.pinnedLeft = Math.round(rect.left);
        settings.tradesBox.pinnedTop = Math.round(rect.top);
        settings.tradesBox.relX = Math.round(Math.max(0, Math.min(1, (rect.left - vp.left) / Math.max(1, vp.width - boxW))) * 10000) / 10000;
        settings.tradesBox.relY = Math.round(Math.max(0, Math.min(1, (rect.top - vp.top) / Math.max(1, vp.height - boxH))) * 10000) / 10000;
      }
      queueSettingsSave({ tradesBox: settings.tradesBox });
      renderChartTradesBox();
      showToast(nextPinned ? 'Trades Box pinned to screen position' : 'Trades Box unpinned');
    });

    chartTradesBoxEl.querySelector('#vest-ctb-collapse-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const prevRect = chartTradesBoxEl.getBoundingClientRect();
      if (!settings.tradesBox) settings.tradesBox = JSON.parse(JSON.stringify(DEFAULT_TRADES_BOX));
      // Save exact current position before minimizing so restoring returns to the exact spot it was left in
      const vp = getScreenBoundsRect();
      const boxW = prevRect.width || settings.tradesBox.boxWidth || 420;
      const boxH = prevRect.height || 180;
      settings.tradesBox.relX = Math.round(Math.max(0, Math.min(1, (prevRect.left - vp.left) / Math.max(1, vp.width - boxW))) * 10000) / 10000;
      settings.tradesBox.relY = Math.round(Math.max(0, Math.min(1, (prevRect.top - vp.top) / Math.max(1, vp.height - boxH))) * 10000) / 10000;
      if (settings.tradesBox.pinned) {
        settings.tradesBox.pinnedLeft = Math.round(prevRect.left);
        settings.tradesBox.pinnedTop = Math.round(prevRect.top);
      }
      settings.tradesBox.collapsed = true;
      markWindowAsMinimized('trades');
      queueSettingsSave({ tradesBox: settings.tradesBox });
      renderChartTradesBox(prevRect);
    });
  }

  // -------------------------------------------------------------
  // Cortex Debug Logger & Mode Control
  // -------------------------------------------------------------
  function cortexDebugLog(action, ...details) {
    if (!settings || !settings.debugMode) return;
    const prefix = `[CORTEX DEBUG MODE] - ${action}`;
    if (details.length > 0) {
      console.log(prefix, ...details);
    } else {
      console.log(prefix);
    }
  }

  function setCortexDebugMode(enable, sourceHint = '') {
    const nextVal = Boolean(enable);
    if (settings.debugMode === nextVal) return;
    settings.debugMode = nextVal;
    queueSettingsSave({ debugMode: nextVal });
    notifyMainWorldConfig();
    postToMainWorlds({
      type: 'VEST_TV_SET_DEBUG_MODE',
      debugMode: nextVal
    });
    cortexDebugLog(`Debug Mode switched to ${nextVal ? 'ON' : 'OFF'}${sourceHint ? ` via ${sourceHint}` : ''}`);
    renderChartDiagnosticsBox();
    renderStudioHeaderPill();
    showToast(`Debug Mode: ${nextVal ? 'ON (Echoing to console)' : 'OFF'}`);
  }

  // -------------------------------------------------------------
  // Moveable On-Chart Diagnostics Window
  // -------------------------------------------------------------
  let chartDiagnosticsBoxEl = null;
  let activeDiagnosticsBoxDrag = null;
  let latestDiagnosticsTelemetry = null;
  let diagnosticsBoxPollTimer = null;
  let currentBrowserTabId = null;
  let currentBrowserWindowId = null;
  let currentBrowserTabIndex = null;
  let isResolvingTabInfo = false;

  function resolveCurrentTabInfo() {
    if (isResolvingTabInfo) return Promise.resolve(currentBrowserTabId);
    if (!isExtensionValid() || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      return Promise.resolve(null);
    }
    isResolvingTabInfo = true;
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'getCurrentTabInfo' }, (res) => {
          isResolvingTabInfo = false;
          if (chrome.runtime.lastError || !res) {
            resolve(null);
            return;
          }
          if (res.tabId !== null && res.tabId !== undefined) {
            currentBrowserTabId = res.tabId;
            currentBrowserWindowId = res.windowId !== undefined ? res.windowId : null;
            currentBrowserTabIndex = res.tabIndex !== undefined ? res.tabIndex : null;
            cortexDebugLog(`Tab identity resolved: Tab #${currentBrowserTabId}`, { windowId: currentBrowserWindowId, tabIndex: currentBrowserTabIndex });
            postToMainWorlds({
              type: 'VEST_TV_TAB_INFO',
              payload: { tabId: currentBrowserTabId, windowId: currentBrowserWindowId }
            });
            if (chartDiagnosticsBoxEl && chartDiagnosticsBoxEl.style.display !== 'none') {
              updateChartDiagnosticsBoxTelemetryOnly();
            }
          }
          resolve(res);
        });
      } catch (e) {
        isResolvingTabInfo = false;
        resolve(null);
      }
    });
  }

  function handleIncomingDiagnosticsTelemetry(telemetry) {
    if (!telemetry || typeof telemetry !== 'object') return;
    latestDiagnosticsTelemetry = telemetry;
    if (chartDiagnosticsBoxEl && chartDiagnosticsBoxEl.style.display !== 'none') {
      updateChartDiagnosticsBoxTelemetryOnly();
    }
  }

  function handleIncomingCortexDebugLog(payload) {
    if (!settings.debugMode || !payload) return;
    const msg = payload.message || '';
    const details = Array.isArray(payload.details) ? payload.details : [];
    console.log(msg, ...details);
  }

  function copyDiagnosticsStateToClipboard() {
    try {
      const diagData = {
        title: 'Trading Cortex Diagnostics Snapshot',
        generatedAt: new Date().toISOString(),
        version: getSafeExtVersion(),
        tabId: currentBrowserTabId,
        windowId: currentBrowserWindowId,
        tabIndex: currentBrowserTabIndex,
        url: window.location.href,
        currentInstrument: currentInstrument || 'Unknown',
        currentPrice: currentPrice || '--',
        debugMode: Boolean(settings.debugMode),
        diagnosticsBox: settings.diagnosticsBox,
        accountsRiskBox: settings.accountsRiskBox,
        newsBoxEnabled: Boolean(settings.newsBox && settings.newsBox.enabled),
        tradesBoxEnabled: Boolean(settings.tradesBox && settings.tradesBox.enabled),
        positionHudEnabled: Boolean(settings.positionHud && settings.positionHud.enabled),
        candleOhlcEnabled: Boolean(settings.candleOhlc && settings.candleOhlc.enabled),
        candleNumbersEnabled: Boolean(settings.candleOhlc && settings.candleOhlc.showCandleNumbers),
        customCandleWidth: settings.candleOhlc && settings.candleOhlc.customCandleWidthEnabled ? `${settings.candleOhlc.candleWidthPx}%` : 'Auto',
        sessionsEnabled: Boolean(settings.sessionIndicators && settings.sessionIndicators.enabled),
        autoFvgEnabled: Boolean(settings.autoFvg && settings.autoFvg.enabled),
        failLinesEnabled: Boolean(settings.failLines && settings.failLines.enabled),
        cortexIndicatorEnabled: Boolean(settings.cortexIndicator && settings.cortexIndicator.enabled),
        telemetry: latestDiagnosticsTelemetry || 'No telemetry received yet from chart frame'
      };
      const text = JSON.stringify(diagData, null, 2);
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Diagnostics snapshot copied to clipboard!');
        }).catch(() => {
          showToast('Failed to copy snapshot to clipboard');
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Diagnostics snapshot copied to clipboard!');
      }
      cortexDebugLog('Diagnostics snapshot copied to clipboard');
    } catch (e) {
      console.warn('[TradingCortex:DiagCopy]', e);
    }
  }

  function clampAndPositionChartDiagnosticsBox() {
    if (!chartDiagnosticsBoxEl || chartDiagnosticsBoxEl.style.display === 'none' || activeDiagnosticsBoxDrag) return;
    const db = normalizeDiagnosticsBoxConfig(settings.diagnosticsBox);
    const vp = getScreenBoundsRect();

    if (db.collapsed) {
      const minPos = getMinimizedCortexBarCoords('diagnostics', chartDiagnosticsBoxEl);
      chartDiagnosticsBoxEl.style.left = `${minPos.left}px`;
      chartDiagnosticsBoxEl.style.top = `${minPos.top}px`;
      return;
    }

    const boxW = chartDiagnosticsBoxEl.offsetWidth || db.boxWidth || 360;
    const boxH = chartDiagnosticsBoxEl.offsetHeight || 320;

    let targetLeft;
    let targetTop;
    if (db.pinned && db.pinnedLeft !== null && db.pinnedTop !== null) {
      targetLeft = db.pinnedLeft;
      targetTop = db.pinnedTop;
    } else {
      const maxOffsetX = Math.max(0, vp.width - boxW);
      const maxOffsetY = Math.max(0, vp.height - boxH);
      targetLeft = Math.round(vp.left + db.relX * maxOffsetX);
      targetTop = Math.round(vp.top + db.relY * maxOffsetY);
    }

    const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, targetLeft));
    const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, targetTop));

    chartDiagnosticsBoxEl.style.left = `${clampedLeft}px`;
    chartDiagnosticsBoxEl.style.top = `${clampedTop}px`;
  }


  // -------------------------------------------------------------
  // Floating On-Chart Range Detector Box Component
  // -------------------------------------------------------------
  let chartRangeBoxEl = null;
  let activeRangeBoxDrag = null;
  let latestRangeDetectorTelemetry = null;

  function clampAndPositionChartRangeBox() {
    if (!chartRangeBoxEl || chartRangeBoxEl.style.display === 'none' || activeRangeBoxDrag) return;
    const rd = normalizeRangeDetectorConfig(settings.rangeDetector);
    const vp = getScreenBoundsRect();

    if (rd.collapsed) {
      const minPos = getMinimizedCortexBarCoords('range_detector', chartRangeBoxEl);
      chartRangeBoxEl.style.left = `${minPos.left}px`;
      chartRangeBoxEl.style.top = `${minPos.top}px`;
      return;
    }

    const boxW = chartRangeBoxEl.offsetWidth || rd.boxWidth || 290;
    const boxH = chartRangeBoxEl.offsetHeight || 220;

    let targetLeft;
    let targetTop;
    if (rd.pinned && rd.pinnedLeft !== null && rd.pinnedTop !== null) {
      targetLeft = rd.pinnedLeft;
      targetTop = rd.pinnedTop;
    } else {
      const maxOffsetX = Math.max(0, vp.width - boxW);
      const maxOffsetY = Math.max(0, vp.height - boxH);
      targetLeft = Math.round(vp.left + rd.relX * maxOffsetX);
      targetTop = Math.round(vp.top + rd.relY * maxOffsetY);
    }

    const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, targetLeft));
    const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, targetTop));

    chartRangeBoxEl.style.left = `${clampedLeft}px`;
    chartRangeBoxEl.style.top = `${clampedTop}px`;
  }

  function playRangeChime() {
    try {
      playWithAudioContext((ctx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14); // G5
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
      });
    } catch (e) {}
  }

  function formatTimeframeForSpeech(tf) {
    const raw = String(tf || '').trim();
    const s = raw.toLowerCase();
    if (!s) return 'current';
    if (s === '1d' || s === 'd') return 'daily';
    if (s === '1w' || s === 'w') return 'weekly';
    if (s === '1mo' || (s === '1m' && raw === '1M')) return 'monthly';
    if (/^\d+$/.test(s)) {
      const num = parseInt(s, 10);
      if (num >= 60 && num % 60 === 0) {
        const h = num / 60;
        return `${h} hour`;
      }
      return `${num} minute`;
    }
    if (s.endsWith('m')) return `${s.slice(0, -1)} minute`;
    if (s.endsWith('h')) return `${s.slice(0, -1)} hour`;
    if (s.endsWith('d')) return `${s.slice(0, -1)} day`;
    if (s.endsWith('w')) return `${s.slice(0, -1)} week`;
    return raw;
  }

  function formatSymbolForSpeech(sym) {
    const s = String(sym || '').trim();
    if (!s) return 'the market';
    return s.replace(/-PERP$/i, ' Perpetual').replace(/PERP$/i, ' Perpetual').trim();
  }

  function getActiveVenueName(payloadVenue) {
    if (payloadVenue && typeof payloadVenue === 'string' && payloadVenue.trim()) {
      return payloadVenue.trim();
    }
    const firm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    if (firm && firm.name) return firm.name;
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
    if (host.includes('vest')) return 'Vest Markets';
    if (host.includes('kalshi')) return 'Kalshi Pro';
    if (host.includes('myfundedperpetuals') || host.includes('myfundedperps') || host.includes('mfp')) return 'MyFundedPerpetuals';
    return 'the exchange';
  }

  function handleRangeDetectedAlert(payload) {
    if (!isTopWindow || !payload) return;
    const rdConfig = normalizeRangeDetectorConfig(settings.rangeDetector);
    if (!rdConfig.enabled) return;
    const alertKey = `${payload.symbol || ''}:${payload.resolution || ''}:${Math.floor(Date.now() / 60000)}`;
    const dedupeKey = `__trading_cortex_rd_alert__:${payload.symbol || ''}:${payload.resolution || ''}`;
    try {
      const recentKeys = JSON.parse(window.localStorage.getItem(dedupeKey) || '[]');
      if (Array.isArray(recentKeys) && recentKeys.includes(alertKey)) return;
      const nextKeys = (Array.isArray(recentKeys) ? recentKeys : []).concat(alertKey).slice(-24);
      window.localStorage.setItem(dedupeKey, JSON.stringify(nextKeys));
    } catch (e) {}

    const spokenInstrument = formatSymbolForSpeech(payload.symbol || currentInstrument);
    const venueName = getActiveVenueName(payload.venue);
    const spokenTf = formatTimeframeForSpeech(payload.resolution || currentResolution);

    if (rdConfig.chimeAlertEnabled !== false) {
      playRangeChime();
    }
    if (rdConfig.voiceAlertEnabled !== false) {
      const phrase = `Range detected on ${spokenInstrument} on ${venueName}, ${spokenTf} timeframe.`;
      speakCortexVoicePhrase(phrase, rdConfig.voiceURI);
    }
    showToast(`Range detected on ${spokenInstrument} on ${venueName} (${spokenTf})`);
  }

  function renderChartRangeBox(animateFromRect = null) {
    if (!isTopWindow) return;

    const rd = normalizeRangeDetectorConfig(settings.rangeDetector);
    settings.rangeDetector = rd;

    if (!rd.enabled) {
      if (chartRangeBoxEl) {
        chartRangeBoxEl.style.display = 'none';
      }
      return;
    }

    if (!chartRangeBoxEl || !chartRangeBoxEl.isConnected) {
      chartRangeBoxEl = document.getElementById('vest-chart-range-box');
      if (!chartRangeBoxEl) {
        chartRangeBoxEl = document.createElement('div');
        chartRangeBoxEl.id = 'vest-chart-range-box';
        document.body.appendChild(chartRangeBoxEl);
      }
    }

    chartRangeBoxEl.style.display = 'block';
    chartRangeBoxEl.style.position = 'fixed';
    chartRangeBoxEl.style.zIndex = '10002';
    chartRangeBoxEl.style.width = rd.collapsed ? 'auto' : `${rd.boxWidth}px`;
    chartRangeBoxEl.style.background = `rgba(11, 15, 25, ${(rd.bgOpacity || 90) / 100})`;
    chartRangeBoxEl.style.backdropFilter = 'blur(12px)';
    chartRangeBoxEl.style.borderRadius = '8px';
    chartRangeBoxEl.style.border = '1px solid rgba(59, 130, 246, 0.55)';
    chartRangeBoxEl.style.boxShadow = rd.glowEffect !== false
      ? '0 0 16px rgba(59, 130, 246, 0.42), 0 0 32px rgba(37, 99, 235, 0.22)'
      : '0 8px 24px rgba(0, 0, 0, 0.6)';
    chartRangeBoxEl.style.overflow = 'hidden';
    chartRangeBoxEl.style.userSelect = 'none';
    chartRangeBoxEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const telem = latestRangeDetectorTelemetry || {};
    const timeframesData = rd.timeframes.map(tf => {
      const match = (telem.timeframes || []).find(t => t.timeframe === tf);
      return match || { timeframe: tf, isRanging: false, trendDirection: 'short', statusText: 'TRENDING SHORT', chop: 50, adx: 20 };
    });

    const overallRangingCount = timeframesData.filter(t => t.isRanging).length;
    const isOverallRanging = overallRangingCount >= Math.ceil(timeframesData.length / 2);

    if (rd.collapsed) {
      chartRangeBoxEl.innerHTML = `
        <div class="vest-crb-min-pill" id="vest-crb-restore-btn" style="
          display: flex; align-items: center; gap: 8px; padding: 6px 12px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff;
          cursor: pointer; border-radius: 8px; font-size: 11.5px; font-weight: 700;
        " title="Click to expand Range Detector">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOverallRanging ? '#10b981' : '#ef4444'}; box-shadow: 0 0 8px ${isOverallRanging ? '#10b981' : '#ef4444'};"></span>
          <span>RANGE DETECTOR (${overallRangingCount}/${timeframesData.length})</span>
          <span style="opacity: 0.8;">↗</span>
        </div>
      `;
    } else {
      let tfRowsHtml = '';
      for (const t of timeframesData) {
        const isR = Boolean(t.isRanging);
        const chopVal = typeof t.chop === 'number' ? Math.round(t.chop) : '--';
        const isLong = t.trendDirection === 'long' || t.statusText === 'TRENDING LONG';

        let badgeBg, badgeBorder, badgeColor, indicatorDot, labelText, arrowIcon;
        if (isR) {
          badgeBg = 'rgba(16, 185, 129, 0.16)';
          badgeBorder = 'rgba(16, 185, 129, 0.42)';
          badgeColor = '#34d399';
          indicatorDot = '#10b981';
          arrowIcon = '●';
          labelText = 'RANGING';
        } else if (isLong) {
          badgeBg = 'rgba(16, 185, 129, 0.14)';
          badgeBorder = 'rgba(16, 185, 129, 0.35)';
          badgeColor = '#34d399';
          indicatorDot = '#10b981';
          arrowIcon = '▲';
          labelText = 'TRENDING LONG';
        } else {
          badgeBg = 'rgba(239, 68, 68, 0.16)';
          badgeBorder = 'rgba(239, 68, 68, 0.42)';
          badgeColor = '#f87171';
          indicatorDot = '#ef4444';
          arrowIcon = '▼';
          labelText = 'TRENDING SHORT';
        }

        tfRowsHtml += `
          <div class="vest-crb-tf-row" data-timeframe="${escapeHtml(t.timeframe)}" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 5px 9px; background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px;
            cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
          " title="Click to switch chart to ${escapeHtml(t.timeframe)} timeframe">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="vest-crb-tf-chip" style="
                display: inline-flex; align-items: center; justify-content: center;
                min-width: 32px; padding: 2px 6px; border-radius: 4px;
                background: rgba(59, 130, 246, 0.20); border: 1px solid rgba(59, 130, 246, 0.38);
                color: #bfdbfe; font-size: 11px; font-weight: 700; font-family: monospace;
              ">${escapeHtml(t.timeframe)}</span>
              <div style="display: inline-flex; align-items: center; gap: 5px; padding: 2px 6px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 4px;">
                <span style="font-size: 8px; line-height: 1; color: ${indicatorDot};">${arrowIcon}</span>
                <span style="font-size: 9.5px; font-weight: 700; color: ${badgeColor}; letter-spacing: 0.3px;">${labelText}</span>
              </div>
            </div>
            <span style="font-size: 9.5px; color: #94a3b8; font-family: monospace;">CHOP ${chopVal}%</span>
          </div>
        `;
      }

      chartRangeBoxEl.innerHTML = `
        <!-- Blue Title Bar with White Text -->
        <div id="vest-crb-title-bar" style="
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff; cursor: move; border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width: 15px; height: 15px; color: #ffffff;">
              <rect x="3" y="6" width="18" height="12" rx="2"></rect>
              <line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"></line>
              <polyline points="7 10 9 8 11 10"></polyline>
              <polyline points="13 14 15 16 17 14"></polyline>
            </svg>
            <span style="font-weight: 700; font-size: 12px; letter-spacing: 0.4px; text-transform: uppercase;">Range Detector</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <button type="button" class="vest-crb-icon-btn ${rd.pinned ? 'is-pinned' : ''}" id="vest-crb-pin-btn" style="background: ${rd.pinned ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.15)'}; border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;" title="${rd.pinned ? 'Sticky / Pinned to screen (click to unpin)' : 'Make Sticky / Pin window to exact screen position'}">
              <svg viewBox="0 0 24 24" fill="${rd.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button type="button" id="vest-crb-btn-collapse" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; line-height: 1;" title="Minimize Window">_</button>
            <button type="button" id="vest-crb-btn-settings" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1;" title="Range Detector Settings">⚙</button>
            <button type="button" id="vest-crb-btn-close" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1;" title="Close Range Detector">✕</button>
          </div>
        </div>

        <!-- Box Body: Multi-Timeframe Status -->
        <div style="padding: 10px 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.07);">
            <span style="font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px;">MULTI-TIMEFRAME</span>
            <span style="font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${isOverallRanging ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}; color: ${isOverallRanging ? '#34d399' : '#f87171'}; border: 1px solid ${isOverallRanging ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'};">
              ${isOverallRanging ? 'MARKET RANGING' : 'MARKET TRENDING'}
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            ${tfRowsHtml}
          </div>
        </div>
      `;
    }

    wireChartRangeBoxEvents();
    clampAndPositionChartRangeBox();
  }

  function wireChartRangeBoxEvents() {
    if (!chartRangeBoxEl) return;

    const restoreBtn = chartRangeBoxEl.querySelector('#vest-crb-restore-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.rangeDetector) settings.rangeDetector = JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR));
        settings.rangeDetector.collapsed = false;
        queueSettingsSave({ rangeDetector: settings.rangeDetector });
        renderChartRangeBox();
      });
      return;
    }

    const pinBtn = chartRangeBoxEl.querySelector('#vest-crb-pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.rangeDetector) settings.rangeDetector = JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR));
        const nextPinned = !settings.rangeDetector.pinned;
        settings.rangeDetector.pinned = nextPinned;
        if (nextPinned && chartRangeBoxEl) {
          const rect = chartRangeBoxEl.getBoundingClientRect();
          settings.rangeDetector.pinnedLeft = Math.round(rect.left);
          settings.rangeDetector.pinnedTop = Math.round(rect.top);
        }
        queueSettingsSave({ rangeDetector: settings.rangeDetector });
        renderChartRangeBox();
        showToast(nextPinned ? 'Range Detector pinned (sticky)' : 'Range Detector unpinned');
      });
    }

    const collapseBtn = chartRangeBoxEl.querySelector('#vest-crb-btn-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.rangeDetector) settings.rangeDetector = JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR));
        settings.rangeDetector.collapsed = true;
        queueSettingsSave({ rangeDetector: settings.rangeDetector });
        renderChartRangeBox();
      });
    }

    const settingsBtn = chartRangeBoxEl.querySelector('#vest-crb-btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openStudioSettingsModal('chartingindicators', 'rangedetector');
      });
    }

    const closeBtn = chartRangeBoxEl.querySelector('#vest-crb-btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.rangeDetector) settings.rangeDetector = JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR));
        settings.rangeDetector.enabled = false;
        queueSettingsSave({ rangeDetector: settings.rangeDetector });
        renderChartRangeBox();
        notifyMainWorldConfig();
        showToast('Range Detector disabled');
      });
    }

    chartRangeBoxEl.querySelectorAll('.vest-crb-tf-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(255, 255, 255, 0.08)';
        row.style.borderColor = 'rgba(59, 130, 246, 0.45)';
        row.style.transform = 'translateX(2px)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'rgba(255, 255, 255, 0.03)';
        row.style.borderColor = 'rgba(255, 255, 255, 0.06)';
        row.style.transform = 'none';
      });
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const tf = row.getAttribute('data-timeframe');
        if (!tf) return;
        postToMainWorlds({
          type: 'VEST_TV_CHANGE_RESOLUTION',
          payload: { resolution: tf }
        });
        showToast(`Switching chart timeframe to ${tf}...`);
      });
    });

    const dragHandle = chartRangeBoxEl.querySelector('#vest-crb-title-bar');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, input, label')) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = chartRangeBoxEl.getBoundingClientRect();
        activeRangeBoxDrag = {
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top
        };
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
          if (!activeRangeBoxDrag || !chartRangeBoxEl) return;
          const vp = getScreenBoundsRect();
          const boxW = chartRangeBoxEl.offsetWidth || 290;
          const boxH = chartRangeBoxEl.offsetHeight || 220;

          const rawLeft = ev.clientX - activeRangeBoxDrag.offsetX;
          const rawTop = ev.clientY - activeRangeBoxDrag.offsetY;

          const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, rawLeft));
          const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, rawTop));

          chartRangeBoxEl.style.left = `${Math.round(clampedLeft)}px`;
          chartRangeBoxEl.style.top = `${Math.round(clampedTop)}px`;

          const maxOffsetX = Math.max(1, vp.width - boxW);
          const maxOffsetY = Math.max(1, vp.height - boxH);
          const relX = Math.max(0, Math.min(1, (clampedLeft - vp.left) / maxOffsetX));
          const relY = Math.max(0, Math.min(1, (clampedTop - vp.top) / maxOffsetY));

          if (!settings.rangeDetector) settings.rangeDetector = JSON.parse(JSON.stringify(DEFAULT_RANGE_DETECTOR));
          settings.rangeDetector.relX = Math.round(relX * 10000) / 10000;
          settings.rangeDetector.relY = Math.round(relY * 10000) / 10000;
          if (settings.rangeDetector.pinned) {
            settings.rangeDetector.pinnedLeft = Math.round(clampedLeft);
            settings.rangeDetector.pinnedTop = Math.round(clampedTop);
          }
        };

        const onUp = () => {
          activeRangeBoxDrag = null;
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          queueSettingsSave({ rangeDetector: settings.rangeDetector });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    }
  }

  // -------------------------------------------------------------
  // Floating On-Chart Order Block Performance Stats Box Component
  // -------------------------------------------------------------
  let chartOrderBlockStatsBoxEl = null;
  let activeObStatsBoxDrag = null;
  let latestOrderBlocksTelemetry = null;

  function clampAndPositionChartOrderBlockStatsBox() {
    if (!chartOrderBlockStatsBoxEl || chartOrderBlockStatsBoxEl.style.display === 'none' || activeObStatsBoxDrag) return;
    const ob = normalizeOrderBlocksConfig(settings.orderBlocks);
    const vp = getScreenBoundsRect();

    if (ob.statsBoxCollapsed) {
      const minPos = getMinimizedCortexBarCoords('order_blocks_stats', chartOrderBlockStatsBoxEl);
      chartOrderBlockStatsBoxEl.style.left = `${minPos.left}px`;
      chartOrderBlockStatsBoxEl.style.top = `${minPos.top}px`;
      return;
    }

    const boxW = chartOrderBlockStatsBoxEl.offsetWidth || ob.statsBoxWidth || 290;
    const boxH = chartOrderBlockStatsBoxEl.offsetHeight || 260;

    let targetLeft;
    let targetTop;
    if (ob.statsBoxPinned && ob.statsBoxPinnedLeft !== null && ob.statsBoxPinnedTop !== null) {
      targetLeft = ob.statsBoxPinnedLeft;
      targetTop = ob.statsBoxPinnedTop;
    } else {
      const maxOffsetX = Math.max(0, vp.width - boxW);
      const maxOffsetY = Math.max(0, vp.height - boxH);
      const relX = typeof ob.statsBoxRelX === 'number' ? ob.statsBoxRelX : 0.04;
      const relY = typeof ob.statsBoxRelY === 'number' ? ob.statsBoxRelY : 0.54;
      targetLeft = Math.round(vp.left + relX * maxOffsetX);
      targetTop = Math.round(vp.top + relY * maxOffsetY);
    }

    const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, targetLeft));
    const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, targetTop));

    chartOrderBlockStatsBoxEl.style.left = `${clampedLeft}px`;
    chartOrderBlockStatsBoxEl.style.top = `${clampedTop}px`;
  }

  function renderChartOrderBlockStatsBox(animateFromRect = null) {
    if (!isTopWindow) return;

    const ob = normalizeOrderBlocksConfig(settings.orderBlocks);
    settings.orderBlocks = ob;

    if (!ob.enabled || ob.showStatsBox === false) {
      if (chartOrderBlockStatsBoxEl) {
        chartOrderBlockStatsBoxEl.style.display = 'none';
      }
      return;
    }

    if (!chartOrderBlockStatsBoxEl || !chartOrderBlockStatsBoxEl.isConnected) {
      chartOrderBlockStatsBoxEl = document.getElementById('vest-chart-ob-stats-box');
      if (!chartOrderBlockStatsBoxEl) {
        chartOrderBlockStatsBoxEl = document.createElement('div');
        chartOrderBlockStatsBoxEl.id = 'vest-chart-ob-stats-box';
        document.body.appendChild(chartOrderBlockStatsBoxEl);
      }
    }

    chartOrderBlockStatsBoxEl.style.display = 'block';
    chartOrderBlockStatsBoxEl.style.position = 'fixed';
    chartOrderBlockStatsBoxEl.style.zIndex = '10002';
    chartOrderBlockStatsBoxEl.style.width = ob.statsBoxCollapsed ? 'auto' : `${ob.statsBoxWidth || 290}px`;
    chartOrderBlockStatsBoxEl.style.background = 'rgba(11, 15, 25, 0.92)';
    chartOrderBlockStatsBoxEl.style.backdropFilter = 'blur(12px)';
    chartOrderBlockStatsBoxEl.style.borderRadius = '8px';
    chartOrderBlockStatsBoxEl.style.border = '1px solid rgba(16, 185, 129, 0.55)';
    chartOrderBlockStatsBoxEl.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.38), 0 0 32px rgba(5, 150, 105, 0.18)';
    chartOrderBlockStatsBoxEl.style.overflow = 'hidden';
    chartOrderBlockStatsBoxEl.style.userSelect = 'none';
    chartOrderBlockStatsBoxEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const telem = latestOrderBlocksTelemetry || {};
    const stats = telem.stats || {
      totalBlocks: 0,
      mitigatedCount: 0,
      wins: 0,
      losses: 0,
      pending: 0,
      closedTrades: 0,
      winRate: 0,
      netR: 0,
      profitFactor: 0,
      expectancy: '+0.00R',
      rrRatio: ob.statsRrRatio || 3.0,
      long: { total: 0, wins: 0, losses: 0, pending: 0, winRate: 0 },
      short: { total: 0, wins: 0, losses: 0, pending: 0, winRate: 0 }
    };

    const targetRr = stats.rrRatio || ob.statsRrRatio || 3.0;
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const pending = stats.pending || 0;
    const closed = stats.closedTrades || 0;
    const winRate = stats.winRate || 0;
    const netR = typeof stats.netR === 'number' ? stats.netR : 0;
    const pf = typeof stats.profitFactor === 'number' ? stats.profitFactor : 0;
    const expectancy = stats.expectancy || '+0.00R';

    const totalTracked = wins + losses + pending;
    const winPct = totalTracked > 0 ? (wins / totalTracked) * 100 : 0;
    const lossPct = totalTracked > 0 ? (losses / totalTracked) * 100 : 0;
    const pendingPct = totalTracked > 0 ? (pending / totalTracked) * 100 : 0;

    const rateColor = closed > 0 ? (winRate >= 50 ? '#34d399' : (winRate >= 33.3 ? '#fbbf24' : '#f87171')) : '#94a3b8';
    const netRColor = netR > 0 ? '#34d399' : (netR < 0 ? '#f87171' : '#94a3b8');

    if (ob.statsBoxCollapsed) {
      chartOrderBlockStatsBoxEl.innerHTML = `
        <div class="vest-cosb-min-pill" id="vest-cosb-restore-btn" style="
          display: flex; align-items: center; gap: 8px; padding: 6px 12px;
          background: linear-gradient(135deg, #059669, #047857); color: #ffffff;
          cursor: pointer; border-radius: 8px; font-size: 11.5px; font-weight: 700;
        " title="Click to expand Order Block Performance Stats">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${rateColor}; box-shadow: 0 0 8px ${rateColor};"></span>
          <span>OB STATS: ${closed > 0 ? `${winRate}% WIN` : `${wins}W / ${losses}L`} (1:${targetRr} RR)</span>
          <span style="opacity: 0.8;">↗</span>
        </div>
      `;
    } else {
      chartOrderBlockStatsBoxEl.innerHTML = `
        <!-- Emerald Title Bar with White Text -->
        <div id="vest-cosb-title-bar" style="
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px; background: linear-gradient(135deg, #059669, #047857);
          color: #ffffff; cursor: move; border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width: 15px; height: 15px; color: #ffffff;">
              <path d="M3 3v18h18"></path>
              <path d="M18 17V9"></path>
              <path d="M13 17V5"></path>
              <path d="M8 17v-3"></path>
            </svg>
            <span style="font-weight: 700; font-size: 12px; letter-spacing: 0.4px; text-transform: uppercase;">OB Stats (1:${targetRr} RR)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <button type="button" class="vest-cosb-icon-btn ${ob.statsBoxPinned ? 'is-pinned' : ''}" id="vest-cosb-pin-btn" style="background: ${ob.statsBoxPinned ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.15)'}; border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;" title="${ob.statsBoxPinned ? 'Sticky / Pinned to screen (click to unpin)' : 'Make Sticky / Pin window to exact screen position'}">
              <svg viewBox="0 0 24 24" fill="${ob.statsBoxPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button type="button" id="vest-cosb-btn-collapse" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; line-height: 1;" title="Minimize Window">_</button>
            <button type="button" id="vest-cosb-btn-settings" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1;" title="Order Block Settings">⚙</button>
            <button type="button" id="vest-cosb-btn-close" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1;" title="Close Stats Screen">✕</button>
          </div>
        </div>

        <!-- Box Body: Performance Metrics -->
        <div style="padding: 10px 12px;">
          <!-- Hero Banner: Win Rate & Net R -->
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px;">
            <div>
              <div style="font-size: 20px; font-weight: 800; color: ${rateColor}; line-height: 1.1;">
                ${closed > 0 ? `${winRate}%` : '--%'}
              </div>
              <div style="font-size: 9.5px; font-weight: 600; color: #94a3b8; letter-spacing: 0.4px; text-transform: uppercase;">
                Win Rate (${wins}W - ${losses}L)
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: 800; color: ${netRColor}; font-family: monospace;">
                ${netR >= 0 ? '+' : ''}${netR.toFixed(1)}R
              </div>
              <div style="font-size: 9.5px; font-weight: 600; color: #94a3b8; letter-spacing: 0.4px; text-transform: uppercase;">
                Net Return
              </div>
            </div>
          </div>

          <!-- Segmented Win/Loss/Pending Bar -->
          <div style="display: flex; height: 5px; border-radius: 3px; overflow: hidden; background: rgba(255, 255, 255, 0.08); margin: 6px 0 10px;">
            <div style="width: ${winPct}%; background: #10b981; transition: width 0.3s ease;" title="Wins: ${wins}"></div>
            <div style="width: ${lossPct}%; background: #ef4444; transition: width 0.3s ease;" title="Losses: ${losses}"></div>
            <div style="width: ${pendingPct}%; background: #64748b; transition: width 0.3s ease;" title="Pending: ${pending}"></div>
          </div>

          <!-- Key Metrics Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 6px 8px;">
              <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Profit Factor</div>
              <div style="font-size: 12.5px; font-weight: 700; color: #f8fafc; font-family: monospace;">${pf > 0 ? pf.toFixed(2) : '--'}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 6px 8px;">
              <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Expectancy</div>
              <div style="font-size: 12.5px; font-weight: 700; color: #f8fafc; font-family: monospace;">${expectancy}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 6px 8px;">
              <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Closed Trades</div>
              <div style="font-size: 12.5px; font-weight: 700; color: #38bdf8; font-family: monospace;">${closed} <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">(${pending} in play)</span></div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 6px 8px;">
              <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Risk : Reward</div>
              <div style="font-size: 12.5px; font-weight: 700; color: #a78bfa; font-family: monospace;">1 : ${targetRr}</div>
            </div>
          </div>

          <!-- Long vs Short Breakdown -->
          <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.22); border-radius: 5px; font-size: 10px;">
              <span style="font-weight: 700; color: #34d399;">▲ LONG OBs</span>
              <span style="font-family: monospace; color: #e2e8f0;">${stats.long ? (stats.long.wins || 0) : 0}W - ${stats.long ? (stats.long.losses || 0) : 0}L <span style="color: #94a3b8;">(${stats.long ? (stats.long.winRate || 0) : 0}%)</span></span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.22); border-radius: 5px; font-size: 10px;">
              <span style="font-weight: 700; color: #f87171;">▼ SHORT OBs</span>
              <span style="font-family: monospace; color: #e2e8f0;">${stats.short ? (stats.short.wins || 0) : 0}W - ${stats.short ? (stats.short.losses || 0) : 0}L <span style="color: #94a3b8;">(${stats.short ? (stats.short.winRate || 0) : 0}%)</span></span>
            </div>
          </div>

          <!-- Footer / Context -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.07); font-size: 9.5px; color: #64748b;">
            <span>${escapeHtml(telem.symbol || currentInstrument || 'CHART')} • ${escapeHtml(telem.resolution || currentResolution || '1h')}</span>
            <span>${stats.mitigatedCount || 0} / ${stats.totalBlocks || 0} Mitigated</span>
          </div>
        </div>
      `;
    }

    wireChartOrderBlockStatsBoxEvents();
    clampAndPositionChartOrderBlockStatsBox();
  }

  function wireChartOrderBlockStatsBoxEvents() {
    if (!chartOrderBlockStatsBoxEl) return;

    const restoreBtn = chartOrderBlockStatsBoxEl.querySelector('#vest-cosb-restore-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.orderBlocks) settings.orderBlocks = JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS));
        settings.orderBlocks.statsBoxCollapsed = false;
        markWindowAsRestored('order_blocks_stats');
        queueSettingsSave({ orderBlocks: settings.orderBlocks });
        renderChartOrderBlockStatsBox();
      });
      return;
    }

    const pinBtn = chartOrderBlockStatsBoxEl.querySelector('#vest-cosb-pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.orderBlocks) settings.orderBlocks = JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS));
        const nextPinned = !settings.orderBlocks.statsBoxPinned;
        settings.orderBlocks.statsBoxPinned = nextPinned;
        if (nextPinned && chartOrderBlockStatsBoxEl) {
          const rect = chartOrderBlockStatsBoxEl.getBoundingClientRect();
          settings.orderBlocks.statsBoxPinnedLeft = Math.round(rect.left);
          settings.orderBlocks.statsBoxPinnedTop = Math.round(rect.top);
        }
        queueSettingsSave({ orderBlocks: settings.orderBlocks });
        renderChartOrderBlockStatsBox();
        showToast(nextPinned ? 'Order Block Stats Box pinned (sticky)' : 'Order Block Stats Box unpinned');
      });
    }

    const collapseBtn = chartOrderBlockStatsBoxEl.querySelector('#vest-cosb-btn-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.orderBlocks) settings.orderBlocks = JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS));
        settings.orderBlocks.statsBoxCollapsed = true;
        markWindowAsMinimized('order_blocks_stats');
        queueSettingsSave({ orderBlocks: settings.orderBlocks });
        renderChartOrderBlockStatsBox();
      });
    }

    const settingsBtn = chartOrderBlockStatsBoxEl.querySelector('#vest-cosb-btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openStudioSettingsModal('chartingindicators', 'orderblocks');
      });
    }

    const closeBtn = chartOrderBlockStatsBoxEl.querySelector('#vest-cosb-btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!settings.orderBlocks) settings.orderBlocks = JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS));
        settings.orderBlocks.showStatsBox = false;
        queueSettingsSave({ orderBlocks: settings.orderBlocks });
        renderChartOrderBlockStatsBox();
        notifyMainWorldConfig();
        showToast('Order Block Stats Screen hidden (re-enable in settings)');
      });
    }

    const dragHandle = chartOrderBlockStatsBoxEl.querySelector('#vest-cosb-title-bar');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, input, label')) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = chartOrderBlockStatsBoxEl.getBoundingClientRect();
        activeObStatsBoxDrag = {
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top
        };
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
          if (!activeObStatsBoxDrag || !chartOrderBlockStatsBoxEl) return;
          const vp = getScreenBoundsRect();
          const boxW = chartOrderBlockStatsBoxEl.offsetWidth || 290;
          const boxH = chartOrderBlockStatsBoxEl.offsetHeight || 260;

          const rawLeft = ev.clientX - activeObStatsBoxDrag.offsetX;
          const rawTop = ev.clientY - activeObStatsBoxDrag.offsetY;

          const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, rawLeft));
          const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, rawTop));

          chartOrderBlockStatsBoxEl.style.left = `${Math.round(clampedLeft)}px`;
          chartOrderBlockStatsBoxEl.style.top = `${Math.round(clampedTop)}px`;

          const maxOffsetX = Math.max(1, vp.width - boxW);
          const maxOffsetY = Math.max(1, vp.height - boxH);
          const relX = Math.max(0, Math.min(1, (clampedLeft - vp.left) / maxOffsetX));
          const relY = Math.max(0, Math.min(1, (clampedTop - vp.top) / maxOffsetY));

          if (!settings.orderBlocks) settings.orderBlocks = JSON.parse(JSON.stringify(DEFAULT_ORDER_BLOCKS));
          settings.orderBlocks.statsBoxRelX = Math.round(relX * 10000) / 10000;
          settings.orderBlocks.statsBoxRelY = Math.round(relY * 10000) / 10000;
          if (settings.orderBlocks.statsBoxPinned) {
            settings.orderBlocks.statsBoxPinnedLeft = Math.round(clampedLeft);
            settings.orderBlocks.statsBoxPinnedTop = Math.round(clampedTop);
          }
        };

        const onUp = () => {
          activeObStatsBoxDrag = null;
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          queueSettingsSave({ orderBlocks: settings.orderBlocks });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    }
  }

  // -------------------------------------------------------------
  // On-Chart Accounts & Per-Trade Risk Box (Top-Left Chart Overlay)
  // -------------------------------------------------------------
  let chartAccountsRiskBoxEl = null;
  let activeAccountsRiskBoxDrag = null;
  let accountsRiskPollTimer = null;
  let accountSnapshotsRegistry = {};
  let lastAccountSnapshotDigest = '';
  const ACCOUNT_SNAPSHOTS_LS_KEY = '__trading_cortex_account_snapshots__';

  function parseDollarAmount(rawText) {
    if (rawText === null || rawText === undefined) return null;
    const str = String(rawText).trim();
    if (!str) return null;
    const isParenNeg = /^\(\s*\$/.test(str) && /\)$/.test(str);
    const match = str.match(/([-+])?\s*\$\s*([\d,]+(?:\.\d+)?)/);
    if (!match) return null;
    const sign = (match[1] === '-' || isParenNeg) ? -1 : 1;
    const num = Number(match[2].replace(/,/g, ''));
    return Number.isFinite(num) ? sign * num : null;
  }

  function formatSignedDollar(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '--';
    const absStr = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val > 0.0001) return `+$${absStr}`;
    if (val < -0.0001) return `-$${absStr}`;
    return `$0.00`;
  }

  function formatPlainDollar(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '--';
    const absStr = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val < -0.0001 ? `-$${absStr}` : `$${absStr}`;
  }

  function normalizeCanonicalAccountName(rawName) {
    let s = String(rawName || '').split(/\r?\n/)[0].replace(/[↕▼⌄▾]/g, '').trim();
    if (!s) return null;

    // Clean Vest concatenated DOM badge+name+tier patterns like "76Account 76Instant", "71Account 71Evaluati"
    const vestConcat = s.match(/^(?:\d+\s*)?account\s*#?\s*(\d+)(?:\s*(instant|evaluat\w*|funded|live|demo|standard|pro))?/i);
    if (vestConcat) {
      return `Account ${vestConcat[1]}`;
    }

    // Pure numeric account number like "71", "73", "76" -> "Account 71"
    if (/^\d{1,6}$/.test(s)) {
      return `Account ${s}`;
    }

    // Reject UUIDs (full or truncated like "6e6f946a-5a6e-4246-a...") and raw hex hashes / wallet addresses
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s) || /^(?:0x)?[0-9a-f]{12,}$/i.test(s)) {
      return null;
    }

    // Reject UI buttons, tabs, currencies, market tickers, and 1-2 char abbreviations like "PA"
    const INVALID_ACCOUNT_RE = /^(active\s+positions|open\s+orders|trade\s+history|order\s+history|positions?\s+history|funding\s+history|add\s+funded.*|add\s+account.*|create\s+account.*|new\s+account.*|get\s+funded.*|manage\s+accounts?.*|switch\s+account.*|connect.*|disconnect.*|logout|log\s+out|sign\s+out|deposit|withdraw|settings|portfolio|markets|trade|usdc|usdt|usd|btc|eth|sol|hype|nq|es|cl|gc|eur|gbp|jpy|pa|na|n\/a|null|undefined|none|total|all|summary|default|active|open|closed|pending|long|short|buy|sell|market|limit)$/i;
    if (INVALID_ACCOUNT_RE.test(s) || /-PERP$|-USD$|-USDT$|-USDC$/i.test(s)) {
      return null;
    }
    if (s.length < 3 || s.length > 48) return null;
    return s;
  }

  function sanitizeAccountSnapshotsRegistry() {
    const cleaned = {};
    let mutated = false;
    for (const rawKey of Object.keys(accountSnapshotsRegistry || {})) {
      const entry = accountSnapshotsRegistry[rawKey];
      if (!entry || typeof entry !== 'object') {
        mutated = true;
        continue;
      }
      const canonicalName = normalizeCanonicalAccountName(entry.name || entry.id);
      if (!canonicalName) {
        mutated = true;
        continue;
      }
      const firmId = entry.firmId || 'vest';
      const canonicalKey = `${firmId}::${canonicalName}`;
      if (canonicalKey !== rawKey || entry.name !== canonicalName) {
        mutated = true;
      }
      const prev = cleaned[canonicalKey];
      if (!prev) {
        cleaned[canonicalKey] = {
          ...entry,
          key: canonicalKey,
          id: canonicalName,
          name: canonicalName,
          firmId
        };
      } else {
        mutated = true;
        const prevPrio = Number(prev.balancePriority) || (prev.source === 'live_dom' ? 3 : 1);
        const curPrio = Number(entry.balancePriority) || (entry.source === 'live_dom' ? 3 : 1);
        const takeCurBal = typeof entry.balance === 'number' && Number.isFinite(entry.balance) && (
          prev.balance === null || prev.balance === undefined ||
          curPrio > prevPrio ||
          (curPrio === prevPrio && (Number(entry.updatedAt) || 0) >= (Number(prev.updatedAt) || 0) && Math.abs(entry.balance) >= Math.abs(prev.balance || 0))
        );
        const prevPosCount = prev.positionsBySymbol ? Object.keys(prev.positionsBySymbol).length : 0;
        const curPosCount = entry.positionsBySymbol ? Object.keys(entry.positionsBySymbol).length : 0;
        cleaned[canonicalKey] = {
          ...prev,
          balance: takeCurBal ? entry.balance : prev.balance,
          balancePriority: takeCurBal ? curPrio : prevPrio,
          totalOpenPnl: (entry.totalOpenPnl !== null && entry.totalOpenPnl !== undefined && curPrio >= prevPrio) ? entry.totalOpenPnl : prev.totalOpenPnl,
          positionsBySymbol: curPosCount > 0 ? { ...(prev.positionsBySymbol || {}), ...(entry.positionsBySymbol || {}) } : (prev.positionsBySymbol || {}),
          updatedAt: Math.max(Number(prev.updatedAt) || 0, Number(entry.updatedAt) || 0)
        };
      }
    }
    if (mutated) {
      accountSnapshotsRegistry = cleaned;
    }
    return mutated;
  }

  function loadAccountSnapshotsFromLocalStorage() {
    try {
      const raw = window.localStorage.getItem(ACCOUNT_SNAPSHOTS_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          accountSnapshotsRegistry = { ...parsed, ...accountSnapshotsRegistry };
        }
      }
      if (sanitizeAccountSnapshotsRegistry()) {
        try { window.localStorage.setItem(ACCOUNT_SNAPSHOTS_LS_KEY, JSON.stringify(accountSnapshotsRegistry)); } catch (e) {}
      }
    } catch (e) {}
  }

  function persistAndBroadcastAccountSnapshots() {
    try {
      window.localStorage.setItem(ACCOUNT_SNAPSHOTS_LS_KEY, JSON.stringify(accountSnapshotsRegistry));
    } catch (e) {}
    try {
      if (isExtensionValid() && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ cortexAccountSnapshots: accountSnapshotsRegistry });
      }
    } catch (e) {}
    try {
      if (!cortexCrossTabChannel) initCrossTabSyncChannel();
      if (cortexCrossTabChannel) {
        cortexCrossTabChannel.postMessage({
          type: 'CORTEX_ACCOUNT_SNAPSHOT_UPDATE',
          senderId: tabInstanceId,
          payload: { snapshots: accountSnapshotsRegistry, timestamp: Date.now() }
        });
      }
    } catch (e) {}
  }

  function handleIncomingAccountSnapshots(incoming) {
    if (!incoming || typeof incoming !== 'object') return;
    let changed = false;
    for (const rawKey of Object.keys(incoming)) {
      const inc = incoming[rawKey];
      if (!inc || typeof inc !== 'object') continue;
      const canonicalName = normalizeCanonicalAccountName(inc.name || inc.id);
      if (!canonicalName) continue;
      const firmId = inc.firmId || 'vest';
      const key = `${firmId}::${canonicalName}`;
      const normalizedInc = { ...inc, key, id: canonicalName, name: canonicalName, firmId };
      const cur = accountSnapshotsRegistry[key];
      if (!cur || (Number(normalizedInc.updatedAt) || 0) >= (Number(cur.updatedAt) || 0)) {
        accountSnapshotsRegistry[key] = normalizedInc;
        changed = true;
      }
    }
    if (sanitizeAccountSnapshotsRegistry()) changed = true;
    if (changed && settings.accountsRiskBox && settings.accountsRiskBox.enabled) {
      pushAccountsRiskDataToChartCanvas();
    }
  }

  function clearCachedAccountSnapshots() {
    accountSnapshotsRegistry = {};
    lastAccountSnapshotDigest = '';
    persistAndBroadcastAccountSnapshots();
    scrapeAndSyncCurrentAccountSnapshot(true);
    renderChartAccountsRiskBox();
  }

  function removeAccountSnapshotByKey(accKey) {
    if (!accKey || !accountSnapshotsRegistry[accKey]) return;
    delete accountSnapshotsRegistry[accKey];
    lastAccountSnapshotDigest = '';
    persistAndBroadcastAccountSnapshots();
    renderChartAccountsRiskBox();
  }

  function getMergedAccountSnapshotsList() {
    sanitizeAccountSnapshotsRegistry();
    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const activeFirmId = activeFirm ? activeFirm.id : 'vest';
    const currentAcc = typeof readCurrentSelectedAccount === 'function' ? readCurrentSelectedAccount() : null;
    const cleanCurrentName = currentAcc && currentAcc.name ? normalizeCanonicalAccountName(currentAcc.name) : null;

    const list = Object.values(accountSnapshotsRegistry)
      .filter(a => a && typeof a === 'object' && a.name && (!a.firmId || a.firmId === activeFirmId));

    // Sort: currently active account first, then alphabetically/numerically by name
    list.sort((a, b) => {
      const aActive = cleanCurrentName && a.name === cleanCurrentName ? 1 : 0;
      const bActive = cleanCurrentName && b.name === cleanCurrentName ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
    return list;
  }

  function scrapeAccountHealthMetricsFromDom() {
    let balance = null;
    let totalOpenPnl = null;
    let inPositionsUsd = null;

    try {
      // 1. Scan Account Health panel (Vest bottom-right panel)
      const candidates = Array.from(document.querySelectorAll('div, section, aside')).filter(el => {
        if (el.children.length > 20) return false;
        const txt = (el.innerText || '').trim();
        return txt.length > 15 && txt.length < 450 && /account\s+value/i.test(txt);
      });
      // Prefer the tightest container containing both "Account Health" and "Account Value"
      candidates.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
      const healthEl = candidates.find(el => /account\s+health/i.test(el.innerText || '')) || candidates[0] || null;
      if (healthEl) {
        const text = healthEl.innerText || '';
        const valMatch = text.match(/account\s+value[\s:]*([-+]?\s*\$[\d,]+(?:\.\d+)?)/i);
        if (valMatch) balance = parseDollarAmount(valMatch[1]);
        const pnlMatch = text.match(/unrealized\s+p(?:&|n)?l[\s:]*([-+]?\s*\$[\d,]+(?:\.\d+)?)/i);
        if (pnlMatch) totalOpenPnl = parseDollarAmount(pnlMatch[1]);
      }

      // 2. Fallback / supplement from top summary bar ("Unr. PnL: -$0.20", "In Positions: $177.59")
      const bodyTextSlice = Array.from(document.querySelectorAll('header, nav, div')).filter(el => {
        if (el.children.length > 14) return false;
        const txt = (el.innerText || '').trim();
        return txt.length > 10 && txt.length < 300 && (/unr\.?\s*pnl/i.test(txt) || /in\s+positions/i.test(txt));
      });
      bodyTextSlice.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
      for (const el of bodyTextSlice) {
        const txt = el.innerText || '';
        if (totalOpenPnl === null) {
          const m = txt.match(/unr\.?\s*pnl[\s:]*([-+]?\s*\$[\d,]+(?:\.\d+)?)/i);
          if (m) totalOpenPnl = parseDollarAmount(m[1]);
        }
        if (inPositionsUsd === null) {
          const mPos = txt.match(/in\s+positions[\s:]*([-+]?\s*\$[\d,]+(?:\.\d+)?)/i);
          if (mPos) inPositionsUsd = parseDollarAmount(mPos[1]);
        }
        if (totalOpenPnl !== null && inPositionsUsd !== null) break;
      }
    } catch (e) {}

    return { balance, totalOpenPnl, inPositionsUsd };
  }

  function scrapeActivePositionsMapFromDom(inPositionsUsd = null) {
    const positionsBySymbol = {};
    let reliable = false;

    try {
      // Fast reliable flat signal from header strip ("In Positions: $0.00")
      if (typeof inPositionsUsd === 'number' && Math.abs(inPositionsUsd) < 0.005) {
        return { reliable: true, positionsBySymbol: {} };
      }

      const bottomInfo = typeof findBottomPositionsPanel === 'function' ? findBottomPositionsPanel() : null;
      const panel = bottomInfo?.panel || document.querySelector('[data-vest-bottom-panel="true"]');
      if (!panel) return { reliable: false, positionsBySymbol };

      // Check Active Positions tab badge count e.g. "Active Positions (0)" or "Active Positions (2)"
      const tabs = Array.from(panel.querySelectorAll('[role="tab"], button'));
      const activePosTab = tabs.find(t => /^active\s+positions(?:\s*\(\s*\d+\s*\))?$/i.test((t.innerText || '').replace(/\s+/g, ' ').trim()));
      if (activePosTab) {
        const tabText = (activePosTab.innerText || '').replace(/\s+/g, ' ').trim();
        const countMatch = tabText.match(/\(\s*(\d+)\s*\)/);
        if (countMatch && Number(countMatch[1]) === 0) {
          return { reliable: true, positionsBySymbol: {} };
        }
      }

      // Check if Active Positions view is currently visible
      const panelText = (panel.innerText || '').toLowerCase();
      if (/no\s+active\s+positions/i.test(panelText)) {
        return { reliable: true, positionsBySymbol: {} };
      }

      const tables = Array.from(panel.querySelectorAll('table, [role="table"]'));
      for (const table of tables) {
        const rect = table.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        let headers = Array.from(table.querySelectorAll('thead th, thead [role="columnheader"]'))
          .map(c => (c.innerText || c.textContent || '').trim().toLowerCase());
        if (!headers.length) {
          headers = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td, [role="row"]:first-child [role="columnheader"]'))
            .map(c => (c.innerText || c.textContent || '').trim().toLowerCase());
        }
        const headerLine = headers.join(' | ');
        // Ensure this is strictly the Active Positions table (not History or Open Orders)
        const isActivePosTable = (headerLine.includes('open price') || headerLine.includes('mid price') || headerLine.includes('fail price')) &&
          headerLine.includes('pnl') &&
          !headerLine.includes('closed') &&
          !headerLine.includes('exit price') &&
          !headerLine.includes('trigger price');
        if (!isActivePosTable) continue;

        reliable = true;
        const pnlColIdx = headers.findIndex(h => /^pnl\b|\bpnl\b/.test(h) && !h.includes('realized'));
        const valColIdx = headers.findIndex(h => h.includes('value') || h.includes('size'));
        const rows = Array.from(table.querySelectorAll('tbody tr, [role="row"]'));

        for (const row of rows) {
          if (row.querySelector('th, [role="columnheader"]')) continue;
          const rowText = (row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim();
          if (!rowText || !/\b(long|short)\b/i.test(rowText)) continue;

          const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
          const marketCellText = (cells[0]?.innerText || cells[0]?.textContent || rowText).trim();
          const symToken = marketCellText.split(/\s+/)[0] || '';
          const normSym = typeof normalizeInstrumentKey === 'function'
            ? normalizeInstrumentKey(symToken)
            : symToken.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (!normSym) continue;

          const side = /\bshort\b/i.test(rowText) ? 'short' : 'long';
          let pnlVal = null;
          let pnlPct = '';
          if (pnlColIdx >= 0 && cells[pnlColIdx]) {
            const pnlCellText = (cells[pnlColIdx].innerText || cells[pnlColIdx].textContent || '').trim();
            pnlVal = parseDollarAmount(pnlCellText);
            const pctM = pnlCellText.match(/([-+]?\d+(?:\.\d+)?%)/);
            if (pctM) pnlPct = pctM[1];
          }
          let valUsd = null;
          if (valColIdx >= 0 && cells[valColIdx]) {
            valUsd = parseDollarAmount(cells[valColIdx].innerText || '');
          }

          positionsBySymbol[normSym] = {
            symbol: normSym,
            side,
            pnl: pnlVal,
            pnlPct,
            value: valUsd
          };
        }
        break;
      }
    } catch (e) {}

    return { reliable, positionsBySymbol };
  }

  function scrapeOpenAccountDropdownIntoRegistry() {
    try {
      const items = document.querySelectorAll(
        '[data-testid^="account-item-"], [role="menuitem"], [class*="account-item"], [class*="DropdownMenuItem"]'
      );
      if (!items.length) return false;
      const DANGEROUS_ACTIONS = /disconnect|logout|log out|sign out|exit|leave|unlink|switch wallet|revoke|remove|deposit|withdraw|settings|create|new account|get funded|add funded|add account|active positions|open orders/i;
      const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
      const firmId = activeFirm ? activeFirm.id : 'vest';
      let discoveredAny = false;

      for (const item of items) {
        const rect = item.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const rawText = (item.innerText || '').trim();
        if (!rawText || DANGEROUS_ACTIONS.test(rawText)) continue;
        const firstLine = rawText.split(/\r?\n/)[0].replace(/[↕▼⌄▾]/g, '').trim();
        const isAccountTestId = Boolean(item.getAttribute('data-testid')?.startsWith('account-item-'));
        if (!isAccountTestId && !/account\s*\d+|evaluation|funded|subaccount/i.test(firstLine)) continue;

        const canonicalName = normalizeCanonicalAccountName(firstLine);
        if (!canonicalName) continue;

        const key = `${firmId}::${canonicalName}`;
        const maybeBal = parseDollarAmount(rawText);
        if (!accountSnapshotsRegistry[key]) {
          accountSnapshotsRegistry[key] = {
            key,
            id: canonicalName,
            name: canonicalName,
            firmId,
            balance: maybeBal,
            balancePriority: maybeBal !== null ? 1 : 0,
            totalOpenPnl: null,
            inPositionsUsd: null,
            positionsBySymbol: {},
            updatedAt: Date.now(),
            sourceTabId: tabInstanceId
          };
          discoveredAny = true;
        } else if (maybeBal !== null && accountSnapshotsRegistry[key].balance === null) {
          accountSnapshotsRegistry[key].balance = maybeBal;
          accountSnapshotsRegistry[key].balancePriority = 1;
          discoveredAny = true;
        }
      }
      if (discoveredAny) {
        persistAndBroadcastAccountSnapshots();
      }
      return discoveredAny;
    } catch (e) {
      return false;
    }
  }

  function scrapeAndSyncCurrentAccountSnapshot(forceRender = false) {
    if (!isTopWindow || !isExtensionValid()) return;
    scrapeOpenAccountDropdownIntoRegistry();

    const currentAcc = typeof readCurrentSelectedAccount === 'function' ? readCurrentSelectedAccount() : null;
    const canonicalName = currentAcc && currentAcc.name ? normalizeCanonicalAccountName(currentAcc.name) : null;
    if (!canonicalName) return;

    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const firmId = activeFirm ? activeFirm.id : 'vest';
    const key = `${firmId}::${canonicalName}`;

    const health = scrapeAccountHealthMetricsFromDom();
    const posRes = scrapeActivePositionsMapFromDom(health.inPositionsUsd);

    const existing = accountSnapshotsRegistry[key] || {
      key,
      id: canonicalName,
      name: canonicalName,
      firmId,
      balance: null,
      balancePriority: 0,
      totalOpenPnl: null,
      inPositionsUsd: null,
      positionsBySymbol: {},
      updatedAt: 0
    };

    const nextSnap = {
      ...existing,
      key,
      id: canonicalName,
      name: canonicalName,
      firmId,
      balance: health.balance !== null ? health.balance : existing.balance,
      balancePriority: health.balance !== null ? 3 : (existing.balancePriority || 0),
      source: 'live_dom',
      totalOpenPnl: health.totalOpenPnl !== null ? health.totalOpenPnl : existing.totalOpenPnl,
      inPositionsUsd: health.inPositionsUsd !== null ? health.inPositionsUsd : existing.inPositionsUsd,
      positionsBySymbol: posRes.reliable ? posRes.positionsBySymbol : (existing.positionsBySymbol || {}),
      updatedAt: Date.now(),
      sourceTabId: tabInstanceId
    };

    accountSnapshotsRegistry[key] = nextSnap;

    const digest = JSON.stringify({
      k: key,
      b: nextSnap.balance,
      p: nextSnap.totalOpenPnl,
      ip: nextSnap.inPositionsUsd,
      pos: nextSnap.positionsBySymbol,
      inst: currentInstrument || ''
    });

    if (digest !== lastAccountSnapshotDigest || forceRender) {
      lastAccountSnapshotDigest = digest;
      persistAndBroadcastAccountSnapshots();
      if (settings.accountsRiskBox && settings.accountsRiskBox.enabled) {
        renderChartAccountsRiskBox();
      }
    }
  }

  function mergeCapturedFirmAccounts(capturedList) {
    if (!Array.isArray(capturedList) || capturedList.length === 0) return;
    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const firmId = activeFirm ? activeFirm.id : 'vest';
    let changed = false;

    for (const raw of capturedList) {
      if (!raw || typeof raw !== 'object') continue;
      const canonicalName = normalizeCanonicalAccountName(raw.name || raw.id);
      if (!canonicalName) continue;
      const key = `${firmId}::${canonicalName}`;
      const existing = accountSnapshotsRegistry[key] || {
        key,
        id: canonicalName,
        name: canonicalName,
        firmId,
        balance: null,
        balancePriority: 0,
        totalOpenPnl: null,
        inPositionsUsd: null,
        positionsBySymbol: {},
        updatedAt: 0
      };

      const incomingBal = (typeof raw.balance === 'number' && Number.isFinite(raw.balance)) ? raw.balance : null;
      const incomingPrio = Number(raw.balancePriority) || (incomingBal !== null ? 1 : 0);
      const existingPrio = Number(existing.balancePriority) || (existing.source === 'live_dom' ? 3 : 0);
      const existingIsFreshLiveDom = existing.source === 'live_dom' && (Date.now() - (Number(existing.updatedAt) || 0)) < 20000;

      // Never overwrite fresh live DOM Account Value with lower-priority/dust API fields
      const takeIncomingBal = incomingBal !== null && (
        existing.balance === null ||
        (!existingIsFreshLiveDom && (incomingPrio > existingPrio || (incomingPrio === existingPrio && Math.abs(incomingBal) >= Math.abs(existing.balance))))
      );

      const incomingPnl = (typeof raw.totalOpenPnl === 'number' && Number.isFinite(raw.totalOpenPnl)) ? raw.totalOpenPnl : null;
      const incomingPos = (raw.positionsBySymbol && typeof raw.positionsBySymbol === 'object') ? raw.positionsBySymbol : null;
      const hasIncomingPos = incomingPos && Object.keys(incomingPos).length > 0;

      // Preserve live DOM-scraped active-tab positions if incoming API object didn't include positions
      const mergedPos = hasIncomingPos
        ? { ...(existing.positionsBySymbol || {}), ...incomingPos }
        : (existing.positionsBySymbol || {});

      const nextSnap = {
        ...existing,
        key,
        id: canonicalName,
        name: canonicalName,
        firmId,
        balance: takeIncomingBal ? incomingBal : existing.balance,
        balancePriority: takeIncomingBal ? incomingPrio : existingPrio,
        totalOpenPnl: (!existingIsFreshLiveDom && incomingPnl !== null) ? incomingPnl : existing.totalOpenPnl,
        positionsBySymbol: mergedPos,
        updatedAt: Date.now(),
        sourceTabId: tabInstanceId
      };

      const prevDigest = JSON.stringify({ b: existing.balance, p: existing.totalOpenPnl, pos: existing.positionsBySymbol });
      const nextDigest = JSON.stringify({ b: nextSnap.balance, p: nextSnap.totalOpenPnl, pos: nextSnap.positionsBySymbol });
      if (!accountSnapshotsRegistry[key] || prevDigest !== nextDigest) {
        accountSnapshotsRegistry[key] = nextSnap;
        changed = true;
      }
    }

    if (changed) {
      persistAndBroadcastAccountSnapshots();
      pushAccountsRiskDataToChartCanvas();
    }
  }

  function pushAccountsRiskDataToChartCanvas() {
    if (!isTopWindow) return;
    const arb = normalizeAccountsRiskBoxConfig(settings.accountsRiskBox);
    settings.accountsRiskBox = arb;
    const activeFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const currentAcc = typeof readCurrentSelectedAccount === 'function' ? readCurrentSelectedAccount() : null;
    const activeAccName = currentAcc && currentAcc.name ? (normalizeCanonicalAccountName(currentAcc.name) || '') : '';

    postToMainWorlds({
      type: 'VEST_TV_ACCOUNTS_RISK_DATA',
      payload: {
        accounts: getMergedAccountSnapshotsList(),
        activeAccountName: activeAccName,
        firmName: activeFirm ? (activeFirm.shortName || activeFirm.name || 'Accounts') : 'Accounts',
        currentInstrument: currentInstrument || '',
        config: arb,
        timestamp: Date.now()
      }
    });
  }

  function renderChartAccountsRiskBox() {
    if (!isTopWindow) return;

    // Remove any legacy draggable floating box DOM node — this is rendered directly on the TradingView chart canvas
    const legacyEl = chartAccountsRiskBoxEl || document.getElementById('vest-chart-accounts-risk-box');
    if (legacyEl && legacyEl.isConnected) {
      legacyEl.remove();
    }
    chartAccountsRiskBoxEl = null;

    const arb = normalizeAccountsRiskBoxConfig(settings.accountsRiskBox);
    settings.accountsRiskBox = arb;

    if (!arb.enabled) {
      if (accountsRiskPollTimer) {
        clearInterval(accountsRiskPollTimer);
        accountsRiskPollTimer = null;
      }
      pushAccountsRiskDataToChartCanvas();
      return;
    }

    if (!accountsRiskPollTimer) {
      loadAccountSnapshotsFromLocalStorage();
      scrapeAndSyncCurrentAccountSnapshot(false);
      postToMainWorlds({ type: 'VEST_SCAN_ACCOUNTS_NOW' });
      accountsRiskPollTimer = setInterval(() => {
        if (!isExtensionValid()) {
          clearInterval(accountsRiskPollTimer);
          accountsRiskPollTimer = null;
          return;
        }
        if (settings.accountsRiskBox && settings.accountsRiskBox.enabled) {
          scrapeAndSyncCurrentAccountSnapshot(false);
        }
      }, 1500);
    }

    pushAccountsRiskDataToChartCanvas();
  }

  function renderChartDiagnosticsBox(animateFromRect = null) {
    if (!isTopWindow) return;

    const db = normalizeDiagnosticsBoxConfig(settings.diagnosticsBox);
    settings.diagnosticsBox = db;

    if (!db.enabled) {
      if (chartDiagnosticsBoxEl) {
        chartDiagnosticsBoxEl.style.display = 'none';
      }
      if (diagnosticsBoxPollTimer) {
        clearInterval(diagnosticsBoxPollTimer);
        diagnosticsBoxPollTimer = null;
      }
      return;
    }

    if (!chartDiagnosticsBoxEl || !chartDiagnosticsBoxEl.isConnected) {
      chartDiagnosticsBoxEl = document.getElementById('vest-chart-diagnostics-box');
      if (!chartDiagnosticsBoxEl) {
        chartDiagnosticsBoxEl = document.createElement('div');
        chartDiagnosticsBoxEl.id = 'vest-chart-diagnostics-box';
        document.body.appendChild(chartDiagnosticsBoxEl);
      }
    }

    // Start periodic telemetry poll if not already running
    if (!diagnosticsBoxPollTimer) {
      postToMainWorlds({ type: 'VEST_TV_REQUEST_DIAGNOSTICS' });
      diagnosticsBoxPollTimer = setInterval(() => {
        if (!isExtensionValid()) {
          clearInterval(diagnosticsBoxPollTimer);
          diagnosticsBoxPollTimer = null;
          return;
        }
        if (settings.diagnosticsBox && settings.diagnosticsBox.enabled) {
          postToMainWorlds({ type: 'VEST_TV_REQUEST_DIAGNOSTICS' });
        }
      }, 1200);
    }

    chartDiagnosticsBoxEl.style.display = 'block';
    chartDiagnosticsBoxEl.classList.toggle('is-pinned', Boolean(db.pinned && !db.collapsed));
    chartDiagnosticsBoxEl.classList.toggle('is-minimized-pill', Boolean(db.collapsed));
    chartDiagnosticsBoxEl.style.width = db.collapsed ? 'auto' : `${db.boxWidth}px`;
    chartDiagnosticsBoxEl.style.background = hexToRgba(db.bgColor || '#0f172a', (Number(db.bgOpacity ?? 94)) / 100);
    chartDiagnosticsBoxEl.style.borderColor = hexToRgba(db.borderColor || '#38bdf8', db.pinned ? 0.75 : 0.45);
    if (currentBrowserTabId === null) {
      resolveCurrentTabInfo();
    }

    const isDebug = Boolean(settings.debugMode);
    const telem = latestDiagnosticsTelemetry || {};
    const isHooked = telem.isHooked !== undefined ? telem.isHooked : Boolean(currentInstrument);
    const apiLabel = isHooked ? 'Hooked (Active)' : 'Searching...';
    const symLabel = telem.instrument || currentInstrument || 'Unknown';
    const prcLabel = telem.price ? `${telem.price}` : (currentPrice ? `${currentPrice}` : '--');
    const canvasRes = (telem.canvasWidth && telem.canvasHeight) ? `${telem.canvasWidth}×${telem.canvasHeight} @ ${telem.dpr || 1}x` : 'Detecting...';
    const visibleBars = telem.visibleBars ? `${telem.visibleBars} bars` : 'Scanning...';
    const renderLatency = (telem.lastRenderMs !== undefined && telem.lastRenderMs !== null) ? `${Number(telem.lastRenderMs).toFixed(1)} ms` : '-- ms';
    const candleWidthStr = telem.candleWidth || (settings.candleOhlc?.customCandleWidthEnabled ? `${settings.candleOhlc.candleWidthPx}%` : 'Auto');
    const activeKz = telem.activeKillzone || 'None';
    const fvgCounts = (telem.bullFvgs !== undefined && telem.bearFvgs !== undefined) ? `${telem.bullFvgs} Bull / ${telem.bearFvgs} Bear` : (settings.autoFvg?.enabled ? 'Active' : 'Inactive');

    if (db.collapsed) {
      chartDiagnosticsBoxEl.innerHTML = `
        <div class="vest-cdb-min-pill-bar" id="vest-cdb-restore-bar" title="Click to restore Diagnostics Window">
          <div class="vest-cdb-title-group">
            <span class="vest-cdb-title-dot ${isHooked ? '' : 'searching'}"></span>
            <span class="vest-cdb-title">Cortex Diag</span>
            ${currentBrowserTabId !== null ? `
              <span class="vest-cdb-tab-pill" style="font-size:8px; padding:1px 4px;" title="Current Tab ID: ${currentBrowserTabId}">#${currentBrowserTabId}</span>
            ` : ''}
            <span class="vest-cdb-mode-badge ${isDebug ? 'debug-on' : 'debug-off'}">
              ${isDebug ? 'DEBUG: ON' : 'DEBUG: OFF'}
            </span>
          </div>
          <span class="vest-cnb-restore-hint" title="Restore Window" style="color:#7dd3fc; display:flex; align-items:center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px;">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </span>
        </div>
      `;
    } else {
      chartDiagnosticsBoxEl.innerHTML = `
        <div class="vest-cdb-header" id="vest-cdb-drag-handle" title="${db.pinned ? 'Window is pinned to screen position (click pin to unlock)' : 'Drag to move anywhere on screen'}">
          <div class="vest-cdb-title-group">
            <span class="vest-cdb-title-dot ${isHooked ? '' : 'searching'}"></span>
            <span class="vest-cdb-title">Trading Cortex Diagnostics</span>
            <span class="vest-cdb-tab-pill" id="vest-cdb-tab-header-pill" title="Current Browser Tab ID: ${currentBrowserTabId !== null ? currentBrowserTabId : 'Resolving...'}">
              ${currentBrowserTabId !== null ? `TAB #${currentBrowserTabId}` : 'TAB ...'}
            </span>
            <span class="vest-cdb-mode-badge ${isDebug ? 'debug-on' : 'debug-off'}" id="vest-cdb-badge-indicator">
              ${isDebug ? 'DEBUG ON' : 'DEBUG OFF'}
            </span>
          </div>
          <div class="vest-cdb-actions">
            <label class="vest-cdb-toggle-label" title="Toggle Debug Mode (echoes all operations to console)">
              <span>Debug</span>
              <label class="vest-cdb-switch">
                <input type="checkbox" id="vest-cdb-debug-toggle" ${isDebug ? 'checked' : ''} />
                <span class="vest-cdb-slider"></span>
              </label>
            </label>
            <button type="button" class="vest-cdb-icon-btn" id="vest-cdb-settings-btn" title="Customize Diagnostics Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button type="button" class="vest-cdb-icon-btn ${db.pinned ? 'is-pinned' : ''}" id="vest-cdb-pin-btn" title="${db.pinned ? 'Pinned to screen position (click to unpin)' : 'Pin window in place'}">
              <svg viewBox="0 0 24 24" fill="${db.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button type="button" class="vest-cdb-icon-btn" id="vest-cdb-collapse-btn" title="Minimize to Cortex bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" style="width:13px; height:13px;">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="vest-cdb-body">
          <div class="vest-cdb-sec-title">
            <span>Chart Engine &amp; Canvas</span>
            <span style="font-size:8.5px; color:#64748b; font-weight:500;">LIVE METRICS</span>
          </div>
          <div class="vest-cdb-grid">
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">Tab ID</span>
              <span class="vest-cdb-tile-val cyan" id="vest-cdb-val-tab">${currentBrowserTabId !== null ? `Tab #${currentBrowserTabId}` : 'Resolving...'}</span>
            </div>
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">Window / Frame</span>
              <span class="vest-cdb-tile-val" id="vest-cdb-val-frame">${currentBrowserWindowId !== null ? `Win #${currentBrowserWindowId}` : (isTopWindow ? 'Top Frame' : 'Iframe')}</span>
            </div>
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">API Hook</span>
              <span class="vest-cdb-tile-val ${isHooked ? 'ok' : 'warn'}" id="vest-cdb-val-hook">${escapeHtml(apiLabel)}</span>
            </div>
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">Instrument</span>
              <span class="vest-cdb-tile-val cyan" id="vest-cdb-val-inst">${escapeHtml(symLabel)}</span>
            </div>
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">Market Price</span>
              <span class="vest-cdb-tile-val" id="vest-cdb-val-price">${escapeHtml(prcLabel)}</span>
            </div>
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">Canvas Res</span>
              <span class="vest-cdb-tile-val" id="vest-cdb-val-canvas">${escapeHtml(canvasRes)}</span>
            </div>
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">Visible Bars</span>
              <span class="vest-cdb-tile-val" id="vest-cdb-val-bars">${escapeHtml(visibleBars)}</span>
            </div>
            <div class="vest-cdb-tile">
              <span class="vest-cdb-tile-label">Render Latency</span>
              <span class="vest-cdb-tile-val ok" id="vest-cdb-val-latency">${escapeHtml(renderLatency)}</span>
            </div>
          </div>

          <div class="vest-cdb-sec-title" style="margin-top:4px;">
            <span>Modules &amp; Status</span>
            <span style="font-size:8.5px; color:#64748b; font-weight:500;">ACTIVE HOOKS</span>
          </div>
          <div class="vest-cdb-module-list">
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Candle Numbers</span>
              <span class="vest-cdb-mod-status ${(settings.candleOhlc?.enabled || settings.candleOhlc?.showCandleNumbers) ? 'active' : 'inactive'}" id="vest-cdb-mod-candlenum">
                ${(settings.candleOhlc?.enabled || settings.candleOhlc?.showCandleNumbers) ? 'Active (#1–#' + (settings.candleOhlc?.candleNumbersMax || 100) + ')' : 'Inactive'}
              </span>
            </div>
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Candle Width</span>
              <span class="vest-cdb-mod-status ${settings.candleOhlc?.customCandleWidthEnabled ? 'active' : 'info'}" id="vest-cdb-mod-width">
                ${escapeHtml(candleWidthStr)}
              </span>
            </div>
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Chart View Memory</span>
              <span class="vest-cdb-mod-status active" id="vest-cdb-mod-viewmem">
                ${telem.lastKnownConfig ? `Ready (${telem.lastKnownConfig.barSpacing ? Number(telem.lastKnownConfig.barSpacing).toFixed(1) + 'px zoom' : 'Auto'})` : 'Ready'}
              </span>
            </div>
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Position HUD Overlay</span>
              <span class="vest-cdb-mod-status ${settings.positionHud?.enabled !== false ? 'active' : 'inactive'}" id="vest-cdb-mod-hud">
                ${settings.positionHud?.enabled !== false ? 'Active (Line + Flatten)' : 'Inactive'}
              </span>
            </div>
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Sessions &amp; Killzones</span>
              <span class="vest-cdb-mod-status ${settings.sessionIndicators?.enabled ? 'active' : 'inactive'}" id="vest-cdb-mod-sessions">
                ${settings.sessionIndicators?.enabled ? `Active (${escapeHtml(activeKz)})` : 'Inactive'}
              </span>
            </div>
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Auto FVG Engine</span>
              <span class="vest-cdb-mod-status ${settings.autoFvg?.enabled ? 'active' : 'inactive'}" id="vest-cdb-mod-fvg">
                ${escapeHtml(fvgCounts)}
              </span>
            </div>
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Economic News Box</span>
              <span class="vest-cdb-mod-status ${settings.newsBox?.enabled ? 'active' : 'inactive'}" id="vest-cdb-mod-news">
                ${settings.newsBox?.enabled ? `Active (${liveEconomicNewsEvents.length} events)` : 'Inactive'}
              </span>
            </div>
            <div class="vest-cdb-module-row">
              <span class="vest-cdb-mod-name">Instrument Trades Box</span>
              <span class="vest-cdb-mod-status ${settings.tradesBox?.enabled ? 'active' : 'inactive'}" id="vest-cdb-mod-trades">
                ${settings.tradesBox?.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div class="vest-cdb-actions-row">
            <button type="button" class="vest-cdb-act-btn btn-reset" id="vest-cdb-act-reset-view" title="Reset Chart View to Last Known Configuration">
              🔄 Reset View
            </button>
            <button type="button" class="vest-cdb-act-btn" id="vest-cdb-act-toggle-debug" title="Toggle Debug Mode">
              ⚡ Debug: ${isDebug ? 'ON' : 'OFF'}
            </button>
            <button type="button" class="vest-cdb-act-btn" id="vest-cdb-act-copy" title="Copy Diagnostic JSON to Clipboard">
              📋 Copy Info
            </button>
            <button type="button" class="vest-cdb-act-btn" id="vest-cdb-act-clear" title="Clear Developer Console">
              🧹 Clear
            </button>
            <button type="button" class="vest-cdb-act-btn btn-warn" id="vest-cdb-act-echo" title="Send a Test Echo log to Console">
              🔊 Echo
            </button>
          </div>
        </div>
      `;
    }

    wireChartDiagnosticsBoxEvents();
    clampAndPositionChartDiagnosticsBox();

    if (animateFromRect) {
      animateChartBoxMinimizeOrRestore(chartDiagnosticsBoxEl, animateFromRect, Boolean(db.collapsed));
    }
    repositionAllMinimizedBoxes();
  }

  function updateChartDiagnosticsBoxTelemetryOnly() {
    if (!chartDiagnosticsBoxEl || chartDiagnosticsBoxEl.style.display === 'none') return;
    const db = settings.diagnosticsBox || {};
    if (db.collapsed) return;

    const telem = latestDiagnosticsTelemetry || {};
    const isHooked = telem.isHooked !== undefined ? telem.isHooked : Boolean(currentInstrument);
    const symLabel = telem.instrument || currentInstrument || 'Unknown';
    const prcLabel = telem.price ? `${telem.price}` : (currentPrice ? `${currentPrice}` : '--');
    const canvasRes = (telem.canvasWidth && telem.canvasHeight) ? `${telem.canvasWidth}×${telem.canvasHeight} @ ${telem.dpr || 1}x` : 'Detecting...';
    const visibleBars = telem.visibleBars ? `${telem.visibleBars} bars` : 'Scanning...';
    const renderLatency = (telem.lastRenderMs !== undefined && telem.lastRenderMs !== null) ? `${Number(telem.lastRenderMs).toFixed(1)} ms` : '-- ms';
    const candleWidthStr = telem.candleWidth || (settings.candleOhlc?.customCandleWidthEnabled ? `${settings.candleOhlc.candleWidthPx}%` : 'Auto');
    const activeKz = telem.activeKillzone || 'None';
    const fvgCounts = (telem.bullFvgs !== undefined && telem.bearFvgs !== undefined) ? `${telem.bullFvgs} Bull / ${telem.bearFvgs} Bear` : (settings.autoFvg?.enabled ? 'Active' : 'Inactive');

    const setTxt = (id, txt) => {
      const el = chartDiagnosticsBoxEl.querySelector(id);
      if (el && el.textContent !== txt) el.textContent = txt;
    };

    if (currentBrowserTabId === null) {
      resolveCurrentTabInfo();
    }
    const tabTxt = currentBrowserTabId !== null ? `Tab #${currentBrowserTabId}` : 'Resolving...';
    setTxt('#vest-cdb-val-tab', tabTxt);
    const frameTxt = currentBrowserWindowId !== null ? `Win #${currentBrowserWindowId}` : (isTopWindow ? 'Top Frame' : 'Iframe');
    setTxt('#vest-cdb-val-frame', frameTxt);
    const headerPill = chartDiagnosticsBoxEl.querySelector('#vest-cdb-tab-header-pill');
    if (headerPill && currentBrowserTabId !== null) {
      headerPill.textContent = `TAB #${currentBrowserTabId}`;
      headerPill.title = `Current Browser Tab ID: ${currentBrowserTabId}`;
    }

    setTxt('#vest-cdb-val-hook', isHooked ? 'Hooked (Active)' : 'Searching...');
    setTxt('#vest-cdb-val-inst', symLabel);
    setTxt('#vest-cdb-val-price', prcLabel);
    setTxt('#vest-cdb-val-canvas', canvasRes);
    setTxt('#vest-cdb-val-bars', visibleBars);
    setTxt('#vest-cdb-val-latency', renderLatency);
    setTxt('#vest-cdb-mod-width', candleWidthStr);
    if (telem.lastKnownConfig) {
      const zoomStr = telem.lastKnownConfig.barSpacing ? `${Number(telem.lastKnownConfig.barSpacing).toFixed(1)}px zoom` : 'Auto';
      setTxt('#vest-cdb-mod-viewmem', `Ready (${zoomStr})`);
    }
    setTxt('#vest-cdb-mod-fvg', fvgCounts);
    if (settings.sessionIndicators?.enabled) {
      setTxt('#vest-cdb-mod-sessions', `Active (${activeKz})`);
    }
  }

  function wireChartDiagnosticsBoxEvents() {
    if (!chartDiagnosticsBoxEl) return;

    const restoreBar = chartDiagnosticsBoxEl.querySelector('#vest-cdb-restore-bar');
    if (restoreBar) {
      restoreBar.addEventListener('click', (e) => {
        e.stopPropagation();
        const prevRect = chartDiagnosticsBoxEl.getBoundingClientRect();
        if (!settings.diagnosticsBox) settings.diagnosticsBox = JSON.parse(JSON.stringify(DEFAULT_DIAGNOSTICS_BOX));
        settings.diagnosticsBox.collapsed = false;
        markWindowAsRestored('diagnostics');
        queueSettingsSave({ diagnosticsBox: settings.diagnosticsBox });
        renderChartDiagnosticsBox(prevRect);
        cortexDebugLog('Diagnostics window restored from Cortex bar');
      });
      return;
    }

    const dragHandle = chartDiagnosticsBoxEl.querySelector('#vest-cdb-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, input, label')) return;
        if (settings.diagnosticsBox && settings.diagnosticsBox.pinned) {
          showToast('Diagnostics window is pinned — click pin icon to move');
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const rect = chartDiagnosticsBoxEl.getBoundingClientRect();
        activeDiagnosticsBoxDrag = {
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top
        };
        chartDiagnosticsBoxEl.classList.add('dragging');
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
          if (!activeDiagnosticsBoxDrag || !chartDiagnosticsBoxEl) return;
          const vp = getScreenBoundsRect();
          const boxW = chartDiagnosticsBoxEl.offsetWidth || 360;
          const boxH = chartDiagnosticsBoxEl.offsetHeight || 320;

          const rawLeft = ev.clientX - activeDiagnosticsBoxDrag.offsetX;
          const rawTop = ev.clientY - activeDiagnosticsBoxDrag.offsetY;

          const clampedLeft = Math.max(vp.left, Math.min(vp.right - boxW, rawLeft));
          const clampedTop = Math.max(vp.top, Math.min(vp.bottom - boxH, rawTop));

          chartDiagnosticsBoxEl.style.left = `${Math.round(clampedLeft)}px`;
          chartDiagnosticsBoxEl.style.top = `${Math.round(clampedTop)}px`;

          const maxOffsetX = Math.max(1, vp.width - boxW);
          const maxOffsetY = Math.max(1, vp.height - boxH);
          const relX = Math.max(0, Math.min(1, (clampedLeft - vp.left) / maxOffsetX));
          const relY = Math.max(0, Math.min(1, (clampedTop - vp.top) / maxOffsetY));

          if (!settings.diagnosticsBox) settings.diagnosticsBox = JSON.parse(JSON.stringify(DEFAULT_DIAGNOSTICS_BOX));
          settings.diagnosticsBox.relX = Math.round(relX * 10000) / 10000;
          settings.diagnosticsBox.relY = Math.round(relY * 10000) / 10000;
          settings.diagnosticsBox.pinnedLeft = Math.round(clampedLeft);
          settings.diagnosticsBox.pinnedTop = Math.round(clampedTop);
        };

        const onUp = () => {
          if (!activeDiagnosticsBoxDrag) return;
          activeDiagnosticsBoxDrag = null;
          if (chartDiagnosticsBoxEl) chartDiagnosticsBoxEl.classList.remove('dragging');
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMove, true);
          window.removeEventListener('mouseup', onUp, true);
          queueSettingsSave({ diagnosticsBox: settings.diagnosticsBox });
          cortexDebugLog('Diagnostics window repositioned', {
            relX: settings.diagnosticsBox.relX,
            relY: settings.diagnosticsBox.relY
          });
        };

        window.addEventListener('mousemove', onMove, true);
        window.addEventListener('mouseup', onUp, true);
      });
    }

    // Header Debug Toggle
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-debug-toggle')?.addEventListener('change', (e) => {
      e.stopPropagation();
      setCortexDebugMode(e.target.checked, 'Diagnostics Header Switch');
    });

    // Settings Button
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-settings-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openStudioSettingsModal('diagnostics');
    });

    // Pin Button
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-pin-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!settings.diagnosticsBox) settings.diagnosticsBox = JSON.parse(JSON.stringify(DEFAULT_DIAGNOSTICS_BOX));
      const nextPinned = !settings.diagnosticsBox.pinned;
      settings.diagnosticsBox.pinned = nextPinned;
      if (nextPinned && chartDiagnosticsBoxEl) {
        const rect = chartDiagnosticsBoxEl.getBoundingClientRect();
        const vp = getScreenBoundsRect();
        const boxW = chartDiagnosticsBoxEl.offsetWidth || 360;
        const boxH = chartDiagnosticsBoxEl.offsetHeight || 320;
        settings.diagnosticsBox.pinnedLeft = Math.round(rect.left);
        settings.diagnosticsBox.pinnedTop = Math.round(rect.top);
        settings.diagnosticsBox.relX = Math.round(Math.max(0, Math.min(1, (rect.left - vp.left) / Math.max(1, vp.width - boxW))) * 10000) / 10000;
        settings.diagnosticsBox.relY = Math.round(Math.max(0, Math.min(1, (rect.top - vp.top) / Math.max(1, vp.height - boxH))) * 10000) / 10000;
      }
      queueSettingsSave({ diagnosticsBox: settings.diagnosticsBox });
      renderChartDiagnosticsBox();
      showToast(nextPinned ? 'Diagnostics window pinned in place' : 'Diagnostics window unpinned');
      cortexDebugLog(`Diagnostics window ${nextPinned ? 'pinned' : 'unpinned'}`);
    });

    // Collapse (Minimize) Button
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-collapse-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const prevRect = chartDiagnosticsBoxEl.getBoundingClientRect();
      if (!settings.diagnosticsBox) settings.diagnosticsBox = JSON.parse(JSON.stringify(DEFAULT_DIAGNOSTICS_BOX));
      const vp = getScreenBoundsRect();
      const boxW = prevRect.width || settings.diagnosticsBox.boxWidth || 360;
      const boxH = prevRect.height || 320;
      settings.diagnosticsBox.relX = Math.round(Math.max(0, Math.min(1, (prevRect.left - vp.left) / Math.max(1, vp.width - boxW))) * 10000) / 10000;
      settings.diagnosticsBox.relY = Math.round(Math.max(0, Math.min(1, (prevRect.top - vp.top) / Math.max(1, vp.height - boxH))) * 10000) / 10000;
      if (settings.diagnosticsBox.pinned) {
        settings.diagnosticsBox.pinnedLeft = Math.round(prevRect.left);
        settings.diagnosticsBox.pinnedTop = Math.round(prevRect.top);
      }
      settings.diagnosticsBox.collapsed = true;
      markWindowAsMinimized('diagnostics');
      queueSettingsSave({ diagnosticsBox: settings.diagnosticsBox });
      renderChartDiagnosticsBox(prevRect);
      cortexDebugLog('Diagnostics window minimized to Cortex top bar');
    });

    // Quick Action: Reset Chart View
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-act-reset-view')?.addEventListener('click', (e) => {
      e.stopPropagation();
      postToMainWorlds({ type: 'VEST_TV_RESET_CHART_VIEW' });
      showToast('Resetting chart view to last known configuration...');
      cortexDebugLog('Reset View button clicked in Diagnostics Box');
    });

    // Quick Action: Toggle Debug
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-act-toggle-debug')?.addEventListener('click', (e) => {
      e.stopPropagation();
      setCortexDebugMode(!settings.debugMode, 'Diagnostics Quick Button');
    });

    // Quick Action: Copy Info
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-act-copy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyDiagnosticsStateToClipboard();
    });

    // Quick Action: Clear Console
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-act-clear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      console.clear();
      showToast('Browser console cleared');
      cortexDebugLog('Console cleared by user action');
    });

    // Quick Action: Test Echo
    chartDiagnosticsBoxEl.querySelector('#vest-cdb-act-echo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      cortexDebugLog('Diagnostics Test Echo: Chart engine operational', {
        timestamp: new Date().toISOString(),
        currentInstrument: currentInstrument || 'Unknown',
        currentPrice: currentPrice || '--',
        debugMode: settings.debugMode
      });
      showToast(settings.debugMode ? 'Echoed test to console [CORTEX DEBUG MODE]' : 'Debug Mode is OFF — enable it to see console logs');
    });
  }

  let chartMaximized = false;
  function toggleMaximizeChart() {
    chartMaximized = !chartMaximized;

    PANEL_DEFINITIONS.forEach(def => {
      const panel = findPanelElement(def);
      if (panel) {
        setPanelCollapsed(panel, def.key, chartMaximized);
      }
    });

    showToast(chartMaximized ? 'Chart maximized (panels collapsed)' : 'Panels restored');
  }

  function resetAllPanels() {
    settings.panelLayout = {};
    safeStorageSet({ settings });

    PANEL_DEFINITIONS.forEach(def => {
      const panel = findPanelElement(def);
      if (panel) {
        panel.classList.remove('vest-panel-collapsed', 'vest-panel-floating', 'vest-panel-hidden');
        panel.style.top = '';
        panel.style.left = '';
        panel.style.width = '';
        panel.style.height = '';
        panel.style.position = '';
        panel.style.zIndex = '';
        panel.style.display = '';

        const headerBar = panel.querySelector('.vest-panel-header-bar');
        if (headerBar) {
          const colBtn = headerBar.querySelector('.vest-panel-btn-collapse');
          if (colBtn) colBtn.classList.remove('active');
          const floatBtn = headerBar.querySelector('.vest-panel-btn-float');
          if (floatBtn) floatBtn.classList.remove('active');
        }
      }
    });

    renderMinimizedDock();
    showToast('Reset all trading panels to default docked layout');
  }

  function findPanelElement(def) {
    const tagged = document.querySelector(`[data-vest-panel-key="${def.key}"]`);
    if (tagged && tagged.isConnected) return tagged;

    const candidates = document.querySelectorAll(
      'aside, section, div[class*="panel"], div[class*="card"], div[class*="layout"] > div, div[data-testid*="panel"]'
    );

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.id === 'vest-template-bar-root' || el.id === 'vest-studio-header-pill' || el.id === 'vest-minimized-dock') continue;
      if (el.closest('#vest-template-bar-root') || el.closest('#vest-studio-header-pill') || el.closest('#vest-minimized-dock')) continue;
      if (el === document.body || el.children.length > 25) continue;

      if (def.match(el)) {
        let target = el;
        if (target.parentElement && target.parentElement !== document.body && target.parentElement.children.length === 1) {
          target = target.parentElement;
        }
        return target;
      }
    }

    return null;
  }

  function scanAndEnhancePanels() {
    dockStudioPillNextToMarketSelector();
    if (!settings.enablePanelManagement) return;
    if (isScanningPanels) return;
    isScanningPanels = true;

    try {
      let allFound = true;
      for (const def of PANEL_DEFINITIONS) {
        let panel = findPanelElement(def);
        if (!panel) {
          allFound = false;
          continue;
        }

        if (!panel.dataset.vestPanelKey) {
          panel.dataset.vestPanelKey = def.key;
          panel.dataset.vestPanelTitle = def.title;
          injectPanelHeaderControls(panel, def);
          applySavedPanelState(panel, def.key);
        }
      }

      renderMinimizedDock();
    } catch (e) {
      console.warn('[VestTemplates:Isolated] scan error:', e);
    } finally {
      isScanningPanels = false;
    }
  }

  function injectPanelHeaderControls(panel, def) {
    if (panel.querySelector('.vest-panel-header-bar')) return;

    // Find header or first visible child
    let headerEl = panel.querySelector('header, div[class*="header"], div[class*="title"], div[class*="tab"]') || panel.firstElementChild;
    if (!headerEl) {
      headerEl = panel;
    }

    const headerBar = document.createElement('div');
    headerBar.className = 'vest-panel-header-bar';
    headerBar.innerHTML = `
      <button class="vest-panel-control-btn vest-panel-drag-handle" title="Drag and Move this panel" style="cursor:grab;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:10px; height:10px;">
          <circle cx="9" cy="6" r="1.5"></circle>
          <circle cx="15" cy="6" r="1.5"></circle>
          <circle cx="9" cy="12" r="1.5"></circle>
          <circle cx="15" cy="12" r="1.5"></circle>
          <circle cx="9" cy="18" r="1.5"></circle>
          <circle cx="15" cy="18" r="1.5"></circle>
        </svg>
      </button>
      <button class="vest-panel-control-btn vest-panel-btn-collapse" title="Collapse / Expand panel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:10px; height:10px;">
          <polyline points="4 14 10 14 10 20"></polyline>
          <polyline points="20 10 14 10 14 4"></polyline>
        </svg>
      </button>
      <button class="vest-panel-control-btn vest-panel-btn-float" title="Pop out into floating movable window">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px; height:10px;">
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>
      </button>
      <button class="vest-panel-control-btn vest-panel-btn-minimize" title="Minimize to bottom dock" style="font-size:13px; line-height:0.8;">
        –
      </button>
    `;

    // Hook Drag Handle
    const dragBtn = headerBar.querySelector('.vest-panel-drag-handle');
    if (dragBtn) {
      dragBtn.addEventListener('mousedown', (e) => onPanelDragStart(e, panel, def.key));
    }

    // Hook Collapse Button
    const collapseBtn = headerBar.querySelector('.vest-panel-btn-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCol = panel.classList.contains('vest-panel-collapsed');
        setPanelCollapsed(panel, def.key, !isCol);
      });
    }

    // Hook Float/Pop-out Button
    const floatBtn = headerBar.querySelector('.vest-panel-btn-float');
    if (floatBtn) {
      floatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isFlo = panel.classList.contains('vest-panel-floating');
        setPanelFloating(panel, def.key, !isFlo);
      });
    }

    // Hook Minimize Button
    const minBtn = headerBar.querySelector('.vest-panel-btn-minimize');
    if (minBtn) {
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setPanelHidden(panel, def.key, true);
      });
    }

    // Insert controls into header or at top of panel
    if (headerEl && headerEl !== panel && getComputedStyle(headerEl).display.includes('flex')) {
      headerEl.appendChild(headerBar);
    } else {
      panel.insertBefore(headerBar, panel.firstChild);
    }
  }

  function applySavedPanelState(panel, key) {
    if (!settings.panelLayout || !settings.panelLayout[key]) return;
    const state = settings.panelLayout[key];

    if (state.collapsed) {
      panel.classList.add('vest-panel-collapsed');
      const colBtn = panel.querySelector('.vest-panel-btn-collapse');
      if (colBtn) colBtn.classList.add('active');
    }

    if (state.floating && state.pos) {
      panel.classList.add('vest-panel-floating');
      panel.style.top = `${state.pos.top}px`;
      panel.style.left = `${state.pos.left}px`;
      if (state.pos.width) panel.style.width = `${state.pos.width}px`;
      if (state.pos.height) panel.style.height = `${state.pos.height}px`;

      const floBtn = panel.querySelector('.vest-panel-btn-float');
      if (floBtn) floBtn.classList.add('active');
    }

    if (state.hidden) {
      panel.classList.add('vest-panel-hidden');
    }
  }

  function savePanelState(key, updates) {
    if (!settings.panelLayout) settings.panelLayout = {};
    settings.panelLayout[key] = {
      ...(settings.panelLayout[key] || {}),
      ...updates
    };
    queueSettingsSave({ panelLayout: settings.panelLayout });
  }

  function setPanelCollapsed(panel, key, collapsed) {
    panel.classList.toggle('vest-panel-collapsed', collapsed);
    const btn = panel.querySelector('.vest-panel-btn-collapse');
    if (btn) btn.classList.toggle('active', collapsed);

    savePanelState(key, { collapsed });
  }

  function setPanelFloating(panel, key, floating) {
    if (floating) {
      const rect = panel.getBoundingClientRect();
      panel.classList.add('vest-panel-floating');
      panel.style.top = `${Math.max(10, rect.top)}px`;
      panel.style.left = `${Math.max(10, rect.left)}px`;
      panel.style.width = `${Math.max(220, rect.width)}px`;
      panel.style.height = `${Math.max(150, rect.height)}px`;

      savePanelState(key, {
        floating: true,
        pos: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      });
      showToast(`${panel.dataset.vestPanelTitle || 'Panel'} popped out into movable window`);
    } else {
      panel.classList.remove('vest-panel-floating');
      panel.style.top = '';
      panel.style.left = '';
      panel.style.width = '';
      panel.style.height = '';

      savePanelState(key, { floating: false });
      showToast(`${panel.dataset.vestPanelTitle || 'Panel'} docked back to grid`);
    }

    const btn = panel.querySelector('.vest-panel-btn-float');
    if (btn) btn.classList.toggle('active', floating);
  }

  function setPanelHidden(panel, key, hidden) {
    panel.classList.toggle('vest-panel-hidden', hidden);
    savePanelState(key, { hidden });
    renderMinimizedDock();
    if (hidden) {
      showToast(`${panel.dataset.vestPanelTitle || 'Panel'} minimized to bottom dock`);
    }
  }

  let lastRenderedDockHash = null;

  function renderMinimizedDock() {
    const layout = settings.panelLayout || {};
    const hiddenList = PANEL_DEFINITIONS
      .filter(def => layout[def.key] && layout[def.key].hidden)
      .map(def => def.key)
      .sort()
      .join('|');

    // Never mutate DOM if minimized state has not changed
    if (lastRenderedDockHash === hiddenList && minimizedDockEl) {
      return;
    }
    lastRenderedDockHash = hiddenList;

    if (!minimizedDockEl) {
      minimizedDockEl = document.createElement('div');
      minimizedDockEl.id = 'vest-minimized-dock';
      document.body.appendChild(minimizedDockEl);
    }

    minimizedDockEl.innerHTML = '';

    PANEL_DEFINITIONS.forEach(def => {
      const state = layout[def.key];
      if (state && state.hidden) {
        const chip = document.createElement('div');
        chip.className = 'vest-minimized-chip';
        chip.title = `Click to restore ${def.title}`;
        chip.innerHTML = `
          <span>${escapeHtml(def.title)}</span>
          <span style="color:#10b981; font-size:12px;">+</span>
        `;
        chip.addEventListener('click', () => {
          const panel = findPanelElement(def);
          if (panel) {
            setPanelHidden(panel, def.key, false);
          }
        });
        minimizedDockEl.appendChild(chip);
      }
    });
  }

  // -------------------------------------------------------------
  // Panel Dragging (Moving Any Panel Anywhere)
  // -------------------------------------------------------------
  function onPanelDragStart(e, panel, key) {
    e.preventDefault();
    e.stopPropagation();

    // If panel is not yet floating, automatically pop it out into floating mode so it can be moved anywhere!
    if (!panel.classList.contains('vest-panel-floating')) {
      const rect = panel.getBoundingClientRect();
      panel.classList.add('vest-panel-floating');
      panel.style.top = `${rect.top}px`;
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.height = `${rect.height}px`;

      const floBtn = panel.querySelector('.vest-panel-btn-float');
      if (floBtn) floBtn.classList.add('active');
    }

    const rect = panel.getBoundingClientRect();
    activePanelDrag = {
      panel,
      key,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };

    document.body.style.userSelect = 'none';
  }

  function onPanelDragMove(e) {
    if (!activePanelDrag) return;
    const { panel, offsetX, offsetY } = activePanelDrag;

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 40;

    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));

    panel.style.left = `${newX}px`;
    panel.style.top = `${newY}px`;
  }

  function onPanelDragEnd() {
    if (!activePanelDrag) return;
    const { panel, key } = activePanelDrag;
    activePanelDrag = null;
    document.body.style.userSelect = '';

    const rect = panel.getBoundingClientRect();
    savePanelState(key, {
      floating: true,
      pos: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    });
  }

  // =============================================================
  // Bottom Positions & Orders Panel Manager (Detach & Minimize)
  // =============================================================
  let bottomPanelTopBarPillEl = null;
  let cachedBottomPanelEl = null;
  let cachedBottomTabBarEl = null;
  let latestDetectedPositionsCount = 0;
  let isDraggingDetachedBottomPanel = false;
  let detachedDragStartMouse = { x: 0, y: 0 };
  let detachedDragStartOffset = { x: 0, y: 0 };

  function getLivePositionCount() {
    return latestDetectedPositionsCount;
  }

  function getActiveFirmBottomPanelState() {
    const firm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const firmId = firm?.id || 'default';
    if (settings.bottomPanelStates && settings.bottomPanelStates[firmId]) {
      return settings.bottomPanelStates[firmId];
    }
    if (settings.bottomPanelState && typeof settings.bottomPanelState === 'object') {
      return settings.bottomPanelState;
    }
    return { isMinimized: false, isDetached: false, pos: null };
  }

  function saveBottomPanelState(updates) {
    const firm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    const firmId = firm?.id || 'default';
    if (!settings.bottomPanelStates) {
      settings.bottomPanelStates = {};
    }
    const current = getActiveFirmBottomPanelState();
    const updated = {
      ...current,
      ...updates
    };
    settings.bottomPanelStates[firmId] = updated;
    settings.bottomPanelState = updated;
    queueSettingsSave({
      bottomPanelStates: settings.bottomPanelStates,
      bottomPanelState: updated
    });
  }

  function findBottomPositionsPanel() {
    if (cachedBottomPanelEl && cachedBottomPanelEl.isConnected) {
      return { panel: cachedBottomPanelEl, tabBar: cachedBottomTabBarEl, posCount: latestDetectedPositionsCount };
    }

    const tagged = document.querySelector('[data-vest-bottom-panel="true"]');
    if (tagged && tagged.isConnected) {
      cachedBottomPanelEl = tagged;
      return { panel: tagged, tabBar: cachedBottomTabBarEl, posCount: latestDetectedPositionsCount };
    }

    const candidates = Array.from(document.querySelectorAll('button, [role="tab"], div[class*="tab"], a[role="tab"], div, span'));
    let matchedTab = null;
    let detectedCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.id === 'vest-bottom-panel-controls' || el.closest('#vest-bottom-panel-controls')) continue;
      if (el.closest('#vest-cortex-top-bar') || el.closest('#vest-studio-settings-dialog') || el.closest('#vest-chart-trades-box') || el.closest('#vest-action-log-box')) continue;
      if (el.children.length > 4) continue;

      const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!txt) continue;

      const mPos = txt.match(/^(?:active\s+)?positions?(?:\s*\(?(\d+)\)?)?$/i);
      if (mPos) {
        const r = el.getBoundingClientRect();
        if (r.width > 24 && r.height > 12 && r.height <= 60 && r.top >= 120) {
          matchedTab = el;
          if (mPos[1]) detectedCount = parseInt(mPos[1], 10);
          break;
        }
      }

      if (/^(?:open\s+orders|positions?\s+history|order\s+history|funding\s+history)(?:\s*\(?(\d+)\)?)?$/i.test(txt)) {
        const r = el.getBoundingClientRect();
        if (r.width > 24 && r.height > 12 && r.height <= 60 && r.top >= 120) {
          if (!matchedTab) matchedTab = el;
        }
      }
    }

    if (!matchedTab) return null;

    latestDetectedPositionsCount = detectedCount;

    let tabBar = matchedTab.parentElement;
    while (tabBar && tabBar !== document.body) {
      const t = (tabBar.innerText || tabBar.textContent || '');
      if ((/positions/i.test(t) || /orders/i.test(t)) && tabBar.children.length >= 2) {
        const tr = tabBar.getBoundingClientRect();
        if (tr.width >= 200 && tr.height <= 65) {
          break;
        }
      }
      tabBar = tabBar.parentElement;
    }

    let panel = tabBar || matchedTab.parentElement;
    while (panel && panel.parentElement && panel.parentElement !== document.body && panel.parentElement.id !== '__next' && panel.parentElement.id !== 'root') {
      const parent = panel.parentElement;
      const parentHasChart = parent.querySelector('iframe, canvas, div[class*="chart"], div[id*="chart"]');
      const panelHasChart = panel.querySelector('iframe, canvas, div[class*="chart"]');
      if (parentHasChart && !panelHasChart) {
        break;
      }
      const r = panel.getBoundingClientRect();
      if (r.width >= window.innerWidth * 0.45 && r.height >= 100 && r.top >= 140) {
        if (parent.clientHeight > r.height + 120) {
          break;
        }
      }
      panel = parent;
    }

    if (panel) {
      panel.setAttribute('data-vest-bottom-panel', 'true');
      cachedBottomPanelEl = panel;
      cachedBottomTabBarEl = tabBar;
      if (!panel.classList.contains('vest-bottom-panel-detached') && !panel.classList.contains('vest-bottom-panel-minimized')) {
        const r = panel.getBoundingClientRect();
        if (r.height >= 120) {
          panel.dataset.vestDockedHeight = String(Math.round(r.height));
        }
      }
    }

    return { panel, tabBar, matchedTab, posCount: detectedCount };
  }

  function findPanelSplitResizer(panel) {
    if (!panel || !panel.parentElement) return null;
    let prev = panel.previousElementSibling;
    while (prev) {
      const r = prev.getBoundingClientRect();
      const style = window.getComputedStyle(prev);
      const cursor = style.cursor || '';
      const txt = (prev.innerText || prev.textContent || '').trim();
      if (
        cursor.includes('resize') ||
        r.height <= 24 ||
        txt === ':::' ||
        prev.getAttribute('role') === 'separator' ||
        prev.className.includes('resiz') ||
        prev.className.includes('separator') ||
        prev.className.includes('splitter')
      ) {
        return prev;
      }
      if (r.height >= 80) break;
      prev = prev.previousElementSibling;
    }
    return null;
  }

  function findChartContainerAbovePanel(panel) {
    if (!panel || !panel.parentElement) return null;
    const resizer = findPanelSplitResizer(panel);
    let el = resizer ? resizer.previousElementSibling : panel.previousElementSibling;
    while (el) {
      const r = el.getBoundingClientRect();
      if (r.height >= 120 && (el.querySelector('iframe, canvas') || el.className.includes('chart') || el.id.includes('chart'))) {
        return el;
      }
      el = el.previousElementSibling;
    }
    return panel.parentElement.querySelector('div[class*="chart"], div[id*="chart"], iframe, canvas')?.closest('div') || null;
  }

  function minimizeBottomPanel(showToastMsg = true) {
    const info = findBottomPositionsPanel();
    if (!info || !info.panel) return false;
    const panel = info.panel;

    if (!panel.classList.contains('vest-bottom-panel-detached') && !panel.classList.contains('vest-bottom-panel-minimized')) {
      const r = panel.getBoundingClientRect();
      if (r.height >= 120) {
        panel.dataset.vestDockedHeight = String(Math.round(r.height));
      }
    }

    if (panel.classList.contains('vest-bottom-panel-detached')) {
      restoreDetachedToDocked(panel);
    }

    const resizer = findPanelSplitResizer(panel);
    if (resizer) {
      resizer.classList.add('vest-bottom-resizer-hidden');
      resizer.style.setProperty('display', 'none', 'important');
    }

    const chartEl = findChartContainerAbovePanel(panel);
    if (chartEl) {
      if (chartEl.dataset.vestOrigCaptured !== 'true') {
        chartEl.dataset.vestOrigCaptured = 'true';
        chartEl.dataset.vestOrigHeight = chartEl.style.height || '';
        chartEl.dataset.vestOrigMaxH = chartEl.style.maxHeight || '';
        chartEl.dataset.vestOrigFlex = chartEl.style.flex || '';
      }
      chartEl.style.setProperty('height', '100%', 'important');
      chartEl.style.setProperty('max-height', 'none', 'important');
      chartEl.style.setProperty('flex', '1 1 0%', 'important');
    }

    panel.classList.add('vest-bottom-panel-minimized');
    panel.style.setProperty('display', 'none', 'important');

    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);

    saveBottomPanelState({ isMinimized: true, isDetached: false });
    if (!minimizedWindowOrder.includes('positions')) {
      minimizedWindowOrder.push('positions');
      settings.minimizedWindowOrder = [...minimizedWindowOrder];
      queueSettingsSave({ minimizedWindowOrder: settings.minimizedWindowOrder });
    }
    updateBottomPanelTopBarPill();

    if (showToastMsg) {
      showToast('Positions & Orders minimized to Cortex Toolbar (Full Screen Chart)');
    }
    return true;
  }

  function restoreBottomPanelDocked(showToastMsg = true) {
    const info = findBottomPositionsPanel();
    if (!info || !info.panel) return false;
    const panel = info.panel;

    panel.classList.remove('vest-bottom-panel-minimized');
    panel.classList.remove('vest-panel-collapsed', 'vest-panel-floating', 'vest-panel-hidden');
    panel.style.removeProperty('display');
    panel.style.removeProperty('visibility');
    panel.style.removeProperty('opacity');

    if (panel.classList.contains('vest-bottom-panel-detached')) {
      restoreDetachedToDocked(panel);
    } else {
      const targetH = parseInt(panel.dataset.vestDockedHeight, 10) || Math.min(360, Math.max(240, Math.round(window.innerHeight * 0.30)));
      panel.style.setProperty('height', `${targetH}px`);
      panel.style.setProperty('min-height', '180px');
      panel.style.setProperty('max-height', 'none');
      panel.style.setProperty('flex', '0 0 auto');
      panel.style.setProperty('display', 'flex');
      panel.style.setProperty('flex-direction', 'column');
    }

    const resizer = findPanelSplitResizer(panel);
    if (resizer) {
      resizer.classList.remove('vest-bottom-resizer-hidden');
      resizer.style.removeProperty('display');
      resizer.style.removeProperty('height');
      resizer.style.removeProperty('min-height');
    }

    const chartEl = findChartContainerAbovePanel(panel);
    if (chartEl) {
      if (chartEl.dataset.vestOrigHeight) {
        chartEl.style.height = chartEl.dataset.vestOrigHeight;
      } else {
        chartEl.style.removeProperty('height');
      }
      if (chartEl.dataset.vestOrigMaxH) {
        chartEl.style.maxHeight = chartEl.dataset.vestOrigMaxH;
      } else {
        chartEl.style.removeProperty('max-height');
      }
      if (chartEl.dataset.vestOrigFlex) {
        chartEl.style.flex = chartEl.dataset.vestOrigFlex;
      } else {
        chartEl.style.removeProperty('flex');
        chartEl.style.setProperty('flex', '1 1 0%');
      }
      delete chartEl.dataset.vestOrigCaptured;
      delete chartEl.dataset.vestOrigHeight;
      delete chartEl.dataset.vestOrigMaxH;
      delete chartEl.dataset.vestOrigFlex;
    }

    wakeUpPositionsPanel(panel, info);

    saveBottomPanelState({ isMinimized: false, isDetached: false });
    minimizedWindowOrder = minimizedWindowOrder.filter(id => id !== 'positions');
    if (Array.isArray(settings.minimizedWindowOrder)) {
      settings.minimizedWindowOrder = settings.minimizedWindowOrder.filter(id => id !== 'positions');
      queueSettingsSave({ minimizedWindowOrder: settings.minimizedWindowOrder });
    }
    updateBottomPanelTopBarPill();

    if (showToastMsg) {
      showToast('Positions & Orders docked to bottom');
    }
    return true;
  }

  function detachBottomPanel(showToastMsg = true) {
    const info = findBottomPositionsPanel();
    if (!info || !info.panel) return false;
    const panel = info.panel;

    if (!panel.classList.contains('vest-bottom-panel-detached') && !panel.classList.contains('vest-bottom-panel-minimized')) {
      const r = panel.getBoundingClientRect();
      if (r.height >= 120) {
        panel.dataset.vestDockedHeight = String(Math.round(r.height));
      }
    }

    panel.classList.remove('vest-bottom-panel-minimized');
    panel.style.removeProperty('display');

    const resizer = findPanelSplitResizer(panel);
    if (resizer) {
      resizer.classList.add('vest-bottom-resizer-hidden');
      resizer.style.setProperty('display', 'none', 'important');
    }

    const chartEl = findChartContainerAbovePanel(panel);
    if (chartEl) {
      if (chartEl.dataset.vestOrigCaptured !== 'true') {
        chartEl.dataset.vestOrigCaptured = 'true';
        chartEl.dataset.vestOrigHeight = chartEl.style.height || '';
        chartEl.dataset.vestOrigMaxH = chartEl.style.maxHeight || '';
        chartEl.dataset.vestOrigFlex = chartEl.style.flex || '';
      }
      chartEl.style.setProperty('height', '100%', 'important');
      chartEl.style.setProperty('max-height', 'none', 'important');
      chartEl.style.setProperty('flex', '1 1 0%', 'important');
    }

    const savedState = settings.bottomPanelState || {};
    const defaultW = Math.min(980, Math.max(560, Math.round(window.innerWidth * 0.65)));
    const defaultH = Math.min(500, Math.max(260, Math.round(window.innerHeight * 0.42)));
    const defaultTop = Math.max(80, window.innerHeight - defaultH - 30);
    const defaultLeft = Math.max(20, Math.round((window.innerWidth - defaultW) / 2));

    const top = savedState.pos?.top ?? defaultTop;
    const left = savedState.pos?.left ?? defaultLeft;
    const width = savedState.pos?.width ?? defaultW;
    const height = savedState.pos?.height ?? defaultH;

    panel.classList.add('vest-bottom-panel-detached');
    panel.style.setProperty('position', 'fixed', 'important');
    panel.style.setProperty('top', `${top}px`, 'important');
    panel.style.setProperty('left', `${left}px`, 'important');
    panel.style.setProperty('width', `${width}px`, 'important');
    panel.style.setProperty('height', `${height}px`, 'important');
    panel.style.setProperty('z-index', '2147483640', 'important');

    if (!panel.dataset.vestZIndexBound) {
      panel.dataset.vestZIndexBound = 'true';
      panel.addEventListener('mousedown', () => {
        if (panel.classList.contains('vest-bottom-panel-detached')) {
          panel.style.setProperty('z-index', '2147483645', 'important');
        }
      }, { capture: true });
    }

    injectDetachedTitleBar(panel);

    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);

    saveBottomPanelState({ isMinimized: false, isDetached: true, pos: { top, left, width, height } });
    if (!minimizedWindowOrder.includes('positions')) {
      minimizedWindowOrder.push('positions');
      settings.minimizedWindowOrder = [...minimizedWindowOrder];
      queueSettingsSave({ minimizedWindowOrder: settings.minimizedWindowOrder });
    }
    updateBottomPanelTopBarPill();

    if (showToastMsg) {
      showToast('Positions & Orders detached into floating window (Chart is full screen)');
    }
    return true;
  }

  function restoreDetachedToDocked(panel) {
    if (!panel) return;
    panel.classList.remove('vest-bottom-panel-detached');
    panel.classList.remove('vest-panel-collapsed', 'vest-panel-floating', 'vest-panel-hidden');
    panel.style.removeProperty('position');
    panel.style.removeProperty('top');
    panel.style.removeProperty('left');
    panel.style.removeProperty('width');
    panel.style.removeProperty('z-index');
    panel.style.removeProperty('resize');

    const titleBar = panel.querySelector('#vest-detached-title-bar');
    if (titleBar) titleBar.remove();

    const targetH = parseInt(panel.dataset.vestDockedHeight, 10) || Math.min(360, Math.max(240, Math.round(window.innerHeight * 0.30)));
    panel.style.setProperty('height', `${targetH}px`);
    panel.style.setProperty('min-height', '180px');
    panel.style.setProperty('max-height', 'none');
    panel.style.setProperty('flex', '0 0 auto');
    panel.style.setProperty('display', 'flex');
    panel.style.setProperty('flex-direction', 'column');
  }

  function wakeUpPositionsPanel(panel, info) {
    if (!panel) return;

    function triggerReflow() {
      const scrollables = panel.querySelectorAll('div, [role="tabpanel"], table, tbody');
      scrollables.forEach(el => {
        try {
          el.dispatchEvent(new Event('scroll', { bubbles: true }));
          el.dispatchEvent(new Event('resize', { bubbles: true }));
        } catch (e) {}
      });
      window.dispatchEvent(new Event('resize'));
    }

    triggerReflow();
    setTimeout(triggerReflow, 50);
    setTimeout(triggerReflow, 150);
    setTimeout(triggerReflow, 300);

    setTimeout(() => {
      try {
        const activeTab = panel.querySelector('[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]') || info?.matchedTab;
        if (activeTab && typeof activeTab.click === 'function') {
          activeTab.click();
        }
      } catch (e) {}
    }, 40);
  }

  function injectDockedBottomPanelControls(panel, tabBar) {
    if (!panel) return;
    let controls = panel.querySelector('#vest-bottom-panel-controls');
    if (controls && controls.isConnected) return;

    controls = document.createElement('div');
    controls.id = 'vest-bottom-panel-controls';
    controls.className = 'vest-bottom-panel-controls';
    controls.innerHTML = `
      <button type="button" class="vest-bpc-btn vest-bpc-detach-btn" id="vest-bpc-detach-btn" title="Detach Positions & Orders into floating movable window">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px;">
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>
        <span>DETACH</span>
      </button>
      <button type="button" class="vest-bpc-btn vest-bpc-minimize-btn" id="vest-bpc-minimize-btn" title="Minimize to Cortex Toolbar (Full Screen Chart)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px;">
          <line x1="4" y1="18" x2="20" y2="18"></line>
          <polyline points="7 12 12 17 17 12"></polyline>
        </svg>
        <span>MINIMIZE</span>
      </button>
    `;

    controls.querySelector('#vest-bpc-detach-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      detachBottomPanel(true);
    });

    controls.querySelector('#vest-bpc-minimize-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      minimizeBottomPanel(true);
    });

    if (tabBar && tabBar.isConnected) {
      tabBar.appendChild(controls);
    } else {
      controls.style.position = 'absolute';
      controls.style.top = '6px';
      controls.style.right = '12px';
      panel.style.position = 'relative';
      panel.insertBefore(controls, panel.firstChild);
    }
  }

  function injectDetachedTitleBar(panel) {
    if (!panel) return;
    let titleBar = panel.querySelector('#vest-detached-title-bar');
    if (!titleBar) {
      titleBar = document.createElement('div');
      titleBar.id = 'vest-detached-title-bar';
      titleBar.className = 'vest-detached-title-bar';
      panel.insertBefore(titleBar, panel.firstChild);
    }

    const posCount = getLivePositionCount();

    titleBar.innerHTML = `
      <div class="vest-dtb-drag-handle" title="Drag to move Positions & Orders window">
        <div class="vest-dtb-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
        </div>
        <div class="vest-dtb-title-group">
          <span class="vest-dtb-brand">Trading Cortex</span>
          <span class="vest-dtb-title">Positions &amp; Orders</span>
          <span class="vest-dtb-count-badge" id="vest-dtb-count-badge">${posCount > 0 ? `${posCount} Active` : '0 Active'}</span>
        </div>
      </div>
      <div class="vest-dtb-actions">
        <button type="button" class="vest-dtb-btn" id="vest-dtb-dock-btn" title="Dock back to bottom of chart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px;">
            <polyline points="4 14 10 14 10 20"></polyline>
            <polyline points="20 10 14 10 14 4"></polyline>
            <line x1="14" y1="10" x2="21" y2="3"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          <span>Dock</span>
        </button>
        <button type="button" class="vest-dtb-btn" id="vest-dtb-min-btn" title="Minimize to Cortex Toolbar (Full Screen Chart)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px;">
            <line x1="4" y1="18" x2="20" y2="18"></line>
            <polyline points="7 12 12 17 17 12"></polyline>
          </svg>
          <span>Minimize</span>
        </button>
      </div>
    `;

    const dragHandle = titleBar.querySelector('.vest-dtb-drag-handle');
    if (dragHandle) {
      dragHandle.onmousedown = (e) => onDetachedPanelDragStart(e, panel);
    }

    titleBar.querySelector('#vest-dtb-dock-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreBottomPanelDocked(true);
    });

    titleBar.querySelector('#vest-dtb-min-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      minimizeBottomPanel(true);
    });
  }

  function onDetachedPanelDragStart(e, panel) {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    if (panel) panel.style.setProperty('z-index', '2147483645', 'important');
    isDraggingDetachedBottomPanel = true;
    detachedDragStartMouse = { x: e.clientX, y: e.clientY };
    const r = panel.getBoundingClientRect();
    detachedDragStartOffset = { x: r.left, y: r.top };
    e.preventDefault();
  }

  function onDetachedPanelDragMove(e) {
    if (!isDraggingDetachedBottomPanel || !cachedBottomPanelEl) return;
    const dx = e.clientX - detachedDragStartMouse.x;
    const dy = e.clientY - detachedDragStartMouse.y;
    const newLeft = Math.max(10, Math.min(window.innerWidth - 120, detachedDragStartOffset.x + dx));
    const newTop = Math.max(40, Math.min(window.innerHeight - 60, detachedDragStartOffset.y + dy));
    cachedBottomPanelEl.style.setProperty('left', `${Math.round(newLeft)}px`, 'important');
    cachedBottomPanelEl.style.setProperty('top', `${Math.round(newTop)}px`, 'important');
  }

  function onDetachedPanelDragEnd() {
    if (!isDraggingDetachedBottomPanel || !cachedBottomPanelEl) return;
    isDraggingDetachedBottomPanel = false;
    const r = cachedBottomPanelEl.getBoundingClientRect();
    saveBottomPanelState({
      pos: {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height)
      }
    });
  }

  function ensureBottomPanelTopBarPill() {
    let pill = document.getElementById('vest-bottom-panel-topbar-pill') || bottomPanelTopBarPillEl;
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'vest-bottom-panel-topbar-pill';
      pill.className = 'is-minimized-pill';
      pill.style.position = 'fixed';
      pill.style.zIndex = '99990';
      pill.style.display = 'none';
      document.body.appendChild(pill);

      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const st = getActiveFirmBottomPanelState();
        if (st.isMinimized || st.isDetached) {
          restoreBottomPanelDocked(true);
        }
      });
    }

    bottomPanelTopBarPillEl = pill;
    updateBottomPanelTopBarPill();
    return pill;
  }

  function updateBottomPanelTopBarPill() {
    const pill = bottomPanelTopBarPillEl || document.getElementById('vest-bottom-panel-topbar-pill');
    if (!pill) return;

    const firm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    if (firm && firm.managePositionsPanel === false) {
      pill.style.display = 'none';
      repositionAllMinimizedBoxes();
      return;
    }

    const st = getActiveFirmBottomPanelState();
    const isMin = Boolean(st.isMinimized);
    const isDet = Boolean(st.isDetached);
    const posCount = getLivePositionCount();

    if (!isMin && !isDet) {
      // Docked / normal state: DO NOT SHOW IN TOP BAR!
      pill.style.display = 'none';
      repositionAllMinimizedBoxes();
      return;
    }

    pill.style.display = 'block';
    pill.className = `is-minimized-pill ${isDet ? 'detached' : 'minimized'}`;
    pill.title = isMin
      ? 'Positions & Orders Minimized (Click to Restore Docked)'
      : 'Positions & Orders Detached (Click to Dock to Bottom)';

    const dotColor = isMin ? '#38bdf8' : '#c084fc';
    const statusText = isMin ? 'MIN' : 'DETACH';
    const statusStyle = isMin
      ? 'color:#22d3ee; background:rgba(6, 182, 212, 0.18); border:1px solid rgba(34, 211, 238, 0.35);'
      : 'color:#c084fc; background:rgba(168, 85, 247, 0.18); border:1px solid rgba(192, 132, 252, 0.35);';

    pill.innerHTML = `
      <div class="vest-cnb-min-pill-bar" id="vest-bpp-restore-bar" title="${isMin ? 'Positions & Orders Minimized (Click to Restore Docked)' : 'Positions & Orders Detached (Click to Dock to Bottom)'}">
        <div class="vest-cnb-title-group">
          <span class="vest-cnb-title-dot" style="background:${dotColor}; box-shadow:0 0 8px ${dotColor};"></span>
          <span class="vest-cnb-title">POSITIONS</span>
          <span style="font-size:9.5px; font-family:'JetBrains Mono', monospace; font-weight:700; color:${posCount > 0 ? '#34d399' : '#94a3b8'}; background:${posCount > 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)'}; border:1px solid ${posCount > 0 ? 'rgba(52, 211, 153, 0.35)' : 'rgba(255, 255, 255, 0.1)'}; padding:1px 5px; border-radius:4px;">
            ${posCount}
          </span>
          <span style="font-size:8.5px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; padding:1px 5px; border-radius:3px; ${statusStyle}">
            ${statusText}
          </span>
        </div>
        <span class="vest-cnb-restore-hint" title="${isMin ? 'Restore Docked' : 'Dock to Bottom'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px;">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </span>
      </div>
    `;

    const detBadge = document.getElementById('vest-dtb-count-badge');
    if (detBadge) {
      detBadge.textContent = posCount > 0 ? `${posCount} Active` : '0 Active';
    }
    repositionAllMinimizedBoxes();
  }

  function ensureBottomPositionsPanelManager() {
    if (!isTopWindow) return;
    const firm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    if (firm && firm.managePositionsPanel === false) {
      const pill = bottomPanelTopBarPillEl || document.getElementById('vest-bottom-panel-topbar-pill');
      if (pill) pill.style.display = 'none';
      const info = findBottomPositionsPanel();
      if (info && info.panel) {
        if (info.panel.classList.contains('vest-bottom-panel-minimized') || info.panel.classList.contains('vest-bottom-panel-detached')) {
          restoreBottomPanelDocked(false);
        }
        const controls = info.panel.querySelector('#vest-bottom-panel-controls');
        if (controls) controls.remove();
      }
      return;
    }

    const info = findBottomPositionsPanel();
    ensureBottomPanelTopBarPill();

    if (!info || !info.panel) return;
    const panel = info.panel;
    const tabBar = info.tabBar;

    if (!panel.classList.contains('vest-bottom-panel-detached') && !panel.classList.contains('vest-bottom-panel-minimized')) {
      const r = panel.getBoundingClientRect();
      if (r.height >= 120) {
        panel.dataset.vestDockedHeight = String(Math.round(r.height));
      }
    }

    const st = getActiveFirmBottomPanelState();
    if (st.isMinimized) {
      if (!panel.classList.contains('vest-bottom-panel-minimized')) {
        minimizeBottomPanel(false);
      }
    } else if (st.isDetached) {
      if (!panel.classList.contains('vest-bottom-panel-detached')) {
        detachBottomPanel(false);
      } else {
        injectDetachedTitleBar(panel);
      }
    } else {
      injectDockedBottomPanelControls(panel, tabBar);
    }
  }

  function initBottomPositionsPanelManager() {
    if (!isTopWindow) return;
    window.addEventListener('mousemove', onDetachedPanelDragMove, true);
    window.addEventListener('mouseup', onDetachedPanelDragEnd, true);
    ensureBottomPositionsPanelManager();
  }

  // -------------------------------------------------------------
  // Keyboard Shortcuts
  // -------------------------------------------------------------
  function setupHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (!settings.hotkeysEnabled) return;

      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      // Alt + P to toggle Positions & Orders Panel Minimized / Docked
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        const firm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
        if (firm && firm.managePositionsPanel === false) return;
        const st = getActiveFirmBottomPanelState();
        if (st.isMinimized || st.isDetached) {
          restoreBottomPanelDocked(true);
        } else {
          minimizeBottomPanel(true);
        }
      }

      // Alt + M to toggle Maximize Chart
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        toggleMaximizeChart();
        return;
      }

      // Alt + L to toggle Action & ID Logger
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        toggleActionLogBox();
        return;
      }

      // Alt + 1..9 for box templates
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          const index = num - 1;
          if (index < templates.length) {
            e.preventDefault();
            applyTemplateById(templates[index].id, true);
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // Toast Notifications
  // -------------------------------------------------------------
  let toastEl = null;
  let toastTimer = null;

  function showToast(msg, duration = 2200, isDev = false) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'vest-toast';
      document.body.appendChild(toastEl);
    }

    toastEl.textContent = msg;
    if (isDev) {
      toastEl.classList.add('dev-toast');
    } else {
      toastEl.classList.remove('dev-toast');
    }
    toastEl.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toastEl) {
        toastEl.classList.remove('show');
        toastEl.classList.remove('dev-toast');
      }
    }, duration);
  }

  // -------------------------------------------------------------
  // Action & ID Logger Component (Real-Time Click & ID Inspector)
  // -------------------------------------------------------------
  let logBoxEl = null;
  let actionLogs = [];
  let isLogBoxOpen = false;
  let isLogRecording = true;
  let logFilterType = 'ALL';
  let logSearchQuery = '';
  let autoScrollLogs = true;
  let activeLogDrag = null;
  let expandedLogIds = new Set();

  let popoutWindow = null;
  let isPoppedOut = false;
  let currentInstrument = null;
  let currentPrice = null;

  function toggleActionLogBox(forceOpen = null) {
    if (forceOpen !== null) {
      isLogBoxOpen = forceOpen;
    } else {
      isLogBoxOpen = !isLogBoxOpen;
    }

    if (isLogBoxOpen) {
      if (isPoppedOut && popoutWindow && !popoutWindow.closed) {
        popoutWindow.focus();
      } else {
        isPoppedOut = false;
        renderActionLogBox();
      }
    } else if (logBoxEl) {
      logBoxEl.style.display = 'none';
      if (popoutWindow && !popoutWindow.closed) {
        try { popoutWindow.close(); } catch (e) {}
      }
      isPoppedOut = false;
    }

    // Update pill button state
    const pillBtn = document.getElementById('vest-open-logger-btn');
    if (pillBtn) pillBtn.classList.toggle('active', isLogBoxOpen);
  }

  function handleIncomingActionLog(logEntry) {
    if (!isLogRecording) return;
    actionLogs.push(logEntry);
    if (actionLogs.length > 600) actionLogs.shift();

    if (isPoppedOut && popoutWindow && !popoutWindow.closed) {
      updatePopoutLogCount();
      if (matchesLogFilter(logEntry)) {
        appendLogItemToPopout(logEntry);
      }
    } else if (isLogBoxOpen && logBoxEl && logBoxEl.style.display !== 'none') {
      updateLogCountDisplay();
      if (matchesLogFilter(logEntry)) {
        appendLogItemToDom(logEntry);
      }
    }
  }

  function matchesLogFilter(entry) {
    if (!entry) return false;

    // Filter Type
    if (logFilterType !== 'ALL') {
      const type = (entry.type || '').toUpperCase();
      if (logFilterType === 'CLICK' && type !== 'CLICK' && type !== 'CONTEXTMENU') return false;
      if (logFilterType === 'INPUT' && type !== 'INPUT' && type !== 'CHANGE') return false;
      if (logFilterType === 'KEY' && type !== 'KEYDOWN') return false;
      if (logFilterType === 'CHART' && !type.includes('TV') && !type.includes('CHART') && entry.source !== 'TradingView API') return false;
    }

    // Search Query
    if (logSearchQuery && logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase().trim();
      const str = [
        entry.elementId,
        entry.tag,
        entry.text,
        entry.selector,
        entry.type,
        entry.classes ? entry.classes.join(' ') : '',
        entry.name,
        entry.value,
        entry.instrument,
        entry.price,
        entry.interactive ? (entry.interactive.elementId + ' ' + entry.interactive.text) : ''
      ].join(' ').toLowerCase();

      if (!str.includes(q)) return false;
    }

    return true;
  }

  function updateLogCountDisplay() {
    if (!logBoxEl) return;
    const countEl = logBoxEl.querySelector('#vest-log-total-count');
    if (countEl) countEl.textContent = `(${actionLogs.length})`;
  }

  function updateHeaderTickerDisplay() {
    const tickerHtml = currentInstrument
      ? `<span class="vest-log-ticker-badge">${escapeHtml(currentInstrument)}${currentPrice ? ` <span class="vest-log-ticker-price">$${escapeHtml(currentPrice)}</span>` : ''}</span>`
      : '';

    // Update in-page header
    if (logBoxEl) {
      const badgeContainer = logBoxEl.querySelector('#vest-log-header-ticker');
      if (badgeContainer) badgeContainer.innerHTML = tickerHtml;
    }

    // Update pop-out window header
    if (popoutWindow && !popoutWindow.closed) {
      try {
        const popBadgeContainer = popoutWindow.document.querySelector('#vest-log-header-ticker');
        if (popBadgeContainer) popBadgeContainer.innerHTML = tickerHtml;
      } catch (e) {}
    }
  }

  // -------------------------------------------------------------
  // Pop-Out Window Mechanics
  // -------------------------------------------------------------
  function openPopoutWindow() {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.focus();
      return;
    }

    const width = 780;
    const height = 560;
    const left = Math.max(50, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(50, Math.round(window.screenY + (window.outerHeight - height) / 2));

    popoutWindow = window.open(
      'about:blank',
      'VestActionLoggerWindow',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
    );

    if (!popoutWindow) {
      showToast('Popup blocked! Please allow popups for this tab to pop out the log.');
      return;
    }

    isPoppedOut = true;
    setupPopoutDocument();

    // Render placeholder in the original in-page log box
    if (logBoxEl) {
      logBoxEl.innerHTML = `
        <div class="vest-log-header">
          <div class="vest-log-title">
            <div class="vest-log-rec-dot ${isLogRecording ? '' : 'paused'}"></div>
            <span>⚡ Action & ID Logger (Popped Out)</span>
          </div>
          <div class="vest-log-controls">
            <button class="vest-log-btn" id="vest-log-dock-back-btn" title="Return to this window">
              <span>⧉ Dock Back</span>
            </button>
            <button class="vest-log-btn" id="vest-log-close-placeholder-btn">
              <span>✕</span>
            </button>
          </div>
        </div>
        <div class="vest-log-popped-out-placeholder">
          <div style="font-size:26px;">🗗</div>
          <div style="font-weight:600; font-size:13px; color:#e2e8f0;">Event Logger is open in a separate window</div>
          <div style="font-size:11px; max-width:280px; line-height:1.4;">Live actions, clicks, inputs, and price changes are streaming to your popped-out window.</div>
          <button id="vest-log-dock-back-btn2">Dock Back In Page</button>
        </div>
      `;

      const dockBtn = logBoxEl.querySelector('#vest-log-dock-back-btn');
      const dockBtn2 = logBoxEl.querySelector('#vest-log-dock-back-btn2');
      const closeBtn = logBoxEl.querySelector('#vest-log-close-placeholder-btn');

      if (dockBtn) dockBtn.addEventListener('click', dockBackIn);
      if (dockBtn2) dockBtn2.addEventListener('click', dockBackIn);
      if (closeBtn) closeBtn.addEventListener('click', () => toggleActionLogBox(false));
    }
  }

  function setupPopoutDocument() {
    if (!popoutWindow) return;
    const doc = popoutWindow.document;

    // Grab stylesheet contents from current page
    let cssText = '';
    const styleEl = document.querySelector('style[id*="vest"], link[href*="template-bar.css"]');
    const allStyles = Array.from(document.styleSheets);
    for (const sheet of allStyles) {
      try {
        if (sheet.href && sheet.href.includes('template-bar.css')) {
          const rules = Array.from(sheet.cssRules || []);
          cssText += rules.map(r => r.cssText).join('\n');
        }
      } catch (e) {}
    }

    doc.title = '⚡ Vest Markets - Live Action & Event Logger';

    doc.head.innerHTML = `
      <meta charset="utf-8">
      <title>⚡ Vest Markets - Live Action & Event Logger</title>
      <style>
        ${cssText}
      </style>
    `;

    doc.body.className = 'vest-popout-body';
    doc.body.innerHTML = `
      <div id="vest-action-log-box">
        <div class="vest-log-header" id="vest-popout-header">
          <div class="vest-log-title">
            <div class="vest-log-rec-dot ${isLogRecording ? '' : 'paused'}" id="vest-pop-dot"></div>
            <span>⚡ Action & ID Logger</span>
            <span class="vest-log-count" id="vest-pop-total-count">(${actionLogs.length})</span>
            <span id="vest-log-header-ticker"></span>
          </div>
          <div class="vest-log-controls">
            <button class="vest-log-btn ${isLogRecording ? 'active' : ''}" id="vest-pop-pause-btn" title="${isLogRecording ? 'Pause Recording' : 'Resume Recording'}">
              <span>${isLogRecording ? '● REC' : '❚❚ Paused'}</span>
            </button>
            <button class="vest-log-btn" id="vest-pop-copy-json-btn" title="Copy all logs in JSON format to clipboard">
              <svg style="width:11px; height:11px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy JSON</span>
            </button>
            <button class="vest-log-btn btn-danger" id="vest-pop-clear-btn" title="Clear all logs">
              <span>Clear</span>
            </button>
            <button class="vest-log-btn" id="vest-pop-dock-btn" title="Dock back inside main page">
              <span>📥 Dock Back</span>
            </button>
          </div>
        </div>

        <div class="vest-log-filter-bar">
          <input type="text" class="vest-log-search" id="vest-pop-search-input" placeholder="Filter by ID (#buy-button), tag, class, text, symbol..." value="${escapeHtml(logSearchQuery)}">
          <div class="vest-log-filter-chips">
            <div class="vest-log-chip ${logFilterType === 'ALL' ? 'active' : ''}" data-filter="ALL">All</div>
            <div class="vest-log-chip ${logFilterType === 'CLICK' ? 'active' : ''}" data-filter="CLICK">Clicks</div>
            <div class="vest-log-chip ${logFilterType === 'INPUT' ? 'active' : ''}" data-filter="INPUT">Inputs</div>
            <div class="vest-log-chip ${logFilterType === 'KEY' ? 'active' : ''}" data-filter="KEY">Keys</div>
            <div class="vest-log-chip ${logFilterType === 'CHART' ? 'active' : ''}" data-filter="CHART">Chart</div>
          </div>
        </div>

        <div class="vest-log-list" id="vest-pop-items-list">
          <!-- Rendered items -->
        </div>

        <div class="vest-log-footer">
          <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
            <input type="checkbox" id="vest-pop-autoscroll" ${autoScrollLogs ? 'checked' : ''} style="cursor:pointer;">
            <span>Auto-scroll to bottom</span>
          </label>
          <span>Click row to inspect attributes & selector | Streaming live</span>
        </div>
      </div>
    `;

    // Hook popout controls
    const popPauseBtn = doc.querySelector('#vest-pop-pause-btn');
    if (popPauseBtn) {
      popPauseBtn.addEventListener('click', () => {
        isLogRecording = !isLogRecording;
        popPauseBtn.classList.toggle('active', isLogRecording);
        popPauseBtn.querySelector('span').textContent = isLogRecording ? '● REC' : '❚❚ Paused';
        const dot = doc.querySelector('#vest-pop-dot');
        if (dot) dot.classList.toggle('paused', !isLogRecording);
      });
    }

    const popCopyBtn = doc.querySelector('#vest-pop-copy-json-btn');
    if (popCopyBtn) {
      popCopyBtn.addEventListener('click', () => {
        if (!actionLogs.length) {
          alert('No logs to copy');
          return;
        }
        const json = JSON.stringify(actionLogs, null, 2);
        popoutWindow.navigator.clipboard.writeText(json).then(() => {
          showToast(`Copied ${actionLogs.length} events to clipboard (JSON)!`);
        }).catch(() => {
          showToast('Failed to copy to clipboard');
        });
      });
    }

    const popClearBtn = doc.querySelector('#vest-pop-clear-btn');
    if (popClearBtn) {
      popClearBtn.addEventListener('click', () => {
        actionLogs = [];
        expandedLogIds.clear();
        refreshPopoutLogList();
        updatePopoutLogCount();
      });
    }

    const popDockBtn = doc.querySelector('#vest-pop-dock-btn');
    if (popDockBtn) {
      popDockBtn.addEventListener('click', dockBackIn);
    }

    const popSearchInput = doc.querySelector('#vest-pop-search-input');
    if (popSearchInput) {
      popSearchInput.addEventListener('input', (e) => {
        logSearchQuery = e.target.value;
        refreshPopoutLogList();
      });
    }

    const popChips = doc.querySelectorAll('.vest-log-chip');
    popChips.forEach(chip => {
      chip.addEventListener('click', () => {
        popChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        logFilterType = chip.dataset.filter;
        refreshPopoutLogList();
      });
    });

    const popAutoscroll = doc.querySelector('#vest-pop-autoscroll');
    if (popAutoscroll) {
      popAutoscroll.addEventListener('change', (e) => {
        autoScrollLogs = e.target.checked;
      });
    }

    popoutWindow.addEventListener('beforeunload', () => {
      isPoppedOut = false;
      popoutWindow = null;
      if (isLogBoxOpen) {
        renderActionLogBox();
      }
    });

    refreshPopoutLogList();
    updateHeaderTickerDisplay();
  }

  function dockBackIn() {
    if (popoutWindow && !popoutWindow.closed) {
      try { popoutWindow.close(); } catch (e) {}
    }
    isPoppedOut = false;
    popoutWindow = null;
    if (isLogBoxOpen) {
      renderActionLogBox();
      showToast('Action Logger docked back into main window');
    }
  }

  function updatePopoutLogCount() {
    if (!popoutWindow || popoutWindow.closed) return;
    try {
      const countEl = popoutWindow.document.querySelector('#vest-pop-total-count');
      if (countEl) countEl.textContent = `(${actionLogs.length})`;
    } catch (e) {}
  }

  function refreshPopoutLogList() {
    if (!popoutWindow || popoutWindow.closed) return;
    const doc = popoutWindow.document;
    const listEl = doc.querySelector('#vest-pop-items-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const filtered = actionLogs.filter(matchesLogFilter);

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="vest-log-empty">
          <div style="font-size:20px; margin-bottom:6px;">🖱️</div>
          <div style="font-weight:600; color:#94a3b8; margin-bottom:2px;">No logged events yet</div>
          <div>Click buttons, tabs, tools, or inputs on the page to inspect IDs!</div>
        </div>
      `;
      return;
    }

    const frag = doc.createDocumentFragment();
    filtered.forEach(entry => {
      frag.appendChild(createLogItemElement(entry, popoutWindow));
    });
    listEl.appendChild(frag);

    if (autoScrollLogs) {
      listEl.scrollTop = listEl.scrollHeight;
    }
  }

  function appendLogItemToPopout(entry) {
    if (!popoutWindow || popoutWindow.closed) return;
    const listEl = popoutWindow.document.querySelector('#vest-pop-items-list');
    if (!listEl) return;

    const empty = listEl.querySelector('.vest-log-empty');
    if (empty) empty.remove();

    const itemEl = createLogItemElement(entry, popoutWindow);
    listEl.appendChild(itemEl);

    if (autoScrollLogs) {
      listEl.scrollTop = listEl.scrollHeight;
    }
  }

  function renderActionLogBox() {
    if (!logBoxEl) {
      logBoxEl = document.createElement('div');
      logBoxEl.id = 'vest-action-log-box';
      document.body.appendChild(logBoxEl);
      initLogBoxDrag();
    }

    logBoxEl.style.display = 'flex';

    logBoxEl.innerHTML = `
      <div class="vest-log-header" id="vest-log-drag-header">
        <div class="vest-log-title">
          <div class="vest-log-rec-dot ${isLogRecording ? '' : 'paused'}" id="vest-log-dot"></div>
          <span>⚡ Action & ID Logger</span>
          <span class="vest-log-count" id="vest-log-total-count">(${actionLogs.length})</span>
          <span id="vest-log-header-ticker"></span>
        </div>
        <div class="vest-log-controls">
          <button class="vest-log-btn ${isLogRecording ? 'active' : ''}" id="vest-log-pause-btn" title="${isLogRecording ? 'Pause Recording' : 'Resume Recording'}">
            <span>${isLogRecording ? '● REC' : '❚❚ Paused'}</span>
          </button>
          <button class="vest-log-btn" id="vest-log-popout-btn" title="Pop out into separate window (multi-monitor support)">
            <span>⧉ Pop Out</span>
          </button>
          <button class="vest-log-btn" id="vest-log-copy-json-btn" title="Copy all logs in JSON format to clipboard">
            <svg style="width:11px; height:11px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy JSON</span>
          </button>
          <button class="vest-log-btn btn-danger" id="vest-log-clear-btn" title="Clear all logs">
            <span>Clear</span>
          </button>
          <button class="vest-log-btn" id="vest-log-min-btn" title="Minimize/Expand">
            <span>_</span>
          </button>
          <button class="vest-log-btn" id="vest-log-close-btn" title="Close Logger">
            <span>✕</span>
          </button>
        </div>
      </div>

      <div class="vest-log-filter-bar">
        <input type="text" class="vest-log-search" id="vest-log-search-input" placeholder="Filter by ID (#buy-button), tag, class, text, symbol..." value="${escapeHtml(logSearchQuery)}">
        <div class="vest-log-filter-chips">
          <div class="vest-log-chip ${logFilterType === 'ALL' ? 'active' : ''}" data-filter="ALL">All</div>
          <div class="vest-log-chip ${logFilterType === 'CLICK' ? 'active' : ''}" data-filter="CLICK">Clicks</div>
          <div class="vest-log-chip ${logFilterType === 'INPUT' ? 'active' : ''}" data-filter="INPUT">Inputs</div>
          <div class="vest-log-chip ${logFilterType === 'KEY' ? 'active' : ''}" data-filter="KEY">Keys</div>
          <div class="vest-log-chip ${logFilterType === 'CHART' ? 'active' : ''}" data-filter="CHART">Chart</div>
        </div>
      </div>

      <div class="vest-log-list" id="vest-log-items-list">
        <!-- Rendered items -->
      </div>

      <div class="vest-log-footer">
        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
          <input type="checkbox" id="vest-log-autoscroll" ${autoScrollLogs ? 'checked' : ''} style="cursor:pointer;">
          <span>Auto-scroll to bottom</span>
        </label>
        <span>Click row to view all attributes & selector</span>
      </div>
    `;

    // Hook header buttons
    const pauseBtn = logBoxEl.querySelector('#vest-log-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        isLogRecording = !isLogRecording;
        pauseBtn.classList.toggle('active', isLogRecording);
        pauseBtn.querySelector('span').textContent = isLogRecording ? '● REC' : '❚❚ Paused';
        const dot = logBoxEl.querySelector('#vest-log-dot');
        if (dot) dot.classList.toggle('paused', !isLogRecording);
        showToast(isLogRecording ? 'Action logging resumed' : 'Action logging paused');
      });
    }

    const popoutBtn = logBoxEl.querySelector('#vest-log-popout-btn');
    if (popoutBtn) {
      popoutBtn.addEventListener('click', openPopoutWindow);
    }

    const copyBtn = logBoxEl.querySelector('#vest-log-copy-json-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!actionLogs.length) {
          showToast('No logs to copy');
          return;
        }
        const json = JSON.stringify(actionLogs, null, 2);
        navigator.clipboard.writeText(json).then(() => {
          showToast(`Copied ${actionLogs.length} events to clipboard (JSON)!`);
        }).catch(() => {
          showToast('Failed to copy to clipboard');
        });
      });
    }

    const clearBtn = logBoxEl.querySelector('#vest-log-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        actionLogs = [];
        expandedLogIds.clear();
        refreshFullLogList();
        updateLogCountDisplay();
        showToast('Action logs cleared');
      });
    }

    const minBtn = logBoxEl.querySelector('#vest-log-min-btn');
    if (minBtn) {
      minBtn.addEventListener('click', () => {
        logBoxEl.classList.toggle('minimized');
      });
    }

    const closeBtn = logBoxEl.querySelector('#vest-log-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toggleActionLogBox(false);
      });
    }

    const searchInput = logBoxEl.querySelector('#vest-log-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        logSearchQuery = e.target.value;
        refreshFullLogList();
      });
    }

    const chips = logBoxEl.querySelectorAll('.vest-log-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        logFilterType = chip.dataset.filter;
        refreshFullLogList();
      });
    });

    const autoscrollCb = logBoxEl.querySelector('#vest-log-autoscroll');
    if (autoscrollCb) {
      autoscrollCb.addEventListener('change', (e) => {
        autoScrollLogs = e.target.checked;
      });
    }

    refreshFullLogList();
    updateHeaderTickerDisplay();
  }

  function refreshFullLogList() {
    if (!logBoxEl) return;
    const listEl = logBoxEl.querySelector('#vest-log-items-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const filtered = actionLogs.filter(matchesLogFilter);

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="vest-log-empty">
          <div style="font-size:20px; margin-bottom:6px;">🖱️</div>
          <div style="font-weight:600; color:#94a3b8; margin-bottom:2px;">No logged events yet</div>
          <div>Click buttons, tabs, tools, or inputs on the page to inspect IDs!</div>
        </div>
      `;
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(entry => {
      frag.appendChild(createLogItemElement(entry, window));
    });
    listEl.appendChild(frag);

    if (autoScrollLogs) {
      listEl.scrollTop = listEl.scrollHeight;
    }
  }

  function appendLogItemToDom(entry) {
    if (!logBoxEl) return;
    const listEl = logBoxEl.querySelector('#vest-log-items-list');
    if (!listEl) return;

    const empty = listEl.querySelector('.vest-log-empty');
    if (empty) empty.remove();

    const itemEl = createLogItemElement(entry, window);
    listEl.appendChild(itemEl);

    if (autoScrollLogs) {
      listEl.scrollTop = listEl.scrollHeight;
    }
  }

  function createLogItemElement(entry, targetWin = window) {
    const doc = targetWin.document;
    const item = doc.createElement('div');
    const isExpanded = expandedLogIds.has(entry.id || entry.timestamp);
    item.className = 'vest-log-item' + (isExpanded ? ' expanded' : '');

    const typeStr = (entry.type || 'click').toLowerCase();
    const badgeClass = `vest-log-badge vest-log-badge-${typeStr}`;
    const idHtml = entry.elementId ? `<span class="vest-log-target-id">#${escapeHtml(entry.elementId)}</span>` : '';
    const classHtml = entry.classes && entry.classes.length ? `<span class="vest-log-target-class">.${escapeHtml(entry.classes.slice(0, 2).join('.'))}</span>` : '';
    const textHtml = entry.text ? `<span class="vest-log-target-text">"${escapeHtml(entry.text)}"</span>` : '';
    const valHtml = entry.value !== undefined ? `<span style="color:#fbbf24; font-weight:600;">[val: ${escapeHtml(String(entry.value))}]</span>` : '';
    const keyHtml = entry.key ? `<span style="color:#38bdf8; font-weight:600;">[${escapeHtml((entry.modifiers || '') + entry.key)}]</span>` : '';

    item.innerHTML = `
      <div class="vest-log-row-main">
        <span class="vest-log-time">${entry.timestamp || ''}</span>
        <span class="${badgeClass}">${escapeHtml((entry.type || '').toUpperCase())}</span>
        <span class="vest-log-target-tag">&lt;${escapeHtml(entry.tag || 'el')}&gt;</span>
        ${idHtml}
        ${classHtml}
        ${textHtml}
        ${valHtml}
        ${keyHtml}
        <button class="vest-log-row-copy-btn" title="Copy Selector to Clipboard">Copy</button>
      </div>
      ${isExpanded ? renderLogDetailBoxHtml(entry) : ''}
    `;

    // Copy selector button
    const copyBtn = item.querySelector('.vest-log-row-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sel = entry.elementId ? `#${entry.elementId}` : entry.selector;
        targetWin.navigator.clipboard.writeText(sel).then(() => {
          showToast(`Copied selector: ${sel}`);
        });
      });
    }

    // Click row to toggle expanded detail view
    item.addEventListener('click', () => {
      const entryKey = entry.id || entry.timestamp;
      if (expandedLogIds.has(entryKey)) {
        expandedLogIds.delete(entryKey);
      } else {
        expandedLogIds.add(entryKey);
      }
      if (isPoppedOut && popoutWindow) {
        refreshPopoutLogList();
      } else {
        refreshFullLogList();
      }
    });

    return item;
  }

  function renderLogDetailBoxHtml(entry) {
    const rows = [];
    rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Selector:</span><span class="vest-log-detail-val" style="color:#38bdf8; font-weight:600;">${escapeHtml(entry.selector || '')}</span></div>`);
    if (entry.elementId) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">ID:</span><span class="vest-log-detail-val" style="color:#fbbf24; font-weight:600;">#${escapeHtml(entry.elementId)}</span></div>`);
    if (entry.tag) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Tag:</span><span class="vest-log-detail-val">&lt;${escapeHtml(entry.tag)}&gt;</span></div>`);
    if (entry.classes && entry.classes.length) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Classes:</span><span class="vest-log-detail-val">.${escapeHtml(entry.classes.join(' .'))}</span></div>`);
    if (entry.text) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Text:</span><span class="vest-log-detail-val">"${escapeHtml(entry.text)}"</span></div>`);
    if (entry.value !== undefined) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Value:</span><span class="vest-log-detail-val" style="color:#fbbf24;">${escapeHtml(String(entry.value))}</span></div>`);
    if (entry.instrument) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Instrument:</span><span class="vest-log-detail-val" style="color:#a78bfa; font-weight:600;">${escapeHtml(entry.instrument)}</span></div>`);
    if (entry.price) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Price:</span><span class="vest-log-detail-val" style="color:#34d399; font-weight:600;">$${escapeHtml(entry.price)}</span></div>`);
    if (entry.coordinates) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Coords:</span><span class="vest-log-detail-val">X: ${entry.coordinates.x}px, Y: ${entry.coordinates.y}px</span></div>`);
    if (entry.source) rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Source:</span><span class="vest-log-detail-val">${escapeHtml(entry.source)}</span></div>`);

    if (entry.interactive) {
      rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Interactive:</span><span class="vest-log-detail-val" style="color:#a78bfa;">&lt;${escapeHtml(entry.interactive.tag)}&gt; ${entry.interactive.elementId ? '#' + escapeHtml(entry.interactive.elementId) : ''} "${escapeHtml(entry.interactive.text || '')}"</span></div>`);
    }

    if (entry.attributes && Object.keys(entry.attributes).length) {
      const attrList = Object.entries(entry.attributes)
        .map(([k, v]) => `<span style="color:#94a3b8;">${escapeHtml(k)}</span>=<span style="color:#10b981;">"${escapeHtml(String(v))}"</span>`)
        .join(' ');
      rows.push(`<div class="vest-log-detail-row"><span class="vest-log-detail-key">Attributes:</span><span class="vest-log-detail-val" style="font-size:10px;">${attrList}</span></div>`);
    }

    return `<div class="vest-log-details-box">${rows.join('')}</div>`;
  }

  function initLogBoxDrag() {
    if (!logBoxEl) return;
    const header = logBoxEl.querySelector('#vest-log-drag-header');
    if (!header) return;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.vest-log-controls')) return;
      e.preventDefault();
      const rect = logBoxEl.getBoundingClientRect();
      activeLogDrag = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      };

      document.body.style.userSelect = 'none';

      const onMouseMove = (ev) => {
        if (!activeLogDrag) return;
        let nx = ev.clientX - activeLogDrag.offsetX;
        let ny = ev.clientY - activeLogDrag.offsetY;

        nx = Math.max(10, Math.min(window.innerWidth - logBoxEl.offsetWidth - 10, nx));
        ny = Math.max(10, Math.min(window.innerHeight - logBoxEl.offsetHeight - 10, ny));

        logBoxEl.style.left = `${nx}px`;
        logBoxEl.style.top = `${ny}px`;
        logBoxEl.style.right = 'auto';
        logBoxEl.style.bottom = 'auto';
      };

      const onMouseUp = () => {
        activeLogDrag = null;
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // -------------------------------------------------------------
  // Top-Window Native Event Logging (Catches all non-chart UI)
  // -------------------------------------------------------------
  function setupIsolatedActionTracking() {
    if (!isTopWindow) return;

    function handleTopEvent(e, type) {
      if (!isLogRecording) return;
      const target = e.target;
      if (!target || target.nodeType !== 1) return;

      // Ignore extension internal elements
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
        return;
      }

      // Check if target is inside an iframe (main world handles iframes)
      if (target.tagName === 'IFRAME') return;

      const interactive = target.closest('button, a, input, select, textarea, [role="button"], [role="tab"], [role="slider"], [role="switch"], [role="checkbox"], div[class*="button"], div[class*="tab"], div[class*="row"], tr') || target;

      const timestamp = new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');

      const logData = {
        timestamp,
        type: type || e.type,
        source: 'Top Window UI',
        tag: target.tagName.toLowerCase(),
        elementId: target.id || '',
        classes: typeof target.className === 'string' ? target.className.trim().split(/\s+/).filter(Boolean) : [],
        text: (target.innerText || target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        selector: generateIsolatedSelector(target),
        attributes: extractIsolatedAttributes(target),
        coordinates: e.clientX !== undefined ? { x: Math.round(e.clientX), y: Math.round(e.clientY) } : undefined
      };

      if (interactive && interactive !== target) {
        logData.interactive = {
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
        logData.name = target.name || undefined;
        logData.inputType = target.type || undefined;
        if (target.type !== 'password') {
          logData.value = target.value;
        }
      }

      handleIncomingActionLog(logData);
    }

    document.addEventListener('click', (e) => handleTopEvent(e, 'click'), true);
    document.addEventListener('contextmenu', (e) => handleTopEvent(e, 'contextmenu'), true);
    document.addEventListener('input', (e) => handleTopEvent(e, 'input'), true);
    document.addEventListener('change', (e) => handleTopEvent(e, 'change'), true);
  }

  function generateIsolatedSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el === document.body) return 'body';
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
        const dataTestId = curr.getAttribute('data-testid');
        if (dataTestId) {
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

  function extractIsolatedAttributes(el) {
    if (!el || el.nodeType !== 1) return {};
    const attrs = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }


  // -------------------------------------------------------------
  // In-Page Template Editor Modal (Pencil Button Handler)
  // -------------------------------------------------------------
  function parseCssColor(c, fallback = '#22c55e') {
    if (!c || typeof c !== 'string') return { hex: fallback, alpha: null };
    const trimmed = c.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return { hex: trimmed.toLowerCase(), alpha: null };
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return {
        hex: '#' + trimmed.slice(1).split('').map(ch => ch + ch).join('').toLowerCase(),
        alpha: null
      };
    }
    if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
      const hex = trimmed.slice(0, 7).toLowerCase();
      const a = parseInt(trimmed.slice(7, 9), 16) / 255;
      return { hex, alpha: Math.round(a * 100) / 100 };
    }
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (rgbMatch) {
      const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10)));
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      const alpha = rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4]))) : null;
      return { hex, alpha };
    }
    return { hex: fallback, alpha: null };
  }

  function normalizeHexColor(c, fallback = '#22c55e') {
    return parseCssColor(c, fallback).hex;
  }

  // -------------------------------------------------------------
  // TradingView Default Color Picker Popover
  // -------------------------------------------------------------
  const TV_PALETTE_TOP_ROWS = [
    ['#ffffff', '#d1d4dc', '#b2b5be', '#9598a1', '#787b86', '#5d606b', '#434651', '#2a2e39', '#131722', '#000000'],
    ['#f23645', '#ff9800', '#ffeb3b', '#4caf50', '#089981', '#00bcd4', '#2962ff', '#673ab7', '#9c27b0', '#e91e63']
  ];

  const TV_PALETTE_SHADE_ROWS = [
    ['#fccbcd', '#ffe0b2', '#fff9c4', '#c8e6c9', '#b2dfdb', '#b2ebf2', '#bbdefb', '#d1c4e9', '#e1bee7', '#f8bbd0'],
    ['#fbaaaf', '#ffcc80', '#fff59d', '#a5d6a7', '#80cbc4', '#80deea', '#90caf9', '#b39ddb', '#ce93d8', '#f48fb1'],
    ['#f77c80', '#ffb74d', '#fff176', '#81c784', '#4db6ac', '#4dd0e1', '#64b5f6', '#9575cd', '#ba68c8', '#f06292'],
    ['#f23645', '#ffa726', '#ffee58', '#66bb6a', '#26a69a', '#26c6da', '#42a5f5', '#7e57c2', '#ab47bc', '#ec407a'],
    ['#b22833', '#f57c00', '#fbc02d', '#388e3c', '#00796b', '#0097a7', '#1976d2', '#512da8', '#7b1fa2', '#c2185b'],
    ['#801922', '#e65100', '#f57f17', '#1b5e20', '#004d40', '#006064', '#0d47a1', '#311b92', '#4a148c', '#880e4f']
  ];

  let activeTvColorPopover = null;
  let activeTvColorTargetInput = null;

  function closeTvColorPickerPopover() {
    if (activeTvColorPopover) {
      activeTvColorPopover.remove();
      activeTvColorPopover = null;
    }
    activeTvColorTargetInput = null;
  }

  function openTvColorPickerPopover(colorInput) {
    if (!colorInput || !isTopWindow) return;

    if (activeTvColorPopover && activeTvColorTargetInput === colorInput) {
      closeTvColorPickerPopover();
      return;
    }
    closeTvColorPickerPopover();

    activeTvColorTargetInput = colorInput;
    const popover = document.createElement('div');
    popover.className = 'vest-tv-color-popover';
    activeTvColorPopover = popover;

    // Resolve optional linked opacity input (e.g. data-opacity-input="#vest-afvg-reclaimed-opacity")
    let linkedOpacityInput = null;
    const opacitySelector = colorInput.dataset ? colorInput.dataset.opacityInput : null;
    if (opacitySelector) {
      const rootScope = colorInput.closest('.vest-tvs-overlay') || document;
      linkedOpacityInput = rootScope.querySelector(opacitySelector) || document.querySelector(opacitySelector);
    }

    const getCurrentHex = () => normalizeHexColor(colorInput.value, '#2962ff').toLowerCase();
    const getCurrentOpacity = () => {
      if (linkedOpacityInput) {
        const v = Number(linkedOpacityInput.value);
        return isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 100;
      }
      const attrOp = Number(colorInput.dataset?.opacityValue);
      return isFinite(attrOp) ? Math.max(0, Math.min(100, Math.round(attrOp))) : 100;
    };

    const minOp = linkedOpacityInput && linkedOpacityInput.min !== '' ? Number(linkedOpacityInput.min) : 0;
    const maxOp = linkedOpacityInput && linkedOpacityInput.max !== '' ? Number(linkedOpacityInput.max) : 100;

    function applyColorSelection(newHex, closeAfter = false) {
      const clean = normalizeHexColor(newHex, getCurrentHex());
      colorInput.value = clean;
      colorInput.dispatchEvent(new Event('input', { bubbles: true }));
      colorInput.dispatchEvent(new Event('change', { bubbles: true }));
      updatePopoverState();
      if (closeAfter) {
        closeTvColorPickerPopover();
      }
    }

    function applyOpacitySelection(newOp) {
      const clamped = Math.max(minOp, Math.min(maxOp, Math.round(Number(newOp) || 0)));
      if (linkedOpacityInput) {
        linkedOpacityInput.value = String(clamped);
        linkedOpacityInput.dispatchEvent(new Event('input', { bubbles: true }));
        linkedOpacityInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (colorInput.dataset) {
        colorInput.dataset.opacityValue = String(clamped);
      }
      updatePopoverState();
    }

    function renderPopoverContent() {
      const curHex = getCurrentHex();
      const curOp = getCurrentOpacity();
      const customColors = Array.isArray(settings.customColorSwatches) ? settings.customColorSwatches : [];

      const renderSwatchBtn = (hex) => {
        const lower = hex.toLowerCase();
        const isDark = lower === '#131722' || lower === '#000000' || lower === '#2a2e39';
        const isActive = lower === curHex;
        return `<button type="button" class="vest-tvcp-swatch ${isDark ? 'is-dark-swatch' : ''} ${isActive ? 'active' : ''}" data-hex="${lower}" style="background:${lower};" title="${lower.toUpperCase()}"></button>`;
      };

      popover.innerHTML = `
        <div class="vest-tvcp-grid">
          ${TV_PALETTE_TOP_ROWS.flat().map(renderSwatchBtn).join('')}
        </div>
        <div class="vest-tvcp-grid vest-tvcp-grid-group-gap">
          ${TV_PALETTE_SHADE_ROWS.flat().map(renderSwatchBtn).join('')}
        </div>
        <div class="vest-tvcp-divider"></div>
        <div class="vest-tvcp-custom-row">
          ${customColors.map(renderSwatchBtn).join('')}
          <button type="button" class="vest-tvcp-add-btn" id="vest-tvcp-add-custom" title="Add custom color">+</button>
          <input type="color" id="vest-tvcp-native-picker" data-vest-native-bypass="1" value="${curHex}" style="position:fixed; opacity:0; width:1px; height:1px; pointer-events:none;" tabindex="-1" />
        </div>
        <div class="vest-tvcp-opacity-section" style="${linkedOpacityInput ? '' : 'display:none;'}">
          <div class="vest-tvcp-opacity-label">Opacity</div>
          <div class="vest-tvcp-opacity-controls">
            <div class="vest-tvcp-opacity-track-wrap">
              <div class="vest-tvcp-opacity-gradient" id="vest-tvcp-op-grad" style="background: linear-gradient(90deg, ${hexToRgba(curHex, 0)} 0%, ${curHex} 100%);"></div>
              <input type="range" class="vest-tvcp-opacity-range" id="vest-tvcp-op-range" min="${minOp}" max="${maxOp}" value="${curOp}" />
            </div>
            <div class="vest-tvcp-opacity-box">
              <input type="number" class="vest-tvcp-opacity-num" id="vest-tvcp-op-num" min="${minOp}" max="${maxOp}" value="${curOp}" />
              <span>%</span>
            </div>
          </div>
        </div>
      `;

      popover.querySelectorAll('.vest-tvcp-swatch').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          applyColorSelection(btn.dataset.hex, false);
        });
      });

      const addBtn = popover.querySelector('#vest-tvcp-add-custom');
      const nativePicker = popover.querySelector('#vest-tvcp-native-picker');
      if (addBtn && nativePicker) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          nativePicker.value = getCurrentHex();
          nativePicker.click();
        });
        nativePicker.addEventListener('input', (e) => {
          e.stopPropagation();
          applyColorSelection(nativePicker.value, false);
        });
        nativePicker.addEventListener('change', (e) => {
          e.stopPropagation();
          const picked = normalizeHexColor(nativePicker.value, getCurrentHex()).toLowerCase();
          if (!Array.isArray(settings.customColorSwatches)) {
            settings.customColorSwatches = [];
          }
          if (!settings.customColorSwatches.includes(picked)) {
            settings.customColorSwatches.push(picked);
            if (settings.customColorSwatches.length > 18) {
              settings.customColorSwatches.shift();
            }
            queueSettingsSave({ customColorSwatches: settings.customColorSwatches });
          }
          applyColorSelection(picked, false);
          renderPopoverContent();
        });
      }

      const opRange = popover.querySelector('#vest-tvcp-op-range');
      const opNum = popover.querySelector('#vest-tvcp-op-num');
      if (opRange) {
        opRange.addEventListener('input', (e) => {
          e.stopPropagation();
          applyOpacitySelection(opRange.value);
        });
      }
      if (opNum) {
        opNum.addEventListener('input', (e) => {
          e.stopPropagation();
          applyOpacitySelection(opNum.value);
        });
      }
    }

    function updatePopoverState() {
      if (!activeTvColorPopover) return;
      const curHex = getCurrentHex();
      const curOp = getCurrentOpacity();
      activeTvColorPopover.querySelectorAll('.vest-tvcp-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.hex === curHex);
      });
      const grad = activeTvColorPopover.querySelector('#vest-tvcp-op-grad');
      if (grad) {
        grad.style.background = `linear-gradient(90deg, ${hexToRgba(curHex, 0)} 0%, ${curHex} 100%)`;
      }
      const opRange = activeTvColorPopover.querySelector('#vest-tvcp-op-range');
      if (opRange && document.activeElement !== opRange) {
        opRange.value = String(curOp);
      }
      const opNum = activeTvColorPopover.querySelector('#vest-tvcp-op-num');
      if (opNum && document.activeElement !== opNum) {
        opNum.value = String(curOp);
      }
    }

    renderPopoverContent();
    popover.addEventListener('click', (e) => e.stopPropagation());
    popover.addEventListener('mousedown', (e) => e.stopPropagation());
    document.body.appendChild(popover);

    // Position anchored to the color swatch button
    const rect = colorInput.getBoundingClientRect();
    const popW = 244;
    const popH = popover.offsetHeight || (linkedOpacityInput ? 310 : 250);
    let left = Math.round(rect.left);
    let top = Math.round(rect.bottom + 6);

    if (left + popW > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popW - 10);
    }
    if (top + popH > window.innerHeight - 10) {
      top = Math.max(10, Math.round(rect.top - popH - 6));
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  if (isTopWindow) {
    // Intercept clicks on any .vest-ed-color input to open the TradingView Default Color Picker Popover
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target || target.nodeType !== 1) return;

      const colorInput = target.closest('input.vest-ed-color');
      if (colorInput && !colorInput.dataset.vestNativeBypass) {
        e.preventDefault();
        e.stopPropagation();
        openTvColorPickerPopover(colorInput);
        return;
      }

      if (activeTvColorPopover && !activeTvColorPopover.contains(target)) {
        closeTvColorPickerPopover();
      }
    }, true);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeTvColorPopover) {
        e.stopPropagation();
        closeTvColorPickerPopover();
      }
    }, true);
  }

  /**
   * Hydrates a template object (including older saved templates or templates with rgba() / rawProperties)
   * so all editor fields (color, backgroundColor, opacity, middleLine, text, etc.) are normalized.
   */
  function hydrateTemplateForEditor(tpl) {
    if (!tpl || typeof tpl !== 'object') return tpl;
    const copy = JSON.parse(JSON.stringify(tpl));
    let raw = (copy.rawProperties && typeof copy.rawProperties === 'object') ? copy.rawProperties : {};

    const hadOrderLineContamination = Boolean(
      'bodyBorderActiveBuyColor' in raw ||
      'cancelButtonBorderActiveBuyColor' in raw ||
      'quantityBackgroundActiveBuyColor' in raw ||
      'lineActiveBuyColor' in raw
    );

    // If rawProperties was accidentally captured from a TradingView Order/Position Line, wipe rawProperties so it never corrupts drawings
    if (hadOrderLineContamination) {
      raw = {};
      copy.rawProperties = {};
      // If an Order Line contamination overwrote a RED template with the #22c55e fallback, restore red (#f23645)
      if (/\bred\b/i.test(String(copy.name || '')) && (!copy.color || copy.color.toLowerCase() === '#22c55e')) {
        copy.color = '#f23645';
        copy.backgroundColor = '#f23645';
        copy.middleLineColor = '#f23645';
      }
      // If an Order Line contamination wiped "3m FVG GREEN" text/extendRight, restore its FVG defaults
      if (/^3m\s+fvg\s+green$/i.test(String(copy.name || '').trim()) && !copy.text) {
        copy.extendLeft = false;
        copy.extendRight = true;
        copy.showMiddleLine = true;
        copy.linewidth = 2;
        copy.opacity = 50;
        copy.showLabel = true;
        copy.text = '3m FVG';
        copy.textColor = '#ffffff';
        copy.fontSize = 14;
      }
    } else {
      // Strip read-only TradingView entity metadata keys and dotted keys from rawProperties
      const cleanedRaw = {};
      for (const [k, v] of Object.entries(raw)) {
        if (k.includes('.')) continue;
        if (['symbol', 'symbolStateVersion', 'zOrderVersion', 'currencyId', 'unitId', 'interval', 'points', 'intervalsVisibilities', 'ownerSource', 'linkKey', 'id', 'type', 'zorder', 'isSelectionEnabled', 'userEditEnabled'].includes(k)) {
          continue;
        }
        if (v === 'inherit') continue;
        cleanedRaw[k] = v;
      }
      raw = cleanedRaw;
      copy.rawProperties = cleanedRaw;
    }

    // Helper: if top-level color is the generic default '#22c55e' while rawProperties has an actual non-default color (e.g. rgba(...)), prefer rawProperties!
    const pickBestColor = (topVal, ...rawCandidates) => {
      const topHex = topVal ? parseCssColor(topVal, '').hex : '';
      for (const rc of rawCandidates) {
        if (!rc || typeof rc !== 'string') continue;
        const parsed = parseCssColor(rc, '');
        if (parsed.hex && (!topHex || (topHex === '#22c55e' && parsed.hex !== '#22c55e'))) {
          return rc;
        }
      }
      return topVal || rawCandidates.find(Boolean) || '#22c55e';
    };

    const rawPrimary = pickBestColor(copy.color, raw.color, raw.linecolor, raw.borderColor);
    const parsedPrimary = parseCssColor(rawPrimary, '#22c55e');
    copy.color = parsedPrimary.hex;

    const rawBg = pickBestColor(copy.backgroundColor, raw.backgroundColor, raw.fillColor, rawPrimary);
    const parsedBg = parseCssColor(rawBg, copy.color);
    copy.backgroundColor = parsedBg.hex;

    // If opacity was defaulted to 20 because raw.backgroundColor was rgba(...) without raw.transparency, recover actual alpha!
    if (raw.fillBackground === false) {
      copy.opacity = 0;
    } else if (typeof copy.opacity === 'number' && copy.opacity !== 20) {
      copy.opacity = Math.max(0, Math.min(100, Math.round(copy.opacity)));
    } else if (typeof raw.transparency === 'number') {
      copy.opacity = Math.max(0, Math.min(100, Math.round(100 - raw.transparency)));
    } else if (parsedBg.alpha !== null && (copy.opacity === undefined || copy.opacity === 20)) {
      copy.opacity = Math.max(0, Math.min(100, Math.round(parsedBg.alpha * 100)));
    } else if (typeof copy.opacity !== 'number') {
      copy.opacity = 20;
    }

    copy.linewidth = Number(copy.linewidth ?? raw.linewidth ?? raw.borderWidth ?? 1) || 1;
    copy.linestyle = Number(copy.linestyle ?? raw.linestyle ?? raw.borderStyle ?? 0);

    const rawMidObj = raw.middleLine && typeof raw.middleLine === 'object' ? raw.middleLine : {};
    if (copy.showMiddleLine === undefined) {
      copy.showMiddleLine = Boolean(
        rawMidObj.showLine ||
        rawMidObj.visible ||
        raw.showMiddleLine ||
        raw['middleLine.showLine'] ||
        raw.showMidline
      );
    } else {
      copy.showMiddleLine = Boolean(copy.showMiddleLine);
    }
    const rawMidColor = pickBestColor(copy.middleLineColor, rawMidObj.lineColor, rawMidObj.color, raw.middleLineColor, raw.midlinecolor, copy.color);
    copy.middleLineColor = parseCssColor(rawMidColor, copy.color).hex;
    copy.middleLineWidth = Number(copy.middleLineWidth ?? rawMidObj.lineWidth ?? raw.middleLineWidth ?? raw.midlinewidth ?? 1) || 1;
    copy.middleLineStyle = Number(copy.middleLineStyle ?? rawMidObj.lineStyle ?? raw.middleLineStyle ?? raw.midlinestyle ?? 2);

    copy.extendLeft = Boolean(copy.extendLeft ?? raw.extendLeft);
    copy.extendRight = Boolean(copy.extendRight ?? raw.extendRight ?? raw.extendLines);

    const rawText = copy.text !== undefined ? String(copy.text || '') : (raw.text !== undefined ? String(raw.text || '') : '');
    copy.text = rawText;
    copy.showLabel = Boolean(copy.showLabel || raw.showLabel || raw.showText || rawText.trim().length > 0);
    const rawTxtColor = pickBestColor(copy.textColor, raw.textColor, raw.textcolor, copy.color);
    copy.textColor = parseCssColor(rawTxtColor, copy.color).hex;
    copy.fontSize = Number(copy.fontSize ?? raw.fontSize ?? raw.fontsize ?? 12) || 12;
    copy.horzLabelsAlign = copy.horzLabelsAlign || raw.horzLabelsAlign || raw.horzTextAlign || 'right';
    copy.vertLabelsAlign = copy.vertLabelsAlign || raw.vertLabelsAlign || raw.vertTextAlign || 'middle';
    if (!copy.drawingType) copy.drawingType = 'rectangle';

    return copy;
  }

  function closeTemplateEditorModal() {
    if (editorModalEl) {
      editorModalEl.remove();
      editorModalEl = null;
    }
    const existingMgr = document.getElementById('vest-template-manager-dialog');
    if (existingMgr) existingMgr.remove();
    currentEditingTemplateId = null;
  }

  function openTemplateEditorModal(templateId) {
    const targetTpl = templates.find(t => t.id === templateId);
    openTemplateManagerModal(targetTpl ? (targetTpl.drawingType || 'rectangle') : 'all', templateId);
  }

  // -------------------------------------------------------------
  // TradingView Settings-Style "Template Manager" Dialog Box
  // -------------------------------------------------------------
  function openTemplateManagerModal(initialCategory = 'all', initialEditTemplateId = null) {
    if (!isTopWindow) return;
    closeTemplateEditorModal();

    let activeCategory = initialCategory || 'all';
    let editingId = initialEditTemplateId || null;

    // Draft copy of the template currently being edited (or null when viewing list)
    let editDraft = null;
    let isCreatingNew = false;

    function startEditingTemplate(tplId) {
      const found = templates.find(t => t.id === tplId);
      if (!found) return;
      isCreatingNew = false;
      editingId = found.id;
      currentEditingTemplateId = found.id;
      editDraft = hydrateTemplateForEditor(found);
      renderManagerDialog();
    }

    function startCreatingNewTemplate(defaultType) {
      const dt = (defaultType && defaultType !== 'all') ? defaultType : 'rectangle';
      const label = getDrawingTypeLabel(dt);
      isCreatingNew = true;
      editingId = `custom_${Date.now()}`;
      currentEditingTemplateId = editingId;
      editDraft = {
        id: editingId,
        name: `Custom ${label}`,
        drawingType: dt,
        color: '#22c55e',
        backgroundColor: '#22c55e',
        opacity: 20,
        linewidth: 1,
        linestyle: 0,
        showMiddleLine: false,
        middleLineColor: '#22c55e',
        middleLineWidth: 1,
        middleLineStyle: 2,
        extendLeft: false,
        extendRight: false,
        showLabel: false,
        text: '',
        textColor: '#22c55e',
        fontSize: 12,
        horzLabelsAlign: 'right',
        vertLabelsAlign: 'middle',
        rawProperties: {}
      };
      renderManagerDialog();
    }

    if (initialEditTemplateId) {
      const found = templates.find(t => t.id === initialEditTemplateId);
      if (found) {
        editingId = found.id;
        currentEditingTemplateId = found.id;
        editDraft = hydrateTemplateForEditor(found);
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'vest-template-manager-dialog';
    overlay.className = 'vest-tvs-overlay';
    editorModalEl = overlay;

    let modalOffset = { x: 0, y: 0 };
    let isDraggingModal = false;
    let dragStartMouse = { x: 0, y: 0 };
    let dragStartOffset = { x: 0, y: 0 };
    let justFinishedDragging = false;

    function closeManagerOverlay() {
      if (typeof closeTvColorPickerPopover === 'function') closeTvColorPickerPopover();
      window.removeEventListener('mousemove', onModalMouseMove, true);
      window.removeEventListener('mouseup', onModalMouseUp, true);
      window.removeEventListener('cortex-live-settings-updated', onLiveSettingsUpdated);
      overlay.remove();
      if (editorModalEl === overlay) editorModalEl = null;
      currentEditingTemplateId = null;
    }

    function onModalMouseMove(e) {
      if (!isDraggingModal) return;
      const dx = e.clientX - dragStartMouse.x;
      const dy = e.clientY - dragStartMouse.y;
      modalOffset.x = dragStartOffset.x + dx;
      modalOffset.y = dragStartOffset.y + dy;
      const cardEl = overlay.querySelector('.vest-tvs-card');
      if (cardEl) {
        cardEl.style.transform = `translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0)`;
      }
    }

    function onModalMouseUp() {
      if (!isDraggingModal) return;
      isDraggingModal = false;
      justFinishedDragging = true;
      setTimeout(() => {
        justFinishedDragging = false;
      }, 60);
    }

    window.addEventListener('mousemove', onModalMouseMove, true);
    window.addEventListener('mouseup', onModalMouseUp, true);

    function getSidebarCategories() {
      // Always include All Templates + common drawing types + any drawing types that have saved templates
      const CORE_TYPES = [
        'rectangle',
        'horiz_line',
        'horiz_ray',
        'trend_line',
        'ray',
        'parallel_channel',
        'fib_retracement',
        'long_position',
        'short_position',
        'callout',
        'text'
      ];
      const countByType = {};
      templates.forEach(t => {
        const dt = t.drawingType || 'rectangle';
        countByType[dt] = (countByType[dt] || 0) + 1;
      });

      const typeSet = new Set(CORE_TYPES);
      Object.keys(countByType).forEach(dt => typeSet.add(dt));
      if (activeCategory !== 'all') typeSet.add(activeCategory);

      const items = [
        {
          id: 'all',
          label: 'All Templates',
          count: templates.length
        }
      ];

      Array.from(typeSet).forEach(dt => {
        items.push({
          id: dt,
          label: getDrawingTypeLabel(dt),
          count: countByType[dt] || 0
        });
      });

      return items;
    }

    function syncFormFieldsToDraft() {
      if (!editDraft) return;
      const q = (sel) => overlay.querySelector(sel);
      if (q('#vest-tm-name')) editDraft.name = q('#vest-tm-name').value.trim() || editDraft.name;
      if (q('#vest-tm-type')) editDraft.drawingType = q('#vest-tm-type').value || 'rectangle';
      if (q('#vest-tm-color')) editDraft.color = normalizeHexColor(q('#vest-tm-color').value, '#22c55e');
      if (q('#vest-tm-bg-color')) editDraft.backgroundColor = normalizeHexColor(q('#vest-tm-bg-color').value, editDraft.color);
      if (q('#vest-tm-opacity')) editDraft.opacity = Number(q('#vest-tm-opacity').value ?? 20);
      if (q('#vest-tm-linewidth')) editDraft.linewidth = Number(q('#vest-tm-linewidth').value || 1);
      if (q('#vest-tm-linestyle')) editDraft.linestyle = Number(q('#vest-tm-linestyle').value ?? 0);
      if (q('#vest-tm-show-mid')) editDraft.showMiddleLine = Boolean(q('#vest-tm-show-mid').checked);
      if (q('#vest-tm-mid-color')) editDraft.middleLineColor = normalizeHexColor(q('#vest-tm-mid-color').value, editDraft.color);
      if (q('#vest-tm-mid-width')) editDraft.middleLineWidth = Number(q('#vest-tm-mid-width').value || 1);
      if (q('#vest-tm-mid-style')) editDraft.middleLineStyle = Number(q('#vest-tm-mid-style').value ?? 2);
      if (q('#vest-tm-extend-left')) editDraft.extendLeft = Boolean(q('#vest-tm-extend-left').checked);
      if (q('#vest-tm-extend-right')) editDraft.extendRight = Boolean(q('#vest-tm-extend-right').checked);
      if (q('#vest-tm-show-label')) editDraft.showLabel = Boolean(q('#vest-tm-show-label').checked);
      if (q('#vest-tm-text')) {
        editDraft.text = q('#vest-tm-text').value || '';
        // If user typed label text into the input, automatically enable showLabel so it gets applied!
        if (editDraft.text.trim().length > 0 && q('#vest-tm-show-label')) {
          editDraft.showLabel = Boolean(q('#vest-tm-show-label').checked);
        }
      }
      if (q('#vest-tm-text-color')) editDraft.textColor = normalizeHexColor(q('#vest-tm-text-color').value, editDraft.color);
      if (q('#vest-tm-fontsize')) editDraft.fontSize = Number(q('#vest-tm-fontsize').value || 12);
      if (q('#vest-tm-horz-align')) editDraft.horzLabelsAlign = q('#vest-tm-horz-align').value || 'right';
      if (q('#vest-tm-vert-align')) editDraft.vertLabelsAlign = q('#vest-tm-vert-align').value || 'middle';

      // Keep rawProperties in sync with the edited fields so rawProperties never holds stale colors/text
      if (editDraft.rawProperties && typeof editDraft.rawProperties === 'object') {
        const rp = editDraft.rawProperties;
        if ('color' in rp) rp.color = editDraft.color;
        if ('linecolor' in rp) rp.linecolor = editDraft.color;
        if ('borderColor' in rp) rp.borderColor = editDraft.color;
        if ('backgroundColor' in rp) rp.backgroundColor = editDraft.backgroundColor;
        rp.transparency = Math.max(0, Math.min(100, 100 - editDraft.opacity));
        if ('fillBackground' in rp) rp.fillBackground = editDraft.opacity > 0;
        rp.linewidth = editDraft.linewidth;
        rp.linestyle = editDraft.linestyle;
        rp.extendLeft = editDraft.extendLeft;
        rp.extendRight = editDraft.extendRight;
        rp.showMiddleLine = editDraft.showMiddleLine;
        if (rp.middleLine && typeof rp.middleLine === 'object') {
          rp.middleLine.showLine = editDraft.showMiddleLine;
          rp.middleLine.lineColor = editDraft.middleLineColor;
          rp.middleLine.lineWidth = editDraft.middleLineWidth;
          rp.middleLine.lineStyle = editDraft.middleLineStyle;
        }
        rp.showLabel = editDraft.showLabel;
        rp.text = editDraft.text;
        rp.textColor = editDraft.textColor;
        if ('textcolor' in rp) rp.textcolor = editDraft.textColor;
        rp.fontSize = editDraft.fontSize;
        if ('fontsize' in rp) rp.fontsize = editDraft.fontSize;
        rp.horzLabelsAlign = editDraft.horzLabelsAlign;
        rp.vertLabelsAlign = editDraft.vertLabelsAlign;
      }
    }

    function renderRightPaneContent() {
      // If editing or creating a template, render the full Drawing Template Editor inside the right pane
      if (editDraft) {
        const dt = editDraft.drawingType || 'rectangle';
        const dtLabel = getDrawingTypeLabel(dt);
        const borderHex = normalizeHexColor(editDraft.color, '#22c55e');
        const bgHex = normalizeHexColor(editDraft.backgroundColor || editDraft.color, borderHex);
        const midHex = normalizeHexColor(editDraft.middleLineColor || editDraft.color, borderHex);
        const txtHex = normalizeHexColor(editDraft.textColor || editDraft.color, borderHex);
        const opacityVal = typeof editDraft.opacity === 'number' ? editDraft.opacity : 20;
        const lineW = Number(editDraft.linewidth) || 1;
        const lineS = Number(editDraft.linestyle ?? 0);
        const midW = Number(editDraft.middleLineWidth) || 1;
        const midS = editDraft.middleLineStyle !== undefined ? Number(editDraft.middleLineStyle) : 2;
        const fontSz = Number(editDraft.fontSize) || 12;
        const horzAlign = editDraft.horzLabelsAlign || 'right';
        const vertAlign = editDraft.vertLabelsAlign || 'middle';
        const rawKeyCount = editDraft.rawProperties ? Object.keys(editDraft.rawProperties).length : 0;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <button type="button" class="vest-tvs-action-btn" id="vest-tm-back-btn" style="height:28px; padding:0 10px; font-size:12px;">
                ← Back to List
              </button>
              <div class="vest-tvs-section-title" style="margin:0;">
                ${isCreatingNew ? 'NEW DRAWING TEMPLATE' : `EDIT TEMPLATE · ${escapeHtml(dtLabel.toUpperCase())}`}
              </div>
            </div>
            <button type="button" class="vest-tvs-action-btn" id="vest-tm-copy-selected-btn" style="height:28px; border-color:rgba(56,189,248,0.45); color:#38bdf8; font-size:11.5px;" title="Copy all properties from the currently selected drawing on the chart">
              Copy from Selected Drawing
            </button>
          </div>

          <div class="vest-ed-grid-2" style="margin-bottom:12px;">
            <div class="vest-ed-field">
              <label class="vest-ed-label">Template Name</label>
              <input type="text" class="vest-ed-input" id="vest-tm-name" value="${escapeHtml(editDraft.name)}" placeholder="e.g. 5m FVG GREEN" />
            </div>
            <div class="vest-ed-field">
              <label class="vest-ed-label">Drawing Type</label>
              <select class="vest-ed-select" id="vest-tm-type">
                ${DRAWING_TYPE_CATALOG.map(item => `
                  <option value="${item.id}" ${item.id === dt ? 'selected' : ''}>${escapeHtml(item.label)} (${escapeHtml(item.group)})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="vest-ed-grid-3" style="margin-bottom:12px;">
            <div class="vest-ed-field">
              <label class="vest-ed-label">Line / Border Color</label>
              <input type="color" class="vest-ed-color" id="vest-tm-color" value="${borderHex}" />
            </div>
            <div class="vest-ed-field">
              <label class="vest-ed-label">Background / Fill Color</label>
              <input type="color" class="vest-ed-color" id="vest-tm-bg-color" data-opacity-input="#vest-tm-opacity" value="${bgHex}" />
            </div>
            <div class="vest-ed-field">
              <label class="vest-ed-label">Fill Opacity: <span id="vest-tm-opacity-val">${opacityVal}%</span></label>
              <input type="range" class="vest-ed-range" id="vest-tm-opacity" min="0" max="100" value="${opacityVal}" />
            </div>
          </div>

          <div class="vest-ed-grid-2" style="margin-bottom:12px;">
            <div class="vest-ed-field">
              <label class="vest-ed-label">Line / Border Width</label>
              <select class="vest-ed-select" id="vest-tm-linewidth">
                <option value="1" ${lineW === 1 ? 'selected' : ''}>1 px</option>
                <option value="2" ${lineW === 2 ? 'selected' : ''}>2 px</option>
                <option value="3" ${lineW === 3 ? 'selected' : ''}>3 px</option>
                <option value="4" ${lineW === 4 ? 'selected' : ''}>4 px</option>
              </select>
            </div>
            <div class="vest-ed-field">
              <label class="vest-ed-label">Line / Border Style</label>
              <select class="vest-ed-select" id="vest-tm-linestyle">
                <option value="0" ${lineS === 0 ? 'selected' : ''}>Solid (───)</option>
                <option value="1" ${lineS === 1 ? 'selected' : ''}>Dotted (···)</option>
                <option value="2" ${lineS === 2 ? 'selected' : ''}>Dashed (- - -)</option>
              </select>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px;">
            <div class="vest-ed-section-header">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-tm-show-mid" ${editDraft.showMiddleLine ? 'checked' : ''} />
                <span>50% Equilibrium / Center Line (Boxes & Channels)</span>
              </label>
            </div>
            <div class="vest-ed-grid-3" id="vest-tm-mid-controls" style="${editDraft.showMiddleLine ? '' : 'opacity:0.45; pointer-events:none;'}">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Center Color</label>
                <input type="color" class="vest-ed-color" id="vest-tm-mid-color" value="${midHex}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Width</label>
                <select class="vest-ed-select" id="vest-tm-mid-width">
                  <option value="1" ${midW === 1 ? 'selected' : ''}>1 px</option>
                  <option value="2" ${midW === 2 ? 'selected' : ''}>2 px</option>
                  <option value="3" ${midW === 3 ? 'selected' : ''}>3 px</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Style</label>
                <select class="vest-ed-select" id="vest-tm-mid-style">
                  <option value="0" ${midS === 0 ? 'selected' : ''}>Solid</option>
                  <option value="1" ${midS === 1 ? 'selected' : ''}>Dotted</option>
                  <option value="2" ${midS === 2 ? 'selected' : ''}>Dashed</option>
                </select>
              </div>
            </div>
          </div>

          <div class="vest-ed-grid-2" style="margin-bottom:12px;">
            <label class="vest-ed-checkbox-label">
              <input type="checkbox" id="vest-tm-extend-left" ${editDraft.extendLeft ? 'checked' : ''} />
              <span>⬅ Extend Left</span>
            </label>
            <label class="vest-ed-checkbox-label">
              <input type="checkbox" id="vest-tm-extend-right" ${editDraft.extendRight ? 'checked' : ''} />
              <span>➜ Extend Right</span>
            </label>
          </div>

          <div class="vest-ed-section">
            <div class="vest-ed-section-header">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-tm-show-label" ${editDraft.showLabel ? 'checked' : ''} />
                <span>Include Saved Text Label when Applied</span>
              </label>
            </div>
            <div class="vest-ed-row" style="margin-top:6px;">
              <input type="text" class="vest-ed-input" id="vest-tm-text" value="${escapeHtml(editDraft.text || '')}" placeholder="Label text (leave unchecked above to keep existing drawing text)" />
            </div>
            <div class="vest-ed-grid-4" style="margin-top:6px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Text Color</label>
                <input type="color" class="vest-ed-color" id="vest-tm-text-color" value="${txtHex}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Font Size</label>
                <select class="vest-ed-select" id="vest-tm-fontsize">
                  ${[10, 11, 12, 14, 16, 18, 20, 24].map(sz => `<option value="${sz}" ${fontSz === sz ? 'selected' : ''}>${sz}px</option>`).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Horiz Align</label>
                <select class="vest-ed-select" id="vest-tm-horz-align">
                  <option value="right" ${horzAlign === 'right' ? 'selected' : ''}>Far Right</option>
                  <option value="center" ${horzAlign === 'center' ? 'selected' : ''}>Center</option>
                  <option value="left" ${horzAlign === 'left' ? 'selected' : ''}>Left</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Vert Align</label>
                <select class="vest-ed-select" id="vest-tm-vert-align">
                  <option value="top" ${vertAlign === 'top' ? 'selected' : ''}>Top</option>
                  <option value="middle" ${vertAlign === 'middle' ? 'selected' : ''}>Middle</option>
                  <option value="bottom" ${vertAlign === 'bottom' ? 'selected' : ''}>Bottom</option>
                </select>
              </div>
            </div>
          </div>

          ${rawKeyCount > 0 ? `
            <div style="margin-top:10px; font-size:11px; color:#64748b; display:flex; align-items:center; justify-content:space-between;">
              <span>✓ Full TradingView drawing state captured (${rawKeyCount} native tool properties stored)</span>
            </div>
          ` : ''}
        `;
      }

      // Otherwise render the Template List for the selected drawing category
      const filtered = activeCategory === 'all'
        ? templates
        : templates.filter(t => (t.drawingType || 'rectangle') === activeCategory);

      const categoryTitle = activeCategory === 'all'
        ? 'ALL DRAWING TEMPLATES'
        : `${getDrawingTypeLabel(activeCategory).toUpperCase()} TEMPLATES`;

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <div class="vest-tvs-section-title" style="margin:0;">${escapeHtml(categoryTitle)} (${filtered.length})</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="vest-tvs-action-btn" id="vest-tm-save-selected-chart-btn" style="height:30px; border-color:rgba(56,189,248,0.45); color:#38bdf8; font-size:12px;" title="Save the currently selected drawing on the chart as a template">
              + Save Selected Chart Drawing
            </button>
            <button type="button" class="vest-tvs-action-btn" id="vest-tm-new-btn" style="height:30px; border-color:rgba(16,185,129,0.5); color:#34d399; font-size:12px;">
              + New Template
            </button>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div class="vest-tvs-about-card" style="align-items:center; text-align:center; padding:34px 24px; gap:10px;">
            <div style="font-size:15px; font-weight:600; color:#f1f5f9;">No saved templates ${activeCategory === 'all' ? 'yet' : `for ${escapeHtml(getDrawingTypeLabel(activeCategory))}`}</div>
            <p class="vest-tvs-about-desc" style="max-width:400px; color:#94a3b8;">
              Right-click any drawing on the TradingView chart and choose <strong>Template → Save as...</strong>, or click <strong>+ New Template</strong> above to create one.
            </p>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${filtered.map(t => {
              const dt = t.drawingType || 'rectangle';
              const dtLabel = getDrawingTypeLabel(dt);
              const borderHex = normalizeHexColor(t.color, '#22c55e');
              const opacity = typeof t.opacity === 'number' ? t.opacity : 20;
              const fillRgba = hexToRgba(t.backgroundColor || borderHex, opacity / 100);
              const styleNames = ['Solid', 'Dotted', 'Dashed'];
              const lineStyleLabel = styleNames[Number(t.linestyle) || 0] || 'Solid';
              const metaBadges = [
                `${Number(t.linewidth) || 1}px ${lineStyleLabel}`
              ];
              if (['rectangle', 'rotated_rectangle', 'parallel_channel', 'circle', 'ellipse', 'callout'].includes(dt)) {
                metaBadges.push(`${opacity}% Fill`);
              }
              if (t.showMiddleLine) metaBadges.push('50% Center');
              if (t.extendRight) metaBadges.push('Extend ➜');
              if (t.extendLeft) metaBadges.push('Extend ⬅');
              if (t.showLabel && t.text) metaBadges.push(`Label: "${t.text}"`);

              return `
                <div class="vest-tvs-toggle-box" data-tpl-id="${escapeHtml(t.id)}" style="padding:12px 14px; margin-bottom:0; transition:border-color 0.15s ease;">
                  <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
                    <div style="width:24px; height:24px; border-radius:5px; border:2px solid ${borderHex}; background:${fillRgba}; position:relative; flex-shrink:0;">
                      ${t.showMiddleLine ? `<div style="position:absolute; top:50%; left:0; right:0; height:1px; background:${normalizeHexColor(t.middleLineColor || borderHex)}; transform:translateY(-50%);"></div>` : ''}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:3px; min-width:0; flex:1;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:14px; font-weight:600; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(t.name)}</span>
                        <span style="font-size:10.5px; font-weight:600; padding:1px 7px; border-radius:999px; background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; flex-shrink:0;">
                          ${escapeHtml(dtLabel)}
                        </span>
                      </div>
                      <div style="font-size:11.5px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${escapeHtml(metaBadges.join(' • '))}
                      </div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                    <button type="button" class="vest-tvs-action-btn vest-tm-apply-btn" data-id="${escapeHtml(t.id)}" title="Apply to currently selected ${escapeHtml(dtLabel)} on the chart" style="height:28px; padding:0 10px; font-size:11.5px; border-color:rgba(16,185,129,0.45); color:#34d399;">
                      Apply
                    </button>
                    <button type="button" class="vest-tvs-action-btn vest-tm-edit-btn" data-id="${escapeHtml(t.id)}" title="Edit template settings" style="height:28px; padding:0 10px; font-size:11.5px;">
                      Edit
                    </button>
                    <button type="button" class="vest-tvs-action-btn vest-tm-dup-btn" data-id="${escapeHtml(t.id)}" title="Duplicate template" style="height:28px; padding:0 9px; font-size:11.5px;">
                      Copy
                    </button>
                    <button type="button" class="vest-tvs-action-btn vest-tm-del-btn" data-id="${escapeHtml(t.id)}" title="Delete template" style="height:28px; padding:0 9px; font-size:12px; border-color:rgba(239,68,68,0.35); color:#f87171;">
                      ×
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
    }

    function renderManagerDialog() {
      const navItems = getSidebarCategories();
      overlay.innerHTML = `
        <div class="vest-tvs-card" role="dialog" aria-label="Trading Cortex Template Manager" style="width: 80vw; height: 80vh; max-width: 80vw; max-height: 80vh; min-width: min(760px, 94vw); min-height: min(520px, 92vh); transform: translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0);">
          <div class="vest-tvs-header" id="vest-tm-drag-handle" title="Drag to move">
            <div class="vest-tvs-title">Template Manager</div>
            <button type="button" class="vest-tvs-close-btn" id="vest-tm-close" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="vest-tvs-body">
            <div class="vest-tvs-sidebar" style="width: 230px;">
              ${navItems.map(item => `
                <button type="button" class="vest-tvs-nav-item ${item.id === activeCategory && !editDraft ? 'active' : ''}" data-cat="${escapeHtml(item.id)}" style="justify-content:space-between;">
                  <span class="vest-tvs-nav-label">${escapeHtml(item.label)}</span>
                  <span style="font-size:11px; font-family:'JetBrains Mono', monospace; color:${item.count > 0 ? '#38bdf8' : '#64748b'}; background:rgba(255,255,255,0.05); padding:1px 6px; border-radius:999px;">
                    ${item.count}
                  </span>
                </button>
              `).join('')}
            </div>

            <div class="vest-tvs-content" id="vest-tm-right-pane">
              ${renderRightPaneContent()}
            </div>
          </div>

          <div class="vest-tvs-footer" style="justify-content:space-between;">
            <div style="font-size:12px; color:#94a3b8;">
              ${editDraft
                ? `Editing <strong>${escapeHtml(editDraft.name)}</strong> (${escapeHtml(getDrawingTypeLabel(editDraft.drawingType))})`
                : `${templates.length} saved drawing ${templates.length === 1 ? 'template' : 'templates'}`
              }
            </div>
            <div class="vest-tvs-footer-right">
              ${editDraft ? `
                <button type="button" class="vest-tvs-btn-cancel" id="vest-tm-cancel-edit">Cancel</button>
                <button type="button" class="vest-tvs-btn-ok" id="vest-tm-save-edit">Save Template</button>
              ` : `
                <button type="button" class="vest-tvs-btn-ok" id="vest-tm-done">Done</button>
              `}
            </div>
          </div>
        </div>
      `;

      wireManagerEvents();
    }

    function saveCurrentEditDraft() {
      if (!editDraft) return;
      syncFormFieldsToDraft();

      const existingIdx = templates.findIndex(t => t.id === editDraft.id);
      if (existingIdx !== -1) {
        templates[existingIdx] = { ...editDraft };
      } else {
        templates.push({ ...editDraft });
      }

      settings.activeTemplateId = editDraft.id;
      safeStorageSet({ templates, settings });
      notifyMainWorldConfig();
      renderStudioHeaderPill();

      const savedName = editDraft.name;
      const savedType = editDraft.drawingType || 'rectangle';
      editDraft = null;
      editingId = null;
      currentEditingTemplateId = null;
      isCreatingNew = false;
      activeCategory = savedType;
      renderManagerDialog();
      showToast(`Saved template "${savedName}" (${getDrawingTypeLabel(savedType)})`);
    }

    function wireManagerEvents() {
      const dragHandle = overlay.querySelector('#vest-tm-drag-handle');
      if (dragHandle) {
        dragHandle.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          if (e.target.closest('#vest-tm-close')) return;
          isDraggingModal = true;
          dragStartMouse = { x: e.clientX, y: e.clientY };
          dragStartOffset = { x: modalOffset.x, y: modalOffset.y };
          e.preventDefault();
        });
      }

      overlay.querySelector('#vest-tm-close')?.addEventListener('click', closeManagerOverlay);
      overlay.querySelector('#vest-tm-done')?.addEventListener('click', closeManagerOverlay);

      // Left sidebar category switching
      overlay.querySelectorAll('.vest-tvs-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          activeCategory = btn.dataset.cat || 'all';
          editDraft = null;
          editingId = null;
          currentEditingTemplateId = null;
          isCreatingNew = false;
          renderManagerDialog();
        });
      });

      // List view buttons
      overlay.querySelector('#vest-tm-new-btn')?.addEventListener('click', () => {
        startCreatingNewTemplate(activeCategory);
      });

      overlay.querySelector('#vest-tm-save-selected-chart-btn')?.addEventListener('click', () => {
        const name = prompt('Enter a name for the selected chart drawing template:', 'Custom Template');
        if (name && name.trim()) {
          postToMainWorlds({
            type: 'VEST_TV_SAVE_SELECTION_AS_TEMPLATE',
            payload: { name: name.trim() }
          });
          setTimeout(() => {
            if (overlay.isConnected) renderManagerDialog();
          }, 250);
        }
      });

      overlay.querySelectorAll('.vest-tm-apply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const tpl = templates.find(t => t.id === id);
          if (!tpl) return;
          settings.activeTemplateId = tpl.id;
          safeStorageSet({ settings });
          postToMainWorlds({
            type: 'VEST_TV_APPLY_TEMPLATE',
            payload: { templateId: tpl.id, applyToSelectedOnly: true, activateTool: false }
          });
          showToast(`Applied "${tpl.name}" to selected ${getDrawingTypeLabel(tpl.drawingType)}`);
        });
      });

      overlay.querySelectorAll('.vest-tm-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          startEditingTemplate(btn.dataset.id);
        });
      });

      overlay.querySelectorAll('.vest-tm-dup-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const orig = templates.find(t => t.id === btn.dataset.id);
          if (!orig) return;
          const copy = {
            ...JSON.parse(JSON.stringify(orig)),
            id: `custom_${Date.now()}`,
            name: `${orig.name} (Copy)`
          };
          templates.push(copy);
          safeStorageSet({ templates });
          notifyMainWorldConfig();
          renderStudioHeaderPill();
          renderManagerDialog();
          showToast(`Duplicated "${orig.name}"`);
        });
      });

      overlay.querySelectorAll('.vest-tm-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const tpl = templates.find(t => t.id === id);
          if (!tpl) return;
          templates = templates.filter(t => t.id !== id);
          if (settings.activeTemplateId === id) {
            settings.activeTemplateId = templates[0]?.id || null;
          }
          if (settings.defaultTemplateId === id) {
            settings.defaultTemplateId = templates[0]?.id || null;
          }
          safeStorageSet({ templates, settings });
          notifyMainWorldConfig();
          renderStudioHeaderPill();
          renderManagerDialog();
          showToast(`Removed "${tpl.name}"`);
        });
      });

      // Editor view events
      overlay.querySelector('#vest-tm-back-btn')?.addEventListener('click', () => {
        editDraft = null;
        editingId = null;
        currentEditingTemplateId = null;
        isCreatingNew = false;
        renderManagerDialog();
      });

      overlay.querySelector('#vest-tm-cancel-edit')?.addEventListener('click', () => {
        editDraft = null;
        editingId = null;
        currentEditingTemplateId = null;
        isCreatingNew = false;
        renderManagerDialog();
      });

      overlay.querySelector('#vest-tm-save-edit')?.addEventListener('click', () => {
        saveCurrentEditDraft();
      });

      overlay.querySelector('#vest-tm-copy-selected-btn')?.addEventListener('click', () => {
        syncFormFieldsToDraft();
        postToMainWorlds({
          type: 'VEST_TV_REQUEST_SHAPE_PROPERTIES_FOR_EDITOR'
        });
      });

      const opacityInput = overlay.querySelector('#vest-tm-opacity');
      const opacityValEl = overlay.querySelector('#vest-tm-opacity-val');
      if (opacityInput && opacityValEl) {
        opacityInput.addEventListener('input', () => {
          opacityValEl.textContent = `${opacityInput.value}%`;
        });
      }

      const showMidCheck = overlay.querySelector('#vest-tm-show-mid');
      const midControls = overlay.querySelector('#vest-tm-mid-controls');
      if (showMidCheck && midControls) {
        showMidCheck.addEventListener('change', () => {
          midControls.style.opacity = showMidCheck.checked ? '1' : '0.45';
          midControls.style.pointerEvents = showMidCheck.checked ? 'auto' : 'none';
        });
      }
    }

    // Store a helper on overlay so populateEditorModalFromProperties can update editDraft live
    overlay.__populateFromShapeProperties = (p) => {
      if (!editDraft || !p) return;
      syncFormFieldsToDraft();
      editDraft = {
        ...editDraft,
        drawingType: p.drawingType || editDraft.drawingType || 'rectangle',
        color: p.color || editDraft.color,
        backgroundColor: p.backgroundColor || p.color || editDraft.backgroundColor,
        opacity: p.opacity ?? editDraft.opacity,
        linewidth: p.linewidth || editDraft.linewidth,
        linestyle: p.linestyle ?? editDraft.linestyle,
        showMiddleLine: Boolean(p.showMiddleLine),
        middleLineColor: p.middleLineColor || p.color || editDraft.middleLineColor,
        middleLineWidth: p.middleLineWidth || editDraft.middleLineWidth,
        middleLineStyle: p.middleLineStyle ?? editDraft.middleLineStyle,
        extendLeft: Boolean(p.extendLeft),
        extendRight: Boolean(p.extendRight),
        showLabel: Boolean(p.showLabel),
        text: p.text !== undefined ? p.text : editDraft.text,
        textColor: p.textColor || p.color || editDraft.textColor,
        fontSize: p.fontSize || editDraft.fontSize,
        horzLabelsAlign: p.horzLabelsAlign || editDraft.horzLabelsAlign,
        vertLabelsAlign: p.vertLabelsAlign || editDraft.vertLabelsAlign,
        rawProperties: p.rawProperties || editDraft.rawProperties || {}
      };
      renderManagerDialog();
      showToast(`Copied ${getDrawingTypeLabel(editDraft.drawingType)} properties from chart!`);
    };

    renderManagerDialog();
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !justFinishedDragging) {
        closeManagerOverlay();
      }
    });
  }

  function populateEditorModalFromProperties(p) {
    if (!editorModalEl || !p) return;
    if (typeof editorModalEl.__populateFromShapeProperties === 'function') {
      editorModalEl.__populateFromShapeProperties(p);
      return;
    }
  }

  // -------------------------------------------------------------
  // Utils
  // -------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function hexToRgba(hex, alpha) {
    const cleanHex = normalizeHexColor(hex, '#22c55e');
    const c = cleanHex.replace('#', '');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // -------------------------------------------------------------
  // Vest & Prop Firm Active Account Tracking & Auto-Restoration
  // -------------------------------------------------------------
  let lastObservedAccountName = null;
  let hasCompletedAccountRestoration = false;
  let vestAccountTrackerTimer = null;

  function getActiveAccountTriggerElement() {
    return (
      document.querySelector('[data-testid="account-selector-trigger"]') ||
      document.querySelector('button[data-testid*="account"]') ||
      document.querySelector('[class*="account-selector"]') ||
      document.querySelector('[class*="accountSelector"]')
    );
  }

  function readCurrentSelectedAccount() {
    const trigger = getActiveAccountTriggerElement();
    if (trigger) {
      const copyBtn = trigger.querySelector('[text]');
      const id = copyBtn ? copyBtn.getAttribute('text') : null;
      const textSpan = trigger.querySelector('span');
      const name = (textSpan ? textSpan.innerText : trigger.innerText || '').replace(/[↕▼⌄▾]/g, '').trim();
      if (name) {
        return { name, id: id || name };
      }
    }

    const headerBtns = document.querySelectorAll('header button, [class*="header"] button, [class*="nav"] button');
    for (const btn of headerBtns) {
      const txt = (btn.innerText || '').trim();
      if (
        txt &&
        txt.length < 50 &&
        (/evaluation|funded|dll|account|dex|capital/i.test(txt)) &&
        !/deposit|withdraw|connect|login|sign in|buy|sell|order/i.test(txt)
      ) {
        return { name: txt, id: txt };
      }
    }
    return null;
  }

  function trackActiveAccount() {
    if (!isExtensionValid()) return;
    const currentFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    if (!currentFirm || currentFirm.restoreSelectedAccount === false) return;

    const current = readCurrentSelectedAccount();
    if (!current || !current.name) return;

    if (current.name !== lastObservedAccountName) {
      lastObservedAccountName = current.name;
      const record = {
        firmId: currentFirm.id,
        name: current.name,
        id: current.id,
        timestamp: Date.now()
      };
      settings.vestLastActiveAccount = record;
      safeStorageSet({ settings });
      cortexDebugLog(`Tracked active account for ${currentFirm.name}: "${current.name}"`);
    }
  }

  let restoreAccountAttempts = 0;
  function attemptRestoreSelectedAccount() {
    if (hasCompletedAccountRestoration) return;
    if (!isExtensionValid()) return;

    const currentFirm = typeof getActivePerpFirm === 'function' ? getActivePerpFirm() : null;
    if (!currentFirm || currentFirm.restoreSelectedAccount !== true) {
      hasCompletedAccountRestoration = true;
      return;
    }

    const saved = settings.vestLastActiveAccount;
    if (!saved || !saved.name || saved.firmId !== currentFirm.id) {
      hasCompletedAccountRestoration = true;
      return;
    }

    // Safety guard: reject generic words or too-short names that could match "Disconnect Account" or other generic labels
    const trimmedSavedName = String(saved.name).trim();
    if (!trimmedSavedName || /^(account|wallet|evaluation|funded|capital|dex|user|profile)$/i.test(trimmedSavedName) || trimmedSavedName.length < 3) {
      cortexDebugLog(`Skipping automated account restore: saved name "${trimmedSavedName}" is too generic.`);
      hasCompletedAccountRestoration = true;
      return;
    }

    const trigger = getActiveAccountTriggerElement();
    if (!trigger) {
      if (restoreAccountAttempts < 5) {
        restoreAccountAttempts++;
        setTimeout(attemptRestoreSelectedAccount, 400);
      } else {
        hasCompletedAccountRestoration = true;
      }
      return;
    }

    const current = readCurrentSelectedAccount();
    if (current && (current.name === saved.name || (saved.id && current.id === saved.id))) {
      cortexDebugLog(`Active account already matches saved "${saved.name}". No switch needed.`);
      hasCompletedAccountRestoration = true;
      lastObservedAccountName = current.name;
      return;
    }

    cortexDebugLog(`Attempting to restore selected account to "${saved.name}" (current: "${current?.name || 'unknown'}")`);
    trigger.click();

    setTimeout(() => {
      const items = document.querySelectorAll(
        '[data-testid^="account-item-"], [role="menuitem"], [class*="menu-item"], [class*="account-item"], [class*="DropdownMenuItem"]'
      );
      let matchedItem = null;
      const DANGEROUS_ACTIONS = /disconnect|logout|log out|sign out|exit|leave|unlink|switch wallet|revoke|remove/i;

      for (const item of items) {
        const itemText = (item.innerText || '').trim();
        // NEVER click disconnect, log out, or wallet unlinking buttons
        if (DANGEROUS_ACTIONS.test(itemText)) {
          continue;
        }

        const copyAttr = item.querySelector('[text]')?.getAttribute('text');
        if (
          (saved.id && copyAttr === saved.id) ||
          (saved.id && item.getAttribute('data-testid')?.includes(saved.id)) ||
          itemText === saved.name ||
          (itemText.toLowerCase().includes(trimmedSavedName.toLowerCase()) && !DANGEROUS_ACTIONS.test(itemText))
        ) {
          matchedItem = item;
          break;
        }
      }

      if (matchedItem) {
        matchedItem.click();
        hasCompletedAccountRestoration = true;
        lastObservedAccountName = saved.name;
        showToast(`Restored account: ${saved.name}`, 3000);
        cortexDebugLog(`Successfully restored account to "${saved.name}"`);
      } else {
        // Close menu if open and do not retry repeatedly
        trigger.click();
        hasCompletedAccountRestoration = true;
      }
    }, 150);
  }

  function initVestAccountTracker() {
    if (!isTopWindow) return;
    setTimeout(attemptRestoreSelectedAccount, 800);
    setTimeout(attemptRestoreSelectedAccount, 2000);

    if (!vestAccountTrackerTimer) {
      vestAccountTrackerTimer = setInterval(() => {
        if (!isExtensionValid()) {
          clearInterval(vestAccountTrackerTimer);
          vestAccountTrackerTimer = null;
          return;
        }
        trackActiveAccount();
      }, 1500);
    }
  }

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    try {
      const data = await safeStorageGet(['templates', 'settings', 'globalDrawings', 'updaterState', 'installedVersionOverride', 'updateChannel', 'cortexAccountSnapshots']);
      globalDrawings = normalizeGlobalDrawings(data.globalDrawings);
      loadAccountSnapshotsFromLocalStorage();
      if (data.cortexAccountSnapshots && typeof data.cortexAccountSnapshots === 'object') {
        handleIncomingAccountSnapshots(data.cortexAccountSnapshots);
      }
      if (data.installedVersionOverride) {
        installedVersionOverride = data.installedVersionOverride;
      }
      if (data.updateChannel) {
        latestUpdateChannel = data.updateChannel;
      } else if (data.settings && data.settings.updateChannel) {
        latestUpdateChannel = data.settings.updateChannel;
      }
      if (data.templates && Array.isArray(data.templates)) {
        templates = sanitizeUserTemplates(data.templates);
      } else {
        templates = [];
      }
      if (data.settings) {
        settings = {
          ...settings,
          ...data.settings,
          autoApplyToNew: false,
          perpFirms: normalizePerpFirmsConfig(data.settings.perpFirms, data.settings.deletedFirmIds),
          deletedFirmIds: Array.isArray(data.settings.deletedFirmIds) ? data.settings.deletedFirmIds : [],
          vestLastActiveAccount: data.settings.vestLastActiveAccount || null,
          bottomPanelStates: (data.settings.bottomPanelStates && typeof data.settings.bottomPanelStates === 'object') ? data.settings.bottomPanelStates : {},
          sessionIndicators: normalizeSessionIndicatorsConfig(data.settings.sessionIndicators),
          autoFvg: normalizeAutoFvgConfig(data.settings.autoFvg),
          newsBox: normalizeNewsBoxConfig(data.settings.newsBox),
          tradesBox: normalizeTradesBoxConfig(data.settings.tradesBox),
          candleOhlc: normalizeCandleOhlcConfig(data.settings.candleOhlc),
          failLines: normalizeFailLinesConfig(data.settings.failLines),
          cortexIndicator: normalizeCortexIndicatorConfig(data.settings.cortexIndicator),
          orderBlocks: normalizeOrderBlocksConfig(data.settings.orderBlocks),
          marketStructure: normalizeMarketStructureConfig(data.settings.marketStructure),
          diagnosticsBox: normalizeDiagnosticsBoxConfig(data.settings.diagnosticsBox),
          accountsRiskBox: normalizeAccountsRiskBoxConfig(data.settings.accountsRiskBox),
          debugMode: Boolean(data.settings.debugMode),
          dialogGlassEffect: Boolean(data.settings.dialogGlassEffect),
          favoriteTimeframes: normalizeFavoriteTimeframes(data.settings.favoriteTimeframes)
        };
        if (settings.activeTemplateId && LEGACY_PRESET_IDS.has(String(settings.activeTemplateId))) {
          settings.activeTemplateId = templates[0]?.id || null;
        }
        if (settings.defaultTemplateId && LEGACY_PRESET_IDS.has(String(settings.defaultTemplateId))) {
          settings.defaultTemplateId = templates[0]?.id || null;
        }
      } else {
        settings.perpFirms = normalizePerpFirmsConfig(settings.perpFirms, settings.deletedFirmIds);
        settings.deletedFirmIds = Array.isArray(settings.deletedFirmIds) ? settings.deletedFirmIds : [];
        settings.vestLastActiveAccount = settings.vestLastActiveAccount || null;
        settings.bottomPanelStates = (settings.bottomPanelStates && typeof settings.bottomPanelStates === 'object') ? settings.bottomPanelStates : {};
        settings.sessionIndicators = normalizeSessionIndicatorsConfig(settings.sessionIndicators);
        settings.autoFvg = normalizeAutoFvgConfig(settings.autoFvg);
        settings.newsBox = normalizeNewsBoxConfig(settings.newsBox);
        settings.tradesBox = normalizeTradesBoxConfig(settings.tradesBox);
        settings.candleOhlc = normalizeCandleOhlcConfig(settings.candleOhlc);
        settings.failLines = normalizeFailLinesConfig(settings.failLines);
        settings.cortexIndicator = normalizeCortexIndicatorConfig(settings.cortexIndicator);
        settings.diagnosticsBox = normalizeDiagnosticsBoxConfig(settings.diagnosticsBox);
        settings.accountsRiskBox = normalizeAccountsRiskBoxConfig(settings.accountsRiskBox);
        settings.debugMode = Boolean(settings.debugMode);
        settings.dialogGlassEffect = Boolean(settings.dialogGlassEffect);
        settings.favoriteTimeframes = normalizeFavoriteTimeframes(settings.favoriteTimeframes);
      }
      applyDialogGlassEffect(settings.dialogGlassEffect, settings.dialogGlassOpacity);
      // Persist cleaned templates & settings so legacy defaults are permanently removed
      safeStorageSet({ templates, settings });

      if (data.updaterState) {
        const currentVer = getSafeExtVersion();
        const isDev = data.updaterState.channel === 'dev';
        latestUpdateChannel = data.updaterState.channel || 'stable';
        isUpdateAvailable = Boolean(
          data.updaterState.updateAvailable &&
          (isDev || !data.updaterState.latestVersion || compareSemver(data.updaterState.latestVersion, currentVer) > 0)
        );
        latestAvailableVersion = data.updaterState.latestVersion || null;
      }

      settingsLoaded = true;
      notifyMainWorldConfig();
      // Also re-broadcast after 800ms and 2000ms in case the TradingView chart iframe mounted after initial page load
      setTimeout(() => notifyMainWorldConfig(), 800);
      setTimeout(() => notifyMainWorldConfig(), 2000);

      if (isTopWindow && settings.showFloatingBar) {
        renderFloatingBar();
      }

      if (isTopWindow) {
        resolveCurrentTabInfo();
        initPanelManager();
        initBottomPositionsPanelManager();
        renderChartNewsBox();
        renderChartTradesBox();
        renderChartRangeBox();
        renderChartOrderBlockStatsBox();
        renderChartDiagnosticsBox();
        renderChartAccountsRiskBox();
        setTimeout(() => {
          if (settings.accountsRiskBox && settings.accountsRiskBox.enabled) {
            postToMainWorlds({ type: 'VEST_SCAN_ACCOUNTS_NOW' });
            scrapeAndSyncCurrentAccountSnapshot(true);
            pushAccountsRiskDataToChartCanvas();
          }
        }, 1200);
        setupIsolatedActionTracking();
        initVestAccountTracker();
        // Run background update check on page refresh / load
        triggerQuickUpdateCheck();
      }

      setupHotkeys();
    } catch (err) {
      settingsLoaded = true;
      console.error('[VestTemplates:Isolated] Init error:', err);
    }
  }

  // Flush any debounced settings immediately if the user refreshes or closes the tab
  window.addEventListener('beforeunload', () => {
    if (pendingSettingsUpdate && isExtensionValid()) {
      try {
        chrome.storage.local.set({ settings: { ...settings, ...pendingSettingsUpdate } });
        pendingSettingsUpdate = null;
      } catch (e) {}
    }
  });

  init();
})();
