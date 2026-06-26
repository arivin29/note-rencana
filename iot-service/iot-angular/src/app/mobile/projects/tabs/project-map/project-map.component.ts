import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';

interface PNode { id: string; code: string; lat: number; lng: number; status: string; }

/** Tab Peta: OpenLayers (OSM) + marker node by status + popup. OL di-load dinamis (chunk terpisah). */
@Component({
  selector: 'mobile-project-map',
  templateUrl: './project-map.component.html',
  standalone: false
})
export class MobileProjectMapComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  count = 0;

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;
  @ViewChild('popupEl') popupEl?: ElementRef<HTMLDivElement>;
  popup = { open: false, code: '', status: '', id: '' };

  private nodes: PNode[] = [];
  private map: any = null;
  private overlay: any = null;
  private destroy$ = new Subject<void>();

  constructor(private nodesSvc: NodesService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id') || '';
    this.nodesSvc.nodesControllerFindAll$Response({ idProject: id, limit: 200 })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
          const rows = (b?.data || []) as any[];
          this.nodes = rows.map((n) => ({
            id: n.idNode || n.id,
            code: n.code || n.name || '-',
            lat: n.latitude != null ? parseFloat(n.latitude) : NaN,
            lng: n.longitude != null ? parseFloat(n.longitude) : NaN,
            status: n.connectivityStatus || 'offline'
          })).filter((n) => !isNaN(n.lat) && !isNaN(n.lng));
          this.count = this.nodes.length;
          this.loading = false;
          if (this.count > 0) { setTimeout(() => this.initMap(), 0); }
        },
        error: (e) => { this.error = e?.message || 'Gagal memuat node'; this.loading = false; }
      });
  }

  openNode(): void { if (this.popup.id) { this.router.navigate(['/mobile/nodes', this.popup.id]); } }

  private async initMap(): Promise<void> {
    if (this.map || !this.mapEl) { return; }
    const [
      MapMod, ViewMod, TileMod, OSMMod, VLayerMod, VSrcMod, FeatMod, PointMod, ProjMod,
      StyleMod, CircleMod, FillMod, StrokeMod, OverlayMod
    ] = await Promise.all([
      import('ol/Map'), import('ol/View'), import('ol/layer/Tile'), import('ol/source/OSM'),
      import('ol/layer/Vector'), import('ol/source/Vector'), import('ol/Feature'), import('ol/geom/Point'),
      import('ol/proj'), import('ol/style/Style'), import('ol/style/Circle'), import('ol/style/Fill'),
      import('ol/style/Stroke'), import('ol/Overlay')
    ]);
    const OlMap = MapMod.default, View = ViewMod.default, TileLayer = TileMod.default, OSM = OSMMod.default;
    const VectorLayer = VLayerMod.default, VectorSource = VSrcMod.default, Feature = FeatMod.default, Point = PointMod.default;
    const Style = StyleMod.default, CircleStyle = CircleMod.default, Fill = FillMod.default, Stroke = StrokeMod.default, Overlay = OverlayMod.default;
    const fromLonLat = ProjMod.fromLonLat;

    const src = new VectorSource();
    for (const n of this.nodes) {
      const f = new Feature({ geometry: new Point(fromLonLat([n.lng, n.lat])) });
      f.set('node', n);
      f.setStyle(new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: this.color(n.status) }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      }));
      src.addFeature(f);
    }

    this.overlay = new Overlay({ element: this.popupEl?.nativeElement, positioning: 'bottom-center', offset: [0, -14], stopEvent: true });

    this.map = new OlMap({
      target: this.mapEl.nativeElement,
      layers: [new TileLayer({ source: new OSM() }), new VectorLayer({ source: src })],
      view: new View({ center: fromLonLat([this.nodes[0].lng, this.nodes[0].lat]), zoom: 13 }),
      overlays: [this.overlay],
      controls: []
    });

    this.map.getView().fit(src.getExtent(), { padding: [50, 50, 50, 50], maxZoom: 16 });

    this.map.on('click', (ev: any) => {
      const feat = this.map.forEachFeatureAtPixel(ev.pixel, (ft: any) => ft);
      if (feat) {
        const n = feat.get('node') as PNode;
        this.popup = { open: true, code: n.code, status: n.status, id: n.id };
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
    if (this.map) { this.map.setTarget(undefined); this.map = null; }
    this.destroy$.next(); this.destroy$.complete();
  }
}
