export interface ParsedChannelValue {
  channelCode: string;
  value: number | null;
  unit: string;
  payloadPath: string;
  parseSuccess: boolean;
  parseError?: string;
}

export interface ParsedSensorData {
  sensorLabel: string;
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
