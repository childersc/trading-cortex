Trading Cortex v1.1.94 — Settings Scroll-Jump & Accounts Toggle Fix

- **Fixed Settings Modal Jumping Back to Top (`v1.1.94`)**: Eliminated unwanted modal re-renders triggered by background viewport/account storage writes and self-save echoes. Genuine cross-browser live updates now preserve exact scroll position and open indicator drawers.
- **Fixed Accounts & Risk Master Toggle Reverting (`v1.1.94`)**: Wired `accountsrisk` directly into the Indicator Hub master toggle handler and `commitDraftAndClose()` so toggling ON/OFF persists reliably.

Trading Cortex v1.1.93 — Native Chart Canvas Accounts & Risk Drawing + All-Firm Account Discovery

- **Non-Draggable Chart Canvas Drawing (`v1.1.93`)**: Replaced the floating draggable window with a native, click-through canvas drawing rendered directly onto the TradingView chart pane at top-left (right below the OHLC legend, inside the chart). Never blocks mouse interaction or drawing tools.
- **All Firm Accounts Discovery (`v1.1.93`)**: Automatically discovers **all** accounts for the active prop/perp firm (not just the currently selected account) by passively inspecting site API responses (`fetch`/`XHR`), React Fiber state, `localStorage`, and live DOM/cross-tab state.
- **Per-Instrument Open PnL & Configurable Risk % (`v1.1.93`)**: Each account row displays its current balance, live Open PnL if open on the current chart instrument, or exact dollar risk per trade (`Balance × Risk %`) when flat/closed on that instrument.

Trading Cortex v1.1.92 — On-Chart Accounts & Per-Trade Risk Box (Top-Left Chart Overlay)

- **Top-Left Chart Accounts & Risk Box (`v1.1.92`)**: Added a compact floating widget anchored inside the top-left of the TradingView chart (to the right of the drawing toolbar and below the OHLC legend). Draggable, pinnable, minimizable to the Cortex top bar, and synced across all open browsers.
- **Multi-Account Balances & Live Open PnL (`v1.1.92`)**: Displays all tracked accounts with their current balances and real-time Open PnL, automatically aggregating live account state across open tabs/windows and the account switcher dropdown.
- **Instrument-Aware Per-Trade Risk Calculator (`v1.1.92`)**: When an account has an open position on the current chart instrument, it shows live side and Open PnL; when flat/closed on that instrument, it displays the exact dollar amount to risk per trade based on a configurable percentage (adjustable inline right inside the box or via Settings presets).

Trading Cortex v1.1.91 — Web Audio Autoplay Hardening & Order Block Precision Tuning

- **Elimination of Chrome Extension AudioContext Errors (`v1.1.91`)**: Resolved the `The AudioContext was not allowed to start` error in `chrome://extensions` by strictly preventing `.resume()` or AudioContext creation outside user gestures. The AudioContext is safely initialized upon user interactions (`click`, `pointerdown`, `keydown`), and background alert chimes only execute when the context is in the `'running'` state.
- **Institutional Order Block Validation & False-Positive Elimination (`v1.1.91`)**: Fixed an issue on 1-hour NQ charts where minor continuation pauses during strong upward rallies were falsely identified as Bullish Order Blocks. Order blocks are now strictly sourced from confirmed swing low/high origins, and Break of Structure (BOS) requires breaking a preceding swing point formed prior to the swing origin.
- **Continuous Forward Invalidation Tracking (`v1.1.91`)**: Order blocks now continuously monitor price action past mitigation: if price breaks through the invalidation boundary (`close < ob.bottom` for Bullish OB, `close > ob.top` for Bearish OB), the block is marked invalidated and cleanly removed from the chart canvas.

Trading Cortex v1.1.90 — Real-Time Cross-Browser & Cross-Tab Settings Synchronization

- **Zero-Latency Cross-Tab Sync (`v1.1.90`)**: Multi-window setups now synchronize all configuration changes in real-time across all open browsers and monitors without needing a page refresh. Disabling or enabling any setting on Browser A applies to Browser B instantaneously.
- **Triple-Layer Transport Architecture (`v1.1.90`)**:
  - `BroadcastChannel('__trading_cortex_cross_tab_sync__')` delivers instant sub-millisecond updates across tabs and windows on the same origin.
  - Window `storage` event listener captures real-time `localStorage` changes.
  - `chrome.storage.onChanged` propagates settings across different domains (`vestmarkets.com`, `myfundedperpetuals.com`, `kalshi.com`) and popup menus.
- **Instant Reactive Component Re-application (`v1.1.90`)**: Disabling any indicator (Range Detector, Order Blocks, Market Structure, Sessions, FVG, Trades, News, Diagnostics) immediately hides on-chart floating boxes, removes minimized taskbar pills, and clears drawings from the TradingView canvas on all connected screens in real-time.
- **In-Dialog Live Synchronization (`v1.1.90`)**: If the Settings Dialog or Cortex menu is already open in another window, its master toggle switches, sliders, and badges update dynamically to reflect the change, preventing stale drafts from overwriting settings.

Trading Cortex v1.1.89 — DEX Session Logout Elimination & Web Audio Autoplay Hardening

