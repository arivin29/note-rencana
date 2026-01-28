import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bar-chart-widget',
  standalone: false,
  template: `<div class="bar-chart-placeholder">Bar Chart Widget</div>`,
  styles: [`.bar-chart-placeholder { padding: 20px; text-align: center; }`]
})
export class BarChartWidgetComponent {
  @Input() options: any;
}
