import { registerAs } from '@nestjs/config';

export default registerAs('clickhouse', () => ({
  host: process.env.CLICKHOUSE_HOST || 'localhost',
  port: parseInt(process.env.CLICKHOUSE_PORT, 10) || 8123,
  database: process.env.CLICKHOUSE_DATABASE || 'iot',
  username: process.env.CLICKHOUSE_USERNAME || 'iot_ingest',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  
  // Connection settings
  requestTimeout: parseInt(process.env.CLICKHOUSE_REQUEST_TIMEOUT, 10) || 30000,
  compression: {
    request: true,
    response: true,
  },
  
  // Batch insert settings
  batchSize: parseInt(process.env.CLICKHOUSE_BATCH_SIZE, 10) || 1000,
  flushIntervalMs: parseInt(process.env.CLICKHOUSE_FLUSH_INTERVAL_MS, 10) || 5000,
}));
