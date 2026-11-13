/**
 * Map widget ("Peta") — SQL row contract + normalizer. Pure, no Angular/OpenLayers imports.
 *
 * Expected columns (case-insensitive, PG returns them alphabetized → always map by name):
 *   lat | latitude            number (WGS84), required
 *   lon | lng | long | longitude   number (WGS84), required
 *   label                     text (node address, fallback node code)
 *   value                     number, optional
 *   unit                      text, optional
 *   status                    'normal' | 'low' | 'high' | 'nothreshold' | 'nodata', optional
 *   time                      timestamp of the last data, optional
 * Numeric strings ("-6.2", "1,82") are accepted. Rows without valid coordinates are dropped.
 */
import { formatIdNumber } from './format-id';

export type MapPointStatus = 'normal' | 'low' | 'high' | 'nothreshold' | 'nodata';
export type MapLabelMode = 'label-value' | 'value' | 'label';
export type MapBasemap = 'auto' | 'light' | 'dark' | 'none';
/**
 * What the map draws:
 * - `webgis` (default): the project's WebGIS layers with WebGIS styles — sensor types + sensor value
 *   cards, alerts and every operational/custom layer (core "Nodes" excluded). SQL result not drawn.
 * - `sql`: only the SQL points (+ project layers when `showProjectLayers`).
 * - `both`: WebGIS layers + SQL points on top.
 */
export type MapSource = 'webgis' | 'sql' | 'both';

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  value: number | null;
  unit: string;
  status: MapPointStatus;
  time: Date | null;
}

export interface MapWidgetOptions {
  source: MapSource;
  showProjectLayers: boolean;
  basemap: MapBasemap;
  showLabels: boolean;
  labelMode: MapLabelMode;
  interactive: boolean;
}

export const DEFAULT_MAP_OPTIONS: MapWidgetOptions = {
  source: 'webgis',
  showProjectLayers: true,
  basemap: 'auto',
  showLabels: true,
  labelMode: 'label-value',
  interactive: false,
};

const LAT_KEYS = ['lat', 'latitude'];
const LON_KEYS = ['lon', 'lng', 'long', 'longitude'];

/** Reads widget options with defaults; unknown values fall back to the default. */
export function readMapOptions(raw: unknown): MapWidgetOptions {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const bool = (v: any, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    source: (['webgis', 'sql', 'both'] as const).includes(r['source']) ? r['source'] : DEFAULT_MAP_OPTIONS.source,
    showProjectLayers: bool(r['showProjectLayers'], DEFAULT_MAP_OPTIONS.showProjectLayers),
    basemap: (['auto', 'light', 'dark', 'none'] as const).includes(r['basemap']) ? r['basemap'] : DEFAULT_MAP_OPTIONS.basemap,
    showLabels: bool(r['showLabels'], DEFAULT_MAP_OPTIONS.showLabels),
    labelMode: (['label-value', 'value', 'label'] as const).includes(r['labelMode']) ? r['labelMode'] : DEFAULT_MAP_OPTIONS.labelMode,
    interactive: bool(r['interactive'], DEFAULT_MAP_OPTIONS.interactive),
  };
}

/** SQL points are drawn (source `sql` or `both`). */
export function mapDrawsSql(o: Pick<MapWidgetOptions, 'source'>): boolean {
  return o.source !== 'webgis';
}

/** WebGIS core layers (sensor types + value cards, alerts) are drawn (source `webgis` or `both`). */
export function mapDrawsWebgis(o: Pick<MapWidgetOptions, 'source'>): boolean {
  return o.source !== 'sql';
}

/** Operational/custom map layers: always with WebGIS; with `sql` only when `showProjectLayers`. */
export function mapDrawsSupportLayers(o: Pick<MapWidgetOptions, 'source' | 'showProjectLayers'>): boolean {
  return o.source !== 'sql' || o.showProjectLayers;
}

/** Number from number or numeric string (accepts decimal comma when there is no dot). */
export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim();
  if (s === '') return null;
  if (!s.includes('.') && /^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function pick(row: Record<string, any>, keys: string[]): unknown {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.toLowerCase())) return row[k];
  }
  return undefined;
}

function normalizeStatus(raw: unknown, value: number | null): MapPointStatus {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/[\s_-]/g, '') : '';
  if (s === 'normal' || s === 'ok') return 'normal';
  if (s === 'low') return 'low';
  if (s === 'high') return 'high';
  if (s === 'nothreshold') return 'nothreshold';
  if (s === 'nodata') return 'nodata';
  // No (recognised) status column: without a value it's "no data", otherwise we can't judge thresholds.
  return value === null ? 'nodata' : 'nothreshold';
}

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeMapRows(rows: unknown): MapPoint[] {
  if (!Array.isArray(rows)) return [];
  const out: MapPoint[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, any>;
    const lat = toNumber(pick(r, LAT_KEYS));
    const lon = toNumber(pick(r, LON_KEYS));
    if (lat === null || lon === null) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    if (lat === 0 && lon === 0) continue; // unset coordinates ("null island")
    const value = toNumber(pick(r, ['value']));
    const labelRaw = pick(r, ['label']);
    const unitRaw = pick(r, ['unit']);
    out.push({
      lat,
      lon,
      label: labelRaw === null || labelRaw === undefined ? '' : String(labelRaw).trim(),
      value,
      unit: unitRaw === null || unitRaw === undefined ? '' : String(unitRaw).trim(),
      status: normalizeStatus(pick(r, ['status']), value),
      time: toDate(pick(r, ['time'])),
    });
  }
  return out;
}

/** "1,82 bar" (2 decimals, Indonesian comma) or '' when there is no value. */
export function formatMapValue(p: Pick<MapPoint, 'value' | 'unit'>): string {
  if (p.value === null) return '';
  const v = formatIdNumber(p.value, 2);
  return p.unit ? `${v} ${p.unit}` : v;
}

/** Marker text: "Bungkal · 1,82 bar" / "1,82 bar" / "Bungkal". */
export function mapPointText(p: MapPoint, mode: MapLabelMode): string {
  const val = formatMapValue(p);
  if (mode === 'label') return p.label;
  if (mode === 'value') return val || (p.status === 'nodata' ? 'Tidak ada data' : '');
  if (!val) return p.label;
  return p.label ? `${p.label} · ${val}` : val;
}
