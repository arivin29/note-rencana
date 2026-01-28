# 📋 07 - Widget System

> **Document:** Widget System Design  
> **Version:** 1.1.0  
> **Last Updated:** January 25, 2026  
> **Chart Library:** Apache ECharts (via ngx-echarts)

---

## 7.1 Widget Types Overview

> 📚 **See Also:** [15-CHART-TYPES-CATALOG.md](./15-CHART-TYPES-CATALOG.md) for detailed chart configurations

### Phase 1 - Essential (MVP)

| Type | Name | Use Case | ECharts Type | Priority |
|------|------|----------|--------------|----------|
| `line-chart` | Line Chart | Time series trend | `line` | 🔴 HIGH |
| `multi-line-chart` | Multi-Line Chart | Compare sensors | `line` (multi) | � HIGH |
| `dual-axis-chart` | Dual-Axis Chart | Different units | `line` (2 yAxis) | 🔴 HIGH |
| `gauge` | Gauge | Current value | `gauge` | 🔴 HIGH |
| `value-card` | Value Card | Big number display | Custom | � HIGH |
| `pie-chart` | Pie/Donut Chart | Distribution | `pie` | 🔴 HIGH |
| `heatmap` | Heatmap | Status grid | `heatmap` | 🔴 HIGH |
| `data-table` | Data Table | Raw data | Custom | 🔴 HIGH |

### Phase 2 - Enhanced

| Type | Name | Use Case | ECharts Type | Priority |
|------|------|----------|--------------|----------|
| `area-chart` | Area Chart | Volume data | `line` + areaStyle | 🟡 MEDIUM |
| `bar-chart` | Bar Chart | Comparison | `bar` | 🟡 MEDIUM |
| `stacked-bar` | Stacked Bar | Composition | `bar` (stacked) | 🟡 MEDIUM |
| `sparkline` | Sparkline | Mini trend | `line` (minimal) | 🟡 MEDIUM |
| `step-line` | Step Line | State changes | `line` (step) | � MEDIUM |
| `alert-timeline` | Alert Timeline | Event log | `scatter` | 🟡 MEDIUM |

### Phase 3 - Advanced (Future)

| Type | Name | Use Case | ECharts Type | Priority |
|------|------|----------|--------------|----------|
| `scatter-plot` | Scatter Plot | Correlation | `scatter` | 🟢 LOW |
| `box-plot` | Box Plot | Statistics | `boxplot` | 🟢 LOW |
| `radar-chart` | Radar Chart | Multi-metric | `radar` | � LOW |
| `geo-map` | Geographic Map | Locations | `map` | � LOW |

---

## 7.2 Widget Base Interface

```typescript
// models/widget.interface.ts

export type WidgetType = 
  // Phase 1 - Essential
  | 'line-chart'
  | 'multi-line-chart'
  | 'dual-axis-chart'
  | 'gauge'
  | 'value-card'
  | 'pie-chart'
  | 'heatmap'
  | 'data-table'
  // Phase 2 - Enhanced
  | 'area-chart'
  | 'bar-chart'
  | 'stacked-bar'
  | 'sparkline'
  | 'step-line'
  | 'alert-timeline'
  // Phase 3 - Advanced
  | 'scatter-plot'
  | 'box-plot'
  | 'radar-chart'
  | 'geo-map';

export interface Widget {
  idWidget: string;
  idDashboard: string;
  widgetType: WidgetType;
  title: string;
  description?: string;
  
  // Grid Layout
  gridPosition: GridPosition;
  gridSize: GridSize;
  
  // Data
  dataSource: DataSourceConfig;
  
  // Widget-specific config
  config: WidgetConfig;
  
  // Behavior
  refreshIntervalSec: number;
  zIndex: number;
  isVisible: boolean;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GridPosition {
  x: number;  // Column (0-based)
  y: number;  // Row (0-based)
}

export interface GridSize {
  w: number;  // Width in columns
  h: number;  // Height in rows
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// Union type for all widget configs
export type WidgetConfig = 
  | LineChartConfig
  | BarChartConfig
  | PieChartConfig
  | GaugeConfig
  | SingleValueConfig
  | TableConfig
  | StatusIndicatorConfig
  | MapConfig;
```

