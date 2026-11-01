# Trading Cortex (Chrome Extension)

A Chrome extension for **TradingView Charting Library** platforms (`next.vestmarkets.com`, `vest.exchange`) that adds **Chart Memory Features, Viewport Position & Zoom Persistence, and Box/Drawing Templates**.

Vest Markets embeds TradingView charts, but by default it lacks a drawing template system—meaning every time you draw a box, it defaults to the generic purple color (`#9c27b0`). This extension provides **custom templates, 1-click color presets, center lines (50% / CE), ray extensions (left & right), an on-chart floating quick-bar, and automatic styling**.

---

## Features

- **No More Purple Default**: When you draw a box, it automatically uses your active or default template colors, opacity, center line, and ray settings (e.g. Bullish OB Green, Bearish OB Red, FVG Gold, etc.).
- **Center Line (50% / Consequent Encroachment)**:
  - Toggle center line on any box/template.
  - Customize center line color, width, and style (dashed, dotted, solid).
  - Pre-configured on Fair Value Gap (FVG), Liquidity/Range, and Volume Imbalance.
- **Extend Left & Extend Right (Rays)**:
  - Set FVG or order blocks to extend infinitely right (`➜`) or left (`⬅`) across the chart.
- **Sync Box Settings to Active Template ("Sync to Active")**:
  - Tweak any FVG or box directly on the chart (colors, center line, ray extensions).
  - Click **"Sync to Active"** on the floating bar, and those exact settings are immediately saved into your active template so every subsequent box inherits them!
- **Remember Sidebar Drawing Selections (Magnet, etc.)**:
  - Automatically captures and restores your left sidebar drawing tools and toggles when you load or refresh Vest Markets.
  - Remembers **Magnet Mode** (snap to OHLC), **Stay in Drawing Mode**, **Lock All Drawings**, and **Hide All Drawings**.
  - Can be toggled on/off in the extension popup settings.
- **1-Click Template Bar on Chart**: A draggable, collapsible floating toolbar directly over the chart with your template pills, center line indicators (`╍`), and ray markers (`➜`, `⬅`).
- **Native Floating Toolbar Integration**: Adds a "Templates" dropdown directly into TradingView's floating properties bar when a box is clicked.
- **Pre-Configured Trading Presets**:
  - **Bullish OB** (Emerald Green border, 20% fill opacity)
  - **Bearish OB** (Red border, 20% fill opacity)
  - **Fair Value Gap / FVG** (Gold border, 18% fill opacity, 50% Dashed Center Line, Extend Right)
  - **Liquidity / Range** (Blue dashed border, 15% fill opacity, Center Line)
  - **Breaker Block** (Purple border, 20% fill opacity)
  - **Consolidation** (Slate Gray border, 15% fill opacity, Center Line)
  - **Volume Imbalance** (Cyan dotted border, 22% fill opacity, Dotted Center Line, Extend Right)
- **Custom Template Designer (Popup)**:
  - Border Color & Fill Color (with hex and color picker)
  - Fill Opacity slider (0% to 100%)
  - Border Width (1px, 2px, 3px, 4px) & Border Style (Solid, Dashed, Dotted)
  - Center Line controls (toggle, color, width, style)
  - Extend Right / Extend Left checkboxes
  - Optional Text Label & Text Color
  - Live interactive preview box reflecting all changes in real time
