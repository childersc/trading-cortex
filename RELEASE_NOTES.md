Trading Cortex v1.1.146 — Immediately Clears Position Entry Box & Stop Loss / Take Profit Lines When Flat

- **Instant Flat Cleanup (`v1.1.146`)**: Fixed the Position Entry Box (`LONG`/`SHORT`) and Stop Loss / Take Profit boxes lingering on the chart after closing a trade on Hypernova, Kalshi Pro, and My Funded Perps. Now detects when the active `Positions` panel unmounts its table to show `"No Open Positions"`, when Hypernova's tab drops its `(1)` count badge, when the order ticket shows `Current Position: FLAT`, or when a live `/positions` API response returns `[]` — immediately wiping all cached positions, manual TP/SL overrides, and chart overlay boxes.

Trading Cortex v1.1.145 — Fixed Cortex Pill, Bars & Docks Appearing Above Exchange Modals

- **Always Stays Behind Exchange Modals (`v1.1.145`)**: Lowered all persistent Trading Cortex overlays (the floating **Cortex** pill, minimized taskbar pills `INSTRUMENT TRADES` / `CORTEX DIAG` / `UPCOMING NEWS`, top/bottom bars, Range/OB/Accounts Risk boxes, and detached Positions panel) from `z-index: 2147483640` into a modal-safe band (`z-index: 10`–`38`) and removed the legacy header `z-index: 1005` override.
- **Automatic Site-Modal Stacking Guard (`v1.1.145`)**: Added live detection of native exchange modals and full-screen dimmed backdrops (`body.vest-site-modal-open`) that automatically drops all persistent Cortex bars/pills to `z-index: 1` (and closes the Cortex dropdown) whenever an exchange modal opens — while Cortex's own Settings dialog still opens cleanly on top when requested.

Trading Cortex v1.1.144 — Fixed Kalshi Pro Positions/TP-SL Blotter & My Funded Perps Live Position Detection

- **Kalshi Pro Position Entry Box & Live TP/SL Submission (`v1.1.144`)**: Fixed `KX*PERP` chart symbol matching (`KXTSMPERP` → `TSM`, `KXHYPEPERP` → `HYPE`, `KXUSTECH100PERP` → `USTECH100`), added full support for both Kalshi Pro's Card & Desktop Table blotter layouts (`div[data-perps-blotter="true"]`), and wired Kalshi Pro's exact `Edit TP/SL` modal (`#perps-tpsl-tp-price`, `#perps-tpsl-sl-price`, `Delete`, `Confirm`) with an auto-fill guard so Kalshi's suggested +15%/-15% opposite field is never accidentally submitted.
- **My Funded Perps Tab-Independent Live Positions (`v1.1.144`)**: Added passive `fetch`/`XHR` + React Fiber live open-position capture so your 2-row Entry Box (`LONG`/`SHORT` + `BE`/`TP`/`SL`/`×`) and Green TP / Red SL boxes appear on My Funded Perps even when you're viewing the **Accounts** tab instead of **Positions**, stopped tab switches from wiping cached positions, fixed leverage-prefix ticker parsing (`5x BTC-USD`), and ensured newly recreated chart iframes hydrate immediately on coin switches.

Trading Cortex v1.1.143 — Rolled Out Interactive Chart Visuals & Trade Controls to My Funded Perpetuals & Kalshi Pro

- **Full Rollout to My Funded Perps & Kalshi Pro (`v1.1.143`)**: The 2-row **`LONG`/`SHORT` Position Entry Box** (`BE` / draggable `TP` / draggable `SL` / `×`), **Green TP & Red SL Dollar + Price Boxes**, direct native **"Current Price" Line styling + label**, and **live font size sliders** are now active (ON by default) across **My Funded Perpetuals**, **Kalshi Pro**, and **Hypernova**, with independent per-firm toggles in **Perp Firm Settings** and a quick **`<Venue> Chart Visuals...`** shortcut in the Cortex dropdown menu.
- **Multi-Venue Table & TP/SL Modal Wiring (`v1.1.143`)**: Added My Funded Perps Base UI table/dialog selectors (`table[data-slot="table"]`, `Side` column, `#take-profit-price`, `#stop-loss-price`, `[data-slot="dialog-content"]`) and Kalshi Pro contract/side support alongside Hypernova's exact `data-testid` order submission.