- **Zero-Disruption Update Engine (`v1.1.89`)**: Removed forced `chrome.tabs.reload()` during self-updates. Active trading tabs on Vest Markets, My Funded Perpetuals, and Kalshi Pro remain open and active without reload interruptions, preventing severed Privy/Turnkey Web3 wallet session signers.
- **Account Switcher & Auto-Restoration Safety (`v1.1.89`)**: Changed default `restoreSelectedAccount` to `false` for all DEX/prop platforms and enforced a strict `DANGEROUS_ACTIONS` blacklist preventing automated menu scanners from ever clicking disconnect or log out buttons. Generic account labels are safely ignored.
- **Chrome Autoplay Policy Hardening (`v1.1.89`)**: Completely resolved `The AudioContext was not allowed to start` errors appearing in `chrome://extensions`. AudioContext instantiation and `.resume()` are strictly gated to user gestures (`pointerdown`, `keydown`, `click`), and background alert chimes only fire when the context is active and running.
- **Fail-Safe Alert Protection (`v1.1.89`)**: Wrapped voice synthesis (`SpeechSynthesis`) and Web Audio oscillators in protective boundary blocks to ensure background trading and price alerts never throw unhandled extension exceptions.

Trading Cortex v1.1.88 — Institutional Order Block On-Chart Performance Stats Screen (1:3 RR)

- **On-Chart Performance Stats Screen (`v1.1.88`)**: Added an interactive floating stats screen (`#vest-chart-ob-stats-box`) inside the TradingView chart viewport for the Institutional Order Blocks indicator.
- **1:3 Risk:Reward Win/Loss Tracking (`v1.1.88`)**: Automatically tracks every mitigated Order Block trade forward in time from entry:
  - Bullish OBs enter at `ob.top` with SL at `ob.bottom` and TP at `ob.top + 3 * risk`.
  - Bearish OBs enter at `ob.bottom` with SL at `ob.top` and TP at `ob.bottom - 3 * risk`.
  - Counts Winners, Losers, and Pending trades with Net R-multiple, Profit Factor, and Expectancy.
- **Directional Win/Loss Breakdown (`v1.1.88`)**: Displays separate win/loss records and win rates for Long Order Blocks vs Short Order Blocks.
- **Interactive Window Features (`v1.1.88`)**: Draggable with chart boundary clamping, sticky pin button (`#vest-cosb-pin-btn`), minimize-to-pill (`#vest-cosb-restore-btn`), and direct Settings navigation button (`#vest-cosb-btn-settings`).
- **Settings Drawer Controls (`v1.1.88`)**: Added toggle to show/hide the stats box, slider for target R:R ratio (1.0 to 10.0 RR), and a button to reset box position.

Trading Cortex v1.1.87 — Range Detector Directional Trending, Timeframe Switcher, 1m Support & Sticky Pin

- **Directional Trending (`v1.1.87`)**: Identifies whether the non-ranging market is **`▲ TRENDING LONG`** or **`▼ TRENDING SHORT`** across all monitored timeframes based on lookback moving averages, net displacement, and channel position.
- **Interactive Timeframe Switcher (`v1.1.87`)**: Clicking any timeframe row or chip in the Range Detector box switches the TradingView chart directly to that resolution.
- **1m Timeframe Support (`v1.1.87`)**: Added `'1m'` to default monitored timeframes (`['1m', '5m', '15m', '1h', '4h', '1D']`).
- **Sticky Pin Button (`v1.1.87`)**: Added sticky/pin button (`#vest-crb-pin-btn`) to the blue title bar to lock the widget in place across page refreshes.
- **Immediate Settings Routing (`v1.1.87`)**: Clicking the gear button (`⚙`) in the title bar opens the Settings Dialog directly on the Charting Indicators tab with the Range Detector drawer expanded and focused.

Trading Cortex v1.1.86 — Web Audio Autoplay Policy & AudioContext Extension Error Fix

- **Chrome Autoplay Policy Compliance (`v1.1.86`)**: Eliminated the Chrome extension error *"The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page"*. Web Audio context creation is guarded by `canPlayWebAudio()` and user activation status.
- **Shared Singleton AudioContext (`v1.1.86`)**: Replaced per-chime `new AudioContext()` instantiation with a shared singleton that passively unlocks on the first user interaction, preventing audio context exhaustion and memory leaks.

Trading Cortex v1.1.85 — Range Detector Audible Alerts Enhanced with Instrument, Venue & Timeframe

- **Full Context Voice Speech Announcement (`v1.1.85`)**: Voice synthesis alert triggered when entering a new consolidation range now explicitly states the **Instrument** (e.g. `HYPE Perpetual`, `NQ`), **Venue** (`Vest Markets`, `MyFundedPerpetuals`, `Kalshi Pro`), and **Timeframe** in natural speech (`"15 minute"`, `"1 hour"`, `"daily"`).
  - Example spoken alert: *"Range detected on HYPE on Vest Markets, 15 minute timeframe."*
- **Synchronized Visual Toast (`v1.1.85`)**: Screen toast notification updated to match the venue and natural timeframe format.

Trading Cortex v1.1.84 — Range Detector (Multi-Timeframe) with Glowing Blue Box & Audible Alerts

- **Multi-Timeframe Range Detector Engine (`v1.1.84`)**: Evaluates market consolidation vs. trending expansion across multiple timeframes (`5m`, `15m`, `1h`, `4h`, `1D`) using Choppiness Index (CHOP), ADX, and channel containment.
- **On-Chart Floating Range Detector Box (`v1.1.84`)**: Draggable widget featuring a **blue title bar with white text**, **slight blue glow halo**, and color-coded status pills (**green** for Ranging, **red** for Trending).
- **Audible Alerts on New Range Transitions (`v1.1.84`)**: Synthesized voice alert (*"Range detected on [Symbol] [Timeframe]"*) and chime tone when a new consolidation range begins.
- **Charting Indicators Hub Integration (`v1.1.84`)**: Dedicated indicator tile with master slider switch, expandable settings drawer, and quick Studio dropdown menu button.

