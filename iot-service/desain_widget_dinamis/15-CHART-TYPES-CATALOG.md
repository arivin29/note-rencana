# 📊 15 - Chart Types Catalog

> **Document:** Complete Chart Types for IoT Dashboard  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026  
> **Library:** Apache ECharts (via ngx-echarts)

---

## 15.1 Chart Library Decision

### ✅ Final Choice: Apache ECharts

| Criteria | Decision |
|----------|----------|
| **Library** | Apache ECharts 5.x |
| **Angular Wrapper** | ngx-echarts ^20.0.1 |
| **License** | Apache 2.0 (100% FREE, no branding) |
| **Bundle Strategy** | Tree-shaking (~60KB) |

### Why ECharts over amCharts?

| Aspect | Apache ECharts | amCharts 5 |
|--------|----------------|------------|
| **License** | ✅ Apache 2.0 (FREE) | ⚠️ FREE + Logo, or $650/seat for SaaS |
| **Branding** | ✅ None required | ❌ Logo unless paid |
| **Performance** | ✅ Excellent (millions) | ✅ Excellent |
| **IoT Features** | ✅ dataZoom, streaming | ✅ Good |
| **Bundle Size** | ✅ ~60KB (tree-shake) | ⚠️ ~350KB |
| **Grafana-like** | ✅ Very similar | ✅ Similar |

---

## 15.2 Complete Chart Types Catalog

### 🔴 Phase 1: Essential (MVP)

#### 1. Line Chart
```
Type: line
Use Case: Sensor value over time
Data: Time-series from sensor_logs
```

**ECharts Config:**
```typescript
{
  type: 'line',
  smooth: true,
  sampling: 'lttb',
  showSymbol: false,
  areaStyle: { opacity: 0.1 }
}
```

**Widget Config:**
```typescript
interface LineChartConfig {
  lineColor: string;
  lineWidth: number;
  smooth: boolean;
  showArea: boolean;
  areaOpacity: number;
  showDataPoints: boolean;
  enableZoom: boolean;
}
```

---

#### 2. Multi-Line Chart
```
Type: line (multiple series)
Use Case: Compare multiple sensors/channels
Data: Multiple time-series
```

**ECharts Config:**
```typescript
{
  series: [
    { name: 'Sensor A', type: 'line', data: [...] },
    { name: 'Sensor B', type: 'line', data: [...] },
    { name: 'Sensor C', type: 'line', data: [...] }
  ],
  legend: { show: true }
}
```

**Widget Config:**
```typescript
interface MultiLineConfig {
  channels: Array<{
    idSensorChannel: string;
    alias: string;
    color: string;
  }>;
  showLegend: boolean;
  enableZoom: boolean;
}
```

---

#### 3. Dual-Axis Chart
```
Type: line (multiple y-axis)
Use Case: Temperature + Humidity (different units)
Data: Multiple channels with different units
```

**ECharts Config:**
```typescript
{
  yAxis: [
    { type: 'value', name: 'Temperature (°C)', position: 'left' },
    { type: 'value', name: 'Humidity (%)', position: 'right' }
  ],
  series: [
    { name: 'Temperature', type: 'line', yAxisIndex: 0, data: [...] },
    { name: 'Humidity', type: 'line', yAxisIndex: 1, data: [...] }
  ]
}
```

**Widget Config:**
```typescript
interface DualAxisConfig {
  leftAxis: {
    channelId: string;
    label: string;
    unit: string;
    color: string;
  };
  rightAxis: {
    channelId: string;
    label: string;
    unit: string;
    color: string;
  };
}
```

---

#### 4. Gauge Chart (Radial)
```
Type: gauge
Use Case: Current sensor value with thresholds
Data: Single latest value from sensor_logs
```

**ECharts Config:**
```typescript
{
  series: [{
    type: 'gauge',
    startAngle: 200,
    endAngle: -20,
    min: 0,
    max: 100,
    axisLine: {
      lineStyle: {
        width: 20,
        color: [
          [0.3, '#73bf69'],  // Normal (green)
          [0.7, '#ff9830'],  // Warning (orange)
          [1, '#f2495c']     // Danger (red)
        ]
      }
    },
    pointer: { show: true },
    detail: {
      formatter: '{value}°C',
      fontSize: 24
    },
    data: [{ value: 42.5 }]
  }]
}
```

**Widget Config:**
```typescript
interface GaugeConfig {
  min: number;
  max: number;
  unit: string;
  thresholds: {
    warning: number;   // Yellow zone starts
    danger: number;    // Red zone starts
  };
  colors: {
    normal: string;
    warning: string;
    danger: string;
  };
  showPointer: boolean;
}
```

---

#### 5. Value Card
```
Type: Custom (not ECharts)
Use Case: Big number display with trend indicator
Data: Latest value + previous value for comparison
```

**Component Template:**
```html
<div class="value-card">
  <div class="title">{{ title }}</div>
  <div class="value">{{ value | number:'1.1-2' }} {{ unit }}</div>
  <div class="trend" [class.up]="trend > 0" [class.down]="trend < 0">
    <i class="icon"></i> {{ trend | abs | number:'1.1-1' }}%
  </div>
  <div class="sparkline">
    <mini-chart [data]="sparklineData"></mini-chart>
  </div>
</div>
```

