import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertService, AlertStatistics, OfflineNodesSummary } from '../../../service/alert.service';
import { AuthService } from '../../../services/auth.service';
import { OwnersService } from '../../../../sdk/core/services/owners.service';
import { OwnerResponseDto } from '../../../../sdk/core/models/owner-response-dto';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'alert-center',
  templateUrl: './alert-center.component.html',
  standalone: false
})
export class AlertCenterComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  Math = Math; // Expose Math to template

  // Auto-refresh every 5 minutes
  private refreshSubscription?: Subscription;
  refreshInterval = 300000;

  // Owner context for multi-tenant filtering
  private tenantOwnerId: string | null = null;
  isAdmin = false;
  ownerOptions: OwnerResponseDto[] = [];
  selectedOwnerId = '';

  // Alert categories (rule types) discovered from statistics
  ruleTypes: string[] = [];

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
  statusOptions: Array<'open' | 'acknowledged' | 'cleared'> = ['open', 'acknowledged', 'cleared'];
  filters = {
    status: 'open',
    ruleType: '',
    page: 1,
    limit: 20
  };
  pageSizeOptions = [10, 20, 50, 100];

  totalAlerts = 0;
  totalPages = 0;

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    private ownersService: OwnersService
  ) {}

  ngOnInit() {
    this.tenantOwnerId = this.authService.getCurrentOwnerId();
    this.isAdmin = !this.tenantOwnerId;
    if (this.isAdmin) {
      this.loadOwners();
    }

    this.refreshAll();
    this.refreshSubscription = interval(this.refreshInterval).subscribe(() => this.refreshAll());
  }

  private get ownerId(): string | null {
    return this.isAdmin ? (this.selectedOwnerId || null) : this.tenantOwnerId;
  }

  private loadOwners() {
    this.ownersService.ownersControllerFindAll({ page: 1, limit: 200 } as any).subscribe({
      next: (response: any) => {
        const parsed = this.parseBody(response);
        this.ownerOptions = parsed?.data || (Array.isArray(parsed) ? parsed : []);
      },
      error: (err) => console.error('Error loading owners:', err)
    });
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  refreshAll() {
    this.loadStatistics();
    this.loadOfflineSummary();
    this.loadAlerts();
  }

  loadStatistics() {
    this.alertService.getAlertStatistics('7d', this.ownerId).subscribe({
      next: (response: any) => {
        const parsed = this.parseBody(response);
        if (parsed) {
          this.statistics = { ...this.statistics, ...parsed };
          const types = Object.keys(parsed.byType || {});
          if (types.length) this.ruleTypes = types.sort();
        }
      },
      error: (err) => console.error('Error loading statistics:', err)
    });
  }

  loadOfflineSummary() {
    this.alertService.getOfflineNodesSummary(this.ownerId).subscribe({
      next: (response: any) => {
        const parsed = this.parseBody(response);
        if (parsed) this.offlineSummary = parsed;
      },
      error: (err) => console.error('Error loading offline summary:', err)
    });
  }

  loadAlerts() {
    this.loading = true;
    this.error = null;
    this.alertService.getAlertEvents({ ...this.filters, ownerId: this.ownerId }).subscribe({
      next: (response: any) => {
        this.loading = false;
        const parsed = this.parseBody(response);
        if (!parsed) {
          this.alerts = [];
          return;
        }
        // API returns { data: [...], total, page, limit }
        this.alerts = parsed.data || parsed || [];
        this.totalAlerts = parsed.total || this.alerts.length;
        this.totalPages = Math.ceil(this.totalAlerts / this.filters.limit);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load alerts';
      }
    });
  }

  private parseBody(response: any): any {
    if (typeof response !== 'string') return response;
    try {
      return JSON.parse(response);
    } catch {
      return null;
    }
  }

  acknowledgeAlert(alertEvent: any) {
    const note = prompt('Add acknowledgement note (optional):');
    if (note === null) return; // cancelled
    this.alertService.acknowledgeAlert(alertEvent.idAlertEvent, note || undefined).subscribe({
      next: () => {
        alertEvent.status = 'acknowledged';
        this.loadStatistics();
      },
      error: (err) => {
        console.error('Error acknowledging alert:', err);
        window.alert('Failed to acknowledge alert');
      }
    });
  }

  clearAlert(alertEvent: any) {
    const note = prompt('Add resolution note:');
    if (!note) return;
    this.alertService.clearAlert(alertEvent.idAlertEvent, note).subscribe({
      next: () => {
        this.loadStatistics();
        this.loadAlerts();
      },
      error: (err) => {
        console.error('Error clearing alert:', err);
        window.alert('Failed to clear alert');
      }
    });
  }

  filterByStatus(status: string) {
    this.filters.status = status;
    this.filters.page = 1;
    this.loadAlerts();
  }

  changeCategory(ruleType: string) {
    this.filters.ruleType = ruleType;
    this.filters.page = 1;
    this.loadAlerts();
  }

  changeOwner(ownerId: string) {
    this.selectedOwnerId = ownerId;
    this.filters.page = 1;
    this.refreshAll();
  }

  statusCount(status: string): number {
    return (this.statistics as any)[status] ?? 0;
  }

  // ---- display helpers ----

  channelOf(alertEvent: any) {
    return alertEvent?.alertRule?.sensorChannel;
  }

  sensorOf(alertEvent: any) {
    return this.channelOf(alertEvent)?.sensor;
  }

  nodeOf(alertEvent: any) {
    return alertEvent?.node || this.sensorOf(alertEvent)?.node;
  }

  severityOf(alertEvent: any): string | undefined {
    return alertEvent?.severity || alertEvent?.alertRule?.severity;
  }

  locationOf(alertEvent: any): string {
    const node = this.nodeOf(alertEvent);
    if (!node) return '';
    let address = node.address || '';
    if (address.length > 40) address = address.slice(0, 40) + '...';
    return [node.city, address].filter(Boolean).join(' · ');
  }

  ruleTypeLabel(alertEvent: any): string {
    return (alertEvent?.alertRule?.ruleType || 'unknown').replace(/_/g, ' ');
  }

  ruleTypeText(ruleType: string): string {
    return (ruleType || '').replace(/_/g, ' ');
  }

  isOfflineRule(alertEvent: any): boolean {
    return alertEvent?.alertRule?.ruleType === 'node_offline';
  }

  valueUnit(alertEvent: any): string {
    if (this.isOfflineRule(alertEvent)) return 'min offline';
    return this.channelOf(alertEvent)?.unit || '';
  }

  severityBadge(severity?: string): string {
    switch (severity) {
      case 'critical': return 'badge bg-danger-subtle text-danger';
      case 'warning': return 'badge bg-warning-subtle text-warning';
      case 'info': return 'badge bg-info-subtle text-info';
      default: return 'badge bg-secondary-subtle text-secondary';
    }
  }

  statusBadge(status?: string): string {
    switch (status) {
      case 'open': return 'badge bg-danger-subtle text-danger';
      case 'acknowledged': return 'badge bg-warning-subtle text-warning';
      case 'cleared': return 'badge bg-success-subtle text-success';
      default: return 'badge bg-secondary-subtle text-secondary';
    }
  }

  // ---- pagination ----

  changePageSize(size: number) {
    this.filters.limit = +size;
    this.filters.page = 1;
    this.loadAlerts();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.filters.page) {
      this.filters.page = page;
      this.loadAlerts();
    }
  }

  get pages(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.filters.page - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get paginationStart(): number {
    return this.totalAlerts === 0 ? 0 : (this.filters.page - 1) * this.filters.limit + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.filters.page * this.filters.limit, this.totalAlerts);
  }
}
