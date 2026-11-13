/**
 * ECharts options for the `line-chart` widget — ONE pure builder used by the dashboard renderer
 * (LineChartWidgetComponent), the Expert wizard preview and the Template wizard preview.
 * No Angular/DOM imports (theme + sizes come in via `ctx`); tested with `npx tsx --test`.
 *
 * - Timestamps on xField → `type:'time'` axis with [ms, value] points, so data holes keep their
 *   real width; holes much longer than the usual sample step break the line (null point).
 * - Non-time xField → category axis (old behaviour, seriesField rows bucketed per minute).
 * - Y-axis tick count follows the plot height (`yAxisSplitNumber`), ticks drop needless decimals.
 * - Output already passed through `scaleChartFonts(ctx.fontScale)`.
 */
import { scaleChartFonts } from './chart-scale';
import { DARK_CHART_THEME, ChartTheme } from './chart-theme';
import { formatHm, formatHms, formatIdNumber } from './format-id';

export interface LineChartContext {
  /** Chart host width in px (0/undefined = unknown). */
  width?: number;
  /** Chart host height in px (0/undefined = unknown → ECharts default tick count). */
  height?: number;
  /** Text scale (TV screen fit × "Ukuran huruf"). */
  fontScale?: number;
  theme?: ChartTheme;
  /** Multi-query definitions (colour/alias per `_source`), defaults to `config.queries`. */
  queries?: { alias?: string; name?: string; color?: string }[];
}

export interface SmoothingConfig {
  enabled: boolean;
  threshold: number;
  minConsecutive: number;
  method: 'interpolate' | 'average' | 'previous';
}

// ── pure helpers (exported for tests) ────────────────────────────────────────

/** Timestamp in ms, or NaN. Accepts Date, epoch ms (≥ 1e11), ISO and ClickHouse "YYYY-MM-DD HH:MM:SS" (UTC). */
export function parseTimeValue(value: any): number {
  if (value === null || value === undefined || value === '') return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) >= 1e11 ? value : NaN;
  const str = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(str)) return NaN;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) {
    // ClickHouse / PG text without zone = UTC
    const hasZone = /(Z|[+-]\d{2}(:?\d{2})?)$/.test(str);
    return new Date(str.replace(' ', 'T') + (hasZone ? '' : 'Z')).getTime();
  }
  return new Date(str).getTime();
}

/** True when every non-empty value is a timestamp (and there is at least one). */
export function isTimeSeries(values: any[]): boolean {
  let seen = 0;
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    if (!Number.isFinite(parseTimeValue(v))) return false;
    seen++;
  }
  return seen > 0;
}

/** Y tick count that keeps labels apart: ~2.2 label heights per tick, clamped to 2..5. */
export function yAxisSplitNumber(plotHeightPx: number, fontPx: number): number {
  if (!(plotHeightPx > 0) || !(fontPx > 0)) return 5;
  return Math.max(2, Math.min(5, Math.floor(plotHeightPx / (fontPx * 2.2))));
}

/** Axis tick label: as few decimals as the tick needs (≤ maxDecimals) — 120 not "120,00", 0,25 stays. */
export function formatAxisTick(value: number, maxDecimals = 2): string {
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  const max = Math.max(0, Math.min(6, Math.round(maxDecimals)));
  for (let d = 0; d < max; d++) {
    const f = Math.pow(10, d);
    if (Math.abs(Math.round(v * f) / f - v) < 1e-9 * Math.max(1, Math.abs(v))) return formatIdNumber(v, d);
  }
  return formatIdNumber(v, max);
}

/**
 * Sorted [ms, value] points with a null point inserted inside holes longer than
 * `factor` × the median sample step (connectNulls:false then breaks the line there).
 */
export function insertGapBreaks(points: [number, number | null][], factor = 5): [number, number | null][] {
  if (points.length < 3) return points;
  const steps: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const d = points[i][0] - points[i - 1][0];
    if (d > 0) steps.push(d);
  }
  if (steps.length < 2) return points;
  const sorted = [...steps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (!(median > 0)) return points;
  const limit = median * factor;
  const out: [number, number | null][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1][0];
    const cur = points[i][0];
    if (cur - prev > limit) out.push([Math.round((prev + cur) / 2), null]);
    out.push(points[i]);
  }
  return out;
}