---

## 7.3 Data Source Configuration

```typescript
// models/data-source.model.ts

export type DataSourceType = 'sensor' | 'node' | 'alert' | 'aggregate' | 'static';

export interface DataSourceConfig {
  type: DataSourceType;
  
  // For sensor/node type
  nodeId?: string;
  nodeName?: string;      // For display
  sensorId?: string;
  sensorName?: string;    // For display
  channelKey?: string;
  channelLabel?: string;  // For display
  
  // For multiple sources (comparison charts)
  sources?: DataSourceItem[];
  
  // Query options
  aggregation?: AggregationType;
  groupBy?: GroupByType;
  
  // Time range override
  timeRange?: TimeRangeConfig;
  
  // Filters
  filters?: DataFilter[];
  
  // For static type
  staticValue?: any;
}

export interface DataSourceItem {
  nodeId: string;
  sensorId: string;
  channelKey: string;
  label?: string;   // Legend label
  color?: string;   // Series color
}

export type AggregationType = 'last' | 'avg' | 'min' | 'max' | 'sum' | 'count';
export type GroupByType = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface TimeRangeConfig {
  type: 'relative' | 'absolute' | 'dashboard';
  value?: string;        // For relative: '15m', '1h', '24h', '7d'
  from?: string;         // For absolute: ISO timestamp
  to?: string;           // For absolute: ISO timestamp
}

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}
```

---

## 7.4 Widget-Specific Configurations

### Line Chart

```typescript
// models/configs/line-chart-config.ts

export interface LineChartConfig {
  // Axis
  yAxisLabel?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  xAxisLabel?: string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  
  // Visual
  lineColor?: string;
  lineWidth?: number;
  smooth?: boolean;         // Smooth curve vs straight line
  showPoints?: boolean;     // Show data points
  pointSize?: number;
  
  // Fill
  fillArea?: boolean;
  fillOpacity?: number;     // 0 - 1
  
  // Legend
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  
  // Tooltip
  showTooltip?: boolean;
  
  // Grid
  showGrid?: boolean;
}

export const LINE_CHART_DEFAULTS: LineChartConfig = {
  yAxisLabel: '',
  showXAxis: true,
  showYAxis: true,
  lineColor: '#1890ff',
  lineWidth: 2,
  smooth: true,
  showPoints: false,
  pointSize: 4,
  fillArea: false,
  fillOpacity: 0.3,
  showLegend: true,
  legendPosition: 'top',
  showTooltip: true,
  showGrid: true,
};
```

### Gauge

```typescript
// models/configs/gauge-config.ts

export interface GaugeThreshold {
  value: number;
  color: string;
  label?: string;
}

export interface GaugeConfig {
  // Range
  min: number;
  max: number;
  
  // Display
  unit?: string;
  showValue?: boolean;
  decimals?: number;
  
  // Appearance
  startAngle?: number;      // degrees
  endAngle?: number;        // degrees
  
  // Thresholds (color zones)
  thresholds?: GaugeThreshold[];
  
  // Pointer
  showPointer?: boolean;
  pointerColor?: string;
}

export const GAUGE_DEFAULTS: GaugeConfig = {
  min: 0,
  max: 100,
  unit: '',
  showValue: true,
  decimals: 1,
  startAngle: -135,
  endAngle: 135,
  thresholds: [
    { value: 30, color: '#52c41a', label: 'Normal' },
    { value: 70, color: '#faad14', label: 'Warning' },
    { value: 100, color: '#f5222d', label: 'Critical' },
  ],
  showPointer: true,
  pointerColor: '#333',
};
```

### Single Value

