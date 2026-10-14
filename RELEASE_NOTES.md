Trading Cortex v1.1.6 — In-Memory Drawing Toolbox Persistence, Update Center Telemetry & Local JSON Database

- **In-Memory Drawing Toolbox Persistence**: Pre-hydrates TradingView's internal `toolbarStorage` across `window.top.localStorage` and `blob:` chart iframes at `document_start`, and updates all 7 left-sidebar tool group slots via React Fiber (`__reactFiber$`) in-memory without ever opening or leaving DOM pull-out menus open.
- **Update Center "Check for Update" & "Last Checked" Telemetry**: Added a **"Check for Update"** button with live status feedback and a **"Last Checked"** date/time readout in the Hero Banner and Background Heartbeat tile.
- **Zero-Flash In-Place Update Flow**: Keeps the Update Center tab open in-place during deployment without closing and reopening the tab, while automatically reloading active `next.vestmarkets.com` and `vest.exchange` browser windows.
- **Local File System JSON Database & Schema Migrations (`user-data/cortex-db.json`)**: Automatically persists and migrates custom templates and settings to `user-data/cortex-db.json` (plus Domain Vault storage) so templates survive extension unloads, reloads, and updates.
- **CORTEX Dropdown Quick-Update Button**: Added a highlighted **`⚡ Update Ready (vX.Y.Z) ↗`** button inside the `CORTEX` dropdown menu whenever a new version is available.
- **Chart Viewport & Settings Memory**: Automatically remembers and restores chart pan, price scale, zoom level, timeframe, and candle style per symbol.
