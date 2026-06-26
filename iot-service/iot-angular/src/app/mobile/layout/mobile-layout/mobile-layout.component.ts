import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AppSettings } from '../../../service/app-settings.service';
import { RefreshBusService } from '../../shared/refresh-bus.service';

/**
 * Shell mobile (docs/mobile/02-DESIGN.md §3).
 * Mematikan chrome desktop via AppSettings saat aktif, WAJIB restore di ngOnDestroy.
 */
@Component({
  selector: 'mobile-layout',
  templateUrl: './mobile-layout.component.html',
  standalone: false
})
export class MobileLayoutComponent implements OnInit, OnDestroy {
  title = '';
  showBack = false;

  private prev = {
    header: false, sidebar: false, topNav: false,
    fullW: false, fullH: false, contentClass: ''
  };
  private destroy$ = new Subject<void>();

  constructor(
    public appSettings: AppSettings,
    private router: Router,
    private route: ActivatedRoute,
    private refreshBus: RefreshBusService
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
    this.updateTitle();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => this.updateTitle());
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

  onPull(): void { this.refreshBus.trigger(); }

  private updateTitle(): void {
    // Akumulasi dari seluruh chain: judul = paling dalam yg terisi, back = ada salah satu true.
    let r: ActivatedRoute | null = this.route;
    let title = '';
    let back = false;
    while (r) {
      const d = r.snapshot.data;
      if (d['title']) { title = d['title'] as string; }
      if (d['back']) { back = true; }
      r = r.firstChild;
    }
    this.title = title;
    this.showBack = back;
  }
}
