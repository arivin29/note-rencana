import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AiAnalysisItem,
  AiAnalytics,
  AiConfigDetail,
  AiEventDetail,
  AiNrwService,
} from '../../../../services/ai-nrw.service';
import { detectorDoc, paramDoc } from '../channel-settings/ai-param-docs';

/**
 * Event Detail — dijelaskan untuk orang awam (dok 08 §2).
 * Tiga lapis: (1) penjelasan bahasa manusia apa/kenapa/aksi, (2) grafik pembacaan
 * di sekitar anomali dengan pita normal + ambang + area anomali diarsir, (3) aksi lifecycle.
 * Tabel konteks mentah dipindah ke "Detail teknis" (collapsible) untuk engineer.
 */
@Component({
  selector: 'ai-event-inbox-detail',
  templateUrl: './event-inbox-detail.html',
  styleUrls: ['./event-inbox-detail.scss'],
  standalone: false,
})
export class EventInboxDetailPage implements OnInit {
  id: string | null = null;
  event: AiEventDetail | null = null;
  loading = true;
  error: string | null = null;

  // form aksi
  verdict = 'benar';
  verdictOptions = [
    { value: 'benar', label: 'Benar (anomali nyata)' },
    { value: 'false_alarm', label: 'False alarm' },
    { value: 'abaikan', label: 'Abaikan' },
  ];
  verdictNote = '';
  assignedTo = '';
  assignNote = '';
  closeNote = '';
  submitting = false;
  actionMsg: string | null = null;
  actionErr: string | null = null;

  showTech = false; // buka tabel konteks mentah

  private readonly activeStatuses = ['baru', 'ditinjau', 'ditindak'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ai: AiNrwService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.id = p.get('id');
      if (this.id) this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.ai.getEvent(this.id!).subscribe({
      next: (e) => {
        this.event = e;
        this.rebuildDerived();
        this.loadChart();
        this.loadConfig();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Gagal memuat event';
        this.loading = false;
      },
    });
  }

  get isActive(): boolean {
    return !!this.event && this.activeStatuses.includes(this.event.status);
  }

  // Precompute (referensi stabil) — memanggil getter yg balikin array objek baru
  // tiap change-detection membuat *ngFor loop tak stabil → freeze. Hitung sekali saat data berubah.
  contextEntries: Array<{ k: string; v: any }> = [];
  typicalHourEntries: Array<{ h: string; n: number }> = [];

  private rebuildDerived(): void {
    const c = this.event?.context;
    // sembunyikan kunci internal lifecycle yang tak bermakna bagi user
    const hidden = new Set(['clear_streak', 'eps']);
    this.contextEntries = c
      ? Object.keys(c)
          .filter((k) => !hidden.has(k.toLowerCase()))
          .map((k) => ({ k: this.techLabel(k), v: c[k] }))
      : [];
    const th = this.event?.recurrence?.typicalHour as any;
    const hist = th?.histogram || th;
    this.typicalHourEntries =
      hist && typeof hist === 'object'
        ? Object.keys(hist)
            .map((h) => ({ h, n: Number(hist[h]) }))
            .sort((a, b) => b.n - a.n)
        : [];
  }

  // ======================================================================
  // Penjelasan bahasa manusia — apa / kenapa / aksi per jenis detektor
  // ======================================================================

  private get unit(): string {
    return this.event?.unit ? ` ${this.event.unit}` : '';
  }

  private fmt(v: any): string | null {
    if (v == null || isNaN(+v)) return null;
    const n = +v;
    return n.toFixed(Math.abs(n) < 10 ? 2 : 1);
  }

  /** Lama kejadian dalam bahasa manusia. */
  get durasi(): string {
    const e = this.event;
    if (!e) return '';
    const start = new Date(e.startedAt).getTime();
    const end = new Date((e as any).resolvedAt || e.lastSeenAt || Date.now()).getTime();
    let s = Math.max(0, (end - start) / 1000);
    if (s < 60) return `${Math.round(s)} detik`;
    if (s < 3600) return `${Math.round(s / 60)} menit`;
    if (s < 86400) {
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      return m ? `${h} jam ${m} menit` : `${h} jam`;
    }
    return `${Math.round(s / 86400)} hari`;
  }

