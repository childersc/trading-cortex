# Trading Cortex — Feature List & Chrome Web Store Submission Kit

## Complete Feature List (`v1.1.118`)

### 1. Supported Perpetuals & Trading Terminals
- **Built-in Native Support**:
  - **Vest Markets** (`next.vestmarkets.com` / `vestmarkets.com`)
  - **Hypernova** (`app.hypernova.xyz` / `hypernova.xyz`)
  - **My Funded Perpetuals** (`myfundedperpetuals.com`)
  - **Kalshi Pro** (`pro.kalshi.com` / `kalshi.com`)
- **Custom Exchange Support**: Add any TradingView-powered perpetuals or prop-firm terminal via **Settings → Prop Firms** using Chrome's optional host permissions.

### 2. Native TradingView Toolbar & Workspace UI
- **TradingView Top Chart Toolbar Integration**: Compact **CORTEX** pill mounted cleanly inside TradingView's top chart bar right after `Indicators` (`| CORTEX |`), with cross-frame dropdown positioning.
- **Bottom-of-Chart Minimized Windows Dock**: Dedicated auto-hiding dock right below the chart viewport `<iframe>` for minimized floating widgets (auto-hides to `0px` when nothing is minimized).
- **Bottom Positions Panel Manager**: 1-click **Detach** (floating opaque window) and **Minimize** controls for the exchange Positions panel, with per-firm state persistence.
- **Dialog Glass Effect & Resizable Settings Hub**: Unified **Charting Indicators** hub with expandable tiles, live cross-tab synchronization (`BroadcastChannel` + `chrome.storage.onChanged`), and drag-resizable modal.

### 3. ICT / SMC Charting Indicators
- **Institutional Order Blocks (Smart Risk) + Multi-Timeframe (`5m`, `15m`, `1h`, `4h`)**:
  - Projects `5m`, `15m`, `1h`, and `4h` Order Blocks onto any active chart timeframe via TradingView's datafeed, passive timeframe caching, instant resampling, and live forming-bar stitching.
  - Per-timeframe toggles, custom Bullish & Bearish colors, fill opacity, and **Session-Box style auto-fitted dynamic text sizing**.
  - **Interactive Move & Resize**: Drag the `✥` handle or any of the 4 box edges to reposition/resize any Order Block permanently.
  - **1-Click Persistent Removal (`×`)**: Dismiss invalid Order Blocks across all timeframes and reloads (with 1-click **Restore Removed OBs**).
  - **On-Device Adaptive Learning Engine**: Automatically learns from your `×` removals, candle moves, and box resizes (e.g., requiring close-based BOS, raising minimum FVG/displacement ratios, switching between body-only vs. full-wick zones, and tuning origin candle selection).
  - **1:3 RR Performance Stats Screen & Audible Alerts**: Live win-rate, net R, profit factor, expectancy, and spoken/chime alerts on mitigation.
- **ICT Trading Sessions & Killzones**:
  - Customizable Asia, London, NY AM, NY Lunch, and NY PM session boxes with dynamic box-fitted watermarks, Session High/Low/Midpoint lines, sweep/mitigation tracking, and pooled zero-flicker price-axis badges.
- **Auto Fair Value Gaps (FVG) & Big HTF FVG Viewport Clamping**:
  - Automatic detection of bullish/bearish Fair Value Gaps with 50% Consequent Encroachment midlines, reclaimed/mitigated styling, and viewport-clamped centered labels that stay visible on lower timeframes (`5m`/`1m`).
- **Market Structure (BOS / MSS / CHoCH)**:
  - Real-time Break of Structure and Change of Character detection with configurable swing lookback, wick vs. close break mode, and custom colors.
- **Multi-Timeframe Range Detector**:
  - Choppiness Index + ADX hybrid regime detection (`RANGING` / `TRENDING LONG` / `TRENDING SHORT`) across multiple timeframes with voice/chime alerts.
- **Cortex Trend Indicator & Paper Execution Engine**:
  - ATR/EMA trend bias overlay, entry/stop/target levels, live paper trade stats, and voice alerts.
- **Candle OHLC, Candle Numbers & Custom Candle Width**:
  - Click-to-toggle or all-candle OHLC tags, backward candle numbering (`#1`, `#2`, ...), and in-place custom candle width scaling.
- **Fail Price Lines**:
  - Live liquidation/fail price horizontal lines with quick-action chart overlays.

