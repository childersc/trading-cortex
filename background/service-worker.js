// Background Service Worker for Vest Markets Chart Templates

const DEFAULT_TEMPLATES = [
  {
    id: "bullish_ob",
    name: "Bullish OB",
    color: "#22c55e",           // Border color (Emerald green)
    backgroundColor: "#22c55e", // Fill color
    opacity: 20,                // 20% opacity (transparency 80 in TradingView)
    linewidth: 1,
    linestyle: 0,               // 0 = solid, 1 = dotted, 2 = dashed
    extendRight: false,
    extendLeft: false,
    showMiddleLine: false,
    middleLineColor: "#22c55e",
    middleLineWidth: 1,
    middleLineStyle: 2,         // 2 = dashed
    showLabel: false,
    text: "Bullish OB",
    textColor: "#22c55e",
    fontSize: 12
  },
  {
    id: "bearish_ob",
    name: "Bearish OB",
    color: "#ef4444",           // Border color (Red)
    backgroundColor: "#ef4444", // Fill color
    opacity: 20,
    linewidth: 1,
    linestyle: 0,
    extendRight: false,
    extendLeft: false,
    showMiddleLine: false,
    middleLineColor: "#ef4444",
    middleLineWidth: 1,
    middleLineStyle: 2,
    showLabel: false,
    text: "Bearish OB",
    textColor: "#ef4444",
    fontSize: 12
  },
  {
    id: "fvg",
    name: "Fair Value Gap",
    color: "#eab308",           // Gold / Yellow
    backgroundColor: "#eab308",
    opacity: 18,
    linewidth: 1,
    linestyle: 0,
    extendRight: true,          // Extend Right enabled by default for FVG
    extendLeft: false,
    showMiddleLine: true,       // 50% Consequent Encroachment / Center line enabled!
    middleLineColor: "#eab308",
    middleLineWidth: 1,
    middleLineStyle: 2,         // Dashed
    showLabel: false,
    text: "FVG",
    textColor: "#eab308",
    fontSize: 12
  },
  {
    id: "liquidity",
    name: "Liquidity / Range",
    color: "#3b82f6",           // Sky Blue
    backgroundColor: "#3b82f6",
    opacity: 15,
    linewidth: 1,
    linestyle: 2,               // Dashed
    extendRight: false,
    extendLeft: false,
    showMiddleLine: true,
    middleLineColor: "#3b82f6",
    middleLineWidth: 1,
    middleLineStyle: 2,
    showLabel: false,
    text: "Liquidity",
    textColor: "#3b82f6",
    fontSize: 12
  },
  {
    id: "breaker_block",
    name: "Breaker Block",
    color: "#a855f7",           // Purple
    backgroundColor: "#a855f7",
    opacity: 20,
    linewidth: 1,
    linestyle: 0,
    extendRight: false,
    extendLeft: false,
    showMiddleLine: false,
    middleLineColor: "#a855f7",
    middleLineWidth: 1,
    middleLineStyle: 2,
    showLabel: false,
    text: "Breaker",
    textColor: "#a855f7",
    fontSize: 12
  },
  {
    id: "consolidation",
    name: "Consolidation",
    color: "#64748b",           // Slate / Gray
    backgroundColor: "#64748b",
    opacity: 15,
    linewidth: 1,
    linestyle: 0,
    extendRight: false,
    extendLeft: false,
    showMiddleLine: true,
    middleLineColor: "#94a3b8",
    middleLineWidth: 1,
    middleLineStyle: 2,
    showLabel: false,
    text: "Range",
    textColor: "#94a3b8",
    fontSize: 12
  },
  {
    id: "volume_imbalance",
    name: "Volume Imbalance",
    color: "#06b6d4",           // Cyan
    backgroundColor: "#06b6d4",
    opacity: 22,
    linewidth: 1,
    linestyle: 1,               // Dotted
    extendRight: true,
    extendLeft: false,
    showMiddleLine: true,
    middleLineColor: "#06b6d4",
    middleLineWidth: 1,
    middleLineStyle: 1,
    showLabel: false,
    text: "VI",
    textColor: "#06b6d4",
    fontSize: 12
  }
];

