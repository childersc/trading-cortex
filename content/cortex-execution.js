(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TradingCortexExecution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeConfig(raw) {
    const cfg = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: cfg.executionEnabled === true,
      mode: cfg.executionMode === 'live' ? 'live' : 'paper',
      liveArmed: cfg.liveArmed === true,
      reversalIgnoreBars: Math.max(0, Math.min(100, Math.round(Number.isFinite(Number(cfg.reversalIgnoreBars)) ? Number(cfg.reversalIgnoreBars) : 5))),
      stopLossPoints: Math.max(0.01, Number(cfg.stopLossPoints) || 8),
      targetSpacingPoints: Math.max(0.01, Number(cfg.targetSpacingPoints) || 4),
      targetClosePercent: 25
    };
  }

  function createState(key) {
    return { key, lastSignalId: '', position: null, pendingReverse: null, trades: [], stats: { entries: 0, tp1: 0, tp2: 0, tp3: 0, stopsBeforeProfit: 0 }, status: 'waiting' };
  }

  function calculateManualLevels(side, entryPrice, rawConfig) {
    const entry = Number(entryPrice);
    if (!['long', 'short'].includes(side) || !Number.isFinite(entry)) return null;
    const config = normalizeConfig(rawConfig);
    const direction = side === 'long' ? 1 : -1;
    return {
      stopPrice: entry - direction * config.stopLossPoints,
      targetPrices: [1, 2, 3].map(level => entry + direction * config.targetSpacingPoints * level)
    };
  }

  function ensureStats(state) {
    if (!state.stats || typeof state.stats !== 'object') state.stats = { entries: 0, tp1: 0, tp2: 0, tp3: 0, stopsBeforeProfit: 0 };
    for (const key of ['entries', 'tp1', 'tp2', 'tp3', 'stopsBeforeProfit']) {
      state.stats[key] = Math.max(0, Math.floor(Number(state.stats[key]) || 0));
    }
    return state.stats;
  }

  function makePosition(signal, config, size) {
    const sideSign = signal.side === 'long' ? 1 : -1;
    const entry = Number(signal.entryPrice);
    const stopDistance = Math.max(0.01, Number(config.stopLossPoints) || 8);
    const targetSpacing = Math.max(0.01, Number(config.targetSpacingPoints) || 4);
    const configuredStop = Number(signal.stopPrice);
    const targets = Array.isArray(signal.targetPrices) ? signal.targetPrices : [];
    return {
      side: signal.side,
      symbol: signal.symbol,
      resolution: signal.resolution,
      entryPrice: entry,
      entryBarIndex: Number(signal.barIndex),
      entryTimeSec: Number(signal.timeSec),
      barsSinceEntry: 0,
      lastBarTimeSec: Number(signal.timeSec),
      initialSize: size,
      remainingPercent: 100,
      stopPrice: Number.isFinite(configuredStop) ? configuredStop : entry - sideSign * stopDistance,
      targets: [1, 2, 3].map(level => ({
        level,
        price: Number.isFinite(Number(targets[level - 1])) ? Number(targets[level - 1]) : entry + sideSign * targetSpacing * level,
        closePercent: 25,
        filled: false
      }))
    };
  }

  function processSignal(state, signal, config, size) {
    const next = JSON.parse(JSON.stringify(state || createState('')));
    const stats = ensureStats(next);
    if (!signal || !['long', 'short'].includes(signal.side) || !Number.isFinite(Number(signal.entryPrice))) {
      return { state: next, actions: [] };
    }
    if (next.pendingReverse) return { state: next, actions: [{ type: 'wait-for-flat' }] };
    if (signal.signalId && signal.signalId === next.lastSignalId) return { state: next, actions: [] };
    next.lastSignalId = signal.signalId || `${signal.symbol}:${signal.resolution}:${signal.timeSec}:${signal.side}`;
    if (!next.position) {
      const lastEntry = next.lastEntry;
      const ignoreBarsWhenFlat = Math.max(0, Number(config.reversalIgnoreBars) || 0);
      if (lastEntry && lastEntry.symbol === signal.symbol && lastEntry.resolution === signal.resolution && lastEntry.side !== signal.side && Number(lastEntry.barsSinceEntry) <= ignoreBarsWhenFlat) {
        next.status = `opposite signal ignored (${Math.max(0, Number(lastEntry.barsSinceEntry) || 0)} of ${ignoreBarsWhenFlat} bars)`;
        return { state: next, actions: [{ type: 'ignore-reversal', barsSinceEntry: Number(lastEntry.barsSinceEntry) || 0, ignoreBars: ignoreBarsWhenFlat }] };
      }
      next.position = makePosition(signal, config, size);
      stats.entries += 1;
      next.lastEntry = { side: signal.side, symbol: signal.symbol, resolution: signal.resolution, timeSec: Number(signal.timeSec), barsSinceEntry: 0, lastBarTimeSec: Number(signal.timeSec) };
      next.status = 'open';
      return { state: next, actions: [{ type: 'enter', side: signal.side, position: next.position }] };
    }
    if (next.position.symbol !== signal.symbol || next.position.resolution !== signal.resolution) {
      next.status = 'signal ignored (position is managed from its entry chart)';
      return { state: next, actions: [{ type: 'ignore-context', positionSymbol: next.position.symbol, positionResolution: next.position.resolution }] };
    }
    if (next.position.side === signal.side) return { state: next, actions: [] };

    const barsSinceEntry = Number.isFinite(Number(next.position.barsSinceEntry))
      ? Number(next.position.barsSinceEntry)
      : Number(signal.barIndex) - Number(next.position.entryBarIndex);
    const ignoreBars = Math.max(0, Number(config.reversalIgnoreBars) || 0);
    if (!Number.isFinite(barsSinceEntry) || barsSinceEntry <= ignoreBars) {
      next.status = `opposite signal ignored (${Math.max(0, barsSinceEntry)} of ${ignoreBars} bars)`;
      return { state: next, actions: [{ type: 'ignore-reversal', barsSinceEntry, ignoreBars }] };
    }

    const closed = next.position;
    next.trades.push({ side: closed.side, entryPrice: closed.entryPrice, exitPrice: Number(signal.entryPrice), exitReason: 'reversal', timeSec: Number(signal.timeSec) });
    next.position = null;
    next.pendingReverse = { signal: JSON.parse(JSON.stringify(signal)), size: size || null };
    next.status = 'flattening-before-reversal';
    return {
      state: next,
      actions: [{ type: 'flatten', side: closed.side, reason: 'confirmed-opposing-signal', waitForFlat: true, nextSide: signal.side }]
    };
  }

  function completeReversalAfterFlat(state, config) {
    const next = JSON.parse(JSON.stringify(state || createState('')));
    if (!next.pendingReverse || next.position) return { state: next, actions: [] };
    const pending = next.pendingReverse;
    next.position = makePosition(pending.signal, config, pending.size);
    ensureStats(next).entries += 1;
    next.lastEntry = { side: pending.signal.side, symbol: pending.signal.symbol, resolution: pending.signal.resolution, timeSec: Number(pending.signal.timeSec), barsSinceEntry: 0, lastBarTimeSec: Number(pending.signal.timeSec) };
    next.pendingReverse = null;
    next.status = 'open';
    return { state: next, actions: [{ type: 'enter-after-flat', side: next.position.side, position: next.position }] };
  }

  // Paper fills are intentionally conservative: if one candle touches both the
  // active stop and a target, the stop wins because OHLC data cannot reveal order.
  function processBar(state, bar) {
    const next = JSON.parse(JSON.stringify(state || createState('')));
    const stats = ensureStats(next);
    const p = next.position;
    if (!bar || ![bar.high, bar.low, bar.close].every(value => Number.isFinite(Number(value)))) {
      return { state: next, actions: [] };
    }
    if (!p) {
      const lastEntry = next.lastEntry;
      if (lastEntry && lastEntry.symbol === bar.symbol && lastEntry.resolution === bar.resolution && Number(bar.timeSec) > Number(lastEntry.lastBarTimeSec ?? lastEntry.timeSec)) {
        lastEntry.barsSinceEntry = (Number(lastEntry.barsSinceEntry) || 0) + 1;
        lastEntry.lastBarTimeSec = Number(bar.timeSec);
      }
      return { state: next, actions: [] };
    }
    if (Number(bar.timeSec) > Number(p.lastBarTimeSec ?? p.entryTimeSec)) {
      if (Number(bar.timeSec) > Number(p.entryTimeSec)) p.barsSinceEntry = (Number(p.barsSinceEntry) || 0) + 1;
      p.lastBarTimeSec = Number(bar.timeSec);
    }
    next.lastEntry = { side: p.side, symbol: p.symbol, resolution: p.resolution, timeSec: Number(p.entryTimeSec), barsSinceEntry: Number(p.barsSinceEntry) || 0, lastBarTimeSec: Number(p.lastBarTimeSec) };
    const high = Number(bar.high), low = Number(bar.low);
    const stopHit = p.side === 'long' ? low <= p.stopPrice : high >= p.stopPrice;
    const availableTargets = p.targets.filter(target => !target.filled);
    const targetHit = availableTargets.find(target => p.side === 'long' ? high >= target.price : low <= target.price);
    if (stopHit) {
      if (!p.targets.some(target => target.filled)) stats.stopsBeforeProfit += 1;
      next.trades.push({ side: p.side, entryPrice: p.entryPrice, exitPrice: p.stopPrice, exitReason: 'stop', remainingPercent: p.remainingPercent, timeSec: Number(bar.timeSec) });
      next.position = null;
      next.status = 'stopped';
      return { state: next, actions: [{ type: 'paper-stop', price: p.stopPrice, closePercent: p.remainingPercent }] };
    }
    if (!targetHit) return { state: next, actions: [] };

    targetHit.filled = true;
    stats[`tp${targetHit.level}`] += 1;
    p.remainingPercent = Math.max(0, p.remainingPercent - targetHit.closePercent);
    const sideSign = p.side === 'long' ? 1 : -1;
    p.stopPrice = targetHit.level === 1 ? p.entryPrice : p.targets[targetHit.level - 2].price;
    const action = { type: 'paper-target', level: targetHit.level, price: targetHit.price, closePercent: targetHit.closePercent, remainingPercent: p.remainingPercent, newStopPrice: p.stopPrice };
    if (p.remainingPercent <= 0) {
      next.trades.push({ side: p.side, entryPrice: p.entryPrice, exitPrice: targetHit.price, exitReason: 'targets-complete', timeSec: Number(bar.timeSec) });
      next.position = null;
      next.status = 'targets-complete';
    }
    return { state: next, actions: [action] };
  }

  return { normalizeConfig, createState, calculateManualLevels, processSignal, completeReversalAfterFlat, processBar, ensureStats };
});
