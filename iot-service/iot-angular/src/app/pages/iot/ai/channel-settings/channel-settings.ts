import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  AiAnalysisItem,
  AiConfigDetail,
  AiNrwService,
  AiPresetCatalog,
} from '../../../../services/ai-nrw.service';
import { detectorDoc, paramDoc } from './ai-param-docs';

/**
 * Editor detektor 1 channel (tab Settings di Channel Hub) — enable/param per A1–A10 +
 * apply-preset. Dipakai embedded; memuat config sendiri via @Input targetId.
 */
@Component({
  selector: 'ai-channel-settings',
  templateUrl: './channel-settings.html',
  styleUrls: ['./channel-settings.scss'],
  standalone: false,
})
export class ChannelSettingsComponent implements OnInit {
  @Input() targetId!: string;
  @Output() changed = new EventEmitter<void>(); // beri tahu hub agar refresh papan

  selected: AiConfigDetail | null = null;
  presetCatalogs: AiPresetCatalog[] = [];
  loading = false;
  saving = false;
  applyingPreset = '';
  expandedIndex: number | null = null;
  actionMsg: string | null = null;
  actionErr: string | null = null;
  mismatchWarning: string | null = null;
  recommendedPreset: string | null = null;

  constructor(private ai: AiNrwService) {}

  ngOnInit(): void {
    this.ai.presets().subscribe({
      next: (p) => {
        this.presetCatalogs = p || [];
        this.checkMismatch();
      },
      error: () => (this.presetCatalogs = []),
    });
    this.load();
  }

  /** Deteksi salah-deklarasi: kategori asli channel vs preset AI yang dipakai. */
  private checkMismatch(): void {
    this.mismatchWarning = null;
    this.recommendedPreset = null;
    if (!this.selected || !this.presetCatalogs.length) return;
    const group = (this.selected.groupName || '').toLowerCase();
    if (!group) return;
    const match = this.presetCatalogs.find((c) => (c.groupNames || []).some((g) => g.toLowerCase() === group));
    this.recommendedPreset = match?.label || null;
    if (this.selected.analyses.length && match && this.selected.preset && match.label !== this.selected.preset) {
      this.mismatchWarning =
        `Kategori channel ini "${this.selected.groupName}", tapi preset AI dipasang "${this.selected.preset}". ` +
        `Hasil bisa keliru — sebaiknya terapkan preset "${match.label}".`;
    }
  }

  load(): void {
    if (!this.targetId) return;
    this.loading = true;
    this.actionMsg = this.actionErr = null;
    this.ai.getConfig(this.targetId).subscribe({
      next: (d) => {
        // analyses kosong = channel belum di-ON-kan → template tampilkan prompt apply-preset
        this.selected = this.decorate(d);
        this.checkMismatch();
        this.loading = false;
      },
      error: (err) => {
        this.actionErr = err?.error?.message || err?.message || 'Gagal memuat konfigurasi';
        this.loading = false;
      },
    });
  }

  private decorate(d: AiConfigDetail): AiConfigDetail {
    d.analyses.forEach((a) => {
      // forecast: munculkan "band_pct" & "step_min" walau backend belum menyimpannya.
      // Nilai di sini harus sama dengan default worker (cycle.run_forecast_cycle).
      if (a.analysisType === 'forecast') {
        if (!a.params) a.params = {};
        if (a.params['band_pct'] == null) a.params['band_pct'] = 20;
        if (a.params['step_min'] == null) a.params['step_min'] = 10;
        if (a.params['early_warning'] == null) a.params['early_warning'] = true;
        if (a.params['lead_max'] == null) a.params['lead_max'] = '48h';
      }
      const doc = detectorDoc(a.analysisType);
      a.title = doc.title;
      a.what = doc.what;
      a.paramFields = a.params
        ? Object.keys(a.params).map((key) => {
            const v = a.params[key];
            const type = typeof v === 'boolean' ? 'boolean' : typeof v === 'number' ? 'number' : 'text';
            const pd = paramDoc(a.analysisType, key);
            return {
              key,
              type,
              label: pd?.label,
              help: pd?.help,
              recommended: pd?.recommended,
              unit: pd?.unit,
              min: pd?.min,
              max: pd?.max,
              step: pd?.step,
            };
          })
        : [];
    });
    return d;
  }

  toggleAnalysis(index: number): void {
    if (this.selected) this.selected.analyses[index].enabled = !this.selected.analyses[index].enabled;
  }

  toggleExpand(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  trackByParamKey = (_: number, p: { key: string }): string => p.key;

  setParam(a: AiAnalysisItem, key: string, value: any, type: string): void {
    if (!a.params) a.params = {};
    if (type === 'number') {
      const n = Number(value);
      a.params[key] = value === '' || isNaN(n) ? value : n;
    } else if (type === 'boolean') {
      a.params[key] = !!value;
    } else {
      a.params[key] = value;
    }
  }

  save(): void {
    if (!this.selected) return;
    this.saving = true;
    this.actionMsg = this.actionErr = null;
    this.ai.updateConfig(this.selected.targetId, { analyses: this.selected.analyses }).subscribe({
      next: (d) => {
        this.selected = this.decorate(d);
        this.checkMismatch();
        this.saving = false;
        this.actionMsg = 'Konfigurasi tersimpan.';
        this.changed.emit();
      },
      error: (err) => {
        this.saving = false;
        this.actionErr = err?.error?.message || err?.message || 'Gagal menyimpan';
      },
    });
  }

  applyPreset(): void {
    if (!this.targetId || !this.applyingPreset) return;
    this.saving = true;
    this.actionMsg = this.actionErr = null;
    this.ai.applyPreset(this.targetId, this.applyingPreset).subscribe({
      next: (d) => {
        this.selected = this.decorate(d);
        this.checkMismatch();
        this.saving = false;
        this.actionMsg = `Preset "${this.applyingPreset}" diterapkan.`;
        this.applyingPreset = '';
        this.changed.emit();
      },
      error: (err) => {
        this.saving = false;
        this.actionErr = err?.error?.message || err?.message || 'Gagal menerapkan preset';
      },
    });
  }

  applyRecommended(): void {
    if (this.recommendedPreset) {
      this.applyingPreset = this.recommendedPreset;
      this.applyPreset();
    }
  }

  paramsText(params: Record<string, any>): string {
    if (!params || !Object.keys(params).length) return '—';
    return Object.keys(params)
      .map((k) => `${k}: ${params[k]}`)
      .join(', ');
  }
}
