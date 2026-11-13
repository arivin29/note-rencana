import {
  AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, ViewChild,
} from '@angular/core';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
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
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import { Widget } from '../../../models/widget.models';
import {
  MapPoint, MapPointStatus, MapWidgetOptions, normalizeMapRows, readMapOptions, mapPointText, formatMapValue,
} from '../../../utils/map-rows';
import { WebGisLayersService } from 'src/sdk/core/services';
import { BasemapService } from '../../../../../../services/basemap.service';

/** Status → draw priority for label decluttering (features added first win the space). */
const STATUS_PRIORITY: Record<MapPointStatus, number> = { high: 0, low: 0, normal: 1, nothreshold: 2, nodata: 3 };
const BASE_LABEL_PX = 13;
const BASE_RADIUS_PX = 6;
const DEFAULT_LINE = '#3b82f6';

interface MapPalette {
  normal: string;
  alarm: string;
  muted: string;
  text: string;
  halo: string;
  dark: boolean;
  font: string;
}

/**
 * Peta widget — SQL rows (lat, lon, label, value, unit, status, time; see utils/map-rows.ts)
 * drawn as status-coloured circles over a CARTO basemap + the project's operational/custom map layers.
 * The OL map is created once; data refreshes only replace the point features.
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
  /** Dashboard project → draws its map layers (null = none). */
  @Input() projectId: string | null = null;

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltipEl', { static: true }) tooltipEl!: ElementRef<HTMLDivElement>;

  points: MapPoint[] = [];
  options: MapWidgetOptions = readMapOptions(undefined);
  layersLoading = false;
  layersError: string | null = null;
  readonly attribution: string;

  private map: OlMap | null = null;
  private baseLayer: TileLayer<XYZ> | null = null;
  private pointSource = new VectorSource<Feature<Point>>();
  private pointLayer: VectorLayer<Feature<Point>> | null = null;
  private projectLayers: VectorLayer<Feature>[] = [];
  private palette: MapPalette | null = null;
  private styleCache = new Map<string, Style>();
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private resizeFrame = 0;
  private lastSignature = '';
  private layersSub: Subscription | null = null;
  private loadedLayersFor: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private zone: NgZone,
    private host: ElementRef<HTMLElement>,
    private layersService: WebGisLayersService,
    private basemap: BasemapService,
  ) {
    this.attribution = basemap.attribution;
  }

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
      this.syncProjectLayers();
    } else if (changes['projectId']) {
      this.syncProjectLayers();
    }
    if (changes['fontScale'] || changes['widget']) {
      this.styleCache.clear();
      this.pointLayer?.changed();
    }
    if (changes['data']) {
      this.updatePoints(false);
    } else if (changes['fontScale'] || changes['widget']) {
      this.fit();
    }
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.createMap());
    // next tick: syncProjectLayers flips template flags (layersLoading)
    setTimeout(() => this.syncProjectLayers());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layersSub?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    if (this.map) {
      this.map.setTarget(undefined);
      this.map.dispose();
      this.map = null;
    }
  }

  retryLayers(): void {
    this.loadedLayersFor = null;
    this.syncProjectLayers();
  }

  // ── Map setup ────────────────────────────────────────────

  private createMap(): void {
    this.palette = this.readPalette();
    const baseLayer = new TileLayer({ source: new XYZ({}), zIndex: 0 });
    const pointLayer = new VectorLayer<Feature<Point>>({
      source: this.pointSource,
      style: (f) => this.pointStyle(f as Feature<Point>),
      declutter: true,
      zIndex: 10,
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
        layerFilter: (l) => l === this.pointLayer, hitTolerance: 4,
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

  private applyInteractions(): void {
    if (!this.map) return;
    const interactions = this.map.getInteractions();
    interactions.clear();
    if (this.options.interactive) {
      defaultInteractions().forEach((i) => interactions.push(i));
    }
  }

  // ── Points ───────────────────────────────────────────────

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
    if (forceFit || changed || !this.options.interactive) this.fit();
  }

  /** Fit to all points (or, with no points, to the project layers). */
  private fit(): void {
    const map = this.map;
    if (!map) return;
    const size = map.getSize();
    if (!size || size[0] < 10 || size[1] < 10) return;

    let extent: Extent = createEmpty();
    if (this.pointSource.getFeatures().length > 0) {
      extent = this.pointSource.getExtent().slice() as Extent;
    } else {
      for (const l of this.projectLayers) {
        const src = l.getSource();
        if (src && src.getFeatures().length) extendExtent(extent, src.getExtent());
      }
    }
    if (isEmptyExtent(extent)) return; // a single point ([x,y,x,y]) is not empty

    const s = this.fontScale || 1;
    const pad = Math.round(28 * s);
    // Labels are drawn right of the marker → more room on the right when labels are on.
    const right = this.options.showLabels ? Math.min(Math.round(size[0] * 0.3), Math.round(120 * s)) : pad;
    const legendBottom = Math.round(36 * s);
    map.getView().fit(extent, {
      padding: [pad, right, pad + legendBottom, pad],
      maxZoom: 16,
      duration: 0,
    });
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

  // ── Project layers ───────────────────────────────────────

  private syncProjectLayers(): void {
    const want = this.options.showProjectLayers && this.projectId ? this.projectId : null;
    if (want === this.loadedLayersFor) return;
    this.layersSub?.unsubscribe();
    this.clearProjectLayers();
    this.layersError = null;
    this.loadedLayersFor = want;
    if (!want) {
      this.layersLoading = false;
      return;
    }
    this.layersLoading = true;
    this.layersSub = this.layersService.layersControllerFindAll({ projectId: want, limit: 100 }).pipe(
      switchMap((res: any) => {
        const layers = ((res?.data || []) as any[])
          .filter((l) => l.layerType !== 'core' && l.isVisibleDefault !== false);
        if (layers.length === 0) return of([] as { layer: any; geo: any }[]);
        return forkJoin(layers.map((layer) =>
          this.layersService.layersControllerGetGeoJson({ id: layer.idLayer }).pipe(
            rxMap((geo) => ({ layer, geo })),
            catchError(() => of({ layer, geo: null })),
          )));
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (items) => {
        this.layersLoading = false;
        const failed = items.filter((i) => !i.geo).length;
        if (failed > 0) this.layersError = `${failed} lapisan peta gagal dimuat`;
        this.zone.runOutsideAngular(() => {
          items.filter((i) => i.geo).forEach((i, idx) => this.addProjectLayer(i.layer, i.geo, idx));
          if (this.pointSource.getFeatures().length === 0) this.fit();
        });
      },
      error: () => {
        this.layersLoading = false;
        this.layersError = 'Lapisan peta proyek gagal dimuat';
        this.loadedLayersFor = null; // allow retry
      },
    });
  }

  private clearProjectLayers(): void {
    for (const l of this.projectLayers) this.map?.removeLayer(l);
    this.projectLayers = [];
  }

  private addProjectLayer(layer: any, geo: any, idx: number): void {
    if (!this.map) return;
    let features: Feature[] = [];
    try {
      features = new GeoJSON().readFeatures(geo, { featureProjection: 'EPSG:3857' }) as Feature[];
    } catch {
      this.zone.run(() => (this.layersError = `Lapisan "${layer.layerName}" tidak valid`));
      return;
    }
    const vl = new VectorLayer<Feature>({
      source: new VectorSource<Feature>({ features }),
      style: this.layerStyle(layer.styleJson),
      zIndex: 1 + idx,
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });
    this.projectLayers.push(vl);
    this.map.addLayer(vl);
  }

  /** Simple styles from map_layer.style_json (strokeColor/fillColor or legacy stroke/fill); else a blue line. */
  private layerStyle(raw: any): Style {
    let c = raw || {};
    if (c.styleJson && !c.fillColor && !c.strokeColor) c = c.styleJson; // legacy nested format
    const strokeColor = withOpacity(c.strokeColor || c.stroke || DEFAULT_LINE, num(c.strokeOpacity, 1));
    const strokeWidth = num(c.strokeWidth, 2);
    const fillColor = withOpacity(c.fillColor || c.fill || DEFAULT_LINE, num(c.fillOpacity, 0.15));
    return new Style({
      stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
      fill: new Fill({ color: fillColor }),
      image: new CircleStyle({
        radius: num(c.pointRadius ?? c.radius, 3),
        fill: new Fill({ color: strokeColor }),
      }),
    });
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

function num(v: any, d: number): number {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? d : n;
}

/** '#rrggbb' + opacity → rgba(); other colour strings are returned unchanged. */
function withOpacity(color: string, opacity: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}
