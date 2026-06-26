import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AppSettings } from '../../../service/app-settings.service';
import { AuthService } from '@services/auth.service';

/** Login mobile tersendiri (UI .m-app, logika AuthService yang sama). docs/mobile/05 §1. */
@Component({
  selector: 'mobile-login',
  templateUrl: './mobile-login.component.html',
  standalone: false
})
export class MobileLoginComponent implements OnDestroy {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  returnUrl = '/mobile/dashboard';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appSettings: AppSettings,
    private auth: AuthService
  ) {
    this.appSettings.appSidebarNone = true;
    this.appSettings.appHeaderNone = true;
    this.appSettings.appContentClass = 'p-0';
    this.returnUrl = (this.route.snapshot.queryParams['returnUrl'] as string) || '/mobile/dashboard';
  }

  ngOnDestroy(): void {
    this.appSettings.appSidebarNone = false;
    this.appSettings.appHeaderNone = false;
    this.appSettings.appContentClass = '';
  }

  submit(f: NgForm): void {
    if (f.invalid) { return; }
    this.loading = true;
    this.errorMessage = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Email atau kata sandi salah';
      }
    });
  }
}
