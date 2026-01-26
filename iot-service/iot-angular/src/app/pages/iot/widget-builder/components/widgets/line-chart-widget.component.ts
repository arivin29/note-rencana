// Line Chart Widget - Placeholder (rendered via widget-container)
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-line-chart-widget',
  standalone: false,
  template: `<div class="line-chart-placeholder">Line Chart Widget</div>`,
  styles: [`.line-chart-placeholder { padding: 20px; text-align: center; }`]
})
export class LineChartWidgetComponent {
  @Input() options: any;
}
