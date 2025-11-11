import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SensorTypesService } from './sensor-types.service';
import { CreateSensorTypeDto } from './dto/create-sensor-type.dto';
import { UpdateSensorTypeDto } from './dto/update-sensor-type.dto';
import { SensorTypeResponseDto } from './dto/sensor-type-response.dto';

@ApiTags('Sensor Types')
@Controller('sensor-types')
export class SensorTypesController {
  constructor(private readonly sensorTypesService: SensorTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sensor type' })
  @ApiResponse({ status: 201, type: SensorTypeResponseDto })
  create(@Body() createDto: CreateSensorTypeDto): Promise<SensorTypeResponseDto> {
    return this.sensorTypesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sensor types' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.sensorTypesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sensor type by ID' })
  @ApiResponse({ status: 200, type: SensorTypeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SensorTypeResponseDto> {
    return this.sensorTypesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sensor type' })
  @ApiResponse({ status: 200, type: SensorTypeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSensorTypeDto,
  ): Promise<SensorTypeResponseDto> {
    return this.sensorTypesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sensor type' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sensorTypesService.remove(id);
  }
}
