import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AppSettings } from '../../../service/app-settings.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'page-login',
  templateUrl: './page-login.html',
  standalone: false
})

export class LoginPage {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';
  returnUrl: string = '/';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appSettings: AppSettings,
    private authService: AuthService
  ) {
    this.appSettings.appSidebarNone = true;
    this.appSettings.appHeaderNone = true;
    this.appSettings.appContentClass = 'p-0';

    // Get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }
  
  ngOnDestroy() {
    this.appSettings.appSidebarNone = false;
    this.appSettings.appHeaderNone = false;
    this.appSettings.appContentClass = '';
  }
  
	formSubmit(f: NgForm) {
    if (f.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        // Login successful
        console.log('Login successful:', response);
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        // Login failed
        this.loading = false;
        this.errorMessage = error.message || 'Invalid email or password';
        console.error('Login error:', error);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
