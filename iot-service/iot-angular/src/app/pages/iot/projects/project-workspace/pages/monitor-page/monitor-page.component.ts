import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetBuilderService } from '../../../../../../../sdk/core/services';

@Component({
  selector: 'app-monitor-page',
  templateUrl: './monitor-page.component.html',
  styleUrls: ['./monitor-page.component.scss'],
  standalone: false
})
export class MonitorPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  projectId = '';
  dashboardId: string | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private widgetBuilderService: WidgetBuilderService
  ) {}

  ngOnInit(): void {
    // Get projectId from parent route
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
    });
    
    // Listen for dashboardId param changes
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const dashboardId = params.get('dashboardId');
      if (dashboardId) {
        // Direct dashboard view from route param
        this.dashboardId = dashboardId;
        this.loading = false;
      } else if (this.projectId) {
        // No specific dashboard - load first available for project
        this.loadFirstDashboard();
      } else {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFirstDashboard(): void {
    this.loading = true;
    this.widgetBuilderService.widgetBuilderControllerGetDashboardsByProject({ projectId: this.projectId })
      .subscribe({
        next: (dashboards: any[]) => {
          if (dashboards && dashboards.length > 0) {
            this.dashboardId = dashboards[0].idDashboard;
          } else {
            this.dashboardId = null;
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load dashboards:', err);
          this.dashboardId = null;
          this.loading = false;
        }
      });
  }

  createDashboard(): void {
    // Navigate to widget builder to create new dashboard
    this.router.navigate(['/iot/widget-builder']);
  }
}
