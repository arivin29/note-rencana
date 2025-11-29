import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/auth.model';
import { UsersService } from '@sdk/core/services/users.service';
import { CreateUserDto, UpdateUserDto } from '@sdk/core/models';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  standalone: false
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  loading: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalUsers: number = 0;
  totalPages: number = 0;
  
  // Filters
  searchQuery: string = '';
  filterRole: string = '';
  filterStatus: string = '';
  
  // Sorting
  sortBy: string = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Modal
  showModal: boolean = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedUser: User | null = null;
  
  // Messages
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    // Check if user is admin
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }
    
    this.loadUsers();
  }

  /**
   * Load users with filters and pagination
   */
  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    
    // Prepare API parameters
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    
    // Add filters if set
    if (this.searchQuery) {
      params.search = this.searchQuery;
    }
    
    if (this.filterRole && this.filterRole !== '') {
      params.role = this.filterRole;
    }
    
    if (this.filterStatus && this.filterStatus !== '') {
      params.isActive = this.filterStatus === 'active';
    }
    
    // Call the API
    this.usersService.usersControllerFindAll$Response(params).subscribe({
      next: (response: any) => {
        try {
          // Parse the response body
          const body = JSON.parse(response.body || '{}');
          
          // Map the users data
          this.users = (body.data || []).map((user: any) => ({
            idUser: user.idUser,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            idOwner: user.idOwner,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt)
          }));
          
          // Handle pagination metadata
          if (body.meta) {
            this.totalUsers = body.meta.total || 0;
            this.totalPages = body.meta.totalPages || 1;
            this.currentPage = body.meta.page || 1;
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          this.errorMessage = 'Failed to parse response data.';
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = error.error?.message || 'Failed to load users. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Mock users data (DEPRECATED - now using real API)
   */
  getMockUsers(): User[] {
    // Keeping this for reference, but it's no longer used
    return [];
  }

  /**
   * Search users
   */
  onSearch(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * Filter changed
   */
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * Sort changed
   */
  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.loadUsers();
  }

  /**
   * Change page
   */
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  /**
   * Open create user modal
   */
  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedUser = null;
    this.showModal = true;
  }

  /**
   * Open edit user modal
   */
  openEditModal(user: User): void {
    this.modalMode = 'edit';
    this.selectedUser = { ...user };
    this.showModal = true;
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
  }

  /**
   * Handle user saved
   */
  onUserSaved(user: User): void {
    this.successMessage = this.modalMode === 'create' 
      ? 'User created successfully!'
      : 'User updated successfully!';
    this.closeModal();
    this.loadUsers();
    
    // Clear message after 3 seconds
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  /**
   * Delete user
   */
  deleteUser(user: User): void {
    if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      return;
    }

    this.loading = true;
    
    // Call delete API
    this.usersService.usersControllerDelete({ id: user.idUser }).subscribe({
      next: () => {
        this.successMessage = 'User deleted successfully!';
        this.loadUsers();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
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
   * Toggle user active status
   */
  toggleUserStatus(user: User): void {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} user "${user.name}"?`)) {
      return;
    }

    this.loading = true;
    
    // Call toggle API
    this.usersService.usersControllerToggleActive({ id: user.idUser }).subscribe({
      next: () => {
        this.successMessage = `User ${action}d successfully!`;
        this.loadUsers();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        this.errorMessage = error.error?.message || `Failed to ${action} user.`;
        this.loading = false;
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
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
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  /**
   * Format date
   */
  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get showing from index (for pagination display)
   */
  getShowingFrom(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /**
   * Get showing to index (for pagination display)
   */
  getShowingTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }
}
