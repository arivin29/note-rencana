import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SensorChannelsService } from '@sdk/core/services/sensor-channels.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { relTime } from '../../../shared/util';
import { ChannelItem, ChStatus } from '../../../shared/channel-list/mobile-channel-list.component';
import { RefreshBusService } from '../../../shared/refresh-bus.service';

interface Opt { id: string; label: string; }

@Component({
  selector: 'mobile-project-channels',
  templateUrl: './project-channels.component.html',
  standalone: false
})
export class MobileProjectChannelsComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';

  // filters (client-side, mirrors desktop /iot/telemetry-channels)
  statusOptions = ['all', 'ok', 'out_of_range', 'stale', 'offline'];
  filters = { nodeModelId: '', sensorTypeId: '', status: 'all' };
  search = '';

  raw: any[] = [];
  nodeTypes: Opt[] = [];
  channelTypes: Opt[] = [];
  counts: Record<string, number> = { all: 0 };
  viewChannels: ChannelItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(private chSvc: SensorChannelsService, private route: ActivatedRoute, private refreshBus: RefreshBusService, private auto: AutoRefreshService) {}

  ngOnInit(): void {
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
  }

  load(showLoading: boolean = true): void {
    const id = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (showLoading) { this.loading = true; }
    this.error = '';
    this.chSvc.sensorChannelsControllerOverview$Response({ idProject: id, limit: '500' })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
          this.raw = (b?.data || []) as any[];
          this.buildOptions();
          this.apply();
          this.loading = false;
        },
        error: (e) => { this.error = e?.message || 'Gagal memuat channel'; this.loading = false; }
      });
  }

  // ---------- filter options ----------
  private buildOptions(): void {
    const nm = new Map<string, string>();
    const st = new Map<string, string>();
    for (const c of this.raw) {
      if (c.node?.idNodeModel) {
        const label = `${c.node.modelVendor || ''} ${c.node.modelName || ''}`.trim() || c.node.idNodeModel;
        nm.set(c.node.idNodeModel, label);
      }
      if (c.sensorType?.idSensorType) {
        st.set(c.sensorType.idSensorType, c.sensorType.category || c.sensorType.idSensorType);
      }
    }
    const sort = (m: Map<string, string>): Opt[] =>
      [...m.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
    this.nodeTypes = sort(nm);
    this.channelTypes = sort(st);
  }

  // ---------- apply filters (precomputed, no heavy getters) ----------
  private base(): any[] {
    const term = this.search.trim().toLowerCase();
    return this.raw.filter((c) => {
      if (this.filters.nodeModelId && c.node?.idNodeModel !== this.filters.nodeModelId) { return false; }
      if (this.filters.sensorTypeId && c.sensorType?.idSensorType !== this.filters.sensorTypeId) { return false; }
      if (term) {
        const hay = `${c.metricCode || ''} ${c.sensor?.label || ''} ${c.node?.code || ''} ${c.node?.name || ''}`.toLowerCase();
        if (!hay.includes(term)) { return false; }
      }
      return true;
    });
  }

  apply(): void {
    const base = this.base();
    this.counts = { all: base.length, ok: 0, out_of_range: 0, stale: 0, offline: 0 };
    for (const c of base) { if (this.counts[c.status] != null) { this.counts[c.status]++; } }
    const list = this.filters.status === 'all' ? base : base.filter((c) => c.status === this.filters.status);
    this.viewChannels = list.map((c) => this.toItem(c));
  }

  private toItem(c: any): ChannelItem {
    const node = c.node?.code || c.node?.name || '-';
    const sensor = c.sensor?.label || c.sensorType?.category || '';
    return {
      id: c.idSensorChannel,
      nodeId: c.node?.idNode || '',
      metric: c.metricCode || '',
      subtitle: [node, sensor].filter(Boolean).join(' · '),
      unit: c.unit || '',
      value: c.latest?.value != null ? String(Math.round(Number(c.latest.value) * 100) / 100) : '—',
      status: this.mapCh(c.status),
      updated: relTime(c.latest?.ts),
      range: (c.minThreshold != null && c.maxThreshold != null) ? `batas ${c.minThreshold}–${c.maxThreshold}` : ''
    };
  }

  // ---------- handlers ----------
  setStatus(s: string): void { this.filters.status = s; this.apply(); }
  onFilter(): void { this.apply(); }
  onSearch(v: string): void { this.search = v; this.apply(); }
  resetFilters(): void { this.filters = { nodeModelId: '', sensorTypeId: '', status: 'all' }; this.search = ''; this.apply(); }

  get hasActiveFilter(): boolean {
    return !!(this.filters.nodeModelId || this.filters.sensorTypeId || this.search || this.filters.status !== 'all');
  }

  statusLabel(s: string): string {
    return ({ all: 'Semua', ok: 'Normal', out_of_range: 'Luar batas', stale: 'Basi', offline: 'Offline' } as Record<string, string>)[s] || s;
  }

  private mapCh(s: string): ChStatus {
    if (s === 'ok') { return 'ok'; }
    if (s === 'offline' || s === 'stale') { return 'off'; }
    if (s === 'out_of_range') { return 'danger'; }
    return 'warn';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
