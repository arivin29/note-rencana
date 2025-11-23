import { Component, EventEmitter, Input, OnInit, OnChanges, Output } from '@angular/core';
import { NodeConfig, NodeModel, AddedSensor } from '../../pairing-workspace.types';
import { NodesService, NodeProfilesService, UnpairedDevicesService } from 'src/sdk/core/services';
import { NodeProfileResponseDto } from 'src/sdk/core/models/node-profile-response-dto';

@Component({
    selector: 'pw-step-review-submit',
    templateUrl: './step-review-submit.component.html',
    styleUrls: ['./step-review-submit.component.scss'],
    standalone: false
})
export class StepReviewSubmitComponent implements OnInit, OnChanges {
    @Input() nodeConfig!: NodeConfig;
    @Input() nodeModels: NodeModel[] = [];
    @Input() addedSensors: AddedSensor[] = [];
    @Input() ownerId!: string;
    @Input() idSensorProfile: string | null = null;
    @Input() projectId!: string;
    @Input() hardwareId?: string; // Hardware ID of unpaired device
    @Input() unpairedDeviceId?: string; // ID of unpaired device record

    @Output() submit = new EventEmitter<any>();

    finalPayload: any = {};
    nodeDetail: any = null;
    profileDetail: NodeProfileResponseDto | null = null;
    profileChannelMap: Record<string, string> = {};
    private currentNodeDetailId: string | null = null;
    private currentProfileDetailId: string | null = null;

    constructor(
        private nodesService: NodesService,
        private nodeProfilesService: NodeProfilesService,
        private unpairedDevicesService: UnpairedDevicesService
    ) { }

    ngOnInit(): void {
        this.loadNodeDetail();
        this.loadProfileDetail();
        this.generateFinalPayload();
    }

    ngOnChanges(): void {
        this.loadNodeDetail();
        this.loadProfileDetail();
        this.generateFinalPayload();
    }

    private generateFinalPayload(): void {
        const payload: any = {
            ownerId: this.ownerId,
            projectId: this.projectId,
            node: {},
            sensors: [],
            profileId: this.idSensorProfile || undefined
        };

        // Node config
        if (this.nodeConfig.mode === 'existing' && this.nodeConfig.selectedExistingNode) {
            payload.node.idNode = this.nodeConfig.selectedExistingNode.idNode;
        } else if (this.nodeConfig.newNode) {
            const newNode = this.nodeConfig.newNode;
            payload.node = {
                nodeModelId: newNode.nodeModelId,
                code: newNode.code,
                serialNumber: newNode.serialNumber,
                devEui: newNode.devEui,
                ipAddress: newNode.ipAddress,
                firmwareVersion: newNode.firmwareVersion,
                batteryType: newNode.batteryType,
                telemetry: {
                    mode: newNode.telemetryMode,
                    intervalSec: newNode.telemetryIntervalSec
                },
                location: {
                    type: newNode.locationType,
                    latitude: newNode.latitude,
                    longitude: newNode.longitude,
                    address: newNode.address
                }
            };
        }

        // Sensors config
        payload.sensors = this.addedSensors.map((sensor) => ({
            catalogId: sensor.catalogId,
            label: sensor.label,
            protocolChannel: sensor.protocolChannel,
            channels: sensor.channels
                .filter((ch) => ch.enabled && ch.mappedField)
                .map((ch) => ({
                    templateId: ch.templateId,
                    channelCode: ch.template.channelCode,
                    channelName: ch.template.channelName,
                    metricName: ch.template.metricName,
                    unit: ch.template.unit,
                    aggregation: ch.template.aggregation,
                    jsonpath: `$.${ch.mappedField!.path}`
                }))
        }));

        this.finalPayload = payload;
    }

    emitSubmit(): void {
        this.generateFinalPayload();
        if (this.shouldUpdateNodeProfile()) {
            const nodeId = this.nodeConfig.selectedExistingNode!.idNode;
            this.nodesService.nodesControllerUpdate({
                id: nodeId,
                body: {
                    idNodeProfile: this.idSensorProfile || undefined
                }
            }).subscribe({
                next: () => {
                    this.updateUnpairedDeviceStatus(nodeId);
                    this.submit.emit(this.finalPayload);
                },
                error: (err) => {
                    console.error('Failed to assign node profile', err);
                    this.submit.emit(this.finalPayload);
                }
            });
            return;
        }
        
        // For new node creation, emit and let parent handle node creation
        // Parent will call updateUnpairedDeviceStatus after getting node ID from response
        this.submit.emit(this.finalPayload);
    }

