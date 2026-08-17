import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { IotLogService } from '../iot-log/iot-log.service';
import { LogLabel } from '../../common/enums';
import { Node, NodeUnpairedDevice, Sensor, SensorCatalog } from '../../entities/existing';
import { Owner } from '../../entities/existing/owner.entity';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MqttService.name);
    private client: mqtt.MqttClient;
    private isConnected = false;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 10;
    private readonly slowReconnectPeriodMs = 10000;

    constructor(
        private readonly configService: ConfigService,
        private readonly iotLogService: IotLogService,
        @InjectRepository(Node)
        private readonly nodeRepository: Repository<Node>,
        @InjectRepository(NodeUnpairedDevice)
        private readonly unpairedDeviceRepository: Repository<NodeUnpairedDevice>,
        @InjectRepository(Owner)
        private readonly ownerRepository: Repository<Owner>,
        @InjectRepository(Sensor)
        private readonly sensorRepository: Repository<Sensor>,
        @InjectRepository(SensorCatalog)
        private readonly sensorCatalogRepository: Repository<SensorCatalog>,
    ) { }

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
                (this.client as any).options.reconnectPeriod = options?.reconnectPeriod ?? 1000;
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

                // Never give up (a dead ingest = silent data loss until someone
                // restarts pm2). After the fast attempts, back off to a slow
                // steady interval so a long broker outage doesn't spam logs.
                if (this.reconnectAttempts === this.maxReconnectAttempts) {
                    this.logger.error(
                        `MQTT broker still unreachable after ${this.maxReconnectAttempts} attempts — ` +
                        `switching to slow retry every ${this.slowReconnectPeriodMs / 1000}s (will keep trying)`,
                    );
                    (this.client as any).options.reconnectPeriod = this.slowReconnectPeriodMs;
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
        
        // Add config request topic (wildcard for all devices)
        const configTopic = 'get_config/+';
        
        // Add time check topic
        const timeCheckTopic = 'cek_waktu';

        const allTopics = [...topics, ...eventTopics, configTopic, timeCheckTopic];

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
        this.logger.log(`🔧 CONFIG: Devices can request config via: get_config/{device_id}`);
        this.logger.log(`⏰ TIME CHECK: Devices can check server time via: cek_waktu`);
    }

    /**
     * Handle incoming MQTT messages
     */
    private async handleMessage(topic: string, message: Buffer): Promise<void> {
        try {
            // Handle time check topic: cek_waktu
            if (topic === 'cek_waktu') {
                await this.handleCekWaktu(topic, message);
                return;
            }

            // Handle config request topic: get_config/{device_id}
            if (topic.startsWith('get_config/')) {
                await this.handleConfigRequest(topic, message);
                return;
            }

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

            // Auto-update node connectivity status to 'online'
            await this.updateNodeConnectivity(deviceId);

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
     * Update node connectivity status when telemetry received
     */
    private async updateNodeConnectivity(deviceId: string): Promise<void> {
        try {
            // Find node by serial_number, dev_eui, or code
            const node = await this.nodeRepository.findOne({
                where: [
                    { serialNumber: deviceId },
                    { devEui: deviceId },
                    { code: deviceId },
                ],
            });

            if (!node) {
                this.logger.warn(`⚠️  Node not found for connectivity update: ${deviceId}`);
                return;
            }

            // Update connectivity status to 'online' and last_seen_at
            const wasOffline = node.connectivityStatus !== 'online';
            node.connectivityStatus = 'online';
            node.lastSeenAt = new Date();

            await this.nodeRepository.save(node);

            if (wasOffline) {
                this.logger.log(`🟢 Node ${deviceId} status changed to ONLINE`);
            }
        } catch (error) {
            this.logger.error(`❌ Failed to update node connectivity: ${error.message}`);
        }
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

            // Check if device already tracked - USE RAW QUERY to preserve JSONB array type
            const rawResult = await this.unpairedDeviceRepository.query(
                `SELECT id_node_unpaired_device, hardware_id, last_seen_at, last_topic, 
                        seen_count, suggested_owner, last_payload
                 FROM node_unpaired_devices 
                 WHERE hardware_id = $1 
                 LIMIT 1`,
                [deviceId]
            );

            const existing = rawResult && rawResult.length > 0 ? rawResult[0] : null;
            
            if (existing) {
                this.logger.debug(`🔍 RAW last_payload type: ${typeof existing.last_payload}, isArray: ${Array.isArray(existing.last_payload)}`);
                if (Array.isArray(existing.last_payload)) {
                    this.logger.log(`✅ Array detected with ${existing.last_payload.length} items`);
                } else {
                    this.logger.warn(`⚠️  Not an array! Type: ${typeof existing.last_payload}`);
                }
            }

            if (existing) {
                // Update existing record
                const newSeenCount = (existing.seen_count || 0) + 1;

                // Update payload history (keep last 10)
                // With raw query, lastPayload should correctly be array from JSONB
                let payloadHistory: any[] = [];
                
                this.logger.debug(`🔍 DEBUG: existing.last_payload type: ${typeof existing.last_payload}, isArray: ${Array.isArray(existing.last_payload)}`);
                
                if (Array.isArray(existing.last_payload)) {
                    payloadHistory = existing.last_payload;
                    this.logger.debug(`✅ Using existing array with ${payloadHistory.length} items`);
                } else if (existing.last_payload && typeof existing.last_payload === 'object') {
                    // OLD FORMAT DETECTED: Database has object, not array
                    // RESET to empty array and start fresh (don't convert old object)
                    payloadHistory = [];
                    this.logger.warn(`🔄 OLD FORMAT DETECTED! Resetting to empty array (old object discarded)`);
                } else {
                    this.logger.debug(`⚠️  last_payload is null/undefined, starting fresh array`);
                }

                this.logger.debug(`📊 Before unshift: array length = ${payloadHistory.length}`);

                // Add new payload at the beginning (index 0 = newest)
                payloadHistory.unshift({
                    payload,
                    timestamp: new Date(),
                });

                this.logger.debug(`📊 After unshift: array length = ${payloadHistory.length}`);

                // Keep only last 10 payloads
                const finalPayload = payloadHistory.slice(0, 10);

                this.logger.debug(`📊 Final payload array length = ${finalPayload.length}`);

                // Update suggested owner if found (keep existing if no new suggestion)
                const finalSuggestedOwner = suggestedOwner || existing.suggested_owner;

                // CRITICAL FIX: Use direct SQL query to force JSONB array type
                // TypeORM's .save() and QueryBuilder .set() both convert array back to object
                const payloadJson = JSON.stringify(finalPayload);
                
                await this.unpairedDeviceRepository.query(
                    `UPDATE node_unpaired_devices 
                     SET last_seen_at = $1,
                         last_topic = $2,
                         seen_count = $3,
                         suggested_owner = $4,
                         last_payload = $5::jsonb
                     WHERE id_node_unpaired_device = $6`,
                    [
                        new Date(),
                        topic,
                        newSeenCount,
                        finalSuggestedOwner,
                        payloadJson,
                        existing.id_node_unpaired_device,
                    ]
                );

                this.logger.debug(`✅ Saved with direct SQL query - payload: ${payloadJson.substring(0, 150)}...`);
                this.logger.log(`📝 Updated unpaired device: ${deviceId} (seen ${newSeenCount} times, history: ${finalPayload.length}/10)`);
            } else {
                // Create new record with payload in array format
                const unpaired = this.unpairedDeviceRepository.create({
                    hardwareId: deviceId,
                    firstSeenAt: new Date(),
                    lastSeenAt: new Date(),
                    lastPayload: [{
                        payload,
                        timestamp: new Date(),
                    }],
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

    /**
     * Handle config request from device
     * Topic: get_config/{device_id}
     * Response: stream_config/{device_id}
     */
    private async handleConfigRequest(topic: string, message: Buffer): Promise<void> {
        try {
            // Extract device_id from topic: get_config/{device_id}
            const deviceId = topic.split('/')[1];
            
            if (!deviceId) {
                this.logger.error(`❌ Invalid config request topic: ${topic}`);
                return;
            }

            const messageStr = message.toString();
            this.logger.log(`🔧 Config request from device: ${deviceId} (payload: "${messageStr}")`);

            // Get default configs from ENV
            const deviceDefaults = this.configService.get('deviceDefaults');

            // Check if device exists in database
            const node = await this.nodeRepository.findOne({
                where: [
                    { serialNumber: deviceId },
                    { devEui: deviceId },
                    { code: deviceId },
                ],
            });

            let config: any = null;

            if (!node) {
                this.logger.warn(`⚠️  Device ${deviceId} not found in database - sending minimal config with defaults`);
                
                // Device not found - send minimal config with ENV defaults
                config = {
                    device_id: deviceId,
                    config_version: deviceDefaults.version,
                    updated_at: new Date().toISOString(),
                    network: {
                        lte: {
                            retry_interval_ms: deviceDefaults.network.lte.retryIntervalMs,
                            max_retries_before_reboot: deviceDefaults.network.lte.maxRetriesBeforeReboot,
                            reboot_count_before_offline: deviceDefaults.network.lte.rebootCountBeforeOffline,
                            offline_pause_minutes: deviceDefaults.network.lte.offlinePauseMinutes,
                        },
                        watchdog: {
                            enabled: deviceDefaults.network.watchdog.enabled,
                            timeout_minutes: deviceDefaults.network.watchdog.timeoutMinutes,
                            pause_during_offline: deviceDefaults.network.watchdog.pauseDuringOffline,
                        },
                        offline_mode: {
                            auto_detect_no_sim: deviceDefaults.network.offlineMode.autoDetectNoSim,
                            auto_recheck_sim_minutes: deviceDefaults.network.offlineMode.autoRecheckSimMinutes,
                            max_offline_cycles_before_restart: deviceDefaults.network.offlineMode.maxOfflineCyclesBeforeRestart,
                        },
                    },
                    rs485: {
                        persist_to_sd: deviceDefaults.rs485Behavior.persistToSd,
                        read_in_offline_mode: deviceDefaults.rs485Behavior.readInOfflineMode,
                        devices: [], // Empty for unpaired devices
                    },
                    node: {
                        telemetry_interval_ms: 60000, // Default 1 minute for unpaired
                        rs485_scan_interval_ms: deviceDefaults.nodeAdvanced.rs485ScanIntervalMs,
                        sync_rate_limit_ms: deviceDefaults.nodeAdvanced.syncRateLimitMs,
                        sync_max_burst: deviceDefaults.nodeAdvanced.syncMaxBurst,
                        sync_pause_after_burst_ms: deviceDefaults.nodeAdvanced.syncPauseAfterBurstMs,
                    },
                };
            } else {
                this.logger.log(`✅ Device ${deviceId} found - fetching RS485 configs from sensor catalogs`);
                
                // Get RS485 configs from database (sensor_catalogs.default_channels_json)
                const rs485Devices = await this.getRS485ConfigFromDatabase(node.idNode);
                
                if (!rs485Devices || rs485Devices.length === 0) {
                    this.logger.warn(`⚠️  No sensor configs found for device ${deviceId}`);
                }
                
                // Build full config with database + ENV defaults
                config = {
                    device_id: deviceId,
                    config_version: deviceDefaults.version,
                    updated_at: node.updatedAt.toISOString(),
                    network: {
                        lte: {
                            retry_interval_ms: deviceDefaults.network.lte.retryIntervalMs,
                            max_retries_before_reboot: deviceDefaults.network.lte.maxRetriesBeforeReboot,
                            reboot_count_before_offline: deviceDefaults.network.lte.rebootCountBeforeOffline,
                            offline_pause_minutes: deviceDefaults.network.lte.offlinePauseMinutes,
                        },
                        watchdog: {
                            enabled: deviceDefaults.network.watchdog.enabled,
                            timeout_minutes: deviceDefaults.network.watchdog.timeoutMinutes,
                            pause_during_offline: deviceDefaults.network.watchdog.pauseDuringOffline,
                        },
                        offline_mode: {
                            auto_detect_no_sim: deviceDefaults.network.offlineMode.autoDetectNoSim,
                            auto_recheck_sim_minutes: deviceDefaults.network.offlineMode.autoRecheckSimMinutes,
                            max_offline_cycles_before_restart: deviceDefaults.network.offlineMode.maxOfflineCyclesBeforeRestart,
                        },
                    },
                    rs485: {
                        persist_to_sd: deviceDefaults.rs485Behavior.persistToSd,
                        read_in_offline_mode: deviceDefaults.rs485Behavior.readInOfflineMode,
                        devices: rs485Devices || [], // From database
                    },
                    node: {
                        telemetry_interval_ms: node.telemetryIntervalSec * 1000, // Convert seconds to milliseconds
                        rs485_scan_interval_ms: deviceDefaults.nodeAdvanced.rs485ScanIntervalMs,
                        sync_rate_limit_ms: deviceDefaults.nodeAdvanced.syncRateLimitMs,
                        sync_max_burst: deviceDefaults.nodeAdvanced.syncMaxBurst,
                        sync_pause_after_burst_ms: deviceDefaults.nodeAdvanced.syncPauseAfterBurstMs,
                    },
                };
            }

            // Publish response to stream_config/{device_id} (unified topic for pull & push)
            const responseTopic = `stream_config/${deviceId}`;
            const responsePayload = JSON.stringify(config);

            await this.publish(responseTopic, responsePayload);

            this.logger.log(`📤 Config sent via stream_config: ${responseTopic}`);
            this.logger.log(`   📋 Config version: ${config.config_version}`);
            this.logger.log(`   🔌 RS485 devices: ${config.rs485.devices.length}`);
            this.logger.log(`   ⏱️  Telemetry interval: ${config.node.telemetry_interval_ms}ms`);
            
            // Log to database
            await this.iotLogService.create({
                label: LogLabel.COMMAND,
                topic: responseTopic,
                payload: config,
                deviceId: node ? deviceId : undefined,
                timestamp: new Date(),
                notes: `Config ${config ? 'sent' : 'not found'} for device ${deviceId}`,
            });

        } catch (error) {
            this.logger.error(`❌ Failed to handle config request: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle time check request from device
     * Topic: cek_waktu
     * Response: cek_waktu/response
     */
    private async handleCekWaktu(topic: string, message: Buffer): Promise<void> {
        try {
            const requestPayloadStr = message.toString();
            this.logger.log(`[MqttService] ⏰ Received 'cek_waktu' request with payload: "${requestPayloadStr}"`);

            const now = new Date();
            const utcTimezone = 'UTC';

            // Format for local display (e.g., "21/11/2024, 14:30:45")
            const localFormatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: utcTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });
            const localTimeString = localFormatter.format(now);

            // Get Unix timestamp (seconds)
            const unixTimestamp = Math.floor(now.getTime() / 1000);

            // Echo request payload if it's valid JSON
            let requestJson: any;
            try {
                requestJson = requestPayloadStr ? JSON.parse(requestPayloadStr) : {};
            } catch (e) {
                // If not JSON, treat as a simple string ping
                requestJson = { raw_request: requestPayloadStr };
            }

            const responsePayload = {
                status: 'ok',
                message: 'Server time response',
                server_time: {
                    iso: now.toISOString(),
                    local: localTimeString,
                    timezone: utcTimezone,
                    unix: unixTimestamp,
                },
                request: requestJson,
                received_at: new Date().toISOString(),
            };

            const responseTopic = 'cek_waktu/response';
            await this.publish(responseTopic, responsePayload);

            this.logger.log(`[MqttService] ⏰ PING/PONG: Responded to 'cek_waktu' request`);
            this.logger.log(`   📅 Server Time (UTC): ${now.toISOString()}`);
            this.logger.log(`   📤 Response published to: ${responseTopic}`);

        } catch (error) {
            this.logger.error(`❌ Failed to handle 'cek_waktu' request: ${error.message}`, error.stack);
        }
    }
    
    /**
     * Get RS485 config from database (sensor_catalogs.default_channels_json)
     * Returns array of configs (one per sensor attached to the node)
     */
    private async getRS485ConfigFromDatabase(idNode: string): Promise<any[] | null> {
        try {
            // Get all sensors for this node
            const sensors = await this.sensorRepository.find({
                where: { idNode },
            });

            if (!sensors || sensors.length === 0) {
                this.logger.warn(`⚠️  No sensors found for node ${idNode}`);
                return null;
            }

            this.logger.log(`📡 Found ${sensors.length} sensor(s) for node ${idNode}`);

            // Get sensor catalogs for all sensors
            const configs: any[] = [];
            
            for (const sensor of sensors) {
                if (!sensor.idSensorCatalog) {
                    this.logger.warn(`⚠️  Sensor ${sensor.idSensor} has no catalog assigned`);
                    continue;
                }

                const catalog = await this.sensorCatalogRepository.findOne({
                    where: { idSensorCatalog: sensor.idSensorCatalog },
                });

                if (!catalog) {
                    this.logger.warn(`⚠️  Catalog ${sensor.idSensorCatalog} not found`);
                    continue;
                }

                if (!catalog.defaultChannelsJson) {
                    this.logger.warn(`⚠️  Catalog ${catalog.vendor} ${catalog.modelName} has no default_channels_json`);
                    continue;
                }

                // default_channels_json is already an array, extract first element
                const channelConfigs = Array.isArray(catalog.defaultChannelsJson) 
                    ? catalog.defaultChannelsJson 
                    : [catalog.defaultChannelsJson];

                for (const channelConfig of channelConfigs) {
                    configs.push({
                        sensor_id: sensor.idSensor,
                        sensor_label: sensor.label,
                        vendor: catalog.vendor,
                        model: catalog.modelName,
                        ...channelConfig, // version, baud_rate, modbus_address, registers, etc
                    });

                    this.logger.log(`✅ Loaded config for sensor: ${sensor.label} (${catalog.vendor} ${catalog.modelName})`);
                }
            }

            return configs.length > 0 ? configs : null;

        } catch (error) {
            this.logger.error(`❌ Failed to get RS485 config from database: ${error.message}`, error.stack);
            return null;
        }
    }
}
