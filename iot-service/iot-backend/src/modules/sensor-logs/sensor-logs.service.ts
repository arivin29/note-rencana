import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { SensorLog } from '../../entities/sensor-log.entity';
import {
  CreateSensorLogDto,
  BulkCreateSensorLogsDto,
  GetSensorLogsQueryDto,
  GetTelemetryTrendsQueryDto,
} from './dto/create-sensor-log.dto';
import {
  SensorLogResponseDto,
  SensorLogEnrichedResponseDto,
  SensorLogListResponseDto,
  SensorLogStatisticsDto,
  SensorLogTelemetryTrendsResponseDto,
  SensorLogTelemetryTrendDto,
} from './dto/sensor-log-response.dto';

@Injectable()
export class SensorLogsService {
  constructor(
    @InjectRepository(SensorLog)
    private readonly sensorLogRepository: Repository<SensorLog>,
  ) {}

  /**
   * Create a single sensor log entry
   */
  async create(createDto: CreateSensorLogDto): Promise<SensorLogResponseDto> {
    const log = this.sensorLogRepository.create({
      idSensorChannel: createDto.idSensorChannel,
      idSensor: createDto.idSensor,
      idNode: createDto.idNode,
      idProject: createDto.idProject,
      idOwner: createDto.idOwner,
      ts: createDto.ts ? new Date(createDto.ts) : new Date(),
      valueRaw: createDto.valueRaw,
      valueEngineered: createDto.valueEngineered,
      qualityFlag: createDto.qualityFlag || 'good',
      ingestionSource: createDto.ingestionSource || 'api',
      statusCode: createDto.statusCode || 200,
      ingestionLatencyMs: createDto.ingestionLatencyMs,
      payloadSeq: createDto.payloadSeq,
      minThreshold: createDto.minThreshold,
      maxThreshold: createDto.maxThreshold,
    });

    const saved = await this.sensorLogRepository.save(log);
    return this.toResponseDto(saved);
  }

  /**
   * Bulk create sensor logs (for batch ingestion)
   */
  async bulkCreate(bulkDto: BulkCreateSensorLogsDto): Promise<{ created: number; logs: SensorLogResponseDto[] }> {
    const logs = bulkDto.logs.map(dto =>
      this.sensorLogRepository.create({
        idSensorChannel: dto.idSensorChannel,
        idSensor: dto.idSensor,
        idNode: dto.idNode,
        idProject: dto.idProject,
        idOwner: dto.idOwner,
        ts: dto.ts ? new Date(dto.ts) : new Date(),
        valueRaw: dto.valueRaw,
        valueEngineered: dto.valueEngineered,
        qualityFlag: dto.qualityFlag || 'good',
        ingestionSource: dto.ingestionSource || 'api',
        statusCode: dto.statusCode || 200,
        ingestionLatencyMs: dto.ingestionLatencyMs,
        payloadSeq: dto.payloadSeq,
        minThreshold: dto.minThreshold,
        maxThreshold: dto.maxThreshold,
      })
    );

    const saved = await this.sensorLogRepository.save(logs);
    return {
      created: saved.length,
      logs: saved.map(log => this.toResponseDto(log)),
    };
  }

  /**
   * Get sensor logs with filtering and pagination
   */
  async findAll(query: GetSensorLogsQueryDto): Promise<SensorLogListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 100;
    const skip = (page - 1) * limit;

