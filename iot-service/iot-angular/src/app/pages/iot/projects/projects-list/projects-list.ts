import { Component } from '@angular/core';
import { ReportProject } from '../../../../models/iot';

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

@Component({
  selector: 'projects-list',
  templateUrl: './projects-list.html',
  styleUrls: ['./projects-list.scss'],
  standalone: false
})
export class ProjectsListPage {
  projects: ProjectSummary[] = [
    {
      idProject: 'PRJ-45',
      idOwner: 'owner-abc',
      owner: { idOwner: 'owner-abc', name: 'PT ABC' },
      name: 'Area A',
      areaType: 'plant',
      status: 'active',
      nodes: 100,
      sensors: 230,
      online: 92,
      alerts: 4,
      location: 'Kebun Timur, Aceh',
      lastSync: '09:12 UTC'
    },
    {
      idProject: 'PRJ-51',
      idOwner: 'owner-abc',
      owner: { idOwner: 'owner-abc', name: 'PT ABC' },
      name: 'Reservoir B',
      areaType: 'pipeline',
      status: 'maintenance',
      nodes: 32,
      sensors: 74,
      online: 28,
      alerts: 1,
      location: 'Reservoir B, Aceh',
      lastSync: '08:55 UTC'
    },
    {
      idProject: 'PRJ-09',
      idOwner: 'owner-xyz',
      owner: { idOwner: 'owner-xyz', name: 'PT XYZ' },
      name: 'Plant South',
      areaType: 'plant',
      status: 'active',
      nodes: 27,
      sensors: 65,
      online: 25,
      alerts: 0,
      location: 'Plant South, Riau',
      lastSync: '09:05 UTC'
    },
    {
      idProject: 'PRJ-77',
      idOwner: 'owner-delta',
      owner: { idOwner: 'owner-delta', name: 'PT Delta' },
      name: 'Pipeline North',
      areaType: 'pipeline',
      status: 'offline',
      nodes: 15,
      sensors: 40,
      online: 10,
      alerts: 2,
      location: 'Pipeline North, Kalimantan',
      lastSync: '06:41 UTC'
    }
  ];

  filters = {
    owner: 'All Owners',
    status: 'All Status'
  };
  searchTerm = '';

  statusOptions: Array<'All Status' | ProjectStatus> = ['All Status', 'active', 'maintenance', 'offline'];
  ownerOptions = ['All Owners', ...new Set(this.projects.map((p) => p.owner.name))];

  setFilter(type: 'owner' | 'status', value: string) {
    this.filters[type] = value;
  }

  get filteredProjects() {
    const search = this.searchTerm.trim().toLowerCase();

    return this.projects.filter((project) => {
      const matchOwner = this.filters.owner === 'All Owners' || project.owner.name === this.filters.owner;
      const matchStatus = this.filters.status === 'All Status' || project.status === this.filters.status;
      const matchSearch =
        !search ||
        project.name.toLowerCase().includes(search) ||
        project.idProject.toLowerCase().includes(search) ||
        project.location.toLowerCase().includes(search);

      return matchOwner && matchStatus && matchSearch;
    });
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
}
