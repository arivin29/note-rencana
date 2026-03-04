import { Component, Input, OnInit } from '@angular/core';
import { GaugeWidgetConfig } from '../../../models/widgets';
import {
  ApexNonAxisChartSeries,
  ApexChart,
  ApexPlotOptions,
  ApexFill,
  ApexStroke
} from 'ng-apexcharts';

export type RadialGaugeChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  stroke: ApexStroke;
  labels: string[];
};

@Component({
  selector: 'radial-gauge-widget',
  templateUrl: './radial-gauge-widget.component.html',
  styleUrls: ['./radial-gauge-widget.component.scss'],
  standalone: false
})
export class RadialGaugeWidgetComponent implements OnInit {
  @Input() config!: GaugeWidgetConfig;

  chartOptions!: RadialGaugeChartOptions;
  percentage: number = 0;

  ngOnInit() {
    this.percentage = this.calculatePercentage();
    this.initChart();
  }

  ngOnChanges() {
    if (this.config) {
      this.percentage = this.calculatePercentage();
      this.initChart();
    }
  }

  /**
   * Get gradient background for icon badge
   */
  getGradientBackground(): string {
    const color = this.config.iconColor || this.getColorForValue();
    return `linear-gradient(135deg, ${color} 0%, ${this.adjustBrightness(color, -20)} 100%)`;
  }

  private calculatePercentage(): number {
    const range = this.config.max - this.config.min;
    const valueInRange = this.config.value - this.config.min;
    return (valueInRange / range) * 100;
  }

  private getColorForValue(): string {
    if (!this.config.zones || this.config.zones.length === 0) {
      return '#0EA5E9';
    }

    const zone = this.config.zones.find(
      z => this.config.value >= z.from && this.config.value <= z.to
    );

    return zone?.color || '#0EA5E9';
  }

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

  private initChart() {
    const color = this.getColorForValue();

    this.chartOptions = {
      series: [this.percentage],
      chart: {
        type: 'radialBar',
        height: 280,
        sparkline: { enabled: false }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            size: '65%'
          },
          track: {
            background: '#f1f5f9',
            strokeWidth: '100%'
          },
          dataLabels: {
            name: {
              show: false
            },
            value: {
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--bs-body-color)',
              formatter: (val: number) => {
                return this.config.value.toFixed(2);
              }
            }
          }
        }
      },
      fill: {
        type: 'solid',
        colors: [color]
      },
      stroke: {
        lineCap: 'round'
      },
      labels: [this.config.unit]
    };
  }
}