**Widget Config:**
```typescript
interface ValueCardConfig {
  showTrend: boolean;
  showSparkline: boolean;
  sparklinePoints: number;  // Last N points
  decimals: number;
  fontSize: 'small' | 'medium' | 'large';
  thresholds?: {
    warning: number;
    danger: number;
  };
}
```

---

#### 6. Pie Chart
```
Type: pie
Use Case: Node status distribution, sensor type breakdown
Data: Aggregated counts
```

**ECharts Config:**
```typescript
{
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],  // Donut style
    avoidLabelOverlap: true,
    itemStyle: {
      borderRadius: 4,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      formatter: '{b}: {c} ({d}%)'
    },
    data: [
      { value: 45, name: 'Online', itemStyle: { color: '#73bf69' } },
      { value: 10, name: 'Offline', itemStyle: { color: '#f2495c' } },
      { value: 5, name: 'Warning', itemStyle: { color: '#ff9830' } }
    ]
  }]
}
```

**Widget Config:**
```typescript
interface PieChartConfig {
  donut: boolean;
  innerRadius: number;  // 0 for pie, >0 for donut
  showLabels: boolean;
  showLegend: boolean;
  showPercentage: boolean;
  colors: string[];
}
```

---

#### 7. Heatmap / Status Grid
```
Type: heatmap
Use Case: Node status matrix, hourly activity pattern
Data: 2D matrix (nodes x time, or nodes x metrics)
```

**ECharts Config:**
```typescript
{
  xAxis: {
    type: 'category',
    data: ['00:00', '01:00', '02:00', ...], // Hours
  },
  yAxis: {
    type: 'category',
    data: ['NODE-001', 'NODE-002', 'NODE-003', ...]
  },
  visualMap: {
    min: 0,
    max: 100,
    calculable: true,
    inRange: {
      color: ['#f2495c', '#ff9830', '#73bf69']  // Red → Orange → Green
    }
  },
  series: [{
    type: 'heatmap',
    data: [
      [0, 0, 95],  // [x, y, value]
      [0, 1, 0],   // Offline
      [1, 0, 88],
      // ...
    ],
    label: { show: true }
  }]
}
```

**Widget Config:**
```typescript
interface HeatmapConfig {
  xAxisType: 'time' | 'category';
  yAxisType: 'nodes' | 'sensors' | 'custom';
  colorRange: {
    min: string;
    mid: string;
    max: string;
  };
  showValues: boolean;
  cellSize: 'auto' | number;
}
```

---

#### 8. Data Table
```
Type: Custom (Angular component)
Use Case: Raw data display, alert list, event log
Data: Array of records
```

**Component:**
```typescript
interface TableConfig {
  columns: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'status';
    width?: number;
    sortable?: boolean;
  }>;
  pageSize: number;
  showPagination: boolean;
  enableSort: boolean;
  enableFilter: boolean;
  rowClickAction?: 'expand' | 'navigate' | 'none';
}
```

---

### 🟡 Phase 2: Enhanced

#### 9. Area Chart
```
Type: line with areaStyle
Use Case: Volume/cumulative data visualization
```

**ECharts Config:**
```typescript
{
  series: [{
    type: 'line',
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(87, 148, 242, 0.5)' },
          { offset: 1, color: 'rgba(87, 148, 242, 0.05)' }
        ]
      }
    },
    data: [...]
  }]
}
```

---

#### 10. Bar Chart
```
Type: bar
Use Case: Compare values across categories
```

**ECharts Config:**
```typescript
{
  xAxis: { type: 'category', data: ['Node A', 'Node B', 'Node C'] },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: [120, 200, 150],
    itemStyle: { borderRadius: [4, 4, 0, 0] }
  }]
}
```

---

#### 11. Stacked Bar Chart
```
Type: bar (stacked)
Use Case: Composition breakdown
```

**ECharts Config:**
```typescript
{
  series: [
    { name: 'Online', type: 'bar', stack: 'total', data: [320, 302, 301] },
    { name: 'Offline', type: 'bar', stack: 'total', data: [120, 132, 101] },
    { name: 'Warning', type: 'bar', stack: 'total', data: [60, 72, 71] }
  ]
}
```

---

#### 12. Sparkline (Mini Chart)
```
Type: line (simplified)
Use Case: Inline trend indicator in cards/tables
```

**ECharts Config:**
```typescript
{
  grid: { left: 0, right: 0, top: 0, bottom: 0 },
  xAxis: { show: false, type: 'category' },
  yAxis: { show: false, type: 'value' },
  series: [{
    type: 'line',
    symbol: 'none',
    lineStyle: { width: 1 },
    data: [...]
  }]
}
```

---

#### 13. Step Line Chart
```
Type: line (step)
Use Case: Discrete state changes (ON/OFF)
```

**ECharts Config:**
```typescript
{
  series: [{
    type: 'line',
    step: 'end',  // or 'start', 'middle'
    data: [...]
  }]
}
```

---

