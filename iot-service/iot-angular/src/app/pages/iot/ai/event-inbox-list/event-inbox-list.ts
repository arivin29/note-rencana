import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { AiEventListItem, AiEventStats, AiNrwService } from '../../../../services/ai-nrw.service';

/**
 * Event Inbox — daftar event AI-NRW (dok 08 §2). Paginasi server-side ({data, meta}).
 * Tab status (Aktif/Selesai/Semua) + filter severity + pencarian debounce.
 */
@Component({
  selector: 'ai-event-inbox-list',
  templateUrl: './event-inbox-list.html',
  styleUrls: ['./event-inbox-list.scss'],
  standalone: false,
})
export class EventInboxListPage implements OnInit {
  /** Embedded (di Channel Hub): kunci ke satu channel + sembunyikan header. */
  @Input() targetId: string | null = null;
  @Input() embedded = false;

  events: AiEventListItem[] = [];
  stats: AiEventStats | null = null;
  loading = false;
  error: string | null = null;

  isAdmin = false;

  // filter + pencarian
  statusTab: 'active' | 'resolved' | 'all' = 'active';
  severity = '';
  searchTerm = '';
  severityOptions = ['', 'critical', 'warning', 'info'];
  statusTabs: Array<{ key: 'active' | 'resolved' | 'all'; label: string }> = [
    { key: 'active', label: 'Aktif' },
    { key: 'resolved', label: 'Selesai' },
    { key: 'all', label: 'Semua' },
  ];
  private searchDebounce?: ReturnType<typeof setTimeout>;

  // paginasi server-side
  currentPage = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50];
  total = 0;
  totalPages = 1;

  constructor(
    private ai: AiNrwService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    if (!this.embedded) this.loadStats(); // stats global tak relevan saat di-scope 1 channel
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.error = null;
    const params: Record<string, any> = {
      status: this.statusTab === 'all' ? '' : this.statusTab,
      severity: this.severity,
      search: this.searchTerm,
      page: this.currentPage,
      limit: this.pageSize,
    };
    if (this.statusTab === 'all') {
      // "Semua" = jangan filter status; kirim daftar semua status eksplisit
      params['status'] = 'baru,ditinjau,ditindak,selesai,auto_closed,superseded';
    }
    if (this.targetId) {
      params['targetId'] = this.targetId; // mode embedded: kunci ke channel ini
    }
    this.ai.listEvents(params).subscribe({
      next: (res) => {
        this.events = res?.data || [];
        this.total = res?.meta?.total ?? this.events.length;
        this.totalPages = res?.meta?.totalPages ?? 1;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Gagal memuat event';
        this.loading = false;
      },
    });
  }

  loadStats(): void {
    this.ai.eventStats().subscribe({
      next: (s) => (this.stats = s),
      error: () => (this.stats = null),
    });
  }

  setTab(tab: 'active' | 'resolved' | 'all'): void {
    if (this.statusTab === tab) return;
    this.statusTab = tab;
    this.currentPage = 1;
    this.loadEvents();
  }

  setSeverity(sev: string): void {
    this.severity = sev;
    this.currentPage = 1;
    this.loadEvents();
  }

  onSearchChange(v: string): void {
    this.searchTerm = v;
    this.currentPage = 1;
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadEvents(), 400);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadEvents();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadEvents();
  }

  openEvent(id: string): void {
    this.router.navigate(['/iot/ai/events', id]);
  }

  refresh(): void {
    this.loadStats();
    this.loadEvents();
  }

  // --- tampilan ---
  tabCount(key: 'active' | 'resolved' | 'all'): number {
    if (!this.stats) return 0;
    if (key === 'all') return this.stats.total;
    if (key === 'active') return this.stats.active;
    const s = this.stats.byStatus || {};
    return (s['selesai'] || 0) + (s['auto_closed'] || 0) + (s['superseded'] || 0);
  }

  severityBadge(sev: string): string {
    switch (sev) {
      case 'critical':
        return 'badge bg-danger-subtle text-danger';
      case 'warning':
        return 'badge bg-warning-subtle text-warning';
      case 'info':
        return 'badge bg-info-subtle text-info';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'baru':
        return 'badge bg-danger-subtle text-danger';
      case 'ditinjau':
        return 'badge bg-warning-subtle text-warning';
      case 'ditindak':
        return 'badge bg-info-subtle text-info';
      case 'selesai':
        return 'badge bg-success-subtle text-success';
      case 'auto_closed':
        return 'badge bg-success-subtle text-success';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  get paginationStart(): number {
    return this.total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }
  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.total);
  }
  get pageNumbers(): number[] {
    const max = 7;
    const pages: number[] = [];
    let start = Math.max(1, this.currentPage - 3);
    let end = Math.min(this.totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  durationText(sec: number | null): string {
    if (sec == null) return '—';
    if (sec < 60) return `${sec}d`;
    if (sec < 3600) return `${Math.round(sec / 60)}m`;
    if (sec < 86400) return `${Math.round(sec / 3600)}j`;
    return `${Math.round(sec / 86400)}h`;
  }
}