Trading Cortex v1.1.83 — Institutional Order Block Color Validation & Range Capping

- **Strict Opposite-Color Candle Rule (`v1.1.83`)**: Enforces that Bullish Order Blocks must be down/bearish candles (`close <= open`) and Bearish Order Blocks must be up/bullish candles (`close >= open`), eliminating false order blocks on continuation candles during prolonged rallies/selloffs.
- **Anomalous Mega-Candle Range Capping (`v1.1.83`)**: Automatically caps outlier candles (> 3x average candle range, e.g. 560-point NQ drop) to the actual absorption zone, preventing oversized boxes from covering half the chart.
- **Cleaned Up Mid-Air Clustered Blocks (`v1.1.83`)**: Pure trend expansion candles with gaps without a preceding opposite-color base candle are rejected as continuation gaps rather than valid institutional order blocks.

Trading Cortex v1.1.82 — Order Block Strict Coordinate Anchoring & Zero Left/Right Drift

- **Zero Leftward Drift (`v1.1.82`)**: Fixed coordinate mapping in `barToX` to prioritize `timeToCoordinate(timeSec)` and harmonized internal array indices with TradingView `TimePointIndex`, completely eliminating the bug where order blocks stretched thousands of pixels to the left.
- **Strict Left Edge Locking (`v1.1.82`)**: Hard-anchored `boxLeft` directly to `rawStartX - halfBarW`, guaranteeing boxes never extend to the left of their origin bar.
- **New "On Candle Only" Extension Mode (`v1.1.82`)**: Added a 3rd option to **Zone Extension Mode** in the settings drawer allowing traders to display the Order Block exclusively over the origin candle itself without any left or right extension.
- **Full Settings Draft Syncing (`v1.1.82`)**: Wired Order Blocks and Market Structure controls directly into `syncCurrentPaneToDraft()` for persistent configuration across all drawer inputs.

Trading Cortex v1.1.81 — Exact Order Block Placement on Impulsive Moves

- **Accurate Impulsive Origin Placement (`v1.1.81`)**: Order blocks now consistently anchor to the true origin candle right before every impulsive displacement move (`obIdx = g - 1`) across all chart timeframes.
- **Immediate Swing Leg Structure Break (`v1.1.81`)**: Evaluates structure breaks against the immediate swing leg leading into the origin candle, eliminating the issue where major reversal pivots were ignored because price didn't break an ancient macro low from days ago.
- **Anti-Stacking Protection (`v1.1.81`)**: Prevents duplicate overlapping order blocks from cluttering the chart during multi-candle momentum runs.

Trading Cortex v1.1.80 — Strict Order Block Gap Anchor Alignment

- **Strict FVG Anchor Alignment (`v1.1.80`)**: Corrected `computeOrderBlocksFromBars` to strictly anchor Order Blocks to the candle immediately preceding the displacement candle that creates the Fair Value Gap (`obIdx = g - 1`).
- **Eliminated Disconnected Zones & Erroneous Badges (`v1.1.80`)**: Fixed downstream drift that drew Order Block zones on candles disconnected from the gap or during unrelated mid-trend consolidations, ensuring mitigation badges (`▲ BUY OB` / `▼ SELL OB`) fire accurately on true origin candle retests.

Trading Cortex v1.1.79 — Market Structure (BOS / MSS / CHoCH) & Order Block Origin Candle Fix

- **Market Structure Indicator (`v1.1.79`)**: Real-time Break of Structure (BOS) and Change of Character (CHoCH / MSS) on-chart indicator with configurable swing lookback (3–20 bars), close vs. wick break mode, label styles (BOS/CHoCH or BOS/MSS), dashed/solid lines, and custom colors.
- **Unified Hub & Shortcut Integration (`v1.1.79`)**: Fully integrated into Charting Indicators hub with live draft syncing, on-demand settings drawer, and quick Studio dropdown menu entry.
- **Fixed Order Block Origin Candle Selection (`v1.1.79`)**: Fixed swing peak origin selection in `computeOrderBlocksFromBars` to search backward for the true last up (bullish/green) candle before downward displacement, eliminating erroneous red candles marked as bearish order blocks.

Trading Cortex v1.1.78 — Update Center compareSemver & Double "vv" Fix

- **Resolved `compareSemver is not defined` (`v1.1.78`)**: Fixed a ReferenceError when the GitHub dev channel falls back to unmetered Raw CDN during API rate limits.
- **Eliminated Double `vv` Display (`v1.1.78`)**: Standardized version display formatting with `formatV` and updated `cleanVersion` to strip any extra leading `v` prefixes.

Trading Cortex v1.1.77 — Charting Indicators Tile Click: Toggle Settings When ON, Turn ON When OFF

- **Context-Aware Tile Click (`v1.1.77`)**: Clicking an indicator tile now toggles its settings drawer open/closed if the indicator is already ON. If the indicator is OFF, clicking it enables the indicator.
- **Accidental Disabling Protection (`v1.1.77`)**: Prevents clicking an indicator to configure it from inadvertently turning it off, while preserving the master toggle switch on the right for explicit on/off control.

Trading Cortex v1.1.76 — Settings Box 80% Default Sizing & 8-Directional Edge/Corner Resizing

