import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { AddedSensor, AddedChannel, SamplePayload, PayloadField } from '../../pairing-workspace.types';
import { NodeProfilesService } from 'src/sdk/core/services';
import { NodeProfileResponseDto } from 'src/sdk/core/models/node-profile-response-dto';
import { CreateNodeProfileDto } from 'src/sdk/core/models/create-node-profile-dto';
import { UnpairedDeviceResponseDto } from 'src/sdk/core/models/unpaired-device-response-dto';

interface ProfileMappingMetadata {
    path: string;
    type?: string;
}

interface ProfileChannelMapping {
    channelCode: string;
    payloadPath: string;
    unit?: string;
}

interface ProfileSensorMapping {
    label?: string;
    catalogId?: string;
    channels?: ProfileChannelMapping[];
}

interface ProfileMappingJson {
    metadata?: Record<string, ProfileMappingMetadata>;
    sensors?: ProfileSensorMapping[];
}

@Component({
    selector: 'pw-step-payload-mapping',
    templateUrl: './step-payload-mapping.component.html',
    styleUrls: ['./step-payload-mapping.component.scss'],
    standalone: false
})
export class StepPayloadMappingComponent implements OnInit, OnChanges {
    @Input() addedSensors: AddedSensor[] = [];
    @Input() nodeModelId?: string | null;
    @Input() projectId?: string | null;
    @Input() unpairedDevice?: UnpairedDeviceResponseDto | null;

    @Output() idSensorProfile = new EventEmitter<string>();
    @Output() sensorsChange = new EventEmitter<AddedSensor[]>();
    @Output() validationChange = new EventEmitter<boolean>();
    @Output() metadataChange = new EventEmitter<Record<string, PayloadField | undefined>>();

    selectedSensor: AddedSensor | null = null;
    selectedPayload: SamplePayload | null = null;
    payloadFields: PayloadField[] = [];
    metaMappings: Record<string, PayloadField | undefined> = {};

    profileLoading = false;
    profileError: string | null = null;
    availableProfiles: NodeProfileResponseDto[] = [];
    profileSuggestions: { profile: NodeProfileResponseDto; matchScore: number }[] = [];
    selectedProfileId: string | null = null;
    profileSaved = false;
    isSavingProfile = false;
    profileSaveMessage: string | null = null;
    profileSaveError: string | null = null;
    profileForm = {
        code: '',
        name: '',
        description: '',
        parserType: 'json',
        transformScript: ''
    };

    readonly metaTargets = [
        {
            key: 'timestamp',
            label: 'Timestamp',
            description: 'Required for ordering telemetry & logs',
            hints: ['timestamp', 'ts', 'tm', 'time', 'created_at']
        },
        {
            key: 'deviceId',
            label: 'Device Identifier',
            description: 'Matches payload source to a node/hardware',
            hints: ['device_id', 'dev_eui', 'hwid', 'sensor_id']
        },
        {
            key: 'signalQuality',
            label: 'Signal Quality',
            description: 'Optional RSSI/SNR for diagnostics',
            hints: ['rssi', 'snr', 'signal', 'quality']
        }
    ];

    samplePayloads: SamplePayload[] = [];

    constructor(private nodeProfilesService: NodeProfilesService) { }

