import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatIdNumber, formatHm, formatHms, badgeColorStyle } from './format-id';

test('formatIdNumber uses comma decimal + dot thousands', () => {
  assert.equal(formatIdNumber(1234.5), '1.234,50');
  assert.equal(formatIdNumber(-0.72, 2), '-0,72');
  assert.equal(formatIdNumber(-0.001, 2), '0,00');
  assert.equal(formatIdNumber(NaN), '—');
});

test('formatHm / formatHms use colons', () => {
  const d = new Date(2026, 10, 13, 9, 5, 7);
  assert.equal(formatHm(d), '09:05');
  assert.equal(formatHms(d), '09:05:07');
  assert.equal(formatHm(new Date(NaN)), '');
});

test('badgeColorStyle: literal colours → inline style, names → null', () => {
  assert.equal(badgeColorStyle('danger'), null);
  assert.equal(badgeColorStyle(''), null);
  assert.equal(badgeColorStyle(undefined), null);
  assert.deepEqual(badgeColorStyle('#ef4444'), { background: '#ef4444', color: '#fff' });
  assert.deepEqual(badgeColorStyle('#f59e0b'), { background: '#f59e0b', color: '#111' });
  assert.deepEqual(badgeColorStyle('#fff'), { background: '#fff', color: '#111' });
  assert.deepEqual(badgeColorStyle('rgb(0, 0, 0)'), { background: 'rgb(0, 0, 0)', color: '#fff' });
  assert.equal(badgeColorStyle('hsl(0 80% 50%)')?.color, '#fff');
});
