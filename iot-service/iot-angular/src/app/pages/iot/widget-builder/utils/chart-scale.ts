/**
 * Scale hardcoded pixel sizes in an ECharts option tree (TV mode: --wb-scale = box width / 1920).
 * Scales numeric `fontSize`, `lineHeight`, `symbolSize` everywhere and `width` inside `lineStyle`.
 * Returns the same reference when scale === 1; never mutates the input.
 */
const SCALED_KEYS = new Set(['fontSize', 'lineHeight', 'symbolSize']);

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function walk(value: any, scale: number, parentKey: string | null): any {
  if (Array.isArray(value)) return value.map(v => walk(v, scale, parentKey));
  if (value === null || typeof value !== 'object') return value;
  // Leave non-plain objects (Date, echarts graphic gradients, …) untouched.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'number' && (SCALED_KEYS.has(k) || (k === 'width' && parentKey === 'lineStyle'))) {
      out[k] = round1(v * scale);
    } else {
      out[k] = walk(v, scale, k);
    }
  }
  return out;
}

export function scaleChartFonts<T>(options: T, scale: number): T {
  if (!options || scale === 1 || !Number.isFinite(scale) || scale <= 0) return options;
  return walk(options, scale, null) as T;
}
