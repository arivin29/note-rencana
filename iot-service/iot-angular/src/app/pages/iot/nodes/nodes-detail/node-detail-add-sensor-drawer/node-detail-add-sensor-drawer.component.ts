import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SensorsService } from '../../../../../../sdk/core/services/sensors.service';
import { SensorCatalogsService } from '../../../../../../sdk/core/services/sensor-catalogs.service';
import { SensorCatalog } from 'src/app/models/iot';
 
 
 

@Component({
    selector: 'app-node-detail-add-sensor-drawer',
    templateUrl: './node-detail-add-sensor-drawer.component.html',
    styleUrls: ['./node-detail-add-sensor-drawer.component.scss'],
    standalone: false
})
export class NodeDetailAddSensorDrawerComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() nodeId = ''; // Node UUID untuk create sensor baru
    @Input() sensorId = ''; // Sensor UUID untuk edit mode (empty string = add mode)
    @Output() save = new EventEmitter<any>();
    @Output() close = new EventEmitter<void>();

    sensorForm!: FormGroup;
    catalogOptions: SensorCatalog[] = [];

    loading = false; // Loading catalog options
    loadingSensor = false; // Loading sensor data (edit mode)
    saving = false; // Submitting form

    constructor(
        private fb: FormBuilder,
        private sensorsService: SensorsService,
        private sensorCatalogsService: SensorCatalogsService
    ) {
        this.initializeForm();
    }

    /**
     * Initialize reactive form with FormBuilder
     */
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
        // When drawer opens, load fresh data
        if (changes['isOpen'] && this.isOpen) {
            // Update idNode in form if nodeId changed
            if (this.nodeId) {
                this.sensorForm.patchValue({ idNode: this.nodeId });
            }

            // Load catalog options first
            this.loadCatalogOptions();

            // If sensorId provided, load sensor data (edit mode)
            if (this.sensorId) {
                this.loadSensorData();
            } else {
                // Add mode - reset form to initial state
                this.sensorForm.reset({
                    idNode: this.nodeId,
                    status: 'active'
                });
            }
        }
    }

    /**
     * ✅ Single Source of Truth: Load sensor catalogs from backend
     */
    private loadCatalogOptions() {
        this.loading = true;
        this.sensorCatalogsService.sensorCatalogsControllerFindAll({limit: 100}).subscribe({
            next: (response: any) => {
                const data = JSON.parse(response);
                this.catalogOptions = data.data;

                 
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading sensor catalogs:', err);
                this.loading = false;
            }
        });
    }

    /**
     * ✅ Single Source of Truth: Load sensor data from backend (edit mode)
     */
    private loadSensorData(): void {
        if (!this.sensorId) return;

        this.loadingSensor = true;
        this.sensorsService.sensorsControllerFindOne({ id: this.sensorId }).subscribe({
            next: (response: any) => {
                const data = this.parseResponse(response);
                console.log('Loaded sensor data:', data);

                // Populate form with backend data using patchValue
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

    /**
     * Helper: Parse response (handle string JSON or object)
     */
    private parseResponse(response: any): any {
        if (!response) return response;
        if (typeof response === 'object') return response;
        try {
            return JSON.parse(response);
        } catch (e) {
            console.warn('Failed to parse response:', e);
            return response;
        }
    }

   

    handleBackdropClick() {
        this.close.emit();
    }

    handleCloseClick(event: MouseEvent) {
        event.preventDefault();
        this.close.emit();
    }

    handleSubmit(): void {
        // Validate form
        if (this.sensorForm.invalid || this.saving) {
            // Mark all fields as touched to show validation errors
            Object.keys(this.sensorForm.controls).forEach(key => {
                this.sensorForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.saving = true;
        const formValue = this.sensorForm.value;

        // Edit mode: PATCH
        if (this.sensorId) {
            this.sensorsService.sensorsControllerUpdate({
                id: this.sensorId,
                body: formValue
            }).subscribe({
                next: (data) => {
                    this.saving = false;
                    this.save.emit(data); // Parent will reload data from backend
                    this.close.emit();
                },
                error: (err) => {
                    console.error('Error updating sensor:', err);
                    this.saving = false;
                    alert('Failed to update sensor. Please try again.');
                }
            });
        }
        // Add mode: POST
        else {
            this.sensorsService.sensorsControllerCreate({ 
                body: formValue 
            }).subscribe({
                next: (data) => {
                    this.saving = false;
                    this.save.emit(data); // Parent will reload data from backend
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

    /**
     * Helper: Check if form field has error
     */
    hasError(fieldName: string, errorType: string): boolean {
        const field = this.sensorForm.get(fieldName);
        return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
    }

    /**
     * Helper: Check if form field is invalid
     */
    isFieldInvalid(fieldName: string): boolean {
        const field = this.sensorForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }
}
