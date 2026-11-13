/**
 * Pure geometry for dashboards with a target screen ("Layar target", e.g. TV 16:9).
 * Stored in custom_dashboards.layout_config.screen. No Angular imports — tested with `npx tsx --test`.
 *
 * 'tv-16-9' serves both 1080p and 4K TVs: the layout scales with the box width
 * (design width 1920), so a 4K screen shows the same layout, just sharper.
 */
export type ScreenPreset = 'auto' | 'tv-16-9' | 'custom';

export interface ScreenConfig {
  preset: ScreenPreset;
  width: number;
  height: number;
  rows: number;
}

export const SCREEN_DEFAULT_ROWS = 12;
const MIN_ROWS = 4;
const MAX_ROWS = 48;
const TV_W = 1920;
const TV_H = 1080;

function clampRows(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : SCREEN_DEFAULT_ROWS;
  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, n));
}

export function readScreenConfig(layoutConfig: unknown): ScreenConfig {
  const raw = (layoutConfig as any)?.screen ?? {};
  const rows = clampRows(raw.rows);
  if (raw.preset === 'tv-16-9') {
    return { preset: 'tv-16-9', width: TV_W, height: TV_H, rows };
  }
  if (raw.preset === 'custom') {
    const w = Number(raw.width);
    const h = Number(raw.height);
    if (w > 0 && h > 0) return { preset: 'custom', width: Math.round(w), height: Math.round(h), rows };
  }
  return { preset: 'auto', width: TV_W, height: TV_H, rows: SCREEN_DEFAULT_ROWS };
}

/** Largest box with ratio ratioW:ratioH that fits inside availW × availH (contain). */
export function fitBox(availW: number, availH: number, ratioW: number, ratioH: number): { width: number; height: number } {
  if (availW <= 0 || availH <= 0 || ratioW <= 0 || ratioH <= 0) return { width: 0, height: 0 };
  const byWidthH = (availW * ratioH) / ratioW;
  if (byWidthH <= availH) {
    return { width: Math.floor(availW), height: Math.floor(byWidthH) };
  }
  return { width: Math.floor((availH * ratioW) / ratioH), height: Math.floor(availH) };
}

/** Gridster fixed row height so `rows` rows (+ margins) exactly fill boxH. */
export function rowHeight(boxH: number, rows: number, margin: number): number {
  return Math.max(8, Math.floor((boxH - margin * (rows + 1)) / rows));
}

/** Text scale relative to the design width (1 at 1920 px wide). */
export function fontScale(boxW: number, designW: number): number {
  if (designW <= 0) return 1;
  return Math.round((boxW / designW) * 1000) / 1000;
}

/** Widgets that extend below the last screen row. */
export function overflowIds(items: { id: string; y: number; rows: number }[], rows: number): string[] {
  return items.filter(i => i.y + i.rows > rows).map(i => i.id);
}
