import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Widget } from '../../../models/widget.models';

@Component({
  selector: 'app-stat-card-widget',
  standalone: false,
  templateUrl: './stat-card-widget.component.html',
  styleUrls: ['./stat-card-widget.component.css']
})
export class StatCardWidgetComponent implements OnInit, OnChanges {
  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];

  displayData: {
    value: number;
    formattedValue: string;
    title: string;
    unit: string;
    trend: string | null;
    trendValue: number | null;
  } | null = null;

  ngOnInit(): void {
    this.buildDisplayData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildDisplayData();
    }
  }

  private buildDisplayData(): void {
    if (!this.widget || this.data.length === 0) {
      this.displayData = null;
      return;
    }

    const config = this.widget.config || {};
    const mapping: any = config.mapping || {};

    const valueField = mapping.valueField || 'value';
    const value = this.data.length > 0 ? parseFloat(this.data[0][valueField]) || 0 : 0;
    const unit = config.yAxis?.unit || this.data[0]?.unit || '';
    const decimals = config.yAxis?.decimals ?? 2;
    
    this.displayData = {
      value: parseFloat(value.toFixed(decimals)),
      formattedValue: value.toFixed(decimals),
      title: config.title || this.widget?.name,
      unit: unit,
      trend: null,
      trendValue: null
    };
  }
}
