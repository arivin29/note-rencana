import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/** API caps `limit` at 100 for list endpoints. */
export const API_MAX_LIMIT = 100;

/** SDK `$Response` bodies are sometimes JSON strings — normalise. */
export function parseBody(body: any): any {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return null; }
  }
  return body;
}

/** `{ data: [...] }` or a bare array → array. */
export function listOf(body: any): any[] {
  const items = body?.data ?? body ?? [];
  return Array.isArray(items) ? items : [];
}

/** Total from the contract (`meta.total`) or the flat `total` some endpoints still return. */
export function totalOf(body: any): number | null {
  const t = body?.meta?.total ?? body?.total;
  return t === undefined || t === null ? null : Number(t);
}

/**
 * Load EVERY page of a list endpoint so nothing is silently cut at the API max.
 * `request` receives `{ page, limit }` and must return the SDK `$Response` observable.
 * If any page fails the whole observable errors (caller shows an error state).
 * `onFirstBody` receives page 1's parsed body (for response-level fields).
 */
export function fetchAll(
  request: (p: { page: number; limit: number }) => Observable<any>,
  onFirstBody?: (body: any) => void
): Observable<any[]> {
  const limit = API_MAX_LIMIT;
  return request({ page: 1, limit }).pipe(
    switchMap(res => {
      const body = parseBody(res?.body);
      onFirstBody?.(body); // response-level flags, e.g. /sensors `latestAvailable`
      const first = listOf(body);
      const total = totalOf(body) ?? first.length;
      const pages = Math.ceil(total / limit);
      if (pages <= 1) return of(first);
      const rest = Array.from({ length: pages - 1 }, (_, i) =>
        request({ page: i + 2, limit }).pipe(map(r => listOf(parseBody(r?.body)))));
      return forkJoin(rest).pipe(map(more => first.concat(...more)));
    })
  );
}
