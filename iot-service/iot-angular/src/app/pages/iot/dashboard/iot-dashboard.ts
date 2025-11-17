import { Component } from '@angular/core';

@Component({
  selector: 'iot-dashboard',
  templateUrl: './iot-dashboard.html',
  styleUrls: ['./iot-dashboard.scss'],
  standalone: false
})
export class IotDashboardPage {
  ownerFilterOptions = [
    { label: 'All Owners', value: 'all' },
    { label: 'PT Adhi Tirta Utama', value: 'adhi' },
    { label: 'PT Garuda Energi', value: 'garuda' },
    { label: 'Pemda Kota Mataram', value: 'mataram' }
  ];

  projectFilterOptions = [
    { label: 'All Projects', value: 'all' },
    { label: 'Area A Distribution', value: 'area-a' },
    { label: 'Reservoir Cluster', value: 'reservoir' },
    { label: 'DMA West', value: 'dma-west' }
  ];

  timeRangeOptions = [
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' }
  ];

  selectedOwner = 'all';
  selectedProject = 'all';
  selectedRange = '24h';

  // Computed filter object for widget components
  get dashboardFilters() {
    return {
      ownerId: this.selectedOwner !== 'all' ? this.selectedOwner : undefined,
      projectId: this.selectedProject !== 'all' ? this.selectedProject : undefined,
      timeRange: this.selectedRange as '24h' | '7d' | '30d'
    };
  }

  setFilter(type: 'owner' | 'project' | 'range', value: string) {
    if (type === 'owner') {
      this.selectedOwner = value;
    } else if (type === 'project') {
      this.selectedProject = value;
    } else {
      this.selectedRange = value;
    }
  }

  getOwnerLabel() {
    if (this.selectedOwner === 'all') {
      return 'all owners';
    }
    return this.ownerFilterOptions.find((option) => option.value === this.selectedOwner)?.label ?? this.selectedOwner;
  }

  getProjectLabel() {
    if (this.selectedProject === 'all') {
      return 'all projects';
    }
    return this.projectFilterOptions.find((option) => option.value === this.selectedProject)?.label ?? this.selectedProject;
  }

  getRangeLabel() {
    return this.timeRangeOptions.find((option) => option.value === this.selectedRange)?.label ?? this.selectedRange;
  }

  resetFilters() {
    this.selectedOwner = 'all';
    this.selectedProject = 'all';
    this.selectedRange = '24h';
  }
}
