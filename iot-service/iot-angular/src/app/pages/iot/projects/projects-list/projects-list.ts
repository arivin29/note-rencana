import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { AuthService } from '../../../../services/auth.service';
import { fetchAll } from '../../../../shared/utils/fetch-all';
import { timeAgoId } from '../../../../shared/utils/channel-display';
import {
  deadNodes, HEALTH_BADGE, HEALTH_LABEL, HEALTH_ORDER, HealthState, healthOf, healthState,
  ProjectHealth, sumHealth
} from '../../../../shared/utils/project-health';

/** One row = one project from GET /api/projects (health computed by the backend). */
interface ProjectRow {
  idProject: string;
  idOwner: string;
  name: string;
  ownerName: string;
  areaType: string;
  status: string;
  /** null = backend did not send `health` — never shown as zeros */
  health: ProjectHealth | null;
  state: HealthState | null;
  dead: number;
  /** first non-empty node address, or '' */
  location: string;
  lastSeenAt: string | null;
  lastSeenMs: number;
  search: string;
}

type TabKey = 'all' | HealthState;
type SortField = 'name' | 'health' | 'fresh' | 'late' | 'sensors' | 'alerts' | 'location' | 'lastSeen';

interface Option { value: string; label: string; }

export const AREA_LABEL: Record<string, string> = {
  plant: 'Instalasi / IPA',
  pipeline: 'Jaringan pipa',
  farm: 'Budidaya',
  industrial: 'Industri',
  other: 'Lainnya'
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  maintenance: 'Pemeliharaan',
  inactive: 'Nonaktif',
  archived: 'Diarsipkan'
};

const AUTO_REFRESH_MS = 60_000;

@Component({
  selector: 'projects-list',
  templateUrl: './projects-list.html',
  styleUrls: ['./projects-list.scss'],
  standalone: false
})
export class ProjectsListPage implements OnInit, OnDestroy {
  readonly HEALTH_LABEL = HEALTH_LABEL;
  readonly HEALTH_BADGE = HEALTH_BADGE;

  rows: ProjectRow[] = [];
  /** rows after Owner / Area / Status / Cari (before the health tab) — KPIs + tab counts */
  scoped: ProjectRow[] = [];
  /** scoped + tab + sort */
  filtered: ProjectRow[] = [];
  pageRows: ProjectRow[] = [];

  loading = false;
  error: string | null = null;
  lastRefreshedAt: Date | null = null;
  now = Date.now();

  isAdmin = false;
  ownerOptions: Option[] = [];
  ownersError: string | null = null;
  areaOptions: Option[] = [];
  projectStatusOptions: Option[] = [];

  // filters
  ownerId = '';
  areaType = '';
  projectStatus = '';
  searchText = '';
  private appliedSearch = '';
  tab: TabKey = 'all';

