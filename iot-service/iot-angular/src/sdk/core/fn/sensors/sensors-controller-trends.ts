/* tslint:disable */
/* eslint-disable */
/* Added by hand (ng-openapi-gen regen is broken) — mirrors the generated pattern. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

export interface SensorsControllerTrends$Params {
  /** Project UUID. Optional: without it the scope is the caller's owner (tenant) or ownerId / all projects (admin). */
  idProject?: string;
  /** Admin only: limit to one owner (ignored for tenants) */
  ownerId?: string;
  /** Hours back incl. the current hour (default 24, max 48) */
  hours?: number;
}

/** GET /api/sensors/trends — hourly avg/min/max per channel for a whole project (one call). */
export function sensorsControllerTrends(http: HttpClient, rootUrl: string, params: SensorsControllerTrends$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
  const rb = new RequestBuilder(rootUrl, sensorsControllerTrends.PATH, 'get');
  if (params) {
    rb.query('idProject', params.idProject, {});
    rb.query('ownerId', params.ownerId, {});
    rb.query('hours', params.hours, {});
  }

  return http.request(
    rb.build({ responseType: 'text', accept: '*/*', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return (r as HttpResponse<any>).clone({ body: undefined }) as StrictHttpResponse<void>;
    })
  );
}

sensorsControllerTrends.PATH = '/api/sensors/trends';
