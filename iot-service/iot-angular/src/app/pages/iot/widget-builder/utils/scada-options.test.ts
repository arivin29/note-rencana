import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCADA_OPTIONS, readScadaOptions, resolveScadaTheme, scadaEmbedParams, scadaWidgetState,
} from './scada-options';
import { appendScadaParams, scadaOrigin } from '../../../../shared/scada-embed/scada-embed-url';

test('readScadaOptions: defaults for missing/invalid input', () => {
  assert.deepEqual(readScadaOptions(undefined), DEFAULT_SCADA_OPTIONS);
  assert.deepEqual(readScadaOptions('x'), DEFAULT_SCADA_OPTIONS);
  assert.deepEqual(readScadaOptions({ diagramId: 5, interactive: 'no', theme: 'blue' }), {
    diagramId: '', interactive: true, theme: 'auto',
  });
});

test('readScadaOptions: keeps valid values, trims id', () => {
  assert.deepEqual(readScadaOptions({ diagramId: ' abc ', interactive: false, theme: 'light' }), {
    diagramId: 'abc', interactive: false, theme: 'light',
  });
});

test('resolveScadaTheme: auto follows app theme, default dark', () => {
  assert.equal(resolveScadaTheme('auto', 'light'), 'light');
  assert.equal(resolveScadaTheme('auto', 'dark'), 'dark');
  assert.equal(resolveScadaTheme('auto', null), 'dark');
  assert.equal(resolveScadaTheme('dark', 'light'), 'dark');
  assert.equal(resolveScadaTheme('light', 'dark'), 'light');
});

test('scadaEmbedParams + appendScadaParams build the kiosk URL', () => {
  const base = 'https://scada.example/embed/p1/diagrams/d1/view';
  const opts = readScadaOptions({ diagramId: 'd1', interactive: false, theme: 'auto' });
  assert.equal(appendScadaParams(base, scadaEmbedParams(opts, 'light')),
    `${base}?kiosk=1&interactive=0&theme=light`);
  assert.equal(appendScadaParams(base, scadaEmbedParams({ ...opts, interactive: true }, 'dark')),
    `${base}?kiosk=1&interactive=1&theme=dark`);
});

test('appendScadaParams: skips empty, encodes, handles existing query and booleans', () => {
  assert.equal(appendScadaParams('u', null), 'u');
  assert.equal(appendScadaParams('u', { a: '', b: null, c: undefined }), 'u');
  assert.equal(appendScadaParams('u?x=1', { a: 'b c', t: true, f: false, n: 3 }), 'u?x=1&a=b%20c&t=1&f=0&n=3');
});

test('scadaOrigin', () => {
  assert.equal(scadaOrigin('https://devetek-helios-scada.web.app'), 'https://devetek-helios-scada.web.app');
  assert.equal(scadaOrigin('http://localhost:4300/embed/x'), 'http://localhost:4300');
  assert.equal(scadaOrigin('not a url'), '');
});

test('scadaWidgetState', () => {
  const o = readScadaOptions({ diagramId: 'd1' });
  assert.equal(scadaWidgetState(null, o), 'no-project');
  assert.equal(scadaWidgetState('p1', readScadaOptions({})), 'no-diagram');
  assert.equal(scadaWidgetState('p1', o), 'ok');
});
