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
    lastChartSettings: {}
  };
  let hasReceivedConfigUpdate = false;

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
    const mainColor = parseColorAndAlpha(tpl.color, '#22c55e').hex;
    const bgColor = parseColorAndAlpha(tpl.backgroundColor || mainColor, mainColor).hex;
    const lineW = Number(tpl.linewidth) || 1;
    const lineS = Number(tpl.linestyle ?? 0);
    const showMiddleLine = Boolean(tpl.showMiddleLine);
    const middleLineColor = parseColorAndAlpha(tpl.middleLineColor || mainColor, mainColor).hex;
    const middleLineWidth = Number(tpl.middleLineWidth) || 1;
    const middleLineStyle = tpl.middleLineStyle !== undefined ? Number(tpl.middleLineStyle) : 2;
    const horzAlign = tpl.horzLabelsAlign || 'right';
    const vertAlign = tpl.vertLabelsAlign || 'middle';
    const txtColor = parseColorAndAlpha(tpl.textColor || mainColor, mainColor).hex;
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
    restoreSidebarSelections();
    restoreLastChartSettings();
    syncExtendedRectangleTextHooks();
    setupIctSessionIndicators();

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
        popupRoot.style.display = 'none';
      }
      doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
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
    if (rowParent.querySelector('[data-vest-cmi="true"]')) return true;

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

    log('Successfully injected native "Template >" row above "Visual order"!');
    return true;
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
            sidebarState: {
              ...prevSidebar,
              ...incomingSidebar,
              groupTools: {
                ...(prevSidebar.groupTools || {}),
                ...(incomingSidebar.groupTools || {})
              }
            }
          };
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
        hasReceivedConfigUpdate = true;

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

  function scheduleSaveCurrentChartSettings(delayMs = 280) {
    if (isRestoringChartSettings) return;
    if (currentSettings.rememberLastChartSettings === false) return;
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

  function saveCurrentChartSettings() {
    if (isRestoringChartSettings) return;
    if (currentSettings.rememberLastChartSettings === false) return;

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
    if (viewport) {
      const symKey = symbol || '__default__';
      viewportsBySymbol[symKey] = {
        ...viewport,
        resolution,
        updatedAt: Date.now()
      };
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
      localStorageEntries: mergedEntries
    };

    // Compare ignoring updatedAt timestamp
    const prevComparable = JSON.stringify({
      symbol: prev.symbol,
      resolution: prev.resolution,
      chartType: prev.chartType,
      viewport: prev.viewport,
      localStorageEntries: prev.localStorageEntries
    });
    const nextComparable = JSON.stringify({
      symbol: nextSettings.symbol,
      resolution: nextSettings.resolution,
      chartType: nextSettings.chartType,
      viewport: nextSettings.viewport,
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

      // Determine target viewport for current symbol (or fallback to last saved viewport)
      let currentSymbol = null;
      try {
        if (typeof activeChart.symbol === 'function') {
          currentSymbol = activeChart.symbol();
        }
      } catch (e) {}

      const targetViewport =
        (currentSymbol && saved.viewportsBySymbol && saved.viewportsBySymbol[currentSymbol]) ||
        saved.viewport ||
        null;

      // 3. Restore saved resolution (timeframe), then apply viewport position & zoom
      let didChangeResolution = false;
      if (saved.resolution && typeof activeChart.setResolution === 'function') {
        try {
          const currentRes = typeof activeChart.resolution === 'function' ? String(activeChart.resolution()) : null;
          if (currentRes !== String(saved.resolution)) {
            log('Restoring chart resolution to', saved.resolution);
            didChangeResolution = true;
            activeChart.setResolution(String(saved.resolution), () => {
              if (targetViewport) {
                setTimeout(() => applyViewportStateToChart(targetViewport), 180);
                setTimeout(() => applyViewportStateToChart(targetViewport), 650);
              }
            });
          }
        } catch (e) {}
      }

      // 4. Restore chart viewport position (left/right pan, up/down price scale, zoom)
      // We apply once shortly after hook and a second pass after historical bars finish rendering
      if (targetViewport) {
        const firstDelay = didChangeResolution ? 350 : 180;
        const secondDelay = didChangeResolution ? 1100 : 750;
        setTimeout(() => {
          log('Restoring chart viewport position & zoom (pass 1):', targetViewport);
          applyViewportStateToChart(targetViewport);
        }, firstDelay);
        setTimeout(() => {
          applyViewportStateToChart(targetViewport);
        }, secondDelay);
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

  let cachedChartTz = null;
  let cachedChartTzFormatter = null;
  let lastChartTzCheckMs = 0;

  function getActiveChartDisplayTimeZone() {
    const now = Date.now();
    if (cachedChartTz && now - lastChartTzCheckMs < 3000) {
      return cachedChartTz;
    }
    lastChartTzCheckMs = now;

    // 1. Check TradingView ChartModel / Widget timezone API
    try {
      const model = getInternalChartModel() || getChartModel();
      if (model) {
        if (typeof model.timezone === 'function') {
          const tz = model.timezone();
          const tzVal = (tz && typeof tz === 'object' && typeof tz.value === 'function') ? tz.value() : tz;
          if (typeof tzVal === 'string' && tzVal && tzVal !== 'exchange') {
            cachedChartTz = tzVal;
            return cachedChartTz;
          }
        }
        if (model._timezone) {
          const tzVal = typeof model._timezone.value === 'function' ? model._timezone.value() : model._timezone;
          if (typeof tzVal === 'string' && tzVal && tzVal !== 'exchange') {
            cachedChartTz = tzVal;
            return cachedChartTz;
          }
        }
      }
      if (activeChart && typeof activeChart.getTimezoneApi === 'function') {
        const tzApi = activeChart.getTimezoneApi();
        if (tzApi && typeof tzApi.getTimezone === 'function') {
          const tzObj = tzApi.getTimezone();
          if (tzObj && typeof tzObj.id === 'string' && tzObj.id !== 'exchange') {
            cachedChartTz = tzObj.id;
            return cachedChartTz;
          }
        }
      }
    } catch (e) {}

    // 2. Check localStorage tradingview.chartproperties timezone
    try {
      const rawProps = window.localStorage.getItem('tradingview.chartproperties');
      if (rawProps) {
        const parsed = JSON.parse(rawProps);
        if (parsed && typeof parsed.timezone === 'string' && parsed.timezone !== 'exchange') {
          cachedChartTz = parsed.timezone;
          return cachedChartTz;
        }
      }
    } catch (e) {}

    // 3. Fallback to browser's local timezone (which TradingView defaults to when not overridden) or America/New_York
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz) {
        cachedChartTz = browserTz;
        return cachedChartTz;
      }
    } catch (e) {}

    return 'America/New_York';
  }

  function getFormatterForTimeZone(tz) {
    const targetTz = tz || 'America/New_York';
    if (cachedChartTzFormatter && cachedChartTzFormatter.__tz === targetTz) {
      return cachedChartTzFormatter;
    }
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: targetTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      fmt.__tz = targetTz;
      cachedChartTzFormatter = fmt;
      return fmt;
    } catch (e) {
      return nyDateFormatter;
    }
  }

  function getNyDateParts(unixSec, tzOverride) {
    const ms = unixSec > 1e11 ? unixSec : unixSec * 1000;
    const d = new Date(ms);
    const resolvedTz = (!tzOverride || tzOverride === 'chart' || tzOverride === 'local')
      ? getActiveChartDisplayTimeZone()
      : tzOverride;
    const fmt = getFormatterForTimeZone(resolvedTz) || nyDateFormatter;
    if (!fmt) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return {
        dateKey: `${y}-${m}-${day}`,
        minutesOfDay: d.getUTCHours() * 60 + d.getUTCMinutes()
      };
    }
    const parts = fmt.formatToParts(d);
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

  function findMainChartPaneCanvas() {
    // Only render from the top window (which has access to both document and same-origin/blob iframe.contentDocument).
    // If we are inside a child iframe and window.top also initialized content-main.js, let window.top handle it so we NEVER double-render!
    try {
      if (window.top && window.top !== window && window.top.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__) {
        return null;
      }
    } catch (e) {}

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

    return bestCanvas;
  }

  function ensureIctSessionsOverlayCanvas(targetChartCanvas) {
    if (!targetChartCanvas || !targetChartCanvas.parentElement) return null;
    const parent = targetChartCanvas.parentElement;
    const ownerDoc = targetChartCanvas.ownerDocument || document;

    // Clean up any stale or duplicate .vest-ict-sessions-canvas elements across all documents
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

    if (!ictSessionsCanvas || !ictSessionsCanvas.isConnected || ictSessionsCanvas.parentElement !== parent) {
      if (ictSessionsCanvas && ictSessionsCanvas.parentElement) {
        try { ictSessionsCanvas.remove(); } catch (e) {}
      }
      ictSessionsCanvas = ownerDoc.createElement('canvas');
      ictSessionsCanvas.className = 'vest-ict-sessions-canvas';
      // mix-blend-mode: screen illuminates the dark chart background while keeping all candles, wicks, FVG boxes, and drawings 100% crisp and unblocked on top!
      ictSessionsCanvas.style.cssText =
        'position:absolute;top:0;left:0;pointer-events:none;z-index:1;mix-blend-mode:screen;user-select:none;';
      parent.appendChild(ictSessionsCanvas);
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

  function findChartModelForSessions() {
    // 1. Check direct helpers first
    const direct = getInternalChartModel() || getChartModel();
    if (direct && (typeof direct.mainSeries === 'function' || direct._mainSeries)) {
      return direct;
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
          return obj;
        }
        if (typeof obj.model === 'function') {
          try {
            const m = obj.model();
            if (m && typeof m === 'object') {
              if (isChartModelLike(m)) return m;
              if (typeof m.model === 'function') {
                const mm = m.model();
                if (isChartModelLike(mm)) return mm;
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

  function extractSeriesBarsFromModel() {
    const model = findChartModelForSessions();
    if (!model) return null;

    const mainSeries = findMainSeriesFromModel(model);
    if (!mainSeries) return null;

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

    const timeScale = typeof model.timeScale === 'function' ? model.timeScale() : model._timeScale;

    // Also locate timeScale's internal _points / m_points array (which maps barIndex -> unixSeconds in TradingView)
    let tsPointsArray = null;
    if (timeScale) {
      try {
        for (const tk of Object.getOwnPropertyNames(timeScale)) {
          const tv = timeScale[tk];
          if (tv && typeof tv === 'object') {
            if (typeof tv.indexToTimePoint === 'function') {
              if (!timeScale.__vestTimePointsObj) timeScale.__vestTimePointsObj = tv;
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

      let barIndex = typeof item.index === 'number' ? item.index : i;
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
        }
        // In TradingView PlotList items, value is ALWAYS [timePoint, open, high, low, close, volume]:
        // v[1] = open, v[2] = high, v[3] = low, v[4] = close
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
        typeof timeSec === 'number' &&
        isFinite(timeSec) &&
        timeSec > 1e8 &&
        isFinite(high) &&
        isFinite(low) &&
        high >= low
      ) {
        normalizedBars.push({
          barIndex,
          timeSec,
          open,
          high,
          low,
          close
        });
      }
    }

    return {
      model,
      mainSeries,
      timeScale,
      bars: normalizedBars
    };
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

    // Pre-compute dateKey & minutesOfDay for each bar aligned with the chart's displayed clock
    const annotated = new Array(bars.length);
    const uniqueDateKeys = [];
    let lastSeenDate = null;
    const tzMode = (config.timezone && config.timezone !== 'America/New_York') ? config.timezone : 'chart';

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const ny = getNyDateParts(b.timeSec, tzMode);
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
          if (midSweptBarIndex === null && postBar.low <= midPrice && postBar.high >= midPrice) {
            midSweptBarIndex = postBar.barIndex;
            midSweptTimeSec = postBar.timeSec;
          }
          if (highSweptBarIndex !== null && lowSweptBarIndex !== null && midSweptBarIndex !== null) {
            break;
          }
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
        midSweptBarIndex,
        midSweptTimeSec,
        latestBarIndex: latestBar.barIndex,
        latestTimeSec: latestBar.timeSec
      });
    });

    return results;
  }

  let ictPriceScaleBadgeContainer = null;

  function formatSessionShortDate(anchorDateKey) {
    if (!anchorDateKey || typeof anchorDateKey !== 'string') return '';
    const parts = anchorDateKey.split('-');
    if (parts.length !== 3) return anchorDateKey;
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isFinite(m) || !isFinite(d)) return anchorDateKey;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m - 1] || m}/${d}`;
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

  function renderIctPriceScaleBadges(targetChartCanvas, badgeItems, cssHeight) {
    if (!targetChartCanvas || !badgeItems || badgeItems.length === 0) {
      clearIctPriceScaleBadges();
      return;
    }

    const ownerDoc = targetChartCanvas.ownerDocument || document;
    const chartRect = targetChartCanvas.getBoundingClientRect();

    // Locate the right-hand price axis container (usually the next sibling TD in .chart-markup-table or canvas to the right of targetChartCanvas)
    let axisHost = null;
    try {
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

    const mountParent = axisHost || targetChartCanvas.parentElement;
    if (!mountParent) return;

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
      mountParent.appendChild(ictPriceScaleBadgeContainer);
    }

    const isInsideAxis = Boolean(axisHost);
    ictPriceScaleBadgeContainer.style.cssText = isInsideAxis
      ? 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:6;overflow:hidden;user-select:none;'
      : 'position:absolute;top:0;right:0;width:68px;bottom:0;pointer-events:none;z-index:6;overflow:visible;user-select:none;';
    ictPriceScaleBadgeContainer.style.display = 'block';

    let html = '';
    for (let i = 0; i < badgeItems.length; i++) {
      const b = badgeItems[i];
      if (b.y < 8 || b.y > cssHeight - 8) continue;
      const priceText = formatChartPriceValue(b.price, lastTrackedPrice);
      const fg = getContrastTextColorForHex(b.color);
      html += `<div style="position:absolute;left:${isInsideAxis ? '1px' : 'auto'};right:${isInsideAxis ? '2px' : '0px'};top:${Math.round(b.y)}px;transform:translateY(-50%);background:${b.color};color:${fg};font-family:-apple-system,BlinkMacSystemFont,'Trebuchet MS',Roboto,sans-serif;font-size:10.5px;font-weight:700;line-height:15px;height:16px;padding:0 5px;border-radius:2px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:flex-start;letter-spacing:0.1px;">${priceText}</div>`;
    }
    ictPriceScaleBadgeContainer.innerHTML = html;
  }

  function renderIctSessionIndicators() {
    ictSessionsRafId = null;

    const config = currentSettings && currentSettings.sessionIndicators;
    if (!config || !config.enabled || !isIntradayChartResolution()) {
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

    const { mainSeries, timeScale, bars } = extracted;

    const lastBar = bars[bars.length - 1];
    const prevBar = bars.length > 1 ? bars[bars.length - 2] : lastBar;
    const barsSig = `${bars.length}_${bars[0].timeSec}_${prevBar.high}_${prevBar.low}_${lastBar.timeSec}_${lastBar.high}_${lastBar.low}_${lastBar.close}`;
    const configSig = JSON.stringify(config);

    if (
      ictSessionsNeedsFullRecompute ||
      barsSig !== cachedIctBarsSignature ||
      configSig !== cachedIctConfigSignature
    ) {
      cachedIctComputedSessions = computeIctSessionsFromBars(bars, config);
      cachedIctBarsSignature = barsSig;
      cachedIctConfigSignature = configSig;
      ictSessionsNeedsFullRecompute = false;
    }

    const overlay = ensureIctSessionsOverlayCanvas(targetCanvas);
    if (!overlay) return;
    overlay.style.display = 'block';
    overlay.style.zIndex = '1';
    overlay.style.mixBlendMode = 'screen';

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const cssWidth = targetCanvas.clientWidth || Math.round(targetCanvas.getBoundingClientRect().width) || overlay.width;
    const cssHeight = targetCanvas.clientHeight || Math.round(targetCanvas.getBoundingClientRect().height) || overlay.height;
    const dpr = cssWidth > 0 ? overlay.width / cssWidth : (window.devicePixelRatio || 1);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.scale(dpr, dpr);

    if (cachedIctComputedSessions.length === 0) {
      clearIctPriceScaleBadges();
      ctx.restore();
      return;
    }

    let visibleRange = null;
    try {
      if (activeChart && typeof activeChart.getVisibleRange === 'function') {
        visibleRange = activeChart.getVisibleRange();
      }
    } catch (e) {}

    const tsApi = (activeChart && typeof activeChart.getTimeScale === 'function') ? activeChart.getTimeScale() : null;
    let barSpacing = 6;
    try {
      if (timeScale && typeof timeScale.barSpacing === 'function') {
        barSpacing = Number(timeScale.barSpacing()) || 6;
      } else if (tsApi && typeof tsApi.barSpacing === 'function') {
        barSpacing = Number(tsApi.barSpacing()) || 6;
      }
    } catch (e) {}

    const barToX = (barIndex, timeSec) => {
      try {
        if (timeScale && typeof timeScale.indexToCoordinate === 'function' && typeof barIndex === 'number') {
          const x = timeScale.indexToCoordinate(barIndex);
          if (typeof x === 'number' && isFinite(x)) return x;
        }
      } catch (e) {}
      try {
        if (tsApi && typeof tsApi.timeToCoordinate === 'function' && typeof timeSec === 'number') {
          const x = tsApi.timeToCoordinate(timeSec);
          if (typeof x === 'number' && isFinite(x)) return x;
        }
      } catch (e) {}
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

    const halfBarW = Math.max(1, barSpacing * 0.5);
    const boxAlpha = Math.max(0.02, Math.min(0.65, (Number(config.boxOpacity) || 18) / 100));
    const watermarkAlpha = Math.max(0.05, Math.min(1, (Number(config.watermarkOpacity) || 32) / 100));
    const fontFamily = config.fontFamily || '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    const baseFontSize = Math.max(12, Math.min(76, Number(config.fontSize) || 40));
    const fontWeight = config.fontBold ? '700' : '500';
    const showWatermark = config.showWatermark !== false;
    const showBorder = Boolean(config.showBoxBorder || config.showSessionBorder);
    const extendHighLow = (config.extendHighLowLines ?? config.extendHighLow) !== false;
    const showPermDotted = config.showPermanentDottedHighLow !== false;
    const showHighLowLabels = config.showHighLowLabels !== false;
    const showMidPoint = Boolean(config.showMidPoint);
    const extendMidPoint = Boolean(config.extendMidPoint);

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

      let highEndX = boxRight;
      let lowEndX = boxRight;
      let midEndX = boxRight;
      if (!sess.isStillInSession) {
        if (extendHighLow) {
          const hTargetBar = sess.highSweptBarIndex !== null ? sess.highSweptBarIndex : sess.latestBarIndex;
          const hTargetTime = sess.highSweptTimeSec !== null ? sess.highSweptTimeSec : sess.latestTimeSec;
          const hx = barToX(hTargetBar, hTargetTime);
          if (hx !== null) highEndX = Math.max(boxRight, hx);

          const lTargetBar = sess.lowSweptBarIndex !== null ? sess.lowSweptBarIndex : sess.latestBarIndex;
          const lTargetTime = sess.lowSweptTimeSec !== null ? sess.lowSweptTimeSec : sess.latestTimeSec;
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

      const isWithin7Days = sess.endTimeSec >= sevenDaysSecCutoff;
      const maxRightReach = (showPermDotted && isWithin7Days) ? cssWidth : Math.max(boxRight, highEndX, lowEndX, midEndX);
      if (maxRightReach < -50 || boxLeft > cssWidth + 50) continue;

      const colorHex = def.color || '#3b82f6';
      const sessionDisplayName = formatSessionDisplayTitle(def);
      const dateStr = formatSessionShortDate(sess.anchorDate);

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
        const hLineEnd = Math.min(cssWidth + 10, extendHighLow ? highEndX : boxRight);
        if (hLineEnd > hLineStart && highY >= -20 && highY <= cssHeight + 20) {
          ctx.beginPath();
          ctx.moveTo(hLineStart, Math.round(highY) + 0.5);
          ctx.lineTo(hLineEnd, Math.round(highY) + 0.5);
          ctx.stroke();
        }

        const lLineStart = Math.max(-10, boxLeft);
        const lLineEnd = Math.min(cssWidth + 10, extendHighLow ? lowEndX : boxRight);
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

        const drawPermLineWithLabel = (lineY, lineStartX, labelText, isHighLine) => {
          if (lineY < 0 || lineY > cssHeight || cssWidth <= lineStartX) return;
          const yCoord = Math.round(lineY) + 0.5;

          ctx.font = permFontSpec;
          const textW = ctx.measureText(labelText).width;
          const padX = 6;

          // Determine vertical mode for this specific line ('top', 'bottom', or 'inline')
          let vMode = permVertAlign;
          if (vMode === 'outside') {
            vMode = isHighLine ? 'top' : 'bottom';
          }

          // Determine label X anchor and gap bounds [gapStart, gapEnd] when inline
          let textX = cssWidth - 6;
          let textAlign = 'right';
          let gapStart = cssWidth;
          let gapEnd = cssWidth;

          if (permHorzAlign === 'left') {
            textAlign = 'left';
            textX = Math.min(cssWidth - textW - 6, lineStartX + 6);
            gapStart = Math.max(lineStartX, textX - padX);
            gapEnd = Math.min(cssWidth, textX + textW + padX);
          } else if (permHorzAlign === 'center') {
            textAlign = 'center';
            textX = (lineStartX + cssWidth) / 2;
            gapStart = Math.max(lineStartX, textX - textW / 2 - padX);
            gapEnd = Math.min(cssWidth, textX + textW / 2 + padX);
          } else {
            textAlign = 'right';
            textX = cssWidth - 6;
            gapStart = Math.max(lineStartX, cssWidth - 6 - textW - padX);
            gapEnd = cssWidth;
          }

          // Draw line (breaking around the label if vMode === 'inline' so the line never strikes through the text!)
          ctx.beginPath();
          if (vMode === 'inline' && cssWidth - lineStartX > textW + 16) {
            if (gapStart > lineStartX) {
              ctx.moveTo(lineStartX, yCoord);
              ctx.lineTo(gapStart, yCoord);
            }
            if (cssWidth > gapEnd) {
              ctx.moveTo(gapEnd, yCoord);
              ctx.lineTo(cssWidth, yCoord);
            }
          } else {
            ctx.moveTo(lineStartX, yCoord);
            ctx.lineTo(cssWidth, yCoord);
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
        if (highY >= 0 && highY <= cssHeight && cssWidth > hPermStart) {
          const highLabelText = `${dateStr} ${sessionDisplayName} High`;
          drawPermLineWithLabel(highY, hPermStart, highLabelText, true);

          priceScaleBadges.push({
            y: highY,
            price: sess.high,
            color: colorHex,
            label: highLabelText
          });
        }

        const lPermStart = Math.max(0, extendHighLow ? Math.min(lowEndX, cssWidth) : Math.max(0, boxLeft));
        if (lowY >= 0 && lowY <= cssHeight && cssWidth > lPermStart) {
          const lowLabelText = `${dateStr} ${sessionDisplayName} Low`;
          drawPermLineWithLabel(lowY, lPermStart, lowLabelText, false);

          priceScaleBadges.push({
            y: lowY,
            price: sess.low,
            color: colorHex,
            label: lowLabelText
          });
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

    ctx.restore();

    // Render the price tags on the right-hand price scale axis!
    if (showPermDotted && priceScaleBadges.length > 0) {
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

  function setupIctSessionIndicators() {
    scheduleIctSessionsRender(true);
    if (ictSessionsObserverInitialized) return;

    try {
      const model = findChartModelForSessions();
      if (model) {
        const ts = typeof model.timeScale === 'function' ? model.timeScale() : model._timeScale;
        if (ts) {
          const tsEvents = ['barSpacingChanged', 'rightOffsetChanged', 'visibleBarsStrictRangeChanged', 'scrollCoordsChanged'];
          tsEvents.forEach(evName => {
            try {
              if (typeof ts[evName] === 'function') {
                const sub = ts[evName]();
                if (sub && typeof sub.subscribe === 'function') {
                  sub.subscribe(null, () => renderIctSessionIndicators());
                }
              }
            } catch (e) {}
          });
        }
      }
      if (activeChart) {
        if (typeof activeChart.onVisibleRangeChanged === 'function') {
          const sub = activeChart.onVisibleRangeChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => renderIctSessionIndicators());
          }
        }
        if (typeof activeChart.onIntervalChanged === 'function') {
          const sub = activeChart.onIntervalChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => scheduleIctSessionsRender(true));
          }
        }
        if (typeof activeChart.onSymbolChanged === 'function') {
          const sub = activeChart.onSymbolChanged();
          if (sub && typeof sub.subscribe === 'function') {
            sub.subscribe(null, () => scheduleIctSessionsRender(true));
          }
        }
      }
    } catch (e) {}

    const docs = [document];
    document.querySelectorAll('iframe').forEach(ifr => {
      try {
        if (ifr.contentDocument) docs.push(ifr.contentDocument);
      } catch (e) {}
    });

    docs.forEach(doc => {
      try {
        doc.addEventListener('mousemove', (e) => {
          if (e.buttons > 0) renderIctSessionIndicators();
        }, { passive: true });
        doc.addEventListener('wheel', () => renderIctSessionIndicators(), { passive: true });
        doc.addEventListener('touchmove', () => renderIctSessionIndicators(), { passive: true });
      } catch (e) {}
    });

    window.addEventListener('resize', () => scheduleIctSessionsRender(false), { passive: true });
    ictSessionsObserverInitialized = true;
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

  // Initialize context menu listener immediately
  setupContextMenuHandler();
  setupActionLogging();

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

  // Keep a lightweight maintenance interval only to hook the chart if it hasn't loaded yet
  setInterval(() => {
    setupContextMenuHandler();
    if (!activeChart) {
      hookChart();
    }
    if (currentSettings && currentSettings.sessionIndicators && currentSettings.sessionIndicators.enabled) {
      setupIctSessionIndicators();
    }
  }, 1500);

  // Announce ready to isolated world
  postToIsolated({ type: 'VEST_TV_MAIN_READY' });
})();

