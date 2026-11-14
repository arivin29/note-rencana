import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cardsOverlap, clusterLabelAnchors, clusterKey, fitGroupBlocks, LabelAnchor, placeLabelCards, rectsOverlap, Rect,
} from './label-clusters';

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

const noOverlap = (cards: { rect: Rect }[]) => {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) assert.equal(rectsOverlap(cards[i].rect, cards[j].rect), false, `${i}/${j}`);
  }
};

test('placeLabelCards: free space → every card above its marker', () => {
  const r = placeLabelCards([a('a', 100, 200), a('b', 400, 200)], { width: 800, height: 400 });
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((c) => c.side), ['above', 'above']);
  assert.deepEqual(r[0].rect, { left: 50, top: 200 - 15 - 40, w: 100, h: 40 });
});

test('placeLabelCards: neighbour blocks "above" → card moves to another side, no merge', () => {
  const r = placeLabelCards([a('a', 100, 200, 2), a('b', 140, 200, 1)], { width: 800, height: 400 });
  assert.equal(r.length, 2);
  assert.equal(r.find((c) => c.leadId === 'a')!.side, 'above'); // alarm keeps the classic spot
  assert.notEqual(r.find((c) => c.leadId === 'b')!.side, 'above');
  noOverlap(r);
});

test('placeLabelCards: cards stay inside the viewport minus insets', () => {
  const ins = { top: 100, right: 60, bottom: 20, left: 0 };
  const r = placeLabelCards([a('edge', 790, 120), a('top', 300, 105)], { width: 800, height: 400, insets: ins });
  for (const c of r) {
    assert.ok(c.rect.left >= 0 && c.rect.left + c.rect.w <= 800 - 60, `x ${c.leadId}`);
    assert.ok(c.rect.top >= 100 && c.rect.top + c.rect.h <= 400 - 20, `y ${c.leadId}`);
  }
  noOverlap(r);
});

test('placeLabelCards: merges only when no side fits; result never overlaps', () => {
  // 6 markers on one spot in a small map: not all 8 sides are free → some merge, all members kept
  const pts = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => a(id, 150, 150, i === 3 ? 3 : 1));
  const size = (ids: string[]) => ({ w: 120, h: 24 + 14 * ids.length });
  const r = placeLabelCards(pts, { width: 300, height: 300, groupSize: size });
  assert.ok(r.length < 6 && r.length >= 1);
  assert.equal(r.reduce((n, c) => n + c.memberIds.length, 0), 6);
  assert.ok(r.some((c) => c.leadId === 'd')); // alarm leads its card
  noOverlap(r);
});

test('placeLabelCards: spread markers on a TV-sized map stay separate', () => {
  const pts = Array.from({ length: 12 }, (_, i) => a(`n${i}`, 120 + (i % 6) * 160, 200 + Math.floor(i / 6) * 220, 1, 130, 45));
  const r = placeLabelCards(pts, { width: 1100, height: 650, gap: 4 });
  assert.equal(r.length, 12);
  noOverlap(r);
});

test('placeLabelCards: off-screen markers are not clamped to the edge', () => {
  const r = placeLabelCards([a('in', 100, 100), a('right', 900, 100), a('below', 100, 700)],
    { width: 800, height: 400 });
  const off = r.filter((c) => c.leadId !== 'in');
  assert.equal(off.length, 2);
  for (const c of off) {
    assert.equal(c.side, 'above');
    assert.equal(c.clamped, false);
    assert.ok(Number.isNaN(c.rect.left)); // sensor-labels anchors it classically → stays off screen
  }
});

test('placeLabelCards: non-finite anchors returned single', () => {
  const r = placeLabelCards([a('a', 100, 100), a('b', NaN, NaN)], { width: 400, height: 400 });
  assert.deepEqual(r.map((c) => c.memberIds), [['a'], ['b']]);
});

test('fitGroupBlocks: fits the line budget, rest counted in +N', () => {
  // 3 nodes with 2, 3, 1 rows; plenty of room → 2+2+1 rows, 1 hidden (perNode 2)
  assert.deepEqual(fitGroupBlocks([2, 3, 1], 20), { shown: [2, 2, 1], hidden: 1 });
  // budget 6 lines: reserve 1 for "+N" → node0 header+2, node1 header+1 = 5 lines
  assert.deepEqual(fitGroupBlocks([2, 3, 1], 6), { shown: [2, 1, 0], hidden: 3 });
  // tiny budget still shows the lead's header + main row
  assert.deepEqual(fitGroupBlocks([2, 2], 1), { shown: [1, 0], hidden: 3 });
  // everything fits exactly → no "+N" line reserved
  assert.deepEqual(fitGroupBlocks([1, 1], 4), { shown: [1, 1], hidden: 0 });
});

test('clusterKey is order independent', () => {
  assert.equal(clusterKey(['b', 'a']), clusterKey(['a', 'b']));
});
