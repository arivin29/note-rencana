import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, skip, takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { ProjectContextService } from '@services/project-context.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { relTime } from '../../shared/util';
import { RefreshBusService } from '../../shared/refresh-bus.service';

type NodeStatus = 'online' | 'offline' | 'degraded';
interface NodeVM {
  id: string; code: string; status: NodeStatus; lastSeen: string;
  location: string; picName: string; picPhone: string;
}

/** Daftar perangkat (read), ter-scope project aktif. docs/mobile/05 §3. */
@Component({
  selector: 'mobile-nodes-list',
  templateUrl: './mobile-nodes-list.component.html',
  standalone: false
})
export class MobileNodesListComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  nodes: NodeVM[] = [];
  search = '';
  statusFilter: string | null = null;

  private allNodes: NodeVM[] = [];
  private destroy$ = new Subject<void>();
  private search$ = new Subject<void>();
  // Bila dipakai sbg tab di project detail (/mobile/projects/:id/nodes), scope dari route.
  private scopedProjectId: string | null = null;

  constructor(
    private nodesSvc: NodesService,
    private projectCtx: ProjectContextService,
    private auto: AutoRefreshService,
    private router: Router,
    private route: ActivatedRoute,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    this.scopedProjectId = this.route.parent?.snapshot.paramMap.get('id') || null;
    this.search$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.load(true));
    // Hanya ikut project aktif global kalau TIDAK di-scope oleh route project.
    if (!this.scopedProjectId) {
      this.projectCtx.active$.pipe(skip(1), takeUntil(this.destroy$)).subscribe(() => this.load(true));
    }
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
    // Filter status dari query param (mis. dari dashboard: ?status=online|offline)
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((q) => {
      this.statusFilter = q.get('status');
      this.nodes = this.applyStatus(this.allNodes);
    });
  }

  private applyStatus(list: NodeVM[]): NodeVM[] {
    if (!this.statusFilter) { return list; }
    if (this.statusFilter === 'online') { return list.filter((n) => n.status === 'online'); }
    return list.filter((n) => n.status !== 'online'); // offline = tidak online (offline + degraded)
  }

  clearStatus(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { status: null }, queryParamsHandling: 'merge' });
  }

  onSearch(): void { this.search$.next(); }

  load(showLoading: boolean): void {
    if (showLoading) { this.loading = true; }
    const idProject = this.scopedProjectId || this.projectCtx.active.idProject || undefined;
    this.nodesSvc.nodesControllerFindAll$Response({
      page: 1, limit: 50, search: this.search || undefined, idProject
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        let b: any = res.body;
        if (typeof b === 'string') { b = JSON.parse(b); }
        const rows = (b?.data || []) as any[];
        this.allNodes = rows.map((n) => ({
          id: n.idNode || n.id,
          code: n.code || n.name || '(tanpa kode)',
          status: this.mapStatus(n.connectivityStatus),
          lastSeen: relTime(n.lastSeenAt),
          location: [n.city, n.province].filter(Boolean).join(', ') || n.address || '',
          picName: n.picName || '',
          picPhone: n.picPhone || ''
        }));
        this.nodes = this.applyStatus(this.allNodes);
        this.loading = false;
        this.error = null;
      },
      error: (err) => { this.error = err?.message || 'Gagal memuat perangkat'; this.loading = false; }
    });
  }

  open(id: string): void { this.router.navigate(['/mobile/nodes', id]); }

  private mapStatus(s: string): NodeStatus {
    return s === 'online' ? 'online' : s === 'degraded' ? 'degraded' : 'offline';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