    // Build query with relations using QueryBuilder for better control
    const queryBuilder = this.sensorLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.sensorChannel', 'channel')
      .leftJoinAndSelect('channel.sensor', 'sensor')
      .leftJoinAndSelect('sensor.sensorCatalog', 'sensorCatalog')
      .leftJoinAndSelect('sensor.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .leftJoinAndSelect('project.owner', 'owner');

    // Apply filters
    if (query.idSensorChannel) {
      queryBuilder.andWhere('log.idSensorChannel = :idSensorChannel', { idSensorChannel: query.idSensorChannel });
    }
    if (query.idSensor) {
      queryBuilder.andWhere('log.idSensor = :idSensor', { idSensor: query.idSensor });
    }
    if (query.idNode) {
      queryBuilder.andWhere('log.idNode = :idNode', { idNode: query.idNode });
    }
    if (query.idProject) {
      queryBuilder.andWhere('log.idProject = :idProject', { idProject: query.idProject });
    }
    if (query.idOwner) {
      queryBuilder.andWhere('log.idOwner = :idOwner', { idOwner: query.idOwner });
    }
    if (query.qualityFlag) {
      queryBuilder.andWhere('log.qualityFlag = :qualityFlag', { qualityFlag: query.qualityFlag });
    }
    if (query.ingestionSource) {
      queryBuilder.andWhere('log.ingestionSource = :ingestionSource', { ingestionSource: query.ingestionSource });
    }

    // Time range filtering
    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('log.ts BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    } else if (query.startDate) {
      queryBuilder.andWhere('log.ts >= :startDate', { startDate: new Date(query.startDate) });
    } else if (query.endDate) {
      queryBuilder.andWhere('log.ts <= :endDate', { endDate: new Date(query.endDate) });
    }

    // Apply pagination and ordering
    queryBuilder
      .orderBy('log.ts', 'DESC')
      .skip(skip)
      .take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      data: logs.map(log => this.toResponseDtoWithRelations(log)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get telemetry trends for node channels (for charts)
   */
  async getTelemetryTrends(
    nodeId: string,
    query: GetTelemetryTrendsQueryDto,
  ): Promise<SensorLogTelemetryTrendsResponseDto> {
    const startTime = Date.now();
    const hours = query.hours || 1;
    const intervalMinutes = query.intervalMinutes || 10;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Build channel filter
    const channelIds = query.channelIds ? query.channelIds.split(',').filter(id => id.trim()) : undefined;

    // Get logs with channel and sensor type info
    const queryBuilder = this.sensorLogRepository
      .createQueryBuilder('log')
      .leftJoin('log.sensorChannel', 'channel')
      .leftJoin('channel.sensorType', 'type')
      .select([
        'log.idSensorLog',
        'log.idSensorChannel',
        'log.ts',
        'log.valueEngineered',
        'log.qualityFlag',
        'channel.metricCode',
        'channel.unit',
        'type.category',
      ])
      .where('log.idNode = :nodeId', { nodeId })
      .andWhere('log.ts >= :startDate', { startDate })
      .orderBy('log.ts', 'ASC');

    if (channelIds && channelIds.length > 0) {
      queryBuilder.andWhere('log.idSensorChannel IN (:...channelIds)', { channelIds });
    }

    const logs = await queryBuilder.getMany();

    // Group by channel
    const channelMap = new Map<string, any[]>();
    logs.forEach((log: any) => {
      const channelId = log.idSensorChannel;
      if (!channelMap.has(channelId)) {
        channelMap.set(channelId, []);
      }
      channelMap.get(channelId)!.push(log);
    });

    // Build trend data per channel
    const channels: SensorLogTelemetryTrendDto[] = [];
    let totalDataPoints = 0;

    for (const [channelId, channelLogs] of channelMap) {
      if (channelLogs.length === 0) continue;

      const firstLog = channelLogs[0];
      const lastLog = channelLogs[channelLogs.length - 1];

      const values = channelLogs.map(l => l.valueEngineered || 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

      channels.push({
        idSensorChannel: channelId,
        metricCode: firstLog.sensorChannel?.metricCode || 'unknown',
        sensorTypeCategory: firstLog.sensorChannel?.sensorType?.category || 'unknown',
        unit: firstLog.sensorChannel?.unit || '',
        latestValue: lastLog.valueEngineered || 0,
        latestTimestamp: lastLog.ts,
        dataPoints: channelLogs.map(log => ({
          ts: log.ts,
          value: log.valueEngineered || 0,
          quality: log.qualityFlag || 'unknown',
        })),
        statistics: {
          min,
          max,
          avg: parseFloat(avg.toFixed(2)),
          count: channelLogs.length,
          firstValue: firstLog.valueEngineered || 0,
          lastValue: lastLog.valueEngineered || 0,
        },
      });

      totalDataPoints += channelLogs.length;
    }

    const queryTimeMs = Date.now() - startTime;

    return {
      idNode: nodeId,
      hours,
      channelCount: channels.length,
      totalDataPoints,
      channels,
      queryTimeMs,
    };
  }

  /**
   * Get sensor log statistics
   */
  async getStatistics(): Promise<SensorLogStatisticsDto> {
    // Total logs
    const totalLogs = await this.sensorLogRepository.count();

    // By quality
    const byQuality = await this.sensorLogRepository
      .createQueryBuilder('log')
      .select('log.qualityFlag', 'qualityFlag')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.qualityFlag')
      .getRawMany();

    const byQualityFormatted = byQuality.map(item => ({
      qualityFlag: item.qualityFlag || 'unknown',
      count: parseInt(item.count, 10),
      percentage: parseFloat(((parseInt(item.count, 10) / totalLogs) * 100).toFixed(2)),
    }));

    // By source
    const bySource = await this.sensorLogRepository
      .createQueryBuilder('log')
      .select('log.ingestionSource', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.ingestionSource')
      .getRawMany();

    const bySourceFormatted = bySource.map(item => ({
      source: item.source || 'unknown',
      count: parseInt(item.count, 10),
      percentage: parseFloat(((parseInt(item.count, 10) / totalLogs) * 100).toFixed(2)),
    }));

    // Recent activity
    const last24h = await this.sensorLogRepository.count({
      where: { ts: MoreThanOrEqual(new Date(Date.now() - 24 * 60 * 60 * 1000)) },
    });

    const lastHour = await this.sensorLogRepository.count({
      where: { ts: MoreThanOrEqual(new Date(Date.now() - 60 * 60 * 1000)) },
    });

    // Top channels
    const topChannels = await this.sensorLogRepository
      .createQueryBuilder('log')
      .leftJoin('log.sensorChannel', 'channel')
      .select('log.idSensorChannel', 'idSensorChannel')
      .addSelect('channel.metricCode', 'metricCode')
      .addSelect('COUNT(*)', 'logCount')
      .addSelect('MAX(log.valueEngineered)', 'latestValue')
      .addSelect('MAX(log.ts)', 'latestTimestamp')
      .groupBy('log.idSensorChannel')
      .addGroupBy('channel.metricCode')
      .orderBy('logCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalLogs,
      byQuality: byQualityFormatted,
      bySource: bySourceFormatted,
      recentActivity: {
        last24h,
        lastHour,
        averagePerMinute: lastHour > 0 ? parseFloat((lastHour / 60).toFixed(2)) : 0,
      },
      topChannels: topChannels.map(ch => ({
        idSensorChannel: ch.idSensorChannel,
        metricCode: ch.metricCode || 'unknown',
        logCount: parseInt(ch.logCount, 10),
        latestValue: parseFloat(ch.latestValue) || 0,
        latestTimestamp: ch.latestTimestamp,
      })),
    };
  }

  /**
   * Get single sensor log by ID
   */
  async findOne(id: string): Promise<SensorLogResponseDto> {
    const log = await this.sensorLogRepository.findOne({
      where: { idSensorLog: id },
    });

    if (!log) {
      throw new NotFoundException(`Sensor log with ID '${id}' not found`);
    }

    return this.toResponseDto(log);
  }

  /**
   * Delete old sensor logs (cleanup/archival)
   */
  async deleteOldLogs(daysToKeep: number): Promise<{ deleted: number }> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.sensorLogRepository
      .createQueryBuilder()
      .delete()
      .where('ts < :cutoffDate', { cutoffDate })
      .execute();

    return { deleted: result.affected || 0 };
  }

  /**
   * Transform entity to response DTO
   */
  private toResponseDto(log: SensorLog): SensorLogResponseDto {
    return {
      idSensorLog: log.idSensorLog.toString(),
      idSensorChannel: log.idSensorChannel,
      idSensor: log.idSensor,
      idNode: log.idNode,
      idProject: log.idProject,
      idOwner: log.idOwner,
      ts: log.ts,
      valueRaw: log.valueRaw,
      valueEngineered: log.valueEngineered,
      qualityFlag: log.qualityFlag,
      ingestionSource: log.ingestionSource,
      statusCode: log.statusCode,
      ingestionLatencyMs: log.ingestionLatencyMs,
      payloadSeq: log.payloadSeq,
      minThreshold: log.minThreshold,
      maxThreshold: log.maxThreshold,
      createdAt: log.createdAt,
    };
  }

  /**
   * Transform entity with relations to response DTO
   */
  private toResponseDtoWithRelations(log: SensorLog): SensorLogEnrichedResponseDto {
    const baseDto = this.toResponseDto(log);
    
    // Add related data if available
    const enriched: SensorLogEnrichedResponseDto = { ...baseDto };
    
    if (log.sensorChannel) {
      enriched.channelLabel = log.sensorChannel.metricCode || 'Unknown Channel';
      enriched.unit = log.sensorChannel.unit || '';
    }
    
    if (log.sensorChannel?.sensor) {
      enriched.sensorLabel = log.sensorChannel.sensor.label || 'Unknown Sensor';
      enriched.sensorCode = log.sensorChannel.sensor.sensorCode || '';
      
      // Get sensor type from sensorCatalog
      if (log.sensorChannel.sensor.sensorCatalog) {
        enriched.sensorType = log.sensorChannel.sensor.sensorCatalog.modelName || 'Unknown';
      }
      
      if (log.sensorChannel.sensor.node) {
        enriched.nodeName = log.sensorChannel.sensor.node.code || 'Unknown Node';
        enriched.nodeSerialNumber = log.sensorChannel.sensor.node.serialNumber || '';
        
        if (log.sensorChannel.sensor.node.project) {
          enriched.projectName = log.sensorChannel.sensor.node.project.name || 'Unknown Project';
          
          if (log.sensorChannel.sensor.node.project.owner) {
            enriched.ownerName = log.sensorChannel.sensor.node.project.owner.name || 'Unknown Owner';
          }
        }
      }
    }
    
    return enriched;
  }
}
