import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IotLog } from '../../entities';
import { CreateIotLogDto } from './dto';
import { LogLabel } from '../../common/enums';

@Injectable()
export class IotLogService {
  private readonly logger = new Logger(IotLogService.name);

  constructor(
    @InjectRepository(IotLog)
    private readonly iotLogRepository: Repository<IotLog>,
  ) {}

  /**
   * Create a new IoT log entry
   */
  async create(createIotLogDto: CreateIotLogDto): Promise<IotLog> {
    try {
      this.logger.log(`🔵 Creating IoT log entry...`);
      this.logger.log(`   Label: ${createIotLogDto.label}`);
      this.logger.log(`   Topic: ${createIotLogDto.topic}`);
      this.logger.log(`   Device ID: ${createIotLogDto.deviceId || 'N/A'}`);
      this.logger.log(`   Payload: ${JSON.stringify(createIotLogDto.payload)}`);
      
      const iotLog = this.iotLogRepository.create({
        ...createIotLogDto,
        timestamp: createIotLogDto.timestamp || new Date(),
      });

      this.logger.log(`🔵 Saving to database...`);
      const savedLog = await this.iotLogRepository.save(iotLog);
      this.logger.log(`✅ IoT log created successfully: ${savedLog.id} [${savedLog.label}]`);

      return savedLog;
    } catch (error) {
      this.logger.error(`❌ Failed to create IoT log: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all unprocessed logs
   */
  async findUnprocessed(limit = 100): Promise<IotLog[]> {
    return this.iotLogRepository.find({
      where: { processed: false },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Find logs by label
   */
  async findByLabel(label: LogLabel, limit = 100): Promise<IotLog[]> {
    return this.iotLogRepository.find({
      where: { label },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find logs by device ID
   */
  async findByDeviceId(deviceId: string, limit = 100): Promise<IotLog[]> {
    return this.iotLogRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Mark a log as processed
   */
  async markAsProcessed(id: string, notes?: string): Promise<IotLog> {
    const log = await this.iotLogRepository.findOne({ where: { id } });

    if (!log) {
      throw new Error(`IoT log with ID ${id} not found`);
    }

    log.processed = true;
    if (notes) {
      log.notes = notes;
    }

    return this.iotLogRepository.save(log);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    processed: number;
    unprocessed: number;
    byLabel: Record<string, number>;
  }> {
    const total = await this.iotLogRepository.count();
    const processed = await this.iotLogRepository.count({ where: { processed: true } });
    const unprocessed = await this.iotLogRepository.count({ where: { processed: false } });

    const byLabelRaw = await this.iotLogRepository
      .createQueryBuilder('log')
      .select('log.label', 'label')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.label')
      .getRawMany();

    const byLabel = byLabelRaw.reduce((acc, item) => {
      acc[item.label] = parseInt(item.count, 10);
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      processed,
      unprocessed,
      byLabel,
    };
  }

  /**
   * Auto-detect label from payload
   * This is a smart function to determine the label based on payload content
   */
  detectLabel(payload: Record<string, any>): LogLabel {
    // Check for pairing-related keywords
    if (payload.action === 'pair' || payload.type === 'pairing' || payload.pairing) {
      return LogLabel.PAIRING;
    }

    // Check for error indicators
    if (payload.error || payload.status === 'error' || payload.level === 'error') {
      return LogLabel.ERROR;
    }

    // Check for warning indicators
    if (payload.warning || payload.status === 'warning' || payload.level === 'warning') {
      return LogLabel.WARNING;
    }

    // Check for command
    if (payload.command || payload.cmd || payload.action) {
      return LogLabel.COMMAND;
    }

    // Check for response
    if (payload.response || payload.reply) {
      return LogLabel.RESPONSE;
    }

    // Check for telemetry data (sensor readings, measurements)
    if (payload.temperature !== undefined ||
        payload.humidity !== undefined ||
        payload.sensor !== undefined ||
        payload.value !== undefined ||
        payload.reading !== undefined) {
      return LogLabel.TELEMETRY;
    }

    // Check for debug
    if (payload.debug || payload.level === 'debug') {
      return LogLabel.DEBUG;
    }

    // Check for info
    if (payload.info || payload.level === 'info' || payload.status === 'info') {
      return LogLabel.INFO;
    }

    // Default to LOG
    return LogLabel.LOG;
  }

  /**
   * Extract device ID from payload
   */
  extractDeviceId(payload: Record<string, any>): string | undefined {
    return payload.deviceId ||
           payload.device_id ||
           payload.nodeId ||
           payload.node_id ||
           payload.id ||
           payload.clientId ||
           undefined;
  }
}
