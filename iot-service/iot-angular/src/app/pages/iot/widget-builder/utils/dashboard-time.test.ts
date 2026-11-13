import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollRange, normalizeRefresh, defaultPresetFrom, findPreset, isRelativeExpr, isStale } from './dashboard-time';

const NOW = 1_700_000_000_000;

test('relative preset rolls to now', () => {
  assert.deepEqual(rollRange('6h', NOW, { from: 0, to: 1 }), { from: NOW - 6 * 3600_000, to: NOW });
});

test('custom range never moves', () => {
  assert.deepEqual(rollRange('custom', NOW, { from: 10, to: 20 }), { from: 10, to: 20 });
});

test('unknown preset keeps current', () => {
  assert.deepEqual(rollRange('abc', NOW, { from: 1, to: 2 }), { from: 1, to: 2 });
});

test('refresh only allowed values', () => {
  assert.equal(normalizeRefresh(60), 60);
  assert.equal(normalizeRefresh(7), 0);
  assert.equal(normalizeRefresh('x'), 0);
});

test('default preset from dashboard time_range', () => {
  assert.equal(defaultPresetFrom('6h'), '6h');
  assert.equal(defaultPresetFrom(''), '24h');
  assert.equal(defaultPresetFrom(null), '24h');
});

test('findPreset', () => {
  assert.equal(findPreset('24h')?.duration, 86_400_000);
  assert.equal(findPreset('zz'), null);
});

test('relative expressions', () => {
  assert.equal(isRelativeExpr('now'), true);
  assert.equal(isRelativeExpr('now-6h'), true);
  assert.equal(isRelativeExpr('now-30d'), true);
  assert.equal(isRelativeExpr('2026-11-13 00:00:00'), false);
  assert.equal(isRelativeExpr('now-6x'), false);
});

test('isStale only with refresh on', () => {
  assert.equal(isStale(NOW - 130_000, NOW, 60), false); // 2m10s < max(2×60s, 3 min)
  assert.equal(isStale(NOW - 200_000, NOW, 60), true);
  assert.equal(isStale(NOW - 999_999, NOW, 0), false); // refresh off → never "tertunda"
  assert.equal(isStale(null, NOW, 60), false);
});
