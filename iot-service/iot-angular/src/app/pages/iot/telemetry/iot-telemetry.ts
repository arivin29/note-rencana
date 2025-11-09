import { Component } from '@angular/core';

interface TelemetryRow {
  channel: string;
  project: string;
  unit: string;
  aggregation: string;
  min: number;
  max: number;
  avg: number;
  points: number;
}

@Component({
  selector: 'iot-telemetry',
  templateUrl: './iot-telemetry.html',
  standalone: false
})
export class IotTelemetryPage {
  aggregations = ['5m', '15m', '1h'];
  selectedAggregation = '5m';

  telemetry: TelemetryRow[] = [
    { channel: 'SNS-20-FLOW', project: 'Area A', unit: 'm3/h', aggregation: '5m', min: 98.2, max: 132.1, avg: 118.3, points: 12 },
    { channel: 'SNS-10-PRES', project: 'Area A', unit: 'bar', aggregation: '5m', min: 1.9, max: 3.8, avg: 2.7, points: 12 },
    { channel: 'SNS-33-TEMP', project: 'Reservoir B', unit: '°C', aggregation: '5m', min: 25.4, max: 34.2, avg: 28.8, points: 12 },
    { channel: 'SNS-20-FLOW', project: 'Area A', unit: 'm3/h', aggregation: '15m', min: 95.2, max: 134.8, avg: 120.5, points: 4 },
    { channel: 'SNS-10-PRES', project: 'Area A', unit: 'bar', aggregation: '15m', min: 1.7, max: 3.9, avg: 2.8, points: 4 },
    { channel: 'SNS-20-FLOW', project: 'Area A', unit: 'm3/h', aggregation: '1h', min: 90.1, max: 140.2, avg: 121.1, points: 1 }
  ];

  get filteredTelemetry() {
    return this.telemetry.filter((row) => row.aggregation === this.selectedAggregation);
  }
}
