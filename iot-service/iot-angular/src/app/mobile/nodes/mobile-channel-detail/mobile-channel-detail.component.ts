import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { merge, Observable, of, Subject } from 'rxjs';
import { catchError, filter, map, switchMap, take, takeUntil } from 'rxjs/operators';
import { SensorChannelsService } from '@sdk/core/services/sensor-channels.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { parseBody } from '@app/shared/utils/fetch-all';
import { nodeLabel, thresholdText } from '@app/shared/utils/channel-verdict';
import { MobileChromeService } from '../../shared/mobile-chrome.service';
import { RefreshBusService } from '../../shared/refresh-bus.service';
import { metricLabel } from '../../shared/channel-rows';
import { clockText, mErrorText, mobilePoll$ } from '../../shared/labels';
import { mFormatNumber } from '../../shared/mobile-format';

type Range = '1h' | '24h' | '7d';
interface Point { t: number; v: number; }
interface RowVM { ts: string; value: string; }

/**
 * Grafik channel `/mobile/p/:pid/nodes/:nid/channels/:cid` via /sensor-channels/{id}/readings.
 * Hanya rentang 1 jam yang dipoll (60 dtk); 24 jam / 7 hari dimuat sekali (backend belum
 * mengagregasi — `aggregation` diabaikan — jadi data mentahnya besar). Angka id-ID + presisi.
 */
@Component({
  selector: 'mobile-channel-detail',
  templateUrl: './mobile-channel-detail.component.html',
  standalone: false
})
export class MobileChannelDetailComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  refreshError: string | null = null;
  channelId = '';
  title = '';
  nodeTitle = '';
  unit = '';
  thText = '';
  range: Range = '1h';
  rows: RowVM[] = [];
  stats = { last: '—', min: '—', avg: '—', max: '—', count: 0 };
  updated = '';
  path = '';
  areaPath = '';
  /** titik terakhir grafik (hiasan) */
  end: { x: number; y: number } | null = null;

  private precision: any = null;
  private points: Point[] = [];
  private load$ = new Subject<boolean>();
  private done$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private offRefresh?: () => void;

  constructor(
    private chSvc: SensorChannelsService,
    private route: ActivatedRoute,
    private auto: AutoRefreshService,
    private chrome: MobileChromeService,
    private refreshBus: RefreshBusService,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  ngOnInit(): void {
    this.channelId = this.route.snapshot.paramMap.get('cid') || '';
    merge(
      // poll hanya saat rentang 1 jam
      mobilePoll$(this.auto).pipe(filter(() => this.range === '1h'), map(() => false)),
      this.load$
    ).pipe(
      switchMap((showLoading) => {
        if (showLoading) { this.loading = true; }
        return this.fetch$();
      }),
      takeUntil(this.destroy$)
    ).subscribe(() => this.done$.next());
    // rentang 24 j/7 h tidak dipoll: muat pertama dipicu manual bila bukan 1 jam
    if (this.range !== '1h') { this.load$.next(true); }
    this.offRefresh = this.refreshBus.register(() => {
      const p = new Promise<void>((res) => this.done$.pipe(take(1)).subscribe(() => res()));
      this.load$.next(false);
      return p;
    });
  }

  setRange(r: Range): void {
    if (this.range === r) { return; }
    this.range = r;
    this.load$.next(true);
  }

  retry(): void { this.load$.next(!this.rows.length); }

  private fetch$(): Observable<void> {
    const end = new Date();
    const start = new Date(end.getTime() - this.rangeMs());
    const range = this.range;
    return this.chSvc.sensorChannelsControllerGetReadings$Response({
      id: this.channelId, startTime: start.toISOString(), endTime: end.toISOString()
    }).pipe(
      map((res: any) => {
        const d = parseBody(res?.body) || {};
        this.apply(d, range);
        this.loading = false; this.error = null; this.refreshError = null;
        this.updated = clockText(new Date());
      }),
      catchError((err) => {
        // galat muat ulang: grafik & baris lama tetap tampil
        if (this.rows.length && range === this.loadedRange) { this.refreshError = mErrorText(err, 'data channel'); }
        else { this.error = mErrorText(err, 'data channel'); this.rows = []; this.points = []; this.path = ''; this.areaPath = ''; this.loadedRange = null; }
        this.loading = false;
        return of(undefined);
      })
    );
  }

  /** rentang yang datanya sedang tampil; data lama dipertahankan hanya bila rentangnya sama */
  private loadedRange: Range | null = null;

  private apply(d: any, range: Range): void {
    this.loadedRange = range;
    const ch = d?.channel || {};
    this.precision = ch.precision;
    this.unit = (ch.unit || '').trim();
    const node = nodeLabel({ address: ch.nodeAddress, code: ch.nodeCode });
    const mLabel = metricLabel(ch.metricCode);
    this.title = mLabel;
    this.nodeTitle = [ch.sensorType, ch.nodeAddress ? ch.nodeCode : ''].filter(Boolean).join(' · ');
    this.chrome.setTitle('page', node ? `${node} · ${mLabel}` : mLabel, ch.nodeAddress ? (ch.nodeCode || '') : '');
    const fmt = (v: number) => mFormatNumber(v, this.locale, this.precision);
    this.thText = thresholdText(ch.minThreshold, ch.maxThreshold, this.unit, fmt);

    const dps = ((d?.dataPoints || []) as any[])
      .map((p) => ({ t: new Date(p.timestamp || p.ts).getTime(), v: Number(p.value) }))
      .filter((p) => !isNaN(p.t) && !isNaN(p.v))
      .sort((a, b) => a.t - b.t);
    this.points = dps;
    this.buildChart();

    const st = d?.statistics || {};
    const lastPoint = dps.length ? dps[dps.length - 1].v : null;
    this.stats = {
      last: fmt(st.lastValue ?? lastPoint),
      min: fmt(st.min), avg: fmt(st.avg), max: fmt(st.max),
      count: Number(st.count ?? dps.length) || 0
    };
    const pattern = range === '1h' ? 'HH:mm:ss' : 'd MMM, HH:mm';
    this.rows = dps.slice().reverse().slice(0, 60)
      .map((p) => ({ ts: formatDate(p.t, pattern, this.locale), value: fmt(p.v) }));
  }

  private rangeMs(): number {
    return this.range === '1h' ? 3600e3 : this.range === '24h' ? 86400e3 : 7 * 86400e3;
  }

  private buildChart(): void {
    const W = 340, H = 150, pad = 6;
    if (this.points.length < 2) { this.path = ''; this.areaPath = ''; this.end = null; return; }
    const xs = this.points.map((p) => p.t);
    const ys = this.points.map((p) => p.v);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const sx = (t: number) => pad + (W - 2 * pad) * (t - minX) / (maxX - minX || 1);
    const sy = (v: number) => pad + (H - 2 * pad) * (1 - (v - minY) / (maxY - minY || 1));
    const pts = this.points.map((p) => `${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`);
    this.path = 'M' + pts.join(' L');
    const lastPt = this.points[this.points.length - 1];
    this.end = { x: Number(sx(lastPt.t).toFixed(1)) - 2, y: Number(sy(lastPt.v).toFixed(1)) - 2 };
    this.areaPath = `M${sx(minX).toFixed(1)},${(H - pad).toFixed(1)} L` + pts.join(' L') +
      ` L${sx(maxX).toFixed(1)},${(H - pad).toFixed(1)} Z`;
  }

  ngOnDestroy(): void {
    this.offRefresh?.();
    this.chrome.clearTitle('page');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
