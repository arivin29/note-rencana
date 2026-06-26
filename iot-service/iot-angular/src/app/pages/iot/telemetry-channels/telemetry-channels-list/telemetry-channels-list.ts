import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SensorChannelsService } from '@sdk/core/services/sensor-channels.service';
import { OwnersService } from '@sdk/core/services/owners.service';
import { AuthService } from '../../../../services/auth.service';

type ChannelStatus = 'ok' | 'out_of_range' | 'stale' | 'offline';

interface OverviewChannel {
  idSensorChannel: string;
  metricCode: string;
  unit: string | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  registerAddress: number | null;
  multiplier: number | null;
  offsetValue: number | null;
  aggregation: string | null;
  status: ChannelStatus;
  node: {
    idNode: string | null; code: string | null; name: string | null;
    connectivityStatus: string | null; lastSeenAt: string | null;
    telemetryIntervalSec: number | null; idNodeModel: string | null;
    modelVendor: string | null; modelName: string | null;
  };
  sensor: { idSensor: string | null; label: string | null; status: string | null };
  sensorType: { idSensorType: string | null; category: string | null; defaultUnit: string | null };
  project: { idProject: string | null; name: string | null; idOwner: string | null };
  latest: { ts: string | null; value: number | null; valueRaw: number | null; qualityFlag: string | null; ageSeconds: number | null } | null;
}

interface Option { id: string; label: string; }

@Component({
  selector: 'telemetry-channels-list',
  templateUrl: './telemetry-channels-list.html',
  styleUrls: ['./telemetry-channels-list.scss'],
  standalone: false
})
export class TelemetryChannelsListPage implements OnInit, OnDestroy {
  // reuse in node detail / project workspace
  @Input() embedded = false;
  @Input() nodeId: string | null = null;

  channels: OverviewChannel[] = [];
  loading = false;
  error: string | null = null;
  isAdmin = false;

  // Owner filter is server-side (scopes the fetch). The rest are client-side and
  // their dropdown options are derived from the loaded data, so empty options never show.
  filters = { ownerId: '', projectId: '', nodeModelId: '', sensorTypeId: '', status: 'All Status' as 'All Status' | ChannelStatus };
  searchTerm = '';
  private searchDebounce?: ReturnType<typeof setTimeout>;

  statusOptions: Array<'All Status' | ChannelStatus> = ['All Status', 'ok', 'out_of_range', 'stale', 'offline'];

  // owner dropdown (admin only) — the full catalog, since you scope BEFORE loading data
  ownerOptions: Option[] = [];

  // sorting + pagination (client-side)
  pageSize = 20;
  currentPage = 1;
  pageSizeOptions = [10, 20, 50, 100];
  sortField = 'status';            // default: worst-first (offline → out_of_range → stale → ok)
  sortDirection: 'asc' | 'desc' = 'asc';
  expandedId: string | null = null;

  constructor(
    private channelsService: SensorChannelsService,
    private ownersService: OwnersService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.getCurrentUserRole?.() === 'admin';
    if (!this.embedded && this.isAdmin) {
      this.loadOwners();
    }
    this.loadChannels();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  // ---------- data ----------
  loadChannels(): void {
    this.loading = true;
    this.error = null;
    const params: any = { limit: 2000 };
    if (this.nodeId) params.idNode = this.nodeId;
    if (this.filters.ownerId) params.ownerId = this.filters.ownerId;

    this.channelsService.sensorChannelsControllerOverview$Response(params).subscribe({
      next: (res) => {
        const body = this.parseBody(res.body);
        this.channels = (body?.data || []) as OverviewChannel[];
        // drop client filters that no longer have data after a reload
        this.pruneStaleFilters();
        this.currentPage = 1;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load telemetry channels';
        this.loading = false;
      }
    });
  }

  private loadOwners(): void {
    this.ownersService.ownersControllerFindAll$Response({ page: 1, limit: 500 } as any).subscribe({
      next: (res) => {
        this.ownerOptions = this.extractData(res.body).map((o: any) => ({
          id: o.idOwner, label: `${o.ownerCode ? o.ownerCode + ' - ' : ''}${o.name}`
        }));
      }, error: () => {}
    });
  }

  // ---------- derived dropdown options (only values present in data) ----------
  get projectOptions(): Option[] {
    const map = new Map<string, string>();
    for (const c of this.channels) {
      if (c.project?.idProject) map.set(c.project.idProject, c.project.name || c.project.idProject);
    }
    return this.sortOptions(map);
  }
  get nodeModelOptions(): Option[] {
    const map = new Map<string, string>();
    for (const c of this.channels) {
      if (c.node?.idNodeModel) {
        const label = `${c.node.modelVendor || ''} ${c.node.modelName || ''}`.trim() || c.node.idNodeModel;
        map.set(c.node.idNodeModel, label);
      }
    }
    return this.sortOptions(map);
  }
  get sensorTypeOptions(): Option[] {
    const map = new Map<string, string>();
    for (const c of this.channels) {
      if (c.sensorType?.idSensorType) map.set(c.sensorType.idSensorType, c.sensorType.category || c.sensorType.idSensorType);
    }
    return this.sortOptions(map);
  }
  private sortOptions(map: Map<string, string>): Option[] {
    return [...map.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }

  // drop a selected filter value if the new dataset no longer contains it
  private pruneStaleFilters(): void {
    if (this.filters.projectId && !this.projectOptions.some(o => o.id === this.filters.projectId)) this.filters.projectId = '';
    if (this.filters.nodeModelId && !this.nodeModelOptions.some(o => o.id === this.filters.nodeModelId)) this.filters.nodeModelId = '';
    if (this.filters.sensorTypeId && !this.sensorTypeOptions.some(o => o.id === this.filters.sensorTypeId)) this.filters.sensorTypeId = '';
  }

  // ---------- filter handlers ----------
  onOwnerChange(ownerId: string): void {
    this.filters.ownerId = ownerId;
    this.loadChannels(); // owner scope = server reload
  }
  onClientFilterChange(): void { this.currentPage = 1; }
  setStatusFilter(status: 'All Status' | ChannelStatus): void {
    this.filters.status = status;
    this.currentPage = 1;
  }
  onSearchChange(value: string): void {
    this.searchTerm = value;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.currentPage = 1; }, 250);
  }

