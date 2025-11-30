import { Component, OnInit } from '@angular/core';
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

interface SensorChannelRow {
    id: string;
    metric: string;
    unit: string;
    latest: number;
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
}

@Component({
    selector: 'nodes-detail',
    templateUrl: './nodes-detail.html',
    styleUrls: ['./nodes-detail.scss'],
    standalone: false
})
export class NodesDetailPage implements OnInit {
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
        projectId: '',
        project: '',
        projectCode: '',
        model: '',
        protocol: '',
        firmware: '',
        telemetryMode: 'pull',
        telemetryInterval: '',
        location: '',
        coordinates: '',
        lastMaintenance: '',
        uptime: '',
        alertsActive: 0
    };

    telemetryRecords: TelemetryRecord[] = [];
    maintenanceTimeline: MaintenanceEvent[] = [];

    channelCharts: ChannelChart[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private nodesService: NodesService,
        private sensorLogsService: SensorLogsService,
        private sensorsService: SensorsService,
        private sensorChannelsService: SensorChannelsService
    ) {
        this.route.paramMap.subscribe((params) => {
            const paramId = params.get('nodeId');
            if (paramId) {
                // Route parameter is now UUID (id_node), not code
                this.nodeUuid = paramId; // Store UUID from route
                this.loadNodeDashboard(); // Load dashboard using UUID
            }
        });
    }

    ngOnInit() {
        // Dashboard loaded in route subscription
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
                    ownerPhone: owner.industry || '-',
                    projectId: node.project?.idProject || '',
                    project: node.project?.name || 'Unknown Project',
                    projectCode: node.project?.areaType || '-',
                    model: node.nodeModel?.modelName || '-',
                    protocol: node.nodeModel?.protocol?.toUpperCase() || '-',
                    firmware: node.firmwareVersion || 'N/A',
                    telemetryMode: node.telemetryIntervalSec > 0 ? 'push' : 'pull',
                    telemetryInterval: node.telemetryIntervalSec ? `${node.telemetryIntervalSec}s` : '-',
                    location: node.currentLocation?.address || '-',
                    coordinates: '-', // GPS coordinates not available
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
                    location: node.currentLocation?.address || '-',
                    health: this.mapSensorStatus(sensor.status),
                    protocolChannel: sensor.protocolChannel || '-',
                    samplingRate: sensor.samplingRate || null,
                    channels: (sensor.channels || []).map((channel: any) => ({
                        id: channel.idSensorChannel,
                        metric: channel.metricCode,
                        unit: channel.unit,
                        latest: channel.latestValue !== null ? parseFloat(channel.latestValue) : 0,
                        status: this.mapChannelStatus(channel.status),
                        trend: 'stable' as const,
                        sensorTypeId: channel.sensorTypeId || 'unknown',
                        sensorTypeLabel: channel.sensorTypeLabel || channel.metricCode
                    }))
                }));

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

                // Load telemetry trends after dashboard data is ready
                if (this.nodeUuid) {
                    this.loadTelemetryTrends();
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

                // Map telemetry data to charts
                this.channelCharts = (response.channels || []).slice(0, 4).map((channel: any) => {
                    const dataPoints = channel.dataPoints || [];
                    const values = dataPoints.map((dp: any) => dp.value);
                    const timestamps = dataPoints.map((dp: any) => new Date(dp.timestamp).toLocaleTimeString());

                    return {
                        label: channel.sensorTypeLabel || channel.metricCode,
                        metric: channel.metricCode,
                        latest: `${channel.statistics?.lastValue?.toFixed(2) || 0} ${channel.unit}`,
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
}
