import {
  AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, ViewChild,
} from '@angular/core';
import { forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, map as rxMap, switchMap, takeUntil } from 'rxjs/operators';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
import { createEmpty, extend as extendExtent, isEmpty as isEmptyExtent, Extent } from 'ol/extent';
import { defaults as defaultInteractions } from 'ol/interaction';
import Zoom from 'ol/control/Zoom';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import { Widget } from '../../../models/widget.models';
import {
  MapPoint, MapPointStatus, MapWidgetOptions, normalizeMapRows, readMapOptions, mapPointText, formatMapValue,
  mapDrawsSql, mapDrawsWebgis, mapDrawsSupportLayers,
} from '../../../utils/map-rows';
import { WebGisCoreGeoJsonService, WebGisLayersService } from 'src/sdk/core/services';
import { BasemapService } from '../../../../../../services/basemap.service';
import { fetchAll } from '../../../../../../shared/utils/fetch-all';
import {
  WEBGIS_CORE_LAYER_DEFS, WebgisLayerRow, filterSensorDataByTypes, unwrapData, webgisLayerColor,
  webgisSensorTypeLayerStyle, webgisSupportLayers,
} from '../../../../webgis/shared/webgis-layer-config';
import { createWebgisLayerStyle } from '../../../../webgis/shared/webgis-styles';
import { NodeSensorData } from '../../../../webgis/components/sensor-labels/sensor-labels';

/** Status → draw priority for label decluttering (features added first win the space). */
const STATUS_PRIORITY: Record<MapPointStatus, number> = { high: 0, low: 0, normal: 1, nothreshold: 2, nodata: 3 };
const BASE_LABEL_PX = 13;
const BASE_RADIUS_PX = 6;

/** Stacking: supporting layers (pipes, zones) < alerts < sensor types < SQL points. */
const Z_SUPPORT = 1;
const Z_ALERTS = 50;
const Z_SENSORS = 100;
const Z_SQL_POINTS = 300;

const ALERT_STYLE = WEBGIS_CORE_LAYER_DEFS.find((d) => d.code === 'alerts')!.style;

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

/** One loaded WebGIS layer (geometry fetched once per widget instance). */
interface WebgisLayerEntry {
  layer: VectorLayer<Feature>;
  /** Saved style (map_layer.style_json or the static core / sensor-type style) — restyled on fontScale. */
  rawStyle: any;
}

/**
 * Peta widget.
 * - source `webgis` (default): the project's WebGIS map — every sensor-type layer with its value cards
 *   (`<sensor-labels>`, same as WebGIS), alerts and every operational/custom layer, all drawn with the
 *   shared WebGIS styles (`webgis/shared/*`). Core "Nodes" layer is not drawn.
 * - source `sql`: SQL rows (lat, lon, label, value, unit, status, time; see utils/map-rows.ts) as
 *   status-coloured circles (+ project layers when `showProjectLayers`).
 * - source `both`: WebGIS layers + SQL points.
 * The OL map is created once; layer geometry loads once; each dashboard refresh (`refreshNonce`)
 * only reloads sensor values + alerts, and new SQL data only swaps the point features.
 */