const DEFAULT_SETTINGS = {
  activeTemplateId: "bullish_ob",
  defaultTemplateId: "bullish_ob",
  showFloatingBar: false,
  floatingBarPosition: { top: 80, left: 16 },
  autoApplyToNew: true,
  hotkeysEnabled: true,
  rememberSidebarTools: true,
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
const CURRENT_DB_SCHEMA_VERSION = 1;
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
 * Normalizes and migrates any database object from older schema versions up to CURRENT_DB_SCHEMA_VERSION
 */
function runDatabaseMigrations(rawDb) {
  const db = rawDb && typeof rawDb === "object" ? { ...rawDb } : {};
  const fromVersion = Number(db.schemaVersion) || 0;
  const history = Array.isArray(db.migrations) ? [...db.migrations] : [];

  // Migration v0 -> v1: Ensure all templates have middleLine, horz/vert label alignment, and ray fields,
  // and ensure settings has sidebarState.groupTools and rememberLastChartSettings
  if (fromVersion < 1) {
    if (Array.isArray(db.templates) && db.templates.length > 0) {
      db.templates = db.templates.map(t => ({
        extendRight: Boolean(t.extendRight),
        extendLeft: Boolean(t.extendLeft),
        showMiddleLine: Boolean(t.showMiddleLine),
        middleLineColor: t.middleLineColor || t.color || "#22c55e",
        middleLineWidth: Number(t.middleLineWidth) || 1,
        middleLineStyle: t.middleLineStyle !== undefined ? Number(t.middleLineStyle) : 2,
        horzLabelsAlign: t.horzLabelsAlign || "right",
        vertLabelsAlign: t.vertLabelsAlign || "middle",
        ...t
      }));
    } else {
      db.templates = DEFAULT_TEMPLATES;
    }

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
      description: "Initial v1 schema normalization for templates, middleLine, label alignment, and sidebarState.groupTools"
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
async function writeLocalDiskDatabase(templates, settings, dirHandleOverride = null) {
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
      templates: Array.isArray(templates) && templates.length > 0 ? templates : (existingDiskDb?.templates || DEFAULT_TEMPLATES),
      settings: settings || existingDiskDb?.settings || DEFAULT_SETTINGS
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
  if (!changes.templates && !changes.settings) return;

  if (diskWriteTimer) clearTimeout(diskWriteTimer);
  diskWriteTimer = setTimeout(async () => {
    diskWriteTimer = null;
    try {
      const data = await chrome.storage.local.get(["templates", "settings"]).catch(() => ({}));
      if (data.templates || data.settings) {
        await writeLocalDiskDatabase(data.templates, data.settings);
      }
    } catch (e) {}
  }, 600);
});

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const localData = await chrome.storage.local.get(["templates", "settings"]).catch(() => ({}));
    const syncData = await chrome.storage.sync.get(["templates", "settings"]).catch(() => ({}));
    const diskDb = await readLocalDiskDatabase();

    // Priority: 1. Disk Database (if newer or if local storage was wiped), 2. chrome.storage.local, 3. chrome.storage.sync
    const existingTemplates =
      (Array.isArray(localData.templates) && localData.templates.length > 0 && localData.templates) ||
      (diskDb && Array.isArray(diskDb.templates) && diskDb.templates.length > 0 && diskDb.templates) ||
      (Array.isArray(syncData.templates) && syncData.templates.length > 0 && syncData.templates) ||
      null;

    const existingSettings =
      localData.settings ||
      (diskDb && diskDb.settings) ||
      syncData.settings ||
      null;

    const migrated = runDatabaseMigrations({
      schemaVersion: diskDb ? diskDb.schemaVersion : 0,
      migrations: diskDb ? diskDb.migrations : [],
      templates: existingTemplates || DEFAULT_TEMPLATES,
      settings: existingSettings || DEFAULT_SETTINGS
    });

    const finalTemplates = migrated.templates;
    const finalSettings = migrated.settings;

    // Always store in chrome.storage.local (unlimited write quota)
    await chrome.storage.local.set({
      templates: finalTemplates,
      settings: finalSettings,
      dbSchemaVersion: migrated.schemaVersion
    }).catch(() => {});

    // Persist migrated state back to disk if folder is linked
    await writeLocalDiskDatabase(finalTemplates, finalSettings);

    // Only write to chrome.storage.sync if it wasn't initialized yet
    if (!syncData.templates || !syncData.settings) {
      await chrome.storage.sync.set({
        templates: finalTemplates,
        settings: finalSettings
      }).catch(() => {});
    }
    // Setup 30-minute background update check alarm
    if (finalSettings.autoCheckUpdates !== false) {
      chrome.alarms.create("vest_studio_update_check", { periodInMinutes: 30 });
      checkGitHubForUpdatesInBackground();
    }

    // If an update just completed and called chrome.runtime.reload(), reload active trading tabs now that the new runtime is live, and keep Update Center open
    const postUpdateData = await chrome.storage.local.get(["pendingUpdaterSuccess"]).catch(() => ({}));
    if (postUpdateData && postUpdateData.pendingUpdaterSuccess) {
      const info = postUpdateData.pendingUpdaterSuccess;

      // Wait briefly for the new extension runtime and content script registrations to settle, then reload all trading tabs
      setTimeout(async () => {
        try {
          const vestTabs = await chrome.tabs.query({
            url: [
              "https://next.vestmarkets.com/*",
              "https://*.vest.exchange/*",
              "https://vest.exchange/*"
            ]
          });
          for (const tab of vestTabs) {
            if (tab.id) {
              await chrome.tabs.reload(tab.id).catch(() => {});
            }
          }
        } catch (e) {}
      }, 650);

      const updaterUrl = chrome.runtime.getURL("update/update.html");
      const existingUpdaterTabs = await chrome.tabs.query({ url: updaterUrl }).catch(() => []);
      if (!existingUpdaterTabs || existingUpdaterTabs.length === 0) {
        await chrome.tabs.create({ url: updaterUrl, active: true }).catch(() => {});
      }
    }
  } catch (err) {
    // Ignore sync quota errors during rapid extension reloads
  }
});

