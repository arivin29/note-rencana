import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IotLog } from '../../entities';
import {
  Node,
  NodeProfile,
  NodeUnpairedDevice,
  Owner,
  Project,
  Sensor,
  SensorChannel,
  SensorLog,
} from '../../entities/existing';
import { TelemetryParserService } from './telemetry-parser.service';
import { ProcessTelemetryResultDto, BulkProcessResultDto } from './dto/process-telemetry.dto';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { SensorTelemetryDto, SensorChannelLatestDto, NodeLatestDto } from '../clickhouse/dto';

@Injectable()
export class TelemetryProcessorService {
  private readonly logger = new Logger(TelemetryProcessorService.name);

  constructor(
    @InjectRepository(IotLog)
    private readonly iotLogRepository: Repository<IotLog>,
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
    @InjectRepository(NodeProfile)
    private readonly nodeProfileRepository: Repository<NodeProfile>,
    @InjectRepository(NodeUnpairedDevice)
    private readonly nodeUnpairedDeviceRepository: Repository<NodeUnpairedDevice>,
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
    @InjectRepository(SensorChannel)
    private readonly sensorChannelRepository: Repository<SensorChannel>,
    @InjectRepository(SensorLog)
    private readonly sensorLogRepository: Repository<SensorLog>,
    private readonly telemetryParser: TelemetryParserService,
    private readonly clickhouseService: ClickhouseService,
  ) {}