- **Keyboard Shortcuts**: Press `Alt` + `1` through `9` on your keyboard to instantly switch active template or recolor the selected box.
- **Chart Trader Panel Settings**: Open `CORTEX` → **Cortex Settings...** → **Chart Trader Panel Settings** to configure live Long and Short fail-price lines, label and font sizes, and their on-chart **Add Stop Loss** buttons. Each button appears immediately to the left of its matching Long or Short fail-price label. The chart labels read **Long Fail Price** and **Short Fail Price**; an active estimate adds a dashed, side-colored **Long Stop Loss** or **Short Stop Loss** line that follows the moving midpoint, plus an **Est. PnL** box that mirrors Vest's order-panel value and color. Lines show directional markers at the chart edge when offscreen. The Amount value and denomination (USD or instrument units) are remembered per market across refreshes. Each button prefills a stop halfway between the current market price and that side's fail price, updates it as prices move, and clears it after order execution.
- **Favorite Timeframes**: Click the interval selector's dropdown and star any listed timeframe to add it to a quick-access row beside the selector. Click a favorite chip to switch resolutions, or click its star again in the dropdown to remove it. Favorites are saved with Trading Cortex settings and included in `user-data/cortex-db.json` by the existing database sync when the extension folder is linked.
- **Cortex Indicator (prototype)**: Open `CORTEX` → **Cortex Settings...** → **Cortex Indicator** to enable a configurable EMA centerline, ATR-based stepped trend stop, Buy/Sell trend flips, estimated Entry/Stop/TP levels, and a multi-timeframe trend table. Choose fixed-point distances (default 8-point stop and 4-point target spacing) or ATR-based levels, then adjust the stop, target spacing, label font, and label box size. Dotted level guides extend left from their labels and stop at the first later candle that reaches each price. The shaded trend cloud has been removed. This is an original approximation inspired by the supplied indicator screenshot because its original formula is unavailable.
- **Cortex voice alerts**: Open `CORTEX` → **Settings** → **Alerts & Voice Settings**, directly below About. Choose a browser voice (including the Irish English preset when the browser provides an `en-IE` voice) and test it, then independently enable a once-per-candle “Buy/Sell signal forming” call and a confirmed “Buy Now” / “Sell Now” call when the signal bar closes. The browser API does not expose voice gender, so audition the Irish preset with **Test voice**. These alerts require the Cortex Indicator to be enabled and do not submit orders.
- **Cortex Indicator Paper Signal Testing**: Enable **Signal automation** in the Cortex Indicator settings to simulate confirmed, closed-bar entries using the current Vest Amount field for sizing context. Paper mode simulates three limit targets that each close 25% of the original position; the stop moves to entry after TP1, to TP1 after TP2, and to TP2 after TP3. A confirmed opposite signal is ignored during the first five bars after entry; later it logs a flatten and only opens the opposing paper position after the simulated flat. Paper mode never submits orders. Live mode is currently fail-closed and does not submit orders until the complete Vest workflow for entry, three targets, and staged stop updates is verified.
- **Paper stats overlay**: When the Cortex Indicator is enabled, a compact chart overlay shows the active instrument's saved paper entries, TP1/TP2/TP3 hits, and stops reached before any target. It updates on completed paper bars and instrument changes; the counts include paper simulations only.
- **Manual ticket entry**: When the Cortex Indicator is enabled, use the **LIVE BUY + TARGETS** and **LIVE SELL + TARGETS** buttons in Vest’s order ticket. Each button uses the current ticket size and configured stop/target spacing, asks for confirmation, submits a market entry, waits for Vest to show the position, then stages three reduce-only limit orders on the opposite side. The flow reads Vest’s Open Orders tab/table (including the empty state when no badge is shown), blocks if the same instrument already has a position or the account has open orders, and stops if Vest does not confirm a step. This real-order action is independent of the Paper/Live signal-automation selector; signal-driven Live automation remains locked. The manual flow does not yet move the stop after target fills and has not been exercised against a live order.
- **Chart Position Memory**: Remember chart pan and zoom separately for each instrument and timeframe. The focused tab publishes its viewport; other open Cortex tabs follow only when they show that same instrument and timeframe, and do not echo their own viewport back.
- **Global Drawing Sync**: Right-click a chart drawing and choose **Sync globally** (above **Lock**) to persist it across tabs and timeframes for the same instrument. The focused tab publishes drawing changes; other matching tabs apply them without echoing them back. Trading Cortex records the source timeframe, shape geometry, and drawing properties in its local drawing store and `user-data/cortex-db.json` when the extension folder is linked. Removing a synced drawing also removes its saved record; restores check chart and persisted drawings before creating copies. Removing an auto-detected FVG suppresses that specific FVG from being recreated.
- **Session H/L Line Extension**: In **Cortex Settings...** → **Session Indicators**, extend uncleared High/Low lines to the chart edge until a sweep or close-through, or extend every level even after it is cleared. This also works while a session is still forming.
- **Moveable News and Instrument Trades Boxes**: Drag either box anywhere on screen above the Cortex bottom bar. Minimized boxes dock beside the Cortex dropdown in the black bar.
- **Quick Save**: Click "+ New" on the floating bar to save any custom box on your chart into a new template.
- **Cloud Sync & Export/Import**: Templates sync automatically across your browser via `chrome.storage.sync` and can be exported/imported as JSON files.

