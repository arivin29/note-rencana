import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { UsersService } from '@sdk/core/services/users.service';
import { UserResponseDto } from '@sdk/core/models/user-response-dto';
import { CreateUserDto, UpdateUserDto } from '@sdk/core/models';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  standalone: false
})
export class UsersListComponent implements OnInit {
  users: UserResponseDto[] = [];
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
  selectedUser: UserResponseDto | null = null;
  
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
            console.log('Response data:', response.body);
          // Parse the response body
            const body =  (response.body || '{}');
          
          // Map the users data - response already in UserResponseDto format
          this.users = body.data || [];
            console.log('Response data:', body);
          // Handle pagination metadata
          this.totalUsers = body.total || 0;
          this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
          this.currentPage = body.page || 1;
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
  getMockUsers(): UserResponseDto[] {
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
  openEditModal(user: UserResponseDto): void {
    this.modalMode = 'edit';
    this.selectedUser = { ...user };
    this.showModal = true;
    // Clear query params after opening modal
    this.router.navigate([], {
      queryParams: {},
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Load user by ID and open edit modal
   * Used when navigating from user detail page with query param
   */
  loadUserForEdit(userId: string): void {
    this.loading = true;
    this.usersService.usersControllerFindOne({ id: userId }).subscribe({
      next: (user: UserResponseDto) => {
        this.loading = false;
        this.openEditModal(user);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Failed to load user for editing.';
        console.error('Load user for edit error:', error);
        // Clear query params on error
        this.router.navigate([], {
          queryParams: {},
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
    // Clear query params when closing modal
    this.router.navigate([], {
      queryParams: {},
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Handle user saved
   */
  onUserSaved(user: UserResponseDto): void {
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
  deleteUser(user: UserResponseDto): void {
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
  toggleUserStatus(user: UserResponseDto): void {
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
  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
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
