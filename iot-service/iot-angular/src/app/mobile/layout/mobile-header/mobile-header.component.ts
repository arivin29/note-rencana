import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ViewModeService } from '@services/view-mode.service';
import { ActiveProject, ProjectContextService } from '@services/project-context.service';
import { ProjectsService } from '@sdk/core/services/projects.service';

interface ProjectItem { id: string | null; name: string; sub: string; }

/**
 * AppBar mobile. Top-level: chip project (buka sheet pilih project) + switch desktop.
 * Sub-route (back=true): tombol back + judul.
 */
@Component({
  selector: 'mobile-header',
  templateUrl: './mobile-header.component.html',
  standalone: false
})
export class MobileHeaderComponent {
  @Input() title = '';
  @Input() showBack = false;
  active$: Observable<ActiveProject> = this.projectCtx.active$;

  sheetOpen = false;
  loadingProjects = false;
  projects: ProjectItem[] = [];

  constructor(
    private viewMode: ViewModeService,
    private router: Router,
    private projectCtx: ProjectContextService,
    private location: Location,
    private projectsSvc: ProjectsService
  ) {}

  back(): void { this.location.back(); }
  goDesktop(): void { this.viewMode.set('desktop'); this.router.navigateByUrl('/iot/dashboard'); }

  get activeId(): string | null { return this.projectCtx.active.idProject; }

  openSheet(): void {
    this.sheetOpen = true;
    if (this.projects.length === 0) { this.fetchProjects(); }
  }
  closeSheet(): void { this.sheetOpen = false; }

  selectAll(): void { this.projectCtx.clear(); this.closeSheet(); }
  select(p: ProjectItem): void { this.projectCtx.set({ idProject: p.id, name: p.name }); this.closeSheet(); }
  openDetail(p: ProjectItem, ev: Event): void {
    ev.stopPropagation();
    this.closeSheet();
    if (p.id) { this.router.navigate(['/mobile/projects', p.id]); }
  }

  private fetchProjects(): void {
    this.loadingProjects = true;
    this.projectsSvc.projectsControllerFindAll$Response({ page: 1, limit: 100 }).subscribe({
      next: (res: any) => {
        let b: any = res.body;
        if (typeof b === 'string') { b = JSON.parse(b); }
        const list = (b?.data || []) as any[];
        this.projects = list.map((p) => ({
          id: p.idProject || p.id,
          name: p.name || '(tanpa nama)',
          sub: p.areaType || p.status || ''
        }));
        this.loadingProjects = false;
      },
      error: () => { this.loadingProjects = false; }
    });
  }
}
