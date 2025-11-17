import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { KpiStatsResponseDto } from './dto/kpi-stats-response.dto';
import { NodeHealthResponseDto } from './dto/node-health-response.dto';
import { OwnerLeaderboardResponseDto } from './dto/owner-leaderboard-response.dto';
import { ActivityLogResponseDto } from './dto/activity-log-response.dto';
import { TelemetryStreamsResponseDto } from './dto/telemetry-streams-response.dto';
import { DeliveryHealthResponseDto } from './dto/delivery-health-response.dto';
import { AlertStreamResponseDto } from './dto/alert-stream-response.dto';
import { ReleaseScheduleResponseDto } from './dto/release-schedule-response.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('platform-stats')
  @ApiOperation({
    summary: 'Get platform statistics',
    description: 'Retrieve combined statistics for owners, projects, nodes, and sensors'
  })
  @ApiResponse({ status: 200, description: 'Platform statistics retrieved successfully' })
  async getPlatformStats(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getPlatformStats(filters);
  }

  @Get('kpi-stats')
  @ApiOperation({
    summary: 'Get KPI statistics',
    description: 'Retrieve aggregated KPI metrics including nodes online, active alerts, telemetry rate, and forwarded payloads'
  })
  @ApiResponse({ status: 200, description: 'KPI statistics retrieved successfully', type: KpiStatsResponseDto })
  async getKpiStats(@Query() filters: DashboardFiltersDto): Promise<KpiStatsResponseDto> {
    return this.dashboardService.getKpiStats(filters);
  }

  @Get('node-health')
  @ApiOperation({ 
    summary: 'Get node health snapshot',
    description: 'Retrieve top impacted nodes with health status, battery level, and last seen information'
  })
  @ApiResponse({ status: 200, description: 'Node health data retrieved successfully', type: NodeHealthResponseDto })
  async getNodeHealth(@Query() filters: DashboardFiltersDto): Promise<NodeHealthResponseDto> {
    return this.dashboardService.getNodeHealth(filters);
  }

  @Get('owner-leaderboard')
  @ApiOperation({ 
    summary: 'Get owner leaderboard',
    description: 'Retrieve top owners ranked by telemetry throughput, with node counts and alert statistics'
  })
  @ApiResponse({ status: 200, description: 'Owner leaderboard retrieved successfully', type: OwnerLeaderboardResponseDto })
  async getOwnerLeaderboard(@Query() filters: DashboardFiltersDto): Promise<OwnerLeaderboardResponseDto> {
    return this.dashboardService.getOwnerLeaderboard(filters);
  }

  @Get('activity-log')
  @ApiOperation({ 
    summary: 'Get activity log',
    description: 'Retrieve recent system activities including webhook executions, alert triggers, and node status changes'
  })
  @ApiResponse({ status: 200, description: 'Activity log retrieved successfully', type: ActivityLogResponseDto })
  async getActivityLog(@Query() filters: DashboardFiltersDto): Promise<ActivityLogResponseDto> {
    return this.dashboardService.getActivityLog(filters);
  }

  @Get('telemetry-streams')
  @ApiOperation({ 
    summary: 'Get telemetry streams',
    description: 'Retrieve hourly telemetry data for flow and pressure channels with ingestion and forwarding statistics'
  })
  @ApiResponse({ status: 200, description: 'Telemetry streams retrieved successfully', type: TelemetryStreamsResponseDto })
  async getTelemetryStreams(@Query() filters: DashboardFiltersDto): Promise<TelemetryStreamsResponseDto> {
    return this.dashboardService.getTelemetryStreams(filters);
  }

  @Get('delivery-health')
  @ApiOperation({ 
    summary: 'Get delivery health',
    description: 'Retrieve webhook and database forwarding health status with success rates and last sync times'
  })
  @ApiResponse({ status: 200, description: 'Delivery health retrieved successfully', type: DeliveryHealthResponseDto })
  async getDeliveryHealth(@Query() filters: DashboardFiltersDto): Promise<DeliveryHealthResponseDto> {
    return this.dashboardService.getDeliveryHealth(filters);
  }

  @Get('alert-stream')
  @ApiOperation({ 
    summary: 'Get alert stream',
    description: 'Retrieve latest active alerts with severity levels and affected sensors'
  })
  @ApiResponse({ status: 200, description: 'Alert stream retrieved successfully', type: AlertStreamResponseDto })
  async getAlertStream(@Query() filters: DashboardFiltersDto): Promise<AlertStreamResponseDto> {
    return this.dashboardService.getAlertStream(filters);
  }

  @Get('release-schedule')
  @ApiOperation({ 
    summary: 'Get release schedule',
    description: 'Retrieve next scheduled firmware/maintenance release window'
  })
  @ApiResponse({ status: 200, description: 'Release schedule retrieved successfully', type: ReleaseScheduleResponseDto })
  async getReleaseSchedule(): Promise<ReleaseScheduleResponseDto> {
    return this.dashboardService.getReleaseSchedule();
  }
}
