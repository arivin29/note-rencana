import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, interval, Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { formatInterval, telHref, timeAgoId } from '@app/shared/utils/channel-display';
import { nodeLabel, nodeSubLabel } from '@app/shared/utils/channel-verdict';
import { Freshness } from '@app/shared/utils/telemetry-freshness';
import { MobileProjectStore, ProjectData } from '../../shared/mobile-project-store.service';
import { nodeFreshness, toNodeLite } from '../../shared/channel-rows';
import { clockText, FRESHNESS_LABEL_ID, FRESHNESS_TONE, MTone } from '../../shared/labels';

type StatusFilter = 'all' | Freshness;

interface NodeVM {
  id: string; title: string; code: string; city: string;
  freshness: Freshness; tone: MTone; statusLabel: string;
  lastText: string; interval: string;
  picName: string; picPhone: string; hay: string;
}

const ORDER: Record<Freshness, number> = { offline: 0, stale: 1, nodata: 2, fresh: 3 };

/**
 * Tab Perangkat project: semua perangkat (fetchAll, tidak terpotong), judul = alamat,
 * status = getFreshness(lastSeenAt, telemetryIntervalSec). Chip status menjumlah ke total;
 * filter `?status=` dipakai KPI Ringkasan.
 */
@Component({
  selector: 'mobile-nodes-list',
  templateUrl: './mobile-nodes-list.component.html',
  standalone: false
})
export class MobileNodesListComponent implements OnInit, OnDestroy {
  s!: ProjectData;
  pid = '';
  search = '';
  status: StatusFilter = 'all';
  readonly options: StatusFilter[] = ['all', 'fresh', 'stale', 'offline', 'nodata'];
  counts: Record<StatusFilter, number> = { all: 0, fresh: 0, stale: 0, offline: 0, nodata: 0 };
  nodes: NodeVM[] = [];
  updated = '';

  private all: NodeVM[] = [];
  private destroy$ = new Subject<void>();

  constructor(private store: MobileProjectStore, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.pid = this.store.pid;
    combineLatest([this.store.state$, this.route.queryParamMap, interval(30_000).pipe(startWith(0))])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([s, q]) => {
        const st = q.get('status') as StatusFilter | null;
        this.status = st && (this.options as string[]).includes(st) ? st : 'all';
        if (s.pid) { this.pid = s.pid; }
        this.build(s);
      });
  }

  label(o: StatusFilter): string { return o === 'all' ? 'Semua' : FRESHNESS_LABEL_ID[o]; }

  setStatus(o: StatusFilter): void {
    this.router.navigate([], {
      relativeTo: this.route, replaceUrl: true,
      queryParams: { status: o === 'all' ? null : o }, queryParamsHandling: 'merge'
    });
  }

  onSearch(v: string): void { this.search = v; this.apply(); }
  retry(): void { this.store.refresh(); }
  tel(p: string): string { return telHref(p); }
  trackById(_: number, n: NodeVM): string { return n.id; }

  private build(s: ProjectData): void {
    this.s = s;
    this.updated = clockText(s.updatedAt);
    const now = Date.now();
    this.all = (s.nodes || []).map((raw) => {
      const n = toNodeLite(raw);
      const f = nodeFreshness(n, now);
      return {
        id: n.idNode,
        title: nodeLabel(n) || '(tanpa alamat)',
        code: nodeSubLabel(n),
        city: [raw.city, raw.province].filter(Boolean).join(', '),
        freshness: f, tone: FRESHNESS_TONE[f], statusLabel: FRESHNESS_LABEL_ID[f],
        lastText: n.lastSeenAt ? `Data terakhir ${timeAgoId(n.lastSeenAt, now)}` : 'Belum pernah kirim',
        interval: formatInterval(n.telemetryIntervalSec),
        picName: n.picName, picPhone: n.picPhone,
        hay: `${n.address} ${n.code} ${n.name} ${n.city}`.toLowerCase()
      };
    }).sort((a, b) => (ORDER[a.freshness] - ORDER[b.freshness]) || a.title.localeCompare(b.title, 'id'));
    this.apply();
  }

  private apply(): void {
    const term = this.search.trim().toLowerCase();
    const base = term ? this.all.filter((n) => n.hay.includes(term)) : this.all;
    this.counts = { all: base.length, fresh: 0, stale: 0, offline: 0, nodata: 0 };
    for (const n of base) { this.counts[n.freshness]++; }
    this.nodes = this.status === 'all' ? base : base.filter((n) => n.freshness === this.status);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
