/**
 * Widget Template System Models
 * 
 * Defines templates for no-code widget creation
 */

import { WidgetType, WidgetConfig } from './widget.models';

// ============================================
// TEMPLATE DEFINITIONS
// ============================================

/**
 * Widget Template Definition
 */
export interface WidgetTemplate {
  id: string;                    // e.g., 'gauge-speedometer'
  categoryId: string;            // e.g., 'gauge'
  widgetType: WidgetType;        // Maps to existing WidgetType
  name: string;                  // Display name
  description: string;           // Short description
  icon: string;                  // FontAwesome icon class
  previewSvg?: string;           // SVG preview (inline)
  
  // Required filter level for this template
  requiredFilters: TemplateFilterLevel[];
  
  // Default widget configuration
  defaultConfig: Partial<WidgetConfig>;
  
  // SQL template with placeholders
  sqlTemplate: {
    postgresql: string;
    clickhouse: string;
  };
  
  // Configurable options for this template
  options: TemplateOption[];
}

/**
 * Filter levels for cascade selection
 */
export type TemplateFilterLevel = 'node' | 'sensor' | 'channel';

/**
 * Template option (user-configurable setting)
 */
export interface TemplateOption {
  key: string;
  label: string;
  type: 'number' | 'string' | 'select' | 'color' | 'boolean';
  defaultValue: any;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: { label: string; value: any }[];  // For select type
  autoFrom?: string;  // Auto-populate from data, e.g., 'channel.unit'
  helpText?: string;
}

// ============================================
// TEMPLATE CATEGORIES
// ============================================

/**
 * Template Category (grouping of templates)
 */
export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;           // Theme color
  templates: WidgetTemplate[];
}

// ============================================
// GAUGE TEMPLATES
// ============================================

