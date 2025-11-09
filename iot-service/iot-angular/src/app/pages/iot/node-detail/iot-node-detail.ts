import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface SensorChannelRow {
  id: string;
  metric: string;
  unit: string;
  latest: number;
  status: 'ok' | 'warning' | 'critical';
  trend: 'rising' | 'falling' | 'stable';
}

@Component({
  selector: 'iot-node-detail',
  templateUrl: './iot-node-detail.html',
  standalone: false
})
export class IotNodeDetailPage {
  nodeId = 'NODE-001';
  channels: SensorChannelRow[] = [
    { id: 'SNS-10-PRES', metric: 'Pressure', unit: 'bar', latest: 2.4, status: 'ok', trend: 'stable' },
    { id: 'SNS-10-TEMP', metric: 'Temperature', unit: '°C', latest: 27.8, status: 'warning', trend: 'rising' },
    { id: 'SNS-10-FLOW', metric: 'Flow Rate', unit: 'm3/h', latest: 118.2, status: 'critical', trend: 'falling' }
  ];

  nodeMeta = {
    owner: 'PT ABC',
    project: 'Area A',
    model: 'VX-200',
    protocol: 'LoRaWAN',
    firmware: 'v1.3.2',
    location: 'Area A - Blok 3',
    lastMaintenance: '2024-05-12'
  };

  constructor(private route: ActivatedRoute) {
    this.route.paramMap.subscribe((params) => {
      const paramId = params.get('nodeId');
      if (paramId) {
        this.nodeId = paramId;
      }
    });
  }

  badgeClass(status: SensorChannelRow['status']) {
    switch (status) {
      case 'ok':
        return 'badge bg-success';
      case 'warning':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-danger';
    }
  }
}
