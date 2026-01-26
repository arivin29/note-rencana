import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  Widget, WidgetType,
  QueryResult
} from '../models/widget.models';
import { WidgetBuilderService } from '../../../../../sdk/core/services/widget-builder.service';
import { ExecuteQueryResponseDto, ValidateQueryResponseDto } from '../../../../../sdk/core/models';

@Component({
  selector: 'app-widget-wizard',
  standalone: false,
  templateUrl: './widget-wizard.component.html',
  styleUrls: ['./widget-wizard.component.css']
})
export class WidgetWizardComponent implements OnInit {
  dashboardId: string = '';
  widgetId: string | null = null;
  isEditMode = false;

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
    pieLegend: true
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
      timeFormat: 'HH:mm' as 'HH:mm' | 'HH:mm:ss' | 'DD/MM' | 'DD/MM HH:mm' | 'YYYY-MM-DD',
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
    }
  };

  // Color palette for series
  seriesColors = [
    '#73bf69', '#5794f2', '#ff9830', '#f2495c', 
    '#b877d9', '#ff6eb4', '#4ec5d4', '#fade2a'
  ];

  // Unit presets for quick selection
  unitPresets = [
    { label: 'None', value: '' },
    { label: '°C (Celsius)', value: '°C' },
    { label: '°F (Fahrenheit)', value: '°F' },
    { label: '% (Percent)', value: '%' },
    { label: 'hPa (Pressure)', value: 'hPa' },
    { label: 'ppm', value: 'ppm' },
    { label: 'V (Volt)', value: 'V' },
    { label: 'A (Ampere)', value: 'A' },
    { label: 'W (Watt)', value: 'W' },
    { label: 'kWh', value: 'kWh' },
    { label: 'Hz', value: 'Hz' },
    { label: 'm/s', value: 'm/s' },
    { label: 'Custom...', value: 'custom' }
  ];

  // Time format options
  timeFormatOptions = [
    { label: 'HH:mm', value: 'HH:mm', example: '14:30' },
    { label: 'HH:mm:ss', value: 'HH:mm:ss', example: '14:30:45' },
    { label: 'DD/MM', value: 'DD/MM', example: '26/01' },
    { label: 'DD/MM HH:mm', value: 'DD/MM HH:mm', example: '26/01 14:30' },
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD', example: '2026-01-26' },
  ];

  // Time Range Presets for data filtering
  timeRangePresets = [
    { label: 'Last 15 minutes', value: '15m' },
    { label: 'Last 30 minutes', value: '30m' },
    { label: 'Last 1 hour', value: '1h' },
    { label: 'Last 3 hours', value: '3h' },
    { label: 'Last 6 hours', value: '6h' },
    { label: 'Last 12 hours', value: '12h' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
  ];
  selectedTimeRange = '6h';

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
    { type: 'line-chart', label: 'Time Series', icon: 'fa-chart-line', description: 'Time based line, area and bar charts' },
    { type: 'multi-line-chart', label: 'Multi-Line Chart', icon: 'fa-chart-area', description: 'Compare multiple series over time' },
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
  // Variables: ${ownerId} - current user's owner, ${timeRange} - selected time range (e.g., '6 hours')
  sqlTemplates = [
    {
      name: 'Time Series (Single)',
      sql: `SELECT 
  sl.ts AS timestamp,
  sl.value_engineered AS value
FROM sensor_logs sl
WHERE sl.id_owner = '\${ownerId}'
  AND sl.ts >= NOW() - INTERVAL '\${timeRange}'
ORDER BY sl.ts ASC
LIMIT 1000`
    },
    {
      name: 'Hourly Average',
      sql: `SELECT 
  DATE_TRUNC('hour', sl.ts) AS timestamp,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS value
FROM sensor_logs sl
WHERE sl.id_owner = '\${ownerId}'
  AND sl.ts >= NOW() - INTERVAL '\${timeRange}'
GROUP BY DATE_TRUNC('hour', sl.ts)
ORDER BY timestamp ASC`
    },
    {
      name: 'Multi-Series by Metric',
      sql: `SELECT 
  DATE_TRUNC('hour', sl.ts) AS timestamp,
  sc.metric_code,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.id_owner = '\${ownerId}'
  AND sl.ts >= NOW() - INTERVAL '\${timeRange}'
GROUP BY DATE_TRUNC('hour', sl.ts), sc.metric_code
ORDER BY timestamp`
    },
    {
      name: 'Latest Sensor Values',
      sql: `SELECT DISTINCT ON (sc.id_sensor_channel)
  s.label AS sensor_name,
  sc.metric_code,
  sl.value_engineered AS value,
  sc.unit,
  sl.ts AS timestamp
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
WHERE sl.id_owner = '\${ownerId}'
  AND sl.ts >= NOW() - INTERVAL '1 hour'
ORDER BY sc.id_sensor_channel, sl.ts DESC`
    },
    {
      name: 'Current Value (Gauge)',
      sql: `SELECT 
  sl.value_engineered AS value,
  sc.unit,
  sc.min_threshold,
  sc.max_threshold
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.id_owner = '\${ownerId}'
ORDER BY sl.ts DESC
LIMIT 1`
    },
    {
      name: 'Node Status Count',
      sql: `SELECT 
  COALESCE(connectivity_status, 'unknown') AS status,
  COUNT(*) AS count
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = '\${ownerId}'
GROUP BY connectivity_status`
    },
    {
      name: 'Average by Sensor',
      sql: `SELECT 
  s.label AS sensor_name,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS avg_value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
WHERE sl.id_owner = '\${ownerId}'
  AND sl.ts >= NOW() - INTERVAL '\${timeRange}'
GROUP BY s.label
ORDER BY avg_value DESC`
    },
    {
      name: 'Stats Summary',
      sql: `SELECT 
  COUNT(*) AS total_readings,
  ROUND(AVG(sl.value_engineered)::numeric, 2) AS avg_value,
  ROUND(MAX(sl.value_engineered)::numeric, 2) AS max_value,
  ROUND(MIN(sl.value_engineered)::numeric, 2) AS min_value
FROM sensor_logs sl
WHERE sl.id_owner = '\${ownerId}'
  AND sl.ts >= NOW() - INTERVAL '\${timeRange}'`
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private widgetBuilderService: WidgetBuilderService
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
    
    if (this.isEditMode) {
      this.loadWidget();
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

  // Get numeric columns for Y-axis selection
  getNumericColumns(): string[] {
    if (!this.queryResult || !this.queryResult.rows.length) return [];
    
    const firstRow = this.queryResult.rows[0];
    return Object.keys(firstRow).filter(key => {
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
              timeFormat: config.xAxis.timeFormat || 'HH:mm'
            };
          }
          
          // Y-Axis - use values from DB, only use default if truly undefined
          if (config.yAxis) {
            this.form.yAxis = {
              label: config.yAxis.label || '',
              unit: config.yAxis.unit || '',
              decimals: config.yAxis.decimals ?? 2, // Default 2 if not in DB
              min: config.yAxis.min ?? null,
              max: config.yAxis.max ?? null,
              scale: config.yAxis.scale || 'linear',
              placement: config.yAxis.placement || 'left',
              showGrid: config.yAxis.showGrid || 'auto'
            };
          }
          
          // Thresholds
          if (config.thresholds && Array.isArray(config.thresholds)) {
            this.form.thresholds = config.thresholds;
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
              tooltipMode: config.display.tooltipMode || 'all'
            };
          }
          
          // Time range
          if (config.timeRange) {
            this.form.timeRange = config.timeRange;
            this.selectedTimeRange = config.timeRange;
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

  applySqlTemplate(template: { name: string; sql: string }): void {
    this.form.sql = template.sql;
  }

  testQuery(): void {
    // Validate SQL first
    if (!this.isValidSelectQuery()) {
      this.queryError = this.getSqlValidationError() || 'Invalid SQL query';
      return;
    }

    this.queryLoading = true;
    this.queryError = null;
    this.queryResult = null;

    // Execute query via API
    this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
      body: {
        sql: this.form.sql,
        timeRange: this.form.timeRange as any,
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
    
    const timestampField = columns.find(c => 
      c.toLowerCase().includes('timestamp') || 
      c.toLowerCase().includes('time') ||
      c.toLowerCase() === 'ts'
    );
    
    const valueField = columns.find(c => 
      c.toLowerCase().includes('value') ||
      c.toLowerCase().includes('avg') ||
      c.toLowerCase().includes('sum')
    );
    
    const labelField = columns.find(c => 
      c.toLowerCase().includes('name') ||
      c.toLowerCase().includes('label') ||
      c.toLowerCase().includes('category')
    );

    const seriesField = columns.find(c => 
      c.toLowerCase().includes('series') ||
      c.toLowerCase().includes('metric') ||
      c.toLowerCase().includes('sensor')
    );

    switch (this.selectedType) {
      case 'line-chart':
      case 'multi-line-chart':
        this.form.mapping.xField = timestampField || columns[0];
        this.form.mapping.yField = valueField || columns[1];
        this.form.mapping.seriesField = seriesField || '';
        
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
          this.form.series = selectedFields.map((field, idx) => ({
            field,
            label: field,
            color: this.seriesColors[idx % this.seriesColors.length],
            unit: '',
            decimals: 2, // Default 2
            visible: true
          }));
        }
        break;
      case 'bar-chart':
        this.form.mapping.xField = labelField || columns[0];
        this.form.mapping.yField = valueField || columns[1];
        break;
      case 'pie-chart':
        this.form.mapping.labelField = labelField || columns[0];
        this.form.mapping.valueField = valueField || columns[1];
        break;
      case 'gauge':
      case 'stat-card':
        this.form.mapping.valueField = valueField || columns[0];
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
        return this.buildLineChartOptions(data);
        
      case 'bar-chart':
        return {
          tooltip: { trigger: 'axis' },
          grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
          xAxis: {
            type: 'category',
            data: data.map(d => d[this.form.mapping.xField]),
            axisLabel: { color: 'rgba(255,255,255,0.6)' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }
          },
          yAxis: { 
            type: 'value',
            axisLabel: { color: 'rgba(255,255,255,0.6)' },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
          },
          series: [{
            type: 'bar',
            data: data.map(d => d[this.form.mapping.yField]),
            itemStyle: { 
              borderRadius: [4, 4, 0, 0],
              color: '#73bf69'
            }
          }]
        };
        
      case 'gauge':
        const gaugeValue = data[0]?.[this.form.mapping.valueField] || 0;
        return {
          series: [{
            type: 'gauge',
            radius: '90%',
            startAngle: 180,
            endAngle: 0,
            min: 0,
            max: 100,
            progress: { show: true, width: 18, itemStyle: { color: '#73bf69' } },
            axisLine: { lineStyle: { width: 18, color: [[1, 'rgba(255,255,255,0.1)']] } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            pointer: { show: false },
            detail: { 
              valueAnimation: true, 
              fontSize: 36,
              fontWeight: 'bold',
              color: '#fff',
              offsetCenter: [0, '0%'],
              formatter: '{value}%'
            },
            data: [{ value: gaugeValue }]
          }]
        };
        
      case 'pie-chart':
        return {
          tooltip: { trigger: 'item' },
          legend: { 
            show: this.form.display.showLegend, 
            orient: 'vertical', 
            right: 10,
            top: 'center',
            textStyle: { color: 'rgba(255,255,255,0.8)' }
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
        return {
          value: data[0]?.[this.form.mapping.valueField] || 0,
          title: this.form.title || 'Value'
        };
        
      default:
        return null;
    }
  }

  buildLineChartOptions(data: any[]): any {
    const { xField, yField, yFields, seriesField } = this.form.mapping;
    const { showLegend, lineStyle, lineWidth, fillOpacity, showPoints } = this.form.display;
    const yAxisConfig = this.form.yAxis;

    // Time format helper
    const formatXValue = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string' && val.includes('T')) {
        const date = new Date(val);
        switch (this.form.xAxis.timeFormat) {
          case 'HH:mm:ss': return date.toLocaleTimeString('id-ID');
          case 'DD/MM': return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
          case 'DD/MM HH:mm': return `${date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
          case 'YYYY-MM-DD': return date.toISOString().split('T')[0];
          default: return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        }
      }
      return val;
    };

    const baseConfig = {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderColor: 'rgba(255,255,255,0.2)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => this.formatTooltip(params)
      },
      legend: { 
        show: showLegend,
        textStyle: { color: 'rgba(255,255,255,0.8)' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: showLegend ? '15%' : '10%', containLabel: true },
      xAxis: {
        type: 'category',
        name: this.form.xAxis.label || '',
        boundaryGap: false,
        axisLabel: { color: 'rgba(255,255,255,0.6)' },
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

    // Multi-series by field (seriesField) - grouping data by series column
    if (seriesField && data.some(d => d[seriesField])) {
      const seriesMap = new Map<string, any[]>();
      data.forEach(d => {
        const key = d[seriesField];
        if (!seriesMap.has(key)) seriesMap.set(key, []);
        seriesMap.get(key)!.push(d);
      });

      const uniqueXValues = [...new Set(data.map(d => d[xField]))];
      
      series = Array.from(seriesMap.entries()).map(([name, seriesData], idx) => ({
        name,
        type: 'line',
        smooth: lineStyle === 'smooth',
        step: lineStyle === 'step' ? 'middle' : false,
        lineStyle: { width: lineWidth },
        showSymbol: showPoints === 'always',
        areaStyle: fillOpacity > 0 ? { opacity: fillOpacity / 100 } : undefined,
        itemStyle: { color: this.getColorByIndex(idx) },
        data: uniqueXValues.map(x => {
          const point = seriesData.find(d => d[xField] === x);
          return point ? point[yField] : null;
        })
      }));

      return {
        ...baseConfig,
        xAxis: { ...baseConfig.xAxis, data: uniqueXValues.map(formatXValue) },
        series: [...series, ...this.buildThresholdSeries()]
      };
    }

    // Multi-line from multiple Y fields (yFields) with series config
    if (yFields && yFields.length > 0) {
      series = yFields.map((field, idx) => {
        const seriesConfig = this.form.series.find(s => s.field === field);
        const color = seriesConfig?.color || this.seriesColors[idx % this.seriesColors.length];
        const label = seriesConfig?.label || field;
        
        return {
          name: label,
          type: 'line',
          smooth: lineStyle === 'smooth',
          step: lineStyle === 'step' ? 'middle' : false,
          lineStyle: { width: lineWidth, color },
          showSymbol: showPoints === 'always',
          areaStyle: fillOpacity > 0 ? { opacity: fillOpacity / 100, color } : undefined,
          itemStyle: { color },
          data: data.map(d => d[field])
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
      series = [{
        name: yField,
        type: 'line',
        smooth: lineStyle === 'smooth',
        step: lineStyle === 'step' ? 'middle' : false,
        lineStyle: { width: lineWidth, color: '#73bf69' },
        showSymbol: showPoints === 'always',
        areaStyle: fillOpacity > 0 ? { opacity: fillOpacity / 100, color: '#73bf69' } : undefined,
        itemStyle: { color: '#73bf69' },
        data: data.map(d => d[yField])
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
    
    let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue || ''}</div>`;
    
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

  saveWidget(): void {
    if (!this.canSave()) return;

    // Build widget config for DB storage
    const widgetConfig = {
      title: this.form.title,
      description: this.form.description,
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

    if (this.isEditMode && this.widgetId) {
      // Update existing widget
      this.widgetBuilderService.widgetBuilderControllerUpdateWidget({
        dashboardId: this.dashboardId,
        widgetId: this.widgetId,
        body: {
          name: this.form.name,
          widgetType: this.selectedType,
          sqlQuery: this.form.sql,
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
          sqlQuery: this.form.sql,
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
}
