import { Component } from '@angular/core';

type TelemetryQuality = 'good' | 'warning' | 'critical';
type TelemetryTrend = 'up' | 'down' | 'flat';

interface TelemetryRow {
  idSensorChannel: string;
  channelLabel: string;
  idSensor: string;
  sensorType: string;
  idNode: string;
  nodeName: string;
  project: string;
  projectCode: string;
  owner: string;
  ownerCode: string;
  unit: string;
  aggregation: string;
  windowStart: string;
  windowEnd: string;
  min: number;
  avg: number;
  max: number;
  latest: number;
  points: number;
  quality: TelemetryQuality;
  trend: TelemetryTrend;
}

@Component({
  selector: 'telemetry-list',
  templateUrl: './telemetry-list.html',
  styleUrls: ['./telemetry-list.scss'],
  standalone: false
})
export class TelemetryListPage {
  aggregations = ['5m', '15m', '1h'];
  selectedAggregation = '5m';
  searchTerm = '';

  filters = {
    owner: 'All Owners',
    project: 'All Projects'
  };

  aggregationLabels: Record<string, string> = {
    '5m': '5 Menit',
    '15m': '15 Menit',
    '1h': '1 Jam'
  };

  telemetry: TelemetryRow[] = [
    {
      idSensorChannel: 'SNS-20-FLOW',
      channelLabel: 'Flow Rate - Main Pump',
      idSensor: 'SNS-20',
      sensorType: 'Flow Meter',
      idNode: 'NODE-001',
      nodeName: 'Pump Station Utara',
      project: 'Area A',
      projectCode: 'PRJ-A-01',
      owner: 'PT ABC',
      ownerCode: 'OWN-ABC',
      unit: 'm3/h',
      aggregation: '5m',
      windowStart: '2024-08-09T14:00:00+07:00',
      windowEnd: '2024-08-09T14:05:00+07:00',
      min: 98.2,
      max: 132.1,
      avg: 118.3,
      latest: 121.6,
      points: 12,
      quality: 'good',
      trend: 'up'
    },
    {
      idSensorChannel: 'SNS-10-PRES',
      channelLabel: 'Inlet Pressure',
      idSensor: 'SNS-10',
      sensorType: 'Pressure',
      idNode: 'NODE-001',
      nodeName: 'Pump Station Utara',
      project: 'Area A',
      projectCode: 'PRJ-A-01',
      owner: 'PT ABC',
      ownerCode: 'OWN-ABC',
      unit: 'bar',
      aggregation: '5m',
      windowStart: '2024-08-09T14:00:00+07:00',
      windowEnd: '2024-08-09T14:05:00+07:00',
      min: 1.9,
      max: 3.8,
      avg: 2.7,
      latest: 2.3,
      points: 12,
      quality: 'warning',
      trend: 'down'
    },
    {
      idSensorChannel: 'SNS-033-TEMP',
      channelLabel: 'Reservoir Ambient Temp',
      idSensor: 'SNS-033',
      sensorType: 'Temperature',
      idNode: 'NODE-071',
      nodeName: 'Reservoir B Control',
      project: 'Reservoir B',
      projectCode: 'PRJ-B-11',
      owner: 'PT ABC',
      ownerCode: 'OWN-ABC',
      unit: '°C',
      aggregation: '5m',
      windowStart: '2024-08-09T14:00:00+07:00',
      windowEnd: '2024-08-09T14:05:00+07:00',
      min: 25.4,
      max: 34.2,
      avg: 28.8,
      latest: 27.9,
      points: 12,
      quality: 'good',
      trend: 'flat'
    },
    {
      idSensorChannel: 'SNS-20-FLOW',
      channelLabel: 'Flow Rate - Main Pump',
      idSensor: 'SNS-20',
      sensorType: 'Flow Meter',
      idNode: 'NODE-001',
      nodeName: 'Pump Station Utara',
      project: 'Area A',
      projectCode: 'PRJ-A-01',
      owner: 'PT ABC',
      ownerCode: 'OWN-ABC',
      unit: 'm3/h',
      aggregation: '15m',
      windowStart: '2024-08-09T13:45:00+07:00',
      windowEnd: '2024-08-09T14:00:00+07:00',
      min: 95.2,
      max: 134.8,
      avg: 120.5,
      latest: 118.7,
      points: 4,
      quality: 'good',
      trend: 'flat'
    },
    {
      idSensorChannel: 'SNS-88-CHLOR',
      channelLabel: 'Chlorine Level',
      idSensor: 'SNS-88',
      sensorType: 'Chemical Analyzer',
      idNode: 'NODE-115',
      nodeName: 'Treatment Plant Barat',
      project: 'WTP Barat',
      projectCode: 'PRJ-W-09',
      owner: 'PDAM Kota',
      ownerCode: 'OWN-PDAM',
      unit: 'ppm',
      aggregation: '5m',
      windowStart: '2024-08-09T14:00:00+07:00',
      windowEnd: '2024-08-09T14:05:00+07:00',
      min: 0.35,
      max: 0.92,
      avg: 0.61,
      latest: 0.88,
      points: 12,
      quality: 'critical',
      trend: 'up'
    },
    {
      idSensorChannel: 'SNS-415-HUM',
      channelLabel: 'Humidity Sensor',
      idSensor: 'SNS-415',
      sensorType: 'Humidity',
      idNode: 'NODE-402',
      nodeName: 'Warehouse Selatan',
      project: 'Logistics Monitoring',
      projectCode: 'PRJ-L-02',
      owner: 'PT Logistic',
      ownerCode: 'OWN-LOG',
      unit: '%RH',
      aggregation: '5m',
      windowStart: '2024-08-09T14:00:00+07:00',
      windowEnd: '2024-08-09T14:05:00+07:00',
      min: 55.1,
      max: 70.4,
      avg: 62.7,
      latest: 69.8,
      points: 12,
      quality: 'warning',
      trend: 'up'
    }
  ];

