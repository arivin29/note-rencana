import { Component, OnInit } from '@angular/core';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';

interface NodeListRow {
  idNode: string;
  code: string;
  project: string;
  projectId: string;
  owner?: string;
  status: 'online' | 'degraded' | 'offline';
  firmware?: string;
  telemetryMode: 'push' | 'pull';
  lastSeen?: string;
  serialNumber?: string;
}

@Component({
  selector: 'nodes-list',
  templateUrl: './nodes-list.html',
  styleUrls: ['./nodes-list.scss'],
  standalone: false
})
export class NodesListPage implements OnInit {
  filters = {
    owner: 'All Owners',
    project: 'All Projects',
    status: 'All Status'
  };
  searchTerm = '';

  pageSizeOptions = [10, 20, 50];
  pageSize = 10;
  currentPage = 1;

  nodes: NodeListRow[] = [];
  loading = false;
  error: string | null = null;
  
  // Statistics from backend
  totalNodes = 0;
  onlineNodes = 0;
  offlineNodes = 0;
  degradedNodes = 0;

  statusOptions = ['All Status', 'online', 'degraded', 'offline'];
  ownerOptions = ['All Owners'];
  projectOptions = ['All Projects'];

  constructor(private nodesService: NodesService) {}

  ngOnInit() {
    this.loadStatistics();
    this.loadNodes();
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

  loadNodes() {
    this.loading = true;
    this.error = null;
    
    this.nodesService.nodesControllerFindAll$Response({
      page: this.currentPage,
      limit: 100, // Load more for client-side filtering
      search: this.searchTerm || undefined,
    }).subscribe({
      next: (httpResponse) => {
        // Get response body and parse if it's a string
        let response: any = httpResponse.body;
        
        // If response is string, parse it
        if (typeof response === 'string') {
          response = JSON.parse(response);
        }
        
        console.log('Parsed response:', response);
        
        // Transform backend data to component format
        this.nodes = (response.data || []).map((node: any) => ({
          idNode: node.idNode,
          code: node.code,
          project: node.project?.name || 'Unknown Project',
          projectId: node.idProject,
          owner: node.project?.owner?.companyName || 'Unknown Owner',
          status: this.mapConnectivityStatus(node.connectivityStatus),
          firmware: node.firmwareVersion || 'N/A',
          telemetryMode: node.telemetryIntervalSec > 0 ? 'push' : 'pull',
          lastSeen: node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleString() : 'Never',
          serialNumber: node.serialNumber,
        }));
        
        console.log('Transformed nodes:', this.nodes);
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
    this.filters[type] = value;
    this.currentPage = 1;
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
    const nodes = this.filteredByOwnerProjectSearch;
    if (this.filters.status === 'All Status') {
      return nodes;
    }
    return nodes.filter((node) => node.status === this.filters.status);
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

  badgeClass(status: NodeListRow['status']) {
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
    const nodes = this.filteredByOwnerProjectSearch;
    if (option === 'All Status') {
      return nodes.length;
    }
    return nodes.filter((node) => node.status === option).length;
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

  private get filteredByOwnerProjectSearch() {
    const search = this.searchTerm.trim().toLowerCase();

    return this.nodes.filter((node) => {
      const matchOwner = this.filters.owner === 'All Owners' || node.owner === this.filters.owner;
      const matchProject = this.filters.project === 'All Projects' || node.project === this.filters.project;
      const matchSearch =
        !search ||
        node.code.toLowerCase().includes(search) ||
        node.project.toLowerCase().includes(search) ||
        (node.owner && node.owner.toLowerCase().includes(search));
      return matchOwner && matchProject && matchSearch;
    });
  }
}
