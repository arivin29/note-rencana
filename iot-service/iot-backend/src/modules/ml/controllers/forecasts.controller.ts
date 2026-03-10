import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ForecastsService } from '../services/forecasts.service';
import { QueryForecastsDto, ForecastResponseDto } from '../dto/forecast.dto';

@ApiTags('ML - Forecasts')
@Controller('ml/forecasts')
export class ForecastsController {
  constructor(private readonly forecastsService: ForecastsService) {}

  @Get('channels')
  @ApiOperation({ summary: 'Get sensor channels with available forecasts' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiResponse({ status: 200 })
  getAvailableChannels(@Query('ownerId') ownerId?: string) {
    return this.forecastsService.getAvailableChannels(ownerId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all forecasts with filters' })
  @ApiResponse({ status: 200 })
  findAll(@Query() query: QueryForecastsDto) {
    return this.forecastsService.findAll(query);
  }

  @Get('latest/:idSensorChannel')
  @ApiOperation({ summary: 'Get latest forecast for a sensor channel' })
  @ApiResponse({ status: 200, type: ForecastResponseDto })
  findLatest(
    @Param('idSensorChannel', ParseUUIDPipe) idSensorChannel: string,
  ): Promise<ForecastResponseDto | null> {
    return this.forecastsService.findLatest(idSensorChannel);
  }

  @Get('range/:idSensorChannel')
  @ApiOperation({ summary: 'Get forecast data for a specific time range' })
  @ApiQuery({ name: 'startTime', required: true, description: 'Start time (ISO 8601)' })
  @ApiQuery({ name: 'endTime', required: true, description: 'End time (ISO 8601)' })
  @ApiResponse({ status: 200 })
  getForecastRange(
    @Param('idSensorChannel', ParseUUIDPipe) idSensorChannel: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.forecastsService.getForecastRange(
      idSensorChannel,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get forecast by ID' })
  @ApiResponse({ status: 200, type: ForecastResponseDto })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ForecastResponseDto> {
    return this.forecastsService.findOne(id);
  }
}
