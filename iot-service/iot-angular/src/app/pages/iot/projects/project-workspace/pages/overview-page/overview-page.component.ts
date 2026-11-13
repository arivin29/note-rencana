import { Component, Inject, LOCALE_ID, OnInit } from '@angular/core';
import { formatNumber } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { fetchAll, parseBody, totalOf } from '../../../../../../shared/utils/fetch-all';
import { ProjectMapNode } from '../../../projects-detail/project-map-widget/project-map-widget.component';
import { ProjectsService } from '../../../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../../../sdk/core/services/sensors.service';
import { AlertEventsService } from '../../../../../../../sdk/core/services/alert-events.service';
import { FRESHNESS_BADGE, Freshness, getFreshness, timeAgo } from '../../../../../../shared/utils/telemetry-freshness';

// Interface for sensor channel from backend
export interface SensorChannelData {
  idSensorChannel: string;
  metricCode: string;
  unit: string;
  lastValue: number | null;
  lastValueAt: string | null;
}

// Interface for sensor with last value from backend
export interface SensorWithLastValue {
  idSensor: string;
  label: string;
  sensorCode?: string;
  lastValue: number | null;
  lastValueAt: string | null;
  status?: string;
  channels: SensorChannelData[];
  node?: {
    code: string;
    name: string;
    address?: string;
  };
  sensorCatalog?: {
    vendor: string;
    modelName: string;
  };
}

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

interface DeviceHealth {
  nodeId: string;
  nodeName: string;
  nodeCode: string;
  address: string;
  status: 'online' | 'warning' | 'offline' | 'unknown';
  lastSeen: Date | null;
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
  sensors: SensorWithLastValue[] = [];
  /** Alert counts scoped to THIS project (backend idProject filter). null = not loaded / failed. */
  openAlertCount: number | null = null;
  ackAlertCount: number | null = null;
  alertsError = false;
  
  // Loading states for each section
  loadingNodes = false;
  loadingSensors = false;
  loadingAlerts = false;
  
  // Map nodes for widget
  mapNodes: ProjectMapNode[] = [];

  // System Health Summary
  systemHealth = {
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    warningDevices: 0,
    /** Most recent lastSeenAt across all nodes (real, not estimated). */
    lastDataAt: null as Date | null
  };

  // Device Health Grid
  deviceHealthList: DeviceHealth[] = [];


  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private nodesService: NodesService,
    private sensorsService: SensorsService,
    private alertEventsService: AlertEventsService,
    @Inject(LOCALE_ID) private locale: string
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
    
