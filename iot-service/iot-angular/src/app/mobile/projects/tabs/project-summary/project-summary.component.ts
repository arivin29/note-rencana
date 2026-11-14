import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, interval, Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { ScadaDiagram, ScadaService } from '@services/scada.service';
import { deadSinceText, formatDuration, formatInterval, telHref, timeAgoId } from '@app/shared/utils/channel-display';
import { nodeLabel, nodeSubLabel, thresholdText } from '@app/shared/utils/channel-verdict';
import { Freshness } from '@app/shared/utils/telemetry-freshness';
import { MobileProjectStore, ProjectData } from '../../../shared/mobile-project-store.service';
import { MobileScopeService } from '../../../shared/mobile-scope.service';
import { cleanTs } from '../../../shared/util';
import { buildChannelRows, ChannelRow, KeyReading, keyReadingsByNode, nodeFreshness, toNodeLite } from '../../../shared/channel-rows';
import {
  clockText, FRESHNESS_LABEL_ID, FRESHNESS_TONE, mErrorText, MTone, ruleTypeLabel, severityLabel, severityRank, severityTone
} from '../../../shared/labels';
import { mFormatNumber } from '../../../shared/mobile-format';

interface AttnItem {
  key: string;
  kind: 'alert' | 'out' | 'dead';
  rank: number;
  title: string;
  code: string;
  badge: string;
  tone: MTone;
  line: string;
  time: string;
  phone: string;
  phoneLabel: string;
  link: any[];
}

interface Seg { key: Freshness; label: string; tone: MTone; n: number; pct: number; }

/** Baris "Nilai terkini": perangkat + nilai kunci (tekanan/debit) dari store — tanpa request baru. */
interface KeyNode { id: string; title: string; code: string; tone: MTone; statusLabel: string; last: string; reads: KeyReading[]; }

const KEY_NODES_MAX = 6;

/**
 * Ringkasan project (pengganti Dashboard): bar status perangkat Aktif/Terlambat/Offline/Belum ada
 * data (getFreshness), 4 KPI yang membuka daftar terfilter, "Perlu perhatian" (peringatan aktif +
 * channel di luar ambang + perangkat mati, dengan alamat, nilai vs ambang, telepon PIC) dan
 * kartu Bagan SCADA (layar penuh). Data dari MobileProjectStore (dibagi dengan tab lain).
 */
@Component({
  selector: 'mobile-project-summary',
  templateUrl: './project-summary.component.html',
  standalone: false
})
export class MobileProjectSummaryComponent implements OnInit, OnDestroy {
  s!: ProjectData;
  pid = '';
  meta = { area: '', owner: '', lastData: '', interval: '' };
  updated = '';

  total = 0;
  segs: Seg[] = [];
  offline = 0;
  nodata = 0;
  outCount = 0;
  channelsTotal = 0;
  withThreshold = 0;
  attention: AttnItem[] = [];
  allClear = false;
  /** nilai kunci terkini per perangkat (maks KEY_NODES_MAX) */
  keyNodes: KeyNode[] = [];
  keyNodesTotal = 0;

  diagrams: ScadaDiagram[] = [];
  scadaLoading = true;
  scadaError = '';

  private destroy$ = new Subject<void>();

  constructor(
    private store: MobileProjectStore,
    private scope: MobileScopeService,
    private scada: ScadaService,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  ngOnInit(): void {
    this.pid = this.store.pid;
    this.loadScada();
    combineLatest([this.store.state$, interval(30_000).pipe(startWith(0))])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([s]) => this.build(s));
  }

  retry(): void { this.store.refresh(); }

