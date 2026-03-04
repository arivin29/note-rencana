import { Component, Input } from '@angular/core';

@Component({
  selector: 'widget-container',
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.scss'],
  standalone: false
})
export class WidgetContainerComponent {
  @Input() title?: string;
  @Input() icon?: string;
  @Input() iconColor?: string;
  @Input() showHeader: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}
