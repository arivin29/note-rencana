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
  layoutConfig?: Record<string, any>;
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
  dataSource?: string;
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
  /** Variables from dashboard layoutConfig.variables for SQL substitution */
  dashboardVariables: Record<string, string> = {};
  
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
  
  // Grafana-style time picker
  timePickerOpen = false;
  absoluteTimeFrom = 'now-24h';
  absoluteTimeTo = 'now';
  quickRangeSearch = '';
  recentTimeRanges: { from: string; to: string; label: string }[] = [];
  
  // Calendar picker state
  activeCalendar: 'from' | 'to' | null = null;
  fromCalendarDate = new Date();
  toCalendarDate = new Date();
  fromSelectedDate: Date | null = null;
  toSelectedDate: Date | null = null;
  fromTime = '00:00:00';
  toTime = '23:59:59';
  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
      margin: 4,
      outerMargin: true,
      outerMarginTop: 4,
      outerMarginRight: 4,
      outerMarginBottom: 4,
      outerMarginLeft: 4,
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

        // Extract dashboard-level variables from layoutConfig
        if (data.layoutConfig?.['variables']) {
          this.dashboardVariables = data.layoutConfig['variables'];
        }
        
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
                sqlQuery: w.sqlQuery,  // Also store in config as fallback
                dataSource: w.dataSource || 'postgresql'  // Carry data source into config
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
      // Navigate to new widget mode selector (Template or Expert)
      this.router.navigate(['/iot/widget-builder', this.dashboard.id, 'widget', 'new']);
    }
  }

  // For backward compatibility - direct expert mode
  addWidgetExpert(): void {
    if (this.dashboard) {
      this.router.navigate(['/iot/widget-builder', this.dashboard.id, 'add-widget']);
    }
  }

  editWidget(widgetId: string): void {
    if (!this.dashboard) return;
    
    // Always navigate to Expert Mode for editing (regardless of creation mode)
    // Expert Mode now loads templateConfig filters (node, sensor, channel) if available
    this.router.navigate(['/iot/widget-builder', this.dashboard.id, 'edit-widget', widgetId]);
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

  duplicateWidget(widgetId: string): void {
    if (!this.dashboard) return;
    
    const widget = this.widgetData.get(widgetId);
    if (!widget) return;

    // Find current widget's gridster item for position calculation
    const currentItem = this.widgets.find(w => w['id'] === widgetId);
    if (!currentItem) return;

    // Calculate new position (below the original widget)
    const newPositionY = (currentItem.y || 0) + (currentItem.rows || 2);
    
    // Create duplicate widget data
    const duplicateData = {
      name: `${widget.name} (Copy)`,
      widgetType: widget.type as any,
      sqlQuery: widget.sqlQuery || widget.config?.sqlQuery || '',
      dataSource: widget.config?.dataSource || 'postgresql',
      config: { ...widget.config },
      positionX: currentItem.x || 0,
      positionY: newPositionY,
      cols: currentItem.cols || 4,
      rows: currentItem.rows || 2
    };

    this.widgetBuilderService.widgetBuilderControllerCreateWidget({
      dashboardId: this.dashboard.id,
      body: duplicateData
    }).subscribe({
      next: (response: any) => {
        // Add new widget to the grid
        const newWidgetId = response.idWidget || response.id;
        
        const newGridsterItem: GridsterItem = {
          cols: duplicateData.cols,
          rows: duplicateData.rows,
          y: duplicateData.positionY,
          x: duplicateData.positionX,
          id: newWidgetId
        };
        
        // Create Widget object for widgetData map
        const newWidget: Widget = {
          id: newWidgetId,
          dashboardId: this.dashboard!.id,
          name: duplicateData.name,
          type: duplicateData.widgetType,
          sqlQuery: duplicateData.sqlQuery,
          config: duplicateData.config,
          position: {
            x: duplicateData.positionX,
            y: duplicateData.positionY,
            cols: duplicateData.cols,
            rows: duplicateData.rows
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        this.widgets.push(newGridsterItem);
        this.widgetData.set(newWidgetId, newWidget);
        
        console.log('Widget duplicated successfully:', newWidgetId);
      },
      error: (err: any) => {
        console.error('Failed to duplicate widget:', err);
        alert('Failed to duplicate widget: ' + (err.error?.message || err.message));
      }
    });
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

  // ========== Grafana-style Time Picker Methods ==========
  
  toggleTimePicker(): void {
    this.timePickerOpen = !this.timePickerOpen;
    if (this.timePickerOpen) {
      this.quickRangeSearch = '';
      this.loadRecentTimeRanges();
    }
  }

  closeTimePicker(): void {
    this.timePickerOpen = false;
  }

  get filteredQuickRanges() {
    if (!this.quickRangeSearch) {
      return this.timePresets;
    }
    const search = this.quickRangeSearch.toLowerCase();
    return this.timePresets.filter(p => 
      p.label.toLowerCase().includes(search) || 
      p.value.toLowerCase().includes(search)
    );
  }

  selectQuickRange(preset: { label: string; value: string; duration: number }): void {
    this.selectedTimePreset = preset.value;
    this.absoluteTimeFrom = 'now-' + preset.value;
    this.absoluteTimeTo = 'now';
    
    this.timeRange = {
      from: new Date(Date.now() - preset.duration),
      to: new Date(),
      label: preset.label
    };
    
    this.saveRecentTimeRange(this.absoluteTimeFrom, this.absoluteTimeTo, preset.label);
    this.closeTimePicker();
    this.refreshAllWidgets();
  }

  applyAbsoluteTimeRange(): void {
    const from = this.parseRelativeTime(this.absoluteTimeFrom);
    const to = this.parseRelativeTime(this.absoluteTimeTo);
    
    if (from && to) {
      this.selectedTimePreset = 'custom';
      this.timeRange = {
        from,
        to,
        label: `${this.absoluteTimeFrom} to ${this.absoluteTimeTo}`
      };
      
      this.saveRecentTimeRange(this.absoluteTimeFrom, this.absoluteTimeTo, this.timeRange.label || 'Custom');
      this.closeTimePicker();
      this.refreshAllWidgets();
    }
  }

  parseRelativeTime(input: string): Date | null {
    const now = new Date();
    
    if (input === 'now') {
      return now;
    }
    
    // Parse "now-Xm", "now-Xh", "now-Xd" format
    const relativeMatch = input.match(/^now-(\d+)(m|h|d|w|M|y)$/);
    if (relativeMatch) {
      const value = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2];
      const multipliers: { [key: string]: number } = {
        'm': 60 * 1000,           // minutes
        'h': 60 * 60 * 1000,      // hours
        'd': 24 * 60 * 60 * 1000, // days
        'w': 7 * 24 * 60 * 60 * 1000, // weeks
        'M': 30 * 24 * 60 * 60 * 1000, // months (approx)
        'y': 365 * 24 * 60 * 60 * 1000, // years (approx)
      };
      return new Date(now.getTime() - value * multipliers[unit]);
    }
    
    // Try parsing as absolute date
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  formatRelativeTime(): string {
    // Return display text for current time range
    if (this.selectedTimePreset !== 'custom') {
      const preset = this.timePresets.find(p => p.value === this.selectedTimePreset);
      return preset ? preset.label : 'Select time range';
    }
    return this.timeRange.label || `${this.absoluteTimeFrom} to ${this.absoluteTimeTo}`;
  }

  // Recent time ranges (stored in localStorage)
  private loadRecentTimeRanges(): void {
    try {
      const stored = localStorage.getItem('dashboard_recent_time_ranges');
      this.recentTimeRanges = stored ? JSON.parse(stored) : [];
    } catch {
      this.recentTimeRanges = [];
    }
  }

  private saveRecentTimeRange(from: string, to: string, label: string): void {
    const entry = { from, to, label };
    
    // Remove duplicate if exists
    this.recentTimeRanges = this.recentTimeRanges.filter(
      r => !(r.from === from && r.to === to)
    );
    
    // Add to beginning
    this.recentTimeRanges.unshift(entry);
    
    // Keep only last 5
    this.recentTimeRanges = this.recentTimeRanges.slice(0, 5);
    
    localStorage.setItem('dashboard_recent_time_ranges', JSON.stringify(this.recentTimeRanges));
  }

  applyRecentTimeRange(recent: { from: string; to: string; label: string }): void {
    this.absoluteTimeFrom = recent.from;
    this.absoluteTimeTo = recent.to;
    this.applyAbsoluteTimeRange();
  }

  copyTimeRangeUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('from', this.absoluteTimeFrom);
    url.searchParams.set('to', this.absoluteTimeTo);
    navigator.clipboard.writeText(url.toString());
  }

  copyShortLink(): void {
    // Copy shortened time range representation
    navigator.clipboard.writeText(`from=${this.absoluteTimeFrom}&to=${this.absoluteTimeTo}`);
  }

  getTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  getTimezoneOffset(): string {
    const offset = -new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // ========== Time Range Epoch Getters ==========
  // These return epoch milliseconds for widget-container to use
  
  getTimeFrom(): number {
    return this.timeRange.from.getTime();
  }

  getTimeTo(): number {
    return this.timeRange.to.getTime();
  }

  // ========== Calendar Picker Methods ==========
  
  toggleCalendar(target: 'from' | 'to'): void {
    if (this.activeCalendar === target) {
      this.activeCalendar = null;
    } else {
      this.activeCalendar = target;
      // Initialize calendar to current time range or now
      if (target === 'from') {
        this.fromCalendarDate = new Date(this.timeRange.from);
        this.fromSelectedDate = new Date(this.timeRange.from);
        this.fromTime = this.formatTime(this.timeRange.from);
      } else {
        this.toCalendarDate = new Date(this.timeRange.to);
        this.toSelectedDate = new Date(this.timeRange.to);
        this.toTime = this.formatTime(this.timeRange.to);
      }
    }
  }

  closeCalendar(): void {
    this.activeCalendar = null;
  }

  getCalendarTitle(target: 'from' | 'to'): string {
    const date = target === 'from' ? this.fromCalendarDate : this.toCalendarDate;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  prevMonth(target: 'from' | 'to'): void {
    if (target === 'from') {
      this.fromCalendarDate = new Date(
        this.fromCalendarDate.getFullYear(),
        this.fromCalendarDate.getMonth() - 1,
        1
      );
    } else {
      this.toCalendarDate = new Date(
        this.toCalendarDate.getFullYear(),
        this.toCalendarDate.getMonth() - 1,
        1
      );
    }
  }

  nextMonth(target: 'from' | 'to'): void {
    if (target === 'from') {
      this.fromCalendarDate = new Date(
        this.fromCalendarDate.getFullYear(),
        this.fromCalendarDate.getMonth() + 1,
        1
      );
    } else {
      this.toCalendarDate = new Date(
        this.toCalendarDate.getFullYear(),
        this.toCalendarDate.getMonth() + 1,
        1
      );
    }
  }

  getCalendarDays(target: 'from' | 'to'): { day: number; date: Date; otherMonth: boolean; isToday: boolean; isSelected: boolean }[] {
    const calDate = target === 'from' ? this.fromCalendarDate : this.toCalendarDate;
    const selectedDate = target === 'from' ? this.fromSelectedDate : this.toSelectedDate;
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days: { day: number; date: Date; otherMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];
    
    // Days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        day: date.getDate(),
        date,
        otherMonth: true,
        isToday: false,
        isSelected: false
      });
    }
    
    // Days in current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate ? 
        date.toDateString() === selectedDate.toDateString() : false;
      days.push({
        day: d,
        date,
        otherMonth: false,
        isToday,
        isSelected
      });
    }
    
    // Days from next month to complete grid (6 rows × 7 days = 42)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        day: i,
        date,
        otherMonth: true,
        isToday: false,
        isSelected: false
      });
    }
    
    return days;
  }

  selectDate(target: 'from' | 'to', day: { day: number; date: Date; otherMonth: boolean }): void {
    if (target === 'from') {
      this.fromSelectedDate = day.date;
      if (day.otherMonth) {
        this.fromCalendarDate = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
      }
    } else {
      this.toSelectedDate = day.date;
      if (day.otherMonth) {
        this.toCalendarDate = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
      }
    }
  }

  applyCalendarDate(target: 'from' | 'to'): void {
    const selectedDate = target === 'from' ? this.fromSelectedDate : this.toSelectedDate;
    const timeStr = target === 'from' ? this.fromTime : this.toTime;
    
    if (selectedDate) {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      const finalDate = new Date(selectedDate);
      finalDate.setHours(hours || 0, minutes || 0, seconds || 0, 0);
      
      // Format as ISO string for display
      const isoStr = finalDate.toISOString().slice(0, 19).replace('T', ' ');
      
      if (target === 'from') {
        this.absoluteTimeFrom = isoStr;
      } else {
        this.absoluteTimeTo = isoStr;
      }
    }
    
    this.activeCalendar = null;
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 8); // HH:MM:SS
  }
}
