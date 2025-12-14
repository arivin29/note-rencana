import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private dataSource: DataSource,
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
    // Build where clause for filtering
    const where: any = {};
    
    // Filter by project ID (takes precedence if specified)
    if (filters.projectId) {
      where.idProject = filters.projectId;
    }
    
    // Filter by owner ID (through project relation) - only if projectId not specified
    if (filters.ownerId && !filters.projectId) {
      where.project = { idOwner: filters.ownerId };
    }

    // Count nodes with filters
    const totalNodes = await this.nodeRepository.count({ where });
    const onlineNodes = await this.nodeRepository.count({
      where: { ...where, connectivityStatus: 'online' },
    });
    const degradedNodes = await this.nodeRepository.count({
      where: { ...where, connectivityStatus: 'degraded' },
    });
    const offlineNodes = await this.nodeRepository.count({
      where: { ...where, connectivityStatus: 'offline' },
    });

    // Calculate percentage
    const healthyPercentage = totalNodes > 0 
      ? Math.round((onlineNodes / totalNodes) * 100) 
      : 0;

    // Generate time series data for connectivity status (last 24 hours, hourly intervals)
    const timeSeries = this.generateConnectivityTimeSeries(
      onlineNodes, 
      degradedNodes, 
      offlineNodes, 
      24 // 24 data points (hourly for last 24h)
    );

    // Mock alerts (TODO: Implement AlertEvent repository filtering)
    const totalAlerts = Math.floor(totalNodes * 0.3); // 30% of nodes have alerts
    const criticalAlerts = Math.floor(totalAlerts * 0.4); // 40% critical
    const warningAlerts = totalAlerts - criticalAlerts;

    return {
      nodesOnline: {
        current: onlineNodes,
        delta: `+${Math.floor(onlineNodes * 0.02)}`,
        trend: 'up',
        sparkline: this.generateSparkline(12, onlineNodes),
        healthyPercentage,
        newDeployments: Math.floor(totalNodes * 0.05), // 5% new
        timeSeries,
        totalNodes,
        degradedNodes,
        offlineNodes,
      },
      activeAlerts: {
        current: totalAlerts,
        delta: totalAlerts > 5 ? `-2` : `+1`,
        trend: totalAlerts > 5 ? 'down' : 'up',
        sparkline: this.generateSparkline(12, totalAlerts),
        criticalCount: criticalAlerts,
        warningCount: warningAlerts,
      },
      telemetryRate: {
        current: onlineNodes * 50, // Average: 50 messages/min per node
        delta: `+${Math.floor(onlineNodes * 5)}`,
        trend: onlineNodes > 0 ? 'up' : 'flat',
        sparkline: this.generateSparkline(12, onlineNodes * 50),
        activeDevices: onlineNodes, // Devices currently sending data
        totalDevices: totalNodes, // Total devices in system
        lastMessageSecondsAgo: onlineNodes > 0 ? Math.floor(Math.random() * 30) : 0, // Simulated: 0-30 seconds
        queueSize: 0, // No backlog (healthy)
      },
      forwardedPayloads: {
        current: onlineNodes * 200, // Estimate: 200 forwarded/node
        delta: `+${onlineNodes * 10}`,
        trend: 'flat',
        sparkline: this.generateSparkline(12, onlineNodes * 200),
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
    // Build where clause for filtering
    const where: any = {};
    
    // Filter by project ID (takes precedence if specified)
    if (filters.projectId) {
      where.idProject = filters.projectId;
    }
    
    // Filter by owner ID (through project relation) - only if projectId not specified
    if (filters.ownerId && !filters.projectId) {
      where.project = { idOwner: filters.ownerId };
    }

    const nodes = await this.nodeRepository.find({
      where,
      relations: ['project'],
      take: filters.limit || 5,
      order: { lastSeenAt: 'DESC' },
    });

    const totalNodes = await this.nodeRepository.count({ where });

    // Calculate actual status counts from the nodes
    const onlineCount = nodes.filter(n => n.connectivityStatus === 'online').length;
    const degradedCount = nodes.filter(n => n.connectivityStatus === 'degraded').length;
    const offlineCount = nodes.filter(n => n.connectivityStatus === 'offline' || !n.connectivityStatus).length;

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
        onlineCount,
        degradedCount,
        offlineCount,
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
    // Generate hourly labels for last 24 hours
    const hours: string[] = [];
    const hourTimestamps: Date[] = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date();
      hour.setHours(hour.getHours() - i, 0, 0, 0);
      hours.push(hour.getHours().toString().padStart(2, '0') + ':00');
      hourTimestamps.push(new Date(hour));
    }

    // Query REAL data from sensor_logs table
    const sensorLogRepository = this.dataSource.getRepository('sensor_logs');
    
    // Build query with filters
    let query = `
      SELECT 
        DATE_TRUNC('hour', sl.created_at) AS hour,
        COUNT(*) AS message_count
      FROM sensor_logs sl
      INNER JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
      INNER JOIN sensors s ON sc.id_sensor = s.id_sensor
      INNER JOIN nodes n ON s.id_node = n.id_node
      INNER JOIN projects p ON n.id_project = p.id_project
      WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters.ownerId) {
      query += ` AND p.id_owner = $${paramIndex}`;
      params.push(filters.ownerId);
      paramIndex++;
    }

    if (filters.projectId) {
      query += ` AND n.id_project = $${paramIndex}`;
      params.push(filters.projectId);
      paramIndex++;
    }

    query += `
      GROUP BY DATE_TRUNC('hour', sl.created_at)
      ORDER BY hour ASC
    `;

    const hourlyData = await this.dataSource.query(query, params);

    // Map query results to hourly array (fill zeros for missing hours)
    const dataPoints = hours.map((label, index) => {
      const hourTimestamp = hourTimestamps[index];
      const found = hourlyData.find(row => {
        const rowHour = new Date(row.hour);
        return rowHour.getHours() === hourTimestamp.getHours();
      });
      return found ? parseInt(found.message_count) : 0;
    });

    // Calculate statistics
    const totalMessages = dataPoints.reduce((sum, count) => sum + count, 0);
    const avgPerHour = totalMessages > 0 ? Math.round(totalMessages / 24) : 0;
    const maxHour = Math.max(...dataPoints);

    // Calculate growth vs yesterday (simplified - compare last 12h vs first 12h)
    const recentHalf = dataPoints.slice(12).reduce((sum, count) => sum + count, 0);
    const olderHalf = dataPoints.slice(0, 12).reduce((sum, count) => sum + count, 0);
    const growthPercent = olderHalf > 0 
      ? Math.round(((recentHalf - olderHalf) / olderHalf) * 100) 
      : 0;

    const ingestionStats = {
      successRate: 100.0, // Assume all logs in sensor_logs are successful
      totalPackets: totalMessages,
      droppedPackets: 0, // TODO: Track failed ingestion if applicable
      avgLatency: 0, // TODO: Implement if timestamp tracking exists
    };

    const forwardingStats = {
      totalForwarded: 0, // TODO: Query from forwarding_logs when implemented
      webhookCount: 0,
      dbBatchCount: 0,
      webhookSuccessRate: 0,
      dbSuccessRate: 0,
    };

    return {
      chart: {
        labels: hours,
        series: [
          { name: 'Messages Received', data: dataPoints },
        ],
      },
      stats: {
        ingestion: ingestionStats,
        forwarding: forwardingStats,
        // Convenience properties for HTML
        totalIngested: totalMessages,
        totalForwarded: forwardingStats.totalForwarded,
        successRate: ingestionStats.successRate,
        avgPerHour: avgPerHour,
        peakHour: maxHour,
        growthPercent: growthPercent,
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

  /**
   * Generate realistic time series data for connectivity status
   * Simulates historical connectivity trends with slight variations
   */
  private generateConnectivityTimeSeries(
    currentOnline: number,
    currentDegraded: number,
    currentOffline: number,
    dataPoints: number = 24
  ): Array<{ timestamp: string; online: number; degraded: number; offline: number }> {
    const now = new Date();
    const timeSeries: Array<{ timestamp: string; online: number; degraded: number; offline: number }> = [];
    
    // Generate data points going backwards in time (hourly intervals for 24h)
    for (let i = dataPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // 1 hour intervals
      
      // Add slight random variation to current values for historical simulation
      // Recent data points should be closer to current values
      const recency = 1 - (i / dataPoints); // 0 = oldest, 1 = newest
      const variance = 1 - (recency * 0.5); // More variance in older data
      
      const online = Math.max(0, Math.round(currentOnline + (Math.random() - 0.5) * 2 * variance));
      const degraded = Math.max(0, Math.round(currentDegraded + (Math.random() - 0.5) * 1 * variance));
      const offline = Math.max(0, Math.round(currentOffline + (Math.random() - 0.5) * 1 * variance));
      
      timeSeries.push({
        timestamp: timestamp.toISOString(),
        online,
        degraded,
        offline,
      });
    }
    
    return timeSeries;
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
