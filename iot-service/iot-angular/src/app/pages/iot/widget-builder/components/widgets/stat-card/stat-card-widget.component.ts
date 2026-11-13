import { Component, Input, OnInit, OnChanges, SimpleChanges, HostBinding } from '@angular/core';
import { Widget } from '../../../models/widget.models';
import { formatIdNumber } from '../../../utils/format-id';

interface StatCardOptions {
  layout: 'centered' | 'left-aligned' | 'with-icon' | 'compact';
  icon: string;
  iconColor: string;
  prefix: string;
  suffix: string;
  showTrend: boolean;
  trendField: string;
  showSparkline: boolean;
  sparklineField: string;
  thresholdColors: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  valueColor: string;
  backgroundColor: string;
  /** Column whose first-row text is shown under the value (e.g. location, "dari 11 titik"). */
  subtitleField?: string;
}

interface Threshold {
  value: number;
  color: string;
  label: string;
}

@Component({
  selector: 'app-stat-card-widget',
  standalone: false,
  templateUrl: './stat-card-widget.component.html',
  styleUrls: ['./stat-card-widget.component.css']
})
export class StatCardWidgetComponent implements OnInit, OnChanges {
  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  /** TV mode text scale (box width / 1920). */
  @Input() fontScale = 1;

  @HostBinding('class.scaled') get scaled(): boolean {
    return this.fontScale !== 1;
  }
  /** Always set: every size in the CSS is em-relative to this (16px = 1rem at scale 1). */
  @HostBinding('style.font-size.px') get hostFontPx(): number {
    return 16 * (Number.isFinite(this.fontScale) && this.fontScale > 0 ? this.fontScale : 1);
  }

  /**
   * Fit inputs for the value-size clamp in CSS (all in em of the host font):
   * reserve = vertical space NOT available to the value (padding + lines under it + top icon),
   * wreserve = horizontal space not available, chars = value width in value-ems.
   */
  fit = { reserve: '1.5em', wreserve: '1.5em', chars: 4 };

  displayData: {
    value: number;
    formattedValue: string;
    title: string;
    unit: string;
    prefix: string;
    suffix: string;
    trend: 'up' | 'down' | null;
    trendValue: number | null;
    trendPercent: string;
    valueColor: string;
    icon: string;
    iconColor: string;
    layout: string;
    fontSize: string;
    subtitle: string;
  } | null = null;

  sparklineData: number[] = [];
  sparklineOptions: any = null;

