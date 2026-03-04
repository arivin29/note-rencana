import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Widget } from '../../../models/widget.models';

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

  tableData: {
    columns: string[];
    rows: any[];
  } | null = null;

  ngOnInit(): void {
    this.buildTableData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildTableData();
    }
  }

  private buildTableData(): void {
    if (!this.widget) {
      this.tableData = null;
      return;
    }

    const config = this.widget.config || {};
    const mapping: any = config.mapping || {};
    
    this.tableData = {
      columns: mapping.columns || this.columns,
      rows: this.data
    };
  }
}
