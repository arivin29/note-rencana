import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, interval, Subject } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { formatInterval, telHref, timeAgoId } from '@app/shared/utils/channel-display';
import { nodeLabel, nodeSubLabel } from '@app/shared/utils/channel-verdict';
import { freshnessThresholds } from '@app/shared/utils/telemetry-freshness';
import { MobileProjectStore, ProjectData } from '../../shared/mobile-project-store.service';
import { MobileChromeService } from '../../shared/mobile-chrome.service';
import { nodeFreshness, toNodeLite } from '../../shared/channel-rows';
import { FRESHNESS_LABEL_ID, FRESHNESS_TONE, MTone } from '../../shared/labels';

/**
 * Shell detail perangkat `/mobile/p/:pid/nodes/:nid`: kepala (alamat, kode, status freshness,
 * data terakhir, telepon PIC) + segmen Nilai · Perintah · Log. Node diambil dari
 * MobileProjectStore (tanpa request tambahan); judul AppBar = alamat.
 */
@Component({
  selector: 'mobile-node-detail',
  templateUrl: './mobile-node-detail.component.html',
  standalone: false
})
export class MobileNodeDetailComponent implements OnInit, OnDestroy {
  s!: ProjectData;
  nid = '';
  pid = '';
  found = false;
  head = { title: '', code: '', tone: 'off' as MTone, status: '', last: '', ago: '', interval: '', rule: '', phone: '', picName: '' };

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, public store: MobileProjectStore, private chrome: MobileChromeService) {}

  ngOnInit(): void {
    this.pid = this.store.pid;
    const nid$ = this.route.paramMap.pipe(map((p) => p.get('nid') || ''), distinctUntilChanged());
    combineLatest([nid$, this.store.state$, interval(30_000).pipe(startWith(0))])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([nid, s]) => {
        this.nid = nid;
        this.s = s;
        if (s.pid) { this.pid = s.pid; }
        const raw = (s.nodes || []).find((n) => n.idNode === nid || n.code === nid);
        this.found = !!raw;
        if (!raw) { return; }
        const n = toNodeLite(raw);
        const now = Date.now();
        const f = nodeFreshness(n, now);
        const th = freshnessThresholds(n.telemetryIntervalSec);
        this.head = {
          title: nodeLabel(n) || 'Perangkat',
          code: nodeSubLabel(n),
          tone: FRESHNESS_TONE[f],
          status: FRESHNESS_LABEL_ID[f],
          last: n.lastSeenAt ? `Data terakhir ${timeAgoId(n.lastSeenAt, now)}` : 'Belum pernah kirim',
          ago: n.lastSeenAt ? timeAgoId(n.lastSeenAt, now) : '',
          interval: formatInterval(n.telemetryIntervalSec),
          rule: `terlambat bila > ${th.freshMin} mnt, offline bila > ${th.staleMin} mnt`,
          phone: n.picPhone,
          picName: n.picName
        };
        this.chrome.setTitle('page', this.head.title, this.head.code);
      });
  }

  tel(p: string): string { return telHref(p); }
  retry(): void { this.store.refresh(); }

  ngOnDestroy(): void {
    this.chrome.clearTitle('page');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
