import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UnpairedDevicesService } from './unpaired-devices.service';
import {
  CreateUnpairedDeviceDto,
  UpdateUnpairedDeviceDto,
  UnpairedDeviceResponseDto,
  PairDeviceDto,
  UnpairedDeviceStatsDto,
} from './dto';

@ApiTags('Unpaired Devices')
@Controller('unpaired-devices')
export class UnpairedDevicesController {
  constructor(private readonly unpairedDevicesService: UnpairedDevicesService) {}

  /**
   * Create new unpaired device
   */
  @Post()
  @ApiOperation({
    summary: 'Create new unpaired device',
    description: 'Register a new unpaired device. Hardware ID must be unique.',
  })
  @ApiResponse({
    status: 201,
    description: 'Unpaired device created successfully',
    type: UnpairedDeviceResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Device with this hardware_id already exists' })
  async create(@Body() createDto: CreateUnpairedDeviceDto): Promise<UnpairedDeviceResponseDto> {
    return this.unpairedDevicesService.create(createDto);
  }

  /**
   * Register device activity (upsert)
   */
  @Post('register-activity')
  @ApiOperation({
    summary: 'Register device activity',
    description:
      'Upsert pattern: Updates last_seen and seen_count if device exists, creates new record if not. Used by MQTT listeners.',
  })
  @ApiResponse({
    status: 200,
    description: 'Device activity registered',
    type: UnpairedDeviceResponseDto,
  })
  async registerActivity(
    @Body()
    body: {
      hardwareId: string;
      payload?: any;
      topic?: string;
      nodeModelId?: string;
    },
  ): Promise<UnpairedDeviceResponseDto> {
    return this.unpairedDevicesService.registerActivity(
      body.hardwareId,
      body.payload,
      body.topic,
      body.nodeModelId,
    );
  }

  /**
   * Get all unpaired devices
   */
  @Get()
  @ApiOperation({
    summary: 'Get all unpaired devices',
    description: 'List all unpaired devices with optional filters',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'paired', 'ignored'] })
  @ApiQuery({ name: 'nodeModelId', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'seenAfter', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'seenBefore', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of unpaired devices',
    type: [UnpairedDeviceResponseDto],
  })
  async findAll(
    @Query('status') status?: 'pending' | 'paired' | 'ignored',
    @Query('nodeModelId') nodeModelId?: string,
    @Query('projectId') projectId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('seenAfter') seenAfter?: string,
    @Query('seenBefore') seenBefore?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<UnpairedDeviceResponseDto[]> {
    return this.unpairedDevicesService.findAll({
      status,
      nodeModelId,
      projectId,
      ownerId,
      seenAfter: seenAfter ? new Date(seenAfter) : undefined,
      seenBefore: seenBefore ? new Date(seenBefore) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * Get statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get unpaired devices statistics',
    description: 'Get statistics about unpaired devices (total, by status, recent activity)',
  })
  @ApiResponse({
    status: 200,
    description: 'Unpaired devices statistics',
    type: UnpairedDeviceStatsDto,
  })
  async getStats(): Promise<UnpairedDeviceStatsDto> {
    return this.unpairedDevicesService.getStats();
  }

  /**
   * Get device by hardware_id
   */
  @Get('by-hardware-id/:hardwareId')
  @ApiOperation({
    summary: 'Get device by hardware ID',
    description: 'Find unpaired device by its hardware identifier',
  })
  @ApiParam({ name: 'hardwareId', description: 'Hardware ID (IMEI, dev_eui, MAC, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Unpaired device found',
    type: UnpairedDeviceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findByHardwareId(@Param('hardwareId') hardwareId: string): Promise<UnpairedDeviceResponseDto> {
    return this.unpairedDevicesService.findByHardwareId(hardwareId);
  }

  /**
   * Get one unpaired device by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get unpaired device by ID',
    description: 'Get detailed information about a specific unpaired device',
  })
  @ApiParam({ name: 'id', description: 'Unpaired device UUID' })
  @ApiResponse({
    status: 200,
    description: 'Unpaired device found',
    type: UnpairedDeviceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UnpairedDeviceResponseDto> {
    return this.unpairedDevicesService.findOne(id);
  }

  /**
   * Update unpaired device
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update unpaired device',
    description: 'Update unpaired device information (model, suggestions, status)',
  })
  @ApiParam({ name: 'id', description: 'Unpaired device UUID' })
  @ApiResponse({
    status: 200,
    description: 'Unpaired device updated',
    type: UnpairedDeviceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUnpairedDeviceDto,
  ): Promise<UnpairedDeviceResponseDto> {
    return this.unpairedDevicesService.update(id, updateDto);
  }

  /**
   * Pair device to project
   */
  @Post(':id/pair')
  @ApiOperation({
    summary: 'Pair device to a project',
    description: 'Create a new Node from this unpaired device and assign to a project',
  })
  @ApiParam({ name: 'id', description: 'Unpaired device UUID' })
  @ApiResponse({
    status: 200,
    description: 'Device paired successfully',
    type: UnpairedDeviceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 400, description: 'Cannot pair device (no model assigned or already paired)' })
  async pairDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() pairDto: PairDeviceDto,
  ): Promise<UnpairedDeviceResponseDto> {
    return this.unpairedDevicesService.pairDevice(id, pairDto);
  }

  /**
   * Mark device as ignored
   */
  @Post(':id/ignore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark device as ignored',
    description: 'Set device status to "ignored" to exclude from pending list',
  })
  @ApiParam({ name: 'id', description: 'Unpaired device UUID' })
  @ApiResponse({
    status: 200,
    description: 'Device marked as ignored',
    type: UnpairedDeviceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async ignoreDevice(@Param('id', ParseUUIDPipe) id: string): Promise<UnpairedDeviceResponseDto> {
    return this.unpairedDevicesService.ignoreDevice(id);
  }

  /**
   * Delete unpaired device
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete unpaired device',
    description: 'Permanently delete an unpaired device record',
  })
  @ApiParam({ name: 'id', description: 'Unpaired device UUID' })
  @ApiResponse({ status: 204, description: 'Device deleted successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.unpairedDevicesService.remove(id);
  }
}
