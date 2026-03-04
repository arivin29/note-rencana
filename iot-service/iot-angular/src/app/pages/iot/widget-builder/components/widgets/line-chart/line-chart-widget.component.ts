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
    
    const colors = ['#73bf69', '#5794f2', '#ff9830', '#f2495c', '#b877d9', '#ff6eb4', '#4ec5d4', '#fade2a'];

    let series: any[] = [];
    let xAxisData: string[] = [];

    if (seriesField && this.data.length > 0 && this.data[0][seriesField]) {
      const seriesNames = [...new Set(this.data.map(r => r[seriesField]))];
      const groupedData: Record<string, Record<string, number>> = {};
      
      this.data.forEach(row => {
        const xVal = this.formatXValue(row[xField]);
        const sName = row[seriesField];
        const yVal = parseFloat(row[yFields[0]] || row['value'] || 0);
        
        if (!groupedData[sName]) groupedData[sName] = {};
        groupedData[sName][xVal] = yVal;
      });
      
      xAxisData = [...new Set(this.data.map(r => this.formatXValue(r[xField])))];
      
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
        return {
          name: displayName,
          type: 'line',
          data: xAxisData.map(x => groupedData[name as string]?.[x] ?? null),
          smooth: display.lineStyle === 'smooth',
          showSymbol: visible && display.showPoints === 'always',
          lineStyle: { width: visible ? (display.lineWidth || 2) : 0, opacity: visible ? 1 : 0 },
          areaStyle: display.fillOpacity && visible ? { opacity: display.fillOpacity / 100 } : undefined,
          itemStyle: { color, opacity: visible ? 1 : 0 }
        };
      });
    } else {
      xAxisData = this.data.map(r => this.formatXValue(r[xField]));
      
      series = yFields.map((yField: string, idx: number) => {
        const sc: any = seriesConfig.find((s: any) => s.field === yField) || {};
        return {
          name: sc.label || yField,
          type: 'line',
          data: this.data.map(r => parseFloat(r[yField]) || 0),
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
          let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue || ''}</div>`;
          params.forEach((item: any) => {
            if (item.data !== undefined && item.data !== null) {
              const d = getSeriesDecimals(item.seriesName);
              const val = typeof item.data === 'number' ? item.data.toFixed(d) : (parseFloat(item.data)?.toFixed(d) || item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>${item.marker} ${item.seriesName}</span>
                <span style="font-weight:600">${val}</span>
              </div>`;
            }
          });
          return html;
        }
      },
      legend: display.showLegend !== false ? {
        show: true,
        top: display.legendPosition === 'bottom' ? 'bottom' : 'top',
        textStyle: { color: textColor }
      } : { show: false },
      grid: { left: 45, right: 12, top: 30, bottom: 24, containLabel: false },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: { rotate: 45, color: textColor, fontSize: 10 },
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

  private formatXValue(value: any): string {
    if (!value) return '';
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    }
    return String(value);
  }
}
