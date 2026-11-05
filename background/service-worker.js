// Background Service Worker for Vest Markets Chart Templates

const DEFAULT_TEMPLATES = [];

const LEGACY_PRESET_IDS = new Set([
  "bullish_ob",
  "bearish_ob",
  "fvg",
  "fvg_imbalance",
  "liquidity",
  "liquidity_sweep",
  "breaker_block",
  "consolidation",
  "range_consolidation",
  "volume_imbalance"
]);

const DEFAULT_SETTINGS = {
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

// -------------------------------------------------------------
// Schema-Versioned Local File System JSON Database & Migrations
// File path inside linked extension folder: user-data/cortex-db.json
// -------------------------------------------------------------
const CURRENT_DB_SCHEMA_VERSION = 3;
const IDB_NAME = "vest_studio_updater_db";
const IDB_STORE = "handles";
const IDB_KEY = "extension_dir_handle";
const DB_FOLDER_NAME = "user-data";
const DB_FILE_NAME = "cortex-db.json";

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

async function getSavedFolderHandle() {
  try {
    const db = await openUpdaterDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Strips legacy hardcoded presets, assigns drawingType, and deduplicates user templates
 */
function sanitizeUserTemplates(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seenKeys = new Set();
  const cleaned = [];
  for (const t of rawList) {
    if (!t || typeof t !== "object") continue;
    if (t.id && LEGACY_PRESET_IDS.has(String(t.id))) continue;
    const drawingType = t.drawingType || "rectangle";
    const nameKey = `${drawingType}::${String(t.name || "").trim().toLowerCase()}`;
    if (seenKeys.has(nameKey)) continue;
    seenKeys.add(nameKey);
    cleaned.push({
      drawingType,
      extendRight: Boolean(t.extendRight),
      extendLeft: Boolean(t.extendLeft),
      showMiddleLine: Boolean(t.showMiddleLine),
      middleLineColor: t.middleLineColor || t.color || "#22c55e",
      middleLineWidth: Number(t.middleLineWidth) || 1,
      middleLineStyle: t.middleLineStyle !== undefined ? Number(t.middleLineStyle) : 2,
      horzLabelsAlign: t.horzLabelsAlign || "right",
      vertLabelsAlign: t.vertLabelsAlign || "middle",
      ...t
    });
  }
  return cleaned;
}

/**
 * Normalizes and migrates any database object from older schema versions up to CURRENT_DB_SCHEMA_VERSION
 */
function runDatabaseMigrations(rawDb) {
  const db = rawDb && typeof rawDb === "object" ? { ...rawDb } : {};
  const fromVersion = Number(db.schemaVersion) || 0;
  const history = Array.isArray(db.migrations) ? [...db.migrations] : [];
  db.globalDrawings = Array.isArray(db.globalDrawings) ? db.globalDrawings : [];

  // Migration v0 -> v1
  if (fromVersion < 1) {
    db.templates = Array.isArray(db.templates) ? db.templates : [];
    db.settings = {
      ...DEFAULT_SETTINGS,
      ...(db.settings || {}),
      showFloatingBar: false,
      sidebarState: {
        ...DEFAULT_SETTINGS.sidebarState,
        ...((db.settings && db.settings.sidebarState) || {}),
        groupTools: {
          ...((db.settings && db.settings.sidebarState && db.settings.sidebarState.groupTools) || {})
        }
      }
    };
    history.push({
      version: 1,
      migratedAt: new Date().toISOString(),
      description: "Initial v1 schema normalization"
    });
  }

  // Migration v1 -> v2: Clear out hardcoded default templates, deduplicate user templates, add drawingType, disable autoApplyToNew
  if (fromVersion < 2) {
    db.templates = sanitizeUserTemplates(db.templates);
    db.settings = {
      ...DEFAULT_SETTINGS,
      ...(db.settings || {}),
      autoApplyToNew: false
    };
    if (db.settings.activeTemplateId && LEGACY_PRESET_IDS.has(String(db.settings.activeTemplateId))) {
      db.settings.activeTemplateId = db.templates[0]?.id || null;
    }
    if (db.settings.defaultTemplateId && LEGACY_PRESET_IDS.has(String(db.settings.defaultTemplateId))) {
      db.settings.defaultTemplateId = db.templates[0]?.id || null;
    }
    history.push({
      version: 2,
      migratedAt: new Date().toISOString(),
      description: "Removed hardcoded default templates, added multi-drawing-type template support, and disabled autoApplyToNew"
    });
  } else {
    db.templates = sanitizeUserTemplates(db.templates);
  }

  if (fromVersion < 3) {
    db.globalDrawings = Array.isArray(db.globalDrawings) ? db.globalDrawings : [];
    history.push({
      version: 3,
      migratedAt: new Date().toISOString(),
      description: "Added persistent globally synced chart drawings"
    });
  }

  db.schemaVersion = CURRENT_DB_SCHEMA_VERSION;
  db.migrations = history;
  db.updatedAt = db.updatedAt || Date.now();
  return db;
}

async function readLocalDiskDatabase(dirHandleOverride = null) {
  try {
    const dirHandle = dirHandleOverride || (await getSavedFolderHandle());
    if (!dirHandle) return null;

    if (typeof dirHandle.queryPermission === "function") {
      const perm = await dirHandle.queryPermission({ mode: "read" });
      if (perm !== "granted") return null;
    }

    const userDataDir = await dirHandle.getDirectoryHandle(DB_FOLDER_NAME, { create: false });
    const fileHandle = await userDataDir.getFileHandle(DB_FILE_NAME, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    if (!text || !text.trim()) return null;

    const parsed = JSON.parse(text);
    return runDatabaseMigrations(parsed);
  } catch (e) {
    return null;
  }
}

let diskWriteTimer = null;
async function writeLocalDiskDatabase(templates, settings, globalDrawings = null, dirHandleOverride = null) {
  try {
    const dirHandle = dirHandleOverride || (await getSavedFolderHandle());
    if (!dirHandle) return false;

    if (typeof dirHandle.queryPermission === "function") {
      const perm = await dirHandle.queryPermission({ mode: "readwrite" });
      if (perm !== "granted") return false;
    }

    const existingDiskDb = await readLocalDiskDatabase(dirHandle);
    const dbPayload = runDatabaseMigrations({
      schemaVersion: CURRENT_DB_SCHEMA_VERSION,
      updatedAt: Date.now(),
      extensionVersion: chrome.runtime.getManifest().version || "1.1.0",
      migrations: existingDiskDb ? existingDiskDb.migrations : [],
      templates: Array.isArray(templates) ? templates : (existingDiskDb?.templates || DEFAULT_TEMPLATES),
      settings: settings || existingDiskDb?.settings || DEFAULT_SETTINGS,
      globalDrawings: Array.isArray(globalDrawings) ? globalDrawings : (existingDiskDb?.globalDrawings || [])
    });

    const userDataDir = await dirHandle.getDirectoryHandle(DB_FOLDER_NAME, { create: true });
    const fileHandle = await userDataDir.getFileHandle(DB_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(dbPayload, null, 2));
    await writable.close();
    return true;
  } catch (e) {
    return false;
  }
}

// Automatically sync any template or settings changes in chrome.storage.local to user-data/cortex-db.json
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.updateChannel) {
    checkGitHubForUpdatesInBackground();
  }
  if (!changes.templates && !changes.settings && !changes.globalDrawings) return;

  if (diskWriteTimer) clearTimeout(diskWriteTimer);
  diskWriteTimer = setTimeout(async () => {
    diskWriteTimer = null;
    try {
      const data = await chrome.storage.local.get(["templates", "settings", "globalDrawings"]).catch(() => ({}));
      if (data.templates !== undefined || data.settings !== undefined || data.globalDrawings !== undefined) {
        await writeLocalDiskDatabase(data.templates, data.settings, data.globalDrawings);
      }
    } catch (e) {}
  }, 600);
});

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const localData = await chrome.storage.local.get(["templates", "settings", "globalDrawings", "dbSchemaVersion"]).catch(() => ({}));
    const syncData = await chrome.storage.sync.get(["templates", "settings"]).catch(() => ({}));
    const diskDb = await readLocalDiskDatabase();

    // Priority: 1. Disk Database (if newer or if local storage was wiped), 2. chrome.storage.local, 3. chrome.storage.sync
    const existingTemplates =
      (Array.isArray(localData.templates) && localData.templates) ||
      (diskDb && Array.isArray(diskDb.templates) && diskDb.templates) ||
      (Array.isArray(syncData.templates) && syncData.templates) ||
      [];

    const existingSettings =
      localData.settings ||
      (diskDb && diskDb.settings) ||
      syncData.settings ||
      null;

    const migrated = runDatabaseMigrations({
      schemaVersion: Math.min(Number(localData.dbSchemaVersion) || 0, diskDb ? Number(diskDb.schemaVersion) || 0 : 0),
      migrations: diskDb ? diskDb.migrations : [],
      templates: existingTemplates,
      settings: existingSettings || DEFAULT_SETTINGS
    });

    const finalTemplates = migrated.templates;
    const finalSettings = migrated.settings;
    const finalGlobalDrawings = Array.isArray(localData.globalDrawings)
      ? localData.globalDrawings
      : ((diskDb && Array.isArray(diskDb.globalDrawings)) ? diskDb.globalDrawings : []);

    // Always store in chrome.storage.local (unlimited write quota)
    await chrome.storage.local.set({
      templates: finalTemplates,
      settings: finalSettings,
      globalDrawings: finalGlobalDrawings,
      dbSchemaVersion: migrated.schemaVersion
    }).catch(() => {});

    // Persist migrated state back to disk if folder is linked
    await writeLocalDiskDatabase(finalTemplates, finalSettings, finalGlobalDrawings);

    // Sync cleaned templates & settings to chrome.storage.sync
    await chrome.storage.sync.set({
      templates: finalTemplates,
      settings: finalSettings
    }).catch(() => {});

    // Setup 30-minute background update check alarm
    if (finalSettings.autoCheckUpdates !== false) {
      chrome.alarms.create("vest_studio_update_check", { periodInMinutes: 30 });
      checkGitHubForUpdatesInBackground();
    }
  } catch (err) {
    // Ignore sync quota errors during rapid extension reloads
  }
});

