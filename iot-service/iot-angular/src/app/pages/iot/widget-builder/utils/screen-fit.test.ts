import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readScreenConfig, fitBox, rowHeight, fontScale, overflowIds } from './screen-fit';

test('default auto', () =>
  assert.deepEqual(readScreenConfig(undefined), { preset: 'auto', width: 1920, height: 1080, rows: 12 }));

test('tv preset forced 1920x1080', () =>
  assert.deepEqual(
    readScreenConfig({ screen: { preset: 'tv-16-9', width: 5, height: 5, rows: 10 } }),
    { preset: 'tv-16-9', width: 1920, height: 1080, rows: 10 },
  ));

test('valid custom kept', () =>
  assert.deepEqual(
    readScreenConfig({ screen: { preset: 'custom', width: 3840, height: 1080, rows: 8 } }),
    { preset: 'custom', width: 3840, height: 1080, rows: 8 },
  ));

test('bad custom falls back to auto', () =>
  assert.equal(readScreenConfig({ screen: { preset: 'custom', width: 0, height: 900 } }).preset, 'auto'));

test('unknown preset falls back to auto', () =>
  assert.equal(readScreenConfig({ screen: { preset: 'tv-4k' } }).preset, 'auto'));

test('rows clamped', () => {
  assert.equal(readScreenConfig({ screen: { preset: 'tv-16-9', rows: 200 } }).rows, 48);
  assert.equal(readScreenConfig({ screen: { preset: 'tv-16-9', rows: 1 } }).rows, 4);
});

test('fit wide area letterboxes width', () => assert.deepEqual(fitBox(2000, 1080, 16, 9), { width: 1920, height: 1080 }));
test('fit laptop', () => assert.deepEqual(fitBox(1366, 700, 16, 9), { width: 1244, height: 700 }));
test('4K css viewport', () => assert.deepEqual(fitBox(3840, 2160, 16, 9), { width: 3840, height: 2160 }));
test('portrait', () => assert.deepEqual(fitBox(800, 1200, 16, 9), { width: 800, height: 450 }));
test('zero area', () => assert.deepEqual(fitBox(0, 0, 16, 9), { width: 0, height: 0 }));

test('row height', () => assert.equal(rowHeight(1080, 12, 4), 85));
test('row height floor', () => assert.equal(rowHeight(50, 12, 4), 8));

test('font scale 4K', () => assert.equal(fontScale(3840, 1920), 2));
test('font scale laptop', () => assert.equal(fontScale(1244, 1920), 0.648));

test('overflow', () =>
  assert.deepEqual(overflowIds([{ id: 'a', y: 0, rows: 4 }, { id: 'b', y: 10, rows: 4 }, { id: 'c', y: 8, rows: 4 }], 12), ['b']));
