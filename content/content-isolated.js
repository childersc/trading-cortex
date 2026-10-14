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

  const DEFAULT_TEMPLATES = [
    {
      id: 'bullish_ob',
      name: 'Bullish OB (Demand)',
      color: '#22c55e',
      backgroundColor: '#22c55e',
      opacity: 20,
      linewidth: 1,
      linestyle: 0,
      extendRight: true,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#22c55e',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Demand / +OB',
      textColor: '#22c55e',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'bearish_ob',
      name: 'Bearish OB (Supply)',
      color: '#ef4444',
      backgroundColor: '#ef4444',
      opacity: 20,
      linewidth: 1,
      linestyle: 0,
      extendRight: true,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#ef4444',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Supply / -OB',
      textColor: '#ef4444',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'fvg_imbalance',
      name: 'Fair Value Gap (FVG)',
      color: '#eab308',
      backgroundColor: '#eab308',
      opacity: 15,
      linewidth: 1,
      linestyle: 2,
      extendRight: false,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#eab308',
      middleLineWidth: 1,
      middleLineStyle: 1,
      showLabel: false,
      text: 'FVG',
      textColor: '#eab308',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'range_consolidation',
      name: 'Range / Consolidation',
      color: '#3b82f6',
      backgroundColor: '#3b82f6',
      opacity: 12,
      linewidth: 2,
      linestyle: 0,
      extendRight: false,
      extendLeft: false,
      showMiddleLine: true,
      middleLineColor: '#60a5fa',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Range EQ',
      textColor: '#3b82f6',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    },
    {
      id: 'liquidity_sweep',
      name: 'Liquidity Zone',
      color: '#a855f7',
      backgroundColor: '#a855f7',
      opacity: 25,
      linewidth: 1,
      linestyle: 1,
      extendRight: true,
      extendLeft: false,
      showMiddleLine: false,
      middleLineColor: '#a855f7',
      middleLineWidth: 1,
      middleLineStyle: 2,
      showLabel: false,
      text: 'Liquidity',
      textColor: '#a855f7',
      fontSize: 12,
      horzLabelsAlign: 'right',
      vertLabelsAlign: 'middle'
    }
  ];

  let templates = [...DEFAULT_TEMPLATES];
  let settings = {
    activeTemplateId: 'bullish_ob',
    defaultTemplateId: 'bullish_ob',
    showFloatingBar: false,
    floatingBarPosition: { top: 80, left: 16 },
    autoApplyToNew: true,
    hotkeysEnabled: true,
    rememberSidebarTools: true,
    rememberLastChartSettings: true,
    lastChartSettings: {},
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

  function getSafeExtVersion() {
    try {
      if (isExtensionValid() && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest().version || '1.1.0';
      }
    } catch (e) {}
    return '1.1.0';
  }

  const DOMAIN_VAULT_KEY = '__trading_cortex_vault_db_v1__';
  const CURRENT_DB_SCHEMA_VERSION = 1;

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
        templates: Array.isArray(nextTemplates) && nextTemplates.length > 0 ? nextTemplates : (prev.templates || templates),
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
        if (localData && (localData.templates || localData.settings)) {
          result = localData;
        } else if (chrome.storage.sync) {
          const syncData = await chrome.storage.sync.get(keys).catch(() => ({}));
          if (syncData && (syncData.templates || syncData.settings)) {
            await chrome.storage.local.set(syncData).catch(() => {});
            result = syncData;
          }
        }
      } catch (e) {}
    }

    // Check Domain Vault (__trading_cortex_vault_db_v1__) so custom templates and settings survive even if the extension was unloaded/removed and reloaded!
    const vault = readDomainVault();
    if (vault) {
      // If extension storage was reset to defaults after an unload/reinstall, or if the domain vault has newer saved templates, recover from the domain vault!
      const isDefaultOnly =
        !result.templates ||
        (Array.isArray(result.templates) &&
          result.templates.length === DEFAULT_TEMPLATES.length &&
          !result.settings?._savedAt);

      if (
        Array.isArray(vault.templates) &&
        vault.templates.length > 0 &&
        (isDefaultOnly || (vault.updatedAt && (!result.settings?._savedAt || vault.updatedAt >= result.settings._savedAt)))
      ) {
        result.templates = vault.templates;
        if (isExtensionValid()) {
          chrome.storage.local.set({ templates: vault.templates }).catch(() => {});
        }
      }

      if (vault.settings && typeof vault.settings === 'object') {
        if (!result.settings || (vault.updatedAt && (!result.settings._savedAt || vault.updatedAt >= result.settings._savedAt))) {
          result.settings = { ...(result.settings || {}), ...vault.settings };
          if (isExtensionValid()) {
            chrome.storage.local.set({ settings: result.settings }).catch(() => {});
          }
        }
      }
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

  function safeStorageSet(data) {
    // Always mirror both templates and settings synchronously to the Domain Vault and window.localStorage
    // so they are never lost even if the extension is unloaded/removed and re-loaded
    try {
      if (data && data.settings) {
        data.settings._savedAt = Date.now();
        window.localStorage.setItem('__trading_cortex_isolated_settings__', JSON.stringify(data.settings));
      }
      writeDomainVault(
        data && data.templates ? data.templates : templates,
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

  let settingsLoaded = false;

  function notifyMainWorldConfig() {
    if (!settingsLoaded) return;
    postToMainWorlds({
      type: 'VEST_TV_CONFIG_UPDATE',
      payload: {
        templates,
        settings
      }
    });
  }

  // Listen for storage changes from popup
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!isExtensionValid()) return;
        if (area !== 'local' && area !== 'sync') return;

        if (changes.templates && Array.isArray(changes.templates.newValue) && changes.templates.newValue.length > 0) {
          templates = changes.templates.newValue;
        }
        if (changes.settings && changes.settings.newValue) {
          settings = { ...settings, ...changes.settings.newValue };
        }
        if (changes.updaterState && changes.updaterState.newValue && isTopWindow) {
          const newState = changes.updaterState.newValue;
          const wasAvailable = isUpdateAvailable;
          isUpdateAvailable = Boolean(newState.updateAvailable);
          latestAvailableVersion = newState.latestVersion || null;
          if (wasAvailable !== isUpdateAvailable) {
            renderStudioHeaderPill();
          }
        }

        notifyMainWorldConfig();
      });
    }
  } catch (e) {}

  // Listen for messages from MAIN world
  window.addEventListener('message', async (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    const { type, templateId, template, updates } = event.data;

    if (type === 'VEST_TV_MAIN_READY') {
      if (settingsLoaded) {
        notifyMainWorldConfig();
      }
    } else if (type === 'VEST_TV_ACTIVE_TEMPLATE_CHANGED') {
      settings.activeTemplateId = templateId;
      safeStorageSet({ settings });
      if (isTopWindow) renderFloatingBar();
    } else if (type === 'VEST_TV_TEMPLATE_CREATED_FROM_SHAPE') {
      if (template) {
        templates.push(template);
        settings.activeTemplateId = template.id;
        safeStorageSet({ templates, settings });
        notifyMainWorldConfig();
        showToast(`Template "${template.name}" created!`);
        if (isTopWindow) renderFloatingBar();
      }
    } else if (type === 'VEST_TV_ACTIVE_TEMPLATE_UPDATED_FROM_SHAPE') {
      // User clicked "Sync to Active" or updated active template from a selected box
      const activeIdx = templates.findIndex(t => t.id === settings.activeTemplateId);
      if (activeIdx !== -1 && updates) {
        templates[activeIdx] = {
          ...templates[activeIdx],
          ...updates
        };
        safeStorageSet({ templates });
        notifyMainWorldConfig();
        showToast(`Saved current box settings to "${templates[activeIdx].name}"!`);
        if (isTopWindow) renderFloatingBar();
      }
    } else if (type === 'VEST_TV_TEMPLATE_OVERRIDDEN') {
      // Override a specific template by ID with properties from current box
      const targetIdx = templates.findIndex(t => t.id === templateId);
      if (targetIdx !== -1 && updates) {
        templates[targetIdx] = {
          ...templates[targetIdx],
          ...updates
        };
        settings.activeTemplateId = templates[targetIdx].id;
        safeStorageSet({ templates, settings });
        notifyMainWorldConfig();
        showToast(`Template "${templates[targetIdx].name}" updated from box!`);
        if (isTopWindow) renderFloatingBar();
      }
    } else if (type === 'VEST_TV_EDIT_TEMPLATE_REQUEST') {
      if (isTopWindow && templateId) {
        openTemplateEditorModal(templateId);
      }
    } else if (type === 'VEST_TV_SHAPE_PROPERTIES_FOR_EDITOR') {
      if (isTopWindow && event.data.properties) {
        populateEditorModalFromProperties(event.data.properties);
      }
    } else if (type === 'VEST_TV_DELETE_TEMPLATE_REQUEST') {
      // Delete a template
      if (templates.length <= 1) {
        showToast('Must keep at least 1 template');
        return;
      }
      const tplToDelete = templates.find(t => t.id === templateId);
      const name = tplToDelete ? tplToDelete.name : (event.data.templateName || 'Template');
      templates = templates.filter(t => t.id !== templateId);
      if (settings.activeTemplateId === templateId) {
        settings.activeTemplateId = templates[0].id;
      }
      if (settings.defaultTemplateId === templateId) {
        settings.defaultTemplateId = templates[0].id;
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
        settings.lastChartSettings = {
          ...prev,
          ...incoming,
          localStorageEntries: {
            ...(prev.localStorageEntries || {}),
            ...(incoming.localStorageEntries || {})
          },
          viewportsBySymbol: {
            ...(prev.viewportsBySymbol || {}),
            ...(incoming.viewportsBySymbol || {})
          }
        };
        queueSettingsSave({ lastChartSettings: settings.lastChartSettings });
      }
    } else if (type === 'VEST_TV_SHOW_TOAST') {
      if (event.data.message) {
        showToast(event.data.message);
      }
    } else if (type === 'VEST_TICKER_UPDATE') {
      if (event.data.instrument) currentInstrument = event.data.instrument;
      if (event.data.price) currentPrice = event.data.price;
      updateHeaderTickerDisplay();
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
        return (
          (text.includes('Active Positions') || text.includes('Open Orders') || text.includes('Positions History')) &&
          text.includes('PnL')
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
              targetEl.classList.contains('vest-panel-header-bar') ||
              targetEl.classList.contains('vest-minimized-chip') ||
              targetEl.closest('#vest-minimized-dock') ||
              targetEl.closest('#vest-studio-header-pill') ||
              targetEl.closest('#vest-panel-toggle-pill') ||
              targetEl.closest('#vest-template-bar-root') ||
              targetEl.closest('#vest-action-log-box') ||
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

    // Fast path: if the pill is already docked inside a connected header row, do NOT scan the DOM or touch any styles!
    if (
      pill.isConnected &&
      pill.parentElement &&
      pill.parentElement !== document.body &&
      !pill.classList.contains('vest-studio-pill-floating-fallback')
    ) {
      return true;
    }

    if (cachedMarketRowEl && cachedMarketRowEl.isConnected && cachedMarketPillEl && cachedMarketPillEl.isConnected && cachedMarketPillEl.parentElement === cachedMarketRowEl) {
      pill.classList.remove('vest-studio-pill-floating-fallback');
      cachedMarketRowEl.insertBefore(pill, cachedMarketPillEl);
      return true;
    }

    const found = findMarketSelectorElement();
    if (found && found.rowEl && found.marketPillEl) {
      cachedMarketRowEl = found.rowEl;
      cachedMarketPillEl = found.marketPillEl;
      const rowStyle = window.getComputedStyle(found.rowEl);
      if (rowStyle.display === 'grid' || rowStyle.display === 'inline-grid') {
        found.rowEl.style.display = 'flex';
        found.rowEl.style.alignItems = 'center';
      }
      if (pill.parentElement !== found.rowEl || pill.nextElementSibling !== found.marketPillEl) {
        pill.classList.remove('vest-studio-pill-floating-fallback');
        found.rowEl.insertBefore(pill, found.marketPillEl);
      }
      return true;
    }

    // Fallback position at the exact top-left market bar coordinates until the market bar finishes mounting
    if (!pill.isConnected) {
      pill.classList.add('vest-studio-pill-floating-fallback');
      document.body.appendChild(pill);
    }
    return false;
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
    menuEl.style.top = `${Math.round(rect.bottom + 6)}px`;
    menuEl.style.left = `${Math.max(8, Math.round(rect.left))}px`;
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
      <div class="vest-sdm-section">
        ${updateItemHtml}
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

    let activeTab = (initialTab === 'memory' || initialTab === 'about') ? initialTab : 'about';

    // Working draft so "Cancel" discards or "Save Settings" commits
    const draftSettings = JSON.parse(JSON.stringify(settings || {}));
    if (typeof draftSettings.rememberSidebarTools !== 'boolean') {
      draftSettings.rememberSidebarTools = true;
    }
    if (typeof draftSettings.rememberLastChartSettings !== 'boolean') {
      draftSettings.rememberLastChartSettings = true;
    }
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
        id: 'memory',
        label: 'Chart Memory Features',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`
      }
    ];

    function renderRightPaneContent() {
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
              Provides persistent left-sidebar drawing tool memory, one-click ICT/SMC rectangle templates, extended box far-right canvas text alignment, dockable workspace controls, and real-time market telemetry.
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
          </div>
        `;
      }

      if (activeTab === 'memory') {
        const isRememberOn = draftSettings.rememberSidebarTools !== false;
        const isRememberChartSettingsOn = draftSettings.rememberLastChartSettings !== false;

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
      window.removeEventListener('mousemove', onModalMouseMove, true);
      window.removeEventListener('mouseup', onModalMouseUp, true);
      overlay.remove();
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
      overlay.innerHTML = `
        <div class="vest-tvs-card" role="dialog" aria-label="Trading Cortex Settings" style="transform: translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0);">
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
      showToast('Settings saved');
      closeSettingsOverlay();
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
  function normalizeHexColor(c, fallback = '#22c55e') {
    if (!c || typeof c !== 'string') return fallback;
    const trimmed = c.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return '#' + trimmed.slice(1).split('').map(ch => ch + ch).join('');
    }
    return fallback;
  }

  function closeTemplateEditorModal() {
    if (editorModalEl) {
      editorModalEl.remove();
      editorModalEl = null;
    }
    currentEditingTemplateId = null;
  }

  function openTemplateEditorModal(templateId) {
    if (!isTopWindow) return;
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) {
      showToast('Template not found');
      return;
    }

    closeTemplateEditorModal();
    currentEditingTemplateId = tpl.id;

    const borderHex = normalizeHexColor(tpl.color, '#22c55e');
    const bgHex = normalizeHexColor(tpl.backgroundColor || tpl.color, borderHex);
    const midHex = normalizeHexColor(tpl.middleLineColor || tpl.color, borderHex);
    const txtHex = normalizeHexColor(tpl.textColor || tpl.color, borderHex);
    const opacityVal = typeof tpl.opacity === 'number' ? tpl.opacity : 20;
    const lineW = Number(tpl.linewidth) || 1;
    const lineS = Number(tpl.linestyle) || 0;
    const midW = Number(tpl.middleLineWidth) || 1;
    const midS = tpl.middleLineStyle !== undefined ? Number(tpl.middleLineStyle) : 2;
    const fontSz = Number(tpl.fontSize) || 12;
    const horzAlign = tpl.horzLabelsAlign || 'right';
    const vertAlign = tpl.vertLabelsAlign || 'middle';

    const overlay = document.createElement('div');
    overlay.id = 'vest-template-editor-modal';
    overlay.className = 'vest-modal-overlay';

    overlay.innerHTML = `
      <div class="vest-modal-card" role="dialog" aria-label="Edit Box Template">
        <div class="vest-modal-header">
          <div class="vest-modal-title">
            <span class="vest-modal-swatch" id="vest-ed-header-swatch" style="background:${borderHex};"></span>
            <span>Edit Template: ${escapeHtml(tpl.name)}</span>
          </div>
          <button type="button" class="vest-modal-close" id="vest-ed-close-btn" title="Close">×</button>
        </div>

        <div class="vest-modal-body">
          <div class="vest-ed-row">
            <label class="vest-ed-label">Template Name</label>
            <input type="text" class="vest-ed-input" id="vest-ed-name" value="${escapeHtml(tpl.name)}" placeholder="e.g. Bullish OB (Demand)" />
          </div>

          <div class="vest-ed-grid-3">
            <div class="vest-ed-field">
              <label class="vest-ed-label">Border Color</label>
              <input type="color" class="vest-ed-color" id="vest-ed-color" value="${borderHex}" />
            </div>
            <div class="vest-ed-field">
              <label class="vest-ed-label">Fill Color</label>
              <input type="color" class="vest-ed-color" id="vest-ed-bg-color" value="${bgHex}" />
            </div>
            <div class="vest-ed-field">
              <label class="vest-ed-label">Fill Opacity: <span id="vest-ed-opacity-val">${opacityVal}%</span></label>
              <input type="range" class="vest-ed-range" id="vest-ed-opacity" min="0" max="100" value="${opacityVal}" />
            </div>
          </div>

          <div class="vest-ed-grid-2">
            <div class="vest-ed-field">
              <label class="vest-ed-label">Border Width</label>
              <select class="vest-ed-select" id="vest-ed-linewidth">
                <option value="1" ${lineW === 1 ? 'selected' : ''}>1 px</option>
                <option value="2" ${lineW === 2 ? 'selected' : ''}>2 px</option>
                <option value="3" ${lineW === 3 ? 'selected' : ''}>3 px</option>
                <option value="4" ${lineW === 4 ? 'selected' : ''}>4 px</option>
              </select>
            </div>
            <div class="vest-ed-field">
              <label class="vest-ed-label">Border Style</label>
              <select class="vest-ed-select" id="vest-ed-linestyle">
                <option value="0" ${lineS === 0 ? 'selected' : ''}>Solid (───)</option>
                <option value="1" ${lineS === 1 ? 'selected' : ''}>Dotted (···)</option>
                <option value="2" ${lineS === 2 ? 'selected' : ''}>Dashed (- - -)</option>
              </select>
            </div>
          </div>

          <div class="vest-ed-section">
            <div class="vest-ed-section-header">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ed-show-mid" ${tpl.showMiddleLine ? 'checked' : ''} />
                <span>50% Equilibrium / Center Line</span>
              </label>
            </div>
            <div class="vest-ed-grid-3" id="vest-ed-mid-controls" style="${tpl.showMiddleLine ? '' : 'opacity:0.45; pointer-events:none;'}">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Center Color</label>
                <input type="color" class="vest-ed-color" id="vest-ed-mid-color" value="${midHex}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Width</label>
                <select class="vest-ed-select" id="vest-ed-mid-width">
                  <option value="1" ${midW === 1 ? 'selected' : ''}>1 px</option>
                  <option value="2" ${midW === 2 ? 'selected' : ''}>2 px</option>
                  <option value="3" ${midW === 3 ? 'selected' : ''}>3 px</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Style</label>
                <select class="vest-ed-select" id="vest-ed-mid-style">
                  <option value="0" ${midS === 0 ? 'selected' : ''}>Solid</option>
                  <option value="1" ${midS === 1 ? 'selected' : ''}>Dotted</option>
                  <option value="2" ${midS === 2 ? 'selected' : ''}>Dashed</option>
                </select>
              </div>
            </div>
          </div>

          <div class="vest-ed-grid-2">
            <label class="vest-ed-checkbox-label">
              <input type="checkbox" id="vest-ed-extend-left" ${tpl.extendLeft ? 'checked' : ''} />
              <span>⬅ Extend Left</span>
            </label>
            <label class="vest-ed-checkbox-label">
              <input type="checkbox" id="vest-ed-extend-right" ${tpl.extendRight ? 'checked' : ''} />
              <span>➜ Extend Right</span>
            </label>
          </div>

          <div class="vest-ed-section">
            <div class="vest-ed-section-header">
              <label class="vest-ed-checkbox-label">
                <input type="checkbox" id="vest-ed-show-label" ${tpl.showLabel ? 'checked' : ''} />
                <span>Show Text Label Inside Box</span>
              </label>
            </div>
            <div class="vest-ed-row" style="margin-top:6px;">
              <input type="text" class="vest-ed-input" id="vest-ed-text" value="${escapeHtml(tpl.text || '')}" placeholder="Label text (e.g. Demand / +OB)" />
            </div>
            <div class="vest-ed-grid-4" style="margin-top:6px;">
              <div class="vest-ed-field">
                <label class="vest-ed-label">Text Color</label>
                <input type="color" class="vest-ed-color" id="vest-ed-text-color" value="${txtHex}" />
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Font Size</label>
                <select class="vest-ed-select" id="vest-ed-fontsize">
                  ${[10, 11, 12, 14, 16, 18, 20, 24].map(sz => `<option value="${sz}" ${fontSz === sz ? 'selected' : ''}>${sz}px</option>`).join('')}
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Horiz Align</label>
                <select class="vest-ed-select" id="vest-ed-horz-align">
                  <option value="right" ${horzAlign === 'right' ? 'selected' : ''}>Far Right</option>
                  <option value="center" ${horzAlign === 'center' ? 'selected' : ''}>Center</option>
                  <option value="left" ${horzAlign === 'left' ? 'selected' : ''}>Left</option>
                </select>
              </div>
              <div class="vest-ed-field">
                <label class="vest-ed-label">Vert Align</label>
                <select class="vest-ed-select" id="vest-ed-vert-align">
                  <option value="top" ${vertAlign === 'top' ? 'selected' : ''}>Top</option>
                  <option value="middle" ${vertAlign === 'middle' ? 'selected' : ''}>Middle</option>
                  <option value="bottom" ${vertAlign === 'bottom' ? 'selected' : ''}>Bottom</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="vest-modal-footer">
          <button type="button" class="vest-ed-btn vest-ed-btn-secondary" id="vest-ed-copy-box-btn" title="Copy colors, lines, and text from the currently selected rectangle on the chart">
            Copy from Selected Box
          </button>
          <div style="display:flex; gap:6px;">
            <button type="button" class="vest-ed-btn vest-ed-btn-ghost" id="vest-ed-cancel-btn">Cancel</button>
            <button type="button" class="vest-ed-btn vest-ed-btn-primary" id="vest-ed-save-btn">Save & Apply</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    editorModalEl = overlay;

    // Wire up modal events
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeTemplateEditorModal();
    });

    const closeBtn = overlay.querySelector('#vest-ed-close-btn');
    const cancelBtn = overlay.querySelector('#vest-ed-cancel-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeTemplateEditorModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeTemplateEditorModal);

    const opacityInput = overlay.querySelector('#vest-ed-opacity');
    const opacityValEl = overlay.querySelector('#vest-ed-opacity-val');
    if (opacityInput && opacityValEl) {
      opacityInput.addEventListener('input', () => {
        opacityValEl.textContent = `${opacityInput.value}%`;
      });
    }

    const colorInput = overlay.querySelector('#vest-ed-color');
    const headerSwatch = overlay.querySelector('#vest-ed-header-swatch');
    if (colorInput && headerSwatch) {
      colorInput.addEventListener('input', () => {
        headerSwatch.style.background = colorInput.value;
      });
    }

    const showMidCheck = overlay.querySelector('#vest-ed-show-mid');
    const midControls = overlay.querySelector('#vest-ed-mid-controls');
    if (showMidCheck && midControls) {
      showMidCheck.addEventListener('change', () => {
        midControls.style.opacity = showMidCheck.checked ? '1' : '0.45';
        midControls.style.pointerEvents = showMidCheck.checked ? 'auto' : 'none';
      });
    }

    const copyBoxBtn = overlay.querySelector('#vest-ed-copy-box-btn');
    if (copyBoxBtn) {
      copyBoxBtn.addEventListener('click', () => {
        postToMainWorlds({
          type: 'VEST_TV_REQUEST_SHAPE_PROPERTIES_FOR_EDITOR'
        });
      });
    }

    const saveBtn = overlay.querySelector('#vest-ed-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const idx = templates.findIndex(t => t.id === currentEditingTemplateId);
        if (idx === -1) return;

        const updatedName = (overlay.querySelector('#vest-ed-name')?.value || '').trim() || templates[idx].name;
        const updatedColor = overlay.querySelector('#vest-ed-color')?.value || '#22c55e';
        const updatedBg = overlay.querySelector('#vest-ed-bg-color')?.value || updatedColor;
        const updatedOpacity = Number(overlay.querySelector('#vest-ed-opacity')?.value ?? 20);
        const updatedLineW = Number(overlay.querySelector('#vest-ed-linewidth')?.value || 1);
        const updatedLineS = Number(overlay.querySelector('#vest-ed-linestyle')?.value || 0);
        const updatedShowMid = Boolean(overlay.querySelector('#vest-ed-show-mid')?.checked);
        const updatedMidColor = overlay.querySelector('#vest-ed-mid-color')?.value || updatedColor;
        const updatedMidW = Number(overlay.querySelector('#vest-ed-mid-width')?.value || 1);
        const updatedMidS = Number(overlay.querySelector('#vest-ed-mid-style')?.value ?? 2);
        const updatedExtL = Boolean(overlay.querySelector('#vest-ed-extend-left')?.checked);
        const updatedExtR = Boolean(overlay.querySelector('#vest-ed-extend-right')?.checked);
        const updatedShowLabel = Boolean(overlay.querySelector('#vest-ed-show-label')?.checked);
        const updatedText = overlay.querySelector('#vest-ed-text')?.value || '';
        const updatedTextColor = overlay.querySelector('#vest-ed-text-color')?.value || updatedColor;
        const updatedFontSize = Number(overlay.querySelector('#vest-ed-fontsize')?.value || 12);
        const updatedHorzAlign = overlay.querySelector('#vest-ed-horz-align')?.value || 'right';
        const updatedVertAlign = overlay.querySelector('#vest-ed-vert-align')?.value || 'middle';

        templates[idx] = {
          ...templates[idx],
          name: updatedName,
          color: updatedColor,
          backgroundColor: updatedBg,
          opacity: updatedOpacity,
          linewidth: updatedLineW,
          linestyle: updatedLineS,
          showMiddleLine: updatedShowMid,
          middleLineColor: updatedMidColor,
          middleLineWidth: updatedMidW,
          middleLineStyle: updatedMidS,
          extendLeft: updatedExtL,
          extendRight: updatedExtR,
          showLabel: updatedShowLabel,
          text: updatedText,
          textColor: updatedTextColor,
          fontSize: updatedFontSize,
          horzLabelsAlign: updatedHorzAlign,
          vertLabelsAlign: updatedVertAlign
        };

        const editedId = templates[idx].id;
        settings.activeTemplateId = editedId;

        safeStorageSet({ templates, settings });
        notifyMainWorldConfig();

        postToMainWorlds({
          type: 'VEST_TV_APPLY_TEMPLATE',
          payload: { templateId: editedId, activateTool: false }
        });

        closeTemplateEditorModal();
        renderFloatingBar();
        showToast(`Saved & applied "${updatedName}"`);
      });
    }
  }

  function populateEditorModalFromProperties(p) {
    if (!editorModalEl || !p) return;
    const setVal = (sel, val) => {
      const el = editorModalEl.querySelector(sel);
      if (el && val !== undefined) el.value = val;
    };
    const setCheck = (sel, val) => {
      const el = editorModalEl.querySelector(sel);
      if (el && val !== undefined) el.checked = Boolean(val);
    };

    setVal('#vest-ed-color', normalizeHexColor(p.color, '#22c55e'));
    setVal('#vest-ed-bg-color', normalizeHexColor(p.backgroundColor || p.color, '#22c55e'));
    setVal('#vest-ed-opacity', p.opacity ?? 20);
    const opVal = editorModalEl.querySelector('#vest-ed-opacity-val');
    if (opVal) opVal.textContent = `${p.opacity ?? 20}%`;

    setVal('#vest-ed-linewidth', String(p.linewidth || 1));
    setVal('#vest-ed-linestyle', String(p.linestyle ?? 0));
    setCheck('#vest-ed-show-mid', p.showMiddleLine);
    const midControls = editorModalEl.querySelector('#vest-ed-mid-controls');
    if (midControls) {
      midControls.style.opacity = p.showMiddleLine ? '1' : '0.45';
      midControls.style.pointerEvents = p.showMiddleLine ? 'auto' : 'none';
    }
    setVal('#vest-ed-mid-color', normalizeHexColor(p.middleLineColor || p.color, '#22c55e'));
    setVal('#vest-ed-mid-width', String(p.middleLineWidth || 1));
    setVal('#vest-ed-mid-style', String(p.middleLineStyle ?? 2));
    setCheck('#vest-ed-extend-left', p.extendLeft);
    setCheck('#vest-ed-extend-right', p.extendRight);
    setCheck('#vest-ed-show-label', p.showLabel);
    setVal('#vest-ed-text', p.text || '');
    setVal('#vest-ed-text-color', normalizeHexColor(p.textColor || p.color, '#22c55e'));
    setVal('#vest-ed-fontsize', String(p.fontSize || 12));
    setVal('#vest-ed-horz-align', p.horzLabelsAlign || 'right');
    setVal('#vest-ed-vert-align', p.vertLabelsAlign || 'middle');

    const headerSwatch = editorModalEl.querySelector('#vest-ed-header-swatch');
    if (headerSwatch) headerSwatch.style.background = normalizeHexColor(p.color, '#22c55e');

    showToast('Copied properties from selected box into editor!');
  }

  // -------------------------------------------------------------
  // Utils
  // -------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(34, 197, 94, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
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
      const data = await safeStorageGet(['templates', 'settings', 'updaterState']);
      if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
        templates = data.templates;
      } else {
        templates = [...DEFAULT_TEMPLATES];
        safeStorageSet({ templates });
      }
      if (data.settings) {
        settings = { ...settings, ...data.settings };
      }
      if (data.updaterState) {
        isUpdateAvailable = Boolean(data.updaterState.updateAvailable);
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
