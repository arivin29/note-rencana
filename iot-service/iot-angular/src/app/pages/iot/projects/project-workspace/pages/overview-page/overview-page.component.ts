import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectMapNode } from '../../../projects-detail/project-map-widget/project-map-widget.component';
import { ProjectsService } from '../../../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../../../sdk/core/services/sensors.service';
import { AlertEventsService } from '../../../../../../../sdk/core/services/alert-events.service';
import { SensorLogsService } from '../../../../../../../sdk/core/services/sensor-logs.service';
import { EChartsOption } from 'echarts';

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

interface KeyMetric {
  label: string;
  metric: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  chartOption: EChartsOption;
  color: string;
}

interface DeviceHealth {
  nodeId: string;
  nodeName: string;
  nodeCode: string;
  address: string;
  status: 'online' | 'warning' | 'offline';
  lastSeen: Date | null;
  uptimePercent: number;
  latencyMs: number;
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
  alerts: any[] = [];
  
  // Loading states for each section
  loadingNodes = false;
  loadingSensors = false;
  loadingAlerts = false;
  loadingTrends = false;
  
  // Map nodes for widget
  mapNodes: ProjectMapNode[] = [];

  // System Health Summary
  systemHealth = {
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    warningDevices: 0,
    avgUptime: 0,
    avgLatency: 0
  };

  // Device Health Grid
  deviceHealthList: DeviceHealth[] = [];

  // Key Metrics Cards with sparklines
  keyMetrics: KeyMetric[] = [];