  readonly tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'problem', label: HEALTH_LABEL.problem },
    { key: 'warning', label: HEALTH_LABEL.warning },
    { key: 'ok', label: HEALTH_LABEL.ok },
    { key: 'empty', label: HEALTH_LABEL.empty }
  ];
  counts: Record<TabKey, number> = { all: 0, problem: 0, warning: 0, ok: 0, empty: 0 };
  totals: ProjectHealth = sumHealth([]);
  ownerCount = 0;
  missingHealth = 0;

  // sort + pagination
  sortField: SortField = 'health';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSizeOptions = [10, 25, 50];
  pageSize = 25;
  currentPage = 1;
  totalPages = 1;

  private loadSub?: Subscription;
  private ownersSub?: Subscription;
  private searchDebounce?: ReturnType<typeof setTimeout>;
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(
    private projectsService: ProjectsService,
    private ownersService: OwnersService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.getCurrentUserRole() === 'admin';
    if (this.isAdmin) this.loadOwners();
    this.loadProjects();
    this.refreshTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!this.loading) this.loadProjects(true);
    }, AUTO_REFRESH_MS);
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.ownersSub?.unsubscribe();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  reload(): void {
    if (this.isAdmin && (this.ownersError || !this.ownerOptions.length)) this.loadOwners();
    this.loadProjects();
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  /** Every project (fetchAll pages through meta.total — API caps limit at 100). Filtering is client-side. */
  /** Last background refresh failed — the table shows data from `lastRefreshedAt`. */
  refreshFailed = false;

  loadProjects(silent = false): void {
    this.loadSub?.unsubscribe();
    if (!silent) this.loading = true;
    this.error = null;
    this.loadSub = fetchAll(p => this.projectsService.projectsControllerFindAll$Response(p)).subscribe({
      next: (items) => {
        this.rows = items.map(raw => this.toRow(raw)).filter(r => !!r.idProject);
        this.now = Date.now();
        this.lastRefreshedAt = new Date();
        this.refreshFailed = false;
        this.loading = false;
        this.rebuildOptions();
        this.applyFilters(false);
      },
      error: () => {
        this.loading = false;
        // a failed background refresh keeps the last good data, but says so (data may be outdated)
        this.refreshFailed = true;
        if (!silent || !this.rows.length) {
          this.error = 'Gagal memuat daftar project.';
          this.rows = [];
          this.applyFilters();
        }
      }
    });
  }

  private loadOwners(): void {
    this.ownersSub?.unsubscribe();
    this.ownersError = null;
    this.ownersSub = fetchAll(p => this.ownersService.ownersControllerFindAll$Response(p)).subscribe({
      next: (owners) => {
        this.ownerOptions = owners
          .filter((o: any) => o?.idOwner)
          .map((o: any) => ({ value: o.idOwner, label: `${o.ownerCode ? o.ownerCode + ' - ' : ''}${o.name || o.idOwner}` }))
          .sort((a, b) => a.label.localeCompare(b.label, 'id'));
      },
      error: () => this.ownersError = 'Gagal memuat owner'
    });
  }

  private toRow(raw: any): ProjectRow {
    const health = healthOf(raw);
    const lastSeenAt = health?.lastSeenAt || null;
    const t = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
    const location = (raw?.location || raw?.primaryLocation || '').toString().trim();
    const ownerName = raw?.owner?.name || '';
    const name = raw?.name || '';
    return {
      idProject: raw?.idProject || '',
      idOwner: raw?.idOwner || raw?.owner?.idOwner || '',
      name,
      ownerName,
      areaType: (raw?.areaType || '').toString().toLowerCase(),
      status: (raw?.status || '').toString().toLowerCase(),
      health,
      state: health ? healthState(health) : null,
      dead: health ? deadNodes(health) : 0,
      location,
      // Go zero-time / invalid dates → "Belum pernah"
      lastSeenAt: !isNaN(t) && t > Date.UTC(2000, 0, 1) ? lastSeenAt : null,
      lastSeenMs: !isNaN(t) && t > Date.UTC(2000, 0, 1) ? t : 0,
      search: `${name} ${ownerName} ${location}`.toLowerCase()
    };
  }

  /** Area / status options from values that actually exist in the data. */
  private rebuildOptions(): void {
    const areas = [...new Set(this.rows.map(r => r.areaType).filter(Boolean))];
    this.areaOptions = areas.map(a => ({ value: a, label: this.areaLabel(a) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'));
    const statuses = [...new Set(this.rows.map(r => r.status).filter(Boolean))];
    this.projectStatusOptions = statuses.map(s => ({ value: s, label: this.statusLabel(s) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'));
    if (this.areaType && !areas.includes(this.areaType)) this.areaType = '';
    if (this.projectStatus && !statuses.includes(this.projectStatus)) this.projectStatus = '';
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.appliedSearch = this.searchText.trim().toLowerCase();
      this.applyFilters();
    }, 300);
  }

  /** Tab click toggles back to Semua; KPI click (toggle=false) always selects. */
  setTab(key: TabKey, toggle = true): void {
    this.tab = toggle && this.tab === key ? 'all' : key;
    this.applyFilters();
  }

  get hasActiveFilter(): boolean {
    return !!(this.ownerId || this.areaType || this.projectStatus || this.searchText.trim() || this.tab !== 'all');
  }

  clearFilter(which: 'owner' | 'area' | 'status' | 'search' | 'tab'): void {
    if (which === 'owner') this.ownerId = '';
    if (which === 'area') this.areaType = '';
    if (which === 'status') this.projectStatus = '';
    if (which === 'tab') this.tab = 'all';
    if (which === 'search') { this.searchText = ''; this.appliedSearch = ''; }
    this.applyFilters();
  }

  resetFilters(): void {
    this.ownerId = ''; this.areaType = ''; this.projectStatus = '';
    this.searchText = ''; this.appliedSearch = ''; this.tab = 'all';
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.applyFilters();
  }

  private applyFilters(resetPage = true): void {
    const q = this.appliedSearch;
    this.scoped = this.rows.filter(r =>
      (!this.ownerId || r.idOwner === this.ownerId) &&
      (!this.areaType || r.areaType === this.areaType) &&
      (!this.projectStatus || r.status === this.projectStatus) &&
      (!q || r.search.includes(q)));

    const counts: Record<TabKey, number> = { all: this.scoped.length, problem: 0, warning: 0, ok: 0, empty: 0 };
    for (const r of this.scoped) if (r.state) counts[r.state]++;
    this.counts = counts;
    this.totals = sumHealth(this.scoped.map(r => r.health));
    this.ownerCount = new Set(this.scoped.map(r => r.idOwner).filter(Boolean)).size;
    this.missingHealth = this.scoped.filter(r => !r.health).length;

    const list = this.tab === 'all' ? this.scoped : this.scoped.filter(r => r.state === this.tab);
    this.filtered = this.sortRows(list);
    if (resetPage) this.currentPage = 1;
    this.updatePage();
  }

  // ---------------------------------------------------------------------------
  // Sort & pagination
  // ---------------------------------------------------------------------------

  onSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      // numbers & time: biggest / newest first; text & health: natural order first
      this.sortDirection = ['name', 'health', 'location'].includes(field) ? 'asc' : 'desc';
    }
    this.filtered = this.sortRows(this.filtered);
    this.updatePage();
  }

  sortIcon(field: SortField): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  ariaSort(field: SortField): string {
    if (this.sortField !== field) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  /** Default ("health"): Bermasalah → Terlambat → Normal → Belum ada perangkat, then most dead nodes, then name. */
  private healthCompare(a: ProjectRow, b: ProjectRow): number {
    const oa = a.state ? HEALTH_ORDER[a.state] : 9;
    const ob = b.state ? HEALTH_ORDER[b.state] : 9;
    return (oa - ob)
      || (b.dead - a.dead)
      || ((b.health?.stale ?? 0) - (a.health?.stale ?? 0))
      || ((b.health?.openAlerts ?? 0) - (a.health?.openAlerts ?? 0));
  }

  private sortRows(list: ProjectRow[]): ProjectRow[] {
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const byName = (a: ProjectRow, b: ProjectRow) => a.name.localeCompare(b.name, 'id');
    const num = (r: ProjectRow, f: SortField): number => {
      const h = r.health;
      switch (f) {
        case 'fresh': return h && h.nodes ? h.fresh / h.nodes : -1;
        case 'late': return h ? r.dead * 1000 + h.stale : -1;
        case 'sensors': return h ? h.sensors : -1;
        case 'alerts': return h ? h.openAlerts : -1;
        case 'lastSeen': return r.lastSeenMs;
        default: return 0;
      }
    };
    return [...list].sort((a, b) => {
      let c = 0;
      switch (this.sortField) {
        case 'name': c = byName(a, b); break;
        case 'health': c = this.healthCompare(a, b); break;
        case 'location':
          // empty location always last
          if (!a.location !== !b.location) return a.location ? -1 : 1;
          c = a.location.localeCompare(b.location, 'id'); break;
        default: c = num(a, this.sortField) - num(b, this.sortField);
      }
      return c * dir || byName(a, b);
    });
  }

  private updatePage(): void {
    const total = this.filtered.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePage();
  }

  changePageSize(size: number | string): void {
    const n = Number(size);
    if (!isNaN(n) && n > 0) { this.pageSize = n; this.currentPage = 1; this.updatePage(); }
  }

  get pageNumbers(): number[] {
    const total = this.totalPages, win = 5;
    if (total <= win) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, this.currentPage - Math.floor(win / 2));
    start = Math.min(start, total - win + 1);
    return Array.from({ length: win }, (_, i) => start + i);
  }

  get paginationStart(): number {
    return this.filtered.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filtered.length);
  }

  // ---------------------------------------------------------------------------
  // Display
  // ---------------------------------------------------------------------------

  timeAgo(r: ProjectRow): string {
    return timeAgoId(r.lastSeenAt, this.now);
  }

  freshPct(r: ProjectRow): number {
    const h = r.health;
    return h && h.nodes ? Math.round((h.fresh / h.nodes) * 100) : 0;
  }

  areaLabel(v: string): string {
    return AREA_LABEL[v] || v;
  }

  statusLabel(v: string): string {
    return PROJECT_STATUS_LABEL[v] || v;
  }

  ownerLabel(id: string): string {
    return this.ownerOptions.find(o => o.value === id)?.label
      || this.rows.find(r => r.idOwner === id)?.ownerName || id;
  }

  tabLabel(key: TabKey): string {
    return this.tabs.find(t => t.key === key)?.label || '';
  }

  openProject(r: ProjectRow): void {
    this.router.navigate(['/iot/projects', r.idProject, 'overview']);
  }

  stop(e: Event): void {
    e.stopPropagation();
  }

  trackRow(_i: number, r: ProjectRow): string {
    return r.idProject;
  }
}
