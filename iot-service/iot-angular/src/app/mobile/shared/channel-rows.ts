import { ChannelTrend, SPARK_H, sparkPath, timeAgoId } from '@app/shared/utils/channel-display';
import { channelVerdict, ChannelVerdict, nodeLabel, outOfRangeText, thresholdText } from '@app/shared/utils/channel-verdict';
import { Freshness, getFreshness } from '@app/shared/utils/telemetry-freshness';
import { toThresholdNumber } from '@app/shared/utils/threshold';
import { mFormatNumber } from './mobile-format';
import { cleanTs } from './util';
import { MTone, verdictTone } from './labels';

/** Kategori status yang saling lepas (chip filter menjumlah ke total). */
export type ChannelStatusKey = 'out' | 'fresh' | 'stale' | 'offline' | 'nodata' | 'na';

export interface ChannelRow {
  id: string;
  nodeId: string;
  sensorId: string;
  /** judul baris: konteks project = "Alamat · Metrik", konteks perangkat = "Metrik" */
  title: string;
  sub: string;
  nodeTitle: string;
  nodeCode: string;
  sensorLabel: string;
  metricLabel: string;
  unit: string;
  precision: any;
  value: number | null;
  valueText: string;
  lastAt: string | null;
  verdict: ChannelVerdict;
  statusKey: ChannelStatusKey;
  tone: MTone;
  statusLabel: string;
  thresholdText: string;
  outText: string;
  hasThreshold: boolean;
  updatedText: string;
  link: any[];
  spark: string;
  /** area di bawah garis sparkline (tiap segmen ditutup ke dasar) — hanya hiasan */
  sparkArea: string;
  /** titik terakhir sparkline (koordinat SVG 72×20) */
  sparkEnd: { x: number; y: number } | null;
  /** min / maks 24 jam (trend.stats), sudah diformat id-ID; '' bila tak ada */
  sparkMin: string;
  sparkMax: string;
  hay: string;
}

export interface NodeLite {
  idNode: string; code: string; address: string; name: string; city: string;
  lastSeenAt: string | null; telemetryIntervalSec: number | null; picName: string; picPhone: string;
}

const METRIC_ID: Record<string, string> = {
  velocity: 'Kecepatan', flow: 'Debit', flowrate: 'Debit', pressure: 'Tekanan', temperature: 'Suhu',
  temp: 'Suhu', battery: 'Baterai', signal: 'Sinyal', rssi: 'Sinyal', humidity: 'Kelembapan'
};

