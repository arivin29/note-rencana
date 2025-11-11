import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SensorCatalogsService } from './sensor-catalogs.service';
import { CreateSensorCatalogDto } from './dto/create-sensor-catalog.dto';
import { UpdateSensorCatalogDto } from './dto/update-sensor-catalog.dto';
import { SensorCatalogResponseDto } from './dto/sensor-catalog-response.dto';

@ApiTags('Sensor Catalogs')
@Controller('sensor-catalogs')
export class SensorCatalogsController {
  constructor(private readonly sensorCatalogsService: SensorCatalogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sensor catalog entry' })
  @ApiResponse({ status: 201, type: SensorCatalogResponseDto })
  create(@Body() createDto: CreateSensorCatalogDto): Promise<SensorCatalogResponseDto> {
    return this.sensorCatalogsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sensor catalogs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'vendor', required: false, type: String })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('vendor') vendor?: string,
  ) {
    return this.sensorCatalogsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      vendor,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sensor catalog by ID' })
  @ApiResponse({ status: 200, type: SensorCatalogResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SensorCatalogResponseDto> {
    return this.sensorCatalogsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sensor catalog' })
  @ApiResponse({ status: 200, type: SensorCatalogResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSensorCatalogDto,
  ): Promise<SensorCatalogResponseDto> {
    return this.sensorCatalogsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sensor catalog' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sensorCatalogsService.remove(id);
  }
}
