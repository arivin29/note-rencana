import { registerAs } from '@nestjs/config';

export default registerAs('clickhouse', () => ({
  host: process.env.CLICKHOUSE_HOST || 'localhost',
  port: parseInt(process.env.CLICKHOUSE_PORT || '8123', 10),
  database: process.env.CLICKHOUSE_DATABASE || 'iot',
  username: process.env.CLICKHOUSE_USERNAME || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  requestTimeout: parseInt(process.env.CLICKHOUSE_REQUEST_TIMEOUT || '30000', 10),
  enabled: process.env.CLICKHOUSE_ENABLED === 'true',
}));
