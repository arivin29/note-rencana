import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, filter, map, switchMap, take, takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { SensorsService } from '@sdk/core/services/sensors.service';
import { AlertEventsService } from '@sdk/core/services/alert-events.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { fetchAll, listOf, parseBody, totalOf } from '@app/shared/utils/fetch-all';
import { ChannelTrend } from '@app/shared/utils/channel-display';
import { mErrorText, mobilePoll$ } from './labels';

/** Peringatan aktif: halaman pertama + total jujur (`total` dari API). */
export interface AlertsPage { list: any[]; total: number; }

export interface ProjectData {
  pid: string;
  /** true sampai muatan pertama selesai (sukses atau gagal) */
  firstLoad: boolean;
  nodes: any[] | null;
  nodesError: string | null;
  sensors: any[] | null;
  sensorsError: string | null;
  /** `/api/sensors` latestAvailable — false = sumber nilai terakhir (ClickHouse) tidak tersedia */
  latestAvailable: boolean;
  alerts: AlertsPage | null;
  alertsError: string | null;
  /** waktu muatan sukses terakhir (untuk "Diperbarui 14.05") */
  updatedAt: Date | null;
  /** muatan terakhir gagal tetapi data lama masih ditampilkan */
  refreshFailed: boolean;
}

export const OPEN_ALERTS_PAGE = 20;

/**
 * Peringatan "aktif" = status `open` + `acknowledged`. Backend hanya memfilter SATU status per
 * request, jadi dua request digabung (urut terbaru dulu) dan `total` dijumlahkan.
 */
export function fetchActiveAlerts$(svc: AlertEventsService, idProject: string | undefined, page: number, limit: number): Observable<AlertsPage> {
  const one = (status: string) => svc.alertEventsControllerFindAll$Response({ status, idProject, page, limit } as any).pipe(
    map((res: any) => {
      const b = parseBody(res?.body);
      const list = listOf(b);
      return { list, total: totalOf(b) ?? list.length } as AlertsPage;
    })
  );
  return forkJoin([one('open'), one('acknowledged')]).pipe(
    map(([a, b]) => ({
      list: a.list.concat(b.list).sort((x, y) => (Date.parse(y?.triggeredAt) || 0) - (Date.parse(x?.triggeredAt) || 0)),
      total: a.total + b.total
    }))
  );
}
const TRENDS_MS = 5 * 60_000;

/**
 * Data satu project yang dibagi semua tab di dalam shell `/mobile/p/:pid` (Ringkasan, Perangkat,
 * Channel, detail perangkat). Satu set request per siklus, bukan per tab:
 *   /nodes?idProject (fetchAll) · /sensors?idProject&activeOnly (fetchAll, ClickHouse latest)
 *   · /alert-events?status=open&idProject (halaman 1 + total)
 * Polling 60 dtk hanya saat layar terlihat; request lama dibatalkan (switchMap); muat ulang
 * yang gagal TIDAK menghapus data terakhir yang valid.
 * Tren 24 jam (/sensors/trends, 1 request untuk semua sparkline) dimuat saat pertama diminta,
 * lalu tiap 5 menit.
 *
 * Disediakan di `providers` MobileProjectShellComponent → hidup selama user di dalam project.
 */
@Injectable()
export class MobileProjectStore implements OnDestroy {
  private readonly _state$ = new BehaviorSubject<ProjectData>(this.empty(''));
  readonly state$: Observable<ProjectData> = this._state$.asObservable();

  private readonly _trends$ = new BehaviorSubject<Map<string, ChannelTrend> | null>(null);
  readonly trends$ = this._trends$.asObservable();
  trendsError: string | null = null;

  private readonly load$ = new Subject<void>();
  private readonly done$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private pollSub?: Subscription;
  private trendsSub?: Subscription;
  private trendsStarted = false;

  constructor(
    private nodesSvc: NodesService,
    private sensorsSvc: SensorsService,
    private alertSvc: AlertEventsService,
    private auto: AutoRefreshService
  ) {
    this.load$.pipe(
      switchMap(() => this.fetch$()),
      takeUntil(this.destroy$)
    ).subscribe((patch) => {
      this._state$.next({ ...this._state$.value, ...patch, firstLoad: false });
      this.done$.next();
    });
  }

  get state(): ProjectData { return this._state$.value; }
  get pid(): string { return this._state$.value.pid; }

