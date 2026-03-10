import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Widget } from '../../../models/widget.models';

@Component({
  selector: 'app-pie-chart-widget',
  standalone: false,
  templateUrl: './pie-chart-widget.component.html',
  styleUrls: ['./pie-chart-widget.component.css']
})
export class PieChartWidgetComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
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
    const display: any = config.display || {};
    const decimals = config.yAxis?.decimals ?? 2;

    const labelField = mapping.labelField || this.columns[0];
    const valueField = mapping.valueField || this.columns[1] || 'value';

    const chartData = this.data.map(r => ({
      name: r[labelField],
      value: parseFloat(r[valueField]) || 0
    }));

    this.chartOptions = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => `${params.name}: ${params.value.toFixed(decimals)} (${params.percent.toFixed(1)}%)`
      },
      legend: display.showLegend !== false ? {
        type: 'scroll',
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        textStyle: { 
          color: textColor,
          width: 100,
          overflow: 'truncate',
          ellipsis: '...'
        },
        pageIconColor: '#73bf69',
        pageIconInactiveColor: '#555',
        pageTextStyle: { color: textColor },
        formatter: (name: string) => name.length > 16 ? name.substring(0, 13) + '...' : name
      } : { show: false },
      series: [{
        name: this.widget?.name || 'Distribution',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: 'transparent',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold', color: textColor }
        },
        data: chartData
      }]
    };
  }
}