  /** Kalimat "apa yang terjadi" — pakai angka dari konteks bila ada. */
  get apa(): string {
    const e = this.event;
    if (!e) return '';
    const c = e.context || {};
    const u = this.unit;
    const grp = (e.groupName || 'nilai').toLowerCase();
    const val = this.fmt(c['value']);
    const thr = this.fmt(c['threshold']);
    const d = this.durasi;

    switch (e.analysisType) {
      case 'A5_flatline':
        return `Pembacaan ${grp} di titik ini datar — nilainya tidak berubah sama sekali${
          val != null ? ` (mandek di ~${val}${u})` : ''
        } selama ${d}.`;
      case 'A2_low':
        return `Tekanan turun ke ${val ?? '?'}${u}, di bawah batas minimal layanan ${thr ?? '?'}${u}, dan bertahan rendah selama ${d}.`;
      case 'A3_high':
        return `Tekanan naik ke ${val ?? '?'}${u}, di atas batas aman ${thr ?? '?'}${u}, selama ${d}.`;
      case 'A1_invalid':
        return `Sensor mengirim nilai tidak wajar${val != null ? ` (${val}${u})` : ''} yang mustahil untuk ${grp} — datanya tak bisa dipercaya.`;
      case 'A6_noise':
        return `Pembacaan tiba-tiba jadi ${c['ratio'] ?? 'jauh lebih'}× lebih bergetar (naik-turun) dari biasanya, selama ${d}.`;
      case 'A7_nodata':
        return `Titik ini berhenti mengirim data sama sekali selama ${d} — perangkatnya tampak offline.`;
      case 'A9_deviation': {
        const exp = this.fmt(c['expected_median']);
        return `Nilai terbaca ${val ?? '?'}${u} menyimpang jauh dari kebiasaan jam segini${
          exp != null ? ` (biasanya sekitar ${exp}${u})` : ''
        }.`;
      }
      case 'A10_drift': {
        const arah = c['direction'] === 'down' ? 'turun' : c['direction'] === 'up' ? 'naik' : '';
        return `Nilai bergeser perlahan${arah ? ` ${arah}` : ''} dan menetap di level baru selama ${d} — bukan lonjakan mendadak, tapi tren yang terus berjalan.`;
      }
      case 'forecast_breach': {
        const pred = this.fmt(c['predicted']);
        const lead = c['lead_hours'];
        const at = c['cross_ts']
          ? new Date(+c['cross_ts']).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : null;
        return `Berdasarkan pola terakhir, nilai diprediksi menembus batas ${thr ?? '?'}${u}${
          at ? ` sekitar ${at}` : ''
        }${lead != null ? ` (±${lead} jam lagi)` : ''}${pred != null ? `, perkiraan mencapai ${pred}${u}` : ''}.`;
      }
      case 'night_pressure':
        return `Pola tekanan pada malam hari (saat pemakaian paling sedikit) menyimpang dari normal selama ${d}.`;
      case 'A4_spike':
        return `Terjadi lonjakan mendadak pada pembacaan${val != null ? ` hingga ${val}${u}` : ''}.`;
      default:
        return e.meaning || 'Terdeteksi pola yang tidak biasa pada channel ini.';
    }
  }