@Component({
  selector: 'app-map-widget',
  standalone: false,
  templateUrl: './map-widget.component.html',
  styleUrls: ['./map-widget.component.css'],
})
export class MapWidgetComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() containerWidth = 0;
  @Input() containerHeight = 0;
  /** Text scale (TV screen-fit × dashboard "Ukuran huruf"). */
  @Input() fontScale = 1;
  /** Dashboard project → its WebGIS layers (null = none). */
  @Input() projectId: string | null = null;
  /** Dashboard refresh tick → reload sensor values & alerts (geometry stays cached). */
  @Input() refreshNonce = 0;

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltipEl', { static: true }) tooltipEl!: ElementRef<HTMLDivElement>;

  points: MapPoint[] = [];
  options: MapWidgetOptions = readMapOptions(undefined);
  readonly attribution: string;

  /** Map handed to <sensor-labels> (set a tick after creation to avoid NG0100). */
  labelMap: OlMap | null = null;
  sensorLabelData: NodeSensorData[] = [];
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

  private map: OlMap | null = null;
  private baseLayer: TileLayer<XYZ> | null = null;
  private pointSource = new VectorSource<Feature<Point>>();
  private pointLayer: VectorLayer<Feature<Point>> | null = null;
  private webgisLayers: WebgisLayerEntry[] = [];
  private alertSource = new VectorSource<Feature>();
  private alertEntry: WebgisLayerEntry | null = null;
  private sensorTypeNames = new Set<string>();
  private palette: MapPalette | null = null;
  private styleCache = new Map<string, Style>();
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private resizeFrame = 0;
  private lastSignature = '';
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
    private basemap: BasemapService,
  ) {
    this.attribution = basemap.attribution;
  }

  // ── Template helpers ─────────────────────────────────────

  get drawsSql(): boolean {
    return mapDrawsSql(this.options);
  }

  get drawsWebgis(): boolean {
    return mapDrawsWebgis(this.options);
  }

  /** WebGIS source but the dashboard has no project. */
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
    if (changes['widget']) {
      this.options = readMapOptions((this.widget?.config as any)?.display?.mapOptions);
    }
    if (changes['data']) {
      this.points = normalizeMapRows(this.data);
    }
    if (!this.map) return; // first pass handled in ngAfterViewInit

    if (changes['widget']) {
      this.applyBasemap();
      this.applyInteractions();
      this.pointLayer?.setVisible(this.drawsSql);
    }
    if (changes['widget'] || changes['projectId']) {
      this.syncWebgis();
    }
    if (changes['fontScale'] || changes['widget']) {
      this.styleCache.clear();
      this.pointLayer?.changed();
      this.restyleWebgis();
    }
    if (changes['refreshNonce'] && !changes['refreshNonce'].firstChange) {
      this.loadDynamic();
    }
    if (changes['data']) {
      this.updatePoints(false);
    } else if (changes['fontScale'] || changes['widget']) {
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

  retryLayers(): void {
    this.loadedKey = null;
    this.syncWebgis();
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
    this.baseLayer = baseLayer;
    this.pointLayer = pointLayer;
    this.map = new OlMap({
      target: this.mapEl.nativeElement,
      layers: [baseLayer, pointLayer],
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

  private applyBasemap(): void {
    if (!this.baseLayer) return;
    const mode = this.options.basemap;
    if (mode === 'none') {
      this.baseLayer.setVisible(false);
      return;
    }
    const dark = mode === 'dark' || (mode === 'auto' && !!this.palette?.dark);
    const url = this.basemap.carto(dark ? 'dark_all' : 'light_all');
    const source = this.baseLayer.getSource();
    if (source && source.getUrls()?.[0] !== url) source.setUrl(url);
    this.baseLayer.setVisible(true);
  }

  /** "Tampilkan seluruh area" button on interactive maps. */
  resetView(): void {
    this.fit();
  }

  private applyInteractions(): void {
    if (!this.map) return;
    const interactions = this.map.getInteractions();
    interactions.clear();
    const controls = this.map.getControls();
    controls.clear();
    if (this.options.interactive) {
      defaultInteractions().forEach((i) => interactions.push(i));
      controls.push(new Zoom({ zoomInTipLabel: 'Perbesar', zoomOutTipLabel: 'Perkecil' }));
    }
  }

  // ── SQL points ───────────────────────────────────────────

  private updatePoints(forceFit: boolean): void {
    const sorted = [...this.points].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
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
  private fit(): void {
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
    // SQL labels are drawn right of the marker → more room on the right when they are on.
    const right = this.drawsSql && this.options.showLabels
      ? Math.min(Math.round(size[0] * 0.3), Math.round(120 * s)) : pad;
    // WebGIS sensor value cards sit above the node → more room on top.
    const top = this.sensorLabelsVisible && this.sensorLabelData.length > 0
      ? Math.max(pad, Math.min(Math.round(size[1] * 0.3), Math.round(80 * s))) : pad;
    const legendBottom = this.legendCount() > 0 ? Math.round(36 * s) : 0;
    map.getView().fit(extent, {
      padding: [top, right, pad + legendBottom, pad],
      maxZoom: 16,
      duration: 0,
    });
  }

  private legendCount(): number {
    return this.legendItems.length + this.alertCount + (this.drawsSql ? 1 : 0);
  }

  private pointStyle(f: Feature<Point>): Style {
    const p = f.get('point') as MapPoint;
    const pal = this.palette || this.readPalette();
    const text = this.options.showLabels ? mapPointText(p, this.options.labelMode) : '';
    const key = `${p.status}|${text}`;
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
      const color = p.status === 'normal' ? pal.normal : p.status === 'nothreshold' ? pal.muted : pal.alarm;
      image = new CircleStyle({
        radius,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: pal.halo, width: Math.max(1, 1.5 * s) }),
        declutterMode: 'obstacle',
      });
    }
    const style = new Style({
      image,
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
            const ok = this.addWebgisLayer(supportGeos[i], l.styleJson || {}, Z_SUPPORT + i);
            if (!ok) { failed++; return; }
            const g = String(l.geometryType || '').toLowerCase();
            legend.push({
              name: l.layerName,
              color: webgisLayerColor(l.styleJson || {}, l.layerType),
              shape: g.includes('line') ? 'line' : g.includes('polygon') ? 'area' : 'dot',
            });
          });
          if (wantCore) {
            this.alertEntry = this.addWebgisSource(this.alertSource, ALERT_STYLE, Z_ALERTS);
            types.forEach((t, i) => {
              const style = webgisSensorTypeLayerStyle(i);
              if (!this.addWebgisLayer(typeGeos[i], style, Z_SENSORS + i)) { failed++; return; }
              legend.push({ name: t.name || t.label || 'Sensor', color: style.fill, shape: 'dot' });
            });
          }
        });
        this.sensorTypeNames = new Set(types.map((t) => t.name).filter(Boolean));
        this.failedLayers = failed;
        this.legendItems = legend;
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
      },
    });
  }

  /** Sensor values (cards) + alerts — on load and on every dashboard refresh tick. */
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
        this.sensorLabelData = filterSensorDataByTypes(values as NodeSensorData[], this.sensorTypeNames);
      } else {
        problems.push('nilai sensor');
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
      this.alertCount = this.alertSource.getFeatures().length;
      this.dynamicFailed = problems.length ? `Gagal memperbarui ${problems.join(' & ')}` : null;
      this.webgisFeatureCount = this.countWebgisFeatures();
      this.updateWarn();
      if (!this.options.interactive) this.zone.runOutsideAngular(() => this.fit());
    });
  }

  private updateWarn(): void {
    const parts: string[] = [];
    if (this.failedLayers > 0) parts.push(`${this.failedLayers} lapisan peta gagal dimuat`);
    if (this.dynamicFailed) parts.push(this.dynamicFailed);
    this.layersWarn = parts.length ? parts.join(' · ') : null;
  }

  private addWebgisLayer(geo: any, rawStyle: any, zIndex: number): boolean {
    const features = geo ? readFeatures(geo) : null;
    if (!features) return false;
    this.addWebgisSource(new VectorSource<Feature>({ features }), rawStyle, zIndex);
    return true;
  }

  private addWebgisSource(source: VectorSource<Feature>, rawStyle: any, zIndex: number): WebgisLayerEntry | null {
    if (!this.map) return null;
    const layer = new VectorLayer<Feature>({
      source,
      style: this.webgisStyle(rawStyle),
      zIndex,
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });
    const entry = { layer, rawStyle };
    if (source !== this.alertSource) this.webgisLayers.push(entry);
    this.map.addLayer(layer);
    return entry;
  }

  private webgisStyle(rawStyle: any): any {
    return createWebgisLayerStyle(rawStyle, () => this.map?.getView().getZoom(), this.fontScale || 1);
  }

  private restyleWebgis(): void {
    for (const e of this.webgisLayers) e.layer.setStyle(this.webgisStyle(e.rawStyle));
    this.alertEntry?.layer.setStyle(this.webgisStyle(this.alertEntry.rawStyle));
  }

  private clearWebgisLayers(): void {
    for (const e of this.webgisLayers) this.map?.removeLayer(e.layer);
    if (this.alertEntry) this.map?.removeLayer(this.alertEntry.layer);
    this.webgisLayers = [];
    this.alertEntry = null;
    this.alertSource.clear(true);
    this.sensorLabelData = [];
    this.sensorTypeNames = new Set();
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
