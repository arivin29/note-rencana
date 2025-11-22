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

    try {
      // 1. Validate owner code from device_id
      const ownerValidation = await this.validateOwnerCode(iotLog.deviceId);

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

      // 2. Find node by device_id
      const node = await this.findNodeByDeviceId(iotLog.deviceId || iotLog.payload);

      if (!node) {
        // Track as unpaired device
        await this.trackUnpairedDevice(
          iotLog.deviceId,
          iotLog.payload,
          iotLog.topic,
          undefined,
          ownerValidation.owner?.idOwner,
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
          ownerValidation.owner?.idOwner,
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

      // 7. Load node's sensors with channels
      const sensors = await this.sensorRepository.find({
        where: { idNode: node.idNode },
        relations: ['channels'],
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

      // 8. Match parsed data with actual sensors and save sensor_logs
      let sensorsProcessed = 0;
      let channelsProcessed = 0;
      let sensorLogsCreated = 0;

      for (const parsedSensor of parsedTelemetry.sensors) {
        // Find matching sensor by label
        const sensor = sensors.find(s => s.label === parsedSensor.sensorLabel);

        if (!sensor) {
          errors.push(`Sensor not found: ${parsedSensor.sensorLabel}`);
          continue;
        }

        sensorsProcessed++;

        // Process each channel
        for (const parsedChannel of parsedSensor.channels) {
          if (!parsedChannel.parseSuccess || parsedChannel.value === null) {
            errors.push(`Channel ${parsedChannel.channelCode}: ${parsedChannel.parseError || 'No value'}`);
            continue;
          }

          // Find matching channel by metric_code
          const channel = sensor.channels?.find(c => c.metricCode === parsedChannel.channelCode);

          if (!channel) {
            errors.push(`Channel not found: ${parsedChannel.channelCode} for sensor ${sensor.label}`);
            continue;
          }

          channelsProcessed++;

          // Apply engineering conversion if exists
          let valueEngineered = parsedChannel.value;
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
              ts: parsedTelemetry.timestamp,
              valueRaw: parsedChannel.value,
              valueEngineered,
              qualityFlag: 'good',
              ingestionSource: 'mqtt-gateway',
              minThreshold,
              maxThreshold,
            });

            await this.sensorLogRepository.save(sensorLog);
            sensorLogsCreated++;
          } catch (error) {
            errors.push(`Error saving sensor_log for channel ${channel.metricCode}: ${error.message}`);
          }
        }
      }

      // 9. Mark iot_log as processed
      const success = sensorLogsCreated > 0;
      await this.markAsProcessed(iotLog, success, errors.join('; '));

      // 10. Update node last_seen_at
      await this.nodeRepository.update(
        { idNode: node.idNode },
        {
          lastSeenAt: parsedTelemetry.timestamp,
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
   */
  private async validateOwnerCode(deviceId: string): Promise<{
    isValid: boolean;
    owner?: Owner;
    error?: string;
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

    const ownerCode = parts[0].toUpperCase();

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
        existing.lastPayload = payload;
        existing.lastTopic = topic;
        existing.seenCount = existing.seenCount + 1;

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
        // Create new entry
        const unpairedDevice = this.nodeUnpairedDeviceRepository.create({
          hardwareId,
          lastPayload: payload,
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
}
