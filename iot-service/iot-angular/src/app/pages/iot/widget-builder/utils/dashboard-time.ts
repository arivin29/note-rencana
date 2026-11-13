/**
 * Pure time-range / refresh helpers for the dashboard view.
 * No Angular imports — unit-tested with `npx tsx --test`.
 */
import { TIME_RANGE_PRESETS, REFRESH_INTERVALS } from '../models/widget.models';

export type TimePreset = (typeof TIME_RANGE_PRESETS)[number];

const DEFAULT_PRESET = '24h';

export function findPreset(value: string): TimePreset | null {
  return TIME_RANGE_PRESETS.find(p => p.value === value) ?? null;
}

/**
 * Next window for an auto-refresh tick. Relative presets ("Last X") roll forward to `now`;
 * custom/absolute ranges (or unknown presets) stay exactly as they are.
 */
export function rollRange(
  preset: string,
  now: number,
  current: { from: number; to: number },
): { from: number; to: number } {
  const p = findPreset(preset);
  if (!p) return { from: current.from, to: current.to };
  return { from: now - p.duration, to: now };
}

/** Only intervals offered in the UI are accepted; anything else means "off". */
export function normalizeRefresh(seconds: unknown): number {
  return typeof seconds === 'number' && REFRESH_INTERVALS.some(r => r.value === seconds) ? seconds : 0;
}

/** Default preset from `custom_dashboards.time_range` ('6h', '24h', ...). */
export function defaultPresetFrom(timeRange: string | null | undefined): string {
  const v = (timeRange ?? '').trim();
  return findPreset(v) ? v : DEFAULT_PRESET;
}
