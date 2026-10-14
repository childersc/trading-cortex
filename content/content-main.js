/**
 * Vest Markets Chart Templates - Main World Content Script
 * Runs in MAIN world (page context and chart iframes)
 * Interacts directly with TradingView Charting Library API
 */

(function () {
  'use strict';

  if (window.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__) return;
  window.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__ = true;

  const DEFAULT_TEMPLATES = [
    {
      id: 'bullish_ob',
      name: 'Bullish OB',
      color: '#22c55e',
      backgroundColor: '#22c55e',
      opacity: 20,
      linewidth: 1,
      linestyle: 0,
      extendRight: false,
      extendLeft: false,
      showMiddleLine: false,
      middleLineColor: '#22c55e',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Bullish OB',
      textColor: '#22c55e',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'bearish_ob',
      name: 'Bearish OB',
      color: '#ef4444',
      backgroundColor: '#ef4444',
      opacity: 20,
      linewidth: 1,
      linestyle: 0,
      extendRight: false,
      extendLeft: false,
      showMiddleLine: false,
      middleLineColor: '#ef4444',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Bearish OB',
      textColor: '#ef4444',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'fvg',
      name: 'Fair Value Gap',
      color: '#eab308',
      backgroundColor: '#eab308',
      opacity: 18,
      linewidth: 1,
      linestyle: 0,
      extendRight: true,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#eab308',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'FVG',
      textColor: '#eab308',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'liquidity',
      name: 'Liquidity / Range',
      color: '#3b82f6',
      backgroundColor: '#3b82f6',
      opacity: 15,
      linewidth: 1,
      linestyle: 2,
      extendRight: false,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#3b82f6',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Liquidity',
      textColor: '#3b82f6',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'breaker_block',
      name: 'Breaker Block',
      color: '#a855f7',
      backgroundColor: '#a855f7',
      opacity: 20,
      linewidth: 1,
      linestyle: 0,
      extendRight: false,
      extendLeft: false,
      showMiddleLine: false,
      middleLineColor: '#a855f7',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Breaker',
      textColor: '#a855f7',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'consolidation',
      name: 'Consolidation',
      color: '#64748b',
      backgroundColor: '#64748b',
      opacity: 15,
      linewidth: 1,
      linestyle: 0,
      extendRight: false,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#94a3b8',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Range',
      textColor: '#94a3b8',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'volume_imbalance',
      name: 'Volume Imbalance',
      color: '#06b6d4',
      backgroundColor: '#06b6d4',
      opacity: 22,
      linewidth: 1,
      linestyle: 1,
      extendRight: true,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#06b6d4',
      middleLineWidth: 1,
      middleLineStyle: 1,
      showLabel: false,
      text: 'VI',
      textColor: '#06b6d4',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    }
  ];

  // Active state
  let currentTemplates = [...DEFAULT_TEMPLATES];
  let currentSettings = {
    activeTemplateId: 'bullish_ob',
    defaultTemplateId: 'bullish_ob',
    autoApplyToNew: true,
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

  // Immediately hydrate sidebarState and lastChartSettings from localStorage mirror if present in this frame
  try {
    const rawSavedSidebar = window.localStorage.getItem('__trading_cortex_sidebar_state__');
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
    const rawSavedChart = window.localStorage.getItem('__trading_cortex_chart_settings__');
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
            // If TradingView writes a tool/magnet/settings key while user is interacting, record it into toolbarStorage
            if (
              currentSettings.rememberSidebarTools !== false &&
              (/linetool|drawing|toolbar|magnet|combobox|group|active|tool/i.test(key) || /LineTool/i.test(value))
            ) {
              const prev = currentSettings.sidebarState || {};
              const nextToolbarStorage = {
                ...(prev.toolbarStorage || {}),
                [key]: value
              };
              currentSettings.sidebarState = {
                ...prev,
                toolbarStorage: nextToolbarStorage
              };
              origSetItem.call(
                window.localStorage,
                '__trading_cortex_sidebar_state__',
                JSON.stringify(currentSettings.sidebarState)
              );
              postToIsolated({
                type: 'VEST_TV_SIDEBAR_STATE_CHANGED',
                sidebarState: currentSettings.sidebarState
              });
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

  function log(...args) {
    console.log('[VestTemplates:Main]', ...args);
  }

  function postToIsolated(msg) {
    try {
      window.postMessage(msg, '*');
    } catch (e) {}
    try {
      if (window.top && window.top !== window) {
        window.top.postMessage(msg, '*');
      }
    } catch (e) {}
  }

  function getActiveTemplate() {
    if (!currentTemplates.length) return DEFAULT_TEMPLATES[0];
    return (
      currentTemplates.find(t => t.id === currentSettings.activeTemplateId) ||
      currentTemplates.find(t => t.id === currentSettings.defaultTemplateId) ||
      currentTemplates[0]
    );
  }

  /**
   * Convert template object into TradingView LineToolRectangle properties
   */
  function buildRectangleProperties(tpl) {
    if (!tpl) return {};
    const opacityPct = typeof tpl.opacity === 'number' ? tpl.opacity : 20;
    const transparency = Math.max(0, Math.min(100, 100 - opacityPct));
    const showMiddleLine = Boolean(tpl.showMiddleLine);
    const middleLineColor = tpl.middleLineColor || tpl.color || '#22c55e';
    const middleLineWidth = Number(tpl.middleLineWidth) || 1;
    const middleLineStyle = tpl.middleLineStyle !== undefined ? Number(tpl.middleLineStyle) : 2;
    const horzAlign = tpl.horzLabelsAlign || (tpl.extendRight ? 'right' : 'right');
    const vertAlign = tpl.vertLabelsAlign || 'middle';

    const props = {
      color: tpl.color || '#22c55e',
      backgroundColor: tpl.backgroundColor || tpl.color || '#22c55e',
      fillBackground: true,
      transparency: transparency,
      linewidth: Number(tpl.linewidth) || 1,
      linestyle: Number(tpl.linestyle) || 0,
      extendRight: Boolean(tpl.extendRight),
      extendLeft: Boolean(tpl.extendLeft),
      horzLabelsAlign: horzAlign,
      vertLabelsAlign: vertAlign,

      // Center / Middle Line (supports both nested object and flat properties)
      middleLine: {
        showLine: showMiddleLine,
        lineColor: middleLineColor,
        lineWidth: middleLineWidth,
        lineStyle: middleLineStyle
      },
      showMiddleLine: showMiddleLine,
      middleLineColor: middleLineColor,
      middleLineWidth: middleLineWidth,
      middleLineStyle: middleLineStyle
    };

    if (tpl.text !== undefined) {
      props.text = tpl.text || '';
      props.showLabel = Boolean(tpl.showLabel || tpl.text);
      props.textColor = tpl.textColor || tpl.color || '#22c55e';
      props.fontSize = Number(tpl.fontSize) || 12;
      props.bold = Boolean(tpl.bold);
      props.italic = Boolean(tpl.italic);
    }

    return props;
  }

  /**
   * Convert template into TradingView overrides map for new drawings
   */
  function buildRectangleOverrides(tpl) {
    if (!tpl) return {};
    const opacityPct = typeof tpl.opacity === 'number' ? tpl.opacity : 20;
    const transparency = Math.max(0, Math.min(100, 100 - opacityPct));
    const showMiddleLine = Boolean(tpl.showMiddleLine);
    const middleLineColor = tpl.middleLineColor || tpl.color || '#22c55e';
    const middleLineWidth = Number(tpl.middleLineWidth) || 1;
    const middleLineStyle = tpl.middleLineStyle !== undefined ? Number(tpl.middleLineStyle) : 2;
    const horzAlign = tpl.horzLabelsAlign || (tpl.extendRight ? 'right' : 'right');
    const vertAlign = tpl.vertLabelsAlign || 'middle';

    const overrides = {
      'linetoolrectangle.color': tpl.color || '#22c55e',
      'linetoolrectangle.backgroundColor': tpl.backgroundColor || tpl.color || '#22c55e',
      'linetoolrectangle.fillBackground': true,
      'linetoolrectangle.transparency': transparency,
      'linetoolrectangle.linewidth': Number(tpl.linewidth) || 1,
      'linetoolrectangle.linestyle': Number(tpl.linestyle) || 0,
      'linetoolrectangle.extendRight': Boolean(tpl.extendRight),
      'linetoolrectangle.extendLeft': Boolean(tpl.extendLeft),
      'linetoolrectangle.horzLabelsAlign': horzAlign,
      'linetoolrectangle.vertLabelsAlign': vertAlign,

      // Center Line overrides
      'linetoolrectangle.middleLine.showLine': showMiddleLine,
      'linetoolrectangle.middleLine.lineColor': middleLineColor,
      'linetoolrectangle.middleLine.lineWidth': middleLineWidth,
      'linetoolrectangle.middleLine.lineStyle': middleLineStyle
    };

    if (tpl.text) {
      overrides['linetoolrectangle.text'] = tpl.text;
      overrides['linetoolrectangle.showLabel'] = true;
      overrides['linetoolrectangle.textColor'] = tpl.textColor || tpl.color;
      overrides['linetoolrectangle.fontSize'] = Number(tpl.fontSize) || 12;
    } else {
      overrides['linetoolrectangle.showLabel'] = false;
    }

    return overrides;
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
    if (typeof shape.paneViews === 'function' || Array.isArray(shape._paneViews)) return shape;

    const keys = [...Object.keys(shape), ...Object.getOwnPropertyNames(shape), ...Object.getOwnPropertySymbols(shape)];
    for (const k of keys) {
      try {
        const val = shape[k];
        if (val && typeof val === 'object') {
          if (typeof val.paneViews === 'function' || Array.isArray(val._paneViews)) {
            return val;
          }
          if (entityId && typeof val.id === 'function' && val.id() === entityId) {
            return val;
          }
        }
      } catch (e) {}
    }
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

  function applyTemplateOverrides(tpl) {
    if (!tpl) return;
    const overrides = buildRectangleOverrides(tpl);

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

    if (!rectTextPollTimer) {
      rectTextPollTimer = setInterval(() => {
        syncExtendedRectangleTextHooks();
        setupContextMenuHandler();
      }, 400);
    }
    return true;
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

      lastInteractedShapeId = entityId;

      const shape = activeChart.getShapeById(entityId);
      if (!shape) return;

      const allShapes = typeof activeChart.getAllShapes === 'function' ? activeChart.getAllShapes() : [];
      const shapeMeta = allShapes.find(s => s.id === entityId);
      const isRectangle = shapeMeta ? /rect/i.test(shapeMeta.name) : true;

      if (isRectangle) {
        lastRectangleId = entityId;
      }

      log(`Drawing event: ${eventType} on ${entityId} (isRect: ${isRectangle})`);

      if (eventType === 'create' && isRectangle && currentSettings.autoApplyToNew) {
        const tpl = getActiveTemplate();
        if (tpl) {
          applyTemplateToShape(shape, tpl, entityId);
        }
      }

      syncExtendedRectangleTextHooks();

      postToIsolated({
        type: 'VEST_TV_DRAWING_EVENT',
        entityId,
        eventType,
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
          isRectangle: String(isRectangle)
        }
      });

    } catch (err) {
      log('Error in onDrawingEvent:', err);
    }
  }

  function applyTemplateToShape(shape, tpl, entityId) {
    if (!shape || !tpl) return false;
    try {
      const props = buildRectangleProperties(tpl);
      shape.setProperties(props);
      log(`Applied template "${tpl.name}" to shape ${entityId || ''}:`, props);

      syncToVestLocalStorage(entityId, props);
      syncExtendedRectangleTextHooks();
      return true;
    } catch (e) {
      log('Error calling shape.setProperties:', e);
      return false;
    }
  }

  function applyTemplateToSelectedOrLast(tpl) {
    if (!tpl) return false;

    applyTemplateOverrides(tpl);

    if (!activeChart) {
      if (activeChartApi && typeof activeChartApi.activeChart === 'function') {
        activeChart = activeChartApi.activeChart();
      }
    }
    if (!activeChart) return false;

    let targetShape = null;
    let targetId = null;

    try {
      if (typeof activeChart.selection === 'function') {
        const sel = activeChart.selection();
        if (sel && typeof sel.all === 'function') {
          const all = sel.all();
          if (all && all.length > 0) {
            targetId = all[0];
            targetShape = activeChart.getShapeById(targetId);
          }
        }
      }
    } catch (e) {}

    if (!targetShape && lastRectangleId) {
      targetId = lastRectangleId;
      targetShape = activeChart.getShapeById(targetId);
    }
    if (!targetShape && lastInteractedShapeId) {
      targetId = lastInteractedShapeId;
      targetShape = activeChart.getShapeById(targetId);
    }
    if (!targetShape && typeof activeChart.getAllShapes === 'function') {
      const all = activeChart.getAllShapes();
      const rects = all.filter(s => s.name === 'rectangle' || s.name === 'LineToolRectangle');
      if (rects.length > 0) {
        targetId = rects[rects.length - 1].id;
        targetShape = activeChart.getShapeById(targetId);
      }
    }

    if (targetShape) {
      return applyTemplateToShape(targetShape, tpl, targetId);
    }

    return true;
  }

  function syncToVestLocalStorage(entityId, newProps) {
    try {
      if (!activeChart || typeof activeChart.symbol !== 'function') return;
      const symbol = activeChart.symbol();
      if (!symbol) return;

      const key = `tv-chart-drawings-${symbol}`;
      const saved = localStorage.getItem(key);
      if (!saved) return;

      const data = JSON.parse(saved);
      if (!data.sources || !Array.isArray(data.sources)) return;

      let found = false;
      for (let i = 0; i < data.sources.length; i++) {
        const entry = data.sources[i];
        if (Array.isArray(entry) && entry[0] === entityId && entry[1]) {
          const stateObj = entry[1];
          if (stateObj.state) {
            Object.assign(stateObj.state, newProps);
            found = true;
            break;
          }
        }
      }

      if (found) {
        localStorage.setItem(key, JSON.stringify(data));
        log(`Synced updated properties for ${entityId} to localStorage [${key}]`);
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
        min-width: 190px;
        background: #181d28;
        border: 1px solid #2d3748;
        border-radius: 6px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7);
        padding: 4px;
        z-index: 100000;
      `;

      function renderMenu() {
        menu.innerHTML = '';
        currentTemplates.forEach(t => {
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
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.name}</span>
              ${hasMid}${hasExtL}${hasExt}
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <button class="vest-override-btn" title="Override '${t.name}' with current box" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:2px; font-size:11px;">⟳</button>
              <button class="vest-delete-btn" title="Delete '${t.name}'" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:2px; font-size:13px; line-height:1;">×</button>
              ${t.id === currentSettings.activeTemplateId ? '<span style="font-size:10px; color:#10b981;">✓</span>' : ''}
            </div>
          `;

          item.addEventListener('mouseenter', () => {
            item.style.background = 'rgba(255, 255, 255, 0.1)';
          });
          item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
          });

          // Click item to apply template
          item.addEventListener('click', (e) => {
            if (e.target.closest('.vest-override-btn') || e.target.closest('.vest-delete-btn')) return;
            e.stopPropagation();
            menu.style.display = 'none';
            currentSettings.activeTemplateId = t.id;
            applyTemplateToSelectedOrLast(t);

            const dot = dropdownContainer.querySelector('span:first-child');
            if (dot) dot.style.background = t.color;

            window.postMessage({
              type: 'VEST_TV_ACTIVE_TEMPLATE_CHANGED',
              templateId: t.id
            }, '*');
          });

          // Override button
          const overrideBtn = item.querySelector('.vest-override-btn');
          if (overrideBtn) {
            overrideBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              menu.style.display = 'none';
              overrideTemplateById(t.id);
            });
          }

          // Delete button
          const deleteBtn = item.querySelector('.vest-delete-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              menu.style.display = 'none';
              if (confirm(`Delete template "${t.name}"?`)) {
                window.postMessage({
                  type: 'VEST_TV_DELETE_TEMPLATE_REQUEST',
                  templateId: t.id
                }, '*');
              }
            });
          }

          menu.appendChild(item);
        });

        // Bottom actions
        const divider = doc.createElement('div');
        divider.style.cssText = 'height:1px; background:rgba(255,255,255,0.1); margin:4px 0;';
        menu.appendChild(divider);

        // Save Box as New Template
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
          <span>Save Box as New Template...</span>
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
          const name = prompt('Name for this template:', 'Custom Box');
          if (name && name.trim()) {
            saveCurrentSelectionAsTemplate(name.trim());
          }
        });
        menu.appendChild(saveItem);
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
   * Strictly checks if a rectangle drawing is currently selected on the chart.
   */
  function isSelectedShapeRectangle() {
    if (!activeChart) return true; // Allow if chart API ref not bound yet, since menu itself has "Visual order"
    try {
      if (typeof activeChart.selection === 'function') {
        const sel = activeChart.selection();
        if (sel && typeof sel.all === 'function') {
          const all = sel.all();
          if (all && all.length > 0) {
            for (const id of all) {
              try {
                const shape = activeChart.getShapeById(id);
                if (shape && typeof shape.getProperties === 'function') {
                  const p = shape.getProperties();
                  if (p && (p.fillBackground !== undefined || p.backgroundColor !== undefined || p.extendRight !== undefined || p.middleLine !== undefined)) {
                    lastRectangleId = id;
                    lastInteractedShapeId = id;
                    return true;
                  }
                }
              } catch (e) {}
            }
            return false;
          }
        }
      }
    } catch (e) {}
    return true;
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
        min-width: 200px !important;
        max-width: 280px !important;
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
   * Finds the exact "Visual order" row inside an open TradingView drawing context menu.
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

        if (!isSelectedShapeRectangle()) {
          continue;
        }

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

      // 1. "Save as..."
      const saveAsRow = doc.createElement('div');
      saveAsRow.className = 'vest-tv-sub-row';
      saveAsRow.innerHTML = `<span class="vest-tv-sub-label">Save as...</span>`;
      saveAsRow.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closeTradingViewPopupMenu(templateRow);
        const name = prompt('Template name:', 'Custom FVG');
        if (name && name.trim()) {
          saveCurrentSelectionAsTemplate(name.trim());
        }
      });
      submenu.appendChild(saveAsRow);

      // 2. "Apply default"
      const applyDefaultRow = doc.createElement('div');
      applyDefaultRow.className = 'vest-tv-sub-row';
      applyDefaultRow.innerHTML = `<span class="vest-tv-sub-label">Apply default</span>`;
      applyDefaultRow.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const defaultTpl = currentTemplates.find(t => t.id === currentSettings.defaultTemplateId) || currentTemplates[0];
        if (defaultTpl) {
          applyTemplateToSelectedOrLast(defaultTpl);
          currentSettings.activeTemplateId = defaultTpl.id;
          postToIsolated({
            type: 'VEST_TV_ACTIVE_TEMPLATE_CHANGED',
            templateId: defaultTpl.id
          });
          postToIsolated({
            type: 'VEST_TV_SHOW_TOAST',
            message: `Applied default template "${defaultTpl.name}"`
          });
        }
        closeTradingViewPopupMenu(templateRow);
      });
      submenu.appendChild(applyDefaultRow);

      // 3. Divider
      const divider = doc.createElement('div');
      divider.className = 'vest-tv-sub-divider';
      submenu.appendChild(divider);

      // 4. Template items
      currentTemplates.forEach(t => {
        const row = doc.createElement('div');
        row.className = 'vest-tv-sub-row';
        row.innerHTML = `
          <span class="vest-tv-sub-label">${escapeHtml(t.name)}</span>
          <div class="vest-tv-sub-actions">
            <button type="button" class="vest-tv-sub-icon-btn edit-btn" title="Edit '${escapeHtml(t.name)}'">✎</button>
            <button type="button" class="vest-tv-sub-icon-btn delete-btn" title="Remove '${escapeHtml(t.name)}'">×</button>
          </div>
        `;

        // Click row to apply template
        row.addEventListener('click', (e) => {
          if (e.target.closest('.vest-tv-sub-icon-btn')) return;
          e.stopPropagation();
          e.preventDefault();

          applyTemplateToSelectedOrLast(t);
          currentSettings.activeTemplateId = t.id;
          postToIsolated({
            type: 'VEST_TV_ACTIVE_TEMPLATE_CHANGED',
            templateId: t.id
          });
          postToIsolated({
            type: 'VEST_TV_SHOW_TOAST',
            message: `Applied "${t.name}"`
          });
          closeTradingViewPopupMenu(templateRow);
        });

        // Pencil (Edit) button
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            closeTradingViewPopupMenu(templateRow);
            postToIsolated({
              type: 'VEST_TV_EDIT_TEMPLATE_REQUEST',
              templateId: t.id
            });
          });
        }

        // X (Delete) button
        const deleteBtn = row.querySelector('.delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (currentTemplates.length <= 1) {
              postToIsolated({
                type: 'VEST_TV_SHOW_TOAST',
                message: 'Cannot remove the last remaining template'
              });
              return;
            }
            currentTemplates = currentTemplates.filter(item => item.id !== t.id);
            if (currentSettings.activeTemplateId === t.id && currentTemplates.length > 0) {
              currentSettings.activeTemplateId = currentTemplates[0].id;
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

      if (tryInjectTemplatesMenu(doc)) return;

      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (tryInjectTemplatesMenu(doc) || attempts >= 25) {
          clearInterval(checkInterval);
        }
      }, 25);
    };

    doc.addEventListener('contextmenu', handleContextMenuEvent, true);
    doc.addEventListener('mousedown', (e) => {
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
        const prevSidebarJson = JSON.stringify(currentSettings.sidebarState || {});
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
        const firstConfigArrival = !hasReceivedConfigUpdate;
        hasReceivedConfigUpdate = true;

        const activeTpl = getActiveTemplate();
        if (activeTpl) {
          applyTemplateOverrides(activeTpl);
        }
        const isRemembering = currentSettings.rememberSidebarTools !== false;
        const nextSidebarJson = JSON.stringify(currentSettings.sidebarState || {});
        if (
          isRemembering &&
          (firstConfigArrival || !hasCompletedInitialSidebarRestore || !wasRemembering || prevSidebarJson !== nextSidebarJson)
        ) {
          restoreAttempts = 0;
          restoreSidebarSelections();
        }
        const isRememberingChart = currentSettings.rememberLastChartSettings !== false;
        if (isRememberingChart && (firstConfigArrival || !hasCompletedInitialChartSettingsRestore || !wasRememberingChart)) {
          chartSettingsRestoreAttempts = 0;
          restoreLastChartSettings();
        }
        syncExtendedRectangleTextHooks();
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
          applyTemplateToSelectedOrLast(tpl);
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
        saveCurrentSelectionAsTemplate(payload.name);
        break;
      }

      case 'VEST_TV_UPDATE_ACTIVE_FROM_SELECTION': {
        updateActiveTemplateFromSelection();
        break;
      }

      case 'VEST_TV_OVERRIDE_TEMPLATE': {
        overrideTemplateById(payload.templateId);
        break;
      }

      case 'VEST_TV_REQUEST_SHAPE_PROPERTIES_FOR_EDITOR': {
        const targetShape = getTargetShape();
        if (!targetShape) {
          postToIsolated({
            type: 'VEST_TV_SHOW_TOAST',
            message: 'Select a rectangle on the chart first to copy its properties'
          });
          break;
        }
        const extracted = extractPropertiesFromShape(targetShape);
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
   * Reads ALL properties from currently selected box and extracts them cleanly
   */
  function extractPropertiesFromShape(shape) {
    if (!shape || typeof shape.getProperties !== 'function') return null;
    const p = shape.getProperties();

    const transparency = typeof p.transparency === 'number' ? p.transparency : 80;
    const opacity = Math.max(0, Math.min(100, 100 - transparency));

    // Detect center / middle line
    const showMiddleLine = Boolean(
      (p.middleLine && p.middleLine.showLine) ||
      p.showMiddleLine ||
      p['middleLine.showLine']
    );

    const middleLineColor = (p.middleLine && p.middleLine.lineColor) ||
      p.middleLineColor ||
      p['middleLine.lineColor'] ||
      p.color || '#22c55e';

    const middleLineWidth = Number(
      (p.middleLine && p.middleLine.lineWidth) ||
      p.middleLineWidth ||
      p['middleLine.lineWidth'] || 1
    );

    const middleLineStyle = (p.middleLine && p.middleLine.lineStyle !== undefined)
      ? Number(p.middleLine.lineStyle)
      : (p.middleLineStyle !== undefined ? Number(p.middleLineStyle) : 2);

    return {
      color: p.color || '#22c55e',
      backgroundColor: p.backgroundColor || p.color || '#22c55e',
      opacity: opacity,
      linewidth: Number(p.linewidth) || 1,
      linestyle: Number(p.linestyle) || 0,
      extendRight: Boolean(p.extendRight),
      extendLeft: Boolean(p.extendLeft),
      showMiddleLine: showMiddleLine,
      middleLineColor: middleLineColor,
      middleLineWidth: middleLineWidth,
      middleLineStyle: middleLineStyle,
      showLabel: Boolean(p.showLabel || p.text),
      text: p.text || '',
      textColor: p.textColor || p.color || '#22c55e',
      fontSize: Number(p.fontSize) || 12,
      horzLabelsAlign: p.horzLabelsAlign || 'right',
      vertLabelsAlign: p.vertLabelsAlign || 'middle'
    };
  }

  function getTargetShape() {
    if (!activeChart) return null;
    let targetShape = null;

    try {
      if (typeof activeChart.selection === 'function') {
        const sel = activeChart.selection();
        if (sel && typeof sel.all === 'function') {
          const all = sel.all();
          if (all && all.length > 0) {
            targetShape = activeChart.getShapeById(all[0]);
          }
        }
      }
    } catch (e) {}

    if (!targetShape && lastRectangleId) {
      targetShape = activeChart.getShapeById(lastRectangleId);
    }
    if (!targetShape && lastInteractedShapeId) {
      targetShape = activeChart.getShapeById(lastInteractedShapeId);
    }

    return targetShape;
  }

  function saveCurrentSelectionAsTemplate(name) {
    const targetShape = getTargetShape();
    if (!targetShape) return;

    try {
      const extracted = extractPropertiesFromShape(targetShape);
      if (!extracted) return;

      const newTemplate = {
        id: `custom_${Date.now()}`,
        name: name || 'Custom Box',
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

  function updateActiveTemplateFromSelection() {
    const targetShape = getTargetShape();
    if (!targetShape) return;

    try {
      const extracted = extractPropertiesFromShape(targetShape);
      if (!extracted) return;

      postToIsolated({
        type: 'VEST_TV_ACTIVE_TEMPLATE_UPDATED_FROM_SHAPE',
        updates: extracted
      });
    } catch (e) {
      log('Error updating active template from shape:', e);
    }
  }

  function overrideTemplateById(templateId) {
    const targetShape = getTargetShape();
    if (!targetShape) {
      alert('Please select or draw a box on the chart first to copy its settings.');
      return;
    }

    try {
      const extracted = extractPropertiesFromShape(targetShape);
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
    const rowEl = el.closest('[role="menuitem"], [role="option"], [data-role="menuitem"], [class*="item"], [class*="row"]');
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
          // Skip items inside floating dropdown menus so we only read the docked sidebar slots
          if (el.closest('[data-name="menu-inner"], [role="menu"], [class*="menuWrap"], [class*="popup"], [class*="drawer"], #vest-studio-settings-dialog, #vest-studio-dropdown-menu')) {
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
      const opts = { bubbles: true, cancelable: true, view: win, button: 0, buttons: 1 };
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

  // Force-close any open TradingView drawing toolbar flyout menu so it never stays open on refresh
  function closeAnyOpenSidebarFlyoutMenus(ownerDoc) {
    const docs = ownerDoc ? [ownerDoc] : getSidebarDocuments();
    docs.forEach(doc => {
      try {
        // 1. Dispatch Escape keydown to close any active TradingView popup menu cleanly
        doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
        // 2. Also check if any sidebar submenu trigger is still marked open/expanded and click it or click body outside
        const openMenus = doc.querySelectorAll('[data-name="menu-inner"], [class*="menuWrap-"][class*="isOpened"], [role="menu"]');
        if (openMenus.length > 0 && doc.body) {
          const opts = { bubbles: true, cancelable: true, view: doc.defaultView || window, clientX: 400, clientY: 12 };
          if (typeof PointerEvent === 'function') {
            doc.body.dispatchEvent(new PointerEvent('pointerdown', opts));
          }
          doc.body.dispatchEvent(new MouseEvent('mousedown', opts));
        }
      } catch (e) {}
    });
  }

  // Temporarily hide popup menus in `ownerDoc` during programmatic slot restoration so the flyout never flashes on screen
  function setTemporaryFlyoutStealthStyle(ownerDoc, enabled) {
    if (!ownerDoc || !ownerDoc.head) return;
    const styleId = 'vest-cortex-stealth-flyout-style';
    let styleEl = ownerDoc.getElementById(styleId);
    if (enabled) {
      if (!styleEl) {
        styleEl = ownerDoc.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          [data-name="menu-inner"], [role="menu"], [class*="menuWrap-"] {
            opacity: 0 !important;
            pointer-events: none !important;
            transition: none !important;
          }
        `;
        ownerDoc.head.appendChild(styleEl);
      }
    } else if (styleEl) {
      styleEl.remove();
    }
  }

  // Ensure a left-sidebar group slot actually displays `norm` as its selected icon.
  // If `selectLineTool` alone didn't swap the sidebar slot icon (e.g. slot still shows Brush instead of Rectangle),
  // we silently open that slot's flyout submenu, click the target item Row, and immediately close the flyout.
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
    let ownerDoc = document;

    for (const doc of docs) {
      try {
        const candidates = doc.querySelectorAll('[data-name], [aria-label], [data-tooltip], [title]');
        for (const el of candidates) {
          if (el.closest('[data-name="menu-inner"], [role="menu"], [class*="menuWrap"], [class*="popup"], [class*="drawer"], #vest-studio-settings-dialog, #vest-studio-dropdown-menu')) {
            continue;
          }
          const tId =
            normalizeToolId(el.getAttribute('data-name')) ||
            normalizeToolId(el.getAttribute('aria-label')) ||
            normalizeToolId(el.getAttribute('data-tooltip')) ||
            normalizeToolId(el.getAttribute('title'));

          if (tId && siblingSet.has(tId.toLowerCase())) {
            currentSlotBtn = el;
            ownerDoc = doc;
            break;
          }
        }
        if (currentSlotBtn) break;
      } catch (e) {}
    }

    if (!currentSlotBtn) return;

    try {
      // Find the submenu trigger/arrow next to or inside the group button
      const slotContainer =
        currentSlotBtn.closest('[class*="group"], [class*="wrap"], [class*="slot"], [class*="buttonWrap"], [class*="control"]') ||
        currentSlotBtn.parentElement;

      let arrowTrigger = null;
      if (slotContainer) {
        arrowTrigger = slotContainer.querySelector(
          '[data-role="menu-handle"], [class*="arrow"], [class*="caret"], [class*="submenu"], [class*="trigger"], [aria-haspopup="true"]'
        );
        if (!arrowTrigger && currentSlotBtn.nextElementSibling) {
          arrowTrigger = currentSlotBtn.nextElementSibling;
        }
      }
      if (!arrowTrigger) {
        arrowTrigger = currentSlotBtn;
      }

      // Hide the flyout menu visually while we click the target item so the user never sees a pull-out menu flash open
      setTemporaryFlyoutStealthStyle(ownerDoc, true);
      dispatchFullPointerClick(arrowTrigger);

      setTimeout(() => {
        try {
          const targetLabelLower = TOOL_TO_LABEL_MAP[norm] || norm.replace(/^LineTool/i, '').toLowerCase();
          const menuContainers = ownerDoc.querySelectorAll(
            '[data-name="menu-inner"], [role="menu"], [class*="menuWrap"], [class*="popup"], [class*="drawer"]'
          );

          let matchedMenuItem = null;

          // 1. Search by data-name / aria-label / title inside the open menu
          for (const container of menuContainers) {
            const allItems = container.querySelectorAll('[data-name], [role="menuitem"], [role="option"], [data-role="menuitem"], [class*="item-"], [class*="row-"]');
            for (const item of allItems) {
              const dName = item.getAttribute('data-name');
              if (dName && normalizeToolId(dName) === norm) {
                matchedMenuItem = item;
                break;
              }
              const ariaL = item.getAttribute('aria-label') || item.getAttribute('title') || item.getAttribute('data-tooltip');
              if (ariaL && normalizeToolId(ariaL) === norm) {
                matchedMenuItem = item;
                break;
              }
            }
            if (matchedMenuItem) break;
          }

          // 2. Search by exact label text (e.g., "Rectangle", "Horizontal Line", "Long Position", "Callout")
          if (!matchedMenuItem) {
            for (const container of menuContainers) {
              const allNodes = container.querySelectorAll('*');
              for (const node of allNodes) {
                if (node.children.length === 0) {
                  const txt = (node.textContent || '').trim().toLowerCase();
                  if (txt === targetLabelLower || normalizeToolId(txt) === norm) {
                    matchedMenuItem =
                      node.closest('[data-name], [data-role="menuitem"], [role="menuitem"], [role="option"], [class*="item-"], [class*="row-"]') ||
                      node.parentElement ||
                      node;
                    break;
                  }
                }
              }
              if (matchedMenuItem) break;
            }
          }

          if (matchedMenuItem) {
            // Click the inner label/row and also the row container so TradingView's React/ internal handler always receives it and closes the menu
            dispatchFullPointerClick(matchedMenuItem);
            const labelChild = matchedMenuItem.querySelector('[class*="label-"], [class*="title-"]');
            if (labelChild && labelChild !== matchedMenuItem) {
              dispatchFullPointerClick(labelChild);
            }
            log(`Updated sidebar slot [${groupKey}] via submenu click -> ${norm}`);
          }
        } catch (e) {} finally {
          // Always ensure the pull-out submenu is closed afterwards and remove stealth CSS
          setTimeout(() => {
            closeAnyOpenSidebarFlyoutMenus(ownerDoc);
            setTemporaryFlyoutStealthStyle(ownerDoc, false);
          }, 35);
        }
      }, 45);
    } catch (e) {
      setTemporaryFlyoutStealthStyle(ownerDoc, false);
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
        directBtn.click();
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

  function attachSidebarListenersToAllDocs() {
    const docs = getSidebarDocuments();
    docs.forEach(doc => {
      if (!doc || sidebarHookedDocs.has(doc)) return;
      sidebarHookedDocs.add(doc);

      const handleSidebarInteraction = (e) => {
        if (isRestoringSidebar) return;
        if (currentSettings.rememberSidebarTools === false) return;

        // Detect if user clicked a specific drawing tool button or flyout submenu item
        const clickedToolId = extractToolIdFromDomElement(e.target);

        // Capture immediately after TradingView updates its DOM slot & activeLineTool state
        setTimeout(() => {
          saveCurrentSidebarState(clickedToolId);
        }, 120);
        setTimeout(() => {
          saveCurrentSidebarState(clickedToolId);
        }, 400);
      };

      try {
        doc.addEventListener('pointerdown', handleSidebarInteraction, true);
        doc.addEventListener('click', handleSidebarInteraction, true);
      } catch (e) {}
    });
  }

  function setupSidebarObserver() {
    // Always ensure any newly mounted chart iframes have our pointerdown/click listeners attached
    attachSidebarListenersToAllDocs();

    if (sidebarObserver) return;

    // 1. Subscribe to TradingView's native drawing event if available
    try {
      if (activeChartApi && typeof activeChartApi.subscribe === 'function') {
        activeChartApi.subscribe('drawing', () => {
          setTimeout(() => saveCurrentSidebarState(), 120);
        });
      }
    } catch (e) {}

    // 2. Periodically re-check for late-mounted iframes and poll for tool changes
    setInterval(() => {
      attachSidebarListenersToAllDocs();
      if (!isRestoringSidebar && hasCompletedInitialSidebarRestore && currentSettings.rememberSidebarTools !== false) {
        saveCurrentSidebarState();
      }
    }, 1500);

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
    const activeTool = explicitNorm || apiTool || detectedActiveTool || prev.activeTool || 'cursor';

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
    if (activeTool) {
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

    // Wait until BOTH the left sidebar DOM is rendered AND the chart API is ready (up to 10 attempts)
    const magnetBtn = getMagnetButton();
    const { detectedGroups } = scanDomSidebarGroupSlots();
    const hasSidebarDom = Boolean(magnetBtn || Object.keys(detectedGroups).length > 0);
    const hasChartApi = Boolean(
      (activeChartApi && typeof activeChartApi.selectLineTool === 'function') ||
      (activeWidget && typeof activeWidget.selectLineTool === 'function')
    );

    if (!hasSidebarDom && !hasChartApi) {
      if (restoreAttempts < 10) {
        restoreAttempts++;
        setTimeout(restoreSidebarSelections, 700);
      }
      return;
    }

    // Wait until the left-hand drawing toolbar DOM buttons are actually in the document so submenu slots can be updated
    if (!hasSidebarDom && restoreAttempts < 7) {
      restoreAttempts++;
      setTimeout(restoreSidebarSelections, 550);
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

      // 1. Restore each remembered drawing tool group slot on the left-hand sidebar
      const groupTools = targetState.groupTools || {};
      const toolsToRestore = Object.values(groupTools)
        .map(t => normalizeToolId(t))
        .filter(Boolean);

      const finalActiveTool = normalizeToolId(targetState.activeTool) || 'cursor';

      let stepDelay = 0;
      toolsToRestore.forEach((toolId) => {
        if (toolId === finalActiveTool) return; // Will be selected last
        setTimeout(() => {
          selectSingleLineTool(toolId, true);
        }, stepDelay);
        stepDelay += 170;
      });

      // 2. Select the user's last active drawing tool (or cursor) after group slots are populated
      setTimeout(() => {
        if (finalActiveTool) {
          selectSingleLineTool(finalActiveTool, true);
        }

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

        // Ensure all sidebar flyout menus are closed and mark initial restore complete
        setTimeout(() => {
          closeAnyOpenSidebarFlyoutMenus();
          isRestoringSidebar = false;
          hasCompletedInitialSidebarRestore = true;
        }, 250);
      }, stepDelay + 140);
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
        // Value is usually next sibling or inside parent / adjacent container
        const parent = labelEl.parentElement;
        if (parent) {
          const parentText = parent.innerText || parent.textContent || '';
          const match = parentText.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
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

  // Keep a lightweight 1.5s maintenance interval so newly created iframes or rectangles always get hooked
  setInterval(() => {
    setupContextMenuHandler();
    if (!activeChart) {
      hookChart();
    } else {
      syncExtendedRectangleTextHooks();
    }
  }, 1500);

  // Announce ready to isolated world
  postToIsolated({ type: 'VEST_TV_MAIN_READY' });
})();

