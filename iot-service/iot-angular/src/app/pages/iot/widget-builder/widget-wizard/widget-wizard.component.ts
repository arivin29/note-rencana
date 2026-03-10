import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  Widget, WidgetType,
  QueryResult, WidgetQueryDef
} from '../models/widget.models';
import { WidgetBuilderService } from '../../../../../sdk/core/services/widget-builder.service';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../sdk/core/services/sensors.service';
import { SensorChannelsService } from '../../../../../sdk/core/services/sensor-channels.service';
import { SensorTypesService } from '../../../../../sdk/core/services/sensor-types.service';
import { ExecuteQueryResponseDto, ValidateQueryResponseDto } from '../../../../../sdk/core/models';

@Component({
  selector: 'app-widget-wizard',
  standalone: false,
  templateUrl: './widget-wizard.component.html',
  styleUrls: ['./widget-wizard.component.css']
})
export class WidgetWizardComponent implements OnInit {
  @ViewChild('timePickerBtn') timePickerBtn!: ElementRef;
  
  dashboardId: string = '';
  widgetId: string | null = null;
  isEditMode = false;
  
  // Time picker dropdown position
  timePickerDropdownStyle: { [key: string]: string } = {};

  // UI State
  showTypeSelector = false;
  typeSearchQuery = '';
  configTab: 'all' | 'overrides' = 'all';
  queryExpanded = true;
  previewTab: 'chart' | 'table' = 'chart';

  // Collapsible sections (Grafana-style)
  expandedSections = {
    chartOptions: true,
    legend: false,
    axis: false,
    series: true,
    thresholds: true,
    pieLegend: true,
    gaugeConfig: true,
    tableOptions: true,
    tableColumns: false,
    statCardConfig: true
  };

  // ============================================
  // WIDGET CONFIGURATION - Clean structure for DB storage
  // ============================================
  
  // Form data - will be serialized to JSON for DB storage
  form = {
    // Basic Info
    name: '',
    title: '',
    description: '',
    
    // Data Source
    sql: '',
    timeRange: '6h' as '15m' | '30m' | '1h' | '3h' | '6h' | '12h' | '24h' | '7d' | '30d',
    
    // Field Mapping
    mapping: {
      xField: '',           // X-axis field (usually timestamp)
      yField: '',           // Single Y field (legacy/fallback)
      yFields: [] as string[],  // Multiple Y fields for multi-line
      seriesField: '',      // Group by field
      labelField: '',       // For pie/bar labels
      valueField: ''        // For single value widgets
    },
    
    // Series Configuration - per Y field customization
    series: [] as {
      field: string;        // Field name from query
      label: string;        // Display label
      color: string;        // Line/bar color
      unit: string;         // Unit suffix (°C, %, hPa)
      decimals: number;     // Decimal places (0, 1, 2)
      visible: boolean;     // Show/hide series
    }[],
    
    // X-Axis Configuration
    xAxis: {
      label: '',            // Axis label (e.g., "Time")
      timeFormat: 'auto' as 'auto' | 'HH:mm' | 'HH:mm:ss' | 'DD/MM' | 'DD/MM HH:mm' | 'YYYY-MM-DD',
    },
    
    // Y-Axis Configuration  
    yAxis: {
      label: '',            // Axis label (e.g., "Temperature")
      unit: '',             // Global unit (if all series same unit)
      decimals: 2,          // Default 2 decimal places
      min: null as number | null,  // Min value (null = auto)
      max: null as number | null,  // Max value (null = auto)
      scale: 'linear' as 'linear' | 'log',
      placement: 'left' as 'auto' | 'left' | 'right' | 'hidden',
      showGrid: 'auto' as 'auto' | 'on' | 'off',
    },
    
    // Thresholds
    thresholds: [] as {
      mode: 'manual' | 'field';
      value: number;
      field: string;
      label: string;
      color: string;
      lineStyle: 'solid' | 'dashed';
    }[],
    
    // Display Options
    display: {
      showLegend: true,
      legendPosition: 'top' as 'top' | 'bottom' | 'left' | 'right',
      legendMode: 'list' as 'list' | 'table',
      lineStyle: 'smooth' as 'smooth' | 'straight' | 'step',
      lineWidth: 2,
      fillOpacity: 20,
      showPoints: 'auto' as 'auto' | 'always' | 'never',
      tooltipMode: 'all' as 'single' | 'all' | 'hidden',
      // Bar chart specific
      barOrientation: 'vertical' as 'vertical' | 'horizontal',
      showDataLabels: false,
      // Table widget specific
      tableOptions: {
        striped: true,
        hover: true,
        bordered: false,
        compact: false,
        sortable: true,
        fontSize: 12,
        headerBackground: '#1a1a2e',
        columns: [] as {
          field: string;
          displayName: string;
          align: 'left' | 'center' | 'right';
          width: string;
          visible: boolean;
          // Value formatting
          type: 'text' | 'number' | 'date' | 'status' | 'badge';
          decimals: number;
          unit: string;
          dateFormat: string;
          // Conditional coloring (thresholds)
          thresholds: {
            value: number;
            color: string;
            bgColor: string;
          }[];
          // Status/Badge mapping
          statusMap: {
            value: string;
            label: string;
            color: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';
          }[];
        }[]
      },
      // Data Smoothing (Line chart outlier detection)
      smoothing: {
        enabled: false,
        threshold: 50,      // % deviation from neighbors to flag as outlier
        minConsecutive: 3,  // Minimum consecutive outliers to treat as real data
        method: 'interpolate' as 'interpolate' | 'average' | 'previous'
      },
      // Stat Card widget specific
      statCardOptions: {
        layout: 'centered' as 'centered' | 'left-aligned' | 'with-icon' | 'compact',
        icon: '',           // Font Awesome icon class (e.g., 'fa-thermometer-half')
        iconColor: '#73bf69',
        prefix: '',         // Text before value (e.g., 'Rp', '$')
        suffix: '',         // Text after value (e.g., 'per jam', '/s')
        showTrend: false,   // Show trend indicator
        trendField: '',     // Field to compare for trend (or 'previous' for auto)
        showSparkline: false, // Show mini sparkline chart
        sparklineField: '', // Field for sparkline data
        thresholdColors: true, // Apply threshold colors to value
        fontSize: 'large' as 'small' | 'medium' | 'large' | 'xlarge',
        valueColor: '#ffffff',
        backgroundColor: ''   // Custom background color
      }
    }
  };

  // Color palette for series
  seriesColors = [
    '#73bf69', '#5794f2', '#ff9830', '#f2495c', 
    '#b877d9', '#ff6eb4', '#4ec5d4', '#fade2a'
  ];

  // Unit presets - loaded dynamically from sensor_types API
  unitPresets: { label: string; value: string }[] = [];

  // Time format options
  timeFormatOptions = [
    { label: 'Auto', value: 'auto', example: 'Smart detect' },
    { label: 'HH:mm', value: 'HH:mm', example: '14:30' },
    { label: 'HH:mm:ss', value: 'HH:mm:ss', example: '14:30:45' },
    { label: 'DD/MM', value: 'DD/MM', example: '26/01' },
    { label: 'DD/MM HH:mm', value: 'DD/MM HH:mm', example: '26/01 14:30' },
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD', example: '2026-01-26' },
  ];

  // Time Range Presets for data filtering
  timeRangePresets = [
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
  ];
  selectedTimeRange = '6h';
  
  // Grafana-style Time Picker
  timePickerOpen = false;
  absoluteTimeFrom = 'now-6h';
  absoluteTimeTo = 'now';
  quickRangeSearch = '';
  
  // Calendar state
  activeCalendar: 'from' | 'to' | null = null;
  fromCalendarDate = new Date();
  toCalendarDate = new Date();
  fromSelectedDate: Date | null = null;
  toSelectedDate: Date | null = null;
  fromTime = '00:00:00';
  toTime = '23:59:59';
  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  // Current time range as epoch
  timeFrom = Date.now() - 6 * 60 * 60 * 1000;
  timeTo = Date.now();

  // Data Source Configuration
  dataSources = {
    postgresql: { available: true, name: 'PostgreSQL', description: 'Relational database for real-time data' },
    clickhouse: { available: false, name: 'ClickHouse', description: 'Time-series analytics database', status: 'disabled' }
  };
  selectedDataSource: 'postgresql' | 'clickhouse' = 'postgresql';

  // ============================================
  // MULTI-QUERY SUPPORT
  // ============================================
  queries: WidgetQueryDef[] = [];
  activeQueryIndex = 0;
  queryResults: Map<string, QueryResult> = new Map(); // per-query results

  // ============================================
  // QUERY FILTERS - Node, Sensor, Channel selection
  // ============================================
  
  // Available data for dropdowns
  nodesList: { id: string; label: string; code: string }[] = [];
  sensorsList: { id: string; label: string; nodeId: string }[] = [];
  channelsList: { id: string; label: string; metricCode: string; sensorId: string; unit: string }[] = [];
  
  // Selected filters
  selectedNodeId: string = '';
  selectedSensorId: string = '';
  selectedChannelId: string = '';
  
  // Filtered lists based on selection
  get filteredSensors() {
    if (!this.selectedNodeId) return this.sensorsList;
    return this.sensorsList.filter(s => s.nodeId === this.selectedNodeId);
  }
  
  get filteredChannels() {
    if (!this.selectedSensorId) {
      // If node is selected but not sensor, show all channels for that node's sensors
      if (this.selectedNodeId) {
        const nodeSensorIds = this.filteredSensors.map(s => s.id);
        return this.channelsList.filter(c => nodeSensorIds.includes(c.sensorId));
      }
      return this.channelsList;
    }
    return this.channelsList.filter(c => c.sensorId === this.selectedSensorId);
  }

  // ============================================
  // GROUP BY OPTIONS
  // ============================================
  
  // Time-based grouping options
  groupByTimeOptions = [
    { value: '', label: 'No Grouping', sql: '' },
    { value: 'minute', label: '⏱️ Per Minute', sqlPg: "DATE_TRUNC('minute', sl.ts)", sqlCh: 'toStartOfMinute(event_time)' },
    { value: '5min', label: '⏱️ Per 5 Minutes', sqlPg: "DATE_TRUNC('hour', sl.ts) + INTERVAL '5 min' * FLOOR(EXTRACT(MINUTE FROM sl.ts) / 5)", sqlCh: 'toStartOfFiveMinutes(event_time)' },
    { value: '10min', label: '⏱️ Per 10 Minutes', sqlPg: "DATE_TRUNC('hour', sl.ts) + INTERVAL '10 min' * FLOOR(EXTRACT(MINUTE FROM sl.ts) / 10)", sqlCh: 'toStartOfTenMinutes(event_time)' },
    { value: '15min', label: '⏱️ Per 15 Minutes', sqlPg: "DATE_TRUNC('hour', sl.ts) + INTERVAL '15 min' * FLOOR(EXTRACT(MINUTE FROM sl.ts) / 15)", sqlCh: 'toStartOfFifteenMinutes(event_time)' },
    { value: 'hour', label: '🕐 Per Hour', sqlPg: "DATE_TRUNC('hour', sl.ts)", sqlCh: 'toStartOfHour(event_time)' },
    { value: 'day', label: '📅 Per Day', sqlPg: "DATE_TRUNC('day', sl.ts)", sqlCh: 'toStartOfDay(event_time)' },
    { value: 'week', label: '📆 Per Week', sqlPg: "DATE_TRUNC('week', sl.ts)", sqlCh: 'toStartOfWeek(event_time)' },
    { value: 'month', label: '📆 Per Month', sqlPg: "DATE_TRUNC('month', sl.ts)", sqlCh: 'toStartOfMonth(event_time)' },
  ];

  // Entity-based grouping options
  groupByEntityOptions = [
    { value: '', label: 'No Entity Grouping' },
    { value: 'node', label: '🖥️ By Node', sqlPg: 'n.label AS node_name, sl.id_node', sqlCh: 'node_code, node_label' },
    { value: 'sensor', label: '📡 By Sensor', sqlPg: 's.label AS sensor_name, sl.id_sensor', sqlCh: 'sensor_id, sensor_label' },
    { value: 'channel', label: '📊 By Channel', sqlPg: 'sc.label AS channel_name, sl.id_sensor_channel', sqlCh: 'channel_id, metric_code' },
    { value: 'metric', label: '📈 By Metric Code', sqlPg: 'sc.metric_code', sqlCh: 'metric_code' },
  ];

  // Aggregation functions
  aggregationOptions = [
    { value: 'avg', label: '📊 Average', sqlPg: 'ROUND(AVG(sl.value_engineered)::numeric, 2)', sqlCh: 'round(avg(eng_value), 2)' },
    { value: 'sum', label: '➕ Sum', sqlPg: 'ROUND(SUM(sl.value_engineered)::numeric, 2)', sqlCh: 'round(sum(eng_value), 2)' },
    { value: 'min', label: '⬇️ Minimum', sqlPg: 'MIN(sl.value_engineered)', sqlCh: 'min(eng_value)' },
    { value: 'max', label: '⬆️ Maximum', sqlPg: 'MAX(sl.value_engineered)', sqlCh: 'max(eng_value)' },
    { value: 'count', label: '🔢 Count', sqlPg: 'COUNT(*)', sqlCh: 'count()' },
    { value: 'last', label: '📌 Last Value', sqlPg: '(ARRAY_AGG(sl.value_engineered ORDER BY sl.ts DESC))[1]', sqlCh: 'argMax(eng_value, event_time)' },
    { value: 'first', label: '📌 First Value', sqlPg: '(ARRAY_AGG(sl.value_engineered ORDER BY sl.ts ASC))[1]', sqlCh: 'argMin(eng_value, event_time)' },
  ];

  // Selected group by values
  selectedGroupByTime: string = '';
  selectedGroupByEntity: string = '';
  selectedAggregation: string = 'avg';

