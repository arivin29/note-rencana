import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MlService, AnomalyResponse, AnomalyQueryParams } from '../ml.service';

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
  anomalies: AnomalyResponse[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  
  // Filters
  filters: AnomalyQueryParams = {
    limit: 20,
    offset: 0
  };
  selectedGrade = '';
  selectedAcknowledged = '';
  searchTerm = '';
  
  // Sort
  sortField = 'detectedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Selected items
  selectedAnomalies: Set<string> = new Set();
  selectAll = false;
  
  constructor(private mlService: MlService) {}
  
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
    
    const params: AnomalyQueryParams = {
      ...this.filters,
      limit: this.pageSize,
      offset: (this.currentPage - 1) * this.pageSize
    };
    
    if (this.selectedGrade) {
      params.minGrade = this.selectedGrade;
    }
    
    if (this.selectedAcknowledged !== '') {
      params.isAcknowledged = this.selectedAcknowledged === 'true';
    }
    
    this.mlService.getAnomalies(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.anomalies = data;
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
    this.selectedAcknowledged = value;
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
    
    ids.forEach(id => {
      this.mlService.acknowledgeAnomaly(id)
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
  
  acknowledgeOne(anomaly: AnomalyResponse): void {
    this.mlService.acknowledgeAnomaly(anomaly.idAnomalyResult)
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
    this.selectedAcknowledged = '';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadAnomalies();
  }
}
