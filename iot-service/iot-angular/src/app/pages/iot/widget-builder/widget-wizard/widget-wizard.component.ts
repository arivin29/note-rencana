import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { 
  Widget, WidgetType, WIDGET_TYPES, FieldMapping,
  QueryResult, generateDummyTimeSeriesData, generateDummyBarData, 
  generateDummyPieData, generateDummyTableData
} from '../models/widget.models';

@Component({
  selector: 'app-widget-wizard',
  standalone: false,
  templateUrl: './widget-wizard.component.html',
  styleUrls: ['./widget-wizard.component.css']
})
export class WidgetWizardComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  dashboardId: string = '';
  widgetId: string | null = null;
  isEditMode = false;

  // Form Groups
  basicInfoForm!: FormGroup;
  queryForm!: FormGroup;
  mappingForm!: FormGroup;
  
  // Widget Types
  widgetTypes = WIDGET_TYPES;
  selectedType: WidgetType = 'line-chart';
  
  // Query State
  queryResult: QueryResult | null = null;
  queryError: string | null = null;
  queryLoading = false;
  
  // Available columns from query result
  availableColumns: string[] = [];
  
  // Chart Preview
  previewOptions: any = null;

  // Sample SQL Templates
  sqlTemplates = [
    {
      name: 'Time Series Data',
      sql: `SELECT 
  sl.ts as timestamp,
  sl.value_engineered as value
FROM sensor_logs sl
WHERE sl.id_sensor_channel = 'your-channel-id'
  AND sl.ts >= \${__timeFrom}
  AND sl.ts <= \${__timeTo}
ORDER BY sl.ts ASC
LIMIT 1000`
    },
    {
      name: 'Hourly Average',
      sql: `SELECT 
  DATE_TRUNC('hour', sl.ts) as timestamp,
  AVG(sl.value_engineered) as value
FROM sensor_logs sl
WHERE sl.id_sensor_channel = 'your-channel-id'
  AND sl.ts >= \${__timeFrom}
GROUP BY DATE_TRUNC('hour', sl.ts)
ORDER BY timestamp ASC`
    },
    {
      name: 'Latest Value',
      sql: `SELECT 
  sl.value_engineered as value,
  sl.ts as timestamp
FROM sensor_logs sl
WHERE sl.id_sensor_channel = 'your-channel-id'
ORDER BY sl.ts DESC
LIMIT 1`
    },
    {
      name: 'Sensor Distribution',
      sql: `SELECT 
  st.name as category,
  COUNT(*) as value
FROM sensors s
JOIN sensor_types st ON s.id_sensor_type = st.id
GROUP BY st.name`
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.dashboardId = this.route.snapshot.paramMap.get('id') || '';
    this.widgetId = this.route.snapshot.paramMap.get('widgetId');
    this.isEditMode = !!this.widgetId;

    this.initForms();
    
    if (this.isEditMode) {
      this.loadWidget();
    }
  }

  initForms(): void {
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['line-chart', Validators.required],
      description: [''],
    });

    this.queryForm = this.fb.group({
      sql: ['', Validators.required],
    });

    this.mappingForm = this.fb.group({
      xField: [''],
      yField: [''],
      labelField: [''],
      valueField: [''],
      seriesField: [''],
      title: [''],
      subtitle: [''],
      showLegend: [true],
    });

    // Watch type changes
    this.basicInfoForm.get('type')?.valueChanges.subscribe(type => {
      this.selectedType = type;
      this.updateMappingValidators();
    });
  }

  updateMappingValidators(): void {
    const mapping = this.mappingForm;
    
    // Reset validators
    mapping.get('xField')?.clearValidators();
    mapping.get('yField')?.clearValidators();
    mapping.get('valueField')?.clearValidators();
    mapping.get('labelField')?.clearValidators();

    // Set validators based on type
    switch (this.selectedType) {
      case 'line-chart':
      case 'bar-chart':
      case 'area-chart':
        mapping.get('xField')?.setValidators(Validators.required);
        mapping.get('yField')?.setValidators(Validators.required);
        break;
      case 'gauge':
      case 'value-card':
        mapping.get('valueField')?.setValidators(Validators.required);
        break;
      case 'pie-chart':
        mapping.get('labelField')?.setValidators(Validators.required);
        mapping.get('valueField')?.setValidators(Validators.required);
        break;
    }

    mapping.updateValueAndValidity();
  }

  loadWidget(): void {
    // Load existing widget for editing (mockup)
    console.log('Loading widget:', this.widgetId);
  }

  onTypeSelect(type: WidgetType): void {
    this.basicInfoForm.patchValue({ type });
    this.selectedType = type;
  }

  applySqlTemplate(template: { name: string; sql: string }): void {
    this.queryForm.patchValue({ sql: template.sql });
  }

  testQuery(): void {
    this.queryLoading = true;
    this.queryError = null;
    this.queryResult = null;

    // Simulate query execution with dummy data
    setTimeout(() => {
      try {
        // Generate dummy result based on widget type
        let columns: string[] = [];
        let rows: any[] = [];

        switch (this.selectedType) {
          case 'line-chart':
          case 'area-chart':
            columns = ['timestamp', 'value'];
            rows = generateDummyTimeSeriesData(24).map(d => ({
              timestamp: d.timestamp.toISOString(),
              value: d.value
            }));
            break;
          case 'bar-chart':
            columns = ['category', 'value'];
            rows = generateDummyBarData();
            break;
          case 'pie-chart':
            columns = ['name', 'value'];
            rows = generateDummyPieData();
            break;
          case 'gauge':
          case 'value-card':
            columns = ['value', 'timestamp'];
            rows = [{ value: 42.5, timestamp: new Date().toISOString() }];
            break;
          case 'data-table':
            columns = ['timestamp', 'sensor', 'value', 'unit', 'status'];
            rows = generateDummyTableData();
            break;
        }

        this.queryResult = {
          columns,
          rows,
          rowCount: rows.length,
          executionTime: Math.random() * 100 + 50
        };
        
        this.availableColumns = columns;
        this.autoMapFields();
        
      } catch (e: any) {
        this.queryError = e.message || 'Query execution failed';
      }
      
      this.queryLoading = false;
    }, 1000);
  }

  autoMapFields(): void {
    if (!this.queryResult) return;
    
    const columns = this.queryResult.columns;
    
    // Auto-detect timestamp field
    const timestampField = columns.find(c => 
      c.toLowerCase().includes('timestamp') || 
      c.toLowerCase().includes('time') ||
      c.toLowerCase() === 'ts'
    );
    
    // Auto-detect value field
    const valueField = columns.find(c => 
      c.toLowerCase().includes('value') ||
      c.toLowerCase().includes('avg') ||
      c.toLowerCase().includes('sum')
    );
    
    // Auto-detect label/category field
    const labelField = columns.find(c => 
      c.toLowerCase().includes('name') ||
      c.toLowerCase().includes('label') ||
      c.toLowerCase().includes('category')
    );

    // Apply based on widget type
    switch (this.selectedType) {
      case 'line-chart':
      case 'area-chart':
        this.mappingForm.patchValue({
          xField: timestampField || columns[0],
          yField: valueField || columns[1],
          title: this.basicInfoForm.get('name')?.value
        });
        break;
      case 'bar-chart':
        this.mappingForm.patchValue({
          xField: labelField || columns[0],
          yField: valueField || columns[1],
          title: this.basicInfoForm.get('name')?.value
        });
        break;
      case 'pie-chart':
        this.mappingForm.patchValue({
          labelField: labelField || columns[0],
          valueField: valueField || columns[1],
          title: this.basicInfoForm.get('name')?.value
        });
        break;
      case 'gauge':
      case 'value-card':
        this.mappingForm.patchValue({
          valueField: valueField || columns[0],
          title: this.basicInfoForm.get('name')?.value
        });
        break;
    }
    
    this.updatePreview();
  }

  updatePreview(): void {
    if (!this.queryResult) return;
    
    const mapping = this.mappingForm.value;
    const data = this.queryResult.rows;
    
    this.previewOptions = this.buildChartOptions(data, mapping);
  }

  buildChartOptions(data: any[], mapping: any): any {
    switch (this.selectedType) {
      case 'line-chart':
        return {
          title: { text: mapping.title, subtext: mapping.subtitle },
          tooltip: { trigger: 'axis' },
          legend: { show: mapping.showLegend },
          xAxis: {
            type: 'category',
            data: data.map(d => {
              const val = d[mapping.xField];
              return val instanceof Date ? val.toLocaleTimeString() : 
                     typeof val === 'string' && val.includes('T') ? new Date(val).toLocaleTimeString() : val;
            })
          },
          yAxis: { type: 'value' },
          series: [{
            type: 'line',
            data: data.map(d => d[mapping.yField]),
            smooth: true,
            areaStyle: {}
          }]
        };
        
      case 'bar-chart':
        return {
          title: { text: mapping.title },
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: data.map(d => d[mapping.xField])
          },
          yAxis: { type: 'value' },
          series: [{
            type: 'bar',
            data: data.map(d => d[mapping.yField]),
            itemStyle: { borderRadius: [4, 4, 0, 0] }
          }]
        };
        
      case 'gauge':
        const gaugeValue = data[0]?.[mapping.valueField] || 0;
        return {
          title: { text: mapping.title },
          series: [{
            type: 'gauge',
            progress: { show: true, width: 18 },
            axisLine: { lineStyle: { width: 18 } },
            axisTick: { show: false },
            splitLine: { length: 15, lineStyle: { width: 2 } },
            axisLabel: { distance: 25, fontSize: 12 },
            anchor: { show: true, size: 25, itemStyle: { borderWidth: 10 } },
            detail: { 
              valueAnimation: true, 
              fontSize: 30,
              offsetCenter: [0, '70%']
            },
            data: [{ value: gaugeValue, name: mapping.title }]
          }]
        };
        
      case 'pie-chart':
        return {
          title: { text: mapping.title },
          tooltip: { trigger: 'item' },
          legend: { show: mapping.showLegend, orient: 'vertical', left: 'left' },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: {
              label: { show: true, fontSize: 20, fontWeight: 'bold' }
            },
            labelLine: { show: false },
            data: data.map(d => ({
              name: d[mapping.labelField],
              value: d[mapping.valueField]
            }))
          }]
        };
        
      case 'value-card':
        return {
          value: data[0]?.[mapping.valueField] || 0,
          title: mapping.title,
          subtitle: mapping.subtitle
        };
        
      default:
        return null;
    }
  }

  saveWidget(): void {
    if (!this.basicInfoForm.valid || !this.queryForm.valid) {
      return;
    }

    const widget: Partial<Widget> = {
      name: this.basicInfoForm.value.name,
      type: this.basicInfoForm.value.type,
      query: {
        sql: this.queryForm.value.sql
      },
      config: {
        title: this.mappingForm.value.title,
        subtitle: this.mappingForm.value.subtitle,
        showLegend: this.mappingForm.value.showLegend,
        fieldMapping: {
          xField: this.mappingForm.value.xField,
          yField: this.mappingForm.value.yField,
          labelField: this.mappingForm.value.labelField,
          valueField: this.mappingForm.value.valueField,
          seriesField: this.mappingForm.value.seriesField,
        }
      },
      position: { x: 0, y: 0, cols: 6, rows: 4 } // Default position
    };

    console.log('Saving widget:', widget);
    alert('Widget saved! (Mockup)\n\n' + JSON.stringify(widget, null, 2));
    
    this.router.navigate(['/iot/widget-builder', this.dashboardId]);
  }

  cancel(): void {
    this.router.navigate(['/iot/widget-builder', this.dashboardId]);
  }

  // Helper for showing field mapping based on type
  needsXYMapping(): boolean {
    return ['line-chart', 'bar-chart', 'area-chart'].includes(this.selectedType);
  }

  needsValueMapping(): boolean {
    return ['gauge', 'value-card'].includes(this.selectedType);
  }

  needsLabelValueMapping(): boolean {
    return this.selectedType === 'pie-chart';
  }
}
