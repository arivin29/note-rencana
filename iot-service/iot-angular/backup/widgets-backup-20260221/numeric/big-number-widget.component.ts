import { Component, Input } from '@angular/core';
import { BaseWidgetConfig } from '../../../models/widgets';

@Component({
  selector: 'big-number-widget',
  templateUrl: './big-number-widget.component.html',
  styleUrls: ['./big-number-widget.component.scss'],
  standalone: false
})
export class BigNumberWidgetComponent {
  @Input() config!: BaseWidgetConfig;

  /**
   * Get gradient background based on icon color
   */
  getGradientBackground(): string {
    const color = this.config.iconColor || '#0271ff';
    
    // Create gradient based on color
    // Using lighter and darker shades
    return `linear-gradient(135deg, ${color} 0%, ${this.adjustBrightness(color, -20)} 100%)`;
  }

  /**
   * Adjust color brightness
   */
  private adjustBrightness(color: string, percent: number): string {
    // Simple color adjustment (works with hex colors)
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }
}
