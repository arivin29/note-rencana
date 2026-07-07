import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProjectsService } from '@sdk/core/services/projects.service';
import { NodesService } from '@sdk/core/services/nodes.service';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { relTime } from '../../../shared/util';
import { RefreshBusService } from '../../../shared/refresh-bus.service';

interface Row { k: string; v: string; }
interface OfflineNode { id: string; code: string; lastSeen: string; location: string; }

@Component({
  selector: 'mobile-project-info',
  templateUrl: './project-info.component.html',
  standalone: false
})
export class MobileProjectInfoComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  pid = '';

  d = {
    name: '', area: '', status: '', statusKind: 'off' as 'ok' | 'warn' | 'off',
    owner: '', ownerIndustry: '', ownerPhone: '', ownerEmail: '',
    total: 0, online: 0, offline: 0, sensors: 0, locations: 0,
    healthPct: 0, lastSync: '', created: ''
  };
  offlineNodes: OfflineNode[] = [];
  info: Row[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private projectsSvc: ProjectsService,
    private nodesSvc: NodesService,
    private route: ActivatedRoute,
    private auto: AutoRefreshService,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    this.pid = this.route.parent?.snapshot.paramMap.get('id') || '';
    this.auto.everyDefault().pipe(takeUntil(this.destroy$)).subscribe(() => this.load(false));
    this.refreshBus.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
    this.load(true);
  }

  load(showLoading: boolean = true): void {
    if (!this.pid) { return; }
    if (showLoading) { this.loading = true; }
    this.error = '';
    this.projectsSvc.projectsControllerFindOneDetailed$Response({ id: this.pid })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
          const d = b?.data || b || {};
          const st = d.stats || {};
          const total = st.totalNodes ?? (d.nodes?.length ?? 0);
          const online = st.activeNodes ?? 0;
          const offline = Math.max(0, total - online);

          this.d = {
            name: d.name || 'Project',
            area: d.areaType || '-',
            status: this.statusLabel(d.status),
            statusKind: this.statusKind(d.status),
            owner: d.owner?.name || d.ownerName || d.idOwner || '-',
            ownerIndustry: d.owner?.industry || '',
            ownerPhone: d.owner?.phone || '',
            ownerEmail: d.owner?.email || '',
            total, online, offline,
            sensors: st.totalSensors ?? 0,
            locations: st.totalLocations ?? (d.locations?.length ?? 0),
            healthPct: total > 0 ? Math.round((online / total) * 100) : 0,
            lastSync: (d.lastSync || d.lastDataAt) ? relTime(d.lastSync || d.lastDataAt) : '-',
            created: d.createdAt ? relTime(d.createdAt) : '-'
          };

          this.info = [
            { k: 'Owner', v: this.d.owner },
            { k: 'Area', v: this.d.area },
            { k: 'Status', v: this.d.status },
            { k: 'Sensor', v: String(this.d.sensors) },
            { k: 'Lokasi', v: String(this.d.locations) },
            { k: 'Sinkron terakhir', v: this.d.lastSync },
            { k: 'Dibuat', v: this.d.created }
          ];

          this.loading = false;
          this.loadOfflineNodes();
        },
        error: (e) => { this.error = e?.message || 'Gagal memuat project'; this.loading = false; }
      });
  }

  /** Ambil daftar perangkat bermasalah (tidak online) untuk aksi cepat. */
  private loadOfflineNodes(): void {
    this.nodesSvc.nodesControllerFindAll$Response({ page: 1, limit: 100, idProject: this.pid })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
          const rows = (b?.data || []) as any[];
          this.offlineNodes = rows
            .filter((n) => (n.connectivityStatus || '').toLowerCase() !== 'online')
            .slice(0, 6)
            .map((n) => ({
              id: n.idNode || n.id,
              code: n.code || n.name || '(tanpa kode)',
              lastSeen: relTime(n.lastSeenAt),
              location: [n.city, n.province].filter(Boolean).join(', ') || n.address || ''
            }));
        },
        error: () => { /* opsional; abaikan */ }
      });
  }

  private statusKind(s: string): 'ok' | 'warn' | 'off' {
    const v = (s || '').toLowerCase();
    if (v === 'active' || v === 'aktif') { return 'ok'; }
    if (v === 'maintenance' || v === 'pending') { return 'warn'; }
    return 'off';
  }

  private statusLabel(s: string): string {
    const v = (s || '').toLowerCase();
    if (v === 'active' || v === 'aktif') { return 'Aktif'; }
    if (v === 'maintenance') { return 'Perawatan'; }
    if (v === 'pending') { return 'Menunggu'; }
    if (v === 'inactive' || v === 'nonaktif') { return 'Nonaktif'; }
    return s || '-';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
