import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import {
  NotificationSettingsService,
  NotifInboxItem,
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

  // --- Kotak Masuk (dok 03) ---
  inbox: NotifInboxItem[] = [];
  inboxLoading = false;
  inboxError: string | null = null;
  inboxFilter: 'all' | 'unread' = 'all';
  inboxPage = 1;
  inboxLimit = 20;
  inboxTotal = 0;
  inboxTotalPages = 1;

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
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'inbox' || tab === 'settings' || tab === 'prefs') this.activeTab = tab;
    if (this.activeTab === 'prefs') {
      this.loadPrefs();
    } else if (this.activeTab === 'inbox') {
      this.loadInbox();
    } else if (!this.isAdmin) {
      this.loadRules();
    }
  }

  setTab(t: 'inbox' | 'settings' | 'prefs'): void {
    this.activeTab = t;
    if (t === 'prefs' && !this.mutable.length) this.loadPrefs();
    if (t === 'inbox' && !this.inbox.length) this.loadInbox();
  }

  // ===== KOTAK MASUK =====
  loadInbox(): void {
    this.inboxLoading = true;
    this.inboxError = null;
    this.svc
      .listInbox({
        page: this.inboxPage,
        limit: this.inboxLimit,
        isRead: this.inboxFilter === 'unread' ? false : undefined,
      })
      .subscribe({
        next: (r) => {
          this.inbox = r.data || [];
          this.inboxTotal = r.meta?.total ?? this.inbox.length;
          this.inboxTotalPages = r.meta?.totalPages || 1;
          this.inboxLoading = false;
        },
        error: (e) => {
          this.inboxError = e?.error?.message || 'Gagal memuat kotak masuk';
          this.inboxLoading = false;
        },
      });
  }

  setInboxFilter(f: 'all' | 'unread'): void {
    this.inboxFilter = f;
    this.inboxPage = 1;
    this.loadInbox();
  }

  goInboxPage(page: number): void {
    if (page < 1 || page > this.inboxTotalPages) return;
    this.inboxPage = page;
    this.loadInbox();
  }

  /** Buka notifikasi: tandai dibaca lalu lompat ke sumber event (data.deepLink). */
  openInboxItem(item: NotifInboxItem): void {
    const target = item.data?.deepLink;
    if (!item.isRead) {
      this.svc.markRead(item.idNotification).subscribe({
        next: () => (item.isRead = true),
        error: () => undefined,
      });
    }
    if (target) this.router.navigateByUrl(target);
  }

  markAllRead(): void {
    this.svc.markAllRead().subscribe({
      next: () => this.loadInbox(),
      error: (e) => (this.inboxError = e?.error?.message || 'Gagal menandai semua dibaca'),
    });
  }

  iconFor(type: string): string {
    switch (type) {
      case 'alert':
        return 'bi bi-exclamation-triangle text-danger';
      case 'error':
        return 'bi bi-x-circle text-danger';
      case 'warning':
        return 'bi bi-exclamation-circle text-warning';
      case 'success':
        return 'bi bi-check-circle text-success';
      default:
        return 'bi bi-info-circle text-theme';
    }
  }

  badgeFor(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'alert':
      case 'error':
        return 'bg-danger';
      case 'warning':
        return 'bg-warning text-dark';
      default:
        return 'bg-info';
    }
  }

  relativeTime(iso: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const menit = Math.floor(diff / 60000);
    if (menit < 1) return 'baru saja';
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    const hari = Math.floor(jam / 24);
    return hari < 30 ? `${hari} hari lalu` : new Date(iso).toLocaleDateString('id-ID');
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
