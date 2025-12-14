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
    ownerId?: string;
  }): Promise<{ data: AlertEventResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.alertEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.alertRule', 'rule')
      .leftJoinAndSelect('rule.sensorChannel', 'channel');

    // Owner filtering via JOIN: alert_events -> nodes -> projects -> owners
    if (options?.ownerId) {
      queryBuilder
        .innerJoin('nodes', 'node', "event.note ILIKE '%' || node.code || '%'")
        .innerJoin('projects', 'project', 'project.id_project = node.id_project')
        .andWhere('project.id_owner = :ownerId', { ownerId: options.ownerId });
    }

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

  async getStatistics(dateRange?: string, ownerId?: string): Promise<{
    open: number;
    acknowledged: number;
    cleared: number;
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    let startDate: Date | undefined;
    
    if (dateRange) {
      const days = parseInt(dateRange.replace('d', ''));
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    const queryBuilder = this.alertEventRepository
      .createQueryBuilder('event')
      .leftJoin('event.alertRule', 'rule');

    // Owner filtering via JOIN
    if (ownerId) {
      queryBuilder
        .innerJoin('nodes', 'node', "event.note ILIKE '%' || node.code || '%'")
        .innerJoin('projects', 'project', 'project.id_project = node.id_project')
        .andWhere('project.id_owner = :ownerId', { ownerId });
    }

    if (startDate) {
      queryBuilder.andWhere('event.triggeredAt >= :startDate', { startDate });
    }

    // Count by status with owner filter
    const openQuery = this.alertEventRepository
      .createQueryBuilder('event')
      .where('event.status = :status', { status: 'open' });
    
    const acknowledgedQuery = this.alertEventRepository
      .createQueryBuilder('event')
      .where('event.status = :status', { status: 'acknowledged' });
    
    const clearedQuery = this.alertEventRepository
      .createQueryBuilder('event')
      .where('event.status = :status', { status: 'cleared' });

    if (ownerId) {
      [openQuery, acknowledgedQuery, clearedQuery].forEach(q => {
        q.innerJoin('nodes', 'node', "event.note ILIKE '%' || node.code || '%'")
         .innerJoin('projects', 'project', 'project.id_project = node.id_project')
         .andWhere('project.id_owner = :ownerId', { ownerId });
      });
    }

    const [open, acknowledged, cleared, total] = await Promise.all([
      openQuery.getCount(),
      acknowledgedQuery.getCount(),
      clearedQuery.getCount(),
      queryBuilder.getCount(),
    ]);

    // Get counts by type with owner filter
    const byTypeQuery = this.alertEventRepository
      .createQueryBuilder('event')
      .leftJoin('event.alertRule', 'rule')
      .select('rule.ruleType', 'ruleType')
      .addSelect('COUNT(*)', 'count')
      .where(startDate ? 'event.triggeredAt >= :startDate' : '1=1', { startDate });

    if (ownerId) {
      byTypeQuery
        .innerJoin('nodes', 'node', "event.note ILIKE '%' || node.code || '%'")
        .innerJoin('projects', 'project', 'project.id_project = node.id_project')
        .andWhere('project.id_owner = :ownerId', { ownerId });
    }

    const byTypeResults = await byTypeQuery
      .groupBy('rule.ruleType')
      .getRawMany();

    const byType: Record<string, number> = {};
    byTypeResults.forEach((item) => {
      byType[item.ruleType] = parseInt(item.count);
    });

    // Get counts by severity with owner filter
    const bySeverityQuery = this.alertEventRepository
      .createQueryBuilder('event')
      .leftJoin('event.alertRule', 'rule')
      .select('rule.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where(startDate ? 'event.triggeredAt >= :startDate' : '1=1', { startDate });

    if (ownerId) {
      bySeverityQuery
        .innerJoin('nodes', 'node', "event.note ILIKE '%' || node.code || '%'")
        .innerJoin('projects', 'project', 'project.id_project = node.id_project')
        .andWhere('project.id_owner = :ownerId', { ownerId });
    }

    const bySeverityResults = await bySeverityQuery
      .groupBy('rule.severity')
      .getRawMany();

    const bySeverity: Record<string, number> = {};
    bySeverityResults.forEach((item) => {
      bySeverity[item.severity] = parseInt(item.count);
    });

    return {
      open,
      acknowledged,
      cleared,
      total,
      byType,
      bySeverity,
    };
  }

  async getOfflineNodesSummary(ownerId?: string): Promise<{
    warning: number;
    critical: number;
    total: number;
    nodes: Array<{ nodeCode: string; offlineMinutes: number; severity: string }>;
  }> {
    const queryBuilder = this.alertEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.alertRule', 'rule')
      .where('rule.ruleType = :ruleType', { ruleType: 'node_offline' })
      .andWhere('event.status = :status', { status: 'open' });

    // Owner filtering via JOIN
    if (ownerId) {
      queryBuilder
        .innerJoin('nodes', 'node', "event.note ILIKE '%' || node.code || '%'")
        .innerJoin('projects', 'project', 'project.id_project = node.id_project')
        .andWhere('project.id_owner = :ownerId', { ownerId });
    }

    const offlineAlerts = await queryBuilder
      .orderBy('event.value', 'DESC')
      .getMany();

    let warning = 0;
    let critical = 0;
    const nodes: Array<{ nodeCode: string; offlineMinutes: number; severity: string }> = [];

    offlineAlerts.forEach((alert) => {
      const offlineMinutes = alert.value || 0;
      const severity = offlineMinutes >= 60 ? 'critical' : 'warning';
      
      if (severity === 'critical') {
        critical++;
      } else {
        warning++;
      }

      // Extract node code from note
      const noteMatch = alert.note?.match(/Node "([^"]+)"/);
      if (noteMatch) {
        nodes.push({
          nodeCode: noteMatch[1],
          offlineMinutes: Math.floor(offlineMinutes),
          severity,
        });
      }
    });

    return {
      warning,
      critical,
      total: warning + critical,
      nodes,
    };
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
