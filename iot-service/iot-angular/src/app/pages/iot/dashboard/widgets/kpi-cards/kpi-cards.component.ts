import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { KpiStatsResponseDto } from '@sdk/core/models/kpi-stats-response-dto';

@Component({
  selector: 'dashboard-kpi-cards',
  templateUrl: './kpi-cards.component.html',
  styleUrls: ['./kpi-cards.component.scss'],
  standalone: false
})
export class DashboardKpiCardsComponent implements OnInit, OnChanges {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange?: '24h' | '7d' | '30d' = '24h';

  kpiData: KpiStatsResponseDto | null = null;
  loading = true;
  error: string | null = null;

  // Chart configurations for ApexCharts
  kpiCards: any[] = [];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadKpiStats();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload data when filters change
    if (changes['ownerId'] || changes['projectId'] || changes['timeRange']) {
      this.loadKpiStats();
    }
  }

  loadKpiStats() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetKpiStats({
      ownerId: this.ownerId,
      projectId: this.projectId,
      timeRange: this.timeRange,
    }).subscribe({
      next: (data) => {
        this.kpiData = data;
        this.buildKpiCards(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading KPI stats:', err);
        this.error = 'Failed to load KPI statistics';
        this.loading = false;
      }
    });
  }

  private buildKpiCards(data: KpiStatsResponseDto) {
    this.kpiCards = [
      {
        title: 'NODES CONNECTIVITY TREND',
        value: data.nodesOnline.current,
        delta: data.nodesOnline.delta,
        trend: data.nodesOnline.trend,
        info: [
          { icon: 'fa fa-circle text-success me-1', text: `${data.nodesOnline.healthyPercentage}% healthy (${data.nodesOnline.current}/${data.nodesOnline.totalNodes} online)` },
          { icon: 'fa fa-circle text-warning me-1', text: `${data.nodesOnline.degradedNodes} degraded` },
          { icon: 'fa fa-circle text-danger me-1', text: `${data.nodesOnline.offlineNodes} offline` }
        ],
        chart: {
          series: [
            { 
              name: 'Online', 
              data: data.nodesOnline.timeSeries.map(d => d.online),
              color: '#10b981' // green
            },
            { 
              name: 'Degraded', 
              data: data.nodesOnline.timeSeries.map(d => d.degraded),
              color: '#f59e0b' // yellow
            },
            { 
              name: 'Offline', 
              data: data.nodesOnline.timeSeries.map(d => d.offline),
              color: '#ef4444' // red
            }
          ],
          options: {
            chart: { 
              type: 'area', 
              height: 80,
              stacked: true,
              toolbar: { show: false },
              sparkline: { enabled: false }
            },
            dataLabels: { enabled: false },
            stroke: { 
              curve: 'smooth', 
              width: 2 
            },
            fill: {
              type: 'gradient',
              gradient: {
                opacityFrom: 0.6,
                opacityTo: 0.2,
              }
            },
            xaxis: {
              categories: data.nodesOnline.timeSeries.map(d => {
                const date = new Date(d.timestamp);
                return date.getHours() + ':00';
              }),
              labels: {
                show: true,
                style: { fontSize: '10px', colors: '#94a3b8' }
              },
              axisBorder: { show: false },
              axisTicks: { show: false }
            },
            yaxis: {
              show: true,
              labels: {
                show: true,
                style: { fontSize: '10px', colors: '#94a3b8' }
              }
            },
            grid: {
              show: true,
              borderColor: '#334155',
              strokeDashArray: 4,
              padding: { left: 10, right: 10 }
            },
            legend: { show: false },
            colors: ['#10b981', '#f59e0b', '#ef4444'],
            tooltip: {
              shared: true,
              intersect: false,
              y: {
                formatter: (val: number) => `${val} nodes`
              }
            }
          }
        }
      },
      {
        title: 'ACTIVE ALERTS',
        value: data.activeAlerts.current,
        delta: `${data.activeAlerts.criticalCount} critical`,
        trend: data.activeAlerts.trend,
        info: [
          { icon: 'fa fa-exclamation-circle text-danger me-1', text: `${data.activeAlerts.criticalCount} critical` },
          { icon: 'fa fa-bell text-warning me-1', text: `${data.activeAlerts.warningCount} warning` }
        ],
        chart: {
          series: [{ data: data.activeAlerts.sparkline }],
          options: {
            chart: { type: 'line', sparkline: { enabled: true }, height: 30 },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#F97316']
          }
        }
      },
      {
        title: 'DATA INGESTION',
        value: this.formatNumber(data.telemetryRate.current),
        delta: data.telemetryRate.delta,
        trend: data.telemetryRate.trend,
        info: [
          { icon: 'fa fa-microchip text-primary me-1', text: `${data.telemetryRate.activeDevices}/${data.telemetryRate.totalDevices} devices sending` },
          { icon: 'fa fa-clock text-muted me-1', text: `Last: ${data.telemetryRate.lastMessageSecondsAgo}s ago` },
          { icon: 'fa fa-list text-success me-1', text: `Queue: ${data.telemetryRate.queueSize} pending` }
        ],
        chart: {
          series: [{ data: data.telemetryRate.sparkline }],
          options: {
            chart: { type: 'area', sparkline: { enabled: true }, height: 30 },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#22C55E'],
            fill: { opacity: 0.3 }
          }
        }
      }
      // TODO: FORWARDED PAYLOADS widget - needs redesign
      // Currently shows technical distribution (webhook/db split) instead of actionable metrics
      // See: TELEMETRY-WIDGET-REDESIGN.md for similar approach
      // Proposed: PAYLOAD THROUGHPUT (rate, success rate, queue size)
      // {
      //   title: 'FORWARDED PAYLOADS',
      //   value: this.formatNumber(data.forwardedPayloads.current),
      //   delta: `Webhook ${data.forwardedPayloads.webhookSuccess}%`,
      //   trend: data.forwardedPayloads.trend,
      //   info: [
      //     { icon: 'fa fa-globe me-1', text: `Webhooks ${data.forwardedPayloads.webhookSuccess}% success` },
      //     { icon: 'fa fa-database me-1', text: `DB batches ${data.forwardedPayloads.dbBatchSuccess}%` }
      //   ],
      //   chart: {
      //     series: [60, 25, 15],
      //     options: {
      //       chart: { type: 'donut', sparkline: { enabled: true }, height: 45 },
      //       stroke: { show: false },
      //       colors: ['#0EA5E9', '#6366F1', '#10B981']
      //     }
      //   }
      // }
    ];
  }

  private formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