const GITHUB_REPO = "childersc/trading-cortex";

function cleanSemver(v) {
  return String(v || "").trim().replace(/^v/i, "");
}

function getUpcomingDevVersion(baseVer) {
  const raw = String(baseVer || "1.1.44").trim();
  if (/alpha/i.test(raw)) {
    return raw.startsWith("v") ? raw : `v${raw}`;
  }
  const clean = raw.replace(/^v/i, "");
  const parts = clean.split(".").map(n => parseInt(n, 10) || 0);
  const major = parts[0] || 1;
  const minor = parts[1] || 1;
  const patch = (parts[2] || 0) + 1;
  return `v${major}.${minor}.${patch} Alpha`;
}

function compareSemver(a, b) {
  const pa = cleanSemver(a).split(".").map(n => parseInt(n, 10) || 0);
  const pb = cleanSemver(b).split(".").map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function checkGitHubForUpdatesInBackground() {
  try {
    const stored = await chrome.storage.local.get(["installedVersionOverride", "updateChannel", "installedDevSha", "settings"]).catch(() => ({}));
    const m = chrome.runtime.getManifest();
    const manifestVer = m.version_name || m.version || "1.1.44";
    const isDevBuild = Boolean(/alpha/i.test(manifestVer) || /alpha/i.test(m.version_name || "") || stored.installedDevSha);
    
    // Channel preference resolution: explicit storage -> settings -> build type
    let updateChannel = stored.updateChannel || (stored.settings && stored.settings.updateChannel);
    if (!updateChannel) {
      updateChannel = isDevBuild ? "dev" : "stable";
    }

    let installedVer = m.version || "1.1.0";
    if (
      stored &&
      stored.installedVersionOverride &&
      compareSemver(stored.installedVersionOverride, installedVer) > 0
    ) {
      installedVer = stored.installedVersionOverride;
    }

    if (updateChannel === "dev") {
      const devResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits?sha=dev&per_page=1`, {
        headers: { "Accept": "application/vnd.github+json" },
        cache: "no-store"
      });
      if (devResp.ok) {
        const commits = await devResp.json();
        if (Array.isArray(commits) && commits.length > 0) {
          const topCommit = commits[0];
          const shortSha = topCommit.sha.slice(0, 7);
          const topSha = topCommit.sha.toLowerCase();
          const localSha = String(stored.installedDevSha || "").toLowerCase().trim();
          const hasUpdate = Boolean(!localSha || (localSha !== shortSha.toLowerCase() && localSha !== topSha));
          const upcomingDevVer = getUpcomingDevVersion(installedVer || manifestVer);
          const updaterState = {
            channel: "dev",
            lastCheckedAt: Date.now(),
            latestVersion: upcomingDevVer,
            latestSha: shortSha,
            commitMessage: (topCommit.commit?.message || "").split("\n")[0],
            updateAvailable: hasUpdate,
            htmlUrl: `https://github.com/${GITHUB_REPO}/commits/dev`
          };
          await chrome.storage.local.set({ updaterState, updateChannel: "dev" }).catch(() => {});
          if (hasUpdate) {
            await chrome.action.setBadgeText({ text: "DEV" }).catch(() => {});
            await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }).catch(() => {});
            await chrome.action.setTitle({ title: `Trading Cortex · Dev Build Ready (${upcomingDevVer} - ${shortSha})` }).catch(() => {});
          } else {
            await chrome.action.setBadgeText({ text: "" }).catch(() => {});
            await chrome.action.setTitle({ title: `Trading Cortex ${upcomingDevVer} (dev channel · synchronized)` }).catch(() => {});
          }
          return updaterState;
        }
      }
      return null;
    }

    // Stable channel check
    let release = null;
    const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { "Accept": "application/vnd.github+json" },
      cache: "no-store"
    });
    if (resp.ok) {
      release = await resp.json();
    } else if (resp.status === 404) {
      const tagsResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/tags?per_page=5`, {
        headers: { "Accept": "application/vnd.github+json" },
        cache: "no-store"
      });
      if (tagsResp.ok) {
        const tags = await tagsResp.json();
        if (Array.isArray(tags) && tags.length > 0) {
          release = {
            tag_name: tags[0].name,
            name: tags[0].name,
            html_url: `https://github.com/${GITHUB_REPO}/releases/tag/${tags[0].name}`
          };
        }
      }
    }
    if (!release) return null;

    const latestVer = cleanSemver(release.tag_name || release.name || installedVer);
    const hasUpdate = compareSemver(latestVer, installedVer) > 0;

    const updaterState = {
      channel: "stable",
      lastCheckedAt: Date.now(),
      latestVersion: latestVer,
      updateAvailable: hasUpdate,
      htmlUrl: release.html_url
    };

    await chrome.storage.local.set({ updaterState, updateChannel: "stable" }).catch(() => {});

    if (hasUpdate) {
      await chrome.action.setBadgeText({ text: "NEW" }).catch(() => {});
      await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" }).catch(() => {});
      await chrome.action.setTitle({ title: `Trading Cortex · Update Available (v${latestVer})` }).catch(() => {});
    } else {
      await chrome.action.setBadgeText({ text: "" }).catch(() => {});
      await chrome.action.setTitle({ title: `Trading Cortex v${installedVer}` }).catch(() => {});
    }

    return updaterState;
  } catch (e) {
    return null;
  }
}

