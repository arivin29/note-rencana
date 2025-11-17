import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDashboard } from '../../entities/user-dashboard.entity';
import { CreateUserDashboardDto } from './dto/create-user-dashboard.dto';
import { UpdateUserDashboardDto } from './dto/update-user-dashboard.dto';
import { UserDashboardResponseDto, UserDashboardDetailedResponseDto } from './dto/user-dashboard-response.dto';

@Injectable()
export class UserDashboardsService {
  constructor(
    @InjectRepository(UserDashboard)
    private dashboardRepository: Repository<UserDashboard>,
  ) {}

  async create(createDto: CreateUserDashboardDto): Promise<UserDashboardResponseDto> {
    const dashboard = this.dashboardRepository.create(createDto);
    const saved = await this.dashboardRepository.save(dashboard);
    return this.toResponseDto(saved);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    idUser?: string;
    idProject?: string;
    isPublic?: boolean;
  }): Promise<{ data: UserDashboardResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .leftJoinAndSelect('dashboard.project', 'project');

    if (options?.idUser) {
      queryBuilder.andWhere('dashboard.idUser = :idUser', { idUser: options.idUser });
    }

    if (options?.idProject) {
      queryBuilder.andWhere('dashboard.idProject = :idProject', { idProject: options.idProject });
    }

    if (options?.isPublic !== undefined) {
      queryBuilder.andWhere('dashboard.isPublic = :isPublic', { isPublic: options.isPublic });
    }

    const [dashboards, total] = await queryBuilder
      .orderBy('dashboard.isDefault', 'DESC')
      .addOrderBy('dashboard.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: dashboards.map((dashboard) => this.toResponseDto(dashboard)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserDashboardResponseDto> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { idDashboard: id },
      relations: ['project'],
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    return this.toResponseDto(dashboard);
  }

  async findOneDetailed(id: string): Promise<UserDashboardDetailedResponseDto> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { idDashboard: id },
      relations: ['project', 'widgets'],
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    return this.toDetailedResponseDto(dashboard);
  }

  async update(id: string, updateDto: UpdateUserDashboardDto): Promise<UserDashboardResponseDto> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { idDashboard: id },
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    Object.assign(dashboard, updateDto);
    const updated = await this.dashboardRepository.save(dashboard);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { idDashboard: id },
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    await this.dashboardRepository.remove(dashboard);
  }

  private toResponseDto(dashboard: UserDashboard): UserDashboardResponseDto {
    const dto: UserDashboardResponseDto = {
      idDashboard: dashboard.idDashboard,
      idUser: dashboard.idUser,
      idProject: dashboard.idProject,
      name: dashboard.name,
      description: dashboard.description,
      layoutType: dashboard.layoutType,
      gridCols: dashboard.gridCols,
      isDefault: dashboard.isDefault,
      isPublic: dashboard.isPublic,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
    };

    if (dashboard.project) {
      dto.project = {
        idProject: dashboard.project.idProject,
        name: dashboard.project.name,
      };
    }

    return dto;
  }

  private toDetailedResponseDto(dashboard: UserDashboard): UserDashboardDetailedResponseDto {
    const base = this.toResponseDto(dashboard);

    const widgets = (dashboard.widgets || []).map((widget) => ({
      idWidgetInstance: widget.idWidgetInstance,
      widgetType: widget.widgetType,
      positionX: widget.positionX,
      positionY: widget.positionY,
      sizeWidth: widget.sizeWidth,
      sizeHeight: widget.sizeHeight,
      configJson: widget.configJson,
      refreshRate: widget.refreshRate,
      displayOrder: widget.displayOrder,
    }));

    // Calculate widget statistics
    const widgetsByType = widgets.reduce((acc, widget) => {
      acc[widget.widgetType] = (acc[widget.widgetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      ...base,
      widgets,
      stats: {
        totalWidgets: widgets.length,
        widgetsByType,
      },
    };
  }
}
