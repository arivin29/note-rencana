import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-field-mapping',
  standalone: false,
  template: `
    <div class="field-mapping">
      <p class="text-muted mb-3">Map query columns to chart fields</p>
      <!-- This is a placeholder - actual implementation in widget-wizard -->
    </div>
  `,
  styles: [`
    .field-mapping {
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }
  `]
})
export class FieldMappingComponent {
  @Input() columns: string[] = [];
  @Input() mapping: any = {};
  @Output() mappingChange = new EventEmitter<any>();
}
