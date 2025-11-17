import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertEvent } from '../../entities/alert-event.entity';
import { CreateAlertEventDto } from './dto/create-alert-event.dto';
import { UpdateAlertEventDto, AcknowledgeAlertEventDto, ClearAlertEventDto } from './dto/update-alert-event.dto';
import { AlertEventResponseDto } from './dto/alert-event-response.dto';

@Injectable()
export class AlertEventsService {
  constructor(
    @InjectRepository(AlertEvent)
    private alertEventRepository: Repository<AlertEvent>,
  ) {}

  async create(createDto: CreateAlertEventDto): Promise<AlertEventResponseDto> {
    const alertEvent = this.alertEventRepository.create(createDto);
    const saved = await this.alertEventRepository.save(alertEvent);
    return this.toResponseDto(saved);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    idAlertRule?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ data: AlertEventResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.alertEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.alertRule', 'rule')
      .leftJoinAndSelect('rule.sensorChannel', 'channel');

    if (options?.idAlertRule) {
      queryBuilder.andWhere('event.idAlertRule = :idAlertRule', { idAlertRule: options.idAlertRule });
    }

    if (options?.status) {
      queryBuilder.andWhere('event.status = :status', { status: options.status });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('event.triggeredAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('event.triggeredAt <= :endDate', { endDate: options.endDate });
    }

    const [events, total] = await queryBuilder
      .orderBy('event.triggeredAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: events.map((event) => this.toResponseDto(event)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<AlertEventResponseDto> {
    const event = await this.alertEventRepository.findOne({
      where: { idAlertEvent: id },
      relations: ['alertRule', 'alertRule.sensorChannel'],
    });

    if (!event) {
      throw new NotFoundException(`Alert event with ID ${id} not found`);
    }

    return this.toResponseDto(event);
  }

  async update(id: string, updateDto: UpdateAlertEventDto): Promise<AlertEventResponseDto> {
    const event = await this.alertEventRepository.findOne({
      where: { idAlertEvent: id },
    });

    if (!event) {
      throw new NotFoundException(`Alert event with ID ${id} not found`);
    }

    Object.assign(event, updateDto);
    const updated = await this.alertEventRepository.save(event);
    return this.toResponseDto(updated);
  }

  async acknowledge(id: string, dto: AcknowledgeAlertEventDto): Promise<AlertEventResponseDto> {
    const event = await this.alertEventRepository.findOne({
      where: { idAlertEvent: id },
    });

    if (!event) {
      throw new NotFoundException(`Alert event with ID ${id} not found`);
    }

    if (event.status === 'cleared') {
      throw new BadRequestException('Cannot acknowledge a cleared event');
    }

    event.status = 'acknowledged';
    event.acknowledgedBy = dto.acknowledgedBy;
    event.acknowledgedAt = new Date();
    if (dto.note) {
      event.note = dto.note;
    }

    const updated = await this.alertEventRepository.save(event);
    return this.toResponseDto(updated);
  }

  async clear(id: string, dto: ClearAlertEventDto): Promise<AlertEventResponseDto> {
    const event = await this.alertEventRepository.findOne({
      where: { idAlertEvent: id },
    });

    if (!event) {
      throw new NotFoundException(`Alert event with ID ${id} not found`);
    }

    event.status = 'cleared';
    event.clearedBy = dto.clearedBy;
    event.clearedAt = new Date();
    if (dto.note) {
      event.note = dto.note;
    }

    const updated = await this.alertEventRepository.save(event);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const event = await this.alertEventRepository.findOne({
      where: { idAlertEvent: id },
    });

    if (!event) {
      throw new NotFoundException(`Alert event with ID ${id} not found`);
    }

    await this.alertEventRepository.remove(event);
  }

  private toResponseDto(event: AlertEvent): AlertEventResponseDto {
    const dto: AlertEventResponseDto = {
      idAlertEvent: event.idAlertEvent,
      idAlertRule: event.idAlertRule,
      triggeredAt: event.triggeredAt,
      value: event.value,
      status: event.status,
      acknowledgedBy: event.acknowledgedBy,
      acknowledgedAt: event.acknowledgedAt,
      clearedBy: event.clearedBy,
      clearedAt: event.clearedAt,
      note: event.note,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    if (event.alertRule) {
      dto.alertRule = {
        idAlertRule: event.alertRule.idAlertRule,
        ruleType: event.alertRule.ruleType,
        severity: event.alertRule.severity,
        sensorChannel: event.alertRule.sensorChannel
          ? {
              idSensorChannel: event.alertRule.sensorChannel.idSensorChannel,
              metricCode: event.alertRule.sensorChannel.metricCode,
              unit: event.alertRule.sensorChannel.unit,
            }
          : undefined,
      };
    }

    return dto;
  }
}