    /**
     * Update unpaired device status to 'paired' and set paired_node_id
     * Call this after successful node creation/pairing
     */
    updateUnpairedDeviceStatus(nodeId: string): void {
        if (!this.unpairedDeviceId) {
            console.warn('No unpaired device ID provided, skipping status update');
            return;
        }

        this.unpairedDevicesService.unpairedDevicesControllerUpdate({
            id: this.unpairedDeviceId,
            body: {
                status: 'paired',
                pairedNodeId: nodeId
            }
        }).subscribe({
            next: (response) => {
                console.log('Unpaired device status updated to paired', response);
            },
            error: (err) => {
                console.error('Failed to update unpaired device status', err);
                // Don't block the workflow, just log the error
            }
        });
    }    getNodeModelName(modelId?: string): string {
        if (!modelId) {
            return '-';
        }
        const model = this.nodeModels.find((m) => m.idNodeModel === modelId);
        return model?.name || '-';
    }

    getEnabledChannels(sensor: AddedSensor): any[] {
        if (!sensor || !sensor.channels) {
            return [];
        }
        return sensor.channels.filter((ch) => ch.enabled);
    }

    getProfileChannelPath(channelCode: string): string | undefined {
        return this.profileChannelMap[channelCode?.toUpperCase()];
    }

    private shouldUpdateNodeProfile(): boolean {
        return (
            this.nodeConfig.mode === 'existing' &&
            !!this.nodeConfig.selectedExistingNode?.idNode &&
            !!this.idSensorProfile
        );
    }

    private loadNodeDetail(): void {
        const nodeId =
            this.nodeConfig.mode === 'existing' ? this.nodeConfig.selectedExistingNode?.idNode || null : null;

        if (!nodeId) {
            this.nodeDetail = null;
            this.currentNodeDetailId = null;
            return;
        }

        if (this.currentNodeDetailId === nodeId && this.nodeDetail) {
            return;
        }

        this.currentNodeDetailId = nodeId;
        this.nodesService.nodesControllerGetDashboard$Response({ id: nodeId }).subscribe({
            next: (response) => {
                const dashboard = this.parseResponse<any>(response.body);
                this.nodeDetail = dashboard?.node || null;
            },
            error: (err) => {
                console.error('Failed to load node detail', err);
                this.nodeDetail = null;
            }
        });
    }

    private loadProfileDetail(): void {
        if (!this.idSensorProfile) {
            this.profileDetail = null;
            this.currentProfileDetailId = null;
            this.profileChannelMap = {};
            return;
        }

        if (this.currentProfileDetailId === this.idSensorProfile && this.profileDetail) {
            return;
        }

        this.currentProfileDetailId = this.idSensorProfile;
        this.nodeProfilesService.nodeProfilesControllerFindOne$Response({ id: this.idSensorProfile }).subscribe({
            next: (response) => {
                const profile = this.parseResponse<NodeProfileResponseDto>(response.body);
                this.profileDetail = profile;
                this.buildProfileChannelMap(profile);
            },
            error: (err) => {
                console.error('Failed to load profile detail', err);
                this.profileDetail = null;
                this.profileChannelMap = {};
            }
        });
    }

    private buildProfileChannelMap(profile: NodeProfileResponseDto | null): void {
        this.profileChannelMap = {};
        if (!profile?.mappingJson) {
            return;
        }
        const mapping = (profile.mappingJson as any) || {};
        (mapping.sensors || []).forEach((sensor: any) => {
            (sensor.channels || []).forEach((channel: any) => {
                const code = channel.channelCode?.toUpperCase();
                if (code && channel.payloadPath) {
                    this.profileChannelMap[code] = channel.payloadPath;
                }
            });
        });
    }

    private parseResponse<T>(payload: any): T {
        let data = payload;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (error) {
                return payload as T;
            }
        }
        if (data && typeof data === 'object' && 'data' in data) {
            return (data as any).data as T;
        }
        return data as T;
    }
}