  ngOnInit(): void {
    this.buildDisplayData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['widget']) {
      this.buildDisplayData();
    }
  }

  private buildDisplayData(): void {
    if (!this.widget || this.data.length === 0) {
      this.displayData = null;
      return;
    }

    const config = this.widget.config || {};
    const mapping: any = config.mapping || {};
    const display: any = config.display || {};
    const options: StatCardOptions = display.statCardOptions || this.getDefaultOptions();
    const thresholds: Threshold[] = config.thresholds || [];

    const valueField = mapping.valueField || 'value';
    // Missing/non-numeric value stays NaN → shown as "—" (never a fabricated 0)
    const currentValue = parseFloat(this.data[0]?.[valueField]);
    const unit = config.yAxis?.unit || '';
    const decimals = config.yAxis?.decimals ?? 2;

    // Calculate trend
    let trend: 'up' | 'down' | null = null;
    let trendValue: number | null = null;
    let trendPercent = '';

    if (options.showTrend && this.data.length > 1) {
      const trendField = options.trendField || valueField;
      const previousValue = parseFloat(this.data[1]?.[trendField]) || 0;
      
      if (previousValue !== 0) {
        const diff = currentValue - previousValue;
        trendValue = diff;
        const percent = (diff / Math.abs(previousValue)) * 100;
        trendPercent = formatIdNumber(Math.abs(percent), 1) + '%';
        trend = diff > 0 ? 'up' : diff < 0 ? 'down' : null;
      }
    }

    // Determine value color based on thresholds
    let valueColor = options.valueColor || '#ffffff';
    if (options.thresholdColors && thresholds.length > 0) {
      // Sort thresholds descending
      const sorted = [...thresholds].sort((a, b) => b.value - a.value);
      for (const t of sorted) {
        if (currentValue >= t.value) {
          valueColor = t.color;
          break;
        }
      }
    }

    // Build sparkline if enabled
    if (options.showSparkline) {
      this.buildSparkline(options.sparklineField || valueField);
    }

    this.displayData = {
      value: currentValue,
      formattedValue: formatIdNumber(currentValue, decimals),
      title: config.title || this.widget?.name || '',
      unit: unit,
      prefix: options.prefix || '',
      suffix: options.suffix || '',
      trend,
      trendValue,
      trendPercent,
      valueColor,
      icon: options.icon || '',
      iconColor: options.iconColor || '#73bf69',
      layout: options.layout || 'centered',
      fontSize: options.fontSize || 'large',
      subtitle: this.subtitleText(options.subtitleField)
    };
    this.fit = this.computeFit(this.displayData, !!options.showSparkline);
  }

  private computeFit(d: NonNullable<StatCardWidgetComponent['displayData']>, sparkline: boolean) {
    const layout = d.layout || 'centered';
    // Vertical: card padding 2×0.75em + 0.2em slack, then each extra line (font × line-height + margin).
    let reserve = 1.7;
    if (d.subtitle) reserve += 0.8125 * 1.25 + 0.25;
    if (d.trend && layout !== 'compact') reserve += 0.875 * 1.5 + 0.375;
    if (d.suffix && (layout === 'centered' || !layout)) reserve += 0.75 * 1.5 + 0.25;
    if (sparkline) reserve += 2.5 + 1;
    // Horizontal: padding + icon column (with-icon) + prefix.
    let wreserve = 1.5;
    if (d.icon && layout === 'with-icon') wreserve += 2.5 + 0.4;
    if (d.prefix) wreserve += d.prefix.length * 0.6;
    // Bold digits ≈ 0.58em each (separators narrower); unit is 0.875em of the row font, not of the value.
    const valueChars = Math.max(1, d.formattedValue.length) * 0.58;
    const sideChars = d.unit ? ((d.unit.length + 1) * 0.5 * 0.875) : 0;
    const iconBeside = d.icon && (layout === 'centered' || layout === 'left-aligned') ? 1.6 : 0;
    wreserve += sideChars + iconBeside;
    return {
      reserve: `calc(${reserve.toFixed(3)}em${d.icon && layout === 'centered' ? ' + var(--sv-icon-top, 0em)' : ''})`,
      wreserve: `${wreserve.toFixed(3)}em`,
      chars: Math.round((valueChars + 0.1) * 100) / 100
    };
  }

  private subtitleText(field: string | undefined): string {
    if (!field) return '';
    const v = this.data[0]?.[field];
    return v === null || v === undefined ? '' : String(v).trim();
  }

  private getDefaultOptions(): StatCardOptions {
    return {
      layout: 'centered',
      icon: '',
      iconColor: '#73bf69',
      prefix: '',
      suffix: '',
      showTrend: false,
      trendField: '',
      showSparkline: false,
      sparklineField: '',
      thresholdColors: true,
      fontSize: 'large',
      valueColor: '#ffffff',
      backgroundColor: ''
    };
  }

  private buildSparkline(field: string): void {
    // Extract last N values for sparkline
    const values = this.data
      .slice(0, 20)
      .reverse()
      .map(d => parseFloat(d[field]) || 0);
    
    this.sparklineData = values;

    // Build minimal echarts options for sparkline
    this.sparklineOptions = {
      grid: { top: 0, right: 0, bottom: 0, left: 0 },
      xAxis: { type: 'category', show: false, data: values.map((_, i) => i) },
      yAxis: { type: 'value', show: false },
      series: [{
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#73bf69' },
        areaStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(115, 191, 105, 0.3)' },
              { offset: 1, color: 'rgba(115, 191, 105, 0)' }
            ]
          }
        }
      }]
    };
  }

  getFontSizeClass(): string {
    switch (this.displayData?.fontSize) {
      case 'small': return 'sv-small';
      case 'medium': return 'sv-medium';
      case 'xlarge': return 'sv-xlarge';
      default: return 'sv-large';
    }
  }

  getLayoutClass(): string {
    const layout = this.displayData?.layout || 'centered';
    return `layout-${layout}`;
  }
}
