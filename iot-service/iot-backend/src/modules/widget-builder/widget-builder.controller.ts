import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WidgetBuilderService } from './widget-builder.service';
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
  CustomDashboardResponseDto,
  CustomWidgetResponseDto
} from './dto';

@ApiTags('Widget Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('widget-builder')
export class WidgetBuilderController {
  constructor(
    private readonly widgetBuilderService: WidgetBuilderService,
    private readonly clickhouseService: ClickhouseService,
  ) {}

  // ==========================================
  // DASHBOARD ENDPOINTS
  // ==========================================

  @Get('dashboards')
  @ApiOperation({ summary: 'Get all dashboards for current owner' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiResponse({ status: 200, description: 'List of dashboards', type: [CustomDashboardResponseDto] })
  async getDashboards(
    @Request() req,
    @Query('projectId') projectId?: string
  ): Promise<CustomDashboardResponseDto[]> {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.findAllDashboards(ownerId, isAdmin, projectId);
  }

  @Get('projects/:projectId/dashboards')
  @ApiOperation({ summary: 'Get dashboards for a specific project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of project dashboards', type: [CustomDashboardResponseDto] })
  async getDashboardsByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Request() req
  ): Promise<CustomDashboardResponseDto[]> {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.findDashboardsByProject(projectId, ownerId, isAdmin);
  }

  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get dashboard by ID with widgets' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard with widgets', type: CustomDashboardResponseDto })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async getDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req
  ): Promise<CustomDashboardResponseDto> {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.findDashboardById(id, ownerId, isAdmin);
  }

  @Post('dashboards')
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created', type: CustomDashboardResponseDto })
  async createDashboard(
    @Body() dto: CreateCustomDashboardDto,
    @Request() req
  ): Promise<CustomDashboardResponseDto> {
    const ownerId = req.user.idOwner;
    const userId = req.user.idUser;
    return this.widgetBuilderService.createDashboard(dto, ownerId, userId);
  }

  @Put('dashboards/:id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard updated', type: CustomDashboardResponseDto })
  async updateDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomDashboardDto,
    @Request() req
  ): Promise<CustomDashboardResponseDto> {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.updateDashboard(id, dto, ownerId, isAdmin);
  }

  @Delete('dashboards/:id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async deleteDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req
  ) {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    await this.widgetBuilderService.deleteDashboard(id, ownerId, isAdmin);
    return { message: 'Dashboard deleted successfully' };
  }

  // ==========================================
  // WIDGET ENDPOINTS
  // ==========================================

  @Get('dashboards/:dashboardId/widgets')
  @ApiOperation({ summary: 'Get all widgets for a dashboard' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'List of widgets', type: [CustomWidgetResponseDto] })
  async getWidgets(
    @Param('dashboardId', ParseUUIDPipe) dashboardId: string,
    @Request() req
  ): Promise<CustomWidgetResponseDto[]> {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.findWidgetsByDashboard(dashboardId, ownerId, isAdmin);
  }

  @Get('dashboards/:dashboardId/widgets/:widgetId')
  @ApiOperation({ summary: 'Get widget by ID' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiParam({ name: 'widgetId', description: 'Widget ID' })
  @ApiResponse({ status: 200, description: 'Widget details', type: CustomWidgetResponseDto })
  async getWidget(
    @Param('dashboardId', ParseUUIDPipe) dashboardId: string,
    @Param('widgetId', ParseUUIDPipe) widgetId: string,
    @Request() req
  ): Promise<CustomWidgetResponseDto> {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.findWidgetById(widgetId, dashboardId, ownerId, isAdmin);
  }

  @Post('dashboards/:dashboardId/widgets')
  @ApiOperation({ summary: 'Create a new widget' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiResponse({ status: 201, description: 'Widget created', type: CustomWidgetResponseDto })
  async createWidget(
    @Param('dashboardId', ParseUUIDPipe) dashboardId: string,
    @Body() dto: CreateWidgetDto,
    @Request() req
  ): Promise<CustomWidgetResponseDto> {
    const ownerId = req.user.idOwner;
    const userId = req.user.idUser;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.createWidget(dashboardId, dto, ownerId, userId, isAdmin);
  }

  @Put('dashboards/:dashboardId/widgets/:widgetId')
  @ApiOperation({ summary: 'Update widget' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiParam({ name: 'widgetId', description: 'Widget ID' })
  @ApiResponse({ status: 200, description: 'Widget updated', type: CustomWidgetResponseDto })
  async updateWidget(
    @Param('dashboardId', ParseUUIDPipe) dashboardId: string,
    @Param('widgetId', ParseUUIDPipe) widgetId: string,
    @Body() dto: UpdateWidgetDto,
    @Request() req
  ): Promise<CustomWidgetResponseDto> {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    return this.widgetBuilderService.updateWidget(widgetId, dashboardId, dto, ownerId, isAdmin);
  }

  @Patch('dashboards/:dashboardId/widgets/positions')
  @ApiOperation({ summary: 'Batch update widget positions' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Positions updated' })
  async updateWidgetPositions(
    @Param('dashboardId', ParseUUIDPipe) dashboardId: string,
    @Body() dto: UpdateWidgetPositionsDto,
    @Request() req
  ) {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    await this.widgetBuilderService.updateWidgetPositions(dashboardId, dto, ownerId, isAdmin);
    return { message: 'Widget positions updated successfully' };
  }

  @Delete('dashboards/:dashboardId/widgets/:widgetId')
  @ApiOperation({ summary: 'Delete widget' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiParam({ name: 'widgetId', description: 'Widget ID' })
  @ApiResponse({ status: 200, description: 'Widget deleted' })
  async deleteWidget(
    @Param('dashboardId', ParseUUIDPipe) dashboardId: string,
    @Param('widgetId', ParseUUIDPipe) widgetId: string,
    @Request() req
  ) {
    const ownerId = req.user.idOwner;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'ADMIN';
    await this.widgetBuilderService.deleteWidget(widgetId, dashboardId, ownerId, isAdmin);
    return { message: 'Widget deleted successfully' };
  }

  // ==========================================
  // QUERY ENDPOINTS
  // ==========================================

  @Get('datasources')
  @ApiOperation({ summary: 'Get available data sources' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of available data sources',
    schema: {
      type: 'object',
      properties: {
        postgresql: { type: 'object', properties: { available: { type: 'boolean' }, name: { type: 'string' } } },
        clickhouse: { type: 'object', properties: { available: { type: 'boolean' }, name: { type: 'string' }, status: { type: 'string' } } }
      }
    }
  })
  async getDataSources() {
    const clickhouseHealth = await this.clickhouseService.healthCheck();
    return {
      postgresql: {
        available: true,
        name: 'PostgreSQL',
        description: 'Relational database for real-time and transactional data'
      },
      clickhouse: {
        available: this.clickhouseService.isAvailable(),
        name: 'ClickHouse',
        description: 'Column-oriented database for time-series analytics',
        status: clickhouseHealth.status,
        latency: clickhouseHealth.latency
      }
    };
  }

  @Post('query/validate')
  @ApiOperation({ summary: 'Validate SQL query' })
  @ApiResponse({ status: 200, description: 'Validation result', type: ValidateQueryResponseDto })
  validateQuery(@Body() dto: ValidateQueryDto): ValidateQueryResponseDto {
    return this.widgetBuilderService.validateQuery(dto);
  }

  @Post('query/execute')
  @ApiOperation({ summary: 'Execute SQL query and return results' })
  @ApiResponse({ status: 200, description: 'Query results', type: ExecuteQueryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  async executeQuery(
    @Body() dto: ExecuteQueryDto,
    @Request() req
  ): Promise<ExecuteQueryResponseDto> {
    const ownerId = req.user.idOwner;
    return this.widgetBuilderService.executeQuery(dto, ownerId);
  }

  // ==========================================
  // TEMPLATE ENDPOINTS
  // ==========================================

  @Get('templates')
  @ApiOperation({ summary: 'Get query templates' })
  @ApiResponse({ status: 200, description: 'List of query templates' })
  async getTemplates(@Request() req) {
    const ownerId = req.user.idOwner;
    return this.widgetBuilderService.findAllTemplates(ownerId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.widgetBuilderService.findTemplateById(id);
  }
}
