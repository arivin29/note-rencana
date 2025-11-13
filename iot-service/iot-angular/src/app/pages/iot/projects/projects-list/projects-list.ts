import { Component, OnInit } from '@angular/core';
import { ReportProject } from '../../../../models/iot';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';

type ProjectStatus = 'active' | 'maintenance' | 'offline';

interface ProjectSummary extends Pick<ReportProject, 'idProject' | 'idOwner' | 'owner' | 'name' | 'areaType'> {
  status: ProjectStatus;
  nodes: number;
  sensors: number;
  online: number;
  alerts: number;
  location: string;
  lastSync: string;
}

interface OwnerFilterOption {
  label: string;
  value: string | null;
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
    status: 'All Status' as 'All Status' | ProjectStatus
  };
  searchTerm = '';

  statusOptions: Array<'All Status' | ProjectStatus> = ['All Status', 'active', 'maintenance', 'offline'];
  ownerOptions: OwnerFilterOption[] = [{ label: 'All Owners', value: null }];

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
        idOwner: this.filters.ownerId || undefined,
        status: this.filters.status !== 'All Status' ? this.filters.status : undefined
      })
      .subscribe({
        next: (response) => {
          const payload = this.parseBody(response.body);
          const items = this.extractDataArray(payload);
          this.projects = items
            .map((project: any) => this.mapProject(project))
            .filter((project): project is ProjectSummary => !!project.idProject);
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.message || 'Failed to load projects';
          this.loading = false;
          console.error('Failed to load projects', err);
        }
      });
  }

  setStatusFilter(value: 'All Status' | ProjectStatus) {
    if (this.filters.status === value) {
      return;
    }
    this.filters.status = value;
    this.loadProjects();
  }

  setOwnerFilter(option: OwnerFilterOption) {
    if (this.filters.ownerId === option.value) {
      return;
    }
    this.filters.ownerId = option.value;
    this.filters.ownerLabel = option.label;
    this.loadProjects();
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

  statusCount(option: 'All Status' | ProjectStatus) {
    if (option === 'All Status') {
      return this.projects.length;
    }
    return this.projects.filter((project) => project.status === option).length;
  }

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
            .filter((option: OwnerFilterOption) => option.value);

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

    // Format lastSync to be more readable
    const lastSync = this.formatLastSync(raw?.lastSync);

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
      lastSync
    };
  }

  private formatLastSync(dateString?: string): string {
    if (!dateString) {
      return 'Never';
    }
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown';
    }
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
