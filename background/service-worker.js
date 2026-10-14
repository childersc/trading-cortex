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
    activeTool: null
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const localData = await chrome.storage.local.get(["templates", "settings"]).catch(() => ({}));
    const syncData = await chrome.storage.sync.get(["templates", "settings"]).catch(() => ({}));

    const existingTemplates =
      (Array.isArray(localData.templates) && localData.templates.length > 0 && localData.templates) ||
      (Array.isArray(syncData.templates) && syncData.templates.length > 0 && syncData.templates) ||
      null;

    const existingSettings = localData.settings || syncData.settings || null;

    const finalTemplates = existingTemplates
      ? existingTemplates.map(t => ({
          extendRight: Boolean(t.extendRight),
          extendLeft: Boolean(t.extendLeft),
          showMiddleLine: Boolean(t.showMiddleLine),
          middleLineColor: t.middleLineColor || t.color || "#22c55e",
          middleLineWidth: Number(t.middleLineWidth) || 1,
          middleLineStyle: t.middleLineStyle !== undefined ? Number(t.middleLineStyle) : 2,
          ...t
        }))
      : DEFAULT_TEMPLATES;

    const finalSettings = existingSettings
      ? { ...DEFAULT_SETTINGS, ...existingSettings, showFloatingBar: false }
      : DEFAULT_SETTINGS;

    // Always store in chrome.storage.local (unlimited write quota)
    await chrome.storage.local.set({
      templates: finalTemplates,
      settings: finalSettings
    }).catch(() => {});

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
    const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { "Accept": "application/vnd.github+json" },
      cache: "no-store"
    });
    if (!resp.ok) return null;

    const release = await resp.json();
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
    chrome.storage.local.get(["templates", "settings"]).then((data) => {
      sendResponse({
        templates: data.templates || DEFAULT_TEMPLATES,
        settings: data.settings || DEFAULT_SETTINGS
      });
    }).catch(() => {
      sendResponse({
        templates: DEFAULT_TEMPLATES,
        settings: DEFAULT_SETTINGS
      });
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


