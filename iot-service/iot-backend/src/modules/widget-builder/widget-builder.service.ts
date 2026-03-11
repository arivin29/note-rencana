import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CustomDashboard } from '../../entities/custom-dashboard.entity';
import { CustomWidget } from '../../entities/custom-widget.entity';
import { WidgetQueryTemplate } from '../../entities/widget-query-template.entity';
import { Owner } from '../../entities/owner.entity';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { 
  CreateCustomDashboardDto, 
  UpdateCustomDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UpdateWidgetPositionsDto,
  ExecuteQueryDto,
  ValidateQueryDto,
  ExecuteQueryResponseDto,
  ValidateQueryResponseDto,
  DataSource as DataSourceEnum
} from './dto';

// Blocked SQL keywords for security
const BLOCKED_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
  'CREATE', 'ALTER', 'GRANT', 'REVOKE', 'EXEC',
  'EXECUTE', 'INTO', 'SET', 'MERGE', 'CALL',
  'DECLARE', 'BEGIN', 'COMMIT', 'ROLLBACK'
];

// Time range mapping for query variables
const TIME_RANGE_MAP: Record<string, string> = {
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  '3h': '3 hours',
  '6h': '6 hours',
  '12h': '12 hours',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days'
};

// ClickHouse time range mapping (uses INTERVAL syntax)
const CLICKHOUSE_TIME_RANGE_MAP: Record<string, string> = {
  '15m': '15 MINUTE',
  '30m': '30 MINUTE',
  '1h': '1 HOUR',
  '3h': '3 HOUR',
  '6h': '6 HOUR',
  '12h': '12 HOUR',
  '24h': '24 HOUR',
  '7d': '7 DAY',
  '30d': '30 DAY'
};

@Injectable()
export class WidgetBuilderService {
  private readonly logger = new Logger(WidgetBuilderService.name);
  // Cache ownerCode lookups to avoid repeated DB queries
  private ownerCodeCache = new Map<string, string>();

  constructor(
    @InjectRepository(CustomDashboard)
    private dashboardRepository: Repository<CustomDashboard>,
    @InjectRepository(CustomWidget)
    private widgetRepository: Repository<CustomWidget>,
    @InjectRepository(WidgetQueryTemplate)
    private templateRepository: Repository<WidgetQueryTemplate>,
    @InjectRepository(Owner)
    private ownerRepository: Repository<Owner>,
    private dataSource: DataSource,
    private clickhouseService: ClickhouseService,
  ) {}

  // ==========================================
  // DASHBOARD CRUD
  // ==========================================

  async findAllDashboards(ownerId: string, isAdmin = false, projectId?: string): Promise<CustomDashboard[]> {
    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .leftJoinAndSelect('dashboard.project', 'project')
      .where('dashboard.isActive = :isActive', { isActive: true });

    // Admin can see all dashboards, non-admin filtered by owner
    if (!isAdmin) {
      queryBuilder.andWhere('dashboard.idOwner = :ownerId', { ownerId });
    }

    // Filter by project if specified
    if (projectId) {
      queryBuilder.andWhere('dashboard.idProject = :projectId', { projectId });
    }

    return queryBuilder.orderBy('dashboard.createdAt', 'DESC').getMany();
  }

  /**
   * Find dashboards by project ID (for project detail page)
   */
  async findDashboardsByProject(projectId: string, ownerId: string, isAdmin = false): Promise<CustomDashboard[]> {
    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .leftJoinAndSelect('dashboard.project', 'project')
      .where('dashboard.isActive = :isActive', { isActive: true })
      .andWhere('dashboard.idProject = :projectId', { projectId });

    // Non-admin filtered by owner
    if (!isAdmin) {
      queryBuilder.andWhere('dashboard.idOwner = :ownerId', { ownerId });
    }

    return queryBuilder.orderBy('dashboard.createdAt', 'DESC').getMany();
  }

