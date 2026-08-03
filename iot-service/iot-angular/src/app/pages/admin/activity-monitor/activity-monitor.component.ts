import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ActivityService,
  ActivityStats,
  ActivityOwnerStat,
  ActivityDailyStat,
  ActivityUserStat,
  ActivityPageStat,
} from '../../../services/activity.service';

interface DailyBar {
  day: string;
  label: string;
  sessions: number;
  users: number;
  heightPct: number;
}

@Component({
  selector: 'activity-monitor',
  templateUrl: './activity-monitor.component.html',
  styleUrls: ['./activity-monitor.component.css'],
  standalone: false,
})
export class ActivityMonitorComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;

  days = 30;
  dayOptions = [7, 30, 90];

  stats: ActivityStats | null = null;
  owners: ActivityOwnerStat[] = [];
  users: ActivityUserStat[] = [];
  pages: ActivityPageStat[] = [];
  bars: DailyBar[] = [];

  selectedOwner: ActivityOwnerStat | null = null;

  // KPI
  kpiOwnerCount = 0;
  kpiActiveToday = 0;
  kpiIdleOwners = 0;
  kpiSessions7d = 0;

  private destroy$ = new Subject<void>();

  constructor(private activityService: ActivityService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.activityService
      .getStats(this.days)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          this.owners = stats.owners || [];
          this.users = (stats.users || []).filter((u) => u.role !== 'admin');
          this.pages = stats.pages || [];
          this.computeKpis();
          this.buildBars();
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Gagal memuat statistik aktivitas';
          this.loading = false;
        },
      });
  }

  setDays(d: number): void {
    if (this.days === d) return;
    this.days = d;
    this.load();
  }

  selectOwner(o: ActivityOwnerStat): void {
    this.selectedOwner = this.selectedOwner?.ownerId === o.ownerId ? null : o;
    this.buildBars();
  }

  clearOwner(): void {
    this.selectedOwner = null;
    this.buildBars();
  }

  get filteredUsers(): ActivityUserStat[] {
    if (!this.selectedOwner) return this.users;
    return this.users.filter((u) => u.ownerCode === this.selectedOwner!.ownerCode);
  }

  // Status pemakaian per PDAM berdasarkan kapan terakhir buka
  ownerStatus(o: ActivityOwnerStat): 'aktif' | 'jarang' | 'pasif' {
    const ageMs = Date.now() - this.parseTs(o.lastActive).getTime();
    if (ageMs < 24 * 3600_000) return 'aktif';
    if (ageMs < 7 * 24 * 3600_000) return 'jarang';
    return 'pasif';
  }

  statusBadgeClass(o: ActivityOwnerStat): string {
    switch (this.ownerStatus(o)) {
      case 'aktif':
        return 'bg-success bg-opacity-20 text-success';
      case 'jarang':
        return 'bg-warning bg-opacity-20 text-warning';
      default:
        return 'bg-danger bg-opacity-20 text-danger';
    }
  }

  statusText(o: ActivityOwnerStat): string {
    switch (this.ownerStatus(o)) {
      case 'aktif':
        return 'Aktif';
      case 'jarang':
        return 'Jarang';
      default:
        return 'Pasif';
    }
  }

  relativeTime(ts: string): string {
    if (!ts) return '-';
    const ms = Date.now() - this.parseTs(ts).getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'baru saja';
    if (min < 60) return `${min} mnt lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const d = Math.floor(hr / 24);
    return `${d} hari lalu`;
  }

  private parseTs(ts: string): Date {
    // Backend mengirim "YYYY-MM-DD HH:mm:ss" (waktu server WIB)
    return new Date((ts || '').replace(' ', 'T'));
  }

  private computeKpis(): void {
    this.kpiOwnerCount = this.owners.length;
    this.kpiActiveToday = this.owners.filter((o) => this.ownerStatus(o) === 'aktif').length;
    this.kpiIdleOwners = this.owners.filter((o) => this.ownerStatus(o) === 'pasif').length;
    this.kpiSessions7d = this.owners.reduce((sum, o) => sum + (o.sessions7d || 0), 0);
  }

  private buildBars(): void {
    const daily: ActivityDailyStat[] = this.stats?.daily || [];
    const rows = this.selectedOwner
      ? daily.filter((d) => d.ownerCode === this.selectedOwner!.ownerCode)
      : daily;

    // agregasi per hari (lintas PDAM saat tidak ada filter)
    const byDay = new Map<string, { sessions: number; users: number }>();
    for (const r of rows) {
      const day = (r.day || '').substring(0, 10);
      const cur = byDay.get(day) || { sessions: 0, users: 0 };
      cur.sessions += r.sessions || 0;
      cur.users += r.users || 0;
      byDay.set(day, cur);
    }

    // deret tanggal lengkap agar hari kosong tetap tampil
    const out: DailyBar[] = [];
    const today = new Date();
    for (let i = this.days - 1; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      const key = dt.toISOString().substring(0, 10);
      const v = byDay.get(key) || { sessions: 0, users: 0 };
      out.push({
        day: key,
        label: `${dt.getDate()}/${dt.getMonth() + 1}`,
        sessions: v.sessions,
        users: v.users,
        heightPct: 0,
      });
    }
    const max = Math.max(1, ...out.map((b) => b.sessions));
    for (const b of out) b.heightPct = Math.round((b.sessions / max) * 100);
    this.bars = out;
  }
}
