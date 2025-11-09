import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexStroke,
  ApexDataLabels,
  ApexXAxis,
  ApexFill
} from 'ng-apexcharts';

interface SensorChannelRow {
  id: string;
  metric: string;
  unit: string;
  latest: number;
  status: 'ok' | 'warning' | 'critical';
  trend: 'rising' | 'falling' | 'stable';
}

interface TelemetryRecord {
  metric: string;
  value: string;
  detail: string;
  updatedAt: string;
}

interface MaintenanceEvent {
  date: string;
  title: string;
  description: string;
  actor: string;
}

interface ChannelChart {
  label: string;
  metric: string;
  latest: string;
  chart: {
    series: ApexAxisChartSeries;
    options: {
      chart: ApexChart;
      stroke: ApexStroke;
      dataLabels: ApexDataLabels;
      xaxis: ApexXAxis;
      fill: ApexFill;
      colors: string[];
    };
  };
}

@Component({
  selector: 'nodes-detail',
  templateUrl: './nodes-detail.html',
  styleUrls: ['./nodes-detail.scss'],
  standalone: false
})
export class NodesDetailPage {
  nodeId = 'NODE-001';
  channels: SensorChannelRow[] = [
    { id: 'SNS-10-PRES', metric: 'Pressure', unit: 'bar', latest: 2.4, status: 'ok', trend: 'stable' },
    { id: 'SNS-10-TEMP', metric: 'Temperature', unit: '°C', latest: 27.8, status: 'warning', trend: 'rising' },
    { id: 'SNS-10-FLOW', metric: 'Flow Rate', unit: 'm3/h', latest: 118.2, status: 'critical', trend: 'falling' }
  ];

  nodeMeta = {
    owner: 'PT ABC',
    ownerContact: 'iot@ptabc.com',
    ownerPhone: '+62 811-2345-678',
    project: 'Area A',
    projectCode: 'PRJ-045',
    model: 'VX-200',
    protocol: 'LoRaWAN',
    firmware: 'v1.3.2',
    telemetryMode: 'push',
    telemetryInterval: '120s',
    location: 'Area A - Blok 3',
    coordinates: '-6.2213, 106.8432',
    lastMaintenance: '2024-05-12',
    uptime: '98.4%',
    alertsActive: 2
  };

  telemetryRecords: TelemetryRecord[] = [
    { metric: 'Battery', value: '78%', detail: 'Nominal (Li-SOCl2)', updatedAt: '09:12 UTC' },
    { metric: 'Signal RSSI', value: '-84 dBm', detail: 'Stable gateway link', updatedAt: '09:12 UTC' },
    { metric: 'Payload Drift', value: '< 0.2%', detail: 'No packet loss in last 24h', updatedAt: '09:00 UTC' }
  ];

  maintenanceTimeline: MaintenanceEvent[] = [
    {
      date: '12 May 2024',
      title: 'Pressure calibration',
      description: 'Recalibrated Rosemount 3051 using master gauge.',
      actor: 'Teknisi Andi'
    },
    {
      date: '22 Feb 2024',
      title: 'Firmware upgrade',
      description: 'Updated VX-200 to v1.3.2 for improved telemetry scheduler.',
      actor: 'Ops Center'
    },
    {
      date: '02 Jan 2024',
      title: 'Node relocation',
      description: 'Dipindah dari Area A Blok 1 ke Blok 3, update NodeAssignment & geotag.',
      actor: 'Tim Field'
    }
  ];

  channelCharts: ChannelChart[] = [
    this.createChannelChart('Pressure', 'bar', '2.4 bar', [2.2, 2.3, 2.35, 2.4, 2.38, 2.42, 2.41]),
    this.createChannelChart('Flow Rate', 'm3/h', '118 m3/h', [105, 110, 112, 120, 118, 117, 118]),
    this.createChannelChart('Temperature', '°C', '27.8 °C', [26.5, 26.8, 27.1, 27.5, 27.9, 28.1, 27.8]),
    this.createChannelChart('Voltage', 'V', '223 V', [221, 222, 223, 224, 223, 223, 223])
  ];

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

  private createChannelChart(label: string, unit: string, latest: string, data: number[]): ChannelChart {
    return {
      label,
      metric: unit,
      latest,
      chart: {
        series: [
          {
            name: label,
            data
          }
        ],
        options: {
          chart: {
            type: 'line',
            height: 160,
            sparkline: { enabled: true }
          },
          stroke: {
            curve: 'smooth',
            width: 3
          },
          dataLabels: { enabled: false },
          xaxis: {
            categories: ['-30m', '-25m', '-20m', '-15m', '-10m', '-5m', 'now']
          },
          fill: {
            type: 'gradient',
            gradient: {
              opacityFrom: 0.55,
              opacityTo: 0,
              stops: [0, 90]
            }
          },
          colors: ['#0EA5E9']
        }
      }
    };
  }
}
