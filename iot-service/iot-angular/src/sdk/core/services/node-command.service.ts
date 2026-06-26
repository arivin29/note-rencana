/* tslint:disable */
/* eslint-disable */
/* Hand-added (regen blocked). Device command send-history + send (MQTT publish / SMS log). */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';
import { RequestBuilder } from '../request-builder';

@Injectable({ providedIn: 'root' })
export class NodeCommandService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  private send(rb: RequestBuilder, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    return this.http.request(rb.build({ responseType: 'json', accept: 'application/json', context })).pipe(
      filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
      map((r: HttpResponse<any>) => r as StrictHttpResponse<any>)
    );
  }

  /** GET /api/nodes/{id}/command-log */
  commandLogList$Response(params: { id: string }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/nodes/{id}/command-log', 'get');
    rb.path('id', params.id, {});
    return this.send(rb, context);
  }

  /** POST /api/nodes/{id}/commands/send */
  commandSend$Response(params: { id: string; body: any }, context?: HttpContext): Observable<StrictHttpResponse<any>> {
    const rb = new RequestBuilder(this.rootUrl, '/api/nodes/{id}/commands/send', 'post');
    rb.path('id', params.id, {});
    rb.body(params.body, 'application/json');
    return this.send(rb, context);
  }
}
