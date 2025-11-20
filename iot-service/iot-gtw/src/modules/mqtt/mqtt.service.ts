import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { IotLogService } from '../iot-log/iot-log.service';
import { LogLabel } from '../../common/enums';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor(
    private readonly configService: ConfigService,
    private readonly iotLogService: IotLogService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to MQTT broker
   */
  private async connect(): Promise<void> {
    const brokerUrl = this.configService.get<string>('mqtt.brokerUrl');
    const clientId = this.configService.get<string>('mqtt.clientId');
    const options = this.configService.get<any>('mqtt.options');

    this.logger.log(`Connecting to MQTT broker: ${brokerUrl}`);

    try {
      this.client = mqtt.connect(brokerUrl, {
        ...options,
        clientId: `${clientId}-${Date.now()}`,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.log('✅ Connected to MQTT broker');
        this.subscribeToTopics();
      });

      this.client.on('error', (error) => {
        this.logger.error(`MQTT connection error: ${error.message}`);
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        this.logger.warn(`Reconnecting to MQTT broker... (attempt ${this.reconnectAttempts})`);

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.logger.error('Max reconnect attempts reached. Stopping reconnection.');
          this.client.end();
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        this.logger.warn('MQTT client is offline');
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('MQTT connection closed');
      });

      this.client.on('message', (topic, message) => {
        // 🔍 DEBUG: Log RAW message IMMEDIATELY when received
        this.logger.log(`🔔 RAW MQTT MESSAGE RECEIVED!`);
        this.logger.log(`   📍 Topic: ${topic}`);
        this.logger.log(`   📦 Message (raw): ${message.toString()}`);
        this.logger.log(`   📏 Length: ${message.length} bytes`);
        this.logger.log(`   ⏰ Timestamp: ${new Date().toISOString()}`);
        
        // Process message
        this.handleMessage(topic, message);
      });

    } catch (error) {
      this.logger.error(`Failed to connect to MQTT broker: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Subscribe to MQTT topics
   */
  private subscribeToTopics(): void {
    // Support multiple topics (comma-separated)
    const topicConfig = this.configService.get<string>('mqtt.topic');
    const topics = topicConfig.split(',').map(t => t.trim());

    this.logger.log(`🔍 DEBUG: Attempting to subscribe to ${topics.length} topic(s): ${topics.join(', ')}`);

    topics.forEach(topic => {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`❌ Failed to subscribe to topic '${topic}': ${error.message}`);
        } else {
          this.logger.log(`✅ Subscribed to MQTT topic: '${topic}'`);
          this.logger.log(`📡 Now listening for messages on topic: '${topic}'`);
        }
      });
    });

    this.logger.log(`💡 TIP: Publish to any of these topics: ${topics.join(', ')}`);
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const messageStr = message.toString();
      
      // ✅ Changed from debug to log so it's always visible
      this.logger.log(`📨 Received MQTT message from topic '${topic}': ${messageStr}`);

      // Try to parse as JSON
      let payload: Record<string, any>;
      try {
        payload = JSON.parse(messageStr);
        this.logger.log(`📦 Parsed as JSON: ${JSON.stringify(payload)}`);
      } catch (parseError) {
        // If not JSON, wrap in object
        payload = {
          raw: messageStr,
          type: 'non-json',
        };
        this.logger.warn(`⚠️  Received non-JSON message from topic '${topic}': ${messageStr}`);
      }

      // Auto-detect label from payload
      const label = this.iotLogService.detectLabel(payload);
      this.logger.log(`🏷️  Detected label: ${label}`);

      // Extract device ID from payload
      const deviceId = this.iotLogService.extractDeviceId(payload);
      if (deviceId) {
        this.logger.log(`🔌 Detected device ID: ${deviceId}`);
      } else {
        this.logger.log(`🔌 No device ID found in payload`);
      }

      // Save to database
      this.logger.log(`💾 Saving to database...`);
      const savedLog = await this.iotLogService.create({
        label,
        topic,
        payload,
        deviceId,
        timestamp: new Date(),
      });

      this.logger.log(`✅ Successfully saved to database with ID: ${savedLog.id} [${label}] from topic '${topic}'`);

    } catch (error) {
      this.logger.error(
        `❌ Failed to handle MQTT message from topic '${topic}': ${error.message}`,
        error.stack,
      );

      // Save error log to database
      try {
        await this.iotLogService.create({
          label: LogLabel.ERROR,
          topic,
          payload: {
            error: error.message,
            stack: error.stack,
            rawMessage: message.toString(),
          },
          timestamp: new Date(),
          notes: 'Failed to process MQTT message',
        });
        this.logger.log(`📝 Error log saved to database`);
      } catch (saveError) {
        this.logger.error(`❌ Failed to save error log: ${saveError.message}`);
      }
    }
  }

  /**
   * Publish message to MQTT topic
   */
  async publish(topic: string, message: string | Buffer | Record<string, any>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    const payload = typeof message === 'object' && !(message instanceof Buffer)
      ? JSON.stringify(message)
      : message;

    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish to topic '${topic}': ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`Published message to topic '${topic}'`);
          resolve();
        }
      });
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      this.logger.log('Disconnecting from MQTT broker...');
      this.client.end();
      this.isConnected = false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}
