import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Dashboard, DUMMY_DASHBOARDS } from '../models/widget.models';
import { DashboardModalComponent } from '../components/dashboard-modal/dashboard-modal.component';

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
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDashboards();
  }

  loadDashboards(): void {
    this.loading = true;
    // Simulate API call with dummy data
    setTimeout(() => {
      this.dashboards = [...DUMMY_DASHBOARDS];
      this.loading = false;
    }, 500);
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
        // Add new dashboard (mockup - just add to list)
        const newDashboard: Dashboard = {
          id: Date.now().toString(),
          name: result.name,
          description: result.description,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.dashboards = [newDashboard, ...this.dashboards];
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
        // Update dashboard (mockup)
        const index = this.dashboards.findIndex(d => d.id === dashboard.id);
        if (index !== -1) {
          this.dashboards[index] = { ...this.dashboards[index], ...result, updatedAt: new Date() };
        }
      }
    });
  }

  deleteDashboard(event: Event, dashboard: Dashboard): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${dashboard.name}"?`)) {
      this.dashboards = this.dashboards.filter(d => d.id !== dashboard.id);
    }
  }

  setAsDefault(event: Event, dashboard: Dashboard): void {
    event.stopPropagation();
    this.dashboards = this.dashboards.map(d => ({
      ...d,
      isDefault: d.id === dashboard.id
    }));
  }

  getWidgetCount(dashboard: Dashboard): number {
    return DUMMY_DASHBOARDS.find(d => d.id === dashboard.id)?.widgets?.length || 
           (dashboard.id === '1' ? 6 : Math.floor(Math.random() * 5) + 1);
  }
}
