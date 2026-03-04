import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AnomalyResult } from '../../../entities/anomaly-result.entity';
import { SensorChannel } from '../../../entities/sensor-channel.entity';
import {
  QueryAnomaliesDto,
  AcknowledgeAnomalyDto,
  AnomalyResponseDto,
  AnomalySummaryDto,
  AnomalyGrade,
  CreateAnomalyDto,
  CreateBulkAnomaliesDto,
} from '../dto/anomaly.dto';

@Injectable()
export class AnomaliesService {
  private readonly logger = new Logger(AnomaliesService.name);

  constructor(
    @InjectRepository(AnomalyResult)
    private readonly anomalyRepository: Repository<AnomalyResult>,
    @InjectRepository(SensorChannel)
    private readonly sensorChannelRepository: Repository<SensorChannel>,
  ) {}

  /**
   * Find all anomalies with filters and pagination
   */
  async findAll(query: QueryAnomaliesDto): Promise<{
    data: AnomalyResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.anomalyRepository
      .createQueryBuilder('anomaly')
      .leftJoinAndSelect('anomaly.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .leftJoin('node.project', 'project')
      .addSelect(['sensor.idSensor', 'sensor.sensorCode', 'sensor.label'])
      .addSelect(['node.idNode', 'node.name', 'node.code'])
      .orderBy('anomaly.detectedAt', 'DESC');

    // Apply filters
    this.applyFilters(qb, query);

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find one anomaly by ID
   */
  async findOne(id: string): Promise<AnomalyResponseDto> {
    const anomaly = await this.anomalyRepository
      .createQueryBuilder('anomaly')
      .leftJoinAndSelect('anomaly.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .addSelect(['sensor.idSensor', 'sensor.sensorCode', 'sensor.label'])
      .addSelect(['node.idNode', 'node.name', 'node.code'])
      .where('anomaly.idAnomalyResult = :id', { id })
      .getOne();

    if (!anomaly) {
      throw new NotFoundException(`Anomaly with ID ${id} not found`);
    }

    return this.toResponseDto(anomaly);
  }

  /**
   * Acknowledge an anomaly
   */
  async acknowledge(id: string, dto: AcknowledgeAnomalyDto): Promise<AnomalyResponseDto> {
    const anomaly = await this.anomalyRepository.findOne({
      where: { idAnomalyResult: id },
    });

    if (!anomaly) {
      throw new NotFoundException(`Anomaly with ID ${id} not found`);
    }

    anomaly.isAcknowledged = true;
    anomaly.acknowledgedAt = new Date();
    anomaly.acknowledgedBy = dto.acknowledgedBy;

    await this.anomalyRepository.save(anomaly);
    return this.findOne(id);
  }

  /**
   * Get anomaly summary statistics
   */
  async getSummary(query: {
    ownerId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AnomalySummaryDto> {
    const qb = this.anomalyRepository
      .createQueryBuilder('anomaly')
      .leftJoin('anomaly.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .leftJoin('node.project', 'project');

    // Apply project (owner) filter via project ID if provided
    if (query.ownerId) {
      qb.andWhere('project.idProject = :ownerId', { ownerId: query.ownerId });
    }

    // Apply date range
    if (query.startDate) {
      qb.andWhere('anomaly.detectedAt >= :startDate', { startDate: new Date(query.startDate) });
    }
    if (query.endDate) {
      qb.andWhere('anomaly.detectedAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    // Get counts by grade
    const gradeCountsResult = await this.anomalyRepository
      .createQueryBuilder('anomaly')
      .select('anomaly.anomalyGrade', 'grade')
      .addSelect('COUNT(*)', 'count')
      .where(qb.getQuery().split('WHERE')[1] || '1=1')
      .setParameters(qb.getParameters())
      .groupBy('anomaly.anomalyGrade')
      .getRawMany();

    const gradeCounts = gradeCountsResult.reduce(
      (acc, row) => {
        acc[row.grade] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get acknowledgment counts
    const ackCountsResult = await qb
      .clone()
      .select('anomaly.isAcknowledged', 'acknowledged')
      .addSelect('COUNT(*)', 'count')
      .groupBy('anomaly.isAcknowledged')
      .getRawMany();

    const ackCounts = ackCountsResult.reduce(
      (acc, row) => {
        acc[row.acknowledged ? 'acknowledged' : 'unacknowledged'] = parseInt(row.count, 10);
        return acc;
      },
      { acknowledged: 0, unacknowledged: 0 },
    );

    // Get affected sensors and nodes count
    const affectedResult = await qb
      .clone()
      .select('COUNT(DISTINCT anomaly.idSensorChannel)', 'sensorCount')
      .addSelect('COUNT(DISTINCT node.idNode)', 'nodeCount')
      .getRawOne();

    // Get last detected timestamp
    const lastDetectedResult = await qb
      .clone()
      .select('MAX(anomaly.detectedAt)', 'lastDetected')
      .getRawOne();

    return {
      totalAnomalies:
        (gradeCounts.mild || 0) +
        (gradeCounts.moderate || 0) +
        (gradeCounts.severe || 0) +
        (gradeCounts.critical || 0),
      criticalCount: gradeCounts.critical || 0,
      severeCount: gradeCounts.severe || 0,
      moderateCount: gradeCounts.moderate || 0,
      mildCount: gradeCounts.mild || 0,
      acknowledgedCount: ackCounts.acknowledged,
      unacknowledgedCount: ackCounts.unacknowledged,
      lastDetectedAt: lastDetectedResult?.lastDetected || null,
      affectedSensors: parseInt(affectedResult?.sensorCount || '0', 10),
      affectedNodes: parseInt(affectedResult?.nodeCount || '0', 10),
    };
  }

  /**
   * Get anomalies by sensor channel
   */
  async findBySensorChannel(
    idSensorChannel: string,
    hours: number = 24,
  ): Promise<AnomalyResponseDto[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const anomalies = await this.anomalyRepository.find({
      where: {
        idSensorChannel,
        detectedAt: new Date(since.toISOString()),
      },
      order: { detectedAt: 'DESC' },
      take: 100,
    });

    return anomalies.map(this.toResponseDto);
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    qb: SelectQueryBuilder<AnomalyResult>,
    query: QueryAnomaliesDto,
  ): void {
    if (query.idSensorChannel) {
      qb.andWhere('anomaly.idSensorChannel = :idSensorChannel', {
        idSensorChannel: query.idSensorChannel,
      });
    }

    if (query.ownerId) {
      qb.andWhere('project.idProject = :ownerId', { ownerId: query.ownerId });
    }

    if (query.deviceId) {
      qb.andWhere('node.code = :deviceId', { deviceId: query.deviceId });
    }

    if (query.sensorKey) {
      qb.andWhere('sensor.sensorCode = :sensorKey', { sensorKey: query.sensorKey });
    }

    if (query.minGrade) {
      const gradeOrder = [
        AnomalyGrade.NORMAL,
        AnomalyGrade.MILD,
        AnomalyGrade.MODERATE,
        AnomalyGrade.SEVERE,
        AnomalyGrade.CRITICAL,
      ];
      const minIndex = gradeOrder.indexOf(query.minGrade);
      const validGrades = gradeOrder.slice(minIndex);
      qb.andWhere('anomaly.anomalyGrade IN (:...grades)', { grades: validGrades });
    }

    if (query.startDate) {
      qb.andWhere('anomaly.detectedAt >= :startDate', { startDate: new Date(query.startDate) });
    }

    if (query.endDate) {
      qb.andWhere('anomaly.detectedAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    if (query.isAcknowledged !== undefined) {
      qb.andWhere('anomaly.isAcknowledged = :isAcknowledged', {
        isAcknowledged: query.isAcknowledged,
      });
    }
  }

  /**
   * Resolve idSensorChannel from deviceId + sensorKey + metricCode
   * deviceId = node.code (e.g., "HELIO-357073298536240")
   * sensorKey = sensor.label (e.g., "tekanan")
   * metricCode = channel.metricCode (e.g., "tekanan")
   */
  async resolveSensorChannelId(
    deviceId: string,
    sensorKey: string,
    metricCode?: string,
  ): Promise<string | null> {
    // Join sensor_channels -> sensors -> nodes to find by device code
    const qb = this.sensorChannelRepository
      .createQueryBuilder('channel')
      .innerJoin('channel.sensor', 'sensor')
      .innerJoin('sensor.node', 'node')
      .where('node.code = :deviceId', { deviceId })
      .andWhere('sensor.label = :sensorKey', { sensorKey });

    if (metricCode) {
      qb.andWhere('channel.metricCode = :metricCode', { metricCode });
    }

    const channel = await qb.getOne();
    return channel?.idSensorChannel || null;
  }

  /**
   * Create a single anomaly result from ML detection
   */
  async create(dto: CreateAnomalyDto): Promise<AnomalyResult> {
    let idSensorChannel = dto.idSensorChannel;

    // Resolve from deviceId/sensorKey if idSensorChannel not provided
    if (!idSensorChannel && dto.deviceId && dto.sensorKey) {
      const resolved = await this.resolveSensorChannelId(
        dto.deviceId,
        dto.sensorKey,
        dto.metricCode,
      );

      if (!resolved) {
        throw new BadRequestException(
          `Cannot find sensor channel for device=${dto.deviceId}, sensor=${dto.sensorKey}, metric=${dto.metricCode || 'any'}`,
        );
      }

      idSensorChannel = resolved;
      this.logger.debug(`Resolved idSensorChannel=${resolved} from ${dto.deviceId}/${dto.sensorKey}`);
    }

    if (!idSensorChannel) {
      throw new BadRequestException(
        'Either idSensorChannel or (deviceId + sensorKey) must be provided',
      );
    }

    this.logger.log(`Creating anomaly for sensor channel ${idSensorChannel}`);

    const anomaly = this.anomalyRepository.create({
      idSensorChannel,
      detectedAt: new Date(dto.detectedAt),
      actualValue: dto.actualValue,
      expectedValue: dto.expectedValue,
      anomalyScore: dto.anomalyScore,
      anomalyGrade: dto.anomalyGrade,
      anomalyType: dto.anomalyType,
      detectorId: dto.detectorId,
      detectorName: dto.detectorName,
      opensearchResult: dto.opensearchResult,
      note: dto.note,
      isAcknowledged: false,
    });

    const saved = await this.anomalyRepository.save(anomaly);
    this.logger.log(`Anomaly created: ${saved.idAnomalyResult} (${dto.anomalyGrade})`);
    return saved;
  }

  /**
   * Create multiple anomaly results in bulk
   * Includes deduplication to prevent duplicate entries
   */
  async createBulk(dto: CreateBulkAnomaliesDto): Promise<{ created: number; skipped: number; anomalies: AnomalyResult[] }> {
    this.logger.log(`Creating ${dto.anomalies.length} anomalies in bulk`);

    const entities: AnomalyResult[] = [];
    let skipped = 0;

    for (const item of dto.anomalies) {
      let idSensorChannel = item.idSensorChannel;

      // Resolve from deviceId/sensorKey if idSensorChannel not provided
      if (!idSensorChannel && item.deviceId && item.sensorKey) {
        const resolved = await this.resolveSensorChannelId(
          item.deviceId,
          item.sensorKey,
          item.metricCode,
        );

        if (!resolved) {
          this.logger.warn(
            `Skipping anomaly: Cannot find sensor channel for device=${item.deviceId}, sensor=${item.sensorKey}`,
          );
          skipped++;
          continue; // Skip this item instead of failing
        }

        idSensorChannel = resolved;
      }

      if (!idSensorChannel) {
        this.logger.warn('Skipping anomaly: No idSensorChannel or deviceId+sensorKey provided');
        skipped++;
        continue;
      }

      // Check for duplicate within 10 minute window
      const isDuplicate = await this.checkDuplicate(
        idSensorChannel,
        new Date(item.detectedAt),
        item.anomalyType,
        10,
      );

      if (isDuplicate) {
        this.logger.debug(`Skipping duplicate anomaly for channel ${idSensorChannel}`);
        skipped++;
        continue;
      }

      entities.push(
        this.anomalyRepository.create({
          idSensorChannel,
          detectedAt: new Date(item.detectedAt),
          actualValue: item.actualValue,
          expectedValue: item.expectedValue,
          anomalyScore: item.anomalyScore,
          anomalyGrade: item.anomalyGrade,
          anomalyType: item.anomalyType,
          detectorId: item.detectorId,
          detectorName: item.detectorName,
          opensearchResult: item.opensearchResult,
          note: item.note,
          isAcknowledged: false,
        }),
      );
    }

    if (entities.length === 0) {
      return { created: 0, skipped, anomalies: [] };
    }

    const saved = await this.anomalyRepository.save(entities);
    this.logger.log(`Created ${saved.length} anomalies in bulk (${skipped} skipped)`);

    return {
      created: saved.length,
      skipped,
      anomalies: saved,
    };
  }

  /**
   * Check if a similar anomaly already exists (for deduplication)
   */
  async checkDuplicate(
    idSensorChannel: string,
    detectedAt: Date,
    anomalyType: string,
    windowMinutes: number = 10,
  ): Promise<boolean> {
    const windowStart = new Date(detectedAt.getTime() - windowMinutes * 60 * 1000);
    const windowEnd = new Date(detectedAt.getTime() + windowMinutes * 60 * 1000);

    const existing = await this.anomalyRepository.findOne({
      where: {
        idSensorChannel,
        anomalyType,
      },
      // Additional time filter via query builder
    });

    if (existing) {
      const existingTime = new Date(existing.detectedAt).getTime();
      const targetTime = detectedAt.getTime();
      const diffMinutes = Math.abs(existingTime - targetTime) / (60 * 1000);
      
      if (diffMinutes <= windowMinutes) {
        this.logger.debug(`Duplicate anomaly found within ${windowMinutes} min window`);
        return true;
      }
    }

    return false;
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(entity: AnomalyResult): AnomalyResponseDto {
    const response: AnomalyResponseDto = {
      idAnomalyResult: entity.idAnomalyResult,
      idSensorChannel: entity.idSensorChannel,
      detectedAt: entity.detectedAt,
      actualValue: entity.actualValue,
      expectedValue: entity.expectedValue,
      anomalyScore: entity.anomalyScore,
      anomalyGrade: entity.anomalyGrade,
      anomalyType: entity.anomalyType,
      detectorId: entity.detectorId,
      detectorName: entity.detectorName,
      isAcknowledged: entity.isAcknowledged,
      acknowledgedAt: entity.acknowledgedAt,
      acknowledgedBy: entity.acknowledgedBy,
      createdAt: entity.createdAt,
    };

    // Add joined data if available
    if (entity.sensorChannel) {
      response.sensorChannel = {
        idSensorChannel: entity.sensorChannel.idSensorChannel,
        channelName: entity.sensorChannel.metricCode,
        unitMeasure: entity.sensorChannel.unit,
      };

      // Access sensor through type casting since we're using query builder select
      const sensor = (entity.sensorChannel as any).sensor;
      if (sensor) {
        response.sensor = {
          idSensor: sensor.idSensor,
          sensorKey: sensor.sensorCode,
          sensorName: sensor.label,
        };

        const node = sensor.node;
        if (node) {
          response.node = {
            idNode: node.idNode,
            nodeName: node.name,
            deviceId: node.code,
          };
        }
      }
    }

    return response;
  }
}
