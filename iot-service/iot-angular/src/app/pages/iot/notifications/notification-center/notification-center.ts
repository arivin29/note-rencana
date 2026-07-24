import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import {
  NotificationSettingsService,
  NotifPrefView,
  NotifRuleView,
} from '../../../../services/notification-settings.service';

interface RuleGroup {
  key: string;
  label: string;
  rows: NotifRuleView[];
}

const GROUP_LABEL: Record<string, string> = {
  ai_nrw: 'AI-NRW · analitik air',
  alert: 'Alert perangkat',
  device: 'Perangkat',
  system: 'Sistem',
};
const GROUP_ORDER = ['ai_nrw', 'alert', 'device', 'system'];

/**
 * Pusat Notifikasi — halaman berdiri sendiri (dok notifikasi 01 §6b), diakses dari lonceng.
 * Tab: Kotak Masuk (menyusul dok 03) · Pengaturan (rules per-owner) · Preferensi Saya (per-user).
 */
@Component({
  selector: 'notification-center',
  templateUrl: './notification-center.html',
  standalone: false,
})
export class NotificationCenterComponent implements OnInit {
  activeTab: 'inbox' | 'settings' | 'prefs' = 'settings';

  isAdmin = false;
  adminOwnerId = ''; // admin memilih owner secara manual

  // --- Rules ---
  rulesLoading = false;
  rulesSaving = false;
  rulesError: string | null = null;
  rulesSavedMsg: string | null = null;
  groups: RuleGroup[] = [];

  // --- Preferences ---
  prefsLoading = false;
  prefsSaving = false;
  prefsError: string | null = null;
  prefsSavedMsg: string | null = null;
  mutable: Array<{ triggerKey: string; label: string; groupKey: string; muted: boolean }> = [];
  quietStart = '';
  quietEnd = '';

  constructor(
    private svc: NotificationSettingsService,
    private auth: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'inbox' || tab === 'settings' || tab === 'prefs') this.activeTab = tab;
    if (this.activeTab === 'prefs') {
      this.loadPrefs();
    } else if (!this.isAdmin) {
      this.loadRules();
    }
  }

  setTab(t: 'inbox' | 'settings' | 'prefs'): void {
    this.activeTab = t;
    if (t === 'prefs' && !this.mutable.length) this.loadPrefs();
  }

  private ownerParam(): string | undefined {
    return this.isAdmin ? this.adminOwnerId.trim() || undefined : undefined;
  }

  // ===== RULES =====
  loadRules(): void {
    if (this.isAdmin && !this.adminOwnerId.trim()) {
      this.groups = [];
      return;
    }
    this.rulesLoading = true;
    this.rulesError = null;
    this.svc.getRules(this.ownerParam()).subscribe({
      next: (r) => {
        this.groups = this.buildGroups(r.data || []);
        this.rulesLoading = false;
      },
      error: (e) => {
        this.rulesError = e?.error?.message || 'Gagal memuat pengaturan';
        this.rulesLoading = false;
      },
    });
  }

  private buildGroups(rows: NotifRuleView[]): RuleGroup[] {
    const map: Record<string, NotifRuleView[]> = {};
    for (const r of rows) (map[r.groupKey] ||= []).push(r);
    return Object.keys(map)
      .sort((a, b) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99))
      .map((key) => ({ key, label: GROUP_LABEL[key] || key, rows: map[key] }));
  }

  toggleAll(g: RuleGroup, on: boolean): void {
    g.rows.forEach((r) => (r.enabled = on));
  }
  groupAllOn(g: RuleGroup): boolean {
    return g.rows.length > 0 && g.rows.every((r) => r.enabled);
  }
  enabledCount(g: RuleGroup): number {
    return g.rows.filter((r) => r.enabled).length;
  }

  saveRules(): void {
    this.rulesSaving = true;
    this.rulesError = null;
    this.rulesSavedMsg = null;
    const items = this.groups
      .flatMap((g) => g.rows)
      .map((r) => ({
        triggerKey: r.triggerKey,
        enabled: r.enabled,
        minSeverity: r.minSeverity,
        channels: r.channels,
      }));
    this.svc.saveRules(items, this.ownerParam()).subscribe({
      next: (r) => {
        this.groups = this.buildGroups(r.data || []);
        this.rulesSaving = false;
        this.flash('rules');
      },
      error: (e) => {
        this.rulesError = e?.error?.message || 'Gagal menyimpan';
        this.rulesSaving = false;
      },
    });
  }

  // ===== PREFERENCES =====
  loadPrefs(): void {
    this.prefsLoading = true;
    this.prefsError = null;
    this.svc.getRules(this.ownerParam()).subscribe({
      next: (rr) => {
        const enabled = (rr.data || []).filter((r) => r.enabled);
        this.svc.getPreferences().subscribe({
          next: (pr) => {
            const prefs = pr.data || [];
            const mutedSet = new Set(
              prefs.filter((p) => p.triggerKey && p.muted).map((p) => p.triggerKey as string),
            );
            const global = prefs.find((p) => p.triggerKey === null);
            this.quietStart = global?.quietStart || '';
            this.quietEnd = global?.quietEnd || '';
            this.mutable = enabled.map((r) => ({
              triggerKey: r.triggerKey,
              label: r.label,
              groupKey: r.groupKey,
              muted: mutedSet.has(r.triggerKey),
            }));
            this.prefsLoading = false;
          },
          error: (e) => {
            this.prefsError = e?.error?.message || 'Gagal memuat preferensi';
            this.prefsLoading = false;
          },
        });
      },
      error: (e) => {
        this.prefsError = e?.error?.message || 'Gagal memuat preferensi';
        this.prefsLoading = false;
      },
    });
  }

  savePrefs(): void {
    this.prefsSaving = true;
    this.prefsError = null;
    this.prefsSavedMsg = null;
    const preferences: NotifPrefView[] = this.mutable.map((m) => ({
      triggerKey: m.triggerKey,
      muted: m.muted,
      quietStart: null,
      quietEnd: null,
      digest: false,
    }));
    preferences.push({
      triggerKey: null,
      muted: false,
      quietStart: this.quietStart || null,
      quietEnd: this.quietEnd || null,
      digest: false,
    });
    this.svc.savePreferences(preferences).subscribe({
      next: () => {
        this.prefsSaving = false;
        this.flash('prefs');
      },
      error: (e) => {
        this.prefsError = e?.error?.message || 'Gagal menyimpan';
        this.prefsSaving = false;
      },
    });
  }

  // ===== util =====
  severityBadge(sev: string): string {
    return sev === 'critical'
      ? 'badge bg-danger-subtle text-danger'
      : sev === 'warning'
        ? 'badge bg-warning-subtle text-warning'
        : 'badge bg-info-subtle text-info';
  }

  private flash(which: 'rules' | 'prefs'): void {
    if (which === 'rules') {
      this.rulesSavedMsg = 'Tersimpan';
      setTimeout(() => (this.rulesSavedMsg = null), 2500);
    } else {
      this.prefsSavedMsg = 'Tersimpan';
      setTimeout(() => (this.prefsSavedMsg = null), 2500);
    }
  }

  trackByTrigger = (_: number, r: { triggerKey: string }): string => r.triggerKey;
}
