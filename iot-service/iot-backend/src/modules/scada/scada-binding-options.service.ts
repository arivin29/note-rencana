import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { ScadaAccessService, ScadaRequestUser } from './scada-access.service';
import { ScadaBindingOptionItemDto, ScadaBindingOptionsQueryDto } from './dto';

@Injectable()
export class ScadaBindingOptionsService {
  constructor(
    @InjectRepository(SensorChannel)
    private readonly sensorChannelRepository: Repository<SensorChannel>,
    private readonly scadaAccessService: ScadaAccessService,
  ) {}

  async findAll(
    query: ScadaBindingOptionsQueryDto,
    user: ScadaRequestUser,
  ): Promise<ScadaBindingOptionItemDto[]> {
    const ownerId = this.scadaAccessService.resolveOwnerScope(query.ownerId, user);

    if (query.projectId) {
      await this.scadaAccessService.assertProjectAccess(query.projectId, ownerId, user);
    }

    const queryBuilder = this.sensorChannelRepository
      .createQueryBuilder('channel')
      .innerJoinAndSelect('channel.sensor', 'sensor')
      .innerJoinAndSelect('sensor.node', 'node')
      .innerJoinAndSelect('node.project', 'project')
      .innerJoinAndSelect('channel.sensorType', 'sensorType')
      .where('project.idOwner = :ownerId', { ownerId })
      .orderBy('project.name', 'ASC')
      .addOrderBy('node.code', 'ASC')
      .addOrderBy('sensor.label', 'ASC')
      .addOrderBy('channel.metricCode', 'ASC');

    if (query.projectId) {
      queryBuilder.andWhere('project.idProject = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.sensorTypeId) {
      queryBuilder.andWhere('channel.idSensorType = :sensorTypeId', {
        sensorTypeId: query.sensorTypeId,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        `(channel.metricCode ILIKE :search OR sensor.label ILIKE :search OR sensor.sensorCode ILIKE :search OR node.code ILIKE :search OR node.name ILIKE :search)`,
        {
          search: `%${query.search}%`,
        },
      );
    }

    const channels = await queryBuilder.getMany();

    return channels.map((channel) => ({
      idSensorChannel: channel.idSensorChannel,
      metricCode: channel.metricCode,
      unit: channel.unit,
      precision: channel.precision !== null && channel.precision !== undefined ? Number(channel.precision) : null,
      minThreshold:
        channel.minThreshold !== null && channel.minThreshold !== undefined ? Number(channel.minThreshold) : null,
      maxThreshold:
        channel.maxThreshold !== null && channel.maxThreshold !== undefined ? Number(channel.maxThreshold) : null,
      sensor: {
        idSensor: channel.sensor.idSensor,
        label: channel.sensor.label,
        sensorCode: channel.sensor.sensorCode,
        status: channel.sensor.status,
      },
      node: {
        idNode: channel.sensor.node.idNode,
        code: channel.sensor.node.code,
        name: channel.sensor.node.name || channel.sensor.node.address || null,
        address: channel.sensor.node.address,
      },
      project: {
        idProject: channel.sensor.node.project.idProject,
        name: channel.sensor.node.project.name,
      },
      sensorType: {
        idSensorType: channel.sensorType.idSensorType,
        category: channel.sensorType.category,
        defaultUnit: channel.sensorType.defaultUnit,
        precision:
          channel.sensorType.precision !== null && channel.sensorType.precision !== undefined
            ? Number(channel.sensorType.precision)
            : null,
      },
    }));
  }
}
