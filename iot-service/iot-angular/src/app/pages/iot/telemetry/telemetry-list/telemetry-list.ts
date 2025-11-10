import { Component } from '@angular/core';

interface TelemetryRow {
  idSensorChannel: string;
  idSensor: string;
  idNode: string;
  project: string;
  owner: string;
  unit: string;
  aggregation: string;
  min: number;
  avg: number;
  max: number;
  points: number;
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
      idSensor: 'SNS-20',
      idNode: 'NODE-001',
      project: 'Area A',
      owner: 'PT ABC',
      unit: 'm3/h',
      aggregation: '5m',
      min: 98.2,
      max: 132.1,
      avg: 118.3,
      points: 12
    },
    {
      idSensorChannel: 'SNS-10-PRES',
      idSensor: 'SNS-10',
      idNode: 'NODE-001',
      project: 'Area A',
      owner: 'PT ABC',
      unit: 'bar',
      aggregation: '5m',
      min: 1.9,
      max: 3.8,
      avg: 2.7,
      points: 12
    },
    {
      idSensorChannel: 'SNS-033-TEMP',
      idSensor: 'SNS-033',
      idNode: 'NODE-071',
      project: 'Reservoir B',
      owner: 'PT ABC',
      unit: '°C',
      aggregation: '5m',
      min: 25.4,
      max: 34.2,
      avg: 28.8,
      points: 12
    },
    {
      idSensorChannel: 'SNS-20-FLOW',
      idSensor: 'SNS-20',
      idNode: 'NODE-001',
      project: 'Area A',
      owner: 'PT ABC',
      unit: 'm3/h',
      aggregation: '15m',
      min: 95.2,
      max: 134.8,
      avg: 120.5,
      points: 4
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
}
