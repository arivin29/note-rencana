# 📋 06 - Frontend Architecture

> **Document:** Frontend Architecture (Angular)  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 6.1 Module Structure

```
iot-angular/src/app/pages/iot/
├── dynamic-dashboards/
│   ├── dynamic-dashboards.module.ts         # Feature module
│   ├── dynamic-dashboards-routing.module.ts # Routing
│   │
│   ├── pages/                               # Page components
│   │   ├── dashboard-list/
│   │   │   ├── dashboard-list.component.ts
│   │   │   ├── dashboard-list.component.html
│   │   │   └── dashboard-list.component.scss
│   │   │
│   │   ├── dashboard-editor/
│   │   │   ├── dashboard-editor.component.ts
│   │   │   ├── dashboard-editor.component.html
│   │   │   └── dashboard-editor.component.scss
│   │   │
│   │   └── dashboard-viewer/
│   │       ├── dashboard-viewer.component.ts
│   │       ├── dashboard-viewer.component.html
│   │       └── dashboard-viewer.component.scss
│   │
│   ├── components/                          # Shared components
│   │   ├── dashboard-canvas/
│   │   │   ├── dashboard-canvas.component.ts
│   │   │   ├── dashboard-canvas.component.html
│   │   │   └── dashboard-canvas.component.scss
│   │   │
│   │   ├── widget-wrapper/
│   │   │   ├── widget-wrapper.component.ts
│   │   │   ├── widget-wrapper.component.html
│   │   │   └── widget-wrapper.component.scss
│   │   │
│   │   ├── widget-toolbar/
│   │   │   ├── widget-toolbar.component.ts
│   │   │   ├── widget-toolbar.component.html
│   │   │   └── widget-toolbar.component.scss
│   │   │
│   │   ├── widget-library-panel/
│   │   │   ├── widget-library-panel.component.ts
│   │   │   ├── widget-library-panel.component.html
│   │   │   └── widget-library-panel.component.scss
│   │   │
│   │   ├── widget-config-modal/
│   │   │   ├── widget-config-modal.component.ts
│   │   │   ├── widget-config-modal.component.html
│   │   │   └── widget-config-modal.component.scss
│   │   │
│   │   ├── data-source-selector/
│   │   │   ├── data-source-selector.component.ts
│   │   │   ├── data-source-selector.component.html
│   │   │   └── data-source-selector.component.scss
│   │   │
│   │   ├── time-range-picker/
│   │   │   ├── time-range-picker.component.ts
│   │   │   ├── time-range-picker.component.html
│   │   │   └── time-range-picker.component.scss
│   │   │
│   │   └── dashboard-header/
│   │       ├── dashboard-header.component.ts
│   │       ├── dashboard-header.component.html
│   │       └── dashboard-header.component.scss
│   │
│   ├── widgets/                             # Widget components
│   │   ├── base/
│   │   │   ├── base-widget.component.ts     # Abstract base
│   │   │   ├── widget.interface.ts          # Interfaces
│   │   │   └── widget-config-base.component.ts
│   │   │
│   │   ├── line-chart/
│   │   │   ├── line-chart-widget.component.ts
│   │   │   ├── line-chart-widget.component.html
│   │   │   ├── line-chart-widget.component.scss
│   │   │   └── line-chart-config.component.ts
│   │   │
│   │   ├── gauge/
│   │   │   ├── gauge-widget.component.ts
│   │   │   ├── gauge-widget.component.html
│   │   │   ├── gauge-widget.component.scss
│   │   │   └── gauge-config.component.ts
│   │   │
│   │   ├── single-value/
│   │   │   ├── single-value-widget.component.ts
│   │   │   ├── single-value-widget.component.html
│   │   │   ├── single-value-widget.component.scss
│   │   │   └── single-value-config.component.ts
│   │   │
│   │   ├── table/
│   │   │   ├── table-widget.component.ts
│   │   │   ├── table-widget.component.html
│   │   │   ├── table-widget.component.scss
│   │   │   └── table-config.component.ts
│   │   │
│   │   ├── status-indicator/
│   │   │   ├── status-indicator-widget.component.ts
│   │   │   ├── status-indicator-widget.component.html
│   │   │   ├── status-indicator-widget.component.scss
│   │   │   └── status-indicator-config.component.ts
│   │   │
│   │   ├── bar-chart/
│   │   │   ├── bar-chart-widget.component.ts
│   │   │   ├── bar-chart-widget.component.html
│   │   │   ├── bar-chart-widget.component.scss
│   │   │   └── bar-chart-config.component.ts
│   │   │
│   │   └── pie-chart/
│   │       ├── pie-chart-widget.component.ts
│   │       ├── pie-chart-widget.component.html
│   │       ├── pie-chart-widget.component.scss
│   │       └── pie-chart-config.component.ts
│   │
│   ├── services/                            # Services
│   │   ├── dashboard-state.service.ts       # State management
│   │   ├── widget-registry.service.ts       # Widget type registry
│   │   ├── widget-data.service.ts           # Data fetching
│   │   ├── dashboard-realtime.service.ts    # WebSocket
│   │   └── dashboard-export.service.ts      # Export/Import
│   │
│   └── models/                              # TypeScript models
│       ├── dashboard.model.ts
│       ├── widget.model.ts
│       ├── data-source.model.ts
│       └── widget-config.model.ts
```