  /** Dipanggil shell saat :pid berubah. Memulai polling. */
  setProject(pid: string): void {
    if (pid === this.pid) { return; }
    this._state$.next(this.empty(pid));
    this._trends$.next(null);
    this.trendsStarted = false;
    this.trendsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.pollSub = mobilePoll$(this.auto).pipe(takeUntil(this.destroy$)).subscribe(() => this.load$.next());
  }

  /** Muat ulang sekarang (pull-to-refresh / Coba lagi). Resolve saat data terbaru diterapkan. */
  refresh(): Promise<void> {
    const p = new Promise<void>((resolve) => this.done$.pipe(take(1)).subscribe(() => resolve()));
    this.load$.next();
    if (this.trendsStarted) { this.loadTrends(); }
    return p;
  }

  node$(nid: string): Observable<any | null> {
    return this.state$.pipe(map((s) => (s.nodes || []).find((n) => n.idNode === nid || n.code === nid) || null));
  }

  /** Mulai memuat tren 24 jam (idempotent). */
  ensureTrends(): void {
    if (this.trendsStarted || !this.pid) { return; }
    this.trendsStarted = true;
    this.trendsSub = this.auto.interval$.pipe(
      switchMap((v) => (v > 0 ? this.auto.every(TRENDS_MS) : of(0))),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadTrends());
  }

  private trendsReq?: Subscription;
  private loadTrends(): void {
    const pid = this.pid;
    this.trendsReq?.unsubscribe();
    this.trendsReq = this.sensorsSvc.sensorsControllerTrends$Response({ idProject: pid, hours: 24 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (pid !== this.pid) { return; }
          const m = new Map<string, ChannelTrend>();
          for (const t of listOf(parseBody(res?.body))) {
            if (t?.idSensorChannel) { m.set(t.idSensorChannel, { buckets: t.buckets || [], stats: t.stats || {} }); }
          }
          this._trends$.next(m);
          this.trendsError = null;
        },
        // sparkline opsional: galat tidak menghapus tren lama
        error: (e) => { this.trendsError = mErrorText(e, 'tren'); }
      });
  }

  private fetch$(): Observable<Partial<ProjectData>> {
    const pid = this.pid;
    const prev = this._state$.value;
    let latestAvailable = prev.latestAvailable;
    const wrap = <T>(o: Observable<T>, what: string) => o.pipe(
      map((data) => ({ data, err: null as string | null })),
      catchError((e) => of({ data: null as T | null, err: mErrorText(e, what) }))
    );
    return forkJoin({
      nodes: wrap(fetchAll((p) => this.nodesSvc.nodesControllerFindAll$Response({ idProject: pid, ...p })), 'perangkat'),
      sensors: wrap(fetchAll(
        (p) => this.sensorsSvc.sensorsControllerFindAll$Response({ idProject: pid, activeOnly: true, ...p }),
        (body) => { latestAvailable = body?.latestAvailable !== false; }
      ), 'channel'),
      alerts: wrap(fetchActiveAlerts$(this.alertSvc, pid, 1, OPEN_ALERTS_PAGE), 'peringatan')
    }).pipe(
      filter(() => pid === this.pid),
      map((r) => {
        const anyOk = !!(r.nodes.data || r.sensors.data || r.alerts.data);
        const anyErr = !!(r.nodes.err || r.sensors.err || r.alerts.err);
        return {
          // galat refresh → simpan data valid terakhir, tandai galatnya
          nodes: r.nodes.data ?? prev.nodes,
          nodesError: r.nodes.err,
          sensors: r.sensors.data ?? prev.sensors,
          sensorsError: r.sensors.err,
          latestAvailable,
          alerts: r.alerts.data ?? prev.alerts,
          alertsError: r.alerts.err,
          updatedAt: anyOk ? new Date() : prev.updatedAt,
          refreshFailed: anyErr
        };
      })
    );
  }

  private empty(pid: string): ProjectData {
    return {
      pid, firstLoad: true,
      nodes: null, nodesError: null,
      sensors: null, sensorsError: null, latestAvailable: true,
      alerts: null, alertsError: null,
      updatedAt: null, refreshFailed: false
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pollSub?.unsubscribe();
    this.trendsSub?.unsubscribe();
    this.trendsReq?.unsubscribe();
  }
}
