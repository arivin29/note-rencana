export interface ParsedChannelValue {
  channelCode: string;
  idSensorChannel?: string; // Direct database ID for faster lookup
  value: number | null;
  unit: string;
  payloadPath: string;
  parseSuccess: boolean;
  parseError?: string;
}

export interface ParsedSensorData {
  sensorLabel: string;
  idSensor?: string; // Direct database ID for faster lookup
  catalogId: string;
  channels: ParsedChannelValue[];
}

export interface ParsedTelemetry {
  deviceId: string;
  timestamp: Date;
  sensors: ParsedSensorData[];
  metadata?: {
    signalQuality?: number;
    [key: string]: any;
  };
  parseErrors: string[];
}
