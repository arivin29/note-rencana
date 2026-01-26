import { Component, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-sql-editor',
  standalone: false,
  templateUrl: './sql-editor.component.html',
  styleUrls: ['./sql-editor.component.css']
})
export class SqlEditorComponent implements AfterViewInit {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  // CodeMirror options
  editorOptions = {
    lineNumbers: true,
    mode: 'text/x-sql',
    theme: 'default',
    indentWithTabs: true,
    smartIndent: true,
    lineWrapping: true,
    matchBrackets: true,
    autofocus: false,
    extraKeys: {
      'Ctrl-Space': 'autocomplete'
    }
  };

  ngAfterViewInit(): void {
    // Editor initialization handled by ngx-codemirror
  }

  onEditorChange(value: string): void {
    this.valueChange.emit(value);
  }
}
