import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges, ViewChild, NgZone, Inject, LOCALE_ID } from '@angular/core';
import { formatNumber } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ChartComponent } from 'ng-apexcharts';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { takeUntil } from 'rxjs/operators';
import { AddChannelFormValue } from '../node-detail-add-channel-drawer/node-detail-add-channel-drawer.component';
import { SensorChannelsService } from '../../../../../../sdk/core/services/sensor-channels.service';
import { SensorsService } from '../../../../../../sdk/core/services/sensors.service';
import {
    thresholdState,
    decimalsFromPrecision,
    excelNumFmt
} from '../../../../../shared/utils/threshold';
import {
    Freshness,
    getFreshness,
    FRESHNESS_BADGE,
    timeAgo
} from '../../../../../shared/utils/telemetry-freshness';

/**
 * Penanda satu bacaan terhadap ambang yang DIKONFIGURASI.
 * Sengaja bukan online/offline: itu istilah konektivitas perangkat, bukan nilai
 * terhadap ambang. Kalau ambang belum diisi, semua bacaan `normal` (tidak ditandai).
 */
type ReadingFlag = 'normal' | 'below_min' | 'above_max';

interface SensorReading {
    timestamp: Date;
    value: number | null;
    rawValue: number | null;
    unit: string;
    flag: ReadingFlag;
    note?: string;
}

/** Ringkasan periode — angkanya dari backend (`statistics`); waktunya dicari di klien. */
interface PeriodStats {
    min: number | null;
    max: number | null;
    avg: number | null;
    count: number;
    lastValue: number | null;
    /** Kapan nilai terendah/tertinggi terjadi — operator selalu menanyakan ini. */
    minAt: Date | null;
    maxAt: Date | null;
}

/** Satu jeda pengiriman data dalam periode. */
interface DataGap {
    from: Date;
    to: Date;
    minutes: number;
}

@Component({
    selector: 'app-sensor-chanel-detail',
    templateUrl: './sensor-chanel-detail.html',
    styleUrls: ['./sensor-chanel-detail.scss'],
    standalone: false
})
export class SensorChanelDetail implements OnInit, OnChanges, OnDestroy {
    Math = Math;

    @Input() inputChannelId: string = '';
    @Input() inputNodeId: string = '';
    /** Dipakai agar navigasi tetap di dalam workspace project, bukan lompat ke /iot/nodes. */
    @Input() inputProjectId: string = '';
    @Input() embedded: boolean = false;

    channelId: string = '';
    nodeId: string = '';
    projectId: string = '';
    /** Id sensor pemilik channel — dipakai untuk daftar channel & drawer ubah. */
    sensorId: string = '';

    /** Channel lain milik sensor yang sama (sensor multi-channel). */
    channelOptions: Array<{ id: string; label: string; unit: string }> = [];

    /** Instance grafik — dipakai untuk mengambil PNG saat ekspor Excel. */
    @ViewChild(ChartComponent) chartRef?: ChartComponent;

    /** Mencegah klik ekspor beruntun membangun beberapa workbook sekaligus. */
    exporting = false;

    // Identitas channel
    sensorName: string = 'Memuat…';
    /** Alamat node — label utama; kode node hanya pelengkap. */
    nodeAddress: string = '';
    sensorType: string = '';
    nodeCode: string = '';
    sensorUnit: string = '';
    decimals: number = 2;

    allReadings: SensorReading[] = [];
    filteredReadings: SensorReading[] = [];
    displayedReadings: SensorReading[] = [];

    stats: PeriodStats = { min: null, max: null, avg: null, count: 0, lastValue: null, minAt: null, maxAt: null };
    /** Waktu bacaan TERBARU dalam periode — dipakai untuk badge kesegaran. */
    lastReadingAt: Date | null = null;
    /**
     * Interval lapor node (detik), dari respons readings. Kesegaran dinilai
     * relatif terhadap ini — kalau diabaikan, node yang memang melapor tiap 30
     * menit tampil "offline" di sini padahal hijau di pohon aset dan tab Sensors,
     * di layar yang sama. Null = tidak diketahui, jatuh ke ambang tetap util.
     */
    telemetryIntervalSec: number | null = null;

    // Filter
    selectedPeriod: string = 'last7days';
    /** 'all' = semua bacaan; 'out' = hanya yang di luar ambang. */
    selectedFlagFilter: 'all' | 'out' = 'all';

    /** Pengurutan tabel. Default waktu menurun — bacaan terbaru di atas. */
    sortField: 'timestamp' | 'value' | 'flag' = 'timestamp';
    sortDirection: 'asc' | 'desc' = 'desc';
    dateFrom: string = '';
    dateTo: string = '';

    // Paginasi
    currentPage: number = 1;
    pageSize: number = 25;
    totalPages: number = 0;
    totalRecords: number = 0;
    pageSizeOptions: number[] = [25, 50, 100, 200];

    periodOptions = [
        { value: 'today', label: 'Hari ini' },
        { value: 'yesterday', label: 'Kemarin' },
        { value: 'last24h', label: '24 jam terakhir' },
        { value: 'last7days', label: '7 hari terakhir' },
        { value: 'last30days', label: '30 hari terakhir' },
        { value: 'thisMonth', label: 'Bulan ini' },
        { value: 'lastMonth', label: 'Bulan lalu' },
        { value: 'custom', label: 'Rentang khusus' }
    ];

    channelMeta: (AddChannelFormValue & { sensorTypeLabel: string }) = {
        sensorId: '',
        channelId: '',
        metricCode: '',
        unit: '',
        precision: 0.01,
        minThreshold: null,
        maxThreshold: null,
        sensorTypeId: '',
        sensorTypeLabel: ''
    };

    isChannelDrawerOpen = false;
    channelDrawerMode: 'add' | 'edit' = 'edit';
    loading = false;
    /** Diisi kalau data gagal dimuat. TIDAK PERNAH diganti data buatan. */
    loadError: string | null = null;

    /** Jeda pengiriman data pada periode terpilih. */
    gaps: DataGap[] = [];

    /** Titik grafik seri penuh — dipakai menghitung ulang sumbu saat zoom. */
    private chartPoints: Array<{ x: number; y: number | null }> = [];
    /** Ambang yang tidak muat di rentang sumbu saat ini — ditulis sebagai catatan. */
    hiddenThresholds: string[] = [];

    // Grafik tren
    chartSeries: any[] = [];
    chartOptions: any = {};
    chartReady = false;

