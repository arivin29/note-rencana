import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { ViewModeService } from '@services/view-mode.service';
import { AutoRefreshService, RefreshInterval } from '@services/auto-refresh.service';
import { User } from '@models/auth.model';

/** Profil & preferensi. Logout, switch desktop, dan interval auto-reload aktif. docs/mobile/05 §10. */
@Component({
  selector: 'mobile-profile',
  templateUrl: './mobile-profile.component.html',
  standalone: false
})
export class MobileProfileComponent {
  user: User | null = this.auth.currentUserValue;

  /** Mobile hanya punya dua pilihan jujur: polling 60 dtk (mobilePoll$) atau mati. */
  readonly refreshOptions: { value: RefreshInterval; label: string }[] = [
    { value: 60000, label: 'Tiap 60 detik' },
    { value: 0, label: 'Mati' }
  ];
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
    return this.auto.interval > 0 ? 'Tiap 60 detik' : 'Mati';
  }

  get refreshValue(): RefreshInterval {
    return this.auto.interval > 0 ? 60000 : 0;
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
