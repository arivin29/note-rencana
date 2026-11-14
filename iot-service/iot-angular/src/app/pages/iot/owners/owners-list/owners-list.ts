import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { OwnersService } from '@sdk/core/services';
import { fetchAll } from '@app/shared/utils/fetch-all';
import {
  ProjectHealth, HealthState, healthOf, healthState, deadNodes, sumHealth,
  HEALTH_LABEL, HEALTH_BADGE, HEALTH_ORDER
} from '@app/shared/utils/project-health';
import { timeAgoId } from '@app/shared/utils/channel-display';
import { normalizeSla } from '../owner-form-options';

interface OwnerRow {
  idOwner: string;
  name: string;
  ownerCode: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  sla: string | null;
  projectCount: number;
  nodeCount: number;
  sensorCount: number;
  health: ProjectHealth | null;
  state: HealthState;
  lastSeenAt: string | null;
  haystack: string;
}

type TabKey = 'all' | HealthState;
type SortKey = 'health' | 'name' | 'alerts' | 'lastSeen';

@Component({
  selector: 'owners-list',
  templateUrl: './owners-list.html',
  styleUrls: ['./owners-list.scss'],
  standalone: false
})
export class OwnersListPage implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  lastRefreshedAt: Date | null = null;

  rows: OwnerRow[] = [];
  filtered: OwnerRow[] = [];

  readonly tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'problem', label: HEALTH_LABEL.problem },
    { key: 'warning', label: HEALTH_LABEL.warning },
    { key: 'ok', label: HEALTH_LABEL.ok },
    { key: 'empty', label: HEALTH_LABEL.empty }
  ];
  activeTab: TabKey = 'all';
  tabCounts: Record<TabKey, number> = { all: 0, problem: 0, warning: 0, ok: 0, empty: 0 };

  searchText = '';
  sortKey: SortKey = 'health';
  sortDir: 'asc' | 'desc' = 'asc';

  pageSizeOptions = [25, 50, 100];
  pageSize = 25;
  currentPage = 1;

  // KPI (whole dataset, not filtered)
  total: ProjectHealth = sumHealth([]);
  ownersWithDevices = 0;
  problemOwners = 0;

  readonly HEALTH_LABEL = HEALTH_LABEL;
  readonly HEALTH_BADGE = HEALTH_BADGE;
  readonly deadNodes = deadNodes;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private load$ = new Subject<void>();

  constructor(private ownersService: OwnersService, private router: Router) {}

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage = 1; this.applyFilters(); });
    this.load();
  }

  ngOnDestroy(): void {
    this.load$.next();
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.load$.next(); // cancel a request still in flight
    this.loading = true;
    this.error = null;
    fetchAll(p => this.ownersService.ownersControllerFindAll$Response(p))
      .pipe(takeUntil(this.load$), takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.rows = items.map(o => this.toRow(o));
          this.computeKpi();
          this.applyFilters();
          this.lastRefreshedAt = new Date();
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Gagal memuat daftar owner.';
          this.loading = false;
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.search$.next(value.trim().toLowerCase());
  }

  setTab(key: TabKey): void {
    this.activeTab = key;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'alerts' || key === 'lastSeen' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) return 'fa-sort opacity-25';
    return this.sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  ariaSort(key: SortKey): string {
    if (this.sortKey !== key) return 'none';
    return this.sortDir === 'asc' ? 'ascending' : 'descending';
  }

  resetFilters(): void {
    this.searchText = '';
    this.search$.next('');
    this.activeTab = 'all';
    this.currentPage = 1;
    this.applyFilters();
  }

  openOwner(row: OwnerRow): void {
    this.router.navigate(['/iot/owners', row.idOwner]);
  }

  stop(e: Event): void { e.stopPropagation(); }

  timeAgo(at: string | null): string { return timeAgoId(at); }

  trackRow(_: number, r: OwnerRow): string { return r.idOwner; }

  // ---- pagination ----
  get pageRows(): OwnerRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get paginationStart(): number { return this.filtered.length ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get paginationEnd(): number { return Math.min(this.currentPage * this.pageSize, this.filtered.length); }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  changePageSize(size: number | string): void {
    const n = Number(size);
    if (n > 0) { this.pageSize = n; this.currentPage = 1; }
  }

  // ---- private ----
  private toRow(o: any): OwnerRow {
    const health = healthOf(o);
    const row: OwnerRow = {
      idOwner: o.idOwner || o.id || '',
      name: o.name || '—',
      ownerCode: o.ownerCode || '',
      industry: o.industry || '',
      contactPerson: o.contactPerson || '',
      email: o.email || '',
      phone: o.phone || '',
      sla: normalizeSla(o.slaLevel),
      projectCount: Number(o.projectCount ?? 0) || 0,
      nodeCount: Number(o.nodeCount ?? health?.nodes ?? 0) || 0,
      sensorCount: Number(o.sensorCount ?? health?.sensors ?? 0) || 0,
      health,
      state: healthState(health),
      lastSeenAt: health?.lastSeenAt ?? null,
      haystack: ''
    };
    row.haystack = [row.name, row.ownerCode, row.industry, row.contactPerson, row.email, row.phone]
      .join(' ').toLowerCase();
    return row;
  }

  private computeKpi(): void {
    this.total = sumHealth(this.rows.map(r => r.health));
    this.ownersWithDevices = this.rows.filter(r => r.state !== 'empty').length;
    this.problemOwners = this.rows.filter(r => r.state === 'problem').length;
  }

  private applyFilters(): void {
    const q = this.searchText.trim().toLowerCase();
    const searched = q ? this.rows.filter(r => r.haystack.includes(q)) : this.rows;

    const counts: Record<TabKey, number> = { all: searched.length, problem: 0, warning: 0, ok: 0, empty: 0 };
    for (const r of searched) counts[r.state]++;
    this.tabCounts = counts;

    const list = this.activeTab === 'all' ? [...searched] : searched.filter(r => r.state === this.activeTab);
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const byName = (a: OwnerRow, b: OwnerRow) => a.name.localeCompare(b.name, 'id');
    list.sort((a, b) => {
      switch (this.sortKey) {
        case 'name':
          return dir * byName(a, b);
        case 'alerts':
          return dir * ((a.health?.openAlerts ?? 0) - (b.health?.openAlerts ?? 0)) || byName(a, b);
        case 'lastSeen': {
          const ta = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
          const tb = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
          return dir * (ta - tb) || byName(a, b);
        }
        default: {
          const d = HEALTH_ORDER[a.state] - HEALTH_ORDER[b.state];
          if (d) return dir * d;
          // within a state: most dead nodes / alerts first, then name
          const sev = (r: OwnerRow) => (r.health ? deadNodes(r.health) + r.health.openAlerts : 0);
          return (sev(b) - sev(a)) || byName(a, b);
        }
      }
    });
    this.filtered = list;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }
}
