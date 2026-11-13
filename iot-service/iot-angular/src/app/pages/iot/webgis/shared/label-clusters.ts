/**
 * Screen-space grouping of map value cards (SensorLabelsComponent) — pure, no OL/Angular imports,
 * tested with `npx tsx --test`.
 *
 * Each card is drawn bottom-centred above its anchor (x, y = marker pixel), so card A covers
 * x ∈ [xA − wA/2, xA + wA/2], y ∈ [yA − hA, yA] (the constant overlay offset is the same for all
 * cards and cancels out). Cards that would overlap are merged into one group card drawn at the
 * lead anchor; the lead is the highest-priority anchor (alarm first), so an out-of-threshold
 * point is never hidden inside somebody else's card.
 */
export interface LabelAnchor {
  id: string;
  /** Marker pixel (map viewport). */
  x: number;
  y: number;
  /** Card size in px at the current scale. */
  w: number;
  h: number;
  /** Higher = more important (e.g. 3 critical, 2 warning, 1 normal, 0 unknown). */
  priority: number;
}

export interface LabelCluster {
  leadId: string;
  /** Lead first, then the rest by priority desc, then input order. */
  memberIds: string[];
  /** Lead anchor pixel. */
  x: number;
  y: number;
}

/** True when two bottom-centred cards of the given anchors overlap (touching edges don't count). */
export function cardsOverlap(a: LabelAnchor, b: LabelAnchor, gap = 0): boolean {
  const dx = Math.abs(a.x - b.x);
  if (dx >= (a.w + b.w) / 2 + gap) return false;
  const dy = b.y - a.y; // b below a when > 0
  // A spans [a.y − a.h, a.y], B spans [b.y − b.h, b.y]
  return -dy < a.h + gap && dy < b.h + gap;
}

/**
 * Greedy clustering: anchors are visited by priority (desc, stable). Each joins the first existing
 * cluster whose lead card it overlaps, otherwise it starts a new cluster. Non-finite anchors
 * (point not projected yet) always stay on their own.
 */
export function clusterLabelAnchors(anchors: LabelAnchor[], gap = 0): LabelCluster[] {
  const order = anchors
    .map((a, i) => ({ a, i }))
    .sort((p, q) => (q.a.priority - p.a.priority) || (p.i - q.i));
  const clusters: { lead: LabelAnchor; members: LabelAnchor[] }[] = [];
  for (const { a } of order) {
    const finite = Number.isFinite(a.x) && Number.isFinite(a.y);
    const host = finite
      ? clusters.find((c) => Number.isFinite(c.lead.x) && cardsOverlap(c.lead, a, gap))
      : undefined;
    if (host) host.members.push(a);
    else clusters.push({ lead: a, members: [a] });
  }
  return clusters.map((c) => ({
    leadId: c.lead.id,
    memberIds: c.members.map((m) => m.id),
    x: c.lead.x,
    y: c.lead.y,
  }));
}

/** Stable key for a cluster's membership (order-independent). */
export function clusterKey(memberIds: string[]): string {
  return [...memberIds].sort().join('|');
}
