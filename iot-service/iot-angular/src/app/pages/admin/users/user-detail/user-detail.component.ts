import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { UsersService } from '@sdk/core/services/users.service';
import { AuditService } from '@sdk/core/services/audit.service';
import { OwnersService } from '@sdk/core/services/owners.service';
import { OwnerResponseDto } from '@sdk/core/models/owner-response-dto';
import { UserResponseDto } from '@sdk/core/models/user-response-dto';

interface UserStats {
  totalLogins: number;
  lastLogin: Date | null;
  totalActions: number;
  accountAge: number; // days
}

interface RecentActivity {
  action: string;
  description: string;
  createdAt: Date;
  status: string;
}

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.css'],
  standalone: false
})
export class UserDetailComponent implements OnInit {
  userId: string = '';
  user: UserResponseDto | null = null;
  loading: boolean = false;
  loadingStats: boolean = false;
  
  // User statistics
  stats: UserStats = {
    totalLogins: 0,
    lastLogin: null,
    totalActions: 0,
    accountAge: 0
  };
  
  // Recent activities
  recentActivities: RecentActivity[] = [];
  
  // Owned resources (for tenants)
  ownedResources = {
    nodes: 0,
    projects: 0,
    sensors: 0
  };

  // Owner details (resolved from idOwner)
  ownerDetail: OwnerResponseDto | null = null;
  
  // Messages
  successMessage: string = '';
  errorMessage: string = '';
  
  // Modals
  showEditModal: boolean = false;
  showDeleteConfirm: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService,
    private auditService: AuditService,
  private ownersService: OwnersService,
    private authService: AuthService
  ) {}

  /**
   * Load owner detail from SDK when idOwner is available
   */
  loadOwnerDetail(idOwner: string): void {
    this.ownersService.ownersControllerFindOne({ id: idOwner }).subscribe({
      next: (owner) => {
        this.ownerDetail = owner;
      },
      error: (err) => {
        console.error('Failed to load owner detail', err);
      }
    });
  }

  ngOnInit(): void {
    // Check if user is admin
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }
    
    // Get user ID from route
    this.route.params.subscribe(params => {
      this.userId = params['id'];
      if (this.userId) {
        this.loadUser();
        this.loadUserStats();
        this.loadRecentActivities();
      }
    });
  }

  /**
   * Load user details
   */
  loadUser(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.usersService.usersControllerFindOne({ id: this.userId }).subscribe({
      next: (response: any) => {
        try {
          const body = typeof response === 'string' ? JSON.parse(response) : response;
          this.user = body; // Response already in UserResponseDto format
          
          // Calculate account age
          if (this.user && this.user.createdAt) {
            const createdDate = new Date(this.user.createdAt);
            const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
            this.stats.accountAge = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          
          // Load owned resources if tenant
          if (this.user && this.user.role === 'tenant' && this.user.idOwner) {
            this.loadOwnedResources();
            this.loadOwnerDetail(this.user.idOwner);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          this.errorMessage = 'Failed to load user details.';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.errorMessage = error.error?.message || 'Failed to load user details.';
        this.loading = false;
      }
    });
  }

  /**
   * Load user statistics from audit logs
   */
  loadUserStats(): void {
    this.loadingStats = true;
    
    // Get audit logs for this user
    this.auditService.auditControllerFindAll$Response({
      idUser: this.userId,
      limit: 100
    }).subscribe({
      next: (response: any) => {
        try {
          const body = JSON.parse(response.body || '{}');
          const logs = body.data || [];
          
          // Calculate stats
          this.stats.totalActions = logs.length;
          
          // Count logins
          this.stats.totalLogins = logs.filter((log: any) => log.action === 'login').length;
          
          // Find last login
          const loginLogs = logs.filter((log: any) => log.action === 'login');
          if (loginLogs.length > 0) {
            this.stats.lastLogin = new Date(loginLogs[0].createdAt);
          }
        } catch (error) {
          console.error('Error parsing stats:', error);
        }
        this.loadingStats = false;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.loadingStats = false;
      }
    });
  }

  /**
   * Load recent activities
   */
  loadRecentActivities(): void {
    this.auditService.auditControllerFindAll$Response({
      idUser: this.userId,
      limit: 10
    }).subscribe({
      next: (response: any) => {
        try {
          const body = JSON.parse(response.body || '{}');
          const logs = body.data || [];
          
          this.recentActivities = logs.map((log: any) => ({
            action: log.action,
            description: log.description || `${log.action} action`,
            createdAt: new Date(log.createdAt),
            status: log.status
          }));
        } catch (error) {
          console.error('Error parsing activities:', error);
        }
      },
      error: (error) => {
        console.error('Error loading activities:', error);
      }
    });
  }

  /**
   * Load owned resources (for tenant users)
   */
  loadOwnedResources(): void {
    // TODO: Implement when we have endpoints for counting resources
    // For now, using mock data
    this.ownedResources = {
      nodes: 0,
      projects: 0,
      sensors: 0
    };
  }

  /**
   * Toggle user status
   */
  toggleStatus(): void {
    if (!this.user) return;
    
    const action = this.user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }
    
    this.loading = true;
    
    this.usersService.usersControllerToggleActive({ id: this.userId }).subscribe({
      next: () => {
        this.successMessage = `User ${action}d successfully!`;
        this.loadUser();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error toggling status:', error);
        this.errorMessage = error.error?.message || `Failed to ${action} user.`;
        this.loading = false;
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  /**
   * Delete user
   */
  deleteUser(): void {
    if (!this.user) return;
    
    this.showDeleteConfirm = false;
    this.loading = true;
    
    this.usersService.usersControllerDelete({ id: this.userId }).subscribe({
      next: () => {
        this.successMessage = 'User deleted successfully!';
        setTimeout(() => {
          this.router.navigate(['/admin/users']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.errorMessage = error.error?.message || 'Failed to delete user.';
        this.loading = false;
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  /**
   * Navigate to edit
   */
  editUser(): void {
    // Open edit modal directly instead of navigating
    this.showEditModal = true;
  }
  
  /**
   * Close edit modal
   */
  closeEditModal(): void {
    this.showEditModal = false;
  }
  
  /**
   * Handle user saved from modal
   */
  onUserSaved(user: UserResponseDto): void {
    this.successMessage = 'User updated successfully!';
    this.closeEditModal();
    this.loadUser(); // Reload user data
    
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  /**
   * Go back to users list
   */
  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  /**
   * Get role badge class
   */
  getRoleBadgeClass(role: string): string {
    return role === 'admin' ? 'badge-danger' : 'badge-primary';
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'badge-success' : 'badge-secondary';
  }

  /**
   * Get action badge class
   */
  getActionBadgeClass(action: string): string {
    const actionMap: { [key: string]: string } = {
      'login': 'badge-info',
      'logout': 'badge-secondary',
      'create': 'badge-success',
      'update': 'badge-warning',
      'delete': 'badge-danger',
      'password_change': 'badge-primary',
      'status_change': 'badge-warning'
    };
    return actionMap[action] || 'badge-secondary';
  }

  /**
   * Format date
   */
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    if (!this.user?.name) return '?';
    return this.user.name
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
