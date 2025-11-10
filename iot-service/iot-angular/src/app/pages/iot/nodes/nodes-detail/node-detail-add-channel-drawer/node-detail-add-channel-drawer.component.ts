import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export interface SensorTypeOption {
  id: string;
  label: string;
}

export interface AddChannelFormValue {
  sensorId: string;
  channelId: string;
  metricCode: string;
  unit: string;
  precision: number | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  sensorTypeId: string;
}

export type ChannelDrawerMode = 'add' | 'edit';

@Component({
  selector: 'app-node-detail-add-channel-drawer',
  templateUrl: './node-detail-add-channel-drawer.component.html',
  styleUrls: ['./node-detail-add-channel-drawer.component.scss'],
  standalone: false
})
export class NodeDetailAddChannelDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() sensorLabel = '';
  @Input() sensorId = '';
  @Input() sensorTypeOptions: SensorTypeOption[] = [];
  @Input() mode: ChannelDrawerMode = 'add';
  @Input() initialValue: AddChannelFormValue | null = null;
  @Output() save = new EventEmitter<AddChannelFormValue>();
  @Output() close = new EventEmitter<void>();

  formModel: AddChannelFormValue = this.createEmptyForm();

  ngOnChanges(changes: SimpleChanges): void {
    const typeOptionsUpdated = changes['sensorTypeOptions'] && this.sensorTypeOptions.length && !this.formModel.sensorTypeId;
    const shouldResetOnOpen = changes['isOpen'] && this.isOpen;
    const sensorChanged = !!changes['sensorId'];

    if (typeOptionsUpdated) {
      this.formModel.sensorTypeId = this.sensorTypeOptions[0].id;
    }

    if (changes['initialValue'] && this.initialValue) {
      this.formModel = this.createEmptyForm(this.initialValue);
      return;
    }

    if (shouldResetOnOpen || sensorChanged) {
      const baseValue = this.mode === 'edit' && this.initialValue ? this.initialValue : undefined;
      this.formModel = this.createEmptyForm(baseValue);
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

  private createEmptyForm(overrides?: Partial<AddChannelFormValue>): AddChannelFormValue {
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