```typescript
// models/configs/single-value-config.ts

export interface SingleValueConfig {
  // Display
  unit?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  
  // Styling
  fontSize?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  fontWeight?: 'normal' | 'bold';
  valueColor?: string;
  backgroundColor?: string;
  
  // Icon
  icon?: string;
  iconColor?: string;
  iconPosition?: 'left' | 'top';
  
  // Trend
  showTrend?: boolean;
  trendPeriod?: string;     // Compare with previous period
  
  // Thresholds (change color based on value)
  thresholds?: Array<{
    value: number;
    color: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte';
  }>;
}

export const SINGLE_VALUE_DEFAULTS: SingleValueConfig = {
  unit: '',
  decimals: 2,
  fontSize: 'xl',
  fontWeight: 'bold',
  valueColor: '#333',
  iconPosition: 'left',
  showTrend: false,
};
```

### Table

```typescript
// models/configs/table-config.ts

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  format?: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'status';
  decimals?: number;       // For number format
  dateFormat?: string;     // For date format
  
  // Conditional styling
  thresholds?: Array<{
    value: any;
    color: string;
    backgroundColor?: string;
  }>;
}

export interface TableConfig {
  columns: TableColumn[];
  
  // Pagination
  pageSize?: number;
  showPagination?: boolean;
  
  // Sorting
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  
  // Styling
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  
  // Actions
  showRowNumber?: boolean;
  onRowClick?: 'none' | 'detail' | 'link';
  linkField?: string;
}

export const TABLE_DEFAULTS: TableConfig = {
  columns: [],
  pageSize: 10,
  showPagination: true,
  defaultSortOrder: 'desc',
  striped: true,
  bordered: false,
  compact: false,
  showRowNumber: false,
  onRowClick: 'none',
};
```

### Status Indicator

```typescript
// models/configs/status-indicator-config.ts

export interface StatusMapping {
  value: string | number | boolean;
  label: string;
  color: string;
  icon?: string;
  pulse?: boolean;    // Pulse animation for active states
}

export interface StatusIndicatorConfig {
  // Mappings
  mappings: StatusMapping[];
  defaultLabel?: string;
  defaultColor?: string;
  
  // Display
  showLabel?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square' | 'badge';
  
  // Layout (for multiple indicators)
  layout?: 'horizontal' | 'vertical';
}

export const STATUS_INDICATOR_DEFAULTS: StatusIndicatorConfig = {
  mappings: [
    { value: 'online', label: 'Online', color: '#52c41a', icon: 'check-circle' },
    { value: 'offline', label: 'Offline', color: '#f5222d', icon: 'close-circle' },
    { value: 'degraded', label: 'Degraded', color: '#faad14', icon: 'warning' },
  ],
  defaultLabel: 'Unknown',
  defaultColor: '#999',
  showLabel: true,
  showIcon: true,
  size: 'md',
  shape: 'circle',
};
```

### Bar Chart

```typescript
// models/configs/bar-chart-config.ts

export interface BarChartConfig {
  // Orientation
  orientation?: 'vertical' | 'horizontal';
  
  // Axis
  xAxisLabel?: string;
  yAxisLabel?: string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  
  // Bars
  barWidth?: number;       // pixels or percentage
  barGap?: number;         // Gap between bars in group
  categoryGap?: number;    // Gap between categories
  
  // Colors
  colors?: string[];       // Array of colors for series
  
  // Stacked
  stacked?: boolean;
  
  // Legend
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  
  // Values
  showValues?: boolean;    // Show value on bars
  valuePosition?: 'inside' | 'outside' | 'top';
  
  // Grid
  showGrid?: boolean;
}

export const BAR_CHART_DEFAULTS: BarChartConfig = {
  orientation: 'vertical',
  showXAxis: true,
  showYAxis: true,
  barWidth: 'auto',
  stacked: false,
  showLegend: true,
  legendPosition: 'top',
  showValues: false,
  showGrid: true,
  colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
};
```

### Pie Chart

```typescript
// models/configs/pie-chart-config.ts

export interface PieChartConfig {
  // Donut
  donut?: boolean;
  donutRadius?: number;    // Inner radius percentage (0-100)
  
  // Labels
  showLabels?: boolean;
  labelPosition?: 'inside' | 'outside';
  showPercentage?: boolean;
  showValue?: boolean;
  
  // Legend
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  
  // Colors
  colors?: string[];
  
  // Animation
  roseType?: boolean;      // Nightingale chart
  
  // Selection
  selectedMode?: 'single' | 'multiple' | false;
}

export const PIE_CHART_DEFAULTS: PieChartConfig = {
  donut: false,
  donutRadius: 50,
  showLabels: true,
  labelPosition: 'outside',
  showPercentage: true,
  showValue: false,
  showLegend: true,
  legendPosition: 'right',
  roseType: false,
  colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96'],
};
```

