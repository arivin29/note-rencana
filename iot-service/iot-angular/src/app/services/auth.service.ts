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
  ChangePasswordRequest
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
    // Call backend logout endpoint (optional)
    this.http.post(`${this.API_URL}/logout`, {}).subscribe({
      next: () => {
        this.clearSession();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        // Clear session even if backend call fails
        this.clearSession();
        this.router.navigate(['/auth/login']);
      }
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

  // ========== Private Helper Methods ==========

  /**
   * Set session data after successful login
   */
  private setSession(authResult: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResult.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authResult.refresh_token);
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
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
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
