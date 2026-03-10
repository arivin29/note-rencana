import { Injectable } from '@angular/core';
import {
  BaseWidgetConfig,
  GaugeWidgetConfig,
  RadialProgressWidgetConfig,
  ChartWidgetConfig,
  ThresholdWidgetConfig,
  MultiMetricWidgetConfig,
  InfoCardWidgetConfig,
  ColorZone,
  SensorType,
  WidgetType,
  SENSOR_METADATA
} from '../../../models/widgets';

@Injectable({
  providedIn: 'root'
})
export class WidgetFactoryService {

  /**
   * Create a basic widget configuration
   */
  createWidget(
    widgetType: WidgetType,
    sensorType: SensorType,
    value: number,
    options?: Partial<BaseWidgetConfig>
  ): BaseWidgetConfig {
    const sensorMeta = SENSOR_METADATA[sensorType];

    const baseConfig: BaseWidgetConfig = {
      widgetType,
      sensorType,
      label: options?.label || sensorMeta.displayName,
      icon: options?.icon || sensorMeta.icon,
      iconColor: options?.iconColor || sensorMeta.iconColor,
      value,
      unit: options?.unit || sensorMeta.defaultUnit,
      status: options?.status || 'online',
      ...options
    };

    return baseConfig;
  }

  /**
   * Create gauge widget (radial or linear)
   */
  createGaugeWidget(
    sensorType: SensorType,
    value: number,
    options?: Partial<GaugeWidgetConfig>
  ): GaugeWidgetConfig {
    const sensorMeta = SENSOR_METADATA[sensorType];

    return {
      ...this.createWidget(options?.widgetType || 'radial-gauge', sensorType, value, options),
      widgetType: options?.widgetType || 'radial-gauge',
      min: options?.min ?? sensorMeta.defaultMin,
      max: options?.max ?? sensorMeta.defaultMax,
      zones: options?.zones || this.getDefaultZones(sensorMeta.defaultMin, sensorMeta.defaultMax),
      showPercentage: options?.showPercentage ?? true,
      showMinMax: options?.showMinMax ?? true
    } as GaugeWidgetConfig;
  }

  /**
   * Create radial progress widget
   */
  createRadialProgressWidget(
    sensorType: SensorType,
    value: number,
    max: number,
    options?: Partial<RadialProgressWidgetConfig>
  ): RadialProgressWidgetConfig {
    const percentage = (value / max) * 100;

    return {
      ...this.createWidget('radial-progress', sensorType, value, options),
      widgetType: 'radial-progress',
      max,
      percentage,
      color: options?.color || this.getColorByPercentage(percentage)
    } as RadialProgressWidgetConfig;
  }

  /**
   * Create chart widget
   */
  createChartWidget(
    sensorType: SensorType,
    currentValue: number,
    data: Array<{ timestamp: string; value: number }>,
    options?: Partial<ChartWidgetConfig>
  ): ChartWidgetConfig {
    return {
      ...this.createWidget(options?.widgetType || 'line-chart', sensorType, currentValue, options),
      widgetType: options?.widgetType || 'line-chart',
      data,
      timeRange: options?.timeRange || '1h',
      showGrid: options?.showGrid ?? true,
      smoothCurve: options?.smoothCurve ?? true
    } as ChartWidgetConfig;
  }

  /**
   * Create threshold alert widget
   */
  createThresholdWidget(
    sensorType: SensorType,
    value: number,
    thresholds: { min: number; warning: number; critical: number; max: number },
    options?: Partial<ThresholdWidgetConfig>
  ): ThresholdWidgetConfig {
    const currentStatus = this.determineThresholdStatus(value, thresholds);

    return {
      ...this.createWidget('threshold-alert', sensorType, value, options),
      widgetType: 'threshold-alert',
      thresholds,
      currentStatus
    } as ThresholdWidgetConfig;
  }

  /**
   * Create multi-metric widget
   */
  createMultiMetricWidget(
    sensorType: SensorType,
    metrics: { current: number; average: number; min: number; max: number },
    options?: Partial<MultiMetricWidgetConfig>
  ): MultiMetricWidgetConfig {
    return {
      ...this.createWidget('multi-metric', sensorType, metrics.current, options),
      widgetType: 'multi-metric',
      metrics
    } as MultiMetricWidgetConfig;
  }

  /**
   * Create info card widget
   */
  createInfoCardWidget(
    sensorType: SensorType,
    value: number,
    options?: Partial<InfoCardWidgetConfig>
  ): InfoCardWidgetConfig {
    return {
      ...this.createWidget('info-card', sensorType, value, options),
      widgetType: 'info-card',
      trend: options?.trend,
      stats: options?.stats
    } as InfoCardWidgetConfig;
  }

  /**
   * Generate default color zones based on range
   */
  private getDefaultZones(min: number, max: number): ColorZone[] {
    const range = max - min;
    return [
      { from: min, to: min + range * 0.6, color: '#10B981' },           // green (0-60%)
      { from: min + range * 0.6, to: min + range * 0.85, color: '#F59E0B' }, // yellow (60-85%)
      { from: min + range * 0.85, to: max, color: '#EF4444' }           // red (85-100%)
    ];
  }

  /**
   * Get color based on percentage
   */
  private getColorByPercentage(percentage: number): string {
    if (percentage < 60) return '#10B981'; // green
    if (percentage < 85) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  }

  /**
   * Determine threshold status
   */
  private determineThresholdStatus(
    value: number,
    thresholds: { min: number; warning: number; critical: number; max: number }
  ): 'safe' | 'warning' | 'critical' {
    if (value < thresholds.min || value > thresholds.max) {
      return 'critical';
    }
    if (value >= thresholds.warning && value <= thresholds.critical) {
      return 'warning';
    }
    return 'safe';
  }

  /**
   * Get sensor metadata
   */
  getSensorMetadata(sensorType: SensorType) {
    return SENSOR_METADATA[sensorType];
  }
}
