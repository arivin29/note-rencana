import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ViewMode = 'auto' | 'desktop' | 'mobile';

/**
 * Menyimpan preferensi tampilan Desktop / Mobile (lihat docs/mobile/02-DESIGN.md §4).
 * 'auto' = ditentukan dari lebar viewport; 'desktop'/'mobile' = pilihan eksplisit user (menang atas auto).
 */
@Injectable({ providedIn: 'root' })
export class ViewModeService {
  private readonly KEY = 'devetek.viewMode';
  private readonly _mode$ = new BehaviorSubject<ViewMode>(this.read());
  readonly mode$: Observable<ViewMode> = this._mode$.asObservable();

  get mode(): ViewMode { return this._mode$.value; }

  set(mode: ViewMode): void {
    localStorage.setItem(this.KEY, mode);
    this._mode$.next(mode);
  }

  /** Mode efektif sekarang: resolve 'auto' berdasarkan viewport. */
  resolveEffective(): 'desktop' | 'mobile' {
    return this.mode === 'auto'
      ? (this.isMobileViewport() ? 'mobile' : 'desktop')
      : this.mode;
  }

  isMobileViewport(): boolean {
    return typeof window !== 'undefined'
      && window.matchMedia('(max-width: 767.98px)').matches;
  }

  private read(): ViewMode {
    const v = localStorage.getItem(this.KEY) as ViewMode | null;
    return v === 'desktop' || v === 'mobile' || v === 'auto' ? v : 'auto';
  }
}
