/**
 * Threshold & precision helpers shared by list and detail pages.
 * Thresholds: null/undefined = NOT CONFIGURED (never treat as 0 or as "normal").
 * A threshold of 0 is a real value — always compare against null, not truthiness.
 */
export type ThresholdState = 'below' | 'above' | 'ok' | 'unset' | 'novalue';

export function toThresholdNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function thresholdState(value: any, min: any, max: any): ThresholdState {
  const lo = toThresholdNumber(min);
  const hi = toThresholdNumber(max);
  if (lo === null && hi === null) return 'unset';
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) return 'novalue';
  const v = Number(value);
  if (lo !== null && v < lo) return 'below';
  if (hi !== null && v > hi) return 'above';
  return 'ok';
}

/**
 * `sensor_channels.precision` has two meanings in production data:
 *   p < 1  → a step (0.01 → 2 decimals, 0.001 → 3)
 *   p >= 1 → a decimal count (2 → 2 decimals)
 *   null/0 → default 2 decimals
 */
export function decimalsFromPrecision(precision: any, fallback = 2): number {
  const p = Number(precision);
  if (!p || isNaN(p) || p < 0) return fallback;
  if (p >= 1) return Math.min(6, Math.round(p));

  // Step branch: count the decimals the step ACTUALLY needs, don't derive them
  // from log10. log10 only works for powers of ten — a step of 0.25 gives
  // ceil(0.602) = 1 decimal and renders 0.25 as "0.3"; 0.75 becomes "0.8".
  // The step's own decimal places are the exact answer.
  const text = String(p);
  const fraction = text.includes('e') ? '' : (text.split('.')[1] || '');
  if (fraction) return Math.min(6, fraction.length);

  // Exponent notation (1e-7) has no literal fraction — fall back to log10.
  return Math.min(6, Math.max(0, Math.ceil(-Math.log10(p))));
}

/** Excel number format for N decimals: 0 → "0", 2 → "0.00". */
export function excelNumFmt(decimals: number): string {
  return decimals > 0 ? '0.' + '0'.repeat(decimals) : '0';
}
