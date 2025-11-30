import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SensorCatalog } from 'src/app/models/iot';
import { SensorsService, SensorCatalogsService } from 'src/sdk/core/services';

@Component({
    selector: 'pw-add-sensor-drawer',
    templateUrl: './pw-add-sensor-drawer.component.html',
    styleUrls: ['./pw-add-sensor-drawer.component.scss'],
    standalone: false
})
export class PwAddSensorDrawerComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() nodeId = '';
    @Input() sensorId = '';
    @Output() save = new EventEmitter<any>();
    @Output() close = new EventEmitter<void>();

    sensorForm!: FormGroup;
    catalogOptions: SensorCatalog[] = [];

    loading = false;
    loadingSensor = false;
    saving = false;

    constructor(
        private fb: FormBuilder,
        private sensorsService: SensorsService,
        private sensorCatalogsService: SensorCatalogsService
    ) {
        this.initializeForm();
    }

    private initializeForm(): void {
        this.sensorForm = this.fb.group({
            idNode: [this.nodeId, Validators.required],
            sensorCode: ['', Validators.required],
            label: ['', Validators.required],
            idSensorCatalog: ['', Validators.required],
            location: [''],
            status: ['active', Validators.required],
            protocolChannel: [''],
            samplingRate: [null, [Validators.min(1)]]
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen'] && this.isOpen) {
            if (this.nodeId) {
                this.sensorForm.patchValue({ idNode: this.nodeId });
            }

            this.loadCatalogOptions();

            if (this.sensorId) {
                this.loadSensorData();
            } else {
                this.sensorForm.reset({
                    idNode: this.nodeId,
                    status: 'active'
                });
            }
        }
    }

    private loadCatalogOptions(): void {
        this.loading = true;
        this.sensorCatalogsService.sensorCatalogsControllerFindAll({ limit: 100 }).subscribe({
            next: (response: any) => {
                const data = this.parseResponse(response);
                this.catalogOptions = data?.data || [];
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading sensor catalogs:', err);
                this.loading = false;
            }
        });
    }

    private loadSensorData(): void {
        if (!this.sensorId) {
            return;
        }

        this.loadingSensor = true;
        this.sensorsService.sensorsControllerFindOne({ id: this.sensorId }).subscribe({
            next: (response: any) => {
                const data = this.parseResponse(response);
                this.sensorForm.patchValue({
                    idNode: data.idNode,
                    sensorCode: data.sensorCode,
                    label: data.label,
                    idSensorCatalog: data.idSensorCatalog,
                    location: data.location,
                    status: data.status,
                    protocolChannel: data.protocolChannel,
                    samplingRate: data.samplingRate
                });
                this.loadingSensor = false;
            },
            error: (err) => {
                console.error('Error loading sensor data:', err);
                this.loadingSensor = false;
                alert('Failed to load sensor data. Please try again.');
            }
        });
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

    handleBackdropClick(): void {
        this.close.emit();
    }

    handleCloseClick(event: MouseEvent): void {
        event.preventDefault();
        this.close.emit();
    }

    handleSubmit(): void {
        if (this.sensorForm.invalid || this.saving) {
            Object.keys(this.sensorForm.controls).forEach((key) => this.sensorForm.get(key)?.markAsTouched());
            return;
        }

        this.saving = true;
        const body = this.sensorForm.value;

        if (this.sensorId) {
            this.sensorsService.sensorsControllerUpdate({
                id: this.sensorId,
                body
            }).subscribe({
                next: (data) => {
                    this.saving = false;
                    this.save.emit(data);
                    this.close.emit();
                },
                error: (err) => {
                    console.error('Error updating sensor:', err);
                    this.saving = false;
                    alert('Failed to update sensor. Please try again.');
                }
            });
        } else {
            this.sensorsService.sensorsControllerCreate({
                body
            }).subscribe({
                next: (data) => {
                    this.saving = false;
                    this.save.emit(data);
                    this.close.emit();
                },
                error: (err) => {
                    console.error('Error creating sensor:', err);
                    this.saving = false;
                    alert('Failed to create sensor. Please try again.');
                }
            });
        }
    }

    hasError(fieldName: string, errorType: string): boolean {
        const field = this.sensorForm.get(fieldName);
        return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.sensorForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }
}
