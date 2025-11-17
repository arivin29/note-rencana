import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core'; 
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { TelemetryStreamsResponseDto } from '@sdk/core/models/telemetry-streams-response-dto';

@Component({
  selector: 'dashboard-telemetry-streams',
  templateUrl: './telemetry-streams.component.html',
  styleUrls: ['./telemetry-streams.component.scss'],
  standalone: false
})
export class DashboardTelemetryStreamsComponent implements OnInit, OnChanges {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange?: '24h' | '7d' | '30d' = '24h';

  telemetryData: TelemetryStreamsResponseDto | null = null;
  loading = true;
  error: string | null = null;

  chartOptions: any = {};

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadTelemetryStreams();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ownerId'] || changes['projectId'] || changes['timeRange']) {
      this.loadTelemetryStreams();
    }
  }

  loadTelemetryStreams() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetTelemetryStreams({
      ownerId: this.ownerId,
      projectId: this.projectId,
      timeRange: this.timeRange,
    }).subscribe({
      next: (data: TelemetryStreamsResponseDto) => {
        this.telemetryData = data;
        this.buildChart(data);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading telemetry streams:', err);
        this.error = 'Failed to load telemetry data';
        this.loading = false;
      }
    });
  }

  private buildChart(data: TelemetryStreamsResponseDto) {
    this.chartOptions = {
      series: data.chart.series.map(s => ({
        name: s.name,
        data: s.data,
      })),
      chart: {
        height: 300,
        type: 'area',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#0EA5E9', '#6366F1'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
        },
      },
      xaxis: {
        categories: data.chart.labels,
        labels: {
          style: { fontSize: '11px' },
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px' },
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
      },
      grid: {
        borderColor: '#e7e7e7',
        strokeDashArray: 4,
      },
    };
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}