---

## 6.2 Routing Configuration

```typescript
// dynamic-dashboards-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardListComponent } from './pages/dashboard-list/dashboard-list.component';
import { DashboardEditorComponent } from './pages/dashboard-editor/dashboard-editor.component';
import { DashboardViewerComponent } from './pages/dashboard-viewer/dashboard-viewer.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardListComponent,
    data: { title: 'Dashboards' },
  },
  {
    path: 'new',
    component: DashboardEditorComponent,
    data: { title: 'New Dashboard', mode: 'create' },
  },
  {
    path: ':id/edit',
    component: DashboardEditorComponent,
    data: { title: 'Edit Dashboard', mode: 'edit' },
  },
  {
    path: ':id/view',
    component: DashboardViewerComponent,
    data: { title: 'View Dashboard' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DynamicDashboardsRoutingModule {}
```

---

## 6.3 Module Definition

```typescript
// dynamic-dashboards.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Third-party modules
import { GridsterModule } from 'angular-gridster2';
import { NgxEchartsModule } from 'ngx-echarts';
import { NgSelectModule } from '@ng-select/ng-select';
import { ColorPickerModule } from 'ngx-color-picker';

// Routing
import { DynamicDashboardsRoutingModule } from './dynamic-dashboards-routing.module';

// Pages
import { DashboardListComponent } from './pages/dashboard-list/dashboard-list.component';
import { DashboardEditorComponent } from './pages/dashboard-editor/dashboard-editor.component';
import { DashboardViewerComponent } from './pages/dashboard-viewer/dashboard-viewer.component';

// Components
import { DashboardCanvasComponent } from './components/dashboard-canvas/dashboard-canvas.component';
import { WidgetWrapperComponent } from './components/widget-wrapper/widget-wrapper.component';
import { WidgetToolbarComponent } from './components/widget-toolbar/widget-toolbar.component';
import { WidgetLibraryPanelComponent } from './components/widget-library-panel/widget-library-panel.component';
import { WidgetConfigModalComponent } from './components/widget-config-modal/widget-config-modal.component';
import { DataSourceSelectorComponent } from './components/data-source-selector/data-source-selector.component';
import { TimeRangePickerComponent } from './components/time-range-picker/time-range-picker.component';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';

// Widgets
import { LineChartWidgetComponent } from './widgets/line-chart/line-chart-widget.component';
import { GaugeWidgetComponent } from './widgets/gauge/gauge-widget.component';
import { SingleValueWidgetComponent } from './widgets/single-value/single-value-widget.component';
import { TableWidgetComponent } from './widgets/table/table-widget.component';
import { StatusIndicatorWidgetComponent } from './widgets/status-indicator/status-indicator-widget.component';
import { BarChartWidgetComponent } from './widgets/bar-chart/bar-chart-widget.component';
import { PieChartWidgetComponent } from './widgets/pie-chart/pie-chart-widget.component';

// Widget Configs
import { LineChartConfigComponent } from './widgets/line-chart/line-chart-config.component';
import { GaugeConfigComponent } from './widgets/gauge/gauge-config.component';
import { SingleValueConfigComponent } from './widgets/single-value/single-value-config.component';
import { TableConfigComponent } from './widgets/table/table-config.component';
import { StatusIndicatorConfigComponent } from './widgets/status-indicator/status-indicator-config.component';
import { BarChartConfigComponent } from './widgets/bar-chart/bar-chart-config.component';
import { PieChartConfigComponent } from './widgets/pie-chart/pie-chart-config.component';

// Services
import { DashboardStateService } from './services/dashboard-state.service';
import { WidgetRegistryService } from './services/widget-registry.service';
import { WidgetDataService } from './services/widget-data.service';
import { DashboardRealtimeService } from './services/dashboard-realtime.service';

// Shared Module (if exists)
// import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  declarations: [
    // Pages
    DashboardListComponent,
    DashboardEditorComponent,
    DashboardViewerComponent,
    
    // Components
    DashboardCanvasComponent,
    WidgetWrapperComponent,
    WidgetToolbarComponent,
    WidgetLibraryPanelComponent,
    WidgetConfigModalComponent,
    DataSourceSelectorComponent,
    TimeRangePickerComponent,
    DashboardHeaderComponent,
    
    // Widgets
    LineChartWidgetComponent,
    GaugeWidgetComponent,
    SingleValueWidgetComponent,
    TableWidgetComponent,
    StatusIndicatorWidgetComponent,
    BarChartWidgetComponent,
    PieChartWidgetComponent,
    
    // Widget Configs
    LineChartConfigComponent,
    GaugeConfigComponent,
    SingleValueConfigComponent,
    TableConfigComponent,
    StatusIndicatorConfigComponent,
    BarChartConfigComponent,
    PieChartConfigComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DynamicDashboardsRoutingModule,
    
    // Third-party
    GridsterModule,
    NgxEchartsModule,
    NgSelectModule,
    ColorPickerModule,
    
    // SharedModule,
  ],
  providers: [
    DashboardStateService,
    WidgetRegistryService,
    WidgetDataService,
    DashboardRealtimeService,
  ],
})
export class DynamicDashboardsModule {}
```

