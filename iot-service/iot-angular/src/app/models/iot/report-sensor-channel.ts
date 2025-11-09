export interface SensorChannel {
  idSensorChannel: string;
  idSensor: string;
  metricCode: string;
  unit: string;
  minThreshold?: number;
  maxThreshold?: number;
  multiplier?: number;
  offset?: number;
  registerAddress?: number;
  precision?: number;
  aggregation?: string;
  alertSuppressionWindow?: number;
}

export interface ReportSensorChannel extends SensorChannel {}
