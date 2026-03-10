import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Widget } from '../../../models/widget.models';

interface ColumnConfig {
  field: string;
  displayName: string;
  align: 'left' | 'center' | 'right';
  width: string;
  visible: boolean;
  type: 'text' | 'number' | 'date' | 'status' | 'badge';
  decimals: number;
  unit: string;
  dateFormat: string;
  thresholds: { value: number; color: string; bgColor: string }[];
  statusMap: { value: string; label: string; color: string }[];
}

interface TableOptions {
  striped: boolean;
  hover: boolean;
  bordered: boolean;
  compact: boolean;
  sortable: boolean;
  fontSize: number;
  headerBackground: string;
  columns: ColumnConfig[];
}

@Component({
  selector: 'app-table-widget',
  standalone: false,
  templateUrl: './table-widget.component.html',
  styleUrls: ['./table-widget.component.css']
})
export class TableWidgetComponent implements OnInit, OnChanges {
  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];

  tableOptions: TableOptions = {
    striped: true,
    hover: true,
    bordered: false,
    compact: false,
    sortable: true,
    fontSize: 12,
    headerBackground: '#1a1a2e',
    columns: []
  };

  displayColumns: ColumnConfig[] = [];
  displayData: any[] = [];
  
  // Sorting state
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  ngOnInit(): void {
    this.buildTableData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['widget']) {
      this.buildTableData();
    }
  }

  private buildTableData(): void {
    if (!this.widget || !this.data) {
      this.displayColumns = [];
      this.displayData = [];
      return;
    }

    const config = this.widget.config || {};
    const display: any = config.display || {};
    const tableOpts = display.tableOptions || {};

    // Merge options
    this.tableOptions = {
      striped: tableOpts.striped ?? true,
      hover: tableOpts.hover ?? true,
      bordered: tableOpts.bordered ?? false,
      compact: tableOpts.compact ?? false,
      sortable: tableOpts.sortable ?? true,
      fontSize: tableOpts.fontSize ?? 12,
      headerBackground: tableOpts.headerBackground ?? '#1a1a2e',
      columns: tableOpts.columns || []
    };

    // Determine columns from config or data
    const configColumns = this.tableOptions.columns;
    const dataKeys = this.data.length > 0 ? Object.keys(this.data[0]) : this.columns;

    if (configColumns.length > 0) {
      // Use configured columns (filter visible only)
      this.displayColumns = configColumns.filter(c => c.visible !== false);
    } else {
      // Auto-generate columns from data keys
      this.displayColumns = dataKeys.map(key => this.generateColumnConfig(key));
    }

    // Copy data for sorting
    this.displayData = [...this.data];
    
    // Apply current sort if any
    if (this.sortColumn) {
      this.applySort();
    }
  }

  private generateColumnConfig(field: string): ColumnConfig {
    // Smart detection based on field name
    const lowerField = field.toLowerCase();
    
    let type: ColumnConfig['type'] = 'text';
    let decimals = 0;
    let unit = '';
    let dateFormat = 'DD/MM/YYYY HH:mm';
    let statusMap: ColumnConfig['statusMap'] = [];

    // Detect type from field name
    if (lowerField.includes('time') || lowerField.includes('date') || lowerField === 'ts' || lowerField === 'timestamp') {
      type = 'date';
    } else if (lowerField.includes('status') || lowerField.includes('state')) {
      type = 'status';
      statusMap = [
        { value: 'Normal', label: 'Normal', color: 'success' },
        { value: 'OK', label: 'OK', color: 'success' },
        { value: 'Online', label: 'Online', color: 'success' },
        { value: 'Active', label: 'Active', color: 'success' },
        { value: 'Warning', label: 'Warning', color: 'warning' },
        { value: 'Offline', label: 'Offline', color: 'danger' },
        { value: 'Critical', label: 'Critical', color: 'danger' },
        { value: 'Error', label: 'Error', color: 'danger' },
        { value: 'Inactive', label: 'Inactive', color: 'secondary' },
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
    // Convert snake_case or camelCase to Title Case
    return field
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Sorting
  onHeaderClick(column: ColumnConfig): void {
    if (!this.tableOptions.sortable) return;

    if (this.sortColumn === column.field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column.field;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  private applySort(): void {
    if (!this.sortColumn) return;

    const col = this.sortColumn;
    const dir = this.sortDirection === 'asc' ? 1 : -1;

    this.displayData.sort((a, b) => {
      let valA = a[col];
      let valB = b[col];

      // Handle null/undefined
      if (valA == null && valB == null) return 0;
      if (valA == null) return dir;
      if (valB == null) return -dir;

      // Numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir;
      }

      // Date comparison
      if (valA instanceof Date || (typeof valA === 'string' && !isNaN(Date.parse(valA)))) {
        return (new Date(valA).getTime() - new Date(valB).getTime()) * dir;
      }

      // String comparison
      return String(valA).localeCompare(String(valB)) * dir;
    });
  }

  getSortIcon(column: ColumnConfig): string {
    if (this.sortColumn !== column.field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Value formatting
  formatValue(value: any, column: ColumnConfig): string {
    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) return String(value);
        const formatted = num.toFixed(column.decimals);
        return column.unit ? `${formatted} ${column.unit}` : formatted;

      case 'date':
        try {
          const date = new Date(value);
          return this.formatDate(date, column.dateFormat);
        } catch {
          return String(value);
        }

      case 'status':
      case 'badge':
        // Status formatting handled in template
        return String(value);

      default:
        return String(value);
    }
  }

  private formatDate(date: Date, format: string): string {
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
  }

  // Conditional coloring
  getCellStyle(value: any, column: ColumnConfig): { [key: string]: string } {
    if (column.type !== 'number' || !column.thresholds || column.thresholds.length === 0) {
      return {};
    }

    const num = parseFloat(value);
    if (isNaN(num)) return {};

    // Sort thresholds descending to find matching threshold
    const sortedThresholds = [...column.thresholds].sort((a, b) => b.value - a.value);
    
    for (const threshold of sortedThresholds) {
      if (num >= threshold.value) {
        const style: { [key: string]: string } = {};
        if (threshold.color) style['color'] = threshold.color;
        if (threshold.bgColor) style['background-color'] = threshold.bgColor;
        return style;
      }
    }

    return {};
  }

  // Status badge
  getStatusBadge(value: any, column: ColumnConfig): { label: string; colorClass: string } | null {
    if (column.type !== 'status' && column.type !== 'badge') return null;

    const strValue = String(value);
    const mapping = column.statusMap?.find(m => 
      m.value.toLowerCase() === strValue.toLowerCase()
    );

    if (mapping) {
      return {
        label: mapping.label,
        colorClass: `bg-${mapping.color}`
      };
    }

    // Default fallback based on common patterns
    const lower = strValue.toLowerCase();
    if (lower === 'normal' || lower === 'ok' || lower === 'online' || lower === 'active') {
      return { label: strValue, colorClass: 'bg-success' };
    }
    if (lower === 'warning' || lower === 'warn') {
      return { label: strValue, colorClass: 'bg-warning' };
    }
    if (lower === 'critical' || lower === 'error' || lower === 'offline' || lower === 'fail') {
      return { label: strValue, colorClass: 'bg-danger' };
    }

    return { label: strValue, colorClass: 'bg-secondary' };
  }

  // Table CSS classes
  getTableClasses(): string[] {
    const classes = ['table', 'table-sm', 'mb-0'];
    if (this.tableOptions.striped) classes.push('table-striped');
    if (this.tableOptions.hover) classes.push('table-hover');
    if (this.tableOptions.bordered) classes.push('table-bordered');
    return classes;
  }
}
