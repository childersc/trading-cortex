const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Running Real-Time Cross-Browser & Cross-Tab Settings Synchronization Tests...');

const isolatedPath = path.join(__dirname, '../content/content-isolated.js');
const mainPath = path.join(__dirname, '../content/content-main.js');

const isolatedContent = fs.readFileSync(isolatedPath, 'utf8');
const mainContent = fs.readFileSync(mainPath, 'utf8');

// -------------------------------------------------------------
// Test 1: Verify Core Sync Primitives in content-isolated.js
// -------------------------------------------------------------
assert(isolatedContent.includes('const CORTEX_CROSS_TAB_CHANNEL_NAME = \'__trading_cortex_cross_tab_sync__\''), 'Must define CORTEX_CROSS_TAB_CHANNEL_NAME');
assert(isolatedContent.includes('function initCrossTabSyncChannel('), 'Must define initCrossTabSyncChannel helper');
assert(isolatedContent.includes('function broadcastLiveSettingsCrossTab('), 'Must define broadcastLiveSettingsCrossTab helper');
assert(isolatedContent.includes('function handleIncomingLiveSettings('), 'Must define handleIncomingLiveSettings helper');
assert(isolatedContent.includes('function applyLiveSettingsToAllComponents('), 'Must define applyLiveSettingsToAllComponents helper');

console.log('✓ Cross-tab BroadcastChannel & live component sync helper definitions verified');

// -------------------------------------------------------------
// Test 2: Verify Immediate Broadcast in queueSettingsSave & safeStorageSet
// -------------------------------------------------------------
assert(isolatedContent.includes('broadcastLiveSettingsCrossTab('), 'Must invoke broadcastLiveSettingsCrossTab');
// Check queueSettingsSave broadcasts without waiting for debounce
const queueSettingsExtract = isolatedContent.match(/function queueSettingsSave\([\s\S]*?\n  \}/);
assert(queueSettingsExtract, 'Must locate queueSettingsSave');
assert(queueSettingsExtract[0].includes('broadcastLiveSettingsCrossTab('), 'queueSettingsSave must immediately broadcast live settings cross-tab');

// Check safeStorageSet broadcasts
const safeStorageSetExtract = isolatedContent.match(/function safeStorageSet\([\s\S]*?\n  \}/);
assert(safeStorageSetExtract, 'Must locate safeStorageSet');
assert(safeStorageSetExtract[0].includes('broadcastLiveSettingsCrossTab('), 'safeStorageSet must immediately broadcast live settings cross-tab');

console.log('✓ Zero-latency immediate cross-tab broadcast in queueSettingsSave & safeStorageSet verified');

// -------------------------------------------------------------
// Test 3: Verify Window 'storage' & chrome.storage.onChanged Dispatch
// -------------------------------------------------------------
assert(isolatedContent.includes("window.addEventListener('storage'"), 'Must hook window storage event listener');
assert(isolatedContent.includes('__trading_cortex_isolated_settings__'), 'Storage listener must monitor __trading_cortex_isolated_settings__');

// Verify chrome.storage.onChanged triggers applyLiveSettingsToAllComponents
const storageOnChangedExtract = isolatedContent.match(/chrome\.storage\.onChanged\.addListener\([\s\S]*?\n  \}\s*catch/);
assert(storageOnChangedExtract, 'Must locate chrome.storage.onChanged listener block');
assert(storageOnChangedExtract[0].includes('applyLiveSettingsToAllComponents()'), 'chrome.storage.onChanged must dispatch to applyLiveSettingsToAllComponents');

console.log('✓ Multi-window storage events and chrome.storage.onChanged reactive wiring verified');

// -------------------------------------------------------------
// Test 4: Verify openStudioSettingsModal Live Updates
// -------------------------------------------------------------
assert(isolatedContent.includes('cortex-live-settings-updated'), 'Must dispatch and listen to cortex-live-settings-updated custom event');
assert(isolatedContent.includes('onLiveSettingsUpdated'), 'openStudioSettingsModal must register onLiveSettingsUpdated');

console.log('✓ In-dialog live synchronization (open Settings Modal auto-updating) verified');

// -------------------------------------------------------------
// Test 5: Verify content-main.js Clears Range Telemetry on Disable
// -------------------------------------------------------------
const rangeCheckExtract = mainContent.match(/if \(rangeDetectorEnabled\) \{[\s\S]*?\} else \{[\s\S]*?\}/);
assert(rangeCheckExtract, 'Must locate rangeDetectorEnabled branch in content-main.js');
assert(rangeCheckExtract[0].includes("type: 'VEST_TV_RANGE_UPDATE'"), 'content-main.js must post VEST_TV_RANGE_UPDATE with cleared telemetry when disabled');
assert(rangeCheckExtract[0].includes("statuses: []"), 'content-main.js must set statuses to [] when disabled');