const GAUGE_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'gauge-speedometer',
    categoryId: 'gauge',
    widgetType: 'gauge',
    name: 'Speedometer',
    description: 'Classic gauge with needle indicator',
    icon: 'fa-tachometer-alt',
    previewSvg: `<svg viewBox="0 0 100 60"><path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#ddd" stroke-width="8"/><path d="M10 50 A40 40 0 0 1 50 10" fill="none" stroke="#10b981" stroke-width="8"/><line x1="50" y1="50" x2="50" y2="20" stroke="#333" stroke-width="2"/><circle cx="50" cy="50" r="5" fill="#333"/></svg>`,
    requiredFilters: ['node', 'sensor', 'channel'],
    defaultConfig: {
      refreshInterval: 30,
    },
    sqlTemplate: {
      postgresql: `SELECT 
  sl.value_engineered as value,
  sl.ts as timestamp
FROM sensor_logs sl
WHERE sl.id_sensor_channel = '\${channelId}'
ORDER BY sl.ts DESC
LIMIT 1`,
      clickhouse: `SELECT 
  value_engineered as value,
  ts as timestamp
FROM iot.sensor_channel_latest
WHERE id_sensor_channel = '\${channelId}'
LIMIT 1`
    },
    options: [
      { key: 'minValue', label: 'Min Value', type: 'number', defaultValue: 0, autoFrom: 'channel.minValue' },
      { key: 'maxValue', label: 'Max Value', type: 'number', defaultValue: 100, autoFrom: 'channel.maxValue' },
      { key: 'unit', label: 'Unit', type: 'string', defaultValue: '', autoFrom: 'channel.unit', placeholder: 'e.g., °C, %, hPa' },
      { key: 'warningThreshold', label: 'Warning Level', type: 'number', defaultValue: null, helpText: 'Value above this shows yellow' },
      { key: 'criticalThreshold', label: 'Critical Level', type: 'number', defaultValue: null, helpText: 'Value above this shows red' },
      { key: 'decimals', label: 'Decimal Places', type: 'number', defaultValue: 2, min: 0, max: 4, autoFrom: 'channel.precision' },
    ]
  },
  {
    id: 'gauge-semicircle',
    categoryId: 'gauge',
    widgetType: 'gauge',
    name: 'Semicircle',
    description: 'Half-circle gauge with gradient',
    icon: 'fa-circle-notch',
    previewSvg: `<svg viewBox="0 0 100 60"><path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke="url(#grad)" stroke-width="10" stroke-linecap="round"/><defs><linearGradient id="grad"><stop offset="0%" stop-color="#10b981"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#ef4444"/></linearGradient></defs><text x="50" y="45" text-anchor="middle" font-size="14" font-weight="bold">75</text></svg>`,
    requiredFilters: ['node', 'sensor', 'channel'],
    defaultConfig: {
      refreshInterval: 30,
    },
    sqlTemplate: {
      postgresql: `SELECT sl.value_engineered as value, sl.ts as timestamp FROM sensor_logs sl WHERE sl.id_sensor_channel = '\${channelId}' ORDER BY sl.ts DESC LIMIT 1`,
      clickhouse: `SELECT value_engineered as value, ts as timestamp FROM iot.sensor_channel_latest WHERE id_sensor_channel = '\${channelId}' LIMIT 1`
    },
    options: [
      { key: 'minValue', label: 'Min Value', type: 'number', defaultValue: 0, autoFrom: 'channel.minValue' },
      { key: 'maxValue', label: 'Max Value', type: 'number', defaultValue: 100, autoFrom: 'channel.maxValue' },
      { key: 'unit', label: 'Unit', type: 'string', defaultValue: '', autoFrom: 'channel.unit' },
      { key: 'warningThreshold', label: 'Warning Level', type: 'number', defaultValue: null },
      { key: 'criticalThreshold', label: 'Critical Level', type: 'number', defaultValue: null },
    ]
  },
  {
    id: 'gauge-progress',
    categoryId: 'gauge',
    widgetType: 'gauge',
    name: 'Progress Bar',
    description: 'Horizontal progress bar with percentage',
    icon: 'fa-battery-half',
    previewSvg: `<svg viewBox="0 0 100 30"><rect x="5" y="10" width="90" height="10" rx="5" fill="#e5e7eb"/><rect x="5" y="10" width="65" height="10" rx="5" fill="#10b981"/><text x="50" y="8" text-anchor="middle" font-size="8">65%</text></svg>`,
    requiredFilters: ['node', 'sensor', 'channel'],
    defaultConfig: {
      refreshInterval: 30,
    },
    sqlTemplate: {
      postgresql: `SELECT sl.value_engineered as value, sl.ts as timestamp FROM sensor_logs sl WHERE sl.id_sensor_channel = '\${channelId}' ORDER BY sl.ts DESC LIMIT 1`,
      clickhouse: `SELECT value_engineered as value, ts as timestamp FROM iot.sensor_channel_latest WHERE id_sensor_channel = '\${channelId}' LIMIT 1`
    },
    options: [
      { key: 'minValue', label: 'Min Value', type: 'number', defaultValue: 0 },
      { key: 'maxValue', label: 'Max Value', type: 'number', defaultValue: 100 },
      { key: 'unit', label: 'Unit', type: 'string', defaultValue: '%' },
      { key: 'showPercentage', label: 'Show Percentage', type: 'boolean', defaultValue: true },
    ]
  },
  {
    id: 'gauge-number',
    categoryId: 'gauge',
    widgetType: 'stat-card',
    name: 'Big Number',
    description: 'Large value display with unit',
    icon: 'fa-digital-tachograph',
    previewSvg: `<svg viewBox="0 0 100 50"><text x="50" y="35" text-anchor="middle" font-size="24" font-weight="bold">28.5</text><text x="50" y="48" text-anchor="middle" font-size="10" fill="#666">°C</text></svg>`,
    requiredFilters: ['node', 'sensor', 'channel'],
    defaultConfig: {
      refreshInterval: 30,
    },
    sqlTemplate: {
      postgresql: `SELECT sl.value_engineered as value, sl.ts as timestamp FROM sensor_logs sl WHERE sl.id_sensor_channel = '\${channelId}' ORDER BY sl.ts DESC LIMIT 1`,
      clickhouse: `SELECT value_engineered as value, ts as timestamp FROM iot.sensor_channel_latest WHERE id_sensor_channel = '\${channelId}' LIMIT 1`
    },
    options: [
      { key: 'unit', label: 'Unit', type: 'string', defaultValue: '', autoFrom: 'channel.unit' },
      { key: 'decimals', label: 'Decimal Places', type: 'number', defaultValue: 1, min: 0, max: 4 },
      { key: 'prefix', label: 'Prefix', type: 'string', defaultValue: '', placeholder: 'e.g., $' },
      { key: 'suffix', label: 'Suffix', type: 'string', defaultValue: '', placeholder: 'e.g., /hour' },
    ]
  },
];