  /** Kenapa ini penting (dampak operasional). */
  get kenapa(): string {
    const t = this.event?.analysisType || '';
    return (
      {
        A5_flatline:
          'Nilai yang sama persis berulang biasanya berarti sensor macet/beku, kabel bermasalah, atau valve tertutup total. Selama datar, angka ini tidak bisa dipakai untuk mendeteksi kebocoran.',
        A2_low:
          'Tekanan di bawah batas layanan berarti pelanggan di ujung jaringan bisa kekurangan air. Bila turunnya tiba-tiba, ini sering jadi tanda kebocoran besar di hulu.',
        A3_high:
          'Tekanan berlebih mempercepat kerusakan pipa dan sambungan, dan justru memicu kebocoran baru.',
        A1_invalid:
          'Nilai negatif atau kosong berarti sensor/transmitter rusak — seluruh data dari titik ini tidak bisa dipercaya sampai diperbaiki.',
        A6_noise:
          'Pembacaan yang tiba-tiba banyak bergetar biasanya menandakan sensor mulai rusak, sambungan longgar, atau ada gangguan listrik.',
        A7_nodata:
          'Tidak ada data berarti node/sensor offline — bisa mati listrik, sinyal 4G hilang, atau perangkat rusak. Selama offline, titik ini tidak terpantau sama sekali.',
        A9_deviation:
          'Nilai yang jauh menyimpang dari kebiasaan jam segini menandakan ada yang berubah — bisa kebocoran, lonjakan pemakaian, atau gangguan sensor.',
        A10_drift:
          'Pergeseran perlahan yang menetap sering jadi tanda awal kebocoran merambat (slow leak) atau sensor yang mulai melenceng kalibrasinya.',
        forecast_breach:
          'Ini peringatan dini: masalahnya belum terjadi, tapi berdasarkan pola terakhir nilai sedang menuju melewati batas layanan. Masih ada waktu untuk mencegah.',
        night_pressure:
          'Tekanan malam yang tidak turun seperti biasa (padahal pemakaian minim) bisa menandakan kebocoran yang terus menyerap aliran.',
        A4_spike:
          'Lonjakan mendadak bisa berarti water hammer (palu air), operasi valve yang kasar, atau glitch sensor. Water hammer yang berulang merusak pipa.',
      }[t] || 'Sistem mendeteksi pola yang menyimpang dari perilaku normal channel ini.'
    );
  }

  /** Yang sebaiknya dilakukan operator. */
  get aksi(): string {
    const t = this.event?.analysisType || '';
    return (
      {
        A5_flatline:
          'Cek fisik sensor dan valve di titik ini. Coba ketuk/goyang sensor; bila pembacaan tetap datar, jadwalkan penggantian sensor.',
        A2_low:
          'Periksa apakah ada pipa pecah, pompa mati, atau valve yang setengah tertutup di jalur ini. Prioritaskan bila tekanan terus turun.',
        A3_high:
          'Cek pengatur tekanan (PRV) dan pastikan pompa tidak over-run. Turunkan tekanan sebelum memicu kebocoran baru.',
        A1_invalid:
          'Ganti atau kalibrasi sensor. Sampai diperbaiki, abaikan angka dari titik ini agar tidak menyesatkan.',
        A6_noise:
          'Cek sambungan kabel dan catu daya sensor. Amati beberapa jam — bila getaran menetap, jadwalkan pemeriksaan.',
        A7_nodata:
          'Cek daya dan sinyal perangkat di lapangan. Bila sering putus, pertimbangkan catu daya cadangan atau penguat sinyal.',
        A9_deviation:
          'Bandingkan dengan titik di sekitarnya dan cek apakah ada kejadian lapangan pada jam itu (perbaikan, pemadaman, lonjakan pakai).',
        A10_drift:
          'Pantau beberapa hari. Bila nilai terus bergerak ke arah yang sama, jadwalkan pemeriksaan lapangan atau kalibrasi ulang sensor.',
        forecast_breach:
          'Siapkan tindakan sebelum tembus: cek pompa/valve dan pertimbangkan mengatur ulang jadwal supply pada titik ini.',
        night_pressure:
          'Bandingkan dengan Minimum Night Flow dan telusuri DMA untuk mencari titik kebocoran.',
        A4_spike:
          'Cek operasi valve/pompa yang mungkin memicu hentakan. Bila diduga glitch sensor, amati apakah lonjakan berulang.',
      }[t] || 'Tinjau data pada grafik di bawah, lalu validasi apakah anomali ini benar terjadi di lapangan.'
    );
  }

