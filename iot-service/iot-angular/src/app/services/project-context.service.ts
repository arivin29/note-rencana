import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Project aktif untuk men-scope layar mobile (chip konteks di AppBar).
 * Lihat docs/mobile/05-SCREEN-FLOWS.md §0/§7. idProject null = "Semua Project".
 */
export interface ActiveProject {
  idProject: string | null;   // null = semua project
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  private readonly KEY = 'devetek.activeProject';
  private readonly _active$ = new BehaviorSubject<ActiveProject>(this.read());
  readonly active$: Observable<ActiveProject> = this._active$.asObservable();

  get active(): ActiveProject { return this._active$.value; }

  set(project: ActiveProject): void {
    localStorage.setItem(this.KEY, JSON.stringify(project));
    this._active$.next(project);
  }

  clear(): void {
    const all: ActiveProject = { idProject: null, name: 'Semua Project' };
    this.set(all);
  }

  private read(): ActiveProject {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const p = JSON.parse(raw) as ActiveProject;
        if (p && typeof p.name === 'string') return p;
      }
    } catch { /* ignore */ }
    return { idProject: null, name: 'Semua Project' };
  }
}