- **80% Default Open Dimensions (`v1.1.76`)**: Settings box now opens at a full 80% of viewport size (`80vw` x `80vh`), removing restrictive pixel caps.
- **Drag-Resize From Any Side (`v1.1.76`)**: Added dedicated resize handles along all 4 edges (Top, Bottom, Left, Right) and all 4 corners (Top-Left, Top-Right, Bottom-Left, Bottom-Right) with smooth opposing-edge anchoring.

Trading Cortex v1.1.75 — Institutional Order Blocks (Smart Risk) with On-Chart Order Entry & Audible Alerts

- **Institutional Order Blocks Engine (`v1.1.75`)**: Built complete indicator adhering to the Smart Risk strategy rules (Origin candle selection + aggressive displacement + Fair Value Gap + BOS/ChoCH breakout).
- **On-Chart Order Entry Badges (`v1.1.75`)**: Visualizes real-time `▲ BUY OB` and `▼ SELL OB` order entry icons with projected opposite-wick Stop Loss and configurable Risk:Reward (default 1:2.0) Take Profit target lines.
- **Audible Alerts (`v1.1.75`)**: Dual-layer alert system featuring synthesized voice callouts (*"Bullish Order Block Mitigated. Enter Long."* / *"Bearish Order Block Mitigated. Enter Short."*) and Web Audio chimes.
- **Charting Indicators Hub (`v1.1.75`)**: Integrated into the unified indicators drawer with on-demand Settings button, unpersisted collapsed drawer state, test alert button, and full slider parameter customization.

Trading Cortex v1.1.74 — Charting Indicators On-Demand Settings Button & Transient Expansion

- **On-Demand Settings Button (`v1.1.74`)**: Toggling an indicator ON displays a sleek "Settings" button next to the master toggle slider instead of immediately dropping down the full settings form.
- **Click-to-Configure Settings Drawer (`v1.1.74`)**: Clicking the Settings button smoothly opens or closes the configuration drawer for that specific indicator.
- **Unpersisted Collapsed State (`v1.1.74`)**: All indicator drawers remain cleanly collapsed when opening the Settings dialog, returning to collapsed state whenever the dialog is closed and reopened.

Trading Cortex v1.1.73 — Settings Dialog Drag-Resizing, Glass Opacity Slider & Unload Violation Fix

- **Drag-Resizable Settings Box (`v1.1.73`)**: The settings dialog can now be made significantly smaller (`min-width: 440px`, `min-height: 320px`) with responsive layout scaling and a dedicated bottom-right drag grip handle (`.vest-tvs-resize-handle`).
- **Dialog Glass Opacity Slider (`v1.1.73`)**: Added a dynamic opacity slider (15% to 95%, default 78%) for the frosted glass backdrop under the About tab with live CSS variable updates and persistent storage.
- **Eliminated `unload` Permissions Policy Warning (`v1.1.73`)**: Guarded `window.addEventListener('unload')` in `content/content-main.js` to silence Chrome's deprecated unload permissions policy violation warning.

Trading Cortex v1.1.72 — Charting Indicators Trade Duration ReferenceError Fix

- **Resolved `formatTradeDurationHuman` ReferenceError (`v1.1.72`)**: Fixed an `Uncaught ReferenceError: formatTradeDurationHuman is not defined` that triggered when clicking the "Charting Indicators" tab if closed positions existed in the current session.
- **Unified Function Names & Compatibility Alias (`v1.1.72`)**: Standardized the duration formatting call to `formatTradeDuration(t.durationMs)` and exported `const formatTradeDurationHuman = formatTradeDuration` as a resilient alias.
- **VM Regression Test Suite (`v1.1.72`)**: Added end-to-end VM modal rendering tests with populated closed trades in `tests/charting-indicators-hub.test.js` to prevent any runtime indicator drawer crashes.

Trading Cortex v1.1.71 — Charting Indicators Tile Expansion & Master Toggle Lifecycle Fix

- **Event Listener Lifecycle Resolution (`v1.1.71`)**: Fixed an issue where master toggle sliders and tile header accordion clicks on the Charting Indicators panel did not respond due to listeners being queried during template rendering prior to DOM insertion.
- **Wired inside `wireDialogEvents()` (`v1.1.71`)**: Integrated tile header and master switch listeners directly into `wireDialogEvents()`, ensuring all 8 indicator tiles and sliders are immediately active upon navigation or dialog opening.
- **Drawer Auto-Expansion on Deep Link (`v1.1.71`)**: Opening an indicator via Cortex dropdown menu or deep link smoothly scrolls to the target tile, expands its settings drawer, and flashes the highlight glow.
- **Real-Time Badge & Drawer Reactivity (`v1.1.71`)**: Toggling indicators instantly updates the `ON`/`OFF` badge, sets the `.is-enabled` tile border, drops down or collapses the drawer, and updates draft settings.

Trading Cortex v1.1.70 — Multi-Window Chart Timeframe Isolation & Viewport Synchronization

