import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto, ProjectDetailedResponseDto } from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(createDto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = this.projectRepository.create({
      idOwner: createDto.idOwner,
      name: createDto.name,
      areaType: createDto.areaType,
      geofence: createDto.geofence,
      status: createDto.status || 'active',
    });

    const saved = await this.projectRepository.save(project);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    idOwner?: string;
    areaType?: string;
    status?: string;
  }): Promise<{ data: ProjectResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Project> = {};

    if (params.idOwner) {
      where.idOwner = params.idOwner;
    }

    if (params.areaType) {
      where.areaType = params.areaType as any;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.name = ILike(`%${params.search}%`);
    }

    const [items, total] = await this.projectRepository.findAndCount({
      where,
      relations: ['owner', 'nodes', 'nodes.sensors', 'nodeLocations'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: items.map((item) => this.toResponseDtoWithStats(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { idProject: id },
      relations: ['owner'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return this.toResponseDto(project);
  }

  async findOneDetailed(id: string): Promise<ProjectDetailedResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { idProject: id },
      relations: ['owner', 'nodes', 'nodeLocations'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return this.toDetailedResponseDto(project);
  }

  async update(id: string, updateDto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { idProject: id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    Object.assign(project, updateDto);
    const updated = await this.projectRepository.save(project);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { idProject: id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    await this.projectRepository.remove(project);
  }

  async getStatistics() {
    const totalProjects = await this.projectRepository.count();

    // Group by area type
    const projectsByAreaType = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.areaType', 'areaType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.areaType')
      .getRawMany();

    const areaTypeStats = projectsByAreaType.map(item => ({
      areaType: item.areaType,
      count: parseInt(item.count, 10),
      percentage: ((parseInt(item.count, 10) / totalProjects) * 100).toFixed(1)
    }));

    // Group by status
    const projectsByStatus = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();

    const statusStats = projectsByStatus.map(item => ({
      status: item.status,
      count: parseInt(item.count, 10),
      percentage: ((parseInt(item.count, 10) / totalProjects) * 100).toFixed(1)
    }));

    // Count active vs inactive
    const activeProjects = await this.projectRepository.count({ where: { status: 'active' } });
    const inactiveProjects = totalProjects - activeProjects;

    return {
      totalProjects,
      activeProjects,
      inactiveProjects,
      projectsByAreaType: areaTypeStats,
      projectsByStatus: statusStats,
    };
  }

  private toResponseDto(project: Project): ProjectResponseDto {
    return {
      idProject: project.idProject,
      idOwner: project.idOwner,
      name: project.name,
      areaType: project.areaType as any,
      geofence: project.geofence,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: project.owner ? {
        idOwner: project.owner.idOwner,
        name: project.owner.name,
        industry: project.owner.industry,
      } : undefined,
    };
  }

  private toDetailedResponseDto(project: Project): ProjectDetailedResponseDto {
    const base = this.toResponseDto(project);
    
    const nodes = project.nodes || [];
    const totalSensors = nodes.reduce((sum, node: any) => {
      return sum + (node.sensors?.length || 0);
    }, 0);
    
    return {
      ...base,
      nodes: nodes,
      locations: project.nodeLocations || [],
      stats: {
        totalNodes: nodes.length,
        activeNodes: nodes.filter((n: any) => n.connectivityStatus === 'online').length || 0,
        totalSensors: totalSensors,
        totalLocations: project.nodeLocations?.length || 0,
      },
    };
  }

  private toResponseDtoWithStats(project: Project): any {
    const base = this.toResponseDto(project);
    
    const nodes = project.nodes || [];
    const totalSensors = nodes.reduce((sum, node: any) => {
      return sum + (node.sensors?.length || 0);
    }, 0);
    
    const onlineNodes = nodes.filter((n: any) => n.connectivityStatus === 'online').length;
    
    // Get most recent lastSeenAt from all nodes
    const lastSeenDates = nodes
      .map((n: any) => n.lastSeenAt)
      .filter(date => date != null)
      .map(date => new Date(date).getTime());
    
    const lastSync = lastSeenDates.length > 0 
      ? new Date(Math.max(...lastSeenDates)).toISOString()
      : undefined;
    
    // Get primary location if available
    const primaryLocation = project.nodeLocations?.[0];
    const location = primaryLocation?.address || undefined;
    const metrics = {
      nodes: nodes.length,
      sensors: totalSensors,
      online: onlineNodes,
      alerts: 0,
    };

    return {
      ...base,
      metrics,
      stats: metrics,
      primaryLocation: location,
      location,
      lastSync,
    };
  }
}
