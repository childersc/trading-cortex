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
