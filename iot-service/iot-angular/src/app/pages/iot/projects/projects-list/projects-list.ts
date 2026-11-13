import { Component, OnInit } from '@angular/core';
import { ProjectAreaType, ReportProject } from '../../../../models/iot';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';

type ProjectStatus = 'active' | 'maintenance' | 'offline';
type SortKey = 'name' | 'owner' | 'nodes' | 'alerts' | 'lastSync';

interface ProjectSummary extends Pick<ReportProject, 'idProject' | 'idOwner' | 'owner' | 'name' | 'areaType'> {
  status: ProjectStatus;
  nodes: number;
  sensors: number;
  online: number;
  alerts: number;
  location: string;
  lastSync: string;
  lastSyncAt: number;
}

interface OwnerFilterOption {
  label: string;
  value: string | null;
}

interface AreaFilterOption {
  label: string;
  value: ProjectAreaType | null;
}

interface SortOption {
  label: string;
  value: SortKey;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'projects-list',
  templateUrl: './projects-list.html',
  styleUrls: ['./projects-list.scss'],
  standalone: false
})
export class ProjectsListPage implements OnInit {
  projects: ProjectSummary[] = [];

  filters = {
    ownerId: null as string | null,
    ownerLabel: 'All Owners',
    areaType: null as ProjectAreaType | null,
    areaLabel: 'All Areas',
    status: 'All Status' as 'All Status' | ProjectStatus
  };
  searchTerm = '';

  statusOptions: Array<'All Status' | ProjectStatus> = ['All Status', 'active', 'maintenance', 'offline'];
  ownerOptions: OwnerFilterOption[] = [{ label: 'All Owners', value: null }];
  areaOptions: AreaFilterOption[] = [
    { label: 'All Areas', value: null },
    { label: 'Plant', value: 'plant' },
    { label: 'Pipeline', value: 'pipeline' },
    { label: 'Farm', value: 'farm' },
    { label: 'Industrial', value: 'industrial' },
    { label: 'Other', value: 'other' }
  ];

  sortOptions: SortOption[] = [
    { label: 'Nama A–Z', value: 'name', direction: 'asc' },
    { label: 'Nama Z–A', value: 'name', direction: 'desc' },
    { label: 'Owner A–Z', value: 'owner', direction: 'asc' },
    { label: 'Node terbanyak', value: 'nodes', direction: 'desc' },
    { label: 'Alert terbanyak', value: 'alerts', direction: 'desc' },
    { label: 'Sync terbaru', value: 'lastSync', direction: 'desc' }
  ];
  sortOption: SortOption = this.sortOptions[0];

  pageSizeOptions = [6, 9, 12, 24];
  pageSize = 9;
  currentPage = 1;

  loading = false;
  error: string | null = null;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(private projectsService: ProjectsService, private ownersService: OwnersService) {}

  ngOnInit(): void {
    this.loadOwners();
    this.loadProjects();
  }

  loadProjects() {
    this.loading = true;
    this.error = null;

    this.projectsService
      .projectsControllerFindAll$Response({
        page: 1,
        limit: 200,
        search: this.searchTerm?.trim() || undefined,
        ownerId: this.filters.ownerId || undefined
      })
      .subscribe({
        next: (response) => {
          const payload = this.parseBody(response.body);
          const items = this.extractDataArray(payload);
          this.projects = items
            .map((project: any) => this.mapProject(project))
            .filter((project): project is ProjectSummary => !!project.idProject);
          this.currentPage = 1;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.message || 'Failed to load projects';
          this.projects = [];
          this.loading = false;
          console.error('Failed to load projects', err);
        }
      });
  }

  // ---------------------------------------------------------------- filtering

  setStatusFilter(value: 'All Status' | ProjectStatus) {
    if (this.filters.status === value) {
      return;
    }
    this.filters.status = value;
    this.currentPage = 1;
  }

  setOwnerFilter(option: OwnerFilterOption) {
    if (this.filters.ownerId === option.value) {
      return;
    }
    this.filters.ownerId = option.value;
    this.filters.ownerLabel = option.label;
    this.loadProjects();
  }

