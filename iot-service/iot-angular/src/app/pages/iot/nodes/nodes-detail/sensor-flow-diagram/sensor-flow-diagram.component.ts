import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

/** Nilai satu besaran hidrolika: diukur langsung dari channel, atau dihitung dari dua lainnya. */
export interface FlowQuantity {
    value: number | null;
    source: 'measured' | 'computed' | 'context' | 'device' | null;
}

/** Input mentah dari halaman detail node (satu sensor flow meter). */
export interface FlowMeterInput {
    /** Diameter dalam pipa (mm) — dari context instalasi atau register alat. */
    diameterMm: number | null;
    diameterSource: 'context' | 'device' | null;
    /** Debit terukur dalam l/s (sudah dinormalisasi dari m3/h bila perlu). */
    flowLps: number | null;
    /** Kecepatan terukur m/s. */
    velocityMs: number | null;
    /** Totalizer volume m3. */
    volumeM3: number | null;
    volumeUnit: string;
    updatedAt?: string | null;
}

@Component({
    selector: 'sensor-flow-diagram',
    templateUrl: './sensor-flow-diagram.component.html',
    styleUrls: ['./sensor-flow-diagram.component.scss'],
    standalone: false
})
export class SensorFlowDiagramComponent implements OnChanges {
    @Input() data: FlowMeterInput | null = null;
    @Input() sensorLabel = '';
    @Input() catalogLabel = '';

    /** Diminta user untuk mengisi diameter (buka drawer Context). */
    @Output() configureDiameter = new EventEmitter<void>();

    diameter: FlowQuantity = { value: null, source: null };
    flow: FlowQuantity = { value: null, source: null };
    velocity: FlowQuantity = { value: null, source: null };
    volume: number | null = null;
    volumeUnit = 'm³';

    /** Luas penampang dalam m2. */
    areaM2: number | null = null;
    /** Selisih debit terukur vs hasil hitung V x A, dalam persen. */
    deviationPct: number | null = null;
    /** Status silang: ok | warning | critical | idle | unknown */
    crossCheck: 'ok' | 'warning' | 'critical' | 'idle' | 'unknown' = 'unknown';
    hasFlowMovement = false;
    updatedAt: string | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data']) {
            this.recompute();
        }
    }

    onConfigureDiameter(): void {
        this.configureDiameter.emit();
    }

    // ===== helpers tampilan =====

    /** Tinggi elips air pada gambar mengikuti kecepatan (visual saja, tetap dalam batas). */
    get flowIntensity(): number {
        const v = this.velocity.value ?? 0;
        if (v <= 0) return 0;
        return Math.min(1, v / 3); // 3 m/s dianggap penuh
    }

    get crossCheckLabel(): string {
        switch (this.crossCheck) {
            case 'ok': return 'Konsisten';
            case 'warning': return 'Selisih sedang';
            case 'critical': return 'Selisih besar';
            case 'idle': return 'Tidak ada aliran';
            default: return 'Belum bisa dicek';
        }
    }

    get crossCheckBadge(): string {
        switch (this.crossCheck) {
            case 'ok': return 'badge bg-success bg-opacity-25 text-success';
            case 'warning': return 'badge bg-warning bg-opacity-25 text-warning';
            case 'critical': return 'badge bg-danger bg-opacity-25 text-danger';
            default: return 'badge bg-inverse bg-opacity-15 text-inverse text-opacity-75';
        }
    }

    sourceLabel(source: FlowQuantity['source']): string {
        switch (source) {
            case 'measured': return 'diukur';
            case 'computed': return 'dihitung';
            case 'context': return 'context';
            case 'device': return 'alat';
            default: return '-';
        }
    }

    // ===== inti perhitungan =====

    private recompute(): void {
        const d = this.data;
        this.diameter = { value: null, source: null };
        this.flow = { value: null, source: null };
        this.velocity = { value: null, source: null };
        this.volume = null;
        this.areaM2 = null;
        this.deviationPct = null;
        this.crossCheck = 'unknown';
        this.hasFlowMovement = false;
        this.updatedAt = null;

        if (!d) return;

        this.volume = d.volumeM3;
        this.volumeUnit = d.volumeUnit || 'm³';
        this.updatedAt = d.updatedAt || null;

        const dia = this.positive(d.diameterMm);
        if (dia !== null) {
            this.diameter = { value: dia, source: d.diameterSource || 'context' };
            const radiusM = dia / 1000 / 2;
            this.areaM2 = Math.PI * radiusM * radiusM;
        }

        const measuredFlow = this.finite(d.flowLps);
        const measuredVelocity = this.finite(d.velocityMs);

        if (measuredFlow !== null) this.flow = { value: measuredFlow, source: 'measured' };
        if (measuredVelocity !== null) this.velocity = { value: measuredVelocity, source: 'measured' };

        // Lengkapi besaran yang hilang: Q = V x A (m3/s) -> l/s
        if (this.areaM2 !== null) {
            if (this.flow.value === null && measuredVelocity !== null) {
                this.flow = { value: measuredVelocity * this.areaM2 * 1000, source: 'computed' };
            }
            if (this.velocity.value === null && measuredFlow !== null) {
                this.velocity = { value: measuredFlow / 1000 / this.areaM2, source: 'computed' };
            }
        }

        this.hasFlowMovement = (this.flow.value ?? 0) > 0 || (this.velocity.value ?? 0) > 0;

        // Cek silang hanya bila keduanya benar-benar terukur dan ada aliran
        if (this.areaM2 === null || measuredFlow === null || measuredVelocity === null) {
            this.crossCheck = 'unknown';
            return;
        }
        if (!this.hasFlowMovement) {
            this.crossCheck = 'idle';
            return;
        }

        const calcLps = measuredVelocity * this.areaM2 * 1000;
        if (calcLps <= 0) {
            this.crossCheck = 'unknown';
            return;
        }
        this.deviationPct = ((measuredFlow - calcLps) / calcLps) * 100;
        const abs = Math.abs(this.deviationPct);
        this.crossCheck = abs <= 5 ? 'ok' : abs <= 15 ? 'warning' : 'critical';
    }

    private finite(value: number | null | undefined): number | null {
        return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
    }

    private positive(value: number | null | undefined): number | null {
        const v = this.finite(value);
        return v !== null && v > 0 ? v : null;
    }
}
