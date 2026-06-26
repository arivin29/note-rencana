/** Waktu relatif singkat (Bahasa Indonesia) untuk last-seen / timestamp. */
export function relTime(iso?: string | null): string {
  if (!iso) { return 'belum pernah'; }
  const t = new Date(iso).getTime();
  if (isNaN(t)) { return '-'; }
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) { return `${s} dtk lalu`; }
  const m = Math.floor(s / 60);
  if (m < 60) { return `${m} mnt lalu`; }
  const h = Math.floor(m / 60);
  if (h < 24) { return `${h} jam lalu`; }
  const d = Math.floor(h / 24);
  return `${d} hr lalu`;
}

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
