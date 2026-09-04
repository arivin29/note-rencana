import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SensorContextService } from '../../sdk/core/services/sensor-context.service';

/** Bentuk channel minimal yang dibutuhkan — dipakai halaman desktop maupun mobile. */
export interface FlowChannelLike {
    id: string;
    metric: string;
    unit: string;
    latest: number | null;
}

/** Nilai satu besaran hidrolika: diukur langsung, dihitung, atau dari konfigurasi. */
export interface FlowQuantity {
    value: number | null;
    source: 'measured' | 'computed' | 'context' | 'device' | null;
}

/** Data mentah satu flow meter, sebelum diturunkan jadi tampilan. */
export interface FlowMeterInput {
    diameterMm: number | null;
    diameterSource: 'context' | 'device' | null;
    flowLps: number | null;
    velocityMs: number | null;
    volumeM3: number | null;
    volumeUnit: string;
    updatedAt?: string | null;
}

/** Hasil turunan siap render: besaran lengkap + cek silang Q vs V x A. */
export interface FlowMeterView {
    diameter: FlowQuantity;
    flow: FlowQuantity;
    velocity: FlowQuantity;
    volume: number | null;
    volumeUnit: string;
    areaM2: number | null;
    deviationPct: number | null;
    crossCheck: 'ok' | 'warning' | 'critical' | 'idle' | 'unknown';
    hasFlowMovement: boolean;
    updatedAt: string | null;
}

type ChannelRole = 'flow' | 'velocity' | 'volume' | 'diameter';

const ROLE_PATTERNS: Record<ChannelRole, RegExp> = {
    flow: /^(q|debit|flow|flow_?rate|flowrate)$|debit|flow/,
    velocity: /^(v|velocity|kecepatan)$|veloc|kecepatan/,
    volume: /^(volume|total|totalizer)$|volume|totali/,
    diameter: /diameter|^d$/
};

/**
 * Perhitungan hidrolika flow meter dipakai bersama oleh halaman node desktop
 * (nodes-detail) dan mobile (node-info) supaya angkanya selalu sama.
 */
@Injectable({ providedIn: 'root' })
export class FlowMeterService {

    constructor(private sensorContextService: SensorContextService) {}

    /** Flow meter bila katalognya cocok, atau punya channel debit + kecepatan. */
    isFlowMeter(channels: FlowChannelLike[], catalogLabel?: string): boolean {
        if (/tuf|flow|ultrason|debit/.test((catalogLabel || '').toLowerCase())) return true;
        return !!this.findChannel(channels, 'flow') && !!this.findChannel(channels, 'velocity');
    }

    findChannel(channels: FlowChannelLike[], role: ChannelRole): FlowChannelLike | null {
        const re = ROLE_PATTERNS[role];
        return (channels || []).find((channel) => re.test((channel.metric || '').toLowerCase())) || null;
    }

    /** Susun data mentah dari channel-channel satu sensor. */
    build(channels: FlowChannelLike[], updatedAt: string | null): FlowMeterInput {
        const flowCh = this.findChannel(channels, 'flow');
        const velocityCh = this.findChannel(channels, 'velocity');
        const volumeCh = this.findChannel(channels, 'volume');
        const diameterCh = this.findChannel(channels, 'diameter');

        // Channel diameter boleh ada tapi belum pernah terisi (belum dipetakan /
        // alat belum kirim register-nya) — nilai 0 berarti tidak ada, bukan nol.
        const deviceDiameter = diameterCh ? this.toMillimeters(diameterCh.latest, diameterCh.unit) : null;
        const hasDeviceDiameter = deviceDiameter !== null && deviceDiameter > 0;

        return {
            diameterMm: hasDeviceDiameter ? deviceDiameter : null,
            diameterSource: hasDeviceDiameter ? 'device' : null,
            flowLps: flowCh ? this.toLitersPerSecond(flowCh.latest, flowCh.unit) : null,
            velocityMs: velocityCh ? this.finite(velocityCh.latest) : null,
            volumeM3: volumeCh ? this.finite(volumeCh.latest) : null,
            volumeUnit: (volumeCh?.unit || '').trim().toLowerCase() === 'l' ? 'L' : 'm³',
            updatedAt
        };
    }

