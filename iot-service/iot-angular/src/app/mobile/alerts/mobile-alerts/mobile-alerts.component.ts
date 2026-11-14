import { Component, Inject, LOCALE_ID, OnDestroy, OnInit, Optional } from '@angular/core';
import { formatDate } from '@angular/common';
import { merge, Observable, of, Subject } from 'rxjs';
import { catchError, map, switchMap, take, takeUntil } from 'rxjs/operators';
import { AlertEventsService } from '@sdk/core/services/alert-events.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { listOf, parseBody, totalOf } from '@app/shared/utils/fetch-all';
import { formatDuration, telHref, timeAgoId } from '@app/shared/utils/channel-display';
import { nodeLabel, nodeSubLabel, thresholdText } from '@app/shared/utils/channel-verdict';
import { fetchActiveAlerts$, MobileProjectStore } from '../../shared/mobile-project-store.service';
import { metricLabel, toNodeLite } from '../../shared/channel-rows';
import { RefreshBusService } from '../../shared/refresh-bus.service';
import { mErrorText, mobilePoll$, ruleTypeLabel, severityLabel, severityTone, Sev } from '../../shared/labels';
import { mFormatNumber } from '../../shared/mobile-format';

interface AlertVM {
  id: string; link: any[] | null; title: string; code: string;
  sev: Sev; sevLabel: string; line: string; time: string; when: string;
  phone: string; phoneLabel: string; acked: boolean;
}

const PAGE = 20;

/**
 * Peringatan. Di dalam project (`/mobile/p/:pid/peringatan`) ter-scope `idProject`;
 * di luar project (`/mobile/alerts`, user >1 project) lintas project.
 * Aktif = status `open`, Riwayat = `cleared` (backend tidak punya status `triggered`).
 * Total dari `total` API, paginasi "Muat lagi"; galat tidak pernah ditampilkan sebagai "aman".
 */
@Component({
  selector: 'mobile-alerts',
  templateUrl: './mobile-alerts.component.html',
  standalone: false
})
export class MobileAlertsComponent implements OnInit, OnDestroy {
  loading = true;
  loadingMore = false;
  error: string | null = null;
  refreshError: string | null = null;
  filter: 'active' | 'history' = 'active';
  alerts: AlertVM[] = [];
  total = 0;
  page = 1;
  inProject = false;

  private raw: any[] = [];
  private reload$ = new Subject<void>();
  private done$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private offRefresh?: () => void;

