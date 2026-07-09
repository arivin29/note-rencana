import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * AI-NRW client — memanggil endpoint Go `/api/ai/*` (dok 08).
 * Endpoint ini belum ada di SDK ng-openapi-gen, jadi ditulis tangan (lihat sdk-regen-gotcha).
 * Token JWT dilekatkan otomatis oleh JwtInterceptor — jangan set header manual.
 */

export interface AiPageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface AiPaginated<T> {
  data: T[];
  meta: AiPageMeta;
}

export interface AiEventListItem {
  id: string;
  targetId: string;
  channelName: string;
  groupName: string | null;
  analysisType: string;
  status: string;
  severity: string;
  confidence: number | null;
  meaning: string | null;
  startedAt: string;
  lastSeenAt: string;
  durationSec: number | null;
  isRecurring: boolean;
}

export interface AiEventLog {
  id: string;
  eventId: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string | null;
  actorKind: string;
  note: string | null;
  at: string;
}

export interface AiRecurrence {
  id?: string;
  targetId: string;
  analysisType: string;
  windowDays: number;
  count: number;
  trend: string | null;
  typicalHour: Record<string, number>;
  escalated: boolean;
}

export interface AiEventDetail extends AiEventListItem {
  idOwner: string;
  context: Record<string, any> | null;
  verdict: string | null;
  verdictBy: string | null;
  verdictAt: string | null;
  assignedTo: string | null;
  actionNote: string | null;
  timeline: AiEventLog[];
  recurrence: AiRecurrence | null;
}

export interface AiEventStats {
  total: number;
  active: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface AiAnalysisItem {
  analysisType: string;
  enabled: boolean;
  severity: string | null;
  params: Record<string, any>;
  /** UI-only: field param yang di-precompute (referensi stabil untuk *ngFor) + doc ramah. */
  paramFields?: Array<{
    key: string;
    type: 'boolean' | 'number' | 'text';
    label?: string;
    help?: string;
    recommended?: string;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
  }>;
  /** UI-only: judul & deskripsi manusiawi detektor. */
  title?: string;
  what?: string;
}
export interface AiConfigListItem {
  targetId: string;
  channelName: string;
  groupName: string | null;
  idOwner: string;
  aiEnabled: boolean;
  preset: string | null;
  activeAnalyses: string[];
  learnReady: boolean;
  cadenceSec: number | null;
  updatedAt: string;
  nodeId: string | null;
  nodeName: string | null;
  nodeCode: string | null;
  nodeAddress: string | null;
  projectId: string | null;
  projectName: string | null;
}
export interface AiConfigDetail {
  targetId: string;
  channelName: string;
  groupName: string | null;
  idOwner: string;
  aiEnabled: boolean;
  preset: string | null;
  learnReady: boolean;
  version: number;
  analyses: AiAnalysisItem[];
}
export interface AiPresetCatalog {
  key: string;
  label: string;
  groupNames: string[];
  analyses: Record<string, Record<string, any>>;
}

export interface AiForecast {
  targetId: string;
  horizonDays: number;
  tier: string;
  generatedAt: string;
  daily: Array<Record<string, any>>;
  metrics: Record<string, any>;
}

export interface AiAnalytics {
  targetId: string;
  channelName: string;
  unit: string | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  from: string;
  to: string;
  resolution: string;
  series: Array<{ ts: string; value: number | null }>;
  baselineBand: Array<{ ts: string; median: number; hi: number; lo: number }>;
  forecast: AiForecast | null;
  events: Array<{ id: string; analysisType: string; startedAt: string; resolvedAt: string | null; severity: string; status: string }>;
  night: { window: string; pNight: Array<{ d: string; value: number }>; trend: string | null } | null;
}

export interface AiJob {
  id: string;
  targetId: string;
  kind: string;
  status: string; // pending | running | done | error
  requestedBy: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: Record<string, any> | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AiNrwService {
  private readonly API = `${environment.apiUrl}/api/ai`;

  constructor(private http: HttpClient) {}

  // --- Jobs (hitung-ulang / jalankan sekarang) ---
  enqueueJob(targetId: string, kind: string): Observable<AiJob> {
    return this.http.post<AiJob>(`${this.API}/jobs`, { targetId, kind });
  }
  listJobs(targetId: string): Observable<AiJob[]> {
    return this.http.get<AiJob[]>(`${this.API}/jobs`, { params: this.clean({ targetId }) });
  }

  // --- Events ---
  listEvents(params: Record<string, any>): Observable<AiPaginated<AiEventListItem>> {
    return this.http.get<AiPaginated<AiEventListItem>>(`${this.API}/events`, { params: this.clean(params) });
  }
  eventStats(ownerId?: string): Observable<AiEventStats> {
    return this.http.get<AiEventStats>(`${this.API}/events/stats`, { params: this.clean({ ownerId }) });
  }
  getEvent(id: string): Observable<AiEventDetail> {
    return this.http.get<AiEventDetail>(`${this.API}/events/${id}`);
  }
  validateEvent(id: string, body: { verdict: string; note?: string }): Observable<AiEventDetail> {
    return this.http.post<AiEventDetail>(`${this.API}/events/${id}/validate`, body);
  }
  assignEvent(id: string, body: { assignedTo: string; note?: string }): Observable<AiEventDetail> {
    return this.http.post<AiEventDetail>(`${this.API}/events/${id}/assign`, body);
  }
  closeEvent(id: string, body: { note?: string }): Observable<AiEventDetail> {
    return this.http.post<AiEventDetail>(`${this.API}/events/${id}/close`, body);
  }
  reopenEvent(id: string): Observable<AiEventDetail> {
    return this.http.post<AiEventDetail>(`${this.API}/events/${id}/reopen`, {});
  }

  // --- Configs / AI Settings ---
  listConfigs(params: Record<string, any>): Observable<AiPaginated<AiConfigListItem>> {
    return this.http.get<AiPaginated<AiConfigListItem>>(`${this.API}/configs`, { params: this.clean(params) });
  }
  getConfig(targetId: string): Observable<AiConfigDetail> {
    return this.http.get<AiConfigDetail>(`${this.API}/configs/${targetId}`);
  }
  updateConfig(targetId: string, body: { analyses: AiAnalysisItem[] }): Observable<AiConfigDetail> {
    return this.http.put<AiConfigDetail>(`${this.API}/configs/${targetId}`, body);
  }
  applyPreset(targetId: string, preset: string): Observable<AiConfigDetail> {
    return this.http.post<AiConfigDetail>(`${this.API}/configs/${targetId}/apply-preset`, { preset });
  }
  presets(): Observable<AiPresetCatalog[]> {
    return this.http.get<AiPresetCatalog[]>(`${this.API}/presets`);
  }

  // --- Insights ---
  forecast(targetId: string): Observable<AiForecast> {
    return this.http.get<AiForecast>(`${this.API}/forecast/${targetId}`);
  }
  recurrence(targetId: string): Observable<AiRecurrence[]> {
    return this.http.get<AiRecurrence[]>(`${this.API}/recurrence/${targetId}`);
  }
  analytics(targetId: string, params: Record<string, any>): Observable<AiAnalytics> {
    return this.http.get<AiAnalytics>(`${this.API}/analytics/${targetId}`, { params: this.clean(params) });
  }

  /** Buang param kosong/undefined agar URL bersih. */
  private clean(params: Record<string, any>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of Object.keys(params || {})) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') out[k] = String(v);
    }
    return out;
  }
}