// ============================================
// TIME SERIES TEMPLATES
// ============================================

const TIMESERIES_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'timeseries-line',
    categoryId: 'timeseries',
    widgetType: 'line-chart',
    name: 'Line Chart',
    description: 'Standard line chart for time series data',
    icon: 'fa-chart-line',
    previewSvg: `<svg viewBox="0 0 100 50"><polyline points="5,40 25,30 45,35 65,15 85,25 95,10" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>`,
    requiredFilters: ['node'],
    defaultConfig: {
      refreshInterval: 60,
    },
    sqlTemplate: {
      postgresql: `SELECT 
  sl.ts as time,
  sc.metric_code as metric,
  sl.value_engineered as value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.id_sensor_channel IN (\${channelIds})
  AND sl.ts BETWEEN '\${fromTime}' AND '\${toTime}'
ORDER BY sl.ts ASC`,
      clickhouse: `SELECT 
  ts as time,
  metric,
  value_engineered as value
FROM iot.sensor_telemetry
WHERE id_sensor_channel IN (\${channelIds})
  AND ts BETWEEN '\${fromTime}' AND '\${toTime}'
ORDER BY ts ASC`
    },
    options: [
      { key: 'timeRange', label: 'Time Range', type: 'select', defaultValue: '24h', options: [
        { label: 'Last 1 Hour', value: '1h' },
        { label: 'Last 6 Hours', value: '6h' },
        { label: 'Last 24 Hours', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' },
      ]},
      { key: 'aggregation', label: 'Aggregation', type: 'select', defaultValue: 'none', options: [
        { label: 'None (Raw Data)', value: 'none' },
        { label: 'Per Minute', value: '1min' },
        { label: 'Per 5 Minutes', value: '5min' },
        { label: 'Per Hour', value: '1hour' },
        { label: 'Per Day', value: '1day' },
      ]},
      { key: 'showLegend', label: 'Show Legend', type: 'boolean', defaultValue: true },
      { key: 'smoothCurve', label: 'Smooth Curve', type: 'boolean', defaultValue: true },
    ]
  },
  {
    id: 'timeseries-area',
    categoryId: 'timeseries',
    widgetType: 'line-chart',
    name: 'Area Chart',
    description: 'Line chart with filled area',
    icon: 'fa-chart-area',
    previewSvg: `<svg viewBox="0 0 100 50"><polygon points="5,45 25,30 45,35 65,15 85,25 95,10 95,45" fill="#3b82f6" fill-opacity="0.3"/><polyline points="5,45 25,30 45,35 65,15 85,25 95,10" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>`,
    requiredFilters: ['node'],
    defaultConfig: {
      refreshInterval: 60,
    },
    sqlTemplate: {
      postgresql: `SELECT sl.ts as time, sc.metric_code as metric, sl.value_engineered as value FROM sensor_logs sl JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel WHERE sl.id_sensor_channel IN (\${channelIds}) AND sl.ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY sl.ts ASC`,
      clickhouse: `SELECT ts as time, metric, value_engineered as value FROM iot.sensor_telemetry WHERE id_sensor_channel IN (\${channelIds}) AND ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY ts ASC`
    },
    options: [
      { key: 'timeRange', label: 'Time Range', type: 'select', defaultValue: '24h', options: [
        { label: 'Last 1 Hour', value: '1h' },
        { label: 'Last 6 Hours', value: '6h' },
        { label: 'Last 24 Hours', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
      ]},
      { key: 'fillOpacity', label: 'Fill Opacity', type: 'number', defaultValue: 0.3, min: 0, max: 1 },
      { key: 'showLegend', label: 'Show Legend', type: 'boolean', defaultValue: true },
    ]
  },
  {
    id: 'timeseries-bar',
    categoryId: 'timeseries',
    widgetType: 'bar-chart',
    name: 'Bar Chart',
    description: 'Vertical bar chart for comparison',
    icon: 'fa-chart-bar',
    previewSvg: `<svg viewBox="0 0 100 50"><rect x="10" y="20" width="12" height="25" fill="#3b82f6"/><rect x="30" y="10" width="12" height="35" fill="#3b82f6"/><rect x="50" y="25" width="12" height="20" fill="#3b82f6"/><rect x="70" y="5" width="12" height="40" fill="#3b82f6"/></svg>`,
    requiredFilters: ['node'],
    defaultConfig: {
      refreshInterval: 60,
    },
    sqlTemplate: {
      postgresql: `SELECT sl.ts as time, sc.metric_code as metric, sl.value_engineered as value FROM sensor_logs sl JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel WHERE sl.id_sensor_channel IN (\${channelIds}) AND sl.ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY sl.ts ASC`,
      clickhouse: `SELECT ts as time, metric, value_engineered as value FROM iot.sensor_telemetry WHERE id_sensor_channel IN (\${channelIds}) AND ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY ts ASC`
    },
    options: [
      { key: 'timeRange', label: 'Time Range', type: 'select', defaultValue: '24h', options: [
        { label: 'Last 1 Hour', value: '1h' },
        { label: 'Last 24 Hours', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
      ]},
      { key: 'aggregation', label: 'Aggregation', type: 'select', defaultValue: '1hour', options: [
        { label: 'Per Hour', value: '1hour' },
        { label: 'Per Day', value: '1day' },
      ]},
    ]
  },
  {
    id: 'timeseries-multiline',
    categoryId: 'timeseries',
    widgetType: 'multi-line-chart',
    name: 'Multi-Line Chart',
    description: 'Compare multiple sensors/channels',
    icon: 'fa-project-diagram',
    previewSvg: `<svg viewBox="0 0 100 50"><polyline points="5,35 25,25 45,30 65,20 95,15" fill="none" stroke="#3b82f6" stroke-width="2"/><polyline points="5,40 25,35 45,25 65,30 95,20" fill="none" stroke="#10b981" stroke-width="2"/><polyline points="5,30 25,40 45,35 65,40 95,35" fill="none" stroke="#f59e0b" stroke-width="2"/></svg>`,
    requiredFilters: ['node'],
    defaultConfig: {
      refreshInterval: 60,
    },
    sqlTemplate: {
      postgresql: `SELECT sl.ts as time, sc.metric_code as metric, sl.value_engineered as value FROM sensor_logs sl JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel WHERE sl.id_sensor_channel IN (\${channelIds}) AND sl.ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY sl.ts, metric ASC`,
      clickhouse: `SELECT ts as time, metric, value_engineered as value FROM iot.sensor_telemetry WHERE id_sensor_channel IN (\${channelIds}) AND ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY ts, metric ASC`
    },
    options: [
      { key: 'timeRange', label: 'Time Range', type: 'select', defaultValue: '24h', options: [
        { label: 'Last 6 Hours', value: '6h' },
        { label: 'Last 24 Hours', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
      ]},
      { key: 'showLegend', label: 'Show Legend', type: 'boolean', defaultValue: true },
    ]
  },
];

// ============================================
// TABLE TEMPLATES
// ============================================

const TABLE_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'table-sensor-summary',
    categoryId: 'table',
    widgetType: 'table',
    name: 'Sensor Summary',
    description: 'Latest values for all channels',
    icon: 'fa-table',
    previewSvg: `<svg viewBox="0 0 100 50"><rect x="5" y="5" width="90" height="10" fill="#e5e7eb"/><rect x="5" y="18" width="90" height="8" fill="none" stroke="#e5e7eb"/><rect x="5" y="28" width="90" height="8" fill="none" stroke="#e5e7eb"/><rect x="5" y="38" width="90" height="8" fill="none" stroke="#e5e7eb"/></svg>`,
    requiredFilters: ['node', 'sensor'],
    defaultConfig: {
      refreshInterval: 30,
    },
    sqlTemplate: {
      postgresql: `SELECT 
  sc.metric_code as channel,
  sc.metric_code as metric,
  sc.unit,
  sl.value_engineered as latest_value,
  sl.ts as last_update
FROM sensor_channels sc
LEFT JOIN LATERAL (
  SELECT value_engineered, ts 
  FROM sensor_logs 
  WHERE id_sensor_channel = sc.id_sensor_channel 
  ORDER BY ts DESC 
  LIMIT 1
) sl ON true
WHERE sc.id_sensor = '\${sensorId}'
ORDER BY sc.metric_code`,
      clickhouse: `SELECT 
  metric_code as channel,
  metric_code as metric,
  unit,
  value_engineered as latest_value,
  ts as last_update
FROM iot.sensor_channel_latest
WHERE id_sensor = '\${sensorId}'
ORDER BY metric_code`
    },
    options: [
      { key: 'showTimestamp', label: 'Show Timestamp', type: 'boolean', defaultValue: true },
      { key: 'pageSize', label: 'Rows Per Page', type: 'number', defaultValue: 10 },
    ]
  },
  {
    id: 'table-history',
    categoryId: 'table',
    widgetType: 'table',
    name: 'Data History',
    description: 'Historical data table with pagination',
    icon: 'fa-history',
    previewSvg: `<svg viewBox="0 0 100 50"><rect x="5" y="5" width="90" height="10" fill="#3b82f6"/><rect x="5" y="18" width="90" height="8" fill="none" stroke="#e5e7eb"/><rect x="5" y="28" width="90" height="8" fill="none" stroke="#e5e7eb"/><text x="50" y="48" text-anchor="middle" font-size="6">1 2 3 ... 10</text></svg>`,
    requiredFilters: ['node', 'sensor', 'channel'],
    defaultConfig: {
      refreshInterval: 60,
    },
    sqlTemplate: {
      postgresql: `SELECT ts as timestamp, value_engineered as value FROM sensor_logs WHERE id_sensor_channel = '\${channelId}' AND ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY ts DESC LIMIT 100`,
      clickhouse: `SELECT ts as timestamp, value_engineered as value FROM iot.sensor_telemetry WHERE id_sensor_channel = '\${channelId}' AND ts BETWEEN '\${fromTime}' AND '\${toTime}' ORDER BY ts DESC LIMIT 100`
    },
    options: [
      { key: 'timeRange', label: 'Time Range', type: 'select', defaultValue: '24h', options: [
        { label: 'Last 24 Hours', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
      ]},
      { key: 'pageSize', label: 'Rows Per Page', type: 'number', defaultValue: 20 },
    ]
  },
];

// ============================================
// SINGLE VALUE TEMPLATES  
// ============================================

const SINGLE_VALUE_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'value-with-trend',
    categoryId: 'singlevalue',
    widgetType: 'stat-card',
    name: 'Value with Trend',
    description: 'Current value with up/down trend indicator',
    icon: 'fa-arrow-trend-up',
    previewSvg: `<svg viewBox="0 0 100 50"><text x="50" y="28" text-anchor="middle" font-size="18" font-weight="bold">28.5</text><text x="50" y="42" text-anchor="middle" font-size="8" fill="#10b981">▲ +2.3%</text></svg>`,
    requiredFilters: ['node', 'sensor', 'channel'],
    defaultConfig: {
      refreshInterval: 30,
    },
    sqlTemplate: {
      postgresql: `WITH current_val AS (
  SELECT value_engineered as value, ts as timestamp FROM sensor_logs 
  WHERE id_sensor_channel = '\${channelId}'
  ORDER BY ts DESC LIMIT 1
),
previous_val AS (
  SELECT value_engineered as value FROM sensor_logs 
  WHERE id_sensor_channel = '\${channelId}'
  ORDER BY ts DESC LIMIT 1 OFFSET 1
)
SELECT c.value, c.timestamp, p.value as prev_value,
  CASE WHEN c.value > p.value THEN 'up' WHEN c.value < p.value THEN 'down' ELSE 'stable' END as trend
FROM current_val c, previous_val p`,
      clickhouse: `SELECT value_engineered as value, ts as timestamp FROM iot.sensor_channel_latest WHERE id_sensor_channel = '\${channelId}' LIMIT 1`
    },
    options: [
      { key: 'unit', label: 'Unit', type: 'string', defaultValue: '', autoFrom: 'channel.unit' },
      { key: 'decimals', label: 'Decimals', type: 'number', defaultValue: 1 },
      { key: 'showTrend', label: 'Show Trend', type: 'boolean', defaultValue: true },
    ]
  },
  {
    id: 'value-with-sparkline',
    categoryId: 'singlevalue',
    widgetType: 'stat-card',
    name: 'Value with Sparkline',
    description: 'Current value with mini chart',
    icon: 'fa-chart-line',
    previewSvg: `<svg viewBox="0 0 100 50"><text x="30" y="30" font-size="16" font-weight="bold">28.5°C</text><polyline points="55,35 65,25 75,30 85,20 95,25" fill="none" stroke="#10b981" stroke-width="2"/></svg>`,
    requiredFilters: ['node', 'sensor', 'channel'],
    defaultConfig: {
      refreshInterval: 30,
    },
    sqlTemplate: {
      postgresql: `SELECT value_engineered as value, ts as timestamp FROM sensor_logs WHERE id_sensor_channel = '\${channelId}' ORDER BY ts DESC LIMIT 20`,
      clickhouse: `SELECT value_engineered as value, ts as timestamp FROM iot.sensor_telemetry WHERE id_sensor_channel = '\${channelId}' ORDER BY ts DESC LIMIT 20`
    },
    options: [
      { key: 'unit', label: 'Unit', type: 'string', defaultValue: '', autoFrom: 'channel.unit' },
      { key: 'sparklinePoints', label: 'Sparkline Points', type: 'number', defaultValue: 20 },
    ]
  },
];

