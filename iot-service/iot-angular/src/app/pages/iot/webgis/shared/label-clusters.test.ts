import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardsOverlap, clusterLabelAnchors, clusterKey, LabelAnchor } from './label-clusters';

const a = (id: string, x: number, y: number, priority = 1, w = 100, h = 40): LabelAnchor => ({ id, x, y, w, h, priority });

test('cardsOverlap: horizontal and vertical extents', () => {
  assert.equal(cardsOverlap(a('a', 0, 0), a('b', 99, 0)), true);
  assert.equal(cardsOverlap(a('a', 0, 0), a('b', 100, 0)), false); // edges touch
  assert.equal(cardsOverlap(a('a', 0, 0), a('b', 0, 39)), true);
  assert.equal(cardsOverlap(a('a', 0, 0), a('b', 0, 40)), false);
  assert.equal(cardsOverlap(a('a', 0, 0), a('b', 0, -40)), false);
  // different heights: tall card above reaches down to the short one
  assert.equal(cardsOverlap(a('a', 0, 0, 1, 100, 90), a('b', 0, -60, 1, 100, 20)), true);
  assert.equal(cardsOverlap(a('a', 0, 0), a('b', 100, 0), 4), true); // gap
});

test('clusterLabelAnchors: far apart → one card each', () => {
  const r = clusterLabelAnchors([a('a', 0, 0), a('b', 300, 0), a('c', 0, 200)]);
  assert.deepEqual(r.map((c) => c.memberIds), [['a'], ['b'], ['c']]);
});

test('clusterLabelAnchors: stacked cards merge, alarm leads', () => {
  const r = clusterLabelAnchors([a('ipa', 100, 100, 1), a('ipa2', 103, 101, 1), a('x', 118, 100, 3), a('far', 600, 100, 1)]);
  assert.equal(r.length, 2);
  assert.equal(r[0].leadId, 'x');
  assert.deepEqual(r[0].memberIds, ['x', 'ipa', 'ipa2']);
  assert.deepEqual([r[0].x, r[0].y], [118, 100]); // drawn at the lead point
  assert.deepEqual(r[1].memberIds, ['far']);
});

test('clusterLabelAnchors: zoomed in → splits back', () => {
  const r = clusterLabelAnchors([a('ipa', 100, 100), a('ipa2', 260, 140), a('x', 420, 100)]);
  assert.equal(r.length, 3);
});

test('clusterLabelAnchors: non-finite anchors stay single', () => {
  const r = clusterLabelAnchors([a('a', 0, 0), a('b', NaN, NaN), a('c', NaN, NaN)]);
  assert.deepEqual(r.map((c) => c.memberIds), [['a'], ['b'], ['c']]);
});

test('clusterKey is order independent', () => {
  assert.equal(clusterKey(['b', 'a']), clusterKey(['a', 'b']));
});
