import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Widget } from '../../models/widget.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetBuilderService } from 'src/sdk/core/services';

@Component({
  selector: 'app-widget-container',
  standalone: false,
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.css']
})
export class WidgetContainerComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  @Input() widget: Widget | undefined;
  @Input() editMode = false;
  @Input() timeRange: string = '6h';  // Legacy - preset string
  @Input() timeFrom: number = 0;      // Epoch milliseconds
  @Input() timeTo: number = 0;        // Epoch milliseconds
  @Input() isFullscreen = false;

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();

  loading = true;
  error: string | null = null;
  chartData: any[] = [];
  chartOptions: any = null;

  constructor(private widgetBuilderService: WidgetBuilderService) {}

  ngOnInit(): void {
    this.loadWidgetData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload data when time range changes (either preset or epoch)
    if ((changes['timeRange'] && !changes['timeRange'].firstChange) ||
        (changes['timeFrom'] && !changes['timeFrom'].firstChange) ||
        (changes['timeTo'] && !changes['timeTo'].firstChange)) {
      this.loadWidgetData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWidgetData(): void {
    if (!this.widget) return;

    this.loading = true;
    this.error = null;

    // Get SQL query from widget config
    const sqlQuery = this.widget.sqlQuery || this.widget.config?.sqlQuery;
    
    if (!sqlQuery) {
      this.error = 'No SQL query configured for this widget';
      this.loading = false;
      return;
    }

    // Build request body with epoch timestamps if available
    const requestBody: any = {
      sql: sqlQuery,
      variables: {}
    };

    // Use epoch timestamps if provided, otherwise use preset string
    if (this.timeFrom > 0 && this.timeTo > 0) {
      requestBody.from = this.timeFrom;
      requestBody.to = this.timeTo;
    } else {
      requestBody.timeRange = (this.timeRange || '6h') as any;
    }

    // Execute the SQL query via API
    this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
      body: requestBody
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.chartData = response.rows || [];
        this.chartOptions = this.generateChartOptions(response.rows || [], response.columns || []);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to execute widget query:', err);
        this.error = err.error?.message || err.message || 'Failed to load widget data';
        this.loading = false;
      }
    });
  }

  generateChartOptions(rows: any[], columns: string[]): any {
    if (!this.widget || rows.length === 0) return null;

    const config = this.widget.config || {};
    const mapping = config.mapping || {};

    switch (this.widget.type) {
      case 'line-chart':
      case 'multi-line-chart':
        return this.buildLineChartOptions(rows, columns, mapping, config);
      case 'bar-chart':
        return this.buildBarChartOptions(rows, columns, mapping, config);
      case 'gauge':
        return this.buildGaugeOptions(rows, columns, mapping, config);
      case 'pie-chart':
        return this.buildPieChartOptions(rows, columns, mapping, config);
      case 'stat-card':
        return this.buildValueCardData(rows, columns, mapping, config);
      case 'table':
        return this.buildTableData(rows, columns, mapping, config);
      default:
        return null;
    }
  }

  buildLineChartOptions(rows: any[], columns: string[], mapping: any, config: any): any {
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const axisLineColor = 'rgba(255, 255, 255, 0.2)';
    
    const xField = mapping.xField || 'timestamp';
    const yFields = mapping.yFields || [mapping.yField || 'value'];
    const seriesField = mapping.seriesField;
    
    // Get series config and decimals
    const seriesConfig = config.series || [];
    const display = config.display || {};
    const decimals = config.yAxis?.decimals ?? 2; // Default 2 decimal places
    
    // Colors for series
    const colors = ['#73bf69', '#5794f2', '#ff9830', '#f2495c', '#b877d9', '#ff6eb4', '#4ec5d4', '#fade2a'];

    let series: any[] = [];
    let xAxisData: string[] = [];

    if (seriesField && rows.length > 0 && rows[0][seriesField]) {
      // Multi-series: group by seriesField
      const seriesNames = [...new Set(rows.map(r => r[seriesField]))];
      const groupedData: Record<string, Record<string, number>> = {};
      
      rows.forEach(row => {
        const xVal = this.formatXValue(row[xField]);
        const sName = row[seriesField];
        const yVal = parseFloat(row[yFields[0]] || row['value'] || 0);
        
        if (!groupedData[sName]) groupedData[sName] = {};
        groupedData[sName][xVal] = yVal;
      });
      
      xAxisData = [...new Set(rows.map(r => this.formatXValue(r[xField])))];
      
      series = seriesNames.map((name, idx) => {
        const sc = seriesConfig.find((s: any) => s.field === name) || {};
        return {
          name: sc.label || name,
          type: 'line',
          data: xAxisData.map(x => groupedData[name as string]?.[x] ?? null),
          smooth: display.lineStyle === 'smooth',
          showSymbol: display.showPoints === 'always',
          lineStyle: { width: display.lineWidth || 2 },
          areaStyle: display.fillOpacity ? { opacity: display.fillOpacity / 100 } : undefined,
          itemStyle: { color: sc.color || colors[idx % colors.length] }
        };
      });
    } else {
      // Single or multiple Y fields
      xAxisData = rows.map(r => this.formatXValue(r[xField]));
      
      series = yFields.map((yField: string, idx: number) => {
        const sc = seriesConfig.find((s: any) => s.field === yField) || {};
        return {
          name: sc.label || yField,
          type: 'line',
          data: rows.map(r => parseFloat(r[yField]) || 0),
          smooth: display.lineStyle === 'smooth',
          showSymbol: display.showPoints === 'always',
          lineStyle: { width: display.lineWidth || 2 },
          areaStyle: display.fillOpacity ? { opacity: display.fillOpacity / 100 } : undefined,
          itemStyle: { color: sc.color || colors[idx % colors.length] }
        };
      });
    }

    // Add threshold lines
    const thresholds = config.thresholds || [];
    if (thresholds.length > 0 && series.length > 0) {
      series[0].markLine = {
        silent: true,
        symbol: 'none',
        data: thresholds.map((t: any) => ({
          yAxis: t.value,
          label: { 
            show: true, 
            formatter: t.label || `${t.value}`,
            color: t.color || '#f2495c'
          },
          lineStyle: {
            color: t.color || '#f2495c',
            type: t.lineStyle || 'dashed'
          }
        }))
      };
    }

    // Helper to get decimals for a series
    const getSeriesDecimals = (seriesName: string): number => {
      const sc = seriesConfig.find((s: any) => s.field === seriesName || s.label === seriesName);
      return sc?.decimals ?? decimals;
    };

    return {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) params = [params];
          let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue || ''}</div>`;
          params.forEach((item: any) => {
            if (item.data !== undefined && item.data !== null) {
              const d = getSeriesDecimals(item.seriesName);
              const val = typeof item.data === 'number' ? item.data.toFixed(d) : (parseFloat(item.data)?.toFixed(d) || item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>${item.marker} ${item.seriesName}</span>
                <span style="font-weight:600">${val}</span>
              </div>`;
            }
          });
          return html;
        }
      },
      legend: display.showLegend !== false ? {
        show: true,
        top: display.legendPosition === 'bottom' ? 'bottom' : 'top',
        textStyle: { color: textColor }
      } : { show: false },
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: { rotate: 45, color: textColor, fontSize: 10 },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { show: false }
      },
      yAxis: { 
        type: 'value',
        name: config.yAxis?.label || '',
        axisLabel: { 
          color: textColor,
          formatter: (value: number) => value?.toFixed(decimals) || '0'
        },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      series
    };
  }

  buildBarChartOptions(rows: any[], columns: string[], mapping: any, config: any): any {
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const axisLineColor = 'rgba(255, 255, 255, 0.2)';
    const decimals = config.yAxis?.decimals ?? 2;
    
    const xField = mapping.xField || mapping.labelField || columns[0];
    const yField = mapping.yFields?.[0] || mapping.valueField || columns[1] || 'value';

    return {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) params = [params];
          let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue || ''}</div>`;
          params.forEach((item: any) => {
            if (item.data !== undefined && item.data !== null) {
              const val = typeof item.data === 'number' ? item.data.toFixed(decimals) : (parseFloat(item.data)?.toFixed(decimals) || item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>${item.marker} ${item.seriesName || yField}</span>
                <span style="font-weight:600">${val}</span>
              </div>`;
            }
          });
          return html;
        }
      },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: rows.map(r => r[xField]),
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: axisLineColor } }
      },
      yAxis: { 
        type: 'value',
        axisLabel: { 
          color: textColor,
          formatter: (value: number) => value?.toFixed(decimals) || '0'
        },
        axisLine: { lineStyle: { color: axisLineColor } },
        splitLine: { lineStyle: { color: axisLineColor } }
      },
      series: [{
        type: 'bar',
        data: rows.map(r => parseFloat(r[yField]) || 0),
        itemStyle: { 
          color: '#42a5f5',
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  }

  buildGaugeOptions(rows: any[], columns: string[], mapping: any, config: any): any {
    const valueField = mapping.valueField || 'value';
    const value = rows.length > 0 ? parseFloat(rows[0][valueField]) || 0 : 0;
    const min = mapping.minField && rows[0] ? parseFloat(rows[0][mapping.minField]) : 0;
    const max = mapping.maxField && rows[0] ? parseFloat(rows[0][mapping.maxField]) : 100;
    const unit = config.yAxis?.unit || rows[0]?.unit || '';
    const decimals = config.yAxis?.decimals ?? 2;
    
    const textColor = 'rgba(255, 255, 255, 0.8)';
    
    return {
      series: [{
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: min,
        max: max,
        progress: { show: true, width: 18 },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.3, '#67e0e3'],
              [0.7, '#37a2da'],
              [1, '#fd666d']
            ]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        title: {
          show: true,
          offsetCenter: [0, '30%'],
          fontSize: 12,
          color: textColor
        },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 'bold',
          offsetCenter: [0, '-10%'],
          formatter: (val: number) => val.toFixed(decimals) + unit,
          color: textColor
        },
        data: [{ value: parseFloat(value.toFixed(decimals)), name: this.widget?.name }]
      }]
    };
  }

  buildPieChartOptions(rows: any[], columns: string[], mapping: any, config: any): any {
    const labelField = mapping.labelField || columns[0];
    const valueField = mapping.valueField || columns[1] || 'value';
    const textColor = 'rgba(255, 255, 255, 0.8)';
    const display = config.display || {};
    const decimals = config.yAxis?.decimals ?? 2;

    const data = rows.map(r => ({
      name: r[labelField],
      value: parseFloat(r[valueField]) || 0
    }));

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => `${params.name}: ${params.value.toFixed(decimals)} (${params.percent.toFixed(1)}%)`
      },
      legend: display.showLegend !== false ? {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        textStyle: { color: textColor }
      } : { show: false },
      series: [{
        name: this.widget?.name || 'Distribution',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: 'transparent',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold', color: textColor }
        },
        data: data
      }]
    };
  }

  buildValueCardData(rows: any[], columns: string[], mapping: any, config: any): any {
    const valueField = mapping.valueField || 'value';
    const value = rows.length > 0 ? parseFloat(rows[0][valueField]) || 0 : 0;
    const unit = config.yAxis?.unit || rows[0]?.unit || '';
    const decimals = config.yAxis?.decimals ?? 2;
    
    return {
      value: parseFloat(value.toFixed(decimals)),
      formattedValue: value.toFixed(decimals),
      title: config.title || this.widget?.name,
      unit: unit,
      trend: null,
      trendValue: null
    };
  }

  buildTableData(rows: any[], columns: string[], mapping: any, config: any): any {
    return {
      columns: mapping.columns || columns,
      rows: rows
    };
  }

  formatXValue(value: any): string {
    if (!value) return '';
    
    // Try to parse as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    }
    
    return String(value);
  }

  onRefresh(): void {
    this.loadWidgetData();
    this.refresh.emit();
  }
}
