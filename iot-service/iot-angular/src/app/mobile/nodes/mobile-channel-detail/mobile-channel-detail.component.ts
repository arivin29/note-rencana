import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SensorChannelsService } from '@sdk/core/services/sensor-channels.service';
import { AutoRefreshService } from '@services/auto-refresh.service';

type Range = '1h' | '24h' | '7d';
interface Point { t: number; v: number; }
interface RowVM { ts: string; value: number; }

/** Channel detail: chart 1-seri + rows, via /sensor-channels/{id}/readings. docs/mobile/05 §5. */
@Component({
  selector: 'mobile-channel-detail',
  templateUrl: './mobile-channel-detail.component.html',
  standalone: false
})
export class MobileChannelDetailComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  channelId = '';
  title = '';
  unit = '';
  min: number | null = null;
  max: number | null = null;
  range: Range = '24h';
  rows: RowVM[] = [];
  path = '';
  areaPath = '';

  private points: Point[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private chSvc: SensorChannelsService,
    private route: ActivatedRoute,
    private auto: AutoRefreshService
  ) {}

  ngOnInit(): void {
    this.channelId = this.route.snapshot.paramMap.get('channelId') || '';
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
  }

  setRange(r: Range): void {
    if (this.range === r) { return; }
    this.range = r;
    this.load(true);
  }

  load(showLoading: boolean): void {
    if (showLoading) { this.loading = true; }
    const end = new Date();
    const start = new Date(end.getTime() - this.rangeMs());
    this.chSvc.sensorChannelsControllerGetReadings$Response({
      id: this.channelId, startTime: start.toISOString(), endTime: end.toISOString()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        let d: any = res.body;
        if (typeof d === 'string') { d = JSON.parse(d); }
        const ch = d?.channel || {};
        this.title = ch.metricCode || 'Channel';
        this.unit = ch.unit || '';
        this.min = ch.minThreshold != null ? parseFloat(ch.minThreshold) : null;
        this.max = ch.maxThreshold != null ? parseFloat(ch.maxThreshold) : null;
        const dps = (d?.dataPoints || []) as any[];
        this.points = dps
          .map((p) => ({ t: new Date(p.timestamp || p.ts).getTime(), v: Number(p.value) }))
          .filter((p) => !isNaN(p.t) && !isNaN(p.v));
        this.buildChart();
        this.rows = dps.slice().reverse().slice(0, 60)
          .map((p) => ({ ts: this.fmtTs(p.timestamp || p.ts), value: Number(p.value) }));
        this.loading = false;
        this.error = null;
      },
      error: (err) => { this.error = err?.message || 'Gagal memuat data'; this.loading = false; }
    });
  }

  fmt(v: number): number { return Math.round(v * 100) / 100; }

  private rangeMs(): number {
    return this.range === '1h' ? 3600e3 : this.range === '24h' ? 86400e3 : 7 * 86400e3;
  }

  private buildChart(): void {
    const W = 340, H = 150, pad = 6;
    if (this.points.length < 2) { this.path = ''; this.areaPath = ''; return; }
    const xs = this.points.map((p) => p.t);
    const ys = this.points.map((p) => p.v);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const sx = (t: number) => pad + (W - 2 * pad) * (t - minX) / (maxX - minX || 1);
    const sy = (v: number) => pad + (H - 2 * pad) * (1 - (v - minY) / (maxY - minY || 1));
    const pts = this.points.map((p) => `${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`);
    this.path = 'M' + pts.join(' L');
    this.areaPath = `M${sx(minX).toFixed(1)},${(H - pad).toFixed(1)} L` + pts.join(' L') +
      ` L${sx(maxX).toFixed(1)},${(H - pad).toFixed(1)} Z`;
  }

  private fmtTs(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return '-'; }
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
