import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CustomDashboard } from '../../entities/custom-dashboard.entity';
import { CustomWidget } from '../../entities/custom-widget.entity';
import { WidgetQueryTemplate } from '../../entities/widget-query-template.entity';
import { 
  CreateCustomDashboardDto, 
  UpdateCustomDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UpdateWidgetPositionsDto,
  ExecuteQueryDto,
  ValidateQueryDto,
  ExecuteQueryResponseDto,
  ValidateQueryResponseDto
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

@Injectable()
export class WidgetBuilderService {
  constructor(
    @InjectRepository(CustomDashboard)
    private dashboardRepository: Repository<CustomDashboard>,
    @InjectRepository(CustomWidget)
    private widgetRepository: Repository<CustomWidget>,
    @InjectRepository(WidgetQueryTemplate)
    private templateRepository: Repository<WidgetQueryTemplate>,
    private dataSource: DataSource,
  ) {}

  // ==========================================
  // DASHBOARD CRUD
  // ==========================================

  async findAllDashboards(ownerId: string, isAdmin = false): Promise<CustomDashboard[]> {
    // Admin can see all dashboards
    if (isAdmin) {
      return this.dashboardRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    }
    
    return this.dashboardRepository.find({
      where: { idOwner: ownerId, isActive: true },
      order: { createdAt: 'DESC' },
    });
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

    // Replace time range variable
    let sql = dto.sql;
    if (dto.timeRange && TIME_RANGE_MAP[dto.timeRange]) {
      sql = sql.replace(/\$\{timeRange\}/g, TIME_RANGE_MAP[dto.timeRange]);
    }

    // Replace owner ID variable
    // For admin users (no ownerId), we need to handle this specially
    if (ownerId) {
      sql = sql.replace(/\$\{ownerId\}/g, ownerId);
    } else {
      // Admin user - remove owner filter or use a pattern that selects all
      // Option 1: Replace with a condition that's always true for UUID columns
      // This handles WHERE id_owner = '${ownerId}' case
      sql = sql.replace(/id_owner\s*=\s*'\$\{ownerId\}'/gi, '1=1');
      // Also handle IN (SELECT ... WHERE id_owner = '${ownerId}')
      sql = sql.replace(/WHERE\s+id_owner\s*=\s*'\$\{ownerId\}'/gi, 'WHERE 1=1');
      // Clean up any remaining ${ownerId} placeholders
      sql = sql.replace(/'\$\{ownerId\}'/g, "'00000000-0000-0000-0000-000000000000'");
    }

    // Replace custom variables
    if (dto.variables) {
      for (const [key, value] of Object.entries(dto.variables)) {
        const placeholder = `\${${key}}`;
        sql = sql.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
      }
    }

    const startTime = Date.now();

    try {
      // Set timeout first
      await this.dataSource.query('SET statement_timeout = 30000');
      
      // Then execute the actual query
      const result = await this.dataSource.query(sql);

      const executionTime = Date.now() - startTime;

      // Handle both array and non-array results
      const rows = Array.isArray(result) ? result : [];
      
      // Get columns from first row
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime
      };
    } catch (error) {
      throw new BadRequestException(`Query execution failed: ${error.message}`);
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
}
