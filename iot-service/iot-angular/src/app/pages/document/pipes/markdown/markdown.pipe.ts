import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: false
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    
    try {
      const html = marked.parse(value);
      return this.sanitizer.bypassSecurityTrustHtml(html as string);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return value;
    }
  }
}