---

## 6.4 State Management

### Dashboard State Service

```typescript
// services/dashboard-state.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Dashboard, Widget, TimeRange } from '../models';

export interface DashboardState {
  dashboard: Dashboard | null;
  widgets: Widget[];
  selectedWidget: Widget | null;
  editMode: boolean;
  isDirty: boolean;
  timeRange: TimeRange;
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  dashboard: null,
  widgets: [],
  selectedWidget: null,
  editMode: false,
  isDirty: false,
  timeRange: { type: 'relative', value: '1h' },
  isLoading: false,
  error: null,
};

@Injectable()
export class DashboardStateService {
  private state$ = new BehaviorSubject<DashboardState>(initialState);

  // Selectors
  get state(): Observable<DashboardState> {
    return this.state$.asObservable();
  }

  get dashboard$(): Observable<Dashboard | null> {
    return new BehaviorSubject(this.state$.value.dashboard);
  }

  get widgets$(): Observable<Widget[]> {
    return new BehaviorSubject(this.state$.value.widgets);
  }

  get selectedWidget$(): Observable<Widget | null> {
    return new BehaviorSubject(this.state$.value.selectedWidget);
  }

  get editMode$(): Observable<boolean> {
    return new BehaviorSubject(this.state$.value.editMode);
  }

  get timeRange$(): Observable<TimeRange> {
    return new BehaviorSubject(this.state$.value.timeRange);
  }

  // Actions
  setDashboard(dashboard: Dashboard): void {
    this.patchState({
      dashboard,
      widgets: dashboard.widgets || [],
      isDirty: false,
    });
  }

  setWidgets(widgets: Widget[]): void {
    this.patchState({ widgets, isDirty: true });
  }

  addWidget(widget: Widget): void {
    const widgets = [...this.state$.value.widgets, widget];
    this.patchState({ widgets, isDirty: true });
  }

  updateWidget(widgetId: string, updates: Partial<Widget>): void {
    const widgets = this.state$.value.widgets.map((w) =>
      w.idWidget === widgetId ? { ...w, ...updates } : w
    );
    this.patchState({ widgets, isDirty: true });
  }

  removeWidget(widgetId: string): void {
    const widgets = this.state$.value.widgets.filter(
      (w) => w.idWidget !== widgetId
    );
    this.patchState({ widgets, isDirty: true });
  }

  selectWidget(widget: Widget | null): void {
    this.patchState({ selectedWidget: widget });
  }

  setEditMode(editMode: boolean): void {
    this.patchState({ editMode });
  }

  setTimeRange(timeRange: TimeRange): void {
    this.patchState({ timeRange });
  }

  setLoading(isLoading: boolean): void {
    this.patchState({ isLoading });
  }

  setError(error: string | null): void {
    this.patchState({ error });
  }

  markAsSaved(): void {
    this.patchState({ isDirty: false });
  }

  reset(): void {
    this.state$.next(initialState);
  }

  // Helpers
  private patchState(patch: Partial<DashboardState>): void {
    this.state$.next({ ...this.state$.value, ...patch });
  }

  getCurrentState(): DashboardState {
    return this.state$.value;
  }
}
```