Trading Cortex v1.1.142 — Live Hypernova TP / SL / Breakeven & Close Order Submission

- **Real Hypernova TP/SL & Breakeven Submission (`v1.1.142`)**: Fixed dragging **SL**, dragging **TP**, clicking **BE**, and clearing TP/SL so they now open Hypernova's exact `[data-testid="position-tpsl"]` modal, populate `tpsl-sl-price-input` / `tpsl-tp-price-input` with Hypernova's 5-sig-fig tick precision and React `_valueTracker` sync, click `tpsl-confirm`, and verify submission — automatically reverting the chart line with a toast if Hypernova rejects an invalid price (e.g. SL on the wrong side of Mark Price).
- **Accurate Hypernova Position Side, PnL & Radix Close Wiring (`v1.1.142`)**: Reads Hypernova's exact `tr.trade-positions-row-short` / `long` row classes, `data-testid` cells (`symbol-text`, `-entry`, `-mark`, `-size`, `-pnl`, `position-tpsl`), and dispatches pointer events for Hypernova's Radix `close-position-menu-trigger`.

Trading Cortex v1.1.141 — Style Existing Hypernova Current Price Line Directly + Font Size Sliders

- **No More Duplicate Current Price Line (`v1.1.141`)**: Directly modifies Hypernova's existing native TradingView current price line (`priceLineColor`, `priceLineWidth`, `priceLineStyle`, and native `SeriesPriceLinePaneView` renderer) instead of drawing a second line on top of it, and cleanly restores the native line when toggled off.
- **Adjustable Font Sizing (`v1.1.141`)**: Added live **Label Font Size (`8px–22px`)** for the `"Current Price"` label pill and **Trade & TP/SL Box Font Size (`8px–18px`)** for the Position Entry Box and Green TP / Red SL boxes inside **Perp Firms → Hypernova**.

Trading Cortex v1.1.140 — Hypernova Chart Visuals: Interactive LONG/SHORT BE/TP/SL Box, Green TP & Red SL Boxes, and Customizable Current Price Line

- **Interactive 2-Row Position Entry Box (`LONG` / `SHORT`) (`v1.1.140`)**: On Hypernova, open trades now display a crisp 2-row floating box on your entry line with **`LONG`/`SHORT`**, size, live PnL, **`×`** close button, entry price, and 3 action buttons: **`BE`** (move SL to breakeven), **`TP`** (grab & drag vertically to set Take Profit), and **`SL`** (grab & drag vertically to set Stop Loss).
- **Green TP & Red SL Dollar + Price Boxes (`v1.1.140`)**: Take Profit renders in a glowing green box and Stop Loss in a glowing red box directly on their chart lines, showing both the **exact dollar amount (`+$XX.XX` / `-$XX.XX`)** and the **exact price**, with re-drag support and automatic anti-overlap shifting at breakeven.
- **Customizable "Current Price" Line (`v1.1.140`)**: Style your live current price line however you want (color, solid/dashed/dotted, thickness, opacity, label position, show/hide price) with custom label text defaulting to **`"Current Price"`**.
- **Toggleable in Hypernova Settings (All ON by Default) (`v1.1.140`)**: Open **Perp Firms → Hypernova** (or click **Hypernova Chart Visuals...** in the Cortex menu) to toggle any or all visual enhancements on/off with live chart preview.

Trading Cortex v1.1.139 — Permanently Fixed Chart Self-Resizing / Scale Snap-Back

