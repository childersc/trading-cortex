const assert = require('assert');

function isSafeTradingViewStorageKey(key) {
  if (typeof key !== 'string' || !key) return false;
  if (key.startsWith('__trading_cortex_')) return false;
  if (
    key.startsWith('tv-chart-drawings-') ||
    key.startsWith('tv-drawings-flush') ||
    key.startsWith('tv-layout-flush') ||
    key.startsWith('user-state-') ||
    key.startsWith('vest') ||
    key.startsWith('mfp') ||
    key.startsWith('privy:') ||
    key.startsWith('wagmi.') ||
    key.startsWith('rk-') ||
    key.startsWith('turnkey_') ||
    key.startsWith('web3') ||
    /auth|token|session|jwt|refresh|bearer|user|account|wallet|privy|wagmi|rainbow|web3|turnkey|dynamic|metamask|coinbase|phantom|keplr|solana|ethereum|address|signature|credential|login|identity|cookie|flush|layout-base/i.test(key)
  ) {
    return false;
  }
  return (
    key.startsWith('tradingview.') ||
    key.startsWith('tvlocalstorage.') ||
    key.startsWith('tv.') ||
    key === 'properties_toolbar.position' ||
    key.startsWith('linetool.') ||
    key.startsWith('combobox.')
  );
}

// 1. Positive tests (valid TradingView keys)
assert.strictEqual(isSafeTradingViewStorageKey('tradingview.chartproperties'), true);
assert.strictEqual(isSafeTradingViewStorageKey('tradingview.favoriteDrawings'), true);
assert.strictEqual(isSafeTradingViewStorageKey('tradingview.IntervalWidget.quicks'), true);
assert.strictEqual(isSafeTradingViewStorageKey('tradingview.StyleWidget.quicks'), true);
assert.strictEqual(isSafeTradingViewStorageKey('properties_toolbar.position'), true);
assert.strictEqual(isSafeTradingViewStorageKey('tvlocalstorage.available'), true);
assert.strictEqual(isSafeTradingViewStorageKey('tv.toolbar.drawings'), true);
assert.strictEqual(isSafeTradingViewStorageKey('linetool.cursor'), true);
assert.strictEqual(isSafeTradingViewStorageKey('combobox.tradingview'), true);

// 2. Negative tests: Web3, Auth, Session, Wallet, Account, Platform Layout keys
assert.strictEqual(isSafeTradingViewStorageKey('user-state-layout-base:e3cd52e5-5f3e-5259-a7b5-b28416a1d7da'), false);
assert.strictEqual(isSafeTradingViewStorageKey('tv-drawings-flush:BTC-PERP'), false);
assert.strictEqual(isSafeTradingViewStorageKey('tv-drawings-flush:e3cd52e5-5f3e-5259-a7b5-b28416a1d7da:BTC-PERP'), false);
assert.strictEqual(isSafeTradingViewStorageKey('tv-layout-flush:BTC-PERP'), false);
assert.strictEqual(isSafeTradingViewStorageKey('tv-chart-drawings-BTC-PERP'), false);
assert.strictEqual(isSafeTradingViewStorageKey('wagmi.active_connector'), false);
assert.strictEqual(isSafeTradingViewStorageKey('wagmi.connected'), false);
assert.strictEqual(isSafeTradingViewStorageKey('wagmi.wallet'), false);
assert.strictEqual(isSafeTradingViewStorageKey('privy:active_account'), false);
assert.strictEqual(isSafeTradingViewStorageKey('privy:token'), false);
assert.strictEqual(isSafeTradingViewStorageKey('privy:session'), false);
assert.strictEqual(isSafeTradingViewStorageKey('privy:user'), false);
assert.strictEqual(isSafeTradingViewStorageKey('rk-recent'), false);
assert.strictEqual(isSafeTradingViewStorageKey('turnkey_session'), false);
assert.strictEqual(isSafeTradingViewStorageKey('vest_active_account'), false);
assert.strictEqual(isSafeTradingViewStorageKey('activeWallet'), false);
assert.strictEqual(isSafeTradingViewStorageKey('activeAccount'), false);
assert.strictEqual(isSafeTradingViewStorageKey('active_chain_id'), false);
assert.strictEqual(isSafeTradingViewStorageKey('jwt_token'), false);
assert.strictEqual(isSafeTradingViewStorageKey('session_id'), false);
assert.strictEqual(isSafeTradingViewStorageKey('__trading_cortex_sidebar_state__'), false);
assert.strictEqual(isSafeTradingViewStorageKey(''), false);
assert.strictEqual(isSafeTradingViewStorageKey(null), false);
assert.strictEqual(isSafeTradingViewStorageKey(undefined), false);

console.log('All storage sanitization tests passed successfully!');