    ngOnInit(): void {
        // Load payload from unpaired device's last_payload
        this.loadPayloadFromDevice();
        
        // Auto-select first payload if available
        if (this.samplePayloads.length > 0) {
            this.selectPayload(this.samplePayloads[0]);
        }
        if (!this.profileForm.code) {
            const timestamp = Date.now();
            this.profileForm.code = `profile-${timestamp}`;
            this.profileForm.name = `Profile ${new Date(timestamp).toLocaleDateString()}`;
        }
        this.emitValidation();
        this.emitMetaChanges();
        this.loadProfiles();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['nodeModelId'] && !changes['nodeModelId'].firstChange) {
            this.loadProfiles();
        }
        if (changes['addedSensors'] && !changes['addedSensors'].firstChange) {
            this.markProfileDirty();
        }
        if (changes['unpairedDevice'] && !changes['unpairedDevice'].firstChange) {
            this.loadPayloadFromDevice();
        }
    }

    private loadPayloadFromDevice(): void {
        if (!this.unpairedDevice?.lastPayload) {
            this.samplePayloads = [];
            return;
        }

        try {
            // Parse last_payload if it's a string
            let payloadData = this.unpairedDevice.lastPayload;
            if (typeof payloadData === 'string') {
                payloadData = JSON.parse(payloadData);
            }

            // Create single SamplePayload from unpaired device's last_payload
            const samplePayload: SamplePayload = {
                id: this.unpairedDevice.idNodeUnpairedDevice || 'payload-001',
                receivedAt: this.unpairedDevice.lastSeenAt || new Date().toISOString(),
                topic: (this.unpairedDevice.lastTopic as any) || 'unknown',
                rawData: payloadData
            };

            this.samplePayloads = [samplePayload];

            // Auto-select this payload
            if (this.samplePayloads.length > 0) {
                this.selectPayload(this.samplePayloads[0]);
            }
        } catch (error) {
            console.error('Failed to parse last_payload from unpaired device', error);
            this.samplePayloads = [];
        }
    }

    selectSensor(sensor: AddedSensor): void {
        this.selectedSensor = sensor;
    }

    selectPayload(payload: SamplePayload): void {
        this.selectedPayload = payload;
        this.payloadFields = this.extractFields(payload.rawData);
        this.computeProfileMatches();
    }

    private extractFields(obj: any, parentPath: string = ''): PayloadField[] {
        const fields: PayloadField[] = [];

        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) continue;

            const value = obj[key];
            const path = parentPath ? `${parentPath}.${key}` : key;
            const type = typeof value;

            if (Array.isArray(value)) {
                // Handle arrays: extract fields from first item as template
                if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                    // Extract from first array item with [0] notation
                    fields.push(...this.extractFields(value[0], `${path}[0]`));
                } else {
                    // Simple array of primitives
                    fields.push({
                        path,
                        key,
                        value,
                        type: 'array',
                        displayValue: `[${value.length} items]`
                    });
                }
            } else if (type === 'object' && value !== null) {
                // Handle nested objects
                fields.push(...this.extractFields(value, path));
            } else {
                // Primitive values
                fields.push({
                    path,
                    key,
                    value,
                    type,
                    displayValue: this.formatValue(value)
                });
            }
        }

        return fields;
    }

    private formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
        return JSON.stringify(value);
    }

    getFieldIndent(field: PayloadField): number {
        const depth = field.path.split('.').length - 1;
        return depth * 18;
    }

    getMetaDropId(targetKey: string): string {
        return `meta-${targetKey}`;
    }

    onFieldDrop(event: CdkDragDrop<any>, channel: AddedChannel): void {
        const droppedField = event.item.data as PayloadField;
        channel.mappedField = droppedField;
        console.log(`Mapped ${droppedField.path} → ${channel.template.channelCode}`);
        this.markProfileDirty();
        this.emitChanges();
    }

    onMetaDrop(event: CdkDragDrop<any>, targetKey: string): void {
        const droppedField = event.item.data as PayloadField;
        this.metaMappings[targetKey] = droppedField;
        this.markProfileDirty();
        this.emitMetaChanges();
    }

    onMappingRemoved(channel: AddedChannel): void {
        channel.mappedField = undefined;
        this.markProfileDirty();
        this.emitChanges();
    }

    onMetaMappingRemoved(targetKey: string): void {
        if (this.metaMappings[targetKey]) {
            delete this.metaMappings[targetKey];
            this.markProfileDirty();
            this.emitMetaChanges();
        }
    }

    getMetaMapping(targetKey: string): PayloadField | undefined {
        return this.metaMappings[targetKey];
    }

    handleProfileSelection(): void {
        if (!this.selectedProfileId) {
            this.idSensorProfile.emit('');
            this.profileSaved = false;
            this.emitValidation();
            return;
        }
        const suggestion = this.profileSuggestions.find(
            (item) => item.profile.idNodeProfile === this.selectedProfileId
        );
        if (suggestion) {
            this.applyProfileMapping(suggestion.profile);
            this.profileSaveMessage = `Using saved profile: ${suggestion.profile.name}`;
            this.profileForm.code = suggestion.profile.code;
            this.profileForm.name = suggestion.profile.name;
            this.profileForm.description = suggestion.profile.description || '';
            this.profileForm.parserType = suggestion.profile.parserType || 'json';
            this.profileForm.transformScript = suggestion.profile.transformScript || '';
            this.profileSaved = true;
            this.idSensorProfile.emit(suggestion.profile.idNodeProfile);
            this.emitValidation();

            this.validationChange.emit(true);
        }
    }

    get connectedDropLists(): string[] {
        const ids: string[] = ['payload-fields'];
        this.metaTargets.forEach((target) => ids.push(this.getMetaDropId(target.key)));
        if (this.selectedSensor) {
            this.selectedSensor.channels.forEach((ch) => {
                if (ch.enabled) {
                    ids.push(`drop-${ch.tempId}`);
                }
            });
        }
        return ids;
    }

    private emitChanges(): void {
        this.sensorsChange.emit(this.addedSensors);
        this.emitValidation();
    }

    private emitMetaChanges(): void {
        this.metadataChange.emit({ ...this.metaMappings });
    }

    loadProfiles(): void {
        if (!this.nodeModelId) {
            this.availableProfiles = [];
            this.profileSuggestions = [];
            return;
        }

        this.profileLoading = true;
        this.profileError = null;
        this.nodeProfilesService
            .nodeProfilesControllerFindAll$Response({
                idNodeModel: this.nodeModelId,
                idProject: this.projectId || undefined,
                limit: 50
            })
            .subscribe({
                next: (response) => {
                    const payload = this.parseResponse<any>(response.body);
                    const rows = Array.isArray(payload?.data) ? payload.data : payload || [];
                    this.availableProfiles = rows as NodeProfileResponseDto[];
                    this.profileLoading = false;
                    this.selectedProfileId = null;
                    this.computeProfileMatches();
                },
                error: (err) => {
                    console.error('Failed to load node profiles', err);
                    this.profileError = 'Failed to load profiles';
                    this.profileLoading = false;
                }
            });
    }

    private computeProfileMatches(): void {
        if (!this.payloadFields || this.payloadFields.length === 0) {
            this.profileSuggestions = [];
            return;
        }

        const payloadPaths = new Set(this.payloadFields.map((field) => field.path.toLowerCase()));

        this.profileSuggestions = this.availableProfiles
            .map((profile) => {
                const mappingPaths = this.collectMappingPaths((profile.mappingJson as ProfileMappingJson) || {});
                if (!mappingPaths.length) {
                    return null;
                }
                const matches = mappingPaths.filter((path) => payloadPaths.has(path.toLowerCase())).length;
                return {
                    profile,
                    matchScore: matches / mappingPaths.length
                };
            })
            .filter((item): item is { profile: NodeProfileResponseDto; matchScore: number } => !!item)
            .sort((a, b) => b.matchScore - a.matchScore)
            .filter((item) => item.matchScore >= 0.9);
    }

    private collectMappingPaths(mapping?: ProfileMappingJson | null): string[] {
        if (!mapping) {
            return [];
        }

        const paths: string[] = [];
        if (mapping.metadata) {
            Object.values(mapping.metadata).forEach((meta) => {
                if (meta?.path) {
                    paths.push(meta.path);
                }
            });
        }
        (mapping.sensors || []).forEach((sensor) => {
            (sensor.channels || []).forEach((channel) => {
                if (channel.payloadPath) {
                    paths.push(channel.payloadPath);
                }
            });
        });
        return paths;
    }

    private applyProfileMapping(profile: NodeProfileResponseDto): void {
        const mapping = (profile.mappingJson as ProfileMappingJson) || {};
        if (!mapping) {
            return;
        }

        // reset existing mappings
        this.addedSensors.forEach((sensor) => {
            sensor.channels.forEach((channel) => (channel.mappedField = undefined));
        });
        this.metaMappings = {};

        if (mapping.metadata) {
            Object.entries(mapping.metadata).forEach(([key, meta]) => {
                const field = meta?.path ? this.findFieldByPath(meta.path) : undefined;
                if (field) {
                    this.metaMappings[key] = field;
                }
            });
        }

        (mapping.sensors || []).forEach((sensorMapping) => {
            (sensorMapping.channels || []).forEach((channelMapping) => {
                const channel = this.findChannelByCode(channelMapping.channelCode);
                if (!channel) {
                    return;
                }
                const field = channelMapping.payloadPath ? this.findFieldByPath(channelMapping.payloadPath) : undefined;
                if (field) {
                    channel.mappedField = field;
                }
            });
        });

        this.selectedProfileId = profile.idNodeProfile;
        this.profileSaved = true;
        this.emitChanges();
        this.emitMetaChanges();
    }

    private findFieldByPath(path: string): PayloadField | undefined {
        return this.payloadFields.find((field) => field.path === path);
    }

    private findChannelByCode(channelCode: string): AddedChannel | undefined {
        for (const sensor of this.addedSensors) {
            const found = sensor.channels.find((channel) => channel.template.channelCode === channelCode);
            if (found) {
                return found;
            }
        }
        return undefined;
    }

    private emitValidation(): void {
        const isValid = this.allChannelsMapped() && this.profileSaved;
        this.validationChange.emit(isValid);
    }

    private allChannelsMapped(): boolean {
        for (const sensor of this.addedSensors) {
            for (const channel of sensor.channels) {
                if (channel.enabled && !channel.mappedField) {
                    return false;
                }
            }
        }
        return true;
    }

    getEnabledChannels(sensor: AddedSensor | null): AddedChannel[] {
        if (!sensor || !sensor.channels) {
            return [];
        }
        return sensor.channels.filter((ch) => ch.enabled);
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

    markProfileDirty(): void {
        this.profileSaved = false;
        this.profileSaveMessage = null;
        this.profileSaveError = null;
        if (this.selectedProfileId) {
            this.selectedProfileId = null;
            this.idSensorProfile.emit('');
        }
        this.emitValidation();
    }

    get profileFormValid(): boolean {
        const allowedParsers = ['json', 'binary', 'custom'];
        return !!(
            this.profileForm.code?.trim() &&
            this.profileForm.name?.trim() &&
            allowedParsers.includes(this.profileForm.parserType) &&
            this.allChannelsMapped()
        );
    }

    saveProfile(): void {
        if (!this.nodeModelId) {
            this.profileSaveError = 'Select a node model first.';
            return;
        }
        if (!this.profileFormValid) {
            this.profileSaveError = 'Complete all required fields and mappings.';
            return;
        }

        const mappingJson: ProfileMappingJson = {
            metadata: {},
            sensors: []
        };

        Object.keys(this.metaMappings).forEach((key) => {
            const field = this.metaMappings[key];
            if (field?.path) {
                mappingJson.metadata![key] = {
                    path: field.path,
                    type: field.type
                };
            }
        });

        this.addedSensors.forEach((sensor) => {
            const channels = sensor.channels
                .filter((channel) => channel.enabled && channel.mappedField)
                .map((channel) => ({
                    channelCode: channel.template.channelCode,
                    payloadPath: channel.mappedField!.path,
                    unit: channel.template.unit
                }));
            if (channels.length) {
                mappingJson.sensors!.push({
                    label: sensor.label,
                    catalogId: sensor.catalogId,
                    channels
                });
            }
        });

        const payload: CreateNodeProfileDto = {
            idNodeModel: this.nodeModelId,
            idProject: this.projectId || undefined,
            code: this.profileForm.code.trim(),
            name: this.profileForm.name.trim(),
            description: this.profileForm.description?.trim() || undefined,
            parserType: this.profileForm.parserType || 'json',
            transformScript: this.profileForm.transformScript?.trim() || undefined,
            mappingJson
        };

        this.isSavingProfile = true;
        this.profileSaveError = null;
        this.profileSaveMessage = null;

        this.nodeProfilesService.nodeProfilesControllerCreate({ body: payload }).subscribe({
            next: (response) => {
                this.isSavingProfile = false;
                this.profileSaved = true;
                this.selectedProfileId = response.idNodeProfile;
                this.profileSaveMessage = 'Profile saved successfully.';
                this.emitValidation();
                this.idSensorProfile.emit(response.idNodeProfile);
            },
            error: (err) => {
                console.error('Failed to save profile', err);
                this.isSavingProfile = false;
                this.profileSaveError = 'Failed to save profile. Please try again.';
            }
        });
    }
}
