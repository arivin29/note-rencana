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
    const finite = isFinitePoint(a);
    const host = finite
      ? clusters.find((c) => isFinitePoint(c.lead) && cardsOverlap(c.lead, a, gap))
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

function isFinitePoint(a: LabelAnchor): boolean {
  return Number.isFinite(a.x) && Number.isFinite(a.y);
}

// ── Placement: try sides before merging ─────────────────────────────────────

/** Where a card sits relative to its marker. `above` = the classic bottom-centred card with pointer. */
export type CardSide = 'above' | 'below' | 'right' | 'left' | 'above-right' | 'above-left' | 'below-right' | 'below-left';

export const CARD_SIDES: readonly CardSide[] =
  ['above', 'below', 'right', 'left', 'above-right', 'above-left', 'below-right', 'below-left'];

export interface Rect { left: number; top: number; w: number; h: number; }

export interface Insets { top: number; right: number; bottom: number; left: number; }

export interface PlaceOptions {
  /** Map viewport size (px). */
  width: number;
  height: number;
  /** Viewport area covered by host UI (rail, chips…) — cards stay out of it. */
  insets?: Partial<Insets>;
  /** Min space between cards. */
  gap?: number;
  /** Marker → card distance: `above` card bottom at y − clearAbove (WebGIS look: 15 × scale). */
  clearAbove?: number;
  /** Marker → card distance for the other sides. */
  clear?: number;
  /** Merged card size for these members (lead first). */
  groupSize?: (memberIds: string[]) => { w: number; h: number };
}

export interface PlacedCard extends LabelCluster {
  side: CardSide;
  /** Card box in viewport px (after clamping). */
  rect: Rect;
  /** Card was shifted to stay inside the viewport (pointer no longer centred on the marker). */
  clamped: boolean;
}

export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return a.left < b.left + b.w + gap && b.left < a.left + a.w + gap
    && a.top < b.top + b.h + gap && b.top < a.top + a.h + gap;
}

/** Unclamped card box for a side. */
export function sideRect(x: number, y: number, w: number, h: number, side: CardSide, clearAbove: number, clear: number): Rect {
  const d = clear * 0.7; // diagonal offset
  switch (side) {
    case 'above': return { left: x - w / 2, top: y - clearAbove - h, w, h };
    case 'below': return { left: x - w / 2, top: y + clear, w, h };
    case 'right': return { left: x + clear, top: y - h / 2, w, h };
    case 'left': return { left: x - clear - w, top: y - h / 2, w, h };
    case 'above-right': return { left: x + d, top: y - d - h, w, h };
    case 'above-left': return { left: x - d - w, top: y - d - h, w, h };
    case 'below-right': return { left: x + d, top: y + d, w, h };
    case 'below-left': return { left: x - d - w, top: y + d, w, h };
  }
}

/** Shift a box inside the viewport minus insets (top/left win when it doesn't fit). */
export function clampRect(r: Rect, width: number, height: number, ins: Insets): Rect {
  const maxLeft = width - ins.right - r.w;
  const maxTop = height - ins.bottom - r.h;
  return {
    ...r,
    left: Math.max(ins.left, Math.min(r.left, maxLeft)),
    top: Math.max(ins.top, Math.min(r.top, maxTop)),
  };
}

/**
 * Value-card layout. Cards are placed greedily (alarm first, then bigger cards first); each takes
 * the first side (`CARD_SIDES`) whose box — clamped inside the viewport minus `insets` — doesn't
 * overlap an already placed card. A clamp may slide a card at most half its size away from the
 * side's spot, so it stays next to its marker. Only when no side fits is the card merged into the
 * nearest placed card's group, and the layout is redone (each merge removes a card → ends).
 * Non-finite / off-screen anchors are returned single and unplaced (classic `above`, rect NaN).
 */