- **Strict Timeframe Isolation Across Multi-Chart Setups (`v1.1.70`)**: Charts open on different timeframes (e.g., 15m on screen 1, 1m on screen 2, 5m on screen 3) maintain their own independent timeframes and will never be forced to match another tab's resolution.
- **Window Storage Event Guard (`v1.1.70`)**: Intercepts and drops incoming cross-tab storage events for `tradingview.chartproperties` and `IntervalWidget`, blocking TradingView's native cross-tab sync from hijacking background charts.
- **Cleaned Storage Pre-Hydration (`v1.1.70`)**: Stripped raw `tradingview.chartproperties` from localStorage persistence and pre-hydration so new and restored tabs mount with their native or URL timeframe.
- **Strict Resolution Matching for Viewport Sync (`v1.1.70`)**: Live cross-window viewport synchronization only applies if the receiving chart's active resolution matches the authoring chart's resolution (e.g. 15m $\rightarrow$ 15m). Background charts on 1m or 5m remain completely untouched.
- **Timeframe Switch Memory Restoration (`v1.1.70`)**: Switching a chart to 15m automatically retrieves and restores the last known focused settings for that specific timeframe (`viewportsByChart[symbol|15]`), making that chart the authoritative author for subsequent changes.

Trading Cortex v1.1.69 — Unified "Charting Indicators" Hub & Expandable Settings Tiles

- **Consolidated "Charting Indicators" Hub (`v1.1.69`)**: Moved all 8 on-chart indicators (`sessions`, `autofvg`, `news`, `trades`, `candleohlc`, `positionhud`, `faillines`, `cortexindicator`) from separate left sidebar tabs into a single unified navigation section titled "Charting Indicators".
- **Interactive Indicator Tile Boxes (`v1.1.69`)**: Each indicator is presented in an individual tile card featuring its accent color icon, title, description, live `ON` / `OFF` status badge, and a master toggle slider switch.
- **Dynamic Expandable Settings Drawers (`v1.1.69`)**: Toggled OFF indicators show a clean collapsed card with no clutter. Toggling an indicator ON smoothly drops down its complete settings box right below the title header with all configuration controls, sliders, and color pickers.
- **Header Click & Deep Linking (`v1.1.69`)**: Clicking anywhere on the tile header toggles the master switch. Deep links and menu actions smoothly scroll directly to that indicator tile and apply an accent glow.

Trading Cortex v1.1.68 — Native Timeframe Favoriting on MFP & Kalshi Pro

- **Native Timeframe Favoriting on MFP & Kalshi Pro (`v1.1.68`)**: Disabled injected timeframe buttons and star indicators on My Funded Perpetuals and Kalshi Pro so their native TradingView timeframe favorite stars and buttons work natively without duplicate buttons or event interception.
- **Deep Frame & Origin Detection (`v1.1.68`)**: Added multi-tier frame detection (including `ancestorOrigins`, `referrer`, and top origin inspection) ensuring nested chart iframes accurately inherit platform rules.
- **Per-Firm Timeframe Favorites Setting (`v1.1.68`)**: Added an explicit "Chart Timeframe Favoriting" toggle in Perp Firm Settings for every firm (default `false` on MFP and Kalshi Pro, `true` on Vest Markets).
- **DOM Cleanup & Preservation on Vest (`v1.1.68`)**: Existing injected timeframe containers are immediately removed from DOM when native favoriting is active, while full custom timeframe favoriting remains supported on Vest Markets.

Trading Cortex v1.1.67 — Kalshi Pro Integration & Perp Firm Settings Streamlining

- **Kalshi Pro Support (`v1.1.67`)**: Added full support for Kalshi Pro (`pro.kalshi.com`, `kalshi.com`), featuring Cortex bar top-anchoring below the navigation header, TradingView chart enhancement, and automatic market symbol detection.
- **Official Kalshi Pro Vector Branding (`v1.1.67`)**: Added custom Kalshi Pro SVG logo in signature `#00D26A` green across the firm grid and settings card.
- **Streamlined Interactive Tiles (`v1.1.67`)**: Removed "+ Add Perp Firm" and delete buttons. Users can seamlessly click any tile from any open browser window to configure its layout, offsets, margin, leverage, and account persistence.
- **Removed Legacy Vest Exchange (`v1.1.67`)**: Removed Vest Exchange from default configurations and cleansed stored settings.

Trading Cortex v1.1.66 — Left Drawing Toolbar Persistence & Desync Self-Healing

- **DOM Ground-Truth Visibility (`v1.1.66`)**: Rewrote toolbar visibility detection to check actual DOM container elements, magnet buttons, and group slots rather than internal TradingView JS state flags, eliminating false-positive reports in the dropdown menu.
- **Eliminated False Collapse Triggers (`v1.1.66`)**: Fixed selector collisions where "Hide Drawings" controls erroneously clicked TradingView's "Hide Drawing Tools" collapse button during startup restoration.
- **Multi-Tier Recovery & Action State Self-Healing (`v1.1.66`)**: Automatically detects when TradingView's internal toolbar state desynchronizes from the DOM and heals it via API commands, left-edge toggle clicks, and resynchronized action execution.
- **Accurate Dropdown Badge & Toggle (`v1.1.66`)**: The Cortex dropdown badge accurately indicates `VISIBLE` or `HIDDEN` based on DOM reality, and clicking toggles the toolbar directly.

Trading Cortex v1.1.65 — Bottom Panel Re-Docking & Height Restoration

- **Guaranteed Positions & Orders Re-Docking (`v1.1.65`)**: Fixed an issue where re-docking the bottom positions and orders panel from floating/detached or minimized mode collapsed the table container, showing only the tab bar and an empty void until browser refresh.
- **True Docked Height Preservation (`v1.1.65`)**: Captures and preserves the user's docked height (`panel.dataset.vestDockedHeight`) before detaching or minimizing, and restores explicit height, `min-height: 180px`, `flex: 0 0 auto`, and `display: flex; flex-direction: column;` when docked.
- **Chart Flex & Height Recovery (`v1.1.65`)**: Resolves chart container height override collision, ensuring chart elements properly release full-screen allocation and return to `flex: 1 1 0%`.
- **Virtualizer & React Tab Wake-Up (`v1.1.65`)**: Immediately dispatches scroll and resize events across inner containers and synchronizes active React tab state on re-dock so table headers and rows render instantly without requiring a page refresh.