#### 14. Alert Timeline
```
Type: Custom or scatter
Use Case: Event/alert visualization over time
```

**ECharts Config:**
```typescript
{
  xAxis: { type: 'time' },
  yAxis: { type: 'category', data: ['Critical', 'Warning', 'Info'] },
  series: [{
    type: 'scatter',
    symbolSize: 15,
    data: [
      { value: ['2026-01-25T10:00:00', 'Critical'], itemStyle: { color: '#f2495c' } },
      { value: ['2026-01-25T11:30:00', 'Warning'], itemStyle: { color: '#ff9830' } },
    ]
  }]
}
```

---

### 🟢 Phase 3: Advanced (Future)

#### 15. Scatter Plot
```
Type: scatter
Use Case: Correlation analysis between two metrics
```

#### 16. Box Plot
```
Type: boxplot
Use Case: Statistical distribution (min, Q1, median, Q3, max)
```

#### 17. Radar Chart
```
Type: radar
Use Case: Multi-dimensional comparison (node health scores)
```

#### 18. Sankey Diagram
```
Type: sankey
Use Case: Data flow visualization
```

#### 19. Map (Geo)
```
Type: map / geo
Use Case: Node locations on map
Requires: echarts + geo data
```

---

## 15.3 Widget Type Registry

### Complete Widget Types Enum

```typescript
export enum WidgetType {
  // Phase 1 - Essential
  LINE_CHART = 'line-chart',
  MULTI_LINE_CHART = 'multi-line-chart',
  DUAL_AXIS_CHART = 'dual-axis-chart',
  GAUGE = 'gauge',
  VALUE_CARD = 'value-card',
  PIE_CHART = 'pie-chart',
  HEATMAP = 'heatmap',
  DATA_TABLE = 'data-table',
  
  // Phase 2 - Enhanced
  AREA_CHART = 'area-chart',
  BAR_CHART = 'bar-chart',
  STACKED_BAR = 'stacked-bar',
  SPARKLINE = 'sparkline',
  STEP_LINE = 'step-line',
  ALERT_TIMELINE = 'alert-timeline',
  
  // Phase 3 - Advanced
  SCATTER_PLOT = 'scatter-plot',
  BOX_PLOT = 'box-plot',
  RADAR_CHART = 'radar-chart',
  SANKEY = 'sankey',
  GEO_MAP = 'geo-map',
}
```

### Widget Metadata

```typescript
export const WIDGET_CATALOG: Record<WidgetType, WidgetMetadata> = {
  [WidgetType.LINE_CHART]: {
    type: WidgetType.LINE_CHART,
    name: 'Line Chart',
    description: 'Time-series data visualization',
    icon: 'line-chart',
    category: 'time-series',
    minWidth: 4,
    minHeight: 3,
    defaultWidth: 6,
    defaultHeight: 4,
    supportsRealtime: true,
    dataSourceTypes: ['single-channel', 'multi-channel'],
  },
  [WidgetType.GAUGE]: {
    type: WidgetType.GAUGE,
    name: 'Gauge',
    description: 'Current value with thresholds',
    icon: 'gauge',
    category: 'indicator',
    minWidth: 2,
    minHeight: 2,
    defaultWidth: 3,
    defaultHeight: 3,
    supportsRealtime: true,
    dataSourceTypes: ['single-channel'],
  },
  // ... more widgets
};
```

---

## 15.4 ECharts Modules to Import

### Tree-Shaking Import List

```typescript
// echarts.config.ts

import * as echarts from 'echarts/core';

// ===== CHARTS =====
import {
  LineChart,          // line, area, step-line
  BarChart,           // bar, stacked-bar
  PieChart,           // pie, donut
  GaugeChart,         // gauge
  HeatmapChart,       // heatmap
  ScatterChart,       // scatter, timeline
  // Phase 3:
  // BoxplotChart,
  // RadarChart,
  // SankeyChart,
  // MapChart,
} from 'echarts/charts';

// ===== COMPONENTS =====
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  DatasetComponent,
} from 'echarts/components';

// ===== RENDERER =====
import { CanvasRenderer } from 'echarts/renderers';

// ===== REGISTER =====
echarts.use([
  LineChart, BarChart, PieChart, GaugeChart, HeatmapChart, ScatterChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent,
  DataZoomComponent, ToolboxComponent, MarkLineComponent, MarkAreaComponent,
  VisualMapComponent, DatasetComponent,
  CanvasRenderer
]);

export { echarts };
```

---

## 15.5 Implementation Priority

| Phase | Widgets | Timeline |
|-------|---------|----------|
| **Phase 1** | Line, Multi-Line, Dual-Axis, Gauge, Value Card, Pie, Heatmap, Table | Week 3-4 |
| **Phase 2** | Area, Bar, Stacked Bar, Sparkline, Step Line, Alert Timeline | Week 5-6 |
| **Phase 3** | Scatter, Box Plot, Radar, Sankey, Geo Map | Future |

---

## Navigation

⬅️ [Previous: ECharts Guide](./14-CHART-LIBRARY-GUIDE.md) | [Back to Index](./00-INDEX.md)
