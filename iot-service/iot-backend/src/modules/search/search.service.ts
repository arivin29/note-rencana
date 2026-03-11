import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Node } from '../../entities/node.entity';
import { NodeUnpairedDevice } from '../../entities/node-unpaired-device.entity';
import { AlertEvent } from '../../entities/alert-event.entity';
import { Project } from '../../entities/project.entity';
import { Owner } from '../../entities/owner.entity';
import {
  SearchQueryDto,
  SearchResponseDto,
  NodeSearchResultDto,
  DeviceSearchResultDto,
  AlertSearchResultDto,
  ProjectSearchResultDto,
  OwnerSearchResultDto,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly defaultCategories = ['nodes', 'devices', 'alerts', 'projects', 'owners'];

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(NodeUnpairedDevice)
    private deviceRepository: Repository<NodeUnpairedDevice>,
    @InjectRepository(AlertEvent)
    private alertRepository: Repository<AlertEvent>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Owner)
    private ownerRepository: Repository<Owner>,
  ) {}

  async search(dto: SearchQueryDto, userId?: string, userRole?: string, userOwnerId?: string): Promise<SearchResponseDto> {
    const { q, limit = 5 } = dto;
    const categories = dto.categories?.length ? dto.categories : this.defaultCategories;
    const searchPattern = `%${q}%`;

    const results: SearchResponseDto['results'] = {};
    let totalCount = 0;

    // Execute searches in parallel for better performance
    const searchPromises: Promise<void>[] = [];

    if (categories.includes('nodes')) {
      searchPromises.push(
        this.searchNodes(searchPattern, limit, userRole, userOwnerId).then((r) => {
          results.nodes = r;
          totalCount += r.total;
        }),
      );
    }

    if (categories.includes('devices')) {
      searchPromises.push(
        this.searchDevices(searchPattern, limit, userRole, userOwnerId).then((r) => {
          results.devices = r;
          totalCount += r.total;
        }),
      );
    }

    if (categories.includes('alerts')) {
      searchPromises.push(
        this.searchAlerts(searchPattern, limit, userRole, userOwnerId).then((r) => {
          results.alerts = r;
          totalCount += r.total;
        }),
      );
    }

    if (categories.includes('projects')) {
      searchPromises.push(
        this.searchProjects(searchPattern, limit, userRole, userOwnerId).then((r) => {
          results.projects = r;
          totalCount += r.total;
        }),
      );
    }

    if (categories.includes('owners')) {
      // Only admin can search owners
      if (userRole === 'admin') {
        searchPromises.push(
          this.searchOwners(searchPattern, limit).then((r) => {
            results.owners = r;
            totalCount += r.total;
          }),
        );
      }
    }

    await Promise.all(searchPromises);

    return {
      query: q,
      total: totalCount,
      results,
    };
  }

  private async searchNodes(
    pattern: string,
    limit: number,
    userRole?: string,
    userOwnerId?: string,
  ): Promise<{ total: number; data: NodeSearchResultDto[] }> {
    const queryBuilder = this.nodeRepository
      .createQueryBuilder('node')
      .leftJoinAndSelect('node.project', 'project')
      .where(
        '(node.code ILIKE :pattern OR node.name ILIKE :pattern OR node.serialNumber ILIKE :pattern OR node.description ILIKE :pattern)',
        { pattern },
      );

    // Filter by owner for non-admin users
    if (userRole !== 'admin' && userOwnerId) {
      queryBuilder.andWhere('project.idOwner = :ownerId', { ownerId: userOwnerId });
    }

    const [nodes, total] = await queryBuilder.take(limit).getManyAndCount();

    const data = nodes.map((node) => ({
      id: node.idNode,
      code: node.code,
      name: node.name || node.code,
      serialNumber: node.serialNumber,
      status: node.connectivityStatus,
      projectName: node.project?.name || '-',
      projectId: node.idProject,
      matchedField: this.getMatchedField(pattern, {
        code: node.code,
        name: node.name,
        serialNumber: node.serialNumber,
        description: node.description,
      }),
    }));

    return { total, data };
  }

  private async searchDevices(
    pattern: string,
    limit: number,
    userRole?: string,
    userOwnerId?: string,
  ): Promise<{ total: number; data: DeviceSearchResultDto[] }> {
    const queryBuilder = this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.nodeModel', 'nodeModel')
      .leftJoinAndSelect('device.owner', 'owner')
      .where('(device.hardwareId ILIKE :pattern OR device.lastTopic ILIKE :pattern)', { pattern });

    // Filter by suggested owner for non-admin users
    if (userRole !== 'admin' && userOwnerId) {
      queryBuilder.andWhere('device.suggestedOwner = :ownerId', { ownerId: userOwnerId });
    }

    const [devices, total] = await queryBuilder.take(limit).getManyAndCount();

    const data = devices.map((device) => ({
      id: device.idNodeUnpairedDevice,
      hardwareId: device.hardwareId,
      modelName: device.nodeModel?.modelName || '-',
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      matchedField: this.getMatchedField(pattern, {
        hardwareId: device.hardwareId,
        lastTopic: device.lastTopic,
      }),
    }));

    return { total, data };
  }

  private async searchAlerts(
    pattern: string,
    limit: number,
    userRole?: string,
    userOwnerId?: string,
  ): Promise<{ total: number; data: AlertSearchResultDto[] }> {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.alertRule', 'alertRule')
      .leftJoinAndSelect('alertRule.sensorChannel', 'sensorChannel')
      .leftJoinAndSelect('sensorChannel.sensor', 'sensor')
      .leftJoinAndSelect('sensor.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .where(
        '(alertRule.ruleType ILIKE :pattern OR alertRule.severity ILIKE :pattern OR alert.note ILIKE :pattern OR node.name ILIKE :pattern OR node.code ILIKE :pattern)',
        { pattern },
      );

    // Filter by owner for non-admin users
    if (userRole !== 'admin' && userOwnerId) {
      queryBuilder.andWhere('project.idOwner = :ownerId', { ownerId: userOwnerId });
    }

    const [alerts, total] = await queryBuilder.orderBy('alert.triggeredAt', 'DESC').take(limit).getManyAndCount();

    const data = alerts.map((alert) => {
      const node = alert.alertRule?.sensorChannel?.sensor?.node;
      return {
        id: alert.idAlertEvent,
        ruleType: alert.alertRule?.ruleType || '-',
        severity: alert.alertRule?.severity || 'warning',
        status: alert.status,
        nodeName: node?.name || node?.code || '-',
        nodeId: node?.idNode || '',
        triggeredAt: alert.triggeredAt,
        matchedField: this.getMatchedField(pattern, {
          ruleType: alert.alertRule?.ruleType,
          severity: alert.alertRule?.severity,
          note: alert.note,
          nodeName: node?.name,
          nodeCode: node?.code,
        }),
      };
    });

    return { total, data };
  }

  private async searchProjects(
    pattern: string,
    limit: number,
    userRole?: string,
    userOwnerId?: string,
  ): Promise<{ total: number; data: ProjectSearchResultDto[] }> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .loadRelationCountAndMap('project.nodeCount', 'project.nodes')
      .where('(project.name ILIKE :pattern OR project.areaType ILIKE :pattern OR owner.name ILIKE :pattern)', {
        pattern,
      });

    // Filter by owner for non-admin users
    if (userRole !== 'admin' && userOwnerId) {
      queryBuilder.andWhere('project.idOwner = :ownerId', { ownerId: userOwnerId });
    }

    const [projects, total] = await queryBuilder.take(limit).getManyAndCount();

    const data = projects.map((project: any) => ({
      id: project.idProject,
      name: project.name,
      ownerName: project.owner?.name || '-',
      status: project.status,
      nodeCount: project.nodeCount || 0,
      matchedField: this.getMatchedField(pattern, {
        name: project.name,
        areaType: project.areaType,
        ownerName: project.owner?.name,
      }),
    }));

    return { total, data };
  }

  private async searchOwners(
    pattern: string,
    limit: number,
  ): Promise<{ total: number; data: OwnerSearchResultDto[] }> {
    const [owners, total] = await this.ownerRepository
      .createQueryBuilder('owner')
      .where(
        '(owner.name ILIKE :pattern OR owner.ownerCode ILIKE :pattern OR owner.industry ILIKE :pattern OR owner.email ILIKE :pattern OR owner.contactPerson ILIKE :pattern)',
        { pattern },
      )
      .take(limit)
      .getManyAndCount();

    const data = owners.map((owner) => ({
      id: owner.idOwner,
      ownerCode: owner.ownerCode,
      name: owner.name,
      industry: owner.industry || '-',
      email: owner.email || '-',
      phone: owner.phone || '-',
      matchedField: this.getMatchedField(pattern, {
        name: owner.name,
        ownerCode: owner.ownerCode,
        industry: owner.industry,
        email: owner.email,
        contactPerson: owner.contactPerson,
      }),
    }));

    return { total, data };
  }

  private getMatchedField(pattern: string, fields: Record<string, string | undefined>): string {
    const searchTerm = pattern.replace(/%/g, '').toLowerCase();
    for (const [key, value] of Object.entries(fields)) {
      if (value && value.toLowerCase().includes(searchTerm)) {
        return key;
      }
    }
    return 'unknown';
  }
}
