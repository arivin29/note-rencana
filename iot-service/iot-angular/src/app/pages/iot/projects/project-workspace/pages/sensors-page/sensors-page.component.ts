import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { formatNumber } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { fetchAll, parseBody } from '../../../../../../shared/utils/fetch-all';
import { Workbook } from 'exceljs';
import { decimalsFromPrecision, excelNumFmt, thresholdState, ThresholdState } from '../../../../../../shared/utils/threshold';
import { saveAs } from 'file-saver';
import {
  FRESHNESS_BADGE, FRESHNESS_LABEL, Freshness, freshnessThresholds, getFreshness, timeAgo
} from '../../../../../../shared/utils/telemetry-freshness';
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
    /** null = not configured (never treat as 0 / "normal") */
    minThreshold?: number | null;
    maxThreshold?: number | null;
    precision?: number | null;
  }[];
  node?: {
    idNode: string;
    code: string;
    name: string;
    address?: string;
    city?: string;
    lastSeenAt?: string;
    telemetryIntervalSec?: number | null;
    picName?: string;
    picPhone?: string;
    picEmail?: string;
  };
  sensorCatalog?: {
    vendor: string;
    modelName: string;
  };
}

export interface ChannelTrend {
  buckets: ({ avg: number | null; min: number | null; max: number | null; count: number } | null)[];
  stats: { min: number | null; max: number | null; avg: number | null; count: number; lastBucketAt: string | null };
}

export type SensorStatusFilter = 'all' | 'fresh' | 'stale' | 'offline' | 'nodata' | 'outofrange' | 'dead';

@Component({
  selector: 'app-sensors-page',
  templateUrl: './sensors-page.component.html',
  styleUrls: ['./sensors-page.component.scss'],
  standalone: false
})
export class SensorsPageComponent implements OnInit, OnDestroy {
  projectId = '';
  loading = false;
  error: string | null = null;

  nodes: any[] = [];
  sensors: SensorListItem[] = [];
  filteredSensors: SensorListItem[] = [];