  async findDashboardById(id: string, ownerId: string, isAdmin = false): Promise<CustomDashboard> {
    console.log(`🔍 Finding dashboard: id=${id}, ownerId=${ownerId}, isAdmin=${isAdmin}`);
    
    const dashboard = await this.dashboardRepository.findOne({
      where: { idDashboard: id },
      relations: ['widgets'],
    });

    if (!dashboard) {
      console.log(`❌ Dashboard not found: ${id}`);
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    console.log(`📊 Dashboard found: idOwner=${dashboard.idOwner}`);
    
    // Admin can access any dashboard
    if (isAdmin) {
      return dashboard;
    }
    
    // Check owner access for non-admin
    if (dashboard.idOwner !== ownerId) {
      console.log(`🚫 Access denied: dashboard.idOwner=${dashboard.idOwner} !== ownerId=${ownerId}`);
      throw new ForbiddenException('You do not have access to this dashboard');
    }

    return dashboard;
  }

  async createDashboard(dto: CreateCustomDashboardDto, ownerId: string, userId: string): Promise<CustomDashboard> {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.dashboardRepository.update(
        { idOwner: ownerId, isDefault: true },
        { isDefault: false }
      );
    }

    const dashboard = this.dashboardRepository.create({
      ...dto,
      idOwner: ownerId,
      createdBy: userId,
    });

    return this.dashboardRepository.save(dashboard);
  }

  async updateDashboard(id: string, dto: UpdateCustomDashboardDto, ownerId: string, isAdmin = false): Promise<CustomDashboard> {
    const dashboard = await this.findDashboardById(id, ownerId, isAdmin);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.dashboardRepository.update(
        { idOwner: dashboard.idOwner, isDefault: true },
        { isDefault: false }
      );
    }

