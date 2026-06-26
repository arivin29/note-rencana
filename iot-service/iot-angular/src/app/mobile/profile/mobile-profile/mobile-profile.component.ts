import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { ViewModeService } from '@services/view-mode.service';
import { AutoRefreshService, RefreshInterval, REFRESH_OPTIONS } from '@services/auto-refresh.service';
import { User } from '@models/auth.model';

/** Profil & preferensi. Logout, switch desktop, dan interval auto-reload aktif. docs/mobile/05 §10. */
@Component({
  selector: 'mobile-profile',
  templateUrl: './mobile-profile.component.html',
  standalone: false
})
export class MobileProfileComponent {
  user: User | null = this.auth.currentUserValue;

  readonly refreshOptions = REFRESH_OPTIONS;
  refreshSheetOpen = false;

  constructor(
    private auth: AuthService,
    private viewMode: ViewModeService,
    private auto: AutoRefreshService,
    private router: Router
  ) {}

  get initials(): string {
    const n = this.user?.name || this.user?.email || '?';
    return n.substring(0, 2).toUpperCase();
  }

  get refreshLabel(): string {
    return this.refreshOptions.find(o => o.value === this.auto.interval)?.label ?? 'Mati';
  }

  get refreshValue(): RefreshInterval {
    return this.auto.interval;
  }

  openRefreshSheet(): void { this.refreshSheetOpen = true; }
  closeRefreshSheet(): void { this.refreshSheetOpen = false; }

  selectRefresh(ms: RefreshInterval): void {
    this.auto.setInterval(ms);
    this.closeRefreshSheet();
  }

  goDesktop(): void {
    this.viewMode.set('desktop');
    this.router.navigateByUrl('/iot/dashboard');
  }

  logout(): void {
    this.auth.logout();
  }
}
