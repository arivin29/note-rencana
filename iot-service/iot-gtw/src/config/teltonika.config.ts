import { registerAs } from '@nestjs/config';

export default registerAs('teltonika', () => ({
  tcpPort: parseInt(process.env.TELTONIKA_TCP_PORT, 10) || 5027,
  // Default ON; only an explicit "false" disables (on-prem installs where devices
  // still report to the Helios cloud gateway).
  enabled: (process.env.TELTONIKA_ENABLED || 'true').toLowerCase() !== 'false',
  mqttPublish: (process.env.TELTONIKA_MQTT_PUBLISH || 'true').toLowerCase() !== 'false',
  timeout: parseInt(process.env.TELTONIKA_TIMEOUT, 10) || 30000,
  maxConnections: parseInt(process.env.TELTONIKA_MAX_CONNECTIONS, 10) || 100,
}));
