import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectMapNode } from '../../../projects-detail/project-map-widget/project-map-widget.component';
import { ProjectsService } from '../../../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../../../sdk/core/services/sensors.service';
import { AlertEventsService } from '../../../../../../../sdk/core/services/alert-events.service';

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
  selector: 'app-overview-page',
  templateUrl: './overview-page.component.html',
  styleUrls: ['./overview-page.component.scss'],
  standalone: false
})
export class OverviewPageComponent implements OnInit {
  projectId = '';
  loading = false;
  error: string | null = null;
  
  // Project data from backend
  project: ProjectDetail | null = null;
  
  // Additional data from separate endpoints
  nodes: any[] = [];
  sensors: any[] = [];
  alerts: any[] = [];
  
  // Loading states for each section
  loadingNodes = false;
  loadingSensors = false;
  loadingAlerts = false;
  
  // Map nodes for widget
  mapNodes: ProjectMapNode[] = [];

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private nodesService: NodesService,
    private sensorsService: SensorsService,
    private alertEventsService: AlertEventsService
  ) {}

  ngOnInit(): void {
    // Get projectId from parent route
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
      if (this.projectId) {
        this.loadAllData();
      }
    });
  }

  loadAllData() {
    this.loadProjectDetail();
    this.loadNodes();
    this.loadAlerts();
  }

  loadProjectDetail() {
    this.loading = true;
    this.error = null;

    this.projectsService.projectsControllerFindOneDetailed$Response({ id: this.projectId })
      .subscribe({
        next: (httpResponse) => {
          let data: any = httpResponse.body;
          
          // Parse JSON string if needed
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { /* ignore */ }
          }
          
          // Handle nested response
          if (data?.body) data = data.body;
          
          this.project = {
            idProject: data.idProject || data.id || this.projectId,
            name: data.name || 'Unknown Project',
            status: data.status || 'unknown',
            areaType: data.areaType,
            owner: {
              idOwner: data.owner?.idOwner || data.ownerId || '',
              name: data.owner?.name || data.ownerName || 'Unknown',
              industry: data.owner?.industry,
              email: data.owner?.email,
              phone: data.owner?.phone
            },
            stats: {
              totalNodes: data.stats?.totalNodes || data.nodes?.length || 0,
              activeNodes: data.stats?.activeNodes || 0,
              totalSensors: data.stats?.totalSensors || 0,
              totalLocations: data.stats?.totalLocations || data.locations?.length || 0
            },
            createdAt: data.createdAt,
            lastSync: data.lastSync || data.lastDataAt,
            nodes: data.nodes || [],
            locations: data.locations || []
          };
          
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading project:', err);
          this.error = err?.error?.message || 'Failed to load project details';
          this.loading = false;
        }
      });
  }

  loadNodes() {
    this.loadingNodes = true;
    
    this.nodesService.nodesControllerFindAll$Response({ idProject: this.projectId })
      .subscribe({
        next: (res) => {
          const response: any = res.body;
          this.nodes = response?.data || response || [];
          this.loadingNodes = false;
          
          // Build map nodes with coords format [lon, lat]
          this.mapNodes = this.nodes
            .filter((n: any) => n.latitude && n.longitude)
            .map((n: any) => ({
              id: n.idNode || n.id,
              name: n.name || n.nodeCode,
              coords: [parseFloat(n.longitude), parseFloat(n.latitude)] as [number, number]
            }));
          
          // Load sensors for all nodes
          this.loadSensors();
        },
        error: (err) => {
          console.error('Error loading nodes:', err);
          this.loadingNodes = false;
        }
      });
  }

  loadSensors() {
    if (this.nodes.length === 0) return;
    
    this.loadingSensors = true;
    
    const sensorRequests = this.nodes.map(node => 
      this.sensorsService.sensorsControllerFindAll$Response({ idNode: node.idNode || node.id })
    );
    
    if (sensorRequests.length > 0) {
      forkJoin(sensorRequests).subscribe({
        next: (responses) => {
          this.sensors = responses.flatMap((res: any) => {
            const data = res.body;
            return data?.data || data || [];
          });
          this.loadingSensors = false;
        },
        error: (err) => {
          console.error('Error loading sensors:', err);
          this.loadingSensors = false;
        }
      });
    }
  }

  loadAlerts() {
    this.loadingAlerts = true;
    
    // AlertEventsService doesn't have projectId filter, just get recent alerts
    this.alertEventsService.alertEventsControllerFindAll$Response({ 
      limit: 10
    }).subscribe({
      next: (res) => {
        const response: any = res.body;
        this.alerts = response?.data || response || [];
        this.loadingAlerts = false;
      },
      error: (err) => {
        console.error('Error loading alerts:', err);
        this.loadingAlerts = false;
      }
    });
  }

  getNodeStatus(node: any): 'online' | 'warning' | 'offline' | 'unknown' {
    if (!node.lastSeenAt) return 'unknown';
    
    const lastSeen = new Date(node.lastSeenAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'warning';
    return 'offline';
  }

  // Getters for template
  get lastSyncFormatted(): string {
    if (!this.project?.lastSync) return 'Never';
    const date = new Date(this.project.lastSync);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }

  get deploymentDate(): string {
    if (!this.project?.createdAt) return 'Unknown';
    return new Date(this.project.createdAt).toLocaleDateString('en-US', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });
  }

  get primaryLocation(): string {
    if (!this.project?.locations?.length) return 'No location';
    return this.project.locations[0]?.name || 'Main Site';
  }

  get offlineNodes(): number {
    if (!this.project?.stats) return 0;
    return this.project.stats.totalNodes - this.project.stats.activeNodes;
  }
}
