import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { asapScheduler, filter, observeOn, Subject, takeUntil } from 'rxjs';
import { AppSettings } from '../../../service/app-settings.service';
import { RefreshBusService } from '../../shared/refresh-bus.service';
import { MobileChromeService } from '../../shared/mobile-chrome.service';
import { MobileScopeService } from '../../shared/mobile-scope.service';

export type MobileNavMode = 'global' | 'none' | 'project';

/**
 * Shell mobile (docs/mobile/02-DESIGN.md §3).
 * Mematikan chrome desktop via AppSettings saat aktif, WAJIB restore di ngOnDestroy.
 *
 * Data route yang dibaca (paling dalam menang):
 *  - `title`        judul AppBar cadangan (judul dinamis dari MobileChromeService menang)
 *  - `nav`          'global' = nav bawah global · 'project' = nav milik shell project · 'none'
 *  - `parent`       tujuan back hierarkis, boleh berisi `:pid` / `:nid`
 *  - `backIfMulti`  back hanya tampil bila user punya >1 project (root project untuk 1 project)
 */
@Component({
  selector: 'mobile-layout',
  templateUrl: './mobile-layout.component.html',
  styleUrls: ['../../shared/mobile-ia.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class MobileLayoutComponent implements OnInit, OnDestroy {
  title = '';
  sub = '';
  showBack = false;
  nav: MobileNavMode = 'global';
  onProfile = false;
  /** gestur tarik aktif bila ada layar yang mendaftar muat ulang (ditunda: anak mendaftar saat init) */
  pullEnabled = false;

  readonly pullHandler = () => this.refreshBus.trigger();

  private routeTitle = '';
  private dynTitle: { title: string; sub: string } | null = null;
  private parentUrl: string | null = null;
  private backIfMulti = false;

  private prev = {
    header: false, sidebar: false, topNav: false,
    fullW: false, fullH: false, contentClass: ''
  };
  private destroy$ = new Subject<void>();

  constructor(
    public appSettings: AppSettings,
    private router: Router,
    private route: ActivatedRoute,
    private refreshBus: RefreshBusService,
    private chrome: MobileChromeService,
    private scope: MobileScopeService,
    private location: Location
  ) {
    // Set di constructor (bukan ngOnInit) agar tidak memicu NG0100 di AppComponent.
    this.prev = {
      header: this.appSettings.appHeaderNone,
      sidebar: this.appSettings.appSidebarNone,
      topNav: this.appSettings.appTopNav,
      fullW: this.appSettings.appContentFullWidth,
      fullH: this.appSettings.appContentFullHeight,
      contentClass: this.appSettings.appContentClass
    };
    this.appSettings.appHeaderNone = true;
    this.appSettings.appSidebarNone = true;
    this.appSettings.appTopNav = false;
    this.appSettings.appContentFullWidth = true;
    this.appSettings.appContentFullHeight = true;
    this.appSettings.appContentClass = 'p-0';
  }

  ngOnInit(): void {
    this.readRoute();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => this.readRoute());
    // asap: judul diset oleh komponen anak saat init → hindari NG0100
    this.chrome.title$.pipe(observeOn(asapScheduler), takeUntil(this.destroy$)).subscribe((t) => {
      this.dynTitle = t;
      this.applyTitle();
    });
    this.scope.count$.pipe(observeOn(asapScheduler), takeUntil(this.destroy$)).subscribe(() => this.applyBack());
    this.refreshBus.handlers$.pipe(observeOn(asapScheduler), takeUntil(this.destroy$))
      .subscribe((n) => { this.pullEnabled = n > 0; });
  }

  ngOnDestroy(): void {
    this.appSettings.appHeaderNone = this.prev.header;
    this.appSettings.appSidebarNone = this.prev.sidebar;
    this.appSettings.appTopNav = this.prev.topNav;
    this.appSettings.appContentFullWidth = this.prev.fullW;
    this.appSettings.appContentFullHeight = this.prev.fullH;
    this.appSettings.appContentClass = this.prev.contentClass;
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Back = naik hierarki. `location.back()` hanya bila halaman sebelumnya di dalam aplikasi. */
  back(): void {
    if (this.chrome.canGoBackInApp) { this.location.back(); return; }
    this.router.navigateByUrl(this.parentUrl || '/mobile', { replaceUrl: true });
  }

  private readRoute(): void {
    let r: ActivatedRoute | null = this.route;
    let title = '';
    let nav: MobileNavMode = 'global';
    let parent: string | null = null;
    let backIfMulti = false;
    const params: Record<string, string> = {};
    while (r) {
      const d = r.snapshot.data;
      Object.assign(params, r.snapshot.params);
      if (d['title'] !== undefined) { title = d['title'] as string; }
      if (d['nav']) { nav = d['nav'] as MobileNavMode; }
      if (d['parent'] !== undefined) { parent = d['parent'] as string | null; backIfMulti = !!d['backIfMulti']; }
      r = r.firstChild;
    }
    this.routeTitle = title;
    this.nav = nav;
    this.parentUrl = parent ? parent.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k] || '')) : null;
    this.backIfMulti = backIfMulti;
    this.onProfile = this.router.url.startsWith('/mobile/profile');
    this.applyBack();
    this.applyTitle();
  }

  private applyBack(): void {
    const count = this.scope.count;
    this.showBack = !!this.parentUrl && (!this.backIfMulti || (count !== null && count > 1));
  }

  private applyTitle(): void {
    // Judul dinamis hanya berlaku di dalam project (shell/detail yang mengisinya).
    const inProject = this.nav === 'project';
    this.title = (inProject && this.dynTitle?.title) || this.routeTitle;
    this.sub = (inProject && this.dynTitle?.sub) || '';
  }
}
