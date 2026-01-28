import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Dashboard } from '../models/widget.models';
import { DashboardModalComponent } from '../components/dashboard-modal/dashboard-modal.component';
import { WidgetBuilderService } from 'src/sdk/core/services';

interface DashboardResponse {
  idDashboard: string;  // Backend uses idDashboard
  id?: string;          // Fallback
  name: string;
  description?: string;
  isDefault: boolean;
  idOwner: string;
  owner?: { name: string };
  widgetCount?: number;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-dashboard-list',
  standalone: false,
  templateUrl: './dashboard-list.component.html',
  styleUrls: ['./dashboard-list.component.css']
})
export class DashboardListComponent implements OnInit {
  dashboards: Dashboard[] = [];
  loading = false;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private widgetBuilderService: WidgetBuilderService
  ) {}

  ngOnInit(): void {
    this.loadDashboards();
  }

  loadDashboards(): void {
    this.loading = true;
    this.widgetBuilderService.widgetBuilderControllerGetDashboards$Response().subscribe({
      next: (response: any) => {
        // Handle both array response and wrapped response
        let data: DashboardResponse[] = [];
        if (Array.isArray(response.body)) {
          data = response.body;
        } else if (response.body && Array.isArray(response.body.dashboards)) {
          data = response.body.dashboards;
        } else if (response.body && typeof response.body === 'object') {
          // Single object, wrap in array
          data = [response.body];
        }
        
        this.dashboards = data.map((d: DashboardResponse) => ({
          id: d.idDashboard || d.id || '',
          name: d.name,
          description: d.description,
          isDefault: d.isDefault,
          ownerName: d.owner?.name || 'Unknown',
          widgetCount: d.widgetCount || 0,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt)
        }));
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load dashboards:', err);
        this.loading = false;
      }
    });
  }

  openDashboard(dashboard: Dashboard): void {
    this.router.navigate(['/iot/widget-builder', dashboard.id]);
  }

  createDashboard(): void {
    const dialogRef = this.dialog.open(DashboardModalComponent, {
      width: '500px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.widgetBuilderService.widgetBuilderControllerCreateDashboard({
          body: {
            name: result.name,
            description: result.description || ''
          }
        }).subscribe({
          next: () => {
            this.loadDashboards(); // Reload list
          },
          error: (err: any) => {
            console.error('Failed to create dashboard:', err);
            alert('Failed to create dashboard: ' + (err.error?.message || err.message));
          }
        });
      }
    });
  }

  editDashboard(event: Event, dashboard: Dashboard): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(DashboardModalComponent, {
      width: '500px',
      data: { mode: 'edit', dashboard }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.widgetBuilderService.widgetBuilderControllerUpdateDashboard({
          id: dashboard.id,
          body: {
            name: result.name,
            description: result.description
          }
        }).subscribe({
          next: () => {
            this.loadDashboards(); // Reload list
          },
          error: (err: any) => {
            console.error('Failed to update dashboard:', err);
            alert('Failed to update dashboard: ' + (err.error?.message || err.message));
          }
        });
      }
    });
  }

  deleteDashboard(event: Event, dashboard: Dashboard): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${dashboard.name}"?`)) {
      this.widgetBuilderService.widgetBuilderControllerDeleteDashboard({
        id: dashboard.id
      }).subscribe({
        next: () => {
          this.loadDashboards(); // Reload list
        },
        error: (err: any) => {
          console.error('Failed to delete dashboard:', err);
          alert('Failed to delete dashboard: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  setAsDefault(event: Event, dashboard: Dashboard): void {
    event.stopPropagation();
    this.widgetBuilderService.widgetBuilderControllerUpdateDashboard({
      id: dashboard.id,
      body: {
        isDefault: true
      }
    }).subscribe({
      next: () => {
        this.loadDashboards(); // Reload list
      },
      error: (err: any) => {
        console.error('Failed to set as default:', err);
      }
    });
  }

  getWidgetCount(dashboard: Dashboard): number {
    return dashboard.widgetCount || 0;
  }
}
