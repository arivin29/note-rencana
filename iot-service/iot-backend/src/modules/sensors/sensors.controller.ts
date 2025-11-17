import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorResponseDto, SensorDetailedResponseDto } from './dto/sensor-response.dto';

@ApiTags('Sensors')
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sensor' })
  @ApiResponse({ status: 201, type: SensorResponseDto })
  create(@Body() createDto: CreateSensorDto): Promise<SensorResponseDto> {
    return this.sensorsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sensors' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'idNode', required: false, type: String })
  @ApiQuery({ name: 'idSensorCatalog', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('idNode') idNode?: string,
    @Query('idSensorCatalog') idSensorCatalog?: string,
  ) {
    return this.sensorsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      idNode,
      idSensorCatalog,
    });
  }

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get aggregated sensor statistics' })
  @ApiResponse({ status: 200 })
  getStatistics() {
    return this.sensorsService.getStatisticsOverview();
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get sensor with channels and calibration status' })
  @ApiResponse({ status: 200, type: SensorDetailedResponseDto })
  findOneDetailed(@Param('id', ParseUUIDPipe) id: string): Promise<SensorDetailedResponseDto> {
    return this.sensorsService.findOneDetailed(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get sensor dashboard data with health status' })
  @ApiResponse({ status: 200 })
  getDashboard(@Param('id', ParseUUIDPipe) id: string) {
    return this.sensorsService.getDashboard(id);
  }

  @Get(':id/channels')
  @ApiOperation({ summary: 'Get all channels for a sensor' })
  @ApiResponse({ status: 200 })
  getChannels(@Param('id', ParseUUIDPipe) id: string) {
    return this.sensorsService.getChannels(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sensor by ID' })
  @ApiResponse({ status: 200, type: SensorResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SensorResponseDto> {
    return this.sensorsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sensor' })
  @ApiResponse({ status: 200, type: SensorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSensorDto,
  ): Promise<SensorResponseDto> {
    return this.sensorsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sensor' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sensorsService.remove(id);
  }
}
