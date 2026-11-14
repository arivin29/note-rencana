/**
 * Pure helpers for the node detail of a project map (mobile Peta bottom sheet): status bucket,
 * channel order, navigation/share links, map height. No Angular/OL imports — tested with tsx.
 */
import type { Freshness } from '../../../../shared/utils/telemetry-freshness';

/** Filter chips over the map: Semua · Online · Terganggu · Offline. */
export type MapStatusBucket = 'online' | 'terganggu' | 'offline';
export type MapStatusFilter = 'all' | MapStatusBucket;

/** Same words as the app glossary (`FRESHNESS_LABEL_ID`: Aktif / Terlambat / Offline / Belum ada data). */
export const MAP_BUCKET_LABEL: Record<MapStatusBucket, string> = {
  online: 'Aktif',
  terganggu: 'Terlambat',
  offline: 'Offline',
};

/** Sheet status text per freshness (nodata is counted as Offline but named honestly). */
export const MAP_FRESHNESS_TEXT: Record<Freshness, string> = {
  fresh: 'Aktif',
  stale: 'Terlambat',
  offline: 'Offline',
  nodata: 'Belum ada data',
};

export function freshnessBucket(f: Freshness): MapStatusBucket {
  return f === 'fresh' ? 'online' : f === 'stale' ? 'terganggu' : 'offline';
}

export function countBuckets(buckets: readonly MapStatusBucket[]): Record<MapStatusFilter, number> {
  const out: Record<MapStatusFilter, number> = { all: buckets.length, online: 0, terganggu: 0, offline: 0 };
  for (const b of buckets) out[b]++;
  return out;
}

/** Latest of the node's last-seen time and its channels' last value time (ISO / Date / null). */
export function latestTime(...times: (string | Date | null | undefined)[]): string | null {
  let best = NaN;
  for (const t of times) {
    if (!t) continue;
    const ms = new Date(t).getTime();
    if (Number.isFinite(ms) && !(ms <= best)) best = ms;
  }
  return Number.isFinite(best) ? new Date(best).toISOString() : null;
}

interface SheetChannelLike {
  metricCode?: string | null;
  status?: string | null;
}

const ALARM_RANK: Record<string, number> = { critical: 3, warning: 2, normal: 1 };

/** Main metrics first: pressure, flow, velocity, totalizer; constants (diameter) last. */
export function metricRank(metricCode: string | null | undefined): number {
  const m = String(metricCode || '').toLowerCase();
  if (/press|tekan/.test(m)) return 0;
  if (/flow|debit/.test(m)) return 1;
  if (/veloc|kecepatan/.test(m)) return 2;
  if (/total|volume/.test(m)) return 3;
  if (/diam/.test(m)) return 9;
  return 5;
}

/**
 * Default decimals per metric when the channel has no precision (Helios spec §4: debit 2,
 * tekanan 2, volume 0). Diameter / totals are whole numbers.
 */
export function metricDecimals(metricCode: string | null | undefined): number {
  const m = String(metricCode || '').toLowerCase();
  if (/total|volume|diam|count|jumlah|signal|rssi|batt/.test(m)) return 0;
  if (/temp|suhu|humid/.test(m)) return 1;
  return 2;
}

/** Installation constants (pipe diameter …) — not a live reading; hidden from map value cards. */
export function isConstantMetric(metricCode: string | null | undefined): boolean {
  return /diam/.test(String(metricCode || '').toLowerCase());
}

/** Alarm first (critical > warning > normal > unknown), then main metric, then input order. */
export function sortSheetChannels<T extends SheetChannelLike>(channels: readonly T[]): T[] {
  return channels
    .map((c, i) => ({ c, i }))
    .sort((a, b) =>
      ((ALARM_RANK[b.c.status || ''] ?? 0) - (ALARM_RANK[a.c.status || ''] ?? 0))
      || (metricRank(a.c.metricCode) - metricRank(b.c.metricCode))
      || (a.i - b.i))
    .map((x) => x.c);
}

/** metric_code → "Metric Code" (channel name in value cards and the node sheet). */
export function metricTitle(code: string | null | undefined): string {
  return String(code || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const UNIT_PRETTY: Record<string, string> = {
  'l/s': 'L/s', 'lps': 'L/s', 'l/det': 'L/det', 'l/m': 'L/mnt', 'l/min': 'L/mnt', 'l': 'L',
  'm3': 'm³', 'm3/h': 'm³/jam', 'm3/jam': 'm³/jam', 'm3/s': 'm³/s', 'm3/hr': 'm³/jam', 'm2': 'm²',
  'deg c': '°C', 'degc': '°C',
};

/** Display unit: "l/s" → "L/s", "m3" → "m³", "m3/h" → "m³/jam"; unknown units unchanged. */
export function prettyUnit(unit: string | null | undefined): string {
  const u = String(unit || '').trim();
  return UNIT_PRETTY[u.toLowerCase()] ?? u.replace(/m3/g, 'm³').replace(/m2(?!\d)/g, 'm²');
}

/** Coordinate as a machine string (dot decimal, 6 digits ≈ 0,1 m) — for links & clipboard. */
export function coordText(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

/** Google Maps directions to the node (opens the Maps app on phones). */
export function directionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coordText(lat, lon)}`;
}

/** Google Maps pin of the node. */
export function placeUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${coordText(lat, lon)}`;
}

/** Text copied / shared for a node: label, code, coordinates and a Maps link. */
export function nodeShareText(label: string, code: string, lat: number, lon: number): string {
  const head = code && code !== label ? `${label} (${code})` : label;
  return `${head}\nKoordinat: ${coordText(lat, lon)}\n${placeUrl(lat, lon)}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Map height filling the viewport below `top` and above the bottom chrome, never under `min`. */
export function fillHeight(viewportH: number, top: number, bottomReserve: number, min = 280): number {
  return Math.max(min, Math.floor(viewportH - top - bottomReserve));
}
