import { registerAs } from '@nestjs/config';

export default registerAs('teltonika', () => ({
  tcpPort: parseInt(process.env.TELTONIKA_TCP_PORT, 10) || 5027,
  enabled: process.env.TELTONIKA_ENABLED === 'true' || true,
  mqttPublish: process.env.TELTONIKA_MQTT_PUBLISH === 'true' || true,
  timeout: parseInt(process.env.TELTONIKA_TIMEOUT, 10) || 30000,
  maxConnections: parseInt(process.env.TELTONIKA_MAX_CONNECTIONS, 10) || 100,
}));
