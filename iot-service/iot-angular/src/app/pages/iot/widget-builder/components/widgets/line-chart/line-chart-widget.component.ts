import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Widget } from '../../../models/widget.models';

@Component({
  selector: 'app-line-chart-widget',
  standalone: false,
  templateUrl: './line-chart-widget.component.html',
  styleUrls: ['./line-chart-widget.component.css']
})
export class LineChartWidgetComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
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
    // Debug: log received dimensions
    console.log(`[LineChart: ${this.widget?.name}] Init with size: ${this.containerWidth}px x ${this.containerHeight}px`);
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
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const axisLineColor = 'rgba(255, 255, 255, 0.2)';
    
    const xField = mapping.xField || 'timestamp';
    const yFields = mapping.yFields || [mapping.yField || 'value'];
    const seriesField = mapping.seriesField;
    
    const seriesConfig: any[] = config.series || [];
    const display: any = config.display || {};
    const decimals = config.yAxis?.decimals ?? 2;
    
    // Get smoothing config
    const smoothingConfig = display.smoothing || {
      enabled: false,
      threshold: 50,
      minConsecutive: 3,
      method: 'interpolate' as 'interpolate' | 'average' | 'previous'
    };
    
    const colors = ['#73bf69', '#5794f2', '#ff9830', '#f2495c', '#b877d9', '#ff6eb4', '#4ec5d4', '#fade2a'];

    // Helper: bucket timestamp to nearest minute for alignment
    const bucketTimestamp = (val: any): string => {
      if (!val) return '';
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);
      // Round to nearest minute
      date.setSeconds(0, 0);
      return date.toISOString();
    };

    // Store raw timestamps for tooltip (before formatting)
    const rawXValues = this.data.map(d => d[xField]);

    let series: any[] = [];
    let xAxisData: string[] = [];

    if (seriesField && this.data.length > 0 && this.data[0][seriesField]) {
      const seriesNames = [...new Set(this.data.map(r => r[seriesField]))];
      
      // Use bucketed timestamps for alignment (group Pressure 13:14:11 with Debit 13:14:21 as same minute)
      const groupedData: Record<string, Record<string, number>> = {};
      const bucketToDisplay: Record<string, string> = {}; // Map bucket -> display format
      
      this.data.forEach(row => {
        const bucket = bucketTimestamp(row[xField]); // For alignment
        const displayVal = this.smartFormatXValue(row[xField]); // For display
        const sName = row[seriesField];
        const yVal = parseFloat(row[yFields[0]] || row['value'] || 0);
        
        if (!groupedData[sName]) groupedData[sName] = {};
        groupedData[sName][bucket] = yVal;
        bucketToDisplay[bucket] = displayVal;
      });
      
      // Unique bucketed timestamps, sorted
      const uniqueBuckets = [...new Set(this.data.map(r => bucketTimestamp(r[xField])))].sort();
      xAxisData = uniqueBuckets.map(b => bucketToDisplay[b] || this.smartFormatXValue(b));
      
      // Check if this is multi-query mode (_source grouping)
      const queriesConfig: any[] = config.queries || [];
      const isMultiQuerySource = seriesField === '_source' && queriesConfig.length > 1;

      series = seriesNames.map((name, idx) => {
        const sc: any = seriesConfig.find((s: any) => s.field === name) || {};
        // Use Series Override color, or multi-query color, or default
        let color = sc.color || colors[idx % colors.length];
        if (!sc.color && isMultiQuerySource) {
          const matchingQuery = queriesConfig.find((q: any) => q.alias === name || q.name === name);
          if (matchingQuery?.color) color = matchingQuery.color;
        }
        // Display name: Series Override label, or multi-query format, or raw name
        let displayName = sc.label && sc.label !== name ? sc.label : name;
        if (isMultiQuerySource && (!sc.label || sc.label === name)) {
          displayName = `${name}: ${yFields[0] || 'value'}`;
        }
        const visible = sc.visible !== false;
        
        // Get raw data using bucketed timestamps and apply smoothing
        let seriesData: (number | null)[] = uniqueBuckets.map(bucket => groupedData[name as string]?.[bucket] ?? null);
        if (smoothingConfig.enabled) {
          seriesData = this.smoothData(seriesData, smoothingConfig);
        }
        
        return {
          name: displayName,
          type: 'line',
          data: seriesData,
          smooth: display.lineStyle === 'smooth',
          showSymbol: visible && display.showPoints === 'always',
          lineStyle: { width: visible ? (display.lineWidth || 2) : 0, opacity: visible ? 1 : 0 },
          areaStyle: display.fillOpacity && visible ? { opacity: display.fillOpacity / 100 } : undefined,
          itemStyle: { color, opacity: visible ? 1 : 0 }
        };
      });
    } else {
      xAxisData = this.data.map(r => this.smartFormatXValue(r[xField]));
      
      series = yFields.map((yField: string, idx: number) => {
        const sc: any = seriesConfig.find((s: any) => s.field === yField) || {};
        
        // Get raw data and apply smoothing
        let seriesData: (number | null)[] = this.data.map(r => parseFloat(r[yField]) || 0);
        if (smoothingConfig.enabled) {
          seriesData = this.smoothData(seriesData, smoothingConfig);
        }
        
        return {
          name: sc.label || yField,
          type: 'line',
          data: seriesData,
          smooth: display.lineStyle === 'smooth',
          showSymbol: display.showPoints === 'always',
          lineStyle: { width: display.lineWidth || 2 },
          areaStyle: display.fillOpacity ? { opacity: display.fillOpacity / 100 } : undefined,
          itemStyle: { color: sc.color || colors[idx % colors.length] }
        };
      });
    }

    // Add threshold lines
    const thresholds = config.thresholds || [];
    if (thresholds.length > 0 && series.length > 0) {
      series[0].markLine = {
        silent: true,
        symbol: 'none',
        data: thresholds.map((t: any) => ({
          yAxis: t.value,
          label: { 
            show: true, 
            formatter: t.label || `${t.value}`,
            color: t.color || '#f2495c'
          },
          lineStyle: {
            color: t.color || '#f2495c',
            type: t.lineStyle || 'dashed'
          }
        }))
      };
    }

    const getSeriesDecimals = (seriesName: string): number => {
      const sc: any = seriesConfig.find((s: any) => s.field === seriesName || s.label === seriesName);
      return sc?.decimals ?? decimals;
    };

    this.chartOptions = {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) params = [params];
          // Full datetime from raw timestamp
          const dataIndex = params[0]?.dataIndex;
          let timeLabel = params[0]?.axisValue || '';
          if (dataIndex !== undefined && rawXValues[dataIndex]) {
            const date = new Date(rawXValues[dataIndex]);
            if (!isNaN(date.getTime())) {
              timeLabel = `${date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${date.toLocaleTimeString('id-ID')}`;
            }
          }
          let html = `<div style="font-weight:600;margin-bottom:4px">${timeLabel}</div>`;
          const unit = config.yAxis?.unit || '';
          params.forEach((item: any) => {
            if (item.data !== undefined && item.data !== null) {
              const d = getSeriesDecimals(item.seriesName);
              const val = typeof item.data === 'number' ? item.data.toFixed(d) : (parseFloat(item.data)?.toFixed(d) || item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>${item.marker} ${item.seriesName}</span>
                <span style="font-weight:600">${val}${unit ? ' ' + unit : ''}</span>
              </div>`;
            }
          });
          return html;
        }
      },
      legend: display.showLegend !== false ? {
        show: true,
        type: 'scroll', // Enable scroll for many legends
        // Position legend properly based on settings
        top: display.legendPosition === 'bottom' ? undefined : 8,
        bottom: display.legendPosition === 'bottom' ? 0 : undefined,
        left: display.legendPosition === 'right' ? undefined : 'center',
        right: display.legendPosition === 'right' ? 10 : undefined,
        orient: display.legendPosition === 'right' ? 'vertical' : 'horizontal',
        textStyle: { 
          color: textColor,
          fontSize: 11,
          width: 120, // Max width for legend text
          overflow: 'truncate',
          ellipsis: '...'
        },
        pageButtonItemGap: 5,
        pageButtonGap: 10,
        pageIconColor: '#73bf69',
        pageIconInactiveColor: '#555',
        pageTextStyle: { color: textColor },
        tooltip: { show: true }, // Show full name on hover
        formatter: (name: string) => {
          // Truncate long legend names
          return name.length > 18 ? name.substring(0, 15) + '...' : name;
        }
      } : { show: false },
      grid: { 
        left: 45, 
        right: display.legendPosition === 'right' && display.showLegend !== false ? 140 : 12, 
        // Top: add space for legend at top
        top: display.legendPosition !== 'bottom' && display.showLegend !== false ? 35 : 20,
        // Bottom: add space for legend at bottom + x-axis labels
        bottom: display.legendPosition === 'bottom' && display.showLegend !== false 
          ? (this.shouldRotateLabels() ? 75 : 50)  // More space for legend + labels
          : (this.shouldRotateLabels() ? 45 : 24), 
        containLabel: false 
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          color: textColor,
          fontSize: 10,
          rotate: this.shouldRotateLabels() ? 45 : 0,
          interval: this.calcLabelInterval(xAxisData.length),
          showMinLabel: true,
          showMaxLabel: true,
          hideOverlap: true
        },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { show: false }
      },
      yAxis: { 
        type: 'value',
        name: config.yAxis?.label || '',
        axisLabel: { 
          color: textColor,
          formatter: (value: number) => value?.toFixed(decimals) || '0'
        },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      series
    };
  }

  /**
   * Grafana-style smart time formatting:
   * - Auto-detect data time span and container width to choose appropriate format
   * - Shorter labels for narrow charts, full datetime for tooltip
   */
  private smartFormatXValue(value: any): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    // Detect time span from data to choose format
    const span = this.getDataTimeSpanHours();
    const isNarrow = this.containerWidth > 0 && this.containerWidth < 500;

    if (span <= 24) {
      // Within 1 day: show HH:mm (or just HH for very narrow)
      if (isNarrow) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } else if (span <= 168) {
      // Within 1 week: show DD/MM HH:mm or just HH:mm for narrow
      if (isNarrow) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return `${date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (span <= 2160) {
      // Within ~3 months: show DD/MM
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    } else {
      // Longer: show MM/YYYY
      return date.toLocaleDateString('id-ID', { month: '2-digit', year: 'numeric' });
    }
  }

  /** Calculate the time span of the data in hours */
  private getDataTimeSpanHours(): number {
    if (!this.data || this.data.length < 2) return 1;
    const xField = (this.widget?.config as any)?.mapping?.xField || 'timestamp';
    const first = new Date(this.data[0]?.[xField]);
    const last = new Date(this.data[this.data.length - 1]?.[xField]);
    if (isNaN(first.getTime()) || isNaN(last.getTime())) return 1;
    return Math.abs(last.getTime() - first.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Calculate label interval based on container width and data points.
   * Estimates ~50-70px per label to avoid overlap.
   */
  private calcLabelInterval(totalPoints: number): number | 'auto' {
    // Use 'auto' to let ECharts handle it with hideOverlap
    if (totalPoints <= 6) return 0; // show all for small datasets
    
    // Calculate based on available width
    const availableWidth = this.containerWidth > 0 ? this.containerWidth - 60 : 300; // subtract axis margins
    const labelWidth = this.estimateLabelWidth();
    const maxLabels = Math.floor(availableWidth / labelWidth);
    
    if (maxLabels <= 0) return totalPoints - 1; // show only first and last
    if (maxLabels >= totalPoints) return 0; // show all
    
    // Calculate interval to show approximately maxLabels
    return Math.ceil(totalPoints / maxLabels) - 1;
  }

  /**
   * Estimate the pixel width of each x-axis label based on format
   */
  private estimateLabelWidth(): number {
    const span = this.getDataTimeSpanHours();
    const isNarrow = this.containerWidth > 0 && this.containerWidth < 500;
    
    if (span <= 24) {
      return 45; // "06:20" ~45px
    } else if (span <= 168 && !isNarrow) {
      return 85; // "04/03 06:20" ~85px
    } else {
      return 45; // "04/03" ~45px
    }
  }

  /**
   * Determine if labels should be rotated based on container width and data density
   */
  private shouldRotateLabels(): boolean {
    if (this.containerWidth <= 0) return false;
    const availableWidth = this.containerWidth - 60;
    const labelWidth = this.estimateLabelWidth();
    const maxLabels = Math.floor(availableWidth / labelWidth);
    // Rotate if we have significantly more points than can fit comfortably
    return this.data.length > maxLabels * 2 && this.containerWidth < 400;
  }

  /** @deprecated Use smartFormatXValue instead */
  private formatXValue(value: any): string {
    return this.smartFormatXValue(value);
  }

  /**
   * Apply data smoothing to remove outliers/spikes from sensor data
   * Uses MEDIAN-based detection to identify values that deviate significantly from normal
   * @param values Array of numeric values
   * @param config Smoothing configuration
   * @returns Smoothed array of values
   */
  private smoothData(values: (number | null)[], config: {
    enabled: boolean;
    threshold: number;
    minConsecutive: number;
    method: 'interpolate' | 'average' | 'previous';
  }): (number | null)[] {
    if (!config.enabled || values.length < 3) {
      return values;
    }

    const threshold = config.threshold / 100; // Convert percentage to decimal (e.g., 50 -> 0.5)
    const result = [...values];
    
    // Calculate median for threshold baseline (exclude nulls)
    const validValues = values.filter(v => v !== null && v !== undefined) as number[];
    if (validValues.length < 3) return values;
    
    const sorted = [...validValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Define bounds: values outside this range are outliers
    // threshold=0.5 means: outlier if < 50% of median or > 150% of median
    const lowerBound = median * threshold;
    const upperBound = median * (2 - threshold);
    
    // Mark outliers based on median deviation
    const isOutlier = values.map(v => {
      if (v === null || v === undefined) return false;
      return v < lowerBound || v > upperBound;
    });
    
    // Find consecutive outlier runs and smooth only isolated ones
    let i = 0;
    while (i < values.length) {
      if (isOutlier[i]) {
        // Count consecutive outliers
        let runLength = 1;
        while (i + runLength < values.length && isOutlier[i + runLength]) {
          runLength++;
        }
        
        // Only smooth if run is shorter than minConsecutive (isolated spikes)
        if (runLength < config.minConsecutive) {
          // Find valid prev (before the run)
          let prevIdx = i - 1;
          while (prevIdx >= 0 && (values[prevIdx] === null || isOutlier[prevIdx])) {
            prevIdx--;
          }
          // Find valid next (after the run)
          let nextIdx = i + runLength;
          while (nextIdx < values.length && (values[nextIdx] === null || isOutlier[nextIdx])) {
            nextIdx++;
          }
          
          const prev = prevIdx >= 0 ? values[prevIdx] : null;
          const next = nextIdx < values.length ? values[nextIdx] : null;
          
          // Smooth each point in the run
          for (let j = i; j < i + runLength; j++) {
            if (config.method === 'interpolate' && prev !== null && next !== null) {
              const progress = (j - i + 1) / (runLength + 1);
              result[j] = prev + (next - prev) * progress;
            } else if (config.method === 'average' && prev !== null && next !== null) {
              result[j] = (prev + next) / 2;
            } else if (config.method === 'previous' && prev !== null) {
              result[j] = prev;
            } else if (next !== null) {
              result[j] = next;
            }
          }
        }
        i += runLength;
      } else {
        i++;
      }
    }
    
    return result;
  }
}
