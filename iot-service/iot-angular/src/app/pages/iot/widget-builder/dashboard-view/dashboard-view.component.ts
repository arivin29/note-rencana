import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GridsterConfig, GridsterItem, DisplayGrid, GridType, CompactType } from 'angular-gridster2';
import { 
  Dashboard, Widget,
  TimeRange, TIME_RANGE_PRESETS, REFRESH_INTERVALS
} from '../models/widget.models';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetBuilderService } from 'src/sdk/core/services';

interface DashboardResponse {
  idDashboard?: string;
  id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  idOwner?: string;
  ownerId?: string;
  owner?: { name: string };
  widgets?: WidgetResponse[];
  createdAt: string;
  updatedAt: string;
}

interface WidgetResponse {
  idWidget?: string;
  id?: string;
  idDashboard?: string;
  dashboardId?: string;
  name: string;
  widgetType: string;
  sqlQuery: string;
  config: any;
  positionX: number;
  positionY: number;
  cols: number;
  rows: number;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-dashboard-view',
  standalone: false,
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.css']
})
export class DashboardViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboard: Dashboard | null = null;
  widgets: GridsterItem[] = [];
  widgetData: Map<string, Widget> = new Map();
  
  // Gridster config
  gridsterOptions: GridsterConfig = {};
  
  // Time & Refresh
  timeRange: TimeRange = {
    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    to: new Date(),
    label: 'Last 24 hours'
  };
  selectedTimePreset = '24h';
  timePresets = TIME_RANGE_PRESETS;
  
  refreshInterval = 0;
  refreshIntervals = REFRESH_INTERVALS;
  lastRefresh: Date = new Date();
  
  // UI State
  loading = true;
  editMode = false;
  fullscreenWidget: string | null = null;
  
  // Custom time range modal
  customTimeFrom = '';
  customTimeTo = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private widgetBuilderService: WidgetBuilderService
  ) {}

  ngOnInit(): void {
    this.initGridsterOptions();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initGridsterOptions(): void {
    this.gridsterOptions = {
      gridType: GridType.ScrollVertical,
      compactType: CompactType.None,
      displayGrid: DisplayGrid.None,
      pushItems: true,
      draggable: {
        enabled: false,
      },
      resizable: {
        enabled: false,
      },
      minCols: 12,
      maxCols: 12,
      minRows: 1,
      maxRows: 100,
      defaultItemCols: 3,
      defaultItemRows: 3,
      minItemCols: 2,
      minItemRows: 2,
      maxItemCols: 12,
      maxItemRows: 10,
      margin: 10,
      outerMargin: true,
      outerMarginTop: 10,
      outerMarginRight: 10,
      outerMarginBottom: 10,
      outerMarginLeft: 10,
      scrollSensitivity: 10,
      scrollSpeed: 20,
      itemChangeCallback: this.onItemChange.bind(this),
      itemResizeCallback: this.onItemResize.bind(this),
    };
  }

  loadDashboard(): void {
    const dashboardId = this.route.snapshot.paramMap.get('id');
    if (!dashboardId) {
      this.loading = false;
      return;
    }
    
    this.widgetBuilderService.widgetBuilderControllerGetDashboard$Response({ id: dashboardId }).subscribe({
      next: (response: any) => {
        const data = response.body as DashboardResponse;
        const dashId = data.idDashboard || data.id || '';
        this.dashboard = {
          id: dashId,
          name: data.name,
          description: data.description,
          isDefault: data.isDefault,
          ownerName: data.owner?.name || 'Unknown',
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        };
        
        if (data.widgets && data.widgets.length > 0) {
          this.widgets = data.widgets.map((w: WidgetResponse) => {
            const widgetId = w.idWidget || w.id || '';
            return {
              id: widgetId,
              x: w.positionX || 0,
              y: w.positionY || 0,
              cols: w.cols || 6,
              rows: w.rows || 4,
            };
          });
          
          data.widgets.forEach((w: WidgetResponse) => {
            const widgetId = w.idWidget || w.id || '';
            const widgetDashboardId = w.idDashboard || w.dashboardId || dashId;
            const widget: Widget = {
              id: widgetId,
              dashboardId: widgetDashboardId,
              name: w.name,
              type: w.widgetType as any,
              sqlQuery: w.sqlQuery,  // Store SQL query at top level for widget-container
              config: {
                ...w.config,
                sqlQuery: w.sqlQuery  // Also store in config as fallback
              },
              position: {
                x: w.positionX || 0,
                y: w.positionY || 0,
                cols: w.cols || 6,
                rows: w.rows || 4
              },
              query: {
                sql: w.sqlQuery
              },
              createdAt: new Date(w.createdAt),
              updatedAt: new Date(w.updatedAt)
            };
            this.widgetData.set(widgetId, widget);
          });
        }
        
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load dashboard:', err);
        this.loading = false;
      }
    });
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    
    if (this.gridsterOptions.draggable) {
      this.gridsterOptions.draggable.enabled = this.editMode;
    }
    if (this.gridsterOptions.resizable) {
      this.gridsterOptions.resizable.enabled = this.editMode;
    }
    this.gridsterOptions.displayGrid = this.editMode ? DisplayGrid.Always : DisplayGrid.None;
    
    // Trigger gridster update
    if (this.gridsterOptions.api?.optionsChanged) {
      this.gridsterOptions.api.optionsChanged();
    }
  }

  saveLayout(): void {
    if (!this.dashboard) return;
    
    const positions = this.widgets.map(item => ({
      idWidget: item['id'] as string,
      positionX: item.x || 0,
      positionY: item.y || 0,
      cols: item.cols || 6,
      rows: item.rows || 4
    }));
    
    this.widgetBuilderService.widgetBuilderControllerUpdateWidgetPositions({
      dashboardId: this.dashboard.id,
      body: { positions }
    }).subscribe({
      next: () => {
        console.log('Layout saved successfully');
        this.toggleEditMode();
      },
      error: (err: any) => {
        console.error('Failed to save layout:', err);
        alert('Failed to save layout: ' + (err.error?.message || err.message));
      }
    });
  }

  cancelEdit(): void {
    this.loadDashboard(); // Reload to reset positions
    this.toggleEditMode();
  }

  addWidget(): void {
    if (this.dashboard) {
      this.router.navigate(['/iot/widget-builder', this.dashboard.id, 'add-widget']);
    }
  }

  editWidget(widgetId: string): void {
    if (this.dashboard) {
      this.router.navigate(['/iot/widget-builder', this.dashboard.id, 'edit-widget', widgetId]);
    }
  }

  deleteWidget(widgetId: string): void {
    if (!this.dashboard) return;
    
    const widget = this.widgetData.get(widgetId);
    if (widget && confirm(`Delete widget "${widget.name}"?`)) {
      this.widgetBuilderService.widgetBuilderControllerDeleteWidget({
        dashboardId: this.dashboard.id,
        widgetId: widgetId
      }).subscribe({
        next: () => {
          this.widgets = this.widgets.filter(w => w['id'] !== widgetId);
          this.widgetData.delete(widgetId);
        },
        error: (err: any) => {
          console.error('Failed to delete widget:', err);
          alert('Failed to delete widget: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  refreshWidget(widgetId: string): void {
    console.log('Refreshing widget:', widgetId);
    // Trigger re-render (mockup)
  }

  toggleFullscreen(widgetId: string): void {
    this.fullscreenWidget = this.fullscreenWidget === widgetId ? null : widgetId;
  }

  // Time Range Methods
  onTimePresetChange(preset: string): void {
    this.selectedTimePreset = preset;
    const presetConfig = this.timePresets.find(p => p.value === preset);
    
    if (presetConfig) {
      this.timeRange = {
        from: new Date(Date.now() - presetConfig.duration),
        to: new Date(),
        label: presetConfig.label
      };
      this.refreshAllWidgets();
    }
  }

  onCustomTimeRange(from: Date, to: Date): void {
    this.selectedTimePreset = 'custom';
    this.timeRange = { from, to, label: 'Custom' };
    this.refreshAllWidgets();
  }

  onRefreshIntervalChange(seconds: number): void {
    this.refreshInterval = seconds;
    this.setupAutoRefresh();
  }

  private setupAutoRefresh(): void {
    this.destroy$.next(); // Cancel existing interval
    
    if (this.refreshInterval > 0) {
      interval(this.refreshInterval * 1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.refreshAllWidgets();
        });
    }
  }

  refreshAllWidgets(): void {
    this.lastRefresh = new Date();
    console.log('Refreshing all widgets at', this.lastRefresh);
    // In real implementation, this would trigger data reload for all widgets
  }

  // Gridster callbacks
  onItemChange(item: GridsterItem): void {
    console.log('Item changed:', item);
  }

  onItemResize(item: GridsterItem): void {
    console.log('Item resized:', item);
  }

  getWidgetById(id: string): Widget | undefined {
    return this.widgetData.get(id);
  }

  goBack(): void {
    this.router.navigate(['/iot/widget-builder']);
  }

  // Helper methods for Bootstrap dropdowns
  getTimeRangeLabel(): string {
    const preset = this.timePresets.find(p => p.value === this.selectedTimePreset);
    return preset ? preset.label : 'Custom';
  }

  getRefreshLabel(): string {
    const opt = this.refreshIntervals.find(r => r.value === this.refreshInterval);
    return opt ? opt.label : 'Off';
  }

  openCustomTimeRange(): void {
    // Initialize with current time range
    const formatDate = (d: Date) => d.toISOString().slice(0, 16);
    this.customTimeFrom = formatDate(this.timeRange.from);
    this.customTimeTo = formatDate(this.timeRange.to);
    // Modal will be opened via Bootstrap data-bs-toggle
  }

  applyCustomTimeRange(): void {
    if (this.customTimeFrom && this.customTimeTo) {
      const from = new Date(this.customTimeFrom);
      const to = new Date(this.customTimeTo);
      this.onCustomTimeRange(from, to);
    }
  }
}
