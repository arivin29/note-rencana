import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';

export interface ChromeTitle { title: string; sub: string; }
export type TitleLevel = 'project' | 'page';

/**
 * Chrome AppBar mobile:
 *  - Judul dinamis: shell project mengisi level 'project' (nama project), halaman detail mengisi
 *    'page' (mis. alamat perangkat). Yang terdalam menang; fallback = `data.title` route.
 *  - Riwayat navigasi DI DALAM aplikasi, supaya tombol back hanya memakai `location.back()` bila
 *    halaman sebelumnya memang halaman aplikasi ini (bukan tautan luar / refresh).
 */
@Injectable({ providedIn: 'root' })
export class MobileChromeService {
  private readonly levels: Record<TitleLevel, ChromeTitle | null> = { project: null, page: null };
  private readonly _title$ = new BehaviorSubject<ChromeTitle | null>(null);
  readonly title$: Observable<ChromeTitle | null> = this._title$.asObservable();

  private stack: string[] = [];

  constructor(router: Router) {
    router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      const nav = router.lastSuccessfulNavigation;
      const url = e.urlAfterRedirects;
      if (nav?.trigger === 'popstate') {
        // back (atau forward): buang entri sampai url ini, kalau ada
        const i = this.stack.lastIndexOf(url);
        if (i >= 0) { this.stack = this.stack.slice(0, i + 1); } else { this.stack = [url]; }
      } else if (nav?.extras?.replaceUrl && this.stack.length) {
        this.stack[this.stack.length - 1] = url;
      } else {
        this.stack.push(url);
      }
      if (this.stack.length > 50) { this.stack = this.stack.slice(-50); }
    });
  }

  /** Ada halaman aplikasi (mobile, bukan login) tepat sebelum halaman ini di history. */
  get canGoBackInApp(): boolean {
    const prev = this.stack[this.stack.length - 2];
    return !!prev && prev.startsWith('/mobile') && !prev.startsWith('/mobile/login');
  }

  setTitle(level: TitleLevel, title: string, sub = ''): void {
    this.levels[level] = { title, sub };
    this.emit();
  }

  clearTitle(level: TitleLevel): void {
    this.levels[level] = null;
    this.emit();
  }

  private emit(): void {
    this._title$.next(this.levels.page || this.levels.project);
  }
}
