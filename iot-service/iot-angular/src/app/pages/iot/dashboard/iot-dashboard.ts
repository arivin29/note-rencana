import { Component } from '@angular/core';

type Trend = 'up' | 'down' | 'flat';

interface KpiCard {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  icon: string;
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

interface TelemetryTrend {
  channel: string;
  unit: string;
  current: number;
  min: number;
  max: number;
  avg: number;
}

@Component({
  selector: 'iot-dashboard',
  templateUrl: './iot-dashboard.html',
  standalone: false
})
export class IotDashboardPage {
  kpis: KpiCard[] = [
    { label: 'Total Nodes', value: '184', delta: '+12 vs last week', trend: 'up', icon: 'bi bi-hdd-network' },
    { label: 'Nodes Online', value: '168', delta: '91% healthy', trend: 'flat', icon: 'bi bi-wifi' },
    { label: 'Active Alerts', value: '7', delta: '3 critical', trend: 'down', icon: 'bi bi-exclamation-triangle' },
    { label: 'Telemetry/min', value: '12.4K', delta: '+1.4K ingestion rate', trend: 'up', icon: 'bi bi-activity' }
  ];

  alertSummary: AlertSummary[] = [
    { channel: 'SNS-20-FLOW', severity: 'critical', message: 'Flow drop >30% vs baseline', ts: '09:05 UTC' },
    { channel: 'SNS-11-PRES', severity: 'warning', message: 'Pressure nearing max threshold', ts: '09:04 UTC' },
    { channel: 'SNS-04-TEMP', severity: 'info', message: 'Temperature recovered to normal', ts: '09:00 UTC' }
  ];

  nodeHealthTable: NodeHealthRow[] = [
    { code: 'NODE-001', project: 'Area A', status: 'online', lastSeen: '09:12 UTC', battery: 78 },
    { code: 'NODE-014', project: 'Area A', status: 'degraded', lastSeen: '08:59 UTC', battery: 34 },
    { code: 'NODE-071', project: 'Booster West', status: 'offline', lastSeen: '06:41 UTC', battery: 0 },
    { code: 'NODE-099', project: 'Reservoir B', status: 'online', lastSeen: '09:08 UTC', battery: 62 }
  ];

  telemetryTrends: TelemetryTrend[] = [
    { channel: 'SNS-20-FLOW', unit: 'm3/h', current: 120.4, min: 98.2, max: 132.1, avg: 118.3 },
    { channel: 'SNS-10-PRES', unit: 'bar', current: 2.6, min: 1.9, max: 3.8, avg: 2.7 },
    { channel: 'SNS-33-TEMP', unit: '°C', current: 28.1, min: 25.4, max: 34.2, avg: 28.8 }
  ];

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
}
