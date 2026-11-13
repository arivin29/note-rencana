import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { DashboardService } from 'src/sdk/core/services';
import { NodeHealthResponseDto } from 'src/sdk/core/models';

@Component({
    selector: 'dk-nodes-status-trends',
    templateUrl: './dk-nodes-status-trends.component.html',
    styleUrls: ['./dk-nodes-status-trends.component.scss'],
    standalone: false,
})
export class DkNodesStatusTrendsComponent implements OnChanges, OnInit {
    @Input() ownerId?: string;
    @Input() projectId?: string;
    @Input() timeRange: '24h' | '7d' | '30d' = '24h';

    public statusSummary = [
        { label: 'Online', value: 0, class: 'text-success' },
        { label: 'Degraded', value: 0, class: 'text-warning' },
        { label: 'Offline', value: 0, class: 'text-danger' },
    ];
    loading = false;
    error = '';
    loaded = false;

    constructor(private dashboardService: DashboardService) {
    }

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
        if (this.ownerId) params.ownerId = this.ownerId; // ✅ Fixed: use ownerId not idOwner
        if (this.projectId) params.projectId = this.projectId; // ✅ Fixed: use projectId not idProject
        if (this.timeRange) params.timeRange = this.timeRange; 
        this.dashboardService.dashboardControllerGetNodeHealth(params).subscribe({
            next: (response: any) => {
                const data: NodeHealthResponseDto = this.safeJsonParse(response);
                // Update status summary with real data
                this.statusSummary = [
                    { label: 'Online', value: data.summary.onlineCount, class: 'text-success' },
                    { label: 'Degraded', value: data.summary.degradedCount, class: 'text-warning' },
                    { label: 'Offline', value: data.summary.offlineCount, class: 'text-danger' },
                ];

                this.loaded = true;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading node health:', err);
                this.loading = false;
                this.error = 'Gagal memuat data.';
            },
        });
    }
}
