/**
 * Indonesian number display (decimal comma, dot thousands): 1234.5 → "1.234,50".
 * Pure, no Angular imports — tested with `npx tsx --test`.
 */
export function formatIdNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  const d = Math.max(0, Math.min(10, Math.round(decimals)));
  const fixed = Math.abs(value).toFixed(d);
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // avoid "-0,00"
  const negative = value < 0 && Number(fixed) !== 0;
  return (negative ? '-' : '') + grouped + (frac ? ',' + frac : '');
}
