import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFontScale, combinedFontScale, FONT_SCALE_OPTIONS } from './font-scale';

test('default 1 when missing / invalid', () => {
  assert.equal(readFontScale(undefined), 1);
  assert.equal(readFontScale(null), 1);
  assert.equal(readFontScale({}), 1);
  assert.equal(readFontScale({ fontScale: 'abc' }), 1);
  assert.equal(readFontScale({ fontScale: 1.3 }), 1);
  assert.equal(readFontScale({ fontScale: 0 }), 1);
  assert.equal(readFontScale({ fontScale: -2 }), 1);
  assert.equal(readFontScale({ fontScale: '' }), 1);
});

test('accepts every allowed option, number or numeric string', () => {
  for (const o of FONT_SCALE_OPTIONS) {
    assert.equal(readFontScale({ fontScale: o.value }), o.value);
    assert.equal(readFontScale({ fontScale: String(o.value) }), o.value);
  }
});

test('options are the agreed set', () => {
  assert.deepEqual(FONT_SCALE_OPTIONS.map(o => o.value), [0.85, 1, 1.25, 1.5, 1.75, 2]);
});

test('combined scale', () => {
  assert.equal(combinedFontScale(1, 1), 1);
  assert.equal(combinedFontScale(0.5, 2), 1);
  assert.equal(combinedFontScale(2, 1.25), 2.5);
  assert.equal(combinedFontScale(0.6667, 1.5), 1);
  assert.equal(combinedFontScale(NaN, 1.5), 1.5);
});
