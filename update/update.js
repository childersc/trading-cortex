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
  let latestDevCommit = null;
  let devCommitsList = [];
  let installedDevSha = null;
  let currentChannel = 'stable'; // 'stable' | 'dev'
  let isUpdating = false;

  // DOM References
  const allReleasesLink = document.getElementById('all-releases-link');
  const releaseGithubLink = document.getElementById('release-github-link');
  const btnChannelStable = document.getElementById('btn-channel-stable');
  const btnChannelDev = document.getElementById('btn-channel-dev');
  const notesCardTitle = document.getElementById('notes-card-title');
  const wcardChannelDot = document.getElementById('wcard-channel-dot');
  const channelTileLabel = document.getElementById('channel-tile-label');

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

  function getUpcomingDevVersion(baseVer = installedVersion) {
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
    '**Dev Branch Update Channel (`v1.1.44`)**: Switch between Stable and Dev (Bleeding Edge) channels in the Update Center. Dev mode polls branch commits, previews recent commit history, and unpacks the latest dev zipball directly into your workspace.',
    '**Header-Docked Cortex Toolbar (`v1.1.44`)**: Moved the Trading Cortex toolbar to sit directly below Vest\'s main navigation header and above the market ticker row and chart/order box. Minimized pills dock into this top bar and vertical chart space is preserved.',
    '**Updater Folder Access Diagnostics (`v1.1.44`)**: Show folder-picker and deployment errors in the Update Center, terminal, and browser console. Provide guidance when Chrome blocks access to a protected directory.',
    '**Chart Paper Stats Overlay (`v1.1.43`)**: Display the active instrument’s saved paper entry, TP1/TP2/TP3, and stop-first counters in a compact chart overlay. Refresh on paper bar completion and instrument change.',
    '**Irish Browser Voice (`v1.1.42`)**: Add an Irish English preset when the browser supplies an `en-IE` voice, with a slightly higher pitch and the existing test button. Browser voices do not expose gender.',
    '**Cortex Voice Alerts (`v1.1.41`)**: Add an Alerts & Voice Settings pane below About with independent once-per-bar forming and confirmed signal voice alerts, browser voice selection, and a test button.',
    '**Open Orders Tab Detection (`v1.1.40`)**: Match Vest’s visible Open Orders account tab by its full rendered label, including optional order count, and distinguish a missing tab from a tab that did not activate.',
    '**Open Orders Panel Discovery (`v1.1.39`)**: Locate Vest’s Open Orders tab and table from their shared account panel, and handle common selected-tab attributes so the live-order guard can read the empty state or visible rows.',
    '**Vest Open Orders Panel Detection (`v1.1.38`)**: Read the actual Open Orders table and its explicit empty state when Vest omits a numeric count badge. Restore the prior tab after preflight, then verify target orders from the visible order count or rows.',
    '**Ticket Buy/Sell Entry (`v1.1.37`)**: Move the confirmed live market entry controls into Vest’s order ticket with Buy and Sell options. Fix parsing of Vest’s multiline Open Orders count; each action stages a configured stop and three reduce-only limit targets after the position appears.',
    '**Manual Chart Buy with Target Orders (`v1.1.36`)**: Add a confirmed live market long using the current Vest size, configured stop, and three reduce-only target limits staged after the position is visible. This manual flow is separate from signal automation and can submit real orders.',
    '**Cortex Indicator Paper Signal Automation (`v1.1.34`)**: Simulate confirmed closed-bar entries, three 25% target exits, staged stop movement, and opposing-signal reversal after the five-bar ignore window. Paper mode sends no orders; Live remains fail-closed until the full Vest order workflow is verified.',
    '**Simplified Cortex Indicator Display (`v1.1.33`)**: Removed the shaded trend cloud and its settings. The EMA centerline, stepped trend stop, signals, projected levels, and trend table remain.',
    '**Cortex Indicator Level Guide Endpoints (`v1.1.32`)**: Extend dotted Entry, Stop, and Target guides leftward from their chart labels, ending at the first later candle whose range reaches the level. Untouched levels remain anchored at the signal candle.',
    '**Cortex Indicator Risk and Label Controls (`v1.1.31`)**: Configure fixed-point or ATR-based levels; defaults are an 8-point stop and 4-point spacing between targets. Adjust stop distance, target spacing, label font size, and label box size independently.',
    '**Cortex Indicator Prototype (`v1.1.30`)**: Added a separate settings tab and a configurable EMA/ATR trend cloud, trailing stop, trend-flip markers, projected entry/stop/targets, and multi-timeframe trend table. This is an approximation based on the screenshot; the original formula is unknown, and plotted levels do not place orders.',
    '**Session High/Low Extension Modes (`v1.1.29`)**: In Session Indicators settings, extend uncleared High/Low levels to the chart edge until swept or closed through, or keep all levels extended even after they are cleared. Active-session levels can now extend as well.',
    '**Sync Globally Menu and Focused Drawing Sync (`v1.1.28`)**: Fix the context-menu action so it activates before TradingView tears down the popup and closes the menu afterward. Only the focused tab publishes global drawing changes; matching background tabs follow without echoing them.',
    '**Focused-Tab Viewport Sync (`v1.1.27`)**: Make the focused tab the sole publisher of chart position and zoom changes. Matching background tabs follow updates without echoing their own viewport back.',
    '**Per-Instrument, Per-Timeframe Chart Viewport Memory (`v1.1.26`)**: Save chart position and zoom by instrument plus active interval, restore only that matching view, and propagate viewport changes to other open Cortex tabs on the same instrument and interval.',
    '**Live Global Drawing Sync Across Open Tabs (`v1.1.25`)**: Keep the persisted-drawing duplicate guard during initial chart loading, then allow active tabs to create the synced drawing immediately instead of waiting for a refresh.',
    '**Preserve Drawings When Syncing Globally (`v1.1.24`)**: Fix a storage-update race that removed a chart drawing immediately after it was synced. Missing sync records now unmap drawings without deleting them.',
    '**Drawing Restore and Deletion Reliability (`v1.1.23`)**: Remove intentionally deleted drawings from persistent memory, suppress deleted auto-FVGs, and check Vest’s saved chart drawings before restoring to prevent overlapping copies.',
    '**Correct Favorite Timeframe Anchor (`v1.1.22`)**: Target TradingView’s top-toolbar interval wrapper by its actual `id`, avoiding the separate chart-title interval control.',
    '**Favorite Timeframe Strip Outside Clipped Group (`v1.1.21`)**: Move the shortcuts into the full-width toolbar row immediately after the interval selector group, outside its overflow clipping container.',
    '**Visible Favorite Timeframe Shortcuts (`v1.1.20`)**: Place starred interval buttons outside the chart selector’s clipped toolbar group so they are visible beside the current timeframe.',
    '**Timeframe Favorite Toolbar Placement (`v1.1.19`)**: Anchor favorite shortcuts directly beside the visible current interval button so they remain in the chart’s top toolbar.',
    '**Favorite Timeframes Beside Interval Selector (`v1.1.18`)**: Keep starred timeframe shortcuts beside the current interval, with a fallback for chart layouts that omit TradingView’s interval-group marker.',
    '**Session Close-Through Detection (`v1.1.17`)**: Scan every post-session candle so an early sweep cannot prevent detection of the later close-through that stops the line and removes its label.',
    '**Session Labels Follow Stopped Lines (`v1.1.16`)**: Remove right-side session labels and price badges when the corresponding High/Low line has stopped at a completed close-through or a sweep bar.',
    '**Sync Globally Menu Dismissal (`v1.1.15`)**: Close the drawing context menu immediately after selecting Sync globally.',
    '**Stopped Session Line Labels (`v1.1.14`)**: Hide the right-side session High/Low text labels and price badges when those lines stop at a completed candle close through the level.',
    '**Session H/L Line Extension (`v1.1.13`)**: Added a Session Indicators toggle to extend recent High/Low lines to the chart edge or stop them at the first completed candle close through the level.',
    '**Full-Screen News and Trades Boxes (`v1.1.12`)**: The Upcoming News and Instrument Trades boxes can now be dragged anywhere in the screen area above the Cortex bar. Minimizing either box docks its pill into the black Cortex bar.',
    '**Bottom Bar Content Clearance (`v1.1.11`)**: Reserves 50px for the fixed bottom Cortex bar, constrains the full-height trading app to the remaining viewport, and enables page scrolling so bottom content stays accessible.',
    '**Bottom Cortex Bar and Blue Glow (`v1.1.10`)**: Moved the 50px Cortex bar to the bottom edge of the viewport, restored a stronger blue glow along its top edge, and positioned the dropdown menu above the bar when needed.',
    '**Top Bar Sizing and Layering (`v1.1.9`)**: Reduced the Cortex top bar and reserved page space from 100px to 50px. Lowered its stacking layer so higher-level overlays from other extensions are not covered.',
    '**Cortex Top Bar (`v1.1.8`)**: Moved the existing Trading Cortex dropdown into a new 100px black bar at the very top of the site, with the page content flowing below it and a blue glow along the bar’s lower edge.',
    '**New "Template Manager..." Dialog (`v1.1.7`)**: Added a TradingView-style glassmorphic **Template Manager** directly inside the `CORTEX` dropdown menu (and right-click `Template > Template Manager...`) with left-sidebar filtering by drawing type, live count badges, inline editor, **"Pull from Selected Chart Drawing"**, 1-click Apply, Duplicate, and Delete.',
    '**Per-Drawing-Type Right-Click Detection & Full Settings Storage (`v1.1.7`)**: Automatically detects the exact TradingView drawing tool when right-clicking any shape on the chart (`Rectangle`, `Horizontal Line`, `Horizontal Ray`, `Trend Line`, `Ray`, `Parallel Channel`, `Fib Retracement`, `Long/Short Position`, `Callout`, `Text`, etc.), filters the `Template >` submenu to that tool type, and stores both normalized styles and raw TradingView shape properties (`rawProperties`).',
    '**Fixed Template Saving Overwriting Existing Drawings (`v1.1.7`)**: Fixed the bug where saving a new template (e.g. `5m FVG`) could overwrite another drawing (`3m FVG`) on the chart by removing `linetoolrectangle.text` from global overrides, disabling forced `lastRectangleId` fallbacks, and locking context-menu template actions strictly to the right-clicked shape ID.',
    '**Removed Hardcoded Default Templates & Schema v2 Migration (`v1.1.7`)**: Cleared all built-in preset templates and added an automatic Schema v2 migration that removes legacy preset IDs and deduplicates user templates across `chrome.storage`, the Domain Vault, and `user-data/cortex-db.json`.',
    '**In-Memory Drawing Toolbox Persistence (`v1.1.6`)**: Pre-hydrates TradingView\'s internal `toolbarStorage` across `window.top.localStorage` and `blob:` chart iframes at `document_start` and updates all 7 left-sidebar tool slots via React Fiber (`__reactFiber$`) in-memory without ever opening DOM dropdown menus.',
    '**Update Center Controls & Zero-Flash In-Place Updates**: Includes **"Check for Update"**, **"Last Checked"** date/time telemetry, and zero-flash in-place extension updates.'
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
  // -------------------------------------------------------------
  // Channel Switching & Dev Branch Logic
  // -------------------------------------------------------------
  function updateChannelUI(channel) {
    currentChannel = channel === 'dev' ? 'dev' : 'stable';
    if (btnChannelStable && btnChannelDev) {
      btnChannelStable.classList.toggle('active', currentChannel === 'stable');
      btnChannelDev.classList.toggle('active', currentChannel === 'dev');
      btnChannelDev.classList.toggle('dev-active', currentChannel === 'dev');
    }
    if (wcardChannelDot) {
      wcardChannelDot.classList.toggle('dev-dot', currentChannel === 'dev');
    }
    if (channelTileLabel) {
      channelTileLabel.textContent = currentChannel === 'dev' ? 'DEV BRANCH CHANNEL' : 'RELEASE CHANNEL';
    }
  }

  async function setChannel(channel, triggerCheck = true) {
    updateChannelUI(channel);
    await chrome.storage.local.set({ updateChannel: currentChannel }).catch(() => {});
    logTerm(`Switched to ${currentChannel === 'dev' ? 'Bleeding Edge (dev branch)' : 'Official Stable Releases'} channel.`, 'info');
    if (triggerCheck) {
      await checkCurrentChannelUpdates(false);
    }
  }

  async function checkDevChannelUpdates(isManualClick = false) {
    showError(null);
    statusEyebrow.textContent = 'POLLING DEV';
    statusHeading.textContent = 'Checking GitHub dev branch commits...';
    if (btnCheckNow) {
      btnCheckNow.classList.add('checking');
      btnCheckNow.disabled = true;
    }
    if (btnCheckNowLabel) {
      btnCheckNowLabel.textContent = 'Checking Dev...';
    }
    logTerm(`Polling https://api.github.com/repos/${DEFAULT_REPO}/commits?sha=dev ...`, 'info');

    try {
      const resp = await fetch(`https://api.github.com/repos/${DEFAULT_REPO}/commits?sha=dev&per_page=12`, {
        headers: { 'Accept': 'application/vnd.github+json' },
        cache: 'no-store'
      });

      if (!resp.ok) {
        throw new Error(`GitHub API HTTP ${resp.status}`);
      }

      const commits = await resp.json();
      if (!Array.isArray(commits) || commits.length === 0) {
        throw new Error('No commits found on dev branch.');
      }

      devCommitsList = commits;
      const topCommit = commits[0];
      latestDevCommit = topCommit;
      const shortSha = topCommit.sha.slice(0, 7);
      const commitMsg = (topCommit.commit?.message || '').split(/\r?\n/)[0].trim();
      const authorName = topCommit.commit?.author?.name || 'Developer';
      const commitDate = topCommit.commit?.committer?.date || topCommit.commit?.author?.date;

      const upcomingDevVer = getUpcomingDevVersion(latestRelease ? latestRelease.tag_name : installedVersion);

      vboxLatest.textContent = upcomingDevVer;
      vboxChanges.textContent = String(commits.length);

      if (notesCardTitle) notesCardTitle.textContent = 'Dev Branch Commits';
      if (notesVersionTitle) notesVersionTitle.textContent = `${upcomingDevVer} (${shortSha})`;
      if (notesZipName) notesZipName.textContent = `zipball/dev (${shortSha})`;
      if (releaseGithubLink) {
        releaseGithubLink.href = `https://github.com/${DEFAULT_REPO}/commits/dev`;
        releaseGithubLink.textContent = 'Dev Commits';
      }
      if (allReleasesLink) {
        allReleasesLink.href = `https://github.com/${DEFAULT_REPO}/tree/dev`;
      }

      if (notesSummary) {
        notesSummary.textContent = `Bleeding-edge commits from the 'dev' branch of ${DEFAULT_REPO}. Features may be in-flight before official release tagging.`;
      }

      if (notesBody) {
        notesBody.innerHTML = `
          <ul class="notes-list">
            ${commits.map(c => {
              const sSha = c.sha.slice(0, 7);
              const firstLine = (c.commit?.message || '').split(/\r?\n/)[0].trim();
              const auth = c.commit?.author?.name || 'dev';
              const dStr = c.commit?.committer?.date ? new Date(c.commit.committer.date).toLocaleDateString() : '';
              const link = c.html_url || `https://github.com/${DEFAULT_REPO}/commit/${c.sha}`;
              return `
                <li>
                  <a href="${link}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                    <span class="commit-sha-badge">${sSha}</span>
                  </a>
                  <strong>${escapeHtml(firstLine)}</strong>
                  <span class="commit-meta">— ${escapeHtml(auth)}${dStr ? `, ${escapeHtml(dStr)}` : ''}</span>
                </li>
              `;
            }).join('')}
          </ul>
        `;
      }

      const checkedAt = Date.now();
      updateLastCheckedUI(checkedAt);

      // Check if current installed build is already this dev commit
      const isUpToDate = Boolean(
        (installedDevSha && (installedDevSha === shortSha || installedDevSha === topCommit.sha)) ||
        (installedVersion && installedVersion.includes(shortSha))
      );

      const upcomingDevVerState = upcomingDevVer;
      await chrome.storage.local.set({
        updaterState: {
          channel: 'dev',
          lastCheckedAt: checkedAt,
          latestVersion: upcomingDevVerState,
          latestSha: shortSha,
          commitMessage: commitMsg,
          updateAvailable: !isUpToDate,
          htmlUrl: `https://github.com/${DEFAULT_REPO}/commits/dev`
        }
      });

      if (!isUpToDate) {
        statusEyebrow.textContent = 'DEV BUILD READY';
        statusHeading.textContent = `New ${upcomingDevVerState} build available (${shortSha})`;
        if (btnRunUpdateLabel) btnRunUpdateLabel.textContent = `Deploy ${upcomingDevVerState} (${shortSha})`;
        btnRunUpdate.disabled = false;
        chrome.action.setBadgeText({ text: 'DEV' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
        logTerm(`Dev build available: ${upcomingDevVerState} (commit ${shortSha}: "${commitMsg}")`, 'ok');
        if (isManualClick) {
          showSuccess(`⚡ ${upcomingDevVerState} (${shortSha}) is ready to deploy from dev branch.`);
        }
      } else {
        statusEyebrow.textContent = 'SYNCHRONIZED';
        statusHeading.textContent = `Trading Cortex is up to date with ${upcomingDevVerState} (${shortSha})`;
        if (btnRunUpdateLabel) btnRunUpdateLabel.textContent = `Re-Sync ${upcomingDevVerState} (${shortSha})`;
        btnRunUpdate.disabled = false;
        chrome.action.setBadgeText({ text: '' });
        logTerm(`Local build matches latest dev branch ${upcomingDevVerState} (${shortSha}).`, 'ok');
        if (isManualClick) {
          showSuccess(`✓ You are on the latest dev commit ${upcomingDevVerState} (${shortSha})!`);
        }
      }
    } catch (err) {
      statusEyebrow.textContent = 'STANDBY';
      statusHeading.textContent = `Installed Build v${installedVersion}`;
      showError(`GitHub dev channel check (${DEFAULT_REPO}): ${err.message}`);
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

  async function checkCurrentChannelUpdates(isManualClick = false) {
    if (currentChannel === 'dev') {
      return await checkDevChannelUpdates(isManualClick);
    } else {
      if (notesCardTitle) notesCardTitle.textContent = 'Release Notes';
      return await checkGitHubRelease(isManualClick);
    }
  }

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
          channel: 'stable',
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
  const CURRENT_DB_SCHEMA_VERSION = 2;
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

  function sanitizeTemplatesList(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    for (const t of list) {
      if (!t || typeof t !== 'object') continue;
      if (t.id && LEGACY_PRESET_IDS.has(String(t.id))) continue;
      const dt = t.drawingType || 'rectangle';
      const key = `${dt}::${String(t.name || '').trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ drawingType: dt, ...t });
    }
    return out;
  }

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
      let finalTemplates = Array.isArray(storageData.templates) ? sanitizeTemplatesList(storageData.templates) : null;
      let finalSettings = storageData.settings;
      let restoredFromDisk = false;

      if (existingDiskDb && Array.isArray(existingDiskDb.templates)) {
        const diskTemplates = sanitizeTemplatesList(existingDiskDb.templates);
        const isStorageDefaultOrEmpty =
          !Array.isArray(finalTemplates) ||
          (finalTemplates.length === 0 && diskTemplates.length > 0 && (!finalSettings?._savedAt && existingDiskDb.updatedAt));

        if (isStorageDefaultOrEmpty) {
          finalTemplates = diskTemplates;
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
          templates: finalTemplates || [],
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
        templates: finalTemplates || sanitizeTemplatesList(existingDiskDb?.templates) || [],
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

    if (currentChannel === 'dev') {
      if (!latestDevCommit) {
        await checkDevChannelUpdates();
        if (!latestDevCommit) return;
      }
    } else {
      if (!latestRelease) {
        await checkGitHubRelease();
        if (!latestRelease) return;
      }
    }

    isUpdating = true;
    btnRunUpdate.disabled = true;

    try {
      const isDevDeploy = currentChannel === 'dev';
      const devSha = isDevDeploy && latestDevCommit ? latestDevCommit.sha.slice(0, 7) : null;
      const targetVer = isDevDeploy ? `dev-${devSha}` : cleanVersion(latestRelease?.tag_name || installedVersion);
      const upcomingDevDeployVer = isDevDeploy ? getUpcomingDevVersion(latestRelease ? latestRelease.tag_name : installedVersion) : null;
      statusEyebrow.textContent = 'DEPLOYING';
      statusHeading.textContent = isDevDeploy
        ? `Deploying Trading Cortex ${upcomingDevDeployVer} (dev@${devSha})...`
        : `Deploying Trading Cortex v${targetVer}...`;
      logTerm(isDevDeploy ? `Starting update to dev branch ${upcomingDevDeployVer} (${devSha})...` : `Starting update to v${targetVer}...`, 'info');

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

      let downloadUrl = null;
      let zipAsset = null;
      if (isDevDeploy) {
        downloadUrl = `https://api.github.com/repos/${DEFAULT_REPO}/zipball/dev`;
        logTerm(`Fetching latest dev branch archive from ${downloadUrl} ...`, 'info');
      } else {
        zipAsset = (latestRelease?.assets || []).find(a => a.name && a.name.endsWith('.zip'));
        downloadUrl = zipAsset ? zipAsset.browser_download_url : latestRelease?.zipball_url;
        if (!downloadUrl) {
          throw new Error('No downloadable ZIP archive found on this GitHub release.');
        }
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
      if (isDevDeploy) {
        installedDevSha = devSha;
        installedVersion = `v${manifest.version || '1.1.44'}-dev.${devSha}`;
      } else {
        installedDevSha = null;
        installedVersion = `v${targetVer}`;
      }
      vboxInstalled.textContent = installedVersion.startsWith('v') ? installedVersion : `v${installedVersion}`;

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
        installedVersionOverride: installedVersion,
        installedDevSha: isDevDeploy ? devSha : null,
        updateChannel: currentChannel,
        reloadRuntimeOnUpdaterClose: true,
        updaterState: {
          channel: currentChannel,
          lastCheckedAt: Date.now(),
          latestVersion: targetVer,
          latestSha: devSha,
          updateAvailable: false,
          htmlUrl: isDevDeploy ? `https://github.com/${DEFAULT_REPO}/commits/dev` : latestRelease.html_url
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
      statusHeading.textContent = isDevDeploy
        ? `Trading Cortex successfully updated to ${upcomingDevDeployVer} (${devSha})!`
        : `Trading Cortex successfully updated to v${targetVer}!`;
      progressLabelLeft.textContent = `Update complete · ${isDevDeploy ? upcomingDevDeployVer : `v${targetVer}`} active`;
      if (btnRunUpdateLabel) btnRunUpdateLabel.textContent = isDevDeploy ? `Re-Sync ${upcomingDevDeployVer} (${devSha})` : `Re-Sync v${targetVer}`;
      btnRunUpdate.disabled = false;

      showSuccess(
        isDevDeploy
          ? `✓ Trading Cortex has been updated to bleeding-edge dev branch commit (${devSha})! Your trading browser windows (${tradingTabsCount} tab${tradingTabsCount === 1 ? '' : 's'}) have been automatically reloaded.`
          : `✓ Trading Cortex has been successfully updated to v${targetVer}! Your trading browser windows (${tradingTabsCount} tab${tradingTabsCount === 1 ? '' : 's'}) have been automatically reloaded.`
      );
      logTerm(
        `Update to ${targetVer} complete (${total} files synced). Reloaded ${tradingTabsCount} trading tab(s) cleanly without closing Update Center.`,
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

  if (btnChannelStable) {
    btnChannelStable.addEventListener('click', () => {
      if (currentChannel !== 'stable') {
        setChannel('stable', true);
      }
    });
  }

  if (btnChannelDev) {
    btnChannelDev.addEventListener('click', () => {
      if (currentChannel !== 'dev') {
        setChannel('dev', true);
      }
    });
  }

  btnCheckNow.addEventListener('click', () => {
    showSuccess(null);
    checkCurrentChannelUpdates(true);
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
    const data = await chrome.storage.local.get([
      'settings',
      'installedVersionOverride',
      'installedDevSha',
      'updateChannel',
      'updaterState'
    ]).catch(() => ({}));

    if (data.installedDevSha) {
      installedDevSha = data.installedDevSha;
    }
    if (data.updateChannel === 'dev') {
      currentChannel = 'dev';
    } else {
      currentChannel = 'stable';
    }
    updateChannelUI(currentChannel);

    if (data.installedVersionOverride) {
      installedVersion = data.installedVersionOverride;
    }
    if (data.updaterState && data.updaterState.lastCheckedAt) {
      updateLastCheckedUI(data.updaterState.lastCheckedAt);
    }

    vboxInstalled.textContent = installedVersion.startsWith('v') ? installedVersion : `v${installedVersion}`;
    repoSlugDisplay.textContent = DEFAULT_REPO;
    allReleasesLink.href = `https://github.com/${DEFAULT_REPO}/releases`;

    logTerm(`Trading Cortex Update Center initialized (Local ${installedVersion}, Channel: ${currentChannel.toUpperCase()})`);

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

    await checkCurrentChannelUpdates();
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
