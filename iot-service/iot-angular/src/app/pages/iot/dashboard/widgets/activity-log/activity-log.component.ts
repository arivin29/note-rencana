import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { ActivityLogResponseDto } from '@sdk/core/models/activity-log-response-dto';

@Component({
  selector: 'dashboard-activity-log',
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.scss'],
  standalone: false
})
export class DashboardActivityLogComponent implements OnInit, OnChanges {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange?: '24h' | '7d' | '30d' = '24h';
  @Input() limit?: number = 10;

  activityData: ActivityLogResponseDto | null = null;
  loading = true;
  error: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadActivityLog();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ownerId'] || changes['projectId'] || changes['timeRange'] || changes['limit']) {
      this.loadActivityLog();
    }
  }

  loadActivityLog() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetActivityLog({
      ownerId: this.ownerId,
      projectId: this.projectId,
      timeRange: this.timeRange,
      limit: this.limit,
    }).subscribe({
      next: (data) => {
        this.activityData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading activity log:', err);
        this.error = 'Failed to load activity log';
        this.loading = false;
      }
    });
  }

  getEventBadgeClass(eventType: string): string {
    const eventMap: Record<string, string> = {
      'webhook': 'badge bg-info',
      'alert': 'badge bg-danger',
      'status_change': 'badge bg-warning text-dark',
      'deployment': 'badge bg-success',
      'config_update': 'badge bg-primary',
    };
    return eventMap[eventType] || 'badge bg-secondary';
  }

  getEventIcon(eventType: string): string {
    const iconMap: Record<string, string> = {
      'webhook': 'bi-globe',
      'alert': 'bi-exclamation-triangle',
      'status_change': 'bi-arrow-left-right',
      'deployment': 'bi-plug',
      'config_update': 'bi-gear',
    };
    return iconMap[eventType] || 'bi-circle';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }
}
