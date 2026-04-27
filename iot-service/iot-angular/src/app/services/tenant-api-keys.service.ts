import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type RateLimitPlan = 'basic' | 'standard' | 'premium';

export interface TenantApiKeyResponse {
  idApiKey: string;
  label: string;
  description?: string;
  apiKeyPrefix: string;
  rateLimitPlan: RateLimitPlan;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestsToday: number;
  requestsTotal: number;
  ipWhitelist: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyResult {
  success: boolean;
  message: string;
  data: TenantApiKeyResponse & { apiKey: string };
  warning: string;
}

export interface TenantApiKeyListResponse {
  data: TenantApiKeyResponse[];
  total: number;
}

export interface CreateTenantApiKeyRequest {
  label: string;
  description?: string;
  expiresInDays?: number;
  rateLimitPlan?: RateLimitPlan;
  ipWhitelist?: string[];
  idOwner?: string;
}

export interface UpdateTenantApiKeyRequest {
  label?: string;
  description?: string;
  isActive?: boolean;
  ipWhitelist?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TenantApiKeysService {
  private readonly API_URL = `${environment.apiUrl}/api/tenant-api-keys`;

  constructor(private http: HttpClient) {}

  findAll(ownerId?: string): Observable<TenantApiKeyListResponse> {
    const params: any = {};
    if (ownerId) params.ownerId = ownerId;
    return this.http.get<TenantApiKeyListResponse>(this.API_URL, { params });
  }

  findOne(idApiKey: string): Observable<TenantApiKeyResponse> {
    return this.http.get<TenantApiKeyResponse>(`${this.API_URL}/${idApiKey}`);
  }

  create(dto: CreateTenantApiKeyRequest): Observable<CreateApiKeyResult> {
    return this.http.post<CreateApiKeyResult>(this.API_URL, dto);
  }

  update(idApiKey: string, dto: UpdateTenantApiKeyRequest): Observable<{ success: boolean; message: string; data: TenantApiKeyResponse }> {
    return this.http.patch<{ success: boolean; message: string; data: TenantApiKeyResponse }>(`${this.API_URL}/${idApiKey}`, dto);
  }

  revoke(idApiKey: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${idApiKey}`);
  }

  regenerate(idApiKey: string): Observable<CreateApiKeyResult> {
    return this.http.post<CreateApiKeyResult>(`${this.API_URL}/${idApiKey}/regenerate`, {});
  }
}
