import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectMapNode } from './project-map-widget/project-map-widget.component';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';

interface ProjectDetail {
  idProject: string;
  name: string;
  status: string;
  areaType?: string;
  owner: {
    idOwner: string;
    name: string;
    industry?: string;
    email?: string;
    phone?: string;
  };
  stats: {
    totalNodes: number;
    activeNodes: number;
    totalSensors: number;
    totalLocations: number;
  };
  createdAt: Date | string;
  lastSync?: Date | string;
  nodes: any[];
  locations: any[];
}

@Component({
  selector: 'projects-detail',
  templateUrl: './projects-detail.html',
  styleUrls: ['./projects-detail.scss'],
  standalone: false
})
export class ProjectsDetailPage implements OnInit {
  projectId = '';
  loading = false;
  error: string | null = null;
  
  // Project data from backend
  project: ProjectDetail | null = null;
  
  // Map nodes for widget
  mapNodes: ProjectMapNode[] = [];

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService
  ) {
    this.route.paramMap.subscribe((params) => {
      this.projectId = params.get('projectId') ?? '';
      if (this.projectId) {
        this.loadProjectDetail();
      }
    });
  }

  ngOnInit(): void {
    // Data will be loaded from route subscription
  }

  loadProjectDetail() {
    this.loading = true;
    this.error = null;

    this.projectsService.projectsControllerFindOneDetailed$Response({ id: this.projectId })
      .subscribe({
        next: (httpResponse) => {
          let data: any = httpResponse.body;
          
          console.log('Project detail raw response:', data);
          
          // Parse JSON string if needed
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          
          console.log('Project detail parsed:', data);
          
          this.project = {
            idProject: data.idProject,
            name: data.name,
            status: data.status || 'active',
            areaType: data.areaType,
            owner: {
              idOwner: data.owner?.idOwner || 'unknown',
              name: data.owner?.name || 'Unknown Owner',
              industry: data.owner?.industry,
              email: data.owner?.email,
              phone: data.owner?.phone
            },
            stats: data.stats || {
              totalNodes: 0,
              activeNodes: 0,
              totalSensors: 0,
              totalLocations: 0
            },
            createdAt: data.createdAt,
            lastSync: data.lastSync,
            nodes: data.nodes || [],
            locations: data.locations || []
          };
          
          // Map nodes for map widget
          this.mapNodes = (data.nodes || [])
            .filter((node: any) => node.gpsLatitude && node.gpsLongitude)
            .map((node: any) => ({
              id: node.code || node.idNode,
              name: node.code || node.serialNumber || 'Unknown',
              coords: [node.gpsLongitude, node.gpsLatitude]
            }));
          
          console.log('Mapped project:', this.project);
          console.log('Map nodes:', this.mapNodes);
          
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.message || 'Failed to load project detail';
          this.loading = false;
          console.error('Error loading project detail:', err);
        }
      });
  }

  get offlineNodes(): number {
    return this.project ? this.project.stats.totalNodes - this.project.stats.activeNodes : 0;
  }

  get lastSyncFormatted(): string {
    if (!this.project?.lastSync) {
      return 'Never';
    }
    
    try {
      const date = new Date(this.project.lastSync);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  }

  get deploymentDate(): string {
    if (!this.project?.createdAt) {
      return 'Unknown';
    }
    
    try {
      const date = new Date(this.project.createdAt);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Unknown';
    }
  }

  get primaryLocation(): string {
    if (!this.project?.locations || this.project.locations.length === 0) {
      return 'Unknown Location';
    }
    return this.project.locations[0].address || 'Unknown Location';
  }
}
