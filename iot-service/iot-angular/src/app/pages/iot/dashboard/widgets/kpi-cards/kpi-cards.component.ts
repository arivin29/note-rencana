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
        title: 'NODES ONLINE',
        value: data.nodesOnline.current,
        delta: data.nodesOnline.delta,
        trend: data.nodesOnline.trend,
        info: [
          { icon: 'fa fa-circle text-success me-1', text: `${data.nodesOnline.healthyPercentage}% healthy` },
          { icon: 'fa fa-plug me-1', text: `${data.nodesOnline.newDeployments} new deployments` }
        ],
        chart: {
          series: [{ data: data.nodesOnline.sparkline }],
          options: {
            chart: { type: 'bar', sparkline: { enabled: true }, height: 30 },
            plotOptions: { bar: { horizontal: false, columnWidth: '60%', endingShape: 'rounded' } },
            stroke: { show: false },
            colors: ['#0EA5E9']
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
        title: 'TELEMETRY/MIN',
        value: this.formatNumber(data.telemetryRate.current),
        delta: data.telemetryRate.delta,
        trend: data.telemetryRate.trend,
        info: [
          { icon: 'fa fa-arrow-up text-success me-1', text: `LoRa gateways +${data.telemetryRate.loraGrowth}%` },
          { icon: 'fa fa-satellite-dish me-1', text: `Coverage ${data.telemetryRate.coverage}` }
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
      },
      {
        title: 'FORWARDED PAYLOADS',
        value: this.formatNumber(data.forwardedPayloads.current),
        delta: `Webhook ${data.forwardedPayloads.webhookSuccess}%`,
        trend: data.forwardedPayloads.trend,
        info: [
          { icon: 'fa fa-globe me-1', text: `Webhooks ${data.forwardedPayloads.webhookSuccess}% success` },
          { icon: 'fa fa-database me-1', text: `DB batches ${data.forwardedPayloads.dbBatchSuccess}%` }
        ],
        chart: {
          series: [60, 25, 15], // Default distribution: webhook, mysql, postgresql
          options: {
            chart: { type: 'donut', sparkline: { enabled: true }, height: 45 },
            stroke: { show: false },
            colors: ['#0EA5E9', '#6366F1', '#10B981']
          }
        }
      }
    ];
  }

  private formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