/** Number or null (never a fake 0 for missing/garbage cells). */
function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Outlier smoothing (median-based; isolated spikes shorter than minConsecutive are replaced). */
export function smoothSeries(values: (number | null)[], config: SmoothingConfig): (number | null)[] {
  if (!config?.enabled || values.length < 3) return values;
  const threshold = (config.threshold ?? 50) / 100;
  const minConsecutive = config.minConsecutive ?? 3;
  const method = config.method || 'interpolate';
  const valid = values.filter(v => v !== null && v !== undefined) as number[];
  if (valid.length < 3) return values;
  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const lower = median * threshold;
  const upper = median * (2 - threshold);
  const isOutlier = values.map(v => v !== null && v !== undefined && (v < lower || v > upper));
  const result = [...values];
  let i = 0;
  while (i < values.length) {
    if (!isOutlier[i]) { i++; continue; }
    let run = 1;
    while (i + run < values.length && isOutlier[i + run]) run++;
    if (run < minConsecutive) {
      let p = i - 1;
      while (p >= 0 && (values[p] === null || isOutlier[p])) p--;
      let n = i + run;
      while (n < values.length && (values[n] === null || isOutlier[n])) n++;
      const prev = p >= 0 ? values[p] : null;
      const next = n < values.length ? values[n] : null;
      for (let j = i; j < i + run; j++) {
        if (method === 'interpolate' && prev !== null && next !== null) {
          result[j] = prev + (next - prev) * ((j - i + 1) / (run + 1));
        } else if (method === 'average' && prev !== null && next !== null) {
          result[j] = (prev + next) / 2;
        } else if (method === 'previous' && prev !== null) {
          result[j] = prev;
        } else if (next !== null) {
          result[j] = next;
        }
      }
    }
    i += run;
  }
  return result;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** X label for a time value: explicit `timeFormat`, else by data span (≤24 h "HH:mm", ≤7 d "DD Mmm\nHH:mm", …). */
export function formatTimeLabel(ms: number, spanHours: number, timeFormat?: string): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  switch (timeFormat) {
    case 'HH:mm': return formatHm(d);
    case 'HH:mm:ss': return formatHms(d);
    case 'DD/MM': return `${dd}/${mm}`;
    case 'DD/MM HH:mm': return `${dd}/${mm} ${formatHm(d)}`;
    case 'YYYY-MM-DD': return `${d.getFullYear()}-${mm}-${dd}`;
  }
  if (spanHours <= 24) return formatHm(d);
  if (spanHours <= 168) return `${dd} ${ID_MONTHS[d.getMonth()]}\n${formatHm(d)}`;
  if (spanHours <= 2160) return `${dd}/${mm}`;
  return `${mm}/${d.getFullYear()}`;
}

