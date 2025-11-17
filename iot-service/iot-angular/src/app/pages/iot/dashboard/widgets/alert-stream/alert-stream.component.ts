import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { AlertStreamResponseDto } from '@sdk/core/models/alert-stream-response-dto';

@Component({
  selector: 'dashboard-alert-stream',
  templateUrl: './alert-stream.component.html',
  styleUrls: ['./alert-stream.component.scss'],
  standalone: false
})
export class DashboardAlertStreamComponent implements OnInit, OnChanges {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() limit?: number = 10;

  alertData: AlertStreamResponseDto | null = null;
  loading = true;
  error: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadAlertStream();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ownerId'] || changes['projectId'] || changes['limit']) {
      this.loadAlertStream();
    }
  }

  loadAlertStream() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetAlertStream({
      ownerId: this.ownerId,
      projectId: this.projectId,
      limit: this.limit,
    }).subscribe({
      next: (data) => {
        this.alertData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading alert stream:', err);
        this.error = 'Failed to load alerts';
        this.loading = false;
      }
    });
  }

  getSeverityBadgeClass(severity: string): string {
    const severityMap: Record<string, string> = {
      'critical': 'badge bg-danger',
      'warning': 'badge bg-warning text-dark',
      'info': 'badge bg-info',
    };
    return severityMap[severity] || 'badge bg-secondary';
  }

  getSeverityIcon(severity: string): string {
    const iconMap: Record<string, string> = {
      'critical': 'bi-exclamation-octagon-fill',
      'warning': 'bi-exclamation-triangle-fill',
      'info': 'bi-info-circle-fill',
    };
    return iconMap[severity] || 'bi-bell-fill';
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
    return `${diffDays}d ago`;
  }
}
