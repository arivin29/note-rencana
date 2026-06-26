import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { IoTLogsService } from '@sdk/core/services/io-t-logs.service';
import { AutoRefreshService } from '@services/auto-refresh.service';

interface LogVM { time: string; preview: string; pretty: string; }

/** Tab Logs: Recent IoT Logs. List ringkas + tap → drawer JSON rapi. */
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

  private code = '';
  private destroy$ = new Subject<void>();

  constructor(
    private nodesSvc: NodesService,
    private logsSvc: IoTLogsService,
    private route: ActivatedRoute,
    private auto: AutoRefreshService
  ) {}

  ngOnInit(): void {
    const uuid = this.route.parent?.snapshot.paramMap.get('id') || '';
    this.nodesSvc.nodesControllerFindOne$Response({ id: uuid }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
        const node = b?.data || b || {};
        this.code = node.code || uuid;
        this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
      },
      error: () => { this.code = uuid; this.load(true); }
    });
  }

  load(showLoading: boolean): void {
    if (showLoading) { this.loading = true; }
    this.logsSvc.iotLogsControllerFindAll$Response({ deviceId: this.code, page: 1, limit: 20 } as any)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
          const list = (b?.data || []) as any[];
          this.logs = list.map((log) => {
            let payload = log.payload;
            if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { /* keep string */ } }
            const pretty = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
            const flat = typeof payload === 'string' ? payload : JSON.stringify(payload);
            return {
              time: this.fmt(log.timestamp || log.createdAt),
              preview: flat.length > 80 ? flat.slice(0, 80) + '…' : flat,
              pretty
            };
          });
          this.loading = false; this.error = '';
        },
        error: (e) => { this.error = e?.message || 'Gagal memuat logs'; this.loading = false; }
      });
  }

  open(l: LogVM): void { this.selected = l; this.sheetOpen = true; }
  close(): void { this.sheetOpen = false; this.selected = null; }

  private fmt(iso: string): string {
    if (!iso) { return '-'; }
    const hasTz = /Z|[+-]\d{2}:\d{2}$/.test(iso);
    const d = new Date(hasTz ? iso : iso + 'Z');
    if (isNaN(d.getTime())) { return '-'; }
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