---

## 6.5 Component Architecture

### Dashboard Editor Component

```typescript
// pages/dashboard-editor/dashboard-editor.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';

import { DashboardStateService } from '../../services/dashboard-state.service';
import { WidgetRegistryService } from '../../services/widget-registry.service';
import { Dashboard, Widget } from '../../models';

// SDK Services (auto-generated)
import { DashboardsService, WidgetsService } from '@api/services';

@Component({
  selector: 'app-dashboard-editor',
  templateUrl: './dashboard-editor.component.html',
  styleUrls: ['./dashboard-editor.component.scss'],
})
export class DashboardEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dashboardId: string | null = null;
  mode: 'create' | 'edit' = 'create';

  // Gridster config
  gridsterOptions: GridsterConfig = {
    gridType: 'fit',
    displayGrid: 'onDrag&Resize',
    pushItems: true,
    draggable: { enabled: true },
    resizable: { enabled: true },
    minCols: 12,
    maxCols: 12,
    minRows: 10,
    maxRows: 100,
    defaultItemCols: 4,
    defaultItemRows: 3,
    margin: 10,
    outerMargin: true,
    itemChangeCallback: this.onItemChange.bind(this),
    itemResizeCallback: this.onItemResize.bind(this),
  };

  // UI State
  showWidgetLibrary = true;
  showConfigModal = false;
  configWidget: Widget | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public stateService: DashboardStateService,
    public widgetRegistry: WidgetRegistryService,
    private dashboardsApi: DashboardsService,
    private widgetsApi: WidgetsService,
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.dashboardId = this.route.snapshot.paramMap.get('id');

    this.stateService.setEditMode(true);

    if (this.dashboardId) {
      this.loadDashboard(this.dashboardId);
    } else {
      this.initNewDashboard();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stateService.reset();
  }

  // ==================== Data Loading ====================

  private loadDashboard(id: string): void {
    this.stateService.setLoading(true);

    this.dashboardsApi.findOne(id).subscribe({
      next: (dashboard) => {
        this.stateService.setDashboard(dashboard);
        this.stateService.setLoading(false);
      },
      error: (err) => {
        this.stateService.setError('Failed to load dashboard');
        this.stateService.setLoading(false);
      },
    });
  }

  private initNewDashboard(): void {
    const newDashboard: Dashboard = {
      idDashboard: '',
      name: 'Untitled Dashboard',
      description: '',
      widgets: [],
      settings: {
        refreshInterval: 30,
        theme: 'light',
        timeRange: { type: 'relative', value: '1h' },
      },
      layout: {
        columns: 12,
        rowHeight: 50,
        margin: [10, 10],
      },
    };
    this.stateService.setDashboard(newDashboard);
  }

  // ==================== Widget Actions ====================

  onAddWidget(widgetType: string): void {
    const definition = this.widgetRegistry.getDefinition(widgetType);
    if (!definition) return;

    const newWidget: Widget = {
      idWidget: this.generateTempId(),
      widgetType,
      title: definition.name,
      gridPosition: this.findEmptyPosition(definition.defaultSize),
      gridSize: { ...definition.defaultSize },
      dataSource: {},
      config: { ...definition.defaultConfig },
      refreshIntervalSec: 30,
    };

    this.stateService.addWidget(newWidget);
    this.openConfigModal(newWidget);
  }

  onEditWidget(widget: Widget): void {
    this.openConfigModal(widget);
  }

  onDeleteWidget(widget: Widget): void {
    if (confirm('Are you sure you want to delete this widget?')) {
      this.stateService.removeWidget(widget.idWidget);
    }
  }

  onDuplicateWidget(widget: Widget): void {
    const duplicate: Widget = {
      ...widget,
      idWidget: this.generateTempId(),
      title: `${widget.title} (Copy)`,
      gridPosition: this.findEmptyPosition(widget.gridSize),
    };
    this.stateService.addWidget(duplicate);
  }

  // ==================== Grid Events ====================

  onItemChange(item: GridsterItem, itemComponent: any): void {
    const widget = this.findWidgetByItem(item);
    if (widget) {
      this.stateService.updateWidget(widget.idWidget, {
        gridPosition: { x: item.x, y: item.y },
        gridSize: { w: item.cols, h: item.rows },
      });
    }
  }

  onItemResize(item: GridsterItem, itemComponent: any): void {
    // Trigger chart resize
    window.dispatchEvent(new Event('resize'));
  }

  // ==================== Config Modal ====================

  openConfigModal(widget: Widget): void {
    this.configWidget = widget;
    this.showConfigModal = true;
  }

  onConfigSave(config: { dataSource: any; config: any }): void {
    if (this.configWidget) {
      this.stateService.updateWidget(this.configWidget.idWidget, {
        dataSource: config.dataSource,
        config: config.config,
      });
    }
    this.closeConfigModal();
  }

  closeConfigModal(): void {
    this.showConfigModal = false;
    this.configWidget = null;
  }

  // ==================== Save ====================

  async saveDashboard(): Promise<void> {
    const state = this.stateService.getCurrentState();
    if (!state.dashboard) return;

    this.stateService.setLoading(true);

    try {
      let savedDashboard: Dashboard;

      if (this.mode === 'create') {
        // Create dashboard
        savedDashboard = await this.dashboardsApi
          .create({
            name: state.dashboard.name,
            description: state.dashboard.description,
            settings: state.dashboard.settings,
            layout: state.dashboard.layout,
          })
          .toPromise();

        // Create widgets
        for (const widget of state.widgets) {
          await this.widgetsApi
            .create(savedDashboard.idDashboard, {
              widgetType: widget.widgetType,
              title: widget.title,
              gridPosition: widget.gridPosition,
              gridSize: widget.gridSize,
              dataSource: widget.dataSource,
              config: widget.config,
              refreshIntervalSec: widget.refreshIntervalSec,
            })
            .toPromise();
        }

        this.router.navigate(['/iot/dynamic-dashboards', savedDashboard.idDashboard, 'edit']);
      } else {
        // Update dashboard
        savedDashboard = await this.dashboardsApi
          .update(this.dashboardId!, {
            name: state.dashboard.name,
            description: state.dashboard.description,
            settings: state.dashboard.settings,
            layout: state.dashboard.layout,
          })
          .toPromise();

        // Bulk update widget positions
        await this.widgetsApi
          .bulkUpdatePositions(this.dashboardId!, {
            positions: state.widgets.map((w) => ({
              idWidget: w.idWidget,
              x: w.gridPosition.x,
              y: w.gridPosition.y,
              w: w.gridSize.w,
              h: w.gridSize.h,
            })),
          })
          .toPromise();
      }

      this.stateService.markAsSaved();
      // Show success toast
    } catch (error) {
      this.stateService.setError('Failed to save dashboard');
    } finally {
      this.stateService.setLoading(false);
    }
  }

  // ==================== Helpers ====================

  private generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private findEmptyPosition(size: { w: number; h: number }): { x: number; y: number } {
    // Simple implementation - find next available position
    const state = this.stateService.getCurrentState();
    let maxY = 0;

    state.widgets.forEach((w) => {
      const bottomY = w.gridPosition.y + w.gridSize.h;
      if (bottomY > maxY) maxY = bottomY;
    });

    return { x: 0, y: maxY };
  }

  private findWidgetByItem(item: GridsterItem): Widget | undefined {
    const state = this.stateService.getCurrentState();
    return state.widgets.find(
      (w) => w.gridPosition.x === item.x && w.gridPosition.y === item.y
    );
  }
}
```