    /** Nilai `?channel=` yang sedang aktif. */
    private channelParam = '';
    /** Penjaga agar satu kombinasi id tidak dimuat dua kali. */
    private lastLoadKey = '';
    /**
     * Nomor urut pemuatan. `takeUntil(destroy$)` hanya membatalkan saat komponen
     * dibuang, bukan antar-request — tanpa penjaga ini, permintaan 30 hari yang
     * lambat bisa mendarat SESUDAH permintaan "Hari ini" dan menimpa tabel serta
     * grafik, sementara dropdown periodenya menulis "Hari ini".
     */
    private loadSeq = 0;
    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private sensorChannelsService: SensorChannelsService,
        private sensorsService: SensorsService,
        private zone: NgZone,
        @Inject(LOCALE_ID) private locale: string
    ) { }

    ngOnChanges(changes: SimpleChanges) {
        if (!this.embedded) return;

        // projectId bisa tiba belakangan (dibaca dari route induk) — simpan tiap
        // kali berubah, jangan digantungkan pada perubahan channel/node.
        if (changes['inputProjectId']) {
            this.projectId = this.inputProjectId;
        }

        if (changes['inputChannelId'] || changes['inputNodeId']) {
            this.resolveAndLoad(this.inputChannelId, this.inputNodeId);
        }
    }

    ngOnInit() {
        // `?channel=` menentukan channel mana yang dibuka untuk sensor multi-channel.
        // Dibaca di kedua mode: komponen ini selalu berada di bawah route detail sensor.
        this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((q) => {
            this.channelParam = q.get('channel') || '';
            // Berlaku di KEDUA mode: berpindah channel hanya mengubah query param,
            // jadi `paramMap` tidak ikut memancar dan halaman tak akan memuat ulang
            // kalau penanganannya cuma di mode embedded. `lastLoadKey` menjaga agar
            // pancaran awal dari kedua langganan tidak memuat dua kali.
            if (this.embedded) {
                this.resolveAndLoad(this.inputChannelId, this.inputNodeId);
            } else {
                const p = this.route.snapshot.paramMap;
                this.resolveAndLoad(p.get('sensorId') || '', p.get('nodeId') || '');
            }
        });

        if (this.embedded) return;

        this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            this.resolveAndLoad(params.get('sensorId') || '', params.get('nodeId') || '');
        });
    }

    /**
     * Satu kontrak id, dua bentuk URL yang harus didukung:
     *   …/sensor/<idSensorChannel>                  → id di path adalah CHANNEL
     *   …/sensor/<idSensor>?channel=<idChannel>     → id di path adalah SENSOR
     * Tanpa `?channel=`, id dicoba sebagai channel dulu; kalau 404 baru
     * diperlakukan sebagai sensor (lihat loadSensorData).
     *
     * Penjaga `lastLoadKey` mencegah ngOnChanges dan langganan query param
     * memuat data dua kali untuk kombinasi yang sama.
     */
    private resolveAndLoad(pathIdInput: string, nodeIdInput: string) {
        // Snapshot route SELALU lebih segar daripada @Input. Router meng-advance
        // snapshot sebelum memancarkan params/queryParams, sedangkan @Input anak
        // baru diperbarui pada change detection berikutnya. Mengandalkan input
        // membuat pemuatan pertama memakai pasangan sensor/channel yang basi —
        // itu yang dulu memicu satu request 404 di tiap pembukaan, dan saat
        // berpindah sensor lewat pohon aset bisa mengambil daftar channel milik
        // sensor SEBELUMNYA. Input hanya dipakai kalau snapshot tak punya param.
        const snap = this.route.snapshot;
        const pathId = snap.paramMap.get('sensorId') || pathIdInput;
        const nodeId = snap.paramMap.get('nodeId') || nodeIdInput;
        this.channelParam = snap.queryParamMap.get('channel') || '';

        if (!pathId || !nodeId) return;

        const key = `${pathId}|${this.channelParam}`;
        if (key === this.lastLoadKey) return;
        this.lastLoadKey = key;

        this.nodeId = nodeId;

        if (this.channelParam) {
            this.sensorId = pathId;
            this.channelId = this.channelParam;
            this.channelMeta.sensorId = pathId;
            this.loadChannelOptions(pathId);
        } else {
            this.sensorId = '';
            this.channelId = pathId;
            this.channelOptions = [];
        }

        this.loadChannelData();
    }

    /** Daftar channel saudara untuk pemilih channel. Gagal = pemilih disembunyikan. */
    private loadChannelOptions(sensorId: string) {
        this.sensorsService.sensorsControllerFindOneDetailed$Response({ id: sensorId })
            .pipe(takeUntil(this.destroy$)).subscribe({
                next: (res) => {
                    this.channelOptions = this.mapChannelOptions(this.parseResponse(res.body));
                },
                error: () => { this.channelOptions = []; }
            });
    }

    private mapChannelOptions(sensor: any): Array<{ id: string; label: string; unit: string }> {
        const channels = sensor?.channels || sensor?.sensorChannels || [];
        return channels
            .map((c: any) => ({
                id: c.idSensorChannel || c.id || '',
                label: c.metricCode || c.label || 'channel',
                unit: c.unit || ''
            }))
            .filter((c: any) => c.id);
    }

    /** Pindah channel = ganti `?channel=`, biar URL-nya bisa dibagikan. */
    switchChannel(channelId: string) {
        if (!channelId || channelId === this.channelId) return;
        const sensorId = this.sensorId || this.channelMeta.sensorId;
        if (!sensorId || !this.nodeId) return;

        // Path dibangun eksplisit, bukan relatif + merge query. Kalau id di path
        // ternyata id CHANNEL (tautan lama), menempelkan `?channel=` saja
        // menghasilkan `…/sensor/<channelA>?channel=<channelB>` dan channelA akan
        // dibaca sebagai id sensor di pemuatan berikutnya.
        const path = this.embedded && this.projectId
            ? ['/iot/projects', this.projectId, 'node', this.nodeId, 'sensor', sensorId]
            : ['/iot/nodes', this.nodeId, 'sensor', sensorId];

        this.router.navigate(path, { queryParams: { channel: channelId } });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ───────────────────────────────────────────────────────── pemuatan data

    loadChannelData() {
        if (!this.channelId) return;

        this.loading = true;
        this.loadError = null;
        const seq = ++this.loadSeq;

        const { start, end } = this.getPeriodRange();

        this.sensorChannelsService.sensorChannelsControllerGetReadings({
            id: this.channelId,
            startTime: start.toISOString(),
            endTime: end.toISOString()
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: (response: any) => {
                if (seq !== this.loadSeq) return;
                const data = this.parseResponse(response);
                if (!data) { this.showLoadError({}); return; }
                // Pemuatan ini berhasil — hapus galat dari percobaan sebelumnya,
                // supaya banner merah tidak menempel di atas data yang benar.
                this.loadError = null;
                this.applyChannelMeta(data.channel || {});
                this.ingestReadings(data);
                this.loading = false;
            },
            error: (err) => {
                if (seq !== this.loadSeq) return;
                // Id di path bisa berupa id SENSOR, bukan id channel — berlaku di
                // kedua mode, karena tautan lama/bookmark bisa memakai bentuk itu.
                // Fallback HANYA untuk 404: kalau server mati atau menolak akses,
                // mencoba ulang sebagai sensor cuma menyembunyikan penyebab aslinya.
                if (this.channelId && !this.channelParam && err?.status === 404) {
                    this.loadSensorData(this.channelId);
                } else {
                    this.showLoadError(err);
                }
            }
        });
    }

    /** Fallback: id ternyata milik sensor — ambil channel pertamanya. */
    loadSensorData(sensorId: string) {
        this.sensorsService.sensorsControllerFindOneDetailed$Response({ id: sensorId })
            .pipe(takeUntil(this.destroy$)).subscribe({
                next: (res) => {
                    const sensor = this.parseResponse(res.body);
                    if (!sensor) { this.showLoadError({}); return; }

                    this.sensorName = sensor.label || sensor.code || 'Sensor';
                    this.sensorType = sensor.sensorCatalog?.name || sensor.sensorCatalog?.code || '';
                    this.nodeCode = sensor.node?.code || sensor.node?.name || '';

                    // Id di path ternyata milik sensor — catat, dan tawarkan
                    // channel saudaranya lewat pemilih channel.
                    this.sensorId = sensorId;
                    this.channelOptions = this.mapChannelOptions(sensor);

                    const channels = sensor.channels || sensor.sensorChannels || [];
                    if (!channels.length) {
                        // Sebabnya BUKAN "belum ada bacaan pada periode ini" —
                        // sensornya memang belum punya channel sama sekali.
                        // `channelId` dikosongkan supaya Ubah/Hapus/Ekspor mati:
                        // kalau dibiarkan, isinya id SENSOR dan tombol Hapus akan
                        // menembak endpoint channel dengan id yang salah.
                        this.channelId = '';
                        this.loading = false;
                        this.allReadings = [];
                        this.resetStats();
                        this.applyClientSideFilters();
                        this.loadError = 'Sensor ini belum punya channel. Tambahkan channel dulu lewat detail node.';
                        return;
                    }

                    const first = channels[0];
                    this.applyChannelMeta({
                        idSensorChannel: first.idSensorChannel || first.id,
                        metricCode: first.metricCode,
                        unit: first.unit,
                        precision: first.precision,
                        minThreshold: first.minThreshold,
                        maxThreshold: first.maxThreshold,
                        idSensorType: first.idSensorType,
                        sensorType: first.sensorType?.name,
                        nodeCode: this.nodeCode
                    });
                    this.channelMeta.sensorId = sensorId;

                    this.channelId = first.idSensorChannel || first.id;
                    this.loadChannelReadings(this.channelId);
                },
                error: (err) => this.showLoadError(err)
            });
    }

    loadChannelReadings(channelId: string) {
        const seq = ++this.loadSeq;
        const { start, end } = this.getPeriodRange();

        this.sensorChannelsService.sensorChannelsControllerGetReadings({
            id: channelId,
            startTime: start.toISOString(),
            endTime: end.toISOString()
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: (response: any) => {
                if (seq !== this.loadSeq) return;
                const data = this.parseResponse(response);
                if (!data) { this.showLoadError({}); return; }
                this.loadError = null;
                // Metadata channel diambil ulang dari respons ini — `/sensors/{id}/detailed`
                // tidak membawa min/maxThreshold, jadi tanpa langkah ini bacaan tidak
                // akan pernah ditandai meski ambangnya sebenarnya sudah diatur.
                this.applyChannelMeta(data.channel || {});
                this.ingestReadings(data);
                this.loading = false;
            },
            error: (err) => this.showLoadError(err)
        });
    }

    private applyChannelMeta(channel: any) {
        this.sensorName = channel.sensorCode || channel.metricCode || 'Channel';
        this.sensorType = channel.sensorType || this.sensorType || '';
        this.nodeCode = channel.nodeCode || this.nodeCode || '';
        this.nodeAddress = channel.nodeAddress || this.nodeAddress || '';
        this.sensorUnit = channel.unit || '';
        this.telemetryIntervalSec = this.toNumber(channel.telemetryIntervalSec);
        // Id induk kini ikut dikirim backend, jadi pemilih channel bisa muncul
        // walau URL-nya memakai id channel (bentuk lama/bookmark).
        if (channel.idSensor) {
            this.sensorId = channel.idSensor;
            this.channelMeta.sensorId = channel.idSensor;
            if (!this.channelOptions.length) {
                this.loadChannelOptions(channel.idSensor);
            }
        }

        const precision = this.toNumber(channel.precision) ?? 0.01;
        this.decimals = decimalsFromPrecision(precision);

        this.channelMeta = {
            sensorId: this.channelMeta.sensorId || '',
            channelId: channel.metricCode || '',
            metricCode: channel.metricCode || '',
            unit: channel.unit || '',
            precision: precision,
            minThreshold: this.toThreshold(channel.minThreshold),
            maxThreshold: this.toThreshold(channel.maxThreshold),
            sensorTypeId: channel.idSensorType || '',
            sensorTypeLabel: channel.sensorType || ''
        };
    }

    /**
     * Backend sudah menghitung `statistics`, jadi tidak dihitung ulang di sini.
     *
     * Urutan dari server TIDAK diandalkan: endpoint punya parameter `order` dan
     * defaultnya pernah berubah, jadi array diurutkan sendiri di klien. Grafik
     * selalu kronologis (lama → baru); tabel dibalik jadi terbaru dulu — itu yang
     * dicari operator saat membuka halaman.
     */
    private ingestReadings(data: any) {
        const dataPoints: any[] = data?.dataPoints || [];

        const mapped: SensorReading[] = [];
        for (const dp of dataPoints) {
            const rawTs = dp.timestamp || dp.ts;
            const parsed = rawTs ? new Date(rawTs) : null;
            // Waktu tak terbaca BUKAN "sekarang". Memberi stempel now() akan
            // memindahkan bacaan tua ke ujung grafik dan memalsukan kesegaran —
            // titik seperti itu dibuang saja.
            if (!parsed || isNaN(parsed.getTime())) continue;

            const value = this.toNumber(dp.value);
            const { flag, note } = this.evaluateReading(value);
            mapped.push({
                timestamp: parsed,
                value,
                rawValue: this.toNumber(dp.rawValue),
                unit: this.sensorUnit,
                flag,
                note
            });
        }

        const ascending = [...mapped].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        this.buildChart(ascending);

        // Tabel: terbaru dulu.
        this.allReadings = [...ascending].reverse();
        this.lastReadingAt = ascending.length ? ascending[ascending.length - 1].timestamp : null;

        // `statistics.lastValue` mengikuti urutan yang dikirim server, jadi untuk
        // "nilai terkini" dipakai bacaan terbaru hasil pengurutan sendiri.
        const newest = ascending.length ? ascending[ascending.length - 1].value : null;
        const s = data?.statistics || {};
        const extremes = this.findExtremes(ascending);
        this.stats = {
            min: this.toNumber(s.min) ?? extremes.minValue,
            max: this.toNumber(s.max) ?? extremes.maxValue,
            avg: this.toNumber(s.avg),
            count: Number(s.count) || ascending.length,
            lastValue: newest,
            minAt: extremes.minAt,
            maxAt: extremes.maxAt
        };

        this.applyClientSideFilters();
    }

    /**
     * Rentang sumbu Y.
     *
     * Dulu sumbu dipaksa memuat ambang apa pun jaraknya. Itu membuat garis ambang
     * selalu terlihat, TAPI memaku sumbu ke rentang ambang: pada channel 0,5–5 bar
     * yang datanya 0–3,5, kurva cuma memakai 64% tinggi grafik dan sumbunya tidak
     * berubah sedikit pun saat operator berganti periode — grafik terasa "kecil".
     *
     * Sekarang DATA yang menentukan sumbu. Ambang hanya ikut melebarkan sumbu bila
     * memang dekat (dalam setengah rentang data), supaya bacaan yang sedang
     * mendekati batas tetap terbaca bersama garisnya. Ambang yang jauh TIDAK
     * menarik sumbu — tapi juga tidak dibiarkan hilang diam-diam: kodenya
     * dilaporkan lewat `hiddenThresholds` dan ditulis sebagai catatan di bawah
     * grafik, bukan digambar sebagai garis palsu di tepi.
     */
    private axisRangeFor(
        points: Array<{ x: number; y: number | null }>,
        xMin?: number,
        xMax?: number
    ): { min?: number; max?: number; hidden: string[] } {
        const inWindow = (xMin === undefined || xMax === undefined)
            ? points
            : points.filter(p => p.x >= xMin && p.x <= xMax);

        const values = inWindow.map(p => p.y).filter((v): v is number => v !== null);
        if (!values.length) return { hidden: [] };

        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        const span = dataMax - dataMin || Math.abs(dataMax) || 1;
        // Toleransi sengaja KECIL (10% rentang data). Dengan 50% ambang 5 bar
        // masih ikut tertarik pada data 0–3,5 dan grafiknya tetap kerdil —
        // persis keluhan yang mau diperbaiki. Dengan 10%, ambang hanya ikut
        // kalau datanya memang nyaris menyentuhnya.
        const allowance = span * 0.1;

        const { minThreshold, maxThreshold } = this.channelMeta;
        const unit = this.sensorUnit ? ' ' + this.sensorUnit : '';
        const hidden: string[] = [];

        let lo = dataMin;
        let hi = dataMax;

        if (minThreshold !== null && minThreshold !== undefined) {
            if (minThreshold >= dataMin - allowance && minThreshold <= dataMax + allowance) {
                lo = Math.min(lo, minThreshold);
            } else {
                hidden.push(`ambang min ${this.fmt(minThreshold, this.thresholdFormat)}${unit}`);
            }
        }
        if (maxThreshold !== null && maxThreshold !== undefined) {
            if (maxThreshold >= dataMin - allowance && maxThreshold <= dataMax + allowance) {
                hi = Math.max(hi, maxThreshold);
            } else {
                hidden.push(`ambang maks ${this.fmt(maxThreshold, this.thresholdFormat)}${unit}`);
            }
        }

        const pad = (hi - lo || Math.abs(hi) || 1) * 0.05;
        return { min: lo - pad, max: hi + pad, hidden };
    }

    /**
     * Setelah zoom/seleksi, sumbu Y dihitung ulang dari titik yang TERLIHAT saja.
     * Tanpa ini sumbu tetap memakai rentang seluruh seri dan kurva yang dizoom
     * tampak datar. Reset zoom (min/max kosong) mengembalikan rentang penuh.
     */
    private rescaleYForWindow(ctx: any, xaxis: { min?: number; max?: number }) {
        if (!ctx || !this.chartPoints.length) return;
        const range = this.axisRangeFor(this.chartPoints, xaxis?.min, xaxis?.max);
        if (range.min === undefined || range.max === undefined) return;

        this.zone.run(() => { this.hiddenThresholds = range.hidden; });

        try {
            // Parameter ke-5 (`overwriteInitialConfig`) WAJIB false. Defaultnya
            // true, sehingga rentang sumbu hasil zoom ikut menimpa konfigurasi
            // awal — dan tombol "reset zoom" lalu mengembalikan grafik ke
            // rentang Y hasil zoom itu, bukan ke rentang penuhnya.
            ctx.updateOptions(
                { yaxis: { ...this.chartOptions.yaxis, min: range.min, max: range.max } },
                false,  // redrawPaths
                false,  // animate
                false,  // updateSyncedCharts
                false   // overwriteInitialConfig
            );
        } catch {
            // Gagal menyesuaikan sumbu bukan alasan merusak tampilan.
        }
    }

    /** Kapan nilai terendah & tertinggi terjadi. Backend hanya mengirim angkanya. */
    private findExtremes(ascending: SensorReading[]) {
        let minValue: number | null = null;
        let maxValue: number | null = null;
        let minAt: Date | null = null;
        let maxAt: Date | null = null;

        for (const r of ascending) {
            if (r.value === null) continue;
            if (minValue === null || r.value < minValue) {
                minValue = r.value;
                minAt = r.timestamp;
            }
            if (maxValue === null || r.value > maxValue) {
                maxValue = r.value;
                maxAt = r.timestamp;
            }
        }
        return { minValue, maxValue, minAt, maxAt };
    }

    /**
     * Jeda pengiriman: selisih antar bacaan yang jauh lebih besar dari jarak
     * normalnya (median). Dipakai dua kali — memutus garis grafik supaya jeda
     * tidak terlihat seperti penurunan nyata, dan memberi tahu operator.
     */
    private findGaps(ascending: SensorReading[]): { gaps: DataGap[]; thresholdMs: number } {
        if (ascending.length < 3) return { gaps: [], thresholdMs: Infinity };

        const deltas: number[] = [];
        for (let i = 1; i < ascending.length; i++) {
            deltas.push(ascending[i].timestamp.getTime() - ascending[i - 1].timestamp.getTime());
        }
        const sorted = [...deltas].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || 0;
        // Tiga kali jarak normal, minimal 10 menit, supaya jitter biasa tidak terhitung jeda.
        const thresholdMs = Math.max(median * 3, 10 * 60 * 1000);

        const gaps: DataGap[] = [];
        for (let i = 1; i < ascending.length; i++) {
            const delta = ascending[i].timestamp.getTime() - ascending[i - 1].timestamp.getTime();
            if (delta > thresholdMs) {
                gaps.push({
                    from: ascending[i - 1].timestamp,
                    to: ascending[i].timestamp,
                    minutes: Math.round(delta / 60000)
                });
            }
        }
        return { gaps, thresholdMs };
    }

    private resetStats() {
        this.stats = { min: null, max: null, avg: null, count: 0, lastValue: null, minAt: null, maxAt: null };
        this.lastReadingAt = null;
        this.chartSeries = [];
        this.chartReady = false;
        this.gaps = [];
    }

    // ───────────────────────────────────────────────────────────── grafik

    private buildChart(ascending: SensorReading[]) {
        const withValue = ascending.filter(r => r.value !== null);

        if (!withValue.length) {
            this.chartSeries = [];
            this.chartReady = false;
            this.gaps = [];
            this.chartPoints = [];
            this.hiddenThresholds = [];
            return;
        }

        const { gaps, thresholdMs } = this.findGaps(withValue);
        this.gaps = gaps;

        // Titik `null` di tengah jeda memaksa ApexCharts MEMUTUS garis. Tanpa ini
        // kurva menyambung lurus melewati jeda berjam-jam, dan operator membacanya
        // sebagai tekanan yang benar-benar turun perlahan — padahal datanya hilang.
        const points: Array<{ x: number; y: number | null }> = [];
        for (let i = 0; i < withValue.length; i++) {
            const r = withValue[i];
            if (i > 0) {
                const prev = withValue[i - 1].timestamp.getTime();
                const delta = r.timestamp.getTime() - prev;
                if (delta > thresholdMs) {
                    points.push({ x: prev + Math.floor(delta / 2), y: null });
                }
            }
            points.push({ x: r.timestamp.getTime(), y: r.value as number });
        }

        const unit = this.sensorUnit;
        const { minThreshold, maxThreshold } = this.channelMeta;

        const annotations: any = { yaxis: [] };
        if (minThreshold !== null && minThreshold !== undefined) {
            annotations.yaxis.push({
                y: minThreshold,
                borderColor: '#f59e0b',
                strokeDashArray: 4,
                label: {
                    text: `Min ${this.fmt(minThreshold, this.thresholdFormat)}${unit ? ' ' + unit : ''}`,
                    position: 'left',
                    textAnchor: 'start',
                    style: { background: '#f59e0b', color: '#1b1f27', fontSize: '10px' }
                }
            });
        }
        if (maxThreshold !== null && maxThreshold !== undefined) {
            annotations.yaxis.push({
                y: maxThreshold,
                borderColor: '#ef4444',
                strokeDashArray: 4,
                label: {
                    text: `Maks ${this.fmt(maxThreshold, this.thresholdFormat)}${unit ? ' ' + unit : ''}`,
                    position: 'left',
                    textAnchor: 'start',
                    style: { background: '#ef4444', color: '#fff', fontSize: '10px' }
                }
            });
        }

        // Tema grafik mengikuti tema aplikasi; sebelumnya dipaku 'dark' sehingga
        // label sumbu tak terbaca saat pengguna memilih tema terang.
        const darkMode = (document.documentElement.getAttribute('data-bs-theme') || 'dark') !== 'light';
        const axisColor = darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
        const gridColor = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

        this.chartPoints = points;
        const axisRange = this.axisRangeFor(points);
        this.hiddenThresholds = axisRange.hidden;

        this.chartSeries = [{ name: this.channelMeta.metricCode || 'Nilai', data: points }];
        this.chartOptions = {
            chart: {
                type: 'area',
                height: 260,
                toolbar: { show: true, tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
                animations: { enabled: false },
                background: 'transparent',
                fontFamily: 'inherit',
                events: {
                    // Zoom/seleksi hanya mengubah sumbu X; sumbu Y harus ikut
                    // menyesuaikan, kalau tidak kurva yang dizoom tampak datar.
                    zoomed: (ctx: any, opts: any) => this.rescaleYForWindow(ctx, opts?.xaxis || {}),
                    scrolled: (ctx: any, opts: any) => this.rescaleYForWindow(ctx, opts?.xaxis || {})
                }
            },
            theme: { mode: darkMode ? 'dark' : 'light' },
            stroke: { curve: 'smooth', width: 2 },
            dataLabels: { enabled: false },
            colors: ['#00acac'],
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 95, 100] }
            },
            grid: { borderColor: gridColor, strokeDashArray: 3, padding: { left: 8, right: 8, top: 0 } },
            xaxis: {
                type: 'datetime',
                labels: { datetimeUTC: false, style: { colors: axisColor, fontSize: '11px' } },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                // Sumbu Y DIPAKSA mencakup ambang, bukan hanya data.
                // ApexCharts menskala otomatis ke rentang data: pada "7 hari" data
                // menyentuh ambang sehingga garisnya ikut terlihat, tapi pada
                // "24 jam" data berada di antara kedua ambang — garis anotasinya
                // jatuh di luar rentang sumbu dan TIDAK digambar sama sekali.
                // Operator lalu mengira ambangnya hilang.
                ...axisRange,
                forceNiceScale: true,
                labels: {
                    style: { colors: axisColor, fontSize: '11px' },
                    formatter: (v: number) => (v === null || v === undefined ? '' : this.fmt(v))
                }
            },
            tooltip: {
                theme: darkMode ? 'dark' : 'light',
                x: { format: 'dd MMM yyyy HH:mm:ss' },
                y: { formatter: (v: number) => `${this.fmt(v)}${unit ? ' ' + unit : ''}` }
            },
            annotations,
            noData: { text: 'Belum ada data' }
        };
        this.chartReady = true;
    }

    // ────────────────────────────────────────────────────────── rentang waktu

    /**
     * Rentang periode yang benar: akhir periode mengikuti periodenya, bukan selalu
     * "sekarang". "Kemarin" berakhir di awal hari ini, "Bulan lalu" di awal bulan ini.
     * Tanggal rentang khusus dibaca sebagai waktu LOKAL (bukan UTC).
     */
    private getPeriodRange(): { start: Date; end: Date } {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysAgo = (n: number) => {
            const d = new Date(startOfToday);
            d.setDate(d.getDate() - n);
            return d;
        };

        switch (this.selectedPeriod) {
            case 'today':
                return { start: startOfToday, end: now };
            case 'yesterday':
                return { start: daysAgo(1), end: startOfToday };
            case 'last24h':
                return { start: new Date(now.getTime() - 24 * 3600 * 1000), end: now };
            case 'last7days':
                return { start: daysAgo(7), end: now };
            case 'last30days':
                return { start: daysAgo(30), end: now };
            case 'thisMonth':
                return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
            case 'lastMonth':
                return {
                    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                    end: new Date(now.getFullYear(), now.getMonth(), 1)
                };
            case 'custom': {
                const start = this.parseLocalDate(this.dateFrom) || daysAgo(7);
                // "Sampai" inklusif: sampai akhir hari yang dipilih.
                const toDate = this.parseLocalDate(this.dateTo);
                const end = toDate ? new Date(toDate.getTime() + 24 * 3600 * 1000 - 1) : now;
                return { start, end };
            }
            default:
                return { start: daysAgo(7), end: now };
        }
    }

    /** 'YYYY-MM-DD' → tengah malam waktu LOKAL (new Date('YYYY-MM-DD') dibaca UTC). */
    private parseLocalDate(value: string): Date | null {
        if (!value) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
        if (!m) return null;
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }

    getSelectedPeriodLabel(): string {
        if (this.selectedPeriod === 'custom' && (this.dateFrom || this.dateTo)) {
            return `${this.dateFrom || '…'} s/d ${this.dateTo || 'sekarang'}`;
        }
        return this.periodOptions.find(p => p.value === this.selectedPeriod)?.label || 'Rentang khusus';
    }

    // ───────────────────────────────────────────────────────────── filter & paginasi

    applyFilters() {
        if (this.channelId) {
            this.loadChannelData();
            return;
        }
        // Tidak ada request yang dikirim, jadi jangan memalsukan status HTTP 404
        // ("Channel tidak ditemukan") — sebabnya memang belum ada channel terpilih.
        this.loading = false;
        this.loadError = this.loadError || 'Channel belum terpilih.';
    }

    setFlagFilter(value: 'all' | 'out') {
        if (this.selectedFlagFilter === value) return;
        this.selectedFlagFilter = value;
        this.applyClientSideFilters();
    }

    /**
     * Klik judul kolom: kolom sama → balik arah, kolom lain → mulai dari arah
     * yang paling berguna (waktu & nilai dari besar ke kecil).
     */
    sortBy(field: 'timestamp' | 'value' | 'flag') {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = field === 'flag' ? 'asc' : 'desc';
        }
        this.applyClientSideFilters();
    }

    /** Urutan "keparahan" supaya mengurutkan kolom Keterangan ada artinya. */
    private flagRank(flag: ReadingFlag): number {
        return flag === 'normal' ? 0 : flag === 'below_min' ? 1 : 2;
    }

    applyClientSideFilters() {
        const filtered = this.selectedFlagFilter === 'out'
            ? this.allReadings.filter(r => r.flag !== 'normal')
            : [...this.allReadings];

        // Diurutkan atas SELURUH data terfilter, bukan hanya halaman yang tampil —
        // kalau tidak, "nilai tertinggi" cuma berarti tertinggi di halaman ini.
        const dir = this.sortDirection === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
            switch (this.sortField) {
                case 'value': {
                    // Bacaan tanpa nilai selalu di bawah, apa pun arah urutannya.
                    if (a.value === null && b.value === null) return 0;
                    if (a.value === null) return 1;
                    if (b.value === null) return -1;
                    return (a.value - b.value) * dir;
                }
                case 'flag': {
                    const d = (this.flagRank(a.flag) - this.flagRank(b.flag)) * dir;
                    // Keparahan sama → yang terbaru dulu, biar stabil & berguna.
                    return d !== 0 ? d : b.timestamp.getTime() - a.timestamp.getTime();
                }
                default:
                    return (a.timestamp.getTime() - b.timestamp.getTime()) * dir;
            }
        });

        this.filteredReadings = filtered;
        this.totalRecords = this.filteredReadings.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
        this.currentPage = 1;
        this.updateDisplayedReadings();
    }

    updateDisplayedReadings() {
        const start = (this.currentPage - 1) * this.pageSize;
        this.displayedReadings = this.filteredReadings.slice(start, start + this.pageSize);
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.updateDisplayedReadings();
        }
    }

    onPageSizeChange() {
        this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
        this.currentPage = 1;
        this.updateDisplayedReadings();
    }

    getPageNumbers(): number[] {
        const total = this.totalPages;
        const windowSize = 5;
        if (total <= windowSize) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }
        let start = Math.max(1, this.currentPage - Math.floor(windowSize / 2));
        start = Math.min(start, total - windowSize + 1);
        return Array.from({ length: windowSize }, (_, i) => start + i);
    }

    /** Jumlah bacaan di luar ambang dalam periode — untuk chip filter. */
    get outOfRangeCount(): number {
        return this.allReadings.filter(r => r.flag !== 'normal').length;
    }

    /** "4 jeda · total 9j 12m" — ditulis di bawah grafik. */
    get gapSummary(): string {
        if (!this.gaps.length) return '';
        const total = this.gaps.reduce((sum, g) => sum + g.minutes, 0);
        const h = Math.floor(total / 60);
        const m = total % 60;
        const dur = h ? `${h}j ${m}m` : `${m}m`;
        return `${this.gaps.length} jeda pengiriman · total ${dur}`;
    }

    /** Label urutan aktif, supaya judul kartu tidak berbohong setelah diurut ulang. */
    get sortSummary(): string {
        const naik = this.sortDirection === 'asc';
        switch (this.sortField) {
            case 'value':
                return naik ? 'nilai terkecil di atas' : 'nilai terbesar di atas';
            case 'flag':
                return naik ? 'normal di atas' : 'di luar ambang di atas';
            default:
                return naik ? 'terlama di atas' : 'terbaru di atas';
        }
    }

    get hasThresholds(): boolean {
        const { minThreshold, maxThreshold } = this.channelMeta;
        return (minThreshold !== null && minThreshold !== undefined)
            || (maxThreshold !== null && maxThreshold !== undefined);
    }

    // ────────────────────────────────────────────────────────────── tampilan

    /**
     * Kesegaran hanya bermakna kalau periodenya memang berakhir SEKARANG.
     * Untuk "Kemarin" atau "Bulan lalu", data tua itu wajar — menampilkan lencana
     * merah "30d ago" di situ akan dibaca sebagai alat mati, padahal bukan.
     */
    get periodEndsNow(): boolean {
        if (this.selectedPeriod === 'custom') return !this.dateTo;
        return !['yesterday', 'lastMonth'].includes(this.selectedPeriod);
    }

    get freshness(): Freshness {
        return getFreshness(this.lastReadingAt, this.telemetryIntervalSec);
    }

    get freshnessBadge(): string {
        if (!this.periodEndsNow) return 'bg-secondary-subtle text-secondary';
        return FRESHNESS_BADGE[this.freshness];
    }

    get freshnessLabel(): string {
        if (!this.lastReadingAt) return 'Tidak ada data';
        if (!this.periodEndsNow) return 'Data periode lampau';
        return `Data terakhir ${this.timeAgoId(this.lastReadingAt)}`;
    }

    /** timeAgo() berbahasa Inggris ("4m ago"); halaman ini berbahasa Indonesia. */
    private timeAgoId(at: Date): string {
        const raw = timeAgo(at);
        if (raw === 'Never') return 'tidak pernah';
        const m = /^(\d+)([smhd]) ago$/.exec(raw);
        if (!m) return raw;
        const unit = { s: 'detik', m: 'menit', h: 'jam', d: 'hari' }[m[2]] || '';
        return `${m[1]} ${unit} lalu`;
    }

    flagBadgeClass(flag: ReadingFlag): string {
        switch (flag) {
            case 'below_min': return 'bg-warning-subtle text-warning';
            case 'above_max': return 'bg-danger-subtle text-danger';
            default: return 'bg-success-subtle text-success';
        }
    }

    flagLabel(flag: ReadingFlag): string {
        switch (flag) {
            case 'below_min': return 'Di bawah min';
            case 'above_max': return 'Di atas maks';
            default: return 'Normal';
        }
    }

    // ──────────────────────────────────────────────────────────────── ekspor

    /**
     * Ekspor Excel: Sheet "Ringkasan" (identitas + statistik + gambar grafik) dan
     * Sheet "Data" (seluruh bacaan sesuai filter & urutan di layar).
     *
     * Aturan yang dipegang: TIDAK ADA angka karangan. Kolom Keterangan dikosongkan
     * kalau ambang belum diatur, dan waktu ditulis sebagai datetime Excel asli
     * (bukan teks) supaya bisa difilter dan dihitung di Excel.
     */
    async exportToExcel() {
        if (!this.filteredReadings.length || this.exporting) return;
        this.exporting = true;

        try {
            const wb = new Workbook();
            wb.creator = 'Devetek Helios';
            wb.created = new Date();

            const unit = this.sensorUnit || '';
            const numFmt = excelNumFmt(this.decimals);
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'waktu lokal';
            const { start, end } = this.getPeriodRange();

            // ── Sheet 1: Ringkasan ──────────────────────────────────────────
            const sum = wb.addWorksheet('Ringkasan');
            sum.columns = [{ width: 26 }, { width: 46 }];
            let row = 1;

            const title = sum.getCell(`A${row}`);
            title.value = 'LAPORAN SENSOR — DEVETEK HELIOS';
            title.font = { bold: true, size: 16 };
            sum.mergeCells(`A${row}:B${row}`);
            row += 2;

            const info = (label: string, value: any) => {
                sum.getCell(`A${row}`).value = label;
                sum.getCell(`A${row}`).font = { bold: true };
                sum.getCell(`B${row}`).value = value;
                row++;
            };

            info('Alamat node', this.nodeAddress || '(alamat belum diisi)');
            info('Kode node', this.nodeCode || '—');
            info('Sensor', this.sensorName);
            info('Channel / metrik', this.channelMeta.metricCode || '—');
            info('Jenis sensor', this.sensorType || '—');
            info('Satuan', unit || '—');
            info(`Periode (${tz})`, `${this.formatLocalTimestamp(start)} s/d ${this.formatLocalTimestamp(end)}`);
            info('Pilihan periode', this.getSelectedPeriodLabel());
            info('Dibuat', new Date().toLocaleString('id-ID'));
            row++;

            const head = (text: string) => {
                sum.getCell(`A${row}`).value = text;
                sum.getCell(`A${row}`).font = { bold: true, size: 12 };
                row++;
            };

            head('STATISTIK');
            const stat = (label: string, value: any, fmt?: string) => {
                sum.getCell(`A${row}`).value = label;
                const cell = sum.getCell(`B${row}`);
                cell.value = value;
                if (fmt && typeof value === 'number') cell.numFmt = fmt;
                row++;
            };

            const first = this.filteredReadings.length
                ? this.filteredReadings[this.filteredReadings.length - 1]
                : null;
            const last = this.filteredReadings.length ? this.filteredReadings[0] : null;

            stat('Jumlah sampel', this.stats.count);
            stat('Terendah', this.stats.min ?? '—', numFmt);
            stat('Waktu terendah', this.stats.minAt ? this.formatLocalTimestamp(this.stats.minAt) : '—');
            stat('Tertinggi', this.stats.max ?? '—', numFmt);
            stat('Waktu tertinggi', this.stats.maxAt ? this.formatLocalTimestamp(this.stats.maxAt) : '—');
            stat('Rata-rata', this.stats.avg ?? '—', numFmt);
            // "Pertama/terakhir" mengikuti waktu, bukan urutan tabel yang bisa diubah.
            const byTime = [...this.filteredReadings].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            const oldest = byTime[0];
            const newest = byTime[byTime.length - 1];
            stat('Nilai pertama', oldest?.value ?? '—', numFmt);
            stat('Waktu pertama', oldest ? this.formatLocalTimestamp(oldest.timestamp) : '—');
            stat('Nilai terakhir', newest?.value ?? '—', numFmt);
            stat('Waktu terakhir', newest ? this.formatLocalTimestamp(newest.timestamp) : '—');
            row++;

            head('AMBANG');
            if (this.hasThresholds) {
                stat('Ambang minimum', this.channelMeta.minThreshold ?? '—', numFmt);
                stat('Ambang maksimum', this.channelMeta.maxThreshold ?? '—', numFmt);
                stat('Bacaan di luar ambang', this.outOfRangeCount);
            } else {
                stat('Status', 'Belum diatur — bacaan tidak diperiksa, tidak ada alarm');
            }
            row++;

            head('JEDA PENGIRIMAN');
            if (this.gaps.length) {
                stat('Jumlah jeda', this.gaps.length);
                for (const g of this.gaps) {
                    stat(
                        `  ${this.formatLocalTimestamp(g.from)}`,
                        `s/d ${this.formatLocalTimestamp(g.to)} · ${g.minutes} menit tanpa data`
                    );
                }
            } else {
                stat('Jumlah jeda', 'Tidak ada jeda terdeteksi');
            }
            row++;

            // Grafik disisipkan sebagai gambar, diambil dari instance ApexCharts
            // yang sedang tampil. Kalau gagal (grafik belum dirender), lembar
            // tetap terbit tanpa gambar — bukan alasan membatalkan ekspor.
            await this.appendChartImage(wb, sum, row);

            // ── Sheet 2: Data ───────────────────────────────────────────────
            const data = wb.addWorksheet('Data');
            data.columns = [
                { header: `Waktu (${tz})`, key: 'waktu', width: 22 },
                { header: `Nilai${unit ? ' (' + unit + ')' : ''}`, key: 'nilai', width: 14 },
                { header: 'Satuan', key: 'satuan', width: 10 },
                { header: 'Nilai mentah', key: 'mentah', width: 14 },
                { header: 'Keterangan', key: 'ket', width: 34 }
            ];
            data.getRow(1).font = { bold: true };
            data.views = [{ state: 'frozen', ySplit: 1 }];

            for (const r of this.filteredReadings) {
                data.addRow({
                    waktu: this.toExcelLocalDate(r.timestamp),
                    nilai: r.value,
                    satuan: r.unit,
                    mentah: r.rawValue,
                    // Tanpa ambang tidak ada penilaian — kosong, bukan "Normal".
                    ket: this.hasThresholds ? (r.note || this.flagLabel(r.flag)) : ''
                });
            }

            data.getColumn('waktu').numFmt = 'yyyy-mm-dd hh:mm:ss';
            data.getColumn('nilai').numFmt = numFmt;
            data.getColumn('mentah').numFmt = '0.0000';
            data.autoFilter = { from: 'A1', to: `E${this.filteredReadings.length + 1}` };

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const label = this.slug(this.nodeAddress || this.nodeCode || this.sensorName);
            const metric = this.slug(this.channelMeta.metricCode || 'channel');
            saveAs(blob, `sensor-${label}-${metric}-${this.formatFileStamp(new Date())}.xlsx`);
        } catch (err) {
            console.error('Gagal membuat berkas Excel', err);
            this.loadError = 'Gagal membuat berkas Excel. Coba lagi.';
        } finally {
            this.exporting = false;
        }
    }

    /**
     * Excel TIDAK punya konsep zona waktu: sebuah `Date` ditulis apa adanya
     * memakai komponen UTC-nya. Bacaan pukul 20.45 WIB akan muncul sebagai 13.45
     * di Excel, padahal judul kolomnya menulis Asia/Jakarta — laporan yang
     * diam-diam salah tujuh jam.
     *
     * Karena itu waktunya digeser sebesar offset lokal, supaya komponen UTC-nya
     * sama persis dengan jam dinding yang dilihat operator di layar.
     */
    private toExcelLocalDate(d: Date): Date {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
    }

    /** Sisipkan grafik yang sedang tampil sebagai gambar PNG. */
    private async appendChartImage(wb: Workbook, sheet: any, row: number) {
        try {
            if (!this.chartRef || !this.chartReady) return;
            const result: any = await this.chartRef.dataURI();
            const uri: string | undefined = result?.imgURI || result?.blob;
            if (!uri || typeof uri !== 'string') return;

            const imageId = wb.addImage({ base64: uri, extension: 'png' });
            sheet.addImage(imageId, {
                tl: { col: 0, row: row },
                ext: { width: 860, height: 300 }
            });
        } catch (err) {
            // Gambar hanyalah pelengkap; laporan angkanya tetap sah tanpa itu.
            console.warn('Grafik tidak bisa disisipkan ke Excel', err);
        }
    }

    /** Nama lokasi dibuat aman untuk nama berkas. */
    private slug(value: string): string {
        return (value || 'sensor')
            .normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase() || 'sensor';
    }

    /** CSV memakai waktu lokal yang sama dengan yang dilihat di layar, bukan UTC. */
    private formatLocalTimestamp(d: Date): string {
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }

    private formatFileStamp(d: Date): string {
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    }

    // ─────────────────────────────────────────────────────────────── aksi

    openEditChannelDrawer() {
        this.channelDrawerMode = 'edit';
        this.isChannelDrawerOpen = true;
    }

    handleChannelDrawerClose() {
        this.isChannelDrawerOpen = false;
    }

    handleChannelSave(_formValue: AddChannelFormValue) {
        this.isChannelDrawerOpen = false;
        this.loadChannelData();
    }

    deleteChannel() {
        if (!this.channelId) return;

        const ok = confirm(
            `Hapus channel "${this.channelMeta.metricCode || this.sensorName}"?\n\n` +
            `Yang ikut terhapus permanen:\n` +
            `• Konfigurasi channel\n` +
            `• Seluruh data telemetri channel ini\n` +
            `• Aturan alert yang menempel padanya\n\n` +
            `Tindakan ini tidak bisa dibatalkan.`
        );
        if (!ok) return;

        this.loading = true;
        this.sensorChannelsService.sensorChannelsControllerRemove({ id: this.channelId })
            .pipe(takeUntil(this.destroy$)).subscribe({
                next: () => {
                    this.loading = false;
                    this.goToNodeDetail();
                },
                error: () => {
                    this.loading = false;
                    this.loadError = 'Gagal menghapus channel. Coba lagi.';
                }
            });
    }

    /** Tetap di dalam workspace project kalau sedang embedded. */
    goToNodeDetail() {
        if (this.projectId && this.nodeId) {
            this.router.navigate(['/iot/projects', this.projectId, 'node', this.nodeId]);
        } else if (this.nodeId) {
            this.router.navigate(['/iot/nodes', this.nodeId]);
        }
    }

    retryLoad() {
        if (this.channelId) this.loadChannelData();
    }

    // ────────────────────────────────────────────────────────────── util

    /**
     * Tandai bacaan HANYA terhadap ambang yang dikonfigurasi.
     * Perbandingannya memakai `thresholdState` bersama; yang khas halaman ini
     * cuma teks catatannya.
     */
    private evaluateReading(value: number | null): { flag: ReadingFlag; note?: string } {
        const { minThreshold: min, maxThreshold: max } = this.channelMeta;
        const unit = this.sensorUnit ? ' ' + this.sensorUnit : '';
        switch (thresholdState(value, min, max)) {
            case 'below':
                return { flag: 'below_min', note: `Di bawah batas minimum (${this.fmt(min, this.thresholdFormat)}${unit})` };
            case 'above':
                return { flag: 'above_max', note: `Di atas batas maksimum (${this.fmt(max, this.thresholdFormat)}${unit})` };
            default:
                return { flag: 'normal' };
        }
    }

    /** null/'' → null (belum diatur). Jangan pernah mengganti dengan default karangan. */
    private toThreshold(v: any): number | null {
        if (v === null || v === undefined || v === '') return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    /**
     * SDK menandai respons readings sebagai `void` lalu mengembalikan teks mentah,
     * jadi parsing dilakukan di sini. Body non-JSON (halaman galat proxy, 502 HTML)
     * akan melempar DI DALAM `next` dan membuat `loading` tak pernah jadi false —
     * spinner berputar selamanya tanpa pesan. Karena itu dibungkus.
     */
    private parseResponse(response: any): any | null {
        try {
            return typeof response === 'string' ? JSON.parse(response) : response;
        } catch {
            return null;
        }
    }

    private toNumber(v: any): number | null {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    /*
     * Aturan presisi dua-makna (0,01 = langkah, 2 = jumlah desimal, kosong = 2)
     * kini tinggal di `shared/utils/threshold.ts` supaya halaman daftar dan
     * halaman detail tidak pernah berbeda tafsir.
     */

    /** Format angka tetap (mis. '1.2-2') supaya kolom nilai rata dan tidak bergoyang. */
    /**
     * Format angka memakai locale aplikasi (id-ID -> "1.234,57").
     *
     * WAJIB dipakai untuk setiap angka yang TIDAK lewat pipe `| number`: label
     * sumbu grafik, tooltip, teks anotasi, dan catatan bacaan. `toFixed()` dan
     * interpolasi `${n}` selalu memakai TITIK desimal apa pun LOCALE_ID-nya,
     * jadi tanpa ini grafik menulis "1.79" sementara kartu KPI tepat di atasnya
     * menulis "1,79" — operator membacanya sebagai dua angka berbeda.
     */
    private fmt(n: number | null | undefined, digitsInfo?: string): string {
        if (n === null || n === undefined || isNaN(n)) return '\u2014';
        return formatNumber(n, this.locale, digitsInfo ?? this.numberFormat);
    }

    /**
     * digitsInfo untuk AMBANG: nol di belakang dipangkas, jadi ambang 3 ditulis
     * "3" bukan "3,00", sementara 0,5 tetap "0,5". Ambang diisi manusia, bukan
     * hasil ukur — menampilkannya dengan presisi sensor terbaca palsu presisi.
     */
    get thresholdFormat(): string {
        return `1.0-${this.decimals}`;
    }

    get numberFormat(): string {
        return `1.${this.decimals}-${this.decimals}`;
    }

    private showLoadError(err: any) {
        this.loading = false;
        this.allReadings = [];
        this.resetStats();
        const status = err?.status;
        this.loadError = status === 404
            ? 'Channel tidak ditemukan atau sensornya nonaktif.'
            : status === 0
                ? 'Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.'
                : 'Gagal memuat data pembacaan sensor.';
        this.applyClientSideFilters();
    }
}
