// ============================================================
// Number formatting for live values (keeps the existing `toFixed`
// style — dot decimal, fixed precision) but never shows "-0" /
// "-0.00": a tiny negative reading that rounds to zero is zero.
// ============================================================

/** `v.toFixed(precision)` without negative zero ("-0", "-0.00" → "0", "0.00"). */
export function fmtFixed(v: number, precision: number): string {
  const s = v.toFixed(precision)
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s
}