### Dashboard Editor Template

```html
<!-- pages/dashboard-editor/dashboard-editor.component.html -->

<div class="dashboard-editor" [class.loading]="(stateService.state | async)?.isLoading">
  
  <!-- Header -->
  <app-dashboard-header
    [dashboard]="(stateService.state | async)?.dashboard"
    [isDirty]="(stateService.state | async)?.isDirty"
    [editMode]="true"
    (save)="saveDashboard()"
    (toggleLibrary)="showWidgetLibrary = !showWidgetLibrary">
  </app-dashboard-header>

  <div class="editor-container">
    
    <!-- Widget Library Panel (Sidebar) -->
    <app-widget-library-panel
      *ngIf="showWidgetLibrary"
      class="library-panel"
      (addWidget)="onAddWidget($event)">
    </app-widget-library-panel>

    <!-- Canvas -->
    <div class="canvas-container" [class.with-library]="showWidgetLibrary">
      <app-dashboard-canvas
        [widgets]="(stateService.state | async)?.widgets || []"
        [options]="gridsterOptions"
        [editMode]="true"
        (editWidget)="onEditWidget($event)"
        (deleteWidget)="onDeleteWidget($event)"
        (duplicateWidget)="onDuplicateWidget($event)">
      </app-dashboard-canvas>
    </div>

  </div>

  <!-- Widget Config Modal -->
  <app-widget-config-modal
    *ngIf="showConfigModal && configWidget"
    [widget]="configWidget"
    (save)="onConfigSave($event)"
    (close)="closeConfigModal()">
  </app-widget-config-modal>

  <!-- Loading Overlay -->
  <div class="loading-overlay" *ngIf="(stateService.state | async)?.isLoading">
    <div class="spinner"></div>
  </div>
</div>
```

