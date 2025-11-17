import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardWidget } from '../../entities/dashboard-widget.entity';
import { CreateDashboardWidgetDto } from './dto/create-dashboard-widget.dto';
import { UpdateDashboardWidgetDto } from './dto/update-dashboard-widget.dto';
import { DashboardWidgetResponseDto } from './dto/dashboard-widget-response.dto';

@Injectable()
export class DashboardWidgetsService {
  constructor(
    @InjectRepository(DashboardWidget)
    private widgetRepository: Repository<DashboardWidget>,
  ) {}

  async create(createDto: CreateDashboardWidgetDto): Promise<DashboardWidgetResponseDto> {
    const widget = this.widgetRepository.create(createDto);
    const saved = await this.widgetRepository.save(widget);
    return this.toResponseDto(saved);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    idDashboard?: string;
    widgetType?: string;
  }): Promise<{ data: DashboardWidgetResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.widgetRepository
      .createQueryBuilder('widget')
      .leftJoinAndSelect('widget.dashboard', 'dashboard')
      .leftJoinAndSelect('widget.sensor', 'sensor')
      .leftJoinAndSelect('widget.sensorChannel', 'channel');

    if (options?.idDashboard) {
      queryBuilder.andWhere('widget.idDashboard = :idDashboard', { idDashboard: options.idDashboard });
    }

    if (options?.widgetType) {
      queryBuilder.andWhere('widget.widgetType = :widgetType', { widgetType: options.widgetType });
    }

    const [widgets, total] = await queryBuilder
      .orderBy('widget.displayOrder', 'ASC')
      .addOrderBy('widget.positionY', 'ASC')
      .addOrderBy('widget.positionX', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: widgets.map((widget) => this.toResponseDto(widget)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<DashboardWidgetResponseDto> {
    const widget = await this.widgetRepository.findOne({
      where: { idWidgetInstance: id },
      relations: ['dashboard', 'sensor', 'sensorChannel'],
    });

    if (!widget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }

    return this.toResponseDto(widget);
  }

  async update(id: string, updateDto: UpdateDashboardWidgetDto): Promise<DashboardWidgetResponseDto> {
    const widget = await this.widgetRepository.findOne({
      where: { idWidgetInstance: id },
    });

    if (!widget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }

    Object.assign(widget, updateDto);
    const updated = await this.widgetRepository.save(widget);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const widget = await this.widgetRepository.findOne({
      where: { idWidgetInstance: id },
    });

    if (!widget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }

    await this.widgetRepository.remove(widget);
  }

  private toResponseDto(widget: DashboardWidget): DashboardWidgetResponseDto {
    const dto: DashboardWidgetResponseDto = {
      idWidgetInstance: widget.idWidgetInstance,
      idDashboard: widget.idDashboard,
      widgetType: widget.widgetType,
      idSensor: widget.idSensor,
      idSensorChannel: widget.idSensorChannel,
      positionX: widget.positionX,
      positionY: widget.positionY,
      sizeWidth: widget.sizeWidth,
      sizeHeight: widget.sizeHeight,
      configJson: widget.configJson,
      refreshRate: widget.refreshRate,
      displayOrder: widget.displayOrder,
      createdAt: widget.createdAt,
      updatedAt: widget.updatedAt,
    };

    if (widget.dashboard) {
      dto.dashboard = {
        idDashboard: widget.dashboard.idDashboard,
        name: widget.dashboard.name,
      };
    }

    if (widget.sensor) {
      dto.sensor = {
        idSensor: widget.sensor.idSensor,
        label: widget.sensor.label,
      };
    }

    if (widget.sensorChannel) {
      dto.sensorChannel = {
        idSensorChannel: widget.sensorChannel.idSensorChannel,
        metricCode: widget.sensorChannel.metricCode,
        unit: widget.sensorChannel.unit,
      };
    }

    return dto;
  }
}
