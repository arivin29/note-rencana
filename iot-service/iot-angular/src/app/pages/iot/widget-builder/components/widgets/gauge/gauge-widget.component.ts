import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Widget } from '../../../models/widget.models';

@Component({
  selector: 'app-gauge-widget',
  standalone: false,
  templateUrl: './gauge-widget.component.html',
  styleUrls: ['./gauge-widget.component.css']
})
export class GaugeWidgetComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  private destroy$ = new Subject<void>();
  private resizeObserver: ResizeObserver | null = null;
  private resizeSubject$ = new Subject<void>();

  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() containerWidth = 0;
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
    // Resize when container dimensions change
    if ((changes['containerWidth'] || changes['containerHeight']) && this.echartsInstance) {
      setTimeout(() => {
        this.forceResize();
      }, 50);
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
    
    // Force resize after init to ensure canvas fills container
    setTimeout(() => {
      this.forceResize();
    }, 100);
  }
  
  private forceResize(): void {
    if (!this.echartsInstance) return;
    // Let echarts auto-detect size from container
    this.echartsInstance.resize();
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
        this.forceResize();
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

    const valueField = mapping.valueField || 'value';
    const value = this.data.length > 0 ? parseFloat(this.data[0][valueField]) || 0 : 0;
    
    // Get min/max from config.yAxis (template mode) or mapping fields (expert mode)
    const yAxis: any = config.yAxis || {};
    const min = yAxis.min !== undefined ? parseFloat(yAxis.min) : 
                (mapping.minField && this.data[0] ? parseFloat(this.data[0][mapping.minField]) : 0);
    const max = yAxis.max !== undefined ? parseFloat(yAxis.max) : 
                (mapping.maxField && this.data[0] ? parseFloat(this.data[0][mapping.maxField]) : 100);
    const unit = yAxis.unit || this.data[0]?.unit || '';
    const decimals = Math.floor(parseFloat(String(yAxis.decimals))) || 2;
    
    // Get thresholds from templateConfig.settings or config.thresholds
    const templateConfig: any = config.templateConfig?.settings || {};
    const thresholds = config.thresholds || [];
    const warningThreshold = templateConfig['warningThreshold'];
    const criticalThreshold = templateConfig['criticalThreshold'];
    
    // Build axis line color stops based on thresholds
    let axisLineColors: [number, string][] = [];
    const range = max - min;
    
    if (thresholds.length > 0 && range > 0) {
      const sortedThresholds = [...thresholds]
        .filter((t: any) => t.value != null)
        .sort((a: any, b: any) => a.value - b.value);
      
      let lastPercent = 0;
      for (const t of sortedThresholds) {
        const percent = (t.value - min) / range;
        if (percent > lastPercent && percent <= 1) {
          axisLineColors.push([percent, t.color || '#10b981']);
          lastPercent = percent;
        }
      }
      if (lastPercent < 1) {
        const lastColor = sortedThresholds[sortedThresholds.length - 1]?.color || '#ef4444';
        axisLineColors.push([1, lastColor]);
      }
    } else if (criticalThreshold !== null && criticalThreshold !== undefined && range > 0) {
      const normalEnd = (warningThreshold ?? criticalThreshold - min) / range;
      const warningEnd = (criticalThreshold - min) / range;
      axisLineColors = [
        [Math.min(Math.max(normalEnd, 0), 1), '#10b981'],
        [Math.min(Math.max(warningEnd, 0), 1), '#f59e0b'],
        [1, '#ef4444']
      ];
    } else if (warningThreshold !== null && warningThreshold !== undefined && range > 0) {
      const normalEnd = (warningThreshold - min) / range;
      axisLineColors = [
        [Math.min(Math.max(normalEnd, 0), 1), '#10b981'],
        [1, '#f59e0b']
      ];
    } else {
      axisLineColors = [[1, '#5794f2']];
    }
    
    axisLineColors = axisLineColors.filter(c => c[0] > 0);
    if (axisLineColors.length === 0) {
      axisLineColors = [[1, '#5794f2']];
    }

    // Determine current value's color zone for the progress arc
    const valuePercent = range > 0 ? (value - min) / range : 0;
    let currentColor = axisLineColors[axisLineColors.length - 1]?.[1] || '#5794f2';
    for (const [threshold, color] of axisLineColors) {
      if (valuePercent <= threshold) {
        currentColor = color;
        break;
      }
    }
    
    this.chartOptions = {
      series: [
        // Background arc (track)
        {
          type: 'gauge',
          radius: '105%',
          center: ['50%', '68%'],
          startAngle: 210,
          endAngle: -30,
          min: min,
          max: max,
          itemStyle: { color: 'transparent' },
          progress: { show: false },
          pointer: { show: false },
          axisLine: {
            lineStyle: {
              width: 14,
              color: axisLineColors,
              opacity: 0.25
            }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: { show: false },
          data: [{ value: 0 }]
        },
        // Foreground progress arc (value)
        {
          type: 'gauge',
          radius: '105%',
          center: ['50%', '68%'],
          startAngle: 210,
          endAngle: -30,
          min: min,
          max: max,
          itemStyle: { color: currentColor },
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: { color: currentColor }
          },
          pointer: { show: false },
          axisLine: {
            lineStyle: { width: 0, color: [[1, 'transparent']] }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: { show: false },
          data: [{ value: parseFloat(value.toFixed(decimals)) }]
        },
        // Tick marks + labels (thin overlay)
        {
          type: 'gauge',
          radius: '105%',
          center: ['50%', '68%'],
          startAngle: 210,
          endAngle: -30,
          min: min,
          max: max,
          itemStyle: { color: 'transparent' },
          progress: { show: false },
          pointer: { show: false },
          axisLine: {
            lineStyle: { width: 0, color: [[1, 'transparent']] }
          },
          axisTick: {
            show: true,
            distance: -18,
            length: 4,
            lineStyle: { color: 'rgba(255,255,255,0.2)', width: 1 }
          },
          splitLine: {
            show: true,
            distance: -18,
            length: 8,
            lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1.5 }
          },
          splitNumber: 5,
          axisLabel: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '-15%'],
            fontSize: 28,
            fontWeight: 'bold',
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
            formatter: (val: number) => val.toFixed(decimals),
            color: currentColor
          },
          data: [{ value: parseFloat(value.toFixed(decimals)) }]
        }
      ],
      // Min, Max, Unit labels via graphic
      graphic: [
        {
          type: 'text',
          left: '8%',
          bottom: '8%',
          style: {
            text: min.toFixed(0),
            fontSize: 10,
            fill: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center'
          }
        },
        {
          type: 'text',
          right: '8%',
          bottom: '8%',
          style: {
            text: max.toFixed(0),
            fontSize: 10,
            fill: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center'
          }
        },
        {
          type: 'text',
          left: 'center',
          bottom: '3%',
          style: {
            text: unit,
            fontSize: 13,
            fontWeight: '500',
            fill: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center'
          }
        }
      ]
    };
  }
}
