import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { WebGisCoreGeoJsonService } from '@sdk/core/services/web-gis-core-geo-json.service';
import { WebGisLayersService } from '@sdk/core/services/web-gis-layers.service';

interface PNode { id: string; code: string; lat: number; lng: number; status: string; address: string; lastSeenAt: string | null; ago: string; }
interface PChannel { label: string; metric: string; value: number | null; unit: string; status: string; }
interface PSensorNode { id: string; code: string; lat: number; lng: number; address: string; lastSeenAt: string | null; ago: string; channels: PChannel[]; }
type MapMode = 'node' | 'sensor';

/** Tab Peta: OpenLayers + CARTO Dark base. Toggle Node/Sensor. Operational (uploaded)
 *  layers rendered under markers. Sensor labels use the same glass card as desktop. */
@Component({
  selector: 'mobile-project-map',
  templateUrl: './project-map.component.html',
  styleUrls: ['./project-map.component.scss'],
  standalone: false
})
export class MobileProjectMapComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  count = 0;
  mode: MapMode = 'node';

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;
  @ViewChild('popupEl') popupEl?: ElementRef<HTMLDivElement>;
  popup = {
    open: false, kind: 'node' as MapMode, code: '', status: '', id: '',
    address: '', lastSeen: '', channels: [] as PChannel[]
  };

  private nodes: PNode[] = [];
  private sensors: PSensorNode[] = [];
  private opLayers: { name: string; style: any; geo: any }[] = [];
  private map: any = null;
  private overlay: any = null;
  private nodeLayer: any = null;
  private sensorLayer: any = null;
  private sensorOverlays: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private nodesSvc: NodesService,
    private webgisSvc: WebGisCoreGeoJsonService,
    private layersSvc: WebGisLayersService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id') || '';
    forkJoin({
      nodes: this.nodesSvc.nodesControllerFindAll$Response({ idProject: id, limit: 200 }),
      values: this.webgisSvc.coreGeoJsonControllerGetSensorChannelValues$Response({ projectId: id }),
      layers: this.layersSvc.layersControllerFindAll$Response({ projectId: id })
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ nodes, values, layers }) => {
        this.nodes = this.parseNodes(nodes);
        const byNode = new Map(this.nodes.map((n) => [n.id, n]));
        this.sensors = this.parseSensors(values, byNode);
        this.count = this.nodes.length;
        this.loadOperationalLayers(this.parseLayerList(layers));
      },
      error: (e) => { this.error = e?.message || 'Gagal memuat peta'; this.loading = false; }
    });
  }

  private parseNodes(res: any): PNode[] {
    let b: any = res.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
    const rows = (b?.data || []) as any[];
    return rows.map((n) => ({
      id: n.idNode || n.id,
      code: n.code || n.name || '-',
      lat: n.latitude != null ? parseFloat(n.latitude) : NaN,
      lng: n.longitude != null ? parseFloat(n.longitude) : NaN,
      status: n.connectivityStatus || 'offline',
      address: n.address || '',
      lastSeenAt: n.lastSeenAt || null,
      ago: this.fmtAgo(n.lastSeenAt || null)
    })).filter((n) => !isNaN(n.lat) && !isNaN(n.lng));
  }

  private parseSensors(res: any, byNode: Map<string, PNode>): PSensorNode[] {
    let b: any = res.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
    const rows = (Array.isArray(b) ? b : b?.data || []) as any[];
    const out: PSensorNode[] = [];
    for (const r of rows) {
      const lat = r.latitude != null ? parseFloat(r.latitude) : NaN;
      const lng = r.longitude != null ? parseFloat(r.longitude) : NaN;
      if (isNaN(lat) || isNaN(lng)) { continue; }
      const channels: PChannel[] = (r.channels || []).map((c: any) => ({
        label: c.sensorLabel || c.metricCode || 'channel',
        metric: c.metricCode || '',
        value: c.value != null ? Number(c.value) : null,
        unit: c.unit || '',
        status: c.status || 'unknown'
      }));
      if (!channels.length) { continue; }
      const node = byNode.get(r.nodeId);
      const lastSeenAt = node?.lastSeenAt || null;
      out.push({
        id: r.nodeId,
        code: r.nodeCode || r.nodeName || '-',
        lat, lng,
        address: node?.address || '',
        lastSeenAt,
        ago: this.fmtAgo(lastSeenAt),
        channels
      });
    }
    return out;
  }

  private parseLayerList(res: any): any[] {
    let b: any = res.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
    const rows = (b?.data || []) as any[];
    return rows.filter((l) => l.layerType && l.layerType !== 'core' && l.isVisibleDefault !== false);
  }

  private loadOperationalLayers(defs: any[]): void {
    const finish = () => { this.loading = false; if (this.count > 0) { setTimeout(() => this.initMap(), 0); } };
    if (!defs.length) { finish(); return; }
    forkJoin(defs.map((l) => this.layersSvc.layersControllerGetGeoJson$Response({ id: l.idLayer })))
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (geos: any[]) => {
          this.opLayers = defs.map((l, i) => {
            let g: any = geos[i]?.body; if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = null; } }
            return { name: l.layerName, style: l.styleJson || {}, geo: g };
          }).filter((x) => x.geo && (x.geo.features?.length || x.geo.type));
          finish();
        },
        error: () => finish()
      });
  }

  setMode(m: MapMode): void {
    if (this.mode === m) { return; }
    this.mode = m;
    this.popup.open = false;
    this.overlay?.setPosition(undefined);
    this.nodeLayer?.setVisible(m === 'node');
    this.sensorLayer?.setVisible(m === 'sensor');
    this.updateSensorOverlayVisibility();
  }

  openNode(): void { if (this.popup.id) { this.router.navigate(['/mobile/nodes', this.popup.id]); } }

  fmtVal(v: number | null): string {
    if (v == null) { return 'N/A'; }
    const a = Math.abs(v);
    if (a >= 1000) { return v.toFixed(0); }
    if (a >= 100) { return v.toFixed(1); }
    if (a >= 1) { return v.toFixed(2); }
    return v.toFixed(3);
  }

  fmtAgo(iso: string | null): string {
    if (!iso) { return '—'; }
    const t = new Date(iso).getTime();
    if (isNaN(t)) { return '—'; }
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) { return 'now'; }
    if (m < 60) { return `${m}m`; }
    const h = Math.floor(m / 60);
    if (h < 24) { return `${h}h`; }
    return `${Math.floor(h / 24)}d`;
  }

  fmtLastSeen(iso: string | null): string {
    if (!iso) { return 'belum pernah kirim'; }
    const t = new Date(iso).getTime();
    if (isNaN(t)) { return '—'; }
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) { return 'baru saja'; }
    if (m < 60) { return `${m} menit lalu`; }
    const h = Math.floor(m / 60);
    if (h < 24) { return `${h} jam lalu`; }
    const d = Math.floor(h / 24);
    if (d < 30) { return `${d} hari lalu`; }
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---- desktop-style sensor label card ----
  private titleCase(code: string): string {
    return (code || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  private statusClass(s: string): string {
    return s === 'critical' ? 'status-critical' : s === 'warning' ? 'status-warning' : s === 'normal' ? 'status-normal' : 'status-unknown';
  }
  private esc(text: string): string {
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
  }
  private buildLabelHtml(s: PSensorNode): string {
    let html = '<div class="sensor-label-card">';
    for (const c of s.channels.slice(0, 3)) {
      const val = c.value != null ? `${this.fmtVal(c.value)} ${c.unit}` : 'N/A';
      html += '<div class="sensor-group">';
      html += `<div class="sensor-name">${this.esc(this.titleCase(c.label))}</div>`;
      html += `<div class="channel-row ${this.statusClass(c.status)}">`;
      html += `<span class="channel-name">${this.esc(this.titleCase(c.metric))}</span>`;
      html += `<span class="channel-value">${this.esc(val)}</span>`;
      html += '</div></div>';
    }
    if (s.channels.length > 3) { html += `<div class="more-indicator">+${s.channels.length - 3} sensor</div>`; }
    html += `<div class="label-foot"><i class="fa fa-clock"></i> ${s.ago}</div>`;
    html += '</div>';
    return html;
  }

  private updateSensorOverlayVisibility(): void {
    const show = this.mode === 'sensor';
    for (const ov of this.sensorOverlays) {
      const el = ov.getElement();
      if (el) { el.style.display = show ? '' : 'none'; }
    }
  }

  private async initMap(): Promise<void> {
    if (this.map || !this.mapEl) { return; }
    const [
      MapMod, ViewMod, TileMod, XYZMod, VLayerMod, VSrcMod, FeatMod, PointMod, ProjMod,
      StyleMod, CircleMod, FillMod, StrokeMod, TextMod, OverlayMod, GeoJSONMod
    ] = await Promise.all([
      import('ol/Map'), import('ol/View'), import('ol/layer/Tile'), import('ol/source/XYZ'),
      import('ol/layer/Vector'), import('ol/source/Vector'), import('ol/Feature'), import('ol/geom/Point'),
      import('ol/proj'), import('ol/style/Style'), import('ol/style/Circle'), import('ol/style/Fill'),
      import('ol/style/Stroke'), import('ol/style/Text'), import('ol/Overlay'), import('ol/format/GeoJSON')
    ]);
    const OlMap = MapMod.default, View = ViewMod.default, TileLayer = TileMod.default, XYZ = XYZMod.default;
    const VectorLayer = VLayerMod.default, VectorSource = VSrcMod.default, Feature = FeatMod.default, Point = PointMod.default;
    const Style = StyleMod.default, CircleStyle = CircleMod.default, Fill = FillMod.default, Stroke = StrokeMod.default;
    const Text = TextMod.default, Overlay = OverlayMod.default, GeoJSON = GeoJSONMod.default;
    const fromLonLat = ProjMod.fromLonLat;

    // Operational/custom uploaded layers (GeoJSON) — drawn under the markers.
    const opVectorLayers = this.opLayers.map((op) => {
      const st = op.style || {};
      const strokeColor = st.strokeColor || st.color || '#22d3ee';
      const strokeWidth = st.strokeWidth || st.weight || 3;
      const fillColor = st.fillColor || 'rgba(34,211,238,0.15)';
      const radius = st.radius || 5;
      const source = new VectorSource({ features: new GeoJSON().readFeatures(op.geo, { featureProjection: 'EPSG:3857' }) });
      return new VectorLayer({
        source,
        style: new Style({
          stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
          fill: new Fill({ color: fillColor }),
          image: new CircleStyle({ radius, fill: new Fill({ color: strokeColor }), stroke: new Stroke({ color: '#ffffff', width: 1 }) })
        })
      });
    });

    // Node layer (marker + compact "ago" chip, dark theme).
    const nodeSrc = new VectorSource();
    for (const n of this.nodes) {
      const f = new Feature({ geometry: new Point(fromLonLat([n.lng, n.lat])) });
      f.set('kind', 'node'); f.set('data', n);
      f.setStyle(new Style({
        image: new CircleStyle({ radius: 8, fill: new Fill({ color: this.color(n.status) }), stroke: new Stroke({ color: '#0b0b18', width: 2 }) }),
        text: new Text({
          text: n.ago, offsetY: -16, font: '600 10px system-ui,sans-serif',
          fill: new Fill({ color: '#e5e7eb' }), backgroundFill: new Fill({ color: 'rgba(20,20,35,0.85)' }),
          padding: [2, 5, 2, 5]
        })
      }));
      nodeSrc.addFeature(f);
    }

    // Sensor layer (small circle only; value shown by HTML card overlay).
    const sensorSrc = new VectorSource();
    for (const s of this.sensors) {
      const f = new Feature({ geometry: new Point(fromLonLat([s.lng, s.lat])) });
      f.set('kind', 'sensor'); f.set('data', s);
      f.setStyle(new Style({
        image: new CircleStyle({ radius: 6, fill: new Fill({ color: '#3b82f6' }), stroke: new Stroke({ color: '#ffffff', width: 2 }) })
      }));
      sensorSrc.addFeature(f);
    }

    this.nodeLayer = new VectorLayer({ source: nodeSrc, visible: this.mode === 'node' });
    this.sensorLayer = new VectorLayer({ source: sensorSrc, visible: this.mode === 'sensor' });
    this.overlay = new Overlay({ element: this.popupEl?.nativeElement, positioning: 'bottom-center', offset: [0, -14], stopEvent: true });

    // CARTO Dark Matter base (same as desktop).
    const baseTile = new TileLayer({
      source: new XYZ({
        url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attributions: '© OpenStreetMap © CARTO'
      })
    });

    this.map = new OlMap({
      target: this.mapEl.nativeElement,
      layers: [baseTile, ...opVectorLayers, this.nodeLayer, this.sensorLayer],
      view: new View({ center: fromLonLat([this.nodes[0].lng, this.nodes[0].lat]), zoom: 13 }),
      overlays: [this.overlay],
      controls: []
    });
    this.map.getView().fit(nodeSrc.getExtent(), { padding: [70, 40, 90, 40], maxZoom: 16 });

    // Sensor value cards (desktop glass style), shown only in sensor mode.
    for (const s of this.sensors) {
      const el = document.createElement('div');
      el.className = 'sensor-label-container';
      el.innerHTML = this.buildLabelHtml(s);
      const ov = new Overlay({ element: el, positioning: 'bottom-center', offset: [0, -16], stopEvent: false, className: 'sensor-label-overlay' });
      ov.setPosition(fromLonLat([s.lng, s.lat]));
      this.map.addOverlay(ov);
      this.sensorOverlays.push(ov);
    }
    this.updateSensorOverlayVisibility();

    this.map.on('click', (ev: any) => {
      const feat = this.map.forEachFeatureAtPixel(ev.pixel, (ft: any) => ft, {
        layerFilter: (l: any) => l === (this.mode === 'node' ? this.nodeLayer : this.sensorLayer)
      });
      if (feat) {
        if (feat.get('kind') === 'node') {
          const n = feat.get('data') as PNode;
          this.popup = { open: true, kind: 'node', code: n.code, status: n.status, id: n.id, address: n.address, lastSeen: this.fmtLastSeen(n.lastSeenAt), channels: [] };
        } else {
          const s = feat.get('data') as PSensorNode;
          this.popup = { open: true, kind: 'sensor', code: s.code, status: '', id: s.id, address: s.address, lastSeen: this.fmtLastSeen(s.lastSeenAt), channels: s.channels };
        }
        this.overlay.setPosition(feat.getGeometry().getCoordinates());
      } else {
        this.popup.open = false;
        this.overlay.setPosition(undefined);
      }
    });
  }

  private color(s: string): string {
    return s === 'online' ? '#2dd4a7' : s === 'degraded' ? '#fbbf24' : '#fb5b6d';
  }

  ngOnDestroy(): void {
    if (this.map) {
      for (const ov of this.sensorOverlays) { this.map.removeOverlay(ov); }
      this.map.setTarget(undefined); this.map = null;
    }
    this.sensorOverlays = [];
    this.destroy$.next(); this.destroy$.complete();
  }
}
