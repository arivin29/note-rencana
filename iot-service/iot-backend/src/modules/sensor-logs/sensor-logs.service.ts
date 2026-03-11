import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { SensorLog } from '../../entities/sensor-log.entity';
import {
  CreateSensorLogDto,
  BulkCreateSensorLogsDto,
  GetSensorLogsQueryDto,
  GetTelemetryTrendsQueryDto,
  ExportSensorLogsQueryDto,
  AggregationMode,
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

    // Apply owner filter if provided
    if (query.ownerId) {
      queryBuilder.andWhere('log.idOwner = :ownerId', { ownerId: query.ownerId });
    }

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
  async getStatistics(ownerId?: string): Promise<SensorLogStatisticsDto> {
    // Base query builder for owner filtering
    const baseQuery = this.sensorLogRepository.createQueryBuilder('log');
    
    if (ownerId) {
      baseQuery.where('log.idOwner = :ownerId', { ownerId });
    }

    // Total logs
    const totalLogs = await baseQuery.getCount();

    // By quality
    const qualityQuery = this.sensorLogRepository
      .createQueryBuilder('log')
      .select('log.qualityFlag', 'qualityFlag')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.qualityFlag');
    
    if (ownerId) {
      qualityQuery.where('log.idOwner = :ownerId', { ownerId });
    }
    
    const byQuality = await qualityQuery.getRawMany();

    const byQualityFormatted = byQuality.map(item => ({
      qualityFlag: item.qualityFlag || 'unknown',
      count: parseInt(item.count, 10),
      percentage: totalLogs > 0 ? parseFloat(((parseInt(item.count, 10) / totalLogs) * 100).toFixed(2)) : 0,
    }));

    // By source
    const sourceQuery = this.sensorLogRepository
      .createQueryBuilder('log')
      .select('log.ingestionSource', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.ingestionSource');
    
    if (ownerId) {
      sourceQuery.where('log.idOwner = :ownerId', { ownerId });
    }
    
    const bySource = await sourceQuery.getRawMany();

    const bySourceFormatted = bySource.map(item => ({
      source: item.source || 'unknown',
      count: parseInt(item.count, 10),
      percentage: totalLogs > 0 ? parseFloat(((parseInt(item.count, 10) / totalLogs) * 100).toFixed(2)) : 0,
    }));

    // Recent activity - last 24h
    const last24hQuery = this.sensorLogRepository
      .createQueryBuilder('log')
      .where('log.ts >= :date', { date: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    
    if (ownerId) {
      last24hQuery.andWhere('log.idOwner = :ownerId', { ownerId });
    }
    
    const last24h = await last24hQuery.getCount();

    // Recent activity - last hour
    const lastHourQuery = this.sensorLogRepository
      .createQueryBuilder('log')
      .where('log.ts >= :date', { date: new Date(Date.now() - 60 * 60 * 1000) });
    
    if (ownerId) {
      lastHourQuery.andWhere('log.idOwner = :ownerId', { ownerId });
    }
    
    const lastHour = await lastHourQuery.getCount();

    // Top channels
    const topChannelsQuery = this.sensorLogRepository
      .createQueryBuilder('log')
      .leftJoin('log.sensorChannel', 'channel')
      .select('log.idSensorChannel', 'idSensorChannel')
      .addSelect('channel.metricCode', 'metricCode')
      .addSelect('COUNT(*)', 'logCount')
      .addSelect('MAX(log.valueEngineered)', 'latestValue')
      .addSelect('MAX(log.ts)', 'latestTimestamp')
      .groupBy('log.idSensorChannel')
      .addGroupBy('channel.metricCode')
      .orderBy('"logCount"', 'DESC')
      .limit(10);
    
    if (ownerId) {
      topChannelsQuery.where('log.idOwner = :ownerId', { ownerId });
    }
    
    const topChannels = await topChannelsQuery.getRawMany();

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

  /**
   * Export sensor logs as CSV
   */
  async exportCsv(query: ExportSensorLogsQueryDto): Promise<string> {
    const aggregation = query.aggregation || AggregationMode.ONE_HOUR;
    
    // Determine date range based on aggregation mode
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    let startDate: Date;
    
    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      switch (aggregation) {
        case AggregationMode.FIVE_MINUTES:
        case AggregationMode.FIFTEEN_MINUTES:
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours
          break;
        case AggregationMode.ONE_HOUR:
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
          break;
        case AggregationMode.ONE_DAY:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
          break;
        case AggregationMode.ONE_MONTH:
          startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year
          break;
        default:
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // default 7 days
      }
    }

    // Build query with relations
    const queryBuilder = this.sensorLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.sensorChannel', 'channel')
      .leftJoinAndSelect('channel.sensor', 'sensor')
      .leftJoinAndSelect('sensor.sensorCatalog', 'sensorCatalog')
      .leftJoinAndSelect('sensor.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('log.ts BETWEEN :startDate AND :endDate', { startDate, endDate });

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

    queryBuilder.orderBy('log.ts', 'ASC');
    
    // Limit results to prevent memory issues
    const limit = aggregation === AggregationMode.ONE_DAY || aggregation === AggregationMode.ONE_MONTH 
      ? 100000 
      : 50000;
    queryBuilder.take(limit);

    const logs = await queryBuilder.getMany();

    // Get interval in minutes for aggregation
    let intervalMinutes: number;
    switch (aggregation) {
      case AggregationMode.FIVE_MINUTES:
        intervalMinutes = 5;
        break;
      case AggregationMode.FIFTEEN_MINUTES:
        intervalMinutes = 15;
        break;
      case AggregationMode.ONE_HOUR:
        intervalMinutes = 60;
        break;
      case AggregationMode.ONE_DAY:
        intervalMinutes = 1440;
        break;
      case AggregationMode.ONE_MONTH:
        intervalMinutes = 43200;
        break;
      default:
        intervalMinutes = 60;
    }

    // Aggregate data
    const aggregatedData = this.aggregateLogsForExport(logs, intervalMinutes);

    // Convert to CSV
    return this.convertToCSV(aggregatedData, aggregation);
  }

  /**
   * Aggregate logs for export by time window
   */
  private aggregateLogsForExport(logs: SensorLog[], intervalMinutes: number): any[] {
    if (logs.length === 0) return [];

    const grouped = new Map<string, {
      windowStart: Date;
      channel: string;
      sensor: string;
      sensorType: string;
      node: string;
      project: string;
      owner: string;
      unit: string;
      values: number[];
    }>();

    for (const log of logs) {
      const ts = new Date(log.ts);
      const windowStart = new Date(
        Math.floor(ts.getTime() / (intervalMinutes * 60 * 1000)) * intervalMinutes * 60 * 1000
      );
      
      const channelLabel = log.sensorChannel?.metricCode || 'Unknown';
      const sensorLabel = log.sensorChannel?.sensor?.label || 'Unknown';
      const sensorType = log.sensorChannel?.sensor?.sensorCatalog?.modelName || 'Unknown';
      const nodeCode = log.sensorChannel?.sensor?.node?.code || 'Unknown';
      const projectName = log.sensorChannel?.sensor?.node?.project?.name || 'Unknown';
      const ownerName = log.sensorChannel?.sensor?.node?.project?.owner?.name || 'Unknown';
      const unit = log.sensorChannel?.unit || '';
      
      const key = `${windowStart.toISOString()}_${log.idSensorChannel}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          windowStart,
          channel: channelLabel,
          sensor: sensorLabel,
          sensorType,
          node: nodeCode,
          project: projectName,
          owner: ownerName,
          unit,
          values: [],
        });
      }
      
      if (log.valueEngineered !== null && log.valueEngineered !== undefined) {
        grouped.get(key)!.values.push(log.valueEngineered);
      }
    }

    // Calculate aggregates
    const result: any[] = [];
    for (const [_, data] of grouped) {
      if (data.values.length === 0) continue;
      
      const min = Math.min(...data.values);
      const max = Math.max(...data.values);
      const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
      const latest = data.values[data.values.length - 1];
      
      result.push({
        timestamp: data.windowStart.toISOString(),
        channel: data.channel,
        sensor: data.sensor,
        sensorType: data.sensorType,
        node: data.node,
        project: data.project,
        owner: data.owner,
        unit: data.unit,
        min: min.toFixed(2),
        avg: avg.toFixed(2),
        max: max.toFixed(2),
        latest: latest.toFixed(2),
        points: data.values.length,
      });
    }

    // Sort by timestamp and channel
    result.sort((a, b) => {
      const timeCompare = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeCompare !== 0) return timeCompare;
      return a.channel.localeCompare(b.channel);
    });

    return result;
  }

  /**
   * Convert aggregated data to CSV string
   */
  private convertToCSV(data: any[], aggregation: string): string {
    if (data.length === 0) {
      return 'No data available for the selected filters and time range';
    }

    const headers = [
      'Timestamp',
      'Channel',
      'Sensor',
      'Sensor Type',
      'Node',
      'Project',
      'Owner',
      'Unit',
      'Min',
      'Avg',
      'Max',
      'Latest',
      'Points',
    ];

    const rows = data.map(row => [
      row.timestamp,
      row.channel,
      row.sensor,
      row.sensorType,
      row.node,
      row.project,
      row.owner,
      row.unit,
      row.min,
      row.avg,
      row.max,
      row.latest,
      row.points,
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}
