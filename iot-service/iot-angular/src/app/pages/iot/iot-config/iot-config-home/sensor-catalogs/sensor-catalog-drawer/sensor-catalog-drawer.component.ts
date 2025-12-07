import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CreateSensorCatalogDto, UpdateSensorCatalogDto, SensorCatalogResponseDto } from 'src/sdk/core/models';

interface SensorCatalogForm {
    modelName: string;
    vendor: string;
    firmware?: string;
    calibrationIntervalDays?: number;
    iconAsset?: string;
    iconColor?: string;
    datasheetUrl?: string;
}

@Component({
    selector: 'app-sensor-catalog-drawer',
    templateUrl: './sensor-catalog-drawer.component.html',
    styleUrls: ['./sensor-catalog-drawer.component.scss'],
    standalone: false
})
export class SensorCatalogDrawerComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() mode: 'create' | 'edit' = 'create';
    @Input() existingCatalog?: SensorCatalogResponseDto;
    @Output() save = new EventEmitter<CreateSensorCatalogDto | UpdateSensorCatalogDto>();
    @Output() close = new EventEmitter<void>();

    formModel: SensorCatalogForm = this.createEmptyForm();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen'] && this.isOpen) {
            if (this.mode === 'edit' && this.existingCatalog) {
                this.formModel = this.mapCatalogToForm(this.existingCatalog);
            } else {
                this.formModel = this.createEmptyForm();
            }
        }
    }

    get drawerTitle(): string {
        return this.mode === 'edit' ? 'Edit Sensor Catalog' : 'Add Sensor Catalog';
    }

    get submitButtonLabel(): string {
        return this.mode === 'edit' ? 'Update Catalog' : 'Save Catalog';
    }

    handleBackdropClick() {
        this.close.emit();
    }

    handleCloseClick(event: MouseEvent) {
        event.preventDefault();
        this.close.emit();
    }

    handleSubmit(formValid: boolean) {
        if (!formValid) {
            return;
        }

        const dto = {
            modelName: this.formModel.modelName,
            vendor: this.formModel.vendor,
            firmware: this.formModel.firmware,
            calibrationIntervalDays: this.formModel.calibrationIntervalDays,
            iconAsset: this.formModel.iconAsset,
            iconColor: this.formModel.iconColor,
            datasheetUrl: this.formModel.datasheetUrl
        };

        this.save.emit(dto);
    }

    private createEmptyForm(): SensorCatalogForm {
        return {
            modelName: '',
            vendor: '',
            firmware: '',
            calibrationIntervalDays: 365,
            iconAsset: 'fa fa-microchip',
            iconColor: '#6fd3ff',
            datasheetUrl: ''
        };
    }

    private mapCatalogToForm(catalog: SensorCatalogResponseDto): SensorCatalogForm {
        return {
            modelName: catalog.modelName,
            vendor: catalog.vendor,
            firmware: catalog.firmware || '',
            calibrationIntervalDays: catalog.calibrationIntervalDays || 365,
            iconAsset: catalog.iconAsset || 'fa fa-microchip',
            iconColor: catalog.iconColor || '#6fd3ff',
            datasheetUrl: catalog.datasheetUrl || ''
        };
    }
}
