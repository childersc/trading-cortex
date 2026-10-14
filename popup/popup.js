/**
 * Vest Markets Chart Templates - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  let templates = [];
  let settings = {
    activeTemplateId: 'bullish_ob',
    defaultTemplateId: 'bullish_ob',
    showFloatingBar: true,
    floatingBarPosition: { top: 80, left: 16 },
    autoApplyToNew: true,
    hotkeysEnabled: true
  };

  let editingTemplateId = null;

  // DOM Elements
  const templateListEl = document.getElementById('template-list');
  const templateCountEl = document.getElementById('template-count');
  const btnNewTemplate = document.getElementById('btn-new-template');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Modal & Form Elements
  const modalEl = document.getElementById('editor-modal');
  const modalTitleEl = document.getElementById('modal-title');
  const modalCloseBtn = document.getElementById('modal-close');
  const btnCancel = document.getElementById('btn-cancel');
  const btnSave = document.getElementById('btn-save');

  // Basic Inputs
  const editOverrideSelect = document.getElementById('edit-override-select');
  const editName = document.getElementById('edit-name');
  const editColor = document.getElementById('edit-color');
  const editColorHex = document.getElementById('edit-color-hex');
  const editBgColor = document.getElementById('edit-bgcolor');
  const editBgColorHex = document.getElementById('edit-bgcolor-hex');
  const editOpacity = document.getElementById('edit-opacity');
  const opacityVal = document.getElementById('opacity-val');
  const editLinewidth = document.getElementById('edit-linewidth');
  const editLinestyle = document.getElementById('edit-linestyle');

  // Center Line Elements
  const editShowMiddleLine = document.getElementById('edit-show-middle-line');
  const centerLineSettings = document.getElementById('center-line-settings');
  const editMiddleColor = document.getElementById('edit-middle-color');
  const editMiddleColorHex = document.getElementById('edit-middle-color-hex');
  const editMiddleStyle = document.getElementById('edit-middle-style');
  const editMiddleWidth = document.getElementById('edit-middle-width');

  // Ray & Default Elements
  const editExtendLeft = document.getElementById('edit-extend-left');
  const editExtendRight = document.getElementById('edit-extend-right');
  const editSetDefault = document.getElementById('edit-set-default');
  const editText = document.getElementById('edit-text');

  // Live Preview Elements
  const previewBox = document.getElementById('preview-box');
  const previewBoxText = document.getElementById('preview-box-text');
  const previewCenterLine = document.getElementById('preview-center-line');
  const previewExtendLeft = document.getElementById('preview-extend-left');
  const previewExtendRight = document.getElementById('preview-extend-right');

  // Settings Elements
  const settingFloatingBar = document.getElementById('setting-floating-bar');
  const settingAutoApply = document.getElementById('setting-auto-apply');
  const settingHotkeys = document.getElementById('setting-hotkeys');
  const settingRememberSidebar = document.getElementById('setting-remember-sidebar');
  const settingPanelManagement = document.getElementById('setting-panel-management');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');

  // Export / Import / Updater
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const fileImport = document.getElementById('file-import');
  const btnOpenUpdater = document.getElementById('btn-open-updater');
  const popupVersionLabel = document.getElementById('popup-version-label');

  if (popupVersionLabel) {
    const ver = chrome.runtime.getManifest().version || '1.1.0';
    popupVersionLabel.textContent = `v${ver}`;
  }

  if (btnOpenUpdater) {
    btnOpenUpdater.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('update/update.html') });
    });
  }

  // -------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------
  async function loadData() {
    try {
      let data = await chrome.storage.local.get(['templates', 'settings', 'updaterState', 'installedVersionOverride']).catch(() => ({}));
      if (!data.templates && chrome.storage.sync) {
        data = await chrome.storage.sync.get(['templates', 'settings']).catch(() => ({}));
      }
      if (data.templates && Array.isArray(data.templates)) {
        templates = data.templates;
      }
      if (data.settings) {
        settings = { ...settings, ...data.settings };
      }
      if (data.installedVersionOverride && popupVersionLabel) {
        popupVersionLabel.textContent = `v${data.installedVersionOverride}`;
      }
      if (data.updaterState && data.updaterState.updateAvailable && popupVersionLabel && btnOpenUpdater) {
        popupVersionLabel.textContent = `Update v${data.updaterState.latestVersion}`;
        btnOpenUpdater.style.background = 'rgba(34, 197, 94, 0.2)';
        btnOpenUpdater.style.borderColor = 'rgba(34, 197, 94, 0.55)';
        btnOpenUpdater.style.color = '#4ade80';
      }
      renderTemplates();
      renderSettings();
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }

  async function saveData() {
    try {
      await chrome.storage.local.set({ templates, settings });
      if (chrome.storage.sync) {
        chrome.storage.sync.set({ templates, settings }).catch(() => {});
      }
    } catch (err) {
      console.error('Error saving data:', err);
    }
  }

  // -------------------------------------------------------------
  // Render Templates List
  // -------------------------------------------------------------
  function renderTemplates() {
    templateCountEl.textContent = `${templates.length} ${templates.length === 1 ? 'Template' : 'Templates'}`;
    templateListEl.innerHTML = '';

    templates.forEach((tpl) => {
      const isActive = tpl.id === settings.activeTemplateId;
      const isDefault = tpl.id === settings.defaultTemplateId;
      const opacity = typeof tpl.opacity === 'number' ? tpl.opacity : 20;
      const fillRgba = hexToRgba(tpl.backgroundColor || tpl.color, opacity / 100);

      // Feature tags
      const tags = [];
      tags.push(`${opacity}% Fill`);
      tags.push(`${tpl.linewidth || 1}px ${getLineStyleName(tpl.linestyle)}`);
      if (tpl.showMiddleLine) tags.push('50% Line');
      if (tpl.extendLeft && tpl.extendRight) tags.push('Extend ◀▶');
      else if (tpl.extendRight) tags.push('Extend ➜');
      else if (tpl.extendLeft) tags.push('Extend ⬅');

      const card = document.createElement('div');
      card.className = `tpl-card ${isActive ? 'active-tpl' : ''}`;
      card.dataset.id = tpl.id;

      card.innerHTML = `
        <div class="tpl-left" style="cursor: pointer;" title="Click to make active drawing template">
          <div class="tpl-swatch" style="border: 2px solid ${tpl.color}; background: ${fillRgba};">
            ${tpl.showMiddleLine ? `<div style="position:absolute; top:50%; left:0; right:0; height:1px; background:${tpl.middleLineColor || tpl.color}; transform:translateY(-50%);"></div>` : ''}
          </div>
          <div class="tpl-details">
            <div class="tpl-name-row">
              <span class="tpl-name">${escapeHtml(tpl.name)}</span>
              ${isDefault ? '<span class="badge-default">DEFAULT</span>' : ''}
              ${isActive ? '<span class="badge-active">ACTIVE</span>' : ''}
            </div>
            <div class="tpl-meta">
              <span>${tags.join(' • ')}</span>
            </div>
          </div>
        </div>

        <div class="tpl-actions">
          <button class="icon-btn btn-star" title="${isDefault ? 'Default template' : 'Set as default template'}" data-id="${tpl.id}">
            <svg viewBox="0 0 24 24" fill="${isDefault ? '#facc15' : 'none'}" stroke="${isDefault ? '#facc15' : 'currentColor'}" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
          <button class="icon-btn btn-override" title="Override with chart's current box" data-id="${tpl.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
          <button class="icon-btn btn-edit" title="Edit template" data-id="${tpl.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="icon-btn btn-duplicate" title="Duplicate template" data-id="${tpl.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="icon-btn btn-delete" title="Delete template" data-id="${tpl.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Click card to set active template
      const leftPart = card.querySelector('.tpl-left');
      leftPart.addEventListener('click', async () => {
        settings.activeTemplateId = tpl.id;
        await saveData();
        renderTemplates();
      });

      // Actions
      const starBtn = card.querySelector('.btn-star');
      starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        settings.defaultTemplateId = tpl.id;
        settings.activeTemplateId = tpl.id;
        await saveData();
        renderTemplates();
      });

      const overrideBtn = card.querySelector('.btn-override');
      overrideBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Override template "${tpl.name}" with the current box on the active chart?`)) {
          // Send message to active tab to trigger override
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'VEST_OVERRIDE_FROM_POPUP',
              templateId: tpl.id
            }, () => {
              // Reload templates in popup shortly after
              setTimeout(loadData, 300);
            });
          }
        }
      });

      const editBtn = card.querySelector('.btn-edit');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditor(tpl.id);
      });

      const dupBtn = card.querySelector('.btn-duplicate');
      dupBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        duplicateTemplate(tpl.id);
      });

      const delBtn = card.querySelector('.btn-delete');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        deleteTemplate(tpl.id);
      });

      templateListEl.appendChild(card);
    });
  }

  function getLineStyleName(style) {
    if (style === 1) return 'Dotted';
    if (style === 2) return 'Dashed';
    return 'Solid';
  }

  // -------------------------------------------------------------
  // Settings Tab
  // -------------------------------------------------------------
  function renderSettings() {
    settingFloatingBar.checked = Boolean(settings.showFloatingBar);
    settingAutoApply.checked = Boolean(settings.autoApplyToNew);
    settingHotkeys.checked = Boolean(settings.hotkeysEnabled);
    if (settingRememberSidebar) {
      settingRememberSidebar.checked = settings.rememberSidebarTools !== false;
    }
    if (settingPanelManagement) {
      settingPanelManagement.checked = settings.enablePanelManagement !== false;
    }
  }

  settingFloatingBar.addEventListener('change', async () => {
    settings.showFloatingBar = settingFloatingBar.checked;
    await saveData();
  });

  settingAutoApply.addEventListener('change', async () => {
    settings.autoApplyToNew = settingAutoApply.checked;
    await saveData();
  });

  settingHotkeys.addEventListener('change', async () => {
    settings.hotkeysEnabled = settingHotkeys.checked;
    await saveData();
  });

  if (settingRememberSidebar) {
    settingRememberSidebar.addEventListener('change', async () => {
      settings.rememberSidebarTools = settingRememberSidebar.checked;
      await saveData();
    });
  }

  if (settingPanelManagement) {
    settingPanelManagement.addEventListener('change', async () => {
      settings.enablePanelManagement = settingPanelManagement.checked;
      await saveData();
    });
  }

  btnResetDefaults.addEventListener('click', async () => {
    if (confirm('Reset all templates and settings to defaults? Your custom templates will be replaced.')) {
      const res = await chrome.runtime.sendMessage({ action: 'getTemplatesAndSettings' });
      if (res && res.templates) {
        templates = res.templates;
        settings = res.settings;
        await saveData();
        renderTemplates();
        renderSettings();
      }
    }
  });

  // -------------------------------------------------------------
  // Modal Editor & Live Preview
  // -------------------------------------------------------------
  function openEditor(templateId = null) {
    editingTemplateId = templateId;

    // Populate override dropdown
    editOverrideSelect.innerHTML = '<option value="">-- Create As New Template --</option>';
    templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name}${t.id === templateId ? ' (Current)' : ''}`;
      editOverrideSelect.appendChild(opt);
    });

    if (templateId) {
      editOverrideSelect.value = templateId;
      const tpl = templates.find(t => t.id === templateId);
      if (!tpl) return;
      modalTitleEl.textContent = 'Edit Box Template';
      populateFormFromTemplate(tpl);
    } else {
      editOverrideSelect.value = '';
      modalTitleEl.textContent = 'New Box Template';
      resetFormToDefaults();
    }

    updateLivePreview();
    modalEl.style.display = 'flex';
    editName.focus();
  }

  function populateFormFromTemplate(tpl) {
    editName.value = tpl.name || '';
    editColor.value = tpl.color || '#22c55e';
    editColorHex.value = tpl.color || '#22c55e';
    editBgColor.value = tpl.backgroundColor || tpl.color || '#22c55e';
    editBgColorHex.value = tpl.backgroundColor || tpl.color || '#22c55e';
    editOpacity.value = typeof tpl.opacity === 'number' ? tpl.opacity : 20;
    opacityVal.textContent = `${editOpacity.value}%`;
    editLinewidth.value = tpl.linewidth || '1';
    editLinestyle.value = tpl.linestyle !== undefined ? tpl.linestyle : '0';

    // Center Line
    editShowMiddleLine.checked = Boolean(tpl.showMiddleLine);
    centerLineSettings.style.display = tpl.showMiddleLine ? 'flex' : 'none';
    editMiddleColor.value = tpl.middleLineColor || tpl.color || '#22c55e';
    editMiddleColorHex.value = tpl.middleLineColor || tpl.color || '#22c55e';
    editMiddleStyle.value = tpl.middleLineStyle !== undefined ? tpl.middleLineStyle : '2';
    editMiddleWidth.value = tpl.middleLineWidth || '1';

    // Ray & Defaults
    editExtendLeft.checked = Boolean(tpl.extendLeft);
    editExtendRight.checked = Boolean(tpl.extendRight);
    editSetDefault.checked = tpl.id === settings.defaultTemplateId;
    editText.value = tpl.text || '';
  }

  function resetFormToDefaults() {
    editName.value = '';
    editColor.value = '#22c55e';
    editColorHex.value = '#22c55e';
    editBgColor.value = '#22c55e';
    editBgColorHex.value = '#22c55e';
    editOpacity.value = 20;
    opacityVal.textContent = '20%';
    editLinewidth.value = '1';
    editLinestyle.value = '0';

    editShowMiddleLine.checked = false;
    centerLineSettings.style.display = 'none';
    editMiddleColor.value = '#22c55e';
    editMiddleColorHex.value = '#22c55e';
    editMiddleStyle.value = '2';
    editMiddleWidth.value = '1';

    editExtendLeft.checked = false;
    editExtendRight.checked = false;
    editSetDefault.checked = false;
    editText.value = '';
  }

  editOverrideSelect.addEventListener('change', () => {
    const selectedId = editOverrideSelect.value;
    if (selectedId) {
      editingTemplateId = selectedId;
      modalTitleEl.textContent = 'Override Existing Template';
      const tpl = templates.find(t => t.id === selectedId);
      if (tpl) {
        populateFormFromTemplate(tpl);
        updateLivePreview();
      }
    } else {
      editingTemplateId = null;
      modalTitleEl.textContent = 'New Box Template';
    }
  });

  function closeEditor() {
    modalEl.style.display = 'none';
    editingTemplateId = null;
  }

  function updateLivePreview() {
    const borderColor = editColorHex.value || editColor.value;
    const bgColor = editBgColorHex.value || editBgColor.value;
    const opacity = parseInt(editOpacity.value, 10) / 100;
    const linewidth = editLinewidth.value;
    const linestyle = editLinestyle.value;
    const text = editText.value.trim();

    let borderStyleCss = 'solid';
    if (linestyle === '1') borderStyleCss = 'dotted';
    if (linestyle === '2') borderStyleCss = 'dashed';

    previewBox.style.border = `${linewidth}px ${borderStyleCss} ${borderColor}`;
    previewBox.style.backgroundColor = hexToRgba(bgColor, opacity);
    previewBox.style.color = borderColor;

    // Center Line Preview
    if (editShowMiddleLine.checked) {
      previewCenterLine.style.display = 'block';
      const mColor = editMiddleColorHex.value || editMiddleColor.value;
      const mWidth = editMiddleWidth.value;
      const mStyle = editMiddleStyle.value;
      let mStyleCss = 'dashed';
      if (mStyle === '0') mStyleCss = 'solid';
      if (mStyle === '1') mStyleCss = 'dotted';

      previewCenterLine.style.borderTop = `${mWidth}px ${mStyleCss} ${mColor}`;
    } else {
      previewCenterLine.style.display = 'none';
    }

    // Extend Indicators
    previewExtendLeft.style.display = editExtendLeft.checked ? 'block' : 'none';
    previewExtendLeft.style.color = borderColor;
    previewExtendRight.style.display = editExtendRight.checked ? 'block' : 'none';
    previewExtendRight.style.color = borderColor;

    if (text) {
      previewBoxText.textContent = text;
      previewBoxText.style.display = 'inline';
    } else {
      previewBoxText.textContent = editName.value.trim() || 'Preview';
      previewBoxText.style.display = 'inline';
    }
  }

  // Live input handlers
  editColor.addEventListener('input', () => {
    editColorHex.value = editColor.value.toUpperCase();
    if (!editShowMiddleLine.checked) {
      editMiddleColor.value = editColor.value;
      editMiddleColorHex.value = editColor.value.toUpperCase();
    }
    updateLivePreview();
  });

  editColorHex.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(editColorHex.value)) {
      editColor.value = editColorHex.value;
      if (!editShowMiddleLine.checked) {
        editMiddleColor.value = editColorHex.value;
        editMiddleColorHex.value = editColorHex.value.toUpperCase();
      }
    }
    updateLivePreview();
  });

  editBgColor.addEventListener('input', () => {
    editBgColorHex.value = editBgColor.value.toUpperCase();
    updateLivePreview();
  });

  editBgColorHex.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(editBgColorHex.value)) {
      editBgColor.value = editBgColorHex.value;
    }
    updateLivePreview();
  });

  editOpacity.addEventListener('input', () => {
    opacityVal.textContent = `${editOpacity.value}%`;
    updateLivePreview();
  });

  editLinewidth.addEventListener('change', updateLivePreview);
  editLinestyle.addEventListener('change', updateLivePreview);
  editName.addEventListener('input', updateLivePreview);
  editText.addEventListener('input', updateLivePreview);

  // Center Line inputs
  editShowMiddleLine.addEventListener('change', () => {
    centerLineSettings.style.display = editShowMiddleLine.checked ? 'flex' : 'none';
    updateLivePreview();
  });

  editMiddleColor.addEventListener('input', () => {
    editMiddleColorHex.value = editMiddleColor.value.toUpperCase();
    updateLivePreview();
  });

  editMiddleColorHex.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(editMiddleColorHex.value)) {
      editMiddleColor.value = editMiddleColorHex.value;
    }
    updateLivePreview();
  });

  editMiddleStyle.addEventListener('change', updateLivePreview);
  editMiddleWidth.addEventListener('change', updateLivePreview);
  editExtendLeft.addEventListener('change', updateLivePreview);
  editExtendRight.addEventListener('change', updateLivePreview);

  // Modal Buttons
  btnNewTemplate.addEventListener('click', () => openEditor());
  modalCloseBtn.addEventListener('click', closeEditor);
  btnCancel.addEventListener('click', closeEditor);

  btnSave.addEventListener('click', async () => {
    const name = editName.value.trim();
    if (!name) {
      alert('Please enter a template name.');
      editName.focus();
      return;
    }

    const tplData = {
      name,
      color: editColorHex.value || editColor.value,
      backgroundColor: editBgColorHex.value || editBgColor.value,
      opacity: parseInt(editOpacity.value, 10),
      linewidth: parseInt(editLinewidth.value, 10),
      linestyle: parseInt(editLinestyle.value, 10),
      showMiddleLine: editShowMiddleLine.checked,
      middleLineColor: editMiddleColorHex.value || editMiddleColor.value,
      middleLineWidth: parseInt(editMiddleWidth.value, 10),
      middleLineStyle: parseInt(editMiddleStyle.value, 10),
      extendLeft: editExtendLeft.checked,
      extendRight: editExtendRight.checked,
      showLabel: Boolean(editText.value.trim()),
      text: editText.value.trim(),
      textColor: editColorHex.value || editColor.value,
      fontSize: 12
    };

    if (editingTemplateId) {
      const idx = templates.findIndex(t => t.id === editingTemplateId);
      if (idx !== -1) {
        templates[idx] = { ...templates[idx], ...tplData };
      }
      if (editSetDefault.checked) {
        settings.defaultTemplateId = editingTemplateId;
      }
    } else {
      const newId = `tpl_${Date.now()}`;
      const newTpl = { id: newId, ...tplData };
      templates.push(newTpl);
      settings.activeTemplateId = newId;

      if (editSetDefault.checked) {
        settings.defaultTemplateId = newId;
      }
    }

    await saveData();
    renderTemplates();
    closeEditor();
  });

  // Duplicate
  async function duplicateTemplate(id) {
    const orig = templates.find(t => t.id === id);
    if (!orig) return;

    const dup = {
      ...orig,
      id: `tpl_${Date.now()}`,
      name: `${orig.name} (Copy)`
    };

    templates.push(dup);
    await saveData();
    renderTemplates();
  }

  // Delete
  async function deleteTemplate(id) {
    if (templates.length <= 1) {
      alert('You must keep at least one template.');
      return;
    }

    const tpl = templates.find(t => t.id === id);
    if (!confirm(`Are you sure you want to delete "${tpl?.name}"?`)) return;

    templates = templates.filter(t => t.id !== id);

    if (settings.activeTemplateId === id) {
      settings.activeTemplateId = templates[0].id;
    }
    if (settings.defaultTemplateId === id) {
      settings.defaultTemplateId = templates[0].id;
    }

    await saveData();
    renderTemplates();
  }

  // -------------------------------------------------------------
  // Tabs Navigation
  // -------------------------------------------------------------
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // -------------------------------------------------------------
  // Export & Import
  // -------------------------------------------------------------
  btnExport.addEventListener('click', () => {
    const exportData = {
      app: 'VestChartTemplates',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      templates,
      settings
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vest-chart-templates-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnImport.addEventListener('click', () => {
    fileImport.click();
  });

  fileImport.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.templates && Array.isArray(parsed.templates) && parsed.templates.length > 0) {
        if (confirm(`Import ${parsed.templates.length} templates? This will merge with your current list.`)) {
          const existingIds = new Set(templates.map(t => t.id));
          parsed.templates.forEach(t => {
            if (!t.id || existingIds.has(t.id)) {
              t.id = `imported_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            }
            templates.push(t);
          });

          await saveData();
          renderTemplates();
          alert('Templates imported successfully!');
        }
      } else {
        alert('Invalid template JSON file format.');
      }
    } catch (err) {
      alert('Error parsing file: ' + err.message);
    } finally {
      fileImport.value = '';
    }
  });

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  await loadData();
});