---

## 7.5 Widget Registry Service

```typescript
// services/widget-registry.service.ts

import { Injectable, Type } from '@angular/core';
import { BaseWidgetComponent } from '../widgets/base/base-widget.component';

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: 'chart' | 'indicator' | 'data' | 'misc';
  
  // Components
  component: Type<BaseWidgetComponent>;
  configComponent: Type<any>;
  
  // Defaults
  defaultConfig: any;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  
  // Data requirements
  supportedDataTypes: string[];
  requiresTimeSeries: boolean;
}

@Injectable({ providedIn: 'root' })
export class WidgetRegistryService {
  private registry = new Map<string, WidgetDefinition>();

  constructor() {
    this.registerDefaultWidgets();
  }

  private registerDefaultWidgets(): void {
    // Line Chart
    this.register({
      type: 'line-chart',
      name: 'Line Chart',
      description: 'Display time series data as a line chart',
      icon: 'line-chart',
      category: 'chart',
      component: null!, // Will be set by module
      configComponent: null!,
      defaultConfig: LINE_CHART_DEFAULTS,
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 3, h: 2 },
      maxSize: { w: 12, h: 10 },
      supportedDataTypes: ['timeseries'],
      requiresTimeSeries: true,
    });

    // Gauge
    this.register({
      type: 'gauge',
      name: 'Gauge',
      description: 'Display current value with threshold colors',
      icon: 'dashboard',
      category: 'indicator',
      component: null!,
      configComponent: null!,
      defaultConfig: GAUGE_DEFAULTS,
      defaultSize: { w: 3, h: 3 },
      minSize: { w: 2, h: 2 },
      maxSize: { w: 6, h: 6 },
      supportedDataTypes: ['single'],
      requiresTimeSeries: false,
    });

    // Single Value
    this.register({
      type: 'single-value',
      name: 'Single Value',
      description: 'Display a single metric value',
      icon: 'number',
      category: 'indicator',
      component: null!,
      configComponent: null!,
      defaultConfig: SINGLE_VALUE_DEFAULTS,
      defaultSize: { w: 2, h: 2 },
      minSize: { w: 1, h: 1 },
      maxSize: { w: 4, h: 4 },
      supportedDataTypes: ['single'],
      requiresTimeSeries: false,
    });

    // Table
    this.register({
      type: 'table',
      name: 'Table',
      description: 'Display data in tabular format',
      icon: 'table',
      category: 'data',
      component: null!,
      configComponent: null!,
      defaultConfig: TABLE_DEFAULTS,
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 3, h: 2 },
      maxSize: { w: 12, h: 10 },
      supportedDataTypes: ['table', 'timeseries'],
      requiresTimeSeries: false,
    });

    // Status Indicator
    this.register({
      type: 'status-indicator',
      name: 'Status Indicator',
      description: 'Display status with color and icon',
      icon: 'bulb',
      category: 'indicator',
      component: null!,
      configComponent: null!,
      defaultConfig: STATUS_INDICATOR_DEFAULTS,
      defaultSize: { w: 2, h: 2 },
      minSize: { w: 1, h: 1 },
      maxSize: { w: 4, h: 4 },
      supportedDataTypes: ['single', 'status'],
      requiresTimeSeries: false,
    });

    // Bar Chart
    this.register({
      type: 'bar-chart',
      name: 'Bar Chart',
      description: 'Display comparison data as bars',
      icon: 'bar-chart',
      category: 'chart',
      component: null!,
      configComponent: null!,
      defaultConfig: BAR_CHART_DEFAULTS,
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 3, h: 2 },
      maxSize: { w: 12, h: 10 },
      supportedDataTypes: ['comparison', 'timeseries'],
      requiresTimeSeries: false,
    });

    // Pie Chart
    this.register({
      type: 'pie-chart',
      name: 'Pie Chart',
      description: 'Display distribution data as pie/donut',
      icon: 'pie-chart',
      category: 'chart',
      component: null!,
      configComponent: null!,
      defaultConfig: PIE_CHART_DEFAULTS,
      defaultSize: { w: 4, h: 4 },
      minSize: { w: 2, h: 2 },
      maxSize: { w: 8, h: 8 },
      supportedDataTypes: ['comparison'],
      requiresTimeSeries: false,
    });
  }

  register(definition: WidgetDefinition): void {
    this.registry.set(definition.type, definition);
  }

  getDefinition(type: string): WidgetDefinition | undefined {
    return this.registry.get(type);
  }

  getAllDefinitions(): WidgetDefinition[] {
    return Array.from(this.registry.values());
  }

  getByCategory(category: string): WidgetDefinition[] {
    return this.getAllDefinitions().filter((d) => d.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(this.getAllDefinitions().map((d) => d.category));
    return Array.from(categories);
  }
}
```

