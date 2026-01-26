// Widget Builder Models & Interfaces

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  widgets?: Widget[];
}

export interface Widget {
  id: string;
  dashboardId: string;
  name: string;
  type: WidgetType;
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

export type WidgetType = 
  | 'line-chart'
  | 'bar-chart'
  | 'gauge'
  | 'pie-chart'
  | 'value-card'
  | 'data-table'
  | 'area-chart'
  | 'heatmap';

export const WIDGET_TYPES: { type: WidgetType; label: string; icon: string; description: string }[] = [
  { type: 'line-chart', label: 'Line Chart', icon: 'show_chart', description: 'Time series data visualization' },
  { type: 'bar-chart', label: 'Bar Chart', icon: 'bar_chart', description: 'Compare categorical data' },
  { type: 'gauge', label: 'Gauge', icon: 'speed', description: 'Single value with min/max range' },
  { type: 'pie-chart', label: 'Pie Chart', icon: 'pie_chart', description: 'Show proportions of a whole' },
  { type: 'value-card', label: 'Value Card', icon: 'pin', description: 'Display single metric value' },
  { type: 'data-table', label: 'Data Table', icon: 'table_chart', description: 'Tabular data display' },
];

// Time Range Types
export interface TimeRange {
  from: Date;
  to: Date;
  label?: string;
}

export const TIME_RANGE_PRESETS: { label: string; value: string; duration: number }[] = [
  { label: 'Last 15 minutes', value: '15m', duration: 15 * 60 * 1000 },
  { label: 'Last 1 hour', value: '1h', duration: 60 * 60 * 1000 },
  { label: 'Last 6 hours', value: '6h', duration: 6 * 60 * 60 * 1000 },
  { label: 'Last 24 hours', value: '24h', duration: 24 * 60 * 60 * 1000 },
  { label: 'Last 7 days', value: '7d', duration: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Last 30 days', value: '30d', duration: 30 * 24 * 60 * 60 * 1000 },
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

// Dummy Data for Mockup
export const DUMMY_DASHBOARDS: Dashboard[] = [
  {
    id: '1',
    name: 'Production Monitoring',
    description: 'Real-time monitoring of production sensors',
    ownerName: 'PT. Manufacturing ABC',
    isDefault: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: '2',
    name: 'Environmental Sensors',
    description: 'Temperature, humidity, and air quality',
    ownerName: 'PT. Manufacturing ABC',
    isDefault: false,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-24'),
  },
  {
    id: '3',
    name: 'Energy Consumption',
    description: 'Power usage and efficiency metrics',
    ownerName: 'PT. Manufacturing ABC',
    isDefault: false,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-23'),
  },
];

export const DUMMY_WIDGETS: Widget[] = [
  {
    id: 'w1',
    dashboardId: '1',
    name: 'Temperature Trend',
    type: 'line-chart',
    position: { x: 0, y: 0, cols: 6, rows: 4 },
    config: {
      title: 'Temperature Trend',
      subtitle: 'Last 24 hours',
      showLegend: true,
    },
    query: {
      sql: `SELECT ts as timestamp, value_engineered as value 
FROM sensor_logs 
WHERE id_sensor_channel = 'xxx' 
  AND ts >= \${__timeFrom} 
ORDER BY ts ASC`,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'w2',
    dashboardId: '1',
    name: 'Current Temperature',
    type: 'gauge',
    position: { x: 6, y: 0, cols: 3, rows: 4 },
    config: {
      title: 'Current Temperature',
      chartOptions: { min: 0, max: 100 },
    },
    query: {
      sql: `SELECT value_engineered as value 
FROM sensor_logs 
WHERE id_sensor_channel = 'xxx' 
ORDER BY ts DESC LIMIT 1`,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'w3',
    dashboardId: '1',
    name: 'Active Sensors',
    type: 'value-card',
    position: { x: 9, y: 0, cols: 3, rows: 2 },
    config: {
      title: 'Active Sensors',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'w4',
    dashboardId: '1',
    name: 'Sensor Distribution',
    type: 'pie-chart',
    position: { x: 9, y: 2, cols: 3, rows: 4 },
    config: {
      title: 'By Category',
      showLegend: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'w5',
    dashboardId: '1',
    name: 'Hourly Average',
    type: 'bar-chart',
    position: { x: 0, y: 4, cols: 6, rows: 4 },
    config: {
      title: 'Hourly Average Temperature',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'w6',
    dashboardId: '1',
    name: 'Recent Readings',
    type: 'data-table',
    position: { x: 6, y: 6, cols: 6, rows: 4 },
    config: {
      title: 'Recent Sensor Readings',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Generate dummy chart data
export function generateDummyTimeSeriesData(points: number = 24): { timestamp: Date; value: number }[] {
  const data: { timestamp: Date; value: number }[] = [];
  const now = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const value = 20 + Math.random() * 15 + Math.sin(i / 3) * 5;
    data.push({ timestamp, value: Math.round(value * 10) / 10 });
  }
  return data;
}

export function generateDummyBarData(): { category: string; value: number }[] {
  const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  return hours.map(h => ({
    category: h,
    value: Math.round(20 + Math.random() * 20),
  }));
}

export function generateDummyPieData(): { name: string; value: number }[] {
  return [
    { name: 'Temperature', value: 35 },
    { name: 'Humidity', value: 25 },
    { name: 'Pressure', value: 20 },
    { name: 'Flow Rate', value: 15 },
    { name: 'Other', value: 5 },
  ];
}

export function generateDummyTableData(): any[] {
  const data: any[] = [];
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    data.push({
      timestamp: new Date(now.getTime() - i * 5 * 60 * 1000).toISOString(),
      sensor: `Sensor-${Math.floor(Math.random() * 5) + 1}`,
      value: (20 + Math.random() * 15).toFixed(2),
      unit: '°C',
      status: Math.random() > 0.2 ? 'Normal' : 'Warning',
    });
  }
  return data;
}