const GITHUB_REPO = "childersc/trading-cortex";

function cleanSemver(v) {
  return String(v || "").trim().replace(/^v/i, "");
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
    const installedVer = chrome.runtime.getManifest().version || "1.1.0";
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
      lastCheckedAt: Date.now(),
      latestVersion: latestVer,
      updateAvailable: hasUpdate,
      htmlUrl: release.html_url
    };

    await chrome.storage.local.set({ updaterState }).catch(() => {});

    if (hasUpdate) {
      await chrome.action.setBadgeText({ text: "NEW" }).catch(() => {});
      await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" }).catch(() => {});
    } else {
      await chrome.action.setBadgeText({ text: "" }).catch(() => {});
    }

    return updaterState;
  } catch (e) {
    return null;
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === "vest_studio_update_check") {
    checkGitHubForUpdatesInBackground();
  }
});

// Listen for messages from popup, updater page, or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;

  if (request.action === "getTemplatesAndSettings") {
    chrome.storage.local.get(["templates", "settings"]).then(async (data) => {
      if (data && data.templates && data.templates.length > 0 && data.settings) {
        sendResponse({
          templates: data.templates,
          settings: data.settings
        });
      } else {
        const diskDb = await readLocalDiskDatabase();
        sendResponse({
          templates: (diskDb && diskDb.templates) || data.templates || DEFAULT_TEMPLATES,
          settings: (diskDb && diskDb.settings) || data.settings || DEFAULT_SETTINGS
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
    chrome.storage.local.get(["templates", "settings"]).then(async (data) => {
      const diskDb = await readLocalDiskDatabase();
      // If disk has custom templates and chrome.storage only has defaults or is empty, hydrate from disk
      const templatesToUse =
        (Array.isArray(data.templates) && data.templates.length > 0 ? data.templates : null) ||
        (diskDb && Array.isArray(diskDb.templates) && diskDb.templates.length > 0 ? diskDb.templates : DEFAULT_TEMPLATES);
      const settingsToUse = data.settings || (diskDb && diskDb.settings) || DEFAULT_SETTINGS;

      const wrote = await writeLocalDiskDatabase(templatesToUse, settingsToUse);
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
});