function formatTooltipTime(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${formatHms(d)}`;
}

// ── builder ──────────────────────────────────────────────────────────────────

/** Axis text base before fontScale: 12, or 14.4 when enlarged (TV / fontScale > 1 → ~22 design-px). */
export function lineAxisFontBase(scale: number): number {
  return scale > 1 ? 14.4 : 12;
}

export function buildLineChartOptions(config: any, data: any[], ctx: LineChartContext = {}): any | null {
  if (!config || !Array.isArray(data) || data.length === 0) return null;

  const theme = ctx.theme || DARK_CHART_THEME;
  const s = Number.isFinite(ctx.fontScale) && (ctx.fontScale as number) > 0 ? (ctx.fontScale as number) : 1;
  const width = ctx.width && ctx.width > 0 ? ctx.width : 0;
  const height = ctx.height && ctx.height > 0 ? ctx.height : 0;

  const mapping: any = config.mapping || {};
  const display: any = config.display || {};
  const seriesConfig: any[] = config.series || [];
  const yAxisCfg: any = config.yAxis || {};
  const xField: string = mapping.xField || 'timestamp';
  const yFields: string[] = Array.isArray(mapping.yFields) && mapping.yFields.length
    ? mapping.yFields
    : [mapping.yField || 'value'];
  const seriesField: string = mapping.seriesField || '';
  const decimals: number = yAxisCfg.decimals ?? 2;
  const unit: string = yAxisCfg.unit || '';
  const legendOn = display.showLegend !== false;
  const legendPos = display.legendPosition || 'top';
  const hasYName = !!yAxisCfg.label;
  const axisFs = lineAxisFontBase(s);
  const fontPx = axisFs * s;
  const smoothing: SmoothingConfig = display.smoothing || { enabled: false, threshold: 50, minConsecutive: 3, method: 'interpolate' };
  const palette = theme.palette.length ? theme.palette : DARK_CHART_THEME.palette;
  const queries = ctx.queries || config.queries || [];
  const isMultiQuerySource = seriesField === '_source' && queries.length > 1;

  const xValues = data.map(r => r?.[xField]);
  const timeMode = isTimeSeries(xValues);
  const times = timeMode ? xValues.map(parseTimeValue).filter(Number.isFinite) : [];
  const spanHours = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 3_600_000 : 1;
  const timeFormat = config.xAxis?.timeFormat && config.xAxis.timeFormat !== 'auto' ? config.xAxis.timeFormat : undefined;
  const fmtX = (v: any): string => {
    const ms = parseTimeValue(v);
    return Number.isFinite(ms) ? formatTimeLabel(ms, spanHours, timeFormat) : String(v ?? '');
  };

  const lineType = display.lineStyle;
  const baseSeries = (name: string, color: string, visible: boolean, points: any[]) => ({
    name,
    type: 'line',
    data: points,
    smooth: lineType === 'smooth',
    step: lineType === 'step' ? 'middle' : false,
    connectNulls: false,
    showSymbol: visible && display.showPoints === 'always',
    lineStyle: { width: visible ? (display.lineWidth || 2) : 0, opacity: visible ? 1 : 0 },
    areaStyle: display.fillOpacity && visible ? { opacity: display.fillOpacity / 100 } : undefined,
    itemStyle: { color, opacity: visible ? 1 : 0 },
  });

  /** Sort by time, smooth values, then break the line inside long holes. */
  const timePoints = (rows: any[], field: string): [number, number | null][] => {
    const pts = rows
      .map(r => [parseTimeValue(r[xField]), toNum(r[field] ?? (field === yFields[0] ? r['value'] : undefined))] as [number, number | null])
      .filter(p => Number.isFinite(p[0]))
      .sort((a, b) => a[0] - b[0]);
    const vals = smoothSeries(pts.map(p => p[1]), smoothing);
    return insertGapBreaks(pts.map((p, i) => [p[0], vals[i]] as [number, number | null]));
  };

  let series: any[] = [];
  let categories: string[] = [];
  let rawCategory: any[] = []; // category mode: raw x per index (tooltip)

  if (seriesField && data[0]?.[seriesField] !== undefined && data[0]?.[seriesField] !== null && data[0]?.[seriesField] !== '') {
    const names = [...new Set(data.map(r => r[seriesField]))];
    const valueField = yFields[0];
    const seriesMeta = (name: any, idx: number) => {
      const sc: any = seriesConfig.find((c: any) => c.field === name) || {};
      let color = sc.color || palette[idx % palette.length];
      if (!sc.color && isMultiQuerySource) {
        const q = queries.find((q: any) => q.alias === name || q.name === name);
        if (q?.color) color = q.color;
      }
      let label = sc.label && sc.label !== name ? sc.label : String(name);
      if (isMultiQuerySource && (!sc.label || sc.label === name)) label = `${name}: ${valueField || 'value'}`;
      return { color, label, visible: sc.visible !== false };
    };

    if (timeMode) {
      series = names.map((name, idx) => {
        const m = seriesMeta(name, idx);
        return baseSeries(m.label, m.color, m.visible, timePoints(data.filter(r => r[seriesField] === name), valueField));
      });
    } else {
      // Category axis: align rows of different series on the same x value
      const grouped: Record<string, Record<string, number | null>> = {};
      data.forEach(r => {
        const key = String(r[xField] ?? '');
        (grouped[r[seriesField]] ||= {})[key] = toNum(r[valueField] ?? r['value']);
      });
      rawCategory = [...new Set(data.map(r => String(r[xField] ?? '')))];
      categories = rawCategory.map(fmtX);
      series = names.map((name, idx) => {
        const m = seriesMeta(name, idx);
        const vals = smoothSeries(rawCategory.map(k => grouped[name]?.[k] ?? null), smoothing);
        return baseSeries(m.label, m.color, m.visible, vals);
      });
    }
  } else {
    if (!timeMode) {
      rawCategory = xValues;
      categories = xValues.map(fmtX);
    }
    series = yFields.map((field, idx) => {
      const sc: any = seriesConfig.find((c: any) => c.field === field) || {};
      const color = sc.color || palette[idx % palette.length];
      const points = timeMode
        ? timePoints(data, field)
        : smoothSeries(data.map(r => toNum(r[field] ?? (idx === 0 ? r['value'] : undefined))), smoothing);
      return baseSeries(sc.label || field, color, sc.visible !== false, points);
    });
  }

  // Thresholds (manual value, or a field of the first row)
  const thresholds: any[] = config.thresholds || [];
  if (thresholds.length > 0 && series.length > 0) {
    const lines = thresholds
      .map((t: any) => {
        const value = t.mode === 'field' && t.field ? toNum(data[0]?.[t.field]) : toNum(t.value);
        if (value === null) return null;
        const color = t.color || theme.danger;
        return {
          yAxis: value,
          label: {
            show: true,
            // inside the plot (above the line, right end) so it's never clipped by grid.right
            position: 'insideEndTop',
            fontSize: 12,
            formatter: t.label || formatIdNumber(value, decimals),
            color,
          },
          lineStyle: { color, type: t.lineStyle || 'dashed' },
        };
      })
      .filter(Boolean);
    if (lines.length) series[0].markLine = { silent: true, symbol: 'none', data: lines };
  }

  const seriesDecimals = (name: string): number => {
    const sc: any = seriesConfig.find((c: any) => c.field === name || c.label === name);
    return sc?.decimals ?? decimals;
  };
  const seriesUnit = (name: string): string => {
    const sc: any = seriesConfig.find((c: any) => c.field === name || c.label === name);
    return sc?.unit || unit;
  };

  // ── geometry (scaleChartFonts doesn't touch it → × s here) ──
  const legendTopPx = legendOn && legendPos !== 'bottom' && legendPos !== 'right' ? 34 : 14;
  const gridTop = legendTopPx * s + (hasYName ? (axisFs + 4) * s : 0);
  const gridBottom = (legendOn && legendPos === 'bottom' ? 30 : 6) * s;
  const xLabelLines = !timeFormat && spanHours > 24 && spanHours <= 168 ? 2 : 1;
  const xLabelH = fontPx * 1.4 * xLabelLines + 8 * s;
  const plotH = height ? height - gridTop - gridBottom - xLabelH : 0;
  const ySplit = yAxisSplitNumber(plotH, fontPx);

  const plotW = width ? width - 60 * s : 0;
  const xLabelW = (timeFormat === 'DD/MM HH:mm' || timeFormat === 'YYYY-MM-DD' ? 85 : 45) * s * (axisFs / 12);
  const xSplit = plotW > 0 ? Math.max(2, Math.min(10, Math.floor(plotW / (xLabelW * 1.8)))) : 5;

  const placement = yAxisCfg.placement;
  const showGrid = yAxisCfg.showGrid !== 'off';
  const toAxisNum = (v: any) => (v === null || v === undefined || v === '' ? undefined : toNum(v) ?? undefined);

  const xAxis: any = timeMode
    ? {
        type: 'time',
        min: 'dataMin',
        max: 'dataMax',
        splitNumber: xSplit,
        name: config.xAxis?.label || '',
        axisLabel: {
          color: theme.text,
          fontSize: axisFs,
          hideOverlap: true,
          showMinLabel: false,
          showMaxLabel: false,
          formatter: (v: number) => formatTimeLabel(v, spanHours, timeFormat),
        },
        axisLine: { lineStyle: { color: theme.axisLine } },
        splitLine: { show: false },
      }
    : {
        type: 'category',
        data: categories,
        name: config.xAxis?.label || '',
        axisLabel: {
          color: theme.text,
          fontSize: axisFs,
          interval: categoryLabelInterval(categories.length, plotW, xLabelW),
          showMinLabel: true,
          // last label collides with its neighbour when the interval doesn't land on it
          showMaxLabel: false,
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: theme.axisLine } },
        splitLine: { show: false },
      };

  const tooltipTime = (params: any[]): string => {
    const p = params[0];
    if (!p) return '';
    if (timeMode) {
      const ms = Array.isArray(p.value) ? p.value[0] : p.axisValue;
      return formatTooltipTime(Number(ms));
    }
    const raw = rawCategory[p.dataIndex];
    const ms = parseTimeValue(raw);
    return Number.isFinite(ms) ? formatTooltipTime(ms) : String(p.axisValue ?? '');
  };

  const options: any = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText },
      formatter: (params: any) => {
        if (!Array.isArray(params)) params = [params];
        let html = `<div style="font-weight:600;margin-bottom:4px">${tooltipTime(params)}</div>`;
        params.forEach((item: any) => {
          const raw = Array.isArray(item.value) ? item.value[1] : item.value;
          const num = toNum(raw);
          if (num === null) return;
          const u = seriesUnit(item.seriesName);
          html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>${item.marker} ${item.seriesName}</span>
                <span style="font-weight:600">${formatIdNumber(num, seriesDecimals(item.seriesName))}${u ? ' ' + u : ''}</span>
              </div>`;
        });
        return html;
      },
    },
    legend: legendOn
      ? {
          show: true,
          type: 'scroll',
          top: legendPos === 'bottom' ? undefined : 6 * s,
          bottom: legendPos === 'bottom' ? 0 : undefined,
          left: legendPos === 'right' ? undefined : 'center',
          right: legendPos === 'right' ? 10 * s : undefined,
          orient: legendPos === 'right' ? 'vertical' : 'horizontal',
          itemWidth: 22 * s,
          itemHeight: 12 * s,
          itemGap: 12 * s,
          textStyle: {
            color: theme.text,
            fontSize: 12,
            width: 140 * s, // max legend text width (geometry → scaled by hand)
            overflow: 'truncate',
            ellipsis: '…',
          },
          pageButtonItemGap: 5 * s,
          pageButtonGap: 10 * s,
          pageIconSize: 12 * s,
          pageIconColor: palette[0],
          pageIconInactiveColor: theme.inactive,
          pageTextStyle: { color: theme.text, fontSize: 11 },
          tooltip: { show: true },
        }
      : { show: false },
    grid: {
      // containLabel: margins are measured outside the axis labels, so they never clip at any font size
      containLabel: true,
      left: 8 * s,
      right: legendOn && legendPos === 'right' ? 160 * s : 16 * s,
      top: gridTop,
      bottom: gridBottom,
    },
    xAxis,
    yAxis: {
      type: yAxisCfg.scale === 'log' ? 'log' : 'value',
      show: placement !== 'hidden',
      position: placement === 'right' ? 'right' : 'left',
      name: yAxisCfg.label || '',
      nameTextStyle: { color: theme.text, fontSize: axisFs, align: placement === 'right' ? 'right' : 'left' },
      nameGap: 8 * s,
      min: toAxisNum(yAxisCfg.min),
      max: toAxisNum(yAxisCfg.max),
      splitNumber: ySplit,
      axisLabel: {
        color: theme.text,
        fontSize: axisFs,
        hideOverlap: true,
        formatter: (value: number) => formatAxisTick(value, decimals),
      },
      axisLine: { lineStyle: { color: theme.axisLine } },
      splitLine: { show: showGrid, lineStyle: { color: theme.splitLine } },
    },
    series,
  };

  return scaleChartFonts(options, s);
}

/** Category axis label interval from available width (0 = every label). */
function categoryLabelInterval(total: number, plotW: number, labelW: number): number {
  if (total <= 6) return 0;
  const avail = plotW > 0 ? plotW : 300;
  const maxLabels = Math.floor(avail / labelW);
  if (maxLabels <= 0) return total - 1;
  if (maxLabels >= total) return 0;
  return Math.ceil(total / maxLabels) - 1;
}
