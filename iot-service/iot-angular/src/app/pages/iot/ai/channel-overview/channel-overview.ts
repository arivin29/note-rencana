import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AiConfigDetail,
  AiEventListItem,
  AiForecast,
  AiNrwService,
} from '../../../../services/ai-nrw.service';

interface BoardRow {
  analysisType: string;
  enabled: boolean;
  paramsSummary: string;
  meaning: string;
  firing: boolean;
  severity: string | null;
  lastEvent: AiEventListItem | null;
  confidence: number | null;
}

/** Makna operasional generik per detektor (fallback bila event tak punya meaning). */
const MEANINGS: Record<string, string> = {
  A1_invalid: 'Nilai negatif/kosong — sensor/transmitter rusak.',
  A2_low: 'Rendah berkelanjutan — suplai kurang / kebocoran hulu / pompa mati.',
  A3_high: 'Tinggi berkelanjutan — pompa berlebih / valve tertutup.',
  A5_flatline: 'Nilai datar — sensor macet/beku.',
  A7_nodata: 'Tak mengirim data — node/sensor offline.',
  A8_persistent: 'Di luar batas menetap (persisten) — eskalasi.',
  A9_deviation: 'Menyimpang dari pola biasanya untuk jam ini.',
  A10_drift: 'Turun/naik perlahan menetap — indikasi kebocoran merambat (slow leak).',
  night_pressure: 'Tekanan malam turun — indikasi kebocoran (air lolos tanpa pemakaian).',
};

const ACTIVE = ['baru', 'ditinjau', 'ditindak'];

/**
 * Ringkasan channel (tab default Channel Hub): papan status A1–A10 + forecast.
 * Menggabungkan config (on/off + param) + event (kondisi kini + terakhir) + forecast.
 */
@Component({
  selector: 'ai-channel-overview',
  templateUrl: './channel-overview.html',
  styleUrls: ['./channel-overview.scss'],
  standalone: false,
})
export class ChannelOverviewComponent implements OnInit, OnDestroy {
  @Input() targetId!: string;

  loading = true;
  error: string | null = null;
  configured = true;

  // hitung-ulang on-demand (job manual)
  jobRunning = false;
  jobMsg: string | null = null;
  private pollTimer?: ReturnType<typeof setInterval>;

  config: AiConfigDetail | null = null;
  rows: BoardRow[] = [];
  forecast: AiForecast | null = null;
  forecastEnabled = false;
  forecastDays: Array<{ label: string; p50: number | null; lo: number | null; hi: number | null }> = [];

  constructor(private ai: AiNrwService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    clearInterval(this.pollTimer);
  }

  runRecompute(): void {
    this.runJob('recompute', 'Menghitung ulang baseline + forecast…');
  }
  runAnomaly(): void {
    this.runJob('anomaly', 'Menjalankan analisa anomali (as-of data terbaru)…');
  }

  private runJob(kind: string, msg: string): void {
    if (!this.targetId || this.jobRunning) return;
    this.jobRunning = true;
    this.jobMsg = msg;
    this.ai.enqueueJob(this.targetId, kind).subscribe({
      next: (job) => this.pollJob(job.id),
      error: (err) => {
        this.jobRunning = false;
        this.jobMsg = err?.error?.message || 'Gagal mengantre job';
      },
    });
  }

  private pollJob(id: string): void {
    let tries = 0;
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      tries++;
      this.ai.listJobs(this.targetId).subscribe({
        next: (jobs) => {
          const j = (jobs || []).find((x) => x.id === id);
          if (j && (j.status === 'done' || j.status === 'error')) {
            clearInterval(this.pollTimer);
            this.jobRunning = false;
            if (j.status === 'done') {
              this.jobMsg = 'Selesai — memperbarui data…';
              this.load();
            } else {
              this.jobMsg = 'Gagal: ' + (j.error || 'error');
            }
          } else if (tries > 40) {
            clearInterval(this.pollTimer);
            this.jobRunning = false;
            this.jobMsg = 'Masih diproses di latar belakang — muat ulang beberapa saat lagi.';
          }
        },
        error: () => {},
      });
    }, 3000);
  }

  load(): void {
    if (!this.targetId) return;
    this.loading = true;
    this.error = null;
    forkJoin({
      config: this.ai.getConfig(this.targetId).pipe(catchError(() => of(null))),
      events: this.ai
        .listEvents({ targetId: this.targetId, status: 'baru,ditinjau,ditindak,selesai,auto_closed,superseded', limit: 200 })
        .pipe(catchError(() => of({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } }))),
      forecast: this.ai.forecast(this.targetId).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ config, events, forecast }) => {
        this.config = config;
        this.forecast = forecast;
        this.configured = !!(config && config.analyses && config.analyses.length);
        this.forecastDays = (forecast?.daily || []).map((d: any, i: number) => ({
          label: `H+${(d.d ?? i) + 1}`,
          p50: d.p50 ?? d.estAvg ?? d.value ?? null,
          lo: d.lo ?? d.bandLo ?? null,
          hi: d.hi ?? d.bandHi ?? null,
        }));
        this.buildBoard(config, events?.data || []);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Gagal memuat ringkasan';
        this.loading = false;
      },
    });
  }

  private buildBoard(config: AiConfigDetail | null, events: AiEventListItem[]): void {
    // event terbaru per analysisType (events sudah urut lastSeenAt desc dari server)
    const latest: Record<string, AiEventListItem> = {};
    for (const e of events) {
      if (!latest[e.analysisType]) latest[e.analysisType] = e;
    }

    const analyses = (config?.analyses || []).filter((a) => a.analysisType !== 'forecast');
    this.forecastEnabled = !!(config?.analyses || []).find((a) => a.analysisType === 'forecast')?.enabled;

    this.rows = analyses.map((a) => {
      const ev = latest[a.analysisType] || null;
      const firing = !!ev && ACTIVE.includes(ev.status);
      return {
        analysisType: a.analysisType,
        enabled: a.enabled,
        paramsSummary: this.paramsText(a.params),
        meaning: ev?.meaning || MEANINGS[a.analysisType] || '—',
        firing,
        severity: ev ? ev.severity : null,
        lastEvent: ev,
        confidence: ev?.confidence ?? null,
      };
    });
  }

  private paramsText(params: Record<string, any>): string {
    if (!params || !Object.keys(params).length) return '—';
    return Object.keys(params)
      .map((k) => `${k}=${params[k]}`)
      .join(' · ');
  }

  // --- ringkasan angka ---
  get firingCount(): number {
    return this.rows.filter((r) => r.firing).length;
  }
  get enabledCount(): number {
    return this.rows.filter((r) => r.enabled).length;
  }

  conditionBadge(r: BoardRow): string {
    if (!r.enabled) return 'badge bg-secondary-subtle text-secondary';
    if (!r.firing) return 'badge bg-success-subtle text-success';
    return r.severity === 'critical'
      ? 'badge bg-danger-subtle text-danger'
      : r.severity === 'warning'
        ? 'badge bg-warning-subtle text-warning'
        : 'badge bg-info-subtle text-info';
  }

  conditionText(r: BoardRow): string {
    if (!r.enabled) return 'nonaktif';
    if (!r.firing) return 'normal';
    return `NYALA (${r.severity})`;
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'baru':
      case 'ditinjau':
      case 'ditindak':
        return 'text-danger';
      case 'selesai':
      case 'auto_closed':
        return 'text-success';
      default:
        return 'text-muted';
    }
  }
}