---

## 7.6 Base Widget Component

```typescript
// widgets/base/base-widget.component.ts

import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

import { Widget, DataSourceConfig, TimeRangeConfig } from '../../models';
import { WidgetDataService } from '../../services/widget-data.service';

@Component({ template: '' })
export abstract class BaseWidgetComponent implements OnInit, OnDestroy {
  @Input() widget!: Widget;
  @Input() editMode: boolean = false;
  @Input() timeRange!: TimeRangeConfig;
  
  @Output() dataLoaded = new EventEmitter<any>();
  @Output() error = new EventEmitter<Error>();

  protected destroy$ = new Subject<void>();
  
  data: any = null;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  constructor(
    protected widgetDataService: WidgetDataService,
    protected cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initDataFetch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected initDataFetch(): void {
    // Don't fetch in edit mode or if no data source
    if (this.editMode || !this.hasValidDataSource()) {
      return;
    }

    const refreshInterval = this.widget.refreshIntervalSec * 1000;

    // Initial fetch + periodic refresh
    interval(refreshInterval)
      .pipe(
        startWith(0),
        takeUntil(this.destroy$),
        switchMap(() => this.fetchData()),
      )
      .subscribe();
  }

  protected hasValidDataSource(): boolean {
    const ds = this.widget.dataSource;
    if (!ds || !ds.type) return false;

    if (ds.type === 'sensor') {
      return !!(ds.nodeId && ds.sensorId && ds.channelKey);
    }

    if (ds.type === 'static') {
      return ds.staticValue !== undefined;
    }

    return true;
  }

  protected async fetchData(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    try {
      const effectiveTimeRange = this.widget.dataSource.timeRange?.type === 'dashboard'
        ? this.timeRange
        : this.widget.dataSource.timeRange || this.timeRange;

      this.data = await this.widgetDataService
        .fetchWidgetData(this.widget.idWidget, effectiveTimeRange)
        .toPromise();

      this.dataLoaded.emit(this.data);
      this.processData(this.data);
    } catch (err: any) {
      this.hasError = true;
      this.errorMessage = err.message || 'Failed to load data';
      this.error.emit(err);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // To be implemented by each widget
  protected abstract processData(data: any): void;

  // Manual refresh
  refresh(): void {
    this.fetchData();
  }
}
```

---

## 7.7 Widget Component Example: Line Chart

