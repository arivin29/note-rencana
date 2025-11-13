import { Component } from '@angular/core';

type Trend = 'up' | 'down' | 'flat';

interface KpiCard {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  icon: string;
  info: Array<{ icon: string; text: string }>;
  chart: {
    options: any;
    series: any[];
  };
}

interface AlertSummary {
  channel: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  ts: string;
}

interface NodeHealthRow {
  code: string;
  project: string;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: string;
  battery: number;
}

interface TelemetryMiniStat {
  name: string;
  total: string;
  progress: string;
  time: string;
  chart: {
    options: any;
    series: any[];
  };
  info: Array<{ title: string; value: string; class: string }>;
}

interface OwnerLeaderboardRow {
  owner: string;
  sla: string;
  nodes: number;
  telemetryRate: string;
  alerts: number;
  health: 'healthy' | 'attention' | 'risk';
}

interface DeliveryHealthRow {
  target: string;
  type: 'Webhook' | 'MySQL' | 'PostgreSQL';
  status: 'healthy' | 'degraded' | 'failed';
  successRate: string;
  lastSync: string;
  enabled: boolean;
}

interface ActivityLog {
  title: string;
  time: string;
  badge: string;
  highlight: boolean;
}

@Component({
  selector: 'iot-dashboard',
  templateUrl: './iot-dashboard.html',
  styleUrls: ['./iot-dashboard.scss'],
  standalone: false
})
export class IotDashboardPage {
  ownerFilterOptions = [
    { label: 'All Owners', value: 'all' },
    { label: 'PT Adhi Tirta Utama', value: 'adhi' },
    { label: 'PT Garuda Energi', value: 'garuda' },
    { label: 'Pemda Kota Mataram', value: 'mataram' }
  ];

  projectFilterOptions = [
    { label: 'All Projects', value: 'all' },
    { label: 'Area A Distribution', value: 'area-a' },
    { label: 'Reservoir Cluster', value: 'reservoir' },
    { label: 'DMA West', value: 'dma-west' }
  ];

  timeRangeOptions = [
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' }
  ];

  selectedOwner = 'all';
  selectedProject = 'all';
  selectedRange = '24h';

  kpis: KpiCard[] = [];
  telemetryOverview: {
    chart: { series: any[]; options: any };
    stats: TelemetryMiniStat[];
  } = {
    chart: { series: [], options: {} },
    stats: []
  };
  ownerLeaderboard: OwnerLeaderboardRow[] = [];
  deliveryHealth: DeliveryHealthRow[] = [];
  alertSummary: AlertSummary[] = [];
  nodeHealthTable: NodeHealthRow[] = [];
  activityLog: ActivityLog[] = [];

  constructor() {
    this.initStatCards();
    this.initTelemetryOverview();
    this.initTables();
  }