### 4. Risk, Accounts & Trader Utilities
- **On-Chart Accounts & Per-Trade Risk Overlay**:
  - Non-draggable, click-through canvas overlay showing all discovered accounts for the active firm, live open `PnL` on the active instrument, or bold **`USE / TRADE (X%)`** dollar sizing when flat—with configurable font size, risk %, and 1-click minimize/expand.
- **Drawing Templates & Global Cross-Timeframe Drawings**:
  - Save and apply custom Rectangle / FVG / Trendline / Fib templates with hotkeys, automatic override persistence, and cross-timeframe global drawing sync.
- **Economic News Calendar Widget**:
  - Live high/medium/low-impact macro news countdowns (USD, EUR, GBP, JPY, etc.) pinned to the chart or minimized to the dock.
- **Instrument Trades & Diagnostics Widgets**:
  - Session-filtered closed trade log per instrument and live diagnostics telemetry.
- **Smart Chart Memory & Timeframe Isolation**:
  - Remembers drawing tool selections, favorite timeframes, and per-exchange/per-resolution viewports without cross-tab or cross-exchange snap-back.

---

## Chrome Web Store Submission Checklist

### 1. Package Build
Run the Chrome Web Store packager (strips unpacked-only `update/` self-updater & GitHub host permissions):
```powershell
.\scripts\build-cws.ps1
```
Output: `dist/trading-cortex-cws-<version>.zip`

### 2. Store Listing Copy
- **Name:** `Trading Cortex`
- **Short Description (126 / 132 chars):**
  > `Smart chart memory, drawing tool persistence, ICT/SMC templates, and workspace enhancements for TradingView-powered exchanges.`
- **Category:** `Productivity` (or `Tools`)
- **Language:** `English`
- **Privacy Policy URL:** Host `PRIVACY_POLICY.md` on GitHub (`https://github.com/childersc/trading-cortex/blob/main/PRIVACY_POLICY.md`) or a dedicated GitHub Pages URL.

### 3. Single Purpose Description (CWS Form)
> Trading Cortex enhances TradingView-powered perpetuals and prediction-market trading terminals with persistent drawing templates, local ICT/SMC charting overlays (Sessions, FVGs, Multi-Timeframe Order Blocks, Market Structure, Range Detector), workspace panel docking, and local per-trade risk sizing.

### 4. Permission Justifications (Copy-Paste Ready)
- **`storage`**: Stores user preferences, custom drawing templates, indicator configurations, dismissed/adjusted Order Blocks, and on-device adaptive learning samples locally in Chrome storage.
- **`alarms`**: Periodically refreshes the read-only macroeconomic news calendar feed (`nfs.faireconomy.media`) in the background when the Economic News widget is enabled.
- **`tabs`**: Detects active trading tabs across browser windows to synchronize settings and open the extension's local UI pages cleanly.
- **`scripting`**: Registers content scripts dynamically only when a user explicitly adds and authorizes a custom TradingView exchange domain in Settings → Prop Firms.
- **`host_permissions` (`vestmarkets.com`, `myfundedperpetuals.com`, `kalshi.com`, `hypernova.xyz`)**: Required to inject the TradingView chart overlay canvas, toolbar pill, and workspace enhancements on supported trading terminals.
- **`host_permissions` (`nfs.faireconomy.media`)**: Required to fetch public read-only macroeconomic calendar events for the on-chart Economic News widget without page CORS failures.
- **`optional_host_permissions` (`https://*/*`, `http://*/*`)**: Never requested on install. Only requested interactively via `chrome.permissions.request()` if a user manually adds a custom perpetuals exchange URL in Settings → Prop Firms.
- **Remote Code Attestation**: **No, I am not using remote code.** All JavaScript and CSS are bundled directly inside the Chrome Web Store package.

### 5. Privacy Practices Tab (CWS Form)
- **Does this extension collect or use user data?** → **No** (all settings and chart preferences remain strictly local to the user's browser; zero external analytics or data transmission).

### 6. Visual Assets Needed for Store Dashboard
- **Store Icon (128×128 PNG)**: Ready at `icons/icon128.png`
- **Screenshots (1280×800 PNG, 1–5 images)**: Capture clean screenshots showing:
  1. Full chart with ICT Sessions, Multi-Timeframe Order Blocks (`5m`/`15m`/`1h`/`4h`), and the TradingView toolbar `| CORTEX |` pill.
  2. Unified Charting Indicators Settings Hub (Order Blocks + Adaptive Learning + MTF color customization).
  3. On-chart Accounts & Per-Trade Risk overlay + Economic News & OB Stats widgets.
- **Small Promo Tile (440×280 PNG)** *(recommended for featuring)*.
