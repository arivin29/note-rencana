import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Node } from '../../entities/node.entity';
import { SensorLog } from '../../entities/sensor-log.entity';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { NodeResponseDto, NodeDetailedResponseDto } from './dto/node-response.dto';
import { validate as isUUID } from 'uuid';

@Injectable()
export class NodesService {
  constructor(
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
    @InjectRepository(SensorLog)
    private readonly sensorLogRepository: Repository<SensorLog>,
  ) {}

  /**
   * Helper method to find node by ID (UUID) or code
   */
  private async findNodeByIdOrCode(identifier: string): Promise<Node> {
    let node: Node | null;

    // Check if identifier is UUID
    if (isUUID(identifier)) {
      node = await this.nodeRepository.findOne({
        where: { idNode: identifier },
        relations: ['project', 'project.owner', 'nodeModel', 'currentLocation', 'sensors'],
      });
    } else {
      // Search by code
      node = await this.nodeRepository.findOne({
        where: { code: identifier },
        relations: ['project', 'project.owner', 'nodeModel', 'currentLocation', 'sensors'],
      });
    }

    if (!node) {
      throw new NotFoundException(`Node with identifier '${identifier}' not found`);
    }

    return node;
  }

  async create(createDto: CreateNodeDto): Promise<NodeResponseDto> {
    // Check if code already exists in the project
    const existing = await this.nodeRepository.findOne({
      where: {
        idProject: createDto.idProject,
        code: createDto.code,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Node with code '${createDto.code}' already exists in this project`,
      );
    }

    const node = this.nodeRepository.create({
      idProject: createDto.idProject,
      idNodeModel: createDto.idNodeModel,
      code: createDto.code,
      serialNumber: createDto.serialNumber,
      devEui: createDto.devEui,
      ipAddress: createDto.ipAddress,
      installDate: createDto.installDate ? new Date(createDto.installDate) : undefined,
      firmwareVersion: createDto.firmwareVersion,
      batteryType: createDto.batteryType,
      telemetryIntervalSec: createDto.telemetryIntervalSec ?? 300,
      connectivityStatus: createDto.connectivityStatus ?? 'offline',
      idCurrentLocation: createDto.idCurrentLocation,
    });

    const saved = await this.nodeRepository.save(node);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    idProject?: string;
    idNodeModel?: string;
    connectivityStatus?: string;
  }): Promise<{ data: NodeResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Node> = {};

    if (params.idProject) {
      where.idProject = params.idProject;
    }

    if (params.idNodeModel) {
      where.idNodeModel = params.idNodeModel;
    }

    if (params.connectivityStatus) {
      where.connectivityStatus = params.connectivityStatus;
    }

    if (params.search) {
      where.code = ILike(`%${params.search}%`);
    }

    const [items, total] = await this.nodeRepository.findAndCount({
      where,
      relations: ['project', 'nodeModel', 'currentLocation'],
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

  async findOne(id: string): Promise<NodeResponseDto> {
    const node = await this.nodeRepository.findOne({
      where: { idNode: id },
      relations: ['project', 'nodeModel', 'currentLocation'],
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    return this.toResponseDto(node);
  }

  async findOneDetailed(id: string): Promise<NodeDetailedResponseDto> {
    const node = await this.nodeRepository.findOne({
      where: { idNode: id },
      relations: ['project', 'nodeModel', 'currentLocation', 'sensors'],
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    return this.toDetailedResponseDto(node);
  }

  async update(id: string, updateDto: UpdateNodeDto): Promise<NodeResponseDto> {
    const node = await this.nodeRepository.findOne({
      where: { idNode: id },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    // Check code uniqueness if code is being updated
    if (updateDto.code && updateDto.code !== node.code) {
      const existing = await this.nodeRepository.findOne({
        where: {
          idProject: updateDto.idProject ?? node.idProject,
          code: updateDto.code,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Node with code '${updateDto.code}' already exists in this project`,
        );
      }
    }

    // Update fields
    Object.assign(node, {
      ...updateDto,
      installDate: updateDto.installDate ? new Date(updateDto.installDate) : node.installDate,
    });

    const updated = await this.nodeRepository.save(node);
    return this.toResponseDto(updated);
  }

