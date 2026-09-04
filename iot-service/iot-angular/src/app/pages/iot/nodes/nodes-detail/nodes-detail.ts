import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ApexAxisChartSeries,
    ApexChart,
    ApexStroke,
    ApexDataLabels,
    ApexXAxis,
    ApexFill
} from 'ng-apexcharts'; 
import { AddChannelFormValue, SensorTypeOption } from './node-detail-add-channel-drawer/node-detail-add-channel-drawer.component';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { SensorLogsService } from '../../../../../sdk/core/services/sensor-logs.service';
import { SensorsService } from '../../../../../sdk/core/services/sensors.service';
import { SensorChannelsService } from '../../../../../sdk/core/services/sensor-channels.service';
import { IoTLogsService } from '../../../../../sdk/core/services/io-t-logs.service';
import { NodeModelCommandsService } from '../../../../../sdk/core/services/node-model-commands.service';
import { NodeCommandService } from '../../../../../sdk/core/services/node-command.service';
import { SensorContextService } from '../../../../../sdk/core/services/sensor-context.service';
import { NodeModelCommandResponseDto } from '../../../../../sdk/core/models/node-model-command-response-dto';
import { FlowChannelLike, FlowMeterInput, FlowMeterService } from '@services/flow-meter.service';

interface IoTLogItem {
    id: string;
    deviceId: string;
    timestamp: string;
    payload: any;
    createdAt: string;
}

interface SensorChannelRow {
    id: string;
    metric: string;
    unit: string;
    latest: number;
    decimalPlaces: number;
    status: 'ok' | 'warning' | 'critical';
    trend: 'rising' | 'falling' | 'stable';
    sensorTypeId: string;
    sensorTypeLabel: string;
}

interface TelemetryRecord {
    metric: string;
    value: string;
    detail: string;
    updatedAt: string;
}

interface MaintenanceEvent {
    date: string;
    title: string;
    description: string;
    actor: string;
}

interface ChannelChart {
    label: string;
    metric: string;
    latest: string;
    chart: {
        series: ApexAxisChartSeries;
        options: {
            chart: ApexChart;
            stroke: ApexStroke;
            dataLabels: ApexDataLabels;
            xaxis: ApexXAxis;
            fill: ApexFill;
            colors: string[];
        };
    };
}

type SensorHealth = 'active' | 'maintenance' | 'inactive';

interface SensorDetail {
    id: string;
    label: string;
    sensorCatalogId: string;
    sensorCatalogLabel: string;
    location: string;
    health: SensorHealth;
    protocolChannel?: string;
    samplingRate?: number | null;
    channels: SensorChannelRow[];
    /** Terisi hanya untuk sensor flow meter (TUF-2000M dsb) — dipakai diagram hidrolika. */
    flow?: FlowMeterInput | null;
}

@Component({
    selector: 'nodes-detail',
    templateUrl: './nodes-detail.html',
    styleUrls: ['./nodes-detail.scss'],
    standalone: false
})
export class NodesDetailPage implements OnInit, OnDestroy, OnChanges {
    // Input for embedded mode (when used outside nodes module)
    @Input() inputNodeId: string = '';
    @Input() embedded: boolean = false;

    nodeId = ''; // Node code from route (e.g., "ESP-CS-F03")
    nodeUuid = ''; // Node UUID from database (for API calls)
    idNodeProfile = ''; // Node Profile UUID
    loading = false;
    error: string | null = null;
    sensorDrawerState = {
        isOpen: false,
        sensorId: '' // Empty = add mode, UUID = edit mode
    };
    channelDrawerState = {
        isOpen: false,
        sensorId: '',
        sensorLabel: '',
        channelId: null as string | null,
        mode: 'add' as 'add' | 'edit'
    };
    mappingUpdateVisible = false;
    sensors: SensorDetail[] = [];

    nodeMeta = {
        ownerId: '',
        owner: '',
        ownerContact: '',
        ownerPhone: '',
        ownerEmail: '',
        ownerIndustry: '',
        projectId: '',
        project: '',
        projectCode: '',
        idNodeModel: '',
        model: '',
        protocol: '',
        firmware: '',
        telemetryMode: 'pull',
        telemetryInterval: '',
        // Location fields (now directly on node)
        name: '',
        description: '',
        address: '',
        city: '',
        province: '',
        postalCode: '',
        latitude: null as number | null,
        longitude: null as number | null,
        elevationM: null as number | null,
        status: '',
        installationType: '',
        enclosureRating: '',
        powerSource: '',
        // Maintenance
        commissionedAt: '',
        lastMaintenanceAt: '',
        nextMaintenanceAt: '',
        // PIC
        picName: '',
        picPhone: '',
        picEmail: '',
        // Legacy
        location: '',
        coordinates: '',
        lastMaintenance: '',
        uptime: '',
        alertsActive: 0
    };