  // ---------- derived list ----------
  // everything except the status tab — used for the table AND the tab counts
  private get baseFilteredChannels(): OverviewChannel[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.channels.filter((c) => {
      if (this.filters.projectId && c.project?.idProject !== this.filters.projectId) return false;
      if (this.filters.nodeModelId && c.node?.idNodeModel !== this.filters.nodeModelId) return false;
      if (this.filters.sensorTypeId && c.sensorType?.idSensorType !== this.filters.sensorTypeId) return false;
      if (term) {
        const hay = `${c.metricCode || ''} ${c.sensor?.label || ''} ${c.node?.code || ''} ${c.node?.name || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }

  statusCount(option: 'All Status' | ChannelStatus): number {
    const base = this.baseFilteredChannels;
    return option === 'All Status' ? base.length : base.filter((c) => c.status === option).length;
  }

  get filteredChannels(): OverviewChannel[] {
    let list = this.baseFilteredChannels;
    if (this.filters.status !== 'All Status') {
      list = list.filter((c) => c.status === this.filters.status);
    }
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => this.sortValue(a) > this.sortValue(b) ? dir : this.sortValue(a) < this.sortValue(b) ? -dir : 0);
  }

  // worst-first severity so ascending sort surfaces problems on top
  private static readonly STATUS_RANK: Record<ChannelStatus, number> = {
    offline: 0, out_of_range: 1, stale: 2, ok: 3
  };

  private sortValue(c: OverviewChannel): string | number {
    switch (this.sortField) {
      case 'metric': return (c.metricCode || '').toLowerCase();
      case 'sensor': return (c.sensor?.label || '').toLowerCase();
      case 'type': return (c.sensorType?.category || '').toLowerCase();
      case 'value': return c.latest?.value ?? -Infinity;
      case 'status': return TelemetryChannelsListPage.STATUS_RANK[c.status] ?? 99;
      case 'project': return (c.project?.name || '').toLowerCase();
      case 'lastSeen': return c.latest?.ts || '';
      case 'node':
      default: return (c.node?.code || '').toLowerCase();
    }
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  /** icon class for a sortable header */
  sortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort opacity-25';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  get totalEntries(): number { return this.filteredChannels.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalEntries / this.pageSize)); }
  get paginatedChannels(): OverviewChannel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredChannels.slice(start, start + this.pageSize);
  }
  get paginationStart(): number { return this.totalEntries === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get paginationEnd(): number { return Math.min(this.currentPage * this.pageSize, this.totalEntries); }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const max = this.totalPages;
    const from = Math.max(1, this.currentPage - 2);
    const to = Math.min(max, from + 4);
    for (let i = from; i <= to; i++) pages.push(i);
    return pages;
  }
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }
  changePageSize(size: number): void { this.pageSize = size; this.currentPage = 1; }

  toggleExpand(id: string): void { this.expandedId = this.expandedId === id ? null : id; }

  // ---------- presentation helpers ----------
  statusBadge(status: ChannelStatus): string {
    switch (status) {
      case 'ok': return 'badge bg-success-subtle text-success';
      case 'out_of_range': return 'badge bg-danger-subtle text-danger';
      case 'stale': return 'badge bg-warning-subtle text-warning';
      case 'offline':
      default: return 'badge bg-secondary-subtle text-secondary';
    }
  }
  statusLabel(status: ChannelStatus): string {
    switch (status) {
      case 'ok': return 'OK';
      case 'out_of_range': return 'Out of range';
      case 'stale': return 'Stale';
      case 'offline': return 'Offline';
      default: return status;
    }
  }
  connectivityBadge(status: string | null): string {
    switch ((status || '').toLowerCase()) {
      case 'online': return 'text-success';
      case 'degraded': return 'text-warning';
      default: return 'text-secondary';
    }
  }

  formatValue(c: OverviewChannel): string {
    if (!c.latest || c.latest.value == null) return '—';
    const v = c.latest.value;
    const rounded = Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(3).replace(/\.?0+$/, '');
    return `${rounded}${c.unit ? ' ' + c.unit : ''}`;
  }
  ageLabel(c: OverviewChannel): string {
    const s = c.latest?.ageSeconds;
    if (s == null) return 'no data';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  thresholdLabel(c: OverviewChannel): string {
    const min = c.minThreshold != null ? c.minThreshold : '−∞';
    const max = c.maxThreshold != null ? c.maxThreshold : '+∞';
    if (c.minThreshold == null && c.maxThreshold == null) return 'none';
    return `${min} … ${max}`;
  }

  // ---------- response parsing ----------
  private parseBody(body: unknown): any {
    if (typeof body === 'string') { try { return JSON.parse(body); } catch { return null; } }
    return body;
  }
  private extractData(body: unknown): any[] {
    const p = this.parseBody(body);
    if (!p) return [];
    if (Array.isArray(p)) return p;
    if (Array.isArray(p.data)) return p.data;
    if (Array.isArray(p.data?.items)) return p.data.items;
    if (Array.isArray(p.items)) return p.items;
    return [];
  }
}
