import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { NodesService, SensorsService } from 'src/sdk/core/services';
import { SensorCatalog, AddedSensor, AddedChannel, SensorChannelTemplate } from '../../pairing-workspace.types';

@Component({
    selector: 'pw-step-sensor-config',
    templateUrl: './step-sensor-config.component.html',
    styleUrls: ['./step-sensor-config.component.scss'],
    standalone: false
})
export class StepSensorConfigComponent implements OnInit, OnChanges {
    @Output() sensorsChange = new EventEmitter<AddedSensor[]>();
    @Output() validationChange = new EventEmitter<boolean>();

    @Input('idNode') id_node: string | null = null;
    addedSensors: AddedSensor[] = [];

    sensorDrawerState = {
        isOpen: false,
        sensorId: ''
    };

    channelDrawerState = {
        isOpen: false,
        sensorId: '',
        sensorLabel: '',
        channelId: null as string | null,
        mode: 'add' as 'add' | 'edit'
    };

    constructor(
        private nodesService: NodesService,
        private sensorsService: SensorsService
    ) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['id_node']) {
            if (this.id_node) {
                this.loadNodeFromServer();
            } else {
                this.addedSensors = [];
                this.emitChanges();
            }
        }
    }

    ngOnInit(): void {
        this.emitValidation();
        if (this.id_node) {
            this.loadNodeFromServer();
        }
    }

    loadNodeFromServer(): void {
        if (!this.id_node) {
            return;
        }

        this.nodesService.nodesControllerGetDashboard$Response({ id: this.id_node }).subscribe({
            next: (response: any) => {
                const dashboard = this.extractDashboard(response);
                const mappedSensors = this.mapSensorsFromDashboard(dashboard);
                this.addedSensors = mappedSensors;
                this.emitChanges();
                console.log('Loaded node data:', dashboard);
            },
            error: (err) => {
                console.error('Failed to load node data', err);
                this.addedSensors = [];
                this.emitChanges();
            }
        });
    }

    openAddSensorDrawer(): void {
        if (!this.id_node) {
            alert('Please select a node first');
            return;
        }

        this.sensorDrawerState = {
            isOpen: true,
            sensorId: ''
        };
    }

    openEditSensorDrawer(sensor: AddedSensor): void {
        this.sensorDrawerState = {
            isOpen: true,
            sensorId: sensor.tempId
        };
    }

    handleSensorDrawerClose(): void {
        this.sensorDrawerState = {
            isOpen: false,
            sensorId: ''
        };
    }

    handleSensorDrawerSave(): void {
        this.handleSensorDrawerClose();
        this.loadNodeFromServer();
    }

    openAddChannelDrawer(sensor: AddedSensor): void {
        this.channelDrawerState = {
            isOpen: true,
            sensorId: sensor.tempId,
            sensorLabel: sensor.label,
            channelId: null,
            mode: 'add'
        };
    }

    handleChannelDrawerClose(): void {
        this.channelDrawerState = {
            isOpen: false,
            sensorId: '',
            sensorLabel: '',
            channelId: null,
            mode: 'add'
        };
    }

    handleChannelDrawerSave(): void {
        this.handleChannelDrawerClose();
        this.loadNodeFromServer();
    }

    deleteSensor(sensor: AddedSensor): void {
        if (!sensor.tempId) {
            return;
        }

        if (sensor.channels && sensor.channels.length > 0) {
            alert(`Cannot delete sensor "${sensor.label}". Please remove all channels first.`);
            return;
        }

        const confirmDelete = confirm(`Delete sensor "${sensor.label}"? This action cannot be undone.`);
        if (!confirmDelete) {
            return;
        }

        this.sensorsService.sensorsControllerRemove({ id: sensor.tempId }).subscribe({
            next: () => {
                this.loadNodeFromServer();
            },
            error: (err) => {
                console.error('Failed to delete sensor', err);
                alert('Failed to delete sensor. Please try again.');
            }
        });
    }

    handleToggleChannel(channel: AddedChannel): void {
        channel.enabled = !channel.enabled;
        if (!channel.enabled) {
            channel.mappedField = undefined;
        }
        this.emitChanges();
    }

    private emitChanges(): void {
        this.sensorsChange.emit(this.addedSensors);
        this.emitValidation();
    }

    private emitValidation(): void {
        const isValid = this.addedSensors.length > 0;
        this.validationChange.emit(isValid);
    }

    private extractDashboard(response: any): any {
        let payload = response?.body ?? response;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (error) {
                console.error('Failed to parse dashboard response', error);
                return {};
            }
        }
        return payload?.data ?? payload ?? {};
    }

    private mapSensorsFromDashboard(dashboard: any): AddedSensor[] {
        const sensorsSource = Array.isArray(dashboard?.sensorsWithData)
            ? dashboard.sensorsWithData
            : Array.isArray(dashboard?.sensors)
                ? dashboard.sensors
                : [];
        const node = dashboard?.node || {};

        return sensorsSource.map((sensor: any, index: number) => this.mapSensor(sensor, node, index));
    }

    private mapSensor(sensor: any, node: any, index: number): AddedSensor {
        const channelEntries = this.mapChannels(sensor, index);
        const catalog = this.buildCatalog(sensor, node, channelEntries.map((entry) => entry.template));

        return {
            tempId: sensor.idSensor || sensor.sensorCode || `sensor-${index}`,
            catalogId: catalog.idSensorCatalog,
            catalog,
            label: sensor.sensorCode || catalog.name,
            protocolChannel: sensor.protocolChannel || catalog.protocolChannel,
            channels: channelEntries.map((entry) => entry.channel)
        };
    }

    private mapChannels(sensor: any, sensorIndex: number): Array<{ template: SensorChannelTemplate; channel: AddedChannel }> {
        const backendChannels = Array.isArray(sensor?.channels) ? sensor.channels : [];

        return backendChannels.map((channel: any, channelIndex: number) => {
            const template = this.buildChannelTemplate(sensor, channel, sensorIndex, channelIndex);
            const baseId = channel.idSensorChannel || channel.metricCode || `${sensor.idSensor || sensorIndex}-ch-${channelIndex}`;

            return {
                template,
                channel: {
                    tempId: `ch-${baseId}`,
                    templateId: template.idChannelTemplate,
                    template,
                    enabled: this.isChannelEnabled(channel)
                }
            };
        });
    }

    private buildCatalog(sensor: any, node: any, channelTemplates: SensorChannelTemplate[]): SensorCatalog {
        const defaultId = sensor.catalogId || sensor.sensorCatalogId || sensor.idSensorCatalog || `catalog-${sensor.idSensor || Date.now()}`;

        return {
            idSensorCatalog: defaultId,
            name: sensor.catalogName || sensor.sensorCode || 'Unnamed Sensor',
            manufacturer: sensor.catalogVendor || sensor.vendor || sensor.manufacturer || 'Unknown Vendor',
            modelNumber: sensor.catalogModel || sensor.catalogName || sensor.sensorCode || 'N/A',
            sensorType: sensor.sensorTypeLabel || sensor.sensorType || 'Custom Sensor',
            protocolChannel: sensor.protocolChannel || node?.nodeModel?.protocol || 'Unknown Protocol',
            measurementRange: sensor.measurementRange || '—',
            accuracy: sensor.accuracy || '—',
            channels: channelTemplates
        };
    }

    private buildChannelTemplate(sensor: any, channel: any, sensorIndex: number, channelIndex: number): SensorChannelTemplate {
        const rawMetric = channel.metric || channel.metricCode || channel.channelCode || `value_${channelIndex + 1}`;
        const normalizedMetric = typeof rawMetric === 'string' ? rawMetric : `value_${channelIndex + 1}`;
        const templateId = channel.idSensorChannel || `${sensor.idSensor || sensorIndex}-${normalizedMetric}-${channelIndex}`;

        return {
            idChannelTemplate: templateId,
            channelName: channel.sensorTypeLabel || channel.channelLabel || this.humanizeChannel(normalizedMetric),
            channelCode: normalizedMetric.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
            metricName: normalizedMetric,
            unit: channel.unit || 'N/A',
            aggregation: 'avg',
            dataType: this.mapChannelDataType(channel.dataType)
        };
    }

    private isChannelEnabled(channel: any): boolean {
        const status = (channel?.status || '').toLowerCase();
        if (!status) {
            return true;
        }
        return !(status.includes('inactive') || status.includes('disable'));
    }

    private mapChannelDataType(rawType?: string): 'float' | 'integer' | 'boolean' | 'string' {
        const type = (rawType || '').toLowerCase();
        if (type.includes('int')) {
            return 'integer';
        }
        if (type.includes('bool')) {
            return 'boolean';
        }
        if (type.includes('string')) {
            return 'string';
        }
        return 'float';
    }

    private humanizeChannel(value: string): string {
        return value
            .replace(/_/g, ' ')
            .replace(/(?:^|\s)\S/g, (match) => match.toUpperCase());
    }
}
