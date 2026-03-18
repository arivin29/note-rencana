import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MlAnomaliesService } from 'src/sdk/core/services';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'anomalies-list',
  templateUrl: './anomalies-list.html',
  styleUrls: ['./anomalies-list.scss'],
  standalone: false
})
export class AnomaliesListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  isLoading = true;
  anomalies: any[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  
  // Filters
  selectedGrade = '';
  selectedAcknowledged: boolean | null = null;
  searchTerm = '';
  
  // Sort
  sortField = 'detectedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Selected items
  selectedAnomalies: Set<string> = new Set();
  selectAll = false;
  
  constructor(
    private anomaliesService: MlAnomaliesService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.loadAnomalies();
    
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchTerm = term;
      this.currentPage = 1;
      this.loadAnomalies();
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadAnomalies(): void {
    this.isLoading = true;
    
    const params: any = {
      limit: this.pageSize,
      page: this.currentPage
    };
    
    if (this.selectedGrade) {
      params.minGrade = this.selectedGrade;
    }
    
    if (this.selectedAcknowledged !== null) {
      params.isAcknowledged = this.selectedAcknowledged;
    }
    
    this.anomaliesService.anomaliesControllerFindAll$Response(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let body = response.body;
          // Parse body if it's a string
          if (typeof body === 'string') {
            try {
              body = JSON.parse(body);
            } catch (e) {
              body = {};
            }
          }
          body = body || {};
          this.anomalies = body.data || [];
          this.totalItems = body.total || this.anomalies.length;
          console.log('Loaded anomalies:', this.anomalies.length, 'total:', this.totalItems);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load anomalies:', err);
          this.isLoading = false;
        }
      });
  }
  
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }
  
  onGradeFilter(grade: string): void {
    this.selectedGrade = grade;
    this.currentPage = 1;
    this.loadAnomalies();
  }
  
  onAcknowledgedFilter(value: string): void {
    if (value === '') {
      this.selectedAcknowledged = null;
    } else {
      this.selectedAcknowledged = value === 'true';
    }
    this.currentPage = 1;
    this.loadAnomalies();
  }
  
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadAnomalies();
  }
  
  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'desc';
    }
    this.loadAnomalies();
  }
  
  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'bi-chevron-expand';
    return this.sortOrder === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }
  
  toggleSelectAll(): void {
    if (this.selectAll) {
      this.anomalies.forEach(a => this.selectedAnomalies.add(a.idAnomalyResult));
    } else {
      this.selectedAnomalies.clear();
    }
  }
  
  toggleSelect(id: string): void {
    if (this.selectedAnomalies.has(id)) {
      this.selectedAnomalies.delete(id);
    } else {
      this.selectedAnomalies.add(id);
    }
    this.selectAll = this.selectedAnomalies.size === this.anomalies.length;
  }
  
  isSelected(id: string): boolean {
    return this.selectedAnomalies.has(id);
  }
  
  acknowledgeSelected(): void {
    const ids = Array.from(this.selectedAnomalies);
    let completed = 0;
    const userId = this.authService.currentUserValue?.idUser || 'system';
    
    ids.forEach(id => {
      this.anomaliesService.anomaliesControllerAcknowledge({ 
        id, 
        body: { acknowledgedBy: userId } 
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            completed++;
            if (completed === ids.length) {
              this.selectedAnomalies.clear();
              this.selectAll = false;
              this.loadAnomalies();
            }
          }
        });
    });
  }
  
  acknowledgeOne(anomaly: any): void {
    const userId = this.authService.currentUserValue?.idUser || 'system';
    this.anomaliesService.anomaliesControllerAcknowledge({ 
      id: anomaly.idAnomalyResult, 
      body: { acknowledgedBy: userId } 
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadAnomalies();
        },
        error: (err) => {
          console.error('Failed to acknowledge:', err);
        }
      });
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
  
  getGradeBadgeClass(grade: string): string {
    const classes: Record<string, string> = {
      critical: 'bg-danger',
      severe: 'bg-orange',
      moderate: 'bg-warning',
      mild: 'bg-yellow'
    };
    return classes[grade] || 'bg-secondary';
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  formatNumber(value: number): string {
    return value?.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-';
  }
  
  getDisplayEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems || this.anomalies.length);
  }
  
  clearFilters(): void {
    this.selectedGrade = '';
    this.selectedAcknowledged = null;
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadAnomalies();
  }
}
