/**
 * One status verdict for a node or a channel, built only from the shared rules:
 *   freshness  = getFreshness(lastAt, node.telemetryIntervalSec)   (telemetry-freshness.ts)
 *   threshold  = thresholdState(value, min, max)                   (threshold.ts)
 *   isOut      = threshold crossed AND the data is fresh            (same rule as desktop
 *                sensors-page `isChannelOut` and backend `computeChannelStatus`)
 *
 * Pure functions, no Angular. Numbers are formatted by the caller (LOCALE_ID); the
 * `fmt` callbacks below exist so this file never prints a locale-less number.
 */
import { Freshness, getFreshness } from './telemetry-freshness';
import { thresholdState, ThresholdState, toThresholdNumber } from './threshold';

export interface ChannelVerdict {
  freshness: Freshness;
  /** offline / no data → 'novalue': an old value is not a current problem */
  threshold: ThresholdState;
  /** crossed a threshold while fresh — the only case counted as "di luar ambang" */
  isOut: boolean;
  /** crossed a threshold but the data is stale (shown muted, never counted) */
  isLateOut: boolean;
}

export function channelVerdict(
  lastAt: string | Date | null | undefined,
  intervalSec: number | null | undefined,
  value: any,
  min: any,
  max: any,
  now: number = Date.now()
): ChannelVerdict {
  const freshness = getFreshness(lastAt, intervalSec, now);
  const raw = thresholdState(value, min, max);
  const threshold: ThresholdState =
    (freshness === 'offline' || freshness === 'nodata') && raw !== 'unset' ? 'novalue' : raw;
  const crossed = threshold === 'below' || threshold === 'above';
  return { freshness, threshold, isOut: crossed && freshness === 'fresh', isLateOut: crossed && freshness === 'stale' };
}

/** Indonesian freshness labels (desktop FRESHNESS_LABEL is English). */
export const FRESHNESS_LABEL_ID: Record<Freshness, string> = {
  fresh: 'Aktif',
  stale: 'Terlambat',
  offline: 'Offline',
  nodata: 'Belum ada data'
};

/** Node label rule: address first, code as fallback (never the code when an address exists). */
export function nodeLabel(n: { address?: string | null; nodeAddress?: string | null; code?: string | null; nodeCode?: string | null; name?: string | null } | null | undefined): string {
  if (!n) return '';
  const addr = (n.address || n.nodeAddress || '').trim();
  return addr || (n.code || n.nodeCode || '').trim() || (n.name || '').trim();
}

/** Second line under a node label: the code, only when the title shows the address. */
export function nodeSubLabel(n: { address?: string | null; nodeAddress?: string | null; code?: string | null; nodeCode?: string | null } | null | undefined): string {
  if (!n) return '';
  const addr = (n.address || n.nodeAddress || '').trim();
  return addr ? (n.code || n.nodeCode || '').trim() : '';
}

/**
 * "Ambang 0,5–3 bar" / "Ambang min 0,5 bar" / "Ambang maks 3 bar" / "Ambang belum diatur".
 * `fmt` formats a number for humans (formatNumber with LOCALE_ID).
 */
export function thresholdText(min: any, max: any, unit: string | null | undefined, fmt: (n: number) => string): string {
  const lo = toThresholdNumber(min);
  const hi = toThresholdNumber(max);
  const u = (unit || '').trim();
  const tail = u ? ` ${u}` : '';
  if (lo === null && hi === null) return 'Ambang belum diatur';
  if (lo !== null && hi !== null) return `Ambang ${fmt(lo)}–${fmt(hi)}${tail}`;
  return lo !== null ? `Ambang min ${fmt(lo)}${tail}` : `Ambang maks ${fmt(hi as number)}${tail}`;
}

/** "di bawah min 0,5" / "di atas maks 3" / "" */
export function outOfRangeText(state: ThresholdState, min: any, max: any, fmt: (n: number) => string): string {
  const lo = toThresholdNumber(min);
  const hi = toThresholdNumber(max);
  if (state === 'below' && lo !== null) return `di bawah min ${fmt(lo)}`;
  if (state === 'above' && hi !== null) return `di atas maks ${fmt(hi)}`;
  return '';
}
