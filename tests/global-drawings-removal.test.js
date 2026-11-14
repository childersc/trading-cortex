const assert = require('assert');

// Test suite for Trading Cortex Global Drawings Removal & Sync Lifecycle
console.log('Running Global Drawings Removal & Sync Tests...');

// 1. Mock isolated world globalDrawings storage and broadcast logic
{
  let globalDrawings = [
    { id: 'gd_1', symbol: 'BTC-PERP', timeframe: '5m', shape: 'rectangle', points: [{ time: 1000, price: 50000 }] },
    { id: 'gd_2', symbol: 'BTC-PERP', timeframe: '15m', shape: 'horiz_line', points: [{ time: 1000, price: 51000 }] }
  ];
  let broadcastCount = 0;
  let lastBroadcast = null;
  let storageState = { globalDrawings: [...globalDrawings] };

  function postToMainWorlds(msg) {
    broadcastCount++;
    lastBroadcast = msg;
  }

  function saveGlobalDrawings(next) {
    globalDrawings = [...next];
    storageState.globalDrawings = [...globalDrawings];
    postToMainWorlds({ type: 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', payload: { drawings: globalDrawings } });
  }

  function handleIsolatedMessage(type, data) {
    if (type === 'VEST_TV_GLOBAL_DRAWING_REMOVE') {
      const targetId = data.drawingId;
      globalDrawings = (globalDrawings || []).filter(item => item && item.id !== targetId);
      postToMainWorlds({ type: 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', payload: { drawings: globalDrawings } });
      const latest = storageState.globalDrawings || globalDrawings;
      saveGlobalDrawings(latest.filter(item => item && item.id !== targetId));
    }
  }

  // Remove gd_1
  handleIsolatedMessage('VEST_TV_GLOBAL_DRAWING_REMOVE', { drawingId: 'gd_1' });

  assert.strictEqual(globalDrawings.length, 1, 'gd_1 should be removed from memory');
  assert.strictEqual(globalDrawings[0].id, 'gd_2', 'Only gd_2 should remain in memory');
  assert.strictEqual(storageState.globalDrawings.length, 1, 'storage should be updated immediately');
  assert.strictEqual(lastBroadcast.type, 'VEST_TV_GLOBAL_DRAWINGS_UPDATE', 'Should broadcast update');
  assert.deepStrictEqual(lastBroadcast.payload.drawings.map(d => d.id), ['gd_2'], 'Broadcasted list must exclude removed drawing');
  console.log('✓ Isolated world synchronous eviction & broadcast passed');
}

// 2. Mock main world removal handlers: removeEntity hook, drawing_event, and restoreGlobalDrawings diff
{
  let currentGlobalDrawings = [
    { id: 'gd_100', symbol: 'BTC-PERP', timeframe: '5m', shape: 'rectangle', points: [{ time: 1000, price: 60000 }] },
    { id: 'gd_200', symbol: 'BTC-PERP', timeframe: '5m', shape: 'rectangle', points: [{ time: 2000, price: 61000 }] }
  ];
  const globalDrawingEntityMap = new Map();
  const lastKnownLiveShapeIds = new Set();
  const removedGlobalDrawingIds = new Set();
  const globalDrawingUpdateTimers = new Map();
  const postedMessages = [];

  function postToIsolated(msg) {
    postedMessages.push(msg);
  }

  function handleGlobalDrawingEntityRemoved(entityId) {
    if (!entityId) return;
    const strId = String(entityId);
    lastKnownLiveShapeIds.delete(entityId);
    lastKnownLiveShapeIds.delete(strId);
    if (globalDrawingUpdateTimers.has(entityId)) {
      clearTimeout(globalDrawingUpdateTimers.get(entityId));
      globalDrawingUpdateTimers.delete(entityId);
    }
    if (globalDrawingUpdateTimers.has(strId)) {
      clearTimeout(globalDrawingUpdateTimers.get(strId));
      globalDrawingUpdateTimers.delete(strId);
    }
    const key = globalDrawingEntityMap.has(entityId) ? entityId : (globalDrawingEntityMap.has(strId) ? strId : null);
    const removedGlobalId = key ? globalDrawingEntityMap.get(key) : null;
    if (removedGlobalId) {
      globalDrawingEntityMap.delete(entityId);
      globalDrawingEntityMap.delete(strId);
      removedGlobalDrawingIds.add(removedGlobalId);
      currentGlobalDrawings = currentGlobalDrawings.filter(item => item && item.id !== removedGlobalId);
      postToIsolated({ type: 'VEST_TV_GLOBAL_DRAWING_REMOVE', drawingId: removedGlobalId });
    }
  }

  // Set up mock chart
  let chartShapes = [
    { id: 'shape_100', name: 'rectangle' },
    { id: 'shape_200', name: 'rectangle' }
  ];
  let shapesCreated = [];

  const mockChart = {
    getAllShapes: () => [...chartShapes],
    getShapeById: (id) => chartShapes.find(s => s.id === id) || null,
    removeEntity: function(id) {
      handleGlobalDrawingEntityRemoved(id);
      chartShapes = chartShapes.filter(s => s.id !== id);
    },
    createShape: function(point, options) {
      const newId = `shape_created_${Date.now()}_${Math.random()}`;
      chartShapes.push({ id: newId, name: options.shape });
      shapesCreated.push(newId);
      return newId;
    }
  };

  // Map initial entities
  globalDrawingEntityMap.set('shape_100', 'gd_100');
  lastKnownLiveShapeIds.add('shape_100');
  globalDrawingEntityMap.set('shape_200', 'gd_200');
  lastKnownLiveShapeIds.add('shape_200');

  // Test A: Explicit activeChart.removeEntity call (e.g. from user Delete key / trash icon)
  mockChart.removeEntity('shape_100');

  assert.strictEqual(globalDrawingEntityMap.has('shape_100'), false, 'shape_100 must be unmapped from globalDrawingEntityMap');
  assert.strictEqual(lastKnownLiveShapeIds.has('shape_100'), false, 'shape_100 must be removed from lastKnownLiveShapeIds');
  assert.strictEqual(removedGlobalDrawingIds.has('gd_100'), true, 'gd_100 must be marked in removedGlobalDrawingIds');
  assert.strictEqual(currentGlobalDrawings.some(d => d.id === 'gd_100'), false, 'gd_100 must be removed from currentGlobalDrawings');
  assert.strictEqual(postedMessages.some(m => m.type === 'VEST_TV_GLOBAL_DRAWING_REMOVE' && m.drawingId === 'gd_100'), true, 'Must post VEST_TV_GLOBAL_DRAWING_REMOVE');

  // Test B: Verify restoreGlobalDrawings simulation does NOT re-create gd_100
  function simulateRestore(activeChart, records) {
    const liveIds = new Set(activeChart.getAllShapes().map(s => s.id));
    for (const [entityId, globalId] of Array.from(globalDrawingEntityMap.entries())) {
      if (!liveIds.has(entityId)) {
        if (lastKnownLiveShapeIds.has(entityId)) {
          handleGlobalDrawingEntityRemoved(entityId);
        } else {
          globalDrawingEntityMap.delete(entityId);
        }
      }
    }
    records.forEach(record => {
      if (removedGlobalDrawingIds.has(record.id)) return;
      const mapped = Array.from(globalDrawingEntityMap.entries()).find(([, id]) => id === record.id);
      if (mapped) return;
      activeChart.createShape({ time: record.points[0].time, price: record.points[0].price }, { shape: record.shape });
    });
  }

  shapesCreated = [];
  simulateRestore(mockChart, currentGlobalDrawings);
  assert.strictEqual(shapesCreated.length, 0, 'No shapes should be created because gd_100 is removed and gd_200 is mapped');

  // Test C: Diff reconciliation when TV deletes shape without calling removeEntity directly
  // Suppose shape_200 was deleted by TradingView internally
  chartShapes = chartShapes.filter(s => s.id !== 'shape_200');
  assert.strictEqual(mockChart.getAllShapes().length, 0, 'Chart is now empty');

  // Next tick of simulateRestore should detect that shape_200 was known live and is now gone:
  simulateRestore(mockChart, currentGlobalDrawings);
  assert.strictEqual(removedGlobalDrawingIds.has('gd_200'), true, 'gd_200 must be detected and removed via shape diff reconciliation');
  assert.strictEqual(currentGlobalDrawings.length, 0, 'currentGlobalDrawings must now be empty');
  assert.strictEqual(postedMessages.some(m => m.type === 'VEST_TV_GLOBAL_DRAWING_REMOVE' && m.drawingId === 'gd_200'), true, 'Must post VEST_TV_GLOBAL_DRAWING_REMOVE for gd_200');

  // Test D: Subsequent restore calls still do not recreate anything
  shapesCreated = [];
  simulateRestore(mockChart, currentGlobalDrawings);
  assert.strictEqual(shapesCreated.length, 0, 'Both deleted shapes must stay completely gone');

  console.log('✓ Main world removal hooks, diff reconciliation & permanent deletion passed');
}

// 3. Test toggleGlobalSyncForShape
{
  const globalDrawingEntityMap = new Map();
  const lastKnownLiveShapeIds = new Set();
  const removedGlobalDrawingIds = new Set();
  let currentGlobalDrawings = [];
  const postedMessages = [];

  function postToIsolated(msg) {
    postedMessages.push(msg);
  }

  function toggleGlobalSyncForShape(entityId) {
    const key = globalDrawingEntityMap.has(entityId) ? entityId : (globalDrawingEntityMap.has(String(entityId)) ? String(entityId) : null);
    if (key) {
      const existingId = globalDrawingEntityMap.get(key);
      globalDrawingEntityMap.delete(key);
      globalDrawingEntityMap.delete(String(key));
      lastKnownLiveShapeIds.delete(key);
      lastKnownLiveShapeIds.delete(String(key));
      if (existingId) {
        removedGlobalDrawingIds.add(existingId);
        currentGlobalDrawings = currentGlobalDrawings.filter(item => item && item.id !== existingId);
        postToIsolated({ type: 'VEST_TV_GLOBAL_DRAWING_REMOVE', drawingId: existingId });
      }
      postToIsolated({ type: 'VEST_TV_SHOW_TOAST', message: 'Removed global drawing sync' });
      return;
    }
    const drawing = { id: 'gd_toggle_1', symbol: 'BTC-PERP', timeframe: '5m', shape: 'rectangle', points: [] };
    globalDrawingEntityMap.set(entityId, drawing.id);
    lastKnownLiveShapeIds.add(entityId);
    removedGlobalDrawingIds.delete(drawing.id);
    postToIsolated({ type: 'VEST_TV_GLOBAL_DRAWING_UPSERT', drawing });
    postToIsolated({ type: 'VEST_TV_SHOW_TOAST', message: 'Syncing drawing' });
  }

  // Initial toggle on
  toggleGlobalSyncForShape('shape_abc');
  assert.strictEqual(globalDrawingEntityMap.get('shape_abc'), 'gd_toggle_1');
  assert.strictEqual(postedMessages.some(m => m.type === 'VEST_TV_GLOBAL_DRAWING_UPSERT'), true);

  // Toggle off
  toggleGlobalSyncForShape('shape_abc');
  assert.strictEqual(globalDrawingEntityMap.has('shape_abc'), false, 'Should be unmapped on toggle off');
  assert.strictEqual(removedGlobalDrawingIds.has('gd_toggle_1'), true, 'Should be marked in removedGlobalDrawingIds');
  assert.strictEqual(postedMessages.some(m => m.type === 'VEST_TV_GLOBAL_DRAWING_REMOVE' && m.drawingId === 'gd_toggle_1'), true, 'Should dispatch remove');

  console.log('✓ toggleGlobalSyncForShape un-syncing passed without focus blockage');
}

console.log('All Global Drawings Removal tests passed successfully!');