  loadScada(): void {
    this.scadaLoading = true; this.scadaError = '';
    this.scada.getDiagramsByProject(this.pid).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.diagrams = d || []; this.scadaLoading = false; },
      error: (e) => { this.scadaError = mErrorText(e, 'bagan SCADA'); this.scadaLoading = false; }
    });
  }

  tel(p: string): string { return telHref(p); }
  trackById(_: number, n: KeyNode): string { return n.id; }
  get freshCount(): number { return this.segs[0]?.n || 0; }
  /** warna garis severity kiri baris perhatian */
  sevClass(t: MTone): string { return 'm-attn__sev--' + t; }
  trackByKey(_: number, a: AttnItem): string { return a.key; }

  private build(s: ProjectData): void {
    this.s = s;
    // pid dibaca reaktif dari store (shell dipakai ulang saat pindah project)
    if (s.pid && s.pid !== this.pid) { this.pid = s.pid; this.loadScada(); }
    const now = Date.now();
    const nodes = s.nodes || [];
    const byId = new Map<string, any>(nodes.map((n) => [n.idNode, n]));
    const p = this.scope.findCached(this.pid);
    let maxSeen = 0;
    for (const n of nodes) { const t = cleanTs(n.lastSeenAt) ? new Date(n.lastSeenAt).getTime() : 0; if (t > maxSeen) { maxSeen = t; } }
    const intervals = [...new Set(nodes.map((n) => n.telemetryIntervalSec).filter((v) => !!v))];
    this.meta = {
      area: p?.areaType || '',
      owner: p?.ownerName || '',
      lastData: maxSeen ? timeAgoId(new Date(maxSeen), now) : '',
      interval: intervals.length === 1 ? formatInterval(intervals[0]) : ''
    };
    this.updated = clockText(s.updatedAt);

    // ---- status perangkat (freshness) ----
    const counts: Record<Freshness, number> = { fresh: 0, stale: 0, offline: 0, nodata: 0 };
    const fresh = new Map<string, Freshness>();
    for (const n of nodes) { const f = nodeFreshness(n, now); fresh.set(n.idNode, f); counts[f]++; }
    this.total = nodes.length;
    this.offline = counts.offline;
    this.nodata = counts.nodata;
    this.segs = (['fresh', 'stale', 'offline', 'nodata'] as Freshness[]).map((k) => ({
      key: k, label: FRESHNESS_LABEL_ID[k], tone: FRESHNESS_TONE[k], n: counts[k],
      pct: this.total ? (counts[k] / this.total) * 100 : 0
    }));

    // ---- channel ----
    const rows = s.sensors ? buildChannelRows({
      sensors: s.sensors, nodesById: byId, pid: this.pid, locale: this.locale, now,
      latestAvailable: s.latestAvailable, context: 'project'
    }) : [];
    this.channelsTotal = rows.length;
    this.withThreshold = rows.filter((r) => r.hasThreshold).length;
    const outRows = rows.filter((r) => r.verdict.isOut);
    this.outCount = outRows.length;
    const chById = new Map<string, ChannelRow>(rows.map((r) => [r.id, r]));

    // ---- nilai terkini (tekanan/debit dulu); perangkat tanpa nilai tidak ditampilkan ----
    const reads = s.latestAvailable ? keyReadingsByNode(rows, 2) : new Map<string, KeyReading[]>();
    const keyNodes: KeyNode[] = [];
    for (const n of nodes) {
      const r = reads.get(n.idNode);
      if (!r?.length) { continue; }
      const nl = toNodeLite(n);
      const f = fresh.get(n.idNode) || 'nodata';
      keyNodes.push({
        id: n.idNode, title: nodeLabel(nl) || 'Perangkat', code: nodeSubLabel(nl),
        tone: FRESHNESS_TONE[f], statusLabel: FRESHNESS_LABEL_ID[f],
        last: nl.lastSeenAt ? timeAgoId(nl.lastSeenAt, now) : '', reads: r
      });
    }
    keyNodes.sort((a, b) => a.title.localeCompare(b.title, 'id'));
    this.keyNodesTotal = keyNodes.length;
    this.keyNodes = keyNodes.slice(0, KEY_NODES_MAX);

    // ---- perlu perhatian ----
    const items: AttnItem[] = [];
    const nodesWithOfflineAlert = new Set<string>();
    for (const a of s.alerts?.list || []) {
      const nid = a.node?.idNode || a.idNode || '';
      const n = byId.get(nid);
      const nl = toNodeLite(n, a.node);
      const sc = a.alertRule?.sensorChannel;
      const row = sc?.idSensorChannel ? chById.get(sc.idSensorChannel) : undefined;
      const type = a.alertRule?.ruleType;
      if (type === 'node_offline' && nid) { nodesWithOfflineAlert.add(nid); }
      let line = ruleTypeLabel(type);
      if (type === 'node_offline' && a.value != null && !isNaN(Number(a.value))) {
        line += ` · ${formatDuration(Number(a.value) * 60_000)}`;
      } else if (sc && a.value != null) {
        const unit = sc.unit || row?.unit || '';
        const prec = row?.precision;
        const fmt = (v: number) => mFormatNumber(v, this.locale, prec);
        const ch = (s.sensors || []).flatMap((x: any) => x.channels || []).find((c: any) => c.idSensorChannel === sc.idSensorChannel);
        line = `${row?.metricLabel || sc.metricCode || 'Nilai'} ${fmt(Number(a.value))} ${unit}`.trim();
        if (ch) { line += ` · ${thresholdText(ch.minThreshold, ch.maxThreshold, unit, fmt)}`; }
      }
      items.push({
        key: 'a' + (a.idAlertEvent || items.length),
        kind: 'alert',
        rank: severityRank(a.severity),
        title: nodeLabel(nl) || 'Perangkat',
        code: nodeSubLabel(nl),
        badge: severityLabel(a.severity),
        tone: severityTone(a.severity) === 'info' ? 'off' : severityTone(a.severity) as MTone,
        line,
        time: timeAgoId(a.triggeredAt || a.createdAt, now),
        phone: nl.picPhone,
        phoneLabel: nl.picName || 'PIC',
        link: nid ? ['/mobile/p', this.pid, 'nodes', nid] : ['/mobile/p', this.pid, 'peringatan']
      });
    }
    for (const r of outRows) {
      const n = toNodeLite(byId.get(r.nodeId));
      items.push({
        key: 'o' + r.id, kind: 'out', rank: 4,
        title: r.nodeTitle, code: n.address ? n.code : '',
        badge: 'Di luar ambang', tone: 'danger',
        line: `${r.metricLabel} ${r.valueText} ${r.unit} · ${r.outText || r.thresholdText}`.trim(),
        time: r.lastAt ? timeAgoId(r.lastAt, now) : '',
        phone: n.picPhone, phoneLabel: n.picName || 'PIC',
        link: r.link
      });
    }
    const deadRank: Record<string, number> = { offline: 5, stale: 6, nodata: 7 };
    for (const n of nodes) {
      const f = fresh.get(n.idNode) || 'nodata';
      if (f === 'fresh' || nodesWithOfflineAlert.has(n.idNode)) { continue; }
      const nl = toNodeLite(n);
      items.push({
        key: 'n' + n.idNode, kind: 'dead', rank: deadRank[f],
        title: nodeLabel(nl) || 'Perangkat', code: nodeSubLabel(nl),
        badge: FRESHNESS_LABEL_ID[f], tone: FRESHNESS_TONE[f],
        line: deadSinceText(cleanTs(n.lastSeenAt), now),
        time: '',
        phone: nl.picPhone, phoneLabel: nl.picName || 'PIC',
        link: ['/mobile/p', this.pid, 'nodes', n.idNode]
      });
    }
    this.attention = items.sort((a, b) => a.rank - b.rank);
    this.allClear = items.length === 0 && this.total > 0 && !!s.nodes && !!s.sensors && !!s.alerts &&
      !s.nodesError && !s.sensorsError && !s.alertsError;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
