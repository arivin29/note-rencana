export interface SensorCatalog {
  idSensorCatalog: string;
  vendor: string;
  modelName: string;
  iconAsset?: string;
  iconColor?: string;
  datasheetUrl?: string;
  firmware?: string;
  calibrationIntervalDays?: number;
  defaultChannelsJson?: Record<string, unknown>;
  defaultThresholdsJson?: Record<string, unknown>;
}

export interface ReportSensorCatalog extends SensorCatalog {}
