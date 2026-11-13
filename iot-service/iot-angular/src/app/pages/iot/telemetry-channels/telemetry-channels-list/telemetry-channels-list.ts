import { Component, HostListener, Inject, Input, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { formatNumber } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

import { SensorsService } from '@sdk/core/services/sensors.service';
import { OwnersService } from '@sdk/core/services/owners.service';
import { AuthService } from '../../../../services/auth.service';
import { fetchAll, parseBody } from '../../../../shared/utils/fetch-all';
import {
  FRESHNESS_BADGE, FRESHNESS_LABEL, Freshness, freshnessThresholds, getFreshness
} from '../../../../shared/utils/telemetry-freshness';
import { decimalsFromPrecision, excelNumFmt, thresholdState, ThresholdState } from '../../../../shared/utils/threshold';
import {
  ChannelTrend, deadSinceText, excelThresholdLabel, fileStamp, formatDuration, formatInterval,
  hasSparkPoints, localTzLabel, nodeSeenText, sparkPath, telHref, timeAgoId, toExcelLocal
} from '../../../../shared/utils/channel-display';

/** One row = one CHANNEL (flattened from /api/sensors → sensor.channels[]). */
interface ChannelRow {
  idSensorChannel: string;
  metricCode: string;
  unit: string;
  lastValue: number | null;
  lastValueAt: string | null;
  /** null = not configured (never treat as 0 / "normal") */
  minThreshold: number | null;
  maxThreshold: number | null;
  precision: number | null;
  groupName: string;
  category: string;

  idSensor: string;
  sensorLabel: string;
  sensorCode: string;

  idNode: string;
  nodeCode: string;
  nodeAddress: string;
  nodeLastSeenAt: string | null;
  intervalSec: number | null;
  picName: string;
  picPhone: string;

  idProject: string;
  projectName: string;
  idOwner: string;

  // --- derived once per load (single nowMs) ---
  freshness: Freshness;
  tstate: ThresholdState;
  /** crossing on a FRESH value — the only kind that counts as "di luar ambang" */
  isOut: boolean;
  /** stale / offline / nodata / out-of-range */
  isProblem: boolean;
  isDead: boolean;
  hasThreshold: boolean;
  lastMs: number | null;
  valueText: string;
  thresholdText: string;
  outText: string;
  statusTitle: string;
  intervalText: string;
  deadText: string;
  seenText: string;
  search: string;

  // --- derived from trends (rebuilt every trends load) ---
  spark: string;
  rangeText: string;
}

type StatusFilter = 'all' | Freshness | 'outofrange' | 'dead' | 'problem';
type SortField = 'status' | 'metric' | 'node' | 'value' | 'lastAt';
interface Option { id: string; label: string; }

/** Worst first: offline, nodata, out-of-range, stale, fresh. */
const PROBLEM_RANK: Record<string, number> = { offline: 0, nodata: 1, outofrange: 2, stale: 3, fresh: 4 };

@Component({
  selector: 'telemetry-channels-list',
  templateUrl: './telemetry-channels-list.html',
  styleUrls: ['./telemetry-channels-list.scss'],
  standalone: false
})
export class TelemetryChannelsListPage implements OnInit, OnDestroy {
  /** Kept for embedded use (no consumer today): hides the page header/KPIs. */
  @Input() embedded = false;
  /** Kept for embedded use: scopes the list to one node. */
  @Input() nodeId: string | null = null;

  isAdmin = false;
  loading = false;
  error: string | null = null;
  /** false when the backend could not read latest values (ClickHouse off/unreachable). */
  latestAvailable = true;
  lastRefreshedAt: Date | null = null;
  /** Single clock per load: badges, KPIs and "x lalu" all use the same 'now'. */
  nowMs = Date.now();

  rows: ChannelRow[] = [];
  /** rows after owner/project/kelompok/jenis/search (tab counts + KPIs come from here) */
  private scoped: ChannelRow[] = [];
  /** scoped + status tab, sorted — the table and the Excel export */
  filtered: ChannelRow[] = [];
  pageRows: ChannelRow[] = [];

  // --- filters ---
  ownerId = '';
  projectId = '';
  groupName = '';
  category = '';
  searchText = '';
  statusFilter: StatusFilter = 'all';
  showAdvanced = false;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  ownerOptions: Option[] = [];
  ownersError: string | null = null;
  private ownerLabelById = new Map<string, string>();
  projectOptions: Option[] = [];
  groupOptions: string[] = [];
  categoryOptions: string[] = [];
  totalProjects = 0;

  readonly statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'fresh', label: FRESHNESS_LABEL.fresh },
    { key: 'stale', label: FRESHNESS_LABEL.stale },
    { key: 'offline', label: FRESHNESS_LABEL.offline },
    { key: 'nodata', label: FRESHNESS_LABEL.nodata },
    { key: 'outofrange', label: 'Di luar ambang' }
  ];
  counts: Record<StatusFilter, number> = { all: 0, fresh: 0, stale: 0, offline: 0, nodata: 0, outofrange: 0, dead: 0, problem: 0 };

  // --- KPIs (from `scoped`) ---
  thresholdConfiguredCount = 0;
  longestDead: ChannelRow | null = null;
  affectedProjects = 0;
  worstProject: { name: string; count: number } | null = null;

  // --- sort & pagination ---
  sortField: SortField = 'status';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 20;
  currentPage = 1;
  readonly pageSizeOptions = [10, 20, 50, 100];
  totalPages = 1;
  pageNumbers: number[] = [];
  paginationStart = 0;
  paginationEnd = 0;

  // --- export ---
  exporting = false;
  exportError: string | null = null;

  // --- refresh & trends ---
  readonly refreshIntervalMs = 60_000;
  readonly trendsIntervalMs = 5 * 60_000;
  readonly trendsHours = 24;
  private trendsByChannel = new Map<string, ChannelTrend>();
  trendsError: string | null = null;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private trendsTimer?: ReturnType<typeof setInterval>;
  private loadSub?: Subscription;
  private trendsSub?: Subscription;
  private ownersSub?: Subscription;
  /** scope the current trends were loaded for, to reload only when it changes */
  private trendsScope = '';

  constructor(
    private sensorsService: SensorsService,
    private ownersService: OwnersService,
    private authService: AuthService,
    private router: Router,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.getCurrentUserRole() === 'admin';
    if (this.isAdmin && !this.embedded) this.loadOwners();
    this.loadData();
    this.loadTrends(true);
    this.refreshTimer = setInterval(() => {
      if (!this.loading && document.visibilityState === 'visible') this.loadData(true);
    }, this.refreshIntervalMs);
    this.trendsTimer = setInterval(() => {
      if (document.visibilityState === 'visible') this.loadTrends(true);
    }, this.trendsIntervalMs);
  }

  /** P2: after returning to the tab, don't show statuses from a load older than the refresh interval. */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState !== 'visible' || this.loading || this.error) return;
    const age = this.lastRefreshedAt ? Date.now() - this.lastRefreshedAt.getTime() : Infinity;
    if (age >= this.refreshIntervalMs) this.loadData(true);
  }

  private stopPolling(): void {
    clearInterval(this.refreshTimer);
    clearInterval(this.trendsTimer);
    this.trendsError = null;
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
    clearInterval(this.trendsTimer);
    clearTimeout(this.searchDebounce);
    this.loadSub?.unsubscribe();
    this.trendsSub?.unsubscribe();
    this.ownersSub?.unsubscribe();
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  /** Refresh button: list + trends. */
  reload(): void {
    this.loadData();
    this.loadTrends(true);
  }

  /** @param silent background refresh: no spinner, keep current rows/page on screen */
  loadData(silent = false): void {
    if (!silent) this.loading = true;
    this.loadSub?.unsubscribe();
    // Scope is enforced by the backend (tenant → own owner, ownerId ignored). Admin: the Owner
    // filter is applied SERVER-side so KPIs/counts and the trends call stay owner-scoped.
    this.loadSub = fetchAll(
      p => this.sensorsService.sensorsControllerFindAll$Response({
        activeOnly: true,
        ...(this.ownerId ? { ownerId: this.ownerId } : {}),
        ...(this.nodeId ? { idNode: this.nodeId } : {}),
        ...p
      }),
      body => this.latestAvailable = body?.latestAvailable !== false
    ).subscribe({
      next: (sensors) => {
        this.nowMs = Date.now();
        this.rows = this.flatten(sensors);
        this.applyTrendsToRows();
        this.rebuildOptions();
        this.applyFilters();
        this.error = null;
        this.lastRefreshedAt = new Date();
        this.loading = false;
      },
      error: (err) => {
        console.error('Gagal memuat kanal telemetri:', err);
        this.loading = false;
        if (err?.status === 403) {
          // Access refused (e.g. tenant account without owner): say why and stop polling it.
          const msg = parseBody(err.error)?.message;
          this.error = `${msg || 'Akses ditolak.'} Hubungi admin untuk memperbaiki akun Anda.`;
          this.stopPolling();
          return;
        }
        // A failed background refresh keeps the last good data instead of blanking the page
        if (!silent || !this.rows.length) this.error = 'Gagal memuat kanal telemetri.';
      }
    });
  }

  private loadOwners(): void {
    this.ownersSub?.unsubscribe();
    this.ownersError = null;
    this.ownersSub = fetchAll(p => this.ownersService.ownersControllerFindAll$Response(p)).subscribe({
      next: (owners) => {
        this.ownerOptions = owners
          .map((o: any) => ({ id: o.idOwner, label: `${o.ownerCode ? o.ownerCode + ' - ' : ''}${o.name || ''}` }))
          .sort((a, b) => a.label.localeCompare(b.label));
        this.ownerLabelById = new Map(this.ownerOptions.map(o => [o.id, o.label]));
        this.rebuildOptions();
      },
      error: () => this.ownersError = 'Gagal memuat owner'
    });
  }

  /** One request for every channel in scope; refreshed every 5 min (hourly buckets). */
  loadTrends(force = false): void {
    const scope = `${this.ownerId}|${this.projectId}`;
    if (!force && scope === this.trendsScope) return;
    this.trendsScope = scope;
    this.trendsSub?.unsubscribe();
    this.trendsSub = this.sensorsService.sensorsControllerTrends$Response({
      hours: this.trendsHours,
      ...(this.projectId ? { idProject: this.projectId } : {}),
      ...(this.isAdmin && this.ownerId ? { ownerId: this.ownerId } : {})
    }).subscribe({
      next: (res) => {
        const body = parseBody(res.body);
        const map = new Map<string, ChannelTrend>();
        for (const row of (body?.data || [])) {
          map.set(row.idSensorChannel, { buckets: row.buckets || [], stats: row.stats || {} });
        }
        this.trendsByChannel = map;
        this.trendsError = null;
        this.applyTrendsToRows();
      },
      error: (err) => {
        // Keep the last good trends; say why once instead of drawing empty lines.
        const msg = parseBody(err?.error)?.message;
        if (err?.status === 400 && msg) {
          this.trendsError = `Tren 24 jam tidak dimuat: ${msg}`;
        } else {
          this.trendsError = err?.status === 503 ? 'Tren 24 jam tidak tersedia (server data).' : 'Tren 24 jam gagal dimuat.';
        }
      }
    });
  }

  private flatten(sensors: any[]): ChannelRow[] {
    const out: ChannelRow[] = [];
    for (const s of sensors) {
      const n = s.node || {};
      const idProject = n.idProject || n.project?.idProject || '';
      for (const ch of (s.channels || [])) {
        const row = {
          idSensorChannel: ch.idSensorChannel,
          metricCode: ch.metricCode || '',
          unit: ch.unit || '',
          lastValue: ch.lastValue === null || ch.lastValue === undefined ? null : Number(ch.lastValue),
          lastValueAt: ch.lastValueAt || null,
          minThreshold: ch.minThreshold ?? null,
          maxThreshold: ch.maxThreshold ?? null,
          precision: ch.precision ?? null,
          groupName: ch.sensorType?.groupName || '',
          category: ch.sensorType?.category || '',
          idSensor: s.idSensor,
          sensorLabel: s.label || '',
          sensorCode: s.sensorCode || '',
          idNode: n.idNode || s.idNode || '',
          nodeCode: n.code || n.serialNumber || '',
          nodeAddress: n.address || '',
          nodeLastSeenAt: n.lastSeenAt || null,
          intervalSec: n.telemetryIntervalSec ?? null,
          picName: n.picName || '',
          picPhone: n.picPhone || '',
          idProject,
          projectName: n.project?.name || '',
          idOwner: n.idOwner || '',
          spark: '',
          rangeText: ''
        } as ChannelRow;
        this.derive(row);
        out.push(row);
      }
    }
    return out;
  }

  /** Status, threshold verdict and display texts — computed once per load with `nowMs`. */
  private derive(r: ChannelRow): void {
    r.freshness = getFreshness(r.lastValueAt, r.intervalSec, this.nowMs);
    r.isDead = r.freshness === 'offline' || r.freshness === 'nodata';
    // offline/no data → no verdict (an old value is not a current problem)
    r.tstate = r.isDead ? 'novalue' : thresholdState(r.lastValue, r.minThreshold, r.maxThreshold);
    r.isOut = (r.tstate === 'below' || r.tstate === 'above') && r.freshness === 'fresh';
    r.isProblem = r.freshness !== 'fresh' || r.isOut;
    r.hasThreshold = r.minThreshold !== null || r.maxThreshold !== null;
    r.lastMs = r.lastValueAt ? new Date(r.lastValueAt).getTime() : null;
    if (r.lastMs !== null && isNaN(r.lastMs)) r.lastMs = null;

    const dec = decimalsFromPrecision(r.precision);
    r.valueText = r.lastValue === null || isNaN(r.lastValue) ? '-' : `${this.fmt(r.lastValue, dec)}${r.unit ? ' ' + r.unit : ''}`;
    r.thresholdText = this.thresholdText(r);
    r.outText = r.tstate === 'below' ? `di bawah min ${this.fmtLimit(r.minThreshold!)}`
      : r.tstate === 'above' ? `di atas maks ${this.fmtLimit(r.maxThreshold!)}` : '';
    const { freshMin, staleMin } = freshnessThresholds(r.intervalSec);
    r.statusTitle = `${r.intervalSec ? `interval ${r.intervalSec} dtk · ` : ''}Fresh < ${freshMin} mnt · Stale < ${staleMin} mnt · Offline ≥ ${staleMin} mnt`;
    r.intervalText = formatInterval(r.intervalSec);
    r.deadText = deadSinceText(r.lastValueAt, this.nowMs, this.latestAvailable);
    r.seenText = r.lastValueAt ? '' : nodeSeenText(r.nodeLastSeenAt, this.nowMs);
    r.search = [r.nodeAddress, r.nodeCode, r.sensorLabel, r.sensorCode, r.metricCode, r.projectName, r.picName, r.picPhone, r.groupName]
      .join(' ').toLowerCase();
  }

  private applyTrendsToRows(): void {
    for (const r of this.rows) {
      const t = this.trendsByChannel.get(r.idSensorChannel);
      r.spark = t && hasSparkPoints(t.buckets) ? sparkPath(t.buckets) : '';
      const st = t?.stats;
      if (!st || st.min === null || st.max === null || !st.count) {
        r.rangeText = '';
      } else {
        const dec = decimalsFromPrecision(r.precision);
        r.rangeText = `${this.trendsHours} jam: ${this.fmt(st.min, dec)}–${this.fmt(st.max, dec)}`;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Filters (computed ONCE per change, never in getters)
  // ---------------------------------------------------------------------------

  /** Dropdown options derived from loaded rows (no extra calls). Project options follow the owner. */
  private rebuildOptions(): void {
    const projects = new Map<string, { name: string; idOwner: string }>();
    const groups = new Set<string>();
    const categories = new Set<string>();
    const allProjects = new Set<string>();
    for (const r of this.rows) {
      if (r.idProject) allProjects.add(r.idProject);
      if (this.ownerId && r.idOwner !== this.ownerId) continue;
      if (r.idProject) projects.set(r.idProject, { name: r.projectName || r.idProject, idOwner: r.idOwner });
      if (r.groupName) groups.add(r.groupName);
      if (r.category) categories.add(r.category);
    }
    this.totalProjects = allProjects.size;
    const withOwner = this.isAdmin && !this.ownerId;
    this.projectOptions = [...projects.entries()]
      .map(([id, p]) => {
        const owner = withOwner ? this.ownerLabelById.get(p.idOwner) : '';
        return { id, label: owner ? `${p.name} · ${owner}` : p.name };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    this.groupOptions = [...groups].sort((a, b) => a.localeCompare(b));
    this.categoryOptions = [...categories].sort((a, b) => a.localeCompare(b));
    // drop selections that no longer exist in the data
    if (this.projectId && !projects.has(this.projectId)) this.projectId = '';
    if (this.groupName && !groups.has(this.groupName)) this.groupName = '';
    if (this.category && !categories.has(this.category)) this.category = '';
  }

  applyFilters(): void {
    const q = this.searchText.trim().toLowerCase();
    this.scoped = this.rows.filter(r =>
      (!this.ownerId || r.idOwner === this.ownerId) &&
      (!this.projectId || r.idProject === this.projectId) &&
      (!this.groupName || r.groupName === this.groupName) &&
      (!this.category || r.category === this.category) &&
      (!q || r.search.includes(q)));

    this.computeCounts();

    const result = this.statusFilter === 'all' ? [...this.scoped] : this.scoped.filter(r => this.matchesStatus(r));
    result.sort((a, b) => this.compare(a, b));
    this.filtered = result;
    this.updatePage();
  }

  private matchesStatus(r: ChannelRow): boolean {
    switch (this.statusFilter) {
      case 'outofrange': return r.isOut;
      case 'dead': return r.isDead;
      case 'problem': return r.isProblem;
      default: return r.freshness === this.statusFilter;
    }
  }

  private computeCounts(): void {
    const c: Record<StatusFilter, number> = { all: 0, fresh: 0, stale: 0, offline: 0, nodata: 0, outofrange: 0, dead: 0, problem: 0 };
    let withThreshold = 0;
    let longest: ChannelRow | null = null;
    const problemsByProject = new Map<string, { name: string; count: number }>();
    for (const r of this.scoped) {
      c.all++;
      c[r.freshness]++;
      if (r.isOut) c.outofrange++;
      if (r.isDead) c.dead++;
      if (r.hasThreshold) withThreshold++;
      if (r.freshness === 'offline' && r.lastMs !== null && (!longest || r.lastMs < longest.lastMs!)) longest = r;
      if (r.isProblem) {
        c.problem++;
        const key = r.idProject || '-';
        const p = problemsByProject.get(key) || { name: r.projectName || 'Tanpa project', count: 0 };
        p.count++;
        problemsByProject.set(key, p);
      }
    }
    this.counts = c;
    this.thresholdConfiguredCount = withThreshold;
    this.longestDead = longest;
    this.affectedProjects = problemsByProject.size;
    this.worstProject = [...problemsByProject.values()].reduce<{ name: string; count: number } | null>(
      (a, b) => (!a || b.count > a.count ? b : a), null);
  }

  private problemRank(r: ChannelRow): number {
    return PROBLEM_RANK[r.isOut ? 'outofrange' : r.freshness];
  }

  private compare(a: ChannelRow, b: ChannelRow): number {
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const nodeLabel = (r: ChannelRow) => r.nodeAddress || r.nodeCode;
    switch (this.sortField) {
      case 'metric':
        return dir * (a.metricCode.localeCompare(b.metricCode) || a.sensorLabel.localeCompare(b.sensorLabel));
      case 'node':
        return dir * (nodeLabel(a).localeCompare(nodeLabel(b)) || a.metricCode.localeCompare(b.metricCode));
      case 'value':
        // rows without a value sink to the bottom in both directions
        if (a.lastValue === null) return b.lastValue === null ? 0 : 1;
        if (b.lastValue === null) return -1;
        return dir * (a.lastValue - b.lastValue);
      case 'lastAt':
        if (a.lastMs === null) return b.lastMs === null ? 0 : 1;
        if (b.lastMs === null) return -1;
        return dir * (a.lastMs - b.lastMs);
      default: {
        // problems first, then oldest data first (never-reported before old), then node label
        const rank = this.problemRank(a) - this.problemRank(b);
        if (rank) return dir * rank;
        const at = a.lastMs ?? -Infinity, bt = b.lastMs ?? -Infinity;
        if (at !== bt) return dir * (at < bt ? -1 : 1);
        return nodeLabel(a).localeCompare(nodeLabel(b));
      }
    }
  }

  onOwnerChange(id: string): void {
    this.ownerId = id;
    this.projectId = ''; // a project of another owner would match nothing
    this.loadData();     // server-side owner scope
    this.loadTrends();
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
    this.loadTrends(); // narrower scope = a cheaper call; also avoids the channel cap for admins
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.applyFilters();
    }, 400);
  }

  onStatusFilter(status: StatusFilter): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilter(key: 'owner' | 'project' | 'group' | 'category' | 'search' | 'status'): void {
    switch (key) {
      case 'owner': this.ownerId = ''; this.projectId = ''; this.loadData(); this.loadTrends(); break; // owner scope is server-side
      case 'project': this.projectId = ''; break;
      case 'group': this.groupName = ''; break;
      case 'category': this.category = ''; break;
      case 'search': this.searchText = ''; clearTimeout(this.searchDebounce); break;
      case 'status': this.statusFilter = 'all'; break;
    }
    this.onFilterChange();
  }

  resetFilters(): void {
    const ownerWasSet = !!this.ownerId;
    this.ownerId = this.projectId = this.groupName = this.category = this.searchText = '';
    if (ownerWasSet) { this.loadData(); this.loadTrends(); } // owner scope is server-side
    this.statusFilter = 'all';
    clearTimeout(this.searchDebounce);
    this.rebuildOptions();
    this.onFilterChange();
  }

  get hasActiveFilter(): boolean {
    return !!(this.ownerId || this.projectId || this.groupName || this.category || this.searchText.trim() || this.statusFilter !== 'all');
  }

  ownerLabel(id: string): string {
    return this.ownerLabelById.get(id) || '';
  }

  projectLabel(id: string): string {
    return this.projectOptions.find(o => o.id === id)?.label || '';
  }

  statusChipLabel(): string {
    return this.statusFilter === 'dead' ? 'Mati / belum pernah kirim'
      : this.statusFilter === 'problem' ? 'Bermasalah (terlambat, mati, di luar ambang)'
        : this.statusOptions.find(o => o.key === this.statusFilter)?.label || '';
  }

  // ---------------------------------------------------------------------------
  // Sort & pagination
  // ---------------------------------------------------------------------------

  onSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  sortIcon(field: SortField): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  ariaSort(field: SortField): string {
    if (this.sortField !== field) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  private updatePage(): void {
    const total = this.filtered.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);
    this.paginationStart = total ? start + 1 : 0;
    this.paginationEnd = Math.min(start + this.pageSize, total);
    // window of 5 page numbers around the current page
    const from = Math.max(1, Math.min(this.currentPage - 2, this.totalPages - 4));
    const to = Math.min(this.totalPages, from + 4);
    this.pageNumbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePage();
  }

  changePageSize(size: number | string): void {
    this.pageSize = Number(size) || 20;
    this.currentPage = 1;
    this.updatePage();
  }

  // ---------------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------------

  /** Locale-aware number (LOCALE_ID → "1,79"). Never toFixed() for display. */
  private fmt(v: number, decimals: number): string {
    return formatNumber(v, this.locale, `1.${decimals}-${decimals}`);
  }

  /** Threshold limits: show as configured (no forced trailing zeros), locale decimal mark. */
  private fmtLimit(v: number): string {
    return formatNumber(Number(v), this.locale, '1.0-6');
  }

  private thresholdText(r: ChannelRow): string {
    const lo = r.minThreshold, hi = r.maxThreshold, u = r.unit ? ' ' + r.unit : '';
    if (lo === null && hi === null) return 'Ambang belum diatur';
    if (lo !== null && hi !== null) return `Ambang ${this.fmtLimit(lo)}–${this.fmtLimit(hi)}${u}`;
    return lo !== null ? `Ambang min ${this.fmtLimit(lo)}${u}` : `Ambang maks ${this.fmtLimit(hi!)}${u}`;
  }

  badgeClass(r: ChannelRow): string {
    return FRESHNESS_BADGE[r.freshness];
  }

  statusLabel(r: ChannelRow): string {
    return FRESHNESS_LABEL[r.freshness];
  }

  timeAgo(r: ChannelRow): string {
    return timeAgoId(r.lastValueAt, this.nowMs);
  }

  formatDuration(ms: number): string {
    return formatDuration(ms);
  }

  telHref(phone: string): string {
    return telHref(phone);
  }

  // ---------------------------------------------------------------------------
  // Navigation (canonical workspace URLs)
  // ---------------------------------------------------------------------------

  openChannel(r: ChannelRow): void {
    if (!r.idNode || !r.idSensor) return;
    const commands = r.idProject
      ? ['/iot/projects', r.idProject, 'node', r.idNode, 'sensor', r.idSensor]
      : ['/iot/nodes', r.idNode, 'sensor', r.idSensor];
    this.router.navigate(commands, { queryParams: { channel: r.idSensorChannel } });
  }

  nodeLink(r: ChannelRow): any[] {
    return r.idProject ? ['/iot/projects', r.idProject, 'node', r.idNode] : ['/iot/nodes', r.idNode];
  }

  trackRow(_: number, r: ChannelRow): string {
    return r.idSensorChannel;
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  // ---------------------------------------------------------------------------
  // Excel export — the filtered + sorted list (all pages)
  // ---------------------------------------------------------------------------

  get canExport(): boolean {
    return !this.loading && !this.exporting && this.filtered.length > 0 && this.latestAvailable;
  }

  async exportExcel(): Promise<void> {
    // Without latest values every row would read "no data" — exporting that would be a false report.
    if (!this.filtered.length || this.exporting || !this.latestAvailable) return;
    this.exporting = true;
    this.exportError = null;
    try {
      const wb = new Workbook();
      wb.creator = 'Helios';
      const ws = wb.addWorksheet('Kanal Telemetri');
      ws.columns = [
        ...(this.isAdmin ? [{ header: 'Owner', key: 'owner', width: 24 }] : []),
        { header: 'Project', key: 'project', width: 24 },
        { header: 'Alamat Node', key: 'address', width: 34 },
        { header: 'Kode Node', key: 'code', width: 16 },
        { header: 'Sensor', key: 'label', width: 22 },
        { header: 'Metrik', key: 'metric', width: 14 },
        { header: 'Kelompok', key: 'group', width: 14 },
        { header: 'Jenis Ukuran', key: 'category', width: 16 },
        { header: 'Nilai Terakhir', key: 'value', width: 14 },
        { header: 'Satuan', key: 'unit', width: 9 },
        { header: (this.trendsError ? 'Min 24 jam (tren tidak tersedia)' : 'Min 24 jam'), key: 'min24', width: 11 },
        { header: (this.trendsError ? 'Maks 24 jam (tren tidak tersedia)' : 'Maks 24 jam'), key: 'max24', width: 11 },
        { header: (this.trendsError ? 'Rata-rata 24 jam (tren tidak tersedia)' : 'Rata-rata 24 jam'), key: 'avg24', width: 13 },
        { header: 'Ambang Min', key: 'tmin', width: 11 },
        { header: 'Ambang Maks', key: 'tmax', width: 11 },
        { header: 'Status Ambang', key: 'tstate', width: 22 },
        { header: 'Status', key: 'status', width: 10 },
        { header: `Data Terakhir (${localTzLabel()})`, key: 'lastAt', width: 20 },
        { header: 'Keterangan', key: 'note', width: 30 },
        { header: 'Interval Lapor (dtk)', key: 'interval', width: 12 },
        { header: 'PIC', key: 'pic', width: 18 },
        { header: 'Telepon PIC', key: 'phone', width: 16 }
      ];
      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      for (const r of this.filtered) {
        const st = this.trendsByChannel.get(r.idSensorChannel)?.stats;
        const row = ws.addRow({
          owner: this.ownerLabel(r.idOwner),
          project: r.projectName,
          address: r.nodeAddress,
          code: r.nodeCode,
          label: r.sensorLabel,
          metric: r.metricCode,
          group: r.groupName,
          category: r.category,
          value: r.lastValue,
          unit: r.unit,
          min24: st?.min ?? null,
          max24: st?.max ?? null,
          avg24: st?.avg ?? null,
          tmin: r.minThreshold,
          tmax: r.maxThreshold,
          tstate: excelThresholdLabel(r.tstate, r.isOut),
          status: FRESHNESS_LABEL[r.freshness],
          lastAt: r.lastValueAt ? toExcelLocal(new Date(r.lastValueAt)) : null,
          note: r.isDead ? [r.deadText, r.seenText].filter(Boolean).join(' · ') : '',
          interval: r.intervalSec,
          pic: r.picName,
          phone: r.picPhone
        });
        const fmt = excelNumFmt(decimalsFromPrecision(r.precision));
        for (const key of ['value', 'min24', 'max24', 'avg24']) row.getCell(key).numFmt = fmt;
        row.getCell('lastAt').numFmt = 'dd-mm-yyyy hh:mm:ss';
      }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: ws.rowCount, column: ws.columns.length } };

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `kanal-telemetri-${fileStamp()}.xlsx`);
    } catch (err) {
      console.error('Ekspor Excel gagal:', err);
      this.exportError = 'Ekspor Excel gagal. Coba lagi.';
    } finally {
      this.exporting = false;
    }
  }
}
