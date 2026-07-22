import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AiAnalytics, AiNrwService } from '../../../../services/ai-nrw.service';

/**
 * Channel Analytics — chart gabungan (dok 08 §4): aktual + pita baseline + forecast
 * + penanda event + tekanan malam. Chart via ApexCharts (apx-chart).
 */
@Component({
  selector: 'ai-analytics',
  templateUrl: './ai-analytics.html',
  styleUrls: ['./ai-analytics.scss'],
  standalone: false,
})
export class AiAnalyticsPage implements OnInit {
  @Input() targetId: string | null = null;
  @Input() embedded = false;
  data: AiAnalytics | null = null;
  loading = true;
  error: string | null = null;

  resolution = 'hour';
  range = '7d';
  rangeOptions = [
    { key: '24h', label: '24 jam' },
    { key: '7d', label: '7 hari' },
    { key: '30d', label: '30 hari' },
  ];
  resolutionOptions = ['minute', 'hour', 'day'];

  // ApexCharts (typed loose untuk hindari friksi tipe)
  chartSeries: any[] = [];
  chart: any = {
    type: 'line',
    height: 400,
    foreColor: 'rgba(255,255,255,0.75)', // teks sumbu & legend putih (tema gelap)
    toolbar: { show: true },
    zoom: { enabled: true },
    animations: { enabled: false },
    background: 'transparent',
  };
  // urutan: Aktual · Normal(seharusnya) · Batas atas · Batas bawah · Forecast · Forecast atas · Forecast bawah
  colors = ['#00acac', '#8c8c8c', '#5a9d9d', '#5a9d9d', '#f59c1a', '#f7b955', '#f7b955'];
  stroke: any = { curve: 'smooth', width: [3, 2, 1, 1, 2, 1, 1], dashArray: [0, 4, 3, 3, 6, 4, 4] };
  grid: any = { borderColor: 'rgba(255,255,255,0.1)' };
  xaxis: any = {
    type: 'datetime',
    labels: { datetimeUTC: false, style: { colors: 'rgba(255,255,255,0.75)' } },
    axisBorder: { color: 'rgba(255,255,255,0.2)' },
    axisTicks: { color: 'rgba(255,255,255,0.2)' },
  };
  yaxis: any = {
    labels: {
      style: { colors: 'rgba(255,255,255,0.75)' },
      formatter: (v: number) => (v == null ? '' : v.toFixed(2)),
    },
  };
  legend: any = { position: 'top', labels: { colors: 'rgba(255,255,255,0.85)' } };
  tooltip: any = { x: { format: 'dd MMM HH:mm' }, theme: 'dark' };
  fill: any = { type: 'solid', opacity: [1, 0.9, 0, 0, 0.9] };
  dataLabels: any = { enabled: false };
  annotations: any = { xaxis: [] };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ai: AiNrwService,
  ) {}

  ngOnInit(): void {
    if (this.embedded && this.targetId) {
      this.load();
      return;
    }
    this.route.paramMap.subscribe((p) => {
      this.targetId = p.get('targetId');
      if (this.targetId) this.load();
    });
  }

  private computeFrom(): string {
    const now = Date.now();
    const ms = this.range === '24h' ? 864e5 : this.range === '30d' ? 30 * 864e5 : 7 * 864e5;
    return new Date(now - ms).toISOString();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    const params = { from: this.computeFrom(), to: new Date().toISOString(), resolution: this.resolution };
    this.ai.analytics(this.targetId!, params).subscribe({
      next: (d) => {
        this.data = d;
        this.buildChart(d);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Gagal memuat analitik';
        this.loading = false;
      },
    });
  }

  setRange(r: string): void {
    this.range = r;
    this.load();
  }
  setResolution(r: string): void {
    this.resolution = r;
    this.load();
  }

  back(): void {
    this.router.navigate(['/iot/ai/events']);
  }

  private ts(v: string): number {
    return new Date(v).getTime();
  }

  private buildChart(d: AiAnalytics): void {
    const actual = { name: 'Aktual', type: 'line', data: (d.series || []).map((p) => [this.ts(p.ts), p.value]) };
    const median = { name: 'Normal (seharusnya)', type: 'line', data: (d.baselineBand || []).map((b) => [this.ts(b.ts), b.median]) };
    const hi = { name: 'Batas atas normal', type: 'line', data: (d.baselineBand || []).map((b) => [this.ts(b.ts), b.hi]) };
    const lo = { name: 'Batas bawah normal', type: 'line', data: (d.baselineBand || []).map((b) => [this.ts(b.ts), b.lo]) };

    const series: any[] = [actual, median, hi, lo];

    // Forecast masa depan = 3 garis (prediksi + atas + bawah).
    // Titik worker kini ber-timestamp absolut (`ts`, epoch ms) beresolusi slot grid (10 mnt).
    // Baris ai_forecast lama tak punya `ts` — di situ jatuh balik ke offset 1 hari per titik.
    // Lantai band minimal 20% dari nilai harapan (±10%) — cocokkan worker seasonal.py.
    // Idempoten: bila band tersimpan sudah ≥20%, floor ini tak mengubah apa pun.
    if (d.forecast && Array.isArray(d.forecast.daily) && d.forecast.daily.length) {
      const gen = this.ts(d.forecast.generatedAt);
      const pick = (o: any, ...k: string[]) => k.map((x) => o[x]).find((v) => v != null) ?? null;
      const MIN_BAND_FRAC = 0.2;
      const at = (o: any, i: number) => {
        const t = pick(o, 'ts', 't');
        return t != null ? Number(t) : gen + (i + 1) * 864e5; // fallback: forecast harian lama
      };
      const band = (o: any) => {
        const p50 = pick(o, 'p50', 'estAvg', 'value');
        let hi = pick(o, 'hi', 'bandHi');
        let lo = pick(o, 'lo', 'bandLo');
        if (p50 != null) {
          const minHalf = (MIN_BAND_FRAC / 2) * Math.abs(p50);
          if (hi == null || hi < p50 + minHalf) hi = p50 + minHalf;
          if (lo == null || lo > p50 - minHalf) lo = Math.max(p50 - minHalf, 0); // clamp_min=0
        }
        return { p50, hi, lo };
      };
      const pts = d.forecast.daily.map((o: any, i: number) => ({ at: at(o, i), ...band(o) }));
      const line = (name: string, key: 'p50' | 'hi' | 'lo') => ({
        name,
        type: 'line',
        data: pts.map((p: any) => [p.at, p[key]]),
      });
      series.push(line('Forecast', 'p50'), line('Forecast atas', 'hi'), line('Forecast bawah', 'lo'));
    }

    this.chartSeries = series;

    // garis horizontal = setting batas layanan (min/max) → user lihat batas tetapnya
    const yAnn: any[] = [];
    const thr = (y: number, text: string) => ({
      y,
      borderColor: '#dc3545',
      strokeDashArray: 6,
      label: { text, position: 'left', style: { fontSize: '10px', color: '#fff', background: '#dc3545' } },
    });
    if (d.maxThreshold != null) yAnn.push(thr(d.maxThreshold, 'Max layanan ' + d.maxThreshold));
    if (d.minThreshold != null) yAnn.push(thr(d.minThreshold, 'Min layanan ' + d.minThreshold));

    this.annotations = {
      yaxis: yAnn,
      xaxis: (d.events || []).map((e) => ({
        x: this.ts(e.startedAt),
        borderColor: e.severity === 'critical' ? '#dc3545' : e.severity === 'warning' ? '#f59c1a' : '#49b6d6',
        label: {
          text: e.analysisType,
          style: { fontSize: '9px', background: e.severity === 'critical' ? '#dc3545' : '#f59c1a', color: '#fff' },
        },
      })),
    };
  }

  get night() {
    return this.data?.night || null;
  }

  nightTrendBadge(trend: string | null): string {
    switch (trend) {
      case 'turun':
        return 'badge bg-danger-subtle text-danger';
      case 'naik':
        return 'badge bg-success-subtle text-success';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }
}
