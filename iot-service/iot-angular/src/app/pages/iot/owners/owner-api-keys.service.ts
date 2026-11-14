import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { listOf, parseBody } from '@app/shared/utils/fetch-all';
import {
  TenantApiKeyResponse, CreateApiKeyResult, RateLimitPlan
} from '../../../services/tenant-api-keys.service';

export interface OwnerApiKeyCreate {
  label: string;
  description?: string;
  expiresAt?: string | null;
  rateLimitPlan?: RateLimitPlan;
}

/**
 * Tenant API keys managed BY AN ADMIN for a given owner.
 * Backend (`tenantapikey` controller `ownerScope`) requires admin to name the owner:
 * `?ownerId=` on every call (list/update/delete/regenerate) and `ownerId` in the POST body.
 * The shared TenantApiKeysService is for tenants (owner from JWT), so it can't be used here.
 */
@Injectable({ providedIn: 'root' })
export class OwnerApiKeysService {
  private readonly url = `${environment.apiUrl}/api/tenant-api-keys`;

  constructor(private http: HttpClient) {}

  list(ownerId: string): Observable<TenantApiKeyResponse[]> {
    return this.http.get<any>(this.url, { params: { ownerId } }).pipe(map(b => listOf(parseBody(b))));
  }

  create(ownerId: string, dto: OwnerApiKeyCreate): Observable<CreateApiKeyResult> {
    return this.http.post<CreateApiKeyResult>(this.url, { ...dto, ownerId }, { params: { ownerId } });
  }

  setActive(ownerId: string, idApiKey: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.url}/${idApiKey}`, { isActive }, { params: { ownerId } });
  }

  revoke(ownerId: string, idApiKey: string): Observable<any> {
    return this.http.delete(`${this.url}/${idApiKey}`, { params: { ownerId } });
  }

  regenerate(ownerId: string, idApiKey: string): Observable<CreateApiKeyResult> {
    return this.http.post<CreateApiKeyResult>(`${this.url}/${idApiKey}/regenerate`, {}, { params: { ownerId } });
  }
}
