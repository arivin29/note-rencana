import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Sensor } from '../../entities/sensor.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorResponseDto, SensorDetailedResponseDto } from './dto/sensor-response.dto';

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
    @InjectRepository(SensorChannel)
    private readonly sensorChannelRepository: Repository<SensorChannel>,
  ) {}

  async create(createDto: CreateSensorDto): Promise<SensorResponseDto> {
    const sensor = this.sensorRepository.create({
      idNode: createDto.idNode,
      idSensorCatalog: createDto.idSensorCatalog,
      sensorCode: createDto.sensorCode,
      label: createDto.label,
      location: createDto.location,
      status: createDto.status || 'active',
      protocolChannel: createDto.protocolChannel,
      calibrationFactor: createDto.calibrationFactor,
      samplingRate: createDto.samplingRate,
      installDate: createDto.installDate ? new Date(createDto.installDate) : undefined,
      calibrationDueAt: createDto.calibrationDueAt ? new Date(createDto.calibrationDueAt) : undefined,
    });

    const saved = await this.sensorRepository.save(sensor);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    idNode?: string;
    idSensorCatalog?: string;
  }): Promise<{ data: SensorResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Sensor> = {};

    if (params.idNode) {
      where.idNode = params.idNode;
    }

    if (params.idSensorCatalog) {
      where.idSensorCatalog = params.idSensorCatalog;
    }

    if (params.search) {
      where.label = ILike(`%${params.search}%`);
    }

    const [items, total] = await this.sensorRepository.findAndCount({
      where,
      relations: ['node', 'sensorCatalog'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: items.map((item) => this.toResponseDto(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<SensorResponseDto> {
    const sensor = await this.sensorRepository.findOne({
      where: { idSensor: id },
      relations: ['node', 'sensorCatalog'],
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }

    return this.toResponseDto(sensor);
  }

  async findOneDetailed(id: string): Promise<SensorDetailedResponseDto> {
    const sensor = await this.sensorRepository.findOne({
      where: { idSensor: id },
      relations: ['node', 'sensorCatalog', 'sensorChannels'],
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }

    return this.toDetailedResponseDto(sensor);
  }

  async update(id: string, updateDto: UpdateSensorDto): Promise<SensorResponseDto> {
    const sensor = await this.sensorRepository.findOne({
      where: { idSensor: id },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }

    Object.assign(sensor, {
      ...updateDto,
      installDate: updateDto.installDate ? new Date(updateDto.installDate) : sensor.installDate,
      calibrationDueAt: updateDto.calibrationDueAt ? new Date(updateDto.calibrationDueAt) : sensor.calibrationDueAt,
    });

    const updated = await this.sensorRepository.save(sensor);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const sensor = await this.sensorRepository.findOne({
      where: { idSensor: id },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }

    await this.sensorRepository.remove(sensor);
  }

  private toResponseDto(sensor: Sensor): SensorResponseDto {
    return {
      idSensor: sensor.idSensor,
      idNode: sensor.idNode,
      idSensorCatalog: sensor.idSensorCatalog,
      sensorCode: sensor.sensorCode,
      label: sensor.label,
      location: sensor.location,
      status: sensor.status,
      protocolChannel: sensor.protocolChannel,
      calibrationFactor: sensor.calibrationFactor,
      samplingRate: sensor.samplingRate,
      installDate: sensor.installDate,
      calibrationDueAt: sensor.calibrationDueAt,
      createdAt: sensor.createdAt,
      updatedAt: sensor.updatedAt,
      node: sensor.node ? {
        idNode: sensor.node.idNode,
        code: sensor.node.code,
        connectivityStatus: sensor.node.connectivityStatus,
      } : undefined,
      sensorCatalog: sensor.sensorCatalog ? {
        idSensorCatalog: sensor.sensorCatalog.idSensorCatalog,
        vendor: sensor.sensorCatalog.vendor,
        modelName: sensor.sensorCatalog.modelName,
      } : undefined,
    };
  }

  private toDetailedResponseDto(sensor: Sensor): SensorDetailedResponseDto {
    const base = this.toResponseDto(sensor);

    const calibrationStatus = this.getCalibrationStatus(sensor);

    return {
      ...base,
      sensorChannels: sensor.sensorChannels || [],
      calibrationStatus,
    };
  }

  private getCalibrationStatus(sensor: Sensor) {
    if (!sensor.calibrationDueAt) {
      return {
        isCalibrated: !!sensor.calibrationFactor,
        isOverdue: false,
      };
    }

    const now = new Date();
    const dueDate = new Date(sensor.calibrationDueAt);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isCalibrated: !!sensor.calibrationFactor,
      daysUntilDue: diffDays,
      isOverdue: diffDays < 0,
    };
  }

  // Statistics & Aggregation Methods
  async getStatisticsOverview(): Promise<any> {
    const totalSensors = await this.sensorRepository.count();
    
    // Count sensors needing calibration
    const now = new Date();
    const sensorsNeedingCalibration = await this.sensorRepository
      .createQueryBuilder('sensor')
      .where('sensor.calibrationDueAt IS NOT NULL')
      .andWhere('sensor.calibrationDueAt < :now', { now })
      .getCount();

    // Get sensors by catalog
    const sensorsByCatalog = await this.sensorRepository
      .createQueryBuilder('sensor')
      .leftJoin('sensor.sensorCatalog', 'catalog')
      .select('catalog.modelName', 'catalogName')
      .addSelect('COUNT(sensor.idSensor)', 'count')
      .where('catalog.modelName IS NOT NULL')
      .groupBy('catalog.modelName')
      .orderBy('COUNT(sensor.idSensor)', 'DESC')
      .limit(10)
      .getRawMany();

    const catalogData = sensorsByCatalog.map(item => ({
      catalogName: item.catalogName,
      count: parseInt(item.count),
      percentage: totalSensors > 0 ? (parseInt(item.count) / totalSensors) * 100 : 0,
    }));

    // Get sensors by node
    const sensorsByNode = await this.sensorRepository
      .createQueryBuilder('sensor')
      .leftJoin('sensor.node', 'node')
      .select('node.idNode', 'idNode')
      .addSelect('node.code', 'nodeCode')
      .addSelect('COUNT(sensor.idSensor)', 'sensorCount')
      .where('node.code IS NOT NULL')
      .groupBy('node.idNode')
      .addGroupBy('node.code')
      .orderBy('COUNT(sensor.idSensor)', 'DESC')
      .limit(10)
      .getRawMany();

    const nodeData = sensorsByNode.map(item => ({
      idNode: item.idNode,
      nodeCode: item.nodeCode,
      sensorCount: parseInt(item.sensorCount),
    }));

    // Calibration overview
    const calibrated = await this.sensorRepository
      .createQueryBuilder('sensor')
      .where('sensor.calibrationFactor IS NOT NULL')
      .getCount();

    return {
      totalSensors,
      activeSensors: totalSensors, // Could be refined with actual status
      sensorsNeedingCalibration,
      sensorsByCatalog: catalogData,
      sensorsByNode: nodeData,
      calibrationOverview: {
        calibrated,
        needsCalibration: sensorsNeedingCalibration,
        overdue: sensorsNeedingCalibration,
        percentage: totalSensors > 0 ? (calibrated / totalSensors) * 100 : 0,
      },
    };
  }

  async getDashboard(id: string): Promise<any> {
    const sensor = await this.sensorRepository.findOne({
      where: { idSensor: id },
      relations: ['node', 'sensorCatalog'],
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }

    // Get channels with full entity
    const channels = await this.sensorChannelRepository.find({
      where: { idSensor: id },
      order: { metricCode: 'ASC' },
    });

    const channelData = channels.map(channel => ({
      idSensorChannel: channel.idSensorChannel,
      metricCode: channel.metricCode,
      unit: channel.unit,
      latestValue: null,
      status: 'active',
    }));

    // Recent activity (placeholder)
    const recentActivity: Array<{timestamp: Date, type: string, description: string}> = [];

    if (sensor.updatedAt) {
      recentActivity.push({
        timestamp: sensor.updatedAt,
        type: 'update',
        description: 'Sensor configuration updated',
      });
    }

    if (sensor.installDate) {
      recentActivity.push({
        timestamp: sensor.installDate,
        type: 'installation',
        description: 'Sensor installed',
      });
    }

    // Health status
    const calibrationStatus = this.getCalibrationStatus(sensor);
    let calibrationHealth = 'good';
    if (calibrationStatus?.isOverdue) calibrationHealth = 'critical';
    else if (calibrationStatus?.daysUntilDue && calibrationStatus.daysUntilDue < 7) calibrationHealth = 'warning';

    const health = {
      overall: calibrationHealth,
      calibrationStatus: calibrationHealth,
      channelStatus: channelData.length > 0 ? 'active' : 'no-channels',
      lastReading: null,
    };

    return {
      sensor: {
        ...this.toResponseDto(sensor),
        calibrationStatus,
      },
      channels: channelData,
      recentActivity: recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      health,
    };
  }

  async getChannels(id: string): Promise<any[]> {
    // Verify sensor exists
    const sensor = await this.sensorRepository.findOne({
      where: { idSensor: id },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }

    // Query channels with full entity data
    const channels = await this.sensorChannelRepository.find({
      where: { idSensor: id },
      order: { metricCode: 'ASC' },
    });

    return channels.map(channel => ({
      idSensorChannel: channel.idSensorChannel,
      metricCode: channel.metricCode,
      unit: channel.unit,
      minThreshold: channel.minThreshold,
      maxThreshold: channel.maxThreshold,
      offsetValue: channel.offsetValue,
      multiplier: channel.multiplier,
      idSensorType: channel.idSensorType,
    }));
  }
}

