import { Component, Input } from '@angular/core';
import { InfoCardWidgetConfig } from '../../../models/widgets';

@Component({
  selector: 'info-card-widget',
  templateUrl: './info-card-widget.component.html',
  styleUrls: ['./info-card-widget.component.scss'],
  standalone: false
})
export class InfoCardWidgetComponent {
  @Input() config!: InfoCardWidgetConfig;

  /**
   * Get gradient background based on icon color
   */
  getGradientBackground(): string {
    const color = this.config.iconColor || '#0271ff';
    return `linear-gradient(135deg, ${color} 0%, ${this.adjustBrightness(color, -20)} 100%)`;
  }

  /**
   * Calculate progress percentage for stats bar
   */
  getProgressPercentage(): number {
    if (!this.config.stats) return 0;
    
    const { min, max } = this.config.stats;
    const value = this.config.value;
    const range = max - min;
    
    if (range === 0) return 50;
    
    const percentage = ((value - min) / range) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  /**
   * Adjust color brightness
   */
  private adjustBrightness(color: string, percent: number): string {
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
