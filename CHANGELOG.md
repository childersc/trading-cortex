# Trading Cortex — Changelog & Version History

All notable changes, new features, and bug fixes through the current release (`v1.1.67`) are documented in this file.

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