- **Fixed All 4 Self-Resizing Root Causes (`v1.1.139`)**:
  1. Stopped the 1.5s maintenance loop from falsely triggering `handleInstrumentOrChartSwitch` when TradingView's `activeChart()` returns a new wrapper object (which was slamming `setAutoScale(true)` every 1.5s).
  2. Fixed `getLiveInstrument()` reading the live ticking price (`"59,501.4"`) from My Funded Perps's tab title as a symbol switch on every price tick.
  3. Restricted `setAutoScale(true)` to genuine symbol switches (`BTC` → `ETH`) only, ignoring formatting aliases (`BTC` vs `BTC-USD`).
  4. Stopped hijacking TradingView's internal `model.resetScroll()` and `resetPriceScale` calls.

Trading Cortex v1.1.138 — Instant Drop Settling for Draggable Cortex Pill

- **Zero Snap-Back Flash on Drop (`v1.1.138`)**: Commits and persists the pill's dropped coordinates immediately before releasing the drag state and shields against stale in-flight storage echoes for 3 seconds so releasing the **Cortex** pill stays locked right where you drop it.

Trading Cortex v1.1.137 — Silky Fast-Drag for Floating Cortex Pill Over Chart Iframes

- **Smooth Fast-Drag (`v1.1.137`)**: Added `setPointerCapture()`, a transparent full-screen iframe drag shield, and a mid-drag re-render guard so dragging the floating **Cortex** pill rapidly across TradingView chart iframes never drops or loses the drag.

Trading Cortex v1.1.136 — Fixed Blown-Up Candles & Clipped Price Scale on Timeframe Switch

- **Clean Timeframe Switching (`v1.1.136`)**: Stopped replaying stale `setVisibleRange` timestamps and locked `priceRange` across timeframe switches (which blew `1h` candles up into giant bars shooting off top/bottom of the chart), cancelled cross-timeframe save pollution during interval switches, enforced Auto-Scale on timeframe switch, and aborted delayed restore timers the instant you interact with or resize the chart.

Trading Cortex v1.1.135 — Floating, Draggable Cortex Pill (Top-Middle of Viewport)

- **Floating, Draggable Cortex Pill (`v1.1.135`)**: The **Cortex** pill now floats cleanly at the **top-middle of the viewport** (`top: 10px`) across Vest, My Funded Perps, Hypernova, and Kalshi — drag anywhere to move (saved per exchange), or double-click the 6-dot grip on the left to snap back to top-middle.

Trading Cortex v1.1.134 — Floating, Draggable Cortex Pill (Top-Middle of Viewport)

- **Floating, Draggable Cortex Pill (`v1.1.134`)**: Moved the **Cortex** pill to a clean floating, draggable pill aligned **top-middle of the viewport** by default — works identically across Vest, My Funded Perps, Hypernova, and Kalshi with zero toolbar overlap. Drag anywhere to reposition (saved per exchange), or double-click the left drag grip to snap back to top-middle.

Trading Cortex v1.1.133 — Fixed Chart Resize Snap-Back & Same-Iframe Overlay Clearance

- **Fixed Chart Resize Snap-Back (`v1.1.133`)**: Stopped the 1-second bottom-dock heartbeat from overwriting `style.flex` on `react-resizable-panels` (`[data-panel]`) splitters, kept the bottom dock strictly inside the chart panel, fixed recursive `model.resetScroll()` re-triggering, and checked live top-window focus so newly mounted iframes immediately save your zoom/scale adjustments.
- **Same-Iframe Overlay Clearance (`v1.1.133`)**: Extended Cortex pill occlusion clearance to handle overlays mounted either in the top document OR inside the TradingView chart iframe.

Trading Cortex v1.1.132 — Top-Document Overlay Clearance (TradeUnison) on Vest & My Funded Perps

- **Exact Same Bar as `Indicators` & `TradeUnison` (`v1.1.132`)**: Mounts `| CORTEX |` on TradingView's `Indicators` toolbar row on both **Vest** and **My Funded Perps**, and automatically detects floating top-document overlays (like `TradeUnison`) via `document.elementFromPoint()` to slide cleanly right past them with zero overlap (while sitting immediately after `Indicators` when no overlay is present).

