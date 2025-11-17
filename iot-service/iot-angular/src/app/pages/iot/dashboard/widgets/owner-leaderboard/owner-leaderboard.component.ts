import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { OwnerLeaderboardResponseDto } from '@sdk/core/models/owner-leaderboard-response-dto';

@Component({
  selector: 'dashboard-owner-leaderboard',
  templateUrl: './owner-leaderboard.component.html',
  styleUrls: ['./owner-leaderboard.component.scss'],
  standalone: false
})
export class DashboardOwnerLeaderboardComponent implements OnInit, OnChanges {
  @Input() timeRange?: '24h' | '7d' | '30d' = '24h';
  @Input() limit?: number = 10;

  leaderboardData: OwnerLeaderboardResponseDto | null = null;
  loading = true;
  error: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadLeaderboard();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['timeRange'] || changes['limit']) {
      this.loadLeaderboard();
    }
  }

  loadLeaderboard() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetOwnerLeaderboard({
      timeRange: this.timeRange,
      limit: this.limit,
    }).subscribe({
      next: (data) => {
        this.leaderboardData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading owner leaderboard:', err);
        this.error = 'Failed to load owner leaderboard';
        this.loading = false;
      }
    });
  }

  getSlaClass(slaLevel: string): string {
    const slaMap: Record<string, string> = {
      'Platinum': 'badge bg-primary',
      'Gold': 'badge bg-warning text-dark',
      'Silver': 'badge bg-secondary',
      'Bronze': 'badge bg-brown',
    };
    return slaMap[slaLevel] || 'badge bg-secondary';
  }

  getHealthClass(health: string): string {
    const healthMap: Record<string, string> = {
      'healthy': 'text-success',
      'attention': 'text-warning',
      'risk': 'text-danger',
    };
    return healthMap[health] || 'text-muted';
  }

  getHealthIcon(health: string): string {
    const iconMap: Record<string, string> = {
      'healthy': 'bi-check-circle-fill',
      'attention': 'bi-exclamation-triangle-fill',
      'risk': 'bi-x-circle-fill',
    };
    return iconMap[health] || 'bi-question-circle-fill';
  }

  getTelemetryRateFormatted(telemetryRate: any): string {
    return telemetryRate?.formatted || '0/min';
  }
}
