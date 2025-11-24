import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { IotLogsService } from './iot-logs.service';
import {
  IotLogStatsDto,
  IotLogFilterDto,
  IotLogResponseDto,
} from './dto';

@ApiTags('IoT Logs')
@Controller('iot-logs')
export class IotLogsController {
  constructor(private readonly iotLogsService: IotLogsService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get IoT logs statistics',
    description:
      'Get aggregated statistics of IoT logs including total, processed, unprocessed counts and breakdown by label. Supports filtering by device, owner, project, label, and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: IotLogStatsDto,
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    description: 'Filter by device ID (node code)',
    example: 'NODE-001',
  })
  @ApiQuery({
    name: 'ownerId',
    required: false,
    description: 'Filter by owner ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiQuery({
    name: 'label',
    required: false,
    enum: ['telemetry', 'event', 'pairing', 'error', 'warning', 'command', 'response', 'debug', 'info', 'log'],
    description: 'Filter by log label/category',
  })
  @ApiQuery({
    name: 'processed',
    required: false,
    type: Boolean,
    description: 'Filter by processed status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2025-11-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO 8601 format)',
    example: '2025-11-23T23:59:59.999Z',
  })
  async getStats(@Query() filters: IotLogFilterDto): Promise<IotLogStatsDto> {
    return this.iotLogsService.getStats(filters);
  }

  @Get()
  @ApiOperation({
    summary: 'Get IoT logs list',
    description:
      'Get paginated list of IoT logs with optional filters. Includes relations to node, project, and owner.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs retrieved successfully',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 100)',
    example: 100,
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    description: 'Filter by device ID (node code)',
    example: 'NODE-001',
  })
  @ApiQuery({
    name: 'ownerId',
    required: false,
    description: 'Filter by owner ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiQuery({
    name: 'label',
    required: false,
    enum: ['telemetry', 'event', 'pairing', 'error', 'warning', 'command', 'response', 'debug', 'info', 'log'],
    description: 'Filter by log label/category',
  })
  @ApiQuery({
    name: 'processed',
    required: false,
    type: Boolean,
    description: 'Filter by processed status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2025-11-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO 8601 format)',
    example: '2025-11-23T23:59:59.999Z',
  })
  async findAll(
    @Query() filters: IotLogFilterDto,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 100,
  ): Promise<{
    data: IotLogResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.iotLogsService.findAll(filters, page, limit);
  }
}