Trading Cortex v1.1.131 — Visible My Funded Perps Chart Header Pill & Vest Toolbar Visibility Fix

- **My Funded Perps Visible Chart Header Pill (`v1.1.131`)**: Mounts `| CORTEX |` directly in My Funded Perps's visible chart header bar (`[NVDA 5m] [+] | CORTEX | ... [Alerts] [Price Chart]`) instead of the hidden TradingView iframe toolbar, while keeping minimized windows docked below the chart.
- **Vest Native Group Class & Occlusion Self-Check (`v1.1.131`)**: Copies TradingView's native `group-*` class onto `#vest-tv-cortex-toolbar-slot` with explicit visibility and an `elementFromPoint()` self-check so the pill stays 100% visible immediately after `Indicators` (or hops right past any covering sibling).

Trading Cortex v1.1.130 — Fixed Vest Cortex Pill Placement Immediately After Native Indicators

- **Vest Cortex Pill Fix (`v1.1.130`)**: Queries `#header-toolbar-indicators` / `[data-name="open-indicators-dialog"]` first in its own selector pass so earlier third-party buttons with `"indicator"` in their tooltip/aria-label (e.g. `TV`/`Vela` at `x = 211px`) can never hijack the anchor ahead of TradingView's native `Indicators` button (`x = 550px`).

Trading Cortex v1.1.129 — Fixed My Funded Perps Bottom Dock Covering Top Chart Toolbar & Cortex Pill

- **My Funded Perps Bottom Dock & Cortex Pill Fix (`v1.1.129`)**: Fixed `findChartBottomDockMountPoint()` to walk past `position: absolute` chart iframe wrappers to the in-flow `flex-column` container so minimized windows dock at the true bottom of the chart instead of stacking at `y = 0` over TradingView's top toolbar and hiding the `| CORTEX |` pill. Also cleans up stale empty toolbar slots across documents.

Trading Cortex v1.1.128 — Width-Verified Cortex Pill Placement & My Funded Perps Canvas Chart Fix

- **Exact `Indicators` Placement (`v1.1.128`)**: Replaced the fixed parent jump with a width-verified `toolbarRow` walk so `| CORTEX |` never overshoots into the outer wrapper behind `1m 4h`, and excluded `#vest-tv-cortex-toolbar-slot` from timeframe-favorites anchor scanning.
- **My Funded Perps Canvas Chart & Header Detection (`v1.1.128`)**: Added `<canvas>` chart viewport fallback to `findChartBottomDockMountPoint()` and widened `Price Chart` / `Alerts` header-bar detection so My Funded Perps mounts `| CORTEX |` in its chart header bar and moves minimized windows to the bottom dock.

Trading Cortex v1.1.127 — My Funded Perps Cortex Pill & Bottom Minimized Dock Fix

- **My Funded Perps Chart Header Support (`v1.1.127`)**: Added 3-tier chart toolbar detection (icon-only Indicators buttons, compact TradingView toolbars, and custom exchange chart header bars directly above the chart iframe like My Funded Perps) so the **`| CORTEX |`** pill mounts in the chart header bar and minimized windows move cleanly to the bottom dock below the chart.

Trading Cortex v1.1.126 — Right-Click Template Menu Groups (Collapsible Folders & Inline Picker)

- **Create & Organize Groups Right in the Right-Click Menu (`v1.1.126`)**: Added **`+ New Group...`**, collapsible `📁` group folders (with inline rename & delete), and a hover **`📁`** button on every template row to move templates between groups directly inside the right-click **Cortex Templates** flyout submenu — fully synced with the Template Manager.

Trading Cortex v1.1.125 — Sync Globally Venue Scope Modal & Index Price Warning

- **Venue-Scoped Global Sync (`v1.1.125`)**: Clicking **Sync globally** now prompts you to choose **Current Venue Only** (recommended, keeps exact venue pricing) or **All Venues (Cross-Exchange)** with a clear warning that different venues use different index prices and FVGs may not be identical across exchanges.

