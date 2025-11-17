import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SensorLogsService } from '../../../../../sdk/core/services/sensor-logs.service';

type TelemetryQuality = 'good' | 'warning' | 'critical';
type TelemetryTrend = 'up' | 'down' | 'flat';

interface TelemetryRow {
  idSensorChannel: string;
  channelLabel: string;
  idSensor: string;
  sensorCode?: string;
  sensorLabel?: string;
  sensorType: string;
  idNode: string;
  nodeName: string;
  nodeSerialNumber?: string;
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
export class TelemetryListPage implements OnInit {
  aggregations = ['5m', '15m', '1h', '1d', '1M'];
  selectedAggregation = '1h';
  searchTerm = '';

  filters = {
    owner: 'All Owners',
    project: 'All Projects'
  };
  
  // Query params filter
  projectIdFilter: string | null = null;
  rangeFilter: string | null = null;
  
  // Loading states
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalRecords = 0;
  exporting = false;

  aggregationLabels: Record<string, string> = {
    '5m': '5 Menit',
    '15m': '15 Menit',
    '1h': '1 Jam',
    '1d': '1 Hari',
    '1M': '1 Bulan'
  };

  telemetry: TelemetryRow[] = [];

  ownerOptions = ['All Owners'];
  projectOptions = ['All Projects'];
  
