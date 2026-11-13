/**
 * Single source of truth for "is this device/sensor reporting?" across the app.
 *
 * Freshness is relative to the node's own reporting interval, so a logger that
 * reports every 15 min isn't flagged while one that reports every 2 min is.
 *   fresh   = last data within 3 intervals   (at least 10 min)
 *   stale   = last data within 12 intervals  (at least 60 min)
 *   offline = older than that
 *   nodata  = never reported
 *
 * Use this everywhere a status dot/badge is derived from a timestamp
 * (sensors tab, workspace tree, overview, nodes list). Do NOT invent local thresholds.
 */
export type Freshness = 'fresh' | 'stale' | 'offline' | 'nodata';

export const FRESHNESS_MIN_FRESH_MIN = 10;
export const FRESHNESS_MIN_STALE_MIN = 60;
export const FRESHNESS_FRESH_INTERVALS = 3;
export const FRESHNESS_STALE_INTERVALS = 12;

export function getFreshness(
  lastAt: string | Date | null | undefined,
  intervalSec?: number | null,
  now: number = Date.now()
): Freshness {
  if (!lastAt) return 'nodata';
  const t = new Date(lastAt).getTime();
  if (isNaN(t)) return 'nodata';
  const ageMin = (now - t) / 60_000;
  const intervalMin = (Number(intervalSec) || 0) / 60;
  if (ageMin < Math.max(FRESHNESS_MIN_FRESH_MIN, intervalMin * FRESHNESS_FRESH_INTERVALS)) return 'fresh';
  if (ageMin < Math.max(FRESHNESS_MIN_STALE_MIN, intervalMin * FRESHNESS_STALE_INTERVALS)) return 'stale';
  return 'offline';
}

/** Thresholds in minutes for a given interval — for tooltips / guide text. */
export function freshnessThresholds(intervalSec?: number | null): { freshMin: number; staleMin: number } {
  const intervalMin = (Number(intervalSec) || 0) / 60;
  return {
    freshMin: Math.round(Math.max(FRESHNESS_MIN_FRESH_MIN, intervalMin * FRESHNESS_FRESH_INTERVALS)),
    staleMin: Math.round(Math.max(FRESHNESS_MIN_STALE_MIN, intervalMin * FRESHNESS_STALE_INTERVALS))
  };
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: 'Fresh',
  stale: 'Stale',
  offline: 'Offline',
  nodata: 'No Data'
};

export const FRESHNESS_BADGE: Record<Freshness, string> = {
  fresh: 'bg-success-subtle text-success',
  stale: 'bg-warning-subtle text-warning',
  offline: 'bg-danger-subtle text-danger',
  nodata: 'bg-secondary-subtle text-secondary'
};

/** "35s ago" / "4m ago" / "2h ago" / "3d ago" / "Never" */
export function timeAgo(lastAt: string | Date | null | undefined, now: number = Date.now()): string {
  if (!lastAt) return 'Never';
  const t = new Date(lastAt).getTime();
  if (isNaN(t)) return 'Never';
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
