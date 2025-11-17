import { Component } from '@angular/core';

@Component({
  selector: 'iot-dashboard-kedua',
  templateUrl: './iot-dashboard-kedua.html',
  styleUrls: ['./iot-dashboard-kedua.scss'],
  standalone: false,
})
export class IotDashboardKeduaPage {
  // Central filter state for child widgets
  selectedOwnerId?: string;
  selectedProjectId?: string;
  timeRange: '24h' | '7d' | '30d' = '24h';

  onFiltersChanged(filters: { ownerId?: string; projectId?: string; timeRange?: '24h'|'7d'|'30d' }) {
    this.selectedOwnerId = filters.ownerId;
    this.selectedProjectId = filters.projectId;
    this.timeRange = (filters.timeRange || this.timeRange);
  }
}
