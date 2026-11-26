param(
    [Parameter(Mandatory = $false)]
    [string]$OutDir = "",
    [Parameter(Mandatory = $false)]
    [string]$Branch = "dev"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $ProjectRoot "manifest.json"
$ManifestObj = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$Version = $ManifestObj.version
$Name = $ManifestObj.name
$Description = $ManifestObj.description

if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $ProjectRoot "dist"
}
if (!(Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}
$PublishedDir = Join-Path $ProjectRoot "userscript"
if (!(Test-Path $PublishedDir)) {
    New-Item -ItemType Directory -Path $PublishedDir | Out-Null
}

function ConvertTo-JsStringLiteral {
    param([string]$Text)
    $sb = New-Object System.Text.StringBuilder ($Text.Length + 64)
    [void]$sb.Append('"')
    for ($i = 0; $i -lt $Text.Length; $i++) {
        $ch = $Text[$i]
        $code = [int][char]$ch
        switch ($code) {
            92 { [void]$sb.Append('\\') }     # \
            34 { [void]$sb.Append('\"') }     # "
            13 { [void]$sb.Append('\r') }     # CR
            10 { [void]$sb.Append('\n') }     # LF
            9  { [void]$sb.Append('\t') }     # TAB
            8  { [void]$sb.Append('\b') }     # BS
            12 { [void]$sb.Append('\f') }     # FF
            0x2028 { [void]$sb.Append('\u2028') }
            0x2029 { [void]$sb.Append('\u2029') }
            default {
                if ($code -lt 32) {
                    [void]$sb.AppendFormat('\u{0:x4}', $code)
                } elseif ($ch -eq '/' -and $i -gt 0 -and $Text[$i - 1] -eq '<') {
                    # Escape </script> sequences safely
                    [void]$sb.Append('\/')
                } else {
                    [void]$sb.Append($ch)
                }
            }
        }
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

$CssPath = Join-Path $ProjectRoot "content\template-bar.css"
$MainPath = Join-Path $ProjectRoot "content\content-main.js"
$ExecPath = Join-Path $ProjectRoot "content\cortex-execution.js"
$IsolatedPath = Join-Path $ProjectRoot "content\content-isolated.js"

foreach ($p in @($CssPath, $MainPath, $ExecPath, $IsolatedPath)) {
    if (!(Test-Path $p)) {
        throw "Required source file missing: $p"
    }
}

$CssSource = [System.IO.File]::ReadAllText($CssPath, [System.Text.Encoding]::UTF8)
$MainSource = [System.IO.File]::ReadAllText($MainPath, [System.Text.Encoding]::UTF8)
$ExecSource = [System.IO.File]::ReadAllText($ExecPath, [System.Text.Encoding]::UTF8)
$IsolatedSource = [System.IO.File]::ReadAllText($IsolatedPath, [System.Text.Encoding]::UTF8)

$CssJsLiteral = ConvertTo-JsStringLiteral $CssSource
$MainJsLiteral = ConvertTo-JsStringLiteral $MainSource
$VersionJsLiteral = ConvertTo-JsStringLiteral $Version
$NameJsLiteral = ConvertTo-JsStringLiteral $Name

$MetaUrl = "https://raw.githubusercontent.com/childersc/trading-cortex/$Branch/userscript/trading-cortex.meta.js"
$DownloadUrl = "https://raw.githubusercontent.com/childersc/trading-cortex/$Branch/userscript/trading-cortex.user.js"

$MetaBlock = @"
// ==UserScript==
// @name         $Name
// @namespace    https://github.com/childersc/trading-cortex
// @version      $Version
// @description  $Description (Safari Mobile & Universal Userscript Edition)
// @author       Trading Cortex
// @updateURL    $MetaUrl
// @downloadURL  $DownloadUrl
// @match        https://*.vestmarkets.com/*
// @match        https://vestmarkets.com/*
// @match        https://*.myfundedperpetuals.com/*
// @match        https://myfundedperpetuals.com/*
// @match        https://*.kalshi.com/*
// @match        https://kalshi.com/*
// @match        https://*.hypernova.xyz/*
// @match        https://hypernova.xyz/*
// @exclude      https://trade.vestmarkets.com/*
// @run-at       document-start
// @inject-into  content
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      nfs.faireconomy.media
// @connect      cdn-nfs.faireconomy.media
// ==/UserScript==
"@

$Header = @"
$MetaBlock

/*
 * Trading Cortex v$Version - Safari Mobile & Universal Userscript Build
 * Compatible with:
 *   - iOS / iPadOS Safari + Userscripts (Quoid), Stay, or Tampermonkey for Safari
 *   - Android Firefox + Tampermonkey / Violentmonkey
 *   - Desktop Safari / Firefox / Chrome userscript managers
 *
 * Generated automatically by scripts/build-userscript.ps1
 */
"@

$RuntimeBootstrap = @'
(function () {
  'use strict';

  if (window.location && window.location.hostname === 'trade.vestmarkets.com') return;
  if (window.__TRADING_CORTEX_USERSCRIPT_LOADED__) return;
  window.__TRADING_CORTEX_USERSCRIPT_LOADED__ = true;
  window.__TRADING_CORTEX_USERSCRIPT__ = true;

  const PAGE_WINDOW = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
  try { PAGE_WINDOW.__TRADING_CORTEX_USERSCRIPT__ = true; } catch (e) {}

  const EXT_VERSION = __EXT_VERSION_LITERAL__;
  const EXT_NAME = __EXT_NAME_LITERAL__;
  const STYLESHEET_TEXT = __CSS_LITERAL__;
  const MAIN_WORLD_SOURCE = __MAIN_WORLD_LITERAL__;

  const MAIN_WORLD_PAYLOAD =
    '(function(){try{if(document.documentElement)document.documentElement.setAttribute("data-vest-cortex-main-ran","1");}catch(e){}})();\n' +
    MAIN_WORLD_SOURCE;

  const injectedDocs = typeof WeakSet === 'function' ? new WeakSet() : null;
  const watchedIframes = typeof WeakSet === 'function' ? new WeakSet() : null;

  function injectMainWorldIntoDocument(targetDoc, targetWin) {
    if (!targetDoc) return false;
    try {
      if (targetWin && targetWin.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__) return true;
    } catch (e) {}
    try {
      if (targetDoc.documentElement && targetDoc.documentElement.getAttribute('data-vest-cortex-main-ran') === '1') {
        return true;
      }
    } catch (e) {}
    if (injectedDocs && injectedDocs.has(targetDoc)) return true;

    const mountNode = targetDoc.documentElement || targetDoc.head || targetDoc.body;
    if (!mountNode) return false;

    if (injectedDocs) injectedDocs.add(targetDoc);

    // 1. Primary path: synchronous inline <script> executes immediately in the document's MAIN world
    try {
      const script = targetDoc.createElement('script');
      script.type = 'text/javascript';
      script.setAttribute('data-vest-cortex-main', '1');
      script.textContent = MAIN_WORLD_PAYLOAD;
      mountNode.appendChild(script);
      if (script.parentNode) script.parentNode.removeChild(script);
    } catch (e) {}

    let ran = false;
    try {
      if (targetDoc.documentElement && targetDoc.documentElement.getAttribute('data-vest-cortex-main-ran') === '1') {
        ran = true;
      }
    } catch (e) {}
    try {
      if (!ran && targetWin && targetWin.__VEST_CHART_TEMPLATES_MAIN_INITIALIZED__) {
        ran = true;
      }
    } catch (e) {}

    if (ran) return true;

    // 2. Fallback path for strict inline CSP: load via same-origin blob: URL
    try {
      if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const blob = new Blob([MAIN_WORLD_PAYLOAD], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const script = targetDoc.createElement('script');
        script.src = blobUrl;
        script.async = false;
        script.setAttribute('data-vest-cortex-main-blob', '1');
        const cleanup = () => {
          try { URL.revokeObjectURL(blobUrl); } catch (e) {}
          try { if (script.parentNode) script.parentNode.removeChild(script); } catch (e) {}
        };
        script.addEventListener('load', cleanup, { once: true });
        script.addEventListener('error', cleanup, { once: true });
        mountNode.appendChild(script);
        return true;
      }
    } catch (e) {}

    return false;
  }

  // Inject content-main.js into the current frame's MAIN world immediately at document-start
  if (!injectMainWorldIntoDocument(document, PAGE_WINDOW)) {
    const retryMainInject = () => {
      if (!injectMainWorldIntoDocument(document, PAGE_WINDOW)) {
        setTimeout(() => injectMainWorldIntoDocument(document, PAGE_WINDOW), 20);
      }
    };
    setTimeout(retryMainInject, 10);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', retryMainInject, { once: true });
    }
  }

  // If this userscript instance is running inside a subframe, only content-main.js belongs here
  if (window.top !== window) return;

  // -------------------------------------------------------------
  // Same-Origin Chart Iframe Main-World Bridge (for iOS Safari blob: TradingView iframes)
  // -------------------------------------------------------------
  function tryInjectIframe(ifr) {
    if (!ifr || ifr.tagName !== 'IFRAME') return;
    try {
      const iWin = ifr.contentWindow;
      const iDoc = ifr.contentDocument;
      if (!iWin || !iDoc) return;
      if (iDoc.documentElement || iDoc.head || iDoc.body) {
        injectMainWorldIntoDocument(iDoc, iWin);
      }
    } catch (e) {
      // Cross-origin iframe; ignore safely
    }
  }

  function watchIframeElement(ifr) {
    if (!ifr || ifr.tagName !== 'IFRAME') return;
    tryInjectIframe(ifr);
    if (watchedIframes && watchedIframes.has(ifr)) return;
    if (watchedIframes) watchedIframes.add(ifr);
    try {
      ifr.addEventListener('load', () => {
        tryInjectIframe(ifr);
        setTimeout(() => tryInjectIframe(ifr), 150);
      });
    } catch (e) {}
  }

  function scanAndBridgeChartIframes() {
    try {
      const iframes = document.getElementsByTagName('iframe');
      for (let i = 0; i < iframes.length; i++) {
        watchIframeElement(iframes[i]);
      }
    } catch (e) {}
  }

  function startSameOriginIframeBridge() {
    scanAndBridgeChartIframes();
    try {
      const obs = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
          const added = mutations[i].addedNodes;
          if (!added || added.length === 0) continue;
          for (let j = 0; j < added.length; j++) {
            const node = added[j];
            if (!node || node.nodeType !== 1) continue;
            if (node.tagName === 'IFRAME') {
              watchIframeElement(node);
            } else if (typeof node.getElementsByTagName === 'function') {
              const nested = node.getElementsByTagName('iframe');
              for (let k = 0; k < nested.length; k++) {
                watchIframeElement(nested[k]);
              }
            }
          }
        }
      });
      if (document.documentElement) {
        obs.observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch (e) {}
    setInterval(scanAndBridgeChartIframes, 2000);
  }

  // -------------------------------------------------------------
  // Stylesheet Injection (content/template-bar.css)
  // Uses GM.addStyle / GM_addStyle (WebExtension-level CSS in Quoid Userscripts,
  // immune to CSP & Next.js <head> stripping) PLUS a live <style> kept last in <head>.
  // -------------------------------------------------------------
  let gmStyleInjected = false;
  function ensureUserscriptStylesheet() {
    if (!gmStyleInjected) {
      if (typeof GM !== 'undefined' && GM && typeof GM.addStyle === 'function') {
        try {
          gmStyleInjected = true;
          Promise.resolve(GM.addStyle(STYLESHEET_TEXT)).catch(() => {});
        } catch (e) {}
      } else if (typeof GM_addStyle === 'function') {
        try {
          gmStyleInjected = true;
          GM_addStyle(STYLESHEET_TEXT);
        } catch (e) {}
      }
    }
    try {
      let styleEl = document.getElementById('vest-cortex-userscript-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'vest-cortex-userscript-css';
        styleEl.setAttribute('type', 'text/css');
        styleEl.textContent = STYLESHEET_TEXT;
      } else if (!styleEl.textContent || styleEl.textContent.length < 100) {
        styleEl.textContent = STYLESHEET_TEXT;
      }
      const target = document.head || document.documentElement;
      if (target && (styleEl.parentNode !== target || target.lastElementChild !== styleEl)) {
        target.appendChild(styleEl);
      }
    } catch (e) {}
  }

  window.__vestEnsureUserscriptStyles__ = ensureUserscriptStylesheet;
  try { PAGE_WINDOW.__vestEnsureUserscriptStyles__ = ensureUserscriptStylesheet; } catch (e) {}

  ensureUserscriptStylesheet();
  window.addEventListener('load', () => {
    ensureUserscriptStylesheet();
    setTimeout(ensureUserscriptStylesheet, 800);
    setTimeout(ensureUserscriptStylesheet, 2200);
  }, { once: true });

  // -------------------------------------------------------------
  // Lightweight chrome.* Compatibility Shim (GM4 Async + GM3 + localStorage)
  // Fully compatible with Quoid Userscripts (iOS/iPadOS Safari), Stay, & Tampermonkey
  // -------------------------------------------------------------
  function createUserscriptChromeShim() {
    const STORAGE_DB_KEY = '__trading_cortex_userscript_db_v1__';
    const ECON_CALENDAR_URLS = [
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json'
    ];
    const ECON_CACHE_TTL_MS = 15 * 60 * 1000;

    const storageListeners = new Set();
    const messageListeners = new Set();
    let storageQueue = Promise.resolve();

    function cloneValue(val) {
      if (val === undefined) return undefined;
      try {
        return JSON.parse(JSON.stringify(val));
      } catch (e) {
        return val;
      }
    }

    function parseStoredPayload(v) {
      if (typeof v === 'string' && v) {
        try {
          const parsed = JSON.parse(v);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {}
      } else if (v && typeof v === 'object') {
        return cloneValue(v);
      }
      return null;
    }

    async function readRawStoreObject() {
      // 1. GM4 async API (Quoid Userscripts on iOS/iPadOS Safari)
      if (typeof GM !== 'undefined' && GM && typeof GM.getValue === 'function') {
        try {
          const v = await GM.getValue(STORAGE_DB_KEY, null);
          const parsed = parseStoredPayload(v);
          if (parsed) return parsed;
        } catch (e) {}
      }
      // 2. GM3 API (Tampermonkey / Stay / Violentmonkey)
      if (typeof GM_getValue === 'function') {
        try {
          const raw = GM_getValue(STORAGE_DB_KEY, null);
          const resolved = (raw && typeof raw.then === 'function') ? await raw : raw;
          const parsed = parseStoredPayload(resolved);
          if (parsed) return parsed;
        } catch (e) {}
      }
      // 3. Domain localStorage fallback
      try {
        const lsRaw = window.localStorage.getItem(STORAGE_DB_KEY);
        const parsed = parseStoredPayload(lsRaw);
        if (parsed) return parsed;
      } catch (e) {}
      return {};
    }

    async function writeRawStoreObject(dbObj) {
      let serialized = '{}';
      try {
        serialized = JSON.stringify(dbObj || {});
      } catch (e) {
        return;
      }
      if (typeof GM !== 'undefined' && GM && typeof GM.setValue === 'function') {
        try { await GM.setValue(STORAGE_DB_KEY, serialized); } catch (e) {}
      } else if (typeof GM_setValue === 'function') {
        try {
          const res = GM_setValue(STORAGE_DB_KEY, serialized);
          if (res && typeof res.then === 'function') await res;
        } catch (e) {}
      }
      try {
        window.localStorage.setItem(STORAGE_DB_KEY, serialized);
      } catch (e) {}
    }

    function enqueueStorageOp(opFn) {
      const next = storageQueue.then(opFn, opFn);
      storageQueue = next.catch(() => {});
      return next;
    }

    function emitStorageChanges(changes, areaName) {
      if (!changes || Object.keys(changes).length === 0) return;
      const snapshot = cloneValue(changes);
      setTimeout(() => {
        storageListeners.forEach((fn) => {
          try { fn(snapshot, areaName); } catch (e) {}
        });
      }, 0);
    }

    function makeStorageArea(areaName) {
      return {
        get(keys, callback) {
          return enqueueStorageOp(async () => {
            const db = await readRawStoreObject();
            const out = {};
            if (keys === null || keys === undefined) {
              Object.keys(db).forEach((k) => { out[k] = cloneValue(db[k]); });
            } else if (typeof keys === 'string') {
              if (Object.prototype.hasOwnProperty.call(db, keys)) {
                out[keys] = cloneValue(db[keys]);
              }
            } else if (Array.isArray(keys)) {
              for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                if (Object.prototype.hasOwnProperty.call(db, k)) {
                  out[k] = cloneValue(db[k]);
                }
              }
            } else if (typeof keys === 'object') {
              Object.keys(keys).forEach((k) => {
                out[k] = Object.prototype.hasOwnProperty.call(db, k) ? cloneValue(db[k]) : cloneValue(keys[k]);
              });
            }
            if (typeof callback === 'function') {
              try { callback(out); } catch (e) {}
            }
            return out;
          });
        },
        set(items, callback) {
          return enqueueStorageOp(async () => {
            if (items && typeof items === 'object') {
              const db = await readRawStoreObject();
              const changes = {};
              Object.keys(items).forEach((k) => {
                const oldVal = Object.prototype.hasOwnProperty.call(db, k) ? db[k] : undefined;
                const newVal = cloneValue(items[k]);
                let same = false;
                try {
                  same = JSON.stringify(oldVal) === JSON.stringify(newVal);
                } catch (e) {
                  same = oldVal === newVal;
                }
                if (!same) {
                  db[k] = newVal;
                  changes[k] = { oldValue: cloneValue(oldVal), newValue: cloneValue(newVal) };
                }
              });
              if (Object.keys(changes).length > 0) {
                await writeRawStoreObject(db);
                emitStorageChanges(changes, areaName);
              }
            }
            if (typeof callback === 'function') {
              try { callback(); } catch (e) {}
            }
          });
        },
        remove(keys, callback) {
          return enqueueStorageOp(async () => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            const db = await readRawStoreObject();
            const changes = {};
            for (let i = 0; i < keyList.length; i++) {
              const k = keyList[i];
              if (Object.prototype.hasOwnProperty.call(db, k)) {
                changes[k] = { oldValue: cloneValue(db[k]), newValue: undefined };
                delete db[k];
              }
            }
            if (Object.keys(changes).length > 0) {
              await writeRawStoreObject(db);
              emitStorageChanges(changes, areaName);
            }
            if (typeof callback === 'function') {
              try { callback(); } catch (e) {}
            }
          });
        },
        clear(callback) {
          return enqueueStorageOp(async () => {
            await writeRawStoreObject({});
            if (typeof callback === 'function') {
              try { callback(); } catch (e) {}
            }
          });
        }
      };
    }

    const localArea = makeStorageArea('local');
    const syncArea = makeStorageArea('sync');

    function gmFetchJson(url) {
      return new Promise((resolve) => {
        let settled = false;
        const done = (val) => {
          if (settled) return;
          settled = true;
          resolve(val);
        };
        const gmXhr =
          (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function')
            ? GM.xmlHttpRequest
            : (typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null);

        if (gmXhr) {
          try {
            const req = gmXhr({
              method: 'GET',
              url,
              headers: { Accept: 'application/json' },
              timeout: 12000,
              onload: (res) => {
                if (res && res.status >= 200 && res.status < 300 && res.responseText) {
                  try {
                    done(JSON.parse(res.responseText));
                    return;
                  } catch (e) {}
                }
                done(null);
              },
              onerror: () => done(null),
              ontimeout: () => done(null)
            });
            if (req && typeof req.then === 'function') {
              req.then((res) => {
                if (res && res.status >= 200 && res.status < 300 && res.responseText) {
                  try { done(JSON.parse(res.responseText)); return; } catch (e) {}
                }
                done(null);
              }).catch(() => done(null));
            }
            return;
          } catch (e) {}
        }
        try {
          fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
            .then((r) => (r && r.ok ? r.json() : null))
            .then((data) => done(data))
            .catch(() => done(null));
        } catch (e) {
          done(null);
        }
      });
    }

    async function fetchEconomicCalendarInUserscript(forceRefresh) {
      try {
        const stored = await localArea.get(['econCalendarCache']);
        const cached = stored && stored.econCalendarCache;
        if (
          !forceRefresh &&
          cached &&
          Array.isArray(cached.events) &&
          cached.events.length > 0 &&
          Date.now() - (Number(cached.fetchedAt) || 0) < ECON_CACHE_TTL_MS
        ) {
          return cached;
        }
        for (let i = 0; i < ECON_CALENDAR_URLS.length; i++) {
          const data = await gmFetchJson(ECON_CALENDAR_URLS[i]);
          if (Array.isArray(data) && data.length > 0) {
            const payload = {
              fetchedAt: Date.now(),
              source: 'ForexFactory',
              events: data
            };
            await localArea.set({ econCalendarCache: payload });
            return payload;
          }
        }
        if (cached && Array.isArray(cached.events)) return cached;
      } catch (e) {}
      return { fetchedAt: Date.now(), source: 'Fallback', events: [] };
    }

    function getOrCreateSessionTabId() {
      const KEY = '__trading_cortex_us_tab_id__';
      try {
        const existing = window.sessionStorage.getItem(KEY);
        if (existing && /^\d+$/.test(existing)) return Number(existing);
        const generated = Math.floor(100000 + Math.random() * 899999);
        window.sessionStorage.setItem(KEY, String(generated));
        return generated;
      } catch (e) {
        return 1;
      }
    }

    return {
      runtime: {
        id: 'trading-cortex-userscript',
        lastError: null,
        getManifest() {
          return { version: EXT_VERSION, name: EXT_NAME };
        },
        getURL(relPath) {
          return 'userscript://trading-cortex/' + String(relPath || '').replace(/^\/+/, '');
        },
        onMessage: {
          addListener(fn) {
            if (typeof fn === 'function') messageListeners.add(fn);
          },
          removeListener(fn) {
            messageListeners.delete(fn);
          }
        },
        sendMessage(message, callback) {
          const reply = (payload) => {
            if (typeof callback === 'function') {
              try { callback(payload); } catch (e) {}
            }
            return Promise.resolve(payload);
          };
          const action = message && message.action;
          if (action === 'getCurrentTabInfo' || action === 'getTabId') {
            return reply({
              ok: true,
              tabId: getOrCreateSessionTabId(),
              windowId: 1,
              tabIndex: 0,
              frameId: 0
            });
          }
          if (action === 'fetchEconomicCalendar') {
            return fetchEconomicCalendarInUserscript(Boolean(message && message.forceRefresh)).then((feed) => {
              const out = { ok: true, feed };
              if (typeof callback === 'function') {
                try { callback(out); } catch (e) {}
              }
              return out;
            });
          }
          return reply({ ok: false, userscript: true });
        }
      },
      storage: {
        local: localArea,
        sync: syncArea,
        onChanged: {
          addListener(fn) {
            if (typeof fn === 'function') storageListeners.add(fn);
          },
          removeListener(fn) {
            storageListeners.delete(fn);
          }
        }
      }
    };
  }

  let isolatedBooted = false;
  function bootIsolatedBundle() {
    if (isolatedBooted) return;
    if (!document.body) {
      setTimeout(bootIsolatedBundle, 40);
      return;
    }
    isolatedBooted = true;
    ensureUserscriptStylesheet();
    startSameOriginIframeBridge();

    const chrome = createUserscriptChromeShim();
    // Execute cortex-execution.js and content-isolated.js with the local chrome compatibility shim
    (function (chrome) {
__EXEC_SOURCE__
      if (!window.TradingCortexExecution && typeof globalThis !== 'undefined' && globalThis.TradingCortexExecution) {
        window.TradingCortexExecution = globalThis.TradingCortexExecution;
      }
__ISOLATED_SOURCE__
    })(chrome);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootIsolatedBundle, { once: true });
  } else {
    bootIsolatedBundle();
  }
})();
'@