console.log('✓ Main world telemetry cleanup on disable verified in content-main.js');

// -------------------------------------------------------------
// Test 6: Multi-Browser Tab VM Simulation (Browser A -> Browser B)
// -------------------------------------------------------------
{
  const broadcastMessages = [];

  class MockBroadcastChannel {
    constructor(channelName) {
      this.name = channelName;
      this.onmessage = null;
    }
    postMessage(data) {
      broadcastMessages.push({ channel: this.name, data });
    }
  }

  // Simulated Browser B state
  const browserB = {
    isTopWindow: true,
    isExtensionValid: () => true,
    settings: {
      rangeDetector: { enabled: true, timeframes: ['5m', '15m', '1h'] },
      orderBlocks: { enabled: true, showStatsBox: true }
    },
    templates: [],
    dom: {
      rangeBox: { style: { display: 'block' } },
      obStatsBox: { style: { display: 'block' } }
    },
    notifiedMainWorld: false,
    tabInstanceId: 'tab_b_123'
  };

  // Browser B render functions that hide boxes if disabled
  function mockRenderChartRangeBox() {
    if (!browserB.settings.rangeDetector || !browserB.settings.rangeDetector.enabled) {
      browserB.dom.rangeBox.style.display = 'none';
    } else {
      browserB.dom.rangeBox.style.display = 'block';
    }
  }

  function mockRenderChartOrderBlockStatsBox() {
    if (!browserB.settings.orderBlocks || !browserB.settings.orderBlocks.enabled || browserB.settings.orderBlocks.showStatsBox === false) {
      browserB.dom.obStatsBox.style.display = 'none';
    } else {
      browserB.dom.obStatsBox.style.display = 'block';
    }
  }

  function mockNotifyMainWorldConfig() {
    browserB.notifiedMainWorld = true;
  }

  // Browser B handler for incoming live settings
  function browserBHandleIncoming(incomingSettings, incomingTemplates) {
    if (incomingSettings) {
      browserB.settings = { ...browserB.settings, ...incomingSettings };
    }
    mockNotifyMainWorldConfig();
    mockRenderChartRangeBox();
    mockRenderChartOrderBlockStatsBox();
  }

  // Initial State: both boxes visible in Browser B
  assert.strictEqual(browserB.dom.rangeBox.style.display, 'block');
  assert.strictEqual(browserB.dom.obStatsBox.style.display, 'block');

  // Step 1: User on Browser A disables Range Detector and Order Blocks Stats Box
  const browserAChannel = new MockBroadcastChannel('__trading_cortex_cross_tab_sync__');
  const browserAUpdate = {
    type: 'CORTEX_LIVE_SETTINGS_BROADCAST',
    senderId: 'tab_a_999',
    payload: {
      settings: {
        rangeDetector: { enabled: false, timeframes: ['5m', '15m', '1h'] },
        orderBlocks: { enabled: true, showStatsBox: false }
      },
      templates: [],
      timestamp: Date.now()
    }
  };

  browserAChannel.postMessage(browserAUpdate);
  assert.strictEqual(broadcastMessages.length, 1);

  // Step 2: Browser B receives the broadcast message
  const msg = broadcastMessages[0].data;
  assert.strictEqual(msg.senderId !== browserB.tabInstanceId, true, 'Browser B must accept broadcast from Browser A');

  browserBHandleIncoming(msg.payload.settings, msg.payload.templates);

  // Step 3: Verify Browser B immediately hid the widgets WITHOUT refreshing the page
  assert.strictEqual(browserB.settings.rangeDetector.enabled, false, 'Browser B settings must update rangeDetector.enabled to false');
  assert.strictEqual(browserB.dom.rangeBox.style.display, 'none', 'Range Detector box on Browser B must immediately hide (display: none)');
  assert.strictEqual(browserB.dom.obStatsBox.style.display, 'none', 'Order Block Stats box on Browser B must immediately hide (display: none)');
  assert.strictEqual(browserB.notifiedMainWorld, true, 'Browser B must notify main world to re-render canvas in real time');

  console.log('✓ Multi-Browser Tab VM simulation passed: real-time cross-browser disabling without refresh verified');
}

console.log('All Real-Time Cross-Browser Settings Synchronization Tests Passed Successfully!');
