import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { DashboardService } from 'src/sdk/core/services';
import { AlertStreamResponseDto, AlertItem } from 'src/sdk/core/models';

interface AnomalyItem {
  sensor: string;
  location: string;
  severity: 'critical' | 'warning';
  occurrences: number;
  lastTriggered: string;
}

@Component({
  selector: 'dk-top-anomalies',
  templateUrl: './dk-top-anomalies.component.html',
  styleUrls: ['./dk-top-anomalies.component.scss'],
  standalone: false,
})
export class DkTopAnomaliesComponent implements OnChanges, OnInit {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange: '24h' | '7d' | '30d' = '24h';

  anomalies: AnomalyItem[] = [];
  loading = false;
  error = '';

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

  loadData(): void {
    this.loading = true;
    this.error = '';

    const params: any = {};
    if (this.ownerId) params.ownerId = this.ownerId; // ✅ Fixed: use ownerId
    if (this.projectId) params.projectId = this.projectId; // ✅ Fixed: use projectId
    if (this.timeRange) params.timeRange = this.timeRange;

    this.dashboardService.dashboardControllerGetAlertStream(params).subscribe({
      next: (response: any) => {
        const data: AlertStreamResponseDto = this.safeJsonParse(response);
        // Map API alerts to anomaly items
        // Group by sensor and count occurrences
        const alertMap = new Map<string, { item: AlertItem; count: number }>();

        data.alerts.forEach((alert) => {
          const key = alert.sensorCode;
          if (alertMap.has(key)) {
            const existing = alertMap.get(key)!;
            existing.count++;
          } else {
            alertMap.set(key, { item: alert, count: 1 });
          }
        });

        // Convert to anomaly items and sort by severity and count
        this.anomalies = Array.from(alertMap.values())
          .map(({ item, count }) => ({
            sensor: item.sensorCode,
            location: item.projectName,
            severity: item.severity === 'info' ? 'warning' : item.severity,
            occurrences: count,
            lastTriggered: this.formatTimestamp(item.triggeredAt),
          }))
          .sort((a, b) => {
            // Sort critical first, then by occurrences
            if (a.severity === 'critical' && b.severity !== 'critical') return -1;
            if (a.severity !== 'critical' && b.severity === 'critical') return 1;
            return b.occurrences - a.occurrences;
          })
          .slice(0, 5); // Top 5

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading alert stream:', err);
        this.loading = false;
        this.error = 'Gagal memuat data.';
      },
    });
  }

  private formatTimestamp(timestamp: string): string {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
