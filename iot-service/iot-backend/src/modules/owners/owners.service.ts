import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Owner } from '../../entities/owner.entity';
import { OwnerForwardingWebhook } from '../../entities/owner-forwarding-webhook.entity';
import { OwnerForwardingDatabase } from '../../entities/owner-forwarding-database.entity';
import { generateUniqueOwnerCode } from '../../utils/code-generator.util';
import {
  CreateOwnerDto,
  UpdateOwnerDto,
  OwnerResponseDto,
  OwnerDetailResponseDto,
  OwnerStatisticsResponseDto,
  OwnerDashboardResponseDto,
  OwnerWidgetsResponseDto,
  OwnerQueryDto,
  CreateDatabaseDto,
  UpdateDatabaseDto,
  ForwardingDatabaseResponseDto,
} from './dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { ForwardingWebhookResponseDto } from './dto/forwarding-webhook-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private ownersRepository: Repository<Owner>,
    @InjectRepository(OwnerForwardingWebhook)
    private webhooksRepository: Repository<OwnerForwardingWebhook>,
    @InjectRepository(OwnerForwardingDatabase)
    private databasesRepository: Repository<OwnerForwardingDatabase>,
  ) {}

  // ============================================
  // STANDARD CRUD (Type 1 - Simple Response)
  // ============================================

  async create(createOwnerDto: CreateOwnerDto): Promise<OwnerResponseDto> {
    // Generate unique owner code
    const ownerCode = await generateUniqueOwnerCode(async (code) => {
      const existing = await this.ownersRepository.findOne({
        where: { ownerCode: code },
      });
      return !!existing;
    });

    const owner = this.ownersRepository.create({
      ...createOwnerDto,
      ownerCode,
    });
    const saved = await this.ownersRepository.save(owner);
    return this.toResponseDto(saved);
  }

  async findAll(query: OwnerQueryDto): Promise<PaginatedResponseDto<OwnerResponseDto>> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC',
      // Direct column filters
      industry,
      industries,
      slaLevel,
      slaLevels,
      contactPerson,
      // Date range filters
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      // Relation-based filters
      projectIds,
      projectName,
      projectStatus,
      hasNodes,
      hasActiveSensors,
      minProjects,
      maxProjects,
    } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.ownersRepository.createQueryBuilder('owner');

    // ========================================
    // 1. GENERAL SEARCH (across multiple columns)
    // ========================================
    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('owner.name ILIKE :search', { search: `%${search}%` })
            .orWhere('owner.industry ILIKE :search', { search: `%${search}%` })
            .orWhere('owner.contactPerson ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    // ========================================
    // 2. DIRECT COLUMN FILTERS
    // ========================================
    
    // Single industry filter
    if (industry) {
      queryBuilder.andWhere('owner.industry = :industry', { industry });
    }

    // Multiple industries filter (WHERE IN)
    if (industries) {
      const industriesArray = industries.split(',').map(i => i.trim());
      queryBuilder.andWhere('owner.industry IN (:...industries)', { industries: industriesArray });
    }

    // Single SLA level filter
    if (slaLevel) {
      queryBuilder.andWhere('LOWER(owner.slaLevel) = LOWER(:slaLevel)', { slaLevel });
    }

    // Multiple SLA levels filter (WHERE IN)
    if (slaLevels) {
      const slaLevelsArray = slaLevels.split(',').map(s => s.trim().toLowerCase());
      queryBuilder.andWhere('LOWER(owner.slaLevel) IN (:...slaLevels)', { slaLevels: slaLevelsArray });
    }

    // Contact person filter (partial match)
    if (contactPerson) {
      queryBuilder.andWhere('owner.contactPerson ILIKE :contactPerson', { 
        contactPerson: `%${contactPerson}%` 
      });
    }

    // ========================================
    // 3. DATE RANGE FILTERS
    // ========================================
    
    if (createdFrom) {
      queryBuilder.andWhere('owner.createdAt >= :createdFrom', { createdFrom });
    }

    if (createdTo) {
      queryBuilder.andWhere('owner.createdAt <= :createdTo', { createdTo });
    }

    if (updatedFrom) {
      queryBuilder.andWhere('owner.updatedAt >= :updatedFrom', { updatedFrom });
    }

    if (updatedTo) {
      queryBuilder.andWhere('owner.updatedAt <= :updatedTo', { updatedTo });
    }

    // ========================================
    // 4. RELATION-BASED FILTERS (WHERE IN from other tables)
    // ========================================

    // Filter by project IDs (owners that have specific projects)
    if (projectIds) {
      const projectIdsArray = projectIds.split(',').map(id => id.trim());
      queryBuilder.andWhere(
        `owner.idOwner IN (
          SELECT DISTINCT p.id_owner 
          FROM projects p 
          WHERE p.id_project IN (:...projectIds)
        )`,
        { projectIds: projectIdsArray },
      );
    }

    // Filter by project name (partial match)
    if (projectName) {
      queryBuilder.andWhere(
        `owner.idOwner IN (
          SELECT DISTINCT p.id_owner 
          FROM projects p 
          WHERE p.name ILIKE :projectName
        )`,
        { projectName: `%${projectName}%` },
      );
    }

    // Filter by project status
    if (projectStatus) {
      queryBuilder.andWhere(
        `owner.idOwner IN (
          SELECT DISTINCT p.id_owner 
          FROM projects p 
          WHERE p.status = :projectStatus
        )`,
        { projectStatus },
      );
    }

    // Filter owners that have nodes
    if (hasNodes === 'true') {
      queryBuilder.andWhere(
        `owner.idOwner IN (
          SELECT DISTINCT p.id_owner 
          FROM projects p 
          INNER JOIN nodes n ON n.id_project = p.id_project
        )`,
      );
    }

    // Filter owners that have active sensors
    if (hasActiveSensors === 'true') {
      queryBuilder.andWhere(
        `owner.idOwner IN (
          SELECT DISTINCT p.id_owner 
          FROM projects p 
          INNER JOIN nodes n ON n.id_project = p.id_project
          INNER JOIN sensors s ON s.id_node = n.id_node
          WHERE s.status = 'active'
        )`,
      );
    }

    // Filter by minimum number of projects
    if (minProjects) {
      const minProjectsNum = parseInt(minProjects, 10);
      queryBuilder.andWhere(
        `owner.idOwner IN (
          SELECT p.id_owner 
          FROM projects p 
          GROUP BY p.id_owner 
          HAVING COUNT(*) >= :minProjects
        )`,
        { minProjects: minProjectsNum },
      );
    }

    // Filter by maximum number of projects
    if (maxProjects) {
      const maxProjectsNum = parseInt(maxProjects, 10);
      queryBuilder.andWhere(
        `owner.idOwner IN (
          SELECT p.id_owner 
          FROM projects p 
          GROUP BY p.id_owner 
          HAVING COUNT(*) <= :maxProjects
        )`,
        { maxProjects: maxProjectsNum },
      );
    }

    // ========================================
    // 5. SORTING
    // ========================================
    queryBuilder.orderBy(`owner.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // ========================================
    // 6. PAGINATION
    // ========================================
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items.map((item) => this.toResponseDto(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<OwnerResponseDto> {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    return this.toResponseDto(owner);
  }

  async update(id: string, updateOwnerDto: UpdateOwnerDto): Promise<OwnerResponseDto> {
    await this.findOne(id); // Check if exists
    await this.ownersRepository.update(id, updateOwnerDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.ownersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }
  }

  // ============================================
  // NESTED DATA QUERIES (Type 2 - With Relations)
  // ============================================

  async findOneWithDetails(id: string): Promise<OwnerDetailResponseDto> {
    // Load owner with all relations
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
      relations: [
        'projects',
        'forwardingWebhooks',
        'forwardingDatabases',
        'forwardingLogs',
      ],
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    // Simple projects summary
    const projectsSummary = (owner.projects || []).map(project => ({
      idProject: project.idProject,
      name: project.name,
      status: project.status,
      nodeCount: 0,
    }));

    // Empty node assignments for now
    const nodeAssignmentsSummary = [];

    const statistics = {
      totalProjects: owner.projects?.length || 0,
      totalNodes: 0,
      activeSensors: 0,
      activeAlerts: 0,
    };

    // Map forwarding webhooks
    const forwardingWebhooks = (owner.forwardingWebhooks || []).map(webhook => ({
      idOwnerForwardingWebhook: webhook.idOwnerForwardingWebhook,
      idOwner: webhook.idOwner,
      label: webhook.label,
      endpointUrl: webhook.endpointUrl,
      httpMethod: webhook.httpMethod,
      headersJson: webhook.headersJson,
      secretToken: webhook.secretToken ? '***' : undefined, // Mask secret
      payloadTemplate: webhook.payloadTemplate,
      maxRetry: webhook.maxRetry,
      retryBackoffMs: webhook.retryBackoffMs,
      enabled: webhook.enabled,
      lastStatus: webhook.lastStatus,
      lastDeliveryAt: webhook.lastDeliveryAt?.toISOString(),
      lastError: webhook.lastError,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    }));

    // Map forwarding databases
    const forwardingDatabases = (owner.forwardingDatabases || []).map(db => ({
      idOwnerForwardingDb: db.idOwnerForwardingDb,
      idOwner: db.idOwner,
      label: db.label,
      dbType: db.dbType,
      host: db.host,
      port: db.port,
      databaseName: db.databaseName,
      username: db.username,
      passwordCipher: '********', // Always mask password
      targetSchema: db.targetSchema,
      targetTable: db.targetTable,
      writeMode: db.writeMode,
      batchSize: db.batchSize,
      enabled: db.enabled,
      lastStatus: db.lastStatus,
      lastDeliveryAt: db.lastDeliveryAt?.toISOString(),
      lastError: db.lastError,
      createdAt: db.createdAt.toISOString(),
      updatedAt: db.updatedAt.toISOString(),
    }));

    // Map forwarding logs (limit to last 20)
    const forwardingLogs = (owner.forwardingLogs || [])
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20)
      .map(log => ({
        idOwnerForwardingLog: log.idOwnerForwardingLog,
        idOwner: log.idOwner,
        configType: log.configType,
        configId: log.configId,
        status: log.status,
        attempts: log.attempts,
        errorMessage: log.errorMessage,
        durationMs: log.durationMs,
        createdAt: log.createdAt.toISOString(),
      }));

    return {
      idOwner: owner.idOwner,
      name: owner.name,
      industry: owner.industry,
      contactPerson: owner.contactPerson,
      slaLevel: owner.slaLevel,
      forwardingSettings: owner.forwardingSettings,
      projects: projectsSummary,
      nodeAssignments: nodeAssignmentsSummary,
      statistics,
      forwardingWebhooks,
      forwardingDatabases,
      forwardingLogs,
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
    };
  }

  async getOwnerProjects(id: string) {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
      relations: ['projects'],
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    // Add node count to each project
    const projectsWithNodeCount = await Promise.all(
      (owner.projects || []).map(async (project) => {
        const nodeCount = await this.ownersRepository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'count')
          .from('nodes', 'n')
          .where('n.id_project = :projectId', { projectId: project.idProject })
          .getRawOne()
          .then(result => parseInt(result.count, 10));
        
        return {
          ...project,
          nodeCount,
        };
      })
    );

    return projectsWithNodeCount;
  }

  async getOwnerNodes(id: string) {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    // Get all nodes for this owner using query builder
    const nodes = await this.ownersRepository.manager
      .createQueryBuilder()
      .select([
        'n.*',
        'p.name as "projectName"',
        'p.id_project as "projectId"',
        '(SELECT COUNT(*) FROM sensors s WHERE s.id_node = n.id_node) as "sensorCount"'
      ])
      .from('nodes', 'n')
      .innerJoin('projects', 'p', 'p.id_project = n.id_project')
      .where('p.id_owner = :ownerId', { ownerId: id })
      .getRawMany();

    return nodes;
  }

  // ============================================
  // AGGREGATIONS & REPORTS (Type 3)
  // ============================================

  async getStatistics(): Promise<OwnerStatisticsResponseDto> {
    const totalOwners = await this.ownersRepository.count();

    // Group by industry
    const ownersByIndustry = await this.ownersRepository
      .createQueryBuilder('owner')
      .select('owner.industry', 'industry')
      .addSelect('COUNT(*)', 'count')
      .groupBy('owner.industry')
      .getRawMany();

    // Group by SLA level
    const ownersBySlaLevel = await this.ownersRepository
      .createQueryBuilder('owner')
      .select('owner.slaLevel', 'slaLevel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('owner.slaLevel')
      .getRawMany();

    // Top owners by projects and nodes using raw SQL
    const topOwners = await this.ownersRepository.manager.query(`
      SELECT 
        o.id_owner as "idOwner",
        o.name,
        COUNT(DISTINCT p.id_project) as "projectCount",
        COALESCE(COUNT(DISTINCT n.id_node), 0) as "nodeCount",
        COALESCE(COUNT(DISTINCT s.id_sensor), 0) as "sensorCount"
      FROM owners o
      LEFT JOIN projects p ON p.id_owner = o.id_owner
      LEFT JOIN nodes n ON n.id_project = p.id_project
      LEFT JOIN sensors s ON s.id_node = n.id_node
      GROUP BY o.id_owner, o.name
      ORDER BY "projectCount" DESC, "nodeCount" DESC
      LIMIT 10
    `);

    // Recent activity (latest updated owners)
    const recentActivity = await this.ownersRepository
      .createQueryBuilder('owner')
      .select(['owner.idOwner', 'owner.name', 'owner.updatedAt'])
      .orderBy('owner.updatedAt', 'DESC')
      .limit(10)
      .getMany();

    return {
      totalOwners,
      ownersByIndustry: ownersByIndustry.map((item) => ({
        industry: item.industry || 'Unknown',
        count: parseInt(item.count),
        percentage: totalOwners > 0 ? (parseInt(item.count) / totalOwners) * 100 : 0,
      })),
      ownersBySlaLevel: ownersBySlaLevel.map((item) => ({
        slaLevel: item.slaLevel || 'None',
        count: parseInt(item.count),
      })),
      topOwnersByProjects: topOwners.map((item) => ({
        idOwner: item.idOwner,
        name: item.name,
        projectCount: parseInt(item.projectCount) || 0,
        nodeCount: parseInt(item.nodeCount) || 0,
        sensorCount: parseInt(item.sensorCount) || 0,
      })),
      recentActivity: recentActivity.map((owner) => ({
        idOwner: owner.idOwner,
        name: owner.name,
        lastActivity: owner.updatedAt,
        action: 'Updated',
      })),
    };
  }

  async getOwnerDashboard(id: string): Promise<OwnerDashboardResponseDto> {
    const owner = await this.findOneWithDetails(id);

    return {
      owner: {
        id: owner.idOwner,
        name: owner.name,
        industry: owner.industry,
        slaLevel: owner.slaLevel || 'None',
      },
      summary: owner.statistics,
      recentProjects: owner.projects?.slice(0, 5) || [],
      recentAlerts: [], // TODO: Query from alert_events
      performanceMetrics: {
        dataPointsToday: 0, // TODO: Calculate from sensor_logs
        uptimePercentage: 0, // TODO: Calculate
        averageResponseTime: 0, // TODO: Calculate
      },
    };
  }

  async getMonthlyReport(id: string, year: number, month: number) {
    const owner = await this.findOne(id);

    // TODO: Implement complex aggregation query for monthly report
    return {
      owner,
      period: { year, month },
      metrics: {
        dataPoints: 0,
        alerts: 0,
        downtime: 0,
        compliance: 100,
      },
      summary: 'Monthly report data will be implemented with sensor data',
    };
  }

  async getWidgetsData(): Promise<OwnerWidgetsResponseDto> {
    const stats = await this.getStatistics();

    return {
      totalOwners: stats.totalOwners,
      activeOwners: stats.totalOwners, // TODO: Add active filter
      byIndustry: stats.ownersByIndustry,
      bySlaLevel: stats.ownersBySlaLevel,
      topOwners: stats.topOwnersByProjects.slice(0, 5),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private toResponseDto(owner: Owner): OwnerResponseDto {
    return {
      idOwner: owner.idOwner,
      ownerCode: owner.ownerCode,
      name: owner.name,
      industry: owner.industry,
      contactPerson: owner.contactPerson,
      email: owner.email,
      phone: owner.phone,
      address: owner.address,
      slaLevel: owner.slaLevel,
      forwardingSettings: owner.forwardingSettings,
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
    };
  }

  // ============================================
  // WEBHOOK MANAGEMENT
  // ============================================

  async createWebhook(
    ownerId: string,
    createWebhookDto: CreateWebhookDto,
  ): Promise<ForwardingWebhookResponseDto> {
    // Verify owner exists
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: ownerId },
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${ownerId} not found`);
    }

    const webhook = this.webhooksRepository.create({
      idOwner: ownerId,
      ...createWebhookDto,
    });

    const saved = await this.webhooksRepository.save(webhook);
    return this.toWebhookResponseDto(saved);
  }

  async updateWebhook(
    ownerId: string,
    webhookId: string,
    updateWebhookDto: UpdateWebhookDto,
  ): Promise<ForwardingWebhookResponseDto> {
    const webhook = await this.webhooksRepository.findOne({
      where: { 
        idOwnerForwardingWebhook: webhookId,
        idOwner: ownerId,
      },
    });

    if (!webhook) {
      throw new NotFoundException(
        `Webhook with ID ${webhookId} not found for owner ${ownerId}`,
      );
    }

    Object.assign(webhook, updateWebhookDto);
    const updated = await this.webhooksRepository.save(webhook);
    return this.toWebhookResponseDto(updated);
  }

  async deleteWebhook(ownerId: string, webhookId: string): Promise<void> {
    const result = await this.webhooksRepository.delete({
      idOwnerForwardingWebhook: webhookId,
      idOwner: ownerId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Webhook with ID ${webhookId} not found for owner ${ownerId}`,
      );
    }
  }

  async testWebhookDelivery(
    ownerId: string,
    webhookId: string,
  ): Promise<{ success: boolean; message: string; duration: number }> {
    const webhook = await this.webhooksRepository.findOne({
      where: { 
        idOwnerForwardingWebhook: webhookId,
        idOwner: ownerId,
      },
    });

    if (!webhook) {
      throw new NotFoundException(
        `Webhook with ID ${webhookId} not found for owner ${ownerId}`,
      );
    }

    const startTime = Date.now();
    
    try {
      // TODO: Implement actual HTTP request to webhook endpoint
      // For now, simulate a test
      const duration = Date.now() - startTime;

      // Update last delivery status
      webhook.lastStatus = 'Healthy';
      webhook.lastDeliveryAt = new Date();
      await this.webhooksRepository.save(webhook);

      return {
        success: true,
        message: 'Test delivery succeeded (simulated)',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      webhook.lastStatus = 'Failed';
      webhook.lastError = error.message;
      await this.webhooksRepository.save(webhook);

      return {
        success: false,
        message: `Test delivery failed: ${error.message}`,
        duration,
      };
    }
  }

  // ============================================
  // DATABASE FORWARDING MANAGEMENT
  // ============================================

  async createDatabase(
    ownerId: string,
    createDatabaseDto: CreateDatabaseDto,
  ): Promise<ForwardingDatabaseResponseDto> {
    // Verify owner exists
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: ownerId },
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${ownerId} not found`);
    }

    const database = this.databasesRepository.create({
      idOwner: ownerId,
      ...createDatabaseDto,
    });

    const saved = await this.databasesRepository.save(database);
    return this.toDatabaseResponseDto(saved);
  }

  async updateDatabase(
    ownerId: string,
    databaseId: string,
    updateDatabaseDto: UpdateDatabaseDto,
  ): Promise<ForwardingDatabaseResponseDto> {
    const database = await this.databasesRepository.findOne({
      where: {
        idOwnerForwardingDb: databaseId,
        idOwner: ownerId,
      },
    });

    if (!database) {
      throw new NotFoundException(
        `Database config with ID ${databaseId} not found for owner ${ownerId}`,
      );
    }

    Object.assign(database, updateDatabaseDto);
    const updated = await this.databasesRepository.save(database);
    return this.toDatabaseResponseDto(updated);
  }

  async deleteDatabase(ownerId: string, databaseId: string): Promise<void> {
    const database = await this.databasesRepository.findOne({
      where: {
        idOwnerForwardingDb: databaseId,
        idOwner: ownerId,
      },
    });

    if (!database) {
      throw new NotFoundException(
        `Database config with ID ${databaseId} not found for owner ${ownerId}`,
      );
    }

    await this.databasesRepository.remove(database);
  }

  async testDatabaseConnection(
    ownerId: string,
    databaseId: string,
  ): Promise<{ success: boolean; message: string; duration: number }> {
    const database = await this.databasesRepository.findOne({
      where: {
        idOwnerForwardingDb: databaseId,
        idOwner: ownerId,
      },
    });

    if (!database) {
      throw new NotFoundException(
        `Database config with ID ${databaseId} not found for owner ${ownerId}`,
      );
    }

    const startTime = Date.now();

    try {
      // TODO: Implement actual database connection test
      // For now, simulate a test
      const duration = Date.now() - startTime + 150;

      // Update last delivery status
      database.lastStatus = 'Connected';
      database.lastDeliveryAt = new Date();
      await this.databasesRepository.save(database);

      return {
        success: true,
        message: 'Database connection test succeeded (simulated)',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      database.lastStatus = 'Failed';
      database.lastError = error.message;
      await this.databasesRepository.save(database);

      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        duration,
      };
    }
  }

  private toWebhookResponseDto(
    webhook: OwnerForwardingWebhook,
  ): ForwardingWebhookResponseDto {
    return {
      idOwnerForwardingWebhook: webhook.idOwnerForwardingWebhook,
      idOwner: webhook.idOwner,
      label: webhook.label,
      endpointUrl: webhook.endpointUrl,
      httpMethod: webhook.httpMethod,
      headersJson: webhook.headersJson,
      secretToken: webhook.secretToken ? '***' : undefined,
      payloadTemplate: webhook.payloadTemplate,
      maxRetry: webhook.maxRetry,
      retryBackoffMs: webhook.retryBackoffMs,
      enabled: webhook.enabled,
      lastStatus: webhook.lastStatus,
      lastDeliveryAt: webhook.lastDeliveryAt?.toISOString(),
      lastError: webhook.lastError,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    };
  }

  private toDatabaseResponseDto(
    database: OwnerForwardingDatabase,
  ): ForwardingDatabaseResponseDto {
    return {
      idOwnerForwardingDb: database.idOwnerForwardingDb,
      idOwner: database.idOwner,
      label: database.label,
      dbType: database.dbType,
      host: database.host,
      port: database.port,
      databaseName: database.databaseName,
      username: database.username,
      passwordCipher: '********', // Always mask password
      targetSchema: database.targetSchema,
      targetTable: database.targetTable,
      writeMode: database.writeMode,
      batchSize: database.batchSize,
      enabled: database.enabled,
      lastStatus: database.lastStatus,
      lastDeliveryAt: database.lastDeliveryAt?.toISOString(),
      lastError: database.lastError,
      createdAt: database.createdAt.toISOString(),
      updatedAt: database.updatedAt.toISOString(),
    };
  }
}
