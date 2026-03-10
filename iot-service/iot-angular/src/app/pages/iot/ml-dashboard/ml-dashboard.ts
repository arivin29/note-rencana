import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MlService, DashboardSummary, AnomalyResponse, GradeSummary } from './ml.service';

@Component({
  selector: 'ml-dashboard-page',
  templateUrl: './ml-dashboard.html',
  styleUrls: ['./ml-dashboard.scss'],
  standalone: false
})
export class MlDashboardPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = true;
  error: string | null = null;
  
  // Dashboard data
  summary: DashboardSummary | null = null;
  recentAnomalies: AnomalyResponse[] = [];
  gradeSummary: GradeSummary[] = [];
  
  // Chart data
  anomalyTrendData: any[] = [];
  gradeDistributionData: any[] = [];
  
  // Filter state
  selectedTimeRange = '24h';
  
  constructor(private mlService: MlService) {}
  
  ngOnInit(): void {
    this.loadDashboard();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadDashboard(): void {
    this.isLoading = true;
    this.error = null;
    
    // Load dashboard summary
    this.mlService.getDashboardSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.summary = data;
          this.updateCharts();
        },
        error: (err) => {
          console.error('Failed to load dashboard summary:', err);
          this.error = 'Gagal memuat ringkasan dashboard';
        }
      });
    
    // Load recent anomalies
    this.mlService.getAnomalies({ limit: 10, isAcknowledged: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.recentAnomalies = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load anomalies:', err);
          this.isLoading = false;
        }
      });
    
    // Load grade summary
    this.mlService.getAnomalySummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.gradeSummary = data;
          this.updateGradeChart();
        },
        error: (err) => {
          console.error('Failed to load grade summary:', err);
        }
      });
  }
  
  updateCharts(): void {
    if (!this.summary) return;
    
    // Update anomaly trend data
    this.anomalyTrendData = [
      { label: 'Last 24h', value: this.summary.trends.anomaliesLast24h },
      { label: 'Last 7d', value: this.summary.trends.anomaliesLast7d }
    ];
  }
  
  updateGradeChart(): void {
    this.gradeDistributionData = this.gradeSummary.map(g => ({
      label: this.getGradeLabel(g.grade),
      value: g.count,
      color: this.getGradeColor(g.grade)
    }));
  }
  
  getGradeLabel(grade: string): string {
    const labels: Record<string, string> = {
      critical: 'Kritis',
      severe: 'Parah',
      moderate: 'Sedang',
      mild: 'Ringan'
    };
    return labels[grade] || grade;
  }
  
  getGradeColor(grade: string): string {
    const colors: Record<string, string> = {
      critical: '#dc2626',
      severe: '#ea580c',
      moderate: '#d97706',
      mild: '#ca8a04'
    };
    return colors[grade] || '#6b7280';
  }
  
  getGradeBadgeClass(grade: string): string {
    const classes: Record<string, string> = {
      critical: 'bg-danger',
      severe: 'bg-orange',
      moderate: 'bg-warning',
      mild: 'bg-yellow'
    };
    return classes[grade] || 'bg-secondary';
  }
  
  getTrendIcon(): string {
    if (!this.summary) return 'bi-dash';
    return this.summary.trends.changePercent >= 0 ? 'bi-arrow-up' : 'bi-arrow-down';
  }
  
  getTrendClass(): string {
    if (!this.summary) return 'text-secondary';
    return this.summary.trends.changePercent >= 0 ? 'text-danger' : 'text-success';
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  acknowledgeAnomaly(anomaly: AnomalyResponse): void {
    this.mlService.acknowledgeAnomaly(anomaly.idAnomalyResult)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove from list or mark as acknowledged
          this.recentAnomalies = this.recentAnomalies.filter(
            a => a.idAnomalyResult !== anomaly.idAnomalyResult
          );
          // Reload summary
          this.loadDashboard();
        },
        error: (err) => {
          console.error('Failed to acknowledge:', err);
        }
      });
  }
  
  onTimeRangeChange(range: string): void {
    this.selectedTimeRange = range;
    this.loadDashboard();
  }
  
  refreshData(): void {
    this.loadDashboard();
  }
}
