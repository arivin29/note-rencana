import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Satu event aktivitas yang dikirim ke backend (disimpan di ClickHouse, TTL 3 bulan).
export interface ActivityEvent {
  eventType: 'app_open' | 'page_view' | 'heartbeat';
  page: string;
  sessionId: string;
}

export interface ActivityOwnerStat {
  ownerId: string;
  ownerCode: string;
  ownerName: string;
  activeUsers: number;
  sessions: number;
  sessions7d: number;
  activeDays7d: number;
  pageViews: number;
  lastActive: string;
}

export interface ActivityDailyStat {
  ownerCode: string;
  day: string;
  sessions: number;
  users: number;
  pageViews: number;
}

export interface ActivityUserStat {
  ownerCode: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  sessions: number;
  pageViews: number;
  lastActive: string;
}

export interface ActivityPageStat {
  page: string;
  views: number;
  users: number;
}

export interface ActivityStats {
  days: number;
  owners: ActivityOwnerStat[];
  daily: ActivityDailyStat[];
  users: ActivityUserStat[];
  pages: ActivityPageStat[];
}

const SESSION_KEY = 'app_activity_session';
const SESSION_OPEN_KEY = 'app_activity_open_sent';
const FLUSH_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 5 * 60_000;

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly API_URL = `${environment.apiUrl}/api/activity`;

  private buffer: ActivityEvent[] = [];
  private started = false;
  private appOpenSent = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) {}

  // ==================== Tracker (dipanggil sekali dari AppComponent) ====================

  startTracking(): void {
    if (this.started) return;
    this.started = true;

    // app_open + page_view saat navigasi
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (!this.authService.isAuthenticated) return;
        const page = e.urlAfterRedirects.split('?')[0];
        if (page.startsWith('/auth')) return;
        // app_open sekali per sesi tab (sessionStorage bertahan saat reload)
        if (!this.appOpenSent && !sessionStorage.getItem(SESSION_OPEN_KEY)) {
          sessionStorage.setItem(SESSION_OPEN_KEY, '1');
          this.push('app_open', page);
        }
        this.appOpenSent = true;
        this.push('page_view', page);
      });

    // heartbeat selama tab terlihat — menandakan user memang memantau
    setInterval(() => {
      if (this.authService.isAuthenticated && document.visibilityState === 'visible') {
        this.push('heartbeat', this.router.url.split('?')[0]);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // flush berkala + saat tab ditutup
    setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    window.addEventListener('pagehide', () => this.flush(true));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    });
  }

  private push(eventType: ActivityEvent['eventType'], page: string): void {
    this.buffer.push({ eventType, page, sessionId: this.sessionId() });
    if (this.buffer.length >= 20) this.flush();
  }

  private flush(useBeacon = false): void {
    if (this.buffer.length === 0 || !this.authService.isAuthenticated) return;
    const events = this.buffer.splice(0, this.buffer.length);
    const body = { app: 'web', events };

    if (useBeacon) {
      // pagehide: request biasa bisa dibatalkan browser — pakai fetch keepalive
      const token = localStorage.getItem('access_token');
      fetch(`${this.API_URL}/track`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      }).catch(() => {});
      return;
    }

    this.http.post(`${this.API_URL}/track`, body).subscribe({
      next: () => {},
      error: () => {}, // tracking tak boleh mengganggu app
    });
  }

  private sessionId(): string {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  // ==================== Stats (halaman admin) ====================

  getStats(days = 30, ownerId?: string): Observable<ActivityStats> {
    let params = new HttpParams().set('days', days);
    if (ownerId) params = params.set('ownerId', ownerId);
    return this.http.get<ActivityStats>(`${this.API_URL}/stats`, { params });
  }
}
