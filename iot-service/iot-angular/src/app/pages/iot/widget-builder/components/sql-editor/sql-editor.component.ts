import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-sql-editor',
  standalone: false,
  templateUrl: './sql-editor.component.html',
  styleUrls: ['./sql-editor.component.css']
})
export class SqlEditorComponent implements OnInit, OnChanges {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  editorValue = '';
  lineNumbers: number[] = [1];

  // Default SQL query template
  defaultQuery = `SELECT 
  node_id,
  temperature,
  humidity,
  created_at
FROM telemetry
WHERE created_at >= \${__timeFrom}
  AND created_at <= \${__timeTo}
ORDER BY created_at DESC
LIMIT 100`;

  ngOnInit(): void {
    this.editorValue = this.value || this.defaultQuery;
    this.updateLineNumbers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.editorValue = this.value || '';
      this.updateLineNumbers();
    }
  }

  onEditorChange(newValue: string): void {
    this.editorValue = newValue;
    this.valueChange.emit(newValue);
    this.updateLineNumbers();
  }

  updateLineNumbers(): void {
    const lines = (this.editorValue || '').split('\n').length;
    this.lineNumbers = Array.from({ length: Math.max(lines, 10) }, (_, i) => i + 1);
  }
}
