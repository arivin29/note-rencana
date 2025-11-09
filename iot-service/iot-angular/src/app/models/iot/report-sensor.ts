import { SensorType, ReportSensorType } from './report-sensor-type';
import { SensorCatalog, ReportSensorCatalog } from './report-sensor-catalog';
import { SensorChannel, ReportSensorChannel } from './report-sensor-channel';

export interface Sensor {
  idSensor: string;
  idNode: string;
  idSensorCatalog?: string;
  idSensorType: string;
  label: string;
  protocolChannel?: string;
  calibrationFactor?: number;
  samplingRate?: number;
  installDate?: string;
  calibrationDueAt?: string;
}

export interface ReportSensor extends Sensor {
  sensorType: ReportSensorType | SensorType;
  catalog?: ReportSensorCatalog | SensorCatalog;
  channels: Array<ReportSensorChannel | SensorChannel>;
}