  async updateConnectivityStatus(id: string, status: string): Promise<NodeResponseDto> {
    const node = await this.nodeRepository.findOne({
      where: { idNode: id },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    node.connectivityStatus = status;
    node.lastSeenAt = new Date();

    const updated = await this.nodeRepository.save(node);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const node = await this.nodeRepository.findOne({
      where: { idNode: id },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    await this.nodeRepository.remove(node);
  }

  private toResponseDto(node: Node): NodeResponseDto {
    return {
      idNode: node.idNode,
      idProject: node.idProject,
      idNodeModel: node.idNodeModel,
      code: node.code,
      serialNumber: node.serialNumber,
      devEui: node.devEui,
      ipAddress: node.ipAddress,
      installDate: node.installDate,
      firmwareVersion: node.firmwareVersion,
      batteryType: node.batteryType,
      telemetryIntervalSec: node.telemetryIntervalSec,
      connectivityStatus: node.connectivityStatus,
      lastSeenAt: node.lastSeenAt,
      idCurrentLocation: node.idCurrentLocation,
      idNodeProfile: node.idNodeProfile,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      project: node.project ? {
        idProject: node.project.idProject,
        name: node.project.name,
        areaType: node.project.areaType,
        owner: node.project.owner ? {
          idOwner: node.project.owner.idOwner,
          name: node.project.owner.name,
          contactPerson: node.project.owner.contactPerson,
          industry: node.project.owner.industry,
        } : undefined,
      } : undefined,
      nodeModel: node.nodeModel ? {
        idNodeModel: node.nodeModel.idNodeModel,
        vendor: node.nodeModel.vendor,
        modelName: node.nodeModel.modelName,
        protocol: node.nodeModel.protocol,
      } : undefined,
      currentLocation: node.currentLocation ? {
        idNodeLocation: node.currentLocation.idNodeLocation,
        type: node.currentLocation.type,
        address: node.currentLocation.address,
      } : undefined,
    };
  }

  private toDetailedResponseDto(node: Node): NodeDetailedResponseDto {
    const base = this.toResponseDto(node);

    return {
      ...base,
      sensors: node.sensors || [],
      stats: {
        totalSensors: node.sensors?.length || 0,
        activeSensors: node.sensors?.filter((s: any) => s.status === 'active').length || 0,
        lastTelemetry: node.lastSeenAt,
        uptimePercentage: this.calculateUptime(node),
      },
    };
  }

  private calculateUptime(node: Node): number {
    // Simple uptime calculation based on lastSeenAt
    if (!node.lastSeenAt) return 0;

    const now = new Date().getTime();
    const lastSeen = new Date(node.lastSeenAt).getTime();
    const diffMinutes = (now - lastSeen) / 1000 / 60;

    // If last seen within telemetry interval * 2, consider online
    const expectedInterval = node.telemetryIntervalSec / 60;
    if (diffMinutes <= expectedInterval * 2) {
      return 100;
    } else if (diffMinutes <= expectedInterval * 5) {
      return 50;
    }

    return 0;
  }

  // Statistics & Aggregation Methods
  async getStatisticsOverview(): Promise<any> {
    const totalNodes = await this.nodeRepository.count();

    // Count by connectivity status
    const onlineNodes = await this.nodeRepository.count({
      where: { connectivityStatus: 'online' },
    });

    const offlineNodes = await this.nodeRepository.count({
      where: { connectivityStatus: 'offline' },
    });

    const degradedNodes = await this.nodeRepository.count({
      where: { connectivityStatus: 'degraded' },
    });

    // Get nodes by model
    const nodesByModel = await this.nodeRepository
      .createQueryBuilder('node')
      .leftJoin('node.nodeModel', 'model')
      .select('model.modelName', 'modelName')
      .addSelect('COUNT(node.idNode)', 'count')
      .where('model.modelName IS NOT NULL')
      .groupBy('model.modelName')
      .orderBy('COUNT(node.idNode)', 'DESC')
      .limit(10)
      .getRawMany();

    const modelData = nodesByModel.map(item => ({
      modelName: item.modelName,
      count: parseInt(item.count),
      percentage: totalNodes > 0 ? (parseInt(item.count) / totalNodes) * 100 : 0,
    }));

    // Get nodes by project
    const nodesByProject = await this.nodeRepository
      .createQueryBuilder('node')
      .leftJoin('node.project', 'project')
      .select('project.idProject', 'idProject')
      .addSelect('project.name', 'projectName')
      .addSelect('COUNT(node.idNode)', 'nodeCount')
      .where('project.name IS NOT NULL')
      .groupBy('project.idProject')
      .addGroupBy('project.name')
      .orderBy('COUNT(node.idNode)', 'DESC')
      .limit(10)
      .getRawMany();

    const projectData = nodesByProject.map(item => ({
      idProject: item.idProject,
      projectName: item.projectName,
      nodeCount: parseInt(item.nodeCount),
    }));

    // Calculate average uptime (simplified)
    const averageUptimePercentage = totalNodes > 0
      ? (onlineNodes / totalNodes) * 100
      : 0;

    return {
      totalNodes,
      onlineNodes,
      offlineNodes,
      degradedNodes,
      nodesByModel: modelData,
      nodesByProject: projectData,
      connectivityOverview: {
        online: onlineNodes,
        offline: offlineNodes,
        degraded: degradedNodes,
        averageUptimePercentage: Math.round(averageUptimePercentage * 100) / 100,
      },
      batteryOverview: {
        lowBattery: 0, // TODO: Implement when battery level tracking is added
        mediumBattery: 0,
        goodBattery: 0,
      },
    };
  }

  async getDashboard(identifier: string): Promise<any> {
    // Find node by ID or code
    const node = await this.findNodeByIdOrCode(identifier);
    const nodeDetailed = this.toDetailedResponseDto(node);

    // Get sensors with channels relation
    const nodeWithSensors = await this.nodeRepository.findOne({
      where: { idNode: node.idNode },
      relations: ['sensors', 'sensors.sensorCatalog', 'sensors.sensorChannels'],
    });

    // Get latest sensor logs for all channels in this node
    const channelIds = (nodeWithSensors?.sensors || [])
      .flatMap(sensor => sensor.sensorChannels || [])
      .map(channel => channel.idSensorChannel);

    // Query latest logs for all channels at once (more efficient)
    const latestLogs = await Promise.all(
      channelIds.map(async (channelId) => {
        const log = await this.sensorLogRepository.findOne({
          where: { idSensorChannel: channelId },
          order: { ts: 'DESC' },
        });
        return { channelId, log };
      })
    );

    // Create a map for quick lookup
    const latestLogMap = new Map();
    latestLogs.forEach(({ channelId, log }) => {
      if (log) {
        latestLogMap.set(channelId, log);
      }
    });

    const sensorsWithData = (nodeWithSensors?.sensors || []).map((sensor: any) => ({
      idSensor: sensor.idSensor,
      sensorCode: sensor.label,
      catalogName: sensor.sensorCatalog?.modelName || 'Unknown',
      status: 'active',
      channels: (sensor.sensorChannels || []).map((channel: any) => {
        const latestLog = latestLogMap.get(channel.idSensorChannel);
        return {
          idSensorChannel: channel.idSensorChannel,
          metricCode: channel.metricCode,
          unit: channel.unit,
          latestValue: latestLog?.valueEngineered ?? latestLog?.valueRaw ?? null,
          timestamp: latestLog?.ts ?? null,
          status: 'active',
        };
      }),
    }));

    // Recent activity (placeholder)
    const recentActivity = [
      {
        timestamp: node.updatedAt,
        type: 'update',
        description: 'Node configuration updated',
      },
    ];

    if (node.installDate) {
      recentActivity.push({
        timestamp: node.installDate,
        type: 'installation',
        description: 'Node installed',
      });
    }

    if (node.lastSeenAt) {
      recentActivity.push({
        timestamp: node.lastSeenAt,
        type: 'telemetry',
        description: 'Last telemetry received',
      });
    }

    // Health assessment
    const uptime = nodeDetailed.stats?.uptimePercentage || 0;
    let connectivityHealth = 'critical';
    if (node.connectivityStatus === 'online') connectivityHealth = 'healthy';
    else if (node.connectivityStatus === 'degraded') connectivityHealth = 'warning';

    let overallHealth = 'critical';
    if (uptime >= 95 && node.connectivityStatus === 'online') overallHealth = 'healthy';
    else if (uptime >= 70) overallHealth = 'warning';

    const health = {
      overall: overallHealth,
      connectivity: connectivityHealth,
      battery: 'unknown', // TODO: Implement when battery level tracking is added
      sensors: sensorsWithData.length > 0 ? 'active' : 'no-sensors',
      lastTelemetry: node.lastSeenAt,
    };

    // Uptime calculation
    const uptimeStats = {
      percentage: uptime,
      totalHours: 0, // TODO: Calculate from history
      onlineHours: 0, // TODO: Calculate from history
      lastOnline: node.lastSeenAt,
      lastOffline: undefined, // TODO: Track from history
    };

    return {
      node: nodeDetailed,
      sensorsWithData: sensorsWithData.sort((a, b) => a.sensorCode.localeCompare(b.sensorCode)),
      recentActivity: recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      health,
      uptime: uptimeStats,
    };
  }

  async getSensors(identifier: string): Promise<any[]> {
    const node = await this.findNodeByIdOrCode(identifier);

    const nodeWithSensors = await this.nodeRepository.findOne({
      where: { idNode: node.idNode },
      relations: ['sensors', 'sensors.sensorCatalog', 'sensors.sensorChannels'],
    });

    if (!nodeWithSensors) {
      throw new NotFoundException(`Node with identifier '${identifier}' not found`);
    }

    return (nodeWithSensors.sensors || []).map((sensor: any) => ({
      idSensor: sensor.idSensor,
      code: sensor.label,
      catalog: sensor.sensorCatalog
        ? {
            idSensorCatalog: sensor.sensorCatalog.idSensorCatalog,
            modelName: sensor.sensorCatalog.modelName,
            vendor: sensor.sensorCatalog.vendor,
          }
        : undefined,
      installDate: sensor.installDate,
      status: 'active',
      channelCount: sensor.sensorChannels?.length || 0,
      channels: (sensor.sensorChannels || []).map((channel: any) => ({
        idSensorChannel: channel.idSensorChannel,
        metricCode: channel.metricCode,
        unit: channel.unit,
        valueOffset: channel.valueOffset,
        multiplier: channel.multiplier,
        idSensorType: channel.idSensorType,
      })),
    }));
  }
}