    Object.assign(dashboard, dto);
    return this.dashboardRepository.save(dashboard);
  }

  async deleteDashboard(id: string, ownerId: string, isAdmin = false): Promise<void> {
    const dashboard = await this.findDashboardById(id, ownerId, isAdmin);
    await this.dashboardRepository.remove(dashboard);
  }

  // ==========================================
  // WIDGET CRUD
  // ==========================================

  async findWidgetsByDashboard(dashboardId: string, ownerId: string, isAdmin = false): Promise<CustomWidget[]> {
    // Verify dashboard access
    await this.findDashboardById(dashboardId, ownerId, isAdmin);

    return this.widgetRepository.find({
      where: { idDashboard: dashboardId, isActive: true },
      order: { positionY: 'ASC', positionX: 'ASC' },
    });
  }

  async findWidgetById(widgetId: string, dashboardId: string, ownerId: string, isAdmin = false): Promise<CustomWidget> {
    // Verify dashboard access
    await this.findDashboardById(dashboardId, ownerId, isAdmin);

    const widget = await this.widgetRepository.findOne({
      where: { idWidget: widgetId, idDashboard: dashboardId },
    });

    if (!widget) {
      throw new NotFoundException(`Widget with ID ${widgetId} not found`);
    }

    return widget;
  }

  async createWidget(dashboardId: string, dto: CreateWidgetDto, ownerId: string, userId: string, isAdmin = false): Promise<CustomWidget> {
    // Verify dashboard access
    await this.findDashboardById(dashboardId, ownerId, isAdmin);

    // Validate SQL query
    const validation = this.validateQuery({ sql: dto.sqlQuery });
    if (!validation.isValid) {
      throw new BadRequestException(`Invalid SQL: ${validation.error}`);
    }

    const widget = this.widgetRepository.create({
      ...dto,
      idDashboard: dashboardId,
      createdBy: userId,
    } as Partial<CustomWidget>);

    return this.widgetRepository.save(widget as CustomWidget);
  }

  async updateWidget(widgetId: string, dashboardId: string, dto: UpdateWidgetDto, ownerId: string, isAdmin = false): Promise<CustomWidget> {
    const widget = await this.findWidgetById(widgetId, dashboardId, ownerId, isAdmin);

    // Validate SQL if provided
    if (dto.sqlQuery) {
      const validation = this.validateQuery({ sql: dto.sqlQuery });
      if (!validation.isValid) {
        throw new BadRequestException(`Invalid SQL: ${validation.error}`);
      }
    }

    Object.assign(widget, dto);
    return this.widgetRepository.save(widget);
  }

  async updateWidgetPositions(dashboardId: string, dto: UpdateWidgetPositionsDto, ownerId: string, isAdmin = false): Promise<void> {
    // Verify dashboard access
    await this.findDashboardById(dashboardId, ownerId, isAdmin);

    // Batch update positions
    for (const pos of dto.positions) {
      await this.widgetRepository.update(
        { idWidget: pos.idWidget, idDashboard: dashboardId },
        {
          positionX: pos.positionX,
          positionY: pos.positionY,
          ...(pos.cols && { cols: pos.cols }),
          ...(pos.rows && { rows: pos.rows }),
        }
      );
    }
  }

  async deleteWidget(widgetId: string, dashboardId: string, ownerId: string, isAdmin = false): Promise<void> {
    const widget = await this.findWidgetById(widgetId, dashboardId, ownerId, isAdmin);
    await this.widgetRepository.remove(widget);
  }

  // ==========================================
  // QUERY EXECUTION
  // ==========================================

  validateQuery(dto: ValidateQueryDto): ValidateQueryResponseDto {
    const sql = dto.sql.trim();

    // Check if empty
    if (!sql) {
      return { isValid: false, error: 'SQL query cannot be empty' };
    }

    const upperSql = sql.toUpperCase();

    // Must start with SELECT or WITH (for CTEs)
    if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('WITH')) {
      return { 
        isValid: false, 
        error: 'Query must start with SELECT or WITH (for CTEs)' 
      };
    }

    // Check for blocked keywords
    const foundBlocked: string[] = [];
    for (const keyword of BLOCKED_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(sql)) {
        foundBlocked.push(keyword);
      }
    }

    if (foundBlocked.length > 0) {
      return {
        isValid: false,
        error: `Query contains blocked keywords: ${foundBlocked.join(', ')}`,
        blockedKeywords: foundBlocked
      };
    }

    return { isValid: true };
  }

  async executeQuery(dto: ExecuteQueryDto, ownerId: string | null): Promise<ExecuteQueryResponseDto> {
    // Validate query first
    const validation = this.validateQuery({ sql: dto.sql });
    if (!validation.isValid) {
      throw new BadRequestException(`Invalid SQL: ${validation.error}`);
    }

    // Determine data source (default: PostgreSQL)
    const dataSourceType = dto.dataSource || DataSourceEnum.POSTGRESQL;
    
    // Check if ClickHouse is requested but not available
    if (dataSourceType === DataSourceEnum.CLICKHOUSE && !this.clickhouseService.isAvailable()) {
      throw new BadRequestException('ClickHouse is not available. Please use PostgreSQL or enable ClickHouse.');
    }

    // Prepare SQL with variable replacements
    const sql = await this.prepareQuery(dto, ownerId, dataSourceType);

    this.logger.debug(`Executing query on ${dataSourceType}: ${sql.substring(0, 200)}...`);

    // Route to appropriate data source
    if (dataSourceType === DataSourceEnum.CLICKHOUSE) {
      return this.executeClickHouseQuery(sql);
    } else {
      return this.executePostgreSQLQuery(sql);
    }
  }

  /**
   * Prepare SQL query with variable replacements
   */
  private async prepareQuery(dto: ExecuteQueryDto, ownerId: string | null, dataSourceType: DataSourceEnum): Promise<string> {
    let sql = dto.sql;
    const isClickHouse = dataSourceType === DataSourceEnum.CLICKHOUSE;
    
    // Priority: Use epoch timestamps (from/to) if provided, otherwise use preset
    if (dto.from && dto.to) {
      // Convert epoch milliseconds to appropriate format
      const fromDate = isClickHouse
        ? this.toClickHouseDateTime(new Date(dto.from))
        : new Date(dto.from).toISOString();
      const toDate = isClickHouse
        ? this.toClickHouseDateTime(new Date(dto.to))
        : new Date(dto.to).toISOString();
      
      // Replace ${fromTime} and ${toTime} placeholders
      sql = sql.replace(/\$\{fromTime\}/g, fromDate);
      sql = sql.replace(/\$\{toTime\}/g, toDate);
      
      // Calculate interval for ${timeRange} placeholder
      const durationMs = dto.to - dto.from;
      const durationHours = durationMs / (60 * 60 * 1000);
      let intervalStr: string;
      
      if (isClickHouse) {
        // ClickHouse INTERVAL syntax
        if (durationHours <= 1) {
          intervalStr = `${Math.round(durationMs / (60 * 1000))} MINUTE`;
        } else if (durationHours <= 24) {
          intervalStr = `${Math.round(durationHours)} HOUR`;
        } else {
          intervalStr = `${Math.round(durationHours / 24)} DAY`;
        }
      } else {
        // PostgreSQL interval syntax
        if (durationHours <= 1) {
          intervalStr = `${Math.round(durationMs / (60 * 1000))} minutes`;
        } else if (durationHours <= 24) {
          intervalStr = `${Math.round(durationHours)} hours`;
        } else {
          intervalStr = `${Math.round(durationHours / 24)} days`;
        }
      }
      sql = sql.replace(/\$\{timeRange\}/g, intervalStr);
    } else if (dto.timeRange) {
      // Legacy: Use preset time range
      const timeRangeMap = isClickHouse ? CLICKHOUSE_TIME_RANGE_MAP : TIME_RANGE_MAP;
      if (timeRangeMap[dto.timeRange]) {
        sql = sql.replace(/\$\{timeRange\}/g, timeRangeMap[dto.timeRange]);
      }
      
      // Also set fromTime/toTime based on preset
      const duration = this.getTimeRangeDuration(dto.timeRange);
      if (duration) {
        const now = new Date();
        const fromDate = isClickHouse
          ? this.toClickHouseDateTime(new Date(now.getTime() - duration))
          : new Date(now.getTime() - duration).toISOString();
        const toDate = isClickHouse
          ? this.toClickHouseDateTime(now)
          : now.toISOString();
        sql = sql.replace(/\$\{fromTime\}/g, fromDate);
        sql = sql.replace(/\$\{toTime\}/g, toDate);
      }
    }

    // Replace owner ID variable
    if (ownerId) {
      sql = sql.replace(/\$\{ownerId\}/g, ownerId);
    } else {
      // Admin user - remove owner filter
      sql = sql.replace(/id_owner\s*=\s*'\$\{ownerId\}'/gi, '1=1');
      sql = sql.replace(/WHERE\s+id_owner\s*=\s*'\$\{ownerId\}'/gi, 'WHERE 1=1');
      sql = sql.replace(/'\$\{ownerId\}'/g, "'00000000-0000-0000-0000-000000000000'");
    }

    // Auto-resolve ${ownerCode} from ownerId lookup
    if (sql.includes('${ownerCode}') && ownerId) {
      const ownerCode = await this.resolveOwnerCode(ownerId);
      if (ownerCode) {
        sql = sql.replace(/\$\{ownerCode\}/g, ownerCode);
      }
    }

    // Replace custom variables
    if (dto.variables) {
      for (const [key, value] of Object.entries(dto.variables)) {
        const placeholder = `\${${key}}`;
        sql = sql.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
      }
    }

    return sql;
  }

  /**
   * Execute query on PostgreSQL
   */
  private async executePostgreSQLQuery(sql: string): Promise<ExecuteQueryResponseDto> {
    const startTime = Date.now();

    try {
      // Set timeout first
      await this.dataSource.query('SET statement_timeout = 30000');
      
      // Execute the query
      const result = await this.dataSource.query(sql);
      const executionTime = Date.now() - startTime;

      // Handle both array and non-array results
      const rows = Array.isArray(result) ? result : [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime
      };
    } catch (error) {
      throw new BadRequestException(`PostgreSQL query failed: ${error.message}`);
    }
  }

  /**
   * Execute query on ClickHouse
   */
  private async executeClickHouseQuery(sql: string): Promise<ExecuteQueryResponseDto> {
    try {
      const result = await this.clickhouseService.executeQuery(sql);
      
      return {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime: result.executionTime
      };
    } catch (error) {
      throw new BadRequestException(`ClickHouse query failed: ${error.message}`);
    }
  }

  // ==========================================
  // QUERY TEMPLATES
  // ==========================================

  async findAllTemplates(ownerId: string): Promise<WidgetQueryTemplate[]> {
    return this.templateRepository.find({
      where: [
        { isSystem: true, isActive: true },
        { idOwner: ownerId, isActive: true }
      ],
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async findTemplateById(id: string): Promise<WidgetQueryTemplate> {
    const template = await this.templateRepository.findOne({
      where: { idTemplate: id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Resolve ownerCode from ownerId with in-memory cache
   */
  private async resolveOwnerCode(ownerId: string): Promise<string | null> {
    // Check cache first
    if (this.ownerCodeCache.has(ownerId)) {
      return this.ownerCodeCache.get(ownerId)!;
    }

    try {
      const owner = await this.ownerRepository.findOne({
        where: { idOwner: ownerId },
        select: ['ownerCode'],
      });
      if (owner?.ownerCode) {
        this.ownerCodeCache.set(ownerId, owner.ownerCode);
        return owner.ownerCode;
      }
    } catch (error) {
      this.logger.warn(`Failed to resolve ownerCode for ${ownerId}: ${error.message}`);
    }
    return null;
  }

  /**
   * Convert a JS Date to ClickHouse-compatible DateTime string: 'YYYY-MM-DD HH:MM:SS'
   */
  private toClickHouseDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }

  private getTimeRangeDuration(preset: string): number | null {
    const durations: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '2d': 2 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    return durations[preset] || null;
  }
}
