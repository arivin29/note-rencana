import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { relTime } from '../../shared/util';
import { ChannelItem, ChStatus } from '../../shared/channel-list/mobile-channel-list.component';
import { RefreshBusService } from '../../shared/refresh-bus.service';
import { FlowChannelLike, FlowMeterInput, FlowMeterService } from '@services/flow-meter.service';

/** Satu kartu diagram hidrolika per sensor flow meter. */
interface FlowCard { sensorId: string; label: string; data: FlowMeterInput; }

type NodeStatus = 'online' | 'offline' | 'degraded';
interface Row { k: string; v: string; }

/** Tab Info: status → lokasi/kontak → channel(accordion+chart) → info → kesehatan. */
@Component({
  selector: 'mobile-node-info',
  templateUrl: './mobile-node-info.component.html',
  standalone: false
})
export class MobileNodeInfoComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  nodeId = '';

  head = { code: '', status: 'offline' as NodeStatus, lastSeen: '' };
  loc = { text: '', coords: '' };
  pic = { name: '', phone: '', email: '' };
  channels: ChannelItem[] = [];
  info: Row[] = [];
  health: Row[] = [];

  // diagram hidrolika per sensor flow meter (TUF-2000M dsb)
  flowCards: FlowCard[] = [];

  // installation context (per-sensor)
  sensors: { id: string; label: string }[] = [];
  ctxOpen = false;
  ctxSensorId = '';
  ctxSensorLabel = '';

  private destroy$ = new Subject<void>();

  constructor(
    private nodesSvc: NodesService,
    private route: ActivatedRoute,
    private auto: AutoRefreshService,
    private refreshBus: RefreshBusService,
    private flowMeter: FlowMeterService
  ) {}

  ngOnInit(): void {
    this.nodeId = this.route.parent?.snapshot.paramMap.get('id') || '';
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
  }

  get hasLocContact(): boolean {
    return !!(this.loc.text || this.loc.coords || this.pic.name || this.pic.phone || this.pic.email);
  }

  load(showLoading: boolean): void {
    if (showLoading) { this.loading = true; }
    this.nodesSvc.nodesControllerGetDashboard$Response({ id: this.nodeId })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let d: any = res.body;
          if (typeof d === 'string') { d = JSON.parse(d); }
          const node = d?.node || {};

          this.head = {
            code: node.code || node.name || this.nodeId,
            status: this.mapStatus(node.connectivityStatus),
            lastSeen: relTime(node.lastSeenAt)
          };
          this.loc = {
            text: [node.address, node.city, node.province].filter(Boolean).join(', '),
            coords: (node.latitude != null && node.longitude != null) ? `${node.latitude}, ${node.longitude}` : ''
          };
          this.pic = { name: node.picName || '', phone: node.picPhone || '', email: node.picEmail || '' };

          const sensors = (d?.sensorsWithData || []) as any[];
          const ch: ChannelItem[] = [];
          const sList: { id: string; label: string }[] = [];
          const cards: FlowCard[] = [];
          const updatedAt = node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleString('id-ID') : null;
          for (const s of sensors) {
            const sensorLabel = s.sensorCode || s.catalogName || '';
            const sid = s.idSensor || s.id || '';
            if (sid) { sList.push({ id: sid, label: sensorLabel || sid }); }

            // Sensor flow meter dapat kartu diagram d/Q/V + totalizer
            const flowCh: FlowChannelLike[] = (s.channels || []).map((c: any) => ({
              id: c.idSensorChannel,
              metric: c.metricCode,
              unit: c.unit || '',
              latest: c.latestValue != null ? Number(c.latestValue) : null
            }));
            if (sid && this.flowMeter.isFlowMeter(flowCh, s.catalogName)) {
              cards.push({ sensorId: sid, label: sensorLabel || s.catalogName || sid, data: this.flowMeter.build(flowCh, updatedAt) });
            }

            for (const c of (s.channels || [])) {
              ch.push({
                id: c.idSensorChannel, nodeId: this.nodeId, metric: c.metricCode, subtitle: sensorLabel,
                unit: c.unit || '',
                value: c.latestValue != null ? String(Math.round(Number(c.latestValue) * 100) / 100) : '—',
                status: this.mapCh(c.status), updated: relTime(c.timestamp || c.ts), range: ''
              });
            }
          }
          ch.sort((a, b) => (a.metric || '').localeCompare(b.metric || ''));
          this.channels = ch;
          this.sensors = sList;
          this.flowCards = cards;
          this.fillDiametersFromContext();

          this.info = [
            { k: 'Model', v: node.nodeModel?.modelName || '-' },
            { k: 'Vendor', v: node.nodeModel?.vendor || '-' },
            { k: 'Protokol', v: (node.nodeModel?.protocol || '').toUpperCase() || '-' },
            { k: 'Firmware', v: node.firmwareVersion || '-' },
            { k: 'Serial', v: node.serialNumber || '-' },
            { k: 'Dev EUI', v: node.devEui || '-' },
            { k: 'Interval', v: node.telemetryIntervalSec ? `${node.telemetryIntervalSec} dtk` : '-' },
            { k: 'Power', v: node.powerSource || node.batteryType || '-' },
            { k: 'Instalasi', v: node.installationType || '-' },
            { k: 'Status', v: node.status || '-' }
          ];

          const h = d?.health || {};
          const up = d?.uptime || {};
          this.health = [
            { k: 'Uptime', v: up.percentage != null ? `${up.percentage.toFixed(1)}%` : '-' },
            { k: 'Kondisi', v: h.overall || '-' },
            { k: 'Konektivitas', v: h.connectivity || '-' },
            { k: 'Baterai', v: h.battery || '-' }
          ];

          this.loading = false; this.error = null;
        },
        error: (err) => { this.error = err?.message || 'Gagal memuat perangkat'; this.loading = false; }
      });
  }

  /** Lengkapi diameter dari release context untuk kartu yang alatnya belum kirim. */
  private fillDiametersFromContext(): void {
    this.flowCards
      .filter((card) => card.data.diameterMm === null)
      .forEach((card) => {
        this.flowMeter.diameterFromContext(card.sensorId)
          .pipe(takeUntil(this.destroy$))
          .subscribe((diameterMm) => {
            if (diameterMm === null) { return; }
            // ganti referensi supaya ngOnChanges komponen diagram ikut jalan
            card.data = { ...card.data, diameterMm, diameterSource: 'context' };
          });
      });
  }

  openCtx(s: { id: string; label: string }): void { this.ctxSensorId = s.id; this.ctxSensorLabel = s.label; this.ctxOpen = true; }
  closeCtx(): void { this.ctxOpen = false; }

  private mapStatus(s: string): NodeStatus { return s === 'online' ? 'online' : s === 'degraded' ? 'degraded' : 'offline'; }
  private mapCh(s: string): ChStatus {
    if (s === 'ok') { return 'ok'; }
    if (s === 'offline' || s === 'stale') { return 'off'; }
    if (s === 'out_of_range') { return 'danger'; }
    return 'warn';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
