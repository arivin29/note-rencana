import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, interval, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { formatInterval } from '@app/shared/utils/channel-display';
import { ChannelTrend } from '@app/shared/utils/channel-display';
import { FlowChannelLike, FlowMeterInput, FlowMeterService } from '@services/flow-meter.service';
import { MobileProjectStore, ProjectData } from '../../shared/mobile-project-store.service';
import { buildChannelRows, ChannelRow, sortChannelRows } from '../../shared/channel-rows';
import { clockText } from '../../shared/labels';

/** Satu kartu diagram hidrolika per sensor flow meter. */
interface FlowCard { sensorId: string; label: string; data: FlowMeterInput; }
interface Row { k: string; v: string; }

const NODE_STATUS_ID: Record<string, string> = {
  active: 'Aktif', inactive: 'Nonaktif', maintenance: 'Perawatan', pending: 'Menunggu', decommissioned: 'Tidak dipakai'
};

/**
 * Segmen Nilai: channel nilai terbaru (`/api/sensors` via store, difilter per perangkat) +
 * sparkline 24 jam (satu /sensors/trends project) → hidrolika → konteks pemasangan →
 * info teknis (dilipat). Tidak menampilkan "Uptime"/"Baterai" backend (heuristik, bukan metrik).
 */
@Component({
  selector: 'mobile-node-info',
  templateUrl: './mobile-node-info.component.html',
  standalone: false
})
export class MobileNodeInfoComponent implements OnInit, OnDestroy {
  s!: ProjectData;
  nid = '';
  rows: ChannelRow[] = [];
  flowCards: FlowCard[] = [];
  sensors: { id: string; label: string }[] = [];
  info: Row[] = [];
  updated = '';

  ctxOpen = false;
  ctxSensorId = '';
  ctxSensorLabel = '';

  /** diameter dari release context, diambil SEKALI per sensor (bukan tiap poll) */
  private diameterCache = new Map<string, number | null>();
  private diameterPending = new Set<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public store: MobileProjectStore,
    private flowMeter: FlowMeterService,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  ngOnInit(): void {
    this.store.ensureTrends();
    const nid$ = (this.route.parent || this.route).paramMap.pipe(map((p) => p.get('nid') || ''));
    combineLatest([nid$, this.store.state$, this.store.trends$, interval(30_000).pipe(startWith(0))])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([nid, s, trends]) => this.build(nid, s, trends));
  }

  openCtx(s: { id: string; label: string }): void { this.ctxSensorId = s.id; this.ctxSensorLabel = s.label; this.ctxOpen = true; }
  closeCtx(): void { this.ctxOpen = false; }
  retry(): void { this.store.refresh(); }

  private build(nid: string, s: ProjectData, trends: Map<string, ChannelTrend> | null): void {
    this.nid = nid;
    this.s = s;
    this.updated = clockText(s.updatedAt);
    const node = (s.nodes || []).find((n) => n.idNode === nid || n.code === nid);
    const realId = node?.idNode || nid;
    const mine = (s.sensors || []).filter((x) => (x.idNode || x.node?.idNode) === realId);
    const byId = new Map<string, any>(node ? [[realId, node]] : []);
    this.rows = sortChannelRows(buildChannelRows({
      sensors: mine, nodesById: byId, pid: this.store.pid, locale: this.locale,
      now: Date.now(), latestAvailable: s.latestAvailable, context: 'node', trends
    }));

    const cards: FlowCard[] = [];
    const list: { id: string; label: string }[] = [];
    for (const sen of mine) {
      const sid = sen.idSensor || '';
      const label = (sen.label || sen.sensorCode || sen.sensorCatalog?.modelName || '').trim() || 'Sensor';
      if (sid) { list.push({ id: sid, label }); }
      const flowCh: FlowChannelLike[] = (sen.channels || []).map((c: any) => ({
        id: c.idSensorChannel, metric: c.metricCode, unit: c.unit || '',
        latest: c.lastValue != null && s.latestAvailable ? Number(c.lastValue) : null
      }));
      if (sid && this.flowMeter.isFlowMeter(flowCh, sen.sensorCatalog?.modelName || sen.label)) {
        let data = this.flowMeter.build(flowCh, sen.lastValueAt || null);
        if (data.diameterMm === null) {
          const cached = this.diameterCache.get(sid);
          if (cached != null) { data = { ...data, diameterMm: cached, diameterSource: 'context' }; }
          else if (!this.diameterCache.has(sid)) { this.fetchDiameter(sid); }
        }
        cards.push({ sensorId: sid, label, data });
      }
    }
    this.flowCards = cards;
    this.sensors = list;
    this.info = node ? this.infoRows(node) : [];
  }

  private fetchDiameter(sid: string): void {
    if (this.diameterPending.has(sid)) { return; }
    this.diameterPending.add(sid);
    this.flowMeter.diameterFromContext(sid).pipe(takeUntil(this.destroy$)).subscribe((d) => {
      this.diameterPending.delete(sid);
      this.diameterCache.set(sid, d);
      if (d === null) { return; }
      // ganti referensi supaya ngOnChanges komponen diagram ikut jalan
      this.flowCards = this.flowCards.map((c) => c.sensorId === sid && c.data.diameterMm === null
        ? { ...c, data: { ...c.data, diameterMm: d, diameterSource: 'context' } } : c);
    });
  }

  private infoRows(n: any): Row[] {
    const dash = '—';
    const rows: Row[] = [
      { k: 'Kode', v: n.code || dash },
      { k: 'Model', v: [n.nodeModel?.vendor, n.nodeModel?.modelName].filter(Boolean).join(' ') || dash },
      { k: 'Protokol', v: (n.nodeModel?.protocol || '').toUpperCase() || dash },
      { k: 'Interval kirim', v: formatInterval(n.telemetryIntervalSec) || dash },
      { k: 'Firmware', v: n.firmwareVersion || dash },
      { k: 'Nomor seri', v: n.serialNumber || dash },
      { k: 'Dev EUI', v: n.devEui || dash },
      { k: 'Sumber daya', v: n.powerSource || n.batteryType || dash },
      { k: 'Jenis instalasi', v: n.installationType || dash },
      { k: 'Lokasi', v: [n.city, n.province].filter(Boolean).join(', ') || dash },
      { k: 'Koordinat', v: n.latitude != null && n.longitude != null ? `${n.latitude}, ${n.longitude}` : dash },
      { k: 'Status perangkat', v: NODE_STATUS_ID[(n.status || '').toLowerCase()] || n.status || dash }
    ];
    if (n.picName || n.picEmail) {
      rows.push({ k: 'PIC', v: [n.picName, n.picEmail].filter(Boolean).join(' · ') });
    }
    return rows;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
