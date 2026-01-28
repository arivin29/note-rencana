import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-value-card-widget',
  standalone: false,
  template: `<div class="value-card-placeholder">Value Card Widget</div>`,
  styles: [`.value-card-placeholder { padding: 20px; text-align: center; }`]
})
export class ValueCardWidgetComponent {
  @Input() options: any;
}
