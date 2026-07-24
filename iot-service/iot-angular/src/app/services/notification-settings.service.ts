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

interface Wrapped<T> {
  data: T[];
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
}
