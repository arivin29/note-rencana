import { Component } from '@angular/core';

interface AlertItem {
  id: string;
  channel: string;
  project: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'open' | 'acknowledged' | 'closed';
  triggeredAt: string;
  value: string;
}

@Component({
  selector: 'iot-alerts',
  templateUrl: './iot-alerts.html',
  standalone: false
})
export class IotAlertsPage {
  alerts: AlertItem[] = [
    { id: 'ALR-00121', channel: 'SNS-20-FLOW', project: 'Area A', severity: 'critical', status: 'open', triggeredAt: '2024-05-27 09:05 UTC', value: '72 m3/h' },
    { id: 'ALR-00119', channel: 'SNS-11-PRES', project: 'Booster West', severity: 'major', status: 'acknowledged', triggeredAt: '2024-05-27 08:31 UTC', value: '3.8 bar' },
    { id: 'ALR-00118', channel: 'SNS-04-TEMP', project: 'Reservoir B', severity: 'minor', status: 'closed', triggeredAt: '2024-05-27 07:48 UTC', value: '34 °C' }
  ];

  severityClass(severity: AlertItem['severity']) {
    switch (severity) {
      case 'critical':
        return 'badge bg-danger';
      case 'major':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-info';
    }
  }

  statusClass(status: AlertItem['status']) {
    switch (status) {
      case 'open':
        return 'badge bg-danger';
      case 'acknowledged':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-success';
    }
  }
}
