import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/auth.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: false
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  loading: boolean = false;
  saving: boolean = false;
  
  // Edit mode flags
  editingProfile: boolean = false;
  editingPassword: boolean = false;
  
  // Profile edit form
  editForm = {
    name: '',
    email: ''
  };
  
  // Password change form
  passwordForm = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  // Messages
  successMessage: string = '';
  errorMessage: string = '';
  passwordSuccessMessage: string = '';
  passwordErrorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  /**
   * Load current user profile
   */
  loadUserProfile(): void {
    this.loading = true;
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.editForm.name = user.name;
        this.editForm.email = user.email;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.errorMessage = 'Failed to load profile';
        this.loading = false;
      }
    });
  }

  /**
   * Toggle edit profile mode
   */
  toggleEditProfile(): void {
    if (this.editingProfile) {
      // Cancel editing
      if (this.user) {
        this.editForm.name = this.user.name;
        this.editForm.email = this.user.email;
      }
    }
    this.editingProfile = !this.editingProfile;
    this.successMessage = '';
    this.errorMessage = '';
  }

  /**
   * Toggle edit password mode
   */
  toggleEditPassword(): void {
    if (this.editingPassword) {
      // Cancel editing
      this.passwordForm = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
    }
    this.editingPassword = !this.editingPassword;
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';
  }

  /**
   * Save profile changes
   */
  saveProfile(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    // TODO: Implement update profile API call
    // For now, just simulate success
    setTimeout(() => {
      if (this.user) {
        this.user.name = this.editForm.name;
        this.user.email = this.editForm.email;
      }
      this.successMessage = 'Profile updated successfully!';
      this.editingProfile = false;
      this.saving = false;
    }, 1000);
  }

  /**
   * Change password
   */
  changePassword(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordErrorMessage = 'Passwords do not match';
      return;
    }

    this.saving = true;
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';

    this.authService.changePassword({
      oldPassword: this.passwordForm.oldPassword,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: () => {
        this.passwordSuccessMessage = 'Password changed successfully!';
        this.passwordForm = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        this.editingPassword = false;
        this.saving = false;
      },
      error: (error) => {
        this.passwordErrorMessage = error.message || 'Failed to change password';
        this.saving = false;
      }
    });
  }

  /**
   * Get role badge class
   */
  getRoleBadgeClass(): string {
    if (!this.user) return 'badge-secondary';
    return this.user.role === 'admin' ? 'badge-danger' : 'badge-primary';
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(): string {
    if (!this.user) return 'badge-secondary';
    return this.user.isActive ? 'badge-success' : 'badge-warning';
  }

  /**
   * Format date
   */
  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
