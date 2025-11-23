import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SensorLogsService } from '../../../../../sdk/core/services/sensor-logs.service';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../sdk/core/services/sensors.service';
import { SensorChannelsService } from '../../../../../sdk/core/services/sensor-channels.service';

type TelemetryQuality = 'good' | 'warning' | 'critical';
type TelemetryTrend = 'up' | 'down' | 'flat';

interface TelemetryRow {
    idSensorChannel: string;
    channelLabel: string;
    idSensor: string;
    sensorCode?: string;
    sensorLabel?: string;
    sensorType: string;
    idNode: string;
    nodeName: string;
    nodeSerialNumber?: string;
    project: string;
    projectCode: string;
    owner: string;
    ownerCode: string;
    unit: string;
    aggregation: string;
    windowStart: string;
    windowEnd: string;
    min: number;
    avg: number;
    max: number;
    latest: number;
    points: number;
    quality: TelemetryQuality;
    trend: TelemetryTrend;
}

interface FilterOption {
    id: string;
    label: string;
}

@Component({
    selector: 'telemetry-list',
    templateUrl: './telemetry-list.html',
    styleUrls: ['./telemetry-list.scss'],
    standalone: false
})
export class TelemetryListPage implements OnInit, OnDestroy {
    aggregations = ['5m', '15m', '1h', '1d', '1M'];
    selectedAggregation = '1h';
    searchTerm = '';

    // Cascading filter options
    ownerOptions: FilterOption[] = [];
    projectOptions: FilterOption[] = [];
    nodeOptions: FilterOption[] = [];
    sensorOptions: FilterOption[] = [];
    channelOptions: FilterOption[] = [];

    // Selected filter IDs (for dropdowns)
    selectedOwnerId: string = '';
    selectedProjectId: string = '';
    selectedNodeId: string = '';
    selectedSensorId: string = '';
    selectedChannelId: string = '';

    // Query params filter (from URL - for displaying active filter card)
    ownerIdFilter: string | null = null;
    projectIdFilter: string | null = null;
    nodeIdFilter: string | null = null;
    sensorIdFilter: string | null = null;
    sensorChannelIdFilter: string | null = null;
    rangeFilter: string | null = null;

    // Loading states
    loading = false;
    error: string | null = null;

    // Pagination
    currentPage = 1;
    pageSize = 50;
    totalRecords = 0;
    exporting = false;

    // Auto-refresh like Grafana
    autoRefreshEnabled = false;
    autoRefreshInterval = 30; // seconds
    private autoRefreshTimer: any = null;
    lastRefreshTime: Date | null = null;

    refreshIntervals = [
        { value: 5, label: '5s' },
        { value: 10, label: '10s' },
        { value: 30, label: '30s' },
        { value: 60, label: '1m' },
        { value: 300, label: '5m' },
        { value: 900, label: '15m' }
    ];

    aggregationLabels: Record<string, string> = {
        '5m': '5 Menit',
        '15m': '15 Menit',
        '1h': '1 Jam',
        '1d': '1 Hari',
        '1M': '1 Bulan'
    };

    telemetry: TelemetryRow[] = [];

    constructor(
        private sensorLogsService: SensorLogsService,
        private route: ActivatedRoute,
        private router: Router,
        private ownersService: OwnersService,
        private projectsService: ProjectsService,
        private nodesService: NodesService,
        private sensorsService: SensorsService,
        private sensorChannelsService: SensorChannelsService
    ) { }

