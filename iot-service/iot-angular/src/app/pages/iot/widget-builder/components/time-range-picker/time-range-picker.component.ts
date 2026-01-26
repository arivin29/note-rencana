import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TimeRange } from '../../models/widget.models';

@Component({
  selector: 'app-time-range-picker',
  standalone: false,
  templateUrl: './time-range-picker.component.html',
  styleUrls: ['./time-range-picker.component.css']
})
export class TimeRangePickerComponent {
  @Input() selectedPreset = '24h';
  @Input() timeRange!: TimeRange;
  @Input() presets: { label: string; value: string; duration: number }[] = [];

  @Output() presetChange = new EventEmitter<string>();
  @Output() customRangeChange = new EventEmitter<{ from: Date; to: Date }>();

  showCustomPicker = false;
  customFrom: string = '';
  customTo: string = '';

  onPresetSelect(preset: string): void {
    if (preset === 'custom') {
      this.showCustomPicker = true;
    } else {
      this.showCustomPicker = false;
      this.presetChange.emit(preset);
    }
  }

  applyCustomRange(): void {
    if (this.customFrom && this.customTo) {
      this.customRangeChange.emit({
        from: new Date(this.customFrom),
        to: new Date(this.customTo)
      });
      this.showCustomPicker = false;
    }
  }

  formatTimeRange(): string {
    if (this.selectedPreset !== 'custom') {
      return this.presets.find(p => p.value === this.selectedPreset)?.label || '';
    }
    return `${this.timeRange.from.toLocaleDateString()} - ${this.timeRange.to.toLocaleDateString()}`;
  }
}