  setAreaFilter(option: AreaFilterOption) {
    if (this.filters.areaType === option.value) {
      return;
    }
    this.filters.areaType = option.value;
    this.filters.areaLabel = option.label;
    this.currentPage = 1;
  }

  setSortOption(option: SortOption) {
    this.sortOption = option;
    this.currentPage = 1;
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.loadProjects();
    }, 400);
  }

  resetFilters() {
    this.filters = {
      ownerId: null,
      ownerLabel: 'All Owners',
      areaType: null,
      areaLabel: 'All Areas',
      status: 'All Status'
    };
    this.searchTerm = '';
    this.sortOption = this.sortOptions[0];
    this.loadProjects();
  }

  get hasActiveFilters() {
    return (
      !!this.filters.ownerId ||
      !!this.filters.areaType ||
      this.filters.status !== 'All Status' ||
      !!this.searchTerm?.trim()
    );
  }

  get filteredProjects(): ProjectSummary[] {
    let items = this.projects;

    if (this.filters.status !== 'All Status') {
      items = items.filter((project) => project.status === this.filters.status);
    }
    if (this.filters.areaType) {
      items = items.filter((project) => project.areaType === this.filters.areaType);
    }

    const { value, direction } = this.sortOption;
    const factor = direction === 'asc' ? 1 : -1;

    return [...items].sort((a, b) => {
      switch (value) {
        case 'nodes':
          return (a.nodes - b.nodes) * factor;
        case 'alerts':
          return (a.alerts - b.alerts) * factor;
        case 'lastSync':
          return (a.lastSyncAt - b.lastSyncAt) * factor;
        case 'owner':
          return (a.owner?.name || '').localeCompare(b.owner?.name || '') * factor;
        default:
          return a.name.localeCompare(b.name) * factor;
      }
    });
  }

  // --------------------------------------------------------------- pagination

  get paginatedProjects(): ProjectSummary[] {
    const items = this.filteredProjects;
    const page = this.normalizeCurrentPage(this.computeTotalPages(items.length));
    const start = (page - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  get totalEntries() {
    return this.filteredProjects.length;
  }

  get totalPages() {
    return this.computeTotalPages(this.totalEntries);
  }

  /** Jendela maksimal 5 nomor di sekitar halaman aktif, biar footer tidak melebar. */
  get pageNumbers(): number[] {
    const total = this.totalPages;
    const window = 5;
    if (total <= window) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    let start = Math.max(1, this.currentPage - Math.floor(window / 2));
    start = Math.min(start, total - window + 1);
    return Array.from({ length: window }, (_, index) => start + index);
  }

  get paginationStart() {
    if (!this.totalEntries) {
      return 0;
    }
    return (this.normalizeCurrentPage(this.totalPages) - 1) * this.pageSize + 1;
  }

  get paginationEnd() {
    if (!this.totalEntries) {
      return 0;
    }
    return Math.min(this.paginationStart + this.pageSize - 1, this.totalEntries);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
  }

  changePageSize(size: number | string) {
    const parsed = Number(size);
    if (!isNaN(parsed) && parsed > 0) {
      this.pageSize = parsed;
      this.currentPage = 1;
    }
  }

  private computeTotalPages(totalItems: number) {
    return Math.max(1, Math.ceil(totalItems / this.pageSize));
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

  // ------------------------------------------------------------------ display

  statusBadge(status: ProjectStatus) {
    switch (status) {
      case 'active':
        return 'badge bg-success-subtle text-success';
      case 'maintenance':
        return 'badge bg-warning-subtle text-warning';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  areaIcon(areaType?: ProjectAreaType) {
    switch (areaType) {
      case 'plant':
        return 'fa-industry';
      case 'pipeline':
        return 'fa-wave-square';
      case 'farm':
        return 'fa-seedling';
      case 'industrial':
        return 'fa-building';
      default:
        return 'fa-layer-group';
    }
  }

  /** Dihitung dari seluruh project yang termuat, bukan dari halaman aktif. */
  statusCount(option: 'All Status' | ProjectStatus) {
    if (option === 'All Status') {
      return this.projects.length;
    }
    return this.projects.filter((project) => project.status === option).length;
  }

  trackByProject(_index: number, project: ProjectSummary) {
    return project.idProject;
  }

  // -------------------------------------------------------------------- owners

  private loadOwners() {
    this.ownersService
      .ownersControllerFindAll$Response({
        page: 1,
        limit: 200
      })
      .subscribe({
        next: (response) => {
          const payload = this.parseBody(response.body);
          const items = this.extractDataArray(payload);
          const options = items
            .map((owner: any) => ({
              label: owner?.name || owner?.companyName || 'Owner',
              value: owner?.idOwner || owner?.id || null
            }))
            .filter((option: OwnerFilterOption) => option.value)
            .sort((a: OwnerFilterOption, b: OwnerFilterOption) => a.label.localeCompare(b.label));

          this.ownerOptions = [{ label: 'All Owners', value: null }, ...options];
          if (this.filters.ownerId) {
            const match = this.ownerOptions.find((opt) => opt.value === this.filters.ownerId);
            if (match) {
              this.filters.ownerLabel = match.label;
            } else {
              this.filters.ownerId = null;
              this.filters.ownerLabel = 'All Owners';
            }
          }
        },
        error: (err) => {
          console.error('Failed to load owner list', err);
        }
      });
  }

  // -------------------------------------------------------------------- mapping

  private parseBody(body: unknown) {
    if (!body) {
      return null;
    }
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (error) {
        console.warn('Failed to parse response body', error);
        return null;
      }
    }
    return body;
  }

  private extractDataArray(payload: any): any[] {
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.data?.items)) {
      return payload.data.items;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  }

  private mapProject(raw: any): ProjectSummary {
    const idProject = raw?.idProject || raw?.id || '';
    const ownerId =
      raw?.idOwner ||
      raw?.owner?.idOwner ||
      raw?.owner?.id ||
      raw?.owner_id ||
      'unknown-owner';
    const ownerName = raw?.owner?.name || raw?.owner?.companyName || raw?.ownerName || 'Unknown Owner';

    // Backend now returns stats directly
    const stats = raw?.stats || {};
    const status = this.normalizeStatus(raw?.status);
    const lastSyncAt = this.parseLastSync(raw?.lastSync);

    return {
      idProject,
      idOwner: ownerId,
      owner: {
        idOwner: ownerId,
        name: ownerName
      },
      name: raw?.name || 'Untitled Project',
      areaType: raw?.areaType,
      status,
      nodes: stats.nodes ?? 0,
      sensors: stats.sensors ?? 0,
      online: stats.online ?? 0,
      alerts: stats.alerts ?? 0,
      location: raw?.location || 'Unknown location',
      lastSync: this.formatLastSync(lastSyncAt),
      lastSyncAt
    };
  }

  /**
   * Go mengirim zero-time (`0001-01-01T00:00:00Z`) untuk project yang belum pernah
   * sinkron. Tanpa penjagaan ini kartu menampilkan "1/1/1" seolah tanggal sungguhan.
   * Apa pun sebelum tahun 2000 dianggap "belum pernah".
   */
  private parseLastSync(dateString?: string): number {
    if (!dateString) {
      return 0;
    }
    const time = new Date(dateString).getTime();
    if (isNaN(time) || time < Date.UTC(2000, 0, 1)) {
      return 0;
    }
    return time;
  }

  private formatLastSync(time: number): string {
    if (!time) {
      return 'Belum pernah';
    }

    const diffMs = Date.now() - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) {
      return 'just now';
    } else if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return new Date(time).toLocaleDateString();
  }

  private normalizeStatus(status?: string): ProjectStatus {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'maintenance') {
      return 'maintenance';
    }
    if (normalized === 'offline' || normalized === 'inactive' || normalized === 'archived') {
      return 'offline';
    }
    return 'active';
  }
}
