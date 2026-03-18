import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MlAnomaliesService, MlDashboardService } from 'src/sdk/core/services';
import { AnomalySummaryDto, AnomalyResponseDto } from 'src/sdk/core/models';
import { AuthService } from '../../../services/auth.service';

interface QuickStat {
  icon: string;
  iconClass: string;
  value: string | number;
  label: string;
  link: string;
  severity?: string;
}

interface GradeStat {
  grade: string;
  count: number;
  percent: number;
}

@Component({
  selector: 'ml-dashboard-page',
  templateUrl: './ml-dashboard.html',
  styleUrls: ['./ml-dashboard.scss'],
  standalone: false
})
export class MlDashboardPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  error: string | null = null;
  
  // Dashboard data
  summary: AnomalySummaryDto | null = null;
  recentAnomalies: any[] = [];
  
  // Quick stats
  quickStats: QuickStat[] = [];
  gradeStats: GradeStat[] = [];
  
  // Filter state
  selectedTimeRange = '24h';
  
  constructor(
    private anomaliesService: MlAnomaliesService,
    private dashboardService: MlDashboardService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.loadDashboard();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadDashboard(): void {
    this.loading = true;
    this.error = null;
    
    // Load anomaly summary using SDK
    this.anomaliesService.anomaliesControllerGetSummary()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (data) => {
          this.summary = data;
          this.buildQuickStats();
          this.buildGradeStats();
        },
        error: (err) => {
          console.error('Failed to load summary:', err);
          this.error = 'Gagal memuat ringkasan anomali';
        }
      });
    
    // Load recent anomalies using SDK
    this.anomaliesService.anomaliesControllerFindAll$Response({ 
      limit: 8, 
      isAcknowledged: false 
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.recentAnomalies = response.body?.data || response.body || [];
        },
        error: (err) => {
          console.error('Failed to load anomalies:', err);
        }
      });
  }
  
  buildQuickStats(): void {
    if (!this.summary) return;
    
    this.quickStats = [
      {
        icon: 'bi bi-exclamation-diamond',
        iconClass: 'icon-danger',
        value: this.summary.totalAnomalies || 0,
        label: 'Total Anomali',
        link: '/iot/ml/anomalies'
      },
      {
        icon: 'bi bi-x-octagon-fill',
        iconClass: 'icon-danger',
        value: this.summary.criticalCount || 0,
        label: 'Kritis',
        link: '/iot/ml/anomalies',
        severity: 'critical'
      },
      {
        icon: 'bi bi-clock-history',
        iconClass: 'icon-warning',
        value: this.summary.unacknowledgedCount || 0,
        label: 'Belum Diproses',
        link: '/iot/ml/anomalies'
      },
      {
        icon: 'bi bi-activity',
        iconClass: 'icon-info',
        value: this.summary.affectedSensors || 0,
        label: 'Sensor Terpengaruh',
        link: '/iot/ml/anomalies'
      }
    ];
  }
  
  buildGradeStats(): void {
    if (!this.summary) return;
    
    const total = this.summary.totalAnomalies || 1;
    this.gradeStats = [
      { grade: 'critical', count: this.summary.criticalCount || 0, percent: ((this.summary.criticalCount || 0) / total) * 100 },
      { grade: 'severe', count: this.summary.severeCount || 0, percent: ((this.summary.severeCount || 0) / total) * 100 },
      { grade: 'moderate', count: this.summary.moderateCount || 0, percent: ((this.summary.moderateCount || 0) / total) * 100 },
      { grade: 'mild', count: this.summary.mildCount || 0, percent: ((this.summary.mildCount || 0) / total) * 100 }
    ];
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
  
  getGradeClass(grade: string): string {
    const classes: Record<string, string> = {
      critical: 'grade-critical',
      severe: 'grade-severe',
      moderate: 'grade-moderate',
      mild: 'grade-mild'
    };
    return classes[grade] || '';
  }
  
  getGradeBadgeClass(grade: string): string {
    const classes: Record<string, string> = {
      critical: 'bg-danger',
      severe: 'bg-orange',
      moderate: 'bg-warning text-dark',
      mild: 'bg-yellow text-dark'
    };
    return classes[grade] || 'bg-secondary';
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
  
  acknowledgeAnomaly(anomaly: any): void {
    const id = anomaly.idAnomalyResult;
    const userId = this.authService.currentUserValue?.idUser || 'system';
    this.anomaliesService.anomaliesControllerAcknowledge({ 
      id, 
      body: { acknowledgedBy: userId } 
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recentAnomalies = this.recentAnomalies.filter(a => a.idAnomalyResult !== id);
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
