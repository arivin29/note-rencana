import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { NodesService, SensorLogsService } from '../../../../../../sdk/core/services';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexStroke,
  ApexDataLabels,
  ApexXAxis,
  ApexFill
} from 'ng-apexcharts';

// Default node icon (base64 SVG)
export const DEFAULT_NODE_ICON = 'assets/icons/node-default.svg';

// Icon size constraints
export const ICON_SIZE_RULES = {
  minWidth: 24,
  maxWidth: 64,
  minHeight: 24,
  maxHeight: 64,
  recommendedSize: 32,
  maxFileSizeKb: 100
};

export interface NodeFeature {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  description?: string;
  connectivityStatus: string;
  status?: string;
  lastSeenAt?: string;
  iconUrl?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  modelName?: string;
  manufacturer?: string;
  picName?: string;
  picPhone?: string;
  hasCoordinates: boolean;
}

export interface SensorChannel {
  id: string;
  metricCode: string;
  unit: string;
  value: number | null;
  timestamp?: string;
  status: string;
}

export interface NodeSensor {
  id: string;
  code: string;
  catalogName?: string;
  status: string;
  channels: SensorChannel[];
}

export interface ChannelChart {
  label: string;
  metric: string;
  latest: string;
  unit: string;
  chart: {
    series: ApexAxisChartSeries;
    options: {
      chart: ApexChart;
      stroke: ApexStroke;
      dataLabels: ApexDataLabels;
      xaxis: ApexXAxis;
      fill: ApexFill;
      colors: string[];
    };
  };
}

@Component({
  selector: 'node-drawer',
  templateUrl: './node-drawer.html',
  styleUrls: ['./node-drawer.scss'],
  standalone: false
})
export class NodeDrawerComponent implements OnChanges {
  @Input() node: NodeFeature | null = null;
  @Input() isOpen = false;
  @Input() isDragMode = false;
  @Input() savingDragPosition = false;
  @Output() close = new EventEmitter<void>();
  @Output() updateCoordinates = new EventEmitter<{ nodeId: string; lat: number; lon: number }>();
  @Output() updateIcon = new EventEmitter<{ nodeId: string; iconUrl: string }>();
  @Output() nodeUpdated = new EventEmitter<void>();
  @Output() startDragMode = new EventEmitter<void>();
  @Output() cancelDragMode = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  
  // Editing states
  isEditingCoords = false;
  isEditingIcon = false;
  editLat: number | null = null;
  editLon: number | null = null;
  newIconUrl = '';
  
  // Loading states
  savingCoords = false;
  savingIcon = false;

  // Active tab
  activeTab: 'info' | 'actions' = 'info';

  iconSizeRules = ICON_SIZE_RULES;

  // Sensors data
  sensors: NodeSensor[] = [];
  loadingSensors = false;

  // Channel charts for mini sparklines
  channelCharts: ChannelChart[] = [];
  loadingCharts = false;

