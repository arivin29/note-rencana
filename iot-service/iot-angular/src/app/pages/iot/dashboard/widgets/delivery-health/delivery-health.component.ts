import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { DeliveryHealthResponseDto } from '@sdk/core/models/delivery-health-response-dto';

@Component({
  selector: 'dashboard-delivery-health',
  templateUrl: './delivery-health.component.html',
  styleUrls: ['./delivery-health.component.scss'],
  standalone: false
})
export class DashboardDeliveryHealthComponent implements OnInit, OnChanges {
  @Input() ownerId?: string;
  @Input() timeRange?: '24h' | '7d' | '30d' = '24h';

  deliveryData: DeliveryHealthResponseDto | null = null;
  loading = true;
  error: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDeliveryHealth();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ownerId'] || changes['timeRange']) {
      this.loadDeliveryHealth();
    }
  }

  loadDeliveryHealth() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetDeliveryHealth({
      ownerId: this.ownerId,
      timeRange: this.timeRange,
    }).subscribe({
      next: (data) => {
        this.deliveryData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading delivery health:', err);
        this.error = 'Failed to load delivery health';
        this.loading = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      'healthy': 'badge bg-success',
      'degraded': 'badge bg-warning text-dark',
      'failed': 'badge bg-danger',
    };
    return statusMap[status] || 'badge bg-secondary';
  }

  getProgressBarClass(successRate: number): string {
    if (successRate >= 95) return 'bg-success';
    if (successRate >= 80) return 'bg-warning';
    return 'bg-danger';
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
