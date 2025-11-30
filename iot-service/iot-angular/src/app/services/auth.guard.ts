import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard
 * Protects routes from unauthorized access
 * Redirects to login if user is not authenticated
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      // Check if route requires specific role
      const requiredRoles = route.data['roles'] as Array<string>;
      
      if (requiredRoles && requiredRoles.length > 0) {
        // Check if user has required role
        if (!requiredRoles.includes(currentUser.role)) {
          // User doesn't have required role, redirect to home
          this.router.navigate(['/']);
          return false;
        }
      }

      // User is authenticated and has required role (if any)
      return true;
    }

    // User is not logged in, redirect to login page with return url
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
