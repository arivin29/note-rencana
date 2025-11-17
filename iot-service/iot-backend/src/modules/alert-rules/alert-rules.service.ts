import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from '../../entities/alert-rule.entity';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { AlertRuleResponseDto, AlertRuleDetailedResponseDto } from './dto/alert-rule-response.dto';

@Injectable()
export class AlertRulesService {
  constructor(
    @InjectRepository(AlertRule)
    private alertRuleRepository: Repository<AlertRule>,
  ) {}

  async create(createDto: CreateAlertRuleDto): Promise<AlertRuleResponseDto> {
    const alertRule = this.alertRuleRepository.create(createDto);
    const saved = await this.alertRuleRepository.save(alertRule);
    return this.toResponseDto(saved);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    idSensorChannel?: string;
    ruleType?: string;
    severity?: string;
    enabled?: boolean;
  }): Promise<{ data: AlertRuleResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.alertRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.sensorChannel', 'channel')
      .leftJoinAndSelect('channel.sensor', 'sensor');

    if (options?.idSensorChannel) {
      queryBuilder.andWhere('rule.idSensorChannel = :idSensorChannel', {
        idSensorChannel: options.idSensorChannel,
      });
    }

    if (options?.ruleType) {
      queryBuilder.andWhere('rule.ruleType = :ruleType', { ruleType: options.ruleType });
    }

    if (options?.severity) {
      queryBuilder.andWhere('rule.severity = :severity', { severity: options.severity });
    }

    if (options?.enabled !== undefined) {
      queryBuilder.andWhere('rule.enabled = :enabled', { enabled: options.enabled });
    }

    const [rules, total] = await queryBuilder
      .orderBy('rule.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: rules.map((rule) => this.toResponseDto(rule)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<AlertRuleResponseDto> {
    const rule = await this.alertRuleRepository.findOne({
      where: { idAlertRule: id },
      relations: ['sensorChannel', 'sensorChannel.sensor'],
    });

    if (!rule) {
      throw new NotFoundException(`Alert rule with ID ${id} not found`);
    }

    return this.toResponseDto(rule);
  }

  async findOneDetailed(id: string): Promise<AlertRuleDetailedResponseDto> {
    const rule = await this.alertRuleRepository.findOne({
      where: { idAlertRule: id },
      relations: ['sensorChannel', 'sensorChannel.sensor', 'alertEvents'],
    });

    if (!rule) {
      throw new NotFoundException(`Alert rule with ID ${id} not found`);
    }

    return this.toDetailedResponseDto(rule);
  }

  async update(id: string, updateDto: UpdateAlertRuleDto): Promise<AlertRuleResponseDto> {
    const rule = await this.alertRuleRepository.findOne({
      where: { idAlertRule: id },
    });

    if (!rule) {
      throw new NotFoundException(`Alert rule with ID ${id} not found`);
    }

    Object.assign(rule, updateDto);
    const updated = await this.alertRuleRepository.save(rule);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.alertRuleRepository.findOne({
      where: { idAlertRule: id },
    });

    if (!rule) {
      throw new NotFoundException(`Alert rule with ID ${id} not found`);
    }

    await this.alertRuleRepository.remove(rule);
  }

  private toResponseDto(rule: AlertRule): AlertRuleResponseDto {
    const dto: AlertRuleResponseDto = {
      idAlertRule: rule.idAlertRule,
      idSensorChannel: rule.idSensorChannel,
      ruleType: rule.ruleType,
      severity: rule.severity,
      paramsJson: rule.paramsJson,
      enabled: rule.enabled,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };

    if (rule.sensorChannel) {
      dto.sensorChannel = {
        idSensorChannel: rule.sensorChannel.idSensorChannel,
        metricCode: rule.sensorChannel.metricCode,
        unit: rule.sensorChannel.unit,
        sensor: rule.sensorChannel.sensor
          ? {
              idSensor: rule.sensorChannel.sensor.idSensor,
              label: rule.sensorChannel.sensor.label,
            }
          : undefined,
      };
    }

    return dto;
  }

  private toDetailedResponseDto(rule: AlertRule): AlertRuleDetailedResponseDto {
    const base = this.toResponseDto(rule);

    // Get recent events (last 10)
    const recentEvents = (rule.alertEvents || [])
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, 10)
      .map((event) => ({
        idAlertEvent: event.idAlertEvent,
        triggeredAt: event.triggeredAt,
        value: event.value,
        status: event.status,
      }));

    // Calculate stats
    const totalEvents = rule.alertEvents?.length || 0;
    const openEvents = rule.alertEvents?.filter((e) => e.status === 'open').length || 0;
    const acknowledgedEvents = rule.alertEvents?.filter((e) => e.status === 'acknowledged').length || 0;
    const clearedEvents = rule.alertEvents?.filter((e) => e.status === 'cleared').length || 0;
    const lastTriggered = rule.alertEvents?.[0]?.triggeredAt;

    return {
      ...base,
      recentEvents,
      stats: {
        totalEvents,
        openEvents,
        acknowledgedEvents,
        clearedEvents,
        lastTriggered,
      },
    };
  }
}
