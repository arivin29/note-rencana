import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertService, AlertStatistics, OfflineNodesSummary } from '../../../service/alert.service';
import { AuthService } from '../../../services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'alert-center',
  templateUrl: './alert-center.component.html',
  standalone: false
})
export class AlertCenterComponent implements OnInit, OnDestroy {
  loading = false;
  Math = Math; // Expose Math to template
  
  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  refreshInterval = 300000; // 5 minutes in milliseconds
  
  // Owner context for multi-tenant filtering
  private ownerId: string | null = null;
  
  statistics: AlertStatistics = {
    open: 0,
    acknowledged: 0,
    cleared: 0,
    total: 0,
    dateRange: '7d'
  };
  
  offlineSummary: OfflineNodesSummary = {
    warning: 0,
    critical: 0,
    total: 0
  };

  alerts: any[] = [];
  filters = {
    status: 'open',
    page: 1,
    limit: 20
  };
  
  // Pagination metadata
  totalAlerts = 0;
  totalPages = 0;

  constructor(
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get owner context from auth token
    this.ownerId = this.authService.getCurrentOwnerId();
    console.log('AlertCenter initialized with ownerId:', this.ownerId);
    
    this.loadStatistics();
    this.loadOfflineSummary();
    this.loadAlerts();
    
    // Setup auto-refresh every 5 minutes
    this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
      console.log('Auto-refreshing alerts...');
      this.loadStatistics();
      this.loadOfflineSummary();
      this.loadAlerts();
    });
  }
  
  ngOnDestroy() {
    // Cleanup subscription to prevent memory leaks
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadStatistics() {
    this.alertService.getAlertStatistics('7d', this.ownerId).subscribe({
      next: (response: any) => {
        // Handle if response is string
        let parsedData = response;
        if (typeof response === 'string') {
          try {
            parsedData = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse statistics:', e);
            return;
          }
        }
        this.statistics = { ...this.statistics, ...parsedData };
        console.log('Statistics loaded:', this.statistics);
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
      }
    });
  }

  loadOfflineSummary() {
    this.alertService.getOfflineNodesSummary(this.ownerId).subscribe({
      next: (response: any) => {
        // Handle if response is string
        let parsedData = response;
        if (typeof response === 'string') {
          try {
            parsedData = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse offline summary:', e);
            return;
          }
        }
        this.offlineSummary = parsedData;
        console.log('Offline summary loaded:', this.offlineSummary);
      },
      error: (err) => {
        console.error('Error loading offline summary:', err);
      }
    });
  }

  loadAlerts() {
    this.loading = true;
    this.alertService.getAlertEvents({ ...this.filters, ownerId: this.ownerId }).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        // Handle if response is string (shouldn't happen with proper SDK)
        let parsedData = response;
        if (typeof response === 'string') {
          try {
            parsedData = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse response:', e);
            this.alerts = [];
            return;
          }
        }
        
        // API returns { data: [...], total, page, limit }
        this.alerts = parsedData.data || parsedData || [];
        this.totalAlerts = parsedData.total || this.alerts.length;
        this.totalPages = Math.ceil(this.totalAlerts / this.filters.limit);
        console.log('Loaded alerts:', this.alerts.length, 'of', this.totalAlerts, 'total');
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading alerts:', err);
      }
    });
  }

  acknowledgeAlert(alert: any) {
    const note = prompt('Add acknowledgement note (optional):');
    if (note !== null) { // null = cancelled
      this.alertService.acknowledgeAlert(alert.idAlertEvent, note || undefined).subscribe({
        next: () => {
          alert.status = 'acknowledged';
          this.loadStatistics();
        },
        error: (err) => {
          console.error('Error acknowledging alert:', err);
          alert('Failed to acknowledge alert');
        }
      });
    }
  }

  clearAlert(alert: any) {
    const note = prompt('Add resolution note:');
    if (note) {
      this.alertService.clearAlert(alert.idAlertEvent, note).subscribe({
        next: () => {
          alert.status = 'cleared';
          this.loadStatistics();
          this.loadAlerts(); // Refresh list
        },
        error: (err) => {
          console.error('Error clearing alert:', err);
          alert('Failed to clear alert');
        }
      });
    }
  }

  filterByStatus(status: string) {
    this.filters.status = status;
    this.filters.page = 1; // Reset to page 1
    this.loadAlerts();
  }
  
  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadAlerts();
    }
  }
  
  nextPage() {
    if (this.filters.page < this.totalPages) {
      this.filters.page++;
      this.loadAlerts();
    }
  }
  
  previousPage() {
    if (this.filters.page > 1) {
      this.filters.page--;
      this.loadAlerts();
    }
  }
  
  get pages(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.filters.page - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
