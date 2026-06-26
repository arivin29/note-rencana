import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SensorContextService } from 'src/sdk/core/services/sensor-context.service';

interface ProfileField {
  idProfileField: string;
  idProfile: string;
  fieldKey: string;
  label: string;
  dataType: string;
  unit: string | null;
  options: any[] | null;
  required: boolean;
  sortOrder: number;
}

interface FieldForm {
  id?: string;
  fieldKey: string;
  label: string;
  dataType: string;
  unit: string;
  optionsText: string;
  required: boolean;
  sortOrder: number;
}

@Component({
  selector: 'app-profile-fields-drawer',
  templateUrl: './profile-fields-drawer.component.html',
  styleUrls: ['./profile-fields-drawer.component.scss'],
  standalone: false
})
export class ProfileFieldsDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() profile: any = null;
  @Output() close = new EventEmitter<void>();

  fields: ProfileField[] = [];
  loading = false;
  saving = false;
  error: string | null = null;

  dataTypes = ['number', 'text', 'enum', 'date', 'boolean'];
  form: FieldForm = this.empty();

  constructor(private svc: SensorContextService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.profile) {
      this.form = this.empty();
      this.error = null;
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.svc.profileFieldsList$Response({ id: this.profile.idProfile }).subscribe({
      next: (r) => { this.fields = (this.body(r.body) || []) as ProfileField[]; this.loading = false; },
      error: (e) => { this.error = this.msg(e); this.loading = false; }
    });
  }

  editField(f: ProfileField): void {
    this.form = {
      id: f.idProfileField, fieldKey: f.fieldKey, label: f.label, dataType: f.dataType,
      unit: f.unit || '', optionsText: (f.options || []).join(', '), required: f.required, sortOrder: f.sortOrder
    };
  }
  resetForm(): void { this.form = this.empty(); this.error = null; }

  save(): void {
    if (!this.form.fieldKey.trim() || !this.form.label.trim()) {
      this.error = 'Field key and label are required.';
      return;
    }
    const body: any = {
      fieldKey: this.form.fieldKey.trim(),
      label: this.form.label.trim(),
      dataType: this.form.dataType,
      unit: this.form.unit.trim() || null,
      required: this.form.required,
      sortOrder: Number(this.form.sortOrder) || 0,
      options: this.form.dataType === 'enum'
        ? this.form.optionsText.split(',').map((s) => s.trim()).filter(Boolean)
        : null
    };
    this.saving = true;
    this.error = null;
    const obs = this.form.id
      ? this.svc.profileFieldUpdate$Response({ id: this.form.id, body })
      : this.svc.profileFieldCreate$Response({ id: this.profile.idProfile, body });
    obs.subscribe({
      next: () => { this.saving = false; this.resetForm(); this.load(); },
      error: (e) => { this.error = this.msg(e); this.saving = false; }
    });
  }

  remove(f: ProfileField): void {
    if (!confirm(`Delete field "${f.label}"?`)) return;
    this.svc.profileFieldDelete$Response({ id: f.idProfileField }).subscribe({
      next: () => this.load(),
      error: (e) => { this.error = this.msg(e); }
    });
  }

  onClose(): void { this.close.emit(); }

  private empty(): FieldForm {
    return { fieldKey: '', label: '', dataType: 'number', unit: '', optionsText: '', required: false, sortOrder: 0 };
  }
  private body(b: any): any {
    if (typeof b === 'string') { try { return JSON.parse(b); } catch { return null; } }
    return b;
  }
  private msg(e: any): string { return e?.error?.message || e?.message || 'Request failed'; }
}
