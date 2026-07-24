import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Klien settingan notifikasi — endpoint Go `/api/notifications/{triggers,rules,preferences}`
 * (dok notifikasi 02). Belum ada di SDK ng-openapi-gen → ditulis tangan (lihat sdk-regen-gotcha).
 * Token JWT dilekatkan otomatis oleh JwtInterceptor — jangan set header manual.
 */

export interface NotifTrigger {
  triggerKey: string;
  groupKey: string;
  label: string;
  description: string | null;
  defaultSeverity: string;
  sortOrder: number;
  isActive?: boolean;
}

export interface NotifRuleView {
  triggerKey: string;
  groupKey: string;
  label: string;
  description: string | null;
  defaultSeverity: string;
  sortOrder: number;
  enabled: boolean;
  minSeverity: string | null;
  channels: string[];
}

export interface NotifPrefView {
  triggerKey: string | null;
  muted: boolean;
  quietStart: string | null;
  quietEnd: string | null;
  digest: boolean;
}

export interface RuleUpsertItem {
  triggerKey: string;
  enabled: boolean;
  minSeverity?: string | null;
  channels?: string[];
}

/** Satu baris inbox — dihasilkan dispatcher (dok notifikasi 03). */
export interface NotifInboxItem {
  idNotification: string;
  type: string;
  title: string;
  message: string;
  severity: string | null;
  fromModule: string;
  fromModuleId: string | null;
  isRead: boolean;
  createdAt: string;
  data?: {
    deepLink?: string;
    triggerKey?: string;
    nodeName?: string;
    projectName?: string;
    [k: string]: unknown;
  };
}

interface Wrapped<T> {
  data: T[];
}

interface Paged<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class NotificationSettingsService {
  private readonly API = `${environment.apiUrl}/api/notifications`;

  constructor(private http: HttpClient) {}

  listTriggers(): Observable<Wrapped<NotifTrigger>> {
    return this.http.get<Wrapped<NotifTrigger>>(`${this.API}/triggers`);
  }

  getRules(idOwner?: string): Observable<Wrapped<NotifRuleView>> {
    const params: Record<string, string> = {};
    if (idOwner) params['idOwner'] = idOwner;
    return this.http.get<Wrapped<NotifRuleView>>(`${this.API}/rules`, { params });
  }

  saveRules(rules: RuleUpsertItem[], idOwner?: string): Observable<Wrapped<NotifRuleView>> {
    return this.http.put<Wrapped<NotifRuleView>>(`${this.API}/rules`, { idOwner, rules });
  }

  getPreferences(): Observable<Wrapped<NotifPrefView>> {
    return this.http.get<Wrapped<NotifPrefView>>(`${this.API}/preferences`);
  }

  savePreferences(preferences: NotifPrefView[]): Observable<Wrapped<NotifPrefView>> {
    return this.http.put<Wrapped<NotifPrefView>>(`${this.API}/preferences`, { preferences });
  }

  // ===== Kotak Masuk (dok 03) =====

  listInbox(opts: { page?: number; limit?: number; isRead?: boolean; type?: string } = {}): Observable<Paged<NotifInboxItem>> {
    const params: Record<string, string> = {};
    if (opts.page) params['page'] = String(opts.page);
    if (opts.limit) params['limit'] = String(opts.limit);
    if (opts.isRead !== undefined) params['isRead'] = String(opts.isRead);
    if (opts.type) params['type'] = opts.type;
    return this.http.get<Paged<NotifInboxItem>>(this.API, { params });
  }

  markRead(id: string): Observable<unknown> {
    return this.http.patch(`${this.API}/${id}/read`, {});
  }

  markAllRead(): Observable<unknown> {
    return this.http.patch(`${this.API}/mark-all-read`, {});
  }
}