  constructor(
    private alertSvc: AlertEventsService,
    private auto: AutoRefreshService,
    private refreshBus: RefreshBusService,
    @Optional() private store: MobileProjectStore | null,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  ngOnInit(): void {
    this.inProject = !!this.store?.pid;
    merge(mobilePoll$(this.auto), this.reload$).pipe(
      // poll hanya menyegarkan halaman 1 bila user belum memuat halaman berikutnya
      // di dalam project, daftar Aktif halaman 1 dipasok store (tanpa request ganda)
      switchMap(() => (this.page > 1 || this.fromStore() ? of(null) : this.fetch$(1))),
      takeUntil(this.destroy$)
    ).subscribe((r) => {
      if (r) { this.applyPage(r, false); }
      this.done$.next();
    });
    if (this.inProject) {
      // nilai vs ambang & telepon PIC butuh data project (store)
      this.store!.state$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (this.fromStore()) { this.applyStore(); } else { this.rebuild(); }
      });
    } else {
      // di dalam project, pull-to-refresh sudah ditangani handler store milik shell
      this.offRefresh = this.refreshBus.register(() => this.reload());
    }
  }

  setFilter(f: 'active' | 'history'): void {
    if (this.filter === f) { return; }
    this.filter = f;
    this.page = 1;
    this.loading = true;
    this.alerts = []; this.raw = [];
    if (this.fromStore()) { this.applyStore(); return; }
    this.reload$.next();
  }

  private fromStore(): boolean { return this.inProject && this.filter === 'active' && this.page === 1; }

  private applyStore(): void {
    const st = this.store!.state;
    if (st.alerts) {
      this.applyPage({ list: st.alerts.list, total: st.alerts.total, err: null }, false);
      if (st.alertsError) { this.refreshError = st.alertsError; }
    } else if (st.alertsError) {
      this.applyPage({ list: [], total: 0, err: st.alertsError }, false);
    } else {
      this.loading = st.firstLoad;
    }
  }

  reload(): Promise<void> {
    this.page = 1;
    const p = new Promise<void>((res) => this.done$.pipe(take(1), takeUntil(this.destroy$)).subscribe({ next: () => res(), complete: () => res() }));
    this.reload$.next();
    return p;
  }

  retry(): void {
    this.loading = !this.raw.length;
    if (this.fromStore()) { this.store!.refresh(); return; }
    this.reload();
  }

  more(): void {
    if (this.loadingMore) { return; }
    this.loadingMore = true;
    this.fetch$(this.page + 1).pipe(takeUntil(this.destroy$)).subscribe((r) => {
      this.loadingMore = false;
      if (r && !r.err) { this.page++; this.applyPage(r, true); } else if (r?.err) { this.refreshError = r.err; }
    });
  }

  tel(p: string): string { return telHref(p); }

  private fetch$(page: number): Observable<{ list: any[]; total: number; err: string | null }> {
    const idProject = this.store?.pid || undefined;
    const req$: Observable<{ list: any[]; total: number }> = this.filter === 'active'
      ? fetchActiveAlerts$(this.alertSvc, idProject, page, PAGE)
      : this.alertSvc.alertEventsControllerFindAll$Response({ status: 'cleared', idProject, page, limit: PAGE }).pipe(
        map((res: any) => {
          const b = parseBody(res?.body);
          const list = listOf(b);
          return { list, total: totalOf(b) ?? list.length };
        }));
    return req$.pipe(
      map((r) => ({ ...r, err: null as string | null })),
      catchError((e) => of({ list: [] as any[], total: 0, err: mErrorText(e, 'peringatan') }))
    );
  }

  private applyPage(r: { list: any[]; total: number; err: string | null }, append: boolean): void {
    this.loading = false;
    if (r.err) {
      // galat refresh: pertahankan daftar valid terakhir
      if (this.raw.length) { this.refreshError = r.err; } else { this.error = r.err; }
      return;
    }
    this.error = null; this.refreshError = null;
    this.raw = append ? this.raw.concat(r.list) : r.list;
    this.total = r.total;
    this.rebuild();
  }

  private rebuild(): void {
    const now = Date.now();
    const st = this.store?.state;
    const nodes = new Map<string, any>((st?.nodes || []).map((n) => [n.idNode, n]));
    const channels = new Map<string, any>();
    for (const s of st?.sensors || []) { for (const c of s.channels || []) { channels.set(c.idSensorChannel, c); } }
    this.alerts = this.raw.map((a) => {
      const nid = a.node?.idNode || a.idNode || '';
      const nl = toNodeLite(nodes.get(nid), a.node);
      const sc = a.alertRule?.sensorChannel;
      const type = a.alertRule?.ruleType;
      let line = ruleTypeLabel(type);
      if (type === 'node_offline' && a.value != null && !isNaN(Number(a.value))) {
        line += ` · ${formatDuration(Number(a.value) * 60_000)}`;
      } else if (sc) {
        const ch = channels.get(sc.idSensorChannel);
        const unit = sc.unit || ch?.unit || '';
        const fmt = (v: number) => mFormatNumber(v, this.locale, ch?.precision);
        line = `${metricLabel(sc.metricCode)}${a.value != null ? ' ' + fmt(Number(a.value)) + (unit ? ' ' + unit : '') : ''}`;
        if (ch) { line += ` · ${thresholdText(ch.minThreshold, ch.maxThreshold, unit, fmt)}`; }
        if (sc.sensor?.label) { line += ` · ${sc.sensor.label}`; }
      }
      const at = this.filter === 'history' ? (a.clearedAt || a.triggeredAt) : a.triggeredAt;
      const d = at ? new Date(at) : null;
      return {
        id: a.idAlertEvent || '',
        link: nid ? (this.inProject ? ['/mobile/p', this.store!.pid, 'nodes', nid] : ['/mobile/nodes', nid]) : null,
        title: nodeLabel(nl) || 'Perangkat',
        code: nodeSubLabel(nl),
        sev: severityTone(a.severity),
        sevLabel: severityLabel(a.severity),
        line,
        time: (this.filter === 'history' ? 'Selesai ' : '') + timeAgoId(at, now),
        when: d && !isNaN(d.getTime()) ? formatDate(d, 'd MMM, HH:mm', this.locale) : '',
        phone: nl.picPhone,
        phoneLabel: nl.picName || 'PIC',
        acked: a.status === 'acknowledged'
      };
    });
  }

  ngOnDestroy(): void {
    this.offRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
