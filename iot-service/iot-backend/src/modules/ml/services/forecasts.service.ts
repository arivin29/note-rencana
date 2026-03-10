import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import { ForecastResult } from '../../../entities/forecast-result.entity';
import {
  QueryForecastsDto,
  ForecastResponseDto,
  ForecastComparisonDto,
} from '../dto/forecast.dto';

@Injectable()
export class ForecastsService {
  private readonly logger = new Logger(ForecastsService.name);

  constructor(
    @InjectRepository(ForecastResult)
    private readonly forecastRepository: Repository<ForecastResult>,
  ) {}

  /**
   * Find latest forecast for a sensor channel
   */
  async findLatest(idSensorChannel: string): Promise<ForecastResponseDto | null> {
    const forecast = await this.forecastRepository
      .createQueryBuilder('forecast')
      .leftJoinAndSelect('forecast.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .addSelect(['sensor.idSensor', 'sensor.sensorKey', 'sensor.sensorName'])
      .addSelect(['node.idNode', 'node.nodeName', 'node.deviceId'])
      .where('forecast.idSensorChannel = :idSensorChannel', { idSensorChannel })
      .andWhere('forecast.isCurrent = :isCurrent', { isCurrent: true })
      .orderBy('forecast.generatedAt', 'DESC')
      .getOne();

    if (!forecast) {
      return null;
    }

    return this.toResponseDto(forecast);
  }

  /**
   * Find forecasts with filters
   */
  async findAll(query: QueryForecastsDto): Promise<{
    data: ForecastResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 168;
    const skip = (page - 1) * limit;

    const qb = this.forecastRepository
      .createQueryBuilder('forecast')
      .leftJoinAndSelect('forecast.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .leftJoin('node.owner', 'owner')
      .addSelect(['sensor.idSensor', 'sensor.sensorKey', 'sensor.sensorName'])
      .addSelect(['node.idNode', 'node.nodeName', 'node.deviceId'])
      .orderBy('forecast.generatedAt', 'DESC');

    // Apply filters
    if (query.idSensorChannel) {
      qb.andWhere('forecast.idSensorChannel = :idSensorChannel', {
        idSensorChannel: query.idSensorChannel,
      });
    }

    if (query.ownerId) {
      qb.andWhere('owner.idOwner = :ownerId', { ownerId: query.ownerId });
    }

    if (query.deviceId) {
      qb.andWhere('node.deviceId = :deviceId', { deviceId: query.deviceId });
    }

    if (query.sensorKey) {
      qb.andWhere('sensor.sensorKey = :sensorKey', { sensorKey: query.sensorKey });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: data.map(this.toResponseDto),
      total,
      page,
      limit,
    };
  }

  /**
   * Find one forecast by ID
   */
  async findOne(id: string): Promise<ForecastResponseDto> {
    const forecast = await this.forecastRepository
      .createQueryBuilder('forecast')
      .leftJoinAndSelect('forecast.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .addSelect(['sensor.idSensor', 'sensor.sensorKey', 'sensor.sensorName'])
      .addSelect(['node.idNode', 'node.nodeName', 'node.deviceId'])
      .where('forecast.idForecastResult = :id', { id })
      .getOne();

    if (!forecast) {
      throw new NotFoundException(`Forecast with ID ${id} not found`);
    }

    return this.toResponseDto(forecast);
  }

  /**
   * Get forecast for specific time range
   */
  async getForecastRange(
    idSensorChannel: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Array<{ forecastTime: Date; predictedValue: number; confidenceLower: number; confidenceUpper: number }>> {
    // Get forecasts within the time range
    const forecasts = await this.forecastRepository.find({
      where: {
        idSensorChannel,
        forecastTime: Between(startTime, endTime),
        isCurrent: true,
      },
      order: { forecastTime: 'ASC' },
    });

    return forecasts.map((f) => ({
      forecastTime: f.forecastTime,
      predictedValue: f.predictedValue,
      confidenceLower: f.lowerBound,
      confidenceUpper: f.upperBound,
    }));
  }

  /**
   * Get available sensor channels with forecasts
   */
  async getAvailableChannels(ownerId?: string): Promise<
    Array<{
      idSensorChannel: string;
      channelName: string;
      sensorKey: string;
      deviceId: string;
      lastForecastAt: Date;
    }>
  > {
    const qb = this.forecastRepository
      .createQueryBuilder('forecast')
      .leftJoin('forecast.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .leftJoin('node.owner', 'owner')
      .select('forecast.idSensorChannel', 'idSensorChannel')
      .addSelect('channel.metricCode', 'channelName')
      .addSelect('sensor.sensorKey', 'sensorKey')
      .addSelect('node.deviceId', 'deviceId')
      .addSelect('MAX(forecast.generatedAt)', 'lastForecastAt')
      .groupBy('forecast.idSensorChannel')
      .addGroupBy('channel.metricCode')
      .addGroupBy('sensor.sensorKey')
      .addGroupBy('node.deviceId');

    if (ownerId) {
      qb.andWhere('owner.idOwner = :ownerId', { ownerId });
    }

    return qb.getRawMany();
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(entity: ForecastResult): ForecastResponseDto {
    const response: ForecastResponseDto = {
      idForecastResult: entity.idForecastResult,
      idSensorChannel: entity.idSensorChannel,
      forecastGeneratedAt: entity.generatedAt,
      forecastHorizonHours: 168, // 7 days default
      modelVersion: entity.modelType || 'seasonal-decomposition-v1',
      forecastData: [],
      createdAt: entity.createdAt,
    };

    // Add joined data if available
    if (entity.sensorChannel) {
      response.sensorChannel = {
        idSensorChannel: entity.sensorChannel.idSensorChannel,
        channelName: entity.sensorChannel.metricCode,
        unitMeasure: entity.sensorChannel.unit,
      };

      // Access sensor through type casting
      const sensor = (entity.sensorChannel as any).sensor;
      if (sensor) {
        response.sensor = {
          idSensor: sensor.idSensor,
          sensorKey: sensor.sensorKey,
          sensorName: sensor.sensorName,
        };

        const node = sensor.node;
        if (node) {
          response.node = {
            idNode: node.idNode,
            nodeName: node.nodeName,
            deviceId: node.deviceId,
          };
        }
      }
    }

    return response;
  }
}
