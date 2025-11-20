import { registerAs } from '@nestjs/config';

export default registerAs('mqtt', () => ({
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  topic: process.env.MQTT_TOPIC || 'sensor',
  clientId: process.env.MQTT_CLIENT_ID || 'iot-gtw-service',
  options: {
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  },
}));
