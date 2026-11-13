import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgba, resolveWebgisLayerStyle, webgisLayerColor, webgisSensorTypeLayerStyle, webgisSupportLayers,
  filterSensorDataByTypes, sortByDisplayOrder, webgisCoreLayerDefs, unwrapData, WEBGIS_SENSOR_TYPE_COLORS,
} from './webgis-layer-config';

test('hexToRgba', () => {
  assert.equal(hexToRgba('#ff8000', 0.5), 'rgba(255, 128, 0, 0.5)');
});

test('resolveWebgisLayerStyle: LayerStyle format gets WebGIS defaults', () => {
  const r = resolveWebgisLayerStyle({ strokeColor: '#00ff00', strokeWidth: 0 });
  assert.equal(r.kind, 'layer');
  if (r.kind !== 'layer') return;
  assert.equal(r.style.fillColor, '#6366f1');
  assert.equal(r.style.fillOpacity, 0.3);
  assert.equal(r.style.strokeColor, '#00ff00');
  assert.equal(r.style.strokeWidth, 0); // ?? keeps explicit 0
  assert.equal(r.style.pointRadius, 6);
  assert.equal(r.style.labelSize, 12);
  assert.equal(r.style.labelMinZoom, 12);
  assert.equal(r.style.maxZoom, 20);
  assert.deepEqual(r.style.labelFields, []);
});

test('resolveWebgisLayerStyle: nested legacy styleJson is unwrapped', () => {
  const r = resolveWebgisLayerStyle({ styleJson: { fillColor: '#111111', colorByField: { enabled: true } } });
  assert.equal(r.kind, 'layer');
  if (r.kind === 'layer') {
    assert.equal(r.style.fillColor, '#111111');
    assert.deepEqual(r.style.colorByField, { enabled: true });
  }
});

test('resolveWebgisLayerStyle: simple config & empty style', () => {
  assert.deepEqual(resolveWebgisLayerStyle({ fill: '#dc3545', radius: 12 }), { kind: 'config', config: { fill: '#dc3545', radius: 12 } });
  assert.deepEqual(resolveWebgisLayerStyle(null), { kind: 'config', config: {} });
});

test('sensor type colours cycle by index', () => {
  assert.deepEqual(webgisSensorTypeLayerStyle(0), { fill: '#0d6efd', stroke: '#ffffff', radius: 7 });
  assert.equal(webgisSensorTypeLayerStyle(WEBGIS_SENSOR_TYPE_COLORS.length + 1).fill, WEBGIS_SENSOR_TYPE_COLORS[1]);
});

test('webgisLayerColor priority and defaults', () => {
  assert.equal(webgisLayerColor({ fillColor: '#a', strokeColor: '#b' }, 'operational'), '#a');
  assert.equal(webgisLayerColor({ stroke: '#c' }, 'operational'), '#c');
  assert.equal(webgisLayerColor({}, 'custom'), '#f59e0b');
  assert.equal(webgisLayerColor(undefined, 'x'), '#6366f1');
});

test('core layer defs: copies, nodes hidden by default', () => {
  const a = webgisCoreLayerDefs();
  a[0].style.fill = '#000';
  assert.notEqual(webgisCoreLayerDefs()[0].style.fill, '#000');
  assert.equal(a.find((d) => d.code === 'nodes')?.visible, false);
  assert.equal(a.find((d) => d.code === 'alerts')?.visible, true);
});

test('webgisSupportLayers: drops core, operational first, by display order, ignores visibility default', () => {
  const rows = [
    { idLayer: 'c1', layerName: 'Custom', layerType: 'custom', displayOrder: 0 },
    { idLayer: 'k', layerName: 'Core', layerType: 'core', displayOrder: 0 },
    { idLayer: 'o2', layerName: 'Pipa', layerType: 'operational', displayOrder: 5, isVisibleDefault: false },
    { idLayer: 'o1', layerName: 'DMA', layerType: 'operational', displayOrder: 1 },
    { idLayer: 'o3', layerName: 'Tanpa urutan', layerType: 'operational' },
  ];
  assert.deepEqual(webgisSupportLayers(rows).map((l) => l.idLayer), ['o1', 'o2', 'o3', 'c1']);
});

test('sortByDisplayOrder is stable and does not mutate', () => {
  const xs = [{ n: 'a', o: 2 }, { n: 'b' as string, o: undefined as number | undefined }, { n: 'c', o: 2 }];
  assert.deepEqual(sortByDisplayOrder(xs, (x) => x.o).map((x) => x.n), ['a', 'c', 'b']);
  assert.equal(xs[1].n, 'b');
});

test('filterSensorDataByTypes', () => {
  const data = [
    { nodeId: '1', channels: [{ sensorTypeName: 'Tekanan' }, { sensorTypeName: 'Debit' }] },
    { nodeId: '2', channels: [{ sensorTypeName: 'Debit' }] },
  ];
  assert.deepEqual(filterSensorDataByTypes(data, new Set(['Tekanan'])), [{ nodeId: '1', channels: [{ sensorTypeName: 'Tekanan' }] }]);
  assert.deepEqual(filterSensorDataByTypes(data, new Set()), []);
});

test('unwrapData', () => {
  assert.deepEqual(unwrapData([1]), [1]);
  assert.deepEqual(unwrapData({ data: [2] }), [2]);
  const fc = { type: 'FeatureCollection', features: [], data: 'x' };
  assert.equal(unwrapData(fc), fc);
});