/** "tekanan" → "Tekanan", "velocity" → "Kecepatan". */
export function metricLabel(code: string | null | undefined): string {
  const c = (code || '').trim();
  if (!c) { return 'Channel'; }
  const id = METRIC_ID[c.toLowerCase()];
  if (id) { return id; }
  const s = c.replace(/[_-]+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Gabung node dari /nodes dengan node tertanam di /sensors (ambil nilai yang tidak kosong). */
export function toNodeLite(primary: any, embedded?: any): NodeLite {
  const a = primary || {};
  const b = embedded || {};
  const pick = (k: string) => [a[k], b[k]].find((v) => v !== null && v !== undefined && v !== '');
  return {
    idNode: pick('idNode') || '',
    code: pick('code') || pick('serialNumber') || '',
    address: pick('address') || '',
    name: pick('name') || '',
    city: pick('city') || '',
    lastSeenAt: cleanTs(pick('lastSeenAt')) || null,
    telemetryIntervalSec: pick('telemetryIntervalSec') ?? null,
    picName: pick('picName') || '',
    picPhone: pick('picPhone') || ''
  };
}

export function nodeFreshness(n: NodeLite | any, now: number): Freshness {
  return getFreshness(n?.lastSeenAt, n?.telemetryIntervalSec, now);
}

/**
 * Baris channel dari `/api/sensors` (ClickHouse latest + ambang + presisi).
 * Status = getFreshness(lastValueAt, node.telemetryIntervalSec) × thresholdState;
 * di luar ambang hanya bila fresh.
 */
export function buildChannelRows(opts: {
  sensors: any[];
  nodesById: Map<string, any>;
  pid: string;
  locale: string;
  now: number;
  latestAvailable: boolean;
  context: 'project' | 'node';
  trends?: Map<string, ChannelTrend> | null;
}): ChannelRow[] {
  const rows: ChannelRow[] = [];
  for (const s of opts.sensors || []) {
    const nid = s.idNode || s.node?.idNode || '';
    const node = toNodeLite(opts.nodesById.get(nid), s.node);
    const nTitle = nodeLabel(node) || 'Perangkat';
    const sensorLabel = (s.label || s.sensorCode || '').trim();
    for (const ch of s.channels || []) {
      const value = ch.lastValue === null || ch.lastValue === undefined || isNaN(Number(ch.lastValue)) ? null : Number(ch.lastValue);
      const lastAt = cleanTs(ch.lastValueAt) || null;
      const v = channelVerdict(lastAt, node.telemetryIntervalSec, value, ch.minThreshold, ch.maxThreshold, opts.now);
      const fmt = (n: number) => mFormatNumber(n, opts.locale, ch.precision);
      const t = verdictTone(v, opts.latestAvailable);
      const statusKey: ChannelStatusKey = !opts.latestAvailable ? 'na' : v.isOut ? 'out' : v.freshness;
      const mLabel = metricLabel(ch.metricCode);
      const hasThreshold = toThresholdNumber(ch.minThreshold) !== null || toThresholdNumber(ch.maxThreshold) !== null;
      const trend = opts.trends?.get(ch.idSensorChannel);
      const title = opts.context === 'project' ? `${nTitle} · ${mLabel}` : mLabel;
      const sub = opts.context === 'project'
        ? [node.address ? node.code : '', sensorLabel].filter(Boolean).join(' · ')
        : sensorLabel;
      rows.push({
        id: ch.idSensorChannel,
        nodeId: node.idNode || nid,
        sensorId: s.idSensor || '',
        title, sub,
        nodeTitle: nTitle,
        nodeCode: node.code,
        sensorLabel,
        metricLabel: mLabel,
        unit: (ch.unit || '').trim(),
        precision: ch.precision,
        value,
        valueText: opts.latestAvailable ? mFormatNumber(value, opts.locale, ch.precision) : '—',
        lastAt,
        verdict: v,
        statusKey,
        tone: t.tone,
        statusLabel: t.label,
        thresholdText: thresholdText(ch.minThreshold, ch.maxThreshold, ch.unit, fmt),
        outText: (v.isOut || v.isLateOut) ? outOfRangeText(v.threshold, ch.minThreshold, ch.maxThreshold, fmt) + (v.isLateOut ? ' (data terlambat)' : '') : '',
        hasThreshold,
        updatedText: !opts.latestAvailable ? 'Nilai terakhir tidak tersedia'
          : lastAt ? `Data ${timeAgoId(lastAt, opts.now)}` : 'Belum pernah kirim',
        link: ['/mobile/p', opts.pid, 'nodes', node.idNode || nid, 'channels', ch.idSensorChannel],
        ...sparkDecor(trend ? sparkPath(trend.buckets) : ''),
        sparkMin: trend?.stats?.min != null ? fmt(Number(trend.stats.min)) : '',
        sparkMax: trend?.stats?.max != null ? fmt(Number(trend.stats.max)) : '',
        hay: `${nTitle} ${node.code} ${node.name} ${sensorLabel} ${ch.metricCode || ''} ${mLabel}`.toLowerCase()
      });
    }
  }
  return rows;
}

/**
 * Hiasan visual sparkline dari path `sparkPath` (titik TIDAK dihitung ulang): area per segmen
 * (putus = tidak diisi) dan titik terakhir.
 */
export function sparkDecor(d: string): { spark: string; sparkArea: string; sparkEnd: { x: number; y: number } | null } {
  if (!d) { return { spark: '', sparkArea: '', sparkEnd: null }; }
  const base = SPARK_H.toFixed(1);
  let area = '';
  let end: { x: number; y: number } | null = null;
  for (const seg of d.split('M').map((x) => x.trim()).filter(Boolean)) {
    const pts = seg.split('L').map((x) => x.trim()).filter(Boolean);
    const first = pts[0].split(',');
    const last = pts[pts.length - 1].split(',');
    end = { x: Number(last[0]), y: Number(last[1]) };
    if (pts.length < 2) { continue; }
    area += `M${first[0]},${base} L${pts.join(' L')} L${last[0]},${base} Z `;
  }
  return { spark: d, sparkArea: area.trim(), sparkEnd: end };
}

/** Metrik kunci operator (tekanan/debit dulu) untuk Ringkasan & daftar Perangkat. */
const KEY_METRIC_RANK: Record<string, number> = { Tekanan: 0, Debit: 1, Level: 2, Kecepatan: 3 };

export interface KeyReading {
  id: string; label: string; valueText: string; unit: string;
  /** di luar ambang (angka merah) */
  out: boolean;
  /** data terlambat/offline: angka tetap tampil, diredupkan */
  stale: boolean;
}

/**
 * Nilai kunci per perangkat dari baris channel yang SUDAH dimuat store (tanpa request baru).
 * Hanya channel yang punya nilai; urut tekanan → debit → level → kecepatan.
 */
export function keyReadingsByNode(rows: ChannelRow[], max = 2): Map<string, KeyReading[]> {
  const out = new Map<string, KeyReading[]>();
  const keyed = rows
    .filter((r) => r.value !== null && r.valueText !== '—' && KEY_METRIC_RANK[r.metricLabel] !== undefined)
    .sort((a, b) => KEY_METRIC_RANK[a.metricLabel] - KEY_METRIC_RANK[b.metricLabel]);
  for (const r of keyed) {
    const list = out.get(r.nodeId) || [];
    if (list.length >= max) { continue; }
    list.push({
      id: r.id, label: r.metricLabel, valueText: r.valueText, unit: r.unit,
      out: r.verdict.isOut, stale: r.statusKey === 'stale' || r.statusKey === 'offline'
    });
    out.set(r.nodeId, list);
  }
  return out;
}

/** Urutan bawaan: bermasalah di atas, lalu alamat, lalu metrik. */
export const CHANNEL_STATUS_ORDER: Record<ChannelStatusKey, number> = { out: 0, offline: 1, stale: 2, nodata: 3, na: 4, fresh: 5 };

export function sortChannelRows(rows: ChannelRow[]): ChannelRow[] {
  return rows.slice().sort((a, b) =>
    (CHANNEL_STATUS_ORDER[a.statusKey] - CHANNEL_STATUS_ORDER[b.statusKey]) ||
    a.nodeTitle.localeCompare(b.nodeTitle, 'id') || a.metricLabel.localeCompare(b.metricLabel, 'id'));
}
