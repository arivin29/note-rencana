import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Widget } from '../../../models/widget.models';

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
    const currentValue = parseFloat(this.data[0]?.[valueField]) || 0;
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
        trendPercent = Math.abs(percent).toFixed(1) + '%';
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
      formattedValue: currentValue.toFixed(decimals),
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
      fontSize: options.fontSize || 'large'
    };
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
      case 'small': return 'fs-4';
      case 'medium': return 'fs-2';
      case 'large': return 'fs-1';
      case 'xlarge': return 'display-4';
      default: return 'fs-1';
    }
  }

  getLayoutClass(): string {
    const layout = this.displayData?.layout || 'centered';
    return `layout-${layout}`;
  }
}