Trading Cortex v1.1.124 — Fixed Cortex Pill Placement Right After Indicators Group

- **Exact Toolbar Row Placement (`v1.1.124`)**: Inserts `| CORTEX |` directly into TradingView's `.inner-*` toolbar row immediately after the `Indicators` group (copying its flex `order` and using `z-index: 25`), matching the exact proven placement pattern of the favorite timeframes bar.

Trading Cortex v1.1.123 — Pinned Cortex Pill Immediately After `Indicators`

- **Exact `Indicators` Placement (`v1.1.123`)**: Mounted `| CORTEX |` directly adjacent to the `Indicators` button inside its own flex wrapper so it always sits immediately right after `Indicators` and never overlaps or hides behind timeframe buttons.

Trading Cortex v1.1.122 — 5-Second Auto-Update Polling

- **Instant 5-Second Update Detection (`v1.1.122`)**: Trading Cortex now automatically polls for new updates every 5 seconds while your chart tab is visible using the unthrottled raw manifest endpoint (with multi-tab deduplication and zero GitHub API rate-limit issues).

Trading Cortex v1.1.121 — Renamed Template Menu to "Cortex Templates"

- **Clearer Naming (`v1.1.121`)**: Renamed the right-click drawing menu item and drawing toolbar selector to **`Cortex Templates`** so it stands out clearly from TradingView's native `Template` item.

Trading Cortex v1.1.120 — Fixed Cortex Pill Visibility Inside TradingView Toolbar Iframe

- **Cortex Pill Now Always Visible After `Indicators` (`v1.1.120`)**: Injects self-contained pill/separator CSS directly into TradingView's chart iframe and inserts `| CORTEX |` at the top-level horizontal toolbar strip right after the `Indicators` group so it can never be hidden or clipped.

Trading Cortex v1.1.119 — Collapsible Template Groups in Right-Click Menu & Template Manager

- **Template Groups (`v1.1.119`)**: Create custom groups (e.g., `FVGs`, `Order Blocks`, `Inverted FVGs`) right from the chart's right-click **`Template ▸`** menu (`+ New Group...` and `📁` per template) or inside **Template Manager** (inline group dropdown, filter/delete chips, and editor Menu Group field). Groups expand/collapse right inside the right-click menu and remember their open/closed state.

Trading Cortex v1.1.118 — Fixed Updater Automatic Extension Reload & Browser Window Refresh

- **Automatic Post-Update Refresh Across All Trading Windows (`v1.1.118`)**: The updater now reloads the extension runtime immediately after syncing files and automatically refreshes all open trading browser windows/tabs (Vest Markets, Hypernova, MFP, Kalshi Pro, and custom firms) so every chart loads the new build automatically.

Trading Cortex v1.1.117 — Bottom-of-Chart Minimized Windows Dock (Right Below Chart Iframe)

- **Dedicated Bottom-of-Chart Minimized Dock (`v1.1.117`)**: Minimized Cortex windows (`INSTRUMENT TRADES`, `OB STATS`, `UPCOMING NEWS`, `CORTEX DIAG`, `RANGE DETECTOR`, `POSITIONS`) now dock in a sleek `38px` bar directly **below the chart viewport's iframe** (outside the chart). When nothing is minimized, the dock hides completely—reclaiming the full top header height across Vest, Hypernova, MFP, and Kalshi Pro.

Trading Cortex v1.1.116 — Cortex Pill Moved Into TradingView Top Chart Toolbar

- **Native TradingView Chart Toolbar Placement (`v1.1.116`)**: Moved the compact **CORTEX** pill directly into TradingView's top chart toolbar immediately after **Indicators**, framed by clean vertical separators (`| CORTEX |`), with cross-frame dropdown positioning so the menu always opens cleanly beneath it.

Trading Cortex v1.1.115 — Viewport-Clamped Big FVGs & Always-Visible Lower-Timeframe Labels

