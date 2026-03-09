import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SensorLogsService } from '../../../../../../sdk/core/services';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexStroke,
  ApexDataLabels,
  ApexXAxis,
  ApexYAxis,
  ApexFill,
  ApexTooltip,
  ApexGrid
} from 'ng-apexcharts';

export interface SensorChannelFeature {
  id: string;
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  metricCode: string;
  unit: string;
  value: number | null;
  status: string;
  sensorTypeName: string;
  sensorTypeCode: string;
  timestamp?: string;
}

export interface ChannelTrendChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors: string[];
}

@Component({
  selector: 'sensor-channel-drawer',
  templateUrl: './sensor-channel-drawer.html',
  styleUrls: ['./sensor-channel-drawer.scss'],
  standalone: false
})
export class SensorChannelDrawerComponent implements OnChanges, OnDestroy {
  @Input() channel: SensorChannelFeature | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() viewNode = new EventEmitter<string>(); // Emit nodeId to view parent node

  private destroy$ = new Subject<void>();

  // Trend chart
  trendChart: ChannelTrendChart | null = null;
  loadingChart = false;
  chartError = '';

  constructor(private sensorLogsService: SensorLogsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && this.channel) {
      this.loadTrendChart();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClose(): void {
    this.close.emit();
  }

  onViewNode(): void {
    if (this.channel?.nodeId) {
      this.viewNode.emit(this.channel.nodeId);
    }
  }

  // Format value to max 2 decimals
  formatValue(value: number | null, unit: string): string {
    if (value === null || value === undefined) return 'N/A';
    const formatted = typeof value === 'number' ? value.toFixed(2) : String(value);
    return `${formatted} ${unit}`;
  }

  // Get status class for badge
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'normal':
        return 'badge bg-success';
      case 'warning':
        return 'badge bg-warning text-dark';
      case 'critical':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  // Format metric code for display (snake_case to Title Case)
  formatMetricCode(code: string): string {
    return code
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private loadTrendChart(): void {
    if (!this.channel?.id) {
      this.trendChart = null;
      return;
    }

    this.loadingChart = true;
    this.chartError = '';

    // Calculate 24h ago
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    // Fetch sensor logs for this specific channel (last 24h)
    this.sensorLogsService.sensorLogsControllerFindAll({
      idSensorChannel: this.channel.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 500 // Get enough data points for chart
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.buildChart(response.data || []);
        this.loadingChart = false;
      },
      error: (err) => {
        console.error('Failed to load trend chart:', err);
        this.chartError = 'Failed to load trends';
        this.loadingChart = false;
      }
    });
  }

  private buildChart(logs: any[]): void {
    if (!logs || logs.length === 0) {
      this.trendChart = null;
      return;
    }

    // Sort by timestamp ascending
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    // Prepare series data
    const seriesData = sortedLogs.map((log) => ({
      x: new Date(log.ts).getTime(),
      y: log.valueEngineered !== null && log.valueEngineered !== undefined 
        ? Number(log.valueEngineered.toFixed(2)) 
        : null
    })).filter(d => d.y !== null);

    if (seriesData.length === 0) {
      this.trendChart = null;
      return;
    }

    this.trendChart = {
      series: [{
        name: this.channel?.metricCode || 'Value',
        data: seriesData
      }],
      chart: {
        type: 'area',
        height: 180,
        sparkline: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
        foreColor: '#e0e0e0',
        animations: {
          enabled: true,
          speed: 400
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        type: 'datetime',
        labels: {
          style: { colors: '#9ca3af' },
          datetimeUTC: false, // Display in local timezone
          datetimeFormatter: {
            hour: 'HH:mm',
            minute: 'HH:mm'
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af' },
          formatter: (val: number) => val !== null ? val.toFixed(1) : ''
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 100]
        }
      },
      tooltip: {
        theme: 'dark',
        x: { 
          format: 'dd MMM HH:mm',
          formatter: (val: number) => {
            const date = new Date(val);
            return date.toLocaleString('id-ID', { 
              day: '2-digit', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }
        },
        y: {
          formatter: (val: number) => val !== null ? `${val.toFixed(2)} ${this.channel?.unit || ''}` : 'N/A'
        }
      },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        strokeDashArray: 3
      },
      colors: ['#10b981']
    };
  }
}
