import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SensorChannelsService } from './sensor-channels.service';
import { CreateSensorChannelDto } from './dto/create-sensor-channel.dto';
import { UpdateSensorChannelDto } from './dto/update-sensor-channel.dto';
import { SensorChannelResponseDto, SensorChannelDetailedResponseDto } from './dto/sensor-channel-response.dto';

@ApiTags('Sensor Channels')
@Controller('sensor-channels')
export class SensorChannelsController {
  constructor(private readonly sensorChannelsService: SensorChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sensor channel' })
  @ApiResponse({ status: 201, type: SensorChannelResponseDto })
  create(@Body() createDto: CreateSensorChannelDto): Promise<SensorChannelResponseDto> {
    return this.sensorChannelsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sensor channels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'idSensor', required: false, type: String })
  @ApiQuery({ name: 'idSensorType', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('idSensor') idSensor?: string,
    @Query('idSensorType') idSensorType?: string,
  ) {
    return this.sensorChannelsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      idSensor,
      idSensorType,
    });
  }

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get aggregated sensor channel statistics' })
  @ApiResponse({ status: 200, description: 'Sensor channel statistics overview' })
  getStatistics() {
    return this.sensorChannelsService.getStatisticsOverview();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sensor channel by ID' })
  @ApiResponse({ status: 200, type: SensorChannelResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SensorChannelResponseDto> {
    return this.sensorChannelsService.findOne(id);
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get sensor channel with latest values and stats' })
  @ApiResponse({ status: 200, type: SensorChannelDetailedResponseDto })
  findOneDetailed(@Param('id', ParseUUIDPipe) id: string): Promise<SensorChannelDetailedResponseDto> {
    return this.sensorChannelsService.findOneDetailed(id);
  }

  @Get(':id/readings')
  @ApiOperation({ summary: 'Get time-series readings for sensor channel' })
  @ApiQuery({ name: 'startTime', required: false, type: String, description: 'ISO 8601 timestamp' })
  @ApiQuery({ name: 'endTime', required: false, type: String, description: 'ISO 8601 timestamp' })
  @ApiQuery({ name: 'aggregation', required: false, type: String, description: 'raw|5m|15m|1h' })
  @ApiResponse({ status: 200, description: 'Time-series data with statistics' })
  getReadings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('aggregation') aggregation?: string,
  ) {
    return this.sensorChannelsService.getReadings(id, startTime, endTime, aggregation);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sensor channel' })
  @ApiResponse({ status: 200, type: SensorChannelResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSensorChannelDto,
  ): Promise<SensorChannelResponseDto> {
    return this.sensorChannelsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sensor channel' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sensorChannelsService.remove(id);
  }
}
