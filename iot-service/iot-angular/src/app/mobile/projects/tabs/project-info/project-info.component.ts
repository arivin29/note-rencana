import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProjectsService } from '@sdk/core/services/projects.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { RefreshBusService } from '../../../shared/refresh-bus.service';

@Component({
  selector: 'mobile-project-info',
  templateUrl: './project-info.component.html',
  standalone: false
})
export class MobileProjectInfoComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  d = { name: '', area: '', status: '', owner: '', total: 0, online: 0, offline: 0 };

  private destroy$ = new Subject<void>();

  constructor(
    private projectsSvc: ProjectsService,
    private route: ActivatedRoute,
    private auto: AutoRefreshService,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
  }

  load(showLoading: boolean = true): void {
    const id = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (showLoading) { this.loading = true; }
    this.error = '';
    this.projectsSvc.projectsControllerFindOneDetailed$Response({ id })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
          const d = b?.data || b || {};
          const st = d.stats || {};
          this.d = {
            name: d.name || 'Project',
            area: d.areaType || '-',
            status: d.status || '-',
            owner: d.owner?.name || d.idOwner || '-',
            total: st.totalNodes ?? 0,
            online: st.activeNodes ?? 0,
            offline: Math.max(0, (st.totalNodes ?? 0) - (st.activeNodes ?? 0))
          };
          this.loading = false;
        },
        error: (e) => { this.error = e?.message || 'Gagal memuat project'; this.loading = false; }
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
