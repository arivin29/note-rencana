import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { AuthService } from '../../../../services/auth.service';
import { NodeResponseDto } from '../../../../../sdk/core/models/node-response-dto';
import { OwnerResponseDto } from '../../../../../sdk/core/models/owner-response-dto';
import { ProjectResponseDto } from '../../../../../sdk/core/models/project-response-dto';

@Component({
  selector: 'nodes-list',
  templateUrl: './nodes-list.html',
  styleUrls: ['./nodes-list.scss'],
  standalone: false
})
export class NodesListPage implements OnInit {
  filters = {
    owner: '',
    ownerId: '',
    project: 'All Projects',
    projectId: '',
    status: 'All Status'
  };
  searchTerm = '';
  
  // Query params filter
  projectIdFilter: string | null = null;

  pageSizeOptions = [10, 20, 50];
  pageSize = 10;
  currentPage = 1;

  nodes: NodeResponseDto[] = [];
  loading = false;
  error: string | null = null;
  
  // Statistics from backend
  totalNodes = 0;
  onlineNodes = 0;
  offlineNodes = 0;
  degradedNodes = 0;

  statusOptions = ['All Status', 'online', 'degraded', 'offline'];
  ownerOptions: OwnerResponseDto[] = [];
  projectOptions: ProjectResponseDto[] = [];
  
  // Admin detection
  isAdmin = false;
  currentUserRole = '';

  constructor(
    private nodesService: NodesService,
    private ownersService: OwnersService,
    private projectsService: ProjectsService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check if user is admin
    this.currentUserRole = this.authService.getCurrentUserRole();
    this.isAdmin = this.currentUserRole === 'admin' || this.currentUserRole === 'ADMIN';
    
    console.log('🔐 User role:', this.currentUserRole, 'Is Admin:', this.isAdmin);
    
    // Load owners first (for admin)
    if (this.isAdmin) {
      this.loadOwners();
    }
    
    // Read query params for projectId filter
    this.route.queryParams.subscribe(params => {
      this.projectIdFilter = params['projectId'] || null;
      
      if (this.projectIdFilter) {
        console.log('Filtering nodes by projectId:', this.projectIdFilter);
      }
      
      this.loadStatistics();
      this.loadNodes();
    });
  }

  loadStatistics() {
    this.nodesService.nodesControllerGetStatistics$Response().subscribe({
      next: (httpResponse) => {
        let stats: any = httpResponse.body;
        
        // If response is string, parse it
        if (typeof stats === 'string') {
          stats = JSON.parse(stats);
        }
        
        this.totalNodes = stats.totalNodes || 0;
        this.onlineNodes = stats.onlineNodes || 0;
        this.offlineNodes = stats.offlineNodes || 0;
        this.degradedNodes = stats.degradedNodes || 0;
      },
      error: (err) => {
        console.error('Failed to load statistics:', err);
      }
    });
  }

  loadOwners() {
    console.log('🔄 Loading owners for admin user...');
    this.ownersService.ownersControllerFindAll({ page: 1, limit: 200 }).subscribe({
      next: (response: any) => {
        console.log('✅ Owners response:', response);
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        const items = parsed?.data || parsed?.items || (Array.isArray(parsed) ? parsed : []);
        
        this.ownerOptions = items as OwnerResponseDto[];
        
        console.log('✅ Loaded owners:', this.ownerOptions.length, this.ownerOptions);
        
        // Auto-select first owner if available
        if (this.ownerOptions.length > 0 && !this.filters.ownerId) {
          this.onOwnerChange(this.ownerOptions[0].idOwner);
        }
      },
      error: (err) => {
        console.error('❌ Failed to load owners:', err);
      }
    });
  }

  loadProjects(ownerId: string) {
    console.log('🔄 Loading projects for owner:', ownerId);
    this.projectsService.projectsControllerFindAll({ page: 1, limit: 200, ownerId: ownerId }).subscribe({
      next: (response: any) => {
        console.log('✅ Projects response:', response);
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        const items = parsed?.data || parsed?.items || (Array.isArray(parsed) ? parsed : []);
        
        this.projectOptions = items as ProjectResponseDto[];
        
        console.log('✅ Loaded projects:', this.projectOptions.length, this.projectOptions);
      },
      error: (err) => {
        console.error('❌ Failed to load projects:', err);
      }
    });
  }

  onOwnerChange(ownerId: string) {
    console.log('👤 Owner changed:', ownerId);
    
    const selectedOwner = this.ownerOptions.find(o => o.idOwner === ownerId);
    this.filters.ownerId = ownerId;
    this.filters.owner = selectedOwner ? `${selectedOwner.ownerCode} - ${selectedOwner.name}` : '';
    
    // Clear project selection
    this.filters.projectId = '';
    this.filters.project = 'All Projects';
    this.projectOptions = [];
    
    // Load projects for selected owner
    if (ownerId) {
      this.loadProjects(ownerId);
    }
    
    // Reload nodes with owner filter
    this.currentPage = 1;
    this.loadNodes();
  }