export function placeLabelCards(anchors: LabelAnchor[], opts: PlaceOptions): PlacedCard[] {
  const ins: Insets = { top: 0, right: 0, bottom: 0, left: 0, ...(opts.insets || {}) };
  const gap = opts.gap ?? 0;
  const clearAbove = opts.clearAbove ?? 15;
  const clear = opts.clear ?? 12;
  const index = new Map(anchors.map((a, i) => [a.id, i] as const));
  const byPriority = (p: LabelAnchor, q: LabelAnchor) => (q.priority - p.priority) || (index.get(p.id)! - index.get(q.id)!);

  // Markers outside the viewport keep the classic (unclamped) spot — i.e. off screen, as in WebGIS —
  // and don't take room from visible cards; never pin them to the map edge far from their marker.
  const onScreen = (a: LabelAnchor) => isFinitePoint(a) && a.x >= 0 && a.y >= 0 && a.x <= opts.width && a.y <= opts.height;
  const finite = anchors.filter(onScreen);
  const loose: PlacedCard[] = anchors.filter((a) => !onScreen(a)).map((a) => ({
    leadId: a.id, memberIds: [a.id], x: a.x, y: a.y, side: 'above', clamped: false,
    rect: { left: NaN, top: NaN, w: a.w, h: a.h },
  }));

  let groups: LabelAnchor[][] = finite.map((a) => [a]);
  for (let guard = 0; guard <= finite.length; guard++) {
    const cards = groups.map((members) => {
      const lead = members[0];
      const size = members.length > 1 && opts.groupSize ? opts.groupSize(members.map((m) => m.id)) : { w: lead.w, h: lead.h };
      return { members, lead, w: size.w, h: size.h };
    });
    // alarm first, then bigger (more rows) first, then input order
    cards.sort((p, q) => (q.lead.priority - p.lead.priority) || (q.h - p.h) || (index.get(p.lead.id)! - index.get(q.lead.id)!));

    const placed: PlacedCard[] = [];
    let failed: (typeof cards)[number] | null = null;
    for (const c of cards) {
      let spot: PlacedCard | null = null;
      let blocked = false; // some side failed because of another card (not only the viewport edge)
      for (const side of CARD_SIDES) {
        const raw = sideRect(c.lead.x, c.lead.y, c.w, c.h, side, clearAbove, clear);
        const rect = clampRect(raw, opts.width, opts.height, ins);
        if (placed.some((p) => rectsOverlap(p.rect, rect, gap))) { blocked = true; continue; }
        const dx = Math.abs(rect.left - raw.left);
        const dy = Math.abs(rect.top - raw.top);
        if (dx > c.w / 2 || dy > c.h / 2) continue; // would detach from its marker
        spot = {
          leadId: c.lead.id, memberIds: c.members.map((m) => m.id), x: c.lead.x, y: c.lead.y,
          side, rect, clamped: dx > 0.5 || dy > 0.5,
        };
        break;
      }
      if (!spot && !blocked) {
        // Only the viewport is in the way (card larger than the free area): keep it, clamped above.
        const rect = clampRect(sideRect(c.lead.x, c.lead.y, c.w, c.h, 'above', clearAbove, clear), opts.width, opts.height, ins);
        spot = { leadId: c.lead.id, memberIds: c.members.map((m) => m.id), x: c.lead.x, y: c.lead.y, side: 'above', rect, clamped: true };
      }
      if (!spot) { failed = c; break; }
      placed.push(spot);
    }
    if (!failed) return [...placed, ...loose];

    // Merge the card that found no room into the nearest placed card's group (or, if none was
    // placed, into its nearest neighbour) and lay out again.
    const f = failed;
    const candidates = groups.filter((g) => g !== f.members);
    const placedLeads = new Set(placed.map((p) => p.leadId));
    const pool = candidates.filter((g) => placedLeads.has(g[0].id));
    const near = (pool.length ? pool : candidates).reduce((best, g) =>
      dist(g[0], f.lead) < dist(best[0], f.lead) ? g : best);
    const merged = [...near, ...f.members].sort(byPriority);
    groups = [...candidates.filter((g) => g !== near), merged];
  }
  // Unreachable in practice (each round merges); fall back to everything in one card.
  const all = [...finite].sort(byPriority);
  const lead = all[0];
  const size = opts.groupSize ? opts.groupSize(all.map((m) => m.id)) : { w: lead.w, h: lead.h };
  const rect = clampRect(sideRect(lead.x, lead.y, size.w, size.h, 'above', clearAbove, clear), opts.width, opts.height, ins);
  return [{ leadId: lead.id, memberIds: all.map((m) => m.id), x: lead.x, y: lead.y, side: 'above', rect, clamped: true }, ...loose];
}

function dist(a: LabelAnchor, b: LabelAnchor): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Rows of a merged card split into node blocks (header line + up to `perNode` metric rows) within a
 * line budget (header and rows cost one line each; the "+N lainnya" line is reserved when anything
 * is left out). Returns metric rows shown per node (0 = node not shown) and the hidden row count.
 */
export function fitGroupBlocks(
  rowsPerNode: number[], budget: number, perNode = 2, maxNodes = 4,
): { shown: number[]; hidden: number } {
  const total = rowsPerNode.reduce((n, r) => n + Math.max(1, r), 0);
  const plan = (lines: number) => {
    const shown: number[] = [];
    let left = lines;
    rowsPerNode.forEach((r, i) => {
      const take = Math.min(perNode, r);
      if (i >= maxNodes || left < 1 + Math.min(1, take)) { shown.push(0); return; }
      const rows = Math.min(take, left - 1);
      shown.push(rows);
      left -= 1 + rows;
    });
    const hidden = rowsPerNode.reduce((n, r, i) => n + (shown[i] ? r - shown[i] : Math.max(1, r)), 0);
    return { shown, hidden };
  };
  const all = plan(Math.max(0, budget));
  if (all.hidden === 0 || total === 0) return all;
  const res = plan(Math.max(0, budget - 1)); // keep a line for "+N lainnya"
  // always show at least the lead node's header + main row
  if (!res.shown[0] && rowsPerNode.length) {
    res.shown[0] = Math.min(1, rowsPerNode[0]);
    res.hidden = rowsPerNode.reduce((n, r, i) => n + (res.shown[i] ? r - res.shown[i] : Math.max(1, r)), 0);
  }
  return res;
}

/** Stable key for a cluster's membership (order-independent). */
export function clusterKey(memberIds: string[]): string {
  return [...memberIds].sort().join('|');
}
