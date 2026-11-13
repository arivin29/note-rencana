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

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local clock time "HH:mm" with a colon (id-ID locale would give "22.20"). */
export function formatHm(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Local clock time "HH:mm:ss" with colons. */
export function formatHms(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return `${formatHm(date)}:${pad2(date.getSeconds())}`;
}

/**
 * Inline badge colours for a hex/rgb(a)/hsl colour string (table statusMap), with a readable
 * text colour picked from luminance. Returns null for non-literal colours (e.g. bootstrap
 * names like "danger") so the caller can fall back to `bg-<name>` classes.
 */
export function badgeColorStyle(color: string | null | undefined): { background: string; color: string } | null {
  const c = (color || '').trim();
  if (!/^(#|rgb|hsl)/i.test(c)) return null;
  const rgb = parseRgb(c);
  // Unknown luminance (hsl / bad hex) → white text, which reads on most saturated status colours.
  if (!rgb) return { background: c, color: '#fff' };
  const [r, g, b] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // White text while contrast ≥ 3:1 (bold badge text, status-badge convention); else near-black.
  return { background: c, color: 1.05 / (lum + 0.05) >= 3 ? '#fff' : '#111' };
}

function parseRgb(c: string): [number, number, number] | null {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
