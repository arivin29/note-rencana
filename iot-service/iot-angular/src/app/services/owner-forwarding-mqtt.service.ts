import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Shared list envelope: { data, meta:{ total, page, limit, totalPages } }
export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

// Broker config — camelCase, password never returned (write-only, redacted by backend).
export interface OwnerForwardingMqtt {
  idOwnerForwardingMqtt: string;
  idOwner?: string;
  ownerCode?: string;
  label: string;
  brokerUrl: string;
  username: string;
  topicTemplate: string;
  qos: number;
  retained: boolean;
  tlsEnabled: boolean;
  tlsInsecure: boolean;
  isActive: boolean;
  // status feedback fields (may be present depending on backend list projection)
  lastStatus?: 'success' | 'failed' | string | null;
  lastSuccessAt?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Create/Update payload. On update, leave password empty to keep the stored one.
export interface OwnerForwardingMqttRequest {
  label: string;
  brokerUrl: string;
  username: string;
  password?: string;
  topicTemplate: string;
  qos: number;
  retained: boolean;
  tlsEnabled: boolean;
  tlsInsecure: boolean;
  isActive: boolean;
}

// Per-broker live status summary (from iot-gtw execution log, via Go).
export interface OwnerForwardingMqttStatus {
  idOwnerForwardingMqtt: string;
  isActive: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  totalPublished: number;
}

// One execution log row (owner_forwarding_mqtt_log).
export interface OwnerForwardingMqttLog {
  idOwnerForwardingMqttLog: string;
  idOwnerForwardingMqtt?: string;
  status: 'success' | 'failed' | string;
  messagesPublished: number;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface ListConfigParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListLogParams {
  page?: number;
  limit?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable({ providedIn: 'root' })
export class OwnerForwardingMqttService {
  private readonly API_URL = `${environment.apiUrl}/api/owner-forwarding-mqtt`;

  constructor(private http: HttpClient) {}

  findAll(params: ListConfigParams = {}): Observable<ListResponse<OwnerForwardingMqtt>> {
    let httpParams = new HttpParams();
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<ListResponse<OwnerForwardingMqtt>>(this.API_URL, { params: httpParams });
  }

  findOne(id: string): Observable<OwnerForwardingMqtt> {
    return this.http.get<OwnerForwardingMqtt>(`${this.API_URL}/${id}`);
  }

  create(dto: OwnerForwardingMqttRequest): Observable<OwnerForwardingMqtt> {
    return this.http.post<OwnerForwardingMqtt>(this.API_URL, dto);
  }

  update(id: string, dto: OwnerForwardingMqttRequest): Observable<OwnerForwardingMqtt> {
    return this.http.put<OwnerForwardingMqtt>(`${this.API_URL}/${id}`, dto);
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
  }

  toggle(id: string): Observable<OwnerForwardingMqtt> {
    return this.http.post<OwnerForwardingMqtt>(`${this.API_URL}/${id}/toggle`, {});
  }

  getStatus(id: string): Observable<OwnerForwardingMqttStatus> {
    return this.http.get<OwnerForwardingMqttStatus>(`${this.API_URL}/${id}/status`);
  }

  getLogs(id: string, params: ListLogParams = {}): Observable<ListResponse<OwnerForwardingMqttLog>> {
    let httpParams = new HttpParams();
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    return this.http.get<ListResponse<OwnerForwardingMqttLog>>(`${this.API_URL}/${id}/logs`, { params: httpParams });
  }
}
