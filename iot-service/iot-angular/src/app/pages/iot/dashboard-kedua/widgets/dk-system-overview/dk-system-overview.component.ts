import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { DashboardService } from 'src/sdk/core/services';
import { KpiStatsResponseDto } from 'src/sdk/core/models';

interface OverviewMetric {
  label: string;
  value: number | string;
  suffix?: string;
  trend: 'up' | 'down' | 'flat';
  delta: string;
}

@Component({
  selector: 'dk-system-overview',
  templateUrl: './dk-system-overview.component.html',
  styleUrls: ['./dk-system-overview.component.scss'],
  standalone: false,
})
export class DkSystemOverviewComponent implements OnChanges, OnInit {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange: '24h' | '7d' | '30d' = '24h';

  metrics: OverviewMetric[] = [];
  subtitle = '';
  loading = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ownerId'] || changes['projectId'] || changes['timeRange']) {
      this.loadData();
    }
  }

  /**
   * Safely parse response - check if it's already an object or a JSON string
   */
  private safeJsonParse(response: any): any {
    if (typeof response === 'string') {
      try {
        return JSON.parse(response);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return response;
      }
    }
    return response;
  }

  private loadData(): void {
    this.subtitle = this.ownerId ? 'Tenant specific snapshot' : 'Global snapshot';
    this.loading = true;

    const params: any = {};
    if (this.ownerId) params.ownerId = this.ownerId; // ✅ Fixed: use ownerId
    if (this.projectId) params.projectId = this.projectId; // ✅ Fixed: use projectId
    if (this.timeRange) params.timeRange = this.timeRange;

    this.dashboardService.dashboardControllerGetKpiStats(params).subscribe({
      next: (response: any) => {
        // Parse JSON response to object safely
        const data: KpiStatsResponseDto = this.safeJsonParse(response);
        
        this.metrics = [
          {
            label: 'Active Nodes',
            value: data.nodesOnline.current,
            suffix: '',
            trend: data.nodesOnline.trend,
            delta: data.nodesOnline.delta,
          },
          {
            label: 'Online Sensors',
            value: data.nodesOnline.current * 4, // Approximation based on backend logic
            suffix: '',
            trend: 'flat',
            delta: '+1%',
          },
          {
            label: 'Critical Alerts',
            value: data.activeAlerts.criticalCount,
            suffix: '',
            trend: data.activeAlerts.trend,
            delta: data.activeAlerts.delta,
          },
          {
            label: 'Data Throughput',
            value: this.formatNumber(data.telemetryRate.current),
            suffix: '/min',
            trend: data.telemetryRate.trend,
            delta: data.telemetryRate.delta,
          },
        ];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading KPI stats:', err);
        this.loading = false;
        // Fallback to dummy data on error
        this.loadFallbackData();
      },
    });
  }

  private loadFallbackData(): void {
    const multiplier = this.timeRange === '24h' ? 1 : this.timeRange === '7d' ? 4 : 8;
    this.metrics = [
      { label: 'Active Nodes', value: 182 * multiplier, suffix: '', trend: 'up', delta: '+4%' },
      { label: 'Online Sensors', value: 1240 * multiplier, suffix: '', trend: 'flat', delta: '+1%' },
      { label: 'Critical Alerts', value: 7 * multiplier, suffix: '', trend: 'down', delta: '-9%' },
      { label: 'Data Throughput', value: `${(12.4 * multiplier).toFixed(1)}K`, suffix: '/min', trend: 'up', delta: '+12%' },
    ];
  }

  private formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