- **Big HTF FVG Labels Stay On-Screen on Lower Timeframes (`v1.1.115`)**: Extended or wide FVG rectangles (like `1H FVG` viewed on a `5m` or `1m` chart) now clamp cleanly to the right edge of the viewport (never past it) and automatically re-center their text inside the visible portion of the box on screen.

Trading Cortex v1.1.114 — Interactive Order Block Move/Resize & Adaptive OB Learning Engine

- **Move & Resize Order Blocks on Chart (`v1.1.114`)**: Drag the new **`✥`** handle beside `×` to move any Order Block to the exact candle/price, or hover and drag any of its 4 edges (Top, Bottom, Left, Right) to resize it—saved permanently across reloads.
- **Adaptive Learning From Moves, Resizes & `×` Removals (`v1.1.114`)**: Cortex now learns from every `×` dismissal (e.g., filtering out weak wick-only BOS or tiny-FVG setups) and every manual move/resize (e.g., body-only vs full-wick zones and candle shift preferences). Inspect active learned rules or reset anytime in **Settings → Charting Indicators → Order Blocks**.

Trading Cortex v1.1.113 — Fixed Hypernova Fixed-Header Overlap (Self-Measuring In-Flow Bar)

- **Clean Separation Below Hypernova's `Active Assessment` Header (`v1.1.113`)**: Self-measures the in-flow Cortex bar against Hypernova's fixed top header and left icon rail so it always sits cleanly **below** `Active Assessment` / `A1` and pushes the ticker & chart directly below it with zero overlap.

Trading Cortex v1.1.112 — Hypernova In-Flow Cortex Bar (Clean Top/Bottom Separation)

- **In-Flow Layout Container on Hypernova (`v1.1.112`)**: The Cortex black bar now mounts directly in normal document flow as its own flex row right between Hypernova's top header (`Active Assessment` / `A1`) and the ticker/chart workspace below—forcing top content above it and bottom content below it with zero overlap.

Trading Cortex v1.1.111 — Fixed Chart Viewport Snap-Back on Resize & Out-of-Focus Tab Fighting

- **Zero Chart Snap-Back on Resize (`v1.1.111`)**: Fixed child-iframe focus flips, cleared stale `lastChartSettingsMeta` replays after dispatch, and added a 15-second interaction/resize shield so resizing, zooming, or panning a chart never snaps back to an older position.
- **Strict Per-Exchange & Focus Isolation (`v1.1.111`)**: Scoped chart viewport sync by exchange hostname (so Vest Markets and Hypernova charts on the same ticker never overwrite each other) and stopped idle/out-of-focus charts from flushing stale viewports on blur.

Trading Cortex v1.1.110 — Hypernova Top Bar Chart Alignment & Zero Menu/Sidebar Overlap

- **Hypernova Chart Alignment (`v1.1.110`)**: The Cortex black top bar now aligns flush with the left edge of the Hypernova chart workspace (clearing the left icon rail).
- **No Overlap Over Menus, Dropdowns & Pull-Out Sidebars (`v1.1.110`)**: Adjusted layering (`z-index: 15`) on Hypernova for both the Cortex top bar and the Accounts & Risk pill so Hypernova's pull-out sidebar, dropdowns, and chart menus always appear cleanly on top.

Trading Cortex v1.1.109 — Added Hypernova (app.hypernova.xyz/trade) Support

- **Hypernova Built-In Support (`v1.1.109`)**: Trading Cortex now runs natively on `https://app.hypernova.xyz/trade` (`hypernova.xyz`), complete with a built-in **Hypernova** firm profile in Settings, custom SVG emblem, and venue recognition across alerts and overlays.

Trading Cortex v1.1.108 — Eliminated `AudioContext was not allowed to start` Chrome Extension Error

- **Fixed Web Audio Autoplay Error (`v1.1.108`)**: Switched Web Audio unlock listeners from `pointerdown`/`mousedown` to genuine gesture-completion events (`click`, `mouseup`, `pointerup`, `touchend`, `keydown`) with strict `isTrusted` and `navigator.userActivation` guards so Chrome never logs an `AudioContext` autoplay error in `chrome://extensions`.

