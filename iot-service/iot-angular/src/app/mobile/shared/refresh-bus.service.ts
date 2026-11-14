import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, isObservable, Observable } from 'rxjs';

export type RefreshHandler = () => Promise<unknown> | Observable<unknown> | void;

/**
 * Bus pull-to-refresh. Layar yang bisa dimuat ulang mendaftarkan handler (`register`) dan
 * membatalkan pendaftaran saat hancur. `trigger()` menjalankan semua handler dan resolve
 * SETELAH semuanya selesai (atau 10 dtk), sehingga spinner tarik-untuk-muat-ulang jujur.
 */
@Injectable({ providedIn: 'root' })
export class RefreshBusService {
  private readonly handlers = new Set<RefreshHandler>();
  private static readonly TIMEOUT_MS = 10_000;
  private readonly _count$ = new BehaviorSubject<number>(0);
  /** jumlah handler terdaftar — untuk mengaktifkan gestur tarik (jangan bind getter langsung: NG0100) */
  readonly handlers$: Observable<number> = this._count$.asObservable();

  /** @returns fungsi untuk melepas pendaftaran (panggil di ngOnDestroy) */
  register(h: RefreshHandler): () => void {
    this.handlers.add(h);
    this._count$.next(this.handlers.size);
    return () => { this.handlers.delete(h); this._count$.next(this.handlers.size); };
  }

  get hasHandlers(): boolean { return this.handlers.size > 0; }

  trigger(): Promise<void> {
    const runs = [...this.handlers].map((h) => {
      try {
        const r = h();
        if (isObservable(r)) { return firstValueFrom(r, { defaultValue: undefined }).catch(() => undefined); }
        return Promise.resolve(r).catch(() => undefined);
      } catch { return Promise.resolve(undefined); }
    });
    const timeout = new Promise<void>((res) => setTimeout(res, RefreshBusService.TIMEOUT_MS));
    return Promise.race([Promise.all(runs).then(() => undefined), timeout]);
  }
}
