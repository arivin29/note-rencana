import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-data-table-widget',
  standalone: false,
  template: `<div class="data-table-placeholder">Data Table Widget</div>`,
  styles: [`.data-table-placeholder { padding: 20px; text-align: center; }`]
})
export class DataTableWidgetComponent {
  @Input() options: any;
}
