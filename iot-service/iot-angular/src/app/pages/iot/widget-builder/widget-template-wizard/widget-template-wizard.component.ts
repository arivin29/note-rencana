import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { 
  TEMPLATE_CATEGORIES, 
  TemplateCategory, 
  WidgetTemplate, 
  TemplateOption,
  getTemplateById,
  getTemplatesByCategory
} from '../models/template.models';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../sdk/core/services/sensors.service';
import { SensorChannelsService } from '../../../../../sdk/core/services/sensor-channels.service';
import { WidgetBuilderService } from '../../../../../sdk/core/services/widget-builder.service';
import { NodeDetailedResponseDto } from '../../../../../sdk/core/models/node-detailed-response-dto';
import { SensorResponseDto } from '../../../../../sdk/core/models/sensor-response-dto';
import { SensorChannelResponseDto } from '../../../../../sdk/core/models/sensor-channel-response-dto';

@Component({
  selector: 'app-widget-template-wizard',
  standalone: false,
  templateUrl: './widget-template-wizard.component.html',
  styleUrls: ['./widget-template-wizard.component.scss']
})
export class WidgetTemplateWizardComponent implements OnInit, OnDestroy {
  // Route params
  dashboardId: string = '';
  widgetId: string | null = null;
  isEditMode = false;
  
  // Wizard state
  currentStep = 1;
  totalSteps = 4;
  loading = false;
  saving = false;
  
  // Steps definition for progress bar
  steps = [
    { label: 'Template', icon: 'fa-layer-group' },
    { label: 'Data Source', icon: 'fa-database' },
    { label: 'Configure', icon: 'fa-sliders-h' },
    { label: 'Preview & Save', icon: 'fa-eye' }
  ];
  
  // Step 1: Category & Template Selection
  categories: TemplateCategory[] = TEMPLATE_CATEGORIES;
  selectedCategoryId: string = '';
  selectedTemplate: WidgetTemplate | null = null;
  
  // Step 2: Data Source Selection (Cascade Filters)
  nodes: NodeDetailedResponseDto[] = [];
  sensors: SensorResponseDto[] = [];
  channels: SensorChannelResponseDto[] = [];
  
  selectedNodeId: string = '';
  selectedSensorId: string = '';
  selectedChannelId: string = '';
  selectedChannelIds: string[] = []; // For multi-channel templates
  
  // Step 3: Template Configuration
  templateSettings: Record<string, any> = {};
  
  // Step 4: Preview & Save
  widgetName: string = '';
  widgetDescription: string = '';
  generatedSql: string = '';
  previewData: any[] = [];
  previewLoading = false;
  previewOptions: any = null; // ECharts options for preview
  previewError: string = '';
  
  // Time range for preview
  previewTimeRange: string = '24h';
  previewTimeRangeOptions = [
    { label: 'Last 1 Hour', value: '1h' },
    { label: 'Last 6 Hours', value: '6h' },
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
  ];
  
