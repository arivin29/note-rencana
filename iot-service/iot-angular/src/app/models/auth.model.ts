/**
 * Authentication Models
 * Data models for authentication system
 */

export interface User {
  idUser: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  idOwner?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  TENANT = 'tenant'
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  idOwner?: string;
}

export interface RegisterResponse {
  user: User;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}
