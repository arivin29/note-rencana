import { Component, OnInit } from '@angular/core';
import { AddChannelFormValue, SensorTypeOption } from '../node-detail-add-channel-drawer/node-detail-add-channel-drawer.component';

interface SensorReading {
  id: number;
  timestamp: Date;
  value: number;
  unit: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  quality: number;
  notes?: string;
}

@Component({
  selector: 'app-sensor-chanel-detail',
  templateUrl: './sensor-chanel-detail.html',
  styleUrls: ['./sensor-chanel-detail.scss'],
  standalone: false
})
export class SensorChanelDetail implements OnInit {
  // Math utility for template
  Math = Math;

  // Sensor Info
  sensorName: string = 'SNS-10-PRES';
  sensorType: string = 'Pipeline Pressure';
  sensorLocation: string = 'Pipeline A - Section 3';
  sensorUnit: string = 'bar';

  // All readings data
  allReadings: SensorReading[] = [];
  
  // Filtered and paginated data
  filteredReadings: SensorReading[] = [];
  displayedReadings: SensorReading[] = [];

  // Filter properties
  selectedPeriod: string = 'today';
  selectedStatus: string = 'all';
  dateFrom: string = '';
  dateTo: string = '';

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;
  totalRecords: number = 0;

  // Pagination options
  pageSizeOptions: number[] = [10, 25, 50, 100];

