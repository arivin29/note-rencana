import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TenantApiKey } from '../entities/tenant-api-key.entity';
import { Owner } from '../../../entities/owner.entity';
import { Project } from '../../../entities/project.entity';
import { Node } from '../../../entities/node.entity';
import { Sensor } from '../../../entities/sensor.entity';
import { SensorChannel } from '../../../entities/sensor-channel.entity';
import { SensorLog } from '../../../entities/sensor-log.entity';
import { AlertEvent } from '../../../entities/alert-event.entity';
import {
  ProjectFilterQueryDto,
  NodeFilterQueryDto,
  SensorFilterQueryDto,
  SensorDataQueryDto,
  SensorDataAggregatedQueryDto,
  AlertFilterQueryDto,
} from '../dto/query.dto';

const MAX_DATE_RANGE_DAYS = 7;

/**
 * Helper: Format node object with rich information
 */
function formatNodeInfo(node: Node | null | undefined, level: 'minimal' | 'standard' | 'full' = 'standard') {
  if (!node) return null;

  // Minimal: just for nested references in sensor data
  if (level === 'minimal') {
    return {
      idNode: node.idNode,
      code: node.code,
      name: node.name,
      serialNumber: node.serialNumber,
      status: node.status,
      connectivityStatus: node.connectivityStatus,
    };
  }

  // Standard: for sensors list, sensor data response
  if (level === 'standard') {
    return {
      idNode: node.idNode,
      code: node.code,
      name: node.name,
      serialNumber: node.serialNumber,
      status: node.status,
      connectivityStatus: node.connectivityStatus,
      lastSeenAt: node.lastSeenAt,
      location: node.address || node.city || node.latitude ? {
        address: node.address,
        city: node.city,
        latitude: node.latitude,
        longitude: node.longitude,
      } : null,
    };
  }

  // Full: for node detail endpoint
  return {
    idNode: node.idNode,
    code: node.code,
    name: node.name,
    description: node.description,
    serialNumber: node.serialNumber,
    devEui: node.devEui,
    firmwareVersion: node.firmwareVersion,
    status: node.status,
    connectivityStatus: node.connectivityStatus,
    lastSeenAt: node.lastSeenAt,
    telemetryIntervalSec: node.telemetryIntervalSec,
    location: {
      address: node.address,
      city: node.city,
      province: node.province,
      postalCode: node.postalCode,
      country: node.country,
      latitude: node.latitude,
      longitude: node.longitude,
      elevationM: node.elevationM,
    },
  };
}

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
    @InjectRepository(SensorChannel)
    private readonly channelRepository: Repository<SensorChannel>,
    @InjectRepository(SensorLog)
    private readonly sensorLogRepository: Repository<SensorLog>,
    @InjectRepository(AlertEvent)
    private readonly alertEventRepository: Repository<AlertEvent>,
  ) {}

  /**
   * Get tenant info and API key status
   */
  async getTenantInfo(apiKey: TenantApiKey, ownerId: string) {
    const owner = await this.ownerRepository.findOne({
      where: { idOwner: ownerId },
    });

    if (!owner) {
      throw new NotFoundException('Tenant not found');
    }

    const rateLimitConfig = apiKey.getRateLimitConfig();

    return {
      status: 'active',
      tenant: {
        idOwner: owner.idOwner,
        ownerCode: owner.ownerCode,
        name: owner.name,
        email: owner.email,
      },
      apiKey: {
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        rateLimitPlan: apiKey.rateLimitPlan,
        requestsToday: apiKey.requestsToday,
        requestsRemaining: rateLimitConfig.requestsPerDay - apiKey.requestsToday,
      },
    };
  }

  /**
   * Get projects for tenant
   */
  async getProjects(ownerId: string, query: ProjectFilterQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.nodes', 'nodes')
      .addSelect('COUNT(nodes.idNode)', 'nodeCount')
      .where('project.idOwner = :ownerId', { ownerId })
      .groupBy('project.idProject');

    if (query.status) {
      qb.andWhere('project.status = :status', { status: query.status });
    }

    const [projects, total] = await Promise.all([
      qb.skip(skip).take(limit).getRawAndEntities(),
      this.projectRepository.count({ where: { idOwner: ownerId } }),
    ]);

    return {
      data: projects.entities.map((p, i) => ({
        idProject: p.idProject,
        name: p.name,
        areaType: p.areaType,
        status: p.status,
        nodeCount: parseInt(projects.raw[i]?.nodeCount || '0', 10),
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get nodes for tenant
   */
  async getNodes(ownerId: string, query: NodeFilterQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.nodeRepository
      .createQueryBuilder('node')
      .leftJoinAndSelect('node.project', 'project')
      .leftJoin('node.sensors', 'sensors')
      .addSelect('COUNT(sensors.idSensor)', 'sensorCount')
      .where('project.idOwner = :ownerId', { ownerId })
      .groupBy('node.idNode')
      .addGroupBy('project.idProject');

    if (query.projectId) {
      qb.andWhere('node.idProject = :projectId', { projectId: query.projectId });
    }
    if (query.status) {
      qb.andWhere('node.status = :status', { status: query.status });
    }
    if (query.connectivityStatus) {
      qb.andWhere('node.connectivityStatus = :cs', { cs: query.connectivityStatus });
    }

    const [result, total] = await Promise.all([
      qb.skip(skip).take(limit).getRawAndEntities(),
      qb.getCount(),
    ]);

    return {
      data: result.entities.map((n, i) => ({
        idNode: n.idNode,
        code: n.code,
        name: n.name,
        serialNumber: n.serialNumber,
        status: n.status,
        connectivityStatus: n.connectivityStatus,
        lastSeenAt: n.lastSeenAt,
        location: {
          address: n.address,
          city: n.city,
          latitude: n.latitude,
          longitude: n.longitude,
        },
        project: {
          idProject: n.project?.idProject,
          name: n.project?.name,
        },
        sensorCount: parseInt(result.raw[i]?.sensorCount || '0', 10),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get node detail with sensors
   */
  async getNodeDetail(ownerId: string, nodeId: string) {
    const node = await this.nodeRepository
      .createQueryBuilder('node')
      .leftJoinAndSelect('node.project', 'project')
      .leftJoinAndSelect('node.sensors', 'sensors')
      .leftJoinAndSelect('sensors.sensorChannels', 'channels')
      .where('node.idNode = :nodeId', { nodeId })
      .andWhere('project.idOwner = :ownerId', { ownerId })
      .getOne();

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return {
      idNode: node.idNode,
      code: node.code,
      name: node.name,
      description: node.description,
      serialNumber: node.serialNumber,
      devEui: node.devEui,
      firmwareVersion: node.firmwareVersion,
      status: node.status,
      connectivityStatus: node.connectivityStatus,
      lastSeenAt: node.lastSeenAt,
      telemetryIntervalSec: node.telemetryIntervalSec,
      location: {
        address: node.address,
        city: node.city,
        province: node.province,
        postalCode: node.postalCode,
        country: node.country,
        latitude: node.latitude,
        longitude: node.longitude,
        elevationM: node.elevationM,
      },
      project: {
        idProject: node.project?.idProject,
        name: node.project?.name,
      },
      sensors: node.sensors?.map((s) => ({
        idSensor: s.idSensor,
        sensorCode: s.sensorCode,
        label: s.label,
        status: s.status,
        channels: s.sensorChannels?.map((c) => ({
          idSensorChannel: c.idSensorChannel,
          metricCode: c.metricCode,
          unit: c.unit,
          minThreshold: c.minThreshold,
          maxThreshold: c.maxThreshold,
        })),
      })),
    };
  }

  /**
   * Get sensors for tenant
   */
  async getSensors(ownerId: string, query: SensorFilterQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.sensorRepository
      .createQueryBuilder('sensor')
      .leftJoinAndSelect('sensor.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .leftJoinAndSelect('sensor.sensorChannels', 'channels')
      .where('project.idOwner = :ownerId', { ownerId });

    if (query.projectId) {
      qb.andWhere('node.idProject = :projectId', { projectId: query.projectId });
    }
    if (query.nodeId) {
      qb.andWhere('sensor.idNode = :nodeId', { nodeId: query.nodeId });
    }
    if (query.status) {
      qb.andWhere('sensor.status = :status', { status: query.status });
    }

    const [sensors, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: sensors.map((s) => ({
        idSensor: s.idSensor,
        sensorCode: s.sensorCode,
        label: s.label,
        status: s.status,
        node: formatNodeInfo(s.node, 'standard'),
        channels: s.sensorChannels?.map((c) => ({
          idSensorChannel: c.idSensorChannel,
          metricCode: c.metricCode,
          unit: c.unit,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get sensor data (telemetry)
   */
  async getSensorData(ownerId: string, query: SensorDataQueryDto) {
    const startTime = Date.now();

    // Validate date range
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > MAX_DATE_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days. Use export endpoint for larger ranges.`,
      );
    }

    const page = query.page || 1;
    const limit = Math.min(query.limit || 100, 1000);
    const skip = (page - 1) * limit;

    const qb = this.sensorLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.sensorChannel', 'channel')
      .leftJoin('channel.sensor', 'sensor')
      .leftJoin('sensor.node', 'node')
      .leftJoin('node.project', 'project')
      .addSelect(['sensor.idSensor', 'sensor.sensorCode', 'sensor.label'])
      .addSelect([
        'node.idNode', 'node.code', 'node.name', 'node.serialNumber', 
        'node.status', 'node.connectivityStatus', 'node.lastSeenAt',
        'node.address', 'node.city', 'node.province', 'node.country',
        'node.latitude', 'node.longitude'
      ])
      .where('log.idOwner = :ownerId', { ownerId })
      .andWhere('log.ts BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (query.projectId) {
      qb.andWhere('log.idProject = :projectId', { projectId: query.projectId });
    }
    if (query.nodeId) {
      qb.andWhere('log.idNode = :nodeId', { nodeId: query.nodeId });
    }
    if (query.sensorId) {
      qb.andWhere('log.idSensor = :sensorId', { sensorId: query.sensorId });
    }
    if (query.channelId) {
      qb.andWhere('log.idSensorChannel = :channelId', { channelId: query.channelId });
    }
    if (query.qualityFlag) {
      qb.andWhere('log.qualityFlag = :qualityFlag', { qualityFlag: query.qualityFlag });
    }

    qb.orderBy('log.ts', query.order === 'asc' ? 'ASC' : 'DESC');

    const [logs, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: logs.map((log) => {
        const nodeData = (log.sensorChannel as any)?.sensor?.node;
        return {
          id: log.idSensorLog,
          timestamp: log.ts,
          value: log.valueEngineered,
          valueRaw: log.valueRaw,
          unit: log.sensorChannel?.unit,
          qualityFlag: log.qualityFlag,
          channel: {
            idSensorChannel: log.idSensorChannel,
            metricCode: log.sensorChannel?.metricCode,
          },
          sensor: {
            idSensor: log.idSensor,
            sensorCode: (log.sensorChannel as any)?.sensor?.sensorCode,
            label: (log.sensorChannel as any)?.sensor?.label,
          },
          node: nodeData ? {
            idNode: log.idNode,
            code: nodeData.code,
            name: nodeData.name,
            serialNumber: nodeData.serialNumber,
            status: nodeData.status,
            connectivityStatus: nodeData.connectivityStatus,
            location: {
              address: nodeData.address,
              city: nodeData.city,
              province: nodeData.province,
              country: nodeData.country,
              latitude: nodeData.latitude,
              longitude: nodeData.longitude,
            },
          } : { idNode: log.idNode },
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        queryTimeMs: Date.now() - startTime,
        dateRange: {
          start: query.startDate,
          end: query.endDate,
        },
      },
    };
  }

  /**
   * Get latest sensor values
   */
  async getLatestSensorData(
    ownerId: string,
    filters: { projectId?: string; nodeId?: string; sensorId?: string },
  ) {
    // Get all channels for the tenant
    const qb = this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.sensor', 'sensor')
      .leftJoinAndSelect('sensor.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .where('project.idOwner = :ownerId', { ownerId });

    if (filters.projectId) {
      qb.andWhere('project.idProject = :projectId', { projectId: filters.projectId });
    }
    if (filters.nodeId) {
      qb.andWhere('node.idNode = :nodeId', { nodeId: filters.nodeId });
    }
    if (filters.sensorId) {
      qb.andWhere('sensor.idSensor = :sensorId', { sensorId: filters.sensorId });
    }

    const channels = await qb.getMany();

    // Get latest value for each channel
    const results = await Promise.all(
      channels.map(async (channel) => {
        const latestLog = await this.sensorLogRepository.findOne({
          where: { idSensorChannel: channel.idSensorChannel },
          order: { ts: 'DESC' },
        });

        const nodeData = channel.sensor?.node;
        return {
          channel: {
            idSensorChannel: channel.idSensorChannel,
            metricCode: channel.metricCode,
            unit: channel.unit,
          },
          sensor: {
            idSensor: channel.sensor?.idSensor,
            sensorCode: channel.sensor?.sensorCode,
            label: channel.sensor?.label,
          },
          node: nodeData ? {
            idNode: nodeData.idNode,
            code: nodeData.code,
            name: nodeData.name,
            serialNumber: nodeData.serialNumber,
            status: nodeData.status,
            connectivityStatus: nodeData.connectivityStatus,
            lastSeenAt: nodeData.lastSeenAt,
            location: {
              address: nodeData.address,
              city: nodeData.city,
              province: nodeData.province,
              country: nodeData.country,
              latitude: nodeData.latitude,
              longitude: nodeData.longitude,
            },
          } : null,
          latestValue: latestLog?.valueEngineered ?? null,
          latestTimestamp: latestLog?.ts ?? null,
          qualityFlag: latestLog?.qualityFlag ?? null,
        };
      }),
    );

    return {
      data: results.filter((r) => r.latestValue !== null),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get aggregated sensor data
   */
  async getAggregatedSensorData(ownerId: string, query: SensorDataAggregatedQueryDto) {
    const startTime = Date.now();
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Get channel info
    const channel = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.sensor', 'sensor')
      .leftJoinAndSelect('sensor.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .where('channel.idSensorChannel = :channelId', { channelId: query.channelId })
      .andWhere('project.idOwner = :ownerId', { ownerId })
      .getOne();

    if (!channel) {
      throw new NotFoundException('Channel not found or not accessible');
    }

    // Get aggregated data using raw query for better performance
    const intervalMap: Record<string, string> = {
      '1m': '1 minute',
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '1d': '1 day',
    };

    const interval = intervalMap[query.interval || '1h'] || '1 hour';
    const aggFunc = query.aggregation || 'avg';

    const rawQuery = `
      SELECT 
        date_trunc('${interval.split(' ')[1]}', ts) as timestamp,
        ${aggFunc}(value_engineered) as value,
        count(*) as count
      FROM sensor_logs
      WHERE id_sensor_channel = $1
        AND ts BETWEEN $2 AND $3
        AND id_owner = $4
      GROUP BY date_trunc('${interval.split(' ')[1]}', ts)
      ORDER BY timestamp ASC
    `;

    const aggregatedData = await this.sensorLogRepository.query(rawQuery, [
      query.channelId,
      startDate,
      endDate,
      ownerId,
    ]);

    // Get overall statistics
    const statsQuery = `
      SELECT 
        MIN(value_engineered) as min,
        MAX(value_engineered) as max,
        AVG(value_engineered) as avg,
        COUNT(*) as count
      FROM sensor_logs
      WHERE id_sensor_channel = $1
        AND ts BETWEEN $2 AND $3
        AND id_owner = $4
    `;

    const stats = await this.sensorLogRepository.query(statsQuery, [
      query.channelId,
      startDate,
      endDate,
      ownerId,
    ]);

    return {
      channel: {
        idSensorChannel: channel.idSensorChannel,
        metricCode: channel.metricCode,
        unit: channel.unit,
      },
      interval: query.interval || '1h',
      aggregation: query.aggregation || 'avg',
      data: aggregatedData.map((row: any) => ({
        timestamp: row.timestamp,
        value: parseFloat(row.value),
        count: parseInt(row.count, 10),
      })),
      statistics: {
        min: parseFloat(stats[0]?.min) || 0,
        max: parseFloat(stats[0]?.max) || 0,
        avg: parseFloat(stats[0]?.avg) || 0,
        count: parseInt(stats[0]?.count, 10) || 0,
      },
      meta: {
        queryTimeMs: Date.now() - startTime,
        dateRange: {
          start: query.startDate,
          end: query.endDate,
        },
      },
    };
  }

  /**
   * Get alerts for tenant
   */
  async getAlerts(ownerId: string, query: AlertFilterQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.alertEventRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.alertRule', 'rule')
      .leftJoinAndSelect('rule.sensorChannel', 'channel')
      .leftJoinAndSelect('channel.sensor', 'sensor')
      .leftJoinAndSelect('sensor.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .where('project.idOwner = :ownerId', { ownerId });

    if (query.projectId) {
      qb.andWhere('project.idProject = :projectId', { projectId: query.projectId });
    }
    if (query.nodeId) {
      qb.andWhere('node.idNode = :nodeId', { nodeId: query.nodeId });
    }
    if (query.severity) {
      qb.andWhere('rule.severity = :severity', { severity: query.severity });
    }
    if (query.status) {
      qb.andWhere('alert.status = :status', { status: query.status });
    }
    if (query.startDate) {
      qb.andWhere('alert.triggeredAt >= :startDate', { startDate: new Date(query.startDate) });
    }
    if (query.endDate) {
      qb.andWhere('alert.triggeredAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    qb.orderBy('alert.triggeredAt', 'DESC');

    const [alerts, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: alerts.map((a) => {
        const nodeData = a.alertRule?.sensorChannel?.sensor?.node;
        return {
          idAlertEvent: a.idAlertEvent,
          alertType: a.alertRule?.ruleType,
          severity: a.alertRule?.severity,
          status: a.status,
          note: a.note,
          triggeredAt: a.triggeredAt,
          acknowledgedAt: a.acknowledgedAt,
          clearedAt: a.clearedAt,
          channel: {
            idSensorChannel: a.alertRule?.sensorChannel?.idSensorChannel,
            metricCode: a.alertRule?.sensorChannel?.metricCode,
          },
          node: nodeData ? {
            idNode: nodeData.idNode,
            code: nodeData.code,
            name: nodeData.name,
            serialNumber: nodeData.serialNumber,
            status: nodeData.status,
            connectivityStatus: nodeData.connectivityStatus,
            lastSeenAt: nodeData.lastSeenAt,
            location: {
              address: nodeData.address,
              city: nodeData.city,
              province: nodeData.province,
              country: nodeData.country,
              latitude: nodeData.latitude,
              longitude: nodeData.longitude,
            },
          } : null,
          triggerValue: a.value,
          params: a.alertRule?.paramsJson,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