  private initStatCards() {
    const sparkBarOptions = {
      chart: { type: 'bar', sparkline: { enabled: true }, height: 30 },
      plotOptions: { bar: { horizontal: false, columnWidth: '60%', endingShape: 'rounded' } },
      stroke: { show: false },
      colors: ['#0EA5E9']
    };

    this.kpis = [
      {
        label: 'Nodes Online',
        value: '168',
        delta: '+3 vs last hour',
        trend: 'up',
        icon: 'bi bi-hdd-network',
        info: [
          { icon: 'fa fa-circle text-success me-1', text: '91% healthy' },
          { icon: 'fa fa-plug me-1', text: '6 new deployments' }
        ],
        chart: { options: sparkBarOptions, series: [{ data: this.randomSeries(12, 110, 180) }] }
      },
      {
        label: 'Active Alerts',
        value: '7',
        delta: '3 critical',
        trend: 'down',
        icon: 'bi bi-exclamation-triangle',
        info: [
          { icon: 'fa fa-exclamation-circle text-danger me-1', text: 'Pipeline #3' },
          { icon: 'fa fa-bell text-warning me-1', text: '5 warning muted' }
        ],
        chart: {
          options: { chart: { type: 'line', sparkline: { enabled: true }, height: 30 }, stroke: { curve: 'smooth', width: 2 }, colors: ['#F97316'] },
          series: [{ data: this.randomSeries(12, 2, 12) }]
        }
      },
      {
        label: 'Telemetry/min',
        value: '12.4K',
        delta: '+1.4K ingestion rate',
        trend: 'up',
        icon: 'bi bi-activity',
        info: [
          { icon: 'fa fa-arrow-up text-success me-1', text: 'LoRa gateways +8%' },
          { icon: 'fa fa-satellite-dish me-1', text: 'Global coverage stable' }
        ],
        chart: {
          options: { chart: { type: 'area', sparkline: { enabled: true }, height: 30 }, stroke: { curve: 'smooth', width: 2 }, colors: ['#22C55E'], fill: { opacity: 0.3 } },
          series: [{ data: this.randomSeries(12, 8, 15) }]
        }
      },
      {
        label: 'Forwarded Payloads',
        value: '4.9K',
        delta: 'Webhook / DB',
        trend: 'flat',
        icon: 'bi bi-diagram-3',
        info: [
          { icon: 'fa fa-globe me-1', text: 'Webhooks 99.1% success' },
          { icon: 'fa fa-database me-1', text: 'DB batches 92.4%' }
        ],
        chart: {
          options: { chart: { type: 'donut', sparkline: { enabled: true }, height: 45 }, stroke: { show: false }, colors: ['#0EA5E9', '#6366F1', '#10B981'] },
          series: [45, 32, 23]
        }
      }
    ];
  }

  private initTelemetryOverview() {
    this.telemetryOverview = {
      chart: {
        series: [
          { name: 'Flow Channels', data: this.randomSeries(24, 90, 160) },
          { name: 'Pressure Channels', data: this.randomSeries(24, 40, 95) }
        ],
        options: {
          chart: { type: 'area', height: 320, toolbar: { show: false }, animations: { enabled: true } },
          colors: ['#0EA5E9', '#8B5CF6'],
          dataLabels: { enabled: false },
          stroke: { curve: 'smooth', width: 3 },
          fill: { gradient: { shadeIntensity: 0.35, opacityFrom: 0.6, opacityTo: 0.05 } },
          xaxis: { categories: this.generateHours() },
          legend: { position: 'top', horizontalAlign: 'right' },
          grid: { borderColor: 'rgba(148,163,184,.2)' }
        }
      },
      stats: [
        {
          name: 'Ingestion Success',
          total: '99.4%',
          progress: '85%',
          time: 'Avg latency 420ms',
          chart: {
            options: { chart: { type: 'radialBar', sparkline: { enabled: true } }, plotOptions: { radialBar: { hollow: { size: '50%' } } }, stroke: { lineCap: 'round' }, colors: ['#10B981'] },
            series: [85]
          },
          info: [
            { title: 'Packets', value: '12.4K/min', class: 'text-success' },
            { title: 'Dropped', value: '72', class: 'text-danger' }
          ]
        },
        {
          name: 'Forwarding Load',
          total: '4.2K',
          progress: '67%',
          time: 'Webhook peak 09:10',
          chart: {
            options: { chart: { type: 'radialBar', sparkline: { enabled: true } }, plotOptions: { radialBar: { hollow: { size: '50%' } } }, stroke: { lineCap: 'round' }, colors: ['#F97316'] },
            series: [67]
          },
          info: [
            { title: 'Webhooks', value: '2.8K', class: 'text-warning' },
            { title: 'DB Batches', value: '1.4K', class: 'text-info' }
          ]
        }
      ]
    };
  }