  constructor(
    private route: ActivatedRoute,
    private projectsService: ProjectsService,
    private nodesService: NodesService,
    private sensorsService: SensorsService,
    private alertEventsService: AlertEventsService,
    private sensorLogsService: SensorLogsService
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
          let response: any = res.body;
          
          // Parse JSON string if needed
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) { /* ignore */ }
          }
          
          this.nodes = response?.data || response || [];
          
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
              name: n.name || n.nodeCode,
              coords: [parseFloat(n.longitude), parseFloat(n.latitude)] as [number, number]
            }));
          
          // Compute system health from nodes
          this.computeSystemHealth();
          
          // Build device health list
          this.buildDeviceHealthList();
          
          // Load telemetry trends for key metrics
          this.loadKeyMetricsTrends();
          
          // Load sensors for all nodes
          this.loadSensors();
        },
        error: (err) => {
          console.error('Error loading nodes:', err);
          this.loadingNodes = false;
        }
      });
  }

  computeSystemHealth() {
    const now = new Date();
    let onlineCount = 0;
    let warningCount = 0;
    let offlineCount = 0;
    let totalUptime = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    this.nodes.forEach((node: any) => {
      const status = this.getNodeStatus(node);
      if (status === 'online') onlineCount++;
      else if (status === 'warning') warningCount++;
      else offlineCount++;

      // Estimate uptime based on connectivity status
      if (node.connectivityStatus === 'online') {
        totalUptime += 100;
      } else if (status === 'warning') {
        totalUptime += 70;
      } else {
        totalUptime += 0;
      }

      // Use telemetry interval as proxy for latency (simulated)
      if (node.telemetryIntervalSec) {
        totalLatency += Math.max(50, Math.min(500, node.telemetryIntervalSec * 2));
        latencyCount++;
      }
    });

    this.systemHealth = {
      totalDevices: this.nodes.length,
      onlineDevices: onlineCount,
      offlineDevices: offlineCount,
      warningDevices: warningCount,
      avgUptime: this.nodes.length > 0 ? Math.round(totalUptime / this.nodes.length) : 0,
      avgLatency: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0
    };
  }

  buildDeviceHealthList() {
    this.deviceHealthList = this.nodes.map((node: any) => {
      const status = this.getNodeStatus(node);
      let uptimePercent = 0;
      if (status === 'online') uptimePercent = 95 + Math.random() * 5;
      else if (status === 'warning') uptimePercent = 60 + Math.random() * 30;
      else uptimePercent = Math.random() * 30;

      return {
        nodeId: node.idNode || node.id,
        nodeName: node.name || node.code,
        nodeCode: node.code,
        address: node.address || '',
        status: status as 'online' | 'warning' | 'offline',
        lastSeen: node.lastSeenAt ? new Date(node.lastSeenAt) : null,
        uptimePercent: Math.round(uptimePercent),
        latencyMs: Math.round(50 + Math.random() * 200)
      };
    }).slice(0, 8); // Show top 8 devices
  }

  loadKeyMetricsTrends() {
    if (this.nodes.length === 0) {
      this.keyMetrics = [];
      return;
    }

    this.loadingTrends = true;

    // Load trends from ALL nodes and aggregate by metric type
    const trendRequests = this.nodes.map(node => 
      this.sensorLogsService.sensorLogsControllerGetTelemetryTrends({
        nodeId: node.idNode || node.id,
        hours: 24
      })
    );

    forkJoin(trendRequests).subscribe({
      next: (responses: any[]) => {
        // Aggregate channels by metric type across all nodes
        const metricMap = new Map<string, {
          label: string;
          metric: string;
          unit: string;
          values: number[];
          latestValues: number[];
          nodeCount: number;
        }>();

        responses.forEach((res: any) => {
          let response = res;
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) { /* ignore */ }
          }
          
          const channels = response?.channels || [];
          if (!Array.isArray(channels)) return;

          channels.forEach((channel: any) => {
            const metricKey = channel.sensorTypeLabel || channel.metricCode || 'Unknown';
            const dataPoints = channel.dataPoints || [];
            const values = dataPoints.map((dp: any) => parseFloat(dp.value) || 0);
            const lastValue = channel.statistics?.lastValue || values[values.length - 1] || 0;

            if (!metricMap.has(metricKey)) {
              metricMap.set(metricKey, {
                label: channel.sensorTypeLabel || channel.metricCode || 'Metric',
                metric: channel.metricCode || 'value',
                unit: channel.unit || '',
                values: [],
                latestValues: [],
                nodeCount: 0
              });
            }

            const existing = metricMap.get(metricKey)!;
            existing.values.push(...values);
            existing.latestValues.push(parseFloat(lastValue) || 0);
            existing.nodeCount++;
          });
        });

        // Build key metrics from aggregated data (top 4 metrics)
        const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
        let colorIndex = 0;

        this.keyMetrics = Array.from(metricMap.entries())
          .slice(0, 4)
          .map(([_, data]) => {
            const avgLatest = data.latestValues.reduce((a, b) => a + b, 0) / data.latestValues.length || 0;
            const avgOverall = data.values.reduce((a, b) => a + b, 0) / data.values.length || 0;
            
            const trendValue = avgLatest - avgOverall;
            const trend: 'up' | 'down' | 'stable' = Math.abs(trendValue) < 0.5 ? 'stable' : (trendValue > 0 ? 'up' : 'down');

            const color = colors[colorIndex++ % colors.length];

            return {
              label: `${data.label} (${data.nodeCount} node${data.nodeCount > 1 ? 's' : ''})`,
              metric: data.metric,
              value: avgLatest.toFixed(2),
              unit: data.unit,
              trend: trend,
              trendValue: Math.abs(parseFloat(trendValue.toFixed(2))),
              color: color,
              chartOption: this.buildSparklineChart(data.values.slice(-30), color)
            };
          });

        this.loadingTrends = false;
      },
      error: (err) => {
        console.error('Error loading telemetry trends:', err);
        this.loadingTrends = false;
        this.keyMetrics = [];
      }
    });
  }

  buildSparklineChart(data: number[], color: string): EChartsOption {
    return {
      grid: { top: 5, right: 5, bottom: 5, left: 5 },
      xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
      yAxis: { type: 'value', show: false },
      series: [{
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '40' },
              { offset: 1, color: color + '05' }
            ]
          }
        }
      }]
    };
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
            let data = res.body;
            // Parse JSON string if needed
            if (typeof data === 'string') {
              try { data = JSON.parse(data); } catch (e) { /* ignore */ }
            }
            const items = data?.data || data || [];
            return Array.isArray(items) ? items : [];
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

  formatLastValueAt(timestamp: string | null): string {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  isDataStale(timestamp: string | null): boolean {
    if (!timestamp) return true;
    const diff = new Date().getTime() - new Date(timestamp).getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours >= 1; // Stale if more than 1 hour
  }

  formatSensorValue(value: number | null, unit?: string): string {
    if (value === null || value === undefined) return '-';
    const numVal = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numVal)) return '-';
    return unit ? `${numVal.toFixed(2)} ${unit}` : numVal.toFixed(2);
  }

  loadAlerts() {
    this.loadingAlerts = true;
    
    // AlertEventsService doesn't have projectId filter, just get recent alerts
    this.alertEventsService.alertEventsControllerFindAll$Response({ 
      limit: 10
    }).subscribe({
      next: (res) => {
        let response: any = res.body;
        // Parse JSON string if needed
        if (typeof response === 'string') {
          try { response = JSON.parse(response); } catch (e) { /* ignore */ }
        }
        const items = response?.data || response || [];
        this.alerts = Array.isArray(items) ? items : [];
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