  // Filter & search
  searchText = '';
  statusFilter: SensorStatusFilter = 'all';
  sortField: 'label' | 'node' | 'value' | 'lastUpdate' = 'label';
  sortDirection: 'asc' | 'desc' = 'asc';
  statusOptions: { key: SensorStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'stale', label: 'Stale' },
    { key: 'offline', label: 'Offline' },
    { key: 'nodata', label: 'No Data' },
    { key: 'outofrange', label: 'Di luar ambang' }
  ];
  private searchDebounce?: ReturnType<typeof setTimeout>;

  // Pagination
  pageSize = 20; // 10 hid sensors on page 2 for a typical 12-logger project
  currentPage = 1;
  pageSizeOptions = [10, 20, 50, 100];
  exporting = false;
  exportError: string | null = null;

  // Stats
  totalSensors = 0;
  freshCount = 0;
  staleCount = 0;
  offlineCount = 0;
  noDataCount = 0;
  outOfRangeCount = 0;
  /** sensors with at least one channel threshold configured */
  thresholdConfiguredCount = 0;

  // Auto refresh (silent — keeps table on screen, updates values + "x ago")
  readonly refreshIntervalMs = 60_000;
  lastRefreshedAt: Date | null = null;
  // 24 h trends (one call per project, refreshed every 5 min — hourly buckets change slowly)
  readonly trendsIntervalMs = 5 * 60_000;
  trendsByChannel = new Map<string, ChannelTrend>();
  trendsError: string | null = null;
  trendsHours = 24;
  private trendsTimer?: ReturnType<typeof setInterval>;
  private trendsSub?: Subscription;
  /** cache of SVG paths per channel, rebuilt when trends reload */
  private sparkCache = new Map<string, string>();

  /** Single clock per load: counts, badges and KPIs all use the same 'now' (no drift between them). */
  nowMs = Date.now();
  /** false when the backend could not read latest values (ClickHouse off/unreachable). */
  latestAvailable = true;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private routeSub?: Subscription;
  private loadSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodesService: NodesService,
    private sensorsService: SensorsService,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
      if (this.projectId) {
        this.loadData();
        this.loadTrends();
      }
    });
    this.refreshTimer = setInterval(() => {
      if (this.projectId && !this.loading && document.visibilityState === 'visible') {
        this.loadData(true);
      }
    }, this.refreshIntervalMs);
    this.trendsTimer = setInterval(() => {
      if (this.projectId && document.visibilityState === 'visible') {
        this.loadTrends();
      }
    }, this.trendsIntervalMs);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
    clearInterval(this.trendsTimer);
    this.trendsSub?.unsubscribe();
    clearTimeout(this.searchDebounce);
    this.routeSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  /** @param silent background refresh: no spinner, keep current rows/page on screen */
  loadData(silent = false) {
    if (!silent) this.loading = true;
    this.error = null;
    this.loadSub?.unsubscribe();

    // Project-scoped (no N+1). fetchAll pages through so nothing is silently cut at the API max (100).
    this.loadSub = forkJoin({
      nodes: fetchAll(p => this.nodesService.nodesControllerFindAll$Response({ idProject: this.projectId, ...p })),
      sensors: fetchAll(
        p => this.sensorsService.sensorsControllerFindAll$Response({ idProject: this.projectId, ...p }),
        body => this.latestAvailable = body?.latestAvailable !== false
      )
    }).subscribe({
      next: ({ nodes, sensors }) => {
        this.nodes = nodes;
        const nodeById = new Map<string, any>(this.nodes.map(n => [n.idNode || n.id, n]));

        this.sensors = sensors.map((s: any) => {
          const node = nodeById.get(s.idNode || s.node?.idNode) || {};
          const embedded = s.node || {};
          // Prefer the non-empty value from either source (sensor's embedded node may carry nulls)
          const pick = (k: string, ...alts: string[]) =>
            [embedded[k], node[k], ...alts.map(a => node[a])].find(v => v !== null && v !== undefined && v !== '');
          return {
            ...s,
            node: {
              idNode: s.idNode || node.idNode || node.id || embedded.idNode,
              code: pick('code', 'nodeCode', 'serialNumber'),
              name: pick('name'),
              address: pick('address'),
              city: pick('city'),
              lastSeenAt: pick('lastSeenAt'),
              telemetryIntervalSec: pick('telemetryIntervalSec'),
              picName: pick('picName'),
              picPhone: pick('picPhone'),
              picEmail: pick('picEmail')
            }
          };
        });

        this.nowMs = Date.now();
        this.computeStats();
        this.applyFilters();
        this.lastRefreshedAt = new Date();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sensors:', err);
        // A failed background refresh keeps the last good data instead of blanking the page
        if (!silent || !this.sensors.length) this.error = 'Gagal memuat data sensor.';
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
    this.outOfRangeCount = 0;
    this.thresholdConfiguredCount = 0;

    this.sensors.forEach(s => {
      if (this.isOutOfRange(s)) this.outOfRangeCount++;
      if (this.hasThreshold(s)) this.thresholdConfiguredCount++;
      const status = this.getSensorStatus(s);
      if (status === 'fresh') this.freshCount++;
      else if (status === 'stale') this.staleCount++;
      else if (status === 'offline') this.offlineCount++;
      else this.noDataCount++;
    });
  }

  /** Shared rule — see shared/utils/telemetry-freshness.ts */
  getSensorStatus(sensor: SensorListItem): Freshness {
    return getFreshness(sensor.lastValueAt, sensor.node?.telemetryIntervalSec, this.nowMs);
  }

  /** Freshness of ONE channel (a multi-channel sensor's channels can stop independently). */
  channelFreshness(sensor: SensorListItem, ch: SensorListItem['channels'][number]): Freshness {
    return getFreshness(ch.lastValueAt, sensor.node?.telemetryIntervalSec, this.nowMs);
  }

  /** Tooltip explaining why a row has its status (thresholds depend on the node interval). */
  getStatusTitle(sensor: SensorListItem): string {
    const { freshMin, staleMin } = freshnessThresholds(sensor.node?.telemetryIntervalSec);
    const iv = sensor.node?.telemetryIntervalSec ? `interval ${sensor.node.telemetryIntervalSec}s · ` : '';
    return `${iv}Fresh < ${freshMin} min · Stale < ${staleMin} min · Offline ≥ ${staleMin} min`;
  }

  applyFilters() {
    let result = [...this.sensors];

    if (this.statusFilter !== 'all') {
      result = this.statusFilter === 'outofrange'
        ? result.filter(s => this.isOutOfRange(s))
        : this.statusFilter === 'dead'
          ? result.filter(s => { const f = this.getSensorStatus(s); return f === 'offline' || f === 'nodata'; })
          : result.filter(s => this.getSensorStatus(s) === this.statusFilter);
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
          // "No data" rows always sink to the bottom, regardless of direction
          // Sort by the FIRST channel's value (what the row shows first). sensor.lastValue is
          // "whichever channel reported last" and can be a different metric/unit.
          const av = a.channels?.[0]?.lastValue, bv = b.channels?.[0]?.lastValue;
          if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
          if (bv === null || bv === undefined) return -1;
          cmp = av - bv;
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
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  onSearchChange(value: string) {
    this.searchText = value;
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.applyFilters();
    }, 400);
  }

  onStatusFilter(status: SensorStatusFilter) {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  statusCount(status: SensorStatusFilter): number {
    switch (status) {
      case 'fresh': return this.freshCount;
      case 'stale': return this.staleCount;
      case 'offline': return this.offlineCount;
      case 'nodata': return this.noDataCount;
      case 'outofrange': return this.outOfRangeCount;
      case 'dead': return this.offlineCount + this.noDataCount;
      default: return this.totalSensors;
    }
  }

  // --- Pagination ---
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSensors.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get paginatedSensors(): SensorListItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSensors.slice(start, start + this.pageSize);
  }

  get paginationStart(): number {
    return this.filteredSensors.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredSensors.length);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  changePageSize(size: number | string) {
    this.pageSize = Number(size) || 10;
    this.currentPage = 1;
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

  /** Canonical URL: node/:nodeId/sensor/<idSensor>?channel=<idSensorChannel> */
  navigateToSensor(sensor: SensorListItem, channelId?: string) {
    if (!sensor.node?.idNode) return;
    const channel = channelId || sensor.channels?.[0]?.idSensorChannel;
    this.router.navigate(['node', sensor.node.idNode, 'sensor', sensor.idSensor], {
      relativeTo: this.route.parent,
      queryParams: channel ? { channel } : {}
    });
  }

  openChannel(sensor: SensorListItem, channelId: string, event: MouseEvent) {
    event.stopPropagation();
    this.navigateToSensor(sensor, channelId);
  }

  navigateToNode(nodeId: string, event: MouseEvent) {
    event.stopPropagation();
    this.router.navigate(['node', nodeId], { relativeTo: this.route.parent });
  }

  /** Locale-aware number (follows LOCALE_ID: "1,79"). toFixed()/`${n}` ignore the locale — never use them for display. */
  private fmt(v: number, decimals: number): string {
    return formatNumber(v, this.locale, `1.${decimals}-${decimals}`);
  }

  /** Decimals follow the channel's precision (two meanings in prod data — see shared/utils/threshold.ts). */
  formatValue(value: number | null, unit?: string, precision?: number | null): string {
    if (value === null || value === undefined) return '-';
    const numVal = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numVal)) return '-';
    const txt = this.fmt(numVal, decimalsFromPrecision(precision));
    return unit ? `${txt} ${unit}` : txt;
  }

  // --- Thresholds (configured per channel; null = not set) ---

  /**
   * Threshold state of one channel, judged on THAT channel's own freshness.
   * offline/no data → 'novalue' (an old value is not a current problem).
   */
  channelState(sensor: SensorListItem, ch: SensorListItem['channels'][number]): ThresholdState {
    const f = this.channelFreshness(sensor, ch);
    if (f === 'offline' || f === 'nodata') return 'novalue';
    return thresholdState(ch.lastValue, ch.minThreshold, ch.maxThreshold);
  }

  /**
   * A crossing counts as "di luar ambang" only when the channel is FRESH — same rule as the
   * backend `computeChannelStatus` (stale → no threshold verdict), so Telemetry Channels,
   * mobile and this tab agree. Stale crossings are still shown, muted, but not counted.
   */
  isChannelOut(sensor: SensorListItem, ch: SensorListItem['channels'][number]): boolean {
    const st = this.channelState(sensor, ch);
    return (st === 'below' || st === 'above') && this.channelFreshness(sensor, ch) === 'fresh';
  }

  /** Excel "Status Ambang" — same semantics as the screen (late crossings are marked, not counted). */
  excelThresholdLabel(sensor: SensorListItem, ch: SensorListItem['channels'][number]): string {
    const st = this.channelState(sensor, ch);
    const base = ({ below: 'Di bawah min', above: 'Di atas maks', ok: 'Normal', unset: 'Belum diatur', novalue: '-' } as Record<ThresholdState, string>)[st];
    return (st === 'below' || st === 'above') && !this.isChannelOut(sensor, ch) ? `${base} (data terlambat)` : base;
  }

  isOutOfRange(sensor: SensorListItem): boolean {
    return (sensor.channels || []).some(ch => this.isChannelOut(sensor, ch));
  }

  hasThreshold(sensor: SensorListItem): boolean {
    return (sensor.channels || []).some(ch =>
      (ch.minThreshold !== null && ch.minThreshold !== undefined) || (ch.maxThreshold !== null && ch.maxThreshold !== undefined));
  }

  thresholdText(ch: SensorListItem['channels'][number]): string {
    const lo = ch.minThreshold, hi = ch.maxThreshold;
    const has = (v: any) => v !== null && v !== undefined;
    if (!has(lo) && !has(hi)) return 'Ambang belum diatur';
    if (has(lo) && has(hi)) return `Ambang ${lo}–${hi} ${ch.unit || ''}`.trim();
    return has(lo) ? `Ambang min ${lo} ${ch.unit || ''}`.trim() : `Ambang maks ${hi} ${ch.unit || ''}`.trim();
  }

  /** Text shown under an out-of-range value, e.g. "di bawah min 0.5". */
  outOfRangeText(ch: SensorListItem['channels'][number], state: ThresholdState): string {
    return state === 'below' ? `di bawah min ${ch.minThreshold}` : state === 'above' ? `di atas maks ${ch.maxThreshold}` : '';
  }

  formatTimeAgo(timestamp: string | null): string {
    return timeAgo(timestamp);
  }

  getStatusBadgeClass(sensor: SensorListItem): string {
    return FRESHNESS_BADGE[this.getSensorStatus(sensor)];
  }

  getStatusLabel(sensor: SensorListItem): string {
    return FRESHNESS_LABEL[this.getSensorStatus(sensor)];
  }

  /** API may send channels as null — keep templates null-safe. */
  channelCount(sensor: SensorListItem): number {
    return sensor.channels?.length ?? 0;
  }

  firstMetric(sensor: SensorListItem): string {
    return sensor.channels?.[0]?.metricCode || '-';
  }

  getChannelUnit(sensor: SensorListItem): string {
    return sensor.channels?.[0]?.unit || '';
  }

  // ---------------------------------------------------------------------------
  // Operator helpers (no backend needed — all from data already loaded)
  // ---------------------------------------------------------------------------

  /** "tiap 2 mnt" / "tiap 15 dtk" / "" — the node's configured reporting interval. */
  formatInterval(sec?: number | null): string {
    const n = Number(sec);
    if (!n || n <= 0) return '';
    if (n < 60) return `tiap ${n} dtk`;
    if (n % 3600 === 0) return `tiap ${n / 3600} jam`;
    return `tiap ${Math.round(n / 60)} mnt`;
  }

  /** Human duration in Indonesian: "12 mnt", "5 jam", "3 hari", "4 bln". */
  formatDuration(ms: number): string {
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m} mnt`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} jam`;
    const d = Math.floor(h / 24);
    if (d < 60) return `${d} hari`;
    return `${Math.floor(d / 30)} bln`;
  }

  /** For offline sensors: since when no data arrived (time of LAST data received, not a measured outage). */
  deadSinceText(sensor: SensorListItem): string {
    if (!this.latestAvailable) return 'Nilai terakhir tidak tersedia';
    if (!sensor.lastValueAt) return 'Belum pernah kirim';
    return `Data terakhir ${this.formatDuration(this.nowMs - new Date(sensor.lastValueAt).getTime())} lalu`;
  }

  /** Second line for a channel that never reported: the NODE may still have been seen. */
  nodeSeenText(sensor: SensorListItem): string {
    const seen = sensor.node?.lastSeenAt;
    return seen ? `node terlihat ${this.formatDuration(this.nowMs - new Date(seen).getTime())} lalu` : '';
  }

  isProblem(sensor: SensorListItem): boolean {
    const st = this.getSensorStatus(sensor);
    return st === 'offline' || st === 'nodata' || st === 'stale';
  }

  /** KPI: oldest last-data among offline sensors (the one dead the longest). */
  get longestDead(): SensorListItem | null {
    const dead = this.sensors.filter(s => this.getSensorStatus(s) === 'offline' && s.lastValueAt);
    if (!dead.length) return null;
    return dead.reduce((a, b) => new Date(a.lastValueAt!) < new Date(b.lastValueAt!) ? a : b);
  }

  /**
   * KPI: lowest CURRENT value among FRESH channels, from each channel's own (value, unit) —
   * never sensor.lastValue (that is "whichever channel reported last", e.g. a flowmeter's m³
   * volume next to an l/s unit). Shown only when all fresh channels share one unit.
   */
  get lowestFresh(): { sensor: SensorListItem; value: number; unit: string } | null {
    const pairs: { sensor: SensorListItem; value: number; unit: string }[] = [];
    for (const s of this.sensors) {
      for (const ch of s.channels || []) {
        if (ch.lastValue === null || ch.lastValue === undefined) continue;
        if (this.channelFreshness(s, ch) !== 'fresh') continue;
        pairs.push({ sensor: s, value: Number(ch.lastValue), unit: (ch.unit || '').trim() });
      }
    }
    if (!pairs.length) return null;
    const units = new Set(pairs.map(p => p.unit.toLowerCase()));
    if (units.size !== 1) return null;
    return pairs.reduce((a, b) => (a.value <= b.value ? a : b));
  }

  /** Label of the viewer's timezone: WIB / WITA / WIT, else UTC±h (Excel cells carry no timezone). */
  localTzLabel(): string {
    const offsetH = -new Date().getTimezoneOffset() / 60;
    const names: Record<number, string> = { 7: 'WIB', 8: 'WITA', 9: 'WIT' };
    return names[offsetH] || `UTC${offsetH >= 0 ? '+' : ''}${offsetH}`;
  }

  /** tel: link for the node PIC (quick follow-up on a dead logger). */
  telHref(phone?: string): string {
    return 'tel:' + (phone || '').replace(/[^0-9+]/g, '');
  }

  stop(event: Event) {
    event.stopPropagation();
  }

  /**
   * Excel export of the CURRENT filtered + sorted list (all pages), report-page style.
   * Excel has no timezone: dates are shifted by the local offset so WIB shows as WIB.
   */
  async exportExcel() {
    // Without latest values every row would read "no data" — exporting that would be a false report.
    if (!this.filteredSensors.length || this.exporting || !this.latestAvailable) return;
    this.exporting = true;
    this.exportError = null;
    try {
      const toExcelLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000);

      const wb = new Workbook();
      wb.creator = 'Helios';
      const ws = wb.addWorksheet('Sensor');
      ws.columns = [
        { header: 'Alamat Node', key: 'address', width: 34 },
        { header: 'Kode Node', key: 'code', width: 16 },
        { header: 'Sensor', key: 'label', width: 22 },
        { header: 'Metrik', key: 'metric', width: 12 },
        { header: 'Nilai Terakhir', key: 'value', width: 14 },
        { header: 'Satuan', key: 'unit', width: 9 },
        { header: 'Min 24 jam', key: 'min24', width: 11 },
        { header: 'Maks 24 jam', key: 'max24', width: 11 },
        { header: 'Rata-rata 24 jam', key: 'avg24', width: 13 },
        { header: 'Ambang Min', key: 'tmin', width: 11 },
        { header: 'Ambang Maks', key: 'tmax', width: 11 },
        { header: 'Status Ambang', key: 'tstate', width: 16 },
        { header: 'Status', key: 'status', width: 10 },
        { header: `Data Terakhir (${this.localTzLabel()})`, key: 'lastAt', width: 20 },
        { header: 'Keterangan', key: 'note', width: 28 },
        { header: 'Interval Lapor (dtk)', key: 'interval', width: 12 },
        { header: 'PIC', key: 'pic', width: 18 },
        { header: 'Telepon PIC', key: 'phone', width: 16 }
      ];
      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      for (const s of this.filteredSensors) {
        const channels = s.channels?.length ? s.channels : [null];
        for (const ch of channels) {
          const value = ch ? ch.lastValue : s.lastValue;
          const lastAt = ch ? ch.lastValueAt : s.lastValueAt;
          const row = ws.addRow({
            address: s.node?.address || '',
            code: s.node?.code || '',
            label: s.label || '',
            metric: ch?.metricCode || '',
            value: value === null || value === undefined ? null : Number(value),
            unit: ch?.unit || this.getChannelUnit(s),
            min24: ch ? (this.trendOf(ch)?.stats?.min ?? null) : null,
            max24: ch ? (this.trendOf(ch)?.stats?.max ?? null) : null,
            avg24: ch ? (this.trendOf(ch)?.stats?.avg ?? null) : null,
            tmin: ch?.minThreshold ?? null,
            tmax: ch?.maxThreshold ?? null,
            tstate: ch ? this.excelThresholdLabel(s, ch) : '-',
            status: this.getStatusLabel(s),
            lastAt: lastAt ? toExcelLocal(new Date(lastAt)) : null,
            note: this.isProblem(s) ? [this.deadSinceText(s), s.lastValueAt ? '' : this.nodeSeenText(s)].filter(Boolean).join(' · ') : '',
            interval: s.node?.telemetryIntervalSec ?? null,
            pic: s.node?.picName || '',
            phone: s.node?.picPhone || ''
          });
          const fmt = excelNumFmt(decimalsFromPrecision(ch?.precision));
          for (const key of ['value', 'min24', 'max24', 'avg24']) row.getCell(key).numFmt = fmt;
          row.getCell('lastAt').numFmt = 'dd-mm-yyyy hh:mm:ss';
        }
      }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: ws.rowCount, column: ws.columns.length } };

      const stamp = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const name = `sensor-${this.projectId.slice(0, 8)}-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.xlsx`;
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name);
    } catch (err) {
      console.error('Export Excel gagal:', err);
      this.exportError = 'Ekspor Excel gagal. Coba lagi.';
    } finally {
      this.exporting = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 24 h trends (GET /api/sensors/trends) — real hourly buckets, empty hour = gap
  // ---------------------------------------------------------------------------

  loadTrends() {
    this.trendsSub?.unsubscribe();
    this.trendsSub = this.sensorsService.sensorsControllerTrends$Response({ idProject: this.projectId, hours: this.trendsHours })
      .subscribe({
        next: (res) => {
          const body = parseBody(res.body);
          const map = new Map<string, ChannelTrend>();
          for (const row of (body?.data || [])) {
            map.set(row.idSensorChannel, { buckets: row.buckets || [], stats: row.stats || {} });
          }
          this.trendsByChannel = map;
          this.sparkCache.clear();
          this.trendsError = null;
        },
        error: (err) => {
          // Keep the last good trends; say so once instead of drawing empty lines.
          this.trendsError = err?.status === 503 ? 'Tren 24 jam tidak tersedia (server data).' : 'Tren 24 jam gagal dimuat.';
        }
      });
  }

  trendOf(ch: { idSensorChannel: string }): ChannelTrend | undefined {
    return this.trendsByChannel.get(ch.idSensorChannel);
  }

  /** True when the channel has at least 2 hourly points to draw. */
  hasSpark(ch: { idSensorChannel: string }): boolean {
    const t = this.trendOf(ch);
    return !!t && t.buckets.filter(b => b && b.avg !== null).length >= 2;
  }

  /**
   * SVG path (72×20) of hourly averages. Missing hours BREAK the line (new "M"),
   * they are never interpolated or drawn as 0.
   */
  sparkPath(ch: { idSensorChannel: string }): string {
    const cached = this.sparkCache.get(ch.idSensorChannel);
    if (cached !== undefined) return cached;
    const t = this.trendOf(ch);
    let d = '';
    if (t) {
      const vals = t.buckets.map(b => (b && b.avg !== null ? Number(b.avg) : null));
      const nums = vals.filter((v): v is number => v !== null);
      if (nums.length >= 2) {
        const lo = Math.min(...nums), hi = Math.max(...nums);
        const span = hi - lo || 1;
        const W = 72, H = 20, n = vals.length;
        let pen = false;
        vals.forEach((v, i) => {
          if (v === null) { pen = false; return; }
          const x = n > 1 ? (i / (n - 1)) * W : 0;
          const y = H - 2 - ((v - lo) / span) * (H - 4);
          d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
          pen = true;
        });
      }
    }
    this.sparkCache.set(ch.idSensorChannel, d.trim());
    return d.trim();
  }

  /** "24 jam: 0,64–2,28" text (raw min/max, channel precision). */
  rangeText(ch: SensorListItem['channels'][number]): string {
    const st = this.trendOf(ch)?.stats;
    if (!st || st.min === null || st.max === null || !st.count) return '';
    const dec = decimalsFromPrecision(ch.precision);
    const f = (v: number) => this.fmt(v, dec);
    return `${this.trendsHours} jam: ${f(st.min)}–${f(st.max)}`;
  }
}
