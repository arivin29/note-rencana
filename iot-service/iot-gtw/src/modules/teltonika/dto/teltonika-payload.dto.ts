export interface TeltonikaRawPayload {
  imei?: string;
  state?: {
    reported?: {
      ts?: number;
      latlng?: string;
      [key: string]: any; // For dynamic AVL IDs (9, 66, 67, 72, etc.)
    };
  };
}

export interface TeltonikaStandardPayload {
  device_id: string;
  timestamp: string; // ISO 8601 UTC format
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  sensors?: {
    temperature?: number;
    voltage?: number;
    adc1?: number;
  };
  metadata?: {
    source: string;
    model: string;
    rssi?: number;
    raw_timestamp?: number; // Original Unix timestamp in ms
  };
}

export interface TeltonikaParseResult {
  success: boolean;
  imei?: string;
  payload?: TeltonikaStandardPayload;
  error?: string;
}
