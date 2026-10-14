/**
 * Trading Cortex · OTA Release & Sync Engine
 * Polls GitHub Releases (childersc/trading-cortex), extracts release ZIPs in memory
 * via Web DecompressionStream, writes updated files to the user's local extension
 * folder via FileSystemDirectoryHandle, and hot-reloads Trading Cortex.
 */

(function () {
  'use strict';

  const DEFAULT_REPO = 'childersc/trading-cortex';
  const IDB_NAME = 'vest_studio_updater_db';
  const IDB_STORE = 'handles';
  const IDB_KEY = 'extension_dir_handle';

  const manifest = chrome.runtime.getManifest();
  let installedVersion = manifest.version || '1.1.0';

  let savedDirHandle = null;
  let latestRelease = null;
  let isUpdating = false;

  // DOM References
  const allReleasesLink = document.getElementById('all-releases-link');
  const releaseGithubLink = document.getElementById('release-github-link');

  const statusEyebrow = document.getElementById('status-eyebrow');
  const statusHeading = document.getElementById('status-heading');

  const vboxInstalled = document.getElementById('vbox-installed');
  const vboxLatest = document.getElementById('vbox-latest');
  const vboxChanges = document.getElementById('vbox-changes');

  const progressLabelLeft = document.getElementById('progress-label-left');
  const progressLabelRight = document.getElementById('progress-label-right');
  const progressFill = document.getElementById('progress-fill');

  const step1Row = document.getElementById('step-1');
  const step1Badge = document.getElementById('step-1-badge');
  const step1Label = document.getElementById('step-1-label');
  const pickFolderBtn = document.getElementById('pick-folder-btn');

  const step2Row = document.getElementById('step-2');
  const step2Badge = document.getElementById('step-2-badge');
  const step2Label = document.getElementById('step-2-label');

  const step3Row = document.getElementById('step-3');
  const step3Badge = document.getElementById('step-3-badge');
  const step3Label = document.getElementById('step-3-label');

  const step4Row = document.getElementById('step-4');
  const step4Badge = document.getElementById('step-4-badge');

  const btnRunUpdate = document.getElementById('btn-run-update');
  const btnRunUpdateLabel = document.getElementById('btn-run-update-label');
  const errorBanner = document.getElementById('error-banner');
  const successBanner = document.getElementById('success-banner');

  const toggleAutoCheck = document.getElementById('toggle-auto-check');
  const heartbeatStateText = document.getElementById('heartbeat-state-text');
  const heroLastChecked = document.getElementById('hero-last-checked');
  const tileLastChecked = document.getElementById('tile-last-checked');
  const btnCheckNow = document.getElementById('btn-check-now');
  const btnCheckNowLabel = document.getElementById('btn-check-now-label');
  const btnForgetFolder = document.getElementById('btn-forget-folder');

  const notesVersionTitle = document.getElementById('notes-version-title');
  const notesSummary = document.getElementById('notes-summary');
  const notesZipName = document.getElementById('notes-zip-name');
  const notesBody = document.getElementById('notes-body');
  const repoSlugDisplay = document.getElementById('repo-slug-display');

  const syncTerminal = document.getElementById('sync-terminal');
  const btnClearLog = document.getElementById('btn-clear-log');

  function formatLastCheckedTimestamp(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function updateLastCheckedUI(ts) {
    const formatted = formatLastCheckedTimestamp(ts);
    if (heroLastChecked) {
      heroLastChecked.textContent = `Last Checked: ${formatted}`;
    }
    if (tileLastChecked) {
      tileLastChecked.textContent = formatted;
    }
  }

  function logTerm(msg, level = '') {
    if (!syncTerminal) return;
    const now = new Date().toTimeString().split(' ')[0];
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = `<span class="term-ts">[${now}]</span><span class="term-msg ${level}">${escapeHtml(msg)}</span>`;
    syncTerminal.appendChild(line);
    syncTerminal.scrollTop = syncTerminal.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // -------------------------------------------------------------
  // IndexedDB Directory Handle Storage
  // -------------------------------------------------------------
  function openUpdaterDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function loadSavedFolderHandle() {
    try {
      const db = await openUpdaterDB();
      return await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async function saveFolderHandle(handle) {
    try {
      const db = await openUpdaterDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {}
  }

  async function clearSavedFolderHandle() {
    try {
      const db = await openUpdaterDB();
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Semver Comparison
  // -------------------------------------------------------------
  function cleanVersion(v) {
    return String(v || '').trim().replace(/^v/i, '');
  }

  function compareVersions(a, b) {
    const pa = cleanVersion(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = cleanVersion(b).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  // -------------------------------------------------------------
  // UI State Helpers
  // -------------------------------------------------------------
  function showError(msg) {
    if (!msg) {
      errorBanner.style.display = 'none';
      errorBanner.textContent = '';
      return;
    }
    if (successBanner) {
      successBanner.style.display = 'none';
      successBanner.textContent = '';
    }
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
    logTerm(`ERROR: ${msg}`, 'err');
  }

  function showSuccess(msg) {
    if (!successBanner) return;
    if (!msg) {
      successBanner.style.display = 'none';
      successBanner.textContent = '';
      return;
    }
    errorBanner.style.display = 'none';
    errorBanner.textContent = '';
    successBanner.textContent = msg;
    successBanner.style.display = 'flex';
  }

  function updateStepState(stepRow, badgeEl, state, numberText) {
    stepRow.classList.remove('done', 'active');
    if (state === 'done') {
      stepRow.classList.add('done');
      badgeEl.textContent = '✓';
    } else if (state === 'active') {
      stepRow.classList.add('active');
      badgeEl.textContent = '••';
    } else {
      badgeEl.textContent = String(numberText).padStart(2, '0');
    }
  }

  function renderFolderStepUI() {
    if (savedDirHandle) {
      updateStepState(step1Row, step1Badge, 'done', 1);
      step1Label.textContent = `Linked: ${savedDirHandle.name}`;
      pickFolderBtn.textContent = 'Change';
    } else {
      updateStepState(step1Row, step1Badge, 'pending', 1);
      step1Label.textContent = 'No local directory linked';
      pickFolderBtn.textContent = 'Link Folder';
    }
  }

  const DEFAULT_RELEASE_NOTES_ITEMS = [
    '**Chart Viewport & Settings Memory**: Automatically remembers and restores your exact chart position (left/right pan, up/down price scale, zoom level), timeframe, and candle style across page refreshes.',
    '**Left-Sidebar Drawing Tool & Magnet Persistence**: Remembers the active drawing tool, Magnet mode (Weak/Strong), and selected submenu slot icons across all drawing groups on the left toolbar without leaving pull-out menus open.',
    '**CORTEX Header Pill & Live Update Indicator**: Added sleek header pill displaying the active version (`v1.1.0`) with automatic background update checks on page refresh and menu click, plus a pulsing `"Update ready"` glow when a new build drops.',
    '**Native TradingView `Template >` Context Menu**: Right-click any rectangle on the chart to apply, save, or delete custom ICT/SMC box presets (`Bullish OB`, `Bearish OB`, `Fair Value Gap`, `Liquidity`, `Breaker Block`, `Volume Imbalance`).',
    '**Extended Rectangle Far-Right Label Fix**: Keeps text labels on right-extended rectangles pinned cleanly inside the visible chart canvas next to the price scale.',
    '**Movable Settings & Update Center**: Added draggable Settings dialog and 4-stage Update Center connected to `childersc/trading-cortex`.'
  ];

  function renderReleaseNotes(release) {
    const tag = release?.tag_name || `v${installedVersion}`;
    const displayVer = tag.startsWith('v') ? tag : `v${tag}`;
    notesVersionTitle.textContent = displayVer;

    if (release?.html_url) {
      releaseGithubLink.href = release.html_url;
    }

    const zipAsset = (release?.assets || []).find(a => a.name && a.name.endsWith('.zip'));
    notesZipName.textContent = zipAsset ? zipAsset.name : `trading-cortex-${cleanVersion(tag)}.zip`;

    const rawBody = (release?.body || '').trim();
    const lines = rawBody ? rawBody.split(/\r?\n/).map(l => l.trim()).filter(Boolean) : [];
    const bulletLines = lines.filter(l => /^[-*•]\s+/.test(l));
    const paragraphLines = lines.filter(l => !/^[-*•#]\s*/.test(l) && !/^full changelog:/i.test(l));

    notesSummary.textContent =
      paragraphLines[0] ||
      'Smart chart viewport memory, persistent left-sidebar drawing tools, customizable ICT/SMC rectangle templates, and 1-click Update Center.';

    const items = bulletLines.length > 0
      ? bulletLines.map(b => b.replace(/^[-*•]\s+/, ''))
      : DEFAULT_RELEASE_NOTES_ITEMS;

    vboxChanges.textContent = String(items.length);

    notesBody.innerHTML = `
      <ul class="notes-list">
        ${items.map(item => {
          const escaped = escapeHtml(item)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>');
          return `<li>${escaped}</li>`;
        }).join('')}
      </ul>
    `;
  }

  // -------------------------------------------------------------
  // Check GitHub Releases
  // -------------------------------------------------------------
  async function checkGitHubRelease(isManualClick = false) {
    showError(null);
    statusEyebrow.textContent = 'POLLING';
    statusHeading.textContent = 'Checking GitHub for updates...';
    if (btnCheckNow) {
      btnCheckNow.classList.add('checking');
      btnCheckNow.disabled = true;
    }
    if (btnCheckNowLabel) {
      btnCheckNowLabel.textContent = 'Checking...';
    }
    logTerm(`Polling https://api.github.com/repos/${DEFAULT_REPO}/releases/latest ...`, 'info');

    try {
      let release = null;
      const resp = await fetch(`https://api.github.com/repos/${DEFAULT_REPO}/releases/latest`, {
        headers: { 'Accept': 'application/vnd.github+json' },
        cache: 'no-store'
      });

      if (resp.ok) {
        release = await resp.json();
      } else if (resp.status === 404) {
        // Fallback 1: check all releases (including pre-releases)
        const listResp = await fetch(`https://api.github.com/repos/${DEFAULT_REPO}/releases?per_page=5`, {
          headers: { 'Accept': 'application/vnd.github+json' },
          cache: 'no-store'
        });
        if (listResp.ok) {
          const list = await listResp.json();
          if (Array.isArray(list) && list.length > 0) {
            release = list[0];
          }
        }
        // Fallback 2: check repository tags if GitHub Actions is still building the release
        if (!release) {
          const tagsResp = await fetch(`https://api.github.com/repos/${DEFAULT_REPO}/tags?per_page=5`, {
            headers: { 'Accept': 'application/vnd.github+json' },
            cache: 'no-store'
          });
          if (tagsResp.ok) {
            const tags = await tagsResp.json();
            if (Array.isArray(tags) && tags.length > 0) {
              const topTag = tags[0].name;
              release = {
                tag_name: topTag,
                name: `Trading Cortex ${topTag}`,
                html_url: `https://github.com/${DEFAULT_REPO}/releases/tag/${topTag}`,
                zipball_url: tags[0].zipball_url,
                assets: [],
                body: `Packaged build ${topTag} on GitHub (${DEFAULT_REPO}).`
              };
            }
          }
        }
      } else {
        throw new Error(`GitHub API HTTP ${resp.status}`);
      }

      if (!release) {
        throw new Error('No published releases or tags found on GitHub yet.');
      }

      latestRelease = release;

      const latestVer = cleanVersion(release.tag_name || release.name || installedVersion);
      vboxLatest.textContent = `v${latestVer}`;
      renderReleaseNotes(release);

      const cmp = compareVersions(latestVer, installedVersion);
      const checkedAt = Date.now();
      updateLastCheckedUI(checkedAt);

      await chrome.storage.local.set({
        updaterState: {
          lastCheckedAt: checkedAt,
          latestVersion: latestVer,
          updateAvailable: cmp > 0,
          htmlUrl: release.html_url
        }
      });

      if (cmp > 0) {
        statusEyebrow.textContent = 'UPDATE READY';
        statusHeading.textContent = `New release v${latestVer} is available on GitHub`;
        if (btnRunUpdateLabel) btnRunUpdateLabel.textContent = `Deploy v${latestVer}`;
        btnRunUpdate.disabled = false;
        chrome.action.setBadgeText({ text: 'NEW' });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
        logTerm(`Update available: v${installedVersion} -> v${latestVer}`, 'ok');
        if (isManualClick) {
          showSuccess(`⚡ Update available! New release v${latestVer} is ready to deploy (installed: v${installedVersion}).`);
        }
      } else {
        statusEyebrow.textContent = 'SYNCHRONIZED';
        statusHeading.textContent = `Trading Cortex v${installedVersion} is up to date`;
        if (btnRunUpdateLabel) btnRunUpdateLabel.textContent = `Re-Sync v${latestVer}`;
        btnRunUpdate.disabled = false;
        chrome.action.setBadgeText({ text: '' });
        logTerm(`Local build v${installedVersion} matches latest GitHub release.`, 'ok');
        if (isManualClick) {
          showSuccess(`✓ You're up to date! Trading Cortex v${installedVersion} is the latest release.`);
        }
      }
    } catch (err) {
      statusEyebrow.textContent = 'STANDBY';
      statusHeading.textContent = `Installed Build v${installedVersion}`;
      vboxLatest.textContent = `v${installedVersion}`;
      vboxChanges.textContent = '0';
      showError(`GitHub channel check (${DEFAULT_REPO}): ${err.message}`);
    } finally {
      if (btnCheckNow) {
        btnCheckNow.classList.remove('checking');
        btnCheckNow.disabled = false;
      }
      if (btnCheckNowLabel) {
        btnCheckNowLabel.textContent = 'Check for Update';
      }
    }
  }

  // -------------------------------------------------------------
  // Pure-JS ZIP Extractor (using Web DecompressionStream)
  // -------------------------------------------------------------
  async function extractZipBuffer(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP archive (EOCD signature not found)');
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    const files = [];
    let ptr = cdOffset;
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < totalEntries; i++) {
      if (view.getUint32(ptr, true) !== 0x02014b50) {
        throw new Error('Corrupt ZIP Central Directory header');
      }

      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const uncompressedSize = view.getUint32(ptr + 24, true);
      const fileNameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const rawName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));
      ptr += 46 + fileNameLen + extraLen + commentLen;

      if (rawName.endsWith('/')) continue;

      if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
        throw new Error(`Corrupt local file header for ${rawName}`);
      }
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedBytes = bytes.subarray(dataStart, dataStart + compressedSize);

      let fileData;
      if (compressionMethod === 0) {
        fileData = compressedBytes.slice();
      } else if (compressionMethod === 8) {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedBytes);
        writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        fileData = new Uint8Array(decompressedBuf);
      } else {
        throw new Error(`Unsupported ZIP compression method (${compressionMethod}) for ${rawName}`);
      }

      files.push({
        path: rawName.replace(/\\/g, '/'),
        data: fileData,
        size: uncompressedSize
      });
    }

    if (files.length > 0 && files.every(f => f.path.includes('/'))) {
      const firstSeg = files[0].path.split('/')[0] + '/';
      if (files.every(f => f.path.startsWith(firstSeg))) {
        files.forEach(f => {
          f.path = f.path.slice(firstSeg.length);
        });
      }
    }

    return files.filter(f => f.path && !f.path.startsWith('.git/'));
  }

  async function writeFileToDirectory(rootDirHandle, relativePath, uint8Data) {
    const parts = relativePath.split('/').filter(Boolean);
    const fileName = parts.pop();
    let currDir = rootDirHandle;

    for (const folder of parts) {
      currDir = await currDir.getDirectoryHandle(folder, { create: true });
    }

    const fileHandle = await currDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(uint8Data);
    await writable.close();
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Local File System JSON Database Sync & Migration (user-data/cortex-db.json)
  // -------------------------------------------------------------
  const DB_FOLDER_NAME = 'user-data';
  const DB_FILE_NAME = 'cortex-db.json';
  const CURRENT_DB_SCHEMA_VERSION = 1;

  async function syncLocalJsonDatabase(dirHandle) {
    if (!dirHandle) return;
    try {
      const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;

      const userDataDir = await dirHandle.getDirectoryHandle(DB_FOLDER_NAME, { create: true });
      let existingDiskDb = null;
      try {
        const existingFileHandle = await userDataDir.getFileHandle(DB_FILE_NAME, { create: false });
        const existingFile = await existingFileHandle.getFile();
        const rawText = await existingFile.text();
        if (rawText && rawText.trim()) {
          existingDiskDb = JSON.parse(rawText);
        }
      } catch (e) {
        // File does not exist yet
      }

      const storageData = await chrome.storage.local.get(['templates', 'settings']).catch(() => ({}));

      // If chrome.storage was wiped (e.g. extension was unloaded/reloaded) or disk database has newer custom templates, restore from disk!
      let finalTemplates = storageData.templates;
      let finalSettings = storageData.settings;
      let restoredFromDisk = false;

      if (existingDiskDb && Array.isArray(existingDiskDb.templates) && existingDiskDb.templates.length > 0) {
        const isStorageDefaultOrEmpty =
          !Array.isArray(finalTemplates) ||
          finalTemplates.length === 0 ||
          (!finalSettings?._savedAt && existingDiskDb.updatedAt);

        if (isStorageDefaultOrEmpty) {
          finalTemplates = existingDiskDb.templates;
          restoredFromDisk = true;
        }
      }

      if (existingDiskDb && existingDiskDb.settings && typeof existingDiskDb.settings === 'object') {
        if (!finalSettings || (!finalSettings._savedAt && existingDiskDb.updatedAt)) {
          finalSettings = { ...(finalSettings || {}), ...existingDiskDb.settings };
          restoredFromDisk = true;
        }
      }

      if (restoredFromDisk) {
        await chrome.storage.local.set({
          templates: finalTemplates,
          settings: finalSettings,
          dbSchemaVersion: CURRENT_DB_SCHEMA_VERSION
        }).catch(() => {});
        logTerm(`Restored templates & settings from local disk database (${DB_FOLDER_NAME}/${DB_FILE_NAME})`, 'ok');
      }

      // Write latest migrated database state back to user-data/cortex-db.json
      const migrations = Array.isArray(existingDiskDb?.migrations) ? [...existingDiskDb.migrations] : [];
      if (!existingDiskDb || (Number(existingDiskDb.schemaVersion) || 0) < CURRENT_DB_SCHEMA_VERSION) {
        migrations.push({
          version: CURRENT_DB_SCHEMA_VERSION,
          migratedAt: new Date().toISOString(),
          extensionVersion: installedVersion
        });
      }

      const nextDbPayload = {
        schemaVersion: CURRENT_DB_SCHEMA_VERSION,
        updatedAt: Date.now(),
        extensionVersion: installedVersion,
        migrations,
        templates: finalTemplates || existingDiskDb?.templates || [],
        settings: finalSettings || existingDiskDb?.settings || {}
      };

      const fileHandle = await userDataDir.getFileHandle(DB_FILE_NAME, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(nextDbPayload, null, 2));
      await writable.close();
      logTerm(`Synced local database: ${DB_FOLDER_NAME}/${DB_FILE_NAME} (schema v${CURRENT_DB_SCHEMA_VERSION})`, 'ok');
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Run the 4-Stage Update Pipeline
  // -------------------------------------------------------------
  async function runSelfUpdate() {
    if (isUpdating) return;
    showError(null);

    if (!latestRelease) {
      await checkGitHubRelease();
      if (!latestRelease) return;
    }

    isUpdating = true;
    btnRunUpdate.disabled = true;

    try {
      const targetVer = cleanVersion(latestRelease.tag_name || installedVersion);
      statusEyebrow.textContent = 'DEPLOYING';
      statusHeading.textContent = `Deploying Trading Cortex v${targetVer}...`;
      logTerm(`Starting update to v${targetVer}...`, 'info');

      // STAGE 01: Workspace Link
      updateStepState(step1Row, step1Badge, 'active', 1);
      progressLabelLeft.textContent = 'Verifying workspace directory access...';

      if (!savedDirHandle) {
        logTerm('Prompting for local extension directory...', 'info');
        savedDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await saveFolderHandle(savedDirHandle);
      } else {
        let perm = await savedDirHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          perm = await savedDirHandle.requestPermission({ mode: 'readwrite' });
        }
        if (perm !== 'granted') {
          throw new Error('Read/Write permission to the local folder was denied.');
        }
      }

      renderFolderStepUI();
      logTerm(`Workspace directory ready: ${savedDirHandle.name}`, 'ok');

      // Backup & migrate local JSON database (user-data/cortex-db.json) before extracting update
      await syncLocalJsonDatabase(savedDirHandle);

      // STAGE 02: Fetch & Verify
      updateStepState(step2Row, step2Badge, 'active', 2);
      progressLabelLeft.textContent = 'Downloading release archive...';
      progressFill.style.width = '15%';

      const zipAsset = (latestRelease.assets || []).find(a => a.name && a.name.endsWith('.zip'));
      const downloadUrl = zipAsset ? zipAsset.browser_download_url : latestRelease.zipball_url;
      if (!downloadUrl) {
        throw new Error('No downloadable ZIP archive found on this GitHub release.');
      }

      logTerm(`Downloading ${zipAsset ? zipAsset.name : 'release zipball'}...`, 'info');
      const zipResp = await fetch(downloadUrl, { cache: 'no-store' });
      if (!zipResp.ok) {
        throw new Error(`Failed to download release archive (HTTP ${zipResp.status})`);
      }

      const zipBuffer = await zipResp.arrayBuffer();
      logTerm(`Downloaded ${(zipBuffer.byteLength / 1024).toFixed(1)} KB`, 'ok');

      if (zipAsset && zipAsset.digest && zipAsset.digest.startsWith('sha256:')) {
        const expectedHex = zipAsset.digest.slice('sha256:'.length).toLowerCase();
        const hashBuf = await crypto.subtle.digest('SHA-256', zipBuffer);
        const actualHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (actualHex !== expectedHex) {
          throw new Error('SHA-256 digest mismatch! Aborting deployment.');
        }
        logTerm(`Verified SHA-256 digest (${actualHex.slice(0, 12)}...)`, 'ok');
      }

      updateStepState(step2Row, step2Badge, 'done', 2);
      step2Label.textContent = 'Package verified';

      // STAGE 03: In-Place Sync
      updateStepState(step3Row, step3Badge, 'active', 3);
      progressLabelLeft.textContent = 'Streaming updated files to disk...';

      const extractedFiles = await extractZipBuffer(zipBuffer);
      if (!extractedFiles.some(f => f.path === 'manifest.json')) {
        throw new Error('Archive does not contain a valid manifest.json at its root.');
      }

      const total = extractedFiles.length;
      for (let i = 0; i < total; i++) {
        const file = extractedFiles[i];
        progressLabelRight.textContent = `${i + 1} / ${total} files`;
        const pct = Math.round(((i + 1) / total) * 100);
        progressFill.style.width = `${pct}%`;
        await writeFileToDirectory(savedDirHandle, file.path, file.data);
        logTerm(`Synced: ${file.path} (${file.size} B)`);
      }

      updateStepState(step3Row, step3Badge, 'done', 3);
      step3Label.textContent = `Synced ${total} files`;
      logTerm(`Successfully wrote ${total} files into ${savedDirHandle.name}`, 'ok');

      // Ensure local JSON database is synced after file extraction
      await syncLocalJsonDatabase(savedDirHandle);

      // STAGE 04: Hot Reload
      updateStepState(step4Row, step4Badge, 'active', 4);
      progressLabelLeft.textContent = 'Finalizing disk flush & reloading trading browser tabs...';

      await chrome.action.setBadgeText({ text: '' });

      // Update installedVersion in memory and storage so UI immediately reflects the deployed release
      installedVersion = targetVer;
      vboxInstalled.textContent = `v${targetVer}`;

      let tradingTabsCount = 0;
      let vestTabs = [];
      try {
        vestTabs = await chrome.tabs.query({
          url: [
            'https://next.vestmarkets.com/*',
            'https://*.vest.exchange/*',
            'https://vest.exchange/*'
          ]
        });
        tradingTabsCount = vestTabs.length;
      } catch (e) {}

      await chrome.storage.local.set({
        installedVersionOverride: targetVer,
        reloadRuntimeOnUpdaterClose: true,
        updaterState: {
          lastCheckedAt: Date.now(),
          latestVersion: targetVer,
          updateAvailable: false,
          htmlUrl: latestRelease.html_url
        }
      }).catch(() => {});

      // Wait briefly for OS disk buffers to flush, then reload all active trading tabs in-place
      await new Promise(r => setTimeout(r, 450));
      for (const tab of vestTabs) {
        if (tab.id) {
          await chrome.tabs.reload(tab.id).catch(() => {});
        }
      }

      updateStepState(step4Row, step4Badge, 'done', 4);
      statusEyebrow.textContent = 'UPDATED';
      statusHeading.textContent = `Trading Cortex successfully updated to v${targetVer}!`;
      progressLabelLeft.textContent = `Update complete · v${targetVer} active`;
      if (btnRunUpdateLabel) btnRunUpdateLabel.textContent = `Re-Sync v${targetVer}`;
      btnRunUpdate.disabled = false;

      showSuccess(
        `✓ Trading Cortex has been successfully updated to v${targetVer}! Your trading browser windows (${tradingTabsCount} tab${tradingTabsCount === 1 ? '' : 's'}) have been automatically reloaded.`
      );
      logTerm(
        `Update to v${targetVer} complete (${total} files synced). Reloaded ${tradingTabsCount} trading tab(s) cleanly without closing Update Center.`,
        'ok'
      );
    } catch (err) {
      statusEyebrow.textContent = 'INTERRUPTED';
      statusHeading.textContent = 'Deployment paused';
      showError(err.message || String(err));
      btnRunUpdate.disabled = false;
    } finally {
      isUpdating = false;
    }
  }

  // -------------------------------------------------------------
  // Event Listeners & Initialization
  // -------------------------------------------------------------
  pickFolderBtn.addEventListener('click', async () => {
    try {
      showError(null);
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (handle) {
        savedDirHandle = handle;
        await saveFolderHandle(handle);
        renderFolderStepUI();
        logTerm(`Linked local workspace folder: ${handle.name}`, 'ok');
        await syncLocalJsonDatabase(handle);
      }
    } catch (e) {}
  });

  btnForgetFolder.addEventListener('click', async () => {
    savedDirHandle = null;
    await clearSavedFolderHandle();
    renderFolderStepUI();
    logTerm('Unlinked local workspace folder.', 'info');
  });

  btnCheckNow.addEventListener('click', () => {
    showSuccess(null);
    checkGitHubRelease(true);
  });

  btnRunUpdate.addEventListener('click', () => {
    showSuccess(null);
    runSelfUpdate();
  });

  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => {
      syncTerminal.innerHTML = '';
    });
  }

  toggleAutoCheck.addEventListener('change', async () => {
    const enabled = toggleAutoCheck.checked;
    if (heartbeatStateText) {
      heartbeatStateText.textContent = enabled ? 'Active · 30m Interval' : 'Paused · Manual Only';
    }
    const data = await chrome.storage.local.get(['settings']).catch(() => ({}));
    const nextSettings = { ...(data.settings || {}), autoCheckUpdates: enabled };
    await chrome.storage.local.set({ settings: nextSettings });
    chrome.runtime.sendMessage({ action: 'syncUpdateAlarm', enabled });
    logTerm(`Background heartbeat ${enabled ? 'enabled (30m)' : 'paused'}.`, 'info');
  });

  async function init() {
    const data = await chrome.storage.local.get(['settings', 'installedVersionOverride', 'updaterState']).catch(() => ({}));
    if (data.installedVersionOverride && compareVersions(data.installedVersionOverride, installedVersion) > 0) {
      installedVersion = data.installedVersionOverride;
    }
    if (data.updaterState && data.updaterState.lastCheckedAt) {
      updateLastCheckedUI(data.updaterState.lastCheckedAt);
    }

    vboxInstalled.textContent = `v${installedVersion}`;
    repoSlugDisplay.textContent = DEFAULT_REPO;
    allReleasesLink.href = `https://github.com/${DEFAULT_REPO}/releases`;

    logTerm(`Trading Cortex Update Center initialized (Local v${installedVersion})`);

    if (data.settings && data.settings.autoCheckUpdates === false) {
      toggleAutoCheck.checked = false;
      if (heartbeatStateText) heartbeatStateText.textContent = 'Paused · Manual Only';
    }

    savedDirHandle = await loadSavedFolderHandle();
    renderFolderStepUI();
    if (savedDirHandle) {
      logTerm(`Restored directory link from IndexedDB: ${savedDirHandle.name}`, 'ok');
      await syncLocalJsonDatabase(savedDirHandle);
    }

    await checkGitHubRelease();
  }

  try {
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.updaterState && changes.updaterState.newValue?.lastCheckedAt) {
          updateLastCheckedUI(changes.updaterState.newValue.lastCheckedAt);
        }
      });
    }
  } catch (e) {}

  // When the user closes the Update Center tab after an update, let the service worker silently refresh the manifest runtime
  window.addEventListener('pagehide', () => {
    try {
      chrome.runtime.sendMessage({ action: 'updaterPageClosed' });
    } catch (e) {}
  });

  init();
})();
