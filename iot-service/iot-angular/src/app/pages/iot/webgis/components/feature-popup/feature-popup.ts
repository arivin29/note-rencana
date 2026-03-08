import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'feature-popup',
  templateUrl: './feature-popup.html',
  styleUrls: ['./feature-popup.scss'],
  standalone: false
})
export class FeaturePopupComponent {
  @Input() feature: Record<string, any> = {};
  @Input() position: { x: number; y: number } = { x: 0, y: 0 };
  @Output() close = new EventEmitter<void>();

  get featureProperties(): { key: string; value: any }[] {
    return Object.entries(this.feature)
      .filter(([key]) => !key.startsWith('_') && key !== 'geometry')
      .map(([key, value]) => ({ key, value }));
  }

  formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  onClose(): void {
    this.close.emit();
  }
}