Trading Cortex v1.1.64 — Viewport Bleed-Through Elimination & Dialog Glass Setting

- **Eliminated Viewport Bleed-Through on Dialogs (`v1.1.64`)**: Floating Positions & Orders window, settings dialog, template manager, and floating boxes feature 100% solid, fully opaque backdrops (`#0b0f19` / `#0d121d`) with `backdrop-filter: none !important;` by default. Viewport candlesticks, wicks, and chart lines can no longer bleed through.
- **Configurable Dialog Glass Effect (`v1.1.64`)**: Added a user-controllable *Dialog Glass Effect* switch in Cortex Settings under "Display & Dialog Appearance" and a 1-click quick-toggle directly in the Cortex dropdown menu. When enabled, dialogs feature a modern translucent frosted-glass aesthetic.
- **Isolated Stacking Context & Elevated Z-Index (`v1.1.64`)**: Detached Positions & Orders window has `isolation: isolate` and elevated `z-index: 2147483640` (and `2147483645` on active interaction/drag), ensuring all dialogs float firmly above all chart canvas, order lines, and fail lines.

Trading Cortex v1.1.60 — Dev Glow, Version Subtext, Bleeding Edge Title & Fixes

- **Dev Branch Red Glow & Version Number Subtext (`v1.1.60`)**: Replaced `'dev'` on the Cortex top bar pill with the active version number (`v1.1.60`). Dev branch is signified by a vibrant red outer glow (`rgba(239, 68, 68, 0.35)`), red border, and red-tinted icon and subtext.
- **Bleeding Edge / Production Dropdown Title Bar (`v1.1.60`)**: Added a title bar directly above "Template Manager..." displaying "Bleeding Edge" (with red glowing dot and `DEV` badge) on dev builds, or "Production" (with blue glowing dot and `RELEASE` badge) on production builds, plus the version number.
- **Dynamic Taskbar Slot Allocation (`v1.1.60`)**: Minimized windows and detached/minimized Positions panel allocate sequential slots dynamically like the Windows taskbar.
- **Prop Firms Management & Account Restoration (`v1.1.60`)**: Delete any prop firm, view official vector logos, and auto-restore selected trading account on refresh.
- **Bug Fixes**: Resolved `SyntaxError: Identifier 'isDev' has already been declared`, `ReferenceError: renderPerpFirmsHtml is not defined`, and removed stale `version_name` so updates cleanly report the true latest version.

Trading Cortex v1.1.44 — Cortex Top Bar Relocation, Diagnostics Suite & Dev Channel Updater

- **Dev Branch Update Channel (`v1.1.44`)**: Switch between Stable and Dev (Bleeding Edge) channels in the Update Center. Dev mode polls branch commits, previews recent commit history, and unpacks the latest dev zipball directly into your workspace.
- **Header-Docked Cortex Toolbar (`v1.1.44`)**: Moved the Trading Cortex toolbar to sit directly below Vest's main navigation header and above the market ticker row and chart/order box. Minimized pills dock into this top bar and vertical chart space is preserved.
- **Updater diagnostics (`v1.1.44`)**: Surface folder-picker and deployment errors in the Update Center, terminal, and browser console. Explain Chrome security-policy blocks and identify the expected unpacked extension source folder.

Trading Cortex v1.1.43 — Chart Paper Stats Overlay

- **Chart Paper Stats (`v1.1.43`)**: Show the per-instrument paper entry, TP1/TP2/TP3, and stop-first counters in a compact chart overlay. The counts update on paper bar completion and when the chart instrument changes.

Trading Cortex v1.1.42 — Irish Browser Voice Preset

- **Irish Browser Voice (`v1.1.42`)**: Add an Irish English voice preset when the browser supplies an `en-IE` voice. It uses a slightly higher pitch and can be auditioned with the existing test button; the browser API does not identify voice gender.

Trading Cortex v1.1.41 — Cortex Voice Alerts

- **Voice Alerts (`v1.1.41`)**: Add an Alerts & Voice Settings pane directly below About. Choose a browser voice and test it, toggle forming and confirmed alerts independently, hear at most one forming call per candle, and hear “Buy Now” or “Sell Now” after a signal bar closes.

Trading Cortex v1.1.40 — Open Orders Tab Detection

- **Open Orders Detection (`v1.1.40`)**: Match Vest’s visible Open Orders tab by its complete rendered label, including an optional count, and show a specific diagnostic if the tab cannot be found or activated.

Trading Cortex v1.1.39 — Open Orders Panel Discovery

- **Open Orders Discovery (`v1.1.39`)**: Locate Vest’s Open Orders tab directly, find its account panel from the shared tabs/table, and recognize selected state using common accessibility attributes. This fixes the panel lookup that still blocked the ticket buttons in v1.1.38.

Trading Cortex v1.1.38 — Vest Open Orders Panel Detection

- **Open Orders Detection (`v1.1.38`)**: Read the actual Open Orders tab/table, including its explicit “No open orders yet” state, when Vest does not provide a numeric badge. Preserve the currently selected account tab during preflight and verify staged targets from the panel rows/count.