---

## 6.6 Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Dashboard Editor Page                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         DashboardHeader                                 │ │
│  │  [Title] [Settings] [Time Range Picker] [Save] [View] [Toggle Library] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────────────────────────┐ │
│  │  WidgetLibrary   │  │               DashboardCanvas                    │ │
│  │     Panel        │  │  ┌─────────────────────────────────────────────┐ │ │
│  │                  │  │  │              Gridster Grid                  │ │ │
│  │  ╔═══════════╗  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │ │
│  │  ║ Line Chart║  │  │  │  │ Widget   │  │ Widget   │  │ Widget   │  │ │ │
│  │  ╚═══════════╝  │drag│  │ Wrapper  │  │ Wrapper  │  │ Wrapper  │  │ │ │
│  │  ╔═══════════╗──┼──>│  │ ┌──────┐  │  │ ┌──────┐ │  │ ┌──────┐ │  │ │ │
│  │  ║   Gauge   ║  │  │  │ │Toolbar│  │  │ │Toolbar│ │  │ │Toolbar│ │  │ │ │
│  │  ╚═══════════╝  │  │  │ └──────┘  │  │ └──────┘ │  │ └──────┘ │  │ │ │
│  │  ╔═══════════╗  │  │  │ ┌──────┐  │  │ ┌──────┐ │  │ ┌──────┐ │  │ │ │
│  │  ║  Value    ║  │  │  │ │Widget│  │  │ │Widget│ │  │ │Widget│ │  │ │ │
│  │  ╚═══════════╝  │  │  │ │ Comp │  │  │ │ Comp │ │  │ │ Comp │ │  │ │ │
│  │  ╔═══════════╗  │  │  │ └──────┘  │  │ └──────┘ │  │ └──────┘ │  │ │ │
│  │  ║   Table   ║  │  │  │  └──────────┘  └──────────┘  └──────────┘  │ │ │
│  │  ╚═══════════╝  │  │  └─────────────────────────────────────────────┘ │ │
│  │                  │  │                                                  │ │
│  └──────────────────┘  └──────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    WidgetConfigModal (when open)                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  [Widget Title Input]                                           │  │ │
│  │  │                                                                  │  │ │
│  │  │  DataSourceSelector                                              │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │ │
│  │  │  │ Node Select │→ │Sensor Select│→ │Channel Sel  │              │  │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘              │  │ │
│  │  │                                                                  │  │ │
│  │  │  Widget-specific Config Component                                │  │ │
│  │  │  (e.g., LineChartConfig, GaugeConfig)                           │  │ │
│  │  │                                                                  │  │ │
│  │  │  [Cancel] [Save]                                                 │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Services
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Services Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐    ┌────────────────────┐    ┌──────────────────┐  │
│  │ DashboardState     │    │ WidgetRegistry     │    │ WidgetData       │  │
│  │    Service         │    │    Service         │    │   Service        │  │
│  │                    │    │                    │    │                  │  │
│  │ • dashboard$       │    │ • getDefinition()  │    │ • fetchData()    │  │
│  │ • widgets$         │    │ • getAllTypes()    │    │ • subscribe()    │  │
│  │ • editMode$        │    │ • register()       │    │                  │  │
│  │ • timeRange$       │    │                    │    │                  │  │
│  └────────────────────┘    └────────────────────┘    └──────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           SDK API Services                             │ │
│  │  DashboardsService  |  WidgetsService  |  WidgetDataService           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6.7 CSS Architecture