---

## Installation in Chrome

1. **Download the Latest Release**:
   - Go to the [Trading Cortex Releases page](https://github.com/childersc/trading-cortex/releases/latest).
   - Download the latest **`trading-cortex-x.x.x.zip`** package (or clone this repository).
2. **Extract the Archive**:
   - Unzip the downloaded `.zip` file to a permanent folder on your computer (for example, `Documents/Trading Cortex`).
3. **Load into Chrome**:
   - Open Google Chrome and navigate to:
     ```
     chrome://extensions/
     ```
   - Enable **Developer mode** using the toggle switch in the top-right corner.
   - Click the **Load unpacked** button in the top-left corner.
   - Select the extracted **`Trading Cortex`** folder (the folder containing `manifest.json`).
4. **Trading Cortex** is now active! You can also link that extracted folder inside the **Update Center** (`CORTEX` → **Cortex Settings...** → **Open Update Center**) for 1-click in-place updates whenever a new version is released.

---

## How to Use on Vest Markets

1. Navigate to [Next Vest Markets](https://next.vestmarkets.com/trade) or [Vest Exchange](https://vest.exchange).
2. You will see a small, sleek **Box Templates** floating toolbar on the chart.
   - You can drag it by its header to position it anywhere you prefer.
   - Click the minimize button `—` to collapse it into a compact pill when you need more chart space.
3. **Drawing a new box / FVG**:
   - Select the Box/Rectangle drawing tool on TradingView's left panel.
   - Draw your box. It will automatically draw in the active template's colors, center line, and ray extension!
4. **Recoloring & applying center line to an existing box**:
   - Click any box on the chart to select it.
   - Click any template on the floating bar (or press `Alt+1`, `Alt+2`, etc.).
   - The box will instantly update its border, fill color, opacity, center line, and ray extensions!
5. **Overriding an existing template by selecting its name**:
   - Select any box on the chart that has the desired colors, center line, or ray settings.
   - On the floating bar: Click **"Override..."** and click the template name you want to overwrite.
   - In TradingView's floating toolbar: Open the **"Template"** dropdown and click the reload icon `⟳` next to any template name.
   - In the Extension Popup: Click the reload icon `⟳` on any template card, or open the editor and choose an existing template from the **"Override Existing Template"** dropdown.
6. **Deleting a template**:
   - On the floating bar: Hover over any template item and click the `×` button.
   - In TradingView's floating toolbar: Open the **"Template"** dropdown and click the red `×` button next to the template name.
   - In the Extension Popup: Click the trash can icon on any template card in the Templates tab.
7. **Saving a box as a brand new template**:
   - Click **"+ New"** on the floating bar or in the TradingView dropdown to give your selected box a new name.
8. **Chart Trader Panel Settings**:
   - Open `CORTEX` → **Cortex Settings...** → **Chart Trader Panel Settings**.
   - Turn on **Show Long and Short Fail Price Lines**. Labeled Long and Short lines will appear at the live fail prices shown in Vest's trading panel and move when those prices update. If a fail price is outside the visible chart range, a directional marker shows its value at the chart edge.
   - Adjust **Label size** and **Font size** to change the chart tags; the defaults are 100% and 11 px.
   - The Amount value and denomination are remembered per market across page refreshes. Click **Add Stop Loss** beside either on-chart fail-price label to fill the Stop Loss field with the midpoint between the current market price and that fail price. A matching dashed **Long Stop Loss** or **Short Stop Loss** chart line follows the estimate until an order is submitted, then both the line and field clear unless Vest reports an order error.
9. **Favorite Timeframes**:
   - Open the interval dropdown beside the chart's current timeframe and click the star next to a resolution to favorite it. Favorite timeframe chips appear next to the selector for one-click switching.
   - You can also manage the complete favorite list under `CORTEX` → **Cortex Settings...** → **Chart Memory Features**.
   - Starred timeframes are saved with extension settings and restored after reload. When the extension's folder is linked for JSON database sync, the favorites are also written into `user-data/cortex-db.json`.
10. **Sync a drawing globally**:
   - Right-click the drawing and choose **Sync globally** above **Lock**. The drawing is restored on other open or refreshed charts for that same instrument, regardless of timeframe. Click the checked **Sync globally** row again to stop syncing it.