    ngOnInit() {
        // Load initial filter options
        this.loadOwners();

        // Read query params for filters
        this.route.queryParams.subscribe(params => {
            this.ownerIdFilter = params['idOwner'] || null;
            this.projectIdFilter = params['idProject'] || null;
            this.nodeIdFilter = params['idNode'] || null;
            this.sensorIdFilter = params['idSensor'] || null;
            this.sensorChannelIdFilter = params['idSensorChannel'] || null;
            this.rangeFilter = params['range'] || '24h';

            // Set selected filter values from URL
            if (this.ownerIdFilter) {
                this.selectedOwnerId = this.ownerIdFilter;
                this.loadProjects(this.ownerIdFilter);
            }
            if (this.projectIdFilter) {
                this.selectedProjectId = this.projectIdFilter;
                this.loadNodes(this.projectIdFilter);
            }
            if (this.nodeIdFilter) {
                this.selectedNodeId = this.nodeIdFilter;
                this.loadSensors(this.nodeIdFilter);
            }
            if (this.sensorIdFilter) {
                this.selectedSensorId = this.sensorIdFilter;
                this.loadChannels(this.sensorIdFilter);
            }
            if (this.sensorChannelIdFilter) {
                this.selectedChannelId = this.sensorChannelIdFilter;
            }

            // Log all filters for debugging
            if (this.ownerIdFilter || this.projectIdFilter || this.nodeIdFilter || this.sensorIdFilter || this.sensorChannelIdFilter) {
                console.log('Telemetry filters from URL:', {
                    owner: this.ownerIdFilter,
                    project: this.projectIdFilter,
                    node: this.nodeIdFilter,
                    sensor: this.sensorIdFilter,
                    channel: this.sensorChannelIdFilter
                });
            }

            this.loadTelemetryData();
        });
    }

    ngOnDestroy() {
        // Clean up auto-refresh timer
        this.stopAutoRefresh();
    }

    onAggregationChange(aggregation: string) {
        this.selectedAggregation = aggregation;

        // Reset to first page when changing aggregation
        this.currentPage = 1;

        // Reload data with new time range based on aggregation
        this.loadTelemetryData();
    }

    loadTelemetryData() {
        this.loading = true;
        this.error = null;

        const params = this.buildQueryParams(this.pageSize, this.currentPage);

        this.sensorLogsService.sensorLogsControllerFindAll$Response(params).subscribe({
            next: (httpResponse) => {
                let response: any = httpResponse.body;

                if (typeof response === 'string') {
                    response = JSON.parse(response);
                }

                this.totalRecords = response.total || 0;

                // Transform backend data to component format
                this.telemetry = (response.data || []).map((log: any) => this.mapLogToRow(log));

                this.lastRefreshTime = new Date();
                this.loading = false;
            },
            error: (err) => {
                this.error = err.message || 'Failed to load telemetry data';
                this.loading = false;
                console.error('Error loading telemetry:', err);
            }
        });
    }

    // Manual refresh / sync aggregation
    syncAggregation() {
        console.log('Syncing aggregation data...');
        this.currentPage = 1; // Reset to first page
        this.loadTelemetryData();
    }

    // Auto-refresh controls
    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;

        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    setRefreshInterval(seconds: number) {
        this.autoRefreshInterval = seconds;

        // Restart timer if auto-refresh is enabled
        if (this.autoRefreshEnabled) {
            this.stopAutoRefresh();
            this.startAutoRefresh();
        }
    }

    private startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing timer

        this.autoRefreshTimer = setInterval(() => {
            console.log(`Auto-refreshing telemetry data (interval: ${this.autoRefreshInterval}s)`);
            this.loadTelemetryData();
        }, this.autoRefreshInterval * 1000);

