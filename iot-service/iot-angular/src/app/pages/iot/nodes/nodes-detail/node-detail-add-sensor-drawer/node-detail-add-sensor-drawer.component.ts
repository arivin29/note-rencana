import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export type SensorHealthOption = 'online' | 'maintenance' | 'offline';

export interface SensorCatalogOption {
  id: string;
  label: string;
}

export interface AddSensorFormValue {
  sensorCode: string;
  label: string;
  sensorCatalogId: string;
  location: string;
  health: SensorHealthOption;
  protocolChannel: string;
  samplingRate: number | null;
}

@Component({
  selector: 'app-node-detail-add-sensor-drawer',
  templateUrl: './node-detail-add-sensor-drawer.component.html',
  styleUrls: ['./node-detail-add-sensor-drawer.component.scss'],
  standalone: false
})
export class NodeDetailAddSensorDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() catalogOptions: SensorCatalogOption[] = [];
  @Output() save = new EventEmitter<AddSensorFormValue>();
  @Output() close = new EventEmitter<void>();

  formModel: AddSensorFormValue = this.createEmptyForm();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['catalogOptions'] && !this.formModel.sensorCatalogId && this.catalogOptions.length) {
      this.formModel.sensorCatalogId = this.catalogOptions[0].id;
    }
    if (changes['isOpen'] && this.isOpen) {
      this.formModel = this.createEmptyForm();
    }
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
    this.save.emit({ ...this.formModel });
  }

  private createEmptyForm(): AddSensorFormValue {
    return {
      sensorCode: '',
      label: '',
      sensorCatalogId: this.catalogOptions[0]?.id ?? '',
      location: '',
      health: 'online',
      protocolChannel: '',
      samplingRate: null
    };
  }
}
