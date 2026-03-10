import { registerAs } from '@nestjs/config';

export default registerAs('opensearch', () => ({
  // Connection
  url: process.env.OPENSEARCH_URL || 'https://localhost:9200',
  username: process.env.OPENSEARCH_USER || 'admin',
  password: process.env.OPENSEARCH_PASSWORD || '',
  sslVerify: process.env.OPENSEARCH_SSL_VERIFY !== 'false',

  // Index settings
  indexPrefix: process.env.OPENSEARCH_INDEX_PREFIX || 'sensor-telemetry-10min-',
  anomalyIndexPrefix: process.env.OPENSEARCH_ANOMALY_INDEX_PREFIX || 'anomaly-results-',
  shards: parseInt(process.env.OPENSEARCH_SHARDS || '2', 10),
  replicas: parseInt(process.env.OPENSEARCH_REPLICAS || '0', 10),

  // ML Settings
  mlEnabled: process.env.ML_ANOMALY_ENABLED !== 'false',
  mlSensitivity: parseFloat(process.env.ML_ANOMALY_SENSITIVITY || '0.8'),
  mlMinGradeAlert: process.env.ML_ANOMALY_MIN_GRADE_ALERT || 'severe',
  
  // RCF (Random Cut Forest) settings
  useRcf: process.env.ML_USE_RCF !== 'false', // Use OpenSearch RCF detectors; fallback to Z-score if false

  // Forecast Settings
  forecastEnabled: process.env.ML_FORECAST_ENABLED !== 'false',
  forecastHorizonDays: parseInt(process.env.ML_FORECAST_HORIZON_DAYS || '7', 10),
  forecastUpdateHours: parseInt(process.env.ML_FORECAST_UPDATE_HOURS || '12', 10),
  forecastTrainingDays: parseInt(process.env.ML_FORECAST_TRAINING_DAYS || '30', 10),

  // Deviation thresholds for anomaly grading
  deviationMild: parseFloat(process.env.ML_DEVIATION_MILD || '0.20'),
  deviationModerate: parseFloat(process.env.ML_DEVIATION_MODERATE || '0.35'),
  deviationSevere: parseFloat(process.env.ML_DEVIATION_SEVERE || '0.50'),
  deviationCritical: parseFloat(process.env.ML_DEVIATION_CRITICAL || '0.80'),

  // Sync settings
  syncIntervalMinutes: parseInt(process.env.ML_SYNC_INTERVAL_MINUTES || '10', 10),
  syncBatchSize: parseInt(process.env.ML_SYNC_BATCH_SIZE || '1000', 10),
  syncLookbackMinutes: parseInt(process.env.ML_SYNC_LOOKBACK_MINUTES || '15', 10),

  // Retry settings
  retryMaxAttempts: parseInt(process.env.ML_RETRY_MAX_ATTEMPTS || '3', 10),
  retryInitialDelayMs: parseInt(process.env.ML_RETRY_INITIAL_DELAY_MS || '2000', 10),
  retryMaxDelayMs: parseInt(process.env.ML_RETRY_MAX_DELAY_MS || '30000', 10),

  // Circuit breaker
  circuitBreakerFailureThreshold: parseInt(process.env.ML_CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
  circuitBreakerResetTimeoutMs: parseInt(process.env.ML_CIRCUIT_BREAKER_RESET_TIMEOUT_MS || '60000', 10),

  // Backend Integration (for anomaly notifications)
  backendUrl: process.env.IOT_BACKEND_URL || 'http://localhost:3000',
  backendApiKey: process.env.IOT_BACKEND_API_KEY || '',
  notificationEnabled: process.env.ML_NOTIFICATION_ENABLED !== 'false',
}));
