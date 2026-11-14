import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '@services/auth.service';
import { ViewModeService } from '@services/view-mode.service';
import { MobileScopeService } from '../shared/mobile-scope.service';
import { mErrorText } from '../shared/labels';

/**
 * Layar `/mobile` yang hanya tampil bila landing guard TIDAK mengalihkan:
 * akun tanpa project (layar kosong jujur) atau daftar project gagal dimuat (galat + Coba lagi).
 */
@Component({
  selector: 'mobile-home',
  templateUrl: './mobile-home.component.html',
  standalone: false
})
export class MobileHomeComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private scope: MobileScopeService,
    private router: Router,
    private auth: AuthService,
    private viewMode: ViewModeService
  ) {}

  ngOnInit(): void { this.check(false); }

  retry(): void { this.check(true); }

  goDesktop(): void { this.viewMode.set('desktop'); this.router.navigateByUrl('/iot/dashboard'); }
  logout(): void { this.auth.logout(); }

  private check(force: boolean): void {
    this.loading = true;
    this.scope.projects$(force).pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.loading = false;
        this.error = null;
        // muncul project setelah Coba lagi → jalankan landing guard lagi
        if (list.length > 0) { this.router.navigateByUrl('/mobile', { replaceUrl: true, onSameUrlNavigation: 'reload' }); }
      },
      error: (e) => { this.loading = false; this.error = mErrorText(e, 'project'); }
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