// -------------------------------------------------------------
// Economic Calendar / ForexFactory Live News Feed Fetcher
// -------------------------------------------------------------
const ECON_CALENDAR_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json"
];
const ECON_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function fetchEconomicCalendarFeed(forceRefresh = false) {
  try {
    const cached = await chrome.storage.local.get(["econCalendarCache"]).catch(() => ({}));
    const cacheObj = cached && cached.econCalendarCache;
    if (
      !forceRefresh &&
      cacheObj &&
      Array.isArray(cacheObj.events) &&
      cacheObj.events.length > 0 &&
      Date.now() - (Number(cacheObj.fetchedAt) || 0) < ECON_CACHE_TTL_MS
    ) {
      return cacheObj;
    }

    for (const url of ECON_CALENDAR_URLS) {
      try {
        const resp = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            const payload = {
              fetchedAt: Date.now(),
              source: "ForexFactory",
              events: data
            };
            await chrome.storage.local.set({ econCalendarCache: payload }).catch(() => {});
            return payload;
          }
        }
      } catch (innerErr) {}
    }

    if (cacheObj && Array.isArray(cacheObj.events)) {
      return cacheObj;
    }
  } catch (e) {}
  return { fetchedAt: Date.now(), source: "fallback", events: [] };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === "vest_studio_update_check") {
    checkGitHubForUpdatesInBackground();
  }
  if (alarm && alarm.name === "vest_studio_news_refresh") {
    fetchEconomicCalendarFeed(true);
  }
});

