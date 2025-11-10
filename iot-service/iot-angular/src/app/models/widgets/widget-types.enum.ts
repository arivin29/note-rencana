export type SensorType =
  // Flow & Volume
  | 'flow_rate'
  | 'flow_totalizer'
  | 'velocity'
  // Pressure
  | 'pressure'
  | 'pressure_differential'
  | 'pressure_vacuum'
  | 'pressure_atmospheric'
  // Level & Distance
  | 'level'
  | 'distance'
  | 'depth'
  // Temperature
  | 'temperature'
  | 'temperature_ambient'
  | 'temperature_differential'
  // Electrical
  | 'voltage'
  | 'current'
  | 'power_active'
  | 'power_reactive'
  | 'power_factor'
  | 'energy'
  | 'frequency'
  // Water Quality
  | 'ph'
  | 'conductivity'
  | 'tds'
  | 'turbidity'
  | 'dissolved_oxygen'
  | 'chlorine'
  | 'orp'
  // Environmental
  | 'humidity'
  | 'light_intensity'
  | 'uv_index'
  | 'rainfall'
  | 'wind_speed'
  | 'wind_direction'
  // Gas & Air Quality
  | 'gas_co2'
  | 'gas_co'
  | 'gas_o2'
  | 'gas_ch4'
  | 'gas_nh3'
  | 'gas_h2s'
  | 'gas_voc'
  | 'pm25'
  | 'pm10'
  // Motion & Position
  | 'vibration'
  | 'acceleration'
  | 'tilt'
  | 'gps_latitude'
  | 'gps_longitude'
  | 'gps_altitude'
  // Status & Digital
  | 'digital_input'
  | 'pulse_count'
  | 'battery_level'
  | 'signal_rssi'
  | 'signal_quality'
  // Industrial
  | 'rpm'
  | 'torque'
  | 'force'
  | 'sound_level'
  | 'radiation';

export type WidgetType =
  // Numeric
  | 'big-number'
  | 'info-card'
  | 'multi-metric'
  // Gauge
  | 'radial-gauge'
  | 'linear-gauge'
  | 'radial-progress'
  // Chart
  | 'sparkline'
  | 'line-chart'
  | 'area-chart'
  // Status
  | 'threshold-alert'
  | 'status-badge';

export type WidgetCategory = 'numeric' | 'gauge' | 'chart' | 'status';

export type WidgetComplexity = 'simple' | 'medium' | 'advanced';

export type WidgetResourceUsage = 'low' | 'medium' | 'high';

export type DataType = 'scalar' | 'time-series' | 'multi-metric' | 'status';

export type SensorStatus = 'online' | 'offline' | 'warning' | 'error';

export type ThresholdStatus = 'safe' | 'warning' | 'critical';

export type TrendDirection = 'up' | 'down' | 'stable';

export type SensorCategory = 'flow' | 'pressure' | 'temperature' | 'electrical' | 'quality' | 'environmental' | 'gas' | 'motion' | 'status' | 'industrial';
