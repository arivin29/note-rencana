import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { TenantKey, TenantOwnerId } from '../decorators/tenant.decorator';
import { TenantApiKey } from '../entities/tenant-api-key.entity';
import { ExternalApiService } from '../services/external-api.service';
import { Public } from '../../../auth/decorators/public.decorator';
import {
  ProjectFilterQueryDto,
  NodeFilterQueryDto,
  SensorFilterQueryDto,
  SensorDataQueryDto,
  SensorDataAggregatedQueryDto,
  AlertFilterQueryDto,
} from '../dto/query.dto';

@ApiTags('Info')
@ApiSecurity('X-API-Key')
@Public()  // Skip JWT auth, this controller uses API Key auth
@UseGuards(ApiKeyGuard)
@Controller('external-api/v1')
export class ExternalApiInfoController {
  private readonly logger = new Logger(ExternalApiInfoController.name);

  constructor(private readonly externalApiService: ExternalApiService) {}

  /**
   * Get tenant info and API key status
   */
  @Get('info')
  @ApiOperation({
    summary: 'Get tenant info',
    description: 'Get information about the tenant and API key status',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Info retrieved successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid API key' })
  async getInfo(
    @TenantKey() apiKey: TenantApiKey,
    @TenantOwnerId() ownerId: string,
  ) {
    return this.externalApiService.getTenantInfo(apiKey, ownerId);
  }
}

@ApiTags('Projects')
@ApiSecurity('X-API-Key')
@Public()  // Skip JWT auth, this controller uses API Key auth
@UseGuards(ApiKeyGuard)
@Controller('external-api/v1/projects')
export class ExternalApiProjectsController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get()
  @ApiOperation({
    summary: 'List projects',
    description: 'Get all projects belonging to the tenant',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Projects retrieved successfully' })
  async getProjects(
    @TenantOwnerId() ownerId: string,
    @Query() query: ProjectFilterQueryDto,
  ) {
    return this.externalApiService.getProjects(ownerId, query);
  }
}

@ApiTags('Nodes')
@ApiSecurity('X-API-Key')
@Public()  // Skip JWT auth, this controller uses API Key auth
@UseGuards(ApiKeyGuard)
@Controller('external-api/v1/nodes')
export class ExternalApiNodesController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get()
  @ApiOperation({
    summary: 'List nodes',
    description: 'Get all nodes/devices belonging to the tenant',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Nodes retrieved successfully' })
  async getNodes(
    @TenantOwnerId() ownerId: string,
    @Query() query: NodeFilterQueryDto,
  ) {
    return this.externalApiService.getNodes(ownerId, query);
  }

  @Get(':nodeId')
  @ApiOperation({
    summary: 'Get node detail',
    description: 'Get detailed information about a specific node including its sensors',
  })
  @ApiParam({ name: 'nodeId', description: 'Node ID (UUID)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Node retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Node not found' })
  async getNodeDetail(
    @TenantOwnerId() ownerId: string,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ) {
    return this.externalApiService.getNodeDetail(ownerId, nodeId);
  }
}

@ApiTags('Sensors')
@ApiSecurity('X-API-Key')
@Public()  // Skip JWT auth, this controller uses API Key auth
@UseGuards(ApiKeyGuard)
@Controller('external-api/v1/sensors')
export class ExternalApiSensorsController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get()
  @ApiOperation({
    summary: 'List sensors',
    description: 'Get all sensors belonging to the tenant',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sensors retrieved successfully' })
  async getSensors(
    @TenantOwnerId() ownerId: string,
    @Query() query: SensorFilterQueryDto,
  ) {
    return this.externalApiService.getSensors(ownerId, query);
  }
}

@ApiTags('Sensor Data')
@ApiSecurity('X-API-Key')
@Public()  // Skip JWT auth, this controller uses API Key auth
@UseGuards(ApiKeyGuard)
@Controller('external-api/v1/sensor-data')
export class ExternalApiSensorDataController {
  private readonly logger = new Logger(ExternalApiSensorDataController.name);

  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get()
  @ApiOperation({
    summary: 'Query sensor data',
    description: 'Get telemetry data with filters. startDate and endDate are required. Max range: 7 days.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sensor data retrieved successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid date range' })
  async getSensorData(
    @TenantOwnerId() ownerId: string,
    @Query() query: SensorDataQueryDto,
  ) {
    return this.externalApiService.getSensorData(ownerId, query);
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Get latest sensor values',
    description: 'Get the most recent value for all sensors/channels',
  })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'nodeId', required: false, type: String })
  @ApiQuery({ name: 'sensorId', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Latest values retrieved successfully' })
  async getLatestValues(
    @TenantOwnerId() ownerId: string,
    @Query('projectId') projectId?: string,
    @Query('nodeId') nodeId?: string,
    @Query('sensorId') sensorId?: string,
  ) {
    return this.externalApiService.getLatestSensorData(ownerId, { projectId, nodeId, sensorId });
  }

  @Get('aggregated')
  @ApiOperation({
    summary: 'Get aggregated sensor data',
    description: 'Get aggregated data (avg, min, max, sum, count) per time interval',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Aggregated data retrieved successfully' })
  async getAggregatedData(
    @TenantOwnerId() ownerId: string,
    @Query() query: SensorDataAggregatedQueryDto,
  ) {
    return this.externalApiService.getAggregatedSensorData(ownerId, query);
  }
}

@ApiTags('Alerts')
@ApiSecurity('X-API-Key')
@Public()  // Skip JWT auth, this controller uses API Key auth
@UseGuards(ApiKeyGuard)
@Controller('external-api/v1/alerts')
export class ExternalApiAlertsController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get()
  @ApiOperation({
    summary: 'List alerts',
    description: 'Get alert events for the tenant',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alerts retrieved successfully' })
  async getAlerts(
    @TenantOwnerId() ownerId: string,
    @Query() query: AlertFilterQueryDto,
  ) {
    return this.externalApiService.getAlerts(ownerId, query);
  }
}
