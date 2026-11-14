import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { listOf, parseBody } from '@app/shared/utils/fetch-all';
import { MobileProjectStore } from '../../shared/mobile-project-store.service';
import { RefreshBusService } from '../../shared/refresh-bus.service';
import { mErrorText } from '../../shared/labels';
import { IoTLogsService } from '@sdk/core/services/io-t-logs.service';

interface LogVM { time: string; preview: string; pretty: string; }

/** Segmen Log: log IoT terbaru. List ringkas + tap → drawer JSON rapi. */
@Component({
  selector: 'mobile-node-logs',
  templateUrl: './mobile-node-logs.component.html',
  standalone: false
})
export class MobileNodeLogsComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  logs: LogVM[] = [];

  sheetOpen = false;
  selected: LogVM | null = null;

  refreshError = '';
  private code = '';
  private req?: Subscription;
  private onDone: (() => void) | null = null;
  private offRefresh?: () => void;
  private destroy$ = new Subject<void>();

  constructor(
    private store: MobileProjectStore,
    private logsSvc: IoTLogsService,
    private route: ActivatedRoute,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    // Kode perangkat dari store project (tanpa GET /nodes/{id} ulang). Log dimuat sekali +
    // tarik-untuk-muat-ulang / Coba lagi (35 KB per muatan — tidak dipoll).
    const nid = this.route.parent?.snapshot.paramMap.get('nid') || '';
    this.store.state$.pipe(
      map((s) => ({ s, node: (s.nodes || []).find((n) => n.idNode === nid || n.code === nid) || null })),
      filter(({ s, node }) => !!node || !s.firstLoad),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(({ node }) => {
      this.code = node?.code || nid;
      this.load(true);
    });
    this.offRefresh = this.refreshBus.register(() => this.reload());
  }

  reload(): Promise<void> {
    return new Promise<void>((res) => { this.onDone = res; this.load(false); });
  }

  load(showLoading: boolean): void {
    if (!this.code) { return; }
    if (showLoading) { this.loading = true; }
    this.req?.unsubscribe();
    this.req = this.logsSvc.iotLogsControllerFindAll$Response({ deviceId: this.code, page: 1, limit: 20 } as any)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          const b = parseBody(res?.body);
          const list = listOf(b);
          this.logs = list.map((log) => {
            let payload = log.payload;
            if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { /* keep string */ } }
            const pretty = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
            const flat = (typeof payload === 'string' ? payload : JSON.stringify(payload)) || '';
            return {
              time: this.fmt(log.timestamp || log.createdAt),
              preview: flat.length > 80 ? flat.slice(0, 80) + '…' : flat,
              pretty: pretty || ''
            };
          });
          this.loading = false; this.error = ''; this.refreshError = '';
          this.finish();
        },
        error: (e) => {
          // galat muat ulang: pertahankan log yang sudah tampil
          if (this.logs.length) { this.refreshError = mErrorText(e, 'log'); } else { this.error = mErrorText(e, 'log'); }
          this.loading = false;
          this.finish();
        }
      });
  }

  private finish(): void { const d = this.onDone; this.onDone = null; d?.(); }

  open(l: LogVM): void { this.selected = l; this.sheetOpen = true; }
  close(): void { this.sheetOpen = false; this.selected = null; }

  private fmt(iso: string): string {
    if (!iso) { return '-'; }
    const hasTz = /Z|[+-]\d{2}:\d{2}$/.test(iso);
    const d = new Date(hasTz ? iso : iso + 'Z');
    if (isNaN(d.getTime())) { return '-'; }
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  ngOnDestroy(): void { this.offRefresh?.(); this.finish(); this.destroy$.next(); this.destroy$.complete(); }
}
