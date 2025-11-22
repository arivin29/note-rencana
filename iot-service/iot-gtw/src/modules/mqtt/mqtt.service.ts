import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { IotLogService } from '../iot-log/iot-log.service';
import { LogLabel } from '../../common/enums';
import { Node, NodeUnpairedDevice } from '../../entities/existing';
import { Owner } from '../../entities/existing/owner.entity';

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
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
    @InjectRepository(NodeUnpairedDevice)
    private readonly unpairedDeviceRepository: Repository<NodeUnpairedDevice>,
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,
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
        // Process message silently
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

    // Add default event topic for device feedback
    const eventTopics = topics.map(t => t.replace('/telemetry', '/event'));
    const allTopics = [...topics, ...eventTopics];

    this.logger.log(`🔍 DEBUG: Attempting to subscribe to ${allTopics.length} topic(s): ${allTopics.join(', ')}`);

    allTopics.forEach(topic => {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`❌ Failed to subscribe to topic '${topic}': ${error.message}`);
        } else {
          this.logger.log(`✅ Subscribed to MQTT topic: '${topic}'`);
          this.logger.log(`📡 Now listening for messages on topic: '${topic}'`);
        }
      });
    });

    this.logger.log(`💡 TIP: Publish to any of these topics: ${allTopics.join(', ')}`);
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const messageStr = message.toString();

      // Try to parse as JSON
      let payload: Record<string, any>;
      try {
        payload = JSON.parse(messageStr);
      } catch (parseError) {
        // If not JSON, wrap in object
        payload = {
          raw: messageStr,
          type: 'non-json',
        };
        this.logger.warn(`⚠️  Non-JSON message from '${topic}'`);
      }

      // Auto-detect label from payload
      const label = this.iotLogService.detectLabel(payload);

      // Extract device ID from payload
      const deviceId = this.iotLogService.extractDeviceId(payload);

      if (!deviceId) {
        this.logger.warn(`⚠️  No device_id found in payload from '${topic}'`);
        // Still save to iot_log for debugging
        await this.iotLogService.create({
          label,
          topic,
          payload,
          timestamp: new Date(),
        });
        return;
      }

      // Check if device is paired
      const isPaired = await this.isDevicePaired(deviceId);

      if (!isPaired) {
        // Device is unpaired - track in unpaired_devices table
        this.logger.warn(`🔴 Unpaired device detected: ${deviceId}`);
        await this.trackUnpairedDevice(deviceId, topic, payload);
        
        // Don't save to iot_log for unpaired devices
        this.logger.log(`📍 Device ${deviceId} tracked in unpaired_devices (not saved to iot_log)`);
        return;
      }

      // Device is paired - save to iot_log
      const savedLog = await this.iotLogService.create({
        label,
        topic,
        payload,
        deviceId,
        timestamp: new Date(),
      });

      this.logger.log(`✅ Saved [${label}] ${deviceId} → ${savedLog.id}`);

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

  /**
   * Extract owner code from device_id
   * Format: {OWNER_CODE}-{MAC}
   * Example: DEMO1-00D42390A994 → DEMO1
   */
  private extractOwnerCode(deviceId: string): string | null {
    if (!deviceId || typeof deviceId !== 'string') {
      return null;
    }

    const parts = deviceId.split('-');
    if (parts.length >= 2) {
      return parts[0]; // Return owner code (before first hyphen)
    }

    return null;
  }

  /**
   * Check if device is paired (exists in nodes table)
   */
  private async isDevicePaired(deviceId: string): Promise<boolean> {
    if (!deviceId) {
      return false;
    }

    // Check by serial_number or dev_eui or code
    const node = await this.nodeRepository.findOne({
      where: [
        { serialNumber: deviceId },
        { devEui: deviceId },
        { code: deviceId },
      ],
    });

    return !!node;
  }

  /**
   * Track unpaired device
   */
  private async trackUnpairedDevice(
    deviceId: string,
    topic: string,
    payload: Record<string, any>,
  ): Promise<void> {
    try {
      // Extract owner code from device_id
      const ownerCode = this.extractOwnerCode(deviceId);
      
      let suggestedOwner: string | null = null;

      // Lookup owner by owner_code
      if (ownerCode) {
        const owner = await this.ownerRepository.findOne({
          where: { ownerCode },
        });

        if (owner) {
          suggestedOwner = owner.idOwner;
          this.logger.log(`✅ Found owner for code '${ownerCode}': ${owner.name}`);
        } else {
          this.logger.warn(`⚠️  Owner code '${ownerCode}' not found in database`);
        }
      }

      // Check if device already tracked
      const existing = await this.unpairedDeviceRepository.findOne({
        where: { hardwareId: deviceId },
      });

      if (existing) {
        // Update existing record
        existing.lastSeenAt = new Date();
        existing.lastPayload = payload;
        existing.lastTopic = topic;
        existing.seenCount += 1;
        
        // Update suggested owner if found
        if (suggestedOwner) {
          existing.suggestedOwner = suggestedOwner;
        }

        await this.unpairedDeviceRepository.save(existing);
        this.logger.log(`📝 Updated unpaired device: ${deviceId} (seen ${existing.seenCount} times)`);
      } else {
        // Create new record
        const unpaired = this.unpairedDeviceRepository.create({
          hardwareId: deviceId,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          lastPayload: payload,
          lastTopic: topic,
          seenCount: 1,
          suggestedOwner,
          status: 'pending',
        });

        await this.unpairedDeviceRepository.save(unpaired);
        this.logger.log(`🆕 Tracked new unpaired device: ${deviceId}`);
        
        if (suggestedOwner) {
          this.logger.log(`   → Suggested owner: ${ownerCode}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to track unpaired device: ${error.message}`);
    }
  }
}
