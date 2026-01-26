import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pie-chart-widget',
  standalone: false,
  template: `<div class="pie-chart-placeholder">Pie Chart Widget</div>`,
  styles: [`.pie-chart-placeholder { padding: 20px; text-align: center; }`]
})
export class PieChartWidgetComponent {
  @Input() options: any;
}