$Body = $RuntimeBootstrap.Replace('__EXT_VERSION_LITERAL__', $VersionJsLiteral)
$Body = $Body.Replace('__EXT_NAME_LITERAL__', $NameJsLiteral)
$Body = $Body.Replace('__CSS_LITERAL__', $CssJsLiteral)
$Body = $Body.Replace('__MAIN_WORLD_LITERAL__', $MainJsLiteral)
$Body = $Body.Replace('__EXEC_SOURCE__', $ExecSource)
$Body = $Body.Replace('__ISOLATED_SOURCE__', $IsolatedSource)

$FullOutput = ($Header + "`n" + $Body).Replace("`r`n", "`n")
$MetaOutput = ($MetaBlock + "`n").Replace("`r`n", "`n")

$DistPath = Join-Path $OutDir "trading-cortex.user.js"
$PublishedUserPath = Join-Path $PublishedDir "trading-cortex.user.js"
$PublishedMetaPath = Join-Path $PublishedDir "trading-cortex.meta.js"

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($DistPath, $FullOutput, $Utf8NoBom)
[System.IO.File]::WriteAllText($PublishedUserPath, $FullOutput, $Utf8NoBom)
[System.IO.File]::WriteAllText($PublishedMetaPath, $MetaOutput, $Utf8NoBom)

# Validate generated userscript JavaScript syntax with Node if available
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
    & node -c $PublishedUserPath
    if ($LASTEXITCODE -ne 0) {
        throw "Generated userscript failed JavaScript syntax validation (node -c)!"
    }
}

$OutInfo = Get-Item $PublishedUserPath
Write-Host ">>> Safari Mobile & Universal Userscript built successfully:" -ForegroundColor Green
Write-Host "    Published: $($OutInfo.FullName)" -ForegroundColor Cyan
Write-Host "    Meta:      $PublishedMetaPath" -ForegroundColor Cyan
Write-Host "    Dist:      $DistPath" -ForegroundColor Cyan
Write-Host "    Version:   v$Version (branch: $Branch)" -ForegroundColor Cyan
Write-Host "    Size:      $([math]::Round($OutInfo.Length / 1KB, 1)) KB" -ForegroundColor Cyan
