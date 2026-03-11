import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { LayersService, LayerQueryOptions } from '../services/layers.service';
import {
  CreateLayerDto,
  UpdateLayerDto,
  UpdateStyleDto,
  ReorderLayersDto,
  LayerResponseDto,
  LayerListResponseDto,
  GeoJSONResponseDto,
} from '../dto';
import { LayerType } from '../../../entities/map-layer.entity';

@ApiTags('WebGIS - Layers')
@ApiBearerAuth()
@Controller('webgis/layers')
export class LayersController {
  constructor(private readonly layersService: LayersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new map layer' })
  @ApiResponse({ status: 201, description: 'Layer created successfully', type: LayerResponseDto })
  async create(
    @Request() req: any,
    @Body() dto: CreateLayerDto,
  ): Promise<LayerResponseDto> {
    // Auto-assign owner if not admin
    if (req.user?.role !== 'admin' && req.user?.idOwner) {
      dto.idOwner = req.user.idOwner;
    }
    return this.layersService.create(dto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all layers for a project' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiQuery({ name: 'layerType', required: false, enum: LayerType })
  @ApiQuery({ name: 'categoryCode', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: LayerListResponseDto })
  async findAll(
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('layerType') layerType?: LayerType,
    @Query('categoryCode') categoryCode?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Auto-filter by owner for non-admin users
    const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner ? req.user.idOwner : ownerId;

    const options: LayerQueryOptions = {
      projectId,
      ownerId: finalOwnerId,
      layerType,
      categoryCode,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    // Auto-seed core layers for this project if none exist
    if (projectId) {
      await this.layersService.seedCoreLayers(projectId, finalOwnerId);
    }

    return this.layersService.findAll(options);
  }

  @Post('seed-core/:projectId')
  @ApiOperation({ summary: 'Seed core layers for a project' })
  @ApiResponse({ status: 201, description: 'Core layers created', type: [LayerResponseDto] })
  async seedCore(
    @Request() req: any,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<LayerResponseDto[]> {
    const ownerId = req.user?.idOwner;
    return this.layersService.seedCoreLayers(projectId, ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get layer by ID' })
  @ApiResponse({ status: 200, type: LayerResponseDto })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LayerResponseDto> {
    return this.layersService.findOne(id);
  }

  @Get(':id/geojson')
  @ApiOperation({ summary: 'Get layer features as GeoJSON' })
  @ApiQuery({ name: 'bbox', required: false, description: 'Bounding box: minX,minY,maxX,maxY' })
  @ApiResponse({ status: 200, type: GeoJSONResponseDto })
  async getGeoJSON(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('bbox') bboxStr?: string,
  ): Promise<GeoJSONResponseDto> {
    let bbox: [number, number, number, number] | undefined;
    if (bboxStr) {
      const parts = bboxStr.split(',').map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        bbox = parts as [number, number, number, number];
      }
    }
    return this.layersService.getGeoJSON(id, bbox);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update layer' })
  @ApiResponse({ status: 200, type: LayerResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLayerDto,
  ): Promise<LayerResponseDto> {
    return this.layersService.update(id, dto);
  }

  @Patch(':id/style')
  @ApiOperation({ summary: 'Update layer style only' })
  @ApiResponse({ status: 200, type: LayerResponseDto })
  async updateStyle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStyleDto,
  ): Promise<LayerResponseDto> {
    return this.layersService.updateStyle(id, dto);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder layers' })
  @ApiResponse({ status: 200, description: 'Layers reordered' })
  async reorder(
    @Body() dto: ReorderLayersDto,
  ): Promise<{ success: boolean }> {
    await this.layersService.reorder(dto.projectId, dto.orders);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete layer' })
  @ApiResponse({ status: 200, description: 'Layer deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    await this.layersService.remove(id);
    return { success: true };
  }
}
