import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OwnersService } from './owners.service';
import {
  CreateOwnerDto,
  UpdateOwnerDto,
  OwnerResponseDto,
  OwnerDetailResponseDto,
  OwnerStatisticsResponseDto,
  OwnerDashboardResponseDto,
  OwnerWidgetsResponseDto,
  OwnerQueryDto,
} from './dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@ApiTags('Owners')
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  // ============================================
  // STANDARD CRUD OPERATIONS
  // ============================================

  @Post()
  @ApiOperation({ 
    summary: 'Create a new owner',
    description: 'Creates a new owner entity with the provided data'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Owner successfully created',
    type: OwnerResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOwnerDto: CreateOwnerDto): Promise<OwnerResponseDto> {
    return this.ownersService.create(createOwnerDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all owners with pagination',
    description: 'Retrieves a paginated list of owners with advanced filtering, searching and sorting'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of owners retrieved successfully',
    type: PaginatedResponseDto 
  })
  async findAll(@Query() query: OwnerQueryDto): Promise<PaginatedResponseDto<OwnerResponseDto>> {
    return this.ownersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get owner by ID (basic info)',
    description: 'Retrieves basic owner information without nested relations'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Owner found',
    type: OwnerResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  async findOne(@Param('id') id: string): Promise<OwnerResponseDto> {
    return this.ownersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update owner',
    description: 'Updates an existing owner with the provided data'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Owner successfully updated',
    type: OwnerResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id') id: string,
    @Body() updateOwnerDto: UpdateOwnerDto,
  ): Promise<OwnerResponseDto> {
    return this.ownersService.update(id, updateOwnerDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete owner',
    description: 'Permanently deletes an owner and all related data (cascade)'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiResponse({ status: 204, description: 'Owner successfully deleted' })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.ownersService.remove(id);
  }

  // ============================================
  // NESTED DATA ENDPOINTS (Type 2)
  // ============================================

  @Get(':id/detail')
  @ApiOperation({ 
    summary: 'Get owner with full details',
    description: 'Retrieves owner with all nested relations (projects, node assignments, statistics)'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Owner details with nested data',
    type: OwnerDetailResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  async findOneDetailed(@Param('id') id: string): Promise<OwnerDetailResponseDto> {
    return this.ownersService.findOneWithDetails(id);
  }

  @Get(':id/projects')
  @ApiOperation({ 
    summary: 'Get all projects for an owner',
    description: 'Retrieves all projects belonging to the specified owner with node counts'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiResponse({ status: 200, description: 'List of owner projects' })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  async getOwnerProjects(@Param('id') id: string) {
    return this.ownersService.getOwnerProjects(id);
  }

  @Get(':id/nodes')
  @ApiOperation({ 
    summary: 'Get all nodes for an owner',
    description: 'Retrieves all nodes from all projects belonging to the owner'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiResponse({ status: 200, description: 'List of owner nodes with project info' })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  async getOwnerNodes(@Param('id') id: string) {
    return this.ownersService.getOwnerNodes(id);
  }

  // ============================================
  // AGGREGATION & REPORTS (Type 3)
  // ============================================

  @Get('statistics/overview')
  @ApiOperation({ 
    summary: 'Get aggregated statistics',
    description: 'Retrieves comprehensive statistics across all owners (industry distribution, SLA levels, top owners)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Aggregated statistics',
    type: OwnerStatisticsResponseDto 
  })
  async getStatistics(): Promise<OwnerStatisticsResponseDto> {
    return this.ownersService.getStatistics();
  }

  @Get(':id/dashboard')
  @ApiOperation({ 
    summary: 'Get dashboard data for owner',
    description: 'Retrieves dashboard-ready data including summary, recent projects, alerts, and performance metrics'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Owner dashboard data',
    type: OwnerDashboardResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  async getOwnerDashboard(@Param('id') id: string): Promise<OwnerDashboardResponseDto> {
    return this.ownersService.getOwnerDashboard(id);
  }

  @Get(':id/reports/monthly')
  @ApiOperation({ 
    summary: 'Get monthly report for owner',
    description: 'Generates a detailed monthly report with metrics, alerts, and compliance data'
  })
  @ApiParam({ name: 'id', description: 'Owner UUID' })
  @ApiQuery({ name: 'year', required: true, type: Number, description: 'Year (e.g., 2025)' })
  @ApiQuery({ name: 'month', required: true, type: Number, description: 'Month (1-12)' })
  @ApiResponse({ status: 200, description: 'Monthly report data' })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  async getMonthlyReport(
    @Param('id') id: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.ownersService.getMonthlyReport(id, +year, +month);
  }

  @Get('reports/widgets')
  @ApiOperation({ 
    summary: 'Get data for dashboard widgets',
    description: 'Retrieves aggregated data optimized for dashboard widgets (charts, gauges, counters)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Widget-ready data',
    type: OwnerWidgetsResponseDto 
  })
  async getWidgetsData(): Promise<OwnerWidgetsResponseDto> {
    return this.ownersService.getWidgetsData();
  }
}