  // Period options
  periodOptions = [
    { value: 'today', label: 'Hari Ini' },
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'last7days', label: '7 Hari Terakhir' },
    { value: 'last30days', label: '30 Hari Terakhir' },
    { value: 'thisMonth', label: 'Bulan Ini' },
    { value: 'lastMonth', label: 'Bulan Lalu' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Status options
  statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'online', label: 'Online' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'offline', label: 'Offline' }
  ];

  sensorTypeOptions: SensorTypeOption[] = [
    { id: 'TYPE-PRESSURE', label: 'Pipeline Pressure' },
    { id: 'TYPE-FLOW', label: 'Flow Meter' },
    { id: 'TYPE-LEVEL', label: 'Reservoir Level' },
    { id: 'TYPE-QUALITY', label: 'Water Quality' },
    { id: 'TYPE-ENV', label: 'Environment' },
    { id: 'TYPE-ELECTRICAL', label: 'Electrical' }
  ];

  channelMeta: (AddChannelFormValue & { sensorTypeLabel: string }) = {
    sensorId: 'SNS-10',
    channelId: 'SNS-10-PRES',
    metricCode: 'Pressure',
    unit: 'bar',
    precision: 0.01,
    minThreshold: 1.5,
    maxThreshold: 5.5,
    sensorTypeId: 'TYPE-PRESSURE',
    sensorTypeLabel: 'Pipeline Pressure'
  };

  isChannelDrawerOpen = false;
  channelDrawerMode: 'add' | 'edit' = 'edit';
  channelFormValue: AddChannelFormValue | null = null;

  ngOnInit() {
    this.generateDummyData();
    this.applyFilters();
  }

  /**
   * Generate dummy sensor readings data
   */
  generateDummyData() {
    const statuses: ('online' | 'offline' | 'warning' | 'error')[] = ['online', 'warning', 'error', 'offline'];
    const now = new Date();

    for (let i = 0; i < 150; i++) {
      const timestamp = new Date(now);
      timestamp.setMinutes(timestamp.getMinutes() - (i * 10)); // Every 10 minutes

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const baseValue = 5.2;
      const variation = (Math.random() - 0.5) * 2;
      const value = Math.max(0, baseValue + variation);

      this.allReadings.push({
        id: 150 - i,
        timestamp: timestamp,
        value: parseFloat(value.toFixed(2)),
        unit: this.sensorUnit,
        status: status,
        quality: Math.floor(Math.random() * 30) + 70, // 70-100%
        notes: status === 'error' ? 'Nilai di luar batas normal' : 
               status === 'warning' ? 'Mendekati batas warning' : undefined
      });
    }
  }

  /**
   * Apply filters based on period and status
   */
  applyFilters() {
    let filtered = [...this.allReadings];

    // Filter by period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (this.selectedPeriod) {
      case 'today':
        filtered = filtered.filter(r => r.timestamp >= today);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(r => r.timestamp >= yesterday && r.timestamp < today);
        break;
      case 'last7days':
        const last7days = new Date(today);
        last7days.setDate(last7days.getDate() - 7);
        filtered = filtered.filter(r => r.timestamp >= last7days);
        break;
      case 'last30days':
        const last30days = new Date(today);
        last30days.setDate(last30days.getDate() - 30);
        filtered = filtered.filter(r => r.timestamp >= last30days);
        break;
      case 'thisMonth':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(r => r.timestamp >= thisMonthStart);
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(r => r.timestamp >= lastMonthStart && r.timestamp < lastMonthEnd);
        break;
      case 'custom':
        if (this.dateFrom && this.dateTo) {
          const fromDate = new Date(this.dateFrom);
          const toDate = new Date(this.dateTo);
          toDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(r => r.timestamp >= fromDate && r.timestamp <= toDate);
        }
        break;
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(r => r.status === this.selectedStatus);
    }

    this.filteredReadings = filtered;
    this.totalRecords = filtered.length;
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    this.currentPage = 1; // Reset to first page when filters change
    this.updateDisplayedReadings();
  }

  /**
   * Update displayed readings based on current page
   */
  updateDisplayedReadings() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedReadings = this.filteredReadings.slice(startIndex, endIndex);
  }

  /**
   * Change page
   */
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedReadings();
    }
  }

  /**
   * Change page size
   */
  onPageSizeChange() {
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    this.currentPage = 1;
    this.updateDisplayedReadings();
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'online': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-danger';
      case 'offline': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  /**
   * Get quality badge class
   */
  getQualityClass(quality: number): string {
    if (quality >= 90) return 'bg-success';
    if (quality >= 75) return 'bg-info';
    if (quality >= 60) return 'bg-warning';
    return 'bg-danger';
  }

  /**
   * Helpers for template display
   */
  getSelectedPeriodLabel(): string {
    const period = this.periodOptions.find(p => p.value === this.selectedPeriod);
    return period ? period.label : 'Custom Range';
  }

  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.allReadings.length;
    }
    return this.allReadings.filter(reading => reading.status === status).length;
  }

  /**
   * Export data to CSV
   */
  exportToCSV() {
    const headers = ['ID', 'Timestamp', 'Value', 'Unit', 'Status', 'Quality', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...this.filteredReadings.map(r => [
        r.id,
        r.timestamp.toISOString(),
        r.value,
        r.unit,
        r.status,
        r.quality,
        r.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-${this.sensorName}-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  openEditChannelDrawer() {
    this.channelDrawerMode = 'edit';
    this.channelFormValue = {
      sensorId: this.channelMeta.sensorId,
      channelId: this.channelMeta.channelId,
      metricCode: this.channelMeta.metricCode,
      unit: this.channelMeta.unit,
      precision: this.channelMeta.precision,
      minThreshold: this.channelMeta.minThreshold,
      maxThreshold: this.channelMeta.maxThreshold,
      sensorTypeId: this.channelMeta.sensorTypeId
    };
    this.isChannelDrawerOpen = true;
  }

  handleChannelDrawerClose() {
    this.isChannelDrawerOpen = false;
    this.channelFormValue = null;
  }

  handleChannelSave(formValue: AddChannelFormValue) {
    const sensorTypeLabel = this.getSensorTypeLabel(formValue.sensorTypeId);
    this.channelMeta = {
      ...this.channelMeta,
      ...formValue,
      sensorTypeLabel
    };
    this.sensorName = formValue.channelId;
    this.sensorUnit = formValue.unit;
    this.sensorType = sensorTypeLabel;
    this.isChannelDrawerOpen = false;
    this.channelFormValue = null;
  }

  private getSensorTypeLabel(id: string): string {
    return this.sensorTypeOptions.find((option) => option.id === id)?.label ?? this.channelMeta.sensorTypeLabel;
  }
}
