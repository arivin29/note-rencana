import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 50; // Allow many retries

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://109.105.194.174:8366';
    const username = process.env.MQTT_USERNAME || '';
    const password = process.env.MQTT_PASSWORD || '';

    this.logger.log(`Connecting to MQTT broker: ${brokerUrl}`);

    const options: mqtt.IClientOptions = {
      clientId: `iot-backend-${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 5000, // Retry every 5 seconds
      keepalive: 60, // Send ping every 60 seconds
    };

    if (username && password) {
      options.username = username;
      options.password = password;
    }

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset counter on successful connection
      this.logger.log('✅ Connected to MQTT broker');
      this.logger.log('🔄 Auto-reconnect enabled (every 5s if disconnected)');
    });

    this.client.on('error', (error) => {
      this.logger.error(`❌ MQTT connection error: ${error.message}`);
      this.isConnected = false;
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      this.logger.warn('⚠️  Disconnected from MQTT broker');
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      this.logger.warn('📴 MQTT client is offline - will auto-reconnect...');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      this.logger.log(`🔄 Reconnecting to MQTT broker... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      // Only stop after max attempts
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.logger.error(`❌ Max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`);
        this.client.end(true);
      }
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('🔌 MQTT connection closed');
    });

    // Wait for connection (but don't block if it fails)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          this.logger.warn('⚠️  Initial connection timeout - will retry in background');
          resolve(); // Don't block startup
        }
      }, 10000); // 10 second timeout

      this.client.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client.once('error', (error) => {
        clearTimeout(timeout);
        this.logger.error(`❌ Initial connection failed: ${error.message} - will retry in background`);
        resolve(); // Don't block startup, let auto-reconnect handle it
      });
    });
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      this.logger.log('Disconnecting from MQTT broker...');
      await this.client.endAsync();
      this.isConnected = false;
      this.logger.log('Disconnected from MQTT broker');
    }
  }

  /**
   * Publish a message to MQTT topic
   * @param topic - MQTT topic to publish to
   * @param payload - Message payload (object will be JSON stringified)
   * @param qos - Quality of Service (0, 1, or 2)
   */
  async publish(topic: string, payload: any, qos: 0 | 1 | 2 = 1): Promise<void> {
    if (!this.isClientConnected()) {
      const errorMsg = 'MQTT client is not connected. Auto-reconnect is active, please retry in a moment.';
      this.logger.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos }, (error) => {
        if (error) {
          this.logger.error(`❌ Failed to publish to ${topic}: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`📤 Published to ${topic}`);
          this.logger.debug(`   Payload: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
          resolve();
        }
      });
    });
  }

  /**
   * Publish device command to specific device
   * @param deviceId - Device ID
   * @param command - Command payload
   */
  async publishDeviceCommand(deviceId: string, command: any): Promise<void> {
    const topic = `sensor/${deviceId}/command`;
    await this.publish(topic, command, 1);
  }

  /**
   * Check if MQTT client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client && this.client.connected;
  }

  /**
   * Get connection status with details
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    autoReconnect: boolean;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      autoReconnect: this.reconnectAttempts < this.maxReconnectAttempts,
    };
  }

  /**
   * Force reconnection (useful if auto-reconnect stopped)
   */
  async forceReconnect(): Promise<void> {
    this.logger.log('🔄 Forcing reconnection...');
    
    if (this.client) {
      this.client.end(true);
    }
    
    this.reconnectAttempts = 0; // Reset counter
    await this.connect();
  }

  /**
   * Get MQTT client instance (for advanced usage)
   */
  getClient(): mqtt.MqttClient {
    return this.client;
  }
}
