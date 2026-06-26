import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { AlertEventsService } from '@sdk/core/services/alert-events.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { relTime } from '../../shared/util';
import { RefreshBusService } from '../../shared/refresh-bus.service';

type Sev = 'danger' | 'warn' | 'info';
interface AttnVM { id: string; nodeId: string; node: string; message: string; sev: Sev; time: string; }

/** Dashboard ringkas (read): counts node + alert aktif + perlu perhatian. docs/mobile/05 §2. */
@Component({
  selector: 'mobile-dashboard',
  templateUrl: './mobile-dashboard.component.html',
  standalone: false
})
export class MobileDashboardComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  counts = { online: 0, offline: 0, alerts: 0, total: 0 };
  attention: AttnVM[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private nodesSvc: NodesService,
    private alertSvc: AlertEventsService,
    private auto: AutoRefreshService,
    private router: Router,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
  }

  load(showLoading: boolean): void {
    if (showLoading) { this.loading = true; }

    this.nodesSvc.nodesControllerGetStatistics$Response({})
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body;
          if (typeof b === 'string') { b = JSON.parse(b); }
          const st = b?.data || b || {};
          this.counts.total = st.totalNodes ?? 0;
          this.counts.online = st.onlineNodes ?? 0;
          this.counts.offline = Math.max(0, this.counts.total - this.counts.online);
          this.loading = false;
          this.error = null;
        },
        error: (err) => { this.error = err?.message || 'Gagal memuat ringkasan'; this.loading = false; }
      });

    this.alertSvc.alertEventsControllerFindAll$Response({ status: 'triggered', page: 1, limit: 5 })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body;
          if (typeof b === 'string') { b = JSON.parse(b); }
          const list = Array.isArray(b?.data) ? b.data : (b?.data?.data || []);
          this.counts.alerts = (b?.total ?? b?.data?.total ?? list.length) || 0;
          this.attention = (list as any[]).slice(0, 5).map((a) => ({
            id: a.idAlertEvent || '',
            nodeId: a.node?.idNode || '',
            node: a.node?.code || a.node?.name || '-',
            message: a.message || 'Peringatan',
            sev: this.mapSev(a.severity),
            time: relTime(a.triggeredAt)
          }));
        },
        error: () => { /* alert opsional, jangan blok dashboard */ }
      });
  }

  goAlerts(): void { this.router.navigate(['/mobile/alerts']); }
  goNodes(status?: string): void {
    this.router.navigate(['/mobile/nodes'], status ? { queryParams: { status } } : {});
  }
  openNode(id: string): void { if (id) { this.router.navigate(['/mobile/nodes', id]); } }

  private mapSev(s: string): Sev {
    const v = (s || '').toLowerCase();
    if (v.includes('crit') || v.includes('high')) { return 'danger'; }
    if (v.includes('warn') || v.includes('med')) { return 'warn'; }
    return 'info';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
