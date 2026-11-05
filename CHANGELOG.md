# Trading Cortex — Changelog & Version History

All notable changes, new features, and bug fixes through the current release (`v1.1.44`) are documented in this file.

---

## [v1.1.45-Alpha] — In-Development (Bleeding Edge)

### ⚡ Bleeding Edge
- Active development branch tracking upcoming v1.1.45 release.
- Live Alpha version metadata (`1.1.45 Alpha`) across manifest, popup, and Update Center.

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
