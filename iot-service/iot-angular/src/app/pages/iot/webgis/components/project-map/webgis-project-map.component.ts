import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges,
  ViewChild,
} from '@angular/core';
import { forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, map as rxMap, switchMap, takeUntil } from 'rxjs/operators';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature, { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { containsExtent, createEmpty, extend as extendExtent, isEmpty as isEmptyExtent, Extent } from 'ol/extent';
import { defaults as defaultInteractions } from 'ol/interaction';
import Zoom from 'ol/control/Zoom';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import {
  MapBasemap, MapLabelMode, MapPoint, MapPointStatus, MapSource, MapWidgetOptions, mapPointText, formatMapValue,
  mapDrawsSql, mapDrawsWebgis, mapDrawsSupportLayers, DEFAULT_MAP_OPTIONS,
} from '../../../widget-builder/utils/map-rows';
import { WebGisCoreGeoJsonService, WebGisLayersService } from 'src/sdk/core/services';
import { BasemapService } from '../../../../../services/basemap.service';
import { fetchAll } from '../../../../../shared/utils/fetch-all';
import {
  WEBGIS_CORE_LAYER_DEFS, WebgisLayerRow, filterSensorDataByTypes, unwrapData, webgisLayerColor,
  webgisSensorTypeLayerStyle, webgisSupportLayers, webgisSensorTypeColorMap,
} from '../../shared/webgis-layer-config';
import { createWebgisLayerStyle } from '../../shared/webgis-styles';
import { NodeSensorData, SensorLabelFormat, SensorLabelVariant } from '../sensor-labels/sensor-labels';
import type { Insets } from '../../shared/label-clusters';

/** Status → draw priority for label decluttering (features added first win the space). */
const STATUS_PRIORITY: Record<MapPointStatus, number> = { high: 0, low: 0, normal: 1, nothreshold: 2, nodata: 3 };
const BASE_LABEL_PX = 13;
const BASE_RADIUS_PX = 6;

/** Stacking: supporting layers (pipes, zones) < alerts < sensor types < SQL points < user location. */
const Z_SUPPORT = 1;
const Z_ALERTS = 50;
const Z_SENSORS = 100;
const Z_SQL_POINTS = 300;
const Z_USER = 400;

const ALERT_STYLE = WEBGIS_CORE_LAYER_DEFS.find((d) => d.code === 'alerts')!.style;

/** Option inputs: a change to any of them re-applies basemap/interactions/layers/styles (old `widget` change). */
const OPTION_INPUTS = [
  'source', 'showProjectLayers', 'basemap', 'showLabels', 'labelMode', 'interactive', 'showLegend',
  'zoomControl', 'markerScale', 'fitPadding', 'cardReserveMax',
];

interface MapPalette {
  normal: string;
  alarm: string;
  muted: string;
  text: string;
  halo: string;
  dark: boolean;
  font: string;
}

export interface MapLegendItem {
  name: string;
  color: string;
  shape: 'dot' | 'line' | 'area';
}

export interface ProjectMapLegend {
  items: MapLegendItem[];
  alertCount: number;
  alertColor: string;
}

/** Tap result: every node under the finger (co-located nodes → several), map coordinate in lon/lat. */
export interface ProjectMapSelection {
  nodeIds: string[];
  lonLat: [number, number];
}

/** One loaded WebGIS layer (geometry fetched once per component instance). */
interface WebgisLayerEntry {
  layer: VectorLayer<Feature>;
  /** Saved style (map_layer.style_json or the static core / sensor-type style) — restyled on scale. */
  rawStyle: any;
  /** Sensor-type / alert layers follow the node filter (`visibleNodeIds`); support layers don't. */
  nodeBound: boolean;
}

/**
 * Peta proyek bersama — satu mesin peta untuk widget Peta (Widget Builder / Monitor TV) dan tab Peta
 * mobile. Data & gaya = WebGIS (`webgis/shared/*`): setiap lapisan tipe sensor + kartu nilai
 * `<sensor-labels>` (digabung per kluster), Alarm, dan setiap lapisan operasional/kustom.
 * - source `webgis` (default) / `sql` (titik `points`) / `both` — lihat `utils/map-rows.ts`.
 * The OL map is created once; layer geometry loads once per (project, source); each `refreshNonce`
 * tick only reloads sensor values + alerts; a new `points` array only swaps the point features.
 */
@Component({
  selector: 'webgis-project-map',
  standalone: false,
  templateUrl: './webgis-project-map.component.html',
  styleUrls: ['./webgis-project-map.component.css'],
})
export class WebgisProjectMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Project whose WebGIS layers are drawn (null = none). */
  @Input() projectId: string | null = null;
  @Input() source: MapSource = DEFAULT_MAP_OPTIONS.source;
  @Input() showProjectLayers = DEFAULT_MAP_OPTIONS.showProjectLayers;
  @Input() basemap: MapBasemap = DEFAULT_MAP_OPTIONS.basemap;
  /** Sensor value cards (webgis) / point labels (sql). */
  @Input() showLabels = DEFAULT_MAP_OPTIONS.showLabels;
  @Input() labelMode: MapLabelMode = DEFAULT_MAP_OPTIONS.labelMode;
  @Input() interactive = DEFAULT_MAP_OPTIONS.interactive;
  @Input() showLegend = DEFAULT_MAP_OPTIONS.showLegend;
  /** Built-in zoom ± + "seluruh area" buttons (interactive maps). Mobile draws its own → false. */
  @Input() zoomControl = true;
  /** Text scale (TV screen-fit × dashboard "Ukuran huruf"); also scales the value cards. */
  @Input() fontScale = 1;
  /** Marker / WebGIS layer style scale; null = fontScale. Mobile uses bigger markers for touch. */
  @Input() markerScale: number | null = null;
  /** Tap hit tolerance in css px (around the marker radius). */
  @Input() hitTolerance = 6;
  /** Extra fit padding [top, right, bottom, left] for overlays the host draws over the map. */
  @Input() fitPadding: [number, number, number, number] | null = null;
  /**
   * Max share of the map width/height reserved for value cards when fitting (null = no cap, the
   * TV/desktop behaviour). Small phone maps cap it so the start view isn't zoomed out to one card.
   */
  @Input() cardReserveMax: number | null = null;
  /** Map area covered by host UI — value cards are placed outside it (null = none, TV/desktop). */
  @Input() labelInsets: Partial<Insets> | null = null;
  /**
   * Start view: if fewer value cards than this are visible after the first fit, zoom in by 0,5
   * (max 2×) as long as every node stays in view. null = off (TV/desktop).
   */
  @Input() minStartCards: number | null = null;
  /** Value-card look (`helios` = mobile HUD). Default = WebGIS look. */
  @Input() labelVariant: SensorLabelVariant = 'default';
  /** Value-card text formatting (precision, metric names, units). null = WebGIS text. */
  @Input() labelFormat: SensorLabelFormat | null = null;
  /** Only these nodes' markers, alerts and cards are drawn (null = all). */
  @Input() visibleNodeIds: ReadonlySet<string> | null = null;
  /** Points of source `sql` / `both` (normalized SQL rows). */
  @Input() points: MapPoint[] = [];
  /** Text when a WebGIS source has no project. */
  @Input() noProjectTitle = 'Dashboard belum terhubung ke proyek';
  @Input() noProjectHint = 'Hubungkan dashboard ke proyek agar lapisan WebGIS tampil, atau pilih sumber data SQL di Opsi Peta.';
  /** Refresh tick → reload sensor values & alerts (geometry stays cached). */
  @Input() refreshNonce = 0;

  /** Tap on marker(s) / value card → node ids; tap on empty map → null. Only fires when observed. */
  @Output() featureSelect = new EventEmitter<ProjectMapSelection | null>();
  /** Raw `sensor-channel-values` rows after every successful value load. */
  @Output() valuesChange = new EventEmitter<NodeSensorData[]>();
  /** Time of the last successful value load (each refresh). */
  @Output() loaded = new EventEmitter<Date>();
  /** Blocking load failure text (layer list / first value load), null once data arrived. Optional. */
  @Output() loadError = new EventEmitter<string | null>();
  /** Legend content (layers + alarm count) for hosts that draw their own legend. Optional. */
  @Output() legendChange = new EventEmitter<ProjectMapLegend>();

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltipEl', { static: true }) tooltipEl!: ElementRef<HTMLDivElement>;

  options: MapWidgetOptions = { ...DEFAULT_MAP_OPTIONS };
  readonly attribution: string;

  /** Map handed to <sensor-labels> (set a tick after creation to avoid NG0100). */
  labelMap: OlMap | null = null;
  sensorLabelData: NodeSensorData[] = [];
  /** sensorLabelData filtered by `visibleNodeIds` (stable reference → no needless overlay rebuilds). */
  shownLabelData: NodeSensorData[] = [];
  legendItems: MapLegendItem[] = [];

  /** Loading the project's layer list + geometry. */
  layersLoading = false;
  /** The WebGIS layer list itself failed (blocking when WebGIS layers are the content). */
  layersError: string | null = null;
  /** Some layers / the latest value refresh failed — previous data stays on the map. */
  layersWarn: string | null = null;
  /** Static load finished (even if nothing to draw). */
  layersReady = false;
  webgisFeatureCount = 0;
  /** Alert features currently drawn (legend "Alarm" entry). */
  alertCount = 0;
  readonly alertColor: string = ALERT_STYLE.fill;
  /** sensorTypeName → marker colour (row dots in grouped value cards). */
  sensorTypeColors: Record<string, string> = {};

  private map: OlMap | null = null;
  private baseLayer: TileLayer<XYZ> | null = null;
  private pointSource = new VectorSource<Feature<Point>>();
  private pointLayer: VectorLayer<Feature<Point>> | null = null;
  private webgisLayers: WebgisLayerEntry[] = [];
  private alertSource = new VectorSource<Feature>();
  private alertEntry: WebgisLayerEntry | null = null;
  private userSource = new VectorSource<Feature<Point>>();
  private sensorTypeNames = new Set<string>();
  /** nodeCode → nodeId (alerts only carry the node code). */
  private nodeIdByCode = new Map<string, string>();
  private palette: MapPalette | null = null;
  private styleCache = new Map<string, Style>();
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private resizeFrame = 0;
  private lastSignature = '';
  /** Interactive maps fit once more after the first sensor cards render (their size is part of the padding). */
  private labelsFitted = false;
  private layersSub: Subscription | null = null;
  private dynamicSub: Subscription | null = null;
  private loadedKey: string | null = null;
  private loadedCore = false;
  private failedLayers = 0;
  private dynamicFailed: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private zone: NgZone,
    private host: ElementRef<HTMLElement>,
    private layersService: WebGisLayersService,
    private coreGeoJsonService: WebGisCoreGeoJsonService,
    private basemapService: BasemapService,
  ) {
    this.attribution = basemapService.attribution;
  }

  // ── Template helpers ─────────────────────────────────────

  get drawsSql(): boolean {
    return mapDrawsSql(this.options);
  }

  get drawsWebgis(): boolean {
    return mapDrawsWebgis(this.options);
  }

  /** WebGIS source but no project. */
  get needsProject(): boolean {
    return this.drawsWebgis && !this.projectId;
  }

  get sensorLabelsVisible(): boolean {
    return this.drawsWebgis && this.options.showLabels && !!this.projectId;
  }

  /** Nothing at all to show once loading finished (WebGIS sources). */
  get webgisEmpty(): boolean {
    return this.drawsWebgis && !!this.projectId && this.layersReady && !this.layersError
      && this.webgisFeatureCount === 0 && this.sensorLabelData.length === 0
      && !(this.drawsSql && this.points.length > 0);
  }

  // ── Lifecycle ────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    const optionsChanged = OPTION_INPUTS.some((k) => !!changes[k]);
    if (optionsChanged || !this.map) {
      this.options = {
        source: this.source,
        showProjectLayers: this.showProjectLayers,
        basemap: this.basemap,
        showLabels: this.showLabels,
        labelMode: this.labelMode,
        interactive: this.interactive,
        showLegend: this.showLegend,
      };
    }
    if (changes['visibleNodeIds']) this.updateShownLabels();
    if (!this.map) return; // first pass handled in ngAfterViewInit

    if (optionsChanged) {
      this.applyBasemap();
      this.applyInteractions();
      this.pointLayer?.setVisible(this.drawsSql);
    }
    if (optionsChanged || changes['projectId']) {
      this.syncWebgis();
    }
    if (changes['fontScale'] || optionsChanged) {
      this.styleCache.clear();
      this.pointLayer?.changed();
      this.restyleWebgis();
    }
    if (changes['visibleNodeIds']) {
      this.zone.runOutsideAngular(() => {
        for (const e of this.webgisLayers) if (e.nodeBound) e.layer.changed();
        this.alertEntry?.layer.changed();
      });
    }
    if (changes['refreshNonce'] && !changes['refreshNonce'].firstChange) {
      this.loadDynamic();
    }
    if (changes['points']) {
      this.updatePoints(false);
    } else if (changes['fontScale'] || optionsChanged) {
      this.fit();
    }
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.createMap());
    // next tick: these flip template bindings (layersLoading, labelMap)
    setTimeout(() => {
      this.labelMap = this.map;
      this.syncWebgis();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layersSub?.unsubscribe();
    this.dynamicSub?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    this.labelMap = null;
    if (this.map) {
      this.map.setTarget(undefined);
      this.map.dispose();
      this.map = null;
    }
  }

  // ── Public API ───────────────────────────────────────────

  /** Reload everything (layer list, geometry, values) — "Coba lagi". */
  retryLayers(): void {
    this.loadedKey = null;
    this.syncWebgis();
  }

  /** Reload only sensor values + alerts now. */
  reloadValues(): void {
    this.loadDynamic();
  }

  /** Back to the auto-fit view ("Tampilkan seluruh area"). */
  resetView(): void {
    this.zone.runOutsideAngular(() => this.fit(250));
  }

  zoomBy(delta: number): void {
    const view = this.map?.getView();
    const zoom = view?.getZoom();
    if (!view || zoom === undefined) return;
    view.animate({ zoom: Math.max(2, Math.min(19, zoom + delta)), duration: 200 });
  }

  /** Centre on a lon/lat; zooms in to at least `minZoom`. */
  flyTo(lonLat: [number, number], minZoom = 16): void {
    const view = this.map?.getView();
    if (!view) return;
    view.animate({ center: fromLonLat(lonLat), zoom: Math.max(view.getZoom() ?? 0, minZoom), duration: 350 });
  }

  /** Blue "Lokasi saya" dot (null = remove). */
  setUserLocation(lonLat: [number, number] | null): void {
    this.zone.runOutsideAngular(() => {
      this.userSource.clear(true);
      if (lonLat) this.userSource.addFeature(new Feature({ geometry: new Point(fromLonLat(lonLat)) }));
    });
  }

  /** Recompute size after the host changed size without a resize observer tick (e.g. fullscreen). */
  updateSize(): void {
    this.map?.updateSize();
  }

  // ── Map setup ────────────────────────────────────────────

  private createMap(): void {
    this.palette = this.readPalette();
    const baseLayer = new TileLayer({ source: new XYZ({}), zIndex: 0 });
    const pointLayer = new VectorLayer<Feature<Point>>({
      source: this.pointSource,
      style: (f) => this.pointStyle(f as Feature<Point>),
      declutter: true,
      zIndex: Z_SQL_POINTS,
      visible: this.drawsSql,
    });
    const userLayer = new VectorLayer<Feature<Point>>({
      source: this.userSource,
      style: [
        new Style({ image: new CircleStyle({ radius: 16, fill: new Fill({ color: 'rgba(59,130,246,0.22)' }) }) }),
        new Style({
          image: new CircleStyle({
            radius: 7, fill: new Fill({ color: '#3b82f6' }), stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          }),
        }),
      ],
      zIndex: Z_USER,
    });
    this.baseLayer = baseLayer;
    this.pointLayer = pointLayer;
    this.map = new OlMap({
      target: this.mapEl.nativeElement,
      layers: [baseLayer, pointLayer, userLayer],
      controls: [],
      interactions: [],
      view: new View({ center: fromLonLat([117, -0.5]), zoom: 5, maxZoom: 19 }),
    });
    this.applyBasemap();
    this.applyInteractions();
    this.updatePoints(true);

    this.map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const f = this.map?.forEachFeatureAtPixel(evt.pixel, (feat) => feat, {
        layerFilter: (l) => l === this.pointLayer && l.getVisible(), hitTolerance: 4,
      }) as Feature<Point> | undefined;
      this.showTooltip(f?.get('point') as MapPoint | undefined, evt.pixel as [number, number]);
    });

    this.map.on('singleclick', (evt) => {
      if (!this.featureSelect.observed || !this.map) return;
      const lonLat = toLonLat(evt.coordinate) as [number, number];
      const nodeIds = this.nodesAt(evt.pixel, evt.originalEvent?.target as HTMLElement | null);
      this.zone.run(() => this.featureSelect.emit(nodeIds.length ? { nodeIds, lonLat } : null));
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = 0;
        this.map?.updateSize();
        this.fit();
      });
    });
    this.resizeObserver.observe(this.host.nativeElement);

    this.themeObserver = new MutationObserver(() => {
      this.palette = this.readPalette();
      this.styleCache.clear();
      this.applyBasemap();
      this.pointLayer?.changed();
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
  }

  /** Node ids under a tap: a value card (its member nodes) or markers/alerts within hitTolerance. */
  private nodesAt(pixel: number[], target: HTMLElement | null): string[] {
    const card = target?.closest?.('.sensor-label-container') as HTMLElement | null;
    const fromCard = (card?.dataset['memberIds'] || '').split(',').filter(Boolean);
    if (fromCard.length) return fromCard;

    const ids: string[] = [];
    const nodeLayers = new Set<any>(this.webgisLayers.filter((e) => e.nodeBound).map((e) => e.layer));
    if (this.alertEntry) nodeLayers.add(this.alertEntry.layer);
    this.map?.forEachFeatureAtPixel(pixel, (f) => {
      const id = this.nodeIdOf(f);
      if (id && !ids.includes(id) && this.nodeVisible(id)) ids.push(id);
      return undefined; // keep collecting (co-located nodes)
    }, { layerFilter: (l) => nodeLayers.has(l) && l.getVisible(), hitTolerance: this.hitTolerance });
    // Host points that carry a node id (mobile Node view).
    this.map?.forEachFeatureAtPixel(pixel, (f) => {
      const id = (f.get('point') as MapPoint | undefined)?.id;
      if (id && !ids.includes(id)) ids.push(id);
      return undefined;
    }, { layerFilter: (l) => l === this.pointLayer && l.getVisible(), hitTolerance: this.hitTolerance });
    return ids;
  }

  private nodeIdOf(f: FeatureLike): string | null {
    const id = f.get('nodeId');
    if (id) return String(id);
    const code = f.get('nodeCode');
    return code ? this.nodeIdByCode.get(String(code)) || null : null;
  }

  private nodeVisible(nodeId: string | null): boolean {
    return !this.visibleNodeIds || (!!nodeId && this.visibleNodeIds.has(nodeId));
  }

  private updateShownLabels(): void {
    const set = this.visibleNodeIds;
    this.shownLabelData = set ? this.sensorLabelData.filter((n) => set.has(n.nodeId)) : this.sensorLabelData;
  }

  private applyBasemap(): void {
    if (!this.baseLayer) return;
    const mode = this.options.basemap;
    if (mode === 'none') {
      this.baseLayer.setVisible(false);
      return;
    }
    const dark = mode === 'dark' || (mode === 'auto' && !!this.palette?.dark);
    const url = this.basemapService.carto(dark ? 'dark_all' : 'light_all');
    const source = this.baseLayer.getSource();
    if (source && source.getUrls()?.[0] !== url) source.setUrl(url);
    this.baseLayer.setVisible(true);
  }

  private applyInteractions(): void {
    if (!this.map) return;
    const interactions = this.map.getInteractions();
    interactions.clear();
    const controls = this.map.getControls();
    controls.clear();
    if (this.options.interactive) {
      defaultInteractions().forEach((i) => interactions.push(i));
      if (this.zoomControl) controls.push(new Zoom({ zoomInTipLabel: 'Perbesar', zoomOutTipLabel: 'Perkecil' }));
    }
  }

  // ── SQL points ───────────────────────────────────────────

  private updatePoints(forceFit: boolean): void {
    const sorted = [...(this.points || [])].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
    const features = sorted.map((p) => {
      const f = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) });
      f.set('point', p);
      return f;
    });
    this.pointSource.clear(true);
    this.pointSource.addFeatures(features);

    // Interactive maps keep the user's pan/zoom unless the set of locations changed.
    const signature = sorted.map((p) => `${p.lat},${p.lon}`).sort().join('|');
    const changed = signature !== this.lastSignature;
    this.lastSignature = signature;
    if (forceFit || (this.drawsSql && changed) || !this.options.interactive) this.fit();
  }

  /**
   * `sql`: fit to the points (or, with none, to the project layers).
   * `webgis` / `both`: fit to everything drawn (sensors, alerts, supporting layers, SQL points).
   */
  private fit(duration = 0): void {
    const map = this.map;
    if (!map) return;
    const size = map.getSize();
    if (!size || size[0] < 10 || size[1] < 10) return;

    let extent: Extent = createEmpty();
    const addSource = (src: VectorSource<any> | null | undefined) => {
      if (src && src.getFeatures().length) extendExtent(extent, src.getExtent());
    };
    if (this.drawsSql && !this.drawsWebgis && this.pointSource.getFeatures().length > 0) {
      extent = this.pointSource.getExtent().slice() as Extent;
    } else {
      if (this.drawsSql) addSource(this.pointSource);
      for (const e of this.webgisLayers) addSource(e.layer.getSource());
      addSource(this.alertSource);
    }
    if (isEmptyExtent(extent)) return; // a single point ([x,y,x,y]) is not empty

    const s = this.fontScale || 1;
    const pad = Math.round(28 * s);
    let left = pad;
    // SQL labels are drawn right of the marker → more room on the right when they are on.
    let right = this.drawsSql && this.options.showLabels
      ? Math.min(Math.round(size[0] * 0.3), Math.round(120 * s)) : pad;
    let top = pad;
    // WebGIS sensor value cards are centred above the node → half a card on each side, a whole card on top.
    if (this.sensorLabelsVisible && this.sensorLabelData.length > 0) {
      const card = this.sensorCardSize(s);
      let side = Math.ceil(card.w / 2 + 8 * s);
      // overlay offset 15 + pointer 5 (sensor-labels) + card + margin
      let cardTop = Math.ceil(card.h + 28 * s);
      if (this.cardReserveMax !== null) {
        side = Math.min(side, Math.floor(size[0] * this.cardReserveMax));
        cardTop = Math.min(cardTop, Math.floor(size[1] * this.cardReserveMax));
      }
      left = Math.max(left, side);
      right = Math.max(right, side);
      top = Math.max(top, cardTop);
    }
    // Zoom / reset buttons (top-right column, 8 + 28 + 8 px × scale) must not cover cards or points.
    if (this.options.interactive && this.zoomControl) right += Math.round(44 * s);
    let bottom = pad + (this.legendCount() > 0 ? Math.round(36 * s) : 0);
    if (this.fitPadding) {
      top += this.fitPadding[0];
      right += this.fitPadding[1];
      bottom += this.fitPadding[2];
      left += this.fitPadding[3];
    }
    // Tiny cells: never let padding eat the whole view (OL would zoom out to the world).
    const fitAxis = (a: number, b: number, total: number): [number, number] => {
      const max = total * 0.8;
      return a + b > max ? [Math.floor(a * max / (a + b)), Math.floor(b * max / (a + b))] : [a, b];
    };
    [left, right] = fitAxis(left, right, size[0]);
    [top, bottom] = fitAxis(top, bottom, size[1]);
    map.getView().fit(extent, {
      padding: [top, right, bottom, left],
      maxZoom: 16,
      duration,
    });
  }

  /** See `minStartCards`: after the cards were laid out, zoom in a step while too few are visible. */
  private zoomForCards(step: number): void {
    const want = this.minStartCards;
    if (!want || step >= 2) return;
    setTimeout(() => this.zone.runOutsideAngular(() => {
      const map = this.map;
      const view = map?.getView();
      const size = map?.getSize();
      const center = view?.getCenter();
      const zoom = view?.getZoom();
      if (!map || !view || !size || !center || zoom === undefined) return;
      const box = this.host.nativeElement.getBoundingClientRect();
      let visible = 0;
      this.host.nativeElement.querySelectorAll<HTMLElement>('.sensor-label-card').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom) visible++;
      });
      if (visible >= want) return;
      let data: Extent = createEmpty();
      for (const e of this.webgisLayers) {
        if (e.nodeBound && e.layer.getSource()?.getFeatures().length) extendExtent(data, e.layer.getSource()!.getExtent());
      }
      if (isEmptyExtent(data)) return;
      const res = view.getResolutionForZoom(zoom + 0.5);
      const hw = (size[0] * res) / 2;
      const hh = (size[1] * res) / 2;
      if (!containsExtent([center[0] - hw, center[1] - hh, center[0] + hw, center[1] + hh], data)) return;
      view.animate({ zoom: zoom + 0.5, duration: 200 }, () => this.zoomForCards(step + 1));
    }), 450);
  }

  /**
   * Largest rendered sensor value card (css px; offsetWidth ignores transforms). Before the cards
   * exist, the SensorLabelsComponent max size at this scale (max-width 140 + padding ≈ 148 × ≈ 45).
   */
  private sensorCardSize(s: number): { w: number; h: number } {
    let w = 0;
    let h = 0;
    this.host.nativeElement.querySelectorAll<HTMLElement>('.sensor-label-card').forEach((el) => {
      w = Math.max(w, el.offsetWidth);
      h = Math.max(h, el.offsetHeight);
    });
    return w > 0 && h > 0 ? { w, h } : { w: 148 * s, h: 45 * s };
  }

  private legendCount(): number {
    return this.legendItems.length + this.alertCount + (this.drawsSql ? 1 : 0);
  }

  private pointStyle(f: Feature<Point>): Style {
    const p = f.get('point') as MapPoint;
    const pal = this.palette || this.readPalette();
    const text = this.options.showLabels ? mapPointText(p, this.options.labelMode) : '';
    const key = `${p.status}|${text}|${p.color || ''}|${p.z ?? ''}`;
    const hit = this.styleCache.get(key);
    if (hit) return hit;

    const s = this.fontScale || 1;
    const radius = BASE_RADIUS_PX * s;
    let image: CircleStyle;
    if (p.status === 'nodata') {
      image = new CircleStyle({
        radius,
        fill: new Fill({ color: 'rgba(0,0,0,0)' }),
        stroke: new Stroke({ color: pal.muted, width: Math.max(1.5, 2 * s) }),
        declutterMode: 'obstacle',
      });
    } else {
      const color = p.color
        || (p.status === 'normal' ? pal.normal : p.status === 'nothreshold' ? pal.muted : pal.alarm);
      image = new CircleStyle({
        radius,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: pal.halo, width: Math.max(1, 1.5 * s) }),
        declutterMode: 'obstacle',
      });
    }
    const style = new Style({
      image,
      zIndex: p.z,
      text: text
        ? new Text({
            text,
            font: `600 ${Math.round(BASE_LABEL_PX * s * 10) / 10}px ${pal.font}`,
            fill: new Fill({ color: p.status === 'high' || p.status === 'low' ? pal.alarm : pal.text }),
            stroke: new Stroke({ color: pal.halo, width: Math.max(2, 3 * s) }),
            textAlign: 'left',
            textBaseline: 'middle',
            offsetX: radius + 4 * s,
            overflow: false,
          })
        : undefined,
    });
    this.styleCache.set(key, style);
    return style;
  }

  private showTooltip(p: MapPoint | undefined, pixel: [number, number]): void {
    const el = this.tooltipEl?.nativeElement;
    if (!el) return;
    if (!p) {
      el.style.display = 'none';
      return;
    }
    const parts = [p.label || 'Titik'];
    const val = formatMapValue(p);
    parts.push(val || 'Tidak ada data');
    if (p.time) {
      parts.push(p.time.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }));
    }
    el.textContent = parts.join(' · ');
    el.style.display = 'block';
    el.style.left = `${pixel[0] + 12}px`;
    el.style.top = `${pixel[1] + 12}px`;
  }

  // ── WebGIS layers (same data & styles as the WebGIS page) ──

  /** (Re)load the project's WebGIS layers when project / what-to-draw changed. Geometry is cached per key. */
  private syncWebgis(): void {
    const wantCore = this.drawsWebgis;
    const wantSupport = mapDrawsSupportLayers(this.options);
    const projectId = this.projectId;
    const key = projectId && (wantCore || wantSupport) ? `${projectId}|${wantCore ? 1 : 0}|${wantSupport ? 1 : 0}` : null;
    if (key === this.loadedKey) return;

    this.layersSub?.unsubscribe();
    this.dynamicSub?.unsubscribe();
    this.clearWebgisLayers();
    this.loadedKey = key;
    this.loadedCore = wantCore;
    this.layersError = null;
    this.layersWarn = null;
    this.failedLayers = 0;
    this.dynamicFailed = null;
    this.layersReady = false;
    if (!key || !projectId) {
      this.layersLoading = false;
      return;
    }
    this.layersLoading = true;

    const types$: Observable<any[]> = wantCore
      ? this.coreGeoJsonService.coreGeoJsonControllerGetSensorTypes({ projectId }).pipe(rxMap((b) => asArray(b)))
      : of([]);
    const rows$: Observable<WebgisLayerRow[]> = wantSupport
      ? fetchAll((p) => this.layersService.layersControllerFindAll$Response({ projectId, ...p }))
      : of([]);

    this.layersSub = forkJoin({ types: types$, rows: rows$ }).pipe(
      switchMap(({ types, rows }) => {
        const support = webgisSupportLayers(rows);
        const typeGeo = types.map((t) =>
          this.coreGeoJsonService.coreGeoJsonControllerGetSensorChannelsGeoJson({ projectId, sensorTypeId: t.id })
            .pipe(rxMap((g) => unwrapData(g)), catchError(() => of(null))));
        const supportGeo = support.map((l) =>
          this.layersService.layersControllerGetGeoJson({ id: l.idLayer })
            .pipe(rxMap((g) => unwrapData(g)), catchError(() => of(null))));
        return forkJoin({
          typeGeos: typeGeo.length ? forkJoin(typeGeo) : of([] as any[]),
          supportGeos: supportGeo.length ? forkJoin(supportGeo) : of([] as any[]),
        }).pipe(rxMap((r) => ({ types, support, ...r })));
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: ({ types, support, typeGeos, supportGeos }) => {
        const legend: MapLegendItem[] = [];
        let failed = 0;
        this.zone.runOutsideAngular(() => {
          support.forEach((l, i) => {
            const ok = this.addWebgisLayer(supportGeos[i], l.styleJson || {}, Z_SUPPORT + i, false);
            if (!ok) { failed++; return; }
            const g = String(l.geometryType || '').toLowerCase();
            legend.push({
              name: l.layerName,
              color: webgisLayerColor(l.styleJson || {}, l.layerType),
              shape: g.includes('line') ? 'line' : g.includes('polygon') ? 'area' : 'dot',
            });
          });
          if (wantCore) {
            this.alertEntry = this.addWebgisSource(this.alertSource, ALERT_STYLE, Z_ALERTS, true);
            types.forEach((t, i) => {
              const style = webgisSensorTypeLayerStyle(i);
              if (!this.addWebgisLayer(typeGeos[i], style, Z_SENSORS + i, true)) { failed++; return; }
              legend.push({ name: t.name || t.label || 'Sensor', color: style.fill, shape: 'dot' });
            });
          }
        });
        this.sensorTypeNames = new Set(types.map((t) => t.name).filter(Boolean));
        this.sensorTypeColors = webgisSensorTypeColorMap(types);
        this.failedLayers = failed;
        this.legendItems = legend;
        this.emitLegend();
        this.layersLoading = false;
        this.layersReady = true;
        this.webgisFeatureCount = this.countWebgisFeatures();
        this.updateWarn();
        this.zone.runOutsideAngular(() => this.fit());
        if (wantCore) this.loadDynamic();
      },
      error: () => {
        this.layersLoading = false;
        this.layersError = wantCore ? 'Lapisan WebGIS proyek gagal dimuat' : 'Lapisan peta proyek gagal dimuat';
        this.loadedKey = null; // allow retry
        this.loadError.emit(this.layersError);
      },
    });
  }

  /** Sensor values (cards) + alerts — on load and on every refresh tick. */
  private loadDynamic(): void {
    const projectId = this.projectId;
    if (!projectId || !this.loadedCore || !this.layersReady) return;
    if (this.dynamicSub && !this.dynamicSub.closed) return; // previous refresh still running

    this.dynamicSub = forkJoin({
      values: this.coreGeoJsonService.coreGeoJsonControllerGetSensorChannelValues({ projectId })
        .pipe(rxMap((b) => asArray(b)), catchError(() => of(null))),
      alerts: this.coreGeoJsonService.coreGeoJsonControllerGetAlertsGeoJson({ projectId })
        .pipe(rxMap((g) => unwrapData(g)), catchError(() => of(null))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ values, alerts }) => {
      const problems: string[] = [];
      if (values) {
        const rows = values as NodeSensorData[];
        this.nodeIdByCode = new Map(rows.filter((n) => n.nodeCode).map((n) => [n.nodeCode, n.nodeId] as [string, string]));
        this.sensorLabelData = filterSensorDataByTypes(rows, this.sensorTypeNames);
        this.updateShownLabels();
        this.valuesChange.emit(rows);
        this.loaded.emit(new Date());
        this.loadError.emit(null);
      } else {
        problems.push('nilai sensor');
        this.loadError.emit('Nilai sensor gagal dimuat');
      }
      if (alerts) {
        const features = readFeatures(alerts);
        if (features) {
          this.zone.runOutsideAngular(() => {
            this.alertSource.clear(true);
            this.alertSource.addFeatures(features);
          });
        } else {
          problems.push('alarm');
        }
      } else {
        problems.push('alarm');
      }
      const alertN = this.alertSource.getFeatures().length;
      if (alertN !== this.alertCount) {
        this.alertCount = alertN;
        this.emitLegend();
      }
      this.dynamicFailed = problems.length ? `Gagal memperbarui ${problems.join(' & ')}` : null;
      this.webgisFeatureCount = this.countWebgisFeatures();
      this.updateWarn();
      // Fit after change detection rendered the cards so their measured size drives the padding.
      // Interactive maps keep the user's view, except once when the first cards appear.
      const firstCards = !this.labelsFitted && this.sensorLabelData.length > 0;
      if (firstCards) this.labelsFitted = true;
      if (!this.options.interactive || firstCards) {
        setTimeout(() => this.zone.runOutsideAngular(() => {
          this.fit();
          if (firstCards) this.zoomForCards(0);
        }));
      }
    });
  }

  private emitLegend(): void {
    if (this.legendChange.observed) {
      this.legendChange.emit({ items: this.legendItems, alertCount: this.alertCount, alertColor: this.alertColor });
    }
  }

  /** Card distance beside/below a marker: bigger markers (markerScale) need more room. */
  get labelClear(): number | null {
    return this.markerScale === null ? null : Math.round(7 * this.markerScale + 6);
  }

  private updateWarn(): void {
    const parts: string[] = [];
    if (this.failedLayers > 0) parts.push(`${this.failedLayers} lapisan peta gagal dimuat`);
    if (this.dynamicFailed) parts.push(this.dynamicFailed);
    this.layersWarn = parts.length ? parts.join(' · ') : null;
  }

  private addWebgisLayer(geo: any, rawStyle: any, zIndex: number, nodeBound: boolean): boolean {
    const features = geo ? readFeatures(geo) : null;
    if (!features) return false;
    this.addWebgisSource(new VectorSource<Feature>({ features }), rawStyle, zIndex, nodeBound);
    return true;
  }

  private addWebgisSource(
    source: VectorSource<Feature>, rawStyle: any, zIndex: number, nodeBound: boolean,
  ): WebgisLayerEntry | null {
    if (!this.map) return null;
    const entry: WebgisLayerEntry = { layer: null as any, rawStyle, nodeBound };
    entry.layer = new VectorLayer<Feature>({
      source,
      style: this.webgisStyle(entry),
      zIndex,
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });
    if (source !== this.alertSource) this.webgisLayers.push(entry);
    this.map.addLayer(entry.layer);
    return entry;
  }

  /** Shared WebGIS style; node-bound layers hide features of nodes outside `visibleNodeIds`. */
  private webgisStyle(entry: WebgisLayerEntry): any {
    const base = createWebgisLayerStyle(
      entry.rawStyle, () => this.map?.getView().getZoom(), this.markerScale ?? (this.fontScale || 1));
    if (!entry.nodeBound) return base;
    return (f: FeatureLike, res: number) => {
      if (this.visibleNodeIds && !this.nodeVisible(this.nodeIdOf(f))) return null;
      return typeof base === 'function' ? base(f, res) : base;
    };
  }

  private restyleWebgis(): void {
    for (const e of this.webgisLayers) e.layer.setStyle(this.webgisStyle(e));
    if (this.alertEntry) this.alertEntry.layer.setStyle(this.webgisStyle(this.alertEntry));
  }

  private clearWebgisLayers(): void {
    for (const e of this.webgisLayers) this.map?.removeLayer(e.layer);
    if (this.alertEntry) this.map?.removeLayer(this.alertEntry.layer);
    this.webgisLayers = [];
    this.alertEntry = null;
    this.alertSource.clear(true);
    this.sensorLabelData = [];
    this.shownLabelData = [];
    this.labelsFitted = false;
    this.sensorTypeNames = new Set();
    this.sensorTypeColors = {};
    this.legendItems = [];
    this.webgisFeatureCount = 0;
    this.alertCount = 0;
  }

  private countWebgisFeatures(): number {
    let n = this.alertSource.getFeatures().length;
    for (const e of this.webgisLayers) n += e.layer.getSource()?.getFeatures().length || 0;
    return n;
  }

  // ── Theme ────────────────────────────────────────────────

  private readPalette(): MapPalette {
    const root = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => root.getPropertyValue(name).trim() || fallback;
    const dark = (document.documentElement.getAttribute('data-bs-theme') || 'dark') !== 'light';
    return {
      normal: v('--bs-success', '#22c55e'),
      alarm: v('--bs-danger', '#ef4444'),
      muted: dark ? '#94a3b8' : '#64748b',
      text: v('--bs-body-color', dark ? '#e2e8f0' : '#1e293b'),
      halo: v('--bs-body-bg', dark ? '#0f172a' : '#ffffff'),
      dark,
      font: getComputedStyle(document.body).fontFamily || 'sans-serif',
    };
  }
}

function asArray(body: any): any[] {
  const v = unwrapData(body);
  return Array.isArray(v) ? v : [];
}

/** GeoJSON → features in map projection; null when the payload is not valid GeoJSON. */
function readFeatures(geo: any): Feature[] | null {
  try {
    return new GeoJSON().readFeatures(geo, { featureProjection: 'EPSG:3857' }) as Feature[];
  } catch {
    return null;
  }
}
