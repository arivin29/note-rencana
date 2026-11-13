import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardSettingsBody, screenBadge } from './dashboard-settings';

const base = {
  name: 'Monitor TV',
  description: 'x',
  idProject: 'p1',
  timeRange: '6h',
  refreshInterval: 60,
  screen: { preset: 'tv-16-9' as const, width: 1920, height: 1080, rows: 12 },
  fontScale: 1.5,
};

test('merges screen into existing layoutConfig, keeping variables', () => {
  const body = buildDashboardSettingsBody({ variables: { zone: 'A' }, other: 1 }, base);
  assert.deepEqual(body.layoutConfig, {
    variables: { zone: 'A' },
    other: 1,
    screen: { preset: 'tv-16-9', width: 1920, height: 1080, rows: 12 },
    fontScale: 1.5,
  });
});

test('copies basic fields and normalizes refresh/time range', () => {
  const body = buildDashboardSettingsBody(undefined, { ...base, refreshInterval: 7, timeRange: 'zzz' });
  assert.equal(body.name, 'Monitor TV');
  assert.equal(body.idProject, 'p1');
  assert.equal(body.refreshInterval, 0);
  assert.equal(body.timeRange, '24h');
});

test('null project kept as null (detach)', () => {
  assert.equal(buildDashboardSettingsBody({}, { ...base, idProject: null }).idProject, null);
});

test('badge', () => {
  assert.equal(screenBadge({ screen: { preset: 'tv-16-9' } }), 'TV 16:9');
  assert.equal(screenBadge({ screen: { preset: 'custom', width: 3840, height: 1080 } }), 'Layar 3840×1080');
  assert.equal(screenBadge({}), null);
  assert.equal(screenBadge(undefined), null);
});

test('fontScale merged and normalized (overrides previous value)', () => {
  assert.equal(buildDashboardSettingsBody({ fontScale: 2 }, { ...base, fontScale: 1.25 }).layoutConfig['fontScale'], 1.25);
  assert.equal(buildDashboardSettingsBody({}, { ...base, fontScale: 3 }).layoutConfig['fontScale'], 1);
});
