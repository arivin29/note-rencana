import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { SensorChannelsService } from '@sdk/core/services/sensor-channels.service';
import { buildChartPaths, ChartPoint } from '../util';

export type ChStatus = 'ok' | 'off' | 'warn' | 'danger';
export interface ChannelItem {
  id: string; nodeId: string; metric: string; subtitle: string;
  value: string; unit: string; status: ChStatus; updated: string; range: string;
}

/** Daftar channel reusable: accordion + mini line-chart (lazy) + tombol terkait. */
@Component({
  selector: 'mobile-channel-list',
  templateUrl: './mobile-channel-list.component.html',
  standalone: false
})
export class MobileChannelListComponent {
  @Input() channels: ChannelItem[] = [];

  expandedId: string | null = null;
  chart = { loading: false, error: '', path: '', area: '', empty: false };

  constructor(private chSvc: SensorChannelsService, private router: Router) {}

  toggle(c: ChannelItem): void {
    if (this.expandedId === c.id) { this.expandedId = null; return; }
    this.expandedId = c.id;
    this.loadChart(c);
  }

  private loadChart(c: ChannelItem): void {
    this.chart = { loading: true, error: '', path: '', area: '', empty: false };
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600e3);
    this.chSvc.sensorChannelsControllerGetReadings$Response({ id: c.id, startTime: start.toISOString(), endTime: end.toISOString() })
      .subscribe({
        next: (res: any) => {
          if (this.expandedId !== c.id) { return; }
          let d: any = res.body; if (typeof d === 'string') { d = JSON.parse(d); }
          const dps = (d?.dataPoints || []) as any[];
          const pts: ChartPoint[] = dps
            .map((p) => ({ t: new Date(p.timestamp || p.ts).getTime(), v: Number(p.value) }))
            .filter((p) => !isNaN(p.t) && !isNaN(p.v));
          const paths = buildChartPaths(pts);
          this.chart = { loading: false, error: '', path: paths.path, area: paths.area, empty: pts.length < 2 };
        },
        error: (e) => {
          if (this.expandedId !== c.id) { return; }
          this.chart = { loading: false, error: e?.message || 'Gagal memuat grafik', path: '', area: '', empty: false };
        }
      });
  }

  openChannel(c: ChannelItem): void {
    if (c.nodeId) { this.router.navigate(['/mobile/nodes', c.nodeId, 'channels', c.id]); }
  }
  openNode(id: string): void { if (id) { this.router.navigate(['/mobile/nodes', id]); } }
}
