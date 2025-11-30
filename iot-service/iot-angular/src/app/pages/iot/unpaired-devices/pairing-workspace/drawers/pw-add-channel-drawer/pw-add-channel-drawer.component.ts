import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { SensorChannelsService, SensorTypesService } from 'src/sdk/core/services';

export interface PwSensorTypeOption {
    id: string;
    label: string;
    unit: string;
    precision: number;
}

export interface PwAddChannelFormValue {
    sensorId: string;
    channelId: string;
    metricCode: string;
    unit: string;
    precision: number | null;
    minThreshold: number | null;
    maxThreshold: number | null;
    sensorTypeId: string;
}

export type PwChannelDrawerMode = 'add' | 'edit';

@Component({
    selector: 'pw-add-channel-drawer',
    templateUrl: './pw-add-channel-drawer.component.html',
    styleUrls: ['./pw-add-channel-drawer.component.scss'],
    standalone: false
})
export class PwAddChannelDrawerComponent implements OnInit, OnChanges {
    @Input() isOpen = false;
    @Input() sensorLabel = '';
    @Input() sensorId = '';
    @Input() channelId: string | null = null;
    @Input() mode: PwChannelDrawerMode = 'add';
    @Output() save = new EventEmitter<PwAddChannelFormValue>();
    @Output() close = new EventEmitter<void>();

    sensorTypeOptions: PwSensorTypeOption[] = [];
    formModel: PwAddChannelFormValue = this.createEmptyForm();
    loading = false;
    saving = false;
    loadingChannel = false;

    constructor(
        private sensorTypesService: SensorTypesService,
        private sensorChannelsService: SensorChannelsService
    ) { }

    ngOnInit(): void {
        this.loadSensorTypes();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen']) {
            if (this.isOpen) {
                if (this.mode === 'edit' && this.channelId) {
                    this.loadChannelData();
                } else {
                    this.formModel = this.createEmptyForm();
                }
            }
        }

        if (changes['channelId'] && this.channelId && this.isOpen) {
            this.loadChannelData();
        }

        if (changes['sensorId'] && !changes['isOpen']) {
            this.formModel.sensorId = this.sensorId;
        }
    }

    handleBackdropClick(): void {
        this.close.emit();
    }

    handleCloseClick(event: MouseEvent): void {
        event.preventDefault();
        this.close.emit();
    }

    handleSubmit(formValid: boolean): void {
        if (!formValid || this.saving) {
            return;
        }

        this.saving = true;

        if (this.mode === 'edit' && this.channelId) {
            this.sensorChannelsService.sensorChannelsControllerUpdate({
                id: this.channelId,
                body: {
                    metricCode: this.formModel.metricCode,
                    unit: this.formModel.unit,
                    precision: this.formModel.precision ?? undefined,
                    minThreshold: this.formModel.minThreshold ?? undefined,
                    maxThreshold: this.formModel.maxThreshold ?? undefined,
                    idSensorType: this.formModel.sensorTypeId
                }
            }).subscribe({
                next: () => {
                    this.saving = false;
                    this.save.emit({ ...this.formModel });
                },
                error: (err) => {
                    console.error('Error updating channel:', err);
                    this.saving = false;
                    alert('Failed to update channel');
                }
            });
        } else {
            this.sensorChannelsService.sensorChannelsControllerCreate({
                body: {
                    idSensor: this.formModel.sensorId,
                    metricCode: this.formModel.metricCode,
                    unit: this.formModel.unit,
                    precision: this.formModel.precision ?? undefined,
                    minThreshold: this.formModel.minThreshold ?? undefined,
                    maxThreshold: this.formModel.maxThreshold ?? undefined,
                    idSensorType: this.formModel.sensorTypeId
                }
            }).subscribe({
                next: () => {
                    this.saving = false;
                    this.save.emit({ ...this.formModel });
                },
                error: (err) => {
                    console.error('Error creating channel:', err);
                    this.saving = false;
                    alert('Failed to create channel');
                }
            });
        }
    }

    private loadChannelData(): void {
        if (!this.channelId) {
            return;
        }

        this.loadingChannel = true;
        this.sensorChannelsService.sensorChannelsControllerFindOne({ id: this.channelId }).subscribe({
            next: (response: any) => {
                const data = this.parseResponse(response);
                this.formModel = {
                    sensorId: data.idSensor || this.sensorId,
                    channelId: data.metricCode || '',
                    metricCode: data.metricCode || '',
                    unit: data.unit || '',
                    precision: data.precision ?? null,
                    minThreshold: data.minThreshold ?? null,
                    maxThreshold: data.maxThreshold ?? null,
                    sensorTypeId: data.idSensorType || ''
                };
                this.loadingChannel = false;
            },
            error: (err) => {
                console.error('Error loading channel data:', err);
                alert('Failed to load channel data');
                this.loadingChannel = false;
                this.close.emit();
            }
        });
    }

    private loadSensorTypes(): void {
        this.loading = true;
        console.log('PW: Loading sensor types...');
        
        this.sensorTypesService.sensorTypesControllerFindAll({ limit: 100 }).subscribe({
            next: (data: any) => {
                // SDK returns array directly, not wrapped in {data: [...]}
                console.log('PW: Received sensor types response:', data);
                
                const types = Array.isArray(data) ? data : [];
                console.log('PW: Parsed sensor types count:', types.length);
                
                this.sensorTypeOptions = types.map((type: any) => ({
                    id: type.idSensorType,
                    label: type.category,
                    unit: type.defaultUnit || '',
                    precision: type.precision || 0.01
                }));

                console.log('PW: Mapped sensor type options:', this.sensorTypeOptions.length);

                if (this.mode === 'add' && !this.formModel.sensorTypeId && this.sensorTypeOptions.length > 0) {
                    this.formModel.sensorTypeId = this.sensorTypeOptions[0].id;
                    this.onSensorTypeChange();
                }

                this.loading = false;
            },
            error: (err) => {
                console.error('PW: Error loading sensor types:', err);
                this.loading = false;
            }
        });
    }

    onSensorTypeChange(): void {
        const selectedType = this.sensorTypeOptions.find((t) => t.id === this.formModel.sensorTypeId);
        if (selectedType) {
            this.formModel.unit = selectedType.unit;
            this.formModel.precision = selectedType.precision;
        }
    }

    private parseResponse(response: any): any {
        if (!response) {
            return response;
        }
        if (typeof response === 'object') {
            return response;
        }
        try {
            return JSON.parse(response);
        } catch (error) {
            console.warn('Failed to parse response:', error);
            return response;
        }
    }

    private createEmptyForm(overrides?: Partial<PwAddChannelFormValue>): PwAddChannelFormValue {
        return {
            sensorId: overrides?.sensorId ?? this.sensorId,
            channelId: overrides?.channelId ?? '',
            metricCode: overrides?.metricCode ?? '',
            unit: overrides?.unit ?? '',
            precision: overrides?.precision ?? null,
            minThreshold: overrides?.minThreshold ?? null,
            maxThreshold: overrides?.maxThreshold ?? null,
            sensorTypeId: overrides?.sensorTypeId ?? this.sensorTypeOptions[0]?.id ?? ''
        };
    }
}
