import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetConfirm,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ChangePasswordRequest,
  OwnerContext
} from '../models/auth.model';

/**
 * Authentication Service
 * Handles all authentication operations including login, logout, registration,
 * token management, and user session state
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/api/auth`;
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';

  // BehaviorSubject to track authentication state
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  // BehaviorSubject to track authentication status
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Initialize with stored user if exists
    const storedUser = this.getUserFromStorage();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();

    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(!!storedUser);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    // Proactive sliding refresh: on app load and every hour, renew tokens
    // when the access token has less than 7 days left. Combined with the
    // 60-day refresh token this keeps active users logged in indefinitely.
    this.refreshIfExpiringSoon();
    setInterval(() => this.refreshIfExpiringSoon(), 60 * 60 * 1000);
  }

  /**
   * Silently refresh the token pair when the access token is close to expiry
   */
  private refreshIfExpiringSoon(): void {
    const token = this.getAccessToken();
    if (!token || !this.getRefreshToken()) return;

    const expiresAt = this.getTokenExpiry(token);
    if (expiresAt === null) return;

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (expiresAt - Date.now() < sevenDaysMs) {
      this.refreshToken().subscribe({
        next: () => console.log('Access token proactively refreshed'),
        error: () => { /* handled inside refreshToken (logout on failure) */ }
      });
    }
  }

  /**
   * Decode JWT exp claim (ms since epoch), or null if unreadable
   */
  private getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /**
   * Get current user value (synchronous)
   */
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current authentication status
   */
  public get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Login user with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        this.setSession(response);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Register new user
   */
  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.API_URL}/register`, data).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Logout user and clear session
   */
  logout(): void {
    // Clear session first
    this.clearSession();
    
    // Navigate to login
    this.router.navigate(['/auth/login']);
    
    // Call backend logout endpoint (fire and forget)
    this.http.post(`${this.API_URL}/logout`, {}).subscribe({
      next: () => console.log('Logout successful'),
      error: (err) => console.error('Logout error (ignored):', err)
    });
  }

  /**
   * Request password reset email
   */
  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.API_URL}/password-reset/request`,
      { email }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reset password with token
   */
  resetPassword(data: PasswordResetConfirm): Observable<any> {
    return this.http.post(
      `${this.API_URL}/password-reset/confirm`,
      data
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Change password for current user
   */
  changePassword(data: ChangePasswordRequest): Observable<any> {
    return this.http.post(
      `${this.API_URL}/change-password`,
      data
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Refresh access token using refresh token
   */
  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<RefreshTokenResponse>(
      `${this.API_URL}/refresh`,
      { refresh_token: refreshToken }
    ).pipe(
      tap(response => {
        this.setAccessToken(response.access_token);
        // Sliding session: backend issues a fresh refresh token on every refresh
        if (response.refresh_token) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
        }
      }),
      catchError(error => {
        // If refresh fails, logout user
        this.clearSession();
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current user profile from backend
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/profile`).pipe(
      tap(user => {
        this.setUser(user);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update current user profile
   */
  updateProfile(data: { name?: string; email?: string }): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/profile`, data).pipe(
      tap(user => {
        this.setUser(user);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get current user's role
   * @returns 'admin' | 'tenant' | 'unknown'
   */
  getCurrentUserRole(): string {
    const user = this.currentUserValue;
    return user?.role || 'tenant'; // Default to tenant if role not found
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user?.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user is tenant
   */
  isTenant(): boolean {
    return this.hasRole('tenant');
  }

  /**
   * Get current owner ID from logged-in user
   * Returns null for super_admin users (they can see all owners)
   */
  getCurrentOwnerId(): string | null {
    const user = this.currentUserValue;
    return user?.idOwner || null;
  }

  /**
   * Check if current user is a super admin (no owner association)
   */
  isSuperAdmin(): boolean {
    const user = this.currentUserValue;
    return user !== null && user.role === 'admin' && !user.idOwner;
  }

  /**
   * Check if current user belongs to an owner (tenant user or owner-admin)
   */
  hasOwnerContext(): boolean {
    const user = this.currentUserValue;
    return user !== null && !!user.idOwner;
  }

  /**
   * Get complete owner context for data filtering
   * Returns comprehensive context with ownerId and user type flags
   */
  getOwnerContext(): OwnerContext {
    const user = this.currentUserValue;
    return {
      ownerId: user?.idOwner || null,
      isSuperAdmin: user !== null && user.role === 'admin' && !user.idOwner,
      hasOwnerContext: user !== null && !!user.idOwner
    };
  }

  // ========== Private Helper Methods ==========

  /**
   * Set session data after successful login
   */
  private setSession(authResult: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResult.access_token);
    if (authResult.refresh_token) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, authResult.refresh_token);
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user));
    
    this.currentUserSubject.next(authResult.user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear session data on logout
   */
  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Set access token only (for refresh)
   */
  private setAccessToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Set user data
   */
  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Get access token from storage
   */
  public getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token from storage
   */
  private getRefreshToken(): string | null {
    const token = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    // Older sessions stored the literal string "undefined"
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  /**
   * Get user from storage
   */
  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error('Auth Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
