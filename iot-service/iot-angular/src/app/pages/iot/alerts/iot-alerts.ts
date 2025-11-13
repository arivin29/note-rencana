import { Component } from '@angular/core';

type AlertSeverity = 'critical' | 'major' | 'minor' | 'info';
type AlertStatus = 'open' | 'acknowledged' | 'silenced' | 'resolved';

interface AlertItem {
  id: string;
  channel: string;
  channelLabel: string;
  project: string;
  owner: string;
  node: string;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: string;
  duration: string;
  value: string;
  unit: string;
  threshold: string;
  assignedTo: string;
  lastNotified: string;
  summary: string;
}

interface AlertActivity {
  id: string;
  time: string;
  actor: string;
  action: string;
  note?: string;
}

@Component({
  selector: 'iot-alerts',
  templateUrl: './iot-alerts.html',
  standalone: false
})
export class IotAlertsPage {
  searchTerm = '';
  alerts: AlertItem[] = [
    {
      id: 'ALR-00121',
      channel: 'SNS-20-FLOW',
      channelLabel: 'Flow Rate - Main Pump',
      project: 'Area A',
      owner: 'PT ABC',
      node: 'NODE-001',
      severity: 'critical',
      status: 'open',
      triggeredAt: '2024-08-09T07:15:00+07:00',
      duration: '18m',
      value: '72',
      unit: 'm3/h',
      threshold: '>= 90 m3/h',
      assignedTo: 'Siti N.',
      lastNotified: '07:25 WIB',
      summary: 'Flow dropped below contract threshold for 4 consecutive windows.'
    },
    {
      id: 'ALR-00119',
      channel: 'SNS-11-PRES',
      channelLabel: 'Inlet Pressure',
      project: 'Booster West',
      owner: 'PT ABC',
      node: 'NODE-014',
      severity: 'major',
      status: 'acknowledged',
      triggeredAt: '2024-08-09T06:48:00+07:00',
      duration: '45m',
      value: '3.8',
      unit: 'bar',
      threshold: '<= 3.5 bar',
      assignedTo: 'Arief P.',
      lastNotified: '07:10 WIB',
      summary: 'Pressure nearing cavitation threshold. Acknowledged by ops.'
    },
    {
      id: 'ALR-00118',
      channel: 'SNS-04-TEMP',
      channelLabel: 'Reservoir Ambient Temp',
      project: 'Reservoir B',
      owner: 'PT ABC',
      node: 'NODE-071',
      severity: 'minor',
      status: 'resolved',
      triggeredAt: '2024-08-09T05:12:00+07:00',
      duration: '1h 10m',
      value: '34',
      unit: '°C',
      threshold: '>= 33 °C',
      assignedTo: 'Monitoring Bot',
      lastNotified: '06:20 WIB',
      summary: 'Temperature normalized after ventilation cycle.'
    },
    {
      id: 'ALR-00115',
      channel: 'SNS-99-CHLOR',
      channelLabel: 'Chlorine Level',
      project: 'WTP Barat',
      owner: 'PDAM Kota',
      node: 'NODE-115',
      severity: 'critical',
      status: 'silenced',
      triggeredAt: '2024-08-09T04:40:00+07:00',
      duration: '2h 05m',
      value: '0.88',
      unit: 'ppm',
      threshold: '>= 0.95 ppm',
      assignedTo: 'QA Automation',
      lastNotified: '06:30 WIB',
      summary: 'Chlorine dosing pump maintenance window (silenced).'
    },
    {
      id: 'ALR-00110',
      channel: 'SNS-415-HUM',
      channelLabel: 'Warehouse Humidity',
      project: 'Logistics Monitoring',
      owner: 'PT Logistic',
      node: 'NODE-402',
      severity: 'major',
      status: 'open',
      triggeredAt: '2024-08-09T07:05:00+07:00',
      duration: '21m',
      value: '71',
      unit: '%RH',
      threshold: '<= 65 %RH',
      assignedTo: 'IoT On-call',
      lastNotified: '07:20 WIB',
      summary: 'Humidity spikes detected in cold storage area.'
    }
  ];

  activities: AlertActivity[] = [
    { id: 'LOG-3021', time: '07:22 WIB', actor: 'Siti N.', action: 'Escalated ALR-00121 to field ops', note: 'Request onsite valve check' },
    { id: 'LOG-3018', time: '07:10 WIB', actor: 'System', action: 'SMS sent to standby engineer (ALR-00110)' },
    { id: 'LOG-3014', time: '06:55 WIB', actor: 'Arief P.', action: 'Acknowledged ALR-00119', note: 'Monitoring remotely' },
    { id: 'LOG-3009', time: '06:20 WIB', actor: 'System', action: 'Resolved ALR-00118 after metrics normalized' }
  ];

  filters = {
    owner: 'All Owners',
    severity: 'All Severities',
    status: 'Active Only'
  };

  ownerOptions = ['All Owners', ...new Set(this.alerts.map((alert) => alert.owner))];
  severityOptions = ['All Severities', 'Critical', 'Major', 'Minor', 'Info'];
  statusOptions = ['Active Only', 'Acknowledged', 'Silenced', 'Resolved'];

  setFilter(key: keyof typeof this.filters, value: string) {
    this.filters[key] = value;
  }

  get filteredAlerts() {
    const severityFilter = this.filters.severity.toLowerCase();
    const statusFilter = this.filters.status.toLowerCase();
    const term = this.searchTerm.trim().toLowerCase();

    return this.alerts.filter((alert) => {
      const matchOwner = this.filters.owner === 'All Owners' || alert.owner === this.filters.owner;
      const matchSeverity = severityFilter === 'all severities' || alert.severity === severityFilter;
      const matchSearch =
        !term ||
        alert.id.toLowerCase().includes(term) ||
        alert.channel.toLowerCase().includes(term) ||
        alert.project.toLowerCase().includes(term) ||
        alert.owner.toLowerCase().includes(term) ||
        alert.assignedTo.toLowerCase().includes(term);

      let matchStatus = true;
      switch (statusFilter) {
        case 'active only':
          matchStatus = alert.status === 'open' || alert.status === 'acknowledged';
          break;
        case 'acknowledged':
          matchStatus = alert.status === 'acknowledged';
          break;
        case 'silenced':
          matchStatus = alert.status === 'silenced';
          break;
        case 'resolved':
          matchStatus = alert.status === 'resolved';
          break;
        default:
          matchStatus = true;
      }

      return matchOwner && matchSeverity && matchStatus && matchSearch;
    });
  }

  get openCount() {
    return this.alerts.filter((alert) => alert.status === 'open').length;
  }

  get acknowledgedCount() {
    return this.alerts.filter((alert) => alert.status === 'acknowledged').length;
  }

  get silencedCount() {
    return this.alerts.filter((alert) => alert.status === 'silenced').length;
  }

  get criticalCount() {
    return this.alerts.filter((alert) => alert.severity === 'critical').length;
  }

  severityClass(severity: AlertSeverity) {
    switch (severity) {
      case 'critical':
        return 'badge bg-danger';
      case 'major':
        return 'badge bg-warning text-dark';
      case 'minor':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  statusClass(status: AlertStatus) {
    switch (status) {
      case 'open':
        return 'badge bg-danger';
      case 'acknowledged':
        return 'badge bg-warning text-dark';
      case 'silenced':
        return 'badge bg-secondary text-white';
      case 'resolved':
        return 'badge bg-success';
      default:
        return 'badge bg-light text-dark';
    }
  }
}
