import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { DashboardService } from 'src/sdk/core/services';

interface StatisticCard {
  title: string;
  icon: string;
  iconBg: string;
  total: number;
  breakdown: {
    label: string;
    value: number;
    percentage: number;
    class: string;
  }[];
}

@Component({
  selector: 'dk-platform-statistics',
  templateUrl: './dk-platform-statistics.component.html',
  styleUrls: ['./dk-platform-statistics.component.scss'],
  standalone: false,
})
export class DkPlatformStatisticsComponent implements OnChanges, OnInit {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange: '24h' | '7d' | '30d' = '24h';

  statistics: StatisticCard[] = [];
  loading = false;
  error = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ownerId'] || changes['projectId'] || changes['timeRange']) {
      this.loadStatistics();
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

  loadStatistics(): void {
    this.loading = true;
    this.error = '';
    this.statistics = [];

    const params: any = {};
    if (this.ownerId) params.ownerId = this.ownerId;
    if (this.projectId) params.projectId = this.projectId;
    if (this.timeRange) params.timeRange = this.timeRange;

    this.dashboardService.dashboardControllerGetPlatformStats(params).subscribe({
      next: (response: any) => {
        // Parse JSON response to object safely
        const data = this.safeJsonParse(response);
        
        // Map API response to statistics cards
        const owners = data.owners;
        const projects = data.projects;
        const nodes = data.nodes;
        const sensors = data.sensors;

        this.statistics = [
          {
            title: 'Total Owners',
            icon: 'bi-briefcase',
            iconBg: 'bg-primary bg-opacity-25 text-primary',
            total: owners.total,
            breakdown: [
              {
                label: 'Active',
                value: owners.active,
                percentage: Math.round((owners.active / owners.total) * 100) || 0,
                class: 'text-success',
              },
              {
                label: 'Inactive',
                value: owners.inactive,
                percentage: Math.round((owners.inactive / owners.total) * 100) || 0,
                class: 'text-muted',
              },
            ],
          },
          {
            title: 'Total Projects',
            icon: 'bi-diagram-3',
            iconBg: 'bg-info bg-opacity-25 text-info',
            total: projects.total,
            breakdown: [
              {
                label: 'Active',
                value: projects.active,
                percentage: Math.round((projects.active / projects.total) * 100) || 0,
                class: 'text-success',
              },
              {
                label: 'Inactive',
                value: projects.inactive,
                percentage: Math.round((projects.inactive / projects.total) * 100) || 0,
                class: 'text-muted',
              },
            ],
          },
          {
            title: 'Total Nodes',
            icon: 'bi-hdd-stack',
            iconBg: 'bg-success bg-opacity-25 text-success',
            total: nodes.total,
            breakdown: [
              {
                label: 'Online',
                value: nodes.online,
                percentage: Math.round((nodes.online / nodes.total) * 100) || 0,
                class: 'text-success',
              },
              {
                label: 'Degraded',
                value: nodes.degraded,
                percentage: Math.round((nodes.degraded / nodes.total) * 100) || 0,
                class: 'text-warning',
              },
              {
                label: 'Offline',
                value: nodes.offline,
                percentage: Math.round((nodes.offline / nodes.total) * 100) || 0,
                class: 'text-danger',
              },
            ],
          },
          {
            title: 'Total Sensors',
            icon: 'bi-cpu',
            iconBg: 'bg-warning bg-opacity-25 text-warning',
            total: sensors.total,
            breakdown: [
              {
                label: 'Active',
                value: sensors.active,
                percentage: Math.round((sensors.active / sensors.total) * 100) || 0,
                class: 'text-success',
              },
              {
                label: 'Calib. Due',
                value: sensors.calibrationDue,
                percentage: Math.round((sensors.calibrationDue / sensors.total) * 100) || 0,
                class: 'text-warning',
              },
              {
                label: 'Faulty',
                value: sensors.faulty,
                percentage: Math.round((sensors.faulty / sensors.total) * 100) || 0,
                class: 'text-danger',
              },
            ],
          },
        ];

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading platform statistics:', err);
        this.loading = false;
        this.error = 'Gagal memuat data.';
      },
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getProgressBarClass(textClass: string): string {
    const classMap: { [key: string]: string } = {
      'text-success': 'bg-success',
      'text-warning': 'bg-warning',
      'text-danger': 'bg-danger',
      'text-muted': 'bg-secondary',
      'text-info': 'bg-info',
    };
    return classMap[textClass] || 'bg-secondary';
  }
}
