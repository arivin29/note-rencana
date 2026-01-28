import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-gauge-widget',
  standalone: false,
  template: `<div class="gauge-placeholder">Gauge Widget</div>`,
  styles: [`.gauge-placeholder { padding: 20px; text-align: center; }`]
})
export class GaugeWidgetComponent {
  @Input() options: any;
}
