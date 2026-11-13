import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMapRows, mapPointText, formatMapValue, readMapOptions, toNumber, DEFAULT_MAP_OPTIONS,
  mapDrawsSql, mapDrawsWebgis, mapDrawsSupportLayers,
} from './map-rows';
import { formatIdNumber } from './format-id';

test('maps columns by name, case-insensitive, with aliases', () => {
  const pts = normalizeMapRows([
    { Latitude: '-0.45', LNG: 117.1, label: 'Bungkal', value: '1.823', unit: 'bar', status: 'NORMAL', time: '2026-11-13T01:00:00Z' },
    { status: 'high', unit: 'bar', value: 4, longitude: '117,2', lat: -0.5, label: 'Mangun Jaya' },
  ]);
  assert.equal(pts.length, 2);
  assert.deepEqual({ ...pts[0], time: pts[0].time?.toISOString() }, {
    lat: -0.45, lon: 117.1, label: 'Bungkal', value: 1.823, unit: 'bar', status: 'normal', time: '2026-11-13T01:00:00.000Z',
  });
  assert.equal(pts[1].lon, 117.2);
  assert.equal(pts[1].status, 'high');
  assert.equal(pts[1].time, null);
});

test('drops rows without valid coordinates', () => {
  const pts = normalizeMapRows([
    { lat: null, lon: 117 },
    { lat: 'abc', lon: 117 },
    { lat: 0, lon: 0 },
    { lat: 95, lon: 117 },
    { lat: -1, lon: 200 },
    { lon: 117 },
    null,
    'x',
    { lat: -1, lon: 117 },
  ]);
  assert.equal(pts.length, 1);
  assert.equal(normalizeMapRows(undefined).length, 0);
});

test('status fallback & variants', () => {
  const [a, b, c, d] = normalizeMapRows([
    { lat: 1, lon: 1, value: 2 },
    { lat: 1, lon: 1 },
    { lat: 1, lon: 1, value: 2, status: 'no_threshold' },
    { lat: 1, lon: 1, status: 'no-data' },
  ]);
  assert.equal(a.status, 'nothreshold');
  assert.equal(b.status, 'nodata');
  assert.equal(b.value, null);
  assert.equal(c.status, 'nothreshold');
  assert.equal(d.status, 'nodata');
});

test('label text by mode with Indonesian decimals', () => {
  const [p] = normalizeMapRows([{ lat: 1, lon: 1, label: 'Bungkal', value: 1.8234, unit: 'bar' }]);
  assert.equal(mapPointText(p, 'label-value'), 'Bungkal · 1,82 bar');
  assert.equal(mapPointText(p, 'value'), '1,82 bar');
  assert.equal(mapPointText(p, 'label'), 'Bungkal');
  const [n] = normalizeMapRows([{ lat: 1, lon: 1, label: 'Loa Ipuh' }]);
  assert.equal(mapPointText(n, 'label-value'), 'Loa Ipuh');
  assert.equal(mapPointText(n, 'value'), 'Tidak ada data');
  assert.equal(formatMapValue({ value: 1234.5, unit: '' }), '1.234,50');
});

test('formatIdNumber', () => {
  assert.equal(formatIdNumber(-0.72, 2), '-0,72');
  assert.equal(formatIdNumber(-0.001, 2), '0,00');
  assert.equal(formatIdNumber(1234567.891, 1), '1.234.567,9');
  assert.equal(formatIdNumber(5, 0), '5');
  assert.equal(formatIdNumber(NaN, 2), '—');
});

test('toNumber', () => {
  assert.equal(toNumber(' 3.5 '), 3.5);
  assert.equal(toNumber('3,5'), 3.5);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber(Infinity), null);
  assert.equal(toNumber(true), null);
});

test('readMapOptions defaults & validation', () => {
  assert.deepEqual(readMapOptions(undefined), DEFAULT_MAP_OPTIONS);
  assert.deepEqual(readMapOptions({ basemap: 'dark', labelMode: 'value', interactive: true, showLabels: 'no' }), {
    ...DEFAULT_MAP_OPTIONS, basemap: 'dark', labelMode: 'value', interactive: true,
  });
  assert.equal(readMapOptions({ basemap: 'satellite' }).basemap, 'auto');
});

test('map source: legacy configs (no source) draw WebGIS layers', () => {
  assert.equal(readMapOptions({ showLabels: true }).source, 'webgis');
  assert.equal(readMapOptions({ source: 'sql' }).source, 'sql');
  assert.equal(readMapOptions({ source: 'both' }).source, 'both');
  assert.equal(readMapOptions({ source: 'geojson' }).source, 'webgis');
});

test('map source decides which layers are drawn', () => {
  const o = (source: any, showProjectLayers = false) => ({ source, showProjectLayers });
  assert.deepEqual([mapDrawsWebgis(o('webgis')), mapDrawsSql(o('webgis')), mapDrawsSupportLayers(o('webgis'))], [true, false, true]);
  assert.deepEqual([mapDrawsWebgis(o('both')), mapDrawsSql(o('both')), mapDrawsSupportLayers(o('both'))], [true, true, true]);
  assert.deepEqual([mapDrawsWebgis(o('sql')), mapDrawsSql(o('sql')), mapDrawsSupportLayers(o('sql'))], [false, true, false]);
  assert.equal(mapDrawsSupportLayers(o('sql', true)), true);
});