  // Data source selection
  selectedDataSource: 'postgresql' | 'clickhouse' = 'postgresql';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private nodesService: NodesService,
    private sensorsService: SensorsService,
    private sensorChannelsService: SensorChannelsService,
    private widgetBuilderService: WidgetBuilderService
  ) {}
  
  // Sanitize SVG for safe rendering
  getSafeHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }
  
  ngOnInit(): void {
    this.dashboardId = this.route.snapshot.paramMap.get('id') || '';
    this.widgetId = this.route.snapshot.paramMap.get('widgetId') || null;
    this.isEditMode = !!this.widgetId;
    
    // Check for pre-selected category from query params
    const categoryParam = this.route.snapshot.queryParamMap.get('category');
    if (categoryParam) {
      this.selectedCategoryId = categoryParam;
    }
    
    // Restore wizard state from localStorage
    this.restoreWizardState();
    
    // Load nodes for data source selection
    this.loadNodes();
    
    // If edit mode, load existing widget
    if (this.isEditMode && this.widgetId) {
      this.loadExistingWidget();
    }
  }
  
  ngOnDestroy(): void {
    // Save state on destroy (navigation away)
    this.saveWizardState();
  }
  
  // ============================================
  // LOCALSTORAGE PERSISTENCE
  // ============================================
  
  private get storageKey(): string {
    return `widget-wizard-${this.dashboardId}`;
  }
  
  private saveWizardState(): void {
    const state = {
      currentStep: this.currentStep,
      selectedCategoryId: this.selectedCategoryId,
      selectedTemplateId: this.selectedTemplate?.id || '',
      selectedDataSource: this.selectedDataSource,
      selectedNodeId: this.selectedNodeId,
      selectedSensorId: this.selectedSensorId,
      selectedChannelId: this.selectedChannelId,
      selectedChannelIds: this.selectedChannelIds,
      templateSettings: this.templateSettings,
      widgetName: this.widgetName,
      widgetDescription: this.widgetDescription,
      previewTimeRange: this.previewTimeRange,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  private restoreWizardState(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return;
      
      const state = JSON.parse(saved);
      
      // Only restore if saved less than 24 hours ago
      if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(this.storageKey);
        return;
      }
      
      // Restore template selection
      if (state.selectedCategoryId) {
        this.selectedCategoryId = state.selectedCategoryId;
      }
      if (state.selectedTemplateId) {
        const template = getTemplateById(state.selectedTemplateId);
        if (template) {
          this.selectedTemplate = template;
        }
      }
      
      // Restore data source selections
      if (state.selectedDataSource) this.selectedDataSource = state.selectedDataSource;
      if (state.selectedNodeId) this.selectedNodeId = state.selectedNodeId;
      if (state.selectedSensorId) this.selectedSensorId = state.selectedSensorId;
      if (state.selectedChannelId) this.selectedChannelId = state.selectedChannelId;
      if (state.selectedChannelIds) this.selectedChannelIds = state.selectedChannelIds;
      if (state.templateSettings) this.templateSettings = state.templateSettings;
      if (state.widgetName) this.widgetName = state.widgetName;
      if (state.widgetDescription) this.widgetDescription = state.widgetDescription;
      if (state.previewTimeRange) this.previewTimeRange = state.previewTimeRange;
      
      // Restore step (but only advance forward, not back to start)
      if (state.currentStep > 1) {
        this.currentStep = state.currentStep;
      }
      
      // Reload dependent data if node/sensor were selected
      if (this.selectedNodeId) {
        this.loadSensorsForRestore();
      }
    } catch (e) {
      // If corrupted, just clear it
      localStorage.removeItem(this.storageKey);
    }
  }
  
  private loadSensorsForRestore(): void {
    this.sensorsService.sensorsControllerFindAll$Response({
      page: 1,
      limit: 1000,
      idNode: this.selectedNodeId
    }).subscribe({
      next: (response) => {
        let body: any = response.body;
        if (typeof body === 'string') body = JSON.parse(body);
        this.sensors = body?.data || [];
        
        // Now load channels if sensor was selected
        if (this.selectedSensorId) {
          this.loadChannelsForRestore();
        }
      }
    });
  }
  
  private loadChannelsForRestore(): void {
    this.sensorChannelsService.sensorChannelsControllerFindAll$Response({
      page: 1,
      limit: 1000,
      idSensor: this.selectedSensorId
    }).subscribe({
      next: (response) => {
        let body: any = response.body;
        if (typeof body === 'string') body = JSON.parse(body);
        this.channels = body?.data || [];
      }
    });
  }
  
  clearWizardState(): void {
    localStorage.removeItem(this.storageKey);
  }
  
  // ============================================
  // STEP NAVIGATION
  // ============================================
  
  get canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedTemplate;
      case 2:
        return this.isDataSelectionValid();
      case 3:
        return true; // Options are optional
      case 4:
        return !!this.widgetName.trim();
      default:
        return false;
    }
  }
  
  nextStep(): void {
    if (this.canProceed && this.currentStep < this.totalSteps) {
      this.currentStep++;
      
      // Generate SQL when entering preview step
      if (this.currentStep === 4) {
        this.generateSqlPreview();
      }
      
      this.saveWizardState();
    }
  }
  
  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.saveWizardState();
    }
  }
  
  goToStep(step: number): void {
    if (step <= this.currentStep || this.canProceed) {
      this.currentStep = step;
    }
  }
  
  // ============================================
  // STEP 1: TEMPLATE SELECTION
  // ============================================
  
  get selectedCategory(): TemplateCategory | null {
    return this.categories.find(c => c.id === this.selectedCategoryId) || null;
  }
  
  get availableTemplates(): WidgetTemplate[] {
    if (!this.selectedCategoryId) return [];
    return getTemplatesByCategory(this.selectedCategoryId);
  }
  
  selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.selectedTemplate = null;
  }
  
  selectTemplate(template: WidgetTemplate): void {
    this.selectedTemplate = template;
    
    // Initialize template settings with defaults
    this.templateSettings = {};
    template.options.forEach(opt => {
      this.templateSettings[opt.key] = opt.defaultValue;
    });
    
    // Auto-generate widget name
    this.widgetName = template.name;
    this.saveWizardState();
  }
  
  // ============================================
  // STEP 2: DATA SOURCE SELECTION
  // ============================================
  
  async loadNodes(): Promise<void> {
    this.nodesService.nodesControllerFindAll$Response({
      page: 1,
      limit: 1000
    }).subscribe({
      next: (response) => {
        let body: any = response.body;
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        this.nodes = body?.data || [];
        console.log('Loaded nodes:', this.nodes.length);
      },
      error: (err) => console.error('Error loading nodes:', err)
    });
  }
  
  onNodeChange(): void {
    this.selectedSensorId = '';
    this.selectedChannelId = '';
    this.selectedChannelIds = [];
    this.sensors = [];
    this.channels = [];
    
    // Guard: only call API if nodeId is valid
    if (!this.selectedNodeId || this.selectedNodeId === '' || this.selectedNodeId === 'undefined') {
      return;
    }
    
    this.sensorsService.sensorsControllerFindAll$Response({
      page: 1,
      limit: 1000,
      idNode: this.selectedNodeId
    }).subscribe({
      next: (response) => {
        let body: any = response.body;
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        this.sensors = body?.data || [];
        console.log('Loaded sensors for node', this.selectedNodeId, ':', this.sensors.length);
      },
      error: (err) => console.error('Error loading sensors:', err)
    });
  }
  
  onSensorChange(): void {
    this.selectedChannelId = '';
    this.selectedChannelIds = [];
    this.channels = [];
    
    if (!this.selectedSensorId) return;
    
    this.sensorChannelsService.sensorChannelsControllerFindAll$Response({
      page: 1,
      limit: 1000,
      idSensor: this.selectedSensorId
    }).subscribe({
      next: (response) => {
        let body: any = response.body;
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        this.channels = body?.data || [];
        console.log('Loaded channels for sensor', this.selectedSensorId, ':', this.channels.length);
      },
      error: (err) => console.error('Error loading channels:', err)
    });
  }
  
  onChannelChange(): void {
    if (!this.selectedChannelId) return;
    
    // Auto-populate settings from channel data
    const channel = this.channels.find(c => c.idSensorChannel === this.selectedChannelId);
    if (channel && this.selectedTemplate) {
      console.log('Selected channel data:', channel);
      
      this.selectedTemplate.options.forEach(opt => {
        if (opt.autoFrom) {
          switch (opt.autoFrom) {
            case 'channel.unit':
              this.templateSettings[opt.key] = channel.unit || opt.defaultValue;
              break;
            case 'channel.minValue':
              this.templateSettings[opt.key] = channel.minThreshold ?? opt.defaultValue;
              break;
            case 'channel.maxValue':
              this.templateSettings[opt.key] = channel.maxThreshold ?? opt.defaultValue;
              break;
            case 'channel.precision':
              this.templateSettings[opt.key] = channel.precision ?? opt.defaultValue;
              break;
          }
        }
      });
      
      // Also auto-populate without autoFrom mapping (direct assignment)
      // This ensures values are set even if template doesn't define autoFrom
      if (channel.unit && this.templateSettings['unit'] === '') {
        this.templateSettings['unit'] = channel.unit;
      }
      if (channel.minThreshold != null && this.templateSettings['minValue'] === 0) {
        this.templateSettings['minValue'] = Number(channel.minThreshold);
      }
      if (channel.maxThreshold != null && this.templateSettings['maxValue'] === 100) {
        this.templateSettings['maxValue'] = Number(channel.maxThreshold);
      }
      if (channel.precision != null) {
        this.templateSettings['decimals'] = parseInt(String(channel.precision), 10) || 2;
      }
      
      // Update widget name with channel info
      this.widgetName = `${this.selectedTemplate.name} - ${channel.metricCode}`;
    }
  }
  
  toggleChannelSelection(channelId: string): void {
    const index = this.selectedChannelIds.indexOf(channelId);
    if (index === -1) {
      this.selectedChannelIds.push(channelId);
    } else {
      this.selectedChannelIds.splice(index, 1);
    }
  }
  
  isChannelSelected(channelId: string): boolean {
    return this.selectedChannelIds.includes(channelId);
  }
  
  isDataSelectionValid(): boolean {
    if (!this.selectedTemplate) return false;
    
    const requiredFilters = this.selectedTemplate.requiredFilters;
    
    if (requiredFilters.includes('node') && !this.selectedNodeId) return false;
    if (requiredFilters.includes('sensor') && !this.selectedSensorId) return false;
    if (requiredFilters.includes('channel')) {
      // Check if it's multi-channel template
      if (this.isMultiChannelTemplate()) {
        return this.selectedChannelIds.length > 0;
      } else {
        return !!this.selectedChannelId;
      }
    }
    
    return true;
  }
  
  isMultiChannelTemplate(): boolean {
    if (!this.selectedTemplate) return false;
    return ['timeseries', 'singlevalue'].includes(this.selectedTemplate.categoryId) && 
           this.selectedTemplate.id !== 'gauge-speedometer';
  }
  
  // ============================================
  // STEP 3: CONFIGURATION
  // ============================================
  
  getOptionValue(key: string): any {
    return this.templateSettings[key];
  }
  
  setOptionValue(key: string, value: any): void {
    this.templateSettings[key] = value;
  }
  
  // ============================================
  // STEP 4: PREVIEW & SAVE
  // ============================================
  
  generateSqlPreview(): void {
    if (!this.selectedTemplate) return;
    
    const sqlTemplate = this.selectedDataSource === 'clickhouse' 
      ? this.selectedTemplate.sqlTemplate.clickhouse 
      : this.selectedTemplate.sqlTemplate.postgresql;
    
    // Replace placeholders with actual values
    let sql = sqlTemplate;
    sql = sql.replace(/\$\{channelId\}/g, this.selectedChannelId || '');
    sql = sql.replace(/\$\{sensorId\}/g, this.selectedSensorId || '');
    sql = sql.replace(/\$\{nodeId\}/g, this.selectedNodeId || '');
    
    // Handle multi-channel: build list from selectedChannelIds or fallback to single
    const channelIdList = this.selectedChannelIds.length > 0
      ? this.selectedChannelIds.map(id => `'${id}'`).join(', ')
      : this.selectedChannelId
        ? `'${this.selectedChannelId}'`
        : '';
    if (sql.includes('${channelIds}') && !channelIdList) {
      this.previewError = 'Please select at least one channel before running preview.';
      this.generatedSql = sql;
      return;
    }
    sql = sql.replace(/\$\{channelIds\}/g, channelIdList);
    
    // Replace time placeholders based on selected time range
    const now = new Date();
    const rangeMs: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const fromDate = new Date(now.getTime() - (rangeMs[this.previewTimeRange] || rangeMs['24h']));
    
    // Format time based on data source (ClickHouse needs 'YYYY-MM-DD HH:MM:SS.mmm')
    let fromTime: string;
    let toTime: string;
    if (this.selectedDataSource === 'clickhouse') {
      fromTime = fromDate.toISOString().replace('T', ' ').replace('Z', '');
      toTime = now.toISOString().replace('T', ' ').replace('Z', '');
    } else {
      fromTime = fromDate.toISOString();
      toTime = now.toISOString();
    }
    sql = sql.replace(/\$\{fromTime\}/g, fromTime);
    sql = sql.replace(/\$\{toTime\}/g, toTime);
    
    // Final safety: warn if any unreplaced placeholders remain
    const unreplaced = sql.match(/\$\{(\w+)\}/g);
    if (unreplaced) {
      this.previewError = `Missing values for: ${unreplaced.join(', ')}. Please check your data source selection.`;
      this.generatedSql = sql;
      return;
    }
    
    this.previewError = '';
    this.generatedSql = sql;
  }
  
  resetSql(): void {
    this.generateSqlPreview();
  }
  
  onTimeRangeChange(): void {
    this.generateSqlPreview();
  }
  
  /**
   * Generate SQL for saving (keeps time placeholders for backend to replace)
   */
  generateSqlForSave(): string {
    if (!this.selectedTemplate) return '';
    
    const sqlTemplate = this.selectedDataSource === 'clickhouse' 
      ? this.selectedTemplate.sqlTemplate.clickhouse 
      : this.selectedTemplate.sqlTemplate.postgresql;
    
    // Replace only the data source placeholders, keep time placeholders for backend
    let sql = sqlTemplate;
    sql = sql.replace(/\$\{channelId\}/g, this.selectedChannelId || '');
    sql = sql.replace(/\$\{sensorId\}/g, this.selectedSensorId || '');
    sql = sql.replace(/\$\{nodeId\}/g, this.selectedNodeId || '');
    
    // Handle multi-channel
    const channelIdList = this.selectedChannelIds.length > 0
      ? this.selectedChannelIds.map(id => `'${id}'`).join(', ')
      : this.selectedChannelId
        ? `'${this.selectedChannelId}'`
        : '';
    sql = sql.replace(/\$\{channelIds\}/g, channelIdList);
    
    // Keep ${fromTime}, ${toTime} for backend to replace at runtime
    return sql;
  }
  
  async runPreview(): Promise<void> {
    if (!this.generatedSql) return;
    
    // Block if there are unreplaced placeholders
    if (this.previewError) return;
    
    this.previewLoading = true;
    this.previewData = [];
    this.previewOptions = null;
    this.previewError = '';
    
    try {
      const response: any = await this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
        body: {
          sql: this.generatedSql,
          dataSource: this.selectedDataSource
        }
      }).toPromise();
      
      if (response && response.rows) {
        this.previewData = response.rows.slice(0, 10); // Show first 10 rows
      } else if (response && Array.isArray(response)) {
        this.previewData = response.slice(0, 10);
      }
      
      // Build chart options for preview
      if (this.previewData.length > 0) {
        this.previewOptions = this.buildChartOptions(this.previewData);
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      this.previewError = error?.error?.message || error?.message || 'Query execution failed';
    } finally {
      this.previewLoading = false;
    }
  }
  
  async saveWidget(): Promise<void> {
    if (!this.selectedTemplate || !this.widgetName.trim()) return;
    
    this.saving = true;
    
    try {
      const selectedNode = this.nodes.find(n => n.idNode === this.selectedNodeId);
      const selectedSensor = this.sensors.find(s => s.idSensor === this.selectedSensorId);
      const selectedChannel = this.channels.find(c => c.idSensorChannel === this.selectedChannelId);
      
      // Use SQL with placeholders for backend (not preview SQL)
      const sqlForSave = this.generateSqlForSave();
      
      // Build widget config (same structure as expert mode)
      const widgetConfig = {
        title: this.widgetName,
        description: this.widgetDescription,
        dataSource: this.selectedDataSource,
        refreshInterval: this.templateSettings['refreshInterval'] || 30,
        
        // Template mode tracking
        creationMode: 'template' as const,
        templateId: this.selectedTemplate.id,
        templateConfig: {
          nodeId: this.selectedNodeId,
          nodeName: selectedNode?.code,
          sensorId: this.selectedSensorId,
          sensorName: selectedSensor?.label,
          channelId: this.selectedChannelId,
          channelName: selectedChannel?.metricCode,
          channelIds: this.selectedChannelIds,
          settings: { ...this.templateSettings }
        },
        
        // Gauge-specific config
        ...(this.selectedTemplate.categoryId === 'gauge' && {
          mapping: {
            valueField: 'value',
            xField: 'timestamp'
          },
          yAxis: {
            min: Number(this.templateSettings['minValue']) || 0,
            max: Number(this.templateSettings['maxValue']) || 100,
            unit: this.templateSettings['unit'] || '',
            decimals: parseInt(String(this.templateSettings['decimals']), 10) || 2
          },
          thresholds: this.buildThresholds()
        }),
        
        // Chart-specific config
        ...(this.selectedTemplate.categoryId === 'timeseries' && {
          mapping: {
            xField: 'time',
            yField: 'value',
            seriesField: 'metric'
          },
          display: {
            showLegend: this.templateSettings['showLegend'] ?? true,
            lineStyle: this.templateSettings['smoothCurve'] ? 'smooth' : 'straight',
            fillOpacity: this.templateSettings['fillOpacity'] || 0
          }
        })
      };
      
      if (this.isEditMode && this.widgetId) {
        // Update existing widget
        await this.widgetBuilderService.widgetBuilderControllerUpdateWidget({
          dashboardId: this.dashboardId,
          widgetId: this.widgetId,
          body: {
            name: this.widgetName,
            widgetType: this.selectedTemplate.widgetType,
            sqlQuery: sqlForSave,
            dataSource: this.selectedDataSource,
            config: widgetConfig
          }
        }).toPromise();
      } else {
        // Create new widget (same structure as expert mode)
        await this.widgetBuilderService.widgetBuilderControllerCreateWidget({
          dashboardId: this.dashboardId,
          body: {
            name: this.widgetName,
            widgetType: this.selectedTemplate.widgetType,
            sqlQuery: sqlForSave,
            dataSource: this.selectedDataSource,
            config: widgetConfig,
            positionX: 0,
            positionY: 0,
            cols: this.getDefaultCols(),
            rows: this.getDefaultRows()
          }
        }).toPromise();
      }
      
      // Clear wizard state from localStorage on successful save
      this.clearWizardState();
      
      // Navigate back to dashboard
      this.router.navigate(['/iot/widget-builder', this.dashboardId]);
      
    } catch (error) {
      console.error('Error saving widget:', error);
      alert('Failed to save widget. Please try again.');
    } finally {
      this.saving = false;
    }
  }
  
  private buildThresholds(): Array<{value: number; color: string; label: string}> {
    const thresholds: Array<{value: number; color: string; label: string}> = [];
    
    if (this.templateSettings['warningThreshold'] != null) {
      thresholds.push({
        value: this.templateSettings['warningThreshold'],
        color: '#f59e0b',
        label: 'Warning'
      });
    }
    
    if (this.templateSettings['criticalThreshold'] != null) {
      thresholds.push({
        value: this.templateSettings['criticalThreshold'],
        color: '#ef4444',
        label: 'Critical'
      });
    }
    
    return thresholds;
  }
  
  private getDefaultCols(): number {
    if (!this.selectedTemplate) return 4;
    
    switch (this.selectedTemplate.categoryId) {
      case 'gauge':
      case 'singlevalue':
        return 2;
      case 'timeseries':
        return 4;
      case 'table':
        return 6;
      default:
        return 4;
    }
  }
  
  private getDefaultRows(): number {
    if (!this.selectedTemplate) return 3;
    
    switch (this.selectedTemplate.categoryId) {
      case 'gauge':
      case 'singlevalue':
        return 2;
      case 'timeseries':
        return 3;
      case 'table':
        return 4;
      default:
        return 3;
    }
  }
  
  async loadExistingWidget(): Promise<void> {
    // TODO: Implement edit mode loading
    // Load widget data and populate form
  }
  
  // ============================================
  // UI HELPERS
  // ============================================
  
  goBack(): void {
    if (this.currentStep > 1) {
      this.prevStep();
    } else {
      this.router.navigate(['/iot/widget-builder', this.dashboardId, 'widget', 'new']);
    }
  }
  
  cancel(): void {
    this.router.navigate(['/iot/widget-builder', this.dashboardId]);
  }
  
  // Get node name by ID
  getNodeName(nodeId: string | null): string {
    if (!nodeId) return '';
    const node = this.nodes.find(n => n.idNode === nodeId);
    return node?.code || 'Unknown Node';
  }
  
  // Get sensor name by ID
  getSensorName(sensorId: string | null): string {
    if (!sensorId) return '';
    const sensor = this.sensors.find(s => s.idSensor === sensorId);
    return sensor?.label || 'Unknown Sensor';
  }
  
  // Get channel name by ID
  getChannelName(channelId: string | null): string {
    if (!channelId) return '';
    const channel = this.channels.find(c => c.idSensorChannel === channelId);
    return channel?.metricCode || 'Unknown Channel';
  }
  
  // ============================================
  // CHART OPTIONS BUILDER
  // ============================================
  
  buildChartOptions(data: any[]): any {
    if (!this.selectedTemplate || !data || data.length === 0) return null;
    
    const categoryId = this.selectedTemplate.categoryId;
    const widgetType = this.selectedTemplate.widgetType;
    
    switch (categoryId) {
      case 'gauge':
        return this.buildGaugeOptions(data);
      case 'timeseries':
        return this.buildTimeseriesOptions(data);
      case 'singlevalue':
        return this.buildStatOptions(data);
      default:
        return null;
    }
  }
  
  private buildGaugeOptions(data: any[]): any {
    const value = data[0]?.value ?? 0;
    const minValue = this.templateSettings['minValue'] ?? 0;
    const maxValue = this.templateSettings['maxValue'] ?? 100;
    const unit = this.templateSettings['unit'] || '';
    const decimals = this.templateSettings['decimals'] ?? 2;
    const warningThreshold = this.templateSettings['warningThreshold'];
    const criticalThreshold = this.templateSettings['criticalThreshold'];
    
    // Build color stops based on thresholds
    const colorStops: [number, string][] = [];
    if (criticalThreshold !== null && criticalThreshold !== undefined) {
      const normalEnd = (warningThreshold ?? criticalThreshold) / maxValue;
      const warningEnd = criticalThreshold / maxValue;
      colorStops.push([normalEnd, '#10b981']); // Green
      colorStops.push([warningEnd, '#f59e0b']); // Yellow/Warning
      colorStops.push([1, '#ef4444']); // Red/Critical
    } else if (warningThreshold !== null && warningThreshold !== undefined) {
      const normalEnd = warningThreshold / maxValue;
      colorStops.push([normalEnd, '#10b981']); // Green
      colorStops.push([1, '#f59e0b']); // Yellow/Warning
    } else {
      colorStops.push([1, '#10b981']); // All green
    }
    
    return {
      series: [{
        type: 'gauge',
        radius: '85%',
        startAngle: 200,
        endAngle: -20,
        min: minValue,
        max: maxValue,
        splitNumber: 5,
        itemStyle: {
          color: '#10b981'
        },
        progress: {
          show: true,
          width: 20,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: colorStops.map((c, i) => ({ offset: c[0], color: c[1] }))
            }
          }
        },
        pointer: {
          show: true,
          length: '60%',
          width: 6,
          itemStyle: { color: '#fff' }
        },
        axisLine: {
          lineStyle: {
            width: 20,
            color: [[1, 'rgba(255,255,255,0.1)']]
          }
        },
        axisTick: {
          show: true,
          distance: -30,
          length: 8,
          lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1 }
        },
        splitLine: {
          distance: -35,
          length: 14,
          lineStyle: { color: 'rgba(255,255,255,0.5)', width: 2 }
        },
        axisLabel: {
          distance: -20,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 10
        },
        detail: {
          valueAnimation: true,
          fontSize: 32,
          fontWeight: 'bold',
          color: '#fff',
          offsetCenter: [0, '70%'],
          formatter: (val: number) => `${val.toFixed(decimals)} ${unit}`
        },
        data: [{ value: Number(value).toFixed(decimals) }]
      }]
    };
  }
  
  private buildTimeseriesOptions(data: any[]): any {
    const xField = 'time';
    const yField = 'value';
    
    return {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#fff' }
      },
      grid: { 
        left: '3%', 
        right: '4%', 
        bottom: '3%', 
        top: '10%', 
        containLabel: true 
      },
      xAxis: {
        type: 'category',
        data: data.map(d => {
          const date = new Date(d[xField]);
          return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        }),
        axisLabel: { color: 'rgba(255,255,255,0.6)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }
      },
      yAxis: { 
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.6)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      series: [{
        type: 'line',
        data: data.map(d => d[yField]),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.4)' },
              { offset: 1, color: 'rgba(59,130,246,0.05)' }
            ]
          }
        }
      }]
    };
  }
  
  private buildStatOptions(data: any[]): any {
    const value = data[0]?.value ?? 0;
    const unit = this.templateSettings['unit'] || '';
    const decimals = this.templateSettings['decimals'] ?? 1;
    
    return {
      value: Number(value).toFixed(decimals),
      unit: unit,
      title: this.widgetName || 'Value'
    };
  }
}