Trading Cortex v1.1.37 — Ticket Buy/Sell Entry

- **Ticket Entry (`v1.1.37`)**: Move manual live-entry controls into Vest's ticket with separate Buy and Sell buttons. Fix the Open Orders badge parser for Vest's multiline accessible label. Each action still asks for confirmation, then submits a market entry, stop, and three reduce-only target limits after the position appears.

Trading Cortex v1.1.36 — Manual Chart Buy with Target Orders

- **Manual Chart Entry (`v1.1.36`)**: Add a confirmed chart button for a live market long using the current Vest ticket size, configured stop, and three reduce-only limit targets staged after the filled position is visible. The flow stops on missing position/order confirmation. It is separate from Paper/Live signal automation and can submit real orders.

Trading Cortex v1.1.35 — Cortex Indicator Paper Stats

- **Paper Stats (`v1.1.35`)**: Added persistent per-instrument totals for paper entries, TP1/TP2/TP3 hits, and stops hit before any target.

Trading Cortex v1.1.34 — Cortex Indicator Paper Signal Automation

- **Paper Signal Automation (`v1.1.34`)**: Simulate confirmed closed-bar Cortex Indicator entries, three 25% target exits, staged stop movement, and opposing-signal reversal after the five-bar ignore window. Paper mode sends no orders. Live mode remains fail-closed until Vest entry, target, and stop workflows can be verified together.

Trading Cortex v1.1.33 — Simplified Cortex Indicator Display

- **Simplified Cortex Indicator Display (`v1.1.33`)**: Removed the shaded trend cloud and its settings. The EMA centerline, stepped trend stop, signals, projected levels, and trend table remain.

Trading Cortex v1.1.32 — Cortex Indicator Level Guide Endpoints

- **Cortex Indicator Level Guide Endpoints (`v1.1.32`)**: Extend dotted Entry, Stop, and Target guides leftward from their chart labels. Each guide ends at the first candle after the signal whose high-low range reaches that price; untouched levels stay anchored at the signal candle.

Trading Cortex v1.1.31 — Cortex Indicator Risk and Label Controls

- **Cortex Indicator Risk and Label Controls (`v1.1.31`)**: Configure an 8-point default stop and 4-point target spacing, or switch to ATR-based distances. Set the stop and target spacing, and resize the level-label font and boxes independently.

Trading Cortex v1.1.30 — Cortex Indicator Prototype

- **Cortex Indicator Prototype (`v1.1.30`)**: Added an independent settings tab and an EMA/ATR-based trend cloud, trailing trend stop, Buy/Sell flips, projected entry/stop/targets, and multi-timeframe trend table. It is an approximation inspired by the screenshot; the original formula is unknown, and the plotted levels do not submit orders.

Trading Cortex v1.1.29 — Session High/Low Extension Modes

- **Session High/Low Extension Modes (`v1.1.29`)**: In Session Indicators settings, extend uncleared High/Low levels to the chart edge until swept or closed through, or keep all levels extended even after they are cleared. Active-session levels can now extend as well.

Trading Cortex v1.1.28 — Sync Globally Menu and Focused Drawing Sync

- **Sync Globally Menu and Focused Drawing Sync (`v1.1.28`)**: Fix the context-menu action so it activates before TradingView tears down the popup and closes the menu afterward. Only the focused tab publishes global drawing changes; matching background tabs follow without echoing them.

Trading Cortex v1.1.27 — Focused-Tab Viewport Sync

- **Focused-Tab Viewport Sync (`v1.1.27`)**: Make the focused tab the sole publisher of chart position and zoom changes. Matching background tabs follow updates without echoing their own viewport back.

Trading Cortex v1.1.26 — Per-Instrument, Per-Timeframe Chart Viewport Memory

- **Per-Instrument, Per-Timeframe Chart Viewport Memory (`v1.1.26`)**: Save chart position and zoom by instrument plus active interval, restore only that matching view, and propagate viewport changes to other open Cortex tabs on the same instrument and interval.

Trading Cortex v1.1.25 — Live Global Drawing Sync Across Open Tabs

- **Live Global Drawing Sync Across Open Tabs (`v1.1.25`)**: Keep the persisted-drawing duplicate guard during initial chart loading, then allow active tabs to create the synced drawing immediately instead of waiting for a refresh.

Trading Cortex v1.1.24 — Preserve Drawings When Syncing Globally

- **Preserve Drawings When Syncing Globally (`v1.1.24`)**: Fix a storage-update race that removed a chart drawing immediately after it was synced. Missing sync records now unmap drawings without deleting them.

Trading Cortex v1.1.23 — Drawing Restore and Deletion Reliability

- **Drawing Restore and Deletion Reliability (`v1.1.23`)**: Remove intentionally deleted drawings from persistent memory, suppress deleted auto-FVGs, and check Vest's saved chart drawings before restoring to prevent overlapping copies.

Trading Cortex v1.1.22 — Correct Favorite Timeframe Anchor

- **Correct Favorite Timeframe Anchor (`v1.1.22`)**: Target TradingView's top-toolbar interval wrapper by its actual `id`, avoiding the separate chart-title interval control.

Trading Cortex v1.1.21 — Favorite Timeframe Strip Placement

- **Favorite Timeframe Strip Placement (`v1.1.21`)**: Move the shortcuts into the full-width toolbar row immediately after the interval selector group, outside its overflow clipping container.

Trading Cortex v1.1.20 — Visible Favorite Timeframe Shortcuts

