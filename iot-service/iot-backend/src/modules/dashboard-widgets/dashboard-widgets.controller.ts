import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardWidgetsService } from './dashboard-widgets.service';
import { CreateDashboardWidgetDto } from './dto/create-dashboard-widget.dto';
import { UpdateDashboardWidgetDto } from './dto/update-dashboard-widget.dto';
import { DashboardWidgetResponseDto } from './dto/dashboard-widget-response.dto';

@ApiTags('Dashboard Widgets')
@Controller('dashboard-widgets')
export class DashboardWidgetsController {
  constructor(private readonly dashboardWidgetsService: DashboardWidgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new widget' })
  @ApiResponse({ status: 201, type: DashboardWidgetResponseDto })
  create(@Body() createDto: CreateDashboardWidgetDto): Promise<DashboardWidgetResponseDto> {
    return this.dashboardWidgetsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all widgets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'idDashboard', required: false, type: String })
  @ApiQuery({ name: 'widgetType', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idDashboard') idDashboard?: string,
    @Query('widgetType') widgetType?: string,
  ) {
    return this.dashboardWidgetsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      idDashboard,
      widgetType,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get widget by ID' })
  @ApiResponse({ status: 200, type: DashboardWidgetResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DashboardWidgetResponseDto> {
    return this.dashboardWidgetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update widget' })
  @ApiResponse({ status: 200, type: DashboardWidgetResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDashboardWidgetDto,
  ): Promise<DashboardWidgetResponseDto> {
    return this.dashboardWidgetsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete widget' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.dashboardWidgetsService.remove(id);
  }
}
