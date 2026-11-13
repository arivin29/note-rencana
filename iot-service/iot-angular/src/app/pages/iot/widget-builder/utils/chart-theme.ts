/**
 * Chart colours shared by the widget renderers and wizard previews.
 * `CHART_SERIES_PALETTE` is the ONE series palette (saturated hues that read on both the dark and
 * light theme); text/axis/tooltip colours come from Bootstrap CSS vars via `readChartTheme()`.
 * Everything except `readChartTheme` is pure (tested with `npx tsx --test`).
 */
export const CHART_SERIES_PALETTE: readonly string[] = [
  '#73bf69', '#5794f2', '#ff9830', '#f2495c', '#b877d9', '#ff6eb4', '#4ec5d4', '#fade2a',
];

export interface ChartTheme {
  dark: boolean;
  /** Axis labels, legend text. */
  text: string;
  axisLine: string;
  splitLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  /** Default threshold colour. */
  danger: string;
  /** Legend page icon (inactive). */
  inactive: string;
  palette: readonly string[];
}

export const DARK_CHART_THEME: ChartTheme = {
  dark: true,
  text: 'rgba(255, 255, 255, 0.8)',
  axisLine: 'rgba(255, 255, 255, 0.2)',
  splitLine: 'rgba(255, 255, 255, 0.1)',
  tooltipBg: 'rgba(0, 0, 0, 0.85)',
  tooltipBorder: 'rgba(255, 255, 255, 0.2)',
  tooltipText: '#fff',
  danger: '#f2495c',
  inactive: '#555',
  palette: CHART_SERIES_PALETTE,
};

export const LIGHT_CHART_THEME: ChartTheme = {
  dark: false,
  text: 'rgba(33, 37, 41, 0.85)',
  axisLine: 'rgba(33, 37, 41, 0.25)',
  splitLine: 'rgba(33, 37, 41, 0.1)',
  tooltipBg: 'rgba(255, 255, 255, 0.97)',
  tooltipBorder: 'rgba(0, 0, 0, 0.15)',
  tooltipText: '#212529',
  danger: '#dc3545',
  inactive: '#adb5bd',
  palette: CHART_SERIES_PALETTE,
};

/**
 * Current theme from `data-bs-theme` (app default = dark) + Bootstrap vars when present.
 * Call again (and rebuild chart options) when `data-bs-theme` changes.
 */
export function readChartTheme(): ChartTheme {
  if (typeof document === 'undefined') return DARK_CHART_THEME;
  const root = document.documentElement;
  const dark = (root.getAttribute('data-bs-theme') || 'dark') !== 'light';
  const base = dark ? DARK_CHART_THEME : LIGHT_CHART_THEME;
  const css = getComputedStyle(root);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const rgb = v('--bs-body-color-rgb'); // "r, g, b"
  const danger = v('--bs-danger');
  if (!/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(rgb)) return { ...base, danger: danger || base.danger };
  return {
    ...base,
    text: `rgba(${rgb}, ${dark ? 0.8 : 0.85})`,
    axisLine: `rgba(${rgb}, ${dark ? 0.2 : 0.25})`,
    splitLine: `rgba(${rgb}, 0.1)`,
    danger: danger || base.danger,
  };
}

/** Observe `data-bs-theme` on <html>; returns a disconnect function. */
export function observeThemeChange(onChange: () => void): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => undefined;
  const obs = new MutationObserver(() => onChange());
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
  return () => obs.disconnect();
}
