import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { DashboardService } from 'src/sdk/core/services';
import { ActivityLogResponseDto } from 'src/sdk/core/models';

type ActivityType = 'alert' | 'node' | 'deployment' | 'sync' | 'webhook';

interface ActivityItem {
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

@Component({
  selector: 'dk-recent-activities',
  templateUrl: './dk-recent-activities.component.html',
  styleUrls: ['./dk-recent-activities.component.scss'],
  standalone: false,
})
export class DkRecentActivitiesComponent implements OnChanges, OnInit {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange: '24h' | '7d' | '30d' = '24h';

  activities: ActivityItem[] = [];
  loading = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ownerId'] || changes['projectId'] || changes['timeRange']) {
      this.loadData();
    }
  }

  /**
   * Safely parse response - check if it's already an object or a JSON string
   */
  private safeJsonParse(response: any): any {
    if (typeof response === 'string') {
      try {
        return JSON.parse(response);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return response;
      }
    }
    return response;
  }

  private loadData(): void {
    this.loading = true;

    const params: any = {};
    if (this.ownerId) params.ownerId = this.ownerId; // ✅ Fixed: use ownerId
    if (this.projectId) params.projectId = this.projectId; // ✅ Fixed: use projectId
    if (this.timeRange) params.timeRange = this.timeRange;

    this.dashboardService.dashboardControllerGetActivityLog(params).subscribe({
      next: (response: any) => {
        const data: ActivityLogResponseDto = this.safeJsonParse(response);
        // Map API activities to component format
        this.activities = data.activities.map((activity) => ({
          type: this.mapActivityType(activity.type),
          title: activity.title,
          description: activity.description || activity.badge,
          timestamp: activity.timeAgo,
        }));

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading activity log:', err);
        this.loading = false;
        // Fallback to dummy data
        this.buildDummyTimeline();
      },
    });
  }

  private mapActivityType(apiType: string): ActivityType {
    switch (apiType) {
      case 'webhook':
        return 'webhook';
      case 'alert':
        return 'alert';
      case 'node_status':
        return 'node';
      case 'sync':
        return 'sync';
      case 'owner_update':
      case 'sensor_added':
        return 'deployment';
      default:
        return 'sync';
    }
  }

  private buildDummyTimeline(): void {
    const prefix = this.ownerId ? 'Tenant' : 'Global';
    this.activities = [
      { type: 'alert', title: `${prefix} alert resolved`, description: 'Pressure threshold normalized on Node A1', timestamp: '2 mins ago' },
      { type: 'node', title: 'Node coming online', description: 'Gateway X3 reconnected', timestamp: '12 mins ago' },
      { type: 'deployment', title: 'Firmware rollout scheduled', description: 'Release 1.14 for 38 devices', timestamp: '1 hour ago' },
      { type: 'sync', title: 'Data delivery retried', description: 'Webhook – Smart Factory', timestamp: '3 hours ago' },
    ];
  }

  badgeClass(type: ActivityType): string {
    switch (type) {
      case 'alert':
        return 'bg-danger';
      case 'node':
        return 'bg-success';
      case 'deployment':
        return 'bg-primary';
      case 'webhook':
        return 'bg-warning text-dark';
      case 'sync':
      default:
        return 'bg-info text-dark';
    }
  }
}
