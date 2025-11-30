import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AppSettings } from '../../../service/app-settings.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'page-register',
  templateUrl: './page-register.html',
  standalone: false
})

export class RegisterPage {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  agreeTerms: boolean = false;
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

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (!this.agreeTerms) {
      this.errorMessage = 'You must agree to the Terms and Conditions';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password,
      role: 'tenant' as any // Default role for registration
    }).subscribe({
      next: (response) => {
        // Registration successful
        console.log('Registration successful:', response);
        this.successMessage = 'Registration successful! Redirecting to login...';
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error) => {
        // Registration failed
        this.loading = false;
        this.errorMessage = error.message || 'Registration failed. Please try again.';
        console.error('Registration error:', error);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
