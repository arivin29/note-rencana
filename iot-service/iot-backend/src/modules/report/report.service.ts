import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { ReportTemplate } from '../../entities/report-template.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import {
  ReportRequestDto,
  ReportPreviewRequestDto,
  AggregationMode,
  RangeType,
} from './dto/report-request.dto';
import {
  ReportPreviewResponseDto,
  ReportColumnDto,
  ReportRowDto,
  ChartDataDto,
  SensorSummaryDto,
  ReportMetadataDto,
} from './dto/report-response.dto';
import {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  GenerateFromTemplateDto,
  ReportTemplateResponseDto,
} from './dto/report-template.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly clickhouseService: ClickhouseService,
    @InjectRepository(ReportTemplate)
    private readonly templateRepository: Repository<ReportTemplate>,
    @InjectRepository(SensorChannel)
    private readonly sensorChannelRepository: Repository<SensorChannel>,
  ) {}

  /**
   * Generate report preview data
   */
  async generatePreview(
    dto: ReportPreviewRequestDto,
    ownerId: string,
  ): Promise<ReportPreviewResponseDto> {
    // Jika fillGaps aktif, tidak perlu limit karena user butuh semua data
    const previewLimit = dto.fillGaps ? undefined : (dto.previewLimit || 1000);

    // Get sensor channel metadata
    const sensorChannels = await this.getSensorChannelMetadata(dto.sensorChannelIds);
    if (sensorChannels.length === 0) {
      throw new BadRequestException('No valid sensor channels found');
    }

    // Build and execute ClickHouse query
    let rawData = await this.executeAggregationQuery(dto);

    // Fill time gaps if requested (processed in NestJS)
    if (dto.fillGaps && dto.aggregation !== AggregationMode.RAW) {
      rawData = this.fillTimeGaps(
        rawData,
        dto.sensorChannelIds,
        dto.startDate,
        dto.endDate,
        dto.aggregation,
      );
    }

    // Transform data for response
    const columns = this.buildColumns(sensorChannels);
    const rows = this.buildRows(rawData, sensorChannels, previewLimit);
    const chartData = this.buildChartData(rawData, sensorChannels);
    const summary = this.buildSummary(rawData, sensorChannels);

    // Build metadata
    const metadata: ReportMetadataDto = {
      generatedAt: new Date().toISOString(),
      totalPoints: rawData.length,
      startDate: dto.startDate,
      endDate: dto.endDate,
      aggregation: dto.aggregation,
    };

    return {
      metadata,
      columns,
      rows,
      chartData,
      summary,
    };
  }

  /**
   * Generate full report data for export
   */
  async generateReportData(
    dto: ReportRequestDto,
    ownerId: string,
  ): Promise<{
    metadata: ReportMetadataDto;
    columns: ReportColumnDto[];
    rows: ReportRowDto[];
    summary: SensorSummaryDto[];
  }> {
    const sensorChannels = await this.getSensorChannelMetadata(dto.sensorChannelIds);
    if (sensorChannels.length === 0) {
      throw new BadRequestException('No valid sensor channels found');
    }

    let rawData = await this.executeAggregationQuery(dto);

    // Fill time gaps if requested (processed in NestJS)
    if (dto.fillGaps && dto.aggregation !== AggregationMode.RAW) {
      rawData = this.fillTimeGaps(
        rawData,
        dto.sensorChannelIds,
        dto.startDate,
        dto.endDate,
        dto.aggregation,
      );
    }

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalPoints: rawData.length,
        startDate: dto.startDate,
        endDate: dto.endDate,
        aggregation: dto.aggregation,
      },
      columns: this.buildColumns(sensorChannels),
      rows: this.buildRows(rawData, sensorChannels), // No limit for export
      summary: this.buildSummary(rawData, sensorChannels),
    };
  }

  /**
   * Execute ClickHouse aggregation query
   */
  private async executeAggregationQuery(dto: ReportRequestDto): Promise<any[]> {
    if (!this.clickhouseService.isAvailable()) {
      throw new BadRequestException('ClickHouse is not available');
    }

    const { sensorChannelIds, startDate, endDate, aggregation } = dto;
    const channelIdList = sensorChannelIds.map((id) => `'${id}'`).join(',');

    // Convert ISO dates to ClickHouse DateTime64 format
    const startDateCH = `parseDateTimeBestEffort('${startDate}')`;
    const endDateCH = `parseDateTimeBestEffort('${endDate}')`;

    let sql: string;
    // Add 7 hours for WIB (UTC+7)
    const wibOffset = 'addHours(event_time, 7)';

    if (aggregation === AggregationMode.RAW) {
      // Raw data - no aggregation
      sql = `
        SELECT 
          formatDateTime(${wibOffset}, '%Y-%m-%d %H:%i:%S') as ts,
          channel_id as id_sensor_channel,
          eng_value as value
        FROM iot.sensor_telemetry
        WHERE 
          channel_id IN (${channelIdList})
          AND event_time >= ${startDateCH}
          AND event_time <= ${endDateCH}
        ORDER BY event_time ASC, channel_id
        LIMIT 50000
      `;
    } else {
      // Aggregated data
      const intervalFunction = this.getClickHouseIntervalFunction(aggregation);
      sql = `
        SELECT 
          formatDateTime(addHours(${intervalFunction}(event_time), 7), '%Y-%m-%d %H:%i:%S') as ts,
          channel_id as id_sensor_channel,
          avg(eng_value) as avg_value,
          min(eng_value) as min_value,
          max(eng_value) as max_value,
          count() as point_count
        FROM iot.sensor_telemetry
        WHERE 
          channel_id IN (${channelIdList})
          AND event_time >= ${startDateCH}
          AND event_time <= ${endDateCH}
        GROUP BY ts, id_sensor_channel
        ORDER BY ts ASC, id_sensor_channel
        LIMIT 50000
      `;
    }

    this.logger.debug(`Executing ClickHouse query: ${sql}`);
    const result = await this.clickhouseService.executeQuery(sql);
    return result.rows;
  }

  /**
   * Fill time gaps in data with null values (processed in NestJS)
   * Logic: Loop dari tanggal awal sampai akhir per interval, 
   * cari data di rawData berdasarkan timestamp match
   */
  private fillTimeGaps(
    rawData: any[],
    sensorChannelIds: string[],
    startDate: string,
    endDate: string,
    aggregation: AggregationMode,
  ): any[] {
    if (aggregation === AggregationMode.RAW) {
      // Can't fill gaps for raw data - no fixed interval
      return rawData;
    }

    const intervalMs = this.getIntervalStep(aggregation) * 1000;
    
    // Parse dates and add 7 hours for WIB
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Align start to interval boundary (in WIB)
    const startWib = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const alignedStart = this.alignToInterval(startWib, aggregation);
    const endWib = new Date(end.getTime() + 7 * 60 * 60 * 1000);

    // Debug info
    this.logger.debug(`FillGaps - Raw data count: ${rawData.length}`);
    if (rawData.length > 0) {
      this.logger.debug(`FillGaps - Sample raw ts: "${rawData[0].ts}"`);
      this.logger.debug(`FillGaps - Sample raw channel: "${rawData[0].id_sensor_channel}"`);
    }

    // Build lookup map: key = "timestamp|channelId" (both normalized)
    const dataMap = new Map<string, any>();
    for (const row of rawData) {
      // Timestamp dari ClickHouse sudah dalam format "YYYY-MM-DD HH:mm:ss"
      const ts = String(row.ts).trim();
      const channelId = String(row.id_sensor_channel).toLowerCase().trim();
      const key = `${ts}|${channelId}`;
      dataMap.set(key, row);
    }

    this.logger.debug(`FillGaps - DataMap size: ${dataMap.size}`);
    if (dataMap.size > 0) {
      const sampleKey = Array.from(dataMap.keys())[0];
      this.logger.debug(`FillGaps - Sample map key: "${sampleKey}"`);
    }

    // Generate complete time series
    const result: any[] = [];
    let current = alignedStart.getTime();
    let matchCount = 0;
    
    while (current <= endWib.getTime()) {
      const ts = this.formatDateTimeWib(new Date(current));
      
      for (const channelId of sensorChannelIds) {
        const normalizedChannelId = channelId.toLowerCase().trim();
        const key = `${ts}|${normalizedChannelId}`;
        const existing = dataMap.get(key);
        
        if (existing) {
          matchCount++;
          result.push(existing);
        } else {
          // Add empty row for this time slot
          result.push({
            ts,
            id_sensor_channel: channelId,
            avg_value: null,
            min_value: null,
            max_value: null,
            point_count: 0,
          });
        }
      }
      
      current += intervalMs;
    }

    this.logger.debug(`FillGaps - Result: ${result.length} rows, matched ${matchCount}/${rawData.length}`);
    if (result.length > 0) {
      this.logger.debug(`FillGaps - First generated ts: "${result[0].ts}"`);
    }

    return result;
  }

  /**
   * Align datetime to interval boundary (using UTC)
   */
  private alignToInterval(date: Date, aggregation: AggregationMode): Date {
    const aligned = new Date(date);
    aligned.setUTCSeconds(0, 0);
    
    switch (aggregation) {
      case AggregationMode.ONE_MINUTE:
        // Already aligned to minute
        break;
      case AggregationMode.TEN_MINUTES:
        aligned.setUTCMinutes(Math.floor(aligned.getUTCMinutes() / 10) * 10);
        break;
      case AggregationMode.ONE_HOUR:
        aligned.setUTCMinutes(0);
        break;
      case AggregationMode.ONE_DAY:
        aligned.setUTCHours(0, 0, 0, 0);
        break;
    }
    
    return aligned;
  }

  /**
   * Format date to WIB string - use UTC methods since we already added WIB offset
   */
  private formatDateTimeWib(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Get interval step in seconds for time series generation
   */
  private getIntervalStep(aggregation: AggregationMode): number {
    switch (aggregation) {
      case AggregationMode.ONE_MINUTE:
        return 60;
      case AggregationMode.TEN_MINUTES:
        return 600;
      case AggregationMode.ONE_HOUR:
        return 3600;
      case AggregationMode.ONE_DAY:
        return 86400;
      default:
        return 3600;
    }
  }

  /**
   * Get ClickHouse interval function based on aggregation mode
   */
  private getClickHouseIntervalFunction(aggregation: AggregationMode): string {
    switch (aggregation) {
      case AggregationMode.ONE_MINUTE:
        return 'toStartOfMinute';
      case AggregationMode.TEN_MINUTES:
        return 'toStartOfTenMinutes';
      case AggregationMode.ONE_HOUR:
        return 'toStartOfHour';
      case AggregationMode.ONE_DAY:
        return 'toStartOfDay';
      default:
        return 'toStartOfHour';
    }
  }

  /**
   * Get sensor channel metadata from PostgreSQL
   */
  private async getSensorChannelMetadata(
    channelIds: string[],
  ): Promise<SensorChannel[]> {
    return this.sensorChannelRepository.find({
      where: { idSensorChannel: In(channelIds) },
      relations: ['sensor', 'sensor.node'],
    });
  }

  /**
   * Build column definitions
   */
  private buildColumns(sensorChannels: SensorChannel[]): ReportColumnDto[] {
    const columns: ReportColumnDto[] = [
      { key: 'timestamp', label: 'Timestamp' },
    ];

    for (const channel of sensorChannels) {
      const sensorName = channel.sensor?.label || 'Unknown Sensor';
      // Use address first, fallback to code, then 'Unknown Node'
      const node = channel.sensor?.node;
      const nodeName = node?.address || node?.code || 'Unknown Node';
      columns.push({
        key: channel.idSensorChannel,
        label: `${channel.metricCode} (${sensorName}) - ${nodeName}`,
        unit: channel.unit || undefined,
      });
    }

    return columns;
  }

  /**
   * Build data rows from raw ClickHouse data
   */
  private buildRows(
    rawData: any[],
    sensorChannels: SensorChannel[],
    limit?: number,
  ): ReportRowDto[] {
    // Group by timestamp
    const timestampMap = new Map<string, Record<string, number | null>>();

    for (const row of rawData) {
      const ts = row.ts.toString();
      if (!timestampMap.has(ts)) {
        timestampMap.set(ts, {});
      }
      const values = timestampMap.get(ts)!;
      values[row.id_sensor_channel] = row.avg_value ?? row.value ?? null;
    }

    // Convert to array
    let rows: ReportRowDto[] = Array.from(timestampMap.entries()).map(
      ([timestamp, values]) => ({
        timestamp,
        values,
      }),
    );

    // Sort by timestamp
    rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Apply limit if specified
    if (limit && rows.length > limit) {
      rows = rows.slice(0, limit);
    }

    return rows;
  }

  /**
   * Build chart data for ApexCharts
   */
  private buildChartData(
    rawData: any[],
    sensorChannels: SensorChannel[],
  ): ChartDataDto {
    // Get unique timestamps
    const timestamps = [...new Set(rawData.map((r) => r.ts.toString()))].sort();

    // Build series for each sensor channel
    const series = sensorChannels.map((channel) => {
      const channelData = rawData.filter(
        (r) => r.id_sensor_channel === channel.idSensorChannel,
      );
      const dataMap = new Map(
        channelData.map((r) => [r.ts.toString(), r.avg_value ?? r.value ?? null]),
      );

      return {
        name: `${channel.metricCode}`,
        data: timestamps.map((ts) => dataMap.get(ts) ?? null),
      };
    });

    return {
      categories: timestamps,
      series,
    };
  }

  /**
   * Build summary statistics
   */
  private buildSummary(
    rawData: any[],
    sensorChannels: SensorChannel[],
  ): SensorSummaryDto[] {
    return sensorChannels.map((channel) => {
      const channelData = rawData.filter(
        (r) => r.id_sensor_channel === channel.idSensorChannel,
      );

      const values = channelData
        .map((r) => r.avg_value ?? r.value)
        .filter((v) => v !== null && v !== undefined);

      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const avg =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;

      return {
        sensorChannelId: channel.idSensorChannel,
        label: `${channel.metricCode}`,
        unit: channel.unit || undefined,
        min: Math.round(min * 1000) / 1000,
        max: Math.round(max * 1000) / 1000,
        avg: Math.round(avg * 1000) / 1000,
        count: values.length,
      };
    });
  }

  // ============================================================
  // Template Management
  // ============================================================

  /**
   * Create a new report template
   */
  async createTemplate(
    dto: CreateReportTemplateDto,
    userId: string,
    ownerId: string,
  ): Promise<ReportTemplateResponseDto> {
    const template = this.templateRepository.create({
      idOwner: ownerId,
      idUser: userId,
      name: dto.name,
      description: dto.description,
      config: dto.config,
      isActive: true,
    });

    const saved = await this.templateRepository.save(template);
    return this.mapTemplateToResponse(saved);
  }

  /**
   * Get all templates for owner
   */
  async getTemplates(ownerId: string): Promise<ReportTemplateResponseDto[]> {
    const templates = await this.templateRepository.find({
      where: { idOwner: ownerId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    return templates.map((t) => this.mapTemplateToResponse(t));
  }

  /**
   * Get template by ID
   */
  async getTemplateById(
    id: string,
    ownerId: string,
  ): Promise<ReportTemplateResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id, idOwner: ownerId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.mapTemplateToResponse(template);
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    dto: UpdateReportTemplateDto,
    ownerId: string,
  ): Promise<ReportTemplateResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id, idOwner: ownerId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (dto.name) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.config) template.config = dto.config;

    const saved = await this.templateRepository.save(template);
    return this.mapTemplateToResponse(saved);
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(id: string, ownerId: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id, idOwner: ownerId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    template.isActive = false;
    await this.templateRepository.save(template);
  }

  /**
   * Generate report from template
   */
  async generateFromTemplate(
    templateId: string,
    dto: GenerateFromTemplateDto,
    ownerId: string,
  ): Promise<ReportPreviewResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, idOwner: ownerId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Calculate date range based on template config or custom dates
    const { startDate, endDate } = dto.customStartDate && dto.customEndDate
      ? { startDate: dto.customStartDate, endDate: dto.customEndDate }
      : this.calculateDateRange(template.config.rangeType as RangeType);

    const reportRequest: ReportPreviewRequestDto = {
      sensorChannelIds: template.config.sensorChannelIds,
      projectId: template.config.projectId,
      nodeIds: template.config.nodeIds,
      startDate,
      endDate,
      aggregation: template.config.aggregation as AggregationMode,
    };

    return this.generatePreview(reportRequest, ownerId);
  }

  /**
   * Generate report data from template (for XLSX export)
   */
  async generateReportDataFromTemplate(
    templateId: string,
    dto: GenerateFromTemplateDto,
    ownerId: string,
  ): Promise<{
    metadata: ReportMetadataDto;
    columns: ReportColumnDto[];
    rows: ReportRowDto[];
    summary: SensorSummaryDto[];
  }> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, idOwner: ownerId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Calculate date range based on template config or custom dates
    const { startDate, endDate } = dto.customStartDate && dto.customEndDate
      ? { startDate: dto.customStartDate, endDate: dto.customEndDate }
      : this.calculateDateRange(template.config.rangeType as RangeType);

    const reportRequest: ReportRequestDto = {
      sensorChannelIds: template.config.sensorChannelIds,
      projectId: template.config.projectId,
      nodeIds: template.config.nodeIds,
      startDate,
      endDate,
      aggregation: template.config.aggregation as AggregationMode,
    };

    return this.generateReportData(reportRequest, ownerId);
  }

  /**
   * Calculate date range based on range type
   */
  private calculateDateRange(rangeType: RangeType): {
    startDate: string;
    endDate: string;
  } {
    const endDate = new Date();
    let startDate: Date;

    switch (rangeType) {
      case RangeType.ONE_DAY:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case RangeType.ONE_WEEK:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case RangeType.ONE_MONTH:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  /**
   * Map entity to response DTO
   */
  private mapTemplateToResponse(
    template: ReportTemplate,
  ): ReportTemplateResponseDto {
    return {
      id: template.id,
      ownerId: template.idOwner,
      userId: template.idUser,
      name: template.name,
      description: template.description || undefined,
      config: template.config as any,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
