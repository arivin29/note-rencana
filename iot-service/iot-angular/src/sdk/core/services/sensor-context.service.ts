/* tslint:disable */
/* eslint-disable */
/* Hand-added (ng-openapi-gen full regen blocked by X-API-Key). Mirrors the generated
   RequestBuilder machinery. Endpoints: installation-context master fields + per-sensor releases. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';
import { RequestBuilder } from '../request-builder';

@Injectable({ providedIn: 'root' })
export class SensorContextService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  private send(rb: RequestBuilder, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    return this.http.request(rb.build({ responseType: 'json', accept: 'application/json', context })).pipe(
      filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => r as StrictHttpResponse<any>)
    );
  }

  // ----- installation profiles (master) -----

  /** GET /api/installation-profiles */
  profilesList$Response(context?: HttpContext): Observable<StrictHttpResponse<any>> {
    return this.send(new RequestBuilder(this.rootUrl, '/api/installation-profiles', 'get'), context);
  }

  /** GET /api/installation-profiles/{id}/fields */
  profileFieldsList$Response(params: { id: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/installation-profiles/{id}/fields', 'get');
    rb.path('id', params.id, {});
    return this.send(rb, context);
  }

  /** POST /api/installation-profiles/{id}/fields */
  profileFieldCreate$Response(params: { id: string; body: any }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/installation-profiles/{id}/fields', 'post');
    rb.path('id', params.id, {});
    rb.body(params.body, 'application/json');
    return this.send(rb, context);
  }

  /** PATCH /api/installation-profile-fields/{id} */
  profileFieldUpdate$Response(params: { id: string; body: any }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/installation-profile-fields/{id}', 'patch');
    rb.path('id', params.id, {});
    rb.body(params.body, 'application/json');
    return this.send(rb, context);
  }

  /** DELETE /api/installation-profile-fields/{id} */
  profileFieldDelete$Response(params: { id: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/installation-profile-fields/{id}', 'delete');
    rb.path('id', params.id, {});
    return this.send(rb, context);
  }

  /** GET /api/sensor-type-profiles */
  sensorTypeProfilesList$Response(context?: HttpContext): Observable<StrictHttpResponse<any>> {
    return this.send(new RequestBuilder(this.rootUrl, '/api/sensor-type-profiles', 'get'), context);
  }

  /** PUT /api/sensor-types/{id}/profile  body: { idProfile } */
  setSensorTypeProfile$Response(params: { id: string; body: any }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensor-types/{id}/profile', 'put');
    rb.path('id', params.id, {});
    rb.body(params.body, 'application/json');
    return this.send(rb, context);
  }

  // ----- per-sensor profile assignment -----

  /** GET /api/sensors/{id}/profile */
  sensorProfileGet$Response(params: { id: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensors/{id}/profile', 'get');
    rb.path('id', params.id, {});
    return this.send(rb, context);
  }

  /** PUT /api/sensors/{id}/profile  body: { idProfile } */
  sensorProfileSet$Response(params: { id: string; body: any }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensors/{id}/profile', 'put');
    rb.path('id', params.id, {});
    rb.body(params.body, 'application/json');
    return this.send(rb, context);
  }

  // ----- per-sensor installation context -----

  /** GET /api/sensors/{id}/context-fields — fields applicable to the sensor (grouped by profile) */
  sensorContextFields$Response(params: { id: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensors/{id}/context-fields', 'get');
    rb.path('id', params.id, {});
    return this.send(rb, context);
  }

  /** GET /api/sensors/{id}/context-releases */
  sensorContextReleasesList$Response(params: { id: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensors/{id}/context-releases', 'get');
    rb.path('id', params.id, {});
    return this.send(rb, context);
  }

  /** POST /api/sensors/{id}/context-releases */
  sensorContextReleaseCreate$Response(params: { id: string; body: any }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensors/{id}/context-releases', 'post');
    rb.path('id', params.id, {});
    rb.body(params.body, 'application/json');
    return this.send(rb, context);
  }

  /** PATCH /api/sensor-context-releases/{id} */
  sensorContextReleaseUpdate$Response(params: { id: string; body: any }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensor-context-releases/{id}', 'patch');
    rb.path('id', params.id, {});
    rb.body(params.body, 'application/json');
    return this.send(rb, context);
  }

  /** DELETE /api/sensor-context-releases/{id} */
  sensorContextReleaseDelete$Response(params: { id: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/sensor-context-releases/{id}', 'delete');
    rb.path('id', params.id, {});
    return this.send(rb, context);
  }

  /** GET /api/nodes/{id}/context-export — node telemetry CSV enriched with as-of installation params (body = CSV text) */
  exportNode$Response(params: { id: string; startTime?: string; endTime?: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/nodes/{id}/context-export', 'get');
    rb.path('id', params.id, {});
    if (params.startTime) rb.query('startTime', params.startTime, {});
    if (params.endTime) rb.query('endTime', params.endTime, {});
    return this.http.request(rb.build({ responseType: 'text', accept: 'text/csv', context })).pipe(
      filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => r as StrictHttpResponse<any>)
    );
  }
}
