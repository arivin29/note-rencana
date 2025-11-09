export interface SensorType {
  idSensorType: string;
  category: string;
  defaultUnit?: string;
  precision?: number;
}

export interface ReportSensorType extends SensorType {}
