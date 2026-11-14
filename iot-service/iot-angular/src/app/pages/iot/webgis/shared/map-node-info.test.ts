import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countBuckets, directionsUrl, fillHeight, freshnessBucket, latestTime, metricRank, nodeShareText,
  sortSheetChannels, whatsappShareUrl, metricTitle, prettyUnit, metricDecimals, isConstantMetric,
} from './map-node-info';

test('metricDecimals / isConstantMetric', () => {
  assert.equal(metricDecimals('volume'), 0);
  assert.equal(metricDecimals('totalizer'), 0);
  assert.equal(metricDecimals('diameter'), 0);
  assert.equal(metricDecimals('pressure'), 2);
  assert.equal(metricDecimals('flow_rate'), 2);
  assert.equal(isConstantMetric('diameter'), true);
  assert.equal(isConstantMetric('pressure'), false);
});

test('prettyUnit', () => {
  assert.equal(prettyUnit('l/s'), 'L/s');
  assert.equal(prettyUnit('m3'), 'm³');
  assert.equal(prettyUnit('M3/h'), 'm³/jam');
  assert.equal(prettyUnit('bar'), 'bar');
  assert.equal(prettyUnit('mm'), 'mm');
  assert.equal(prettyUnit(null), '');
});

test('metricTitle', () => {
  assert.equal(metricTitle('flow_rate'), 'Flow Rate');
  assert.equal(metricTitle('pressure'), 'Pressure');
  assert.equal(metricTitle(null), '');
});

test('freshnessBucket: fresh/stale/offline/nodata', () => {
  assert.equal(freshnessBucket('fresh'), 'online');
  assert.equal(freshnessBucket('stale'), 'terganggu');
  assert.equal(freshnessBucket('offline'), 'offline');
  assert.equal(freshnessBucket('nodata'), 'offline');
});

test('countBuckets', () => {
  assert.deepEqual(countBuckets(['online', 'offline', 'online', 'terganggu']),
    { all: 4, online: 2, terganggu: 1, offline: 1 });
  assert.deepEqual(countBuckets([]), { all: 0, online: 0, terganggu: 0, offline: 0 });
});

test('latestTime picks the newest valid time', () => {
  assert.equal(latestTime(null, '2026-11-14T01:00:00Z', 'bad', '2026-11-14T02:00:00Z', undefined),
    '2026-11-14T02:00:00.000Z');
  assert.equal(latestTime(null, undefined, ''), null);
});

test('sortSheetChannels: alarm first, then pressure, flow, …, diameter last', () => {
  const rows = [
    { metricCode: 'diameter', status: 'normal' },
    { metricCode: 'velocity', status: 'normal' },
    { metricCode: 'flow_rate', status: 'normal' },
    { metricCode: 'pressure', status: 'normal' },
    { metricCode: 'battery', status: 'critical' },
    { metricCode: 'temp', status: 'unknown' },
  ];
  assert.deepEqual(sortSheetChannels(rows).map((r) => r.metricCode),
    ['battery', 'pressure', 'flow_rate', 'velocity', 'diameter', 'temp']);
  assert.ok(metricRank('Tekanan') < metricRank('debit'));
});

test('links and share text', () => {
  assert.equal(directionsUrl(-1.5, 102.25), 'https://www.google.com/maps/dir/?api=1&destination=-1.500000,102.250000');
  const t = nodeShareText('Jl. Sudirman', 'HELIO-1', -1.5, 102.25);
  assert.match(t, /^Jl\. Sudirman \(HELIO-1\)\nKoordinat: -1\.500000,102\.250000\n/);
  assert.equal(nodeShareText('HELIO-1', 'HELIO-1', 0, 0).split('\n')[0], 'HELIO-1');
  assert.equal(whatsappShareUrl('a b&c'), 'https://wa.me/?text=a%20b%26c');
});

test('fillHeight respects the minimum', () => {
  assert.equal(fillHeight(844, 150, 76), 618);
  assert.equal(fillHeight(390, 150, 76), 280);
});
