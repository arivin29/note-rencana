/**
 * ClickHouse DTOs for IoT Telemetry
 * 
 * This service only handles INSERT operations.
 * Grafana queries ClickHouse directly for data visualization.
 */

/**
 * DTO for inserting sensor telemetry data
 */
export interface SensorTelemetryDto {
  event_time: Date;
  device_id: string;
  owner_code: string;
  owner_id: string;
  project_code: string;
  project_id: string;
  node_id: string;
  node_code: string;
  node_model: string;
  sensor_id: string;
  sensor_label: string;
  sensor_catalog: string;
  channel_id: string;
  metric_code: string;
  metric_unit: string;
  raw_value: number;
  eng_value: number;
  min_threshold: number;
  max_threshold: number;
  signal_quality?: number;
  firmware_version?: string;
  iot_log_id: string;
  pg_sensor_log_id?: string;
}

/**
 * DTO for sensor channel latest status
 */
export interface SensorChannelLatestDto {
  channel_id: string;
  last_update: Date;
  device_id: string;
  owner_code: string;
  owner_id: string;
  project_code: string;
  project_id: string;
  node_id: string;
  node_code: string;
  node_model: string;
  sensor_id: string;
  sensor_label: string;
  sensor_catalog: string;
  metric_code: string;
  metric_unit: string;
  raw_value: number;
  eng_value: number;
  min_threshold: number;
  max_threshold: number;
  signal_quality?: number;
  last_iot_log_id: string;
}

/**
 * DTO for node latest status
 */
export interface NodeLatestDto {
  node_id: string;
  device_id: string;
  last_seen: Date;
  owner_code: string;
  owner_id: string;
  project_code: string;
  project_id: string;
  node_code: string;
  node_model: string;
  signal_quality?: number;
  firmware_version?: string;
  ip_address?: string;
  total_channels?: number;
  active_channels?: number;
}
