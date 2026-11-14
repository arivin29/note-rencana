import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, tap } from 'rxjs/operators';
import { ProjectsService } from '@sdk/core/services/projects.service';
import { AuthService } from '@services/auth.service';
import { fetchAll } from '@app/shared/utils/fetch-all';
import { cleanTs } from './util';

export interface MobileProject {
  id: string;
  name: string;
  areaType: string;
  status: string;
  ownerName: string;
  nodes: number;
  /** `stats.online` dari /projects (flag konektivitas backend, bukan aturan freshness) */
  online: number;
  lastSync: string | null;
}

/** Kunci localStorage lama dari ProjectContextService (chip project, sudah dihapus dari mobile). */
export const LEGACY_ACTIVE_PROJECT_KEY = 'devetek.activeProject';

/**
 * Daftar project milik user, diambil SEKALI (`/api/projects?page=1&limit=100`, fetchAll bila >100)
 * dan dibagi oleh landing guard, daftar project dan AppBar. Cache dibuang saat user berganti
 * (logout/login akun lain) dan saat `refresh()`.
 */
@Injectable({ providedIn: 'root' })
export class MobileScopeService {
  private cache$: Observable<MobileProject[]> | null = null;
  private readonly _count$ = new BehaviorSubject<number | null>(null);
  /** jumlah project terakhir yang diketahui (null = belum dimuat) */
  readonly count$ = this._count$.asObservable();
  private last: MobileProject[] | null = null;

  constructor(private projectsSvc: ProjectsService, auth: AuthService) {
    try { localStorage.removeItem(LEGACY_ACTIVE_PROJECT_KEY); } catch { /* ignore */ }
    auth.currentUser$
      .pipe(map((u: any) => (u ? `${u.idUser || ''}|${u.email || ''}` : '')), distinctUntilChanged())
      .subscribe(() => this.clear());
  }

  get count(): number | null { return this._count$.value; }
  get lastKnown(): MobileProject[] | null { return this.last; }

  projects$(force = false): Observable<MobileProject[]> {
    if (!this.cache$ || force) {
      this.cache$ = fetchAll((p) => this.projectsSvc.projectsControllerFindAll$Response(p)).pipe(
        map((rows) => rows.map((p) => this.toProject(p))),
        tap((list) => { this.last = list; this._count$.next(list.length); }),
        catchError((err) => { this.cache$ = null; return throwError(() => err); }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.cache$;
  }

  /** Nama project dari cache (tanpa request). */
  findCached(id: string): MobileProject | null {
    return (this.last || []).find((p) => p.id === id) || null;
  }

  /** Untuk guard: jumlah project, null bila gagal (guard tidak boleh memblokir login). */
  projectsOrNull$(): Observable<MobileProject[] | null> {
    return this.projects$().pipe(catchError(() => of(null)));
  }

  clear(): void {
    this.cache$ = null;
    this.last = null;
    this._count$.next(null);
  }

  private toProject(p: any): MobileProject {
    const st = p?.stats || p?.metrics || {};
    return {
      id: p.idProject || p.id,
      name: p.name || '(tanpa nama)',
      areaType: p.areaType || '',
      status: p.status || '',
      ownerName: p.owner?.name || '',
      nodes: Number(st.nodes ?? st.totalNodes ?? 0) || 0,
      // F5: API mengirim `stats.online`; `activeNodes` hanya ada di /detailed
      online: Number(st.online ?? st.activeNodes ?? 0) || 0,
      lastSync: cleanTs(p.lastSync) || null
    };
  }
}