```scss
// styles/dashboard-variables.scss

// Grid
$grid-columns: 12;
$grid-row-height: 50px;
$grid-margin: 10px;

// Widget
$widget-border-radius: 8px;
$widget-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
$widget-bg: #ffffff;
$widget-header-height: 40px;

// Toolbar
$toolbar-height: 36px;
$toolbar-bg: rgba(0, 0, 0, 0.02);

// Colors
$primary-color: #1890ff;
$success-color: #52c41a;
$warning-color: #faad14;
$danger-color: #f5222d;

// Breakpoints
$breakpoint-sm: 576px;
$breakpoint-md: 768px;
$breakpoint-lg: 992px;
$breakpoint-xl: 1200px;
```

```scss
// pages/dashboard-editor/dashboard-editor.component.scss

@import '../../styles/dashboard-variables';

.dashboard-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6fa;

  &.loading {
    pointer-events: none;
    opacity: 0.7;
  }
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.library-panel {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.3s ease;

  @media (max-width: $breakpoint-md) {
    position: absolute;
    left: 0;
    top: 60px;
    bottom: 0;
    z-index: 100;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }
}

.canvas-container {
  flex: 1;
  overflow: auto;
  padding: $grid-margin;

  &.with-library {
    margin-left: 0;
  }
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid $primary-color;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 6.8 File Summary

| Component | File | Purpose | Phase |
|-----------|------|---------|-------|
| DashboardListComponent | `dashboard-list.component.ts` | List all dashboards | Phase 1 |
| DashboardEditorComponent | `dashboard-editor.component.ts` | Edit dashboard | Phase 1 |
| DashboardViewerComponent | `dashboard-viewer.component.ts` | View-only mode | Phase 2 |
| DashboardCanvasComponent | `dashboard-canvas.component.ts` | Gridster wrapper | Phase 1 |
| WidgetWrapperComponent | `widget-wrapper.component.ts` | Widget container | Phase 1 |
| WidgetLibraryPanelComponent | `widget-library-panel.component.ts` | Widget picker | Phase 2 |
| WidgetConfigModalComponent | `widget-config-modal.component.ts` | Config dialog | Phase 2 |
| DataSourceSelectorComponent | `data-source-selector.component.ts` | Node/Sensor picker | Phase 3 |
| TimeRangePickerComponent | `time-range-picker.component.ts` | Time range | Phase 3 |
| DashboardStateService | `dashboard-state.service.ts` | State management | Phase 1 |
| WidgetRegistryService | `widget-registry.service.ts` | Widget types | Phase 2 |

---

## Navigation

⬅️ [Previous: Backend Architecture](./05-BACKEND-ARCHITECTURE.md) | [Back to Index](./00-INDEX.md) | [Next: Widget System](./07-WIDGET-SYSTEM.md) ➡️
