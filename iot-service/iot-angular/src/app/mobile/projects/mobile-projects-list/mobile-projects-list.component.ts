import { Component, OnDestroy, OnInit } from '@angular/core';
import { merge, Observable, of, Subject } from 'rxjs';
import { catchError, map, skip, switchMap, take, takeUntil } from 'rxjs/operators';
import { AutoRefreshService } from '@services/auto-refresh.service';
import { timeAgoId } from '@app/shared/utils/channel-display';
import { MobileProject, MobileScopeService } from '../../shared/mobile-scope.service';
import { RefreshBusService } from '../../shared/refresh-bus.service';
import { clockText, mErrorText, mobilePoll$, MTone } from '../../shared/labels';

interface ProjectVM {
  id: string; name: string; area: string; owner: string;
  status: MTone; statusLabel: string;
  nodes: number; online: number; notOnline: number; lastSync: string;
}

/**
 * Daftar project (user >1 project; user 1 project langsung masuk project lewat landing guard).
 * Sumber = cache MobileScopeService (request yang sama dengan landing guard). Project yang punya
 * perangkat tidak online diurutkan paling atas.
 */
@Component({
  selector: 'mobile-projects-list',
  templateUrl: './mobile-projects-list.component.html',
  standalone: false
})
export class MobileProjectsListComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  refreshError: string | null = null;
  updated = '';
  projects: ProjectVM[] = [];
  search = '';

  all: ProjectVM[] = [];
  private reload$ = new Subject<void>();
  private done$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private offRefresh?: () => void;

  constructor(
    private scope: MobileScopeService,
    private auto: AutoRefreshService,
    private refreshBus: RefreshBusService
  ) {}

  ngOnInit(): void {
    // emit pertama = cache (tanpa request ulang bila guard baru memuatnya); berikutnya paksa muat ulang
    merge(
      mobilePoll$(this.auto).pipe(take(1), map(() => false)),
      mobilePoll$(this.auto).pipe(skip(1), map(() => true)),
      this.reload$.pipe(map(() => true))
    ).pipe(
      switchMap((force) => this.load$(force)),
      takeUntil(this.destroy$)
    ).subscribe((r) => {
      this.loading = false;
      if (r.err) {
        if (this.all.length) { this.refreshError = r.err; } else { this.error = r.err; }
      } else {
        this.error = null; this.refreshError = null;
        this.updated = clockText(new Date());
        this.all = (r.list || []).map((p) => this.toVM(p))
          .sort((a, b) => (b.notOnline - a.notOnline) || a.name.localeCompare(b.name, 'id'));
        this.apply();
      }
      this.done$.next();
    });
    this.offRefresh = this.refreshBus.register(() => this.reload());
  }

  onSearch(v: string): void { this.search = v; this.apply(); }

  reload(): Promise<void> {
    const p = new Promise<void>((res) => this.done$.pipe(take(1)).subscribe(() => res()));
    this.reload$.next();
    return p;
  }

  retry(): void { this.loading = !this.all.length; this.reload(); }

  private load$(force: boolean): Observable<{ list: MobileProject[] | null; err: string | null }> {
    return this.scope.projects$(force).pipe(
      take(1),
      map((list) => ({ list, err: null as string | null })),
      catchError((e) => of({ list: null, err: mErrorText(e, 'project') }))
    );
  }

  private apply(): void {
    const t = this.search.trim().toLowerCase();
    this.projects = t ? this.all.filter((p) => `${p.name} ${p.area} ${p.owner}`.toLowerCase().includes(t)) : this.all;
  }

  private toVM(p: MobileProject): ProjectVM {
    const notOnline = Math.max(0, p.nodes - p.online);
    let status: MTone = 'off';
    let statusLabel = 'Belum ada perangkat';
    if (p.nodes > 0) {
      status = notOnline === 0 ? 'ok' : notOnline === p.nodes ? 'danger' : 'warn';
      statusLabel = notOnline === 0 ? 'Semua online' : `${notOnline} tidak online`;
    }
    return {
      id: p.id, name: p.name, area: p.areaType, owner: p.ownerName,
      status, statusLabel, nodes: p.nodes, online: p.online, notOnline,
      lastSync: p.lastSync ? timeAgoId(p.lastSync) : ''
    };
  }

  ngOnDestroy(): void { this.offRefresh?.(); this.destroy$.next(); this.destroy$.complete(); }
}
