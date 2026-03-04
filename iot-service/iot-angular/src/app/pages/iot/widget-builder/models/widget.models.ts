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
  dataSource?: 'postgresql' | 'clickhouse';  // Data source selection
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
  
  // === TEMPLATE MODE SUPPORT ===
  /**
   * How this widget was created
   * - 'template': Created using Template Wizard (no-code)
   * - 'expert': Created using SQL Editor
   * - undefined: Legacy widgets
   */
  creationMode?: 'template' | 'expert';
  
  /**
   * Template identifier (e.g., 'gauge-speedometer', 'line-chart-area')
   */
  templateId?: string;
  
  /**
   * Original template configuration for re-editing
   */
  templateConfig?: TemplateConfiguration;

  /**
   * Widget-level variables for SQL query substitution
   * e.g., { projectId: "uuid", nodeCode: "HELIO-xxx" }
   */
  variables?: Record<string, string>;

  /**
   * Multi-query definitions for multi-data-source support.
   * When present, replaces the single sqlQuery + dataSource.
   * Each query runs independently and results are merged with a _source column.
   */
  queries?: WidgetQueryDef[];
}

/**
 * Template configuration stored for re-editing template widgets
 */
export interface TemplateConfiguration {
  // Data source selections
  nodeId?: string;
  nodeName?: string;
  sensorId?: string;
  sensorName?: string;
  channelId?: string;
  channelName?: string;
  channelIds?: string[];  // For multi-channel charts
  
  // Template-specific settings
  settings: Record<string, any>;
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

/**
 * Named query definition for multi-data-source support.
 * Stored in config.queries[] — each query has its own SQL, data source, and alias.
 * Results are merged with a `_source` column matching the query alias.
 */
export interface WidgetQueryDef {
  id: string;                              // UUID for tracking
  name: string;                            // Display name (e.g., "Telemetry", "Forecast")
  alias: string;                           // Short alias for _source column (e.g., "telemetry", "forecast")
  sql: string;                             // SQL query text
  dataSource: 'postgresql' | 'clickhouse'; // Data source for this query
  enabled: boolean;                        // Toggle on/off without deleting
  color?: string;                          // Optional color hint for series from this query
}

export interface QueryVariable {
  name: string;
  type: 'time' | 'string' | 'number';
  defaultValue?: any;
}

// Widget types - use kebab-case consistently (matches backend)
export type WidgetType = 
  | 'line-chart'        // Time Series (unified: single + multi-line)
  | 'multi-line-chart'  // @deprecated - alias for line-chart, kept for backward compat
  | 'bar-chart'         // Categorical bar chart
  | 'pie-chart'         // Distribution pie/donut
  | 'gauge'             // Single value with ranges
  | 'stat-card'         // KPI card with icon
  | 'table'             // Tabular data
  | 'heatmap';          // 2D heatmap visualization

export const WIDGET_TYPES: { type: WidgetType; label: string; icon: string; description: string }[] = [
  { type: 'line-chart', label: 'Time Series', icon: 'show_chart', description: 'Time based line, area and bar charts (single & multi-line)' },
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
