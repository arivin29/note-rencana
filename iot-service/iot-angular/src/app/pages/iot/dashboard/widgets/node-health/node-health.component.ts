import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { NodeHealthResponseDto } from '@sdk/core/models/node-health-response-dto';

@Component({
  selector: 'dashboard-node-health',
  templateUrl: './node-health.component.html',
  styleUrls: ['./node-health.component.scss'],
  standalone: false
})
export class DashboardNodeHealthComponent implements OnInit, OnChanges {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange?: '24h' | '7d' | '30d' = '24h';
  @Input() limit?: number = 5;

  nodeHealthData: NodeHealthResponseDto | null = null;
  loading = true;
  error: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadNodeHealth();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ownerId'] || changes['projectId'] || changes['timeRange'] || changes['limit']) {
      this.loadNodeHealth();
    }
  }

  loadNodeHealth() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetNodeHealth({
      ownerId: this.ownerId,
      projectId: this.projectId,
      timeRange: this.timeRange,
      limit: this.limit,
    }).subscribe({
      next: (data) => {
        this.nodeHealthData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading node health:', err);
        this.error = 'Failed to load node health data';
        this.loading = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      'online': 'badge bg-success',
      'degraded': 'badge bg-warning',
      'offline': 'badge bg-danger',
      'inactive': 'badge bg-secondary',
    };
    return statusMap[status] || 'badge bg-secondary';
  }

  getBatteryClass(battery: number): string {
    if (battery > 50) return 'text-success';
    if (battery > 20) return 'text-warning';
    return 'text-danger';
  }

  getSignalClass(signal: number): string {
    if (signal > -80) return 'text-success';
    if (signal > -100) return 'text-warning';
    return 'text-danger';
  }

  formatLastSeen(lastSeen: string): string {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
