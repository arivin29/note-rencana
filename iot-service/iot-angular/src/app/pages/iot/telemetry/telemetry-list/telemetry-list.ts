import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EChartsOption } from 'echarts';
import { SensorLogsService } from '../../../../../sdk/core/services/sensor-logs.service';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../sdk/core/services/sensors.service';
import { SensorChannelsService } from '../../../../../sdk/core/services/sensor-channels.service';
import { environment } from '../../../../../environments/environment';

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
    selectedNodeIds: string[] = [];
    selectedSensorIds: string[] = [];
    selectedChannelIds: string[] = [];

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

    // Chart
    chartOption: EChartsOption = {};
    chartLoading = false;
    chartVisible = true;

    constructor(
        private sensorLogsService: SensorLogsService,
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
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
                this.selectedNodeIds = this.nodeIdFilter.split(',');
                this.selectedNodeIds.forEach(id => this.loadSensors(id));
            }
            if (this.sensorIdFilter) {
                this.selectedSensorIds = this.sensorIdFilter.split(',');
                this.selectedSensorIds.forEach(id => this.loadChannels(id));
            }
            if (this.sensorChannelIdFilter) {
                this.selectedChannelIds = this.sensorChannelIdFilter.split(',');
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
            this.loadChartData();
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
        this.loadChartData();
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
        this.loadChartData();
    }

    toggleChart() {
        this.chartVisible = !this.chartVisible;
    }

    loadChartData() {
        // Need at least one filter for chart endpoint
        if (!this.ownerIdFilter && !this.projectIdFilter && !this.nodeIdFilter && !this.sensorIdFilter && !this.sensorChannelIdFilter) {
            this.chartOption = {};
            return;
        }

        this.chartLoading = true;
        const hours = this.getChartHours();
        let params = `hours=${hours}&maxPoints=200`;
        if (this.ownerIdFilter) params += `&idOwner=${this.ownerIdFilter}`;
        if (this.projectIdFilter) params += `&idProject=${this.projectIdFilter}`;
        if (this.nodeIdFilter) params += `&idNode=${this.nodeIdFilter}`;
        if (this.sensorIdFilter) params += `&idSensor=${this.sensorIdFilter}`;
        if (this.sensorChannelIdFilter) params += `&idSensorChannel=${this.sensorChannelIdFilter}`;

        const url = `${environment.apiUrl}/api/sensor-logs/telemetry/chart?${params}`;
        this.http.get<any>(url).subscribe({
            next: (res) => {
                const data = res?.data || res;
                this.buildChart(data.series || []);
                this.chartLoading = false;
            },
            error: (err) => {
                console.error('Chart data error:', err);
                this.chartLoading = false;
            }
        });
    }

    private getChartHours(): number {
        switch (this.selectedAggregation) {
            case '5m': return 1;
            case '15m': return 3;
            case '1h': return 6;
            case '1d': return 24;
            case '1M': return 168; // 7 days
            default: return 6;
        }
    }

    private buildChart(series: any[]) {
        if (!series || series.length === 0) {
            this.chartOption = {};
            return;
        }

        const legend: string[] = [];
        const seriesData: any[] = [];
        const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

        series.forEach((s: any, index: number) => {
            const name = `${s.metricCode}${s.unit ? ' (' + s.unit + ')' : ''}`;
            legend.push(name);
            seriesData.push({
                name,
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 2 },
                data: (s.data || []).map((p: any) => [p.ts, p.v])
            });
        });

        this.chartOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: legend,
                bottom: 0,
                textStyle: { color: '#aaa', fontSize: 11 }
            },
            grid: {
                left: 50,
                right: 20,
                top: 10,
                bottom: legend.length > 3 ? 50 : 30
            },
            xAxis: {
                type: 'time',
                axisLabel: { color: '#888', fontSize: 10 },
                axisLine: { lineStyle: { color: '#555' } },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#888', fontSize: 10 },
                axisLine: { show: false },
                splitLine: { lineStyle: { color: '#333' } }
            },
            color: colors,
            series: seriesData
        };
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
            ownerId: ownerId
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
                const newOptions = sensors.map((s: any) => ({
                    id: s.idSensor,
                    label: s.label || s.sensorCode
                }));
                // Merge without duplicates
                newOptions.forEach((opt: FilterOption) => {
                    if (!this.sensorOptions.find(o => o.id === opt.id)) {
                        this.sensorOptions.push(opt);
                    }
                });
            },
            error: (err) => console.error('Failed to load sensors:', err)
        });
    }

    loadChannels(sensorId: string) {
        if (!sensorId) {
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
                const newOptions = channels.map((c: any) => ({
                    id: c.idSensorChannel,
                    label: c.metricCode
                }));
                // Merge without duplicates
                newOptions.forEach((opt: FilterOption) => {
                    if (!this.channelOptions.find(o => o.id === opt.id)) {
                        this.channelOptions.push(opt);
                    }
                });
            },
            error: (err) => console.error('Failed to load channels:', err)
        });
    }

    // Cascading filter change handlers
    onOwnerChange(ownerId: string) {
        this.selectedOwnerId = ownerId;
        this.selectedProjectId = '';
        this.selectedNodeIds = [];
        this.selectedSensorIds = [];
        this.selectedChannelIds = [];

        this.projectOptions = [];
        this.nodeOptions = [];
        this.sensorOptions = [];
        this.channelOptions = [];

        if (ownerId) {
            this.loadProjects(ownerId);
        }
        this.applyFilters();
    }

    onProjectChange(projectId: string) {
        this.selectedProjectId = projectId;
        this.selectedNodeIds = [];
        this.selectedSensorIds = [];
        this.selectedChannelIds = [];

        this.nodeOptions = [];
        this.sensorOptions = [];
        this.channelOptions = [];

        if (projectId) {
            this.loadNodes(projectId);
        }
        this.applyFilters();
    }

    toggleNodeSelection(nodeId: string) {
        const idx = this.selectedNodeIds.indexOf(nodeId);
        if (idx >= 0) {
            this.selectedNodeIds.splice(idx, 1);
        } else {
            this.selectedNodeIds.push(nodeId);
        }
        // Reset downstream
        this.selectedSensorIds = [];
        this.selectedChannelIds = [];
        this.sensorOptions = [];
        this.channelOptions = [];
        // Load sensors for all selected nodes
        this.selectedNodeIds.forEach(id => this.loadSensors(id));
        this.applyFilters();
    }

    toggleSensorSelection(sensorId: string) {
        const idx = this.selectedSensorIds.indexOf(sensorId);
        if (idx >= 0) {
            this.selectedSensorIds.splice(idx, 1);
        } else {
            this.selectedSensorIds.push(sensorId);
        }
        // Reset downstream
        this.selectedChannelIds = [];
        this.channelOptions = [];
        // Load channels for all selected sensors
        this.selectedSensorIds.forEach(id => this.loadChannels(id));
        this.applyFilters();
    }

    toggleChannelSelection(channelId: string) {
        const idx = this.selectedChannelIds.indexOf(channelId);
        if (idx >= 0) {
            this.selectedChannelIds.splice(idx, 1);
        } else {
            this.selectedChannelIds.push(channelId);
        }
        this.applyFilters();
    }

    applyFilters() {
        const queryParams: any = {};

        if (this.selectedOwnerId) queryParams.idOwner = this.selectedOwnerId;
        if (this.selectedProjectId) queryParams.idProject = this.selectedProjectId;
        if (this.selectedNodeIds.length) queryParams.idNode = this.selectedNodeIds.join(',');
        if (this.selectedSensorIds.length) queryParams.idSensor = this.selectedSensorIds.join(',');
        if (this.selectedChannelIds.length) queryParams.idSensorChannel = this.selectedChannelIds.join(',');

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: 'merge'
        });
    }

    clearAllFilters() {
        this.selectedOwnerId = '';
        this.selectedProjectId = '';
        this.selectedNodeIds = [];
        this.selectedSensorIds = [];
        this.selectedChannelIds = [];

        this.projectOptions = [];
        this.nodeOptions = [];
        this.sensorOptions = [];
        this.channelOptions = [];

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {}
        });
    }

    exportCsv() {
        if (this.exporting) {
            return;
        }
        this.exporting = true;
        
        // Use currently selected aggregation
        const aggregation = this.selectedAggregation;
        
        // Build query params for export API
        const params = new URLSearchParams();
        params.set('aggregation', aggregation);
        
        // Add filters from URL query params
        if (this.ownerIdFilter) {
            params.set('idOwner', this.ownerIdFilter);
        }
        if (this.projectIdFilter) {
            params.set('idProject', this.projectIdFilter);
        }
        if (this.nodeIdFilter) {
            params.set('idNode', this.nodeIdFilter);
        }
        if (this.sensorIdFilter) {
            params.set('idSensor', this.sensorIdFilter);
        }
        if (this.sensorChannelIdFilter) {
            params.set('idSensorChannel', this.sensorChannelIdFilter);
        }
        
        // Call backend export endpoint
        const url = `${environment.apiUrl}/api/sensor-logs/export?${params.toString()}`;
        
        this.http.get(url, { responseType: 'blob' }).subscribe({
            next: (blob) => {
                const filename = `telemetry-${aggregation}-${new Date().toISOString().split('T')[0]}.csv`;
                this.downloadBlob(blob, filename);
                this.exporting = false;
            },
            error: (err) => {
                console.error('Failed to export telemetry', err);
                this.error = err.message || 'Failed to export telemetry';
                this.exporting = false;
            }
        });
    }

    /**
     * Download blob as file
     */
    private downloadBlob(blob: Blob, filename: string) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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

    private buildExportQueryParams(mode: '5m' | '15m' | '1h' | '1d' | '1M', limit: number) {
        const endDate = new Date();
        let startDate: Date;

        // Determine date range based on export mode
        switch (mode) {
            case '5m':
            case '15m':
                // Last 24 hours for 5min/15min export
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '1h':
                // Last 7 days for hourly export
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '1d':
                // Last 30 days for daily export
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '1M':
                // Last 12 months for monthly export
                startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        }

        const params: any = {
            page: 1,
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
