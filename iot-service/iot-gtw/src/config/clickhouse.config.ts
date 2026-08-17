import { registerAs } from '@nestjs/config';

export default registerAs('clickhouse', () => {
  const host = process.env.CLICKHOUSE_HOST || 'localhost';
  const port = parseInt(process.env.CLICKHOUSE_PORT, 10) || 8123;
  
  return {
    // Set CLICKHOUSE_ENABLED=false on on-prem installs without ClickHouse:
    // the service becomes a no-op (no connect, no retries, isReady() === false).
    enabled: (process.env.CLICKHOUSE_ENABLED || 'true').toLowerCase() !== 'false',
    host,
    port,
    database: process.env.CLICKHOUSE_DATABASE || 'iot',
    username: process.env.CLICKHOUSE_USERNAME || 'iot_ingest',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    
    // Constructed URL for clients that need it
    url: `http://${host}:${port}`,
    
    // Connection settings
    requestTimeout: parseInt(process.env.CLICKHOUSE_REQUEST_TIMEOUT, 10) || 30000,
    compression: {
      request: true,
      response: true,
    },
    
    // Batch insert settings
    batchSize: parseInt(process.env.CLICKHOUSE_BATCH_SIZE, 10) || 1000,
    flushIntervalMs: parseInt(process.env.CLICKHOUSE_FLUSH_INTERVAL_MS, 10) || 5000,
  };
});
