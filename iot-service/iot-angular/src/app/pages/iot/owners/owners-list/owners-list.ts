import { Component, OnInit } from '@angular/core';
import { OwnersService } from '../../../../../sdk/core/services';
import { PaginatedResponseDto, OwnerResponseDto } from '../../../../../sdk/core/models';

type OwnerStatus = 'active' | 'trial' | 'suspended';

interface OwnerSummary {
  idOwner: string;
  name: string;
  industry?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  slaLevel: string;
  projects: number;
  nodes: number;
  sensors: number;
  alerts: number;
  status: OwnerStatus;
  address: string;
  lastActivity: string;
}

@Component({
  selector: 'owners-list',
  templateUrl: './owners-list.html',
  styleUrls: ['./owners-list.scss'],
  standalone: false
})
export class OwnersListPage implements OnInit {
  owners: OwnerSummary[] = [];
  
  // Loading & Error state
  loading = false;
  error: string | null = null;
  
  // Total from backend
  totalRecords = 0;

  filters = {
    status: 'All Status',
    industry: 'All Industry'
  };
  searchTerm = '';

  pageSizeOptions = [10, 20, 50];
  pageSize = 10;
  currentPage = 1;

  statusOptions: Array<'All Status' | OwnerStatus> = ['All Status', 'active', 'trial', 'suspended'];
  industryOptions: string[] = ['All Industry'];

  constructor(private ownersService: OwnersService) {}

  ngOnInit() {
    this.loadOwners();
    this.loadIndustries();
  }

  /**
   * Load owners from API
   */
  loadOwners() {
    this.loading = true;
    this.error = null;

    // Build filter parameters
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };

    // Add search if exists
    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }

    // Add industry filter if not "All"
    if (this.filters.industry !== 'All Industry') {
      params.industry = this.filters.industry;
    }

    // Add status filter if not "All" (if backend supports it)
    // Note: Backend mungkin belum ada filter status, jadi kita filter di frontend dulu
    
    this.ownersService.ownersControllerFindAll(params).subscribe(
      (response: PaginatedResponseDto) => {
        this.loading = false;
        
        // Map backend data to frontend format
        const backendOwners = (response.data || []) as any[];
        this.owners = backendOwners.map(owner => this.mapOwnerToSummary(owner));
        
        // Update total records
        this.totalRecords = response.meta?.total || 0;
        
        console.log('Owners loaded:', this.owners);
      },
      (err: any) => {
        this.loading = false;
        this.error = err.message || 'Failed to load owners';
        console.error('Error loading owners:', err);
      }
    );
  }

  /**
   * Load unique industries for filter
   */
  loadIndustries() {
    // Get all owners without pagination to extract unique industries
    this.ownersService.ownersControllerFindAll({ limit: 1000 }).subscribe(
      (response: PaginatedResponseDto) => {
        const backendOwners = (response.data || []) as any[];
        const industries = new Set(
          backendOwners
            .map(o => o.industry)
            .filter(i => i && i.trim())
        );
        this.industryOptions = ['All Industry', ...Array.from(industries)];
      },
      (err: any) => {
        console.error('Error loading industries:', err);
      }
    );
  }

  /**
   * Map backend owner data to frontend OwnerSummary
   */
  private mapOwnerToSummary(owner: any): OwnerSummary {
    return {
      idOwner: owner.id || owner.idOwner || '',
      name: owner.name || 'Unknown',
      industry: owner.industry || 'Unspecified',
      contactPerson: owner.contactPerson || '-',
      contactEmail: owner.email || owner.contactEmail || '-',
      contactPhone: owner.phone || owner.contactPhone || '-',
      slaLevel: owner.slaLevel || 'bronze',
      projects: owner.totalProjects || 0,
      nodes: owner.totalNodes || 0,
      sensors: owner.totalSensors || 0,
      alerts: owner.alertCount || 0,
      status: this.mapStatus(owner.status),
      address: owner.address || owner.location || '-',
      lastActivity: this.formatLastActivity(owner.updatedAt || owner.lastActivity)
    };
  }

  /**
   * Map backend status to frontend status
   */
  private mapStatus(status: any): OwnerStatus {
    if (!status) return 'active';
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'trial' || statusStr === 'suspended') {
      return statusStr as OwnerStatus;
    }
    return 'active';
  }

  /**
   * Format last activity date
   */
  private formatLastActivity(date: any): string {
    if (!date) return '-';
    
    try {
      const d = new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
      } else if (diffHours < 48) {
        return 'Yesterday';
      } else {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (e) {
      return String(date);
    }
  }

  setFilter(type: 'status' | 'industry', value: string) {
    this.filters[type] = value;
    this.currentPage = 1;
    this.loadOwners(); // Reload with new filter
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.currentPage = 1;
    
    // Debounce search - reload after typing stops
    // Simple implementation: reload immediately for now
    this.loadOwners();
  }

  changePageSize(size: number | string) {
    const parsed = Number(size);
    if (!isNaN(parsed) && parsed > 0) {
      this.pageSize = parsed;
      this.currentPage = 1;
      this.loadOwners(); // Reload with new page size
    }
  }

  goToPage(page: number) {
    const totalPages = this.totalPages;
    if (page < 1 || page > totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadOwners(); // Reload with new page
  }

  get filteredOwners() {
    // Status filter - apply on frontend since backend might not support it yet
    if (this.filters.status === 'All Status') {
      return this.owners;
    }
    return this.owners.filter(owner => owner.status === this.filters.status);
  }

  get paginatedOwners() {
    // Data already paginated from backend
    return this.filteredOwners;
  }

  get totalPages() {
    // Calculate from totalRecords (from backend) and pageSize
    return this.totalRecords === 0 ? 1 : Math.ceil(this.totalRecords / this.pageSize);
  }

  get pageNumbers() {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginationStart() {
    if (!this.totalRecords) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd() {
    if (!this.totalRecords) {
      return 0;
    }
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  get totalEntries() {
    return this.totalRecords;
  }

  statusBadge(status: OwnerStatus) {
    switch (status) {
      case 'active':
        return 'badge bg-success-subtle text-success';
      case 'trial':
        return 'badge bg-info-subtle text-info';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  statusCount(option: 'All Status' | OwnerStatus) {
    if (option === 'All Status') {
      return this.totalRecords; // Total from backend
    }
    // Count from current loaded owners (frontend filter)
    return this.owners.filter((owner) => owner.status === option).length;
  }
}
