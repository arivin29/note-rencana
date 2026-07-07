import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ProjectsService } from '@sdk/core/services/projects.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { ProjectContextService } from '@services/project-context.service';
import { RefreshBusService } from '../../shared/refresh-bus.service';

type ProjStatus = 'ok' | 'warn' | 'off';
interface ProjectVM {
  id: string; name: string; area: string;
  status: ProjStatus; statusLabel: string;
  nodes: number; online: number;
}

/** Daftar project (read). Tap → set project aktif + buka detail. */
@Component({
  selector: 'mobile-projects-list',
  templateUrl: './mobile-projects-list.component.html',
  standalone: false
})
export class MobileProjectsListComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  projects: ProjectVM[] = [];
  search = '';
  activeId: string | null = null;

  private destroy$ = new Subject<void>();
  private search$ = new Subject<void>();

  constructor(
    private projectsSvc: ProjectsService,
    private auto: AutoRefreshService,
    private projectCtx: ProjectContextService,
    private router: Router,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    this.activeId = this.projectCtx.active.idProject;
    this.search$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.load(true));
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
    this.load(true);
  }

  onSearch(): void { this.search$.next(); }

  load(showLoading: boolean): void {
    if (showLoading) { this.loading = true; }
    this.projectsSvc.projectsControllerFindAll$Response({
      page: 1, limit: 100, search: this.search || undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        let b: any = res.body;
        if (typeof b === 'string') { b = JSON.parse(b); }
        const rows = (b?.data || []) as any[];
        this.projects = rows.map((p) => {
          const st = p.stats || {};
          const total = st.totalNodes ?? st.nodes ?? 0;
          const online = st.activeNodes ?? 0;
          return {
            id: p.idProject || p.id,
            name: p.name || '(tanpa nama)',
            area: p.areaType || '',
            status: this.mapStatus(p.status),
            statusLabel: this.statusLabel(p.status),
            nodes: total,
            online
          };
        });
        this.loading = false;
        this.error = null;
      },
      error: (err) => { this.error = err?.message || 'Gagal memuat project'; this.loading = false; }
    });
  }

  open(p: ProjectVM): void {
    this.projectCtx.set({ idProject: p.id, name: p.name });
    this.activeId = p.id;
    this.router.navigate(['/mobile/projects', p.id]);
  }

  private mapStatus(s: string): ProjStatus {
    const v = (s || '').toLowerCase();
    if (v === 'active' || v === 'aktif') { return 'ok'; }
    if (v === 'maintenance' || v === 'pending') { return 'warn'; }
    return 'off';
  }

  private statusLabel(s: string): string {
    const v = (s || '').toLowerCase();
    if (v === 'active' || v === 'aktif') { return 'Aktif'; }
    if (v === 'maintenance') { return 'Perawatan'; }
    if (v === 'pending') { return 'Menunggu'; }
    if (v === 'inactive' || v === 'nonaktif') { return 'Nonaktif'; }
    return s || '-';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
