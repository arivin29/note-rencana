import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GridsterConfig, GridsterItem, DisplayGrid, GridType, CompactType } from 'angular-gridster2';
import { 
  Dashboard, Widget, DUMMY_DASHBOARDS, DUMMY_WIDGETS,
  TimeRange, TIME_RANGE_PRESETS, REFRESH_INTERVALS
} from '../models/widget.models';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
    private router: Router
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
    
    // Simulate API call
    setTimeout(() => {
      this.dashboard = DUMMY_DASHBOARDS.find(d => d.id === dashboardId) || null;
      
      if (this.dashboard) {
        // Load widgets for this dashboard
        const dashboardWidgets = DUMMY_WIDGETS.filter(w => w.dashboardId === dashboardId);
        this.widgets = dashboardWidgets.map(w => ({
          id: w.id,
          x: w.position.x,
          y: w.position.y,
          cols: w.position.cols,
          rows: w.position.rows,
        }));
        
        dashboardWidgets.forEach(w => this.widgetData.set(w.id, w));
      }
      
      this.loading = false;
    }, 500);
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
    // Save widget positions (mockup - just log)
    const layout = this.widgets.map(item => ({
      id: item['id'],
      x: item.x,
      y: item.y,
      cols: item.cols,
      rows: item.rows,
    }));
    console.log('Saving layout:', layout);
    alert('Layout saved! (Mockup)');
    this.toggleEditMode();
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
    const widget = this.widgetData.get(widgetId);
    if (widget && confirm(`Delete widget "${widget.name}"?`)) {
      this.widgets = this.widgets.filter(w => w['id'] !== widgetId);
      this.widgetData.delete(widgetId);
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