```typescript
// widgets/line-chart/line-chart-widget.component.ts

import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { EChartsOption } from 'echarts';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { WidgetDataService } from '../../services/widget-data.service';
import { LineChartConfig } from '../../models';

@Component({
  selector: 'app-line-chart-widget',
  templateUrl: './line-chart-widget.component.html',
  styleUrls: ['./line-chart-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartWidgetComponent extends BaseWidgetComponent {
  chartOptions: EChartsOption = {};

  constructor(
    widgetDataService: WidgetDataService,
    cdr: ChangeDetectorRef,
  ) {
    super(widgetDataService, cdr);
  }

  protected processData(data: any): void {
    if (!data || !data.data) return;

    const config = this.widget.config as LineChartConfig;
    const chartData = data.data;

    this.chartOptions = {
      tooltip: {
        trigger: 'axis',
        show: config.showTooltip !== false,
      },
      legend: {
        show: config.showLegend !== false,
        top: config.legendPosition === 'top' ? 0 : undefined,
        bottom: config.legendPosition === 'bottom' ? 0 : undefined,
        left: config.legendPosition === 'left' ? 0 : undefined,
        right: config.legendPosition === 'right' ? 0 : undefined,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        show: config.showXAxis !== false,
        name: config.xAxisLabel,
      },
      yAxis: {
        type: 'value',
        show: config.showYAxis !== false,
        name: config.yAxisLabel,
        min: config.yAxisMin,
        max: config.yAxisMax,
      },
      series: [
        {
          name: this.widget.title || 'Value',
          type: 'line',
          smooth: config.smooth !== false,
          symbol: config.showPoints ? 'circle' : 'none',
          symbolSize: config.pointSize || 4,
          lineStyle: {
            color: config.lineColor || '#1890ff',
            width: config.lineWidth || 2,
          },
          areaStyle: config.fillArea
            ? {
                opacity: config.fillOpacity || 0.3,
                color: config.lineColor || '#1890ff',
              }
            : undefined,
          data: chartData.map((item: any) => [
            new Date(item.timestamp).getTime(),
            item.value,
          ]),
        },
      ],
    };

    this.cdr.markForCheck();
  }
}
```

```html
<!-- widgets/line-chart/line-chart-widget.component.html -->

<div class="widget-content line-chart-widget">
  <!-- Loading State -->
  <div class="loading-state" *ngIf="isLoading">
    <div class="spinner"></div>
  </div>

  <!-- Error State -->
  <div class="error-state" *ngIf="hasError && !isLoading">
    <i class="icon icon-warning"></i>
    <span>{{ errorMessage }}</span>
    <button class="btn-retry" (click)="refresh()">Retry</button>
  </div>

  <!-- No Data State -->
  <div class="empty-state" *ngIf="!isLoading && !hasError && !data">
    <i class="icon icon-chart"></i>
    <span>No data available</span>
  </div>

  <!-- Chart -->
  <div 
    echarts 
    [options]="chartOptions" 
    [merge]="chartOptions"
    class="chart"
    *ngIf="!isLoading && !hasError && data">
  </div>
</div>
```

```scss
// widgets/line-chart/line-chart-widget.component.scss

.line-chart-widget {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .chart {
    width: 100%;
    height: 100%;
  }
  
  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #999;
    
    .icon {
      font-size: 24px;
    }
  }
  
  .error-state {
    color: #f5222d;
    
    .btn-retry {
      margin-top: 8px;
      padding: 4px 12px;
      border: 1px solid currentColor;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      
      &:hover {
        background: rgba(245, 34, 45, 0.1);
      }
    }
  }
}
```

---

## 7.8 Widget Config Component Example

```typescript
// widgets/line-chart/line-chart-config.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { LineChartConfig, LINE_CHART_DEFAULTS } from '../../models';

@Component({
  selector: 'app-line-chart-config',
  templateUrl: './line-chart-config.component.html',
  styleUrls: ['./line-chart-config.component.scss'],
})
export class LineChartConfigComponent implements OnInit {
  @Input() config: LineChartConfig = {};
  @Output() configChange = new EventEmitter<LineChartConfig>();

  form!: FormGroup;

  legendPositions = [
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const merged = { ...LINE_CHART_DEFAULTS, ...this.config };

    this.form = this.fb.group({
      yAxisLabel: [merged.yAxisLabel],
      yAxisMin: [merged.yAxisMin],
      yAxisMax: [merged.yAxisMax],
      lineColor: [merged.lineColor],
      lineWidth: [merged.lineWidth],
      smooth: [merged.smooth],
      showPoints: [merged.showPoints],
      fillArea: [merged.fillArea],
      fillOpacity: [merged.fillOpacity],
      showLegend: [merged.showLegend],
      legendPosition: [merged.legendPosition],
      showGrid: [merged.showGrid],
    });

    // Emit changes
    this.form.valueChanges.subscribe((value) => {
      this.configChange.emit(value);
    });
  }
}
```