  constructor(
    private nodesService: NodesService,
    private sensorLogsService: SensorLogsService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node'] && this.node) {
      // Reset editing states when node changes
      this.isEditingCoords = false;
      this.isEditingIcon = false;
      this.activeTab = 'info';
      // Fetch sensors for this node
      this.fetchSensors();
    }
  }

  fetchSensors(): void {
    if (!this.node) return;
    
    this.loadingSensors = true;
    this.loadingCharts = true;
    this.sensors = [];
    this.channelCharts = [];
    
    // Use SDK endpoint: GET /api/nodes/{id}/dashboard
    this.nodesService.nodesControllerGetDashboard$Response({ id: this.node.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // SDK returns text response, need to parse JSON manually
          let data: any;
          try {
            data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
          } catch (e) {
            console.error('Failed to parse dashboard response:', e);
            this.loadingSensors = false;
            this.fetchTelemetryTrends();
            return;
          }
          
          if (data?.sensorsWithData) {
            this.sensors = data.sensorsWithData.map((s: any) => ({
              id: s.idSensor,
              code: s.sensorCode,
              catalogName: s.catalogName,
              status: s.status,
              channels: (s.channels || []).map((ch: any) => ({
                id: ch.idSensorChannel,
                metricCode: ch.metricCode,
                unit: ch.unit,
                value: ch.latestValue,
                timestamp: ch.timestamp,
                status: ch.status
              }))
            }));
          }
          this.loadingSensors = false;
          // Fetch telemetry trends for charts
          this.fetchTelemetryTrends();
        },
        error: (err) => {
          console.error('Failed to load sensors:', err);
          this.loadingSensors = false;
          this.loadingCharts = false;
        }
      });
  }

  fetchTelemetryTrends(): void {
    if (!this.node) {
      this.loadingCharts = false;
      return;
    }

    this.sensorLogsService.sensorLogsControllerGetTelemetryTrends({
      nodeId: this.node.id,
      hours: 24  // Last 24 hours for compact display
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.channelCharts = (response.channels || []).slice(0, 3).map((channel: any) => {
          const dataPoints = channel.dataPoints || [];
          const precision = channel.precision || 0.01;
          const decimalPlaces = precision < 1 ? Math.abs(Math.floor(Math.log10(precision))) : 0;
          
          const values = dataPoints.map((dp: any) => {
            const val = parseFloat(dp.value);
            return isNaN(val) ? 0 : parseFloat(val.toFixed(decimalPlaces));
          });
          
          const lastValue = channel.statistics?.lastValue;
          const formattedLastValue = lastValue !== null && lastValue !== undefined 
            ? parseFloat(lastValue).toFixed(decimalPlaces) 
            : '0';

          return {
            label: channel.sensorTypeLabel || channel.metricCode,
            metric: channel.metricCode,
            unit: channel.unit || '',
            latest: formattedLastValue,
            chart: {
              series: [{ name: channel.metricCode, data: values }],
              options: {
                chart: {
                  type: 'area',
                  height: 60,
                  sparkline: { enabled: true },
                  toolbar: { show: false }
                },
                stroke: { curve: 'smooth', width: 2 },
                dataLabels: { enabled: false },
                xaxis: { labels: { show: false } },
                colors: ['#00E396'],
                fill: {
                  type: 'gradient',
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4,
                    opacityTo: 0.1,
                    stops: [0, 100]
                  }
                }
              }
            }
          };
        });
        this.loadingCharts = false;
      },
      error: (err) => {
        console.error('Failed to load telemetry trends:', err);
        this.loadingCharts = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get nodeIcon(): string {
    return this.node?.iconUrl || DEFAULT_NODE_ICON;
  }

  get connectivityClass(): string {
    switch (this.node?.connectivityStatus) {
      case 'online': return 'badge bg-success';
      case 'degraded': return 'badge bg-warning text-dark';
      case 'offline': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  get statusClass(): string {
    switch (this.node?.status) {
      case 'active': return 'badge bg-success';
      case 'maintenance': return 'badge bg-warning text-dark';
      case 'inactive': return 'badge bg-secondary';
      default: return 'badge bg-secondary';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  }

  formatValue(value: number | null, unit: string): string {
    if (value === null) return '-';
    return `${value.toFixed(2)} ${unit}`;
  }

  getChannelStatusClass(status: string): string {
    switch (status) {
      case 'active':
      case 'normal': return 'status-normal';
      case 'warning': return 'status-warning';
      case 'critical':
      case 'inactive': return 'status-critical';
      default: return 'status-unknown';
    }
  }

  // ========== Coordinate Editing ==========
  startEditCoords(): void {
    this.isEditingCoords = true;
    // Parse current coordinates from node (need to get from map)
    this.editLat = null;
    this.editLon = null;
  }

  cancelEditCoords(): void {
    this.isEditingCoords = false;
    this.editLat = null;
    this.editLon = null;
  }

  saveCoords(): void {
    if (this.editLat === null || this.editLon === null || !this.node) return;
    
    this.savingCoords = true;
    this.nodesService.nodesControllerUpdate({ 
      id: this.node.id, 
      body: { 
        latitude: this.editLat, 
        longitude: this.editLon 
      } 
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingCoords = false;
        this.isEditingCoords = false;
        this.updateCoordinates.emit({ 
          nodeId: this.node!.id, 
          lat: this.editLat!, 
          lon: this.editLon! 
        });
        this.nodeUpdated.emit();
      },
      error: (err) => {
        console.error('Failed to update coordinates:', err);
        this.savingCoords = false;
      }
    });
  }

  // ========== Icon Editing ==========
  startEditIcon(): void {
    this.isEditingIcon = true;
    this.newIconUrl = this.node?.iconUrl || '';
  }

  cancelEditIcon(): void {
    this.isEditingIcon = false;
    this.newIconUrl = '';
  }

  saveIcon(): void {
    if (!this.node) return;
    
    this.savingIcon = true;
    // Note: iconUrl field was added to CreateNodeDto/UpdateNodeDto
    // If SDK not regenerated, use 'as any' cast
    this.nodesService.nodesControllerUpdate({ 
      id: this.node.id, 
      body: { 
        iconUrl: this.newIconUrl || undefined 
      } as any
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingIcon = false;
        this.isEditingIcon = false;
        this.updateIcon.emit({ 
          nodeId: this.node!.id, 
          iconUrl: this.newIconUrl 
        });
        this.nodeUpdated.emit();
      },
      error: (err) => {
        console.error('Failed to update icon:', err);
        this.savingIcon = false;
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }

  openNodeDetail(): void {
    // Navigate to full node detail page
    window.open(`/iot/nodes/${this.node?.id}`, '_blank');
  }
}
