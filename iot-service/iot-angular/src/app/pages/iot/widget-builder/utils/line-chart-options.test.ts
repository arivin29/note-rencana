import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLineChartOptions, formatAxisTick, insertGapBreaks, isTimeSeries, parseTimeValue, yAxisSplitNumber,
} from './line-chart-options';

const T0 = Date.UTC(2026, 10, 13, 0, 0, 0);
const min = (m: number) => new Date(T0 + m * 60_000).toISOString();

test('parseTimeValue: ISO, ClickHouse text (UTC), epoch ms; rejects plain numbers/labels', () => {
  assert.equal(parseTimeValue('2026-11-13 00:00:00'), T0);
  assert.equal(parseTimeValue('2026-11-13T00:00:00Z'), T0);
  assert.equal(parseTimeValue(T0), T0);
  assert.ok(Number.isNaN(parseTimeValue(12)));
  assert.ok(Number.isNaN(parseTimeValue('Debit')));
  assert.ok(Number.isNaN(parseTimeValue(null)));
});

test('isTimeSeries needs every non-empty value to be a timestamp', () => {
  assert.equal(isTimeSeries([min(0), min(5), null]), true);
  assert.equal(isTimeSeries([min(0), 'Zona A']), false);
  assert.equal(isTimeSeries([]), false);
});

test('yAxisSplitNumber shrinks with plot height, clamped 2..5', () => {
  assert.equal(yAxisSplitNumber(85, 20), 2);
  assert.equal(yAxisSplitNumber(400, 12), 5);
  assert.equal(yAxisSplitNumber(80, 12), 3);
  assert.equal(yAxisSplitNumber(0, 12), 5); // unknown height → ECharts default
});

test('formatAxisTick drops needless decimals', () => {
  assert.equal(formatAxisTick(120, 2), '120');
  assert.equal(formatAxisTick(0, 2), '0');
  assert.equal(formatAxisTick(0.5, 2), '0,5');
  assert.equal(formatAxisTick(0.25, 2), '0,25');
  assert.equal(formatAxisTick(1500, 2), '1.500');
  assert.equal(formatAxisTick(0.125, 2), '0,13');
});

test('insertGapBreaks puts a null inside holes ≫ the usual step', () => {
  const pts: [number, number | null][] = [0, 5, 10, 15, 320, 325].map(m => [T0 + m * 60_000, 1]);
  const out = insertGapBreaks(pts);
  assert.equal(out.length, 7);
  assert.equal(out[4][1], null);
  assert.ok(out[4][0] > pts[3][0] && out[4][0] < pts[4][0]);
  // regular data untouched
  assert.equal(insertGapBreaks(pts.slice(0, 4)).length, 4);
});

test('timestamps → time axis with [ms, value] points, sorted, gap break, thresholds kept', () => {
  const rows = [min(320), min(0), min(5), min(10), min(325)].map((t, i) => ({ time: t, value: i + 1 }));
  const o = buildLineChartOptions(
    { mapping: { xField: 'time', yField: 'value' }, thresholds: [{ value: 3, label: 'Batas' }] },
    rows, { width: 600, height: 150 });
  assert.equal(o.xAxis.type, 'time');
  const data = o.series[0].data;
  assert.equal(data[0][0], T0);
  assert.equal(data.some((p: any) => p[1] === null), true);
  assert.equal(o.series[0].connectNulls, false);
  assert.equal(o.series[0].markLine.data[0].yAxis, 3);
  assert.equal(o.xAxis.axisLabel.formatter(T0 + 9 * 3_600_000 + 20 * 60_000).includes(':'), true);
  assert.ok(o.yAxis.splitNumber <= 3);
});

test('yFields [] falls back to yField; missing values are null, not 0', () => {
  const o = buildLineChartOptions(
    { mapping: { xField: 'time', yField: 'v', yFields: [] } },
    [{ time: min(0), v: 1 }, { time: min(5), v: null }]);
  assert.equal(o.series.length, 1);
  assert.deepEqual(o.series[0].data.map((p: any) => p[1]), [1, null]);
});

test('seriesField on time axis → one series per name with its own points', () => {
  const rows = [
    { time: min(0), metric: 'A', value: 1 }, { time: min(0), metric: 'B', value: 2 },
    { time: min(5), metric: 'A', value: 3 },
  ];
  const o = buildLineChartOptions({ mapping: { xField: 'time', yField: 'value', seriesField: 'metric' } }, rows);
  assert.deepEqual(o.series.map((s: any) => s.name), ['A', 'B']);
  assert.equal(o.series[0].data.length, 2);
  assert.equal(o.series[1].data.length, 1);
});

test('non-time x → category axis (multi yFields)', () => {
  const o = buildLineChartOptions(
    { mapping: { xField: 'zona', yFields: ['a', 'b'] } },
    [{ zona: 'Z1', a: 1, b: 2 }, { zona: 'Z2', a: 3, b: 4 }]);
  assert.equal(o.xAxis.type, 'category');
  assert.deepEqual(o.xAxis.data, ['Z1', 'Z2']);
  assert.deepEqual(o.series[1].data, [2, 4]);
});

test('grid/axis geometry scales with fontScale', () => {
  const rows = [{ time: min(0), value: 1 }, { time: min(5), value: 2 }];
  const o = buildLineChartOptions({ mapping: { xField: 'time' } }, rows, { fontScale: 2 });
  assert.equal(o.grid.containLabel, true);
  assert.equal(o.grid.bottom, 12);
  assert.equal(o.yAxis.axisLabel.fontSize, 28.8);
});

test('empty data → null', () => {
  assert.equal(buildLineChartOptions({ mapping: {} }, []), null);
});
