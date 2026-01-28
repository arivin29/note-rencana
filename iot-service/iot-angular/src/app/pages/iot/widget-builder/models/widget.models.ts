// Widget Builder Models & Interfaces

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  isDefault: boolean;
  widgetCount?: number;
  createdAt: Date;
  updatedAt: Date;
  widgets?: Widget[];
}

export interface Widget {
  id: string;
  dashboardId: string;
  name: string;
  type: WidgetType;
  sqlQuery?: string;  // SQL query for data
  config: WidgetConfig;
  position: WidgetPosition;
  query?: WidgetQuery;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPosition {
  x: number;
  y: number;
  cols: number;
  rows: number;
}

export interface WidgetConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  sqlQuery?: string;  // SQL query (fallback location)
  refreshInterval?: number; // in seconds, 0 = no auto refresh
  showLegend?: boolean;
  colorScheme?: string;
  chartOptions?: any; // ECharts specific options (legacy)
  fieldMapping?: FieldMapping; // Legacy field mapping
  
  // New structured configuration
  mapping?: WidgetFieldMapping;
  series?: WidgetSeriesConfig[];
  xAxis?: WidgetAxisConfig;
  yAxis?: WidgetYAxisConfig;
  thresholds?: WidgetThreshold[];
  display?: WidgetDisplayConfig;
}

// New structured field mapping
export interface WidgetFieldMapping {
  xField: string;
  yField: string;
  yFields: string[];      // Multi-line: multiple Y fields
  seriesField: string;    // Group by series column
  labelField: string;     // For pie charts
  valueField: string;     // For gauge/card
}

// Per-series configuration
export interface WidgetSeriesConfig {
  field: string;
  label: string;
  color: string;
  unit: string;
  decimals: number;
  visible: boolean;
}

// X-Axis configuration
export interface WidgetAxisConfig {
  label: string;
  timeFormat: string;
}

// Y-Axis configuration
export interface WidgetYAxisConfig {
  label: string;
  unit: string;
  decimals: number;
  min: number | null;
  max: number | null;
  scale: 'linear' | 'log';
}

// Threshold configuration
export interface WidgetThreshold {
  mode: 'manual' | 'field';
  value: number;
  field: string;
  label: string;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

// Display configuration
export interface WidgetDisplayConfig {
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  lineStyle: 'smooth' | 'straight' | 'step';
  lineWidth: number;
  fillOpacity: number;
  showPoints: 'never' | 'always' | 'auto';
  tooltipMode: 'single' | 'all' | 'hidden';
}

export interface FieldMapping {
  xField?: string;       // Column for X axis (timestamp, category)
  yField?: string;       // Column for Y axis (value)
  labelField?: string;   // Column for labels
  valueField?: string;   // Column for single value (gauge, card)
  seriesField?: string;  // Column to split into series
}

export interface WidgetQuery {
  sql: string;
  variables?: QueryVariable[];
}

export interface QueryVariable {
  name: string;
  type: 'time' | 'string' | 'number';
  defaultValue?: any;
}

// Widget types - use kebab-case consistently (matches backend)
export type WidgetType = 
  | 'line-chart'        // Single line time series
  | 'multi-line-chart'  // Multiple lines time series
  | 'bar-chart'         // Categorical bar chart
  | 'pie-chart'         // Distribution pie/donut
  | 'gauge'             // Single value with ranges
  | 'stat-card'         // KPI card with icon
  | 'table'             // Tabular data
  | 'heatmap';          // 2D heatmap visualization

export const WIDGET_TYPES: { type: WidgetType; label: string; icon: string; description: string }[] = [
  { type: 'line-chart', label: 'Line Chart', icon: 'show_chart', description: 'Time series data visualization' },
  { type: 'multi-line-chart', label: 'Multi-Line Chart', icon: 'multiline_chart', description: 'Compare multiple series over time' },
  { type: 'bar-chart', label: 'Bar Chart', icon: 'bar_chart', description: 'Compare categorical data' },
  { type: 'gauge', label: 'Gauge', icon: 'speed', description: 'Single value with min/max range' },
  { type: 'pie-chart', label: 'Pie Chart', icon: 'pie_chart', description: 'Show proportions of a whole' },
  { type: 'stat-card', label: 'Stat Card', icon: 'pin', description: 'Display single metric value' },
  { type: 'table', label: 'Table', icon: 'table_chart', description: 'Tabular data display' },
  { type: 'heatmap', label: 'Heatmap', icon: 'grid_on', description: '2D heatmap visualization' },
];

// Time Range Types
export interface TimeRange {
  from: Date;
  to: Date;
  label?: string;
}

export const TIME_RANGE_PRESETS: { label: string; value: string; duration: number }[] = [
  { label: 'Last 5 minutes', value: '5m', duration: 5 * 60 * 1000 },
  { label: 'Last 15 minutes', value: '15m', duration: 15 * 60 * 1000 },
  { label: 'Last 30 minutes', value: '30m', duration: 30 * 60 * 1000 },
  { label: 'Last 1 hour', value: '1h', duration: 60 * 60 * 1000 },
  { label: 'Last 3 hours', value: '3h', duration: 3 * 60 * 60 * 1000 },
  { label: 'Last 6 hours', value: '6h', duration: 6 * 60 * 60 * 1000 },
  { label: 'Last 12 hours', value: '12h', duration: 12 * 60 * 60 * 1000 },
  { label: 'Last 24 hours', value: '24h', duration: 24 * 60 * 60 * 1000 },
  { label: 'Last 2 days', value: '2d', duration: 2 * 24 * 60 * 60 * 1000 },
  { label: 'Last 7 days', value: '7d', duration: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Last 30 days', value: '30d', duration: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Last 90 days', value: '90d', duration: 90 * 24 * 60 * 60 * 1000 },
];

export const REFRESH_INTERVALS: { label: string; value: number }[] = [
  { label: 'Off', value: 0 },
  { label: '5 seconds', value: 5 },
  { label: '10 seconds', value: 10 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
];

// Query Result Types
export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
}