  ownerOptions = ['All Owners', ...new Set(this.telemetry.map((row) => row.owner))];
  projectOptions = ['All Projects', ...new Set(this.telemetry.map((row) => row.project))];

  setFilter(type: 'owner' | 'project', value: string) {
    this.filters[type] = value;
  }

  get filteredTelemetry() {
    const term = this.searchTerm.trim().toLowerCase();

    return this.telemetry.filter((row) => {
      const matchAgg = row.aggregation === this.selectedAggregation;
      const matchOwner = this.filters.owner === 'All Owners' || row.owner === this.filters.owner;
      const matchProject = this.filters.project === 'All Projects' || row.project === this.filters.project;
      const matchSearch =
        !term ||
        row.idSensorChannel.toLowerCase().includes(term) ||
        row.idNode.toLowerCase().includes(term) ||
        row.project.toLowerCase().includes(term) ||
        row.owner.toLowerCase().includes(term);
      return matchAgg && matchOwner && matchProject && matchSearch;
    });
  }

  get totalChannels() {
    return this.filteredTelemetry.length;
  }

  get totalPoints() {
    return this.filteredTelemetry.reduce((sum, row) => sum + row.points, 0);
  }

  get uniqueNodesCount() {
    return new Set(this.filteredTelemetry.map((row) => row.idNode)).size;
  }

  get selectedAggregationLabel() {
    return this.aggregationLabels[this.selectedAggregation] || this.selectedAggregation;
  }

  get windowRange() {
    const rows = this.filteredTelemetry;
    if (!rows.length) {
      return null;
    }
    const start = rows.reduce((acc, row) => (row.windowStart < acc ? row.windowStart : acc), rows[0].windowStart);
    const end = rows.reduce((acc, row) => (row.windowEnd > acc ? row.windowEnd : acc), rows[0].windowEnd);
    return { start, end };
  }

  get qualitySummary() {
    const rows = this.filteredTelemetry;
    return {
      good: rows.filter((row) => row.quality === 'good').length,
      warning: rows.filter((row) => row.quality === 'warning').length,
      critical: rows.filter((row) => row.quality === 'critical').length
    };
  }

  trendIcon(trend: TelemetryTrend) {
    switch (trend) {
      case 'up':
        return 'fa-arrow-up text-success';
      case 'down':
        return 'fa-arrow-down text-danger';
      default:
        return 'fa-minus text-muted';
    }
  }

  qualityBadge(quality: TelemetryQuality) {
    switch (quality) {
      case 'good':
        return 'bg-success-subtle text-success';
      case 'warning':
        return 'bg-warning-subtle text-warning';
      case 'critical':
        return 'bg-danger-subtle text-danger';
      default:
        return 'bg-secondary text-white';
    }
  }
}
