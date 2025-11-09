import { Component } from '@angular/core';
import { ReportNodeListRow } from '../../../../models/iot';

@Component({
  selector: 'nodes-list',
  templateUrl: './nodes-list.html',
  styleUrls: ['./nodes-list.scss'],
  standalone: false
})
export class NodesListPage {
  filters = {
    owner: 'All Owners',
    project: 'All Projects',
    status: 'All Status'
  };
  searchTerm = '';

  pageSizeOptions = [10, 20, 50];
  pageSize = 10;
  currentPage = 1;

  nodes: ReportNodeListRow[] = this.generateDemoNodes();

  statusOptions = ['All Status', 'online', 'degraded', 'offline'];
  ownerOptions = ['All Owners', 'PT ABC', 'PT XYZ', 'PT Delta', 'PT Citra', 'PT Mandiri'];
  projectOptions = ['All Projects', 'Area A', 'Plant South', 'Booster West', 'Reservoir B', 'Pipeline North', 'Kebun Timur'];

  setFilter(type: 'owner' | 'project' | 'status', value: string) {
    this.filters[type] = value;
    this.currentPage = 1;
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.currentPage = 1;
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

  badgeClass(status: ReportNodeListRow['status']) {
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
        node.owner.toLowerCase().includes(search);
      return matchOwner && matchProject && matchSearch;
    });
  }

  private generateDemoNodes(): ReportNodeListRow[] {
    const owners = ['PT ABC', 'PT XYZ', 'PT Delta', 'PT Citra', 'PT Mandiri'];
    const projects = ['Area A', 'Plant South', 'Booster West', 'Reservoir B', 'Pipeline North', 'Kebun Timur'];
    const statuses: ReportNodeListRow['status'][] = ['online', 'degraded', 'offline'];
    const telemetryModes: ReportNodeListRow['telemetryMode'][] = ['push', 'pull'];

    const nodes: ReportNodeListRow[] = [];

    for (let i = 1; i <= 48; i++) {
      const owner = owners[i % owners.length];
      const project = projects[i % projects.length];
      const status = statuses[i % statuses.length];
      const telemetryMode = telemetryModes[i % telemetryModes.length];
      const firmware = `v${1 + (i % 3)}.${(i * 2) % 10}.${(i * 7) % 4}`;
      const minutes = (i * 3) % 60;
      const lastSeen = `${(8 + (i % 3)).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} UTC`;

      nodes.push({
        code: `NODE-${i.toString().padStart(3, '0')}`,
        project,
        owner,
        status,
        firmware,
        telemetryMode,
        lastSeen
      });
    }

    return nodes;
  }
}
