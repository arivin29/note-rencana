import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export interface SensorTypeFormValue {
  code: string;
  category: string;
  unit: string;
  precision: string;
  description: string;
}

@Component({
  selector: 'app-sensor-type-drawer',
  templateUrl: './sensor-type-drawer.component.html',
  styleUrls: ['./sensor-type-drawer.component.scss'],
  standalone: false
})
export class SensorTypeDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() save = new EventEmitter<SensorTypeFormValue>();
  @Output() close = new EventEmitter<void>();

  formModel: SensorTypeFormValue = this.createEmptyForm();

  ngOnChanges(changes: SimpleChanges): void {
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

  private createEmptyForm(): SensorTypeFormValue {
    return {
      code: '',
      category: '',
      unit: '',
      precision: '',
      description: ''
    };
  }
}
