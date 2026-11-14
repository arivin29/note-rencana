import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Freshness } from '@app/shared/utils/telemetry-freshness';
import { ChannelVerdict, FRESHNESS_LABEL_ID } from '@app/shared/utils/channel-verdict';
import type { AutoRefreshService } from '@services/auto-refresh.service';

/** Glosarium & pemetaan status mobile — satu tempat, jangan buat map lokal di komponen. */

export type MTone = 'ok' | 'warn' | 'danger' | 'off';

/** fresh = hijau, stale = kuning, offline = merah, nodata = abu (sama dengan desktop). */
export const FRESHNESS_TONE: Record<Freshness, MTone> = {
  fresh: 'ok', stale: 'warn', offline: 'danger', nodata: 'off'
};

export { FRESHNESS_LABEL_ID };

/** Warna + teks satu channel. Di luar ambang hanya bila data fresh. */
export function verdictTone(v: ChannelVerdict, latestAvailable = true): { tone: MTone; label: string } {
  if (!latestAvailable) { return { tone: 'off', label: 'Tidak tersedia' }; }
  if (v.isOut) { return { tone: 'danger', label: 'Di luar ambang' }; }
  return { tone: FRESHNESS_TONE[v.freshness], label: FRESHNESS_LABEL_ID[v.freshness] };
}

export type Sev = 'danger' | 'warn' | 'info';

export function severityTone(s: string | null | undefined): Sev {
  const v = (s || '').toLowerCase();
  if (v.includes('crit') || v.includes('high') || v.includes('danger')) { return 'danger'; }
  if (v.includes('warn') || v.includes('med')) { return 'warn'; }
  return 'info';
}

export function severityLabel(s: string | null | undefined): string {
  const v = (s || '').toLowerCase();
  if (v.includes('crit')) { return 'Kritis'; }
  if (v.includes('high')) { return 'Tinggi'; }
  if (v.includes('warn') || v.includes('med')) { return 'Sedang'; }
  if (v.includes('low')) { return 'Rendah'; }
  return 'Info';
}

/** Urutan severity untuk sortir (kecil = lebih penting). */
export function severityRank(s: string | null | undefined): number {
  const v = (s || '').toLowerCase();
  if (v.includes('crit')) { return 0; }
  if (v.includes('high')) { return 1; }
  if (v.includes('warn') || v.includes('med')) { return 2; }
  return 3;
}

export function ruleTypeLabel(t: string | null | undefined): string {
  switch ((t || '').toLowerCase()) {
    case 'node_offline': return 'Perangkat offline';
    case 'threshold': return 'Di luar ambang';
    default: return 'Peringatan';
  }
}

/** Pesan galat berbahasa Indonesia dari HttpErrorResponse (kontrak `{statusCode,message,error}`). */
export function mErrorText(err: any, what = 'data'): string {
  const status = Number(err?.status);
  if (status === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return 'Tidak ada koneksi internet';
  }
  if (status === 401) { return 'Sesi berakhir, silakan masuk lagi'; }
  if (status === 403) { return 'Akses ditolak'; }
  if (status === 404) { return `${capitalize(what)} tidak ditemukan`; }
  if (status >= 500) { return 'Server sedang bermasalah, coba lagi nanti'; }
  return `Gagal memuat ${what}`;
}

function capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/** Interval polling mobile: telemetri tiap 120 dtk, jadi 60 dtk cukup. */
export const MOBILE_POLL_MS = 60_000;

/**
 * Timer polling mobile: emit sekali di awal, lalu tiap 60 dtk SELAMA layar terlihat
 * (pause saat app di background). Auto-reload "Mati" di Profil → hanya emit awal.
 */
export function mobilePoll$(auto: AutoRefreshService, ms: number = MOBILE_POLL_MS): Observable<number> {
  return auto.interval$.pipe(switchMap((v) => (v > 0 ? auto.every(ms) : of(0))));
}

/** "14.05" — jam:menit lokal untuk "Diperbarui …". */
export function clockText(d: Date | null): string {
  if (!d) { return ''; }
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
