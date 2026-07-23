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
    { key: 'active', label: 'Perlu perhatian' },
    { key: 'resolved', label: 'Pulih & selesai' },
    { key: 'all', label: 'Semua' },
  ];
  /** id event yang sedang divalidasi inline (disable tombol ✓/✗-nya). */
  validatingId: string | null = null;
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

  // --- kartu triase -------------------------------------------------------

  /** Status internal → bahasa operator (apa yang harus SAYA lakukan). */
  statusHuman(status: string): string {
    return (
      {
        baru: 'Perlu ditinjau',
        ditinjau: 'Sedang ditinjau',
        ditindak: 'Sedang ditangani',
        selesai: 'Selesai',
        auto_closed: 'Pulih sendiri',
        superseded: 'Digantikan',
      }[status] || status
    );
  }

  isActive(e: AiEventListItem): boolean {
    return ['baru', 'ditinjau', 'ditindak'].includes(e.status);
  }

  /** Nama channel tanpa prefiks nama node — node sudah tampil di segmen sendiri,
   *  jadi "Tenggarong (node6) tekanan" cukup jadi "tekanan". */
  channelShort(e: AiEventListItem): string {
    const ch = (e.channelName || '').trim();
    const nd = (e.nodeName || '').trim();
    if (nd && ch.toLowerCase().startsWith(nd.toLowerCase())) {
      const rest = ch.slice(nd.length).replace(/^[\s\-–—:·»›|]+/, '').trim();
      if (rest) return rest;
    }
    return ch;
  }

  /** Tampilkan tag grup hanya bila menambah info (bukan sekadar mengulang channel). */
  showGroup(e: AiEventListItem): boolean {
    const g = (e.groupName || '').trim().toLowerCase();
    if (!g) return false;
    return !this.channelShort(e).toLowerCase().includes(g);
  }

  /** Kode pendek untuk chip (A2_low → A2; forecast_breach → Prediksi). */
  codeChip(analysisType: string): string {
    const m = analysisType.match(/^A(\d+)_/);
    if (m) return 'A' + m[1];
    return { forecast_breach: 'Prediksi', night_pressure: 'Malam' }[analysisType] || analysisType;
  }

  /** "32 mnt lalu" / "2 jam lalu" / "3 hari lalu". */
  timeAgo(iso: string): string {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 90) return 'baru saja';
    if (s < 3600) return `${Math.round(s / 60)} mnt lalu`;
    if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
    return `${Math.round(s / 86400)} hari lalu`;
  }

  /** Baris angka: "2.1 bar — di bawah min layanan 3" per jenis detektor.
   *  Sumber: context event (worker baru ikut menyimpan `value`); event lama
   *  A2/A3 direkonstruksi dari peak_magnitude. Tak ada data → null (baris sembunyi). */
  numberLine(e: AiEventListItem): string | null {
    const c = e.context || {};
    const u = e.unit ? ` ${e.unit}` : '';
    const num = (v: any) => (v == null || isNaN(+v) ? null : (+v).toFixed(Math.abs(+v) < 10 ? 2 : 1));
    const thr = num(c['threshold']);
    let val = num(c['value']);

    switch (e.analysisType) {
      case 'A2_low':
      case 'A3_high': {
        const below = e.analysisType === 'A2_low';
        if (!val && thr != null && e.peakMagnitude != null) {
          const t = +thr;
          val = num(t + (below ? -1 : 1) * e.peakMagnitude * Math.abs(t)) ? '≈' + num(t + (below ? -1 : 1) * e.peakMagnitude * Math.abs(t)) : null;
        }
        if (val == null && thr == null) return null;
        return `${val ?? '?'}${u} — ${below ? 'di bawah min' : 'di atas max'} layanan ${thr ?? '?'}${u}`;
      }
      case 'A9_deviation': {
        const exp = num(c['expected_median']);
        return exp != null ? `${val ?? '?'}${u} — normalnya jam segini ≈${exp}${u} (z=${num(c['z']) ?? '?'})` : null;
      }
      case 'forecast_breach': {
        const pred = num(c['predicted']);
        const lead = c['lead_hours'];
        if (pred == null) return null;
        const at = c['cross_ts'] ? new Date(+c['cross_ts']).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null;
        return `prediksi ${pred}${u}${at ? ` sekitar pukul ${at}` : ''}${lead != null ? ` (±${lead} jam lagi)` : ''} — batas ${thr ?? '?'}${u}`;
      }
      case 'A7_nodata': {
        const gap = c['gap_sec'];
        return gap != null ? `tanpa data ${this.durationText(Math.round(+gap))}` : null;
      }
      case 'A5_flatline':
        return c['n'] != null ? `datar ${c['n']} pembacaan berturut${val != null ? ` di ${val}${u}` : ''}` : null;
      case 'A6_noise':
        return c['ratio'] != null ? `${c['ratio']}× lebih bergetar dari biasanya` : null;
      case 'A10_drift':
        return c['direction'] ? `tren ${c['direction'] === 'down' ? 'turun' : 'naik'} perlahan${val != null ? `, kini ${val}${u}` : ''}` : null;
      case 'A1_invalid':
        return val != null ? `nilai terbaca ${val}${u}` : null;
      default:
        return val != null ? `${val}${u}${thr != null ? ` (ambang ${thr}${u})` : ''}` : null;
    }
  }

  /** Validasi 1-klik dari kartu — feedback loop tanpa buka detail. */
  quickValidate(e: AiEventListItem, verdict: 'benar' | 'false_alarm', ev: Event): void {
    ev.stopPropagation(); // jangan ikut membuka halaman detail
    if (this.validatingId) return;
    this.validatingId = e.id;
    this.ai.validateEvent(e.id, { verdict }).subscribe({
      next: () => {
        this.validatingId = null;
        this.refresh();
      },
      error: (err) => {
        this.validatingId = null;
        this.error = err?.error?.message || err?.message || 'Gagal memvalidasi';
      },
    });
  }

  /** Klik tile KPI = filter cepat. */
  kpiFilter(kind: 'critical' | 'warning' | 'baru' | 'auto_closed'): void {
    if (kind === 'critical' || kind === 'warning') {
      this.statusTab = 'active';
      this.severity = kind;
    } else if (kind === 'baru') {
      this.statusTab = 'active';
      this.severity = '';
    } else {
      this.statusTab = 'resolved';
      this.severity = '';
    }
    this.currentPage = 1;
    this.loadEvents();
  }

  kpi(kind: string): number {
    const s = this.stats;
    if (!s) return 0;
    if (kind === 'critical' || kind === 'warning') return s.bySeverity?.[kind] || 0;
    return s.byStatus?.[kind] || 0;
  }
}