  // Threshold presets
  thresholdColors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' }
  ];
  
  // Widget Types with FA icons - use kebab-case consistently
  widgetTypes: { type: WidgetType; label: string; icon: string; description: string }[] = [
    { type: 'line-chart', label: 'Time Series', icon: 'fa-chart-line', description: 'Time based line, area and bar charts (single & multi-line)' },
    { type: 'bar-chart', label: 'Bar Chart', icon: 'fa-chart-bar', description: 'Categorical charts with group support' },
    { type: 'stat-card', label: 'Stat Card', icon: 'fa-digital-tachograph', description: 'Big stat values & sparklines' },
    { type: 'gauge', label: 'Gauge', icon: 'fa-tachometer-alt', description: 'Standard gauge visualization' },
    { type: 'table', label: 'Table', icon: 'fa-table', description: 'Supports many column styles' },
    { type: 'pie-chart', label: 'Pie Chart', icon: 'fa-chart-pie', description: 'The new core pie chart visualization' },
    { type: 'heatmap', label: 'Heatmap', icon: 'fa-th', description: '2D heatmap visualization' },
  ];
  
  selectedType: WidgetType = 'line-chart';
  
  // Query State
  queryResult: QueryResult | null = null;
  queryError: string | null = null;
  queryLoading = false;
  
  // Available columns from query result
  availableColumns: string[] = [];
  
  // Chart Preview
  previewOptions: any = null;

  // Sample SQL Templates - using correct table: sensor_logs
  // Variables: ${fromTime}/${toTime} are ISO timestamps injected by backend
  // ${ownerId} is auto-injected by backend based on logged-in user
  sqlTemplates = [
    {
      name: '📈 Time Series (Single)',
      description: 'Raw telemetry data over time',
      sql: `SELECT 
  sl.ts AS timestamp,
  sl.value_engineered AS value
FROM sensor_logs sl
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
ORDER BY sl.ts ASC
LIMIT 1000`
    },
    {
      name: '📈 Hourly Average',
      description: 'Aggregated hourly averages',
      sql: `SELECT 
  DATE_TRUNC('hour', sl.ts) AS timestamp,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS value
FROM sensor_logs sl
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
GROUP BY DATE_TRUNC('hour', sl.ts)
ORDER BY timestamp ASC`
    },
    {
      name: '📊 Multi-Series by Metric',
      description: 'Compare multiple metrics on one chart',
      sql: `SELECT 
  DATE_TRUNC('hour', sl.ts) AS timestamp,
  sc.metric_code,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
GROUP BY DATE_TRUNC('hour', sl.ts), sc.metric_code
ORDER BY timestamp`
    },
    {
      name: '📋 Latest Sensor Values',
      description: 'Most recent value per sensor channel',
      sql: `SELECT DISTINCT ON (sc.id_sensor_channel)
  s.label AS sensor_name,
  sc.metric_code,
  sl.value_engineered AS value,
  sc.unit,
  sl.ts AS timestamp
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
ORDER BY sc.id_sensor_channel, sl.ts DESC`
    },
    {
      name: '📈 Current Value (Gauge)',
      description: 'Single current value for gauge widget',
      sql: `SELECT 
  sl.value_engineered AS value,
  sc.unit,
  sc.min_threshold,
  sc.max_threshold
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.ts <= '\${toTime}'::timestamp
ORDER BY sl.ts DESC
LIMIT 1`
    },
    {
      name: '📊 Node Status Count',
      description: 'Count nodes by connectivity status',
      sql: `SELECT 
  COALESCE(connectivity_status, 'unknown') AS status,
  COUNT(*) AS count
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
GROUP BY connectivity_status`
    },
    {
      name: '📊 Average by Sensor',
      description: 'Average values grouped by sensor',
      sql: `SELECT 
  s.label AS sensor_name,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS avg_value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
GROUP BY s.label
ORDER BY avg_value DESC`
    },
    {
      name: '📊 Stats Summary',
      description: 'Overall statistics: count, avg, min, max',
      sql: `SELECT 
  COUNT(*) AS total_readings,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS avg_value,
  ROUND(MAX(sl.value_engineered)::numeric, 2) AS max_value,
  ROUND(MIN(sl.value_engineered)::numeric, 2) AS min_value
FROM sensor_logs sl
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp`
    },
    {
      name: '📈 Channel Time Series',
      description: 'Time series for single channel with metric info',
      sql: `SELECT 
  sl.ts AS timestamp,
  sl.value_engineered AS value,
  sc.metric_code,
  sc.unit
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
ORDER BY sl.ts ASC
LIMIT 1000`
    },
    {
      name: '📊 Node Sensors Overview',
      description: 'All sensors under a node with latest values',
      sql: `SELECT DISTINCT ON (s.id_sensor)
  n.label AS node_name,
  s.label AS sensor_name,
  sc.metric_code,
  sl.value_engineered AS value,
  sc.unit,
  sl.ts AS timestamp
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
ORDER BY s.id_sensor, sl.ts DESC`
    },
    {
      name: '📊 Compare Channels',
      description: 'Compare multiple channels side by side',
      sql: `SELECT 
  DATE_TRUNC('hour', sl.ts) AS timestamp,
  sc.label AS channel_name,
  sc.metric_code,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS avg_value,
  sc.unit
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.ts >= '\${fromTime}'::timestamp
  AND sl.ts <= '\${toTime}'::timestamp
GROUP BY DATE_TRUNC('hour', sl.ts), sc.label, sc.metric_code, sc.unit
ORDER BY timestamp, channel_name`
    }
  ];

  // ClickHouse SQL Templates - for time-series analytics
  // Uses iot.sensor_telemetry and aggregated tables
  // ClickHouse SQL Templates - for time-series analytics
  // Variables: ${fromTime}/${toTime} are ISO timestamps injected by backend
  clickhouseTemplates = [
    {
      name: '📊 Realtime - Current Values',
      description: 'Latest value per sensor channel',
      sql: `SELECT 
    node_code,
    sensor_label,
    metric_code,
    eng_value AS value,
    metric_unit AS unit,
    last_update AS timestamp,
    dateDiff('second', last_update, now()) AS age_seconds
FROM iot.sensor_channel_latest FINAL
ORDER BY node_code, sensor_label`
    },
    {
      name: '📈 Time Series - Raw',
      description: 'Raw telemetry data with 5-min intervals',
      sql: `SELECT 
    toStartOfInterval(event_time, INTERVAL 5 minute) AS time,
    metric_code,
    avg(eng_value) AS value
FROM iot.sensor_telemetry
WHERE event_time >= parseDateTimeBestEffort('\${fromTime}')
    AND event_time <= parseDateTimeBestEffort('\${toTime}')
GROUP BY time, metric_code
ORDER BY time`
    },
    {
      name: '📈 Time Series - 10min Agg',
      description: '10-minute aggregated data',
      sql: `SELECT 
    time_bucket AS time,
    metric_code,
    avg_value AS value,
    min_value,
    max_value,
    sample_count
FROM iot.sensor_telemetry_10min
WHERE time_bucket >= parseDateTimeBestEffort('\${fromTime}')
    AND time_bucket <= parseDateTimeBestEffort('\${toTime}')
ORDER BY time`
    },
    {
      name: '📈 Time Series - Hourly',
      description: 'Hourly aggregated data',
      sql: `SELECT 
    time_bucket AS time,
    metric_code,
    avg_value AS value,
    min_value,
    max_value,
    sample_count
FROM iot.sensor_telemetry_1hour
WHERE time_bucket >= parseDateTimeBestEffort('\${fromTime}')
    AND time_bucket <= parseDateTimeBestEffort('\${toTime}')
ORDER BY time`
    },
    {
      name: '📈 Time Series - Daily',
      description: 'Daily aggregated data for trends',
      sql: `SELECT 
    event_date AS time,
    metric_code,
    avg_value AS value,
    min_value,
    max_value,
    sample_count
FROM iot.sensor_telemetry_daily
WHERE event_date >= toDate(parseDateTimeBestEffort('\${fromTime}'))
    AND event_date <= toDate(parseDateTimeBestEffort('\${toTime}'))
ORDER BY time`
    },
    {
      name: '📊 Multi-Series by Sensor',
      description: 'Compare multiple sensors',
      sql: `SELECT 
    toStartOfInterval(event_time, INTERVAL 10 minute) AS time,
    sensor_label,
    metric_code,
    avg(eng_value) AS value
FROM iot.sensor_telemetry
WHERE event_time >= parseDateTimeBestEffort('\${fromTime}')
    AND event_time <= parseDateTimeBestEffort('\${toTime}')
GROUP BY time, sensor_label, metric_code
ORDER BY time`
    },
    {
      name: '🥧 Distribution by Metric',
      description: 'Pie chart - readings distribution',
      sql: `SELECT 
    metric_code,
    count() AS count,
    round(avg(eng_value), 2) AS avg_value
FROM iot.sensor_telemetry
WHERE event_time >= parseDateTimeBestEffort('\${fromTime}')
    AND event_time <= parseDateTimeBestEffort('\${toTime}')
GROUP BY metric_code
ORDER BY count DESC`
    },
    {
      name: '📊 Node Status Overview',
      description: 'Latest status per node',
      sql: `SELECT 
    node_code,
    node_label,
    last_event_time AS timestamp,
    dateDiff('minute', last_event_time, now()) AS minutes_ago,
    CASE 
        WHEN dateDiff('minute', last_event_time, now()) < 5 THEN 'online'
        WHEN dateDiff('minute', last_event_time, now()) < 30 THEN 'warning'
        ELSE 'offline'
    END AS status
FROM iot.node_latest FINAL
ORDER BY last_event_time DESC`
    },
    {
      name: '📈 Gauge - Current Value',
      description: 'Single current value for gauge widget',
      sql: `SELECT 
    eng_value AS value,
    metric_unit AS unit,
    metric_code,
    last_update AS timestamp
FROM iot.sensor_channel_latest FINAL
WHERE channel_id = '\${channelId}'
LIMIT 1`
    },
    {
      name: '📊 Stats Summary',
      description: 'Statistics overview',
      sql: `SELECT 
    count() AS total_readings,
    round(avg(eng_value), 2) AS avg_value,
    round(max(eng_value), 2) AS max_value,
    round(min(eng_value), 2) AS min_value,
    uniq(sensor_id) AS sensor_count,
    uniq(node_id) AS node_count
FROM iot.sensor_telemetry
WHERE event_time >= parseDateTimeBestEffort('\${fromTime}')
    AND event_time <= parseDateTimeBestEffort('\${toTime}')`
    },
    {
      name: '🔥 Heatmap - Hourly Activity',
      description: 'Activity heatmap by hour',
      sql: `SELECT 
    toDayOfWeek(event_time) AS day_of_week,
    toHour(event_time) AS hour,
    count() AS activity_count,
    round(avg(eng_value), 2) AS avg_value
FROM iot.sensor_telemetry
WHERE event_time >= parseDateTimeBestEffort('\${fromTime}')
    AND event_time <= parseDateTimeBestEffort('\${toTime}')
GROUP BY day_of_week, hour
ORDER BY day_of_week, hour`
    }
  ];

  // Get templates based on selected data source
  get activeTemplates() {
    return this.selectedDataSource === 'clickhouse' 
      ? this.clickhouseTemplates 
      : this.sqlTemplates;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private widgetBuilderService: WidgetBuilderService,
    private nodesService: NodesService,
    private sensorsService: SensorsService,
    private sensorChannelsService: SensorChannelsService,
    private sensorTypesService: SensorTypesService
  ) {}

  ngOnInit(): void {
    this.dashboardId = this.route.snapshot.paramMap.get('id') || '';
    this.widgetId = this.route.snapshot.paramMap.get('widgetId');
    this.isEditMode = !!this.widgetId;
    
    // Get widget type from query param if provided
    const typeParam = this.route.snapshot.queryParamMap.get('type');
    if (typeParam && this.widgetTypes.some(w => w.type === typeParam)) {
      this.selectedType = typeParam as WidgetType;
    }
    
    // Load available data sources
    this.loadDataSources();
    
    // Load filter data (nodes, sensors, channels)
    this.loadFilterData();
    
    // Load unit presets from sensor_types API
    this.loadUnitPresets();
    
    if (this.isEditMode) {
      this.loadWidget();
    } else {
      // New widget: initialize default query
      this.initDefaultQuery();
    }
  }

  /**
   * Load available data sources from backend
   */
  loadDataSources(): void {
    this.widgetBuilderService.widgetBuilderControllerGetDataSources().subscribe({
      next: (response: any) => {
        this.dataSources = response;
        // If ClickHouse is not available, ensure PostgreSQL is selected
        if (!this.dataSources.clickhouse?.available && this.selectedDataSource === 'clickhouse') {
          this.selectedDataSource = 'postgresql';
        }
      },
      error: (err) => {
        console.error('Failed to load data sources:', err);
      }
    });
  }

  /**
   * Load unit presets from sensor_types API (distinct defaultUnit values)
   */
  loadUnitPresets(): void {
    this.sensorTypesService.sensorTypesControllerFindAll().subscribe({
      next: (sensorTypes) => {
        // Extract unique non-empty units
        const unitSet = new Set<string>();
        for (const st of sensorTypes) {
          if (st.defaultUnit && st.defaultUnit.trim()) {
            unitSet.add(st.defaultUnit.trim());
          }
        }
        // Sort alphabetically and build presets
        const sorted = Array.from(unitSet).sort((a, b) => a.localeCompare(b));
        this.unitPresets = sorted.map(u => ({ label: u, value: u }));
      },
      error: (err) => {
        console.error('Failed to load unit presets:', err);
        // Fallback to common units if API fails
        this.unitPresets = [
          { label: '°C', value: '°C' },
          { label: 'bar', value: 'bar' },
          { label: '%', value: '%' },
          { label: 'ppm', value: 'ppm' },
          { label: 'Hz', value: 'Hz' },
          { label: 'm/s', value: 'm/s' },
        ];
      }
    });
  }

  /**
   * Load filter data - nodes, sensors, channels for dropdown selection
   */
  loadFilterData(): void {
    // Load Nodes
    this.nodesService.nodesControllerFindAll$Response().subscribe({
      next: (response: any) => {
        try {
          const body = response.body;
          // Handle different response formats
          let data: any[] = [];
          if (Array.isArray(body)) {
            data = body;
          } else if (body?.data && Array.isArray(body.data)) {
            data = body.data;
          } else if (typeof body === 'string') {
            const parsed = JSON.parse(body);
            data = Array.isArray(parsed) ? parsed : (parsed?.data || []);
          }
          
          this.nodesList = data.map((n: any) => ({
            id: n.id_node || n.idNode || n.id,
            label: n.name || n.label || n.code || n.serialNumber || 'Unnamed Node',
            code: n.code || n.node_code || n.nodeCode || n.serialNumber || ''
          }));
          console.log('Loaded nodes:', this.nodesList.length);
        } catch (e) {
          console.error('Error parsing nodes:', e);
          this.nodesList = [];
        }
      },
      error: (err) => console.error('Failed to load nodes:', err)
    });

    // Load Sensors
    this.sensorsService.sensorsControllerFindAll$Response().subscribe({
      next: (response: any) => {
        try {
          const body = response.body;
          let data: any[] = [];
          if (Array.isArray(body)) {
            data = body;
          } else if (body?.data && Array.isArray(body.data)) {
            data = body.data;
          } else if (typeof body === 'string') {
            const parsed = JSON.parse(body);
            data = Array.isArray(parsed) ? parsed : (parsed?.data || []);
          }
          
          this.sensorsList = data.map((s: any) => ({
            id: s.id_sensor || s.idSensor || s.id,
            label: s.label || s.name || 'Unnamed Sensor',
            nodeId: s.id_node || s.idNode || ''
          }));
          console.log('Loaded sensors:', this.sensorsList.length);
        } catch (e) {
          console.error('Error parsing sensors:', e);
          this.sensorsList = [];
        }
      },
      error: (err) => console.error('Failed to load sensors:', err)
    });

    // Load Sensor Channels
    this.sensorChannelsService.sensorChannelsControllerFindAll$Response().subscribe({
      next: (response: any) => {
        try {
          const body = response.body;
          let data: any[] = [];
          if (Array.isArray(body)) {
            data = body;
          } else if (body?.data && Array.isArray(body.data)) {
            data = body.data;
          } else if (typeof body === 'string') {
            const parsed = JSON.parse(body);
            data = Array.isArray(parsed) ? parsed : (parsed?.data || []);
          }
          
          this.channelsList = data.map((c: any) => ({
            id: c.id_sensor_channel || c.idSensorChannel || c.id,
            label: c.label || c.metric_code || c.metricCode || 'Unnamed Channel',
            metricCode: c.metric_code || c.metricCode || '',
            sensorId: c.id_sensor || c.idSensor || '',
            unit: c.unit || ''
          }));
          console.log('Loaded channels:', this.channelsList.length);
        } catch (e) {
          console.error('Error parsing channels:', e);
          this.channelsList = [];
        }
      },
      error: (err) => console.error('Failed to load channels:', err)
    });
  }

  /**
   * Handle node selection change - reset dependent filters
   */
  onNodeChange(): void {
    // Reset sensor and channel when node changes
    this.selectedSensorId = '';
    this.selectedChannelId = '';
  }

  /**
   * Handle sensor selection change - reset channel
   */
  onSensorChange(): void {
    this.selectedChannelId = '';
  }

  /**
   * Extract filter IDs from SQL query and auto-select dropdowns
   * Parses id_sensor_channel, id_sensor, id_node from WHERE clause
   */
  extractFiltersFromSql(sql: string): void {
    if (!sql) return;
    
    // Extract id_sensor_channel from SQL
    const channelMatch = sql.match(/id_sensor_channel\s*=\s*'([^']+)'/i);
    if (channelMatch) {
      this.selectedChannelId = channelMatch[1];
      console.log('Extracted channelId from SQL:', this.selectedChannelId);
      
      // Wait for filter data to load, then resolve sensor and node
      this.resolveParentFiltersFromChannel(this.selectedChannelId);
    }
    
    // Extract id_sensor from SQL (if no channel)
    if (!this.selectedChannelId) {
      const sensorMatch = sql.match(/id_sensor\s*=\s*'([^']+)'/i);
      if (sensorMatch) {
        this.selectedSensorId = sensorMatch[1];
        console.log('Extracted sensorId from SQL:', this.selectedSensorId);
        
        // Wait for filter data to load, then resolve node
        this.resolveParentFiltersFromSensor(this.selectedSensorId);
      }
    }
    
    // Extract id_node from SQL (if no sensor)
    if (!this.selectedSensorId) {
      const nodeMatch = sql.match(/id_node\s*=\s*'([^']+)'/i);
      if (nodeMatch) {
        this.selectedNodeId = nodeMatch[1];
        console.log('Extracted nodeId from SQL:', this.selectedNodeId);
      }
    }
  }

  /**
   * Resolve sensor and node from channel ID
   * Waits for filter data to be loaded
   */
  private resolveParentFiltersFromChannel(channelId: string): void {
    // Use interval to wait for data to load
    const checkInterval = setInterval(() => {
      if (this.channelsList.length > 0) {
        clearInterval(checkInterval);
        
        const channel = this.channelsList.find(c => c.id === channelId);
        if (channel && channel.sensorId) {
          this.selectedSensorId = channel.sensorId;
          console.log('Resolved sensorId from channel:', this.selectedSensorId);
          
          // Now resolve node from sensor
          this.resolveParentFiltersFromSensor(channel.sensorId);
        }
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  /**
   * Resolve node from sensor ID
   */
  private resolveParentFiltersFromSensor(sensorId: string): void {
    const checkInterval = setInterval(() => {
      if (this.sensorsList.length > 0) {
        clearInterval(checkInterval);
        
        const sensor = this.sensorsList.find(s => s.id === sensorId);
        if (sensor && sensor.nodeId) {
          this.selectedNodeId = sensor.nodeId;
          console.log('Resolved nodeId from sensor:', this.selectedNodeId);
        }
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  /**
   * Get selected node label for display
   */
  getSelectedNodeLabel(): string {
    const node = this.nodesList.find(n => n.id === this.selectedNodeId);
    return node?.label || '';
  }

  /**
   * Get selected sensor label for display
   */
  getSelectedSensorLabel(): string {
    const sensor = this.sensorsList.find(s => s.id === this.selectedSensorId);
    return sensor?.label || '';
  }

  /**
   * Get selected channel label for display
   */
  getSelectedChannelLabel(): string {
    const channel = this.channelsList.find(c => c.id === this.selectedChannelId);
    return channel?.label || '';
  }

  /**
   * Get selected Group By Time label for display
   */
  getSelectedGroupByTimeLabel(): string {
    const opt = this.groupByTimeOptions.find(o => o.value === this.selectedGroupByTime);
    return opt?.label || '';
  }

  /**
   * Get selected Group By Entity label for display
   */
  getSelectedGroupByEntityLabel(): string {
    const opt = this.groupByEntityOptions.find(o => o.value === this.selectedGroupByEntity);
    return opt?.label || '';
  }

  /**
   * Get selected Aggregation label for display
   */
  getSelectedAggregationLabel(): string {
    const opt = this.aggregationOptions.find(o => o.value === this.selectedAggregation);
    return opt?.label || '';
  }

  /**
   * Insert filter placeholder into SQL at cursor or append to WHERE clause
   */
  insertFilterPlaceholder(filterType: 'node' | 'sensor' | 'channel'): void {
    let placeholder = '';
    let value = '';
    
    switch (filterType) {
      case 'node':
        value = this.selectedNodeId;
        placeholder = `sl.id_node = '${value}'`;
        break;
      case 'sensor':
        value = this.selectedSensorId;
        placeholder = `sl.id_sensor = '${value}'`;
        break;
      case 'channel':
        value = this.selectedChannelId;
        placeholder = `sl.id_sensor_channel = '${value}'`;
        break;
    }
    
    if (!value) {
      alert(`Please select a ${filterType} first`);
      return;
    }
    
    // Append to SQL - smart insert
    if (this.form.sql.toUpperCase().includes('WHERE')) {
      // Add as AND condition
      this.form.sql = this.form.sql.replace(/(WHERE\s+)/i, `$1${placeholder} AND `);
    } else {
      // No WHERE clause, just append comment
      this.form.sql += `\n-- Add to WHERE: ${placeholder}`;
    }
  }

  /**
   * Generate SQL query based on group by selections
   */
  generateGroupedQuery(): void {
    const isClickHouse = this.selectedDataSource === 'clickhouse';
    
    // Get selected options
    const timeGroup = this.groupByTimeOptions.find(o => o.value === this.selectedGroupByTime);
    const entityGroup = this.groupByEntityOptions.find(o => o.value === this.selectedGroupByEntity);
    const aggregation = this.aggregationOptions.find(o => o.value === this.selectedAggregation);
    
    if (!aggregation) {
      alert('Please select an aggregation function');
      return;
    }

    let sql = '';
    
    if (isClickHouse) {
      sql = this.generateClickHouseGroupedQuery(timeGroup, entityGroup, aggregation);
    } else {
      sql = this.generatePostgreSQLGroupedQuery(timeGroup, entityGroup, aggregation);
    }
    
    this.form.sql = sql;
  }

  /**
   * Generate PostgreSQL grouped query
   */
  private generatePostgreSQLGroupedQuery(
    timeGroup: any, 
    entityGroup: any, 
    aggregation: any
  ): string {
    const selectParts: string[] = [];
    const groupByParts: string[] = [];
    const joinParts: string[] = [];
    const whereParts: string[] = [
      "sl.ts >= '${fromTime}'::timestamp",
      "sl.ts <= '${toTime}'::timestamp"
    ];
    
    // Time grouping
    if (timeGroup?.sqlPg) {
      selectParts.push(`${timeGroup.sqlPg} AS timestamp`);
      groupByParts.push(timeGroup.sqlPg);
    }
    
    // Entity grouping
    if (entityGroup?.value) {
      switch (entityGroup.value) {
        case 'node':
          selectParts.push('n.label AS node_name');
          joinParts.push('JOIN sensors s ON sl.id_sensor = s.id_sensor');
          joinParts.push('JOIN nodes n ON s.id_node = n.id_node');
          groupByParts.push('n.label');
          break;
        case 'sensor':
          selectParts.push('s.label AS sensor_name');
          joinParts.push('JOIN sensors s ON sl.id_sensor = s.id_sensor');
          groupByParts.push('s.label');
          break;
        case 'channel':
          selectParts.push('sc.label AS channel_name');
          joinParts.push('JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel');
          groupByParts.push('sc.label');
          break;
        case 'metric':
          selectParts.push('sc.metric_code');
          joinParts.push('JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel');
          groupByParts.push('sc.metric_code');
          break;
      }
    }
    
    // Aggregation
    selectParts.push(`${aggregation.sqlPg} AS value`);
    
    // Add count for reference
    if (aggregation.value !== 'count') {
      selectParts.push('COUNT(*) AS sample_count');
    }
    
    // Entity filters
    if (this.selectedNodeId) {
      joinParts.push('JOIN sensors s2 ON sl.id_sensor = s2.id_sensor');
      whereParts.push(`s2.id_node = '${this.selectedNodeId}'`);
    }
    if (this.selectedSensorId) {
      whereParts.push(`sl.id_sensor = '${this.selectedSensorId}'`);
    }
    if (this.selectedChannelId) {
      whereParts.push(`sl.id_sensor_channel = '${this.selectedChannelId}'`);
    }
    
    // Build query
    const uniqueJoins = [...new Set(joinParts)];
    
    let sql = `SELECT\n  ${selectParts.join(',\n  ')}\n`;
    sql += `FROM sensor_logs sl\n`;
    sql += uniqueJoins.map(j => j + '\n').join('');
    sql += `WHERE ${whereParts.join('\n  AND ')}\n`;
    
    if (groupByParts.length > 0) {
      sql += `GROUP BY ${groupByParts.join(', ')}\n`;
    }
    
    // Order by timestamp if available
    if (timeGroup?.sqlPg) {
      sql += `ORDER BY timestamp ASC`;
    } else if (entityGroup?.value) {
      sql += `ORDER BY value DESC`;
    }
    
    return sql;
  }

  /**
   * Generate ClickHouse grouped query
   */
  private generateClickHouseGroupedQuery(
    timeGroup: any, 
    entityGroup: any, 
    aggregation: any
  ): string {
    const selectParts: string[] = [];
    const groupByParts: string[] = [];
    const whereParts: string[] = [
      "event_time >= parseDateTimeBestEffort('${fromTime}')",
      "event_time <= parseDateTimeBestEffort('${toTime}')"
    ];
    
    // Time grouping
    if (timeGroup?.sqlCh) {
      selectParts.push(`${timeGroup.sqlCh} AS timestamp`);
      groupByParts.push('timestamp');
    }
    
    // Entity grouping
    if (entityGroup?.value) {
      switch (entityGroup.value) {
        case 'node':
          selectParts.push('node_code', 'node_label');
          groupByParts.push('node_code', 'node_label');
          break;
        case 'sensor':
          selectParts.push('sensor_id', 'sensor_label');
          groupByParts.push('sensor_id', 'sensor_label');
          break;
        case 'channel':
          selectParts.push('channel_id', 'metric_code');
          groupByParts.push('channel_id', 'metric_code');
          break;
        case 'metric':
          selectParts.push('metric_code');
          groupByParts.push('metric_code');
          break;
      }
    }
    
    // Aggregation
    selectParts.push(`${aggregation.sqlCh} AS value`);
    
    // Add count for reference
    if (aggregation.value !== 'count') {
      selectParts.push('count() AS sample_count');
    }
    
    // Entity filters
    if (this.selectedNodeId) {
      const node = this.nodesList.find(n => n.id === this.selectedNodeId);
      if (node?.code) {
        whereParts.push(`node_code = '${node.code}'`);
      }
    }
    if (this.selectedSensorId) {
      whereParts.push(`sensor_id = '${this.selectedSensorId}'`);
    }
    if (this.selectedChannelId) {
      whereParts.push(`channel_id = '${this.selectedChannelId}'`);
    }
    
    // Build query
    let sql = `SELECT\n  ${selectParts.join(',\n  ')}\n`;
    sql += `FROM iot.sensor_telemetry\n`;
    sql += `WHERE ${whereParts.join('\n  AND ')}\n`;
    
    if (groupByParts.length > 0) {
      sql += `GROUP BY ${groupByParts.join(', ')}\n`;
    }
    
    // Order by timestamp if available
    if (timeGroup?.sqlCh) {
      sql += `ORDER BY timestamp ASC`;
    } else if (entityGroup?.value) {
      sql += `ORDER BY value DESC`;
    }
    
    return sql;
  }

  /**
   * Change data source
   */
  onDataSourceChange(): void {
    // Re-run query with new data source if we have SQL
    if (this.form.sql) {
      this.testQuery();
    }
  }

  // UI Helper Methods
  getSelectedTypeIcon(): string {
    const wt = this.widgetTypes.find(w => w.type === this.selectedType);
    return wt?.icon || 'fa-chart-line';
  }

  getSelectedTypeLabel(): string {
    const wt = this.widgetTypes.find(w => w.type === this.selectedType);
    return wt?.label || 'Time series';
  }

  getTimeRangeLabel(): string {
    const preset = this.timeRangePresets.find(tr => tr.value === this.selectedTimeRange);
    return preset?.label || 'Last 6 hours';
  }

  selectTimeRange(value: string): void {
    this.selectedTimeRange = value;
    // Re-run query with new time range if we have results
    if (this.queryResult) {
      this.testQuery();
    }
  }

  getFilteredWidgetTypes() {
    if (!this.typeSearchQuery) return this.widgetTypes;
    const q = this.typeSearchQuery.toLowerCase();
    return this.widgetTypes.filter(w => 
      w.label.toLowerCase().includes(q) || 
      w.description.toLowerCase().includes(q)
    );
  }

  selectWidgetType(type: WidgetType): void {
    const previousType = this.selectedType;
    this.selectedType = type;
    this.showTypeSelector = false;
    
    // DON'T reset these - they should persist across widget type changes:
    // - title, name, description (identity)
    // - sql query (data source)
    // - timeRange (time filter)
    // - yAxis decimals, unit, label (formatting)
    
    // Reset type-specific settings only if changing between incompatible types
    const chartTypes = ['line-chart', 'multi-line-chart', 'bar-chart'];
    const singleValueTypes = ['gauge', 'stat-card'];
    const categoryTypes = ['pie-chart'];
    
    const getTypeCategory = (t: WidgetType) => {
      if (chartTypes.includes(t)) return 'chart';
      if (singleValueTypes.includes(t)) return 'single';
      if (categoryTypes.includes(t)) return 'category';
      return 'other';
    };
    
    // Only reset mapping/series if changing between different categories
    if (getTypeCategory(previousType) !== getTypeCategory(type)) {
      // Reset mapping for new category
      this.form.mapping = {
        xField: '',
        yField: '',
        yFields: [],
        seriesField: '',
        labelField: '',
        valueField: ''
      };
      
      // Reset series config only for non-chart types
      if (getTypeCategory(type) !== 'chart') {
        this.form.series = [];
      }
    }
    
    this.updatePreview();
  }

  toggleSection(section: keyof typeof this.expandedSections): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  toggleQueryInspector(): void {
    // TODO: Implement query inspector modal
    console.log('Query inspector clicked');
  }

  refreshPreview(): void {
    this.updatePreview();
  }

  // ============================================
  // SQL VALIDATION
  // ============================================
  
  // Validate SQL - only SELECT statements allowed
  isValidSelectQuery(): boolean {
    if (!this.form.sql || !this.form.sql.trim()) return false;
    
    const sql = this.form.sql.trim().toLowerCase();
    
    // Must start with SELECT (or WITH for CTEs)
    const startsWithSelect = sql.startsWith('select') || sql.startsWith('with');
    
    // Block dangerous keywords
    const forbiddenKeywords = [
      'insert ', 'update ', 'delete ', 'drop ', 'truncate ', 
      'create ', 'alter ', 'grant ', 'revoke ', 'execute ',
      'exec ', 'call '
    ];
    
    const hasForbidden = forbiddenKeywords.some(kw => sql.includes(kw));
    
    return startsWithSelect && !hasForbidden;
  }

  // Get SQL validation error message
  getSqlValidationError(): string | null {
    if (!this.form.sql || !this.form.sql.trim()) {
      return null;
    }
    
    const sql = this.form.sql.trim().toLowerCase();
    
    if (!sql.startsWith('select') && !sql.startsWith('with')) {
      return 'Only SELECT statements are allowed';
    }
    
    const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'truncate', 'create', 'alter'];
    for (const kw of forbiddenKeywords) {
      if (sql.includes(kw + ' ')) {
        return `${kw.toUpperCase()} statements are not allowed`;
      }
    }
    
    return null;
  }

  // ============================================
  // SERIES MANAGEMENT
  // ============================================
  
  // Toggle Y field selection and auto-create series config
  toggleYField(field: string): void {
    const index = this.form.mapping.yFields.indexOf(field);
    if (index === -1) {
      // Add field
      this.form.mapping.yFields.push(field);
      // Auto-create series config
      this.form.series.push({
        field,
        label: field,
        color: this.seriesColors[this.form.series.length % this.seriesColors.length],
        unit: '',
        decimals: 1,
        visible: true
      });
    } else {
      // Remove field
      this.form.mapping.yFields.splice(index, 1);
      // Remove series config
      const seriesIndex = this.form.series.findIndex(s => s.field === field);
      if (seriesIndex !== -1) {
        this.form.series.splice(seriesIndex, 1);
      }
    }
    this.updatePreview();
  }

  isYFieldSelected(field: string): boolean {
    return this.form.mapping.yFields.includes(field);
  }

  // Get series config by field
  getSeriesConfig(field: string) {
    return this.form.series.find(s => s.field === field);
  }

  // Update series config
  updateSeriesConfig(field: string, key: string, value: any): void {
    const series = this.form.series.find(s => s.field === field);
    if (series) {
      (series as any)[key] = value;
      this.updatePreview();
    }
  }

  // ============================================
  // THRESHOLD MANAGEMENT
  // ============================================
  
  addThreshold(mode: 'manual' | 'field' = 'manual'): void {
    this.form.thresholds.push({
      mode,
      value: 0,
      field: '',
      label: `Threshold ${this.form.thresholds.length + 1}`,
      color: this.thresholdColors[this.form.thresholds.length % this.thresholdColors.length].value,
      lineStyle: 'dashed'
    });
    this.updatePreview();
  }

  removeThreshold(index: number): void {
    this.form.thresholds.splice(index, 1);
    this.updatePreview();
  }

  updateThreshold(index: number): void {
    this.updatePreview();
  }

  addPresetThreshold(type: 'min' | 'max' | 'target' | 'warning' | 'critical', value: number): void {
    const presets: Record<string, { label: string; color: string; lineStyle: 'solid' | 'dashed' }> = {
      min: { label: 'Min', color: '#3b82f6', lineStyle: 'dashed' },
      max: { label: 'Max', color: '#ef4444', lineStyle: 'dashed' },
      target: { label: 'Target', color: '#22c55e', lineStyle: 'solid' },
      warning: { label: 'Warning', color: '#eab308', lineStyle: 'dashed' },
      critical: { label: 'Critical', color: '#ef4444', lineStyle: 'solid' }
    };
    
    const preset = presets[type];
    this.form.thresholds.push({
      mode: 'manual',
      value,
      field: '',
      label: preset.label,
      color: preset.color,
      lineStyle: preset.lineStyle
    });
    this.updatePreview();
  }

  loadThresholdsFromChannel(): void {
    if (!this.selectedChannelId) return;
    
    this.sensorChannelsService.sensorChannelsControllerFindOne({ id: this.selectedChannelId }).subscribe({
      next: (channel: any) => {
        const minVal = channel?.minThreshold ?? channel?.min_threshold;
        const maxVal = channel?.maxThreshold ?? channel?.max_threshold;
        
        if (minVal == null && maxVal == null) {
          alert('This sensor channel has no min/max thresholds configured in the database.');
          return;
        }
        
        // Remove existing Min/Max thresholds to avoid duplicates
        this.form.thresholds = this.form.thresholds.filter(
          (t: any) => t.label !== 'Min' && t.label !== 'Max'
        );
        
        if (minVal != null) {
          this.form.thresholds.push({
            mode: 'manual',
            value: parseFloat(minVal),
            field: '',
            label: 'Min',
            color: '#3b82f6',
            lineStyle: 'dashed'
          });
        }
        if (maxVal != null) {
          this.form.thresholds.push({
            mode: 'manual',
            value: parseFloat(maxVal),
            field: '',
            label: 'Max',
            color: '#ef4444',
            lineStyle: 'dashed'
          });
        }
        this.updatePreview();
      },
      error: (err: any) => {
        console.error('Failed to load sensor channel thresholds:', err);
        alert('Failed to load thresholds from sensor channel.');
      }
    });
  }

  // Get numeric columns for Y-axis selection
  getNumericColumns(): string[] {
    if (!this.queryResult || !this.queryResult.rows.length) return [];
    
    const firstRow = this.queryResult.rows[0];
    return Object.keys(firstRow).filter(key => {
      if (key.startsWith('_')) return false; // Exclude internal columns (_source)
      const val = firstRow[key];
      return typeof val === 'number' || !isNaN(parseFloat(val));
    });
  }

  loadWidget(): void {
    if (!this.widgetId || !this.dashboardId) {
      console.error('Missing widgetId or dashboardId');
      return;
    }

    console.log('Loading widget:', this.widgetId);
    
    this.widgetBuilderService.widgetBuilderControllerGetWidget$Response({
      dashboardId: this.dashboardId,
      widgetId: this.widgetId
    }).subscribe({
      next: (response: any) => {
        const widget = response.body;
        console.log('Widget loaded:', widget);
        
        // Map widget data to form
        this.form.name = widget.name || '';
        this.form.title = widget.name || '';
        this.form.sql = widget.sqlQuery || '';
        this.selectedType = widget.widgetType || 'line-chart';
        // Normalize deprecated multi-line-chart → line-chart (unified Time Series)
        if (this.selectedType === 'multi-line-chart') {
          this.selectedType = 'line-chart';
        }
        
        // Data source - check top-level first (entity column), then config fallback
        if (widget.dataSource && (widget.dataSource === 'postgresql' || widget.dataSource === 'clickhouse')) {
          this.selectedDataSource = widget.dataSource;
        }
        
        // Load config if exists
        if (widget.config) {
          const config = widget.config;
          
          // Mapping
          if (config.mapping) {
            this.form.mapping = {
              xField: config.mapping.xField || '',
              yField: config.mapping.yField || '',
              yFields: config.mapping.yFields || [],
              seriesField: config.mapping.seriesField || '',
              labelField: config.mapping.labelField || '',
              valueField: config.mapping.valueField || ''
            };
          }
          
          // Series - preserve all properties including decimals
          if (config.series && Array.isArray(config.series)) {
            this.form.series = config.series.map((s: any) => ({
              field: s.field || '',
              label: s.label || s.field || '',
              color: s.color || '',
              unit: s.unit || '',
              decimals: s.decimals ?? 2, // Default 2 if not set
              visible: s.visible !== false
            }));
          }
          
          // X-Axis
          if (config.xAxis) {
            this.form.xAxis = {
              label: config.xAxis.label || '',
              timeFormat: config.xAxis.timeFormat || 'auto'
            };
          }
          
          // Y-Axis - use values from DB, only use default if truly undefined
          // Ensure numeric types (handle string values from DB)
          if (config.yAxis) {
            this.form.yAxis = {
              label: config.yAxis.label || '',
              unit: config.yAxis.unit || '',
              decimals: parseInt(String(config.yAxis.decimals), 10) || 2,
              min: config.yAxis.min != null ? Number(config.yAxis.min) : null,
              max: config.yAxis.max != null ? Number(config.yAxis.max) : null,
              scale: config.yAxis.scale || 'linear',
              placement: config.yAxis.placement || 'left',
              showGrid: config.yAxis.showGrid || 'auto'
            };
          }
          
          // Thresholds - handle both Expert Mode and Template Mode formats
          if (config.thresholds && Array.isArray(config.thresholds)) {
            this.form.thresholds = config.thresholds.map((t: any) => ({
              mode: t.mode || 'manual',
              value: t.value ?? 0,
              field: t.field || '',
              label: t.label || '',
              color: t.color || '#ef4444',
              lineStyle: t.lineStyle || 'dashed'
            }));
          }
          
          // Display
          if (config.display) {
            this.form.display = {
              showLegend: config.display.showLegend ?? true,
              legendPosition: config.display.legendPosition || 'top',
              legendMode: config.display.legendMode || 'list',
              lineStyle: config.display.lineStyle || 'smooth',
              lineWidth: config.display.lineWidth ?? 2,
              fillOpacity: config.display.fillOpacity ?? 20,
              showPoints: config.display.showPoints || 'auto',
              tooltipMode: config.display.tooltipMode || 'all',
              // Data Smoothing
              smoothing: config.display.smoothing || {
                enabled: false,
                threshold: 50,
                minConsecutive: 3,
                method: 'interpolate'
              },
              // Bar chart specific
              barOrientation: config.display.barOrientation || 'vertical',
              showDataLabels: config.display.showDataLabels ?? false,
              // Table widget specific
              tableOptions: config.display.tableOptions || {
                striped: true,
                hover: true,
                bordered: false,
                compact: false,
                sortable: true,
                fontSize: 12,
                headerBackground: '#1a1a2e',
                columns: []
              },
              // Stat Card widget specific
              statCardOptions: config.display.statCardOptions || {
                layout: 'centered',
                icon: '',
                iconColor: '#73bf69',
                prefix: '',
                suffix: '',
                showTrend: false,
                trendField: '',
                showSparkline: false,
                sparklineField: '',
                thresholdColors: true,
                fontSize: 'large',
                valueColor: '#ffffff',
                backgroundColor: ''
              }
            };
          }
          
          // Time range
          if (config.timeRange) {
            this.form.timeRange = config.timeRange;
            this.selectedTimeRange = config.timeRange;
          }
          
          // Data source
          if (config.dataSource && (config.dataSource === 'postgresql' || config.dataSource === 'clickhouse')) {
            this.selectedDataSource = config.dataSource;
          }

          // Multi-query definitions
          if (config.queries && Array.isArray(config.queries) && config.queries.length > 1) {
            this.queries = config.queries.map((q: any) => ({
              id: q.id || this.generateQueryId(),
              name: q.name || 'Query',
              alias: q.alias || q.name?.charAt(q.name.length - 1) || 'A',
              sql: q.sql || '',
              dataSource: q.dataSource || 'postgresql',
              enabled: q.enabled !== false,
              color: q.color
            }));
            this.activeQueryIndex = 0;
            this.syncActiveQueryToForm();
          } else {
            // Single query mode — initialize queries array from form.sql
            this.queries = [{
              id: this.generateQueryId(),
              name: 'Query A',
              alias: 'A',
              sql: this.form.sql,
              dataSource: this.selectedDataSource,
              enabled: true
            }];
          }
          
          // Load templateConfig filters (from Template Mode widgets)
          if (config.templateConfig) {
            const tc = config.templateConfig;
            // Set filter values - they will be matched with dropdown options after loadFilterData completes
            if (tc.channelId) {
              this.selectedChannelId = tc.channelId;
              // Resolve parent filters (sensor, node) from channel
              this.resolveParentFiltersFromChannel(tc.channelId);
            }
            if (tc.sensorId) {
              this.selectedSensorId = tc.sensorId;
              // If no channelId, resolve node from sensor
              if (!tc.channelId) {
                this.resolveParentFiltersFromSensor(tc.sensorId);
              }
            }
            if (tc.nodeId) {
              this.selectedNodeId = tc.nodeId;
            }
            // Optionally set aggregation if available
            if (tc.aggregation) {
              this.selectedAggregation = tc.aggregation;
            }
            if (tc.groupByTime) {
              this.selectedGroupByTime = tc.groupByTime;
            }
            console.log('Loaded templateConfig filters:', { 
              nodeId: this.selectedNodeId, 
              sensorId: this.selectedSensorId, 
              channelId: this.selectedChannelId 
            });
          } else {
            // No templateConfig - try to extract channel ID from SQL query
            this.extractFiltersFromSql(this.form.sql);
          }
        }
        
        // Run query to show preview if SQL exists
        if (this.form.sql) {
          this.testQuery();
        }
      },
      error: (err: any) => {
        console.error('Failed to load widget:', err);
        alert('Failed to load widget: ' + (err.error?.message || err.message));
        this.router.navigate(['/iot/widget-builder', this.dashboardId]);
      }
    });
  }

  /**
   * Get SQL templates based on selected data source
   * @returns Array of SQL templates for PostgreSQL or ClickHouse
   */
  getSqlTemplates(): { name: string; sql: string; description?: string }[] {
    if (this.selectedDataSource === 'clickhouse') {
      return this.clickhouseTemplates;
    }
    return this.sqlTemplates;
  }

  /**
   * Apply SQL template with auto-injected filters based on selection
   */
  applySqlTemplate(template: { name: string; sql: string; description?: string }): void {
    let sql = template.sql;
    
    // Build filter conditions based on selected filters
    const filters: string[] = [];
    
    if (this.selectedDataSource === 'postgresql') {
      // PostgreSQL filters
      if (this.selectedNodeId) {
        filters.push(`sl.id_node = '${this.selectedNodeId}'`);
      }
      if (this.selectedSensorId) {
        filters.push(`sl.id_sensor = '${this.selectedSensorId}'`);
      }
      if (this.selectedChannelId) {
        filters.push(`sl.id_sensor_channel = '${this.selectedChannelId}'`);
      }
    } else {
      // ClickHouse filters
      if (this.selectedNodeId) {
        const node = this.nodesList.find(n => n.id === this.selectedNodeId);
        if (node?.code) {
          filters.push(`node_code = '${node.code}'`);
        } else {
          filters.push(`node_id = '${this.selectedNodeId}'`);
        }
      }
      if (this.selectedSensorId) {
        filters.push(`sensor_id = '${this.selectedSensorId}'`);
      }
      if (this.selectedChannelId) {
        filters.push(`channel_id = '${this.selectedChannelId}'`);
      }
    }
    
    // If filters selected, inject them into SQL
    if (filters.length > 0) {
      const filterClause = filters.join('\n  AND ');
      
      // Check if SQL has WHERE clause
      if (sql.toUpperCase().includes('WHERE')) {
        // Insert after WHERE
        sql = sql.replace(/(WHERE\s+)/i, `$1${filterClause}\n  AND `);
      } else if (sql.toUpperCase().includes('FROM')) {
        // Add WHERE before ORDER BY or GROUP BY or at end
        const insertPoint = sql.search(/\b(ORDER BY|GROUP BY|LIMIT)\b/i);
        if (insertPoint > -1) {
          sql = sql.slice(0, insertPoint) + `WHERE ${filterClause}\n` + sql.slice(insertPoint);
        } else {
          sql += `\nWHERE ${filterClause}`;
        }
      }
    }
    
    this.form.sql = sql;
  }

  // ============================================
  // MULTI-QUERY MANAGEMENT
  // ============================================

  get activeQuery(): WidgetQueryDef | null {
    return this.queries[this.activeQueryIndex] || null;
  }

  get isMultiQuery(): boolean {
    return this.queries.length > 1;
  }

  initDefaultQuery(): void {
    if (this.queries.length === 0) {
      this.queries = [{
        id: this.generateQueryId(),
        name: 'Query A',
        alias: 'A',
        sql: this.form.sql || '',
        dataSource: this.selectedDataSource,
        enabled: true,
        color: this.seriesColors[0]
      }];
      this.activeQueryIndex = 0;
    }
  }

  addQuery(): void {
    const letter = String.fromCharCode(65 + this.queries.length); // A, B, C...
    const idx = this.queries.length;
    this.queries.push({
      id: this.generateQueryId(),
      name: `Query ${letter}`,
      alias: letter,
      sql: '',
      dataSource: 'postgresql',
      enabled: true,
      color: this.seriesColors[idx % this.seriesColors.length]
    });
    this.activeQueryIndex = this.queries.length - 1;
    this.syncActiveQueryToForm();
  }

  removeQuery(index: number): void {
    if (this.queries.length <= 1) return; // Keep at least 1 query
    this.queries.splice(index, 1);
    this.queryResults.delete(this.queries[index]?.id);
    if (this.activeQueryIndex >= this.queries.length) {
      this.activeQueryIndex = this.queries.length - 1;
    }
    this.syncActiveQueryToForm();
    this.mergeAllQueryResults();
  }

  selectQuery(index: number): void {
    // Save current form.sql to the active query before switching
    this.syncFormToActiveQuery();
    this.activeQueryIndex = index;
    this.syncActiveQueryToForm();
  }

  /** Sync form.sql / selectedDataSource → active query object */
  syncFormToActiveQuery(): void {
    const q = this.queries[this.activeQueryIndex];
    if (q) {
      q.sql = this.form.sql;
      q.dataSource = this.selectedDataSource;
    }
  }

  /** Sync active query object → form.sql / selectedDataSource */
  syncActiveQueryToForm(): void {
    const q = this.queries[this.activeQueryIndex];
    if (q) {
      this.form.sql = q.sql;
      this.selectedDataSource = q.dataSource;
    }
  }

  toggleQueryEnabled(index: number, event: Event): void {
    event.stopPropagation();
    this.queries[index].enabled = !this.queries[index].enabled;
    this.mergeAllQueryResults();
  }

  updateQueryName(index: number, name: string): void {
    this.queries[index].name = name;
  }

  private generateQueryId(): string {
    return 'q-' + Math.random().toString(36).substring(2, 10);
  }

  /** Execute all enabled queries and merge results */
  executeAllQueries(): void {
    this.syncFormToActiveQuery();
    
    const enabledQueries = this.queries.filter(q => q.enabled && q.sql.trim());
    if (enabledQueries.length === 0) {
      this.queryError = 'No enabled queries with SQL to execute';
      return;
    }

    this.queryLoading = true;
    this.queryError = null;
    this.queryResult = null;
    this.queryResults.clear();

    let completed = 0;
    let hasError = false;

    for (const q of enabledQueries) {
      this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
        body: {
          sql: q.sql,
          dataSource: q.dataSource,
          from: this.timeFrom,
          to: this.timeTo,
          variables: {}
        }
      }).subscribe({
        next: (response: any) => {
          this.queryResults.set(q.id, {
            columns: response.columns || [],
            rows: (response.rows || []).map((row: any) => ({ ...row, _source: q.alias })),
            rowCount: response.rowCount || 0,
            executionTime: response.executionTime || 0
          });
          completed++;
          if (completed === enabledQueries.length) {
            this.mergeAllQueryResults();
            this.queryLoading = false;
          }
        },
        error: (err: any) => {
          if (!hasError) {
            hasError = true;
            this.queryError = `[${q.name}] ${err.error?.message || err.message || 'Query failed'}`;
          }
          completed++;
          if (completed === enabledQueries.length) {
            this.mergeAllQueryResults();
            this.queryLoading = false;
          }
        }
      });
    }
  }

  /** Merge all query results into a single queryResult for chart rendering */
  mergeAllQueryResults(): void {
    const allColumns = new Set<string>();
    let allRows: any[] = [];
    let totalTime = 0;

    allColumns.add('_source');

    for (const q of this.queries) {
      if (!q.enabled) continue;
      const result = this.queryResults.get(q.id);
      if (!result) continue;
      result.columns.forEach(c => allColumns.add(c));
      allRows = allRows.concat(result.rows);
      totalTime += result.executionTime;
    }

    if (allRows.length > 0) {
      this.queryResult = {
        columns: Array.from(allColumns),
        rows: allRows,
        rowCount: allRows.length,
        executionTime: totalTime
      };
      this.availableColumns = this.queryResult.columns;

      // Multi-query: auto-set seriesField to '_source' so chart groups by query alias
      if (this.isMultiQuery) {
        this.form.mapping.seriesField = '_source';
      }

      // Auto-generate table columns if table widget and no columns configured yet
      if (this.selectedType === 'table' && this.form.display.tableOptions.columns.length === 0) {
        this.autoGenerateTableColumns();
      }

      this.autoMapFields();
      // Populate Series Override from seriesField unique values
      this.refreshSeriesFromData();
    } else {
      this.queryResult = null;
    }
  }

  testQuery(): void {
    // Multi-query mode: execute all queries
    if (this.isMultiQuery) {
      this.syncFormToActiveQuery();
      this.executeAllQueries();
      return;
    }

    // Single-query mode (legacy / default)
    // Validate SQL first
    if (!this.isValidSelectQuery()) {
      this.queryError = this.getSqlValidationError() || 'Invalid SQL query';
      return;
    }

    // Also sync to queries[0] for consistency
    this.syncFormToActiveQuery();

    this.queryLoading = true;
    this.queryError = null;
    this.queryResult = null;

    // Execute query via API with from/to epoch timestamps and data source
    this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
      body: {
        sql: this.form.sql,
        dataSource: this.selectedDataSource,
        from: this.timeFrom,
        to: this.timeTo,
        variables: {}
      }
    }).subscribe({
      next: (response: any) => {
        // Real API response
        this.queryResult = {
          columns: response.columns || [],
          rows: response.rows || [],
          rowCount: response.rowCount || 0,
          executionTime: response.executionTime || 0
        };
        
        this.availableColumns = this.queryResult.columns;
        
        // Auto-generate table columns if table widget and no columns configured yet
        if (this.selectedType === 'table' && this.form.display.tableOptions.columns.length === 0) {
          this.autoGenerateTableColumns();
        }
        
        this.autoMapFields();
        this.queryLoading = false;
      },
      error: (err: any) => {
        console.error('API query failed:', err);
        this.queryError = err.error?.message || err.message || 'Query execution failed';
        this.queryLoading = false;
      }
    });
  }

  autoMapFields(): void {
    if (!this.queryResult) return;
    
    const columns = this.queryResult.columns;
    // Exclude internal columns (_source) for auto-detection fallbacks
    const userColumns = columns.filter(c => !c.startsWith('_'));
    
    const timestampField = userColumns.find(c => 
      c.toLowerCase().includes('timestamp') || 
      c.toLowerCase().includes('time') ||
      c.toLowerCase() === 'ts'
    );
    
    const valueField = userColumns.find(c => 
      c.toLowerCase().includes('value') ||
      c.toLowerCase().includes('avg') ||
      c.toLowerCase().includes('sum')
    );
    
    const labelField = userColumns.find(c => 
      c.toLowerCase().includes('name') ||
      c.toLowerCase().includes('label') ||
      c.toLowerCase().includes('category')
    );

    const seriesField = userColumns.find(c => 
      c.toLowerCase().includes('series') ||
      c.toLowerCase().includes('metric') ||
      c.toLowerCase().includes('sensor')
    );

    switch (this.selectedType) {
      case 'line-chart':
      case 'multi-line-chart':
        this.form.mapping.xField = timestampField || userColumns[0];
        this.form.mapping.yField = valueField || userColumns[1];
        // Multi-query: keep '_source' as seriesField (set by mergeAllQueryResults)
        // Also preserve user's saved seriesField in edit mode
        if (this.isMultiQuery && this.form.mapping.seriesField === '_source') {
          // preserve — don't overwrite
        } else if (this.isEditMode && this.form.mapping.seriesField) {
          // preserve user's saved seriesField in edit mode — don't overwrite
        } else {
          this.form.mapping.seriesField = seriesField || '';
        }
        
        // Auto-select numeric fields for multi-line (exclude timestamp and threshold fields)
        const numericCols = this.getNumericColumns();
        const selectedFields = numericCols.filter(c => 
          !c.toLowerCase().includes('timestamp') && 
          !c.toLowerCase().includes('time') &&
          !c.toLowerCase().includes('min_') &&
          !c.toLowerCase().includes('max_') &&
          !c.toLowerCase().includes('target_')
        ).slice(0, 3); // Default: select first 3 numeric fields
        
        // Set yFields and auto-create series config
        // IMPORTANT: Preserve existing series config if already set (edit mode)
        if (this.form.mapping.yFields.length === 0) {
          this.form.mapping.yFields = selectedFields;
        }
        
        // Only create new series config if empty (new widget)
        // Otherwise preserve existing config with user's decimals, colors, etc.
        if (this.form.series.length === 0) {
          // If seriesField is set, populate from unique seriesField values
          const activeSeriesField = this.form.mapping.seriesField;
          if (activeSeriesField && this.queryResult?.rows.some(d => d[activeSeriesField])) {
            const uniqueValues = [...new Set(this.queryResult.rows.map(d => d[activeSeriesField]).filter(Boolean))] as string[];
            this.form.series = uniqueValues.map((val, idx) => ({
              field: val,
              label: val,
              color: this.seriesColors[idx % this.seriesColors.length],
              unit: '',
              decimals: 2,
              visible: true
            }));
          } else {
            this.form.series = selectedFields.map((field, idx) => ({
              field,
              label: field,
              color: this.seriesColors[idx % this.seriesColors.length],
              unit: '',
              decimals: 2, // Default 2
              visible: true
            }));
          }
        }
        break;
      case 'bar-chart':
        this.form.mapping.xField = labelField || userColumns[0];
        this.form.mapping.yField = valueField || userColumns[1];
        break;
      case 'pie-chart':
        this.form.mapping.labelField = labelField || userColumns[0];
        this.form.mapping.valueField = valueField || userColumns[1];
        break;
      case 'gauge':
      case 'stat-card':
        this.form.mapping.valueField = valueField || userColumns[0];
        break;
    }
    
    this.updatePreview();
  }

  updatePreview(): void {
    if (!this.queryResult) return;
    
    const data = this.queryResult.rows;
    this.previewOptions = this.buildChartOptions(data);
  }

  buildChartOptions(data: any[]): any {
    switch (this.selectedType) {
      case 'line-chart':
      case 'multi-line-chart':
        return this.buildLineChartOptions(data);
        
      case 'bar-chart':
        return this.buildBarChartOptions(data);
        
      case 'gauge':
        const gaugeValue = data[0]?.[this.form.mapping.valueField] || 0;
        const gaugeMin = this.form.yAxis.min ?? 0;
        const gaugeMax = this.form.yAxis.max ?? 100;
        const gaugeUnit = this.form.yAxis.unit || '';
        const gaugeDecimals = this.form.yAxis.decimals ?? 2;
        
        // Build axis color ranges from thresholds
        const axisColorRanges = this.buildGaugeAxisColors(gaugeMin, gaugeMax);
        
        return {
          series: [{
            type: 'gauge',
            radius: '115%',
            center: ['50%', '75%'],
            startAngle: 210,
            endAngle: -30,
            min: gaugeMin,
            max: gaugeMax,
            progress: { show: true, width: 14, roundCap: true, itemStyle: { color: '#73bf69' } },
            axisLine: { lineStyle: { width: 14, color: axisColorRanges, opacity: 0.25 } },
            axisTick: { 
              show: true, 
              distance: -18, 
              length: 4, 
              lineStyle: { color: 'rgba(255,255,255,0.2)', width: 1 } 
            },
            splitLine: { 
              show: true, 
              distance: -18, 
              length: 8, 
              lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1.5 } 
            },
            axisLabel: { show: false },
            pointer: { show: false },
            detail: { 
              valueAnimation: true, 
              fontSize: 28,
              fontWeight: 'bold',
              fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
              color: '#73bf69',
              offsetCenter: [0, '-15%'],
              formatter: (value: number) => value.toFixed(gaugeDecimals)
            },
            data: [{ value: gaugeValue }]
          }],
          graphic: [
            { type: 'text', left: '8%', bottom: '8%', style: { text: gaugeMin.toFixed(0), fontSize: 10, fill: 'rgba(255, 255, 255, 0.4)', textAlign: 'center' } },
            { type: 'text', right: '8%', bottom: '8%', style: { text: gaugeMax.toFixed(0), fontSize: 10, fill: 'rgba(255, 255, 255, 0.4)', textAlign: 'center' } },
            { type: 'text', left: 'center', bottom: '3%', style: { text: gaugeUnit, fontSize: 13, fontWeight: '500', fill: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' } }
          ]
        };
        
      case 'pie-chart':
        return {
          tooltip: { trigger: 'item' },
          legend: { 
            show: this.form.display.showLegend, 
            type: 'scroll',
            orient: 'vertical', 
            right: 10,
            top: 'center',
            textStyle: { 
              color: 'rgba(255,255,255,0.8)',
              width: 100,
              overflow: 'truncate',
              ellipsis: '...'
            },
            pageIconColor: '#73bf69',
            pageIconInactiveColor: '#555',
            formatter: (name: string) => name.length > 16 ? name.substring(0, 13) + '...' : name
          },
          series: [{
            type: 'pie',
            radius: ['50%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#1e1e1e', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#fff' } },
            labelLine: { show: false },
            data: data.map((d, i) => ({
              name: d[this.form.mapping.labelField],
              value: d[this.form.mapping.valueField],
              itemStyle: { color: this.getColorByIndex(i) }
            }))
          }]
        };
        
      case 'stat-card':
        const currentValue = parseFloat(data[0]?.[this.form.mapping.valueField]) || 0;
        const previousValue = data.length > 1 ? parseFloat(data[1]?.[this.form.mapping.valueField]) || 0 : 0;
        let trend: 'up' | 'down' | null = null;
        let trendPercent = '';
        
        if (this.form.display.statCardOptions.showTrend && previousValue !== 0) {
          const diff = currentValue - previousValue;
          const percent = (diff / Math.abs(previousValue)) * 100;
          trendPercent = Math.abs(percent).toFixed(1) + '%';
          trend = diff > 0 ? 'up' : diff < 0 ? 'down' : null;
        }
        
        return {
          value: currentValue,
          title: this.form.title || 'Value',
          trend,
          trendPercent
        };
        
      default:
        return null;
    }
  }

  /**
   * Build gauge axis color ranges from thresholds
   * Returns array of [percentage, color] for ECharts gauge axisLine.color
   */
  buildGaugeAxisColors(min: number, max: number): [number, string][] {
    const range = max - min;
    if (range <= 0 || !this.form.thresholds || this.form.thresholds.length === 0) {
      // Default: full green
      return [[1, '#73bf69']];
    }
    
    // Sort thresholds by value
    const sortedThresholds = [...this.form.thresholds]
      .filter(t => t.value != null)
      .sort((a, b) => a.value - b.value);
    
    if (sortedThresholds.length === 0) {
      return [[1, '#73bf69']];
    }
    
    const colors: [number, string][] = [];
    let lastPercent = 0;
    
    for (const threshold of sortedThresholds) {
      const percent = (threshold.value - min) / range;
      if (percent > lastPercent && percent <= 1) {
        colors.push([percent, threshold.color || '#73bf69']);
        lastPercent = percent;
      }
    }
    
    // Add remaining as last threshold color (or red/warning zone)
    if (lastPercent < 1) {
      const lastColor = sortedThresholds[sortedThresholds.length - 1]?.color || '#ef4444';
      colors.push([1, lastColor]);
    }
    
    // If no colors added, default
    if (colors.length === 0) {
      return [[1, '#73bf69']];
    }
    
    return colors;
  }

  buildBarChartOptions(data: any[]): any {
    const { xField, yField, seriesField } = this.form.mapping;
    const { showLegend, legendPosition, barOrientation, showDataLabels } = this.form.display;
    const yAxisConfig = this.form.yAxis;
    const seriesConfig = this.form.series;
    
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const axisLineColor = 'rgba(255, 255, 255, 0.2)';
    const decimals = yAxisConfig.decimals ?? 2;
    const unit = yAxisConfig.unit || '';
    const isHorizontal = barOrientation === 'horizontal';
    
    const colors = this.seriesColors;
    
    let series: any[] = [];
    let categoryData: string[] = [];
    let legendData: string[] = [];
    
    // Border radius: [topLeft, topRight, bottomRight, bottomLeft]
    // For vertical: round top corners; For horizontal: round right corners
    const borderRadius = isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
    
    // Check if we have seriesField (Group By) - for multi-bar grouped chart
    if (seriesField && data.length > 0 && data[0][seriesField] !== undefined) {
      const categories = [...new Set(data.map(r => String(r[xField])))];
      const seriesNames = [...new Set(data.map(r => String(r[seriesField])))];
      
      categoryData = categories;
      legendData = seriesNames;
      
      // Group data by series
      const groupedData: Record<string, Record<string, number>> = {};
      data.forEach(row => {
        const cat = String(row[xField]);
        const sName = String(row[seriesField]);
        const yVal = parseFloat(row[yField]) || 0;
        
        if (!groupedData[sName]) groupedData[sName] = {};
        groupedData[sName][cat] = yVal;
      });
      
      // Create series for each group
      series = seriesNames.map((name, idx) => {
        const sc = seriesConfig.find(s => s.field === name);
        const color = sc?.color || colors[idx % colors.length];
        
        return {
          name: sc?.label || name,
          type: 'bar',
          data: categories.map(cat => groupedData[name]?.[cat] ?? 0),
          itemStyle: { color, borderRadius },
          barGap: '10%',
          emphasis: { focus: 'series' },
          label: showDataLabels ? {
            show: true,
            position: isHorizontal ? 'right' : 'top',
            color: textColor,
            fontSize: 10,
            formatter: (p: any) => (p.data as number).toFixed(decimals)
          } : { show: false }
        };
      });
    } else {
      // Simple bar chart
      categoryData = data.map(r => String(r[xField]));
      
      series = [{
        name: yField,
        type: 'bar',
        data: data.map(r => parseFloat(r[yField]) || 0),
        itemStyle: { 
          color: seriesConfig[0]?.color || colors[0],
          borderRadius
        },
        barMaxWidth: 60,
        label: showDataLabels ? {
          show: true,
          position: isHorizontal ? 'right' : 'top',
          color: textColor,
          fontSize: 10,
          formatter: (p: any) => (p.data as number).toFixed(decimals)
        } : { show: false }
      }];
    }
    
    // Add threshold lines (on value axis)
    if (this.form.thresholds.length > 0 && series.length > 0) {
      series[0].markLine = {
        silent: true,
        symbol: 'none',
        data: this.form.thresholds.map(t => ({
          [isHorizontal ? 'xAxis' : 'yAxis']: t.value,
          label: { 
            show: true, 
            formatter: t.label || `${t.value}`,
            color: t.color || '#f2495c',
            position: 'end'
          },
          lineStyle: {
            color: t.color || '#f2495c',
            type: t.lineStyle || 'dashed',
            width: 2
          }
        }))
      };
    }
    
    const showValueAxis = yAxisConfig.placement !== 'hidden';
    const valueAxisPosition = yAxisConfig.placement === 'right' ? 'right' : 'left';
    const showGridLines = yAxisConfig.showGrid === 'on' || yAxisConfig.showGrid === 'auto';
    
    // Category axis config (labels)
    const categoryAxisConfig: any = {
      type: 'category',
      data: categoryData,
      axisLabel: { 
        color: textColor,
        fontSize: 10,
        interval: 0,
        rotate: !isHorizontal && categoryData.length > 6 ? 30 : 0,
        width: isHorizontal ? 100 : 80,
        overflow: 'truncate'
      },
      axisLine: { lineStyle: { color: axisLineColor } },
      axisTick: { alignWithLabel: true }
    };
    
    // Value axis config (numbers)
    const valueAxisConfig: any = {
      type: 'value',
      show: showValueAxis,
      position: valueAxisPosition,
      name: yAxisConfig.label || '',
      nameTextStyle: { color: textColor, fontSize: 11 },
      min: yAxisConfig.min ?? undefined,
      max: yAxisConfig.max ?? undefined,
      axisLabel: { 
        color: textColor,
        fontSize: 10,
        formatter: (value: number) => value?.toFixed(decimals) || '0'
      },
      axisLine: { show: true, lineStyle: { color: axisLineColor } },
      splitLine: { show: showGridLines, lineStyle: { color: axisLineColor, type: 'dashed' } }
    };
    
    return {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) params = [params];
          let html = `<div style="font-weight:600;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:4px">${params[0]?.axisValue || ''}</div>`;
          params.forEach((item: any) => {
            if (item.data !== undefined && item.data !== null) {
              const sc = seriesConfig.find(s => s.field === item.seriesName || s.label === item.seriesName);
              const d = sc?.decimals ?? decimals;
              const u = sc?.unit || unit;
              const val = typeof item.data === 'number' ? item.data.toFixed(d) : (parseFloat(item.data)?.toFixed(d) || item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:20px;padding:2px 0">
                <span>${item.marker} ${item.seriesName}</span>
                <span style="font-weight:600">${val}${u ? ' ' + u : ''}</span>
              </div>`;
            }
          });
          return html;
        }
      },
      legend: showLegend && legendData.length > 1 ? {
        show: true,
        type: 'scroll',
        data: legendData,
        // Position legend properly based on settings
        top: legendPosition === 'bottom' ? undefined : 8,
        bottom: legendPosition === 'bottom' ? 0 : undefined,
        left: legendPosition === 'right' ? undefined : 'center',
        right: legendPosition === 'right' ? 10 : undefined,
        orient: legendPosition === 'right' ? 'vertical' : 'horizontal',
        textStyle: { 
          color: textColor, 
          fontSize: 11,
          width: 120,
          overflow: 'truncate',
          ellipsis: '...'
        },
        itemWidth: 14,
        itemHeight: 10,
        pageIconColor: '#73bf69',
        pageIconInactiveColor: '#555',
        pageTextStyle: { color: textColor },
        formatter: (name: string) => name.length > 18 ? name.substring(0, 15) + '...' : name
      } : { show: false },
      grid: { 
        left: isHorizontal ? 100 : (showValueAxis && valueAxisPosition === 'left' ? 55 : 12), 
        right: isHorizontal 
          ? (showDataLabels ? 50 : 20) 
          : (legendPosition === 'right' && showLegend && legendData.length > 1 ? 140 : (showValueAxis && valueAxisPosition === 'right' ? 55 : 12)), 
        // Top: add space for legend at top
        top: legendPosition !== 'bottom' && showLegend && legendData.length > 1 ? 35 : 20, 
        // Bottom: add space for legend at bottom + labels
        bottom: legendPosition === 'bottom' && showLegend && legendData.length > 1 ? 50 : 30, 
        containLabel: false 
      },
      // For horizontal: xAxis is value, yAxis is category
      // For vertical: xAxis is category, yAxis is value
      xAxis: isHorizontal ? valueAxisConfig : categoryAxisConfig,
      yAxis: isHorizontal ? categoryAxisConfig : valueAxisConfig,
      series
    };
  }

  buildLineChartOptions(data: any[]): any {
    const { xField, yField, yFields, seriesField } = this.form.mapping;
    const { showLegend, legendPosition, lineStyle, lineWidth, fillOpacity, showPoints, smoothing } = this.form.display;
    const yAxisConfig = this.form.yAxis;

    // Helper function for data smoothing (outlier removal)
    const smoothData = (values: (number | null)[]): (number | null)[] => {
      if (!smoothing?.enabled || values.length < 3) return values;
      
      const threshold = (smoothing.threshold || 50) / 100;
      const minConsecutive = smoothing.minConsecutive || 3;
      const method = smoothing.method || 'interpolate';
      
      // Calculate median for threshold baseline
      const validValues = values.filter(v => v !== null && v !== undefined) as number[];
      if (validValues.length < 3) return values;
      
      const sorted = [...validValues].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const lowerBound = median * threshold;
      const upperBound = median * (2 - threshold);
      
      // Detect outliers
      const isOutlier = values.map(v => {
        if (v === null || v === undefined) return false;
        return v < lowerBound || v > upperBound;
      });
      
      // Find consecutive outlier runs
      const result = [...values];
      let i = 0;
      while (i < values.length) {
        if (isOutlier[i]) {
          let runLength = 1;
          while (i + runLength < values.length && isOutlier[i + runLength]) {
            runLength++;
          }
          // Only smooth if run is shorter than minConsecutive (isolated spikes)
          if (runLength < minConsecutive) {
            for (let j = i; j < i + runLength; j++) {
              const prev = j > 0 ? result[j - 1] : null;
              const next = j + runLength < values.length ? values[j + runLength] : null;
              if (method === 'interpolate' && prev !== null && next !== null) {
                const progress = (j - i + 1) / (runLength + 1);
                result[j] = prev + (next - prev) * progress;
              } else if (method === 'average' && prev !== null && next !== null) {
                result[j] = (prev + next) / 2;
              } else if (method === 'previous' && prev !== null) {
                result[j] = prev;
              }
            }
          }
          i += runLength;
        } else {
          i++;
        }
      }
      return result;
    };

    // Store original timestamps for tooltip
    const originalXValues = data.map(d => d[xField]);

    // Auto-detect time span for smart formatting
    const getTimeSpanHours = (): number => {
      if (data.length < 2) return 1;
      const first = new Date(data[0]?.[xField]);
      const last = new Date(data[data.length - 1]?.[xField]);
      if (isNaN(first.getTime()) || isNaN(last.getTime())) return 1;
      return Math.abs(last.getTime() - first.getTime()) / (1000 * 60 * 60);
    };
    const timeSpanHours = getTimeSpanHours();

    // Time format helper — Grafana-style smart auto-detection
    const formatXValue = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string' && (val.includes('T') || val.includes('-'))) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          // If user explicitly set a format, respect it
          if (this.form.xAxis.timeFormat && this.form.xAxis.timeFormat !== 'auto') {
            switch (this.form.xAxis.timeFormat) {
              case 'HH:mm:ss': return date.toLocaleTimeString('id-ID');
              case 'DD/MM': return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
              case 'DD/MM HH:mm': return `${date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
              case 'YYYY-MM-DD': return date.toISOString().split('T')[0];
            }
          }
          // Auto-detect based on time span
          if (timeSpanHours <= 24) {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          } else if (timeSpanHours <= 168) {
            return `${date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
          } else if (timeSpanHours <= 2160) {
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
          } else {
            return date.toLocaleDateString('id-ID', { month: '2-digit', year: 'numeric' });
          }
        }
      }
      return val;
    };
    // Calculate label interval (~8-12 labels visible)
    const labelInterval = data.length <= 12 ? 0 : Math.floor(data.length / 10) - 1;

    // Custom tooltip formatter with full timestamp
    const tooltipFormatter = (params: any) => {
      if (!Array.isArray(params)) params = [params];
      
      // Get original timestamp from dataIndex
      const dataIndex = params[0]?.dataIndex;
      let timeLabel = '';
      if (dataIndex !== undefined && originalXValues[dataIndex]) {
        const date = new Date(originalXValues[dataIndex]);
        if (!isNaN(date.getTime())) {
          // Full date-time format for tooltip
          timeLabel = `${date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${date.toLocaleTimeString('id-ID')}`;
        } else {
          timeLabel = originalXValues[dataIndex];
        }
      } else {
        timeLabel = params[0]?.axisValue || '';
      }
      
      let html = `<div style="font-weight:600;margin-bottom:4px">${timeLabel}</div>`;
      
      params.forEach((item: any) => {
        if (item.seriesType === 'line' && item.data !== undefined) {
          const seriesConfig = this.form.series.find(s => 
            s.label === item.seriesName || 
            s.field === item.seriesName ||
            this.form.mapping.yFields?.includes(item.seriesName)
          );
          
          const decimals = seriesConfig?.decimals ?? this.form.yAxis.decimals ?? 2;
          const unit = seriesConfig?.unit || this.form.yAxis.unit || '';
          
          let value: string;
          if (typeof item.data === 'number') {
            value = item.data.toFixed(decimals);
          } else if (typeof item.data === 'string' && !isNaN(parseFloat(item.data))) {
            value = parseFloat(item.data).toFixed(decimals);
          } else {
            value = String(item.data);
          }
          
          html += `<div style="display:flex;justify-content:space-between;gap:20px">
            <span>${item.marker} ${item.seriesName}</span>
            <span style="font-weight:600">${value}${unit}</span>
          </div>`;
        }
      });
      
      return html;
    };

    const baseConfig = {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderColor: 'rgba(255,255,255,0.2)',
        textStyle: { color: '#fff' },
        formatter: tooltipFormatter
      },
      legend: { 
        show: showLegend,
        type: 'scroll',
        // Position legend properly based on settings
        top: legendPosition === 'bottom' ? undefined : 8,
        bottom: legendPosition === 'bottom' ? 0 : undefined,
        left: legendPosition === 'right' ? undefined : 'center',
        right: legendPosition === 'right' ? 10 : undefined,
        orient: legendPosition === 'right' ? 'vertical' : 'horizontal',
        textStyle: { 
          color: 'rgba(255,255,255,0.8)',
          width: 120,
          overflow: 'truncate',
          ellipsis: '...'
        },
        pageIconColor: '#73bf69',
        pageIconInactiveColor: '#555',
        pageTextStyle: { color: 'rgba(255,255,255,0.8)' },
        formatter: (name: string) => name.length > 18 ? name.substring(0, 15) + '...' : name
      },
      grid: { 
        left: 45, 
        right: legendPosition === 'right' && showLegend ? 140 : 12, 
        // Top: add space for legend at top
        top: legendPosition !== 'bottom' && showLegend ? 35 : 20,
        // Bottom: add space for legend at bottom
        bottom: legendPosition === 'bottom' && showLegend ? 50 : 24, 
        containLabel: false 
      },
      xAxis: {
        type: 'category',
        name: this.form.xAxis.label || '',
        boundaryGap: false,
        axisLabel: {
          color: 'rgba(255,255,255,0.6)',
          interval: labelInterval,
          showMinLabel: true,
          showMaxLabel: true
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }
      },
      yAxis: { 
        type: yAxisConfig.scale === 'log' ? 'log' : 'value',
        name: yAxisConfig.label || '',
        min: yAxisConfig.min ?? undefined,
        max: yAxisConfig.max ?? undefined,
        axisLabel: { 
          color: 'rgba(255,255,255,0.6)',
          formatter: (value: number) => this.formatYAxisValue(value)
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      }
    };

    let series: any[] = [];
    const xValues = data.map(d => formatXValue(d[xField]));

    // Helper: bucket timestamp to nearest minute for alignment
    const bucketTimestamp = (val: any): string => {
      if (!val) return '';
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);
      date.setSeconds(0, 0);
      return date.toISOString();
    };

    // Multi-series by field (seriesField) - grouping data by series column
    if (seriesField && data.some(d => d[seriesField])) {
      // Group data by bucketed timestamp for alignment
      const groupedData: Record<string, Record<string, number>> = {};
      const bucketToDisplay: Record<string, string> = {};
      
      data.forEach(d => {
        const bucket = bucketTimestamp(d[xField]);
        const displayVal = formatXValue(d[xField]);
        const sName = d[seriesField];
        
        if (!groupedData[sName]) groupedData[sName] = {};
        groupedData[sName][bucket] = d[yField] ?? d[yFields?.[0]] ?? d['value'];
        bucketToDisplay[bucket] = displayVal;
      });

      const uniqueBuckets = [...new Set(data.map(d => bucketTimestamp(d[xField])))].sort();
      const seriesNames = [...new Set(data.map(d => d[seriesField]))];
      
      // Determine the actual Y field to use for series data
      // Prefer yField if it's a real numeric field, otherwise fall back to yFields[0]
      const effectiveYField = (yField && yField !== xField && data.some(d => typeof d[yField] === 'number'))
        ? yField
        : (yFields && yFields.length > 0 ? yFields[0] : yField);
      
      series = seriesNames.map((name, idx) => {
        // Use Series Override config (form.series) for color/label
        const sc = this.form.series.find(s => s.field === name);
        let color = sc?.color || this.getColorByIndex(idx);
        // Multi-query _source: fallback to per-query color 
        if (!sc?.color && seriesField === '_source' && this.queries.length > 1) {
          const matchingQuery = this.queries.find(q => q.alias === name || q.name === name);
          if (matchingQuery?.color) color = matchingQuery.color;
        }
        // Display name: use Series Override label, or multi-query format, or raw name
        let displayName = sc?.label && sc.label !== name ? sc.label : name;
        if (seriesField === '_source' && this.queries.length > 1 && (!sc?.label || sc.label === name)) {
          displayName = `${name}: ${effectiveYField}`;
        }
        // Check visibility from Series Override
        const visible = sc?.visible !== false;
        const rawData: (number | null)[] = uniqueBuckets.map(bucket => groupedData[name]?.[bucket] ?? null);
        return {
          name: displayName,
          type: 'line',
          smooth: lineStyle === 'smooth',
          step: lineStyle === 'step' ? 'middle' : false,
          lineStyle: { width: visible ? lineWidth : 0, opacity: visible ? 1 : 0 },
          showSymbol: visible && showPoints === 'always',
          areaStyle: fillOpacity > 0 && visible ? { opacity: fillOpacity / 100 } : undefined,
          itemStyle: { color, opacity: visible ? 1 : 0 },
          data: smoothData(rawData)
        };
      });

      return {
        ...baseConfig,
        xAxis: { ...baseConfig.xAxis, data: uniqueBuckets.map(b => bucketToDisplay[b] || formatXValue(b)) },
        series: [...series, ...this.buildThresholdSeries()]
      };
    }

    // Multi-line from multiple Y fields (yFields) with series config
    if (yFields && yFields.length > 0) {
      series = yFields.map((field, idx) => {
        const seriesConfig = this.form.series.find(s => s.field === field);
        const color = seriesConfig?.color || this.seriesColors[idx % this.seriesColors.length];
        const label = seriesConfig?.label || field;
        const rawData = data.map(d => d[field]);
        
        return {
          name: label,
          type: 'line',
          smooth: lineStyle === 'smooth',
          step: lineStyle === 'step' ? 'middle' : false,
          lineStyle: { width: lineWidth, color },
          showSymbol: showPoints === 'always',
          areaStyle: fillOpacity > 0 ? { opacity: fillOpacity / 100, color } : undefined,
          itemStyle: { color },
          data: smoothData(rawData)
        };
      });

      return {
        ...baseConfig,
        xAxis: { ...baseConfig.xAxis, data: xValues },
        series: [...series, ...this.buildThresholdSeries()]
      };
    }

    // Single line (fallback to yField)
    if (yField) {
      const rawData = data.map(d => d[yField]);
      series = [{
        name: yField,
        type: 'line',
        smooth: lineStyle === 'smooth',
        step: lineStyle === 'step' ? 'middle' : false,
        lineStyle: { width: lineWidth, color: '#73bf69' },
        showSymbol: showPoints === 'always',
        areaStyle: fillOpacity > 0 ? { opacity: fillOpacity / 100, color: '#73bf69' } : undefined,
        itemStyle: { color: '#73bf69' },
        data: smoothData(rawData)
      }];
    }

    return {
      ...baseConfig,
      xAxis: { ...baseConfig.xAxis, data: xValues },
      series: [...series, ...this.buildThresholdSeries()]
    };
  }

  // Format tooltip with unit and decimals
  formatTooltip(params: any): string {
    if (!Array.isArray(params)) params = [params];
    
    // Format timestamp from axisValue
    let timeLabel = params[0]?.axisValue || '';
    if (timeLabel) {
      // Try to parse and format the timestamp
      const date = new Date(timeLabel);
      if (!isNaN(date.getTime())) {
        // Format based on selected time format or default
        const timeFormat = this.form.xAxis?.timeFormat || 'DD/MM HH:mm';
        timeLabel = this.formatDateByPattern(date, timeFormat);
      }
    }
    
    let html = `<div style="font-weight:600;margin-bottom:4px">${timeLabel}</div>`;
    
    params.forEach((item: any) => {
      if (item.seriesType === 'line' && item.data !== undefined) {
        // Find series config by field name or label
        const seriesConfig = this.form.series.find(s => 
          s.label === item.seriesName || 
          s.field === item.seriesName ||
          // Also check if any yField matches
          this.form.mapping.yFields?.includes(item.seriesName)
        );
        
        // Get decimals: series override -> yAxis default -> fallback to 2
        const decimals = seriesConfig?.decimals ?? this.form.yAxis.decimals ?? 2;
        const unit = seriesConfig?.unit || this.form.yAxis.unit || '';
        
        // Format value with proper decimals
        let value: string;
        if (typeof item.data === 'number') {
          value = item.data.toFixed(decimals);
        } else if (typeof item.data === 'string' && !isNaN(parseFloat(item.data))) {
          value = parseFloat(item.data).toFixed(decimals);
        } else {
          value = String(item.data);
        }
        
        html += `<div style="display:flex;justify-content:space-between;gap:20px">
          <span>${item.marker} ${item.seriesName}</span>
          <span style="font-weight:600">${value}${unit}</span>
        </div>`;
      }
    });
    
    return html;
  }

  /**
   * Format date based on pattern string
   */
  formatDateByPattern(date: Date, pattern: string): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    switch (pattern) {
      case 'HH:mm':
        return `${hours}:${minutes}`;
      case 'HH:mm:ss':
        return `${hours}:${minutes}:${seconds}`;
      case 'DD/MM':
        return `${day}/${month}`;
      case 'DD/MM HH:mm':
        return `${day}/${month} ${hours}:${minutes}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'YYYY-MM-DD HH:mm':
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      default:
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
  }

  // Format Y-axis value with unit and decimals
  formatYAxisValue(value: number): string {
    const decimals = this.form.yAxis.decimals ?? 2;
    const unit = this.form.yAxis.unit || '';
    
    // Handle large numbers with K/M suffix
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M${unit}`;
    } else if (Math.abs(value) >= 10000) {
      return `${(value / 1000).toFixed(decimals)}K${unit}`;
    }
    
    return `${value.toFixed(decimals)}${unit}`;
  }

  // Build threshold lines as markLine series
  buildThresholdSeries(): any[] {
    if (!this.form.thresholds || this.form.thresholds.length === 0) {
      return [];
    }

    // Create markLine data for thresholds
    const markLineData = this.form.thresholds.map(t => {
      // Get threshold value - either manual or from field
      let thresholdValue = t.value;
      
      if (t.mode === 'field' && t.field && this.queryResult?.rows.length) {
        // Get value from first row of query result (typically aggregated value)
        const fieldValue = this.queryResult.rows[0][t.field];
        thresholdValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(fieldValue) || 0;
      }
      
      return {
        name: t.label,
        yAxis: thresholdValue,
        lineStyle: {
          color: t.color,
          type: t.lineStyle,
          width: 2
        },
        label: {
          show: true,
          formatter: `${t.label}: ${thresholdValue.toFixed(1)}`,
          position: 'end',
          color: t.color
        }
      };
    });

    // Return a dummy series with markLine
    return [{
      type: 'line',
      data: [],
      markLine: {
        symbol: 'none',
        data: markLineData
      }
    }];
  }

  getColorByIndex(index: number): string {
    const colors = ['#73bf69', '#5794f2', '#ff9830', '#f2495c', '#b877d9', '#ff6eb4', '#4ec5d4'];
    return colors[index % colors.length];
  }

  /**
   * Get font size class for stat card preview
   */
  getStatFontSizeClass(): string {
    switch (this.form.display.statCardOptions.fontSize) {
      case 'small': return 'fs-4';
      case 'medium': return 'fs-2';
      case 'large': return 'fs-1';
      case 'xlarge': return 'display-4';
      default: return 'fs-1';
    }
  }

  /**
   * Get value color for stat card based on thresholds
   */
  getStatValueColor(value: number): string {
    if (!this.form.display.statCardOptions.thresholdColors || this.form.thresholds.length === 0) {
      return this.form.display.statCardOptions.valueColor || '#ffffff';
    }
    
    // Sort thresholds descending
    const sorted = [...this.form.thresholds].sort((a, b) => b.value - a.value);
    for (const t of sorted) {
      if (value >= t.value) {
        return t.color;
      }
    }
    
    return this.form.display.statCardOptions.valueColor || '#ffffff';
  }

  /**
   * Refresh form.series from current data based on seriesField or yFields.
   * Called when seriesField dropdown changes or after query execution.
   * Preserves existing user customizations (colors, labels, etc).
   */
  refreshSeriesFromData(): void {
    if (!this.queryResult || !this.queryResult.rows.length) return;
    const sf = this.form.mapping.seriesField;
    const data = this.queryResult.rows;

    if (sf && data.some(d => d[sf])) {
      // SeriesField grouping mode: populate from unique seriesField values
      const uniqueValues = [...new Set(data.map(d => d[sf]).filter(Boolean))] as string[];
      const existingSeries = [...this.form.series];
      this.form.series = uniqueValues.map((val, idx) => {
        // Preserve existing override if user already customized this series
        const existing = existingSeries.find(s => s.field === val);
        if (existing) return existing;
        // Multi-query _source: use per-query color
        let color = this.seriesColors[idx % this.seriesColors.length];
        if (sf === '_source' && this.queries.length > 1) {
          const matchingQuery = this.queries.find(q => q.alias === val || q.name === val);
          if (matchingQuery?.color) color = matchingQuery.color;
        }
        return {
          field: val,
          label: val,
          color,
          unit: '',
          decimals: 2,
          visible: true
        };
      });
    } else {
      // No seriesField: populate from yFields (multi-column mode)
      const yFields = this.form.mapping.yFields || [];
      if (yFields.length > 0) {
        const existingSeries = [...this.form.series];
        this.form.series = yFields.map((field, idx) => {
          const existing = existingSeries.find(s => s.field === field);
          if (existing) return existing;
          return {
            field,
            label: field,
            color: this.seriesColors[idx % this.seriesColors.length],
            unit: '',
            decimals: 2,
            visible: true
          };
        });
      }
    }
    this.updatePreview();
  }

  // Validation
  canSave(): boolean {
    return this.form.title.length > 0 && 
           this.form.sql.length > 0 && 
           this.isValidSelectQuery() &&
           this.queryResult !== null &&
           this.isMappingValid();
  }

  isMappingValid(): boolean {
    const { xField, yField, valueField, labelField } = this.form.mapping;
    const yFields = this.form.mapping.yFields;
    
    switch (this.selectedType) {
      case 'line-chart':
      case 'multi-line-chart':
      case 'bar-chart':
        // Valid if has xField AND (yField OR at least one yField)
        return !!xField && (!!yField || (yFields && yFields.length > 0));
      case 'gauge':
      case 'stat-card':
        return !!valueField;
      case 'pie-chart':
        return !!labelField && !!valueField;
      case 'table':
        return true;
      default:
        return false;
    }
  }

  // ============================================
  // TABLE WIDGET HELPERS
  // ============================================

  getTableColumns(): string[] {
    if (!this.queryResult?.rows?.length) return [];
    return Object.keys(this.queryResult.rows[0]);
  }

  autoGenerateTableColumns(): void {
    const columns = this.getTableColumns();
    this.form.display.tableOptions.columns = columns.map(field => this.generateColumnConfig(field));
  }

  private generateColumnConfig(field: string): any {
    const lowerField = field.toLowerCase();
    
    let type: 'text' | 'number' | 'date' | 'status' | 'badge' = 'text';
    let decimals = 0;
    let unit = '';
    let dateFormat = 'DD/MM/YYYY HH:mm';
    let statusMap: { value: string; label: string; color: string }[] = [];

    // Detect type from field name
    if (lowerField.includes('time') || lowerField.includes('date') || lowerField === 'ts' || lowerField === 'timestamp') {
      type = 'date';
    } else if (lowerField.includes('status') || lowerField.includes('state')) {
      type = 'status';
      statusMap = [
        { value: 'Normal', label: 'Normal', color: 'success' },
        { value: 'OK', label: 'OK', color: 'success' },
        { value: 'Online', label: 'Online', color: 'success' },
        { value: 'Warning', label: 'Warning', color: 'warning' },
        { value: 'Offline', label: 'Offline', color: 'danger' },
        { value: 'Critical', label: 'Critical', color: 'danger' },
        { value: 'Error', label: 'Error', color: 'danger' },
      ];
    } else if (lowerField.includes('value') || lowerField.includes('avg') || 
               lowerField.includes('min') || lowerField.includes('max') ||
               lowerField.includes('count') || lowerField.includes('sum') ||
               lowerField.includes('tekanan') || lowerField.includes('flow') ||
               lowerField.includes('pressure') || lowerField.includes('temperature')) {
      type = 'number';
      decimals = 2;
    }

    // Detect unit from field name
    if (lowerField.includes('tekanan') || lowerField.includes('pressure')) {
      unit = 'bar';
    } else if (lowerField.includes('flow')) {
      unit = 'm³/h';
    } else if (lowerField.includes('temp')) {
      unit = '°C';
    }

    return {
      field,
      displayName: this.formatFieldName(field),
      align: type === 'number' ? 'right' : 'left',
      width: 'auto',
      visible: true,
      type,
      decimals,
      unit,
      dateFormat,
      thresholds: [],
      statusMap
    };
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatCellValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' && value.length > 30) {
      return value.substring(0, 30) + '...';
    }
    if (typeof value === 'string' && value.includes('T')) {
      try {
        return new Date(value).toLocaleString('id-ID');
      } catch {
        return value;
      }
    }
    return String(value);
  }

  formatNumberCell(value: any, decimals: number = 2, unit: string = ''): string {
    if (value === null || value === undefined) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    const formatted = num.toFixed(decimals);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  formatDateCell(value: any, format: string = 'DD/MM/YYYY HH:mm'): string {
    if (value === null || value === undefined) return '-';
    try {
      const date = new Date(value);
      const pad = (n: number) => n.toString().padStart(2, '0');
      
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      const seconds = pad(date.getSeconds());

      return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    } catch {
      return String(value);
    }
  }

  getStatusBadgeClass(value: any): string {
    if (value === null || value === undefined) return 'bg-secondary';
    const lower = String(value).toLowerCase();
    if (lower === 'normal' || lower === 'ok' || lower === 'online' || lower === 'active') {
      return 'bg-success';
    }
    if (lower === 'warning' || lower === 'warn') {
      return 'bg-warning text-dark';
    }
    if (lower === 'critical' || lower === 'error' || lower === 'offline' || lower === 'fail') {
      return 'bg-danger';
    }
    return 'bg-secondary';
  }

  saveWidget(): void {
    if (!this.canSave()) return;

    // Sync current SQL editor to active query
    this.syncFormToActiveQuery();

    // Build widget config for DB storage
    const widgetConfig: any = {
      title: this.form.title,
      description: this.form.description,
      // Data source (postgresql or clickhouse) — first query's source for backward compat
      dataSource: this.queries.length > 0 ? this.queries[0].dataSource : this.selectedDataSource,
      // Field mapping for data binding
      mapping: this.form.mapping,
      // Series configuration (multi-line)
      series: this.form.series,
      // X-Axis configuration
      xAxis: this.form.xAxis,
      // Y-Axis configuration
      yAxis: this.form.yAxis,
      // Thresholds
      thresholds: this.form.thresholds,
      // Display options
      display: this.form.display,
      // Time range
      timeRange: this.form.timeRange
    };

    // Save multi-query definitions if more than 1 query
    if (this.queries.length > 1) {
      widgetConfig.queries = this.queries.map(q => ({
        id: q.id,
        name: q.name,
        alias: q.alias,
        sql: q.sql,
        dataSource: q.dataSource,
        enabled: q.enabled,
        color: q.color
      }));
    }

    // Primary SQL: first query's SQL for backward compat
    const primarySql = this.queries.length > 0 ? this.queries[0].sql : this.form.sql;

    if (this.isEditMode && this.widgetId) {
      // Update existing widget
      this.widgetBuilderService.widgetBuilderControllerUpdateWidget({
        dashboardId: this.dashboardId,
        widgetId: this.widgetId,
        body: {
          name: this.form.name,
          widgetType: this.selectedType,
          sqlQuery: primarySql,
          config: widgetConfig
        }
      }).subscribe({
        next: () => {
          console.log('Widget updated successfully');
          this.router.navigate(['/iot/widget-builder', this.dashboardId]);
        },
        error: (err: any) => {
          console.error('Failed to update widget:', err);
          alert('Failed to update widget: ' + (err.error?.message || err.message));
        }
      });
    } else {
      // Create new widget
      this.widgetBuilderService.widgetBuilderControllerCreateWidget({
        dashboardId: this.dashboardId,
        body: {
          name: this.form.name,
          widgetType: this.selectedType,
          sqlQuery: primarySql,
          config: widgetConfig,
          positionX: 0,
          positionY: 0,
          cols: 6,
          rows: 4
        }
      }).subscribe({
        next: () => {
          console.log('Widget created successfully');
          this.router.navigate(['/iot/widget-builder', this.dashboardId]);
        },
        error: (err: any) => {
          console.error('Failed to create widget:', err);
          alert('Failed to create widget: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/iot/widget-builder', this.dashboardId]);
  }

  needsXYMapping(): boolean {
    return ['line-chart', 'multi-line-chart', 'bar-chart'].includes(this.selectedType);
  }

  needsValueMapping(): boolean {
    return ['gauge', 'stat-card'].includes(this.selectedType);
  }

  needsLabelValueMapping(): boolean {
    return this.selectedType === 'pie-chart';
  }

  // ========== Grafana-style Time Picker Methods ==========
  
  toggleTimePicker(): void {
    this.timePickerOpen = !this.timePickerOpen;
    if (this.timePickerOpen) {
      this.quickRangeSearch = '';
      this.updateTimePickerPosition();
    }
  }
  
  updateTimePickerPosition(): void {
    setTimeout(() => {
      if (this.timePickerBtn?.nativeElement) {
        const rect = this.timePickerBtn.nativeElement.getBoundingClientRect();
        const dropdownWidth = 560;
        const rightPos = window.innerWidth - rect.right;
        
        this.timePickerDropdownStyle = {
          'top': (rect.bottom + 4) + 'px',
          'right': rightPos + 'px'
        };
      }
    });
  }

  closeTimePicker(): void {
    this.timePickerOpen = false;
  }

  get filteredQuickRanges() {
    if (!this.quickRangeSearch) {
      return this.timeRangePresets;
    }
    const search = this.quickRangeSearch.toLowerCase();
    return this.timeRangePresets.filter(p => 
      p.label.toLowerCase().includes(search) || 
      p.value.toLowerCase().includes(search)
    );
  }

  selectQuickRange(preset: { label: string; value: string; duration: number }): void {
    this.selectedTimeRange = preset.value;
    this.absoluteTimeFrom = 'now-' + preset.value;
    this.absoluteTimeTo = 'now';
    this.timeFrom = Date.now() - preset.duration;
    this.timeTo = Date.now();
    this.form.timeRange = preset.value as any; // Update form timeRange too
    this.closeTimePicker();
    this.testQuery(); // Auto-refresh query with new time range
  }

  applyAbsoluteTimeRange(): void {
    const from = this.parseRelativeTime(this.absoluteTimeFrom);
    const to = this.parseRelativeTime(this.absoluteTimeTo);
    
    if (from && to) {
      this.selectedTimeRange = 'custom';
      this.timeFrom = from.getTime();
      this.timeTo = to.getTime();
      this.closeTimePicker();
      this.testQuery();
    }
  }

  parseRelativeTime(input: string): Date | null {
    const now = new Date();
    
    if (input === 'now') {
      return now;
    }
    
    const relativeMatch = input.match(/^now-(\d+)(m|h|d|w|M|y)$/);
    if (relativeMatch) {
      const value = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2];
      const multipliers: { [key: string]: number } = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'M': 30 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000,
      };
      return new Date(now.getTime() - value * multipliers[unit]);
    }
    
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  formatRelativeTime(): string {
    if (this.selectedTimeRange !== 'custom') {
      const preset = this.timeRangePresets.find(p => p.value === this.selectedTimeRange);
      return preset ? preset.label : 'Select time range';
    }
    return `${this.absoluteTimeFrom} to ${this.absoluteTimeTo}`;
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

  // ========== Calendar Methods ==========
  
  toggleCalendar(target: 'from' | 'to'): void {
    if (this.activeCalendar === target) {
      this.activeCalendar = null;
    } else {
      this.activeCalendar = target;
      const date = target === 'from' ? new Date(this.timeFrom) : new Date(this.timeTo);
      if (target === 'from') {
        this.fromCalendarDate = new Date(date);
        this.fromSelectedDate = new Date(date);
        this.fromTime = date.toTimeString().slice(0, 8);
      } else {
        this.toCalendarDate = new Date(date);
        this.toSelectedDate = new Date(date);
        this.toTime = date.toTimeString().slice(0, 8);
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
      this.fromCalendarDate = new Date(this.fromCalendarDate.getFullYear(), this.fromCalendarDate.getMonth() - 1, 1);
    } else {
      this.toCalendarDate = new Date(this.toCalendarDate.getFullYear(), this.toCalendarDate.getMonth() - 1, 1);
    }
  }

  nextMonth(target: 'from' | 'to'): void {
    if (target === 'from') {
      this.fromCalendarDate = new Date(this.fromCalendarDate.getFullYear(), this.fromCalendarDate.getMonth() + 1, 1);
    } else {
      this.toCalendarDate = new Date(this.toCalendarDate.getFullYear(), this.toCalendarDate.getMonth() + 1, 1);
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
    
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ day: date.getDate(), date, otherMonth: true, isToday: false, isSelected: false });
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
      days.push({ day: d, date, otherMonth: false, isToday, isSelected });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ day: i, date, otherMonth: true, isToday: false, isSelected: false });
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
      
      const isoStr = finalDate.toISOString().slice(0, 19).replace('T', ' ');
      
      if (target === 'from') {
        this.absoluteTimeFrom = isoStr;
      } else {
        this.absoluteTimeTo = isoStr;
      }
    }
    
    this.activeCalendar = null;
  }
}
