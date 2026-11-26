# Trading Cortex — Changelog & Version History

All notable changes, new features, and bug fixes through the current release (`v1.1.159`) are documented in this file.

---

## [v1.1.159] — 2026-11-26

### 📱 Compact Mobile Sizing for On-Chart Position, SL/TP & Price Pills
- **Fixes (`content/content-main.js`, `tests/mobile-userscript-and-topdock.test.js`)**:
  - **Eliminated Oversized Mobile Chart Boxes**: Added automatic viewport-responsive compact classes (`.is-mobile-compact` for mobile/tablet charts and `.is-mobile-ultra` for narrow portrait phones `<= 440px` chart / `<= 480px` viewport) on `#vest-hn-position-box`, `#vest-hn-tp-box`, and `#vest-hn-sl-box`.
  - **Sleek Mobile Proportions**: Removed desktop `min-width: 184px` / `min-width: 138px` / `min-height: 58px` constraints on mobile, slimmed down oversized `@media (pointer: coarse)` button bloat (`26–28px` → `15–19px`), tightened padding/gaps/margins (`6px` edge margin vs `14px`), disabled `backdrop-filter` on mobile chart boxes for crisp 60fps iOS rendering, enforced `-webkit-appearance: none` on chart buttons, and clamped mobile font sizes (`8–9.5px` on narrow phones, `8–10.5px` on tablets/landscape) even when synced desktop settings use larger fonts.
  - **Compact Mobile Price Pills & 3-Line SL/TP Layout**: Scaled Current Price and Breach Price canvas pills down cleanly on mobile, trimmed verbose prefixes on narrow phones (`$3,567.10` instead of `Current Price · $3,567.10`, `Breach · $3,571.30` instead of `Breach Price · $3,571.30`), hid redundant `%` move on ultra-narrow SL/TP Row 3 so the 3-line box stays ~84–96px wide, and tightened anti-overlap offsets (desktop sizing remains 100% untouched).
  - Added mobile-compact chart box assertions in `tests/mobile-userscript-and-topdock.test.js`.

---

## [v1.1.158] — 2026-11-26