  private initTables() {
    this.ownerLeaderboard = [
      { owner: 'PT Adhi Tirta Utama', sla: 'Gold', nodes: 124, telemetryRate: '12.4K/min', alerts: 3, health: 'healthy' },
      { owner: 'PT Garuda Energi', sla: 'Silver', nodes: 68, telemetryRate: '4.1K/min', alerts: 5, health: 'attention' },
      { owner: 'Pemda Kota Mataram', sla: 'Bronze', nodes: 44, telemetryRate: '2.3K/min', alerts: 1, health: 'healthy' }
    ];

    this.deliveryHealth = [
      { target: 'Command Center Webhook', type: 'Webhook', status: 'healthy', successRate: '99.2%', lastSync: '09:12 UTC', enabled: true },
      { target: 'MySQL - Utility Data Lake', type: 'MySQL', status: 'degraded', successRate: '92.7%', lastSync: '09:05 UTC', enabled: true },
      { target: 'PostgreSQL Ops DB', type: 'PostgreSQL', status: 'failed', successRate: '0%', lastSync: '08:11 UTC', enabled: false }
    ];

    this.alertSummary = [
      { channel: 'SNS-20-FLOW', severity: 'critical', message: 'Flow drop >30% vs baseline', ts: '09:05 UTC' },
      { channel: 'SNS-11-PRES', severity: 'warning', message: 'Pressure nearing max threshold', ts: '09:04 UTC' },
      { channel: 'SNS-04-TEMP', severity: 'info', message: 'Temperature recovered to normal', ts: '09:00 UTC' }
    ];

    this.nodeHealthTable = [
      { code: 'NODE-001', project: 'Area A', status: 'online', lastSeen: '09:12 UTC', battery: 78 },
      { code: 'NODE-014', project: 'Area A', status: 'degraded', lastSeen: '08:59 UTC', battery: 34 },
      { code: 'NODE-071', project: 'Booster West', status: 'offline', lastSeen: '06:41 UTC', battery: 0 },
      { code: 'NODE-099', project: 'Reservoir B', status: 'online', lastSeen: '09:08 UTC', battery: 62 }
    ];

    this.activityLog = [
      { title: 'Forwarding test webhook executed', time: '2 mins ago', badge: 'WEBHOOK', highlight: true },
      { title: 'Node NODE-014 entered degraded state', time: '5 mins ago', badge: 'ALERT', highlight: false },
      { title: 'Project DMA West synced telemetry batch', time: '8 mins ago', badge: 'SYNC', highlight: false },
      { title: 'Owner PT Adhi Tirta added 2 nodes', time: '12 mins ago', badge: 'OWNER', highlight: true }
    ];
  }

  getAlertBadgeClass(severity: AlertSummary['severity']) {
    switch (severity) {
      case 'critical':
        return 'badge bg-danger';
      case 'warning':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-info';
    }
  }

  getStatusBadgeClass(status: NodeHealthRow['status']) {
    switch (status) {
      case 'online':
        return 'badge bg-success';
      case 'degraded':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }

  getDeliveryStatusBadge(status: DeliveryHealthRow['status']) {
    switch (status) {
      case 'healthy':
        return 'badge bg-success-subtle text-success';
      case 'degraded':
        return 'badge bg-warning-subtle text-warning';
      default:
        return 'badge bg-danger-subtle text-danger';
    }
  }

  private randomSeries(points: number, min: number, max: number) {
    return Array.from({ length: points }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  }

  private generateHours() {
    const hours: string[] = [];
    for (let i = 0; i < 24; i++) {
      hours.push(`${i}:00`);
    }
    return hours;
  }

  setFilter(type: 'owner' | 'project' | 'range', value: string) {
    if (type === 'owner') {
      this.selectedOwner = value;
    } else if (type === 'project') {
      this.selectedProject = value;
    } else {
      this.selectedRange = value;
    }
  }

  getOwnerLabel() {
    if (this.selectedOwner === 'all') {
      return 'all owners';
    }
    return this.ownerFilterOptions.find((option) => option.value === this.selectedOwner)?.label ?? this.selectedOwner;
  }

  getProjectLabel() {
    if (this.selectedProject === 'all') {
      return 'all projects';
    }
    return this.projectFilterOptions.find((option) => option.value === this.selectedProject)?.label ?? this.selectedProject;
  }

  getRangeLabel() {
    return this.timeRangeOptions.find((option) => option.value === this.selectedRange)?.label ?? this.selectedRange;
  }

  resetFilters() {
    this.selectedOwner = 'all';
    this.selectedProject = 'all';
    this.selectedRange = '24h';
  }
}
