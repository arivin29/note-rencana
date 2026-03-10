import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { AnomaliesService } from '../services/anomalies.service';
import {
  QueryAnomaliesDto,
  AcknowledgeAnomalyDto,
  AnomalyResponseDto,
  AnomalySummaryDto,
  CreateAnomalyDto,
  CreateBulkAnomaliesDto,
} from '../dto/anomaly.dto';

@ApiTags('ML - Anomalies')
@Controller('ml/anomalies')
export class AnomaliesController {
  constructor(private readonly anomaliesService: AnomaliesService) {}

  @Get('summary')
  @Public()
  @ApiOperation({ summary: 'Get anomaly statistics summary' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (ISO 8601)' })
  @ApiResponse({ status: 200, type: AnomalySummaryDto })
  getSummary(
    @Query('ownerId') ownerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AnomalySummaryDto> {
    return this.anomaliesService.getSummary({ ownerId, startDate, endDate });
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all anomalies with filters and pagination' })
  @ApiResponse({ status: 200 })
  findAll(@Query() query: QueryAnomaliesDto) {
    return this.anomaliesService.findAll(query);
  }

  @Get('by-sensor/:idSensorChannel')
  @ApiOperation({ summary: 'Get anomalies for a specific sensor channel' })
  @ApiQuery({ name: 'hours', required: false, description: 'Lookback hours (default: 24)' })
  @ApiResponse({ status: 200, type: [AnomalyResponseDto] })
  findBySensorChannel(
    @Param('idSensorChannel', ParseUUIDPipe) idSensorChannel: string,
    @Query('hours') hours?: string,
  ): Promise<AnomalyResponseDto[]> {
    return this.anomaliesService.findBySensorChannel(
      idSensorChannel,
      hours ? parseInt(hours, 10) : 24,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get anomaly by ID' })
  @ApiResponse({ status: 200, type: AnomalyResponseDto })
  @ApiResponse({ status: 404, description: 'Anomaly not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AnomalyResponseDto> {
    return this.anomaliesService.findOne(id);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an anomaly' })
  @ApiResponse({ status: 200, type: AnomalyResponseDto })
  @ApiResponse({ status: 404, description: 'Anomaly not found' })
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeAnomalyDto,
  ): Promise<AnomalyResponseDto> {
    return this.anomaliesService.acknowledge(id, dto);
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a single anomaly from ML detection (used by iot-gtw)' })
  @ApiResponse({ status: 201, description: 'Anomaly created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateAnomalyDto) {
    const anomaly = await this.anomaliesService.create(dto);
    return {
      success: true,
      idAnomalyResult: anomaly.idAnomalyResult,
      anomalyGrade: anomaly.anomalyGrade,
      message: 'Anomaly created successfully',
    };
  }

  @Post('bulk')
  @Public()
  @ApiOperation({ summary: 'Create multiple anomalies in bulk (used by iot-gtw)' })
  @ApiResponse({ status: 201, description: 'Anomalies created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createBulk(@Body() dto: CreateBulkAnomaliesDto) {
    const result = await this.anomaliesService.createBulk(dto);
    return {
      success: true,
      created: result.created,
      message: `${result.created} anomalies created successfully`,
    };
  }
}