Trading Cortex v1.1.107 — Dynamic Box-Fitted Order Block Text Sizing

- **Session-Box Style Auto-Fitted OB Text (`v1.1.107`)**: Order Block labels now center and dynamically scale to fit each box's visible width and height (just like Session Boxes), with your Text Size sliders (`8px–48px`) acting as the max cap and the `×` dismiss pill neatly tucked in the top-right corner.

Trading Cortex v1.1.106 — 1-Click Persistent Order Block Removal (×) & Restore

- **1-Click Remove Invalid Order Blocks (`v1.1.106`)**: Every Order Block label (native chart & MTF `5m`/`15m`/`1h`/`4h`) now includes a compact **`×`** button. Clicking it immediately hides the Order Block and saves its persistent key (`SYMBOL|TF|SIDE|TIME`) so it never redraws across page reloads, timeframe switches, or browser tabs.
- **Restore Removed Order Blocks (`v1.1.106`)**: View how many Order Blocks are hidden and click **`Restore All Removed OBs`** anytime in **Settings → Charting Indicators → Order Blocks**.

Trading Cortex v1.1.105 — Multi-Timeframe Order Blocks (5m / 15m / 1h / 4h) + Custom Colors & Text Sizing

- **5m, 15m, 1h & 4h Order Blocks on Any Chart (`v1.1.105`)**: Overlay `5m`, `15m`, `1h`, and `4h` Order Blocks on any active chart timeframe using TradingView's native datafeed, passive timeframe caching, instant resampling, and live forming-bar stitching—with left-edge clamping so active HTF zones stay visible on lower-timeframe charts.
- **Custom Per-Timeframe Colors, Opacity & Text Sizing (`v1.1.105`)**: Independently toggle `5m`, `15m`, `1h`, and `4h` Order Blocks, customize each timeframe's Bullish & Bearish colors and opacity, and adjust both standard and MTF Order Block label text sizes (`8px–20px`) in **Settings → Charting Indicators → Order Blocks**.

Trading Cortex v1.1.104 — Fixed Child-Iframe Clearing Loop & Price-Axis Compositor Flicker

- **Fixed Child-Iframe Overlay Fighting (`v1.1.104`)**: Added `isYieldingChartToTopWindow()` at the top of `renderIctSessionIndicators()` so child iframes yielding to `window.top` exit immediately instead of calling `clearAllChartOverlays()` on every tick.
- **Removed `will-change` Canvas Tearing (`v1.1.104`)**: Removed GPU layer hints (`will-change: contents`/`transform`) from price-axis session badges while keeping pooled DOM node reuse so labels stay rock-solid over TradingView's price axis canvas.

Trading Cortex v1.1.103 — Eliminated Session Line Price-Axis Label Flickering

- **Zero-Flicker Price-Axis Session Badges (`v1.1.103`)**: Replaced full `innerHTML` teardown on every price tick with persistent pooled badge nodes using GPU-composited `translate3d` positioning and owner-scoped cross-frame protection (`data-vest-owner`), eliminating flickering on session High/Low price scale labels.

Trading Cortex v1.1.102 — Eliminated Chart Flickering on Instrument & Account Switches

- **Zero Flicker on Instrument / Account Switches (`v1.1.102`)**: Stopped clearing overlays during transient empty-bar loading frames and preserved the cached chart canvas across `/trade` symbol changes.
- **Dirty-Checked Overlay Repainting (`v1.1.102`)**: Cached canvas/button styles and render signatures so the Accounts & Risk overlay only repaints when its data, symbol, config, or geometry actually changes instead of thrashing every frame.

Trading Cortex v1.1.101 — Fix Double Chart Overlay on Timeframe Switch & Portfolio Ghost Chart

