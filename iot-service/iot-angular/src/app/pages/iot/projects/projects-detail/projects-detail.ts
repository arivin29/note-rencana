import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectMapNode } from './project-map-widget/project-map-widget.component';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../sdk/core/services/sensors.service';
import { AlertEventsService } from '../../../../../sdk/core/services/alert-events.service';

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
  ) {
    this.route.paramMap.subscribe((params) => {
      this.projectId = params.get('projectId') ?? '';
      if (this.projectId) {
        this.loadAllData();
      }
    });
  }

  ngOnInit(): void {
    // Data will be loaded from route subscription
  }

  loadAllData() {
    // Load project detail first, then load related data in parallel
    this.loadProjectDetail();
    this.loadNodes();  // Will automatically load sensors after nodes loaded
    this.loadAlerts();
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

  loadNodes() {
    this.loadingNodes = true;
    
    // ✅ Backend supports idProject filter for nodes
    this.nodesService.nodesControllerFindAll$Response({
      idProject: this.projectId,
      page: 1,
      limit: 100
    }).subscribe({
      next: (httpResponse) => {
        let data: any = httpResponse.body;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        console.log('Nodes data:', data);
        
        this.nodes = data?.data || [];
        this.loadingNodes = false;
        
        // After nodes loaded, load sensors for these nodes
        if (this.nodes.length > 0) {
          this.loadSensorsForNodes();
        } else {
          this.sensors = [];
          this.loadingSensors = false;
        }
      },
      error: (err) => {
        console.error('Error loading nodes:', err);
        this.loadingNodes = false;
        this.loadingSensors = false;
      }
    });
  }

  loadSensorsForNodes() {
    if (this.nodes.length === 0) {
      this.sensors = [];
      this.loadingSensors = false;
      return;
    }
    
    this.loadingSensors = true;
    
    // Load sensors for first few nodes (or all if not too many)
    const nodeIds = this.nodes.slice(0, 10).map(n => n.idNode);
    const sensorRequests = nodeIds.map(nodeId => 
      this.sensorsService.sensorsControllerFindAll$Response({
        idNode: nodeId,
        page: 1,
        limit: 50
      })
    );
    
    // Load sensors from all nodes in parallel
    forkJoin(sensorRequests).subscribe({
      next: (responses) => {
        this.sensors = [];
        responses.forEach(httpResponse => {
          let data: any = httpResponse.body;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          this.sensors.push(...(data?.data || []));
        });
        
        console.log('Sensors data:', this.sensors);
        this.loadingSensors = false;
      },
      error: (err) => {
        console.error('Error loading sensors:', err);
        this.loadingSensors = false;
      }
    });
  }

  loadAlerts() {
    this.loadingAlerts = true;
    
    // Load recent alerts without project filter
    // Backend doesn't support idProject filter for alerts
    this.alertEventsService.alertEventsControllerFindAll$Response({
      page: 1,
      limit: 20
    }).subscribe({
      next: (httpResponse) => {
        let data: any = httpResponse.body;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        console.log('Alerts data (all):', data);
        
        // Filter alerts client-side if needed (or use all alerts)
        // For now, show all recent alerts
        this.alerts = data?.data || [];
        this.loadingAlerts = false;
      },
      error: (err) => {
        console.error('Error loading alerts:', err);
        this.loadingAlerts = false;
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
