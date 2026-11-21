# Privacy Policy — Trading Cortex

**Effective Date:** November 21, 2026  
**Extension Name:** Trading Cortex

## 1. Overview
Trading Cortex is a client-side Chrome extension that enhances TradingView-powered perpetuals and prediction-market terminals with chart drawing templates, multi-timeframe ICT/SMC indicators, workspace persistence, and trade risk tools. **Trading Cortex does not collect, sell, rent, or transmit your personal data, trading credentials, wallet keys, or account information to any external server.**

## 2. Data Stored Locally
All user preferences and chart data are stored exclusively on your device using Chrome's built-in extension storage (`chrome.storage.local` and `chrome.storage.sync`) and browser `localStorage`:
- Custom drawing tool templates (colors, opacity, line styles, labels)
- Indicator settings (ICT Sessions, Auto FVG, Order Blocks, Market Structure, Range Detector, Cortex Indicator, Candle OHLC, Fail Lines, Accounts & Risk Box)
- Chart layout preferences (panel docking state, minimized window order, per-symbol viewport memory, favorite timeframes)
- User-dismissed Order Blocks, manual Order Block box adjustments, and on-device adaptive learning feature samples
- Cached local account snapshots read passively from the active exchange tab for on-chart risk calculation

You can clear all stored data at any time by resetting settings inside the extension or uninstalling Trading Cortex.

## 3. Network Requests
Trading Cortex makes **zero** tracking, analytics, or telemetry requests. The only external network request performed by the Chrome Web Store build is:
- **Economic Calendar Feed (`https://nfs.faireconomy.media/*`)**: Read-only fetch of public scheduled macroeconomic news events (e.g., CPI, FOMC, NFP) to display in the optional on-chart Economic News widget. No user data or identifiers are sent with this request.

## 4. Supported Websites & Host Permissions
Trading Cortex only activates on supported trading terminals (`vestmarkets.com`, `myfundedperpetuals.com`, `kalshi.com`, and `hypernova.xyz`), plus any additional custom exchange domain you explicitly authorize via Chrome's optional host permission prompt in **Settings → Prop Firms**.

## 5. Security
- Trading Cortex never accesses, reads, or transmits private keys, seed phrases, passwords, or authentication cookies.
- All indicator calculations, adaptive Order Block learning, and risk sizing run 100% locally inside your browser.

## 6. Contact
If you have questions about this Privacy Policy, please open an issue on the Trading Cortex GitHub repository: https://github.com/childersc/trading-cortex