- **Visible Favorite Timeframe Shortcuts (`v1.1.20`)**: Place starred interval buttons outside the chart selector's clipped toolbar group so they are visible beside the current timeframe.

Trading Cortex v1.1.19 — Timeframe Favorite Toolbar Placement

- **Timeframe Favorite Toolbar Placement (`v1.1.19`)**: Anchor favorite shortcuts directly beside the visible current interval button so they remain in the chart's top toolbar.

Trading Cortex v1.1.18 — Favorite Timeframes Beside Interval Selector

- **Favorite Timeframes Beside Interval Selector (`v1.1.18`)**: Keep starred timeframe shortcuts beside the current interval, with a fallback for chart layouts that omit TradingView's interval-group marker.

Trading Cortex v1.1.17 — Session Close-Through Detection

- **Session Close-Through Detection (`v1.1.17`)**: Scan every post-session candle so an early sweep cannot prevent detection of the later close-through that stops the line and removes its label.

Trading Cortex v1.1.16 — Session Labels Follow Stopped Lines

- **Session Labels Follow Stopped Lines (`v1.1.16`)**: Remove right-side session labels and price badges when the corresponding High/Low line has stopped at a completed close-through or a sweep bar.

Trading Cortex v1.1.15 — Sync Globally Menu Dismissal

- **Sync Globally Menu Dismissal (`v1.1.15`)**: Close the drawing context menu immediately after selecting Sync globally.

Trading Cortex v1.1.14 — Stopped Session Line Labels

- **Stopped Session Line Labels (`v1.1.14`)**: Hide right-side session High/Low text labels and price badges when their lines stop at a completed candle close through the level.

Trading Cortex v1.1.13 — Session H/L Line Extension

- **Session H/L Line Extension (`v1.1.13`)**: Added a Session Indicators toggle to extend recent High/Low lines to the chart edge or stop them at the first completed candle close through the level.

Trading Cortex v1.1.12 — Full-Screen News and Trades Boxes

- **Full-Screen News and Trades Boxes (`v1.1.12`)**: The Upcoming News and Instrument Trades boxes can now be dragged anywhere in the screen area above the Cortex bar. Minimizing either box docks its pill into the black Cortex bar.

Trading Cortex v1.1.11 — Bottom Bar Content Clearance

- **Bottom Bar Content Clearance (`v1.1.11`)**: Reserves 50px for the fixed bottom Cortex bar, constrains the full-height trading app to the remaining viewport, and enables page scrolling so bottom content stays accessible.

Trading Cortex v1.1.10 — Bottom Bar and Blue Glow

- **Bottom Cortex Bar and Blue Glow (`v1.1.10`)**: Moved the 50px Cortex bar to the bottom edge of the viewport, restored a stronger blue glow along its top edge, and positioned the dropdown menu above the bar when needed.

Trading Cortex v1.1.9 — Top Bar Sizing and Layering

- **Top Bar Sizing and Layering (`v1.1.9`)**: Reduced the Cortex top bar from 100px to 50px and lowered its stacking layer so higher-level overlays from other extensions remain visible.

Trading Cortex v1.1.8 — Cortex Top Bar

- **Cortex Top Bar (`v1.1.8`)**: Moved the existing Trading Cortex dropdown into a new 100px black bar at the very top of the site. Site content now flows below the bar, which has a blue glow along its lower edge.

Trading Cortex v1.1.7 — Multi-Tool Template Manager, Per-Drawing-Type Context Menu & Template Isolation Fix

- **New "Template Manager..." Dialog (`v1.1.7`)**: Added a TradingView-style glassmorphic **Template Manager** directly inside the `CORTEX` dropdown menu (and right-click `Template > Template Manager...`) with left-sidebar filtering by drawing type, live count badges, inline editor, **"Pull from Selected Chart Drawing"**, 1-click Apply, Duplicate, and Delete.
- **Per-Drawing-Type Right-Click Detection & Full Settings Storage (`v1.1.7`)**: Automatically detects the exact TradingView drawing tool when right-clicking any shape on the chart (`Rectangle`, `Horizontal Line`, `Horizontal Ray`, `Trend Line`, `Ray`, `Parallel Channel`, `Fib Retracement`, `Long/Short Position`, `Callout`, `Text`, etc.), filters the `Template >` submenu to that tool type, and stores both normalized styles and raw TradingView shape properties (`rawProperties`).
- **Fixed Template Saving Overwriting Existing Drawings (`v1.1.7`)**: Fixed the bug where saving a new template (e.g. `5m FVG`) could overwrite another drawing (`3m FVG`) on the chart by removing `linetoolrectangle.text` from global overrides, disabling forced `lastRectangleId` fallbacks, and locking context-menu template actions strictly to the right-clicked shape ID.
- **Removed Hardcoded Default Templates & Schema v2 Migration (`v1.1.7`)**: Cleared all built-in preset templates and added an automatic Schema v2 migration that removes legacy preset IDs and deduplicates user templates across `chrome.storage`, the Domain Vault, and `user-data/cortex-db.json`.
- **In-Memory Drawing Toolbox Persistence (`v1.1.6`)**: Pre-hydrates TradingView's internal `toolbarStorage` across `window.top.localStorage` and `blob:` chart iframes at `document_start` and updates all 7 left-sidebar tool group slots via React Fiber (`__reactFiber$`) in-memory.
- **Update Center Telemetry & Zero-Flash In-Place Updates**: Includes **"Check for Update"**, **"Last Checked"** timestamps, and zero-flash in-place extension updates.