        console.log(`Auto-refresh started with ${this.autoRefreshInterval}s interval`);
    }

    private stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
            console.log('Auto-refresh stopped');
        }
    }

    get selectedRefreshLabel(): string {
        const interval = this.refreshIntervals.find(i => i.value === this.autoRefreshInterval);
        return interval ? interval.label : `${this.autoRefreshInterval}s`;
    }

    private determineQuality(log: any): TelemetryQuality {
        // Simple logic: check if value is within thresholds
        const value = log.valueEngineered || 0;
        const min = log.minThreshold;
        const max = log.maxThreshold;

        if (min !== undefined && max !== undefined) {
            if (value < min || value > max) {
                return 'critical';
            }
            const range = max - min;
            if (value < min + range * 0.1 || value > max - range * 0.1) {
                return 'warning';
            }
        }

        return 'good';
    }

    // Cascading filter methods
    loadOwners() {
        this.ownersService.ownersControllerFindAll$Response({ page: 1, limit: 1000 }).subscribe({
            next: (response) => {
                let body: any = response.body;
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                const owners = body.data || [];
                console.log('Loaded owners:', owners.length);
                this.ownerOptions = owners.map((o: any) => ({
                    id: o.idOwner,
                    label: o.name
                }));
            },
            error: (err) => console.error('Failed to load owners:', err)
        });
    }

    loadProjects(ownerId: string) {
        if (!ownerId) {
            this.projectOptions = [];
            return;
        }
        this.projectsService.projectsControllerFindAll$Response({
            page: 1,
            limit: 1000,
            idOwner: ownerId
        }).subscribe({
            next: (response) => {
                let body: any = response.body;
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                const projects = body.data || [];
                console.log('Loaded projects for owner', ownerId, ':', projects.length);
                this.projectOptions = projects.map((p: any) => ({
                    id: p.idProject,
                    label: p.name
                }));
            },
            error: (err) => console.error('Failed to load projects:', err)
        });
    }

    loadNodes(projectId: string) {
        if (!projectId) {
            this.nodeOptions = [];
            return;
        }
        this.nodesService.nodesControllerFindAll$Response({
            page: 1,
            limit: 1000,
            idProject: projectId
        }).subscribe({
            next: (response) => {
                let body: any = response.body;
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                const nodes = body.data || [];
                console.log('Loaded nodes for project', projectId, ':', nodes.length);
                this.nodeOptions = nodes.map((n: any) => ({
                    id: n.idNode,
                    label: n.name || n.serialNumber
                }));
            },
            error: (err) => console.error('Failed to load nodes:', err)
        });
    }

    loadSensors(nodeId: string) {
        if (!nodeId) {
            this.sensorOptions = [];
            return;
        }
        this.sensorsService.sensorsControllerFindAll$Response({
            page: 1,
            limit: 1000,
            idNode: nodeId
        }).subscribe({
            next: (response) => {
                let body: any = response.body;
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                const sensors = body.data || [];
                console.log('Loaded sensors for node', nodeId, ':', sensors.length);
                this.sensorOptions = sensors.map((s: any) => ({
                    id: s.idSensor,
                    label: s.label || s.sensorCode
                }));
            },
            error: (err) => console.error('Failed to load sensors:', err)
        });
    }

    loadChannels(sensorId: string) {
        if (!sensorId) {
            this.channelOptions = [];
            return;
        }
        this.sensorChannelsService.sensorChannelsControllerFindAll$Response({
            page: 1,
            limit: 1000,
            idSensor: sensorId
        }).subscribe({
            next: (response) => {
                let body: any = response.body;
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                const channels = body.data || [];
                console.log('Loaded channels for sensor', sensorId, ':', channels.length);
                this.channelOptions = channels.map((c: any) => ({
                    id: c.idSensorChannel,
                    label: c.metricCode
                }));
            },
            error: (err) => console.error('Failed to load channels:', err)
        });
    }

    // Cascading filter change handlers
    onOwnerChange(ownerId: string) {
        console.log('onOwnerChange called with:', ownerId);
        this.selectedOwnerId = ownerId;
        this.selectedProjectId = '';
        this.selectedNodeId = '';
        this.selectedSensorId = '';
        this.selectedChannelId = '';

        this.projectOptions = [];
        this.nodeOptions = [];
        this.sensorOptions = [];
        this.channelOptions = [];

        if (ownerId) {
            console.log('Loading projects for owner:', ownerId);
            this.loadProjects(ownerId);
        }
        this.applyFilters();
    }

    onProjectChange(projectId: string) {
        console.log('onProjectChange called with:', projectId);
        this.selectedProjectId = projectId;
        this.selectedNodeId = '';
        this.selectedSensorId = '';
        this.selectedChannelId = '';

        this.nodeOptions = [];
        this.sensorOptions = [];
        this.channelOptions = [];

        if (projectId) {
            console.log('Loading nodes for project:', projectId);
            this.loadNodes(projectId);
        }
        this.applyFilters();
    }

    onNodeChange(nodeId: string) {
        console.log('onNodeChange called with:', nodeId);
        this.selectedNodeId = nodeId;
        this.selectedSensorId = '';
        this.selectedChannelId = '';

        this.sensorOptions = [];
        this.channelOptions = [];

        if (nodeId) {
            this.loadSensors(nodeId);
        }
        this.applyFilters();
    }

    onSensorChange(sensorId: string) {
        this.selectedSensorId = sensorId;
        this.selectedChannelId = '';

        this.channelOptions = [];

        if (sensorId) {
            this.loadChannels(sensorId);
        }
        this.applyFilters();
    }

    onChannelChange(channelId: string) {
        this.selectedChannelId = channelId;
        this.applyFilters();
    }

    applyFilters() {
        const queryParams: any = {};

        if (this.selectedOwnerId) queryParams.idOwner = this.selectedOwnerId;
        if (this.selectedProjectId) queryParams.idProject = this.selectedProjectId;
        if (this.selectedNodeId) queryParams.idNode = this.selectedNodeId;
        if (this.selectedSensorId) queryParams.idSensor = this.selectedSensorId;
        if (this.selectedChannelId) queryParams.idSensorChannel = this.selectedChannelId;

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: 'merge'
        });
    }

    clearAllFilters() {
        this.selectedOwnerId = '';
        this.selectedProjectId = '';
        this.selectedNodeId = '';
        this.selectedSensorId = '';
        this.selectedChannelId = '';

        this.projectOptions = [];
        this.nodeOptions = [];
        this.sensorOptions = [];
        this.channelOptions = [];

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {}
        });
    }

    exportCsv(mode: 'raw' | '5m' | '1h') {
        if (this.exporting) {
            return;
        }
        this.exporting = true;
        const params = this.buildQueryParams(Math.max(this.pageSize, 2000), 1);
        this.sensorLogsService.sensorLogsControllerFindAll$Response(params).subscribe({
            next: (httpResponse) => {
                let response: any = httpResponse.body;
                if (typeof response === 'string') {
                    response = JSON.parse(response);
                }
                const rows = (response.data || []).map((log: any) => this.mapLogToRow(log));
                let exportRows: any[] = rows;
                let suffix = 'raw';

                if (mode === '5m' || mode === '1h') {
                    const interval = mode === '5m' ? 5 : 60;
                    suffix = mode === '5m' ? '5min' : '1hour';
                    exportRows = this.aggregateTelemetry(rows, interval);
                }

                const csv = this.convertToCsv(exportRows);
                const filename = `telemetry-${suffix}-${new Date().toISOString()}.csv`;
                this.triggerCsvDownload(csv, filename);
                this.exporting = false;
            },
            error: (err) => {
                console.error('Failed to export telemetry', err);
                this.error = err.message || 'Failed to export telemetry';
                this.exporting = false;
            }
        });
    }

    private buildQueryParams(limit: number, page: number) {
        const { startDate, endDate } = this.getAggregationRange();
        const params: any = {
            page,
            limit,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };

        // Add filters from URL query params
        if (this.ownerIdFilter) {
            params.idOwner = this.ownerIdFilter;
        }
        if (this.projectIdFilter) {
            params.idProject = this.projectIdFilter;
        }
        if (this.nodeIdFilter) {
            params.idNode = this.nodeIdFilter;
        }
        if (this.sensorIdFilter) {
            params.idSensor = this.sensorIdFilter;
        }
        if (this.sensorChannelIdFilter) {
            params.idSensorChannel = this.sensorChannelIdFilter;
        }

        return params;
    }

    private getAggregationRange() {
        const endDate = new Date();
        let startDate: Date;
        switch (this.selectedAggregation) {
            case '5m':
                startDate = new Date(endDate.getTime() - 5 * 60 * 1000);
                break;
            case '15m':
                startDate = new Date(endDate.getTime() - 15 * 60 * 1000);
                break;
            case '1h':
                startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
                break;
            case '1d':
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '1M':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        }
        return { startDate, endDate };
    }

    private mapLogToRow(log: any): TelemetryRow {
        return {
            idSensorChannel: log.idSensorChannel || 'N/A',
            channelLabel: log.channelLabel || 'Unknown Channel',
            idSensor: log.idSensor || 'N/A',
            sensorCode: log.sensorCode || '',
            sensorLabel: log.sensorLabel || '',
            sensorType: log.sensorType || 'Unknown',
            idNode: log.idNode || 'N/A',
            nodeName: log.nodeName || 'Unknown Node',
            nodeSerialNumber: log.nodeSerialNumber || '',
            project: log.projectName || 'Unknown Project',
            projectCode: log.idProject || 'N/A',
            owner: log.ownerName || 'Unknown Owner',
            ownerCode: log.idOwner || 'N/A',
            unit: log.unit || '',
            aggregation: this.selectedAggregation,
            windowStart: log.ts || new Date().toISOString(),
            windowEnd: log.ts || new Date().toISOString(),
            min: log.min ?? log.valueEngineered ?? 0,
            avg: log.avg ?? log.valueEngineered ?? 0,
            max: log.max ?? log.valueEngineered ?? 0,
            latest: log.valueEngineered ?? 0,
            points: log.points || 1,
            quality: this.determineQuality(log),
            trend: 'flat'
        };
    }

    private aggregateTelemetry(rows: TelemetryRow[], intervalMinutes: number) {
        const buckets = new Map<string, any>();
        rows.forEach((row) => {
            const baseTime = row.windowStart || row.windowEnd;
            const bucketStart = this.floorToInterval(baseTime, intervalMinutes);
            const key = `${row.idSensorChannel}_${bucketStart.toISOString()}`;

            if (!buckets.has(key)) {
                buckets.set(key, {
                    channelLabel: row.channelLabel,
                    sensorLabel: row.sensorLabel,
                    sensorType: row.sensorType,
                    nodeName: row.nodeName,
                    project: row.project,
                    owner: row.owner,
                    unit: row.unit,
                    windowStart: bucketStart,
                    sum: 0,
                    min: Number.POSITIVE_INFINITY,
                    max: Number.NEGATIVE_INFINITY,
                    points: 0
                });
            }

            const bucket = buckets.get(key);
            bucket.sum += row.latest;
            bucket.points += 1;
            bucket.min = Math.min(bucket.min, row.latest);
            bucket.max = Math.max(bucket.max, row.latest);
        });

        return Array.from(buckets.values()).map((bucket) => ({
            channelLabel: bucket.channelLabel,
            sensorLabel: bucket.sensorLabel,
            sensorType: bucket.sensorType,
            nodeName: bucket.nodeName,
            project: bucket.project,
            owner: bucket.owner,
            unit: bucket.unit,
            windowStart: bucket.windowStart.toISOString(),
            windowEnd: new Date(bucket.windowStart.getTime() + intervalMinutes * 60000).toISOString(),
            min: bucket.min === Number.POSITIVE_INFINITY ? 0 : bucket.min,
            max: bucket.max === Number.NEGATIVE_INFINITY ? 0 : bucket.max,
            avg: bucket.points ? bucket.sum / bucket.points : 0,
            latest: bucket.points ? bucket.sum / bucket.points : 0,
            points: bucket.points
        }));
    }

    private floorToInterval(dateString: string, intervalMinutes: number) {
        const date = new Date(dateString);
        const intervalMs = intervalMinutes * 60 * 1000;
        return new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
    }

    private convertToCsv(rows: any[]) {
        const headers = [
            { key: 'channelLabel', label: 'Channel' },
            { key: 'sensorLabel', label: 'Sensor' },
            { key: 'sensorType', label: 'Sensor Type' },
            { key: 'nodeName', label: 'Node' },
            { key: 'project', label: 'Project' },
            { key: 'owner', label: 'Owner' },
            { key: 'unit', label: 'Unit' },
            { key: 'windowStart', label: 'Window Start' },
            { key: 'windowEnd', label: 'Window End' },
            { key: 'min', label: 'Min' },
            { key: 'avg', label: 'Avg' },
            { key: 'max', label: 'Max' },
            { key: 'latest', label: 'Latest' },
            { key: 'points', label: 'Points' }
        ];

        const lines = [
            headers.map((h) => `"${h.label}"`).join(',')
        ];

        rows.forEach((row) => {
            const line = headers.map((h) => this.escapeCsvValue(row[h.key])).join(',');
            lines.push(line);
        });

        return lines.join('\n');
    }

    private escapeCsvValue(value: any) {
        const str = value === null || value === undefined ? '' : String(value);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    private triggerCsvDownload(content: string, filename: string) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    get filteredTelemetry() {
        const term = this.searchTerm.trim().toLowerCase();

        return this.telemetry.filter((row) => {
            const matchSearch =
                !term ||
                row.channelLabel.toLowerCase().includes(term) ||
                row.nodeName.toLowerCase().includes(term) ||
                row.project.toLowerCase().includes(term) ||
                row.owner.toLowerCase().includes(term) ||
                (row.sensorType && row.sensorType.toLowerCase().includes(term));
            return matchSearch;
        });
    }

    get totalChannels() {
        // Return total from backend (global count), not just current page
        return this.totalRecords;
    }

    get totalPoints() {
        // Return total from backend (global count)
        // Since each log is 1 point, total points = total records
        return this.totalRecords;
    }

    get uniqueNodesCount() {
        // For current page only (accurate node count needs aggregation from backend)
        return new Set(this.filteredTelemetry.map((row) => row.idNode)).size;
    }

    get selectedAggregationLabel() {
        return this.aggregationLabels[this.selectedAggregation] || this.selectedAggregation;
    }

    get windowRange() {
        const rows = this.filteredTelemetry;
        if (!rows.length) {
            return null;
        }
        const start = rows.reduce((acc, row) => (row.windowStart < acc ? row.windowStart : acc), rows[0].windowStart);
        const end = rows.reduce((acc, row) => (row.windowEnd > acc ? row.windowEnd : acc), rows[0].windowEnd);
        return { start, end };
    }

    get qualitySummary() {
        // Quality summary for current page only
        // Note: For global quality stats, backend would need to return aggregated quality counts
        const rows = this.filteredTelemetry;
        return {
            good: rows.filter((row) => row.quality === 'good').length,
            warning: rows.filter((row) => row.quality === 'warning').length,
            critical: rows.filter((row) => row.quality === 'critical').length
        };
    }

    trendIcon(trend: TelemetryTrend) {
        switch (trend) {
            case 'up':
                return 'fa-arrow-up text-success';
            case 'down':
                return 'fa-arrow-down text-danger';
            default:
                return 'fa-minus text-muted';
        }
    }

    qualityBadge(quality: TelemetryQuality) {
        switch (quality) {
            case 'good':
                return 'bg-success-subtle text-success';
            case 'warning':
                return 'bg-warning-subtle text-warning';
            case 'critical':
                return 'bg-danger-subtle text-danger';
            default:
                return 'bg-secondary text-white';
        }
    }

    // Pagination methods
    get totalPages(): number {
        return Math.ceil(this.totalRecords / this.pageSize);
    }

    get paginationStart(): number {
        return (this.currentPage - 1) * this.pageSize + 1;
    }

    get paginationEnd(): number {
        return Math.min(this.currentPage * this.pageSize, this.totalRecords);
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadTelemetryData();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadTelemetryData();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadTelemetryData();
        }
    }

    get pageNumbers(): number[] {
        const pages: number[] = [];
        const maxPages = 5; // Show max 5 page numbers

        let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    }
}
