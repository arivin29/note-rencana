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
    const decimals = config.yAxis?.decimals ?? 2;
    
    const xField = mapping.xField || mapping.labelField || this.columns[0];
    const yField = mapping.yFields?.[0] || mapping.valueField || this.columns[1] || 'value';

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
              const val = typeof item.data === 'number' ? item.data.toFixed(decimals) : (parseFloat(item.data)?.toFixed(decimals) || item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>${item.marker} ${item.seriesName || yField}</span>
                <span style="font-weight:600">${val}</span>
              </div>`;
            }
          });
          return html;
        }
      },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: this.data.map(r => r[xField]),
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: axisLineColor } }
      },
      yAxis: { 
        type: 'value',
        axisLabel: { 
          color: textColor,
          formatter: (value: number) => value?.toFixed(decimals) || '0'
        },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      series: [{
        type: 'bar',
        data: this.data.map(r => parseFloat(r[yField]) || 0),
        itemStyle: { 
          color: '#42a5f5',
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  }
}