  constructor(
    private sensorLogsService: SensorLogsService,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit() {
    // Read query params for filters
    this.route.queryParams.subscribe(params => {
      this.projectIdFilter = params['projectId'] || null;
      this.rangeFilter = params['range'] || '24h';
      
      if (this.projectIdFilter) {
        console.log('Filtering telemetry by projectId:', this.projectIdFilter);
      }
      
      this.loadTelemetryData();
    });
  }
  
  onAggregationChange(aggregation: string) {
    this.selectedAggregation = aggregation;
    
    // Reset to first page when changing aggregation
    this.currentPage = 1;
    
    // Reload data with new time range based on aggregation
    this.loadTelemetryData();
  }
  
  loadTelemetryData() {
    this.loading = true;
    this.error = null;

    const params = this.buildQueryParams(this.pageSize, this.currentPage);

    this.sensorLogsService.sensorLogsControllerFindAll$Response(params).subscribe({
      next: (httpResponse) => {
        let response: any = httpResponse.body;
        
        if (typeof response === 'string') {
          response = JSON.parse(response);
        }
        
        this.totalRecords = response.total || 0;
        
        // Transform backend data to component format
        this.telemetry = (response.data || []).map((log: any) => this.mapLogToRow(log));

        // Update filter options
        this.updateFilterOptions();
        
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load telemetry data';
        this.loading = false;
        console.error('Error loading telemetry:', err);
      }
    });
  }
  
  private determineQuality(log: any): TelemetryQuality {
    // Simple logic: check if value is within thresholds
    const value = log.valueEngineered || 0;
    const min = log.minThreshold;
    const max = log.maxThreshold;
    
    if (min !== undefined && max !== undefined) {
      if (value < min || value > max) {
        return 'critical';
      }
      const range = max - min;
      if (value < min + range * 0.1 || value > max - range * 0.1) {
        return 'warning';
      }
    }
    
    return 'good';
  }
  
  private updateFilterOptions() {
    this.ownerOptions = ['All Owners', ...new Set(this.telemetry.map((row) => row.owner))];
    this.projectOptions = ['All Projects', ...new Set(this.telemetry.map((row) => row.project))];
  }

  exportCsv(mode: 'raw' | '5m' | '1h') {
    if (this.exporting) {
      return;
    }
    this.exporting = true;
    const params = this.buildQueryParams(Math.max(this.pageSize, 2000), 1);
    this.sensorLogsService.sensorLogsControllerFindAll$Response(params).subscribe({
      next: (httpResponse) => {
        let response: any = httpResponse.body;
        if (typeof response === 'string') {
          response = JSON.parse(response);
        }
        const rows = (response.data || []).map((log: any) => this.mapLogToRow(log));
        let exportRows: any[] = rows;
        let suffix = 'raw';

        if (mode === '5m' || mode === '1h') {
          const interval = mode === '5m' ? 5 : 60;
          suffix = mode === '5m' ? '5min' : '1hour';
          exportRows = this.aggregateTelemetry(rows, interval);
        }

        const csv = this.convertToCsv(exportRows);
        const filename = `telemetry-${suffix}-${new Date().toISOString()}.csv`;
        this.triggerCsvDownload(csv, filename);
        this.exporting = false;
      },
      error: (err) => {
        console.error('Failed to export telemetry', err);
        this.error = err.message || 'Failed to export telemetry';
        this.exporting = false;
      }
    });
  }

  private buildQueryParams(limit: number, page: number) {
    const { startDate, endDate } = this.getAggregationRange();
    const params: any = {
      page,
      limit,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
    if (this.projectIdFilter) {
      params.idProject = this.projectIdFilter;
    }
    return params;
  }

  private getAggregationRange() {
    const endDate = new Date();
    let startDate: Date;
    switch (this.selectedAggregation) {
      case '5m':
        startDate = new Date(endDate.getTime() - 5 * 60 * 1000);
        break;
      case '15m':
        startDate = new Date(endDate.getTime() - 15 * 60 * 1000);
        break;
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        break;
      case '1d':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1M':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
    }
    return { startDate, endDate };
  }

  private mapLogToRow(log: any): TelemetryRow {
    return {
      idSensorChannel: log.idSensorChannel || 'N/A',
      channelLabel: log.channelLabel || 'Unknown Channel',
      idSensor: log.idSensor || 'N/A',
      sensorCode: log.sensorCode || '',
      sensorLabel: log.sensorLabel || '',
      sensorType: log.sensorType || 'Unknown',
      idNode: log.idNode || 'N/A',
      nodeName: log.nodeName || 'Unknown Node',
      nodeSerialNumber: log.nodeSerialNumber || '',
      project: log.projectName || 'Unknown Project',
      projectCode: log.idProject || 'N/A',
      owner: log.ownerName || 'Unknown Owner',
      ownerCode: log.idOwner || 'N/A',
      unit: log.unit || '',
      aggregation: this.selectedAggregation,
      windowStart: log.ts || new Date().toISOString(),
      windowEnd: log.ts || new Date().toISOString(),
      min: log.min ?? log.valueEngineered ?? 0,
      avg: log.avg ?? log.valueEngineered ?? 0,
      max: log.max ?? log.valueEngineered ?? 0,
      latest: log.valueEngineered ?? 0,
      points: log.points || 1,
      quality: this.determineQuality(log),
      trend: 'flat'
    };
  }

  private aggregateTelemetry(rows: TelemetryRow[], intervalMinutes: number) {
    const buckets = new Map<string, any>();
    rows.forEach((row) => {
      const baseTime = row.windowStart || row.windowEnd;
      const bucketStart = this.floorToInterval(baseTime, intervalMinutes);
      const key = `${row.idSensorChannel}_${bucketStart.toISOString()}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          channelLabel: row.channelLabel,
          sensorLabel: row.sensorLabel,
          sensorType: row.sensorType,
          nodeName: row.nodeName,
          project: row.project,
          owner: row.owner,
          unit: row.unit,
          windowStart: bucketStart,
          sum: 0,
          min: Number.POSITIVE_INFINITY,
          max: Number.NEGATIVE_INFINITY,
          points: 0
        });
      }

      const bucket = buckets.get(key);
      bucket.sum += row.latest;
      bucket.points += 1;
      bucket.min = Math.min(bucket.min, row.latest);
      bucket.max = Math.max(bucket.max, row.latest);
    });

    return Array.from(buckets.values()).map((bucket) => ({
      channelLabel: bucket.channelLabel,
      sensorLabel: bucket.sensorLabel,
      sensorType: bucket.sensorType,
      nodeName: bucket.nodeName,
      project: bucket.project,
      owner: bucket.owner,
      unit: bucket.unit,
      windowStart: bucket.windowStart.toISOString(),
      windowEnd: new Date(bucket.windowStart.getTime() + intervalMinutes * 60000).toISOString(),
      min: bucket.min === Number.POSITIVE_INFINITY ? 0 : bucket.min,
      max: bucket.max === Number.NEGATIVE_INFINITY ? 0 : bucket.max,
      avg: bucket.points ? bucket.sum / bucket.points : 0,
      latest: bucket.points ? bucket.sum / bucket.points : 0,
      points: bucket.points
    }));
  }

  private floorToInterval(dateString: string, intervalMinutes: number) {
    const date = new Date(dateString);
    const intervalMs = intervalMinutes * 60 * 1000;
    return new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
  }

  private convertToCsv(rows: any[]) {
    const headers = [
      { key: 'channelLabel', label: 'Channel' },
      { key: 'sensorLabel', label: 'Sensor' },
      { key: 'sensorType', label: 'Sensor Type' },
      { key: 'nodeName', label: 'Node' },
      { key: 'project', label: 'Project' },
      { key: 'owner', label: 'Owner' },
      { key: 'unit', label: 'Unit' },
      { key: 'windowStart', label: 'Window Start' },
      { key: 'windowEnd', label: 'Window End' },
      { key: 'min', label: 'Min' },
      { key: 'avg', label: 'Avg' },
      { key: 'max', label: 'Max' },
      { key: 'latest', label: 'Latest' },
      { key: 'points', label: 'Points' }
    ];

    const lines = [
      headers.map((h) => `"${h.label}"`).join(',')
    ];

    rows.forEach((row) => {
      const line = headers.map((h) => this.escapeCsvValue(row[h.key])).join(',');
      lines.push(line);
    });

    return lines.join('\n');
  }

  private escapeCsvValue(value: any) {
    const str = value === null || value === undefined ? '' : String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private triggerCsvDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  setFilter(type: 'owner' | 'project', value: string) {
    this.filters[type] = value;
  }

  get filteredTelemetry() {
    const term = this.searchTerm.trim().toLowerCase();

    return this.telemetry.filter((row) => {
      // Note: Aggregation filter removed since backend sensor-logs endpoint
      // doesn't support aggregation window filtering yet
      // In future, implement proper aggregation endpoint or add grouping logic
      const matchOwner = this.filters.owner === 'All Owners' || row.owner === this.filters.owner;
      const matchProject = this.filters.project === 'All Projects' || row.project === this.filters.project;
      const matchSearch =
        !term ||
        row.channelLabel.toLowerCase().includes(term) ||
        row.nodeName.toLowerCase().includes(term) ||
        row.project.toLowerCase().includes(term) ||
        row.owner.toLowerCase().includes(term) ||
        (row.sensorType && row.sensorType.toLowerCase().includes(term));
      return matchOwner && matchProject && matchSearch;
    });
  }

  get totalChannels() {
    // Return total from backend (global count), not just current page
    return this.totalRecords;
  }

  get totalPoints() {
    // Return total from backend (global count)
    // Since each log is 1 point, total points = total records
    return this.totalRecords;
  }

  get uniqueNodesCount() {
    // For current page only (accurate node count needs aggregation from backend)
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
    // Quality summary for current page only
    // Note: For global quality stats, backend would need to return aggregated quality counts
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
  
  // Pagination methods
  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }
  
  get paginationStart(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }
  
  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTelemetryData();
    }
  }
  
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTelemetryData();
    }
  }
  
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTelemetryData();
    }
  }
  
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5; // Show max 5 page numbers
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
