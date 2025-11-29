import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AuditService } from '@sdk/core/services/audit.service';
import { interval, Subscription } from 'rxjs';

interface AuditLog {
  idAuditLog: string;
  idUser: string | null;
  userName?: string;
  userEmail?: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  status: string;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestMethod: string | null;
  requestUrl: string | null;
  oldValues: any;
  newValues: any;
  createdAt: Date;
}

@Component({
  selector: 'app-audit-logs-list',
  templateUrl: './audit-logs-list.component.html',
  styleUrls: ['./audit-logs-list.component.css'],
  standalone: false
})
export class AuditLogsListComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  loading: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 20;
  totalLogs: number = 0;
  totalPages: number = 0;
  
  // Filters
  searchQuery: string = '';
  filterUser: string = '';
  filterAction: string = '';
  filterEntityType: string = '';
  filterStatus: string = '';
  filterDateFrom: string = '';
  filterDateTo: string = '';
  
  // Available filter options
  actions: string[] = [
    'login', 'logout', 'create', 'update', 'delete', 
    'password_change', 'status_change'
  ];
  
  entityTypes: string[] = [
    'User', 'Node', 'Sensor', 'Owner', 'Project', 
    'Alert', 'Notification'
  ];
  
  statuses: string[] = ['success', 'failure'];
  
  // Sorting
  sortBy: string = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Detail modal
  showDetailModal: boolean = false;
  selectedLog: AuditLog | null = null;
  
  // Auto refresh
  autoRefresh: boolean = false;
  refreshInterval: number = 30000; // 30 seconds
  private refreshSubscription?: Subscription;
  
  // Messages
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private auditService: AuditService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is admin
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }
    
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Load audit logs with filters and pagination
   */
  loadLogs(): void {
    this.loading = true;
    this.errorMessage = '';
    
    // Prepare API parameters
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };
    
    // Add filters if set
    if (this.searchQuery) {
      params.search = this.searchQuery;
    }
    
    if (this.filterUser) {
      params.idUser = this.filterUser;
    }
    
    if (this.filterAction) {
      params.action = this.filterAction;
    }
    
    if (this.filterEntityType) {
      params.entityType = this.filterEntityType;
    }
    
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    
    if (this.filterDateFrom) {
      params.dateFrom = this.filterDateFrom;
    }
    
    if (this.filterDateTo) {
      params.dateTo = this.filterDateTo;
    }
    
    // Call the API
    this.auditService.auditControllerFindAll$Response(params).subscribe({
      next: (response: any) => {
        try {
          // Parse the response body
          const body = JSON.parse(response.body || '{}');
          
          // Map the logs data
          this.logs = (body.data || []).map((log: any) => ({
            idAuditLog: log.idAuditLog,
            idUser: log.idUser,
            userName: log.user?.name,
            userEmail: log.user?.email,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            status: log.status,
            description: log.description,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            requestMethod: log.requestMethod,
            requestUrl: log.requestUrl,
            oldValues: log.oldValues,
            newValues: log.newValues,
            createdAt: new Date(log.createdAt)
          }));
          
          // Handle pagination metadata
          if (body.meta) {
            this.totalLogs = body.meta.total || 0;
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
        console.error('Error loading audit logs:', error);
        this.errorMessage = error.error?.message || 'Failed to load audit logs. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Search logs
   */
  onSearch(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  /**
   * Handle filter change
   */
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.searchQuery = '';
    this.filterUser = '';
    this.filterAction = '';
    this.filterEntityType = '';
    this.filterStatus = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.currentPage = 1;
    this.loadLogs();
  }

  /**
   * Handle column sort
   */
  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'desc';
    }
    this.loadLogs();
  }

  /**
   * Handle page change
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  /**
   * Open detail modal
   */
  openDetailModal(log: AuditLog): void {
    this.selectedLog = log;
    this.showDetailModal = true;
  }

  /**
   * Close detail modal
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedLog = null;
  }

  /**
   * Toggle auto refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  /**
   * Start auto refresh
   */
  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
      this.loadLogs();
    });
  }

  /**
   * Stop auto refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Export to CSV
   */
  exportToCSV(): void {
    // TODO: Implement CSV export
    this.successMessage = 'Export feature coming soon!';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
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
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    return status === 'success' ? 'badge-success' : 'badge-danger';
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
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get showing from index
   */
  getShowingFrom(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /**
   * Get showing to index
   */
  getShowingTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalLogs);
  }
}
