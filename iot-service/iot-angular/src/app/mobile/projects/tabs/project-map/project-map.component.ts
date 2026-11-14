import {
  AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, Optional, ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { fetchAll } from '@app/shared/utils/fetch-all';
import { getFreshness, Freshness } from '@app/shared/utils/telemetry-freshness';
import { timeAgoId } from '@app/shared/utils/channel-display';
import { formatHm, formatIdNumber } from '@app/pages/iot/widget-builder/utils/format-id';
import { decimalsFromPrecision } from '@app/shared/utils/threshold';
import { metricLabel } from '../../../shared/channel-rows';
import { FRESHNESS_TONE, MTone } from '../../../shared/labels';
import type {
  MapLegendItem, ProjectMapLegend,
} from '@app/pages/iot/webgis/components/project-map/webgis-project-map.component';
import type { SensorLabelFormat } from '@app/pages/iot/webgis/components/sensor-labels/sensor-labels';
import {
  WebgisProjectMapComponent, ProjectMapSelection,
} from '@app/pages/iot/webgis/components/project-map/webgis-project-map.component';
import { MapPoint } from '@app/pages/iot/widget-builder/utils/map-rows';
import { NodeSensorData, SensorChannelValue } from '@app/pages/iot/webgis/components/sensor-labels/sensor-labels';
import {
  MAP_BUCKET_LABEL, MAP_FRESHNESS_TEXT, MapStatusBucket, MapStatusFilter, countBuckets, directionsUrl,
  fillHeight, freshnessBucket, latestTime, nodeShareText, sortSheetChannels, whatsappShareUrl,
} from '@app/pages/iot/webgis/shared/map-node-info';
import { isConstantMetric, metricDecimals, prettyUnit } from '@app/pages/iot/webgis/shared/map-node-info';
import type { Insets } from '@app/pages/iot/webgis/shared/label-clusters';
import { RefreshBusService } from '../../../shared/refresh-bus.service';
import { MobileProjectStore } from '../../../shared/mobile-project-store.service';

const REFRESH_MS = 60_000;
/** Bigger markers (radius 7 → ~10 px) + hit tolerance → ≥ 44 px touch target. */
const MARKER_SCALE = 1.4;
const HIT_TOLERANCE = 16;
/** Node view: no node is drawn from the sensor-type layers (their markers/cards/alerts hidden). */
const NO_NODES: ReadonlySet<string> = new Set<string>();
/** Fit room for overlays [top, right, bottom, left]: portrait = toggle + chip rows / rail; landscape = one row / 2-col rail. */
const FIT_PAD_PORTRAIT: [number, number, number, number] = [100, 56, 0, 0];
const FIT_PAD_LANDSCAPE: [number, number, number, number] = [60, 110, 0, 0];
/** Value cards avoid: toggle + chips (top), control rail (right), attribution (bottom). */
const INSETS_PORTRAIT: Partial<Insets> = { top: 100, right: 60, bottom: 44, left: 0 };
const INSETS_LANDSCAPE: Partial<Insets> = { top: 60, right: 110, bottom: 44, left: 0 };
/** Node view draw order: problems on top (offline > terganggu > belum pernah > online). */
const NODE_Z: Record<Freshness, number> = { fresh: 0, nodata: 1, stale: 2, offline: 3 };
/** Node view point status: drives declutter order (alarm statuses first → their label wins). */
const NODE_POINT_STATUS: Record<Freshness, MapPoint['status']> = { fresh: 'normal', nodata: 'nodata', stale: 'low', offline: 'high' };
/** Value cards a bit larger than desktop (≥ 11 px text). */
const CARD_SCALE = 1.15;

interface MapNode {
  id: string;
  code: string;
  address: string;
  lat: number;
  lon: number;
  lastSeenAt: string | null;
  intervalSec: number | null;
}

interface SheetChannel {
  channelId: string;
  name: string;
  value: string;
  unit: string;
  status: SensorChannelValue['status'];
}

interface SheetNode {
  id: string;
  label: string;
  /** Line 2 (node code) — only when the label is the address. */
  code: string;
  lat: number | null;
  lon: number | null;
  freshness: Freshness;
  /** Glossary tone for the status badge (ok / warn / danger / off). */
  tone: MTone;
  statusText: string;
  ago: string;
  channels: SheetChannel[];
}

/**
 * Tab Peta proyek (mobile) — same map engine as the desktop widget / Monitor TV
 * (`<webgis-project-map>`: WebGIS layers & styles, sensor-type colours, alerts, merged value cards).
 * Mobile adds: status filter chips, 44 px controls (zoom, seluruh area, lokasi saya, layar penuh),
 * auto-refresh 60 s and a bottom sheet with field actions (Rute, Salin, Bagikan, Buka node, Tren).
 */
@Component({
  selector: 'mobile-project-map',
  templateUrl: './project-map.component.html',
  styleUrls: ['./project-map.component.scss'],
  standalone: false,
})
export class MobileProjectMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) rootEl!: ElementRef<HTMLElement>;
  @ViewChild(WebgisProjectMapComponent) mapCmp?: WebgisProjectMapComponent;

  readonly markerScale = MARKER_SCALE;
  readonly hitTolerance = HIT_TOLERANCE;
  readonly cardScale = CARD_SCALE;
  /** Room for the chips row (top) and the control column (right) when fitting. */
  fitPadding: [number, number, number, number] = FIT_PAD_PORTRAIT;
  /** Phone maps: value-card room in the fit is capped (else the start view zooms out to one card). */
  readonly cardReserveMax = 0.12;
  labelInsets: Partial<Insets> = INSETS_PORTRAIT;
  /** Phone start view: zoom in a little until at least this many value cards show. */
  readonly minStartCards = 3;
  /** Map narrower than 480 px → compact value cards. */
  narrow = false;
  /** Short landscape screen → no panel strip (time/refresh live in the rail). */
  landscape = false;
  readonly labelVariant = 'helios' as const;
  legendItems: MapLegendItem[] = [];
  alertCount = 0;
  alertColor = '';
  /** Legend strip: collapsed by default on phones. */
  legendOpen = typeof window !== 'undefined' && window.innerWidth >= 900 && window.innerHeight >= 600;
  /** Status chips show LED + count only (measured: the full labels don't fit the toolbar). */
  compactChips = typeof window !== 'undefined' && window.innerWidth <= 440;
  /** Toolbar width at which full chips overflowed (re-expand only when clearly wider). */
  private chipsOverflowAt = 0;
  private decimals = new Map<string, number>();
  private legendTouched = false;
  private sensorsRef: any[] | null = null;
  labelFormat: SensorLabelFormat = this.buildLabelFormat();
  readonly filters: { key: MapStatusFilter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'online', label: MAP_BUCKET_LABEL.online },
    { key: 'terganggu', label: MAP_BUCKET_LABEL.terganggu },
    { key: 'offline', label: MAP_BUCKET_LABEL.offline },
  ];

  projectId: string | null = null;
  /** Set when hosted in the /mobile/p/:pid shell (in-project node links). */
  private pid: string | null = null;
  refreshNonce = 0;
  /** Map box height (px); null until measured. */
  height: number | null = null;
  /** px between the viewport bottom and the bottom nav top → sheet sits above it. */
  sheetBottom = 0;

  /** Sensor (default on every open) = value cards; Node = connectivity status markers. */
  view: 'sensor' | 'node' = 'sensor';
  /** Node view markers (status colour + "terakhir kirim" label). */
  nodePoints: MapPoint[] = [];

  filter: MapStatusFilter = 'all';
  counts: Record<MapStatusFilter, number> = countBuckets([]);
  visibleNodeIds: ReadonlySet<string> | null = null;

  updatedAt: Date | null = null;
  nodesLoading = false;
  nodesError = false;
  /** Map engine failed to load layers / values (no data at all yet). */
  loadErrorText: string | null = null;

  /** Bottom sheet: node chooser (co-located) or one node's detail. */
  sheetOpen = false;
  choices: SheetNode[] = [];
  selected: SheetNode | null = null;

  fullscreen = false;
  /** Native fullscreen unavailable (iOS) → CSS fixed overlay. */
  cssFullscreen = false;
  locating = false;
  /** Blue dot currently shown. */
  userLocated = false;
  toast: string | null = null;

  private nodes = new Map<string, MapNode>();
  private values = new Map<string, NodeSensorData>();
  private now = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private nodesSub: Subscription | null = null;
  private lastRefreshAt = Date.now();
  private unregisterRefresh: (() => void) | null = null;
  /** Resolves the pending pull-to-refresh promise. */
  private nodesDone: (() => void) | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodesService: NodesService,
    private refreshBus: RefreshBusService,
    private zone: NgZone,
    /** Provided by the `/mobile/p/:pid` shell: shared node list + its pull-to-refresh. */
    @Optional() private store: MobileProjectStore | null,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.projectId = this.readProjectId();
    if (this.store) {
      // Inside the project shell: nodes come from the shared store (it polls & owns pull-to-refresh).
      let lastStoreAt: Date | null = null;
      this.store.state$.pipe(takeUntil(this.destroy$)).subscribe((st) => {
        this.nodesLoading = st.firstLoad;
        this.nodesError = !!st.nodesError && !st.nodes;
        if (st.nodes) this.setNodes(st.nodes);
        if (st.sensors && st.sensors !== this.sensorsRef) this.setPrecision(st.sensors);
        // A store reload we didn't trigger (pull-to-refresh / its poll) → refresh map values too,
        // unless ours ran moments ago.
        if (st.updatedAt && st.updatedAt !== lastStoreAt) {
          lastStoreAt = st.updatedAt;
          if (Date.now() - this.lastRefreshAt > 15_000) this.refreshValues();
        }
      });
    } else {
      void this.loadNodes();
      // Pull-to-refresh: resolves when the node status reload finished (values reload in parallel).
      this.unregisterRefresh = this.refreshBus.register(() => this.refresh());
    }
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        if (document.hidden) return;
        // With the store, node status is polled by the store; we only refresh map values.
        this.zone.run(() => (this.store ? this.refreshValues() : void this.refresh()));
      }, REFRESH_MS);
    });
  }

  ngAfterViewInit(): void {
    // Measure after layout settled (header/tabs rendered).
    setTimeout(() => this.measure());
    setTimeout(() => this.measure(), 300);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.nodesSub?.unsubscribe();
    this.unregisterRefresh?.();
    this.mapCmp?.setUserLocation(null);
    this.nodesDone?.();
    if (this.timer) clearInterval(this.timer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (document.fullscreenElement === this.rootEl?.nativeElement) document.exitFullscreen?.().catch(() => undefined);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  onResize(): void {
    setTimeout(() => this.measure());
  }

  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (!document.hidden && Date.now() - this.lastRefreshAt >= REFRESH_MS) void this.refresh();
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.fullscreen = document.fullscreenElement === this.rootEl.nativeElement;
    setTimeout(() => this.mapCmp?.updateSize());
  }

  // ── Data ─────────────────────────────────────────────────

  /** Dynamic values (map) + node status; geometry is not reloaded. */
  refresh(): Promise<void> {
    this.refreshValues();
    return this.store ? this.store.refresh() : this.loadNodes();
  }

  /** Sensor values + alerts only (map engine tick). */
  private refreshValues(): void {
    this.lastRefreshAt = Date.now();
    this.now = Date.now();
    this.refreshNonce++;
  }

  retryNodes(): void {
    void (this.store ? this.store.refresh() : this.loadNodes());
  }

  onValues(rows: NodeSensorData[]): void {
    this.values = new Map(rows.map((r) => [r.nodeId, r] as [string, NodeSensorData]));
    this.now = Date.now();
    this.recompute();
  }

  onLoaded(at: Date): void {
    this.updatedAt = at;
  }

  /** Own collapsible legend (engine legend off): WebGIS colours, friendlier names. */
  onLegend(l: ProjectMapLegend): void {
    this.legendItems = l.items.map((i) => ({ ...i, name: i.shape === 'dot' ? metricLabel(i.name) : i.name }));
    this.alertCount = l.alertCount;
    this.alertColor = l.alertColor;
  }

  get filterLabel(): string {
    return this.filter === 'all' ? '' : MAP_BUCKET_LABEL[this.filter].toLowerCase();
  }

  toggleLegend(): void {
    this.legendTouched = true;
    this.legendOpen = !this.legendOpen;
  }

  /** channelId → decimals from `sensor_channels.precision` (store `/sensors`); unknown → 2. */
  private setPrecision(sensors: any[]): void {
    this.sensorsRef = sensors;
    const map = new Map<string, number>();
    for (const s of sensors) {
      for (const ch of s?.channels || []) {
        // no precision -> metric default (volume 0, tekanan/debit 2), never a blanket 2
        if (ch?.idSensorChannel) map.set(ch.idSensorChannel, decimalsFromPrecision(ch.precision, metricDecimals(ch.metricCode)));
      }
    }
    this.decimals = map;
    this.labelFormat = this.buildLabelFormat();
    if (this.selected) this.selected = this.sheetNode(this.selected.id);
  }

  private buildLabelFormat(): SensorLabelFormat {
    const decimals = this.decimals;
    return {
      metric: (code) => metricLabel(code),
      value: (ch) => {
        const n = ch.value === null || ch.value === undefined ? NaN : Number(ch.value);
        return Number.isFinite(n) ? formatIdNumber(n, decimals.get(ch.channelId) ?? metricDecimals(ch.metricCode)) : '—';
      },
      unit: (u) => prettyUnit(u),
      hide: (ch) => isConstantMetric(ch.metricCode),
    };
  }

  onLoadError(text: string | null): void {
    this.loadErrorText = text;
  }

  retryMap(): void {
    this.loadErrorText = null;
    this.mapCmp?.retryLayers();
    void (this.store ? this.store.refresh() : this.loadNodes());
  }

  get updatedText(): string {
    // id-ID clock 09.42 (same as Ringkasan)
    return this.updatedAt ? formatHm(this.updatedAt).replace(':', '.') : '';
  }

  private loadNodes(): Promise<void> {
    const projectId = this.projectId;
    if (!projectId) return Promise.resolve();
    this.nodesSub?.unsubscribe();
    this.nodesDone?.();
    const done = new Promise<void>((resolve) => (this.nodesDone = resolve));
    const finish = () => { const d = this.nodesDone; this.nodesDone = null; d?.(); };
    this.nodesLoading = true;
    this.nodesSub = fetchAll((p) => this.nodesService.nodesControllerFindAll$Response({ idProject: projectId, ...p }))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any[]) => {
          this.setNodes(rows);
          this.nodesError = false;
          this.nodesLoading = false;
          finish();
        },
        error: () => {
          this.nodesError = true;
          this.nodesLoading = false;
          finish();
        },
      });
    return done;
  }

  private setNodes(rows: any[]): void {
    const map = new Map<string, MapNode>();
    for (const n of rows) {
      const id = n.idNode || n.id;
      if (!id) continue;
      map.set(id, {
        id,
        code: n.code || n.name || '',
        address: (n.address || '').trim(),
        lat: toNum(n.latitude),
        lon: toNum(n.longitude),
        lastSeenAt: n.lastSeenAt || null,
        intervalSec: n.telemetryIntervalSec ?? null,
      });
    }
    this.nodes = map;
    this.now = Date.now();
    this.recompute();
  }

  /** Status per node → chip counts, filter set, open sheet content. */
  private recompute(): void {
    const all = new Map<string, MapStatusBucket>();
    for (const id of this.mapNodeIds()) all.set(id, freshnessBucket(this.freshnessOf(id)));
    // Counts = markers of the current view: Sensor → nodes with located channel values; Node → every located node.
    const sensorIds = new Set(this.sensorNodeIds());
    const shown = this.view === 'node' ? all : new Map([...all].filter(([id]) => sensorIds.has(id)));
    this.counts = countBuckets([...shown.values()]);
    this.applyFilter(all);
    this.buildNodePoints(all);
    setTimeout(() => this.fitChips()); // counts change chip widths
    if (this.selected) this.selected = this.sheetNode(this.selected.id);
    if (this.choices.length) this.choices = this.choices.map((c) => this.sheetNode(c.id));
  }

  /** Nodes drawn on the map: with coordinates (node list) or with a located value row. */
  private mapNodeIds(): string[] {
    const ids = new Set<string>();
    for (const n of this.nodes.values()) if (Number.isFinite(n.lat) && Number.isFinite(n.lon)) ids.add(n.id);
    for (const v of this.values.values()) if (v.hasCoordinates) ids.add(v.nodeId);
    return [...ids];
  }

  /** Nodes drawn by the sensor-type layers / value cards (Sensor view). */
  private sensorNodeIds(): string[] {
    return [...this.values.values()].filter((v) => v.hasCoordinates && v.channels.length > 0).map((v) => v.nodeId);
  }

  private lastAtOf(id: string): string | null {
    const v = this.values.get(id);
    return latestTime(this.nodes.get(id)?.lastSeenAt, ...(v?.channels || []).map((c) => c.timestamp));
  }

  private freshnessOf(id: string): Freshness {
    return getFreshness(this.lastAtOf(id), this.nodes.get(id)?.intervalSec, this.now);
  }

  // ── View (Sensor | Node) ─────────────────────────────────

  setView(v: 'sensor' | 'node'): void {
    if (this.view === v) return;
    this.view = v;
    this.recompute();
  }

  /** Sensor view: status filter set; Node view: hide every sensor-type marker/card/alert. */
  get mapVisibleNodeIds(): ReadonlySet<string> | null {
    return this.view === 'node' ? NO_NODES : this.visibleNodeIds;
  }

  get mapPoints(): MapPoint[] {
    return this.view === 'node' ? this.nodePoints : NO_POINTS;
  }

  private buildNodePoints(buckets: Map<string, MapStatusBucket>): void {
    const css = getComputedStyle(this.rootEl?.nativeElement || document.documentElement);
    const tok = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
    const colors: Record<Freshness, string> = {
      fresh: tok('--m-success', '#2dd4a7'),
      stale: tok('--m-warning', '#fbbf24'),
      offline: tok('--m-danger', '#fb5b6d'),
      nodata: '',
    };
    const points: MapPoint[] = [];
    for (const [id, bucket] of buckets) {
      if (this.filter !== 'all' && bucket !== this.filter) continue;
      const n = this.sheetNode(id);
      if (n.lat === null || n.lon === null) continue;
      points.push({
        id,
        lat: n.lat,
        lon: n.lon,
        label: n.ago,
        value: null,
        unit: '',
        // nodata → muted ring (no fill); others filled with the mobile status token
        status: NODE_POINT_STATUS[n.freshness],
        color: colors[n.freshness] || undefined,
        z: NODE_Z[n.freshness],
        time: null,
      });
    }
    this.nodePoints = points;
  }

  // ── Filter ───────────────────────────────────────────────

  setFilter(f: MapStatusFilter): void {
    if (this.filter === f) return;
    this.filter = f;
    this.recompute();
  }

  private applyFilter(buckets: Map<string, MapStatusBucket>): void {
    if (this.filter === 'all') {
      this.visibleNodeIds = null;
      return;
    }
    const next = new Set([...buckets].filter(([, b]) => b === this.filter).map(([id]) => id));
    const prev = this.visibleNodeIds;
    // Keep the reference when nothing changed (no needless restyle / card rebuild).
    if (prev && prev.size === next.size && [...next].every((id) => prev.has(id))) return;
    this.visibleNodeIds = next;
  }

  // ── Sheet ────────────────────────────────────────────────

  onSelect(sel: ProjectMapSelection | null): void {
    if (!sel) {
      this.closeSheet();
      return;
    }
    const nodes = sel.nodeIds.map((id) => this.sheetNode(id));
    if (nodes.length === 1) {
      this.choices = [];
      this.selected = nodes[0];
    } else {
      this.choices = nodes;
      this.selected = null;
    }
    this.sheetOpen = true;
  }

  choose(n: SheetNode): void {
    this.selected = n;
  }

  backToChoices(): void {
    this.selected = null;
  }

  closeSheet(): void {
    this.sheetOpen = false;
    this.selected = null;
    this.choices = [];
  }

  private sheetNode(id: string): SheetNode {
    const node = this.nodes.get(id);
    const v = this.values.get(id);
    const code = node?.code || v?.nodeCode || v?.nodeName || '';
    const address = node?.address || (v?.nodeAddress || '').trim();
    const lat = node && Number.isFinite(node.lat) ? node.lat : v?.hasCoordinates ? Number(v.latitude) : NaN;
    const lon = node && Number.isFinite(node.lon) ? node.lon : v?.hasCoordinates ? Number(v.longitude) : NaN;
    const freshness = this.freshnessOf(id);
    const lastAt = this.lastAtOf(id);
    const channels = v?.channels || [];
    const metricCount = new Map<string, number>();
    for (const c of channels) metricCount.set(metricLabel(c.metricCode), (metricCount.get(metricLabel(c.metricCode)) || 0) + 1);
    return {
      id,
      label: address || code || '—',
      code: address ? code : '',
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      freshness,
      tone: FRESHNESS_TONE[freshness],
      statusText: MAP_FRESHNESS_TEXT[freshness],
      ago: lastAt ? timeAgoId(lastAt, this.now) : '',
      channels: sortSheetChannels(channels).map((c) => {
        const metric = metricLabel(c.metricCode);
        const num = c.value === null || c.value === undefined ? NaN : Number(c.value);
        return {
          channelId: c.channelId,
          // metric name; sensor label only when two channels share the metric
          name: (metricCount.get(metric) || 0) > 1 && c.sensorLabel ? `${metric} · ${c.sensorLabel}` : metric,
          value: Number.isFinite(num) ? formatIdNumber(num, this.decimals.get(c.channelId) ?? metricDecimals(c.metricCode)) : '—',
          unit: Number.isFinite(num) ? prettyUnit(c.unit) : '',
          status: c.status,
        };
      }),
    };
  }

  // ── Actions ──────────────────────────────────────────────

  get hasCoords(): boolean {
    return !!this.selected && this.selected.lat !== null && this.selected.lon !== null;
  }

  routeTo(): void {
    const n = this.selected;
    if (!n || n.lat === null || n.lon === null) return;
    window.open(directionsUrl(n.lat, n.lon), '_blank', 'noopener');
  }

  async copy(): Promise<void> {
    const text = this.shareTextOf(this.selected);
    if (!text) return;
    const ok = await copyText(text);
    this.showToast(ok ? 'Disalin' : 'Gagal menyalin');
  }

  async share(): Promise<void> {
    const text = this.shareTextOf(this.selected);
    if (!text) return;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: this.selected!.label, text });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // user cancelled
        // The user gesture is spent — a popup would be blocked; copy instead.
        const ok = await copyText(text);
        this.showToast(ok ? 'Disalin' : 'Gagal membagikan');
        return;
      }
    }
    window.open(whatsappShareUrl(text), '_blank', 'noopener');
  }

  openNode(n: SheetNode | null = this.selected): void {
    if (n) this.router.navigate(this.nodeLink(n.id));
  }

  /** Trend of the main channel (first after alarm-first / pressure-flow ordering). */
  openTrend(channelId?: string): void {
    const n = this.selected;
    if (!n) return;
    const ch = channelId || n.channels[0]?.channelId;
    if (ch) this.router.navigate([...this.nodeLink(n.id), 'channels', ch]);
    else this.openNode(n);
  }

  private shareTextOf(n: SheetNode | null): string {
    if (!n) return '';
    if (n.lat === null || n.lon === null) return n.code ? `${n.label} (${n.code})` : n.label;
    return nodeShareText(n.label, n.code, n.lat, n.lon);
  }

  // ── Map controls ─────────────────────────────────────────

  zoom(delta: number): void {
    this.mapCmp?.zoomBy(delta);
  }

  fitAll(): void {
    this.mapCmp?.resetView();
  }

  /** Toggle: first tap shows "Lokasi saya", next tap removes the dot. */
  locate(): void {
    if (this.userLocated) {
      this.userLocated = false;
      this.mapCmp?.setUserLocation(null);
      return;
    }
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      this.showToast('Lokasi tidak didukung di perangkat/peramban ini');
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => this.zone.run(() => {
        this.locating = false;
        const lonLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        this.userLocated = true;
        this.mapCmp?.setUserLocation(lonLat);
        this.mapCmp?.flyTo(lonLat, 15);
      }),
      (err) => this.zone.run(() => {
        this.locating = false;
        this.showToast(err.code === err.PERMISSION_DENIED
          ? 'Izin lokasi ditolak — aktifkan di pengaturan peramban'
          : err.code === err.TIMEOUT ? 'Lokasi tidak ditemukan (waktu habis)' : 'Lokasi tidak tersedia');
      }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }

  toggleFullscreen(): void {
    const el = this.rootEl.nativeElement;
    if (this.fullscreen) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (this.cssFullscreen) {
      this.cssFullscreen = false;
      setTimeout(() => { this.measure(); this.mapCmp?.updateSize(); });
      return;
    }
    if (el.requestFullscreen && document.fullscreenEnabled) {
      el.requestFullscreen().catch(() => this.zone.run(() => this.enterCssFullscreen()));
    } else {
      this.enterCssFullscreen();
    }
  }

  get isFull(): boolean {
    return this.fullscreen || this.cssFullscreen;
  }

  private enterCssFullscreen(): void {
    this.cssFullscreen = true;
    setTimeout(() => this.mapCmp?.updateSize());
  }

  // ── Layout ───────────────────────────────────────────────

  /**
   * Fill the viewport between the map's top and the bottom chrome. The bottom limit is the scroll
   * container's bottom (bottom nav is its sibling) minus its padding, or the top of any visible
   * `.m-bottomnav` above it — no hard-coded tab/app-bar heights (layout is being restructured).
   */
  private measure(): void {
    const el = this.rootEl?.nativeElement;
    if (!el || this.isFull) return;
    const viewportH = window.visualViewport?.height || window.innerHeight;
    const top = el.getBoundingClientRect().top;
    let limit = viewportH;
    const content = el.closest('.m-content') as HTMLElement | null;
    if (content) {
      const r = content.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(content).paddingBottom) || 0;
      limit = Math.min(limit, r.bottom - Math.min(pad, 12));
    } else {
      const css = parseFloat(getComputedStyle(el).getPropertyValue('--m-bottomnav-h')) || 64;
      limit = viewportH - css;
    }
    let navTop = viewportH;
    // In-project bottom nav (fixed): its real height is written to --m-bottomnav-h on .m-app.
    if (this.store || el.closest('.m-projshell')) {
      const app = (el.closest('.m-app') as HTMLElement | null) || document.documentElement;
      const navH = parseFloat(getComputedStyle(app).getPropertyValue('--m-bottomnav-h'));
      if (Number.isFinite(navH) && navH > 0) navTop = Math.min(navTop, viewportH - navH);
    }
    document.querySelectorAll<HTMLElement>('.m-bottomnav').forEach((nav) => {
      const r = nav.getBoundingClientRect();
      if (r.height > 0 && r.top > top) navTop = Math.min(navTop, r.top);
    });
    limit = Math.min(limit, navTop - 4);
    const landscape = viewportH <= 480;
    this.landscape = landscape;
    if (landscape && this.legendOpen && !this.legendTouched) this.legendOpen = false;
    this.fitChips();
    this.narrow = el.getBoundingClientRect().width < 480;
    this.height = fillHeight(limit, top, 0, landscape ? 160 : 280);
    const pad = landscape ? FIT_PAD_LANDSCAPE : FIT_PAD_PORTRAIT;
    if (pad !== this.fitPadding) this.fitPadding = pad;
    const insets = landscape ? INSETS_LANDSCAPE : INSETS_PORTRAIT;
    if (insets !== this.labelInsets) this.labelInsets = insets;
    this.sheetBottom = Math.max(0, Math.round(viewportH - navTop));
  }

  /** Compact chips whenever the full labels overflow the toolbar (any width), back when room returns. */
  private fitChips(): void {
    const row = this.rootEl?.nativeElement.querySelector<HTMLElement>('.pm-chips');
    if (!row) return;
    const w = row.clientWidth;
    if (!this.compactChips && row.scrollWidth > w + 1) {
      this.chipsOverflowAt = w;
      this.compactChips = true;
    } else if (this.compactChips && this.chipsOverflowAt && w > this.chipsOverflowAt + 60) {
      this.compactChips = false;
      setTimeout(() => this.fitChips()); // re-check with full labels
    }
  }

  private showToast(text: string): void {
    this.toast = text;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 2200);
  }

  /** Device page: in-project route when hosted at /mobile/p/:pid, else the old global one. */
  private nodeLink(nodeId: string): any[] {
    return this.pid ? ['/mobile/p', this.pid, 'nodes', nodeId] : ['/mobile/nodes', nodeId];
  }

  private readProjectId(): string | null {
    // `pid` (new /mobile/p/:pid/… routes) or `id` (/mobile/projects/:id/map) on the nearest ancestor.
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const p = r.snapshot.paramMap;
      const pid = p.get('pid');
      if (pid) {
        this.pid = pid;
        return pid;
      }
      const id = p.get('id');
      if (id) return id;
      r = r.parent;
    }
    return null;
  }
}

const NO_POINTS: MapPoint[] = [];

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : NaN;
}

/** Clipboard API, falling back to a hidden textarea + execCommand (http / older WebViews). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