    telemetryRecords: TelemetryRecord[] = [];
    maintenanceTimeline: MaintenanceEvent[] = [];

    channelCharts: ChannelChart[] = [];
    /** Channel yang sudah diwakili diagram hidrolika — tak perlu kartu tren sendiri. */
    private diagramChannelIds = new Set<string>();

    // IoT Logs
    iotLogs: IoTLogItem[] = [];
    iotLogsLoading = false;
    selectedLog: IoTLogItem | null = null;
    logDrawerOpen = false;

    // Node Model Commands
    nodeModelCommands: NodeModelCommandResponseDto[] = [];
    commandsLoading = false;
    commandsError = '';

    // device command modal + history
    cmdModalOpen = false;
    activeCmd: any = null;
    cmdParamValues: Record<string, string> = {};
    cmdDestination = '';
    cmdConfirmed = false;
    sendingCmd = false;
    commandLog: any[] = [];

    // Auto-refresh
    autoRefreshEnabled = false;
    autoRefreshInterval = 30;
    private autoRefreshTimer: any = null;
    lastRefreshTime: Date | null = null;
    refreshIntervals = [
        { value: 10, label: '10s' },
        { value: 20, label: '20s' },
        { value: 30, label: '30s' },
        { value: 60, label: '1m' },
        { value: 300, label: '5m' }
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private nodesService: NodesService,
        private sensorLogsService: SensorLogsService,
        private sensorsService: SensorsService,
        private sensorChannelsService: SensorChannelsService,
        private iotLogsService: IoTLogsService,
        private commandsService: NodeModelCommandsService,
        private nodeCommandService: NodeCommandService,
        private sensorContextService: SensorContextService,
        private flowMeter: FlowMeterService
    ) {
        // Only subscribe to route params if not in embedded mode
        this.route.paramMap.subscribe((params) => {
            const paramId = params.get('nodeId');
            if (paramId && !this.embedded) {
                // Route parameter is now UUID (id_node), not code
                this.nodeUuid = paramId; // Store UUID from route
                this.loadNodeDashboard(); // Load dashboard using UUID
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        // Handle embedded mode - when inputNodeId changes
        if (changes['inputNodeId'] && this.inputNodeId && this.embedded) {
            this.nodeUuid = this.inputNodeId;
            this.loadNodeDashboard();
        }
    }

    ngOnInit() {
        // For embedded mode, load with inputNodeId
        if (this.embedded && this.inputNodeId) {
            this.nodeUuid = this.inputNodeId;
            this.loadNodeDashboard();
        }
    }

    loadNodeDashboard() {
        if (!this.nodeUuid) return;

        this.loading = true;
        this.error = null;

        // Call API with UUID (not code)
        this.nodesService.nodesControllerGetDashboard$Response({ id: this.nodeUuid }).subscribe({
            next: (httpResponse) => {
                console.log('Raw httpResponse:', httpResponse);
                let dashboard: any = httpResponse.body;
                // console.log('Dashboard body type:', typeof dashboard);
                // console.log('Dashboard body:', dashboard);

                // If response is string, parse it
                if (typeof dashboard === 'string') {
                    dashboard = JSON.parse(dashboard);
                    console.log('Parsed dashboard:', dashboard);
                }

                // Map node metadata
                const node = dashboard.node || {};
                const owner = node.project?.owner || {};
                console.log('Node data:', node);
                console.log('Owner data:', owner);

                // Store node code for display (nodeUuid already set from route)
                this.nodeId = node.code || this.nodeUuid;
                this.idNodeProfile = node.idNodeProfile || ''; // Store node profile ID
                console.log('Node code for display:', this.nodeId);
                console.log('Node UUID:', this.nodeUuid);
                console.log('Node Profile ID:', this.idNodeProfile);

                this.nodeMeta = {
                    ownerId: owner.idOwner || '',
                    owner: owner.name || 'Unknown Owner',
                    ownerContact: owner.contactPerson || '-',
                    ownerPhone: owner.phone || '-',
                    ownerEmail: owner.email || '-',
                    ownerIndustry: owner.industry || '-',
                    projectId: node.project?.idProject || '',
                    project: node.project?.name || 'Unknown Project',
                    projectCode: node.project?.areaType || '-',
                    idNodeModel: node.idNodeModel || node.nodeModel?.idNodeModel || '',
                    model: node.nodeModel?.modelName || '-',
                    protocol: node.nodeModel?.protocol?.toUpperCase() || '-',
                    firmware: node.firmwareVersion || 'N/A',
                    telemetryMode: node.telemetryIntervalSec > 0 ? 'push' : 'pull',
                    telemetryInterval: node.telemetryIntervalSec ? `${node.telemetryIntervalSec}s` : '-',
                    // Location fields (now directly on node)
                    name: node.name || '',
                    description: node.description || '',
                    address: node.address || '',
                    city: node.city || '',
                    province: node.province || '',
                    postalCode: node.postalCode || '',
                    latitude: node.latitude != null ? parseFloat(node.latitude) : null,
                    longitude: node.longitude != null ? parseFloat(node.longitude) : null,
                    elevationM: node.elevationM != null ? parseFloat(node.elevationM) : null,
                    status: node.status || 'active',
                    installationType: node.installationType || '',
                    enclosureRating: node.enclosureRating || '',
                    powerSource: node.powerSource || '',
                    // Maintenance
                    commissionedAt: node.commissionedAt ? new Date(node.commissionedAt).toLocaleDateString() : '-',
                    lastMaintenanceAt: node.lastMaintenanceAt ? new Date(node.lastMaintenanceAt).toLocaleDateString() : '-',
                    nextMaintenanceAt: node.nextMaintenanceAt ? new Date(node.nextMaintenanceAt).toLocaleDateString() : '-',
                    // PIC
                    picName: node.picName || '',
                    picPhone: node.picPhone || '',
                    picEmail: node.picEmail || '',
                    // Legacy computed fields
                    location: node.address ? `${node.city || ''} - ${node.address}` : '-',
                    coordinates: (node.latitude && node.longitude) ? `${node.latitude}, ${node.longitude}` : '-',
                    lastMaintenance: node.installDate ? new Date(node.installDate).toLocaleDateString() : '-',
                    uptime: dashboard.uptime?.percentage >= 0 ? `${dashboard.uptime.percentage.toFixed(1)}%` : '-',
                    alertsActive: 0 // TODO: Implement when alerts module is ready
                };

                // Map sensors with channels
                const backendSensors = dashboard.sensorsWithData || [];
                this.sensors = backendSensors.map((sensor: any) => ({
                    id: sensor.idSensor,
                    label: sensor.sensorCode,
                    sensorCatalogId: sensor.catalogId || 'unknown',
                    sensorCatalogLabel: sensor.catalogName,
                    location: node.address ? `${node.city || ''} - ${node.address}` : '-',
                    health: this.mapSensorStatus(sensor.status),
                    protocolChannel: sensor.protocolChannel || '-',
                    samplingRate: sensor.samplingRate || null,
                    channels: (sensor.channels || [])
                        .map((channel: any) => {
                            const precision = channel.precision || 0.01;
                            const decimalPlaces = precision < 1 ? Math.abs(Math.floor(Math.log10(precision))) : 0;
                            return {
                                id: channel.idSensorChannel,
                                metric: channel.metricCode,
                                unit: channel.unit,
                                latest: channel.latestValue !== null ? parseFloat(channel.latestValue) : 0,
                                decimalPlaces,
                                status: this.mapChannelStatus(channel.status),
                                trend: 'stable' as const,
                                sensorTypeId: channel.sensorTypeId || 'unknown',
                                sensorTypeLabel: channel.sensorTypeLabel || channel.metricCode
                            };
                        })
                        // Sort channels alphabetically by metricCode
                        .sort((a: any, b: any) => (a.metric || '').localeCompare(b.metric || ''))
                }));

                // Diagram hidrolika untuk sensor flow meter (debit/kecepatan/volume + diameter pipa)
                this.buildFlowMeters(node.lastSeenAt);

                // Map telemetry records (from health and stats)
                const health = dashboard.health || {};
                const stats = node.stats || {};
                const uptime = dashboard.uptime || {};

                this.telemetryRecords = [
                    {
                        metric: 'Overall Health',
                        value: (health.overall || 'unknown').toUpperCase(),
                        detail: `Connectivity: ${health.connectivity || 'unknown'}`,
                        updatedAt: node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleString() : 'Never'
                    },
                    {
                        metric: 'Connectivity Status',
                        value: (node.connectivityStatus || 'unknown').toUpperCase(),
                        detail: health.connectivity ? `Health: ${health.connectivity}` : 'No data',
                        updatedAt: node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleString() : 'Never'
                    },
                    {
                        metric: 'Sensors Status',
                        value: `${stats.activeSensors || 0} / ${stats.totalSensors || 0}`,
                        detail: `Active sensors out of ${stats.totalSensors || 0} total`,
                        updatedAt: stats.lastTelemetry ? new Date(stats.lastTelemetry).toLocaleString() : 'No telemetry'
                    },
                    {
                        metric: 'Uptime',
                        value: `${uptime.percentage?.toFixed(1) || 0}%`,
                        detail: `${uptime.onlineHours || 0}h online of ${uptime.totalHours || 0}h total`,
                        updatedAt: uptime.lastOnline ? new Date(uptime.lastOnline).toLocaleString() : 'Never online'
                    }
                ];

                // Map maintenance timeline (from recentActivity)
                const activities = dashboard.recentActivity || [];
                this.maintenanceTimeline = activities.map((activity: any) => ({
                    date: new Date(activity.timestamp).toLocaleDateString(),
                    title: activity.type,
                    description: activity.description,
                    actor: activity.actor || 'System'
                }));

                this.loading = false;
                this.lastRefreshTime = new Date();

                // Load telemetry trends after dashboard data is ready
                if (this.nodeUuid) {
                    this.loadTelemetryTrends();
                }

                // Load IoT Logs
                if (this.nodeId) {
                    this.loadIoTLogs();
                }

                // Load Node Model Commands
                if (this.nodeMeta.idNodeModel) {
                    this.loadNodeModelCommands(this.nodeMeta.idNodeModel);
                }
            },
            error: (err) => {
                this.error = err.message || 'Failed to load node dashboard';
                this.loading = false;
                console.error('Error loading node dashboard:', err);
            }
        });
    }

    private mapSensorStatus(status: string): SensorHealth {
        if (status === 'active' || status === 'online') return 'active';
        if (status === 'maintenance') return 'maintenance';
        return 'inactive';
    }

    private mapChannelStatus(status: string): 'ok' | 'warning' | 'critical' {
        if (status === 'active' || status === 'ok') return 'ok';
        if (status === 'warning' || status === 'degraded') return 'warning';
        return 'critical';
    }

    private generateSampleData(baseValue: number): number[] {
        // Generate 7 sample points around the base value
        const data: number[] = [];
        for (let i = 0; i < 7; i++) {
            const variance = (Math.random() - 0.5) * 0.2 * baseValue;
            data.push(parseFloat((baseValue + variance).toFixed(2)));
        }
        return data;
    }

    loadTelemetryTrends() {
        if (!this.nodeUuid) {
            console.log('Node UUID not available yet, skipping telemetry load');
            return;
        }

        console.log('Loading telemetry trends for node UUID:', this.nodeUuid);

        // Load last 48 hours of telemetry data (since our seed data spans 48h)
        this.sensorLogsService.sensorLogsControllerGetTelemetryTrends({
            nodeId: this.nodeUuid, // Use UUID, not node code
            hours: 48  // 48 hours to ensure we get data from seed
        }).subscribe({
            next: (response: any) => {
                console.log('Telemetry trends:', response);

                // Map telemetry data to charts — semua channel kecuali yang sudah
                // diwakili diagram hidrolika (mis. diameter pipa).
                this.channelCharts = (response.channels || [])
                    .filter((channel: any) => !this.diagramChannelIds.has(channel.idSensorChannel))
                    .map((channel: any) => {
                    const dataPoints = channel.dataPoints || [];
                    
                    // Calculate decimal places from precision (e.g., 0.01 = 2 decimals, 0.1 = 1 decimal)
                    const precision = channel.precision || 0.01;
                    let decimalPlaces = precision < 1 ? Math.abs(Math.floor(Math.log10(precision))) : 0;
                    // guard against Infinity/NaN (e.g. precision <= 0) — toFixed() requires 0..100
                    decimalPlaces = Number.isFinite(decimalPlaces) ? Math.min(Math.max(decimalPlaces, 0), 20) : 2;
                    
                    // Format values with proper precision
                    const values = dataPoints.map((dp: any) => {
                        const val = parseFloat(dp.value);
                        return isNaN(val) ? 0 : parseFloat(val.toFixed(decimalPlaces));
                    });
                    
                    // Handle both 'timestamp' and 'ts' fields for timestamps
                    const timestamps = dataPoints.map((dp: any) => {
                        const ts = dp.timestamp || dp.ts;
                        if (!ts) return '';
                        const date = this.parseTimestamp(ts);
                        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
                    });

                    // Format latest value with precision
                    const lastValue = channel.statistics?.lastValue;
                    const formattedLastValue = lastValue !== null && lastValue !== undefined 
                        ? parseFloat(lastValue).toFixed(decimalPlaces) 
                        : '0';

                    return {
                        label: channel.sensorTypeLabel || channel.metricCode,
                        metric: channel.metricCode,
                        latest: `${formattedLastValue} ${channel.unit || ''}`.trim(),
                        chart: {
                            series: [{
                                name: channel.sensorTypeLabel || channel.metricCode,
                                data: values
                            }],
                            options: {
                                chart: {
                                    type: 'area',
                                    height: 120,
                                    sparkline: { enabled: true },
                                    toolbar: { show: false }
                                },
                                stroke: {
                                    curve: 'smooth',
                                    width: 2
                                },
                                dataLabels: {
                                    enabled: false
                                },
                                xaxis: {
                                    categories: timestamps,
                                    labels: { show: false }
                                },
                                yaxis: {
                                    labels: {
                                        formatter: (val: number) => val.toFixed(decimalPlaces)
                                    }
                                },
                                tooltip: {
                                    y: {
                                        formatter: (val: number) => `${val.toFixed(decimalPlaces)} ${channel.unit || ''}`
                                    }
                                },
                                colors: ['#00acac'],
                                fill: {
                                    type: 'gradient',
                                    gradient: {
                                        shadeIntensity: 1,
                                        opacityFrom: 0.4,
                                        opacityTo: 0.1,
                                        stops: [0, 100]
                                    }
                                }
                            }
                        }
                    };
                });
            },
            error: (err) => {
                console.error('Error loading telemetry trends:', err);
                // Keep using sample data if telemetry load fails
            }
        });
    }

    openAddSensorDrawer() {
        this.sensorDrawerState = {
            isOpen: true,
            sensorId: '' // Empty = add mode
        };
    }

    // ===== Diagram hidrolika flow meter (d / Q / V / totalizer) =====

    /** Channel dalam bentuk yang dimengerti FlowMeterService. */
    private flowChannels(sensor: SensorDetail): FlowChannelLike[] {
        return sensor.channels.map((channel) => ({
            id: channel.id,
            metric: channel.metric,
            unit: channel.unit,
            latest: channel.latest
        }));
    }

    /** Susun data diagram untuk tiap sensor flow meter, lalu lengkapi diameter dari context instalasi. */
    private buildFlowMeters(lastSeenAt?: string | null): void {
        const updatedAt = lastSeenAt ? new Date(lastSeenAt).toLocaleString('id-ID') : null;
        this.diagramChannelIds.clear();

        this.sensors.forEach((sensor) => {
            const channels = this.flowChannels(sensor);
            if (!this.flowMeter.isFlowMeter(channels, sensor.sensorCatalogLabel)) {
                sensor.flow = null;
                return;
            }

            // Diameter adalah parameter pasang, bukan tren — cukup tampil di diagram.
            const diameterCh = this.flowMeter.findChannel(channels, 'diameter');
            if (diameterCh) {
                this.diagramChannelIds.add(diameterCh.id);
            }

            sensor.flow = this.flowMeter.build(channels, updatedAt);

            // Diameter dari alat lebih diutamakan; kalau belum ada nilainya, pakai context instalasi.
            if (sensor.flow.diameterMm === null) {
                this.loadDiameterFromContext(sensor);
            }
        });
    }

    /** Ambil diameter pipa dari release context yang sedang berlaku untuk sensor ini. */
    private loadDiameterFromContext(sensor: SensorDetail): void {
        this.flowMeter.diameterFromContext(sensor.id).subscribe((diameterMm) => {
            if (diameterMm === null || !sensor.flow) return;
            // ganti referensi supaya ngOnChanges di komponen diagram ikut jalan
            sensor.flow = { ...sensor.flow, diameterMm, diameterSource: 'context' };
        });
    }

    // Installation Context drawer (per-sensor effective-dated params)
    contextDrawerOpen = false;
    contextDrawerSensorId = '';
    contextDrawerSensorLabel = '';

    openContextDrawer(sensor: SensorDetail) {
        this.contextDrawerSensorId = sensor.id;
        this.contextDrawerSensorLabel = sensor.label;
        this.contextDrawerOpen = true;
    }

    closeContextDrawer() {
        this.contextDrawerOpen = false;
        this.contextDrawerSensorId = '';
    }

    // Download node telemetry enriched with as-of installation-context params
    exportingContext = false;
    exportTelemetryWithContext() {
        if (!this.nodeUuid) return;
        this.exportingContext = true;
        this.sensorContextService.exportNode$Response({ id: this.nodeUuid }).subscribe({
            next: (res) => {
                const csv = (res.body as string) || '';
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `node-${this.nodeId || 'telemetry'}-context.csv`;
                a.click();
                URL.revokeObjectURL(url);
                this.exportingContext = false;
            },
            error: (e) => {
                alert('Export failed: ' + (e?.error?.message || e?.message || 'Unknown error'));
                this.exportingContext = false;
            }
        });
    }

    openEditSensorDrawer(sensor: SensorDetail) {
        this.sensorDrawerState = {
            isOpen: true,
            sensorId: sensor.id // UUID = edit mode
        };
    }

    handleAddSensorDrawerClose() {
        this.sensorDrawerState = {
            isOpen: false,
            sensorId: ''
        };
    }

    handleAddSensorSave(data: any) {
        this.handleAddSensorDrawerClose();

        // ✅ Reload fresh data from backend after save
        this.loadNodeDashboard();
    }

    openAddChannelDrawer(sensor: SensorDetail) {
        this.channelDrawerState = {
            isOpen: true,
            sensorId: sensor.id,
            sensorLabel: sensor.label,
            channelId: null,
            mode: 'add'
        };
    }
    
    openEditChannelDrawer(sensor: SensorDetail, channel: SensorChannelRow) {
        this.channelDrawerState = {
            isOpen: true,
            sensorId: sensor.id,
            sensorLabel: sensor.label,
            channelId: channel.id,
            mode: 'edit'
        };
        console.log('Edit channel:', channel.id);
    }

    handleAddChannelDrawerClose() {
        this.channelDrawerState = {
            isOpen: false,
            sensorId: '',
            sensorLabel: '',
            channelId: null,
            mode: 'add'
        };
    }

    handleAddChannelSave(formValue: AddChannelFormValue) {
        this.handleAddChannelDrawerClose();

        // ✅ Reload fresh data from backend after save
        this.loadNodeDashboard();
    }

    deleteSensor(sensor: SensorDetail) {
        // 1. Validate: sensor must have no channels
        if (sensor.channels && sensor.channels.length > 0) {
            alert(
                `Cannot delete sensor "${sensor.label}".\n\n` +
                `This sensor has ${sensor.channels.length} channel${sensor.channels.length > 1 ? 's' : ''}.\n` +
                `Please delete all channels before deleting the sensor.`
            );
            return;
        }

        // 2. Show detailed confirmation
        const confirmDelete = confirm(
            `Are you sure you want to delete sensor "${sensor.label}"?\n\n` +
            `This will permanently remove:\n` +
            `- Sensor configuration\n` +
            `- Sensor metadata\n` +
            `- Catalog reference: ${sensor.sensorCatalogLabel}\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmDelete) return;

        // 3. Show loading state
        this.loading = true;

        // 4. Call DELETE API
        this.sensorsService.sensorsControllerRemove({ id: sensor.id }).subscribe({
            next: () => {
                this.loading = false;
                // 5. Reload fresh data from backend (Always Reload pattern)
                this.loadNodeDashboard();
            },
            error: (err) => {
                console.error('Error deleting sensor:', err);
                this.loading = false;
                alert('Failed to delete sensor. Please try again.');
            }
        });
    }
    
    deleteChannel(sensor: SensorDetail, channel: SensorChannelRow) {
        // 1. Show detailed confirmation
        const confirmDelete = confirm(
            `Are you sure you want to delete channel "${channel.metric}"?\n\n` +
            `Sensor: ${sensor.label}\n` +
            `Channel ID: ${channel.id}\n` +
            `Metric: ${channel.metric}\n` +
            `Unit: ${channel.unit}\n\n` +
            `This will permanently remove:\n` +
            `- Channel configuration\n` +
            `- All telemetry history for this channel\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmDelete) return;

        // 2. Show loading state
        this.loading = true;

        // 3. Call DELETE API
        this.sensorChannelsService.sensorChannelsControllerRemove({ id: channel.id }).subscribe({
            next: () => {
                this.loading = false;
                // 4. Reload fresh data from backend (Always Reload pattern)
                this.loadNodeDashboard();
            },
            error: (err) => {
                console.error('Error deleting channel:', err);
                this.loading = false;
                alert('Failed to delete channel. Please try again.');
            }
        });
    }

    deleteNode() {
        // 1. Validate: node must have no sensors
        if (this.sensors && this.sensors.length > 0) {
            alert(
                `Cannot delete node "${this.nodeId}".\n\n` +
                `This node has ${this.sensors.length} sensor${this.sensors.length > 1 ? 's' : ''}.\n` +
                `Please delete all sensors before deleting the node.`
            );
            return;
        }

        // 2. Show detailed confirmation
        const confirmDelete = confirm(
            `Are you sure you want to delete node "${this.nodeId}"?\n\n` +
            `This will permanently remove:\n` +
            `- Node configuration\n` +
            `- Device specifications\n` +
            `- Owner: ${this.nodeMeta.owner}\n` +
            `- Project: ${this.nodeMeta.project}\n` +
            `- Location: ${this.nodeMeta.location}\n` +
            `- All telemetry history\n` +
            `- All maintenance logs\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmDelete) return;

        // 3. Show loading state
        this.loading = true;

        // 4. Call DELETE API using nodeUuid
        this.nodesService.nodesControllerRemove({ id: this.nodeUuid }).subscribe({
            next: () => {
                this.loading = false;
                // 5. Redirect to nodes list page (parent route)
                this.router.navigate(['/iot/nodes']);
            },
            error: (err) => {
                console.error('Error deleting node:', err);
                this.loading = false;
                alert('Failed to delete node. Please try again.');
            }
        });
    }

    badgeClass(status: SensorChannelRow['status']) {
        switch (status) {
            case 'ok':
                return 'badge bg-success';
            case 'warning':
                return 'badge bg-warning text-dark';
            default:
                return 'badge bg-danger';
        }
    }

    formatChannelValue(channel: SensorChannelRow): string {
        const v = channel?.latest;
        if (v == null || isNaN(v)) return '—';
        if (v === 0 && !channel.unit) return '—';
        const dp = Math.min(Math.max(channel?.decimalPlaces ?? 2, 0), 20);
        return v.toFixed(dp);
    }

    sensorHealthBadge(health: SensorHealth) {
        switch (health) {
            case 'active':
                return 'badge bg-success-subtle text-success';
            case 'inactive':
                return 'badge bg-warning-subtle text-warning';
            default:
                return 'badge bg-danger-subtle text-danger';
        }
    }

    private createChannelChart(label: string, unit: string, latest: string, data: number[]): ChannelChart {
        return {
            label,
            metric: unit,
            latest,
            chart: {
                series: [
                    {
                        name: label,
                        data
                    }
                ],
                options: {
                    chart: {
                        type: 'line',
                        height: 160,
                        sparkline: { enabled: true }
                    },
                    stroke: {
                        curve: 'smooth',
                        width: 3
                    },
                    dataLabels: { enabled: false },
                    xaxis: {
                        categories: ['-30m', '-25m', '-20m', '-15m', '-10m', '-5m', 'now']
                    },
                    fill: {
                        type: 'gradient',
                        gradient: {
                            opacityFrom: 0.55,
                            opacityTo: 0,
                            stops: [0, 90]
                        }
                    },
                    colors: ['#0EA5E9']
                }
            }
        };
    }

    // Mapping Update Methods
    openMappingUpdate(): void {
        console.log('Opening mapping update drawer:', {
            nodeUuid: this.nodeUuid,
            idNodeProfile: this.idNodeProfile,
            mappingUpdateVisible: this.mappingUpdateVisible
        });
        
        if (!this.idNodeProfile) {
            alert('This node does not have a profile assigned yet.');
            return;
        }
        
        this.mappingUpdateVisible = true;
    }

    onMappingUpdated(profileId: string): void {
        console.log('Mapping updated for profile:', profileId);
        // Optionally reload node data or show success message
        this.loadNodeDashboard();
    }

    onMappingUpdateClose(): void {
        this.mappingUpdateVisible = false;
    }

    // ===== IoT Logs Methods =====
    
    /**
     * Load latest 5 IoT logs for this node
     */
    loadIoTLogs(): void {
        if (!this.nodeId) return;
        
        this.iotLogsLoading = true;
        this.iotLogsService.iotLogsControllerFindAll({
            deviceId: this.nodeId,
            page: 1,
            limit: 5
        }).subscribe({
            next: (response: any) => {
                // Parse if string
                const data = typeof response === 'string' ? JSON.parse(response) : response;
                
                if (data && data.data && Array.isArray(data.data)) {
                    this.iotLogs = data.data.map((log: any) => ({
                        id: log.id || log._id,
                        deviceId: log.deviceId || log.device_id,
                        timestamp: log.timestamp,
                        payload: typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload,
                        createdAt: log.createdAt || log.created_at
                    }));
                } else {
                    this.iotLogs = [];
                }
                this.iotLogsLoading = false;
            },
            error: (err) => {
                console.error('Error loading IoT logs:', err);
                this.iotLogs = [];
                this.iotLogsLoading = false;
            }
        });
    }

    /**
     * Load command templates for this node's model
     */
    loadNodeModelCommands(idNodeModel: string): void {
        if (!idNodeModel) return;

        this.commandsLoading = true;
        this.commandsError = '';

        this.commandsService.nodeModelCommandsControllerFindByNodeModel({
            idNodeModel
        }).subscribe({
            next: (response: any) => {
                const data = typeof response === 'string' ? JSON.parse(response) : response;
                this.nodeModelCommands = Array.isArray(data) ? data : (data?.data || []);
                this.commandsLoading = false;
                this.loadCommandLog();
            },
            error: (err) => {
                console.error('Error loading commands:', err);
                this.commandsError = err.message || 'Failed to load commands';
                this.nodeModelCommands = [];
                this.commandsLoading = false;
            }
        });
    }

    // ---------- device command center ----------

    get activeCmdParams(): any[] { return this.activeCmd?.config?.params || []; }
    get activeCmdIsDanger(): boolean { return !!this.activeCmd?.config?.danger; }
    get cmdPreview(): string { return this.activeCmd ? this.renderCommand(this.activeCmd, this.cmdParamValues) : ''; }

    // render template: {device_id}/{serial}/{cmd} + {{param}} placeholders, keep SMS prefix spaces
    renderCommand(cmd: any, params: Record<string, string>): string {
        let t = (cmd.template || '')
            .replace(/\{device_id\}/g, this.nodeUuid)
            .replace(/\{serial\}/g, this.nodeId)
            .replace(/\{cmd\}/g, cmd.code || '');
        for (const [k, v] of Object.entries(params || {})) {
            t = t.replace(new RegExp('\\{\\{\\s*' + k + '\\s*\\}\\}', 'g'), (v ?? '').trim());
        }
        t = t.replace(/\{\{[^}]*\}\}/g, ''); // drop unfilled optional placeholders
        const prefix = (t.match(/^(\s*)/) || ['', ''])[1]; // preserve leading SMS prefix
        return prefix + t.slice(prefix.length).replace(/\s+/g, ' ').trimEnd();
    }

    openCommand(cmd: any): void {
        this.activeCmd = cmd;
        this.cmdParamValues = {};
        for (const p of (cmd.config?.params || [])) this.cmdParamValues[p.key] = p.default || '';
        this.cmdDestination = this.nodeMeta.picPhone || '';
        this.cmdConfirmed = false;
        this.cmdModalOpen = true;
    }
    closeCmdModal(): void { this.cmdModalOpen = false; this.activeCmd = null; }

    sendActiveCommand(): void {
        const cmd = this.activeCmd;
        if (!cmd) return;
        if (this.activeCmdIsDanger && !this.cmdConfirmed) { alert('Centang konfirmasi dulu untuk command berbahaya.'); return; }
        const channel = (cmd.channel || '').toLowerCase();
        const text = this.cmdPreview;

        // SMS: open the phone's SMS app prefilled (user taps send)
        if (channel === 'sms') {
            if (this.cmdDestination) window.open(`sms:${this.cmdDestination}?body=${encodeURIComponent(text)}`, '_blank');
            else if (navigator.clipboard) navigator.clipboard.writeText(text);
        }

        // log (and for MQTT the backend also publishes to the broker)
        this.sendingCmd = true;
        const body = {
            idCommand: cmd.idCommand, code: cmd.code, label: cmd.label, channel,
            renderedText: text, destination: this.cmdDestination, params: this.cmdParamValues,
            isRelay: !!cmd.isRelay, hasReturn: !!cmd.hasReturn
        };
        this.nodeCommandService.commandSend$Response({ id: this.nodeUuid, body }).subscribe({
            next: () => { this.sendingCmd = false; this.cmdModalOpen = false; this.loadCommandLog(); },
            error: (e) => { this.sendingCmd = false; alert('Gagal kirim: ' + (e?.error?.message || e?.message || 'Unknown error')); }
        });
    }

    copyCmdText(): void {
        if (navigator.clipboard) navigator.clipboard.writeText(this.cmdPreview);
    }

    loadCommandLog(): void {
        if (!this.nodeUuid) return;
        this.nodeCommandService.commandLogList$Response({ id: this.nodeUuid }).subscribe({
            next: (r) => { let b: any = r.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = []; } } this.commandLog = b || []; },
            error: () => {}
        });
    }

    /**
     * Open log detail drawer
     */
    openLogDetail(log: IoTLogItem): void {
        this.selectedLog = log;
        this.logDrawerOpen = true;
    }

    /**
     * Close log detail drawer
     */
    closeLogDrawer(): void {
        this.logDrawerOpen = false;
        this.selectedLog = null;
    }

    /**
     * Parse timestamp string to Date, ensuring UTC is handled correctly.
     * Timestamps without timezone indicator (Z or +/-offset) are treated as UTC.
     */
    private parseTimestamp(timestamp: string): Date {
        if (!timestamp) return new Date();
        // If timestamp doesn't have timezone indicator, append 'Z' to treat as UTC
        const hasTimezone = /Z|[+-]\d{2}:\d{2}$/.test(timestamp);
        const ts = hasTimezone ? timestamp : timestamp + 'Z';
        return new Date(ts);
    }

    /**
     * Format log timestamp for display (converted to local time)
     */
    formatLogTimestamp(timestamp: string): string {
        if (!timestamp) return '-';
        const date = this.parseTimestamp(timestamp);
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Get relative time (e.g., "2 minutes ago")
     */
    getRelativeTime(timestamp: string): string {
        if (!timestamp) return '';
        const date = this.parseTimestamp(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return `${diffSec} seconds ago`;
        if (diffMin < 60) return `${diffMin} minutes ago`;
        if (diffHour < 24) return `${diffHour} hours ago`;
        return `${diffDay} days ago`;
    }

    /**
     * Format JSON payload for display
     */
    formatPayload(payload: any): string {
        if (!payload) return '{}';
        try {
            return JSON.stringify(payload, null, 2);
        } catch {
            return String(payload);
        }
    }

    /**
     * Copy payload to clipboard
     */
    copyPayload(): void {
        if (!this.selectedLog?.payload) return;
        
        const text = this.formatPayload(this.selectedLog.payload);
        navigator.clipboard.writeText(text).then(() => {
            // Simple feedback - could use a toast service
            alert('Payload copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    // Auto-refresh methods
    ngOnDestroy() {
        this.stopAutoRefresh();
    }

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
        if (this.autoRefreshEnabled) {
            this.stopAutoRefresh();
            this.startAutoRefresh();
        }
    }

    get selectedRefreshLabel(): string {
        const interval = this.refreshIntervals.find(i => i.value === this.autoRefreshInterval);
        return interval ? interval.label : `${this.autoRefreshInterval}s`;
    }

    private startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshTimer = setInterval(() => {
            this.loadNodeDashboard();
        }, this.autoRefreshInterval * 1000);
    }

    private stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }
}
