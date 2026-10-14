Smart chart viewport memory, persistent left-sidebar drawing tools, customizable ICT/SMC rectangle templates, and 1-click Update Center.

- **Update Center & Post-Update Confirmation (`v1.1.2`)**: Renamed the updater to **Update Center**, keeps the Update Center page open after hot-reloading the extension and active trading tabs, and displays a clear success confirmation banner.
- **Pulsing `"Update ready"` Alert**: Automatic background update checks on page refresh and menu click with a cycling emerald glow on the `CORTEX` header pill when a new version is available.
- **Silent Left-Sidebar Submenu Restoration**: Fixed left-hand drawing toolbar submenu restoration so pull-out menus never stay open on refresh and all tool groups (Trendlines, Fib/Gann, Brushes/Arrows/Shapes, Annotations, Patterns, and Prediction tools) persist their last selected tool without unselecting chart shapes.
- **Scoped Exclusively to Supported Terminals**: Restricted host permissions and content scripts to `next.vestmarkets.com` and `vest.exchange` (excluding `trade.vestmarkets.com`).
- **Chart Viewport & Settings Memory**: Automatically remembers and restores your exact chart position (left/right pan, up/down price scale, zoom level), timeframe, and candle style across page refreshes.
- **Native TradingView `Template >` Context Menu**: Right-click any rectangle on the chart to apply, save, or delete custom ICT/SMC box presets (`Bullish OB`, `Bearish OB`, `Fair Value Gap`, `Liquidity`, `Breaker Block`, `Volume Imbalance`).
