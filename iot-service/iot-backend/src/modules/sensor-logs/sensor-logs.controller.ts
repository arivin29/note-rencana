import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SensorLogsService } from './sensor-logs.service';
import {
  CreateSensorLogDto,
  BulkCreateSensorLogsDto,
  GetSensorLogsQueryDto,
  GetTelemetryTrendsQueryDto,
} from './dto/create-sensor-log.dto';
import {
  SensorLogResponseDto,
  SensorLogListResponseDto,
  SensorLogStatisticsDto,
  SensorLogTelemetryTrendsResponseDto,
} from './dto/sensor-log-response.dto';

@ApiTags('Sensor Logs')
@Controller('sensor-logs')
export class SensorLogsController {
  constructor(private readonly sensorLogsService: SensorLogsService) {}

  /**
   * Create a single sensor log
   */
  @Post()
  @ApiOperation({
    summary: 'Create a single sensor log entry',
    description: 'Insert a new telemetry log record into the database',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Sensor log created successfully',
    type: SensorLogResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async create(@Body() createDto: CreateSensorLogDto): Promise<SensorLogResponseDto> {
    return this.sensorLogsService.create(createDto);
  }

  /**
   * Bulk create sensor logs
   */
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create sensor logs',
    description: 'Insert multiple telemetry log records in a single transaction (batch ingestion)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Sensor logs created successfully',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'number', example: 100 },
        logs: { type: 'array', items: { $ref: '#/components/schemas/SensorLogResponseDto' } },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async bulkCreate(@Body() bulkDto: BulkCreateSensorLogsDto) {
    return this.sensorLogsService.bulkCreate(bulkDto);
  }

  /**
   * Get sensor logs with filters and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get sensor logs list',
    description: 'Retrieve sensor logs with filtering, pagination, and sorting. Supports filtering by channel, sensor, node, project, owner, quality, source, and time range.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sensor logs retrieved successfully',
    type: SensorLogListResponseDto,
  })
  async findAll(@Query() query: GetSensorLogsQueryDto): Promise<SensorLogListResponseDto> {
    return this.sensorLogsService.findAll(query);
  }

  /**
   * Get telemetry trends for a node (for charts/visualization)
   */
  @Get('telemetry/trends/:nodeId')
  @ApiOperation({
    summary: 'Get telemetry trends for a node',
    description: 'Retrieve time-series telemetry data for all or specific channels of a node. Used for chart visualization. Returns data points grouped by channel with statistics.',
  })
  @ApiParam({
    name: 'nodeId',
    description: 'The UUID of the node',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Telemetry trends retrieved successfully',
    type: SensorLogTelemetryTrendsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Node not found' })
  async getTelemetryTrends(
    @Param('nodeId') nodeId: string,
    @Query() query: GetTelemetryTrendsQueryDto,
  ): Promise<SensorLogTelemetryTrendsResponseDto> {
    return this.sensorLogsService.getTelemetryTrends(nodeId, query);
  }

  /**
   * Get sensor logs statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get sensor logs statistics',
    description: 'Retrieve aggregated statistics including total logs, distribution by quality/source, recent activity, and top channels',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: SensorLogStatisticsDto,
  })
  async getStatistics(): Promise<SensorLogStatisticsDto> {
    return this.sensorLogsService.getStatistics();
  }

  /**
   * Get single sensor log by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get sensor log by ID',
    description: 'Retrieve a single sensor log record by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the sensor log',
    example: '12345',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sensor log retrieved successfully',
    type: SensorLogResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Sensor log not found' })
  async findOne(@Param('id') id: string): Promise<SensorLogResponseDto> {
    return this.sensorLogsService.findOne(id);
  }

  /**
   * Delete old sensor logs (cleanup/archival)
   */
  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete old sensor logs',
    description: 'Remove sensor logs older than specified days (for data retention/cleanup)',
  })
  @ApiQuery({
    name: 'daysToKeep',
    description: 'Number of days to keep (logs older than this will be deleted)',
    example: 90,
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Old logs deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'number', example: 1500 },
      },
    },
  })
  async deleteOldLogs(@Query('daysToKeep') daysToKeep: number) {
    return this.sensorLogsService.deleteOldLogs(daysToKeep);
  }
}
