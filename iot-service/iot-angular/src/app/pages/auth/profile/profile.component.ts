import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/auth.model';
import { OwnersService } from '../../../../sdk/core/services/owners.service';
import { OwnerDetailResponseDto } from '../../../../sdk/core/models/owner-detail-response-dto';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: false
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  ownerDetail: OwnerDetailResponseDto | null = null;
  loading = true;
  saving = false;
  activeTab: 'profile' | 'security' | 'sessions' | 'organization' = 'profile';

  // Edit states
  editingProfile = false;
  editForm = { name: '', email: '' };

  // Password
  editingPassword = false;
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  showCurrentPassword = false;
  showNewPassword = false;

  // Messages
  successMessage = '';
  errorMessage = '';
  passwordSuccessMessage = '';
  passwordErrorMessage = '';

  // Sessions mock
  activeSessions = [
    { device: 'Chrome on macOS', ip: '192.168.1.100', location: 'Jakarta, ID', lastActive: 'Now', current: true },
    { device: 'Mobile App (iOS)', ip: '103.28.12.45', location: 'Jambi, ID', lastActive: '2 hours ago', current: false }
  ];

  constructor(
    private authService: AuthService,
    private ownersService: OwnersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.loading = true;
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.editForm.name = user.name;
        this.editForm.email = user.email;
        this.loading = false;
        if (user.idOwner) {
          this.loadOwnerDetail(user.idOwner);
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load profile';
        this.loading = false;
      }
    });
  }

  loadOwnerDetail(ownerId: string): void {
    this.ownersService.ownersControllerFindOneDetailed({ id: ownerId }).subscribe({
      next: (detail: any) => {
        this.ownerDetail = typeof detail === 'string' ? JSON.parse(detail) : detail;
      },
      error: () => {}
    });
  }

  toggleEditProfile(): void {
    if (this.editingProfile && this.user) {
      this.editForm.name = this.user.name;
      this.editForm.email = this.user.email;
    }
    this.editingProfile = !this.editingProfile;
    this.clearMessages();
  }

  toggleEditPassword(): void {
    if (this.editingPassword) {
      this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
    }
    this.editingPassword = !this.editingPassword;
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';
  }

  saveProfile(form: NgForm): void {
    if (form.invalid) return;
    this.saving = true;
    this.clearMessages();

    this.authService.updateProfile(this.editForm).subscribe({
      next: (user) => {
        this.user = user;
        this.successMessage = 'Profile updated successfully';
        this.editingProfile = false;
        this.saving = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to update profile';
        this.saving = false;
      }
    });
  }

  changePassword(form: NgForm): void {
    if (form.invalid || this.passwordForm.newPassword !== this.passwordForm.confirmPassword) return;
    this.saving = true;
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';

    this.authService.changePassword({
      oldPassword: this.passwordForm.oldPassword,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: () => {
        this.passwordSuccessMessage = 'Password updated successfully';
        this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.editingPassword = false;
        this.saving = false;
      },
      error: (err) => {
        this.passwordErrorMessage = err.message || 'Failed to change password. Check your current password.';
        this.saving = false;
      }
    });
  }

  get passwordStrength(): { label: string; class: string; percent: number } {
    const pw = this.passwordForm.newPassword;
    if (!pw) return { label: '', class: '', percent: 0 };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { label: 'Weak', class: 'bg-danger', percent: 33 };
    if (score <= 3) return { label: 'Medium', class: 'bg-warning', percent: 66 };
    return { label: 'Strong', class: 'bg-success', percent: 100 };
  }

  get accountAge(): string {
    if (!this.user?.createdAt) return '-';
    const days = Math.floor((Date.now() - new Date(this.user.createdAt).getTime()) / 86400000);
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} year(s)`;
  }

  get roleLabel(): string {
    if (!this.user) return '-';
    return this.user.role === 'admin' ? 'Super Administrator' : 'Tenant User';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}