    /** Turunkan besaran yang hilang + cek silang debit vs kecepatan. */
    describe(input: FlowMeterInput | null): FlowMeterView {
        const view: FlowMeterView = {
            diameter: { value: null, source: null },
            flow: { value: null, source: null },
            velocity: { value: null, source: null },
            volume: null,
            volumeUnit: 'm³',
            areaM2: null,
            deviationPct: null,
            crossCheck: 'unknown',
            hasFlowMovement: false,
            updatedAt: null
        };
        if (!input) return view;

        view.volume = input.volumeM3;
        view.volumeUnit = input.volumeUnit || 'm³';
        view.updatedAt = input.updatedAt || null;

        const diameter = this.positive(input.diameterMm);
        if (diameter !== null) {
            view.diameter = { value: diameter, source: input.diameterSource || 'context' };
            const radiusM = diameter / 1000 / 2;
            view.areaM2 = Math.PI * radiusM * radiusM;
        }

        const measuredFlow = this.finite(input.flowLps);
        const measuredVelocity = this.finite(input.velocityMs);
        if (measuredFlow !== null) view.flow = { value: measuredFlow, source: 'measured' };
        if (measuredVelocity !== null) view.velocity = { value: measuredVelocity, source: 'measured' };

        // Lengkapi besaran yang hilang: Q = V x A (m3/s) -> l/s
        if (view.areaM2 !== null) {
            if (view.flow.value === null && measuredVelocity !== null) {
                view.flow = { value: measuredVelocity * view.areaM2 * 1000, source: 'computed' };
            }
            if (view.velocity.value === null && measuredFlow !== null) {
                view.velocity = { value: measuredFlow / 1000 / view.areaM2, source: 'computed' };
            }
        }

        view.hasFlowMovement = (view.flow.value ?? 0) > 0 || (view.velocity.value ?? 0) > 0;

        // Cek silang hanya bila keduanya benar-benar terukur dan ada aliran
        if (view.areaM2 === null || measuredFlow === null || measuredVelocity === null) return view;
        if (!view.hasFlowMovement) { view.crossCheck = 'idle'; return view; }

        const calcLps = measuredVelocity * view.areaM2 * 1000;
        if (calcLps <= 0) return view;

        view.deviationPct = ((measuredFlow - calcLps) / calcLps) * 100;
        const abs = Math.abs(view.deviationPct);
        view.crossCheck = abs <= 5 ? 'ok' : abs <= 15 ? 'warning' : 'critical';
        return view;
    }

    /** Diameter pipa dari release context instalasi yang sedang berlaku (mm). */
    diameterFromContext(idSensor: string): Observable<number | null> {
        return this.sensorContextService.sensorContextReleasesList$Response({ id: idSensor }).pipe(
            map((res: any) => {
                let body: any = res.body;
                if (typeof body === 'string') {
                    try { body = JSON.parse(body); } catch { body = null; }
                }
                const releases: any[] = (body?.data || body || []) as any[];
                const params = this.activeContextParams(releases);
                return params ? this.diameterFromParams(params) : null;
            }),
            catchError(() => of(null))
        );
    }

    /** Normalisasi debit ke l/s dari satuan yang lazim dipakai flow meter. */
    toLitersPerSecond(value: number | null | undefined, unit: string): number | null {
        const v = this.finite(value);
        if (v === null) return null;
        const u = (unit || '').toLowerCase().replace('³', '3').replace(/\s/g, '');
        if (u === 'm3/h' || u === 'm3/jam' || u === 'm3h') return v / 3.6;
        if (u === 'm3/s') return v * 1000;
        if (u === 'l/min' || u === 'lpm') return v / 60;
        if (u === 'l/h' || u === 'l/jam') return v / 3600;
        return v; // l/s (default)
    }

    toMillimeters(value: number | null | undefined, unit: string): number | null {
        const v = this.finite(value);
        if (v === null) return null;
        const u = (unit || '').toLowerCase().trim();
        if (u === 'm') return v * 1000;
        if (u === 'cm') return v * 10;
        if (u === 'inch' || u === 'in' || u === '"') return v * 25.4;
        return v; // mm (default)
    }

    private activeContextParams(releases: any[]): Record<string, any> | null {
        if (!Array.isArray(releases) || !releases.length) return null;
        const now = Date.now();
        const started = releases
            .filter((r) => !r?.effectiveFrom || new Date(r.effectiveFrom).getTime() <= now)
            .sort((a, b) => new Date(b.effectiveFrom || 0).getTime() - new Date(a.effectiveFrom || 0).getTime());
        const active = started.find((r) => !r.effectiveTo || new Date(r.effectiveTo).getTime() > now) || started[0];
        return active?.params || null;
    }

    private diameterFromParams(params: Record<string, any>): number | null {
        const inner = this.positive(this.toNumber(params['inner_diameter_mm']));
        if (inner !== null) return inner;
        const dn = this.positive(this.toNumber(params['pipe_diameter_dn']));
        if (dn !== null) return dn;
        const inch = this.positive(this.toNumber(params['pipe_diameter_inch']));
        return inch !== null ? inch * 25.4 : null;
    }

    private toNumber(raw: any): number | null {
        if (raw === null || raw === undefined || raw === '') return null;
        return typeof raw === 'number' ? raw : parseFloat(String(raw));
    }

    private finite(value: number | null | undefined): number | null {
        return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
    }

    private positive(value: number | null | undefined): number | null {
        const v = this.finite(value);
        return v !== null && v > 0 ? v : null;
    }
}
