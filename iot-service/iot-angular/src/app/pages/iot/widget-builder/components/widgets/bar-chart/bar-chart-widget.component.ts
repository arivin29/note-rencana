import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Widget } from '../../../models/widget.models';

@Component({
  selector: 'app-bar-chart-widget',
  standalone: false,
  templateUrl: './bar-chart-widget.component.html',
  styleUrls: ['./bar-chart-widget.component.css']
})
export class BarChartWidgetComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  private destroy$ = new Subject<void>();
  private resizeObserver: ResizeObserver | null = null;
  private resizeSubject$ = new Subject<void>();

  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  /** Container width in pixels from parent widget-container */
  @Input() containerWidth = 0;
  /** Container height in pixels from parent widget-container */
  @Input() containerHeight = 0;

  @Output() chartInit = new EventEmitter<any>();

  echartsInstance: any = null;
  chartOptions: any = null;

  constructor(
    private elementRef: ElementRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.setupResizeDebounce();
    this.buildChartOptions();
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChartOptions();
    }
    // Rebuild chart options when container dimensions change (affects label interval/format)
    if ((changes['containerWidth'] || changes['containerHeight']) && !changes['containerWidth']?.firstChange) {
      this.buildChartOptions();
      setTimeout(() => this.echartsInstance?.resize(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeSubject$.complete();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  onChartInit(ec: any): void {
    this.echartsInstance = ec;
    this.chartInit.emit(ec);
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeSubject$.next();
      });
      this.resizeObserver.observe(this.elementRef.nativeElement);
    });
  }

  private setupResizeDebounce(): void {
    this.resizeSubject$.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.ngZone.run(() => {
        if (this.echartsInstance) {
          this.echartsInstance.resize();
        }
      });
    });
  }

  private buildChartOptions(): void {
    if (!this.widget || this.data.length === 0) {
      this.chartOptions = null;
      return;
    }

    const config = this.widget.config || {};
    const mapping: any = config.mapping || {};
    const display: any = config.display || {};
    const yAxisConfig: any = config.yAxis || {};
    const seriesConfig: any[] = config.series || [];
    
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const axisLineColor = 'rgba(255, 255, 255, 0.2)';
    const decimals = yAxisConfig.decimals ?? 2;
    const unit = yAxisConfig.unit || '';
    const isHorizontal = display.barOrientation === 'horizontal';
    const showDataLabels = display.showDataLabels === true;
    
    const xField = mapping.xField || mapping.labelField || this.columns[0] || 'label';
    const yField = mapping.yField || mapping.yFields?.[0] || mapping.valueField || this.columns[1] || 'value';
    const seriesField = mapping.seriesField;
    
    // Color palette
    const colors = ['#73bf69', '#5794f2', '#ff9830', '#f2495c', '#b877d9', '#ff6eb4', '#4ec5d4', '#fade2a', '#42a5f5', '#26a69a'];

    // Border radius: [topLeft, topRight, bottomRight, bottomLeft]
    // For vertical: round top corners; For horizontal: round right corners
    const borderRadius = isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];

    let series: any[] = [];
    let categoryData: string[] = [];
    let legendData: string[] = [];

    // Check if we have seriesField (Group By) - for multi-bar grouped chart
    if (seriesField && this.data.length > 0 && this.data[0][seriesField] !== undefined) {
      // Get unique categories and series names
      const categories = [...new Set(this.data.map(r => String(r[xField])))];
      const seriesNames = [...new Set(this.data.map(r => String(r[seriesField])))];
      
      categoryData = categories;
      legendData = seriesNames;
      
      // Group data by series
      const groupedData: Record<string, Record<string, number>> = {};
      this.data.forEach(row => {
        const cat = String(row[xField]);
        const sName = String(row[seriesField]);
        const yVal = parseFloat(row[yField]) || 0;
        
        if (!groupedData[sName]) groupedData[sName] = {};
        groupedData[sName][cat] = yVal;
      });
      
      // Create series for each group
      series = seriesNames.map((name, idx) => {
        const sc: any = seriesConfig.find((s: any) => s.field === name) || {};
        const color = sc.color || colors[idx % colors.length];
        const visible = sc.visible !== false;
        
        return {
          name: sc.label || name,
          type: 'bar',
          data: categories.map(cat => groupedData[name]?.[cat] ?? 0),
          itemStyle: { 
            color,
            borderRadius,
            opacity: visible ? 1 : 0.3
          },
          barGap: '10%',
          emphasis: { focus: 'series' },
          label: showDataLabels ? {
            show: true,
            position: isHorizontal ? 'right' : 'top',
            color: textColor,
            fontSize: 10,
            formatter: (p: any) => (p.data as number).toFixed(decimals)
          } : { show: false }
        };
      });
    } else {
      // Simple bar chart - single series
      categoryData = this.data.map(r => String(r[xField]));
      
      series = [{
        name: yField,
        type: 'bar',
        data: this.data.map(r => parseFloat(r[yField]) || 0),
        itemStyle: { 
          color: seriesConfig[0]?.color || colors[0],
          borderRadius
        },
        barMaxWidth: 60,
        label: showDataLabels ? {
          show: true,
          position: isHorizontal ? 'right' : 'top',
          color: textColor,
          fontSize: 10,
          formatter: (p: any) => (p.data as number).toFixed(decimals)
        } : { show: false }
      }];
    }

    // Add threshold lines if configured (on value axis)
    const thresholds = config.thresholds || [];
    if (thresholds.length > 0 && series.length > 0) {
      series[0].markLine = {
        silent: true,
        symbol: 'none',
        data: thresholds.map((t: any) => ({
          [isHorizontal ? 'xAxis' : 'yAxis']: t.value,
          label: { 
            show: true, 
            formatter: t.label || `${t.value}`,
            color: t.color || '#f2495c',
            position: 'end'
          },
          lineStyle: {
            color: t.color || '#f2495c',
            type: t.lineStyle || 'dashed',
            width: 2
          }
        }))
      };
    }

    // Axis configuration
    const showValueAxis = yAxisConfig.placement !== 'hidden';
    const valueAxisPosition = yAxisConfig.placement === 'right' ? 'right' : 'left';
    const showGridLines = yAxisConfig.showGrid === 'on' || (yAxisConfig.showGrid === 'auto' || yAxisConfig.showGrid === undefined);
    
    // Category axis config (labels)
    const categoryAxisConfig: any = {
      type: 'category',
      data: categoryData,
      axisLabel: { 
        color: textColor,
        fontSize: 10,
        interval: this.calcLabelInterval(categoryData.length, isHorizontal),
        rotate: this.shouldRotateLabels(categoryData.length, isHorizontal),
        width: isHorizontal ? 100 : 80,
        overflow: 'truncate',
        hideOverlap: true
      },
      axisLine: { lineStyle: { color: axisLineColor } },
      axisTick: { alignWithLabel: true }
    };
    
    // Value axis config (numbers)
    const valueAxisConfig: any = {
      type: 'value',
      show: showValueAxis,
      position: valueAxisPosition,
      name: yAxisConfig.label || '',
      nameTextStyle: { color: textColor, fontSize: 11 },
      min: yAxisConfig.min ?? undefined,
      max: yAxisConfig.max ?? undefined,
      axisLabel: { 
        color: textColor,
        fontSize: 10,
        formatter: (value: number) => value?.toFixed(decimals) || '0'
      },
      axisLine: { show: true, lineStyle: { color: axisLineColor } },
      splitLine: { 
        show: showGridLines,
        lineStyle: { color: axisLineColor, type: 'dashed' } 
      }
    };
    
    // Build chart options
    this.chartOptions = {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) params = [params];
          let html = `<div style="font-weight:600;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:4px">${params[0]?.axisValue || ''}</div>`;
          params.forEach((item: any) => {
            if (item.data !== undefined && item.data !== null) {
              const sc: any = seriesConfig.find((s: any) => s.field === item.seriesName || s.label === item.seriesName) || {};
              const d = sc.decimals ?? decimals;
              const u = sc.unit || unit;
              const val = typeof item.data === 'number' ? item.data.toFixed(d) : (parseFloat(item.data)?.toFixed(d) || item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:20px;padding:2px 0">
                <span>${item.marker} ${item.seriesName}</span>
                <span style="font-weight:600">${val}${u ? ' ' + u : ''}</span>
              </div>`;
            }
          });
          return html;
        }
      },
      legend: display.showLegend !== false && legendData.length > 1 ? {
        show: true,
        type: 'scroll', // Enable scroll for many legends
        data: legendData,
        // Position legend properly based on settings
        top: display.legendPosition === 'bottom' ? undefined : 8,
        bottom: display.legendPosition === 'bottom' ? 0 : undefined,
        left: display.legendPosition === 'right' ? undefined : 'center',
        right: display.legendPosition === 'right' ? 10 : undefined,
        orient: display.legendPosition === 'right' ? 'vertical' : 'horizontal',
        textStyle: { 
          color: textColor, 
          fontSize: 11,
          width: 120,
          overflow: 'truncate',
          ellipsis: '...'
        },
        itemWidth: 14,
        itemHeight: 10,
        pageButtonItemGap: 5,
        pageButtonGap: 10,
        pageIconColor: '#73bf69',
        pageIconInactiveColor: '#555',
        pageTextStyle: { color: textColor },
        tooltip: { show: true },
        formatter: (name: string) => {
          return name.length > 18 ? name.substring(0, 15) + '...' : name;
        }
      } : { show: false },
      grid: { 
        left: isHorizontal ? 100 : (showValueAxis && valueAxisPosition === 'left' ? 55 : 12), 
        right: isHorizontal 
          ? (showDataLabels ? 50 : 20) 
          : (display.legendPosition === 'right' && display.showLegend !== false && legendData.length > 1 ? 140 : (showValueAxis && valueAxisPosition === 'right' ? 55 : 12)), 
        // Top: add space for legend at top
        top: display.legendPosition !== 'bottom' && display.showLegend !== false && legendData.length > 1 ? 35 : 20, 
        // Bottom: add space for legend at bottom + x-axis labels
        bottom: display.legendPosition === 'bottom' && display.showLegend !== false && legendData.length > 1
          ? (this.shouldRotateLabels(categoryData.length, isHorizontal) ? 75 : 50)
          : (this.shouldRotateLabels(categoryData.length, isHorizontal) ? 50 : 30), 
        containLabel: false 
      },
      // For horizontal: xAxis is value, yAxis is category
      // For vertical: xAxis is category, yAxis is value
      xAxis: isHorizontal ? valueAxisConfig : categoryAxisConfig,
      yAxis: isHorizontal ? categoryAxisConfig : valueAxisConfig,
      series
    };
  }

  /**
   * Calculate label interval based on container width/height and data points.
   * For vertical bars: use width; For horizontal bars: use height.
   */
  private calcLabelInterval(totalLabels: number, isHorizontal: boolean): number | 'auto' {
    if (totalLabels <= 6) return 0; // show all for small datasets
    
    // Calculate based on available space
    const availableSpace = isHorizontal 
      ? (this.containerHeight > 0 ? this.containerHeight - 80 : 200)  // vertical space for horizontal bars
      : (this.containerWidth > 0 ? this.containerWidth - 80 : 300);   // horizontal space for vertical bars
    
    const labelSize = isHorizontal ? 20 : 50; // approx pixels per label
    const maxLabels = Math.floor(availableSpace / labelSize);
    
    if (maxLabels <= 0) return totalLabels - 1; // show only first and last
    if (maxLabels >= totalLabels) return 0; // show all
    
    return Math.ceil(totalLabels / maxLabels) - 1;
  }

  /**
   * Determine if labels should be rotated based on container size and label count.
   * Only applies to vertical bar charts.
   */
  private shouldRotateLabels(totalLabels: number, isHorizontal: boolean): number {
    if (isHorizontal) return 0; // horizontal bars don't need rotated labels
    
    const availableWidth = this.containerWidth > 0 ? this.containerWidth - 80 : 300;
    const avgLabelWidth = 50; // estimated pixels per label
    const maxLabels = Math.floor(availableWidth / avgLabelWidth);
    
    // Rotate 30° if we have more labels than can fit comfortably
    if (totalLabels > maxLabels && totalLabels > 4) {
      return 30;
    }
    // Rotate 45° for very narrow charts with many labels
    if (this.containerWidth > 0 && this.containerWidth < 350 && totalLabels > 3) {
      return 45;
    }
    return 0;
  }
}