// ============================================
// ALL CATEGORIES EXPORT
// ============================================

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'gauge',
    name: 'Gauge',
    icon: 'fa-tachometer-alt',
    description: 'Monitor single sensor value with visual indicator',
    color: '#10b981',
    templates: GAUGE_TEMPLATES,
  },
  {
    id: 'timeseries',
    name: 'Time Series',
    icon: 'fa-chart-line',
    description: 'Visualize sensor data over time',
    color: '#3b82f6',
    templates: TIMESERIES_TEMPLATES,
  },
  {
    id: 'singlevalue',
    name: 'Single Value',
    icon: 'fa-digital-tachograph',
    description: 'Display latest value with trend',
    color: '#8b5cf6',
    templates: SINGLE_VALUE_TEMPLATES,
  },
  {
    id: 'table',
    name: 'Table',
    icon: 'fa-table',
    description: 'Tabular data display',
    color: '#f59e0b',
    templates: TABLE_TEMPLATES,
  },
];

/**
 * Get all templates flattened
 */
export function getAllTemplates(): WidgetTemplate[] {
  return TEMPLATE_CATEGORIES.flatMap(cat => cat.templates);
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): WidgetTemplate | undefined {
  return getAllTemplates().find(t => t.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(categoryId: string): WidgetTemplate[] {
  const category = TEMPLATE_CATEGORIES.find(c => c.id === categoryId);
  return category?.templates || [];
}
