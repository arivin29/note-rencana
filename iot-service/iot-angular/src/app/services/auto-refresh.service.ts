import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/** Pilihan interval auto-reload (ms). 0 = Mati. */
export type RefreshInterval = 0 | 10000 | 15000 | 30000 | 60000;

export const REFRESH_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 0,     label: 'Mati' },
  { value: 10000, label: '10 detik' },
  { value: 15000, label: '15 detik' },
  { value: 30000, label: '30 detik' },
  { value: 60000, label: '60 detik' },
];

/**
 * Auto-reload terpusat (docs/mobile/06-OPEN-ITEMS.md A1).
 *
 * `every(ms)` — timer dasar: emit langsung sekali, lalu tiap ms SELAMA tab visible;
 * pause saat tab/app di background, resume + emit saat kembali aktif.
 *
 * `everyDefault()` — pakai interval pilihan user (tersimpan di localStorage, dibagi
 * semua halaman). Saat user mengubah interval di Profil, stream otomatis re-subscribe
 * ke timer baru; bila interval = 0 (Mati), stream berhenti emit.
 */
@Injectable({ providedIn: 'root' })
export class AutoRefreshService {
  private readonly KEY = 'devetek.refreshInterval';
  private readonly _interval$ = new BehaviorSubject<RefreshInterval>(this.read());
  readonly interval$: Observable<RefreshInterval> = this._interval$.asObservable();

  get interval(): RefreshInterval { return this._interval$.value; }

  setInterval(ms: RefreshInterval): void {
    localStorage.setItem(this.KEY, String(ms));
    this._interval$.next(ms);
  }

  /** Timer dasar dengan interval eksplisit (tetap dipakai bila perlu nilai khusus). */
  every(intervalMs: number): Observable<number> {
    return new Observable<number>((sub) => {
      let n = 0;
      let timer: ReturnType<typeof setInterval> | null = null;

      const emit = () => sub.next(n++);
      const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
      const start = () => {
        stop();
        emit();
        timer = setInterval(() => { if (!document.hidden) { emit(); } }, intervalMs);
      };
      const onVisibility = () => { if (document.hidden) { stop(); } else { start(); } };

      start();
      document.addEventListener('visibilitychange', onVisibility);
      return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
    });
  }

  /**
   * Timer yang mengikuti interval global pilihan user dan ikut berubah secara live.
   * SELALU emit sekali di awal (initial load), lalu polling berkala bila interval > 0.
   * Saat interval = 0 (Mati) hanya emit awal, tanpa polling berkala.
   */
  everyDefault(): Observable<number> {
    return this._interval$.pipe(
      switchMap((ms) => ms > 0 ? this.every(ms) : of(0))
    );
  }

  private read(): RefreshInterval {
    const v = Number(localStorage.getItem(this.KEY));
    return ([0, 10000, 15000, 30000, 60000] as number[]).includes(v)
      ? (v as RefreshInterval)
      : 30000; // default 30s
  }
}
