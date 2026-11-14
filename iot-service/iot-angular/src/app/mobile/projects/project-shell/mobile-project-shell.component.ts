import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil } from 'rxjs/operators';
import { ProjectsService } from '@sdk/core/services/projects.service';
import { parseBody } from '@app/shared/utils/fetch-all';
import { MobileProjectStore } from '../../shared/mobile-project-store.service';
import { MobileScopeService } from '../../shared/mobile-scope.service';
import { MobileChromeService } from '../../shared/mobile-chrome.service';
import { RefreshBusService } from '../../shared/refresh-bus.service';

type TabKey = 'ringkasan' | 'perangkat' | 'channel' | 'peta' | 'peringatan';

/**
 * Shell project `/mobile/p/:pid/**`: menyediakan MobileProjectStore untuk semua tab,
 * mengisi judul AppBar (nama project) dan memasang nav bawah project
 * (Ringkasan · Perangkat · Channel · Peta · Peringatan). Pindah tab = replaceUrl, jadi
 * tombol back Android tidak berputar di antara tab.
 * Tinggi nav yang sebenarnya ditulis ke CSS var `--m-bottomnav-h` di `.m-app`
 * (tab Peta mengukur dirinya dari var ini).
 */
@Component({
  selector: 'mobile-project-shell',
  templateUrl: './mobile-project-shell.component.html',
  providers: [MobileProjectStore],
  standalone: false
})
export class MobileProjectShellComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('nav', { static: true }) navRef!: ElementRef<HTMLElement>;

  readonly tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'ringkasan', label: 'Ringkasan', icon: 'bi-speedometer2' },
    { key: 'perangkat', label: 'Perangkat', icon: 'bi-hdd-stack' },
    { key: 'channel', label: 'Channel', icon: 'bi-broadcast-pin' },
    { key: 'peta', label: 'Peta', icon: 'bi-map' },
    { key: 'peringatan', label: 'Peringatan', icon: 'bi-bell' }
  ];
  pid = '';
  active: TabKey = 'ringkasan';
  alertTotal = 0;
  /** project tidak ada / bukan milik user (403/404) → layar galat, bukan tab */
  notFound = false;

  private ro?: ResizeObserver;
  private appEl: HTMLElement | null = null;
  private offRefresh?: () => void;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: MobileProjectStore,
    private scope: MobileScopeService,
    private chrome: MobileChromeService,
    private projectsSvc: ProjectsService,
    private refreshBus: RefreshBusService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(map((p) => p.get('pid') || ''), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((pid) => {
        this.pid = pid;
        this.notFound = false;
        this.store.setProject(pid);
        this.loadName(pid);
      });
    this.updateActive();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => this.updateActive());
    this.store.state$.pipe(takeUntil(this.destroy$)).subscribe((s) => { this.alertTotal = s.alerts?.total || 0; });
    this.offRefresh = this.refreshBus.register(() => this.store.refresh());
  }

  ngAfterViewInit(): void {
    this.appEl = this.host.nativeElement.closest('.m-app');
    const nav = this.navRef.nativeElement;
    const apply = () => { this.appEl?.style.setProperty('--m-bottomnav-h', `${Math.round(nav.getBoundingClientRect().height)}px`); };
    apply();
    if (typeof ResizeObserver !== 'undefined') { this.ro = new ResizeObserver(apply); this.ro.observe(nav); }
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.appEl?.style.removeProperty('--m-bottomnav-h');
    this.offRefresh?.();
    this.chrome.clearTitle('project');
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateActive(): void {
    const seg = this.router.url.split('?')[0].split('/')[4] || 'ringkasan';
    const map: Record<string, TabKey> = { nodes: 'perangkat', scada: 'ringkasan' };
    this.active = (map[seg] || seg) as TabKey;
  }

  private loadName(pid: string): void {
    const cached = this.scope.findCached(pid);
    if (cached) { this.chrome.setTitle('project', cached.name); return; }
    this.chrome.setTitle('project', 'Project');
    this.scope.projects$().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const p = this.scope.findCached(pid);
        if (p) { this.chrome.setTitle('project', p.name); } else { this.loadNameDirect(pid); }
      },
      error: () => this.loadNameDirect(pid)
    });
  }

  /** Project di luar 100 pertama / cache gagal: ambil langsung. */
  private loadNameDirect(pid: string): void {
    this.projectsSvc.projectsControllerFindOne$Response({ id: pid }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const b = parseBody(res?.body) || {};
        const p = b?.data && !Array.isArray(b.data) ? b.data : b;
        if (p?.name && pid === this.pid) { this.chrome.setTitle('project', p.name); }
      },
      error: (e: any) => {
        // 403/404 → project tidak ada atau bukan akses user; galat lain: judul tetap "Project"
        if ((e?.status === 403 || e?.status === 404) && pid === this.pid) { this.notFound = true; }
      }
    });
  }
}
