import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleChartFonts } from './chart-scale';

test('scale 1 returns same reference', () => {
  const o = { textStyle: { fontSize: 10 } };
  assert.equal(scaleChartFonts(o, 1), o);
});

test('scales nested fontSize / lineHeight / symbolSize and lineStyle.width', () => {
  const o = {
    xAxis: { axisLabel: { fontSize: 10, lineHeight: 12 } },
    series: [{ symbolSize: 6, lineStyle: { width: 2 }, detail: { fontSize: 24 } }],
    color: ['#fff'],
    grid: { left: 40 },
  };
  assert.deepEqual(scaleChartFonts(o, 2), {
    xAxis: { axisLabel: { fontSize: 20, lineHeight: 24 } },
    series: [{ symbolSize: 12, lineStyle: { width: 4 }, detail: { fontSize: 48 } }],
    color: ['#fff'],
    grid: { left: 40 },
  });
});

test('does not mutate input', () => {
  const o = { a: { fontSize: 10 } };
  scaleChartFonts(o, 2);
  assert.equal(o.a.fontSize, 10);
});

test('keeps functions and non-numeric values', () => {
  const fn = () => 'x';
  const out: any = scaleChartFonts({ tooltip: { formatter: fn }, label: { fontSize: '12px' } }, 2);
  assert.equal(out.tooltip.formatter, fn);
  assert.equal(out.label.fontSize, '12px');
});

test('rounds to 1 decimal', () => {
  assert.deepEqual(scaleChartFonts({ fontSize: 11 }, 0.648), { fontSize: 7.1 });
});
