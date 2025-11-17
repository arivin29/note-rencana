import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Node } from '../../entities/node.entity';
import { Owner } from '../../entities/owner.entity';
import { Project } from '../../entities/project.entity';
import { Sensor } from '../../entities/sensor.entity';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { KpiStatsResponseDto } from './dto/kpi-stats-response.dto';
import { NodeHealthResponseDto } from './dto/node-health-response.dto';
import { OwnerLeaderboardResponseDto } from './dto/owner-leaderboard-response.dto';
import { ActivityLogResponseDto } from './dto/activity-log-response.dto';
import { TelemetryStreamsResponseDto } from './dto/telemetry-streams-response.dto';
import { DeliveryHealthResponseDto } from './dto/delivery-health-response.dto';
import { AlertStreamResponseDto } from './dto/alert-stream-response.dto';
import { ReleaseScheduleResponseDto } from './dto/release-schedule-response.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(Owner)
    private ownerRepository: Repository<Owner>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
  ) {}

  async getPlatformStats(filters: DashboardFiltersDto) {
    // Build WHERE conditions based on filters
    const projectCondition = filters.projectId ? { idProject: filters.projectId } : {};

    // Get counts for all entities with filtering
    
    // Owners: If filtering by ownerId, count 1 or 0, otherwise count all
    const totalOwners = filters.ownerId 
      ? await this.ownerRepository.count({ where: { idOwner: filters.ownerId } })
      : await this.ownerRepository.count();
    const activeOwners = totalOwners; // Owners don't have status field
    const inactiveOwners = 0;

    // Projects: Filter by owner if specified
    let projectWhere: any = { ...projectCondition };
    if (filters.ownerId) {
      projectWhere.idOwner = filters.ownerId;
    }
    
    const totalProjects = await this.projectRepository.count({ where: projectWhere });
    const activeProjects = await this.projectRepository.count({ 
      where: { ...projectWhere, status: 'active' } 
    });
    const inactiveProjects = totalProjects - activeProjects;

    // Nodes: Need to join with Project to filter by ownerId
    let nodeQuery = this.nodeRepository.createQueryBuilder('node');
    
    if (filters.projectId) {
      nodeQuery = nodeQuery.andWhere('node.idProject = :projectId', { projectId: filters.projectId });
    }
    
    if (filters.ownerId) {
      nodeQuery = nodeQuery
        .innerJoin('node.project', 'project')
        .andWhere('project.idOwner = :ownerId', { ownerId: filters.ownerId });
    }
    
    const totalNodes = await nodeQuery.getCount();
    const onlineNodes = await nodeQuery.clone().andWhere('node.connectivityStatus = :status', { status: 'online' }).getCount();
    const degradedNodes = await nodeQuery.clone().andWhere('node.connectivityStatus = :status', { status: 'degraded' }).getCount();
    const offlineNodes = await nodeQuery.clone().andWhere('node.connectivityStatus = :status', { status: 'offline' }).getCount();

    // Sensors: Join directly with Node (Sensor has direct relation to Node)
    let sensorQuery = this.sensorRepository.createQueryBuilder('sensor');
    
    if (filters.projectId || filters.ownerId) {
      sensorQuery = sensorQuery.innerJoin('sensor.node', 'node');
      
      if (filters.projectId) {
        sensorQuery = sensorQuery.andWhere('node.idProject = :projectId', { projectId: filters.projectId });
      }
      if (filters.ownerId) {
        sensorQuery = sensorQuery
          .innerJoin('node.project', 'project')
          .andWhere('project.idOwner = :ownerId', { ownerId: filters.ownerId });
      }
    }

    const totalSensors = await sensorQuery.getCount();
    
    const activeSensors = await sensorQuery
      .clone()
      .andWhere('sensor.status = :status', { status: 'active' })
      .getCount();

    // Sensors needing calibration (calibrationDueAt is in the past)
    const calibrationDue = await sensorQuery
      .clone()
      .andWhere('sensor.calibrationDueAt IS NOT NULL')
      .andWhere('sensor.calibrationDueAt < NOW()')
      .getCount();

    // Faulty sensors (inactive status)
    const faultySensors = await sensorQuery
      .clone()
      .andWhere('sensor.status = :status', { status: 'inactive' })
      .getCount();

    return {
      owners: {
        total: totalOwners,
        active: activeOwners,
        inactive: inactiveOwners,
      },
      projects: {
        total: totalProjects,
        active: activeProjects,
        inactive: inactiveProjects,
      },
      nodes: {
        total: totalNodes,
        online: onlineNodes,
        degraded: degradedNodes,
        offline: offlineNodes,
      },
      sensors: {
        total: totalSensors,
        active: activeSensors,
        calibrationDue,
        faulty: faultySensors,
      },
    };
  }

  async getKpiStats(filters: DashboardFiltersDto): Promise<KpiStatsResponseDto> {
    const totalNodes = await this.nodeRepository.count();
    const onlineNodes = Math.floor(totalNodes * 0.91); // 91% online

    return {
      nodesOnline: {
        current: onlineNodes,
        delta: `+${Math.floor(onlineNodes * 0.02)}`,
        trend: 'up',
        sparkline: this.generateSparkline(12, onlineNodes),
        healthyPercentage: 91,
        newDeployments: 6,
      },
      activeAlerts: {
        current: 7,
        delta: '-2',
        trend: 'down',
        sparkline: this.generateSparkline(12, 7),
        criticalCount: 3,
        warningCount: 4,
      },
      telemetryRate: {
        current: 12400,
        delta: '+1400',
        trend: 'up',
        sparkline: this.generateSparkline(12, 12000),
        loraGrowth: 8,
        coverage: 'stable',
      },
      forwardedPayloads: {
        current: 4900,
        delta: '+250',
        trend: 'flat',
        sparkline: this.generateSparkline(12, 4900),
        webhookSuccess: 99.1,
        dbBatchSuccess: 92.4,
        distribution: {
          webhook: 45,
          mysql: 32,
          postgresql: 23,
        },
      },
    };
  }

  async getNodeHealth(filters: DashboardFiltersDto): Promise<NodeHealthResponseDto> {
    const nodes = await this.nodeRepository.find({
      relations: ['project'],
      take: filters.limit || 5,
    });

    const totalNodes = await this.nodeRepository.count();

    return {
      nodes: nodes.map(node => ({
        idNode: node.idNode,
        code: node.code,
        projectName: node.project?.name || 'Unknown',
        projectId: node.project?.idProject || '',
        status: node.connectivityStatus as any || 'offline',
        lastSeen: node.lastSeenAt || node.updatedAt,
        lastSeenFormatted: this.formatTimestamp(node.lastSeenAt || node.updatedAt),
        battery: 75, // Mock
        signalStrength: -65,
        alertCount: 0,
      })),
      summary: {
        totalNodes,
        onlineCount: Math.floor(totalNodes * 0.91),
        degradedCount: Math.floor(totalNodes * 0.07),
        offlineCount: Math.floor(totalNodes * 0.02),
      },
    };
  }

  async getOwnerLeaderboard(filters: DashboardFiltersDto): Promise<OwnerLeaderboardResponseDto> {
    const owners = await this.ownerRepository.find({
      take: filters.limit || 10,
    });

    return {
      owners: owners.map((owner, index) => {
        const slaLevel = owner.slaLevel as 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null;
        const health: 'healthy' | 'attention' | 'risk' = index === 0 ? 'healthy' : index === 1 ? 'attention' : 'healthy';
        
        return {
          idOwner: owner.idOwner,
          name: owner.name,
          slaLevel: slaLevel || 'Bronze',
          nodeCount: 124 - (index * 20),
          activeSensorCount: (124 - (index * 20)) * 4,
          telemetryRate: {
            perMinute: 12400 - (index * 3000),
            formatted: this.formatNumber(12400 - (index * 3000)) + '/min',
          },
          alertCount: 3 + index,
          criticalAlerts: index % 2,
          health,
        };
      }),
    };
  }

  async getActivityLog(filters: DashboardFiltersDto): Promise<ActivityLogResponseDto> {
    const activities = [
      {
        id: '1',
        type: 'webhook' as const,
        title: 'Forwarding test webhook executed',
        timestamp: new Date(),
        timeAgo: '2 mins ago',
        badge: 'WEBHOOK',
        severity: 'success' as const,
        highlight: true,
      },
      {
        id: '2',
        type: 'node_status' as const,
        title: 'Node entered degraded state',
        timestamp: new Date(Date.now() - 300000),
        timeAgo: '5 mins ago',
        badge: 'NODE',
        severity: 'warning' as const,
        highlight: false,
      },
    ];

    return { activities };
  }

  async getTelemetryStreams(filters: DashboardFiltersDto): Promise<TelemetryStreamsResponseDto> {
    const hours: string[] = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date();
      hour.setHours(hour.getHours() - i, 0, 0, 0);
      hours.push(hour.getHours().toString().padStart(2, '0') + ':00');
    }

    const ingestionStats = {
      successRate: 99.4,
      totalPackets: 12400,
      droppedPackets: 72,
      avgLatency: 420,
    };

    const forwardingStats = {
      totalForwarded: 4200,
      webhookCount: 2800,
      dbBatchCount: 1400,
      webhookSuccessRate: 99.2,
      dbSuccessRate: 92.7,
    };

    return {
      chart: {
        labels: hours,
        series: [
          { name: 'Flow Channels', data: this.generateRealisticSeries(24, 90, 160) },
          { name: 'Pressure Channels', data: this.generateRealisticSeries(24, 40, 95) },
        ],
      },
      stats: {
        ingestion: ingestionStats,
        forwarding: forwardingStats,
        // Convenience properties for HTML
        totalIngested: ingestionStats.totalPackets,
        totalForwarded: forwardingStats.totalForwarded,
        successRate: ingestionStats.successRate,
      },
    };
  }

  async getDeliveryHealth(filters: DashboardFiltersDto): Promise<DeliveryHealthResponseDto> {
    const now = new Date();
    
    return {
      webhooks: [
        {
          idWebhook: '1',
          ownerName: 'PT Adhi Tirta Utama',
          label: 'Command Center Webhook',
          name: 'Command Center Webhook', // Alias
          url: 'https://api.example.com/webhook',
          endpoint: 'https://api.example.com/webhook', // Alias
          status: 'healthy',
          successRate: 99.2,
          totalAttempts: 1250,
          successfulAttempts: 1240,
          failedAttempts: 10,
          lastSync: now,
          lastSuccess: now, // Alias
          lastSyncFormatted: this.formatTimestamp(now),
          enabled: true,
          avgResponseTime: 320,
        },
      ],
      databases: [
        {
          idDatabase: '1',
          ownerName: 'PT Garuda Energi',
          label: 'MySQL - Utility Data Lake',
          name: 'MySQL - Utility Data Lake', // Alias
          dbType: 'mysql',
          connectionString: 'mysql://db.example.com:3306', // Alias
          host: 'db.example.com',
          status: 'degraded',
          successRate: 92.7,
          totalAttempts: 850,
          successfulAttempts: 788,
          failedAttempts: 62,
          lastSync: now,
          lastSuccess: now, // Alias
          lastSyncFormatted: this.formatTimestamp(now),
          enabled: true,
        },
      ],
    };
  }

  async getAlertStream(filters: DashboardFiltersDto): Promise<AlertStreamResponseDto> {
    const now = new Date();
    
    return {
      alerts: [
        {
          idAlert: '1',
          sensorCode: 'SNS-20-FLOW',
          channelName: 'Flow Rate',
          nodeCode: 'NODE-001',
          nodeName: 'NODE-001', // Alias for HTML
          ruleName: 'Flow Drop Detection', // Alias for HTML
          severity: 'critical',
          message: 'Flow drop >30% vs baseline',
          value: 45.2,
          threshold: 65.0,
          unit: 'L/min',
          triggeredAt: now,
          timestamp: now, // Alias for HTML
          triggeredAtFormatted: this.formatTimestamp(now),
          status: 'active',
          projectName: 'Area A Distribution',
          ownerName: 'PT Adhi Tirta Utama',
        },
      ],
      summary: {
        totalActive: 7,
        criticalCount: 3,
        warningCount: 4,
        infoCount: 0,
      },
    };
  }

  async getReleaseSchedule(): Promise<ReleaseScheduleResponseDto> {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(now);
    endTime.setHours(11, 0, 0, 0);

    return {
      nextRelease: {
        startTime,
        endTime,
        timezone: 'Asia/Jakarta',
        formattedWindow: '09:00 — 11:00 WIB',
        version: 'v2.3.2',
        type: 'firmware',
        affectedDevices: 24,
        description: 'Firmware batch update for sensor nodes',
        impact: 'Nodes will restart, 2-3 min downtime per device',
        status: 'scheduled',
      },
    };
  }

  // Helper methods
  private generateSparkline(points: number, baseValue: number): number[] {
    const data: number[] = [];
    let current = baseValue * 0.65;
    for (let i = 0; i < points; i++) {
      current += (Math.random() - 0.4) * (baseValue * 0.1);
      data.push(Math.round(current));
    }
    return data;
  }

  private generateRealisticSeries(points: number, min: number, max: number): number[] {
    const data: number[] = [];
    let current = (min + max) / 2;
    for (let i = 0; i < points; i++) {
      current += (Math.random() - 0.5) * 20;
      current = Math.max(min, Math.min(max, current));
      data.push(Math.round(current));
    }
    return data;
  }

  private formatTimestamp(date: Date): string {
    return new Date(date).toISOString().substring(11, 16) + ' UTC';
  }

  private formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
