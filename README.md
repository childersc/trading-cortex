# Trading Cortex (Chrome Extension)

A Chrome extension for **TradingView Charting Library** platforms (`trade.vestmarkets.com`, `next.vestmarkets.com`, `vest.exchange`) that adds **Chart Memory Features, Viewport Position & Zoom Persistence, and Box/Drawing Templates**.

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
4. **Trading Cortex** is now active! You can also link that extracted folder inside the **OTA Release Center** (`CORTEX` → **Cortex Settings...** → **Open OTA Release Center**) for 1-click in-place updates whenever a new version is released.

---

## How to Use on Vest Markets

1. Navigate to [Vest Markets Trading](https://trade.vestmarkets.com) or [Next Vest Markets](https://next.vestmarkets.com/trade).
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
