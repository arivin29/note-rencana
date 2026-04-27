import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NodesService } from '../../../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../../../sdk/core/services/sensors.service';

export interface SensorListItem {
  idSensor: string;
  label: string;
  sensorCode?: string;
  lastValue: number | null;
  lastValueAt: string | null;
  status?: string;
  channels: {
    idSensorChannel: string;
    metricCode: string;
    unit: string;
    lastValue: number | null;
    lastValueAt: string | null;
  }[];
  node?: {
    idNode: string;
    code: string;
    name: string;
    address?: string;
    city?: string;
    lastSeenAt?: string;
    picName?: string;
    picPhone?: string;
    picEmail?: string;
  };
  sensorCatalog?: {
    vendor: string;
    modelName: string;
  };
}

@Component({
  selector: 'app-sensors-page',
  templateUrl: './sensors-page.component.html',
  styleUrls: ['./sensors-page.component.scss'],
  standalone: false
})
export class SensorsPageComponent implements OnInit {
  projectId = '';
  loading = false;
  error: string | null = null;

  nodes: any[] = [];
  sensors: SensorListItem[] = [];
  filteredSensors: SensorListItem[] = [];

  // Filter & search
  searchText = '';
  statusFilter: 'all' | 'fresh' | 'stale' | 'offline' | 'nodata' = 'all';
  sortField: 'label' | 'node' | 'value' | 'lastUpdate' = 'label';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Stats
  totalSensors = 0;
  freshCount = 0;
  staleCount = 0;
  offlineCount = 0;
  noDataCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodesService: NodesService,
    private sensorsService: SensorsService
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
      if (this.projectId) {
        this.loadData();
      }
    });
  }

  loadData() {
    this.loading = true;
    this.error = null;

    this.nodesService.nodesControllerFindAll$Response({ idProject: this.projectId, limit: 100 })
      .subscribe({
        next: (res) => {
          let response: any = res.body;
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) { /* ignore */ }
          }
          this.nodes = response?.data || response || [];
          if (!Array.isArray(this.nodes)) this.nodes = [];

          this.loadSensors();
        },
        error: (err) => {
          console.error('Error loading nodes:', err);
          this.error = 'Failed to load nodes';
          this.loading = false;
        }
      });
  }

  loadSensors() {
    if (this.nodes.length === 0) {
      this.sensors = [];
      this.applyFilters();
      this.loading = false;
      return;
    }

    const sensorRequests = this.nodes.map(node =>
      this.sensorsService.sensorsControllerFindAll$Response({ idNode: node.idNode || node.id })
    );

    forkJoin(sensorRequests).subscribe({
      next: (responses) => {
        this.sensors = responses.flatMap((res: any, index: number) => {
          let data = res.body;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { /* ignore */ }
          }
          const items = data?.data || data || [];
          const sensorList = Array.isArray(items) ? items : [];

          const node = this.nodes[index];
          return sensorList.map((s: any) => ({
            ...s,
            node: s.node || {
              idNode: node.idNode || node.id,
              code: node.code || node.nodeCode || node.serialNumber,
              name: node.name,
              address: node.address,
              city: node.city,
              lastSeenAt: node.lastSeenAt,
              picName: node.picName,
              picPhone: node.picPhone,
              picEmail: node.picEmail
            }
          }));
        });

        this.computeStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sensors:', err);
        this.error = 'Failed to load sensors';
        this.loading = false;
      }
    });
  }

  computeStats() {
    this.totalSensors = this.sensors.length;
    this.freshCount = 0;
    this.staleCount = 0;
    this.offlineCount = 0;
    this.noDataCount = 0;

    this.sensors.forEach(s => {
      const status = this.getSensorStatus(s);
      if (status === 'fresh') this.freshCount++;
      else if (status === 'stale') this.staleCount++;
      else if (status === 'offline') this.offlineCount++;
      else this.noDataCount++;
    });
  }

  getSensorStatus(sensor: SensorListItem): 'fresh' | 'stale' | 'offline' | 'nodata' {
    if (!sensor.lastValueAt) return 'nodata';
    const diff = new Date().getTime() - new Date(sensor.lastValueAt).getTime();
    const minutes = diff / (1000 * 60);
    if (minutes < 10) return 'fresh';
    if (minutes < 60) return 'stale';
    return 'offline';
  }

  applyFilters() {
    let result = [...this.sensors];

    if (this.statusFilter !== 'all') {
      result = result.filter(s => this.getSensorStatus(s) === this.statusFilter);
    }

    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      result = result.filter(s =>
        (s.label || '').toLowerCase().includes(q) ||
        (s.sensorCode || '').toLowerCase().includes(q) ||
        (s.node?.code || '').toLowerCase().includes(q) ||
        (s.node?.address || '').toLowerCase().includes(q) ||
        (s.node?.name || '').toLowerCase().includes(q) ||
        (s.node?.picName || '').toLowerCase().includes(q) ||
        (s.node?.picPhone || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (this.sortField) {
        case 'label':
          cmp = (a.label || '').localeCompare(b.label || '');
          break;
        case 'node':
          cmp = (a.node?.address || a.node?.code || '').localeCompare(b.node?.address || b.node?.code || '');
          break;
        case 'value':
          cmp = (a.lastValue || 0) - (b.lastValue || 0);
          break;
        case 'lastUpdate':
          const aTime = a.lastValueAt ? new Date(a.lastValueAt).getTime() : 0;
          const bTime = b.lastValueAt ? new Date(b.lastValueAt).getTime() : 0;
          cmp = aTime - bTime;
          break;
      }
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });

    this.filteredSensors = result;
  }

  onSearchChange() {
    this.applyFilters();
  }

  onStatusFilter(status: 'all' | 'fresh' | 'stale' | 'offline' | 'nodata') {
    this.statusFilter = status;
    this.applyFilters();
  }

  onSort(field: 'label' | 'node' | 'value' | 'lastUpdate') {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  navigateToSensor(sensor: SensorListItem) {
    if (sensor.node?.idNode) {
      this.router.navigate(['node', sensor.node.idNode, 'sensor', sensor.idSensor], { relativeTo: this.route.parent });
    }
  }

  navigateToNode(nodeId: string, event: MouseEvent) {
    event.stopPropagation();
    this.router.navigate(['node', nodeId], { relativeTo: this.route.parent });
  }

  formatValue(value: number | null, unit?: string): string {
    if (value === null || value === undefined) return '-';
    const numVal = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numVal)) return '-';
    return unit ? `${numVal.toFixed(2)} ${unit}` : numVal.toFixed(2);
  }

  formatTimeAgo(timestamp: string | null): string {
    if (!timestamp) return 'Never';
    const diff = new Date().getTime() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  getStatusBadgeClass(sensor: SensorListItem): string {
    switch (this.getSensorStatus(sensor)) {
      case 'fresh': return 'bg-success-subtle text-success';
      case 'stale': return 'bg-warning-subtle text-warning';
      case 'offline': return 'bg-danger-subtle text-danger';
      default: return 'bg-secondary-subtle text-secondary';
    }
  }

  getStatusLabel(sensor: SensorListItem): string {
    switch (this.getSensorStatus(sensor)) {
      case 'fresh': return 'Fresh';
      case 'stale': return 'Stale';
      case 'offline': return 'Offline';
      default: return 'No Data';
    }
  }

  getChannelUnit(sensor: SensorListItem): string {
    return sensor.channels?.[0]?.unit || '';
  }
}
