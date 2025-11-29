import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AppSettings } from '../../../service/app-settings.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'page-forgot-password',
  templateUrl: './page-forgot-password.html',
  standalone: false
})

export class ForgotPasswordPage {
  email: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private router: Router,
    private appSettings: AppSettings,
    private authService: AuthService
  ) {
    this.appSettings.appSidebarNone = true;
    this.appSettings.appHeaderNone = true;
    this.appSettings.appContentClass = 'p-0';
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
    this.successMessage = '';

    this.authService.requestPasswordReset(this.email).subscribe({
      next: (response) => {
        // Request successful
        console.log('Password reset email sent:', response);
        this.successMessage = 'Password reset instructions have been sent to your email.';
        
        // Optionally redirect to login after some time
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 5000);
      },
      error: (error) => {
        // Request failed
        this.loading = false;
        this.errorMessage = error.message || 'Failed to send password reset email. Please try again.';
        console.error('Password reset error:', error);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
