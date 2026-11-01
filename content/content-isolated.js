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

  setInterval(rememberOrderAmount, 700);

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

  setInterval(syncPendingStopLoss, 500);

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
  setInterval(readAndBroadcastFailPrices, 500);

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
  setInterval(readAndBroadcastEstimatedPnl, 500);

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

  let settings = {
    activeTemplateId: null,
    defaultTemplateId: null,
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

  // -------------------------------------------------------------
  // Safe Chrome Extension Context & Storage Helper
  // -------------------------------------------------------------
  function isExtensionValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local);
    } catch (e) {
      return false;
    }
  }

  let installedVersionOverride = null;

  function getSafeExtVersion() {
    let manifestVer = '1.1.0';
    try {
      if (isExtensionValid() && chrome.runtime.getManifest) {
        manifestVer = chrome.runtime.getManifest().version || '1.1.0';
      }
    } catch (e) {}
    if (installedVersionOverride && compareSemver(installedVersionOverride, manifestVer) > 0) {
      return installedVersionOverride;
    }
    return manifestVer;
  }

  const DOMAIN_VAULT_KEY = '__trading_cortex_vault_db_v1__';
  const CURRENT_DB_SCHEMA_VERSION = 2;

  function readDomainVault() {
    try {
      const raw = window.localStorage.getItem(DOMAIN_VAULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  function writeDomainVault(nextTemplates, nextSettings) {
    try {
      const prev = readDomainVault() || {};
      const payload = {
        schemaVersion: CURRENT_DB_SCHEMA_VERSION,
        updatedAt: Date.now(),
        templates: Array.isArray(nextTemplates) ? sanitizeUserTemplates(nextTemplates) : sanitizeUserTemplates(prev.templates || templates),
        settings: nextSettings ? { ...(prev.settings || {}), ...nextSettings } : (prev.settings || settings)
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
      localStorageEntries: { ...(prev.localStorageEntries || {}), ...(next.localStorageEntries || {}) },
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
        data.settings._savedAt = Date.now();
        window.localStorage.setItem('__trading_cortex_isolated_settings__', JSON.stringify(data.settings));
      }
      writeDomainVault(
        data && data.templates !== undefined ? data.templates : templates,
        data && data.settings ? data.settings : settings
      );
    } catch (e) {}

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
        window.localStorage.setItem('__trading_cortex_isolated_settings__', JSON.stringify(merged));
        writeDomainVault(templates, merged);
      } catch (e) {}
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

  function notifyMainWorldConfig() {
    if (!settingsLoaded) return;
    postToMainWorlds({
      type: 'VEST_TV_CONFIG_UPDATE',
      payload: {
        templates,
        settings,
        globalDrawings
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
  }

  // Listen for storage changes from popup
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!isExtensionValid()) return;
        if (area !== 'local' && area !== 'sync') return;

        if (changes.templates && Array.isArray(changes.templates.newValue)) {
          templates = sanitizeUserTemplates(changes.templates.newValue);
        }
        if (changes.settings && changes.settings.newValue) {
          const incomingSettings = changes.settings.newValue;
          settings = {
            ...settings,
            ...incomingSettings,
            lastChartSettings: mergeLastChartSettings(settings.lastChartSettings, incomingSettings.lastChartSettings)
          };
        }
        if (changes.globalDrawings && Array.isArray(changes.globalDrawings.newValue)) {
          globalDrawings = normalizeGlobalDrawings(changes.globalDrawings.newValue);
          postToMainWorlds({ type: 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', payload: { drawings: globalDrawings } });
        }
        if (changes.installedVersionOverride && changes.installedVersionOverride.newValue) {
          installedVersionOverride = changes.installedVersionOverride.newValue;
          if (isTopWindow) {
            renderStudioHeaderPill();
          }
        }
        if (changes.updaterState && changes.updaterState.newValue && isTopWindow) {
          const newState = changes.updaterState.newValue;
          const wasAvailable = isUpdateAvailable;
          const currentVer = getSafeExtVersion();
          isUpdateAvailable = Boolean(
            newState.updateAvailable &&
            (!newState.latestVersion || compareSemver(newState.latestVersion, currentVer) > 0)
          );
          latestAvailableVersion = newState.latestVersion || null;
          if (wasAvailable !== isUpdateAvailable) {
            renderStudioHeaderPill();
          }
        }

        notifyMainWorldConfig();
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
    const panel = findPanelElement(PANEL_DEFINITIONS.find(def => def.key === 'bottom_positions'));
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

  setInterval(syncManualTicketButtons, 800);
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
    if (typeof window.speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return false;
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

  // Listen for messages from MAIN world
  window.addEventListener('message', async (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    const { type, templateId, template, updates } = event.data;

    if (type === 'VEST_TV_CI_SIGNAL_FORMING') {
      speakCortexSignalAlert(event.data.payload || {}, false);
    } else if (type === 'VEST_TV_CI_SIGNAL_CONFIRMED') {
      speakCortexSignalAlert(event.data.payload || {}, true);
    } else if (type === 'VEST_TV_CI_BAR_CLOSED') {
      handleCortexIndicatorBar(event.data.payload || {});
    } else if (type === 'VEST_TV_MAIN_READY') {
      if (settingsLoaded) {
        notifyMainWorldConfig();
      }
    } else if (type === 'VEST_TV_GLOBAL_DRAWING_UPSERT') {
      if (!isTopWindow || !isExtensionValid() || !event.data.drawing) return;
      const drawing = event.data.drawing;
      const stored = await chrome.storage.local.get(['globalDrawings']).catch(() => ({}));
      const latest = normalizeGlobalDrawings(stored.globalDrawings || globalDrawings);
      const next = latest.filter(item => item.id !== drawing.id);
      next.push(drawing);
      saveGlobalDrawings(next);
    } else if (type === 'VEST_TV_GLOBAL_DRAWING_REMOVE') {
      if (!isTopWindow || !isExtensionValid() || !event.data.drawingId) return;
      const stored = await chrome.storage.local.get(['globalDrawings']).catch(() => ({}));
      const latest = normalizeGlobalDrawings(stored.globalDrawings || globalDrawings);
      saveGlobalDrawings(latest.filter(item => item.id !== event.data.drawingId));
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
            ...(prev.toolbarStorage || {}),
            ...(incoming.toolbarStorage || {})
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
        queueSettingsSave({ lastChartSettings: settings.lastChartSettings });
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
      if (isTopWindow && prevInst !== currentInstrument) refreshCortexPaperStatsOnChart(currentInstrument);
    } else if (type === 'VEST_TRADES_CAPTURED') {
      if (isTopWindow && Array.isArray(event.data.trades) && event.data.trades.length > 0 && typeof mergeCapturedTrades === 'function') {
        mergeCapturedTrades(event.data.trades, Boolean(event.data.notifyToast));
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
    } else if (type === 'VEST_EXECUTE_FLATTEN_POSITION') {
      if (isTopWindow && typeof executeTopWindowFlatten === 'function') {
        executeTopWindowFlatten(event.data.payload || {});
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
    },
    {
      key: 'bottom_positions',
      title: 'Positions & Orders',
      match: (el) => {
        if (!el || el.nodeType !== 1) return false;
        const text = el.textContent || '';
        const hasAccountTabs = Boolean(el.querySelector('[role="tab"]')) &&
          text.includes('Active Positions') && text.includes('Open Orders') && text.includes('Funding History');
        return (
          hasAccountTabs || (
            (text.includes('Active Positions') || text.includes('Open Orders') || text.includes('Positions History')) &&
            text.includes('PnL')
          )
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

  function reserveBottomBarSpace() {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) return;
    root.classList.add('vest-cortex-bottom-bar-active');
    body.classList.add('vest-cortex-bottom-bar-active');

    // Vest's app root commonly fills the whole viewport with overflow hidden. Cap that
    // flow root so its final 50px remain reachable above the fixed Cortex bar.
    const candidates = Array.from(body.children).filter(el => {
      if (el.id === CORTEX_TOP_BAR_ID || el.id.startsWith('vest-')) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.position !== 'fixed' && style.position !== 'absolute' &&
        rect.top <= 2 && rect.width >= window.innerWidth * 0.7 &&
        rect.height >= window.innerHeight - 2;
    });
    const appRoot = candidates.sort((a, b) =>
      (b.getBoundingClientRect().width * b.getBoundingClientRect().height) -
      (a.getBoundingClientRect().width * a.getBoundingClientRect().height)
    )[0];
    if (appRoot) {
      appRoot.style.setProperty('box-sizing', 'border-box', 'important');
      appRoot.style.setProperty('max-height', 'calc(100vh - 50px)', 'important');
      appRoot.style.setProperty('overflow-y', 'auto', 'important');
    }
  }

  function ensureCortexTopBar() {
    if (!document.body) return null;
    reserveBottomBarSpace();
    let bar = document.getElementById(CORTEX_TOP_BAR_ID);
    if (!bar) {
      bar = document.createElement('div');
      bar.id = CORTEX_TOP_BAR_ID;
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Trading Cortex toolbar');
    }
    if (bar.parentElement !== document.body || document.body.lastElementChild !== bar) {
      document.body.appendChild(bar);
    }
    return bar;
  }

  function initPanelManager() {
    if (!isTopWindow) return;

    renderStudioHeaderPill();
    if (settings.enablePanelManagement !== false) {
      scheduleScanPanels(true);
    }

    if (!studioPillHeartbeat) {
      studioPillHeartbeat = setInterval(() => {
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
              targetEl.classList.contains('vest-panel-header-bar') ||
              targetEl.classList.contains('vest-minimized-chip') ||
              targetEl.closest('#vest-minimized-dock') ||
              targetEl.closest('#vest-studio-header-pill') ||
              targetEl.closest('#vest-panel-toggle-pill') ||
              targetEl.closest('#vest-template-bar-root') ||
              targetEl.closest('#vest-action-log-box') ||
              targetEl.closest('#vest-chart-news-box') ||
              targetEl.closest('#vest-chart-trades-box') ||
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
    //    (e.g., contains leverage badge like "5x", "10x", "20x", "50x" or star/chevron SVGs at top: 38..115, left: 28..240)
    const allInteractive = document.querySelectorAll('button, div[role="button"], a, div');
    for (let i = 0; i < allInteractive.length; i++) {
      const el = allInteractive[i];
      if (el.id === 'vest-studio-header-pill' || el.closest('#vest-studio-header-pill')) continue;
      const r = el.getBoundingClientRect();
      if (r.top >= 38 && r.top <= 115 && r.left >= 28 && r.left <= 240 && r.width >= 75 && r.width <= 290 && r.height >= 26 && r.height <= 54) {
        const txt = (el.textContent || '').trim();
        const hasLeverage = /\b\d+(\.\d+)?x\b/i.test(txt);
        const hasSvg = el.querySelectorAll('svg').length >= 1;
        if (hasLeverage && hasSvg && el.parentElement && el.parentElement !== document.body) {
          // Walk up if parent is just a tight single-child wrapper around the button
          let targetPill = el;
          while (
            targetPill.parentElement &&
            targetPill.parentElement !== document.body &&
            targetPill.parentElement.children.length === 1
          ) {
            const pr = targetPill.parentElement.getBoundingClientRect();
            if (pr.width <= 320 && pr.height <= 64) {
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

    // 2. Locate the "Mid Price", "Index Price", or "24h Change" stat label in the top market header
    const allEls = document.querySelectorAll('span, div, p, button');
    let midPriceEl = null;
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      if (el.children.length > 2) continue;
      const txt = (el.textContent || '').trim();
      if (txt === 'Mid Price' || txt === 'Index Price' || txt === '24h Change') {
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
  let isCheckingForUpdate = false;

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

      // 2. Direct fallback fetch to GitHub Releases API in case service worker was asleep or unreachable
      if (!state) {
        const res = await fetch('https://api.github.com/repos/childersc/trading-cortex/releases/latest', {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-store'
        });
        if (res.ok) {
          const release = await res.json();
          const latestVer = cleanSemver(release.tag_name || release.name || installedVer);
          state = {
            latestVersion: latestVer,
            updateAvailable: compareSemver(latestVer, installedVer) > 0
          };
        }
      }

      if (state) {
        const wasAvailable = isUpdateAvailable;
        isUpdateAvailable = Boolean(state.updateAvailable);
        latestAvailableVersion = state.latestVersion || null;
        if (wasAvailable !== isUpdateAvailable) {
          renderStudioHeaderPill();
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
    const opensAbove = rect.bottom + menuHeight + 6 > window.innerHeight;
    const top = opensAbove
      ? Math.max(8, rect.top - menuHeight - 6)
      : rect.bottom + 6;
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - menuEl.offsetWidth - 8));
    menuEl.style.top = `${Math.round(top)}px`;
    menuEl.style.left = `${Math.round(left)}px`;
    menuEl.style.zIndex = '2147483647';
  }

  function renderStudioHeaderPill() {
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
    const subText = isUpdateAvailable ? 'Update ready' : `v${extVersion}`;
    const pillTitle = isUpdateAvailable
      ? `Trading Cortex · Update ready (v${latestAvailableVersion || 'new'})`
      : `Trading Cortex v${extVersion}`;

    pill.innerHTML = `
      <button type="button" class="vest-studio-pill-trigger ${studioMenuOpen ? 'open' : ''} ${isUpdateAvailable ? 'update-ready' : ''}" id="vest-studio-pill-btn" title="${pillTitle}">
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
          <span class="vest-studio-pill-sub ${isUpdateAvailable ? 'update-ready-text' : ''}">${subText}</span>
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

    const updateItemHtml = isUpdateAvailable
      ? `
        <div class="vest-sdm-menu-item" id="vest-sdm-open-updater-btn" style="padding: 8px 10px; margin-bottom: 6px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.14)); border: 1px solid rgba(52, 211, 153, 0.55); box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);">
          <div class="vest-sdm-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:#34d399;">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
            <span style="font-weight:700; color:#6ee7b7;">Update Ready (${latestAvailableVersion ? `v${escapeHtml(latestAvailableVersion)}` : 'Open Updater'})</span>
          </div>
          <span class="vest-sdm-hotkey" style="color:#34d399; border-color:rgba(52,211,153,0.4);">↗</span>
        </div>
      `
      : '';

    menuEl.style.display = studioMenuOpen ? 'flex' : 'none';
    menuEl.innerHTML = `
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
      openStudioSettingsModal('sessions');
    });

    // Auto FVG's Button -> opens Settings Dialog directly on Auto FVG's tab
    menuEl.querySelector('#vest-sdm-open-autofvg-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('autofvg');
    });

    // Economic News Box Button -> opens Settings Dialog directly on Economic News Box tab
    menuEl.querySelector('#vest-sdm-open-news-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('news');
    });

    // Instrument Trades Box Button -> opens Settings Dialog directly on Instrument Trades Box tab
    menuEl.querySelector('#vest-sdm-open-trades-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('trades');
    });

    // Candle OHLC Values Button -> opens Settings Dialog directly on Candle OHLC tab
    menuEl.querySelector('#vest-sdm-open-candleohlc-btn')?.addEventListener('click', () => {
      closeStudioDropdown();
      openStudioSettingsModal('candleohlc');
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
  function openStudioSettingsModal(initialTab = 'about') {
    const existing = document.getElementById('vest-studio-settings-dialog');
    if (existing) existing.remove();

    let activeTab = ['about', 'alertsvoice', 'memory', 'sessions', 'autofvg', 'news', 'trades', 'candleohlc', 'positionhud', 'faillines', 'cortexindicator'].includes(initialTab) ? initialTab : 'about';
    let voicesChangedHandler = null;

    // Working draft so "Cancel" discards or "Save Settings" commits
    const draftSettings = JSON.parse(JSON.stringify(settings || {}));
    if (typeof draftSettings.rememberSidebarTools !== 'boolean') {
      draftSettings.rememberSidebarTools = true;
    }
    if (typeof draftSettings.rememberLastChartSettings !== 'boolean') {
      draftSettings.rememberLastChartSettings = true;
    }
    draftSettings.sessionIndicators = normalizeSessionIndicatorsConfig(draftSettings.sessionIndicators);
    draftSettings.autoFvg = normalizeAutoFvgConfig(draftSettings.autoFvg);
    draftSettings.newsBox = normalizeNewsBoxConfig(draftSettings.newsBox);
    draftSettings.tradesBox = normalizeTradesBoxConfig(draftSettings.tradesBox);
    draftSettings.candleOhlc = normalizeCandleOhlcConfig(draftSettings.candleOhlc);
    draftSettings.positionHud = normalizePositionHudConfig(draftSettings.positionHud);
    draftSettings.failLines = normalizeFailLinesConfig(draftSettings.failLines);
    draftSettings.cortexIndicator = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
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

    const NAV_ITEMS = [
      {
        id: 'about',
        label: 'About',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
      },
      {
        id: 'alertsvoice',
        label: 'Alerts & Voice Settings',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`
      },
      {
        id: 'memory',
        label: 'Chart Memory Features',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`
      },
      {
        id: 'sessions',
        label: 'Session Indicators',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="4" x2="8" y2="20"/><line x1="16" y1="4" x2="16" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`
      },
      {
        id: 'autofvg',
        label: "Auto FVG's",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="2"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="3 2"/><line x1="6" y1="3" x2="6" y2="7"/><line x1="18" y1="17" x2="18" y2="21"/></svg>`
      },
      {
        id: 'news',
        label: 'Economic News Box',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
      },
      {
        id: 'trades',
        label: 'Instrument Trades Box',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
      },
      {
        id: 'candleohlc',
        label: 'Candle OHLC Values',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="9" y1="2" x2="9" y2="6"/><rect x="6" y="6" width="6" height="11" rx="1"/><line x1="9" y1="17" x2="9" y2="22"/><line x1="17" y1="4" x2="17" y2="9"/><rect x="14" y="9" width="6" height="8" rx="1"/><line x1="17" y1="17" x2="17" y2="21"/></svg>`
      },
      {
        id: 'positionhud',
        label: 'Active Position HUD',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="3 3"/><rect x="13" y="8" width="8" height="8" rx="1.5"/><line x1="15" y1="10" x2="19" y2="14"/><line x1="19" y1="10" x2="15" y2="14"/></svg>`
      },
      {
        id: 'faillines',
        label: 'Chart Trader Panel Settings',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18M3 17h18"/><path d="M6 5v4M18 15v4"/></svg>`
      },
      {
        id: 'cortexindicator',
        label: 'Cortex Indicator',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l5-6 4 3 7-9"/><path d="M3 21h18"/><path d="M5 7h4M15 17h4"/></svg>`
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
      queueSettingsSave({
        sessionIndicators: settings.sessionIndicators,
        autoFvg: settings.autoFvg,
        newsBox: settings.newsBox,
        tradesBox: settings.tradesBox,
        candleOhlc: settings.candleOhlc,
        positionHud: settings.positionHud,
        failLines: settings.failLines,
        cortexIndicator: settings.cortexIndicator
      });
      renderStudioHeaderPill();
      if (typeof renderChartNewsBox === 'function') {
        renderChartNewsBox();
      }
      if (typeof renderChartTradesBox === 'function') {
        renderChartTradesBox();
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
                <span>Update Center</span>
                <button type="button" class="vest-tvs-action-btn" id="vest-tvs-open-ota-btn" style="border-color:#10b981; color:#10b981;">
                  Open Update Center ↗
                </button>
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

      if (activeTab === 'sessions') {
        const sc = normalizeSessionIndicatorsConfig(draftSettings.sessionIndicators);
        draftSettings.sessionIndicators = sc;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <div class="vest-tvs-section-title" style="margin:0;">ICT KILLZONES & SESSION INDICATORS</div>
            <button type="button" class="vest-tvs-action-btn" id="vest-si-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <div class="vest-tvs-toggle-box" style="padding:13px 16px; margin-bottom:12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Enable ICT Session Boxes & High/Low Liquidity Lines</div>
              <div class="vest-tvs-toggle-desc">
                Draws shaded ICT session killzone boxes with centered watermarks (e.g. NY AM, NY Lunch, London, Asia). Extend uncleared High/Low lines to the right until the first sweep or close-through, or extend all levels after they are cleared.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Session Indicators on Chart">
              <input type="checkbox" id="vest-si-master-enabled" ${sc.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Session Box & Watermark Font Styling
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
                  <option value="2" ${Number(sc.highLowLineStyle) === 2 ? 'selected' : ''}>Dashed (- - -)</option>
                </select>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin-top:6px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-show-watermark" ${sc.showWatermark !== false ? 'checked' : ''} />
                <span>Show Centered Session Watermark</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-font-bold" ${sc.fontBold ? 'checked' : ''} />
                <span>Bold Watermark Text</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-extend-hl" ${sc.extendHighLowLines !== false ? 'checked' : ''} />
                <span>Solid H/L Line (Cut Off When Swept)</span>
              </label>
              <label class="vest-ed-field" style="min-width:270px; max-width:390px;">
                <span class="vest-ed-label">Session H/L Right Extension</span>
                <select class="vest-ed-select" id="vest-si-extend-hl-right" title="Choose which session High/Low levels extend to the chart's right edge">
                  <option value="uncleared" ${sc.highLowLineExtensionMode !== 'all' ? 'selected' : ''}>Uncleared levels only (stop at sweep/close-through)</option>
                  <option value="all" ${sc.highLowLineExtensionMode === 'all' ? 'selected' : ''}>All levels (continue after sweep/close-through)</option>
                </select>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-show-perm-dotted" ${sc.showPermanentDottedHighLow !== false ? 'checked' : ''} />
                <span>7-Day H/L Line to Far Right + Price Tag & Date</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-show-hl-labels" ${sc.showHighLowLabels !== false ? 'checked' : ''} />
                <span>Show Box H/L Labels (e.g. NYAM.H / NYAM.L)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-show-midpoint" ${sc.showMidPoint ? 'checked' : ''} />
                <span>Show Session Mid-Point (50% EQ)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-si-extend-midpoint" ${sc.extendMidPoint ? 'checked' : ''} />
                <span>Extend Mid-Point Until Touched</span>
              </label>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              7-Day Extended Line & Date Label Styling (e.g. 10-19-26 NY AM High)
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label" title="Tokens: M (1-12), MM (01-12), MMM (Oct), MMMM (October), d (1-31), dd (01-31), y/yy (26), yyyy (2026)">
                  Date Stamp Format
                </label>
                <div style="display:flex; align-items:center; gap:5px;">
                  <input
                    type="text"
                    class="vest-ed-input"
                    id="vest-si-perm-date-format"
                    value="${escapeHtml(sc.permDateFormat !== undefined ? sc.permDateFormat : 'M-d-y')}"
                    placeholder="M-d-y"
                    style="flex:1; min-width:74px; font-family:'JetBrains Mono', monospace; font-size:11.5px;"
                    title="Custom date stamp format — e.g. M-d-y (10-19-26), MM/dd/yyyy (10/19/2026), MMM/d (Oct/19), yyyy-MM-dd"
                  />
                  <select class="vest-ed-select" id="vest-si-perm-date-preset" style="width:96px; padding:0 4px; font-size:11px;" title="Quick Date Format Presets">
                    <option value="">Presets…</option>
                    <option value="M-d-y" ${(sc.permDateFormat || 'M-d-y') === 'M-d-y' ? 'selected' : ''}>M-d-y (10-19-26)</option>
                    <option value="MM-dd-yy" ${sc.permDateFormat === 'MM-dd-yy' ? 'selected' : ''}>MM-dd-yy (10-19-26)</option>
                    <option value="M/d/y" ${sc.permDateFormat === 'M/d/y' ? 'selected' : ''}>M/d/y (10/19/26)</option>
                    <option value="M-d-yyyy" ${sc.permDateFormat === 'M-d-yyyy' ? 'selected' : ''}>M-d-yyyy (10-19-2026)</option>
                    <option value="MMM/d" ${sc.permDateFormat === 'MMM/d' ? 'selected' : ''}>MMM/d (Oct/19)</option>
                    <option value="MMM d, y" ${sc.permDateFormat === 'MMM d, y' ? 'selected' : ''}>MMM d, y (Oct 19, 26)</option>
                    <option value="yyyy-MM-dd" ${sc.permDateFormat === 'yyyy-MM-dd' ? 'selected' : ''}>yyyy-MM-dd</option>
                    <option value="d-M-y" ${sc.permDateFormat === 'd-M-y' ? 'selected' : ''}>d-M-y (19-10-26)</option>
                  </select>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Vertical Position</label>
                <select class="vest-ed-select" id="vest-si-perm-vert-align">
                  <option value="outside" ${(sc.permLabelVertAlign || 'outside') === 'outside' ? 'selected' : ''}>Auto (High = Top, Low = Bottom)</option>
                  <option value="top" ${sc.permLabelVertAlign === 'top' ? 'selected' : ''}>Top (Above Line)</option>
                  <option value="inline" ${sc.permLabelVertAlign === 'inline' ? 'selected' : ''}>Inline (On Line)</option>
                  <option value="bottom" ${sc.permLabelVertAlign === 'bottom' ? 'selected' : ''}>Bottom (Below Line)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Horizontal Placement</label>
                <select class="vest-ed-select" id="vest-si-perm-horz-align">
                  <option value="right" ${(sc.permLabelHorzAlign || 'right') === 'right' ? 'selected' : ''}>Far Right (Near Price Axis)</option>
                  <option value="center" ${sc.permLabelHorzAlign === 'center' ? 'selected' : ''}>Center (Middle of Line)</option>
                  <option value="left" ${sc.permLabelHorzAlign === 'left' ? 'selected' : ''}>Left (Start of Dotted Line)</option>
                </select>
              </div>
            </div>

            <div class="vest-ed-grid-4" style="display:grid; grid-template-columns: 1fr 1fr 1fr 1.2fr; gap:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">7-Day Line Style</label>
                <select class="vest-ed-select" id="vest-si-perm-line-style">
                  <option value="1" ${Number(sc.permanentLineStyle ?? 1) === 1 ? 'selected' : ''}>Dotted (· · · ·)</option>
                  <option value="2" ${Number(sc.permanentLineStyle ?? 1) === 2 ? 'selected' : ''}>Dashed (- - - -)</option>
                  <option value="0" ${Number(sc.permanentLineStyle ?? 1) === 0 ? 'selected' : ''}>Solid (─────)</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Font Size: <span id="vest-si-perm-fontsize-val">${sc.permLabelFontSize || 11}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-si-perm-font-size" min="8" max="24" value="${sc.permLabelFontSize || 11}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Font Style</label>
                <select class="vest-ed-select" id="vest-si-perm-font-style">
                  <option value="normal" ${sc.permLabelFontStyle === 'normal' ? 'selected' : ''}>Normal</option>
                  <option value="bold" ${(sc.permLabelFontStyle || 'bold') === 'bold' ? 'selected' : ''}>Bold</option>
                  <option value="italic" ${sc.permLabelFontStyle === 'italic' ? 'selected' : ''}>Italic</option>
                  <option value="bold_italic" ${sc.permLabelFontStyle === 'bold_italic' ? 'selected' : ''}>Bold Italic</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Date Label Color</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <select class="vest-ed-select" id="vest-si-perm-color-mode" style="flex:1;">
                    <option value="session" ${(sc.permLabelColorMode || 'session') === 'session' ? 'selected' : ''}>Match Session</option>
                    <option value="custom" ${sc.permLabelColorMode === 'custom' ? 'selected' : ''}>Custom Color</option>
                  </select>
                  <input type="color" class="vest-ed-color" id="vest-si-perm-custom-color" value="${normalizeHexColor(sc.permLabelCustomColor, '#e2e8f0')}" style="width:28px; height:28px; padding:0; border-radius:6px; cursor:pointer; flex-shrink:0; ${(sc.permLabelColorMode || 'session') === 'custom' ? '' : 'opacity:0.45;'}" title="Custom Date Label Text Color" />
                </div>
              </div>
            </div>
          </div>

          <div style="font-size:11px; font-weight:700; color:#93c5fd; text-transform:uppercase; letter-spacing:0.6px; margin:4px 0 8px 0;">
            Individual ICT Sessions (New York Time · EST/EDT)
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${sc.sessions.map((sess, idx) => `
              <div class="vest-tvs-toggle-box" data-sess-id="${escapeHtml(sess.id)}" style="padding:10px 14px; margin-bottom:0; gap:12px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:165px;">
                  <input type="color" class="vest-ed-color vest-si-sess-color" data-idx="${idx}" data-opacity-input="#vest-si-box-opacity" value="${normalizeHexColor(sess.color, '#26a69a')}" style="width:28px; height:28px; padding:0; border-radius:6px; cursor:pointer; flex-shrink:0;" title="Session Box & High/Low Line Color" />
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

      if (activeTab === 'autofvg') {
        const fc = normalizeAutoFvgConfig(draftSettings.autoFvg);
        draftSettings.autoFvg = fc;

        const rectTemplates = templates.filter(t => (t.drawingType || 'rectangle') === 'rectangle');

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <div class="vest-tvs-section-title" style="margin:0;">AUTO FAIR VALUE GAPS (ICT FVG)</div>
            <button type="button" class="vest-tvs-action-btn" id="vest-afvg-reset-defaults-btn" style="height:26px; padding:0 10px; font-size:11px; color:#94a3b8;">
              Reset Defaults
            </button>
          </div>

          <div class="vest-tvs-toggle-box" style="padding:13px 16px; margin-bottom:12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Enable Auto FVG Detection & Dynamic Extension</div>
              <div class="vest-tvs-toggle-desc">
                Automatically detects 3-candle Bullish & Bearish Fair Value Gaps on the active timeframe, extends them forward in real time until price reclaims them, and applies your matching timeframe FVG template (e.g. <code>5m FVG</code>) or default FVG styling.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Auto FVG's on Chart">
              <input type="checkbox" id="vest-afvg-master-enabled" ${fc.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Template Matching & Label Rules
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
                <label class="vest-ed-label" title="Used when no custom text label is defined on the matched template. Tokens: {tf} (e.g. 5m), {dir} (Bullish/Bearish)">
                  Default Label Format
                </label>
                <input
                  type="text"
                  class="vest-ed-input"
                  id="vest-afvg-label-format"
                  value="${escapeHtml(fc.labelFormat || '{tf} FVG')}"
                  placeholder="{tf} FVG"
                  style="font-family:'JetBrains Mono', monospace; font-size:11.5px;"
                />
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Reclaim (Mitigation) & Extension Behavior
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Unreclaimed Extension Mode</label>
                <select class="vest-ed-select" id="vest-afvg-extend-mode">
                  <option value="right" ${(fc.extendMode || 'right') === 'right' ? 'selected' : ''}>Extend Far Right Until Reclaimed</option>
                  <option value="current" ${fc.extendMode === 'current' ? 'selected' : ''}>Extend to Current Time (+ Bars)</option>
                  <option value="template" ${fc.extendMode === 'template' ? 'selected' : ''}>Follow Matched Template Setting</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label" title="How many additional bars to project active FVGs past the current time bar (e.g. 0 = stop at current bar, 5 = 5 bars past current bar)">
                  Bars Past Current Bar
                </label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input
                    type="number"
                    class="vest-ed-input"
                    id="vest-afvg-future-bars"
                    min="0"
                    max="200"
                    step="1"
                    value="${Number(fc.extendFutureBars ?? 0)}"
                    style="width:72px; font-family:'JetBrains Mono', monospace; font-size:12px; ${(fc.extendMode || 'right') === 'right' ? 'opacity:0.55;' : ''}"
                    title="Number of bars to extend past the current candle when using 'Extend to Current Time (+ Bars)'"
                  />
                  <span style="font-size:11px; color:#94a3b8; white-space:nowrap;">bars (+${Number(fc.extendFutureBars ?? 0)})</span>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Reclaim Condition</label>
                <select class="vest-ed-select" id="vest-afvg-reclaim-mode">
                  <option value="close" ${fc.reclaimMode === 'close' ? 'selected' : ''}>Candle Close Through FVG (Body)</option>
                  <option value="wick" ${fc.reclaimMode === 'wick' ? 'selected' : ''}>Full Wick Fill Through FVG</option>
                </select>
              </div>
            </div>

            <div class="vest-ed-grid-2" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Max Active Unreclaimed FVGs</label>
                <select class="vest-ed-select" id="vest-afvg-max-active">
                  ${[5, 10, 15, 20, 25, 35, 50, 75].map(n => `
                    <option value="${n}" ${Number(fc.maxActiveFvgs) === n ? 'selected' : ''}>${n} Active FVGs</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Bars Lookback</label>
                <select class="vest-ed-select" id="vest-afvg-lookback">
                  ${[200, 400, 600, 1000, 1500, 2500].map(n => `
                    <option value="${n}" ${Number(fc.maxBarsLookback) === n ? 'selected' : ''}>Last ${n} Candles</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-top:6px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-afvg-sync-native" ${fc.syncNativeDrawings ? 'checked' : ''} />
                <span>Also Sync as Selectable TradingView Rectangle Shapes</span>
              </label>
              <button
                type="button"
                class="vest-tvs-action-btn"
                id="vest-afvg-clear-log-btn"
                style="height:24px; padding:0 9px; font-size:11px; color:#38bdf8; border-color:rgba(56,189,248,0.35);"
                title="Clears the persistent log of previously created FVGs so deleted FVGs can be created again"
              >
                Clear Created FVG Log
              </button>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid ${fc.showReclaimed !== false ? 'rgba(56,189,248,0.35)' : 'rgba(148,163,184,0.16)'}; border-radius:10px; transition:border-color 0.15s ease;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:14px;">
              <div style="display:flex; flex-direction:column; gap:3px; min-width:0;">
                <div style="font-size:13px; font-weight:700; color:#f8fafc; display:flex; align-items:center; gap:8px;">
                  <span>Show Reclaimed FVG's</span>
                  <span style="font-size:10px; font-weight:600; padding:1px 7px; border-radius:999px; background:${fc.showReclaimed !== false ? 'rgba(16,185,129,0.16)' : 'rgba(148,163,184,0.12)'}; border:1px solid ${fc.showReclaimed !== false ? 'rgba(16,185,129,0.4)' : 'rgba(148,163,184,0.22)'}; color:${fc.showReclaimed !== false ? '#34d399' : '#94a3b8'};">
                    ${fc.showReclaimed !== false ? 'VISIBLE' : 'HIDDEN'}
                  </span>
                </div>
                <div style="font-size:11.5px; color:#94a3b8; line-height:1.4;">
                  Keep mitigated FVGs visible on the chart (cut off at the candle that reclaimed them) and automatically apply a custom reclaimed color.
                </div>
              </div>
              <label class="vest-tvs-switch" title="Toggle Show Reclaimed FVG's">
                <input type="checkbox" id="vest-afvg-show-reclaimed" ${fc.showReclaimed !== false ? 'checked' : ''} />
                <span class="vest-tvs-switch-slider"></span>
              </label>
            </div>

            <div id="vest-afvg-reclaimed-settings-body" style="display:${fc.showReclaimed !== false ? 'block' : 'none'}; margin-top:12px; padding-top:12px; border-top:1px solid rgba(148,163,184,0.14);">
              <div class="vest-ed-grid-2" style="margin-bottom:10px;">
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Reclaimed Color Mode</label>
                  <select class="vest-ed-select" id="vest-afvg-reclaimed-color-mode">
                    <option value="custom" ${(fc.reclaimedColorMode || 'custom') === 'custom' ? 'selected' : ''}>Custom Reclaimed Colors (Box, Border &amp; Midline)</option>
                    <option value="dim" ${fc.reclaimedColorMode === 'dim' ? 'selected' : ''}>Keep Original FVG Colors (Dimmed)</option>
                  </select>
                </div>
                <div class="vest-ed-field">
                  <label class="vest-ed-label">Max Reclaimed History</label>
                  <select class="vest-ed-select" id="vest-afvg-reclaimed-count">
                    ${[5, 10, 15, 25, 40, 60].map(n => `
                      <option value="${n}" ${Number(fc.showReclaimedHistoryCount ?? 15) === n ? 'selected' : ''}>Last ${n} Reclaimed FVGs</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="vest-ed-grid-3" id="vest-afvg-reclaimed-color-grid" style="${(fc.reclaimedColorMode || 'custom') === 'dim' ? 'opacity:0.45; pointer-events:none;' : ''}">
                <div class="vest-ed-field" style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                  <label class="vest-ed-label" style="margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                    <span>Box Fill Color</span>
                    <span id="vest-afvg-rec-box-op-val" style="color:#38bdf8; font-family:'JetBrains Mono', monospace;">${Number(fc.reclaimedBoxOpacity ?? 18)}%</span>
                  </label>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <input
                      type="color"
                      class="vest-ed-color"
                      id="vest-afvg-rec-box-color"
                      data-opacity-input="#vest-afvg-rec-box-opacity"
                      value="${normalizeHexColor(fc.reclaimedBoxColor || fc.reclaimedColor, '#787b86')}"
                      style="width:32px; height:26px; padding:0; border-radius:6px; cursor:pointer; flex-shrink:0;"
                      title="Reclaimed Box Fill Color & Opacity"
                    />
                    <span id="vest-afvg-rec-box-hex" style="font-size:11px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(fc.reclaimedBoxColor || fc.reclaimedColor, '#787b86')}</span>
                  </div>
                  <input type="range" class="vest-ed-range" id="vest-afvg-rec-box-opacity" min="0" max="100" value="${Number(fc.reclaimedBoxOpacity ?? 18)}" title="Reclaimed Box Fill Opacity (%)" />
                </div>

                <div class="vest-ed-field" style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                  <label class="vest-ed-label" style="margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                    <span>Border Color</span>
                    <span id="vest-afvg-rec-border-op-val" style="color:#38bdf8; font-family:'JetBrains Mono', monospace;">${Number(fc.reclaimedBorderOpacity ?? 65)}%</span>
                  </label>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <input
                      type="color"
                      class="vest-ed-color"
                      id="vest-afvg-rec-border-color"
                      data-opacity-input="#vest-afvg-rec-border-opacity"
                      value="${normalizeHexColor(fc.reclaimedBorderColor || fc.reclaimedColor, '#787b86')}"
                      style="width:32px; height:26px; padding:0; border-radius:6px; cursor:pointer; flex-shrink:0;"
                      title="Reclaimed Border Color & Opacity"
                    />
                    <span id="vest-afvg-rec-border-hex" style="font-size:11px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(fc.reclaimedBorderColor || fc.reclaimedColor, '#787b86')}</span>
                  </div>
                  <input type="range" class="vest-ed-range" id="vest-afvg-rec-border-opacity" min="0" max="100" value="${Number(fc.reclaimedBorderOpacity ?? 65)}" title="Reclaimed Border Opacity (%)" />
                </div>

                <div class="vest-ed-field" style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                  <label class="vest-ed-label" style="margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                    <span>Middle Line Color</span>
                    <span id="vest-afvg-rec-mid-op-val" style="color:#38bdf8; font-family:'JetBrains Mono', monospace;">${Number(fc.reclaimedMidlineOpacity ?? 60)}%</span>
                  </label>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <input
                      type="color"
                      class="vest-ed-color"
                      id="vest-afvg-rec-mid-color"
                      data-opacity-input="#vest-afvg-rec-mid-opacity"
                      value="${normalizeHexColor(fc.reclaimedMidlineColor || fc.reclaimedColor, '#787b86')}"
                      style="width:32px; height:26px; padding:0; border-radius:6px; cursor:pointer; flex-shrink:0;"
                      title="Reclaimed Middle Line (50% CE) Color & Opacity"
                    />
                    <span id="vest-afvg-rec-mid-hex" style="font-size:11px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(fc.reclaimedMidlineColor || fc.reclaimedColor, '#787b86')}</span>
                  </div>
                  <input type="range" class="vest-ed-range" id="vest-afvg-rec-mid-opacity" min="0" max="100" value="${Number(fc.reclaimedMidlineOpacity ?? 60)}" title="Reclaimed Middle Line Opacity (%)" />
                </div>
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:4px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#34d399; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Default FVG Fallback Template Styling (Used When No Matching Template Exists)
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

      if (activeTab === 'news') {
        const nc = normalizeNewsBoxConfig(draftSettings.newsBox);
        draftSettings.newsBox = nc;

        const renderMiniFolderSvg = (colorHex) => `
          <svg viewBox="0 0 24 24" width="16" height="15" style="flex-shrink:0; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="${colorHex}" stroke="rgba(255,255,255,0.28)" stroke-width="1.3"/>
          </svg>
        `;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <div class="vest-tvs-section-title" style="margin:0;">ECONOMIC NEWS BOX (ON-CHART WIDGET)</div>
            <div style="display:flex; align-items:center; gap:6px;">
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
          </div>

          <div class="vest-tvs-toggle-box" style="padding:13px 16px; margin-bottom:12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Enable Moveable Economic News Box on Chart</div>
              <div class="vest-tvs-toggle-desc">
                Displays a draggable upcoming economic news widget anywhere on screen with event time, country of origin, and Red / Yellow / Green impact folder icons. Its screen position is remembered, and minimizing docks it into the Cortex bottom bar.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Economic News Box on Chart">
              <input type="checkbox" id="vest-nb-master-enabled" ${nc.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#f87171; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              News Folder Impact Filters &amp; Folder Icon Colors
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:4px;">
              <div class="vest-ed-field" style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                  <label class="vest-ed-checkbox-label" style="font-size:12px; font-weight:600; color:#f8fafc;">
                    <input type="checkbox" id="vest-nb-show-red" ${nc.showRedFolder !== false ? 'checked' : ''} />
                    ${renderMiniFolderSvg(nc.redFolderColor)}
                    <span>Red Folder (High)</span>
                  </label>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-red-color" value="${normalizeHexColor(nc.redFolderColor, '#f23645')}" style="width:28px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span style="font-size:11px; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.redFolderColor, '#f23645')}</span>
                </div>
              </div>

              <div class="vest-ed-field" style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                  <label class="vest-ed-checkbox-label" style="font-size:12px; font-weight:600; color:#f8fafc;">
                    <input type="checkbox" id="vest-nb-show-yellow" ${nc.showYellowFolder !== false ? 'checked' : ''} />
                    ${renderMiniFolderSvg(nc.yellowFolderColor)}
                    <span>Yellow Folder (Med)</span>
                  </label>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-yellow-color" value="${normalizeHexColor(nc.yellowFolderColor, '#ff9800')}" style="width:28px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span style="font-size:11px; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.yellowFolderColor, '#ff9800')}</span>
                </div>
              </div>

              <div class="vest-ed-field" style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                  <label class="vest-ed-checkbox-label" style="font-size:12px; font-weight:600; color:#f8fafc;">
                    <input type="checkbox" id="vest-nb-show-green" ${nc.showGreenFolder !== false ? 'checked' : ''} />
                    ${renderMiniFolderSvg(nc.greenFolderColor)}
                    <span>Green Folder (Low)</span>
                  </label>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-green-color" value="${normalizeHexColor(nc.greenFolderColor, '#26a69a')}" style="width:28px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span style="font-size:11px; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.greenFolderColor, '#26a69a')}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px;">
                Countries of Origin Filter
              </div>
              <div style="display:flex; gap:6px;">
                <button type="button" class="vest-tvs-action-btn" id="vest-nb-countries-all" style="height:22px; padding:0 8px; font-size:10.5px;">Select All</button>
                <button type="button" class="vest-tvs-action-btn" id="vest-nb-countries-usd" style="height:22px; padding:0 8px; font-size:10.5px;">USD Only</button>
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${NEWS_ALL_COUNTRIES.map(code => {
                const checked = nc.countries.includes(code);
                return `
                  <label class="vest-ed-checkbox-label" style="padding:4px 9px; border-radius:6px; background:${checked ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${checked ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'}; font-size:11.5px; font-family:'JetBrains Mono', monospace; font-weight:600;">
                    <input type="checkbox" class="vest-nb-country-chk" value="${code}" ${checked ? 'checked' : ''} />
                    <span>${getCountryFlagEmoji(code)} ${code}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Box Appearance, Timezone &amp; Viewport Clamping
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Header Title</label>
                <input type="text" class="vest-ed-input" id="vest-nb-title" value="${escapeHtml(nc.boxTitle)}" placeholder="Upcoming News" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Timezone Display</label>
                <select class="vest-ed-select" id="vest-nb-tz">
                  <option value="ny" ${nc.timeZoneMode === 'ny' ? 'selected' : ''}>New York (EST/EDT)</option>
                  <option value="local" ${nc.timeZoneMode === 'local' ? 'selected' : ''}>Local Browser Time</option>
                  <option value="utc" ${nc.timeZoneMode === 'utc' ? 'selected' : ''}>UTC</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Time Format</label>
                <select class="vest-ed-select" id="vest-nb-time-fmt">
                  <option value="12h" ${nc.timeFormat === '12h' ? 'selected' : ''}>12-Hour (8:30am)</option>
                  <option value="24h" ${nc.timeFormat === '24h' ? 'selected' : ''}>24-Hour (08:30)</option>
                </select>
              </div>
            </div>

            <div class="vest-ed-grid-4" style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Max Visible Events</label>
                <select class="vest-ed-select" id="vest-nb-max-events">
                  ${[3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => `
                    <option value="${n}" ${Number(nc.maxEvents) === n ? 'selected' : ''}>${n} Events</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Width: <span id="vest-nb-width-val">${nc.boxWidth}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-nb-width" min="250" max="480" value="${nc.boxWidth}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Background &amp; Opacity</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-bg-color" data-opacity-input="#vest-nb-bg-opacity" value="${normalizeHexColor(nc.bgColor, '#131722')}" style="width:30px; height:26px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span id="vest-nb-bg-op-badge" style="font-size:11px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${nc.bgOpacity}%</span>
                  <input type="range" id="vest-nb-bg-opacity" min="25" max="100" value="${nc.bgOpacity}" style="display:none;" />
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Border Color</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-nb-border-color" value="${normalizeHexColor(nc.borderColor, '#38bdf8')}" style="width:30px; height:26px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span style="font-size:11px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(nc.borderColor, '#38bdf8')}</span>
                </div>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:16px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-nb-show-countdown" ${nc.showCountdown !== false ? 'checked' : ''} />
                <span>Show Live Countdown Badge (e.g. <code>in 14m</code> / <code>2h 10m</code>)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-nb-show-flag" ${nc.showCountryFlag !== false ? 'checked' : ''} />
                <span>Show Country Flag Next to Currency Code</span>
              </label>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:4px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#34d399; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">
              Add Custom Scheduled News Event
            </div>
            <div style="display:grid; grid-template-columns: 95px 86px 115px 1fr auto; gap:8px; align-items:center;">
              <input type="time" class="vest-ed-input" id="vest-nb-cust-time" value="08:30" style="height:28px; font-family:'JetBrains Mono', monospace; font-size:11.5px;" title="Event Time" />
              <select class="vest-ed-select" id="vest-nb-cust-country" style="height:28px; font-size:11.5px;">
                ${NEWS_ALL_COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
              <select class="vest-ed-select" id="vest-nb-cust-folder" style="height:28px; font-size:11.5px;">
                <option value="red">🔴 Red Folder</option>
                <option value="yellow">🟡 Yellow Folder</option>
                <option value="green">🟢 Green Folder</option>
              </select>
              <input type="text" class="vest-ed-input" id="vest-nb-cust-title" placeholder="e.g. CPI m/m, FOMC Statement..." style="height:28px; font-size:11.5px;" />
              <button type="button" class="vest-tvs-action-btn" id="vest-nb-cust-add-btn" style="height:28px; padding:0 12px; border-color:#10b981; color:#34d399; font-size:11.5px;">
                + Add
              </button>
            </div>
            ${nc.customEvents.length > 0 ? `
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

      if (activeTab === 'trades') {
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

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <div class="vest-tvs-section-title" style="margin:0;">INSTRUMENT TRADES BOX (ON-CHART PNL &amp; DURATION)</div>
            <div style="display:flex; align-items:center; gap:6px;">
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
          </div>

          <div class="vest-tvs-toggle-box" style="padding:13px 16px; margin-bottom:12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Enable Moveable Instrument Trades Box on Chart</div>
              <div class="vest-tvs-toggle-desc">
                Prepopulates once from <strong>Positions History</strong> for your currently selected instrument (<strong>${escapeHtml(activeSymLabel)}</strong>) within the active trading session (<strong>6:00 PM ET Prev Night – 4:59 PM ET Today</strong>), highlighting wins green and losses red with aligned Side, Entry, Exit, Duration, and PnL columns.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Instrument Trades Box on Chart">
              <input type="checkbox" id="vest-tb-master-enabled" ${tc.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#34d399; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Winning &amp; Losing Trade Row Highlighting
            </div>
            <div class="vest-ed-grid-2" style="margin-bottom:8px;">
              <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; background:${hexToRgba(tc.winRowColor, tc.winRowOpacity / 100)}; border:1px solid ${hexToRgba(tc.winRowColor, 0.5)};">
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <span style="font-size:12.5px; font-weight:700; color:#f8fafc;">Winning Trade Row (Green)</span>
                  <span style="font-size:10.5px; color:#cbd5e1;">Applied when Trade PnL &gt; $0.00</span>
                </div>
                <div style="display:flex; align-items:center; gap:7px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-win-color" data-opacity-input="#vest-tb-win-opacity" value="${normalizeHexColor(tc.winRowColor, '#10b981')}" style="width:30px; height:26px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span id="vest-tb-win-op-badge" style="font-size:11px; color:#e2e8f0; font-family:'JetBrains Mono', monospace;">${tc.winRowOpacity}%</span>
                  <input type="range" id="vest-tb-win-opacity" min="8" max="85" value="${tc.winRowOpacity}" style="display:none;" />
                </div>
              </div>

              <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; background:${hexToRgba(tc.lossRowColor, tc.lossRowOpacity / 100)}; border:1px solid ${hexToRgba(tc.lossRowColor, 0.5)};">
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <span style="font-size:12.5px; font-weight:700; color:#f8fafc;">Losing Trade Row (Red)</span>
                  <span style="font-size:10.5px; color:#cbd5e1;">Applied when Trade PnL &lt; $0.00</span>
                </div>
                <div style="display:flex; align-items:center; gap:7px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-loss-color" data-opacity-input="#vest-tb-loss-opacity" value="${normalizeHexColor(tc.lossRowColor, '#f23645')}" style="width:30px; height:26px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span id="vest-tb-loss-op-badge" style="font-size:11px; color:#e2e8f0; font-family:'JetBrains Mono', monospace;">${tc.lossRowOpacity}%</span>
                  <input type="range" id="vest-tb-loss-opacity" min="8" max="85" value="${tc.lossRowOpacity}" style="display:none;" />
                </div>
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Long &amp; Short Side Badge Colors &amp; Font Styling
            </div>
            <div class="vest-ed-grid-2" style="margin-bottom:10px;">
              <div style="display:flex; flex-direction:column; gap:8px; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:12px; font-weight:700; color:#f8fafc;">LONG Side Badge</span>
                  <span class="vest-ctb-side-badge long" id="vest-tb-long-badge-preview" style="${buildSideBadgeInlineStyle('LONG', tc)}">LONG</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                  <div class="vest-ed-field">
                    <label class="vest-ed-label">Text Color</label>
                    <div style="display:flex; align-items:center; gap:5px;">
                      <input type="color" class="vest-ed-color" id="vest-tb-long-text-color" value="${normalizeHexColor(tc.longBadgeTextColor, '#38bdf8')}" style="width:26px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                      <span style="font-size:10.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(tc.longBadgeTextColor, '#38bdf8')}</span>
                    </div>
                  </div>
                  <div class="vest-ed-field">
                    <label class="vest-ed-label">Fill &amp; Opacity</label>
                    <div style="display:flex; align-items:center; gap:5px;">
                      <input type="color" class="vest-ed-color" id="vest-tb-long-bg-color" data-opacity-input="#vest-tb-long-bg-opacity" value="${normalizeHexColor(tc.longBadgeBgColor, '#0f172a')}" style="width:26px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                      <span id="vest-tb-long-bg-op-badge" style="font-size:10.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${tc.longBadgeBgOpacity}%</span>
                      <input type="range" id="vest-tb-long-bg-opacity" min="0" max="100" value="${tc.longBadgeBgOpacity}" style="display:none;" />
                    </div>
                  </div>
                  <div class="vest-ed-field">
                    <label class="vest-ed-label">Border Color</label>
                    <div style="display:flex; align-items:center; gap:5px;">
                      <input type="color" class="vest-ed-color" id="vest-tb-long-border-color" value="${normalizeHexColor(tc.longBadgeBorderColor, '#38bdf8')}" style="width:26px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                      <span style="font-size:10.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(tc.longBadgeBorderColor, '#38bdf8')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:12px; font-weight:700; color:#f8fafc;">SHORT Side Badge</span>
                  <span class="vest-ctb-side-badge short" id="vest-tb-short-badge-preview" style="${buildSideBadgeInlineStyle('SHORT', tc)}">SHORT</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                  <div class="vest-ed-field">
                    <label class="vest-ed-label">Text Color</label>
                    <div style="display:flex; align-items:center; gap:5px;">
                      <input type="color" class="vest-ed-color" id="vest-tb-short-text-color" value="${normalizeHexColor(tc.shortBadgeTextColor, '#fbbf24')}" style="width:26px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                      <span style="font-size:10.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(tc.shortBadgeTextColor, '#fbbf24')}</span>
                    </div>
                  </div>
                  <div class="vest-ed-field">
                    <label class="vest-ed-label">Fill &amp; Opacity</label>
                    <div style="display:flex; align-items:center; gap:5px;">
                      <input type="color" class="vest-ed-color" id="vest-tb-short-bg-color" data-opacity-input="#vest-tb-short-bg-opacity" value="${normalizeHexColor(tc.shortBadgeBgColor, '#0f172a')}" style="width:26px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                      <span id="vest-tb-short-bg-op-badge" style="font-size:10.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${tc.shortBadgeBgOpacity}%</span>
                      <input type="range" id="vest-tb-short-bg-opacity" min="0" max="100" value="${tc.shortBadgeBgOpacity}" style="display:none;" />
                    </div>
                  </div>
                  <div class="vest-ed-field">
                    <label class="vest-ed-label">Border Color</label>
                    <div style="display:flex; align-items:center; gap:5px;">
                      <input type="color" class="vest-ed-color" id="vest-tb-short-border-color" value="${normalizeHexColor(tc.shortBadgeBorderColor, '#fbbf24')}" style="width:26px; height:24px; padding:0; border-radius:5px; cursor:pointer;" />
                      <span style="font-size:10.5px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(tc.shortBadgeBorderColor, '#fbbf24')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Side Badge Font Family</label>
                <select class="vest-ed-select" id="vest-tb-side-font-family">
                  ${SESSION_FONT_FAMILIES.map(f => `
                    <option value="${escapeHtml(f.id)}" ${f.id === tc.sideBadgeFontFamily ? 'selected' : ''}>${escapeHtml(f.label)}</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Badge Font Size: <span id="vest-tb-side-fontsize-val">${tc.sideBadgeFontSize}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-tb-side-font-size" min="7" max="14" step="0.5" value="${tc.sideBadgeFontSize}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Badge Font Style</label>
                <select class="vest-ed-select" id="vest-tb-side-font-style">
                  <option value="normal" ${tc.sideBadgeFontStyle === 'normal' ? 'selected' : ''}>Normal</option>
                  <option value="bold" ${(tc.sideBadgeFontStyle || 'bold') === 'bold' ? 'selected' : ''}>Bold</option>
                  <option value="italic" ${tc.sideBadgeFontStyle === 'italic' ? 'selected' : ''}>Italic</option>
                  <option value="bold_italic" ${tc.sideBadgeFontStyle === 'bold_italic' ? 'selected' : ''}>Bold Italic</option>
                </select>
              </div>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Box Appearance, Timezone &amp; Instrument Filtering
            </div>
            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Header Title</label>
                <input type="text" class="vest-ed-input" id="vest-tb-title" value="${escapeHtml(tc.boxTitle)}" placeholder="Instrument Trades" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Timezone Display</label>
                <select class="vest-ed-select" id="vest-tb-tz">
                  <option value="ny" ${tc.timeZoneMode === 'ny' ? 'selected' : ''}>New York (EST/EDT)</option>
                  <option value="local" ${tc.timeZoneMode === 'local' ? 'selected' : ''}>Local Browser Time</option>
                  <option value="utc" ${tc.timeZoneMode === 'utc' ? 'selected' : ''}>UTC</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Time Format</label>
                <select class="vest-ed-select" id="vest-tb-time-fmt">
                  <option value="12h" ${tc.timeFormat === '12h' ? 'selected' : ''}>12-Hour (9:30am)</option>
                  <option value="24h" ${tc.timeFormat === '24h' ? 'selected' : ''}>24-Hour (09:30)</option>
                </select>
              </div>
            </div>

            <div class="vest-ed-grid-4" style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Max Visible Trades</label>
                <select class="vest-ed-select" id="vest-tb-max-trades">
                  ${[4, 6, 8, 10, 12, 15, 20, 30].map(n => `
                    <option value="${n}" ${Number(tc.maxTrades) === n ? 'selected' : ''}>${n} Trades</option>
                  `).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Width: <span id="vest-tb-width-val">${tc.boxWidth}px</span></label>
                <input type="range" class="vest-ed-range" id="vest-tb-width" min="430" max="660" value="${tc.boxWidth}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Box Background &amp; Opacity</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-bg-color" data-opacity-input="#vest-tb-bg-opacity" value="${normalizeHexColor(tc.bgColor, '#131722')}" style="width:30px; height:26px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span id="vest-tb-bg-op-badge" style="font-size:11px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${tc.bgOpacity}%</span>
                  <input type="range" id="vest-tb-bg-opacity" min="25" max="100" value="${tc.bgOpacity}" style="display:none;" />
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Border Color</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="color" class="vest-ed-color" id="vest-tb-border-color" value="${normalizeHexColor(tc.borderColor, '#38bdf8')}" style="width:30px; height:26px; padding:0; border-radius:5px; cursor:pointer;" />
                  <span style="font-size:11px; color:#cbd5e1; font-family:'JetBrains Mono', monospace;">${normalizeHexColor(tc.borderColor, '#38bdf8')}</span>
                </div>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:16px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-filter-inst" ${tc.filterCurrentInstrument !== false ? 'checked' : ''} />
                <span>Filter to Currently Selected Instrument Only (<strong>${escapeHtml(activeSymLabel)}</strong>)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-filter-session" ${tc.filterCurrentSessionOnly !== false ? 'checked' : ''} />
                <span>Current Trading Session Only (<strong>6:00 PM ET Prev Night – 4:59 PM ET Today</strong>)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-show-side" ${tc.showSideBadge !== false ? 'checked' : ''} />
                <span>Show Long / Short Badge</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-show-summary" ${tc.showSummaryFooter !== false ? 'checked' : ''} />
                <span>Show Net PnL &amp; Win Rate Footer</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px;">
                <input type="checkbox" id="vest-tb-auto-capture" ${tc.autoCaptureTrades !== false ? 'checked' : ''} />
                <span>Auto-Populate Once from Positions History</span>
              </label>
            </div>
          </div>

          <div class="vest-ed-section" style="margin-bottom:4px; padding:12px 14px; background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.16); border-radius:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <div style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.6px;">
                Log Trade for ${escapeHtml(activeSymLabel)} (${matchingTrades.length} Recorded)
              </div>
              ${tc.trades.length > 0 ? `
                <button type="button" class="vest-tvs-action-btn" id="vest-tb-clear-all-btn" style="height:22px; padding:0 8px; font-size:10.5px; color:#f87171; border-color:rgba(248,113,113,0.35);">
                  Clear All Trades
                </button>
              ` : ''}
            </div>
            <div style="display:grid; grid-template-columns: 92px 76px 96px 96px 1fr auto; gap:6px; align-items:center;">
              <input type="text" class="vest-ed-input" id="vest-tb-add-symbol" value="${escapeHtml(activeSymLabel)}" placeholder="Symbol" style="height:28px; font-family:'JetBrains Mono', monospace; font-size:11.5px;" title="Instrument Symbol" />
              <select class="vest-ed-select" id="vest-tb-add-side" style="height:28px; font-size:11.5px;">
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
              <input type="time" class="vest-ed-input" id="vest-tb-add-entry" value="09:35" step="1" style="height:28px; font-family:'JetBrains Mono', monospace; font-size:11px;" title="Entry Time" />
              <input type="time" class="vest-ed-input" id="vest-tb-add-exit" value="09:52" step="1" style="height:28px; font-family:'JetBrains Mono', monospace; font-size:11px;" title="Exit Time" />
              <input type="number" class="vest-ed-input" id="vest-tb-add-pnl" step="0.01" placeholder="PnL ($) e.g. 245.50 or -110" style="height:28px; font-family:'JetBrains Mono', monospace; font-size:11.5px;" title="Realized PnL in USD (+ for Win, - for Loss)" />
              <button type="button" class="vest-tvs-action-btn" id="vest-tb-add-btn" style="height:28px; padding:0 12px; border-color:#10b981; color:#34d399; font-size:11.5px;">
                + Add Trade
              </button>
            </div>
            ${matchingTrades.length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px; max-height:140px; overflow-y:auto;">
                ${matchingTrades.slice(0, 20).map((tr) => {
                  const isWin = tr.pnl > 0;
                  const isLoss = tr.pnl < 0;
                  const rowBg = isWin
                    ? hexToRgba(tc.winRowColor, Math.min(45, tc.winRowOpacity) / 100)
                    : isLoss
                      ? hexToRgba(tc.lossRowColor, Math.min(45, tc.lossRowOpacity) / 100)
                      : 'rgba(255,255,255,0.04)';
                  const pnlFormatted = `${tr.pnl >= 0 ? '+' : '-'}$${Math.abs(tr.pnl).toFixed(2)}`;
                  const dateFormatted = formatTradeDateShort(tr.exitTime || tr.entryTime, tc);
                  const sideBadgeStyle = buildSideBadgeInlineStyle(tr.side, tc);
                  return `
                    <div style="display:grid; grid-template-columns: 52px minmax(0, 1fr); gap:8px; align-items:center;">
                      <span class="vest-ctb-side-badge ${tr.side === 'SHORT' ? 'short' : 'long'}" style="${sideBadgeStyle}">${escapeHtml(tr.side)}</span>
                      <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 8px; background:${rowBg}; border-left:3px solid ${isWin ? tc.winRowColor : isLoss ? tc.lossRowColor : '#64748b'}; border-radius:5px; font-size:11.5px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span style="font-family:'JetBrains Mono', monospace; font-weight:700; color:#f8fafc;">${escapeHtml(tr.symbol)}</span>
                          <span style="font-family:'JetBrains Mono', monospace; color:#cbd5e1;">${escapeHtml(dateFormatted)}</span>
                          <span style="font-family:'JetBrains Mono', monospace; color:#e2e8f0;">${escapeHtml(formatTradeTimeShort(tr.entryTime, tc))} → ${escapeHtml(formatTradeTimeShort(tr.exitTime, tc))}</span>
                          <span style="font-family:'JetBrains Mono', monospace; color:#94a3b8;">(${escapeHtml(formatTradeDuration(tr.durationMs || (tr.exitTime - tr.entryTime)))})</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span style="font-family:'JetBrains Mono', monospace; font-weight:700; color:${isWin ? '#4ade80' : isLoss ? '#fca5a5' : '#cbd5e1'};">${escapeHtml(pnlFormatted)}</span>
                          <button type="button" class="vest-cnb-icon-btn vest-tb-del-trade" data-id="${escapeHtml(tr.id)}" title="Delete trade" style="color:#f87171;">×</button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }

      if (activeTab === 'candleohlc') {
        const co = normalizeCandleOhlcConfig(draftSettings.candleOhlc);
        draftSettings.candleOhlc = co;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <div>
              <div class="vest-tvs-section-title" style="margin-bottom:2px;">CANDLE OHLC, NUMBERING &amp; WIDTH SETTINGS</div>
              <div style="font-size:11.5px; color:#868993;">Display OHLC values, label candles #1–#${co.candleNumbersMax} in an outlined box below each candle, and adjust candle width.</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" class="vest-tvs-action-btn" id="vest-co-clear-clicked-btn" style="height:28px; padding:0 10px; font-size:11.5px;" title="Turn off all individually clicked candle OHLC labels">
                Clear Clicked Candles
              </button>
              <button type="button" class="vest-tvs-action-btn" id="vest-co-reset-defaults-btn" style="height:28px; padding:0 10px; font-size:11.5px; border-color:rgba(248,113,113,0.35); color:#f87171;" title="Reset Candle settings to factory defaults">
                Reset Defaults
              </button>
            </div>
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
                <span>Custom Candle Size &amp; Spacing</span>
              </label>
            </div>

            <div class="vest-ed-grid-3" style="margin-bottom:10px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Candle Width Scale (<span id="vest-co-width-val">${co.candleWidthPx}%</span>)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <button type="button" class="vest-tvs-action-btn" id="vest-co-width-dec-btn" style="height:24px; width:26px; padding:0; font-weight:700;" title="Make candles narrower and tighter">−</button>
                  <input type="range" class="vest-ed-range" id="vest-co-candle-width" min="40" max="260" step="5" value="${co.candleWidthPx}" style="flex:1;" />
                  <button type="button" class="vest-tvs-action-btn" id="vest-co-width-inc-btn" style="height:24px; width:26px; padding:0; font-weight:700;" title="Make candles wider and space out left &amp; right">+</button>
                </div>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Max Numbered Candles (<span id="vest-co-num-max-val">#1–#${co.candleNumbersMax}</span>)</label>
                <input type="number" class="vest-ed-input" id="vest-co-num-max" min="10" max="300" step="5" value="${co.candleNumbersMax}" style="height:28px; font-family:'JetBrains Mono', monospace;" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Number Font Size (<span id="vest-co-num-fontsize-val">${co.candleNumberFontSize}px</span>)</label>
                <input type="range" class="vest-ed-range" id="vest-co-num-font-size" min="7.5" max="14" step="0.5" value="${co.candleNumberFontSize}" />
              </div>
            </div>

            <div class="vest-ed-grid-3">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Outline / Border Color</label>
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
                <label class="vest-ed-label">Box Fill &amp; Opacity (<span id="vest-co-num-bg-op-val">${co.candleNumberBgOpacity}%</span>)</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" id="vest-co-num-bg-color" value="${co.candleNumberBgColor}" style="width:28px; height:26px; border:none; background:transparent; cursor:pointer; padding:0;" />
                  <input type="range" class="vest-ed-range" id="vest-co-num-bg-opacity" min="20" max="100" step="1" value="${co.candleNumberBgOpacity}" style="flex:1;" />
                </div>
              </div>
            </div>
          </div>

          <div class="vest-tvs-toggle-box" style="margin-bottom:10px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Show OHLC Values on All Visible Candles</div>
              <div class="vest-tvs-toggle-desc">
                When enabled, automatically displays High, Low, Open, and Close values on every visible candle on the chart. You can still click any candle to turn its individual OHLC display off or back on.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Show OHLC Values on All Visible Candles">
              <input type="checkbox" id="vest-co-master-enabled" ${co.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-tvs-toggle-box" style="margin-bottom:12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Click Any Candle to Toggle Its OHLC Values ON / OFF</div>
              <div class="vest-tvs-toggle-desc">
                Simply click directly on any candle body or wick (or its OHLC label) on the chart to toggle that specific candle's Open, High, Low, and Close values ON or OFF.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Click Any Candle to Toggle OHLC">
              <input type="checkbox" id="vest-co-click-toggle" ${co.clickCandleToToggle !== false ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>

          <div class="vest-ed-section" style="margin-bottom:12px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; color:#868993; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
              Displayed Values &amp; Layout Style
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:12px;">
              <label class="vest-ed-checkbox-label" style="font-size:12px; padding:6px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px;">
                <input type="checkbox" id="vest-co-show-open" ${co.showOpen !== false ? 'checked' : ''} />
                <span>Open (O)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px; padding:6px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px;">
                <input type="checkbox" id="vest-co-show-high" ${co.showHigh !== false ? 'checked' : ''} />
                <span>High (H)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px; padding:6px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px;">
                <input type="checkbox" id="vest-co-show-low" ${co.showLow !== false ? 'checked' : ''} />
                <span>Low (L)</span>
              </label>
              <label class="vest-ed-checkbox-label" style="font-size:12px; padding:6px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px;">
                <input type="checkbox" id="vest-co-show-close" ${co.showClose !== false ? 'checked' : ''} />
                <span>Close (C)</span>
              </label>
            </div>

            <div class="vest-ed-grid-3" style="margin-bottom:4px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Display Mode</label>
                <select class="vest-ed-select" id="vest-co-display-mode">
                  <option value="badge" ${co.displayMode !== 'levels' ? 'selected' : ''}>Stacked OHLC Callout Card</option>
                  <option value="levels" ${co.displayMode === 'levels' ? 'selected' : ''}>Price Tags at Exact O/H/L/C Levels</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Price Decimals</label>
                <select class="vest-ed-select" id="vest-co-decimals">
                  <option value="auto" ${co.decimals === 'auto' ? 'selected' : ''}>Auto-Detect Instrument Tick</option>
                  <option value="0" ${co.decimals === '0' ? 'selected' : ''}>0 Decimals (12345)</option>
                  <option value="1" ${co.decimals === '1' ? 'selected' : ''}>1 Decimal (12345.6)</option>
                  <option value="2" ${co.decimals === '2' ? 'selected' : ''}>2 Decimals (12345.67)</option>
                  <option value="3" ${co.decimals === '3' ? 'selected' : ''}>3 Decimals (1.234)</option>
                  <option value="4" ${co.decimals === '4' ? 'selected' : ''}>4 Decimals (1.2345)</option>
                  <option value="5" ${co.decimals === '5' ? 'selected' : ''}>5 Decimals (1.23456)</option>
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

      if (activeTab === 'positionhud') {
        const ph = normalizePositionHudConfig(draftSettings.positionHud);
        draftSettings.positionHud = ph;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <div>
              <div class="vest-tvs-section-title" style="margin-bottom:2px;">ACTIVE POSITION CHART HUD &amp; QUICK FLATTEN</div>
              <div style="font-size:11.5px; color:#868993;">Live estimated PnL following the yellow price line, one-click position flatten [ ✕ ], and unclipped entry box PnL badge.</div>
            </div>
            <button type="button" class="vest-tvs-action-btn" id="vest-ph-reset-defaults-btn" style="height:28px; padding:0 10px; font-size:11.5px; border-color:rgba(248,113,113,0.35); color:#f87171;" title="Reset Position HUD to factory defaults">
              Reset Defaults
            </button>
          </div>

          <div class="vest-tvs-toggle-box" style="margin-bottom:12px;">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Enable Active Position Chart Overlay HUD</div>
              <div class="vest-tvs-toggle-desc">
                When you have an open trade, tracks the position in real time on the chart with interactive PnL overlays and one-click execution.
              </div>
            </div>
            <label class="vest-tvs-switch" title="Toggle Active Position Chart Overlay HUD">
              <input type="checkbox" id="vest-ph-master-enabled" ${ph.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
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

      if (activeTab === 'faillines') {
        const cfg = normalizeFailLinesConfig(draftSettings.failLines);
        draftSettings.failLines = cfg;
        return `
          <div class="vest-tvs-section-title">CHART TRADER PANEL SETTINGS</div>
          <p style="font-size:12px;color:#a1a1aa;line-height:1.5;margin:0 0 14px;">Shows Vest's current Long and Short fail prices as horizontal chart lines. The lines update as the prices in the order panel change.</p>
          <div class="vest-tvs-toggle-box">
            <div class="vest-tvs-toggle-info">
              <div class="vest-tvs-toggle-title">Show Long and Short Fail Price Lines</div>
              <div class="vest-tvs-toggle-desc">Reads the live fail prices from the Vest trading panel and keeps both labeled lines aligned with their chart prices.</div>
            </div>
            <label class="vest-tvs-switch" title="Toggle live fail price chart lines">
              <input type="checkbox" id="vest-fail-lines-enabled" ${cfg.enabled ? 'checked' : ''} />
              <span class="vest-tvs-switch-slider"></span>
            </label>
          </div>
          <div style="margin-top:16px;padding:14px;border:1px solid #272d38;border-radius:8px;background:#11151d;">
            <label for="vest-fail-lines-label-size" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin-bottom:8px;">Label size <span id="vest-fail-lines-label-size-value" style="color:#38bdf8;">${cfg.labelSize}%</span></label>
            <input id="vest-fail-lines-label-size" type="range" min="75" max="150" step="5" value="${cfg.labelSize}" style="width:100%;accent-color:#0ea5e9;" />
            <label for="vest-fail-lines-font-size" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin:14px 0 8px;">Font size <span id="vest-fail-lines-font-size-value" style="color:#38bdf8;">${cfg.fontSize}px</span></label>
            <input id="vest-fail-lines-font-size" type="range" min="8" max="18" step="1" value="${cfg.fontSize}" style="width:100%;accent-color:#0ea5e9;" />
          </div>
        `;
      }

      if (activeTab === 'cortexindicator') {
        const cfg = normalizeCortexIndicatorConfig(draftSettings.cortexIndicator);
        draftSettings.cortexIndicator = cfg;
        const range = (id, label, min, max, step, value, unit = '') => `
          <label for="${id}" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e4e4e7;margin:14px 0 7px;">${label}<span id="${id}-value" style="color:#38bdf8;">${value}${unit}</span></label>
          <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" style="width:100%;accent-color:#0ea5e9;" />`;
        return `
          <div class="vest-tvs-section-title">CORTEX INDICATOR</div>
          <p style="font-size:12px;color:#a1a1aa;line-height:1.55;margin:0 0 14px;">A configurable trend-following prototype inspired by the supplied chart: ATR trend bands, a shaded EMA channel, trend-flip markers, projected risk/targets, and multi-timeframe direction. The original indicator’s private formula is unknown, so this is an approximation.</p>
          <div class="vest-tvs-toggle-box">
            <div class="vest-tvs-toggle-info"><div class="vest-tvs-toggle-title">Show Cortex Indicator</div><div class="vest-tvs-toggle-desc">Draw the indicator over the current chart candles.</div></div>
            <label class="vest-tvs-switch"><input type="checkbox" id="vest-ci-enabled" ${cfg.enabled ? 'checked' : ''} /><span class="vest-tvs-switch-slider"></span></label>
          </div>
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

      return '';
    }

    let modalOffset = { x: 0, y: 0 };
    let isDraggingModal = false;
    let dragStartMouse = { x: 0, y: 0 };
    let dragStartOffset = { x: 0, y: 0 };
    let justFinishedDragging = false;

    function closeSettingsOverlay() {
      if (typeof closeTvColorPickerPopover === 'function') closeTvColorPickerPopover();
      if (voicesChangedHandler && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        voicesChangedHandler = null;
      }
      window.removeEventListener('mousemove', onModalMouseMove, true);
      window.removeEventListener('mouseup', onModalMouseUp, true);
      overlay.remove();
      // Restore committed settings to main world in case user cancelled after previewing
      notifyMainWorldConfig();
      if (typeof renderChartNewsBox === 'function') renderChartNewsBox();
      if (typeof renderChartTradesBox === 'function') renderChartTradesBox();
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

    function renderDialog() {
      if (voicesChangedHandler && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        voicesChangedHandler = null;
      }
      overlay.innerHTML = `
        <div class="vest-tvs-card" role="dialog" aria-label="Trading Cortex Settings" style="width: 820px; height: 580px; transform: translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0);">
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
        </div>
      `;

      wireDialogEvents();
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

    function syncCurrentPaneToDraft() {
      const remToggle = overlay.querySelector('#vest-tvs-remember-tools-toggle');
      if (remToggle) {
        draftSettings.rememberSidebarTools = Boolean(remToggle.checked);
      }
      const remChartToggle = overlay.querySelector('#vest-tvs-remember-chart-settings-toggle');
      if (remChartToggle) {
        draftSettings.rememberLastChartSettings = Boolean(remChartToggle.checked);
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
      showToast('Settings saved');
      if (typeof closeTvColorPickerPopover === 'function') closeTvColorPickerPopover();
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

      // Live preview & range label updates on Session Indicators tab
      if (activeTab === 'sessions') {
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
          renderDialog();
          broadcastLiveSessionDraft();
          showToast('Reset Session Indicators to ICT defaults');
        });
      }

      if (activeTab === 'autofvg') {
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
          renderDialog();
          broadcastLiveSessionDraft();
          showToast("Reset Auto FVG's to defaults");
        });
      }

      if (activeTab === 'news') {
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

      if (activeTab === 'trades') {
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

      if (activeTab === 'candleohlc') {
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

      if (activeTab === 'positionhud') {
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

      if (activeTab === 'faillines') {
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

      if (activeTab === 'cortexindicator') {
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

      // Close / Cancel / Save Settings
      overlay.querySelector('#vest-tvs-close')?.addEventListener('click', closeSettingsOverlay);
      overlay.querySelector('#vest-tvs-cancel')?.addEventListener('click', closeSettingsOverlay);
      overlay.querySelector('#vest-tvs-ok')?.addEventListener('click', commitDraftAndClose);

      // About tab OTA button
      overlay.querySelector('#vest-tvs-open-ota-btn')?.addEventListener('click', () => {
        closeSettingsOverlay();
        if (isExtensionValid() && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'openUpdaterPage' });
        }
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

  /** Available full-screen area, reserving the bottom 50px for the Cortex bar. */
  function getScreenBoundsRect() {
    const left = 0;
    const top = 0;
    const right = Math.max(1, window.innerWidth);
    const bottom = Math.max(1, window.innerHeight - 50);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  /**
   * Places minimized News and Trades pills inside the Cortex bottom bar.
   */
  function getMinimizedCortexBarCoords(boxType, boxEl) {
    const boxW = (boxEl && boxEl.offsetWidth) || (boxType === 'trades' ? 235 : 210);
    const boxH = (boxEl && boxEl.offsetHeight) || 32;
    const pill = document.getElementById('vest-studio-pill-btn');
    const pillRect = pill ? pill.getBoundingClientRect() : { right: 28 };
    let targetLeft = pillRect.right + 12;
    if (boxType === 'trades' && settings.newsBox && settings.newsBox.enabled && settings.newsBox.collapsed) {
      const newsW = (chartNewsBoxEl && chartNewsBoxEl.offsetWidth) || 215;
      targetLeft += newsW + 8;
    }
    targetLeft = Math.min(Math.max(8, targetLeft), Math.max(8, window.innerWidth - boxW - 8));
    const targetTop = Math.round(window.innerHeight - 50 + (50 - boxH) / 2);
    return {
      left: Math.round(targetLeft),
      top: Math.round(targetTop)
    };
  }

  /**
   * Performs a smooth FLIP (First, Last, Invert, Play) window minimize/restore animation
   * between the box's last saved position and its place in the Cortex bottom bar.
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
            <button type="button" class="vest-cnb-icon-btn" id="vest-cnb-collapse-btn" title="Minimize to the Cortex bottom bar">
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

    // If Trades Box is also minimized at the bottom-left, keep its horizontal offset synced
    if (settings.tradesBox && settings.tradesBox.enabled && settings.tradesBox.collapsed) {
      clampAndPositionChartTradesBox();
    }

    if (!newsBoxTickerInterval) {
      // Refresh countdowns & viewport clamping every 15 seconds, plus periodic feed check
      newsBoxTickerInterval = setInterval(() => {
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

          // Keep the whole box inside the usable screen area above the Cortex bottom bar.
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
      queueSettingsSave({ newsBox: settings.newsBox });
      renderChartNewsBox(prevRect);
    });
  }

  if (isTopWindow) {
    window.addEventListener('resize', () => {
      if (settings.newsBox && settings.newsBox.enabled) {
        clampAndPositionChartNewsBox();
      }
      if (settings.tradesBox && settings.tradesBox.enabled) {
        clampAndPositionChartTradesBox();
      }
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
            <button type="button" class="vest-cnb-icon-btn" id="vest-ctb-collapse-btn" title="Minimize to the Cortex bottom bar">
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

          // Keep the whole box inside the usable screen area above the Cortex bottom bar.
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
      queueSettingsSave({ tradesBox: settings.tradesBox });
      renderChartTradesBox(prevRect);
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

  // -------------------------------------------------------------
  // Keyboard Shortcuts
  // -------------------------------------------------------------
  function setupHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (!settings.hotkeysEnabled) return;

      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

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

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'vest-toast';
      document.body.appendChild(toastEl);
    }

    toastEl.textContent = msg;
    toastEl.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toastEl) toastEl.classList.remove('show');
    }, 2200);
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
        <div class="vest-tvs-card" role="dialog" aria-label="Trading Cortex Template Manager" style="width: 820px; height: 560px; transform: translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0);">
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
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    try {
      const data = await safeStorageGet(['templates', 'settings', 'globalDrawings', 'updaterState', 'installedVersionOverride']);
      globalDrawings = normalizeGlobalDrawings(data.globalDrawings);
      if (data.installedVersionOverride) {
        installedVersionOverride = data.installedVersionOverride;
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
          sessionIndicators: normalizeSessionIndicatorsConfig(data.settings.sessionIndicators),
          autoFvg: normalizeAutoFvgConfig(data.settings.autoFvg),
          newsBox: normalizeNewsBoxConfig(data.settings.newsBox),
          tradesBox: normalizeTradesBoxConfig(data.settings.tradesBox),
          candleOhlc: normalizeCandleOhlcConfig(data.settings.candleOhlc),
          failLines: normalizeFailLinesConfig(data.settings.failLines),
          cortexIndicator: normalizeCortexIndicatorConfig(data.settings.cortexIndicator),
          favoriteTimeframes: normalizeFavoriteTimeframes(data.settings.favoriteTimeframes)
        };
        if (settings.activeTemplateId && LEGACY_PRESET_IDS.has(String(settings.activeTemplateId))) {
          settings.activeTemplateId = templates[0]?.id || null;
        }
        if (settings.defaultTemplateId && LEGACY_PRESET_IDS.has(String(settings.defaultTemplateId))) {
          settings.defaultTemplateId = templates[0]?.id || null;
        }
      } else {
        settings.sessionIndicators = normalizeSessionIndicatorsConfig(settings.sessionIndicators);
        settings.autoFvg = normalizeAutoFvgConfig(settings.autoFvg);
        settings.newsBox = normalizeNewsBoxConfig(settings.newsBox);
        settings.tradesBox = normalizeTradesBoxConfig(settings.tradesBox);
        settings.candleOhlc = normalizeCandleOhlcConfig(settings.candleOhlc);
        settings.failLines = normalizeFailLinesConfig(settings.failLines);
        settings.cortexIndicator = normalizeCortexIndicatorConfig(settings.cortexIndicator);
        settings.favoriteTimeframes = normalizeFavoriteTimeframes(settings.favoriteTimeframes);
      }
      // Persist cleaned templates & settings so legacy defaults are permanently removed
      safeStorageSet({ templates, settings });

      if (data.updaterState) {
        const currentVer = getSafeExtVersion();
        isUpdateAvailable = Boolean(
          data.updaterState.updateAvailable &&
          (!data.updaterState.latestVersion || compareSemver(data.updaterState.latestVersion, currentVer) > 0)
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
        initPanelManager();
        renderChartNewsBox();
        renderChartTradesBox();
        setupIsolatedActionTracking();
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
