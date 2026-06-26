import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SensorContextService } from '@sdk/core/services/sensor-context.service';

interface ParamField {
  idProfileField: string;
  idProfile: string;
  profileCode: string;
  profileName: string;
  fieldKey: string;
  label: string;
  dataType: string;
  unit: string | null;
  options: any[] | null;
  required: boolean;
  sortOrder: number;
}
interface ProfileGroup { code: string; name: string; fields: ParamField[]; }
interface Release {
  idContextRelease: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  params: Record<string, any>;
  note: string | null;
  releasedAt: string;
}

/**
 * Mobile bottom-sheet: per-sensor Installation Context.
 * Field workflow: pick profile → isi parameter → simpan "release baru" (efektif sejak tgl).
 * Mirrors desktop sensor-context-drawer logic; derived views are STABLE props (rebuildFields),
 * never getters, to avoid *ngFor recreating inputs each change-detection cycle.
 */
@Component({
  selector: 'mobile-sensor-context',
  templateUrl: './mobile-sensor-context.component.html',
  standalone: false
})
export class MobileSensorContextComponent implements OnChanges {
  @Input() open = false;
  @Input() idSensor = '';
  @Input() sensorLabel = '';
  @Output() closed = new EventEmitter<void>();

  fields: ParamField[] = [];
  profileGroups: ProfileGroup[] = [];
  flatFields: ParamField[] = [];
  releases: Release[] = [];
  loading = false;
  saving = false;
  error: string | null = null;

  profiles: Array<{ idProfile: string; code: string; name: string }> = [];
  sensorProfileId = '';
  profileSaving = false;

  showForm = false;
  editingId: string | null = null;
  effectiveFrom = '';
  note = '';
  values: Record<string, any> = {};

  constructor(private svc: SensorContextService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.idSensor) {
      this.reset();
      this.loadAll();
    }
  }

  loadAll(): void {
    this.loading = true;
    this.error = null;
    if (!this.profiles.length) {
      this.svc.profilesList$Response().subscribe({ next: (r) => { this.profiles = this.body(r.body) || []; }, error: () => {} });
    }
    this.svc.sensorProfileGet$Response({ id: this.idSensor }).subscribe({
      next: (r) => { const b = this.body(r.body); this.sensorProfileId = (b && b.idProfile) || ''; }, error: () => {}
    });
    this.loadFields();
    this.svc.sensorContextReleasesList$Response({ id: this.idSensor }).subscribe({
      next: (r) => { this.releases = (this.body(r.body) || []) as Release[]; this.loading = false; },
      error: (e) => { this.error = this.msg(e); this.loading = false; }
    });
  }

  loadFields(): void {
    this.svc.sensorContextFields$Response({ id: this.idSensor }).subscribe({
      next: (r) => { this.fields = (this.body(r.body) || []) as ParamField[]; this.rebuildFields(); },
      error: (e) => { this.error = this.msg(e); }
    });
  }

  onProfileChange(idProfile: string): void {
    this.sensorProfileId = idProfile;
    this.profileSaving = true;
    this.svc.sensorProfileSet$Response({ id: this.idSensor, body: { idProfile: idProfile || '' } }).subscribe({
      next: () => { this.profileSaving = false; this.loadFields(); },
      error: (e) => { this.error = this.msg(e); this.profileSaving = false; }
    });
  }

  private rebuildFields(): void {
    const flat: ParamField[] = [];
    const groups: ProfileGroup[] = [];
    const byCode = new Map<string, ProfileGroup>();
    const seenKey = new Set<string>();
    for (const f of this.fields) {
      if (seenKey.has(f.fieldKey)) { continue; }
      seenKey.add(f.fieldKey);
      flat.push(f);
      let g = byCode.get(f.profileCode);
      if (!g) { g = { code: f.profileCode, name: f.profileName, fields: [] }; byCode.set(f.profileCode, g); groups.push(g); }
      g.fields.push(f);
    }
    this.flatFields = flat;
    this.profileGroups = groups;
  }

  startNew(): void {
    this.editingId = null;
    this.values = {};
    this.note = '';
    this.effectiveFrom = this.localNow();
    this.error = null;
    this.showForm = true;
  }

  startEdit(r: Release): void {
    this.editingId = r.idContextRelease;
    this.values = { ...(r.params || {}) };
    this.note = r.note || '';
    this.effectiveFrom = this.toLocal(r.effectiveFrom);
    this.error = null;
    this.showForm = true;
  }

  cancelForm(): void { this.showForm = false; this.editingId = null; this.error = null; }

  save(): void {
    if (!this.effectiveFrom) { this.error = 'Tanggal efektif wajib diisi.'; return; }
    const missing = this.flatFields.filter((f) => f.required && (this.values[f.fieldKey] == null || this.values[f.fieldKey] === ''));
    if (missing.length) { this.error = 'Wajib: ' + missing.map((f) => f.label).join(', '); return; }

    const body: any = {
      effectiveFrom: new Date(this.effectiveFrom).toISOString(),
      params: this.values,
      note: this.note.trim() || null
    };
    this.saving = true;
    this.error = null;
    const obs = this.editingId
      ? this.svc.sensorContextReleaseUpdate$Response({ id: this.editingId, body })
      : this.svc.sensorContextReleaseCreate$Response({ id: this.idSensor, body });
    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.editingId = null; this.loadAll(); },
      error: (e) => { this.error = this.msg(e); this.saving = false; }
    });
  }

  remove(r: Release): void {
    if (!confirm('Hapus release ini?')) { return; }
    this.svc.sensorContextReleaseDelete$Response({ id: r.idContextRelease }).subscribe({
      next: () => this.loadAll(),
      error: (e) => { this.error = this.msg(e); }
    });
  }

  paramSummary(r: Release): string {
    const d = this.flatFields;
    if (d.length) {
      const parts = d
        .filter((f) => r.params && r.params[f.fieldKey] != null && r.params[f.fieldKey] !== '')
        .map((f) => `${f.label}: ${r.params[f.fieldKey]}${f.unit ? ' ' + f.unit : ''}`);
      if (parts.length) { return parts.join(' · '); }
    }
    return Object.entries(r.params || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—';
  }

  onClose(): void { this.closed.emit(); }

  // ---------- helpers ----------
  private reset(): void {
    this.showForm = false; this.editingId = null; this.error = null;
    this.values = {}; this.note = ''; this.fields = []; this.releases = [];
    this.profileGroups = []; this.flatFields = [];
  }
  private localNow(): string { const d = new Date(); d.setSeconds(0, 0); return this.fmt(d); }
  private toLocal(iso: string): string { return this.fmt(new Date(iso)); }
  private fmt(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  private body(b: any): any { if (typeof b === 'string') { try { return JSON.parse(b); } catch { return null; } } return b; }
  private msg(e: any): string { return e?.error?.message || e?.message || 'Permintaan gagal'; }
}