- **Fixed Double Chart Overlays (`v1.1.101`)**: Excluded `#vest-accounts-risk-overlay-canvas` from `findMainChartPaneCanvas()` and validated TradingView container ancestry so timeframe switches can never self-target our overlay canvas or double-render candles/indicators.
- **Instant Cleanup on Portfolio & Non-Chart Screens (`v1.1.101`)**: Added SPA route detection and `clearAllChartOverlays()` so navigating to **Portfolio**, **Markets**, or other non-chart tabs immediately clears all chart candles, indicator overlays, and the Accounts & Risk drawing.

Trading Cortex v1.1.100 — Clearer Per-Trade Dollar Amount Badge & Open PnL Labels

- **Unmistakable Trade Amount Badge (`v1.1.100`)**: Flat/closed account rows now explicitly display **`USE / TRADE (X%)`** with the exact dollar amount highlighted inside a bold amber pill (`$4.90`), while open positions clearly prefix live values with **`PnL`** (`PnL +$2.59`).

Trading Cortex v1.1.99 — Accounts & Risk Font Size Control & 1-Click Minimize/Expand

- **Configurable Font Size (`v1.1.99`)**: Added a live **Font Size** slider (`8px – 18px`) in **Cortex → Accounts & Risk Box...** that scales all text, dollar values, and row spacing proportionally on the chart canvas.
- **1-Click Minimize / Expand (`v1.1.99`)**: Added a compact `—` button on the top-right of the drawing header to collapse the box into a tiny single-line pill (`▸ VEST MARKETS (6) · HYPE`) when you don't need it, and click anywhere on the pill to expand it back open.

Trading Cortex v1.1.98 — Filter Internal UUID/Hex Records & Top-Window Front-Most Canvas

- **Filtered Out Random UUID/Hex Rows (`v1.1.98`)**: Rejected internal UUID sub-objects (`6e6f946a-5a6e-4246-...`) and raw hex hashes from account discovery and automatically purged them from cache, leaving only your real named firm accounts (`Account 71`, `Account 73`, etc.).
- **Top-Window Front-Most Canvas (`v1.1.98`)**: Mounted the click-through overlay canvas on `window.top.document.body` so even host-page overlays like `↕ P&L` render behind the Accounts & Risk drawing.

Trading Cortex v1.1.97 — Front-Most Accounts & Risk Canvas Layer & Lower Top Offset

- **Front-Most Chart Layer (`v1.1.97`)**: Moved the Accounts & Risk drawing onto a dedicated click-through (`pointer-events: none`) top-most overlay canvas (`z-index: 2147483640`) so nothing on the chart (`↕ P&L`, position/order badges, legend buttons, or indicators) can cover over it.
- **Lower Top-Left Placement (`v1.1.97`)**: Nudged default `offsetY` down to `108px` (auto-migrating earlier defaults) so it sits cleanly below the top-left TradingView legend and indicator config controls.

Trading Cortex v1.1.96 — Clean Account Names, Deduplication & UI Noise Filtering

- **Clean Canonical Account Names (`v1.1.96`)**: Normalized concatenated Vest account strings (`76Account 76Instant`, `71Account 71Evaluati`) and bare numbers (`71`, `73`, `76`) into clean, deduplicated names (`Account 71`, `Account 73`, `Account 76`), with live `Account Value` prioritized over secondary balance fields.
- **Filtered Non-Account UI Rows (`v1.1.96`)**: Automatically strips and purges non-account labels (`Active Positions`, `Add Funded Account`, `PA`) from the chart overlay and cache.
- **Formatting & Clearance (`v1.1.96`)**: Fixed negative dollar formatting (`-$0.20`) and nudged default top offset (`76px`) below TradingView's `^` legend button.

Trading Cortex v1.1.95 — Non-Destructive In-Place Settings Sync (Fixes Scrollbar Push-Back)

- **Fixed Settings Scrollbar Pushing Back Up (`v1.1.95`)**: Replaced full modal DOM re-rendering on live settings events with non-destructive in-place DOM patching (`syncOpenModalControlsInPlace()`). Scrolling or dragging the Settings scrollbar is never interrupted or reset while switches/badges still sync live across browsers.

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
