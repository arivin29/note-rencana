import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, interval, Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { MobileProjectStore, ProjectData } from '../../../shared/mobile-project-store.service';
import { buildChannelRows, ChannelRow, ChannelStatusKey, sortChannelRows } from '../../../shared/channel-rows';
import { clockText, FRESHNESS_LABEL_ID } from '../../../shared/labels';

type Filter = 'all' | ChannelStatusKey;

/**
 * Tab Channel project: nilai terakhir SEMUA channel dari `/api/sensors?idProject&activeOnly`
 * (ClickHouse latest + ambang + presisi) + sparkline 24 jam dari SATU `/api/sensors/trends`.
 * Chip status saling lepas dan menjumlah ke total. `?status=out` dipakai KPI Ringkasan.
 */
@Component({
  selector: 'mobile-project-channels',
  templateUrl: './project-channels.component.html',
  standalone: false
})
export class MobileProjectChannelsComponent implements OnInit, OnDestroy {
  s!: ProjectData;
  search = '';
  status: Filter = 'all';
  options: Filter[] = ['all', 'out', 'fresh', 'stale', 'offline', 'nodata'];
  counts: Record<Filter, number> = { all: 0, out: 0, fresh: 0, stale: 0, offline: 0, nodata: 0, na: 0 };
  rows: ChannelRow[] = [];
  total = 0;
  updated = '';

  private all: ChannelRow[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    public store: MobileProjectStore,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  ngOnInit(): void {
    this.store.ensureTrends();
    combineLatest([this.store.state$, this.store.trends$, this.route.queryParamMap, interval(30_000).pipe(startWith(0))])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([s, trends, q]) => {
        const st = q.get('status') as Filter | null;
        this.status = st && (this.options as string[]).includes(st) ? st : 'all';
        this.s = s;
        this.updated = clockText(s.updatedAt);
        const byId = new Map<string, any>((s.nodes || []).map((n) => [n.idNode, n]));
        this.all = sortChannelRows(buildChannelRows({
          sensors: s.sensors || [], nodesById: byId, pid: this.store.pid, locale: this.locale,
          now: Date.now(), latestAvailable: s.latestAvailable, context: 'project', trends
        }));
        // latestAvailable=false: status tidak bisa dinilai → hanya chip "Semua"
        this.options = s.latestAvailable ? ['all', 'out', 'fresh', 'stale', 'offline', 'nodata'] : ['all'];
        this.apply();
      });
  }

  label(o: Filter): string {
    if (o === 'all') { return 'Semua'; }
    if (o === 'out') { return 'Di luar ambang'; }
    if (o === 'na') { return 'Tidak tersedia'; }
    return FRESHNESS_LABEL_ID[o];
  }

  setStatus(o: Filter): void {
    this.router.navigate([], {
      relativeTo: this.route, replaceUrl: true,
      queryParams: { status: o === 'all' ? null : o }, queryParamsHandling: 'merge'
    });
  }

  onSearch(v: string): void { this.search = v; this.apply(); }
  retry(): void { this.store.refresh(); }

  private apply(): void {
    const term = this.search.trim().toLowerCase();
    const base = term ? this.all.filter((r) => r.hay.includes(term)) : this.all;
    this.counts = { all: base.length, out: 0, fresh: 0, stale: 0, offline: 0, nodata: 0, na: 0 };
    for (const r of base) { this.counts[r.statusKey]++; }
    this.total = this.all.length;
    this.rows = this.status === 'all' ? base : base.filter((r) => r.statusKey === this.status);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
