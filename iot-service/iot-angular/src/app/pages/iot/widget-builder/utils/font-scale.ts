/**
 * Per-dashboard text size ("Ukuran huruf") — custom_dashboards.layout_config.fontScale.
 * Applies to every dashboard (normal and TV); in TV mode it multiplies the screen-fit scale.
 * Pure, no Angular imports — tested with `npx tsx --test`.
 */
export interface FontScaleOption {
  value: number;
  label: string;
}

export const DEFAULT_FONT_SCALE = 1;

export const FONT_SCALE_OPTIONS: FontScaleOption[] = [
  { value: 0.85, label: 'Kecil' },
  { value: 1, label: 'Normal' },
  { value: 1.25, label: 'Besar' },
  { value: 1.5, label: 'Sangat besar' },
  { value: 1.75, label: 'Jarak jauh' },
  { value: 2, label: 'Ekstra' },
];

/** Returns layoutConfig.fontScale when it is one of the allowed options (number or numeric string), else 1. */
export function readFontScale(layoutConfig: unknown): number {
  const raw = (layoutConfig as any)?.fontScale;
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_FONT_SCALE;
  const hit = FONT_SCALE_OPTIONS.find(o => Math.abs(o.value - n) < 1e-6);
  return hit ? hit.value : DEFAULT_FONT_SCALE;
}

/** Final text scale for widgets: screen-fit scale (TV only) × chosen dashboard font size. */
export function combinedFontScale(screenScale: number, dashboardScale: number): number {
  const s = Number.isFinite(screenScale) && screenScale > 0 ? screenScale : 1;
  const d = Number.isFinite(dashboardScale) && dashboardScale > 0 ? dashboardScale : 1;
  return Math.round(s * d * 1000) / 1000;
}