```html
<!-- widgets/line-chart/line-chart-config.component.html -->

<form [formGroup]="form" class="widget-config-form">
  
  <!-- Y-Axis Section -->
  <div class="config-section">
    <h4>Y-Axis</h4>
    
    <div class="form-group">
      <label>Label</label>
      <input type="text" formControlName="yAxisLabel" placeholder="e.g., Temperature (°C)">
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Min Value</label>
        <input type="number" formControlName="yAxisMin" placeholder="Auto">
      </div>
      <div class="form-group">
        <label>Max Value</label>
        <input type="number" formControlName="yAxisMax" placeholder="Auto">
      </div>
    </div>
  </div>

  <!-- Line Style Section -->
  <div class="config-section">
    <h4>Line Style</h4>
    
    <div class="form-group">
      <label>Color</label>
      <div class="color-picker-wrapper">
        <input 
          type="text" 
          formControlName="lineColor"
          [cpPosition]="'bottom'"
          [colorPicker]="form.get('lineColor')?.value"
          (colorPickerChange)="form.get('lineColor')?.setValue($event)">
        <div class="color-preview" [style.background]="form.get('lineColor')?.value"></div>
      </div>
    </div>
    
    <div class="form-group">
      <label>Width</label>
      <input type="number" formControlName="lineWidth" min="1" max="10">
    </div>
    
    <div class="form-group checkbox">
      <label>
        <input type="checkbox" formControlName="smooth">
        Smooth curve
      </label>
    </div>
    
    <div class="form-group checkbox">
      <label>
        <input type="checkbox" formControlName="showPoints">
        Show data points
      </label>
    </div>
  </div>

  <!-- Fill Section -->
  <div class="config-section">
    <h4>Fill</h4>
    
    <div class="form-group checkbox">
      <label>
        <input type="checkbox" formControlName="fillArea">
        Fill area under line
      </label>
    </div>
    
    <div class="form-group" *ngIf="form.get('fillArea')?.value">
      <label>Fill Opacity</label>
      <input 
        type="range" 
        formControlName="fillOpacity" 
        min="0" 
        max="1" 
        step="0.1">
      <span>{{ form.get('fillOpacity')?.value }}</span>
    </div>
  </div>

  <!-- Legend Section -->
  <div class="config-section">
    <h4>Legend</h4>
    
    <div class="form-group checkbox">
      <label>
        <input type="checkbox" formControlName="showLegend">
        Show legend
      </label>
    </div>
    
    <div class="form-group" *ngIf="form.get('showLegend')?.value">
      <label>Position</label>
      <select formControlName="legendPosition">
        <option *ngFor="let pos of legendPositions" [value]="pos.value">
          {{ pos.label }}
        </option>
      </select>
    </div>
  </div>

</form>
```

---

## 7.9 Widget Summary Table

| Widget | Default Size | Min Size | Data Type | Real-time | Phase |
|--------|-------------|----------|-----------|-----------|-------|
| Line Chart | 6x4 | 3x2 | timeseries | ✅ | 2 |
| Bar Chart | 6x4 | 3x2 | comparison | ✅ | 2 |
| Pie Chart | 4x4 | 2x2 | comparison | ✅ | 3 |
| Gauge | 3x3 | 2x2 | single | ✅ | 2 |
| Single Value | 2x2 | 1x1 | single | ✅ | 2 |
| Table | 6x4 | 3x2 | table | ✅ | 2 |
| Status Indicator | 2x2 | 1x1 | single/status | ✅ | 2 |
| Map | 6x6 | 4x4 | geo | ⚠️ | 5 |

---

## Navigation

⬅️ [Previous: Frontend Architecture](./06-FRONTEND-ARCHITECTURE.md) | [Back to Index](./00-INDEX.md) | [Next: API Specification](./08-API-SPECIFICATION.md) ➡️