  // ======================================================================
  // Grafik penjelas — pembacaan di sekitar anomali
  // ======================================================================
  chartReady = false;
  chartError = false;
  chartSeries: any[] = [];
  chart: any = {
    type: 'line',
    height: 340,
    foreColor: 'rgba(255,255,255,0.75)',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: false },
    background: 'transparent',
  };
  colors = ['#00acac', '#8c8c8c', '#5a9d9d', '#5a9d9d'];
  stroke: any = { curve: 'smooth', width: [3, 2, 1, 1], dashArray: [0, 5, 3, 3] };
  fill: any = { type: 'solid', opacity: [1, 0.7, 0, 0] };
  grid: any = { borderColor: 'rgba(255,255,255,0.1)' };
  xaxis: any = {
    type: 'datetime',
    labels: { datetimeUTC: false, style: { colors: 'rgba(255,255,255,0.6)' } },
    axisBorder: { color: 'rgba(255,255,255,0.2)' },
    axisTicks: { color: 'rgba(255,255,255,0.2)' },
  };
  yaxis: any = {
    labels: { style: { colors: 'rgba(255,255,255,0.6)' }, formatter: (v: number) => (v == null ? '' : v.toFixed(2)) },
  };
  legend: any = { position: 'top', horizontalAlign: 'left', labels: { colors: 'rgba(255,255,255,0.85)' } };
  tooltip: any = { x: { format: 'dd MMM HH:mm' }, theme: 'dark' };
  dataLabels: any = { enabled: false };
  annotations: any = { xaxis: [], yaxis: [] };

  private tsMs(v: string): number {
    return new Date(v).getTime();
  }

  /** Muat pembacaan pada jendela sekitar anomali (dengan bantalan sebelum/sesudah). */
  private loadChart(): void {
    const e = this.event;
    if (!e?.targetId) return;
    this.chartReady = false;
    this.chartError = false;

    const start = this.tsMs(e.startedAt);
    const end = Math.min(Date.now(), this.tsMs((e as any).resolvedAt || e.lastSeenAt || e.startedAt));
    const span = Math.max(end - start, 36e5); // minimal 1 jam
    const pad = Math.max(span * 0.4, 2 * 36e5); // bantalan ≥ 2 jam
    const from = new Date(start - pad).toISOString();
    const to = new Date(Math.min(Date.now(), end + pad)).toISOString();
    const windowH = (this.tsMs(to) - this.tsMs(from)) / 36e5;
    const resolution = windowH <= 12 ? 'minute' : windowH <= 24 * 4 ? 'hour' : 'day';

    this.ai.analytics(e.targetId, { from, to, resolution }).subscribe({
      next: (d) => {
        this.buildChart(d, start, end);
        this.chartReady = true;
      },
      error: () => {
        this.chartError = true;
      },
    });
  }

  private buildChart(d: AiAnalytics, evStart: number, evEnd: number): void {
    const actual = { name: 'Pembacaan aktual', type: 'line', data: (d.series || []).map((p) => [this.tsMs(p.ts), p.value]) };
    const median = { name: 'Normal (seharusnya)', type: 'line', data: (d.baselineBand || []).map((b) => [this.tsMs(b.ts), b.median]) };
    const hasBand = (d.baselineBand || []).some((b) => b.hi !== b.lo);
    const series: any[] = [actual, median];
    if (hasBand) {
      series.push(
        { name: 'Batas atas normal', type: 'line', data: (d.baselineBand || []).map((b) => [this.tsMs(b.ts), b.hi]) },
        { name: 'Batas bawah normal', type: 'line', data: (d.baselineBand || []).map((b) => [this.tsMs(b.ts), b.lo]) },
      );
    }
    this.chartSeries = series;

    // ambang layanan tetap (garis merah horizontal)
    const yAnn: any[] = [];
    const thr = (y: number, text: string) => ({
      y,
      borderColor: '#dc3545',
      strokeDashArray: 5,
      label: { text, position: 'left', style: { fontSize: '10px', color: '#fff', background: '#dc3545' } },
    });
    if (d.maxThreshold != null) yAnn.push(thr(d.maxThreshold, `Batas atas ${d.maxThreshold}`));
    if (d.minThreshold != null) yAnn.push(thr(d.minThreshold, `Batas bawah ${d.minThreshold}`));

    // area anomali diarsir (dari mulai s/d selesai/sekarang)
    const xAnn: any[] = [
      {
        x: evStart,
        x2: evEnd > evStart ? evEnd : undefined,
        fillColor: this.event?.severity === 'critical' ? '#dc3545' : '#f59c1a',
        opacity: 0.12,
        borderColor: this.event?.severity === 'critical' ? '#dc3545' : '#f59c1a',
        label: {
          text: 'anomali',
          position: 'top',
          orientation: 'horizontal',
          style: { fontSize: '10px', color: '#fff', background: this.event?.severity === 'critical' ? '#dc3545' : '#f59c1a' },
        },
      },
    ];

    this.annotations = { yaxis: yAnn, xaxis: xAnn };
  }

  // ======================================================================
  // aksi lifecycle
  // ======================================================================
  private run(obs: any, okMsg: string): void {
    this.submitting = true;
    this.actionMsg = null;
    this.actionErr = null;
    obs.subscribe({
      next: (e: AiEventDetail) => {
        this.event = e;
        this.rebuildDerived();
        this.submitting = false;
        this.actionMsg = okMsg;
        this.verdictNote = this.assignNote = this.closeNote = '';
      },
      error: (err: any) => {
        this.submitting = false;
        this.actionErr = err?.error?.message || err?.message || 'Aksi gagal';
      },
    });
  }

  doValidate(): void {
    if (!this.id) return;
    this.run(
      this.ai.validateEvent(this.id, { verdict: this.verdict, note: this.verdictNote || undefined }),
      'Verdikt tersimpan.',
    );
  }

  doAssign(): void {
    if (!this.id || !this.assignedTo.trim()) {
      this.actionErr = 'Isi penerima tugas (user id).';
      return;
    }
    this.run(
      this.ai.assignEvent(this.id, { assignedTo: this.assignedTo.trim(), note: this.assignNote || undefined }),
      'Event ditugaskan.',
    );
  }

  doClose(): void {
    if (!this.id) return;
    this.run(this.ai.closeEvent(this.id, { note: this.closeNote || undefined }), 'Event ditutup.');
  }

  doReopen(): void {
    if (!this.id) return;
    this.run(this.ai.reopenEvent(this.id), 'Event dibuka kembali.');
  }

  back(): void {
    this.router.navigate(['/iot/ai/events']);
  }

  openAnalytics(): void {
    // buka Channel Hub langsung di tab Chart (analitik lengkap), bukan halaman chart terpisah
    if (this.event) this.router.navigate(['/iot/ai/channel', this.event.targetId], { queryParams: { tab: 'chart' } });
  }

  openSettings(): void {
    // buka editor detektor lengkap (semua A1–A10) di hub
    if (this.event) this.router.navigate(['/iot/ai/channel', this.event.targetId], { queryParams: { tab: 'settings' } });
  }

  // ======================================================================
  // Editor konfigurasi inline — atur/longgarkan detektor yang memicu event ini
  // ======================================================================
  cfg: AiConfigDetail | null = null;
  cfgAnalysis: AiAnalysisItem | null = null; // detektor pemicu (referensi ke cfg.analyses[i])
  cfgLoading = false;
  cfgSaving = false;
  cfgMsg: string | null = null;
  cfgErr: string | null = null;

  /** event.analysisType → key config (kebanyakan identik; forecast_breach dari analisis 'forecast'). */
  private configTypeFor(t: string): string {
    return { forecast_breach: 'forecast', night_pressure: 'night_pressure' }[t] || t;
  }

  /** Param sensitivitas utama tiap detektor untuk tombol "Longgarkan". */
  private readonly loosenParam: Record<string, string> = {
    A10_drift: 'delta',
    A5_flatline: 'n',
    A2_low: 'sustain_T',
    A3_high: 'sustain_T',
    A9_deviation: 'k',
    A7_nodata: 'no_data_timeout',
    A8_persistent: 'persist_window',
    A6_noise: 'factor',
    A4_spike: 'k',
    night_pressure: 'drop_frac',
  };

  private loadConfig(): void {
    const e = this.event;
    if (!e?.targetId) return;
    this.cfgLoading = true;
    this.cfg = this.cfgAnalysis = null;
    this.cfgMsg = this.cfgErr = null;
    this.ai.getConfig(e.targetId).subscribe({
      next: (d) => {
        this.cfg = d;
        const key = this.configTypeFor(e.analysisType);
        const a = (d.analyses || []).find((x) => x.analysisType === key) || null;
        if (a) this.cfgAnalysis = this.decorateAnalysis(a);
        this.cfgLoading = false;
      },
      error: () => {
        this.cfgLoading = false; // channel belum punya config → panel tak tampil
      },
    });
  }

  /** Lengkapi satu analisis dengan label ramah + hint (pakai kamus ai-param-docs). */
  private decorateAnalysis(a: AiAnalysisItem): AiAnalysisItem {
    const doc = detectorDoc(a.analysisType);
    a.title = doc.title;
    a.what = doc.what;
    a.paramFields = a.params
      ? Object.keys(a.params).map((key) => {
          const v = a.params[key];
          const type = typeof v === 'boolean' ? 'boolean' : typeof v === 'number' ? 'number' : 'text';
          const pd = paramDoc(a.analysisType, key);
          return { key, type, label: pd?.label, help: pd?.help, recommended: pd?.recommended, unit: pd?.unit, min: pd?.min, max: pd?.max, step: pd?.step };
        })
      : [];
    return a;
  }

  trackByParamKey = (_: number, p: { key: string }): string => p.key;

  setCfgParam(key: string, value: any, type: string): void {
    const a = this.cfgAnalysis;
    if (!a) return;
    if (!a.params) a.params = {};
    if (type === 'number') {
      const n = Number(value);
      a.params[key] = value === '' || isNaN(n) ? value : n;
    } else if (type === 'boolean') {
      a.params[key] = !!value;
    } else {
      a.params[key] = value;
    }
    this.cfgMsg = null;
  }

  /** Ada param sensitivitas yang bisa dilonggarkan untuk detektor ini? */
  get canLoosen(): boolean {
    const a = this.cfgAnalysis;
    const k = a && this.loosenParam[a.analysisType];
    return !!(a?.enabled && k && a.params && a.params[k] != null);
  }

  /** Naikkan ambang param kunci ~1.5× → detektor jadi kurang sensitif (alarm lebih sedikit). */
  loosen(): void {
    const a = this.cfgAnalysis;
    if (!a) return;
    const key = this.loosenParam[a.analysisType];
    if (!key || a.params?.[key] == null) return;
    const old = a.params[key];
    const next = this.scaleLooser(old);
    if (next == null || String(next) === String(old)) {
      this.cfgMsg = 'Sudah pada nilai paling longgar yang wajar.';
      return;
    }
    a.params[key] = next;
    const label = paramDoc(a.analysisType, key)?.label || key;
    this.cfgMsg = `Dilonggarkan — ${label}: ${old} → ${next}. Klik "Simpan" untuk menerapkan.`;
  }

  /** Skala nilai jadi lebih longgar: angka ×1.5, durasi "15m"/"4h" ×1.5. */
  private scaleLooser(v: any): any {
    if (typeof v === 'number') {
      const n = v * 1.5;
      return Number.isInteger(v) ? Math.max(v + 1, Math.round(n)) : Math.round(n * 100) / 100;
    }
    const m = String(v).trim().match(/^(\d+(?:\.\d+)?)\s*([smhd])$/i);
    if (m) {
      const scaled = Math.max(Number(m[1]) + 1, Math.round(Number(m[1]) * 1.5));
      return `${scaled}${m[2].toLowerCase()}`;
    }
    return null;
  }

  toggleCfgEnabled(): void {
    if (this.cfgAnalysis) {
      this.cfgAnalysis.enabled = !this.cfgAnalysis.enabled;
      this.cfgMsg = null;
    }
  }

  /** Matikan detektor ini & simpan langsung (jalur cepat untuk alarm yang dianggap noise). */
  disableDetector(): void {
    if (!this.cfgAnalysis) return;
    this.cfgAnalysis.enabled = false;
    this.saveConfig('Deteksi ini dimatikan.');
  }

  saveConfig(okMsg = 'Konfigurasi tersimpan.'): void {
    if (!this.cfg || !this.cfgAnalysis) return;
    this.cfgSaving = true;
    this.cfgMsg = this.cfgErr = null;
    this.ai.updateConfig(this.cfg.targetId, { analyses: this.cfg.analyses }).subscribe({
      next: (d) => {
        this.cfg = d;
        const key = this.configTypeFor(this.event!.analysisType);
        const a = (d.analyses || []).find((x) => x.analysisType === key) || null;
        this.cfgAnalysis = a ? this.decorateAnalysis(a) : null;
        this.cfgSaving = false;
        this.cfgMsg = okMsg + ' Berlaku pada siklus deteksi berikutnya (±5 menit).';
      },
      error: (err) => {
        this.cfgSaving = false;
        this.cfgErr = err?.error?.message || err?.message || 'Gagal menyimpan konfigurasi';
      },
    });
  }

  // ======================================================================
  // tampilan
  // ======================================================================
  /** Kode pendek untuk chip (A5_flatline → A5; forecast_breach → Prediksi). */
  codeChip(analysisType: string): string {
    const m = (analysisType || '').match(/^A(\d+)_/);
    if (m) return 'A' + m[1];
    return { forecast_breach: 'Prediksi', night_pressure: 'Malam' }[analysisType] || analysisType;
  }

  /** Status internal → bahasa operator. */
  statusHuman(status: string): string {
    return (
      {
        baru: 'Perlu ditinjau',
        ditinjau: 'Sedang ditinjau',
        ditindak: 'Sedang ditangani',
        selesai: 'Selesai',
        auto_closed: 'Pulih sendiri',
        superseded: 'Digantikan',
      }[status] || status
    );
  }

  /** Kunci konteks mentah → label ramah (untuk tabel Detail teknis). */
  private techLabel(k: string): string {
    return (
      {
        n: 'Jumlah pembacaan diperiksa',
        span: 'Rentang nilai (maks − min)',
        value: 'Nilai pemicu',
        threshold: 'Ambang',
        ratio: 'Rasio getaran vs normal',
        z: 'Skor simpangan (z)',
        expected_median: 'Nilai normal jam segini',
        gap_sec: 'Lama tanpa data (detik)',
        direction: 'Arah pergeseran',
        predicted: 'Nilai prediksi',
        cross_ts: 'Perkiraan waktu tembus',
        lead_hours: 'Waktu tenggang (jam)',
        basis: 'Dasar perhitungan',
      }[k.toLowerCase()] || k
    );
  }

  severityBadge(sev: string): string {
    switch (sev) {
      case 'critical':
        return 'badge bg-danger-subtle text-danger';
      case 'warning':
        return 'badge bg-warning-subtle text-warning';
      case 'info':
        return 'badge bg-info-subtle text-info';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'baru':
        return 'badge bg-danger-subtle text-danger';
      case 'ditinjau':
        return 'badge bg-warning-subtle text-warning';
      case 'ditindak':
        return 'badge bg-info-subtle text-info';
      case 'selesai':
      case 'auto_closed':
        return 'badge bg-success-subtle text-success';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  timelineIcon(kind: string): string {
    return kind === 'user' ? 'fa-user' : 'fa-robot';
  }
}
