import { SensorType, WidgetType, SensorStatus, ThresholdStatus, TrendDirection } from './widget-types.enum';

// Base widget configuration
export interface BaseWidgetConfig {
  // Identity
  widgetId?: string;
  widgetType: WidgetType;

  // Display
  label: string;
  icon?: string;
  iconColor?: string;

  // Data
  sensorId?: string;
  sensorType: SensorType;
  value: number;
  unit: string;

  // Metadata
  updateTime?: string;
  status?: SensorStatus;

  // Styling
  theme?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
  customColors?: WidgetColors;
}

export interface WidgetColors {
  primary?: string;
  success?: string;
  warning?: string;
  danger?: string;
  background?: string;
}

// Gauge specific config
export interface GaugeWidgetConfig extends BaseWidgetConfig {
  widgetType: 'radial-gauge' | 'linear-gauge';
  min: number;
  max: number;
  zones?: ColorZone[];
  showPercentage?: boolean;
  showMinMax?: boolean;
}

export interface ColorZone {
  from: number;
  to: number;
  color: string;
}

// Radial progress config
export interface RadialProgressWidgetConfig extends BaseWidgetConfig {
  widgetType: 'radial-progress';
  max: number;
  percentage: number;
  color?: string;
}

// Chart specific config
export interface ChartWidgetConfig extends BaseWidgetConfig {
  widgetType: 'sparkline' | 'line-chart' | 'area-chart';
  data: TimeSeriesData[];
  timeRange?: string;
  showGrid?: boolean;
  smoothCurve?: boolean;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

// Threshold specific config
export interface ThresholdWidgetConfig extends BaseWidgetConfig {
  widgetType: 'threshold-alert';
  thresholds: {
    min: number;
    warning: number;
    critical: number;
    max: number;
  };
  currentStatus: ThresholdStatus;
}

// Multi-metric specific config
export interface MultiMetricWidgetConfig extends BaseWidgetConfig {
  widgetType: 'multi-metric';
  metrics: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
}

// Info card specific config
export interface InfoCardWidgetConfig extends BaseWidgetConfig {
  widgetType: 'info-card';
  trend?: {
    direction: TrendDirection;
    value: number;
  };
  stats?: {
    min: number;
    max: number;
  };
}

// Status badge config
export interface StatusBadgeWidgetConfig extends BaseWidgetConfig {
  widgetType: 'status-badge';
  lastUpdate: string;
}

// Union type for all configs
export type AnyWidgetConfig =
  | BaseWidgetConfig
  | GaugeWidgetConfig
  | RadialProgressWidgetConfig
  | ChartWidgetConfig
  | ThresholdWidgetConfig
  | MultiMetricWidgetConfig
  | InfoCardWidgetConfig
  | StatusBadgeWidgetConfig;
