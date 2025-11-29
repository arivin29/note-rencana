import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guest Guard
 * Prevents authenticated users from accessing guest-only pages (login, register)
 * Redirects to home if user is already logged in
 */
@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      // User is already logged in, redirect to home
      this.router.navigate(['/']);
      return false;
    }

    // User is not logged in, allow access to guest pages
    return true;
  }
}
