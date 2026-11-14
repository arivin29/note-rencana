/** Waktu relatif: pakai `timeAgoId` dari src/app/shared/utils/channel-display.ts (relTime dihapus). */

export interface ChartPoint { t: number; v: number; }

/** Bangun path SVG (garis + area) dari titik {t,v}. Untuk mini line chart. */
export function buildChartPaths(points: ChartPoint[], W = 320, H = 130, pad = 6): { path: string; area: string } {
  if (points.length < 2) { return { path: '', area: '' }; }
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.v);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const sx = (t: number) => pad + (W - 2 * pad) * (t - minX) / (maxX - minX || 1);
  const sy = (v: number) => pad + (H - 2 * pad) * (1 - (v - minY) / (maxY - minY || 1));
  const pts = points.map((p) => `${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`);
  return {
    path: 'M' + pts.join(' L'),
    area: `M${sx(minX).toFixed(1)},${(H - pad).toFixed(1)} L` + pts.join(' L') + ` L${sx(maxX).toFixed(1)},${(H - pad).toFixed(1)} Z`
  };
}

/** Timestamp dari backend → null bila kosong atau zero-time Go (`0001-01-01…`), supaya tidak tampil "739933 hari lalu". */
export function cleanTs<T extends string | Date | null | undefined>(v: T): T | null {
  if (!v) { return null; }
  return String(v).startsWith('0001-') ? null : v;
}