    fetchAll(p => this.nodesService.nodesControllerFindAll$Response({ idProject: this.projectId, ...p }))
      .subscribe({
        next: (nodes) => {
          this.nodes = nodes;
          
          // Ensure nodes is an array
          if (!Array.isArray(this.nodes)) {
            console.warn('Nodes is not an array:', this.nodes);
            this.nodes = [];
          }
          
          this.loadingNodes = false;
          
          // Build map nodes with coords format [lon, lat]
          this.mapNodes = this.nodes
            .filter((n: any) => n.latitude && n.longitude)
            .map((n: any) => ({
              id: n.idNode || n.id,
              name: n.address || n.code || n.nodeCode,
              coords: [parseFloat(n.longitude), parseFloat(n.latitude)] as [number, number]
            }));
          
          // Compute system health from nodes
          this.computeSystemHealth();
          
          // Build device health list
          this.buildDeviceHealthList();
          
          
          // Load sensors for all nodes
          this.loadSensors();
        },
        error: (err) => {
          console.error('Error loading nodes:', err);
          this.loadingNodes = false;
        }
      });
  }

  /**
   * Counts from REAL node lastSeenAt + interval (shared freshness rule).
   * Uptime/latency are not shown: there is no backend metric for them yet, and we never estimate.
   */
  computeSystemHealth() {
    let onlineCount = 0;
    let warningCount = 0;
    let offlineCount = 0;
    let lastDataAt: Date | null = null;

    this.nodes.forEach((node: any) => {
      const status = this.getNodeStatus(node);
      if (status === 'online') onlineCount++;
      else if (status === 'warning') warningCount++;
      else offlineCount++; // offline + never reported

      if (node.lastSeenAt) {
        const t = new Date(node.lastSeenAt);
        if (!isNaN(t.getTime()) && (!lastDataAt || t > lastDataAt)) lastDataAt = t;
      }
    });

    this.systemHealth = {
      totalDevices: this.nodes.length,
      onlineDevices: onlineCount,
      offlineDevices: offlineCount,
      warningDevices: warningCount,
      lastDataAt
    };
  }

  /** All devices, problems first (offline → stale → never → online), then by address. */
  buildDeviceHealthList() {
    const rank: Record<string, number> = { offline: 0, warning: 1, unknown: 2, online: 3 };
    this.deviceHealthList = this.nodes.map((node: any) => ({
      nodeId: node.idNode || node.id,
      nodeName: node.address || node.code,
      nodeCode: node.code,
      address: node.address || '',
      status: this.getNodeStatus(node),
      lastSeen: node.lastSeenAt ? new Date(node.lastSeenAt) : null
    })).sort((a, b) => (rank[a.status] - rank[b.status]) || a.nodeName.localeCompare(b.nodeName));
  }

  get lastDataAgo(): string {
    return timeAgo(this.systemHealth.lastDataAt);
  }

  loadSensors() {
    if (this.nodes.length === 0) return;
    this.loadingSensors = true;

    // Single project-scoped request (paged), not one per node.
    fetchAll(p => this.sensorsService.sensorsControllerFindAll$Response({ idProject: this.projectId, ...p }))
      .subscribe({
        next: (sensors) => {
          this.sensors = sensors;
          this.loadingSensors = false;
        },
        error: (err) => {
          console.error('Error loading sensors:', err);
          this.loadingSensors = false;
        }
      });
  }

  formatLastValueAt(timestamp: string | null): string {
    return timeAgo(timestamp);
  }

  /** Shared freshness rule for a sensor row (interval comes from its node). */
  sensorFreshness(sensor: any): Freshness {
    return getFreshness(sensor.lastValueAt, sensor.node?.telemetryIntervalSec);
  }

  sensorBadgeClass(sensor: any): string {
    return FRESHNESS_BADGE[this.sensorFreshness(sensor)];
  }

  /** Sensors not reporting on time (stale + offline + never). */
  get sensorsNotFresh(): number {
    return this.sensors.filter(s => this.sensorFreshness(s) !== 'fresh').length;
  }

  formatSensorValue(value: number | null, unit?: string): string {
    if (value === null || value === undefined) return '-';
    const numVal = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numVal)) return '-';
    const txt = formatNumber(numVal, this.locale, '1.2-2'); // locale-aware, not toFixed
    return unit ? `${txt} ${unit}` : txt;
  }

  /** Open + acknowledged alert counts for THIS project only (limit 1 → read meta.total). */
  loadAlerts() {
    this.loadingAlerts = true;
    this.alertsError = false;
    const count = (status: string) =>
      this.alertEventsService.alertEventsControllerFindAll$Response({ idProject: this.projectId, status, limit: 1 });

    forkJoin({ open: count('open'), ack: count('acknowledged') }).subscribe({
      next: ({ open, ack }) => {
        this.openAlertCount = totalOf(parseBody(open.body)) ?? 0;
        this.ackAlertCount = totalOf(parseBody(ack.body)) ?? 0;
        this.loadingAlerts = false;
      },
      error: (err) => {
        console.error('Error loading alerts:', err);
        this.openAlertCount = null;
        this.ackAlertCount = null;
        this.alertsError = true;
        this.loadingAlerts = false;
      }
    });
  }

  /** Shared freshness rule (shared/utils/telemetry-freshness.ts) mapped to this page's labels. */
  getNodeStatus(node: any): 'online' | 'warning' | 'offline' | 'unknown' {
    switch (getFreshness(node.lastSeenAt, node.telemetryIntervalSec)) {
      case 'fresh': return 'online';
      case 'stale': return 'warning';
      case 'offline': return 'offline';
      default: return 'unknown';
    }
  }

  // Getters for template
  /** Derived from the most recent node lastSeenAt (the project endpoint has no lastSync field). */
  get lastSyncFormatted(): string {
    return this.systemHealth.lastDataAt ? timeAgo(this.systemHealth.lastDataAt) : 'Belum ada data';
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

  // Alert helpers
  getAlertSeverityClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-danger';
      case 'warning': return 'bg-warning text-dark';
      case 'info': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  formatAlertTime(timestamp: string | Date): string {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }

  // Device status helpers
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'online': return 'bg-success';
      case 'warning': return 'bg-warning text-dark';
      case 'offline': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  formatLastSeen(date: Date | null): string {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