  /**
   * Process unprocessed telemetry logs
   */
  async processUnprocessedLogs(limit = 100): Promise<BulkProcessResultDto> {
    const startTime = Date.now();

    // Find unprocessed telemetry logs
    const unprocessedLogs = await this.iotLogRepository.find({
      where: {
        label: 'telemetry' as any,
        processed: false,
      },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    this.logger.log(`Found ${unprocessedLogs.length} unprocessed telemetry logs`);

    const results: ProcessTelemetryResultDto[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const iotLog of unprocessedLogs) {
      const result = await this.processIotLog(iotLog);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    const totalTime = Date.now() - startTime;

    this.logger.log(
      `Processed ${unprocessedLogs.length} logs in ${totalTime}ms. ` +
      `Success: ${successCount}, Failed: ${failureCount}`
    );

    return {
      totalProcessed: unprocessedLogs.length,
      successCount,
      failureCount,
      results,
      totalProcessingTimeMs: totalTime,
    };
  }

  /**
   * Process single iot_log entry
   */
  async processIotLog(iotLog: IotLog): Promise<ProcessTelemetryResultDto> {
    const startTime = Date.now();
    const errors: string[] = [];

    // this.logger.debug(`🔍 Processing IoT Log: ${iotLog.id} | device_id: ${iotLog.deviceId}`);
    try {
      // 1. Check if this is a pure IMEI (Teltonika device)
      const isPureIMEI = /^\d{15}$/.test(iotLog.deviceId);
      let ownerValidation;
      
      if (isPureIMEI) {
        // Skip owner validation for IMEI-based devices (Teltonika)
        // Owner will be determined from node's project
        this.logger.debug(`Device ${iotLog.deviceId} is IMEI format, skipping owner validation`);
        ownerValidation = { isValid: true, skipValidation: true };
      } else {
        // Normal validation for ESP32-style device IDs
        ownerValidation = await this.validateOwnerCode(iotLog.deviceId);
        
        if (!ownerValidation.isValid) {
          errors.push(`Owner validation failed: ${ownerValidation.error}`);
          await this.markAsProcessed(iotLog, false, errors.join('; '));

          return {
            success: false,
            iotLogId: iotLog.id,
            sensorsProcessed: 0,
            channelsProcessed: 0,
            sensorLogsCreated: 0,
            errors,
            processingTimeMs: Date.now() - startTime,
          };
        }
      }

      // 2. Find node by device_id
      const node = await this.findNodeByDeviceId(iotLog.deviceId || iotLog.payload);

      if (!node) {
        // Track as unpaired device
        await this.trackUnpairedDevice(
          iotLog.deviceId,
          iotLog.payload,
          iotLog.topic,
          undefined,
          ownerValidation.skipValidation ? undefined : ownerValidation.owner?.idOwner,
        );

        errors.push(`Node not found for device_id: ${iotLog.deviceId} - tracked as unpaired`);
        await this.markAsProcessed(iotLog, false, errors.join('; '));

        return {
          success: false,
          iotLogId: iotLog.id,
          sensorsProcessed: 0,
          channelsProcessed: 0,
          sensorLogsCreated: 0,
          errors,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 3. Check if node has profile
      if (!node.idNodeProfile) {
        // Track as unpaired device (node exists but not configured)
        await this.trackUnpairedDevice(
          iotLog.deviceId,
          iotLog.payload,
          iotLog.topic,
          node.idNode,
          ownerValidation.skipValidation ? undefined : ownerValidation.owner?.idOwner,
        );

        errors.push(`Node ${node.code} has no assigned profile - tracked as unpaired`);
        await this.markAsProcessed(iotLog, false, errors.join('; '));

        return {
          success: false,
          iotLogId: iotLog.id,
          nodeCode: node.code,
          sensorsProcessed: 0,
          channelsProcessed: 0,
          sensorLogsCreated: 0,
          errors,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 4. Load node profile with mapping
      const profile = await this.nodeProfileRepository.findOne({
        where: { idNodeProfile: node.idNodeProfile },
      });

      if (!profile || !profile.enabled) {
        errors.push(`Profile not found or disabled for node ${node.code}`);
        await this.markAsProcessed(iotLog, false, errors.join('; '));

        return {
          success: false,
          iotLogId: iotLog.id,
          nodeCode: node.code,
          sensorsProcessed: 0,
          channelsProcessed: 0,
          sensorLogsCreated: 0,
          errors,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 5. Load project to get id_owner
      const project = await this.projectRepository.findOne({
        where: { idProject: node.idProject },
      });

      if (!project) {
        errors.push(`Project not found for node ${node.code}`);
        await this.markAsProcessed(iotLog, false, errors.join('; '));

        return {
          success: false,
          iotLogId: iotLog.id,
          nodeCode: node.code,
          profileCode: profile.code,
          sensorsProcessed: 0,
          channelsProcessed: 0,
          sensorLogsCreated: 0,
          errors,
          processingTimeMs: Date.now() - startTime,
        };
      }

      const idOwner = project.idOwner;

      // 6. Parse payload using profile mapping
      const parsedTelemetry = this.telemetryParser.parse(iotLog.payload, profile.mappingJson);

      if (parsedTelemetry.parseErrors.length > 0) {
        errors.push(...parsedTelemetry.parseErrors);
      }

      // 7. Load node's sensors with channels and sensor types
      const sensors = await this.sensorRepository.find({
        where: { idNode: node.idNode },
        relations: ['channels', 'channels.sensorType'],
      });

      if (sensors.length === 0) {
        errors.push(`No sensors found for node ${node.code}`);
        await this.markAsProcessed(iotLog, false, errors.join('; '));

        return {
          success: false,
          iotLogId: iotLog.id,
          nodeCode: node.code,
          profileCode: profile.code,
          sensorsProcessed: 0,
          channelsProcessed: 0,
          sensorLogsCreated: 0,
          errors,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Get node model name for ClickHouse denormalization
      const nodeModel = await this.nodeRepository.findOne({
        where: { idNode: node.idNode },
        relations: ['nodeModel'],
      });
      const nodeModelName = nodeModel?.nodeModel?.modelName || 'Unknown';

      // Get sensor catalog names for ClickHouse denormalization
      const sensorCatalogMap = new Map<string, string>();
      for (const s of sensors) {
        if (s.idSensorCatalog) {
          sensorCatalogMap.set(s.idSensor, s.idSensorCatalog);
        }
      }

      // 8. Match parsed data with actual sensors and save sensor_logs
      let sensorsProcessed = 0;
      let channelsProcessed = 0;
      let sensorLogsCreated = 0;

      // Collect data for ClickHouse batch insert
      const clickhouseTelemetryBatch: SensorTelemetryDto[] = [];
      const clickhouseChannelLatestBatch: SensorChannelLatestDto[] = [];

      for (const parsedSensor of parsedTelemetry.sensors) {
        // Find matching sensor by idSensor (if present), fallback to label
        let sensor = null;
        if (parsedSensor.idSensor) {
          sensor = sensors.find(s => s.idSensor === parsedSensor.idSensor);
        }
        if (!sensor) {
          sensor = sensors.find(s => s.label === parsedSensor.sensorLabel);
        }

        if (!sensor) {
          errors.push(`Sensor not found: ${parsedSensor.sensorLabel || parsedSensor.idSensor}`);
          continue;
        }

        sensorsProcessed++;

        // Process each channel
        for (const parsedChannel of parsedSensor.channels) {
          if (!parsedChannel.parseSuccess || parsedChannel.value === null) {
            errors.push(`Channel ${parsedChannel.channelCode}: ${parsedChannel.parseError || 'No value'}`);
            continue;
          }

          // Find matching channel by idSensorChannel (if present), fallback to metric_code (case-insensitive)
          let channel = null;
          if (parsedChannel.idSensorChannel) {
            channel = sensor.channels?.find(c => c.idSensorChannel === parsedChannel.idSensorChannel);
          }
          if (!channel) {
            const channelCode = parsedChannel.channelCode.toUpperCase();
            channel = sensor.channels?.find(c => 
              c.metricCode?.toUpperCase() === channelCode
            );
          }

          if (!channel) {
            // Log available channels for debugging
            const availableChannels = sensor.channels?.map(c => c.metricCode).join(', ') || 'none';
            errors.push(
              `Channel not found: ${parsedChannel.channelCode} for sensor ${sensor.label}. ` +
              `Available channels: ${availableChannels}`
            );
            continue;
          }

          channelsProcessed++;

          // Apply engineering conversion
          let valueEngineered = parsedChannel.value;

          try {
            // Priority 1: Use sensor type formula (most flexible)
            if (channel.sensorType?.conversionFormula) {
              valueEngineered = this.applyFormulaConversion(
                parsedChannel.value,
                channel.sensorType.conversionFormula
              );
              this.logger.debug(
                `Applied formula conversion for ${channel.metricCode}: ${parsedChannel.value} → ${valueEngineered} using formula: ${channel.sensorType.conversionFormula}`
              );
            }
            // Priority 2: Use channel-level multiplier/offset (simple linear)
            else if (channel.multiplier || channel.offsetValue) {
              if (channel.multiplier) {
                const multiplier = typeof channel.multiplier === 'string'
                  ? parseFloat(channel.multiplier)
                  : channel.multiplier;
                valueEngineered = valueEngineered * multiplier;
              }
              if (channel.offsetValue) {
                const offset = typeof channel.offsetValue === 'string'
                  ? parseFloat(channel.offsetValue)
                  : channel.offsetValue;
                valueEngineered = valueEngineered + offset;
              }
              this.logger.debug(
                `Applied linear conversion for ${channel.metricCode}: ${parsedChannel.value} → ${valueEngineered}`
              );
            }
            // No conversion
            else {
              this.logger.debug(`No conversion for ${channel.metricCode}, using raw value`);
            }
          } catch (conversionError) {
            errors.push(
              `Conversion error for ${channel.metricCode}: ${conversionError.message}`
            );
            valueEngineered = parsedChannel.value; // Fallback to raw value
          }

          // Create sensor log entry
          try {
            // Convert numeric fields to proper numbers (TypeORM returns 'numeric' as string)
            const minThreshold = channel.minThreshold
              ? (typeof channel.minThreshold === 'string' ? parseFloat(channel.minThreshold) : channel.minThreshold)
              : null;
            const maxThreshold = channel.maxThreshold
              ? (typeof channel.maxThreshold === 'string' ? parseFloat(channel.maxThreshold) : channel.maxThreshold)
              : null;

            const sensorLog = this.sensorLogRepository.create({
              idSensorChannel: channel.idSensorChannel,
              idSensor: sensor.idSensor,
              idNode: node.idNode,
              idProject: node.idProject,
              idOwner: idOwner,
              ts: iotLog.timestamp, // Use iotLog.timestamp (UTC) instead of parsedTelemetry.timestamp (WIB +7)
              valueRaw: parsedChannel.value,
              valueEngineered,
              qualityFlag: 'good',
              ingestionSource: 'mqtt-gateway',
              minThreshold,
              maxThreshold,
            });

            const savedSensorLog = await this.sensorLogRepository.save(sensorLog);
            sensorLogsCreated++;

            // Prepare ClickHouse telemetry data
            const chTelemetry: SensorTelemetryDto = {
              event_time: iotLog.timestamp,
              device_id: iotLog.deviceId,
              owner_code: ownerValidation.owner?.ownerCode || '',
              owner_id: idOwner,
              project_code: project.name || '',
              project_id: node.idProject,
              node_id: node.idNode,
              node_code: node.code,
              node_model: nodeModelName,
              sensor_id: sensor.idSensor,
              sensor_label: sensor.label,
              sensor_catalog: sensorCatalogMap.get(sensor.idSensor) || '',
              channel_id: channel.idSensorChannel,
              metric_code: channel.metricCode,
              metric_unit: channel.unit || '',
              raw_value: parsedChannel.value,
              eng_value: valueEngineered,
              min_threshold: minThreshold ?? 0,
              max_threshold: maxThreshold ?? 0,
              signal_quality: parsedTelemetry.metadata?.signalQuality || 0,
              firmware_version: node.firmwareVersion || '',
              iot_log_id: iotLog.id,
              pg_sensor_log_id: savedSensorLog.idSensorLog,
            };
            clickhouseTelemetryBatch.push(chTelemetry);

            // Prepare ClickHouse channel latest status
            const chChannelLatest: SensorChannelLatestDto = {
              channel_id: channel.idSensorChannel,
              last_update: iotLog.timestamp,
              device_id: iotLog.deviceId,
              owner_code: ownerValidation.owner?.ownerCode || '',
              owner_id: idOwner,
              project_code: project.name || '',
              project_id: node.idProject,
              node_id: node.idNode,
              node_code: node.code,
              node_model: nodeModelName,
              sensor_id: sensor.idSensor,
              sensor_label: sensor.label,
              sensor_catalog: sensorCatalogMap.get(sensor.idSensor) || '',
              metric_code: channel.metricCode,
              metric_unit: channel.unit || '',
              raw_value: parsedChannel.value,
              eng_value: valueEngineered,
              min_threshold: minThreshold ?? 0,
              max_threshold: maxThreshold ?? 0,
              signal_quality: parsedTelemetry.metadata?.signalQuality || 0,
              last_iot_log_id: iotLog.id,
            };
            clickhouseChannelLatestBatch.push(chChannelLatest);

          } catch (error) {
            errors.push(`Error saving sensor_log for channel ${channel.metricCode}: ${error.message}`);
          }
        }
      }

      // 9. Insert to ClickHouse (async, non-blocking)
      if (clickhouseTelemetryBatch.length > 0 && this.clickhouseService.isReady()) {
        try {
          // Batch insert telemetry
          await this.clickhouseService.insertTelemetryBatch(clickhouseTelemetryBatch);

          // Update channel latest status
          for (const chLatest of clickhouseChannelLatestBatch) {
            await this.clickhouseService.updateChannelLatest(chLatest);
          }

          // Update node latest status
          const nodeLatest: NodeLatestDto = {
            node_id: node.idNode,
            device_id: iotLog.deviceId,
            last_seen: iotLog.timestamp,
            owner_code: ownerValidation.owner?.ownerCode || '',
            owner_id: idOwner,
            project_code: project.name || '',
            project_id: node.idProject,
            node_code: node.code,
            node_model: nodeModelName,
            signal_quality: parsedTelemetry.metadata?.signalQuality || 0,
            firmware_version: node.firmwareVersion || '',
            ip_address: node.ipAddress || '',
            total_channels: sensors.reduce((sum, s) => sum + (s.channels?.length || 0), 0),
            active_channels: clickhouseChannelLatestBatch.length,
          };
          await this.clickhouseService.updateNodeLatest(nodeLatest);

          this.logger.debug(`ClickHouse: Inserted ${clickhouseTelemetryBatch.length} telemetry records`);
        } catch (chError) {
          // Log but don't fail - ClickHouse is secondary storage
          this.logger.warn(`ClickHouse insert warning: ${chError.message}`);
        }
      }

      // 10. Mark iot_log as processed
      const success = sensorLogsCreated > 0;
      await this.markAsProcessed(iotLog, success, errors.join('; '));

      // 10. Update node last_seen_at
      await this.nodeRepository.update(
        { idNode: node.idNode },
        {
          lastSeenAt: iotLog.timestamp, // Use iotLog.timestamp (UTC) for consistency
          connectivityStatus: 'online',
        },
      );

      const processingTime = Date.now() - startTime;

      return {
        success,
        iotLogId: iotLog.id,
        nodeCode: node.code,
        profileCode: profile.code,
        sensorsProcessed,
        channelsProcessed,
        sensorLogsCreated,
        errors,
        processingTimeMs: processingTime,
      };

    } catch (error) {
      this.logger.error(`Error processing iot_log ${iotLog.id}: ${error.message}`, error.stack);
      errors.push(`Critical error: ${error.message}`);

      await this.markAsProcessed(iotLog, false, error.message);

      return {
        success: false,
        iotLogId: iotLog.id,
        sensorsProcessed: 0,
        channelsProcessed: 0,
        sensorLogsCreated: 0,
        errors,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Find node by device_id (try multiple fields)
   */
  private async findNodeByDeviceId(
    deviceIdOrPayload: string | Record<string, any>,
  ): Promise<Node | null> {
    let deviceId: string;

    if (typeof deviceIdOrPayload === 'string') {
      deviceId = deviceIdOrPayload;
    } else {
      // Try to extract from payload - check multiple possible field names
      deviceId = deviceIdOrPayload.device_id
        || deviceIdOrPayload.deviceId
        || deviceIdOrPayload.dev_eui
        || deviceIdOrPayload.devEui
        || deviceIdOrPayload.node_id
        || deviceIdOrPayload.nodeId
        || deviceIdOrPayload.node_code
        || deviceIdOrPayload.nodeCode
        || deviceIdOrPayload.code;
    }

    if (!deviceId) {
      return null;
    }

    // Try exact match first (case-sensitive)
    let node = await this.nodeRepository.findOne({
      where: [
        { devEui: deviceId },
        { code: deviceId },
        { serialNumber: deviceId },
      ],
      relations: ['nodeProfile'],
    });

    // If not found, try case-insensitive search on code field
    if (!node) {
      node = await this.nodeRepository
        .createQueryBuilder('node')
        .leftJoinAndSelect('node.nodeProfile', 'nodeProfile')
        .where('LOWER(node.code) = LOWER(:deviceId)', { deviceId })
        .orWhere('LOWER(node.dev_eui) = LOWER(:deviceId)', { deviceId })
        .orWhere('LOWER(node.serial_number) = LOWER(:deviceId)', { deviceId })
        .getOne();
    }

    return node;
  }

  /**
   * Mark iot_log as processed
   */
  private async markAsProcessed(
    iotLog: IotLog,
    success: boolean,
    notes?: string,
  ): Promise<void> {
    iotLog.processed = true;
    iotLog.notes = notes || (success ? 'Processed successfully' : 'Processing failed');
    await this.iotLogRepository.save(iotLog);
  }

  /**
   * Validate owner code from device_id
   * Expected format: XXXXX-HARDWARE_ID (e.g., A1B2C-ESP32001)
   * Exception: HELIO-IMEI devices (Teltonika) will get owner from node->project
   * Special case: HELIO-XXX devices - lookup via node -> project -> owner
   */
  private async validateOwnerCode(deviceId: string): Promise<{
    isValid: boolean;
    owner?: Owner;
    error?: string;
    skipValidation?: boolean;
  }> {
    if (!deviceId) {
      return { isValid: false, error: 'Device ID is required' };
    }

    // Extract code from format: XXXXX-HARDWARE_ID
    const parts = deviceId.split('-');

    if (parts.length < 2) {
      return {
        isValid: false,
        error: `Device ID must be in format: OWNER_CODE-HARDWARE_ID (e.g., A1B2C-ESP32001). Got: ${deviceId}`
      };
    }

    const prefix = parts[0].toUpperCase();

    // Special case: HELIO devices - lookup via node -> project -> owner
    if (prefix === 'HELIO') {
      return this.validateOwnerViaNode(deviceId);
    }

    const ownerCode = prefix;

    // Exception: HELIO-xxx devices (Teltonika GPS trackers)
    // Owner will be determined from node->project->id_owner
    if (ownerCode === 'HELIO') {
      this.logger.debug(`Device ${deviceId} is HELIO format (Teltonika), owner will be from node->project`);
      return { isValid: true, skipValidation: true };
    }

    if (ownerCode.length !== 5) {
      return {
        isValid: false,
        error: `Owner code must be exactly 5 characters. Got: ${ownerCode} (${ownerCode.length} chars)`
      };
    }

    // Look up owner by code
    const owner = await this.ownerRepository.findOne({
      where: { ownerCode: ownerCode },
    });

    if (!owner) {
      return {
        isValid: false,
        error: `Owner code '${ownerCode}' not found in system`
      };
    }

    return { isValid: true, owner };
  }

  /**
   * Validate owner via node -> project -> owner chain
   * Used for special devices like HELIO-XXX
   */
  private async validateOwnerViaNode(deviceId: string): Promise<{
    isValid: boolean;
    owner?: Owner;
    error?: string;
  }> {
    // Find node by code (device_id is stored as code in nodes table)
    const node = await this.nodeRepository.findOne({
      where: { code: deviceId },
    });

    if (!node) {
      return {
        isValid: false,
        error: `Special device '${deviceId}' not registered in nodes table`
      };
    }

    if (!node.idProject) {
      return {
        isValid: false,
        error: `Node '${deviceId}' has no project assigned`
      };
    }

    // Get project
    const project = await this.projectRepository.findOne({
      where: { idProject: node.idProject },
    });

    if (!project) {
      return {
        isValid: false,
        error: `Project not found for node '${deviceId}'`
      };
    }

    // Get owner
    const owner = await this.ownerRepository.findOne({
      where: { idOwner: project.idOwner },
    });

    if (!owner) {
      return {
        isValid: false,
        error: `Owner not found for project '${project.name}'`
      };
    }

    return { isValid: true, owner };
  }

  /**
   * Track unpaired device
   * Creates or updates entry in node_unpaired_devices table
   */
  private async trackUnpairedDevice(
    hardwareId: string,
    payload: any,
    topic: string,
    pairedNodeId?: string,
    suggestedOwner?: string,
  ): Promise<void> {
    try {
      // Check if device already exists
      const existing = await this.nodeUnpairedDeviceRepository.findOne({
        where: { hardwareId },
      });

      if (existing) {
        // Update existing entry
        existing.lastSeenAt = new Date();
        existing.lastTopic = topic;
        existing.seenCount = existing.seenCount + 1;

        // Update payload history (keep last 10)
        const payloadHistory = Array.isArray(existing.lastPayload) ? existing.lastPayload : [];
        payloadHistory.unshift({
          payload,
          timestamp: new Date(),
        });
        // Keep only last 10 payloads
        existing.lastPayload = payloadHistory.slice(0, 10);

        // If paired_node_id provided, update it
        if (pairedNodeId) {
          existing.pairedNodeId = pairedNodeId;
        }

        // If suggested_owner provided, update it
        if (suggestedOwner) {
          existing.suggestedOwner = suggestedOwner;
        }

        await this.nodeUnpairedDeviceRepository.save(existing);

        this.logger.debug(`Updated unpaired device tracking for ${hardwareId}, seen ${existing.seenCount} times`);
      } else {
        // Create new entry with payload in array format
        const unpairedDevice = this.nodeUnpairedDeviceRepository.create({
          hardwareId,
          lastPayload: [{
            payload,
            timestamp: new Date(),
          }],
          lastTopic: topic,
          seenCount: 1,
          status: 'pending',
          pairedNodeId,
          suggestedOwner,
        });

        await this.nodeUnpairedDeviceRepository.save(unpairedDevice);

        this.logger.log(`New unpaired device detected: ${hardwareId} on topic: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Error tracking unpaired device ${hardwareId}: ${error.message}`);
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<{
    totalUnprocessed: number;
    totalProcessed: number;
    processedToday: number;
    failedToday: number;
  }> {
    const totalUnprocessed = await this.iotLogRepository.count({
      where: {
        label: 'telemetry' as any,
        processed: false,
      },
    });

    const totalProcessed = await this.iotLogRepository.count({
      where: {
        label: 'telemetry' as any,
        processed: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processedToday = await this.iotLogRepository.count({
      where: {
        label: 'telemetry' as any,
        processed: true,
        updatedAt: In([today]),
      },
    });

    const failedToday = await this.iotLogRepository
      .createQueryBuilder('log')
      .where('log.label = :label', { label: 'telemetry' })
      .andWhere('log.processed = true')
      .andWhere("log.notes LIKE '%failed%' OR log.notes LIKE '%error%'")
      .andWhere('log.updated_at >= :today', { today })
      .getCount();

    return {
      totalUnprocessed,
      totalProcessed,
      processedToday,
      failedToday,
    };
  }

  /**
   * Apply formula-based conversion to raw sensor value
   * Uses sandboxed JavaScript evaluation with safety checks
   * 
   * @param rawValue - The raw sensor value (e.g., voltage: 3.3)
   * @param formula - JavaScript expression using 'x' as the raw value variable
   * @returns Converted engineered value
   * 
   * @example
   * // Pressure: 0.5-4.5V → 0-10 bar
   * applyFormulaConversion(3.3, "(x - 0.5) * 2.5")  // Returns 7.0 bar
   * 
   * @example
   * // Flow rate: pulse count → L/min
   * applyFormulaConversion(100, "x / 7.5")  // Returns 13.333 L/min
   * 
   * @example
   * // Non-linear: quadratic conversion
   * applyFormulaConversion(5, "Math.pow(x, 2) * 0.1")  // Returns 2.5
   * 
   * @note Variable naming: We use lowercase 'x' following standard mathematical notation
   *       f(x) = formula, where x represents the independent variable (raw sensor value)
   */
  private applyFormulaConversion(rawValue: number, formula: string): number {
    try {
      // Validate formula doesn't contain dangerous code
      const dangerousPatterns = [
        /require\s*\(/,
        /import\s+/,
        /eval\s*\(/,
        /Function\s*\(/,
        /\bprocess\b/,
        /\bchild_process\b/,
        /\bfs\b/,
        /__dirname/,
        /__filename/,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(formula)) {
          throw new Error(`Formula contains dangerous pattern: ${pattern}`);
        }
      }

      // Create safe evaluation context
      const x = rawValue;
      const Math = global.Math; // Allow Math functions

      // Evaluate formula in sandboxed context
      // Using Function constructor is safer than eval() as it doesn't have access to closure scope
      const result = new Function('x', 'Math', `"use strict"; return (${formula});`)(x, Math);

      // Validate result
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error(`Formula produced invalid result: ${result}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Formula conversion error: ${error.message}. Formula: ${formula}, Raw value: ${rawValue}`);
      throw new Error(`Invalid conversion formula: ${error.message}`);
    }
  }
}