// Listen for messages from popup, updater page, or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;

  if (request.action === "getCurrentTabInfo" || request.action === "getTabId") {
    const tabId = (sender && sender.tab && sender.tab.id !== undefined) ? sender.tab.id : null;
    const windowId = (sender && sender.tab && sender.tab.windowId !== undefined) ? sender.tab.windowId : null;
    const tabIndex = (sender && sender.tab && sender.tab.index !== undefined) ? sender.tab.index : null;
    const frameId = sender ? sender.frameId : 0;

    if (tabId !== null) {
      sendResponse({ ok: true, tabId, windowId, tabIndex, frameId });
    } else if (chrome.tabs && typeof chrome.tabs.query === "function") {
      chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        const t = tabs && tabs[0];
        sendResponse({
          ok: true,
          tabId: t ? t.id : null,
          windowId: t ? t.windowId : null,
          tabIndex: t ? t.index : null,
          frameId
        });
      }).catch(() => {
        sendResponse({ ok: false, tabId: null, windowId: null, tabIndex: null, frameId });
      });
      return true;
    } else {
      sendResponse({ ok: false, tabId: null, windowId: null, tabIndex: null, frameId });
    }
    return true;
  }

  if (request.action === "getTemplatesAndSettings") {
    chrome.storage.local.get(["templates", "settings", "globalDrawings"]).then(async (data) => {
      if (data && data.templates && data.templates.length > 0 && data.settings) {
        sendResponse({
          templates: data.templates,
          settings: data.settings,
          globalDrawings: Array.isArray(data.globalDrawings) ? data.globalDrawings : []
        });
      } else {
        const diskDb = await readLocalDiskDatabase();
        sendResponse({
          templates: (diskDb && diskDb.templates) || data.templates || DEFAULT_TEMPLATES,
          settings: (diskDb && diskDb.settings) || data.settings || DEFAULT_SETTINGS,
          globalDrawings: Array.isArray(data.globalDrawings) ? data.globalDrawings : ((diskDb && diskDb.globalDrawings) || [])
        });
      }
    }).catch(() => {
      sendResponse({
        templates: DEFAULT_TEMPLATES,
        settings: DEFAULT_SETTINGS
      });
    });
    return true;
  }

  if (request.action === "syncDiskDatabaseNow") {
    chrome.storage.local.get(["templates", "settings", "globalDrawings"]).then(async (data) => {
      const diskDb = await readLocalDiskDatabase();
      // If disk has custom templates and chrome.storage only has defaults or is empty, hydrate from disk
      const templatesToUse =
        (Array.isArray(data.templates) && data.templates.length > 0 ? data.templates : null) ||
        (diskDb && Array.isArray(diskDb.templates) && diskDb.templates.length > 0 ? diskDb.templates : DEFAULT_TEMPLATES);
      const settingsToUse = data.settings || (diskDb && diskDb.settings) || DEFAULT_SETTINGS;

      const globalDrawingsToUse = Array.isArray(data.globalDrawings)
        ? data.globalDrawings
        : ((diskDb && Array.isArray(diskDb.globalDrawings)) ? diskDb.globalDrawings : []);
      const wrote = await writeLocalDiskDatabase(templatesToUse, settingsToUse, globalDrawingsToUse);
      sendResponse({ ok: wrote, schemaVersion: CURRENT_DB_SCHEMA_VERSION });
    }).catch(() => {
      sendResponse({ ok: false });
    });
    return true;
  }

  if (request.action === "syncUpdateAlarm") {
    if (request.enabled) {
      chrome.alarms.create("vest_studio_update_check", { periodInMinutes: 30 });
    } else {
      chrome.alarms.clear("vest_studio_update_check");
    }
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === "checkForUpdatesNow") {
    checkGitHubForUpdatesInBackground().then((state) => {
      sendResponse({ updaterState: state });
    });
    return true;
  }

  if (request.action === "openUpdaterPage") {
    const updaterUrl = chrome.runtime.getURL("update/update.html");
    chrome.tabs.create({ url: updaterUrl });
    sendResponse({ ok: true });
    return true;
  }

    if (request.action === "fetchEconomicCalendar") {
    fetchEconomicCalendarFeed(Boolean(request.forceRefresh)).then((feed) => {
      sendResponse({ ok: true, feed });
    }).catch(() => {
      sendResponse({ ok: false, feed: { fetchedAt: Date.now(), events: [] } });
    });
    return true;
  }

  if (request.action === "updaterPageClosed") {
    chrome.storage.local.get(["reloadRuntimeOnUpdaterClose"]).then(async (data) => {
      if (data && data.reloadRuntimeOnUpdaterClose) {
        await chrome.storage.local.remove("reloadRuntimeOnUpdaterClose").catch(() => {});
        chrome.runtime.reload();
      }
    }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
});


