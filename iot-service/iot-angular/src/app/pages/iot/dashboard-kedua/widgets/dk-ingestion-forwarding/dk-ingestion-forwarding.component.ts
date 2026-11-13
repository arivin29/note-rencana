import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { DashboardService } from 'src/sdk/core/services';
import { TelemetryStreamsResponseDto } from 'src/sdk/core/models';

@Component({
  selector: 'dk-ingestion-forwarding',
  templateUrl: './dk-ingestion-forwarding.component.html',
  styleUrls: ['./dk-ingestion-forwarding.component.scss'],
  standalone: false,
})
export class DkIngestionForwardingComponent implements OnChanges, OnInit {
  @Input() ownerId?: string;
  @Input() projectId?: string;
  @Input() timeRange: '24h' | '7d' | '30d' = '24h';

  ingestionRate = 0;
  forwardingRate = 0;
  successRate = 0;
  channelBreakdown: { label: string; percent: number }[] = [];
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

    this.dashboardService.dashboardControllerGetTelemetryStreams(params).subscribe({
      next: (response: any) => {
        const data: TelemetryStreamsResponseDto = this.safeJsonParse(response);
        // Map real data from API
        this.ingestionRate = data.stats.totalIngested;
        this.forwardingRate = data.stats.totalForwarded;
        this.successRate = data.stats.successRate;

        // Channel breakdown from real counts only (no invented split)
        const totalForwarded = data.stats.forwarding.totalForwarded;
        if (totalForwarded > 0) {
          this.channelBreakdown = [
            { label: 'Webhook', percent: Math.round((data.stats.forwarding.webhookCount / totalForwarded) * 100) },
            { label: 'Database (batch)', percent: Math.round((data.stats.forwarding.dbBatchCount / totalForwarded) * 100) },
          ];
        } else {
          this.channelBreakdown = [];
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading telemetry streams:', err);
        this.loading = false;
        this.error = 'Gagal memuat data.';
      },
    });
  }
}
