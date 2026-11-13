import { Injectable, NgZone } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AppSettings } from './app-settings.service';

/**
 * "Layar Penuh" (immersive) state shared by the app shell, the project workspace and dashboards.
 *
 * enter(): hides app header + app sidebar (AppSettings), adds `body.wb-immersive` (global CSS in
 * src/scss/_immersive.scss hides the project-workspace sidebar/toolbar and removes content padding)
 * and asks the browser for real fullscreen. exit() restores everything.
 *
 * Exits automatically when the browser leaves fullscreen (Esc) or when the user navigates away,
 * so the app can never get stuck without its menus.
 */
@Injectable({ providedIn: 'root' })
export class LayoutStateService {
  readonly immersive$ = new BehaviorSubject<boolean>(false);

  private saved: { header: boolean; sidebar: boolean } | null = null;

  constructor(private appSettings: AppSettings, private router: Router, private zone: NgZone) {
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.immersive) {
        this.zone.run(() => this.exit());
      }
    });
    this.router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(() => {
        if (this.immersive) this.exit();
      });
  }

  get immersive(): boolean {
    return this.immersive$.value;
  }

  enter(): void {
    if (this.immersive) return;
    this.saved = { header: this.appSettings.appHeaderNone, sidebar: this.appSettings.appSidebarNone };
    this.appSettings.appHeaderNone = true;
    this.appSettings.appSidebarNone = true;
    document.body.classList.add('wb-immersive');
    this.immersive$.next(true);
    const el = document.documentElement as any;
    if (!document.fullscreenElement && el.requestFullscreen) {
      // Browsers may refuse (no user gesture, iframe policy) — stay immersive without it.
      el.requestFullscreen().catch(() => undefined);
    }
  }

  exit(): void {
    if (!this.immersive) return;
    this.appSettings.appHeaderNone = this.saved?.header ?? false;
    this.appSettings.appSidebarNone = this.saved?.sidebar ?? false;
    this.saved = null;
    document.body.classList.remove('wb-immersive');
    this.immersive$.next(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  toggle(): void {
    this.immersive ? this.exit() : this.enter();
  }
}
