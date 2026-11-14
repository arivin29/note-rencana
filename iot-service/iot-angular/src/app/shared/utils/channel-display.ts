/**
 * Pure display helpers for channel/sensor monitoring lists (project Sensors tab,
 * Kanal Telemetri). No Angular, no state: every function returns the same output for
 * the same input, so two pages can never drift apart.
 *
 * Numbers for humans are NOT formatted here (that needs LOCALE_ID → formatNumber in the
 * component). The only `toFixed` below is for SVG path coordinates (machine string).
 */
import { ThresholdState } from './threshold';

/** One hourly bucket of GET /api/sensors/trends (null = no data in that hour). */
export type TrendBucket = { avg: number | null; min: number | null; max: number | null; count: number } | null;

export interface ChannelTrend {
  buckets: TrendBucket[];
  stats: { min: number | null; max: number | null; avg: number | null; count: number; lastBucketAt?: string | null };
}

/** "tiap 2 mnt" / "tiap 15 dtk" / "tiap 1 jam" / "" — the node's configured reporting interval. */
export function formatInterval(sec?: number | null): string {
  const n = Number(sec);
  if (!n || n <= 0) return '';
  if (n < 60) return `tiap ${n} dtk`;
  if (n % 3600 === 0) return `tiap ${n / 3600} jam`;
  return `tiap ${Math.round(n / 60)} mnt`;
}

/** Human duration in Indonesian: "12 mnt", "5 jam", "3 hari", "4 bln". */
export function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} jam`;
  const d = Math.floor(h / 24);
  if (d < 60) return `${d} hari`;
  return `${Math.floor(d / 30)} bln`;
}

/** Indonesian relative time: "35 dtk lalu" / "4 mnt lalu" / "2 jam lalu" / "3 hari lalu" / "Belum pernah". */
export function timeAgoId(lastAt: string | Date | null | undefined, now: number = Date.now()): string {
  if (!lastAt) return 'Belum pernah';
  const t = new Date(lastAt).getTime();
  if (isNaN(t)) return 'Belum pernah';
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

/**
 * Text for an offline / never-reported channel or sensor: time of the LAST data received
 * (not a measured outage). When the latest-value source is down we cannot say anything.
 */
export function deadSinceText(lastAt: string | null | undefined, nowMs: number, latestAvailable = true): string {
  if (!latestAvailable) return 'Nilai terakhir tidak tersedia';
  if (!lastAt) return 'Belum pernah kirim';
  return `Data terakhir ${formatDuration(nowMs - new Date(lastAt).getTime())} lalu`;
}

/** Second line for a channel that never reported: the NODE may still have been seen. */
export function nodeSeenText(lastSeenAt: string | null | undefined, nowMs: number): string {
  return lastSeenAt ? `node terlihat ${formatDuration(nowMs - new Date(lastSeenAt).getTime())} lalu` : '';
}

/** Spark-line geometry (viewBox 0 0 72 20). */
export const SPARK_W = 72;
export const SPARK_H = 20;

/** True when the buckets have at least 2 hourly points to draw. */
export function hasSparkPoints(buckets: TrendBucket[] | null | undefined): boolean {
  return (buckets || []).filter(b => b && b.avg !== null).length >= 2;
}

/**
 * SVG path (72×20) of hourly averages. Missing hours BREAK the line (new "M"),
 * they are never interpolated or drawn as 0. Returns '' when fewer than 2 points.
 */
export function sparkPath(buckets: TrendBucket[] | null | undefined): string {
  const vals = (buckets || []).map(b => (b && b.avg !== null ? Number(b.avg) : null));
  const nums = vals.filter((v): v is number => v !== null);
  if (nums.length < 2) return '';
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const span = hi - lo || 1;
  const W = SPARK_W, H = SPARK_H, n = vals.length;
  let d = '';
  let pen = false;
  vals.forEach((v, i) => {
    if (v === null) { pen = false; return; }
    const x = n > 1 ? (i / (n - 1)) * W : 0;
    const y = H - 2 - ((v - lo) / span) * (H - 4);
    d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `; // machine string (SVG), dot is correct
    pen = true;
  });
  return d.trim();
}

/** Excel "Status Ambang" — late crossings are marked, not counted (same as the screen). */
export function excelThresholdLabel(state: ThresholdState, isOut: boolean): string {
  const base = ({ below: 'Di bawah min', above: 'Di atas maks', ok: 'Normal', unset: 'Belum diatur', novalue: '-' } as Record<ThresholdState, string>)[state];
  return (state === 'below' || state === 'above') && !isOut ? `${base} (data terlambat)` : base;
}

/** Label of the viewer's timezone: WIB / WITA / WIT, else UTC±h (Excel cells carry no timezone). */
export function localTzLabel(): string {
  const offsetH = -new Date().getTimezoneOffset() / 60;
  const names: Record<number, string> = { 7: 'WIB', 8: 'WITA', 9: 'WIT' };
  return names[offsetH] || `UTC${offsetH >= 0 ? '+' : ''}${offsetH}`;
}

/** Excel has no timezone: shift by the local offset so a WIB time is written as WIB wall-clock. */
export function toExcelLocal(d: Date): Date {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
}

/** "20261113-1405" for export file names (local time). */
export function fileStamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