### 🎯 Overwrote Hypernova's Native `LineToolOrder` SL/TP/Position Code, Upgraded to 3-Line High Box & Configurable Solid Line Style
- **Root Cause (Verified Directly in Hypernova's `trade-page` & TradingView `line-tool-order` Bundles)**:
  - Hypernova creates its Stop Loss (`SL ...`), Take Profit (`TP ...`), and Position Entry (`Close position`) lines via `chartApi.createOrderLine()`, which produces TradingView **`LineToolOrder`** sources (`src.toolname === 'LineToolOrder'`, adapter at `src._adapter`, lazy `OrderPaneView` attached via `_setPaneViews(...)`), while `Breach` / `Pass` use `LineToolPosition`.
  - `v1.1.153`'s filter skipped all `LineTool*` toolnames (accidentally skipping `LineToolOrder` & `LineToolPosition`!) and didn't read `src._adapter`, allowing the platform's native red SL box (`SL 27.7440 +$29.41 ×`) and dashed line to keep rendering alongside our box.
- **Fixes (`content/content-main.js`, `content/content-isolated.js`)**:
  - **Direct Native `LineToolOrder` / `LineToolPosition` Overwrite**: Updated `extractNativeHypernovaChartLines()` to match `LineToolOrder` / `LineToolPosition` via `src._adapter` / `src.adapter()` (still skipping user drawing `LineTool*`, `Breach`, `Pass`, and working `Limit` orders!), hooked lazy `_setPaneViews` so `OrderPaneView` is suppressed before painting a single duplicate frame, and overwrote `adapter.setLineStyle` / `adapter.getLineStyle` / `adapter.setLineWidth` / `adapter.getLineWidth` directly so Hypernova's `setLineStyle(dashed)` calls automatically enforce your configured style (and cleanly restore original native lines/boxes when toggled OFF).
  - **3-Line High SL / TP Replacement Box**: Redesigned `.vest-hn-tpsl-box` into a crisp 3-line high box: Row 1 (`SL`/`TP` badge + position qty + `×` cancel), Row 2 (prominent bold signed dollar PnL colored green for profit / red for loss), Row 3 (exact target price + `%` move).
  - **Solid Default & Configurable Line Style (`tradeLineStyle` + `tradeLineWidth`)**: Changed Position, TP, and SL lines from hardcoded dashed to **Solid (`───`) by default**, and added **Position / TP / SL Line Style** (`Solid` / `Dashed` / `Dotted`) and **Line Thickness** (`1–4px`) controls inside **Perp Firm Settings → Chart Visuals** with instant live preview.
  - Added exact `LineToolOrder` / `LineToolPosition` VM tests in `tests/hypernova-chart-visuals.test.js`.

---

## [v1.1.157] — 2026-11-26

### 🌑 Extended Dark Theme Lock to Charting Indicator Tiles, Toggle Boxes, Perp Firm Cards & All iOS Buttons
- **Fixes (`content/template-bar.css`, `content/content-isolated.js`)**:
  - Extended high-specificity `#vest-studio-settings-dialog` dark backgrounds (`!important`), light text colors, and `-webkit-appearance: none !important` (countering Tailwind v4 `button { appearance: button; }` and iOS Safari native light button/input chrome) to ALL inner settings cards & tiles: `.vest-indicator-tile`, `.vest-indicator-tile-header`, `.vest-indicator-settings-btn`, `.vest-indicator-settings-drawer`, `.vest-tvs-toggle-box`, `.vest-tvs-about-card`, `.vest-tvs-action-btn`, `.vest-pf-tile`, `.vest-pf-detail-card`, `.vest-ed-section`, `.vest-cdb-tile`, and all `<button>`, `<select>`, `<input>`, and `<textarea>` elements.
  - Added a self-contained scoped `<style id="vest-tvs-scoped-dark-lock">` mounted directly inside `#vest-studio-settings-dialog` plus inline dark fallbacks on Charting Indicator tiles so inner boxes can never turn white even if `<head>` stylesheets are modified by SPA hydration or overridden by site themes.
  - Made `.vest-indicator-tile-header` wrap cleanly with readable multi-line descriptions on narrow mobile viewports.

---

## [v1.1.156] — 2026-11-26

### 🌑 Fixed White / Unreadable Settings Menu & Dropdown on Mobile Safari
- **Root Causes**:
  1. In Safari **Userscripts (Quoid)**, `<style>` tags injected before SPA/Next.js `<head>` hydration could be stripped or overridden by later site stylesheets (and `@grant GM.addStyle` wasn't yet used for WebExtension-level CSS injection).
  2. `#vest-studio-dropdown-menu` and inner layers of `#vest-studio-settings-dialog` / `#vest-template-manager-dialog` (`.vest-tvs-header`, `.vest-tvs-body`, `.vest-tvs-sidebar`, `.vest-tvs-content`, `.vest-tvs-footer`, `<button>`, `<select>`, `<input>`) lacked high-specificity ID dark backgrounds (`!important`), `color-scheme: dark !important`, and `-webkit-appearance: none !important`, allowing light-mode site CSS, `[role="dialog"]` rules, or iOS Safari native control/compositor defaults (`backdrop-filter` + `translate3d`) to paint the menu white behind light text.
  3. Mobile modal layout rules only matched `@media (max-width: 900px)`, missing landscape phones & tablets (`<= 1180px`) where `body.vest-mobile-top-dock-active` was active.
- **Fixes (`scripts/build-userscript.ps1`, `content/template-bar.css`, `content/content-isolated.js`)**:
  - Added `@grant GM.addStyle` and `@grant GM_addStyle` in `scripts/build-userscript.ps1`, keeping `<style id="vest-cortex-userscript-css">` re-verified as the last child of `<head>` on `load`, post-hydration, and whenever opening the Cortex dropdown or Settings/Template Manager modals (`window.__vestEnsureUserscriptStyles__`).
  - Locked high-specificity ID dark backgrounds (`#0d121d` / `#111827` / `#090d16` `!important`), light text, `color-scheme: dark !important`, and `-webkit-appearance: none !important` across `#vest-studio-dropdown-menu`, `#vest-studio-settings-dialog`, `#vest-template-manager-dialog`, and all buttons/inputs/selects inside them.
  - Added solid dark inline fallbacks on mobile modals/dropdowns and disabled `backdrop-filter` + `translate3d` on mobile (`body.vest-mobile-top-dock-active` and `@media (max-width: 900px)`) to prevent iOS Safari GPU compositor white-box glitches.

---

## [v1.1.155] — 2026-11-26

### 🍎 Native Safari "Userscripts" (Quoid) GM4 Async API & 1-Tap Auto-Update Support
- **Native Quoid `Userscripts` Compatibility (`scripts/build-userscript.ps1`, `userscript/trading-cortex.user.js`, `userscript/trading-cortex.meta.js`)**:
  - Added `@grant GM.getValue`, `@grant GM.setValue`, and `@grant GM.xmlHttpRequest` (GM4 Promise API used natively by **Userscripts** on iOS/iPadOS Safari) alongside legacy GM3 `GM_*` grants and `localStorage` fallback, with a serialized async storage queue so concurrent writes never race.
  - Published `userscript/trading-cortex.user.js` and `userscript/trading-cortex.meta.js` directly in the repository with `@updateURL` and `@downloadURL` headers so **Userscripts** on iOS/iPadOS Safari supports 1-tap URL installation directly from GitHub plus built-in automatic update checks.
  - Added early `document-start` retry guard if `document.documentElement` isn't yet mounted when WebKit fires `document-start`.
  - Expanded `tests/mobile-userscript-and-topdock.test.js` with GM4 async `GM.getValue`/`GM.setValue`/`GM.xmlHttpRequest` and `.meta.js` verification.

---

## [v1.1.154] — 2026-11-26

### 📱 Safari Mobile Userscript Support & Mobile Docked Top Bar (With Clean Page Push-Down)
- **Safari Mobile & Universal Userscript Build (`scripts/build-userscript.ps1` → `dist/trading-cortex.user.js`)**:
  - Added an automated single-file userscript bundler targeting **iOS/iPadOS Safari** userscript engines (**Userscripts by Quoid**, **Stay**, **Tampermonkey for Safari**) as well as **Firefox Android** and desktop userscript managers.
  - Uses `@inject-into content` + `@grant GM_getValue / GM_setValue / GM_xmlhttpRequest / unsafeWindow` alongside a lightweight `chrome.*` compatibility shim (`chrome.runtime`, `chrome.storage.local/sync/onChanged` backed by `GM_*` + `localStorage` fallback, ForexFactory `GM_xmlhttpRequest` news proxy, and stable per-tab IDs).
  - Includes an automatic **same-origin `blob:` TradingView iframe injector** (with CSP-safe `blob:` `<script>` fallback) so `content-main.js` initializes reliably inside Hypernova, Vest, Kalshi, and MFP chart iframes on iOS Safari without duplicate initialization.
- **Mobile Docked Top Bar Replacing Hovering Pill (`content/content-isolated.js`, `content/template-bar.css`)**:
  - Automatically detects mobile/touch viewports (`isMobileCortexLayout()`, including iPhone, Android, and iPadOS) and, on **enabled sites only** (`isActiveFirmEnabledForTopDock()`), replaces the desktop hovering pill with a sleek full-width docked top bar (`#vest-cortex-mobile-dock`, respecting `env(safe-area-inset-top)`) featuring the Cortex menu trigger, venue badge, and 1-tap Settings button.
  - Cleanly **pushes the site down** (`body.vest-mobile-top-dock-active` padding-top + reversible shifting of top-pinned `position: fixed` / `position: sticky` exchange headers via `syncMobileTopDockLayoutPush()`), and restores all page/header offsets automatically if resized back to desktop or if a firm is disabled.
  - Desktop hovering pill behavior remains 100% unchanged; modal stacking guard (`body.vest-site-modal-open`) also drops `#vest-cortex-mobile-dock` behind native exchange modals.
- **Mobile Touch & Responsive Dialog Optimizations (`content/template-bar.css`, `content/content-main.js`)**:
  - Made `#vest-studio-dropdown-menu` and `#vest-studio-settings-dialog` mobile-responsive (removing the `440px` min-width, switching the settings sidebar into a touch-scrollable horizontal tab bar, and clamping menus cleanly below `#vest-cortex-mobile-dock`).
  - Added `touch-action: none` and coarse-pointer touch targets on chart Entry/TP/SL drag handles, accepted touch `pointerdown` (`button: 0/-1/undefined`), and added two-finger touch cancel during TP/SL drags.
  - Added comprehensive unit test suite `tests/mobile-userscript-and-topdock.test.js`.

---

## [v1.1.153] — 2026-11-26

### 🎯 Replaced Existing Native SL / TP & Position Boxes In-Place (No More Duplicate Second Box)
- **Root Cause**: TradingView's native `OrderLine` (SL / TP) and `PositionLine` painted via `paneViews` / `topPaneViews` underneath or beside Trading Cortex's enhanced boxes — showing two Stop Loss boxes (or two Take Profit boxes) side-by-side on the same line (especially when SL sat near entry).
- **Fixes (`content/content-main.js`)**:
  - Upgraded `extractNativeHypernovaChartLines()` with full source discovery (`collectModelChartSources` across `sources`, `allSources`, `customSources`, `priceDataSources`, `orderedSources`, `sourcesByGroup`) and minified-safe renderer inspection (`inspectOrderOrPositionRendererData` on both `paneViews` and `topPaneViews`), while strictly ignoring indicators, user drawings (`LineTool*`), `"Breach"` lines, and regular `"Buy Limit"` / `"Sell Limit"` orders.
  - Added reversible pane-renderer suppression (`hookNativeHypernovaTradeLinePaneView` & `syncHypernovaNativeTradeLineSuppression`) so TradingView's duplicate native SL, TP, and Position canvas boxes are cleanly replaced in-place by our single interactive boxes (preserving TradingView's right price-axis badges, and instantly restoring the original native boxes if toggled OFF in Settings).
  - Parsed exact settled dollar PnL from native SL/TP lines so our replacement SL/TP box matches Hypernova's sub-tick unrounded entry fill to the exact penny when settled, while smoothly computing live dollar PnL on every pixel during drags.
  - Added VM unit tests in `tests/hypernova-chart-visuals.test.js` covering minified `topPaneViews` suppression, re-detection across frames, Breach/Limit exclusion, and toggle restoration.

---

## [v1.1.152] — 2026-11-26

### ⚡ Real-Time 1:1 Entry Box PnL Synced Directly to Live Positions Table
- **Root Cause**:
  1. `resolveActiveHypernovaPosition()` computed its own PnL from the TradingView candle's Last Trade Price (`(livePrice - entryPrice) * sizeQty`) BEFORE checking the Positions table's live `unrealizedPnl` — causing the Entry Box to disagree with Hypernova's Mark-Price-based `PnL (RoE%)` (e.g., showing `+$117.33` on `GOLD` while the Positions row showed `+$124.07`).
  2. Positions table updates only synced on an 800ms polling interval instead of reacting immediately to live DOM ticks.
- **Fixes (`content/content-isolated.js`, `content/content-main.js`)**:
  - Added a lightweight scoped `MutationObserver` (`ensureHypernovaPositionsTableObserver()`) watching the live Positions `<tbody>` / blotter (`100ms` throttle) so every live PnL & Mark Price tick pushes immediately to the chart Entry Box.
  - Tagged live Positions rows with `source: 'dom'` and added `computeLiveHypernovaUnrealizedPnl()` so the Entry Indicator Box displays the **exact live Positions table PnL** to the cent whenever the Positions table is visible, and smoothly projects live price deltas from cached Mark Price when viewing another tab (`Open Orders` / `Accounts`).
  - Added Unicode minus sign (`−`) normalization in `parseHypernovaNumber()` and unit tests in `tests/hypernova-chart-visuals.test.js`.

---

## [v1.1.151] — 2026-11-26

### ❌ Right-Click (or Esc) Cancels TP / SL Drag Without Setting the Order
- **Right-Click & Escape Drag Cancellation (`content/content-main.js`)**:
  - Updated `startHypernovaTpSlDrag()` (shared across Hypernova, My Funded Perpetuals, and Kalshi Pro) so right-clicking while dragging a **Stop Loss** or **Take Profit** line immediately cancels the drag instead of submitting the order — handling W3C Pointer Events chorded right-clicks (`pointermove` with `button === 2` / `buttons & 2`), secondary `mousedown`/`pointerdown`, `contextmenu`, `pointercancel`, and `Escape`.
  - Automatically suppresses the trailing browser/chart right-click context menu on cancel so it doesn't pop up over the chart, restores the chart cleanly to its pre-drag state without mutating `hypernovaManualTpSlBySymbol`, and skips `VEST_TV_HYPERNOVA_SET_TP_SL`.
  - Added VM unit tests in `tests/hypernova-chart-visuals.test.js` covering chorded right-click, right `mousedown`, `Escape`, `pointercancel`, trailing context-menu suppression, and normal left-release submission.

---

## [v1.1.150] — 2026-11-25

### 🎯 Hypernova Breach Price Shown Only While Flat (Hidden When a Position Is Open)
- **Pre-Trade Only Behavior (`content/content-main.js`, `content/content-isolated.js`)**:
  - Updated `resolveActiveHypernovaBreachPrice()` so the red Breach Price line & badge box render **only when no position is open yet** (tracking Hypernova's live Order Ticket `[data-testid="order-details-breach-price"]` while sizing/previewing a trade) and automatically hide as soon as a position is open on the chart.
  - Updated the Hypernova settings description and unit tests (`tests/hypernova-chart-visuals.test.js`) accordingly.

---

## [v1.1.149] — 2026-11-25

### 🚨 Hypernova Live "Breach Price" Red Line & Badge Box
- **Real-Time Breach Price Tracking (`content/content-isolated.js`, `content/content-main.js`)**:
  - Tracks Hypernova's live **Breach Price** in real time from BOTH the right-hand Order Ticket (`[data-testid="order-details-breach-price"]` via a lightweight scoped `MutationObserver` as you adjust size, leverage, Limit price, or toggle Long/Short) AND active positions in the Positions table (`td[data-testid$="-breach"]`).
  - Draws a crisp horizontal red line across the chart pane with a matching red pill badge (`Breach Price · $XX.XXX`) that moves dynamically with Hypernova's Breach Price, automatically avoids colliding with the `"Current Price"` box, and displays a sleek clamped `▲ Above chart` / `▼ Below chart` red indicator pill when the breach price sits outside the currently visible zoom range.
  - Clears cleanly when flat and when the order ticket shows `N/A`.
- **Full Hypernova Settings Controls (`Perp Firms → Hypernova`)**:
  - Added a dedicated **Live "Breach Price" Red Line & Box** section (ON by default) with independent controls and live chart preview: ON/OFF toggle, Line Color picker (default `#ef4444`), Line Style (Solid / Dashed / Dotted), Line Thickness (`1px–4px`), Line Opacity (`15%–100%`), Custom Label Text (default `"Breach Price"`), Label & Box Font Size (`8px–22px`), Label Position (Left / Center / Right), Show Label Box toggle, and Include Price in Box toggle.

---

## [v1.1.148] — 2026-11-25

### 🛡️ Fixed Browser Instability / CPU & Storage Ping-Pong Loop Introduced in v1.1.147
- **Root Causes Identified**:
  1. **Cross-Frame `storage` ↔ `VEST_TV_CONFIG_UPDATE` Infinite Loop**: `content-main.js` echoed `__trading_cortex_isolated_settings__` back into `window.localStorage` on every `VEST_TV_CONFIG_UPDATE`, while `content-isolated.js` ran `window.addEventListener('storage')` and `BroadcastChannel` in BOTH the top window and the same-origin `blob:` TradingView chart iframe. Combined with `v1.1.147`'s new `updatedAt` timestamps and `mergeSidebarState()` object normalization, the top frame and chart iframe bounced `storage` events ↔ `VEST_TV_CONFIG_UPDATE` ↔ `applyLiveSettingsToAllComponents()` back and forth continuously.
  2. **Re-Triggering `restoreSidebarSelections()` Loop + Layout Thrashing**: `VEST_TV_CONFIG_UPDATE` called `hasSidebarMismatchWithTarget()` (which scanned the entire page DOM with `getBoundingClientRect()` / `getComputedStyle()` on every tick) and re-triggered `restoreSidebarSelections()` whenever `updatedAt` advanced, while `restoreSidebarSelections()` itself posted `VEST_TV_SIDEBAR_STATE_CHANGED` with a fresh `updatedAt: Date.now()` — creating a self-sustaining restore + `chrome.storage.local` + `cortex-db.json` storm.
  3. **React Fiber Mutation & Noisy `localStorage.setItem` Captures**: `restoreSidebarSelections()` poked TradingView's internal React Fiber hooks/state via `tryUpdateGroupSlotViaReactFiber`, dispatched synthetic `Escape` events to `document.body`, and captured noisy keys like `properties_toolbar.position` / `linetool.*` inside `Storage.prototype.setItem`.
- **Fixes (`content/content-main.js`, `content/content-isolated.js`)**:
  - Stopped `content-main.js` from ever writing `__trading_cortex_isolated_settings__` (`content-isolated.js` is the single authoritative writer) and skipped redundant `localStorage.setItem` writes when unchanged.
  - Gated `window.addEventListener('storage')` and `initCrossTabSyncChannel()` strictly on `isTopWindow`, and added `getSubstantiveSettingsDigest()` / `getSubstantiveSidebarDigest()` deduplication in `handleIncomingLiveSettings()`, `chrome.storage.onChanged`, and `VEST_TV_SIDEBAR_STATE_CHANGED` so self-echoes and timestamp-only ticks never re-render or rebroadcast.
  - Removed `shouldReapplyNewerSidebar`, removed self-heal `VEST_TV_SIDEBAR_STATE_CHANGED` broadcasts from `restoreSidebarSelections()`, added strict single-flight + once-per-boot guards, removed React Fiber mutation and synthetic `Escape` dispatches during restore, scoped `scanDomSidebarGroupSlots()` strictly to TradingView's drawing toolbar, and narrowed live `Storage.prototype.setItem` capture (`isToolbarHookCaptureKey`) with a 1.2s debounce.

---

## [v1.1.147] — 2026-11-25

### ✏️ Fixed Drawing Tool Memory Not Saving & Line/Rectangle Pre-Selected on Refresh
- **Root Causes Identified (via live TradingView DOM inspection)**:
  1. **False Active Detection (`isInteractive-GwQQdU8S`)**: `isElementActive()` checked `/active/i` and `[class*="active"]`, which falsely matched TradingView's standard `isInteractive-GwQQdU8S` class on EVERY inactive toolbar button — corrupting `detectedActiveTool` and magnet/toggle detection.
  2. **Refusing to Save Crosshair (`cursor`)**: `drawing_tool_changed` explicitly ignored `'cursor'` and `saveCurrentSidebarState()` forced `activeTool` back to `prev.activeTool` (e.g. `LineToolTrendLine` / `LineToolRectangle`), leaving a drawing tool permanently stuck in memory even after finishing a drawing.
  3. **Broken Crosshair Restore + Slot Icon Mismatch**: `restoreSidebarSelections()` armed every tool in `groupTools` via `selectLineTool()` without updating the TradingView React group slot icon, then failed to switch back to Crosshair because TradingView's Cross button has no `data-name="cursor"` (it lives inside `[data-name="linetool-group-cursors"] button[aria-label="Cross"]`).
  4. **Unrestored Boot Defaults Overwriting Saved Memory + Multi-Frame Collision**: Clicking anywhere on the page after an unsuccessful restore (or duplicate listeners running in both top window and the same-origin chart iframe) overwrote saved `groupTools` with TradingView's defaults and could double-toggle Magnet / Lock / Keep Drawing (`data-name="drawginmode"`).
- **Fixes (`content/content-main.js`, `content/content-isolated.js`, `background/service-worker.js`)**:
  - Replaced substring `active` matching with strict token matching (`hasActiveClassToken`) so `isInteractive-*` never registers as active, and unwrapped wrapper controls (`magnet-button`, `hide-all`, `linetool-group-cursors`) to their real clickable `<button>` (plus added TradingView's `drawginmode` / `"Keep drawing"` and `lockAllDrawings` selectors).
  - Enforced single-frame sidebar ownership (`shouldOwnSidebarInThisFrame`), shared document-level restore locks (`isSidebarRestoreActive`), trusted-event-only sidebar/flyout listeners (never capturing external page buttons like `"Cross"` margin), and boot-default overwrite protection.
  - Added sequential mismatched-slot restoration with API + React Fiber plus a silent (zero-flash) DOM flyout fallback (`trySelectGroupSlotViaSilentFlyout`), followed by guaranteed Crosshair activation (`activateCursorToolReliably` + double-verification) unless `Keep drawing` (`stayInDrawingMode`) is explicitly ON — and auto-heals legacy stuck `activeTool` entries.
  - Expanded safe TradingView toolbar storage key preservation (`linetool-group`, `combobox.`, `FavoriteDrawings`, `magnetMode`, etc.) and added timestamp-aware `mergeSidebarState()` across `content-main.js` and `content-isolated.js` (including Settings modal commits).
  - Added comprehensive unit test suite `tests/sidebar-drawing-tools-memory.test.js` (17/17 suites passing).

---

## [v1.1.146] — 2026-11-25

### 🧹 Fixed Stale Position Entry Box & SL/TP Indicators Lingering After Closing a Trade
- **Root Cause**: When closing all positions on Hypernova (or Kalshi Pro), the exchange unmounts the Positions `<table>` completely and renders an empty-state container (`"No Open Positions"` / `"Opened positions will appear here"`), while Hypernova's tab changes from `"Positions (1)"` to bare `"Positions"` (no `(0)` badge). Because no `<table>` was found, `scrapeVenueOpenPositionsWithMeta()` returned `foundTable: false`, causing `getMergedVenueOpenPositions()` to keep serving cached `lastKnownDomPositions` / `lastApiCapturedPositions` — leaving both the Entry Box (`LONG`/`SHORT`) and SL/TP Box stuck on the chart while flat.
- **Fixes (`content/content-isolated.js`, `content/content-main.js`)**:
  - Treats the `Positions` panel as authoritatively empty (`foundTable: true, positions: []`) whenever the `Positions` tab is selected with 0 rows OR an empty-positions state (`"No Open Positions"` / `"Opened positions will appear here"`) is visible in the DOM (on Hypernova, Kalshi Pro, and My Funded Perps).
  - Immediately clears BOTH `lastKnownDomPositions` and `lastApiCapturedPositions` on empty state (or when Hypernova's `Positions` tab has no count badge, or when Hypernova's order ticket shows `Current Position: FLAT`, or when a live `/positions` API endpoint returns `[]`).
  - Prunes closed symbols out of `hypernovaManualTpSlBySymbol` and immediately removes all Entry / TP / SL overlay widgets and lines as soon as `VEST_TV_HYPERNOVA_POSITIONS_UPDATE` reports flat, and tightens native TradingView PositionLine matching so regular chart drawings never resurrect phantom positions.

---

## [v1.1.145] — 2026-11-25

### 🛡️ Fixed Cortex Pill, Bars & Minimized Docks Bleed-Through Above Site Modals
- **Root Cause**: Persistent Trading Cortex overlays (`#vest-studio-header-pill`, `#vest-chart-trades-box`, `#vest-chart-diagnostics-box`, `#vest-chart-news-box`, `#vest-bottom-panel-topbar-pill`, `#vest-chart-range-box`, `#vest-chart-ob-stats-box`, `#vest-cortex-top-bar`, detached bottom panel, and Accounts Risk canvas) were set to sky-high `z-index` values (`1000`–`2147483640`), causing them to paint brightly ABOVE native exchange modals and dimmed backdrops (e.g., Vest's `"Create Your Custom Account"` modal at `z-50`).
- **Fixes (`content/template-bar.css`, `content/content-isolated.js`, `content/content-main.js`)**:
  - Lowered all persistent Cortex bars, floating pill, minimized dock pills, chart boxes, Accounts Risk overlay, and detached panel into a clean below-modal stacking band (`z-index: 10`–`38`) while keeping Cortex's own opened Settings/Editor modals and active dropdown flyout on top.
  - Removed the legacy `header.style.setProperty('z-index', '1005', 'important')` override so exchange navbars keep their native stacking behind exchange modals.
  - Added a live **Site Modal Stacking Guard** (`detectOpenSiteModalOverlay` + `body.vest-site-modal-open`) that detects open exchange dialogs or full-screen fixed backdrops (even without `role="dialog"`), auto-closes Cortex's dropdown menu if open, and drops all persistent Cortex overlays to `z-index: 1 !important` so they always sit cleanly behind any exchange modal.

---

## [v1.1.144] — 2026-11-22

### 🎯 Fixed Position Box & TP/SL Submission on Kalshi Pro + Passive API/Fiber Open Positions on My Funded Perps
- **Kalshi Pro Live DOM & Modal Wiring (`content/content-isolated.js`, `content/content-main.js`)**:
  - Fixed Kalshi Pro symbol normalization so `KX*PERP` chart tickers (`KXTSMPERP`, `KXHYPEPERP`, `KXUSTECH100PERP`) match the Positions blotter base names (`TSM`, `HYPE`, `USTECH100`).
  - Added a dedicated dual-mode Kalshi Pro blotter scraper (`div[data-perps-blotter="true"]`) supporting BOTH Kalshi Pro's **Cards layout** (`[role="list"][aria-label="Positions"] li`) and **Desktop Table layout** (`[role="table"] [role="row"]`), parsing stacked `Entry / Liq` and `Position` cells, `[data-side="short"|"long"]`, and `[data-tpsl-focus="take_profit"|"stop_loss"]`.
  - Wired Kalshi Pro's exact `Edit TP/SL` modal (`#perps-tpsl-title`, `#perps-tpsl-tp-price`, `#perps-tpsl-sl-price`, `Confirm`, `Delete`), including an **auto-fill guard** that clears Kalshi's pre-filled +15%/-15% opposite field when no existing TP/SL was set so only your dragged TP or SL is submitted.
- **My Funded Perps Tab-Independent Live Positions + Ticker Extraction (`content/content-isolated.js`, `content/content-main.js`)**:
  - Added passive API (`fetch`/`XHR`) and React Fiber live open-position capture (`extractOpenPositionsFromApiPayload` + `scanReactFiberForOpenPositions`) bridged via `VEST_TV_API_POSITIONS_CAPTURED` so your open position box & TP/SL lines render on My Funded Perps even while viewing the **`Accounts`** or **`Open Orders`** tab instead of `Positions`.
  - Stopped wiping cached positions when switching away from the `Positions` tab, stripped leverage prefixes (`5x`, `10x`) before parsing ticker names (`extractSymbolFromCellText`), and periodically re-broadcast live positions so newly recreated TradingView iframes on coin switches hydrate immediately.

---

## [v1.1.143] — 2026-11-22

### 🌐 Rolled Out Interactive Chart Visuals & Trade Controls to My Funded Perpetuals & Kalshi Pro
- **Per-Firm Rollout (`Hypernova`, `My Funded Perpetuals`, `Kalshi Pro`)**:
  - Enabled the full Chart Visuals & Trade Controls suite (**ON by default**, with independent per-firm toggles and styling) across **My Funded Perpetuals** (`myfundedperpetuals.com`) and **Kalshi Pro** (`pro.kalshi.com` / `kalshi.com`) alongside **Hypernova** (`app.hypernova.xyz`), while keeping Vest Markets untouched.
  - Each supported firm now has its own **Chart Visuals & Trade Controls** panel inside **Perp Firm Settings** plus a 1-click **`<Venue> Chart Visuals...`** shortcut inside the Cortex dropdown menu.
  - Includes the 2-row **`LONG`/`SHORT` Position Entry Box** (`BE` / draggable `TP` / draggable `SL` / `×` close + qty, PnL, entry price), glowing **Green TP & Red SL Dollar + Price Boxes**, direct styling of TradingView's **existing native Current Price line** with customizable **`"Current Price"` label**, and live **font size sliders** for both the label and trade boxes.
- **Multi-Venue Positions Scraper & Order Submission (`content/content-isolated.js`, `content/content-main.js`)**:
  - Extended position scraping to parse My Funded Perpetuals's Base UI table (`table[data-slot="table"]`, dedicated `Side` column, `Total trade` PnL column, `[data-slot="empty"]` filtering) and Kalshi Pro (`Contract`/`Ticker`, `Yes`/`No` or `Long`/`Short` sides), alongside Hypernova's exact `data-testid` rows.
  - Extended TP/SL modal detection and input matching to support Base UI dialogs/popovers/sheets (`[data-slot="dialog-content"]`, `[data-slot="popover-content"]`), MFP input IDs (`#take-profit-price`, `#stop-loss-price`), row edit/pencil action buttons, venue-specific price tick precision, and native TradingView TP/SL order-line cancel callbacks.

---

## [v1.1.142] — 2026-11-22

### 🚀 Live Hypernova TP / SL / Breakeven & Close Submission (Exact DOM Wiring)
- **Root Causes Found via Live Hypernova DOM Inspection**:
  1. Hypernova's TP/SL trigger in the Positions table is a `<span data-testid="position-tpsl">` wrapping a pencil `<svg>`; our previous selector matched the child `<svg>` (which has no `.click()` method), so Hypernova's TP/SL modal never opened.
  2. Hypernova encodes Long/Short directly on the table row class (`tr.trade-positions-row-short` / `trade-positions-row-long`) and uses exact `data-testid` attributes on every modal input (`tpsl-tp-price-input`, `tpsl-sl-price-input`) and button (`tpsl-confirm`, `tpsl-cancel`), plus Radix dropdown triggers (`close-position-menu-trigger`) that require `PointerEvent('pointerdown')`.
  3. Hypernova validates order prices using 5 significant figures (e.g., integer ticks for BTC `$60,648`, 3 decimals for HYPE `$62.632`).
- **Fixes (`content/content-isolated.js` & `content/content-main.js`)**:
  - Automatically ensures the `Positions` tab is active, locates the exact `tr[data-testid^="positions-row-"]` by `[data-testid="symbol-text"]`, clicks `[data-testid="position-tpsl"]` with full pointer/mouse events, waits for `[role="dialog"][data-testid="tpsl"]`, fills `tpsl-tp-price-input` / `tpsl-sl-price-input` using 5-sig-fig / row-precision formatting + React `_valueTracker` reset, waits for `[data-testid="tpsl-confirm"]` to become enabled, submits, and confirms dialog closure.
  - Wired `×` clear on TP/SL boxes to submit cleared values and wired `×` close on the entry box to trigger Hypernova's Radix `close-position-menu-trigger` → Market Close.
  - Added `VEST_TV_HYPERNOVA_TP_SL_RESULT` feedback so rejected/invalid prices (e.g., SL placed on wrong side of Mark Price) show Hypernova's error and cleanly revert the optimistic chart line, while confirmed orders lock straight to Hypernova's live Positions row.

---

## [v1.1.141] — 2026-11-22

### 🎯 Style Hypernova's Existing Native Current Price Line Directly + Font Size Sliders
- **Modified TradingView's Existing Native Price Line (Zero Duplicate Lines)**:
  - Removed the secondary canvas line that overlapped Hypernova's native current price line.
  - Instead directly styles TradingView's existing native `mainSeriesProperties` (`showPriceLine`, `priceLineColor` with opacity, `priceLineWidth`, `priceLineStyle`) and hooks TradingView's native `SeriesPriceLinePaneView` renderer so your chosen **color, opacity, thickness, and solid/dashed/dotted style** apply directly to the single native price line at full native refresh rate, and cleanly restores the original native line when toggled OFF.
  - Renders only the crisp customizable `"Current Price"` label pill cleanly along that native line (when Show Label is enabled).
- **Configurable Font Sizing**:
  - Added **Label Font Size** slider (`8px–22px`, default `11px`) for the `"Current Price"` pill label (auto-scales pill height, padding, and live dot).
  - Added **Trade & TP/SL Box Font Size** slider (`8px–18px`, default `11px`) that proportionally scales the 2-row Position Entry Box (`LONG`/`SHORT`, Qty, PnL, `BE`/`TP`/`SL`/`×`, Entry Price) and the Green TP / Red SL boxes in real time via CSS custom properties.

---

## [v1.1.140] — 2026-11-22

### ✨ Hypernova Chart Visuals & Interactive Trade Controls (On by Default + Individual Toggles)
- **Interactive 2-Row Position Entry Box (`LONG` / `SHORT`) on Hypernova Charts**:
  - Displays a sleek dark floating card locked to your entry line showing **`LONG`** / **`SHORT`**, position size, live PnL (`+$XX.XX` / `-$XX.XX`), and **`×`** close button on row 1, plus **`BE`** (Breakeven), **`TP`** (grab & drag vertically), **`SL`** (grab & drag vertically), and your formatted entry price on row 2.
  - Clicking **`BE`** snaps your Stop Loss directly to your entry price (`$0.00`) and syncs it to Hypernova's TP/SL controls.
  - Grabbing & dragging **`TP`** or **`SL`** vertically drags a live line directly on the chart and submits the updated target to Hypernova on release.
- **Green Take Profit & Red Stop Loss Visual Boxes**:
  - Renders a styled **green Take Profit box** and **red Stop Loss box** right on each line showing both the **projected dollar PnL (`+$XX.XX` / `-$XX.XX`)** and the **exact line price**, with direct vertical re-drag support, a `×` clear button, and automatic anti-overlap shifting when Stop Loss sits on Breakeven.
- **Fully Customizable "Current Price" Line**:
  - Draws a customizable live price line across the chart with label text defaulting to **`"Current Price"`** (plus optional live price readout), configurable line color, solid/dashed/dotted style, thickness (`1px–4px`), opacity (`15%–100%`), and left/center/right label alignment.
- **Hypernova Settings Toggles (All ON by Default)**:
  - Added a dedicated **"Hypernova Chart Visuals & Trade Controls"** section inside **Perp Firms → Hypernova** (plus a 1-click **"Hypernova Chart Visuals..."** shortcut in the Cortex dropdown menu on Hypernova) with individual toggle switches for the entire suite, Position Entry Box, Green TP / Red SL Boxes, and Custom Current Price Line — all enabled by default with live instant chart preview.

---

## [v1.1.139] — 2026-11-21

### 🛠️ Fixed Chart Auto-Resizing / Snapping Back Every 1.5s & On Every Price Tick
- **Root causes identified via full scale/zoom audit of `content/content-main.js`**:
  1. **`activeChartApi.activeChart() !== activeChart` every 1.5 seconds**: TradingView's `activeChart()` returns a fresh API wrapper object on every call, causing our 1500ms maintenance interval to falsely fire `handleInstrumentOrChartSwitch('active_chart_replaced')` every 1.5 seconds — which repeatedly called `psApi.setAutoScale(true)` and `internalPs.setAutoScale(true)`, snapping your manual chart resize right back!
  2. **Ticking price in `document.title` treated as an instrument switch on My Funded Perps**: `getLiveInstrument()` fell back to `doc.title.split('|')[0]` — which on My Funded Perps is the live ticking price (`"59,501.4 | BTC Perpetual Futures | MyFundedPerps"`), firing `handleInstrumentOrChartSwitch()` and `setAutoScale(true)` on every price tick!
  3. **Internal `model.resetScroll()` & `resetPriceScale` hijacking**: Stopped intercepting TradingView's internal `model.resetScroll()` and `resetPriceScale`/`timeScaleReset` calls so they no longer replay `applyLastKnownChartConfiguration()` (4x passes overwriting `barSpacing`, `rightOffset`, and `autoScale`).
- **Fixes**:
  - Compares underlying chart widget/model & symbol identity in the 1.5s maintenance poll instead of wrapper object identity.
  - Rejects numeric/price strings in `getLiveInstrument()`, reads `/trade/<SYMBOL>` from the URL path first, scans non-price `doc.title` segments, and normalizes base assets (`BTC` vs `BTC-USD`) so formatting aliases never trigger false switches.
  - Only resets `autoScale` in `handleInstrumentOrChartSwitch()` on a genuine symbol switch (e.g., `BTC` → `ETH`), never on wrapper refreshes or same-symbol ticks.

---

## [v1.1.138] — 2026-11-21

### 🎯 Eliminated Cortex Pill Snap-Back Flash on Drag Release
- **Root cause**: On `pointerup`, `removeDragShield()` and `isDraggingStudioPill = false` ran before `settings.studioPillPosByHost` was updated and persisted — and `queueSettingsSave` debounced the write, allowing `MutationObserver` / in-flight `chrome.storage.onChanged` echoes to flash the pill back to its previous coordinates for ~300ms before settling on the new drop spot.
- **Fix (`content/content-isolated.js`)**:
  - Commits `settings.studioPillPosByHost` and flushes immediately via `safeStorageSet()` *before* clearing `isDraggingStudioPill` and removing the drag shield.
  - Protects local `studioPillPosByHost` for 3 seconds (`lastLocalStudioPillPosSavedAt`) inside both `chrome.storage.onChanged` and `handleIncomingLiveSettings` so stale storage echoes can never bounce the pill back, and ignores `#vest-studio-pill-drag-shield` in `panelObserver`.

---

## [v1.1.137] — 2026-11-21

### 🖱️ Silky Fast-Drag Across TradingView Iframes (`setPointerCapture` + Drag Shield)
- **Root cause**: When dragging the floating Cortex pill fast enough for the pointer to cross over TradingView's chart `<iframe>`, the iframe swallowed `pointermove`/`pointerup` events from the top window (and background `renderStudioHeaderPill()` updates could also replace the button mid-drag).
- **Fix (`content/content-isolated.js`)**:
  - Uses `triggerBtn.setPointerCapture(pointerId)` plus a temporary transparent full-screen drag shield (`#vest-studio-pill-drag-shield`, `z-index: 2147483639`) while dragging so TradingView iframes can never steal pointer events at any speed.
  - Skips `renderStudioHeaderPill()` DOM rebuilds while `isDraggingStudioPill` is active, and cleanly releases the drag shield on `pointerup` / `pointercancel` / `blur`.

---

## [v1.1.136] — 2026-11-21

### 📊 Fixed Blown-Up Candles & Locked Price Scale When Switching Timeframes
- **Root cause (`content/content-main.js`)**:
  1. `applyViewportStateToChart()` replayed historical `setVisibleRange({ from, to })` timestamps and locked `setAutoScale(false)` + stale `setVisiblePriceRange()` when switching timeframes — squeezing a narrow lower-timeframe timestamp window & price range onto higher timeframes (e.g. `5m` → `1h`), blowing candles up into giant bars shooting off the top and bottom of the chart.
  2. Pending `chartSettingsCaptureDebounceTimer` saves from the *previous* timeframe could fire right after `activeChart.resolution()` flipped, polluting the new timeframe's saved viewport with the old timeframe's scale.
  3. Delayed restore timers (`100ms` / `480ms` / `750ms`) were not cancelled when the user scrolled, dragged, or resized.
- **Fix**:
  - Removed stale `setVisibleRange()` and locked `setVisiblePriceRange()` replays from `applyViewportStateToChart()`; restores only sane clamped `barSpacing` (`4–24px`) and `rightOffset` (`2–25`) while keeping Auto-Scale (`setAutoScale(true)`) active across timeframe switches so candles always frame cleanly.
  - Cancels pending viewport saves immediately on interval switch with a `1400ms` cross-timeframe contamination guard (`intervalSwitchSaveBlockUntil`).
  - Added `viewportRestoreGeneration` cancellation in `markLocalChartInteraction()` so touching, scrolling, or resizing the chart instantly aborts any pending restore pass.

---

## [v1.1.135] — 2026-11-21

### ✨ Complete Floating, Draggable Cortex Pill Package (Top-Middle of Viewport)
- Ensures the full floating, draggable **Cortex** pill implementation (`.vest-studio-pill-floating` + 6-dot drag grip CSS in `template-bar.css`, top-middle viewport alignment, smooth drag with `5px` click threshold, per-host saved position `studioPillPosByHost`, double-click grip to re-center, and bottom minimized dock decoupling in `content-isolated.js`) is packaged cleanly on `dev`.

---

## [v1.1.134] — 2026-11-21

### ✨ Floating, Draggable Cortex Pill (Aligned Top-Middle of Viewport)
- Converted the **Cortex** pill (`#vest-studio-header-pill`) into a sleek **floating, draggable pill** mounted directly on `document.body` (`position: fixed`, `z-index: 2147483640`) so it stays 100% visible on every exchange (Vest, My Funded Perps, Hypernova, Kalshi) with zero toolbar conflicts or third-party overlay occlusion (`TradeUnison`, `TV`/`Vela`).
- **Top-Middle Default Alignment**: Automatically centers horizontally at the top-middle of the viewport (`top: 10px`) and stays centered on window resize until dragged.
- **Smooth Drag + Per-Venue Memory + Double-Click Re-Center**: Includes a subtle 6-dot drag grip (`⋮⋮`), `5px` click-vs-drag threshold (clicking still opens the Cortex menu cleanly), per-exchange saved position (`settings.studioPillPosByHost`), viewport clamping on resize, and double-clicking the drag grip snaps it right back to top-middle.
- **Bottom Minimized Windows Dock Preserved**: Minimized windows continue docking cleanly at the exact bottom of the chart viewport (hiding completely when 0 windows are minimized).

---

## [v1.1.133] — 2026-11-21

### 📐 Fixed Chart Snapping Back on Resize + Same-Iframe Overlay Clearance
- **Stopped `ensureCortexTopBar()` from overwriting `react-resizable-panels` splitter sizing**: Removed the per-second `chartBottomMount.afterEl.style.flex = '1 1 auto'` overwrite on managed/resizable containers and prevented `findChartBottomDockMountPoint()` from walking past `[data-panel]` or mounting inside `[data-panel-group]` splitter groups (which caused dragged chart heights to snap back to default every 1 second).
- **Fixed recursive `model.resetScroll()` interceptor & iframe focus tracking (`content/content-main.js`)**: Guarded `model.resetScroll` against re-entering `handleResetChartViewTrigger` during resets/restores, armed the 15s local interaction shield on top-window resize/pointer drags, and checked `hasLiveWindowFocus()` when saving chart viewport adjustments so newly mounted iframes immediately persist your custom zoom/scale.
- **Same-iframe overlay clearance (`dockStudioPillNextToMarketSelector`)**: Extended `targetDoc.elementFromPoint()` to offset `margin-left` past floating `position: fixed`/`absolute` overlays (like `TradeUnison`) even when those overlays are injected inside the chart `<iframe>` rather than the top document.

---

## [v1.1.132] — 2026-11-21

### 🎯 Top-Document Overlay Clearance (`TradeUnison`) on Both Vest & My Funded Perps
- **Root cause**: `TradeUnison` floats as a `position: fixed` / `absolute` overlay in the **top document** directly over the TradingView iframe toolbar starting at `Indicators.right` — covering `#vest-tv-cortex-toolbar-slot` on both **Vest** and **My Funded Perps** without being visible to `iframe.contentDocument.elementFromPoint()`.
- **Fix (`dockStudioPillNextToMarketSelector`)**:
  - Restored My Funded Perps to mount `| CORTEX |` on TradingView's `Indicators` toolbar row (the exact same bar as `TradeUnison`), keeping the minimized windows dock below the chart.
  - Added a top-document `document.elementFromPoint()` occlusion check across `slot`'s screen coordinates: whenever a floating third-party overlay (such as `TradeUnison`) sits over `Indicators.right`, Cortex automatically offsets `margin-left` past the overlay's full right edge (`ovRect.right + 8px`) so `| CORTEX |` sits visibly right next to it on the exact same bar — and sits immediately after `Indicators` when no overlay is present.

---

## [v1.1.131] — 2026-11-21

### 🎯 Visible Chart Header Pill on My Funded Perps + Native `group-*` Class & `elementFromPoint` Self-Check on Vest
- **My Funded Perps**: Mounts `| CORTEX |` directly in My Funded Perps's visible chart header bar (`div.flex.h-8...`, right after the `[+]` tab button and before `div.ml-auto` `Alerts · Price Chart`) instead of inside the hidden TradingView iframe toolbar, so both the **Cortex pill** and the **bottom minimized windows dock** are 100% visible.
- **Vest / TradingView**: Copies TradingView's native `group-*` class onto `#vest-tv-cortex-toolbar-slot`, enforces `!important` visibility & `z-index: 9999`, and adds a live `elementFromPoint()` self-check that hops right past any covering sibling if another toolbar element overlaps the slot.

---

## [v1.1.130] — 2026-11-21

### 🎯 Fixed Vest Cortex Pill Matching Third-Party `indicator` Buttons Before `#header-toolbar-indicators`
- **Root cause verified via live DOM**: `querySelectorAll('#header-toolbar-indicators, ..., [title*="indicator" i]')` returns elements in **document order**, not selector order — so on Vest, third-party toolbar buttons (`TV`/`Vela` at `x = 211px`) with `"indicator"` in their `title`/`aria-label` matched *before* TradingView's native `#header-toolbar-indicators` (`x = 550.5px`), placing `#vest-tv-cortex-toolbar-slot` at `x = 211.84px` right on top of `1m 4h`.
- **Fix**: Split `#header-toolbar-indicators, [data-name="open-indicators-dialog"]` into its own primary query so native TradingView `Indicators` always wins over third-party buttons.

---

## [v1.1.129] — 2026-11-21

### 🎯 Fixed Bottom Dock Covering Top Toolbar on My Funded Perps (`position: absolute` Chart Iframe)
- **Root cause verified via live DOM**: On My Funded Perps, the Cortex pill (`#vest-studio-header-pill`) was already mounted at the exact right spot inside TradingView's `innerWrap-P4LQzYFS` immediately after `#header-toolbar-indicators`, **but** the chart `<iframe>` is `position: absolute` inside `div.relative.bg-surface.h-full.min-h-0` — causing `vest-cortex-bottom-dock` (`position: relative`) to stack at `y = 0` (`top: 141px`, the top of the chart) and cover TradingView's entire top toolbar + Cortex pill!
- **Fix (`findChartBottomDockMountPoint`)**: Walk up past any `position: absolute` / `fixed` wrapper (up to 7 levels) and skip horizontal `flex-row` parents until reaching an **in-flow** child of the vertical `flex-column` chart container so `vest-cortex-bottom-dock` always sits below the chart viewport and never covers the top toolbar.
- **Ghost slot cleanup**: Remove any stale empty `#vest-tv-cortex-toolbar-slot` left in the top document once the pill mounts inside the TradingView iframe.

---

## [v1.1.128] — 2026-11-21

### 🎯 Width-Verified TradingView Toolbar Walk, Timeframe Favorites Conflict Fix & Canvas Chart Fallback
- **Prevented `toolbarRow` overshoot on Vest & TradingView**: Replaced the fixed 2-level parent jump in `findTradingViewIndicatorsAnchor()` with a width-verified walk (`parentRect.width >= 280 && visibleChildren >= 2`) so `#vest-tv-cortex-toolbar-slot` is always inserted inside the actual flex `toolbarRow` right after `Indicators` and never overshoots into the outer `.wrap-*` container.
- **Stopped `1m 4h` timeframe favorites from fighting Cortex pill**: Excluded `#vest-tv-cortex-toolbar-slot` from `renderTimeframeFavorites()`'s third-party `Vela` anchor scan in `content/content-main.js`.
- **My Funded Perps `<canvas>` chart & in-container header detection**: Added largest-`<canvas>` chart viewport detection to `findChartBottomDockMountPoint()` and expanded Tier 3 custom chart header bar detection to match `Price Chart` / `Alerts` bars whether mounted immediately above or at the top edge inside the chart container.

---

## [v1.1.127] — 2026-11-21

### 🎯 My Funded Perps Chart Header Bar & Compact TradingView Toolbar Support
- Expanded `findTradingViewIndicatorsAnchor()` in `content/content-isolated.js` with 3-tier anchor resolution so the **`| CORTEX |`** pill and **bottom-of-chart minimized windows dock** work reliably on exchanges that hide TradingView's native `Indicators` button or render a custom chart header bar (such as **My Funded Perps**):
  1. Standard TradingView `Indicators` button (`#header-toolbar-indicators`, `[data-name="open-indicators-dialog"]`, icon-only `aria-label`/`data-tooltip`/`title` indicators button, or text `Indicators`).
  2. Compact TradingView native toolbar fallback (`#header-toolbar-chart-styles`, `#header-toolbar-intervals`, `#header-toolbar-symbol-search`).
  3. Custom exchange chart header bar directly above the chart iframe (`NVDA · 5m · ... | CORTEX | ... Alerts · Price Chart`), mounting `| CORTEX |` right after the left-side chart controls and switching minimized windows to the bottom dock below the chart viewport.

---

## [v1.1.126] — 2026-11-21

### 📁 Right-Click Flyout Menu Template Groups (`+ New Group...`, Collapsible Folders & Inline Move Picker)
- Wired collapsible **Template Groups** directly into the right-click **Cortex Templates** flyout submenu (`openTemplatesFlyoutSubmenu` in `content-main.js`) with full persistence in `content-isolated.js`:
  - **`+ New Group...`** inline form right under `Template Manager...` (no blocking `window.prompt()` inside TradingView iframes).
  - **Collapsible folder headers** (`▾ 📁 Group Name (N)`) with persistent open/collapsed state (`collapsedTemplateGroups`), inline **Rename (`✎`)**, and **Delete (`×`)** (keeps templates ungrouped).
  - **Inline Move to Group (`📁`)** button on every template row opening a one-click pill bar (`Ungrouped`, existing groups, or `+ New...`) directly inside the menu.

---

## [v1.1.125] — 2026-11-21

### 🌐 Sync Globally Scope Modal (Current Venue vs. All Venues + Index Price Warning)
- Clicking **Sync globally** on a drawing now opens a dedicated confirmation modal (`openGlobalSyncScopeModal`) letting you choose between:
  - **Current Venue Only** *(Recommended)* — syncs across all charts & timeframes on the current exchange with exact venue pricing (`syncScope: 'venue'`, matched via `sourceHost` in `restoreGlobalDrawings()`).
  - **All Venues (Cross-Exchange)** — syncs across all exchanges (`syncScope: 'all'`), displaying an amber warning explaining that each venue uses its own index/mark price feed so pricing may be slightly off and FVGs/Order Blocks may not be identical across venues.

---

## [v1.1.124] — 2026-11-21

### 🎯 Exact TradingView `toolbarGroup -> toolbarRow` Placement for Cortex Pill
- Matched the exact proven 3-level TradingView toolbar hierarchy (`#header-toolbar-indicators` → `.group-*` → `.inner-*` toolbar row) used by `#vest-timeframe-favorites`, inserting `#vest-tv-cortex-toolbar-slot` (`| CORTEX |`) as a direct sibling immediately after the `Indicators` group with matching flex `order` and `z-index: 25` so it sits visibly right after `Indicators` without clipping or drifting behind timeframe buttons.

---

## [v1.1.123] — 2026-11-21

### 🎯 Pinned Cortex Pill Immediately After `Indicators` Button
- Mounted `#vest-tv-cortex-toolbar-slot` (`| CORTEX |`) directly inside the `Indicators` button's own flex container immediately after `Indicators` (`display: inline-flex; width: auto; overflow: visible`) so it inherits the exact same flex order and always sits immediately to the right of `Indicators` instead of drifting left behind timeframe buttons.

---

## [v1.1.122] — 2026-11-21

### ⚡ 5-Second Auto-Update Polling (Zero GitHub API Rate Limits)
- Added `checkForUpdatesFastRaw()` in `background/service-worker.js` using unthrottled `raw.githubusercontent.com/<branch>/manifest.json` with cross-tab deduplication (`4.2s` window) so multiple open trading tabs never duplicate network traffic or hit GitHub's 60/hr API rate limit.
- Added a 5-second `autoUpdatePollTimer` in `content-isolated.js` (active only while the tab is visible and `autoCheckUpdates !== false`) so the Cortex pill lights up within 5 seconds of any new dev or release push.

---

## [v1.1.121] — 2026-11-21

### 🏷️ Renamed Injected Template Menu to "Cortex Templates"
- Renamed the injected drawing context-menu row and floating drawing toolbar selector from `Template` to **`Cortex Templates`** so it is immediately distinct from TradingView's native `Template` menu.

---

## [v1.1.120] — 2026-11-21

### 🛠️ Fixed Cortex Pill Visibility Inside TradingView Chart Iframe Toolbar
- **Self-Contained Iframe Toolbar Styling & Top-Level Toolbar Insertion**:
  - Added `ensureCortexPillStylesInDoc(targetDoc)` in `content-isolated.js` to inject the Cortex pill & separator CSS directly into TradingView's chart `<iframe>` `<head>` (solving missing styles in `about:blank`/`blob:`/`srcdoc` chart iframes).
  - Updated `findTradingViewIndicatorsAnchor()` to walk up to the full horizontal toolbar strip (`width >= 300px`, `>= 3` items) and insert `#vest-tv-cortex-toolbar-slot` (`| CORTEX |`) right after the `Indicators` group using `targetDoc.adoptNode(pill)` so it is never clipped inside a narrow wrapper.

---

## [v1.1.119] — 2026-11-21

### 📁 Collapsible Drawing Template Groups in Right-Click `Template ▸` Menu & Template Manager
- **Organize Right-Click `Template ▸` Menu Into Groups**:
  - Added **`+ New Group...`** directly inside the right-click `Template ▸` submenu and a quick **`📁`** assign-group action on every template row.
  - Grouped templates render under collapsible folder headers (`▾ FVGs (6)`, `▾ Order Blocks (2)`) with persisted expand/collapse state, while ungrouped templates stay cleanly listed below.
- **Full Group Management in Template Manager**:
  - Added **`+ New Group`**, interactive group filter/delete chips (deleting a group safely ungroups its templates), an inline **Group `<select>`** on every template card, and a **Menu Group** field with autocomplete in the Template Editor.

---

## [v1.1.118] — 2026-11-21

### 🔄 Fixed Updater Automatic Extension Reload & Trading Browser Window Refresh
- **Post-Update Runtime Reload + Multi-Window Tab Refresh**:
  - Updated `update/update.js` to set `pendingPostUpdateTabReload` and trigger `reloadExtensionAndTradingTabs` immediately after disk flush (instead of skipping tab reloads).
  - Added `checkAndRunPendingPostUpdateTabReload()` and `getTradingTabUrlPatterns()` in `background/service-worker.js` so as soon as Chrome reloads the updated extension, it automatically refreshes **all open trading browser tabs/windows** across Vest Markets, Hypernova, My Funded Perpetuals, Kalshi Pro, and any custom perp firms with the brand-new code.

---

## [v1.1.117] — 2026-11-21

### 📌 Bottom-of-Chart Minimized Windows Dock (Directly Below Chart Iframe)
- **Clean Bottom-of-Chart Dock (`vest-cortex-bottom-dock`)**:
  - Added `findChartBottomDockMountPoint()` in `content-isolated.js` to mount the minimized windows dock directly **below the chart viewport's `<iframe>`** (outside the viewport, in normal document flow).
  - Automatically hides (`display: none`, `0px` height) when zero windows are minimized—removing the old top black bar completely on chart pages now that the Cortex pill lives in TradingView's top chart toolbar.
  - Instantly appears whenever any floating Cortex window (`INSTRUMENT TRADES`, `OB STATS`, `UPCOMING NEWS`, `CORTEX DIAG`, `RANGE DETECTOR`, `POSITIONS`) is minimized and automatically repositions all minimized pills into the dock.

---

## [v1.1.116] — 2026-11-21

### ✨ Moved Cortex Pill Into TradingView's Top Chart Toolbar (After Indicators)
- **Native TradingView Top Toolbar Placement (`#vest-tv-cortex-toolbar-slot`)**:
  - Added `findTradingViewIndicatorsAnchor()` in `content-isolated.js` to locate TradingView's `Indicators` button (both in top-level charts and same-origin chart iframes) and mount a compact `26px` Cortex pill right after `Indicators`, flanked by clean vertical separators (`| CORTEX |`).
  - Updated `updateStudioDropdownPosition()` with iframe offset translation so clicking `CORTEX` inside TradingView's iframe opens the full Cortex dropdown menu on `window.top` directly beneath the pill with zero clipping.
  - Automatically falls back to the Cortex top bar on non-chart pages (e.g., Portfolio / Markets).

---

## [v1.1.115] — 2026-11-21

### 📌 Viewport-Clamped Extended FVG Boxes & Always-Visible Centered Text on Lower Timeframes
- **Viewport-Bounded Text Alignment (`adjustRectanglePaneViewLabel`)**:
  - Upgraded the TradingView rectangle pane-view hook so extended or wide HTF FVG rectangles (e.g., `1H FVG`, `4H FVG`, `15M FVG`) clamp their visible text span strictly to `[0, paneWidth]` (never past the right edge of the viewport).
  - Centered text now re-centers automatically inside the **visible portion** of the rectangle when you switch down to lower timeframes (`5m`, `1m`), and left/right-aligned labels stay cleanly anchored inside the viewport instead of scrolling off-screen.
- **Canvas Auto-FVG Viewport Clamping (`renderAutoFvgsOnCanvas`)**:
  - Clamped canvas-rendered Auto FVG rectangles strictly to `[0, cssWidth]` so extended FVGs stop cleanly at the right edge of the viewport without overflowing past it.

---

## [v1.1.114] — 2026-11-21

### 🧠 Interactive Order Block Move/Resize & On-Device Adaptive OB Learning Engine
- **Move & Resize Any Order Block Directly on Chart**:
  - Added a compact **`✥`** move handle beside the **`×`** dismiss button on every Order Block (native chart & MTF `5m`/`15m`/`1h`/`4h`), plus hover-revealed 4-edge resize handles (Top, Bottom, Left, Right).
  - Dragging **`✥`** moves the entire box to any candle/price; dragging any edge resizes top/bottom price or start/end candle—automatically suppressing chart pan during the drag and persisting exact adjustments in `settings.orderBlocks.customOrderBlockOverrides`.
- **Adaptive Order Block Learning Engine (`deriveOrderBlockLearningProfile`)**:
  - Every **`×`** removal logs the rejected OB's structural features (`closeBreak`, `fvgRatio`, `dispRatio`, `originOffset`), and every **move/resize** logs candle shift (`deltaBars`) and zone style (`body` vs `wick`).
  - Automatically adapts future Order Block detection as feedback accumulates (e.g., requiring close-based BOS, raising minimum FVG/displacement ratios, switching between body-only vs full-wick zones, and tuning origin candle selection).
  - Added an **Adaptive OB Learning Engine** card in **Settings → Charting Indicators → Order Blocks** displaying live feedback sample counts, active learned rules, an enable/disable toggle, and 1-click **Reset Learned Data** / **Reset Moved/Resized** controls.

---

## [v1.1.113] — 2026-11-21

### 📐 Fixed Hypernova Fixed-Header Overlap via Self-Measuring In-Flow Offset
- **Clears Hypernova's `position: fixed` Top Header (`Active Assessment` / `A1`)**:
  - Updated `ensureCortexTopBar()` on Hypernova to mount inside `<main>` when `<main>` uses `padding-top` to clear the fixed header, and self-measure `bar.getBoundingClientRect()` against `headerEl.getBoundingClientRect().bottom` and `getHypernovaChartLeftInset()` so `#vest-cortex-top-bar` always sits cleanly **below** `Active Assessment` / `A1` and pushes the ticker/chart workspace cleanly below it.

---

## [v1.1.112] — 2026-11-21

### 📐 Hypernova In-Flow Cortex Top Bar (`vest-cortex-inflow-bar`)
- **Dedicated In-Flow Layout Div Between Header & Chart**:
  - Added `findHypernovaInflowMountPoint()` in `content-isolated.js` and `#vest-cortex-top-bar.vest-cortex-inflow-bar` (`position: relative; width: 100%; flex-shrink: 0; z-index: 5`) in `template-bar.css`.
  - Instead of floating with `position: fixed` over Hypernova's `Active Assessment` / `A1` header row, the Cortex black bar now inserts directly into normal document flow right between Hypernova's top header and the trading workspace below—pushing both top and bottom content cleanly outside of its own container with zero overlap over headers, dropdowns, or pull-out sidebars.

---

## [v1.1.111] — 2026-11-21

### 🛠️ Fixed Chart Viewport Snap-Back on Resize & Cross-Tab / Cross-Exchange Viewport Fighting
- **Eliminated Child-Iframe Focus Poisoning & Stale `settingsMeta` Replay**:
  - Restricted `syncChartMemoryFocusState()` strictly to `isTopWindow` so TradingView child iframes never overwrite the active tab's focus state with `focused: false` during clicks or resizes.
  - Cleared `lastChartSettingsMeta` immediately after `notifyMainWorldConfig()` dispatches it so unrelated config updates (account sync, OB stats, settings changes) never replay an old viewport.
- **Protected Resized / Active Charts & Isolated Viewports by Host**:
  - Added `lastLocalChartInteractionAt` tracking across `resize`, `wheel`, `pointerdown`, `mousedown`, `mouseup`, and `touchend`, blocking `applyIncomingChartViewportIfNewer()` for any focused or recently resized/interacted chart (`15s` cooldown).
  - Scoped viewport sync metadata and saved chart states by exchange hostname (`meta.host` / `state.host`) so open charts on different venues (e.g., Vest Markets vs. Hypernova on `HYPE`) never overwrite each other.
  - Prevented idle/out-of-focus charts from flushing stale viewports on blur unless recently interacted with.

---

## [v1.1.110] — 2026-11-21

### 🎯 Hypernova Top Bar Chart Alignment & Non-Overlapping Z-Index Layering
- **Aligned Cortex Black Bar Directly With the Chart**:
  - Added `isHypernovaHost()` and `getHypernovaChartLeftInset()` in `content-isolated.js` so `#vest-cortex-top-bar` aligns flush with the left edge of the Hypernova chart/trading workspace (to the right of the left navigation rail instead of overhanging at `left: 0`).
- **Zero Overlap Over Hypernova Menus, Dropdowns & Pull-Out Sidebars**:
  - Lowered `#vest-cortex-top-bar` (`z-index: 15`) and the Hypernova Accounts & Risk overlay canvas/button (`z-index: 15` / `16`) so Hypernova's pull-out left sidebar, market dropdowns, and chart menus always float cleanly on top while keeping the Cortex dropdown menu (`#vest-studio-dropdown-menu`) on top when clicked.

---

## [v1.1.109] — 2026-11-21

### 🚀 Added Hypernova (`https://app.hypernova.xyz/trade`) Support
- **Manifest Host & Content Script Support**:
  - Added `https://*.hypernova.xyz/*` and `https://hypernova.xyz/*` to `host_permissions`, both `MAIN` and isolated `content_scripts`, and `web_accessible_resources` in `manifest.json`.
- **Built-In Hypernova Perp Firm Profile & Branding**:
  - Added **Hypernova** (`https://app.hypernova.xyz/trade`, `matchPatterns: ["app.hypernova.xyz", "hypernova.xyz"]`) to `DEFAULT_PERP_FIRMS` in both `content-isolated.js` and `service-worker.js`.
  - Added a custom Hypernova SVG emblem in `getPropFirmLogoSvg()` and venue name recognition (`Hypernova`) in voice/range alerts across `content-isolated.js` and `content-main.js`.

---

## [v1.1.108] — 2026-11-19

### 🔇 Eliminated Recurring `AudioContext was not allowed to start` Extension Error
- **Fixed `markUserInteractionForAudio()` Chrome User-Activation Timing**:
  - Switched Web Audio unlock listeners from `pointerdown`/`mousedown`/`touchstart` (which do **not** grant Chrome `UserActivation` yet, and are also fired synthetically by TradingView/React) to gesture-completion events (`click`, `mouseup`, `pointerup`, `touchend`, `keydown`).
  - Added strict `e.isTrusted !== false` and `navigator.userActivation.isActive || hasBeenActive` guards before instantiating `new AudioContext()` or calling `.resume()`, and auto-detaches unlock listeners once the audio context is running.

---

## [v1.1.107] — 2026-11-19

### 🔤 Dynamic Box-Fitted Order Block Text Sizing (Session-Box Style)
- **Auto-Fitted Order Block Labels (`computeFittedObLabelFontSize`)**:
  - Order Block labels (`Bullish OB`, `5m Bearish OB`, `1h Bullish OB`, `4h Bearish OB`, etc.) now dynamically scale and center inside each Order Block zone based on the box's visible width and height—matching the Session Boxes watermark style.
  - Raised the Max Text Size sliders (`Max Chart OB Text Size (Auto-Fits Box)` and `Max MTF Text Size (Auto-Fits Box)`) to `8px–48px` (defaults `18px` / `22px`) to act as the maximum ceiling while automatically shrinking to fit smaller or narrower boxes.
  - Compact `×` remove pill tucks cleanly into the top-right corner of the visible zone (with a left-aligned compact fallback for razor-thin boxes `< 18px` tall).

---

## [v1.1.106] — 2026-11-19

### 🗑️ 1-Click Persistent Order Block Removal (`×`) & Restore Control
- **Remove Invalid Order Blocks Directly on Chart (`×` Pill)**:
  - Added a compact `×` remove button next to every rendered Order Block label (both current-chart and MTF `5m`/`15m`/`1h`/`4h` Order Blocks).
  - Clicking `×` immediately removes the Order Block from the chart, suppresses its alerts/stats, and saves a deterministic cross-timeframe key (`SYMBOL|TF|SIDE|TIME`) into `settings.orderBlocks.dismissedOrderBlocks` so it never redraws across refreshes, timeframe switches, or browser tabs.
- **Restore All Removed Order Blocks**:
  - Added a hidden-count readout and **`Restore All Removed OBs`** button inside **Settings → Charting Indicators → Order Blocks (Smart Risk)**.

---

## [v1.1.105] — 2026-11-19

### ✨ Multi-Timeframe Order Blocks (5m / 15m / 1h / 4h) + Custom Colors & Text Sizing
- **Project 5m, 15m, 1h & 4h Order Blocks on Any Chart**:
  - Added `computeMultiTimeframeOrderBlocks()` with a 4-layer Multi-Timeframe Bar Provider: TradingView `datafeed.getBars()` fetching, passive per-symbol timeframe caching, instant higher-timeframe bar resampling, and live tick-by-tick forming-bar stitching.
  - Projects `5m`, `15m`, `1h`, and `4h` Order Blocks onto **any** active chart timeframe (e.g., viewing `1h` and `4h` Order Blocks on a `1m` chart, or `5m` and `15m` Order Blocks on a `1h` chart), with automatic left-edge clamping so active HTF zones that formed earlier remain visible on lower timeframes.
  - Automatically avoids duplicate boxes when the active chart timeframe is already enabled in the MTF list.
- **Per-Timeframe Custom Colors, Opacity & Label Text Sizing**:
  - Added **Chart OB Label Text Size** (`8px–20px`) and **MTF Label Text Size** (`8px–20px`) sliders plus **Max Order Blocks per Timeframe** (`1–10`) in Order Blocks settings.
  - Added individual toggles, Bullish & Bearish color pickers, and Opacity sliders for `5m`, `15m`, `1h`, and `4h` Order Blocks.

---

## [v1.1.104] — 2026-11-19

### 🛠️ Fixed Child-Iframe Overlay Clearing Loop & Removed `will-change` Canvas Tearing
- **Early Child-Iframe Yield (`isYieldingChartToTopWindow`)**:
  - Added an explicit `isYieldingChartToTopWindow()` exit at the very top of `renderIctSessionIndicators()`. Previously, when a child iframe yielded `findMainChartPaneCanvas() -> null` to `window.top`, it fell into `clearAllChartOverlays()` on every tick/mouse event, fighting with `window.top` and causing severe overlay/badge flickering.
- **Removed `will-change` Compositor Layer Tearing on Price Axis**:
  - Removed `will-change: contents`, `will-change: transform`, and `backface-visibility: hidden` from `.vest-ict-price-axis-badges` and its pooled badge nodes, keeping clean pooled `top` positioning without GPU buffer tearing over TradingView's actively repainting price-axis `<canvas>`.

---

## [v1.1.103] — 2026-11-19

### ⚡ Eliminated Session Day Line Price-Axis Label Flickering
- **GPU-Composited Pooled Price Scale Badges (`renderIctPriceScaleBadges`)**:
  - Replaced `ictPriceScaleBadgeContainer.innerHTML = html` full DOM teardown on every price tick with persistent pooled badge `<div>` nodes positioned via `translate3d(0, y, 0)` (dirty-checking text, color, and transform so nodes are never recreated when price ticks or auto-scales).
- **Owner-Scoped Cross-Frame Badge Protection (`data-vest-owner`)**:
  - Tagged `.vest-ict-price-axis-badges` with `data-vest-owner` (`top` vs `frame`) and scoped `clearIctPriceScaleBadges()` strictly to the owning frame so the child iframe and top window can never ping-pong delete and recreate each other's price axis badges.

---

## [v1.1.102] — 2026-11-19

### ⚡ Eliminated Chart Flickering on Instrument & Account Switches
- **Removed Transient Empty-Bar Clearing**:
  - Stopped calling `clearAllChartOverlays()` during brief empty-bar loading frames when switching instruments or accounts on the Trade page, preventing overlays from flashing `display: none` while new symbol bars load.
- **Dirty-Checked Style & Render Signature Caching**:
  - Cached `lastAccountsRiskCanvasStyle`, `lastAccountsRiskBtnStyle`, and `lastAccountsRiskRenderSig` so `#vest-accounts-risk-overlay-canvas` and `#vest-accounts-risk-toggle-btn` only update CSS styles or repaint when coordinates, dimensions, config, symbol, or account data actually change — eliminating 60fps DOM/canvas thrashing.
- **Preserved Cached Chart Canvas Across Symbol Changes**:
  - Only clears `cachedTargetChartCanvas` when navigating away to non-chart routes (`/portfolio`, `/markets`, etc.), keeping `/trade/A` → `/trade/B` transitions flicker-free.

---

## [v1.1.101] — 2026-11-19

### 🛡️ Fixed Double Chart Overlays on Timeframe Switch & Ghost Chart on Portfolio Page
- **Prevented Overlay Self-Targeting (`findMainChartPaneCanvas`)**:
  - Excluded `#vest-accounts-risk-overlay-canvas` and `.vest-cortex-overlay-canvas` from `findMainChartPaneCanvas()`, and required top-document canvases to belong to a real TradingView chart container (never `document.body` or a Portfolio equity curve `<canvas>`). This eliminates the double-overlay artifact when switching chart timeframes.
- **Instant SPA Route Cleanup (`Portfolio`, `Markets`, `Docs`, etc.)**:
  - Added a non-chart SPA route guard (`/portfolio`, `/markets`, `/affiliate`, `/docs`, `/capital`, etc.) plus `clearAllChartOverlays()` whenever no TradingView chart canvas is mounted, immediately hiding and clearing `ictSessionsCanvas`, `#vest-accounts-risk-overlay-canvas`, `#vest-accounts-risk-toggle-btn`, and price scale badges when navigating away from the Trade page.

---

## [v1.1.100] — 2026-11-19

### 💰 Clearer Per-Trade Dollar Amount Highlight & Open PnL Labeling
- **Unmistakable Per-Trade Amount Display**:
  - Updated flat/closed rows in `renderAccountsRiskOnCanvas()` to clearly label **`USE / TRADE (X%)`** on the left and highlight the exact dollar amount inside a crisp amber/gold badge (`$4.90`) on the right.
  - Prefixed open-position PnL values with **`PnL`** (`PnL +$2.59 (+2.75%)`) so there is zero ambiguity between live open PnL and the dollar amount to use for your next trade.

---

## [v1.1.99] — 2026-11-19

### 🔠 Accounts & Risk Font Size Slider & 1-Click Minimize/Expand
- **Configurable Font Size (`8px – 18px`)**:
  - Added a live **Font Size** slider (`#vest-arb-font-size`, default `10.5px`) in the Accounts & Risk settings drawer that proportionally scales all typography, row heights, padding, and spacing on the chart canvas in real time.
- **1-Click Minimize / Expand Toggle (`#vest-accounts-risk-toggle-btn`)**:
  - Added a compact `—` minimize button in the top-right corner of the Accounts & Risk drawing header while keeping the rest of the chart overlay 100% click-through and non-draggable.
  - Minimizing collapses the drawing in place into a tiny single-line pill (`▸ VEST MARKETS (6) · HYPE`); clicking anywhere on the minimized pill expands it right back open and syncs state across tabs.

---

## [v1.1.98] — 2026-11-19

### 🧹 Filter Internal UUID/Hex Sub-Objects & Top-Window Canvas Layer
- **Eliminated Random UUID/Hex Accounts**:
  - Updated `normalizeCanonicalAccountName()` in both `content-main.js` and `content-isolated.js` to reject internal UUID records (`xxxxxxxx-xxxx-...`) and raw hex wallet/ledger hashes (`0x...`), automatically purging them from cache so only real human-named firm accounts (`Account 71`, `Account 73`, `Account 74`, `Account 75`, `Account 76`, `Account 77`, etc.) are displayed.
- **Top-Window Front-Most Canvas Mounting**:
  - Mounted `#vest-accounts-risk-overlay-canvas` on `window.top.document.body` (converting iframe coordinates cleanly) at `z-index: 2147483640` with `pointer-events: none` so even top-window host overlays like Vest's `↕ P&L` pill cannot cover over the drawing.

---

## [v1.1.97] — 2026-11-19

### 🔝 Front-Most Chart Overlay Layer & Lower Top-Left Offset
- **Dedicated Front-Most Click-Through Overlay Canvas (`#vest-accounts-risk-overlay-canvas`)**:
  - Moved the Accounts & Risk drawing onto its own dedicated `pointer-events: none` `<canvas>` mounted at `z-index: 2147483640` aligned to the TradingView chart pane, escaping inner TradingView stacking contexts so nothing on the chart (`↕ P&L`, position lines, order badges, FVGs, OBs, or legend widgets) can cover over it.
- **Lower Default Top Offset (`offsetY: 108px`)**:
  - Increased default `offsetY` to `108px` (with automatic migration from earlier `52px`/`76px` defaults) so the drawing sits cleanly below all top-left TradingView legend and indicator config controls.

---

## [v1.1.96] — 2026-11-19

### 🧹 Clean Account Name Normalization, Deduplication & UI Noise Filtering
- **Canonical Account Names & Zero Duplicates**:
  - Added `normalizeCanonicalAccountName()` in both `content-main.js` and `content-isolated.js` to normalize concatenated Vest DOM strings (`76Account 76Instant`, `71Account 71Evaluati`, `75Account 75Evaluati`) and bare numbers (`71`, `73`, `74`, `75`, `76`, `77`) into clean canonical names (`Account 71`, `Account 73`, `Account 74`, `Account 75`, `Account 76`, `Account 77`), automatically merging duplicate rows into one entry per account.
  - Added balance priority weighting so live `Account Value` / `equity` is never overwritten by secondary collateral/dust fields.
- **Filtered Non-Account UI Labels**:
  - Automatically rejects and purges cached UI/menu strings such as `Active Positions`, `Add Funded Account`, and 2-letter abbreviations (`PA`) via `sanitizeAccountSnapshotsRegistry()`.
- **Formatting & Top-Left Clearance**:
  - Fixed negative dollar formatting (`-$0.20` instead of `$-0.20`) and adjusted default `offsetY` to `76px` so the overlay clears TradingView's top-left `^` legend collapse button cleanly.

---

## [v1.1.95] — 2026-11-19

### 🛠️ Non-Destructive In-Place Settings Sync (Eliminates Scrollbar Push-Back)
- **Eliminated `renderDialog()` Destruction on Live Settings Events**:
  - Replaced full `overlay.innerHTML` re-rendering inside `onLiveSettingsUpdated()` with non-destructive in-place DOM patching (`syncOpenModalControlsInPlace()`).
  - Dragging the Settings modal scrollbar or scrolling through Charting Indicators is never interrupted, cancelled, or pushed back up by background storage/cross-tab updates, while indicator master switches, badges, and settings buttons still sync in real time across open browsers.

---

## [v1.1.94] — 2026-11-19

### 🛠️ Settings Modal Scroll-Jump & Accounts Toggle Fix
- **Fixed Settings Modal Jumping Back to Top on Scroll**:
  - Updated `onLiveSettingsUpdated()` in `openStudioSettingsModal()` with `getEditableSettingsSignature()` so noisy background writes (`lastChartSettings` viewport saves, sidebar/account tracking, and self-save echoes) no longer trigger full modal re-renders.
  - When a genuine cross-browser setting update arrives from another window, the modal now saves and restores `#vest-tvs-right-pane.scrollTop` and any currently expanded indicator drawers so scrolling never snaps back to the top.
- **Fixed Accounts & Risk Toggle Reverting**:
  - Added the missing `accountsrisk` branch to the `.vest-ind-master-toggle` change handler and wired `renderChartAccountsRiskBox()` inside `commitDraftAndClose()` so toggling **Accounts & Risk Box** ON/OFF persists cleanly.

---

## [v1.1.93] — 2026-11-19

### 🎨 Native Non-Draggable Chart Canvas Drawing & All-Firm Accounts Discovery
- **Direct Chart Canvas Drawing (Not a Draggable Window)**:
  - Converted the Accounts & Risk overlay from a draggable floating DOM window into a clean, non-draggable, click-through (`pointer-events: none`) canvas drawing rendered directly onto the TradingView chart overlay canvas (`renderAccountsRiskOnCanvas`) at top-left (`offsetX: 12`, `offsetY: 52`, directly below the OHLC legend).
  - Never blocks chart panning, zooming, or drawing tools, and automatically cleans up any legacy floating box DOM element.
- **All Accounts Discovery for the Active Prop/Perp Firm**:
  - Added passive `window.fetch` + `XMLHttpRequest` API interception, React Fiber state tree scanning (`scanReactFiberForAccounts`), and `localStorage` scanning in `content-main.js` (`extractAccountsFromApiPayload`) to capture **all** accounts the site loads for the active firm — not just the currently selected account.
  - Merges API/Fiber-discovered firm accounts (with balances, open PnL, and nested per-symbol positions) together with live DOM metrics and cross-tab account updates.
- **Configurable Drawing Settings**:
  - Settings drawer (`Cortex → Accounts & Risk Box...` or `Charting Indicators → Accounts & Risk Box`) includes configurable Risk % (with `0.5%`, `1%`, `2%`, `3%`, `5%` presets), box width, top-left Left/Top pixel offsets, opacity, accent border color, and a **Scan Firm Accounts** button.

---

## [v1.1.92] — 2026-11-19

### 💼 On-Chart Accounts & Per-Trade Risk Box (Top-Left Chart Overlay)
- **Top-Left Chart Anchoring (`#vest-chart-accounts-risk-box`)**:
  - Added a sleek floating overlay box anchored inside the top-left of the TradingView chart viewport (right of the drawing toolbar and below the OHLC legend).
  - Supports dragging, sticky screen pin, minimize-to-top-bar taskbar pill (`accounts_risk`), direct settings routing, and "Reset to Top-Left" placement.
- **Multi-Account Live Balance & Open PnL Aggregation**:
  - Automatically tracks your active account balance (`Account Value`), total `Unrealized PnL`, and open per-instrument positions (`Active Positions`), and passively captures accounts seen in the account switcher dropdown.
  - Synchronizes live account snapshots in real time across all open browser tabs and windows via `BroadcastChannel`, `localStorage`, and `chrome.storage.local` so every open account appears together in the box.
- **Instrument-Specific Open PnL vs. Configurable Per-Trade Risk**:
  - When an account has an **open position** on the active chart instrument, it displays the live side (`LONG`/`SHORT`) and real-time Open PnL (plus total account PnL if other instruments are also open).
  - When the position on the active chart instrument is **closed / flat**, it automatically calculates and displays the exact dollar amount to **risk per trade** (`Balance × Risk %`), with both an inline Risk % input in the box footer and quick presets (`0.5%`, `1%`, `2%`, `3%`, `5%`) in Settings.

---

## [v1.1.91] — 2026-11-16

### 🛡️ Web Audio Autoplay Policy Hardening & Order Block Precision Tuning
- **Elimination of Chrome Extension AudioContext Errors (`chrome://extensions`)**:
  - Resolved `The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page` completely.
  - Refactored `playWithAudioContext()` to strictly guard against calling `AudioContext.resume()` or creating contexts in background message / price alert loops outside an active user gesture.
  - AudioContext is strictly instantiated and resumed within explicit user interactions (`pointerdown`, `mousedown`, `keydown`, `touchstart`, or test alert button clicks), transitioning into `'running'` state cleanly without triggering Chrome's autoplay violation warnings.
  - Test alert buttons (`#vest-ob-test-voice-btn`) proactively call `markUserInteractionForAudio()` to ensure instant playback upon clicking.
- **Institutional Order Block Validation & False-Positive Elimination (1h NQ Fix)**:
  - Fixed an issue where minor continuation pauses during strong upward rallies on 1-hour NQ charts were falsely identified as Bullish Order Blocks.
  - Sourced order blocks strictly from confirmed swing low / swing high origins rather than arbitrary continuation candles.
  - Enforced Break of Structure (BOS / MSS) against preceding swing points formed prior to the swing origin (`targetHigh > originBar.high` for Bullish OB; `targetLow < originBar.low` for Bearish OB). Pure continuation candles without a prior swing point break are strictly rejected.
- **Continuous Forward Invalidation Tracking**:
  - Order blocks are now continuously tracked past mitigation: if price later breaks through the invalidation boundary (`close < ob.bottom` for Bullish OB, `close > ob.top` for Bearish OB), the block is cleanly marked `isInvalidated = true` and removed from the chart canvas.

---

## [v1.1.90] — 2026-11-16

### ⚡ Real-Time Cross-Browser & Cross-Tab Settings Synchronization
- **Zero-Latency Cross-Tab Synchronization (`BroadcastChannel`)**:
  - Implemented `BroadcastChannel('__trading_cortex_cross_tab_sync__')` enabling instant, zero-latency communication across all open browser windows, tabs, and monitors without requiring any page refreshes.
  - Changes made in Browser A (or Tab A) are broadcasted immediately to Browser B via `broadcastLiveSettingsCrossTab()`.
- **Triple-Layer Multi-Browser Transport Architecture**:
  - **Layer 1 (BroadcastChannel)**: Instant sub-millisecond tab-to-tab communication across windows on the same origin.
  - **Layer 2 (Window Storage Events)**: Real-time native browser `storage` event listener reacting to `__trading_cortex_isolated_settings__` updates.
  - **Layer 3 (chrome.storage.onChanged)**: Extension-level real-time listener propagating changes across all profiles, popups, and different exchange domains (`next.vestmarkets.com`, `myfundedperpetuals.com`, `kalshi.com`).
- **Instant Reactive Component Re-application (`applyLiveSettingsToAllComponents`)**:
  - Disabling any feature on Browser A immediately executes hiding logic on Browser B in real time:
    - **Range Detector**: Immediately hides the blue glowing on-chart box (`#vest-chart-range-box`) and removes minimized taskbar pills.
    - **Order Blocks**: Immediately hides the on-chart 1:3 RR performance stats screen (`#vest-chart-ob-stats-box`), clears order block canvas drawings, and removes taskbar pills.
    - **Market Structure**: Immediately clears BOS / MSS / CHoCH lines and labels from the TradingView canvas.
    - **Session Indicators / Killzones / VWAP**: Immediately clears session highlights and price scale badges.
    - **Auto FVG**: Cleans up canvas Fair Value Gaps and removes native TradingView drawings.
    - **Instrument Trades, Economic News & Diagnostics**: Immediately toggles visibility and taskbar slots across all windows.
    - **Floating Template Bar & Top Bar Pills**: Updates active template selection, button states, and dropdown menu badges (`ON`/`OFF`) in real time.
    - **Dialog Glass Mode**: Updates frosted glass styling and opacity across all open floating panels.
- **In-Dialog Live Sync (`openStudioSettingsModal`)**:
  - If the Settings Dialog is currently open on Browser B when Browser A changes a setting, Browser B dynamically receives `cortex-live-settings-updated`, updates its draft state, and re-renders active switches, sliders, and badges in real time so stale drafts are never committed.
- **Main World Instant Canvas Clearing**:
  - Updated `content-main.js` so disabling Range Detector posts `VEST_TV_RANGE_UPDATE` with empty statuses to reset telemetry and trigger an immediate clean re-render of the chart canvas.

---

## [v1.1.89] — 2026-11-16

### 🛡️ DEX Session Logout Elimination & Web Audio Autoplay Hardening
- **Zero-Disruption Update Engine (`update/update.js`)**:
  - Eliminated the forced tab reload (`chrome.tabs.reload()`) during Stage 4 of self-updates.
  - Active trading tabs on Vest Markets, My Funded Perpetuals, and Kalshi Pro are now preserved completely intact without interruption.
  - Prevents severance of ephemeral Web3 session signer keys (Privy / Turnkey delegated wallets) and avoids orphaned extension context disconnects.
  - Updated completion status banner to inform users that tabs are preserved without disruptive reload, allowing traders to refresh when convenient.
- **Account Switcher & Auto-Restoration Safety (`content/content-isolated.js`)**:
  - Changed default `restoreSelectedAccount` to `false` for `vestmarkets`, `myfundedperpetuals`, and `kalshipro` so native platform wallet sessions remain in complete control.
  - Added strict `DANGEROUS_ACTIONS` blacklist (`/disconnect|logout|log out|sign out|exit|leave|unlink|switch wallet|revoke|remove/i`) ensuring automated menu scanners NEVER click disconnect or logout buttons.
  - Added safeguard rejecting generic account names (e.g., `"Account"`, `"Wallet"`, `"DEX"`) from fuzzy matching to prevent accidental session termination.
  - Capped menu matching retries to prevent repeated dropdown toggles from interfering with active DEX authentication handshakes.
- **Chrome Autoplay Policy Hardening (`content/content-isolated.js`)**:
  - Resolved `The AudioContext was not allowed to start` errors appearing in `chrome://extensions`.
  - Tied `new AudioContext()` and `sharedCortexAudioContext.resume()` strictly to user gestures (`pointerdown`, `mousedown`, `keydown`, `touchstart`).
  - Automated alert chimes (Order Block mitigations, Range Detector state shifts) only execute when `AudioContext` is in an active `'running'` state, completely eliminating unhandled autoplay rejections and extension error flags.
  - Wrapped `speakCortexVoicePhrase` and chime generators in protective `try/catch` boundaries.

---

## [v1.1.88] — 2026-11-16

### 📈 Institutional Order Block On-Chart Performance Stats Screen (1:3 RR)
- **Floating Performance Stats Screen (`#vest-chart-ob-stats-box`)**:
  - Added an interactive on-chart stats box inside the TradingView chart viewport for the Institutional Order Blocks indicator.
  - Automatically evaluates all mitigated order block setups forward in time from mitigation:
    - **Bullish Order Blocks (Long)**: Entry at `ob.top`, Stop Loss at `ob.bottom`, Risk = `ob.top - ob.bottom`. Target 1:3 RR TP = `ob.top + 3 * risk`. If `bar.high >= tp` before `bar.low <= sl` $\rightarrow$ **WINNER**. If `bar.low <= sl` before `bar.high >= tp` $\rightarrow$ **LOSER**. Otherwise $\rightarrow$ **PENDING**.
    - **Bearish Order Blocks (Short)**: Entry at `ob.bottom`, Stop Loss at `ob.top`, Risk = `ob.top - ob.bottom`. Target 1:3 RR TP = `ob.bottom - 3 * risk`. If `bar.low <= tp` before `bar.high >= sl` $\rightarrow$ **WINNER**. If `bar.high >= sl` before `bar.low <= tp` $\rightarrow$ **LOSER**. Otherwise $\rightarrow$ **PENDING**.
- **Performance Metrics Display**:
  - **Hero Metric Banner**: Displays overall Win Rate percentage (emerald $\ge 50\%$, amber $\ge 33.3\%$, red $< 33.3\%$) and Net R-Multiple return (e.g. `+12.0R`).
  - **Segmented Progress Meter**: Visual win/loss/pending distribution bar.
  - **Key Metrics Grid**: Profit Factor, Expectancy, Closed Trades with pending count, and configurable Target Risk:Reward Ratio (default 1:3).
  - **Directional Breakdown**: Separate win/loss records and win rates for Long OBs vs Short OBs.
  - **Context Footer**: Active Symbol & Timeframe with mitigated count out of total order blocks.
- **Controls & Window Management**:
  - **Title Bar**: Emerald gradient (`linear-gradient(135deg, #059669, #047857)`) with white text and draggable title bar clamped to chart viewport bounds.
  - **Sticky Pin Button (`#vest-cosb-pin-btn`)**: Locks the box to exact screen coordinates (`statsBoxPinnedLeft`, `statsBoxPinnedTop`).
  - **Minimize Button (`#vest-cosb-btn-collapse`)**: Minimizes to a compact pill (`#vest-cosb-restore-btn`) docked into the Cortex top bar slot or chart header.
  - **Direct Settings Routing (`#vest-cosb-btn-settings`)**: Gear icon button directly opens Settings to the Charting Indicators tab and highlights the Order Blocks drawer.
  - **Close Button (`#vest-cosb-btn-close`)**: Closes the stats box and persists preference (`showStatsBox: false`).
- **Settings Drawer Integration**:
  - Added `PERFORMANCE STATS BOX (1:3 RR)` section in Order Blocks settings drawer with:
    - `Show on-chart Order Block Performance Stats Screen` toggle (`#vest-ob-show-stats-box`).
    - `Stats Target Risk:Reward Ratio` slider (`#vest-ob-stats-rr-ratio`, 1.0 to 10.0 RR).
    - `Reset Stats Box Position` button (`#vest-ob-reset-stats-pos-btn`).

---

## [v1.1.87] — 2026-11-15

### 📊 Range Detector Directional Trending, Timeframe Switcher, 1m Support & Sticky Pin
- **Directional Trending (`TRENDING LONG` vs `TRENDING SHORT`)**:
  - Upgraded Range Detector from generic `TRENDING` to specific directional evaluations.
  - When non-ranging, evaluates price displacement, lookback simple moving average, and relative range channel position to display:
    - **`▲ TRENDING LONG`** (Green/Emerald pill with up arrow) on bullish directional momentum.
    - **`▼ TRENDING SHORT`** (Rose/Red pill with down arrow) on bearish directional momentum.
    - **`● RANGING`** (Green glowing pill) during market consolidation.
- **Interactive Timeframe Switcher**:
  - Clicking any timeframe row or chip in the Range Detector box immediately sends a `VEST_TV_CHANGE_RESOLUTION` event to switch the chart directly to that resolution.
  - Added resolution converter helper (`convertTimeframeToTvResolution`) with fallback to native TradingView interval toolbar buttons.
- **1m Timeframe Integration**:
  - Added `'1m'` to default timeframes list: `['1m', '5m', '15m', '1h', '4h', '1D']`.
  - Normalization automatically prepends `'1m'` for existing configs.
- **Sticky Pin Button (`#vest-crb-pin-btn`)**:
  - Added a pin / sticky icon button to the blue title bar.
  - Toggling pin mode locks the Range Detector box to exact screen coordinates (`pinnedLeft`, `pinnedTop`) and persists across page reloads.
- **Direct Settings Routing**:
  - Clicking the gear button (`⚙`) in the Range Detector title bar now opens the Settings Dialog on the **Charting Indicators** tab, expands `#vest-ind-drawer-rangedetector`, smoothly scrolls the tile into view, and highlights it with a cyan halo glow.

---

## [v1.1.86] — 2026-11-15

### 🔇 Web Audio Autoplay Policy & AudioContext Extension Error Fix
- **Chrome Autoplay Policy Compliance**:
  - Resolved Chrome's extension error: *"The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page."*
  - Guarded all Web Audio instantiation (`playOrderBlockChime` and `playRangeChime`) behind `canPlayWebAudio()` checks (`userHasInteractedWithPage` and `navigator.userActivation.hasBeenActive`).
  - Prohibits premature `new AudioContext()` instantiation on immediate page hydration before the user has touched the keyboard or mouse, preventing Chromium from generating console warnings and extension error badges.
- **Shared Singleton AudioContext**:
  - Replaced ad-hoc `new AudioContext()` instantiation with a lazy-initialized, shared singleton (`getCortexAudioContext()`).
  - Added global passive listeners (`pointerdown`, `mousedown`, `keydown`, `touchstart`) to automatically unlock and resume the shared audio context upon the very first user interaction with the exchange.
  - Eliminated AudioContext resource leaks and browser context limit exhaustion.

---

## [v1.1.85] — 2026-11-15

### 🗣️ Range Detector Audible Alerts Enhanced with Instrument, Venue & Natural Timeframe
- **Full Context Voice Speech Announcement**:
  - The voice synthesis alert triggered upon entering a new consolidation range now explicitly speaks:
    1. **Instrument**: Spoken naturally without technical ticker artifacts (e.g. `HYPE Perpetual` for `HYPE-PERP`, `NQ`, `BTC Perpetual`, `ES`).
    2. **Venue**: Identifies the exact active trading firm / exchange venue (e.g. `Vest Markets`, `MyFundedPerpetuals`, `Kalshi Pro`) resolved from `getActivePerpFirm()` and page context.
    3. **Timeframe**: Spoken in human natural speech (e.g. `"15 minute"`, `"1 hour"`, `"4 hour"`, `"daily"`) instead of raw shorthand codes (e.g. `15m`, `60`, `1D`).
  - Example spoken announcement: *"Range detected on HYPE on Vest Markets, 15 minute timeframe."*
- **Notification Toast Synchronization**:
  - The pop-up toast notification has been updated in tandem to include instrument, venue, and spoken timeframe format.

---

## [v1.1.84] — 2026-11-15

### 🎯 Range Detector (Multi-Timeframe) with On-Chart Glowing Blue Box & Audible Alerts
- **New Range Detector Engine**:
  1. *Mathematical Consolidation Scoring*: Implemented Choppiness Index (CHOP), Average Directional Index (ADX), and Price Channel Containment to reliably detect when market conditions are ranging/consolidating vs. expanding/trending.
  2. *Multi-Timeframe Detection*: Evaluates multiple timeframes simultaneously (e.g. `5m`, `15m`, `1h`, `4h`, `1D`) with automatic bar aggregation from the base resolution.
- **On-Chart Floating Range Detector Widget (`#vest-chart-range-box`)**:
  - *Blue Title Bar with White Text*: Styled with a sleek blue gradient (`#2563eb` to `#1d4ed8`) and uppercase white header title.
  - *Slight Blue Glow Effect*: Features a subtle blue ambient halo glow (`box-shadow: 0 0 16px rgba(59, 130, 246, 0.42), 0 0 32px rgba(37, 99, 235, 0.22)`).
  - *Color-Coded Status Indicators*: Displays a **green indicator** (`🟢 RANGING`) when the market is in a range, and a **red indicator** (`🔴 TRENDING`) when the market is not ranging.
  - *Interactive Controls*: Fully draggable with screen clamping, position memory, collapse to minimal pill, and close buttons.
- **Audible Alerts on New Range Formation**:
  - Automatically announces when the market transitions into a new range via voice speech synthesis (*"Range detected on [Symbol] [Timeframe]"*) and Web Audio chime alert.
- **Charting Indicators Hub Integration**:
  - Added dedicated tile in the Charting Indicators hub with master slider switch, live draft syncing, and settings drawer (lookback period, Choppiness threshold, ADX threshold, detection mode, box opacity/width, and audible alert toggles).
  - Added direct shortcut button in the Studio Dropdown Menu (`Range Detector...`).

---

## [v1.1.83] — 2026-11-15

### 🎯 Institutional Order Block Color Validation & Range Capping
- **Strict Opposite-Color Candle Rule**:
  1. *Bullish Order Blocks*: The origin candle must strictly be a **bearish / down candle** (`close <= open`). When displacement occurs with an FVG at candle `g`, if `g - 1` is bullish (green), the engine searches backward up to `swingLookback` bars for the true last down candle at the base. If no down candle exists (pure continuation green bars), the setup is rejected, completely eliminating stacked green boxes in the middle of an uptrend.
  2. *Bearish Order Blocks*: The origin candle must strictly be a **bullish / up candle** (`close >= open`). Pure red continuation bars with gaps are prevented from generating false bearish order blocks.
- **Anomalous Mega-Candle Range Capping**:
  - Implemented dynamic average candle range calculation (`avgRange`).
  - When an origin candle range exceeds 3x `avgRange` (e.g., a 560-point crash/spike bar on 1h NQ), the order block zone is capped to the actual absorption zone (`avgRange * 2`), preventing massive boxes from covering half the chart.
- **Structure Break Re-evaluation**:
  - Evaluates structural breaks against the swing high/low of the leg leading into the origin candle, ensuring only true institutional accumulation/distribution moves qualify.

---

## [v1.1.82] — 2026-11-15

### 🎯 Order Block Strict Coordinate Anchoring & Zero Left/Right Drift
- **Eliminated Leftward Box Drift**:
  1. *TimePointIndex vs. Array Index Harmonization*: Resolved the issue where `ob.barIndex` was assigned the internal array index (e.g. `120`) instead of TradingView's `TimePointIndex` (e.g. `3540`). When passed to `timeScale.indexToCoordinate()`, it previously resolved to candles weeks in the past, drawing boxes thousands of pixels offscreen to the left.
  2. *Timestamp Coordinate Priority*: Updated `barToX` in `content-main.js` to prioritize `tsApi.timeToCoordinate(timeSec)` when `timeSec > 1e8`. Because UNIX timestamps are globally monotonic and unambiguous, the origin candle is mapped to its exact on-chart X coordinate with zero drift.
  3. *Strict Left Edge Clamping*: Hard-locked the left coordinate of the Order Block box to `boxLeft = rawStartX - halfBarW`, guaranteeing that no Order Block can ever stretch to the left of its origin candle.
- **Single Candle Mode ("On Candle Only")**:
  - Added a new mode to **Zone Extension Mode** in the Order Blocks settings drawer:
    - `candle`: **On Candle Only (No extension to left or right)** — the box strictly spans the width of the origin candle (`boxLeft = rawStartX - halfBarW`, `boxRight = rawStartX + halfBarW`).
    - `mitigation`: **Extend forward until initial mitigation / retest** (Single-Use Smart Risk zone).
    - `right`: **Extend indefinitely to right edge**.
- **Settings Drawer Draft Syncing**:
  - Added complete field synchronization in `syncCurrentPaneToDraft()` in `content/content-isolated.js` for Order Blocks (`extendMode`, `swingLookback`, `maxBlocks`, `minFvgTicks`, colors, alert toggles, and R:R ratios) and Market Structure settings, ensuring that selections made in the drawer persist directly to live drafts.

---

## [v1.1.81] — 2026-11-15

### 🎯 Order Block Origin Detection on Impulsive Moves
- **Fixed Origin Candle Positioning at Impulsive Displacement Moves**:
  1. *Immediate Swing Structure Break*: Replaced the macro swing low search (which required prices to crash through ancient swing lows from the bottom of the chart) with **immediate swing leg structure break** (`recentLow` / `recentHigh` over the lookback leg).
  2. *Strict Origin Placement*: Verified on live 1h HYPE candles that every Order Block is accurately anchored to the exact origin candle immediately preceding the impulsive displacement bar (`obIdx = g - 1`):
     - Peak at $75.24 on Nov 13 properly captured as Bearish OB.
     - Midnight cascade at $71.86 properly captured as Bearish OB.
     - V-bottom at $62.30 on Nov 15 properly captured as Bullish OB.
     - Peak at $68.48 on Nov 15 properly captured as Bearish OB.
  3. *Duplicate Stacking Prevention*: Added anti-spam grouping so consecutive candles in a prolonged impulse do not stack duplicate order blocks on top of each other.

---

## [v1.1.80] — 2026-11-15

### 🎯 Order Block Strict FVG Anchor Alignment
- **Strictly Anchored to the Bar Before the Gap Bar**:
  1. *Eliminated Downstream Drift*: Refactored `computeOrderBlocksFromBars` to strictly enforce the core SMC / Smart Risk principle: **An Order Block is only valid on the bar immediately preceding the displacement bar that creates the Fair Value Gap (`obIdx = g - 1`)**.
  2. *Eliminated Mid-Cascade & Disconnected Zones*: Removed the detached backward/forward loop that previously selected candles multiple bars away from the gap or during mid-cascade consolidations.
  3. *Aligned On-Chart Badges & Mitigations*: Mitigation touches (`▲ BUY OB` / `▼ SELL OB`) now precisely align with retests into the genuine origin candle that generated the imbalance, eliminating false badges during unrelated counter-trend rallies.

---

## [v1.1.79] — 2026-11-15

### 🚀 New Indicator: Market Structure (BOS / MSS / CHoCH)
- **Market Structure Engine**:
  1. *Real-Time Structure Identification*: Tracks confirmed swing highs and swing lows using an adjustable lookback window (default 5 bars, range 3–20 bars).
  2. *Trend Continuation vs. Reversal*:
     - **BOS (Break of Structure)**: Flags trend continuations when price breaks higher in a bullish trend or lower in a bearish trend.
     - **CHoCH / MSS (Change of Character / Market Structure Shift)**: Flags trend changes when price violates the opposing confirmed swing low or swing high.
  3. *Configurable Trigger Modes*:
     - **Close Break**: Requires candle body close beyond the swing point for strict confirmation.
     - **Wick Break**: Triggers immediately on candle wick high/low intrusion beyond the level.
  4. *Customizable Display & Aesthetics*:
     - Configurable label styles: `both` (BOS & CHoCH), `mss` (BOS & MSS), `bos` only, or `choch` only.
     - Dedicated color pickers for Bullish (`#10b981`) and Bearish (`#ef4444`) breaks.
     - Dashed or solid line rendering with configurable line width and font size.
     - Optional line extension toward the right edge of the chart.
  5. *Unified Hub Integration*: Registered in Charting Indicators hub with dedicated toggle switch, context-aware tile click, on-demand Settings drawer, and Studio Dropdown menu shortcut.

### 🐛 Order Block Origin Candle Selection Fix
- **Corrected Bearish & Bullish Order Block Identification**:
  1. *Eliminated Erroneous Red Candle Order Blocks*: Fixed an issue in `computeOrderBlocksFromBars` where swing peaks whose highest candle closed bearish (red) resulted in a forward scan selecting subsequent drop candles as the order block.
  2. *Backward Pivot Search*: Implemented backward search from swing pivots up to 4 bars back:
     - **Bearish Order Block**: Accurately selects the last UP (bullish/green) candle prior to the downward impulse.
     - **Bullish Order Block**: Accurately selects the last DOWN (bearish/red) candle prior to the upward impulse.

---

## [v1.1.78] — 2026-11-15

### 🐛 Bug Fixes & Update Center Fallback Resolution
- **Resolved Update Center ReferenceError (`compareSemver is not defined`)**:
  1. *Function Alias Alignment*: Defined `compareSemver` (and alias `compareVersions = compareSemver`) in `update/update.js`, resolving a crash when GitHub API returns HTTP 403 and the updater falls back to unmetered Raw CDN mode.
  2. *Normalized Multi-Leading "v" Precedence*: Updated `cleanVersion` to strip all leading `v` characters (`/^v+/i`), preventing `vv1.1.76-dev.dev-lat` display anomalies.
  3. *Consistent Version Formatting*: Added `formatV(v)` helper across the updater UI to ensure version labels consistently format with a single `v` prefix.

---

## [v1.1.77] — 2026-11-15

### 🚀 Charting Indicators Tile Click Interaction Refinement
- **Context-Aware Indicator Tile Click Behavior**:
  1. *Toggle Settings Drawer When Already ON*: Clicking anywhere on an indicator tile header (title, icon, or description) when the indicator is already enabled now opens or closes its specific settings drawer and synchronizes the active state on the Settings button, avoiding accidental toggling off.
  2. *Turn ON When Currently OFF*: If the indicator is disabled, clicking the tile header immediately switches the indicator ON, displays its Settings button, and activates the live draft.
  3. *Dedicated Master Switch for Toggling OFF*: Disabling the indicator remains accessible at any time via the dedicated master toggle slider on the right side of the tile header.

---

## [v1.1.76] — 2026-11-15

### 🚀 Settings Box 80% Default Size & Multi-Directional Edge Resizing
- **80% Viewport Default Opening Size**:
  1. *Eliminated Hardcoded Pixel Caps*: Removed restrictive `min(980px, 80vw)` and `min(680px, 80vh)` caps that prematurely shrank the Settings dialog on wide and high-resolution monitors.
  2. *True 80% Layout*: The Settings box now consistently opens at a generous 80% of viewport width and height (`width: 80vw; height: 80vh;`), providing abundant space for viewing and adjusting all indicator controls comfortably.
- **Multi-Directional Drag-Resizing from Any Side or Corner**:
  1. *Edge Resize Handles*: Added dedicated, smooth resize zones along all four sides: **Top** (`cursor: ns-resize`), **Bottom** (`cursor: ns-resize`), **Left** (`cursor: ew-resize`), and **Right** (`cursor: ew-resize`).
  2. *Corner Resize Handles*: Added corner drag handles for **Top-Left**, **Top-Right**, **Bottom-Left**, and **Bottom-Right** (with the visible dotted grip icon).
  3. *Opposing Edge Anchoring Math*: Implemented precise coordinate translation (`newOffsetX = startOffsetX ± actualDeltaW / 2`, `newOffsetY = startOffsetY ± actualDeltaH / 2`) so dragging any side or corner smoothly scales the dialog while locking the opposite edge/corner firmly in place.

---

## [v1.1.75] — 2026-11-15

### 🚀 Institutional Order Blocks Indicator (Smart Risk Strategy)
- **Institutional Order Blocks Engine**:
  1. *Smart Risk Methodology*: Detects high-probability institutional supply & demand zones based on origin candle identification (last down candle before bullish impulse, last up candle before bearish impulse), displacement leaving Fair Value Gaps (FVG), and structural breakouts (BOS / ChoCH).
  2. *Single-Use Mitigation Retest*: Accurately tracks initial mitigation touches, tagging zones as mitigated and terminating single-use blocks or continuing extension to chart right edge per user preference.
  3. *On-Chart Order Entry Badges*: Renders crisp `▲ BUY OB` (green) and `▼ SELL OB` (red) order entry badges directly on the mitigation bar, complete with projected Stop Loss lines (placed at the opposite wick of the order block) and Take Profit target lines with configurable Risk:Reward ratio (default 1:2.0).
  4. *Audible Alerts (Voice & Chime)*: Real-time spoken speech synthesis alerts (*"Bullish Order Block Mitigated. Enter Long."* / *"Bearish Order Block Mitigated. Enter Short."*) and harmonic ascending/descending Web Audio chimes with deduplication across timeframe switches.
  5. *Charting Indicators Hub Integration*: Configurable within the unified Charting Indicators panel with on-demand Settings button, unpersisted drawer collapse, reset defaults, and test alert trigger.

---

## [v1.1.74] — 2026-11-15

### 🚀 Enhancements & Charting Indicators Settings Button
- **Interactive Settings Button on Indicator Tiles**:
  1. *Dynamic Settings Button*: Toggling an indicator ON now displays a dedicated **Settings** button next to the master toggle switch (with an SVG gear icon and hover animation), rather than automatically expanding the settings drawer below it.
  2. *On-Demand Settings Drawer*: Clicking the Settings button toggles the settings drawer open or closed for that specific indicator, marking the button with an active indicator glow (`.is-active`).
  3. *Unpersisted Collapsed State on Open*: Indicator drawers start collapsed (`display: none`) every time the Settings dialog is opened, even if the indicator is already enabled. The drawer expansion state is purely transient and not persisted across dialog closures, keeping the panel clean and clutter-free until the user explicitly clicks Settings.
  4. *Automatic Collapse on Disable*: Toggling an indicator OFF instantly hides its Settings button and collapses its settings drawer.

---

## [v1.1.73] — 2026-11-15

### 🚀 Enhancements & Dialog Improvements
- **Interactive Settings Dialog Drag-Resizing**:
  1. *Compact & Freely Resizable Footprint*: Users can resize the Settings modal down to a much smaller size (`min-width: 440px`, `min-height: 320px`, down from `760px x 520px`). The sidebar width scales adaptively with `width: clamp(170px, 26%, 245px)` so indicator controls remain clear even in ultra-compact viewports.
  2. *Corner Drag Handle*: Added a dedicated visual drag-resize grip handle in the bottom-right corner (`.vest-tvs-resize-handle`) in addition to native bidirectional CSS resizing (`resize: both`).
  3. *Size Memory*: The modal preserves user-defined dimensions across tab navigation during an active session.

- **Frosted Glass Backdrop Opacity Slider**:
  1. *Configurable Opacity*: Added an interactive Opacity Slider under the "Dialog Glass Effect" section in the About tab, allowing fine-tuning of background translucency from 15% (ultra-sheer) to 95% (heavy frost), defaulting to 78%.
  2. *Live Dynamic Styling*: Connected the slider to `--vest-dialog-glass-op` CSS custom variable on `:root` and `document.documentElement` for instantaneous visual feedback across settings cards, detached panels, and floating indicator boxes.
  3. *Settings Persistence*: Saved to `settings.dialogGlassOpacity` with automatic defaults and bounds validation.

### 🐛 Bug Fixes & Permission Policy Violations
- **Prevented Deprecated `unload` Event Listener Violations**:
  1. *Dropped Chrome Unload Warning*: Intercepted `window.addEventListener('unload')` calls in `content/content-main.js` and dropped them cleanly prior to reaching the native event registry.
  2. *Permissions Policy Compliance*: Completely eliminated the Chrome Extensions error `Permissions policy violation: unload is not allowed in this document` triggered on Vest and TradingView pages.

---

## [v1.1.72] — 2026-11-15

### 🐛 Bug Fixes & Trade Duration Helper Resolution
- **Fixed `formatTradeDurationHuman` ReferenceError on Charting Indicators Panel**:
  1. *Resolved Missing Function Name*: Fixed an `Uncaught ReferenceError: formatTradeDurationHuman is not defined` that occurred when clicking the "Charting Indicators" tab whenever closed trades existed in the active trading session.
  2. *Corrected Call Site*: Replaced the call to `formatTradeDurationHuman(t.durationMs)` in `renderTradesBoxSettingsHtml` with `formatTradeDuration(t.durationMs)`.
  3. *Added Backward-Compatible Alias*: Added `const formatTradeDurationHuman = formatTradeDuration;` next to the core `formatTradeDuration()` implementation to safeguard against any future mismatched call sites.
  4. *Automated Test Verification*: Extended `tests/charting-indicators-hub.test.js` with a comprehensive VM execution test that pre-populates active closed positions and validates that the modal renders without any ReferenceErrors or uncaught exceptions.

---

## [v1.1.71] — 2026-11-15

### 🐛 Bug Fixes & Event Listener Lifecycle Resolution
- **Fixed Charting Indicators Tile Expansion & Master Toggle Wiring**:
  1. *Relocated Master Event Wiring*: Fixed a lifecycle bug where event listener attachments for `.vest-ind-master-toggle` (master toggle sliders) and `.vest-indicator-tile-header` (tile click accordion) were inadvertently placed inside `renderRightPaneContent()` prior to template string insertion into the DOM, leaving newly rendered indicator tiles with unattached event handlers.
  2. *Integrated with `wireDialogEvents()`*: Moved tile headers and master switch event listeners into `wireDialogEvents()`, ensuring they are cleanly wired immediately after the DOM tree is populated on the `chartingindicators` tab.
  3. *Accordion Drawer Expansion on Target Scroll*: Ensured that when opening the settings modal with a target indicator (from the Cortex dropdown menu or deep links), the targeted indicator drawer automatically expands even if previously closed.
  4. *Reliable Status Badge & Drawer State*: Toggling the switch or clicking the header immediately updates the `ON`/`OFF` badge, sets the `.is-enabled` card styles, smoothly drops down or collapses the drawer, and synchronizes the draft settings in real time.

---

## [v1.1.70] — 2026-11-15

### 🐛 Bug Fixes & Multi-Window Chart Timeframe Isolation
- **Strict Timeframe Isolation on Multi-Chart & Multi-Window Setups**:
  1. *Blocked Cross-Tab Timeframe Hijacking*: Resolved an issue where having multiple charts open on different timeframes (e.g., 15m on screen 1, 1m on screen 2, 5m on screen 3) caused Cortex and TradingView's native cross-tab sync to force all charts to adopt the timeframe of whichever chart was clicked last.
  2. *Window Storage Event Guard*: Installed a protective wrapper around `window.addEventListener('storage')` at `document_start` in the MAIN world to intercept and drop incoming cross-tab storage events for `tradingview.chartproperties` and `IntervalWidget`, preventing other windows' interval changes from propagating to background charts.
  3. *Cleaned LocalStorage Persistence & Pre-Hydration*: Stripped raw `tradingview.chartproperties` from `collectTvChartLocalStorage()`, `restoreLastChartSettings()`, and `document_start` hydration. Preserved safe pane property overrides without writing raw chart properties to `window.localStorage`.
  4. *Strict Resolution Match on Cross-Window Viewport Sync*: Enforced strict resolution checks in `applyIncomingChartViewportIfNewer()`. Viewport adjustments (pan, zoom, visible range, and price scale) from a focused chart only apply to background charts whose active resolution strictly matches (e.g. 15m $\rightarrow$ 15m). Background charts on different resolutions (e.g. 1m or 5m) remain completely unaffected.
  5. *Timeframe Switch Restoration*: When switching a chart's timeframe (e.g. from 1m or 5m to 15m), the chart automatically pulls and restores the last known focused settings for that specific timeframe (`viewportsByChart[symbol|15]`). Once restored, that chart becomes the author for that timeframe and records any new changes.

---

## [v1.1.69] — 2026-11-15

### 🚀 Major UX Redesign: Consolidated "Charting Indicators" Hub & Expandable Tiles
- **Unified "Charting Indicators" Sub-Section**:
  1. *Clean Left Navigation Sidebar*: Consolidated all 8 separate on-chart indicators (`sessions`, `autofvg`, `news`, `trades`, `candleohlc`, `positionhud`, `faillines`, `cortexindicator`) from individual sidebar tabs into a single unified navigation section titled **"Charting Indicators"** (`id: 'chartingindicators'`).
  2. *Individual Indicator Tile Boxes*: Rendered each indicator as an individual card/tile featuring its custom accent color icon, title, short description, real-time status badge (`ON` / `OFF`), and master ON/OFF toggle slider switch placed immediately to the right of the title.
  3. *Expandable Drawer with Smooth Slide-Down*: When toggled OFF, the settings box is collapsed and hidden (`display: none;`). When toggled ON, an expandable settings drawer drops down right below the tile header (`display: block;` with smooth CSS slide-down animation) revealing all parameters, color swatches, opacity ranges, and action buttons.
  4. *Tile Header Click & Slider Wiring*: Clicking anywhere on a tile header toggles the master switch and expands or collapses the drawer. Live slider changes dynamically update draft settings, sync to chart overlays, and refresh header status pills.
  5. *Backward Compatibility & Smooth Scroll Navigation*: Deep links and dropdown menu triggers (e.g. `openStudioSettingsModal('sessions')`) automatically route to the `chartingindicators` tab, scroll that indicator tile into view, and briefly highlight it with an accent glow.
  6. *Dedicated In-Drawer Action Bars*: Each indicator drawer features dedicated action buttons (Reset Defaults, Center/Reset Position, Sync Positions History, Clear Clicked Candles) aligned cleanly at the top of the drawer.

---

## [v1.1.68] — 2026-11-15

### 🚀 Enhancements & Native Platform Support
- **Disabled Cortex Timeframe Favoriting on My Funded Perpetuals & Kalshi Pro**:
  1. *Native Platform Favoriting Prioritized*: Disabled Trading Cortex's injected timeframe quick-action chips (`#vest-timeframe-favorites`) and star injection on **My Funded Perpetuals** (`myfundedperpetuals.com`, `myfundedperps`) and **Kalshi Pro** (`pro.kalshi.com`, `kalshi.com`), allowing both platforms' native TradingView timeframe favorite stars and buttons to work without visual duplication or event interference.
  2. *Deep Ancestor & Iframe Context Detection*: Implemented robust domain and context detection in `content-main.js` that checks `window.location`, `window.top`, `document.referrer`, `window.location.ancestorOrigins`, and configured firm match patterns across nested chart iframes and blob URLs.
  3. *DOM Cleanup & Event Guarding*: Actively cleans up any existing `#vest-timeframe-favorites` container or injected star buttons when running on platforms with native support, and ensures Cortex capture listeners never intercept or suppress native TradingView star or interval clicks.
  4. *Per-Firm Configurable Switch*: Added `enableTimeframeFavorites` to `DEFAULT_PERP_FIRMS` (default `false` on MFP and Kalshi Pro, `true` on Vest Markets) with a user toggle under "Chart Timeframe Favoriting" in Perp Firm Settings.
  5. *Preserved on Vest Markets*: Retained custom timeframe favoriting chips and star toggles on **Vest Markets** (`next.vestmarkets.com`), which lacks native TradingView interval favoriting.

---

## [v1.1.67] — 2026-11-14

### 🚀 New Features & Enhancements
- **Added Kalshi Pro to Supported Perpetual Firms & Cortex Bar Integration**:
  1. *Kalshi Pro Built-In Support*: Added **Kalshi Pro** (`pro.kalshi.com`, `kalshi.com`) to Trading Cortex's built-in perpetual firm directory with full host permissions, main-world TradingView hooks, and isolated-world UI execution.
  2. *Top-Bar Anchoring on Kalshi Pro*: Integrated header detection for Kalshi Pro's top navigation bar (`Kalshi Pro · MARKETS · TAPE · CANVAS · PERPETUALS · PORTFOLIO`), anchoring the Cortex bar directly below the navigation bar and preserving spacing for the ticker and chart.
  3. *Kalshi Pro Official Vector Logo*: Designed and implemented a vector SVG logo in Kalshi's signature vibrant green (`#00D26A`), displayed in the Perp Firm Settings grid and configuration cards.
  4. *Pair & Leverage Pattern Matching*: Extended market selector detection to automatically detect Kalshi perpetual symbols and leverage formats (e.g., `HYPE PERP 24X`, `KXHYPEPERP`).

- **Streamlined Perp Firm Settings UI**:
  1. *Clean Tile Configuration on Any Browser*: Streamlined the interactive tile grid across all supported firms (**My Funded Perpetuals**, **Vest Markets**, and **Kalshi Pro**). Clicking any tile from any open browser window instantly selects it and presents its complete configuration card.
  2. *Removed "Add Perp Firm" & Clutter*: Eliminated the "+ Add Perp Firm" tile and draft forms to maintain a focused, high-performance experience tailored to supported platforms.
  3. *Removed Delete Buttons*: Removed all tile deletion buttons (`✕`) and detail card removal actions, preventing accidental firm deletions while ensuring all configuration settings remain fully editable and persistent.
  4. *Removed Vest Exchange*: Cleanly removed legacy Vest Exchange from default firm configurations and migration-stripped any historical records from stored preferences.

---

## [v1.1.66] — 2026-11-14

### 🐛 Bug Fixes & Stability
- **Guaranteed Left Drawing Toolbar Persistence & Desync Self-Healing**:
  1. *DOM Ground-Truth Visibility Verification*: Rewrote `isDrawingToolbarVisibleNow()` to inspect true DOM reality (drawing toolbar container elements, magnet buttons, and sidebar group slots) rather than relying on TradingView's internal JS `drawingToolbarAction` checkable state, which falsely remained `true` even when the toolbar was collapsed or missing.
  2. *Eliminated Startup Toolbar Collapse*: Fixed `getHideDrawingsButton()` selector ambiguity where substring matching for `"Hide Drawings"` improperly targeted TradingView's toolbar collapse button ("Hide Drawing Tools"). Added comprehensive negative guards (`tools`, `collapse`, `toggle`, `sidebar`, `toolbar`, `panel`, `expand`), and strictly prevented `restoreSidebarSelections()` from toggling hide buttons unless explicitly saved as `true` by the user.
  3. *Fixed `side_toolbar.state` String Corruption*: Corrected `localStorage` pre-seeding from boolean string `'true'` to `'expanded'`, matching TradingView's internal state schema and ensuring the side toolbar loads expanded on chart initialization.
  4. *Multi-Tier Recovery & Action State Desync Self-Healing*: Enhanced `ensureDrawingToolbarVisible()` with multi-tiered recovery across widget/chart APIs (`showDrawingToolbar()`, `setDrawingToolbarVisibility(true)`), bottom-left chart corner DOM expand toggle selectors, and action state self-healing that automatically detects desynchronized action states and re-toggles `drawingToolbarAction` into DOM sync.
  5. *Accurate Dropdown Badge & Direct Toggle*: Updated the Cortex dropdown "Left Drawing Toolbar" badge to reflect ground-truth DOM state (`VISIBLE` vs `HIDDEN`), and wired the toggle click event to explicitly alternate target visibility (`force: !latestDrawingToolbarVisible`).

---

## [v1.1.65] — 2026-11-14

### 🐛 Bug Fixes
- **Guaranteed Bottom Positions & Orders Panel Re-Docking & Height Restoration**:
  1. *Immediate Table & Row Restoration*: Fixed a critical issue where re-docking the Positions & Orders bottom panel from detached or minimized mode caused the table container to collapse to height 0 (rendering only the tab bar with empty dark space below until a full page refresh).
  2. *Docked Height Persistence*: Automatically captures and preserves the user's true docked height (`panel.dataset.vestDockedHeight`) before detaching or minimizing, and guarantees explicit restoration (`height`, `min-height: 180px`, `flex: 0 0 auto`, `display: flex`, and `flex-direction: column`) upon re-docking.
  3. *Chart Container Flex Restoration*: Resolved a bug where `chartEl.style.height` was captured as falsy and permanently overwritten with `100%`, preventing chart elements from squeezing out the bottom panel. Chart now cleanly relinquishes exclusive height and returns to `flex: 1 1 0%`.
  4. *TanStack Virtualizer & Tab Wake-Up*: Dispatches reflow, resize, and scroll events across inner table containers and virtualizers, and safely synchronizes the active React tab (`info.matchedTab.click()`) upon re-docking, eliminating any requirement to refresh the page.
  5. *Legacy Panel Scanner Isolation*: Cleanly decoupled the bottom positions panel from the legacy `PANEL_DEFINITIONS` scanner, preventing legacy panel header injections or accidental `.vest-panel-collapsed` collapses.

---

## [v1.1.64] — 2026-11-14

### 🚀 New Features & Enhancements
- **Configurable Dialog Glass Effect Setting**:
  1. *Cortex Settings Control*: Added a user-controllable *Dialog Glass Effect* switch in Cortex Settings under a new dedicated **DISPLAY & DIALOG APPEARANCE** section in the About tab.
  2. *Cortex Dropdown Quick Toggle*: Added a 1-click quick-toggle option with live `ON` / `OFF` status badge directly inside the Cortex dropdown menu for instant switching.
  3. *Frosted Glass Aesthetic*: When enabled, detached windows, dialog boxes, and floating panels render with a modern translucent frosted-glass aesthetic (`backdrop-filter: blur(...)` with specular highlights).
  4. *Real-Time Live Application*: Toggling instantly applies or removes the effect on all open dialogs and persists seamlessly to storage.

### 🐛 Bug Fixes
- **Eliminated Viewport & Chart Bleed-Through on Dialogs & Detached Windows**:
  1. *100% Solid Opaque Backdrops*: Detached Positions & Orders window (`.vest-bottom-panel-detached`), Cortex Settings card (`.vest-tvs-card`), Template Manager (`.vest-stm-dialog`), and floating boxes now feature completely solid, fully opaque backgrounds (`#0b0f19` / `#0d121d`) with `backdrop-filter: none !important;` by default.
  2. *Zero Viewport Bleed-Through*: Eliminated candlestick wicks, candles, order lines, and fail price overlays shining or blurring through the dialog body or empty panel space.
  3. *Isolated Stacking Context & High Z-Index*: Applied `isolation: isolate !important;` and elevated detached window z-index to `2147483640` (and `2147483645` on active interaction/drag), ensuring all dialogs float firmly above all chart canvas, order lines, and fail lines.

---

## [v1.1.60] — 2026-11-14

### 🚀 New Features & Enhancements
- **Dev Branch Red Glow, Version Number Display & Bleeding Edge Title Bar**:
  1. *Version Number Subtext*: Replaced the `'dev'` label on the Cortex top bar pill with the active extension version number (`v${version}`) across both dev and production branches.
  2. *Dev Channel Red Glow Theme*: Signifies dev/bleeding edge branch with a vibrant red outer glow (`rgba(239, 68, 68, 0.35)`), red border, and red-tinted icon and subtext, distinct from the blue/cyan production theme.
  3. *Channel Header in Dropdown Menu*: Added a prominent title bar at the very top of the Cortex dropdown menu directly above "Template Manager...". It displays "Bleeding Edge" (with a glowing red indicator and `DEV` badge) on dev builds, or "Production" (with a glowing blue indicator and `RELEASE` badge) on production builds, accompanied by the active version number directly beneath the title.
- **Dynamic Positions Taskbar Integration, Unified Design & Per-Firm Scoping**:
  1. *Conditional Top-Bar Display*: The POSITIONS button now strictly hides (`display: none`) when the bottom info panel is in its normal docked state, eliminating any visual obstruction of chart timeframe buttons or platform controls. It only displays when the user explicitly minimizes or detaches the bottom panel.
  2. *Unified Minimized Window Styling*: Redesigned the POSITIONS top-bar item to match the other minimized items (`UPCOMING NEWS`, `INSTRUMENT TRADES`, `CORTEX DIAG`) identically: 8px rounded corners (`is-minimized-pill`), glowing status dot (cyan for minimized, purple for detached), bold uppercase title (`POSITIONS`), position count badge, state tag (`MIN` / `DETACH`), and restore arrow icon (`↗`).
  3. *Dynamic Taskbar Slot Queue Participation*: Integrated the positions pill directly into `getActiveMinimizedWindowOrder()` and `repositionAllMinimizedBoxes()`, so when minimized or detached it occupies the next available taskbar slot sequentially without colliding with or covering any other window.
  4. *Per-Firm Scoping & Toggle*: Decoupled bottom panel state from global storage into `settings.bottomPanelStates[firmId]`, allowing each prop firm (My Funded Perpetuals, Vest Markets, etc.) to remember its own minimized/detached state independently. Added a dedicated toggle switch in Section 5 ("Positions & Orders Panel Management") within Prop Firm settings to enable or disable the feature per firm.
- **Prop Firms Management, Universal Deletion & Official Vector Logos**:
  1. *Universal Prop Firm Deletion*: Added quick delete `✕` buttons directly on every prop firm tile in the Prop Firms grid as well as a universal `Remove Prop Firm` button in the detail card, enabling deletion of any firm (including default/built-in firms). Deleted IDs are persisted in `settings.deletedFirmIds` and permanently excluded from re-spawning during configuration normalization.
  2. *Official Vector Logos*: Extracted and vectorized official SVG logos directly from respective platforms: My Funded Perpetuals (official gold & blue shield trophy mark), Vest Markets (official emerald/cyan geometric V-bracket mark), Vest Exchange (sky blue & indigo geometric V-bracket mark), and a sleek candlestick chart glyph for custom user-added firms. Logos are displayed across both the grid tiles and detail card headers.
  3. *Vest Selected Account Tracking & Auto-Restoration on Refresh*: Automatically tracks the active trading subaccount on Vest Markets (`next.vestmarkets.com`, `vestmarkets.com`, `vest.exchange`) and seamlessly restores the tab to that account upon browser refresh or reconnection. Configurable per prop firm via a new toggle switch in Section 4 ("Account Persistence & Subaccount Routing") within Prop Firm settings.
- **Defensive Extension Invalidation Protection**:
  1. Hardened all event listeners (`chrome.storage.onChanged`, `window.addEventListener('message')`, and recurring background interval timers) with `isExtensionValid()` guards and `try / catch` boundaries to prevent benign Chrome extension context invalidation errors during development reloads or channel updates.

### 🐛 Bug Fixes
- **TradingView Left Drawing Toolbar Restoration & ReferenceError Fix**:
  1. *Fixed Scope ReferenceError in Sidebar Scanner*: Resolved an issue where `rect` was referenced without being defined inside `scanDomSidebarGroupSlots()` and the candidate scanner in `content-main.js`, causing a silent runtime error that made `isDrawingToolbarVisibleNow()` report false.
  2. *Guarded Toggle Action*: Fixed `ensureDrawingToolbarVisible()` to verify `getCheckableActionState('drawingToolbarAction') === false` before executing `drawingToolbarAction`, guaranteeing that an already open toolbar is never inadvertently toggled off during chart initialization.
- **Dynamic Taskbar Next-Available Slot Allocation for Minimized Windows**: Fixed an issue where minimized chart windows (Upcoming News, Instrument Trades, Cortex Diagnostics) had hardcoded slot coordinates, causing windows minimized out of order to stack directly on top of or below each other.
  1. *Dynamic Taskbar Order Queue*: Implemented `minimizedWindowOrder` tracking the exact chronological order in which windows are minimized, allocating each window to the next available horizontal slot in the Cortex top bar rather than a fixed predetermined spot.
  2. *Adaptive Left-Anchor Calculation*: Implemented `getTaskbarStartLeft()` to automatically detect the right-most bounding edge of all permanent top-bar elements (Cortex menu pill and Positions pill), guaranteeing minimized pills never overlap or collide with existing toolbar controls.
  3. *Seamless Shift on Restore & Resize*: When any minimized window is restored, `repositionAllMinimizedBoxes()` automatically shifts all subsequent minimized pills to the left to cleanly fill the vacated slot, exactly like the Microsoft Windows taskbar.
  4. *Smooth Slot Transitions*: Added cubic-bezier transitions for `left` and `top` properties so minimized pills glide smoothly into their assigned taskbar slots.
- **Permanent Global Drawings Removal & Anti-Respawn**: Fixed an issue where removing a drawing that was "Synced Globally" would cause it to respawn and come right back after being deleted.
  1. *Eliminated Focus Gating on Removal & Toggling*: Removed artificial `chartMemoryTabFocused` and `globalDrawingRestoreSuppression` checks from drawing deletion and context menu handlers. When a drawing is removed on the chart, it is an explicit user action and is processed immediately regardless of tab focus tracking or iframe boundaries.
  2. *Hooked Chart Entity Removal & Model Source Deletion*: Hooked `activeChart.removeEntity`, `activeChart.removeEntities`, `activeChart.removeAllShapes`, and internal `model.removeSource` to intercept any drawing deletion triggered by the user (Delete key, Backspace, floating toolbar trash icon, right-click menu, or API calls).
  3. *Unconditional Eviction & Broadcast*: When a shape mapped in `globalDrawingEntityMap` is removed, its global ID is immediately registered in `removedGlobalDrawingIds`, purged from memory, synchronously excluded from isolated world state, broadcast via `VEST_TV_GLOBAL_DRAWINGS_UPDATE` to all tabs and frames, and permanently updated in `chrome.storage.local` and disk DB.
  4. *Diff Reconciliation in Periodic Restores*: In `restoreGlobalDrawings()`, mapped shapes that were previously confirmed alive on the chart for the current symbol and have disappeared from `activeChart.getAllShapes()` are recognized as user deletions and permanently unmapped, preventing `restoreGlobalDrawings()` from recreating them.
  5. *Multi-Tab & Cross-Chart Deletion Propagation*: When Tab A deletes a global drawing, Tab B receives the updated registry and automatically removes the local shape from its chart.
  6. *Reliable Un-Sync Toggling*: Un-syncing a shape via the "Sync globally" context menu now cleanly un-maps the shape from the global registry without deleting the local shape from the active chart, and without requiring focus verification.
- **Comprehensive DEX & Web3 Session Preservation on Browser Refresh & Updates**: Completely resolved the root cause of session logouts on Vest Markets and other Web3 DEX platforms during updates or page refreshes.
  1. *Strict Whitelist Enforcement*: Tightened `isSafeTradingViewStorageKey` to a strict whitelist for drawing tools (`linetool.*`, `properties_toolbar.position`, `ChartDrawingToolbarWidget.visible`, `drawingToolbar.*`, and safe chart properties). Removed overly broad prefix matches (`tradingview.*`, `tv.*`, `tvlocalstorage.*`) that allowed platform user layout state, drawing flush tokens (`tv-drawings-flush`), and account snapshots to be captured.
  2. *Active Legacy Token Purge*: Implemented an automatic cleanup at `document_start` across `window.localStorage` and `window.top.localStorage` to actively purge any legacy leaked keys (such as `user-state-layout-base:e3cd52e5-5f3e-5259-a7b5-b28416a1d7da` and stale drawing/layout flush records) left behind by previous versions.
  3. *Domain Vault & Disk DB Sanitization*: Hardened `readDomainVault()` and `writeDomainVault()` in `content-isolated.js`, `runDatabaseMigrations()` in `service-worker.js`, and `syncLocalJsonDatabase()` in `update.js` to strictly strip non-whitelisted keys before saving or restoring settings.
  4. *Clean Disk Database*: Purged 82 polluted legacy snapshot keys from `user-data/cortex-db.json` on disk.
  5. *Safe Update Deployment*: Ensured `update.js` never triggers disruptive forced reloads that sever active Web3 wallet connections or leave orphaned extension contexts while the runtime reloads.
- **TradingView Left Drawing Toolbar Unconditional Restoration**: Resolved the missing left drawing toolbar issue across My Funded Perpetuals (`myfundedperpetuals.com`) and Vest Markets (`vestmarkets.com`).
  1. *Eliminated Viewport Coordinate Bug*: Resolved a critical bug where `scanDomSidebarGroupSlots()` was discarding all toolbar buttons when `rect.left > 140px`. On platforms with a left page sidebar (or browsers with vertical tab panels, e.g. My Funded Perpetuals), the chart's left edge is offset to x > 140px, which caused the scanner to misreport that the toolbar was missing and repeatedly trigger `drawingToolbarAction`, inadvertently collapsing the toolbar. Switched to `closest()` container detection and chart-relative horizontal coordinate offsets.
  2. *Direct Ground-Truth DOM Container Detection*: Implemented `getDrawingToolbarContainer()` querying `[data-name="drawing-toolbar"]`, `[class*="drawingToolbar"]`, and `[class*="chart-controls-bar"]` with strict geometry checks (`width > 20px` & `height > 50px`).
  3. *Toggle Guard*: Guaranteed that `ensureDrawingToolbarVisible()` checks `isDrawingToolbarVisibleNow()` first and immediately aborts if the toolbar is already visible, ensuring that the toggle action (`drawingToolbarAction`) can never accidentally collapse an open toolbar.
  4. *Smart 1-Click Force-Show*: Upgraded the **Left Drawing Toolbar** item inside the CORTEX dropdown menu so clicking it when the toolbar is hidden will force-show (`force: true`) the toolbar.
  5. *Unconditional Storage Pre-Hydration*: Asserted `ChartDrawingToolbarWidget.visible`, `tvlocalstorage.ChartDrawingToolbarWidget.visible`, `tradingview.ChartDrawingToolbarWidget.visible`, `drawingToolbar.visible`, and `side_toolbar.state` to `'true'` at `document_start` across `window.localStorage` and `window.top.localStorage`, and prevented legacy stored `'false'` entries in `toolbarStorage` from overwriting the toolbar visibility to hidden.
  6. *Expanded Target Scope*: Included `activeWidget` in `targets` alongside `activeChart` and `activeChartApi`, directly calling `showDrawingToolbar()`, `setDrawingToolbarVisibility(true)`, and `executeActionById('drawingToolbarAction')`.
  7. *DOM Expand/Toggle Detection*: Added direct TradingView collapse/expand toggle button detection (`button[data-name="drawing-toolbar-visibility"]`, `button[data-name="toggle-visibility-drawing-toolbar"]`, `button[class*="collapseButton"]`, `button[class*="toggleButton"]`) to click and expand the toolbar if collapsed.
- **Extension Context Invalidation Guard**: Completely eliminated `Uncaught Error: Extension context invalidated` errors when the extension updates or reloads. Hardened `isExtensionValid()` to perform runtime URL binding checks, wrapped `renderStudioHeaderPill()` in defensive context guards, and attached invalidation self-termination to all background `setInterval` timers (`studioPillHeartbeat`, `orderAmountInterval`, `stopLossInterval`, `failPricesInterval`, `estimatedPnlInterval`, `manualTicketInterval`, `newsBoxTickerInterval`, `tradesDomScanInterval`, and `diagnosticsBoxPollTimer`) so orphaned content scripts gracefully self-terminate their timers when the extension context unloads.
- **Timeframe Toolbar Harmony with Third-Party Buttons (TV / Vela)**: Resolved the rapid jumping and DOM positioning fight between Cortex timeframe shortcut buttons and third-party indicator buttons (`TV / Vela`). Let the third-party indicator (`TV / Vela`) hold the front position directly following the native interval button, situating Trading Cortex timeframe buttons cleanly immediately after it without DOM re-entry or MutationObserver churn.

### ✨ Features
- **Join Our Discord Community Banner**: Added an official Discord community banner at the very top of the About tab in the Settings Dialog linking directly to `https://discord.gg/ztXmwMBQ2Y` with official Discord Clyde vector branding, blurple styling, and one-click launch.
- **80% Viewport Settings & Manager Panel**: Expanded the Trading Cortex multi-tab Settings dialog and Template Manager dialogs to take up 80% around each side of the screen (`80vw` × `80vh`), centered in the viewport with responsive bounds, providing expansive breathing room for side-by-side perp firm tiles, session configurations, and controls.
- **Bottom Positions & Orders Detach & Minimize**:
  - Added dedicated `DETACH` button to the bottom positions and orders box, popping it out into a floating, moveable, resizable HUD window so the chart can become full screen.
  - Added `MINIMIZE` button to minimize the bottom panel directly to the Cortex top toolbar system, instantly collapsing the panel and split resizer so the chart expands to 100% full screen.
  - Added interactive Cortex toolbar pill (`POSITIONS (2) • DOCKED / MINIMIZED / DETACHED`) for instant one-click toggle or restore anytime.
  - Added `Alt + P` keyboard shortcut to quickly toggle the bottom panel between minimized full-screen chart mode and docked mode.
- **Perp Firm Settings**: New dedicated settings manager accessible via the Cortex dropdown menu and the multi-tab Settings dialog.
- **Side-by-Side Firm Tiles**: Displays configured perpetual brokers and prop firms (My Funded Perpetuals, Vest Markets, Vest Exchange, plus custom firms) in side-by-side tiles with site badges and visual statuses.
- **Per-Firm Layout & Offsets**: Configure custom top-bar offsets, custom bottom margins, firm header height reference, default order leverage, account tiers, and trader notes for each firm.
- **Dynamic Firm Registration**: Easily add any perpetual firm or prop broker by URL. Trading Cortex dynamically requests host permissions and registers content scripts at runtime.
- **Live Layout Adaptation**: Cortex top-bar automatically adapts position and bottom margin based on the active perp firm.

### ⚡ Bleeding Edge
- Active development branch tracking upcoming v1.1.47 release.
- Live Alpha version metadata (`1.1.47 Alpha`) across manifest, popup, and Update Center.

---

## [v1.1.44] — Cortex Top Bar Relocation, Diagnostics Suite & Dev Channel Updater

### ✨ Features
- **Dev Branch (Bleeding Edge) Update Channel**: Added a channel switcher in the Update Center letting users toggle between Stable (Release) and Dev channels. Dev channel inspects recent branch commits, displays commit hashes and messages, downloads `zipball/dev`, and seamlessly unpacks/installs the latest bleeding-edge commits with dedicated amber badges and toolbar indicators.
- **Header-Docked Cortex Toolbar**: Relocated the Trading Cortex toolbar from the bottom of the screen to directly below Vest's main navigation header and above the market ticker row / chart / order box.
- **Top Bar Minimized Dock**: Minimized News, Trades, and Diagnostics pills now dock cleanly inside the top bar beside the Cortex Studio pill.
- **Dynamic Header & Viewport Management**: Automatically measures main navigation header height and adjusts chart container margins, removing bottom constraints to maximize vertical chart real estate.
- **On-Chart Diagnostics Box**: Live telemetry overlay displaying current Chrome Tab ID, chart engine status, TradingView canvas detection, DOM health, and quick actions.
- **Reset Chart View**: Restores the last known resolution, symbol, and viewport configuration via Diagnostics Box quick action or Alt+R.

### 🐛 Fixes
- Report folder-picker and deployment failures in the Update Center, terminal, and browser console instead of silently swallowing them.
- Explain the Chrome security-policy denial and direct users to link the unpacked extension source folder when the browser blocks a protected directory.

---

## [v1.1.43] — Chart Paper Stats Overlay

### ✨ Features
- Display the saved per-instrument paper entry, TP1/TP2/TP3, and stop-first counts in a compact overlay on the chart while the Cortex Indicator is enabled.

---

## [v1.1.42] — Irish Browser Voice Preset

### ✨ Features
- Add an Irish English browser-voice preset when an `en-IE` voice is available, with a slightly higher pitch and a test button. Browser voices do not expose gender, so the selected voice can be auditioned before use.

---

## [v1.1.41] — Cortex Voice Alerts

### ✨ Features
- Add once-per-bar spoken “Buy/Sell signal forming” alerts and confirmed “Buy Now” / “Sell Now” calls, with independent toggles and a selectable browser voice under Alerts & Voice Settings.

---

## [v1.1.40] — Open Orders Tab Detection

### 🐛 Fixes
- Match Vest's visible Open Orders account tab by its full rendered label, including its optional count, and report whether discovery or activation failed.

---

## [v1.1.39] — Robust Open Orders Panel Discovery

### 🐛 Fixes
- Find Vest's Open Orders tab directly and locate its account panel by the shared tab group/table instead of relying on the panel manager's heuristic selector.
- Recognize the selected state from ARIA and common tab-state attributes before reading the no-orders message or visible rows.

---

## [v1.1.38] — Read Open Orders Panel State

### 🐛 Fixes
- Read the selected Vest Open Orders table and its explicit empty state when a numeric tab badge is absent. Restore the previously selected positions/orders tab after preflight checks.
- Keep the Open Orders panel available during target-order staging so each limit is verified from the actual order count or rows.

---

## [v1.1.37] — Ticket Entry Buttons and Order Count Parsing

### ✨ Features
- Moved the manual live-entry controls from the chart into Vest's order ticket and added separate Buy and Sell buttons.
- Both directions use the current ticket size, configured stop, and three reduce-only limit targets after Vest confirms the market position.

### 🐛 Fixes
- Fixed the Open Orders count parser to handle Vest's multiline accessible tab label, which had incorrectly blocked entry with an “unable to read order count” error.

---

## [v1.1.36] — Manual Chart Buy with Target Orders

### ✨ Features
- Added a chart **LIVE BUY + TARGETS** action with a review prompt using the current Vest ticket size.
- After confirmation, it submits a market long with the configured stop, waits for Vest to show the filled position, then submits three reduce-only limit sells near the configured target prices.
- The flow requires no same-instrument position or existing open orders and stops if Vest does not confirm the position or an individual target order.
- Target amounts round to instrument precision; the manual flow does not yet move the stop after target fills. Signal-driven Live automation remains locked; the manual button is a separate live action and can submit real orders regardless of the Paper/Live signal-automation selector.

---

## [v1.1.35] — Cortex Indicator Paper Stats

### ✨ Features
- Added a per-instrument Paper stats box for simulated entries, TP1/TP2/TP3 hits, and stops hit before any target.
- Paper statistics persist with the existing local paper ledger and remain available when Settings is reopened.

---

## [v1.1.34] — Cortex Indicator Paper Signal Automation

### ✨ Features
- Added closed-candle signal processing and a Paper mode simulator with three 25%-of-original target exits and staged stop movement.
- Ignore opposing signals during the first five bars after entry. Later opposing signals flatten the paper position before entering the new side.
- Added Paper/Live mode controls and a separate live-arm switch. Live execution remains fail-closed until Vest's full multi-order workflow is verified; no live orders are submitted.

---

## [v1.1.33] — Simplified Cortex Indicator Display

### ✨ Features
- Removed the shaded trend cloud and its width/opacity controls. The EMA centerline, stepped trend stop, Buy/Sell markers, projected levels, and multi-timeframe table remain.

---

## [v1.1.32] — Cortex Indicator Level Guide Endpoints

### ✨ Features
- Draw dotted Entry, Stop, and Target guides leftward from their labels, ending their left edge at the first later candle whose range reaches the level. Levels never reached remain anchored at the signal candle.

---

## [v1.1.31] — Cortex Indicator Risk and Label Controls

### ✨ Features
- Configure fixed-point or ATR-based stop/target distances. Fixed-point defaults are an 8-point stop and 4-point spacing between targets (TP1/TP2/TP3 at 4/8/12 points from entry).
- Adjust level-label font size and box size independently.

---

## [v1.1.30] — Cortex Indicator Prototype

### ✨ Features
- Added a separate Cortex Indicator settings tab with configurable EMA/ATR trend cloud, trend-flip Buy/Sell markers, latest signal entry/stop/three target levels, and a multi-timeframe trend table.
- This is an original approximation based on the supplied screenshot; the source indicator formula is unavailable. The projected levels are visual estimates and do not place orders.

---

## [v1.1.29] — Session High/Low Extension Modes

### ✨ Features
- Choose to extend uncleared session High/Low levels to the chart edge until the first sweep or close-through, or extend all levels even after they are cleared. This also applies while a session is still forming.

## [v1.1.28] — Sync Globally Menu and Focused Drawing Sync

### 🛠️ Fixes
- Activate the Sync globally menu action before TradingView removes its context menu, preserve the selected drawing ID, and close the native menu after the action.
- Make the focused tab the only source of global drawing additions, edits, removals, and sync toggles; matching background charts apply updates without writing them back.

## [v1.1.27] — Focused-Tab Viewport Sync

### 🛠️ Fixes
- Make the focused tab the sole publisher of chart viewport changes. Matching background tabs follow its pan and zoom updates without echoing their own viewport back.

## [v1.1.26] — Per-Instrument, Per-Timeframe Chart Viewport Memory

### 🛠️ Fixes
- Store viewport state under an instrument-and-interval key, restore only the active chart's matching viewport, and apply newer viewport updates in other open tabs.
- Preserve viewport entries independently when settings updates arrive from multiple tabs.

## [v1.1.25] — Live Global Drawing Sync Across Open Tabs

### 🛠️ Fixes
- Limit the persisted-drawing hydration wait to the first six seconds for each chart and instrument; active tabs now create newly synced drawings immediately.

## [v1.1.24] — Preserve Drawings When Syncing Globally

### 🛠️ Fixes
- Do not delete chart entities when a global-sync record is absent during an asynchronous storage update; simply stop tracking them as synced.

## [v1.1.23] — Drawing Restore and Deletion Reliability

### 🛠️ Fixes
- Remove user-deleted drawings from persistent memory and keep intentionally deleted auto-FVGs from being recreated.
- Check Vest's saved chart drawings before restoring global drawings, and clean up identical duplicates.

## [v1.1.22] — Correct Favorite Timeframe Anchor

### 🛠️ Fixes
- Target the top-toolbar interval wrapper by its actual `id`, avoiding the separate chart-title interval control.

## [v1.1.21] — Favorite Timeframe Strip Placement

### 🛠️ Fixes
- Move favorite shortcuts into the full-width toolbar row after the interval selector group, outside its overflow clipping container.

## [v1.1.20] — Visible Favorite Timeframe Shortcuts

### 🛠️ Fixes
- Place starred interval buttons outside the chart selector's clipped toolbar group so they appear beside the current timeframe.

## [v1.1.19] — Timeframe Favorite Toolbar Placement

### 🛠️ Fixes
- Anchor favorite shortcuts directly beside the visible current interval button in the chart's top toolbar.

## [v1.1.18] — Favorite Timeframes Beside Interval Selector

### 🛠️ Fixes
- Keep starred timeframe shortcuts beside the current interval, including chart layouts without TradingView's interval-group marker.

## [v1.1.17] — Session Close-Through Detection

### 🛠️ Fixes
- Scan every post-session candle so an early sweep cannot prevent detection of the later close-through that stops the line and removes its label.

## [v1.1.16] — Session Labels Follow Stopped Lines

### 🛠️ Fixes
- Remove right-side session labels and price badges once their High/Low line has stopped at a completed close-through or sweep bar.

## [v1.1.15] — Sync Globally Menu Dismissal

### 🛠️ Improvements
- Close the drawing context menu immediately after selecting **Sync globally**.

## [v1.1.14] — Stopped Session Line Labels

### 🛠️ Improvements
- Hide the right-side session High/Low labels and price badges after their lines stop at a completed candle close through the level.

## [v1.1.13] — Session H/L Line Extension

### ✨ New Features
- Added a Session Indicators toggle to extend recent session High/Low lines to the chart edge or stop at the first completed candle close through the level.

## [v1.1.12] — Full-Screen News and Trades Boxes

### ✨ New Features
- News and Trades boxes can be dragged anywhere in the screen area above the Cortex bottom bar.
- Minimized News and Trades pills now dock inside the Cortex bottom bar.

## [v1.1.11] — Bottom Bar Content Clearance

### 🛠️ Improvements
- Reserve 50px for the fixed bottom Cortex bar and constrain the full-height trading app to the remaining viewport.
- Enable document scrolling so bottom content remains reachable.

## [v1.1.10] — Bottom Bar and Blue Glow

### ✨ New Features
- Moved the 50px Cortex bar to the bottom edge of the viewport.
- Restored a stronger blue glow along the top edge and positioned the dropdown menu above the bar when needed.

## [v1.1.9] — Top Bar Sizing and Layering

### 🛠️ Improvements
- Reduced the Cortex top bar from 100px to 50px.
- Lowered the bar's stacking layer so higher-level third-party extension overlays remain visible.

## [v1.1.8] — Cortex Top Bar

### ✨ New Features
- Moved the existing Trading Cortex dropdown into a dedicated 100px black top bar.
- Added a blue glow along the lower edge of the bar; site content flows below it.

## [Unreleased — Next Release after v1.1.8]

### ✨ New Features

#### 1. **Auto FVG's (Automatic Fair Value Gap Detection & Template Engine)**
- **Dedicated Settings Tab & Quick-Access Menu**:
  - Added **"Auto FVG's..."** with a live `ON` / `OFF` status badge to the top-left Cortex dropdown menu and a new **Auto FVG's** tab in the Studio Settings modal.
- **3-Candle ICT Fair Value Gap Detection**:
  - Automatically scans chart bars for Bullish FVGs (`BISI`: `candle3.low > candle1.high`) and Bearish FVGs (`SIBI`: `candle3.high < candle1.low`) across any timeframe (`1m`, `5m`, `15m`, `1h`, `4h`, `1D`, etc.).
  - Preserves the full 3-candle price bounds of each FVG without shrinking vertically when touched by subsequent price bars.
- **Automatic Timeframe Template Matching**:
  - Automatically detects the active chart timeframe (e.g. `5m`) and searches saved Rectangle templates for a match (`"5m Bullish FVG"` / `"5m Bearish FVG"`, `"5m FVG"`, `"Bullish FVG"`, or `"FVG"`).
  - Applies the matched template's exact fill color, border, opacity, 50% Consequent Encroachment (CE) midline, text alignment, and label (`"5m FVG"`).
  - Falls back to a configurable **Default FVG Template** with customizable Bullish/Bearish colors, opacity, 50% CE midline, and `{tf} FVG` label format when no saved template matches.
- **Configurable Unreclaimed Extension & Reclaim (Mitigation) Behavior**:
  - **Unreclaimed Extension Mode**: Let users choose between:
    1. *Extend Far Right Until Reclaimed* (extends to the right-hand price scale until mitigated, then cuts off at the reclaim candle).
    2. *Extend to Current Time (+ Bars)* (extends up to the latest live bar plus any user-specified number of future bars—e.g. `+5 bars` past the current candle—until mitigated, then cuts off at the reclaim candle).
    3. *Follow Matched Template's "Extend Right" Setting*.
  - **Bars Past Current Bar (`extendFutureBars`)**: Configurable number of bars (`0` to `200`) to project active unreclaimed FVGs ahead of the current time candle.
  - **Reclaim Condition**: Choose between *Candle Close Through FVG (Body)* (waits for a closed candle body beyond the gap) or *Full Wick Fill Through FVG*.
  - **Dedicated "Show Reclaimed FVG's" Toggle Box & Full Element Customization**:
    - Moved Reclaimed FVG settings into a dedicated toggle card (`Show Reclaimed FVG's`) that expands to reveal its controls when enabled and collapses cleanly when toggled off.
    - Added **Reclaimed Color Mode** (*Automatic Reclaimed Color* vs. *Keep Original Color (Dimmed)*), **Max Reclaimed History** count (`5` to `60`), and independent color + opacity controls for all three parts of a Reclaimed FVG:
      1. **Box Fill Color & Opacity** (`0%`–`100%`)
      2. **Border Color & Opacity** (`0%`–`100%`)
      3. **Middle Line (50% CE) Color & Opacity** (`0%`–`100%`)
  - **TradingView Default Color Picker Popover**:
    - Replaced standard browser color inputs across Auto FVG's, Session Indicators, and the Template Manager with a custom **TradingView Default Color Picker Popover** featuring the 8×10 grayscale + vibrant hue/shade matrix, custom `+` color swatches, and integrated Opacity slider.
  - **Persistent Created-FVG Log & Duplicate Prevention Across Refresh**:
    - Maintains a persistent log (`__trading_cortex_created_fvgs_log__` in `localStorage`) of every FVG created per symbol, timeframe, direction, and formation candle timestamp/bounds.
    - On page refresh or redraw, checks the persistent Created-FVG Log first: if an FVG has already been created, it links to the existing shape and **never** creates a second box; if it has not been created yet, it creates it once and logs it.
    - Automatically cleans up any pre-existing duplicate rectangles stacked at identical FVG coordinates and adds a **"Clear Created FVG Log"** button in **Settings &rarr; Auto FVG's**.

#### 2. **Moveable Economic News Box on Chart (`Economic News Box` Tab)**
- **On-Chart Draggable News Widget**:
  - Displays upcoming macro economic releases directly on the chart with **Event Time**, **Country of Origin** (with optional flag emoji), **Red / Yellow / Green Folder Icon**, **Event Title**, and a **Live Countdown Badge** (e.g. `in 14m` / `2h 10m`).
- **Viewport-Pinned Relative Positioning**:
  - Dragging the News Box anywhere on the chart saves its relative viewport coordinates (`relX`, `relY`) so it stays pinned inside the chart viewport and never goes off-chart as price moves, panels collapse/expand, or the window resizes.
- **Full Customization & Settings Tab**:
  - Toggle **Red Folder (High)**, **Yellow Folder (Medium)**, and **Green Folder (Low)** events and customize each folder's color using the TradingView color picker.
  - Filter by **Country of Origin** (`USD`, `EUR`, `GBP`, `JPY`, `CAD`, `AUD`, `CHF`, `NZD`, `CNY`), customize timezone (`New York EST/EDT`, `Local`, `UTC`), `12h`/`24h` time format, box width, background color/opacity, border color, and add custom scheduled news events.

#### 3. **Moveable Instrument Trades Box on Chart (`Instrument Trades Box` Tab)**
- **On-Chart Draggable Instrument Trades Widget**:
  - Displays trades taken for the **currently selected instrument** on the chart (automatically filtering and updating whenever the user switches instruments).
  - Shows **Entry Time → Exit Time**, **Trade Duration** (e.g. `17m`, `14m 22s`, `1h 05m`), **Long/Short Badge**, and **Realized PnL** (`+$...` / `-$...`) for each trade, plus an optional summary footer with **Win Rate %**, **W/L count**, and **Net PnL**.
- **Outcome Row Highlighting (Green Winning Rows & Red Losing Rows)**:
  - Automatically highlights **winning trade rows (`PnL > 0`) in green** and **losing trade rows (`PnL < 0`) in red**, with full TradingView color picker + opacity customization for both winning and losing row highlights.
- **Viewport-Pinned & Auto/Manual Trade Sync**:
  - Uses relative chart viewport anchoring (`relX`, `relY`) so it stays inside the chart viewport and never goes off-screen.
  - Automatically captures completed trades from platform history tables and API responses, and includes a built-in Trade Logger in **Settings → Instrument Trades Box** to manually add, inspect, or clear trades.

#### 4. **ICT Killzones & Session Indicators (`Session Indicators` Tab)**
- **ICT Session Boxes & Watermarks**:
  - Added shaded session boxes with customizable colors, opacity, and auto-scaling centered watermarks for **Asia** (`20:00–00:00`), **London** (`02:00–05:00`), **NY AM** (`09:30–12:00`), **NY Lunch** (`12:00–13:00`), and **NY PM** (`13:30–16:00`) in New York time (`America/New_York`).
  - Rendered behind chart candles and drawings (`mix-blend-mode: screen`) so session boxes never block user drawings or candlesticks.
- **Dual Session High / Low Liquidity Lines**:
  - **Line 1 (Solid Swept Line)**: Extends horizontally from the session box until a subsequent candle sweeps the Session High or Low, cutting off at the exact sweep bar.
  - **Line 2 (7-Day Extended Dotted/Dashed Line + Price Axis Badge + Date Label)**: Extends to the far-right price scale with a live color-coded price tag on the right-hand price axis and a customizable date + session label (e.g., `10-19-26 NY AM High`), automatically expiring after 7 days.
- **Customizable Date Stamp & Label Styling**:
  - Configurable **Date Stamp Format** (defaulting to `M-d-y`, with support for `MM-dd-yy`, `M/d/y`, `M-d-yyyy`, `MMM/d`, `yyyy-MM-dd`, etc.).
  - Configurable vertical placement (*Auto Outside*, *Top*, *Inline* with automatic line-break gap around text, *Bottom*), horizontal placement (*Far Right*, *Center*, *Left*), line style (*Dotted*, *Dashed*, *Solid*), font size, font style (*Normal*, *Bold*, *Italic*, *Bold Italic*), and color (*Match Session* or *Custom Color*).

### 🐛 Bug Fixes & Performance Improvements
- **True High/Low Wick Extraction**: Fixed TradingView internal bar tuple mapping (`[time, open, high, low, close, volume]`) so Session High/Low lines and FVGs always anchor to the exact candle high/low rather than volume or open/close.
- **Multi-Session Same-Bar Boundary Fix**: Fixed `computeIctSessionsFromBars` so sessions that end and start on the same candle timestamp (e.g. `NY Lunch` ending at `13:00` and `NY PM` starting at `13:30` on `30m`/`1h` charts) both render accurately.
- **Zero-Lag, Flicker-Free Chart Dragging**:
  - Attached capture-phase pointer/mouse drag listeners and used `timeScale.rightOffset()` + `timeScale.barSpacing()` so overlays move pixel-for-pixel during active chart panning.
  - Coalesced drag/scale redraws to a single `requestAnimationFrame` per display refresh and isolated the parent stacking context (`isolation: isolate`) to eliminate blend-mode color flickering while moving the chart.
- **Seamless Instrument Switching Without Session or UI Freeze**:
  - Added `handleInstrumentOrChartSwitch()` triggered on symbol/instrument changes (`pollInstrumentAndPrice`, `activeChart.onSymbolChanged`, `mainSeries` symbol resolution, or widget replacement).
  - Automatically invalidates stale chart model, bar extraction, time-point, price-axis, and canvas caches, re-hooks newly mounted chart iframes/models/series via `WeakSet` tracking, ensures the new symbol's price scale stays in `autoScale` mode (preventing another symbol's saved price range from locking the new instrument's vertical scale), and runs staggered recomputations as the new instrument's historical candles stream in.

---

## [v1.1.7] — Previous Release
- Added **Remember Last Chart Settings** (persisting symbol, timeframe, candle type, and exact viewport pan/zoom across page refreshes).
- Improved **Remember Selected Drawing Tools** on the left-hand sidebar (including Magnet mode, Stay in Drawing Mode, Lock All Drawings, and Hide All Drawings).
- Added Update Center (`OTA`) and GitHub release packaging.
