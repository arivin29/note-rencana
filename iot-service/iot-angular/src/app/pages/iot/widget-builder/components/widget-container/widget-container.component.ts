import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Widget, TimeRange, generateDummyTimeSeriesData, generateDummyBarData, generateDummyPieData, generateDummyTableData } from '../../models/widget.models';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-widget-container',
  standalone: false,
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.css']
})
export class WidgetContainerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() widget: Widget | undefined;
  @Input() editMode = false;
  @Input() timeRange!: TimeRange;
  @Input() isFullscreen = false;

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();

  loading = true;
  error: string | null = null;
  chartData: any = null;
  chartOptions: any = null;

  ngOnInit(): void {
    this.loadWidgetData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWidgetData(): void {
    if (!this.widget) return;

    this.loading = true;
    this.error = null;

    // Simulate API call with dummy data
    setTimeout(() => {
      try {
        this.chartOptions = this.generateChartOptions();
        this.loading = false;
      } catch (e: any) {
        this.error = e.message || 'Failed to load data';
        this.loading = false;
      }
    }, 500 + Math.random() * 500);
  }

  generateChartOptions(): any {
    if (!this.widget) return null;

    switch (this.widget.type) {
      case 'line-chart':
        return this.buildLineChartOptions();
      case 'bar-chart':
        return this.buildBarChartOptions();
      case 'gauge':
        return this.buildGaugeOptions();
      case 'pie-chart':
        return this.buildPieChartOptions();
      case 'value-card':
        return this.buildValueCardData();
      case 'data-table':
        return this.buildTableData();
      default:
        return null;
    }
  }

  buildLineChartOptions(): any {
    const data = generateDummyTimeSeriesData(24);
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const axisLineColor = 'rgba(255, 255, 255, 0.2)';
    return {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/>Value: <strong>${p.value}</strong>`;
        }
      },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
        axisLabel: { rotate: 45, color: textColor },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      yAxis: { 
        type: 'value',
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      series: [{
        type: 'line',
        data: data.map(d => d.value),
        smooth: true,
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 2 },
        itemStyle: { color: '#1976d2' }
      }]
    };
  }

  buildBarChartOptions(): any {
    const data = generateDummyBarData();
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const axisLineColor = 'rgba(255, 255, 255, 0.2)';
    return {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' }
      },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.category),
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      yAxis: { 
        type: 'value',
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      series: [{
        type: 'bar',
        data: data.map(d => d.value),
        itemStyle: { 
          color: '#42a5f5',
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  }

  buildGaugeOptions(): any {
    const value = Math.round(20 + Math.random() * 60);
    const textColor = 'rgba(255, 255, 255, 0.8)';
    return {
      series: [{
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 5,
        progress: {
          show: true,
          width: 18
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.3, '#67e0e3'],
              [0.7, '#37a2da'],
              [1, '#fd666d']
            ]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: {
          show: true,
          offsetCenter: [0, '30%'],
          fontSize: 12,
          color: textColor
        },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 'bold',
          offsetCenter: [0, '-10%'],
          formatter: '{value}°C',
          color: textColor
        },
        data: [{ 
          value: value, 
          name: this.widget?.config?.title || this.widget?.name 
        }]
      }]
    };
  }

  buildPieChartOptions(): any {
    const data = generateDummyPieData();
    const textColor = 'rgba(255, 255, 255, 0.8)';
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' },
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        show: this.widget?.config?.showLegend !== false,
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        textStyle: { color: textColor }
      },
      series: [{
        name: 'Distribution',
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
        data: data
      }]
    };
  }

  buildValueCardData(): any {
    return {
      value: (Math.random() * 100).toFixed(1),
      title: this.widget?.config?.title || this.widget?.name,
      unit: '°C',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendValue: (Math.random() * 10).toFixed(1)
    };
  }

  buildTableData(): any {
    return {
      columns: ['Timestamp', 'Sensor', 'Value', 'Unit', 'Status'],
      rows: generateDummyTableData()
    };
  }

  onRefresh(): void {
    this.loadWidgetData();
    this.refresh.emit();
  }
}