  onProjectChange(projectId: string) {
    console.log('📁 Project changed:', projectId);
    
    const selectedProject = this.projectOptions.find(p => p.idProject === projectId);
    this.filters.projectId = projectId;
    this.filters.project = selectedProject ? selectedProject.name : 'All Projects';
    
    // Reload nodes with project filter
    this.currentPage = 1;
    this.loadNodes();
  }

  loadNodes() {
    this.loading = true;
    this.error = null;
    
    // Build query params
    const params: any = {
      page: this.currentPage,
      limit: 100, // Load more for client-side filtering
      search: this.searchTerm || undefined,
    };
    
    // Add owner filter (for admin)
    if (this.filters.ownerId) {
      params.ownerId = this.filters.ownerId;
    }
    
    // Add project filter
    if (this.filters.projectId) {
      params.idProject = this.filters.projectId;
    }
    
    // Add projectId filter if present (from query params)
    if (this.projectIdFilter) {
      params.idProject = this.projectIdFilter;
    }
    
    this.nodesService.nodesControllerFindAll$Response(params).subscribe({
      next: (httpResponse) => {
        // Get response body and parse if it's a string
        let response: any = httpResponse.body;
        
        // If response is string, parse it
        if (typeof response === 'string') {
          response = JSON.parse(response);
        }
        
        console.log('Parsed response:', response);
        
        // Store nodes directly from response
        this.nodes = (response.data || []) as NodeResponseDto[];
        
        console.log('Loaded nodes:', this.nodes);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load nodes';
        this.loading = false;
        console.error('Error loading nodes:', err);
      }
    });
  }

  private mapConnectivityStatus(status: string): 'online' | 'degraded' | 'offline' {
    if (status === 'online') return 'online';
    if (status === 'degraded') return 'degraded';
    return 'offline';
  }

  setFilter(type: 'owner' | 'project' | 'status', value: string) {
    // Status filter only (client-side)
    if (type === 'status') {
      this.filters[type] = value;
      this.currentPage = 1;
    }
    // Owner and project filters are handled by onOwnerChange and onProjectChange
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.currentPage = 1;
    this.loadNodes(); // Reload with new search
  }

  changePageSize(size: number | string) {
    const parsed = Number(size);
    if (!isNaN(parsed) && parsed > 0) {
      this.pageSize = parsed;
      this.currentPage = 1;
    }
  }

  goToPage(page: number) {
    const totalPages = this.totalPages;
    if (page < 1 || page > totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
  }

  get filteredNodes() {
    // Only filter by status (client-side)
    if (this.filters.status === 'All Status') {
      return this.nodes;
    }
    return this.nodes.filter((node) => node.connectivityStatus === this.filters.status);
  }

  get paginatedNodes() {
    const nodes = this.filteredNodes;
    const totalPages = this.computeTotalPages(nodes.length);
    const currentPage = this.normalizeCurrentPage(totalPages);
    const start = (currentPage - 1) * this.pageSize;
    return nodes.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return this.computeTotalPages(this.filteredNodes.length);
  }

  get pageNumbers() {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginationStart() {
    if (!this.filteredNodes.length) {
      return 0;
    }
    const currentPage = this.normalizeCurrentPage(this.totalPages);
    return (currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd() {
    if (!this.filteredNodes.length) {
      return 0;
    }
    return Math.min(this.paginationStart + this.pageSize - 1, this.filteredNodes.length);
  }

  get totalEntries() {
    return this.filteredNodes.length;
  }

  badgeClass(status: string) {
    switch (status) {
      case 'online':
        return 'badge bg-success';
      case 'degraded':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }

  statusCount(option: string) {
    if (option === 'All Status') {
      return this.nodes.length;
    }
    return this.nodes.filter((node) => node.connectivityStatus === option).length;
  }

  // Helper methods for template
  getProjectName(node: NodeResponseDto): string {
    return (node.project as any)?.name || 'Unknown Project';
  }

  getOwnerName(node: NodeResponseDto): string {
    return (node.project as any)?.owner?.name || 'Unknown Owner';
  }

  getTelemetryMode(node: NodeResponseDto): string {
    return node.telemetryIntervalSec > 0 ? 'Push' : 'Pull';
  }

  private computeTotalPages(count: number) {
    return count === 0 ? 1 : Math.ceil(count / this.pageSize);
  }

  private normalizeCurrentPage(totalPages: number) {
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    return this.currentPage;
  }
}
