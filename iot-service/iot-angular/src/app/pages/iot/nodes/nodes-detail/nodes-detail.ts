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
import { AddSensorFormValue, SensorCatalogOption, SensorHealthOption } from './node-detail-add-sensor-drawer/node-detail-add-sensor-drawer.component';
import { AddChannelFormValue, SensorTypeOption } from './node-detail-add-channel-drawer/node-detail-add-channel-drawer.component';

interface SensorChannelRow {
  id: string;
  metric: string;
  unit: string;
  latest: number;
  status: 'ok' | 'warning' | 'critical';
  trend: 'rising' | 'falling' | 'stable';
  sensorTypeId: string;
  sensorTypeLabel: string;
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

type SensorHealth = SensorHealthOption;

interface SensorDetail {
  id: string;
  label: string;
  sensorCatalogId: string;
  sensorCatalogLabel: string;
  location: string;
  health: SensorHealth;
  protocolChannel?: string;
  samplingRate?: number | null;
  channels: SensorChannelRow[];
}

@Component({
  selector: 'nodes-detail',
  templateUrl: './nodes-detail.html',
  styleUrls: ['./nodes-detail.scss'],
  standalone: false
})
export class NodesDetailPage {
  nodeId = 'NODE-001';
  isAddSensorDrawerOpen = false;
  channelDrawerState = {
    isOpen: false,
    sensorId: '',
    sensorLabel: ''
  };
  sensorCatalogOptions: SensorCatalogOption[] = [
    { id: 'CAT-ROSEMOUNT-3051', label: 'Rosemount 3051 Pressure' },
    { id: 'CAT-SIEMENS-MAG', label: 'Siemens SITRANS MAG 5000' },
    { id: 'CAT-ABB-ULTRASONIC', label: 'ABB LLT100 Ultrasonic Level' }
  ];
  sensorTypeOptions: SensorTypeOption[] = [
    { id: 'TYPE-PRESSURE', label: 'Pipeline Pressure' },
    { id: 'TYPE-FLOW', label: 'Flow Meter' },
    { id: 'TYPE-LEVEL', label: 'Reservoir Level' },
    { id: 'TYPE-QUALITY', label: 'Water Quality' }
  ];
  sensors: SensorDetail[] = [
    {
      id: 'SNS-10',
      label: 'Pressure Sensor Cluster',
      sensorCatalogId: 'CAT-ROSEMOUNT-3051',
      sensorCatalogLabel: 'Rosemount 3051 Pressure',
      location: 'Vault 3 · Zone Barat',
      health: 'online',
      protocolChannel: 'RS485-1',
      samplingRate: 120,
      channels: [
        {
          id: 'SNS-10-PRES',
          metric: 'Pressure',
          unit: 'bar',
          latest: 2.4,
          status: 'ok',
          trend: 'stable',
          sensorTypeId: 'TYPE-PRESSURE',
          sensorTypeLabel: 'Pipeline Pressure'
        },
        {
          id: 'SNS-10-TEMP',
          metric: 'Temperature',
          unit: '°C',
          latest: 27.8,
          status: 'warning',
          trend: 'rising',
          sensorTypeId: 'TYPE-QUALITY',
          sensorTypeLabel: 'Water Quality'
        }
      ]
    },
    {
      id: 'SNS-21',
      label: 'Reservoir Level Stack',
      sensorCatalogId: 'CAT-ABB-ULTRASONIC',
      sensorCatalogLabel: 'ABB LLT100 Ultrasonic Level',
      location: 'Reservoir Utama',
      health: 'maintenance',
      protocolChannel: '4-20mA',
      samplingRate: 60,
      channels: [
        {
          id: 'SNS-21-LEVEL',
          metric: 'Water Level',
          unit: 'm',
          latest: 3.18,
          status: 'ok',
          trend: 'stable',
          sensorTypeId: 'TYPE-LEVEL',
          sensorTypeLabel: 'Reservoir Level'
        },
        {
          id: 'SNS-21-VIB',
          metric: 'Vibration',
          unit: 'mm/s',
          latest: 1.8,
          status: 'ok',
          trend: 'falling',
          sensorTypeId: 'TYPE-FLOW',
          sensorTypeLabel: 'Flow Meter'
        },
        {
          id: 'SNS-21-TEMP',
          metric: 'Liquid Temp',
          unit: '°C',
          latest: 25.1,
          status: 'warning',
          trend: 'rising',
          sensorTypeId: 'TYPE-QUALITY',
          sensorTypeLabel: 'Water Quality'
        }
      ]
    },
    {
      id: 'SNS-34',
      label: 'Distribution Flow Meter',
      sensorCatalogId: 'CAT-SIEMENS-MAG',
      sensorCatalogLabel: 'Siemens SITRANS MAG 5000',
      location: 'DMA 4 · Pintu Selatan',
      health: 'offline',
      protocolChannel: 'Modbus-12',
      samplingRate: 300,
      channels: [
        {
          id: 'SNS-34-FLOW',
          metric: 'Flow Rate',
          unit: 'm3/h',
          latest: 118.2,
          status: 'critical',
          trend: 'falling',
          sensorTypeId: 'TYPE-FLOW',
          sensorTypeLabel: 'Flow Meter'
        },
        {
          id: 'SNS-34-VOL',
          metric: 'Totalized Volume',
          unit: 'm3',
          latest: 54012,
          status: 'ok',
          trend: 'rising',
          sensorTypeId: 'TYPE-FLOW',
          sensorTypeLabel: 'Flow Meter'
        }
      ]
    }
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

  openAddSensorDrawer() {
    this.isAddSensorDrawerOpen = true;
  }

  handleAddSensorDrawerClose() {
    this.isAddSensorDrawerOpen = false;
  }

  handleAddSensorSave(formValue: AddSensorFormValue) {
    const catalog = this.sensorCatalogOptions.find((option) => option.id === formValue.sensorCatalogId);
    const newSensor: SensorDetail = {
      id: formValue.sensorCode,
      label: formValue.label,
      sensorCatalogId: formValue.sensorCatalogId,
      sensorCatalogLabel: catalog?.label ?? 'Custom Catalog',
      location: formValue.location || 'Unassigned',
      health: formValue.health,
      protocolChannel: formValue.protocolChannel,
      samplingRate: formValue.samplingRate,
      channels: []
    };
    this.sensors = [newSensor, ...this.sensors];
    this.isAddSensorDrawerOpen = false;
  }

  openAddChannelDrawer(sensor: SensorDetail) {
    this.channelDrawerState = {
      isOpen: true,
      sensorId: sensor.id,
      sensorLabel: sensor.label
    };
  }

  handleAddChannelDrawerClose() {
    this.channelDrawerState = {
      isOpen: false,
      sensorId: '',
      sensorLabel: ''
    };
  }

  handleAddChannelSave(formValue: AddChannelFormValue) {
    this.sensors = this.sensors.map((sensor) => {
      if (sensor.id !== formValue.sensorId) {
        return sensor;
      }
      return {
        ...sensor,
        channels: [
          {
            id: formValue.channelId,
            metric: formValue.metricCode,
            unit: formValue.unit,
            latest: 0,
            status: 'ok',
            trend: 'stable',
            sensorTypeId: formValue.sensorTypeId,
            sensorTypeLabel: this.sensorTypeOptions.find((opt) => opt.id === formValue.sensorTypeId)?.label ?? 'Custom'
          },
          ...sensor.channels
        ]
      };
    });
    this.handleAddChannelDrawerClose();
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

  sensorHealthBadge(health: SensorHealth) {
    switch (health) {
      case 'online':
        return 'badge bg-success-subtle text-success';
      case 'maintenance':
        return 'badge bg-warning-subtle text-warning';
      default:
        return 'badge bg-danger-subtle text-danger';
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
