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
  Math = Math; // Expose Math for template

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
        height: 320,
        type: 'area',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#22C55E'], // Single green line for messages
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0.1,
        },
      },
      xaxis: {
        categories: data.chart.labels,
        labels: {
          style: { fontSize: '11px', colors: '#64748b' },
          rotate: -45,
        },
      },
      yaxis: {
        title: {
          text: 'Messages',
          style: { fontSize: '12px', color: '#64748b' }
        },
        labels: {
          style: { fontSize: '11px', colors: '#64748b' },
          formatter: (val: number) => Math.round(val).toString()
        },
      },
      legend: {
        show: false, // Hide legend for single series
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${Math.round(val)} messages`
        }
      }
    };
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}
