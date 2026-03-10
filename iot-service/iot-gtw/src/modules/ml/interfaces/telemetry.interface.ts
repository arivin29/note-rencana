export interface TelemetryPoint {
  deviceId: string;
  sensorKey: string;
  unitCode: string;
  metricCode?: string;
  timestamp: Date;
  periodStart: Date;
  periodEnd: Date;
  avgValue: number;
  minValue: number;
  maxValue: number;
  sampleCount: number;
  sumValue?: number;
}

export interface AnomalyResult {
  // Either idSensorChannel (UUID) OR deviceId+sensorKey must be provided
  idSensorChannel?: string;
  deviceId: string;
  sensorKey: string;
  timestamp: Date;
  rcfScore: number;
  anomalyGrade: number;
  actualValue: number;
  baselineValue: number;
  deviationPercent: number;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  detectedAt: Date;
  // RCF detector metadata (optional - populated when using RCF detection)
  detectorId?: string;
  detectorName?: string;
}

export interface ForecastPoint {
  deviceId: string;
  sensorKey: string;
  forecastTime: Date;
  predictedValue: number;
  confidenceLower: number;
  confidenceUpper: number;
  modelVersion: string;
  createdAt: Date;
}

export interface OpenSearchBulkItem {
  index: {
    _index: string;
    _id?: string;
  };
}

export interface SyncCheckpoint {
  lastSyncedTimestamp: Date;
  lastSyncedCount: number;
  lastSyncDuration: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailure: Date | null;
  nextAttempt: Date | null;
}
