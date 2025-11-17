import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AlertEventsService } from './alert-events.service';
import { CreateAlertEventDto } from './dto/create-alert-event.dto';
import { UpdateAlertEventDto, AcknowledgeAlertEventDto, ClearAlertEventDto } from './dto/update-alert-event.dto';
import { AlertEventResponseDto } from './dto/alert-event-response.dto';

@ApiTags('Alert Events')
@Controller('alert-events')
export class AlertEventsController {
  constructor(private readonly alertEventsService: AlertEventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new alert event' })
  @ApiResponse({ status: 201, type: AlertEventResponseDto })
  create(@Body() createDto: CreateAlertEventDto): Promise<AlertEventResponseDto> {
    return this.alertEventsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all alert events' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'idAlertRule', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idAlertRule') idAlertRule?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.alertEventsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      idAlertRule,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert event by ID' })
  @ApiResponse({ status: 200, type: AlertEventResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AlertEventResponseDto> {
    return this.alertEventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update alert event' })
  @ApiResponse({ status: 200, type: AlertEventResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAlertEventDto,
  ): Promise<AlertEventResponseDto> {
    return this.alertEventsService.update(id, updateDto);
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert event' })
  @ApiResponse({ status: 200, type: AlertEventResponseDto })
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeAlertEventDto,
  ): Promise<AlertEventResponseDto> {
    return this.alertEventsService.acknowledge(id, dto);
  }

  @Patch(':id/clear')
  @ApiOperation({ summary: 'Clear alert event' })
  @ApiResponse({ status: 200, type: AlertEventResponseDto })
  clear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClearAlertEventDto,
  ): Promise<AlertEventResponseDto> {
    return this.alertEventsService.clear(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete alert event' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.alertEventsService.remove(id);
  }
}
