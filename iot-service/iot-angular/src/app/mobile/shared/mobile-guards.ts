import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router, UrlMatchResult, UrlSegment } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NodesService } from '@sdk/core/services/nodes.service';
import { parseBody } from '@app/shared/utils/fetch-all';
import { MobileScopeService } from './mobile-scope.service';

/** Redirect yang MENGGANTI entri history — tombol back tidak memantul ke /mobile lagi. */
function replaceTo(router: Router, url: string): RedirectCommand {
  return new RedirectCommand(router.parseUrl(url), { replaceUrl: true });
}

/**
 * Entry `/mobile` (dan alias `/mobile/dashboard`): hitung project.
 *   1 project  → langsung `/mobile/p/:pid/ringkasan`
 *   >1 project → `/mobile/projects` (bermasalah di atas)
 *   0 / gagal  → tetap di sini: MobileHomeComponent menampilkan layar kosong atau galat + Coba lagi
 */
export const mobileLandingGuard: CanActivateFn = (): Observable<boolean | RedirectCommand> => {
  const scope = inject(MobileScopeService);
  const router = inject(Router);
  return scope.projectsOrNull$().pipe(map((list) => {
    if (!list || list.length === 0) { return true; }
    if (list.length === 1) { return replaceTo(router, `/mobile/p/${list[0].id}/ringkasan`); }
    return replaceTo(router, '/mobile/projects');
  }));
};

/** `/mobile/nodes` lama (tanpa project): 1 project → tab Perangkat; selain itu daftar project. */
export const legacyNodesListGuard: CanActivateFn = (): Observable<RedirectCommand> => {
  const scope = inject(MobileScopeService);
  const router = inject(Router);
  return scope.projectsOrNull$().pipe(map((list) =>
    list && list.length === 1
      ? replaceTo(router, `/mobile/p/${list[0].id}/perangkat`)
      : replaceTo(router, list && list.length > 1 ? '/mobile/projects' : '/mobile')));
};

/** `/mobile/alerts`: 1 project → tab Peringatan project; >1 → layar peringatan lintas project. */
export const alertsEntryGuard: CanActivateFn = (): Observable<boolean | RedirectCommand> => {
  const scope = inject(MobileScopeService);
  const router = inject(Router);
  return scope.projectsOrNull$().pipe(map((list) =>
    list && list.length === 1 ? replaceTo(router, `/mobile/p/${list[0].id}/peringatan`) : true));
};

/** Cocokkan `/mobile/nodes/:id[/…]` (tautan lama, notifikasi, peta). */
export function legacyNodeMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length >= 2 && segments[0].path === 'nodes') {
    return { consumed: segments, posParams: { id: segments[1] } };
  }
  return null;
}

/** Sisa path lama → segmen baru (info→nilai, command→perintah, logs→log, channels/:cid tetap). */
function mapLegacyNodeRest(rest: string[]): string {
  if (rest[0] === 'channels' && rest[1]) { return `channels/${rest[1]}`; }
  if (rest[0] === 'command') { return 'perintah'; }
  if (rest[0] === 'logs') { return 'log'; }
  return 'nilai';
}

/** Cari project milik node, lalu redirect ke `/mobile/p/:pid/nodes/:nid/…`. */
export const legacyNodeRedirectGuard: CanActivateFn = (route): Observable<RedirectCommand> => {
  const nodesSvc = inject(NodesService);
  const router = inject(Router);
  const segs = route.url.map((s) => s.path);
  const id = segs[1] || '';
  if (!id) { return of(replaceTo(router, '/mobile')); }
  return nodesSvc.nodesControllerFindOne$Response({ id }).pipe(
    map((res: any) => {
      const b = parseBody(res?.body) || {};
      const node = b?.data && !Array.isArray(b.data) ? b.data : b;
      const pid = node?.idProject || node?.project?.idProject;
      const nid = node?.idNode || id;
      return pid
        ? replaceTo(router, `/mobile/p/${pid}/nodes/${nid}/${mapLegacyNodeRest(segs.slice(2))}`)
        : replaceTo(router, '/mobile');
    }),
    catchError(() => of(replaceTo(router, '/mobile')))
  );
};
