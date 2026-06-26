import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AlertEventsService } from '@sdk/core/services/alert-events.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { relTime } from '../../shared/util';
import { RefreshBusService } from '../../shared/refresh-bus.service';

type Sev = 'danger' | 'warn' | 'info';
interface AlertVM {
  id: string; nodeId: string; node: string; metric: string;
  message: string; sev: Sev; sevLabel: string; time: string;
}

/** Alert (read-only fase 1): aktif + riwayat. Ack/snooze = fase lanjut. docs/mobile/05 §6. */
@Component({
  selector: 'mobile-alerts',
  templateUrl: './mobile-alerts.component.html',
  standalone: false
})
export class MobileAlertsComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  filter: 'active' | 'history' = 'active';
  alerts: AlertVM[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private alertSvc: AlertEventsService,
    private auto: AutoRefreshService,
    private router: Router,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
  }

  setFilter(f: 'active' | 'history'): void {
    if (this.filter === f) { return; }
    this.filter = f;
    this.load(true);
  }

  load(showLoading: boolean): void {
    if (showLoading) { this.loading = true; }
    const status = this.filter === 'active' ? 'triggered' : undefined;
    this.alertSvc.alertEventsControllerFindAll$Response({ page: 1, limit: 50, status })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body;
          if (typeof b === 'string') { b = JSON.parse(b); }
          const list = Array.isArray(b?.data) ? b.data : (b?.data?.data || []);
          this.alerts = (list as any[]).map((a) => this.toVM(a));
          this.loading = false;
          this.error = null;
        },
        error: (err) => { this.error = err?.message || 'Gagal memuat peringatan'; this.loading = false; }
      });
  }

  open(a: AlertVM): void { if (a.nodeId) { this.router.navigate(['/mobile/nodes', a.nodeId]); } }

  private toVM(a: any): AlertVM {
    const sev = this.mapSev(a.severity);
    return {
      id: a.idAlertEvent || a.id || '',
      nodeId: a.node?.idNode || a.idNode || '',
      node: a.node?.code || a.node?.name || '-',
      metric: a.channel?.metricCode || a.sensorChannel?.metricCode || '',
      message: a.message || a.description || 'Peringatan',
      sev,
      sevLabel: this.sevLabel(a.severity, sev),
      time: relTime(a.triggeredAt || a.createdAt)
    };
  }
  private mapSev(s: string): Sev {
    const v = (s || '').toLowerCase();
    if (v.includes('crit') || v.includes('high') || v.includes('danger')) { return 'danger'; }
    if (v.includes('warn') || v.includes('med')) { return 'warn'; }
    return 'info';
  }
  private sevLabel(raw: string, sev: Sev): string {
    if (raw) { return raw.charAt(0).toUpperCase() + raw.slice(1); }
    return sev === 'danger' ? 'Kritis' : sev === 'warn' ? 'Peringatan' : 'Info';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
